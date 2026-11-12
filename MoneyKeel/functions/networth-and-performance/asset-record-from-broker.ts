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
const abs = (n: number | null | undefined): number | null => (n == null || !Number.isFinite(Number(n)) ? null : Math.abs(Number(n)));
/** A date the broker gave: cut to its day where it can be read, kept as given where it cannot (addRows keeps it). */
const dateAsSent = (v: string | null | undefined): string | null => dayOrNull(v) ?? (typeof v === 'string' && v.trim() !== '' ? v : null);

/** Shares per contract of an option, read by the sync's one rule (mapOptionHolding: 10 for a mini option, else 100). */
const sharesPerContract = (optionSymbol: unknown): number =>
  mapOptionHolding({ symbol: { option_symbol: (optionSymbol && typeof optionSymbol === 'object' ? optionSymbol : {}) as any }, units: 1 })?.multiplier ?? 100;
/** An option's own name on the record: the OCC ticker the broker sends, else the sync's label. */
const optionName = (o: StOptionHolding): string | null => {
  const os = o.symbol?.option_symbol;
  return oneHoldingSpelling(os?.ticker ?? mapOptionHolding(o)?.label ?? null);
};

/** One activity as one row. The ledger (toLedgerRow, the sync's own reading) says what it is and which way it went. */
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
  const price = row.price != null ? row.price / perContract : null;
  const amount = act.amount == null ? null : row.amount.toNumber(2);
  const fee = abs(act.fee);
  const base = { accountId, holding, date, settlementDate, source: SOURCE, ref, word: row.sourceWord } as const;
  const other = (): NewRow => ({ ...base, kind: 'OTHER', shares, price, amount, fee });
  const cashRow = (kind: RowKind): NewRow => ({ ...base, holding, kind, amount, fee, ...(shares != null ? { shares } : {}), ...(price != null ? { price } : {}) });

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

/** ONE BROKER UPDATE, as what the record's calling order takes: the events (for sortArriving), each holding's list
 *  (for purchasesFromList, with listDay), and the day's values (for addRows). `record` is the record before this update. */
export function brokerUpdateToRecord(record: AssetRow[], payload: AccountSyncPayload, accountId: string): BrokerUpdate {
  const st = payload.account;
  // the broker's own date of the holdings — never the phone's
  const listDay = dayOrNull(st.sync_status?.holdings?.last_successful_sync ?? null);

  const events = (payload.activities ?? []).map((act) => eventRow(record, accountId, act));

  // the sync's own reading of the account (the cash net of a money-market fund, how a bond's price is quoted)
  const synced = ingestSync([], {}, [payload], st.sync_status?.holdings?.last_successful_sync ?? '1970-01-01T00:00:00.000Z').accounts[0] as any;
  const pairs = (payload.positions ?? []).map((raw) => ({ raw, m: mapPosition(raw) })).filter((x): x is { raw: typeof x.raw; m: NonNullable<typeof x.m> } => x.m != null);

  const lists: BrokerUpdate['lists'] = [];
  const holdings: { holding: string; shares: number | null; price: number | null; value: number | null }[] = [];
  pairs.forEach(({ raw, m }, i) => {
    const holding = oneHoldingSpelling(m.ticker) as string;
    const statedLots = (raw.tax_lots ?? []).some((l) => (l.quantity ?? 0) > 0);
    const listed: ListedPurchase[] = statedLots
      ? m.lots.map((l) => ({ date: dateAsSent(l.purchase_date), shares: l.shares, price: l.cost_per_share }))
      : [{ date: null, shares: m.shares, price: m.costPerShare, average: true }];
    if (m.shares > 0) lists.push({ holding, listed });
    const pos = synced?.positions?.[i];
    const per = pos ? contractMultiplier(pos) : 1;   // a bond quoted per $100 of face is a hundredth of quantity × price
    const unclear = pos?.price_quote === 'unclear';
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
