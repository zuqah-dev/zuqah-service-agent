/**
 * Thin REST clients for the three Azure services the knowledge base uses.
 *
 * Written against the REST API with `fetch` rather than the Azure SDKs. The
 * calls are few and simple, the SDKs would add a dependency tree for four
 * endpoints, and — for a project whose purpose is to demonstrate the services —
 * being able to read the actual request is worth more than the abstraction.
 *
 * All three authenticate with a key. That is not laziness: the deploying account
 * cannot create role assignments, so key auth is the design. See ADR-0007.
 */

const SEARCH_API_VERSION = "2024-07-01";
const OPENAI_API_VERSION = "2024-10-21";
const DOC_INTELLIGENCE_API_VERSION = "2024-11-30";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Fail with the service's own error text — it is almost always the useful part. */
async function ensureOk(response: Response, what: string): Promise<void> {
  if (response.ok) return;
  const detail = await response.text().catch(() => "");
  throw new Error(`${what} failed: ${response.status} ${response.statusText}\n${detail.slice(0, 800)}`);
}

// ---------------------------------------------------------------------------
// Document Intelligence
// ---------------------------------------------------------------------------

/**
 * Convert a document to Markdown with `prebuilt-layout`.
 *
 * `outputContentFormat=markdown` is what preserves the heading hierarchy, and
 * the heading hierarchy is what carries the section numbers we cite with. Plain
 * text output would return the same words with the structure destroyed.
 *
 * The API is asynchronous: submit, then poll the returned operation URL.
 */
export async function analyzeDocument(bytes: Uint8Array, contentType: string): Promise<string> {
  const endpoint = required("AZURE_COGNITIVE_ENDPOINT").replace(/\/$/, "");
  const key = required("AZURE_FOUNDRY_API_KEY");

  const submit = await fetch(
    `${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze` +
      `?api-version=${DOC_INTELLIGENCE_API_VERSION}&outputContentFormat=markdown`,
    {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": contentType },
      body: bytes as unknown as BodyInit,
    }
  );
  await ensureOk(submit, "Document Intelligence submit");

  const operationUrl = submit.headers.get("operation-location");
  if (!operationUrl) throw new Error("Document Intelligence returned no operation-location header");

  // Analysis of a four-page document completes in a few seconds; the ceiling is
  // generous so a slow response is a wait rather than a spurious failure.
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const poll = await fetch(operationUrl, { headers: { "Ocp-Apim-Subscription-Key": key } });
    await ensureOk(poll, "Document Intelligence poll");

    const result = (await poll.json()) as {
      status: string;
      analyzeResult?: { content?: string };
      error?: { message?: string };
    };

    if (result.status === "succeeded") {
      const content = result.analyzeResult?.content;
      if (!content) throw new Error("Document Intelligence succeeded but returned no content");
      return content;
    }
    if (result.status === "failed") {
      throw new Error(`Document Intelligence failed: ${result.error?.message ?? "no reason given"}`);
    }
  }

  throw new Error("Document Intelligence timed out after two minutes");
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

/**
 * Embed a batch of texts.
 *
 * Batched because the per-request overhead dominates for short passages, and
 * because the rate limit is measured in requests as well as tokens.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const endpoint = required("AZURE_OPENAI_ENDPOINT").replace(/\/$/, "");
  const key = required("AZURE_FOUNDRY_API_KEY");
  const deployment = required("AZURE_OPENAI_EMBEDDING_MODEL");

  const response = await fetch(
    `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${OPENAI_API_VERSION}`,
    {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ input: texts }),
    }
  );
  await ensureOk(response, "Embeddings");

  const body = (await response.json()) as { data: Array<{ index: number; embedding: number[] }> };

  // The API does not guarantee response order matches request order, so results
  // are placed by their stated index rather than by position.
  const vectors: number[][] = new Array(texts.length);
  for (const item of body.data) vectors[item.index] = item.embedding;
  return vectors;
}

/** Embed a single query. Same model, same endpoint. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  if (!vector) throw new Error("Embedding returned no vector");
  return vector;
}

// ---------------------------------------------------------------------------
// Azure AI Search
// ---------------------------------------------------------------------------

function searchHeaders(): Record<string, string> {
  return {
    "api-key": required("AZURE_SEARCH_API_KEY"),
    "Content-Type": "application/json",
  };
}

function searchBase(): string {
  return required("AZURE_SEARCH_ENDPOINT").replace(/\/$/, "");
}

/** Create or replace the index. Replacing drops its documents, so callers re-ingest. */
export async function putIndex(definition: { name: string }): Promise<void> {
  const response = await fetch(
    `${searchBase()}/indexes/${definition.name}?api-version=${SEARCH_API_VERSION}`,
    { method: "PUT", headers: searchHeaders(), body: JSON.stringify(definition) }
  );
  await ensureOk(response, `Create index ${definition.name}`);
}

