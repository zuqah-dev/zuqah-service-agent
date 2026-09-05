# ADR-0001 — Separate project and resource group

**Status:** Accepted · **Date:** 2026-08-31

## Context

The Customer Service module could be a fourth app inside the existing `nri-spark`
repository and its Azure environment, or a standalone project. the base project already
provides auth, chat, streaming, persistence, and a deployment pipeline, so reuse
is tempting.

## Decision

Build a **separate repository and a separate resource group**, reusing the base project's
*patterns* but none of its running infrastructure. The one exception is the
container registry `zuqah-acr`, referenced read-only.

## Why

- A demo must be disposable. One `az group delete` must remove everything, which
  is impossible if it shares a resource group with live services.
- Deploying demo changes must never risk the running Resourcing Agent or Outrider.
- The demo can move at demo speed without being held to the platform's review and
  release process.
- Provisioning a second container registry would cost money and prove nothing.

## Consequences

**Accepted cost:** platform code — auth, chat shell, streaming — is duplicated
rather than shared. For a demo of this size that is a few days, and it buys
complete isolation.

**If this graduates to a product**, the right move is to fold it back in as a
fourth app in `nri-spark` and retire this repository. The code is written to make
that possible: same framework, same conventions, same patterns.
