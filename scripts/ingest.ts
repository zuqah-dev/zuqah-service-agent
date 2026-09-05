/**
 * Build the knowledge base index from the generated PDFs.
 *
 *   bun run scripts/ingest.ts            incremental — updates chunks in place
 *   bun run scripts/ingest.ts --recreate drops the index first
 *
 * The pipeline, in order:
 *
 *   PDF  →  Document Intelligence  →  Markdown with headings intact
 *        →  chunk on section boundaries
 *        →  embed with text-embedding-3-large
 *        →  Azure AI Search
 *
 * Ids are deterministic (`docId--ordinal`), so re-running updates existing chunks
 * rather than duplicating them. That makes this safe to run repeatedly while
 * tuning, which is the point.
 *
 * The PDFs are the input rather than the Markdown sources deliberately — see
 * docs/phases/phase-2-knowledge-base.md. Indexing the Markdown directly would be
 * easier and would make Document Intelligence decorative.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { analyzeDocument, embedBatch, putIndex, deleteIndex, uploadDocuments, countDocuments } from "~/knowledge/azureClients";
import { chunkDocument } from "~/knowledge/chunking";
import { indexDefinition, type PolicyChunk } from "~/knowledge/index.schema";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PDF_DIR = join(ROOT, "data", "generated", "pdf");
const SOURCE_DIR = join(ROOT, "data", "policies");

/** Embedding requests are batched; 16 keeps each request well inside the token limit. */
const EMBED_BATCH_SIZE = 16;

/**
 * Read title and category from the Markdown front matter.
 *
 * These could be inferred from the parsed PDF, but the front matter is the
 * source of truth and inference would be guessing at something already known.
 */
async function readMetadata(): Promise<Map<string, { title: string; category: string }>> {
  const metadata = new Map<string, { title: string; category: string }>();

  for (const file of await readdir(SOURCE_DIR)) {
    if (!file.endsWith(".md")) continue;

    const text = await readFile(join(SOURCE_DIR, file), "utf-8");
    const front = /^---\n([\s\S]*?)\n---/.exec(text);
    if (!front) continue;

    const read = (key: string) => new RegExp(`^${key}:\\s*(.+)$`, "m").exec(front[1]!)?.[1]?.trim().replace(/^"|"$/g, "");

    const id = read("id");
    if (!id) continue;

    metadata.set(id, { title: read("title") ?? id, category: read("category") ?? "General" });
  }

  return metadata;
}

async function main(): Promise<number> {
  const indexName = process.env.AZURE_SEARCH_INDEX ?? "zuqah-policies";
  const recreate = process.argv.includes("--recreate");

  const metadata = await readMetadata();
  const pdfs = (await readdir(PDF_DIR)).filter((f) => f.endsWith(".pdf")).sort();

  if (pdfs.length === 0) {
    console.error(`No PDFs in ${PDF_DIR}. Run: python scripts/build_documents.py`);
    return 1;
  }

  console.log(`Ingesting ${pdfs.length} document(s) into "${indexName}"\n`);

  if (recreate) {
    console.log("  dropping existing index");
    await deleteIndex(indexName);
  }
  await putIndex(indexDefinition(indexName));
  console.log("  index definition applied\n");

  let totalChunks = 0;

  for (const file of pdfs) {
    const docId = file.replace(/\.pdf$/, "");
    const meta = metadata.get(docId) ?? { title: docId, category: "General" };
    const started = Date.now();

    const bytes = new Uint8Array(await readFile(join(PDF_DIR, file)));
    const markdown = await analyzeDocument(bytes, "application/pdf");
    const rawChunks = chunkDocument(markdown);

    // Embedded in batches; the vector is computed over exactly the text that is
    // stored, so what is searched and what is shown cannot drift apart.
    const vectors: number[][] = [];
    for (let i = 0; i < rawChunks.length; i += EMBED_BATCH_SIZE) {
      const batch = rawChunks.slice(i, i + EMBED_BATCH_SIZE).map((c) => c.content);
      vectors.push(...(await embedBatch(batch)));
    }

    const documents: PolicyChunk[] = rawChunks.map((chunk, i) => ({
      id: `${docId}--${chunk.ordinal}`,
      docId,
      title: meta.title,
      section: chunk.section,
      sectionTitle: chunk.sectionTitle,
      category: meta.category,
      content: chunk.content,
      sourceUrl: `/documents/${docId}.pdf`,
      ordinal: chunk.ordinal,
      contentVector: vectors[i]!,
    }));

    await uploadDocuments(indexName, documents);
    totalChunks += documents.length;

    const sections = new Set(rawChunks.map((c) => c.section).filter(Boolean)).size;
    console.log(
      `  ${docId.padEnd(34)} ${String(documents.length).padStart(3)} chunks  ` +
        `${String(sections).padStart(2)} sections  ${((Date.now() - started) / 1000).toFixed(1)}s`
    );
  }

  // The index is eventually consistent, so a count taken immediately can lag.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const indexed = await countDocuments(indexName);

  console.log(`\n${totalChunks} chunks uploaded; index reports ${indexed} document(s).`);

  if (indexed < totalChunks) {
    console.log("Count is lower than uploaded — indexing may still be settling. Re-check in a moment.");
  }

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("\nIngestion failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
