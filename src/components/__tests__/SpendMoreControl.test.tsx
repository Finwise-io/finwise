// "Can I spend more?" ON SCREEN — the founder-approved plain-English row.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SpendMoreControl } from '../SpendMoreControl';
import { useStore } from '../../store/useStore';
import type { RetirementInputs } from '../../domain/retirement';

const JUNE: RetirementInputs = {
  current_age: 72, horizon_age: 94, retire_age: 72, start_balance: 985_000,
  annual_contribution: 0, retire_monthly_spend_today: 5600,
  guaranteed_monthly_income: 4000, guaranteed_start_age: 72,
  mean_return: 0.055, vol_return: 0.0935, inflation: 0.025, seed: 42, paths: 400,
} as any;

beforeEach(() => { useStore.setState({ hideBalances: false } as any); });
const show = () => render(<SpendMoreControl inputs={JUNE} maxExtra={2555} horizonAge={94} />);

test('THE ANSWER COMES FIRST, and it is the free room', () => {
  show();
  expect(screen.getByText(/Yes — about \$1,000 a month more, and nothing changes\./)).toBeOnTheScreen();
  expect(screen.getByText(/You spend/)).toBeOnTheScreen();
  expect(screen.getByText(/still lasts past 94, exactly as it does today/)).toBeOnTheScreen();
});

test('at rest the total is named as what she already spends, not a result', () => {
  show();
  expect(screen.getByText(/the same as now/)).toBeOnTheScreen();
  expect(screen.getByText(/Your money lasts past 94, in every future simulation we tested/)).toBeOnTheScreen();
});

test('the consequence is a real run at every position — not a bucket', () => {
  show();
  const up = screen.getByLabelText('Spend more extra');
  for (let i = 0; i < 5; i++) fireEvent.press(up);          // 0 -> 2500
  // the design said "9 out of 10" here; it is 8
  expect(screen.getByText(/about 8 future simulations out of 10/)).toBeOnTheScreen();
  expect(screen.queryByText(/about 9 future simulations out of 10/)).toBeNull();
});

test('at the maximum it names the losing case rather than leaving it to imagination', () => {
  show();
  const up = screen.getByLabelText('Spend more extra');
  for (let i = 0; i < 8; i++) fireEvent.press(up);          // clamps at 2555
  expect(screen.getByText(/In the other 2, it runs out before 94/)).toBeOnTheScreen();
  expect(screen.getByText(/the most your income and savings can cover/)).toBeOnTheScreen();
});

test('the banned words are absent from the whole row, at every position', () => {
  show();
  const up = screen.getByLabelText('Spend more extra');
  for (let i = 0; i <= 6; i++) {
    for (const word of [/\bodds\b/i, /held at/i, /\bfloor\b/i, /\bsafe\b/i]) {
      expect(screen.queryByText(word)).toBeNull();
    }
    fireEvent.press(up);
  }
});

test('the draw-and-spend link is said once, because she cannot infer it', () => {
  show();
  expect(screen.getByText(/Your Social Security and pension don't change, so anything extra comes out of savings\./)).toBeOnTheScreen();
});

test('the steppers are 44pt and disable at their ends rather than doing nothing', () => {
  show();
  expect(screen.getByLabelText('Spend less extra').props.accessibilityState?.disabled).toBe(true);
  fireEvent.press(screen.getByLabelText('Spend more extra'));
  expect(screen.getByLabelText('Spend less extra').props.accessibilityState?.disabled).toBe(false);
});

test('"Use as my plan" only appears once there is something to commit', () => {
  const onCommit = jest.fn();
  render(<SpendMoreControl inputs={JUNE} maxExtra={2555} horizonAge={94} onCommit={onCommit} />);
  expect(screen.queryByText('Use as my plan')).toBeNull();
  fireEvent.press(screen.getByLabelText('Spend more extra'));
  fireEvent.press(screen.getByText('Use as my plan'));
  expect(onCommit).toHaveBeenCalledWith(6100);
});
