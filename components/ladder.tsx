"use client";

import { ArrowRight, Ban, CalendarClock, Check, CircleDashed, ExternalLink, Hourglass, PenLine } from "lucide-react";
import { SourceChip } from "@/components/source-chip";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/rules/dates";
import type { Plan, Status, Step } from "@/lib/schema";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "20 Dec" this year, "20 Mar 2027" otherwise. */
export const shortDate = (d: string, today: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]}${String(y) === today.slice(0, 4) ? "" : ` ${y}`}`;
};

const STATUS: Record<Status, { icon: typeof Check; tone: string; marker: string }> = {
  do_now: { icon: ArrowRight, tone: "bg-go-soft text-go", marker: "bg-go text-white dark:text-background" },
  waiting: { icon: Hourglass, tone: "bg-wait-soft text-wait", marker: "bg-card text-wait ring-2 ring-wait/60" },
  file_by: { icon: CalendarClock, tone: "bg-due-soft text-due", marker: "bg-due text-white dark:text-background" },
  closed: { icon: Ban, tone: "bg-stop-soft text-stop", marker: "bg-stop-soft text-stop ring-2 ring-stop/50" },
  optional: { icon: CircleDashed, tone: "bg-muted text-muted-foreground", marker: "bg-card text-muted-foreground ring-2 ring-border" },
  done: { icon: Check, tone: "bg-muted text-foreground/80", marker: "bg-primary text-primary-foreground" },
};

export function statusLabel(s: Step, today: string): string {
  switch (s.status) {
    case "do_now":
      return "Do now";
    case "waiting":
      return s.unlocksOn ? `Waiting until ${shortDate(s.unlocksOn, today)}` : "Waiting";
    case "file_by":
      return s.deadline ? `File by ${shortDate(s.deadline, today)}` : "Open now";
    case "closed":
      return "Window closed";
    case "optional":
      return "Optional";
    case "done":
      return "Done";
  }
}

export function StatusPill({ step, today, className }: { step: Step; today: string; className?: string }) {
  const s = STATUS[step.status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8rem] font-semibold num", s.tone, className)}>
      <s.icon className="size-3.5" aria-hidden />
      {statusLabel(step, today)}
    </span>
  );
}

/** The one date that matters for a step, set large like a timetable. */
function keyDate(s: Step): { date: string; caption: string } | null {
  if (s.status === "waiting" && s.unlocksOn) return { date: s.unlocksOn, caption: "opens" };
  if ((s.status === "file_by" || s.status === "optional") && s.deadline) return { date: s.deadline, caption: "last day" };
  if (s.status === "closed" && s.deadline) return { date: s.deadline, caption: "closed after" };
  return null;
}

export function Ladder({
  plan,
  onDraft,
  changed,
}: {
  plan: Plan;
  onDraft?: (stepId: string) => void;
  changed?: Set<string>;
}) {
  const { steps, today } = plan;
  // Past steps sit above the "today" line; everything you can still do sits below it.
  let todayAt = 0;
  steps.forEach((s, i) => {
    if (s.status === "done" || s.status === "closed") todayAt = i + 1;
  });

  return (
    <ol className="relative" aria-label="Your route, step by step">
      {steps.map((step, i) => (
        <StepRow
          key={step.id}
          step={step}
          today={today}
          index={i}
          past={i < todayAt}
          last={i === steps.length - 1}
          current={step.id === plan.currentStepId}
          changed={changed?.has(step.id)}
          onDraft={onDraft}
          todayLineBefore={i === todayAt}
        />
      ))}
      {todayAt === steps.length && <TodayLine today={today} />}
    </ol>
  );
}

function TodayLine({ today }: { today: string }) {
  return (
    <li className="relative grid grid-cols-[2.75rem_1fr] items-center py-2" aria-label={`You are here: today, ${fmtDate(today)}`}>
      <span className="relative z-10 mx-auto size-3.5 rounded-full bg-primary ring-4 ring-primary/20" aria-hidden />
      <span className="flex items-center gap-3">
        <span className="whitespace-nowrap text-[0.8rem] font-semibold text-primary num">You are here: today, {fmtDate(today)}</span>
        <span className="h-0 flex-1 border-t-2 border-dashed border-primary/45" aria-hidden />
      </span>
    </li>
  );
}

function StepRow({
  step,
  today,
  index,
  past,
  last,
  current,
  changed,
  onDraft,
  todayLineBefore,
}: {
  step: Step;
  today: string;
  index: number;
  past: boolean;
  last: boolean;
  current: boolean;
  changed?: boolean;
  onDraft?: (id: string) => void;
  todayLineBefore: boolean;
}) {
  const s = STATUS[step.status];
  const kd = keyDate(step);
  return (
    <>
      {todayLineBefore && <TodayLine today={today} />}
      <li className="relative grid grid-cols-[2.75rem_1fr] gap-x-1">
        {/* the rail */}
        {!last && (
          <span
            aria-hidden
            className={cn(
              "absolute left-[1.375rem] top-12 bottom-0 -translate-x-1/2 border-l-2",
              past ? "border-primary/70" : "border-dashed border-border dark:border-input",
            )}
          />
        )}
        <span
          aria-hidden
          className={cn("relative z-10 mx-auto mt-4 flex size-8 items-center justify-center rounded-full text-[0.8rem] font-bold", s.marker)}
        >
          {step.status === "done" ? <Check className="size-4" /> : index + 1}
        </span>
        <div
          className={cn(
            "mb-3 rounded-2xl px-4 py-4 sm:px-5",
            current && "bg-card shadow-[0_1px_0_var(--border),0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_30%,transparent)] ring-1 ring-primary/25",
            changed && "changed",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <StatusPill step={step} today={today} />
              <h3 className="text-[1.1rem] font-semibold leading-snug">{step.title}</h3>
            </div>
            {kd && (
              <div className="shrink-0 text-right">
                <div
                  className={cn(
                    "display num text-[1.6rem] font-[650] sm:text-[1.9rem]",
                    step.status === "closed" ? "text-stop line-through decoration-2" : step.status === "file_by" ? "text-due" : "text-foreground",
                  )}
                >
                  {shortDate(kd.date, today)}
                </div>
                <div className="text-[0.75rem] text-muted-foreground">{kd.caption}</div>
              </div>
            )}
          </div>

          <p className="mt-2 max-w-prose text-[0.92rem] leading-relaxed text-muted-foreground">{step.detail}</p>

          {step.status === "waiting" && step.deadline && (
            <p className="mt-2 text-[0.88rem] num">
              Then file by <strong className="font-semibold text-due">{fmtDate(step.deadline)}</strong>.
            </p>
          )}
          {step.dates && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {step.dates.map((d) => (
                <li key={d.label} className="rounded-lg bg-muted px-2.5 py-1 text-[0.82rem] num">
                  {d.label} <strong className="font-semibold">{fmtDate(d.date)}</strong>
                  {d.date < today && " (passed)"}
                </li>
              ))}
            </ul>
          )}
          {step.projected && (
            <p className="mt-2 text-[0.82rem] text-muted-foreground">Dates counted as if you write today. They move if you write later.</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            {step.where && <span className="mr-2 text-[0.85rem] text-foreground/80">{step.where}</span>}
            {step.url && (
              <a
                href={step.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[0.85rem] font-medium text-primary hover:bg-accent"
              >
                Open the official site <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            <SourceChip ruleIds={[step.ruleId, ...(step.moreRuleIds ?? [])]} />
            {onDraft && step.status !== "done" && step.status !== "closed" && (
              <Button variant={current ? "default" : "outline"} size="sm" onClick={() => onDraft(step.id)}>
                <PenLine aria-hidden /> Write this complaint
              </Button>
            )}
          </div>
        </div>
      </li>
    </>
  );
}
