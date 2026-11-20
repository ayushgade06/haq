import { describe, expect, it } from "vitest";
import { planCase } from "@/lib/rules";
import { facts, TODAY } from "../helpers";

// Kavya's parent (fictional): health claim rejected for a "pre-existing condition".
const kavya = facts({
  entityName: "SafeLife Health",
  entityType: "insurer",
  txnType: "claim",
  problem: "claim_rejected",
  amountInr: 180_000,
  txnDate: "2026-08-20",
  complainedToEntity: true,
  complaintMode: "written",
  complaintDate: "2026-09-01",
  entityResponse: "none",
});
const step = (plan: ReturnType<typeof planCase>, id: string) => plan.steps.find((s) => s.id === id)!;

describe("insurance track", () => {
  it("#11 complaint 1 Sep, no reply → Ombudsman unlocks 1 Oct; deadline 1 Oct 2027", () => {
    const plan = planCase(kavya, TODAY);
    expect(plan.track).toBe("INSURANCE");
    const o = step(plan, "insurance_ombudsman");
    expect(o.unlocksOn).toBe("2026-10-01");
    expect(o.deadline).toBe("2027-10-01");
    expect(o.status).toBe("file_by");
    expect(plan.currentStepId).toBe("insurance_ombudsman");
  });

  it("insurer rejected the complaint on 10 Sep → unlocks 10 Sep; deadline 10 Sep 2027", () => {
    const o = step(planCase({ ...kavya, entityResponse: "rejected", entityResponseDate: "2026-09-10" }, TODAY), "insurance_ombudsman");
    expect(o.unlocksOn).toBe("2026-09-10");
    expect(o.deadline).toBe("2027-09-10");
  });

  it("claim rejected but no grievance filed → complain first; Ombudsman projected from today", () => {
    const plan = planCase({ ...kavya, complainedToEntity: false, complaintMode: null, complaintDate: null }, TODAY);
    expect(step(plan, "insurer_complaint").status).toBe("do_now");
    const o = step(plan, "insurance_ombudsman");
    expect(o).toMatchObject({ status: "waiting", projected: true, unlocksOn: "2026-12-20", deadline: "2027-12-20" });
    expect(plan.banners.find((b) => b.id === "premature")?.text).toContain("rejected claim is not a rejected complaint");
  });

  it("verbal-only complaint → written-proof banner", () => {
    expect(planCase({ ...kavya, complaintMode: "verbal" }, TODAY).banners[0].id).toBe("written_proof");
  });

  it("claim over ₹50 lakh → Ombudsman award-cap note; Bima Bharosa always optional", () => {
    const plan = planCase({ ...kavya, amountInr: 6_000_000 }, TODAY);
    expect(plan.banners.map((b) => b.id)).toContain("max_award");
    expect(step(plan, "bima_bharosa").status).toBe("optional");
  });
});
