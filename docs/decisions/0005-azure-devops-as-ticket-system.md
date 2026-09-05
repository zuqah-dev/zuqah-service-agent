# ADR-0005 — Azure DevOps as the ticket system of record

**Status:** Accepted · **Date:** 2026-08-31

## Context

The problem-resolution stage needs somewhere real for a ticket to land. Options
considered: an in-application table, a Microsoft List via Graph, Dynamics 365
Customer Service, and Azure DevOps work items.

## Decision

**Azure DevOps work items**, in a dedicated demo project.

## Why

- The organisation already exists, so there is nothing to procure.
- It gives a **real, clickable URL** and a board that can be opened live. An
  in-application table gives a number that proves nothing.
- It is a Microsoft product, which serves the audience.
- The integration is a single REST call — hours, not days.

## Rejected alternatives

- **Dynamics 365 Customer Service** — the genuinely correct ITSM answer and the
  strongest story. Rejected on licensing and provisioning time, which would
  consume the schedule.
- **In-app table** — least work, least credible.
- **Microsoft List** — plausible, but no better than Azure DevOps here, and less
  familiar to the audience as a ticket store.

## Consequences

- Azure DevOps is not an ITSM and we must not imply it is. The honest framing —
  *the ticket tool is one function; point it at ServiceNow, Dynamics, or Azure
  DevOps by configuration* — is true, and is a strength rather than a hedge.
- A dedicated demo project keeps this away from the real backlog.
