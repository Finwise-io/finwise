/**
 * B-36 — the planning tools prefill from known data instead of starting at $0
 * (which produced an absurd insurance "gap" and a misleading Roth "no room" message).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import InsuranceScreen from '../InsuranceScreen';
import RothScreen from '../RothScreen';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.getState().setOnboardingProfile(employedPartner);
  useStore.getState().seedNetWorth(employedPartner);   // 401(k) $120k (PRE_TAX) + investments $45k (TAXABLE)
});

describe('InsuranceScreen prefill (B-36)', () => {
  test('savings/assets is prefilled from investable accounts, not left at $0', () => {
    render(<InsuranceScreen />);
    // investable = 401(k) 120k + investments 45k = 165,000 (property excluded; none here)
    expect(screen.getByDisplayValue('$165,000')).toBeOnTheScreen();   // the money form since 2026-10-27 (DEC-8385): the same 165,000, prefilled
  });
});

describe('RothScreen prefill (B-36)', () => {
  test('pre-tax 401(k) balance is prefilled from PRE_TAX accounts', () => {
    render(<RothScreen />);
    // FCC rebuild: the balance is no longer a prefilled input — the REAL bucket shows as fact
    expect(screen.getByText(/from your pre-tax \$120,000/)).toBeOnTheScreen();
  });
});

// THE OLD ANSWER, KEPT (the fix wave's rule): until 2026-10-27 the savings box printed the plain 165000; it reads $165,000 now (DEC-8385).
// This fails because the box prints money; the day it passes, the box has gone back to a plain figure.
test.failing('before 2026-10-27, kept · Insurance prefilled savings/assets as the plain 165000', () => {
  render(<InsuranceScreen />);
  expect(screen.getByDisplayValue('165000')).toBeOnTheScreen();
});
