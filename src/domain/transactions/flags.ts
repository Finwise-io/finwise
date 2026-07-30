// F10 — the single-transaction "worth a look" watch (FCC detailed design v1.1, thin v1).
// A small always-on check over each new money-out transaction; when one stands out it produces a calm
// flag (a fact plus two buttons — never an alarm; the words scam/fraud/alert never appear in v1 copy).
// Pure functions, no app plumbing. MANUAL-ENTRY RULE: hand-typed transactions are NEVER flagged —
// the watch runs on connected-account transactions only (t.source === 'connected').
import type { Transaction } from './index';

export type FlagReason = 'unusually_large' | 'first_time_payee' | 'odd_pattern' | 'possible_duplicate';
export type FlagStatus = 'open' | 'was_me' | 'flagged';

export interface TxnFlag {
  flag_id: string;
  transaction_ids: string[];      // one id, or several for a combined odd-pattern card
  account_id: string;
  reason: FlagReason;
  /** The comparison figure the rule used, stored AT FLAG TIME so the explanation never drifts:
   *  unusually_large → the typical (median) money-out; odd_pattern → the day's combined total;
   *  first_time_payee → null (the fact is the comparison). */
  comparison: number | null;
  amount: number;                 // the flagged amount (combined total for odd_pattern)
  payee: string | null;           // note text of the flagged transaction (normalized for matching)
  date: string;                   // the transaction's date
  status: FlagStatus;
  created_at: string;
  resolved_at?: string;
}

/** Money leaves the account: withdrawals, fees, and transfers with no recognized counter-account. */
export function isMoneyOut(t: Transaction): boolean {
  if (t.type === 'WITHDRAWAL' || t.type === 'FEE') return true;
  if (t.type === 'TRANSFER' && !t.counter_account_id) return true;
  return false;
}

const normPayee = (note?: string | null) => (note ?? '').trim().toLowerCase();
const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const daysBetween = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

// Fixed v1 thresholds — no automatic tightening or loosening (design: thresholds never auto-adjust).
export const LARGE_MULTIPLE = 3;        // ≥ 3× the account's typical money-out…
export const LARGE_FLOOR = 500;         // …AND at least $500
export const LARGE_COLD_START = 1000;   // flat line when fewer than 5 past withdrawals to learn from
export const MIN_HISTORY = 5;
export const PAYEE_FLOOR = 250;         // first-time payee only matters from $250
export const PATTERN_COUNT = 3;         // 3+ money-out from one account in one calendar day…
export const PATTERN_TOTAL = 1000;      // …adding to $1,000 or more
export const HISTORY_DAYS = 90;

export interface ReviewContext {
  /** the account's earlier transactions (any window; the engine applies the 90-day cut itself) */
  history: Transaction[];
  /** payees already confirmed as known, per account (the only learning in v1) */
  knownPayees?: Record<string, string[]>;
  /** id generator (injectable for determinism in tests) */
  makeId?: () => string;
  now?: Date;
}

/**
 * Review new transactions against an account's history. Returns the flags to save.
 * Rules in order — any ONE trips a flag; a transaction gets at most one flag; the odd-pattern
 * rule produces one COMBINED card for the day.
 */
