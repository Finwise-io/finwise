// Net worth and Performance · WHAT A PHONE ALREADY HOLDS, MOVED ONTO THE ONE MASTER RECORD ONCE (asset-record.ts).
//
// WHAT IT DOES (phase 2 of the approved plan, 2026-11-11, step 6: "What a phone already holds is moved onto the list
// once, on opening. Dates nobody gave stay blank, never the phone's date"). For each account the record holds nothing for:
//   · AN ACCOUNT TYPED BY HAND — its value on its "Value as of" date (blank where none), a bond's or CD's facts, and
//     every transaction the account holder recorded, each on its own date, saved as typed exactly as
//     asset-record-from-typed.ts saves a new entry. A holding's tax lots on the phone are what its first entry (an
//     opening record), its purchases and its sales LEFT, so lots and activity are never both saved for one holding:
//       – where the activity adds up to the shares the holding shows, the activity is saved (each purchase and sale on
//         its own date, so a sale keeps what it made);
//       – where it does not (lots entered before opening records were kept, 2026-10-23), the tax lots as they stand are
//         saved instead, and that holding's purchases and sales are not, with a sentence saying so.
//   · AN ACCOUNT MADE FROM AN IMPORTED FILE — the file is gone, so the account as it was saved stands for it: its tax
//     lots as the file's list (purchasesFromList, the day of the list being the account's "Value as of"), and its values
//     on that day, saved as the file's. Transactions the account holder recorded on it are saved as typed.
//   · AN ACCOUNT LINKED TO A BROKER — nothing here. Its next update reads the broker's whole history once into the
//     record (snaptradeSync: an account the record holds nothing for is read from the start), so its purchases, sales
//     and dates come from the broker itself, not from a copy the old sync rebuilt.
//
// WHAT IT NEVER DOES.
//   · It never moves the old daily values. Their dates were the phone's (the fault his rulings of 2026-11-10 fix).
//   · It never moves an account twice: a typed account carries the move's own mark, an imported one the file's values,
//     and one moved before the mark was written already holds the shares (or the value) the phone shows — so a phone
//     opened again, or a second phone after the cloud has the record, adds nothing. A row saved for an account before
//     the move ran (a dividend typed offline) no longer stops it being moved, and is not saved twice: rows typed by
//     hand carry their own key, and a key already on record is not saved again.
import { addRows, correctRow, openPurchases, purchasesFromList, rowAsItStands, rowsInForce, sharesOnRecord, sortArriving, valueRows, dayOrNull, oneHoldingSpelling, type AssetRow, type NewRow, type ListQuestion, type EventQuestion, type OpenPurchase } from './asset-record';
import { typedChangeToRecord, typedAccountRows, openingRow, givenNumber, unitPriceFactor } from './asset-record-from-typed';
import { contractMultiplier, type Position } from '../../../src/domain/performance';
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
  ask: { accountId: string; events: EventQuestion[]; lists: ListQuestion[] }[];
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

/** One holding's tax lots as a file's list, on the day of the list (the account's "Value as of"). */
/* ─ MK-NW-F-225 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * asFileList
 *
 * Answers ..... One holding's tax lots as a file's list, on the day of the list (the account's "Value as of").
 *
 * Formula .....
 *     []   when count of listed is missing
 *     got = purchases from list(out.record, id, h, listed, 'file', list day)
 *     the answer = got.ask
 *
 * Called by ... MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-225
 * Changed ..... not in git yet (—)
 */
function asFileList(out: MoveResult, id: string, h: string, listed: { date: string | null; shares: number; price: number | null }[], listDay: string | null, writtenAt: string): ListQuestion[] {
  if (!listed.length) return [];
  const got = purchasesFromList(out.record, id, h, listed, 'file', listDay);
  out.record = addRows(out.record, got.rows, writtenAt);
  return got.ask;
}

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

/** Each tax lot paired with one purchase the activity leaves, one for one, or null where they cannot all be paired. By
 *  shares (the lots ARE the purchases): first the same shares and date, then the same shares and price, then the same
 *  shares, oldest first. By date (the lots are the purchases with other shares): the same date, and a lot with no date
 *  takes a purchase left over. */
