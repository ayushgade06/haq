"use client";

import { CalendarPlus, ExternalLink, Link2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DraftPanel } from "@/components/draft-panel";
import { FactsCard } from "@/components/facts-card";
import { FollowUpQuestions } from "@/components/follow-up-questions";
import { Ladder } from "@/components/ladder";
import { OwedCard } from "@/components/owed-card";
import { StoryPanel } from "@/components/story-panel";
import { Term } from "@/components/term";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UrgentBanners } from "@/components/urgent-banner";
import { decodeFacts, encodeFacts, loadCase, localToday, saveCase, type CaseState } from "@/lib/case-state";
import { LEGAL_AID_URL, NOT_ADVICE, TRACK_LABEL } from "@/lib/copy";
import { icsFor } from "@/lib/ics";
import { applyEdit } from "@/lib/questions";
import { planCase } from "@/lib/rules";
import { fmtDate } from "@/lib/rules/dates";
import { EMPTY_FACTS, splitExtracted, type FactKey, type Plan } from "@/lib/schema";
import { sampleById } from "@/samples";

function fromHash(): CaseState | null {
  const h = new URLSearchParams(window.location.hash.slice(1));
  const sample = h.get("sample");
  if (sample) {
    const s = sampleById(sample);
    if (!s) return null;
    const saved = loadCase();
    if (saved?.sampleId === sample) return saved; // keep the user's edits to this sample
    const { facts, meta } = splitExtracted(s.data.facts);
    return { facts, meta, story: s.story, sampleId: s.id, asOf: s.data.asOf, dropped: s.data.dropped };
  }
  const f = h.get("f");
  if (f) {
    const facts = decodeFacts(f);
    return facts ? { facts, meta: {}, edited: true } : null;
  }
  if (h.has("blank")) return { facts: { ...EMPTY_FACTS }, meta: {}, edited: true };
  return loadCase();
}

/** Which steps changed status or dates since the last plan (they pulse once). */
function diffSteps(a: Plan | null, b: Plan): Set<string> {
  if (!a) return new Set();
  const key = (p: Plan) => new Map(p.steps.map((s) => [s.id, `${s.status}|${s.unlocksOn}|${s.deadline}`]));
  const before = key(a);
  return new Set([...key(b)].filter(([id, k]) => before.get(id) !== k).map(([id]) => id));
}

