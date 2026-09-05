# Progress

Single source of truth for where this project stands.
Updated at the end of every working session.

**Last updated:** 2026-08-31

---

## Status

| Phase | State | Notes |
| --- | --- | --- |
| 0 — Planning | ✅ Approved | Docs signed off |
| 1 — Foundation | 🟢 **Complete except sign-in** | Environment deployed, image built and running, app live and serving. Only the sign-in check remains, and it needs the Entra app registration. |
| 2 — Knowledge Base | 🟢 **Complete** | 15 documents, 158 chunks indexed. **hit@3 18/18, gaps 2/2, PASS.** Relevance floor re-verified at full corpus size. |
| 3 — The Agent | 🟡 **Behaviour complete** | Prompt, search tool and behavioural suite done — **17/17, three consecutive clean runs.** Only the Foundry registration remains, and that is blocked on Bobby's role assignment. |
| 4 — Application | 🟢 **Complete** | Streaming chat, tool activity, clickable citations, PDF serving, and screenshot diagnosis — all verified live on Azure. Demo auth means nothing is needed from anyone else. |
| 5 — Actions & Telemetry | ⬜ Not started | |

---

## Running the demo

The App Service is **stopped by default**, so the public URL is dead between
demonstrations.

```bash
./scripts/demo-up.sh      # start, wait for health, print the URL
./scripts/demo-down.sh    # stop; the URL returns 403
```

Access code lives in Key Vault:

```bash
az keyvault secret show --vault-name kv-zuqah-cs-dev -n DemoAccessCode --query value -o tsv
```

Sign-in runs in **demo mode** — Microsoft sign-in is bypassed and a shared code is
used instead, so nothing is needed from anyone else to show it. An amber banner on
every page and a notice on the login form make that unmistakable. Set
`AUTH_MODE=entra` to restore real sign-in; that path is untouched.

## Waiting on you

| # | Item | Why it matters | Urgency |
| --- | --- | --- | --- |
| 1 | Request a new **Entra app registration** | Blocks Phase 1 from closing — sign-in cannot be verified without it | Today |
| 2 | Get **one role assignment** made by an Owner / User Access Administrator | Blocks **Phase 3**. Foundry Agents refuse key auth; without this we lose the "show the agent in the Foundry portal" moment. Exact commands in [ADR-0007](docs/decisions/0007-no-role-assignments.md) | Today — same person can likely do both |
| 3 | Confirm a **demo date** | Determines whether we build all five stages or three | Soon |
| 4 | Create an **Azure DevOps demo project** | Needed by Phase 5, not before | Later |
| 5 | Confirm a **Teams channel** for notifications | Needed by Phase 5, not before | Later |

✅ Cost approved ($130/month). ✅ Postgres credentials generated — the password was
never written into the repository; the connection string lives in Key Vault as
`DatabaseUrl`.

For item 2, what to ask for:

- A new app registration, name `nri-service-agent-demo`
- Redirect URI supplied after Phase 1 deploys — the Bicep outputs it
- A client secret
- A security group `Zuqah-CS-Demo-Users`, with you as owner
- Enterprise Application set to **assignment required**

---

## Decisions taken

Seven, recorded in [docs/decisions](docs/decisions/). The three most consequential:

- **ADR-0001** — separate repository and resource group, so the demo is disposable
  and cannot endanger the running platform
- **ADR-0002** — knowledge runs as a real Foundry Agent, so it can be shown inside
  the Azure portal rather than merely described
- **ADR-0003** — Azure AI Search rather than pgvector, because it is less work and
  a stronger story at the same time

---

## Open questions

| Question | Owner | Needed by |
| --- | --- | --- |
| Demo date | Anurag | Before Phase 1 |
| Is a recorded fallback run required? | Anurag | Phase 5 |
| Who presents — you, or the architect? | Anurag | Phase 5 |

---

## Log

**2026-09-01 — Demo shown and taken offline.** Phases 1-4 demonstrated end to end
in a browser. App Service stopped; the public URL returns 403.

Getting there cost four attempts at one bug, recorded as
[ADR-0009](docs/decisions/0009-custom-server-trust-proxy.md). React Router 7
checks the `Origin` header against the request's computed URL; App Service
terminates TLS and forwards over plain HTTP, so the app computed `http://host`
against a browser sending `Origin: https://host` and rejected **every form
submission** with a 400 that was then sanitised into "Unexpected Server Error".

`curl` sends no `Origin` header, so every server-side test passed while a real
browser failed every time. Two fixes were deployed and announced before the cause
was found; the thing that actually identified it was the browser console showing
`POST /login.data 400`. That should have been the first thing requested rather
than the fourth.

Fixed with a custom Express server setting `trust proxy`. Not Azure-specific —
any TLS-terminating proxy does the same.

**2026-09-01 — Phase 4 complete.** The first two stages of the demo now work in a
browser: streaming answers, visible tool activity, citations that open the real
PDF, and screenshot diagnosis. Verified on Azure, then taken offline again.

Screenshot handling proved both behaviours that matter. Given a legible VPN error
dialog and no accompanying text, the agent quoted *"Error 809: The network
connection between your computer and the VPN server could not be established…"*
verbatim, explained it, and gave numbered steps before mentioning a ticket. Given
a deliberately blurred and cropped dialog it ran zero searches and said it could
not read the error, asking for a clearer image rather than inventing a code.

Two deployment traps found and scripted away:

