# Zuqah Technologies Service Agent

An AI-powered workplace assistant that answers IT and HR questions from company
policy documents. Built as a portfolio demonstration of a five-stage customer
service capability on Azure — with a focus on measurable, automated evaluation
at every layer.

**Live demo**: available on request (the App Service is kept stopped to control
cost; it starts in ~20 seconds).

---

## What it does

Employees ask questions in plain language — "How many PTO days do I get?", "My
VPN keeps dropping" — and the agent retrieves the relevant policy passages,
cites them, and answers directly. It also accepts screenshots for IT
troubleshooting.

The agent is honest about what it cannot answer. When the knowledge base has
nothing relevant, it says so rather than hallucinating a plausible-sounding
response. That behaviour is tested.

---

## Architecture

```
Browser (React Router 7)
    │ SSE stream
    ▼
Express server (Bun)
    │ tool call
    ▼
Azure AI Search  ◄──── Azure AI Foundry (embeddings + reranker + GPT)
    │
    └── 40 policy documents, 158 chunks
        BM25 + vector + semantic reranker (hybrid search)
```

**Key design choice — no identity parameter on any tool.** The caller is
resolved server-side from the session. The agent cannot be told to search "as
someone else". See [ADR-0006](docs/decisions/ADR-0006-no-identity-parameter.md).

---

## Evaluation system

This is the part that matters for production confidence. Three layers, each
testing a different failure mode.

### Layer 1 — Retrieval (`scripts/eval-retrieval.ts`)

Runs before the agent exists. Measures whether the index returns the right
document for each question — independently of whatever the model then does with
it.

```
bun run scripts/eval-retrieval.ts
```

Metrics reported:

| Metric | What it catches |
|--------|----------------|
| hit@1 / hit@3 / hit@5 | Is the right document in the top N results? |
| MRR (mean reciprocal rank) | How high, on average, does the right document rank? |
| Gap accuracy | Does the system correctly return nothing for questions the corpus cannot answer? |

**Relevance floor** (`RELEVANCE_FLOOR = 2.0`): the reranker score below which a
result is treated as "nothing relevant". Derived from measurement against the
real distribution — the two populations (answerable vs. unanswerable) do not
overlap, with 0.21 of margin above the highest gap score and 0.31 below the
lowest answerable score.

**Current results**: 18/18 answerable hit@3, 8/8 gaps correctly refused,
MRR 0.956.

### Layer 2 — Agent behaviour (`scripts/eval-agent.ts`)

Runs the full agent against 86 questions from a structured question bank and
makes structural assertions — not prose similarity.

```
bun run scripts/eval-agent.ts
```

Question bank breakdown:

| Group | Count | What is tested |
|-------|-------|----------------|
| Scripted | 10 | Common questions with known correct answers |
| Off-script | 68 | Realistic variations, phrasing the agent has never seen |
| Gaps | 8 | Questions the corpus cannot answer — agent must refuse |
| Boundaries | 7 | Out-of-scope requests — agent must decline, not comply |

Each check is a structural assertion: did the agent call `search_policies`? Did
it cite a source? Did it refuse when it should? These pass or fail
deterministically, unlike LLM-as-judge scores.

The prompt version hash is printed at the start of every run so results can be
tied to the exact prompt that produced them:

```
Prompt: sha256:4183fef9
```

**Current results**: 29/29 checks passing.

### Layer 3 — Live smoke test

After every deploy, a manual check against the running App Service confirms
the build that is live is the build that was just shipped. (Azure's health check
answers from the old container during a swap — `az webapp restart` does not
re-pull an image.)

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Router 7, Tailwind CSS |
| Runtime | Bun + Express |
| AI Search | Azure AI Search — BM25 + Ada embeddings + semantic reranker |
| LLM | GPT (via Azure AI Foundry) |
| Auth | Session-based with demo access code; Entra ID for production |
| Infra | Bicep (subscription-scope), Azure App Service + ACR |
| Eval | Custom TypeScript eval harness |

---

## Running locally

```bash
# Prerequisites: Bun, Azure CLI, access to kv-zuqah-cs-dev

# 1. Pull secrets from Key Vault
az keyvault secret download ...   # see docs/HANDOFF.md for the full command

# 2. Start dev server
bun run dev

# 3. Run evals
bun run scripts/eval-retrieval.ts
bun run scripts/eval-agent.ts
```

`bun run typecheck` must be clean before any change is shipped.

---

## Project structure

```
app/
  agent/          AI agent — system prompt, tool definitions, streaming runner
  chat/           Chat UI — SSE consumer, message state, image handling
  auth/           Session auth
  knowledge/      Azure Search client, index schema
scripts/
  eval-retrieval.ts   Layer 1 eval — retrieval only
  eval-agent.ts       Layer 2 eval — full agent behaviour
  ingest.ts           Build the search index from policy documents
  deploy.sh           typecheck → build → push to ACR → force pull → verify
data/
  policies/       40 Markdown policy documents (fabricated Zuqah Technologies data)
  question-bank.json  86 questions used in eval
docs/
  decisions/      9 Architecture Decision Records
  HANDOFF.md      Full project context
infra/            Bicep IaC — 9 modules, ~22 Azure resources
```

---

## Phase status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Knowledge base + retrieval pipeline | Complete |
| 2 | Streaming chat UI + agent orchestration | Complete |
| 3 | Screenshot diagnosis (vision) | Complete |
| 4 | Citations, scope enforcement, refusal | Complete |
| 5 | DevOps integration, Teams notifications, dashboards | Not started |

Phase 5 is blocked on infrastructure decisions. Phase 1–4 is deployed and
verified against the live environment.
