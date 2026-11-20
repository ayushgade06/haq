import { z } from "zod";
import { aiPaused, clientIp, draftStream, logCall } from "@/lib/claude";
import { DRAFT_FAILED } from "@/lib/draft";
import { LIMIT_PER_HOUR, rateLimit } from "@/lib/rate-limit";
import { planCase } from "@/lib/rules";
import { diffDays, isIsoDate } from "@/lib/rules/dates";
import { FactsSchema } from "@/lib/schema";

export const maxDuration = 60;

// No free-text story: only confirmed facts. The server re-runs planCase itself, so the figures and
// rules the draft cites come from the engine, not from the client.
const Body = z.object({
  facts: FactsSchema,
  stepId: z.string().max(40),
  language: z.enum(["en", "hi"]).default("en"),
  today: z.string().refine(isIsoDate),
});

export async function POST(req: Request) {
  const started = Date.now();
  const fail = (status: number, error: string, headers?: HeadersInit) => {
    logCall("draft", status, started, { error });
    return Response.json({ error }, { status, headers });
  };

  if (aiPaused()) return fail(503, "PAUSED");
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "BAD_REQUEST");
  const { facts, stepId, language, today } = body.data;
  // Samples are planned "as of" their fixed date, so a past date is fine; a future one isn't.
  if (diffDays(new Date().toISOString().slice(0, 10), today) > 1) return fail(400, "BAD_DATE");
  const plan = planCase(facts, today);
  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) return fail(400, "BAD_STEP");
  const limited = rateLimit(`draft:${clientIp(req)}`, LIMIT_PER_HOUR * 2);
  if (!limited.ok) return fail(429, "RATE_LIMITED", { "Retry-After": String(limited.retryAfter) });

  const stream = draftStream(facts, plan, step, language);

  const enc = new TextEncoder();
  const body$ = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") controller.enqueue(enc.encode(ev.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(enc.encode(`\n${DRAFT_FAILED}`));
        logCall("draft", final.stop_reason === "refusal" ? 422 : 200, started, {
          stop: final.stop_reason ?? "",
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
        });
      } catch {
        controller.enqueue(enc.encode(`\n${DRAFT_FAILED}`)); // client falls back to the static template
        logCall("draft", 502, started, { error: "MODEL_FAILED" });
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(body$, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
