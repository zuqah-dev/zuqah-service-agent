# Documentation

Zuqah Technologies Service Agent — a five-stage Customer Service demonstration on Azure.

## Start here

**[HANDOFF.md](HANDOFF.md)** — read before doing anything. Context that cannot be
read off the code: why this project exists, who has and has not sanctioned it,
what is paused, and the traps that have already cost hours.

## Read in this order

| Doc | What it answers |
| --- | --- |
| [HANDOFF](HANDOFF.md) | Situation, state, environment, how to work here |
| [00 — Charter](00-charter.md) | Why this exists, what done looks like, what we will not build |
| [01 — Architecture](01-architecture.md) | How it works, which Azure service does what |
| [02 — User Experience](02-user-experience.md) | What users ask, what they get, where it says no |
| [03 — Data Specification](03-data-spec.md) | The fabricated Zuqah Technologies content |
| [04 — Demo Script](04-demo-script.md) | The ninety-second arc and the proof behind it |

## Phases

Each phase ends in something you can see and sign off. Nothing starts before the
previous one is accepted.

| # | Phase | Output you review | Est. |
| --- | --- | --- | --- |
| 1 | [Foundation](phases/phase-1-foundation.md) | Azure environment deployed; sign-in works; empty chat | 2–3 d |
| 2 | [Knowledge Base](phases/phase-2-knowledge-base.md) | 15 documents indexed; retrieval measured | 3–4 d |
| 3 | [The Agent](phases/phase-3-agent.md) | Foundry Agent answering with citations, headless | 3–4 d |
| 4 | [Application](phases/phase-4-application.md) | Self-help and diagnosis working in the browser | 4–5 d |
| 5 | [Actions & Telemetry](phases/phase-5-actions-and-telemetry.md) | Tickets, assignment, Teams, dashboard, rehearsed demo | 4–5 d |

**Total: 16–21 working days.**

## Standards

Reusable across projects, not specific to this one.

| Doc | What it covers |
| --- | --- |
| [Azure IaC Standards](standards/azure-iac-standards.md) | Bicep structure, naming, secrets, permissions, region and capacity, validation, deployment verification, and the traps each rule exists to prevent |

## Decisions

The reasoning behind every significant choice, including what was rejected.

| ADR | Decision |
| --- | --- |
| [0001](decisions/0001-separate-project.md) | Separate project and resource group |
| [0002](decisions/0002-foundry-agent-for-knowledge.md) | Foundry Agent for knowledge, application for the rest |
| [0003](decisions/0003-ai-search-over-pgvector.md) | Azure AI Search rather than pgvector |
| [0004](decisions/0004-entra-group-access.md) | Access via Entra group, not application tables |
| [0005](decisions/0005-azure-devops-as-ticket-system.md) | Azure DevOps as the ticket system of record |
| [0006](decisions/0006-identity-never-in-tool-schema.md) | Identity never appears in a tool schema |
| [0007](decisions/0007-no-role-assignments.md) | Deploy without role assignments |
| [0008](decisions/0008-single-foundry-account.md) | One AI Foundry account, not four AI resources |
| [0009](decisions/0009-custom-server-trust-proxy.md) | A custom server, so the proxy is trusted |

New decisions get a new numbered file. Superseded ones are marked, not deleted.

## Conventions

- Phase documents are written **before** the phase and updated with what actually
  happened when it closes.
- Every phase has explicit exit criteria. "Mostly working" does not pass.
- Anything that turns out to be wrong is corrected in place and noted, not
  quietly rewritten.
