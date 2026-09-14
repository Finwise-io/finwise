/**
 * HOW DO YOU FILE YOUR TAXES? — the screen, against the approved mock (income-v5, frames 4a–4c).
 *
 * The app read a filing status, found nothing, and taxed everyone as a single filer — including the
 * couple who had just said they have a spouse. It COULD be set, but only from three chips buried in
 * the Tax organizer, and married-filing-separately was not among them though its table exists.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FilingStatusScreen from '../FilingStatusScreen';
import { useStore } from '../../store/useStore';
import { over65CountOf } from '../../domain/income';

const set = (op: any) => useStore.setState({ onboardingProfile: op, onboardingComplete: true } as any);
const SOLO = { baseSalary: '7000', salaryFreq: 'monthly', birthYear: '1959' };
const COUPLE = { ...SOLO, hasPartner: 'yes', partnerName: 'Sam' };

test('4a — all four statuses are offered, including married filing separately', () => {
  set(SOLO);
  render(<FilingStatusScreen />);
  for (const label of ['Single', 'Married filing jointly', 'Married filing separately', 'Head of household']) {
    expect(screen.getByLabelText(label)).toBeOnTheScreen();
  }
});

test('4a — just me: pre-answered as Single, and it says why', () => {
  set(SOLO);
  render(<FilingStatusScreen />);
  expect(screen.getByLabelText('Single').props.accessibilityState.selected).toBe(true);
  expect(screen.getByText(/because you entered it is just you/)).toBeOnTheScreen();
  expect(screen.queryByText('Is either of you 65 or older?')).toBeNull();   // not asked of one person
});

test('4b — a spouse: pre-answered as jointly, names them, and asks who is 65 or older', () => {
  set(COUPLE);
  render(<FilingStatusScreen />);
  expect(screen.getByLabelText('Married filing jointly').props.accessibilityState.selected).toBe(true);
  expect(screen.getByText(/because you entered about Sam/)).toBeOnTheScreen();
  expect(screen.getByText('Is either of you 65 or older?')).toBeOnTheScreen();
  expect(screen.getByText(/\$1,650 each on a joint return/)).toBeOnTheScreen();
});

test('THE FIX: a couple can be TWO people over 65 — it could only ever be one', () => {
  set({ ...COUPLE, filingStatus: 'married' });
  expect(over65CountOf({ ...COUPLE, filingStatus: 'married' } as any)).toBe(1);   // birth year alone
  render(<FilingStatusScreen />);
  fireEvent.press(screen.getByLabelText('Both of us'));
  fireEvent.press(screen.getByLabelText('Save'));
  expect(over65CountOf((useStore.getState() as any).onboardingProfile)).toBe(2);
});

test('4c — answering shows what it is worth, once', () => {
  set(COUPLE);
  render(<FilingStatusScreen />);
  fireEvent.press(screen.getByLabelText('Married filing jointly'));
  fireEvent.press(screen.getByLabelText('Save'));
  expect(screen.getByText('That changes your take-home')).toBeOnTheScreen();
  expect(screen.getByText('Taxed as single')).toBeOnTheScreen();
  expect(screen.getByText(/a month more/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Got it')).toBeOnTheScreen();
});

test('the answer is stored, so five surfaces stop assuming single', () => {
  set(COUPLE);
  render(<FilingStatusScreen />);
  fireEvent.press(screen.getByLabelText('Married filing separately'));
  fireEvent.press(screen.getByLabelText('Save'));
  expect((useStore.getState() as any).onboardingProfile.filingStatus).toBe('mfs');
});

test('one component, two frames: onboarding gets a progress bar and Continue', () => {
  set(SOLO);
  render(<FilingStatusScreen frame="onboarding" />);
  expect(screen.getByLabelText('Continue')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Back')).toBeNull();
  expect(screen.getByText('How do you file your taxes?')).toBeOnTheScreen();   // identical question
});
