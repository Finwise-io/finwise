/**
 * B-40 — editing base pay must take effect even when a per-month salary table was captured earlier;
 * the table takes precedence over the typical figure, so the edit has to be able to clear it.
 *
 * The edit used to happen in a sheet on the Income manager. Since the manager was rebuilt to its
 * approved drawing (2026-10-04) base pay is edited in one place, Your base pay — and the same bug was
 * waiting there: a table stored without a mode showed as "The same", so the gross typed beside it
 * changed nothing.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import { useStore } from '../../store/useStore';
import { totalGrossAnnual } from '../../domain/income';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

beforeEach(() => {
  useStore.getState().resetAll();
  // a 6-on/6-off worker: $10k for 6 months → $60k/year via the table
  useStore.getState().setOnboardingProfile({
    taxMode: 'manual', manualTaxRate: '0', status: 'employed',
    salaryByMonth: ['10000', '10000', '10000', '10000', '10000', '10000', '0', '0', '0', '0', '0', '0'],
    salaryMode: 'gross', baseSalary: '10000',
  } as any);
});

test('a month table entered earlier is shown as "It varies" — the screen never hides what drives the figures', () => {
  render(<BasePayScreen />);
  expect(screen.getByLabelText('It varies').props.accessibilityState.selected).toBe(true);
  expect(totalGrossAnnual(useStore.getState().onboardingProfile as any)).toBe(60000);
});

test('choosing "The same" and typing a flat amount clears the per-month table so it takes effect', () => {
  render(<BasePayScreen />);
  fireEvent.press(screen.getByLabelText('The same'));
  fireEvent.changeText(screen.getByLabelText('Gross pay each month'), '8000');

  const op = useStore.getState().onboardingProfile as any;
  expect(op.salaryByMonth).toBeUndefined();           // table cleared
  expect(op.baseSalary).toBe('8000');
  // flat $8,000/month now drives the annual (12 × 8,000), not the old gapped $60k
  expect(totalGrossAnnual(op)).toBe(96000);
});
