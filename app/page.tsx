import Link from "next/link";
import { RoutePreview } from "@/components/route-preview";
import { SampleCards } from "@/components/sample-cards";
import { StoryInput } from "@/components/story-input";
import { Term } from "@/components/term";
import { STAT, STAT_SOURCE } from "@/lib/copy";

export default function Home() {
  const paused = process.env.DEMO_MODE === "true" || !process.env.ANTHROPIC_API_KEY;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid items-start gap-10 pb-16 pt-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14 lg:pt-12">
        <div className="space-y-7">
          <div className="space-y-5">
            <h1 className="display max-w-[16ch] text-[2.55rem] font-[760] text-foreground sm:text-[3.4rem]">
              The money left your account and never arrived. The bank says: wait.
            </h1>
            <p className="max-w-[54ch] text-[1.08rem] leading-relaxed text-muted-foreground">
              Haq tells you where to complain, when you&apos;re allowed to, the last day to file, and what the law says you&apos;re owed. Then it writes
              the complaint. Built for India: <Term k="UPI" /> payments, cards, online shopping and insurance.
            </p>
          </div>
          <StoryInput paused={paused} />
        </div>
        <div className="lg:pt-6">
          <RoutePreview />
        </div>
      </section>

      <section aria-labelledby="samples" className="border-t pt-12">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="samples" className="text-[1.35rem] font-semibold">
            Or open a sample case
          </h2>
          <p className="text-[0.88rem] text-muted-foreground">Fictional people. Opens instantly.</p>
        </div>
        <SampleCards />
      </section>

      <section aria-labelledby="why" className="grid gap-10 pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <h2 id="why" className="sr-only">
            Why this matters
          </h2>
          <p className="display num text-[2.6rem] font-[760] leading-none sm:text-[3.4rem]">
            7.84 <Term k="lakh" /> of 9.11 lakh
          </p>
          <p className="mt-4 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted-foreground">
            {STAT}{" "}
            <a href={STAT_SOURCE} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
              Source
            </a>
            . Complaints get closed for procedure, not only merit: filed in the wrong place, too early, or too late. Haq checks those three things before you
            file.
          </p>
        </div>
        <ol className="space-y-6">
          {[
            ["Tell it what happened", "Type or speak, in any mix of Hindi and English."],
            ["Check the facts", "AI pulls out the facts and shows the exact words each one came from. You fix anything that's wrong."],
            [
              "Get your route",
              "Rules written from official sources, not AI, decide where to go, when, and what you're owed. Every step links to its source. Then Haq writes the complaint; you file it.",
            ],
          ].map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-3">
              <span className="display num text-[1.6rem] font-[700] text-primary/70">{i + 1}</span>
              <div>
                <h3 className="text-[1.08rem] font-semibold">{title}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
          <li className="pl-[2.75rem] text-[0.92rem]">
            <Link href="/how-it-works" className="font-semibold text-primary underline underline-offset-4">
              How Haq works
            </Link>{" "}
            <span className="text-muted-foreground">or</span>{" "}
            <Link href="/rules" className="font-semibold text-primary underline underline-offset-4">
              read every rule it uses
            </Link>
          </li>
        </ol>
      </section>
    </div>
  );
}
