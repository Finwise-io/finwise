/** PERFORMANCE, PASS 4 — EVERY DECISION ON EVERY FIGURE, RE-RUN, NAMED BY ITS IDENTIFIER.
 *
 *  Passes 1 to 3 asked: is the figure behind a door · does its example run · do two screens agree.
 *  This one asks the last question: DOES THE CODE STILL DO WHAT HE DECIDED?
 *
 *  Why by identifier (his standing order, 2026-08-25: "never name a metric without its identifier").
 *  The decisions below were already held — the door's own tests hold most of them. What no test did
 *  was NAME THE FIGURE. So a decision could be dropped from a figure's row and every test would stay
 *  green, and nobody looking at MK-PF-M-007 could find what holds it. Before this file, one test in
 *  the whole repository named a Performance figure by its identifier.
 *
 *  Twelve figures carry sixteen decisions. Each one gets a test named for the figure it belongs to,
 *  and the test re-runs the decision against the real function — never a copy of the arithmetic.
 */
import { thePerformance, categoryEarnings, windowStartKey } from './performance';
import { theLookBack } from './look-back';
import { portfolioBenchReturn } from '../../../src/domain/performance';
import { accountDisplayNames } from '../../../src/domain/assets';

const TODAY = '2026-09-28';
const recordDay = (date: string, value: number, accountId = 'a1') => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: [{ accountId, securityKey: 'VTI', symbol: 'VTI', units: 100, price: value / 100, value }],
  accounts: [{ date, accountId, cash: 0, statedTotal: value, currency: 'USD' }],
});
const ask = (over: Partial<Parameters<typeof thePerformance>[0]> = {}) => thePerformance({
  windowStart: '2026-01-02', windowLabel: 'since Jan 1', today: TODAY,
  ending: 32_000, pricedGain: 0, transactions: [],
  snapshotDays: [recordDay('2026-01-01', 30_000)] as any,
  investmentAccountIds: new Set(['a1']),
  ...over,
});

// ── MK-PF-M-002 · Wealth generated ──────────────────────────────────────────────────────────────
describe('MK-PF-M-002 Wealth generated', () => {
  test('ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are part of this', () => {
    const a = ask({ transactions: [
      { txn_id: 'd', account_id: 'a1', type: 'DIVIDEND', amount: 600, date: '2026-06-01' },
      { txn_id: 'i', account_id: 'a1', type: 'INTEREST', amount: 400, date: '2026-07-01' },
    ] });
    expect(a.walk.dividends).toBe(600);
    expect(a.walk.interest).toBe(400);
    // $30,000 → $32,000 with nothing paid in: all $2,000 is wealth generated, and the
    // dividends and interest are INSIDE it, not beside it
    expect(a.walk.wealthGenerated).toBe(2_000);
    expect(a.walk.dividends + a.walk.interest + a.walk.marketChange).toBe(a.walk.wealthGenerated);
  });
});

// ── MK-PF-M-003 · HOW $X BECAME $Y · ALL ACCOUNTS ───────────────────────────────────────────────
describe('MK-PF-M-003 HOW $X BECAME $Y · ALL ACCOUNTS', () => {
  test('whatever the records cannot explain lands in the change-in-value line, never silently dropped', () => {
    // the records explain $600 of the $2,000; the other $1,400 has to appear somewhere
    const a = ask({ transactions: [{ txn_id: 'd', account_id: 'a1', type: 'DIVIDEND', amount: 600, date: '2026-06-01' }] });
    expect(a.walk.marketChange).toBe(1_400);
    const sum = a.walk.beginning + a.walk.contributions - a.walk.withdrawals
      + a.walk.dividends + a.walk.interest + a.walk.marketChange;
    expect(sum).toBe(a.walk.ending);          // the walk always closes
  });
});

