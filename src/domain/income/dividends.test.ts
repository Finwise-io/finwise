/**
 * INTEREST AND DIVIDENDS — taxed, and not spendable. Finding B34, approved mock income-v5, frame 3c.
 *
 * They were counted as money to spend. In most accounts they are reinvested where they are earned and
 * never reach the bank, so every surplus, runway and savings figure was too generous by the whole
 * dividend — $250/month on $3,000/year.
 *
 * The correction is not simply "remove them". They are still TAXED, so the tax still comes out of the
 * pay that does reach the bank. Someone with $3,000 of reinvested dividends ends up with LESS in hand
 * than someone with none — which is true, and is the part a simple removal would have got wrong.
 */
import { incomeMonthlyGrid, taxableAnnual, extraIncome } from './onboarding';

const WAGE: any = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800' };
const lands = (op: any) => incomeMonthlyGrid(op, 'available').reduce((t, g) => t + g.amount, 0) / 12;

test('THE LAW: reinvested dividends are taxed', () => {
  expect(taxableAnnual({ ...WAGE, invAnnual: '3000' })).toBeCloseTo(taxableAnnual(WAGE) + 3_000, 0);
});

test('THE LAW: reinvested dividends never reach the bank', () => {
  const withDiv = lands({ ...WAGE, invAnnual: '3000' });
  const paidOut = lands({ ...WAGE, invAnnual: '3000', invPaidToBank: 'yes' });
  expect(paidOut - withDiv).toBeCloseTo(250, 0);          // the whole $3,000/year, and not a cent less
});

test('THE LAW: money you never see still costs you tax', () => {
  const none    = lands(WAGE);
  const withDiv = lands({ ...WAGE, invAnnual: '3000' });
  expect(withDiv).toBeLessThan(none);                     // less in hand, not more
  expect(none - withDiv).toBeGreaterThan(0);
});

test('THE LAW: saying they are paid out adds them back, exactly', () => {
  for (const amount of [0, 600, 3_000, 20_000]) {
    const re  = lands({ ...WAGE, invAnnual: String(amount) });
    const out = lands({ ...WAGE, invAnnual: String(amount), invPaidToBank: 'yes' });
    expect(out - re).toBeCloseTo(amount / 12, 2);
  }
});

test('THE LAW: reinvested is the default — silence is not "paid to my bank"', () => {
  expect(extraIncome({ ...WAGE, invAnnual: '3000' } as any).reinvestedMonthly).toBeCloseTo(250, 2);
  expect(extraIncome({ ...WAGE, invAnnual: '3000', invPaidToBank: 'yes' } as any).reinvestedMonthly).toBe(0);
  expect(extraIncome({ ...WAGE, invAnnual: '3000', invPaidToBank: 'no' } as any).reinvestedMonthly).toBeCloseTo(250, 2);
});

test('THE LAW: no dividends, no change', () => {
  expect(lands({ ...WAGE, invAnnual: '0' })).toBeCloseTo(lands(WAGE), 2);
  expect(extraIncome(WAGE).reinvestedMonthly).toBe(0);
});
