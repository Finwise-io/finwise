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
  addRows, sortArriving, correctRow, removeRow, rowsInForce, valueRows, saleRow, transferRow, dayOrNull, oneHoldingSpelling, sharesOnRecord,
  type AssetRow, type NewRow, type EventQuestion,
} from './asset-record';
import { contractMultiplier, type Position, type Lot } from '../../../src/domain/performance';
import type { Transaction } from '../../../src/domain/transactions';
import type { AssetAccount } from '../../../src/domain/assets';

const SOURCE = 'typed' as const;
const EPS = 1e-9;
/** Whether two amounts are the same to a billionth, or both missing, so an edit that changes nothing saves nothing. */
/* ─ MK-NW-F-206 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * same
 *
 * Answers ..... Whether two amounts are the same to a billionth, or both missing, so an edit that changes nothing saves nothing.
 *
 * Formula .....
 *     x = nothing and y = nothing   if x = nothing (or y = nothing when missing or zero)
 *     size of(x − y) ≤ EPS   otherwise
 *
 * Called by ... MK-CF-F-087 monthlyTaxRates · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-F-289 purchaseRecordsFollowEdit · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-199 fileToRecord
 *               MK-NW-F-216 rowOfLot · MK-NW-F-221 lotsFollow
 *               MK-NW-F-228 moveOldCopies · MK-NW-F-238 sortArriving
 *               MK-NW-F-281 correctRow · MK-NW-F-289 activityRefs
 *               MK-PF-F-015 topHoldingConcentration · MK-ST-F-084 fillBetweenObservations
 *               MK-ST-F-093 typedValueOnItsDate · MK-XS-F-079 loadUserRoot
 *
 * Reaches ..... 567 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 549 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-206
 * Changed ..... not in git yet (—)
 */
const same = (x: number | null | undefined, y: number | null | undefined) => (x == null || y == null ? x == null && y == null : Math.abs(x - y) <= EPS);
/** A number the account holder typed, or nothing where the box was left empty or holds no number. */
/* ─ MK-NW-F-207 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * givenNumber
 *
 * Answers ..... A number the account holder typed, or nothing where the box was left empty or holds no number.
 *
 * Formula .....
 *     nothing   if v = nothing (or v = '' (or !number.is finite(number(v)) when missing or zero) when missing or zero)
 *     v read as a number   otherwise
 *
 * Called by ... MK-NW-F-213 lotRow · MK-NW-F-214 accountValueRows
 *               MK-NW-F-217 transactionRow · MK-NW-F-223 openingRow
 *               MK-NW-F-224 typedChangeToRecord · MK-NW-F-226 fileValues
 *               MK-NW-F-228 moveOldCopies · MK-NW-F-291 lotsOf
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-214 accountValueRows · MK-NW-F-226 fileValues
 *               MK-NW-F-213 lotRow · MK-NW-F-221 lotsFollow
 *               MK-NW-F-291 lotsOf · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-223 openingRow · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-216 rowOfLot · MK-NW-F-217 transactionRow
 *               MK-NW-F-222 typedAccountRows · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-207
 * Changed ..... 2026-11-11 (d188fd68)
 */
export const givenNumber = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
/** A date as the account holder gave it: its day where it can be read, kept as given where it cannot (addRows keeps it). */
/* ─ MK-NW-F-208 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * dateAsGiven
 *
 * Answers ..... A date as the account holder gave it: its day where it can be read, kept as given where it cannot (addRows keeps it).
 *
 * Formula .....
 *     day or null(v) (or v   if typeof v = 'string' and trim() ! = ''
 *     nothing   otherwise when missing)
 *
 * Called by ... MK-NW-F-213 lotRow · MK-NW-F-214 accountValueRows
 *               MK-NW-F-217 transactionRow · MK-NW-F-223 openingRow
 *               MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-214 accountValueRows · MK-NW-F-213 lotRow
 *               MK-NW-F-221 lotsFollow · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-223 openingRow · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-216 rowOfLot · MK-NW-F-217 transactionRow
 *               MK-NW-F-222 typedAccountRows · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-208
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-209 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * valuesAreTyped
 *
 * Answers ..... An account whose values and purchases the account holder gives: not linked to a broker, not made from a file.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-209
 * Changed ..... 2026-11-11 (c4a137f1)
 */
export const valuesAreTyped = (a: Pick<AssetAccount, 'source'> | null | undefined): boolean =>
  !!a && a.source !== 'connected' && (a.source as string) !== 'imported';

