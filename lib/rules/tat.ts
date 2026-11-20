// Failed transactions: RBI/2019-20/67. Due = T + n days; after that ₹100/day, paid without asking.
import type { FactKey, Facts, Owed } from "../schema";
import { addDays, diffDays, fmtDate, inr, minDate } from "./dates";
import { RULE_BY_ID, type RuleId } from "./sources";

const PER_DAY_INR = 100;
const MERCHANTS = ["ecommerce", "seller", "service"];

export function tatRule(f: Facts): { ruleId: RuleId; days: number } | null {
  if (f.problem === "no_cash") return { ruleId: "tat.atm", days: 5 };
  if (f.problem !== "failed_credit") return null;
  switch (f.txnType) {
    case "atm":
      return { ruleId: "tat.atm", days: 5 };
    case "upi":
      return MERCHANTS.includes(f.entityType ?? "")
        ? { ruleId: "tat.upi_merchant", days: 5 }
        : { ruleId: "tat.upi_p2p", days: 1 };
    case "imps":
      return { ruleId: "tat.imps", days: 1 };
    case "card_present":
      return { ruleId: "tat.pos", days: 5 };
    case "card_online":
      return { ruleId: "tat.card_not_present", days: 5 };
    case "wallet":
      return { ruleId: "tat.wallet", days: 1 };
    default:
      return null; // netbanking/NEFT and others aren't in the circular
  }
}

export function tatOwed(f: Facts, today: string, missing: FactKey[]): Owed | null {
  const r = tatRule(f);
  if (!r) return null;
  if (!f.txnDate) {
    missing.push("txnDate");
    return null;
  }
  if (f.txnDate < RULE_BY_ID[r.ruleId].effectiveFrom) return null;
  // Haq convention: unknown reversal → count as not reversed, and ask.
  if (f.reversed === null) missing.push("reversed");
  if (f.reversed && !f.reversedDate) {
    missing.push("reversedDate");
    return null;
  }
  const dueDate = addDays(f.txnDate, r.days);
  // Compensation stops on the day the money came back.
  const end = f.reversed ? minDate(f.reversedDate!, today) : today;
  const daysLate = Math.max(0, diffDays(dueDate, end));
  const amountInr = daysLate * PER_DAY_INR;
  const formula =
    daysLate === 0
      ? `Not late yet. If not fixed by ${fmtDate(dueDate)} (T+${r.days}), the bank owes ${inr(PER_DAY_INR)} for each day after.`
      : `${inr(PER_DAY_INR)} × ${daysLate} day${daysLate === 1 ? "" : "s"} late after the T+${r.days} deadline (${fmtDate(dueDate)})${f.reversed ? `, until the money came back on ${fmtDate(f.reversedDate!)}` : ""} = ${inr(amountInr)}`;
  return { kind: "tat_compensation", amountInr, formula, dueDate, daysLate, ruleId: r.ruleId };
}
