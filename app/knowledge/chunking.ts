/**
 * Split a policy document into citable chunks.
 *
 * The unit of chunking is the section, not a fixed token window. That is a
 * deliberate choice: a citation has to name something a human can find, and
 * "Remote Access and VPN Policy §6.1" is findable in a way that "characters
 * 4,200–5,000" is not.
 *
 * Document Intelligence returns headings with their numbers intact, so the
 * section number is parsed once here and carried on the chunk as a field. Nothing
 * downstream has to recover it from prose.
 *
 * Sections longer than MAX_CHARS are split on paragraph boundaries, with each
 * part keeping the same section number — so a long section produces several
 * chunks that all cite correctly.
 */

/** Above this, a section is split. Roughly 500 tokens of English. */
const MAX_CHARS = 2000;

/** Below this, a fragment is folded into its neighbour rather than left alone. */
const MIN_CHARS = 200;

export interface RawChunk {
  section: string;
  sectionTitle: string;
  content: string;
  ordinal: number;
}

interface Heading {
  level: number;
  section: string;
  title: string;
}

/**
 * Parse a markdown heading into its number and title.
 *
 * "## 6. Common problems"          → { section: "6",   title: "Common problems" }
 * "### 6.1 The connection drops"   → { section: "6.1", title: "The connection drops" }
 * "## Purpose"                     → { section: "",    title: "Purpose" }
 */
function parseHeading(line: string): Heading | null {
  const match = /^(#{1,6})\s+(.*)$/.exec(line.trim());
  if (!match) return null;

  const level = match[1]!.length;
  const rest = match[2]!.trim();

  // A leading "6." or "6.1" or "6.1.2", optionally followed by a full stop.
  const numbered = /^(\d+(?:\.\d+)*)\.?\s+(.*)$/.exec(rest);

  if (numbered) {
    return { level, section: numbered[1]!, title: numbered[2]!.trim() };
  }
  return { level, section: "", title: rest };
}

/**
 * Convert the HTML tables Document Intelligence emits into pipe tables.
 *
 * Left as HTML they carry a lot of markup that is noise to both the embedding
 * and the model reading the passage. Flattening them to plain text would lose the
 * row/column relationship, which for a table of thresholds is the entire content.
 * A pipe table keeps the relationship and costs almost nothing in tokens.
 */
export function normaliseTables(markdown: string): string {
  return markdown.replace(/<table>([\s\S]*?)<\/table>/g, (_full, inner: string) => {
    const rows = [...inner.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((rowMatch) =>
      [...rowMatch[1]!.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((cell) =>
        cell[1]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      )
    );

    if (rows.length === 0) return "";

    const lines = rows.map((cells) => `| ${cells.join(" | ")} |`);
    // A separator after the first row keeps it readable as a table rather than
    // as a run of pipes.
    if (rows.length > 1) {
      lines.splice(1, 0, `| ${rows[0]!.map(() => "---").join(" | ")} |`);
    }
    return `\n${lines.join("\n")}\n`;
  });
}

/** Split an over-long section on paragraph boundaries. */
function splitLongSection(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const parts: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    // A single paragraph over the limit is kept whole rather than cut mid-sentence.
    // Splitting prose to hit a character count damages the passage more than an
    // oversized chunk does.
    if (current && current.length + paragraph.length > MAX_CHARS) {
      parts.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Chunk a document.
 *
 * @param markdown Output of Document Intelligence, or the source Markdown.
 */
export function chunkDocument(markdown: string): RawChunk[] {
  const normalised = normaliseTables(markdown);
  const lines = normalised.split("\n");

  // Accumulated sections, before splitting for length.
  const sections: Array<{ section: string; sectionTitle: string; body: string[] }> = [];
  let current: (typeof sections)[number] | null = null;

  for (const line of lines) {
    const heading = parseHeading(line);

    // The document title (level 1) opens the preamble rather than a section of
    // its own — there is rarely anything under it worth citing separately.
    if (heading && heading.level === 1) {
      current = { section: "", sectionTitle: heading.title, body: [] };
      sections.push(current);
      continue;
    }

    if (heading) {
      current = { section: heading.section, sectionTitle: heading.title, body: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { section: "", sectionTitle: "Preamble", body: [] };
      sections.push(current);
    }
    current.body.push(line);
  }

  const chunks: RawChunk[] = [];
  let ordinal = 0;

  for (const entry of sections) {
    const body = entry.body.join("\n").trim();
    if (!body) continue;

    // Prefixing the heading means the passage reads as self-contained when the
    // model sees it in isolation, and gives the embedding the section's own
    // vocabulary rather than only the prose beneath it.
    const label = entry.section ? `${entry.section} ${entry.sectionTitle}` : entry.sectionTitle;

    const parts = body.length > MAX_CHARS ? splitLongSection(body) : [body];

    for (const part of parts) {
      // A stub too short to stand alone is appended to the previous chunk rather
      // than indexed as its own near-empty passage.
      if (part.length < MIN_CHARS && chunks.length > 0) {
        chunks[chunks.length - 1]!.content += `\n\n${part}`;
        continue;
      }

      chunks.push({
        section: entry.section,
        sectionTitle: entry.sectionTitle,
        content: `## ${label}\n\n${part}`,
        ordinal: ordinal++,
      });
    }
  }

  return chunks;
}

/** Human-readable citation for a chunk, e.g. "Remote Access and VPN Policy §6.1". */
export function citationFor(title: string, section: string): string {
  return section ? `${title} §${section}` : title;
}
