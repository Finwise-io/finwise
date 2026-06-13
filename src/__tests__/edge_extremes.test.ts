/**
 * Edge personas & data extremes (launch test plan, P1 area 8): the app must produce sane,
 * finite numbers at $0, at nine figures, on leap days, and for every skipped answer.
 */
import { snapshotFromOnboarding } from '../domain/snapshot';
import { simulate, solveRetireAge, projectNestEgg } from '../domain/retirement';
import { cashflowYear } from '../domain/cashflow';
import { spendByMonth, savingsByMonth, emergencyTest } from '../domain/budget';
import { ECON, employedPartner, retiree75, NO_TAX } from '../testing/personas';
import { expectAllFinite } from '../testing/assertFinite';
import type { OnboardingProfile } from '../domain/onboardingProfile';

const snap = (op: OnboardingProfile) => snapshotFromOnboarding('local', op, ECON);

describe('Data extremes stay finite and sane', () => {
  test('$0 everything: a totally skipped profile', () => {
    const s = snap({});
    expectAllFinite(s, 'empty profile');
    expect(s.networth.net_worth).toBe(0);
    expect(s.budget.projected_to_save).toBe(0);
    expect(s.goals.monthly_capacity).toBe(0);
  });

  test('negative net worth: debts dwarf assets', () => {
    const s = snap({ ...NO_TAX, currentRetirementSavings: '5000', debtName: 'Cards', debtBalance: '80000', debtRate: '24', debtPayment: '900' });
    expectAllFinite(s, 'negative net worth');
    expect(s.networth.net_worth).toBe(5000 - 80000);
    expect(s.debt.toxic_debt_balance).toBe(80000);                  // 24% APR is toxic
  });

  test('deficit household: spending far above income', () => {
    const s = snap({ ...NO_TAX, baseSalary: '2000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '9000' });
    expectAllFinite(s, 'deficit household');
    expect(s.budget.projected_to_save).toBeLessThan(0);
    expect(s.goals.monthly_capacity).toBe(0);                       // never a negative goal promise
  });

  test('single-digit amounts', () => {
    const s = snap({ ...NO_TAX, baseSalary: '5', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '3', currentRetirementSavings: '1' });
    expectAllFinite(s, 'single digits');
    expect(s.networth.net_worth).toBe(1);
  });

  test('nine-figure wealth', () => {
    const s = snap({
      ...NO_TAX, baseSalary: '2000000', salaryMode: 'gross', salaryFreq: 'monthly',
      currentRetirementSavings: '250000000', investmentHoldings: '120000000', monthlySpending: '300000',
      targetRetirementAge: '55', birthYear: '1980',
    });
    expectAllFinite(s, 'nine figures');
    expect(s.networth.net_worth).toBe(370000000);
    expect(s.retirement.chance_of_success).toBeGreaterThanOrEqual(99);  // this person is fine
  });

  test('120% spending allocation (percent categories that overshoot take-home)', () => {
    const s = snap({
      ...NO_TAX, baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly',
      spendCats: [
        { id: 'rent', tier: 'critical', bucket: 'fixed', amount: '70', unit: 'pct' },
        { id: 'rest', tier: 'flex', bucket: 'flexible', amount: '50', unit: 'pct' },
      ],
    });
    expectAllFinite(s, '120% allocation');
    expect(s.budget.monthly_spending).toBeCloseTo(6000, 0);         // 120% of 5000, honored not clamped
    expect(s.budget.projected_to_save).toBeCloseTo(-1000, 0);       // and the deficit is shown
  });

  test('every optional answer skipped, one at a time, never breaks the snapshot', () => {
    const keys = Object.keys(employedPartner) as (keyof OnboardingProfile)[];
    for (const k of keys) {
      const op = { ...employedPartner };
      delete (op as any)[k];
      expectAllFinite(snap(op), `skip ${String(k)}`);
    }
  });
});

describe('Date edges', () => {
  test('rolling 12-month cash flow across the December→January boundary', () => {
    const dec = cashflowYear(employedPartner, 5000, new Date(2026, 11, 15));
    expectAllFinite(dec, 'Dec window');
    expect(dec.months).toHaveLength(12);
  });

  test('leap day is a valid as-of date', () => {
    const leap = cashflowYear(employedPartner, 5000, new Date(2028, 1, 29));
    expectAllFinite(leap, 'leap day');
  });

  test('non-monthly bills in January and December both land inside the year grid', () => {
    const op: OnboardingProfile = {
      ...NO_TAX, baseSalary: '4000', salaryMode: 'gross', salaryFreq: 'monthly',
      spendCats: [
        { id: 'janBill', tier: 'critical', bucket: 'nonmonthly', amount: '1200', unit: 'dollar', months: [1] },
        { id: 'decBill', tier: 'critical', bucket: 'nonmonthly', amount: '600', unit: 'dollar', months: [12] },
      ],
    };
    const months = spendByMonth(op);
    expect(months[0]).toBeCloseTo(1200, 2);
    expect(months[11]).toBeCloseTo(600, 2);
    expect(months.slice(1, 11).every((m) => m === 0)).toBe(true);
  });

  test('out-of-range month indexes clamp instead of corrupting the grid', () => {
    const op: OnboardingProfile = {
      ...NO_TAX,
      spendCats: [{ id: 'weird', tier: 'critical', bucket: 'nonmonthly', amount: '1200', unit: 'dollar', months: [0, 13] }],
    };
    const months = spendByMonth(op);
    expectAllFinite(months, 'clamped months');
    expect(months.reduce((t, m) => t + m, 0)).toBeCloseTo(1200, 1);  // all dollars land somewhere
  });
});

describe('Retirement math at the extremes', () => {
  const base = {
    current_age: 40, retire_age: 65, horizon_age: 90, start_balance: 200000, annual_contribution: 24000,
    retire_monthly_spend_today: 5000, guaranteed_monthly_income: 1500, inflation: 0.024,
    mean_return: 0.06, vol_return: 0.12, paths: 300, seed: 7,
  };

  test('chance of success is always within [0, 100]', () => {
    for (const over of [
      {}, { start_balance: 0, annual_contribution: 0 }, { start_balance: 50000000 },
      { retire_monthly_spend_today: 0 }, { retire_monthly_spend_today: 200000 },
      { current_age: 64, retire_age: 65 }, { mean_return: 0, vol_return: 0.30 },
    ]) {
      const c = simulate({ ...base, ...over }).chance_of_success;
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(100);
    }
  });

  // BUG-LEDGER: B-22 probe — more savings must never report an EARLIER need or a LATER safe age.
  test('solveRetireAge is monotonic in starting balance', () => {
    let prev: number | null = null;
    for (const bal of [100000, 200000, 400000, 800000, 1600000, 3200000]) {
      const age = solveRetireAge({ ...base, start_balance: bal });
      if (prev != null && age != null) expect(age).toBeLessThanOrEqual(prev);
      if (age != null) prev = age;
    }
  });

  test('projectNestEgg responds in the right direction to each lever', () => {
    const ref = projectNestEgg(base);
    expect(projectNestEgg({ ...base, start_balance: base.start_balance * 2 }).will_have).toBeGreaterThan(ref.will_have);
    expect(projectNestEgg({ ...base, retire_monthly_spend_today: 8000 }).will_need).toBeGreaterThan(ref.will_need);
    expect(projectNestEgg({ ...base, guaranteed_monthly_income: 3000 }).will_need).toBeLessThan(ref.will_need);
    // claiming Social Security later (gap years) costs more than claiming at retirement
    expect(projectNestEgg({ ...base, guaranteed_start_age: 70 }).will_need).toBeGreaterThan(ref.will_need);
  });

  test('retiring tomorrow with nothing: shortfall equals the full need', () => {
    const p = projectNestEgg({ ...base, current_age: 64, retire_age: 65, start_balance: 0, annual_contribution: 0, guaranteed_monthly_income: 0 });
    expect(p.shortfall).toBeCloseTo(p.will_need, 0);
  });
});

describe('Emergency stress test at the extremes', () => {
  test('$0 cash, big shock: runway is zero, fund gap is the full recommendation', () => {
    const r = emergencyTest(retiree75, 0, 10000);
    expect(r.coversIt).toBe(false);
    expect(r.runwayAfter).toBe(0);
    expect(r.gapToFund).toBe(r.recommendedFund);
  });

  test('huge cash cushion covers any shock', () => {
    const r = emergencyTest(retiree75, 1000000, 25000);
    expect(r.coversIt).toBe(true);
    expect(r.jobLossRunway).toBeGreaterThan(100);
  });

  test('no spending data: never divides by zero', () => {
    const r = emergencyTest({}, 1000, 500);
    expectAllFinite(r, 'no-spend stress test');
  });
});

describe('Savings grid extremes', () => {
  test('a one-month job: income lands in that month only and the grid stays finite', () => {
    const op: OnboardingProfile = {
      ...NO_TAX,
      salaryByMonth: ['0', '0', '0', '0', '0', '8000', '0', '0', '0', '0', '0', '0'],
      salaryMode: 'gross',
      spendCats: [{ id: 'rent', tier: 'critical', bucket: 'fixed', amount: '1000', unit: 'dollar' }],
    };
    const grid = savingsByMonth(op);
    expectAllFinite(grid, 'one-month job');
    expect(grid.filter((m) => m.amount > 0)).toHaveLength(1);      // only the working month is positive
    expect(grid.filter((m) => m.amount < 0)).toHaveLength(11);     // every other month runs a deficit
  });
});
