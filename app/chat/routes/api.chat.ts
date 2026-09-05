/**
 * The chat endpoint. Runs one agent turn and streams it as Server-Sent Events.
 *
 * Frames the browser can act on:
 *
 *   {"type":"tool","name":"search_policies","status":"started"}
 *   {"type":"tool","name":"search_policies","status":"succeeded","found":true}
 *   {"type":"citations","citations":[{...}]}
 *   {"type":"token","value":"..."}
 *   {"type":"done"}
 *   {"type":"error","message":"..."}
 *
 * Tool frames are emitted BEFORE the answer arrives, which is the point: the
 * user sees "Searching policies…" while it happens rather than a spinner and
 * then a wall of text. On a turn that searches, the wait is a couple of seconds
 * and it should be legible.
 *
 * IDENTITY: the caller is resolved here, from the session, and never reaches the
 * model. See docs/decisions/0006-identity-never-in-tool-schema.md.
 */

import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/auth/auth.server";
import { streamAgentTurn, type Attachment } from "~/agent/runAgent";

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
  attachments?: unknown;
}

/** Only formats the vision model accepts. */
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Cap on a single decoded image, in bytes.
 *
 * The client downscales before uploading, so this is a backstop rather than the
 * working limit. Its job is to stop a hand-crafted request putting an
 * unbounded payload through the model.
 */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const MAX_ATTACHMENTS = 3;

/**
 * Validate attachments from the browser.
 *
 * Everything here arrives from the client, so the mime type is checked against an
 * allow-list rather than trusted, the base64 is checked for shape, and the
 * decoded size is bounded. A bad attachment is dropped rather than failing the
 * whole turn — the text is usually still answerable.
 */
function parseAttachments(raw: unknown): { attachments: Attachment[]; rejected: number } {
  if (!Array.isArray(raw)) return { attachments: [], rejected: 0 };

  const attachments: Attachment[] = [];
  let rejected = 0;

  for (const item of raw.slice(0, MAX_ATTACHMENTS)) {
    if (typeof item !== "object" || item === null) {
      rejected++;
      continue;
    }

    const mimeType = (item as { mimeType?: unknown }).mimeType;
    const data = (item as { data?: unknown }).data;

    if (typeof mimeType !== "string" || !ALLOWED_IMAGE_TYPES.has(mimeType)) {
      rejected++;
      continue;
    }
    if (typeof data !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      rejected++;
      continue;
    }

    // base64 encodes 3 bytes as 4 characters.
    if ((data.length * 3) / 4 > MAX_IMAGE_BYTES) {
      rejected++;
      continue;
    }

    attachments.push({ mimeType, data });
  }

  return { attachments, rejected };
}

function frame(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function action({ request }: ActionFunctionArgs) {
  // Declared first so an unauthenticated request is rejected before any work.
  const user = await requireAuth(request);

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Body was not valid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const { attachments, rejected } = parseAttachments(body.attachments);

  // An image on its own is a valid turn — often the screenshot IS the question.
  if (!message && attachments.length === 0) {
    return Response.json({ error: "message or attachment is required" }, { status: 400 });
  }

  if (rejected > 0) {
    console.warn(`[chat] dropped ${rejected} invalid attachment(s) from ${user.email}`);
  }

  // History arrives from the client, so it is validated rather than trusted, and
  // bounded — an unbounded history is both a cost and a context-window problem.
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is { role: "user" | "assistant"; content: string } =>
            typeof item === "object" &&
            item !== null &&
            (("role" in item && (item as { role: unknown }).role === "user") ||
              (item as { role: unknown }).role === "assistant") &&
            typeof (item as { content: unknown }).content === "string"
        )
        .slice(-10)
    : [];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(frame(payload)));
      };

      const started = Date.now();

      try {
        if (rejected > 0) {
          send({
            type: "notice",
            message: `${rejected} attachment${rejected === 1 ? " was" : "s were"} not a supported image and ${rejected === 1 ? "was" : "were"} ignored.`,
          });
        }

        const turn = await streamAgentTurn(
          message,
          history,
          {
            onToolStart: (name, query) => send({ type: "tool", name, status: "started", query }),
            onToolEnd: (name, found, count) =>
              send({ type: "tool", name, status: "succeeded", found, count }),
            onCitations: (citations) => send({ type: "citations", citations }),
          },
          attachments
        );

        // The model returns the answer in one piece. It is chunked here so the
        // reply renders progressively rather than appearing all at once — the
        // wait is what a user experiences, not the transport.
        const words = turn.answer.split(/(\s+)/);
        for (let i = 0; i < words.length; i += 3) {
          send({ type: "token", value: words.slice(i, i + 3).join("") });
          await new Promise((resolve) => setTimeout(resolve, 12));
        }

        // An empty answer with no error is still a failure, and would otherwise
        // render as an empty bubble with nothing to explain it.
        if (!turn.answer.trim()) {
          send({
            type: "error",
            message: "The assistant produced no answer. Check the server logs.",
          });
        }

        console.info(
          `[chat] user=${user.email} images=${attachments.length} ` +
            `searches=${turn.searches.length} citations=${turn.citations.length} ` +
            `ms=${Date.now() - started}`
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error("[chat] turn failed", detail);

        // Azure Content Safety rejecting the prompt is a decision, not a fault,
        // and deserves a comprehensible message rather than a stack trace.
        const blocked = /content_filter|ResponsibleAIPolicyViolation|jailbreak/i.test(detail);

        send({
          type: "error",
          message: blocked
            ? "That request was blocked by Azure Content Safety before it reached the assistant."
            : "Something went wrong handling that. Please try again.",
        });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // App Service buffers responses without this, which defeats streaming
      // entirely — the whole reply arrives at once, at the end.
      "X-Accel-Buffering": "no",
    },
  });
}
