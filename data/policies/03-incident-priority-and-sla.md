---
id: incident-priority-sla
title: Incident Priority and Service Level Standard
category: IT
version: "2.4"
owner: Service Desk
effective: 2026-01-05
review: 2027-01-05
---

# Incident Priority and Service Level Standard

## 1. Purpose

This standard defines how IT incidents are prioritised, what response and
resolution times apply to each priority, and how an incident is escalated when
those times are at risk. It exists so that both the person reporting a problem and
the person fixing it hold the same expectation.

## 2. How priority is determined

Priority is a function of two things: how much of the business is affected, and how
severely. It is not set by the person reporting the incident, though their
description of impact is the main input.

| | **High severity** — unable to work | **Medium severity** — degraded | **Low severity** — inconvenient |
| --- | --- | --- | --- |
| **Many people** | P1 | P2 | P3 |
| **A team** | P2 | P3 | P3 |
| **One person** | P3 | P3 | P4 |

A single person unable to work at all is a **P3**, not a P1. This is deliberate:
priority reflects business impact, and reserving P1 for genuinely widespread
outages is what makes P1 mean anything.

## 3. Priority definitions

### 3.1 P1 — Critical

A service that many people depend on is completely unavailable, or a security
incident is in progress. Examples: authentication is down, the corporate network
is unreachable from an office, a confirmed active compromise.

P1 incidents are worked continuously until service is restored, including outside
business hours. A P1 is communicated to all affected users within 30 minutes of
being declared, and updated at least hourly thereafter.

### 3.2 P2 — High

A service is significantly degraded, or a team is unable to work. Examples: a
shared application is very slow for everyone, a practice cannot reach a system it
needs, a customer deliverable is at risk today.

### 3.3 P3 — Standard

The default. One person cannot work, or a service is mildly degraded for several
people. Most incidents are P3, including a failed laptop, a lost password and an
application that will not start for a single user.

### 3.4 P4 — Low

A request or a minor issue with a workaround already in place. Examples: a
cosmetic fault, a question about how something works, a request for a peripheral.

## 4. Response and resolution targets

**Response** means a human has read the ticket, confirmed the priority and told the
reporter what happens next. It does not mean an automated acknowledgement.

**Resolution** means service is restored, which may be by workaround. A permanent
fix may follow separately under problem management.

| Priority | Response | Resolution target | Hours covered |
| --- | --- | --- | --- |
| **P1** | 15 minutes | 4 hours | 24 × 7 |
| **P2** | 1 hour | 8 business hours | Business hours |
| **P3** | 4 business hours | 3 business days | Business hours |
| **P4** | 1 business day | 10 business days | Business hours |

Business hours are 08:00 to 18:00 local time, Monday to Friday, excluding public
holidays in the employee's location. Only P1 carries an out-of-hours commitment.

Targets are measured from when the ticket is raised, not from when it is assigned.
Time spent waiting for information from the reporter is excluded, and the ticket
is placed in a *pending* state that stops the clock.

## 5. Escalation

An incident is escalated automatically when it reaches **75%** of its resolution
target without a resolution in sight. Escalation means the assigned engineer's
manager is notified and, for P1 and P2, a second engineer is added.

A reporter may also request escalation at any time by replying to the ticket and
saying so plainly. Requests are reviewed within one business hour and are granted
where the stated business impact justifies a higher priority. A request that is
declined always receives an explanation.

## 6. Reopening and disputes

A resolved ticket may be reopened within **five business days** if the problem
recurs. After five days a new ticket is raised, linked to the original.

Where a reporter disagrees with the assigned priority, the Service Desk lead
reviews it. The decision and its reasoning are recorded on the ticket.

## 7. What is not an incident

Requests for new equipment, access, software or accounts are **service requests**,
not incidents, and follow the target in section 4 for P4 unless a specific
standard says otherwise. The distinction matters: an incident restores something
that was working, a request provides something new.

Where a request is genuinely blocking work — a new starter with no laptop on their
first morning, for instance — it is raised as a P3 incident instead, and the
reason is noted on the ticket.

## 8. Measurement and reporting

Attainment against these targets is reported monthly to the IT leadership team and
is published on the IT portal. The measures are: percentage responded within
target, percentage resolved within target, and volume by priority and category.

Tickets are not closed to protect a measure. Where a target is missed, it is
recorded as missed.

---

*Sample content for demonstration purposes. Zuqah Technologies is a fictional company and
this document describes no real organisation's policy.*
