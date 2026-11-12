// Net worth and Performance · WHAT A PHONE ALREADY HOLDS, MOVED ONTO THE ONE MASTER RECORD ONCE (asset-record.ts).
//
// THE RULE (DEC-10749, his "go", 2026-11-12). The move no longer rebuilds the past by replaying the phone's activity
// against its tax lots: the app rewrites those old copies (saving the holding editor after a part sale rewrites a lot's
// opening record), so a replay cannot always explain the lots. For each account moved — typed by hand or imported:
//   1. WHAT IS HELD NOW is the holding's tax lots exactly as the phone shows them: one purchase per lot, its shares, its
//      price paid (an option's shares a contract, a bond's per-$100 quote), its date (blank where none). The shares on
//      record equal what the phone shows, always.
//   2. EACH PAST SALE recorded on the phone is saved on its own date with the gain the app shows today — the one reading,
//      realizedFromLedger, as the Performance tab reads it. The shares a sale sold are not among the lots, so each sale
//      names a purchase of exactly the shares it sold, saved for it and marked "behind a sale before the record"
//      (behindSaleBeforeRecord), priced so the record's gain for the sale equals the app's. Its date is blank: the app's
//      reading gives no purchase date.
//   3. Dividends, interest, deposits, withdrawals, fees and transfers keep their own rows and dates. Shares moved from one
//      moved account to another: the lots that arrived are saved as purchases of the account they left, and the transfer
//      names them, so they reach the second account once.
//   4. What the old copies cannot explain (a sale the app shows no gain for, a transfer it cannot place) is marked, as a
//      fact on the holding (notExplainedBeforeRecord), and asked once with the account's questions — never rebuilt.
//   5. AN IMPORTED ACCOUNT's values are saved on the file's day only while the account still is as the file left it.
//      Traded or edited since, its lots are today's, not the file's: no file value is saved, and a fact says so
//      (fileValuesNotMoved). An undated file stays undated (importedListDay).
//   6. AN ACCOUNT DELETED BEFORE THE MOVE: its rows are saved and carry the accountRemoved fact, as the live record writes it.
//   · AN ACCOUNT LINKED TO A BROKER is not moved: its next update reads the broker's whole history into the record.
//
// WHAT IT NEVER DOES. It never moves the old daily values (their dates were the phone's). It never moves an account
// twice: every account it moves carries its mark, and only that mark says an account was moved (outside check 4,
// 2026-11-12: rows typed or imported after the update made it skip whole accounts). A row typed or imported after the
// update and before the move ran is kept and never saved twice: a purchase, a sale, a transfer or any other transaction
// by its key, a tax lot by its key or its date, shares and price, a value or a fact by what it holds.
import { addRows, correctRow, rowsInForce, sharesTakenBy, saleRow, saleGain, transferRow, valueRows, dayOrNull, oneHoldingSpelling, type AssetRow, type NewRow, type RowSource, type ListQuestion, type EventQuestion } from './asset-record';
import { typedChangeToRecord, typedAccountRows, givenNumber, unitPriceFactor, lotRef, txnRef } from './asset-record-from-typed';
import { contractMultiplier, type Position } from '../../../src/domain/performance';
import { realizedFromLedger } from '../../../src/domain/performance/realized';
import type { Transaction } from '../../../src/domain/transactions';
import type { AssetAccount } from '../../../src/domain/assets';
import { isoLocalDate } from '../../../src/domain/_shared/dates';

/** The day an imported account's values are from: the file's own date, never the day of the import (outside check,
 *  2026-11-12). An account saved since then says which it is (value_as_of_from_file). One saved before filled a file's
 *  missing date with the day it was imported, which is also its "last synced" day, so a "Value as of" on that day is
 *  read as no date given — blank, and asked. That also blanks a file that was dated the very day it was imported: asking
 *  for a date the file did give is the safe mistake; saving the phone's date as the file's is not. */
/* ─ MK-NW-F-288 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * importedListDay
 *
 * Answers ..... The day an imported account's values are from: the file's own date, never the day of the import (outside check, 2026-11-12).
 *
 * Formula .....
 *     given = day or null((a as any).value as of), from file = (a as any).value as of from file
 *     given   when from file = true
 *     nothing   when from file = false (or given = nothing when missing or zero)
 *     synced = (a as any).last synced
 *     given   when synced = nothing (or !number.is finite(date.parse(string(synced))) when missing or zero)
 *     import days = the first 10)] of a list with no repeats of [iso local date(new date(string(synced))), string(synced)
 *     the answer:
 *     nothing   if import days.has(given)
 *     given   otherwise
 *
 * Called by ... MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-033 the date a hand-typed value was set
 *               MK-XS-I-066 last successful update of a linked or imported account
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-288
 * Changed ..... not in git yet (—)
 */
function importedListDay(a: AssetAccount): string | null {
  const given = dayOrNull((a as any).value_as_of), fromFile = (a as any).value_as_of_from_file;
  if (fromFile === true) return given;
  if (fromFile === false || given == null) return null;
  const synced = (a as any).last_synced;
  if (synced == null || !Number.isFinite(Date.parse(String(synced)))) return given;
  const importDays = new Set([isoLocalDate(new Date(String(synced))), String(synced).slice(0, 10)]);
  return importDays.has(given) ? null : given;
}

