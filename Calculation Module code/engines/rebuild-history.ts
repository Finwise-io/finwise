// ENGINE — rebuilding the past from records we were given, never from a guess.
//
// FOUNDER, 2026-09-25: "Why day 1 we are not able to import historic data on account and show past
// records? Currently, what app will show will not match the account, and confuse user." He is right.
// The app measured from the day a person arrived, while the broker's own statement went back years.
//
// WHAT MAKES THIS HONEST, and the line between the two:
//   · A LINKED account hands us its whole transaction history on the first sync, and market data
//     gives us daily closes. Today's holdings walked BACKWARDS through those transactions, priced
//     at each day's close, is not a guess — it is the same history the broker shows, rebuilt.
//   · A HAND-ENTERED account or a cash balance has no ledger. Its past is unknown and stays
//     unknown: it starts the day it was entered, and the screen says so.
//
// THREE RULES THIS MODULE KEEPS:
//   1. A rebuilt day is marked `origin: 'reconstructed'`. A reconstruction is not an observation
//      and must never read as one.
//   2. The line starts where the RECORDS start (`rebuildableFrom`), never earlier. A holding we
//      were handed as an opening balance has no history behind it, so the line stops there.
//   3. A day we cannot price is SKIPPED, not filled in. A gap is honest; an invented value is not.
//
// This replaces the old back-fill, which took TODAY's share count and priced it at past dates —
// so someone who bought last month was shown a year-long line that never happened (workplan,
// 2026-09-25). Shares are now whatever the records say they were on the day.
import type { AccountLike, SnapshotDay, HoldingSnapshot, AccountSnapshot } from './snapshots';

/** The transaction fields this engine needs — structural, so it imports nothing from the app. */
export interface RebuildTxn {
  date: string;                 // 'YYYY-MM-DD'
  type: string;                 // BUY · SELL · DEPOSIT · WITHDRAWAL · TRANSFER · DIVIDEND · …
  account_id: string;
  counter_account_id?: string;  // TRANSFER / TRANSFER_IN_KIND
  ticker?: string;
  shares?: number;
  price?: number;               // per share
  amount?: number;              // cash amount
  reinvested?: boolean;
}

/** A holding's state on a day, as the records leave it. */
interface Held { units: number; }

const DAY = 86_400_000;
/* ─ MK-ST-F-066 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isDayKey
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-ST-F-071 rebuildableFrom · MK-ST-F-073 rebuildDays
 *
 * Reaches ..... 55 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 37 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-066
 * Changed ..... not in git yet (—)
 */
const isDayKey = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
/* ─ MK-ST-F-067 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * utcOfDay
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the first 4), +slice(5, 7) − 1, +slice(8, 10) of date.UTC(+d
 *
 * Called by ... MK-ST-F-068 stepDay
 *
 * Reaches ..... 55 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 37 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-067
 * Changed ..... not in git yet (—)
 */
const utcOfDay = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
/* ─ MK-ST-F-068 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * stepDay
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the first 10 of the date utc of day(d) + days × DAY).to isostring(
 *
 * Called by ... MK-ST-F-073 rebuildDays
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-068
 * Changed ..... not in git yet (—)
 */
const stepDay = (d: string, days: number) => new Date(utcOfDay(d) + days * DAY).toISOString().slice(0, 10);
/* ─ MK-ST-F-069 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * amountOf
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     v   if typeof v = 'number' and number.is finite(v)
 *     0   otherwise
 *
 * Called by ... MK-ST-F-072 undo · MK-ST-F-073 rebuildDays
 *
 * Reaches ..... 55 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 37 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-069
 * Changed ..... not in git yet (—)
 */
const amountOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** An opening row is the first capture of something that already existed — proof that the records
 *  do NOT reach behind it. `OPENING_POSITION` and `OPENING_CASH` both mark that wall. */
/* ─ MK-ST-F-070 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isOpening
 *
 * Answers ..... An opening row is the first capture of something that already existed — proof that the records do NOT reach behind it.
 *
 * Formula .....
 *     type = 'OPENING_POSITION' (or type = 'OPENING_CASH' when missing or zero)
 *
 * Called by ... MK-ST-F-071 rebuildableFrom · MK-ST-F-073 rebuildDays
 *
 * Reaches ..... 55 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 37 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-070
 * Changed ..... not in git yet (—)
 */
const isOpening = (t: RebuildTxn) => t.type === 'OPENING_POSITION' || t.type === 'OPENING_CASH';

/**
 * The earliest day this account's past can honestly be rebuilt to: the first record it gave us,
 * but never behind an opening capture, because nothing explains what sat there before it.
 * Returns null when there are no dated records at all — then the account starts the day it was entered.
 */
/* ─ MK-ST-F-071 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rebuildableFrom
 *
 * Answers ..... The earliest day this account's past can honestly be rebuilt to: the first record it gave us, but never behind an opening capture, because nothing explains what sat there before it.
 *
 * Formula .....
 *     first = nothing
 *     last opening = nothing
 *     nothing   when first = nothing
 *     the answer:
 *     last opening   if last opening ≠ nothing and last opening > first
 *     first   otherwise
 *
 * Called by ... MK-ST-F-073 rebuildDays
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-071
 * Changed ..... not in git yet (—)
 */
