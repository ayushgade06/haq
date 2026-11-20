"use client";

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GLOSSARY, type GlossaryKey } from "@/lib/copy";

/** A one-line glossary tooltip for terms an international reader won't know (UPI, RBI, NCH…). */
export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={120}
        className="cursor-help rounded-sm underline decoration-primary/45 decoration-dotted decoration-2 underline-offset-[5px] hover:decoration-primary"
      >
        {children ?? k}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-72 p-3 text-[0.85rem] leading-snug">
        <p>
          <strong className="font-semibold">{k}:</strong> {GLOSSARY[k]}
        </p>
      </PopoverContent>
    </Popover>
  );
}