export interface MoveResult {
  record: AssetRow[];
  /** The accounts moved, by id. */
  moved: string[];
  /** unexplained: what the old copies could not explain, each in a sentence, asked once. */
  ask: { accountId: string; events: EventQuestion[]; lists: ListQuestion[]; unexplained: string[] }[];
  problems: string[];
}

/** The key of the move's own mark on an account it moved. */
/* ─ MK-NW-F-290 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * movedMark
 *
 * Answers ..... The key of the move's own mark on an account it moved.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-290
 * Changed ..... not in git yet (—)
 */
const movedMark = (accountId: string): string => `moved-from-phone:${accountId}`;

/** The transactions that move shares of a holding. */
const SHARE_MOVES: ReadonlySet<string> = new Set(['OPENING_POSITION', 'BUY', 'SELL', 'TRANSFER_IN_KIND']);

/** An imported account's values on the day of its list, as the file's. */
/* ─ MK-NW-F-226 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * fileValues
 *
 * Answers ..... An imported account's values on the day of its list, as the file's.
 *
 * Formula .....
 *     holding = one holding spelling((a as any).label ?? nothing)
 *     value rows({ account id: string(asset id), date: list day, source: 'file', cash: 0, holdings: [{ holding, shares: nothing, price: nothing, value: given number(balance) }] })   when holding ≠ nothing
 *     holdings = []
 *     holding = one holding spelling(ticker)
 *     per = per   if contract multiplier(p as any), as shares = kind = 'options'
 *     1   otherwise
 *     shares = Σ over lots (or none when missing) of (given number(shares) (or 0 when missing))
 *     price = given number(last price)
 *     the answer = value rows({ account id: string(asset id), date: list day, source: 'file', cash: given number((a as any).cash balance), holdings })
 *
 * Called by ... MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-226
 * Changed ..... not in git yet (—)
 */
function fileValues(a: AssetAccount, listDay: string | null): NewRow[] {
  // an account the import made for one row with a value and no quantity (valueOnlyAccountsOf: no holdings, its balance
  // the row's value) holds that value and no cash (outside check, 2026-11-12: it was moved with no value at all)
  if (!(a.positions ?? []).length && (a as any).derive_balance !== true && givenNumber(a.balance) != null) {
    const holding = oneHoldingSpelling((a as any).label ?? null);
    if (holding != null) return valueRows({ accountId: String(a.asset_id), date: listDay, source: 'file', cash: 0, holdings: [{ holding, shares: null, price: null, value: givenNumber(a.balance) }] });
  }
  const holdings: { holding: string; shares: number | null; price: number | null; value: number | null }[] = [];
  for (const p of (a.positions ?? []) as Position[]) {
    const holding = oneHoldingSpelling(p.ticker);
    if (holding == null) continue;
    const per = contractMultiplier(p as any), asShares = p.kind === 'options' ? per : 1;
    const shares = (p.lots ?? []).reduce((t, l) => t + (givenNumber(l.shares) ?? 0), 0);
    const price = givenNumber(p.last_price);
    holdings.push({ holding, shares: shares * asShares, price, value: price == null ? null : shares * price * per });
  }
  return valueRows({ accountId: String(a.asset_id), date: listDay, source: 'file', cash: givenNumber((a as any).cash_balance), holdings });
}

/** An imported account's facts, as the file's import saves them (asset-record-from-file.ts): a bond's or CD's face value,
 *  rate, maturity and quote, and an option's shares a contract (comparison check, 2026-11-11: the move saved none). */
/* ─ MK-NW-F-227 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * fileFacts
 *
 * Answers ..... An imported account's facts, as the file's import saves them (asset-record-from-file.ts): a bond's or CD's face value, rate, maturity and quote, and an option's shares a contract (comparison check, 2026-11-11: the move saved none).
 *
 * Formula .....
 *     out = []
 *     holding = one holding spelling(ticker)
 *     the answer = out
 *
 * Called by ... MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-227
 * Changed ..... not in git yet (—)
 */
function fileFacts(a: AssetAccount): NewRow[] {
  const out: NewRow[] = [];
  for (const p of (a.positions ?? []) as any[]) {
    const holding = oneHoldingSpelling(p.ticker);
    if (holding == null) continue;
    const facts: Record<string, unknown> = {
      ...(p.face_value != null ? { face_value: p.face_value } : {}),
      ...(p.coupon_rate != null ? { coupon_rate: p.coupon_rate } : {}),
      ...(p.maturity_date ? { maturity_date: p.maturity_date } : {}),
      ...(p.price_quote ? { price_quote: p.price_quote } : {}),
      ...(p.kind === 'options' && p.multiplier != null ? { multiplier: p.multiplier } : {}),
    };
    if (Object.keys(facts).length) out.push({ accountId: String(a.asset_id), holding, kind: 'FACT', date: null, source: 'file', facts });
  }
  return out;
}

/** A holding's tax lots as the phone shows them, in shares (an option's contracts times its shares a contract). */
type ShownLot = { shares: number; date: string | null; price: number | null };
/** A holding's tax lots with more than zero shares, each as shares (times the shares a contract), its purchase day and its price per share. */
/* ─ MK-NW-F-291 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * lotsOf
 *
 * Answers ..... A holding's tax lots with more than zero shares, each as shares (times the shares a contract), its purchase day and its price per share.
 *
 * Formula .....
 *     c = given number(cost per share)
 *     the answer:
 *     shares = number(shares) × per
 *     date = day or null(purchase date)
 *     price = nothing   if c = nothing
 *     c × unit price factor(p)   otherwise
 *
 * Called by ... MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-291
 * Changed ..... not in git yet (—)
 */