export function rebuildableFrom(txns: RebuildTxn[], accountId: string): string | null {
  let first: string | null = null;
  let lastOpening: string | null = null;
  for (const t of txns ?? []) {
    if (t.account_id !== accountId || !isDayKey(t.date)) continue;
    if (first == null || t.date < first) first = t.date;
    if (isOpening(t) && (lastOpening == null || t.date > lastOpening)) lastOpening = t.date;
  }
  if (first == null) return null;
  return lastOpening != null && lastOpening > first ? lastOpening : first;
}

/** Undo one record: take the state on the day AFTER it back to the state before it happened. */
/* ─ MK-ST-F-072 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * undo
 *
 * Answers ..... Undo one record: take the state on the day AFTER it back to the state before it happened.
 *
 * Formula .....
 *     acc = account id
 *     key = (ticker ?? '').trim().to upper case()
 *     cash = (id: string, by: number) => cash of.set(id, (cash of.get(id) ?? 0) + by)
 *     m = `${id}|${k}`
 *     cur = held.get(m) (or units = 0 when missing)
 *
 * Called by ... MK-ST-F-073 rebuildDays
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-072
 * Changed ..... not in git yet (—)
 */
function undo(t: RebuildTxn, held: Map<string, Held>, cashOf: Map<string, number>): void {
  const acc = t.account_id;
  const key = (t.ticker ?? '').trim().toUpperCase();
  const cash = (id: string, by: number) => cashOf.set(id, (cashOf.get(id) ?? 0) + by);
  const units = (id: string, k: string, by: number) => {
    if (!k) return;
    const m = `${id}|${k}`;
    const cur = held.get(m) ?? { units: 0 };
    held.set(m, { units: cur.units + by });
  };
  switch (t.type) {
    case 'BUY':                                        // cash went out, units came in — put both back
      units(acc, key, -amountOf(t.shares));
      cash(acc, amountOf(t.shares) * amountOf(t.price));
      break;
    case 'SELL':
      units(acc, key, amountOf(t.shares));
      cash(acc, -amountOf(t.shares) * amountOf(t.price));
      break;
    case 'DEPOSIT':
      cash(acc, -amountOf(t.amount));
      break;
    case 'WITHDRAWAL':
    case 'FEE':
      cash(acc, amountOf(t.amount));
      break;
    case 'TRANSFER':                                   // one account's loss is the other's gain
      cash(acc, amountOf(t.amount));
      if (t.counter_account_id) cash(t.counter_account_id, -amountOf(t.amount));
      break;
    case 'TRANSFER_IN_KIND':
      units(acc, key, -amountOf(t.shares));
      if (t.counter_account_id) units(t.counter_account_id, key, amountOf(t.shares));
      break;
    case 'DIVIDEND':
    case 'INTEREST':
    case 'COUPON':
      if (t.reinvested) units(acc, key, -amountOf(t.shares));
      else cash(acc, -amountOf(t.amount));
      break;
    // OPENING_POSITION / OPENING_CASH mark where the records stop — the walk never passes them.
    // ADJUSTMENT is a visible history row that touches nothing.
    default:
      break;
  }
}

export interface RebuildInput {
  /** Today's accounts — the anchor the walk starts from. */
  accounts: AccountLike[];
  transactions: RebuildTxn[];
  /** A day's close for a security, or null when we have no price for that day. */
  priceOn: (securityKey: string, date: string) => number | null;
  /** 'YYYY-MM-DD' — the day the anchor describes. */
  today: string;
  /** Never rebuild behind this day (the app keeps two years of dailies). */
  earliest: string;
  /** Only these accounts are rebuilt — the linked ones. Others keep their honest start. */
  accountIds: Set<string>;
  writtenAt: string;
}

export interface RebuildResult {
  /** One row per day we could rebuild and price, oldest first. */
  days: SnapshotDay[];
  /** The first day the rebuilt line covers, per account. */
  startByAccount: Record<string, string>;
  /** Days we could not price, so left empty rather than invented. */
  skipped: string[];
}

/**
 * Rebuild the daily record backwards from today, for the accounts whose records can explain it.
 *
 * The walk: start with today's units and cash; step back a day at a time; before recording a day,
 * undo every record dated after it. What is left is what was held that day, and it is priced at
 * that day's close.
 */
/* ─ MK-ST-F-073 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rebuildDays
 *
 * Answers ..... Rebuild the daily record backwards from today, for the accounts whose records can explain it.
 *
 * Formula .....
 *     days = []
 *     start by account = {}
 *     skipped = []   when !is day key(today) (or !is day key(earliest) (or earliest > today when missing or zero) when missing or zero)
 *     wanted = accounts (or none when missing) where account ids.has(string(asset id))
 *     days = []
 *     start by account = {}
 *     skipped = []   when count of wanted is missing
 *     start by account = {}
 *     from = rebuildable from(input.transactions ?? [], string(asset id))
 *     starts = object.values(start by account)
 *     days = []
 *     start by account = {}
 *     skipped = []   when count of starts is missing
 *     floor = starts.reduce((m, d) => (d < m ? d : m))
 *     held = new map<string, held>()
 *     cash of = new map<string, number>()
 *     symbol of = new map<string, string>()
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 53 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 35 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-031 daily and monthly snapshots
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Decides .....
 *     · Uses a built-in cursor of 0.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-073
 * Changed ..... not in git yet (—)
 */
