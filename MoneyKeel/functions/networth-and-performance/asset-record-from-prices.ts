// Net worth and Performance · THE DAY'S VALUE FROM THE PRICE FEED, READ INTO THE ONE MASTER RECORD (asset-record.ts).
//
// WHAT IT DOES (phase 2 of the approved plan, 2026-11-11: "A value is written when an update or a price refresh
// arrives, under that data's date"). When prices arrive, each account with holdings on record gets one set of values,
// saved as the price feed's:
//   · DATED BY THE PRICES' OWN DAY — the latest close any of its holdings has — never the phone's date. A refresh on a
//     Sunday writes Friday's close under Friday.
//   · each holding: the shares on record on that day × that day's close (an option's shares already count every share
//     in its contracts; a bond quoted per $100 of face counts a hundredth of quantity × price, as the sync reads it);
//   · a holding whose last close is more than seven days before that day is STILL valued at that close, and the row keeps
//     the close's own day (priceDate) so the screen can say the price is old (his ruling, 2026-11-11: "if price is stale,
//     app just state so, but still display it and use it");
//   · a holding with no close in the feed at all keeps the figures last given for it by a broker, a file or the account
//     holder, else stays blank — never $0;
//   · the account's cash and any typed value are those last given on or before that day: the price feed knows no cash.
//
// WHAT IT NEVER DOES.
//   · It writes nothing for a day a broker, a file or the account holder already gave values for: those stand in front
//     of the price feed on their day (rule 7), so a second set would only be noise.
//   · It writes nothing when the values for that day are the same as the price feed's last ones (a refresh every ten
//     minutes over a weekend adds one set, not hundreds).
//   · It never changes the count of shares: values are what shares were worth, never a transaction.
//   · It values ONLY an account built from its holdings (derive_balance true, set by a file import). For an account typed
//     by hand the balance the account holder typed is its value, and its holdings are a part of it tracked for
//     performance, so their prices are not its value (owner's ruling; comparison check, 2026-11-11). An account with no
//     `source` at all — every sign-up account and older rows — is one typed by hand (outside check, 2026-11-12: only
//     'manual' was checked, so a typed $40,000 read $70,000 after a refresh and a sign-up $50,000 read unknown).
//   · It writes nothing for an account that is no longer among the accounts, or that the record says was removed
//     (outside check, 2026-11-12: a deleted typed account still got a price-feed value).
import {
  rowsInForce, sharesOnRecord, valueBatchesOf, valueRows, oneHoldingSpelling, factsOf,
  type AssetRow, type NewRow, type ValueBatch,
} from './asset-record';
import { closeOnOrBefore, staleStartClose, contractMultiplier, type PriceSeries, type Position } from '../../../src/domain/performance';

const EPS = 1e-9;
/** Whether two amounts are the same to a billionth, or both missing. */
/* ─ MK-NW-F-202 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * equalOrBothBlank
 *
 * Answers ..... Whether two amounts are the same to a billionth, or both missing.
 *
 * Formula .....
 *     x = nothing and y = nothing   if x = nothing (or y = nothing when missing or zero)
 *     size of(x − y) ≤ EPS   otherwise
 *
 * Called by ... MK-NW-F-205 priceFeedValues
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-205 priceFeedValues · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-202
 * Changed ..... not in git yet (—)
 */
const equalOrBothBlank = (x: number | null | undefined, y: number | null | undefined) => (x == null || y == null ? x == null && y == null : Math.abs(x - y) <= EPS);
/** Whether a day of values was given by the broker, a file or the account holder, not calculated from the price feed. */
/* ─ MK-NW-F-203 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isGiven
 *
 * Answers ..... Whether a day of values was given by the broker, a file or the account holder, not calculated from the price feed.
 *
 * Formula .....
 *     source ! = 'price − feed'
 *
 * Called by ... MK-NW-F-204 lastGivenBy · MK-NW-F-205 priceFeedValues
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-204 lastGivenBy · MK-NW-F-205 priceFeedValues
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-203
 * Changed ..... not in git yet (—)
 */
const isGiven = (b: ValueBatch) => b.source !== 'price-feed';

/** The latest values given (not the price feed's) dated on or before a day — the cash and the holdings' figures to
 *  carry where the feed has none. */
