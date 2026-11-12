// Net worth and Performance · THE DAY'S VALUE FROM THE PRICE FEED, READ INTO THE ONE MASTER RECORD (asset-record.ts).
//
// WHAT IT DOES (phase 2 of the approved plan, 2026-11-11: "A value is written when an update or a price refresh
// arrives, under that data's date"). When prices arrive, each account with holdings on record gets one set of values,
// saved as the price feed's:
//   · DATED BY THE PRICES' OWN DAY — the latest close any of its holdings has — never the phone's date. A refresh on a
//     Sunday writes Friday's close under Friday.
//   · each holding: the shares on record on that day × that day's close (an option's shares already count every share
//     in its contracts; a bond quoted per $100 of face counts a hundredth of quantity × price, as the sync reads it);
//   · a holding with no close in the feed, or only one more than seven days before that day (R19), keeps the figures last given for it by a broker, a file or the account holder,
//     else stays blank — never $0;
//   · the account's cash and any typed value are those last given on or before that day: the price feed knows no cash.
//
// WHAT IT NEVER DOES.
//   · It writes nothing for a day a broker, a file or the account holder already gave values for: those stand in front
//     of the price feed on their day (rule 7), so a second set would only be noise.
//   · It writes nothing when the values for that day are the same as the price feed's last ones (a refresh every ten
//     minutes over a weekend adds one set, not hundreds).
//   · It never changes the count of shares: values are what shares were worth, never a transaction.
import {
  rowsInForce, sharesOnRecord, valueBatchesOf, valueRows, oneHoldingSpelling,
  type AssetRow, type NewRow, type ValueBatch,
} from './asset-record';
import { closeOnOrBefore, staleStartClose, contractMultiplier, type PriceSeries, type Position } from '../../../src/domain/performance';

const EPS = 1e-9;
const equalOrBothBlank = (x: number | null | undefined, y: number | null | undefined) => (x == null || y == null ? x == null && y == null : Math.abs(x - y) <= EPS);
const isGiven = (b: ValueBatch) => b.source !== 'price-feed';

/** The latest values given (not the price feed's) dated on or before a day — the cash and the holdings' figures to
 *  carry where the feed has none. */
function lastGivenBy(batches: ValueBatch[], day: string): ValueBatch | null {
  const fit = batches.filter((b) => isGiven(b) && b.date != null && b.date <= day);
  return fit.length ? fit.reduce((a, b) => ((b.date as string) > (a.date as string) || (b.date === a.date && b.writtenAt >= a.writtenAt) ? b : a)) : null;
}

/** THE PRICE FEED'S VALUES FOR EACH ACCOUNT WITH HOLDINGS ON RECORD, as rows to save. `accounts` gives each holding's
 *  quote (an option, a bond quoted per $100); `prices` is the price cache, keyed by ticker in capitals. */
export function priceFeedValues(
  record: readonly AssetRow[],
  accounts: readonly { asset_id: string | number; positions?: Position[] }[],
  prices: Readonly<Record<string, PriceSeries | undefined>>,
): NewRow[] {
  const out: NewRow[] = [];
  const live = rowsInForce(record);
  const ids = [...new Set(live.filter((r) => r.holding != null && (r.kind === 'PURCHASE' || r.kind === 'TRANSFER')).map((r) => r.accountId))];
  for (const id of ids) {
    const held = [...new Set(live.filter((r) => r.holding != null && (r.accountId === id || r.toAccountId === id)).map((r) => r.holding as string))]
      .filter((h) => sharesOnRecord(record, id, h) > EPS);
    if (!held.length) continue;
    const lastDays = held.map((h) => prices[h]?.points?.at(-1)?.date).filter((d): d is string => typeof d === 'string');
    if (!lastDays.length) continue;
    const day = lastDays.reduce((a, b) => (b > a ? b : a));
    const batches = valueBatchesOf(record, id);
    if (batches.some((b) => b.date === day && isGiven(b))) continue;
    const given = lastGivenBy(batches, day);
    const positions = accounts.find((a) => String(a.asset_id) === id)?.positions ?? [];
    const holdings = held.map((h) => {
      const shares = sharesOnRecord(record, id, h, day);
      // a close more than START_CLOSE_DAYS before the day is too old to value the holding on it (R19): it counts as no close
      const close = staleStartClose(prices[h], day) ? null : closeOnOrBefore(prices[h], day);
      const pos = positions.find((p) => oneHoldingSpelling(p.ticker) === h);
      const per = pos && pos.kind !== 'options' ? contractMultiplier(pos as any) : 1;
      if (close != null) return { holding: h, shares, price: close, value: shares * close * per };
      const was = given?.holdings.find((x) => x.holding === h);
      return { holding: h, shares, price: was?.price ?? null, value: was && equalOrBothBlank(was.shares, shares) ? was.value : null };
    }).filter((x) => x.shares > EPS);
    if (!holdings.length) continue;
    const cash = given?.cash ?? null, typedValue = given?.typedValue ?? null;
    const prev = batches.filter((b) => b.date === day && b.source === 'price-feed').reduce<ValueBatch | null>((a, b) => (a == null || b.writtenAt >= a.writtenAt ? b : a), null);
    const unchanged = prev != null && equalOrBothBlank(prev.cash, cash) && equalOrBothBlank(prev.typedValue, typedValue) && prev.holdings.length === holdings.length
      && holdings.every((x) => prev.holdings.some((y) => y.holding === x.holding && equalOrBothBlank(y.shares, x.shares) && equalOrBothBlank(y.price, x.price) && equalOrBothBlank(y.value, x.value)));
    if (unchanged) continue;
    out.push(...valueRows({ accountId: id, date: day, source: 'price-feed', cash, typedValue, holdings }));
  }
  return out;
}
