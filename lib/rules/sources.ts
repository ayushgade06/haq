// Every rule the engine applies. Only values marked V (verified on an official page or PDF) or
// S (secondary source quoting the official text) in BLUEPRINT §7.4 live here. /rules renders this file.

export type Rule = {
  id: string;
  summary: string; // plain language, shown in "Why?" popovers and on /rules
  value: string;
  sourceUrl: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: "V" | "S";
};

export const LAST_VERIFIED = "2026-11-20";

const RBIOS = "https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/RBIOS01072026.pdf";
const TAT = "https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=11693";
const FRAUD_2017 = "https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=11040";
const FRAUD_2027 = "https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx?Id=13543";
const ECOM = "https://egazette.gov.in/WriteReadData/2020/220661.pdf";
const CPA = "https://egazette.gov.in/WriteReadData/2019/210422.pdf";
const TIERS =
  "https://consumeraffairs.nic.in/theconsumerprotection/consumer-protection-jurisdiction-district-commission-state-commission-and";
const FEES = "https://egazette.gov.in/WriteReadData/2023/248158.pdf";
const CIOINS = "https://cioins.co.in/Complaint/Online";

const RBIOS_FROM = "2026-07-01";
const TAT_FROM = "2019-10-15";
const IO_FROM = "2017-04-25";

