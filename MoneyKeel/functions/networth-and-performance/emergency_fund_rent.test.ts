/** RENT FROM A PROPERTY KEEPS ARRIVING — MK-NW-O-004 theEmergencyFund.
 *
 *  Founder, 2026-10-04: "add it to the cash as losing job does not mean loosing rental income too."
 *
 *  Rent arrives every month, so it is added to the cash every month. The first test proves that by
 *  walking the months one at a time, with no formula in it: add the rent, pay for the month, count
 *  how long the cash lasts. The function must give the same count.
 */
import { theEmergencyFund } from './emergency-fund';
import { incomeSummary } from '../cashflow/income-summary';

const cashAt = (id: string, kind: string, balance: number) => ({ asset_id: id, label: id, kind, tax_bucket: 'CASH', balance }) as any;
const debt = (label: string, type: string, minimum: number) =>
  ({ debt_id: label, label, debt_type: type, remaining_balance: 100000, interest_rate_apr: 0.05, minimum_monthly_payment: minimum }) as any;

// the outside review's renter: rents their home, owns a rental house with a mortgage
const RENTER = {
  accounts: [cashAt('chk', 'checking', 6140.88), cashAt('sav', 'savings', 14700),
    { asset_id: 'rental', label: 'Rental house', kind: 'home', tax_bucket: 'PROPERTY', re_use: 'rental', balance: 310000 }] as any,
  expenses: [] as any[],
  debts: [debt('rental-house mortgage', 'MORTGAGE', 1980), debt('car loan', 'AUTO', 254.5)],
};
const BUDGET = [{ id: 'rent', label: 'Rent / Mortgage', amount: 2200, bucket: 'fixed', tier: 'critical' },
                { id: 'groceries', label: 'Groceries', amount: 1325.6, bucket: 'flexible', tier: 'need' }];
const withRental = (income: number, expenses: number) => ({ spendCats: BUDGET, rentals: [{ type: 'long', income, expenses }] });

test('rent is added to the cash EVERY month — the same count as walking the months one by one', () => {
  const e = theEmergencyFund({ ...RENTER, profile: withRental(2400, 1200) });
  expect(e.cash).toBeCloseTo(20840.88, 4);
  expect(e.essentialsMonthly).toBeCloseTo(5760.1, 4);          // $3,525.60 of essentials + $2,234.50 of debt payments
  expect(e.rentalIncomeMonthly).toBeCloseTo(1200, 6);           // $2,400 of rent − $1,200 to run the house
  expect(e.fromCashMonthly).toBeCloseTo(4560.1, 4);
  expect(e.monthsCovered).toBeCloseTo(20840.88 / 4560.1, 9);    // 4.57 months

  // the walk, day by day so a part-month counts: each day a day's rent arrives and a day's costs go out
  let cash = e.cash, days = 0;
  const perDay = (e.essentialsMonthly - e.rentalIncomeMonthly) / 30;
  while (cash - perDay >= 0) { cash -= perDay; days += 1; }
  expect(days / 30).toBeCloseTo(e.monthsCovered as number, 1);

  // …and NOT the rent counted once: that would call a year of rent a single month of it
  expect(e.monthsCovered).not.toBeCloseTo((20840.88 + 1200) / 5760.1, 2);   // 3.83
});

test('the rent is the Income summary’s own Rent row — the two screens cannot show two rents', () => {
  for (const profile of [withRental(2400, 1200), { ...withRental(2400, 1200), taxMode: 'manual', manualTaxRate: '22', baseSalary: '9000', salaryFreq: 'monthly', salaryMode: 'gross', incomeSources: ['employment'], status: 'employed' },
                         { ...withRental(3000, 400), baseSalary: '9000', salaryFreq: 'monthly', salaryMode: 'gross', incomeSources: ['employment'], status: 'employed' }]) {
    const row = incomeSummary(profile as any).lands.lines.find((l) => l.label === 'Rent');
    expect(row).toBeDefined();
    expect(theEmergencyFund({ ...RENTER, profile }).rentalIncomeMonthly).toBeCloseTo(row!.amount, 9);
  }
});

test('no rental: every figure is what it was before the ruling', () => {
  const e = theEmergencyFund({ ...RENTER, profile: { spendCats: BUDGET } });
  expect(e.rentalIncomeMonthly).toBe(0);
  expect(e.rentCoversEssentials).toBe(false);
  expect(e.fromCashMonthly).toBeCloseTo(e.essentialsMonthly, 9);
  expect(e.monthsCovered).toBeCloseTo(e.cash / e.essentialsMonthly, 9);
  expect(e.monthsCoveredAtPlannedSpend).toBeCloseTo(e.cash / e.plannedSpendMonthly, 9);
  expect(e.targetFor(6)!.target).toBeCloseTo(e.essentialsMonthly * 6, 9);
});

test('a rental that loses money adds nothing — and takes nothing away twice', () => {
  // its running costs are already what they are; a negative rent is not a second expense here
  const e = theEmergencyFund({ ...RENTER, profile: withRental(1000, 1400) });
  expect(e.rentalIncomeMonthly).toBe(0);
  expect(e.monthsCovered).toBeCloseTo(e.cash / e.essentialsMonthly, 9);
});

