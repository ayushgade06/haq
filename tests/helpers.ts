import { EMPTY_FACTS, type Facts } from "@/lib/schema";

export const TODAY = "2026-11-20";
export const facts = (f: Partial<Facts>): Facts => ({ ...EMPTY_FACTS, ...f });

/** Sunita (fictional): UPI ₹12,000 to her brother on 2 Nov, debited, not credited; told the branch verbally on 5 Nov. */
export const sunita = facts({
  entityName: "State Bank",
  entityType: "bank",
  txnType: "upi",
  problem: "failed_credit",
  amountInr: 12_000,
  txnDate: "2026-11-02",
  complainedToEntity: true,
  complaintMode: "verbal",
  complaintDate: "2026-11-05",
  reversed: false,
});

export const upiWritten = (complaintDate: string, more: Partial<Facts> = {}) =>
  facts({ ...sunita, complaintMode: "written", complaintDate, entityResponse: "none", ...more });