export async function deleteIndex(name: string): Promise<void> {
  const response = await fetch(`${searchBase()}/indexes/${name}?api-version=${SEARCH_API_VERSION}`, {
    method: "DELETE",
    headers: searchHeaders(),
  });
  // Absent is the desired end state, so a 404 is success.
  if (response.status === 404) return;
  await ensureOk(response, `Delete index ${name}`);
}

/**
 * Upload documents.
 *
 * `mergeOrUpload` rather than `upload` so that re-running ingestion updates
 * existing chunks in place instead of failing on a key collision. Chunk ids are
 * deterministic, so the same source always produces the same ids.
 */
export async function uploadDocuments(indexName: string, documents: unknown[]): Promise<void> {
  const batch = documents.map((doc) => ({ ...(doc as object), "@search.action": "mergeOrUpload" }));

  const response = await fetch(
    `${searchBase()}/indexes/${indexName}/docs/index?api-version=${SEARCH_API_VERSION}`,
    { method: "POST", headers: searchHeaders(), body: JSON.stringify({ value: batch }) }
  );
  await ensureOk(response, "Upload documents");

  // A 200 does not mean every document succeeded — the batch reports per-document
  // status, and a partial failure here would otherwise pass silently.
  const body = (await response.json()) as { value: Array<{ key: string; status: boolean; errorMessage?: string }> };
  const failures = body.value.filter((item) => !item.status);
  if (failures.length > 0) {
    throw new Error(
      `${failures.length} document(s) rejected: ` +
        failures.slice(0, 3).map((f) => `${f.key}: ${f.errorMessage}`).join("; ")
    );
  }
}

export async function countDocuments(indexName: string): Promise<number> {
  const response = await fetch(
    `${searchBase()}/indexes/${indexName}/docs/$count?api-version=${SEARCH_API_VERSION}`,
    { headers: searchHeaders() }
  );
  await ensureOk(response, "Count documents");
  return Number((await response.text()).replace(/^﻿/, "").trim());
}

export interface SearchHit {
  id: string;
  docId: string;
  title: string;
  section: string;
  sectionTitle: string;
  category: string;
  content: string;
  sourceUrl: string;
  score: number;
  rerankerScore?: number;
}

/**
 * Hybrid search: BM25 and vector together, re-ranked semantically.
 *
 * All three matter. BM25 catches exact terms a vector misses — "P2", "Error 809",
 * "$0.58". The vector catches paraphrase — "how long before it logs me out"
 * against "session limits". The semantic ranker then reorders the fused set,
 * which is what makes the top three reliably right on a corpus this small.
 */
export async function hybridSearch(
  indexName: string,
  query: string,
  options: { top?: number; category?: string; semanticConfig: string }
): Promise<SearchHit[]> {
  const top = options.top ?? 5;
  const vector = await embedQuery(query);

  const body: Record<string, unknown> = {
    search: query,
    top,
    queryType: "semantic",
    semanticConfiguration: options.semanticConfig,
    select: "id,docId,title,section,sectionTitle,category,content,sourceUrl",
    vectorQueries: [
      {
        kind: "vector",
        vector,
        // Deliberately wider than `top`: the vector arm supplies candidates for
        // the reranker to consider, and starving it narrows what the ranker can
        // choose from.
        k: Math.max(top * 3, 15),
        fields: "contentVector",
      },
    ],
  };

  if (options.category) body.filter = `category eq '${options.category.replace(/'/g, "''")}'`;

  const response = await fetch(
    `${searchBase()}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`,
    { method: "POST", headers: searchHeaders(), body: JSON.stringify(body) }
  );
  await ensureOk(response, "Search");

  const result = (await response.json()) as {
    value: Array<Record<string, unknown> & { "@search.score": number; "@search.rerankerScore"?: number }>;
  };

  return result.value.map((hit) => ({
    id: String(hit.id),
    docId: String(hit.docId),
    title: String(hit.title),
    section: String(hit.section ?? ""),
    sectionTitle: String(hit.sectionTitle ?? ""),
    category: String(hit.category ?? ""),
    content: String(hit.content ?? ""),
    sourceUrl: String(hit.sourceUrl ?? ""),
    score: hit["@search.score"],
    ...(hit["@search.rerankerScore"] !== undefined ? { rerankerScore: hit["@search.rerankerScore"] } : {}),
  }));
}
