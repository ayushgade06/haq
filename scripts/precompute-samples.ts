// npm run samples → runs the real pipeline (extract → planCase → draft) over the 4 fictional sample stories
// and writes samples/<id>.json, so the demo works with ANTHROPIC_API_KEY unset or DEMO_MODE=true.
import { writeFileSync } from "node:fs";
import { test } from "vitest";
import { draftStream } from "@/lib/claude";
import { extractFacts } from "@/lib/extract";
import { planCase } from "@/lib/rules";
import { splitExtracted } from "@/lib/schema";
import { SAMPLE_AS_OF, SAMPLE_STORIES } from "@/samples/stories";

try {
  process.loadEnvFile(".env.local");
} catch {}

test("precompute samples", async () => {
  await Promise.all(
    SAMPLE_STORIES.map(async (s) => {
      const x = await extractFacts(s.story, SAMPLE_AS_OF);
      const { facts } = splitExtracted(x.facts);
      const plan = planCase(facts, SAMPLE_AS_OF);
      const drafts: Record<string, { en?: string; hi?: string }> = {};
      // English draft for every step; Hindi too for the current step.
      const jobs = plan.steps.flatMap((step) =>
        (step.id === plan.currentStepId ? (["en", "hi"] as const) : (["en"] as const)).map((lang) => ({ step, lang })),
      );
      await Promise.all(
        jobs.map(async ({ step, lang }) => {
          const msg = await draftStream(facts, plan, step, lang).finalMessage();
          if (msg.stop_reason !== "end_turn") return;
          (drafts[step.id] ??= {})[lang] = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
        }),
      );
      writeFileSync(`samples/${s.id}.json`, JSON.stringify({ id: s.id, asOf: SAMPLE_AS_OF, facts: x.facts, dropped: x.dropped, drafts }, null, 2) + "\n");
      console.log(s.id, plan.track, plan.currentStepId, `dropped ${x.dropped}`, Object.keys(drafts));
    }),
  );
});
