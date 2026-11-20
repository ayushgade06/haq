import { describe, expect, it } from "vitest";
import { planCase } from "@/lib/rules";
import { facts } from "../helpers";

// Unknown card debit (fictional). Bank alert = transaction date (Haq convention).
const unknownDebit = (txnDate: string, complaintDate: string | null, more = {}) =>
  facts({
    entityType: "bank",
    txnType: "card_online",
    problem: "unauthorised",
    amountInr: 40_000,
    txnDate,
    complainedToEntity: complaintDate !== null,
    complaintMode: complaintDate ? "verbal" : "none",
    complaintDate,
    accountType: "savings",
    ...more,
  });

describe("unauthorised transactions: customer liability", () => {
  it("#12 alert Fri 13 Nov, reported Wed 18 Nov → working day 3 (14 Nov is the 2nd Saturday) → zero liability", () => {
    const plan = planCase(unknownDebit("2026-11-13", "2026-11-18"), "2026-11-20");
    expect(plan.track).toBe("BANKING");
    expect(plan.fraud).toMatchObject({ regime: "2017", day: 3, liability: "zero", maxLossInr: 0, ruleId: "fraud2017.zero" });
    expect(plan.owed[0]).toMatchObject({ kind: "fraud_refund", amountInr: 40_000 });
  });

  it("#13 reported Thu 19 Nov → working day 4 → limited liability; savings cap ₹10,000; ₹30,000 back by 2 Dec", () => {
    const plan = planCase(unknownDebit("2026-11-13", "2026-11-19"), "2026-11-20");
    expect(plan.fraud).toMatchObject({ day: 4, liability: "limited", maxLossInr: 10_000, ruleId: "fraud2017.limited" });
    expect(plan.owed[0]).toMatchObject({ amountInr: 30_000, dueDate: "2026-12-02" });
  });

  it.each([
    ["bsbd", 40_000, 5_000],
    ["savings", 40_000, 10_000],
    ["other", 40_000, 25_000],
    ["bsbd", 3_000, 3_000], // lower of the transaction value and the cap
  ] as const)("limited liability cap: %s account, ₹%i taken → max loss ₹%i", (accountType, amountInr, max) => {
    const plan = planCase(unknownDebit("2026-11-13", "2026-11-19", { accountType, amountInr }), "2026-11-20");
    expect(plan.fraud!.maxLossInr).toBe(max);
  });

  it("limited liability with unknown account type → asks for it, states no figure", () => {
    const plan = planCase(unknownDebit("2026-11-13", "2026-11-19", { accountType: null }), "2026-11-20");
    expect(plan.fraud!.maxLossInr).toBeNull();
    expect(plan.missing).toContain("accountType");
    expect(plan.owed).toHaveLength(0);
  });

  it("reported after working day 7 → the fixed limits don't apply; no figure stated", () => {
    const plan = planCase(unknownDebit("2026-11-02", "2026-11-12"), "2026-11-20");
    expect(plan.fraud).toMatchObject({ liability: "not_fixed", maxLossInr: null });
  });

  it("not reported yet → urgent banner with the zero-loss date, listed first", () => {
    const plan = planCase(unknownDebit("2026-11-13", null), "2026-11-16");
    expect(plan.banners[0]).toMatchObject({ id: "fraud_report", kind: "urgent" });
    expect(plan.banners[0].text).toContain("1930");
    expect(plan.banners[0].text).toContain("18 Nov 2026");
    expect(plan.fraud).toMatchObject({ reportedOn: null, day: 1, liability: "zero", reportBy: "2026-11-18" });
  });

  it("#14 transaction on 31 Dec 2026 → 2017 rules: reported 5 Jan is working day 4 → limited", () => {
    const plan = planCase(unknownDebit("2026-12-31", "2027-01-05"), "2027-01-06");
    expect(plan.fraud).toMatchObject({ regime: "2017", day: 4, liability: "limited" });
  });

  it("#14 transaction on 1 Jan 2027 → 2026 rules (RBI/2026-27/167): 5 calendar days → zero", () => {
    const plan = planCase(unknownDebit("2027-01-01", "2027-01-06"), "2027-01-06");
    expect(plan.fraud).toMatchObject({ regime: "2027", day: 5, liability: "zero", ruleId: "fraud2027.zero", reportBy: "2027-01-06" });
    expect(plan.owed[0].dueDate).toBe("2027-02-20"); // resolve within 45 days
  });

  it("2027 rules, reported on day 6 → not zero", () => {
    const plan = planCase(unknownDebit("2027-01-01", "2027-01-07"), "2027-01-08");
    expect(plan.fraud).toMatchObject({ regime: "2027", day: 6, liability: "not_fixed" });
  });

  it("2027 small fraud (≤ ₹50,000) → small-value compensation note", () => {
    const plan = planCase(unknownDebit("2027-01-01", "2027-01-03"), "2027-01-04");
    expect(plan.banners.map((b) => b.id)).toContain("small_value");
  });
});