/** The key a purchase the account holder typed carries, so a later edit or removal of that tax lot finds its row. */
/* ─ MK-NW-F-210 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * lotRef
 *
 * Answers ..... The key a purchase the account holder typed carries, so a later edit or removal of that tax lot finds its row.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-213 lotRow · MK-NW-F-216 rowOfLot
 *               MK-NW-F-223 openingRow · MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-213 lotRow · MK-NW-F-221 lotsFollow
 *               MK-NW-F-228 moveOldCopies · MK-NW-F-223 openingRow
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-216 rowOfLot
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-210
 * Changed ..... 2026-11-11 (c4a137f1)
 */
export const lotRef = (accountId: string, lot: Pick<Lot, 'lot_id'>): string => `typed-lot:${accountId}:${lot.lot_id}`;
/** The key a transaction the account holder recorded carries, so deleting it finds its row. */
/* ─ MK-NW-F-211 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * txnRef
 *
 * Answers ..... The key a transaction the account holder recorded carries, so deleting it finds its row.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-217 transactionRow · MK-NW-F-223 openingRow
 *               MK-NW-F-224 typedChangeToRecord · MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-NW-F-223 openingRow
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-217 transactionRow
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-211
 * Changed ..... 2026-11-11 (c4a137f1)
 */
export const txnRef = (t: Pick<Transaction, 'id'>): string => `typed-txn:${t.id}`;

/** What one unit's quoted price is worth per unit the record counts: a bond quoted per $100 of face, a hundredth; an
 *  option (counted in shares, quoted per share) and anything else, 1. */
/* ─ MK-NW-F-212 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * unitPriceFactor
 *
 * Answers ..... What one unit's quoted price is worth per unit the record counts: a bond quoted per $100 of face, a hundredth; an option (counted in shares, quoted per share) and anything else, 1.
 *
 * Formula .....
 *     1   if kind = 'options'
 *     contract multiplier(p as any)   otherwise
 *
 * Called by ... MK-NW-F-213 lotRow · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-291 lotsOf
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-213 lotRow · MK-NW-F-221 lotsFollow
 *               MK-NW-F-291 lotsOf · MK-NW-F-228 moveOldCopies
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-216 rowOfLot
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-212
 * Changed ..... 2026-11-11 (c4a137f1)
 */
export const unitPriceFactor = (p: Position): number => (p.kind === 'options' ? 1 : contractMultiplier(p as any));

/** One tax lot as a purchase. An option's contracts are saved as shares (contracts × shares per contract) at its price
 *  per share, as the record holds a broker's option; a bond quoted per $100 of face is saved as dollars of face at its
 *  cost per $100 ÷ 100, as a file's is (comparison check, 2026-11-11: $110,000 face at 100 read $11,000,000 paid); every
 *  other holding is saved as entered. */
/* ─ MK-NW-F-213 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * lotRow
 *
 * Answers ..... One tax lot as a purchase.
 *
 * Formula .....
 *     holding = one holding spelling(ticker)
 *     per = contract multiplier(p as any)   if kind = 'options'
 *     1   otherwise
 *     shares = given number(lot.shares), cost = given number(lot.cost per share)
 *     nothing   when holding = nothing (or shares = nothing (or shares ≤ 0 when missing or zero) when missing or zero)
 *     price = nothing   if cost = nothing
 *     cost × unit price factor(p)   otherwise
 *
 * Called by ... MK-NW-F-216 rowOfLot · MK-NW-F-221 lotsFollow
 *               MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-221 lotsFollow · MK-NW-F-228 moveOldCopies
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-216 rowOfLot
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-213
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-214 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * accountValueRows
 *
 * Answers ..... The value rows of an account the account holder values by hand: one value, on the date given.
 *
 * Formula .....
 *     date = date as given((a as any).value as of)
 *     cash = nothing   if (a as any).cash not entered = true
 *     given number((a as any).cash balance)   otherwise
 *     the answer:
 *     []   if cash = nothing
 *     value rows({ account id: string(asset id), date, source: SOURCE, cash })   otherwise
 *     []   when (a as any).value basis ≠ nothing
 *     typed value = given number(balance)
 *
 * Called by ... MK-NW-F-222 typedAccountRows · MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-222 typedAccountRows · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-033 the date a hand-typed value was set
 *               MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon
 *               MK-XS-I-067 what was paid for a bond or CD held as its own account
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-214
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-215 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * factRow
 *
 * Answers ..... A bond's or CD's own details, where the account holder gave any: one fact row.
 *
 * Formula .....
 *     from = (only ?? a) as record<string, unknown>
 *     facts = {}
 *     the answer:
 *     account id = string(asset id)
 *     holding = nothing
 *     kind = 'FACT'
 *     date = nothing
 *     source = SOURCE
 *     facts = facts   if count of the names in facts
 *     nothing   otherwise
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-222 typedAccountRows · MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-222 typedAccountRows · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-215
 * Changed ..... not in git yet (—)
 */
