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
import { declareFigures } from '../_figure-spec';
import { portfolioBenchReturn } from '../../../src/domain/performance';
import { formatMoney } from '../../../src/domain/_shared/money';
import { buildChangeWalk, type ChangeWalk } from '../../../src/domain/history';
import { personalFlowTotals } from '../../../Calculation Module code/engines/ledger';
import { windowBounds } from '../../../Calculation Module code/engines/window-return';
import { valueOn, covers as snapshotCovers, buildDayFromAccounts, accountValuesOn, record as recordDay } from '../../../Calculation Module code/engines/snapshots';
import { timeWeightedReturn, movementsOf, type TimeWeightedVerdict } from '../../../Calculation Module code/engines/time-weighted-return';
import { dateShown } from '../../../src/domain/_shared/dates';
import { accountDisplayNames } from '../../../src/domain/assets';
import { isCertificateOfDeposit } from './bonds';

export interface WindowFigures {
  /** The first day of the window, or null for "since the record began". */
  windowStart: string | null;
  /** The records inside the window. */
  ledger: any[];
  /** How the beginning became the ending, line by line — the rows always sum to the ending. Null when
   *  the record cannot reach the window's beginning: the walk is not drawn rather than started from a
   *  beginning worked back from today (outside review, 2026-10-07; Performance v17). */
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
  /** Set only where the beginning would be worked back from today and a holding's gain cannot be known:
   *  "The beginning can't be worked back: … has no price history." Empty otherwise. (DEC-3656, 2026-10-09) */
  cannotWorkBack: string;
}

/** THE THREE THINGS A SCREEN NEEDED TO ASK THIS DOOR, and calculated for itself until 2026-09-30.
 *
 *  The door's own header has said since 2026-09-27 that "the return on Home's card and the return on
 *  Performance can never disagree". They did. Performance called this door; Home kept a return of its
 *  own, from price change only, and the two screens showed 3.57% and 3.69% for the same month on the
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

/** The first day of a period: the day after the record's first day for Since, 1 January for This year, and the same day one month, one year or two years back for the others. */
/* ─ MK-NW-F-090 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * windowStartKey
 *
 * Answers ..... The first day of a period: the day after the record's first day for Since, 1 January for This year, and the same day one month, one year or two years back for the others.
 *
 * Formula .....
 *     first = record dates where ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(each)the first of , in order
 *     today   when first is missing
 *     after = the first 10 of the date date.parse(`${first}T00:00:00Z`) + 86400000).to isostring(
 *     the answer:
 *     after   if after ≤ today
 *     today   otherwise
 *     d = the date today + 'T12:00:00Z'
 *     months = '1 m': 1 = '1 m': 1
 *     '3 m': 3 = '3 m': 3
 *     '6 m': 6 = '6 m': 6
 *     '1 y': 12 = '1 y': 12
 *     '2 y': 24 = '2 y': 24
 *     `${today.slice(0, 4)}-01 − 01`   when period = 'YTD'
 *     back = months[period] (or 12 when missing)
 *     y = get utcfull year(), m = get utcmonth() − back, day = get utcdate()
 *     last day = the date date.UTC(y, m + 1, 0)).get utcdate(
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If months[period] is missing it uses 12.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-090
 * Changed ..... 2026-09-30 (08d5d52)
 */
