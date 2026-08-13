// THE 80% PROMISE MUST BE TRUE, NOT NEARLY TRUE (founder ruling 2026-08-13, audit D1+D2).
//
// Both figures are found by hunting for the smallest amount that clears TARGET_ODDS, then rounded so
// they read like human numbers. They used to round to the NEAREST step, which could land back BELOW
// the line the search had just cleared — the audit measured a printed target of $1,370,000 that
// delivered 76%, and a saving that promised 80% and delivered 79%. They round UP now, and these pins
// hold the promise rather than the implementation.
import { targetAtRetirement, requiredAnnualSaving, TARGET_ODDS } from './target';
import { simulate, type RetirementInputs } from '../retirement';

const PAT: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90,
  start_balance: 909152, annual_contribution: 0,
  retire_monthly_spend_today: 5200, guaranteed_monthly_income: 0,
  mean_return: 0.055, vol_return: 0.0935, inflation: 0.025,
  seed: 42, paths: 400,
} as any;

const oddsHolding = (balance: number) => simulate({
  ...PAT, current_age: PAT.retire_age, retire_age: PAT.retire_age,
  start_balance: balance, annual_contribution: 0,
} as any).chance_of_success;

describe('the suggested target', () => {
  test('holding it delivers the odds it promises — never a point under', () => {
    const target = targetAtRetirement(PAT)!;
    expect(target).not.toBeNull();
    expect(oddsHolding(target)).toBeGreaterThanOrEqual(TARGET_ODDS);
  });

  test('it still reads like a target — a whole ten thousand', () => {
    expect(targetAtRetirement(PAT)! % 10_000).toBe(0);
  });

  test('and it is not inflated to get there: one step lower would miss', () => {
    const target = targetAtRetirement(PAT)!;
    expect(oddsHolding(target - 10_000)).toBeLessThan(TARGET_ODDS);
  });
});

describe('the required yearly saving', () => {
  test('saving it delivers the odds the sentence promises', () => {
    const saving = requiredAnnualSaving(PAT)!;
    expect(saving).not.toBeNull();
    expect(simulate({ ...PAT, annual_contribution: saving.total } as any).chance_of_success)
      .toBeGreaterThanOrEqual(TARGET_ODDS);
  });

  test('it rounds to a whole $500, and one step lower would miss', () => {
    const saving = requiredAnnualSaving(PAT)!;
    expect(saving.total % 500).toBe(0);
    expect(simulate({ ...PAT, annual_contribution: saving.total - 500 } as any).chance_of_success)
      .toBeLessThan(TARGET_ODDS);
  });
});
