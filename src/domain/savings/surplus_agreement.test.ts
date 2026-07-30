// SURPLUS AGREEMENT (Theme 1 P0, 2026-06-23 decision): "Surplus" = take-home − spending − debt (AFTER
// debt), one definition, shown as "Planned" (CashFlow/Budget/recap) and "Actual" (Home). This pins the
// math so the four surfaces can never drift back to the B-67 fork (Home "Left over" ≠ CashFlow "Surplus").
import { takeHomeMonthly, monthlySavings, surplusByMonth } from './index';
import { plannedMonthlySpend } from '../budget';
import { actualDebtPayment, type Debt } from '../debt';
import { round2 } from '../_shared/num';
import * as fs from 'fs';
import * as path from 'path';

const op = { baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '4000', c_401k: '500' } as any;
const debts: Debt[] = [{
  debt_id: 'd' as any, label: 'Card', debt_type: 'CREDIT_CARD',
  remaining_balance: 5000, interest_rate_apr: 0.2, minimum_monthly_payment: 600,
}];

describe('surplus = take-home − spending − debt (canonical, after debt)', () => {
  test('monthlySavings IS take-home − planned spend − debt', () => {
    expect(monthlySavings(op, debts)).toBe(
      round2(takeHomeMonthly(op) - plannedMonthlySpend(op) - actualDebtPayment(debts)),
    );
  });

  test('debt reduces surplus by exactly the debt service (proves AFTER-debt)', () => {
    expect(monthlySavings(op, debts)).toBe(round2(monthlySavings(op, []) - actualDebtPayment(debts)));
  });

  test('surplusByMonth grid reconciles with the scalar (avg ≈ monthlySavings)', () => {
    const grid = surplusByMonth(op, debts);
    expect(grid).toHaveLength(12);
    const avg = grid.reduce((t, m) => t + m.amount, 0) / 12;
    expect(avg).toBeCloseTo(monthlySavings(op, debts), 0);   // within $1 (display rounding)
  });

  test('each grid month is the income-vs-spend month minus the constant debt service', () => {
    const debt = actualDebtPayment(debts);
    const withDebt = surplusByMonth(op, debts);
    const noDebt = surplusByMonth(op, []);
    withDebt.forEach((m, i) => expect(m.amount).toBe(round2(noDebt[i].amount - debt)));
  });
});

// ── cross-screen guards: the four surfaces speak ONE vocabulary, sourced from the canonical selectors ──
const screen = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', 'screens', f), 'utf8');

test('CashFlow THIS-MONTH surplus = In − Out from the SAME month cell (B46 finding 7)', () => {
  // The card's equals sign must be TRUE BY CONSTRUCTION: surplus derives from the very cell the
  // In/Out rows display — never a second engine (monthlySavings measured a related-but-different
  // concept and disagreed by $572 on the founder's device).
  const s = screen('CashFlowScreen.tsx');
  expect(s).toMatch(/const surplus = Math\.round\(inflow - outflow\)/);
  expect(s).not.toMatch(/monthlySavings\(/);        // the second engine stays out of this screen
  expect(s).toMatch(/Planned surplus/);
  expect(s).toMatch(/useCashflowModel/);           // by-month = the ONE dated grid
  expect(s).not.toMatch(/savingsByMonth\(op\)/);   // the old before-debt grid must be gone
});

test('Home labels the actual cash-flow residual "Surplus" (not "Left over")', () => {
  // FCC Home displays hero/net-worth/insights/will-it-last only — it renders NO cash-flow residual
  // of its own (one home per number: Cash flow owns it). The shared surplus sheet keeps the word.
  const s = screen('HomeScreen.tsx');
  expect(s).not.toMatch(/>Surplus</);
  expect(s).not.toMatch(/>Left over</);
  const sheets = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'MoneySheets.tsx'), 'utf8');
  expect(sheets).toMatch(/surplus to work/);
});

test('Budget plan total = canonical take-home − spend − debt, labeled "Planned surplus"', () => {
  const s = screen('BudgetScreen.tsx');
  expect(s).toMatch(/takeHomeMonthly\(op\)/);
  expect(s).toMatch(/Planned surplus/);
  expect(s).not.toMatch(/Left over to save/);
});

test('Goals "free cash to save" capacity = canonical AFTER-debt surplus (build-34 #1)', () => {
  const s = screen('GoalsScreen.tsx');
  expect(s).toMatch(/surplusByMonth\(/);              // uses the after-debt grid
  expect(s).not.toMatch(/savingsByMonth\(op\)/);      // NOT the before-debt grid (over-stated "free up $/mo" by the whole debt payment)
});