export const RULES = [
  // ── RBI Integrated Ombudsman Scheme 2026 (in force 1 Jul 2026) ──
  {
    id: "rbios.approach_first",
    summary:
      "Before going to the RBI Ombudsman, complain to your bank or payment company in writing and keep proof. Then wait 30 days, unless they reject your complaint or reply unsatisfactorily sooner. Some payment-network rules allow longer waits; Haq doesn't model those.",
    value: "Complain in writing first, then wait 30 days",
    sourceUrl: RBIOS,
    effectiveFrom: RBIOS_FROM,
    status: "V",
  },
  {
    id: "rbios.window",
    summary:
      "File with the RBI Ombudsman within 90 days, counted from the later of: the end of the 30-day wait, or the bank's last reply.",
    value: "90 days",
    sourceUrl: RBIOS,
    effectiveFrom: RBIOS_FROM,
    status: "V",
  },
  {
    id: "rbios.non_maintainable",
    summary:
      "RBI closes a complaint without looking at it if: you didn't complain to the bank first; you filed before the wait ended or after the 90 days; the matter is already before a court, tribunal, arbitrator or another Ombudsman; it was filed through a lawyer; it is incomplete or frivolous; or it is outside RBI's purview.",
    value: "Closed without examination",
    sourceUrl: RBIOS,
    effectiveFrom: RBIOS_FROM,
    status: "V",
  },
  {
    id: "rbios.covered",
    summary:
      "Covers commercial banks, regional rural banks, co-operative banks (above size limits), deposit-taking or customer-facing NBFCs with assets of ₹100 crore or more (some exclusions), non-bank wallet and prepaid-card issuers, and credit information companies.",
    value: "Banks, larger NBFCs, wallets, credit bureaus",
    sourceUrl: RBIOS,
    effectiveFrom: RBIOS_FROM,
    status: "V",
  },
  {
    id: "rbios.awards",
    summary:
      "No limit on the disputed amount. The Ombudsman can also award up to ₹30 lakh for consequential loss, and up to ₹3 lakh for lost time, expenses and harassment.",
    value: "No cap on the disputed amount; up to ₹30 lakh + ₹3 lakh",
    sourceUrl: RBIOS,
    effectiveFrom: RBIOS_FROM,
    status: "V",
  },
  {
    id: "rbios.portal",
    summary: "File online at cms.rbi.org.in, or call RBI's toll-free number 14448.",
    value: "cms.rbi.org.in · 14448",
    sourceUrl: RBIOS,
    effectiveFrom: RBIOS_FROM,
    status: "V",
  },
  {
    id: "rbios.appeal",
    summary: "You can appeal an Ombudsman's award within 30 days. The Appellate Authority may allow 30 more days.",
    value: "30 days (+30)",
    sourceUrl: RBIOS,
    effectiveFrom: RBIOS_FROM,
    status: "V",
  },

  // ── Failed transactions: turnaround time (TAT) and automatic compensation, RBI/2019-20/67 ──
  // T = transaction date. Compensation is paid "suo moto": the bank must pay without being asked.
  {
    id: "tat.atm",
    summary:
      "ATM or micro-ATM: money debited but no cash came out. It must be reversed within 5 days (T+5). After that, the bank owes you ₹100 for every day of delay, without you asking.",
    value: "T+5 · then ₹100/day",
    sourceUrl: TAT,
    effectiveFrom: TAT_FROM,
    status: "V",
  },
  {
    id: "tat.card_to_card",
    summary: "Card-to-card transfer: debited but not credited. Fix within 1 day (T+1); then ₹100 per day of delay.",
    value: "T+1 · then ₹100/day",
    sourceUrl: TAT,
    effectiveFrom: TAT_FROM,
    status: "V",
  },
  {
    id: "tat.pos",
    summary:
      "Card used at a shop's machine (PoS): debited but the shop didn't get the money. Reverse within 5 days (T+5); then ₹100 per day of delay.",
    value: "T+5 · then ₹100/day",
    sourceUrl: TAT,
    effectiveFrom: TAT_FROM,
    status: "V",
  },
  {
    id: "tat.card_not_present",
    summary:
      "Card used online: debited but the merchant didn't get the money. Reverse within 5 days (T+5); then ₹100 per day of delay.",
    value: "T+5 · then ₹100/day",
    sourceUrl: TAT,
    effectiveFrom: TAT_FROM,
    status: "S",
  },
  {
    id: "tat.imps",
    summary:
      "IMPS (instant bank transfer): debited but the receiver wasn't credited. Fix within 1 day (T+1); then ₹100 per day of delay.",
    value: "T+1 · then ₹100/day",
    sourceUrl: TAT,
    effectiveFrom: TAT_FROM,
    status: "V",
  },
  {
    id: "tat.upi_p2p",
    summary:
      "UPI (India's instant-payment system) to a person: debited but they weren't credited. Fix within 1 day (T+1); after that the bank owes you ₹100 for every day of delay, without you asking.",
    value: "T+1 · then ₹100/day",
    sourceUrl: TAT,
    effectiveFrom: TAT_FROM,
    status: "V",
  },
  {
    id: "tat.upi_merchant",
    summary:
      "UPI to a shop or website: debited but the merchant didn't confirm. Reverse within 5 days (T+5); then ₹100 per day of delay.",
    value: "T+5 · then ₹100/day",
    sourceUrl: TAT,
    effectiveFrom: TAT_FROM,
    status: "V",
  },
  {
    id: "tat.wallet",
    summary:
      "Wallet or prepaid payment on the wallet's own network failed. Fix within 1 day (T+1); then ₹100 per day of delay.",
    value: "T+1 · then ₹100/day",
    sourceUrl: TAT,
    effectiveFrom: TAT_FROM,
    status: "V",
  },

  // ── Unauthorised electronic transactions: customer liability ──
  {
    id: "fraud2017.zero",
    summary:
      "For unauthorised transactions dated before 1 Jan 2027: you lose nothing if you report within 3 working days of the bank's alert, when the fraud was someone else's doing (not yours or the bank's). If the bank was at fault, you lose nothing at all.",
    value: "Report within 3 working days → zero liability",
    sourceUrl: FRAUD_2017,
    effectiveFrom: "2017-07-06",
    effectiveTo: "2026-12-31",
    status: "V",
  },
  {
    id: "fraud2017.limited",
    summary:
      "Reported on working day 4 to 7: your loss is capped at the lower of the transaction amount and ₹5,000 (basic savings/BSBD account); ₹10,000 (most savings accounts, wallets and prepaid cards, credit cards with a limit up to ₹5 lakh); or ₹25,000 (other accounts).",
    value: "Working days 4–7 → ₹5,000 / ₹10,000 / ₹25,000 cap",
    sourceUrl: FRAUD_2017,
    effectiveFrom: "2017-07-06",
    effectiveTo: "2026-12-31",
    status: "V",
  },
  {
    id: "fraud2017.resolution",
    summary:
      "The bank must put the disputed amount back in your account (a 'shadow credit') within 10 working days of your report, and resolve the complaint within 90 days.",
    value: "Shadow credit in 10 working days; resolve in 90 days",
    sourceUrl: FRAUD_2017,
    effectiveFrom: "2017-07-06",
    effectiveTo: "2026-12-31",
    status: "V",
  },
  {
    id: "fraud2027.zero",
    summary:
      "For unauthorised transactions dated on or after 1 Jan 2027: you lose nothing if you report within 5 calendar days.",
    value: "Report within 5 calendar days → zero liability",
    sourceUrl: FRAUD_2027,
    effectiveFrom: "2027-01-01",
    status: "V",
  },
  {
    id: "fraud2027.resolution",
    summary: "The bank must resolve a domestic fraud complaint within 45 days.",
    value: "45 days",
    sourceUrl: FRAUD_2027,
    effectiveFrom: "2027-01-01",
    status: "V",
  },
  {
    id: "fraud2027.small_value",
    summary:
      "Small frauds (loss up to ₹50,000): you can get back the lower of 85% of the loss and ₹25,000, once in your lifetime, if you report to 1930 or cybercrime.gov.in and to your bank within 5 days.",
    value: "85% of the loss, max ₹25,000, once per lifetime",
    sourceUrl: FRAUD_2027,
    effectiveFrom: "2027-01-01",
    status: "V",
  },

  // ── Consumer goods, services and e-commerce ──
  {
    id: "ecom.grievance",
    summary:
      "Online shops and marketplaces must have a grievance officer who acknowledges your complaint within 48 hours and resolves it within one month.",
    value: "Acknowledge in 48 hours; resolve in 1 month",
    sourceUrl: ECOM,
    effectiveFrom: "2020-07-23",
    status: "V",
  },
  {
    // Contact details: effectiveFrom is the date we last checked them.
    id: "nch.helpline",
    summary:
      "National Consumer Helpline (NCH): free and optional. It takes up your complaint with the company before you go to a commission. Call 1915 or 1800-11-4000, WhatsApp +91 8800001915, or use consumerhelpline.gov.in.",
    value: "1915 · WhatsApp +91 8800001915",
    sourceUrl: "https://consumerhelpline.gov.in",
    effectiveFrom: LAST_VERIFIED,
    status: "V",
  },
  {
    id: "cpa.limitation",
    summary:
      "File with a consumer commission within 2 years of when the problem happened (the 'cause of action'). A commission can accept a late complaint if you show a good reason.",
    value: "2 years",
    sourceUrl: CPA,
    effectiveFrom: "2020-07-20",
    status: "V",
  },
  {
    id: "cpa.commission_tiers",
    summary:
      "Which commission hears your case depends on what you paid: up to ₹50 lakh → District; above ₹50 lakh up to ₹2 crore → State; above ₹2 crore → National.",
    value: "≤ ₹50 lakh District · ≤ ₹2 crore State · above National",
    sourceUrl: TIERS,
    effectiveFrom: "2021-12-30",
    status: "V",
  },
  {
    id: "cpa.fee",
    summary:
      "Filing fee, by the amount you paid: nil up to ₹5 lakh; ₹200 (₹5–10 lakh); ₹400 (₹10–20 lakh); ₹1,000 (₹20–50 lakh). Above ₹50 lakh, see the official schedule.",
    value: "Nil up to ₹5 lakh",
    sourceUrl: FEES,
    effectiveFrom: "2023-08-17",
    status: "V",
  },
  {
    id: "cpa.ejagriti",
    summary: "File consumer complaints online at e-jagriti.gov.in. It replaced e-Daakhil from 1 Jan 2025.",
    value: "e-jagriti.gov.in",
    sourceUrl: "https://e-jagriti.gov.in",
    effectiveFrom: "2025-01-01",
    status: "V",
  },

  // ── Insurance: Insurance Ombudsman Rules 2017, as amended ──
  {
    id: "io.approach_first",
    summary:
      "Complain to your insurer in writing (or online) first. You can go to the Insurance Ombudsman if they reject it, reply unsatisfactorily, or don't reply within one month.",
    value: "Complain in writing first, then wait 1 month",
    sourceUrl: CIOINS,
    effectiveFrom: IO_FROM,
    status: "V",
  },
  {
    id: "io.window",
    summary:
      "File with the Insurance Ombudsman within one year of the insurer's decision, or of the end of the one-month wait.",
    value: "1 year",
    sourceUrl: CIOINS,
    effectiveFrom: IO_FROM,
    status: "V",
  },
  {
    id: "io.max_award",
    summary: "The Insurance Ombudsman can award up to ₹50 lakh.",
    value: "₹50 lakh",
    sourceUrl: CIOINS,
    effectiveFrom: IO_FROM,
    status: "S",
  },
  {
    // Contact details: effectiveFrom is the date we last checked them.
    id: "io.bima_bharosa",
    summary: "You can also escalate on IRDAI's Bima Bharosa portal (bimabharosa.irdai.gov.in) or call 155255.",
    value: "bimabharosa.irdai.gov.in · 155255",
    sourceUrl: "https://bimabharosa.irdai.gov.in",
    effectiveFrom: LAST_VERIFIED,
    status: "V",
  },
] as const satisfies readonly Rule[];

