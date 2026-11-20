"use client";

import Link from "next/link";
import { StatusPill, shortDate } from "@/components/ladder";
import { planCase } from "@/lib/rules";
import { inr } from "@/lib/rules/dates";
import { splitExtracted } from "@/lib/schema";
import { sampleById } from "@/samples";

/** The hero shows the product's real output: Sunita's plan, computed by the same engine. */
export function RoutePreview() {
  const s = sampleById("sunita-upi")!;
  const plan = planCase(splitExtracted(s.data.facts).facts, s.data.asOf);
  const owed = plan.owed[0];
  return (
    <figure className="relative rounded-[1.75rem] border bg-card p-5 shadow-[0_30px_80px_-40px_color-mix(in_oklab,var(--primary)_45%,transparent)] sm:p-6">
      <figcaption className="mb-4">
        <p className="text-[0.82rem] font-medium text-primary">What Haq worked out for Sunita</p>
        <p className="font-deva mt-1 text-[0.92rem] leading-snug text-muted-foreground">
          &ldquo;…bhai ke account mein aaj tak nahi aaye. Branch gayi thi, manager ne bola wait kijiye.&rdquo;
        </p>
      </figcaption>
      <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[0.6rem] before:top-6 before:border-l-2 before:border-dashed before:border-border">
        {plan.steps.map((step, i) => (
          <li key={step.id} className="relative grid grid-cols-[1.25rem_1fr_auto] items-start gap-3">
            <span className="relative z-10 mt-1.5 size-[1.25rem] rounded-full border-2 border-card bg-primary/80 ring-2 ring-primary/25" aria-hidden />
            <div className="min-w-0">
              <StatusPill step={step} today={plan.today} />
              <p className="mt-1 text-[0.92rem] font-medium leading-snug">{step.title}</p>
            </div>
            {(step.deadline || step.unlocksOn) && (
              <span className="num pt-1 text-right text-[0.8rem] text-muted-foreground">
                {step.status === "waiting" && step.unlocksOn ? `opens ${shortDate(step.unlocksOn, plan.today)}` : step.deadline ? `by ${shortDate(step.deadline, plan.today)}` : ""}
              </span>
            )}
            {i === 0 && <span className="sr-only">This is the step to do now.</span>}
          </li>
        ))}
      </ol>
      {owed && (
        <div className="perforated relative mt-5 bg-background px-4 py-4">
          <p className="text-[0.8rem] text-muted-foreground">The bank owes her, in compensation</p>
          <p className="display num text-[2.2rem] font-[760]">{inr(owed.amountInr)}</p>
          <p className="text-[0.78rem] text-muted-foreground">₹100 for each day after the one-day deadline. RBI rules say it is paid without asking.</p>
          <span
            aria-hidden
            className="ink-stamp absolute right-4 top-4 rotate-[-10deg] rounded border-[3px] border-double border-stamp px-2 py-0.5 text-[0.95rem] font-[850] uppercase tracking-[0.08em] text-stamp opacity-85"
          >
            Owed
          </span>
        </div>
      )}
      <Link href="/case#sample=sunita-upi" className="mt-4 inline-flex h-11 items-center text-[0.92rem] font-semibold text-primary underline underline-offset-4">
        Open Sunita&apos;s full plan
      </Link>
    </figure>
  );
}