export function windowStartKey(period: string, recordDates: string[], today: string): string {
  if (period === 'SINCE') {
    const first = recordDates.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort()[0];
    if (!first) return today;
    const after = new Date(Date.parse(`${first}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    return after <= today ? after : today;
  }
  const d = new Date(today + 'T12:00:00Z');
  const months: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24 };
  if (period === 'YTD') return `${today.slice(0, 4)}-01-01`;
  // MONTHS BACK STOP AT THE MONTH'S LAST DAY (his approval, 2026-10-10, DEC-3768b): one month before Mar 31
  // is Feb 28, never Mar 3 — the calendar used to roll a missing day into the next month.
  const back = months[period] ?? 12;
  const y = d.getUTCFullYear(), m = d.getUTCMonth() - back, day = d.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, lastDay))).toISOString().slice(0, 10);
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
    .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(String(d?.date ?? '')) && valueOn([d], investmentAccountIds, d.date) != null)
    .map((d) => String(d.date).slice(0, 10))
    .sort();
}

/** MK-NW-F-091 · What the holdings gained over the window. It is used ONLY to derive a beginning the
 *  daily record cannot reach — it never becomes the return. A holding bought inside the window counts
 *  its true gain (value − cost); one with a price history counts what the window's price move gave it;
 *  a CD stating its rate counts what that rate gave it; any other holding's gain is UNKNOWN, and the
 *  answer is null rather than $0 (DEC-3656, 2026-10-09). */

/** What the holdings gained over the period in dollars: the true gain for a holding bought inside the period, the price move's share of today's value for one with a price history, the stated rate's share for a CD — and nothing (unknown) when any holding has neither. */
/* ─ MK-NW-F-091 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
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
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-012 bond coupon rate
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
  position?: { ticker?: string; label?: string; name?: string; last_price?: number; value_now?: number; lots?: { shares?: number }[] };
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
 *     gain (or 0 when missing)   when capped since
 *     mv = market value (or 0 when missing)
 *     pr = period return
 *     mv × (1 − 1 ÷ (1 + pr))   if mv > 0
 *     0   otherwise   when pr ≠ nothing
 *     mv × (1 − 1 ÷ math.pow(1 + coupon rate, years))   if mv > 0
 *     0   otherwise   when coupon rate ≠ nothing and coupon rate > 0
 *     the answer:
 *     nothing   if held value of(r) > 0
 *     0   otherwise
 *
 * Called by ... MK-NW-F-091 pricedGainOf
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-012 bond coupon rate
 *
 * Decides .....
 *     · If gain is missing it uses 0.
 *     · If market value is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-127
 * Changed ..... not in git yet (—)
 */
function gainOfRow(r: GainRow, years: number): number | null {
  if (r.cappedSince) return r.gain ?? 0;
  const mv = r.marketValue ?? 0;
  const pr = r.periodReturn;
  if (pr != null) return mv > 0 ? mv * (1 - 1 / (1 + pr)) : 0;
  if (r.couponRate != null && r.couponRate > 0) return mv > 0 ? mv * (1 - 1 / Math.pow(1 + r.couponRate, years)) : 0;
  return heldValueOf(r) > 0 ? null : 0;
}

/** What a holding is worth when no price series prices it: the broker's last mark × shares, or the value
 *  it was built at by hand. Used ONLY to tell "holds something" from "holds nothing". (DEC-3656, 2026-10-09) */
/* ─ MK-NW-F-128 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * heldValueOf
 *
 * Answers ..... What a holding is worth when no price series prices it: the broker's last mark × shares, or the value it was built at by hand.
 *
 * Formula .....
 *     market value as number   when (market value ?? 0) > 0
 *     p = position
 *     0   when p is missing
 *     shares = Σ over lots (or none when missing) of (shares (or 0 when missing or zero))
 *     the answer:
 *     shares × last price   if last price ≠ nothing
 *     value now (or 0 when missing)   otherwise
 *
 * Called by ... MK-NW-F-127 gainOfRow
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-127 gainOfRow · MK-NW-F-091 pricedGainOf
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *
 * Decides .....
 *     · If market value is missing it uses 0.
 *     · If value now is missing it uses 0.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-128
 * Changed ..... not in git yet (—)
 */
function heldValueOf(r: GainRow): number {
  if ((r.marketValue ?? 0) > 0) return r.marketValue as number;
  const p = r.position;
  if (!p) return 0;
  const shares = (p.lots ?? []).reduce((t, l) => t + (l?.shares || 0), 0);
  return p.last_price != null ? shares * p.last_price : (p.value_now ?? 0);
}

/** What the refusal sentence calls a holding: its own name, else its ticker — a CUSIP-shaped ticker gives way
 *  to the security's name. (DEC-3656, 2026-10-09) */
/* ─ MK-NW-F-129 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * gainRowName
 *
 * Answers ..... What the refusal sentence calls a holding: its own name, else its ticker — a CUSIP-shaped ticker gives way to the security's name.
 *
 * Formula .....
 *     name   when name
 *     t = (position.ticker ?? '').trim()
 *     nm = (position.label ?? position.name ?? '').trim()
 *     the answer:
 *     nm   if ÷ ^[0 − 9A − Z]{9}$ ÷ .test(t) and ÷ \d ÷ .test(t) and nm
 *     t (or nm (or 'a holding' when missing or zero) when missing or zero)   otherwise
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
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
  return /^[0-9A-Z]{9}$/.test(t) && /\d/.test(t) && nm ? nm : (t || nm || 'a holding');
}

/** THE SENTENCE where the beginning cannot be worked back (DEC-3656, 2026-10-09, his wording). */
/* ─ MK-NW-F-130 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * cannotWorkBackSentence
 *
 * Answers ..... THE SENTENCE where the beginning cannot be worked back (DEC-3656, 2026-10-09, his wording).
 *
 * Formula .....
 *     `the beginning can't be worked back: ${list} ${names.length > 1 ? 'have' : 'has'} no price history.`
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-130
 * Changed ..... not in git yet (—)
 */
function cannotWorkBackSentence(names: string[]): string {
  const list = names.length <= 1 ? (names[0] ?? 'a holding')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `The beginning can't be worked back: ${list} ${names.length > 1 ? 'have' : 'has'} no price history.`;
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
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
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
    case 'VALUE_BELOW_MONEY_ADDED': return `The value recorded on ${on} is less than the money added that day, so a return cannot be measured across it. The dollar figures here are still right.`;
    case 'NOTHING_INVESTED': return 'Nothing was invested over this period, so there is no return to state.';
    case 'END_NOT_RECORDED': return 'Today’s value is not in your records yet, so a return cannot be measured.';
    default: return '';
  }
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
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
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
 *     days = input.snapshot days (or none when missing)
 *     joined = new map<string, { date: string; value: number }>()
 *     seen = new set<string>()
 *     j = joined.get(string(account id ?? ''))
 *     the answer = the first 10) ≤ date of not (j and string(date ?? '')
 *     flows = personal flow totals(counted)
 *     transferred in = 0, transferred out = 0
 *     net = Σ over movements of([t], input.investment account ids).flows of (amount)
 *     joined value = Σ over [...joined.values()] of (value)
 *     contributions = flows.contributions.to number(2) + transferred in + joined value
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *
 * Serves ...... MK-PF-M-002 · MK-PF-M-003 · MK-PF-M-005 · MK-PF-M-006
 *               MK-PF-M-007 · MK-PF-M-008 · MK-PF-M-013 · MK-PF-M-014
 *               MK-PF-M-015 · MK-PF-M-016 · MK-PF-M-017 · MK-PF-M-018
 *               MK-PF-M-019 · MK-PF-M-020 · MK-XS-M-004
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-024 logged expenses
 * Ruled by .... DEC-0008 · DEC-0015 · DEC-0046 · DEC-0056 · DEC-0063 · DEC-0064
 *               DEC-0065 · DEC-0084 · DEC-0093 · DEC-0097 · DEC-0106 · DEC-0112
 *               DEC-0126 · DEC-0133 · DEC-0134 · DEC-0135 · DEC-0136 · DEC-0142
 *               DEC-0143 · DEC-0149 · DEC-0160 · DEC-0165 · DEC-0173 · DEC-0182
 *               DEC-0185 · DEC-0192 · DEC-0204 · DEC-0229 · DEC-0230 · DEC-0236
 *               DEC-0255 · DEC-0257 · DEC-0322 · DEC-0323 · DEC-0357 · DEC-0368
 *               DEC-0382 · DEC-0402 · DEC-0445 · DEC-0479 · DEC-0482 · DEC-0490
 *               DEC-0498
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If ending is missing it uses 0.
 *     · If coupon rate is missing it uses 0.
 *     · If g is missing it uses 0.
 *     · If priced gain is missing it uses 0.
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
   *  cannot reach. It never becomes the return. Null = a holding's gain cannot be known (DEC-3656).
   *  A caller that hands over `holdings` instead lets the door calculate it with the window's own years. */
  pricedGain?: number | null;
  /** The holdings themselves (rows of buildPerformance, or GainRows) — preferred to `pricedGain`, so the
   *  ONE rule (pricedGainOf) decides each holding's gain over THIS window, and the refusal can name the
   *  ones it cannot know. (DEC-3656, 2026-10-09) */
  holdings?: GainRow[];
  /** True for "Since" — the whole record. Its return is the window's OWN total and is never turned
   *  into a yearly rate (Performance v17, phone 3: "Since Jun 3, 2024 +16.24% … not a yearly rate").
   *  A fixed window longer than a year (2Y) still shows the yearly rate. */
  wholeRecord?: boolean;
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
  const theirs = (input.transactions ?? []).filter((t: any) => t?.account_id == null || input.investmentAccountIds.size === 0
    || input.investmentAccountIds.has(String(t.account_id))
    || (t?.counter_account_id != null && input.investmentAccountIds.has(String(t.counter_account_id))));
  const ledger = theirs.filter(
    (t) => !windowStart || String(t.date ?? '').slice(0, 10) >= windowStart);
  const bounds = windowStart ? windowBounds(windowStart, today) : null;
  const days = input.snapshotDays ?? [];
  // READ, never back-filled (B-98)
  // …and only for the accounts named: with none named there is nothing to read (an empty set would
  // otherwise read EVERY account — the home and the bank balance included)
  const measured = bounds && input.investmentAccountIds.size > 0 && snapshotCovers(days, bounds.beginningAsOf)
    ? valueOn(days, input.investmentAccountIds, bounds.beginningAsOf) : null;
  // today's values, read the way every recorded day was read. A caller that hands over no accounts
  // and no record of today has still said what the investments are worth now (`ending`): that
  // figure closes the record, on the accounts the latest recorded day holds.
  const record = input.accounts
    ? recordDay(days.filter((d: any) => d?.date !== today), buildDayFromAccounts(input.accounts, today, `${today}T00:00:00Z`))
    : days.some((d: any) => d?.date === today) ? days : closedWith(days, input.investmentAccountIds, today, ending);

  // AN ACCOUNT THAT JOINED THE RECORD INSIDE THE WINDOW ARRIVED AS MONEY PUT IN — at its first recorded
  // value. The beginning does not hold it and the ending does, so until 2026-10-04 its whole value
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
        if (String(d.date) > bounds.beginningAsOf) joined.set(id, { date: String(d.date), value });
      }
    }
  }
  const counted = ledger.filter((t: any) => {
    const j = joined.get(String(t?.account_id ?? ''));
    return !(j && String(t?.date ?? '').slice(0, 10) <= j.date);
  });
  const flows = personalFlowTotals(counted);
  // CASH OR SHARES TRANSFERRED IN FROM OUTSIDE ARE MONEY PUT IN, and transferred out are money taken
  // out — the return counts them so, and the walk left them in "change in investment value". A
  // transfer between two of the measured accounts is neither.
  let transferredIn = 0, transferredOut = 0;
  for (const t of counted as any[]) {
    if (t?.type !== 'TRANSFER' && t?.type !== 'TRANSFER_IN_KIND') continue;
    // the one rule for what a transfer moved (the return reads the same function): cash at its
    // amount, shares at what they were worth — and nothing where the record does not say
    const net = movementsOf([t], input.investmentAccountIds).flows.reduce((sum, f) => sum + f.amount, 0);
    if (net > 0) transferredIn += net; else transferredOut -= net;
  }
  const joinedValue = [...joined.values()].reduce((t, j) => t + j.value, 0);
  const contributions = flows.contributions.toNumber(2) + transferredIn + joinedValue;
  const withdrawals = flows.withdrawals.toNumber(2) + transferredOut;
  const dividends = flows.dividends.toNumber(2);
  const interest = flows.interest.toNumber(2);

  // A WINDOW THAT OPENS TODAY has seen no price move: "your value is real, your return starts
  // measuring from today" (Performance v17, phone 4). What the holdings gained before today is not
  // this window's gain, so it is not taken off the beginning.
  //
  // WHAT THE HOLDINGS GAINED, decided by ONE rule (pricedGainOf, MK-NW-F-091) — (DEC-3656, 2026-10-09).
  // A measured account with NO positions is its own instrument: a CD stating its rate gains by that rate;
  // anything else (a bond typed by hand, a balance-only account) has no price history, so its gain is
  // unknown. With no window (day one on the account page passes none) nothing is worked back: no rate is
  // applied and nothing unknown refuses — the approved day-one page stands.
  const years = bounds ? bounds.days / 365 : 0;   // the window's days ÷ 365 — the same years the yearly rate uses
  const names = accountDisplayNames((input.accounts ?? []) as any[]);
  const instrumentRows: GainRow[] = (input.accounts ?? [])
    .filter((a: any) => input.investmentAccountIds.has(String(a?.asset_id)) && !(a?.positions?.length) && (a?.balance || 0) > 0)
    .map((a: any) => ({
      name: names.get(a.asset_id) ?? a.label ?? 'this account',
      marketValue: a.balance,
      couponRate: isCertificateOfDeposit(a) && (a.coupon_rate ?? 0) > 0 ? a.coupon_rate : null,
      periodReturn: null,
    }));
  const gainRows: GainRow[] = [...(input.holdings ?? []), ...instrumentRows];
  const rowGains = gainRows.map((r) => pricedGainOf([r], years));
  const unknownNames = gainRows.filter((_, i) => rowGains[i] == null).map(gainRowName);
  // a caller still handing over a dollar figure (no holdings) whose gain is unknown: named generically
  if (!input.holdings && input.pricedGain === null) unknownNames.push('a holding');
  const knownGain = rowGains.reduce((t: number, g) => t + (g ?? 0), 0) + (input.holdings ? 0 : (input.pricedGain ?? 0));
  const pricedGain = windowStart === today ? 0 : knownGain;
  // NO BEGINNING WORKED BACK FROM TODAY (outside review, 2026-10-07). Where the record cannot reach the
  // window's first day, the beginning used to be worked back — ending less the priced gain and the money
  // moved — and wealth generated then equalled that gain, both shown as if measured. Performance v17
  // (approved 2026-10-01): "nothing on this page shows a figure for a window its record cannot cover";
  // and wealth generated's own rule: nothing honest to subtract from. So no walk, and a sentence.
  // Only where a record EXISTS and begins too late. With no daily record at all, the account page's own
  // approved line stands: the window opens the first day money moved, the beginning is read back from the
  // activity records, it says so, and no return is measured (AccountPortfolio, 'does not reach back … yet').
  const theirDays = days.filter((d: any) => accountValuesOn(d, (x) => input.investmentAccountIds.has(x)).size > 0);
  const unreachable = windowStart != null && windowStart !== today && bounds != null && measured == null && theirDays.length > 0;
  // THE BEGINNING CANNOT BE WORKED BACK where a holding's gain is unknown (DEC-3656, 2026-10-09): no
  // beginning, no wealth generated, no walk — and a sentence that names the holding. Only where the
  // beginning WOULD be worked back: a window that opens today, no window at all (day one), a beginning
  // the record reads, or a record that begins too late (above) are untouched.
  const cannotWorkBack = windowStart != null && windowStart !== today && measured == null && !unreachable && unknownNames.length > 0
    ? cannotWorkBackSentence(unknownNames) : '';
  const beginning = measured ?? (ending - pricedGain - contributions + withdrawals);

  const walk = unreachable || cannotWorkBack ? null : buildChangeWalk({
    beginning, ending, fromLabel: input.windowLabel, toLabel: 'today',
    contributions, withdrawals, dividends, interest,
  });
  const firstRecorded = theirDays.map((d: any) => String(d?.date ?? '')).filter(Boolean).sort()[0];
  // the record begins too late — or, where the beginning would be worked back, a holding's gain cannot be known (DEC-3656, 2026-10-09)
  const cannotReach = cannotWorkBack || (unreachable && bounds && firstRecorded
    ? `The record begins ${dateShown(firstRecorded)}, so it cannot say what ${input.investmentAccountIds.size === 1 ? 'this account was' : 'these accounts were'} worth on ${dateShown(bounds.beginningAsOf)}.`
    : '');

  // A WINDOW THE RECORD CANNOT COVER ANSWERS NOTHING (Performance v17, approved 2026-10-01: "a window
  // the record cannot cover is greyed to — … nothing on this page shows a figure for a window its
  // record cannot cover"). A return needs a beginning that was READ from the record (B-98); the
  // dollar walk still answers, and only the percent is withheld.
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
    start: bounds.beginningAsOf, end: today,
  }) : null;
  const covered = measured != null && verdict?.refused !== 'START_NOT_RECORDED';
  const cumulative = covered ? verdict?.rate ?? null : null;
  // a yearly rate only for a window longer than a year: (1 + the return)^(365 ÷ days) − 1. "Since" is
  // the whole record: its figure is the window's own total, said with its two dates.
  const perYear = cumulative != null && years > 1 && !input.wholeRecord ? Math.pow(1 + cumulative, 1 / years) - 1 : null;

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
    cannotWorkBack,
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
 *     cls = string(asset class ?? '')
 *     'bonds'   when cls = 'bond' (or cls = 'bonds' when missing or zero)
 *     'cash'   when cls = 'cash'
 *     'alternatives'   when cls = 'other' (or cls = 'alternatives' when missing or zero)
 *     'bonds'   when !cls and kind = 'fixed_income'
 *     the answer = 'stocks_etf'
 *     r = rows.find((x) => string(position.ticker ?? '').to upper case() = string(tk ?? '').to upper case())
 *     category of(position)   when r
 *     in class = rows where category of(position) = cls
 *     usable = in class where period return ≠ nothing and (period return as number) > -1 and (market value ?? 0) > 0
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
 *               MK-XS-I-005 holding price
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If market value is missing it uses 0.
 *     · If balance is missing it uses 0.
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
  rows: { position?: { ticker?: string; kind?: string; asset_class?: string }; periodReturn?: number | null; marketValue?: number }[];
  /** Every bond or CD held as its own account: what it is worth and the yearly rate it states. */
  bonds?: { balance?: number; coupon_rate?: number }[];
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
    const cls = String(p?.asset_class ?? '');
    if (cls === 'bond' || cls === 'bonds') return 'bonds';
    if (cls === 'cash') return 'cash';
    if (cls === 'other' || cls === 'alternatives') return 'alternatives';
    if (!cls && p?.kind === 'fixed_income') return 'bonds';
    return 'stocks_etf';
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
  // A holding with no return, or one of −100% or worse (no start to divide by), is left out, never read as 0.
  const retOf = (cls: string): number | null => {
    const inClass = rows.filter((x) => categoryOf(x.position) === cls);
    const usable = inClass.filter((r) => r.periodReturn != null && (r.periodReturn as number) > -1 && (r.marketValue ?? 0) > 0);
    const now = usable.reduce((t, r) => t + (r.marketValue as number), 0);
    const start = usable.reduce((t, r) => t + (r.marketValue as number) / (1 + (r.periodReturn as number)), 0);
    if (now <= 0 || start <= 0) return null;
    return now / start - 1;
  };

  // A BOND STATES ITS OWN YEARLY RATE, and where every bond held states one the category shows that
  // rate — weighted by what each is worth — with "/year" on it (Performance v17: "Bonds & CDs 4.20%/year").
  // It is the same stated rate the account page prints beside the bond, so the two cannot disagree.
  // One bond with no stated rate and the category falls back to what its prices did, or to nothing.
  const held = (input.bonds ?? []).filter((b) => (b.balance ?? 0) > 0);
  // a bond held as a holding INSIDE an account states no rate here, so the category cannot speak for it
  const bondHoldings = rows.filter((x) => categoryOf(x.position) === 'bonds');
  const allState = held.length > 0 && bondHoldings.length === 0 && held.every((b) => (b.coupon_rate ?? 0) > 0);
  const heldTotal = held.reduce((t, b) => t + (b.balance ?? 0), 0);
  const statedBondRate = allState ? held.reduce((t, b) => t + (b.coupon_rate ?? 0) * (b.balance ?? 0), 0) / heldTotal : null;

  const buckets: CategoryEarned[] = [
    // "Cash in this account" is his wording of 2026-08-11; the shorter wording was declined by name
    { key: 'stocks_etf', label: 'Stocks / Funds', earned: 0, ret: retOf('stocks_etf'), yearly: false },
    { key: 'bonds', label: 'Bonds & CDs', earned: 0, ret: statedBondRate ?? retOf('bonds'), yearly: statedBondRate != null },
    { key: 'cash', label: 'Cash in this account', earned: 0, ret: retOf('cash'), yearly: false },
  ];
  for (const t of led) {
    if (t?.type !== 'DIVIDEND' && t?.type !== 'INTEREST') continue;
    const amt = Math.abs(Number(t.amount) || 0);
    // A RECORD THAT NAMES NO HOLDING is classed by what it is. A dividend comes from a fund. Interest
    // that names nothing is what the uninvested balance earned — "Cash in this account", where the
    // approved drawing puts it (Performance v17, phones 1 to 3). Interest that NAMES a holding we hold
    // no price for is a bond's or a CD's (B-116), and stays under Bonds & CDs.
    const cls = t.ticker ? classOfTicker(t.ticker, t.type) : (t.type === 'DIVIDEND' ? 'stocks_etf' : 'cash');
    const b = buckets.find((x) => x.key === cls)
           ?? buckets.find((x) => x.key === (t.type === 'DIVIDEND' ? 'stocks_etf' : 'bonds'))!;
    b.earned += amt;
  }
  // day one shows every category at $0 with NO return — nothing has been measured yet, and a holding's
  // lifetime gain is not this window's. Any other day a category that received nothing is left out.
  return input.dayOne ? buckets.map((b) => ({ ...b, ret: null, yearly: false })) : buckets.filter((b) => b.earned > 0);
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
  + '4% over the same days.';

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
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-088
 * Changed ..... not in git yet (—)
 */
