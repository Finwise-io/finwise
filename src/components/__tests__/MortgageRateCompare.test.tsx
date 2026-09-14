// The mortgage rate comparison ON SCREEN — founder-approved wording, both directions.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MortgageRateCompare } from '../MortgageRateCompare';
import { useStore } from '../../store/useStore';

const ABOVE = { balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: 0.0463 };
const BELOW = { ...ABOVE, annualRate: 0.031, monthlyPayment: 2000 };

beforeEach(() => { useStore.setState({ hideBalances: false } as any); });

test('above the yield: it says paying down saves MORE, with both figures', () => {
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.getByText('Your mortgage costs 5.5%. A ten-year Treasury pays 4.63% today.')).toBeOnTheScreen();
  expect(screen.getByText(/saves you more/)).toBeOnTheScreen();
  expect(screen.getByText(/\$3,584\/year/)).toBeOnTheScreen();
  expect(screen.getByText(/\$36,577 better off/)).toBeOnTheScreen();
});

test('BELOW the yield: the same sentence shape says paying down costs — this is the state that earns the feature', () => {
  render(<MortgageRateCompare {...BELOW} />);
  expect(screen.getByText('Your mortgage costs 3.1%. A ten-year Treasury pays 4.63% today.')).toBeOnTheScreen();
  expect(screen.getByText(/saves you less/)).toBeOnTheScreen();
  expect(screen.getByText(/\$6,304\/year/)).toBeOnTheScreen();
  expect(screen.getByText(/\$40,217 worse off/)).toBeOnTheScreen();
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

test('tax is directional, never a per-person number we cannot stand behind', () => {
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.getByText(/Tax usually widens this gap/)).toBeOnTheScreen();
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
  render(<MortgageRateCompare {...ABOVE} planInputs={PLAN} nowYear={2026} />);
  expect(screen.getByText(/not going into savings while the loan runs/)).toBeOnTheScreen();
  expect(screen.getByText(/out of 100 simulated futures/)).toBeOnTheScreen();
});

test('it names BOTH halves of the trade — the squeeze and the payment freeing up', () => {
  render(<MortgageRateCompare {...ABOVE} planInputs={PLAN} nowYear={2026} />);
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
  expect(screen.getByText('Your mortgage costs 5.5%. A ten-year Treasury pays 4.63% today.')).toBeOnTheScreen();
  expect(screen.queryByText(/\$3,584/)).toBeNull();
});
