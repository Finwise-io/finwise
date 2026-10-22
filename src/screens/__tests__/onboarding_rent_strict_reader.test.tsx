/** THE SIGN-UP RENT STEP READS A FIGURE THE WAY IT IS COUNTED (DEC-3768c, 2026-10-10) — launch check of 2026-10-20.
 *
 *  His approval ("#2,3 - approved."): a rent or running-cost figure is a number; one with words in it — "about 2k" — is
 *  not read and counts as not entered. What is COUNTED (rentalList) already read it strictly, but the sign-up step SHOWED
 *  it through the lenient reader, which keeps the digits: a pasted "about 2k" read "Net $2/month" and "$2/month net rental
 *  income". The step now reads through the one strict reader, rentFigure, so an unreadable figure shows as not entered.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import OnboardingScreen from '../OnboardingScreen';
import { rentStepReady } from '../../onboarding/modules';
import { rentalList } from '../../domain/income/onboarding';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

// steps: status · goals · whatYouNeed · income_sources · income_rental (index 4)
const atRentStep = (rentals: any[]) => {
  useStore.getState().resetAll();
  useStore.setState({
    user: { uid: 't', email: 't@t.com', name: 'T' }, onboardingComplete: false, assetAccounts: [],
    onboardingDraft: { stepIndex: 4, status: 'employed', tracks: ['spend'], name: 'T', answers: { incomeSources: ['rental'], rentals } },
  } as any);
  render(<OnboardingScreen />);
};

test('"about 2k" pasted as the rent shows as not entered — never "Net $2/month"', () => {
  atRentStep([{ type: 'long', income: 'about 2k', expenses: '' }]);
  expect(screen.getByText('Rental property')).toBeOnTheScreen();
  expect(screen.queryByText(/\$2\/month/)).toBeNull();                    // the lenient reader made this "$2"
  expect(screen.queryByText(/net rental income/)).toBeNull();              // nothing counted, nothing summed
  // and it is what is counted: the one strict reader reads it as nothing too
  expect(rentalList({ rentals: [{ type: 'long', income: 'about 2k', property_id: 'p' }] } as any)).toEqual([]);
});

test('a plain figure still reads: "2,000" rent less "600" costs is "Net $1,400/month"', () => {
  atRentStep([{ type: 'long', income: '2,000', expenses: '600' }]);
  expect(screen.getByText('$1,400/month')).toBeOnTheScreen();                // the bold half of the row's "Net …" line
  expect(screen.getByText('$1,400/month net rental income')).toBeOnTheScreen();
});

test('an unreadable figure asks for no property: only a figure that reads needs its property picked', () => {
  const held = [{ asset_id: 'lake', label: 'Lake house', asset_class: 'real_estate' }];
  expect(rentStepReady({ rentals: [{ income: 'about 2k' }] }, held)).toBe(true);
  expect(rentStepReady({ rentals: [{ income: '1800' }] }, held)).toBe(false);
});
