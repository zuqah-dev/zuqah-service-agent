# Phase 5 — Actions, Assignment & Telemetry

**Goal:** the remaining three stages — problem resolution, support assignment,
continuous improvement — and a rehearsed demo.

## Scope

**Problem resolution — Azure DevOps**

- A dedicated demo project, so nothing touches a real backlog
- `create_ticket` → work item, returning a real ID and URL
- `get_my_tickets` → the caller's tickets only, resolved server-side
- Ticket confirmation card in the UI, ID clickable
- The agent confirms what it will file and waits for agreement before filing

**Support assignment — Postgres**

- Employees, skills, and twelve weeks of bookings seeded from the data spec
- Skill match, then availability over the relevant window
- `assign_support` returns a ranked shortlist with availability percentages
- Assignee card showing name, department, skills matched, and availability

**Notification — Teams**

- Logic App triggered on ticket creation
- Adaptive Card into a demo Teams channel: summary, ID, link, assignee
- Fires live during the demo — the visible closing beat

**Continuous improvement — Application Insights**

- OpenTelemetry from the agent into App Insights
- Per turn: tokens, cost, latency, tools used, outcome
- Dashboard: deflection rate, top questions, thumbs-down list, knowledge gaps
- The gap list is real — driven by questions that returned nothing

**Demo assets**

- Rehearsed five-stage script with timings
- Safe off-script question list
- One-page Azure architecture diagram
- A "what is real, what is simulated" slide — stated plainly, not buried
- `scripts/reset-demo.ts` to restore known state before each run

## Exit criteria — what you review

1. Full five-stage conversation runs end to end without intervention
2. The ticket exists in Azure DevOps and opens from the chat
3. The assignee is plausible — right skills, real availability, not an obvious plant
4. The Adaptive Card appears in Teams during the run
5. The App Insights dashboard shows the conversation that just happened
6. Three off-script questions handled without embarrassment
7. `reset-demo` restores a clean state
8. The demo has been rehearsed start to finish at least twice

## Risks

| Risk | Handling |
| --- | --- |
| Azure DevOps API auth fails mid-demo | PAT in Key Vault, expiry checked before the run; failure surfaces as a clear message, not a hang |
| Teams card delayed | Fire early in the turn; treat as a bonus beat, not a dependency |
| Assignment returns someone implausible | Seed data tuned so any reasonable query yields a sensible shortlist |
| Dashboard empty at demo time | Seeded with historical tickets and prior runs, so it is never blank |

## Estimate

4–5 days including rehearsal.

## What we will say is not built

Stated openly in the closing slide, because volunteering the seams builds more
trust than being caught by them:

- No human handoff to a live agent
- No real ITSM integration — Azure DevOps stands in
- Tickets are filed and read, never resolved or reassigned
- All content is fabricated Zuqah Technologies data
