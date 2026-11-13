// Net worth and Performance · THE OLD COPIES, READ OUT OF THE ONE MASTER RECORD (phase 3, stage 0, 2026-11-12).
//
// WHAT IT DOES. Screens and 30 pure functions read three old copies: the accounts (balance, value date, holdings with
// their tax lots, cash), the activity list, and the daily values. This file works each of them out from the one master
// record (asset-record.ts) and the account's own details, IN THE OLD SHAPES, so no reader has to change when they switch.
//
// WHAT STAYS ON THE ACCOUNT. The record holds money, shares, dates and a bond's or an option's facts. The account's name,
// institution, kind, tax bucket, class, connection ids and status are not on the record: they stay on the account as
// details and are copied across as they stand. Only the money, holding and date fields are read out.
//
// THE RULES IT KEEPS.
//   · TODAY'S VALUE is the latest value on record PLUS the money recorded after it (the workplan row: Savings $1,000 as of
//     Nov 1 and $500 moved in on Nov 12 reads $1,500). A value the one-time move saved already counts what the phone held,
//     so the money the move saved beside it is not added again.
//   · A BOND OR CD WITH NO MARKET VALUE keeps the value today's screens show: what was paid, else its face (DEC-0281, the
//     one value rule settleBondValue); the record keeps those as facts, never as values.
//   · AN ACCOUNT BUILT FROM ITS HOLDINGS (derive_balance) is its cash plus each holding at the latest price, as the store's
//     recomputeBalances builds it.
//   · AN UNKNOWN IS NOT $0: a total with a part nobody knows stays blank.
//   · AN ACCOUNT NOT YET ON THE RECORD (not moved, a linked account not yet updated) is returned exactly as it stands.
//   · THE DAILY VALUES come from the record's dated values only. The days kept before the record began, and the debts
//     part of the net worth line, wait for his rulings (plan risks R5 and R7), so nwDaily is not read out here.
import {
  rowsInForce, valuesNow, valuesOn, valueBatchesOf, openPurchases, sharesOnRecord, activityOf, factsOf, rowPosition, oneHoldingSpelling,
  type AssetRow, type ValueBatch, type OpenPurchase,
} from './asset-record';
import { unitPriceFactor } from './asset-record-from-typed';
import { contractMultiplier, latestCloseLookup, marketValue, paidOnRecord, priceOnRecord, type Position, type Lot, type PriceSeries } from '../../../src/domain/performance';
import { settleBondValue } from '../../../src/domain/bonds';
import { isRealAsset, type AssetAccount } from '../../../src/domain/assets';
import type { Transaction, TxnType } from '../../../src/domain/transactions';
import { accountValuesOn, prune as pruneDays, type SnapshotDay, type HoldingSnapshot, type AccountSnapshot } from '../../../Calculation Module code/engines/snapshots';

const EPS = 1e-9;
const BOND_FACTS = ['face_value', 'coupon_rate', 'maturity_date', 'amount_paid', 'cd_bought', 'accrued_interest'] as const;
const HOLDING_FACTS = ['face_value', 'coupon_rate', 'maturity_date', 'price_quote'] as const;

/** The money kinds that move an account's total: what came in from outside or went out. */
const MONEY_IN: ReadonlySet<string> = new Set(['DEPOSIT', 'DIVIDEND', 'INTEREST']);
const MONEY_OUT: ReadonlySet<string> = new Set(['WITHDRAWAL', 'FEE']);

/** The account's value today as the record gives it. */
export interface ValueToday {
  /** Null where a part nobody knows makes the total unknown (rule 8). */
  total: number | null;
  /** Uninvested cash; null where nobody gave it and no money moved. */
  cash: number | null;
  /** True where the cash figure was opened from money recorded, not given (the old cash_not_entered). */
  cashNotEntered: boolean;
  /** The day of the latest value; null where nobody dated it. */
  date: string | null;
  batch: ValueBatch | null;
  /** The money in less the money out recorded after the latest value, counted in the total. */
  movedSince: number;
}

/** The move's own mark on an account it moved, and when it was saved (asset-record-move.ts, movedMark). */
/* ─ MK-NW-F-358 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * movedAt
 *
 * Answers ..... The move's own mark on an account it moved, and when it was saved (asset-record-move.ts, movedMark).
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-359 moneyAfter · MK-NW-F-361 valueToday
 *               MK-NW-F-365 accountReadOut
 *
 * Reaches ..... 13 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-NW-F-359 moneyAfter · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-361 valueToday
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-358
 * Changed ..... not in git yet (—)
 */
const movedAt = (record: readonly AssetRow[], accountId: string): string | null =>
  rowsInForce(record).find((r) => r.kind === 'FACT' && r.accountId === accountId && r.ref === `moved-from-phone:${accountId}`)?.writtenAt ?? null;

/** The rows that move money into or out of one account, recorded after its latest value (or all of them, with no value). */
/* ─ MK-NW-F-359 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * moneyAfter
 *
 * Answers ..... The rows that move money into or out of one account, recorded after its latest value (or all of them, with no value).
 *
 * Formula .....
 *     live   when batch is missing
 *     at = row position(record)
 *     own = batch.batch
 *     moved = moved at(record, account id)
 *     false   when moved ≠ nothing and written at = moved and batch.written at = moved
 *     date > batch.date   when batch.date ≠ nothing and date ≠ nothing
 *     the answer = at(row id) > at(own)
 *
 * Called by ... MK-NW-F-361 valueToday · MK-NW-F-365 accountReadOut
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-361 valueToday
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-359
 * Changed ..... not in git yet (—)
 */
function moneyAfter(record: readonly AssetRow[], accountId: string, batch: ValueBatch | null): AssetRow[] {
  // a tax lot (typed as already owned, or from a broker's or a file's list of what is held) is not a trade: no cash moved
  const heldAlready = (r: AssetRow) => r.kind === 'PURCHASE' && (r.ref?.startsWith('typed-lot:') || r.stillHeldOn != null || r.inListOf != null || r.source === 'file'
    || r.ref?.startsWith('moved-'));
  const live = rowsInForce(record).filter((r) => (r.accountId === accountId || r.toAccountId === accountId) && !heldAlready(r)
    && (MONEY_IN.has(r.kind) || MONEY_OUT.has(r.kind) || r.kind === 'PURCHASE' || r.kind === 'SALE' || (r.kind === 'TRANSFER' && r.holding == null)
      || (r.kind === 'OTHER' && r.reversalOf != null && r.direction != null)));
  if (!batch) return live;
  const at = rowPosition(record);
  const own = batch.batch;
  const moved = movedAt(record, accountId);
  return live.filter((r) => {
    // the move saves the value the phone held, which already counts the money it saves beside it
    if (moved != null && r.writtenAt === moved && batch.writtenAt === moved) return false;
    if (batch.date != null && r.date != null) return r.date > batch.date;
    return at(r.rowId) > at(own);
  });
}

/** The cash one row moves in one account: + in, − out; a trade's cash only where `trades` is true. */
/* ─ MK-NW-F-360 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * cashMovedBy
 *
 * Answers ..... The cash one row moves in one account: + in, − out; a trade's cash only where `trades` is true.
 *
 * Formula .....
 *     amt = size of(amount (or 0), fee = math.abs(fee (or 0 when missing) when missing))
 *     amt   when MONEY_IN.has(kind)
 *     -amt   when MONEY_OUT.has(kind)
 *     amt   if to account id = account id and account id ! = account id
 *     -amt   if account id = account id and to account id ≠ nothing
 *     amt   if arrives
 *     -amt   otherwise   otherwise   otherwise   when kind = 'TRANSFER'
 *     gross = size of(amount)   if amount ≠ nothing
 *     size of(shares × price)   if shares ≠ nothing and price ≠ nothing
 *     0   otherwise   otherwise
 *     -gross − fee   when kind = 'SALE' and holding = nothing
 *     amt   if direction = 'IN'
 *     -amt   otherwise   when kind = 'OTHER' and reversal of ≠ nothing and direction ≠ nothing
 *     gross − fee   if trades
 *     -fee   otherwise   when kind = 'SALE'
 *     -gross − fee   if trades
 *     -fee   otherwise   when kind = 'PURCHASE'
 *     the answer = 0
 *
 * Called by ... MK-NW-F-361 valueToday · MK-NW-F-365 accountReadOut
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-361 valueToday
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If amount is missing it uses 0.
 *     · If fee is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-360
 * Changed ..... not in git yet (—)
 */
function cashMovedBy(r: AssetRow, accountId: string, trades: boolean): number {
  const amt = Math.abs(r.amount ?? 0), fee = Math.abs(r.fee ?? 0);
  if (MONEY_IN.has(r.kind)) return amt;
  if (MONEY_OUT.has(r.kind)) return -amt;
  if (r.kind === 'TRANSFER') return r.toAccountId === accountId && r.accountId !== accountId ? amt : r.accountId === accountId && r.toAccountId != null ? -amt : r.arrives ? amt : -amt;
  const gross = r.amount != null ? Math.abs(r.amount) : r.shares != null && r.price != null ? Math.abs(r.shares * r.price) : 0;
  // an amount sold of an account with no holdings (a bond, a CD, an alternative typed as one value): the value that left
  if (r.kind === 'SALE' && r.holding == null) return -gross - fee;
  // a broker's reversal (a dividend that left, a fee refunded): the cash moved the way the broker sent it
  if (r.kind === 'OTHER' && r.reversalOf != null && r.direction != null) return r.direction === 'IN' ? amt : -amt;
  if (r.kind === 'SALE') return trades ? gross - fee : -fee;
  if (r.kind === 'PURCHASE') return trades ? -gross - fee : -fee;
  return 0;
}

/** TODAY'S VALUE of one account: the latest value on record plus the money recorded after it (the workplan's $1,000 + $500).
 *  `opensCash` false for a bank account or a property, whose money is its balance, so no cash figure of its own is opened. */
/* ─ MK-NW-F-361 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * valueToday
 *
 * Answers ..... TODAY'S VALUE of one account: the latest value on record plus the money recorded after it (the workplan's $1,000 + $500).
 *
 * Formula .....
 *     latest = values now(record, account id)
 *     own row = (b: value batch) => record.find((r) => kind = 'VALUE' and holding = nothing and (batch ?? row id) = batch)
 *     is opening = (b: value batch | nothing) => b ≠ nothing and cash ≠ nothing and typed value = nothing and !holdings.length and !!own row(b).ref.starts with('typed − txn:')
 *     openings = a list with no repeats of value batches of(record, account id) where is openingfor each of : batch   if is opening(latest)
 *     new set<string>()   otherwise
 *     own = values now(record.filter((r) => !(kind = 'VALUE' and openings.has(batch ?? row id))), account id)   if openings.size
 *     nothing   otherwise
 *     opening = latest   if own
 *     nothing   otherwise
 *     batch = own (or latest when missing)
 *     after = money after(record, account id, batch)
 *     moved = moved at(record, account id)
 *     live = a list with no repeats of for each of rows in force(record): row id
 *     bought = a list with no repeats of the names in facts of(record, account id, nothing) where starts with('bought not owned:')for each of : slice('bought not owned:'.length)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-365 accountReadOut
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-361
 * Changed ..... not in git yet (—)
 */
