# Handoff

For whoever picks this up next — human or another Claude session.

Everything here is context that cannot be read off the code. If you only read one
section, read [the situation](#1-the-situation-read-this-first).

**Last updated:** 2026-09-01

---

## 1. The situation — read this first

This project was **self-initiated**. Nobody asked for it. It is not part of the
Sales Demo initiative and has no sponsor.

On 2026-08-31 the developer (Anurag) asked a colleague (Bobby) for an Entra app
registration and two role assignments. Bobby's reply, verbatim:

> *"So it's become a full app now? Did Greg request this? I've been out of the
> loop on the Sales Demo initiative"*
> *"Let's hold off on that until we can meet first, I'll set one up for tomorrow"*

Anurag agreed — *"ok"* — and then decided to continue building anyway, in order
to demonstrate a working app at that meeting. That was raised as a concern once,
the decision was reaffirmed, and the work continued. **You should know this
happened.**

### What follows from it

- **Do not contact Bobby or anyone else** on this project's behalf without being
  asked to. The next move belongs to a meeting, not to us.
- **Do not request the Entra app registration or role assignments.** A demo-auth
  workaround exists precisely so nothing is needed from anyone.
- **Do not create Azure resources beyond what exists.** The current footprint is
  what was disclosed and agreed at ~$130/month.
- The strongest asset here is that it is **disposable** — one command deletes
  everything. Preserve that property. It is what makes "should we continue?" an
  easy question rather than a loaded one.

[`docs/MEETING-SUMMARY.md`](MEETING-SUMMARY.md) is a one-pager prepared for that
meeting. It states plainly that nobody asked for this and names two things the
developer got wrong. Do not soften it.

---

## 2. What this is

A working demonstration of the five-stage Customer Service capability from NRI's
"Frontier Firm" material:

| Stage | Status |
| --- | --- |
| Self-help | ✅ Working — cited answers from 15 policy documents |
| Issue diagnosis | ✅ Working — reads screenshots, refuses illegible ones |
| Problem resolution | ⬜ Phase 5 — Azure DevOps tickets |
| Support assignment | ⬜ Phase 5 — skills and availability from Postgres |
| Continuous improvement | ⬜ Phase 5 — App Insights dashboard |

All content is fabricated **Zuqah Technologies** data. No proprietary data is used anywhere,
and that must remain true.

---

## 3. Where it stands

**Phases 1–4 complete and verified live on Azure.** Phase 5 not started.

Measured, not claimed:

```
Retrieval   18/18 answerable questions find the right document (hit@3)
            2/2 deliberate gaps correctly return nothing
Agent       17/17 behavioural checks, three consecutive clean runs
Injection   blocked by Azure Content Safety before reaching the model
```

Re-run both any time: `bun run scripts/eval-retrieval.ts` and
`bun run scripts/eval-agent.ts`. They should pass. If they do not, read section 7
before assuming the code is wrong.

### The two deliberate gaps

The corpus contains **nothing** about VPN split tunnelling or parental leave.
Verified mechanically across all fifteen documents. This is why the agent's *"I
don't have that documented"* is honest rather than staged — and it is the single
best thing to demonstrate. **Do not add content covering either subject.**

---

## 4. The environment

| | |
| --- | --- |
| Subscription | Modern App - Playground (`87144220-b4a2-4d90-9953-074d4f662a56`) |
| Resource group | `rg-zuqah-cs-dev`, `eastus2` |
| Access | **Contributor** — no role assignments, no app registrations |
| Cost | ~$130/month while the resource group exists |

Eleven resources. The ones that matter:

- `aif-zuqah-cs-dev` — AI Foundry (`AIServices`). One account provides the
  chat model, embeddings, Content Safety and Document Intelligence
- `srch-zuqah-cs-dev` — AI Search, **in `eastus`** because `eastus2` had no
  capacity. This is deliberate; see ADR and the standards doc
- `kv-zuqah-cs-dev` — every secret, including the demo access code
- `app-zuqah-cs-dev` — **stopped by default**

### Credentials

Nothing is in the repository. To work locally, regenerate `.env` from Key Vault —
the values are `FoundryApiKey`, `SearchApiKey`, `StorageConnection`,
`DatabaseUrl`, `SessionSecret`, `DemoAccessCode`.

```bash
az keyvault secret show --vault-name kv-zuqah-cs-dev -n DemoAccessCode --query value -o tsv
```

### Authentication

Runs in **demo mode**: Microsoft sign-in is bypassed and a shared access code is
used instead, so nothing is needed from Bobby. An amber banner on every page and
a notice on the login form make this unmistakable — leave both in place.

Real Entra sign-in is fully implemented and untouched behind `AUTH_MODE=entra`.

---

## 5. Architecture in one paragraph

A React Router 7 app on App Service authenticates the user, then streams a chat
turn over SSE. The agent runs on Azure OpenAI with one tool, `search_policies`,
which does hybrid search over Azure AI Search — BM25 plus vector, re-ranked
semantically. Policy documents are generated as PDFs, parsed by Document
Intelligence into markdown with headings intact, chunked on section boundaries so
each chunk knows its own section number, embedded, and indexed. Citations are
therefore a field lookup rather than a regex over prose, and they resolve to the
real PDF.

Full detail: [`01-architecture.md`](01-architecture.md). Reasoning behind every
significant choice: [`decisions/`](decisions/).

### The design property that matters most

**No tool takes an identity parameter.** *"Show me Sarah's tickets"* is not
refused by good behaviour — it is **inexpressible**, because there is no field to
put "Sarah" in. The caller is resolved server-side from the session on every
call. See [ADR-0006](decisions/0006-identity-never-in-tool-schema.md).

This survives demo mode. Do not compromise it for convenience.

---

## 6. How to work here

```bash
bun run typecheck            # after ANY change, without exception
./scripts/deploy.sh          # the only correct way to ship
./scripts/demo-up.sh         # bring the URL up for a demo
./scripts/demo-down.sh       # take it back down, always
```

`deploy.sh` exists because three separate steps are needed and each has a trap.
Do not deploy by hand.

### Rebuilding from nothing

Everything reproduces:

```bash
python scripts/build_documents.py      # 15 markdown sources → PDF + DOCX
python scripts/build_screenshots.py    # 4 error dialogs
bun run scripts/ingest.ts --recreate   # PDFs → Doc Intelligence → chunks → embeddings → index
bun run scripts/eval-retrieval.ts      # confirm it still works
```

Markdown under `data/policies/` is the source of truth. Never hand-edit a
generated PDF.

---

## 7. Traps — each of these cost real time

### The evaluation suite was wrong five times out of six

When `eval-agent.ts` fails, the test has usually been wrong, not the agent. Read
the actual answer before touching a prompt. Real examples:

- The model writes **curly apostrophes** — `can’t`, U+2019 — so ASCII `can't`
  never matched, and every refusal appeared to fail
- The marker list assumed one phrasing; the model says *can't find*, *doesn't
  have*, *not allowed to*, *outside what I'm allowed to do* — all correct
- A citation regex enumerated title suffixes and missed "…Administrator **Rights**"
- *"What model are you running on?"* correctly **redirects** rather than refusing

Boundary checks now assert **whether the harm occurred** — no salary figure, no
ticket IDs, no poem-shaped output — rather than whether particular words appeared.
Keep it that way.

### `curl` cannot reproduce browser failures

The worst bug in this project — every form submission returning 400 behind App
Service — was invisible to `curl`, because **curl sends no `Origin` header**.
Health checks passed, pages rendered, the API streamed, and the browser failed
one hundred per cent of the time.

If a user reports a failure you cannot reproduce, **ask for the browser console
output first**. It was the fourth thing asked for; it should have been the first.

### `az webapp restart` does not re-pull the image

It restarts the container already present. A freshly pushed tag is ignored, and
the site reports healthy while serving stale code. `deploy.sh` handles this.

### A health check answers from the old container during a swap

Verification run immediately after a deploy can hit the previous build. This
produced two wrong conclusions in one session. Wait, or check a build stamp.

### `.dockerignore` negations do nothing inside an excluded directory

Docker never descends into an excluded directory. The image shipped without the
policy PDFs and every citation 404'd in Azure while working locally. The image
build now **asserts** at least 15 PDFs are present.

### `az acr build` appears to fail on Windows

The CLI dies with a `UnicodeEncodeError` printing Vite's `✓` while the build
continues server-side and succeeds. Use `--no-logs`.

### Foundry Agents reject API keys

They are Entra-only and need an `Azure AI Developer` role assignment, which
Contributor cannot make. This is why the knowledge agent currently runs through
chat completions rather than as a registered Foundry Agent — the behaviour is
identical, only the portal demo moment is missing. See
[ADR-0002](decisions/0002-foundry-agent-for-knowledge.md) and
[ADR-0007](decisions/0007-no-role-assignments.md).

---

## 8. How the developer works

Anurag is the manager on this and wants to be **involved**, not merely updated.
What worked:

- **Report per phase**, with evidence. Numbers from a real run, not adjectives.
- **Say what failed.** Six problems were found in Phase 1 alone; naming them
  built more confidence than hiding them would have.
- **Recommend, then defer.** Where a call is his, give a recommendation with the
  reasoning and let him decide. He overrode a recommendation once and that was
  fine.
- **Do not relitigate.** A concern raised once and overruled is settled.
- **Keep the documentation current as you go.** `PROGRESS.md` and the phase docs
  were updated in the same session as the work, not retrospectively.

He values a correction stated plainly and moved past. Two claims of "fixed" in
this session turned out to be wrong; saying so directly cost nothing.

---

## 9. What is next

**Phase 5** — problem resolution, support assignment, continuous improvement.
It is planned in [`phases/phase-5-actions-and-telemetry.md`](phases/phase-5-actions-and-telemetry.md)
and blocked on decisions from the meeting:

| Needs | Blocked on |
| --- | --- |
| Azure DevOps demo project | Someone to create it |
| Teams channel for notifications | Someone to nominate one |
| Foundry Agent registration | One role assignment from an Owner |
| Whether to build all five stages | A sponsor and a demo date |

**Do not start Phase 5 without being asked.** Its dependencies are exactly the
things the meeting exists to resolve.

### If the answer is "stop"

```bash
az group delete --name rg-zuqah-cs-dev --yes
az keyvault purge --name kv-zuqah-cs-dev --location eastus2
az cognitiveservices account purge --name aif-zuqah-cs-dev \
  --resource-group rg-zuqah-cs-dev --location eastus2
```

Nothing is lost. The documents, code, infrastructure and evaluations all rebuild
from the repository in about fifteen minutes.

---

## 10. What I would do differently

Written down because the next person inherits the habit, not just the code.

1. **Ask for the browser console on the first report of a UI failure.** Three
   rounds of investigation were spent re-confirming that `curl` succeeded.
2. **Verify a deployment against the build you shipped**, not against any healthy
   response. A build stamp in the health payload would have prevented two wrong
   conclusions.
3. **Test the failure path as hard as the happy path.** Every trap in section 7
   was a case where the tooling reported success for something that had not
   happened.
4. **Establish sponsorship before building infrastructure.** The technical work
   held up; the sequencing did not. Requesting an app registration and role
   assignments for a project nobody had approved is what triggered the pause, and
   it was avoidable.
