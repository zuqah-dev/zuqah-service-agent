# ADR-0002 — Foundry Agent for knowledge, application for the rest

**Status:** Accepted · **Date:** 2026-08-31

## Context

Three options for where the agent runs:

1. Entirely in the application, calling Azure OpenAI — as the base project does today
2. Entirely as an Azure AI Foundry Agent
3. Hybrid — knowledge as a Foundry Agent, the rest in the application

The audience includes Microsoft, so "how Azure-native is this" is a real
criterion, not vanity.

## Decision

**Hybrid.** The knowledge agent is a real Foundry Agent with an Azure AI Search
tool. Ticketing, assignment, and screenshot diagnosis stay in the application and
call it as a subagent.

## Why

- A Foundry Agent can be **opened in the Foundry portal during the demo** — its
  instructions, its tool, its threads. That is a materially stronger claim than an
  application making API calls, and it costs almost nothing to do.
- Going fully Foundry would surrender the request-scoped identity handling, the
  custom result cards, and the streaming behaviour the demo depends on.
- Staying fully in-app would leave the strongest Azure-native asset unused.
- The subagent-and-merge pattern is already proven in the the base project codebase, so
  the integration is adaptation rather than invention.

## Consequences

- Agent behaviour lives in two places; the split must stay documented so it does
  not become confusing.
- Foundry Agents are a newer surface — a small risk of API churn, acceptable for a
  demo with a short lifespan.
- The demo gains a genuine "it exists in Azure" moment.