export function valueToday(record: readonly AssetRow[], accountId: string, opensCash = true, builtFromHoldings = false): ValueToday {
  const latest = valuesNow(record, accountId);
  // AN OPENING CASH RECORD IS THE ACCOUNT'S CASH, NOT ITS WHOLE VALUE (switch gap, 2026-11-13: Vanguard typed at $50,000 on
  // Sep 1 with 100 VTI, and $5,000 opening cash recorded the same day, read $5,000 — the cash alone stood for the account).
  // Where the account has a value of its own, that value stands and the opening record gives the cash
  const ownRow = (b: ValueBatch) => record.find((r) => r.kind === 'VALUE' && r.holding == null && (r.batch ?? r.rowId) === b.batch);
  const isOpening = (b: ValueBatch | null) => b != null && b.cash != null && b.typedValue == null && !b.holdings.length && !!ownRow(b)?.ref?.startsWith('typed-txn:');
  const openings = isOpening(latest) ? new Set(valueBatchesOf(record, accountId).filter(isOpening).map((b) => b.batch)) : new Set<string>();
  const own = openings.size ? valuesNow(record.filter((r) => !(r.kind === 'VALUE' && openings.has(r.batch ?? r.rowId))), accountId) : null;
  const opening = own ? latest : null;
  const batch = own ?? latest;
  const after = moneyAfter(record, accountId, batch);
  // MONEY THE MOVE SAVED AND THE ACCOUNT HOLDER THEN TOOK AWAY (switch gap, 2026-11-13: a $500.37 transfer from A to B
  // recorded on the old phone, moved, then deleted — A stayed at $499.63, the transfer still inside the value the move
  // saved). The moved value counts the money moved beside it; a moved row since taken away, or corrected, is taken out of it
  const moved = movedAt(record, accountId);
  const live = new Set(rowsInForce(record).map((r) => r.rowId));
  // a lot the move saved that stood for a buy, its buy since deleted: the cash it took comes back
  const bought = new Set(Object.keys(factsOf(record, accountId, null)).filter((k) => k.startsWith('boughtNotOwned:')).map((k) => k.slice('boughtNotOwned:'.length)));
  const takenAway = batch != null && moved != null && batch.writtenAt === moved
    ? record.filter((r) => r.writtenAt === moved && !live.has(r.rowId) && (r.accountId === accountId || r.toAccountId === accountId)
      && (MONEY_IN.has(r.kind) || MONEY_OUT.has(r.kind) || r.kind === 'PURCHASE' || r.kind === 'SALE' || (r.kind === 'TRANSFER' && r.holding == null)
        || (r.kind === 'OTHER' && r.reversalOf != null && r.direction != null))
      && (!(r.kind === 'PURCHASE' && (r.ref?.startsWith('typed-lot:') || r.ref?.startsWith('moved-') || r.source === 'file')) || bought.has(r.rowId))
      && (bought.has(r.rowId) || batch.date == null || r.date == null || r.date > batch.date))
    : [];
  // a typed total moves by the money that came in or went out (and a trade's fee); trades inside it change nothing
  const movedSince = after.reduce((t, r) => t + cashMovedBy(r, accountId, false), 0) - takenAway.reduce((t, r) => t + cashMovedBy(r, accountId, false), 0);
  let cash: number | null = opening ? opening.cash : batch?.cash ?? null, cashNotEntered = false;
  if (cash != null) cash += after.reduce((t, r) => t + cashMovedBy(r, accountId, true), 0) - takenAway.reduce((t, r) => t + cashMovedBy(r, accountId, true), 0);
  else if (opensCash) {
    // A CASH FIGURE NOBODY GAVE is the running sum of every money row on record, opened from nothing (the old
    // cash_not_entered): whatever value stood when the money moved, the figure counts all of it
    const all = moneyAfter(record, accountId, null);
    if (all.some((r) => r.kind !== 'PURCHASE' && r.kind !== 'SALE') || (builtFromHoldings && all.length)) {
      cash = all.reduce((t, r) => t + cashMovedBy(r, accountId, builtFromHoldings), 0); cashNotEntered = true;
    }
  }
  const total = batch?.total == null ? null : batch.total + movedSince;
  return { total, cash, cashNotEntered, date: batch?.date ?? null, batch, movedSince };
}

/** The holdings an account holds on record: every holding with shares on record above nothing. */
/* ─ MK-NW-F-362 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * heldOnRecord
 *
 * Answers ..... The holdings an account holds on record: every holding with shares on record above nothing.
 *
 * Formula .....
 *     live = rows in force(record) where holding ≠ nothing and (account id = account id or to account id = account id) and kind ! = 'VALUE' and kind ! = 'FACT'
 *     the answer = [...new set(live.map((r) => holding as string))] where shares on record(record, account id, each) > EPS
 *
 * Called by ... MK-NW-F-201 fileRowsToSave · MK-NW-F-365 accountReadOut
 *               MK-NW-F-420 recordsOwnTotal
 *
 * Reaches ..... 13 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-NW-F-201 fileRowsToSave
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-NW-F-420 recordsOwnTotal · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-362
 * Changed ..... not in git yet (—)
 */
function heldOnRecord(record: readonly AssetRow[], accountId: string): string[] {
  const live = rowsInForce(record).filter((r) => r.holding != null && (r.accountId === accountId || r.toAccountId === accountId) && r.kind !== 'VALUE' && r.kind !== 'FACT');
  return [...new Set(live.map((r) => r.holding as string))].filter((h) => sharesOnRecord(record, accountId, h) > EPS);
}

/** The tax lot as the details hold it, where one matches: its own number taken back out of the key a typed lot carries, else
 *  the detail lot with the same day, shares and price (kept exactly as written), else a number made from the row's. */
/* ─ MK-NW-F-363 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * lotOf
 *
 * Answers ..... The tax lot as the details hold it, where one matches: its own number taken back out of the key a typed lot carries, else the detail lot with the same day, shares and price (kept exactly as written), else a number made from the row's.
 *
 * Formula .....
 *     ref = record.find((r) => row id = first row id).ref (or '' when missing)
 *     m = new reg exp(`^typed − lot:${account id.replace( ÷ [. × +?^${}()|[\]\\] ÷ g, '\\$&')}:(.+)$`).exec(ref)
 *     lot id = m[1]
 *     ...lot = ...lot   when m
 *     day of = the first 10) : nothing of (v: unknown) => (v ? string(v)
 *     the answer:
 *     { ...twin }   if twin
 *     lot id = `rec:${first row id}`
 *     ...lot = ...lot   otherwise
 *
 * Called by ... MK-NW-F-364 positionReadOut
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-NW-F-364 positionReadOut · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-363
 * Changed ..... not in git yet (—)
 */
function lotOf(record: readonly AssetRow[], accountId: string, o: OpenPurchase, detailLots: readonly Lot[], lot: Omit<Lot, 'lot_id'>): Lot {
  const ref = record.find((r) => r.rowId === o.firstRowId)?.ref ?? '';
  const m = new RegExp(`^typed-lot:${accountId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(.+)$`).exec(ref);
  if (m) return { lot_id: m[1], ...lot };
  const dayOf = (v: unknown) => (v ? String(v).slice(0, 10) : null);
  const twin = detailLots.find((l) => Math.abs(Number(l.shares) - lot.shares) <= 1e-6 && dayOf(l.purchase_date) === dayOf(lot.purchase_date)
    && ((l.cost_per_share == null && lot.cost_per_share == null) || (l.cost_per_share != null && lot.cost_per_share != null && Math.abs(l.cost_per_share - lot.cost_per_share) <= 1e-6)));
  return twin ? { ...twin } : { lot_id: `rec:${o.firstRowId}`, ...lot };
}

/** A holding's position as the record holds it: the detail position (or one made for a holding only the record knows),
 *  its tax lots from the open purchases, its price from the latest value, its facts from the record. */
/* ─ MK-NW-F-364 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * positionReadOut
 *
 * Answers ..... A holding's position as the record holds it: the detail position (or one made for a holding only the record knows), its tax lots from the open purchases, its price from the latest value, its facts from the record.
 *
 * Formula .....
 *     facts = facts of(record, account id, h)
 *     per contract = facts.shares per contract (or facts.multiplier when missing) read as a number
 *     per = contract multiplier(base as any)   if base.kind = 'options'
 *     1   otherwise
 *     factor = unit price factor(base)
 *     lot = shares = shares ÷ per
 *     cost per share = nothing   if price = nothing
 *     price ÷ factor   otherwise
 *     purchase date = (date ?? undefined) as string
 *     the answer = lot of(record, account id, o, detail.lots ?? [], lot)
 *     no count = detail.lots (or none when missing) where shares = nothing and !base.lots.some((x) => lot id = lot id)
 *     quoted = batch.holdings.find((x) => holding = h)
 *
 * Called by ... MK-NW-F-365 accountReadOut
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-364
 * Changed ..... not in git yet (—)
 */
function positionReadOut(record: readonly AssetRow[], accountId: string, h: string, detail: Position | undefined, batch: ValueBatch | null): Position {
  const facts = factsOf(record, accountId, h);
  const perContract = Number(facts.sharesPerContract ?? facts.multiplier);
  const base: Position = detail ? { ...detail } : {
    position_id: `pos-${accountId}-${h}`, ticker: h, lots: [],
    ...(Number.isFinite(perContract) && perContract > 0 && facts.optionExpiry !== undefined ? { kind: 'options', multiplier: perContract } : {}),
  } as Position;
  for (const k of HOLDING_FACTS) if (facts[k] != null) (base as any)[k] = facts[k];
  const per = base.kind === 'options' ? contractMultiplier(base as any) : 1;
  const factor = unitPriceFactor(base);
  base.lots = openPurchases(record, accountId, h).map((o) => {
    const lot: Omit<Lot, 'lot_id'> = { shares: o.shares / per, cost_per_share: o.price == null ? null : o.price / factor, purchase_date: (o.date ?? undefined) as string };
    if (lot.purchase_date === undefined) delete (lot as any).purchase_date;
    return lotOf(record, accountId, o, detail?.lots ?? [], lot);
  });
  // A PURCHASE WITH NO SHARE COUNT is not a purchase the record can hold (no shares to add), and the account holder still
  // entered it: the phone's lot stays, so the page keeps saying "Not stated — a purchase has no share count on record"
  // (trade sheet state O, the same screen with the switch on or off, 2026-11-13)
  const noCount = (detail?.lots ?? []).filter((l) => l.shares == null && !base.lots.some((x) => x.lot_id === l.lot_id));
  if (noCount.length) base.lots = [...base.lots, ...noCount];
  const quoted = batch?.holdings.find((x) => x.holding === h);
  if (quoted?.price != null) base.last_price = quoted.price;
  return base;
}

/** UNTIL THE ACCOUNT HOLDER ANSWERS, THE RECORD KEEPS ITS OWN FIGURES, and every total counts them (questions-and-answers
 *  design v02, account page state C; switch gap, 2026-11-13: Robinhood listed 300 MSFT and no VTI where the record holds 500
 *  and 20, and the page read Robinhood's $131,949 where the drawing reads $222,949). Where the shares on record differ from
 *  the shares a broker's or a file's values state, the total is the cash plus each holding's shares on record at the price
 *  those values give (else the last price the screens hold); null where they agree, or where a holding has no price at all. */
/* ─ MK-NW-F-420 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * recordsOwnTotal
 *
 * Answers ..... UNTIL THE ACCOUNT HOLDER ANSWERS, THE RECORD KEEPS ITS OWN FIGURES, and every total counts them (questions-and-answers design v02, account page state C; switch gap, 2026-11-13: Robinhood listed 300 MSFT and no VTI where the record holds 500 and 20, and the page read Robinhood's $131,949 where the drawing reads $222,949).
 *
 * Formula .....
 *     nothing   when count of batch.typed value ≠ nothing (or batch.holdings is missing when missing or zero)
 *     held = held on record(record, account id)
 *     names = a list with no repeats of [...held, ...batch.holdings.map((x) => holding)]
 *     differs = false, total = batch.cash (or 0 when missing)
 *     on record = shares on record(record, account id, h), q = batch.holdings.find((x) => holding = h)
 *     price = price (or last price(h) when missing)
 *     nothing   when price = nothing
 *     the answer:
 *     total   if differs
 *     nothing   otherwise
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-365 accountReadOut
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Decides .....
 *     · If cash is missing it uses 0.
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-420
 * Changed ..... not in git yet (—)
 */
