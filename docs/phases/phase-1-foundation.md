# Phase 1 — Foundation

**Goal:** an empty but real application, signed in with a Microsoft account,
running on Azure infrastructure that deploys from one command.

Nothing intelligent happens yet. This phase exists so that every later phase has
somewhere to land.

## Why this first

Every subsequent phase needs somewhere to deploy, a way to authenticate, and
somewhere to put secrets. Building the agent first and the platform later is the
common mistake — it produces a demo that works on a laptop and nowhere else.

## Scope

**Infrastructure — `infra/main.bicep`, subscription scope, own resource group**

- Resource group `rg-zuqah-cs-dev`
- Log Analytics + Application Insights
- Key Vault (access policies, not RBAC — Contributor cannot write role assignments)
- **AI Foundry account** (`kind: AIServices`, project management enabled) + project,
  with `gpt-5.1` and `text-embedding-3-large`. One account also provides Content
  Safety and Document Intelligence — see [ADR-0008](../decisions/0008-single-foundry-account.md),
  which replaced the separate Azure OpenAI account originally planned here.
- Azure AI Search, semantic ranker enabled
- Postgres flexible server with `vector` and `pg_trgm`
- Blob Storage — `documents` and `screenshots` containers
- App Service Plan + App Service (Linux container, port 3000)
- Container registry `zuqah-acr` referenced, not created

**Application skeleton**

- Bun + React Router 7 SSR + Vite, containerised
- Entra ID sign-in, session cookie, sign-out
- `/healthcheck` returning 200
- Empty chat screen — accepts input, echoes, no agent
- Dockerfile and image push to `zuqah-acr`

**Access**

- New Entra app registration
- Redirect URI registered from the Bicep output
- Enterprise Application: assignment required, `Zuqah-CS-Demo-Users` group assigned

## Out of scope for this phase

No agent, no search, no documents, no tickets. An empty chat box is the correct
output of Phase 1.

## Exit criteria — what you review

| # | Criterion | Status |
| --- | --- | --- |
| 1 | `az deployment sub create` builds the whole environment from nothing | ✅ Succeeded — 11 resources |
| 2 | `/healthcheck` returns 200 | ✅ Live at `app-zuqah-cs-dev.azurewebsites.net` |
| 3 | Sign-in works; an unassigned user is refused by Entra | ⛔ Blocked — needs the app registration |
| 4 | `az group delete` removes everything; a redeploy reproduces it | ⬜ Not exercised — will verify before Phase 2 closes |
| 5 | Application Insights shows request telemetry | ⬜ Pending — instrumentation lands with the app in Phase 4 |
| 6 | `infra/README.md` documents what exists and how to deploy it | ✅ Written, including the region and permissions gotchas |

### What is deployed and verified

- All four template-filled Key Vault secrets hold real values
- Azure AI Search answers on its endpoint (HTTP 200)
- Both model deployments live at capacity 100
- The container image builds in ACR and the App Service runs it
- `/healthcheck` returns 200 and names the one missing setting;
  `/` and `/chat` return 500 until it is supplied, which is correct

## Known issue, deferred to Phase 4

An **empty Key Vault secret passes validation.** `AUTH_CLIENT_SECRET` is created
empty and referenced with `@Microsoft.KeyVault(...)`; the health check reports only
`AUTH_CLIENT_ID` as missing, so the unresolved reference is reaching the
application as a non-empty string rather than as an empty value.

Harmless now — nothing reads it yet — but it means a broken Key Vault reference
would pass a `min(1)` check and fail later with a confusing error. Worth a shaped
check on the secret values once the real ones are in place.

## Risks

| Risk | Handling |
| --- | --- |
| Entra app registration needs another person | Requested before Phase 1 starts |
| Model/version unavailable in the region | Verified with `az cognitiveservices model list` before writing the template |
| Key Vault or OpenAI name held by soft-delete | Purge commands documented in the infra README |

## Estimate

2–3 days, of which Postgres provisioning is 10 minutes per deploy attempt.
