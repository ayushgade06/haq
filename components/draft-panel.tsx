"use client";

import { Check, Copy, LoaderCircle, PenLine, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DRAFT_FAILED, splitDraft, templateDraft, toText, type DraftFields } from "@/lib/draft";
import type { Facts, Plan } from "@/lib/schema";
import { cn } from "@/lib/utils";

type Lang = "en" | "hi";
type State =
  | { kind: "idle" }
  | { kind: "streaming"; text: string }
  | { kind: "ready"; text: string; from: "ai" | "sample" }
  | { kind: "fallback"; reason: string };

const SECTIONS: [keyof DraftFields, string][] = [
  ["subject", "Subject"],
  ["description", "Description"],
  ["relief", "Relief sought"],
  ["documents", "Documents to attach"],
];

/** Placeholders like [ACCOUNT LAST 4 DIGITS] are highlighted so nobody files them by mistake. */
function WithPlaceholders({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]\n]{2,60}\])/g).map((part, i) =>
        /^\[.*\]$/.test(part) ? (
          <mark key={i} className="rounded bg-due-soft px-1 text-due">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function DraftPanel({
  plan,
  facts,
  stepId,
  onStepChange,
  sampleDrafts,
}: {
  plan: Plan;
  facts: Facts;
  stepId: string;
  onStepChange: (id: string) => void;
  sampleDrafts: Record<string, { en?: string; hi?: string }> | null;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const abort = useRef<AbortController | null>(null);
  const step = plan.steps.find((s) => s.id === stepId) ?? plan.steps[0];
  const draftable = plan.steps.filter((s) => s.status !== "done" && s.status !== "closed");
  const precomputed = step ? sampleDrafts?.[step.id]?.[lang] : undefined;

  // State is keyed by step, language and facts: any change starts fresh (precomputed sample drafts show at
  // once), and late chunks from an old request land under the old key and are ignored.
  const key = `${step?.id}|${lang}|${JSON.stringify(facts)}`;
  const [saved, setSaved] = useState<{ key: string; s: State } | null>(null);
  const state: State =
    saved?.key === key ? saved.s : precomputed ? { kind: "ready", text: precomputed, from: "sample" } : { kind: "idle" };
  const setState = (s: State) => setSaved({ key, s });
  useEffect(() => () => abort.current?.abort(), [key]);

  if (!step) return null;

  async function write() {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setState({ kind: "streaming", text: "" });
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, stepId: step.id, language: lang, today: plan.today }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const code = (await res.json().catch(() => ({})))?.error;
        const reason =
          code === "PAUSED"
            ? "Live drafting is paused right now, so here is Haq's standard template."
            : code === "RATE_LIMITED"
              ? "You've reached this hour's drafting limit, so here is Haq's standard template."
              : "Couldn't write the draft, so here is Haq's standard template.";
        setState({ kind: "fallback", reason });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setState({ kind: "streaming", text });
      }
      if (text.includes(DRAFT_FAILED) || !splitDraft(text).description) {
        setState({ kind: "fallback", reason: "Couldn't write the draft, so here is Haq's standard template." });
      } else setState({ kind: "ready", text, from: "ai" });
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setState({ kind: "fallback", reason: "Couldn't reach Haq, so here is its standard template." });
    }
  }

  const fields: DraftFields | null =
    state.kind === "streaming" || state.kind === "ready"
      ? splitDraft(state.text)
      : state.kind === "fallback"
        ? templateDraft(facts, plan, step)
        : null;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${what}`);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it yourself.");
    }
  };

  return (
    <section id="draft" aria-labelledby="draft-title" className="scroll-mt-6 rounded-2xl border bg-card">
      <header className="space-y-3 border-b px-5 py-4">
        <div>
          <h2 id="draft-title" className="text-[1.05rem] font-semibold">
            Your complaint, ready to paste
          </h2>
          <p className="mt-0.5 text-[0.85rem] text-muted-foreground">
            Written from the facts you confirmed and the rules above. Fill in the highlighted gaps, then file it yourself.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="draft-step" className="sr-only">
            Which step to write for
          </label>
          <select
            id="draft-step"
            value={step.id}
            onChange={(e) => onStepChange(e.target.value)}
            className="h-11 max-w-full rounded-lg border border-input bg-background px-3 text-[0.9rem]"
          >
            {(draftable.length ? draftable : plan.steps).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <div role="group" aria-label="Draft language" className="inline-flex h-11 rounded-lg border border-input p-1">
            {(["en", "hi"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={cn(
                  "rounded-md px-3 text-[0.88rem] font-medium",
                  lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l === "en" ? "English" : <span lang="hi">हिन्दी</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-5 py-5" aria-live="polite" aria-busy={state.kind === "streaming"}>
        {state.kind === "idle" && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[0.92rem] text-muted-foreground">
              Haq will write the complaint for <strong className="font-semibold text-foreground">{step.title.toLowerCase()}</strong>
              {lang === "hi" ? " in Hindi" : ""}. It takes about 10 seconds.
            </p>
            <Button size="lg" onClick={write}>
              <PenLine aria-hidden /> Write my complaint
            </Button>
          </div>
        )}

        {state.kind === "fallback" && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-due-soft px-4 py-3 text-[0.88rem]">
            <span className="flex-1">{state.reason}</span>
            <Button variant="outline" size="sm" onClick={write}>
              <RotateCcw aria-hidden /> Retry
            </Button>
          </div>
        )}

        {fields && (
          <div className={cn("space-y-5", lang === "hi" && "font-deva")} lang={lang === "hi" ? "hi" : undefined}>
            {SECTIONS.map(([key, label]) => {
              const value = fields[key];
              const streamingHere = state.kind === "streaming" && value && SECTIONS.findLast(([k]) => fields[k])?.[0] === key;
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <h3 className="text-[0.85rem] font-semibold text-muted-foreground" lang="en">
                      {label}
                    </h3>
                    {value && state.kind !== "streaming" && (
                      <Button variant="ghost" size="sm" onClick={() => copy(value, label.toLowerCase())}>
                        <Copy aria-hidden /> Copy
                      </Button>
                    )}
                  </div>
                  <div
                    className={cn(
                      "whitespace-pre-wrap rounded-xl bg-background px-4 py-3 text-[0.95rem] leading-relaxed",
                      key === "subject" && "font-semibold",
                      !value && "min-h-12",
                    )}
                  >
                    {value ? <WithPlaceholders text={value} /> : state.kind === "streaming" ? <span className="text-muted-foreground">…</span> : null}
                    {streamingHere && <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-primary" aria-hidden />}
                  </div>
                </div>
              );
            })}
            {state.kind === "streaming" && !fields.subject && (
              <p className="flex items-center gap-2 text-[0.9rem] text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Writing your complaint…
              </p>
            )}
            {state.kind !== "streaming" && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button onClick={() => copy(toText(fields), "the whole complaint")}>
                  <Check aria-hidden /> Copy the whole complaint
                </Button>
                {state.kind === "ready" && (
                  <Button variant="ghost" onClick={write}>
                    <RotateCcw aria-hidden /> Write it again
                  </Button>
                )}
                {state.kind === "ready" && state.from === "sample" && (
                  <span className="text-[0.8rem] text-muted-foreground">Pre-written for this sample.</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