function recordsOwnTotal(record: readonly AssetRow[], accountId: string, batch: ValueBatch, lastPrice: (h: string) => number | null = () => null): number | null {
  if (batch.typedValue != null || !batch.holdings.length) return null;
  const held = heldOnRecord(record, accountId);
  const names = new Set([...held, ...batch.holdings.map((x) => x.holding)]);
  let differs = false, total = batch.cash ?? 0;
  for (const h of names) {
    const onRecord = sharesOnRecord(record, accountId, h), q = batch.holdings.find((x) => x.holding === h);
    if (Math.abs(onRecord - (q?.shares ?? 0)) > 1e-9) differs = true;
    if (onRecord <= 1e-9) continue;
    // a holding those values leave out is priced at the last price the screens hold for it
    const price = q?.price ?? lastPrice(h);
    if (price == null) return null;
    total += onRecord * price;
  }
  return differs ? total : null;
}

/** True where the account holder emptied the market value AFTER the value standing now: the value is no longer a market
 *  value, and a bond's or CD's value rule (what was paid, else its face) decides it (DEC-0281). */
/* ─ MK-NW-F-421 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * marketValueEmptied
 *
 * Answers ..... True where the account holder emptied the market value AFTER the value standing now: the value is no longer a market value, and a bond's or CD's value rule (what was paid, else its face) decides it (DEC-0281).
 *
 * Formula .....
 *     at = row position(record)
 *
 * Called by ... MK-NW-F-365 accountReadOut
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-365 accountReadOut · MK-NW-F-367 accountsReadOut
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-421
 * Changed ..... not in git yet (—)
 */
function marketValueEmptied(record: readonly AssetRow[], accountId: string, batch: ValueBatch): boolean {
  const at = rowPosition(record);
  return rowsInForce(record).some((r) => r.kind === 'FACT' && r.accountId === accountId && r.holding == null && r.facts?.noMarketValue === true
    && at(r.rowId) > at(batch.batch));
}

/** ONE ACCOUNT, READ OUT: its details as they stand, with balance, cash, value date, holdings and a bond's facts from the record. */
/* ─ MK-NW-F-365 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accountReadOut
 *
 * Answers ..... ONE ACCOUNT, READ OUT: its details as they stand, with balance, cash, value date, holdings and a bond's facts from the record.
 *
 * Formula .....
 *     id = string(details.asset id)
 *     details   when !record.some((r) => account id = id or to account id = id)
 *     today = value today(record, id, details.tax bucket ! = 'CASH' and details.tax bucket ! = 'PROPERTY', details.derive balance = true)
 *     typed cash = facts of(record, id, nothing).cash in typed total
 *     out = { ...details }
 *     held = held on record(record, id)
 *     detail of = (h: string) => (details.positions ?? []).find((p) => one holding spelling(ticker) = h)
 *     linked option = (h: string) => details.source = 'connected' and !detail of(h) and facts of(record, id, h).shares per contract ≠ nothing
 *     nothing on record = (h: string) => !rows in force(record).some((r) => account id = id and holding = h and kind ! = 'FACT')
 *     sold out = (h: string) => { const d = detail of(h); return d ≠ nothing and !(lots ?? []).some((l) => (number(shares) or 0) > 0); }
 *     facts = facts of(record, id, nothing)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-367 accountsReadOut · MK-NW-F-382 explainedDifference
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-367 accountsReadOut · MK-NW-F-382 explainedDifference
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-033 the date a hand-typed value was set
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-077 that an account's cash was never entered — the cash figure is activity since the import or since it was added
 *
 * Decides .....
 *     · If value now is missing it uses 0.
 *     · If cash is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-365
 * Changed ..... not in git yet (—)
 */
export function accountReadOut(record: readonly AssetRow[], details: AssetAccount, priceCache: Record<string, PriceSeries> = {}): AssetAccount {
  const id = String(details.asset_id);
  if (!record.some((r) => r.accountId === id || r.toAccountId === id)) return details;   // not on the record yet (plan R1, R2)
  const today = valueToday(record, id, details.tax_bucket !== 'CASH' && details.tax_bucket !== 'PROPERTY', details.derive_balance === true);
  // THE CASH INSIDE A TYPED TOTAL: the cash the account holder gave with the total (a fact, never added to the total), plus
  // the money recorded after that value — $1,000 typed, then a $250 deposit, reads $1,250
  const typedCash = factsOf(record, id, null).cashInTypedTotal;
  if (details.derive_balance !== true && today.batch?.typedValue != null && today.batch.cash == null && typeof typedCash === 'number') {
    today.cash = typedCash + moneyAfter(record, id, today.batch).reduce((t, r) => t + cashMovedBy(r, id, true), 0);
    today.cashNotEntered = false;
  }
  const out: any = { ...details };
  // the holdings: the detail positions the record still holds, in their order, then any holding only the record knows
  const held = heldOnRecord(record, id);
  const detailOf = (h: string) => (details.positions ?? []).find((p) => oneHoldingSpelling(p.ticker) === h);
  const linkedOption = (h: string) => details.source === 'connected' && !detailOf(h) && factsOf(record, id, h).sharesPerContract != null;
  // a holding the screens hold that the record holds nothing for — no purchase, no value (every share sold and its lots
  // emptied, or a holding added with no purchase yet) — is kept as the account holder left it (switch gap, 2026-11-13:
  // LCTX with no purchase read "This holding isn't here any more" and its editor could not open)
  const nothingOnRecord = (h: string) => !rowsInForce(record).some((r) => r.accountId === id && r.holding === h && r.kind !== 'FACT');
  // and a holding the phone still lists with every share sold stays, with no lots, so its page reads "Holding liquidated —
  // all shares sold" with its history (switch gap, 2026-11-13: it read "This holding isn't here any more")
  const soldOut = (h: string) => { const d = detailOf(h); return d != null && !(d.lots ?? []).some((l) => (Number(l.shares) || 0) > 0); };
  const order = [...new Set([...(details.positions ?? []).map((p) => oneHoldingSpelling(p.ticker)).filter((h): h is string => h != null && (held.includes(h) || nothingOnRecord(h) || soldOut(h))),
    ...held.filter((h) => !linkedOption(h))])];
  if (order.length || details.positions != null) out.positions = order.map((h) => positionReadOut(record, id, h, detailOf(h), today.batch));
  // a bond's or CD's own facts: the record's FACT rows win (the bond editor writes them there)
  const facts = factsOf(record, id, null);
  for (const k of BOND_FACTS) if (facts[k] != null) out[k] = facts[k];
  if (details.derive_balance === true) {
    // BUILT FROM ITS HOLDINGS, as recomputeBalances builds it: the cash plus each holding at the latest price; with no price,
    // what was paid; a holding nobody can value leaves the total blank
    const px = latestCloseLookup(priceCache);
    let unknown = false;
    out.positions = (out.positions ?? []).map((p: Position) => {
      const price = px(p.ticker) ?? priceOnRecord(p);
      const v = (price == null ? paidOnRecord(p).paid : marketValue(p, price)) ?? p.value_now ?? null;
      if (v == null) { unknown = true; return p; }
      return { ...p, value_now: v };
    });
    const mv = (out.positions as Position[]).reduce((t, p) => t + (p.value_now ?? 0), 0);
    out.balance = unknown ? undefined : (today.cash ?? 0) + mv;
  } else if (today.total != null && !(today.batch && marketValueEmptied(record, id, today.batch))) {
    const lastPrice = (h: string) => (details.positions ?? []).find((p) => oneHoldingSpelling(p.ticker) === h)?.last_price ?? null;
    out.balance = (today.batch ? recordsOwnTotal(record, id, today.batch, lastPrice) : null) ?? today.total;
    if (out.balance !== today.total) out.balance += today.movedSince;
    delete out.value_basis;
  } else if (today.batch == null || marketValueEmptied(record, id, today.batch)) {
    // no value on record: a bond or CD keeps what was paid, else its face (DEC-0281); any other account has no value. A
    // phone copy with no balance and no basis was never settled by a save, and reads as it stands — "Value not entered" (the
    // same screen with the switch on or off, 2026-11-13)
    const neverSettled = today.batch == null && details.balance == null && details.value_basis == null;
    const settled = neverSettled ? { balance: undefined, value_basis: undefined } : settleBondValue({ ...out, balance: undefined, value_basis: undefined });
    out.balance = settled.balance;
    if (settled.value_basis) out.value_basis = settled.value_basis; else delete out.value_basis;
  } else {
    out.balance = undefined;   // a value on record with a part nobody knows: blank, never $0 (rule 8)
  }
  if (out.balance === undefined) delete out.balance;
  if (today.cash != null) out.cash_balance = today.cash; else delete out.cash_balance;
  if (today.cashNotEntered) out.cash_not_entered = true; else delete out.cash_not_entered;
  // a bond or CD valued at what was paid or its face keeps the day the account holder gave with it (no value is saved for
  // it on the record, DEC-0281): "Value as of Jun 2, 2026" stays on its page (state F)
  // a day the one-time move took from the recorded days for a value the phone never dated is the record's, not a date the
  // account holder gave: the page keeps printing no "Value as of" for it (the same screen with the switch on or off)
  const movedUndated = today.batch != null && today.batch.writtenAt === movedAt(record, id) && details.value_as_of == null;
  if (today.date != null && !movedUndated) out.value_as_of = today.date;
  else if (movedUndated) delete out.value_as_of;
  else if (today.batch == null && out.value_basis != null && details.value_as_of != null) out.value_as_of = details.value_as_of;
  else delete out.value_as_of;
  return out as AssetAccount;
}

/** True where the record says the account was taken away (or unlinked and not kept). */
/* ─ MK-NW-F-366 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * removedOnRecord
 *
 * Answers ..... True where the record says the account was taken away (or unlinked and not kept).
 *
 * Formula .....
 *     facts of(record, account id, nothing).account removed = true
 *
 * Called by ... MK-NW-F-367 accountsReadOut · MK-NW-F-374 daysReadOut
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-367 accountsReadOut · MK-NW-F-374 daysReadOut
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-366
 * Changed ..... not in git yet (—)
 */
const removedOnRecord = (record: readonly AssetRow[], accountId: string): boolean => factsOf(record, accountId, null).accountRemoved === true;

/** EVERY ACCOUNT, READ OUT, in the order of the details; an account the record says was taken away is left out. */
/* ─ MK-NW-F-367 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accountsReadOut
 *
 * Answers ..... EVERY ACCOUNT, READ OUT, in the order of the details; an account the record says was taken away is left out.
 *
 * Formula .....
 *     details where !removed on record(record, string(asset id))for each of : account read out(record, each, price cache)
 *
 * Called by ... MK-NW-F-376 readOuts
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-367
 * Changed ..... not in git yet (—)
 */
export function accountsReadOut(record: readonly AssetRow[], details: readonly AssetAccount[], priceCache: Record<string, PriceSeries> = {}): AssetAccount[] {
  return details.filter((a) => !removedOnRecord(record, String(a.asset_id))).map((a) => accountReadOut(record, a, priceCache));
}

