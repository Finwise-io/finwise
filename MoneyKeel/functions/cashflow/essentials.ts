// Cash flow · Essentials a month — ONE producer for the figure every months-of-cash card divides by.
//
// Founder ruling brief Q-21 (2026-08-20): months of cash stand on a trailing-year average of ACTUAL logged
// expenses — mortgage and big items included — with the monthly figure shown beside it.
// Founder ruling Q47 (2026-09-08): with fewer than twelve months logged, average the months that
// are logged and say so on screen: "$X — 7 month average".
// Before this, the same figure was produced four ways (a screen division, the larger-of rule in
// plannedMonthlySpend, the onboarding buckets, and unnamed) — second verification G21.
import { toNum } from '../../../src/domain/_shared/num';

export interface LoggedSpend { amount: any; date: string; category?: string }
export interface EssentialsAverage {
  monthly: number;          // the average over the months counted
  monthsCounted: number;    // calendar months with at least one logged entry, inside the window
  label: string;            // "7 month average" — the words the screen prints beside the figure
  from: string;             // first month counted, 'YYYY-MM'
  to: string;               // last month counted, 'YYYY-MM'
}
export interface EssentialsMonthly { monthly: number; basis: 'logged' | 'entered'; label: string; logged: EssentialsAverage | null }

/** Writes a date as its year and month: 2026-08. */
/* ─ MK-CF-F-191 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ym
 *
 * Answers ..... Writes a date as its year and month: 2026-08.
 *
 * Formula .....
 *     the answer = 'YYYY-MM' from the date's year and month
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-014 budgetVsActual
 *               MK-CF-F-148 inMonth · MK-CF-F-150 debtPaymentsCountedAsExpenses
 *               MK-CF-F-151 actualSpending · MK-CF-F-153 radar
 *               MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-189 essentialsFromLoggedSpending
 *               MK-CF-F-212 receivedInMonth · MK-XS-F-008 normalizeSnapshot
 *               MK-XS-F-009 readHistory · MK-XS-F-175 uid
 *
 * Reaches ..... 199 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 181 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-191
 * Changed ..... not in git yet (—)
 */
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** What does a month actually cost, from what has been logged? (Founder rulings brief Q-21 (2026-08-20) and Q47.) */
/* ─ MK-CF-F-189 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * essentialsFromLoggedSpending
 *
 * Answers ..... What does a month actually cost, from what has been logged?
 *
 * Formula .....
 *     window = the 12 complete calendar months before the current month
 *     counted = the months in that window with at least one logged entry (every category — debt payments and big items included)
 *     monthly = Σ amounts in the counted months ÷ number of counted months
 *     if no complete month has an entry but the current month does: monthly = the current month's total, counted = 1
 *     nothing when no month has an entry
 *     label = "<counted> month average"
 *
 * Called by ... MK-CF-F-190 essentialsMonthly
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-CF-F-190 essentialsMonthly
 *               MK-NW-O-004 theEmergencyFund
 *
 * Serves ...... MK-MN-M-020 · MK-MN-M-021
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Uses a built-in k of 12.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Founder ruling brief Q-21 (2026-08-20): the average of ACTUAL logged expenses, mortgage and big items included — never the typed plan when logs exist.
 *     · Founder ruling Q47 (2026-09-08): fewer than 12 months logged → the average over the months logged, and the label says how many.
 *     · ASSUMPTION (mine, 2026-09-08, stated for the founder's ruling): the current, unfinished month is left out — a month three days old would drag the average down — unless it is the only month with entries.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-189
 * Changed ..... not in git yet (—)
 */
export function essentialsFromLoggedSpending(expenses: LoggedSpend[], now: Date = new Date()): EssentialsAverage | null {
  const current = ym(now);
  const window: string[] = [];
  for (let k = 12; k >= 1; k--) window.push(ym(new Date(now.getFullYear(), now.getMonth() - k, 1)));
  const byMonth = new Map<string, number>();
  for (const e of expenses ?? []) {
    const m = String(e?.date ?? '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) continue;
    byMonth.set(m, (byMonth.get(m) ?? 0) + toNum(e.amount));
  }
  const counted = window.filter((m) => byMonth.has(m));
  if (counted.length === 0) {
    if (!byMonth.has(current)) return null;
    return { monthly: (byMonth.get(current)!), monthsCounted: 1, label: '1 month average — this month so far', from: current, to: current };
  }
  const total = counted.reduce((t, m) => t + (byMonth.get(m) ?? 0), 0);
  const n = counted.length;
  return { monthly: (total / n), monthsCounted: n, label: `${n} month average`, from: counted[0], to: counted[n - 1] };
}

/** The one essentials-a-month figure a screen divides by, and where it came from. */
/* ─ MK-CF-F-190 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * essentialsMonthly
 *
 * Answers ..... The one essentials-a-month figure a screen divides by, and where it came from.
 *
 * Formula .....
 *     logged = essentials from logged expenses(expenses, now)
 *     logged exists → monthly = logged.monthly, basis 'logged', label = logged.label
 *     otherwise, typed > 0 → monthly = typed, basis 'entered', label 'you entered'
 *     otherwise nothing — the screen shows its door, never a made-up number
 *
 * Called by ... MK-NW-F-079 EF · MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-NW-O-004 theEmergencyFund
 *
 * Serves ...... MK-MN-M-024 · MK-MN-M-025 · MK-MN-M-026 · MK-NW-M-013
 *               MK-NW-M-014
 * Reads ....... MK-XS-I-024 logged expenses
 * Ruled by .... DEC-0007 · DEC-0260
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Logged expenses outranks the typed figure whenever a month is logged (brief Q-21 (2026-08-20)); the typed figure is used only when nothing is logged, and it is labelled 'you entered'.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-190
 * Changed ..... not in git yet (—)
 */
export function essentialsMonthly(expenses: LoggedSpend[], typed: number, now: Date = new Date()): EssentialsMonthly | null {
  const logged = essentialsFromLoggedSpending(expenses, now);
  if (logged) return { monthly: logged.monthly, basis: 'logged', label: logged.label, logged };
  if (typed > 0) return { monthly: (typed), basis: 'entered', label: 'you entered', logged: null };
  return null;
}