/* ─ MK-NW-F-292 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * pairUp
 *
 * Answers ..... Each tax lot paired with one purchase the activity leaves, one for one, or null where they cannot all be paired.
 *
 * Formula .....
 *     nothing   when count of lots.length ! = open
 *     same shares = (l: shown lot, o: open purchase) => size of(shares − shares) ≤ 1e − 9
 *     same price = (l: shown lot, o: open purchase) => price ≠ nothing and price ≠ nothing and size of(price − price) ≤ 1e − 9
 *     by age = (x: string | nothing, y: string | nothing) => string(x ?? '9999').locale compare(string(y ?? '9999'))
 *     ls = [...lots].sort((x, y) => by age(date, date)), os = [...open].sort((x, y) => by age(date, date))
 *     out = [], used = new set<open purchase>(), done = new set<shown lot>()
 *     o = os.find((x) => !used.has(x) and t(l, x))
 *     the answer:
 *     out   if count of out.length = lots
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-292
 * Changed ..... not in git yet (—)
 */
const pairUp = (lots: readonly ShownLot[], open: readonly OpenPurchase[], byDate: boolean): { l: ShownLot; o: OpenPurchase }[] | null => {
  if (lots.length !== open.length) return null;
  const sameShares = (l: ShownLot, o: OpenPurchase) => Math.abs(l.shares - o.shares) <= 1e-9;
  const samePrice = (l: ShownLot, o: OpenPurchase) => l.price != null && o.price != null && Math.abs(l.price - o.price) <= 1e-9;
  const tests: ((l: ShownLot, o: OpenPurchase) => boolean)[] = byDate
    ? [(l, o) => l.date != null && l.date === o.date, (l) => l.date == null]
    : [(l, o) => sameShares(l, o) && l.date === o.date, (l, o) => sameShares(l, o) && samePrice(l, o), sameShares];
  const byAge = (x: string | null, y: string | null) => String(x ?? '9999').localeCompare(String(y ?? '9999'));
  const ls = [...lots].sort((x, y) => byAge(x.date, y.date)), os = [...open].sort((x, y) => byAge(x.date, y.date));
  const out: { l: ShownLot; o: OpenPurchase }[] = [], used = new Set<OpenPurchase>(), done = new Set<ShownLot>();
  for (const t of tests) for (const l of ls) {
    if (done.has(l)) continue;
    const o = os.find((x) => !used.has(x) && t(l, x));
    if (o) { out.push({ l, o }); used.add(o); done.add(l); }
  }
  return out.length === lots.length ? out : null;
};

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
  // an account is moved once: where the move wrote its own mark (a FACT keyed MOVED_MARK, with no facts, so no account
  // detail reads it), or — for an account moved before the
  // mark was written — where the record already holds what the phone shows for it (outside check 2, 2026-11-12: a dividend
  // typed before the move ran made the move skip the account for good, so its 100 VTI never reached the record)
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
  const moving = accounts.filter((a) => a.source !== 'connected' && !marked.has(String(a.asset_id)) && !movedBefore(a));
  const movingIds = new Set(moving.map((a) => String(a.asset_id)));
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
  // the account holders' own transactions on every account moved, oldest first — read as ONE activity, so shares moved
  // from one account to another reach the second (outside check, 2026-11-12: 3 MSFT moved from A to B were counted twice)
  const all = transactions.filter((t) => movingIds.has(String(t.account_id)) && t.source !== 'connected').map(counted)
    .sort((x, y) => String(x.date).localeCompare(String(y.date)) || String(x.created_at).localeCompare(String(y.created_at)));
  // the activity alone, on a record of its own, to see whether it adds up to the shares each holding shows
  let alone: AssetRow[] = [];
  for (const t of all.filter((x) => holdingOf(x) != null)) {
    const o = openingRow(t);
    alone = o ? addRows(alone, [o], writtenAt) : typedChangeToRecord(alone, { kind: 'transaction-recorded', transaction: t }, writtenAt).record;
  }

  // DECIDE, per holding of every account moved: its activity, or its tax lots as they stand
  // one decision per holding, over ALL its tax lots: a file can list one holding on two rows, each its own position
  // (outside check 2, 2026-11-12: 5 AAPL bought Jan 2 and 5 bought Jun 1 — the second row overwrote the first, and the
  // Jan lot and its $500 were lost)
  type Decision = { a: AssetAccount; ps: Position[]; p: Position; h: string; per: number; shown: number; lots: boolean; edits: boolean; ask: boolean };
  const decided = new Map<string, Decision>();
  const key = (id: string, h: string) => `${id}|${h}`;
  for (const a of moving) {
    const id = String(a.asset_id);
    const byHolding = new Map<string, Position[]>();
    for (const p of (a.positions ?? []) as Position[]) {
      const h = oneHoldingSpelling(p.ticker);
      if (h == null) continue;
      byHolding.set(h, [...(byHolding.get(h) ?? []), p]);
    }
    for (const [h, ps] of byHolding) {
      const p: Position = { ...ps[0], lots: ps.flatMap((x) => x.lots ?? []) };
      // shares a contract: the option's own figure; for a holding saved without its kind, the figure its trades state
      // (outside check, 2026-11-12: 2 contracts bought at $5 with 100 shares a contract were moved as 2 shares at $5)
      const stated = Math.max(1, ...all.filter((t) => String(t.account_id) === id && holdingOf(t) === h && t.multiplier != null && t.multiplier > 0).map((t) => Number(t.multiplier)));
      const per = p.kind === 'options' ? contractMultiplier(p as any) : stated;
      const shown = (p.lots ?? []).reduce((t, l) => t + (givenNumber(l.shares) ?? 0), 0) * per;
      // the activity explains the lots where it leaves the same purchases the lots show, one for one, with the same
      // shares; where a lot's date or price differs, the lot was edited after its purchase was recorded: the activity is
      // kept, every purchase and sale on its own date, and the edit is saved as a correction of that purchase (outside
      // checks, 2026-11-12: a buy at $100 edited to $95, and a first lot dated Jan 3 against a purchase of Jan 2 — each
      // with a later sale whose gain was lost). Where the lots pair with the purchases by date but hold other shares (a
      // split typed as lot edits), the activity is still kept and the difference is asked, never the sale dropped.
      const lots = lotsOf(p, per), left = openPurchases(alone, id, h);
      const hasActivity = alone.some((r) => r.holding === h && (r.accountId === id || r.toAccountId === id));
      const pairs = pairUp(lots, left, false);
      const explains = hasActivity && Math.abs(sharesOnRecord(alone, id, h) - shown) <= 1e-9 && pairs != null;
      const ask = hasActivity && !explains && pairUp(lots, left, true) != null;
      decided.set(key(id, h), { a, ps, p, h, per, shown, lots: !explains && !ask, ask,
        edits: explains && (pairs ?? []).some(({ l, o }) => (l.date != null && l.date !== o.date) || (l.price != null && (o.price == null || Math.abs(o.price - l.price) > 1e-9))) });
    }
  }
  // a transfer between two accounts moved: where the holding's lots stand in for the activity at one end, the other end
  // cannot count the transfer either — so shares are never counted in both, nor in neither
  const leaves = new Set<Transaction>();
  for (let changed = true; changed;) {
    changed = false;
    for (const t of all) {
      const h = holdingOf(t);
      if (t.type !== 'TRANSFER_IN_KIND' || h == null || t.counter_account_id == null || !movingIds.has(String(t.counter_account_id))) continue;
      const from = decided.get(key(String(t.account_id), h)), to = decided.get(key(String(t.counter_account_id), h));
      if (from?.lots && to && !to.lots) { to.lots = true; to.edits = false; changed = true; }
      if (to?.lots && !from?.lots && !leaves.has(t)) leaves.add(t);
    }
  }

  // SAVE, account by account: its values and facts, and the tax lots of each holding whose lots stand in for its activity
  const asked = new Map<string, { events: EventQuestion[]; lists: ListQuestion[] }>();
  const askOf = (id: string) => { if (!asked.has(id)) asked.set(id, { events: [], lists: [] }); return asked.get(id)!; };
  const fromOpenings = new Set<string>();
  for (const a of moving) {
    const id = String(a.asset_id);
    const imported = (a.source as string) === 'imported';
    const listDay = imported ? importedListDay(a) : null;
    const { events, lists } = askOf(id);
    out.record = addRows(out.record, imported ? [...fileValues(a, listDay), ...fileFacts(a)] : typedAccountRows(a), writtenAt);
    for (const d of [...decided.values()].filter((x) => String(x.a.asset_id) === id)) {
      const { p, h, per, shown } = d;
      if (!d.lots) {
        // the activity explains the lots: an imported account's first entries are the file's list, a typed one's are typed
        if (imported) {
          fromOpenings.add(key(id, h));
          lists.push(...asFileList(out, id, h, all.filter((x) => String(x.account_id) === id && x.type === 'OPENING_POSITION' && holdingOf(x) === h)
            .map((x) => openingRow(x)).filter((r): r is NewRow => r != null).map((r) => ({ date: r.date, shares: r.shares as number, price: r.price ?? null })), listDay, writtenAt));
        }
        continue;
      }
      if (imported) {
        lists.push(...asFileList(out, id, h, (p.lots ?? []).filter((l) => (givenNumber(l.shares) ?? 0) > 0)
          .map((l) => { const c = givenNumber(l.cost_per_share); return { date: dayOrNull(l.purchase_date), shares: Number(l.shares) * per, price: c == null ? null : c * unitPriceFactor(p) }; }), listDay, writtenAt));
      } else {
        for (const one of d.ps) {
          const got = typedChangeToRecord(out.record, { kind: 'holding-added', accountId: id, position: one }, writtenAt);
          out.record = got.record; events.push(...got.ask); out.problems.push(...got.problems);
        }
      }
      const left = all.filter((x) => String(x.account_id) === id && holdingOf(x) === h && x.type !== 'OPENING_POSITION').length;
      if (left) out.problems.push(`The activity of ${h} did not leave the tax lots it shows (${shown} shares), so its tax lots as they stand were moved and its ${left} recorded purchases and sales were not.`);
    }
  }

  // THEN THE ACTIVITY of every account moved, oldest first, each on its own date
  for (const t0 of all) {
    const id = String(t0.account_id), h = holdingOf(t0);
    if (h != null && decided.get(key(id, h))?.lots) continue;
    if (h != null && fromOpenings.has(key(id, h)) && t0.type === 'OPENING_POSITION') continue;
    // shares moved to an account whose lots stand in for its activity leave the record here: that account's lots hold them
    const t = leaves.has(t0) ? { ...t0, counter_account_id: undefined } : t0;
    const { events } = askOf(id);
    const opening = openingRow(t);
    if (opening) { const sorted = sortArriving(out.record, [opening]); out.record = addRows(out.record, sorted.save, writtenAt); events.push(...sorted.ask); continue; }
    if (t.type === 'OPENING_POSITION') continue;
    const got = typedChangeToRecord(out.record, { kind: 'transaction-recorded', transaction: t }, writtenAt);
    out.record = got.record; events.push(...got.ask); out.problems.push(...got.problems);
  }

  // AND EACH LOT EDITED AFTER ITS PURCHASE, as a correction of that purchase: its date and its price, so what was paid
  // follows it. A lot with no date says nothing about the date: the purchase's own date stands.
  for (const d of [...decided.values()].filter((x) => x.edits)) {
    const id = String(d.a.asset_id);
    for (const { l, o } of pairUp(lotsOf(d.p, d.per), openPurchases(out.record, id, d.h), false) ?? []) {
      const row = rowAsItStands(out.record, o.rowId);
      if (!row) continue;
      const change: Partial<NewRow> = {};
      if (l.date != null && l.date !== o.date) change.date = l.date;
      if (l.price != null && (o.price == null || Math.abs(o.price - l.price) > 1e-9)) { change.price = l.price * o.splitBy; change.amount = (row.shares ?? 0) * l.price * o.splitBy; }
      if (!Object.keys(change).length) continue;
      const c = correctRow(out.record, o.rowId, change, 'typed', writtenAt);
      if (c.problem) out.problems.push(c.problem); else out.record = c.record;
    }
  }

  // AND EACH HOLDING WHOSE LOTS ARE ITS PURCHASES WITH OTHER SHARES: the activity stands, and the lots are set beside it
  // as a list, so the difference is asked once
  for (const d of [...decided.values()].filter((x) => x.ask)) {
    const id = String(d.a.asset_id);
    const got = purchasesFromList(out.record, id, d.h, lotsOf(d.p, d.per), (d.a.source as string) === 'imported' ? 'file' : 'typed', null);
    if (got.rows.length) out.record = addRows(out.record, got.rows, writtenAt);
    askOf(id).lists.push(...got.ask);
  }

  // the move's own mark on every typed account it moved, so it is never moved again whatever is saved for it later. An
  // imported account needs none: the move saves its values as the file's, and nothing typed before the move is the file's
  out.record = addRows(out.record, moving.filter((a) => (a.source as string) !== 'imported').map((a) => ({ accountId: String(a.asset_id), holding: null,
    kind: 'FACT' as const, date: null, source: 'typed' as const, facts: {}, ref: movedMark(String(a.asset_id)) })), writtenAt);
  for (const a of moving) {
    const id = String(a.asset_id), q = askOf(id);
    if (q.events.length || q.lists.length) out.ask.push({ accountId: id, events: q.events, lists: q.lists });
    out.moved.push(id);
  }
  return out;
}
