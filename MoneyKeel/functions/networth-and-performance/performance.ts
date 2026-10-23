// Performance · How are my investments doing — the change walk, each account's return, the honest
// comparison.
//
// THE DOOR for Q-PF-1, ruled by the founder 2026-09-27: "yes" — the Performance tab and Home answer
// one question, so the return on Home's card and the return on Performance can never disagree.
//
// THIS DOOR CARRIES FOUR RULINGS THAT WERE EACH PAID FOR ONCE:
//   · ONE MEANING OF RETURN, AND IT IS TIME-WEIGHTED (owner decision, 2026-10-04, DEC-1669: "All
//     return should be True Weighted Return and not Dietz return."). The window is split every time
//     money moves in or out, each piece's growth is measured, and the pieces are multiplied — so
//     money added never reads as a gain. Before this it was Modified Dietz, with a money-weighted
//     rate standing in where that refused; neither is used any more.
//   · THE BEGINNING IS READ, NEVER BACK-FILLED (B-98). It comes from the daily record — which reaches
//     back through a linked account's own transactions — and is only derived when the record cannot
//     reach. Today's share count priced at past dates is a line that never happened.
//   · A RATE NEEDS SOMETHING TO STAND ON. With neither a beginning read from the record nor movement
//     to point at, the window shows nothing — never a confident +0.00%.
//   · A WINDOW LONGER THAN A YEAR SHOWS A YEARLY RATE, and says so (founder, 2026-09-25, after the
//     convention was checked: GIPS forbids annualising under a year and annualises above it, and
//     brokerage statements do the same). His ruling: show BOTH, and label them.
import { availableCash } from '../../../src/domain/transactions';
import { declareFigures, writeFigure } from '../_figure-spec';
import { portfolioBenchReturn, startDateFor, contractMultiplier, totalShares, windowTotal, paidOnRecord, purchaseDateOnRecord, lotCostOnRecord, worthWithInterest, closeOnOrBefore, latestClose, bondInterestInWindow, returnWithInterest, periodReturnSince, marketGap, calendarDay, returnSplitAtPurchases, type HoldingPath, type Period, type PriceSeries } from '../../../src/domain/performance';
import { formatMoney } from '../../../src/domain/_shared/money';
import { buildChangeWalk, type ChangeWalk } from '../../../src/domain/history';
import { personalFlowTotals, moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';
import { windowBounds } from '../../../Calculation Module code/engines/window-return';
import { valueOn, covers as snapshotCovers, buildDayFromAccounts, accountValuesOn, record as recordDay } from '../../../Calculation Module code/engines/snapshots';
import { timeWeightedReturn, movementsOf, type TimeWeightedVerdict } from '../../../Calculation Module code/engines/time-weighted-return';
import { dateShown, isoLocalDate } from '../../../src/domain/_shared/dates';
import { accountDisplayNames, holdingClassOf, ASSET_CLASS_LABEL } from '../../../src/domain/assets';
import { plural } from '../../../src/domain/_shared/plural';
import { isCertificateOfDeposit } from './bonds';
import { holdingRowsIn } from './holding';   // one holding's window row, asked one way (MK-PF-M-023, 2026-10-22)
import { ACCOUNT_FIGURES } from './account';

export interface WindowFigures {
  /** The first day of the window, or null for "since the record began". */
  windowStart: string | null;
  /** The records inside the window. */
  ledger: any[];
  /** How the beginning became the ending, line by line — the rows always sum to the ending. Null only when
   *  the record begins after the window opens AND no holding here has a history to work it back from
   *  (DEC-3035i, kept for that case by DEC-5291, 2026-10-13). */
  walk: ChangeWalk | null;
  /** What the measured accounts are worth today — known whether or not the walk can be drawn. */
  ending: number;
  /** The beginning as READ from the daily record, or null when the record cannot reach back. */
  measured: number | null;
  /** Whether the record reaches back to the window's first day. False → every percent here is null. */
  covered: boolean;
  /** The day the beginning value is read for — the record's first day for "since". Null on day one. */
  beginningAsOf: string | null;
  /** What the window shows: the yearly rate over a year, otherwise the total. Null when it refuses. */
  ret: number | null;
  /** The total over the window, and the yearly rate — both, always, so the screen can label them. */
  cumulative: number | null;
  perYear: number | null;
  years: number;
  /** Why a refusal, in words. Empty when nothing is refused. */
  sentence: string;
  /** Set only where the beginning is worked back from today and a holding has no price history (DEC-5068,
   *  2026-10-13; worded by DEC-6076, 2026-10-19): "Return is on the $40,000 with a price history. Treasury 2031
   *  ($10,000) has no price history, so its gains are not included." Wealth generated and Return are still shown,
   *  from the holdings with a history. Empty otherwise. */
  notIncluded: string;
  /** True where the beginning is worked back from today: a window that does not open today whose beginning the daily
   *  record cannot read — no record of these accounts at all (DEC-3656), or a record that begins too late while a
   *  holding has a price history (DEC-5291, 2026-10-13), or some accounts read and the rest worked back. Its
   *  figures are shown as the record's own are — the window is not greyed — with notIncluded beneath them (DEC-5068). */
  workedBack: boolean;
  /** Set only where the window opens before the daily record begins and is JOINED there (DEC-6412, 2026-10-19): the
   *  record's first day. The days before it are worked back from price history; from it on, the record is measured. */
  recordBegins?: string | null;
}

/** THE THREE THINGS A SCREEN NEEDED TO ASK THIS DOOR, and calculated for itself until 2026-09-30.
 *
 *  The door's own header has said since 2026-09-27 that "the return on Home's card and the return on
 *  Performance can never disagree". They did. Performance called this door; Home kept a return of its
 *  own, from price change only (corrected 2026-10-12: "price change" there was the holdings' dividend-adjusted closes,
 *  so their dividends were in it — the two differed because the method differed, DEC-4645), and the two screens showed 3.57% and 3.69% for the same month on the
 *  same household. The reason Home was never wired is that the three inputs the door needs lived
 *  inside PerformanceScreen as local helpers, so there was nothing Home could call. They live here
 *  now, and both screens call them.
 */

/** MK-NW-F-090 · The first day of a window. "Since" starts the day AFTER the record's first day —
 *  it must never fall through to a year ago, which is what made the Since walk disagree with the
 *  Since return.
 *
 *  WHY THE DAY AFTER, and it is not a detail (B-115, found 2026-09-30). The beginning of a window is
 *  read at the day BEFORE it opens. Open "Since" ON the record's first day and the beginning is asked
 *  for a day the record does not have: it comes back empty, the beginning is back-solved from the
 *  ending, and the walk reads "$130,000 became $130,000" with no return, for a household whose
 *  investments actually rose 30%. Opening the day after puts the beginning ON the first recorded day,
 *  where there is a real value to read — which is his ruling: THE BEGINNING IS READ, NEVER
 *  BACK-FILLED. The account page has always done it this way; the Performance tab did not, and the
 *  Performance tab opens on this window. */

/** The first day of a period: the day after the record's first day for Since, 1 January for This year, the same day 1, 3, 6, 12 or 24 months back for 1M, 3M, 6M, 1Y and 2Y, and nothing for a window name the app does not have (DEC-4640) — no start, so no figure. */
/* ─ MK-NW-F-090 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * windowStartKey
 *
 * Answers ..... The first day of a period: the day after the record's first day for Since, 1 January for This year, the same day 1, 3, 6, 12 or 24 months back for 1M, 3M, 6M, 1Y and 2Y, and nothing for a window name the app does not have (DEC-4640) — no start, so no figure.
 *
 * Formula .....
 *     first = record dates where ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(each)the first of , in order
 *     today   when first is missing
 *     after = the first 10 of the date date.parse(`${first}T00:00:00Z`) + 86400000).to isostring(
 *     the answer:
 *     after   if after ≤ today
 *     today   otherwise
 *     opens = start date for(period as period, new date(y, m − 1, day, 12))
 *
 * Called by ... MK-NW-F-143 gainRowBetween · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-143 gainRowBetween
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-090
 * Changed ..... 2026-09-30 (08d5d52)
 */
export function windowStartKey(period: string, recordDates: string[], today: string): string | null {
  if (period === 'SINCE') {
    const first = recordDates.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort()[0];
    if (!first) return today;
    const after = new Date(Date.parse(`${first}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    return after <= today ? after : today;
  }
  // MONTHS BACK STOP AT THE MONTH'S LAST DAY (his approval, 2026-10-10, DEC-3768b): one month before Mar 31
  // is Feb 28, never Mar 3 — the calendar used to roll a missing day into the next month. ONE RULE: the same
  // function the holdings' start date and the look-back's cut-off ask (outside review Claude Performance,
  // 2026-10-11, DEC-3768b), read on the calendar day `today` names.
  // A WINDOW NAME THE APP DOES NOT HAVE GIVES NO START (his approval, 2026-10-12, DEC-4640). It used to fall
  // to twelve months back while MK-PF-F-008 gave today for the same name. Both now ask one function, which
  // refuses a name it does not know, so whatever asked for that window shows no figure.
  const [y, m, day] = today.split('-').map(Number);
  const opens = startDateFor(period as Period, new Date(y, m - 1, day, 12));
  return opens == null ? null : isoLocalDate(opens);
}

/** THE DAYS THE RECORD HOLDS AN INVESTMENT VALUE FOR, oldest first. "Since" opens on the first of
 *  them. The record's own first day will not do: a household that entered its bank account in March
 *  and its first investment in June has a record from March, and asking it what the investments were
 *  worth in March gets nothing — so "Since" would never answer. */
/* ─ MK-NW-F-103 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * investmentRecordDates
 *
 * Answers ..... THE DAYS THE RECORD HOLDS AN INVESTMENT VALUE FOR, oldest first.
 *
 * Formula .....
 *     []   when investment account ids.size is missing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-103
 * Changed ..... not in git yet (—)
 */
export function investmentRecordDates(snapshotDays: any[], investmentAccountIds: Set<string>): string[] {
  // no investment accounts → no investment record. (To the record's reader an EMPTY set means "every
  // account", which here would count a home and a bank balance as investments.)
  if (!investmentAccountIds.size) return [];
  return (snapshotDays ?? [])
    .map(withoutBlankRows)
    .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(String(d?.date ?? '')) && valueOn([d], investmentAccountIds, d.date) != null)
    .map((d) => String(d.date).slice(0, 10))
    .sort();
}

/** WHAT THE HOLDING PAGE'S PRICE IS, SAID ON ITS BAND (MK-NW-M-029; 2026-10-21, the lead's decision under DEC-3523 tenets 1,
 *  2 and 7, over the approved drawing's live wording — outside review OpenAI, Performance re-run). The price the page shows is
 *  the latest close in the price history the app holds; there is no live quote. The band said it was live; it now says
 *  it is the last close, and its day, written by the app's one date writer: LAST CLOSE, then the date. */
/* ─ MK-NW-F-148 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * lastCloseLabel
 *
 * Answers ..... WHAT THE HOLDING PAGE'S PRICE IS, SAID ON ITS BAND (MK-NW-M-029; 2026-10-21, the lead's decision under DEC-3523 tenets 1, 2 and 7, over the approved drawing's live wording — outside review OpenAI, Performance re-run).
 *
 * Formula .....
 *     pts = series.points (or none when missing) where ÷ ^\d{4}-\d{2}-\d{2} ÷ .test(string(date ?? ''))
 *     'LAST CLOSE'   when count of pts is missing
 *     last = the first 10) ≥ string(date).slice(0, 10) ? y : x)).date).slice(0, 10 of string(pts.reduce((x, y) => (string(date)
 *     day = today   if calendar day(today) ≠ nothing and last > today
 *     last   otherwise
 *     the answer = `LAST CLOSE · ${date shown(day).to upper case()}`
 *
 * Called by ... MK-NW-F-167 COMPARE
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-148
 * Changed ..... not in git yet (—)
 */
export function lastCloseLabel(series: PriceSeries | null | undefined, today: string = isoLocalDate(new Date())): string {
  const pts = (series?.points ?? []).filter((p) => /^\d{4}-\d{2}-\d{2}/.test(String(p?.date ?? '')));
  if (!pts.length) return 'LAST CLOSE';
  const last = String(pts.reduce((x, y) => (String(y.date).slice(0, 10) >= String(x.date).slice(0, 10) ? y : x)).date).slice(0, 10);
  // NEVER A DAY AFTER THE PERSON'S OWN TODAY (2026-10-21; DEC-0189, DEC-0282 — every day in the app is the person's calendar
  // day). The price feed dates each close by the day in London (marketData.ts, toISOString), so at 8 pm in California a coin's
  // latest price — taken that evening — is dated tomorrow, and the band read OCT 22 on Oct 21. That price was taken on the
  // person's today, so the band says today; a close dated on or before today keeps its own day.
  const day = calendarDay(today) != null && last > today ? today : last;
  return `LAST CLOSE · ${dateShown(day).toUpperCase()}`;
}

/** A BALANCE NEVER ENTERED IS NOT A RECORDED VALUE (DEC-3279e, "A missing balance is never $0"; DEC-3523 tenet 3).
 *  The day's writer keeps a row for an account whose balance was left blank — no holdings, no cash, no typed value, no
 *  broker total — and the record's reader adds it as $0. Read as $0, that blank day counted as a recorded day, and
 *  typing the balance the next day read as a gain: an IRA added blank and given $20,000 the next day showed +40.00%
 *  on a $50,000 brokerage (outside review OpenAI, Performance re-run, 2026-10-21). Dropping the blank row leaves the
 *  account off that day, so it joins the record on the day its balance is entered, as money put in (DEC-4439's rule
 *  for an account that joins). A typed $0 is a value and stays. */
/* ─ MK-NW-F-149 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * withoutBlankRows
 *
 * Answers ..... A BALANCE NEVER ENTERED IS NOT A RECORDED VALUE (DEC-3279e, "A missing balance is never $0"; DEC-3523 tenet 3).
 *
 * Formula .....
 *     d   when d is missing (or !array.is array(accounts) when missing or zero)
 *     held = a list with no repeats of for each of holdings (or none when missing): string(account id)
 *     kept = accounts where held.has(string(account id)) (or typed value ≠ nothing (or a.statedTotal != null (or (a.cash ?? 0) !== 0 when missing or zero) when missing or zero) when missing or zero)
 *     the answer:
 *     d   if count of kept.length = accounts
 *     ...d = ...d
 *     accounts = kept   otherwise
 *
 * Called by ... MK-NW-F-103 investmentRecordDates · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-103 investmentRecordDates
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If cash is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-149
 * Changed ..... not in git yet (—)
 */
function withoutBlankRows(d: any): any {
  if (!d || !Array.isArray(d.accounts)) return d;
  const held = new Set((d.holdings ?? []).map((h: any) => String(h?.accountId)));
  const kept = d.accounts.filter((a: any) => held.has(String(a?.accountId)) || a?.typedValue != null || a?.statedTotal != null || (a?.cash ?? 0) !== 0);
  return kept.length === d.accounts.length ? d : { ...d, accounts: kept };
}

/** MK-NW-F-091 · What the holdings gained over the window. It is used ONLY to derive a beginning the
 *  daily record cannot reach — it never becomes the return. A holding bought inside the window counts
 *  its true gain (value − cost); one with a price history counts what the window's price move gave it;
 *  a CD stating its rate counts what that rate gave it; any other holding's gain is UNKNOWN, and the
 *  answer is null rather than $0 (DEC-3656, 2026-10-09). thePerformance asks it one holding at a time, so an
 *  unknown one adds nothing and is named, while the others still count (DEC-5068, 2026-10-13). */

/** What the holdings gained over the period in dollars: the true gain for a holding bought inside the period, the price move's share of today's value for one with a price history, the stated rate's share for a CD — and nothing (unknown) when any holding has neither. */
/* ─ MK-NW-F-091 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * pricedGainOf
 *
 * Answers ..... What the holdings gained over the period in dollars: the true gain for a holding bought inside the period, the price move's share of today's value for one with a price history, the stated rate's share for a CD — and nothing (unknown) when any holding has neither.
 *
 * Formula .....
 *     total = 0
 *     g = gain of row(r, years)
 *     nothing   when g = nothing
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · Uses a built-in total of 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-091
 * Changed ..... 2026-09-30 (08d5d52)
 */
export function pricedGainOf(rows: GainRow[], years = 0): number | null {
  let total = 0;
  for (const r of rows ?? []) {
    const g = gainOfRow(r, years);
    if (g == null) return null;   // one holding whose gain cannot be known makes the total unknown (DEC-3656, 2026-10-09)
    total += g;
  }
  return total;
}

/** One holding, as the gain over a window is asked of it. `couponRate` is set only for a CD that states
 *  its rate (a position carries none); `name` is what the refusal sentence calls it. (DEC-3656, 2026-10-09) */
export type GainRow = {
  name?: string;
  cappedSince?: string | null;
  gain?: number;
  periodReturn?: number | null;
  marketValue?: number;
  couponRate?: number | null;
  position?: { position_id?: string | number; ticker?: string; label?: string; name?: string; kind?: string; asset_class?: string; multiplier?: number; last_price?: number; value_now?: number; lots?: { shares?: number }[] };
  /** The window's own total, never a yearly rate — buildPerformance writes it beside periodReturn. Where it is
   *  absent and the window is longer than a year, periodReturn is read as a yearly rate (outside review Claude
   *  Performance, 2026-10-11, MK-NW-F-091). */
  periodTotal?: number | null;
  /** A bond's or CD's interest in the window, already inside periodReturn and periodTotal (DEC-6212). Its value at the
   *  start is (value today + this) ÷ (1 + its window total), and what it gained is the price change plus this. */
  interest?: number | null;
  /** What the holding was worth when the window began, as buildPerformance (or gainRowBetween) read it (2026-10-21): the
   *  same figure as (value today + interest) ÷ (1 + its window total) wherever that can be divided — read instead where the
   *  holding is worth $0 today, so what it lost is counted, never left out (tenet 4). */
  startValue?: number | null;
  /** What was paid for shares bought inside the window (buildPerformance, 2026-10-21; DEC-3656) — for a holding bought inside
   *  it, every purchase in it (2026-10-22): null where one of them has no price paid on record; absent where it bought none. */
  paidInside?: number | null;
  /** What its sales inside the window brought in (buildPerformance, 2026-10-22; DEC-3656): null where a sale has no price and no
   *  amount on record; absent where it sold nothing in the window. */
  soldInside?: number | null;
  /** Bought inside the window but held when it began too (sold out, then bought again): what the shares held then were worth
   *  (buildPerformance, 2026-10-22). */
  heldAtStart?: number | null;
  /** Its value across the window on the days money went into any holding built beside it (buildPerformance, 2026-10-21;
   *  DEC-1669) — read where the holdings' return is split at those days (classReturnOf). */
  path?: HoldingPath;
};

/** THE ONE RULE FOR WHAT A HOLDING GAINED OVER THE WINDOW (DEC-3656, 2026-10-09), or null when it cannot
 *  be known. Bought inside the window: value − cost. A price history: the window's price move. A CD with
 *  a stated rate: value now × (1 − 1 ÷ (1 + rate)^years). Nothing held: nothing gained. Anything else
 *  held — no price history, no rate — is unknown, never $0 (tenet: unknown is not zero). */
/* ─ MK-NW-F-127 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * gainOfRow
 *
 * Answers ..... THE ONE RULE FOR WHAT A HOLDING GAINED OVER THE WINDOW (DEC-3656, 2026-10-09), or null when it cannot be known.
 *
 * Formula .....
 *     nothing   when market value = nothing (or paid inside = nothing (or sold inside = nothing (or held at start = nothing when missing or zero) when missing or zero) when missing or zero)
 *     the answer = worth with interest(r) + (sold inside ?? 0) − paid inside − (held at start ?? 0)
 *     mv = market value (or 0 when missing)
 *     pr = window total(period return, period total, years)
 *     worth with interest(r) × (1 − 1 ÷ (1 + pr))   when mv > 0
 *     worth with interest(r) − start value   if start value > 0
 *     0   otherwise   when start value ≠ nothing
 *     nothing   when (position as any).sold out
 *     mv × (1 − 1 ÷ math.pow(1 + coupon rate, years))   if mv > 0
 *     0   otherwise   when coupon rate ≠ nothing and number.is finite(coupon rate) and coupon rate ≥ 0
 *     0   when position and holding class of(position) = 'cash'
 *     shares = total shares({ lots: position.lots ?? [] } as any)   if position
 *     0   otherwise
 *
 * Called by ... MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-012 bond coupon rate
 *
 * Decides .....
 *     · If sold inside is missing it uses 0.
 *     · If held at start is missing it uses 0.
 *     · If gain is missing it uses 0.
 *     · If interest is missing it uses 0.
 *     · If market value is missing it uses 0.
 *     · If paid inside is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-127
 * Changed ..... not in git yet (—)
 */
function gainOfRow(r: GainRow, years: number): number | null {
  // A BOND'S OR CD'S GAIN IS ITS PRICE CHANGE PLUS THE INTEREST IT PAID IN THE WINDOW (DEC-6212, 2026-10-19)
  if (r.cappedSince) {
    // BOUGHT INSIDE THE WINDOW, WITH EVERY PURCHASE AND SALE IN IT ON THE ROW (2026-10-22; DEC-3656): its value today + interest
    // + what its sales brought in − everything it paid in the window. A sale used to vanish: 10 bought at $100, 5 sold at $120,
    // 5 left at $130 gained $150 on the 5 still held and the $100 the sale made was left out of the beginning. What it paid
    // not on record, or its value not known: what it gained is not known, and it is named (tenet 3) — it read $0.
    if (r.paidInside !== undefined) {
      if (r.marketValue == null || r.paidInside == null || r.soldInside === null || r.heldAtStart === null) return null;
      return worthWithInterest(r) + (r.soldInside ?? 0) - r.paidInside - (r.heldAtStart ?? 0);
    }
    return (r.gain ?? 0) + (r.interest ?? 0);
  }
  const mv = r.marketValue ?? 0;
  // THE WINDOW'S OWN TOTAL, never a yearly rate: over 2Y a holding's period return is a yearly rate, and read as
  // the window's total it worked the gain back one year, not two — $12,100 at 10% a year gained $2,100, it read
  // $1,100 (outside review Claude Performance, 2026-10-11, MK-NW-F-091/F-127). One rule: windowTotal.
  const pr = windowTotal(r.periodReturn, r.periodTotal, years);
  // (value today + interest) × (1 − 1 ÷ (1 + total)) = (value today + interest) − value at the start (DEC-6212)
  if (pr != null) {
    // SHARES BOUGHT INSIDE THE WINDOW BY A HOLDING HELD WHEN IT BEGAN (2026-10-21; DEC-3656: "today's value less what each
    // holding gained, less the money moved"; outside re-run OpenAI part 1, MK-NW-F-091 / MK-NW-F-127). Its start is what the
    // shares held then were worth (startValue), and the money paid for the rest is not a gain: 10 held at $100, 10 more bought
    // at $110, now 20 at $121 → $2,420 − $1,000 − $1,100 = $320. Worked back from today's 20 shares ($2,420 ÷ 1.21 = $2,000) it
    // read $420 and a beginning that never was. A purchase whose price paid is not on record: what it gained is unknown (tenet 3).
    // AND SHARES SOLD INSIDE THE WINDOW (2026-10-22): its start counts them (they were held then), and what they brought in is
    // part of what it has to show — 20 held at $100, 10 sold at $110, 10 left at $121 → $1,210 − $2,000 + $1,100 = $310; from
    // today's 10 shares it read $210 and a beginning $100 too high. A sale with no price or amount on record: unknown.
    if (r.paidInside !== undefined || r.soldInside !== undefined) {
      return r.paidInside === null || r.soldInside === null || r.startValue == null ? null
        : worthWithInterest(r) - r.startValue - (r.paidInside ?? 0) + (r.soldInside ?? 0);
    }
    if (mv > 0) return worthWithInterest(r) * (1 - 1 / (1 + pr));
    // WORTH $0 TODAY IS A VALUE, NOT A MISSING ONE (2026-10-21; DEC-5068, tenet 4). A holding that was worth something
    // when the window began lost it: (value today + interest) − its start, the start buildPerformance read (startValue).
    // This read $0, so a holding that fell from $1,000 to $0 vanished from Wealth generated. Worth $0 then too: it held
    // nothing. Down 100% from a start nobody wrote down: unknown, and named (tenet 3) — never $0.
    if (r.startValue != null) return r.startValue > 0 ? worthWithInterest(r) - r.startValue : 0;
    return pr > -1 ? 0 : null;
  }
  // SOLD IN FULL INSIDE THE WINDOW, WITH NO FIGURE FOR IT (2026-10-22; tenet 3): with no prices to say what it was worth when the
  // window began, what it gained is not known — it holds nothing today, and that is not a gain of $0
  if ((r.position as any)?.sold_out) return null;
  // AN ENTERED 0% IS A RATE OF 0%, gaining $0; a rate never entered (null) stays unknown below (DEC-2748b, 2026-10-12:
  // "a typed 0 rate is a zero-coupon bond" / "a face value or rate that was never entered stays blank")
  if (r.couponRate != null && Number.isFinite(r.couponRate) && r.couponRate >= 0) return mv > 0 ? mv * (1 - 1 / Math.pow(1 + r.couponRate, years)) : 0;
  // CASH GAINS NOTHING, and is not a holding with no price history (DEC-5291, 2026-10-13): a cash position with no
  // price series of its own gained $0 and is never named as left out. A money-market FUND with prices is measured above.
  if (r.position && holdingClassOf(r.position) === 'cash') return 0;   // the one order (MK-NW-F-109), not the stored tag alone
  // holds nothing: gained nothing. Holds something, or holds shares no one has priced: unknown (DEC-3656). Shares worth
  // $0 hold something (2026-10-21, tenet 3: a known $0 is a value, never "nothing held"): with no price history, what they
  // were worth when the window began is unknown, so the holding is named — it read as holding nothing and was not.
  const shares = r.position ? totalShares({ lots: r.position.lots ?? [] } as any) : 0;
  return heldValueOf(r) === 0 && shares === 0 ? 0 : null;
}

/** What a holding is worth when no price series prices it: the broker's last mark × shares, or the value
 *  it was built at by hand. Used ONLY to tell "holds something" from "holds nothing". (DEC-3656, 2026-10-09) */
/* ─ MK-NW-F-128 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * heldValueOf
 *
 * Answers ..... What a holding is worth when no price series prices it: the broker's last mark × shares, or the value it was built at by hand.
 *
 * Formula .....
 *     market value   when market value ≠ nothing and number.is finite(market value) and market value ≥ 0
 *     p = position
 *     0   when p is missing
 *     shares = total shares({ lots: lots ?? [] } as any)
 *     nothing   if shares = nothing
 *     shares × last price × contract multiplier(p)   otherwise   when last price ≠ nothing
 *     value now   when value now ≠ nothing
 *     the answer:
 *     0   if shares = 0
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-088 BENCH · MK-NW-F-127 gainOfRow
 *               MK-NW-F-139 leftOutValueOf · MK-NW-F-144 beforeTheRecordSentence
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-127 gainOfRow · MK-NW-F-139 leftOutValueOf
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-128
 * Changed ..... not in git yet (—)
 */
function heldValueOf(r: GainRow): number | null {
  // A KNOWN $0 IS A VALUE (2026-10-21; DEC-3523 tenets 3 and 4; outside re-run OpenAI part 1, MK-NW-F-128): a row whose own
  // value is $0 (its latest close is $0) read the broker's older mark instead — 10 × $20 = $200 beside a row reading $0.
  // The row's value wins at $0 too; only a value not on record falls back to the mark or the value it was built at.
  if (r.marketValue != null && Number.isFinite(r.marketValue) && r.marketValue >= 0) return r.marketValue;
  const p = r.position;
  if (!p) return 0;
  // the one count of shares (MK-PF-F-001): unknown when a purchase has no share count
  const shares = totalShares({ lots: p.lots ?? [] } as any);
  // × THE CONTRACT MULTIPLIER (DEC-0274: "options: value = contracts × 100 × price"): three contracts at $2.10
  // are $630, they read $6.30 (outside review Claude Performance, 2026-10-11)
  if (p.last_price != null) return shares == null ? null : shares * p.last_price * contractMultiplier(p);
  if (p.value_now != null) return p.value_now;
  // SHARES WITH NO PRICE ARE NOT "HOLDS NOTHING": their worth is unknown, so DEC-3656's refusal names the holding
  // (tenet 3, DEC-3523) — they read $0 and gained $0 (outside review Claude Performance, 2026-10-11)
  return shares === 0 ? 0 : null;
}

/** What the sentence calls a holding: its own name, else its ticker — a CUSIP-shaped ticker gives way
 *  to the security's name. (DEC-3656, 2026-10-09; the sentence is DEC-5068's since 2026-10-13) */
/* ─ MK-NW-F-129 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * gainRowName
 *
 * Answers ..... What the sentence calls a holding: its own name, else its ticker — a CUSIP-shaped ticker gives way to the security's name.
 *
 * Formula .....
 *     name   when name
 *     t = (position.ticker ?? '').trim()
 *     nm = (position.label ?? position.name ?? '').trim()
 *     the answer:
 *     nm   if ÷ ^[0 − 9A − Z]{9}$ ÷ test(t) and ÷ \d ÷ .test(t) and nm
 *     t (or nm (or 'a holding' when missing or zero) when missing or zero)   otherwise
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-129
 * Changed ..... not in git yet (—)
 */
function gainRowName(r: GainRow): string {
  if (r.name) return r.name;
  const t = (r.position?.ticker ?? '').trim();
  const nm = (r.position?.label ?? r.position?.name ?? '').trim();
  // a CUSIP sent in lower case is still a CUSIP (outside review Claude Performance, 2026-10-11, DEC-3656)
  return /^[0-9A-Z]{9}$/i.test(t) && /\d/.test(t) && nm ? nm : (t || nm || 'a holding');
}

/** THE SENTENCE where a holding with no price history is left out of Wealth generated and Return (DEC-5068,
 *  2026-10-13, his wording with the holding's name in place of "treasury"). */
/* ─ MK-NW-F-130 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * notIncludedSentence
 *
 * Answers ..... THE SENTENCE where a holding with no price history is left out of Wealth generated and Return (DEC-5068, 2026-10-13, his wording with the holding's name in place of "treasury").
 *
 * Formula .....
 *     by name = new map<string, number | nothing>()
 *     n = string(name ?? '').trim()
 *     was = by name.get(n)!   if by name.has(n)
 *     0   otherwise
 *     once = [...by name.keys()]
 *     values = for each of group: value (or nothing when missing)
 *     left value = values.reduce((t: number, v) => t + (v as number), 0)   if values.length and values.every((v) => v ≠ nothing)
 *     nothing   otherwise
 *     n = 2   if once.length > 1
 *     1   otherwise
 *     who = `${list} (${write figure(PERFORMANCE_FIGURES['MK − PF − M − 022'], left value)})`   if left value ≠ nothing
 *     list   otherwise
 *     said = `${plural(n, 'has', who)} ${what}, ${plural(n, 'its', 'so')} gains are not included.`
 *     the answer:
 *     `A${said.slice(1)}`   if list = 'a holding'
 *     said   otherwise
 *
 * Called by ... MK-NW-F-144 beforeTheRecordSentence · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-130
 * Changed ..... not in git yet (—)
 */
function notIncludedSentence(left: { name: string; value: number | null; why?: 'history' | 'paid' | 'sale' }[], countedValue: number): string {
  // HIS WORDING (DEC-6076, 2026-10-19, "approved.", after "State D - for summary box - we need to explain that 10%
  // return is on 40K and not 50K."): the first sentence names the dollars the return is on — the holdings
  // knownHoldingsReturn (MK-NW-F-138) counts — and the second names what is left out with its value today. Each
  // amount is written by the one figure writer under its own figure (MK-PF-M-021, MK-PF-M-022). has / have and
  // its / their come from the one list of words and plurals (DEC-4082). Where NO holding is counted there is no
  // return to explain, so only the second sentence is said (never "Return is on the $0").
  // THE TRUE REASON FOR EACH ONE LEFT OUT (2026-10-22; tenets 1 and 3, canon row 24): a holding with a price history whose
  // purchase in the window has no price paid on record was named as having no price history. It is named for what is
  // missing: no price history; a purchase with no price paid on record; a sale with no amount in your records — one
  // sentence for each reason, in that order, each naming its holdings and their value today.
  const sentence = (group: { name: string; value: number | null }[], why: 'history' | 'paid' | 'sale'): string => {
    // one fund held in two accounts is named once, its values added (outside review Claude Performance, 2026-10-11). A
    // blank name is no name: it is dropped before the names are counted (outside review OpenAI re-run part 4,
    // MK-NW-F-130, SETTLED 2026-10-13). Names all blank still give the sentence, about "a holding".
    const byName = new Map<string, number | null>();
    for (const r of group) {
      const n = String(r?.name ?? '').trim();
      if (n === '') continue;
      const was = byName.has(n) ? byName.get(n)! : 0;
      byName.set(n, was == null || r.value == null ? null : was + r.value);
    }
    const once = [...byName.keys()];
    const list = once.length <= 1 ? (once[0] ?? 'a holding')
      : `${once.slice(0, -1).join(', ')} and ${once[once.length - 1]}`;
    const values = group.map((r) => r?.value ?? null);
    const leftValue = values.length && values.every((v) => v != null) ? values.reduce((t: number, v) => t + (v as number), 0) : null;
    const n = once.length > 1 ? 2 : 1;
    const who = leftValue != null ? `${list} (${writeFigure(PERFORMANCE_FIGURES['MK-PF-M-022'], leftValue)})` : list;
    const what = why === 'paid' ? `${n === 1 ? 'a ' : ''}${plural(n, 'purchase', '').trim()} with no price paid on record`
      : why === 'sale' ? `${n === 1 ? 'a ' : ''}${plural(n, 'sale', '').trim()} with no amount in your records`
      : 'no price history';
    const said = `${plural(n, 'has', who)} ${what}, ${plural(n, 'its', 'so')} gains are not included.`;
    // a sentence that opens on the generic name opens with a capital; a holding's own name is printed as it is
    return list === 'a holding' ? `A${said.slice(1)}` : said;
  };
  const said = (['history', 'paid', 'sale'] as const)
    .map((why) => ({ why, group: (left ?? []).filter((r) => (r?.why ?? 'history') === why) }))
    .filter((x) => x.group.length > 0)
    .map((x) => sentence(x.group, x.why)).join(' ') || sentence([], 'history');
  return countedValue > 0
    ? `Return is on the ${writeFigure(PERFORMANCE_FIGURES['MK-PF-M-021'], countedValue)} with a price history. ${said}`
    : said;
}

/** MK-NW-F-092 · Which accounts this door measures: the invested ones. Cash and property are not
 *  investments, and an account left out here is an account whose dividends never reach the return. */

/** Which accounts count as investments: those holding stocks and funds, bonds and CDs, alternatives or a mix, and never cash or property. */
/* ─ MK-NW-F-092 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * investmentAccountIdsOf
 *
 * Answers ..... Which accounts count as investments: those holding stocks and funds, bonds and CDs, alternatives or a mix, and never cash or property.
 *
 * Formula .....
 *     invested = a list with no repeats of ['stocks_etf', 'bonds', 'alternatives', 'mixed']
 *     the answer = a list with no repeats of accounts (or none when missing) where invested.has(class of(each))for each of : string(asset id)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-092
 * Changed ..... 2026-09-30 (08d5d52)
 */
export function investmentAccountIdsOf(
  accounts: { asset_id?: string | number }[],
  classOf: (a: any) => string,
): Set<string> {
  const invested = new Set(['stocks_etf', 'bonds', 'alternatives', 'mixed']);
  return new Set((accounts ?? []).filter((a) => invested.has(classOf(a))).map((a) => String(a.asset_id)));
}

/** THE RETURN OF THE HOLDINGS WHOSE GROWTH IS KNOWN, where the beginning is worked back from today
 *  (DEC-5068, 2026-10-13: "Wealth Generated and Return should be calculated and displayed for every asset with
 *  history"). The same method as each category's return (MK-NW-F-084): each holding's start = its value now ÷
 *  (1 + its own return over the WHOLE window), and the answer is Σ values now ÷ Σ starts − 1. A holding's return
 *  is time-weighted by its daily prices, and its dividends are in the adjusted closes once (DEC-4644). A CD
 *  stating its rate grows by (1 + rate)^years − 1 (DEC-3656). A holding with no price history and no rate is
 *  LEFT OUT — never counted at 0% — and with none left the answer is null. A holding worth $0 today is counted at the
 *  start it was read at (2026-10-21): a known $0 is $0. */
/* ─ MK-NW-F-138 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * knownHoldingsReturn
 *
 * Answers ..... THE RETURN OF THE HOLDINGS WHOSE GROWTH IS KNOWN, where the beginning is worked back from today (DEC-5068, 2026-10-13: "Wealth Generated and Return should be calculated and displayed for every asset with history").
 *
 * Formula .....
 *     pr = window total(period return, period total, years)
 *
 * Called by ... MK-NW-F-130 notIncludedSentence · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-130 notIncludedSentence · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-012 bond coupon rate
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-138
 * Changed ..... not in git yet (—)
 */
export function knownHoldingsReturn(rows: GainRow[], years = 0): number | null {
  // THE SAME METHOD AS EACH CATEGORY'S RETURN, BY ONE FUNCTION (2026-10-21; the standard "how an account is classed and
  // counted": "… the same method as each category's return"): it was written out twice, here and in classReturnOf, and
  // only one of them would have learned to split the window at a purchase (DEC-1669). Each holding's own total over the
  // window, or a CD's stated rate grown over the years; one with neither is left out, never read as 0. A holding worth
  // $0 today, down 100%, counts at the start buildPerformance read (DEC-5068, tenet 4); worth $0 then too, or no start
  // written, it is left out.
  return classReturnOf((rows ?? []).map((r) => {
    const pr = windowTotal(r.periodReturn, r.periodTotal, years);
    const total = pr != null ? pr
      : r.couponRate != null && Number.isFinite(r.couponRate) && r.couponRate >= 0 ? Math.pow(1 + r.couponRate, years) - 1
      : null;
    // a holding bought inside the window starts from what it was measured from; the real start is a held one's (2026-10-22)
    return { marketValue: r.marketValue, interest: r.interest, total, startValue: r.startValue, path: r.path,
      paidInside: r.cappedSince ? undefined : r.paidInside, soldInside: r.cappedSince ? undefined : r.soldInside };
  }));
}

/** WHY A RETURN CANNOT BE MEASURED, in words a person reads. One sentence per reason, written once,
 *  so the Performance tab, an account's own page and Home say the same thing about the same refusal.
 *  A time-weighted return is never replaced by another kind of figure (owner, 2026-10-04): where it
 *  cannot be measured the screen shows no percent and this sentence, and the dollar figures stand. */
/* ─ MK-NW-F-105 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * whyNoReturn
 *
 * Answers ..... WHY A RETURN CANNOT BE MEASURED, in words a person reads.
 *
 * Formula .....
 *     ''   when v is missing (or rate ≠ nothing when missing or zero)
 *     on = date shown(day)   if day
 *     ''   otherwise
 *     what = 'A dividend'   if kind = 'DIVIDEND'
 *     'A coupon'   if kind = 'COUPON'
 *     'Interest'   otherwise   otherwise
 *     line = 'Dividends'   if kind = 'DIVIDEND'
 *     'Interest'   otherwise
 *     the answer = `${what} on ${on} has no amount in your records, so a return cannot be measured across that day. the ${line} line does not count it.`
 *     what = write figure(ACCOUNT_FIGURES['MK − NW − M − 062'], amount)   if amount ≠ nothing
 *     'an activity'   otherwise
 *     called = `as "${word}", a kind of activity the app does not know`   if word
 *     'with no word for what it was'   otherwise
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-105
 * Changed ..... not in git yet (—)
 */
export function whyNoReturn(v: TimeWeightedVerdict | null): string {
  if (!v || v.rate != null) return '';
  const on = v.day ? dateShown(v.day) : '';
  switch (v.refused) {
    case 'MOVEMENT_DAY_NOT_RECORDED': return `Money moved in or out on ${on} and no value was recorded that day, so a return cannot be measured across it. The dollar figures here are still right.`;
    case 'MOVEMENT_HAS_NO_DATE': return 'A deposit or withdrawal in your records has no date, so a return cannot be measured. The dollar figures here are still right.';
    case 'SHARES_MOVED': return `Shares were moved in or out on ${on}, and your records do not say what they were worth that day, so a return cannot be measured across it. The dollar figures here are still right.`;
    // NOTHING TO GROW FROM (DEC-4439, 2026-10-11): money now counts for its whole day, so a first deposit into
    // a new account is measured and a value below the money just added is a loss, measured — their two old
    // sentences went with the old refusal. What is left is the link with nothing under it (DEC-0316: refuse
    // when the denominator is zero or less), and the words say which of its two states is true (DEC-3523 tenet 1).
    case 'NOTHING_TO_GROW_FROM': return v.moreTakenOutThanThere
      ? `More money was taken out on ${on} than was there the evening before plus the money added that day, so a return cannot be measured across it. The dollar figures here are still right.`
      : `A value was recorded on ${on} with nothing there the evening before and no money added that day, so a return cannot be measured across it. The dollar figures here are still right.`;
    // a deposit or withdrawal whose amount is not on record: the dollars it moved are unknown too, so this
    // sentence does not say the dollar figures stand (outside review Claude Performance, 2026-10-11, DEC-3523)
    case 'MOVEMENT_HAS_NO_AMOUNT': return `A deposit or withdrawal on ${on} has no amount in your records, so a return cannot be measured across it.`;
    // INTEREST, A DIVIDEND OR A COUPON WITH NO AMOUNT ON RECORD (2026-10-21, DEC-3523 tenet 3: unknown is not zero). The
    // record is named by its kind and its day, so the person can find it in ACTIVITY, where it shows a dash; the walk's
    // line for it does not count it, and the sentence says so rather than that the dollar figures stand.
    case 'INCOME_HAS_NO_AMOUNT': {
      const what = v.kind === 'DIVIDEND' ? 'A dividend' : v.kind === 'COUPON' ? 'A coupon' : 'Interest';
      const line = v.kind === 'DIVIDEND' ? 'Dividends' : 'Interest';
      return `${what} on ${on} has no amount in your records, so a return cannot be measured across that day. The ${line} line does not count it.`;
    }
    // A RECORD THE APP COULD NOT NAME (2026-10-20, Q15 — the institution-word rule). The broker's own word is said, so the
    // person can tell which record to label; the amount is written by the one writer of a record's amount (MK-NW-M-062).
    // It does not say the dollar figures stand: until it is named, money that moved by it sits in no line of its own.
    case 'ACTIVITY_NOT_KNOWN': {
      const what = v.amount != null ? writeFigure(ACCOUNT_FIGURES['MK-NW-M-062'], v.amount) : 'an activity';
      const called = v.word ? `as "${v.word}", a kind of activity the app does not know` : 'with no word for what it was';
      return `Your broker recorded ${what}${on ? ` on ${on}` : ''} ${called}, so a return cannot be measured across that day. It is not counted as money put in or taken out.`;
    }
    case 'NOTHING_INVESTED': return 'Nothing was invested over this period, so there is no return to state.';
    case 'END_NOT_RECORDED': return 'Today’s value is not in your records yet, so a return cannot be measured.';
    // A VALUE BELOW ZERO (2026-10-21, DEC-3523 tenet 1; MK-PF-M-017): it read −100.00%, as if the money were merely gone. The
    // day is named, so the person can find it; what is owed and what is held still add up in the dollar lines.
    case 'VALUE_BELOW_ZERO': return `The value recorded on ${on} is below $0, so a return cannot be measured across that day. The dollar figures here are still right.`;
    default: return '';
  }
}

/** HOW LONG A WINDOW LONGER THAN A YEAR IS, IN THE WORDS ITS YEARLY-RATE LINE SAYS ("+16.69% over the two years, which is
 *  +8.00%/year"): "two years" for a 2Y window, else its years to one decimal. One writer, so the Performance tab and the
 *  account page say the same window the same way (2026-10-21, MK-PF-M-016; the words are the Performance tab's own). */
/* ─ MK-NW-F-162 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * yearsWords
 *
 * Answers ..... HOW LONG A WINDOW LONGER THAN A YEAR IS, IN THE WORDS ITS YEARLY-RATE LINE SAYS ("+16.69% over the two years, which is +8.00%/year"): "two years" for a 2Y window, else its years to one decimal.
 *
 * Formula .....
 *     'two years'   if years ≥ 1.9 and years < 2.1
 *     `${years.to fixed(1)} years`   otherwise
 *
 * Called by ... MK-NW-F-174 overTheYearsSentence
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-174 overTheYearsSentence
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Shows 1 decimal place.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-162
 * Changed ..... not in git yet (—)
 */
export function yearsWords(years: number): string {
  return years >= 1.9 && years < 2.1 ? 'two years' : `${years.toFixed(1)} years`;
}

/** THE ONE SENTENCE FOR A WINDOW LONGER THAN A YEAR (DEC-0237, DEC-0404; his precision order Q49): the window's own total,
 *  then the yearly rate it makes, said as one — "+32.41% over the two years, which is +15.05%/year" (Performance v17, phone
 *  3). The caller hands in each figure already written by its own writer (on screen with "/year", spoken with "a year"), so
 *  one sentence serves the summary, every account row and the account page. Null when the window is not made yearly. */
/* ─ MK-NW-F-174 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * overTheYearsSentence
 *
 * Answers ..... THE ONE SENTENCE FOR A WINDOW LONGER THAN A YEAR (DEC-0237, DEC-0404; his precision order Q49): the window's own total, then the yearly rate it makes, said as one — "+32.41% over the two years, which is +15.05%/year" (Performance v17, phone 3).
 *
 * Formula .....
 *     nothing   when per year = nothing (or cumulative = nothing when missing or zero)
 *     `${write(cumulative)} over the ${years words(years)}, which is ${write(per year, 'year')}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-174
 * Changed ..... not in git yet (—)
 */
export function overTheYearsSentence(f: { cumulative: number | null; perYear: number | null; years: number },
  write: (v: number, per?: 'year') => string): string | null {
  if (f.perYear == null || f.cumulative == null) return null;
  return `${write(f.cumulative)} over the ${yearsWords(f.years)}, which is ${write(f.perYear, 'year')}`;
}

/** The daily record with today added to it, worth what the caller says the measured accounts are worth now. */
/* ─ MK-NW-F-104 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * closedWith
 *
 * Answers ..... The daily record with today added to it, worth what the caller says the measured accounts are worth now.
 *
 * Formula .....
 *     last = [...days] where date < today.sort((x, y) => string(date).locale compare(string(date))).pop()
 *     days   when last is missing
 *     members = [...new set([...(last.holdings ?? []), ...(last.accounts ?? [])].map((r: any) => string(account id)).filter((id) => ids.size = 0 or ids.has(id)))]
 *     days   when count of members is missing
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-104
 * Changed ..... not in git yet (—)
 */
function closedWith(days: any[], ids: Set<string>, today: string, ending: number): any[] {
  const last = [...days].filter((d) => d?.date < today).sort((x, y) => String(x.date).localeCompare(String(y.date))).pop();
  if (!last) return days;
  const members = [...new Set([...(last.holdings ?? []), ...(last.accounts ?? [])].map((r: any) => String(r.accountId)).filter((id) => ids.size === 0 || ids.has(id)))];
  if (!members.length) return days;
  return [...days, { date: today, origin: 'observed', writtenAt: `${today}T00:00:00Z`, holdings: [],
    accounts: members.map((accountId, i) => ({ date: today, accountId, cash: 0, statedTotal: null, typedValue: i === 0 ? ending : 0, currency: 'USD' })) }];
}

/** WHAT ONE HOLDING DID OVER THE DAYS BEFORE THE DAILY RECORD BEGINS (DEC-6412, 2026-10-19): from the evening before the
 *  window (`from`) to the record's first day (`to`), read from its price history. Answers the holding as it stood on
 *  that first day — its value then (the shares held that day × that day's close), and its return over those days: the
 *  close then ÷ the close the evening before the window − 1 (its first close, where its prices begin inside those
 *  days), a purchase made inside those days counted at what was
 *  paid, and a bond's or CD's interest paid in those days added (DEC-6212). Null when the holding was not yet held on
 *  the first day: it bought in later, so it has no part in those days. A holding whose prices do not reach both days
 *  comes back with no return — its gain over those days is unknown, and gainOfRow decides (cash $0, else unknown). */
/* ─ MK-NW-F-143 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * gainRowBetween
 *
 * Answers ..... WHAT ONE HOLDING DID OVER THE DAYS BEFORE THE DAILY RECORD BEGINS (DEC-6412, 2026-10-19): from the evening before the window (`from`) to the record's first day (`to`), read from its price history.
 *
 * Formula .....
 *     price series | nothing | undefined,
 *
 * Called by ... MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If market value is missing it uses 0.
 *     · If close from is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-143
 * Changed ..... not in git yet (—)
 */
function gainRowBetween(r: GainRow, from: string, to: string, priceOf: (ticker: string) => PriceSeries | null | undefined,
  transactions: any[], accounts: any[]): GainRow | null {
  const p = r.position as any;
  // the row's money paid inside the window and its path across it are the whole window's, not these days' (2026-10-21): here
  // a purchase inside these days is in the start at what was paid, so what it gained is its value then less that start
  const unknown: GainRow = { ...r, periodReturn: null, periodTotal: null, interest: null, gain: undefined, cappedSince: null, startValue: null,
    paidInside: undefined, soldInside: undefined, heldAtStart: undefined, path: undefined };
  if (!p) return unknown;
  const lots = ((p.lots ?? []) as any[]).filter((l) => Number(l?.shares) > 0);
  // the day each purchase was made: its own date, else the stand-in the window used (a holding bought inside it), else
  // held from before the window
  // the one reading of a purchase date (purchaseDateOnRecord, 2026-10-21): 31 February is not on record, as a missing date is
  const boughtOn = (l: any): string | null => purchaseDateOnRecord(l?.purchase_date) ?? (r.cappedSince ?? null);
  const before = lots.filter((l) => { const d = boughtOn(l); return d == null || d <= from; });
  const inside = lots.filter((l) => { const d = boughtOn(l); return d != null && d > from && d <= to; });
  if (!lots.length && r.cappedSince && r.cappedSince > to) return null;
  if (lots.length && !before.length && !inside.length) return null;
  const series = p.ticker ? priceOf(String(p.ticker)) : null;
  // PRICES THAT BEGIN INSIDE THOSE DAYS are measured from their first close, the rule every window already uses for a
  // holding whose prices begin late (MK-PF-F-039); prices that begin after the record's first day reach none of them
  const firstPoint = [...(series?.points ?? [])].filter((x) => /^\d{4}-\d{2}-\d{2}/.test(String(x?.date ?? ''))).sort((x, y) => String(x.date).localeCompare(String(y.date)))[0];
  const closeTo = closeOnOrBefore(series, to);
  const closeFrom = closeOnOrBefore(series, from) ?? (firstPoint && String(firstPoint.date).slice(0, 10) <= to ? firstPoint.close : null);
  if (closeTo == null || (closeFrom == null && (before.length || !lots.length))) return unknown;
  const mult = contractMultiplier(p);
  let valueThen: number, start: number;
  if (!lots.length) {
    // no purchases on file: today's value, priced back to that day
    const now = latestClose(series);
    if (now == null || !(now > 0) || !((r.marketValue ?? 0) > 0) || closeFrom == null) return unknown;
    valueThen = (r.marketValue as number) * closeTo / now;
    start = (r.marketValue as number) * closeFrom / now;
  } else {
    const sh = (xs: any[]) => xs.reduce((t, l) => t + Number(l.shares), 0);
    // a cost read ONE way (lotCostOnRecord, 2026-10-21): a purchase inside the window saved at $0 is not on record — it began at $0
    // …and is named for that reason, not for a price history it has (2026-10-22, canon row 24): paidInside null says so
    if (inside.some((l) => !lotCostOnRecord(l))) return { ...unknown, paidInside: null };
    valueThen = (sh(before) + sh(inside)) * closeTo * mult;
    start = sh(before) * (closeFrom ?? 0) * mult + inside.reduce((t, l) => t + Number(l.shares) * l.cost_per_share, 0) * mult;
  }
  if (!(start > 0)) return unknown;
  const after = windowStartKey('SINCE', [to], '9999-12-31')!;
  const paidFrom = bondInterestInWindow(p, transactions, windowStartKey('SINCE', [from], '9999-12-31'), accounts);
  const interest = paidFrom == null ? null : paidFrom - (bondInterestInWindow(p, transactions, after, accounts) ?? 0);
  // worth $0 on the last of those days, its interest is counted on its start (returnWithInterest, 2026-10-21)
  const total = returnWithInterest(valueThen / start - 1, valueThen, interest, start);
  // its value at the start of those days rides with it (2026-10-21): a holding worth $0 on the record's first day lost it,
  // and the days before count that loss rather than leaving the holding out (tenet 4)
  return { ...r, marketValue: valueThen, periodReturn: total, periodTotal: total, interest, gain: undefined, cappedSince: null, startValue: start,
    paidInside: undefined, soldInside: undefined, heldAtStart: undefined, path: undefined };
}

/** THE LEFT-OUT SENTENCE WHERE A WINDOW IS JOINED AT THE RECORD'S FIRST DAY (DEC-6412, 2026-10-19): DEC-6076's sentence,
 *  word for word, said of the days before the record begins — only those days are worked back from price history. */
/* ─ MK-NW-F-144 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * beforeTheRecordSentence
 *
 * Answers ..... THE LEFT-OUT SENTENCE WHERE A WINDOW IS JOINED AT THE RECORD'S FIRST DAY (DEC-6412, 2026-10-19): DEC-6076's sentence, word for word, said of the days before the record begins — only those days are worked back from price history.
 *
 * Formula .....
 *     `before ${date shown(record begins)}, when the daily record begins: ${not included sentence(left, counted value)}`
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-144
 * Changed ..... not in git yet (—)
 */
function beforeTheRecordSentence(left: { name: string; value: number | null }[], countedValue: number, recordBegins: string): string {
  return `Before ${dateShown(recordBegins)}, when the daily record begins: ${notIncludedSentence(left, countedValue)}`;
}

// WHAT A LEFT-OUT HOLDING IS WORTH TODAY, for the brackets of the left-out sentence (DEC-6076, 2026-10-19): its broker
// mark × shares or the value typed by hand (MK-NW-F-128 heldValueOf), else what was paid for it — the same fallback
// the balance itself uses when no price is held (B-19). Unknown when none of the three is known: the brackets go.
// what was paid is read ONE way (paidOnRecord, 2026-10-21): a stored $0 is not on record, as on the Holding page and in the balance
/* ─ MK-NW-F-139 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * leftOutValueOf
 *
 * Answers ..... WHAT A LEFT-OUT HOLDING IS WORTH TODAY, for the brackets of the left-out sentence (DEC-6076, 2026-10-19): its broker mark × shares or the value typed by hand (MK-NW-F-128 heldValueOf), else what was paid for it — the same fallback the balance itself uses when no price is held (B-19).
 *
 * Formula .....
 *     held value of(r) (or paid on record(position as any).paid   if position
 *     nothing   otherwise when missing)
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-139
 * Changed ..... not in git yet (—)
 */
const leftOutValueOf = (r: GainRow): number | null => heldValueOf(r) ?? (r.position ? paidOnRecord(r.position as any).paid : null);

/** WHY A HOLDING'S GAIN OVER THE WINDOW IS NOT KNOWN, for the left-out line (2026-10-22; tenets 1 and 3): a purchase in the window
 *  with no price paid on record (canon row 24), a sale in it with no amount in your records, or — otherwise — no price
 *  history. Each is said as it is; a holding with a price history was named as having none. */
/* ─ MK-NW-F-175 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * whyLeftOut
 *
 * Answers ..... WHY A HOLDING'S GAIN OVER THE WINDOW IS NOT KNOWN, for the left-out line (2026-10-22; tenets 1 and 3): a purchase in the window with no price paid on record (canon row 24), a sale in it with no amount in your records, or — otherwise — no price history.
 *
 * Formula .....
 *     'paid'   if paid inside = nothing
 *     'sale'   if sold inside = nothing
 *     'history'   otherwise   otherwise
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-175
 * Changed ..... not in git yet (—)
 */
const whyLeftOut = (r: GainRow): 'history' | 'paid' | 'sale' => (r.paidInside === null ? 'paid' : r.soldInside === null ? 'sale' : 'history');

/** How are my investments doing over a period: where they started, what I put in and took out, what they made, where they ended, and the return?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * thePerformance
 *
 * Answers ..... How are my investments doing over a period: where they started, what I put in and took out, what they made, where they ended, and the return?
 *
 * Formula .....
 *     bounds = window bounds(window start, today)   if window start
 *     nothing   otherwise
 *     days = for each of input.snapshot days (or none when missing): without blank rows
 *     f = bounds.beginning as of
 *     day f = days.find((d: any) => string(date) = F)
 *     on f = account values on(day f, (x) => input.investment account ids.has(x))
 *     records on f = theirs where string(date ?? '').slice(0, 10) = F
 *     the answer:
 *     ...r = ...r
 *     window start = window start
 *     beginning as of = F
 *     joined = new map<string, { date: string; value: number }>()
 *     seen = new set<string>()
 *     j = joined.get(string(account id ?? ''))
 *     flows = personal flow totals(records)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-140 LEFT_OUT
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF
 *
 * Serves ...... MK-PF-M-002 · MK-PF-M-003 · MK-PF-M-005 · MK-PF-M-006
 *               MK-PF-M-007 · MK-PF-M-008 · MK-PF-M-013 · MK-PF-M-014
 *               MK-PF-M-015 · MK-PF-M-016 · MK-PF-M-017 · MK-PF-M-018
 *               MK-PF-M-019 · MK-PF-M-020 · MK-PF-M-021 · MK-PF-M-022
 *               MK-PF-M-023 · MK-PF-M-024 · MK-PF-M-027 · MK-XS-M-004
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-005 holding price
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-024 logged expenses
 * Ruled by .... DEC-0008 · DEC-0015 · DEC-0046 · DEC-0056 · DEC-0063 · DEC-0064
 *               DEC-0065 · DEC-0084 · DEC-0093 · DEC-0097 · DEC-0106 · DEC-0112
 *               DEC-0126 · DEC-0133 · DEC-0134 · DEC-0135 · DEC-0136 · DEC-0142
 *               DEC-0143 · DEC-0149 · DEC-0160 · DEC-0165 · DEC-0173 · DEC-0182
 *               DEC-0185 · DEC-0204 · DEC-0229 · DEC-0230 · DEC-0236 · DEC-0248
 *               DEC-0255 · DEC-0257 · DEC-0322 · DEC-0323 · DEC-0357 · DEC-0368
 *               DEC-0382 · DEC-0402 · DEC-0445 · DEC-0479 · DEC-0482 · DEC-0483
 *               DEC-0490 · DEC-0498
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If ending is missing it uses 0.
 *     · If market value is missing it uses 0.
 *     · If g is missing it uses 0.
 *     · If priced gain is missing it uses 0.
 *     · If gap return is missing it uses 0.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Treats a year as 365 days.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-008
 * Changed ..... not in git yet (—)
 */
export function thePerformance(input: {
  /** The window's first day, or null for "since the record began". */
  windowStart: string | null;
  /** The words for that window, as the screen says them ("since Jul 19"). */
  windowLabel: string;
  today: string;
  /** What the measured accounts are worth now — used ONLY when no accounts are handed over. With
   *  accounts, the function reads it from them, so no two screens can hand it two different figures. */
  ending?: number;
  /** Every record, unfiltered — the door takes the window's own. */
  transactions: any[];
  /** The daily record, and which accounts count as investments. */
  snapshotDays: any[];
  investmentAccountIds: Set<string>;
  /** What the priced holdings gained over the window — used ONLY to derive a beginning the record
   *  cannot reach. Null = a holding's gain cannot be known (DEC-3656): it then adds nothing and is named
   *  "a holding" (DEC-5068). A caller that hands over `holdings` instead lets the door calculate it with the
   *  window's own years, and the return of the holdings with a history. */
  pricedGain?: number | null;
  /** The holdings themselves (rows of buildPerformance, or GainRows) — preferred to `pricedGain`, so the
   *  ONE rule (pricedGainOf) decides each holding's gain over THIS window, and the sentence can name the
   *  ones it cannot know. (DEC-3656, 2026-10-09; DEC-5068, 2026-10-13) */
  holdings?: GainRow[];
  /** True for "Since" — the whole record. Its return is the window's OWN total and is never turned
   *  into a yearly rate (Performance v17, phone 3: "Since Jun 3, 2024 +16.24% … not a yearly rate").
   *  A fixed window longer than a year (2Y) still shows the yearly rate. */
  wholeRecord?: boolean;
  /** Each holding's price history, by ticker — so the days of a window before the daily record begins can be worked
   *  back from prices and joined to the record's own return (DEC-6412, 2026-10-19). Without it such a window is worked
   *  back whole, as DEC-5291 had it. */
  priceOf?: (ticker: string) => PriceSeries | null | undefined;
  /** The accounts as they stand now. Today's values are read from them, so the last day of the
   *  return is measured the same way every recorded day was — and an account added today is seen
   *  as arriving today, not as a gain. */
  accounts?: any[];
}): WindowFigures {
  const { windowStart, today } = input;
  // WHAT THE MEASURED ACCOUNTS ARE WORTH TODAY IS READ HERE, not handed in (2026-10-05). Each account
  // counts WHOLE — the cash sitting uninvested inside it included — because that is what its daily
  // record holds and what money paid in first becomes. Home used to hand in the Investments line of
  // Net worth, which leaves that cash to the Cash line: the walk then began with the cash in and
  // ended with it out, and Home's dollars for the month came out lower than Performance's by exactly
  // that cash, a tap apart.
  const ending = input.accounts
    ? input.accounts.reduce((t: number, a: any) => t + (input.investmentAccountIds.has(String(a?.asset_id)) ? (a?.balance || 0) : 0), 0)
    : (input.ending ?? 0);
  // THE MEASURED ACCOUNTS' OWN RECORDS, and no others. A record on some other account — a deposit
  // into a savings account — is not money put into these investments. A record that names no
  // account is kept, as it always was.
  // A RECORD DATED AFTER TODAY IS READ ON TODAY (outside review OpenAI, Performance re-run, 2026-10-21; DEC-3523 tenets 1
  // and 4). The balance already holds the money, so the walk counted it as put in while the return, which stops at
  // today, read it as earned: a $1,000 deposit typed for Sep 5 on Sep 2 showed Wealth generated $0 beside +100.00%.
  // Read on today, both say the same: $1,000 put in, $0 earned, +0.00%. The trade sheet no longer takes a later date.
  const onOrBeforeToday = (input.transactions ?? []).map((t: any) =>
    (t && String(t.date ?? '').slice(0, 10) > today ? { ...t, date: today } : t));
  const theirs = onOrBeforeToday.filter((t: any) => t?.account_id == null || input.investmentAccountIds.size === 0
    || input.investmentAccountIds.has(String(t.account_id))
    || (t?.counter_account_id != null && input.investmentAccountIds.has(String(t.counter_account_id))));
  const ledger = theirs.filter(
    (t) => !windowStart || String(t.date ?? '').slice(0, 10) >= windowStart);
  const bounds = windowStart ? windowBounds(windowStart, today) : null;
  const days = (input.snapshotDays ?? []).map(withoutBlankRows);   // a balance never entered is not a value (DEC-3279e)
  // READ, never back-filled (B-98)
  // …and only for the accounts named: with none named there is nothing to read (an empty set would
  // otherwise read EVERY account — the home and the bank balance included)
  const measured = bounds && input.investmentAccountIds.size > 0 && snapshotCovers(days, bounds.beginningAsOf)
    ? valueOn(days, input.investmentAccountIds, bounds.beginningAsOf) : null;
  // today's values, read the way every recorded day was read. A caller that hands over no accounts
  // and no record of today has still said what the investments are worth now (`ending`): that
  // figure closes the record, on the accounts the latest recorded day holds.
  const record = input.accounts
    ? recordDay(days.filter((d: any) => d?.date !== today), withoutBlankRows(buildDayFromAccounts(input.accounts, today, `${today}T00:00:00Z`)))
    : days.some((d: any) => d?.date === today) ? days : closedWith(days, input.investmentAccountIds, today, ending);

  // "SINCE" COUNTS THE DAY A NEW ACCOUNT OPENED (DEC-4439, his example: a new account opened with $10,000 and worth
  // $10,050 that evening earned +$50, +0.50%). The record's first day is the evening the money arrived, and "Since"
  // opened the day after it, so the deposit fell before the window and the $50 was never seen: $0, +0.00%,
  // Contributions $0 (outside review OpenAI, Performance re-run, 2026-10-21). An account the record first holds on that
  // day, with money added to it that day, was worth $0 the evening before — so the whole record is read from that
  // evening: such an account at $0, every other account the record holds that day at its own value (nothing of it is
  // measured, and its records of that day stay inside that value). The dates said on screen do not change.
  if (input.wholeRecord && bounds && measured != null && !days.some((d: any) => d?.origin === 'evening-before')) {
    const F = bounds.beginningAsOf;
    const theirDaysSorted = days.filter((d: any) => accountValuesOn(d, (x) => input.investmentAccountIds.has(x)).size > 0)
      .map((d: any) => String(d?.date ?? '')).sort();
    const dayF = days.find((d: any) => String(d?.date) === F);
    if (dayF && theirDaysSorted[0] === F) {
      const onF = accountValuesOn(dayF, (x) => input.investmentAccountIds.has(x));
      const recordsOnF = theirs.filter((t: any) => String(t?.date ?? '').slice(0, 10) === F);
      const opened = new Set([...onF.keys()].filter((id) =>
        movementsOf(recordsOnF, new Set([id])).flows.filter((f) => f.accountId === id).reduce((t, f) => t + f.amount, 0) > 0.005));
      if (opened.size) {
        const eve = new Date(Date.parse(`${F}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
        const evening = { date: eve, origin: 'evening-before', writtenAt: `${eve}T00:00:00Z`, holdings: [],
          accounts: [...onF].map(([id, v]) => ({ date: eve, accountId: id, cash: 0, statedTotal: null, typedValue: opened.has(id) ? 0 : v, currency: 'USD' })) };
        const r = thePerformance({ ...input, windowStart: F, snapshotDays: [evening, ...days],
          // another account's records of that day are inside its value that day, so they are not counted again
          transactions: onOrBeforeToday.filter((t: any) => !(String(t?.date ?? '').slice(0, 10) === F && t?.account_id != null
            && onF.has(String(t.account_id)) && !opened.has(String(t.account_id)))) });
        return { ...r, windowStart, beginningAsOf: F };
      }
    }
  }

  // AN ACCOUNT THAT JOINED THE RECORD INSIDE THE WINDOW ARRIVED AS MONEY PUT IN — at its first recorded
  // value, or at the money added to it that day when there was some (DEC-4439). The beginning does not hold it and the ending does, so until 2026-10-04 its whole value
  // landed in "change in investment value": adding an account by hand read as a gain. The return
  // already treats it as money in; the walk now says the same thing in dollars. Its own records up
  // to that day are inside that value, so they are not counted a second time.
  const joined = new Map<string, { date: string; value: number }>();
  if (bounds && measured != null) {
    const seen = new Set<string>();
    for (const d of [...record].sort((x: any, y: any) => String(x.date).localeCompare(String(y.date)))) {
      if (String(d.date) > today) break;
      for (const [id, value] of accountValuesOn(d, (x) => input.investmentAccountIds.has(x))) {
        if (seen.has(id)) continue;
        seen.add(id);
        if (String(d.date) <= bounds.beginningAsOf) continue;
        // DEC-4439 (2026-10-11): one that first appears on a day money was added to it was worth $0 the evening
        // before, so what arrived is that day's money and the rest is earned — the return reads it the same way
        const added = movementsOf(ledger.filter((t: any) => String(t?.date ?? '').slice(0, 10) === String(d.date)), new Set([id]))
          .flows.filter((f) => f.accountId === id).reduce((t, f) => t + f.amount, 0);
        joined.set(id, { date: String(d.date), value: added > 0.005 ? added : value });
      }
    }
  }
  const counted = ledger.filter((t: any) => {
    const j = joined.get(String(t?.account_id ?? ''));
    return !(j && String(t?.date ?? '').slice(0, 10) <= j.date);
  });
  // THE MONEY THAT MOVED in a set of records: put in, taken out, dividends, interest. One rule, used for the window
  // and, where a window is joined at the record's first day (DEC-6412), for the days before that first day.
  const flowsOf = (records: any[]) => {
    const flows = personalFlowTotals(records);
    // CASH OR SHARES TRANSFERRED IN FROM OUTSIDE ARE MONEY PUT IN, and transferred out are money taken
    // out — the return counts them so, and the walk left them in "change in investment value". A
    // transfer between two of the measured accounts is neither.
    let transferredIn = 0, transferredOut = 0;
    for (const t of records as any[]) {
      if (t?.type !== 'TRANSFER' && t?.type !== 'TRANSFER_IN_KIND') continue;
      // the one rule for what a transfer moved (the return reads the same function): cash at its
      // amount, shares at what they were worth — and nothing where the record does not say
      const net = movementsOf([t], input.investmentAccountIds).flows.reduce((sum, f) => sum + f.amount, 0);
      if (net > 0) transferredIn += net; else transferredOut -= net;
    }
    return {
      contributions: flows.contributions.toNumber(2) + transferredIn,
      withdrawals: flows.withdrawals.toNumber(2) + transferredOut,
      dividends: flows.dividends.toNumber(2),
      interest: flows.interest.toNumber(2),
    };
  };
  const moved0 = flowsOf(counted);
  const joinedValue = [...joined.values()].reduce((t, j) => t + j.value, 0);
  const contributions = moved0.contributions + joinedValue;
  const withdrawals = moved0.withdrawals;
  const dividends = moved0.dividends;
  const interest = moved0.interest;

  // A WINDOW THAT OPENS TODAY has seen no price move: "your value is real, your return starts
  // measuring from today" (Performance v17, phone 4). What the holdings gained before today is not
  // this window's gain, so it is not taken off the beginning.
  //
  // WHAT THE HOLDINGS GAINED, decided by ONE rule (pricedGainOf, MK-NW-F-091) — (DEC-3656, 2026-10-09).
  // A measured account with NO positions is its own instrument: a CD stating its rate gains by that rate;
  // anything else (a bond typed by hand, a balance-only account) has no price history, so its gain is
  // unknown: it adds nothing, and the sentence names it (DEC-5068, 2026-10-13). With no window (day one on
  // the account page passes none) nothing is worked back: no rate is applied and nothing is named — the
  // approved day-one page stands.
  const years = bounds ? bounds.days / 365 : 0;   // the window's days ÷ 365 — the same years the yearly rate uses
  const names = accountDisplayNames((input.accounts ?? []) as any[]);
  const instrumentAccounts = ((input.accounts ?? []) as any[])
    .filter((a: any) => input.investmentAccountIds.has(String(a?.asset_id)) && !(a?.positions?.length) && (a?.balance || 0) > 0
      // an account whose holdings were sold in full inside the window is read from those sales, not as an instrument (2026-10-22)
      && !(input.holdings ?? []).some((r: any) => r?.position?.sold_out && String(r?.position?.account_id) === String(a?.asset_id)));
  const instrumentRows: GainRow[] = instrumentAccounts
    .map((a: any) => ({
      name: names.get(a.asset_id) ?? a.label ?? 'this account',
      marketValue: a.balance,
      // a CD's entered rate, 0% included; no rate entered → null, so its gain stays unknown (DEC-2748b, 2026-10-12)
      couponRate: isCertificateOfDeposit(a) && a.coupon_rate != null && Number.isFinite(a.coupon_rate) && a.coupon_rate >= 0 ? a.coupon_rate : null,
      periodReturn: null,
    }));
  const gainRows: GainRow[] = [...(input.holdings ?? []), ...instrumentRows];
  const rowGains = gainRows.map((r) => pricedGainOf([r], years));
  const unknownNames: { name: string; value: number | null; why?: 'history' | 'paid' | 'sale' }[] = gainRows.filter((_, i) => rowGains[i] == null)
    .map((r) => ({ name: gainRowName(r), value: leftOutValueOf(r), why: whyLeftOut(r) }));
  // a caller still handing over a dollar figure (no holdings) whose gain is unknown: named generically, its value unknown
  if (!input.holdings && input.pricedGain === null) unknownNames.push({ name: 'a holding', value: null });
  // THE DOLLARS THE RETURN IS ON (DEC-6076, 2026-10-19): today's value of each holding knownHoldingsReturn keeps,
  // asked of it one row at a time so the rule is its own and cannot drift from the return it explains
  const countedValue = gainRows.filter((r) => knownHoldingsReturn([r], years) != null).reduce((t, r) => t + (r.marketValue ?? 0), 0);
  const knownGain = rowGains.reduce((t: number, g) => t + (g ?? 0), 0) + (input.holdings ? 0 : (input.pricedGain ?? 0));
  const pricedGain = windowStart === today ? 0 : knownGain;
  // A HOLDING WITH A HISTORY OVER THIS WINDOW: a price history (its window return), a CD's stated rate, or bought
  // inside the window (its own gain). Cash and a holding that holds nothing gain $0 but are not a history; a caller
  // handing over a known dollar gain has said one exists. (DEC-5291, 2026-10-13)
  const hasHistory = (r: GainRow) => !!r.cappedSince || windowTotal(r.periodReturn, r.periodTotal, years) != null
    || (r.couponRate != null && Number.isFinite(r.couponRate) && r.couponRate >= 0);
  const anyHistory = gainRows.some(hasHistory) || (!input.holdings && input.pricedGain != null && input.pricedGain !== 0);
  // A RECORD THAT EXISTS BUT BEGINS AFTER THE WINDOW OPENS. Until 2026-10-13 that greyed the window (DEC-3035i): no
  // walk, and "The record begins …". His approval of 2026-10-13 (DEC-5291, "approved."): let price history
  // count — a period that starts before the daily record is worked back from each holding's price history, and the
  // holdings not included are named, rather than the window greyed. So such a window is WORKED BACK like one with no record at all —
  // today's values less each holding's known gain less the money moved; Return = the holdings with a history. It
  // still refuses, in DEC-3035i's own words, only where NO holding here has a history: nothing real to work back
  // from, and a typed value is never carried back to a day nobody recorded (DEC-0230).
  const theirDays = days.filter((d: any) => accountValuesOn(d, (x) => input.investmentAccountIds.has(x)).size > 0);
  const recordLate = windowStart != null && windowStart !== today && bounds != null && measured == null && theirDays.length > 0;
  const unreachable = recordLate && !anyHistory;
  // THE BEGINNING IS WORKED BACK here: a window that does not open today, no beginning the record reads, and
  // either no record of these accounts at all (DEC-3656, DEC-5068) or a record that begins too late with a holding
  // that has a history (DEC-5291). A window that opens today, no window at all (day one), or a beginning the
  // record reads are untouched — a window the record reaches keeps its measured time-weighted return (DEC-4439).
  const workedBack = windowStart != null && windowStart !== today && measured == null && !unreachable;

  // SOME ACCOUNTS REACH, SOME DO NOT (DEC-5291, 2026-10-13). The record reads a beginning for the accounts it
  // holds on the window's eve; an account it does not hold then, which has a holding with a history, is worked back
  // ON ITS OWN, exactly as its own card is. The answer is then the parts added up, so every dollar line here equals
  // the same line on the cards added up: the accounts the record reaches together (read, measured, as before — an
  // account with no history that joined the record late still arrives as money put in, DEC-4439), plus each
  // worked-back account. Return = Σ values now ÷ Σ (value now ÷ (1 + return)) − 1 over the reached accounts
  // together (their measured time-weighted return) and each worked-back holding with a history — the weighting
  // knownHoldingsReturn already uses. Where the reached accounts' return refuses, so does this one, with its words.
  if (bounds && measured != null && windowStart !== today && input.investmentAccountIds.size > 1 && input.holdings) {
    const accountOfPosition = new Map<string, string>();
    for (const a of (input.accounts ?? []) as any[]) for (const p of a?.positions ?? []) accountOfPosition.set(String(p?.position_id), String(a?.asset_id));
    // a holding sold in full names its own account (soldOutPositions, 2026-10-22)
    const ownerOf = (r: GainRow) => accountOfPosition.get(String(r.position?.position_id)) ?? ((r.position as any)?.account_id as string | undefined);
    // only when every holding handed in can be placed in its account — otherwise the parts could not be told apart
    if (input.holdings.every((r) => ownerOf(r) != null)) {
      const rowsOf = (id: string): GainRow[] => [
        ...input.holdings!.filter((r) => ownerOf(r) === id),
        ...instrumentRows.filter((_, i) => String(instrumentAccounts[i]?.asset_id) === id),
      ];
      const late = [...input.investmentAccountIds].filter((id) =>
        valueOn(days, new Set([id]), bounds.beginningAsOf) == null && rowsOf(id).some(hasHistory));
      const reachedIds = new Set([...input.investmentAccountIds].filter((id) => !late.includes(id)));
      if (late.length && reachedIds.size) {
        const reached = thePerformance({ ...input, investmentAccountIds: reachedIds,
          holdings: input.holdings.filter((r) => reachedIds.has(ownerOf(r)!)) });
        const parts = [reached, ...late.map((id) => thePerformance({ ...input, investmentAccountIds: new Set([id]),
          holdings: input.holdings!.filter((r) => ownerOf(r) === id) }))];
        const add = (k: 'beginning' | 'contributions' | 'withdrawals' | 'dividends' | 'interest' | 'ending') =>
          parts.reduce((t, x) => t + (x.walk ? x.walk[k] : 0), 0);
        const cwalk = buildChangeWalk({
          beginning: add('beginning'), ending: add('ending'), fromLabel: input.windowLabel, toLabel: 'today',
          contributions: add('contributions'), withdrawals: add('withdrawals'), dividends: add('dividends'), interest: add('interest'),
        });
        const lateRows = late.flatMap(rowsOf);
        const reachedRefused = reached.cumulative == null && !!reached.sentence;
        const ccum = reachedRefused ? null : knownHoldingsReturn([
          ...lateRows,
          // the reached accounts' start is their beginning read from the record — counted where they lost everything, so a
          // −100% there is not left out of the summary (2026-10-21, tenet 4)
          ...(reached.cumulative != null ? [{ marketValue: reached.ending, periodReturn: reached.cumulative, periodTotal: reached.cumulative, startValue: reached.measured }] : []),
        ], years);
        const left = lateRows.filter((r) => gainOfRow(r, years) == null).map((r) => ({ name: gainRowName(r), value: leftOutValueOf(r), why: whyLeftOut(r) }));
        // the dollars the return is on: the reached accounts' value where their return is measured, and each late
        // holding knownHoldingsReturn keeps — asked of it one row at a time, so the rule is its own (DEC-6076)
        const countedHere = (reached.cumulative != null ? reached.ending : 0)
          + lateRows.filter((r) => knownHoldingsReturn([r], years) != null).reduce((t, r) => t + (r.marketValue ?? 0), 0);
        const yb = windowStartKey('1Y', [], today);
        const cPerYear = ccum != null && yb != null && windowStart != null && windowStart < yb && years > 1 && !input.wholeRecord ? Math.pow(1 + ccum, 1 / years) - 1 : null;
        return {
          windowStart, ledger, walk: cwalk, ending: cwalk.ending, measured: null, covered: false,
          beginningAsOf: bounds.beginningAsOf, ret: cPerYear ?? ccum, cumulative: ccum, perYear: cPerYear, years,
          sentence: reachedRefused ? reached.sentence : '',
          notIncluded: left.length ? notIncludedSentence(left, countedHere) : '', workedBack: true,
        };
      }
    }
  }
  // A WINDOW THAT OPENS BEFORE THE RECORD BEGINS IS JOINED AT THE RECORD'S FIRST DAY, not worked back whole (DEC-6412,
  // 2026-10-19, his word "approved.", after: "state A - Oct 1, 2025 → Sep 30, 2026 return is 8.26% and 1Y return is
  // 7.12%. Why different as Oct 1 to sept 30 is 1 Year."). It amends DEC-5291: the days before the record's first
  // day — and only those — are worked back from each holding's price history (DEC-5068, DEC-5291; a bond's or CD's
  // interest added, DEC-6212); from that first day on, the record's own time-weighted return is measured (DEC-4439),
  // exactly as "Since" measures it. The two are chained: Return = (1 + the days before) × (1 + the record's part) − 1.
  // The walk is the same join: the record's first value, worked back over the days before it, then the record's walk.
  // A record that begins today has no part of its own, so it stays as DEC-5291 answers it; a record that reaches back
  // is measured as before. Where the days before cannot be worked back (no price history handed in, or nothing there
  // with a history), DEC-5291's answer stands.
  const joinAtRecordStart = (): WindowFigures | null => {
    const first = theirDays.map((d: any) => String(d?.date ?? '')).filter(Boolean).sort()[0];
    const B = bounds!.beginningAsOf;
    if (!first || !(first > B) || !(first < today)) return null;
    // THE RECORD'S PART: from its first day to today — the "Since" window's own answer. Each holding is handed over as it
    // did over those days (from its prices), so an account the record does not hold on its first day is worked back on
    // its own over them, as Since does it (DEC-5291's parts added up).
    const since = windowStartKey('SINCE', [first], today)!;
    const partYears = windowBounds(since, today).days / 365;
    const partRows = input.holdings!.map((r) => gainRowBetween(r, first, today, input.priceOf!, input.transactions ?? [], input.accounts ?? []))
      .filter((r): r is GainRow => r != null);
    const part = thePerformance({ ...input, windowStart: since, wholeRecord: false, holdings: partRows });
    if (!part.walk) return null;
    // WHICH ACCOUNTS HAD A PART IN THE DAYS BEFORE: those the record holds on its first day, and those the record's part
    // works back on their own (not on the record that day, but holding something with a history). An account with no
    // history that joins the record later arrives in the record's part as money put in (DEC-4439), so it had none.
    const dayOne = theirDays.find((d: any) => String(d?.date) === first);
    const there = accountValuesOn(dayOne, (x) => input.investmentAccountIds.has(x));
    const accountOfPosition = new Map<string, string>();
    for (const a of (input.accounts ?? []) as any[]) for (const p of a?.positions ?? []) accountOfPosition.set(String(p?.position_id), String(a?.asset_id));
    // a holding sold in full names its own account (soldOutPositions, 2026-10-22)
    const ownerOf = (r: GainRow) => accountOfPosition.get(String(r.position?.position_id)) ?? ((r.position as any)?.account_id as string | undefined);
    const partHasHistory = (r: GainRow) => !!r.cappedSince || windowTotal(r.periodReturn, r.periodTotal, partYears) != null
      || (r.couponRate != null && Number.isFinite(r.couponRate) && r.couponRate >= 0);
    const placed = input.investmentAccountIds.size > 1 && input.holdings!.every((r) => ownerOf(r) != null);
    const workedInPart = new Set(placed ? [...input.investmentAccountIds].filter((id) => !there.has(id)
      && [...partRows.filter((r) => ownerOf(r) === id), ...instrumentRows.filter((_, i) => String(instrumentAccounts[i]?.asset_id) === id)].some(partHasHistory)) : []);
    const hadPart = (id: string | undefined) => id == null || there.has(id) || workedInPart.has(id);
    // THE DAYS BEFORE: each holding held on the record's first day, from the day before the window to that first day
    const gapYears = windowBounds(windowStart!, first).days / 365;
    const pairs: { gap: GainRow; now: GainRow }[] = [];
    for (const r of input.holdings!) {
      if (!hadPart(ownerOf(r))) continue;
      const g = gainRowBetween(r, B, first, input.priceOf!, input.transactions ?? [], input.accounts ?? []);
      if (g) pairs.push({ gap: g, now: r });
    }
    instrumentAccounts.forEach((a: any, i: number) => {
      const id = String(a?.asset_id), rate = instrumentRows[i].couponRate;
      // its value on the record's first day: read there, or — worked back on its own — its value now less its rate's growth
      const v = there.has(id) ? there.get(id)! : workedInPart.has(id) && rate != null ? (a.balance || 0) / Math.pow(1 + rate, partYears) : null;
      if (v == null) return;
      pairs.push({ gap: { ...instrumentRows[i], marketValue: v }, now: instrumentRows[i] });
    });
    const gapRows = pairs.map((x) => x.gap);
    const gapGains = gapRows.map((r) => gainOfRow(r, gapYears));
    const gapReturn = knownHoldingsReturn(gapRows, gapYears);
    // nothing there with a history, and something whose gain cannot be known: no part before the record to join
    if (gapReturn == null && gapGains.some((g) => g == null)) return null;
    const rGap = gapReturn ?? 0;   // only cash, or nothing held: the days before gained $0
    const gapGain = gapGains.reduce((t: number, g) => t + (g ?? 0), 0);
    // the money that moved over the days before, on the accounts that were there (an account that joins later carries
    // its own records up to that day inside the value it arrives with)
    const gapMoved = flowsOf(ledger.filter((t: any) => String(t?.date ?? '').slice(0, 10) <= first
      && !(t?.account_id != null && input.investmentAccountIds.has(String(t.account_id)) && !hadPart(String(t.account_id)))));
    const w = part.walk;
    const walkJoined = buildChangeWalk({
      beginning: w.beginning - gapGain - gapMoved.contributions + gapMoved.withdrawals,
      ending: w.ending, fromLabel: input.windowLabel, toLabel: 'today',
      contributions: gapMoved.contributions + w.contributions, withdrawals: gapMoved.withdrawals + w.withdrawals,
      dividends: gapMoved.dividends + w.dividends, interest: gapMoved.interest + w.interest,
    });
    const cum = part.cumulative == null ? null : (1 + rGap) * (1 + part.cumulative) - 1;
    const yb = windowStartKey('1Y', [], today);
    const yrs = bounds!.days / 365;
    const per = cum != null && yb != null && windowStart! < yb && yrs > 1 && !input.wholeRecord ? Math.pow(1 + cum, 1 / yrs) - 1 : null;
    // THE LEFT-OUT SENTENCE, for the days before the record only (DEC-6076's words, said of those days). Its amounts are
    // today's values, as DEC-6076 has them: the holdings the days before count, and each one left out.
    const left = pairs.filter((_, i) => gapGains[i] == null).map((x) => ({ name: gainRowName(x.now), value: leftOutValueOf(x.now), why: whyLeftOut(x.gap) }));
    const countedToday = pairs.filter((x) => knownHoldingsReturn([x.gap], gapYears) != null).reduce((t, x) => t + (x.now.marketValue ?? 0), 0);
    return {
      windowStart, ledger, walk: walkJoined, ending: walkJoined.ending, measured: null, covered: false,
      beginningAsOf: B, ret: per ?? cum, cumulative: cum, perYear: per, years: yrs,
      sentence: cum == null ? part.sentence : '',
      notIncluded: left.length ? beforeTheRecordSentence(left, countedToday, first) : '',
      workedBack: true, recordBegins: first,
    };
  };
  if (recordLate && input.holdings && input.priceOf && bounds && windowStart) {
    const joinedUp = joinAtRecordStart();
    if (joinedUp) return joinedUp;
  }

  // A HOLDING WITH NO PRICE HISTORY IS LEFT OUT, AND SAID (DEC-5068, 2026-10-13: "Wealth Generated and Return
  // should be calculated and displayed for every asset with history. Below it display …"). It replaces the
  // refusal of DEC-3656 part 2, which drew no beginning, no wealth generated and no walk at all: its gain adds
  // nothing (its value is taken as unchanged over the window), and the sentence names it.
  const notIncluded = workedBack && unknownNames.length > 0 ? notIncludedSentence(unknownNames, countedValue) : '';
  const beginning = measured ?? (ending - pricedGain - contributions + withdrawals);

  const walk = unreachable ? null : buildChangeWalk({
    beginning, ending, fromLabel: input.windowLabel, toLabel: 'today',
    contributions, withdrawals, dividends, interest,
  });
  const firstRecorded = theirDays.map((d: any) => String(d?.date ?? '')).filter(Boolean).sort()[0];
  // the record begins too late and no holding has a history to work it back from (DEC-3035i's words, kept for this
  // one case by DEC-5291, 2026-10-13)
  const cannotReach = unreachable && bounds && firstRecorded
    ? `The record begins ${dateShown(firstRecorded)}, so it cannot say what ${input.investmentAccountIds.size === 1 ? 'this account was' : 'these accounts were'} worth on ${dateShown(bounds.beginningAsOf)}.`
    : '';

  // A MEASURED RETURN NEEDS A BEGINNING READ FROM THE RECORD (B-98). Where the beginning is worked back instead,
  // the return is the holdings' own, from their price histories (DEC-5068, DEC-5291); Performance v17's
  // "a window the record cannot cover is greyed to —" now holds only where no holding has a history.
  //
  // THE RETURN IS TIME-WEIGHTED (owner decision, 2026-10-04, DEC-1669). The window is split at every
  // day money moved in or out; each piece is the value just before the next movement ÷ the value
  // just after the last; the pieces are multiplied. The record holds one value a day, taken after
  // that day's money moved, so "just before" is that day's value less the movement. Where a piece
  // cannot be measured there is NO figure and a sentence saying why — never another method.
  const moved = movementsOf(theirs, input.investmentAccountIds);
  const verdict = bounds && measured != null ? timeWeightedReturn({
    days: record, accountIds: input.investmentAccountIds,
    flows: moved.flows, sharesMoved: moved.sharesMoved,
    amountMissing: moved.amountMissing,   // a movement with no amount refuses (outside review Claude Performance, 2026-10-11, DEC-3523)
    unnamed: moved.unnamed,               // a record the app could not name refuses, and is named (2026-10-20, Q15)
    incomeMissing: moved.incomeMissing,   // interest, a dividend or a coupon with no amount refuses, and is named (2026-10-21, DEC-3523)
    start: bounds.beginningAsOf, end: today,
  }) : null;
  const covered = measured != null && verdict?.refused !== 'START_NOT_RECORDED';
  // WHERE THE BEGINNING IS WORKED BACK, THE RETURN IS THAT OF THE HOLDINGS WITH A HISTORY (DEC-5068, 2026-10-13):
  // Σ their values now ÷ Σ their starts − 1, each start = value now ÷ (1 + its own return over the window). One
  // with no history is left out, never counted at 0%; with none, there is no return. Where the record reaches
  // back, the return stays the measured time-weighted return of the accounts (DEC-1669, DEC-4439). `covered`
  // still says only whether the record reaches back; the Performance tab greys a window only where it is neither covered nor worked back.
  const knownReturn = workedBack && input.holdings ? knownHoldingsReturn(gainRows, years) : null;
  const cumulative = covered ? verdict?.rate ?? null : workedBack ? knownReturn : null;
  // a yearly rate only for a window longer than a year: (1 + the return)^(365 ÷ days) − 1. "Since" is
  // the whole record: its figure is the window's own total, said with its two dates.
  // LONGER THAN A YEAR is read on the calendar, the way the window itself is (DEC-3768b): a window that opens
  // one year back to the day IS a year, though Q3 (DEC-0315) counts both its edge days in and so finds 366 of
  // them. It read 366 ÷ 365 > 1 and turned an exact year's +10.00% into +9.97% "a year" — against DEC-0237 and
  // DEC-1669: a window of a year or less is never annualised (outside review Claude Performance, 2026-10-11).
  const yearBack = windowStartKey('1Y', [], today);   // '1Y' is a name the app has, so this always answers
  const longerThanAYear = windowStart != null && yearBack != null && windowStart < yearBack;
  const perYear = cumulative != null && longerThanAYear && years > 1 && !input.wholeRecord ? Math.pow(1 + cumulative, 1 / years) - 1 : null;

  return {
    windowStart, ledger, walk, ending, measured,
    /** Whether the record reaches back to this window's first day. Where it does not, every percent
     *  is null and the screen greys the window to an em-dash. */
    covered,
    /** The day the beginning value is READ for — the record's first day for "since", the day before
     *  the window opens otherwise. The screen's "Since …" and "Beginning market value (…)" print THIS
     *  day: Performance v17 writes "Since Jun 3, 2024" beside "Beginning market value (Jun 3, 2024)". */
    beginningAsOf: bounds ? bounds.beginningAsOf : null,
    ret: perYear ?? cumulative,
    cumulative, perYear, years,
    sentence: covered ? whyNoReturn(verdict) : cannotReach,
    notIncluded, workedBack,
  };
}


/** WHAT EACH CATEGORY EARNED — the table under the walk, and the arithmetic behind it.
 *
 *  MOVED OFF THE SCREEN, 2026-09-30. It was thirty lines of arithmetic inside PerformanceScreen:
 *  the screen filtered the records to the window, calculated which class each ticker belongs to,
 *  bucketed the dividends and interest, added them up and computed the return per class. His rule
 *  is that a screen computes NOTHING — "a figure derived on screen from two others is a function
 *  with a row, however small" — and this was four figures' worth of it.
 *
 *  Why it matters beyond tidiness: a figure calculated on a screen has no row, no worked example and
 *  no test, so nothing can check it and nothing can compare it with the same figure elsewhere. That
 *  is how one concept comes to have two answers.
 *
 *  LEDGER-ONLY, and that is a decision of his, not an omission: a category with no records shows an
 *  em-dash, never a false $0, and where nothing at all was received the table does not appear. A zero
 *  reads as "we checked and it earned nothing"; a dash reads as "we have no record" — and only one
 *  of those is true.
 */
export interface CategoryEarned {
  key: string;
  label: string;
  /** Dividends and interest actually RECEIVED in the window, from the records only. */
  earned: number;
  /** That class’s return over the window, each holding weighed by what it was worth when the window began — null where it cannot be calculated. */
  ret: number | null;
  /** True where `ret` is a STATED yearly rate (a bond or CD's own coupon), printed with "/year" —
   *  Performance v17: "a /year figure is that category's yearly pace". */
  yearly: boolean;
}

/** What each category of investment paid in dividends and interest over the period, and that category's return. */
/* ─ MK-NW-F-084 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * categoryEarnings
 *
 * Answers ..... What each category of investment paid in dividends and interest over the period, and that category's return.
 *
 * Formula .....
 *     rows = input.rows (or none when missing)
 *     ordered = holding class of(p)   if p
 *     'mixed'   otherwise
 *     ordered   when ordered = 'bonds' (or ordered = 'cash' (or ordered = 'alternatives' (or ordered = 'stocks_etf' when missing or zero) when missing or zero) when missing or zero)
 *     the answer = 'mixed'
 *     r = rows.find((x) => string(position.ticker ?? '').to upper case() = string(tk ?? '').to upper case())
 *     category of(position)   when r
 *     in class = rows where category of(position) = cls
 *     usable = for each of in class: each = each
 *     tot = window total(period return, period total) where tot ≠ nothing
 *     held = input.bonds (or none when missing) where (balance ?? 0) > 0
 *     bond holdings = rows where category of(position) = 'bonds' and (market value ! = 0 or (start value ?? 0) > 0)
 *     held total = Σ over held of (balance (or 0 when missing))
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-086 CATS
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 * Ruled by .... DEC-0248
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If balance is missing it uses 0.
 *     · If start value is missing it uses 0.
 *     · If coupon rate is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-084
 * Changed ..... 2026-09-30 (4476da5)
 */
export function categoryEarnings(input: {
  /** every record, unfiltered — this takes the window’s own */
  transactions: any[];
  /** the window’s first day, or null for "since the record began" */
  windowStart: string | null;
  /** each holding with its class and its own return, as buildPerformance produces them */
  rows: { position?: { ticker?: string; kind?: string; asset_class?: string }; periodReturn?: number | null; periodTotal?: number | null; marketValue?: number; interest?: number | null; startValue?: number | null; paidInside?: number | null; soldInside?: number | null; cappedSince?: string | null; path?: HoldingPath }[];
  /** Every bond or CD held as its own account: which account it is, what it is worth and the yearly rate it states. */
  bonds?: { asset_id?: string | number; balance?: number; coupon_rate?: number }[];
  /** DAY ONE: every category is shown at $0 — "every line fills in as days pass, the structure never
   *  changes" (Performance v17, phones 4 and 5). Any other day, a category that received nothing is
   *  left out. */
  dayOne?: boolean;
}): CategoryEarned[] {
  const { windowStart } = input;
  const led = (input.transactions ?? []).filter(
    (t) => !windowStart || String(t?.date ?? '').slice(0, 10) >= windowStart);
  const rows = input.rows ?? [];

  // A TICKER WE HOLD NO PRICED ROW FOR IS NOT A FUND (B-116, found 2026-09-30 writing the pass-4
  // test for this figure's own decision). This returned 'stocks_etf' for ANY ticker with no matching
  // row, so $300 of interest on a hand-entered CD ("KeyBank CD 4.00%") was booked to Stocks / Funds.
  // Balance-only accounts are exactly the cohort that has no priced rows (B-100), so this was not a
  // corner: it is a bond's income shown under the wrong heading on the approved category table. The
  // rule his decision already states covers it — class the record by WHAT IT IS when we cannot class
  // it by what it is attached to: a dividend comes from a fund, interest from a bond.
  // WHICH CATEGORY A HOLDING BELONGS TO — one rule, used to sort its income AND to weigh its return.
  // A holding says its class in the words the sync writes ('stock_etf', 'bond', 'cash', 'other'); the
  // table's rows are named 'stocks_etf', 'bonds', 'cash'. This compared the two spellings directly, so
  // every holding a linked account brought in matched NO row and Stocks / Funds showed an em-dash for
  // its return — found 2026-10-03 holding the screen against Performance v17, word for word.
  const categoryOf = (p?: { kind?: string; asset_class?: string }): string => {
    // THE ONE ORDER (MK-NW-F-109 holdingClassOf — the broker's own class, his ruling of 2026-10-20), so a holding sits in
    // the same category here as on Net worth's class rows and the account page. A HOLDING THAT ORDER CANNOT PLACE IS
    // UNCLASSIFIED HERE TOO (2026-10-21, DEC-2160: "Refuse the line and ask"; DEC-3035f): it fell through to Stocks / Funds,
    // with its return and its income, while Net worth and the account page listed it under Unclassified.
    const ordered = p ? holdingClassOf(p) : 'mixed';
    if (ordered === 'bonds' || ordered === 'cash' || ordered === 'alternatives' || ordered === 'stocks_etf') return ordered;
    return 'mixed';
  };
  const classOfTicker = (tk: string, type: string): string => {
    const r = rows.find((x) => String(x.position?.ticker ?? '').toUpperCase() === String(tk ?? '').toUpperCase());
    if (r) return categoryOf(r.position);
    return type === 'DIVIDEND' ? 'stocks_etf' : 'bonds';
  };
  // WHAT THE HOLDINGS IN ONE CLASS GREW BY, weighed by what each was worth when the window BEGAN
  // (outside review MK-NW-F-084, 2026-10-09; DEC-1669 every return time-weighted; DEC-3035b the same
  // fix to the retirement return): each holding's start = its value now ÷ (1 + its return), and the
  // answer is Σ now ÷ Σ start − 1. Weighing by today's values counted the holding that grew most twice
  // over: $12,000 at +20% and $10,000 at 0% read +10.91% where the class grew $20,000 → $22,000 = +10%.
  // A holding with no return is left out, never read as 0; one of −100% counts at the start it was read at (2026-10-21).
  const retOf = (cls: string): number | null => {
    const inClass = rows.filter((x) => categoryOf(x.position) === cls);
    // each holding's return as the WINDOW'S OWN TOTAL — over 2Y a period return is a yearly rate, and a start worked
    // from it was a year short (outside review Claude Performance, 2026-10-11, MK-NW-F-091; one rule: windowTotal)
    // which holdings count is classReturnOf's rule alone — a holding worth $0 today counts at the start it was read at
    // (2026-10-21, tenet 4); it was dropped here before classReturnOf could see it
    const usable = inClass.map((r) => ({ r, tot: windowTotal(r.periodReturn, r.periodTotal) })).filter((x) => x.tot != null);
    // with each holding's path across the window, so the class is split at every day money went into it (DEC-1669, 2026-10-21)
    return classReturnOf(usable.map((x) => ({ marketValue: x.r.marketValue, interest: x.r.interest, total: x.tot, startValue: x.r.startValue,
      paidInside: x.r.cappedSince ? undefined : x.r.paidInside, soldInside: x.r.cappedSince ? undefined : x.r.soldInside, path: x.r.path })));
  };

  // A BOND STATES ITS OWN YEARLY RATE, and where every bond held states one the category shows that
  // rate — weighted by what each is worth — with "/year" on it (Performance v17: "Bonds & CDs 4.20%/year").
  // It is the same stated rate the account page prints beside the bond, so the two cannot disagree.
  // One bond with no stated rate and the category falls back to what its prices did, or to nothing.
  const held = (input.bonds ?? []).filter((b) => (b.balance ?? 0) > 0);
  // a bond held as a holding INSIDE an account states no rate here, so the category cannot speak for it. A bond row
  // worth exactly $0 holds no shares (marketValue is 0 only when none are held) — it holds nothing, so it does not hide
  // the rate the bond account states: $10,000 at 4% with a sold-out bond row reads 4.00%/year (outside review OpenAI
  // re-run 03, MK-NW-F-084, 2026-10-13). A row whose worth is not known (null) may still hold shares, and still counts.
  // A BOND THAT FELL TO $0 STILL HOLDS SHARES (2026-10-21, tenet 3: a known $0 is a value): $0 is not "none held" when it
  // was worth something when the window began (its startValue), so it counts here and its loss is in the category's return.
  const bondHoldings = rows.filter((x) => categoryOf(x.position) === 'bonds' && (x.marketValue !== 0 || (x.startValue ?? 0) > 0));
  // an entered 0% STATES a rate (0.00%/year); only a rate never entered leaves the bond silent (DEC-2748b, 2026-10-12)
  const allState = held.length > 0 && bondHoldings.length === 0
    && held.every((b) => b.coupon_rate != null && Number.isFinite(b.coupon_rate) && b.coupon_rate >= 0);
  const heldTotal = held.reduce((t, b) => t + (b.balance ?? 0), 0);
  // THE ACCOUNTS THAT ARE A BOND OR A CD: interest recorded on one of them, naming no holding, is that bond's or
  // CD's interest — Bonds & CDs, never "Cash in this account" (DEC-0051 a CD is Bonds & CDs and pays interest;
  // DEC-0094 untickered income is counted at the account it belongs to) (outside review Claude Performance, 2026-10-11)
  const bondAccountIds = new Set((input.bonds ?? []).filter((b) => b.asset_id != null).map((b) => String(b.asset_id)));
  const statedBondRate = allState ? held.reduce((t, b) => t + (b.coupon_rate ?? 0) * (b.balance ?? 0), 0) / heldTotal : null;

  const buckets: CategoryEarned[] = [
    // "Cash in this account" is his wording of 2026-08-11; the shorter wording was declined by name
    { key: 'stocks_etf', label: 'Stocks / Funds', earned: 0, ret: retOf('stocks_etf'), yearly: false },
    { key: 'bonds', label: 'Bonds & CDs', earned: 0, ret: statedBondRate ?? retOf('bonds'), yearly: statedBondRate != null },
    { key: 'cash', label: 'Cash in this account', earned: 0, ret: retOf('cash'), yearly: false },
    // AN ALTERNATIVE'S INCOME IS ALTERNATIVES' (2026-10-21, the lead's decision under DEC-3523 tenets 1 and 4; outside review
    // OpenAI, Performance re-run, MK-NW-F-084): the one order classes it Alternatives, the table had no such row, and its
    // dividend fell back to Stocks / Funds — "Stocks / Funds earned $83.27" for an alternative's $83.27. Performance v17
    // draws no Alternatives row; a figure under the wrong class name is a wrong figure, so the row appears only where an
    // alternative earned something (or, on day one, is held), under the class name Net worth prints.
    { key: 'alternatives', label: ASSET_CLASS_LABEL.alternatives, earned: 0, ret: retOf('alternatives'), yearly: false },
    // a holding nothing classes is Unclassified, under the class name Net worth and the account page print (DEC-2160)
    { key: 'mixed', label: ASSET_CLASS_LABEL.mixed, earned: 0, ret: retOf('mixed'), yearly: false },
  ];
  for (const t of led) {
    // a bond's COUPON is interest — the ledger books it so (MK-ST: COUPON → interest), and a bond's return counts it (DEC-6212)
    if (t?.type !== 'DIVIDEND' && t?.type !== 'INTEREST' && t?.type !== 'COUPON') continue;
    // the one rule for a stored amount (moneyIntoAccount, 2026-10-21): a −$50 dividend — a reversal — lowers what was earned
    const amt = moneyIntoAccount(t) ?? 0;
    // A RECORD THAT NAMES NO HOLDING is classed by what it is. A dividend comes from a fund. Interest
    // that names nothing is what the uninvested balance earned — "Cash in this account", where the
    // approved drawing puts it (Performance v17, phones 1 to 3). Interest that NAMES a holding we hold
    // no price for is a bond's or a CD's (B-116), and stays under Bonds & CDs.
    const cls = t.ticker ? classOfTicker(t.ticker, t.type === 'COUPON' ? 'INTEREST' : t.type)
      : t.type === 'DIVIDEND' ? 'stocks_etf'
      : t.account_id != null && bondAccountIds.has(String(t.account_id)) ? 'bonds' : 'cash';
    const b = buckets.find((x) => x.key === cls)
           ?? buckets.find((x) => x.key === (t.type === 'DIVIDEND' ? 'stocks_etf' : 'bonds'))!;
    b.earned += amt;
  }
  // day one shows every category at $0 with NO return — nothing has been measured yet, and a holding's
  // lifetime gain is not this window's. Any other day a category that received nothing is left out.
  // day one draws the three categories of v17 phones 4 and 5; Unclassified is drawn only when a holding is in it
  const anyUnclassed = rows.some((x) => categoryOf(x.position) === 'mixed');
  const anyAlternative = rows.some((x) => categoryOf(x.position) === 'alternatives');   // the same, for Alternatives (2026-10-21)
  return input.dayOne ? buckets.filter((b) => (b.key !== 'mixed' || anyUnclassed) && (b.key !== 'alternatives' || anyAlternative)).map((b) => ({ ...b, ret: null, yearly: false })) : buckets.filter((b) => b.earned > 0);
}

/** ALL CATEGORIES, THE TABLE'S LAST LINE: what every category categoryEarnings lists earned, added up (2026-10-22; DEC-0346,
 *  screens compute nothing). The Performance tab added it up itself; it is the sum of the lines above it, so the lines and
 *  the total cannot drift (tenet 2). $1,500 of dividends and $700 of interest: $2,200. */
/* ─ MK-NW-F-176 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * categoriesEarnedTotal
 *
 * Answers ..... ALL CATEGORIES, THE TABLE'S LAST LINE: what every category categoryEarnings lists earned, added up (2026-10-22; DEC-0346, screens compute nothing).
 *
 * Formula .....
 *     Σ over categories (or none when missing) of (earned   if number.is finite(earned)
 *     0   otherwise)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-176
 * Changed ..... not in git yet (—)
 */
export function categoriesEarnedTotal(categories: { earned: number }[]): number {
  return (categories ?? []).reduce((n, b) => n + (Number.isFinite(b?.earned) ? b.earned : 0), 0);
}

/** THE WORDS FOR WHICH WAY THE VALUE WENT over a window, beginning to ending — "up to", "down to" or "level at" (2026-10-22;
 *  DEC-0346): the Performance tab's spoken graph compared the two figures itself. */
/* ─ MK-NW-F-177 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * walkDirectionWords
 *
 * Answers ..... THE WORDS FOR WHICH WAY THE VALUE WENT over a window, beginning to ending — "up to", "down to" or "level at" (2026-10-22; DEC-0346): the Performance tab's spoken graph compared the two figures itself.
 *
 * Formula .....
 *     'up to'   if ending > beginning
 *     'down to'   if ending < beginning
 *     'level at'   otherwise   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-177
 * Changed ..... not in git yet (—)
 */
export function walkDirectionWords(beginning: number, ending: number): 'up to' | 'down to' | 'level at' {
  return ending > beginning ? 'up to' : ending < beginning ? 'down to' : 'level at';
}

/** WHAT ONE CATEGORY GREW BY OVER THE WINDOW, each holding weighed by what it was worth when the window began (outside
 *  review MK-NW-F-084, 2026-10-09; DEC-1669): Σ (value today + interest) ÷ Σ start − 1, each start = (value today +
 *  interest) ÷ (1 + its window total). The interest is a bond's or CD's, paid in the window (DEC-6212, 2026-10-19); it is
 *  0 for everything else. A holding with no total is left out, never read as 0%; one worth $0 today counts at the start it
 *  was read at (startValue, 2026-10-21) and is left out only when it has none; with none left, no figure. The Performance tab's category table and the account page's category bars both ask
 *  this, so the two pages cannot weigh a category two ways. */
/* ─ MK-NW-F-142 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * classReturnOf
 *
 * Answers ..... WHAT ONE CATEGORY GREW BY OVER THE WINDOW, each holding weighed by what it was worth when the window began (outside review MK-NW-F-084, 2026-10-09; DEC-1669): Σ (value today + interest) ÷ Σ start − 1, each start = (value today + interest) ÷ (1 + its window total).
 *
 * Formula .....
 *     usable = items (or none when missing) where total ≠ nothing and total > -1 and (market value ?? 0) > 0
 *     lost = items (or none when missing) where total ≠ nothing and !usable.includes(each) and (start value ?? 0) > 0
 *     between = items (or none when missing) where total ≠ nothing and !usable.includes(each) and !lost.includes(each) and !!path.marks.some((m) => after > 1e − 9)
 *     counted = [...usable, ...lost, ...between]
 *     r = return split at purchases([path])   if path
 *     undefined   otherwise
 *     the answer = r ≠ nothing and total ≠ nothing and size of(r − total) ≤ 1e − 9 × max(1, size of(total))
 *     split = return split at purchases(counted.map((x) => path!))
 *     split   when split ! = undefined
 *     nothing   when not (now ≥ 0) or !(start > 0)
 *
 * Called by ... MK-NW-F-084 categoryEarnings · MK-NW-F-088 BENCH
 *               MK-NW-F-091 pricedGainOf · MK-NW-F-138 knownHoldingsReturn
 *               MK-PF-F-078 yardstickOn
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-065 firstDatedPurchase
 *               MK-PF-F-070 holdingPath · MK-NW-F-168 holdingRowsIn
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If market value is missing it uses 0.
 *     · If start value is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-142
 * Changed ..... not in git yet (—)
 */
export function classReturnOf(items: { marketValue?: number | null; interest?: number | null; total: number | null; startValue?: number | null;
  paidInside?: number | null; soldInside?: number | null; path?: HoldingPath }[]): number | null {
  const usable = (items ?? []).filter((x) => x.total != null && x.total > -1 && (x.marketValue ?? 0) > 0);
  // WORTH $0 TODAY, DOWN 100%, with the start it was read at (2026-10-21; tenet 4): in the class with what it lost — a
  // known $0 is $0. With no start, or worth $0 then too, it is left out as before.
  const lost = (items ?? []).filter((x) => x.total != null && !usable.includes(x) && (x.startValue ?? 0) > 0);
  // SPLIT AT EVERY DAY MONEY WENT INTO THE CATEGORY (2026-10-21; DEC-1669, his words: "All return should be True Weighted
  // Return and not Dietz return."; outside re-run OpenAI part 1, MK-PF-M-006): where every holding counted carries its path
  // across the window (buildPerformance), each piece between two such days is measured and the pieces are multiplied
  // (returnSplitAtPurchases). Weighed by value now ÷ (1 + each return), shares bought inside the window counted as held all
  // along: A $1,000 that bought $9,450 more at $105 and B $10,000 that then halved read −20.00% where −21.60% is right; a
  // holding bought last week weighed as if held all year. A category of one holding reads that holding's own return.
  // bought and sold inside the window, nothing held at either end (2026-10-22): it still weighed while it was held, so its path
  // is in the split; with nothing to start from it has no weight of its own in the starts
  const between = (items ?? []).filter((x) => x.total != null && !usable.includes(x) && !lost.includes(x) && !!x.path?.marks.some((m) => m.after > 1e-9));
  const counted = [...usable, ...lost, ...between];
  // (each path must give back its own holding's figure, or the item was changed after its row was built: then the starts)
  const ownFigure = (x: { path?: HoldingPath; total: number | null }) => {
    const r = x.path ? returnSplitAtPurchases([x.path]) : undefined;
    return r != null && x.total != null && Math.abs(r - x.total) <= 1e-9 * Math.max(1, Math.abs(x.total));
  };
  if (counted.length && counted.every(ownFigure)) {
    const split = returnSplitAtPurchases(counted.map((x) => x.path!));
    if (split !== undefined) return split;
  }
  // OTHERWISE each holding's own return, weighed by what it was worth when the window began: value now ÷ (1 + its return)
  // where no shares were bought inside the window (the same figure), else the start read from the shares held then
  // (startValue, 2026-10-21: worked back from today's shares it counted the shares bought inside as held all along)
  const realStart = (x: { paidInside?: number | null; soldInside?: number | null; startValue?: number | null }) =>
    (x.paidInside !== undefined || x.soldInside !== undefined) && (x.startValue ?? 0) > 0;
  const now = usable.reduce((t, x) => t + (realStart(x) ? (x.startValue as number) * (1 + (x.total as number)) : worthWithInterest(x)), 0)
    // a holding sold in full in the window holds nothing today: its start grows by its own return, as a held one's does (2026-10-22)
    + lost.reduce((t, x) => t + (realStart(x) ? (x.startValue as number) * (1 + (x.total as number)) : worthWithInterest(x)), 0);
  const start = usable.reduce((t, x) => t + (realStart(x) ? x.startValue as number : worthWithInterest(x) / (1 + (x.total as number))), 0)
    + lost.reduce((t, x) => t + (x.startValue as number), 0);
  // everything lost is −100.00%, a return; only nothing to start from is no return
  if (!(now >= 0) || !(start > 0)) return null;
  return now / start - 1;
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  An investment account worth $30,000 on the last recorded day of 2025 — 100 VTI at $260 plus $4,000
 *  of cash — worth $46,600 on 28 September 2026, with $6,000 paid in on 1 April and $825 of dividends
 *  along the way. Every figure runs `thePerformance`, the real door.
 *
 *  IT IS THE CASE WITH MONEY PAID IN, deliberately — the one a return gets wrong when it counts the
 *  deposit as earned. Time-weighted (owner decision, 2026-10-04): the account was worth $38,400 at the
 *  close of 1 April, so $32,400 just before the $6,000 arrived. $30,000 grew to $32,400 (× 1.08), then
 *  $38,400 grew to $46,600 (× 1.213542): 1.08 × 1.213542 − 1 = +31.06%.
 *  The dollar walk says the same story in dollars: $30,000 + $6,000 paid in + $10,600 generated = $46,600.
 */
const EXAMPLE = {
  windowStart: '2026-01-01', windowLabel: 'since Jan 1', today: '2026-09-28', ending: 46600,
  transactions: [
    { txn_id: 'c1', account_id: 'a2', type: 'DEPOSIT', amount: 6000, date: '2026-04-01' },
    { txn_id: 'd1', account_id: 'a2', ticker: 'VTI', type: 'DIVIDEND', amount: 825, date: '2026-06-20' },
  ] as any[],
  snapshotDays: [
    { date: '2025-12-31', origin: 'observed', writtenAt: '2025-12-31T00:00:00Z',
      holdings: [{ accountId: 'a2', holdingId: 'VTI', ticker: 'VTI', units: 100, price: 260, value: 26000 }],
      accounts: [{ date: '2025-12-31', accountId: 'a2', cash: 4000, statedTotal: null, currency: 'USD' }] },
    // the day the $6,000 arrived, valued after it arrived: 100 VTI at $284 plus $10,000 cash
    { date: '2026-04-01', origin: 'observed', writtenAt: '2026-04-01T00:00:00Z',
      holdings: [{ accountId: 'a2', holdingId: 'VTI', ticker: 'VTI', units: 100, price: 284, value: 28400 }],
      accounts: [{ date: '2026-04-01', accountId: 'a2', cash: 10000, statedTotal: null, currency: 'USD' }] },
    { date: '2026-09-28', origin: 'observed', writtenAt: '2026-09-28T00:00:00Z',
      holdings: [{ accountId: 'a2', holdingId: 'VTI', ticker: 'VTI', units: 100, price: 357.75, value: 35775 }],
      accounts: [{ date: '2026-09-28', accountId: 'a2', cash: 10825, statedTotal: null, currency: 'USD' }] },
  ] as any[],
  investmentAccountIds: new Set(['a2']),
  pricedGain: 0,
};
const GIVEN =
  'An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — '
  + 'the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.';

/** THE SAME ACCOUNT WITH NOTHING PAID IN (Performance pass 2, 2026-09-30) — the plainest return
 *  there is, so a person can check the headline figure with one division: $30,000 became $32,000,
 *  of which $825 arrived as dividends. $32,000 ÷ $30,000 − 1 = +6.67%. */
const QUIET = {
  ...EXAMPLE,
  ending: 32000,
  snapshotDays: [
    EXAMPLE.snapshotDays[0],
    { date: '2026-09-28', origin: 'observed', writtenAt: '2026-09-28T00:00:00Z',
      holdings: [{ accountId: 'a2', holdingId: 'VTI', ticker: 'VTI', units: 100, price: 271.75, value: 27175 }],
      accounts: [{ date: '2026-09-28', accountId: 'a2', cash: 4825, statedTotal: null, currency: 'USD' }] },
  ] as any[],
  transactions: [
    { txn_id: 'd1', account_id: 'a2', ticker: 'VTI', type: 'DIVIDEND', amount: 825, date: '2026-06-20' },
  ] as any[],
};
const QUIET_GIVEN =
  'An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash) and $32,000 on 28 Sep 2026, '
  + 'with nothing paid in or taken out and $825 of it arriving as dividends.';

/** Example only: runs thePerformance on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-093 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * QUIET_PERF
 *
 * Answers ..... Example only: runs thePerformance on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the performance(QUIET)
 *
 * Called by ... MK-NW-F-088 BENCH
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-093
 * Changed ..... not in git yet (—)
 */
const QUIET_PERF = () => thePerformance(QUIET);

/** Example only: runs thePerformance on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-083 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * PERF
 *
 * Answers ..... Example only: runs thePerformance on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the performance(EXAMPLE)
 *
 * Called by ... MK-NW-F-088 BENCH
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-083
 * Changed ..... not in git yet (—)
 */
const PERF = () => thePerformance(EXAMPLE);
const LEFT_GIVEN = 'An account worth $50,000: VTI $40,000 with a year of prices (+10%) and Treasury 2031 $10,000 typed by hand with no '
  + 'price history; no money moved, no daily record, the past year picked.';
/** Example only — the left-out example (DEC-6076, 2026-10-19; the account-page drawing's state D, his own worked example of DEC-5291):
 *  Fidelity linked, nothing recorded, the past year picked. VTI $40,000 with a year of prices (+10%), Treasury 2031
 *  $10,000 typed by hand with no price history. Return +10.00% is on the $40,000; the $10,000 is left out. */
/* ─ MK-NW-F-140 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * LEFT_OUT
 *
 * Answers ..... Example only — the left-out example (DEC-6076, 2026-10-19; the account-page drawing's state D, his own worked example of DEC-5291): Fidelity linked, nothing recorded, the past year picked.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-088 BENCH
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-140
 * Changed ..... not in git yet (—)
 */
const LEFT_OUT = () => thePerformance({
  windowStart: '2025-10-01', windowLabel: 'the past year', today: '2026-09-30',
  transactions: [], snapshotDays: [], investmentAccountIds: new Set(['f']),
  accounts: [{ asset_id: 'f', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', asset_class: 'stocks_etf', balance: 50000, positions: [{}, {}] }] as any[],
  holdings: [
    { position: { ticker: 'VTI' }, marketValue: 40000, periodReturn: 0.10 },
    { position: { ticker: '912810TM0', label: 'Treasury 2031', lots: [{ shares: 10000 }], value_now: 10000 }, periodReturn: null },
  ],
});

/** Example only: runs thePerformance for chosen accounts of the worked example and calculates nothing of its own.
 *  PER ACCOUNT (Performance pass 1, 2026-09-30): the same window, asked of ONE account rather than
 *  all of them. The door is the same one — that is the point: an account's ending value and the
 *  all-accounts total come from ONE calculation, so a per-account walk and the total beneath it
 *  cannot tell different stories. Asking it of a second account with no records gives $0 without
 *  invention. */
/* ─ MK-NW-F-085 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * PERF_ONE
 *
 * Answers ..... Example only: runs thePerformance for chosen accounts of the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-088 BENCH
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-085
 * Changed ..... not in git yet (—)
 */
const PERF_ONE = (ids: string[]) => thePerformance({ ...EXAMPLE, investmentAccountIds: new Set(ids) });


/** THE WORKED EXAMPLE FOR THE CATEGORY TABLE (Performance pass 1, 2026-09-30).
 *
 *  One window, one ledger: $825 of dividends on a fund and $505 of interest on a CD, plus one
 *  untickered dividend of $40 — which is classed by WHAT IT IS, a dividend, so it joins the funds.
 *  The holdings give each class its own return, each weighed by what it was worth when the window began.
 */
const CAT_EXAMPLE = {
  windowStart: '2026-01-01',
  transactions: [
    { txn_id: 'd1', ticker: 'VTI', type: 'DIVIDEND', amount: 420, date: '2026-06-20' },
    { txn_id: 'd2', ticker: 'VTI', type: 'DIVIDEND', amount: 405, date: '2026-03-20' },
    { txn_id: 'i1', ticker: 'ALLY CD', type: 'INTEREST', amount: 505, date: '2026-04-01' },
    { txn_id: 'd3', type: 'DIVIDEND', amount: 40, date: '2026-05-02' },
    { txn_id: 'x1', ticker: 'VTI', type: 'BUY', amount: 4000, date: '2025-12-01' },
    { txn_id: 'x2', ticker: 'VTI', type: 'DIVIDEND', amount: 900, date: '2025-11-30' },
  ] as any[],
  rows: [
    { position: { ticker: 'VTI', asset_class: 'stocks_etf' }, periodReturn: 0.12, marketValue: 40600 },
    { position: { ticker: 'ALLY CD', asset_class: 'bonds' }, periodReturn: 0.05, marketValue: 10000 },
  ] as any[],
};
const CAT_GIVEN =
  'Since 1 Jan 2026: dividends of $420 and $405 on VTI, $505 of interest on an Ally CD, and one '
  + 'dividend of $40 with no ticker on it. A $900 dividend from Nov 2025 is outside the window. '
  + 'Holdings: $40,600 of VTI up 12%, $10,000 of CD up 5%.';

/** Example only: runs categoryEarnings on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-086 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * CATS
 *
 * Answers ..... Example only: runs categoryEarnings on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     category earnings(CAT_EXAMPLE)
 *
 * Called by ... MK-NW-F-087 CAT
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-086
 * Changed ..... not in git yet (—)
 */
const CATS = () => categoryEarnings(CAT_EXAMPLE);

/** Example only: picks one category out of the worked example of what each category earned. */
/* ─ MK-NW-F-087 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * CAT
 *
 * Answers ..... Example only: picks one category out of the worked example of what each category earned.
 *
 * Formula .....
 *     CATS().find((c) => key = key)
 *
 * Called by ... MK-NW-F-088 BENCH
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-087
 * Changed ..... not in git yet (—)
 */
const CAT = (key: string) => CATS().find((c) => c.key === key);

/** THE HONEST COMPARISON, worked. $40,000 of shares whose benchmark rose 10% and $10,000 of bonds
 *  whose benchmark rose 4%: the market MATCHED TO THIS MIX did 8.8%, not the 7% a plain average of
 *  the two indices would give. Weighting by what is held is the whole point of the figure. */
const BENCH_GIVEN =
  '$40,000 of shares against a benchmark up 10% over the window, and $10,000 of bonds against one up '
  + '4% over the same days; neither holding moved, so each was worth then what it is worth now.';

/** Example only: runs the market comparison on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-088 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * BENCH
 *
 * Answers ..... Example only: runs the market comparison on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     portfolio bench return([
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-088
 * Changed ..... not in git yet (—)
 */
const BENCH = () => portfolioBenchReturn([
  { benchReturn: 0.10, marketValue: 40000, periodReturn: 0 },
  { benchReturn: 0.04, marketValue: 10000, periodReturn: 0 },
] as any);

/** THE MONEY-WEIGHTED RETURN IS NOT A FIGURE ANY MORE (Performance pass 2, 2026-09-30).
 *
 *  MK-PF-M-009 "Return (money-weighted, when the record covers it)" was declared here and said it
 *  was shown on /invest. It is shown nowhere: approved mock v14 removed that card on 2026-09-25
 *  ("not in this design, so they go"), and MK-PF-F-026 moneyWeightedReturn \u2014 a true XIRR, solved by
 *  bisection \u2014 is now reached by no screen at all, only by tests. A row for a figure nobody reads is
 *  a wrong row, so the row is gone and the function is left where it is, correct and unused.
 *
 *  SETTLED 2026-10-04 (DEC-1669): the Return the screen shows is TIME-WEIGHTED. The XIRR and the
 *  Modified Dietz function were both removed the same day.
 */

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const PERFORMANCE_FIGURES = declareFigures({
  // ISSUED AND DECLARED 2026-10-01, working rule 11 across the account page. The walk on ONE account
  // showed four figures with no identifier. They are not the portfolio figures above them: those are
  // grain None — every account together — and these are one account's own, which is why they need
  // their own rows rather than borrowing MK-PF-M-001 to 003.
  'MK-PF-M-013': {
    label: 'Beginning market value', unit: 'money', screens: ['/account-detail', '/invest'],
    grain: 'one account',
    answers: 'What this one account was worth on the day the window opens \u2014 read from the record; where the record does not reach '
      + 'that day, worked back from each holding\u2019s price history, and the screen says so (DEC-3656, DEC-5291).',
    formula: 'the account\u2019s value on the day before the window opens, as recorded',
    inputs: ['MK-NW-I-003 the recorded history'],
    decisions: [
      'READ FROM THE RECORD where it reaches the day; where it does not, WORKED BACK from today\u2019s values less each holding\u2019s '
      + 'known gain less the money moved, and said in a sentence ("…so the beginning is worked back from today\u2019s values and each '
      + 'holding\u2019s price history") (DEC-3656, DEC-5068, DEC-5291; row words corrected 2026-10-21 \u2014 they said never back-solved).',
      'THE DAY BEFORE THE WINDOW OPENS, not the day it opens \u2014 B-115, found 2026-09-30.',
    ],
    refusal: 'Neither the record nor a price history reaches that far: the holding with no price history is named and left out (DEC-5068).',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$30,000', run: () => PERF().walk!.beginning },
  },
  'MK-PF-M-014': {
    label: 'Wealth generated', unit: 'money', screens: ['/account-detail'], grain: 'one account',
    answers: 'What this one account earned over the window \u2014 what is left after the money you put in '
      + 'and took out is accounted for.',
    formula: 'ending \u2212 beginning \u2212 contributions + withdrawals',
    inputs: ['MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: [
      'MONEY YOU ADDED IS NOT WEALTH YOU GENERATED. That is the whole distinction this figure exists '
      + 'to draw, and it is why a balance going up is not the same as having earned anything.',
      'A DIVIDEND IS INSIDE IT, because it was earned by the holding rather than added by you.',
    ],
    refusal: 'No beginning to measure from \u2014 the line shows nothing rather than a change.',
    ruled: '2026-10-01',
    // $46,600 today, $30,000 at the start, $6,000 paid in: $46,600 − $30,000 − $6,000 = $10,600
    worked: { given: GIVEN, answer: '$10,600', run: () => PERF().walk!.wealthGenerated },
  },
  'MK-PF-M-015': {
    label: 'one line of the walk', unit: 'money', screens: ['/account-detail', '/invest'],
    grain: 'one line of one account\u2019s walk',
    answers: 'One step that took this account from its beginning to its ending \u2014 money in, money out, '
      + 'or the change in what the holdings are worth.',
    formula: 'each recorded flow over the window, and the remainder as the change in value',
    inputs: ['MK-NW-I-004 the activity records'],
    decisions: [
      'THE LINES ALWAYS SUM TO THE ENDING, by construction. Whatever the records cannot explain lands '
      + 'in the change-in-value line rather than being silently dropped \u2014 a walk that does not add up '
      + 'is worse than no walk.',
    ],
    refusal: 'No flows recorded \u2014 the line is not drawn.',
    ruled: '2026-10-01',
    // money paid in over the window — $6,000 on 1 April
    worked: { given: GIVEN, answer: '$6,000', run: () => PERF().walk!.contributions },
  },
  // ISSUED AND DECLARED 2026-10-01 (Account portfolio built to Performance v17 frame 2, DEC-0646). The
  // Return across the top and in the SUMMARY trio printed under MK-PF-M-008, which is the MARKET's
  // return — a different figure. This is the account's own.
  'MK-PF-M-016': {
    label: 'Return', unit: 'percent-signed', screens: ['/account-detail', '/invest'], grain: 'one account',
    answers: 'How much this one account grew over the window you picked, with money you added or took out left out. '
      + 'Shown per year when the window is longer than a year.',
    formula: 'split the window at every day money moved in or out; each day\u2019s link = that evening\u2019s value \u00f7 (the previous evening\u2019s value + money added that day \u2212 money taken out that day) \u2014 money that moves on a day counts for that whole day (DEC-4439); multiply the pieces and take 1 off \u2014 a time-weighted return; a window longer than a year is turned into a yearly rate: (1 + the return)^(365 \u00f7 days) \u2212 1',
    inputs: ['MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: [
      'TWO DECIMALS AND ITS SIGN, always (Q49): +6.67%, \u22120.57% \u2014 never +6.7%, never a bare 6.67%.',
      'EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): "All return should be True Weighted Return and not Dietz return."',
      'WHERE IT CANNOT BE MEASURED IT SHOWS NO PERCENT, and never another method in its place.',
      'ONE METHOD WITH THE PORTFOLIO: the same door the Performance tab calls, asked for this one account.',
      'LONGER THAN A YEAR IS READ ON THE CALENDAR (DEC-3768b, DEC-0237): a window that opens one year back to the day is a year, though it counts 366 days, and is never made yearly; a longer one is made yearly over its own days \u00f7 365, the one rule every screen uses (2026-10-21, MK-PF-M-016) \u2014 21% over 731 days is +9.99% a year on the account and on each holding alike. Over a year the page says it: the window\u2019s own total, which is this yearly rate.',
    ],
    refusal: 'No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, there was nothing to grow from that day (the previous evening plus the money moved is zero or less while the day holds a value), or the value recorded on a day is below $0 (2026-10-21) \u2014 never read as $0 and \u2212100.00%. It never shows another kind of figure in its place.',
    ruled: '2026-10-04',
    // $30,000 became $32,000 with nothing paid in or out: ($32,000 \u2212 $30,000) \u00f7 $30,000 = +6.67%
    worked: { given: QUIET_GIVEN, answer: '+6.67%', run: () => QUIET_PERF().ret },
  },
  // ISSUED AND DECLARED 2026-10-21 (Performance audit row 9, rule 11): the account page's BY CATEGORY & HOLDING table printed
  // each holding's and each class's Return with no identifier — the guard that counts unnamed figures read dollars only, so it
  // could not see a percent. Issued under rule 11 (every figure a person reads is declared) and the decisions each row names;
  // `ruled` is the issue date, as MK-NW-M-065 and 066 were issued under DEC-0281. To reverse: delete the two rows and print pct2 again.
  'MK-PF-M-023': {
    label: 'Return (one holding) · Your return, past <window> · Your return since purchase', unit: 'percent-signed',
    screens: ['/account-detail', '/holding-detail'], grain: 'one holding',
    answers: 'How much one holding grew over the window picked, dividends included, and for a bond or a CD the interest it was paid — '
      + 'from its purchases when it was bought inside the window. The same figure on its account\u2019s page and on its own page.',
    formula: 'the holding\u2019s latest close \u00f7 its close on the day before the window opens, less 1, dividend-adjusted (DEC-0315, DEC-4645); '
      + 'bought inside the window: from each purchase, time-weighted (DEC-1669, DEC-4439); for a bond or a CD, (1 + that) \u00d7 (1 + the '
      + 'interest paid in the window \u00f7 what it was worth when its figure began) \u2212 1 (MK-PF-F-049 returnWithInterest); over 2Y a yearly '
      + 'rate, (1 + the return)^(365 \u00f7 days) \u2212 1 (MK-PF-F-014 buildPerformance, asked one way by holdingRowsIn in holding.ts)',
    inputs: ['MK-NW-I-005 the price feed', 'MK-NW-I-004 the activity records'],
    decisions: [
      'TWO DECIMALS AND ITS SIGN (Q49): +10.00%, \u221210.00%.',
      'A BOND\u2019S OR A CD\u2019S RETURN COUNTS THE INTEREST IT WAS PAID (DEC-6212, 2026-10-19).',
      'MEASURED FROM THE CLOSE BEFORE THE WINDOW\u2019S FIRST DAY (DEC-0315).',
      'A ROW THAT IS THE WHOLE ACCOUNT prints the account\u2019s own Return (MK-PF-M-016), so one figure is never written two ways.',
      'ONE HOLDING, ONE FIGURE ON BOTH PAGES (2026-10-22; tenet 4): the account page and the Holding page ask one function, '
      + 'holdingRowsIn, and print this identifier. MK-NW-M-069, issued the day before for the Holding page, is retired into it. Before, '
      + 'the account page printed the holding\u2019s price move over the whole window, so one bought inside the window read a figure '
      + 'its own page did not, and over 2Y it printed the window\u2019s total beside the account\u2019s yearly rate.',
      'OVER 2Y IT IS A YEARLY RATE (DEC-0237, DEC-0404, DEC-0368): the Holding page writes /year and the window\u2019s own total beside it; '
      + 'on the account page it sits beside the account\u2019s own yearly rate, whose sentence says so.',
    ],
    refusal: 'An em-dash: no price history reaches the window\u2019s first day, or the window begins today (day one); on the Holding page a line says which.',
    ruled: '2026-10-21',
    // VOO closed $500.00 the day before the window opened and $550.00 today, nothing paid: $550 ÷ $500 − 1 = +10.00%
    worked: {
      given: 'VOO, 10 shares bought Jan 2, 2024, worth $5,500 today (Oct 21, 2026). The past year opens Oct 21, 2025; the last close on or '
        + 'before the day before is $500.00 on Sep 30, 2025, and the latest is $550.00 on Oct 20, 2026. Nothing was paid on it.',
      answer: '+10.00%',
      run: () => holdingRowsIn({
        account: { asset_id: 'v', label: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 5_500 } as any,
        positions: [{ position_id: 'voo', ticker: 'VOO', asset_class: 'stock_etf', lots: [{ lot_id: 'l', shares: 10, cost_per_share: 400, purchase_date: '2024-01-02' }] } as any],
        priceOf: () => ({ ticker: 'VOO', points: [{ date: '2025-09-30', close: 500 }, { date: '2026-10-20', close: 550 }] }),
        period: '1Y', transactions: [], now: new Date('2026-10-21T12:00:00'),
      })[0].periodReturn,
    },
  },
  'MK-PF-M-024': {
    label: 'Return (one class inside one account)', unit: 'percent-signed', screens: ['/account-detail'], grain: 'one class in one account',
    answers: 'How much one kind of holding inside this account grew over the window — its holdings together, each counted at what it was worth when the window began.',
    formula: 'what the class’s holdings are worth now (with the interest they were paid) ÷ what they were worth when the window began (each one’s now ÷ (1 + its own return)), less 1 (MK-NW-F-142 classReturnOf)',
    inputs: ['MK-NW-I-005 the price feed', 'MK-NW-I-001 your accounts'],
    decisions: [
      'TWO DECIMALS AND ITS SIGN (Q49).',
      'WEIGHED BY WHAT EACH HOLDING WAS WORTH WHEN THE WINDOW BEGAN, the Performance tab’s rule (MK-NW-F-084), never by today’s values.',
      'A HOLDING WORTH $0 TODAY counts at what it was worth when the window began (2026-10-21, tenet 4).',
      'A CLASS THAT IS THE WHOLE ACCOUNT prints the account’s own Return (MK-PF-M-016).',
    ],
    refusal: 'An em-dash: no holding in the class can be measured over this window.',
    ruled: '2026-10-21',
    // $6,600 now at +10% began at $6,000; $3,600 now at −10% began at $4,000: $10,200 ÷ $10,000 − 1 = +2.00%
    worked: {
      given: 'Two stock holdings in one account: one worth $6,600 today that returned +10% over the window, one worth $3,600 that returned −10%.',
      answer: '+2.00%',
      run: () => classReturnOf([{ marketValue: 6_600, total: 0.10 }, { marketValue: 3_600, total: -0.10 }]),
    },
  },
  // ISSUED AND DECLARED 2026-10-01 (Performance step 1.c): the Performance tab printed its own Return,
  // its walk and its trade sheet's cash with no identifier — 23 figures. These are EVERY ACCOUNT TOGETHER,
  // which is why they are not the one-account rows above (MK-PF-M-013 to 016).
  'MK-PF-M-017': {
    label: 'Return', unit: 'percent-signed', screens: ['/invest'], grain: 'every account together',
    answers: 'How much all your investments grew over the window you picked, with money you added or took out left out. '
      + 'Per year when the window is longer than a year.',
    formula: 'over every investment account together: split the window at every day money moved in or out; each day\u2019s link = that evening\u2019s value \u00f7 (the previous evening\u2019s value + money added that day \u2212 money taken out that day) \u2014 money that moves on a day counts for that whole day (DEC-4439); multiply the pieces and take 1 off \u2014 a time-weighted return; a window longer than a year is turned into a yearly rate: (1 + the return)^(365 \u00f7 days) \u2212 1',
    inputs: ['MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: [
      'TWO DECIMALS AND ITS SIGN, always (Q49).',
      'EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669). Where it cannot be measured it shows no percent, and never another method in its place.',
      'AN ACCOUNT THAT JOINS THE RECORD inside the window counts as money in, at its first recorded value \u2014 nothing it was already worth is earned; when money was added to it that day, that money is what arrived and it was worth $0 the evening before (DEC-4439).',
      'THE SAME DOOR AS ONE ACCOUNT\u2019S RETURN (MK-PF-M-016), asked for every account at once \u2014 one method, never two.',
      'LONGER THAN A YEAR IS READ ON THE CALENDAR (DEC-3768b, DEC-0237): a window that opens one year back to the day is a year, though it counts 366 days, and is never made yearly; a longer one is made yearly over its own days \u00f7 365, the one rule every screen uses (2026-10-21, MK-PF-M-016).',
    ],
    refusal: 'No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, there was nothing to grow from that day (the previous evening plus the money moved is zero or less while the day holds a value), or the value recorded on a day is below $0 (2026-10-21) \u2014 never read as $0 and \u2212100.00%. It never shows another kind of figure in its place.',
    ruled: '2026-10-04',
    // $30,000 became $32,000 with nothing paid in or out: ($32,000 \u2212 $30,000) \u00f7 $30,000 = +6.67%
    worked: { given: QUIET_GIVEN, answer: '+6.67%', run: () => QUIET_PERF().ret },
  },
  'MK-PF-M-018': {
    label: 'Beginning market value', unit: 'money', screens: ['/invest'], grain: 'every account together',
    answers: 'What all your investments were worth on the day the window opens \u2014 read from the daily record, or worked back from each holding\u2019s price history where the record does not reach it.',
    formula: 'the recorded value of every investment account at the close of the day before the window opens',
    inputs: ['MK-NW-I-003 the recorded history'],
    decisions: ['READ FROM THE DAILY RECORD where it reaches the day; where it does not, worked back from today\u2019s values and each holding\u2019s price history and said in a sentence (DEC-3656, DEC-5068, DEC-5291; row words corrected 2026-10-21 \u2014 they said never back-solved).'],
    refusal: 'Neither the record nor a price history reaches that far: the holding with no price history is named and left out (DEC-5068).',
    ruled: '2026-10-01',
    worked: { given: GIVEN, answer: '$30,000', run: () => PERF().walk!.beginning },
  },
  'MK-PF-M-019': {
    label: 'one line of the walk', unit: 'money', screens: ['/invest'], grain: 'every account together',
    answers: 'One line of how the beginning became the ending, over every account: contributions, withdrawals, dividends, interest, or the change in investment value.',
    formula: 'contributions and withdrawals from the records inside the window; dividends and interest received; change in value = ending \u2212 beginning \u2212 contributions + withdrawals \u2212 dividends \u2212 interest',
    inputs: ['MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: ['THE LINES ALWAYS ADD UP TO THE ENDING \u2014 the change in investment value is what is left, so nothing is lost between the lines.'],
    refusal: 'A real $0 \u2014 a line with nothing in it still prints, so the structure never changes.',
    ruled: '2026-10-01',
    // $6,000 paid in on 1 Apr is the Contributions line
    worked: { given: GIVEN, answer: '$6,000', run: () => PERF().walk!.contributions },
  },
  'MK-PF-M-020': {
    label: 'Available cash', unit: 'money', screens: ['/invest'], grain: 'one account',
    answers: 'The cash in this account that a buy, a withdrawal or a transfer can use right now.',
    formula: 'the cash sleeve of a brokerage account; the whole balance of a cash account',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['A BUY OR WITHDRAWAL BIGGER THAN THIS IS REFUSED on the sheet, with the words to deposit or transfer cash in first.',
      'CASH NEVER ENTERED IS NOT $0 (2026-10-21; DEC-3279e, tenet 3): an investment account with no cash on record reads not entered, and the sheet does not refuse a buy or a withdrawal on it. No account picked: the line is not shown.'],
    refusal: 'not entered',
    ruled: '2026-10-01',
    worked: { given: 'A savings account holding $5,000 and nothing else.', answer: '$5,000', run: () => availableCash({ asset_id: 'x', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 5_000 } as any) },
  },
  // ISSUED 2026-10-19 by DEC-6076: the two amounts inside the sentence under the summary where a holding with no
  // price history is left out, each written by the one figure writer under its own identifier.
  'MK-PF-M-021': {
    label: 'the value the return is on (with a price history)', unit: 'money', screens: ['/invest', '/account-detail', '/home'],
    grain: 'the accounts the summary is for',
    answers: 'How many of today\u2019s dollars the Return is measured on, where some holdings have no price history.',
    formula: 'today\u2019s value of every holding the return counts (MK-NW-F-138 knownHoldingsReturn: a price history over the window, or a CD\u2019s stated rate), added up',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    decisions: ['DEC-6076 \u2014 the sentence says what the Return is on, so +10% is read as 10% of $40,000, not of $50,000.', 'DEC-5068 \u2014 a holding with no price history is left out, never counted at 0%.'],
    refusal: 'No holding is counted: the first sentence is not said, only the left-out one.',
    ruled: '2026-10-19',
    worked: { given: LEFT_GIVEN, answer: 'Return is on the $40,000 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included.', run: () => LEFT_OUT().notIncluded },
  },
  'MK-PF-M-022': {
    label: 'the value left out (no price history)', unit: 'money', screens: ['/invest', '/account-detail', '/home'],
    grain: 'the accounts the summary is for',
    answers: 'What the holdings left out of Wealth generated and Return are worth today.',
    formula: 'today\u2019s value of every holding with no price history and no stated rate (MK-NW-F-128 heldValueOf), added up',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['DEC-6076 \u2014 named in brackets after the holdings it is the value of.'],
    refusal: 'A holding whose value is not known: the brackets are left off.',
    ruled: '2026-10-19',
    worked: { given: LEFT_GIVEN, answer: 'Return is on the $40,000 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included.', run: () => LEFT_OUT().notIncluded },
  },
  'MK-PF-M-006': {
    label: 'WHAT EACH CATEGORY EARNED — RETURN', unit: 'percent-signed', screens: ['/invest'],
    answers: 'What each kind of holding returned over the window you picked.',
    formula: "each class's own growth over the window: what its holdings are worth now ÷ what they were worth when the window began (each now ÷ (1 + its own return over the whole window, never a yearly rate); a holding worth $0 today, the value it was read at when the window began — 2026-10-21), less 1",
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-006 the price fetched at'],
    decisions: [
      'A class with no holding we can price shows an em-dash, never a 0% — a zero reads as "it returned nothing", which is a different claim.',
      'MOVED OFF THE SCREEN 2026-09-30: this was calculated inside PerformanceScreen, so it had no row, no example and nothing able to check it (his rule: a screen computes nothing).',
    ],
    refusal: 'An em-dash — no holding in that class can be priced over this window.',
    worked: {
      given: CAT_GIVEN,
      answer: '+12.00%',
      run: () => CAT('stocks_etf')?.ret ?? null,
    },
    ruled: '2026-09-03',
  },
  'MK-PF-M-007': {
    label: 'All categories', unit: 'money', screens: ['/invest'],
    answers: 'What you actually received, in dividends and interest, over the window — by kind.',
    formula: 'every dividend and interest record inside the window, added up by the class of the holding that paid it',
    inputs: ['MK-XS-I-020 the records of money movements'],
    decisions: [
      'LEDGER ONLY: what was actually RECEIVED, never a rate applied to a balance.',
      'A RECORD WITH NO TICKER names no holding (row words corrected 2026-10-21, outside re-run OpenAI part 1, to what the screen does): interest with no ticker is interest on the account\u2019s own cash and sits under Cash in this account; a dividend with no ticker sits under Unclassified (DEC-2160), never a guessed class.',
      'A class that received nothing is not shown at all; where nothing was received the table does not appear.',
    ],
    refusal: 'The table does not appear — nothing was received in this window.',
    worked: {
      given: CAT_GIVEN,
      answer: '$865',
      run: () => CAT('stocks_etf')?.earned ?? null,
    },
    ruled: '2026-09-03',
  },
  'MK-PF-M-008': {
    label: 'market +X%', unit: 'percent-2dp', screens: ['/home'],
    answers: 'What the market did over the SAME days, matched to what you actually hold.',
    // the formula and the refusal as the code is built (PF-RECORDS wrote them on the master 2026-10-21 from portfolioBenchReturn;
    // carried here 2026-10-22 so the declaration and the file say one thing, and the override lines retire)
    formula: "Each holding is set beside its own yardstick over the same dates as its own return \u2014 from the window's start, or from the day it was bought inside the window (DEC-7223). The window is split at the same days as your return \u2014 every day money went into or out of a holding \u2014 and on each piece every yardstick is weighted by what that holding was worth when the piece began, the weights your own return carries (2026-10-22, the lead's decision under DEC-1669 and tenets 1 and 7). With no money moved inside the window there is one piece, weighted by what each holding was worth when the window began: the shares held then \u00d7 that day's close (DEC-7221). A holding with no return of its own is left out of both sides. If a holding counted in your return has no yardstick, there is no market figure (DEC-7224). Every yardstick includes its dividends and interest (DEC-4645).",
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-006 the price fetched at'],
    decisions: [
      'The benchmark runs over the SAME DATES as your return — including where your window is cut short at your own purchase date. Comparing your three months against the market\'s twelve is not a comparison.',
      'Weighted by what each holding was worth when the window began, so the blend answers "the market, matched to my mix" rather than a plain average of indices — and a holding that grew does not grow its yardstick\'s weight (outside review Claude Performance, 2026-10-11, DEC-1669, DEC-3035b).',
      'THE MARKET INCLUDES ITS DIVIDENDS AND INTEREST (DEC-4645, 2026-10-12): SPY and AGG are read through the same dividend-adjusted closes as every holding (src/services/marketData.ts, adjclose).',
    ],
    refusal: "No market figure is shown: no yardstick can be priced over the window, or a holding counted in your return has none (DEC-7224). It is a percent, so the $0 empty-state line (Q48, for dollar figures) never applied to it.",
    ruled: '2026-09-30',   // his "Q51 -approved." on the Home line (DEC-0640), with DEC-0595 and DEC-4645; Q33 answered by DEC-7229
    worked: {
      given: BENCH_GIVEN,
      answer: '8.80%',
      run: () => BENCH(),
    },
    note: 'ITS SCREEN WAS WRONG UNTIL 2026-09-30. The row said /invest and called it HONEST COMPARISON — '
      + 'the name of a card the approved mock v14 removed on 2026-09-25 ("not in this design, so they go"). '
      + 'The figure itself is alive, on HOME, inside the glance line "you +3.69% \u00b7 market +2.83% \u00b7 ahead by 0.85%". '
      + 'Nothing showed it on Performance. Declared 2026-09-30; hand-typed before that, so nothing compared the row with the code. '
      + 'STILL OPEN FOR HIM: the market side counts PRICE CHANGE ONLY (we hold no dividend record for an index), '
      + 'while the "you" side beside it counts dividends and interest \u2014 so the "ahead by" is not a like-for-like gap. '
      + 'Corrected 2026-10-12: the market figure uses SPY and AGG adjusted closes, which include their dividends and interest. Both sides of "ahead by" therefore count income, and the line is like-for-like; his approved wording stays '
      + 'word for word (DEC-4645).',
  },
  // ISSUED AND DECLARED 2026-10-22 (W-A11Y; DEC-0402 step 2, found BREACHED by PF-DECISIONS): Home's glance line printed
  // "ahead by 0.85%" with a percent writer of its own, so the gap carried no identifier. It is the gap marketGap gives — the
  // one function each holding's "You are ahead by" reads (MK-NW-M-071) — for every investment together, as MK-PF-M-008 is the
  // market for every investment together beside MK-NW-M-070's one holding. `ruled` is the issue date, as MK-NW-M-065 was.
  // To reverse: delete this row and print the gap with Home's own writer again.
  'MK-PF-M-027': {
    label: 'ahead by / behind by (your return less the market\u2019s)', unit: 'percent-2dp', screens: ['/home'], grain: 'every investment together',
    answers: 'How far your investments\u2019 return over the month is above or below the market\u2019s over the same days, matched to what you hold.',
    formula: 'your return (MK-XS-M-004) less the market\u2019s (MK-PF-M-008) \u2014 marketGap (src/domain/performance), the one function the Holding page\u2019s gap reads; "ahead" when it is 0 or more, "behind" otherwise, and the size printed without its sign',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-006 the price fetched at', 'MK-XS-I-020 the records of money movements'],
    decisions: ['HIS RULING ON Q51 (2026-09-30): "you +3.69% (including dividend and interest), market +2.83%, ahead by 0.85%" \u2014 his words, printed word for word.',
      'TWO DECIMALS (Q49).', 'BOTH SIDES COUNT DIVIDENDS AND INTEREST (DEC-4645): the market is read from adjusted closes, so the gap is like for like.'],
    refusal: 'Either side missing: the line is not shown.',
    ruled: '2026-10-22',
    // your holdings did not move (+0.00%); the market, matched to them, rose 8.80%: 0.00% \u2212 8.80% = behind by 8.80%
    worked: { given: BENCH_GIVEN + ' Your own return over those days: +0.00%.', answer: '8.80%', run: () => Math.abs(marketGap(0, BENCH()) as number) },
  },
  'MK-XS-M-004': {
    label: '\u25b2 up/\u25bc down $X (Y%) this month \u00b7 Return \u00b7 YOUR RETURN', unit: 'percent-2dp', screens: ['/invest', '/home'],
    answers: 'What your investments earned over the window you picked \u2014 dividends and interest included.',
    formula:
      'the time-weighted return of every investment account together: the window split at every day money moved in or out, '
      + 'each piece = the value just before the next movement \u00f7 the value just after the last one, the pieces multiplied, less 1; '
      + 'over a window longer than a year it is shown as a yearly rate',
    inputs: ['MK-XS-I-020 the records of money movements', 'MK-NW-I-001 your accounts', 'MK-XS-I-006 the price fetched at'],
    decisions: [
      'ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are in it, because "Wealth generated" beside it counts them.',
      'A RATE NEEDS SOMETHING TO STAND ON: with no beginning read from the record and no movement to point at, it shows nothing rather than a confident +0.00%.',
      'IT IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): "All return should be True Weighted Return and not Dietz return." Where a piece cannot be measured it shows nothing, and never another method.',
      'OVER A YEAR IT IS A YEARLY RATE and the screen says so (his ruling, 2026-08-18, restated 2026-09-25).',
    ],
    refusal: 'Nothing is shown, and the walk beneath says in words why \u2014 either the record cannot reach the beginning, or money moved on a day with no recorded value.',
    worked: {
      given: QUIET_GIVEN,
      answer: '6.67%',
      run: () => QUIET_PERF().ret,
    },
    note: 'DECLARED 2026-09-30. It is the screen\u2019s headline figure \u2014 the number in the summary band, on every '
      + 'window chip, and on Home\u2019s glance card \u2014 and NO DOOR DECLARED IT. The old metric register has carried '
      + 'the identifier since the start ("\u25b2 up/\u25bc down $X (Y%) this month \u00b7 Return \u00b7 YOUR RETURN"), but the code '
      + 'declared the ending value, the wealth generated and the walk and not the percentage a person actually '
      + 'reads. That is why Home could print a return of its own and no gate noticed (B-112): there was no figure '
      + 'for the two screens to disagree about. It is an MK-XS identifier because it is on more than one screen.',
  },
  'MK-PF-M-001': {
    label: 'Ending value', unit: 'money', screens: ['/invest', '/home'],
    answers: 'What your investments are worth at the end of the window you picked.',
    formula: 'the sum of every investment account’s value today',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    refusal: 'Nothing invested yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$46,600',
      run: () => PERF().walk!.ending,
    },
  },
  // ON HOME TOO (2026-10-22, W-A11Y): Home's "up $8,200 this month" is this figure for the 1M window — one figure, its identifier
  // reused, never a second (held on both screens by pfb_cross_screen_agreement_2026_10_21, section 4)
  'MK-PF-M-002': {
    label: 'Wealth generated', unit: 'money', screens: ['/invest', '/home'],
    answers: 'What the money itself made in the window — not what you added to it.',
    formula: 'ending − beginning − what you put in + what you took out',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-004 the activity records', 'MK-NW-I-003 the recorded history'],
    decisions: ['ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are part of this, so the return beside it counts them too.'],
    refusal: 'The record cannot reach the start of this window, so there is nothing honest to subtract from.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$10,600',
      run: () => PERF().walk!.wealthGenerated,
    },
  },
  'MK-PF-M-003': {
    label: 'HOW $X BECAME $Y · ALL ACCOUNTS', unit: 'words', screens: ['/invest'],
    period: 'the window picked',   // the walk's beginning and ending are the window's (2026-10-22, the master's Period row)
    answers: 'Every line that took the beginning to the ending, so it can be checked by eye.',
    formula: 'beginning + contributions − withdrawals + wealth generated = ending, by construction',
    inputs: ['MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: ['Whatever the records cannot explain lands in the change-in-value line rather than being silently dropped.'],
    refusal: 'No beginning to walk from.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: 'HOW $30,000 BECAME $46,600 · ALL ACCOUNTS',
      run: () => `HOW ${formatMoney(PERF().walk!.beginning)} BECAME ${formatMoney(PERF().walk!.ending)} · ALL ACCOUNTS`,
    },
  },
  'MK-PF-M-004': {
    // ONE FIGURE ON TWO SCREENS (rule 1): the account page shows the very same ending value, so it
    // is listed here rather than issued a second identifier.
    label: 'Ending market value (per account)', unit: 'money', screens: ['/invest', '/account-detail'],
    grain: 'one account',
    answers: 'What one account is worth at the end of the window.',
    formula: 'the sum of that account’s holdings, at today’s prices, plus its cash',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    refusal: 'Nothing in it.',
    worked: {
      given: GIVEN + ' Asked of that one account.',
      answer: '$46,600',
      run: () => PERF_ONE(['a2']).walk!.ending,
    },
    ruled: '2026-09-27',
  },
  'MK-PF-M-005': {
    label: 'each account and its ending value', unit: 'money', screens: ['/invest'], grain: 'one account',
    answers: 'One line per account, and what it is worth — the parts that sum to the whole above.',
    formula: 'each investment account’s value, named by the account',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['Named by ACCOUNT, not by institution — two accounts at one broker must be tellable apart (founder screenshot, 2026-08-17).'],
    // AS BUILT (2026-10-22, Performance audit, workplan "The $0 empty-state refusal of Q48…"): it said "One account only — the
    // whole walk above already says it", but the screen lists a lone account too (v17 phone 3, closed), and the master printed
    // Q48's "$0" over it, which this list never shows — with nothing entered it is not drawn at all.
    refusal: 'No account line while nothing is entered: the one line and its door to add an account stand in their place (Q48). An account is listed once it has a balance above $0 or a holding in it.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN + ' Each account is asked separately, from the same door as the total.',
      answer: '$46,600',
      run: () => PERF_ONE(['a2']).walk!.ending,
    },
  },
});