export type RuleId = (typeof RULES)[number]["id"];

export const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r])) as Record<RuleId, Rule>;

// Where the law is ambiguous, Haq picks a convention. Each is commented in code as "Haq convention:"
// and listed on /rules.
export const CONVENTIONS: { text: string; ruleIds: RuleId[] }[] = [
  {
    text: "Working days are Monday to Saturday, excluding Sundays and the 2nd and 4th Saturdays, counted from the day after the bank's alert. Public holidays are ignored, so allow for bank holidays.",
    ruleIds: ["fraud2017.zero", "fraud2017.limited", "fraud2017.resolution"],
  },
  {
    text: "We treat the transaction date as the date of the bank's alert, because alerts are usually instant. If your alert came later, change the date.",
    ruleIds: ["fraud2017.zero", "fraud2027.zero"],
  },
  {
    text: "Calendar days for the 5-day fraud window are counted from the day after the alert.",
    ruleIds: ["fraud2027.zero"],
  },
  {
    text: "If the company rejects or answers your complaint before the wait ends, you can escalate at once, and we count the filing window from that reply. This is the earlier, safer reading.",
    ruleIds: ["rbios.window", "io.window"],
  },
  {
    text: "A reply marked 'resolved' that you still dispute counts as an unsatisfactory reply.",
    ruleIds: ["rbios.approach_first", "io.approach_first"],
  },
  {
    text: "If your bank complaint is older than 1 Jul 2026, we still apply the current 90-day window. It is the safer reading.",
    ruleIds: ["rbios.window"],
  },
  {
    text: "Adding months: if the day doesn't exist in that month (31 Jan + 1 month), we use the month's last day.",
    ruleIds: ["ecom.grievance", "io.approach_first", "io.window", "cpa.limitation"],
  },
  {
    text: "48 hours is shown as 2 days after your complaint date.",
    ruleIds: ["ecom.grievance"],
  },
  {
    text: "The 2-year consumer limit is counted from the earliest date in your story (the transaction, otherwise your first complaint), so we never overstate the time you have left.",
    ruleIds: ["cpa.limitation"],
  },
  {
    text: "We suggest giving an online shop its one-month deadline before going to a commission. The law doesn't require it.",
    ruleIds: ["ecom.grievance", "cpa.limitation"],
  },
  {
    text: "If you don't say whether the money came back, we count compensation as if it hasn't, and ask you.",
    ruleIds: ["tat.upi_p2p", "tat.atm"],
  },
  {
    text: "If you report a fraud after the windows above, Haq's verified rules don't set your loss. Ask your bank in writing how it will apply its policy.",
    ruleIds: ["fraud2017.limited", "fraud2027.zero"],
  },
];
