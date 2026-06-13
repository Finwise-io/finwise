/**
 * B-40 — editing base pay after onboarding must take effect even when a per-month salary table
 * (gaps) was captured during onboarding; the table takes precedence, so the edit has to clear it.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import IncomeManagerScreen from '../IncomeManagerScreen';
import { useStore } from '../../store/useStore';
import { totalGrossAnnual } from '../../domain/income';

beforeEach(() => {
  useStore.getState().resetAll();
  // a 6-on/6-off worker: $10k for 6 months → $60k/yr via the table
  useStore.getState().setOnboardingProfile({
    taxMode: 'manual', manualTaxRate: '0', status: 'employed',
    salaryByMonth: ['10000', '10000', '10000', '10000', '10000', '10000', '0', '0', '0', '0', '0', '0'],
    salaryMode: 'gross', baseSalary: '10000',
  });
});

test('editing base pay to a flat amount clears the per-month table so it takes effect', () => {
  render(<IncomeManagerScreen />);
  // open the base-pay editor from the Base salary row
  fireEvent.press(screen.getByText('Base salary'));
  // enter a flat $8,000/mo and save (the editor defaults freq to the stored salaryFreq)
  const input = screen.getByPlaceholderText('0');
  fireEvent.changeText(input, '8000');
  fireEvent.press(screen.getByText(/^Save ·/));

  const op = useStore.getState().onboardingProfile as any;
  expect(op.salaryByMonth).toBeUndefined();           // table cleared
  expect(op.baseSalary).toBe('8000');
  // flat $8,000/mo now drives the annual (12 × 8,000), not the old gapped $60k
  expect(totalGrossAnnual(op)).toBe(96000);
});
