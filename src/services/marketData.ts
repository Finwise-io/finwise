// Market data — daily close history by ticker, behind a swappable PriceProvider.
// Implementation: Yahoo Finance chart endpoint (free, no API key, returns daily closes as JSON).
// Same "free public API" approach as economicData.ts. The PriceProvider interface means we can swap
// to a keyed real-time provider later WITHOUT touching the domain or UI.
import type { PriceSeries } from '../domain/performance';

export interface PriceProvider {
  /** Daily close series (oldest→newest) for a ticker, or null if unavailable. */
  fetchSeries(ticker: string, range?: string): Promise<PriceSeries | null>;
}

// Map a plain ticker to the provider's symbol convention (crypto needs the -USD pair on Yahoo).
function yahooSymbol(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (!t) return '';
  if (t === 'BTC' || t === 'BTCUSD') return 'BTC-USD';
  if (t === 'ETH' || t === 'ETHUSD') return 'ETH-USD';
  return t;
}

export const yahooProvider: PriceProvider = {
  async fetchSeries(ticker, range = '3y') {
    const sym = yahooSymbol(ticker);
    if (!sym) return null;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
      if (!res.ok) return null;
      const json: any = await res.json();
      const result = json?.chart?.result?.[0];
      const ts: number[] = result?.timestamp;
      // Prefer dividend+split-ADJUSTED close (total return) so returns match "total return" benchmarks;
      // fall back to raw close if adjclose isn't present.
      const adj: (number | null)[] | undefined = result?.indicators?.adjclose?.[0]?.adjclose;
      const raw: (number | null)[] | undefined = result?.indicators?.quote?.[0]?.close;
      const closes = adj && adj.some((v) => v != null) ? adj : raw;
      if (!Array.isArray(ts) || !Array.isArray(closes)) return null;
      const points: { date: string; close: number }[] = [];
      for (let i = 0; i < ts.length; i++) {
        const c = closes[i];
        if (c == null || isNaN(c)) continue;                       // Yahoo emits nulls on holidays
        points.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), close: c });
      }
      return points.length ? { ticker: ticker.trim().toUpperCase(), points } : null;
    } catch {
      return null;   // offline / blocked — caller falls back to cached data
    }
  },
};

/** Fetch many tickers in parallel; returns only the ones that resolved. */
export async function fetchPriceSeries(
  tickers: string[],
  provider: PriceProvider = yahooProvider,
  range?: string,
): Promise<Record<string, PriceSeries>> {
  const unique = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)));
  const results = await Promise.allSettled(unique.map((t) => provider.fetchSeries(t, range)));
  const out: Record<string, PriceSeries> = {};
  unique.forEach((t, i) => {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value) out[t] = r.value;
  });
  return out;
}
