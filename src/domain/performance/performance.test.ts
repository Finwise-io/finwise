import {
  costBasis, totalShares, avgCost, marketValue, unrealizedGain, totalROI,
  periodReturn, latestClose, buildPerformance, portfolioPeriodReturn, benchmarkTicker,
  attribution, allocation, portfolioTrend, capGains,
  type Position, type PriceSeries,
} from './index';

const pos = (ticker: string, kind: string, lots: [number, number, string][]): Position => ({
  position_id: ticker, ticker, kind,
  lots: lots.map(([shares, cost, date], i) => ({ lot_id: `${ticker}-${i}`, shares, cost_per_share: cost, purchase_date: date })),
});

// a flat-ish daily series helper: prices at specific dates
const series = (ticker: string, points: [string, number][]): PriceSeries => ({ ticker, points: points.map(([date, close]) => ({ date, close })) });

describe('performance — cost basis & value', () => {
  const p = pos('AAPL', 'stocks_etf', [[10, 100, '2024-01-02'], [5, 120, '2024-06-01']]);  // 15 sh, basis 1600
  test('shares, basis, avg cost', () => {
    expect(totalShares(p)).toBe(15);
    expect(costBasis(p)).toBe(1600);
    expect(avgCost(p)).toBeCloseTo(106.67, 2);
  });
  test('market value, gain, total ROI at a price', () => {
    expect(marketValue(p, 200)).toBe(3000);
    expect(unrealizedGain(p, 200)).toBe(1400);
    expect(totalROI(p, 200)).toBeCloseTo(0.875, 4);   // 1400/1600
  });
  // no price → UNKNOWN, not $0 (outside review Claude Performance, 2026-10-11, DEC-3523 tenet 3: unknown is not zero).
  // It read "safe zeros" — 15 shares with no price shown as worth $0 and no gain.
  test('null price → unknown value, unknown gain, null ROI', () => {
    expect(marketValue(p, null)).toBeNull();
    expect(unrealizedGain(p, undefined)).toBeNull();
    expect(totalROI(p, null)).toBeNull();
  });
});

describe('performance — period returns', () => {
  // 1 year of monthly points ending 2025-06-01 at 110, started 2024-06-01 at 100 → +10% 1Y
  const s = series('AAPL', [
    ['2024-06-01', 100], ['2024-09-01', 104], ['2024-12-01', 106], ['2025-03-01', 108], ['2025-06-01', 110],
  ]);
  const now = new Date('2025-06-01');
  test('latest close + 1Y price return', () => {
    expect(latestClose(s)).toBe(110);
    expect(periodReturn(s, '1Y', now)).toBeCloseTo(0.10, 4);
  });
  test('YTD uses Jan-1 baseline', () => {
    expect(periodReturn(s, 'YTD', now)).toBeCloseTo(110 / 106 - 1, 4);  // closest on/before Jan1 2025 = Dec close 106
  });
  test('insufficient data → null', () => {
    expect(periodReturn(series('X', []), '1Y', now)).toBeNull();
    expect(periodReturn(null, '1Y', now)).toBeNull();
  });
  test('a multi-year window is shown PER YEAR, so it sits fairly beside the 1-year figure', () => {
    // FOUNDER DECISION 2026-08-18: two years is the longest window offered, because two years is
    // exactly how much daily history the app keeps.
    const s2 = series('Z', [['2023-06-01', 100], ['2025-06-01', 121]]);   // +21% over 2y = 10%/year
    expect(periodReturn(s2, '2Y', now)).toBeCloseTo(0.10, 3);
  });
});

describe('performance — table + benchmark comparison', () => {
  const now = new Date('2025-06-01');
  const prices: Record<string, PriceSeries> = {
    AAPL: series('AAPL', [['2024-06-01', 100], ['2025-06-01', 120]]),   // +20% 1Y
    SPY: series('SPY', [['2024-06-01', 100], ['2025-06-01', 112]]),     // +12% 1Y
  };
  const priceOf = (t: string) => prices[t];
  const positions = [pos('AAPL', 'stocks_etf', [[10, 80, '2023-01-01']])];

  test('benchmark mapping', () => {
    expect(benchmarkTicker('stocks_etf')).toBe('SPY');
    expect(benchmarkTicker('fixed_income')).toBe('AGG');
    // nothing says what the holding is → no yardstick (outside review Claude Performance, 2026-10-11, DEC-2160); it read 'SPY'
    expect(benchmarkTicker(undefined)).toBeNull();
  });
  test('row compares same-period return vs benchmark', () => {
    const [row] = buildPerformance(positions, priceOf, '1Y', now);
    expect(row.price).toBe(120);
    expect(row.marketValue).toBe(1200);
    expect(row.totalROI).toBeCloseTo((1200 - 800) / 800, 4);   // since purchase
    expect(row.periodReturn).toBeCloseTo(0.20, 4);
    expect(row.benchReturn).toBeCloseTo(0.12, 4);
    expect(row.beatBy).toBeCloseTo(0.08, 4);                    // +8 pts vs SPY
  });
  test('portfolio period return is value-weighted', () => {
    const rows = buildPerformance(positions, priceOf, '1Y', now);
    expect(portfolioPeriodReturn(rows)).toBeCloseTo(0.20, 4);
  });
});

