// ponytail: in-memory, per server instance, resets on cold start. The Anthropic Console spend limit is the
// real guard; add a Vercel WAF rate-limit rule (or Redis) if this is ever abused.
const HOUR_MS = 3_600_000;
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, now = Date.now()): { ok: true } | { ok: false; retryAfter: number } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < HOUR_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.ceil((recent[0] + HOUR_MS - now) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true };
}

export const LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR) || 10;
