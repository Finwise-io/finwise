/* PART-YEAR PAY, ONE RULE — and the figures that carry it agree on every screen that prints them (2026-10-26, FIX-INCOME-A).
 *
 * The rule (DEC-7938, DEC-0176 "if they told us, that IS take-home", DEC-0376; tenets 1 and 4): a take-home and a 401(k) are each
 * a PAID month's, so the year of either is that month × the months the wage is paid. Every "/month" on Your base pay is a month
 * the wage is paid — what lands in it, the same figure the Cash flow months land and the Income summary's usual month reads.
 *
 * The household of OpenAI's worked example (Cash flow audit, parts 1 and 15): paid $60,000.30 over July to December ($10,000.05 a
 * paid month), $501.13 into a 401(k), take-home typed $3,799.17. By hand: 401(k)s 6 × $501.13 = $3,006.78; take-home 6 × $3,799.17
 * = $22,795.02; everything else taken out $60,000.30 − $3,006.78 − $22,795.02 = $34,198.50 a year, $5,699.75 a paid month (57.00%);
 * a paid month lands $10,000.05 × (1 − 0.569972…) − $501.13 = $3,799.17.
 *
 * Each figure is read from the function each screen prints it from: Your base pay (MK-CF-O-001 basePay), the Income summary
 * (MK-CF-O-004 incomeSummary), the Cash flow months (MK-XS-F-004 buildDatedGrid, which reads MK-CF-F-234 wagesLandingByMonth;
 * MK-CF-F-092 incomeMonthlyGrid), and the Tax organizer's 401(k) step (MK-PL-F-082 taxableIncomeSteps, through MK-CF-F-188).
 */
import { basePay, entryFromWage, earnerPay, deductionsFromPay, payFiguresAgree, paidMonthsOf, hoursNotEntered, grossCalendarYear, annualisedGross } from './base-pay';
import { incomeSummary } from './income-summary';
import { filingStatusOf, over65CountOf, incomeMonthlyGrid, wagesLandingByMonth, earnerWageShares, wagePaidMonths, wageGrossByMonth, householdK401ByMonth, annualizedEnteredSalary } from '../../../src/domain/income/onboarding';
import { enteredLandsAnnual, rateInForce } from '../../../src/domain/income/tax-rate';
import { householdPreTaxContributionsAnnual } from '../../../src/domain/income/earners';
import { taxableIncomeSteps } from '../../../src/domain/planning/index';
import { buildDatedGrid } from '../../../src/domain/grid/index';
import { convertTakeHomeMode } from '../../../src/domain/income/take-home-mode-migration';
import { withSalaryMonth } from '../../../src/domain/income/salary-months';

const KEYS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
const fromJuly = (perMonth: number) => Object.fromEntries(KEYS.map((k, i) => [k, i >= 6 ? perMonth : 0]));
/** the worked example's July starter, as Your base pay stores it */
const JULY: any = { whoEarns: 'you', filingStatus: 'single', birthYear: '1975', salaryFreq: 'monthly', salaryMonthMode: 'months',
  baseSalary: '10000.05', salaryByMonth: fromJuly(10000.05), c_401k: '501.13', landsTypical: '3799.17' };
/** the same shape, the take-home calculated: $10,000 a paid month, $1,000 into a 401(k) */
const CALC: any = { ...JULY, landsTypical: undefined, baseSalary: '10000', salaryByMonth: fromJuly(10000), c_401k: '1000' };
/** Your base pay exactly as BasePayScreen builds it */
const payOf = (op: any) => basePay({ earners: [{ name: 'You', entry: entryFromWage(op) }], filingStatus: filingStatusOf(op), over65: over65CountOf(op), profile: op });
/** This month's "Salary (take-home share)" row for a month of 2026, from the dated grid every Cash flow month reads */
const landedOn = (op: any, month: number): number | null => {
  const g = buildDatedGrid(op, { now: new Date(2026, month, 15, 12) });
  return g.cells[0].incomeItems.find((i) => i.source === 'Salary (take-home share)')?.amount ?? null;
};

beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-10-15T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); });
afterAll(() => { jest.useRealTimers(); });

