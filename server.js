/**
 * Production server.
 *
 * WHY THIS EXISTS INSTEAD OF `react-router-serve`
 *
 * React Router 7 validates the `Origin` header against the request's own URL on
 * data requests, as a cross-site request defence. Azure App Service terminates
 * TLS at its front end and forwards to the container over plain HTTP, so the
 * app computed its own URL as `http://host/...` while the browser sent
 * `Origin: https://host`. They did not match, and EVERY form submission was
 * rejected with a 400 that React Router then sanitised into the opaque
 * "Unexpected Server Error".
 *
 * That failure was invisible from the outside: the health check passed, pages
 * rendered, `curl` succeeded — because curl sends no `Origin` header. Only a
 * real browser triggered it.
 *
 *   Origin: https://host  ->  400
 *   Origin: http://host   ->  202
 *
 * `trust proxy` is the fix. With it, Express derives the protocol from
 * `X-Forwarded-Proto`, the computed URL becomes `https://host/...`, and the
 * origin check passes.
 *
 * This is not specific to Azure — any TLS-terminating proxy (Application
 * Gateway, Front Door, nginx, a load balancer) produces the same failure.
 */

import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express from "express";

const PORT = Number(process.env.PORT ?? 3000);

const app = express();

// The whole reason this file exists. Without it the origin check fails behind
// any TLS-terminating proxy. See the note above before removing it.
app.set("trust proxy", true);

app.disable("x-powered-by");
app.use(compression());

// Fingerprinted assets are immutable, so they can be cached indefinitely.
app.use(
  "/assets",
  express.static("build/client/assets", { immutable: true, maxAge: "1y" })
);

// Everything else in the client build — favicon, and anything added later.
app.use(express.static("build/client", { maxAge: "1h" }));

const build = await import("./build/server/index.js");

app.all(
  "*",
  createRequestHandler({
    build,
    mode: process.env.NODE_ENV ?? "production",
  })
);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] trust proxy enabled — protocol taken from X-Forwarded-Proto`);
});
