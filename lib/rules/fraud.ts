// Unauthorised electronic transactions: customer liability.
// Transactions before 1 Jan 2027 → RBI/2017-18/15 (working days); from 1 Jan 2027 → RBI/2026-27/167 (calendar days).
import type { Banner, FactKey, Facts, Fraud, Owed } from "../schema";
import { addDays, addWorkingDays, diffDays, fmtDate, inr, workingDaysBetween } from "./dates";

const CAP_INR = { bsbd: 5_000, savings: 10_000, other: 25_000 } as const;
const SMALL_VALUE_MAX_INR = 50_000;
export const FRAUD_2027_FROM = "2027-01-01";

const HELPLINE = "call 1930 (India's cyber-fraud helpline) or report it at cybercrime.gov.in";

/** When the user reported to the bank. Any mode counts for the liability clock (banks must take phone reports). */
const reportedOn = (f: Facts) => (f.complaintDate && f.complaintMode !== "none" ? f.complaintDate : null);

export function fraudOverlay(
  f: Facts,
  today: string,
  missing: FactKey[],
): { fraud?: Fraud; banners: Banner[]; owed: Owed[] } {
  if (f.problem !== "unauthorised") return { banners: [], owed: [] };

  if (!f.txnDate) {
    missing.push("txnDate");
    const text = `Report this to your bank right now, and ${HELPLINE}. The sooner you report, the less you can lose.`;
    const ruleId = today >= FRAUD_2027_FROM ? "fraud2027.zero" : "fraud2017.zero";
    return { banners: [{ id: "fraud_report", kind: "urgent", text, ruleId }], owed: [] };
  }

  // Haq convention: the transaction date stands in for the date of the bank's alert (alerts are usually instant).
  const alert = f.txnDate;
  const rep = reportedOn(f);
  const asOf = rep ?? today; // not reported yet → "if you report today"
  let fraud: Fraud;

  if (alert < FRAUD_2027_FROM) {
    const day = workingDaysBetween(alert, asOf);
    // Haq convention: after working day 7 the circular's fixed caps don't apply; we don't state a loss.
    const liability = day <= 3 ? "zero" : day <= 7 ? "limited" : "not_fixed";
    let maxLossInr: number | null = liability === "zero" ? 0 : null;
    if (liability === "limited") {
      if (f.accountType) maxLossInr = Math.min(f.amountInr ?? Infinity, CAP_INR[f.accountType]);
      else missing.push("accountType");
    }
    fraud = {
      regime: "2017",
      reportedOn: rep,
      day,
      liability,
      maxLossInr,
      reportBy: addWorkingDays(alert, 3),
      ruleId: liability === "zero" ? "fraud2017.zero" : "fraud2017.limited",
    };
  } else {
    // Haq convention: the 5 calendar days are counted from the day after the alert.
    const day = Math.max(0, diffDays(alert, asOf));
    const zero = day <= 5;
    fraud = {
      regime: "2027",
      reportedOn: rep,
      day,
      liability: zero ? "zero" : "not_fixed",
      maxLossInr: zero ? 0 : null,
      reportBy: addDays(alert, 5),
      ruleId: "fraud2027.zero",
    };
  }

  const banners: Banner[] = [];
  if (!rep) {
    const when =
      today <= fraud.reportBy
        ? `Report by ${fmtDate(fraud.reportBy)} to keep your loss at zero.`
        : `The zero-loss window ended on ${fmtDate(fraud.reportBy)}. Report anyway, today.`;
    banners.push({ id: "fraud_report", kind: "urgent", text: `Report this to your bank right now, and ${HELPLINE}. ${when}`, ruleId: fraud.ruleId });
  } else {
    banners.push({
      id: "fraud_helpline",
      kind: "warning",
      text: `If you haven't yet, also ${HELPLINE}.`,
      ruleId: fraud.regime === "2027" ? "fraud2027.small_value" : "fraud2017.zero",
    });
  }
  if (fraud.regime === "2027" && f.amountInr !== null && f.amountInr <= SMALL_VALUE_MAX_INR) {
    banners.push({
      id: "small_value",
      kind: "info",
      text: "Small fraud (up to ₹50,000): you may be able to get back 85% of the loss, up to ₹25,000, once in your lifetime. You must report it to 1930 or cybercrime.gov.in and to your bank within 5 days.",
      ruleId: "fraud2027.small_value",
    });
  }

  const owed: Owed[] = [];
  if (rep && f.amountInr !== null && fraud.maxLossInr !== null && f.amountInr > fraud.maxLossInr) {
    const amountInr = f.amountInr - fraud.maxLossInr;
    const is2017 = fraud.regime === "2017";
    const dueDate = is2017 ? addWorkingDays(rep, 10) : addDays(rep, 45);
    const by = is2017
      ? `Your bank must credit it back (a "shadow credit") by ${fmtDate(dueDate)}, 10 working days after your report.`
      : `Your bank must resolve it by ${fmtDate(dueDate)}, 45 days after your report.`;
    owed.push({
      kind: "fraud_refund",
      amountInr,
      dueDate,
      ruleId: fraud.ruleId,
      formula: `${inr(f.amountInr)} taken − ${inr(fraud.maxLossInr)} your maximum loss (reported on ${is2017 ? "working " : ""}day ${fraud.day}) = ${inr(amountInr)}. ${by}`,
    });
  }

  return { fraud, banners, owed };
}
