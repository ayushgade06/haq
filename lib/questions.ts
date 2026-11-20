// The facts card's fields, and which missing facts to ask about (≤ 3, in the order the rules engine ranks them).
import type { FactKey, Facts, Plan } from "./schema";

export type Field = {
  key: FactKey;
  label: string;
  kind: "text" | "select" | "date" | "money" | "bool";
  question: string;
  options?: [string, string][];
  /** Hide fields that don't apply to this case. */
  show?: (f: Facts) => boolean;
};

const MONEY_PROBLEMS = ["failed_credit", "no_cash", "refund", "unauthorised"];

export const FIELDS: Field[] = [
  {
    key: "entityType",
    label: "Complaint against",
    kind: "select",
    question: "Who is your complaint against?",
    options: [
      ["bank", "A bank"],
      ["wallet", "A wallet or prepaid card"],
      ["nbfc", "A loan company (NBFC)"],
      ["insurer", "An insurance company"],
      ["ecommerce", "An online shop or marketplace"],
      ["seller", "A shop or seller"],
      ["service", "A service provider"],
      ["other", "Someone else"],
    ],
  },
  { key: "entityName", label: "Company name", kind: "text", question: "What is the company's name?" },
  {
    key: "problem",
    label: "What went wrong",
    kind: "select",
    question: "What went wrong?",
    options: [
      ["failed_credit", "Paid, but it never reached them"],
      ["no_cash", "ATM took money, gave no cash"],
      ["unauthorised", "A payment I didn't make"],
      ["refund", "Refund not received"],
      ["defective", "Faulty, wrong or missing product"],
      ["service", "Service not given"],
      ["claim_rejected", "Insurance claim rejected"],
      ["other", "Something else"],
    ],
  },
  {
    key: "txnType",
    label: "How the money moved",
    kind: "select",
    question: "How did the money move?",
    options: [
      ["upi", "UPI"],
      ["imps", "IMPS bank transfer"],
      ["netbanking", "Net banking or NEFT"],
      ["card_present", "Card at a shop"],
      ["card_online", "Card online"],
      ["atm", "ATM"],
      ["wallet", "Wallet"],
      ["purchase", "A purchase"],
      ["claim", "An insurance claim"],
    ],
  },
  { key: "amountInr", label: "Amount", kind: "money", question: "How much money is involved?" },
  { key: "txnDate", label: "Date it happened", kind: "date", question: "On what date did the payment or purchase happen?" },
  {
    key: "complaintMode",
    label: "Complained to them?",
    kind: "select",
    question: "Have you complained to the company yet? How?",
    options: [
      ["written", "Yes, in writing (email, app, letter)"],
      ["verbal", "Only by phone or in person"],
      ["none", "Not yet"],
    ],
  },
  {
    key: "complaintDate",
    label: "Complaint date",
    kind: "date",
    question: "On what date did you complain?",
    show: (f) => f.complaintMode === "written" || f.complaintMode === "verbal",
  },
  {
    key: "entityResponse",
    label: "Their answer",
    kind: "select",
    question: "Has the company answered your written complaint?",
    options: [
      ["none", "No answer yet"],
      ["rejected", "Rejected it"],
      ["unsatisfactory", "Answered, but didn't fix it"],
      ["resolved", "Said it's resolved"],
    ],
    show: (f) => f.complaintMode === "written",
  },
  {
    key: "entityResponseDate",
    label: "Answer date",
    kind: "date",
    question: "On what date did they answer?",
    show: (f) => f.complaintMode === "written" && f.entityResponse !== null && f.entityResponse !== "none",
  },
  {
    key: "reversed",
    label: "Money came back?",
    kind: "bool",
    question: "Has the money come back to your account?",
    show: (f) => MONEY_PROBLEMS.includes(f.problem ?? ""),
  },
  { key: "reversedDate", label: "Date it came back", kind: "date", question: "On what date did the money come back?", show: (f) => f.reversed === true },
  {
    key: "accountType",
    label: "Account or card",
    kind: "select",
    question: "What kind of account or card was it?",
    options: [
      ["bsbd", "Basic savings or Jan Dhan account"],
      ["savings", "Savings account, wallet or credit card"],
      ["other", "Current or business account"],
    ],
    show: (f) => f.problem === "unauthorised",
  },
];

export const FIELD = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<string, Field | undefined>;

export const followUps = (plan: Plan): Field[] =>
  plan.missing.map((k) => FIELD[k]).filter((f): f is Field => !!f).slice(0, 3);

/** Keep complainedToEntity consistent with the mode the user picks. */
export function applyEdit(f: Facts, key: FactKey, value: unknown): Facts {
  const next = { ...f, [key]: value } as Facts;
  if (key === "complaintMode") next.complainedToEntity = value === null ? null : value !== "none";
  if (key === "reversed" && value !== true) next.reversedDate = null;
  return next;
}
