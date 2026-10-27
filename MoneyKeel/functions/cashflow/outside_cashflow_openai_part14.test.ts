/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow module, OpenAI independent audit of 2026-10-24, PART 14 of 19
 * ("this month — the plan and what has happened").
 * Cards: MK-CF-O-010 theMonth · MK-CF-O-003 thisMonth · MK-CF-F-227 thisMonthInputs · MK-CF-F-226 datedGridOf ·
 * MK-CF-F-225 useCashflowModel · MK-CF-F-156 plannedMonthFlow · MK-CF-F-005 actualMonthFlow · MK-CF-F-220 pastMonthFlow ·
 * MK-CF-F-231 addedAfterRecord · MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-155 cash · MK-CF-F-192 inflowLabel ·
 * MK-CF-F-193 inflowSourceWord · MK-CF-F-194 monthOutflow · MK-CF-F-148 inMonth.
 *
 * THIS FILE'S SHARE (CFR-4, 2026-10-25): part 14's cases (75), formula_checks (15; 7 not RIGHT) and rules_held (24; 2 NOT
 * HELD, 15 CANNOT TELL, 7 HELD). Results, item by item:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part14_results.json
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_14.json. Every expected answer is READ
 * FROM THE PACKAGE (C(case_id).expected), never retyped; only its plain input names are mapped onto the app's fields.
 *
 * MEASURED ONLY 2026-10-25: no app code, record, drawing or other test was changed.
 * FIXED 2026-10-25 (FIX-MONTH): F-156 / O-003 / O-010 C05, F-227-C03, F-226-C04, F-225-C05 (and its return, the lead's ruling 2),
 * F-157-C05, F-220's "Frozen" words and F-231-C05 now give the reviewer's answer; each old answer is kept beside it as test.failing.
 *
 * Markers: AGREE — test on the reviewer's answer · APP WRONG — test.failing on the reviewer's answer (it turns red when the
 * app is fixed) · REVIEWER WRONG — a plain test pinning the app's hand-checked answer, the decision or code fact in its
 * name · NEEDS RULING — the app's answer pinned, both readings in the results file · BLOCKED — test.skip naming what is
 * missing · OUTSIDE DOMAIN — a plain test recording what the app does with an input no caller can send, the caller cited.
 * A case with parts that agree and a part that does not runs twice: the wrong part as test.failing, the rest as a
 * "· the parts that agree" test.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   take_home → MonthInput.takeHomeMonthly (the dated grid's take-home for the month, after tax and 401(k)).
 *   debt_due / debt_paid (one debt) → one instalment debt "Car loan" (payment_type 'installment', minimum_monthly_payment =
 *   debt_due) and, when debt_paid > 0, one logged expense { category 'Debt payment', store 'Car loan', amount debt_paid } —
 *   the row BudgetScreen.tsx:391 and MoneySheets.tsx:211 write when a payment is logged.
 *   debts [{ id, name, payment, shape, paid, due_date }] → Debt { debt_id: id, label: name, payment_type 'installment' or
 *   'revolving', minimum_monthly_payment: payment, due_day: the day of due_date } and, when paid > 0, a 'Debt payment' log
 *   with store = name. debt_type is read from the name (Mortgage → MORTGAGE, HELOC → HELOC, Card/Visa → CREDIT_CARD,
 *   else AUTO / PERSONAL) — only the shape decides a row's place.
 *   budget / budget_set → plannedExpenses / budgetSet (budget null → plannedExpenses 0 with budgetSet false, as the app
 *   receives "no budget" from thisMonthInputs: plannedMonthlySpend(profile) = 0).
 *   manual_expenses → one logged expense typed by hand; imported_purchases / imported_expenses → one logged expense with
 *   origin 'imported'. goal_commitment → commitments [{ monthlyAmount }].
 *   thisMonthInputs grid [{ month, in, bills }] → a dated-grid cell { calendarMonth, year, inflow: in, incomeItems: one
 *   take-home line, billItems: one 'bill' line of `bills` }; plan_has_december_bill → a profile whose only budget line is a
 *   $1,200 once-a-year bill in December (spendCats nonmonthly, months [12]).
 *   datedGridOf: independent_monthly_net → a take-home-only profile paying that amount each month with nothing planned
 *   (baseSalary, salaryMode 'takehome', manual 0% — the worked example's own shape in this-month.ts, MK-CF-F-237);
 *   conversion_tax → the stored rothConversionTax the Roth screen saves on adoption (RothScreen.tsx:121), read at as_of.
 *   useCashflowModel (a React hook) is called directly with React's useMemo run inline and the store mocked to the case's
 *   values; what it hands MK-CF-F-107 buildPaycheckYear and MK-XS-F-004 buildDatedGrid is read off their spies — the
 *   simulation inputs and the profile, exactly as the hook builds them. Nothing else in the hook is replaced.
 *   pastMonthFlow / monthOutflow saved { expenses, debt_paid, take_home, saved_at } → the month's record { spending,
 *   debt_paid, income_net, captured_at } (the field names makeMonthlySnapshot writes, src/domain/history.ts);
 *   later_expenses [{ id, date, created_at, amount }] → logged expenses { id, date, createdAt, amount }.
 *   debtPaymentsByDebt logs [{ date, payee, amount, category }] → LoggedExpense { date, store: payee, amount, category }.
 *   cash / inflowLabel / inflowSourceWord / inMonth take the package's values as they are ("-0" read as the number −0).
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo(Number(exact), 6)); rates to 1e-12; strings exact; REFUSES = the app gives
 * no number (null, undefined or NaN), never 0. The package's "shown" strings are display policy and are not asserted.
 */
import * as fs from 'fs';
import * as path from 'path';

// the hook runs outside a render: its useMemo is run inline, its store is the case's (nothing else in it is replaced)
jest.mock('react', () => ({ ...jest.requireActual('react'), useMemo: (f: () => unknown) => f() }));
jest.mock('../../../src/store/useStore', () => ({ useStore: jest.fn() }));
// spies that record what the hook hands the paycheck and the grid, and then run the real functions
jest.mock('../../../src/domain/paycheck', () => {
  const real = jest.requireActual('../../../src/domain/paycheck');
  return { ...real, buildPaycheckYear: jest.fn((...a: unknown[]) => real.buildPaycheckYear(...a)) };
});
jest.mock('../../../src/domain/grid', () => {
  const real = jest.requireActual('../../../src/domain/grid');
  return { ...real, buildDatedGrid: jest.fn((...a: unknown[]) => real.buildDatedGrid(...a)) };
});

import { theMonth } from './the-month';
import {
  thisMonth, plannedMonthFlow, actualMonthFlow, pastMonthFlow, addedAfterRecord, debtPaymentsByDebt, cash, inflowLabel,
  inflowSourceWord, monthOutflow, type MonthInput,
} from './this-month';
import { inMonth } from './logged-expenses';
import type { ExpensesInput } from './expenses';
import { useCashflowModel, datedGridOf, thisMonthInputs } from '../../../src/hooks/useCashflowModel';
import { useStore } from '../../../src/store/useStore';
import { buildPaycheckYear } from '../../../src/domain/paycheck';
import { buildDatedGrid } from '../../../src/domain/grid';
import { plannedMonthlySpend } from '../../../src/domain/budget';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREE' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS RULING' | 'BLOCKED' | 'OUTSIDE DOMAIN';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_14.json');
const PART = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const C = (caseId: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === caseId);
  if (!c) throw new Error(`no case ${caseId} in the package`);
  return c;
};
const RAN: string[] = [];
const MARKS: Record<string, Mark> = {};
/** what the app gave, case by case — written to CFR_DUMP (when set) so the results file carries the measured answers */
const ACTUAL: Record<string, unknown> = {};
const rec = (key: string, v: unknown) => { ACTUAL[key] = v; return v; };
const runner = (mark: Mark) => (mark === 'APP WRONG' ? test.failing : mark === 'BLOCKED' ? test.skip : test);
const kase = (caseId: string, mark: Mark, fn: (c: any) => void, note?: string) => {
  RAN.push(caseId);
  MARKS[caseId] = mark;
  const c = C(caseId);
  runner(mark)(`${caseId} · ${c.kind} · ${c.title} [${mark}]${note ? ` — ${note}` : ''}`, () => fn(c));
};
/** the parts of a case that agree, when another part of the same case does not */
const agreeingParts = (caseId: string, fn: (c: any) => void, what: string) =>
  test(`${caseId} · the parts that agree — ${what} [AGREE]`, () => fn(C(caseId)));