describe('the July starter — one take-home, one 401(k) year, everywhere', () => {
  test('the year, by hand: 401(k)s $3,006.78, take-home $22,795.02, everything else $34,198.50 — and 57.00%', () => {
    expect(wagePaidMonths(JULY)).toBe(6);
    expect(paidMonthsOf(entryFromWage(JULY))).toBe(6);
    expect(householdPreTaxContributionsAnnual(JULY)).toBeCloseTo(3006.78, 6);
    expect(enteredLandsAnnual(JULY)).toBeCloseTo(22795.02, 6);
    expect(deductionsFromPay(entryFromWage(JULY))).toBeCloseTo(34198.50, 6);
    expect(rateInForce(JULY).rate).toBeCloseTo(34198.50 / 60000.30, 12);
    expect(rateInForce(JULY).label).toBe('your figures, 57.00%');   // two decimals since 2026-10-26 (MK-CF-M-081)
    expect(earnerWageShares(JULY)[0].own).toBeCloseTo(34198.50 / 60000.30, 12);
  });
  test('a paid month lands $3,799.17 on Your base pay, the Income summary, the month grid and This month; an unpaid month lands $0', () => {
    const p = payOf(JULY);
    expect(p.landsInBank).toBe(3799.17);
    expect(incomeSummary(JULY).lands.usualMonth).toBe(3799.17);
    expect(incomeSummary(JULY).lands.standoutMonth).toBeNull();
    for (let m = 6; m < 12; m++) {
      expect(wagesLandingByMonth(JULY)[m]).toBeCloseTo(3799.17, 6);
      expect(incomeMonthlyGrid(JULY, 'available')[m].amount).toBeCloseTo(3799.17, 6);
    }
    expect(wagesLandingByMonth(JULY)[0]).toBe(0);
    expect(incomeMonthlyGrid(JULY, 'available')[0].amount).toBe(0);
    expect(landedOn(JULY, 9)).toBeCloseTo(3799.17, 6);   // This month and Home, October: the row "Salary (take-home share)"
    expect(landedOn(JULY, 2)).toBeNull();                 // March, unpaid: no salary row at all
  });
  test('everything else taken out is a paid month\'s on Your base pay — $5,699.75 — and the card adds up: $10,000.05 − $501.13 − $5,699.75 = $3,799.17', () => {
    const p = payOf(JULY);
    expect(p.earners[0].pay.everythingElseMonthly).toBeCloseTo(5699.75, 6);
    expect(p.otherTakenMonthly).toBeCloseTo(5699.75, 6);
    expect(10000.05 - p.monthly401k - (p.otherTakenMonthly as number)).toBeCloseTo(p.landsInBank, 6);
    expect(p.tax.rate).toBeCloseTo(0.5699721501, 9);
    expect(payFiguresAgree(entryFromWage(JULY))).toEqual({ ok: true, warn: false, say: '' });
  });
  test('the year\'s 401(k)s are one figure: Your base pay\'s, the Income summary\'s, the month grid\'s and the Tax organizer\'s', () => {
    const p = payOf(JULY);
    const year = p.earners[0].pay.monthly401k * p.earners[0].pay.paidMonths;
    expect(year).toBeCloseTo(3006.78, 6);
    expect(incomeSummary(JULY).taxed.k401Annual).toBeCloseTo(year, 6);
    expect(householdK401ByMonth(JULY).reduce((t, m) => t + m, 0)).toBeCloseTo(year, 6);
    expect(taxableIncomeSteps(JULY, 60000.30).preTaxContributions).toBeCloseTo(year, 6);
  });
});

describe('the take-home calculated, paid July to December — a paid month\'s, everywhere', () => {
  test('$10,000 gross − $716.67 tax − $1,000 of 401(k)s = $8,283.33 a paid month, on Your base pay, the Income summary and the months', () => {
    const p = payOf(CALC);
    const r = rateInForce(CALC).rate;
    expect(r).toBeCloseTo(4300 / 60000, 12);   // single: $60,000 − $6,000 − $16,100 = $37,900 taxed: $1,240 + $25,500 × 12% = $4,300
    expect(p.landsInBank).toBeCloseTo(10000 * (1 - r) - 1000, 6);
    expect(p.landsInBank).toBeCloseTo(8283.333333, 5);
    expect(p.tax.monthly).toBeCloseTo(716.666667, 5);
    expect(p.landsNote).toBe('$10,000 gross − $717 tax − $1,000 of 401(k)s = $8,283.');
    expect(incomeSummary(CALC).lands.usualMonth).toBeCloseTo(p.landsInBank, 6);
    expect(incomeMonthlyGrid(CALC, 'available')[9].amount).toBeCloseTo(p.landsInBank, 6);
    expect(wagesLandingByMonth(CALC)[9]).toBeCloseTo(p.landsInBank, 6);
  });
  test('the band on Your base pay is the Income summary\'s: $75,000 over six months less $6,000 of 401(k)s is in the 22% band', () => {
    const band = { ...CALC, baseSalary: '12500', salaryByMonth: fromJuly(12500) };
    expect(payOf(band).tax.bracket).toBe(0.22);
    expect(incomeSummary(band).taxed.bracket).toBe(0.22);
  });
});

