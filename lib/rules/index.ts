// planCase(facts, today) → Plan. Pure, deterministic, runs in the browser, evals and tests.
// The AI never decides anything here: forum, eligibility, dates and money all come from this code.
import { EMPTY_FACTS, type Banner, type FactKey, type Facts, type Fraud, type Owed, type Plan, type Step, type Track } from "../schema";
import { bankingPlan } from "./banking";
import { consumerPlan } from "./consumer";
import { fraudOverlay } from "./fraud";
import { insurancePlan } from "./insurance";
import { LAST_VERIFIED } from "./sources";
import { tatOwed } from "./tat";

const has = (list: readonly string[], v: string | null) => v !== null && list.includes(v);
const BANK_ENTITIES = ["bank", "nbfc", "wallet"];
const BANK_PROBLEMS = ["failed_credit", "no_cash", "unauthorised"];
const BANK_TXNS = ["upi", "imps", "card_present", "card_online", "atm", "netbanking", "wallet"];
const MERCHANTS = ["ecommerce", "seller", "service"];
const CONSUMER_PROBLEMS = ["refund", "defective", "service"];

export function trackFor(f: Facts): Track {
  if (f.entityType === "insurer" || f.problem === "claim_rejected" || f.txnType === "claim") return "INSURANCE";
  // Failed payments and fraud go to the bank, even when the money was going to a shop.
  if (has(BANK_ENTITIES, f.entityType) || has(BANK_PROBLEMS, f.problem)) return "BANKING";
  if (has(MERCHANTS, f.entityType)) return "CONSUMER";
  if (f.entityType === null && has(BANK_TXNS, f.txnType)) return "BANKING";
  if (f.entityType === null && has(CONSUMER_PROBLEMS, f.problem)) return "CONSUMER";
  return "UNSUPPORTED";
}

// Which missing fact changes the plan most; follow-up questions are asked in this order.
const IMPACT: FactKey[] = [
  "entityType",
  "problem",
  "txnDate",
  "complaintMode",
  "complaintDate",
  "entityResponse",
  "entityResponseDate",
  "amountInr",
  "reversed",
  "reversedDate",
  "accountType",
];
const KIND_ORDER = { urgent: 0, warning: 1, info: 2 };
const LARGE_CLAIM_INR = 20_000_000;

export function planCase(input: Facts, today: string): Plan {
  const f: Facts = {
    ...EMPTY_FACTS,
    ...input,
    complaintMode: input.complaintMode ?? (input.complainedToEntity === false ? "none" : null),
  };
  const missing: FactKey[] = [];
  const track = trackFor(f);
  let steps: Step[] = [];
  let banners: Banner[] = [];
  const owed: Owed[] = [];
  let fraud: Fraud | undefined;

  if (track === "BANKING") {
    ({ steps, banners } = bankingPlan(f, today, missing));
    const tat = tatOwed(f, today, missing);
    if (tat) owed.push(tat);
    const fr = fraudOverlay(f, today, missing);
    fraud = fr.fraud;
    banners.push(...fr.banners);
    owed.push(...fr.owed);
  } else if (track === "CONSUMER") {
    ({ steps, banners } = consumerPlan(f, today, missing));
  } else if (track === "INSURANCE") {
    ({ steps, banners } = insurancePlan(f, today, missing));
  } else {
    if (f.entityType === null) missing.push("entityType");
    banners.push({
      id: "unsupported",
      kind: "info",
      text: "Haq can't route this kind of complaint yet. The National Consumer Helpline (call 1915) can point you to the right place, and free legal-aid services can help.",
      ruleId: "nch.helpline",
    });
  }

  if ((f.amountInr ?? 0) > LARGE_CLAIM_INR) {
    banners.push({
      id: "lawyer",
      kind: "warning",
      text: "This is a large amount (over ₹2 crore). Consider talking to a lawyer or a free legal-aid service before you file.",
      ruleId: "cpa.commission_tiers",
    });
  }
  const open = steps.some((s) => s.status === "do_now" || s.status === "file_by" || s.status === "waiting");
  const closed = steps.find((s) => s.status === "closed");
  if (closed && !open) {
    banners.push({
      id: "legal_aid",
      kind: "urgent",
      text: "Every filing window here has closed. Talk to a lawyer or a free legal-aid service about your options.",
      ruleId: closed.ruleId,
    });
  }

  const current =
    steps.find((s) => s.status === "do_now" || s.status === "file_by") ?? steps.find((s) => s.status === "waiting");

  return {
    track,
    today,
    rulesVersion: LAST_VERIFIED,
    steps,
    currentStepId: current?.id ?? null,
    banners: banners.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]),
    owed,
    fraud,
    missing: [...new Set(missing)].sort((a, b) => IMPACT.indexOf(a) - IMPACT.indexOf(b)),
  };
}
