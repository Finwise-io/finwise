// Net worth and Performance · WHAT THE ACCOUNT HOLDER ENTERS, READ INTO THE ONE MASTER RECORD (asset-record.ts).
//
// WHAT IT DOES. Each way the account holder adds or changes something is turned into rows of the record, saved as
// typed (phase 2 of the approved plan, 2026-11-11: the list is written beside the three old copies; no screen changes):
//   · an account added or changed by hand — its value on the date the account holder gave ("Value as of"), and a bond's
//     or CD's own details as a fact;
//   · a holding added, changed or taken away — one purchase per tax lot, on the lot's own date and price;
//   · a transaction recorded or deleted — one row on the transaction's own date;
//   · savings moved into an account — a deposit;
//   · an account taken away or unlinked — a fact, so its history stays.
//
// WHAT IT NEVER DOES.
//   · It never uses the phone's date for a value. A value with no "Value as of" stays undated.
//   · It never writes what a broker or a file sends: an account linked to a broker, or made from an imported file, takes
//     its values and purchases from those (asset-record-from-broker.ts, asset-record-from-file.ts). The account holder's
//     own edits to its holdings and transactions ARE written: the account holder can always override (DEC-10471).
//   · It never deletes a row. A removal is a row that names the one it takes away (removeRow); a refused removal is
//     handed back as a problem and the record stays as it was.
import {
  addRows, sortArriving, correctRow, removeRow, rowsInForce, valueRows, saleRow, transferRow, dayOrNull, oneHoldingSpelling,
  type AssetRow, type NewRow, type EventQuestion,
} from './asset-record';
import { contractMultiplier, type Position, type Lot } from '../../../src/domain/performance';
import type { Transaction } from '../../../src/domain/transactions';
import type { AssetAccount } from '../../../src/domain/assets';

const SOURCE = 'typed' as const;
const EPS = 1e-9;
const same = (x: number | null | undefined, y: number | null | undefined) => (x == null || y == null ? x == null && y == null : Math.abs(x - y) <= EPS);
export const givenNumber = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
/** A date as the account holder gave it: its day where it can be read, kept as given where it cannot (addRows keeps it). */
const dateAsGiven = (v: unknown): string | null => dayOrNull(v) ?? (typeof v === 'string' && v.trim() !== '' ? v : null);

/** One change the account holder made, as the store hands it over. */
export type TypedChange =
  | { kind: 'account-added'; account: AssetAccount }
  | { kind: 'account-changed'; before: AssetAccount; after: AssetAccount; update: Partial<AssetAccount> }
  | { kind: 'account-removed'; accountId: string }
  | { kind: 'account-unlinked'; accountId: string; keptAsTyped: boolean }
  | { kind: 'holding-added'; accountId: string; position: Position }
  | { kind: 'holding-changed'; accountId: string; before: Position; after: Position }
  | { kind: 'holding-removed'; accountId: string; position: Position }
  | { kind: 'transaction-recorded'; transaction: Transaction }
  | { kind: 'transaction-deleted'; transaction: Transaction }
  | { kind: 'savings-moved'; accountId: string; amount: number; date: string };

export interface TypedResult {
  record: AssetRow[];
  /** Differences from what a broker or a file gave, to put to the account holder (his ruling, 2026-11-11). */
  ask: EventQuestion[];
  /** Changes the record refused, each in a sentence; the record is left as it was for that change. */
  problems: string[];
}

/** An account whose values and purchases the account holder gives: not linked to a broker, not made from a file. */
export const valuesAreTyped = (a: Pick<AssetAccount, 'source'> | null | undefined): boolean =>
  !!a && a.source !== 'connected' && (a.source as string) !== 'imported';

/** The key a purchase the account holder typed carries, so a later edit or removal of that tax lot finds its row. */
export const lotRef = (accountId: string, lot: Pick<Lot, 'lot_id'>): string => `typed-lot:${accountId}:${lot.lot_id}`;
/** The key a transaction the account holder recorded carries, so deleting it finds its row. */
export const txnRef = (t: Pick<Transaction, 'id'>): string => `typed-txn:${t.id}`;

/** What one unit's quoted price is worth per unit the record counts: a bond quoted per $100 of face, a hundredth; an
 *  option (counted in shares, quoted per share) and anything else, 1. */
export const unitPriceFactor = (p: Position): number => (p.kind === 'options' ? 1 : contractMultiplier(p as any));

/** One tax lot as a purchase. An option's contracts are saved as shares (contracts × shares per contract) at its price
 *  per share, as the record holds a broker's option; a bond quoted per $100 of face is saved as dollars of face at its
 *  cost per $100 ÷ 100, as a file's is (comparison check, 2026-11-11: $110,000 face at 100 read $11,000,000 paid); every
 *  other holding is saved as entered. */
