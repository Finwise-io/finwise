/**
 * Live-price pipeline in the store: refreshPrices / maybeRefreshPrices / recomputeBalances.
 * Network is mocked at the marketData seam; balances must stay an honest cache of
 * cash sleeve + Σ(position × latest price).
 */

const _storage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem:    jest.fn((k: string) => Promise.resolve(_storage[k] ?? null)),
    setItem:    jest.fn((k: string, v: string) => { _storage[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete _storage[k]; return Promise.resolve(); }),
    clear:      jest.fn(() => { Object.keys(_storage).forEach(k => delete _storage[k]); return Promise.resolve(); }),
    getAllKeys:  jest.fn(() => Promise.resolve(Object.keys(_storage))),
    multiGet:   jest.fn((keys: string[]) => Promise.resolve(keys.map(k => [k, _storage[k] ?? null]))),
    multiSet:   jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { _storage[k] = v; }); return Promise.resolve(); }),
  },
}));

jest.mock('../services/marketData', () => ({
  __esModule: true,
  fetchPriceSeries: jest.fn(),
}));

import { useStore } from '../store/useStore';
import { fetchPriceSeries } from '../services/marketData';

const fetchMock = fetchPriceSeries as jest.Mock;

const series = (ticker: string, closes: number[]) => ({
  ticker,
  points: closes.map((close, i) => ({ date: `2026-06-${String(i + 1).padStart(2, '0')}`, close })),
});

const brokerage = (over: Record<string, any> = {}) => ({
  label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE' as const, balance: 0, target_return: 0.07,
  cash_balance: 1000,
  positions: [{ position_id: 'p1', ticker: 'VOO', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 300, purchase_date: '2025-01-02' }] }],
  ...over,
});

beforeEach(() => {
  useStore.getState().resetAll();
  fetchMock.mockReset();
});

describe('refreshPrices', () => {
  test('no positions anywhere → no network call at all', async () => {
    useStore.getState().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 5000, target_return: 0.02 });
    await useStore.getState().refreshPrices();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('fetches each held ticker plus its benchmark, merges the cache, stamps pricesFetchedAt', async () => {
    useStore.getState().addAsset(brokerage());
    fetchMock.mockResolvedValue({ VOO: series('VOO', [400, 410]), SPY: series('SPY', [500, 505]) });

    await useStore.getState().refreshPrices();

    const requested: string[] = fetchMock.mock.calls[0][0];
    expect(requested).toContain('VOO');
    expect(requested).toContain('SPY');                       // the stocks_etf benchmark rides along
    const st = useStore.getState();
    expect(st.priceCache.VOO.points.at(-1)!.close).toBe(410);
    expect(st.pricesFetchedAt).toBeTruthy();
  });

  test('balance becomes cash sleeve + shares × latest close', async () => {
    useStore.getState().addAsset(brokerage());
    fetchMock.mockResolvedValue({ VOO: series('VOO', [400, 410]) });

    await useStore.getState().refreshPrices();

    const acct = useStore.getState().assetAccounts.find((a) => a.label === 'Brokerage')!;
    expect(acct.balance).toBe(1000 + 10 * 410);
  });

  test('a manual account (no positions, no cash sleeve) is never recomputed', async () => {
    useStore.getState().addAsset({ label: 'House', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000, target_return: 0.03 });
    useStore.getState().addAsset(brokerage());
    fetchMock.mockResolvedValue({ VOO: series('VOO', [410]) });

    await useStore.getState().refreshPrices();

    expect(useStore.getState().assetAccounts.find((a) => a.label === 'House')!.balance).toBe(500000);
  });

  test('offline (empty fetch result) → cache and timestamp untouched, balances keep last values', async () => {
    useStore.getState().addAsset(brokerage());
    fetchMock.mockResolvedValue({ VOO: series('VOO', [400]) });
    await useStore.getState().refreshPrices();
    const before = useStore.getState();

    fetchMock.mockResolvedValue({});                          // everything failed upstream
    await useStore.getState().refreshPrices();

    const after = useStore.getState();
    expect(after.priceCache).toEqual(before.priceCache);
    expect(after.pricesFetchedAt).toBe(before.pricesFetchedAt);
    expect(after.assetAccounts.find((a) => a.label === 'Brokerage')!.balance).toBe(1000 + 10 * 400);
  });

  test('position tickers are matched case/whitespace-insensitively against the cache', async () => {
    useStore.getState().addAsset(brokerage({
      positions: [{ position_id: 'p1', ticker: ' voo ', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 2, cost_per_share: 300, purchase_date: '2025-01-02' }] }],
    }));
    fetchMock.mockResolvedValue({ VOO: series('VOO', [410]) });

    await useStore.getState().refreshPrices();

    expect(useStore.getState().assetAccounts.find((a) => a.label === 'Brokerage')!.balance).toBe(1000 + 2 * 410);
  });

  // BUG-LEDGER: B-19 — a held ticker missing from the cache contributes $0 to the account balance:
  // net worth silently understates instead of falling back to cost basis or flagging the row.
  test('a position whose price is missing contributes $0 (documenting the silent understatement)', async () => {
    useStore.getState().addAsset(brokerage({
      positions: [
        { position_id: 'p1', ticker: 'VOO', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 300, purchase_date: '2025-01-02' }] },
        { position_id: 'p2', ticker: 'MYSTERY', kind: 'stocks_etf', lots: [{ lot_id: 'l2', shares: 5, cost_per_share: 100, purchase_date: '2025-01-02' }] },
      ],
    }));
    fetchMock.mockResolvedValue({ VOO: series('VOO', [410]) });   // MYSTERY never resolves

    await useStore.getState().refreshPrices();

    const acct = useStore.getState().assetAccounts.find((a) => a.label === 'Brokerage')!;
    expect(acct.balance).toBe(1000 + 10 * 410 + 0);           // the $500-cost MYSTERY position counts as $0
  });
});

describe('maybeRefreshPrices — the 10-minute throttle', () => {
  test('skips when prices were fetched within 10 minutes', async () => {
    useStore.getState().addAsset(brokerage());
    useStore.setState({ pricesFetchedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() });
    await useStore.getState().maybeRefreshPrices();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('refreshes when the last fetch is older than 10 minutes', async () => {
    useStore.getState().addAsset(brokerage());
    useStore.setState({ pricesFetchedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString() });
    fetchMock.mockResolvedValue({ VOO: series('VOO', [410]) });
    await useStore.getState().maybeRefreshPrices();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('never fetches when no account holds positions (even if stale)', async () => {
    useStore.getState().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 5000, target_return: 0.02 });
    useStore.setState({ pricesFetchedAt: null });
    await useStore.getState().maybeRefreshPrices();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
