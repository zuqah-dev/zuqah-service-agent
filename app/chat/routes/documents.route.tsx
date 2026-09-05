/**
 * Serves the source PDF behind a citation.
 *
 * A citation the reader cannot open is a claim they have to take on trust, which
 * defeats the point of citing at all. This is what makes the chips in the chat
 * clickable.
 *
 * The files are served from the image rather than from Blob Storage. For fifteen
 * documents totalling under 100 KB that is simpler, has no credential to manage,
 * and cannot fail independently of the application. Blob Storage becomes the
 * right answer when the corpus is large enough to matter or is updated without a
 * redeploy — neither is true here.
 */

import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/auth/auth.server";

const PDF_DIR = join(process.cwd(), "data", "generated", "pdf");

export async function loader({ request, params }: LoaderFunctionArgs) {
  // Behind auth: the documents are fabricated, but the application should not
  // have an unauthenticated file-serving route regardless of what is in it.
  await requireAuth(request);

  const requested = params.file ?? "";

  // `basename` strips any directory component, so "../../etc/passwd" collapses
  // to "passwd" and then fails the extension check below. The allow-list on the
  // filename shape is the actual guard; basename is defence in depth.
  const name = basename(requested);

  if (!/^[a-z0-9-]+\.pdf$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(join(PDF_DIR, name));
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        // Inline so it opens in the browser's viewer rather than downloading —
        // during a demo, a file landing in the downloads folder is a dead end.
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
