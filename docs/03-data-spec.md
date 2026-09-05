# Data Specification — fabricated Zuqah Technologies content

All content is invented. No proprietary data of any kind is used anywhere.
The fictional company is **Zuqah Technologies** — an invented name, distinct from
any real organisation, so no viewer can mistake sample content for the real thing.

Every generated document carries a footer: *Sample content for demonstration —
Zuqah Technologies is a fictional company.*

## Policy documents

Fifteen documents, generated as **PDF and DOCX**, each with numbered sections so
citations read as `(Remote Access Policy §3.2)` rather than a filename.

| # | Document | Category | Anchors these questions |
| --- | --- | --- | --- |
| 1 | Remote Access & VPN Policy | IT | VPN setup, disconnects, split tunnelling |
| 2 | Laptop Refresh & Hardware Standards | IT | Eligibility, model choice, damaged hardware |
| 3 | Software Requests & Licensing | IT | Requesting software, approvals |
| 4 | Privileged Access & Admin Rights | IT | Local admin, elevation, duration |
| 5 | Password & Multi-Factor Authentication | IT | Resets, lockouts, MFA re-enrolment |
| 6 | New Starter IT Setup Checklist | IT | Day-one setup, account provisioning |
| 7 | Printing & Peripherals | IT | Printer setup, docking stations |
| 8 | Incident Priority & SLA Matrix | IT | Priority definitions, response times |
| 9 | Collaboration Tools Standards | IT | Teams, file sharing, external guests |
| 10 | Paid Time Off & Leave | HR | Entitlement, carry-forward, booking |
| 11 | Expense & Travel Reimbursement | HR | Limits, receipts, approvals |
| 12 | Remote & Hybrid Working | HR | Days in office, equipment allowance |
| 13 | Benefits Overview | HR | Enrolment windows, coverage |
| 14 | Performance Review Cycle | HR | Timing, ratings, process |
| 15 | Code of Conduct | HR | Standards, reporting |

**Design rules:**

- 800–2,000 words each; long enough to chunk meaningfully
- Real internal contradictions avoided — the agent must not have to arbitrate
- Deliberate gaps left in two areas, so "I don't have that policy" can be
  demonstrated honestly rather than staged
- Numbers are specific (28 days, $75/night, 5 business days) so answers are crisp

## Employees

Approximately fifty, distributed to make search results believable.

| Field | Notes |
| --- | --- |
| Name, email | Invented; `@zuqah.com` |
| Job title | Consultant, Senior Consultant, Lead, Principal, Manager |
| Department | Enterprise Networking, Cloud Foundations, Microsoft Cloud, Modern Datacenter, Security Advisory, Data & AI, Service Desk |
| Location | Six US cities, uneven distribution |
| Skills | 3–12 each, with proficiency 100–400 |
| Manager | Real reporting lines, three levels deep |

**Design rules:**

- Skills follow a realistic long tail — a few people know everything, many know
  one thing well. No uniform distribution.
- For any demo query there are **3–8 plausible matches**, not one obvious plant.
- Availability varies: some fully booked, some free, most partial.

## Bookings

Twelve weeks forward from the demo date, so availability percentages compute to
something varied and believable. Roughly 70% of employees have some booking; a
handful are at 100%; a handful are bench.

## Historical tickets

Thirty, spread over the previous ninety days.

Purpose: makes "what are my open tickets" real, gives issue diagnosis something
to correlate against, and supplies the continuous-improvement numbers (top
categories, repeat issues, knowledge gaps).

Distribution weighted to the demo topics — VPN, hardware, access requests — so the
"this was asked six times" insight has genuine data behind it.

## Error screenshots

Generated as images so the diagnosis stage is genuine multimodal reading rather
than a staged text paste.

| Image | Shows |
| --- | --- |
| VPN Error 809 | The primary demo path |
| Outlook sync failure | Alternate path |
| Disk almost full | A self-serve fix, no ticket needed |
| Unreadable / cropped | Proves the agent asks rather than guesses |

## Demo question bank

Every question mapped to the document that answers it, with the expected citation.
Three groups:

1. **Scripted** — the rehearsed demo path
2. **Safe off-script** — answerable, for when someone in the room asks their own
3. **Known gaps** — deliberately unanswerable, to show graceful refusal

## Regeneration

All data is produced by scripts under `scripts/`, so the demo environment can be
reset to a known state before each run. Nothing is hand-edited in place.
