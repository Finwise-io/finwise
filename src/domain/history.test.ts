// PRD F1#15 — the versioned net-worth history: the writer's structural identity, legacy
// normalization, and the garbage-free sorted reader.
import { makeMonthlySnapshot, normalizeSnapshot, readHistory, SNAPSHOT_VERSION } from './history';

const base = {
  month: '2026-07', gross_assets: 500000, gross_debt: 120000,
  income_net: 8000, spending: 5000, debt_paid: 400, savings: 2600, allocated: 0,
  planned_budget: 5200, savings_rate: 33, by_category: { Groceries: 900 },
  assets: [], debts: [], captured_at: '2026-07-15T12:00:00Z',
};

test('the writer stamps v1 and the identity is STRUCTURAL: net worth IS assets − debt', () => {
  const snap = makeMonthlySnapshot(base);
  expect(snap.v).toBe(SNAPSHOT_VERSION);
  expect(snap.net_worth).toBe(380000);
  // even a caller-passed net_worth cannot break the identity
  const lied = makeMonthlySnapshot({ ...base, net_worth: 999999 } as any);
  expect(lied.net_worth).toBe(380000);
});

test('a LEGACY blob (no version) normalizes with best-effort fields and the derived identity', () => {
  const legacy = { month: '2026-05', net_worth: 350000, income_net: 7500, spending: 4800, by_category: { Rent: 2000 } };
  const n = normalizeSnapshot('2026-05', legacy)!;
  expect(n.v).toBe(1);
  expect(n.net_worth).toBe(350000);
  expect(n.gross_assets).toBe(350000);        // best-effort: assets fall back to net worth
  expect(n.gross_debt).toBe(0);
  expect(n.by_category.Rent).toBe(2000);
});

test('garbage is dropped, never charted: no month, no numbers, junk types → null', () => {
  expect(normalizeSnapshot('nope', { net_worth: 100 })).toBeNull();
  expect(normalizeSnapshot('2026-06', { month: '2026-06' })).toBeNull();        // no derivable net worth
  expect(normalizeSnapshot('2026-06', 'a string')).toBeNull();
  expect(normalizeSnapshot('2026-06', null)).toBeNull();
});

test('readHistory: normalized, garbage-free, sorted by month — mixed legacy and v1', () => {
  const raw = {
    '2026-07': makeMonthlySnapshot(base),
    '2026-04': { month: '2026-04', net_worth: 340000 },       // legacy
    '2026-06': { junk: true },                                 // garbage → dropped
    'bad-key': { net_worth: 1 },                               // no month anywhere → dropped
    '2026-05': { month: '2026-05', net_worth: 350000 },
  };
  const h = readHistory(raw as any);
  expect(h.map((x) => x.month)).toEqual(['2026-04', '2026-05', '2026-07']);
  expect(h.every((x) => x.v === 1)).toBe(true);
});
