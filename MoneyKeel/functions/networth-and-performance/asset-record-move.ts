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
// twice: every account it moves carries its mark, and one moved before the mark already holds what the phone shows. A
// row typed before the move ran (a purchase, a sale, a dividend) is not saved twice.
import { addRows, correctRow, rowsInForce, sharesOnRecord, saleRow, transferRow, valueRows, dayOrNull, oneHoldingSpelling, type AssetRow, type NewRow, type RowSource, type ListQuestion, type EventQuestion } from './asset-record';
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
 *     in force = rows in force(record)
 *     marked = a list with no repeats of in force where kind = 'FACT' and ref = moved mark(account id)for each of : account id
 *     id = string(asset id), rows = in force where account id = id
 *     false   when count of rows is missing
 *     rows.some((r) => source = 'file')   when (source as string) = 'imported'
 *     held = new map<string, number>()
 *     h = one holding spelling(ticker)
 *     per = contract multiplier(p as any)   if kind = 'options'
 *     1   otherwise
 *     shown = [...held] where ([, n]) => n > 1e − 9
 *     shown.every(([h, n]) => math.abs(shares on record(record, id, h) − n) ≤ 1e − 6)   when count of shown
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
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-228
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function moveOldCopies(record: readonly AssetRow[], accounts: readonly AssetAccount[], transactions: readonly Transaction[], writtenAt: string): MoveResult {
  const out: MoveResult = { record: [...record], moved: [], ask: [], problems: [] };
  // an account is moved once: where the move wrote its own mark (a FACT keyed movedMark, with no facts, so no account
  // detail reads it), or — for an account moved before the mark was written — where the record already holds what the
  // phone shows for it (outside check 2, 2026-11-12: a dividend typed before the move ran made the move skip the account
  // for good, so its 100 VTI never reached the record)
  const inForce = rowsInForce(record);
  const marked = new Set(inForce.filter((r) => r.kind === 'FACT' && r.ref === movedMark(r.accountId)).map((r) => r.accountId));
  const movedBefore = (a: AssetAccount): boolean => {
    const id = String(a.asset_id), rows = inForce.filter((r) => r.accountId === id);
    if (!rows.length) return false;
    if ((a.source as string) === 'imported') return rows.some((r) => r.source === 'file');
    const held = new Map<string, number>();
    for (const p of (a.positions ?? []) as Position[]) {
      const h = oneHoldingSpelling(p.ticker);
      if (h == null) continue;
      const per = p.kind === 'options' ? contractMultiplier(p as any) : 1;
      held.set(h, (held.get(h) ?? 0) + (p.lots ?? []).reduce((t, l) => t + (givenNumber(l.shares) ?? 0), 0) * per);
    }
    const shown = [...held].filter(([, n]) => n > 1e-9);
    if (shown.length) return shown.every(([h, n]) => Math.abs(sharesOnRecord(record, id, h) - n) <= 1e-6);
    return rows.some((r) => r.kind === 'VALUE');
  };
  // an account deleted before the move: the phone still holds its transactions, not the account (rule 6). One the live
  // record already holds rows for was deleted after the record began, and the live record wrote its accountRemoved
  const known = new Set(accounts.map((a) => String(a.asset_id)));
  const deletedIds = new Set([...new Set(transactions.filter((t) => t.source !== 'connected' && t.account_id != null && !known.has(String(t.account_id)))
    .map((t) => String(t.account_id)))].filter((id) => !marked.has(id) && !inForce.some((r) => r.accountId === id)));
  const moving: AssetAccount[] = [...accounts.filter((a) => a.source !== 'connected' && !marked.has(String(a.asset_id)) && !movedBefore(a)),
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

  const asked = new Map<string, { events: EventQuestion[]; lists: ListQuestion[]; unexplained: string[] }>();
  const askOf = (id: string) => { if (!asked.has(id)) asked.set(id, { events: [], lists: [], unexplained: [] }); return asked.get(id)!; };
  const notExplained = new Map<string, { id: string; h: string | null; said: string[] }>();
  const mark = (id: string, h: string | null, said: string) => {
    const k = `${id}|${h ?? ''}`;
    if (!notExplained.has(k)) notExplained.set(k, { id, h, said: [] });
    notExplained.get(k)!.said.push(said);
    askOf(id).unexplained.push(said);
  };
  const save = (rows: NewRow[]): AssetRow[] => { out.record = addRows(out.record, rows, writtenAt); return out.record.slice(-rows.length); };

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

  // VALUES AND FACTS, account by account
  const listDayOf = new Map<string, string | null>();
  for (const a of moving) {
    const id = String(a.asset_id);
    if (deletedIds.has(id)) continue;
    if (!imported(id)) { save(typedAccountRows(a)); continue; }
    const listDay = importedListDay(a);
    if (asFileLeftIt(a)) { listDayOf.set(id, listDay); save([...fileValues(a, listDay), ...fileFacts(a)]); continue; }
    // traded or edited since the file: its lots and values are today's, not the file's — no value is saved under its day
    // (outside check 3, 2026-11-12: a Jun 21 file total of $4,800 was saved as $4,980)
    save([...fileFacts(a), { accountId: id, holding: null, kind: 'FACT', date: null, source: 'file',
      facts: { fileValuesNotMoved: `The account was traded or edited after the file${listDay ? ` of ${listDay}` : ''}, so the file’s values are not known and none were moved.` } }]);
  }

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
    let want = givenNumber(t.shares) != null ? Math.abs(Number(t.shares)) * (t.multiplier && t.multiplier > 0 ? t.multiplier : 1) : Infinity;
    const took: { s: Shown; shares: number }[] = [];
    for (const s of pool) {
      const free = s.shares - (arrived.get(s) ?? 0);
      const n = Math.min(free, want);
      if (n <= 1e-9) continue;
      took.push({ s, shares: n }); arrived.set(s, (arrived.get(s) ?? 0) + n); want -= n;
    }
    if (!took.length) { mark(from, h, `The shares of ${h} moved on ${when} are not among the tax lots the phone shows, so the transfer was not moved.`); continue; }
    const bought = save(took.map(({ s, shares }) => ({ accountId: from, holding: h, kind: 'PURCHASE' as const, date: s.date, shares, price: s.price,
      amount: s.price == null ? null : shares * s.price, source: sourceOf(from), ref: `moved-transfer-lot:${to}:${s.lot?.lot_id ?? ''}:${t.id}` })));
    save([transferRow({ fromAccountId: from, toAccountId: to, holding: h, date: t.date ?? null, shares: took.reduce((n, x) => n + x.shares, 0), source: 'typed',
      ref: txnRef(t), sells: bought.map((r) => ({ rowId: r.rowId, shares: r.shares ?? 0 })) })]);
  }

  // WHAT IS HELD NOW (rule 1): each tax lot as one purchase — less the shares that arrived by a transfer, and less a
  // purchase typed after the update and already on record (the same lot, or the same date, shares and price)
  for (const { id, h, lots } of held.values()) {
    const before = inForce.filter((r) => r.kind === 'PURCHASE' && r.accountId === id && r.holding === h);
    const used = new Set<AssetRow>();
    const same = (x: number | null | undefined, y: number | null | undefined) => (x == null && y == null) || (x != null && y != null && Math.abs(x - y) <= 1e-9);
    const left: Shown[] = [];
    for (const s of lots) {
      const shares = s.shares - (arrived.get(s) ?? 0);
      if (shares <= 1e-9) continue;
      const twin = before.find((r) => !used.has(r) && ((s.lot && r.ref === lotRef(id, s.lot)) || ((r.date ?? null) === s.date && same(r.shares, shares) && same(r.price, s.price))));
      if (twin) { used.add(twin); continue; }
      left.push({ ...s, shares });
    }
    if (imported(id)) {
      // the file's own tax lots are the file's; a lot bought on the phone since is the account holder's
      const listDay = listDayOf.get(id) ?? null, fileDay = importedListDay(accountOf(id)!);
      const firsts = new Set(all.filter((t) => String(t.account_id) === id && t.type === 'OPENING_POSITION' && t.lot_id != null).map((t) => String(t.lot_id)));
      const fromFile = (s: Shown) => (firsts.size ? firsts.has(String(s.lot?.lot_id)) : fileDay == null || s.date == null || s.date <= fileDay);
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

  // EACH PAST SALE (rule 2), with the gain the app shows for it: realizedFromLedger, read as the Performance tab reads it
  // (one holding of one account), sale by sale — what the sales up to and including this one made, less what the sales
  // before it made. A sale the app counts no full gain for is marked and asked (rule 4)
  const appGains = new Map<string, { gain: number | null; matched: number | null }>();
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
      appGains.set(s.id, short ? { gain: null, matched: short.matched } : { gain: now.realizedAllTime - was.realizedAllTime, matched: null });
      was = now;
    }
  }
  for (const t of all.filter((x) => x.type === 'SELL' && holdingOf(x) != null)) {
    const id = String(t.account_id), h = holdingOf(t) as string;
    const per = t.multiplier != null && t.multiplier > 0 ? t.multiplier : 1;
    const shares = givenNumber(t.shares) == null ? null : Math.abs(Number(t.shares)) * per, price = givenNumber(t.price);
    if (shares == null || shares <= 0) { if (!savedBefore(t)) { const got = typedChangeToRecord(out.record, { kind: 'transaction-recorded', transaction: t }, writtenAt); out.record = got.record; } continue; }
    const app = appGains.get(t.id), when = dayOrNull(t.date) ?? 'a day not given';
    const known = app != null && app.gain != null && price != null;
    if (!known) mark(id, h, app == null
      ? `The sale of ${shares} ${h} on ${when} has no price the app can count, so the record shows no gain for it.`
      : `The sale of ${shares} ${h} on ${when}: what was paid for ${app.matched ? `${shares - app.matched * per} of the shares` : 'them'} is not on record, so the record shows no gain for it.`);
    // the purchase behind the sale: exactly the shares it sold, priced so the record's gain is the app's
    const [behind] = save([{ accountId: id, holding: h, kind: 'PURCHASE', date: null, shares, price: known ? price - (app!.gain as number) / shares : null,
      amount: known ? shares * price - (app!.gain as number) : null, source: 'typed', ref: `moved-behind-sale:${t.id}`, facts: { behindSaleBeforeRecord: true } }]);
    const sells = [{ rowId: behind.rowId, shares }];
    const onRecord = savedBefore(t) ? rowsInForce(out.record).find((r) => r.kind === 'SALE' && r.ref === txnRef(t)) : undefined;
    if (onRecord) {
      const c = correctRow(out.record, onRecord.rowId, { sells }, 'typed', writtenAt);
      if (c.problem) out.problems.push(c.problem); else out.record = c.record;
      continue;
    }
    save([saleRow({ accountId: id, holding: h, date: t.date ?? null, shares, price, amount: givenNumber(t.amount), fee: givenNumber(t.fee) == null ? null : Math.abs(Number(t.fee)),
      source: 'typed', ref: txnRef(t), sells })]);
  }

  // EVERYTHING ELSE (rule 3) — dividends, interest, deposits, withdrawals, fees, cash moved between accounts — each on its
  // own date, saved as typed. A purchase is in the tax lots, a sale and a transfer of shares are saved above
  for (const t of all) {
    if (holdingOf(t) != null || t.type === 'OPENING_POSITION' || savedBefore(t)) continue;
    const got = typedChangeToRecord(out.record, { kind: 'transaction-recorded', transaction: t }, writtenAt);
    out.record = got.record; askOf(String(t.account_id)).events.push(...got.ask); out.problems.push(...got.problems);
  }

  // what the old copies could not explain, as a fact on the holding (rule 4); an account deleted before the move (rule 6);
  // and the move's own mark on every typed account it moved, so it is never moved again whatever is saved for it later
  save([...[...notExplained.values()].map(({ id, h, said }) => ({ accountId: id, holding: h, kind: 'FACT' as const, date: null, source: 'typed' as const, facts: { notExplainedBeforeRecord: said } })),
    ...[...deletedIds].map((id) => ({ accountId: id, holding: null, kind: 'FACT' as const, date: null, source: 'typed' as const, facts: { accountRemoved: true } })),
    // an imported account needs no mark: the move always saves a row of the file's for it (its values, or the fact that
    // they are not known), and a row of the file's says it was moved
    ...moving.filter((a) => !imported(String(a.asset_id))).map((a) => ({ accountId: String(a.asset_id), holding: null, kind: 'FACT' as const, date: null, source: 'typed' as const, facts: {}, ref: movedMark(String(a.asset_id)) }))]);
  for (const a of moving) {
    const id = String(a.asset_id), q = askOf(id);
    if (q.events.length || q.lists.length || q.unexplained.length) out.ask.push({ accountId: id, ...q });
    out.moved.push(id);
  }
  return out;
}
