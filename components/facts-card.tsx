"use client";

import { Pencil, Quote, Sparkles } from "lucide-react";
import { FIELDS, type Field } from "@/lib/questions";
import type { CaseMeta, FactKey, Facts } from "@/lib/schema";
import { cn } from "@/lib/utils";

export type OnFactChange = (key: FactKey, value: unknown) => void;

const control =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-[0.95rem] text-foreground shadow-none transition-colors hover:border-primary/50 focus-visible:border-ring";

/** One inline editor per fact kind. Native controls: accessible, and right on phones. */
export function FactEditor({ field, facts, today, onChange, id }: { field: Field; facts: Facts; today: string; onChange: OnFactChange; id: string }) {
  const value = facts[field.key];
  if (field.kind === "select" || field.kind === "bool") {
    const options = field.kind === "bool" ? ([["true", "Yes"], ["false", "No"]] as [string, string][]) : field.options!;
    return (
      <select
        id={id}
        className={cn(control, "appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9")}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
        value={value === null ? "" : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(field.key, v === "" ? null : field.kind === "bool" ? v === "true" : v);
        }}
      >
        <option value="">Not mentioned</option>
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    );
  }
  if (field.kind === "date") {
    const future = typeof value === "string" && value > today;
    return (
      <>
        <input
          id={id}
          type="date"
          max={today}
          className={cn(control, "num", future && "border-stop")}
          value={(value as string | null) ?? ""}
          aria-invalid={future || undefined}
          onChange={(e) => onChange(field.key, e.target.value || null)}
        />
        {future && <p className="mt-1 text-[0.8rem] text-stop">This date is in the future.</p>}
      </>
    );
  }
  if (field.kind === "money") {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          className={cn(control, "pl-7 num")}
          value={(value as number | null) ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(field.key, e.target.value === "" || !Number.isFinite(n) || n <= 0 ? null : Math.round(n));
          }}
        />
      </div>
    );
  }
  return (
    <input
      id={id}
      type="text"
      maxLength={80}
      className={control}
      value={(value as string | null) ?? ""}
      onChange={(e) => onChange(field.key, e.target.value.trim() ? e.target.value : null)}
    />
  );
}

export function FactsCard({
  facts,
  meta,
  today,
  onChange,
  onFocusFact,
}: {
  facts: Facts;
  meta: CaseMeta;
  today: string;
  onChange: OnFactChange;
  onFocusFact?: (key: FactKey | null) => void;
}) {
  const fields = FIELDS.filter((f) => !f.show || f.show(facts));
  return (
    <section aria-labelledby="facts-title" className="rounded-2xl border bg-card">
      <header className="border-b px-5 py-4">
        <h2 id="facts-title" className="text-[1.05rem] font-semibold">
          What Haq understood
        </h2>
        <p className="mt-0.5 text-[0.85rem] text-muted-foreground">
          Check each fact. Change anything that's wrong and the plan updates instantly.
        </p>
      </header>
      <dl className="divide-y">
        {fields.map((field) => {
          const m = meta[field.key];
          const id = `fact-${field.key}`;
          return (
            <div
              key={field.key}
              className="grid gap-1.5 px-5 py-3.5"
              onMouseEnter={() => onFocusFact?.(field.key)}
              onMouseLeave={() => onFocusFact?.(null)}
              onFocus={() => onFocusFact?.(field.key)}
              onBlur={() => onFocusFact?.(null)}
            >
              <dt className="flex items-center justify-between gap-2">
                <label htmlFor={id} className="text-[0.85rem] font-medium text-muted-foreground">
                  {field.label}
                </label>
                {m?.origin === "user" ? (
                  <span className="inline-flex items-center gap-1 text-[0.75rem] text-primary">
                    <Pencil className="size-3" aria-hidden /> You changed this
                  </span>
                ) : m?.estimated ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-due-soft px-2 py-0.5 text-[0.75rem] font-medium text-due">
                    <Sparkles className="size-3" aria-hidden /> Estimated: please check
                  </span>
                ) : null}
              </dt>
              <dd>
                <FactEditor field={field} facts={facts} today={today} onChange={onChange} id={id} />
                {m?.evidence && m.origin === "ai" ? (
                  <p className="mt-1.5 flex gap-1.5 text-[0.82rem] leading-snug text-muted-foreground">
                    <Quote className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
                    <span>
                      <span className="sr-only">From your words: </span>
                      <q className="font-deva italic">{m.evidence}</q>
                    </span>
                  </p>
                ) : facts[field.key] === null ? (
                  <p className="mt-1 text-[0.8rem] text-muted-foreground">Not mentioned. Add it if you know it.</p>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
