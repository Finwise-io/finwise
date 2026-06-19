/**
 * Fetches live inflation and treasury yield from free public APIs.
 *
 * Inflation: U.S. Bureau of Labor Statistics (BLS) public data API
 *   Series CUUR0000SA0 = CPI All Urban Consumers
 *
 * Treasury Yield: U.S. Treasury Fiscal Data API (no key required)
 *   https://fiscaldata.treasury.gov/api/public/
 */

export type EconomicData = {
  inflationRate: number;   // % YoY
  treasuryYield: number;   // 10-year yield %
  fetchedAt: string;
  // B-25: flag when a value is a typical-rate fallback (live fetch failed) so the UI can label it
  // as an estimate instead of presenting defaults as live data.
  inflationIsFallback: boolean;
  treasuryIsFallback: boolean;
};

// Typical-rate fallbacks used when the live source is unreachable.
export const FALLBACK_INFLATION = 3.2;
export const FALLBACK_TREASURY = 4.35;

// BLS public API — no key required for basic use
const BLS_CPI_SERIES = 'CUUR0000SA0';
const BLS_API = 'https://api.bls.gov/publicAPI/v1/timeseries/data/';

// Treasury Fiscal Data API — completely free, no key
const TREASURY_API =
  'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates?' +
  'fields=record_date,security_desc,avg_interest_rate_amt' +
  '&filter=security_desc:eq:Treasury%20Bonds,Marketable' +
  '&sort=-record_date&page[size]=1';

export async function fetchEconomicData(): Promise<EconomicData> {
  const [inflation, treasury] = await Promise.allSettled([
    fetchInflation(),
    fetchTreasuryYield(),
  ]);

  return {
    inflationRate: inflation.status === 'fulfilled' ? inflation.value : FALLBACK_INFLATION,
    treasuryYield: treasury.status === 'fulfilled' ? treasury.value : FALLBACK_TREASURY,
    fetchedAt: new Date().toISOString(),
    inflationIsFallback: inflation.status !== 'fulfilled',
    treasuryIsFallback: treasury.status !== 'fulfilled',
  };
}

async function fetchInflation(): Promise<number> {
  // BLS returns last 3 years of monthly CPI data
  const res = await fetch(BLS_API + BLS_CPI_SERIES);
  if (!res.ok) throw new Error('BLS API error');
  const json = await res.json();

  const series = json?.Results?.series?.[0]?.data;
  if (!series || series.length < 13) throw new Error('Insufficient BLS data');

  // YoY inflation = ((latest - 12moAgo) / 12moAgo) * 100
  const latest = parseFloat(series[0].value);
  const yearAgo = parseFloat(series[12].value);
  const rate = ((latest - yearAgo) / yearAgo) * 100;
  return Math.round(rate * 100) / 100;
}

async function fetchTreasuryYield(): Promise<number> {
  const res = await fetch(TREASURY_API);
  if (!res.ok) throw new Error('Treasury API error');
  const json = await res.json();

  const rate = json?.data?.[0]?.avg_interest_rate_amt;
  if (!rate) throw new Error('No treasury data');
  return Math.round(parseFloat(rate) * 100) / 100;
}

// ── AI expense analysis via Anthropic ────────────────────────────────
import Constants from 'expo-constants';

export type ExpenseAnalysis = {
  summary: string;
  tips: Array<{ title: string; detail: string; savingsMin: number; savingsMax: number }>;
  totalSavingsMin: number;
  totalSavingsMax: number;
};

export async function analyzeExpenses(
  expenses: Array<{ category: string; store: string; amount: number }>,
  monthlyIncome: number,
  inflationRate: number
): Promise<ExpenseAnalysis> {
  // F-1 (QA-2026-06-18): call OUR server-side proxy, which holds the Anthropic key and owns the
  // prompt/model. The client never sees the key and never calls api.anthropic.com directly, so no
  // privileged credential ships in the app bundle. Reference proxy: functions/ (Firebase Function).
  const proxyUrl =
    (Constants.expoConfig?.extra as any)?.AI_PROXY_URL ||
    process.env.AI_PROXY_URL ||
    '';

  if (!proxyUrl) {
    throw new Error('AI tips need a server. Set AI_PROXY_URL to your deployed proxy (see functions/README.md).');
  }

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Send only the data; the proxy builds the prompt and calls the model server-side.
    body: JSON.stringify({ expenses, monthlyIncome, inflationRate }),
  });

  if (!res.ok) throw new Error(`AI proxy error (${res.status})`);
  const data = await res.json();

  // The proxy returns the parsed ExpenseAnalysis. Validate the shape; degrade to canned advice if malformed.
  if (data && typeof data.summary === 'string' && Array.isArray(data.tips)) {
    return data as ExpenseAnalysis;
  }
  return {
    summary: 'We analyzed your expenses and found some ways to save.',
    tips: [
      {
        title: 'Review subscriptions',
        detail: 'Look for any streaming or app subscriptions you rarely use.',
        savingsMin: 10,
        savingsMax: 30,
      },
    ],
    totalSavingsMin: 10,
    totalSavingsMax: 30,
  };
}

// ── Receipt OCR simulation ───────────────────────────────────────────
// In production, integrate Google Vision API or AWS Textract.
// This stub returns realistic parsed data for prototyping.
export async function parseReceipt(_imageUri: string): Promise<{
  store: string;
  amount: number;
  date: string;
  category: string;
  items: string[];
} | null> {
  // TODO: replace with real OCR call
  // Example with Google Vision:
  // const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
  // const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_KEY}`, {
  //   method: 'POST',
  //   body: JSON.stringify({ requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION' }] }] })
  // });
  // Then parse the text response with regex patterns for totals, store names, dates.

  await new Promise((r) => setTimeout(r, 1500)); // simulate processing
  return null; // Return null to fall back to manual entry
}
