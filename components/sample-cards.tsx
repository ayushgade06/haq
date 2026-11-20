import Link from "next/link";
import { TRACK_LABEL } from "@/lib/copy";
import { planCase } from "@/lib/rules";
import { splitExtracted } from "@/lib/schema";
import { SAMPLES } from "@/samples";

/** One click to a full plan: precomputed, so it opens instantly and needs no API. */
export function SampleCards() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {SAMPLES.map((s) => {
        const plan = planCase(splitExtracted(s.data.facts).facts, s.data.asOf);
        return (
          <li key={s.id}>
            <Link
              href={`/case#sample=${s.id}`}
              className="group flex h-full flex-col gap-1.5 rounded-2xl border bg-card px-5 py-4 transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <span className="text-[0.8rem] font-medium text-primary">{TRACK_LABEL[plan.track]}</span>
              <span className="text-[1.08rem] font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">{s.title}</span>
              <span className="text-[0.92rem] leading-snug text-muted-foreground">{s.hook}</span>
              <span className="mt-auto pt-2 text-[0.8rem] text-muted-foreground">
                {s.person}
                {s.lang === "hi-Latn" ? ", writing in Hinglish" : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