/** The shares one contract of a holding stands for, from the record's facts or the detail position; 1 for a share. */
/* ─ MK-NW-F-368 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * perContractOf
 *
 * Answers ..... The shares one contract of a holding stands for, from the record's facts or the detail position; 1 for a share.
 *
 * Formula .....
 *     1   when h = nothing
 *     f = facts of(record, account id, h).shares per contract read as a number
 *     f   when number.is finite(f) and f > 0
 *     p = details.find((a) => string(asset id) = account id).positions.find((x) => one holding spelling(ticker) = h)
 *     the answer:
 *     contract multiplier(p as any)   if kind = 'options'
 *     1   otherwise
 *
 * Called by ... MK-NW-F-371 transactionOf
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-NW-F-371 transactionOf · MK-NW-F-372 transactionsReadOut
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-368
 * Changed ..... not in git yet (—)
 */
function perContractOf(record: readonly AssetRow[], accountId: string, h: string | null, details: readonly AssetAccount[]): number {
  if (h == null) return 1;
  const f = Number(factsOf(record, accountId, h).sharesPerContract);
  if (Number.isFinite(f) && f > 0) return f;
  const p = details.find((a) => String(a.asset_id) === accountId)?.positions?.find((x) => oneHoldingSpelling(x.ticker) === h);
  return p?.kind === 'options' ? contractMultiplier(p as any) : 1;
}

/** What one unit's quoted price is worth per unit the record counts (a bond quoted per $100 of face: a hundredth). */
/* ─ MK-NW-F-369 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * quotedFactor
 *
 * Answers ..... What one unit's quoted price is worth per unit the record counts (a bond quoted per $100 of face: a hundredth).
 *
 * Formula .....
 *     1   when h = nothing
 *     p = details.find((a) => string(asset id) = account id).positions.find((x) => one holding spelling(ticker) = h)
 *     quote = facts of(record, account id, h).price quote (or price quote when missing)
 *     the answer = unit price factor({ ...(p ?? { ticker: h, lots: [] }), ...(quote ? { price quote: quote } : {}) } as position)
 *
 * Called by ... MK-NW-F-371 transactionOf
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-NW-F-371 transactionOf · MK-NW-F-372 transactionsReadOut
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-369
 * Changed ..... not in git yet (—)
 */
function quotedFactor(record: readonly AssetRow[], accountId: string, h: string | null, details: readonly AssetAccount[]): number {
  if (h == null) return 1;
  const p = details.find((a) => String(a.asset_id) === accountId)?.positions?.find((x) => oneHoldingSpelling(x.ticker) === h);
  const quote = factsOf(record, accountId, h).price_quote ?? p?.price_quote;
  return unitPriceFactor({ ...(p ?? { ticker: h, lots: [] }), ...(quote ? { price_quote: quote } : {}) } as Position);
}

/** The key a row began with: a correction names the row it replaces, and the first key along that line is the event's. */
/* ─ MK-NW-F-370 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rootRef
 *
 * Answers ..... The key a row began with: a correction names the row it replaces, and the first key along that line is the event's.
 *
 * Formula .....
 *     chain = [r]
 *     the answer = [...chain].reverse().find((x) => ref).ref (or '' when missing)
 *
 * Called by ... MK-NW-F-371 transactionOf
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-NW-F-371 transactionOf · MK-NW-F-372 transactionsReadOut
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-370
 * Changed ..... not in git yet (—)
 */
function rootRef(record: readonly AssetRow[], r: AssetRow): string {
  const chain: AssetRow[] = [r];
  for (let x: AssetRow | undefined = r; x?.replacesRowId;) { x = record.find((y) => y.rowId === x!.replacesRowId); if (!x || chain.includes(x)) break; chain.push(x); }
  return [...chain].reverse().find((x) => x.ref)?.ref ?? '';
}

/** One row of the record as one old activity record. Null for a row the old activity list never held. */
/* ─ MK-NW-F-371 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * transactionOf
 *
 * Answers ..... One row of the record as one old activity record.
 *
 * Formula .....
 *     nothing   when kind = 'ADJUSTMENT' (or kind = 'VALUE' and !ref.starts with('typed − txn:') when missing or zero)
 *     nothing   when kind = 'PURCHASE' and (facts as any).behind sale before record
 *     nothing   when kind = 'PURCHASE' and source = 'linked' and still held on ≠ nothing
 *     ref = root ref(record, r)
 *     nothing   when kind = 'PURCHASE' and ref.ends with(':reinvested')
 *     txn id = ref.slice('typed − txn:'.length)   if ref.starts with('typed − txn:')
 *     nothing   otherwise
 *     lot id = new reg exp(`^typed − lot:${account id.replace( ÷ [. × +?^${}()|[\]\\] ÷ g, '\\$&')}:(.+)$`).exec(ref).[1] (or nothing when missing)
 *     per = per contract of(record, account id, holding, details)
 *     extra = {}
 *     the answer = t
 *
 * Called by ... MK-NW-F-372 transactionsReadOut
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-NW-F-372 transactionsReadOut · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-371
 * Changed ..... not in git yet (—)
 */
function transactionOf(record: readonly AssetRow[], r: AssetRow, accountId: string, details: readonly AssetAccount[]): Transaction | null {
  if (r.kind === 'ADJUSTMENT' || r.kind === 'VALUE' && !r.ref?.startsWith('typed-txn:')) return null;   // shown only / a value
  if (r.kind === 'PURCHASE' && (r.facts as any)?.behindSaleBeforeRecord) return null;                    // saved by the move only
  // a broker's list of what is held is not activity: the old activity list never held its tax lots (a file's lots are its
  // first entries, OPENING_POSITION, as the import writes them)
  if (r.kind === 'PURCHASE' && r.source === 'linked' && r.stillHeldOn != null) return null;
  const ref = rootRef(record, r);
  if (r.kind === 'PURCHASE' && ref.endsWith(':reinvested')) return null;   // a reinvested income's purchase: the income is the activity
  const txnId = ref.startsWith('typed-txn:') ? ref.slice('typed-txn:'.length) : null;
  const lotId = new RegExp(`^typed-lot:${accountId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(.+)$`).exec(ref)?.[1] ?? null;
  // A TAX LOT THE ACCOUNT HOLDER TYPED is listed as it now stands: its first entry is rewritten when the lot is edited (workplan
  // #293, "one record, never two"; switch gap, 2026-11-13: 10 VTI edited to 12 read a first entry of 10 beside the 12 held)
  if (lotId != null && r.kind === 'PURCHASE') { const now = rowsInForce(record).find((x) => x.rowId === r.rowId); if (now) r = { ...r, date: now.date, shares: now.shares, price: now.price, amount: now.amount }; }
  const per = perContractOf(record, accountId, r.holding, details);
  let type: TxnType;
  const extra: Partial<Transaction> = {};
  switch (r.kind) {
    case 'PURCHASE': type = lotId != null || (r.source === 'file' && txnId == null) ? 'OPENING_POSITION' : 'BUY'; if (lotId) extra.lot_id = lotId; break;
    case 'SALE':
      if (/expir/i.test(r.word ?? '')) { type = 'ADJUSTMENT'; extra.unclassified_word = r.word; } else type = 'SELL';
      break;
    case 'DIVIDEND': case 'INTEREST': case 'DEPOSIT': case 'WITHDRAWAL': case 'FEE': type = r.kind; break;
    case 'TRANSFER':
      if (r.holding == null) { type = 'TRANSFER'; if (r.toAccountId) extra.counter_account_id = r.toAccountId; }
      else { type = 'TRANSFER_IN_KIND'; extra.direction = r.arrives ? 'IN' : 'OUT'; if (r.toAccountId) extra.counter_account_id = r.toAccountId; }
      break;
    case 'VALUE': type = 'OPENING_CASH'; break;
    default:
      // a broker's reversal reads as the kind it reverses, with the way the money went, as the sync saved it
      if (r.kind === 'OTHER' && r.reversalOf != null && r.direction != null) { type = r.reversalOf; extra.direction = r.direction; break; }
      type = 'ADJUSTMENT'; if (r.word) extra.unclassified_word = r.word;
  }
  const t: Transaction = {
    id: txnId ?? `rec:${r.rowId}`, date: r.date ?? '', type, account_id: accountId, ...extra,
    ...(r.holding != null && r.kind !== 'VALUE' ? { ticker: r.holding } : {}),
    ...(r.shares != null ? { shares: r.shares / per } : {}),
    // a tax lot's first entry carries its price as quoted — a bond per $100 of face — as the lot does
    ...(r.price != null ? { price: type === 'OPENING_POSITION' ? r.price / quotedFactor(record, accountId, r.holding, details) : r.price } : {}),
    ...(r.amount != null ? { amount: r.amount } : {}),
    ...(r.fee != null ? { fee: r.fee } : {}),
    ...(per > 1 && (r.kind === 'PURCHASE' || r.kind === 'SALE') ? { multiplier: per } : {}),
    ...(r.word && type !== 'ADJUSTMENT' ? { note: r.word } : {}),
    source: r.source === 'linked' ? 'connected' : 'manual',
    created_at: r.writtenAt,
    record_row: r.rowId,
  };
  return t;
}

/** THE ACTIVITY LIST, READ OUT: every account's activity on record as the old records, newest first. An account the record
 *  holds nothing for yet (not moved, a linked account not yet updated) keeps its old activity as it stands (plan R1, R2). */
/* ─ MK-NW-F-372 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * transactionsReadOut
 *
 * Answers ..... THE ACTIVITY LIST, READ OUT: every account's activity on record as the old records, newest first.
 *
 * Formula .....
 *     ids = [...new set(record.map((r) => account id))]
 *     on record = a list with no repeats of [...ids, ...record.map((r) => to account id).filter((x): x is string => x ≠ nothing)]
 *     out = old activity where !on record.has(string(account id))
 *     t = transaction of(record, r, id, details)
 *     t = transaction of(record, r, id, details)
 *     at = row position(record)
 *     place of = (t: transaction) => ((t as any).record row ≠ nothing ? at(string((t as any).record row)) : -1)
 *     the answer = for each of out: { each, i }for each of .sort((x, y) => (t.date < t.date ? 1 : t.date > t.date ? -1 : place of(t) − place of(t) or i − i)): t
 *
 * Called by ... MK-NW-F-376 readOuts · MK-NW-F-382 explainedDifference
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-382 explainedDifference · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-009 transaction date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-372
 * Changed ..... not in git yet (—)
 */
export function transactionsReadOut(record: readonly AssetRow[], details: readonly AssetAccount[] = [], oldActivity: readonly Transaction[] = []): Transaction[] {
  const ids = [...new Set(record.map((r) => r.accountId))];
  const onRecord = new Set([...ids, ...record.map((r) => r.toAccountId).filter((x): x is string => x != null)]);
  const out: Transaction[] = oldActivity.filter((t) => !onRecord.has(String(t.account_id)));
  for (const id of ids) {
    for (const r of activityOf(record, id)) {
      if (r.accountId !== id) continue;   // a transfer is listed once, under the account it left
      const t = transactionOf(record, r, id, details);
      if (t) out.push(t);
    }
    // a cash figure the account holder recorded as an opening record is a value row carrying that record's key
    for (const r of rowsInForce(record).filter((x) => x.accountId === id && x.kind === 'VALUE' && x.holding == null && x.ref?.startsWith('typed-txn:'))) {
      const t = transactionOf(record, r, id, details);
      if (t) out.push(t);
    }
  }
  // newest first, as the activity list has always held it: by date, and on one date the record saved last first (switch
  // gap, 2026-11-13: an opening cash record saved after a deposit on the same day was listed under it, so the delete of a
  // legacy opening record was read as the delete of the deposit and went through)
  const at = rowPosition(record);
  const placeOf = (t: Transaction) => ((t as any).record_row != null ? at(String((t as any).record_row)) : -1);
  return out.map((t, i) => ({ t, i })).sort((x, y) => (x.t.date < y.t.date ? 1 : x.t.date > y.t.date ? -1 : placeOf(y.t) - placeOf(x.t) || x.i - y.i)).map(({ t }) => t);
}

