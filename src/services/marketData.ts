// Market data — daily close history by ticker, behind a swappable PriceProvider.
// First implementation: Stooq (free, no API key, EOD daily CSV) — same "free public API" approach
// as economicData.ts. Swap to a keyed real-time provider later WITHOUT touching the domain or UI.
import type { PriceSeries } from '../domain/performance';

export interface PriceProvider {
  /** Daily close series (oldest→newest) for a ticker, or null if unavailable. */
  fetchSeries(ticker: string, fromISO?: string): Promise<PriceSeries | null>;
}

// Map a plain ticker to Stooq's symbol convention (US equities/ETFs use a ".us" suffix; BTC special).
function stooqSymbol(ticker: string): string {
  const t = ticker.trim().toLowerCase();
  if (!t) return '';
  if (t === 'btc' || t === 'btcusd' || t === 'btc-usd') return 'btcusd';
  if (t === 'eth' || t === 'ethusd' || t === 'eth-usd') return 'ethusd';
  if (t.includes('.')) return t;            // already qualified (e.g. 'spy.us')
  return `${t}.us`;                          // default to US listing
}

function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Parse Stooq daily CSV: header "Date,Open,High,Low,Close,Volume" then rows. */
function parseStooqCsv(ticker: string, csv: string): PriceSeries | null {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || !/date/i.test(lines[0])) return null;       // "No data" / error page
  const points: { date: string; close: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 5) continue;
    const date = cols[0];
    const close = parseFloat(cols[4]);
    if (date && !isNaN(close)) points.push({ date, close });
  }
  return points.length ? { ticker, points } : null;
}

export const stooqProvider: PriceProvider = {
  async fetchSeries(ticker, fromISO) {
    const sym = stooqSymbol(ticker);
    if (!sym) return null;
    const from = fromISO ? new Date(fromISO) : new Date(Date.now() - 3.2 * 365 * 86400000); // ~3.2y default
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&d1=${yyyymmdd(from)}&d2=${yyyymmdd(new Date())}&i=d`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const csv = await res.text();
      return parseStooqCsv(ticker, csv);
    } catch {
      return null;   // offline / blocked — caller falls back to cached data
    }
  },
};

/** Fetch many tickers in parallel; returns only the ones that resolved. */
export async function fetchPriceSeries(
  tickers: string[],
  provider: PriceProvider = stooqProvider,
  fromISO?: string,
): Promise<Record<string, PriceSeries>> {
  const unique = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)));
  const results = await Promise.allSettled(unique.map((t) => provider.fetchSeries(t, fromISO)));
  const out: Record<string, PriceSeries> = {};
  unique.forEach((t, i) => {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value) out[t] = r.value;
  });
  return out;
}
