/**
 * The Azure AI Search index definition.
 *
 * Three things in here carry most of the weight:
 *
 * 1. `section` and `sectionTitle` are separate, indexed fields rather than text
 *    parsed back out of the content at render time. Document Intelligence returns
 *    headings with their numbers intact ("### 6.1 The connection drops
 *    repeatedly"), so a chunk already knows it is §6.1 — and a citation becomes a
 *    field lookup rather than a regular expression over prose.
 *
 * 2. The index is hybrid: BM25 over the text and HNSW over the vector, with the
 *    semantic ranker on top. On a corpus this small the ranker is what makes the
 *    top three results reliably right, which is the whole reason for choosing AI
 *    Search over pgvector (ADR-0003).
 *
 * 3. `sourceUrl` is stored at ingestion rather than reconstructed later, so a
 *    citation always resolves to the document it actually came from.
 */

/** text-embedding-3-large native dimensionality. */
export const EMBEDDING_DIMENSIONS = 3072;

export const VECTOR_PROFILE = "policy-vector-profile";
export const SEMANTIC_CONFIG = "policy-semantic-config";

/** One chunk, as stored. Mirrors the field definitions below exactly. */
export interface PolicyChunk {
  /** Stable across re-ingestion: `${docId}--${ordinal}`. Re-running updates in place. */
  id: string;
  docId: string;
  title: string;
  /** Section number as written in the document, e.g. "6.1". Empty for preamble. */
  section: string;
  /** Section heading text, e.g. "The connection drops repeatedly". */
  sectionTitle: string;
  category: string;
  content: string;
  sourceUrl: string;
  /** Position within the document, for ordering and for stable ids. */
  ordinal: number;
  contentVector?: number[];
}

/**
 * Field definitions.
 *
 * `content` is the only field that is both searchable and vectorised. Titles and
 * section headings are searchable so that a query naming a section by its words
 * ("session limits") ranks the right chunk, but they are not vectorised — the
 * duplication would add cost without adding recall on a corpus this size.
 */
export const indexDefinition = (indexName: string) => ({
  name: indexName,
  fields: [
    {
      name: "id",
      type: "Edm.String",
      key: true,
      searchable: false,
      filterable: true,
      sortable: false,
      facetable: false,
    },
    {
      name: "docId",
      type: "Edm.String",
      searchable: false,
      filterable: true,
      sortable: true,
      facetable: true,
    },
    {
      name: "title",
      type: "Edm.String",
      searchable: true,
      filterable: true,
      sortable: true,
      facetable: false,
      analyzer: "en.microsoft",
    },
    {
      name: "section",
      type: "Edm.String",
      searchable: true,
      filterable: true,
      sortable: true,
      facetable: false,
    },
    {
      name: "sectionTitle",
      type: "Edm.String",
      searchable: true,
      filterable: false,
      sortable: false,
      facetable: false,
      analyzer: "en.microsoft",
    },
    {
      name: "category",
      type: "Edm.String",
      searchable: false,
      filterable: true,
      sortable: true,
      facetable: true,
    },
    {
      name: "content",
      type: "Edm.String",
      searchable: true,
      filterable: false,
      sortable: false,
      facetable: false,
      analyzer: "en.microsoft",
    },
    {
      name: "sourceUrl",
      type: "Edm.String",
      searchable: false,
      filterable: false,
      sortable: false,
      facetable: false,
    },
    {
      name: "ordinal",
      type: "Edm.Int32",
      searchable: false,
      filterable: true,
      sortable: true,
      facetable: false,
    },
    {
      name: "contentVector",
      type: "Collection(Edm.Single)",
      searchable: true,
      filterable: false,
      sortable: false,
      facetable: false,
      dimensions: EMBEDDING_DIMENSIONS,
      vectorSearchProfile: VECTOR_PROFILE,
    },
  ],

  vectorSearch: {
    algorithms: [
      {
        name: "policy-hnsw",
        kind: "hnsw",
        // Defaults, stated explicitly so a future change is a visible edit rather
        // than an invisible drift in Azure's defaults.
        hnswParameters: { m: 4, efConstruction: 400, efSearch: 500, metric: "cosine" },
      },
    ],
    profiles: [{ name: VECTOR_PROFILE, algorithm: "policy-hnsw" }],
  },

  semantic: {
    configurations: [
      {
        name: SEMANTIC_CONFIG,
        prioritizedFields: {
          // The ranker reads these in priority order. Section heading first,
          // because "how do I set up VPN" should rank §3 "Setting up VPN on a new
          // device" above a passing mention of setup elsewhere.
          titleField: { fieldName: "sectionTitle" },
          prioritizedContentFields: [{ fieldName: "content" }],
          prioritizedKeywordsFields: [{ fieldName: "title" }],
        },
      },
    ],
  },
});
