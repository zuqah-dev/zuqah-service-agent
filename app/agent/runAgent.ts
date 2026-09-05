/**
 * The agent loop: chat completions with tool calling.
 *
 * WHY THIS EXISTS ALONGSIDE THE FOUNDRY AGENT
 * The knowledge agent is registered in Azure AI Foundry so it can be opened in
 * the portal during the demo (ADR-0002). That registration is blocked on a role
 * assignment we do not yet have — the Foundry agents API is Entra-only and
 * refuses keys (ADR-0007).
 *
 * The behaviour, though, is entirely determined by the system prompt and the
 * search tool, both of which are shared. So this runner exercises exactly the
 * behaviour the Foundry Agent will have, using an endpoint that works with a key
 * today. It is not a stand-in that will be thrown away: it stays as the
 * fast path for behavioural tests, which should not need a network round trip
 * through an agent service to check that a refusal is still a refusal.
 */

import { getSystemPrompt } from "./prompt";
import { runSearchPolicies, searchPoliciesTool } from "./searchTool";

const OPENAI_API_VERSION = "2024-10-21";

/** Beyond this the model is looping rather than working. */
const MAX_TOOL_ROUNDS = 4;

/**
 * A message as the API expects it.
 *
 * `content` is a plain string for everything except a user turn carrying images,
 * where it becomes an array of parts. Both shapes are accepted by the API; the
 * array form is only used when it is needed.
 */
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[] | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

/** An image the employee attached, already base64-encoded by the browser. */
export interface Attachment {
  mimeType: string;
  /** Raw base64, no data: prefix. */
  data: string;
}

/**
 * Used when a turn carries an image but no question.
 *
 * Without it the model receives a bare screenshot and has to guess what is being
 * asked, which in practice produces a description rather than a diagnosis. Often
 * the screenshot IS the question, so this states that explicitly.
 */
const IMAGE_ONLY_PROMPT =
  "The employee attached this screenshot without a question. Read any error text " +
  "in it, explain what the problem is in plain language, and give the steps to fix it.";

/**
 * Build the user turn.
 *
 * Images are placed BEFORE the text. A question like "what does this mean?" has
 * to resolve against the image, and a model reads the parts in order — putting
 * the text first leaves it briefly ungrounded.
 */
function buildUserContent(text: string, attachments: Attachment[]): string | ContentPart[] {
  if (attachments.length === 0) return text;

  return [
    ...attachments.map(
      (attachment): ContentPart => ({
        type: "image_url",
        image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` },
      })
    ),
    { type: "text", text: text || IMAGE_ONLY_PROMPT },
  ];
}

export interface AgentTurn {
  answer: string;
  /** Every search the model ran, in order — used by the behavioural tests. */
  searches: Array<{ query: string; found: boolean; citations: string[] }>;
  /** Distinct citations offered across the turn. */
  citations: string[];
  toolRounds: number;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function callModel(messages: ChatMessage[]): Promise<{
  content: string | null;
  toolCalls: NonNullable<ChatMessage["tool_calls"]>;
}> {
  const endpoint = required("AZURE_OPENAI_ENDPOINT").replace(/\/$/, "");
  const deployment = required("AZURE_OPENAI_AGENT_MODEL");
  const key = required("AZURE_FOUNDRY_API_KEY");

  // Rate limiting and transient server errors are normal against a shared
  // deployment, and they surfaced as intermittent test failures that looked like
  // model misbehaviour. Retried with backoff; a content filter rejection is NOT
  // retried, because it is a deliberate decision that will not change.
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }

    const response = await fetch(
      `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${OPENAI_API_VERSION}`,
      {
        method: "POST",
        headers: { "api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          tools: [searchPoliciesTool],
          tool_choice: "auto",
          max_completion_tokens: 1200,
        }),
      }
    );

    if (response.ok) {
      const body = (await response.json()) as {
        choices: Array<{ message: { content: string | null; tool_calls?: ChatMessage["tool_calls"] } }>;
      };
      const message = body.choices[0]?.message;
      return { content: message?.content ?? null, toolCalls: message?.tool_calls ?? [] };
    }

    const detail = await response.text().catch(() => "");
    lastError = new Error(`Chat completion failed: ${response.status}\n${detail.slice(0, 600)}`);

    const retriable = response.status === 429 || response.status >= 500;
    if (!retriable) throw lastError;
  }

  throw lastError ?? new Error("Chat completion failed after retries");
}

/**
 * Progress callbacks, so the UI can show tool activity while it happens.
 *
 * The model returns its answer in one piece, so without these the user watches a
 * spinner for the whole turn. Surfacing "Searching policies…" is most of the
 * perceived responsiveness.
 */
export interface TurnObserver {
  onToolStart?: (name: string, query: string) => void;
  onToolEnd?: (name: string, found: boolean, count: number) => void;
  onCitations?: (citations: Array<{ citation: string; sourceUrl: string }>) => void;
}

/** Run one turn, reporting progress as it goes. */
export async function streamAgentTurn(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  observer: TurnObserver = {},
  attachments: Attachment[] = []
): Promise<AgentTurn> {
  return runAgentTurn(userMessage, history, observer, attachments);
}

/**
 * Run one turn.
 *
 * @param userMessage What the employee said.
 * @param history     Prior turns, oldest first. Omitted for single-turn tests.
 * @param observer    Optional progress callbacks.
 */
export async function runAgentTurn(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  observer: TurnObserver = {},
  attachments: Attachment[] = []
): Promise<AgentTurn> {
  const messages: ChatMessage[] = [
    { role: "system", content: getSystemPrompt() },
    ...history.map((h) => ({ role: h.role, content: h.content }) as ChatMessage),
    { role: "user", content: buildUserContent(userMessage, attachments) },
  ];

  const searches: AgentTurn["searches"] = [];
  const citations = new Set<string>();

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const { content, toolCalls } = await callModel(messages);

    if (toolCalls.length === 0) {
      return {
        answer: content ?? "",
        searches,
        citations: [...citations],
        toolRounds: round,
      };
    }

    messages.push({ role: "assistant", content, tool_calls: toolCalls });

    for (const call of toolCalls) {
      if (call.function.name !== "search_policies") {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: `Unknown tool: ${call.function.name}` }),
        });
        continue;
      }

      // The model produced these arguments, so parsing them is a place a turn
      // can die. A malformed call is reported back to the model as a tool result
      // rather than thrown, which lets it correct itself.
      let args: { query: string; category?: string };
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: "Arguments were not valid JSON. Retry with a plain query string." }),
        });
        continue;
      }

      observer.onToolStart?.("search_policies", args.query);

      const result = await runSearchPolicies(args);
      const found = result.passages.map((p) => p.citation);
      found.forEach((c) => citations.add(c));
      searches.push({ query: args.query, found: result.found, citations: found });

      observer.onToolEnd?.("search_policies", result.found, result.passages.length);

      if (result.passages.length > 0) {
        // Deduplicated by citation: several chunks from the same section should
        // appear once in the UI, not once per chunk.
        const seen = new Set<string>();
        const unique = result.passages.filter((p) => {
          if (seen.has(p.citation)) return false;
          seen.add(p.citation);
          return true;
        });
        observer.onCitations?.(unique.map((p) => ({ citation: p.citation, sourceUrl: p.sourceUrl })));
      }

      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  // The loop ran out. Returning what we have beats returning nothing, and the
  // round count makes the situation visible to whoever is looking.
  return {
    answer: "I was unable to complete that. Please try rephrasing, or contact the Service Desk.",
    searches,
    citations: [...citations],
    toolRounds: MAX_TOOL_ROUNDS + 1,
  };
}
