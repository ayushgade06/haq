// Case state lives in the browser only: the URL hash says which case, sessionStorage holds it.
// Nothing is stored on a server. A share link puts the facts (never the story) in the hash.
import { EMPTY_FACTS, FactsSchema, type CaseMeta, type Facts } from "./schema";

export type CaseState = {
  facts: Facts;
  meta: CaseMeta;
  story?: string;
  sampleId?: string;
  /** Samples are planned as of a fixed date unless the user switches to today. */
  asOf?: string;
  dropped?: number;
  /** True once the user changed a fact (precomputed sample drafts no longer match). */
  edited?: boolean;
};

const KEY = "haq:case";

export function saveCase(c: CaseState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
}

export function loadCase(): CaseState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CaseState) : null;
  } catch {
    return null;
  }
}

const toB64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64Url = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

/** Facts only: the story never goes into a link. */
export function encodeFacts(f: Facts): string {
  const compact = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== null && k !== "issueSummary"));
  return toB64Url(JSON.stringify(compact));
}

export function decodeFacts(s: string): Facts | null {
  try {
    const parsed = FactsSchema.safeParse({ ...EMPTY_FACTS, ...JSON.parse(fromB64Url(s)) });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The user's local date, YYYY-MM-DD. */
export const localToday = () => new Date().toLocaleDateString("en-CA");
