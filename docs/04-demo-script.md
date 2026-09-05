# Demo Script

Target: **ninety seconds** for the main arc, then two minutes of proof behind it.
One employee, one problem, all five stages, no cuts.

## Before you start

- `bun run reset-demo` — known state
- Signed in as the demo employee
- Foundry portal open in a second tab
- Application Insights dashboard open in a third
- Teams demo channel visible

## The arc

### Beat 1 — Self-help *(~20s)*

> **User:** My VPN keeps dropping every few minutes.

Agent gives numbered steps with a citation to the Remote Access Policy.

**Say:** *"That answer came from a policy document, indexed in Azure AI Search.
The citation is clickable — nothing here is invented."*

### Beat 2 — Issue diagnosis *(~20s)*

> **User:** Tried all three, still dropping. *[pastes the Error 809 screenshot]*

Agent quotes the exact error text back, explains it is an upstream blocked port,
and says this is not locally fixable.

**Say:** *"It read the screenshot. Note that it quoted the error verbatim rather
than guessing — that is deliberate."*

### Beat 3 — Problem resolution *(~20s)*

> **Agent:** …want me to raise a ticket?
> **User:** Yes please.

A real Azure DevOps work item is created. The ID is clickable.

**Do:** click it. The work item opens in Azure DevOps.

### Beat 4 — Support assignment *(~20s)*

Agent names an engineer with matching skills and current availability.

**Say:** *"That is not a mailbox. It matched skills against live availability and
picked a person who can actually take it this week."*

### Beat 5 — Continuous improvement *(~10s)*

The Adaptive Card lands in Teams. Switch to the App Insights dashboard: the
conversation is there, with tokens, latency, and the knowledge-gap list.

**Say:** *"Six people asked about VPN split tunnelling this month and we have no
document for it. That is the loop closing."*

## The proof, after the arc

1. **Foundry portal** — the agent, its instructions, its Azure AI Search tool,
   its threads. *"This is a real Azure AI Foundry agent, not an API call."*
2. **The refusal** — ask a gap question live. It says it does not know.
   *"That matters more than any answer it gave."*
3. **The boundary** — ask for someone else's tickets. It refuses, structurally.
4. **The infrastructure** — `main.bicep`. *"One command builds this. One removes it."*

## Safe off-script questions

Answerable, for when someone in the room wants to try their own:

- What's the expense limit for a client dinner?
- How many PTO days do I get, and can I carry them over?
- How do I request local admin rights?
- What does a Priority 2 incident mean for response time?
- Which laptop can I choose at refresh?

## Known gaps — say "I don't know" correctly

- Anything about VPN split tunnelling
- Anything about parental leave

## If something breaks

| Failure | Response |
| --- | --- |
| Search returns nothing | Move to the boundary demo; return to the arc after |
| Azure DevOps unreachable | Show a previously created ticket; name the failure plainly |
| Teams card delayed | Carry on — it is a bonus beat, not a dependency |
| Model rate-limited | Dedicated capacity makes this unlikely; recorded run as fallback |

## Closing

**What is real:** the Azure services, the search index, the agent, the ticket, the
availability logic, the telemetry, the infrastructure as code.

**What is simulated:** all Zuqah Technologies content — policies, employees, tickets. Azure
DevOps stands in for a real ITSM. There is no human handoff yet.

Say this out loud. Volunteering the seams earns more trust than being caught.
