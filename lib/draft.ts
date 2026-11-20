// Client-safe draft helpers: split the streamed text into portal fields, and a static template fallback.
import { fmtDate, inr } from "./rules/dates";
import type { Facts, Plan, Step } from "./schema";

export type DraftFields = { subject: string; description: string; relief: string; documents: string };

const LABELS: [keyof DraftFields, string][] = [
  ["subject", "SUBJECT:"],
  ["description", "DESCRIPTION:"],
  ["relief", "RELIEF SOUGHT:"],
  ["documents", "DOCUMENTS TO ATTACH:"],
];

/** Works on partial (streaming) text too: sections fill in as they arrive. Tolerates **bold** labels. */
export function splitDraft(text: string): DraftFields {
  const out: DraftFields = { subject: "", description: "", relief: "", documents: "" };
  const found = LABELS.map(([key, label]) => {
    const m = new RegExp(`^[ \\t*#]*${label.replace(/ /g, "\\s+")}\\**[ \\t]*`, "m").exec(text);
    return m ? { key, start: m.index, bodyStart: m.index + m[0].length } : null;
  })
    .filter((x) => x !== null)
    .sort((a, b) => a.start - b.start);
  found.forEach((f, i) => {
    const end = i + 1 < found.length ? found[i + 1].start : text.length;
    out[f.key] = text.slice(f.bodyStart, end).replace(/\[\[HAQ_DRAFT_FAILED\]\]/g, "").trim();
  });
  return out;
}

export const DRAFT_FAILED = "[[HAQ_DRAFT_FAILED]]";

export const toText = (d: DraftFields) =>
  `SUBJECT: ${d.subject}\n\nDESCRIPTION:\n${d.description}\n\nRELIEF SOUGHT:\n${d.relief}\n\nDOCUMENTS TO ATTACH:\n${d.documents}`;

const PROBLEM_TEXT: Record<string, string> = {
  failed_credit: "money debited but not credited to the receiver",
  no_cash: "ATM debited my account but gave no cash",
  refund: "refund not received",
  unauthorised: "unauthorised transaction on my account",
  claim_rejected: "insurance claim rejected",
  defective: "defective product",
  service: "service not provided",
  other: "unresolved complaint",
};

/** Deterministic fallback when the model is unavailable. Placeholders for anything unknown; nothing invented. */
export function templateDraft(f: Facts, plan: Plan, step: Step): DraftFields {
  const who = f.entityName ?? "[COMPANY NAME]";
  const amount = f.amountInr !== null ? inr(f.amountInr) : "[AMOUNT]";
  const date = f.txnDate ? fmtDate(f.txnDate) : "[DATE OF TRANSACTION]";
  const problem = PROBLEM_TEXT[f.problem ?? "other"];
  const complained =
    f.complaintMode === "written" && f.complaintDate
      ? `I complained to ${who} in writing on ${fmtDate(f.complaintDate)} (reference [COMPLAINT REFERENCE NUMBER]).`
      : f.complaintMode === "verbal"
        ? `I raised this with ${who} by phone/in person${f.complaintDate ? ` on ${fmtDate(f.complaintDate)}` : ""}, and I am now putting it in writing.`
        : "";
  const owed = plan.owed.map((o) => o.formula).join(" ");
  const description = [
    `I am writing about a ${problem}. On ${date}, ${amount} was involved in a ${f.txnType ? f.txnType.replace("_", " ") : "[TYPE OF PAYMENT]"} transaction from my account ending [ACCOUNT LAST 4 DIGITS].`,
    f.reversed ? `The money came back on ${f.reversedDate ? fmtDate(f.reversedDate) : "[DATE]"}.` : "The issue is still not resolved.",
    complained,
    owed ? `Under the rules, ${owed}` : "",
    `I request you to resolve this in line with the applicable rules.`,
  ]
    .filter(Boolean)
    .join(" ");
  const relief = [
    `1. Resolve my complaint and credit ${amount} back to me${f.reversed ? " (if not already done)" : ""}.`,
    ...plan.owed.filter((o) => o.amountInr > 0).map((o, i) => `${i + 2}. Pay ${inr(o.amountInr)} as per the rules.`),
    `${plan.owed.filter((o) => o.amountInr > 0).length + 2}. Confirm the resolution to me in writing.`,
  ].join("\n");
  return {
    subject: `${problem[0].toUpperCase()}${problem.slice(1)}: ${amount} on ${date}`,
    description: `To ${step.id.includes("ombudsman") ? "the Ombudsman" : `${who}`}: ${description}\n\n[YOUR FULL NAME]\n[YOUR PHONE NUMBER]`,
    relief,
    documents: "- Bank statement or screenshot showing the transaction\n- Copy of my earlier complaint and any reply\n- Any reference or ticket numbers",
  };
}
