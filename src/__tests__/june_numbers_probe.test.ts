// JUNE'S FIXTURE NUMBERS MUST RECONCILE (2026-08-13).
// The design handoff put Pat's $909,152 on June's screen beside a $4,155 draw, and the two do not
// correspond — the function's maximum draw on $909,152 is $3,835. These pins hold the corrected set
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

// ── THE SPEND-MORE CONTROL: the odds beside it are LIVE, never a fixed 80% (founder, 2026-08-14) ──
// The v3 handoff printed "→ $5,600/month in total · held at odds of 80%" at every stepper position.
// "Held at odds of 80%" describes how the $2,555 was CALCULATED — it is not a property of whatever
// the control currently reads. At rest June is at 100%, so as drawn the screen showed 80% directly
// beneath a dial reading 100% for the same plan. These pin the real curve so the build cannot repeat
// it, and so the design can promise the thing that is actually true: her first $1,000/month is free.
describe('spend-more: the odds move with the control', () => {
  const oddsAtSpend = (spend: number) => simulate({
    ...SIM, retire_age: 72, start_balance: JUNE_BALANCE, annual_contribution: 0,
    retire_monthly_spend_today: spend, guaranteed_monthly_income: GUARANTEED, guaranteed_start_age: 72,
  } as any).chance_of_success;

  test('at rest the control shows what she already spends, at her real odds — not the 80% floor', () => {
    expect(oddsAtSpend(SPENDING)).toBe(100);
  });

  test('the first $1,000/month genuinely costs her nothing', () => {
    expect(oddsAtSpend(SPENDING + 500)).toBe(100);
    expect(oddsAtSpend(SPENDING + 1000)).toBe(100);
  });

  test('past that it declines honestly, reaching the 80% floor exactly at the maximum', () => {
    expect(oddsAtSpend(SPENDING + 1500)).toBe(97);
    expect(oddsAtSpend(SPENDING + 2000)).toBe(90);
    expect(oddsAtSpend(SPENDING + 2555)).toBe(80);       // $8,155 — her whole paycheck
  });

  test('the maximum position spends exactly her paycheck: guaranteed + the full draw', () => {
    expect(SPENDING + 2555).toBe(GUARANTEED + 4155);
  });
});
