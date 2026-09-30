// F10 — the single-transaction "worth a look" watch (FCC detailed design v1.1, thin v1).
// A small always-on check over each new money-out transaction; when one stands out it produces a calm
// flag (a fact plus two buttons — never an alarm; the words scam/fraud/alert never appear in v1 copy).
// Pure functions, no app plumbing. MANUAL-ENTRY RULE: hand-typed transactions are NEVER flagged —
// the watch runs on connected-account transactions only (t.source === 'connected').
import type { Transaction } from './index';
import { median } from '../_shared/num';

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
  payee: string | null;           // note text of the flagged row of activity (normalized for matching)
  date: string;                   // the transaction's date
  status: FlagStatus;
  created_at: string;
  resolved_at?: string;
}

/** Money leaves the account: withdrawals, fees, and transfers with no recognized counter-account. */
/* ─ MK-CF-F-108 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isMoneyOut
 *
 * Answers ..... Money leaves the account: withdrawals, fees, and transfers with no recognized counter-account.
 *
 * Formula .....
 *     true   when type = 'WITHDRAWAL' (or type = 'FEE' when missing or zero)
 *     true   when type = 'TRANSFER' and !counter account id
 *     false
 *
 * Called by ... MK-CF-F-109 reviewTransactions
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-108
 * Changed ..... 2026-07-13 (4cb258a)
 */
export function isMoneyOut(t: Transaction): boolean {
  if (t.type === 'WITHDRAWAL' || t.type === 'FEE') return true;
  if (t.type === 'TRANSFER' && !t.counter_account_id) return true;
  return false;
}

/* ─ MK-CF-F-131 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * normPayee
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     (note ?? '').trim().to lower case()
 *
 * Called by ... MK-CF-F-109 reviewTransactions
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-131
 * Changed ..... not in git yet (—)
 */
const normPayee = (note?: string | null) => (note ?? '').trim().toLowerCase();
/* ─ MK-CF-F-162 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * daysApart
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     size of(the date a).get time() − new date(b) ÷ 86400000
 *
 * Called by ... MK-CF-F-109 reviewTransactions
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in l a r g e m u l t i p l e of 3.
 *     · Uses a built-in l a r g e f l o o r of 500.
 *     · Uses a built-in l a r g e c o l d s t a r t of 1000.
 *     · Uses a built-in m i n h i s t o r y of 5.
 *     · Uses a built-in p a y e e f l o o r of 250.
 *     · Uses a built-in p a t t e r n c o u n t of 3.
 *     · Uses a built-in p a t t e r n t o t a l of 1000.
 *     · Uses a built-in h i s t o r y d a y s of 90.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-162
 * Changed ..... not in git yet (—)
 */
const daysApart = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

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
  /** the account's earlier transactions (any window; the function applies the 90-day cut itself) */
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
/* ─ MK-CF-F-109 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * reviewTransactions
 *
 * Answers ..... Review new transactions against an account's history.
 *
 * Formula .....
 *     make id = ctx.make id (or () => `flag${math.random().to string(36).slice(2, 10)}` when missing)
 *     now iso = (ctx.now ?? new date()).to isostring()
 *     flags = []
 *     flagged ids = new set<string>()
 *     dup candidates = new ones where is money out(each) and (amount ?? 0) > 0
 *     acct = string(account id)
 *     candidates = new ones where source = 'connected' and is money out(each) and (amount ?? 0) > 0
 *     acct = string(account id)
 *     amount = amount as number
 *     past amounts = for each of past: amount as number
 *     typical = median(past amounts)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-010 transaction words (the institution's own wording)
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If amount is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-109
 * Changed ..... 2026-07-30 (62656b7)
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
      && daysApart(h.date, t.date) <= 2);
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
      && daysApart(h.date, t.date) <= HISTORY_DAYS && h.id !== t.id);

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
/* ─ MK-CF-F-110 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * flagComparisonText
 *
 * Answers ..... The plain-English comparison sentence for the detail view — fixed, human-reviewed templates.
 *
 * Formula .....
 *     times = round(amount ÷ comparison)
 *     the answer = `your usual withdrawal from this account is about $${math.round(comparison).to locale string()}. this one is ${times} times that.`
 *     `first time we've seen this payee on this account.`   when reason = 'first_time_payee'
 *     `looks like the same charge twice — same amount, same place, within two days. if one was typed by mistake, delete it; if both are real, mark it settled.`   when reason = 'possible_duplicate'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-010 transaction words (the institution's own wording)
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-110
 * Changed ..... 2026-07-30 (62656b7)
 */
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
