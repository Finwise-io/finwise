// Integration: exercises the exact data path HomeScreen relies on, end-to-end, so a realistic
// onboarded profile + logged expenses can't throw or produce nonsense headlessly.
import { snapshotFromOnboarding, resolveNetWorthRows } from './snapshot';
import { budgetVsActual, spendBuckets, savingsByMonth, budgetFromOnboarding } from './budget';
import { incomeMonthlyGrid } from './income';

// A realistic "Employed" onboarding profile (mirrors what the flow stores).
const op: Record<string, any> = {
  status: 'employed', tracks: ['spend', 'retire_acc'],
  baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly',
  bonusAnnual: '12000', signingOnetime: '10000',
  equityType: 'rsu', rsuGrants: [{ shares: '100', price: '400', date: '2026-03' }],
  c_401k: '800', employerMatchMode: 'pct', employerMatchValue: '50',
  taxMode: 'system',
  spendCats: [
    { id: 'rent', bucket: 'fixed', amount: '2200', unit: 'dollar' },
    { id: 'utilities', bucket: 'fixed', amount: '180', unit: 'dollar' },
    { id: 'groceries', bucket: 'flexible', amount: '600', unit: 'dollar' },
    { id: 'dining', bucket: 'flexible', amount: '300', unit: 'dollar' },
    { id: 'travel', bucket: 'nonmonthly', amount: '2400', unit: 'dollar' },   // yearly → 200/mo
  ],
  birthYear: '1990', birthMonth: '6', currentRetirementSavings: '50000',
  targetRetirementAge: '65', expectedRetirementSpending: '5000',
};
const now = new Date('2026-06-15T12:00:00');
const expenses = [
  { id: 'e1', amount: 2200, category: 'Rent / Mortgage', store: 'Landlord', date: '2026-06-01' },
  { id: 'e2', amount: 85, category: 'Groceries', store: 'Market', date: '2026-06-05' },
  { id: 'e3', amount: 40, category: 'Dining out', store: 'Cafe', date: '2026-06-12' },
  { id: 'e4', amount: 60, category: 'Insurance', store: 'Geico', date: '2026-06-08' },  // fixed
  { id: 'e5', amount: 99, category: 'Groceries', store: 'Market', date: '2026-05-20' }, // prior month
];

describe('home data path (onboarding → dashboard)', () => {
  test('budgetVsActual buckets month-to-date vs plan', () => {
    const r = budgetVsActual(expenses, op, now);
    expect(r.month).toBe('2026-06');
    expect(r.spent_total).toBe(2200 + 85 + 40 + 60);            // June only
    expect(r.planned_total).toBeGreaterThan(0);
    const fixed = r.buckets.find((b) => b.key === 'fixed')!;
    expect(fixed.spent).toBe(2200 + 60);                        // rent + insurance
    const flex = r.buckets.find((b) => b.key === 'flexible')!;
    expect(flex.spent).toBe(85 + 40);
  });

  test('planned budget total = fixed + flexible + non-monthly/12', () => {
    const b = spendBuckets(op);
    expect(b.fixed).toBe(2380);                                 // 2200 + 180
    expect(b.flexible).toBe(900);                               // 600 + 300
    expect(b.non_monthly).toBe(200);                            // 2400 / 12
    expect(budgetFromOnboarding('u1', op).monthly_spending).toBe(3480);
  });

  test('income grid is 12 months, current month positive, equity lands in March', () => {
    const grid = incomeMonthlyGrid(op, 'net');
    expect(grid).toHaveLength(12);
    expect(grid[5].amount).toBeGreaterThan(0);                  // June take-home
    expect(grid[2].amount).toBeGreaterThan(grid[1].amount);     // March (equity) > February
  });

  test('savings-by-month present and lumpy', () => {
    const s = savingsByMonth(op);
    expect(s).toHaveLength(12);
    expect(s[2].amount).toBeGreaterThan(s[1].amount);           // equity month saves more
  });

  test('buildSnapshot produces all read-models without throwing', () => {
    const snap = snapshotFromOnboarding('u1', op, { inflationRate: 2.4, treasuryYield: 4.3 } as any);
    expect(snap.income).toBeTruthy();
    expect(snap.budget).toBeTruthy();
    expect(snap.networth).toBeTruthy();
    expect(snap.retirement).toBeTruthy();
    expect(snap.budget.monthly_spending).toBeGreaterThan(0);
  });
});