describe('a typed $0 take-home is the person\'s answer (tenet 5)', () => {
  const ZERO: any = { whoEarns: 'you', filingStatus: 'single', salaryFreq: 'monthly', baseSalary: '5000', c_401k: '500', landsTypical: '0' };
  test('$5,000 a month, $500 into a 401(k), take-home typed 0: take-home $0, everything else $4,500 a month · 90%', () => {
    const p = payOf(ZERO);
    expect(p.earners[0].pay.landsIsEstimated).toBe(false);
    expect(p.landsInBank).toBe(0);
    expect(p.otherTakenMonthly).toBeCloseTo(4500, 6);
    expect(p.tax.rate).toBeCloseTo(0.9, 12);
    expect(enteredLandsAnnual(ZERO)).toBe(0);
    expect(incomeMonthlyGrid(ZERO, 'available')[3].amount).toBeCloseTo(0, 6);
  });
  test('a blank box is still not entered: the take-home is calculated', () => {
    expect(payOf({ ...ZERO, landsTypical: '' }).earners[0].pay.landsIsEstimated).toBe(true);
    expect(enteredLandsAnnual({ ...ZERO, landsTypical: '' })).toBeNull();
  });
});

describe('the band reads every source (DEC-0178): Your base pay and the Income summary give one bracket', () => {
  test('$60,000 of wages and $50,000 of rent kept, single: 22% on both (the wages alone are 12%)', () => {
    const op: any = { whoEarns: 'you', filingStatus: 'single', salaryFreq: 'monthly', baseSalary: 5000,
      rentals: [{ property_id: 'h1', type: 'long', income: 50000 / 12, expenses: 0 }] };
    const p = payOf(op);
    expect(p.bandOnOneWage).toBe(0.12);
    expect(p.tax.bracket).toBe(0.22);
    expect(p.bandOnOtherIncome).toBe(true);
    expect(incomeSummary(op).taxed.bracket).toBe(p.tax.bracket);
  });
  test('six households: the two brackets agree, rent or none, one wage or two, full year or part', () => {
    const cases: any[] = [JULY, CALC,
      { whoEarns: 'you', filingStatus: 'single', salaryFreq: 'monthly', baseSalary: 5000, c_401k: 400 },
      { whoEarns: 'you', filingStatus: 'single', salaryFreq: 'monthly', baseSalary: 5000, rentals: [{ property_id: 'h', type: 'long', income: 2500, expenses: 500 }] },
      { whoEarns: 'both', filingStatus: 'married', salaryFreq: 'biweekly', baseSalary: 4200, c_401k: 1200, partnerWage: { salaryFreq: 'monthly', baseSalary: 5000, c_401k: 400 } },
      { whoEarns: 'both', filingStatus: 'married', salaryFreq: 'monthly', baseSalary: 7000, c_401k: 800, bonusAnnual: 12000, bonusMonth: 3, invAnnual: 3600,
        partnerWage: { salaryFreq: 'monthly', baseSalary: 4500, c_401k: 400 } }];
    expect(cases).toHaveLength(6);
    for (const op of cases) {
      const wages = [op, ...(op.whoEarns === 'both' ? [op.partnerWage] : [])];
      const p = basePay({ earners: wages.map((w: any, i: number) => ({ name: i ? 'Sam' : 'You', entry: entryFromWage(w) })),
        filingStatus: filingStatusOf(op), over65: over65CountOf(op), profile: op });
      expect(p.tax.bracket).toBe(incomeSummary(op).taxed.bracket);
    }
  });
});