function lotRow(accountId: string, p: Position, lot: Lot): NewRow | null {
  const holding = oneHoldingSpelling(p.ticker);
  const per = p.kind === 'options' ? contractMultiplier(p as any) : 1;
  const shares = givenNumber(lot.shares), cost = givenNumber(lot.cost_per_share);
  if (holding == null || shares == null || shares <= 0) return null;
  const price = cost == null ? null : cost * unitPriceFactor(p);
  return { accountId, holding, kind: 'PURCHASE', date: dateAsGiven(lot.purchase_date), shares: shares * per, price,
    amount: price == null ? null : shares * per * price, source: SOURCE, ref: lotRef(accountId, lot) };
}

/** The value rows of an account the account holder values by hand: one value, on the date given. An account BUILT from
 *  its holdings (derive_balance) is valued from their prices, so only its cash is written, where the account holder gave
 *  it — never a cash figure the app opened itself (cash_not_entered). Any other account's balance is the total the
 *  account holder typed, and its holdings are a part of it tracked for performance, so the total is written (comparison
 *  check, 2026-11-11: a typed $175,000 with MSFT listed in it was dropped, and $12 the app had summed was saved as cash). */
function accountValueRows(a: AssetAccount): NewRow[] {
  const date = dateAsGiven((a as any).value_as_of);
  if ((a.positions ?? []).length && (a as any).derive_balance === true) {
    const cash = (a as any).cash_not_entered === true ? null : givenNumber((a as any).cash_balance);
    return cash == null ? [] : valueRows({ accountId: String(a.asset_id), date, source: SOURCE, cash });
  }
  // a bond's or CD's balance set from what was paid or its face value is not a value the account holder gave (DEC-0281):
  // those figures are its facts, and no value is written
  if ((a as any).value_basis != null) return [];
  const typedValue = givenNumber(a.balance);
  return typedValue == null ? [] : valueRows({ accountId: String(a.asset_id), date, source: SOURCE, typedValue });
}

const BOND_FACTS = ['face_value', 'coupon_rate', 'maturity_date', 'purchase_date', 'amount_paid', 'cd_bought', 'accrued_interest'] as const;
/** A bond's or CD's own details, where the account holder gave any: one fact row. */
function factRow(a: AssetAccount, only?: Partial<AssetAccount>): NewRow | null {
  const from = (only ?? a) as Record<string, unknown>;
  const facts: Record<string, unknown> = {};
  for (const k of BOND_FACTS) if (k in from && from[k] != null && from[k] !== '') facts[k] = from[k];
  return Object.keys(facts).length ? { accountId: String(a.asset_id), holding: null, kind: 'FACT', date: null, source: SOURCE, facts } : null;
}

/** The purchase on record a tax lot stands for: the one carrying its key; else the one purchase of that holding with the
 *  lot's date, shares and price (a broker's or a file's) — a tax lot before a history row of the same date. */
function rowOfLot(record: readonly AssetRow[], accountId: string, p: Position, lot: Lot): AssetRow | 'none' | 'many' {
  const live = rowsInForce(record).filter((r) => r.kind === 'PURCHASE' && r.accountId === accountId);
  const byRef = live.filter((r) => r.ref === lotRef(accountId, lot));
  if (byRef.length === 1) return byRef[0];
  const want = lotRow(accountId, p, lot);
  if (!want) return 'none';
  const alike = live.filter((r) => r.holding === want.holding && (r.date ?? null) === (want.date ?? null) && same(r.shares, want.shares) && same(r.price, want.price));
  const lots = alike.filter((r) => !r.inListOf);
  const pick = lots.length ? lots : alike;
  return pick.length === 1 ? pick[0] : pick.length ? 'many' : 'none';
}

/** One transaction as one row, on its own date. Null where the record has no row for it (an opening record is written
 *  from its tax lot instead). */
