# Phase 2 — Knowledge Base

**Goal:** fifteen Zuqah Technologies policy documents, indexed in Azure AI Search, returning
correct passages with citable section references.

Still no agent. This phase proves the retrieval is good *before* a language model
is put in front of it, because a model cannot rescue bad retrieval and will hide
it behind fluent prose.

## Why this before the agent

Retrieval quality is the single largest determinant of whether the self-help stage
is convincing. Testing it directly — query in, passages out — is fast and
unambiguous. Testing it through an agent is slow and confounded.

## Scope

**Content generation — `data/`**

- Fifteen policy documents per [the data spec](../03-data-spec.md), as PDF and DOCX
- Two deliberate coverage gaps, so honest refusal can be demonstrated
- Demo question bank: scripted, safe off-script, and known gaps

**Ingestion pipeline — `app/knowledge/` + `scripts/ingest.ts`**

- Upload source files to Blob Storage
- Azure Document Intelligence → structured markdown
- Chunk on section boundaries, preserving heading and section number
- Embed with `text-embedding-3-large`
- Push to the Azure AI Search index
- Idempotent and re-runnable

**Index design**

- Fields: content, title, section, category, source URL, vector
- Hybrid: keyword + vector, with the semantic ranker on top
- Tuned so the top three results are relevant for every scripted question

**Evaluation — `scripts/eval-retrieval.ts`**

- Runs the question bank against the index
- Reports hit rate at 3 and 5, plus which questions fail
- Committed results, so the number quoted is one we measured

## Validated early — Document Intelligence output

Tested before building the pipeline around it, because if the parse were poor
everything downstream would need to change.

`prebuilt-layout` with `outputContentFormat=markdown` on the generated VPN PDF:
**4 pages, 1 table, 7,040 characters, succeeded in under 6 seconds.**

The important part is that the heading hierarchy survives *with its section
numbers intact*:

```
# Remote Access and VPN Policy
## 1. Purpose and scope
## 2. Approved connection methods
### 2.1 Zuqah Technologies VPN
### 2.2 Browser-based applications
## 6. Common problems and how to resolve them
### 6.1 The connection drops repeatedly
```

This settles a design question. Citations do not have to be reconstructed or
inferred later — the section number is carried in the heading, so chunking on
headings yields a chunk that already knows it is `Remote Access and VPN Policy
§6.1`. That is exactly the citation format the answer contract requires.

Tables come back as HTML inside the markdown, which preserves the row/column
relationship that a flattened text extraction would destroy. The device posture
table survived intact, including the "14 days" threshold that a plain text
extract would have separated from its label.

## Final result — 15 documents, 158 chunks

```
  hit@1   17/18   94%
  hit@3   18/18  100%
  hit@5   18/18  100%
  gaps    2/2 correctly unanswered
  PASS
```

### The threshold held

The relevance floor was fitted to six documents and had to be re-checked at
fifteen, because more documents means more opportunities for a near-miss. Both
gap questions scored **identically** to the six-document run — 1.79 and 1.70 —
and the answerable distribution was unchanged. Nine additional documents created
no new competition for either gap. The floor of 2.0 stands.

### The one hit@1 "miss" is not a miss

`Do I need the VPN to check my email?` moved from rank 1 to rank 2:

```
1. new-starter-it-setup §3  Day one                     (rerank 2.69)
2. remote-access-vpn §2.2   Browser-based applications   (rerank 2.67)
```

The New Starter checklist, step 7, says *"Open Zuqah Technologies Mail and Zuqah Technologies Teams.
Both are published directly and do not need the VPN."* That answers the question
correctly. Two chunks now answer it, they score within 0.02 of each other, and the
question bank names only one of them as expected.

This was left alone rather than corrected. Removing the duplicate would damage a
document that is right to contain it, and re-labelling the expected answer would
be fitting the measurement to the result. **hit@3 is the metric that matters** —
the agent receives the top passages, so the answer is correct whichever of the two
leads.

## Earlier result — 6 documents, 69 chunks

`bun run scripts/eval-retrieval.ts`, against the live index:

```
  hit@1   18/18  100%
  hit@3   18/18  100%
  hit@5   18/18  100%
  gaps    2/2 correctly unanswered
  PASS
```

Every answerable question retrieves its intended document as the **top** result,
and both deliberate gaps correctly return nothing.

### How the relevance floor was set

The floor deciding "nothing relevant was found" was not chosen in advance. The
first run used 1.6, a guess, and both gap questions failed it — the corpus
returned a plausible-looking near-miss for each.

The measured distribution separated cleanly:

| | Reranker score |
| --- | --- |
| Answerable questions, top-1 | min **2.31**, median 2.59, max 3.47 |
| Gap questions, best match | **1.79** and 1.70 |

No overlap. The floor was set to **2.0**, which sits between the two populations
with margin on each side. Erring higher would start refusing real questions;
erring lower would start answering ones the corpus cannot support — the worse
failure for a helpdesk, because the model downstream will use whatever it is
given.

**This must be re-derived at fifteen documents.** More documents means more
near-misses, and a threshold fitted to six is not evidence about fifteen. The
evaluation prints the distribution on every run so the number stays checkable.

## Exit criteria — what you review

1. `bun run ingest` builds the index from nothing, repeatably
2. Every scripted demo question returns its intended document in the top three
3. The two gap questions return nothing relevant — a true negative, not a
   plausible wrong answer
4. Retrieval evaluation output is committed and honest
5. Documents are readable and internally consistent; a person could believe them
6. Every document is watermarked as sample content

## Risks

| Risk | Handling |
| --- | --- |
| Fabricated documents too thin to chunk usefully | 800-word minimum, enforced in generation |
| Semantic ranker not available on the chosen SKU | Verified at provisioning in Phase 1 |
| Citations that cannot be traced back | Section number carried as an indexed field, not parsed from text later |

## Estimate

3–4 days. Document generation is the bulk; the pipeline is mostly assembly.
