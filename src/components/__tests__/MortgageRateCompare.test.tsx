// The mortgage rate comparison ON SCREEN — founder-approved wording, both directions.
// 2026-10-26 (PF-TOOLS): the rates are written to two decimals (Q49; cash-flow_v01 READ THIS FIRST 2026-10-26) — 5.5% reads 5.50%
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MortgageRateCompare } from '../MortgageRateCompare';
import { useStore } from '../../store/useStore';

const ABOVE = { balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: 0.0463 };
const BELOW = { ...ABOVE, annualRate: 0.031, monthlyPayment: 2000 };

beforeEach(() => { useStore.setState({ hideBalances: false } as any); });

test('above the yield: it says paying down saves MORE, with both figures', () => {
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.getByText('Your mortgage costs 5.50%. A ten-year Treasury pays 4.63% today, before tax.')).toBeOnTheScreen();
  expect(screen.getByText(/saves you more/)).toBeOnTheScreen();
  expect(screen.getByText(/\$3,584\/year/)).toBeOnTheScreen();
  expect(screen.getByText(/\$39,618 better off/)).toBeOnTheScreen();   // 2026-10-25: last payments only what is left (was $36,577)
});

test('BELOW the yield: the same sentence shape says paying down costs — this is the state that earns the feature', () => {
  render(<MortgageRateCompare {...BELOW} />);
  expect(screen.getByText('Your mortgage costs 3.10%. A ten-year Treasury pays 4.63% today, before tax.')).toBeOnTheScreen();
  expect(screen.getByText(/saves you less/)).toBeOnTheScreen();
  expect(screen.getByText(/\$6,304\/year/)).toBeOnTheScreen();
  expect(screen.getByText(/\$41,295 worse off/)).toBeOnTheScreen();   // 2026-10-25: was $40,217
});

test('it never tells them what to do — no "should", no recommendation', () => {
  for (const props of [ABOVE, BELOW]) {
    const { unmount } = render(<MortgageRateCompare {...props} />);
    expect(screen.queryByText(/you should/i)).toBeNull();
    expect(screen.queryByText(/we recommend/i)).toBeNull();
    expect(screen.queryByText(/best option/i)).toBeNull();
    unmount();
  }
});

test('shares are named as a different question — the certainty is what separates them', () => {
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.getByText(/Shares might earn more than either — or less/)).toBeOnTheScreen();
  expect(screen.getByText(/only one that is certain/)).toBeOnTheScreen();
});

// AFTER FEDERAL TAX WHEN THE BRACKET IS KNOWN (2026-10-25, FIX-ROOM; the lead's ruling on MK-CF-F-043 under tenet 7 and DEC-0160;
// drawing cash-flow v01, READ THIS FIRST row of 2026-10-25). The sentence says which, whichever way it falls.
test('no income entered: the comparison is before tax, and says so — "Tax usually widens this gap" is gone (it is not always so)', () => {
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.getByText(/Before tax: a Treasury’s interest is taxed, so after tax it pays less than this\./)).toBeOnTheScreen();
  expect(screen.queryByText(/Tax usually widens this gap/)).toBeNull();
});
test.failing('the card until 2026-10-25, pinned: "Tax usually widens this gap rather than closing it" — no longer its words (FIXED 2026-10-25)', () => {
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.getByText(/Tax usually widens this gap/)).toBeOnTheScreen();
});
const C04 = { balance: 173_111.17, annualRate: 0.041, monthlyPayment: 1131.43, extraMonthly: 0, treasuryYield: 0.043 };
test('a 24% bracket: a 4.30% Treasury keeps 3.27%, so paying down a 4.10% mortgage wins — about $1,440/year on $173,111', () => {
  render(<MortgageRateCompare {...C04} federalRate={0.24} />);
  expect(screen.getByText('Your mortgage costs 4.10%. A ten-year Treasury pays 4.30% today — 3.27% after your 24% federal tax bracket.')).toBeOnTheScreen();
  expect(screen.getByText(/saves you more/)).toBeOnTheScreen();
  expect(screen.getByText(/\$1,440\/year/)).toBeOnTheScreen();
  expect(screen.getByText(/The Treasury is shown after federal tax \(it pays no state tax\), the mortgage without any interest deduction\./)).toBeOnTheScreen();
});
test.failing('the card until 2026-10-25, pinned: the same loan read "too close to call" before tax — no longer its answer at a known bracket (FIXED 2026-10-25)', () => {
  render(<MortgageRateCompare {...C04} federalRate={0.24} />);
  expect(screen.getByText(/neither choice is clearly better/)).toBeOnTheScreen();
});
test('THE BRACKET IS THE INCOME SUMMARY\'S: with a salary entered, the card names the bracket MK-CF-O-004 shows as "Federal tax bracket"', () => {
  const { incomeSummary } = require('../../../MoneyKeel/functions/cashflow/income-summary');
  const { federalBracketForComparison } = require('../MortgageRateCompare');
  const op = { filingStatus: 'single', baseSalary: 12_500, salaryFreq: 'monthly', salaryMode: 'gross', birthYear: 1970 };   // $150,000 a year
  const shown = incomeSummary(op).taxed.bracket;
  expect(federalBracketForComparison(op)).toBe(shown);
  expect(shown).toBeGreaterThan(0);
  useStore.setState({ onboardingProfile: op } as any);
  render(<MortgageRateCompare {...C04} />);
  expect(screen.getByText(new RegExp(`after your ${Math.round(shown * 100)}% federal tax bracket\\.$`))).toBeOnTheScreen();
  useStore.setState({ onboardingProfile: null } as any);
});
test('a payment that never clears the loan says there is no lifetime figure, instead of leaving it out silently (MK-CF-F-125)', () => {
  render(<MortgageRateCompare balance={412_000} annualRate={0.055} monthlyPayment={100} extraMonthly={50} treasuryYield={0.0463} />);
  expect(screen.getByText(/At this payment the loan never clears, so there is no lifetime figure\./)).toBeOnTheScreen();
});

