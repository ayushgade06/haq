// npm run eval → runs the real extraction on every story in evals/stories, scores EVAL-1..4,
// writes evals/RESULTS.md and evals/results.json (read by /how-it-works). Costs ≈ $0.02 per story.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { extractFacts } from "@/lib/extract";
import { planCase } from "@/lib/rules";
import { splitExtracted, type FactKey, type Facts, type Status, type Track } from "@/lib/schema";
import { normalise } from "@/lib/verify";

try {
  process.loadEnvFile(".env.local");
} catch {}

type Story = {
  id: string;
  lang: string;
  today: string;
  story: string;
  expected: Facts;
  track: Track;
  currentStatus: Status | null;
  deliberatelyMissing: FactKey[];
};

const GROUPS: Record<string, FactKey[]> = {
  "Entity & transaction type": ["entityType", "txnType", "problem"],
  "Dates & amounts": ["amountInr", "txnDate", "complaintDate"],
  "Complaint in writing?": ["complaintMode"],
};
const THRESHOLDS: Record<string, number> = { "Entity & transaction type": 0.9, "Dates & amounts": 0.85 };
const PRICE_IN = 4 / 1e6;
const PRICE_OUT = 20 / 1e6;

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

test("eval", async () => {
  const dir = "evals/stories";
  const stories: Story[] = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));

  const runs = await pool(stories, 4, async (s) => {
    const t0 = Date.now();
    try {
      const x = await extractFacts(s.story, s.today);
      return { s, x, ms: Date.now() - t0, error: null as string | null };
    } catch (e) {
      return { s, x: null, ms: Date.now() - t0, error: e instanceof Error ? e.message : "error" };
    }
  });

  const rows = runs.map(({ s, x, ms, error }) => {
    const got = x ? splitExtracted(x.facts).facts : null;
    const field = (k: FactKey) => got !== null && JSON.stringify(got[k]) === JSON.stringify(s.expected[k]);
    const plan = got ? planCase(got, s.today) : null;
    const status = plan?.steps.find((st) => st.id === plan.currentStepId)?.status ?? null;
    const endToEnd = plan !== null && plan.track === s.track && status === s.currentStatus;
    // EVAL-2: after verification, every shown fact must quote the story.
    const unverifiable = x
      ? Object.values(x.facts).filter((f) => f && f.evidence !== null && !normalise(s.story).includes(normalise(f.evidence))).length
      : 0;
    const misses = (Object.keys(s.expected) as FactKey[])
      .filter((k) => k !== "issueSummary" && !field(k))
      .map((k) => `${k}: expected ${JSON.stringify(s.expected[k])}, got ${got ? JSON.stringify(got[k]) : "—"}`);
    return { s, x, ms, error, field, plan, status, endToEnd, unverifiable, misses };
  });

  const n = rows.length;
  const acc = (keys: FactKey[]) => rows.reduce((a, r) => a + keys.filter((k) => r.field(k)).length, 0) / (n * keys.length);
  const groups = Object.entries(GROUPS).map(([name, keys]) => ({
    name,
    fields: keys.join(", "),
    score: acc(keys),
    threshold: THRESHOLDS[name] ?? null,
  }));
  const perField = (Object.keys(rows[0].s.expected) as FactKey[])
    .filter((k) => k !== "issueSummary")
    .map((k) => ({ field: k, score: acc([k]) }));
  const missingRows = rows.filter((r) => r.s.deliberatelyMissing.length);
  const missingTotal = missingRows.reduce((a, r) => a + r.s.deliberatelyMissing.length, 0);
  const missingNull = missingRows.reduce((a, r) => a + r.s.deliberatelyMissing.filter((k) => r.x && r.x.facts[k] === null).length, 0);
  const proposed = rows.reduce((a, r) => a + (r.x?.proposed ?? 0), 0);
  const dropped = rows.reduce((a, r) => a + (r.x?.dropped ?? 0), 0);
  const tokensIn = rows.reduce((a, r) => a + (r.x?.usage.inputTokens ?? 0), 0);
  const tokensOut = rows.reduce((a, r) => a + (r.x?.usage.outputTokens ?? 0), 0);
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p: number) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
  const endToEnd = rows.filter((r) => r.endToEnd).length;

  const results = {
    ranAt: new Date().toISOString(),
    model: process.env.HAQ_MODEL || "claude-opus-5-5",
    effort: process.env.HAQ_EFFORT || "medium",
    stories: n,
    groups,
    perField,
    eval2: { proposed, droppedBeforeShowing: dropped, preVerificationRate: proposed ? dropped / proposed : 0, shownUnverifiable: rows.reduce((a, r) => a + r.unverifiable, 0) },
    eval3: { fields: missingTotal, returnedNull: missingNull, score: missingTotal ? missingNull / missingTotal : 1 },
    eval4: { correct: endToEnd, total: n, threshold: 18 },
    latencyMs: { p50: pct(0.5), p95: pct(0.95) },
    costUsd: tokensIn * PRICE_IN + tokensOut * PRICE_OUT,
    perStory: rows.map((r) => ({
      id: r.s.id,
      lang: r.s.lang,
      track: r.s.track,
      expectedStatus: r.s.currentStatus,
      gotTrack: r.plan?.track ?? null,
      gotStatus: r.status,
      endToEnd: r.endToEnd,
      error: r.error,
      misses: r.misses,
    })),
  };
  writeFileSync("evals/results.json", JSON.stringify(results, null, 2) + "\n");

  const pctS = (x: number) => `${(x * 100).toFixed(1)}%`;
  const pass = (ok: boolean) => (ok ? "✅ pass" : "❌ below");
  const md = [
    "# Haq evaluation results",
    "",
    `Run ${results.ranAt.slice(0, 16).replace("T", " ")} UTC · model \`${results.model}\` · effort \`${results.effort}\` · ${n} fictional stories (\`evals/stories/\`) · cost $${results.costUsd.toFixed(2)} · latency p50 ${(pct(0.5) / 1000).toFixed(1)} s, p95 ${(pct(0.95) / 1000).toFixed(1)} s`,
    "",
    "Reproduce with `npm run eval` (needs `ANTHROPIC_API_KEY`).",
    "",
    "| Eval | What it checks | Result | Target | |",
    "|---|---|---|---|---|",
    ...groups.map((g) => `| EVAL-1 | ${g.name} (${g.fields}) exact match | ${pctS(g.score)} | ${g.threshold ? `≥ ${pctS(g.threshold)}` : "—"} | ${g.threshold ? pass(g.score >= g.threshold) : ""} |`),
    `| EVAL-2 | Facts shown that don't quote the story (after verification) | ${results.eval2.shownUnverifiable} | 0 | ${pass(results.eval2.shownUnverifiable === 0)} |`,
    `| EVAL-2 | Facts dropped by verification before showing | ${dropped} of ${proposed} (${pctS(results.eval2.preVerificationRate)}) | report | |`,
    `| EVAL-3 | Deliberately missing fields left empty | ${missingNull}/${missingTotal} (${pctS(results.eval3.score)}) | ≥ 90% | ${pass(results.eval3.score >= 0.9)} |`,
    `| EVAL-4 | End to end: correct track **and** current-step status | ${endToEnd}/${n} | ≥ 18/20 | ${pass(endToEnd >= 18)} |`,
    "",
    "## Per field",
    "",
    "| Field | Exact match |",
    "|---|---|",
    ...perField.map((f) => `| \`${f.field}\` | ${pctS(f.score)} |`),
    "",
    "## Per story",
    "",
    "| Story | Lang | Track | Current step | End to end | Field misses |",
    "|---|---|---|---|---|---|",
    ...results.perStory.map(
      (r) =>
        `| \`${r.id}\` | ${r.lang} | ${r.gotTrack ?? "—"}${r.gotTrack === r.track ? "" : ` (expected ${r.track})`} | ${r.gotStatus ?? "—"}${r.gotStatus === r.expectedStatus ? "" : ` (expected ${r.expectedStatus})`} | ${r.endToEnd ? "✅" : "❌"} | ${r.error ? `error: ${r.error}` : r.misses.length ? r.misses.join("<br>") : "—"} |`,
    ),
    "",
  ].join("\n");
  writeFileSync("evals/RESULTS.md", md);
  console.log(md.split("## Per field")[0]);
});