function transactionRow(t: Transaction): NewRow | null {
  const accountId = String(t.account_id), holding = oneHoldingSpelling(t.ticker ?? null);
  const per = t.multiplier != null && t.multiplier > 0 ? t.multiplier : 1;
  const shares = givenNumber(t.shares) == null ? null : Math.abs(Number(t.shares)) * per;
  const price = givenNumber(t.price);   // an option's price is quoted per share: 1 contract at $2.50 is 100 shares at $2.50
  const amount = givenNumber(t.amount) == null ? null : Math.abs(Number(t.amount));
  const fee = givenNumber(t.fee) == null ? null : Math.abs(Number(t.fee));
  const date = dateAsGiven(t.date), ref = txnRef(t);
  const cashRow = (kind: NewRow['kind']): NewRow => ({ accountId, holding, kind, date, amount, fee, source: SOURCE, ref,
    ...(shares != null ? { shares } : {}), ...(price != null ? { price } : {}) });
  switch (t.type) {
    case 'BUY':
      if (holding == null || shares == null) return cashRow('OTHER');
      return { accountId, holding, kind: 'PURCHASE', date, shares, price, amount: amount ?? (price == null ? null : shares * price), fee, source: SOURCE, ref };
    case 'SELL':
      if (holding == null || shares == null) return cashRow('OTHER');
      return saleRow({ accountId, holding, date, shares, price, amount, fee, source: SOURCE, ref });
    case 'DIVIDEND': return cashRow('DIVIDEND');
    case 'INTEREST': case 'COUPON': return cashRow('INTEREST');
    case 'DEPOSIT': return cashRow(t.direction === 'OUT' ? 'WITHDRAWAL' : 'DEPOSIT');
    case 'WITHDRAWAL': return cashRow(t.direction === 'IN' ? 'DEPOSIT' : 'WITHDRAWAL');
    case 'FEE': return cashRow('FEE');
    case 'TRANSFER':
      // cash between two of the account holder's accounts: one row, from the account to the one named
      return { ...cashRow('TRANSFER'), holding: null, ...(t.counter_account_id ? { toAccountId: String(t.counter_account_id) } : {}) };
    case 'TRANSFER_IN_KIND':
      if (holding == null || shares == null) return cashRow('OTHER');
      if (t.direction === 'IN') return { accountId, holding, kind: 'TRANSFER', date, shares, source: SOURCE, ref, arrives: true };
      return t.counter_account_id
        ? transferRow({ fromAccountId: accountId, toAccountId: String(t.counter_account_id), holding, date, shares, source: SOURCE, ref })
        : { accountId, holding, kind: 'TRANSFER', date, shares, source: SOURCE, ref };
    case 'OPENING_CASH':
      return amount == null ? null : { ...valueRows({ accountId, date, source: SOURCE, cash: amount })[0], ref };
    case 'OPENING_POSITION':
      return null;
    default:
      return cashRow('OTHER');
  }
}

/** Saves new rows through the one pass that keeps a twin out and asks about a difference. */
function arrive(out: TypedResult, rows: NewRow[], writtenAt: string): void {
  if (!rows.length) return;
  const sorted = sortArriving(out.record, rows);
  out.record = addRows(out.record, sorted.save, writtenAt);
  out.ask.push(...sorted.ask);
}

function correct(out: TypedResult, rowId: string, change: Partial<NewRow>, writtenAt: string): void {
  const c = correctRow(out.record, rowId, change, SOURCE, writtenAt);
  if (c.problem) out.problems.push(c.problem); else out.record = c.record;
}

function remove(out: TypedResult, rowId: string, writtenAt: string): void {
  const c = removeRow(out.record, rowId, SOURCE, writtenAt);
  if (c.problem) out.problems.push(c.problem); else out.record = c.record;
}

/** Each tax lot of a holding before and after an edit: a new lot is a purchase, a lot taken out is a removal, a lot with
 *  another date, number of shares or price is a correction of its purchase. */
function lotsFollow(out: TypedResult, accountId: string, before: Position | null, after: Position | null, writtenAt: string): void {
  const was = new Map((before?.lots ?? []).map((l) => [l.lot_id, l]));
  const now = new Map((after?.lots ?? []).map((l) => [l.lot_id, l]));
  const added: NewRow[] = [];
  for (const [id, lot] of now) {
    const old = was.get(id);
    if (!old) { const r = lotRow(accountId, after as Position, lot); if (r) added.push(r); continue; }
    const from = lotRow(accountId, before as Position, old), to = lotRow(accountId, after as Position, lot);
    if (!to) { const at = rowOfLot(out.record, accountId, before as Position, old); if (typeof at === 'object') remove(out, at.rowId, writtenAt); continue; }
    if (from && (from.date ?? null) === (to.date ?? null) && same(from.shares, to.shares) && same(from.price, to.price)) continue;
    const at = rowOfLot(out.record, accountId, before as Position, old);
    if (at === 'none') { added.push(to); continue; }
    if (at === 'many') { out.problems.push(`More than one purchase of ${to.holding} matches the tax lot that was changed, so none was changed.`); continue; }
    const change: Partial<NewRow> = {};
    if ((at.date ?? null) !== (to.date ?? null)) change.date = to.date;
    if (!same(at.shares, to.shares)) change.shares = to.shares;
    if (!same(at.price, to.price)) { change.price = to.price; change.amount = to.amount; }
    if (Object.keys(change).length) correct(out, at.rowId, change, writtenAt);
  }
  for (const [id, old] of was) {
    if (now.has(id)) continue;
    const at = rowOfLot(out.record, accountId, before as Position, old);
    if (at === 'many') out.problems.push(`More than one purchase of ${oneHoldingSpelling(before?.ticker ?? '')} matches the tax lot that was taken out, so none was taken out.`);
    else if (at !== 'none') remove(out, at.rowId, writtenAt);
  }
  arrive(out, added, writtenAt);
}

