/**
 * The `search_policies` tool.
 *
 * The tool schema is prompt engineering, not documentation — the model reads the
 * description to decide whether to call it and what to pass. It is written to be
 * read by the model, and its wording is as load-bearing as the system prompt.
 *
 * NOTE ON IDENTITY: this tool has no user parameter and never will. It reads
 * public policy, so there is nothing to scope. The tools added in Phase 5 that DO
 * touch personal records resolve the caller server-side and expose no identity
 * field either. See docs/decisions/0006-identity-never-in-tool-schema.md.
 */

import { hybridSearch } from "~/knowledge/azureClients";
import { citationFor } from "~/knowledge/chunking";
import { SEMANTIC_CONFIG } from "~/knowledge/index.schema";

/**
 * Reranker score below which nothing is considered relevant.
 *
 * Derived by measurement, not chosen — see docs/phases/phase-2-knowledge-base.md.
 * Over the 15-document corpus, answerable questions scored 2.31 and above while
 * questions the corpus cannot answer scored 1.79 and below. The value must stay
 * in step with scripts/eval-retrieval.ts, which is what verifies it.
 */
export const RELEVANCE_FLOOR = 2.0;

export const searchPoliciesTool = {
  type: "function" as const,
  function: {
    name: "search_policies",
    description:
      "Search Zuqah Technologies' IT and HR policy documents. Call this before answering ANY " +
      "question about policy, entitlement, process, limits, or how to do something — " +
      "including questions you believe you already know the answer to. Returns " +
      "passages with the document and section to cite. If it reports found=false, " +
      "say Zuqah Technologies does not have that documented rather than answering from general " +
      "knowledge.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What to search for. Prefer the employee's own wording plus any clarifying " +
            "terms. A focused rephrasing works better than a whole conversation.",
        },
        category: {
          type: "string",
          enum: ["IT", "HR"],
          description:
            "Optional filter. Omit unless the question is unambiguously one or the " +
            "other — filtering wrongly hides the answer entirely.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

export interface SearchPoliciesResult {
  found: boolean;
  passages: Array<{
    citation: string;
    title: string;
    section: string;
    sectionTitle: string;
    content: string;
    sourceUrl: string;
  }>;
  /** Present when found is false, so the model has something specific to say. */
  message?: string;
}

export async function runSearchPolicies(args: {
  query: string;
  category?: string;
}): Promise<SearchPoliciesResult> {
  const indexName = process.env.AZURE_SEARCH_INDEX ?? "zuqah-policies";

  const hits = await hybridSearch(indexName, args.query, {
    top: 5,
    semanticConfig: SEMANTIC_CONFIG,
    ...(args.category ? { category: args.category } : {}),
  });

  // Filtering here rather than letting the model judge relevance is deliberate.
  // Handed a weak passage, a model will use it — the passage is the most concrete
  // thing in its context, and "this isn't quite right" is a harder judgement than
  // "answer from what you were given".
  const relevant = hits.filter((hit) => (hit.rerankerScore ?? 0) >= RELEVANCE_FLOOR);

  if (relevant.length === 0) {
    return {
      found: false,
      passages: [],
      message:
        "No Zuqah Technologies policy document covers this. Tell the employee it is not " +
        "documented rather than answering from general knowledge.",
    };
  }

  return {
    found: true,
    passages: relevant.map((hit) => ({
      citation: citationFor(hit.title, hit.section),
      title: hit.title,
      section: hit.section,
      sectionTitle: hit.sectionTitle,
      content: hit.content,
      sourceUrl: hit.sourceUrl,
    })),
  };
}
