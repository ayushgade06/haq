import { describe, expect, it } from "vitest";
import { planCase } from "@/lib/rules";
import { commissionFor, filingFee } from "@/lib/rules/consumer";
import { facts, TODAY } from "../helpers";

// Arjun (fictional): ₹3,499 refund stuck after a return pickup; complained in the app on 1 Oct.
const arjun = facts({
  entityName: "ShopKart",
  entityType: "ecommerce",
  txnType: "purchase",
  problem: "refund",
  amountInr: 3_499,
  txnDate: "2026-09-25",
  complainedToEntity: true,
  complaintMode: "written",
  complaintDate: "2026-10-01",
  entityResponse: "none",
});
const step = (plan: ReturnType<typeof planCase>, id: string) => plan.steps.find((s) => s.id === id)!;

describe("consumer track", () => {
  it("#8 filing fee: ₹5,00,000 → nil; ₹5,00,001 → ₹200", () => {
    expect(filingFee(500_000)).toBe(0);
    expect(filingFee(500_001)).toBe(200);
    expect(filingFee(1_000_001)).toBe(400);
    expect(filingFee(5_000_000)).toBe(1_000);
    expect(filingFee(5_000_001)).toBeNull(); // band not verified → "see the official schedule"
  });

  it("#9 commission by consideration: ₹50,00,000 District; ₹50,00,001 State; ₹2,00,00,001 National", () => {
    expect(commissionFor(5_000_000)).toBe("District");
    expect(commissionFor(5_000_001)).toBe("State");
    expect(commissionFor(20_000_000)).toBe("State");
    expect(commissionFor(20_000_001)).toBe("National");
  });

  it("#10 e-commerce grievance 1 Oct, unresolved → ack by 48 h, redress by 1 Nov, NCH optional, commission by cause + 2 years", () => {
    const plan = planCase(arjun, TODAY);
    expect(plan.track).toBe("CONSUMER");
    const g = step(plan, "company_grievance");
    expect(g.status).toBe("done");
    expect(g.dates).toEqual([
      { label: "Must acknowledge by", date: "2026-10-03" },
      { label: "Must resolve by", date: "2026-11-01" },
    ]);
    expect(g.detail).toContain("48 hours");
    expect(step(plan, "nch").status).toBe("optional");
    const cc = step(plan, "consumer_commission");
    expect(cc.status).toBe("file_by");
    expect(cc.deadline).toBe("2028-09-25");
    expect(cc.detail).toContain("District");
    expect(cc.detail).toContain("Filing fee: nil");
    expect(plan.currentStepId).toBe("consumer_commission");
  });

  it("no transaction date → the 2-year clock runs from the complaint date", () => {
    expect(step(planCase({ ...arjun, txnDate: null }, TODAY), "consumer_commission").deadline).toBe("2028-10-01");
  });

  it("before the company's one-month deadline → commission waits until then (Haq suggestion)", () => {
    const cc = step(planCase(arjun, "2026-10-15"), "consumer_commission");
    expect(cc.status).toBe("waiting");
    expect(cc.unlocksOn).toBe("2026-11-01");
  });

  it("company already rejected it → no need to wait", () => {
    const plan = planCase({ ...arjun, entityResponse: "rejected", entityResponseDate: "2026-10-05" }, "2026-10-15");
    expect(step(plan, "consumer_commission").status).toBe("file_by");
  });

  it("not yet written to the company → grievance step is current; commission optional", () => {
    const plan = planCase({ ...arjun, complaintMode: "verbal" }, TODAY);
    expect(step(plan, "company_grievance").status).toBe("do_now");
    expect(step(plan, "consumer_commission").status).toBe("optional");
    expect(plan.currentStepId).toBe("company_grievance");
  });

  it("local seller (not e-commerce) → no grievance-officer step; NCH first", () => {
    const plan = planCase({ ...arjun, entityType: "seller", problem: "defective" }, TODAY);
    expect(plan.steps.map((s) => s.id)).toEqual(["nch", "consumer_commission"]);
    expect(plan.currentStepId).toBe("nch");
  });

  it("past the 2-year limit → closed + legal aid", () => {
    const plan = planCase(arjun, "2028-09-26");
    expect(step(plan, "consumer_commission").status).toBe("closed");
    expect(plan.banners.map((b) => b.id)).toContain("legal_aid");
  });
});
