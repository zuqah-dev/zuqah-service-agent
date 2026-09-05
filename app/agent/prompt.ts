/**
 * Assembles the system prompt from its sections.
 *
 * The sections are separate files so that each can be changed, reviewed and
 * reasoned about on its own — a single 300-line string is impossible to edit
 * safely once behaviour depends on it.
 *
 * ORDER MATTERS. Identity first, because everything after is read in its light.
 * Grounding second, because it is the constraint that makes the rest
 * trustworthy. Behaviour before formatting, because how to act outranks how to
 * write. Refusal last, so it is the most recent thing in context when the model
 * is deciding whether to admit a limit — which is exactly the moment it is most
 * tempted not to.
 *
 * The assembled prompt is deliberately free of anything dynamic — no date, no
 * user name, no conversation state. That keeps it byte-identical between turns
 * and therefore cacheable. Per-turn context is appended to the user message
 * instead.
 */

import { citationsPrompt } from "./prompts/citations.prompt";
import { groundingPrompt } from "./prompts/grounding.prompt";
import { identityPrompt } from "./prompts/identity.prompt";
import { outputFormatPrompt } from "./prompts/outputFormat.prompt";
import { refusalPrompt } from "./prompts/refusal.prompt";
import { screenshotsPrompt } from "./prompts/screenshots.prompt";
import { troubleshootFirstPrompt } from "./prompts/troubleshootFirst.prompt";

export interface PromptSection {
  id: string;
  title: string;
  sourcePath: string;
  content: string;
}

export function getPromptSections(): PromptSection[] {
  return [
    {
      id: "identity",
      title: "Identity",
      sourcePath: "app/agent/prompts/identity.prompt.ts",
      content: identityPrompt,
    },
    {
      id: "grounding",
      title: "Grounding",
      sourcePath: "app/agent/prompts/grounding.prompt.ts",
      content: groundingPrompt,
    },
    {
      id: "troubleshoot-first",
      title: "Solving Problems",
      sourcePath: "app/agent/prompts/troubleshootFirst.prompt.ts",
      content: troubleshootFirstPrompt,
    },
    {
      id: "screenshots",
      title: "Screenshots",
      sourcePath: "app/agent/prompts/screenshots.prompt.ts",
      content: screenshotsPrompt,
    },
    {
      id: "citations",
      title: "Citations",
      sourcePath: "app/agent/prompts/citations.prompt.ts",
      content: citationsPrompt,
    },
    {
      id: "answer-style",
      title: "Answer Style",
      sourcePath: "app/agent/prompts/outputFormat.prompt.ts",
      content: outputFormatPrompt,
    },
    {
      id: "refusal",
      title: "Refusal and Scope",
      sourcePath: "app/agent/prompts/refusal.prompt.ts",
      content: refusalPrompt,
    },
  ];
}

export function getSystemPrompt(): string {
  return getPromptSections()
    .map((section) => section.content.trim())
    .join("\n\n");
}