test('within a quarter-point it refuses to pick a winner rather than inventing precision', () => {
  render(<MortgageRateCompare {...ABOVE} annualRate={0.045} />);
  expect(screen.getByText(/neither choice is clearly better/)).toBeOnTheScreen();
  expect(screen.queryByText(/saves you more/)).toBeNull();
  expect(screen.queryByText(/saves you less/)).toBeNull();
});

test('a stale rate SAYS it is stale — this is the screen where that changes the answer', () => {
  render(<MortgageRateCompare {...ABOVE} isFallback />);
  expect(screen.getByText(/could not reach the rate feed today/)).toBeOnTheScreen();
});

// ── THE RETIREMENT CONSEQUENCE (added 2026-08-14) ───────────────────────────────────────────────
// Moving this decision to the debt surface and leaving this line behind on Retire would let someone
// decide blind to its biggest effect. I did exactly that in the first build; the audit caught it.
const PLAN = {
  current_age: 58, retire_age: 65, horizon_age: 90, start_balance: 909_152,
  annual_contribution: 12_000, retire_monthly_spend_today: 5200,
  guaranteed_monthly_income: 0, guaranteed_start_age: 67,
  mean_return: 0.0585, vol_return: 0.0752, inflation: 0.025, seed: 42, paths: 400, now_year: 2026,
} as any;

test('the retirement consequence TRAVELS with the control', () => {
  render(<MortgageRateCompare {...ABOVE} planInputs={PLAN} nowYear={2026} nowMonth={1} />);
  expect(screen.getByText(/not going into savings while the loan runs/)).toBeOnTheScreen();
  expect(screen.getByText(/out of 100 simulated futures/)).toBeOnTheScreen();
});

test('it names BOTH halves of the trade — the squeeze and the payment freeing up', () => {
  render(<MortgageRateCompare {...ABOVE} planInputs={PLAN} nowYear={2026} nowMonth={1} />);
  expect(screen.getByText(/whole/)).toBeOnTheScreen();
  expect(screen.getByText(/2045 instead of 2054/)).toBeOnTheScreen();
});

test('without a plan on file it says nothing rather than guessing', () => {
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.queryByText(/future simulations out of 100/)).toBeNull();
});

test('hide balances masks the dollars and leaves the rates — a rate is not a balance', () => {
  useStore.setState({ hideBalances: true } as any);
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.getByText('Your mortgage costs 5.50%. A ten-year Treasury pays 4.63% today, before tax.')).toBeOnTheScreen();
  expect(screen.queryByText(/\$3,584/)).toBeNull();
});