function factRow(a: AssetAccount, only?: Partial<AssetAccount>): NewRow | null {
  const from = (only ?? a) as Record<string, unknown>;
  const facts: Record<string, unknown> = {};
  for (const k of BOND_FACTS) if (k in from && from[k] != null && from[k] !== '') facts[k] = from[k];
  return Object.keys(facts).length ? { accountId: String(a.asset_id), holding: null, kind: 'FACT', date: null, source: SOURCE, facts } : null;
}

/** The purchase on record a tax lot stands for: the one carrying its key; else the one purchase of that holding with the
 *  lot's date, shares and price (a broker's or a file's) — a tax lot before a history row of the same date. */
/* ─ MK-NW-F-216 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * rowOfLot
 *
 * Answers ..... The purchase on record a tax lot stands for: the one carrying its key; else the one purchase of that holding with the lot's date, shares and price (a broker's or a file's) — a tax lot before a history row of the same date.
 *
 * Formula .....
 *     live = rows in force(record) where kind = 'PURCHASE' and account id = account id
 *     by ref = live where ref = lot ref(account id, lot)
 *     the first of by ref   when by ref.length = 1
 *     want = lot row(account id, p, lot)
 *     'none'   when want is missing
 *     alike = live where holding = want.holding and (date ?? nothing) = (want.date ?? nothing) and same(shares, want.shares) and same(price, want.price)
 *     lots = alike where in list of is missing
 *     pick = lots   if count of lots
 *     alike   otherwise
 *     the answer:
 *     the first of pick   if pick.length = 1
 *     'many'   if count of pick
 *     'none'   otherwise   otherwise
 *
 * Called by ... MK-NW-F-221 lotsFollow
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-221 lotsFollow · MK-NW-F-228 moveOldCopies
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-216
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-217 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * transactionRow
 *
 * Answers ..... One transaction as one row, on its own date.
 *
 * Formula .....
 *     account id = string(account id), holding = one holding spelling(ticker ?? nothing)
 *     per = multiplier   if multiplier ≠ nothing and multiplier > 0
 *     1   otherwise
 *     shares = nothing   if given number(shares) = nothing
 *     size of(shares read as a number) × per   otherwise
 *     price = given number(price)
 *     amount = nothing   if given number(amount) = nothing
 *     size of(amount read as a number)   otherwise
 *     fee = nothing   if given number(fee) = nothing
 *     size of(fee read as a number)   otherwise
 *     date = date as given(date), ref = txn ref(t)
 *     cash row('OTHER')   when holding = nothing (or shares = nothing when missing or zero)
 *     the answer:
 *     account id = account id
 *     holding = holding
 *     kind = 'PURCHASE'
 *     date = date
 *     shares = shares
 *     price = price
 *     amount = amount (or nothing   if price = nothing
 *     shares × price   otherwise when missing)
 *     fee = fee
 *     source = SOURCE
 *     ref = ref
 *     cash row('OTHER')   when holding = nothing (or shares = nothing when missing or zero)
 *     cash row('OTHER')   when holding = nothing (or shares = nothing when missing or zero)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-217
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-218 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * arrive
 *
 * Answers ..... Saves new rows through the one pass that keeps a twin out and asks about a difference.
 *
 * Formula .....
 *     sorted = sort arriving(out.record, rows)
 *
 * Called by ... MK-NW-F-221 lotsFollow · MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-221 lotsFollow · MK-NW-F-228 moveOldCopies
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-218
 * Changed ..... not in git yet (—)
 */
function arrive(out: TypedResult, rows: NewRow[], writtenAt: string): void {
  if (!rows.length) return;
  const sorted = sortArriving(out.record, rows);
  out.record = addRows(out.record, sorted.save, writtenAt);
  out.ask.push(...sorted.ask);
}

