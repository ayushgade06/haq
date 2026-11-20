import { describe, expect, it } from "vitest";
import { planCase } from "@/lib/rules";
import { facts, sunita, TODAY, upiWritten } from "../helpers";

const step = (plan: ReturnType<typeof planCase>, id: string) => plan.steps.find((s) => s.id === id)!;
const bannerIds = (plan: ReturnType<typeof planCase>) => plan.banners.map((b) => b.id);

describe("banking ladder (RB-IOS 2026)", () => {
  it("#4 written complaint 20 Nov, no reply, today 20 Nov → RBI waiting; unlocks 20 Dec; deadline 20 Mar 2027", () => {
    const plan = planCase(upiWritten("2026-11-20"), TODAY);
    const rbi = step(plan, "rbi_ombudsman");
    expect(rbi.status).toBe("waiting");
    expect(rbi.unlocksOn).toBe("2026-12-20");
    expect(rbi.deadline).toBe("2027-03-20");
    expect(rbi.projected).toBe(false);
    expect(bannerIds(plan)).toContain("premature");
  });

  it("#5 written 20 Nov, rejected 25 Nov → RBI unlocks 25 Nov; deadline 23 Feb 2027", () => {
    const plan = planCase(upiWritten("2026-11-20", { entityResponse: "rejected", entityResponseDate: "2026-11-25" }), "2026-11-25");
    const rbi = step(plan, "rbi_ombudsman");
    expect(rbi.unlocksOn).toBe("2026-11-25");
    expect(rbi.deadline).toBe("2027-02-23");
    expect(rbi.status).toBe("file_by");
    expect(plan.currentStepId).toBe("rbi_ombudsman");
  });

  it("a reply after the 30-day wait → window counts from that reply", () => {
    const plan = planCase(upiWritten("2026-11-20", { entityResponse: "unsatisfactory", entityResponseDate: "2027-01-10" }), "2027-01-10");
    const rbi = step(plan, "rbi_ombudsman");
    expect(rbi.unlocksOn).toBe("2026-12-20");
    expect(rbi.deadline).toBe("2027-04-10");
  });

  it("#6 verbal-only complaint → written-proof banner; step 1 do_now; RBI not yet unlockable", () => {
    const plan = planCase(sunita, TODAY);
    expect(bannerIds(plan)).toContain("written_proof");
    expect(plan.banners[0].kind).toBe("urgent");
    expect(step(plan, "bank_complaint").status).toBe("do_now");
    const rbi = step(plan, "rbi_ombudsman");
    expect(rbi.status).toBe("waiting");
    expect(rbi.projected).toBe(true); // "if you write today"
    expect(rbi.unlocksOn).toBe("2026-12-20");
    expect(rbi.deadline).toBe("2027-03-20");
    expect(plan.currentStepId).toBe("bank_complaint");
  });

  it("#7 today after the RBI deadline → RBI closed; consumer-commission alternative becomes the current step", () => {
    const plan = planCase(upiWritten("2026-07-01", { txnDate: "2026-06-25" }), TODAY); // deadline 29 Oct 2026
    expect(step(plan, "rbi_ombudsman").deadline).toBe("2026-10-29");
    expect(step(plan, "rbi_ombudsman").status).toBe("closed");
    const alt = step(plan, "consumer_commission");
    expect(alt.status).toBe("file_by");
    expect(alt.deadline).toBe("2028-06-25");
    expect(plan.currentStepId).toBe("consumer_commission");
  });

  it("the alternative stays optional while RBI is open", () => {
    expect(step(planCase(sunita, TODAY), "consumer_commission").status).toBe("optional");
  });

  it("no complaint at all → premature banner, step 1 do_now", () => {
    const plan = planCase({ ...sunita, complainedToEntity: false, complaintMode: null, complaintDate: null }, TODAY);
    expect(bannerIds(plan)).toContain("premature");
    expect(bannerIds(plan)).not.toContain("written_proof");
    expect(step(plan, "bank_complaint").status).toBe("do_now");
  });

  it("deadline within 14 days → urgent countdown banner", () => {
    const plan = planCase(upiWritten("2026-11-20"), "2027-03-15");
    expect(step(plan, "rbi_ombudsman").status).toBe("file_by");
    expect(plan.banners.find((b) => b.id === "deadline_near")?.text).toContain("5 days");
  });

  it("every window closed → legal-aid banner", () => {
    const plan = planCase(upiWritten("2026-07-01", { txnDate: "2026-06-25" }), "2028-07-01");
    expect(plan.steps.filter((s) => s.status === "closed").map((s) => s.id)).toEqual(["rbi_ombudsman", "consumer_commission"]);
    expect(bannerIds(plan)).toContain("legal_aid");
    expect(plan.currentStepId).toBeNull();
  });

  it("bank complaint before 1 Jul 2026 → note that the current 90-day window is applied", () => {
    expect(bannerIds(planCase(upiWritten("2026-06-20", { txnDate: "2026-06-15" }), TODAY))).toContain("old_complaint");
  });

  it("written complaint without a date → asks for it", () => {
    const plan = planCase(upiWritten(null as unknown as string), TODAY);
    expect(plan.missing[0]).toBe("complaintDate");
    expect(step(plan, "rbi_ombudsman").unlocksOn).toBeUndefined();
  });

  it("NBFC → covered-entity check", () => {
    expect(bannerIds(planCase(facts({ ...sunita, entityType: "nbfc" }), TODAY))).toContain("covered");
  });
});