export function rebuildDays(input: RebuildInput): RebuildResult {
  const { accounts, priceOn, today, earliest, accountIds, writtenAt } = input;
  if (!isDayKey(today) || !isDayKey(earliest) || earliest > today) return { days: [], startByAccount: {}, skipped: [] };

  const wanted = (accounts ?? []).filter((a) => accountIds.has(String(a.asset_id)));
  if (!wanted.length) return { days: [], startByAccount: {}, skipped: [] };

  // where each account's records stop — and the day the whole rebuild stops
  const startByAccount: Record<string, string> = {};
  for (const a of wanted) {
    const from = rebuildableFrom(input.transactions ?? [], String(a.asset_id));
    if (from) startByAccount[String(a.asset_id)] = from < earliest ? earliest : from;
  }
  const starts = Object.values(startByAccount);
  if (!starts.length) return { days: [], startByAccount: {}, skipped: [] };
  const floor = starts.reduce((m, d) => (d < m ? d : m));

  // today's state: units per account+security, and uninvested cash per account
  const held = new Map<string, Held>();
  const cashOf = new Map<string, number>();
  const symbolOf = new Map<string, string>();
  for (const a of wanted) {
    const id = String(a.asset_id);
    cashOf.set(id, amountOf(a.cash_balance) || (a.asset_class === 'cash' ? amountOf(a.balance) : 0));
    for (const p of a.positions ?? []) {
      const key = (p.ticker ?? '').trim().toUpperCase();
      if (!key) continue;
      const units = (p.lots ?? []).reduce((t, l) => t + amountOf(l.shares), 0);
      held.set(`${id}|${key}`, { units });
      symbolOf.set(key, p.ticker as string);
    }
  }

  // records that matter, newest first — only for the accounts being rebuilt
  const ids = new Set(wanted.map((a) => String(a.asset_id)));
  const ledger = (input.transactions ?? [])
    .filter((t) => isDayKey(t.date) && (ids.has(t.account_id) || (t.counter_account_id != null && ids.has(t.counter_account_id))))
    .filter((t) => !isOpening(t))
    .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));

  const days: SnapshotDay[] = [];
  const skipped: string[] = [];
  let cursor = 0;

  for (let d = stepDay(today, -1); d >= floor; d = stepDay(d, -1)) {
    // undo everything that happened after this day
    while (cursor < ledger.length && ledger[cursor].date > d) {
      undo(ledger[cursor], held, cashOf);
      cursor += 1;
    }

    const holdings: HoldingSnapshot[] = [];
    const accts: AccountSnapshot[] = [];
    let priced = true;

    for (const a of wanted) {
      const id = String(a.asset_id);
      const from = startByAccount[id];
      if (!from || d < from) continue;                 // this account's records do not reach here

      for (const [mapKey, h] of held) {
        const [accId, securityKey] = mapKey.split('|');
        if (accId !== id || !(h.units > 0)) continue;
        const close = priceOn(securityKey, d);
        if (close == null) { priced = false; break; }  // a day we cannot price is left empty
        holdings.push({
          date: d, accountId: id, securityKey, symbol: symbolOf.get(securityKey),
          units: h.units, price: close, value: h.units * close, currency: 'USD',
        });
      }
      if (!priced) break;

      accts.push({
        date: d, accountId: id,
        cash: cashOf.get(id) ?? 0,
        // the broker's own total is an OBSERVATION, and we have none for a past day we rebuilt
        statedTotal: null,
        typedValue: null,
        currency: 'USD',
      });
    }

    if (!priced) { skipped.push(d); continue; }
    if (!accts.length) continue;
    days.push({ date: d, holdings, accounts: accts, origin: 'reconstructed', writtenAt });
  }

  days.reverse();                                       // oldest first, the way the record reads
  return { days, startByAccount, skipped };
}

/** The one sentence the screen says about a rebuilt line: where it came from and where it starts. */
/* ─ MK-ST-F-074 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rebuiltSentence
 *
 * Answers ..... The one sentence the screen says about a rebuilt line: where it came from and where it starts.
 *
 * Formula .....
 *     ''   when from is missing
 *     who = (institution ?? '').trim()
 *     day = the date `${from}T12:00:00`).to locale date string('en − US', { month: 'short', day: 'numeric', year: 'numeric' }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-074
 * Changed ..... not in git yet (—)
 */
export function rebuiltSentence(institution: string | null | undefined, from: string | null): string {
  if (!from) return '';
  const who = (institution ?? '').trim();
  const day = new Date(`${from}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return who ? `Rebuilt from ${who}’s own records, back to ${day} — the first day it shares.`
             : `Rebuilt from your account’s own records, back to ${day} — the first day it shares.`;
}