export function CaseView() {
  const [state, setState] = useState<CaseState | null | undefined>(undefined);
  const [useRealToday, setUseRealToday] = useState(false);
  const [active, setActive] = useState<FactKey | null>(null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const prevPlan = useRef<Plan | null>(null);

  useEffect(() => {
    const load = () => setState(fromHash());
    load();
    window.scrollTo(0, 0); // arriving from the landing page's story box, start at the top
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  // Only read the clock once a case is loaded (client-side), never during prerender.
  const today = !state ? "" : state.asOf && !useRealToday ? state.asOf : localToday();
  // Pure, in the browser: every edit re-plans instantly with no network call.
  const plan = useMemo(() => (state ? planCase(state.facts, today) : null), [state, today]);

  useEffect(() => {
    if (!plan) return;
    const diff = diffSteps(prevPlan.current, plan);
    prevPlan.current = plan;
    if (!diff.size) return;
    setChanged(diff);
    const t = setTimeout(() => setChanged(new Set()), 1200);
    return () => clearTimeout(t);
  }, [plan]);

  if (state === undefined) return <CaseSkeleton />;
  if (state === null || !plan) return <NoCase />;

  const sample = state.sampleId ? sampleById(state.sampleId) : undefined;
  const draftStep = stepId && plan.steps.some((s) => s.id === stepId) ? stepId : (plan.currentStepId ?? plan.steps[0]?.id);
  const precomputed = sample && !state.edited && !useRealToday ? sample.data.drafts : null;

  const onChange = (key: FactKey, value: unknown) => {
    const next: CaseState = {
      ...state,
      facts: applyEdit(state.facts, key, value),
      meta: { ...state.meta, [key]: { evidence: null, estimated: false, origin: "user" } },
      edited: true,
    };
    setState(next);
    saveCase(next);
  };

  const onDraft = (id: string) => {
    setStepId(id);
    document.getElementById("draft")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const share = async () => {
    const url = `${location.origin}/case#f=${encodeFacts(state.facts)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied. It holds your facts (not your story). Share it only with people you trust.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const calendar = () => {
    const blob = new Blob([icsFor(plan, state.facts.entityName ?? "your complaint")], { type: "text/calendar" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "haq-dates.ics" });
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Calendar file downloaded. Open it to add the dates.");
  };
  const hasDates = plan.steps.some((s) => (s.status === "waiting" && s.unlocksOn) || (s.deadline && s.status !== "closed" && s.status !== "done"));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      {/* Case header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-2">
        <div className="min-w-0">
          <p className="text-[0.85rem] font-medium text-primary">{TRACK_LABEL[plan.track]}</p>
          <h1 className="display mt-1 text-[1.9rem] font-[720] sm:text-[2.4rem]">
            {sample ? `${sample.person.split(",")[0]}'s case` : "Your plan"}
          </h1>
          {state.facts.issueSummary && <p className="mt-1 max-w-[60ch] text-muted-foreground">{state.facts.issueSummary}</p>}
          {state.asOf && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[0.88rem] text-muted-foreground num">
              {useRealToday ? `Planned as of today, ${fmtDate(today)}.` : `A fictional sample, planned as of ${fmtDate(state.asOf)}.`}
              <button type="button" onClick={() => setUseRealToday(!useRealToday)} className="h-11 font-medium text-primary underline underline-offset-4">
                {useRealToday ? `Back to ${fmtDate(state.asOf)}` : "Use today's date instead"}
              </button>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {hasDates && (
            <Button variant="outline" onClick={calendar}>
              <CalendarPlus aria-hidden /> Add dates to my calendar
            </Button>
          )}
          <Button variant="outline" onClick={share}>
            <Link2 aria-hidden /> Copy share link
          </Button>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            <RotateCcw aria-hidden /> New case
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <UrgentBanners banners={plan.banners} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-8">
          {/* Facts: top on mobile, left on desktop */}
          <div className="space-y-4">
            <FollowUpQuestions plan={plan} facts={state.facts} today={today} onChange={onChange} />
            {state.story && <StoryPanel story={state.story} meta={state.meta} active={active} person={sample?.person} />}
            {!!state.dropped && (
              <p className="text-[0.82rem] text-muted-foreground">
                {state.dropped} {state.dropped === 1 ? "fact was" : "facts were"} left blank because Haq couldn&apos;t match {state.dropped === 1 ? "it" : "them"} to your exact words.
              </p>
            )}
            <FactsCard facts={state.facts} meta={state.meta} today={today} onChange={onChange} onFocusFact={setActive} />
          </div>

          <div className="min-w-0 space-y-6">
            {plan.track === "UNSUPPORTED" ? (
              <Unsupported />
            ) : (
              <section aria-labelledby="route-title">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="route-title" className="text-[1.25rem] font-semibold">
                    Your route
                  </h2>
                  {plan.fraud?.regime === "2017" && (
                    <p className="text-[0.82rem] text-muted-foreground">Working days skip Sundays and 2nd and 4th Saturdays; allow for bank holidays.</p>
                  )}
                </div>
                <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-[0.85rem]">
                  <strong className="font-semibold">{NOT_ADVICE}</strong>{" "}
                  {plan.track === "BANKING" && (
                    <>
                      The <Term k="RBI" /> <Term k="Ombudsman" /> takes complaints directly from you.
                    </>
                  )}
                  {plan.track === "CONSUMER" && (
                    <>
                      <Term k="NCH" /> and <Term k="e-Jagriti" /> are government services.
                    </>
                  )}
                </p>
                <Ladder plan={plan} onDraft={onDraft} changed={changed} />
              </section>
            )}

            <OwedCard plan={plan} entity={state.facts.entityName} />

            {draftStep && plan.track !== "UNSUPPORTED" && (
              <DraftPanel plan={plan} facts={state.facts} stepId={draftStep} onStepChange={setStepId} sampleDrafts={precomputed} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Unsupported() {
  return (
    <section aria-labelledby="unsupported" className="rounded-2xl border bg-card px-5 py-6">
      <h2 id="unsupported" className="text-[1.25rem] font-semibold">
        Haq can&apos;t route this one yet
      </h2>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Haq covers banks and payments, online shopping and services, and insurance. If your complaint is one of those, set
        &ldquo;Complaint against&rdquo; in the facts. Otherwise, these free services can point you to the right place:
      </p>
      <ul className="mt-4 space-y-3">
        <li>
          <a href="https://consumerhelpline.gov.in" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline underline-offset-4">
            National Consumer Helpline: call 1915 or WhatsApp +91 8800001915 <ExternalLink className="size-4" aria-hidden />
          </a>
        </li>
        <li>
          <a href={LEGAL_AID_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline underline-offset-4">
            Free legal aid from NALSA, the National Legal Services Authority <ExternalLink className="size-4" aria-hidden />
          </a>
        </li>
      </ul>
    </section>
  );
}

function NoCase() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="display text-[2rem] font-[720]">No case open</h1>
      <p className="mt-3 text-muted-foreground">Your case lives only in this browser tab. Start from your story or a sample, or fill in the facts yourself.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonVariants()}>
          Tell Haq what happened
        </Link>
        <a href="/case#blank" className={buttonVariants({ variant: "outline" })}>
          Fill in the facts myself
        </a>
      </div>
    </div>
  );
}

function CaseSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[23rem_1fr]" aria-busy="true" aria-label="Loading your plan">
      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
