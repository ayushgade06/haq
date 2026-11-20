// Insurance: Insurance Ombudsman Rules 2017 (as amended) + IRDAI Bima Bharosa.
import type { Banner, FactKey, Facts, Step } from "../schema";
import { deadlineNear, escalation } from "./banking";
import { addMonths, addYears, fmtDate } from "./dates";

const MAX_AWARD_INR = 5_000_000;

export function insurancePlan(f: Facts, today: string, missing: FactKey[]): { steps: Step[]; banners: Banner[] } {
  if (f.complaintMode === null) missing.push("complaintMode");
  const written = f.complaintMode === "written";

  const complain: Step = {
    id: "insurer_complaint",
    title: "Complain to your insurer's grievance team in writing",
    status: written ? "done" : "do_now",
    where: "Your insurer's grievance email or online complaint form. Keep the reference number.",
    detail: written
      ? "Done. Keep the reference number and a copy."
      : "Write to the insurer's grievance team by email or online form. A rejected claim is not the same as a rejected complaint: the Ombudsman needs this step first.",
    ruleId: "io.approach_first",
  };

  const e = escalation(f, today, missing, (d) => addMonths(d, 1), (d) => addYears(d, 1));
  const ombudsman: Step = {
    id: "insurance_ombudsman",
    title: "File with the Insurance Ombudsman",
    status: e?.status ?? "waiting",
    unlocksOn: e?.unlocksOn,
    deadline: e?.deadline,
    projected: e?.projected,
    where: "cioins.co.in",
    url: "https://cioins.co.in/Complaint/Online",
    detail: !e
      ? "Add the date you complained to your insurer to see when you can file."
      : e.projected
        ? `Opens one month after you complain to your insurer in writing (sooner if they reject it). If you write today, you can file from ${fmtDate(e.unlocksOn)} until ${fmtDate(e.deadline)}.`
        : `${e.status === "waiting" ? "Opens" : "Opened"} on ${fmtDate(e.unlocksOn)}. Last day to file: ${fmtDate(e.deadline)}. The Ombudsman can award up to ₹50 lakh.`,
    ruleId: "io.window",
    moreRuleIds: ["io.approach_first", "io.max_award"],
  };

  const bima: Step = {
    id: "bima_bharosa",
    title: "Also escalate on Bima Bharosa (optional)",
    status: "optional",
    where: "bimabharosa.irdai.gov.in · call 155255",
    url: "https://bimabharosa.irdai.gov.in",
    detail: "IRDAI's grievance portal. You can use it alongside the steps above.",
    ruleId: "io.bima_bharosa",
  };

  const banners: Banner[] = [];
  if (f.complaintMode === "verbal") {
    banners.push({
      id: "written_proof",
      kind: "urgent",
      text: "Your complaint was only verbal. The Insurance Ombudsman needs proof that you complained to your insurer in writing. Email the insurer's grievance team today.",
      ruleId: "io.approach_first",
    });
  } else if (!written) {
    banners.push({
      id: "premature",
      kind: "warning",
      text:
        f.problem === "claim_rejected"
          ? "The Ombudsman would turn this away today: a rejected claim is not a rejected complaint. Complain to your insurer's grievance team in writing first."
          : "Complain to your insurer in writing first. The Ombudsman needs that step.",
      ruleId: "io.approach_first",
    });
  } else if (e?.status === "waiting") {
    banners.push({
      id: "premature",
      kind: "warning",
      text: `The Ombudsman opens on ${fmtDate(e.unlocksOn)}: your insurer gets one month to reply.`,
      ruleId: "io.approach_first",
    });
  }
  banners.push(...deadlineNear(e, today, "Insurance Ombudsman", "io.window"));
  if (f.amountInr !== null && f.amountInr > MAX_AWARD_INR) {
    banners.push({
      id: "max_award",
      kind: "info",
      text: "The Insurance Ombudsman can award at most ₹50 lakh, which is less than your claim.",
      ruleId: "io.max_award",
    });
  }

  return { steps: [complain, ombudsman, bima], banners };
}
