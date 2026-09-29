/** THE DOOR FOR "how long would my cash cover my essentials" — MK-NW-O-004 theEmergencyFund
 *  (Q-NW-5, ruled by the founder 2026-09-27: "Yes.").
 *
 *  Three screens ask this under three names — the emergency fund, Job safety, Stress test. The law
 *  is that they get ONE cash figure and ONE essentials figure, so a person cannot read three
 *  different runways in one sitting.
 */
import { theEmergencyFund } from './emergency-fund';

const CASH = [{ asset_id: 'c1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 24000 }] as any;
const LOGGED = [
  { id: 1, date: '2026-07-04', amount: 2000, category: 'Rent' },
  { id: 2, date: '2026-08-04', amount: 2000, category: 'Rent' },
];

test('the runway is cash ÷ a month of essentials', () => {
  const c = theEmergencyFund({ accounts: CASH, expenses: LOGGED, profile: { monthlySpending: 4000 } });
  expect(c.cash).toBe(24000);
  expect(c.essentialsMonthly).toBeGreaterThan(0);
  expect(c.monthsCovered).toBeCloseTo(24000 / c.essentialsMonthly, 6);
});

test('NO ESSENTIALS FIGURE, NO RUNWAY — it never divides by nothing', () => {
  const c = theEmergencyFund({ accounts: CASH, expenses: [], profile: {} });
  expect(c.essentialsMonthly).toBe(0);
  expect(c.monthsCovered).toBeNull();
});

test('the essentials figure says where it came from (his ruling G21)', () => {
  const c = theEmergencyFund({ accounts: CASH, expenses: LOGGED, profile: { monthlySpending: 4000 } });
  expect(typeof c.essentialsBasis).toBe('string');
  expect(c.essentialsBasis.length).toBeGreaterThan(0);
});

test('a target of N months costs N × essentials, and the gap never goes below zero', () => {
  const c = theEmergencyFund({ accounts: CASH, expenses: LOGGED, profile: { monthlySpending: 4000 } });
  const six = c.targetFor(6);
  expect(six.target).toBeCloseTo(c.essentialsMonthly * 6, 6);
  expect(c.targetFor(1).gap).toBe(0);            // one month is well covered by $24,000
  expect(six.gap).toBeGreaterThanOrEqual(0);
});

test('a shock takes from the cash, and what is left has its own runway', () => {
  const c = theEmergencyFund({ accounts: CASH, expenses: LOGGED, profile: { monthlySpending: 4000 } });
  const hit = c.afterAShock(10000);
  expect(hit.cashAfter).toBe(14000);
  expect(hit.coversIt).toBe(true);
  expect(hit.monthsAfter).toBeCloseTo(14000 / c.essentialsMonthly, 6);
});

test('a shock bigger than the cash says so, and the runway stops at zero', () => {
  const c = theEmergencyFund({ accounts: CASH, expenses: LOGGED, profile: { monthlySpending: 4000 } });
  const hit = c.afterAShock(30000);
  expect(hit.coversIt).toBe(false);
  expect(hit.monthsAfter).toBe(0);
});

/** WHAT YOU CANNOT STOP PAYING — the founder, 2026-09-28: "What about credit card debt, HELOC, car
 *  loan?" They were in NEITHER figure. You can skip dinner out; you cannot skip a car payment. */
describe('debt minimums belong in both figures', () => {
  const CASH9K = [{ asset_id: 'c', label: 'Cash', kind: 'checking', tax_bucket: 'CASH', balance: 9000 }] as any;
  const BUDGET = {
    monthlySpending: '4500',
    spendCats: [
      { id: 'rent', label: 'Rent / Mortgage', tier: 'critical', bucket: 'fixed', unit: 'dollar', amount: 2000 },
      { id: 'groceries', label: 'Groceries', tier: 'critical', bucket: 'flexible', unit: 'dollar', amount: 800 },
      { id: 'dining', label: 'Dining out', tier: 'flex', bucket: 'flexible', unit: 'dollar', amount: 900 },
    ],
  } as any;
  const DEBTS = [
    { debt_id: 'd1', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, minimum_monthly_payment: 250 },
    { debt_id: 'd2', label: 'Visa card', debt_type: 'CREDIT_CARD', remaining_balance: 3200, minimum_monthly_payment: 120 },
    { debt_id: 'd3', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 40000, minimum_monthly_payment: 200 },
  ] as any;

  test('the car loan, the card and the HELOC all count — in both figures', () => {
    const a = theEmergencyFund({ accounts: CASH9K, expenses: [], profile: BUDGET, debts: DEBTS });
    expect(a.debtMinimums).toBe(570);
    expect(a.essentialsMonthly).toBe(3600 + 570);
    expect(a.plannedSpendMonthly).toBe(4500 + 570);
  });

  test('BOTH runways are answered, and the essentials one is the longer', () => {
    const a = theEmergencyFund({ accounts: CASH9K, expenses: [], profile: BUDGET, debts: DEBTS });
    expect(a.monthsCovered).toBeCloseTo(9000 / 4170, 4);
    expect(a.monthsCoveredAtPlannedSpend).toBeCloseTo(9000 / 5070, 4);
    expect(a.monthsCovered!).toBeGreaterThan(a.monthsCoveredAtPlannedSpend!);
  });

  test('a mortgage is never counted twice', () => {
    const withMortgage = [...DEBTS, { debt_id: 'd4', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, minimum_monthly_payment: 2000 }] as any;
    // "Rent / Mortgage" is budgeted at $2,000, so the mortgage debt's minimum is already carried
    const budgeted = theEmergencyFund({ accounts: CASH9K, expenses: [], profile: BUDGET, debts: withMortgage });
    expect(budgeted.debtMinimums).toBe(570);
    // with no housing category, nothing carries it, so it counts
    const noHousing = theEmergencyFund({
      accounts: CASH9K, expenses: [],
      profile: { ...BUDGET, spendCats: BUDGET.spendCats.filter((c: any) => c.id !== 'rent') },
      debts: withMortgage,
    });
    expect(noHousing.debtMinimums).toBe(2570);
  });

  test('no debts entered → the figures are what they were', () => {
    const a = theEmergencyFund({ accounts: CASH9K, expenses: [], profile: BUDGET });
    expect(a.debtMinimums).toBe(0);
    expect(a.essentialsMonthly).toBe(3600);
  });
});
