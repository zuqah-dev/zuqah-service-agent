/**
 * The chat screen.
 *
 * Three things are rendered that a plain chat box would not bother with, each
 * because it makes something invisible visible:
 *
 *   - Tool activity, so the pause before an answer reads as "searching policies"
 *     rather than as the application having hung.
 *   - Citations as clickable chips, so a claim can be traced to its source
 *     without taking the answer on trust.
 *   - A distinct "found nothing" state, so an honest refusal looks deliberate
 *     rather than like a failure.
 */

import { useEffect, useRef, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/auth/auth.server";
import { useChatStream, type ChatMessage } from "~/chat/useChatStream";
import { ACCEPTED_TYPES, filesFromTransfer, prepareImage, type PreparedImage } from "~/chat/images";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  return { firstName: user.name.split(" ")[0] ?? "there" };
}

const SUGGESTIONS = [
  "My VPN keeps dropping every few minutes",
  "How many PTO days do I get and can I carry them over?",
  "What's the expense limit for a client dinner?",
  "How do I request local admin rights?",
];

/** Renders the small subset of Markdown the answers actually use. */
function Answer({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
        const bulleted = /^[-*]\s+(.*)$/.exec(trimmed);
        const body = numbered?.[2] ?? bulleted?.[1] ?? trimmed;

        // Bold and citations are the only inline formatting used.
        const parts = body.split(/(\*\*[^*]+\*\*|\([^)]*§[^)]*\))/g);

        const rendered = parts.map((part, i) => {
          if (/^\*\*[^*]+\*\*$/.test(part)) {
            return (
              <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (/^\([^)]*§[^)]*\)$/.test(part)) {
            return (
              <span key={i} className="text-xs text-slate-500">
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        });

        if (numbered) {
          return (
            <div key={index} className="flex gap-2">
              <span className="shrink-0 font-medium text-slate-400">{numbered[1]}.</span>
              <span>{rendered}</span>
            </div>
          );
        }
        if (bulleted) {
          return (
            <div key={index} className="flex gap-2">
              <span className="shrink-0 text-slate-400">•</span>
              <span>{rendered}</span>
            </div>
          );
        }
        return <p key={index}>{rendered}</p>;
      })}
    </div>
  );
}

function ToolActivity({ message }: { message: ChatMessage }) {
  if (message.tools.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {message.tools.map((tool, index) => {
        const running = tool.status === "started";
        const foundNothing = tool.status === "succeeded" && tool.found === false;

        return (
          <span
            key={index}
            className={
              running
                ? "inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                : foundNothing
                  ? "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                  : "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
            }
          >
            {running ? (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            ) : (
              <span className={foundNothing ? "text-amber-600" : "text-emerald-600"}>
                {foundNothing ? "!" : "✓"}
              </span>
            )}
            {running
              ? "Searching policies…"
              : foundNothing
                ? "No matching policy"
                : `Found ${tool.count} passage${tool.count === 1 ? "" : "s"}`}
          </span>
        );
      })}
    </div>
  );
}

function Citations({ message }: { message: ChatMessage }) {
  if (message.citations.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-200 pt-2.5">
      <p className="mb-1.5 text-xs font-medium text-slate-500">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {message.citations.map((citation) => (
          <a
            key={citation.citation}
            href={citation.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] italic text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
          >
            {citation.citation}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Chat() {
  const { messages, streaming, send, reset } = useChatStream();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [pending, setPending] = useState<PreparedImage[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function attach(files: File[]) {
    // Capped here as well as on the server. The server enforces it; this stops
    // the browser doing pointless work on files that would be dropped anyway.
    const prepared = await Promise.all(files.slice(0, 3).map(prepareImage));
    setPending((current) => [...current, ...prepared.filter((p): p is PreparedImage => p !== null)].slice(0, 3));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = inputRef.current?.value ?? "";
    if (inputRef.current) inputRef.current.value = "";
    const images = pending;
    setPending([]);
    void send(value, images);
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-sm font-medium text-slate-900">Customer Service</h1>
        {messages.length > 0 ? (
          <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-900">
            New conversation
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-6">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="max-w-md text-center">
              <p className="text-sm font-medium text-slate-900">Ask about IT or HR</p>
              <p className="mt-1 text-sm text-slate-500">
                Answers come from Zuqah Technologies policy documents, with the source cited.
              </p>
              <div className="mt-5 space-y-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => void send(suggestion)}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[75%] space-y-2">
                  {message.images?.length ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {message.images.map((image) => (
                        <img
                          key={image.previewUrl}
                          src={image.previewUrl}
                          alt={image.name}
                          className="max-h-48 rounded-lg border border-slate-300"
                        />
                      ))}
                    </div>
                  ) : null}
                  {message.content ? (
                    <div className="rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white">
                      {message.content}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[85%]">
                  <ToolActivity message={message} />

                  {message.notice ? (
                    <div className="mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                      {message.notice}
                    </div>
                  ) : null}

                  {message.error ? (
                    <div className="rounded-2xl rounded-bl-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                      {message.error}
                    </div>
                  ) : message.content ? (
                    <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-slate-800">
                      <Answer text={message.content} />
                      <Citations message={message} />
                    </div>
                  ) : message.pending ? (
                    <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
                      <span className="inline-flex gap-1">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Drop target is the whole composer area, which is more forgiving than a
          small icon — people aim at the text box. */}
      <form
        onSubmit={submit}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void attach(filesFromTransfer(event.dataTransfer.items));
        }}
        className={
          dragging
            ? "mt-4 rounded-lg border-2 border-dashed border-slate-900 bg-slate-50 p-2"
            : "mt-4 rounded-lg border-2 border-dashed border-transparent p-2"
        }
      >
        {pending.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {pending.map((image, index) => (
              <div key={image.previewUrl} className="relative">
                <img
                  src={image.previewUrl}
                  alt={image.name}
                  className="h-16 rounded-md border border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setPending((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Remove ${image.name}`}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-xs text-white hover:bg-slate-700"
                >
                  ×
                </button>
                <span className="mt-0.5 block text-center text-[10px] text-slate-400">
                  {Math.round(image.bytes / 1024)} KB
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex gap-3">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            hidden
            onChange={(event) => {
              void attach(filesFromTransfer(event.target.files));
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={streaming}
            title="Attach a screenshot"
            aria-label="Attach a screenshot"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"
          >
            📎
          </button>

          <input
            ref={inputRef}
            placeholder={pending.length ? "Add a note, or just send the screenshot…" : "Describe the problem, or paste a screenshot…"}
            aria-label="Message"
            disabled={streaming}
            // Paste is the way most people attach a screenshot — Print Screen,
            // then Ctrl+V into the box. Supporting only a file picker would miss
            // the common case entirely.
            onPaste={(event) => {
              const files = filesFromTransfer(event.clipboardData.items);
              if (files.length > 0) {
                event.preventDefault();
                void attach(files);
              }
            }}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none disabled:bg-slate-50"
          />

          <button
            type="submit"
            disabled={streaming}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {streaming ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
