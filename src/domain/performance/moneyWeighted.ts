// PRD F3#16 — the money-weighted (dollar-weighted) personal return: the annualized rate that
// makes the user's OWN dated cash flows (deposits in, withdrawals out, from the one ledger)
// grow to today's value. This is "YOUR return counting when you added money" — different from
// the price-based returns, and honest about timing luck.
//
// Honesty rules (each returns null + a plain reason, never a guessed number):
//  · only accounts whose history STARTS in the ledger count (an opening row or a first deposit)
//    — a balance that predates its ledger can't be reconstructed, so it isn't;
//  · at least ~30 days between the first flow and today, or annualizing is noise;
//  · the solver must actually converge inside sane bounds (−95%…+1000%/yr).
// Internal moves (buys, sells, reinvested dividends, fees, transfers WITHIN the measured set)
// are not user flows; a transfer leaving the set is money out, entering it is money in.
import type { Transaction } from '../transactions';
import type { AssetAccount } from '../assets';

export interface MoneyWeighted {
  ratePerYear: number;          // decimal, e.g. 0.072 = +7.2%/yr
  flows: number;                // how many dated user flows it stands on
  sinceDays: number;
}
export interface MoneyWeightedMiss { reason: 'no_history' | 'too_short' | 'no_solution' }

const DAY = 86400000;

/** The user's dated flows for a measured set of accounts, investor-sign convention:
 *  money the user PUT IN is negative, money TAKEN OUT is positive. */
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

function npv(rate: number, flows: { date: number; amount: number }[], endValue: number, endDate: number, t0: number): number {
  const disc = (when: number) => Math.pow(1 + rate, -((when - t0) / DAY) / 365);
  let v = 0;
  for (const f of flows) v += f.amount * disc(f.date);
  return v + endValue * disc(endDate);
}

/** XIRR via bisection — deterministic, no derivative games. */
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
      return { ratePerYear: Math.round(mid * 1e4) / 1e4, flows: flows.length, sinceDays };
    }
    if (fLo * fMid <= 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return { ratePerYear: Math.round(((lo + hi) / 2) * 1e4) / 1e4, flows: flows.length, sinceDays };
}

export function isMoneyWeighted(r: MoneyWeighted | MoneyWeightedMiss): r is MoneyWeighted {
  return (r as MoneyWeighted).ratePerYear !== undefined;
}
