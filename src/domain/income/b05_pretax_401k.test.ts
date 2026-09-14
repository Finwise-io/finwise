/* B05 — a traditional 401(k) is taken from pay BEFORE tax.
 *
 * Founder audit 2026-08-26. The taxable base was built from salary, tips, rental, equity, bonus,
 * signing and other income, and the 401(k) was never taken off it. It came off take-home one
 * function later, AFTER tax — so the app charged tax on money that never reached the person, and
 * the same wrong base set the withholding rate for every month.
 *
 * These are laws, not examples: they must hold for every input, which is rung 5 of the
 * verification standard. The identity is the one that matters — gross pay, less what went into the
 * 401(k), IS taxable income. If that ever stops holding, something is being taxed twice or not at
 * all, and no worked example would necessarily show it.
 */
import { taxableByCalendarMonth, incomeMonthlyGrid } from './onboarding';

const NOW = new Date('2026-06-15T00:00:00Z');
const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
const gridTotal = (op: any, mode: any) =>
  sum(incomeMonthlyGrid(op, mode, NOW).map((m: any) => m.amount));

const person = (c401kMonthly: number) => ({
  salaryByMonth: new Array(12).fill(10_000),   // $120,000/year
  c_401k: c401kMonthly,
  taxMode: 'auto',
});

describe('B05 — the 401(k) comes off before tax', () => {
  it('THE LAW: gross pay minus the 401(k) is taxable income, whatever the numbers', () => {
    for (const monthly of [0, 250, 1_000, 1_666.67, 3_000]) {
      const op = person(monthly);
      const taxable = sum(taxableByCalendarMonth(op as any, NOW));
      const gross = gridTotal(op, 'gross');
      expect(gross - monthly * 12).toBeCloseTo(taxable, 2);
    }
  });

  it('THE LAW: the 401(k) is taken exactly once, never twice', () => {
    // take-home is taxable income less tax. If the 401(k) were subtracted a second time after tax,
    // take-home would fall by the full contribution again and this would fail.
    const none = gridTotal(person(0), 'available');
    const some = gridTotal(person(1_000), 'available');
    const drop = none - some;
    expect(drop).toBeGreaterThan(0);
    expect(drop).toBeLessThan(12_000);          // less than the contribution: the tax saved offsets part
  });

  it('putting money in a traditional 401(k) lowers the tax bill', () => {
    const taxedWithout = sum(taxableByCalendarMonth(person(0) as any, NOW));
    const taxedWith = sum(taxableByCalendarMonth(person(1_666.67) as any, NOW));
    expect(taxedWithout - taxedWith).toBeCloseTo(20_000, 0);
  });

  it('nobody contributes out of a month with no pay', () => {
    const op: any = { salaryByMonth: [10_000, 0, 10_000, ...new Array(9).fill(0)], c_401k: 1_000 };
    const months = taxableByCalendarMonth(op, NOW);
    expect(months[0]).toBeCloseTo(9_000, 2);    // paid: contribution comes off
    expect(months[1]).toBeCloseTo(0, 2);        // unpaid: nothing to take it from, and never negative
  });

  it('THE LAW: gross, net and take-home stay three separate stages', () => {
    // Written 2026-08-26 after the first attempt at this fix collapsed net into take-home. The
    // reasoning was that the 401(k) is already out of the taxable base so subtracting it again
    // would double-count — true for TAKE-HOME, but it erased the middle stage and made the 401(k)
    // step of the waterfall read zero. The five laws above all passed while that was wrong; the
    // budget waterfall test is what caught it. This is that law, kept next to what perturbs it.
    const op = person(750);
    const g = gridTotal(op, 'gross');
    const n = gridTotal(op, 'net');
    const a = gridTotal(op, 'available');
    expect(g).toBeGreaterThan(n);              // gross is before tax
    expect(n).toBeGreaterThan(a);              // net is before the 401(k)
    expect(n - a).toBeCloseTo(750 * 12, 2);    // and the gap between them IS the 401(k)
  });

  it('the taxable base is never negative', () => {
    const op: any = { salaryByMonth: new Array(12).fill(500), c_401k: 5_000 };
    for (const m of taxableByCalendarMonth(op, NOW)) expect(m).toBeGreaterThanOrEqual(0);
  });
});