afterAll(() => {
  if (process.env.CFR_DUMP) fs.writeFileSync(process.env.CFR_DUMP, JSON.stringify({ actual: ACTUAL, marks: MARKS }, null, 1));
});

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const num = (v: unknown) => Number(v);
const money = (got: unknown, exp: any) => {
  expect(typeof got).toBe('number');
  expect(got as number).toBeCloseTo(Number(exp.exact), 6);
};
const refuses = (v: unknown) => expect(v == null || (typeof v === 'number' && Number.isNaN(v))).toBe(true);
const rowsAre = (lines: { amount: number }[], rows: any[]) => {
  expect(lines).toHaveLength(rows.length);
  rows.forEach((r, k) => money(lines[k].amount, r));
};
/** the case's date as the device's clock — the grid, the hook and the age read today from it */
const at = <T,>(asOf: string, fn: () => T): T => {
  jest.useFakeTimers({ now: new Date(`${asOf}T12:00:00`) });
  try { return fn(); } finally { jest.useRealTimers(); }
};

const debtTypeOf = (name: string, shape: string) =>
  /mortgage/i.test(name) ? 'MORTGAGE' : /heloc/i.test(name) ? 'HELOC' : /card|visa/i.test(name) ? 'CREDIT_CARD'
    : shape === 'revolving' ? 'PERSONAL' : 'AUTO';
