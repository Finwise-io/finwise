// Net worth and Performance · ONE BROKER UPDATE, READ INTO THE ONE MASTER RECORD (asset-record.ts).
//
// WHAT IT DOES. A broker update (the SnapTrade payload the app already receives) is turned into the three things the
// record takes, in the order the record takes them:
//   1. events — one row per activity the broker sends, on the broker's own dates. They go through sortArriving, so
//      the same update arriving twice adds nothing.
//   2. lists — for each holding, the tax lots the broker states as held (or, where it sends none, its one average).
//      Each goes through purchasesFromList with the day of the list.
//   3. values — what the account and each holding were worth on the day of the list.
//
// WHAT IT NEVER DOES.
//   · It never uses the phone's date. The day of the list is the broker's own last update of the holdings; where the
//     broker gives none it stays blank. A missing activity date stays blank too — never the day of the sync.
//   · It never saves anything and never changes the existing sync. It reads the payload through the sync's own
//     functions (mapPosition, mapOptionHolding, activityKey, netCashSleeve, ingestSync, toLedgerRow), so each thing
//     is read one way only.
//   · It never puts a minus sign on shares or amounts: the kind of the row says which way they went.
//   · It never calls an unknown $0: cash the broker does not send stays blank.
import {
  dayOrNull, historyPurchaseRow, saleRow, valueRows, valueBatchesOf, sharesOnRecord, rowsInForce, oneHoldingSpelling,
  type AssetRow, type NewRow, type ListedPurchase, type RowKind,
} from './asset-record';
import { toLedgerRow, type LedgerRow } from '../../../Calculation Module code/engines/ledger';
import { ingestSync, type AccountSyncPayload } from '../../../src/services/sync/ingest';
import { mapPosition, mapOptionHolding, activityKey, type StActivity, type StOptionHolding } from '../../../src/services/sync/snaptrade';
import { contractMultiplier } from '../../../src/domain/performance';

export interface BrokerUpdate {
  events: NewRow[];
  lists: { holding: string; listed: ListedPurchase[] }[];
  values: NewRow[];
  listDay: string | null;
}

const EPS = 1e-9;
const SOURCE = 'linked' as const;
/** A number the broker sent, as its size without its sign (a sale sent as −5 shares is 5), or nothing where the broker sent none. */
/* ─ MK-NW-F-189 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * abs
 *
 * Answers ..... A number the broker sent, as its size without its sign (a sale sent as −5 shares is 5), or nothing where the broker sent none.
 *
 * Formula .....
 *     nothing   if n = nothing (or !number.is finite(number(n)) when missing or zero)
 *     size of(n read as a number)   otherwise
 *
 * Called by ... MK-CF-F-043 compareMortgageToTreasury · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-109 reviewTransactions · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-162 daysApart · MK-CF-F-282 growthUsed
 *               MK-CF-F-310 repairHourlyTakeHome · MK-HM-F-007 percent2
 *               MK-NW-F-088 BENCH · MK-NW-F-113 altPartsOf
 *               MK-NW-F-142 classReturnOf · MK-NW-F-146 undatedGainSentence
 *               MK-NW-F-151 linkedSplit · MK-NW-F-164 gapWords
 *               MK-NW-F-184 isPartOfAccount · MK-NW-F-193 eventRow
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-202 equalOrBothBlank
 *               MK-NW-F-206 same · MK-NW-F-217 transactionRow
 *               MK-NW-F-228 moveOldCopies · MK-NW-F-237 sameNumber
 *               MK-NW-F-238 sortArriving · MK-NW-F-258 saleRow
 *               MK-NW-F-259 transferRow · MK-NW-F-263 sharesThatDisagree
 *               MK-NW-F-265 historyPurchaseRow · MK-NW-F-267 daysFromOneDateToAnother
 *               MK-NW-F-268 arrivingKey · MK-NW-F-270 sameEventElsewhere
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-274 sameShares
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-284 activityOf · MK-NW-F-287 splitOf
 *               MK-NW-O-002 theAccount · MK-NW-O-005 theAlternativesOutlook
 *               MK-NW-O-008 thePerformance · MK-PF-F-014 buildPerformance
 *               MK-PF-F-020 portfolioBenchReturn · MK-PF-F-033 quantityWithUnit
 *               MK-PF-F-058 gainOnPartSentence · MK-PF-F-070 holdingPath
 *               MK-PF-F-071 returnSplitAtPurchases · MK-PL-F-010 drawOrderOutcome
 *               MK-ST-F-012 toLedgerRow · MK-ST-F-013 personalFlowTotals
 *               MK-ST-F-018 readMoney · MK-ST-F-021 toNumber
 *               MK-ST-F-049 formatMoney · MK-ST-F-050 formatMoneyCents
 *               MK-ST-F-051 moneyCompact · MK-ST-F-060 verdict
 *               MK-ST-F-081 timeWeightedReturn · MK-ST-F-088 moneyIntoAccount
 *               MK-ST-F-090 unnamedActivityOf · MK-XS-F-015 importHoldings
 *               MK-XS-F-102 ingestSync · MK-XS-F-183 writeFigure
 *               MK-XS-F-187 fixStoredMoney · MK-XS-F-188 fixStoredFees
 *               MK-XS-F-189 tradeFeeOnRecord · MK-XS-F-193 walkShown
 *               MK-XS-F-195 monthShown · MK-XS-F-197 chainShown
 *               MK-XS-F-211 pointsDigits · MK-XS-F-215 isWholeToTheCent
 *               MK-XS-F-218 sameCents
 *
 * Reaches ..... 611 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-081 LB
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               … and 593 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-189
 * Changed ..... not in git yet (—)
 */
