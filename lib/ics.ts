// "Add dates to my calendar": a hand-written .ics (RFC 5545), all-day events with a 2-day reminder.
import { addDays } from "./rules/dates";
import type { Plan } from "./schema";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const ymd = (d: string) => d.replace(/-/g, "");

export function icsFor(plan: Plan, who: string, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const events = plan.steps.flatMap((s) => [
    ...(s.status === "waiting" && s.unlocksOn ? [{ date: s.unlocksOn, what: `${s.title}: you can file from today`, s }] : []),
    ...(s.deadline && s.status !== "closed" && s.status !== "done" ? [{ date: s.deadline, what: `${s.title}: last day to file`, s }] : []),
  ]);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Haq//Complaint plan//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  events.forEach((e, i) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:haq-${ymd(e.date)}-${i}-${e.s.id}@haq`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${ymd(addDays(e.date, 1))}`,
      `SUMMARY:${esc(`${e.what} (${who})`)}`,
      `DESCRIPTION:${esc(`${e.s.where ?? ""}\n${e.s.url ?? ""}\nFrom your Haq plan. Not legal advice.`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-P2D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(e.what)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
