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

// B47 finding 11 — repayment shapes: the installment two-way math + due-in-full behavior.
import { defaultPaymentType, paymentShape, monthsToClear, paymentToClearBy } from './index';

describe('B47 finding 11 — repayment shape defaults', () => {
  test('cards and HELOCs revolve; mortgages/auto/personal are installments', () => {
    expect(defaultPaymentType('CREDIT_CARD')).toBe('revolving');
    expect(defaultPaymentType('HELOC')).toBe('revolving');
    expect(defaultPaymentType('MORTGAGE')).toBe('installment');
    expect(defaultPaymentType('PERSONAL')).toBe('installment');
  });
  test('an explicit payment_type on the debt wins over the default', () => {
    const d = { debt_type: 'PERSONAL', payment_type: 'due_in_full' } as Debt;
    expect(paymentShape(d)).toBe('due_in_full');
  });
});

describe('B47 finding 11 — enter either the payment or the end date, the other is computed', () => {
  test('round-trip: the payment for N months clears in exactly N months', () => {
    const pmt = paymentToClearBy(412000, 0.0625, 240);           // 20-yr mortgage
    expect(monthsToClear(412000, 0.0625, pmt)).toBe(240);
  });
  test('mortgage sanity: $412k at 6.25% paying $2,850/mo clears in ~21 years', () => {
    const months = monthsToClear(412000, 0.0625, 2850)!;
    expect(months).toBeGreaterThan(240); expect(months).toBeLessThan(276);
  });
  test('a payment that only covers interest NEVER pays off (null, not a huge number)', () => {
    expect(monthsToClear(100000, 0.06, 500)).toBeNull();         // interest alone is $500/mo
  });
  test('zero-rate loans divide evenly', () => {
    expect(monthsToClear(12000, 0, 1000)).toBe(12);
    expect(paymentToClearBy(12000, 0, 12)).toBe(1000);
  });
});

describe('B47 finding 11 — due-in-full debts have NO monthly obligation', () => {
  const lump = { debt_id: 'l1', label: 'Family loan', debt_type: 'PERSONAL', payment_type: 'due_in_full', remaining_balance: 15000, interest_rate_apr: 0, minimum_monthly_payment: 0, payoff_date: '2026-12-31' } as Debt;
  const card = { debt_id: 'c1', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.22, minimum_monthly_payment: 180 } as Debt;
  test('DTI (minimum service) and cash-flow (actual payment) both exclude the lump', () => {
    expect(minimumDebtService([lump, card])).toBe(180);
    expect(actualDebtPayment([lump, card])).toBe(180);
  });
  test('but the BALANCE still counts against net worth', () => {
    const st = buildDebtState('u1' as any, [lump, card]);
    expect(st.total_debt_balance).toBe(21000);
  });
});
