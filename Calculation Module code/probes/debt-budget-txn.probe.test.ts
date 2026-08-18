// PROBES — the remaining debt, budget and ledger helpers.
import { actualDebtPayment, debtKind, inferDebtType, DEBT_KINDS } from '../../src/domain/debt';
import { spendBuckets, plannedMonthlySpend } from '../../src/domain/budget';
import { cashEffect, txnLabel } from '../../src/domain/transactions';

const D = (o: any = {}) => ({ debt_id: 'd', label: 'loan', debt_type: 'MORTGAGE',
  remaining_balance: 412_000, interest_rate_apr: 0.055, minimum_monthly_payment: 2_400, ...o } as any);
const T = (o: any) => ({ txn_id: 't', account_id: 'a', date: '2026-08-01', ...o } as any);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS ACTUALLY GOING OUT ON DEBT
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('DEBT_PAYMENTS_ACTUAL', () => {
  test('it counts what is chosen, so overpaying on purpose shows up', () => {
    expect(actualDebtPayment([D({ minimum_monthly_payment: 2_400, monthly_payment: 3_000 })])).toBe(3_000);
  });
  test('no debts is zero, not an error', () => {
    expect(actualDebtPayment([])).toBe(0);
  });
});

describe('DEBT_TYPE_FROM_NAME', () => {
  test('the name is read, because most people type one before picking a type', () => {
    expect(inferDebtType('Chase Mortgage')).toBe('MORTGAGE');
    expect(inferDebtType('Home equity line')).toBe('HELOC');
    expect(inferDebtType('Car loan')).toBe('AUTO');
    expect(inferDebtType('Student loan — Navient')).toBe('STUDENT_LOAN');
    expect(inferDebtType('Amex')).toBe('CREDIT_CARD');
    expect(inferDebtType('Hospital bill')).toBe('MEDICAL');
  });

  test('HELOC is tested BEFORE mortgage — both contain "home"', () => {
    // ordering matters: "home equity" would otherwise read as a mortgage and be modelled as one
    expect(inferDebtType('Home Equity Loan')).toBe('HELOC');
  });

  test('an unrecognised name is OTHER, never a guessed mortgage', () => {
    expect(inferDebtType('Loan from Dad')).toBe('OTHER');
    expect(inferDebtType(undefined)).toBe('OTHER');
  });

  test('every debt type we offer carries its own facts', () => {
    for (const k of DEBT_KINDS) expect(typeof k.label).toBe('string');
    expect(debtKind('not_a_type')).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// PLANNED SPENDING
// DERIVATION RULE: someone may answer twice — once as a single monthly figure, once category by
// category. The LARGER wins, because understating spending is the direction that flatters a plan.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('PLANNED_SPENDING', () => {
  test('categories add up into fixed, non-monthly and flexible', () => {
    const b = spendBuckets({ b_fixed: 3_000, b_nonmonthly: 500, b_flexible: 1_200 } as any);
    expect(b).toEqual({ fixed: 3_000, non_monthly: 500, flexible: 1_200, monthly_total: 4_700 });
  });

  test('the LARGER of the two answers wins — understating spending flatters a plan', () => {
    expect(plannedMonthlySpend({ b_fixed: 3_000, monthlySpending: 5_000 } as any)).toBe(5_000);
    expect(plannedMonthlySpend({ b_fixed: 6_000, monthlySpending: 5_000 } as any)).toBe(6_000);
  });

  test('nothing answered is zero, not a guessed household average', () => {
    expect(plannedMonthlySpend(null)).toBe(0);
    expect(spendBuckets(null).monthly_total).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CASH EFFECT OF ONE LEDGER ROW
// DERIVATION RULE: a REINVESTED dividend has NO cash effect. The money never reached the person's
// cash — it bought more shares. Counting it as cash in would overstate what arrived.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('CASH_EFFECT', () => {
  test('money in is positive, money out negative', () => {
    expect(cashEffect(T({ type: 'DEPOSIT', amount: 5_000 }))).toBe(5_000);
    expect(cashEffect(T({ type: 'WITHDRAWAL', amount: 2_000 }))).toBe(-2_000);
    expect(cashEffect(T({ type: 'FEE', amount: 100 }))).toBe(-100);
  });

  test('a trade moves cash by shares × price, which is the true cash either way', () => {
    expect(cashEffect(T({ type: 'BUY', shares: 10, price: 240 }))).toBe(-2_400);
    expect(cashEffect(T({ type: 'SELL', shares: 10, price: 250 }))).toBe(2_500);
  });

  test('A REINVESTED DIVIDEND HAS NO CASH EFFECT — it bought shares instead', () => {
    expect(cashEffect(T({ type: 'DIVIDEND', amount: 139.49, reinvested: true }))).toBe(0);
    expect(cashEffect(T({ type: 'DIVIDEND', amount: 139.49 }))).toBe(139.49);   // taken as cash
    expect(cashEffect(T({ type: 'INTEREST', amount: 50, reinvested: true }))).toBe(0);
  });

  test('a row that moves no money reports none', () => {
    expect(cashEffect(T({ type: 'ADJUSTMENT', amount: 500 }))).toBe(0);
  });

  test('every ledger type has a readable name', () => {
    expect(txnLabel('DEPOSIT')).toBeTruthy();
    expect(txnLabel('ADJUSTMENT')).toBeTruthy();
  });
});
