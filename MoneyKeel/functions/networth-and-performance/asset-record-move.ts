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
//   · It never moves an account twice: one the record already holds rows for is left alone, so a phone opened again,
//     or a second phone after the cloud has the record, adds nothing.
import { addRows, correctRow, openPurchases, purchasesFromList, rowAsItStands, rowsInForce, sharesOnRecord, sortArriving, valueRows, dayOrNull, oneHoldingSpelling, type AssetRow, type NewRow, type ListQuestion, type EventQuestion } from './asset-record';
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
 * Reads ....... MK-XS-I-011 bond face value
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
 *     known = a list with no repeats of for each of rows in force(record): account id
 *     moving = accounts where !known.has(string(asset id)) and source ! = 'connected'
 *     moving ids = a list with no repeats of for each of moving: string(asset id)
 *     holding of = (t: transaction) => (SHARE_MOVES.has(type) ? one holding spelling(ticker ?? nothing) : nothing)
 *     h = holding of(t)
 *     t   when h = nothing (or multiplier ≠ nothing (or !['BUY', 'SELL', 'OPENING_POSITION'].includes(type) when missing or zero) when missing or zero)
 *     p = position of(string(account id), h)
 *     t   when kind ! = 'options' and kind ! = 'options'
 *     the answer:
 *     ...t = ...t
 *     multiplier = contract multiplier((kind = 'options' ? p : { kind: 'options' }) as any)
 *     alone = []
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
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
  const known = new Set(rowsInForce(record).map((r) => r.accountId));
  const moving = accounts.filter((a) => !known.has(String(a.asset_id)) && a.source !== 'connected');
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
  type Decision = { a: AssetAccount; p: Position; h: string; per: number; shown: number; lots: boolean; edits: boolean };
  const decided = new Map<string, Decision>();
  const key = (id: string, h: string) => `${id}|${h}`;
  for (const a of moving) {
    const id = String(a.asset_id);
    for (const p of (a.positions ?? []) as Position[]) {
      const h = oneHoldingSpelling(p.ticker);
      if (h == null) continue;
      // shares a contract: the option's own figure; for a holding saved without its kind, the figure its trades state
      // (outside check, 2026-11-12: 2 contracts bought at $5 with 100 shares a contract were moved as 2 shares at $5)
      const stated = Math.max(1, ...all.filter((t) => String(t.account_id) === id && holdingOf(t) === h && t.multiplier != null && t.multiplier > 0).map((t) => Number(t.multiplier)));
      const per = p.kind === 'options' ? contractMultiplier(p as any) : stated;
      const shown = (p.lots ?? []).reduce((t, l) => t + (givenNumber(l.shares) ?? 0), 0) * per;
      // the activity explains the lots only where it leaves the same purchases the lots show — shares and date; where
      // only a price differs, the lot was edited after its purchase was recorded: the activity is kept, every purchase
      // and sale on its own date, and the edit is saved as a correction of that purchase (outside check, 2026-11-12: a
      // buy at $100 edited to $95 with a later sale was saved as one purchase and the sale's $125 was lost)
      const lotKeys = (withPrice: boolean) => (p.lots ?? []).filter((l) => (givenNumber(l.shares) ?? 0) > 0).map((l) => {
        const c = givenNumber(l.cost_per_share);
        return `${Number(l.shares) * per}|${dayOrNull(l.purchase_date) ?? '-'}${withPrice ? `|${c == null ? '-' : c * unitPriceFactor(p)}` : ''}`;
      }).sort().join();
      const leftKeys = (withPrice: boolean) => openPurchases(alone, id, h).map((o) => `${o.shares}|${o.date ?? '-'}${withPrice ? `|${o.price ?? '-'}` : ''}`).sort().join();
      const hasActivity = alone.some((r) => r.holding === h && (r.accountId === id || r.toAccountId === id));
      const explains = Math.abs(sharesOnRecord(alone, id, h) - shown) <= 1e-9 && hasActivity && lotKeys(false) === leftKeys(false);
      decided.set(key(id, h), { a, p, h, per, shown, lots: !explains, edits: explains && lotKeys(true) !== leftKeys(true) });
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
        const got = typedChangeToRecord(out.record, { kind: 'holding-added', accountId: id, position: p }, writtenAt);
        out.record = got.record; events.push(...got.ask); out.problems.push(...got.problems);
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

  // AND EACH LOT EDITED AFTER ITS PURCHASE, as a correction of that purchase: its price, so what was paid follows it
  for (const d of [...decided.values()].filter((x) => x.edits)) {
    const id = String(d.a.asset_id);
    const lots = (d.p.lots ?? []).filter((l) => (givenNumber(l.shares) ?? 0) > 0).map((l) => {
      const c = givenNumber(l.cost_per_share);
      return { k: `${Number(l.shares) * d.per}|${dayOrNull(l.purchase_date) ?? '-'}`, price: c == null ? null : c * unitPriceFactor(d.p) };
    }).sort((x, y) => x.k.localeCompare(y.k));
    const open = openPurchases(out.record, id, d.h).map((o) => ({ o, k: `${o.shares}|${o.date ?? '-'}` })).sort((x, y) => x.k.localeCompare(y.k));
    lots.forEach((l, i) => {
      const o = open[i]?.o;
      if (!o || open[i].k !== l.k || l.price == null || (o.price != null && Math.abs(o.price - l.price) <= 1e-9)) return;
      const row = rowAsItStands(out.record, o.rowId);
      if (!row) return;
      const c = correctRow(out.record, o.rowId, { price: l.price, amount: (row.shares ?? 0) * l.price * o.splitBy }, 'typed', writtenAt);
      if (c.problem) out.problems.push(c.problem); else out.record = c.record;
    });
  }

  for (const a of moving) {
    const id = String(a.asset_id), q = askOf(id);
    if (q.events.length || q.lists.length) out.ask.push({ accountId: id, events: q.events, lists: q.lists });
    out.moved.push(id);
  }
  return out;
}
