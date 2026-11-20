import { aiPaused, clientIp, logCall } from "@/lib/claude";
import { ExtractError, extractFacts } from "@/lib/extract";
import { LIMIT_PER_HOUR, rateLimit } from "@/lib/rate-limit";
import { diffDays, isIsoDate } from "@/lib/rules/dates";

export const maxDuration = 60;

export async function POST(req: Request) {
  const started = Date.now();
  const fail = (status: number, error: string, headers?: HeadersInit) => {
    logCall("extract", status, started, { error });
    return Response.json({ error }, { status, headers });
  };

  if (aiPaused()) return fail(503, "PAUSED");
  const body = await req.json().catch(() => null);
  const story = typeof body?.story === "string" ? body.story.trim() : "";
  const today = body?.today;
  if (story.length < 20) return fail(400, "TOO_SHORT");
  if (story.length > 2000) return fail(400, "TOO_LONG");
  // The client sends its local date; it must be within ±1 day of the server's (time zones).
  const serverToday = new Date().toISOString().slice(0, 10);
  if (typeof today !== "string" || !isIsoDate(today) || Math.abs(diffDays(serverToday, today)) > 1) {
    return fail(400, "BAD_DATE");
  }
  const limited = rateLimit(`extract:${clientIp(req)}`, LIMIT_PER_HOUR);
  if (!limited.ok) return fail(429, "RATE_LIMITED", { "Retry-After": String(limited.retryAfter) });

  try {
    const { facts, dropped, usage } = await extractFacts(story, today);
    logCall("extract", 200, started, { dropped, ...usage });
    return Response.json({ facts, dropped, usage });
  } catch (e) {
    const code = e instanceof ExtractError ? e.code : "MODEL_FAILED";
    logCall("extract", code === "MODEL_REFUSED" ? 422 : 502, started, { error: code, ...(e instanceof ExtractError ? e.usage : {}) });
    return Response.json({ error: code }, { status: code === "MODEL_REFUSED" ? 422 : 502 });
  }
}
