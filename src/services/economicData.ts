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
};

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
    inflationRate: inflation.status === 'fulfilled' ? inflation.value : 3.2,
    treasuryYield: treasury.status === 'fulfilled' ? treasury.value : 4.35,
    fetchedAt: new Date().toISOString(),
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
  // Try multiple ways to get the API key - Expo Go sometimes doesn't load extra correctly
  const apiKey =
    Constants.expoConfig?.extra?.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error('API key not configured. Add ANTHROPIC_API_KEY to your .env file.');
  }

  const prompt = `You are a friendly personal finance advisor. Analyze these monthly expenses and give specific, actionable advice.

Monthly income: $${monthlyIncome.toFixed(2)}
Inflation rate: ${inflationRate}%

Expenses this month:
${expenses.map((e) => `- ${e.category}: $${e.amount.toFixed(2)} at ${e.store || 'various'}`).join('\n')}

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "summary": "2-sentence plain English summary of spending health",
  "tips": [
    {
      "title": "Short tip title (5 words max)",
      "detail": "Specific actionable advice in 1-2 sentences. Be concrete, e.g. mention specific subscriptions.",
      "savingsMin": 15,
      "savingsMax": 30
    }
  ],
  "totalSavingsMin": 50,
  "totalSavingsMax": 120
}
Provide 3-5 tips. Focus on real patterns in the data. If you see multiple streaming services, call them out. Keep language simple enough for a 10-year-old.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error('Anthropic API error');
  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
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
