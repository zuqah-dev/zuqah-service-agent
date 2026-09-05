# Project Charter — Zuqah Technologies Service Agent

**Project:** Zuqah Technologies Service Agent
**Codename:** `zuqah-service-agent`
**Architect:** Claude
**Sponsor:** Anurag Arora
**Status:** Phase 0 — planning, awaiting review

---

## Why this exists

The **Customer Service** capability breaks into five stages: self-help, support
assignment, issue diagnosis, problem resolution, continuous improvement. Most
organisations describe it. Few can show it end to end.

This project builds a working demonstration of all five stages, running on Azure,
that can be shown to any potential client as a portfolio piece.

## What success looks like

A ninety-second, unscripted-feeling conversation in which an employee reports a
problem and the system walks all five stages end to end — answering from real
documents with citations, reading a screenshot, filing a real ticket, naming a
real available engineer, and notifying them — with every step traceable
afterwards in Azure.

Concretely, we are done when:

1. All five stages are demonstrable in one continuous conversation.
2. Every stage is visibly powered by a named Azure service doing real work.
3. The agent exists in Azure AI Foundry and can be shown in the Foundry portal.
4. The whole environment deploys from one Bicep command and tears down with one.
5. The demo survives three off-script questions without embarrassment.

## Audience and what each one cares about

| Audience | What convinces them |
| --- | --- |
| Prospective client | That it is real, deployable, and maintainable — not a mock |
| Microsoft | Depth of Azure adoption, and that each service earns its place |
| Technical evaluator | That the five-stage story is achievable, not aspirational |

## In scope

- All five customer-service stages, demonstrated
- Fabricated **Zuqah Technologies** content — policy documents, employees, tickets
- Azure-native services throughout, deployed as code
- One chat application with streaming, citations, and result cards
- Telemetry sufficient to tell the continuous-improvement story

## Explicitly out of scope

- Real or proprietary data of any kind — no real policies, employees, or tickets
- Production hardening: HA, DR, load testing, penetration testing
- Integration with any real ITSM, HRIS, or ticketing system
- Multi-tenancy, multi-language, voice, mobile
- Human handoff to a live agent (named as a next step, not built)

## Constraints we design around

| Constraint | Consequence |
| --- | --- |
| Owner on own subscription | Full control — role assignments possible. Key Vault access policies and key-based auth used for simplicity. See [ADR-0007](decisions/0007-no-role-assignments.md). |
| Azure startup credits | Cost-conscious choices throughout; nothing idle. App Service stopped between demos. |
| Demo, not production | Optimise for legibility and reliability of the demo over scale |
| All data fabricated | No clearance dependency — but the data must be good enough to be believable |

## Known risks

| Risk | Mitigation |
| --- | --- |
| Entra app registration needs someone else | Requested on day one, before it blocks Phase 1 |
| Model capacity exhausted mid-demo | Own Azure OpenAI deployment with dedicated capacity, not the shared account |
| Search returns nothing for an off-script question | Index a broad enough corpus; agent says "I don't have that" gracefully |
| Fabricated data reads as fake | Realistic distributions, no obvious plants, varied availability |
| Live demo network failure | Rehearse with a recorded fallback |

## Non-negotiables

Three properties hold regardless of schedule pressure:

1. **The agent never invents policy.** Everything it asserts is cited or refused.
2. **A user sees only their own records.** Enforced server-side, not by prompt.
3. **Nothing is presented as real that is not.** The demo names what is simulated.