const abs = (n: number | null | undefined): number | null => (n == null || !Number.isFinite(Number(n)) ? null : Math.abs(Number(n)));
/** A date the broker gave: cut to its day where it can be read, kept as given where it cannot (addRows keeps it). */
/* ─ MK-NW-F-190 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * dateAsSent
 *
 * Answers ..... A date the broker gave: cut to its day where it can be read, kept as given where it cannot (addRows keeps it).
 *
 * Formula .....
 *     day or null(v) (or v   if typeof v = 'string' and trim() ! = ''
 *     nothing   otherwise when missing)
 *
 * Called by ... MK-NW-F-194 brokerUpdateToRecord
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-194 brokerUpdateToRecord · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-190
 * Changed ..... not in git yet (—)
 */
const dateAsSent = (v: string | null | undefined): string | null => dayOrNull(v) ?? (typeof v === 'string' && v.trim() !== '' ? v : null);

/** The day of the broker's last update. A stamp that carries a time is one instant, so its day is read on the phone's own
 *  clock — the same instant written with -04:00 or with Z is one day. A plain 'YYYY-MM-DD' stays as given. */
/* ─ MK-NW-F-286 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * dayOfInstant
 *
 * Answers ..... The day of the broker's last update.
 *
 * Formula .....
 *     day or null(v ?? nothing)   when v is not a string (or ÷ ^\s × \d{4}-\d{2}-\d{2}\s × $ ÷ .test(v) when missing or zero)
 *     t = date.parse(v)
 *     day or null(v)   when !number.is finite(t)
 *     d = the date t
 *     the answer = `${get full year()}-${string(get month() + 1).pad start(2, '0')}-${string(get date()).pad start(2, '0')}`
 *
 * Called by ... MK-NW-F-194 brokerUpdateToRecord
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-194 brokerUpdateToRecord · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-286
 * Changed ..... not in git yet (—)
 */
