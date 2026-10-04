// PRD F3#16 — the money-weighted (dollar-weighted) personal return: the annualized rate that
// makes the user's OWN dated cash flows (deposits in, withdrawals out, from the one ledger)
// grow to today's value. This is "YOUR return counting when you added money" — different from
// the price-based returns, and honest about timing luck.
//
// Honesty rules (each returns null + a plain reason, never a guessed number):
//  · only accounts whose history STARTS in the ledger count (an opening row or a first deposit)
//    — a balance that predates its ledger can't be reconstructed, so it isn't;
//  · at least ~30 days between the first flow and today, or annualizing is noise;
//  · the solver must actually converge inside sane bounds (−95%…+1000%/year).
// Internal moves (buys, sells, reinvested dividends, fees, transfers WITHIN the measured set)
// are not user flows; a transfer leaving the set is money out, entering it is money in.
import type { Transaction } from '../transactions';
import type { AssetAccount } from '../assets';

export interface MoneyWeighted {
  ratePerYear: number;          // decimal, e.g. 0.072 = +7.2%/year
  flows: number;                // how many dated user flows it stands on
  sinceDays: number;
}
export interface MoneyWeightedMiss { reason: 'no_history' | 'too_short' | 'no_solution' }

const DAY = 86400000;

/** The user's dated flows for a measured set of accounts, investor-sign convention:
 *  money the user PUT IN is negative, money TAKEN OUT is positive. */
/* ─ MK-PF-F-024 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * userFlows
 *
 * Answers ..... The user's dated flows for a measured set of accounts, investor-sign convention: money the user PUT IN is negative, money TAKEN OUT is positive.
 *
 * Formula .....
 *     flows = []
 *     in set = account ids.has(string(account id))
 *     counter in set = counter account id ≠ nothing and account ids.has(string(counter account id))
 *     when = date.parse(string(date))
 *     the answer = flows where size of(amount) > 0.004.sort((a, b) => date − date)
 *
 * Called by ... MK-PF-F-026 moneyWeightedReturn
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-026 moneyWeightedReturn · MK-NW-F-102 rateWhereItRefuses
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If price is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-024
 * Changed ..... 2026-07-14 (f22902e)
 */
export function userFlows(transactions: Transaction[], accountIds: Set<string>): { date: number; amount: number }[] {
  const flows: { date: number; amount: number }[] = [];
  for (const t of transactions ?? []) {
    const inSet = accountIds.has(String(t.account_id));
    const counterInSet = t.counter_account_id != null && accountIds.has(String(t.counter_account_id));
    const when = Date.parse(String(t.date));
    if (Number.isNaN(when)) continue;
    switch (t.type) {
      case 'OPENING_CASH':
        if (inSet) flows.push({ date: when, amount: -(t.amount || 0) });
        break;
      case 'OPENING_POSITION':
        if (inSet) flows.push({ date: when, amount: -((t.shares || 0) * (t.price || 0)) });
        break;
      case 'DEPOSIT':
        if (inSet) flows.push({ date: when, amount: -(t.amount || 0) });
        break;
      case 'WITHDRAWAL':
        if (inSet) flows.push({ date: when, amount: (t.amount || 0) });
        break;
      case 'TRANSFER':
        // within the set: internal, cancels; crossing the boundary: a real user flow
        if (inSet && !counterInSet) flows.push({ date: when, amount: (t.amount || 0) });
        else if (!inSet && counterInSet) flows.push({ date: when, amount: -(t.amount || 0) });
        break;
      default:
        break;                    // BUY/SELL/DIVIDEND/FEE/COUPON/INTEREST are internal to the set
    }
  }
  return flows.filter((f) => Math.abs(f.amount) > 0.004).sort((a, b) => a.date - b.date);
}

/** True iff every measured account's story begins IN the ledger (openable honestly). */
/* ─ MK-PF-F-025 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * historyIsComplete
 *
 * Answers ..... True iff every measured account's story begins IN the ledger (openable honestly).
 *
 * Formula .....
 *     false   when first is missing
 *     false   when !['OPENING_CASH', 'OPENING_POSITION', 'DEPOSIT'].includes(first.type as string)
 *     true
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-PF-F-026 moneyWeightedReturn
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-026 moneyWeightedReturn · MK-NW-F-102 rateWhereItRefuses
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-025
 * Changed ..... 2026-07-14 (f22902e)
 */
