/** CF5-08 ON THE SCREEN (2026-11-01, FX-CF-C; R24, the one percent writer). $120,000 a year, single, $20,000 into a 401(k):
 *  $120,000 − $20,000 − $16,100 = $83,900 taxed; 10% × $12,400 + 12% × $38,000 + 22% × $33,500 = $1,240 + $4,560 + $7,370 = $13,170;
 *  13,170 ÷ 120,000 = 10.975% exactly, which rounds to 10.98%. The Tax organizer printed 10.97% (toFixed on the binary 10.97499…).
 *  No drawing draws the Tax organizer, so no drawn figure moves. */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [], useFocusEffect: () => {}, router: { push: jest.fn(), back: jest.fn() },
}));

test('the organizer\'s rate line reads ≈10.98% for $13,170 on $120,000, never 10.97%', () => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: {
    status: 'employed', incomeSources: ['employment'], filingStatus: 'single', birthYear: '1980',
    baseSalary: '10000', salaryFreq: 'monthly', salaryMode: 'gross', c_401k: String(20000 / 12),
  } } as any);
  const C = require('../TaxOrganizerScreen').default;
  render(<C />);
  expect(screen.getByText(/10\.98% of the year’s income/)).toBeOnTheScreen();
  expect(screen.queryByText(/10\.97%/)).toBeNull();
});
