/** AN EDITOR KEEPS WHAT THE PERSON DID NOT CHANGE — launch check of 2026-10-20 (the bug came in with commit b1017749).
 *
 *  A note was put in the middle of a line, `// (DEC-4036f, 2026-10-10) unstated stays unstated`, and the calls after it
 *  on that line became part of the note and stopped running. On the Bonds editor that skipped loading the institution
 *  and the value-as-of date, so editing a bond and pressing Save wiped "Fidelity" and stamped today over 2026-06-02. On
 *  the Alternatives editor it skipped the value-as-of date, so Save stamped today over it. Each editor is opened here on
 *  a saved holding, ONE field is changed, and the rest must come back as it was. The class is held by
 *  src/__tests__/no_code_inside_comments.test.ts.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

const st = () => useStore.getState() as any;
beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true } as any);
});

test('Bonds: change only the rate of a saved bond — its institution "Fidelity" and its value-as-of 2026-06-02 are kept', () => {
  const BondsScreen = require('../BondsScreen').default;
  useStore.setState({ assetAccounts: [{ asset_id: 'b1', label: 'US Treasury 2030', institution: 'Fidelity', kind: 'fixed_income', asset_class: 'bonds',
    tax_bucket: 'TAXABLE', balance: 9800, face_value: 10000, coupon_rate: 0.04, maturity_date: '2030-06-30', value_as_of: '2026-06-02' }] } as any);
  render(<BondsScreen />);
  fireEvent.press(screen.getByText('US Treasury 2030'));                   // the row is headed by the bond's own name, as drawn (Bonds v02, 2026-10-20)
  expect(screen.getByDisplayValue('Fidelity')).toBeOnTheScreen();          // the editor opens with what was saved
  fireEvent.changeText(screen.getByPlaceholderText('4.5'), '4.25');
  fireEvent.press(screen.getByText('Save'));
  const b = st().assetAccounts.find((a: any) => a.asset_id === 'b1');
  expect(b.coupon_rate).toBeCloseTo(0.0425, 10);                          // the one change
  expect(b.institution).toBe('Fidelity');                                 // was wiped
  expect(b.value_as_of).toBe('2026-06-02');                               // was stamped today
});

test('Alternatives: change only the name of a saved holding — its value-as-of 2026-06-02 and its institution are kept', () => {
  const OtherInvestmentsScreen = require('../OtherInvestmentsScreen').default;
  useStore.setState({ assetAccounts: [{ asset_id: 'a1', label: 'Bitcoin', institution: 'Coinbase', kind: 'crypto', asset_class: 'alternatives',
    tax_bucket: 'TAXABLE', balance: 28000, value_as_of: '2026-06-02' }] } as any);
  render(<OtherInvestmentsScreen />);
  fireEvent.press(screen.getByText('Bitcoin'));
  fireEvent.changeText(screen.getByDisplayValue('Bitcoin'), 'Bitcoin (cold wallet)');
  fireEvent.press(screen.getByText('Save'));
  const a = st().assetAccounts.find((x: any) => x.asset_id === 'a1');
  expect(a.label).toBe('Bitcoin (cold wallet)');                          // the one change
  expect(a.value_as_of).toBe('2026-06-02');                               // was stamped today
  expect(a.institution).toBe('Coinbase');
  expect(a.balance).toBe(28000);
});
