import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/extract", () => ({
  ExtractError: class extends Error {},
  extractFacts: vi.fn(async () => ({ facts: {}, dropped: 0, proposed: 0, usage: { inputTokens: 1, outputTokens: 1 } })),
}));

const today = new Date().toISOString().slice(0, 10);
const post = async (body: unknown, ip = "1.2.3.4") => {
  const { POST } = await import("@/app/api/extract/route");
  return POST(new Request("http://x/api/extract", { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": ip } }));
};
const story = "My UPI payment of 5000 failed on 3 Nov and never reached my friend.";

describe("/api/extract", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test");
    vi.stubEnv("DEMO_MODE", "false");
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => vi.unstubAllEnvs());

  it("400 TOO_SHORT / TOO_LONG / BAD_DATE", async () => {
    expect(await (await post({ story: "too short", today })).json()).toEqual({ error: "TOO_SHORT" });
    expect((await post({ story: "x".repeat(2001), today })).status).toBe(400);
    expect(await (await post({ story, today: "2020-01-01" })).json()).toEqual({ error: "BAD_DATE" });
  });

  it("503 PAUSED in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect((await post({ story, today })).status).toBe(503);
  });

  it("200 with facts, then 429 with Retry-After after 10 calls from one IP", async () => {
    for (let i = 0; i < 10; i++) expect((await post({ story, today }, "9.9.9.9")).status).toBe(200);
    const r = await post({ story, today }, "9.9.9.9");
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("never logs the story", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await post({ story, today }, "8.8.8.8");
    expect(JSON.stringify(log.mock.calls)).not.toContain("UPI payment");
  });
});
