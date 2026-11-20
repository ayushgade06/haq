"use client";

import { MessageCircleQuestion } from "lucide-react";
import { FactEditor, type OnFactChange } from "@/components/facts-card";
import { followUps } from "@/lib/questions";
import type { Facts, Plan } from "@/lib/schema";

/** At most 3 questions for facts the rules need but the story didn't give, most important first. */
export function FollowUpQuestions({ plan, facts, today, onChange }: { plan: Plan; facts: Facts; today: string; onChange: OnFactChange }) {
  const qs = followUps(plan);
  if (!qs.length) return null;
  return (
    <section aria-labelledby="followups" className="rounded-2xl border border-primary/30 bg-accent/60 px-5 py-4">
      <h2 id="followups" className="flex items-center gap-2 text-[1rem] font-semibold">
        <MessageCircleQuestion className="size-5 text-primary" aria-hidden />
        {qs.length === 1 ? "One question to firm up your plan" : `${qs.length} questions to firm up your plan`}
      </h2>
      <ol className="mt-3 space-y-3">
        {qs.map((q) => (
          <li key={q.key}>
            <label htmlFor={`q-${q.key}`} className="mb-1.5 block text-[0.92rem] font-medium">
              {q.question}
            </label>
            <FactEditor field={q} facts={facts} today={today} onChange={onChange} id={`q-${q.key}`} />
          </li>
        ))}
      </ol>
    </section>
  );
}
