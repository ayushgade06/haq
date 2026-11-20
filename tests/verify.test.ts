import { describe, expect, it } from "vitest";
import { splitDraft } from "@/lib/draft";
import { rateLimit } from "@/lib/rate-limit";
import { normalise, verifyFacts } from "@/lib/verify";

const story = `Maine 2 Nov ko PhonePe se apne bhai ko ₹12,000 bheje. Paise "kat gaye" par bhai ko nahi mile.
Bank   wale bole wait karo. मेरा पैसा वापस नहीं आया। Kal branch gayi thi.`;
const run = (facts: { name: string; value: string; evidence: string; estimated?: boolean }[]) =>
  verifyFacts({ issueSummary: "UPI payment not credited.", facts: facts.map((f) => ({ estimated: false, ...f })) }, story, "2026-11-20");

describe("evidence verification", () => {
  it("keeps a fact whose evidence is an exact substring", () => {
    const { facts, dropped } = run([{ name: "amountInr", value: "12000", evidence: "₹12,000" }]);
    expect(facts.amountInr).toEqual({ value: 12000, evidence: "₹12,000", estimated: false });
    expect(dropped).toBe(0);
  });

  it("tolerates whitespace, curly quotes and case", () => {
    const { facts } = run([
      { name: "complaintMode", value: "verbal", evidence: "bank wale bole wait karo" },
      { name: "problem", value: "failed_credit", evidence: "Paise “kat gaye” par bhai ko nahi mile" },
    ]);
    expect(facts.complaintMode?.value).toBe("verbal");
    expect(facts.problem?.value).toBe("failed_credit");
  });

  it("matches Devanagari, including NFD-encoded evidence", () => {
    const { facts } = run([{ name: "reversed", value: "false", evidence: "पैसा वापस नहीं आया".normalize("NFD") }]);
    expect(facts.reversed?.value).toBe(false);
  });

  it("drops facts whose evidence isn't in the story, and counts them", () => {
    const { facts, dropped } = run([
      { name: "entityName", value: "SBI", evidence: "SBI" },
      { name: "txnType", value: "upi", evidence: "PhonePe" },
    ]);
    expect(facts.entityName).toBeNull();
    expect(facts.txnType?.value).toBe("upi");
    expect(dropped).toBe(1);
  });

  it("drops invalid values: bad enum, impossible or future date, zero amount", () => {
    const { facts, dropped } = run([
      { name: "txnType", value: "crypto", evidence: "PhonePe" },
      { name: "txnDate", value: "2026-11-31", evidence: "2 Nov" },
      { name: "complaintDate", value: "2026-12-01", evidence: "Kal" },
      { name: "amountInr", value: "0", evidence: "₹12,000" },
    ]);
    expect([facts.txnType, facts.txnDate, facts.complaintDate, facts.amountInr]).toEqual([null, null, null, null]);
    expect(dropped).toBe(4);
  });

  it("marks a date with no digits in its evidence as estimated", () => {
    const { facts } = run([
      { name: "complaintDate", value: "2026-11-19", evidence: "Kal branch gayi thi" },
      { name: "txnDate", value: "2026-11-02", evidence: "2 Nov" },
    ]);
    expect(facts.complaintDate?.estimated).toBe(true);
    expect(facts.txnDate?.estimated).toBe(false);
  });

  it("first mention wins; summary kept without evidence", () => {
    const { facts } = run([
      { name: "txnType", value: "upi", evidence: "PhonePe" },
      { name: "txnType", value: "imps", evidence: "PhonePe" },
    ]);
    expect(facts.txnType?.value).toBe("upi");
    expect(facts.issueSummary).toEqual({ value: "UPI payment not credited.", evidence: null, estimated: false });
  });

  it("normalise() folds quotes and whitespace", () => {
    expect(normalise("  “Hello”\n\tWorld ")).toBe('"hello" world');
  });
});

describe("draft splitter", () => {
  it("splits the four sections, tolerating bold labels", () => {
    const d = splitDraft("SUBJECT: UPI failed\n\n**DESCRIPTION:**\nMoney left.\nRELIEF SOUGHT:\n1. Refund\nDOCUMENTS TO ATTACH:\n- Statement");
    expect(d).toEqual({ subject: "UPI failed", description: "Money left.", relief: "1. Refund", documents: "- Statement" });
  });

  it("handles partial streaming text", () => {
    expect(splitDraft("SUBJECT: UPI failed\nDESCRIPTION:\nMoney le")).toMatchObject({ subject: "UPI failed", description: "Money le", relief: "" });
  });
});

describe("rate limit", () => {
  it("allows 10 per hour per key, then returns a Retry-After", () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) expect(rateLimit("test-ip", 10, t + i).ok).toBe(true);
    const r = rateLimit("test-ip", 10, t + 10);
    expect(r).toEqual({ ok: false, retryAfter: 3600 });
    expect(rateLimit("test-ip", 10, t + 3_600_001).ok).toBe(true);
  });
});
