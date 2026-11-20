// Date-only ISO strings (YYYY-MM-DD). All maths runs in UTC so a time zone can never shift a day.
// ISO strings compare correctly with < and >, so no date library is needed.

const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function isIsoDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const ms = toMs(d);
  return !Number.isNaN(ms) && fromMs(ms) === d; // rejects 2026-02-30, which some engines roll over
}

export const addDays = (d: string, n: number) => fromMs(toMs(d) + n * DAY_MS);

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export const diffDays = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / DAY_MS);

export function addMonths(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  // Haq convention: if the day doesn't exist in the target month (31 Jan + 1 month), use that month's last day.
  target.setUTCDate(Math.min(day, lastDay));
  return fromMs(target.getTime());
}

export const addYears = (d: string, n: number) => addMonths(d, 12 * n);

export const maxDate = (a: string, b: string) => (a > b ? a : b);
export const minDate = (a: string, b: string) => (a < b ? a : b);

// Haq convention: a working day is Mon–Sat, excluding Sundays and the 2nd and 4th Saturdays
// (RBI's bank-holiday pattern). Public holidays are ignored; the UI says "± bank holidays".
export function isWorkingDay(d: string): boolean {
  const date = new Date(toMs(d));
  const weekday = date.getUTCDay();
  const dom = date.getUTCDate();
  if (weekday === 0) return false;
  if (weekday === 6 && ((dom >= 8 && dom <= 14) || (dom >= 22 && dom <= 28))) return false;
  return true;
}

/** Working days in (from, to]: counting starts the day after `from`. */
export function workingDaysBetween(from: string, to: string): number {
  let n = 0;
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (isWorkingDay(d)) n++;
  return n;
}

/** The n-th working day after `d`. */
export function addWorkingDays(d: string, n: number): string {
  let x = d;
  while (n > 0) {
    x = addDays(x, 1);
    if (isWorkingDay(x)) n--;
  }
  return x;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** 2026-11-03 → "3 Nov 2026". Used in rule text; deterministic (no locale data). */
export function fmtDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

/** 500000 → "₹5,00,000" (Indian digit grouping). */
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