/** An edit of the account holder's: a new row that names the row it corrects, so the old one is kept. */
/* ─ MK-NW-F-219 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * correct
 *
 * Answers ..... An edit of the account holder's: a new row that names the row it corrects, so the old one is kept.
 *
 * Formula .....
 *     c = correct row(out.record, row id, change, SOURCE, written at)
 *
 * Called by ... MK-NW-F-221 lotsFollow · MK-NW-F-246 valuesOn
 *               MK-NW-F-270 sameEventElsewhere · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-294 removalKept · MK-XS-F-002 dataGaps
 *
 * Reaches ..... 26 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-XS-F-002 dataGaps
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-221 lotsFollow
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-294 removalKept
 *               MK-NW-F-239 rowsNotYetSaved · MK-NW-F-272 salesMovedBy
 *               … and 8 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-219
 * Changed ..... not in git yet (—)
 */
function correct(out: TypedResult, rowId: string, change: Partial<NewRow>, writtenAt: string): void {
  const c = correctRow(out.record, rowId, change, SOURCE, writtenAt);
  if (c.problem) out.problems.push(c.problem); else out.record = c.record;
}

/** A removal by the account holder: a new row that marks the old row removed, so its history is kept. */
/* ─ MK-NW-F-220 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * remove
 *
 * Answers ..... A removal by the account holder: a new row that marks the old row removed, so its history is kept.
 *
 * Formula .....
 *     c = remove row(out.record, row id, SOURCE, written at)
 *
 * Called by ... MK-NW-F-221 lotsFollow · MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-221 lotsFollow · MK-NW-F-228 moveOldCopies
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-220
 * Changed ..... not in git yet (—)
 */
function remove(out: TypedResult, rowId: string, writtenAt: string): void {
  const c = removeRow(out.record, rowId, SOURCE, writtenAt);
  if (c.problem) out.problems.push(c.problem); else out.record = c.record;
}

/** Each tax lot of a holding before and after an edit: a new lot is a purchase, a lot taken out is a removal, a lot with
 *  another date, number of shares or price is a correction of its purchase. */
/* ─ MK-NW-F-221 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * lotsFollow
 *
 * Answers ..... Each tax lot of a holding before and after an edit: a new lot is a purchase, a lot taken out is a removal, a lot with another date, number of shares or price is a correction of its purchase.
 *
 * Formula .....
 *     taken = a list with no repeats of for each of out.record: `${account id}|${ref ?? ''}`
 *     was = a lookup of for each of before.lots (or none when missing): [lot id, each]
 *     now = a lookup of for each of after.lots (or none when missing): [lot id, each]
 *     added = []
 *     old = was.get(id)
 *     from = lot row(account id, before as position, old), to = lot row(account id, after as position, lot)
 *     at = row of lot(out.record, account id, before as position, old)
 *     change = {}
 *     prior = from (or at when missing)
 *     shares = change.shares (or at.shares (or 0 when missing) when missing)
 *     at = row of lot(out.record, account id, before as position, old)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-224 typedChangeToRecord
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-221
 * Changed ..... not in git yet (—)
 */
