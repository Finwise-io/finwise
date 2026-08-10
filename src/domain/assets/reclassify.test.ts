// MIGRATION pins (founder gaps 1 & 2, 2026-08-10): a rule change must fix EXISTING data.
import { reclassifyAccounts, correctClassOf } from './reclassify';

const a = (o: any) => ({ asset_id: 'x', label: 'acct', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0, ...o });

test("the founder's two cases: a stored CD leaves Cash for Bonds, VMFXX leaves Cash for Stocks", () => {
  const { accounts, changed } = reclassifyAccounts([
    a({ asset_id: 'cd', label: 'KEY BANK CD 4.00% 08/24/26', asset_class: 'cash', tax_bucket: 'CASH', maturity_date: '2026-08-24' }),
    a({ asset_id: 'mm', label: 'Vanguard Federal Money Market', asset_class: 'cash', tax_bucket: 'CASH' }),
  ] as any);
  expect(accounts[0].asset_class).toBe('bonds');
  expect(accounts[1].asset_class).toBe('stocks_etf');
  expect(accounts.every((x) => x.tax_bucket !== 'CASH')).toBe(true);   // they leave the cash bucket too
  expect(changed).toBe(2);
});

test('a real cash account is left alone (checking stays cash)', () => {
  const { accounts, changed } = reclassifyAccounts([a({ label: 'Chase Checking', kind: 'checking', asset_class: 'cash', tax_bucket: 'CASH' })] as any);
  expect(accounts[0].asset_class).toBe('cash');
  expect(changed).toBe(0);
});

test('POSITIONS inside an account are re-classified too — the whole class, not just the account row', () => {
  const { accounts, changed } = reclassifyAccounts([a({
    label: 'E*TRADE Brokerage', asset_class: 'stocks_etf',
    positions: [
      { position_id: 'p1', ticker: 'KEYBANK CD 4.00%', asset_class: 'cash' },
      { position_id: 'p2', ticker: 'VMFXX', name: 'Vanguard Federal Money Market', asset_class: 'cash' },
      { position_id: 'p3', ticker: 'VTI', asset_class: 'stock_etf' },
    ],
  })] as any);
  const ps = accounts[0].positions as any[];
  expect(ps[0].asset_class).toBe('bond');
  expect(ps[1].asset_class).toBe('stock_etf');
  expect(ps[2].asset_class).toBe('stock_etf');
  expect(changed).toBe(2);
});

test('running it twice changes nothing the second time (idempotent)', () => {
  const first = reclassifyAccounts([a({ label: 'KeyBank CD 4%', asset_class: 'cash', maturity_date: '2027-01-01' })] as any);
  const second = reclassifyAccounts(first.accounts);
  expect(second.changed).toBe(0);
});

test('correctClassOf leaves an ordinary holding alone', () => {
  expect(correctClassOf(a({ label: 'Vanguard Brokerage', asset_class: 'stocks_etf' }) as any)).toBeNull();
});