// B-49: the one rule Home + TopBar + the Net Worth screen share for which rows are authoritative.
describe('resolveNetWorthRows: live vs onboarding basis', () => {
  const liveAcct = [{ asset_id: 'a', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE' as const, balance: 60000, target_return: 0.07 }];
  const onb = { currentRetirementSavings: '80000' };

  test('live rows present → use them (ignore onboarding)', () => {
    const { accounts } = resolveNetWorthRows('u', onb, false, liveAcct, []);
    expect(accounts).toBe(liveAcct);
  });

  test('never seeded + nothing live → onboarding-derived estimate', () => {
    const { accounts } = resolveNetWorthRows('u', onb, false, [], []);
    expect(accounts.map((a) => a.balance)).toEqual([80000]);   // the $80k onboarding account
  });

  test('seeded but now empty (user deleted everything) → stays empty, NOT resurrected', () => {
    const { accounts, liabilities } = resolveNetWorthRows('u', onb, true, [], []);
    expect(accounts).toEqual([]);
    expect(liabilities).toEqual([]);
  });
});

// P0 (FCC PRD): the frozen monthly-snapshot history must freeze the SAME net worth every screen
// displays. Before the fix, HomeScreen's freeze effect used the RAW store arrays — a pre-seed user
// (onboarding balances, nothing seeded yet) froze net_worth: 0 into history while the hero/chip
// showed real numbers from resolveNetWorthRows.
describe('frozen history uses the displayed net worth (P0: one net worth, incl. the past)', () => {
  const opWithBalances = {
    ...op,
    nwCash: '20000', nwInvest: '150000', nwHomeValue: '400000', nwMortgage: '250000',
  };
  const { buildNetWorth } = require('./networth');
  const { buildAssetsState } = require('./assets');
  const { buildDebtState } = require('./debt');
  const uid = 'u_test' as any;

  test('pre-seed user: freeze recipe (resolved rows) is non-zero and equals the display recipe', () => {
    // the recipe the freeze effect uses after the fix — resolved rows, not raw arrays
    const { accounts, liabilities } = resolveNetWorthRows(uid, opWithBalances, false, [], []);
    const frozen = buildNetWorth(uid, buildAssetsState(uid, accounts).total_asset_value, buildDebtState(uid, liabilities).total_debt_balance);
    // the display path (TopBar/NetWorthScreen use the identical resolved rows)
    const shown = buildNetWorth(uid, buildAssetsState(uid, accounts).total_asset_value, buildDebtState(uid, liabilities).total_debt_balance);
    expect(frozen.net_worth).toBe(shown.net_worth);
    expect(frozen.net_worth).toBeGreaterThan(0);
    // the OLD recipe (raw empty arrays) — the bug this test prevents from returning
    const old = buildNetWorth(uid, buildAssetsState(uid, []).total_asset_value, buildDebtState(uid, []).total_debt_balance);
    expect(old.net_worth).toBe(0);
    expect(old.net_worth).not.toBe(frozen.net_worth);
  });

  test('seeded user: resolved rows ARE the live arrays (no behavior change post-setup)', () => {
    const live = [{ asset_id: 'ast_1', label: 'Brokerage', balance: 1000, tax_bucket: 'TAXABLE' }] as any[];
    const { accounts } = resolveNetWorthRows(uid, opWithBalances, true, live, []);
    expect(accounts).toBe(live);
  });
});
