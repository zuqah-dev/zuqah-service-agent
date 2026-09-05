# CLAUDE.md

Guidance for Claude Code working in this repository.

**Read [`docs/HANDOFF.md`](docs/HANDOFF.md) before doing anything.** It carries
context that is not inferable from the code — including why this project exists,
who has and has not sanctioned it, and what is currently paused.

---

## What this is

A demonstration of a five-stage **Customer Service** capability — self-help,
support assignment, issue diagnosis, problem resolution, continuous improvement —
built on Azure with entirely fabricated **Zuqah Technologies** data.

Phases 1–4 are complete. Phase 5 is not started and is blocked on decisions
nobody has made yet.

## Before you change anything

| Check | Why |
| --- | --- |
| Read `docs/HANDOFF.md` | The project has an unresolved political situation |
| Read `PROGRESS.md` | Current state, and a log of every trap already found |
| Read `docs/decisions/` | Nine ADRs; several record choices that look wrong without their reasoning |

## Commands

```bash
bun run typecheck            # run after ANY change — non-negotiable
bun run build
bun run dev                  # local, needs .env

./scripts/deploy.sh          # typecheck → build in ACR → force pull → verify → restore state
./scripts/demo-up.sh         # public URL live  (~20s)
./scripts/demo-down.sh       # public URL dead  (403)

bun run scripts/ingest.ts --recreate    # rebuild the search index
bun run scripts/eval-retrieval.ts       # measure retrieval — must PASS
bun run scripts/eval-agent.ts           # measure behaviour — must PASS
python scripts/build_documents.py       # markdown → PDF/DOCX
python scripts/build_screenshots.py     # demo error dialogs
```

## Hard rules

1. **The App Service stays stopped.** It is brought up only for a demonstration
   and taken straight back down. Never leave it running.
2. **Never commit a secret.** Everything lives in Key Vault
   (`kv-zuqah-cs-dev`). `.env` is gitignored and is generated from Key Vault.
3. **No tool may take an identity parameter.** The caller is resolved
   server-side from the session, always. See ADR-0006 — this is the single most
   important property of the system and a demo asset in its own right.
4. **Do not weaken a test to make it pass.** Both evaluation suites encode real
   guarantees. If one fails, either the code is wrong or the test is wrong —
   determine which. The test was wrong five times out of six; verify before
   changing behaviour.
5. **All content is fabricated.** No proprietary data
   enters this repository under any circumstances.
6. **Infrastructure follows** [`docs/standards/azure-iac-standards.md`](docs/standards/azure-iac-standards.md).

## Azure

- Subscription: **Modern App - Playground** (`87144220-b4a2-4d90-9953-074d4f662a56`)
- Resource group: **`rg-zuqah-cs-dev`** · region `eastus2` (Search is in `eastus`)
- Access level: **Contributor** — cannot create role assignments or app registrations
- Cost: ~$130/month while the resource group exists

## Verification standard

Claims in this project are measured, not asserted. Before reporting something
works:

- `bun run typecheck` clean
- The relevant evaluation suite passing
- For anything deployed, a check against the **live** environment — and confirm
  you are testing the build you just shipped, not the previous one

## Traps that have already cost hours

Full detail in `PROGRESS.md` and the standards document. The short list:

- `az webapp restart` does **not** re-pull an image — reports healthy, serves stale code
- `.dockerignore` negations do nothing inside an excluded directory
- `az acr build` appears to fail on Windows and does not — use `--no-logs`
- `curl` sends no `Origin` header, so it cannot reproduce browser-only failures
- A health check answers from the *old* container during a swap
- Foundry Agents reject API keys; they are Entra-only
