// Performance · How are my investments doing — the change walk, each account's return, the honest
// comparison.
//
// THE DOOR for Q-PF-1, ruled by the founder 2026-09-27: "yes" — the Performance tab and Home answer
// one question, so the return on Home's card and the return on Performance can never disagree.
//
// THIS DOOR CARRIES FOUR RULINGS THAT WERE EACH PAID FOR ONCE:
//   · ONE MEANING OF RETURN (B-97, 2026-09-25). Every return here is wealth generated ÷ the money
//     working in the window — money-weighted, so money added mid-window does not read as a gain. The
//     screen once showed a price-only return beside a "wealth generated" that counted dividends too:
//     two meanings of return on one card.
//   · THE BEGINNING IS READ, NEVER BACK-FILLED (B-98). It comes from the daily record — which reaches
//     back through a linked account's own transactions — and is only derived when the record cannot
//     reach. Today's share count priced at past dates is a line that never happened.
//   · A RATE NEEDS SOMETHING TO STAND ON. With neither a beginning read from the record nor movement
//     to point at, the window shows nothing — never a confident +0.00%.
//   · A WINDOW LONGER THAN A YEAR SHOWS A YEARLY RATE, and says so (founder, 2026-09-25, after the
//     convention was checked: GIPS forbids annualising under a year and annualises above it, and
//     brokerage statements do the same). His ruling: show BOTH, and label them.
import { declareFigures } from '../_figure-spec';
import { portfolioBenchReturn } from '../../../src/domain/performance';
import { formatMoney } from '../../../src/domain/_shared/money';
import { buildChangeWalk, type ChangeWalk } from '../../../src/domain/history';
import { personalFlowTotals } from '../../../Calculation Module code/engines/ledger';
import { windowBounds, modifiedDietzOverWindow } from '../../../Calculation Module code/engines/window-return';
import { valueOn, covers as snapshotCovers } from '../../../Calculation Module code/engines/snapshots';
import { Dec } from '../../../Calculation Module code/engines/decimal';

export interface WindowFigures {
  /** The first day of the window, or null for "since the record began". */
  windowStart: string | null;
  /** The records inside the window. */
  ledger: any[];
  /** How the beginning became the ending, line by line — the rows always sum to the ending. */
  walk: ChangeWalk;
  /** The beginning as READ from the daily record, or null when the record cannot reach back. */
  measured: number | null;
  /** What the window shows: the yearly rate over a year, otherwise the total. Null when it refuses. */
  ret: number | null;
  /** The total over the window, and the yearly rate — both, always, so the screen can label them. */
  cumulative: number | null;
  perYear: number | null;
  years: number;
  /** Why a refusal, in words. Empty when nothing is refused. */
  sentence: string;
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
  d.setUTCMonth(d.getUTCMonth() - (months[period] ?? 12));
  return d.toISOString().slice(0, 10);
}

/** MK-NW-F-091 · What the PRICED holdings gained over the window. It is used ONLY to derive a
 *  beginning the daily record cannot reach — it never becomes the return. A holding bought inside the
 *  window counts its true gain (value − cost); any other counts what the window's price move gave it. */
export function pricedGainOf(
  rows: { cappedSince?: string | null; gain?: number; periodReturn?: number | null; marketValue?: number }[],
): number {
  return (rows ?? []).reduce((t, r) => {
    if (r.cappedSince) return t + (r.gain ?? 0);
    const mv = r.marketValue ?? 0;
    const pr = r.periodReturn;
    return t + (pr != null && mv > 0 ? mv * (1 - 1 / (1 + pr)) : 0);
  }, 0);
}

/** MK-NW-F-092 · Which accounts this door measures: the invested ones. Cash and property are not
 *  investments, and an account left out here is an account whose dividends never reach the return. */
export function investmentAccountIdsOf(
  accounts: { asset_id?: string | number }[],
  classOf: (a: any) => string,
): Set<string> {
  const invested = new Set(['stocks_etf', 'bonds', 'alternatives', 'mixed']);
  return new Set((accounts ?? []).filter((a) => invested.has(classOf(a))).map((a) => String(a.asset_id)));
}

