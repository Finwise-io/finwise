/** G7 (founder, 2026-09-12): the tax on pre-tax withdrawals inside the odds is the caller's own rate —
 *  never a built-in 22%. A caller with no rate gets no tax applied, not a guessed one. */
import { simulate } from './index';

const base: any = {
  current_age: 60, retire_age: 65, horizon_age: 90, nest_egg: 800_000, annual_contribution: 0,
  retire_monthly_spend_today: 4_000, guaranteed_income_monthly: 1_500, mean_return: 0.05, vol_return: 0.10,
  inflation: 0.025, paths: 300, seed: 7, pre_tax_share: 1,
};

test('no rate passed = the same odds as a rate of zero, not the odds of a 22% guess', () => {
  const none = simulate({ ...base }).chance_of_success;
  const zero = simulate({ ...base, rmd_tax_rate: 0 }).chance_of_success;
  const guess = simulate({ ...base, rmd_tax_rate: 0.22 }).chance_of_success;
  expect(none).toBe(zero);
  expect(guess).toBeLessThanOrEqual(zero);   // taxing withdrawals can only lower the odds
});

test('the rate is capped at 60%', () => {
  expect(simulate({ ...base, rmd_tax_rate: 0.9 }).chance_of_success).toBe(simulate({ ...base, rmd_tax_rate: 0.6 }).chance_of_success);
});
