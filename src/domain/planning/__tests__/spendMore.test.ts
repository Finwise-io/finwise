// "Can I spend more?" — the founder-approved plain-English row, computed live.
import { spendMoreState, spendMoreSentence } from '../spendMore';
import type { RetirementInputs } from '../../retirement';

const JUNE: RetirementInputs = {
  current_age: 72, horizon_age: 94, retire_age: 72, start_balance: 985_000,
  annual_contribution: 0, retire_monthly_spend_today: 5600,
  guaranteed_monthly_income: 4000, guaranteed_start_age: 72,
  mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 400,
} as any;

test('THE HEADLINE IS FREE MONEY — the largest extra that changes nothing', () => {
  const s = spendMoreState(JUNE, 2555);
  expect(s.oddsToday).toBe(100);
  expect(s.freeExtra).toBe(1000);          // her first $1,000/month costs her nothing
  expect(s.maxExtra).toBe(2555);
});

test('the free figure lands on a position the stepper can actually reach', () => {
  const s = spendMoreState(JUNE, 2555, 500);
  expect(s.freeExtra % 500).toBe(0);
});

test('every position is a REAL run — the design bucketed and overstated at $2,500', () => {
  const t = (extra: number) => spendMoreSentence(JUNE, extra, 94, 100);
  expect(t(0).chance).toBe(100);
  expect(t(1000).chance).toBe(100);
  expect(t(1500).chance).toBe(97);
  expect(t(2000).chance).toBe(90);
  // the handoff said "about 9 out of 10" here. It is 81 — nearly 4 in 5.
  expect(t(2500).chance).toBe(81);
  expect(t(2500).text).toMatch(/about 81 out of 100 simulated futures/);
  expect(t(2500).text).not.toMatch(/about 90 out of 100/);
});

test('at rest it says what is true today, not a floor she never set', () => {
  const t = spendMoreSentence(JUNE, 0, 94, 100);
  expect(t.text).toBe('Your money lasts past 94, in every simulated future we tested.');
  expect(t.tone).toBe('clear');
});

test('bad news NAMES the losing case rather than leaving her to imagine it', () => {
  const t = spendMoreSentence(JUNE, 2555, 94, 100);
  expect(t.chance).toBe(80);
  expect(t.text).toMatch(/In the other 20, it runs out before 94/);
  expect(t.tone).toBe('edge');
});

test('the banned words never appear in any sentence this row can produce', () => {
  for (const extra of [0, 500, 1000, 1500, 2000, 2500, 2555]) {
    const { text } = spendMoreSentence(JUNE, extra, 94, 100);
    expect(text).not.toMatch(/\bdraw\b/i);
    expect(text).not.toMatch(/\bodds\b/i);
    expect(text).not.toMatch(/held at/i);
    expect(text).not.toMatch(/\bfloor\b/i);
    expect(text).not.toMatch(/\bsafe\b/i);
  }
});

test('counts, never a bare percentage, once the news stops being "nothing changes"', () => {
  expect(spendMoreSentence(JUNE, 2000, 94, 100).text).toMatch(/out of 10/);
  expect(spendMoreSentence(JUNE, 2555, 94, 100).text).toMatch(/out of 10/);
});