/* ─ MK-NW-O-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * thePerformance
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     flows = personal flow totals(ledger)
 *     contributions = flows.contributions.to number(2)
 *     withdrawals = flows.withdrawals.to number(2)
 *     dividends = flows.dividends.to number(2)
 *     interest = flows.interest.to number(2)
 *     bounds = window bounds(window start, today)   if window start
 *     nothing   otherwise
 *     days = input.snapshot days (or none when missing)
 *     beginning = measured (or ending − input.priced gain − contributions + withdrawals when missing)
 *     years = bounds.days ÷ 365   if bounds
 *     0   otherwise
 *     has basis = measured ≠ nothing (or walk.wealth generated ! = 0 when missing or zero)
 *     refused = verdict ≠ nothing and verdict.rate = nothing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Treats a year as 365 days.
 *     · Shows 2 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-008
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * thePerformance
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     flows = personal flow totals(ledger)
 *     contributions = flows.contributions.to number(2)
 *     withdrawals = flows.withdrawals.to number(2)
 *     dividends = flows.dividends.to number(2)
 *     interest = flows.interest.to number(2)
 *     bounds = window bounds(window start, today)   if window start
 *     nothing   otherwise
 *     days = input.snapshot days (or none when missing)
 *     beginning = measured (or ending − input.priced gain − contributions + withdrawals when missing)
 *     years = bounds.days ÷ 365   if bounds
 *     0   otherwise
 *     has basis = measured ≠ nothing (or walk.wealth generated ! = 0 when missing or zero)
 *     refused = verdict ≠ nothing and verdict.rate = nothing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-083 PERF
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-083 PERF
 *
 * Serves ...... MK-PF-M-002 · MK-PF-M-003 · MK-PF-M-005
 * Reads ....... MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Treats a year as 365 days.
 *     · Shows 2 decimal places.
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
  /** What the investments are worth now. */
  ending: number;
  /** Every record, unfiltered — the door takes the window's own. */
  transactions: any[];
  /** The daily record, and which accounts count as investments. */
  snapshotDays: any[];
  investmentAccountIds: Set<string>;
  /** What the priced holdings gained over the window — used ONLY to derive a beginning the record
   *  cannot reach. It never becomes the return. */
  pricedGain: number;
}): WindowFigures {
  const { windowStart, today, ending } = input;
  const ledger = (input.transactions ?? []).filter(
    (t) => !windowStart || String(t.date ?? '').slice(0, 10) >= windowStart);
  const flows = personalFlowTotals(ledger);
  const contributions = flows.contributions.toNumber(2);
  const withdrawals = flows.withdrawals.toNumber(2);
  const dividends = flows.dividends.toNumber(2);
  const interest = flows.interest.toNumber(2);

  const bounds = windowStart ? windowBounds(windowStart, today) : null;
  const days = input.snapshotDays ?? [];
  // READ, never back-filled (B-98)
  const measured = bounds && snapshotCovers(days, bounds.beginningAsOf)
    ? valueOn(days, input.investmentAccountIds, bounds.beginningAsOf) : null;
  const beginning = measured ?? (ending - input.pricedGain - contributions + withdrawals);

  const walk = buildChangeWalk({
    beginning, ending, fromLabel: input.windowLabel, toLabel: 'today',
    contributions, withdrawals, dividends, interest,
  });

  const verdict = bounds ? modifiedDietzOverWindow({
    // money enters the decimal arithmetic at cents — a derived beginning is a float with a long tail
    beginning: Dec.of(beginning.toFixed(2)), ending: Dec.of(ending.toFixed(2)),
    flows: ledger.filter((t: any) => t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL')
      .map((t: any) => ({ date: String(t.date ?? '').slice(0, 10) || null,
        amount: (Dec.parse(t.amount) ?? Dec.ZERO).mul(t.type === 'WITHDRAWAL' ? Dec.of('-1') : Dec.of('1')) })),
    start: windowStart!, end: today,
  }) : null;

  const years = bounds ? bounds.days / 365 : 0;
  // a rate needs something to stand on: a beginning read from the record, or movement to point at
  const hasBasis = measured != null || walk.wealthGenerated !== 0;
  const refused = verdict != null && verdict.rate == null;
  const cumulative = hasBasis ? verdict?.rate ?? null : null;
  const perYear = cumulative != null && years > 1 ? Math.pow(1 + cumulative, 1 / years) - 1 : null;

  return {
    windowStart, ledger, walk, measured,
    ret: perYear ?? cumulative,
    cumulative, perYear, years,
    sentence: refused ? verdict!.sentence : '',
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
  /** That class’s return over the window, value-weighted — null where it cannot be calculated. */
  ret: number | null;
}

export function categoryEarnings(input: {
  /** every record, unfiltered — this takes the window’s own */
  transactions: any[];
  /** the window’s first day, or null for "since the record began" */
  windowStart: string | null;
  /** each holding with its class and its own return, as buildPerformance produces them */
  rows: { position?: { ticker?: string; kind?: string; asset_class?: string }; periodReturn?: number | null; marketValue?: number }[];
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
  const classOfTicker = (tk: string, type: string): string => {
    const r = rows.find((x) => String(x.position?.ticker ?? '').toUpperCase() === String(tk ?? '').toUpperCase());
    if (r) return String(r.position?.kind ?? r.position?.asset_class ?? 'stocks_etf');
    return type === 'DIVIDEND' ? 'stocks_etf' : 'bonds';
  };
  // the value-weighted return of the holdings in one class — the same rule the whole portfolio uses
  const retOf = (cls: string): number | null => {
    const inClass = rows.filter((x) => String(x.position?.asset_class ?? 'stocks_etf') === cls);
    const usable = inClass.filter((r) => r.periodReturn != null && (r.marketValue ?? 0) > 0);
    const total = usable.reduce((t, r) => t + (r.marketValue ?? 0), 0);
    if (total <= 0) return null;
    return usable.reduce((t, r) => t + (r.periodReturn as number) * (r.marketValue ?? 0), 0) / total;
  };

  const buckets: CategoryEarned[] = [
    // "Cash in this account" is his wording of 2026-08-11; the shorter wording was declined by name
    { key: 'stocks_etf', label: 'Stocks / Funds', earned: 0, ret: retOf('stocks_etf') },
    { key: 'bonds', label: 'Bonds & CDs', earned: 0, ret: retOf('bonds') },
    { key: 'cash', label: 'Cash in this account', earned: 0, ret: retOf('cash') },
  ];
  for (const t of led) {
    if (t?.type !== 'DIVIDEND' && t?.type !== 'INTEREST') continue;
    const amt = Math.abs(Number(t.amount) || 0);
    // an untickered row is classed by WHAT IT IS: a dividend comes from a fund, interest from a bond
    const cls = t.ticker ? classOfTicker(t.ticker, t.type) : (t.type === 'DIVIDEND' ? 'stocks_etf' : 'bonds');
    const b = buckets.find((x) => x.key === cls)
           ?? buckets.find((x) => x.key === (t.type === 'DIVIDEND' ? 'stocks_etf' : 'bonds'))!;
    b.earned += amt;
  }
  // a category that received nothing is not shown at all — never a $0 row
  return buckets.filter((b) => b.earned > 0);
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  An investment account worth $30,000 on the last recorded day of 2025 — 100 VTI at $260 plus $4,000
 *  of cash — worth $46,600 on 28 September 2026, with $6,000 paid in on 1 April and $825 of dividends
 *  along the way. Every figure runs `thePerformance`, the real door.
 *
 *  IT IS THE CASE WHERE THE PERCENTAGE IS REFUSED, deliberately. The $6,000 is a fifth of what was
 *  there at the start, so WHEN it arrived would drive any rate more than the investing did, and the
 *  door says so in words instead of printing one (his ruling: one meaning of return, or none).
 *  The dollar walk still answers: $30,000 + $6,000 paid in + $10,600 generated = $46,600.
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
  ] as any[],
  investmentAccountIds: new Set(['a2']),
  pricedGain: 0,
};
const GIVEN =
  'An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash) and $46,600 on 28 Sep 2026, '
  + 'with $6,000 paid in on 1 Apr and $825 of dividends received.';

/** THE SAME ACCOUNT WITH NOTHING PAID IN (Performance pass 2, 2026-09-30). The canonical example
 *  above REFUSES to show a percentage — $6,000 into a $30,000 account is a fifth of it, so when the
 *  money arrived would drive the figure more than the investing did, and the door says so rather
 *  than print a number. That refusal is the ruling working, which is why it is kept. But it leaves
 *  the screen's headline figure — Return — with no example that produces one, so here is the same
 *  account with no money paid in: $30,000 became $32,000, of which $825 arrived as dividends. */
const QUIET = {
  ...EXAMPLE,
  ending: 32000,
  transactions: [
    { txn_id: 'd1', account_id: 'a2', ticker: 'VTI', type: 'DIVIDEND', amount: 825, date: '2026-06-20' },
  ] as any[],
};
const QUIET_GIVEN =
  'An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash) and $32,000 on 28 Sep 2026, '
  + 'with nothing paid in or taken out and $825 of it arriving as dividends.';
const QUIET_PERF = () => thePerformance(QUIET);
/* ─ MK-NW-F-083 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * PERF
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the performance(EXAMPLE)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-083
 * Changed ..... not in git yet (—)
 */
const PERF = () => thePerformance(EXAMPLE);

/** PER ACCOUNT (Performance pass 1, 2026-09-30). The same window, asked of ONE account rather than
 *  all of them. The door is the same one — that is the point: an account's ending value and the
 *  all-accounts total come from ONE calculation, so a per-account walk and the total beneath it
 *  cannot tell different stories. Asking it of a second account with no records gives $0 without
 *  invention. */
const PERF_ONE = (ids: string[]) => thePerformance({ ...EXAMPLE, investmentAccountIds: new Set(ids) });


/** THE WORKED EXAMPLE FOR THE CATEGORY TABLE (Performance pass 1, 2026-09-30).
 *
 *  One window, one ledger: $825 of dividends on a fund and $505 of interest on a CD, plus one
 *  untickered dividend of $40 — which is classed by WHAT IT IS, a dividend, so it joins the funds.
 *  The holdings give each class its own return, value-weighted.
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
const CATS = () => categoryEarnings(CAT_EXAMPLE);
const CAT = (key: string) => CATS().find((c) => c.key === key);

/** THE HONEST COMPARISON, worked. $40,000 of shares whose benchmark rose 10% and $10,000 of bonds
 *  whose benchmark rose 4%: the market MATCHED TO THIS MIX did 8.8%, not the 7% a plain average of
 *  the two indices would give. Weighting by what is held is the whole point of the figure. */
const BENCH_GIVEN =
  '$40,000 of shares against a benchmark up 10% over the window, and $10,000 of bonds against one up '
  + '4% over the same days.';
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
 *  ONE WORD, TWO FUNCTIONS (finding A13), worth saying plainly: the Return the screen DOES show
 *  calls itself money-weighted too, and is a different calculation \u2014 Modified Dietz. FOR HIM:
 *  delete the XIRR, or give it a screen.
 */

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const PERFORMANCE_FIGURES = declareFigures({
  'MK-PF-M-006': {
    label: 'WHAT EACH CATEGORY EARNED — RETURN', unit: 'percent-2dp', screens: ['/invest'],
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
      answer: '12.00%',
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
      'wealth generated \u00f7 the money that was working in the window, counting each contribution for the part '
      + 'of the window it was there; over a window longer than a year it is shown as a yearly rate',
    inputs: ['MK-XS-I-020 the records of money movements', 'MK-NW-I-001 your accounts', 'MK-XS-I-006 the price fetched at'],
    decisions: [
      'ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are in it, because "Wealth generated" beside it counts them.',
      'A RATE NEEDS SOMETHING TO STAND ON: with no beginning read from the record and no movement to point at, it shows nothing rather than a confident +0.00%.',
      'IT REFUSES WHEN TIMING WOULD DRIVE IT: where money moved in or out in amounts large enough that WHEN it moved decides the percentage, the screen shows the dollar walk instead.',
      'OVER A YEAR IT IS A YEARLY RATE and the screen says so (his ruling, 2026-08-18, restated 2026-09-25).',
    ],
    refusal: 'Nothing is shown, and the walk beneath says in words why \u2014 either the record cannot reach the beginning, or money moved in amounts that would decide the percentage.',
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
      run: () => PERF().walk.ending,
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
      run: () => PERF().walk.wealthGenerated,
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
      run: () => `HOW ${formatMoney(PERF().walk.beginning)} BECAME ${formatMoney(PERF().walk.ending)} · ALL ACCOUNTS`,
    },
  },
  'MK-PF-M-004': {
    label: 'Ending market value (per account)', unit: 'money', screens: ['/invest'], grain: 'one account',
    answers: 'What one account is worth at the end of the window.',
    formula: 'the sum of that account’s holdings, at today’s prices, plus its cash',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    refusal: 'Nothing in it.',
    worked: {
      given: GIVEN + ' Asked of that one account.',
      answer: '$46,600',
      run: () => PERF_ONE(['a2']).walk.ending,
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
      run: () => PERF_ONE(['a2']).walk.ending,
    },
  },
});