/** One account's values on one day as the old daily record held them; null where a holding's worth is not known. */
/* ─ MK-NW-F-373 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * snapshotOf
 *
 * Answers ..... One account's values on one day as the old daily record held them; null where a holding's worth is not known.
 *
 * Formula .....
 *     nothing   when holdings.some((h) => value = nothing)
 *
 * Called by ... MK-NW-F-374 daysReadOut
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-374 daysReadOut · MK-XS-F-324 holdTheSwitch
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-376 readOuts
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *     · If cash is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-373
 * Changed ..... not in git yet (—)
 */
function snapshotOf(b: ValueBatch, day: string): { holdings: HoldingSnapshot[]; account: AccountSnapshot } | null {
  if (b.holdings.some((h) => h.value == null)) return null;   // an account a day cannot value is left off it
  return {
    holdings: b.holdings.map((h) => ({ date: day, accountId: b.accountId, securityKey: h.holding, symbol: h.holding, units: h.shares ?? 0, price: h.price, value: h.value as number, currency: 'USD' })),
    account: { date: day, accountId: b.accountId, cash: b.cash ?? 0, statedTotal: b.statedTotal, typedValue: b.typedValue, currency: 'USD' },
  };
}

/** THE DAILY VALUES, READ OUT: one whole-household day for every date the record holds a dated value, each account at its
 *  latest value on or before that day (plan R6). The days before the record began wait for his ruling (R5). */
/* ─ MK-NW-F-374 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * daysReadOut
 *
 * Answers ..... THE DAILY VALUES, READ OUT: one whole-household day for every date the record holds a dated value, each account at its latest value on or before that day (plan R6).
 *
 * Formula .....
 *     ids = account ids where !removed on record(record, each)
 *     dated = new map<string, string[]>()
 *     days = [...new set([...dated.values()].flat())], in order
 *     out = []
 *     holdings = [], accounts: account snapshot[] = []
 *     written at = ''
 *     on = dated.get(id) (or none when missing) where each ≤ day.pop()
 *     b = values on(record, id, on)
 *     s = snapshot of(b, day)   if b
 *     nothing   otherwise
 *     the answer = prune days(out, today)
 *
 * Called by ... MK-NW-F-376 readOuts
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-374
 * Changed ..... not in git yet (—)
 */
export function daysReadOut(record: readonly AssetRow[], accountIds: readonly string[], today: string): SnapshotDay[] {
  const ids = accountIds.filter((id) => !removedOnRecord(record, id));
  const dated = new Map<string, string[]>();   // account → its dated days, ascending
  for (const id of ids) dated.set(id, [...new Set(valueBatchesOf(record, id).map((b) => b.date).filter((d): d is string => d != null))].sort());
  const days = [...new Set([...dated.values()].flat())].sort();
  const out: SnapshotDay[] = [];
  for (const day of days) {
    const holdings: HoldingSnapshot[] = [], accounts: AccountSnapshot[] = [];
    let writtenAt = '';
    for (const id of ids) {
      const on = (dated.get(id) ?? []).filter((d) => d <= day).pop();
      if (!on) continue;
      const b = valuesOn(record, id, on);
      const s = b ? snapshotOf(b, day) : null;
      if (!s) continue;
      holdings.push(...s.holdings); accounts.push(s.account);
      if (b!.writtenAt > writtenAt) writtenAt = b!.writtenAt;
    }
    if (accounts.length) out.push({ date: day, holdings, accounts, origin: 'observed', writtenAt });
  }
  return pruneDays(out, today);
}

/** CASH AND INVESTMENTS EACH DAY, READ OUT of the days above: the accounts that are not property or a car, added up. */
/* ─ MK-NW-F-375 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * invDailyReadOut
 *
 * Answers ..... CASH AND INVESTMENTS EACH DAY, READ OUT of the days above: the accounts that are not property or a car, added up.
 *
 * Formula .....
 *     investable = a list with no repeats of accounts where !is real asset(each)for each of : string(asset id)
 *     out = {}
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-376 readOuts · MK-NW-F-385 screensReadTheRecord
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-375
 * Changed ..... not in git yet (—)
 */
export function invDailyReadOut(days: readonly SnapshotDay[], accounts: readonly AssetAccount[]): Record<string, number> {
  const investable = new Set(accounts.filter((a) => !isRealAsset(a)).map((a) => String(a.asset_id)));
  const out: Record<string, number> = {};
  for (const d of days) out[d.date] = [...accountValuesOn(d, (id) => investable.has(id)).values()].reduce((t, v) => t + v, 0);
  return out;
}

/** Everything read out at once. nwDaily is not here: its debts part waits for his ruling (plan R7). */
export interface ReadOuts {
  assetAccounts: AssetAccount[];
  transactions: Transaction[];
  snapshotDays: SnapshotDay[];
  invDaily: Record<string, number>;
}

/** A LINKED ACCOUNT WAITING FOR ITS BROKER is read from the phone's copy until the broker's first update reaches the record
 *  (switch gap, 2026-11-13: E*TRADE linked, $52,704 with $4,000 cash on the phone and nothing from the broker on the
 *  record yet; a $500 deposit typed on its page put it on the record, and it read $500 cash — the $4,000 and its dividends
 *  were gone). Its typed rows stay on the record and are read with the broker's, once the broker's first update is in. */
/* ─ MK-NW-F-422 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * readableRecord
 *
 * Answers ..... A LINKED ACCOUNT WAITING FOR ITS BROKER is read from the phone's copy until the broker's first update reaches the record (switch gap, 2026-11-13: E*TRADE linked, $52,704 with $4,000 cash on the phone and nothing from the broker on the record yet; a $500 deposit typed on its page put it on the record, and it read $500 cash — the $4,000 and its dividends were gone).
 *
 * Formula .....
 *     linked = a list with no repeats of details where source = 'connected'for each of : string(asset id)
 *     record   when linked.size is missing
 *     heard = a list with no repeats of record where source = 'linked'for each of : account id
 *     waiting = a list with no repeats of [...linked] where !heard.has(each)
 *     record   when waiting.size is missing
 *     the answer = r
 *
 * Called by ... MK-NW-F-376 readOuts · MK-NW-F-385 screensReadTheRecord
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-376 readOuts · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-422
 * Changed ..... not in git yet (—)
 */
export function readableRecord(record: readonly AssetRow[], details: readonly AssetAccount[]): readonly AssetRow[] {
  const linked = new Set(details.filter((a) => a.source === 'connected').map((a) => String(a.asset_id)));
  if (!linked.size) return record;
  const heard = new Set(record.filter((r) => r.source === 'linked').map((r) => r.accountId));
  const waiting = new Set([...linked].filter((id) => !heard.has(id)));
  if (!waiting.size) return record;
  // money moved between another account and one waiting is read on the other account's side only, as money that left it
  // or arrived in it (the phone's copy of the waiting account already counts its side)
  return record.filter((r) => !waiting.has(r.accountId) || (r.kind === 'TRANSFER' && r.toAccountId != null && !waiting.has(r.toAccountId)))
    .map((r) => {
      if (r.toAccountId != null && waiting.has(r.toAccountId)) { const { toAccountId: _w, ...rest } = r; return rest as AssetRow; }
      if (waiting.has(r.accountId)) { const { toAccountId, ...rest } = r; return { ...rest, accountId: toAccountId as string, arrives: true } as AssetRow; }
      return r;
    });
}
/** ALL THE READ-OUTS for one store state: the accounts, the activity, the days and the daily cash-and-investments total. */
/* ─ MK-NW-F-376 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * readOuts
 *
 * Answers ..... ALL THE READ-OUTS for one store state: the accounts, the activity, the days and the daily cash-and-investments total.
 *
 * Formula .....
 *     details = asset accounts (or [], record = readable record(asset record ?? [], details) when missing)
 *     asset accounts = accounts read out(record, details, price cache ?? {})
 *     snapshot days = days read out(record, details.map((a) => string(asset id)), today)
 *     the answer:
 *     asset accounts = asset accounts
 *     transactions = transactions read out(record, details, transactions ?? [])
 *     snapshot days = snapshot days
 *     inv daily = inv daily read out(snapshot days, asset accounts)
 *
 * Called by ... MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-XS-F-318 readOutsInShadow
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-376
 * Changed ..... not in git yet (—)
 */
export function readOuts(s: { assetRecord?: readonly AssetRow[]; assetAccounts?: readonly AssetAccount[]; transactions?: readonly Transaction[]; priceCache?: Record<string, PriceSeries> }, today: string): ReadOuts {
  const details = s.assetAccounts ?? [], record = readableRecord(s.assetRecord ?? [], details);
  const assetAccounts = accountsReadOut(record, details, s.priceCache ?? {});
  const snapshotDays = daysReadOut(record, details.map((a) => String(a.asset_id)), today);
  return { assetAccounts, transactions: transactionsReadOut(record, details, s.transactions ?? []), snapshotDays, invDaily: invDailyReadOut(snapshotDays, assetAccounts) };
}

// ── the round trip: a read-out beside the old copy ──────────────────────────────────────────────────────────────────

/** One difference between a read-out and the old copy it stands in for. */
export interface ReadOutDifference {
  accountId: string;
  holding: string | null;
  what: 'balance' | 'value date' | 'cash' | 'shares' | 'paid' | 'purchase dates' | 'holding only in the old copy' | 'holding only in the read-out'
    | 'account only in the old copy' | 'activity only in the old copy' | 'activity only in the read-out';
  old: string | number | null;
  readOut: string | number | null;
}

/** True where two amounts are within half a cent of each other, or both are missing. */
/* ─ MK-NW-F-377 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * near
 *
 * Answers ..... True where two amounts are within half a cent of each other, or both are missing.
 *
 * Formula .....
 *     x = nothing and y = nothing   if x = nothing (or y = nothing when missing or zero)
 *     size of(x − y) ≤ 0.005   otherwise
 *
 * Called by ... MK-NW-F-238 sortArriving · MK-NW-F-381 readOutDifferences
 *               MK-PL-F-030 onCourseSentence
 *
 * Reaches ..... 691 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 673 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-377
 * Changed ..... not in git yet (—)
 */
