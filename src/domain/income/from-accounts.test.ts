/**
 * WHAT YOUR OWN ACCOUNTS PAY — worked out rather than asked (approved mock income-v5, 3c).
 *
 * Three screens showed `investmentIncomeAnnual(transactions) + interestIncomeAnnual(accounts)`: the
 * coupons actually received in the last year, PLUS the coupons those same bonds are expected to pay.
 * A $10,000 Treasury at 5% that had paid its $500 was reported as $1,000 of income. One answer per
 * account now: what it paid if the record shows it, what its rate implies if not — never both.
 */
import { incomeFromAccounts } from './from-accounts';

const NOW = new Date(2026, 7, 28);
const acct = (o: any) => ({ tax_bucket: 'TAXABLE', ...o });
const BOND = acct({ asset_id: 'b1', kind: 'bond', label: 'Treasury', balance: 10_000, coupon_rate: 0.05, face_value: 10_000 });
const paidCoupon = [{ id: 't1', type: 'COUPON', account_id: 'b1', amount: 500, date: '2026-06-01', reinvested: false }];

test('THE LAW: a coupon that was paid is counted ONCE, not twice', () => {
  const r = incomeFromAccounts([BOND] as any, paidCoupon, NOW);
  expect(r.annual).toBeCloseTo(500, 2);          // not 1,000
  expect(r.lines).toHaveLength(1);
  expect(r.lines[0].why).toBe('paid out over the trailing twelve months');   // canon row 23 (Q35, 2026-10-21)
});

test('THE LAW: with no record of payment, the rate is projected', () => {
  const r = incomeFromAccounts([BOND] as any, [], NOW);
  expect(r.annual).toBeCloseTo(500, 2);
  expect(r.lines[0].why).toMatch(/coupon on/);
});

test('THE LAW: reinvested income never counts as paid out', () => {
  const reinv = [{ ...paidCoupon[0], reinvested: true }];
  const r = incomeFromAccounts([BOND] as any, reinv, NOW);
  expect(r.lines[0].why).toMatch(/coupon on/);   // fell back to the projection, not the transaction
});

test('THE LAW: last year only — an older payment is not this year’s income', () => {
  const old = [{ ...paidCoupon[0], date: '2024-06-01' }];
  const r = incomeFromAccounts([BOND] as any, old, NOW);
  expect(r.lines[0].why).toMatch(/coupon on/);
});

test('the working is shown, and matches the approved mock', () => {
  const r = incomeFromAccounts([
    acct({ asset_id: 'a', kind: 'savings', label: 'Chase savings', balance: 18_400, coupon_rate: 0.038 }),
    acct({ asset_id: 'b', kind: 'bond', label: 'Treasury bonds', balance: 30_000, coupon_rate: 0.042, face_value: 30_000 }),
  ] as any, [], NOW);
  expect(r.lines[0].why).toBe('3.8% on $18,400');
  expect(Math.round(r.lines[0].annual)).toBe(699);
  expect(r.lines[1].why).toBe('4.2% coupon on $30,000 face');
  expect(r.lines[1].annual).toBe(1_260);
});

test('THE LAW: an account we cannot read is NAMED, never assumed away', () => {
  const r = incomeFromAccounts([acct({ asset_id: 'c', kind: 'brokerage', label: 'VTI', balance: 80_000 })] as any, [], NOW);
  expect(r.annual).toBe(0);
  expect(r.missing).toContain('VTI');
  expect(r.missing).toMatch(/dividend yield/);
});

test('A46 (founder, 2026-08-26): no coupon rate → counted as $0, and the line says so', () => {
  const r = incomeFromAccounts([acct({ asset_id: 'f', kind: 'bond', label: 'Bond fund', balance: 50_000 })] as any, [], NOW);
  expect(r.lines[0].assumed).toBe(true);
  expect(r.lines[0].annual).toBe(0);
  expect(r.lines[0].why).toMatch(/counted as \$0/);
  expect(r.annual).toBe(0);
});
