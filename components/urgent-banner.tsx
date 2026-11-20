import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { SourceChip } from "@/components/source-chip";
import type { Banner } from "@/lib/schema";
import { cn } from "@/lib/utils";

const KIND = {
  urgent: { icon: CircleAlert, label: "Act now", cls: "border-stop/40 bg-stop-soft text-foreground [&_.ic]:text-stop" },
  warning: { icon: TriangleAlert, label: "Watch out", cls: "border-due/40 bg-due-soft text-foreground [&_.ic]:text-due" },
  info: { icon: Info, label: "Good to know", cls: "border-border bg-card text-foreground [&_.ic]:text-primary" },
};

export function UrgentBanners({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;
  return (
    <div className="space-y-2.5">
      {banners.map((b) => {
        const k = KIND[b.kind];
        return (
          <div
            key={b.id}
            role={b.kind === "urgent" ? "alert" : "status"}
            className={cn("flex flex-wrap items-start gap-x-3 gap-y-1 rounded-xl border px-4 py-3", k.cls)}
          >
            <k.icon className="ic mt-1 size-5 shrink-0" aria-hidden />
            <p className="min-w-[13rem] flex-1 text-[0.95rem] leading-snug">
              <span className="sr-only">{k.label}: </span>
              {b.text}
            </p>
            <div className="-my-2 ml-auto shrink-0">
              <SourceChip ruleIds={[b.ruleId]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
