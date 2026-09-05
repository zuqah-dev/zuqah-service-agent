# ADR-0004 — Access control via Entra group, not application tables

**Status:** Accepted · **Date:** 2026-08-31

## Context

Someone must decide who can use the demo. the base project has a *plan* for `apps` and
`user_app_access` tables, but it is unimplemented — today any authenticated user in
the tenant is admitted and a user row is created automatically.

## Decision

Control access entirely in **Entra ID**: an Enterprise Application with
*assignment required*, granted to a security group. The application maintains no
access list of its own.

## Why

- Zero code and zero schema. Access is managed by editing group membership.
- It puts authorisation where an architect expects it, and where an enterprise
  would genuinely keep it.
- Someone not in the group is stopped by Microsoft's own page before our code runs
  — a cleaner failure than an in-app error.
- It is a good demo line: *the application never maintains its own user list.*

## Rejected alternative

Implementing the `apps` / `user_app_access` tables. Correct for a multi-app
platform; unnecessary for a single-app demo, and it would mean building and
maintaining an admin screen nobody will use.

## Consequences

- Per-feature permissions inside the app are not possible without adding more.
  Not needed — every demo user sees the same thing.
- Adding an attendee requires Entra access, so the group owner must be someone
  reachable on the day.
