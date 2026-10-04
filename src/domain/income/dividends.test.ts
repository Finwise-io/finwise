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

/* ── A PAYSLIP RATE IS A RATE ON THE PAYSLIP (2026-10-03) ─────────────────────────────────────────
 *  The household the approved design draws (income-end-to-end_v07, frame 16): take-homes of $5,000
 *  and $3,300 entered, $1,200/month of rent after running costs, $3,000/year of dividends left where
 *  they are earned. Its own rule 5 — "the take-home someone enters IS the take-home" — and its
 *  reconciled total: $9,500 lands. The grid applied the couple's payslip rate to the rent and the
 *  dividends as well and read $9,248, under three rows that add to $9,500. */
describe('a rate taken from a payslip is applied to pay, and to nothing else', () => {
  const HOUSE: any = {
    baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000',
    hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
    partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' },
    invAnnual: '3000', incomeSources: ['employment', 'rental', 'investment'], rentalIncome: '1800', rentalExpenses: '600',
  };
  const month = (op: any) => incomeMonthlyGrid(op, 'available')[0].amount;

  test('the entered take-homes plus the rent are the month — $5,000 + $3,300 + $1,200 = $9,500', () => {
    expect(month(HOUSE)).toBeCloseTo(9_500, 0);
  });
  test('the rent arrives whole: adding it raises the month by exactly the rent', () => {
    const noRent = { ...HOUSE, rentalIncome: '0', rentalExpenses: '0', incomeSources: ['employment', 'investment'] };
    expect(month(HOUSE) - month(noRent)).toBeCloseTo(1_200, 0);
  });
  test('and dividends left where they are earned take nothing off an ENTERED take-home', () => {
    expect(month({ ...HOUSE, invAnnual: '0' })).toBeCloseTo(month(HOUSE), 0);
  });
  test('the yearly tax still counts both — they are in what is taxed, only not in a month’s deduction', () => {
    expect(taxableAnnual(HOUSE)).toBeCloseTo(taxableAnnual({ ...HOUSE, invAnnual: '0', rentalIncome: '0', rentalExpenses: '0' }) + 3_000 + 14_400, 0);
  });
  test('the CALCULATED rate is untouched: with no take-home entered, the tax on dividends still comes out of the pay', () => {
    expect(lands({ ...WAGE, invAnnual: '3000' })).toBeLessThan(lands(WAGE));
  });
});