const BENCH = () => portfolioBenchReturn([
  { benchReturn: 0.10, marketValue: 40000 },
  { benchReturn: 0.04, marketValue: 10000 },
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
    answers: 'What this one account was worth on the day the window opens, READ from the record \u2014 '
      + 'never back-solved from today.',
    formula: 'the account\u2019s value on the day before the window opens, as recorded',
    inputs: ['MK-NW-I-003 the recorded history'],
    decisions: [
      'IT IS READ, NOT BACK-SOLVED. Working it out from today\u2019s value less the flows would make the '
      + 'walk add up by construction and prove nothing (his ruling behind MK-NW-F-090).',
      'THE DAY BEFORE THE WINDOW OPENS, not the day it opens \u2014 B-115, found 2026-09-30.',
    ],
    refusal: 'The record does not reach back that far, so the walk is not drawn at all rather than '
      + 'started from a guess.',
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
    formula: 'split the window at every day money moved in or out; each piece = the value just before the next movement \u00f7 the value just after the last one (the record holds one value a day, taken after that day\u2019s money moved, so just before = that day\u2019s value \u2212 the movement); multiply the pieces and take 1 off \u2014 a time-weighted return; a window longer than a year is turned into a yearly rate: (1 + the return)^(365 \u00f7 days) \u2212 1',
    inputs: ['MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: [
      'TWO DECIMALS AND ITS SIGN, always (Q49): +6.67%, \u22120.57% \u2014 never +6.7%, never a bare 6.67%.',
      'EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): "All return should be True Weighted Return and not Dietz return."',
      'WHERE IT CANNOT BE MEASURED IT SHOWS NO PERCENT, and never another method in its place.',
      'ONE METHOD WITH THE PORTFOLIO: the same door the Performance tab calls, asked for this one account.',
    ],
    refusal: 'No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or the value that day is less than the money added. It never shows another kind of figure in its place.',
    ruled: '2026-10-04',
    // $30,000 became $32,000 with nothing paid in or out: ($32,000 \u2212 $30,000) \u00f7 $30,000 = +6.67%
    worked: { given: QUIET_GIVEN, answer: '+6.67%', run: () => QUIET_PERF().ret },
  },
  // ISSUED AND DECLARED 2026-10-01 (Performance step 1.c): the Performance tab printed its own Return,
  // its walk and its trade sheet's cash with no identifier — 23 figures. These are EVERY ACCOUNT TOGETHER,
  // which is why they are not the one-account rows above (MK-PF-M-013 to 016).
  'MK-PF-M-017': {
    label: 'Return', unit: 'percent-signed', screens: ['/invest'], grain: 'every account together',
    answers: 'How much all your investments grew over the window you picked, with money you added or took out left out. '
      + 'Per year when the window is longer than a year.',
    formula: 'over every investment account together: split the window at every day money moved in or out; each piece = the value just before the next movement \u00f7 the value just after the last one (the record holds one value a day, taken after that day\u2019s money moved, so just before = that day\u2019s value \u2212 the movement); multiply the pieces and take 1 off \u2014 a time-weighted return; a window longer than a year is turned into a yearly rate: (1 + the return)^(365 \u00f7 days) \u2212 1',
    inputs: ['MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: [
      'TWO DECIMALS AND ITS SIGN, always (Q49).',
      'EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669). Where it cannot be measured it shows no percent, and never another method in its place.',
      'AN ACCOUNT THAT JOINS THE RECORD inside the window counts as money in, at its first recorded value \u2014 nothing it was already worth is earned.',
      'THE SAME DOOR AS ONE ACCOUNT\u2019S RETURN (MK-PF-M-016), asked for every account at once \u2014 one method, never two.',
    ],
    refusal: 'No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or the value that day is less than the money added. It never shows another kind of figure in its place.',
    ruled: '2026-10-04',
    // $30,000 became $32,000 with nothing paid in or out: ($32,000 \u2212 $30,000) \u00f7 $30,000 = +6.67%
    worked: { given: QUIET_GIVEN, answer: '+6.67%', run: () => QUIET_PERF().ret },
  },
  'MK-PF-M-018': {
    label: 'Beginning market value', unit: 'money', screens: ['/invest'], grain: 'every account together',
    answers: 'What all your investments were worth on the day the window opens, READ from the daily record.',
    formula: 'the recorded value of every investment account at the close of the day before the window opens',
    inputs: ['MK-NW-I-003 the recorded history'],
    decisions: ['READ, NEVER BACK-SOLVED: with no recorded value the walk says so instead of inventing a start.'],
    refusal: 'No recorded value that far back \u2014 the walk starts the day the record does, and says so.',
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
    decisions: ['A BUY OR WITHDRAWAL BIGGER THAN THIS IS REFUSED on the sheet, with the words to deposit or transfer cash in first.'],
    refusal: 'No account picked \u2014 the line is not shown.',
    ruled: '2026-10-01',
    worked: { given: 'A savings account holding $5,000 and nothing else.', answer: '$5,000', run: () => availableCash({ asset_id: 'x', label: 'Savings', balance: 5_000 } as any) },
  },
  'MK-PF-M-006': {
    label: 'WHAT EACH CATEGORY EARNED — RETURN', unit: 'percent-signed', screens: ['/invest'],
    answers: 'What each kind of holding returned over the window you picked.',
    formula: "each class's own return, weighted by what each holding in it is worth",
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
      'A record with no ticker is classed by what it IS — a dividend comes from a fund, interest from a bond.',
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
    formula: "each holding's own benchmark return over the same dates, weighted by what that holding is worth",
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-006 the price fetched at'],
    decisions: [
      'The benchmark runs over the SAME DATES as your return — including where your window is cut short at your own purchase date. Comparing your three months against the market\'s twelve is not a comparison.',
      'Weighted by what each holding is worth, so the blend answers "the market, matched to my mix" rather than a plain average of indices.',
    ],
    refusal: 'No benchmark can be priced over this window, so none is shown.',
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
      + 'while the "you" side beside it counts dividends and interest \u2014 so the "ahead by" is not a like-for-like gap.',
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
    label: 'Ending value', unit: 'money', screens: ['/invest'],
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
  'MK-PF-M-002': {
    label: 'Wealth generated', unit: 'money', screens: ['/invest'],
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
    refusal: 'One account only — the whole walk above already says it.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN + ' Each account is asked separately, from the same door as the total.',
      answer: '$46,600',
      run: () => PERF_ONE(['a2']).walk!.ending,
    },
  },
});
