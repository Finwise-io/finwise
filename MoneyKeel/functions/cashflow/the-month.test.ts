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

/* ── THE APPROVED MOCK, ROW FOR ROW (cash-flow_v01) ───────────────────────────────────────────────
 *
 *  His instruction, 2026-09-30: *"If the underlying metrics and engines does not match mock up correct
 *  them."* So this is the mock's own household, and every row and every word is asserted against what
 *  the approved file draws — not against what the code happened to do.
 *
 *  THE MOCK'S OWN CORRECTION IS THE HEADLINE. It says in as many words that the planned surplus is
 *  350 (was 750) and the actual is 900 (was 1,300), because the HELOC and the card payment must be
 *  deducted. Both figures are asserted here, so nothing can quietly drift back.
 *
 *  FIVE THINGS WERE WRONG and are fixed, none of them arithmetic:
 *    · a radar row carried no note, so a person could not see why a HELOC was deducted
 *    · an unpaid debt read "not paid yet" where the mock names the due day ("due 28th")
 *    · Actual showed ONE expenses row where the mock draws TWO, by hand and imported
 *    · nothing recorded that an expense WAS imported, so the two could not be told apart at all
 *    · "Mortgage payment"/"Car payment" in planned against "Mortgage"/"Car loan" in actual — one
 *      thing, two names. On his instruction both blocks use the debt's own name and the MOCK WAS
 *      CORRECTED to match ("use mortgage and car for both planned and actual. Update mock up").
 */
describe('cash-flow_v01 — This month, against the approved mock', () => {
  const MOCK = {
    ym: '2026-08', takeHomeMonthly: 5000, inflowSources: ['income (take-home)'],
    debts: [
      { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2000, payment_type: 'installment' },
      { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment', due_day: 28 },
      { debt_id: 'd3', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 40000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 },
      { debt_id: 'd4', label: 'Credit card debt payment', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.24, minimum_monthly_payment: 200 },
    ] as any[],
    plannedExpenses: 2000,
    plannedByCategory: [{ label: 'Rent / Mortgage', monthly: 1200 }, { label: 'Groceries', monthly: 800 }],
    expenses: [
      { amount: 2000, category: 'Debt payment', store: 'Mortgage', date: '2026-08-01' },
      { amount: 500, category: 'Groceries', date: '2026-08-07' },
      { amount: 1200, category: 'Groceries', date: '2026-08-12', origin: 'imported' },
      { amount: 200, category: 'Debt payment', store: 'HELOC', date: '2026-08-15' },
      { amount: 200, category: 'Debt payment', store: 'Credit card debt payment', date: '2026-08-20' },
    ] as any[],
  } as any;
  const rows = (b: 'planned' | 'actual') =>
    theMonth(MOCK)[b].lines.map((l: any) => [l.label, l.note ?? '', l.amount]);

  test("PLANNED reads exactly as the mock draws it, and = Planned surplus is the mock's corrected 350", () => {
    expect(rows('planned')).toEqual([
      // THE DRAWING'S ORDER (frame A), read off it line by line on 2026-10-03: the budget sits between
      // the every-month debts and the radar's items. This list had the budget last and the inflow with
      // no words under it while its title said "exactly as the mock draws it" — it was not.
      ['Inflow (income (take-home))', 'after tax and 401(k)', 5000],
      ['Mortgage', 'debt', -2000],
      ['Car loan', 'debt', -250],
      ['Expenses', 'your budget', -2000],
      ['HELOC', 'from big-ticket radar', -200],
      ['Credit card debt payment', 'from big-ticket radar', -200],
    ]);
    expect(theMonth(MOCK).planned.surplus).toBe(350);        // the mock: 350, was 750
  });

  test("ACTUAL reads exactly as the mock draws it, and = Actual surplus so far is the mock's corrected 900", () => {
    expect(rows('actual')).toEqual([
      ['Actual inflow (income (take-home))', '', 5000],
      ['Mortgage', 'paid', -2000],
      ['Car loan', 'due 28th', 0],                            // the mock names the day, not "not paid yet"
      ['Expenses entered by hand', '', -500],                 // the drawing puts no words beside this one
      ['Expenses imported from your card', 'imported', -1200],
      ['HELOC', 'from big-ticket radar', -200],
      ['Credit card debt payment', 'from big-ticket radar', -200],
    ]);
    expect(theMonth(MOCK).actual.surplus).toBe(900);          // the mock: 900, was 1,300
  });

  test('EVERY ROW SHOWN IS A ROW DEDUCTED — either column adds to its own surplus by hand', () => {
    for (const b of ['planned', 'actual'] as const) {
      const lines = theMonth(MOCK)[b].lines;
      expect(lines.reduce((t: number, l: any) => t + l.amount, 0)).toBe(theMonth(MOCK)[b].surplus);
    }
  });

  test('a month with only hand-entered expenses keeps ONE row — no $0 imported line that means nothing', () => {
    const typedOnly = { ...MOCK, expenses: MOCK.expenses.filter((e: any) => e.origin !== 'imported') };
    const labels = theMonth(typedOnly).actual.lines.map((l: any) => l.label);
    expect(labels).toContain('Expenses entered by hand');     // worded as frame B draws it
    expect(labels).not.toContain('Expenses imported from your card');
  });

  test('NO BUDGET SET: the row reads "not set", it is no part of the sum, and there is no planned surplus to show', () => {
    const noPlan = theMonth({ ...MOCK, plannedExpenses: 0 }).planned;
    expect(noPlan.planSet).toBe(false);
    const row = noPlan.lines.find((l: any) => l.label === 'Expenses')!;
    expect([row.notSet, row.note, row.amount]).toEqual([true, 'not set', 0]);
    expect(theMonth(MOCK).planned.planSet).toBe(true);
  });

  test('and the one label rule: a debt is called the same thing in both blocks', () => {
    const p = rows('planned').filter((r) => r[1] === 'debt' || String(r[1]).includes('radar')).map((r) => r[0]);
    const a = rows('actual').filter((r) => ['paid', 'due 28th'].includes(String(r[1])) || String(r[1]).includes('radar')).map((r) => r[0]);
    expect(p).toEqual(a);
  });
});