/* ─ MK-NW-F-204 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * lastGivenBy
 *
 * Answers ..... The latest values given (not the price feed's) dated on or before a day — the cash and the holdings' figures to carry where the feed has none.
 *
 * Formula .....
 *     fit = batches where is given(each) and date ≠ nothing and date ≤ day
 *     fit.reduce((a, b) => ((date as string) > (date as string) or (date = date and written at ≥ written at) ? b : a))   when count of fit
 *     undated = batches where is given(each) and date = nothing
 *     the answer:
 *     undated.reduce((a, b) => (written at ≥ written at ? b : a))   if count of undated
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-205 priceFeedValues
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-205 priceFeedValues · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-204
 * Changed ..... not in git yet (—)
 */
function lastGivenBy(batches: ValueBatch[], day: string): ValueBatch | null {
  const fit = batches.filter((b) => isGiven(b) && b.date != null && b.date <= day);
  if (fit.length) return fit.reduce((a, b) => ((b.date as string) > (a.date as string) || (b.date === a.date && b.writtenAt >= a.writtenAt) ? b : a));
  // values given with no date (a sign-up answer, cash typed with no as-of day) are not passed over: with nothing dated on
  // or before the day, the latest undated set is the one last given (outside check, 2026-11-12)
  const undated = batches.filter((b) => isGiven(b) && b.date == null);
  return undated.length ? undated.reduce((a, b) => (b.writtenAt >= a.writtenAt ? b : a)) : null;
}

/** THE PRICE FEED'S VALUES FOR EACH ACCOUNT WITH HOLDINGS ON RECORD, as rows to save. `accounts` gives each holding's
 *  quote (an option, a bond quoted per $100); `prices` is the price cache, keyed by ticker in capitals. */
/* ─ MK-NW-F-205 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * priceFeedValues
 *
 * Answers ..... THE PRICE FEED'S VALUES FOR EACH ACCOUNT WITH HOLDINGS ON RECORD, as rows to save.
 *
 * Formula .....
 *     out = []
 *     live = rows in force(record)
 *     ids = [...new set(live.filter((r) => holding ≠ nothing and (kind = 'PURCHASE' or kind = 'TRANSFER')).map((r) => account id))]
 *     acct = accounts.find((a) => string(asset id) = id)
 *     last days = for each of held: prices[each].points.at(-1).date where (d): d is string => typeof d = 'string'
 *     day = last days.reduce((a, b) => (b > a ? b : a))
 *     batches = value batches of(record, id)
 *     given = last given by(batches, day)
 *     positions = accounts.find((a) => string(asset id) = id).positions (or none when missing)
 *     shares = shares on record(record, id, h, day)
 *     close = close on or before(prices[h], day)
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
 *               MK-XS-I-005 holding price
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-205
 * Changed ..... 2026-11-11 (c4a137f1)
 */
export function priceFeedValues(
  record: readonly AssetRow[],
  accounts: readonly { asset_id: string | number; positions?: Position[]; source?: string; derive_balance?: boolean }[],
  prices: Readonly<Record<string, PriceSeries | undefined>>,
): NewRow[] {
  const out: NewRow[] = [];
  const live = rowsInForce(record);
  const ids = [...new Set(live.filter((r) => r.holding != null && (r.kind === 'PURCHASE' || r.kind === 'TRANSFER')).map((r) => r.accountId))];
  for (const id of ids) {
    const acct = accounts.find((a) => String(a.asset_id) === id);
    // only an account built from its holdings is valued from prices; one gone from the accounts, or removed on the record, gets nothing
    if (!acct || acct.derive_balance !== true || factsOf(record, id, null).accountRemoved === true) continue;
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
      // a close more than START_CLOSE_DAYS before the day is still used, and its own day is kept beside it (his ruling, 2026-11-11)
      const close = closeOnOrBefore(prices[h], day);
      const old = staleStartClose(prices[h], day);
      const pos = positions.find((p) => oneHoldingSpelling(p.ticker) === h);
      const per = pos && pos.kind !== 'options' ? contractMultiplier(pos as any) : 1;
      if (close != null) return { holding: h, shares, price: close, value: shares * close * per, ...(old ? { priceDate: old.day } : {}) };
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
