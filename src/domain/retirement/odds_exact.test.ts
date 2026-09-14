/** THE ODDS ARE EXACT (founder, 2026-09-14: "use exact everywhere no rounding for odds") — replaces
 *  decision B6's nearest 5. 1,000 simulated futures give the odds to a tenth, and nothing rounds them
 *  further before they reach a screen. */
import { simulate } from './index';
import { displayOdds } from './willItLast';

const BASE: any = { current_age: 35, retire_age: 65, horizon_age: 92, start_balance: 363152, pre_tax_share: 0, rmd_tax_rate: 0.1,
  annual_contribution: 14400, contribution_growth: 0, retire_monthly_spend_today: 4500, guaranteed_streams: [], guaranteed_monthly_income: 0,
  guaranteed_start_age: 67, one_off_costs: [], now_year: 2026, inflation: 0.025, mean_return: 0.07773890271842093, vol_return: 0.13574415120941094, paths: 1000, seed: 42 };

test('the simulation reports the exact share of 1,000 futures — to a tenth, not a whole number', () => {
  const c = simulate(BASE).chance_of_success;
  expect(c).toBe(87.2);                                   // 872 of 1,000 futures last to 92 (the Net worth v08 household)
  expect(Math.round(c * 10)).toBe(c * 10);
});

test('display keeps the exact figure — no rounding to 5, only floating-point noise removed', () => {
  expect(displayOdds(87.2)).toBe(87.2);
  expect(displayOdds(98)).toBe(98);                        // B6 would have shown 95
  expect(displayOdds(0.3)).toBe(0.3);
  expect(displayOdds(87.19999999999999)).toBe(87.2);
  expect(displayOdds(80.75)).toBe(80.75);                  // 400 futures give quarters — kept, not cut to 80.8
});
