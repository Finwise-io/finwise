/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "performance 04", written by the Claude formula auditor from the
 * cards alone (MK-NW-O-007, MK-PF-F-008..011, F-022, F-023, F-029, F-034), brief
 * to-send/moneykeel_brief_performance_04_claude-code_v02.md.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/performance_04.claude.json (45 cases).
 * Every expected answer below is the auditor's, copied as written; only its plain input names are mapped onto the
 * app's fields. A case the app fails is marked, never fixed by changing the answer here. Results, case by case:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_claude_04_results.json
 *
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing) · `// BRIEF WRONG:` the auditor's own
 * expectation is wrong (test.failing, their number kept) — none in this batch, every working line was re-done by
 * hand · `// UNCLEAR:` no decision settles the auditor's expectation; their answer is kept and marked test.failing,
 * the open question named · `// BLOCKED:` the case cannot be handed to the function (test.skip) — none.
 * Decisions cited: DEC-3768b (a whole-month window stops at the month's last day), DEC-0315 (Q3: both boundary days
 * inside; beginning = close of the day before the start), DEC-0230 (never back-fill what was not recorded).
 *
 * INPUT NAMES MAPPED (the app's fields, not the answers):
 *   today → the function's `now`, a LOCAL Date at noon of that day (noon keeps the calendar day in any zone; every
 *   function here that reads a clock takes `now`, so no fake timers are needed). months → months; amount → amount;
 *   from_closes / to_closes / closes [[date, close]…] → a PriceSeries { ticker, points: [{date, close}…] } in the order
 *   given (oldest first, except where the case says a feed sends newest first); null → null. period → Period
 *   ('YTD' for "This year"). since → sinceISO; target → closeAsOf's Date (local noon of that day); day / days → isoDate.
 *   LookBackResult: stayed_end stayed.endValue, stayed_change stayed.delta, stayed_percent stayed.pct (a PERCENT,
 *   as the card and the batch note say), moved_* likewise, difference difference. "rows" (Amount + Stayed: change)
 *   is checked to add up to stayed_end.
 *   to_distributions_per_share (MK-PF-F-023 complex, the bond fund): the app's one price feed hands DIVIDEND-ADJUSTED
 *   closes (src/services/marketData.ts:59-64, Yahoo adjclose), so a distribution reaches lookBack inside the series:
 *   the earlier close is scaled down by the distribution, 72.00 × 72.50 ÷ (72.50 + 3.10), the latest stays 72.50.
 *   closeAsOf (MK-PF-F-029) is not exported: it is read out of src/domain/performance/index.ts and compiled as written.
 *   "REFUSES" = null. "shown" strings are screen formatting and are not asserted.
 * TOLERANCES: the auditor wrote figures to 4–6 decimals; each is matched to half a unit in its last written decimal
 * (1.112525 → ±0.0000005; 20063.9369 → ±0.00005); round figures to 1e-9.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { startDateFor, latestClose, periodReturn, periodReturnSince, closeOnOrBefore, priceHistoryShortSentence, type PriceSeries } from '../../../src/domain/performance';
import { factorOverMonths, lookBack } from '../../../src/domain/performance/lookBack';
import { theLookBack } from './look-back';

