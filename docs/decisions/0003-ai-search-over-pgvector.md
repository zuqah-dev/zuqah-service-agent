# ADR-0003 — Azure AI Search rather than pgvector

**Status:** Accepted · **Date:** 2026-08-31

## Context

We need retrieval over policy documents. Postgres with `pgvector` is already in
the stack, and the base project uses it for skills matching. Azure AI Search is the
Azure-native alternative.

## Decision

**Azure AI Search**, with hybrid retrieval and the semantic ranker.

## Why

- It is **less work, not more**. Hybrid search, ranking, and highlighting are
  built in; with pgvector we would hand-build chunk tables, index tuning, and rank
  fusion.
- The semantic ranker measurably improves top-3 relevance on small corpora, which
  is exactly our situation — fifteen documents, and every demo answer must land.
- It is a marquee Azure service doing genuine work, which serves the audience.
- The existing the base project architecture document already assumed AI Search, so this
  aligns rather than diverges.

## Rejected alternative

pgvector would have avoided a second data store and one fewer service to
provision. Rejected because it optimises for architectural tidiness at the cost of
both demo quality and build time.

## Consequences

- Two stores: AI Search for documents, Postgres for people and bookings. A clean
  split by data type, and easy to explain.
- Running cost while the demo exists — modest, and the resource group can be
  deleted between demos.