describe('performance — attribution + allocation', () => {
  const now = new Date('2025-06-01');
  const prices: Record<string, PriceSeries> = {
    AAPL: series('AAPL', [['2024-06-01', 100], ['2025-06-01', 130]]),  // +30%
    BND: series('BND', [['2024-06-01', 100], ['2025-06-01', 95]]),     // −5%
    SPY: series('SPY', [['2024-06-01', 100], ['2025-06-01', 110]]),
    AGG: series('AGG', [['2024-06-01', 100], ['2025-06-01', 100]]),
  };
  const priceOf = (t: string) => prices[t];
  const positions = [
    pos('AAPL', 'stocks_etf', [[30, 50, '2023-01-01']]),   // 30×130 = 3900 mkt
    pos('BND', 'fixed_income', [[10, 100, '2023-01-01']]), // 10×95  = 950 mkt
  ];
  const rows = buildPerformance(positions, priceOf, '1Y', now);

  test('attribution: AAPL is the top contributor, BND a detractor; sums ~ portfolio return', () => {
    const a = attribution(rows);
    expect(a[0].position.ticker).toBe('AAPL');
    expect(a[a.length - 1].position.ticker).toBe('BND');
    expect(a[a.length - 1].contribution).toBeLessThan(0);
    const sum = a.reduce((t, x) => t + x.contribution, 0);
    expect(sum).toBeCloseTo(portfolioPeriodReturn(rows) as number, 3);
  });

  test('allocation: by kind + cash, percentages of total', () => {
    const slices = allocation(rows, 1450);              // 3900 + 950 + 1450 = 6300
    const cash = slices.find((s) => s.key === 'cash')!;
    expect(cash.pct).toBeCloseTo(23.0, 1);
    expect(slices.reduce((t, s) => t + s.pct, 0)).toBeCloseTo(100, 0);
  });

  test('capGains: splits long- vs short-term by holding period', () => {
    const now = new Date(2026, 0, 1);
    const p = pos('AAPL', 'stocks_etf', [[10, 100, '2024-06-01'], [5, 100, '2025-10-01']]);  // 10sh held >1y, 5sh <1y
    const cg = capGains(p, 130, now);                 // price 130 → $30/sh gain
    expect(cg.longGain).toBeCloseTo(300, 0);          // 10 × 30
    expect(cg.shortGain).toBeCloseTo(150, 0);         // 5 × 30
  });

  test('portfolioTrend: value + rebased benchmark over time', () => {
    const p2 = [pos('AAPL', 'stocks_etf', [[10, 50, '2023-01-01']])];   // 10 shares
    const trend = portfolioTrend(p2, priceOf, '1Y', 'SPY', now);
    expect(trend.length).toBe(13);                        // N+1 sample points
    expect(trend[trend.length - 1].value).toBeCloseTo(10 * 130, 0);   // ends at 10×130
    // benchmark rebased to the portfolio's starting value
    expect(trend[0].bench).toBeCloseTo(trend[0].value, 0);
    expect(trend[trend.length - 1].bench).toBeGreaterThan(trend[0].bench);  // SPY rose over the window
  });
});

// NO "−1 contracts" (outside review Claude Performance, 2026-10-11, DEC-3523 tenet 3): the app has no words for a
// short (written) position, so a quantity below zero — or one not on record — refuses rather than reading wrong.
test('a quantity below zero, or not on record, has no words', () => {
  const { quantityWithUnit } = require('./index');
  expect(quantityWithUnit({ kind: 'options' }, -1)).toBeNull();
  expect(quantityWithUnit({ kind: 'options' }, null)).toBeNull();
  expect(quantityWithUnit({ kind: 'options' }, 2)).toBe('2 contracts');
});
