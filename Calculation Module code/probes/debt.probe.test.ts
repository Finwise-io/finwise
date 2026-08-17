// PROBES — what a debt costs, and how long it takes to clear.
//
// These feed the Debts tab and the mortgage decision, and one of them — the unit of the interest
// rate — is flagged in the code itself as a landmine: `aprPct` is a PERCENT (7 means 7%) while
// `interest_rate_apr` on the record is a DECIMAL (0.07). Getting that backwards is a hundredfold
// error in either direction, so both are probed here explicitly.
import {
  defaultPaymentType, paymentShape, requiredPayment, totalDebtMonthly, minimumDebtService,
  totalDebtBalance, loanPayment, monthsToClear, paymentToClearBy, creditUtilization, debtKind,
} from '../../src/domain/debt';

const D = (o: any = {}) => ({
  debt_id: 'd', label: 'loan', debt_type: 'MORTGAGE', remaining_balance: 412_000,
  interest_rate_apr: 0.055, minimum_monthly_payment: 2_400, ...o,
} as any);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// DEBT_PAYMENT_SHAPE · DEBT_REQUIRED_PAYMENT
// DERIVATION RULE: how a debt is REPAID decides how it is modelled. A card revolves, a loan
// amortises, and a charge card is due in full — which means it has no monthly payment at all.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('DEBT_PAYMENT_SHAPE / REQUIRED_PAYMENT', () => {
  test('cards and lines of credit revolve; everything else is an installment', () => {
    expect(defaultPaymentType('CREDIT_CARD')).toBe('revolving');
    expect(defaultPaymentType('HELOC')).toBe('revolving');
    expect(defaultPaymentType('MORTGAGE')).toBe('installment');
    expect(defaultPaymentType('STUDENT_LOAN')).toBe('installment');   // the type is STUDENT_LOAN, not STUDENT
  });

  test('a stored shape always beats the default — the person\'s own answer wins', () => {
    expect(paymentShape(D({ debt_type: 'CREDIT_CARD', payment_type: 'installment' }))).toBe('installment');
  });

  test('DUE IN FULL has no monthly payment — it is a dated bill, not a repayment', () => {
    expect(requiredPayment(D({ payment_type: 'due_in_full' }))).toBe(0);
  });

  test('the required payment is the LARGER of the minimum and what they choose to pay', () => {
    expect(requiredPayment(D({ minimum_monthly_payment: 2_400, monthly_payment: 3_000 }))).toBe(3_000);
    expect(requiredPayment(D({ minimum_monthly_payment: 2_400, monthly_payment: 1_000 }))).toBe(2_400);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// DEBT_TOTALS
// DERIVATION RULE: two different totals, and confusing them misstates affordability. The MINIMUM is
// what must be paid to stay current; the ACTUAL is what is really going out.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('DEBT_TOTALS', () => {
  const debts = [D({ debt_id: 'm' }), D({ debt_id: 'c', debt_type: 'CREDIT_CARD', remaining_balance: 6_000, minimum_monthly_payment: 150, monthly_payment: 400 })];

  test('the minimum counts only what must be paid; the actual counts what is chosen', () => {
    expect(minimumDebtService(debts)).toBe(2_550);      // 2,400 + 150
    expect(totalDebtMonthly(debts)).toBe(2_800);        // 2,400 + 400
  });

  test('a due-in-full debt adds nothing to the minimum — it is not a monthly commitment', () => {
    expect(minimumDebtService([D({ payment_type: 'due_in_full', minimum_monthly_payment: 900 })])).toBe(0);
  });

  test('balances sum, and no debts is zero rather than an error', () => {
    expect(totalDebtBalance(debts)).toBe(418_000);
    expect(totalDebtBalance([])).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// LOAN_PAYMENT · MONTHS_TO_CLEAR · PAYMENT_TO_CLEAR_BY
// THE UNIT LANDMINE: loanPayment takes a PERCENT (7 = 7%); monthsToClear takes a DECIMAL (0.07).
// A hundredfold error either way, so both are pinned.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('LOAN_PAYMENT / MONTHS_TO_CLEAR', () => {
  test('loanPayment takes a PERCENT — 5.5 means 5.5%', () => {
    const plan = loanPayment(412_000, 5.5, 30);
    expect(plan.monthly).toBeGreaterThan(2_300);
    expect(plan.monthly).toBeLessThan(2_400);           // ~$2,339 on a 30-year at 5.5%
  });

  test('monthsToClear takes a DECIMAL — 0.055 means the same 5.5%', () => {
    const m = monthsToClear(412_000, 0.055, 2_400)!;
    expect(m).toBeGreaterThan(330);
    expect(m).toBeLessThan(345);                        // ~338 months
  });

  test('a payment that only covers the interest NEVER clears — null, not a huge number', () => {
    expect(monthsToClear(412_000, 0.055, 100)).toBeNull();
    // interest alone is 412,000 × 0.055 ÷ 12 ≈ $1,888/mo
    expect(monthsToClear(412_000, 0.055, 1_800)).toBeNull();
    expect(monthsToClear(412_000, 0.055, 2_000)).not.toBeNull();
  });

  test('nothing owed clears in zero months; no payment never clears', () => {
    expect(monthsToClear(0, 0.055, 2_400)).toBe(0);
    expect(monthsToClear(412_000, 0.055, 0)).toBeNull();
  });

  test('a zero-interest debt is simply the balance divided by the payment', () => {
    expect(monthsToClear(1_200, 0, 100)).toBe(12);
  });

  test('paying it off by a date rounds UP to the cent, so the plan never falls a penny short', () => {
    const p = paymentToClearBy(12_000, 0.05, 12);
    expect(p).toBeGreaterThan(1_000);                   // more than balance ÷ months, because of interest
    expect(Math.round(p * 100)).toBe(p * 100);          // whole cents
  });

  test('nothing owed, or no time, needs no payment', () => {
    expect(paymentToClearBy(0, 0.05, 12)).toBe(0);
    expect(paymentToClearBy(12_000, 0.05, 0)).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CREDIT_UTILISATION
// ════════════════════════════════════════════════════════════════════════════════════════════════
// CORRECTED BY THE PROBE — and the correction found a defect.
// It returns a RATIO (0.3), not a percentage, and it carries a status band. I documented it wrong.
describe('CREDIT_UTILISATION', () => {
  test('it is a RATIO with a status band, not a percentage', () => {
    expect(creditUtilization(3_000, 10_000)).toEqual({ ratio: 0.3, status: 'good' });
    expect(creditUtilization(4_000, 10_000).status).toBe('caution');
    expect(creditUtilization(6_000, 10_000).status).toBe('high');
  });

  test('DEFECT: no limit on file returns 0, which reads as "good"', () => {
    // A card whose limit we were never told looks like a card being used perfectly. Unknown and
    // excellent are not the same thing, and this one quietly reassures.
    expect(creditUtilization(3_000, 0)).toEqual({ ratio: 0, status: 'good' });
  });

  test('the bands are 30% and 50%, inclusive at each edge', () => {
    expect(creditUtilization(3_000, 10_000).status).toBe('good');
    expect(creditUtilization(5_000, 10_000).status).toBe('caution');
    expect(creditUtilization(5_001, 10_000).status).toBe('high');
  });
});
