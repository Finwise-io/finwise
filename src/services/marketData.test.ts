// Market-data provider tests — every network path mocked via global.fetch.
// The Yahoo chart endpoint shape: { chart: { result: [{ timestamp, indicators: { adjclose, quote } }] } }
import { yahooProvider, fetchPriceSeries, type PriceProvider } from './marketData';

const DAY = 86400;
const T0 = Date.UTC(2026, 0, 5) / 1000;   // 2026-01-05

function yahooJson(opts: { ts?: number[]; adj?: (number | null)[] | null; raw?: (number | null)[] | null; empty?: boolean }) {
  if (opts.empty) return { chart: { result: null, error: { code: 'Not Found' } } };
  return {
    chart: {
      result: [{
        timestamp: opts.ts,
        indicators: {
          ...(opts.adj !== null ? { adjclose: [{ adjclose: opts.adj }] } : {}),
          ...(opts.raw !== null ? { quote: [{ close: opts.raw }] } : {}),
        },
      }],
    },
  };
}

const okResponse = (body: any) => ({ ok: true, json: () => Promise.resolve(body) });

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
});

describe('yahooProvider.fetchSeries — symbol mapping', () => {
  test.each([
    ['BTC', 'BTC-USD'], ['BTCUSD', 'BTC-USD'], ['ETH', 'ETH-USD'], ['ETHUSD', 'ETH-USD'],
    ['aapl ', 'AAPL'], [' spy', 'SPY'],
  ])('%s is requested as %s', async (input, symbol) => {
    fetchMock.mockResolvedValue(okResponse(yahooJson({ ts: [T0], adj: [100], raw: [100] })));
    await yahooProvider.fetchSeries(input);
    expect(fetchMock.mock.calls[0][0]).toContain(`/chart/${encodeURIComponent(symbol)}?`);
  });

  test('empty ticker short-circuits to null without a network call', async () => {
    expect(await yahooProvider.fetchSeries('  ')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('range and interval ride in the URL', async () => {
    fetchMock.mockResolvedValue(okResponse(yahooJson({ ts: [T0], adj: [100], raw: [100] })));
    await yahooProvider.fetchSeries('SPY', '1y');
    expect(fetchMock.mock.calls[0][0]).toContain('range=1y&interval=1d');
  });
});

describe('yahooProvider.fetchSeries — parsing', () => {
  test('prefers the dividend/split-adjusted close over the raw close', async () => {
    fetchMock.mockResolvedValue(okResponse(yahooJson({ ts: [T0, T0 + DAY], adj: [98, 99], raw: [100, 101] })));
    const s = await yahooProvider.fetchSeries('SPY');
    expect(s!.points.map((p) => p.close)).toEqual([98, 99]);
  });

  test('falls back to raw close when adjclose is all nulls', async () => {
    fetchMock.mockResolvedValue(okResponse(yahooJson({ ts: [T0, T0 + DAY], adj: [null, null], raw: [100, 101] })));
    const s = await yahooProvider.fetchSeries('SPY');
    expect(s!.points.map((p) => p.close)).toEqual([100, 101]);
  });

  test('holiday nulls are filtered out, dates are YYYY-MM-DD', async () => {
    fetchMock.mockResolvedValue(okResponse(yahooJson({ ts: [T0, T0 + DAY, T0 + 2 * DAY], adj: [100, null, 102], raw: [100, null, 102] })));
    const s = await yahooProvider.fetchSeries('SPY');
    expect(s!.points).toEqual([
      { date: '2026-01-05', close: 100 },
      { date: '2026-01-07', close: 102 },
    ]);
  });

  test('returned ticker is the trimmed/uppercased INPUT ticker (cache key), not the Yahoo symbol', async () => {
    fetchMock.mockResolvedValue(okResponse(yahooJson({ ts: [T0], adj: [50000], raw: [50000] })));
    const s = await yahooProvider.fetchSeries(' btc ');
    expect(s!.ticker).toBe('BTC');
  });
});

describe('yahooProvider.fetchSeries — failure paths (all collapse to null)', () => {
  test('HTTP error → null', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 });
    expect(await yahooProvider.fetchSeries('SPY')).toBeNull();
  });

  test('network throw (offline) → null', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    expect(await yahooProvider.fetchSeries('SPY')).toBeNull();
  });

  test('malformed JSON → null', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.reject(new Error('bad json')) });
    expect(await yahooProvider.fetchSeries('SPY')).toBeNull();
  });

  test('unknown ticker (Yahoo error shape) → null', async () => {
    fetchMock.mockResolvedValue(okResponse(yahooJson({ empty: true })));
    expect(await yahooProvider.fetchSeries('ZZZZZZ')).toBeNull();
  });

  test('all-null closes (no usable points) → null', async () => {
    fetchMock.mockResolvedValue(okResponse(yahooJson({ ts: [T0], adj: [null], raw: [null] })));
    expect(await yahooProvider.fetchSeries('SPY')).toBeNull();
  });

  // BUG-LEDGER: B-18 — callers get the SAME null for "offline" and "ticker doesn't exist", so the
  // UI can't tell "retry later" from "fix your ticker", and silently shows stale cached prices.
  test('offline and invalid-ticker are indistinguishable to callers (documenting)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const offline = await yahooProvider.fetchSeries('SPY');
    fetchMock.mockResolvedValueOnce(okResponse(yahooJson({ empty: true })));
    const badTicker = await yahooProvider.fetchSeries('ZZZZZZ');
    expect(offline).toBe(badTicker);   // both null — no signal for the UI to differentiate
  });
});

describe('fetchPriceSeries — batch behavior', () => {
  const providerOf = (impl: (t: string) => Promise<any>): PriceProvider => ({ fetchSeries: jest.fn(impl) });

  test('dedupes and normalizes tickers before fetching', async () => {
    const provider = providerOf((t) => Promise.resolve({ ticker: t, points: [{ date: '2026-01-05', close: 1 }] }));
    const out = await fetchPriceSeries(['spy', 'SPY ', ' spy', 'AAPL', ''], provider);
    expect((provider.fetchSeries as jest.Mock).mock.calls.map((c) => c[0])).toEqual(['SPY', 'AAPL']);
    expect(Object.keys(out).sort()).toEqual(['AAPL', 'SPY']);
  });

  test('failed and null tickers are simply omitted (partial results survive)', async () => {
    const provider = providerOf((t) => {
      if (t === 'BAD') return Promise.resolve(null);
      if (t === 'BOOM') return Promise.reject(new Error('x'));
      return Promise.resolve({ ticker: t, points: [{ date: '2026-01-05', close: 1 }] });
    });
    const out = await fetchPriceSeries(['SPY', 'BAD', 'BOOM'], provider);
    expect(Object.keys(out)).toEqual(['SPY']);
  });
});
