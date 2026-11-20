"use client";

import { SourceChip } from "@/components/source-chip";
import { NumberTicker } from "@/components/ui/number-ticker";
import { fmtDate, inr } from "@/lib/rules/dates";
import type { Plan } from "@/lib/schema";

const LIABILITY_TEXT = {
  zero: "You should lose nothing",
  limited: "Your loss is capped",
  not_fixed: "Reported late: the fixed limits don't apply",
};

/** The receipt: what the rules say the bank owes, with the formula and the circular. Hidden when nothing applies. */
export function OwedCard({ plan, entity }: { plan: Plan; entity: string | null }) {
  const { owed, fraud } = plan;
  if (!owed.length && !fraud) return null;
  const who = entity ?? "Your bank";

  return (
    <section aria-labelledby="owed-title" className="space-y-3">
      {owed.map((o) => {
        const isTat = o.kind === "tat_compensation";
        const late = isTat ? (o.daysLate ?? 0) > 0 : true;
        return (
          <div key={o.kind} className="perforated relative overflow-hidden bg-card px-5 py-8 shadow-[0_1px_0_var(--border)] sm:px-7">
            <p id="owed-title" className="text-[0.9rem] font-medium text-muted-foreground">
              {isTat ? `${who} owes you, in compensation` : `${who} must credit back`}
            </p>
            <p className="display mt-1 text-[3rem] font-[760] leading-none text-foreground sm:text-[3.6rem]" aria-live="polite">
              <span className="mr-0.5 text-[0.6em] font-[650] align-[0.25em]">₹</span>
              <NumberTicker value={o.amountInr} />
            </p>
            <p className="mt-3 max-w-[34ch] text-[0.95rem] leading-snug">
              {isTat
                ? late
                  ? "For not fixing your failed payment on time. The rules say the bank must pay this without you asking."
                  : "Nothing yet. Compensation starts if the bank misses its deadline."
                : `Due by ${fmtDate(o.dueDate)}.`}
            </p>
            <p className="mt-4 border-t border-dashed pt-3 text-[0.85rem] leading-relaxed text-muted-foreground num">{o.formula}</p>
            <div className="-mb-3 -ml-2 mt-1">
              <SourceChip ruleIds={[o.ruleId]} label="The rule behind this" />
            </div>
            {late && o.amountInr > 0 && (
              <div
                aria-hidden
                className="ink-stamp pointer-events-none absolute right-4 top-6 rotate-[-11deg] rounded-md border-[3px] border-double border-stamp px-3 py-1 text-center text-stamp opacity-85 mix-blend-multiply dark:mix-blend-screen sm:right-7"
              >
                <div className="text-[1.35rem] font-[850] uppercase tracking-[0.08em]">{isTat ? "Owed" : "Refund due"}</div>
                <div className="text-[0.62rem] font-semibold num">{isTat ? "RBI/2019-20/67" : fmtDate(o.dueDate)}</div>
              </div>
            )}
          </div>
        );
      })}

      {fraud && (
        <div className="rounded-2xl border bg-card px-5 py-4">
          <p className="text-[0.9rem] text-muted-foreground">
            {fraud.reportedOn ? `You reported it on ${fmtDate(fraud.reportedOn)}` : "If you report it today"}
            {`: ${fraud.regime === "2017" ? "working day" : "day"} ${fraud.day} after the alert.`}
          </p>
          <p className="mt-1 text-[1.15rem] font-semibold">
            {LIABILITY_TEXT[fraud.liability]}
            {fraud.maxLossInr !== null && fraud.liability !== "not_fixed" && (
              <span className="num">: at most {inr(fraud.maxLossInr)}</span>
            )}
          </p>
          {fraud.liability === "limited" && fraud.maxLossInr === null && (
            <p className="mt-1 text-[0.88rem] text-muted-foreground">Add your account type to see the cap.</p>
          )}
          <div className="-mb-2 -ml-2 mt-1">
            <SourceChip ruleIds={[fraud.ruleId]} />
          </div>
        </div>
      )}
    </section>
  );
}
