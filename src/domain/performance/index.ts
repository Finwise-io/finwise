// Portfolio Performance Analysis — pure core.
// A holding is a ticker + one or more cost-basis LOTS (shares bought at a price on a date).
// Market value, unrealized gain, total ROI, and period returns all derive from lots + live price.
// Price data comes from a swappable PriceProvider (see services/marketData.ts) so the model and UI
// never need rework if we change data source later.
import type { EntityId } from '../_shared/ids';
import { round2 } from '../_shared/num';

/** One purchase lot — shares bought at a price on a date (enables true cost-basis ROI). */
export interface Lot {
  lot_id: EntityId;
  shares: number;
  cost_per_share: number;       // purchase price per share, in account currency
  purchase_date: string;        // 'YYYY-MM-DD'
}

/** A marketable holding inside an account: a ticker + its lots. */
export interface Position {
  position_id: EntityId;
  ticker: string;               // e.g. 'AAPL', 'SPY', 'VTI'
  label?: string;               // display name, e.g. 'Apple Inc.'
  kind?: string;                // ASSET_KINDS id, for benchmark mapping
  asset_class?: 'stock_etf' | 'bond' | 'other';   // explicit class (import/sync sets it; wins over kind)
  last_price?: number;          // broker's daily mark (connected accounts — no live feed needed)
  lots: Lot[];
}

/** A daily close series, oldest→newest, for return math. */
export interface PriceSeries { ticker: string; points: { date: string; close: number }[]; }

