// Economic-data service tests — BLS inflation, Treasury yield, and the AI expense analyzer.
// All network mocked via global.fetch; expo-constants mocked (native module).
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

import Constants from 'expo-constants';
import { fetchEconomicData, analyzeExpenses } from './economicData';

const okResponse = (body: any) => ({ ok: true, json: () => Promise.resolve(body) });

// 13 months of CPI, latest first: latest 320, a year ago 310 → YoY ≈ 3.23%
const blsBody = {
  Results: { series: [{ data: Array.from({ length: 14 }, (_, i) => ({ value: String(320 - i * (10 / 12)) })) }] },
};
const treasuryBody = { data: [{ record_date: '2026-05-31', security_desc: 'Treasury Bonds', avg_interest_rate_amt: '4.125' }] };

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
});

describe('fetchEconomicData', () => {
  test('happy path: live BLS inflation + Treasury yield', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('bls.gov')) return Promise.resolve(okResponse(blsBody));
      return Promise.resolve(okResponse(treasuryBody));
    });
    const econ = await fetchEconomicData();
    const latest = 320, yearAgo = 320 - 12 * (10 / 12);
    expect(econ.inflationRate).toBeCloseTo(((latest - yearAgo) / yearAgo) * 100, 2);
    expect(econ.treasuryYield).toBe(4.13);                 // rounded to 2dp
    expect(econ.fetchedAt).toBeTruthy();
  });

  test('BLS failure → inflation falls back to 3.2, treasury stays live', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('bls.gov')) return Promise.reject(new Error('down'));
      return Promise.resolve(okResponse(treasuryBody));
    });
    const econ = await fetchEconomicData();
    expect(econ.inflationRate).toBe(3.2);
    expect(econ.treasuryYield).toBe(4.13);
  });

  test('total outage → both fallbacks, never a rejection', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const econ = await fetchEconomicData();
    expect(econ.inflationRate).toBe(3.2);
    expect(econ.treasuryYield).toBe(4.35);
  });

  test('insufficient BLS history (< 13 months) → fallback', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('bls.gov')) return Promise.resolve(okResponse({ Results: { series: [{ data: [{ value: '320' }] }] } }));
      return Promise.resolve(okResponse(treasuryBody));
    });
    expect((await fetchEconomicData()).inflationRate).toBe(3.2);
  });

  // BUG-LEDGER: B-25 — the result carries no flag marking fallback vs live data, so downstream
  // projections silently run on defaults during an outage and the UI can't label them as estimates.
  test('fallback data is indistinguishable from live data (documenting)', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const econ = await fetchEconomicData();
    expect(Object.keys(econ).sort()).toEqual(['fetchedAt', 'inflationRate', 'treasuryYield']);  // no isFallback flag
  });
});

describe('analyzeExpenses', () => {
  const expenses = [{ category: 'Dining', store: 'Chipotle', amount: 42 }];

  test('throws a clear error when no API key is configured', async () => {
    await expect(analyzeExpenses(expenses, 5000, 3)).rejects.toThrow(/API key not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('parses a fenced-JSON model response', async () => {
    (Constants as any).expoConfig.extra.ANTHROPIC_API_KEY = 'test-key';
    const payload = { summary: 'Looks fine.', tips: [{ title: 'T', detail: 'D', savingsMin: 5, savingsMax: 10 }], totalSavingsMin: 5, totalSavingsMax: 10 };
    fetchMock.mockResolvedValue(okResponse({ content: [{ text: '```json\n' + JSON.stringify(payload) + '\n```' }] }));
    const out = await analyzeExpenses(expenses, 5000, 3);
    expect(out.summary).toBe('Looks fine.');
    expect(out.tips).toHaveLength(1);
    (Constants as any).expoConfig.extra.ANTHROPIC_API_KEY = '';
  });

  test('unparseable model output degrades to the canned fallback advice (never throws)', async () => {
    (Constants as any).expoConfig.extra.ANTHROPIC_API_KEY = 'test-key';
    fetchMock.mockResolvedValue(okResponse({ content: [{ text: 'sorry, I can not do JSON today' }] }));
    const out = await analyzeExpenses(expenses, 5000, 3);
    expect(out.tips.length).toBeGreaterThan(0);
    expect(out.totalSavingsMin).toBeGreaterThanOrEqual(0);
    (Constants as any).expoConfig.extra.ANTHROPIC_API_KEY = '';
  });
});