export function historyIsComplete(transactions: Transaction[], accounts: AssetAccount[], accountIds: Set<string>): boolean {
  for (const a of accounts) {
    if (!accountIds.has(String(a.asset_id))) continue;
    const first = (transactions ?? [])
      .filter((t) => String(t.account_id) === String(a.asset_id))
      .sort((x, y) => String(x.date).localeCompare(String(y.date)))[0];
    if (!first) return false;
    if (!['OPENING_CASH', 'OPENING_POSITION', 'DEPOSIT'].includes(first.type as string)) return false;
  }
  return true;
}

/** The value today of a set of dated money movements plus an ending value, at a given yearly rate; the money-weighted return is the rate that makes this come to zero. */
/* ─ MK-PF-F-030 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * npv
 *
 * Answers ..... The value today of a set of dated money movements plus an ending value, at a given yearly rate; the money-weighted return is the rate that makes this come to zero.
 *
 * Formula .....
 *     disc = (when: number) => (1 + rate)^(-((when − t0) ÷ DAY) ÷ 365)
 *     v = 0
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-PF-F-026 moneyWeightedReturn
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-PF-F-026 moneyWeightedReturn · MK-NW-F-102 rateWhereItRefuses
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Treats a year as 365 days.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-030
 * Changed ..... not in git yet (—)
 */
function npv(rate: number, flows: { date: number; amount: number }[], endValue: number, endDate: number, t0: number): number {
  const disc = (when: number) => Math.pow(1 + rate, -((when - t0) / DAY) / 365);
  let v = 0;
  for (const f of flows) v += f.amount * disc(f.date);
  return v + endValue * disc(endDate);
}

/** XIRR via bisection — deterministic, no derivative games. */
/* ─ MK-PF-F-026 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * moneyWeightedReturn
 *
 * Answers ..... XIRR via bisection — deterministic, no derivative games.
 *
 * Formula .....
 *     reason = 'no_history'   when !history is complete(transactions, accounts, account ids)
 *     flows = user flows(transactions, account ids)
 *     invested = flows where amount < 0
 *     reason = 'no_history'   when invested.length = 0
 *     t0 = flows[0].date
 *     since days = round down((now − t0) ÷ DAY)
 *     reason = 'too_short'   when since days < 30
 *     lo = -0.95, hi = 10
 *     f = (r: number) => npv(r, flows, math.max(0, current value), now, t0)
 *     f lo = f(lo), f hi = f(hi)
 *     reason = 'no_solution'   when f lo × f hi > 0
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-102 rateWhereItRefuses
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-102 rateWhereItRefuses · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Never lets current value fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-026
 * Changed ..... 2026-07-14 (f22902e)
 */
export function moneyWeightedReturn(
  transactions: Transaction[],
  accounts: AssetAccount[],
  accountIds: Set<string>,
  currentValue: number,
  now: number = Date.now(),
): MoneyWeighted | MoneyWeightedMiss {
  if (!historyIsComplete(transactions, accounts, accountIds)) return { reason: 'no_history' };
  const flows = userFlows(transactions, accountIds);
  const invested = flows.filter((f) => f.amount < 0);
  if (invested.length === 0) return { reason: 'no_history' };
  const t0 = flows[0].date;
  const sinceDays = Math.floor((now - t0) / DAY);
  if (sinceDays < 30) return { reason: 'too_short' };

  let lo = -0.95, hi = 10;
  const f = (r: number) => npv(r, flows, Math.max(0, currentValue), now, t0);
  let fLo = f(lo), fHi = f(hi);
  if (fLo * fHi > 0) return { reason: 'no_solution' };
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if (Math.abs(fMid) < 1e-7 || hi - lo < 1e-7) {
      return { ratePerYear: (mid), flows: flows.length, sinceDays };
    }
    if (fLo * fMid <= 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return { ratePerYear: (((lo + hi) / 2)), flows: flows.length, sinceDays };
}

/* ─ MK-PF-F-027 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * isMoneyWeighted
 *
 * Answers ..... Did the personal return produce a number, or a reason it could not?
 *
 * Formula .....
 *     (r as money weighted).rate per year ! = undefined
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-027
 * Changed ..... 2026-07-14 (f22902e)
 */
export function isMoneyWeighted(r: MoneyWeighted | MoneyWeightedMiss): r is MoneyWeighted {
  return (r as MoneyWeighted).ratePerYear !== undefined;
}