const near = (x: number | null | undefined, y: number | null | undefined) => (x == null || y == null ? x == null && y == null : Math.abs(x - y) <= 0.005);
/** The day part (year-month-day) of a date, or (none) when there is no date. */
/* ─ MK-NW-F-378 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * day
 *
 * Answers ..... The day part (year-month-day) of a date, or (none) when there is no date.
 *
 * Formula .....
 *     the first 10 of string(v)   if v
 *     '(none)'   otherwise
 *
 * Called by ... MK-CF-F-014 budgetVsActual · MK-CF-F-018 equityByMonth
 *               MK-CF-F-109 reviewTransactions · MK-CF-F-110 flagComparisonText
 *               MK-CF-F-122 addDays · MK-CF-F-124 nextOccurrence
 *               MK-CF-F-160 daysBetweenDates · MK-CF-F-182 asPercent
 *               MK-CF-F-204 line · MK-CF-F-242 workedLineAmount
 *               MK-CF-O-005 theContributionRoom · MK-NW-F-046 historyCoverage
 *               MK-NW-F-056 bondInfo · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-088 BENCH · MK-NW-F-090 windowStartKey
 *               MK-NW-F-103 investmentRecordDates · MK-NW-F-104 closedWith
 *               MK-NW-F-105 whyNoReturn · MK-NW-F-119 estimatedAccrued
 *               MK-NW-F-124 maturityParts · MK-NW-F-148 lastCloseLabel
 *               MK-NW-F-193 eventRow · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-204 lastGivenBy · MK-NW-F-205 priceFeedValues
 *               MK-NW-F-224 typedChangeToRecord · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-238 sortArriving · MK-NW-F-243 theLater
 *               MK-NW-F-246 valuesOn · MK-NW-F-250 statedTotalGap
 *               MK-NW-F-251 oldestLotFirst · MK-NW-F-252 walkHolding
 *               MK-NW-F-253 openPurchases · MK-NW-F-257 typedSalesTheListContradicts
 *               MK-NW-F-261 saleGain · MK-NW-F-266 listAnswered
 *               MK-NW-F-270 sameEventElsewhere · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-275 besideTheList · MK-NW-F-276 replacedPurchase
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-281 correctRow
 *               MK-NW-F-284 activityOf · MK-NW-F-287 splitOf
 *               MK-NW-F-294 removalKept · MK-NW-F-338 newerListUndoes
 *               MK-NW-F-344 staleStartSentences · MK-NW-F-350 rowPosition
 *               MK-NW-F-357 staleStartSentence · MK-NW-F-361 valueToday
 *               MK-NW-F-362 heldOnRecord · MK-NW-F-373 snapshotOf
 *               MK-NW-F-374 daysReadOut · MK-NW-F-377 near
 *               MK-NW-F-379 lotsSummary · MK-NW-F-380 oldActivityWords
 *               MK-NW-F-382 explainedDifference · MK-NW-F-385 screensReadTheRecord
 *               MK-NW-F-390 priceShown · MK-NW-F-400 choiceMakes
 *               MK-NW-F-405 confirmChangeQuestion · MK-NW-F-407 enteredOverGiven
 *               MK-NW-F-409 answersShown · MK-NW-F-414 saleNotKnownWords
 *               MK-NW-F-415 confirmForSavedLots · MK-NW-O-006 theHolding
 *               MK-NW-O-008 thePerformance · MK-PF-F-005 unrealizedGain
 *               MK-PF-F-006 capGains · MK-PF-F-011 periodReturnSince
 *               MK-PF-F-014 buildPerformance · MK-PF-F-029 closeAsOf
 *               MK-PF-F-036 monthsBefore · MK-PF-F-037 dayBefore
 *               MK-PF-F-039 periodReturnParts · MK-PF-F-045 priceHistoryShortSentence
 *               MK-PF-F-052 purchaseDateOnRecord · MK-PF-F-055 valueAtClose
 *               MK-PF-F-056 purchasePieces · MK-PF-F-059 dayBeforeDay
 *               MK-PF-F-060 closeDayOnOrBefore · MK-PF-F-061 firstClose
 *               MK-PF-F-064 purchasesHeld · MK-PF-F-067 purchaseDays
 *               MK-PF-F-071 returnSplitAtPurchases · MK-PF-F-072 tradesAfter
 *               MK-PF-F-073 sharesThroughWindow · MK-PF-F-074 marketSplitAtPurchases
 *               MK-PF-F-076 firstEvent · MK-PF-F-080 recordedBuysExplain
 *               MK-PF-F-085 statedCdRate · MK-PF-F-086 staleStartClose
 *               MK-PF-F-088 valuedByYouWords · MK-PF-F-089 closeAsOfInside
 *               MK-PL-F-089 drawAssumptionsSaid · MK-PL-F-096 accountsAfterRothConversion
 *               MK-ST-F-030 record · MK-ST-F-031 valueOn
 *               MK-ST-F-065 isoLocalDate · MK-ST-F-072 undo
 *               MK-ST-F-075 agoLabel · MK-ST-F-078 dateShown
 *               MK-ST-F-081 timeWeightedReturn · MK-ST-F-083 accountValuesOn
 *               MK-ST-F-095 monthYearShown · MK-ST-F-097 localMoment
 *               MK-XS-F-004 buildDatedGrid · MK-XS-F-187 fixStoredMoney
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-321 valueAsTheDaysTakeIt
 *
 * Reaches ..... 729 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-081 LB
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               … and 711 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-378
 * Changed ..... not in git yet (—)
 */
const day = (v: unknown): string => (v ? String(v).slice(0, 10) : '(none)');

/** What a holding's lots hold: shares, what was paid (null where a lot has no cost), and the purchase dates. */
/* ─ MK-NW-F-379 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * lotsSummary
 *
 * Answers ..... What a holding's lots hold: shares, what was paid (null where a lot has no cost), and the purchase dates.
 *
 * Formula .....
 *     lots = lots (or none when missing) where (number(shares) or 0) > 0
 *     per = contract multiplier(p as any)   if kind = 'options'
 *     contract multiplier(p as any)   if 1, cost per = p and kind ! = 'options'
 *     1   otherwise   otherwise
 *
 * Called by ... MK-NW-F-381 readOutDifferences
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-381 readOutDifferences · MK-XS-F-318 readOutsInShadow
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-379
 * Changed ..... not in git yet (—)
 */
function lotsSummary(p: Position | undefined): { shares: number; paid: number | null; dates: string } {
  const lots = (p?.lots ?? []).filter((l) => (Number(l.shares) || 0) > 0);
  const per = p?.kind === 'options' ? contractMultiplier(p as any) : 1, costPer = p && p.kind !== 'options' ? contractMultiplier(p as any) : 1;
  return {
    shares: lots.reduce((t, l) => t + Number(l.shares) * per, 0),
    paid: lots.some((l) => l.cost_per_share == null) ? null : lots.reduce((t, l) => t + Number(l.shares) * Number(l.cost_per_share) * per * costPer, 0),
    dates: lots.map((l) => day(l.purchase_date)).sort().join(', '),
  };
}

/** The words an activity record is compared by: kind, account, holding, day, shares, price and size (ids and order aside). */
const TRADES: ReadonlySet<string> = new Set(['BUY', 'SELL', 'OPENING_POSITION']);
/** The words one activity record is compared by: its kind, account, holding, day, shares, price and, where shares times price does not already give it, its size. */
/* ─ MK-NW-F-380 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * oldActivityWords
 *
 * Answers ..... The words one activity record is compared by: its kind, account, holding, day, shares, price and, where shares times price does not already give it, its size.
 *
 * Formula .....
 *     [type, account id, one holding spelling(ticker ?? nothing) ?? '', day(date),
 *
 * Called by ... MK-NW-F-381 readOutDifferences · MK-NW-F-383 keepActivityIds
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-NW-F-383 keepActivityIds
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-381 readOutDifferences
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-322 savedTogether
 *               MK-XS-F-317 screensFromTheRecord · MK-NW-F-385 screensReadTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *
 * Decides .....
 *     · Shows 6 decimal places.
 *     · Shows 2 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-380
 * Changed ..... not in git yet (—)
 */
const oldActivityWords = (t: Transaction): string => [t.type, t.account_id, oneHoldingSpelling(t.ticker ?? null) ?? '', day(t.date),
  t.shares == null ? '' : Math.abs(t.shares).toFixed(6), t.price == null ? '' : t.price.toFixed(6),
  // a trade's size is its shares times its price; whether a record also wrote it down says nothing more
  t.amount == null || (TRADES.has(t.type) && t.shares != null && t.price != null) ? '' : Math.abs(t.amount).toFixed(2)].join('|');

/** THE ROUND TRIP: every account's balance, value date, cash and holdings, and the activity, read out beside the old copies. */
/* ─ MK-NW-F-381 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * readOutDifferences
 *
 * Answers ..... THE ROUND TRIP: every account's balance, value date, cash and holdings, and the activity, read out beside the old copies.
 *
 * Formula .....
 *     differences = []
 *     holdings = 0
 *     id = string(asset id)
 *     push = (holding: string | nothing, what: read out difference['what'], o: any, r: any) => differences.push({ account id: id, holding, what, old: o, read out: r })
 *     r = read.asset accounts.find((x) => string(asset id) = id)
 *     by h = (ps: readonly position[] | undefined) => a lookup of for each of ps (or none when missing): [one holding spelling(ticker) as string, each]
 *     old h = by h(positions), read h = by h(positions)
 *     o = lots summary(old h.get(h)), x = lots summary(read h.get(h))
 *     old t = old.transactions (or none when missing)
 *     left = new map<string, number>()
 *     k = old activity words(t)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-192 typedValueDatedBack · MK-XS-F-318 readOutsInShadow
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-033 the date a hand-typed value was set
 *
 * Decides .....
 *     · Uses a built-in holdings of 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-381
 * Changed ..... not in git yet (—)
 */
export function readOutDifferences(read: Pick<ReadOuts, 'assetAccounts' | 'transactions'>, old: { assetAccounts: readonly AssetAccount[]; transactions?: readonly Transaction[] }):
  { differences: ReadOutDifference[]; looked: { accounts: number; holdings: number; activity: number } } {
  const differences: ReadOutDifference[] = [];
  let holdings = 0;
  for (const a of old.assetAccounts) {
    const id = String(a.asset_id);
    const push = (holding: string | null, what: ReadOutDifference['what'], o: any, r: any) => differences.push({ accountId: id, holding, what, old: o, readOut: r });
    const r = read.assetAccounts.find((x) => String(x.asset_id) === id);
    if (!r) { push(null, 'account only in the old copy', a.balance ?? null, null); continue; }
    if (!near(typeof a.balance === 'number' ? a.balance : null, typeof r.balance === 'number' ? r.balance : null)) push(null, 'balance', a.balance ?? null, r.balance ?? null);
    if ((a.value_as_of ?? null) !== (r.value_as_of ?? null)) push(null, 'value date', a.value_as_of ?? null, r.value_as_of ?? null);
    if (!near(a.cash_balance ?? null, r.cash_balance ?? null)) push(null, 'cash', a.cash_balance ?? null, r.cash_balance ?? null);
    const byH = (ps: readonly Position[] | undefined) => new Map((ps ?? []).map((p) => [oneHoldingSpelling(p.ticker) as string, p]));
    const oldH = byH(a.positions), readH = byH(r.positions);
    for (const h of new Set([...oldH.keys(), ...readH.keys()])) {
      holdings++;
      const o = lotsSummary(oldH.get(h)), x = lotsSummary(readH.get(h));
      if (!readH.has(h)) { if (o.shares > EPS) push(h, 'holding only in the old copy', o.shares, null); continue; }
      if (!oldH.has(h)) { if (x.shares > EPS) push(h, 'holding only in the read-out', null, x.shares); continue; }
      if (Math.abs(o.shares - x.shares) > 1e-6) push(h, 'shares', o.shares, x.shares);
      if (!near(o.paid, x.paid)) push(h, 'paid', o.paid, x.paid);
      if (o.dates !== x.dates) push(h, 'purchase dates', o.dates, x.dates);
    }
  }
  const oldT = old.transactions ?? [];
  if (old.transactions) {
    const left = new Map<string, number>();
    for (const t of read.transactions) left.set(oldActivityWords(t), (left.get(oldActivityWords(t)) ?? 0) + 1);
    for (const t of oldT) {
      const k = oldActivityWords(t);
      if ((left.get(k) ?? 0) > 0) left.set(k, (left.get(k) as number) - 1);
      else differences.push({ accountId: String(t.account_id), holding: oneHoldingSpelling(t.ticker ?? null), what: 'activity only in the old copy', old: k, readOut: null });
    }
    for (const [k, n] of left) for (let i = 0; i < n; i++) differences.push({ accountId: k.split('|')[1], holding: k.split('|')[2] || null, what: 'activity only in the read-out', old: null, readOut: k });
  }
  return { differences, looked: { accounts: old.assetAccounts.length, holdings, activity: oldT.length } };
}

