/** THE DOOR FOR "what came in, what went out, and the surplus" — MK-CF-O-010 theMonth (Q-CF-2).
 *
 *  Read from the approved design (cash-flow_v01): the flow is SPELLED OUT, planned and actual, and
 *  every row shown is a row deducted. The Expenses detail hangs off one row of it, not beside it.
 */
import { theMonth } from './the-month';

const ym = '2026-08';
const input = () => ({
  ym,
  takeHomeMonthly: 5000,
  inflowSources: ['Salary'],
  debts: [
    { debt_id: 'm', label: 'Mortgage payment', debt_type: 'MORTGAGE', remaining_balance: 300000, minimum_monthly_payment: 2000, interest_rate_apr: 0.06 },
    { debt_id: 'c', label: 'Car payment', debt_type: 'AUTO', remaining_balance: 9800, minimum_monthly_payment: 250, interest_rate_apr: 0.064 },
  ],
  plannedExpenses: 2000,
  expenses: [
    { amount: 500, category: 'Other', date: `${ym}-18` },
    { amount: 200, category: 'Debt payment', date: `${ym}-05`, notes: 'HELOC' },
  ],
} as any);

test('THE FLOW IS SPELLED OUT — planned is a line per thing, not three numbers', () => {
  const m = theMonth(input());
  const labels = m.planned.lines.map((l) => l.label);
  expect(labels[0]).toMatch(/^Inflow \(/);          // the inflow names its sources
  expect(labels).toContain('Mortgage payment');      // each debt by name
  expect(labels).toContain('Car payment');
  expect(labels).toContain('Expenses');              // the budget as ONE line
  expect(m.planned.lines.length).toBeGreaterThan(3);
});

test('EVERY ROW SHOWN IS A ROW DEDUCTED — the lines sum to the surplus', () => {
  const m = theMonth(input());
  for (const block of [m.planned, m.actual]) {
    const sum = block.lines.reduce((t, l) => t + l.amount, 0);
    expect(sum).toBeCloseTo(block.surplus, 2);
  }
});

test('actual is what has really happened — its own lines, its own surplus', () => {
  const m = theMonth(input());
  expect(m.actual.lines[0].label).toMatch(/^Actual inflow \(/);
  expect(m.actual.surplus).not.toBe(m.planned.surplus);
});

test('the Expenses detail hangs off the flow — part, not a rival answer', () => {
  const m = theMonth(input());
  expect(m.expenses).toHaveProperty('recurringDebt');
  expect(m.expenses).toHaveProperty('planned');
  expect(m.expenses).toHaveProperty('actual');
  expect(m.expenses).toHaveProperty('radar');
  // and the budget it details is the same figure the flow deducts
  const budgetLine = m.planned.lines.find((l) => l.label === 'Expenses');
  expect(Math.abs(budgetLine!.amount)).toBe(2000);
});

test('nothing entered: the flow still has its shape and refuses a made-up surplus', () => {
  const m = theMonth({ ym, takeHomeMonthly: 0, debts: [], plannedExpenses: 0, expenses: [] } as any);
  expect(Array.isArray(m.planned.lines)).toBe(true);
  expect(m.planned.surplus).toBe(0);
  expect(m.expenses.actualTotal).toBe(0);
});
