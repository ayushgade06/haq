// Words shown in more than one place. Plain language, Grade 6–8.
import type { Track } from "./schema";

export const NOT_ADVICE = "Not legal advice. Haq explains procedure using official sources; you decide and file.";

// Worded exactly; never "rejected because of the wrong forum".
export const STAT =
  "Of 9.11 lakh complaints handled at RBI's central receipt centre in FY25, 7.84 lakh were closed as non-maintainable or non-complaints.";
export const STAT_SOURCE =
  "https://www.tribuneindia.com/news/business/rbi-ombudsman-sees-13-34-lakh-complaints-in-fy25-loans-credit-cards-dominate";

export const GLOSSARY = {
  UPI: "India's instant-payment system: money moves between bank accounts in seconds, from a phone.",
  IMPS: "Immediate Payment Service: India's round-the-clock instant bank transfer.",
  RBI: "Reserve Bank of India: the country's central bank, which regulates banks.",
  Ombudsman: "A free, independent official who settles complaints against banks or insurers.",
  NCH: "National Consumer Helpline: the government's free helpline for shopping and service complaints.",
  "e-Jagriti": "The government website for filing cases at consumer commissions (consumer courts).",
  NBFC: "A non-bank finance company, such as a loan app or lender.",
  lakh: "An Indian number unit: 1 lakh = 100,000. 1 crore = 100 lakh = 10 million.",
} as const;
export type GlossaryKey = keyof typeof GLOSSARY;

export const TRACK_LABEL: Record<Track, string> = {
  BANKING: "Banking & payments",
  CONSUMER: "Shopping & services",
  INSURANCE: "Insurance",
  UNSUPPORTED: "Outside what Haq covers",
};

export const LEGAL_AID_URL = "https://nalsa.gov.in";
