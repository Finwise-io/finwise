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
    expect(screen.getByDisplayValue('165000')).toBeOnTheScreen();
  });
});

describe('RothScreen prefill (B-36)', () => {
  test('pre-tax 401(k) balance is prefilled from PRE_TAX accounts', () => {
    render(<RothScreen />);
    expect(screen.getByDisplayValue('120000')).toBeOnTheScreen();   // the $120k 401(k), not $0
  });
});
