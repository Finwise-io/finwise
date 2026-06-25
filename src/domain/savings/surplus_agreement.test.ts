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

test('CashFlow shows AFTER-debt surplus from canonical selectors, labeled "Planned surplus"', () => {
  const s = screen('CashFlowScreen.tsx');
  expect(s).toMatch(/surplusByMonth\(/);
  expect(s).toMatch(/monthlySavings\(/);
  expect(s).toMatch(/Planned surplus/);
  expect(s).not.toMatch(/savingsByMonth\(op\)/);   // the old before-debt grid must be gone
});

test('Home labels the actual cash-flow residual "Surplus" (not "Left over")', () => {
  const s = screen('HomeScreen.tsx');
  expect(s).toMatch(/>Surplus</);
  expect(s).not.toMatch(/>Left over</);
});

test('Budget plan total = canonical take-home − spend − debt, labeled "Planned surplus"', () => {
  const s = screen('BudgetScreen.tsx');
  expect(s).toMatch(/takeHomeMonthly\(op\)/);
  expect(s).toMatch(/Planned surplus/);
  expect(s).not.toMatch(/Left over to save/);
});
