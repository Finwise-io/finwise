/* Expenses — the laws. */
import { recurringDebtPayments, debtPaymentsCountedAsExpenses, actualSpending,
         isRadarItem, radar, expenses, SHOW_FIRST, type ExpensesInput } from './expenses';
import type { Debt } from '../../../src/domain/debt';

const debt = (id: string, label: string, min: number, type: any): Debt => ({
  debt_id: id as any, label, debt_type: type, remaining_balance: 50_000,
  interest_rate_apr: 0.06, minimum_monthly_payment: min,
} as Debt);

const base = (over: Partial<ExpensesInput> = {}): ExpensesInput => ({
  ym: '2026-08',
  debts: [debt('d1', 'Mortgage', 2000, 'MORTGAGE'), debt('d2', 'Car', 250, 'AUTO'),
          debt('d3', 'HELOC', 200, 'HELOC'), debt('d4', 'Credit card', 195, 'CREDIT_CARD')],
  plannedByCategory: [{ label: 'Gas', monthly: 200 }, { label: 'Grocery', monthly: 900 },
                      { label: 'Utilities', monthly: 200 }, { label: 'Other', monthly: 700 }],
  expenses: [
    { amount: 1850, category: 'Debt payment', store: 'Credit card', date: '2026-08-18' },
    { amount: 200, category: 'Debt payment', store: 'HELOC', date: '2026-08-03' },
    { amount: 100, category: 'Other', store: 'Amazon', date: '2026-08-18' },
    { amount: 65, category: 'Grocery', store: 'Trader Joes', date: '2026-08-16' },
    { amount: 60, category: 'Gas', store: 'Shell', date: '2026-08-14' },
    { amount: 42, category: 'Other', store: 'CVS', date: '2026-08-11' },
    { amount: 38, category: 'Other', store: 'Starbucks', date: '2026-08-09' },
    { amount: 88, category: 'Grocery', store: 'Costco', date: '2026-08-07' },
  ],
  bigBills: [{ label: 'Car insurance renewal', amount: 1180, dueLabel: 'September' }],
  ...over,
});

describe('recurring debt', () => {
  it('THE LAW: only installment debt is recurring — a card and a HELOC never are', () => {
    const r = recurringDebtPayments(base()).map((x) => x.label);
    expect(r).toEqual(['Mortgage', 'Car']);
    expect(r).not.toContain('Credit card');
    expect(r).not.toContain('HELOC');
  });
});

describe('the radar', () => {
  it('THE LAW: a mortgage is NEVER a radar item, however large', () => {
    const big = debt('d9', 'Mortgage', 9999, 'MORTGAGE');
    expect(isRadarItem(big)).toBeNull();
    expect(radar(base()).some((r) => r.label === 'Mortgage')).toBe(false);
    expect(radar(base()).some((r) => r.label === 'Car')).toBe(false);
  });

  it('THE LAW: a credit-card and a HELOC payment ALWAYS are', () => {
    const labels = radar(base()).map((r) => r.label);
    expect(labels).toContain('Credit card payment');   // named as the drawing names it (cash-flow_v01, frame C)
    expect(labels).toContain('HELOC payment');
  });

  it('the unusual card payment is the one shown — $1,850 against a usual $195', () => {
    const card = radar(base()).find((r) => r.label === 'Credit card payment')!;
    expect(card.amount).toBe(1850);        // what was actually paid, not the minimum
  });

  it('THE LAW: when a card’s purchases are imported, its payment is NOT counted as an expense', () => {
    const captured = new Set(['d4']);
    const card = radar(base(), captured).find((r) => r.label === 'Credit card payment')!;
    expect(card.countedAsExpense).toBe(false);
    expect(card.note).toContain('NOT counted');
    expect(debtPaymentsCountedAsExpenses(base(), captured).some((d) => d.label === 'Credit card payment')).toBe(false);
  });

  it('and when they are not, it IS counted — the payment is the only record of that spending', () => {
    const card = radar(base()).find((r) => r.label === 'Credit card payment')!;
    expect(card.countedAsExpense).toBe(true);
    expect(debtPaymentsCountedAsExpenses(base()).map((d) => d.label)).toEqual(['HELOC payment', 'Credit card payment']);
  });

  it('a large non-debt bill is a radar item; a small one is not', () => {
    expect(radar(base()).some((r) => r.label === 'Car insurance renewal')).toBe(true);
    const small = base({ bigBills: [{ label: 'Netflix', amount: 18, dueLabel: 'September' }] });
    expect(radar(small).some((r) => r.label === 'Netflix')).toBe(false);
  });
});

describe('actual spending', () => {
  it('THE LAW: five are shown and the count and total are never hidden', () => {
    const a = actualSpending(base());
    expect(a.shown.length).toBe(SHOW_FIRST);
    expect(a.items.length).toBe(6);
    expect(a.hidden).toBe(1);
    expect(a.shown.reduce((t, e) => t + Number(e.amount), 0) + a.hiddenTotal).toBeCloseTo(a.total, 2);
  });

  it('THE LAW: a debt payment is never in the spending list', () => {
    expect(actualSpending(base()).items.some((e) => e.category === 'Debt payment')).toBe(false);
  });

  it('most recent first', () => {
    const d = actualSpending(base()).items.map((e) => e.date);
    expect(d).toEqual([...d].sort().reverse());
  });
});

describe('the orchestrator', () => {
  it('one call returns every section', () => {
    const s = expenses(base());
    expect(s.recurringDebtTotal).toBeCloseTo(2250, 2);       // 2000 + 250
    expect(s.plannedTotal).toBeCloseTo(2000, 2);             // 200+900+200+700
    expect(s.actual.total).toBeCloseTo(393, 2);              // 100+65+60+42+38+88
    expect(s.actualTotal).toBeCloseTo(393 + 200 + 1850, 2);  // + the two debt payments counted
  });

  it('THE LAW: the sections add up to the total shown', () => {
    const s = expenses(base());
    expect(s.actual.total + s.debtCountedAsExpense.reduce((t, d) => t + d.amount, 0))
      .toBeCloseTo(s.actualTotal, 2);
  });

  it('THE LAW: recurring debt is never inside actual expenses', () => {
    const s = expenses(base());
    const names = s.debtCountedAsExpense.map((d) => d.label);
    expect(names).not.toContain('Mortgage');
    expect(names).not.toContain('Car');
  });
});
