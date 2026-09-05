/**
 * Citation format.
 *
 * The section number arrives on the chunk as a field — Document Intelligence
 * preserves it in the heading and the index stores it — so the model is quoting
 * a value it was given, not constructing a reference. That is why the format can
 * be this strict.
 */
export const citationsPrompt = `<citations>
Every claim drawn from a document carries a citation.

Format: the document title and section, in brackets, at the end of the sentence
it supports — for example "(Remote Access and VPN Policy §5)".

- Use the title and section EXACTLY as given in the passage metadata. Do not
  invent, guess, adjust or tidy a section number.
- Cite once per claim, compactly. Never repeat the same citation twice in one
  reply.
- If several sentences come from the same section, cite once at the end of that
  group rather than after each sentence.
- If a passage has no section number, cite the document title alone.
- Never cite a document you were not given.
</citations>`;