- **`az webapp restart` does not re-pull the image.** It restarts the container
  already present, so a freshly pushed tag is ignored. This produced a deployment
  that reported healthy, streamed correct answers, and served stale code —
  the worst kind of failure because nothing looks wrong.
- **`.dockerignore` negations do not work inside an excluded directory.** Docker
  never descends into `data`, so `!data/generated/pdf` had no effect and the
  image shipped with no PDFs. Every citation 404'd in Azure while working
  perfectly locally. Now fixed, and the image build **asserts** at least 15 PDFs
  are present, so it fails at build time rather than in front of an audience.

Both are handled by `scripts/deploy.sh`, which typechecks, builds, waits on the
ACR run, forces a pull, and waits for health.

**2026-08-31 — Phase 1, application live.**
`https://app-zuqah-cs-dev.azurewebsites.net/healthcheck` → **HTTP 200**.

Image built by ACR Tasks (no Docker on this machine, and remote build is the
Azure-native answer regardless) and pulled by App Service; healthy 45 seconds
after restart. `/` and `/chat` return 500, correctly, because `AUTH_CLIENT_ID` is
still empty — the health check names exactly that one setting and nothing else,
which is the behaviour it was built for.

Two more things worth knowing:

- **`az acr build` appears to fail on Windows and does not.** The CLI streams the
  remote log, Vite prints a U+2713, and cp1252 cannot encode it — so the command
  dies with a `UnicodeEncodeError` while the build continues server-side and
  succeeds. Set `PYTHONIOENCODING=utf-8`. Noted in the Dockerfile.
- **An empty Key Vault secret passes validation.** Only `AUTH_CLIENT_ID` is
  reported missing, so the unresolved `AUTH_CLIENT_SECRET` reference is arriving
  as a non-empty string. Harmless today, misleading later — logged against
  Phase 4.

**2026-08-31 — Phase 1, deployed.** `az deployment sub create` → **Succeeded**,
11 resources in `rg-zuqah-cs-dev`. Verified after the fact rather than assumed:
all four template-filled Key Vault secrets hold real values, Azure AI Search
answers on its endpoint (HTTP 200), both model deployments are live at capacity
100, and the App Service is Running with a managed identity and a Key Vault
policy.

Three problems found, all by testing rather than by reading:

1. **AI Search had no capacity in `eastus2`** — `InsufficientResourcesAvailable`,
   while every other resource provisioned there fine. Added a `searchLocation`
   parameter and moved Search to `eastus`. Rejected the alternative of upgrading
   to the `standard` SKU, which would have tripled Search cost and broken the
   agreed budget.
2. **The vault was unreadable by its own creator.** The template granted a policy
   to the App Service and to nobody else, so `az keyvault secret list` returned
   Forbidden for the account that had just created it. Fixed live, then fixed
   properly in the template with a `deployerObjectId` parameter.
3. **Foundry Agents refuse key-based authentication.** Contributor lacks the
   data action, and the API does not accept an account key at all. This needs one
   role assignment from an Owner — see item 2 in *Waiting on you*. Chat,
   embeddings, account-level Assistants and Search all work with keys; only the
   project-scoped agents surface does not.

Also written: the application skeleton — Entra OAuth2 with silent token refresh,
session cookie, app shell with a single auth guard, home page, chat scaffold,
shallow health check, Dockerfile, environment validation. Builds clean and
typechecks clean.

**A fourth problem, found by running it rather than reading it.** The session
module called `getEnv()` at import time, so a single missing variable killed the
server before it could listen — taking `/healthcheck` down with it, the one route
whose entire purpose is to keep answering when configuration is broken. On App
Service that turns one unresolved Key Vault reference into a silent container
restart loop.

Fixed by building the session storage lazily. Verified by starting the server with
no configuration at all: it now listens, and `/healthcheck` returns 200 naming
every missing variable.

```
{"status":"ok","dependencies":{"configuration":"invalid",…},
 "configError":"AUTH_CLIENT_ID: Required, …"}
```

This is the class of bug that only appears in the deployed environment, at the
worst moment, with no useful output. Worth the hour.

**2026-08-31 — Phase 1, infrastructure written.** Verified model availability in
`eastus2` before writing anything (`gpt-5.1` 2025-11-13 and
`text-embedding-3-large` v1, both on GlobalStandard) and confirmed `zuqah-acr`
admin credentials are readable. Wrote `infra/` — `main.bicep` plus nine modules,
parameter file, and README. Compiles with no warnings; `az deployment sub what-if`
returns **Succeeded, 26 resources, all Create, no errors**.

One architectural change made during the work and recorded as
[ADR-0008](docs/decisions/0008-single-foundry-account.md): a single AI Foundry
account (`kind: AIServices`) replaces the separately planned Azure OpenAI,
Foundry, Content Safety and Document Intelligence resources. Fewer moving parts,
current Azure guidance, no cost difference. Architecture and Phase 1 docs updated
to match.

Not yet deployed — deployment bills, so it waits for a go-ahead.

**2026-08-31** — Verified Azure access directly: Contributor at subscription scope,
Azure AI Developer on `proj-ai-foundry`. Confirmed Foundry Agent creation works by
creating and deleting a probe agent. Confirmed Azure AI Search with the semantic
ranker is already available. Wrote the charter, architecture, UX, data spec, demo
script, five phase plans, and seven decision records. Nothing built yet — awaiting
review.
