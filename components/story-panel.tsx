"use client";

import type { CaseMeta, FactKey } from "@/lib/schema";
import { cn } from "@/lib/utils";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The user's own words, with every quoted fact underlined. Hovering a fact lights up its words. */
export function StoryPanel({ story, meta, active, person }: { story: string; meta: CaseMeta; active: FactKey | null; person?: string }) {
  // Find each fact's evidence in the story (whitespace- and case-tolerant), longest first so spans don't split.
  const spans: { start: number; end: number; keys: FactKey[] }[] = [];
  const entries = (Object.entries(meta) as [FactKey, NonNullable<CaseMeta[FactKey]>][])
    .filter(([, m]) => m.evidence && m.origin === "ai")
    .sort((a, b) => b[1].evidence!.length - a[1].evidence!.length);
  for (const [key, m] of entries) {
    const re = new RegExp(escapeRe(m.evidence!.normalize("NFC").trim()).replace(/\s+/g, "\\s+"), "i");
    const hit = re.exec(story.normalize("NFC"));
    if (!hit) continue;
    const start = hit.index;
    const end = start + hit[0].length;
    const overlap = spans.find((s) => start < s.end && end > s.start);
    if (overlap) {
      if (start >= overlap.start && end <= overlap.end) overlap.keys.push(key);
      continue;
    }
    spans.push({ start, end, keys: [key] });
  }
  spans.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let at = 0;
  const text = story.normalize("NFC");
  spans.forEach((s, i) => {
    if (s.start > at) parts.push(text.slice(at, s.start));
    const on = active !== null && s.keys.includes(active);
    parts.push(
      <mark
        key={i}
        className={cn(
          "rounded-sm bg-transparent text-inherit underline decoration-primary/50 decoration-2 underline-offset-[5px] transition-colors",
          on && "bg-primary/15 decoration-primary",
        )}
      >
        {text.slice(s.start, s.end)}
      </mark>,
    );
    at = s.end;
  });
  parts.push(text.slice(at));

  return (
    <figure className="rounded-2xl border border-dashed bg-background px-5 py-4">
      <figcaption className="mb-2 text-[0.85rem] font-medium text-muted-foreground">
        {person ? `${person}, in their own words` : "Your words"}
      </figcaption>
      <blockquote className="font-deva text-[0.98rem] leading-relaxed">{parts}</blockquote>
      <p className="mt-2 text-[0.78rem] text-muted-foreground">Underlined words are where each fact came from.</p>
    </figure>
  );
}
