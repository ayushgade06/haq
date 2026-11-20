"use client";

import { Mic, MicOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExtractProgress } from "@/components/extract-progress";
import { Button } from "@/components/ui/button";
import { localToday, saveCase } from "@/lib/case-state";
import { splitExtracted, type ExtractedFacts } from "@/lib/schema";
import { cn } from "@/lib/utils";

const MIN = 20;
const MAX = 2000;

const ERRORS: Record<string, string> = {
  TOO_SHORT: "Tell us a bit more: who, what, when, how much.",
  TOO_LONG: "That's over 2,000 characters. Keep the key facts: who, what, when, how much.",
  RATE_LIMITED: "You've reached the limit of 10 stories an hour. Start from a sample, or fill in the facts yourself.",
  PAUSED: "Live analysis is paused right now. Start from a sample, or fill in the facts yourself.",
  MODEL_REFUSED: "Haq couldn't read that story. Fill in the facts yourself, or start from a sample.",
  BAD_DATE: "Your device's date looks wrong. Check it and try again.",
};
const GENERIC = "Couldn't read that. Try again, or start from a sample.";

// Web Speech API (Chrome, Edge). Hidden where unsupported.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
const getRecognition = (): (new () => Recognition) | null =>
  typeof window === "undefined"
    ? null
    : ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition ?? null) as
        | (new () => Recognition)
        | null;

export function StoryInput({ paused }: { paused: boolean }) {
  const router = useRouter();
  const [story, setStory] = useState("");
  const [error, setError] = useState<string | null>(paused ? ERRORS.PAUSED : null);
  const [stage, setStage] = useState<number | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<"hi-IN" | "en-IN">("hi-IN");
  const rec = useRef<Recognition | null>(null);

  useEffect(() => setCanSpeak(!!getRecognition()), []);

  function toggleMic() {
    if (listening) return rec.current?.stop();
    const R = getRecognition();
    if (!R) return;
    const r = new R();
    r.lang = speechLang;
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) setStory((s) => (s ? `${s.trimEnd()} ${text.trim()}` : text.trim()).slice(0, MAX));
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    rec.current?.stop();
    const text = story.trim();
    if (text.length < MIN) return setError(ERRORS.TOO_SHORT);
    setError(null);
    setStage(0);
    const tick = setTimeout(() => setStage(1), 1400);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: text, today: localToday() }),
      });
      const body = await res.json().catch(() => ({}));
      clearTimeout(tick);
      if (!res.ok) {
        setStage(null);
        return setError(ERRORS[body?.error] ?? GENERIC);
      }
      setStage(2);
      const { facts, meta } = splitExtracted(body.facts as ExtractedFacts);
      saveCase({ facts, meta, story: text, dropped: body.dropped });
      setTimeout(() => router.push("/case#live"), 450);
    } catch {
      clearTimeout(tick);
      setStage(null);
      setError(GENERIC);
    }
  }

  const busy = stage !== null;
  return (
    <form onSubmit={submit} className="space-y-3" aria-describedby="story-hint">
      <label htmlFor="story" className="block text-[1rem] font-semibold">
        What happened?
      </label>
      <div className="rounded-2xl border border-input bg-card shadow-[0_1px_0_var(--border),0_18px_40px_-28px_color-mix(in_oklab,var(--primary)_55%,transparent)] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
        <textarea
          id="story"
          name="story"
          rows={5}
          maxLength={MAX}
          value={story}
          disabled={busy}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Maine 2 Nov ko UPI se ₹5,000 bheje, account se kat gaye par dukaan wale ko nahi mile. Bank ko call kiya, bole ruko…"
          className="font-deva block w-full resize-y rounded-t-2xl bg-transparent px-4 pb-2 pt-4 text-[1rem] leading-relaxed outline-none placeholder:text-muted-foreground/75 focus-visible:outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          {canSpeak ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={listening ? "destructive" : "ghost"}
                size="icon"
                onClick={toggleMic}
                disabled={busy}
                aria-pressed={listening}
                aria-label={listening ? "Stop listening" : "Speak your story"}
              >
                {listening ? <MicOff /> : <Mic />}
              </Button>
              <label className="sr-only" htmlFor="speech-lang">
                Speech language
              </label>
              <select
                id="speech-lang"
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value as "hi-IN" | "en-IN")}
                className="h-11 rounded-lg bg-transparent px-2 text-[0.82rem] text-muted-foreground hover:text-foreground"
              >
                <option value="hi-IN">हिन्दी</option>
                <option value="en-IN">English</option>
              </select>
              {listening && <span className="text-[0.82rem] text-stop">Listening…</span>}
            </div>
          ) : (
            <span />
          )}
          <span className={cn("text-[0.78rem] text-muted-foreground num", story.length > MAX - 100 && "text-due")}>
            {story.length.toLocaleString("en-IN")} / 2,000
          </span>
        </div>
      </div>
      <p id="story-hint" className="text-[0.85rem] text-muted-foreground">
        Write it the way you&apos;d tell a friend: who, what, when, how much. Hindi, English or both. Give only the last 4 digits of any account or card.
      </p>

      <div className="flex min-h-13 flex-wrap items-center gap-x-5 gap-y-3 pt-1">
        {busy ? (
          <ExtractProgress stage={stage} />
        ) : (
          <>
            <Button type="submit" size="lg" disabled={paused}>
              Make my plan
            </Button>
            <a href="/case#blank" className="text-[0.9rem] font-medium text-primary underline underline-offset-4">
              Fill in the facts myself
            </a>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-stop-soft px-3 py-2 text-[0.9rem]">
          {error}
        </p>
      )}
    </form>
  );
}