// ── the one function the app does not export, compiled from its own source text ─────────────────────
const fromSource = (file: string, start: RegExp, end: string, name: string) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = text.search(start);
  if (at < 0) throw new Error(`${name} not found in ${file}`);
  const code = text.slice(at, text.indexOf(end, at) + end.length);
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(`${js}\nreturn ${name};`)();
};
const closeAsOf: (series: PriceSeries | null | undefined, target: Date) => number | null =
  fromSource('../../../src/domain/performance/index.ts', /function closeAsOf\(/, '\n}\n', 'closeAsOf');

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const D = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const TODAY = D('2026-10-10');
const iso = (d: Date | null) => d == null ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const refuses = (v: unknown) => expect(v == null).toBe(true);
const near = (a: number | null | undefined, e: number, dp = 6) => {
  expect(a).not.toBeNull(); expect(a).not.toBeUndefined();
  expect(Math.abs((a as number) - e)).toBeLessThanOrEqual(0.5 * 10 ** -dp + 1e-9);
};
const S = (closes: [string, number][] | null, ticker = 'X'): PriceSeries | null =>
  closes ? { ticker, points: closes.map(([date, close]) => ({ date, close })) } : null;
type LB = { stayed_end?: number; stayed_change?: number; stayed_percent?: number; moved_end?: number; moved_change?: number; moved_percent?: number; difference?: number };
const checkLB = (r: ReturnType<typeof lookBack>, e: LB, dp = 4) => {
  expect(r).not.toBeNull();
  if (e.stayed_end != null) near(r!.stayed.endValue, e.stayed_end, dp);
  if (e.stayed_change != null) near(r!.stayed.delta, e.stayed_change, dp);
  if (e.stayed_percent != null) near(r!.stayed.pct, e.stayed_percent, dp);
  if (e.moved_end != null) near(r!.moved.endValue, e.moved_end, dp);
  if (e.moved_change != null) near(r!.moved.delta, e.moved_change, dp);
  if (e.moved_percent != null) near(r!.moved.pct, e.moved_percent, dp);
  if (e.difference != null) near(r!.difference, e.difference, dp);
};

describe('MK-NW-O-007 theLookBack — five cases', () => {
  test('easy · Stayed up, moved would have been down', () => {
    checkLB(theLookBack({ amount: 5000, fromSeries: S([['2026-07-10', 40], ['2026-10-09', 44]]), toSeries: S([['2026-07-10', 40], ['2026-10-09', 38]]), months: 3, now: TODAY }),
      { stayed_end: 5500, stayed_change: 500, stayed_percent: 10, moved_end: 4750, moved_change: -250, moved_percent: -5, difference: -750 }, 9);
  });
  test('easy · No history for the fund it is in', () => {
    refuses(theLookBack({ amount: 5000, fromSeries: null, toSeries: S([['2025-10-10', 50], ['2026-10-09', 55]]), months: 12, now: TODAY }));
  });
  test('complex · Twelve months, the parts and the difference agree', () => {
    const r = theLookBack({ amount: 18250, fromSeries: S([['2025-10-10', 87.43], ['2026-04-01', 91.07], ['2026-10-09', 96.12]]),
      toSeries: S([['2025-10-10', 154.2], ['2026-04-01', 160.33], ['2026-10-09', 171.88]]), months: 12, now: TODAY });
    checkLB(r, { stayed_end: 20063.9369, moved_end: 20342.4773, difference: 278.5404 });
    near(r!.stayed.delta, 1813.9369, 4);                                       // rows: Stayed: change
    near(18250 + r!.stayed.delta, 20063.9369, 4);                              // Amount + change = stayed end
    expect(r!.difference).toBe(r!.moved.endValue - r!.stayed.endValue);         // the difference line IS moved − stayed
  });
  // FINDING: app gives stayed_end 7,118.34 and moved_end 8,050.00 (difference 931.66), expected 7,199.7549 / 8,025.6798 /
  // 825.9249 — factorOverMonths moves the cut-off back with `new Date(y, m − 6, 31)` (lookBack.ts:56), which rolls
  // 31 February to 3 March, so the start closes are 2 March's (61.90, 33.00), not 27 February's. DEC-3768b: a window that
  // reaches back whole months stops at the month's last day — 31 Aug less six months is 28 Feb.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3768b): the cut-off is monthsBefore, the one rule.
  test('complex · Six months back from 31 August lands on a short February', () => {
    checkLB(theLookBack({ amount: 7500, fromSeries: S([['2026-02-27', 61.2], ['2026-03-02', 61.9], ['2026-08-31', 58.75]]),
      toSeries: S([['2026-02-27', 33.1], ['2026-03-02', 33.0], ['2026-08-31', 35.42]]), months: 6, now: D('2026-08-31') }),
    { stayed_end: 7199.7549, stayed_change: -300.2451, moved_end: 8025.6798, moved_change: 525.6798, difference: 825.9249 });
  });
  test('edge · A negative amount', () => { refuses(theLookBack({ amount: -500, fromSeries: null, toSeries: null, months: 12, now: TODAY })); });
});

describe('MK-PF-F-023 lookBack — five cases', () => {
  test('easy · Stayed up ten percent, moved would have been up twenty', () => {
    checkLB(lookBack(10000, S([['2025-10-10', 100], ['2026-10-09', 110]]), S([['2025-10-10', 50], ['2026-10-09', 60]]), 12, TODAY),
      { stayed_end: 11000, stayed_change: 1000, stayed_percent: 10, moved_end: 12000, moved_change: 2000, moved_percent: 20, difference: 1000 }, 9);
  });
  test('easy · Nothing to move', () => {
    refuses(lookBack(0, S([['2025-10-10', 100], ['2026-10-09', 110]]), S([['2025-10-10', 50], ['2026-10-09', 60]]), 12, TODAY));
  });
  test('complex · Six months, stock index fund against a bond fund', () => {
    checkLB(lookBack(23417.88, S([['2026-04-10', 281.36], ['2026-10-09', 313.02]]), S([['2026-04-10', 72.14], ['2026-10-09', 73.05]]), 6, TODAY),
      { stayed_end: 26052.9741, stayed_change: 2635.0941, moved_end: 23713.2816, moved_change: 295.4016, difference: -2339.6925 });
    const r = lookBack(23417.88, S([['2026-04-10', 281.36], ['2026-10-09', 313.02]]), S([['2026-04-10', 72.14], ['2026-10-09', 73.05]]), 6, TODAY)!;
    near(r.stayed.pct, 11.252488); near(r.moved.pct, 1.261436);
  });
  // The auditor's formula_gives (10,069.44, price only) assumes raw closes; the app's feed is dividend-adjusted
  // (marketData.ts:59-64), so the $3.10 distribution is already inside the bond fund's series — see the header.
  test('complex · A bond fund whose return came as distributions', () => {
    checkLB(lookBack(10000, S([['2025-10-10', 100], ['2026-10-09', 108]]), S([['2025-10-10', 72 * 72.5 / (72.5 + 3.1)], ['2026-10-09', 72.5]]), 12, TODAY),
      { stayed_end: 10800, moved_end: 10500, difference: -300 });
  });
  test('edge · The other fund\'s history starts after the cut-off', () => {
    refuses(lookBack(5000, S([['2025-10-10', 100], ['2026-10-09', 106]]), S([['2026-02-02', 20], ['2026-10-09', 23]]), 12, TODAY));
  });
});

describe('MK-PF-F-022 factorOverMonths — five cases', () => {
  test('easy · Twelve months, a close on the cut-off', () => { near(factorOverMonths(S([['2025-10-10', 100], ['2026-10-09', 125]]), 12, TODAY), 1.25, 9); });
  test('easy · Only one price', () => { refuses(factorOverMonths(S([['2026-10-09', 50]]), 3, TODAY)); });
  test('complex · Six months with a close on both sides of the cut-off', () => {
    near(factorOverMonths(S([['2026-04-09', 281.02], ['2026-04-10', 281.36], ['2026-07-01', 296.55], ['2026-10-09', 313.02]]), 6, TODAY), 1.112525);
  });
  test('complex · Two years asked, record of 21 months', () => { refuses(factorOverMonths(S([['2025-01-15', 88.2], ['2026-10-09', 104.66]]), 24, TODAY)); });
  // FINDING: app gives 1.037736 (55 ÷ 53), expected 1.10 — the cut-off is `new Date(2026, 2 − 1, 31)` = 3 March
  // (lookBack.ts:56), not 28 February. DEC-3768b: one month before 31 March is 28 February (startDateFor already does this).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3768b): the cut-off is monthsBefore, the one rule.
  test('edge · One month before 31 March', () => {
    near(factorOverMonths(S([['2026-02-27', 50.0], ['2026-03-02', 52.0], ['2026-03-03', 53.0], ['2026-03-31', 55.0]]), 1, D('2026-03-31')), 1.1, 9);
  });
});

describe('MK-PF-F-008 startDateFor — five cases', () => {
  test('easy · One month back, an ordinary day', () => { expect(iso(startDateFor('1M', TODAY))).toBe('2026-09-10'); });
  test('easy · This year', () => { expect(iso(startDateFor('YTD', TODAY))).toBe('2026-01-01'); });
  test('complex · Three and six months back into a short February', () => {
    expect([iso(startDateFor('3M', D('2026-05-31'))), iso(startDateFor('6M', D('2026-08-31')))]).toEqual(['2026-02-28', '2026-02-28']);
  });
  test('complex · One and two years back from a leap day, and an exact year', () => {
    expect([iso(startDateFor('1Y', D('2028-02-29'))), iso(startDateFor('2Y', D('2028-02-29'))), iso(startDateFor('1Y', D('2026-10-10')))])
      .toEqual(['2027-02-28', '2026-02-28', '2025-10-10']);
  });
  test('edge · One month before 31 March', () => { expect(iso(startDateFor('1M', D('2026-03-31')))).toBe('2026-02-28'); });
});

describe('MK-PF-F-009 latestClose — five cases', () => {
  test('easy · Three closes in order', () => { expect(latestClose(S([['2026-10-07', 100], ['2026-10-08', 101], ['2026-10-09', 102]]))).toBe(102); });
  test('easy · One price only', () => { expect(latestClose(S([['2026-10-09', 48.25]]))).toBe(48.25); });
  test('complex · Today is a Saturday; the last close is Friday\'s', () => {
    expect(latestClose(S([['2026-10-06', 211.08], ['2026-10-07', 212.66], ['2026-10-08', 210.93], ['2026-10-09', 213.47]]))).toBe(213.47);
  });
  // UNCLEAR: app gives 212.66 (the last item of the list, index.ts:584), expected 213.47 (the latest date). The app's one
  // price feed builds its list oldest first (marketData.ts:66-71, Yahoo's timestamps in order), so this input cannot arrive
  // today. Open question: is "oldest first" a stated contract of every price series, or must each price function sort?
  test.failing('complex · A feed that sends newest first', () => {
    expect(latestClose(S([['2026-10-09', 213.47], ['2026-10-08', 210.93], ['2026-10-07', 212.66]]))).toBe(213.47);
  });
  test('edge · No prices', () => { refuses(latestClose(S([]))); });
});

describe('MK-PF-F-010 periodReturn — five cases', () => {
  // FINDING: app gives 0.078431 (110 ÷ 102), expected 0.10 (110 ÷ 100) — the start is the close ON the period's first day
  // (index.ts:626, closeAsOf at startDateFor), so 10 September's own move is left out. DEC-0315 (Q3): both boundary days are
  // inside and the beginning value is the close of the day BEFORE the start — what MK-NW-O-008 already reads.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0315): the beginning is the close of the day BEFORE the period's first day.
  test('easy · One month, first day\'s move included', () => {
    near(periodReturn(S([['2026-09-09', 100], ['2026-09-10', 102], ['2026-10-09', 110]]), '1M', TODAY), 0.1);
  });
  test('easy · No prices', () => { refuses(periodReturn(S([]), '3M', TODAY)); });
  test('complex · Exactly two years, given as a yearly rate', () => {
    near(periodReturn(S([['2024-10-09', 480.0], ['2024-10-10', 480.0], ['2025-10-09', 571.2], ['2026-10-09', 662.39]]), '2Y', TODAY), 0.174725);
  });
  // UNCLEAR: app gives 0.034 (from the first close on record, 4 May 2026, index.ts:506 via :626), expected REFUSES. The
  // fallback is deliberate (closeAsOf "target predates the series → first available"; the 2Y branch says the figure "covers
  // only that span"). DEC-0230 ("we never back-fill a year we didn't record") speaks of the daily record, not prices.
  // Open question: may a 1Y figure be measured from a later first price, or must it refuse when prices do not reach back?
  // SETTLED 2026-10-12 by DEC-4641 ("1, 2 - approved"): the figure is measured from the holding's first price, and
  // wherever it is shown the screen says so — "Prices for this holding go back 5 months, so the 1-year figure covers
  // 5 months — not a year." (MK-PF-F-045 priceHistoryShortSentence). The auditor's REFUSES is not the rule; the app's
  // 25.85 ÷ 25.00 − 1 = 3.40% is asserted, with the sentence beside it.
  test('complex · A one-year period for a fund launched five months ago', () => {
    const s = S([['2026-05-04', 25.0], ['2026-07-15', 25.4], ['2026-10-09', 25.85]]);
    near(periodReturn(s, '1Y', TODAY), 25.85 / 25 - 1);
    expect(priceHistoryShortSentence(s!.points, '2025-10-10', '1Y', '2026-10-10'))
      .toBe('Prices for this holding go back 5 months, so the 1-year figure covers 5 months — not a year.');
  });
  test('edge · Exactly one year: a total, not a yearly rate', () => {
    near(periodReturn(S([['2025-10-09', 500.0], ['2025-10-10', 500.0], ['2026-10-09', 550.0]]), '1Y', TODAY), 0.1);
  });
});

describe('MK-PF-F-011 periodReturnSince — five cases', () => {
  test('easy · Since a purchase day with a close', () => { near(periodReturnSince(S([['2026-06-15', 100], ['2026-10-09', 120]]), '2026-06-15', TODAY), 0.2); });
  test('easy · Since a Sunday takes Friday\'s close', () => {
    near(periodReturnSince(S([['2026-06-12', 98], ['2026-06-15', 100], ['2026-10-09', 120]]), '2026-06-14', TODAY), 0.22449, 5);
  });
  test('complex · Bought nineteen months ago: a total, not a yearly rate', () => {
    near(periodReturnSince(S([['2025-02-28', 410.12], ['2025-03-03', 405.66], ['2026-01-02', 468.2], ['2026-10-09', 512.48]]), '2025-03-03', TODAY), 0.263324);
  });
  test('complex · Broker history with a gap over the purchase day', () => {
    near(periodReturnSince(S([['2025-12-30', 171.93], ['2026-01-05', 173.4], ['2026-10-09', 187.04]]), '2026-01-02', TODAY), 0.087885);
  });
  // UNCLEAR: app gives 0.034 (from the first close on record, 2 March, index.ts:680 → :506), expected REFUSES — the same
  // deliberate fallback as MK-PF-F-010 / MK-PF-F-029. Open question: may "since you bought it" start at a later first price?
  // SETTLED 2026-10-12 by DEC-4641: measured from the first price on record (2 March), 25.85 ÷ 25.00 − 1 = 3.40% —
  // the same rule as MK-PF-F-010 above; the auditor's REFUSES is not the rule.
  test('edge · Purchase before the price record begins', () => {
    near(periodReturnSince(S([['2026-03-02', 25.0], ['2026-10-09', 25.85]]), '2026-01-05', TODAY), 25.85 / 25 - 1);
  });
});

describe('MK-PF-F-029 closeAsOf — five cases', () => {
  test('easy · A close on the target day', () => { expect(closeAsOf(S([['2026-09-09', 100], ['2026-09-10', 102]]), D('2026-09-10'))).toBe(102); });
  test('easy · No prices', () => { refuses(closeAsOf(S([]), D('2026-09-10'))); });
  test('complex · Labor Day weekend', () => {
    expect(closeAsOf(S([['2026-09-03', 412.18], ['2026-09-04', 415.02], ['2026-09-08', 409.77]]), D('2026-09-07'))).toBe(415.02);
  });
  test('complex · Target between two sparse marks of a hand-priced fund', () => {
    expect(closeAsOf(S([['2026-04-30', 10.412], ['2026-05-29', 10.538], ['2026-07-31', 10.701]]), D('2026-06-30'))).toBe(10.538);
  });
  // UNCLEAR: app gives 25.00 (the first close, dated five months after the target, index.ts:506), expected REFUSES — the
  // fallback is written in on purpose; closeOnOrBefore (MK-PF-F-034) is the no-fallback twin. Open question as MK-PF-F-010.
  // SETTLED 2026-10-12 by DEC-4641: the first close stands in for a target before it — that is how a window figure
  // is measured from the holding's first price, and the screen names the shorter span. closeOnOrBefore (MK-PF-F-034)
  // stays the no-stand-in twin. The auditor's REFUSES is not the rule; the app's $25.00 is asserted.
  test('edge · Target before the first price on record', () => {
    expect(closeAsOf(S([['2026-03-02', 25.0], ['2026-10-09', 25.85]]), D('2025-10-10'))).toBe(25);
  });
});

describe('MK-PF-F-034 closeOnOrBefore — five cases', () => {
  const C: [string, number][] = [['2026-02-26', 49.1], ['2026-02-27', 50.0], ['2026-03-02', 52.0], ['2026-03-03', 53.0]];
  test('easy · A close on the very day', () => { expect(closeOnOrBefore(S([['2026-02-27', 50.0], ['2026-03-02', 52.0]]), '2026-03-02')).toBe(52); });
  test('easy · A weekend day takes Friday\'s close', () => { expect(closeOnOrBefore(S([['2026-02-27', 50.0], ['2026-03-02', 52.0]]), '2026-02-28')).toBe(50); });
  test('complex · A long weekend and a later close that must not be used', () => { expect(closeOnOrBefore(S(C), '2026-03-01')).toBe(50); });
  test('complex · Days not written as year-month-day', () => {
    ['2026/03/02', '2026-03-02T00:00:00Z', '03-02-2026'].forEach((d) => refuses(closeOnOrBefore(S(C), d)));
  });
  test('edge · A day before the first price', () => { refuses(closeOnOrBefore(S(C), '2026-02-20')); });
});
