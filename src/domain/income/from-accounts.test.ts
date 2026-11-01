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

// CHANGED 2026-10-25 (FIX-TAX, his DEC-0179 clause 2 "the tax on them still comes out", DEC-0198; the screens check MK-CF-M-066):
// a reinvested payout is income — the screen counts these as income you are taxed on — so it counts as paid by the holding.
test('THE LAW: a reinvested payout counts — paid by the holding, whether it sat as cash or bought more (DEC-0179)', () => {
  const reinv = [{ ...paidCoupon[0], reinvested: true }];
  const r = incomeFromAccounts([BOND] as any, reinv, NOW);
  expect(r.lines[0].why).toBe('paid out over the trailing twelve months');
});
test.failing('the old law, pinned (now failing): reinvested income never counted, the line fell back to the projection', () => {
  const r = incomeFromAccounts([BOND] as any, [{ ...paidCoupon[0], reinvested: true }], NOW);
  expect(r.lines[0].why).toMatch(/coupon on/);
});
test('THE LAW: nothing dated after today is paid yet; a payout with no amount is named, never $0 (MK-CF-F-183)', () => {
  const tomorrow = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1);
  const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const r = incomeFromAccounts([BOND] as any, [{ ...paidCoupon[0], date: iso }], NOW);
  expect(r.lines[0].why).toMatch(/coupon on/);
  const n = incomeFromAccounts([BOND] as any, [{ ...paidCoupon[0], amount: null }], NOW);
  expect(n.missing).toMatch(/^Not counted: 1 payment from .+ — amount not on record\.$/);
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
  expect(r.lines[0].why).toBe('3.80% on $18,400');   // two decimals (IN3-04, 2026-10-31; Q49, DEC-0221)
  expect(Math.round(r.lines[0].annual)).toBe(699);
  expect(r.lines[1].why).toBe('4.20% coupon on $30,000 face');   // two decimals (IN3-04, 2026-10-31)
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

// ── THE ONE INTEREST-AND-DIVIDENDS FIGURE FOR A TAX YEAR (the lead's ruling of 2026-10-25; DEC-0179, DEC-0298) ──────────────
// records for that year → else the figure typed → else calculated from the accounts' rates, ≈ with its working → else not entered
describe('interestAndDividendsForYear — records, entered, calculated ≈, not entered', () => {
  const { interestAndDividendsForYear } = require('./from-accounts');
  const SAV = acct({ asset_id: 's', kind: 'savings', asset_class: 'cash', label: 'Savings', balance: 10_000, coupon_rate: 0.04 });
  const IRA = acct({ asset_id: 'i', kind: 'trad_ira', tax_bucket: 'PRE_TAX', label: 'IRA', balance: 50_000 });
  const rec = (amount: any, date: string, o: any = {}) => ({ type: 'INTEREST', account_id: 's', amount, date, ...o });
  test('1 · the year\'s records win — the calendar year, never past today, reinvested counted, to the cent, an IRA left out', () => {
    const r = interestAndDividendsForYear({ invAnnual: '1000' }, [SAV, IRA],
      [rec(500, '2025-11-14'), rec(731.17, '2026-03-13'), rec(611.43, '2026-05-02', { reinvested: true }), rec(90, '2026-12-01'),
       { type: 'DIVIDEND', account_id: 'i', amount: 400, date: '2026-04-01', reinvested: true }], 2026, NOW);
    expect(r.basis).toBe('records');
    expect(r.amount).toBeCloseTo(731.17 + 611.43, 9);           // $1,342.60 — not $1,343, not 2025's $500, not December's $90
    expect(r.approx).toBe(false);
    expect(r.said).toBe("from your accounts' records for 2026");
  });
  test('2 · no record in the year → the figure the person typed (a typed $0 is an answer)', () => {
    expect(interestAndDividendsForYear({ invAnnual: '1000' }, [SAV], [], 2026, NOW)).toMatchObject({ amount: 1000, basis: 'entered', said: 'you entered' });
    expect(interestAndDividendsForYear({ invAnnual: 0 }, [SAV], [], 2026, NOW)).toMatchObject({ amount: 0, basis: 'entered' });
  });
  test('3 · nothing typed → calculated from the accounts\' rates, ≈, with its working', () => {
    const r = interestAndDividendsForYear({}, [SAV, IRA], [], 2026, NOW);
    expect(r).toMatchObject({ amount: 400, basis: 'calculated', approx: true });
    expect(r.said).toBe('calculated from your accounts — 4.00% on $10,000');   // two decimals (IN3-04, 2026-10-31)
    expect(r.lines.map((l: any) => l.label)).toEqual(['Savings']);
  });
  test('4 · nothing at all → not entered, no number (tenet 3)', () => {
    expect(interestAndDividendsForYear({}, [IRA], [], 2026, NOW)).toMatchObject({ amount: null, basis: 'not entered' });
    expect(interestAndDividendsForYear(null, [], [], 2026, NOW)).toMatchObject({ amount: null, basis: 'not entered' });
  });
});
