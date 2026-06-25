// A-2 — cross-screen money agreement: every screen that shows "cash", "investable", "nest egg", or
// "total debt / min service" reads the ONE canonical selector, so the numbers can't diverge. Domain
// tests pin the selector math; static guards pin the wiring (the source-guard convention this repo uses).
import { cashTotal, investableAssets, retirementEarmarkedValue, type AssetAccount } from './index';
import { totalDebtBalance, minimumDebtService, type Debt } from '../debt';
import * as fs from 'fs';
import * as path from 'path';

const acct = (p: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'a' as any, label: 'x', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.07, ...p,
});

describe('A-2 canonical money selectors (math)', () => {
  const cash = acct({ kind: 'savings', tax_bucket: 'CASH', balance: 10_000 });
  const brok = acct({ kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100_000 });
  const home = acct({ kind: 'home', tax_bucket: 'PROPERTY', balance: 400_000 });
  const debts = [
    { debt_id: 'd1', remaining_balance: 5_000, minimum_monthly_payment: 150 },
    { debt_id: 'd2', remaining_balance: 20_000, minimum_monthly_payment: 220 },
  ] as any as Debt[];

  test('cashTotal = the cash-class accounts only', () => {
    expect(cashTotal([cash, brok, home])).toBe(10_000);
  });
  test('investableAssets excludes real estate / personal property', () => {
    expect(investableAssets([cash, brok, home])).toBe(110_000);
  });
  test('retirementEarmarkedValue = earmarked investments (cash 0%, property 0%)', () => {
    expect(retirementEarmarkedValue([cash, brok, home])).toBe(100_000);
  });
  test('totalDebtBalance = Σ outstanding balances', () => {
    expect(totalDebtBalance(debts)).toBe(25_000);
  });
  test('minimumDebtService = Σ minimum payments', () => {
    expect(minimumDebtService(debts)).toBe(370);
  });
});

// ── static guards: each screen reads the one selector, not a bespoke inline reduce ──
const screen = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', 'screens', f), 'utf8');

test('A-2: cash sourced from canonical cashTotal on every screen that shows it', () => {
  for (const f of ['InsightsScreen.tsx', 'BillCalendarScreen.tsx', 'StressTestScreen.tsx', 'NetWorthScreen.tsx']) {
    const s = screen(f);
    expect(s).toMatch(/cashTotal\(/);
    expect(s).not.toMatch(/=== 'CASH'\)\.reduce/);   // the inline re-derive is gone
  }
});

test('A-2: total debt + DTI min service sourced from canonical selectors', () => {
  expect(screen('InsuranceScreen.tsx')).toMatch(/totalDebtBalance\(/);
  expect(screen('BudgetScreen.tsx')).toMatch(/minimumDebtService\(/);
});
