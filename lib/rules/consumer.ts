// Consumer goods, services and e-commerce: E-Commerce Rules 2020, NCH, Consumer Protection Act 2019.
import type { Banner, FactKey, Facts, Step } from "../schema";
import { addDays, addMonths, addYears, fmtDate, inr } from "./dates";

export type Commission = "District" | "State" | "National";

/** By consideration paid (G.S.R. 912(E)). */
export const commissionFor = (amountInr: number): Commission =>
  amountInr <= 5_000_000 ? "District" : amountInr <= 20_000_000 ? "State" : "National";

/** Filing fee in ₹ (G.S.R. 606(E)). Only the bands up to ₹50 lakh are verified; above that → null. */
export function filingFee(amountInr: number): number | null {
  if (amountInr <= 500_000) return 0;
  if (amountInr <= 1_000_000) return 200;
  if (amountInr <= 2_000_000) return 400;
  if (amountInr <= 5_000_000) return 1_000;
  return null;
}

/** Consumer Commission via e-Jagriti. Status is file_by or closed; callers may soften it. */
export function commissionStep(f: Facts, today: string, missing: FactKey[], title = "File with the Consumer Commission"): Step {
  // Haq convention: the 2-year clock starts at the earliest date we know (transaction, else first complaint),
  // so we never overstate the time left.
  const cause = f.txnDate ?? f.complaintDate;
  if (!cause) missing.push("txnDate");
  if (f.amountInr === null) missing.push("amountInr");
  const deadline = cause ? addYears(cause, 2) : undefined;
  const amount = f.amountInr;
  const tier = amount !== null ? commissionFor(amount) : null;
  const fee = amount !== null ? filingFee(amount) : null;
  const feeText = amount === null ? "depends on the amount" : fee === 0 ? "nil" : fee ? inr(fee) : "see the official fee schedule";
  return {
    id: "consumer_commission",
    title,
    status: deadline && today > deadline ? "closed" : "file_by",
    deadline,
    where: `${tier ?? "Consumer"} Commission · e-jagriti.gov.in`,
    url: "https://e-jagriti.gov.in",
    detail: `${tier ? `Goes to the ${tier} Commission (you paid ${inr(amount!)}). ` : ""}Filing fee: ${feeText}. File within 2 years${deadline ? `, by ${fmtDate(deadline)}` : ""}.`,
    ruleId: "cpa.limitation",
    moreRuleIds: ["cpa.commission_tiers", "cpa.fee", "cpa.ejagriti"],
  };
}

export function consumerPlan(f: Facts, today: string, missing: FactKey[]): { steps: Step[]; banners: Banner[] } {
  const steps: Step[] = [];
  const ecom = f.entityType === "ecommerce";
  let resolveBy: string | undefined;

  if (ecom) {
    if (f.complaintMode === null) missing.push("complaintMode");
    const written = f.complaintMode === "written";
    if (written && !f.complaintDate) missing.push("complaintDate");
    const filed = written && f.complaintDate ? f.complaintDate : null;
    resolveBy = filed ? addMonths(filed, 1) : undefined;
    steps.push({
      id: "company_grievance",
      title: "Write to the company's grievance officer",
      status: written ? "done" : "do_now",
      // Haq convention: 48 hours is shown as 2 days after the complaint date.
      dates: filed
        ? [
            { label: "Must acknowledge by", date: addDays(filed, 2) },
            { label: "Must resolve by", date: resolveBy! },
          ]
        : undefined,
      where: "Look for 'Grievance officer' or 'Contact us' on the website or app. Keep the ticket number.",
      detail: written
        ? "Done. The company must acknowledge within 48 hours and resolve within one month."
        : "Write to the grievance officer by email or the app's complaint form. A phone call leaves no proof. They must acknowledge within 48 hours and resolve within one month.",
      ruleId: "ecom.grievance",
    });
  }

  steps.push({
    id: "nch",
    title: "Call the National Consumer Helpline (free, optional)",
    status: ecom ? "optional" : "do_now",
    where: "Call 1915 or 1800-11-4000 · WhatsApp +91 8800001915",
    url: "https://consumerhelpline.gov.in",
    detail: "A free government helpline. It takes up your complaint with the company before you go to a commission.",
    ruleId: "nch.helpline",
  });

  const cc = commissionStep(f, today, missing);
  const companyAnswered = f.entityResponse === "rejected" || f.entityResponse === "unsatisfactory";
  if (cc.status !== "closed") {
    if (ecom && steps[0].status !== "done") cc.status = "optional";
    else if (resolveBy && today < resolveBy && !companyAnswered) {
      // Haq convention: suggest giving the company its one-month deadline first. The law doesn't require it.
      cc.status = "waiting";
      cc.unlocksOn = resolveBy;
      cc.detail = `We suggest giving the company until ${fmtDate(resolveBy)} to fix it first (the law doesn't require this). ${cc.detail}`;
    }
  }
  steps.push(cc);
  return { steps, banners: [] };
}
