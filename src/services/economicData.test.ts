// Economic-data service tests — BLS inflation, Treasury yield, and the AI expense analyzer.
// All network mocked via global.fetch; expo-constants mocked (native module).
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

import Constants from 'expo-constants';
import { fetchEconomicData, analyzeExpenses } from './economicData';

const okResponse = (body: any) => ({ ok: true, json: () => Promise.resolve(body) });
const csvResponse = (text: string) => ({ ok: true, text: () => Promise.resolve(text) });

// 13 months of CPI, latest first: latest 320, a year ago 310 → YoY ≈ 3.23%
const blsBody = {
  Results: { series: [{ data: Array.from({ length: 14 }, (_, i) => ({ value: String(320 - i * (10 / 12)) })) }] },
};
// TEN-YEAR TREASURY, 2026-08-14: the old Fiscal Data endpoint returns 404 for every request now —
// the whole dataset, not just our filter — so the live fetch had been failing silently and serving
// the 4.35% fallback while the real ten-year sat at 4.63%. It was also the wrong number when it did
// work: an average coupon across outstanding long bonds, not today's market yield. Now the Federal
// Reserve's own DGS10 series over FRED's CSV endpoint, which needs no key.
// Non-trading days are written as a lone ".", which is why the parser walks backwards.
const treasuryBody = ['DATE,DGS10', '2026-08-11,4.70', '2026-08-12,4.68', '2026-08-13,4.63', '2026-08-14,.'].join('\n');

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
});

describe('fetchEconomicData', () => {
  test('happy path: live BLS inflation + Treasury yield', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('bls.gov')) return Promise.resolve(okResponse(blsBody));
      return Promise.resolve(csvResponse(treasuryBody));
    });
    const econ = await fetchEconomicData();
    const latest = 320, yearAgo = 320 - 12 * (10 / 12);
    expect(econ.inflationRate).toBeCloseTo(((latest - yearAgo) / yearAgo) * 100, 2);
    expect(econ.treasuryYield).toBe(4.63);                 // the last REAL reading, not the '.' row
    expect(econ.fetchedAt).toBeTruthy();
  });

  test('BLS failure → inflation falls back to 3.2, treasury stays live', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('bls.gov')) return Promise.reject(new Error('down'));
      return Promise.resolve(csvResponse(treasuryBody));
    });
    const econ = await fetchEconomicData();
    expect(econ.inflationRate).toBe(3.2);
    expect(econ.treasuryYield).toBe(4.63);
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
      return Promise.resolve(csvResponse(treasuryBody));
    });
    expect((await fetchEconomicData()).inflationRate).toBe(3.2);
  });

  // BUG-LEDGER: B-25 (fixed) — fallback values now carry per-source flags so the UI can label them.
  test('fallback values are flagged; live values are not', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const down = await fetchEconomicData();
    expect(down.inflationIsFallback).toBe(true);
    expect(down.treasuryIsFallback).toBe(true);

    fetchMock.mockImplementation((url: string) =>
      String(url).includes('bls.gov') ? Promise.resolve(okResponse(blsBody)) : Promise.resolve(csvResponse(treasuryBody)));
    const live = await fetchEconomicData();
    expect(live.inflationIsFallback).toBe(false);
    expect(live.treasuryIsFallback).toBe(false);
  });

  test('a partial outage flags only the failed source', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes('bls.gov') ? Promise.reject(new Error('down')) : Promise.resolve(csvResponse(treasuryBody)));
    const econ = await fetchEconomicData();
    expect(econ.inflationIsFallback).toBe(true);
    expect(econ.treasuryIsFallback).toBe(false);
  });
});

