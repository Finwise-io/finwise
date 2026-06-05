import {
  costBasis, totalShares, avgCost, marketValue, unrealizedGain, totalROI,
  periodReturn, latestClose, buildPerformance, portfolioPeriodReturn, benchmarkTicker,
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
  test('null price → safe zeros / null ROI', () => {
    expect(marketValue(p, null)).toBe(0);
    expect(unrealizedGain(p, undefined)).toBe(0);
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
  test('3Y annualizes', () => {
    const s3 = series('Z', [['2022-06-01', 100], ['2025-06-01', 133.1]]);  // +33.1% over 3y ≈ 10%/yr
    expect(periodReturn(s3, '3Y', now)).toBeCloseTo(0.10, 3);
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
    expect(benchmarkTicker(undefined)).toBe('SPY');
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