/** An account typed by hand, without its holdings: its value on the date given and a bond's or CD's facts. */
export function typedAccountRows(a: AssetAccount): NewRow[] {
  const fact = factRow(a);
  return [...accountValueRows(a), ...(fact ? [fact] : [])];
}

/** An opening record (a holding the account holder already owned when it was first entered) as the purchase of its tax
 *  lot, carrying the lot's key so a later edit of that lot finds it. */
export function openingRow(t: Transaction): NewRow | null {
  const holding = oneHoldingSpelling(t.ticker ?? null), shares = givenNumber(t.shares);
  if (t.type !== 'OPENING_POSITION' || holding == null || shares == null || shares <= 0) return null;
  const per = t.multiplier != null && t.multiplier > 0 ? t.multiplier : 1, price = givenNumber(t.price);
  return { accountId: String(t.account_id), holding, kind: 'PURCHASE', date: dateAsGiven(t.date), shares: shares * per, price,
    amount: price == null ? null : shares * per * price, source: SOURCE, ref: t.lot_id ? lotRef(String(t.account_id), { lot_id: t.lot_id }) : txnRef(t) };
}

/** WHAT THE ACCOUNT HOLDER ENTERED, saved into the record. `record` is the record before the change. */
export function typedChangeToRecord(record: readonly AssetRow[], change: TypedChange, writtenAt: string): TypedResult {
  const out: TypedResult = { record: [...record], ask: [], problems: [] };
  switch (change.kind) {
    case 'account-added': {
      const a = change.account;
      if (!valuesAreTyped(a)) break;
      const id = String(a.asset_id);
      out.record = addRows(out.record, typedAccountRows(a), writtenAt);
      arrive(out, (a.positions ?? []).flatMap((p) => (p.lots ?? []).map((l) => lotRow(id, p, l)).filter((r): r is NewRow => r != null)), writtenAt);
      break;
    }
    case 'account-changed': {
      const { before, after, update } = change;
      if (!valuesAreTyped(after)) break;
      const valued = 'balance' in update || 'value_as_of' in update || 'cash_balance' in update;
      const fact = factRow(after, update);
      out.record = addRows(out.record, [...(valued ? accountValueRows(after) : []), ...(fact ? [fact] : [])], writtenAt);
      if ('positions' in update && valuesAreTyped(before)) {
        const ids = new Set([...(before.positions ?? []), ...(after.positions ?? [])].map((p) => p.position_id));
        for (const pid of ids) {
          lotsFollow(out, String(after.asset_id), (before.positions ?? []).find((p) => p.position_id === pid) ?? null,
            (after.positions ?? []).find((p) => p.position_id === pid) ?? null, writtenAt);
        }
      }
      break;
    }
    case 'account-removed':
      out.record = addRows(out.record, [{ accountId: change.accountId, holding: null, kind: 'FACT', date: null, source: SOURCE, facts: { accountRemoved: true } }], writtenAt);
      break;
    case 'account-unlinked':
      out.record = addRows(out.record, [{ accountId: change.accountId, holding: null, kind: 'FACT', date: null, source: SOURCE,
        facts: change.keptAsTyped ? { unlinked: true } : { unlinked: true, accountRemoved: true } }], writtenAt);
      break;
    case 'holding-added':
      lotsFollow(out, change.accountId, null, change.position, writtenAt);
      break;
    case 'holding-changed':
      lotsFollow(out, change.accountId, change.before, change.after, writtenAt);
      break;
    case 'holding-removed':
      lotsFollow(out, change.accountId, change.position, null, writtenAt);
      break;
    case 'transaction-recorded': {
      const r = transactionRow(change.transaction);
      if (r?.kind === 'VALUE') out.record = addRows(out.record, [r], writtenAt);
      else if (r) arrive(out, [r], writtenAt);
      break;
    }
    case 'transaction-deleted':
      for (const r of rowsInForce(out.record).filter((x) => x.ref === txnRef(change.transaction))) remove(out, r.rowId, writtenAt);
      break;
    case 'savings-moved':
      if (change.amount > 0) arrive(out, [{ accountId: change.accountId, holding: null, kind: 'DEPOSIT', date: dateAsGiven(change.date), amount: change.amount, source: SOURCE, ref: `typed-savings:${change.accountId}:${writtenAt}` }], writtenAt);
      break;
  }
  return out;
}