describe('an hourly wage with no hours a week is no number (DEC-0296)', () => {
  const HOURLY: any = { whoEarns: 'you', filingStatus: 'single', salaryFreq: 'hourly', baseSalary: '25' };
  test('no hours: Your base pay says so and counts none of it; the months read $0; the year is no number', () => {
    const p = payOf(HOURLY);
    expect(hoursNotEntered(entryFromWage(HOURLY))).toBe(true);
    expect(p.hoursNotEntered).toEqual(['You']);
    expect(p.earners[0].pay.grossAnnualised).toBe(0);
    expect(p.nothingEntered).toBe(false);
    expect(wageGrossByMonth(HOURLY)).toEqual(new Array(12).fill(0));
    expect(annualizedEnteredSalary(HOURLY)).toBeNull();
    expect(grossCalendarYear(entryFromWage(HOURLY))).toEqual(new Array(12).fill(0));
  });
  test('40 hours entered: $25 × 40 × 52 ÷ 12 = $4,333.33 a month on Your base pay and in the months; 0 hours is $0', () => {
    const at40 = { ...HOURLY, hoursPerWeek: '40' };
    expect(payOf(at40).hoursNotEntered).toEqual([]);
    expect(annualisedGross(entryFromWage(at40))).toBeCloseTo(52000, 6);
    expect(wageGrossByMonth(at40)[0]).toBeCloseTo(4333.333333, 5);
    expect(annualizedEnteredSalary(at40)).toBe(52000);
    expect(annualisedGross(entryFromWage({ ...HOURLY, hoursPerWeek: '0' }))).toBe(0);
    expect(hoursNotEntered(entryFromWage({ ...HOURLY, hoursPerWeek: '0' }))).toBe(false);
  });
});

describe('a warning never hides a month that cannot be right (MK-CF-F-146, tenet 1)', () => {
  test('January $10,000.17 − $1,000.13 − $2,000.19 warns; February $3,000.17 − $500.13 − $2,800.19 = −$300.15 fails the check', () => {
    const v = payFiguresAgree({ freq: 'monthly', varies: true, grossTypical: 0, monthly401k: 500.13,
      grossByMonth: { '2026-01': 10000.17, '2026-02': 3000.17 }, landsByMonth: { '2026-01': 2000.19, '2026-02': 2800.19 } });
    expect(v.ok).toBe(false);
    expect(v.say).toContain('These three cannot all be right in February 2026');
    expect(v.say).toContain('$300');
    // and Your base pay's Save waits on it
    expect(earnerPay({ freq: 'monthly', varies: true, grossTypical: 0, monthly401k: 500.13,
      grossByMonth: { '2026-01': 10000.17, '2026-02': 3000.17 }, landsByMonth: { '2026-01': 2000.19, '2026-02': 2800.19 } }).verdict.ok).toBe(false);
  });
  test('a warning alone still warns, and the check passes', () => {
    const v = payFiguresAgree({ freq: 'monthly', varies: false, grossTypical: 10000, monthly401k: 1000, landsTypical: 2000 });
    expect(v).toMatchObject({ ok: true, warn: true });
  });
});

describe('a take-home typed before 2026-08-28 with a 401(k), no rate of their own (MK-CF-F-186, DEC-7942)', () => {
  test('$4,211.17 a month, $511.43 into a 401(k): gross $61,084.93 a year, and gross − 401(k) − tax = the take-home typed', () => {
    const out: any = convertTakeHomeMode({ salaryMode: 'takehome', baseSalary: '4211.17', salaryFreq: 'monthly', c_401k: '511.43' });
    expect(Number(out.baseSalary) * 12).toBeCloseTo(61084.9327272727, 6);
    expect(Number(out.landsTypical)).toBeCloseTo(4211.17, 6);
    const r = rateInForce({ ...out, whoEarns: 'you' });
    expect(r.source).toBe('implied');
    expect(r.rate).toBeCloseTo((61084.9327272727 - 6137.16 - 50534.04) / 61084.9327272727, 6);   // 7.23%
  });
});

describe('a cleared month is not entered (the lead\'s ruling 1; MK-CF-F-169, MK-CF-F-165)', () => {
  test('withSalaryMonth with a blank amount takes the month out; a typed 0 stays $0', () => {
    expect(withSalaryMonth({ salaryByMonth: { '2026-10': 5000, '2026-11': 5000 } } as any, '2026-10', '')).toEqual({ '2026-11': 5000 });
    expect(withSalaryMonth({ salaryByMonth: { '2026-10': 5000 } } as any, '2026-10', '0')).toEqual({ '2026-10': 0 });
  });
});
