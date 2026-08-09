// PRD F1#15 — the versioned net-worth history: the writer's structural identity, legacy
// normalization, and the garbage-free sorted reader.
import { makeMonthlySnapshot, normalizeSnapshot, readHistory, SNAPSHOT_VERSION, investableChangePct } from './history';

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

// FOUNDER RULE 2026-08-04: the NW change % is measured on cash + investments (property values
// move only when retyped — a total-NW percent is noise). Never back-guessed: null until history.
describe('investableChangePct — % on cash + investments only', () => {
  const inv = { '2026-08-02': 361242, '2026-08-03': 362000 };
  test('percent = investable move ÷ the baseline invDaily point at/after the since date', () => {
    expect(investableChangePct(inv, 363152, '2026-08-02')).toBeCloseTo(0.5, 5);   // (363152−361242)/361242
  });
  test('daily baseline resolves against a MONTHLY since key too', () => {
    expect(investableChangePct(inv, 363152, '2026-08')).toBeCloseTo(0.5, 5);
  });
  test('no invDaily history yet → null (the percent is never invented)', () => {
    expect(investableChangePct({}, 363152, '2026-08-02')).toBeNull();
    expect(investableChangePct(null, 363152, '2026-08-02')).toBeNull();
    expect(investableChangePct(inv, 363152, null)).toBeNull();
  });
  test('a zero/garbage baseline refuses the percent', () => {
    expect(investableChangePct({ '2026-08-02': 0 }, 363152, '2026-08-02')).toBeNull();
    expect(investableChangePct({ '2026-08-02': 'x' as any }, 363152, '2026-08-02')).toBeNull();
  });
});

// THE CHANGE WALK (founder structure, 2026-08-04): rows always sum to the ending value.
describe('buildChangeWalk', () => {
  const { buildChangeWalk } = require('./history');
  test('the founder mock reconciles exactly', () => {
    const w = buildChangeWalk({ beginning: 393042, ending: 395152, fromLabel: 'Aug 3', toLabel: 'Aug 4',
      contributions: 500, withdrawals: 500, dividends: 1220, interest: 430, debtPrincipal: 200 });
    expect(w.wealthGenerated).toBe(1910);
    expect(w.marketChange).toBe(260);                                    // the residual, never a guess
    expect(w.beginning + w.contributions - w.withdrawals + w.wealthGenerated + w.debtPrincipal).toBe(w.ending);
  });
  test('with no ledger detail the whole move sits in change-in-value — still sums', () => {
    const w = buildChangeWalk({ beginning: 100000, ending: 101500, fromLabel: 'Jul 1', toLabel: 'Aug 1' });
    expect(w.wealthGenerated).toBe(1500);
    expect(w.dividends + w.interest).toBe(0);
    expect(w.marketChange).toBe(1500);
    expect(w.beginning + w.wealthGenerated).toBe(w.ending);
  });
  test('a fall reconciles too (negative wealth generated)', () => {
    const w = buildChangeWalk({ beginning: 100000, ending: 98000, fromLabel: 'Jul 1', toLabel: 'Aug 1', contributions: 1000 });
    expect(w.wealthGenerated).toBe(-3000);
    expect(w.beginning + w.contributions + w.wealthGenerated).toBe(w.ending);
  });
});
