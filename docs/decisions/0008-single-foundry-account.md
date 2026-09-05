# ADR-0008 — One AI Foundry account, not four AI resources

> See also [ADR-0009](0009-custom-server-trust-proxy.md), added after a bug that
> made every form in the application fail behind App Service.

**Status:** Accepted · **Date:** 2026-08-31
**Supersedes part of:** [ADR-0002](0002-foundry-agent-for-knowledge.md) and the
Phase 1 resource list

## Context

The original Phase 1 plan provisioned separate resources for four jobs:

- Azure OpenAI account — chat and embedding models for the application
- AI Foundry account — the knowledge agent
- Content Safety — input and output screening
- Document Intelligence — parsing policy PDFs

While writing the template I confirmed on the existing
`enterprise-template-ai-foundry` account that a Cognitive Services account of
`kind: 'AIServices'` exposes **all four** on one resource. Its endpoint list
includes OpenAI, Content Safety, FormRecognizer (Document Intelligence), Speech,
Translator, Vision, and Language.

## Decision

Provision **one AI Foundry account** (`kind: 'AIServices'`,
`allowProjectManagement: true`) with a child project, and use it for everything:

| Job | Endpoint on the same account |
| --- | --- |
| Chat + embeddings | `…​.openai.azure.com` |
| Foundry Agents | `…​.services.ai.azure.com/api/projects/…` |
| Content Safety | `…​.cognitiveservices.azure.com` |
| Document Intelligence | `…​.cognitiveservices.azure.com` |

## Why

- **Fewer moving parts.** One resource, one key, one endpoint family, one thing to
  provision and purge.
- **It is the current Azure guidance.** Foundry is positioned as the single AI
  resource; separate per-service accounts is the older pattern.
- **It is a better demo line.** *"One Azure AI Foundry resource provides the
  model, the agent runtime, content safety, and document intelligence"* is
  stronger and more honest than listing four accounts that happen to be four
  logos.
- **It costs nothing.** Billing is per use, not per account.

## Consequences

- Phase 1 provisions one AI resource rather than two, and Phases 2 and 3 need no
  new AI resources at all.
- A single point of failure for all AI capability. Acceptable for a demo; a
  production design would consider a second account for failover, exactly as
  `nri-spark` does today for Azure OpenAI.
- The architecture document's service table is unchanged in substance — the same
  services do the same work — but they are now delivered by one resource. Updated
  there accordingly.

## Verified

```
az cognitiveservices account show -n enterprise-template-ai-foundry -g rg-ai-demo
  → kind: AIServices, allowProjectManagement: true
  → endpoints include Content Safety, FormRecognizer, OpenAI, AI Foundry API
```
