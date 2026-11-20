import { describe, expect, it } from "vitest";
import { decodeFacts, encodeFacts } from "@/lib/case-state";
import { icsFor } from "@/lib/ics";
import { planCase } from "@/lib/rules";
import { sunita, TODAY, upiWritten } from "./helpers";

describe(".ics calendar file", () => {
  it("adds the RBI opening date and last day as all-day events with CRLF line ends", () => {
    const ics = icsFor(planCase(upiWritten("2026-11-20"), TODAY), "Bharat National Bank", new Date("2026-11-20T10:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261220");
    expect(ics).toContain("DTEND;VALUE=DATE:20261221");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270320");
    expect(ics).toContain("DTSTAMP:20261120T100000Z");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3); // RBI opens + RBI last day + commission last day
    expect(ics).not.toMatch(/[^\r]\n/); // every newline is CRLF
  });

  it("escapes commas and semicolons in text", () => {
    const ics = icsFor(planCase(sunita, TODAY), "Shop, Ltd; Delhi");
    expect(ics).toContain("Shop\\, Ltd\\; Delhi");
  });
});

describe("share link", () => {
  it("round-trips facts (incl. Unicode) and never includes the summary", () => {
    const f = { ...sunita, entityName: "सहयोग बैंक", issueSummary: "secret summary" };
    const enc = encodeFacts(f);
    expect(enc).not.toMatch(/[+/=]/);
    expect(decodeFacts(enc)).toEqual({ ...f, issueSummary: null });
  });

  it("rejects tampered links", () => {
    expect(decodeFacts("not-base64!!")).toBeNull();
    expect(decodeFacts(encodeFacts(sunita).slice(0, 10))).toBeNull();
  });
});
