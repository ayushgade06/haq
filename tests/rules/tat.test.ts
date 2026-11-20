import { describe, expect, it } from "vitest";
import { planCase } from "@/lib/rules";
import { tatOwed } from "@/lib/rules/tat";
import { facts, sunita, TODAY } from "../helpers";

const owed = (f: Parameters<typeof tatOwed>[0], today = TODAY) => tatOwed(f, today, []);

describe("failed-transaction compensation (TAT)", () => {
  it("#1 UPI not credited, 2 Nov, not reversed, today 20 Nov → due 3 Nov, 17 days late, ₹1,700", () => {
    const o = owed(sunita)!;
    expect(o.dueDate).toBe("2026-11-03");
    expect(o.daysLate).toBe(17);
    expect(o.amountInr).toBe(1_700);
    expect(o.ruleId).toBe("tat.upi_p2p");
  });

  it("#2 reversed on 10 Nov → compensation stops at reversal: ₹700", () => {
    const o = owed({ ...sunita, reversed: true, reversedDate: "2026-11-10" })!;
    expect(o.daysLate).toBe(7);
    expect(o.amountInr).toBe(700);
  });

  it("#3 ATM no cash on 10 Nov, today 20 Nov → due 15 Nov, ₹500", () => {
    const o = owed(facts({ entityType: "bank", txnType: "atm", problem: "no_cash", txnDate: "2026-11-10", reversed: false }))!;
    expect(o.dueDate).toBe("2026-11-15");
    expect(o.amountInr).toBe(500);
    expect(o.ruleId).toBe("tat.atm");
  });

  it("reversed on time → ₹0", () => {
    expect(owed({ ...sunita, reversed: true, reversedDate: "2026-11-03" })!.amountInr).toBe(0);
  });

  it("before the due date → ₹0 and says when compensation starts", () => {
    const o = owed(sunita, "2026-11-03")!;
    expect(o.amountInr).toBe(0);
    expect(o.formula).toContain("3 Nov 2026");
  });

  it.each([
    ["imps", "bank", "tat.imps", "2026-11-03"],
    ["wallet", "wallet", "tat.wallet", "2026-11-03"],
    ["card_present", "bank", "tat.pos", "2026-11-07"],
    ["card_online", "bank", "tat.card_not_present", "2026-11-07"],
    ["upi", "ecommerce", "tat.upi_merchant", "2026-11-07"],
  ] as const)("%s to a %s → %s, due %s", (txnType, entityType, ruleId, due) => {
    const o = owed({ ...sunita, txnType, entityType })!;
    expect(o.ruleId).toBe(ruleId);
    expect(o.dueDate).toBe(due);
  });

  it("net banking isn't covered by the circular → nothing owed", () => {
    expect(owed({ ...sunita, txnType: "netbanking" })).toBeNull();
  });

  it("reversed but date unknown → no figure; asks for the date", () => {
    const plan = planCase({ ...sunita, reversed: true, reversedDate: null }, TODAY);
    expect(plan.owed).toHaveLength(0);
    expect(plan.missing).toContain("reversedDate");
  });

  it("reversal unknown → counts as not reversed and asks", () => {
    const plan = planCase({ ...sunita, reversed: null }, TODAY);
    expect(plan.owed[0].amountInr).toBe(1_700);
    expect(plan.missing).toContain("reversed");
  });
});
