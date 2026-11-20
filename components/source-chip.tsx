"use client";

import { ExternalLink, Scale } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate } from "@/lib/rules/dates";
import { RULE_BY_ID, type RuleId } from "@/lib/rules/sources";

/** "Why?": the rule behind a step, figure or banner, with its official source and effective date. */
export function SourceChip({ ruleIds, label = "Why?" }: { ruleIds: RuleId[]; label?: string }) {
  const rules = [...new Set(ruleIds)].map((id) => RULE_BY_ID[id]);
  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[0.85rem] font-medium text-primary hover:bg-accent">
        <Scale className="size-4" aria-hidden />
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] gap-0 divide-y p-0 text-[0.85rem]">
        {rules.map((r) => (
          <div key={r.id} className="space-y-1.5 p-4">
            <p className="font-semibold leading-snug">{r.law}</p>
            <p className="leading-snug text-muted-foreground">{r.summary}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[0.8rem]">
              <span>
                In force from {fmtDate(r.effectiveFrom)}
                {r.effectiveTo ? ` to ${fmtDate(r.effectiveTo)}` : ""}
              </span>
              <a
                href={r.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
              >
                Official source <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              {r.status === "S" && <span className="text-muted-foreground">Checked via a source quoting the official text</span>}
            </p>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
