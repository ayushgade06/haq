// Banking & payments: RBI Integrated Ombudsman Scheme 2026 (in force 1 Jul 2026).
import type { Banner, FactKey, Facts, Status, Step } from "../schema";
import { commissionStep } from "./consumer";
import { addDays, diffDays, fmtDate, maxDate } from "./dates";
import type { RuleId } from "./sources";

const RBIOS_FROM = "2026-07-01";

export type Escalation = { unlocksOn: string; deadline: string; status: Status; projected: boolean };

/**
 * Complain in writing → wait → filing window. Shared by the RBI and Insurance Ombudsman.
 * Not yet complained in writing → dates are projected from today ("if you write today").
 */
export function escalation(
  f: Facts,
  today: string,
  missing: FactKey[],
  wait: (d: string) => string,
  window: (d: string) => string,
): Escalation | null {
  const written = f.complaintMode === "written";
  if (written && !f.complaintDate) {
    missing.push("complaintDate");
    return null;
  }
  const base = written ? f.complaintDate! : today;
  if (written && f.entityResponse === null) missing.push("entityResponse");
  // Haq convention: a reply marked "resolved" that the user still disputes counts as an unsatisfactory reply.
  const replied = written && f.entityResponse !== null && f.entityResponse !== "none";
  if (replied && !f.entityResponseDate) missing.push("entityResponseDate");
  const repliedOn = replied && f.entityResponseDate && f.entityResponseDate >= base ? f.entityResponseDate : null;

  const waitEnd = wait(base);
  // A rejection or unsatisfactory reply before the wait ends lets you escalate at once.
  const unlocksOn = repliedOn && repliedOn < waitEnd ? repliedOn : waitEnd;
  // The window runs from the later of the end of the wait and the last reply.
  // Haq convention: after an early reply, the wait ends at that reply, so we count from it (the earlier, safer reading).
  const deadline = window(repliedOn ? maxDate(unlocksOn, repliedOn) : unlocksOn);
  const status: Status = today < unlocksOn ? "waiting" : today <= deadline ? "file_by" : "closed";
  return { unlocksOn, deadline, status, projected: !written };
}

export function deadlineNear(e: Escalation | null, today: string, forum: string, ruleId: RuleId): Banner[] {
  if (!e || e.status !== "file_by" || e.projected) return [];
  const left = diffDays(today, e.deadline);
  if (left > 14) return [];
  const text =
    left === 0
      ? `Today is the last day to file with the ${forum}.`
      : `Only ${left} day${left === 1 ? "" : "s"} left to file with the ${forum}. The last day is ${fmtDate(e.deadline)}.`;
  return [{ id: "deadline_near", kind: "urgent", text, ruleId }];
}

export function bankingPlan(f: Facts, today: string, missing: FactKey[]): { steps: Step[]; banners: Banner[] } {
  if (f.problem === null) missing.push("problem");
  if (f.complaintMode === null) missing.push("complaintMode");
  const written = f.complaintMode === "written";

  const complain: Step = {
    id: "bank_complaint",
    title: f.problem === "unauthorised" ? "Report it to your bank in writing" : "Complain to your bank in writing",
    status: written ? "done" : "do_now",
    where: "Email your bank, or use the complaint form in its app or website. Keep the reference number.",
    detail: written
      ? "Done. Keep the reference number and a copy."
      : "Write to your bank by email or its online complaint form, and keep the reference number. A phone call or branch visit leaves no proof.",
    ruleId: "rbios.approach_first",
  };

  const e = escalation(f, today, missing, (d) => addDays(d, 30), (d) => addDays(d, 90));
  const rbi: Step = {
    id: "rbi_ombudsman",
    title: "File with the RBI Ombudsman",
    status: e?.status ?? "waiting",
    unlocksOn: e?.unlocksOn,
    deadline: e?.deadline,
    projected: e?.projected,
    where: "cms.rbi.org.in · toll-free 14448",
    url: "https://cms.rbi.org.in",
    detail: !e
      ? "Add the date you complained to your bank to see when you can file."
      : e.projected
        ? `Opens 30 days after you complain to your bank in writing. If you write today, you can file from ${fmtDate(e.unlocksOn)} until ${fmtDate(e.deadline)}.`
        : `${e.status === "waiting" ? "Opens" : "Opened"} on ${fmtDate(e.unlocksOn)}. Last day to file: ${fmtDate(e.deadline)}. File it yourself: RBI won't accept a complaint filed through a lawyer.`,
    ruleId: "rbios.window",
    moreRuleIds: ["rbios.approach_first", "rbios.non_maintainable", "rbios.portal", "rbios.awards"],
  };

  const alt = commissionStep(f, today, missing, "Alternative: Consumer Commission");
  alt.detail = `Instead of RBI, not at the same time. ${alt.detail}`;
  alt.moreRuleIds = [...(alt.moreRuleIds ?? []), "rbios.non_maintainable"];
  if (alt.status !== "closed" && rbi.status !== "closed") alt.status = "optional";

  const banners: Banner[] = [];
  if (f.complaintMode === "verbal") {
    banners.push({
      id: "written_proof",
      kind: "urgent",
      text: "Your complaint was only verbal. RBI needs proof that you complained to your bank in writing, so filing with RBI today would be rejected. Email your bank or use its complaint form today.",
      ruleId: "rbios.approach_first",
    });
  } else if (!written) {
    banners.push({
      id: "premature",
      kind: "warning",
      text: "Filing with RBI today would be rejected: complain to your bank in writing first.",
      ruleId: "rbios.non_maintainable",
    });
  } else if (e?.status === "waiting") {
    banners.push({
      id: "premature",
      kind: "warning",
      text: `Filing with RBI before ${fmtDate(e.unlocksOn)} would be closed as premature: your bank gets 30 days to reply.`,
      ruleId: "rbios.non_maintainable",
    });
  }
  banners.push(...deadlineNear(e, today, "RBI Ombudsman", "rbios.window"));
  if (written && f.complaintDate && f.complaintDate < RBIOS_FROM) {
    banners.push({
      id: "old_complaint",
      kind: "info",
      text: "You complained before RBI's new scheme started on 1 Jul 2026. Haq applies the current 90-day window, the safer reading.",
      ruleId: "rbios.window",
    });
  }
  if (f.entityType === "nbfc") {
    banners.push({
      id: "covered",
      kind: "info",
      text: "RBI's Ombudsman covers NBFCs (non-bank lenders) with assets of ₹100 crore or more, with some exclusions. Check that yours is covered.",
      ruleId: "rbios.covered",
    });
  }

  return { steps: [complain, rbi, alt], banners };
}
