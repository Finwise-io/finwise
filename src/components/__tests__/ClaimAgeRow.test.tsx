// The Social Security claim decision, answered IN THE ROW (founder ruling, 2026-08-12).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ClaimAgeRow } from '../ClaimAgeRow';
import { useStore } from '../../store/useStore';

beforeEach(() => { useStore.setState({ hideBalances: false } as any); });

test('the row STATES the answer — it never promises to explain it on another screen', () => {
  render(<ClaimAgeRow statementMonthly={2600} />);
  expect(screen.getByText(/Waiting from 67 to 70 pays/)).toBeOnTheScreen();
  expect(screen.getByText(/\$624 more a month/)).toBeOnTheScreen();
  expect(screen.getByText(/\$3,224 against \$2,600/)).toBeOnTheScreen();
});

test('all three ages carry their own real figure, from the published schedule', () => {
  render(<ClaimAgeRow statementMonthly={2600} />);
  expect(screen.getByText('62 · $1,820')).toBeOnTheScreen();
  expect(screen.getByText('67 · $2,600')).toBeOnTheScreen();
  expect(screen.getByText('70 · $3,224')).toBeOnTheScreen();
});

test('waiting STOPS paying at 70, and the row says so — otherwise people keep waiting', () => {
  render(<ClaimAgeRow statementMonthly={2600} />);
  expect(screen.getByText(/stops rising at 70 — waiting past then adds nothing/)).toBeOnTheScreen();
});

test('the chips are selectable, 44pt, and say what they mean out loud', () => {
  render(<ClaimAgeRow statementMonthly={2600} />);
  const seventy = screen.getByLabelText('Claiming at 70 pays $3,224 a month');
  expect(seventy.props.accessibilityState?.selected).toBe(false);
  fireEvent.press(seventy);
  expect(screen.getByLabelText('Claiming at 70 pays $3,224 a month').props.accessibilityState?.selected).toBe(true);
});

test('adopting an age is an explicit act, offered only once it differs from the plan', () => {
  const onAdopt = jest.fn();
  render(<ClaimAgeRow statementMonthly={2600} adoptedAge={67} onAdopt={onAdopt} />);
  expect(screen.queryByText(/Plan on claiming at/)).toBeNull();      // nothing to change yet
  fireEvent.press(screen.getByLabelText('Claiming at 70 pays $3,224 a month'));
  fireEvent.press(screen.getByText('Plan on claiming at 70'));
  expect(onAdopt).toHaveBeenCalledWith(70);
});

test('a different statement amount gives different money — nothing here is hard-coded', () => {
  render(<ClaimAgeRow statementMonthly={1800} />);
  expect(screen.getByText('67 · $1,800')).toBeOnTheScreen();
  expect(screen.getByText('70 · $2,232')).toBeOnTheScreen();
  expect(screen.getByText(/\$432 more a month/)).toBeOnTheScreen();
});

test('hide balances masks the money and leaves the ages readable', () => {
  useStore.setState({ hideBalances: true } as any);
  render(<ClaimAgeRow statementMonthly={2600} />);
  expect(screen.queryByText(/\$3,224/)).toBeNull();
  expect(screen.getByText(/Waiting from 67 to 70 pays/)).toBeOnTheScreen();
});