/** THE DIFFERENCES ALREADY EXPLAINED, each by its reason; a difference with no reason here is a fault. */
/* ─ MK-NW-F-382 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * explainedDifference
 *
 * Answers ..... THE DIFFERENCES ALREADY EXPLAINED, each by its reason; a difference with no reason here is a fault.
 *
 * Formula .....
 *     a = old.asset accounts.find((x) => string(asset id) = account id)
 *     src = (source ?? 'manual') as string
 *     'the old copy dates the value by the day of the sync or import; the record by the broker’s or the file’s own day'   when what = 'value date' and (src = 'connected' or src = 'imported')
 *     'the old copy of a linked account holds no cash figure; the broker’s update states one'   when what = 'cash' and old = nothing and src = 'connected'
 *     asking = object.entries(questions).some(([k, q]) => split('#')[0] = account id and (events.length ?? 0) > 0)
 *     'the old copy took the broker’s purchase date over the typed one; the record keeps the typed date and asks'   when what = 'purchase dates' and asking
 *     'the broker’s event that differs from the typed one is asked, and saved only once answered'   when what = 'activity only in the old copy' and asking and ÷ ^(BUY|SELL)\| ÷ .test(string(old))
 *     'the old copy raised the balance with no activity record; the record holds the money moved as a deposit'   when what = 'activity only in the read − out' and read out ≠ nothing and string(read out).starts with('DEPOSIT|')
 *     p = positions.find((x) => one holding spelling(ticker) = h)
 *     per = contract multiplier(p as any)   if kind = 'options'
 *     1   otherwise
 *     'the old copy held the tax lot with no first entry in its activity; the record holds the lot as its purchase'   when lots.some((l) => day(purchase date) = when and math.abs(number(shares) − number(shares)) ≤ 1e − 6 ÷ per)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-192 typedValueDatedBack · MK-XS-F-318 readOutsInShadow
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-318 readOutsInShadow · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If length is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-382
 * Changed ..... not in git yet (—)
 */
export function explainedDifference(d: ReadOutDifference, old: { assetAccounts: readonly AssetAccount[] }, questions: Record<string, { events?: unknown[] }> = {}, record: readonly AssetRow[] = []): string | null {
  const a = old.assetAccounts.find((x) => String(x.asset_id) === d.accountId);
  const src = (a?.source ?? 'manual') as string;
  // the old copy dates a linked account by the day it synced, an imported one by the day of the import where the file
  // gave none; the record keeps the broker's or the file's own day, or none (his ruling, 2026-11-10)
  if (d.what === 'value date' && (src === 'connected' || src === 'imported')) return 'the old copy dates the value by the day of the sync or import; the record by the broker’s or the file’s own day';
  // a linked account the old copy holds with no cash figure: the broker's update always states its cash, and the record keeps it
  if (d.what === 'cash' && d.old == null && src === 'connected') return 'the old copy of a linked account holds no cash figure; the broker’s update states one';
  // a broker update wiped a purchase date the account holder typed in the old copy; the record keeps it and asks
  const asking = Object.entries(questions).some(([k, q]) => k.split('#')[0] === d.accountId && (q.events?.length ?? 0) > 0);
  if (d.what === 'purchase dates' && asking) return 'the old copy took the broker’s purchase date over the typed one; the record keeps the typed date and asks';
  // the broker's own purchase that differs from one the account holder typed waits for the answer before it is saved
  if (d.what === 'activity only in the old copy' && asking && /^(BUY|SELL)\|/.test(String(d.old))) return 'the broker’s event that differs from the typed one is asked, and saved only once answered';
  // savings moved into an account raised the old balance with no activity record; the record holds it as a deposit
  if (d.what === 'activity only in the read-out' && d.readOut != null && String(d.readOut).startsWith('DEPOSIT|')) return 'the old copy raised the balance with no activity record; the record holds the money moved as a deposit';
  // a tax lot the old copy held with no first entry in its activity: the record holds the lot as its purchase
  if (d.what === 'activity only in the read-out' && /^OPENING_POSITION\|/.test(String(d.readOut))) {
    const [, , h, when, shares] = String(d.readOut).split('|');
    const p = a?.positions?.find((x) => oneHoldingSpelling(x.ticker) === h);
    const per = p?.kind === 'options' ? contractMultiplier(p as any) : 1;
    if (p?.lots?.some((l) => day(l.purchase_date) === when && Math.abs(Number(l.shares) - Number(shares)) <= 1e-6 / per)) return 'the old copy held the tax lot with no first entry in its activity; the record holds the lot as its purchase';
  }
  const trade = (d.what === 'activity only in the old copy' || d.what === 'activity only in the read-out') && /^(BUY|OPENING_POSITION)\|/.test(String(d.old ?? d.readOut));
  // the one-time move saves each tax lot as held today, and a sale behind it, never the buy it came from (DEC-10749)
  if (trade && record.some((r) => r.kind === 'FACT' && r.accountId === d.accountId && r.ref === `moved-from-phone:${d.accountId}`)) return 'the one-time move saves each tax lot as held today, not the buy it came from (DEC-10749)';
  // the account holder corrected a purchase in the holding editor: the old activity record kept its first figures
  if (trade && rowsInForce(record).some((r) => r.kind === 'PURCHASE' && r.accountId === d.accountId && r.holding === d.holding && r.source === 'typed' && (r.changed?.length ?? 0) > 0)) return 'the account holder corrected the purchase; the old activity record kept its first figures';
  return null;
}

// ── PHASE 3, STAGES 3–5 (2026-11-12): THE SCREENS READ THE RECORD ───────────────────────────────────────────────────────
// After every save the old copies are REPLACED by their read-outs, so every screen and function that reads the accounts,
// the activity or the daily values reads the one dated record (DEC-10342: "record 1, simply pull data from row with most
// latest date and time-stamp"). What the record does not hold is kept as it stands:
//   · an account not on the record yet, and its activity, pass through unchanged (accountReadOut, transactionsReadOut);
//   · an activity record keeps its id and its own fields (a note, a category) where the read-out is the same event, so a
//     flag or a delete that names it still finds it;
//   · a day before the record's first dated value keeps its old values (the founder, 2026-11-12: there is no earlier
//     history on a new account, so nothing is invented or removed); from that day on the days are the record's, with any
//     account not on the record added from the old day as it stands.

/** THE ACTIVITY, READ OUT, KEEPING EACH OLD RECORD'S ID AND ITS OWN FIELDS where the read-out is the same event. */
/* ─ MK-NW-F-383 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * keepActivityIds
 *
 * Answers ..... THE ACTIVITY, READ OUT, KEEPING EACH OLD RECORD'S ID AND ITS OWN FIELDS where the read-out is the same event.
 *
 * Formula .....
 *     m = ...o = ...o
 *     ...t = ...t
 *     id = id
 *     the answer = m
 *     old by id = a lookup of for each of old: [string(id), each]
 *     used = new set<string>()
 *     o = old by id.get(string(id))
 *     by words = new map<string, transaction[]>()
 *     out[i] as transaction   when out[i]
 *     o = by words.get(old activity words(t)).shift()
 *     t   when o is missing
 *
 * Called by ... MK-NW-F-385 screensReadTheRecord
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-383
 * Changed ..... not in git yet (—)
 */
export function keepActivityIds(read: readonly Transaction[], old: readonly Transaction[]): Transaction[] {
  // the record's figures over the old record's; a hand-recorded record keeps saying so the way it always did (no source):
  // the read-out's 'manual' is its default, never a fact (switch gap, 2026-11-13: a deposit typed on the account page came
  // back marked 'manual', a source no hand-recorded record carried)
  const keep = (o: Transaction, t: Transaction): Transaction => {
    const m: any = { ...o, ...t, id: o.id };
    if (o.source === undefined && t.source === 'manual') delete m.source;
    // the kind keeps the word it was recorded under where the record files it with its family: a coupon is income the
    // record keeps as interest, and his activity still says Coupon (the same screen with the switch on or off, 2026-11-13)
    if (o.type === 'COUPON' && t.type === 'INTEREST') m.type = 'COUPON';
    // and the record's own bookkeeping is not added to a record of his that never carried it: the time it was written, and
    // the row a record he typed is found by (it is found by its own key)
    if (o.created_at === undefined) delete m.created_at;
    if ((o as any).record_row === undefined && String(t.id) === String(o.id)) delete m.record_row;
    return m;
  };
  const oldById = new Map(old.map((t) => [String(t.id), t]));
  const used = new Set<string>();
  const out: (Transaction | null)[] = read.map((t) => {
    const o = oldById.get(String(t.id));
    if (o && !used.has(String(o.id))) { used.add(String(o.id)); return keep(o, t); }
    return null;
  });
  const byWords = new Map<string, Transaction[]>();
  for (const o of old) if (!used.has(String(o.id))) { const k = oldActivityWords(o); byWords.set(k, [...(byWords.get(k) ?? []), o]); }
  return read.map((t, i) => {
    if (out[i]) return out[i] as Transaction;
    const o = byWords.get(oldActivityWords(t))?.shift();
    if (!o) return t;
    used.add(String(o.id));
    return keep(o, t);
  });
}

/** THE DAYS, READ OUT, beside the days kept before the record's first dated value. */
/* ─ MK-NW-F-384 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * daysWithTheRecord
 *
 * Answers ..... THE DAYS, READ OUT, beside the days kept before the record's first dated value.
 *
 * Formula .....
 *     [...old days]   when count of read days is missing
 *     first = read days[0].date
 *     old on = a lookup of for each of old days: [date, each]
 *     read on = a lookup of for each of read days: [date, each]
 *     before = old days where date < first
 *     stated on = (d: snapshot day) => exact = nothing (or accounts.some((a) => { const on = exact.get(`${account id}|${date}`); return on ≠ nothing and on ! = 'typed'; }) when missing or zero)
 *     d = read on.get(date), o = old on.get(date)
 *     o!   when d is missing
 *     d   when o is missing
 *     old ids = a list with no repeats of for each of accounts: string(account id)
 *     true   when exact = nothing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-385 screensReadTheRecord
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-NW-F-385 screensReadTheRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-031 daily and monthly snapshots
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-384
 * Changed ..... not in git yet (—)
 */
