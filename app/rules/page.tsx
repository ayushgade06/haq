import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { fmtDate } from "@/lib/rules/dates";
import { CONVENTIONS, LAST_VERIFIED, RULES, RULE_BY_ID } from "@/lib/rules/sources";

export const metadata: Metadata = {
  title: "The rules",
  description: "Every rule Haq applies, with its value, the date it took effect and its official source.",
};

const STATUS_TEXT = { V: "Checked on the official page", S: "Checked via a source quoting the official text" };

export default function RulesPage() {
  // Group consecutive rules by the instrument they come from.
  const groups: { law: string; rules: (typeof RULES)[number][] }[] = [];
  for (const r of RULES) {
    const last = groups.at(-1);
    if (last?.law === r.law) last.rules.push(r);
    else groups.push({ law: r.law, rules: [r] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="display text-[2.3rem] font-[740] sm:text-[3rem]">The rules Haq uses</h1>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-muted-foreground">
          Every date and amount in a plan comes from this table, worked out by plain code. The AI never decides them. Each rule links to its official
          source and shows when it took effect, so rules that changed (like RBI&apos;s 90-day window from 1 July 2026) are applied by date.
        </p>
        <p className="mt-3 text-[0.95rem] font-medium num">
          {RULES.length} rules · last verified {fmtDate(LAST_VERIFIED)}
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.law} aria-labelledby={`g-${g.rules[0].id}`}>
            <h2 id={`g-${g.rules[0].id}`} className="text-[1.15rem] font-semibold">
              {g.law}
            </h2>
            <div className="mt-3 overflow-hidden rounded-2xl border bg-card">
              <table className="w-full border-collapse text-left text-[0.9rem]">
                <thead className="sr-only md:not-sr-only">
                  <tr className="border-b text-[0.8rem] text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Rule
                    </th>
                    <th scope="col" className="w-48 px-4 py-2.5 font-medium">
                      Value
                    </th>
                    <th scope="col" className="w-40 px-4 py-2.5 font-medium">
                      In force
                    </th>
                    <th scope="col" className="w-32 px-4 py-2.5 font-medium">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {g.rules.map((r) => (
                    <tr key={r.id} id={r.id} className="block scroll-mt-6 px-4 py-3 md:table-row md:p-0">
                      <td className="block md:table-cell md:px-4 md:py-3.5 md:align-top">
                        <p className="leading-relaxed">{r.summary}</p>
                        <p className="mt-1 text-[0.75rem] text-muted-foreground">
                          <code>{r.id}</code>
                        </p>
                      </td>
                      <td className="block pt-2 font-semibold md:table-cell md:px-4 md:py-3.5 md:align-top">{r.value}</td>
                      <td className="block pt-1 text-muted-foreground num md:table-cell md:px-4 md:py-3.5 md:align-top">
                        <span className="md:hidden">In force </span>from {fmtDate(r.effectiveFrom)}
                        {"effectiveTo" in r && r.effectiveTo ? ` to ${fmtDate(r.effectiveTo)}` : ""}
                      </td>
                      <td className="block pt-1 md:table-cell md:px-4 md:py-3.5 md:align-top">
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline underline-offset-4 md:min-h-0"
                        >
                          Official source <ExternalLink className="size-3.5" aria-hidden />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                        <p className="text-[0.75rem] text-muted-foreground">{STATUS_TEXT[r.status]}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <section aria-labelledby="conventions" className="mt-14 max-w-3xl">
        <h2 id="conventions" className="text-[1.4rem] font-semibold">
          Where the rules leave room, Haq picks the safer reading
        </h2>
        <p className="mt-2 text-muted-foreground">These choices are marked in the code as &ldquo;Haq convention&rdquo;. Most of them make a deadline earlier, never later.</p>
        <ul className="mt-5 space-y-4">
          {CONVENTIONS.map((c) => (
            <li key={c.text} className="border-l-2 border-primary/40 pl-4">
              <p className="leading-relaxed">{c.text}</p>
              <p className="mt-1 text-[0.8rem] text-muted-foreground">
                Applies to:{" "}
                {c.ruleIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ", "}
                    <a href={`#${id}`} className="underline underline-offset-4">
                      {RULE_BY_ID[id].law.split(",")[0]}
                    </a>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="left-out" className="mt-14 max-w-3xl">
        <h2 id="left-out" className="text-[1.4rem] font-semibold">
          What Haq leaves out on purpose
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          <li>Values we couldn&apos;t verify against an official page, such as a 14-day insurer resolution time.</li>
          <li>Older RBI Ombudsman scheme values. Haq applies the scheme in force since 1 July 2026.</li>
          <li>Consumer filing fees above ₹50 lakh. Haq links to the official schedule instead.</li>
          <li>Public holidays and longer waits allowed by some payment networks.</li>
          <li>Whether you will win. Haq explains procedure; it gives no opinion on the merits of a case.</li>
        </ul>
        <p className="mt-6 text-[0.9rem] text-muted-foreground">
          Updating a rule is one entry in <code>lib/rules/sources.ts</code> plus a dated test in <code>tests/rules/</code>.
        </p>
      </section>
    </div>
  );
}
