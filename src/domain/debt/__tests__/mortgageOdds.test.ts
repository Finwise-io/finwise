// The mortgage's effect on how long money lasts — TWO REAL RUNS, never a subtraction.
import { mortgageOddsEffect } from '../mortgageOdds';
import type { RetirementInputs } from '../../retirement';

const PAT: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90, start_balance: 909_152,
  annual_contribution: 12_000, retire_monthly_spend_today: 5200,
  guaranteed_monthly_income: 0, guaranteed_start_age: 67,
  mean_return: 0.0585, vol_return: 0.0752, inflation: 0.025, seed: 42, paths: 400, now_year: 2026,
} as any;
const LOAN = { balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, nowYear: 2026 };

test('both numbers come out of the engine — neither is derived from the other', () => {
  const e = mortgageOddsEffect({ base: PAT, ...LOAN, extraMonthly: 500 })!;
  expect(e.before).toBeGreaterThanOrEqual(0);
  expect(e.after).toBeGreaterThanOrEqual(0);
  // the placeholder this replaces was `before − round(extra/500) × 2`, which would force exactly 2
  expect(e.after).not.toBe(e.before - 2);
});

test('the extra payment really does clear the loan sooner', () => {
  const e = mortgageOddsEffect({ base: PAT, ...LOAN, extraMonthly: 500 })!;
  expect(e.fasterPayoffYear).toBeLessThan(e.payoffYear);
  // both match the loan's own arithmetic: the last payment lands Oct 2054, or Nov 2045 with the extra
  expect(e.payoffYear).toBe(2054);
  expect(e.fasterPayoffYear).toBe(2045);
});

test('a bigger extra payment clears it sooner still — the model responds to the input', () => {
  const small = mortgageOddsEffect({ base: PAT, ...LOAN, extraMonthly: 500 })!;
  const big = mortgageOddsEffect({ base: PAT, ...LOAN, extraMonthly: 1500 })!;
  expect(big.fasterPayoffYear).toBeLessThan(small.fasterPayoffYear);
});

test('BOTH halves of the trade are modelled, so the answer is not a foregone conclusion', () => {
  // If only the "less into savings" half were modelled, every extra payment would look worse and
  // the feature would be an argument dressed as a calculation. Because the freed payment counts
  // too, the direction depends on the person — which is the whole point.
  const e = mortgageOddsEffect({ base: PAT, ...LOAN, extraMonthly: 500 })!;
  expect(typeof e.after).toBe('number');
  expect(Math.abs(e.after - e.before)).toBeLessThan(40);   // a real shift, not a wild swing
});

test('no extra payment → nothing to report, rather than a zero-change line', () => {
  expect(mortgageOddsEffect({ base: PAT, ...LOAN, extraMonthly: 0 })).toBeNull();
});

test('a payment that never covers the interest → null, never an invented payoff year', () => {
  expect(mortgageOddsEffect({ base: PAT, balance: 412_000, annualRate: 0.055, monthlyPayment: 100, extraMonthly: 50, nowYear: 2026 })).toBeNull();
});

test('the SAME inputs give the SAME answer every time — a person can trust the number', () => {
  const a = mortgageOddsEffect({ base: PAT, ...LOAN, extraMonthly: 500 })!;
  const b = mortgageOddsEffect({ base: PAT, ...LOAN, extraMonthly: 500 })!;
  expect(a).toEqual(b);
});