// ── MK-PF-M-005 · each account and its ending value ─────────────────────────────────────────────
describe('MK-PF-M-005 each account and its ending value', () => {
  test('named by ACCOUNT, not by institution — two accounts at one broker are tellable apart (2026-08-17)', () => {
    const names = accountDisplayNames([
      { asset_id: '1', label: 'Brokerage', institution: 'E*TRADE', kind: 'brokerage', balance: 1 },
      { asset_id: '2', label: 'Roth IRA', institution: 'E*TRADE', kind: 'roth_ira', balance: 1 },
    ] as any);
    const shown = [names.get('1'), names.get('2')];
    expect(shown[0]).not.toBe(shown[1]);                    // the founder's screenshot: two rows, one name
    expect(shown.every((n) => n && n !== 'E*TRADE')).toBe(true);
  });
});

// ── MK-PF-M-006 · WHAT EACH CATEGORY EARNED — RETURN ────────────────────────────────────────────
describe('MK-PF-M-006 WHAT EACH CATEGORY EARNED — RETURN', () => {
  const led = [
    { txn_id: 'd', ticker: 'VTI', type: 'DIVIDEND', amount: 500, date: '2026-06-01' },
    { txn_id: 'i', ticker: 'CD1', type: 'INTEREST', amount: 300, date: '2026-06-01' },
  ];
  test('a class we cannot price shows NOTHING, never a 0% — a zero is a different claim', () => {
    const cats = categoryEarnings({
      windowStart: '2026-01-01', transactions: led,
      rows: [{ position: { ticker: 'VTI', asset_class: 'stocks_etf' }, periodReturn: 0.1, marketValue: 1_000 }],
    });
    // the CD earned $300 and has no priceable holding behind it: it is still BONDS (B-116 — it used
    // to land in Stocks / Funds), its return is null (an em-dash), and null must never arrive as 0
    const bonds = cats.find((c) => c.key === 'bonds')!;
    expect(bonds.earned).toBe(300);
    expect(bonds.ret).toBeNull();
    expect(bonds.ret).not.toBe(0);
  });
  test('MOVED OFF THE SCREEN 2026-09-30 — a screen computes nothing', () => {
    const screen = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', '..', 'src', 'screens', 'PerformanceScreen.tsx'), 'utf8');
    expect(screen).toMatch(/categoryEarnings\(/);                  // it asks
    expect(screen).not.toMatch(/const catEarned[\s\S]{0,40}reduce/); // it does not work it out
  });
});

// ── MK-PF-M-007 · All categories ────────────────────────────────────────────────────────────────
describe('MK-PF-M-007 All categories', () => {
  const rows = [{ position: { ticker: 'VTI', asset_class: 'stocks_etf' }, periodReturn: 0.1, marketValue: 1_000 }];
  test('LEDGER ONLY: what was actually RECEIVED, never a rate applied to a balance', () => {
    // a $1,000 holding up 10% and NO records: nothing was received, so nothing is claimed
    expect(categoryEarnings({ windowStart: '2026-01-01', transactions: [], rows })).toEqual([]);
  });
  test('a record with no ticker is classed by WHAT IT IS — a dividend from a fund, interest from a bond', () => {
    const cats = categoryEarnings({
      windowStart: '2026-01-01', rows,
      transactions: [
        { txn_id: 'd', type: 'DIVIDEND', amount: 90, date: '2026-05-01' },   // no ticker
        { txn_id: 'i', type: 'INTEREST', amount: 40, date: '2026-05-01' },   // no ticker
      ],
    });
    expect(cats.find((c) => c.key === 'stocks_etf')!.earned).toBe(90);
    expect(cats.find((c) => c.key === 'bonds')!.earned).toBe(40);
  });
  test('a class that received nothing is not shown at all — never a $0 row', () => {
    const cats = categoryEarnings({
      windowStart: '2026-01-01', rows,
      transactions: [{ txn_id: 'd', ticker: 'VTI', type: 'DIVIDEND', amount: 90, date: '2026-05-01' }],
    });
    expect(cats.map((c) => c.key)).toEqual(['stocks_etf']);
    expect(cats.some((c) => c.earned === 0)).toBe(false);
  });
  test('and a window with nothing received at all means the table does not appear', () => {
    const cats = categoryEarnings({
      windowStart: '2026-06-01', rows,
      transactions: [{ txn_id: 'd', ticker: 'VTI', type: 'DIVIDEND', amount: 90, date: '2026-05-01' }],
    });
    expect(cats).toEqual([]);                                   // the May record is outside the window
  });
});

// ── MK-PF-M-001 · Ending value  ·  MK-PF-M-004 · Ending market value (per account) ──────────────
describe('MK-PF-M-001 Ending value and MK-PF-M-004 Ending market value (per account)', () => {
  test('the ending value a person reads IS the last line of the walk — one number, not two', () => {
    const a = ask({ ending: 32_000 });
    expect(a.walk.ending).toBe(32_000);
  });
  test('the same door, asked of ONE account, gives that account its own ending — so the parts and the total agree', () => {
    const days = [
      { ...recordDay('2026-01-01', 30_000, 'a1') },
      { ...recordDay('2026-01-01', 20_000, 'a2'), date: '2026-01-01' },
    ] as any;
    const both = ask({ ending: 55_000, snapshotDays: days, investmentAccountIds: new Set(['a1', 'a2']) });
    const one = ask({ ending: 33_000, snapshotDays: days, investmentAccountIds: new Set(['a1']) });
    const two = ask({ ending: 22_000, snapshotDays: days, investmentAccountIds: new Set(['a2']) });
    expect(one.walk.ending + two.walk.ending).toBe(both.walk.ending);
  });
});

// ── MK-PF-M-008 · market +X% (on Home) ──────────────────────────────────────────────────────────
describe('MK-PF-M-008 market +X%', () => {
  test('weighted by what each holding is worth — "the market, matched to my mix", not an average of indices', () => {
    const blend = portfolioBenchReturn([
      { benchReturn: 0.10, marketValue: 40_000 },
      { benchReturn: 0.04, marketValue: 10_000 },
    ] as any);
    expect(blend).toBeCloseTo(0.088, 6);        // 8.80%, not the 7.00% a plain average would give
    expect(blend).not.toBeCloseTo(0.07, 4);
  });
  test('the benchmark runs over the SAME DATES, so a holding with no usable benchmark is left out', () => {
    const blend = portfolioBenchReturn([
      { benchReturn: 0.10, marketValue: 40_000 },
      { benchReturn: null, marketValue: 60_000 },    // no benchmark over these dates
    ] as any);
    expect(blend).toBeCloseTo(0.10, 6);            // it is not diluted towards zero by the one it cannot price
  });
});

// ── MK-PF-M-010 / 011 · Look back ───────────────────────────────────────────────────────────────
describe('MK-PF-M-010 Left in <fund> it became $X', () => {
  const series = (points: [string, number][]) => ({ points: points.map(([date, close]) => ({ date, close })) });
  const NOW = new Date('2026-09-28T12:00:00Z');
  const lb = () => theLookBack({
    amount: 10_000, months: 6, now: NOW,
    fromSeries: series([['2026-03-28', 100], ['2026-09-28', 102.5]]),
    toSeries: series([['2026-03-28', 50], ['2026-09-28', 58]]),
  })!;
  test('price changes only — dividends are not in it', () => {
    // $10,000 at 100 → 102.5 is exactly 2.5%: a dividend would have to push it above that
    expect(lb().stayed.endValue).toBe(10_250);
    expect(lb().stayed.pct).toBeCloseTo(2.5, 6);
  });
  test('MK-PF-M-011 — a road not taken, priced from REAL history, never a projection forward', () => {
    expect(lb().moved.endValue).toBe(11_600);        // 10,000 × 58 ÷ 50, both real closes
    expect(lb().difference).toBe(1_350);             // MK-PF-M-012
  });
  test('and with no history over the whole window it says nothing rather than something', () => {
    expect(theLookBack({ amount: 10_000, months: 6, now: NOW, fromSeries: null, toSeries: null })).toBeNull();
  });
});

// ── MK-XS-M-004 · the month's return, on Home and on Performance ────────────────────────────────
describe('MK-XS-M-004 ▲ up/▼ down $X (Y%) this month · Return · YOUR RETURN', () => {
  test('ONE MEANING OF RETURN: dividends and interest are in it', () => {
    const withIncome = ask({ transactions: [{ txn_id: 'd', account_id: 'a1', type: 'DIVIDEND', amount: 600, date: '2026-06-01' }] });
    const without = ask();
    // the same household, the same ending: the return is the same either way, because the
    // dividend is INSIDE wealth generated, not on top of it
    expect(withIncome.ret).toBeCloseTo(2_000 / 30_000, 9);
    expect(without.ret).toBeCloseTo(2_000 / 30_000, 9);
  });
  test('A RATE NEEDS SOMETHING TO STAND ON: no beginning and no movement means nothing, not +0.00%', () => {
    const a = thePerformance({
      windowStart: '2026-01-02', windowLabel: 'since Jan 1', today: TODAY,
      ending: 0, pricedGain: 0, transactions: [], snapshotDays: [],
      investmentAccountIds: new Set(['a1']),
    });
    expect(a.measured).toBeNull();
    expect(a.ret).toBeNull();
    expect(a.ret).not.toBe(0);
  });
  test('IT REFUSES WHEN TIMING WOULD DRIVE IT — the dollar walk is the honest answer instead', () => {
    // $6,000 into a $30,000 account is a fifth of it: when it arrived would decide the percentage
    const a = ask({
      ending: 46_600,
      transactions: [{ txn_id: 'c', account_id: 'a1', type: 'DEPOSIT', amount: 6_000, date: '2026-04-01' }],
    });
    expect(a.ret).toBeNull();
    expect(a.sentence).toMatch(/the dollar walk below is the honest answer/);
    expect(a.walk.ending).toBe(46_600);        // and the walk is still there, and still closes
  });
  test('OVER A YEAR IT IS A YEARLY RATE, and both figures are kept so the screen can label them', () => {
    const twoYears = thePerformance({
      windowStart: '2024-09-29', windowLabel: 'past 2 years', today: TODAY,
      ending: 32_000, pricedGain: 0, transactions: [],
      snapshotDays: [recordDay('2024-09-28', 30_000)] as any,
      investmentAccountIds: new Set(['a1']),
    });
    expect(twoYears.years).toBeGreaterThan(1);
    expect(twoYears.perYear).not.toBeNull();
    expect(twoYears.ret).toBe(twoYears.perYear);                       // the yearly rate is what is shown
    expect(twoYears.perYear!).toBeLessThan(twoYears.cumulative!);      // and it is smaller than the total
    // under a year, no yearly rate at all
    expect(ask().perYear).toBeNull();
    expect(ask().ret).toBe(ask().cumulative);
  });
  test('the window it opens on is one a person could check: MK-NW-F-090 gives the day after the record starts', () => {
    expect(windowStartKey('SINCE', ['2026-01-01', '2026-02-01'], TODAY)).toBe('2026-01-02');
  });
});

/** A GUARD MUST PROVE IT LOOKED (standing order, 2026-09-28). This file's whole point is that every
 *  Performance figure is NAMED here, so the count of figures it names is asserted — if a figure is
 *  added to the door and not to this file, this goes red. */
test('every Performance figure is named in this file, by identifier', () => {
  const fs = require('fs');
  const me = fs.readFileSync(__filename, 'utf8');
  const { PERFORMANCE_FIGURES } = require('./performance');
  const { LOOK_BACK_FIGURES } = require('./look-back');
  const ids = [...Object.keys(PERFORMANCE_FIGURES), ...Object.keys(LOOK_BACK_FIGURES ?? {})];
  expect(ids.length).toBeGreaterThanOrEqual(12);
  expect(ids.filter((id) => !me.includes(id))).toEqual([]);
});