// F-1: analyzeExpenses now calls a server-side proxy (AI_PROXY_URL) that holds the provider key —
// no Anthropic key is ever read on the client. These tests assert the proxy contract.
describe('analyzeExpenses (server-side proxy)', () => {
  const expenses = [{ category: 'Dining', store: 'Chipotle', amount: 42 }];
  afterEach(() => { (Constants as any).expoConfig.extra.AI_PROXY_URL = ''; });

  test('throws a clear error when no proxy URL is configured (and never calls out)', async () => {
    await expect(analyzeExpenses(expenses, 5000, 3)).rejects.toThrow(/AI tips need a server/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('never reads a privileged provider key from the bundle', async () => {
    (Constants as any).expoConfig.extra.ANTHROPIC_API_KEY = 'leaked-key-should-be-ignored';
    (Constants as any).expoConfig.extra.AI_PROXY_URL = 'https://proxy.test/ai';
    const payload = { summary: 'ok', tips: [{ title: 'T', detail: 'D', savingsMin: 5, savingsMax: 10 }], totalSavingsMin: 5, totalSavingsMax: 10 };
    fetchMock.mockResolvedValue(okResponse(payload));
    await analyzeExpenses(expenses, 5000, 3);
    // It hit the proxy URL, not the provider, and sent no api-key header / leaked key.
    expect(fetchMock).toHaveBeenCalledWith('https://proxy.test/ai', expect.objectContaining({ method: 'POST' }));
    const [, opts] = fetchMock.mock.calls[0];
    expect(JSON.stringify(opts.headers)).not.toMatch(/x-api-key|leaked-key/i);
    expect(opts.body).not.toMatch(/leaked-key/);
    delete (Constants as any).expoConfig.extra.ANTHROPIC_API_KEY;
  });

  test('returns the proxy-parsed analysis directly', async () => {
    (Constants as any).expoConfig.extra.AI_PROXY_URL = 'https://proxy.test/ai';
    const payload = { summary: 'Looks fine.', tips: [{ title: 'T', detail: 'D', savingsMin: 5, savingsMax: 10 }], totalSavingsMin: 5, totalSavingsMax: 10 };
    fetchMock.mockResolvedValue(okResponse(payload));
    const out = await analyzeExpenses(expenses, 5000, 3);
    expect(out.summary).toBe('Looks fine.');
    expect(out.tips).toHaveLength(1);
  });

  test('a malformed proxy response degrades to canned fallback advice (never throws)', async () => {
    (Constants as any).expoConfig.extra.AI_PROXY_URL = 'https://proxy.test/ai';
    fetchMock.mockResolvedValue(okResponse({ nonsense: true }));
    const out = await analyzeExpenses(expenses, 5000, 3);
    expect(out.tips.length).toBeGreaterThan(0);
    expect(out.totalSavingsMin).toBeGreaterThanOrEqual(0);
  });

  test('a non-OK proxy response throws (caller shows local tips)', async () => {
    (Constants as any).expoConfig.extra.AI_PROXY_URL = 'https://proxy.test/ai';
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: () => Promise.resolve({}) });
    await expect(analyzeExpenses(expenses, 5000, 3)).rejects.toThrow(/AI proxy error/);
  });
});


// ── the ten-year yield feed, after the 2026-08-14 source swap ────────────────────────────────────
// This number is about to carry weight: the mortgage decision compares a person's mortgage rate
// against it, so a wrong or stale yield sends someone the wrong way on a six-figure choice.
describe('ten-year Treasury yield', () => {
  const bls = (url: string) => String(url).includes('bls.gov');

  test('it reads the Federal Reserve ten-year series, not the dead Fiscal Data endpoint', async () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'economicData.ts'), 'utf8');
    expect(src).toContain('fredgraph.csv?id=DGS10');
    expect(src).not.toContain('avg_interest_rates');      // the endpoint that 404s
  });

  test('a closed-market day at the end of the file does not become the yield', async () => {
    fetchMock.mockImplementation((url: string) => bls(url)
      ? Promise.reject(new Error('down'))
      : Promise.resolve(csvResponse('DATE,DGS10\n2026-08-13,4.63\n2026-08-14,.\n2026-08-15,.')));
    const econ = await fetchEconomicData();
    expect(econ.treasuryYield).toBe(4.63);
    expect(econ.treasuryIsFallback).toBe(false);
  });

  test('a feed that changed shape falls back and SAYS it fell back — never a nonsense rate', async () => {
    fetchMock.mockImplementation((url: string) => bls(url)
      ? Promise.reject(new Error('down'))
      : Promise.resolve(csvResponse('DATE,DGS10\n2026-08-13,463')));   // 463%, i.e. the units moved
    const econ = await fetchEconomicData();
    expect(econ.treasuryYield).toBe(4.35);
    expect(econ.treasuryIsFallback).toBe(true);
  });

  test('nothing but closed days → fallback, flagged, never a crash', async () => {
    fetchMock.mockImplementation((url: string) => bls(url)
      ? Promise.reject(new Error('down'))
      : Promise.resolve(csvResponse('DATE,DGS10\n2026-08-13,.\n2026-08-14,.')));
    const econ = await fetchEconomicData();
    expect(econ.treasuryYield).toBe(4.35);
    expect(econ.treasuryIsFallback).toBe(true);
  });
});
