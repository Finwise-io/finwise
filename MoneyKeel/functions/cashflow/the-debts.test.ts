/* The debts — what they ask each month, and when they are gone. */
import { theDebts, DEBT_FIGURES, payoffRefusal } from './the-debts';
import { payoffPlan } from '../../../src/domain/debt';

const debts = [
  { debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200 },
  { debt_id: 'a', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
] as any[];
const now = new Date('2026-10-01T12:00:00');

describe('theDebts — the Debts tab asks this and nothing else', () => {
  it('MK-NW-M-009 / MK-CF-M-057: the balances add up, and interest a month is balance × rate ÷ 12', () => {
    const d = theDebts({ debts, now });
    expect(d.totalBalance).toBe(23_000);
    expect(d.interestMonthly).toBeCloseTo(9000 * 0.24 / 12 + 14000 * 0.069 / 12, 2);   // $180 + $80.50
  });
  it('MK-CF-M-058 / 059: extra money shortens the plan and costs less interest — never the reverse', () => {
    const slow = theDebts({ debts, extraMonthly: 0, now }).plan!;
    const fast = theDebts({ debts, extraMonthly: 300, now }).plan!;
    expect(slow.neverPaysOff).toBe(false);
    expect(fast.months).toBeLessThan(slow.months);
    expect(fast.totalInterest).toBeLessThan(slow.totalInterest);
  });
  it('a card whose minimum cannot cover its interest says never, not a number', () => {
    const d = theDebts({ debts: [{ debt_id: 'x', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 20000, interest_rate_apr: 0.30, minimum_monthly_payment: 100 }] as any, now });
    expect(d.plan!.neverPaysOff).toBe(true);
  });
  it('every figure this door hands out has a worked example that runs', () => {
    for (const [id, f] of Object.entries(DEBT_FIGURES as any)) expect(`${id}: ${typeof (f as any).worked?.run}`).toBe(`${id}: function`);
  });

  // 2026-10-25, FIX-MONTH — THE PLAN PAYS WHAT THE PERSON PAYS (his DEC-0641, Q53 "what actually leaves"; CFR-5, MK-CF-M-073)
  it('MK-CF-M-072 / 058 / 059: a $300 payment set on the $200-minimum card — the plan pays $550 a month, 56 months, $7,647 of interest', () => {
    const set = [{ ...debts[0], monthly_payment: 300 }, debts[1]];
    const d = theDebts({ debts: set, now });
    expect(d.planMonthly).toBe(550);                 // 300 + 250 — it read 450, the minimums
    expect(d.paymentsMonthly).toBe(550);             // the same as "in payments" on the line under YOUR DEBT
    // worked by hand (avalanche, $550 a month): the card clears in month 47 with $4,881.94 of interest, the car loan in month 56
    expect(d.plan!.months).toBe(56);
    expect(d.plan!.order.map((o) => [o.label, o.payoffMonth])).toEqual([['Card', 47], ['Car loan', 56]]);
    expect(d.plan!.totalInterest).toBeCloseTo(7646.6036, 3);
    // the minimums alone, as it ran before: 84 months and $14,787 (the old answer)
    const old = theDebts({ debts, now });
    expect([old.planMonthly, old.plan!.months, Math.round(old.plan!.totalInterest)]).toEqual([450, 84, 14787]);
  });
  it('a payment set below the minimum pays the minimum (the floor)', () => {
    expect(theDebts({ debts: [{ ...debts[0], monthly_payment: 150 }, debts[1]], now }).planMonthly).toBe(450);
  });
  // 2026-10-25, FIX-MONTH — NOTHING WORKED OUT FROM WHAT WAS NEVER ENTERED (tenet 3, DEC-0296; CFR-3, MK-CF-O-018-C03)
  it('a payment never entered: no plan, no "never", and the sentence names the debt', () => {
    const d = theDebts({ debts: [debts[0], { ...debts[1], minimum_monthly_payment: undefined }], now });
    expect(d.plan).toBeNull();
    expect(d.refusal).toBe('Car loan’s payment is not entered, so there is no payoff date — we won’t guess one.');
    expect(Number.isNaN(d.planMonthly)).toBe(true);
    expect(d.paymentsMonthly).toBe(200);             // what is known; the screen names the one left out
  });
  it('a rate never entered reads no interest figure and no plan; a typed 0% is 0%', () => {
    const mortgage = { debt_id: 'm', label: 'Lake house mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: undefined, minimum_monthly_payment: 1900 } as any;
    const d = theDebts({ debts: [mortgage, debts[1]], now });
    expect(Number.isNaN(d.interestMonthly)).toBe(true);
    expect(d.interestRefusal).toBe('Lake house mortgage’s rate is not entered, so there is no interest figure — we won’t guess one.');
    expect(d.plan).toBeNull();
    expect(d.refusal).toBe('Lake house mortgage’s rate is not entered, so there is no payoff date — we won’t guess one.');
    expect(d.paymentsMonthly).toBe(2150);
    const zero = theDebts({ debts: [{ ...mortgage, interest_rate_apr: 0 }], now });
    expect(zero.interestMonthly).toBe(0);
    expect(zero.plan!.months).toBe(Math.ceil(300000 / 1900));   // 158 months at 0%
  });
  it('payoffRefusal says both, for each debt, in This month’s words', () => {
    expect(payoffRefusal([{ label: 'Visa', what: ['payment'] }, { label: 'Lake house mortgage', what: ['rate'] }]))
      .toBe('Visa’s payment and Lake house mortgage’s rate are not entered, so there is no payoff date — we won’t guess one.');
    expect(payoffRefusal([{ label: 'A', what: ['payment'] }, { label: 'B', what: ['payment'] }]))
      .toBe('A and B payments are not entered, so there is no payoff date — we won’t guess one.');
    expect(payoffRefusal([{ label: 'A', what: ['payment', 'rate'] }]))
      .toBe('A’s payment and rate are not entered, so there is no payoff date — we won’t guess one.');
  });
  it('payoffPlan itself refuses for every caller (the Goals tab and the Plan read it directly)', () => {
    const p = payoffPlan([{ ...debts[1], interest_rate_apr: undefined } as any], 0, 'avalanche', now);
    expect(p.notEntered).toEqual([{ debt_id: 'a', label: 'Car loan', what: ['rate'] }]);
    expect([p.neverPaysOff, p.pastHorizon, Number.isNaN(p.months)]).toEqual([false, false, true]);
  });
});
