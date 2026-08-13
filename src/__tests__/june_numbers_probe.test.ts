// JUNE'S FIXTURE NUMBERS MUST RECONCILE (2026-08-13).
// The design handoff put Pat's $909,152 on June's screen beside a $4,155 draw, and the two do not
// correspond — the engine's maximum draw on $909,152 is $3,835. These pins hold the corrected set
// so the brief, the mock and the app can never drift apart on her figures again.
import { solveSafeDraw } from '../domain/paycheck';
import { simulate, type RetirementInputs } from '../domain/retirement';

const SIM = { current_age: 72, horizon_age: 94, mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 400 };

// Fidelity Traditional IRA 420,000 + Schwab Brokerage 448,000 + Ally Savings 117,000
const JUNE_BALANCE = 985_000;
const GUARANTEED = 4000;          // Social Security 2,600 + Pension 1,400
const SPENDING = 5600;            // so she draws 1,600 a month from savings

test('the accounts sum to her balance', () => {
  expect(420_000 + 448_000 + 117_000).toBe(JUNE_BALANCE);
});

test('her balance is the one that produces the $4,155 draw on the paycheck', () => {
  expect(Math.round(solveSafeDraw(JUNE_BALANCE, GUARANTEED, SIM as any, 80))).toBe(4155);
});

test('the paycheck adds up, and the headroom is the draw she is not using', () => {
  expect(GUARANTEED + 4155).toBe(8155);            // guaranteed + draw = paycheck
  expect(SPENDING - GUARANTEED).toBe(1600);        // what she actually takes from savings
  expect(4155 - 1600).toBe(2555);                  // "estimated amount you can draw more"
});

test('at what she actually spends, the odds are 100 — capacity and actual are different questions', () => {
  const base: RetirementInputs = {
    ...SIM, retire_age: 72, start_balance: JUNE_BALANCE, annual_contribution: 0,
    retire_monthly_spend_today: SPENDING, guaranteed_monthly_income: GUARANTEED, guaranteed_start_age: 72,
  } as any;
  expect(simulate(base).chance_of_success).toBe(100);
  // and her real rate is a fraction of the capacity rate — 1.95%, not the 5.5% a reader would infer
  expect(+((1600 * 12 / JUNE_BALANCE) * 100).toFixed(2)).toBe(1.95);
});

test('her pre-tax balance is the one behind the required-withdrawal figure at 73', () => {
  expect(Math.round(420_000 / 26.5)).toBe(15_849);   // IRS uniform lifetime divisor at 73
});