export function daysWithTheRecord(readDays: readonly SnapshotDay[], oldDays: readonly SnapshotDay[], onRecord: ReadonlySet<string>,
  exact?: ReadonlyMap<string, string>, today?: string): SnapshotDay[] {
  if (!readDays.length) return [...oldDays];
  const first = readDays[0].date;
  const oldOn = new Map(oldDays.map((d) => [d.date, d]));
  const readOn = new Map(readDays.map((d) => [d.date, d]));
  const before = oldDays.filter((d) => d.date < first);
  // EVERY DAY FROM THE RECORD'S FIRST ON (switch gap, 2026-11-13: a Treasury recorded every day from Sep 1 to Oct 19 kept
  // only the two days the record holds a value for — 47 recorded days were lost). A day the record holds no value on is
  // the day as recorded; on a day it does, an account takes the record's value where the record states one ON that day
  // (or the day recorded nothing for it), and the day as recorded otherwise — the record carries an older value forward,
  // the recorded day was captured that day
  // today's day is the daily capture's to write, from the accounts as the screens now read them
  const dates = [...new Set([...readDays.filter((d) => today == null || d.date < today || oldOn.has(d.date)).map((d) => d.date),
    ...oldDays.filter((d) => d.date >= first).map((d) => d.date)])].sort();
  // a day nobody recorded joins only on a value a broker or a file states for it: a value typed with a past date is never
  // a day before the account holder entered it (2026-10-20 — a typed $500 "as of Nov 2" first appears on the day captured)
  const statedOn = (d: SnapshotDay) => exact == null || d.accounts.some((a) => { const on = exact.get(`${a.accountId}|${d.date}`); return on != null && on !== 'typed'; });
  const from = dates.filter((date) => oldOn.has(date) || statedOn(readOn.get(date)!)).map((date) => {
    const d = readOn.get(date), o = oldOn.get(date);
    if (!d) return o!;
    if (!o) return d;
    const oldIds = new Set(o.accounts.map((a) => String(a.accountId)));
    // an account a recorded day did not hold joins it only on a value a broker or a file states for that day: a value the
    // account holder typed with a past date never puts the account on days recorded before it was entered (2026-10-20)
    const fromRead = new Set(d.accounts.map((a) => String(a.accountId)).filter((id) => {
      if (exact == null) return true;
      const on = exact.get(`${id}|${date}`);
      return oldIds.has(id) ? on != null : on != null && on !== 'typed';
    }));
    const fromOld = new Set([...oldIds].filter((id) => !fromRead.has(id)));
    // an account not on the record keeps the day as recorded (as before)
    for (const id of oldIds) if (!onRecord.has(id)) { fromOld.add(id); fromRead.delete(id); }
    // a day the record reads exactly as recorded keeps the day as recorded (its time-stamp says when it was captured)
    const key = (x: SnapshotDay, ids: ReadonlySet<string>) => JSON.stringify([
      x.accounts.filter((a) => ids.has(String(a.accountId))).map(({ date: _d, ...a }) => a).sort((p, q) => String(p.accountId).localeCompare(String(q.accountId))),
      x.holdings.filter((h) => ids.has(String(h.accountId))).map(({ date: _d, ...h }) => h).sort((p, q) => JSON.stringify(p).localeCompare(JSON.stringify(q)))]);
    if (!fromRead.size) return o;
    if ([...fromRead].every((id) => oldIds.has(id)) && key(d, fromRead) === key(o, fromRead)) return o;
    if (!fromOld.size) return d;
    return { ...d,
      accounts: [...d.accounts.filter((a) => fromRead.has(String(a.accountId))), ...o.accounts.filter((a) => fromOld.has(String(a.accountId)))],
      holdings: [...d.holdings.filter((h) => fromRead.has(String(h.accountId))), ...o.holdings.filter((h) => fromOld.has(String(h.accountId)))] };
  });
  return [...before, ...from];
}

/** What the screens read, calculated from the record for one store state; null where the record holds nothing yet. Each
 *  account and activity record that reads out the same as it stood keeps its old object, so nothing redraws for nothing. */
/* ─ MK-NW-F-385 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * screensReadTheRecord
 *
 * Answers ..... What the screens read, calculated from the record for one store state; null where the record holds nothing yet.
 *
 * Formula .....
 *     record = readable record(asset record ?? [], asset accounts ?? [])
 *     nothing   when count of record is missing
 *     read = read outs(s, today)
 *     same = <T,>(a: T, b: T) => a = b (or JSON.stringify(a) = JSON.stringify(b) when missing or zero)
 *     old a = a lookup of for each of asset accounts (or none when missing): [string(asset id), each]
 *     asset accounts = for each of read.asset accounts: const o = old get(string(asset id)); return o && same(o, each) ? o : each; = const o = old get(string(asset id)); return o && same(o, each) ? o : each;
 *     old t = transactions (or none when missing)
 *     old tby id = a lookup of for each of old t: [string(id), each]
 *     opening of = a list with no repeats of old t where type = 'OPENING_POSITION' and lot id ≠ nothingfor each of : `${account id}|${lot id}`
 *     opening for = a list with no repeats of old t where type = 'OPENING_POSITION'for each of : `${account id}|${string(ticker ?? '').trim().to upper case()}`
 *     split ids = the first -':not − matched'.length)) of a list with no repeats of kept where string(id).ends with(':not − matched')for each of : string(id)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-192 typedValueDatedBack · MK-XS-F-317 screensFromTheRecord
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-324 holdTheSwitch · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-322 savedTogether · MK-XS-F-317 screensFromTheRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-031 daily and monthly snapshots
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-385
 * Changed ..... not in git yet (—)
 */
export function screensReadTheRecord(s: { assetRecord?: readonly AssetRow[]; assetAccounts?: readonly AssetAccount[]; transactions?: readonly Transaction[];
  priceCache?: Record<string, PriceSeries>; snapshotDays?: readonly SnapshotDay[]; invDaily?: Record<string, number> }, today: string):
  { assetAccounts: AssetAccount[]; transactions: Transaction[]; snapshotDays: SnapshotDay[]; invDaily: Record<string, number> } | null {
  const record = readableRecord(s.assetRecord ?? [], s.assetAccounts ?? []);
  if (!record.length) return null;
  const read = readOuts(s, today);
  const same = <T,>(a: T, b: T) => a === b || JSON.stringify(a) === JSON.stringify(b);
  const oldA = new Map((s.assetAccounts ?? []).map((a) => [String(a.asset_id), a]));
  const assetAccounts = read.assetAccounts.map((a) => { const o = oldA.get(String(a.asset_id)); return o && same(o, a) ? o : a; });
  const oldT = s.transactions ?? [];
  const oldTById = new Map(oldT.map((t) => [String(t.id), t]));
  // A TAX LOT TYPED AS ALREADY OWNED is shown as a first entry only where the activity already held one for it (switch
  // gap, 2026-11-13: a phone set aside for its owner came back with 4 activity records where it had 3 — the read-out had
  // turned A's 100 VTI at $80, entered before first entries were logged, into a fourth). The lot is still held; only the
  // activity list is left as the account holder had it
  const openingOf = new Set(oldT.filter((t) => t.type === 'OPENING_POSITION' && t.lot_id != null).map((t) => `${t.account_id}|${t.lot_id}`));
  // …and a first entry with no lot number (a file's lot, or a lot the move saved with the file's) only where the activity held
  // a first entry for that holding (switch gap, 2026-11-13, H1: an imported 100 VTI and 20 typed on the holding as bought Sep
  // 30, with no buy recorded — the read-out listed both as first entries, the 20 read as a recorded purchase, and the holding
  // page lost DEC-7216's "A purchase of this holding has no date on record…")
  const openingFor = new Set(oldT.filter((t) => t.type === 'OPENING_POSITION').map((t) => `${t.account_id}|${String(t.ticker ?? '').trim().toUpperCase()}`));
  const kept = keepActivityIds(read.transactions, oldT)
    .filter((t) => !(t.type === 'OPENING_POSITION' && t.lot_id != null && String(t.id).startsWith('rec:') && !openingOf.has(`${t.account_id}|${t.lot_id}`)))
    .filter((t) => !(t.type === 'OPENING_POSITION' && t.lot_id == null && String(t.id).startsWith('rec:') && !openingFor.has(`${t.account_id}|${String(t.ticker ?? '').trim().toUpperCase()}`)));
  // WHAT THE ACCOUNT HOLDER RECORDED, AS RECORDED (switch gap, 2026-11-13: 10 AAPL at $150 typed as owned, a buy of 5 at
  // $170, sales of 6 and 8 — the activity read out lost the buy and the first entry, and showed the sale of 8 as 3 and 5).
  // The one-time move saves a sale the app can match only in part as two rows, and the purchases behind sales made before
  // the record began as rows of their own that are not activity; the account holder's own record of each stays as he
  // entered it: a sale split in two is shown once, as he recorded it, and a buy or a first entry the record keeps only
  // behind a sale is shown from his record
  const splitIds = new Set(kept.filter((t) => String(t.id).endsWith(':not-matched')).map((t) => String(t.id).slice(0, -':not-matched'.length)));
  const shownIds = new Set(kept.map((t) => String(t.id)));
  const movedIds = new Set(record.filter((r) => r.kind === 'FACT' && r.ref?.startsWith('moved-from-phone:')).map((r) => r.accountId));
  // AND ACTIVITY OF HIS THE RECORD NEVER HEARD OF (switch gap, 2026-11-13: an $8,000 IRA withdrawal on the phone, from a
  // cloud copy or a build that kept no record of it, vanished from the activity list, and the required-withdrawal card read
  // nothing taken): a hand-recorded record no row of the record names, in force or taken away, is still his record. One he
  // deleted is named by the row its delete took away, so it never comes back
  const refsEver = new Set(record.map((r) => r.ref).filter((x): x is string => !!x));
  // (a broker's record on an account typed by hand — a transfer in or an adjustment it sent before the account was typed —
  // is kept the same way: no broker of his writes to that account's record)
  const linkedIds = new Set((s.assetAccounts ?? []).filter((a) => a.source === 'connected').map((a) => String(a.asset_id)));
  const fromHim = oldT.filter((t) => (t.source !== 'connected' || !linkedIds.has(String(t.account_id))) && !shownIds.has(String(t.id)) && (
    (movedIds.has(String(t.account_id)) && ['BUY', 'OPENING_POSITION'].includes(t.type))
    || (!refsEver.has(`typed-txn:${t.id}`) && !String(t.id).startsWith('rec:') && (t as any).record_row == null)));
  const transactions = [...kept.filter((t) => !String(t.id).endsWith(':not-matched'))
    .map((t) => (splitIds.has(String(t.id)) && oldTById.has(String(t.id)) ? oldTById.get(String(t.id))! : t)), ...fromHim]
    .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0))
    .map((t) => { const o = oldTById.get(String(t.id)); return o && same(o, t) ? o : t; });
  const onRecord = new Set([...record.map((r) => r.accountId), ...record.map((r) => r.toAccountId).filter((x): x is string => x != null)]);
  // an opening cash record is the cash the account holder gave on its day, not the account's whole value that day: the
  // recorded day keeps its holdings (switch gap, 2026-11-13: $5,000 opening cash on Sep 1 in an account of VTI read Sep 1
  // as $5,000 alone, and the 1-month return +25.00% where the drawing reads +2.04%)
  const openingCash = new Set(record.filter((r) => r.kind === 'VALUE' && r.holding == null && r.ref?.startsWith('typed-txn:')).map((r) => r.batch ?? r.rowId));
  const exact = new Map([...onRecord].flatMap((id) => valueBatchesOf(record, id).filter((b) => b.date != null && !openingCash.has(b.batch))
    .map((b) => [`${id}|${b.date}`, b.typed ? 'typed' : String(b.source)] as [string, string])));
  const days = daysWithTheRecord(read.snapshotDays, s.snapshotDays ?? [], onRecord, exact, today);
  const snapshotDays = same(days, s.snapshotDays ?? []) && s.snapshotDays ? (s.snapshotDays as SnapshotDay[]) : days;
  const readInv = invDailyReadOut(days.filter((d) => d.date >= (read.snapshotDays[0]?.date ?? '9999')), assetAccounts);
  const inv = { ...(s.invDaily ?? {}), ...readInv };
  const invDaily = same(inv, s.invDaily ?? {}) && s.invDaily ? s.invDaily : inv;
  return { assetAccounts, transactions, snapshotDays, invDaily };
}
