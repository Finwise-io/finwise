/* This month — the laws.
 *
 * Built on the founder's own sheet (cashflow-thismonth+spending-screen-jj.xlsx) with its two
 * surpluses corrected: every row listed is a row deducted, so planned is 350 and actual is 900.
 */
import { plannedMonthFlow, actualMonthFlow, debtPaymentsByDebt, thisMonth, type MonthInput } from './this-month';
import type { Debt } from '../../../src/domain/debt';

const debt = (id: string, label: string, min: number, type: any = 'MORTGAGE'): Debt => ({
  debt_id: id as any, label, debt_type: type, remaining_balance: 100_000,
  interest_rate_apr: 0.05, minimum_monthly_payment: min,
} as Debt);

const sheet = (over: Partial<MonthInput> = {}): MonthInput => ({
  ym: '2026-08',
  takeHomeMonthly: 5000,
  debts: [debt('d1', 'Mortgage', 2000), debt('d2', 'Car', 250, 'AUTO'),
          debt('d3', 'HELOC', 200, 'HELOC'), debt('d4', 'Credit card', 200, 'CREDIT_CARD')],
  plannedExpenses: 2000,
  expenses: [
    { amount: 2000, category: 'Debt payment', store: 'Mortgage', date: '2026-08-01' },
    { amount: 200, category: 'Debt payment', store: 'HELOC', date: '2026-08-03' },
    { amount: 200, category: 'Debt payment', store: 'Credit card', date: '2026-08-05' },
    { amount: 500, category: 'Grocery', store: 'Safeway', date: '2026-08-12' },
  ],
  ...over,
});

describe('the plan', () => {
  it("THE LAW: every row shown is a row deducted — the surplus IS the sum of the lines", () => {
    const p = plannedMonthFlow(sheet());
    expect(p.surplus).toBeCloseTo(p.lines.reduce((t, l) => t + l.amount, 0), 2);
  });

  it("the founder's sheet: 5000 − 2000 − 250 − 200 − 200 − 2000 = 350", () => {
    expect(plannedMonthFlow(sheet()).surplus).toBeCloseTo(350, 2);
  });

  it('THE LAW: each debt is its own line, never lumped together', () => {
    const p = plannedMonthFlow(sheet());
    const names = p.lines.filter((l) => l.kind === 'debt').map((l) => l.label);
    expect(names).toEqual(['Mortgage', 'Car', 'HELOC', 'Credit card']);
    expect(names.some((n) => /bills \+ debt/i.test(n))).toBe(false);
  });
});

describe('what actually happened', () => {
  it("THE LAW: the surplus IS the sum of the lines here too", () => {
    const a = actualMonthFlow(sheet());
    expect(a.surplus).toBeCloseTo(a.lines.reduce((t, l) => t + l.amount, 0), 2);
  });

  it("the founder's sheet: 5000 − 2000 − 0 − 200 − 200 − 500 = 2100", () => {
    // the car is unpaid, and only what was logged counts
    expect(actualMonthFlow(sheet()).surplus).toBeCloseTo(2100, 2);
  });

  it('THE LAW: a debt nobody has paid shows at zero — it is never dropped', () => {
    const a = actualMonthFlow(sheet());
    const car = a.lines.find((l) => l.label === 'Car');
    expect(car).toBeDefined();
    expect(car!.amount).toBe(0);
    expect(Object.is(car!.amount, -0)).toBe(false);   // never "−$0" on a screen
    expect(car!.paid).toBe(false);
    expect(car!.note).toBe('not paid yet');
  });

  it('THE LAW: a debt payment is never counted as spending as well', () => {
    const a = actualMonthFlow(sheet());
    const spent = a.lines.find((l) => l.kind === 'spend');
    expect(spent!.amount).toBe(-500);          // the 2,400 of debt payments is NOT in here
  });

  it('THE LAW: payments are attributed to the debt they were made against', () => {
    const paid = debtPaymentsByDebt(sheet());
    expect(paid.get('d1' as any)).toBe(2000);
    expect(paid.get('d3' as any)).toBe(200);
    expect(paid.has('d2' as any)).toBe(false);   // the car was not paid
  });

  it('a payment against a debt that no longer exists is ignored, not crashed on', () => {
    const m = sheet({ expenses: [{ amount: 900, category: 'Debt payment', store: 'Boat loan', date: '2026-08-02' }] });
    expect(() => actualMonthFlow(m)).not.toThrow();
    expect(debtPaymentsByDebt(m).size).toBe(0);
  });

  it('last month’s logged spending never lands in this month', () => {
    const m = sheet({ expenses: [{ amount: 999, category: 'Grocery', store: 'x', date: '2026-07-30' }] });
    expect(actualMonthFlow(m).lines.find((l) => l.kind === 'spend')!.amount).toBe(0);
  });
});

describe('the orchestrator', () => {
  it('one call returns both blocks, and they never share a row', () => {
    const t = thisMonth(sheet());
    expect(t.planned.surplus).toBeCloseTo(350, 2);
    expect(t.actual.surplus).toBeCloseTo(2100, 2);
    expect(t.planned.lines).not.toBe(t.actual.lines);
  });

  it('THE LAW: planned and actual are computed from different things and may differ', () => {
    // the plan assumes every debt paid; actual counts only what was. They must not be equal here.
    const t = thisMonth(sheet());
    expect(t.planned.surplus).not.toBeCloseTo(t.actual.surplus, 2);
  });
});
