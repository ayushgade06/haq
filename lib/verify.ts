// Evidence verification: every fact must quote the story. If the quote isn't found, the fact is dropped (null).
import { isIsoDate } from "./rules/dates";
import { EMPTY_FACTS, FactsSchema, type ExtractedFacts, type FactKey } from "./schema";

export type RawFact = { name: string; value: string; evidence: string; estimated: boolean };

/** NFC, straight quotes, collapsed whitespace, lower case. Applied to both story and evidence. */
export const normalise = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[‘’‚‛′`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const DATE_KEYS: FactKey[] = ["txnDate", "complaintDate", "entityResponseDate", "reversedDate"];

/** Parse a model string into the fact's type; undefined if invalid. */
function coerce(name: FactKey, raw: string, today: string): unknown {
  const v = raw.trim();
  let value: unknown = v;
  if (name === "amountInr") value = Number(v.replace(/[^\d.]/g, ""));
  else if (name === "complainedToEntity" || name === "reversed") value = v === "true" ? true : v === "false" ? false : undefined;
  else if (DATE_KEYS.includes(name) && (!isIsoDate(v) || v > today)) return undefined;
  if (name === "amountInr" && !(Number.isFinite(value) && (value as number) > 0)) return undefined;
  const parsed = FactsSchema.shape[name].safeParse(value);
  return parsed.success && parsed.data !== null ? parsed.data : undefined;
}

export function verifyFacts(
  raw: { issueSummary: string; facts: RawFact[] },
  story: string,
  today: string,
): { facts: ExtractedFacts; dropped: number } {
  const haystack = normalise(story);
  const facts = Object.fromEntries(Object.keys(EMPTY_FACTS).map((k) => [k, null])) as ExtractedFacts;
  let dropped = 0;

  for (const f of raw.facts) {
    const name = f.name as FactKey;
    if (!(name in EMPTY_FACTS) || name === "issueSummary" || facts[name]) continue; // first mention wins
    const quote = normalise(f.evidence);
    const value = coerce(name, f.value, today);
    if (!quote || !haystack.includes(quote) || value === undefined) {
      dropped++;
      continue;
    }
    // A date whose words contain no digit ("kal", "last week") was resolved by the model: mark it estimated.
    const estimated = f.estimated || (DATE_KEYS.includes(name) && !/\d/.test(f.evidence));
    (facts as Record<FactKey, unknown>)[name] = { value, evidence: f.evidence, estimated };
  }

  const summary = raw.issueSummary.trim().slice(0, 240);
  facts.issueSummary = summary ? { value: summary, evidence: null, estimated: false } : null;
  return { facts, dropped };
}
