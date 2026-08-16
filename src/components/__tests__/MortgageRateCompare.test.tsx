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
  expect(screen.getByText(/\$3,584 a year/)).toBeOnTheScreen();
  expect(screen.getByText(/\$36,577 better off/)).toBeOnTheScreen();
});

test('BELOW the yield: the same sentence shape says paying down costs — this is the state that earns the feature', () => {
  render(<MortgageRateCompare {...BELOW} />);
  expect(screen.getByText('Your mortgage costs 3.1%. A ten-year Treasury pays 4.63% today.')).toBeOnTheScreen();
  expect(screen.getByText(/saves you less/)).toBeOnTheScreen();
  expect(screen.getByText(/\$6,304 a year/)).toBeOnTheScreen();
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

test('hide balances masks the dollars and leaves the rates — a rate is not a balance', () => {
  useStore.setState({ hideBalances: true } as any);
  render(<MortgageRateCompare {...ABOVE} />);
  expect(screen.getByText('Your mortgage costs 5.5%. A ten-year Treasury pays 4.63% today.')).toBeOnTheScreen();
  expect(screen.queryByText(/\$3,584/)).toBeNull();
});
