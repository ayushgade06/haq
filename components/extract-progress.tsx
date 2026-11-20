"use client";

import { Check } from "lucide-react";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { cn } from "@/lib/utils";

export const STAGES = ["Reading your story", "Finding the facts", "Checking the rules"];

export function ExtractProgress({ stage }: { stage: number }) {
  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5" aria-live="polite">
      {STAGES.map((label, i) => (
        <li key={label} className={cn("flex items-center gap-2 text-[0.95rem]", i > stage && "text-muted-foreground/70")}>
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-[0.75rem] font-bold",
              i < stage ? "bg-primary text-primary-foreground" : i === stage ? "ring-2 ring-primary text-primary" : "ring-1 ring-border",
            )}
            aria-hidden
          >
            {i < stage ? <Check className="size-3.5" /> : i + 1}
          </span>
          {i === stage ? (
            <TextShimmer as="span" duration={1.6} className="font-medium [--base-color:var(--muted-foreground)] [--base-gradient-color:var(--primary)] dark:[--base-color:var(--muted-foreground)] dark:[--base-gradient-color:var(--primary)]">
              {label}
            </TextShimmer>
          ) : (
            <span>{label}</span>
          )}
          {i === stage && <span className="sr-only">(in progress)</span>}
        </li>
      ))}
    </ol>
  );
}