const debtOf = (d: any) => ({
  debt_id: d.id, label: d.name, debt_type: debtTypeOf(String(d.name), String(d.shape)),
  payment_type: d.shape === 'revolving' ? 'revolving' : 'installment',
  remaining_balance: 10_000, interest_rate_apr: 0.06, minimum_monthly_payment: d.payment == null ? undefined : num(d.payment),
  ...(d.due_date ? { due_day: Number(String(d.due_date).slice(8, 10)) } : {}),
});
/** a plain month case (theMonth · thisMonth · plannedMonthFlow · actualMonthFlow) as the app's MonthInput */
const monthOf = (i: any): MonthInput & ExpensesInput => {
  const ym = String(i.month);
  const debts: any[] = [];
  const logs: any[] = [];
  const paid = (name: string, amount: unknown) => { if (num(amount) > 0) logs.push({ amount: num(amount), category: 'Debt payment', store: name, date: `${ym}-10` }); };
  if (Array.isArray(i.debts)) for (const d of i.debts) { debts.push(debtOf(d)); paid(d.name, d.paid); }
  else if (i.debt_due != null) { debts.push(debtOf({ id: 'car', name: 'Car loan', payment: i.debt_due, shape: 'instalment' })); paid('Car loan', i.debt_paid); }
  if (num(i.manual_expenses) > 0) logs.push({ amount: num(i.manual_expenses), category: 'Groceries', date: `${ym}-05` });
  const imported = i.imported_purchases ?? i.imported_expenses;
  if (num(imported) > 0) logs.push({ amount: num(imported), category: 'Shopping', date: `${ym}-07`, origin: 'imported' });
  const budget = i.budget == null ? 0 : num(i.budget);
  return {
    ym, takeHomeMonthly: num(i.take_home), inflowSources: ['income (take-home)'], debts, plannedExpenses: budget,
    ...(i.budget_set != null ? { budgetSet: !!i.budget_set } : {}),
    expenses: logs,
    commitments: i.goal_commitment != null ? [{ label: 'Goal', monthlyAmount: num(i.goal_commitment) }] : [],
    plannedByCategory: budget > 0 ? [{ label: 'Everyday expenses', monthly: budget }] : [],
    bigBills: [],
  } as any;
};
const cellOf = (g: any) => {
  const [y, m] = String(g.month).split('-').map(Number);
  const bills = num(g.bills);
  return { calendarMonth: m, year: y, label: '', incomeItems: [{ source: 'Salary (take-home share)', amount: num(g.in) }],
    billItems: bills > 0 ? [{ label: 'Everyday expenses', amount: bills, kind: 'bill' }] : [],
    inflow: num(g.in), outflow: bills, net: num(g.in) - bills, runningBalance: 0 };
};
const DECEMBER_BILL_ONLY = { spendCats: [{ id: 'ins', label: 'Insurance', bucket: 'nonmonthly', amount: 1200, months: [12] }] };
/** a take-home-only household: `monthly` lands each month, nothing planned (MK-CF-F-237's shape, this-month.ts) */
const payOnly = (monthly: number) => ({ status: 'employed', incomeSources: ['employment'], baseSalary: String(monthly),
  salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0', monthlySpending: '0' });
const rothBill = (g: any) => {
  for (const c of g.cells) for (const b of c.billItems) if (/Roth conversion tax/.test(b.label)) return { where: 'cells', label: b.label, amount: b.amount, date: `${c.year}-${String(c.calendarMonth).padStart(2, '0')}-01` };
  for (const l of g.later) if (/Roth conversion tax/.test(l.label)) return { where: 'later', label: l.label, amount: l.amount, date: `${l.year}-${String(l.month).padStart(2, '0')}-01` };
  return null;
};
/** the hook, run with the case's store; returns what it handed the paycheck (sim + profile) and the grid (profile) */
const hookWith = (asOf: string, store: Record<string, any>) => at(asOf, () => {
  (useStore as unknown as jest.Mock).mockReturnValue({ assetAccounts: [], liabilities: [], retirementAssumptions: {}, lensOverride: null, ...store });
  (buildPaycheckYear as unknown as jest.Mock).mockClear();
  (buildDatedGrid as unknown as jest.Mock).mockClear();
  useCashflowModel();
  const pay = (buildPaycheckYear as unknown as jest.Mock).mock.calls.at(-1)!;
  const grid = (buildDatedGrid as unknown as jest.Mock).mock.calls.at(-1)!;
  return { sim: (pay[1] as any).sim, payProfile: pay[0], gridProfile: grid[0] };
});
const pastRecord = (s: any) => ({ income_net: s.take_home == null ? null : num(s.take_home), spending: s.expenses == null ? null : num(s.expenses),
  debt_paid: s.debt_paid == null ? null : num(s.debt_paid), captured_at: s.saved_at ?? null });
const lateLogs = (xs: any[]) => (xs ?? []).map((e) => ({ id: e.id, date: e.date, createdAt: e.created_at, amount: num(e.amount), category: 'Groceries' }));
const asObject = (m: Map<string, number>) => Object.fromEntries([...m.entries()]);

// ── MK-CF-O-010 theMonth ────────────────────────────────────────────────────────────────────────────
describe('MK-CF-O-010 theMonth — five cases', () => {
  kase('MK-CF-O-010-C01', 'AGREE', (c) => {
    const m = theMonth(monthOf(c.inputs));
    rec(c.case_id, { planned_surplus: m.planned.surplus, actual_surplus: m.actual.surplus, free_after_goals: m.free });
    money(m.planned.surplus, c.expected.planned_surplus); money(m.actual.surplus, c.expected.actual_surplus); money(m.free, c.expected.free_after_goals);
  });
  kase('MK-CF-O-010-C02', 'AGREE', (c) => {
    const m = theMonth(monthOf(c.inputs));
    rec(c.case_id, { planned_surplus: m.planned.surplus, actual_surplus: m.actual.surplus });
    money(m.planned.surplus, c.expected.planned_surplus); money(m.actual.surplus, c.expected.actual_surplus);
  });
  kase('MK-CF-O-010-C03', 'AGREE', (c) => {
    const input = monthOf(c.inputs);
    const m = theMonth(input);
    rec(c.case_id, { planned: { rows: m.planned.lines.map((l) => l.amount), inflow: m.planned.inflow, outflow: m.planned.outflow, surplus: m.planned.surplus },
      actual: { rows: m.actual.lines.map((l) => l.amount), inflow: m.actual.inflow, outflow: m.actual.outflow, surplus: m.actual.surplus }, free_after_goals: m.free });
    rowsAre(m.planned.lines, c.expected.planned.rows);
    money(m.planned.inflow, c.expected.planned.inflow); money(m.planned.outflow, c.expected.planned.outflow); money(m.planned.surplus, c.expected.planned.surplus);
    rowsAre(m.actual.lines, c.expected.actual.rows);
    money(m.actual.inflow, c.expected.actual.inflow); money(m.actual.outflow, c.expected.actual.outflow); money(m.actual.surplus, c.expected.actual.surplus);
    money(m.free, c.expected.free_after_goals);
    // "same across This month and Home": Home's box is theMonth(useThisMonthInputs()).actual (HomeScreen.tsx:117) — the same door
    expect(m.actual.surplus).toBe(thisMonth(input).actual.surplus);
  });
  kase('MK-CF-O-010-C04', 'AGREE', (c) => {
    const m = theMonth(monthOf(c.inputs));
    rec(c.case_id, { planned_surplus: m.planned.surplus, actual_surplus: m.actual.surplus, goal_rows: [m.committed], free_after_goals: m.free });
    money(m.planned.surplus, c.expected.planned_surplus); money(m.actual.surplus, c.expected.actual_surplus);
    money(m.committed, c.expected.goal_rows[0]); money(m.free, c.expected.free_after_goals);
  });
  // APP WRONG (latent): with no budget the planned block says so (planSet false) and every screen prints "—" (CashFlowScreen.tsx
  // 756/765, BudgetScreen.tsx:265), but the function still hands out a planned surplus of 5,000 − 250 = $4,750 and a free figure
  // (MK-CF-M-020) of $4,750 built on a budget of $0 — tenet 3 and DEC-0296 ("an unknown input produces no number and a reason").
  kase('MK-CF-O-010-C05', 'AGREE', (c) => {
    const m = theMonth(monthOf(c.inputs));
    rec(c.case_id, { planned_surplus: m.planned.surplus, planSet: m.planned.planSet, refusal: m.planned.refusal, actual_surplus: m.actual.surplus, free_after_goals: m.free });
    refuses(m.planned.surplus); refuses(m.free);
    expect(m.planned.refusal).toMatch(/haven’t set your budget/);   // the reason, in the screen's words
  }, `${'FIXED 2026-10-25 (FIX-MONTH)'}: no budget, no planned surplus and no free figure (DEC-0296, DEC-7939)`);
  test.failing('MK-CF-O-010-C05 · the answer before the fix, kept: planned surplus and free $4,750 on a budget of $0', () => {
    const m = theMonth(monthOf(C('MK-CF-O-010-C05').inputs));
    expect(m.planned.surplus).toBe(4750); expect(m.free).toBe(4750);
  });
  agreeingParts('MK-CF-O-010-C05', (c) => {
    const m = theMonth(monthOf(c.inputs));
    expect(m.planned.planSet).toBe(false);
    money(m.actual.surplus, c.expected.actual_surplus);
  }, 'actual surplus $5,000, and the plan flagged not set');
});

// ── MK-CF-O-003 thisMonth ───────────────────────────────────────────────────────────────────────────
// thisMonth carries no "free after goals" (that is theMonth's MK-CF-M-020); with no goals it is the planned surplus, so the
// reviewer's free_after_goals is compared with planned.surplus here.
describe('MK-CF-O-003 thisMonth — five cases', () => {
  kase('MK-CF-O-003-C01', 'AGREE', (c) => {
    const m = thisMonth(monthOf(c.inputs));
    rec(c.case_id, { planned_surplus: m.planned.surplus, actual_surplus: m.actual.surplus });
    money(m.planned.surplus, c.expected.planned_surplus); money(m.actual.surplus, c.expected.actual_surplus); money(m.planned.surplus, c.expected.free_after_goals);
  });
  kase('MK-CF-O-003-C02', 'AGREE', (c) => {
    const m = thisMonth(monthOf(c.inputs));
    rec(c.case_id, { planned_surplus: m.planned.surplus, actual_surplus: m.actual.surplus });
    money(m.planned.surplus, c.expected.planned_surplus); money(m.actual.surplus, c.expected.actual_surplus);
  });
  kase('MK-CF-O-003-C03', 'AGREE', (c) => {
    const m = thisMonth(monthOf(c.inputs));
    rec(c.case_id, { planned: { rows: m.planned.lines.map((l) => l.amount), inflow: m.planned.inflow, outflow: m.planned.outflow, surplus: m.planned.surplus },
      actual: { rows: m.actual.lines.map((l) => l.amount), inflow: m.actual.inflow, outflow: m.actual.outflow, surplus: m.actual.surplus } });
    rowsAre(m.planned.lines, c.expected.planned.rows);
    money(m.planned.inflow, c.expected.planned.inflow); money(m.planned.outflow, c.expected.planned.outflow); money(m.planned.surplus, c.expected.planned.surplus);
    rowsAre(m.actual.lines, c.expected.actual.rows);
    money(m.actual.inflow, c.expected.actual.inflow); money(m.actual.outflow, c.expected.actual.outflow); money(m.actual.surplus, c.expected.actual.surplus);
    money(m.planned.surplus, c.expected.free_after_goals);
  });
  kase('MK-CF-O-003-C04', 'AGREE', (c) => {
    const input = monthOf(c.inputs);
    const m = thisMonth(input);
    // goal rows and free after goals are theMonth's (it reads the same blocks): read there, on the same input
    const whole = theMonth(input);
    rec(c.case_id, { planned_surplus: m.planned.surplus, actual_surplus: m.actual.surplus, goal_rows: [whole.committed], free_after_goals: whole.free });
    money(m.planned.surplus, c.expected.planned_surplus); money(m.actual.surplus, c.expected.actual_surplus);
    money(whole.committed, c.expected.goal_rows[0]); money(whole.free, c.expected.free_after_goals);
  });
  kase('MK-CF-O-003-C05', 'AGREE', (c) => {
    const m = thisMonth(monthOf(c.inputs));
    rec(c.case_id, { planned_surplus: m.planned.surplus, planSet: m.planned.planSet, refusal: m.planned.refusal, actual_surplus: m.actual.surplus });
    refuses(m.planned.surplus);
  }, 'FIXED 2026-10-25 (FIX-MONTH): no budget, no planned surplus (same item as MK-CF-O-010-C05)');
  test.failing('MK-CF-O-003-C05 · the answer before the fix, kept: planned.surplus $4,750', () => {
    expect(thisMonth(monthOf(C('MK-CF-O-003-C05').inputs)).planned.surplus).toBe(4750);
  });
  agreeingParts('MK-CF-O-003-C05', (c) => {
    const m = thisMonth(monthOf(c.inputs));
    expect(m.planned.planSet).toBe(false);
    money(m.actual.surplus, c.expected.actual_surplus);
  }, 'actual surplus $5,000, and the plan flagged not set');
});

// ── MK-CF-F-227 thisMonthInputs ─────────────────────────────────────────────────────────────────────
describe('MK-CF-F-227 thisMonthInputs — five cases', () => {
  kase('MK-CF-F-227-C01', 'AGREE', (c) => {
    const got = thisMonthInputs({ grid: { cells: c.inputs.grid.map(cellOf) } as any, bva: null, liabilities: [], expenses: [], ym: c.inputs.requested_month });
    rec(c.case_id, { month: got.ym, inflow: got.takeHomeMonthly, planned_bills: got.plannedExpenses });
    expect(got.ym).toBe(c.expected.month); money(got.takeHomeMonthly, c.expected.inflow); money(got.plannedExpenses, c.expected.planned_bills);
  });
  kase('MK-CF-F-227-C02', 'AGREE', (c) => {
    const got = thisMonthInputs({ grid: { cells: c.inputs.grid.map(cellOf) } as any, bva: null, profile: DECEMBER_BILL_ONLY, liabilities: [], expenses: [], ym: c.inputs.requested_month });
    rec(c.case_id, { inflow: got.takeHomeMonthly, planned_bills: got.plannedExpenses, budget_set: got.budgetSet });
    money(got.takeHomeMonthly, c.expected.inflow); money(got.plannedExpenses, c.expected.planned_bills); expect(got.budgetSet).toBe(c.expected.budget_set);
  });
  // APP WRONG (latent): the month asked for is December, the cell read is the grid's first (October). The one caller that asks for
  // another month — the Expenses tab, CashFlowScreen.tsx:408 with ym = the month picked — prints only planSet and the Expenses
  // detail from it, so no screen shows October's take-home as December's today; the object the function returns does.
  kase('MK-CF-F-227-C03', 'AGREE', (c) => {
    const got = thisMonthInputs({ grid: { cells: c.inputs.grid.map(cellOf) } as any, bva: null, liabilities: [], expenses: [], ym: c.inputs.requested_month });
    rec(c.case_id, { month: got.ym, inflow: got.takeHomeMonthly, planned_bills: got.plannedExpenses });
    expect(got.ym).toBe(c.expected.month); money(got.takeHomeMonthly, c.expected.inflow); money(got.plannedExpenses, c.expected.planned_bills);
  }, 'FIXED 2026-10-25 (FIX-MONTH): the cell of the month asked for (DEC-0345)');
  test.failing('MK-CF-F-227-C03 · the answer before the fix, kept: the first cell (October) for a December ask — $5,111.17', () => {
    const c = C('MK-CF-F-227-C03');
    const got = thisMonthInputs({ grid: { cells: c.inputs.grid.map(cellOf) } as any, bva: null, liabilities: [], expenses: [], ym: c.inputs.requested_month });
    expect(got.takeHomeMonthly).toBeCloseTo(5111.17, 6);
  });
  kase('MK-CF-F-227-C04', 'AGREE', (c) => {
    const cell = { calendarMonth: 10, year: 2026, label: '', incomeItems: [{ source: 'Salary (take-home share)', amount: num(c.inputs.inflow) }],
      billItems: c.inputs.planned_groups.map((g: string, k: number) => ({ label: `Group ${k + 1}`, amount: num(g), kind: 'bill' })),
      inflow: num(c.inputs.inflow), outflow: 0, net: 0, runningBalance: 0 };
    const got = thisMonthInputs({ grid: { cells: [cell] } as any, bva: null, liabilities: [], expenses: [], ym: c.inputs.requested_month,
      commitments: c.inputs.goals.map((g: string, k: number) => ({ label: `Goal ${k + 1}`, monthlyAmount: num(g) })) });
    const committed = theMonth(got).committed;   // the goal commitments are added up by theMonth, which reads these inputs
    rec(c.case_id, { planned_bills: got.plannedExpenses, goal_commitments: committed });
    money(got.plannedExpenses, c.expected.planned_bills); money(committed, c.expected.goal_commitments);
  });
  // OUTSIDE DOMAIN: an empty grid. MK-XS-F-004 buildDatedGrid always builds twelve cells (src/domain/grid/index.ts, the roll-up
  // `Array.from({ length: 12 }, …)`), and both callers hand thisMonthInputs a grid from MK-CF-F-226 datedGridOf
  // (CashFlowScreen.tsx:408/723, useThisMonthInputs). Recorded: it reads $0 and $0. A month with no income entered is not this
  // input — its cell has inflow 0 and the Cash flow tab draws no month until income is entered (MK-CF-M-051 refusal).
  kase('MK-CF-F-227-C05', 'OUTSIDE DOMAIN', (c) => {
    const got = thisMonthInputs({ grid: { cells: c.inputs.grid.map(cellOf) } as any, bva: null, liabilities: [], expenses: [], ym: c.inputs.requested_month });
    rec(c.case_id, { inflow: got.takeHomeMonthly, planned_bills: got.plannedExpenses });
    expect(got.takeHomeMonthly).toBe(0); expect(got.plannedExpenses).toBe(0);
  }, 'no caller can hand it an empty grid (buildDatedGrid always has 12 cells); it reads $0 and $0');
});

// ── MK-CF-F-226 datedGridOf ─────────────────────────────────────────────────────────────────────────
describe('MK-CF-F-226 datedGridOf — five cases', () => {
  kase('MK-CF-F-226-C01', 'AGREE', (c) => {
    const g = at(c.as_of, () => datedGridOf(payOnly(c.inputs.independent_monthly_net[0]), [], 0, num(c.inputs.starting_balance)));
    rec(c.case_id, { first_end: g.cells[0].runningBalance, last_end: g.cells[11].runningBalance, nets: g.cells.map((x) => x.net) });
    g.cells.forEach((x, k) => expect(x.net).toBeCloseTo(num(c.inputs.independent_monthly_net[k]), 6));
    money(g.cells[0].runningBalance, c.expected.first_end); money(g.cells[11].runningBalance, c.expected.last_end);
  });
  // AGREE on the figures; the zero start is stated where balances are printed — the Bill calendar's starting-balance box
  // ("Cash on hand now, editable" … "the starting balance the table carries forward", BillCalendarScreen.tsx:129–130). The
  // Cash flow tab prints no running balance.
  kase('MK-CF-F-226-C02', 'AGREE', (c) => {
    const g = at(c.as_of, () => datedGridOf(payOnly(c.inputs.independent_monthly_net[0]), [], 0));
    rec(c.case_id, { first_end: g.cells[0].runningBalance, last_end: g.cells[11].runningBalance });
    money(g.cells[0].runningBalance, c.expected.first_end); money(g.cells[11].runningBalance, c.expected.last_end);
  }, 'the $0 start is the Bill calendar\'s stated, editable starting balance');
  kase('MK-CF-F-226-C03', 'AGREE', (c) => {
    const g = at(c.as_of, () => datedGridOf(payOnly(2000), [], c.inputs.conversion_tax, num(c.inputs.starting_balance)));
    const bill = rec(c.case_id, { tax_bill: rothBill(g) }) as any;
    expect(bill.tax_bill.where).toBe('cells');
    money(bill.tax_bill.amount, c.expected.tax_bill.amount);
    expect(bill.tax_bill.date).toBe(c.expected.tax_bill.date);
    expect(bill.tax_bill.label).toMatch(/from your Plan/);   // source: the Plan
  });
  // APP WRONG: the adopted conversion is saved as an amount with no year (RothScreen.tsx:121 saves rothConversionThisYear and
  // rothConversionTax only), and datedGridOf dates its tax "April of the year after TODAY" (new Date().getFullYear() + 1). Read on
  // 2027-01-17, the tax on a 2026 conversion moves to April 2028 and out of the twelve months shown. The tax on a conversion
  // made in 2026 is due with the 2026 return, in April 2027 (IRS Publication 590-A: a conversion is income in the year converted).
  // FIXED 2026-10-25 (FIX-MONTH): the Roth screen now saves the year the conversion is for with the adoption (rothConversionYear,
  // RothScreen.tsx) — the case's conversion was adopted on 2026-09-17, so the store holds 2026 — and the tax is dated the April after it
  kase('MK-CF-F-226-C04', 'AGREE', (c) => {
    const g = at(c.as_of, () => datedGridOf(payOnly(2000), [], c.inputs.conversion_tax, undefined, 2026));
    const bill = rec(c.case_id, { tax_bill: rothBill(g) }) as any;
    money(bill.tax_bill.amount, c.expected.tax_bill.amount);
    expect(bill.tax_bill.date).toBe(c.expected.tax_bill.date);
  }, 'FIXED 2026-10-25 (FIX-MONTH): dated April 2027, the April after the conversion year (IRS Publication 590-A)');
  test.failing('MK-CF-F-226-C04 · the answer before the fix, kept: read in January 2027 the tax moves to April 2028', () => {
    const c = C('MK-CF-F-226-C04');
    const g = at(c.as_of, () => datedGridOf(payOnly(2000), [], c.inputs.conversion_tax, undefined, 2026));
    expect(rothBill(g)!.date).toBe('2028-04-01');
  });
  test('MK-CF-F-226-C04 · an adoption saved before 2026-10-25 carries no year, and keeps the old reading — the April after today (recorded)', () => {
    const c = C('MK-CF-F-226-C04');
    const g = at(c.as_of, () => datedGridOf(payOnly(2000), [], c.inputs.conversion_tax));
    expect(rothBill(g)!.date).toBe('2028-04-01');
  });
  kase('MK-CF-F-226-C05', 'AGREE', (c) => {
    const g = at(c.as_of, () => datedGridOf(payOnly(2000), [], c.inputs.conversion_tax, num(c.inputs.starting_balance)));
    const bill = rothBill(g);
    rec(c.case_id, { extra_tax_bills: bill ? [bill] : [] });
    expect(bill ? [bill] : []).toEqual(c.expected.extra_tax_bills);
  });
});

// ── MK-CF-F-225 useCashflowModel ────────────────────────────────────────────────────────────────────
// a return set on the Plan is written with its basis — "Use as plan" saves expectedReturn and returnBasis 'scenario' together
// (RetirementCockpit.tsx useAsPlan) — and since 2026-10-25 (FIX-MONTH, the lead's ruling 2) the paycheck runs the return the cockpit
// runs (paycheckReturn): a bare expectedReturn with no basis is one the cockpit does not run either (willItLast.ts returnBasis)
const assumptionsOf = (i: any) => ({
  ...(i.return != null ? { expectedReturn: num(i.return), returnBasis: 'scenario' } : {}), ...(i.inflation != null ? { inflation: num(i.inflation) } : {}),
  ...(i.horizon_age != null ? { horizonAge: num(i.horizon_age) } : {}),
});
const birthYearFor = (asOf: string, age: unknown) => String(Number(asOf.slice(0, 4)) - Math.floor(num(age)));
describe('MK-CF-F-225 useCashflowModel — five cases', () => {
  kase('MK-CF-F-225-C01', 'AGREE', (c) => {
    const { sim } = hookWith(c.as_of, { onboardingProfile: { birthYear: birthYearFor(c.as_of, c.inputs.age) }, retirementAssumptions: assumptionsOf(c.inputs) });
    rec(c.case_id, { simulation_inputs: sim });
    const e = c.expected.simulation_inputs;
    expect(sim.current_age).toBe(num(e.age.exact)); expect(sim.horizon_age).toBe(num(e.horizon_age.exact));
    expect(sim.mean_return).toBeCloseTo(num(e.mean.exact), 12); expect(sim.vol_return).toBeCloseTo(num(e.spread.exact), 12);
    expect(sim.inflation).toBeCloseTo(num(e.inflation.exact), 12); expect(sim.seed).toBe(num(e.seed.exact)); expect(sim.paths).toBe(num(e.paths.exact));
  });
  kase('MK-CF-F-225-C02', 'AGREE', (c) => {
    const { sim } = hookWith(c.as_of, { onboardingProfile: { birthYear: birthYearFor(c.as_of, c.inputs.age) }, retirementAssumptions: assumptionsOf(c.inputs) });
    rec(c.case_id, { spread: sim.vol_return, simulation_inputs: sim });
    expect(sim.vol_return).toBeCloseTo(num(c.expected.spread.exact), 12);
  });
  // age 61.5: the profile holds a birth year, so the hook's age is a whole number (61); only the spread is asserted
  kase('MK-CF-F-225-C03', 'AGREE', (c) => {
    const { sim } = hookWith(c.as_of, { onboardingProfile: { birthYear: birthYearFor(c.as_of, c.inputs.age) }, retirementAssumptions: assumptionsOf(c.inputs) });
    rec(c.case_id, { spread: sim.vol_return, simulation_inputs: sim });
    expect(sim.vol_return).toBeCloseTo(num(c.expected.spread.exact), 12);
  });
  // the budget as counted (MK-CF-O-020 theBudgetCounted, DEC-1923): the home's mortgage is in Debts, so the $2,111.43 Rent /
  // Mortgage line stands down from the $3,111.19 typed total — the paycheck and the grid are handed the same counted profile
  kase('MK-CF-F-225-C04', 'AGREE', (c) => {
    const i = c.inputs;
    const store = {
      onboardingProfile: { birthYear: birthYearFor(c.as_of, i.age), monthlySpending: String(i.typed_budget),
        spendCats: [{ id: 'rent', label: 'Rent / Mortgage', bucket: 'fixed', amount: num(i.budget_mortgage) }] },
      assetAccounts: [{ asset_id: 'h', label: 'Home', kind: 'home', asset_class: 'real_estate', re_use: 'primary', balance: 400_000, tax_bucket: 'TAXABLE', target_return: 0.03 }],
      liabilities: [{ debt_id: 'm', label: 'Home mortgage', debt_type: 'MORTGAGE', property_id: 'h', payment_type: 'installment',
        remaining_balance: 300_000, interest_rate_apr: 0.06, minimum_monthly_payment: num(i.home_mortgage) }],
      retirementAssumptions: assumptionsOf(i),
    };
    const h = hookWith(c.as_of, store);
    const onPay = plannedMonthlySpend(h.payProfile), onGrid = plannedMonthlySpend(h.gridProfile);
    rec(c.case_id, { counted_budget: { paycheck: onPay, dated_grid: onGrid }, same_profile_object: h.payProfile === h.gridProfile });
    money(onPay, c.expected.counted_budget); money(onGrid, c.expected.counted_budget);
    expect(h.gridProfile).toBe(h.payProfile);
  });
  // APP WRONG: no birth year → the hook runs the paycheck at age 68 (`ageFromProfile(op) ?? 68`). His ruling DEC-0296: "an unknown
  // input produces no number and a reason — never a default"; tenet 3. (The 2.5% inflation stand-in is his DEC-0259 — "inflation
  // defaults to the dated 30-year average, adjustable" — and is not the wrong part.)
  kase('MK-CF-F-225-C05', 'AGREE', (c) => {
    let sim: any = null;
    let threw: unknown = null;
    try { sim = hookWith(c.as_of, { onboardingProfile: { status: 'retired' }, retirementAssumptions: assumptionsOf(c.inputs) }).sim; } catch (e) { threw = e; }
    rec(c.case_id, { simulation_inputs: sim, refused: threw != null });
    // the reviewer's answer: no age-dependent projection without an entered age — the hook refuses
    expect(sim == null || sim.current_age == null).toBe(true);
    // and says why: no paycheck year, and the card's sentence
    const model = at(c.as_of, () => { (useStore as unknown as jest.Mock).mockReturnValue({ assetAccounts: [], liabilities: [], retirementAssumptions: {}, lensOverride: null, onboardingProfile: { status: 'retired' } }); return useCashflowModel(); });
    expect(model.year).toBeNull();
    expect(model.paycheck.refusal).toBe('Your birth year is not entered, so there is no paycheck to work out — we won’t guess one.');
  }, 'FIXED 2026-10-25 (FIX-MONTH): no birth year, no paycheck simulation, and the reason (DEC-0296)');
  test.failing('MK-CF-F-225-C05 · the answer before the fix, kept: the paycheck simulation runs at age 68', () => {
    const { sim } = hookWith('2026-10-24', { onboardingProfile: { status: 'retired' }, retirementAssumptions: {} });
    expect(sim.current_age).toBe(68);
  });
  // THE LEAD'S RULING 2 (2026-10-25, the case's open question): no return set → the cockpit's return, stated — ONE NUMBER ON BOTH
  test('MK-CF-F-225 · no return set: the paycheck runs the cockpit’s return — 6.00% with nothing set aside — and the card states it [FIXED 2026-10-25]', () => {
    const store = { onboardingProfile: { status: 'retired', birthYear: '1958' }, retirementAssumptions: {} };
    const { sim } = hookWith('2026-10-24', store);
    expect(sim.mean_return).toBeCloseTo(0.06, 12);                       // was 0.055, the flat stand-in
    expect(sim.vol_return).toBeCloseTo(Math.min(0.2, Math.max(0.05, 0.06 * 1.7)), 12);
    const model = at('2026-10-24', () => { (useStore as unknown as jest.Mock).mockReturnValue({ assetAccounts: [], liabilities: [], lensOverride: null, ...store }); return useCashflowModel(); });
    expect(model.paycheck.return.said).toBe('6.00%/year — the typical return, with nothing set aside for retirement');   // canon row 14: /year (2026-10-26)
  });
  test.failing('MK-CF-F-225 · the answer before the fix, kept: no return set → a flat 5.5%', () => {
    expect(hookWith('2026-10-24', { onboardingProfile: { status: 'retired', birthYear: '1958' }, retirementAssumptions: {} }).sim.mean_return).toBe(0.055);
  });
});

// ── MK-CF-F-156 plannedMonthFlow ────────────────────────────────────────────────────────────────────
describe('MK-CF-F-156 plannedMonthFlow — five cases', () => {
  for (const id of ['MK-CF-F-156-C01', 'MK-CF-F-156-C02', 'MK-CF-F-156-C04']) {
    kase(id, 'AGREE', (c) => {
      const p = plannedMonthFlow(monthOf(c.inputs));
      rec(c.case_id, { rows: p.lines.map((l) => l.amount), surplus: p.surplus });
      rowsAre(p.lines, c.expected.rows); money(p.surplus, c.expected.surplus);
    });
  }
  kase('MK-CF-F-156-C03', 'AGREE', (c) => {
    const p = plannedMonthFlow(monthOf(c.inputs));
    rec(c.case_id, { rows: p.lines.map((l) => l.amount), inflow: p.inflow, outflow: p.outflow, surplus: p.surplus });
    rowsAre(p.lines, c.expected.rows);
    money(p.inflow, c.expected.inflow); money(p.outflow, c.expected.outflow); money(p.surplus, c.expected.surplus);
  });
  kase('MK-CF-F-156-C05', 'AGREE', (c) => {
    const p = plannedMonthFlow(monthOf(c.inputs));
    rec(c.case_id, { surplus: p.surplus, planSet: p.planSet, refusal: p.refusal, rows: p.lines.map((l) => ({ label: l.label, amount: l.amount, notSet: !!l.notSet })) });
    refuses(p.surplus);
    expect(p.refusal).toBe('You haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.');
  }, 'FIXED 2026-10-25 (FIX-MONTH): no budget, no planned surplus, and the reason (DEC-0296, DEC-7939)');
  test.failing('MK-CF-F-156-C05 · the answer before the fix, kept: surplus $4,750 (5,000 − 250) on no budget', () => {
    expect(plannedMonthFlow(monthOf(C('MK-CF-F-156-C05').inputs)).surplus).toBe(4750);
  });
  agreeingParts('MK-CF-F-156-C05', (c) => {
    const p = plannedMonthFlow(monthOf(c.inputs));
    expect(p.planSet).toBe(false);
    expect(p.lines.find((l) => l.kind === 'spend')!.notSet).toBe(true);
  }, 'the plan is flagged not set and the Expenses row reads not set');
});

// ── MK-CF-F-005 actualMonthFlow ─────────────────────────────────────────────────────────────────────
describe('MK-CF-F-005 actualMonthFlow — five cases', () => {
  for (const id of ['MK-CF-F-005-C01', 'MK-CF-F-005-C02', 'MK-CF-F-005-C05']) {
    kase(id, 'AGREE', (c) => {
      const a = actualMonthFlow(monthOf(c.inputs));
      rec(c.case_id, { rows: a.lines.map((l) => l.amount), surplus: a.surplus });
      rowsAre(a.lines, c.expected.rows); money(a.surplus, c.expected.surplus);
    });
  }
  kase('MK-CF-F-005-C03', 'AGREE', (c) => {
    const a = actualMonthFlow(monthOf(c.inputs));
    rec(c.case_id, { rows: a.lines.map((l) => l.amount), inflow: a.inflow, outflow: a.outflow, surplus: a.surplus });
    rowsAre(a.lines, c.expected.rows);
    money(a.inflow, c.expected.inflow); money(a.outflow, c.expected.outflow); money(a.surplus, c.expected.surplus);
  });
  kase('MK-CF-F-005-C04', 'AGREE', (c) => {
    const a = actualMonthFlow(monthOf(c.inputs));
    rec(c.case_id, { rows: a.lines.map((l) => l.amount), outflow: a.outflow, surplus: a.surplus });
    rowsAre(a.lines, c.expected.rows); money(a.outflow, c.expected.outflow); money(a.surplus, c.expected.surplus);
  });
});

// ── MK-CF-F-220 pastMonthFlow ───────────────────────────────────────────────────────────────────────
describe('MK-CF-F-220 pastMonthFlow — five cases', () => {
  for (const id of ['MK-CF-F-220-C01', 'MK-CF-F-220-C02', 'MK-CF-F-220-C03', 'MK-CF-F-220-C04']) {
    kase(id, 'AGREE', (c) => {
      const i = c.inputs;
      const withLate = pastMonthFlow(pastRecord(i.saved), [], lateLogs(i.later_expenses) as any, i.month);
      const without = pastMonthFlow(pastRecord(i.saved), [], [], i.month);
      rec(c.case_id, { ...withLate, record_unchanged_by_late_expense: JSON.stringify(withLate) === JSON.stringify(without) });
      money(withLate.inflow, c.expected.inflow); money(withLate.outflow, c.expected.outflow); money(withLate.surplus, c.expected.surplus);
      expect(JSON.stringify(withLate) === JSON.stringify(without)).toBe(c.expected.record_unchanged_by_late_expense);
    });
  }
  // OUTSIDE DOMAIN: a saved month with no expenses figure and no time it was saved. The one writer, HomeScreen.tsx:163–177 through
  // MK-XS-F-007 makeMonthlySnapshot, always writes spending (a number), debt_paid and captured_at — and so did its first version
  // (git f7421364). Recorded: the missing component is read as $0 → outflow $250, surplus $6,950.
  kase('MK-CF-F-220-C05', 'OUTSIDE DOMAIN', (c) => {
    const i = c.inputs;
    const got = pastMonthFlow(pastRecord(i.saved), [], lateLogs(i.later_expenses) as any, i.month);
    rec(c.case_id, got);
    expect(got).toEqual({ inflow: 7200, outflow: 250, surplus: 6950 });
  }, 'every saved record carries its expenses and its save time (HomeScreen.tsx:168/176); a missing one reads $0');
});

// ── MK-CF-F-231 addedAfterRecord ────────────────────────────────────────────────────────────────────
describe('MK-CF-F-231 addedAfterRecord — five cases', () => {
  for (const id of ['MK-CF-F-231-C01', 'MK-CF-F-231-C02', 'MK-CF-F-231-C03', 'MK-CF-F-231-C04']) {
    kase(id, 'AGREE', (c) => {
      const i = c.inputs;
      const got = addedAfterRecord({ captured_at: i.saved.saved_at }, lateLogs(i.later_expenses) as any, i.month);
      rec(c.case_id, { late_ids: [...got.ids], late_total: got.total });
      expect([...got.ids]).toEqual(c.expected.late_ids); money(got.total, c.expected.late_total);
    });
  }
  // OUTSIDE DOMAIN: a record with no save time — every record is stamped captured_at (HomeScreen.tsx:176; first version git
  // f7421364). Recorded: nothing is named, $0.
  // FIXED 2026-10-25 (FIX-MONTH; CFR-5, DEC-7949): reachable after all — an older record is read with no save time (history.ts) —
  // and now it says so: nothing is named (which entries came later cannot be told) and noSavedTime is set, so the list says it
  kase('MK-CF-F-231-C05', 'AGREE', (c) => {
    const i = c.inputs;
    const got = addedAfterRecord({ captured_at: i.saved.saved_at }, lateLogs(i.later_expenses) as any, i.month);
    rec(c.case_id, { late_ids: [...got.ids], late_total: got.total, no_saved_time: got.noSavedTime });
    expect([...got.ids]).toEqual([]); expect(got.total).toBe(0);
    expect(got.noSavedTime).toBe(true);    // the refusal: the record cannot order later additions
  }, 'FIXED 2026-10-25 (FIX-MONTH): no save time — nothing named, and the record is said not to say when it was saved');
});

// ── MK-CF-F-157 debtPaymentsByDebt ──────────────────────────────────────────────────────────────────
const byDebtOf = (i: any, ym: string) => debtPaymentsByDebt({
  ym, takeHomeMonthly: 0, plannedExpenses: 0, debts: i.debts.map(debtOf),
  expenses: i.logs.map((l: any) => ({ date: l.date, store: l.payee, amount: num(l.amount), category: l.category })),
} as any);
describe('MK-CF-F-157 debtPaymentsByDebt — five cases', () => {
  for (const id of ['MK-CF-F-157-C01', 'MK-CF-F-157-C02', 'MK-CF-F-157-C03', 'MK-CF-F-157-C04']) {
    kase(id, 'AGREE', (c) => {
      const got = asObject(byDebtOf(c.inputs, c.as_of.slice(0, 7)));
      rec(c.case_id, got);
      expect(Object.keys(got).sort()).toEqual(Object.keys(c.expected).sort());
      for (const k of Object.keys(c.expected)) money(got[k], c.expected[k]);
    });
  }
  // APP WRONG: two debts whose names match once trimmed and lower-cased ("Loan" and " loan "). A logged payment carries only the
  // debt's name (BudgetScreen.tsx:391, MoneySheets.tsx:211) and nothing stops two debts sharing one (useStore addLiability), so the
  // $250 is credited to whichever of the two the name lookup keeps (B) and A reads unpaid — a guess shown as fact (DEC-1923: on the
  // actual side nothing is assumed paid). The reviewer's answer: no debt is credited; the $250 stays unallocated and is said so.
  kase('MK-CF-F-157-C05', 'AGREE', (c) => {
    const got = asObject(byDebtOf(c.inputs, c.as_of.slice(0, 7)));
    rec(c.case_id, got);
    expect(c.expected.state).toBe('REFUSES');
    expect(got).toEqual({});   // neither A nor B credited with a payment that could be either's
    // the $250 is unallocated and said so, once, on its own row of the actual block
    const a = actualMonthFlow({ ym: c.as_of.slice(0, 7), takeHomeMonthly: 1000, plannedExpenses: 0, debts: c.inputs.debts.map(debtOf),
      expenses: c.inputs.logs.map((l: any) => ({ date: l.date, store: l.payee, amount: num(l.amount), category: l.category })) } as any);
    const other = a.lines.filter((l) => l.label === 'Other debt payments');
    expect(other).toHaveLength(1);
    money(-other[0].amount, c.expected.unallocated_payment);
    expect(other[0].note).toMatch(/two of your debts have that name, so it is given to neither/);
  }, 'FIXED 2026-10-25 (FIX-MONTH): matched by the debt itself; a name two debts share is given to neither (DEC-1923)');
  // THE HANDOFF'S PRIORITY CLAIM, MEASURED: "two debts called Loan must not each receive the same $250". They do not — the
  // payment is counted once (B), and the actual block's debt rows add to $250, not $500.
  test.failing('MK-CF-F-157-C05 · the answer before the fix, kept: the $250 credited to B alone', () => {
    const c = C('MK-CF-F-157-C05');
    expect(asObject(byDebtOf(c.inputs, c.as_of.slice(0, 7)))).toEqual({ B: 250 });
  });
  agreeingParts('MK-CF-F-157-C05', (c) => {
    const a = actualMonthFlow({ ym: c.as_of.slice(0, 7), takeHomeMonthly: 1000, plannedExpenses: 0, debts: c.inputs.debts.map((d: any) => debtOf({ ...d, payment: 250 })),
      expenses: c.inputs.logs.map((l: any) => ({ date: l.date, store: l.payee, amount: num(l.amount), category: l.category })) } as any);
    expect(-a.lines.filter((l) => l.kind === 'debt').reduce((t, l) => t + l.amount, 0)).toBeCloseTo(250, 6);
  }, 'no double count: the one $250 is counted once (the priority claim is not real)');
});

// ── MK-CF-F-155 cash · MK-CF-F-192 inflowLabel · MK-CF-F-193 inflowSourceWord · MK-CF-F-194 monthOutflow · MK-CF-F-148 inMonth ──
describe('MK-CF-F-155 cash — five cases', () => {
  for (const id of ['MK-CF-F-155-C01', 'MK-CF-F-155-C02', 'MK-CF-F-155-C03', 'MK-CF-F-155-C04', 'MK-CF-F-155-C05']) {
    kase(id, 'AGREE', (c) => {
      const got = cash(Number(c.inputs.number));
      rec(c.case_id, Object.is(got, -0) ? '-0' : got);
      expect(Object.is(got, Number(c.expected.exact))).toBe(true);   // exact, and +0 for −0
    });
  }
});
describe('MK-CF-F-192 inflowLabel — five cases', () => {
  for (const id of ['MK-CF-F-192-C01', 'MK-CF-F-192-C02', 'MK-CF-F-192-C03', 'MK-CF-F-192-C04', 'MK-CF-F-192-C05']) {
    kase(id, 'AGREE', (c) => {
      const got = inflowLabel(c.inputs.prefix, c.inputs.sources);
      rec(c.case_id, got);
      expect(got).toBe(c.expected);
    });
  }
});
describe('MK-CF-F-193 inflowSourceWord — five cases', () => {
  for (const id of ['MK-CF-F-193-C01', 'MK-CF-F-193-C02', 'MK-CF-F-193-C03', 'MK-CF-F-193-C04', 'MK-CF-F-193-C05']) {
    kase(id, 'AGREE', (c) => {
      const got = inflowSourceWord(c.inputs.source);
      rec(c.case_id, got);
      expect(got).toBe(c.expected);
    });
  }
});
describe('MK-CF-F-194 monthOutflow — five cases', () => {
  for (const id of ['MK-CF-F-194-C01', 'MK-CF-F-194-C02', 'MK-CF-F-194-C03', 'MK-CF-F-194-C04', 'MK-CF-F-194-C05']) {
    kase(id, 'AGREE', (c) => {
      const s = c.inputs.stored_record;
      const got = monthOutflow(s == null ? null : { spending: num(s.expenses), debt_paid: num(s.debt_paid) }, num(c.inputs.logged_so_far));
      rec(c.case_id, got);
      money(got, c.expected);
    });
  }
});
describe('MK-CF-F-148 inMonth — five cases', () => {
  for (const id of ['MK-CF-F-148-C01', 'MK-CF-F-148-C02', 'MK-CF-F-148-C03', 'MK-CF-F-148-C04', 'MK-CF-F-148-C05']) {
    kase(id, 'AGREE', (c) => {
      const got = inMonth({ date: c.inputs.date, amount: 0, category: 'Groceries' }, c.inputs.month);
      rec(c.case_id, got);
      expect(got).toBe(c.expected);
    });
  }
});

// ── EVIDENCE FOR TWO CLASSIFICATIONS THAT NO CASE CARRIES ──────────────────────────────────────────
describe('formula verdict MK-CF-F-220 and rule DEC-7682 — measured', () => {
  // APP WRONG (formula check MK-CF-F-220, its second point): a past month with no saved record is rebuilt from the activity logged
  // today, so it moves when a late purchase is imported — yet the past-month card says, without condition, "Frozen — past months
  // never change under you." (CashFlowScreen.tsx, the past-month card). The reviewer: label a rebuilt month as rebuilt.
  const sept = (xs: { amount: number; date: string }[]) => pastMonthFlow(undefined, [], xs.map((x) => ({ ...x, category: 'Groceries' })), '2026-09');
  test('MK-CF-F-220 · a month with no record is rebuilt from the activity logged, and moves when more is logged [measured]', () => {
    const before = sept([{ amount: 500, date: '2026-09-20' }]);
    const after = sept([{ amount: 500, date: '2026-09-20' }, { amount: 100, date: '2026-09-25' }]);
    rec('formula MK-CF-F-220 · rebuilt month', { before, after });
    expect(before.outflow).toBe(500); expect(after.outflow).toBe(600);
  });
  test('MK-CF-F-220 · the card calls a month "Frozen" only when a saved record stands behind it [FIXED 2026-10-25, FIX-MONTH]', () => {
    const screen = fs.readFileSync(path.join(__dirname, '../../../src/screens/CashFlowScreen.tsx'), 'utf8');
    const line = screen.split('\n').find((l) => l.includes('Frozen — past months never change under you.'));
    expect(line).toBeDefined();
    expect(line!).toMatch(/\bsnap\b/);   // the sentence is printed only for a month whose record exists
    expect(line!).toMatch(/Added up from what is logged for this month — it changes if more is logged\./);   // and a rebuilt month says so
  });
  test.failing('MK-CF-F-220 · the answer before the fix, kept: "Frozen —" printed under every past month, record or none', () => {
    const screen = fs.readFileSync(path.join(__dirname, '../../../src/screens/CashFlowScreen.tsx'), 'utf8');
    expect(screen).toMatch(/<Text style=\{styles\.note\}>Frozen — past months never change under you\.<\/Text>/);
  });
  // HELD, as the reviewer says (DEC-7682): a debt whose payment was never entered leaves no planned surplus, and says why
  test('DEC-7682 · a car loan with no payment entered: no planned surplus, and the reason names the debt [HELD]', () => {
    const p = plannedMonthFlow({ ym: '2026-10', takeHomeMonthly: 5000, plannedExpenses: 2000, budgetSet: true, expenses: [],
      debts: [{ debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', payment_type: 'installment', remaining_balance: 9000, interest_rate_apr: 0.07 } as any] });
    rec('rule DEC-7682', { surplus: p.surplus, refusal: p.refusal });
    refuses(p.surplus);
    expect(p.refusal).toMatch(/^Car loan’s payment is not entered, so there is no planned surplus/);
  });
});

// ── THE FORMULA VERDICTS AND THE RULES, each classified (the reasons are in the results file) ──────
const FORMULA_MARKS: Record<string, Mark | 'RIGHT (reviewer)'> = {
  'MK-CF-O-010': 'RIGHT (reviewer)', 'MK-CF-O-003': 'RIGHT (reviewer)', 'MK-CF-F-005': 'RIGHT (reviewer)', 'MK-CF-F-155': 'RIGHT (reviewer)',
  'MK-CF-F-192': 'RIGHT (reviewer)', 'MK-CF-F-193': 'RIGHT (reviewer)', 'MK-CF-F-194': 'RIGHT (reviewer)', 'MK-CF-F-148': 'RIGHT (reviewer)',
  'MK-CF-F-227': 'APP WRONG', 'MK-CF-F-226': 'APP WRONG', 'MK-CF-F-225': 'APP WRONG', 'MK-CF-F-156': 'APP WRONG',
  'MK-CF-F-220': 'APP WRONG', 'MK-CF-F-231': 'OUTSIDE DOMAIN', 'MK-CF-F-157': 'APP WRONG',
};
const RULE_MARKS: Record<string, Mark | 'HELD (reviewer)' | 'CANNOT TELL (recorded)'> = {
  'DEC-0292': 'HELD (reviewer)', 'DEC-0333': 'HELD (reviewer)', 'DEC-7607': 'HELD (reviewer)', 'DEC-7609': 'HELD (reviewer)',
  'DEC-7682': 'HELD (reviewer)', 'DEC-8085': 'HELD (reviewer)', 'DEC-8152': 'HELD (reviewer)',
  'DEC-7939': 'APP WRONG', 'DEC-7949': 'OUTSIDE DOMAIN',
  'DEC-0002': 'CANNOT TELL (recorded)', 'DEC-0199': 'CANNOT TELL (recorded)', 'DEC-0260': 'CANNOT TELL (recorded)', 'DEC-0271': 'CANNOT TELL (recorded)',
  'DEC-0393': 'CANNOT TELL (recorded)', 'DEC-0512': 'CANNOT TELL (recorded)', 'DEC-1923': 'CANNOT TELL (recorded)', 'DEC-7606': 'CANNOT TELL (recorded)',
  'DEC-7611': 'CANNOT TELL (recorded)', 'DEC-7937': 'CANNOT TELL (recorded)', 'DEC-7938': 'CANNOT TELL (recorded)', 'DEC-7940': 'CANNOT TELL (recorded)',
  'DEC-7946': 'CANNOT TELL (recorded)', 'DEC-8084': 'CANNOT TELL (recorded)', 'DEC-8153': 'CANNOT TELL (recorded)',
};

// ── A GUARD MUST PROVE IT LOOKED: every case, formula verdict and rule in part 14 was taken up, none twice ──
describe('coverage — part 14', () => {
  test('75 of 75 cases were run, each once', () => {
    const inPackage = PART.cases.map((c: any) => c.case_id);
    expect(inPackage.length).toBe(75);
    expect(RAN.length).toBe(new Set(RAN).size);
    expect([...RAN].sort()).toEqual([...inPackage].sort());
  });
  test('15 of 15 formula verdicts are classified (7 not RIGHT), and nothing outside the package', () => {
    const ids = PART.formula_checks.map((f: any) => f.id);
    expect(ids.length).toBe(15);
    expect(Object.keys(FORMULA_MARKS).sort()).toEqual([...ids].sort());
    for (const f of PART.formula_checks) expect(FORMULA_MARKS[f.id] === 'RIGHT (reviewer)').toBe(f.verdict === 'RIGHT');
    expect(PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').length).toBe(7);
  });
  test('24 of 24 rules are recorded: 2 NOT HELD classified, 15 CANNOT TELL recorded, 7 HELD', () => {
    const rules = PART.rules_held.map((r: any) => r.rule);
    expect(rules.length).toBe(24);
    expect(Object.keys(RULE_MARKS).sort()).toEqual([...rules].sort());
    for (const r of PART.rules_held) {
      const m = RULE_MARKS[r.rule];
      if (r.verdict === 'HELD') expect(m).toBe('HELD (reviewer)');
      else if (r.verdict === 'CANNOT TELL') expect(m).toBe('CANNOT TELL (recorded)');
      else expect(['AGREE', 'APP WRONG', 'REVIEWER WRONG', 'NEEDS RULING', 'BLOCKED', 'OUTSIDE DOMAIN']).toContain(m);
    }
    expect(PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').length).toBe(2);
    expect(PART.rules_held.filter((r: any) => r.verdict === 'CANNOT TELL').length).toBe(15);
  });
});
