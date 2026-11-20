// Model call 1: story → facts. Structured output, one schema retry, refusal handling, then evidence verification.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { claude, EFFORT, FALLBACK_BETA, MODEL } from "./claude";
import { EXTRACT_SYSTEM, extractUserMessage } from "./prompts";
import type { ExtractedFacts } from "./schema";
import { verifyFacts } from "./verify";

// The model returns a flat list (no nullable unions); code validates each value. No field for full
// account or card numbers exists.
const FACT_NAMES = [
  "entityName",
  "entityType",
  "txnType",
  "problem",
  "amountInr",
  "txnDate",
  "complainedToEntity",
  "complaintMode",
  "complaintDate",
  "entityResponse",
  "entityResponseDate",
  "reversed",
  "reversedDate",
  "accountType",
] as const;

const RawExtractionSchema = z.object({
  issueSummary: z.string(),
  facts: z.array(z.object({ name: z.enum(FACT_NAMES), value: z.string(), evidence: z.string(), estimated: z.boolean() })),
});

export type Usage = { inputTokens: number; outputTokens: number };
export type Extraction = { facts: ExtractedFacts; dropped: number; proposed: number; usage: Usage };

export class ExtractError extends Error {
  constructor(
    readonly code: "MODEL_FAILED" | "MODEL_REFUSED",
    readonly usage: Usage,
  ) {
    super(code);
  }
}

export async function extractFacts(story: string, today: string): Promise<Extraction> {
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  let problem: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    let msg;
    try {
      msg = await claude().beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        output_config: { effort: EFFORT, format: betaZodOutputFormat(RawExtractionSchema) },
        system: EXTRACT_SYSTEM,
        messages: [{ role: "user", content: extractUserMessage(story, today, problem) }],
      });
    } catch (e) {
      if (e instanceof Anthropic.APIError) throw new ExtractError("MODEL_FAILED", usage); // the SDK already retried
      problem = e instanceof Error ? e.message.slice(0, 300) : "invalid JSON"; // schema/JSON miss → one retry
      continue;
    }
    usage.inputTokens += msg.usage.input_tokens;
    usage.outputTokens += msg.usage.output_tokens;
    // Check stop_reason before reading content.
    if (msg.stop_reason === "refusal") throw new ExtractError("MODEL_REFUSED", usage);
    if (msg.stop_reason === "max_tokens" || !msg.parsed_output) {
      problem = msg.stop_reason === "max_tokens" ? "it was cut off; be concise" : "it didn't match the schema";
      continue;
    }
    const out = msg.parsed_output;
    return { ...verifyFacts(out, story, today), proposed: out.facts.length, usage };
  }
  throw new ExtractError("MODEL_FAILED", usage);
}
