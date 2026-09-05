# ADR-0009 — A custom server, so the proxy is trusted

**Status:** Accepted · **Date:** 2026-09-01

## Context

React Router 7 validates the `Origin` header against the request's own computed
URL on data requests, as a cross-site request defence.

Azure App Service terminates TLS at its front end and forwards to the container
over **plain HTTP**. The application therefore computed its own URL as
`http://host/...` while the browser sent `Origin: https://host`. They did not
match, and every form submission was rejected:

```
Origin: https://app-zuqah-cs-dev.azurewebsites.net   ->  400
Origin: http://app-zuqah-cs-dev.azurewebsites.net    ->  202
```

React Router then sanitised the 400 into `"Unexpected Server Error"`, so neither
the browser nor the server logs named the cause.

`@react-router/serve` does not expose Express's `trust proxy` setting, so the
protocol could not be corrected through configuration.

## Decision

Replace `react-router-serve` with a ~40-line Express server (`server.js`) whose
only material difference is:

```js
app.set("trust proxy", true);
```

With it, Express derives the protocol from `X-Forwarded-Proto`, the computed URL
becomes `https://host/...`, and the origin check passes.

## Why this took four attempts to find

Worth recording, because the same trap will catch the next person.

**`curl` sends no `Origin` header.** Every server-side test passed — every body
encoding, every route, every revalidation path, the health check, the streaming
API — while a real browser failed one hundred per cent of the time. Two "fixes"
were deployed and announced before the actual cause was found.

What broke the deadlock was the **browser console**, which showed
`POST /login.data 400`. That was the first hard evidence, and it should have been
the first thing asked for rather than the fourth.

Two lessons, both now acted on:

1. A reproduction that does not include `Origin`, `Referer` and `Sec-Fetch-*`
   headers is not a browser reproduction. Testing the happy path repeatedly is
   not testing.
2. When a framework sanitises an error, the sanitised string is a signal in
   itself — `"Unexpected Server Error"` means *the server threw and is refusing
   to say why*, which is a different investigation from a normal failure.

## Consequences

- One more file to maintain, and `react-router-serve` is no longer used. The
  server also now handles static assets, with immutable caching on fingerprinted
  ones.
- The runtime image needed two corrections found by this change: `server.js` was
  not being copied in, and the slim Bun image has no `node` binary, so the start
  script runs `bun server.js`.
- **This is not Azure-specific.** Any TLS-terminating proxy — Front Door,
  Application Gateway, nginx, a load balancer — produces the identical failure.
  The reasoning is written at the top of `server.js` so the line is not removed
  by someone tidying up.
