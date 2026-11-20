import type { Metadata } from "next";
import Link from "next/link";
import { Mermaid } from "@/components/mermaid";
import results from "@/evals/results.json";
import { STAT, STAT_SOURCE } from "@/lib/copy";

export const metadata: Metadata = {
  title: "How it works",
  description: "AI reads your story and writes the draft. Code decides everything with legal consequence.",
};

const PIPELINE = `flowchart LR
  S["Your story"] --> X["AI pulls<br/>out facts"] --> V["Code: every fact<br/>must quote you"] --> F["You check<br/>the facts"] --> R["Rules engine:<br/>route, dates,<br/>money"] --> W["AI writes<br/>the complaint"] --> U["You file it"]`;

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function HowItWorks() {
  const r = results;
  const g = (name: string) => r.groups.find((x) => x.name === name)!;
  const rows = [
    ["Company type, payment type and problem identified correctly", pct(g("Entity & transaction type").score), "90%"],
    ["Dates and amounts extracted exactly", pct(g("Dates & amounts").score), "85%"],
    ["Facts shown that don't quote the story", String(r.eval2.shownUnverifiable), "0"],
    ["Missing details left blank, not guessed", `${r.eval3.returnedNull}/${r.eval3.fields}`, "90%"],
    ["Right forum and right next step, end to end", `${r.eval4.correct}/${r.eval4.total}`, "18/20"],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-4 sm:px-6">
      <h1 className="display max-w-[18ch] text-[2.3rem] font-[740] sm:text-[3rem]">AI reads and writes. Code decides.</h1>
      <p className="mt-4 max-w-[62ch] text-[1.05rem] leading-relaxed text-muted-foreground">
        Haq uses AI for the two things it is good at: understanding a messy story, and writing a clear letter. Everything with legal consequence,
        which forum, whether you can file yet, every deadline and every rupee, comes from a small rules engine written in plain code, with an official
        source for each rule.
      </p>

      <section aria-labelledby="pipeline" className="mt-10">
        <h2 id="pipeline" className="mb-3 text-[1.35rem] font-semibold">
          The pipeline
        </h2>
        <Mermaid chart={PIPELINE} label="Pipeline: your story, AI extracts facts, code verifies each quote, you check the facts, the rules engine plans, AI drafts, you file." />
        <ul className="mt-5 grid gap-4 text-[0.95rem] leading-relaxed sm:grid-cols-2">
          <li>
            <strong className="font-semibold">Facts must quote you.</strong> Every fact the AI finds carries the exact words it came from. Code checks that
            those words are really in your story; if not, the fact is dropped and Haq asks you instead.
          </li>
          <li>
            <strong className="font-semibold">You are the checkpoint.</strong> The facts card is editable. Change a date and the whole plan recalculates in
            your browser, instantly, with no AI involved.
          </li>
          <li>
            <strong className="font-semibold">Rules are versioned by date.</strong> RBI&apos;s Ombudsman window became 90 days on 1 July 2026; fraud
            liability rules change on 1 January 2027. The engine applies whichever rule was in force.{" "}
            <Link href="/rules" className="text-primary underline underline-offset-4">
              See every rule
            </Link>
            .
          </li>
          <li>
            <strong className="font-semibold">The letter never sees your story.</strong> The drafting step gets only the facts you confirmed, the figures the
            engine computed and the rule texts. Missing details become placeholders like [ACCOUNT LAST 4 DIGITS].
          </li>
        </ul>
      </section>

      <section aria-labelledby="evals" className="mt-14">
        <h2 id="evals" className="text-[1.35rem] font-semibold">
          How well it works
        </h2>
        <p className="mt-2 max-w-[62ch] text-muted-foreground">
          Tested on {r.stories} fictional stories (8 banking, 7 shopping and services, 5 insurance; 6 in Hinglish, 1 in Hindi), each labelled by hand
          with the facts, the forum and the next step. Run on {r.ranAt.slice(0, 10)} with <code>{r.model}</code>.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-left text-[0.92rem]">
            <thead>
              <tr className="border-b text-[0.8rem] text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Check
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Result
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Target
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(([check, result, target]) => (
                <tr key={check}>
                  <td className="px-4 py-3">{check}</td>
                  <td className="px-4 py-3 text-right font-semibold num">{result}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground num">{target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[0.85rem] text-muted-foreground">
          A small, synthetic set: a sanity check, not proof of real-world accuracy. Median extraction time {(r.latencyMs.p50 / 1000).toFixed(1)} s. The
          rules engine has its own 80+ dated unit tests. Full results are in <code>evals/RESULTS.md</code> in the repository.
        </p>
      </section>

      <section aria-labelledby="why-matters" className="mt-14">
        <h2 id="why-matters" className="text-[1.35rem] font-semibold">
          Why route first
        </h2>
        <p className="mt-2 max-w-[62ch] leading-relaxed text-muted-foreground">
          {STAT}{" "}
          <a href={STAT_SOURCE} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            Source
          </a>
          . A complaint can be closed because of how and when it was filed: the company wasn&apos;t asked first, the wait wasn&apos;t over, or the
          window had passed. Haq checks those before you file.
        </p>
      </section>

      <section aria-labelledby="ai-use" className="mt-14 rounded-2xl border bg-card px-5 py-6">
        <h2 id="ai-use" className="text-[1.35rem] font-semibold">
          How AI is used, and what it never does
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong className="font-semibold">At runtime:</strong> Claude Opus 5.5 (Anthropic API) makes two calls per case: one to turn the story into
            facts, one to write the complaint. It never decides the forum, eligibility, dates or amounts, and it has no tools.
          </li>
          <li>
            <strong className="font-semibold">Your data:</strong> nothing you type is stored on a server. There are no accounts and no database. Logs
            hold only status, timing and token counts. Your case lives in your browser tab.
          </li>
          <li>
            <strong className="font-semibold">Building it:</strong> Haq was built with substantial help from an AI coding assistant (Claude Code). The
            repository README describes what was AI-generated and how it was checked.
          </li>
          <li>
            <strong className="font-semibold">Limits:</strong> Haq is not legal advice and never files anything. Public holidays aren&apos;t counted.
            Some payment networks allow longer waits than Haq assumes. Large or complex cases should go to a lawyer or free legal aid.
          </li>
        </ul>
      </section>
    </div>
  );
}