export type Period = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y';
export const PERIODS: Period[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y'];

// ---- cost basis & value (lot math) ----
export function totalShares(p: Position): number {
  return (p.lots ?? []).reduce((t, l) => t + (l.shares || 0), 0);
}
export function costBasis(p: Position): number {
  return round2((p.lots ?? []).reduce((t, l) => t + (l.shares || 0) * (l.cost_per_share || 0), 0));
}
export function avgCost(p: Position): number {
  const sh = totalShares(p);
  return sh > 0 ? round2(costBasis(p) / sh) : 0;
}
export function marketValue(p: Position, price: number | null | undefined): number {
  return price == null ? 0 : round2(totalShares(p) * price);
}
/** Unrealized gain = market value − cost basis (null price → 0). */
export function unrealizedGain(p: Position, price: number | null | undefined): number {
  return price == null ? 0 : round2(marketValue(p, price) - costBasis(p));
}
/** Unrealized capital gains split by holding period — long-term (held ≥ 1 year) vs short-term.
 *  Computed per lot from its purchase date; lots without a cost basis are skipped. */
export interface CapGains { longGain: number; shortGain: number; totalGain: number; }
export function capGains(p: Position, price: number | null | undefined, now: Date = new Date()): CapGains {
  if (price == null) return { longGain: 0, shortGain: 0, totalGain: 0 };
  let lg = 0, sg = 0;
  for (const lot of (p.lots ?? [])) {
    if (!(lot.cost_per_share > 0) || !(lot.shares > 0)) continue;
    const gain = lot.shares * (price - lot.cost_per_share);
    const bought = new Date(lot.purchase_date);
    const heldMonths = isNaN(bought.getTime()) ? 0 : (now.getFullYear() - bought.getFullYear()) * 12 + (now.getMonth() - bought.getMonth());
    if (heldMonths >= 12) lg += gain; else sg += gain;
  }
  return { longGain: round2(lg), shortGain: round2(sg), totalGain: round2(lg + sg) };
}
/** Estimated tax if sold now: long-term gains at the LT rate, short-term at the ordinary rate.
 *  Losses don't create a positive tax. */
export function capGainsTax(longGain: number, shortGain: number, ltRate = 0.15, ordinaryRate = 0.24): number {
  return round2(Math.max(0, longGain) * ltRate + Math.max(0, shortGain) * ordinaryRate);
}

/** Total return since purchase = gain / cost basis (decimal). null price or zero basis → null. */
export function totalROI(p: Position, price: number | null | undefined): number | null {
  const basis = costBasis(p);
  if (price == null || basis <= 0) return null;
  return Math.round((unrealizedGain(p, price) / basis) * 1e4) / 1e4;
}

// ---- period returns from a price series (price return of the security itself) ----
function startDateFor(period: Period, now: Date): Date {
  const d = new Date(now);
  switch (period) {
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
    case '1Y': d.setFullYear(d.getFullYear() - 1); break;
    case '3Y': d.setFullYear(d.getFullYear() - 3); break;
    case 'YTD': return new Date(now.getFullYear(), 0, 1);
  }
  return d;
}
/** Close on/just-before a target date (series oldest→newest). */
function closeAsOf(series: PriceSeries | null | undefined, target: Date): number | null {
  const pts = series?.points ?? [];
  if (!pts.length) return null;
  const t = target.getTime();
  let chosen: number | null = null;
  for (const p of pts) { if (new Date(p.date).getTime() <= t) chosen = p.close; else break; }
  return chosen ?? pts[0].close;   // target predates the series → first available
}
export function latestClose(series: PriceSeries | null | undefined): number | null {
  const pts = series?.points ?? [];
  return pts.length ? pts[pts.length - 1].close : null;
}
/** Price return of a ticker over a period (decimal). null if insufficient data. */
export function periodReturn(series: PriceSeries | null | undefined, period: Period, now = new Date()): number | null {
  if (!series || !(series.points?.length)) return null;
  const end = latestClose(series);
  const start = closeAsOf(series, startDateFor(period, now));
  if (end == null || start == null || start <= 0) return null;
  // annualize multi-year so 3Y is comparable to 1Y
  const raw = end / start - 1;
  if (period === '3Y') return Math.round((Math.pow(end / start, 1 / 3) - 1) * 1e4) / 1e4;
  return Math.round(raw * 1e4) / 1e4;
}

/** Default benchmark ETF proxy per asset kind — the index we compare a holding against, same period. */
export const BENCHMARK_TICKER: Record<string, string> = {
  stocks_etf: 'SPY',        // S&P 500
  fixed_income: 'AGG',      // US Aggregate Bond
  private_equity: 'PSP',    // listed PE proxy
  hedge_funds: 'QAI',       // hedge-fund-replication proxy
  commodities: 'GLD',       // gold
  crypto: 'BTC',            // (provider maps to btc.v / btcusd)
  annuities: 'AGG',
  college_529: 'AOR',       // 60/40 allocation proxy
  '401k': 'AOR',
  trad_ira: 'AOR',
  roth_ira: 'AOR',
  hsa: 'AOR',
  other_asset: 'SPY',
};
export function benchmarkTicker(kind?: string): string {
  return BENCHMARK_TICKER[kind ?? ''] ?? 'SPY';
}

/** One row of the per-holding performance table. */
export interface PerformanceRow {
  position: Position;
  price: number | null;
  marketValue: number;
  costBasis: number;
  gain: number;
  totalROI: number | null;        // since purchase
  periodReturn: number | null;    // the holding's price return over the selected period
  benchTicker: string;
  benchReturn: number | null;     // benchmark's SAME-period return — honest comparison
  beatBy: number | null;          // periodReturn − benchReturn
}
/** Build the per-holding rows for a period from positions + a price-series lookup. */
export function buildPerformance(
  positions: Position[],
  priceOf: (ticker: string) => PriceSeries | null | undefined,
  period: Period,
  now = new Date(),
): PerformanceRow[] {
  return (positions ?? []).map((p) => {
    const series = priceOf(p.ticker);
    const price = latestClose(series);
    const pr = periodReturn(series, period, now);
    const benchTicker = benchmarkTicker(p.kind);
    const benchReturn = periodReturn(priceOf(benchTicker), period, now);
    return {
      position: p, price,
      marketValue: marketValue(p, price), costBasis: costBasis(p), gain: unrealizedGain(p, price),
      totalROI: totalROI(p, price), periodReturn: pr,
      benchTicker, benchReturn,
      beatBy: pr != null && benchReturn != null ? Math.round((pr - benchReturn) * 1e4) / 1e4 : null,
    };
  });
}

/** The holding-concentration FACT (Invest main + the insights engine share this one rule):
 *  the largest single holding as a % of invested money, reported only at 25%+ with 2+ holdings —
 *  below that it isn't a fact worth a card. Never advice, just the number and the ticker. */
export function topHoldingConcentration(rows: PerformanceRow[]): { ticker: string; pct: number } | null {
  const invested = rows.reduce((t, r) => t + r.marketValue, 0);
  if (invested <= 0 || rows.length < 2) return null;
  const top = rows.reduce((m, r) => (r.marketValue > m.marketValue ? r : m), rows[0]);
  const pct = Math.round((top.marketValue / invested) * 100);
  return pct >= 25 ? { ticker: top.position.ticker, pct } : null;
}

/** Per-holding contribution to the portfolio's period return = weight × the holding's return (pts).
 *  The contributions sum (approx) to the portfolio return; sorted best→worst for winners/detractors. */
export function attribution(rows: PerformanceRow[]): { position: Position; contribution: number; weight: number }[] {
  const total = rows.reduce((t, r) => t + r.marketValue, 0);
  if (total <= 0) return [];
  return rows
    .filter((r) => r.periodReturn != null && r.marketValue > 0)
    .map((r) => ({ position: r.position, weight: r.marketValue / total, contribution: Math.round((r.marketValue / total) * (r.periodReturn as number) * 1e4) / 1e4 }))
    .sort((a, b) => b.contribution - a.contribution);
}

/** Current allocation by asset kind (+ a cash slice), as value + % of the portfolio. */
export interface AllocSlice { key: string; value: number; pct: number; }
export function allocation(rows: PerformanceRow[], cash = 0): AllocSlice[] {
  const byKind: Record<string, number> = {};
  rows.forEach((r) => { const k = r.position.kind ?? 'other_asset'; byKind[k] = (byKind[k] || 0) + r.marketValue; });
  const total = Object.values(byKind).reduce((t, v) => t + v, 0) + Math.max(0, cash);
  if (total <= 0) return [];
  const slices: AllocSlice[] = Object.entries(byKind).map(([key, v]) => ({ key, value: round2(v), pct: Math.round((v / total) * 1000) / 10 }));
  if (cash > 0) slices.push({ key: 'cash', value: round2(cash), pct: Math.round((cash / total) * 1000) / 10 });
  return slices.sort((a, b) => b.value - a.value);
}

/** Portfolio value over time vs a benchmark rebased to the same starting value.
 *  Uses CURRENT holdings across the window (growth-of-holdings view; ignores past buys/sells). */
export interface TrendPoint { date: string; value: number; bench: number; }
export function portfolioTrend(
  positions: Position[],
  priceOf: (t: string) => PriceSeries | null | undefined,
  period: Period,
  benchTickerSym = 'SPY',
  now = new Date(),
): TrendPoint[] {
  if (!positions?.length) return [];
  const start = startDateFor(period, now);
  const span = now.getTime() - start.getTime();
  if (span <= 0) return [];
  const N = 12;
  const dates = Array.from({ length: N + 1 }, (_, i) => new Date(start.getTime() + (span * i) / N));
  const benchSeries = priceOf(benchTickerSym);
  const valueAt = (d: Date) => positions.reduce((t, p) => { const c = closeAsOf(priceOf(p.ticker), d); return t + (c == null ? 0 : totalShares(p) * c); }, 0);
  const v0 = valueAt(dates[0]);
  const b0 = closeAsOf(benchSeries, dates[0]);
  return dates.map((d) => {
    const value = Math.round(valueAt(d) * 100) / 100;
    const braw = closeAsOf(benchSeries, d);
    const bench = (b0 && braw != null && v0 > 0) ? Math.round(v0 * (braw / b0) * 100) / 100 : value;
    return { date: d.toISOString().slice(0, 10), value, bench };
  });
}

/** Value-weighted portfolio period return across holdings that have one (decimal), or null. */
export function portfolioPeriodReturn(rows: PerformanceRow[]): number | null {
  const usable = rows.filter((r) => r.periodReturn != null && r.marketValue > 0);
  const total = usable.reduce((t, r) => t + r.marketValue, 0);
  if (total <= 0) return null;
  return Math.round((usable.reduce((t, r) => t + (r.periodReturn as number) * r.marketValue, 0) / total) * 1e4) / 1e4;
}
