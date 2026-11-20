import { z } from "zod";
import { isIsoDate } from "./rules/dates";
import type { RuleId } from "./rules/sources";

const isoDate = z.string().refine(isIsoDate, "Use a real date, YYYY-MM-DD");

export const ENTITY_TYPES = ["bank", "nbfc", "wallet", "insurer", "ecommerce", "seller", "service", "other"] as const;
export const TXN_TYPES = ["upi", "imps", "card_present", "card_online", "atm", "netbanking", "wallet", "purchase", "claim"] as const;
export const PROBLEMS = ["failed_credit", "no_cash", "refund", "unauthorised", "claim_rejected", "defective", "service", "other"] as const;
// Fraud liability caps (RBI/2017-18/15): bsbd ₹5,000 · savings = most savings accounts, wallets, cards ≤ ₹5L limit ₹10,000 · other ₹25,000
export const ACCOUNT_TYPES = ["bsbd", "savings", "other"] as const;

/** Plain fact values: what the rules engine reads. null = unknown. No field holds a full account or card number. */
export const FactsSchema = z.object({
  issueSummary: z.string().nullable(),
  entityName: z.string().nullable(),
  entityType: z.enum(ENTITY_TYPES).nullable(),
  txnType: z.enum(TXN_TYPES).nullable(),
  problem: z.enum(PROBLEMS).nullable(),
  amountInr: z.number().nonnegative().nullable(),
  txnDate: isoDate.nullable(),
  complainedToEntity: z.boolean().nullable(),
  complaintMode: z.enum(["written", "verbal", "none"]).nullable(),
  complaintDate: isoDate.nullable(),
  entityResponse: z.enum(["none", "rejected", "unsatisfactory", "resolved"]).nullable(),
  entityResponseDate: isoDate.nullable(),
  reversed: z.boolean().nullable(),
  reversedDate: isoDate.nullable(),
  accountType: z.enum(ACCOUNT_TYPES).nullable(),
});
export type Facts = z.infer<typeof FactsSchema>;
export type FactKey = keyof Facts;

export const EMPTY_FACTS: Facts = {
  issueSummary: null,
  entityName: null,
  entityType: null,
  txnType: null,
  problem: null,
  amountInr: null,
  txnDate: null,
  complainedToEntity: null,
  complaintMode: null,
  complaintDate: null,
  entityResponse: null,
  entityResponseDate: null,
  reversed: null,
  reversedDate: null,
  accountType: null,
};

// ── Plan: the output of planCase(facts, today). Every Step, Banner and Owed cites a rule. ──

export type Track = "BANKING" | "CONSUMER" | "INSURANCE" | "UNSUPPORTED";
export type Status = "do_now" | "waiting" | "file_by" | "closed" | "optional" | "done";

export type Step = {
  id: string;
  title: string;
  status: Status;
  detail: string;
  where?: string;
  url?: string;
  unlocksOn?: string;
  deadline?: string;
  /** Dates counted from today because the user hasn't done the earlier step yet. */
  projected?: boolean;
  /** The company's own deadlines (e.g. acknowledge / resolve by). */
  dates?: { label: string; date: string }[];
  ruleId: RuleId;
  /** Further rules this step relies on (shown in the "Why?" popover). */
  moreRuleIds?: RuleId[];
};

export type Banner = {
  id: string;
  kind: "urgent" | "warning" | "info";
  text: string;
  ruleId: RuleId;
};

export type Owed = {
  kind: "tat_compensation" | "fraud_refund";
  amountInr: number;
  formula: string;
  dueDate: string;
  daysLate?: number;
  ruleId: RuleId;
};

export type Fraud = {
  regime: "2017" | "2027";
  /** Date reported to the bank, or null if not yet (then day/liability are "if you report today"). */
  reportedOn: string | null;
  /** Working days (2017) or calendar days (2027) from the alert to the report. */
  day: number;
  liability: "zero" | "limited" | "not_fixed";
  maxLossInr: number | null;
  /** Last day to report for zero liability. */
  reportBy: string;
  ruleId: RuleId;
};

export type Plan = {
  track: Track;
  today: string;
  rulesVersion: string;
  steps: Step[];
  currentStepId: string | null;
  banners: Banner[];
  owed: Owed[];
  fraud?: Fraud;
  /** Facts the rules needed but didn't have, most important first. */
  missing: FactKey[];
};
