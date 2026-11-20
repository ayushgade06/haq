import { describe, expect, it } from "vitest";
import { planCase, trackFor } from "@/lib/rules";
import { CONVENTIONS, RULE_BY_ID, RULES } from "@/lib/rules/sources";
import { isIsoDate } from "@/lib/rules/dates";
import type { Facts } from "@/lib/schema";
import { facts, sunita, TODAY, upiWritten } from "../helpers";

describe("routing", () => {
  it.each([
    [{ entityType: "insurer" }, "INSURANCE"],
    [{ problem: "claim_rejected" }, "INSURANCE"],
    [{ entityType: "bank", problem: "refund" }, "BANKING"],
    [{ entityType: "wallet" }, "BANKING"],
    [{ entityType: "ecommerce", problem: "refund" }, "CONSUMER"],
    [{ entityType: "ecommerce", problem: "unauthorised" }, "BANKING"],
    [{ entityType: "ecommerce", txnType: "upi", problem: "failed_credit" }, "BANKING"],
    [{ entityType: null, txnType: "imps" }, "BANKING"],
    [{ entityType: null, problem: "defective" }, "CONSUMER"],
    [{ entityType: "other", problem: "refund" }, "UNSUPPORTED"],
    [{}, "UNSUPPORTED"],
  ] as [Partial<Facts>, string][])("%o → %s", (f, track) => {
    expect(trackFor(facts(f))).toBe(track);
  });

  it("unknown entity → unsupported plan with NCH help, asks who it's against", () => {
    const plan = planCase(facts({}), TODAY);
    expect(plan.steps).toHaveLength(0);
    expect(plan.banners[0].id).toBe("unsupported");
    expect(plan.missing[0]).toBe("entityType");
  });
});

describe("whole plan", () => {
  it("Sunita's sample: written-proof banner, do now → waiting until 20 Dec → file by 20 Mar 2027, ₹1,700 owed", () => {
    const plan = planCase(sunita, TODAY);
    expect(plan.track).toBe("BANKING");
    expect(plan.steps.map((s) => s.status)).toEqual(["do_now", "waiting", "optional"]);
    expect(plan.owed.map((o) => o.amountInr)).toEqual([1_700]);
    expect(plan.rulesVersion).toBe("2026-11-20");
  });

  it("missing facts come back ordered by impact, without duplicates", () => {
    const plan = planCase(facts({ entityType: "bank", txnType: "upi", problem: "failed_credit" }), TODAY);
    expect(plan.missing).toEqual(["txnDate", "complaintMode", "amountInr"]);
  });

  it("over ₹2 crore → suggests a lawyer or legal aid", () => {
    expect(planCase({ ...sunita, amountInr: 20_000_001 }, TODAY).banners.map((b) => b.id)).toContain("lawyer");
  });

  it("is pure: same input, same output; input not mutated", () => {
    const input = structuredClone(sunita);
    expect(planCase(input, TODAY)).toEqual(planCase(input, TODAY));
    expect(input).toEqual(sunita);
  });
});

describe("rule sources", () => {
  // A broad battery of plans touching every track and overlay.
  const battery: [Facts, string][] = [
    [sunita, TODAY],
    [upiWritten("2026-11-20"), TODAY],
    [upiWritten("2026-11-20", { entityResponse: "rejected", entityResponseDate: "2026-11-25" }), "2026-11-25"],
    [upiWritten("2026-06-20", { txnDate: "2026-06-15", entityType: "nbfc", amountInr: 30_000_000 }), "2028-07-01"],
    [upiWritten("2026-11-20"), "2027-03-15"],
    [facts({ entityType: "bank", txnType: "atm", problem: "no_cash", txnDate: "2026-11-10" }), TODAY],
    [facts({ entityType: "bank", problem: "unauthorised", txnDate: "2026-11-13", amountInr: 40_000 }), TODAY],
    [facts({ entityType: "bank", problem: "unauthorised", txnDate: "2026-11-13", complaintMode: "written", complaintDate: "2026-11-19", amountInr: 40_000, accountType: "bsbd" }), TODAY],
    [facts({ entityType: "bank", problem: "unauthorised", txnDate: "2027-01-01", complaintMode: "verbal", complaintDate: "2027-01-03", amountInr: 20_000 }), "2027-01-04"],
    [facts({ problem: "unauthorised" }), "2027-02-01"],
    [facts({ entityType: "ecommerce", problem: "refund", amountInr: 3_499, complaintMode: "written", complaintDate: "2026-10-01" }), TODAY],
    [facts({ entityType: "seller", problem: "defective", amountInr: 600_000, txnDate: "2024-01-01" }), TODAY],
    [facts({ entityType: "insurer", problem: "claim_rejected", amountInr: 6_000_000, complaintMode: "verbal" }), TODAY],
    [facts({ entityType: "insurer", complaintMode: "written", complaintDate: "2026-09-01", entityResponse: "none" }), "2027-09-25"],
    [facts({ entityType: "other" }), TODAY],
  ];

  it("#15 every ruleId used by planCase exists in sources.ts", () => {
    const used = new Set<string>();
    for (const [f, today] of battery) {
      const plan = planCase(f, today);
      plan.steps.forEach((s) => [s.ruleId, ...(s.moreRuleIds ?? [])].forEach((id) => used.add(id)));
      plan.banners.forEach((b) => used.add(b.ruleId));
      plan.owed.forEach((o) => used.add(o.ruleId));
      if (plan.fraud) used.add(plan.fraud.ruleId);
    }
    expect(used.size).toBeGreaterThan(15);
    for (const id of used) expect(RULE_BY_ID, id).toHaveProperty([id]);
  });

  it("every rule is well-formed: unique id, V/S only, official https source, valid dates", () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    for (const r of RULES) {
      expect(["V", "S"]).toContain(r.status);
      expect(r.sourceUrl).toMatch(/^https:\/\//);
      expect(r.summary.length).toBeGreaterThan(20);
      expect(isIsoDate(r.effectiveFrom)).toBe(true);
      if ("effectiveTo" in r) expect(r.effectiveTo > r.effectiveFrom).toBe(true);
    }
    for (const c of CONVENTIONS) for (const id of c.ruleIds) expect(RULE_BY_ID).toHaveProperty([id]);
  });

  it("the fraud rule sets hand over on 1 Jan 2027 with no gap", () => {
    expect(RULE_BY_ID["fraud2017.zero"].effectiveTo).toBe("2026-12-31");
    expect(RULE_BY_ID["fraud2027.zero"].effectiveFrom).toBe("2027-01-01");
  });
});
