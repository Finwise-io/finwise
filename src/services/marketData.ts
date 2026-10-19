// Market data — daily close history by ticker, behind a swappable PriceProvider.
// Implementation: Yahoo Finance chart endpoint (free, no API key, returns daily closes as JSON).
// Same "free public API" approach as economicData.ts. The PriceProvider interface means we can swap
// to a keyed real-time provider later WITHOUT touching the domain or UI.
import type { PriceSeries } from '../domain/performance';
import { agoLabel, isStale } from '../domain/_shared/freshness';

export interface PriceProvider {
  /** Daily close series (oldest→newest) for a ticker, or null if unavailable. */
  fetchSeries(ticker: string, range?: string): Promise<PriceSeries | null>;
}

// Map a plain ticker to the provider's symbol convention (crypto needs the -USD pair on Yahoo).
/* ─ MK-XS-F-143 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * yahooSymbol
 *
 * Answers ..... Map a plain ticker to the provider's symbol convention (crypto needs the -USD pair on Yahoo).
 *
 * Formula .....
 *     t = ticker.trim().to upper case()
 *     ''   when t is missing
 *     'BTC − USD'   when t = 'BTC' (or t = 'BTCUSD' when missing or zero)
 *     'ETH − USD'   when t = 'ETH' (or t = 'ETHUSD' when missing or zero)
 *     the answer = t
 *     sym = yahoo symbol(ticker)
 *     nothing   when sym is missing
 *     res = await fetch(url, { headers: { 'user − Agent': 'mozilla ÷ 5.0', accept: 'application ÷ json' } })
 *     nothing   when res.ok is missing
 *     json = await res.json()
 *     result = the first of json.chart.result?.
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-143
 * Changed ..... not in git yet (—)
 */
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

/** Is a ticker plausibly valid before we spend a network call? (1–6 letters, optional .suffix or
 *  -USD crypto pair). Lets the UI flag a typo instead of silently returning no data. */
/* ─ MK-XS-F-081 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isPlausibleTicker
 *
 * Answers ..... Is a ticker plausibly valid before we spend a network call?
 *
 * Formula .....
 *     ÷ ^[A − za − z]{1,6}([.\-][A − za − z]{1,4})?$ ÷ .test((ticker ?? '').trim())
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-081
 * Changed ..... 2026-06-13 (c42d16b)
 */
export function isPlausibleTicker(ticker: string): boolean {
  return /^[A-Za-z]{1,6}([.\-][A-Za-z]{1,4})?$/.test((ticker ?? '').trim());
}

export interface PriceFreshness { label: string; stale: boolean; }
/** Human freshness of the price cache + whether it's stale enough to warn (markets move daily, so
 *  anything older than ~4 days — a long weekend/holiday — is worth a "may be out of date" note). */
/* ─ MK-XS-F-082 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * priceFreshness
 *
 * Answers ..... Human freshness of the price cache + whether it's stale enough to warn (markets move daily, so anything older than ~4 days — a long weekend/holiday — is worth a "may be out of date" note).
 *
 * Formula .....
 *     age   = now − the moment prices were last fetched
 *     stale = age ≥ 4 days,  or nothing was ever fetched,  or the moment cannot be read
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-HM-M-001
 * Reads ....... MK-XS-I-006 price fetched at
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-082
 * Changed ..... 2026-06-13 (c42d16b)
 */
export function priceFreshness(fetchedAt: string | null | undefined, now: number): PriceFreshness {
  // the threshold and the words both come from the ONE freshness rule (DEC-0301), so the price cache
  // and an account's source chip can never disagree about what "old" means
  const label = agoLabel(fetchedAt, now);
  if (label == null) return { label: 'not updated yet', stale: true };
  return { label, stale: isStale(fetchedAt, now) };
}

/** Fetch many tickers in parallel; returns only the ones that resolved. */
/* ─ MK-XS-F-083 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * fetchPriceSeries
 *
 * Answers ..... Fetch many tickers in parallel; returns only the ones that resolved.
 *
 * Formula .....
 *     unique = array.from(new set(tickers.map((t) => trim().to upper case()).filter(boolean)))
 *     results = await promise.all settled(unique.map((t) => provider.fetch series(t, range)))
 *     out = {}
 *     r = results[i]
 *     the answer = out
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 53 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 35 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-083
 * Changed ..... 2026-06-05 (2db90af)
 */
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
    // every price list leaves here OLDEST FIRST, whatever order a provider sent it in — the one place the order is
    // made true, so no price function has to guess (outside review Claude Performance, 2026-10-12)
    if (r.status === 'fulfilled' && r.value) out[t] = { ...r.value, points: [...r.value.points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) };
  });
  return out;
}