export function reviewTransactions(newOnes: Transaction[], ctx: ReviewContext): TxnFlag[] {
  const { history, knownPayees = {} } = ctx;
  const makeId = ctx.makeId ?? (() => `flag_${Math.random().toString(36).slice(2, 10)}`);
  const nowIso = (ctx.now ?? new Date()).toISOString();
  const flags: TxnFlag[] = [];
  const flaggedIds = new Set<string>();

  // Build-47 walk row 19 (audit PRD #9), rule (0): POSSIBLE DUPLICATE — same account, same
  // amount to the cent, same payee, within 2 days. This one DOES cover hand-typed entries:
  // typing the same expense twice is exactly where manual entry goes wrong. The newer row
  // gets the flag; the size/payee rules below stay connected-only (the deliberate stance:
  // never interrogate the size of a number the user typed themselves).
  const dupCandidates = newOnes.filter((t) => isMoneyOut(t) && (t.amount ?? 0) > 0);
  for (const t of dupCandidates) {
    if (flaggedIds.has(String(t.id))) continue;
    const acct = String(t.account_id);
    const twin = history.find((h) => String(h.account_id) === acct && isMoneyOut(h) && h.id !== t.id
      && Math.abs((h.amount ?? 0) - (t.amount ?? 0)) < 0.005
      && normPayee(h.note) === normPayee(t.note)
      && daysBetween(h.date, t.date) <= 2);
    if (twin) {
      flags.push({
        flag_id: makeId(), transaction_ids: [String(t.id)], account_id: acct,
        reason: 'possible_duplicate', comparison: twin.amount ?? null,
        amount: t.amount as number, payee: normPayee(t.note) || null, date: t.date, status: 'open', created_at: nowIso,
      });
      flaggedIds.add(String(t.id));
    }
  }

  // Only connected-account money-out is ever reviewed for SIZE/PAYEE (never interrogate a hand-typed number).
  const candidates = newOnes.filter((t) => t.source === 'connected' && isMoneyOut(t) && (t.amount ?? 0) > 0);

  for (const t of candidates) {
    if (flaggedIds.has(String(t.id))) continue;
    const acct = String(t.account_id);
    const amount = t.amount as number;
    const past = history.filter((h) => String(h.account_id) === acct && isMoneyOut(h) && (h.amount ?? 0) > 0
      && daysBetween(h.date, t.date) <= HISTORY_DAYS && h.id !== t.id);

    // (1) UNUSUALLY LARGE
    const pastAmounts = past.map((h) => h.amount as number);
    const typical = median(pastAmounts);
    const trips = pastAmounts.length >= MIN_HISTORY
      ? amount >= LARGE_MULTIPLE * typical && amount >= LARGE_FLOOR
      : amount >= LARGE_COLD_START;
    if (trips) {
      flags.push({
        flag_id: makeId(), transaction_ids: [String(t.id)], account_id: acct,
        reason: 'unusually_large', comparison: pastAmounts.length >= MIN_HISTORY ? typical : null,
        amount, payee: normPayee(t.note) || null, date: t.date, status: 'open', created_at: nowIso,
      });
      flaggedIds.add(String(t.id));
      continue;
    }

    // (2) FIRST-TIME PAYEE
    const payee = normPayee(t.note);
    if (payee && amount >= PAYEE_FLOOR) {
      const known = (knownPayees[acct] ?? []).map((p) => p.toLowerCase());
      const seenBefore = known.includes(payee) || past.some((h) => normPayee(h.note) === payee);
      if (!seenBefore) {
        flags.push({
          flag_id: makeId(), transaction_ids: [String(t.id)], account_id: acct,
          reason: 'first_time_payee', comparison: null,
          amount, payee, date: t.date, status: 'open', created_at: nowIso,
        });
        flaggedIds.add(String(t.id));
        continue;
      }
    }
  }

  // (3) ODD PATTERN — one combined card per (account, calendar day)
  const byDay = new Map<string, Transaction[]>();
  for (const t of candidates) {
    if (flaggedIds.has(String(t.id))) continue;
    const key = `${t.account_id}|${t.date}`;
    byDay.set(key, [...(byDay.get(key) ?? []), t]);
  }
  for (const [key, txns] of byDay) {
    const acct = key.split('|')[0];
    const date = key.split('|')[1];
    // include same-day history so 2 new + 1 earlier today still trips
    const sameDayPast = ctx.history.filter((h) => String(h.account_id) === acct && isMoneyOut(h) && (h.amount ?? 0) > 0 && h.date === date && !txns.some((t) => t.id === h.id));
    const all = [...txns, ...sameDayPast];
    const total = all.reduce((s, t) => s + (t.amount ?? 0), 0);
    if (all.length >= PATTERN_COUNT && total >= PATTERN_TOTAL) {
      flags.push({
        flag_id: makeId(), transaction_ids: all.map((t) => String(t.id)), account_id: acct,
        reason: 'odd_pattern', comparison: total,
        amount: total, payee: null, date, status: 'open', created_at: nowIso,
      });
      txns.forEach((t) => flaggedIds.add(String(t.id)));
    }
  }

  return flags;
}

/** The plain-English comparison sentence for the detail view — fixed, human-reviewed templates. */
export function flagComparisonText(f: TxnFlag): string {
  if (f.reason === 'unusually_large') {
    if (f.comparison && f.comparison > 0) {
      const times = Math.round(f.amount / f.comparison);
      return `Your usual withdrawal from this account is about $${Math.round(f.comparison).toLocaleString()}. This one is ${times} times that.`;
    }
    return `This account is new to us, so we look twice at anything over $${LARGE_COLD_START.toLocaleString()}.`;
  }
  if (f.reason === 'first_time_payee') return `First time we've seen this payee on this account.`;
  if (f.reason === 'possible_duplicate') return `Looks like the same charge twice — same amount, same place, within two days. If one was typed by mistake, delete it; if both are real, mark it settled.`;
  return `${f.transaction_ids.length} withdrawals from this account in one day, $${Math.round(f.amount).toLocaleString()} together.`;
}
