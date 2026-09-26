/**
 * The store's rebuild pass (founder approved 2026-09-25: "Yes rebuild - day one history").
 * A LINKED account's past is rebuilt from its own transactions and the daily closes we hold, so the
 * beginning value a window shows is READ rather than back-solved. A hand-entered account is left
 * exactly where it is: it has no ledger, so its past is unknown and stays unknown.
 */
const _storage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => Promise.resolve(_storage[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { _storage[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete _storage[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { Object.keys(_storage).forEach((k) => delete _storage[k]); return Promise.resolve(); }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(_storage))),
    multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((k) => [k, _storage[k] ?? null]))),
    multiSet: jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { _storage[k] = v; }); return Promise.resolve(); }),
  },
}));

import { useStore } from '../store/useStore';
import { valueOn } from '../../Calculation Module code/engines/snapshots';
import { isoLocalDate } from '../domain/_shared/dates';

const day = (back: number) => isoLocalDate(new Date(Date.now() - back * 86_400_000));
const closes = (price: number) => ({
  ticker: 'VTI',
  points: Array.from({ length: 40 }, (_, i) => ({ date: day(39 - i), close: price })),
});

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({
    assetAccounts: [
      { asset_id: 'et', label: 'E*TRADE Account 1', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE',
        source: 'connected', balance: 10_000, cash_balance: 0,
        positions: [{ position_id: 'p1', ticker: 'VTI', kind: 'stocks_etf', last_price: 100,
          lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: day(30) }] }] },
      { asset_id: 'byhand', label: 'Old 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', source: 'manual', balance: 50_000 },
    ],
    transactions: [
      { id: 't1', account_id: 'et', type: 'BUY', ticker: 'VTI', shares: 40, price: 100, date: day(10), created_at: '' },
      { id: 't2', account_id: 'et', type: 'DEPOSIT', amount: 4_000, date: day(20), created_at: '' },
      { id: 't3', account_id: 'byhand', type: 'DEPOSIT', amount: 1_000, date: day(20), created_at: '' },
    ],
    priceCache: { VTI: closes(100) },
  } as any);
});

test('a linked account gets its past back, priced day by day from its own records', () => {
  (useStore.getState() as any).rebuildLinkedHistory();
  const s = useStore.getState() as any;
  const days = s.snapshotDays ?? [];
  expect(days.length).toBeGreaterThan(0);
  // before the purchase it held 60 shares, and the $4,000 it spent was still cash
  const before = valueOn(days, new Set(['et']), day(11));
  expect(before).toBe(60 * 100 + 4_000);
  // after it, 100 shares and no cash — the same $10,000 it is worth today
  expect(valueOn(days, new Set(['et']), day(5))).toBe(10_000);
  // the line starts at the first record it gave us, and says so
  expect(s.rebuiltFrom.et).toBe(day(20));
});

test('a hand-entered account is not rebuilt — its past is unknown and stays unknown', () => {
  (useStore.getState() as any).rebuildLinkedHistory();
  const s = useStore.getState() as any;
  expect(s.rebuiltFrom.byhand).toBeUndefined();
  expect(valueOn(s.snapshotDays ?? [], new Set(['byhand']), day(11))).toBeNull();
});

test('every rebuilt day is marked a reconstruction, and an observed day is never overwritten', () => {
  const today = isoLocalDate(new Date());
  (useStore.getState() as any).captureDailyNw(today, 60_000, 10_000);   // today, observed
  (useStore.getState() as any).rebuildLinkedHistory();
  const days = ((useStore.getState() as any).snapshotDays ?? []) as any[];
  expect(days.find((d) => d.date === today)?.origin).toBe('observed');
  expect(days.filter((d) => d.date !== today).every((d) => d.origin === 'reconstructed')).toBe(true);
});

test('with no prices for a day, that day is left empty rather than invented', () => {
  useStore.setState({ priceCache: {} } as any);
  (useStore.getState() as any).rebuildLinkedHistory();
  const s = useStore.getState() as any;
  expect(s.snapshotDays ?? []).toHaveLength(0);
  expect(s.rebuiltAt).not.toBeNull();     // the pass ran; it simply had nothing it could price
});
