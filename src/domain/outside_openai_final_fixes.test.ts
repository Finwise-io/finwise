// OUTSIDE REVIEW, OpenAI final (2026-10-09) — the confirmed defects fixed in the domain, pinned with real numbers.
import { dataGaps } from './gaps';
import { totalDebtBalance, type Debt } from './debt';
import { buildNetWorth } from './networth';
import { taxBucketSplit } from './decumulation';
import { buildItemizedAccounts, type ItemHolding } from './assets/itemize';
import type { AssetAccount } from './assets';

const NOW = Date.parse('2026-10-09T12:00:00Z');
const debt = (id: string, label: string, bal: number | null | undefined): Debt =>
  ({ debt_id: id, label, debt_type: 'PERSONAL', remaining_balance: bal, interest_rate_apr: 0.05, minimum_monthly_payment: 100 } as any);

describe('MK-NW-F-065 · a debt with no balance is named, not $0 (DEC-3279e)', () => {
  test('$100,000 owned, car loan $20,000, personal loan unknown → $80,000 of known debt AND the amber box names the loan', () => {
    const debts = [debt('d1', 'Car loan', 20000), debt('d2', 'Personal loan', null)];
    expect(buildNetWorth('u' as any, 100000, totalDebtBalance(debts)).net_worth).toBe(80000);   // the sum of known debts stays
    const gaps = dataGaps([], null, NOW, [], [], debts).filter((g) => g.kind === 'no-balance');
    expect(gaps.map((g) => [g.title, g.debtId])).toEqual([['Personal loan has no balance', 'd2']]);
    expect(gaps[0].meanwhile).toMatch(/not counted as \$0/);
  });
  test('undefined and NaN balances are gaps too; a real $0 debt is not', () => {
    const gaps = dataGaps([], null, NOW, [], [], [debt('a', 'Card', undefined), debt('b', 'Loan', NaN as any), debt('c', 'Paid off', 0)]);
    expect(gaps.map((g) => g.debtId)).toEqual(['a', 'b']);
  });
  test('an account with an undefined balance is caught as well as null', () => {
    const acct = (id: string, balance: any) => ({ asset_id: id, label: id, institution: id, tax_bucket: 'CASH', balance } as AssetAccount);
    expect(dataGaps([acct('Undef', undefined), acct('Null', null), acct('Known', 500)], null, NOW).filter((g) => g.kind === 'no-balance').map((g) => g.accountId))
      .toEqual(['Undef', 'Null']);
  });
  test('no debts handed in → no debt gaps (callers that pass nothing are unchanged)', () => {
    expect(dataGaps([], null, NOW)).toEqual([]);
  });
});

describe('MK-NW-F-030 · the drawdown split is told the household home (DEC-2747e)', () => {
  test('two properties, no use stated: the one entered first is the home, the other counts — $200,000 taxable', () => {
    // newest first, as addAsset stores them: A ($300,000) was entered first
    const B = { asset_id: 'B', label: 'Lake house', kind: 'home', tax_bucket: 'TAXABLE', balance: 200000 } as any as AssetAccount;
    const A = { asset_id: 'A', label: 'House', kind: 'home', tax_bucket: 'TAXABLE', balance: 300000 } as any as AssetAccount;
    expect(taxBucketSplit([B, A]).taxable).toBe(200000);   // before: 0 — both read as the home
  });
});

describe('MK-NW-F-052 · itemising refuses a holding with no value (DEC-3279f)', () => {
  const lump = { asset_id: 'L', label: 'Brokerage', institution: 'Chase', tax_bucket: 'TAXABLE', balance: 10000 } as any as AssetAccount;
  const item = (value: number | null, cls: ItemHolding['cls'], label: string): ItemHolding => ({ value, cls, label });
  test('VTI $4,000 + an unpriced bond in a $10,000 account → refused, no $0 bond and no $6,000 cash built as final', () => {
    expect(() => buildItemizedAccounts(lump, [item(4000, 'stocks_etf', 'VTI'), item(null, 'bonds', 'Unpriced bond')]))
      .toThrow(/1 listed holding has no value \(Unpriced bond\)/);
  });
  test('every holding valued → built as before: VTI $4,000 + Chase cash $6,000', () => {
    expect(buildItemizedAccounts(lump, [item(4000, 'stocks_etf', 'VTI')]).map((a) => [a.label, a.balance])).toEqual([['VTI', 4000], ['Chase cash', 6000]]);
  });
});
