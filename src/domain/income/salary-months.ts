/**  THE MONTHS A WAGE WAS PAID IN — keyed by the month itself, never by a slot.
 *
 *  `salaryByMonth` was twelve positions meaning January to December. That works for exactly one
 *  question: what does this calendar year look like. It cannot answer the one the approved base-pay
 *  screen asks — the fourteen months from last month forward — because such a window crosses a year
 *  boundary, and slot 0 cannot mean both January and July.
 *
 *  So the store is keyed: '2026-07' → amount. Everything above keeps asking for a calendar year and
 *  gets the same twelve numbers it always did, which is why this change moves no arithmetic at all.
 *  An older twelve-slot table is read as the calendar year the person is in now — which is how it has
 *  always been read, so nobody's figures move on the day they update.
 *
 *  Founder ruling 2026-08-27: this goes in alone and first, because everything else needs it and it
 *  is the only change in the plan that can be verified without any new maths in the way.
 */
import type { OnboardingProfile } from '../onboardingProfile';
import { toNum } from '../_shared/num';

/** 'YYYY-MM' for a date, read from the local clock — never toISOString, which is UTC. */
/* ─ MK-CF-F-163 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthKey
 *
 * Answers ..... 'YYYY-MM' for a date, read from the local clock — never toISOString, which is UTC.
 *
 * Formula .....
 *     `${get full year()}-${string(get month() + 1).pad start(2, '0')}`
 *
 * Called by ... MK-CF-F-164 monthWindow
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-163 monthKey · MK-CF-F-164 monthWindow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-163
 * Changed ..... not in git yet (—)
 */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** `count` month keys starting `back` months before `from` — the shape the base-pay table needs.
 *  Fourteen months from last month is monthWindow(new Date(), 1, 14). */
/* ─ MK-CF-F-164 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthWindow
 *
 * Answers ..... `count` month keys starting `back` months before `from` — the shape the base-pay table needs.
 *
 * Formula .....
 *     out = []
 *     d = the date from.get full year(), from.get month() − back + i, 1
 *     the answer = out
 *
 * Called by ... MK-CF-F-163 monthKey
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-163 monthKey · MK-CF-F-164 monthWindow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-164
 * Changed ..... not in git yet (—)
 */
export function monthWindow(from: Date, back: number, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() - back + i, 1);
    out.push(monthKey(d));
  }
  return out;
}

/** THE canonical table: month key → amount, whatever shape it was stored in.
 *
 *  Returns an empty object when the person's pay does not vary — an empty table and a table of zeros
 *  are different answers, and only one of them means "they told us nothing". */
/* ─ MK-CF-F-165 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * salaryMonths
 *
 * Answers ..... THE canonical table: month key → amount, whatever shape it was stored in.
 *
 * Formula .....
 *     raw = (op ?? ({} as any)).salary by month
 *     out = {}
 *     y = now.get full year()
 *     out = {}
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-CF-F-166 hasMonthlySalaryTable · MK-CF-F-167 salaryCalendarYear
 *               MK-CF-F-168 salaryWindow · MK-CF-F-169 withSalaryMonth
 *               MK-CF-F-179 entryFromWage
 *
 * Reaches ..... 150 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 132 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-165
 * Changed ..... not in git yet (—)
 */
export function salaryMonths(op: OnboardingProfile | null, now: Date = new Date()): Record<string, number> {
  const raw = (op ?? ({} as any)).salaryByMonth;
  if (raw && !Array.isArray(raw) && typeof raw === 'object') {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) if (/^\d{4}-\d{2}$/.test(k)) out[k] = toNum(v as any);
    return out;
  }
  // An older twelve-slot table: positions 0–11 are January to December of the year they are in now.
  if (Array.isArray(raw) && raw.length === 12) {
    const y = now.getFullYear();
    const out: Record<string, number> = {};
    raw.forEach((v, i) => { out[`${y}-${String(i + 1).padStart(2, '0')}`] = toNum(v); });
    return out;
  }
  return {};
}

/** Did they tell us their pay varies month to month? */
/* ─ MK-CF-F-166 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * hasMonthlySalaryTable
 *
 * Answers ..... Did they tell us their pay varies month to month?
 *
 * Formula .....
 *     object.keys(salary months(op)).length > 0
 *
 * Called by ... MK-CF-F-177 wageGrossByMonth
 *
 * Reaches ..... 145 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 127 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-166
 * Changed ..... not in git yet (—)
 */
export function hasMonthlySalaryTable(op: OnboardingProfile | null): boolean {
  return Object.keys(salaryMonths(op)).length > 0;
}

/** One calendar year as twelve numbers, January first — the shape every existing caller expects.
 *  A month the table does not mention reads as `fallback`, not as zero: silence is not $0. */
/* ─ MK-CF-F-167 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * salaryCalendarYear
 *
 * Answers ..... One calendar year as twelve numbers, January first — the shape every existing caller expects.
 *
 * Formula .....
 *     t = salary months(op, now)
 *     k = `${year}-${string(i + 1).pad start(2, '0')}`
 *     the answer:
 *     t[k]   if k in t
 *     fallback   otherwise
 *
 * Called by ... MK-CF-F-177 wageGrossByMonth
 *
 * Reaches ..... 145 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 127 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-167
 * Changed ..... not in git yet (—)
 */
export function salaryCalendarYear(
  op: OnboardingProfile | null, year: number, fallback = 0, now: Date = new Date(),
): number[] {
  const t = salaryMonths(op, now);
  return Array.from({ length: 12 }, (_, i) => {
    const k = `${year}-${String(i + 1).padStart(2, '0')}`;
    return k in t ? t[k] : fallback;
  });
}

/** The table as the base-pay screen shows it: [month key, amount] for a window of months. */
/* ─ MK-CF-F-168 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * salaryWindow
 *
 * Answers ..... The table as the base-pay screen shows it: [month key, amount] for a window of months.
 *
 * Formula .....
 *     t = salary months(op, now)
 *     the answer = for each of keys: [each, each in t ? t[each] : fallback]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-168
 * Changed ..... not in git yet (—)
 */
export function salaryWindow(
  op: OnboardingProfile | null, keys: string[], fallback = 0, now: Date = new Date(),
): [string, number][] {
  const t = salaryMonths(op, now);
  return keys.map((k) => [k, k in t ? t[k] : fallback]);
}

/** Write one month without disturbing the others. */
/* ─ MK-CF-F-169 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * withSalaryMonth
 *
 * Answers ..... Write one month without disturbing the others.
 *
 * Formula .....
 *     ...salary months(op, now) = ...salary months(op, now)
 *     [key]: to num(amount) = [key]: to num(amount)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-169
 * Changed ..... not in git yet (—)
 */
export function withSalaryMonth(
  op: OnboardingProfile | null, key: string, amount: any, now: Date = new Date(),
): Record<string, number> {
  return { ...salaryMonths(op, now), [key]: toNum(amount) };
}

/** A whole calendar year written at once — what today's twelve-cell grids save. */
/* ─ MK-CF-F-170 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * salaryYearFromCells
 *
 * Answers ..... A whole calendar year written at once — what today's twelve-cell grids save.
 *
 * Formula .....
 *     out = {}
 *     the answer = out
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-170
 * Changed ..... not in git yet (—)
 */
export function salaryYearFromCells(cells: any[], year: number): Record<string, number> {
  const out: Record<string, number> = {};
  cells.slice(0, 12).forEach((v, i) => { out[`${year}-${String(i + 1).padStart(2, '0')}`] = toNum(v); });
  return out;
}
