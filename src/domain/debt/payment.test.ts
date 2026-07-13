// Term #9: two clearly-named monthly-debt numbers. The P0 was buildDebtState using Σ minimum while
// other screens used the override-aware total — different numbers, same name. Now both are exposed.
import { minimumDebtService, actualDebtPayment, buildDebtState, inferDebtType, loanPayment, type Debt } from './index';

const d = (over: Partial<Debt>): Debt => ({
  debt_id: 'x' as any, label: 'debt', debt_type: 'OTHER', remaining_balance: 0, interest_rate_apr: 0,
  minimum_monthly_payment: 0, ...over,
});

const debts: Debt[] = [
  d({ label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 5000, interest_rate_apr: 0.22, minimum_monthly_payment: 100, monthly_payment: 400 }), // pays extra
  d({ label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.06, minimum_monthly_payment: 1800 }),                    // pays minimum
];

describe('minimum vs actual debt payment', () => {
  test('minimumDebtService = Σ minimum (the DTI obligation)', () => {
    expect(minimumDebtService(debts)).toBe(1900);   // 100 + 1800
  });
  test('actualDebtPayment respects the override (cash-flow outflow)', () => {
    expect(actualDebtPayment(debts)).toBe(2200);    // 400 + 1800
  });
  test('buildDebtState exposes BOTH, and they differ when paying above minimum (fixes the P0)', () => {
    const st = buildDebtState('u' as any, debts);
    expect(st.total_monthly_debt_service).toBe(minimumDebtService(debts));   // DTI
    expect(st.total_actual_payment).toBe(actualDebtPayment(debts));          // cash flow
    expect(st.total_monthly_debt_service).not.toBe(st.total_actual_payment);
  });
});

describe('debt types incl. HELOC + Medical', () => {
  test('inferDebtType recognizes HELOC and medical (and keeps mortgage)', () => {
    expect(inferDebtType('HELOC')).toBe('HELOC');
    expect(inferDebtType('Home equity line')).toBe('HELOC');
    expect(inferDebtType('Hospital bill')).toBe('MEDICAL');
    expect(inferDebtType('30-yr mortgage')).toBe('MORTGAGE');
  });
});

// P0 unit landmine: loanPayment takes a PERCENT (7 = 7%) while Debt.interest_rate_apr is a DECIMAL
// (0.07). The dev guard flags decimal-looking inputs so the 100x error can't ship silently.
describe('loanPayment rate-unit guard (P0)', () => {
  test('warns when a decimal-looking rate is passed', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    loanPayment(10000, 0.07, 10);   // decimal 7% passed where percent expected
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('looks like a DECIMAL rate'));
    spy.mockRestore();
  });
  test('does not warn for percent inputs or zero-rate promos', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    loanPayment(10000, 7, 10);      // 7% as percent — correct usage
    loanPayment(10000, 0, 3);       // 0% promo
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  test('production callers pass percent: 7% on $10k/10yr ≈ $116/mo (not the $83 a decimal would give)', () => {
    expect(loanPayment(10000, 7, 10).monthly).toBeCloseTo(116.11, 1);
  });
});
