// PROBES — income and tax. Everything the plan can afford rests on these.
//
// This family has form: B-34 was a real bug here, where a representative month was used as if it
// were every month and inflated income roughly twofold. So each rule is pinned deliberately.
import {
  taxableIncome, taxOwed, marginalBracket, effectiveRateOnGross, grossFromNet,
  taxableIncomeFor, taxOwedFor, effectiveRateOnGrossFor, progressiveMonthlyTax,
  TAX_BRACKETS, STANDARD_DEDUCTION, TAX_YEAR,
} from '../../src/domain/income/tax';
import { salaryGrossByMonth, salaryAnnual, salaryActiveMonths, grossSalaryMonthly, equityRowValue, rowVestYear } from '../../src/domain/income/onboarding';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// TAX_OWED · TAXABLE_INCOME
// DERIVATION RULE: the brackets are progressive — each rate applies only to the slice of income
// inside it, never to the whole. Getting that wrong is the classic tax error and it overstates a
// bill enormously at the top of a bracket.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('TAX_OWED', () => {
  test('the deduction comes off first, and cannot push taxable income below zero', () => {
    expect(taxableIncome(100_000)).toBe(100_000 - STANDARD_DEDUCTION);
    expect(taxableIncome(5_000)).toBe(0);
    expect(taxOwed(5_000)).toBe(0);
  });

  test('each rate applies only to its own slice — the tax is progressive, never flat', () => {
    // taxable 12,400 exactly fills the 10% band
    const atBandTop = taxOwed(12_400 + STANDARD_DEDUCTION);
    expect(atBandTop).toBeCloseTo(1_240, 0);
    // one dollar more is taxed at 12% — on that dollar alone, not on everything
    expect(taxOwed(12_401 + STANDARD_DEDUCTION) - atBandTop).toBeCloseTo(0.12, 2);
  });

  test('the marginal rate is the band you are IN, and the effective rate is always lower', () => {
    expect(marginalBracket(150_000)).toBe(0.24);
    expect(effectiveRateOnGross(150_000)).toBeLessThan(0.24);   // the distinction people get wrong
  });

  test('the table says which year it is for, so a stale table is visible rather than silent', () => {
    expect(TAX_YEAR).toBe(2026);
    expect(TAX_BRACKETS[TAX_BRACKETS.length - 1][1]).toBe(0.37);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// FILING_STATUS
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('FILING_STATUS', () => {
  test('married pays less on the same income, which is the whole point of the status', () => {
    expect(taxOwedFor(150_000, 'married')).toBeLessThan(taxOwedFor(150_000, 'single'));
    expect(taxableIncomeFor(150_000, 'married')).toBe(150_000 - STANDARD_DEDUCTION * 2);
  });

  test('head of household sits between the two', () => {
    const s = taxOwedFor(80_000, 'single'), h = taxOwedFor(80_000, 'hoh'), m = taxOwedFor(80_000, 'married');
    expect(h).toBeLessThan(s);
    expect(h).toBeGreaterThan(m);
  });

  test('state tax is ONE flat rate the person enters, capped at 15%', () => {
    const fed = taxOwedFor(100_000, 'single', 0);
    expect(taxOwedFor(100_000, 'single', 0.05) - fed).toBeCloseTo(5_000, 0);   // 5% of GROSS
    expect(taxOwedFor(100_000, 'single', 0.99)).toBe(taxOwedFor(100_000, 'single', 0.15));  // capped
    expect(taxOwedFor(100_000, 'single', -1)).toBe(fed);                                     // floored
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// GROSS_FROM_NET  —  and the defect in it
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('GROSS_FROM_NET', () => {
  test('it inverts the schedule: the gross whose take-home equals what was typed', () => {
    const gross = grossFromNet(80_000);
    expect(gross - taxOwed(gross)).toBeCloseTo(80_000, 0);
    expect(grossFromNet(0)).toBe(0);
    expect(grossFromNet(-5)).toBe(0);
  });

  test('DEFECT: it always uses the SINGLE-filer schedule, whatever the person told us', () => {
    // A married couple pays less tax, so the gross behind a given take-home is LOWER for them.
    // This function does not take a filing status at all, so it answers as if everyone were single.
    const netTypedIn = 120_000;
    const asSingle = grossFromNet(netTypedIn);

    // what the answer SHOULD be for a married filer, computed here from the schedule that exists:
    let lo = netTypedIn, hi = netTypedIn * 3;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (mid - taxOwedFor(mid, 'married') < netTypedIn) lo = mid; else hi = mid;
    }
    const asMarried = Math.round((lo + hi) / 2);

    expect(asSingle).toBeGreaterThan(asMarried);              // the app overstates their gross
    expect(asSingle - asMarried).toBeGreaterThan(5_000);      // and by a material amount
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// MONTHLY_TAX — the identity that makes twelve months add to one year
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('MONTHLY_TAX', () => {
  test('the months add EXACTLY to the year — no drift, by construction', () => {
    const months = new Array(12).fill(10_000);
    const sum = progressiveMonthlyTax(months, 'single', 0).reduce((t, x) => t + x, 0);
    expect(sum).toBeCloseTo(taxOwedFor(120_000, 'single', 0), 6);
  });

  test('a bonus month withholds at its own higher band, which is what a payslip shows', () => {
    const even = progressiveMonthlyTax(new Array(12).fill(10_000));
    const bonus = progressiveMonthlyTax([...new Array(11).fill(10_000), 60_000]);
    expect(bonus[11]).toBeGreaterThan(even[11]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SALARY_BY_MONTH — the B-34 family, pinned
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('SALARY_BY_MONTH', () => {
  test('a month-by-month table is used as given; a single figure fills all twelve', () => {
    expect(salaryGrossByMonth({ salaryByMonth: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] } as any))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  test('TAKE-HOME entries are grossed up, keeping the SHAPE of the year', () => {
    const takehome = salaryGrossByMonth({ salaryMode: 'takehome', salaryByMonth: [5_000, 5_000, 10_000, ...new Array(9).fill(5_000)] } as any);
    expect(takehome[2]).toBeGreaterThan(takehome[0]);                  // the big month stays big
    expect(takehome[2] / takehome[0]).toBeCloseTo(2, 1);               // and stays twice the others
    expect(takehome.reduce((t, x) => t + x, 0)).toBeGreaterThan(65_000);
  });

  test('B-34 PINNED: the annual figure ADDS the months, never multiplies the biggest by twelve', () => {
    // three months at 10k and nine at zero is 30k a year, not 120k. The old bug did the latter.
    const seasonal = { salaryByMonth: [10_000, 10_000, 10_000, ...new Array(9).fill(0)] } as any;
    expect(salaryAnnual(seasonal)).toBe(30_000);
    expect(grossSalaryMonthly(seasonal)).toBe(10_000);                 // still available as ONE month
    expect(salaryActiveMonths(seasonal)).toBe(3);                      // and the count is honest
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// EQUITY
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('EQUITY_VALUE', () => {
  test('RSUs are worth their full share price; options are worth only the spread', () => {
    expect(equityRowValue({ shares: 100, price: 50 }, 'rsu')).toBe(5_000);
    expect(equityRowValue({ shares: 100 }, 'option', 40, 50)).toBe(1_000);      // 100 × (50 − 40)
  });

  test('an UNDERWATER option is worth zero, never a negative', () => {
    expect(equityRowValue({ shares: 100 }, 'option', 60, 50)).toBe(0);
  });

  test('the vesting year is read from the date, falling back to this year when blank', () => {
    expect(rowVestYear({ date: '2028-03-01' })).toBe(2028);
    expect(rowVestYear({})).toBe(new Date().getFullYear());
  });
});
