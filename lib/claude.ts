// Server-only. The API key is read from ANTHROPIC_API_KEY and never reaches the browser.
import Anthropic from "@anthropic-ai/sdk";
import { DRAFT_SYSTEM, draftUserMessage } from "./prompts";
import type { Facts, Plan, Step } from "./schema";

export const MODEL = process.env.HAQ_MODEL || "claude-opus-5-5";
export const EFFORT = (process.env.HAQ_EFFORT || "medium") as "low" | "medium" | "high" | "xhigh" | "max";
// Server-side refusal fallback: stories mention fraud and money, so a rare safety false positive
// is re-run on a fallback model inside the same call instead of breaking the demo.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
export const claude = () => (client ??= new Anthropic());

/** Model call 2: confirmed facts + engine output → streamed draft. Used by /api/draft and the sample script. */
export function draftStream(facts: Facts, plan: Plan, step: Step, language: "en" | "hi") {
  return claude().beta.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: EFFORT },
    system: DRAFT_SYSTEM,
    messages: [{ role: "user", content: draftUserMessage(facts, plan, step, language) }],
  });
}

/** DEMO_MODE=true or no key → samples only. */
export const aiPaused = () => process.env.DEMO_MODE === "true" || !process.env.ANTHROPIC_API_KEY;

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/** Logs status, latency and token usage only. Never story text or facts. */
export function logCall(route: string, status: number, startedAt: number, extra: Record<string, string | number> = {}) {
  console.log(JSON.stringify({ route, status, ms: Date.now() - startedAt, ...extra }));
}