function dayOfInstant(v: string | null | undefined): string | null {
  if (typeof v !== 'string' || /^\s*\d{4}-\d{2}-\d{2}\s*$/.test(v)) return dayOrNull(v ?? null);
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return dayOrNull(v);
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Shares per contract of an option, read by the sync's one rule (mapOptionHolding: 10 for a mini option, else 100). */
/* ─ MK-NW-F-191 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * sharesPerContract
 *
 * Answers ..... Shares per contract of an option, read by the sync's one rule (mapOptionHolding: 10 for a mini option, else 100).
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-193 eventRow
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-193 eventRow
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If multiplier is missing it uses 100.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-191
 * Changed ..... not in git yet (—)
 */
const sharesPerContract = (optionSymbol: unknown): number =>
  mapOptionHolding({ symbol: { option_symbol: (optionSymbol && typeof optionSymbol === 'object' ? optionSymbol : {}) as any }, units: 1 })?.multiplier ?? 100;
/** An option's own name on the record: the OCC ticker the broker sends, else the sync's label. */
/* ─ MK-NW-F-192 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * optionName
 *
 * Answers ..... An option's own name on the record: the OCC ticker the broker sends, else the sync's label.
 *
 * Formula .....
 *     os = symbol.option symbol
 *     the answer = one holding spelling(os.ticker ?? map option holding(o).label ?? nothing)
 *
 * Called by ... MK-NW-F-194 brokerUpdateToRecord
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-194 brokerUpdateToRecord · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-192
 * Changed ..... not in git yet (—)
 */
const optionName = (o: StOptionHolding): string | null => {
  const os = o.symbol?.option_symbol;
  return oneHoldingSpelling(os?.ticker ?? mapOptionHolding(o)?.label ?? null);
};

/** One activity as one row. The ledger (toLedgerRow, the sync's own reading) says what it is and which way it went. */
/* ─ MK-NW-F-193 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * eventRow
 *
 * Answers ..... One activity as one row.
 *
 * Formula .....
 *     is option = !!act.option symbol (or !!act.option type when missing or zero)
 *     ref = string(act.id)   if act.id
 *     activity key(account id, act)   otherwise
 *     date = act.trade date (or nothing when missing)
 *     settlement date = act.settlement date (or nothing when missing)
 *     option symbol = act.option symbol as { ticker?: string | nothing } | nothing | undefined
 *     holding = one holding spelling(is option ? (option symbol.ticker ?? row.ticker) : row.ticker)
 *     per contract = shares per contract(act.option symbol)   if is option
 *     1   otherwise
 *     shares = row.shares × per contract   if row.shares ≠ nothing
 *     nothing   otherwise
 *     price = nothing   if row.price = nothing
 *     row.price   if act.amount = nothing
 *     row.price ÷ per contract   otherwise   otherwise
 *     amount = nothing   if act.amount = nothing
 *     row.amount.to number(2)   otherwise
 *     fee = abs(act.fee)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-194 brokerUpdateToRecord
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-194 brokerUpdateToRecord · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-010 transaction words (the institution's own wording)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-193
 * Changed ..... not in git yet (—)
 */
function eventRow(record: readonly AssetRow[], accountId: string, act: StActivity): NewRow {
  const isOption = !!act.option_symbol || !!act.option_type;
  const row: LedgerRow = toLedgerRow({
    word: act.type, amount: act.amount, units: act.units, price: act.price,
    // no date is given to the ledger where the broker sends none — the row keeps its date blank
    date: act.trade_date ?? null, ticker: act.symbol?.raw_symbol ?? act.symbol?.symbol,
    description: act.description, isOption,
  }, 'NEGATIVE_IS_OUT');
  const ref = act.id ? String(act.id) : activityKey(accountId, act);
  const date = act.trade_date ?? null;
  const settlementDate = act.settlement_date ?? null;
  const optionSymbol = act.option_symbol as { ticker?: string | null } | null | undefined;
  const holding = oneHoldingSpelling(isOption ? (optionSymbol?.ticker ?? row.ticker) : row.ticker);
  // an option's units are contracts: on the record they are shares (contracts × shares per contract), priced per share
  const perContract = isOption ? sharesPerContract(act.option_symbol) : 1;
  const shares = row.shares != null ? row.shares * perContract : null;
  // the ledger's price is the broker's cash ÷ contracts (a contract's price) where the broker sends an amount; with no
  // amount it is the broker's own price, which is already per share — it is not divided by the contract size again
  const price = row.price == null ? null : act.amount == null ? row.price : row.price / perContract;
  const amount = act.amount == null ? null : row.amount.toNumber(2);
  const fee = abs(act.fee);
  const base = { accountId, holding, date, settlementDate, source: SOURCE, ref, word: row.sourceWord } as const;
  const other = (): NewRow => ({ ...base, kind: 'OTHER', shares, price, amount, fee });
  const cashRow = (kind: RowKind): NewRow => ({ ...base, holding, kind, amount, fee, ...(shares != null ? { shares } : {}), ...(price != null ? { price } : {}) });

  const split = splitOf(record, accountId, holding, date, act, row);
  if (split) return split;

  switch (row.event) {
    case 'BUY': case 'REINVEST_PURCHASE':
      if (holding == null || shares == null) return other();
      return { ...historyPurchaseRow(record, { accountId, holding, date, settlementDate, shares, price, amount, fee, source: SOURCE, ref }), word: row.sourceWord };
    case 'SELL': case 'RETURN_OF_CAPITAL':
      if (holding == null || shares == null) return other();
      return { ...saleRow({ accountId, holding, date, settlementDate, shares, price, amount, fee, source: SOURCE, ref }), word: row.sourceWord };
    // money the kind names one way: a reversal (a dividend or interest that LEFT, a fee that came IN) has no kind on the
    // record, so it is kept and shown as the broker's word, counted in nothing — never as income or a cost the wrong way
    case 'DIVIDEND': case 'CAPITAL_GAIN_DISTRIBUTION':
      return row.direction === 'OUT' ? other() : cashRow('DIVIDEND');
    case 'INTEREST':
      return row.direction === 'OUT' ? other() : cashRow('INTEREST');
    case 'FEE': case 'TAX_WITHHELD': case 'MARGIN_INTEREST':
      return row.direction === 'IN' ? other() : cashRow('FEE');
    case 'CASH_IN': case 'CASH_OUT':
      // a broker's "deposit" of −$500 is $500 that left: the direction the ledger reads decides the kind
      return cashRow(row.direction === 'OUT' ? 'WITHDRAWAL' : row.direction === 'IN' ? 'DEPOSIT' : row.event === 'CASH_IN' ? 'DEPOSIT' : 'WITHDRAWAL');
    case 'SECURITIES_IN':
      if (holding == null || shares == null) return other();
      return { ...base, kind: 'TRANSFER', shares, price, amount, fee, arrives: true };
    case 'SECURITIES_OUT':
      if (holding == null || shares == null) return other();
      return { ...base, kind: 'TRANSFER', shares, price, amount, fee };   // no toAccountId: the shares leave the record
    case 'INTERNAL_TRANSFER':
      // cash moved between the person's own accounts: money in arrives, money out leaves; no account is named
      return { ...cashRow('TRANSFER'), ...(row.direction === 'IN' ? { arrives: true } : {}) };
    default:
      // SWEEP, CORPORATE_ACTION (a split, a merger, a spin-off — the ledger does not tell them apart), an option's
      // expiry or exercise, and any word the ledger does not know: kept with the broker's word, counted in nothing
      return other();
  }
}

/** A split the broker sends as an activity, as a SPLIT row — only where the activity says enough to know how many shares
 *  each share became: the shares it adds (or takes away) set against the shares on record that day. Where that cannot be
 *  known, nothing is guessed: null, and the activity is kept with the broker's word (the list's question then stands). */
/* ─ MK-NW-F-287 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * splitOf
 *
 * Answers ..... A split the broker sends as an activity, as a SPLIT row — only where the activity says enough to know how many shares each share became: the shares it adds (or takes away) set against the shares on record that day.
 *
 * Formula .....
 *     word = string(act.type ?? '').to upper case()
 *     says split = ÷ SPLIT ÷ .test(word) (or (row.event = 'CORPORATE_ACTION' or word = 'CORPORATE_ACTION') and ÷ \b split\b ÷ test(string(act.description ?? '')) when missing or zero)
 *     nothing   when says split is missing (or holding = nothing (or day or null(date) = nothing when missing or zero) when missing or zero)
 *     units = act.units read as a number
 *     nothing   when !number.is finite(units) (or size of(units) ≤ EPS when missing or zero)
 *     reverse = ÷ REVERSE ÷ test(`${word} ${act.description ?? ''}`)
 *     nothing   when reverse ! = units < 0
 *     day = day or null(date) as string
 *     day before = the first 10 of the date date.parse(day) − 86400000).to isostring(
 *     held = shares on record(record as asset row[], account id, holding, day before)
 *     nothing   when not (held > EPS)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-193 eventRow
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-193 eventRow
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-010 transaction words (the institution's own wording)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-287
 * Changed ..... not in git yet (—)
 */
function splitOf(record: readonly AssetRow[], accountId: string, holding: string | null, date: string | null, act: StActivity, row: LedgerRow): NewRow | null {
  const word = String(act.type ?? '').toUpperCase();
  const saysSplit = /SPLIT/.test(word) || (row.event === 'CORPORATE_ACTION' || word === 'CORPORATE_ACTION') && /\bSPLIT\b/i.test(String(act.description ?? ''));
  if (!saysSplit || holding == null || dayOrNull(date) == null) return null;
  const units = Number(act.units);
  if (!Number.isFinite(units) || Math.abs(units) <= EPS) return null;
  // a reverse split takes shares away: the broker's own sign says which way, and a description saying "reverse" must agree
  const reverse = /REVERSE/i.test(`${word} ${act.description ?? ''}`);
  if (reverse !== units < 0) return null;
  // the shares held the day before the split (a split dated that day is not counted twice)
  const day = dayOrNull(date) as string;
  const dayBefore = new Date(Date.parse(day) - 86400000).toISOString().slice(0, 10);
  const held = sharesOnRecord(record as AssetRow[], accountId, holding, dayBefore);
  if (!(held > EPS)) return null;
  const ratio = (held + units) / held;
  if (!(ratio > EPS) || Math.abs(ratio - 1) <= EPS) return null;
  const ref = act.id ? String(act.id) : activityKey(accountId, act);
  return { accountId, holding, kind: 'SPLIT', date, settlementDate: act.settlement_date ?? null, ratio, source: SOURCE, ref, word: row.sourceWord };
}

/** ONE BROKER UPDATE, as what the record's calling order takes: the events (for sortArriving), each holding's list
 *  (for purchasesFromList, with listDay), and the day's values (for addRows). `record` is the record before this update. */
/* ─ MK-NW-F-194 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * brokerUpdateToRecord
 *
 * Answers ..... ONE BROKER UPDATE, as what the record's calling order takes: the events (for sortArriving), each holding's list (for purchasesFromList, with listDay), and the day's values (for addRows).
 *
 * Formula .....
 *     st = payload.account
 *     list day = day of instant(st.sync status.holdings.last successful sync ?? nothing)
 *     events = for each of payload.activities (or none when missing): event row(record, account id, each)
 *     synced = ingest sync([], {}, [payload], st.sync status.holdings.last successful sync ?? '1970 − 01 − 01T00:00:00.000Z').accounts[0] as any
 *     pairs = for each of payload.positions (or none when missing): each = each
 *     m = map position(each) where (x): x is { raw: typeof raw; m: non nullable<typeof m> } => m ≠ nothing
 *     lists = []
 *     holdings = []
 *     holding = one holding spelling(ticker) as string
 *     pos = synced.positions.[i]
 *     per = contract multiplier(pos)   if pos
 *     1   otherwise
 *     unclear = pos.price quote = 'unclear'
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
 *
 * Decides .....
 *     · If quantity is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-194
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function brokerUpdateToRecord(record: AssetRow[], payload: AccountSyncPayload, accountId: string): BrokerUpdate {
  const st = payload.account;
  // the broker's own date of the holdings — never the phone's
  const listDay = dayOfInstant(st.sync_status?.holdings?.last_successful_sync ?? null);

  const events = (payload.activities ?? []).map((act) => eventRow(record, accountId, act));

  // the sync's own reading of the account (the cash net of a money-market fund, how a bond's price is quoted)
  const synced = ingestSync([], {}, [payload], st.sync_status?.holdings?.last_successful_sync ?? '1970-01-01T00:00:00.000Z').accounts[0] as any;
  const pairs = (payload.positions ?? []).map((raw) => ({ raw, m: mapPosition(raw) })).filter((x): x is { raw: typeof x.raw; m: NonNullable<typeof x.m> } => x.m != null);

  const lists: BrokerUpdate['lists'] = [];
  const holdings: { holding: string; shares: number | null; price: number | null; value: number | null }[] = [];
  pairs.forEach(({ raw, m }, i) => {
    const holding = oneHoldingSpelling(m.ticker) as string;
    const pos = synced?.positions?.[i];
    const per = pos ? contractMultiplier(pos) : 1;   // a bond quoted per $100 of face is a hundredth of quantity × price
    const unclear = pos?.price_quote === 'unclear';
    // a listed price is per unit, read the same way as the value (97 per $100 of face is $0.97 a unit); where the way a
    // bond is quoted is not clear, the price is not known — never guessed
    const perUnit = (price: number | null | undefined): number | null => (price == null || unclear ? null : price * per);
    const statedLots = (raw.tax_lots ?? []).some((l) => (l.quantity ?? 0) > 0);
    const listed: ListedPurchase[] = statedLots
      ? m.lots.map((l) => ({ date: dateAsSent(l.purchase_date), shares: l.shares, price: perUnit(l.cost_per_share) }))
      : [{ date: null, shares: m.shares, price: perUnit(m.costPerShare), average: true }];
    if (m.shares > 0) lists.push({ holding, listed });
    holdings.push({ holding, shares: m.shares, price: m.price, value: m.price == null || unclear ? null : m.shares * m.price * per });
  });
  for (const o of payload.optionPositions ?? []) {
    const mo = mapOptionHolding(o);
    const holding = optionName(o);
    if (!mo || holding == null) continue;
    const shares = mo.contracts * mo.multiplier;
    // a short option (contracts below zero) holds no purchase: it is valued, never listed as a tax lot
    if (shares > 0) lists.push({ holding, listed: [{ date: null, shares, price: o.average_purchase_price == null ? null : o.average_purchase_price / mo.multiplier, average: true }] });
    holdings.push({ holding, shares, price: o.price ?? null, value: mo.value });
  }
  // a broker that sends its list of holdings and leaves one out no longer holds it: that holding's list is empty
  if (payload.positions != null) {
    const named = new Set(lists.map((l) => l.holding));
    const onRecord = [...new Set(rowsInForce(record).filter((r) => r.holding != null && (r.accountId === accountId || r.toAccountId === accountId)
      && (r.kind === 'PURCHASE' || r.kind === 'TRANSFER')).map((r) => r.holding as string))];
    for (const h of onRecord) if (!named.has(h) && sharesOnRecord(record, accountId, h) > EPS) lists.push({ holding: h, listed: [] });
  }

  const cash = payload.balancesCash == null ? null : (synced?.cash_balance ?? null);
  const statedTotal = st.balance?.total?.amount ?? null;
  const values = valueRows({ accountId, date: listDay, source: SOURCE, cash, statedTotal, holdings });
  // the same values of the same day sent again add nothing
  const same = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? a == null && b == null : Math.abs(a - b) <= EPS);
  const sentBefore = valueBatchesOf(record, accountId).some((b) => b.source === SOURCE && b.date === listDay && same(b.cash, cash) && same(b.statedTotal, statedTotal)
    && b.holdings.length === holdings.length
    && b.holdings.every((h, i) => h.holding === oneHoldingSpelling(holdings[i].holding) && same(h.shares, holdings[i].shares) && same(h.price, holdings[i].price) && same(h.value, holdings[i].value)));

  return { events, lists, values: sentBefore ? [] : values, listDay };
}