const lotsOf = (p: Position, per: number): ShownLot[] => (p.lots ?? []).filter((l) => (givenNumber(l.shares) ?? 0) > 0).map((l) => {
  const c = givenNumber(l.cost_per_share);
  return { shares: Number(l.shares) * per, date: dayOrNull(l.purchase_date), price: c == null ? null : c * unitPriceFactor(p) };
});

/** WHAT A PHONE HOLDS, moved onto the record for every account the record holds nothing for. */
/* ─ MK-NW-F-228 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * moveOldCopies
 *
 * Answers ..... WHAT A PHONE HOLDS, moved onto the record for every account the record holds nothing for.
 *
 * Formula .....
 *     out = record = [...record]
 *     moved = []
 *     ask = []
 *     problems = []
 *     same = (x: number | nothing | undefined, y: number | nothing | undefined) => (x = nothing and y = nothing) (or x ≠ nothing and y ≠ nothing and size of(x − y) ≤ 1e − 9 when missing or zero)
 *     in force = rows in force(record)
 *     marked = a list with no repeats of in force where kind = 'FACT' and ref = moved mark(account id)for each of : account id
 *     known = a list with no repeats of for each of accounts: string(asset id)
 *     moving ids = a list with no repeats of for each of moving: string(asset id)
 *     account of = (id: string) => moving.find((a) => string(asset id) = id)
 *     imported = (id: string) => (account of(id).source as string) = 'imported'
 *     source of = (id: string): row source => (imported(id) ? 'file' : 'typed')
 *     holding of = (t: transaction) => (SHARE_MOVES.has(type) ? one holding spelling(ticker ?? nothing) : nothing)
 *     h = holding of(t)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If m is missing it uses 1.
 *     · If shares is missing it uses 0.
 *     · If matched is missing it uses 0.
 *     · Never lets n fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-228
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function moveOldCopies(record: readonly AssetRow[], accounts: readonly AssetAccount[], transactions: readonly Transaction[], writtenAt: string): MoveResult {
  const out: MoveResult = { record: [...record], moved: [], ask: [], problems: [] };
  const same = (x: number | null | undefined, y: number | null | undefined) => (x == null && y == null) || (x != null && y != null && Math.abs(x - y) <= 1e-9);
  // an account is moved once: where the move wrote its own mark (a FACT keyed movedMark, with no facts, so no account
  // detail reads it). Only the mark counts (outside check 4, 2026-11-12): rows the live record wrote after the update — a
  // buy, an edit, a re-imported file — made the move skip the whole account, so its old sales and dividends never reached
  // the record. The move has never shipped, so no phone moved an account before the mark existed. What was typed or
  // imported after the update is kept and matched below, never saved twice
  const inForce = rowsInForce(record);
  const marked = new Set(inForce.filter((r) => r.kind === 'FACT' && r.ref === movedMark(r.accountId)).map((r) => r.accountId));
  // an account deleted before the move: the phone still holds its transactions, not the account (rule 6). One deleted
  // after the update already carries the accountRemoved the live record wrote: its old activity is still moved, and
  // that fact is not written twice
  const known = new Set(accounts.map((a) => String(a.asset_id)));
  const deletedIds = new Set([...new Set(transactions.filter((t) => t.source !== 'connected' && t.account_id != null && !known.has(String(t.account_id)))
    .map((t) => String(t.account_id)))].filter((id) => !marked.has(id)));
  const moving: AssetAccount[] = [...accounts.filter((a) => a.source !== 'connected' && !marked.has(String(a.asset_id))),
    ...[...deletedIds].map((id) => ({ asset_id: id, label: id, kind: 'brokerage', source: 'manual', positions: [] }) as unknown as AssetAccount)];
  const movingIds = new Set(moving.map((a) => String(a.asset_id)));
  const accountOf = (id: string) => moving.find((a) => String(a.asset_id) === id);
  const imported = (id: string) => (accountOf(id)?.source as string) === 'imported';
  const sourceOf = (id: string): RowSource => (imported(id) ? 'file' : 'typed');
  const holdingOf = (t: Transaction) => (SHARE_MOVES.has(t.type) ? oneHoldingSpelling(t.ticker ?? null) : null);
  const positionOf = (accountId: string, h: string): Position | undefined => ((accounts.find((a) => String(a.asset_id) === accountId)?.positions ?? []) as Position[])
    .find((p) => oneHoldingSpelling(p.ticker) === h);
  // an option traded before trades carried their shares per contract (2026-10-23) is counted in shares as the holding
  // states them, else 100 (DEC-0274), so 2 contracts bought and 1 sold are 200 and 100 shares (outside check, 2026-11-12)
  const counted = (t: Transaction): Transaction => {
    const h = holdingOf(t);
    if (h == null || t.multiplier != null || !['BUY', 'SELL', 'OPENING_POSITION'].includes(t.type)) return t;
    const p = positionOf(String(t.account_id), h);
    if (t.kind !== 'options' && p?.kind !== 'options') return t;
    return { ...t, multiplier: contractMultiplier((p?.kind === 'options' ? p : { kind: 'options' }) as any) };
  };
  // the account holders' own transactions on every account moved, oldest first
  const all = transactions.filter((t) => movingIds.has(String(t.account_id)) && t.source !== 'connected').map(counted)
    .sort((x, y) => String(x.date).localeCompare(String(y.date)) || String(x.created_at).localeCompare(String(y.created_at)));
  // a transaction typed after the update but before the move is already on record under its own key: not saved twice
  const refsBefore = new Set(inForce.map((r) => r.ref).filter((r): r is string => !!r));
  const savedBefore = (t: Transaction) => refsBefore.has(txnRef(t));
  // a value or a fact the live record already holds — a balance typed, a file imported, after the update — is not saved
  // twice (outside check 4, 2026-11-12: H14's $6,100 typed after the update): an account's own value row the same as one
  // on record, with the holdings saved beside it, or a fact the same as one on record
  const notOnRecord = (rows: NewRow[]): NewRow[] => {
    const live = rowsInForce(out.record), kept: NewRow[] = [];
    let skip = false;
    for (const r of rows) {
      if (r.kind === 'VALUE' && r.holding == null) skip = live.some((x) => x.kind === 'VALUE' && x.holding == null && x.accountId === r.accountId
        && (x.date ?? null) === (r.date ?? null) && x.source === r.source && same(x.amount, r.amount) && same(x.typedValue, r.typedValue) && same(x.statedTotal, r.statedTotal));
      if (r.kind === 'VALUE') { if (!skip) kept.push(r); continue; }
      if (r.kind === 'FACT' && live.some((x) => x.kind === 'FACT' && x.accountId === r.accountId && (x.holding ?? null) === (r.holding ?? null)
        && (x.ref ?? null) === (r.ref ?? null) && JSON.stringify(x.facts ?? {}) === JSON.stringify(r.facts ?? {}))) continue;
      kept.push(r);
    }
    return kept;
  };
  // A TRADE IN THE UNITS OF ITS HOLDING'S TAX LOTS (lotsOf): an option's contracts times its shares a contract at its
  // per-share price; a bond's face at its per-$100 quote times a hundredth (outside check 4, 2026-11-12: a $4,000 face
  // sale at 101 was saved as 40 at $101 beside lots of 6,000 at $0.98)
  const unitsOf = (t: Transaction): { per: number; factor: number } => {
    const h = holdingOf(t), p = h == null ? undefined : positionOf(String(t.account_id), h);
    const m = t.multiplier != null && t.multiplier > 0 ? Number(t.multiplier) : null;
    if (t.kind === 'options' || p?.kind === 'options') return { per: m ?? 1, factor: 1 };
    return { per: 1, factor: m ?? (p ? unitPriceFactor(p) : 1) };
  };
  const sharesIn = (t: Transaction): number | null => (givenNumber(t.shares) == null ? null : Math.abs(Number(t.shares)) * unitsOf(t).per);
  const priceIn = (t: Transaction): number | null => { const x = givenNumber(t.price); return x == null ? null : x * unitsOf(t).factor; };

  const asked = new Map<string, { events: EventQuestion[]; lists: ListQuestion[]; unexplained: string[] }>();
  const askOf = (id: string) => { if (!asked.has(id)) asked.set(id, { events: [], lists: [], unexplained: [] }); return asked.get(id)!; };
  const notExplained = new Map<string, { id: string; h: string | null; said: string[] }>();
  const mark = (id: string, h: string | null, said: string) => {
    const k = `${id}|${h ?? ''}`;
    if (!notExplained.has(k)) notExplained.set(k, { id, h, said: [] });
    notExplained.get(k)!.said.push(said);
    askOf(id).unexplained.push(said);
  };
  const save = (rows: NewRow[]): AssetRow[] => { if (!rows.length) return []; out.record = addRows(out.record, rows, writtenAt); return out.record.slice(-rows.length); };

  // EVERY HOLDING OF EVERY ACCOUNT MOVED, with its tax lots as the phone shows them. A file can list one holding on two
  // rows, each its own position (outside check 2, 2026-11-12), so a holding's lots are read over all its positions
  type Shown = { lot: Position['lots'][number]; p: Position; shares: number; date: string | null; price: number | null };
  const held = new Map<string, { id: string; h: string; lots: Shown[] }>();
  for (const a of moving) {
    const id = String(a.asset_id);
    for (const p0 of (a.positions ?? []) as Position[]) {
      const h = oneHoldingSpelling(p0.ticker);
      if (h == null) continue;
      // shares a contract: the option's own figure; for a holding saved without its kind, the figure its trades state
      // (outside check, 2026-11-12: 2 contracts bought at $5 with 100 shares a contract were moved as 2 shares at $5)
      const stated = Math.max(1, ...all.filter((t) => String(t.account_id) === id && holdingOf(t) === h && t.multiplier != null && t.multiplier > 0).map((t) => Number(t.multiplier)));
      const p: Position = p0.kind !== 'options' && stated > 1 ? { ...p0, kind: 'options', multiplier: stated } as Position : p0;
      const per = p.kind === 'options' ? contractMultiplier(p as any) : 1;
      const k = `${id}|${h}`;
      if (!held.has(k)) held.set(k, { id, h, lots: [] });
      const live = (p.lots ?? []).filter((l) => (givenNumber(l.shares) ?? 0) > 0);
      lotsOf(p, per).forEach((s, i) => held.get(k)!.lots.push({ lot: live[i], p, ...s }));
    }
  }

  // AN IMPORTED ACCOUNT STILL AS THE FILE LEFT IT (rule 5): nothing recorded on it since but the file's own first entries,
  // nothing moved into it, and each holding still the one tax lot the file gave, as its first entry states it
  const asFileLeftIt = (a: AssetAccount): boolean => {
    const id = String(a.asset_id);
    if (all.some((t) => String(t.account_id) === id && t.type !== 'OPENING_POSITION')) return false;
    if (transactions.some((t) => t.counter_account_id != null && String(t.counter_account_id) === id)) return false;
    const lots = ((a.positions ?? []) as Position[]).map((p) => p.lots ?? []);
    if (lots.some((ls) => ls.length !== 1)) return false;
    const firsts = all.filter((t) => String(t.account_id) === id && t.type === 'OPENING_POSITION');
    return !firsts.length || (firsts.length === lots.length && lots.every(([l]) => firsts.some((t) => t.lot_id === l.lot_id
      && Math.abs(Number(t.shares) - Number(l.shares)) <= 1e-9 && dayOrNull(t.date) === dayOrNull(l.purchase_date))));
  };
  // …AND NEVER CHANGED SINCE, AS FAR AS THE PHONE CAN TELL (outside check 4, 2026-11-12: 10 AAPL at $150 from the file,
  // changed in the holding editor to 12 at $140, was saved as 12 AAPL on the file's day). The holding editor rewrites the
  // tax lot AND its first entry, so those two always agree and cannot tell an edit. What can: the import never values a
  // holding (importedAccountOf), and every change on the phone — the editor, a trade, a price refresh — rebuilds the
  // account's balance, which values every holding (value_now). A holding with no value_now has never been changed; one
  // with it may have been, and is not taken for the file's. The safe mistake: a file refreshed but never edited saves no
  // file value and says so; saving today's holdings under the file's day is not
  const neverChanged = (a: AssetAccount): boolean => ((a.positions ?? []) as any[]).every((p) => p.value_now == null);
  // an imported account the live record already holds the file's own rows for — a file imported after the update — has
  // its file's values and lots on record: they are not saved again, and what is not among them is the account holder's
  const fileOnRecord = (id: string): boolean => inForce.some((r) => r.accountId === id && r.source === 'file');

  // VALUES AND FACTS, account by account
  const listDayOf = new Map<string, string | null>();
  const fileLotsKnown = new Set<string>();
  for (const a of moving) {
    const id = String(a.asset_id);
    if (deletedIds.has(id)) continue;
    if (!imported(id)) { save(notOnRecord(typedAccountRows(a))); continue; }
    if (fileOnRecord(id)) { save(notOnRecord(fileFacts(a))); continue; }
    const listDay = importedListDay(a);
    const untouched = asFileLeftIt(a);
    if (untouched && neverChanged(a)) { listDayOf.set(id, listDay); fileLotsKnown.add(id); save(notOnRecord([...fileValues(a, listDay), ...fileFacts(a)])); continue; }
    if (neverChanged(a)) fileLotsKnown.add(id);
    // traded or edited since the file: its lots and values are today's, not the file's — no value is saved under its day
    // (outside check 3, 2026-11-12: a Jun 21 file total of $4,800 was saved as $4,980)
    const said = untouched
      ? `The account may have been edited after the file${listDay ? ` of ${listDay}` : ''}, and the phone cannot tell its holdings from the file’s, so the file’s values are not known and none were moved.`
      : `The account was traded or edited after the file${listDay ? ` of ${listDay}` : ''}, so the file’s values are not known and none were moved.`;
    save(notOnRecord([...fileFacts(a), { accountId: id, holding: null, kind: 'FACT', date: null, source: 'file', facts: { fileValuesNotMoved: said } }]));
  }

  // EACH PAST SALE'S GAIN AS THE APP SHOWS IT (rule 2): realizedFromLedger, read as the Performance tab reads it (one
  // holding of one account), sale by sale — what the sales up to and including this one made, less what the sales before
  // it made. A sale the app counts only part of (DEC-4643) keeps the part it counts: the shares it matched and their gain
  const appGains = new Map<string, { gain: number | null; matched: number | null; partGain: number | null }>();
  const groups = new Map<string, Transaction[]>();
  for (const t of all) if (t.type === 'SELL' && holdingOf(t) != null) groups.set(`${t.account_id}|${holdingOf(t)}`, [...(groups.get(`${t.account_id}|${holdingOf(t)}`) ?? []), t]);
  for (const sales of groups.values()) {
    const s0 = sales[0], h = holdingOf(s0) as string;
    const p = positionOf(String(s0.account_id), h);
    const opts = { ticker: String(s0.ticker), accountId: s0.account_id, holding: (p ?? { kind: s0.kind, multiplier: s0.multiplier }) as any };
    const priced = (t: Transaction) => t.price != null && Number.isFinite(t.price) && (t.shares ?? 0) > 0;
    const ids = new Set(sales.map((t) => t.id));
    // the sales in the order the reading takes them: by date, and on one date in the order the phone holds them
    const order = transactions.map((t, i) => ({ t, i })).filter(({ t }) => ids.has(t.id) && priced(t))
      .sort((x, y) => String(x.t.date).localeCompare(String(y.t.date)) || x.i - y.i).map(({ t }) => t);
    const upTo = new Set<Transaction>();
    let was = realizedFromLedger(transactions.filter((t) => t.type !== 'SELL') as Transaction[], opts);
    for (const s of order) {
      upTo.add(s);
      const now = realizedFromLedger(transactions.filter((t) => t.type !== 'SELL' || upTo.has(t)) as Transaction[], opts);
      const short = now.shortOfPurchases.length > was.shortOfPurchases.length ? now.shortOfPurchases[now.shortOfPurchases.length - 1] : null;
      const made = now.realizedAllTime - was.realizedAllTime;
      appGains.set(s.id, short ? { gain: null, matched: short.matched, partGain: givenNumber((short as any).gain) ?? made } : { gain: made, matched: null, partGain: null });
      was = now;
    }
  }
  // the purchases behind a sale, in the lots' units: exactly the shares it sold, priced so the record's gain is the app's;
  // for a sale the app counts only part of, the shares it matched priced so, and the rest with no price (asked, rule 4)
  type Piece = { shares: number; price: number | null };
  const piecesOf = (t: Transaction): Piece[] => {
    const shares = sharesIn(t), price = priceIn(t), app = appGains.get(t.id);
    if (shares == null || shares <= 0) return [];
    if (app == null || price == null) return [{ shares, price: null }];
    if (app.gain != null) return [{ shares, price: price - app.gain / shares }];
    const m = Math.min(shares, (app.matched ?? 0) * unitsOf(t).per);
    if (!(m > 1e-9) || app.partGain == null) return [{ shares, price: null }];
    return [{ shares: m, price: price - app.partGain / m }, ...(shares - m > 1e-9 ? [{ shares: shares - m, price: null }] : [])];
  };
  // the first `n` shares of a sale's pieces, and what is left of them
  const takePieces = (pieces: Piece[], n: number): { took: Piece[]; left: Piece[] } => {
    const took: Piece[] = [], left: Piece[] = [];
    for (const x of pieces) {
      const k = Math.min(x.shares, Math.max(n, 0));
      if (k > 1e-9) took.push({ shares: k, price: x.price });
      if (x.shares - k > 1e-9) left.push({ shares: x.shares - k, price: x.price });
      n -= k;
    }
    return { took, left };
  };
  // purchases already saved behind a sale (by a transfer of the shares it later sold), by the sale
  const behindSaved = new Map<string, { rowId: string; shares: number; price: number | null }[]>();
  const piecesLeft = new Map<string, Piece[]>();
  const piecesFor = (t: Transaction) => { if (!piecesLeft.has(t.id)) piecesLeft.set(t.id, piecesOf(t)); return piecesLeft.get(t.id)!; };

  // SHARES MOVED BETWEEN TWO ACCOUNTS MOVED (rule 3): the tax lots that arrived are saved as purchases of the account they
  // left, and the transfer names them, so they reach the second account once and leave the first at nothing
  const arrived = new Map<Shown, number>();
  for (const t of all.filter((x) => x.type === 'TRANSFER_IN_KIND')) {
    const h = holdingOf(t), from = String(t.account_id), to = t.counter_account_id != null ? String(t.counter_account_id) : null;
    if (h == null || savedBefore(t)) continue;
    const when = dayOrNull(t.date) ?? 'a day not given';
    if (t.direction === 'IN' || to == null || !movingIds.has(to)) { mark(from, h, `The shares of ${h} moved on ${when} cannot be placed from what the phone held, so the transfer was not moved.`); continue; }
    const theirs = held.get(`${to}|${h}`)?.lots ?? [];
    // the holding moved whole keeps its own number: the lots of that holding, where the account they left states it
    const fromIt = new Set(all.filter((x) => String(x.account_id) === from && x.position_id != null).map((x) => String(x.position_id)));
    const named = theirs.filter((s) => fromIt.has(String(s.p.position_id)));
    const day = dayOrNull(t.date);
    const pool = (named.length ? named : theirs).filter((s) => day == null || s.date == null || s.date <= day);
    let want = sharesIn(t) ?? Infinity;
    const took: { s: Shown; shares: number }[] = [];
    for (const s of pool) {
      const free = s.shares - (arrived.get(s) ?? 0);
      const n = Math.min(free, want);
      if (n <= 1e-9) continue;
      took.push({ s, shares: n }); arrived.set(s, (arrived.get(s) ?? 0) + n); want -= n;
    }
    // THE SHARES THE SECOND ACCOUNT SOLD SINCE ALSO MOVED (outside check 4, 2026-11-12: 15 QQQ moved whole, 4 of them sold
    // after, was saved as a transfer of 11 — A held 11 before May 1, not 15): they are not among the lots, so each later
    // sale's shares are saved as a purchase of the account they left, behind that sale, and the transfer names them too
    const later: { sale: Transaction; pieces: Piece[] }[] = [];
    for (const sale of all.filter((x) => x.type === 'SELL' && String(x.account_id) === to && holdingOf(x) === h && (day == null || (dayOrNull(x.date) ?? '9999') >= day))) {
      if (want <= 1e-9) break;
      const { took: pieces, left } = takePieces(piecesFor(sale), want);
      if (!pieces.length) continue;
      piecesLeft.set(sale.id, left);
      want -= pieces.reduce((n, x) => n + x.shares, 0);
      later.push({ sale, pieces });
    }
    if (!took.length && !later.length) { mark(from, h, `The shares of ${h} moved on ${when} are not among the tax lots the phone shows, so the transfer was not moved.`); continue; }
    const bought = save(took.map(({ s, shares }) => ({ accountId: from, holding: h, kind: 'PURCHASE' as const, date: s.date, shares, price: s.price,
      amount: s.price == null ? null : shares * s.price, source: sourceOf(from), ref: `moved-transfer-lot:${to}:${s.lot?.lot_id ?? ''}:${t.id}` })));
    const behind: AssetRow[] = [];
    for (const { sale, pieces } of later) {
      const rows = save(pieces.map((x, i) => ({ accountId: from, holding: h, kind: 'PURCHASE' as const, date: null, shares: x.shares, price: x.price,
        amount: x.price == null ? null : x.shares * x.price, source: 'typed' as const, ref: `moved-behind-sale:${sale.id}:${t.id}:${i}`, facts: { behindSaleBeforeRecord: true } })));
      behindSaved.set(sale.id, [...(behindSaved.get(sale.id) ?? []), ...rows.map((r) => ({ rowId: r.rowId, shares: r.shares ?? 0, price: r.price ?? null }))]);
      behind.push(...rows);
    }
    const sells = [...bought, ...behind].map((r) => ({ rowId: r.rowId, shares: r.shares ?? 0 }));
    save([transferRow({ fromAccountId: from, toAccountId: to, holding: h, date: t.date ?? null, shares: sells.reduce((n, x) => n + x.shares, 0), source: 'typed',
      ref: txnRef(t), sells })]);
  }

  // WHAT IS HELD NOW (rule 1): each tax lot as one purchase — less the shares that arrived by a transfer, and less a
  // purchase already on record (typed or imported after the update: the same lot, or the same date, shares and price)
  for (const { id, h, lots } of held.values()) {
    const before = inForce.filter((r) => r.kind === 'PURCHASE' && r.accountId === id && r.holding === h);
    const used = new Set<AssetRow>();
    const left: Shown[] = [];
    for (const s of lots) {
      const shares = s.shares - (arrived.get(s) ?? 0);
      if (shares <= 1e-9) continue;
      const twin = before.find((r) => !used.has(r) && ((s.lot && r.ref === lotRef(id, s.lot)) || ((r.date ?? null) === s.date && same(r.shares, shares) && same(r.price, s.price))));
      if (twin) { used.add(twin); continue; }
      left.push({ ...s, shares });
    }
    if (imported(id)) {
      // the file's own tax lots are the file's, where the phone can tell they are as the file gave them; a lot bought on
      // the phone since, or one the phone cannot tell from an edit, is the account holder's (outside check 4: the $140
      // the holding editor typed was saved as the file's)
      const listDay = listDayOf.get(id) ?? null, fileDay = importedListDay(accountOf(id)!);
      const firsts = new Set(all.filter((t) => String(t.account_id) === id && t.type === 'OPENING_POSITION' && t.lot_id != null).map((t) => String(t.lot_id)));
      const fromFile = (s: Shown) => fileLotsKnown.has(id) && (firsts.size ? firsts.has(String(s.lot?.lot_id)) : fileDay == null || s.date == null || s.date <= fileDay);
      save(left.map((s) => ({ accountId: id, holding: h, kind: 'PURCHASE' as const, date: s.date, shares: s.shares, price: s.price,
        amount: s.price == null ? null : s.shares * s.price, source: fromFile(s) ? 'file' as const : 'typed' as const, stillHeldOn: fromFile(s) ? listDay : null })));
      continue;
    }
    for (const p of [...new Set(left.map((s) => s.p))]) {
      const per = p.kind === 'options' ? contractMultiplier(p as any) : 1;
      const position = { ...p, lots: left.filter((s) => s.p === p).map((s) => ({ ...s.lot, shares: s.shares / per })) } as Position;
      const got = typedChangeToRecord(out.record, { kind: 'holding-added', accountId: id, position }, writtenAt);
      out.record = got.record; askOf(id).events.push(...got.ask); out.problems.push(...got.problems);
    }
  }

  // EACH PAST SALE (rule 2), on its own date, selling the purchases behind it. A sale the app counts no full gain for is
  // marked and asked (rule 4); one it counts part of keeps that part — saved as a sale of the shares the app matched, with
  // their gain, beside a sale of the rest, which has none (outside check 4, 2026-11-12: a sale of 8 the app matched 3 of,
  // counting $120, was saved with no gain at all)
  for (const t of all.filter((x) => x.type === 'SELL' && holdingOf(x) != null)) {
    const id = String(t.account_id), h = holdingOf(t) as string;
    const shares = sharesIn(t), price = priceIn(t);
    if (shares == null || shares <= 0) { if (!savedBefore(t)) { const got = typedChangeToRecord(out.record, { kind: 'transaction-recorded', transaction: t }, writtenAt); out.record = got.record; } continue; }
    const app = appGains.get(t.id), when = dayOrNull(t.date) ?? 'a day not given', per = unitsOf(t).per;
    const known = app != null && app.gain != null && price != null;
    // a sale typed after the update is on record already. Where it is sold from purchases on record and makes the gain the
    // app shows, the record already reads it as the phone does: it stays as it is (an account typed whole after the update).
    // Else it sold purchases typed after the update that the phone still holds — the phone sold older shares, not yet on
    // record then — or none: it is pointed at a purchase of its shares bought behind it, as a sale typed before the update
    const onRecord = savedBefore(t) ? rowsInForce(out.record).find((r) => r.kind === 'SALE' && r.ref === txnRef(t)) : undefined;
    if (onRecord && known) {
      // read as the record stood before the move: the tax lots it saves since would otherwise be sold a second time
      const taken = sharesTakenBy(record, id, h).find((x) => x.rowId === onRecord.rowId);
      const placed = taken ? taken.from.reduce((n, f) => n + f.shares, 0) : 0, gain = saleGain(record, onRecord.rowId);
      if (taken && Math.abs(shares - placed) <= 1e-9 && gain != null && Math.abs(gain - (app!.gain as number)) <= 0.005) {
        // it keeps the purchases it sold then, named, so an older tax lot the move saves is not read as sold by it
        if (!onRecord.sells?.length) {
          const c = correctRow(out.record, onRecord.rowId, { sells: taken.from.map((f) => ({ rowId: f.rowId, shares: f.shares })) }, 'typed', writtenAt);
          if (c.problem) out.problems.push(c.problem); else out.record = c.record;
        }
        continue;
      }
    }
    if (!known) mark(id, h, app == null
      ? `The sale of ${shares} ${h} on ${when} has no price the app can count, so the record shows no gain for it.`
      : `The sale of ${shares} ${h} on ${when}: what was paid for ${app.matched ? `${shares - app.matched * per} of the shares` : 'them'} is not on record, so the record shows no gain for it.`);
    if (onRecord) {
      const [behind] = save([{ accountId: id, holding: h, kind: 'PURCHASE', date: null, shares, price: known ? (price as number) - (app!.gain as number) / shares : null,
        amount: known ? shares * (price as number) - (app!.gain as number) : null, source: 'typed', ref: `moved-behind-sale:${t.id}`, facts: { behindSaleBeforeRecord: true } }]);
      const c = correctRow(out.record, onRecord.rowId, { sells: [{ rowId: behind.rowId, shares }] }, 'typed', writtenAt);
      if (c.problem) out.problems.push(c.problem); else out.record = c.record;
      continue;
    }
    // the purchases behind it: those a transfer already saved for it, then the rest
    const ready = behindSaved.get(t.id) ?? [];
    const made = save(piecesFor(t).map((x, i) => ({ accountId: id, holding: h, kind: 'PURCHASE' as const, date: null, shares: x.shares, price: x.price,
      amount: x.price == null ? null : x.shares * x.price, source: 'typed' as const, ref: `moved-behind-sale:${t.id}${i ? `:${i}` : ''}`, facts: { behindSaleBeforeRecord: true } })));
    const behind = [...ready, ...made.map((r) => ({ rowId: r.rowId, shares: r.shares ?? 0, price: r.price ?? null }))];
    // the shares with a price behind them, and those without, each as its own sale on the sale's date
    const counted = behind.filter((b) => b.price != null), notCounted = behind.filter((b) => b.price == null);
    const parts = counted.length && notCounted.length ? [counted, notCounted] : [behind];
    const amount = givenNumber(t.amount) == null ? null : Math.abs(Number(t.amount)), fee = givenNumber(t.fee) == null ? null : Math.abs(Number(t.fee));
    save(parts.map((part, i) => {
      const n = part.reduce((k, b) => k + b.shares, 0), share = n / shares;
      return saleRow({ accountId: id, holding: h, date: t.date ?? null, shares: n, price, amount: amount == null ? null : amount * share, fee: fee == null ? null : fee * share,
        source: 'typed', ref: i ? `${txnRef(t)}:not-matched` : txnRef(t), sells: part.map((b) => ({ rowId: b.rowId, shares: b.shares })) });
    }));
  }
  // EVERYTHING ELSE (rule 3) — dividends, interest, deposits, withdrawals, fees, cash moved between accounts — each on its
  // own date, saved as typed. A purchase is in the tax lots, a sale and a transfer of shares are saved above
  for (const t of all) {
    if (holdingOf(t) != null || t.type === 'OPENING_POSITION' || savedBefore(t)) continue;
    const got = typedChangeToRecord(out.record, { kind: 'transaction-recorded', transaction: t }, writtenAt);
    out.record = got.record; askOf(String(t.account_id)).events.push(...got.ask); out.problems.push(...got.problems);
  }

  const markOn = (id: string): boolean => {
    if (!imported(id)) return false;
    const i = out.record.findIndex((r, k) => k >= record.length && r.accountId === id && r.kind === 'FACT' && !r.ref);
    if (i < 0) return false;
    out.record[i] = { ...out.record[i], ref: movedMark(id) };
    return true;
  };
  // what the old copies could not explain, as a fact on the holding (rule 4); an account deleted before the move (rule 6);
  // and the move's own mark on every account it moved, so it is never moved again whatever is saved for it later
  save([...[...notExplained.values()].map(({ id, h, said }) => ({ accountId: id, holding: h, kind: 'FACT' as const, date: null, source: 'typed' as const, facts: { notExplainedBeforeRecord: said } })),
    ...notOnRecord([...deletedIds].map((id) => ({ accountId: id, holding: null, kind: 'FACT' as const, date: null, source: 'typed' as const, facts: { accountRemoved: true } }))),
    // every account moved carries the mark, an imported one too: a row of the file's no longer says it was moved, since a
    // file imported after the update writes those rows before the move ran (outside check 4, 2026-11-12). An imported
    // account's mark rides on a fact the move saved for it this time (a holding's facts, or why no file value was moved),
    // so the record holds the same facts as the import would; with none, it is a fact row of its own
    ...moving.filter((a) => !markOn(String(a.asset_id))).map((a) => ({ accountId: String(a.asset_id), holding: null, kind: 'FACT' as const, date: null, source: 'typed' as const, facts: {}, ref: movedMark(String(a.asset_id)) }))]);
  for (const a of moving) {
    const id = String(a.asset_id), q = askOf(id);
    if (q.events.length || q.lists.length || q.unexplained.length) out.ask.push({ accountId: id, ...q });
    out.moved.push(id);
  }
  return out;
}