test('the planned-spend months, the target and the months after a hit all count the same rent', () => {
  const e = theEmergencyFund({ ...RENTER, profile: withRental(2400, 1200) });
  expect(e.monthsCoveredAtPlannedSpend).toBeCloseTo(e.cash / (e.plannedSpendMonthly - 1200), 9);
  expect(e.targetFor(6)).toEqual({ target: expect.closeTo(4560.1 * 6, 6), gap: expect.closeTo(4560.1 * 6 - 20840.88, 6) });
  const hit = e.afterAShock(5000);
  expect(hit.cashAfter).toBeCloseTo(15840.88, 4);
  expect(hit.monthsAfter).toBeCloseTo(15840.88 / 4560.1, 9);
  expect(hit.coversIt).toBe(true);
});

test('rent that pays for the whole month: no count of months, and it says why', () => {
  const e = theEmergencyFund({ ...RENTER, profile: { ...withRental(9000, 1000), taxMode: 'manual', manualTaxRate: '20' } });
  expect(e.rentalIncomeMonthly).toBeGreaterThanOrEqual(e.essentialsMonthly);
  expect(e.rentCoversEssentials).toBe(true);
  expect(e.fromCashMonthly).toBe(0);
  expect(e.monthsCovered).toBeNull();                           // never cash ÷ 0, never "infinite months"
  expect(e.monthsCoveredAtPlannedSpend).toBeNull();
  expect(e.targetFor(6)).toEqual({ target: 0, gap: 0 });        // nothing to set aside for the month — true here
  expect(e.afterAShock(5000).monthsAfter).toBeNull();
});

test('a typed month of essentials (Job safety) stands in for the whole month, and the rent still counts', () => {
  const e = theEmergencyFund({ ...RENTER, profile: withRental(2400, 1200), essentialsOverride: 4000 });
  expect(e.essentialsMonthly).toBe(4000);
  expect(e.targetFor(6)!.target).toBeCloseTo((4000 - 1200) * 6, 9);
  // nothing typed → the function's own figure
  expect(theEmergencyFund({ ...RENTER, profile: withRental(2400, 1200), essentialsOverride: 0 }).essentialsMonthly).toBeCloseTo(5760.1, 4);
});

/** A DEBT PAYMENT LOGGED AS AN EXPENSE IS NOT COUNTED TWICE (outside review, 2026-10-04). Logging a payment
 *  on a debt writes an expense in the category "Debt payment", named for the debt. It sat in the logged
 *  average and came back as the debt's required payment. */
describe('a debt payment that was logged as an expense', () => {
  const month = (k: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`; };
  const log = (k: number, amount: number, category: string, store = 'x') => ({ id: `${k}${category}${store}`, date: month(k), amount, category, store });
  const groceries = [1, 2, 3].map((k) => log(k, 3000, 'Groceries'));
  const carPaid = [1, 2, 3].map((k) => log(k, 250, 'Debt payment', 'car loan'));
  const base = { accounts: [cashAt('c', 'checking', 32500)], profile: {} };

  test('is counted once: $3,000 of expenses + the $250 the car loan requires — not $3,500', () => {
    const e = theEmergencyFund({ ...base, expenses: [...groceries, ...carPaid], debts: [debt('car loan', 'AUTO', 250)] });
    expect(e.debtMinimums).toBe(250);
    expect(e.essentialsMonthly).toBeCloseTo(3250, 6);          // it read 3,500: the payment in the average and again as a debt
    expect(e.monthsCovered).toBeCloseTo(10, 6);
    // the same household that never logged the payment gets the same answer
    expect(theEmergencyFund({ ...base, expenses: groceries, debts: [debt('car loan', 'AUTO', 250)] }).essentialsMonthly).toBeCloseTo(3250, 6);
  });

  test('with no debt entered, a logged payment is the only record of it and stays in', () => {
    const e = theEmergencyFund({ ...base, expenses: [...groceries, ...carPaid], debts: [] });
    expect(e.essentialsMonthly).toBeCloseTo(3250, 6);
  });

  test('a payment logged against a debt that is NOT entered stays in — nothing else stands for it', () => {
    const e = theEmergencyFund({ ...base, expenses: [...groceries, ...[1, 2, 3].map((k) => log(k, 100, 'Debt payment', 'loan from a friend'))], debts: [debt('car loan', 'AUTO', 250)] });
    expect(e.essentialsMonthly).toBeCloseTo(3000 + 100 + 250, 6);
  });

  test('the home’s mortgage is the one debt the budget carries, so its logged payments stay in the average', () => {
    const profile = { spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2000, bucket: 'fixed', tier: 'critical' }] };
    const paid = [1, 2, 3].map((k) => log(k, 2000, 'Debt payment', 'home mortgage'));
    const e = theEmergencyFund({ accounts: [cashAt('c', 'checking', 30000), { asset_id: 'h', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 400000 }] as any,
      profile, expenses: [...groceries, ...paid, ...carPaid], debts: [debt('home mortgage', 'MORTGAGE', 2000), debt('car loan', 'AUTO', 250)] });
    expect(e.debtMinimums).toBe(250);                          // the mortgage's required payment is left out, as before
    expect(e.essentialsMonthly).toBeCloseTo(3000 + 2000 + 250, 6);   // … and its logged payments carry it: once
  });
});