function lotsFollow(out: TypedResult, accountId: string, before: Position | null, after: Position | null, writtenAt: string): void {
  // a ticker corrected (10 APPL changed to AAPL, outside check 2026-11-12): the purchases leave the old name and are
  // bought under the new one, on the same dates at the same prices — the old name's rows are kept, marked removed
  if (before && after && oneHoldingSpelling(before.ticker) !== oneHoldingSpelling(after.ticker)) {
    lotsFollow(out, accountId, before, null, writtenAt);
    // the lot keeps its own number, so its key is already on record under the old name: the new name's row is keyed apart
    const taken = new Set(out.record.map((r) => `${r.accountId}|${r.ref ?? ''}`));
    arrive(out, (after.lots ?? []).map((l) => lotRow(accountId, after, l)).filter((r): r is NewRow => r != null)
      .map((r) => (taken.has(`${accountId}|${r.ref}`) ? { ...r, ref: `${r.ref}:${r.holding}` } : r)), writtenAt);
    return;
  }
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
    // what the account holder changed is read from the lot before and after, never from the purchase: a lot shows the
    // shares LEFT after sales, so the purchase keeps its own shares and takes only the difference (outside check 2,
    // 2026-11-12: 100 bought, 30 sold, the $80 price of the 70 left edited to $85 — the purchase was cut to 70 and the
    // sale of 30 counted again, leaving 40)
    const change: Partial<NewRow> = {};
    const prior = from ?? at;
    if ((prior.date ?? null) !== (to.date ?? null) && (at.date ?? null) !== (to.date ?? null)) change.date = to.date;
    if (!same(prior.shares, to.shares)) change.shares = (at.shares ?? 0) + ((to.shares ?? 0) - (prior.shares ?? 0));
    const shares = change.shares ?? at.shares ?? 0;
    if (!same(prior.price, to.price) && !same(at.price, to.price)) { change.price = to.price; change.amount = to.price == null ? null : shares * to.price; }
    else if (change.shares != null && at.price != null) change.amount = shares * at.price;
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
/* ─ MK-NW-F-222 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * typedAccountRows
 *
 * Answers ..... An account typed by hand, without its holdings: its value on the date given and a bond's or CD's facts.
 *
 * Formula .....
 *     fact = fact row(a)
 *     the answer = [...account value rows(a), ...(fact ? [fact] : [])]
 *
 * Called by ... MK-NW-F-224 typedChangeToRecord · MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-222
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function typedAccountRows(a: AssetAccount): NewRow[] {
  const fact = factRow(a);
  return [...accountValueRows(a), ...(fact ? [fact] : [])];
}

/** An opening record (a holding the account holder already owned when it was first entered) as the purchase of its tax
 *  lot, carrying the lot's key so a later edit of that lot finds it. */
/* ─ MK-NW-F-223 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * openingRow
 *
 * Answers ..... An opening record (a holding the account holder already owned when it was first entered) as the purchase of its tax lot, carrying the lot's key so a later edit of that lot finds it.
 *
 * Formula .....
 *     holding = one holding spelling(ticker ?? nothing), shares = given number(shares)
 *     nothing   when type ! = 'OPENING_POSITION' (or holding = nothing (or shares = nothing (or shares ≤ 0 when missing or zero) when missing or zero) when missing or zero)
 *     per = multiplier   if multiplier ≠ nothing and multiplier > 0
 *     1, price = given number(price)   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-223
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function openingRow(t: Transaction): NewRow | null {
  const holding = oneHoldingSpelling(t.ticker ?? null), shares = givenNumber(t.shares);
  if (t.type !== 'OPENING_POSITION' || holding == null || shares == null || shares <= 0) return null;
  const per = t.multiplier != null && t.multiplier > 0 ? t.multiplier : 1, price = givenNumber(t.price);
  return { accountId: String(t.account_id), holding, kind: 'PURCHASE', date: dateAsGiven(t.date), shares: shares * per, price,
    amount: price == null ? null : shares * per * price, source: SOURCE, ref: t.lot_id ? lotRef(String(t.account_id), { lot_id: t.lot_id }) : txnRef(t) };
}

/** WHAT THE ACCOUNT HOLDER ENTERED, saved into the record. `record` is the record before the change. */
/* ─ MK-NW-F-224 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * typedChangeToRecord
 *
 * Answers ..... WHAT THE ACCOUNT HOLDER ENTERED, saved into the record.
 *
 * Formula .....
 *     out = record = [...record]
 *     ask = []
 *     problems = []
 *     a = change.account
 *     id = string(asset id)
 *     valued = 'balance' in update (or 'value_as_of' in update (or 'cash_balance' in update when missing or zero) when missing or zero)
 *     fact = fact row(after, update)
 *     t = change.transaction
 *     h = one holding spelling(ticker ?? nothing)
 *     r = transaction row(t)
 *     the answer = out
 *
 * Called by ... MK-NW-F-228 moveOldCopies · MK-XS-F-192 typedValueDatedBack
 *               MK-XS-F-229 typedIntoRecord
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-033 the date a hand-typed value was set
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-224
 * Changed ..... 2026-11-11 (d188fd68)
 */
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
      let t = change.transaction;
      // "transfer shares" in the app moves the whole holding and sends no share count (outside check, 2026-11-12: it was
      // saved as OTHER and the shares were counted in both accounts): the shares moved are the ones the record holds for
      // the holding in the account they leave, already counted in shares, so no shares per contract is applied again
      const h = oneHoldingSpelling(t.ticker ?? null);
      if (t.type === 'TRANSFER_IN_KIND' && t.direction !== 'IN' && h != null && givenNumber(t.shares) == null) {
        const held = sharesOnRecord(out.record, String(t.account_id), h);
        if (held > EPS) t = { ...t, shares: held, multiplier: undefined };
      }
      const r = transactionRow(t);
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
