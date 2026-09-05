/**
 * Consumes the SSE response from /api/chat.
 *
 * `fetch` with a ReadableStream rather than EventSource, because EventSource is
 * GET-only and cannot carry a body — and the message has to be POSTed.
 *
 * The `await reader.read()` loop is the backpressure valve: the next chunk is
 * not pulled until the current one has been parsed and dispatched, so a slow
 * render slows reading rather than queueing unboundedly in memory.
 */

import { useCallback, useRef, useState } from "react";
import type { PreparedImage } from "./images";

export interface Citation {
  citation: string;
  sourceUrl: string;
}

export interface ToolEvent {
  name: string;
  status: "started" | "succeeded";
  query?: string;
  found?: boolean;
  count?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  tools: ToolEvent[];
  /** Thumbnails shown in the user's own bubble. */
  images?: Array<{ previewUrl: string; name: string }>;
  /** Non-fatal information, e.g. an attachment that was ignored. */
  notice?: string;
  error?: string;
  pending?: boolean;
}

type Frame =
  | { type: "token"; value: string }
  | { type: "tool"; name: string; status: "started" | "succeeded"; query?: string; found?: boolean; count?: number }
  | { type: "citations"; citations: Citation[] }
  | { type: "done" }
  | { type: "notice"; message: string }
  | { type: "error"; message: string };

const uid = () => crypto.randomUUID();

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const patch = useCallback((id: string, fn: (m: ChatMessage) => ChatMessage) => {
    setMessages((current) => current.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const send = useCallback(
    async (text: string, images: PreparedImage[] = []) => {
      const trimmed = text.trim();
      // An image on its own is a valid turn — often the screenshot IS the question.
      if ((!trimmed && images.length === 0) || streaming) return;

      const assistantId = uid();

      // Optimistic: both bubbles appear immediately, so the interface never
      // looks frozen while the first frame is in flight.
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "user",
          content: trimmed,
          citations: [],
          tools: [],
          ...(images.length
            ? { images: images.map((i) => ({ previewUrl: i.previewUrl, name: i.name })) }
            : {}),
        },
        { id: assistantId, role: "assistant", content: "", citations: [], tools: [], pending: true },
      ]);
      setStreaming(true);

      // The history sent is the state before this turn, which is why it is read
      // from the setter rather than from `messages` — that closure is stale.
      let history: Array<{ role: "user" | "assistant"; content: string }> = [];
      setMessages((current) => {
        history = current
          .filter((m) => !m.pending && m.content)
          .map((m) => ({ role: m.role, content: m.content }));
        return current;
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: history.slice(0, -1),
            attachments: images.map((i) => ({ mimeType: i.mimeType, data: i.data })),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // CRLF is normalised first. Per the SSE spec a line may end with CRLF,
          // and splitting on "\n\n" alone would then never match a frame.
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, "\n");

          const records = buffer.split("\n\n");
          buffer = records.pop() ?? "";

          for (const record of records) {
            const line = record.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;

            let frame: Frame;
            try {
              frame = JSON.parse(line.slice(5).trim()) as Frame;
            } catch {
              continue; // skip a malformed frame rather than tearing down the stream
            }

            switch (frame.type) {
              case "token":
                patch(assistantId, (m) => ({ ...m, content: m.content + frame.value }));
                break;
              case "tool":
                patch(assistantId, (m) => {
                  const existing = m.tools.findIndex((t) => t.name === frame.name);
                  const event: ToolEvent = {
                    name: frame.name,
                    status: frame.status,
                    ...(frame.query !== undefined ? { query: frame.query } : {}),
                    ...(frame.found !== undefined ? { found: frame.found } : {}),
                    ...(frame.count !== undefined ? { count: frame.count } : {}),
                  };
                  const tools =
                    existing >= 0
                      ? m.tools.map((t, i) => (i === existing ? { ...t, ...event } : t))
                      : [...m.tools, event];
                  return { ...m, tools };
                });
                break;
              case "citations":
                patch(assistantId, (m) => ({ ...m, citations: frame.citations }));
                break;
              case "notice":
                patch(assistantId, (m) => ({ ...m, notice: frame.message }));
                break;
              case "error":
                patch(assistantId, (m) => ({ ...m, error: frame.message, pending: false }));
                break;
              case "done":
                patch(assistantId, (m) => ({ ...m, pending: false }));
                break;
            }
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          patch(assistantId, (m) => ({
            ...m,
            pending: false,
            error: error instanceof Error ? error.message : "Something went wrong",
          }));
        }
      } finally {
        patch(assistantId, (m) => ({ ...m, pending: false }));
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [patch, streaming]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => setMessages([]), []);

  return { messages, streaming, send, stop, reset };
}
