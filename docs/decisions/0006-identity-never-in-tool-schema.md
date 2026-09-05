# ADR-0006 — Identity never appears in a tool schema

**Status:** Accepted · **Date:** 2026-08-31

## Context

Tools that read or write user records — listing tickets, creating one — need to
know who is asking. The straightforward implementation gives the model a `user_id`
parameter and instructs it to pass the right value.

## Decision

**No tool exposes an identity parameter.** The caller is resolved server-side from
the authenticated session on every invocation.

## Why

- A parameter that does not exist cannot be misused. *"Show me Sarah's tickets"* is
  not refused by good behaviour — it is **inexpressible**, because there is no
  field to put "Sarah" in.
- Prompt instructions are guidance; schemas are enforcement. Only one of those
  survives an adversarial user.
- It is demonstrable live, and it is the single most convincing thing an architect
  can be shown about whether the system is trustworthy.

## Consequences

- Tools cannot act on behalf of another user. That capability is not needed, and
  if it ever is, it must arrive with an explicit authorisation model rather than by
  quietly widening a schema.
- A behavioural test asserts this. It must never be relaxed to make something else
  easier.

## Provenance

Carried over from the `helpdesk-agent` project, where the same structural boundary
was implemented and tested. The mechanism differs; the principle does not.
