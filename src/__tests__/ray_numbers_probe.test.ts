// RAY'S FIXTURE NUMBERS MUST RECONCILE (2026-08-13).
// The founder ruled the Social Security decision belongs to ages 60-70. Neither existing persona can
// show it — Pat is 58 and June is 72 and already claiming — so the handoff came back with that row
// drawn nowhere and the brief carried a name with no numbers behind it. Ray fills the hole in the
// middle of a 55-to-70 audience, and these pins hold his figures so the brief, the mock and the app
// cannot drift apart on him the way they did on June.
//
// He is worth more than a placeholder. On his numbers the claim decision ALONE carries him from 73%
// to 80% — the whole reason the row exists, in one person. And he is the clearest demonstration of
// the two-dial lesson this brief is built around: he is 67% of the way to the target he typed and
// will not reach it, while his odds are 73%. The two dials disagree, and both are right.
import { simulate, type RetirementInputs } from '../domain/retirement';
import { ssBenefitAtClaimAge, ssLifetimeTotal, FULL_RETIREMENT_AGE, LATEST_CREDIT_AGE } from '../domain/retirement/ssTiming';

const SIM = { current_age: 64, horizon_age: 92, mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 400 };

// Vanguard 401(k) 310,000 + Roth IRA 95,000 + savings 95,000
const RAY_BALANCE = 500_000;
const STATEMENT = 2600;          // his statement amount at full retirement age
const SPENDING = 4800;
const CONTRIB_ANNUAL = 6000;     // $500 a month, part-time
const TYPED_TARGET = 750_000;

const oddsClaimingAt = (claimAge: number) => simulate({
  ...SIM, retire_age: 67, start_balance: RAY_BALANCE, annual_contribution: CONTRIB_ANNUAL,
  retire_monthly_spend_today: SPENDING,
  guaranteed_monthly_income: Math.round(ssBenefitAtClaimAge(STATEMENT, claimAge)),
  guaranteed_start_age: claimAge,
} as RetirementInputs).chance_of_success;

test('the accounts sum to his balance', () => {
  expect(310_000 + 95_000 + 95_000).toBe(RAY_BALANCE);
});

test('the statement number becomes three real monthly figures', () => {
  expect(Math.round(ssBenefitAtClaimAge(STATEMENT, 62))).toBe(1820);
  expect(Math.round(ssBenefitAtClaimAge(STATEMENT, FULL_RETIREMENT_AGE))).toBe(2600);
  expect(Math.round(ssBenefitAtClaimAge(STATEMENT, LATEST_CREDIT_AGE))).toBe(3224);
  expect(3224 - 2600).toBe(624);                      // "$624 more a month if you wait to 70"
});

test('waiting is worth more over a life, not just per month', () => {
  expect(Math.round(ssLifetimeTotal(STATEMENT, 62, 90))).toBe(611_520);
  expect(Math.round(ssLifetimeTotal(STATEMENT, FULL_RETIREMENT_AGE, 90))).toBe(717_600);
  expect(Math.round(ssLifetimeTotal(STATEMENT, LATEST_CREDIT_AGE, 90))).toBe(773_760);
});

test('THE POINT OF HIM: the claim decision alone takes him from 73% to 80%', () => {
  expect(oddsClaimingAt(FULL_RETIREMENT_AGE)).toBe(73);
  expect(oddsClaimingAt(LATEST_CREDIT_AGE)).toBe(80);
});

test('his two dials disagree and both are honest — 67% of a target he will not reach, 73% odds', () => {
  expect(Math.round((RAY_BALANCE / TYPED_TARGET) * 100)).toBe(67);
  expect(TYPED_TARGET - RAY_BALANCE).toBe(250_000);
  // three years of $500 a month is $18,000 of new money — the gap does not close by saving
  expect(CONTRIB_ANNUAL * 3).toBeLessThan(TYPED_TARGET - RAY_BALANCE);
  expect(oddsClaimingAt(FULL_RETIREMENT_AGE)).toBeGreaterThan(Math.round((RAY_BALANCE / TYPED_TARGET) * 100) - 10);
});

test('he is inside the window the founder ruled on, and it is the app that decides that', () => {
  const { SS_DECISION_FROM, SS_DECISION_TO } = require('../domain/planning/hub');
  expect(SIM.current_age).toBeGreaterThanOrEqual(SS_DECISION_FROM);
  expect(SIM.current_age).toBeLessThanOrEqual(SS_DECISION_TO);
});
