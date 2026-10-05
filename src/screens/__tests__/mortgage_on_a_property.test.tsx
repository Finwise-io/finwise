/** EVERY MORTGAGE IS ON A PROPERTY — on the three screens where one is entered or shown.
 *
 *  His rule, 2026-10-04 (DEC-1925): "Properties, mortgages, and debt we should ask user to name. App
 *  should map properties included in networth against mortgages. It is feasible to have property
 *  without mortgage but no mortgage without property." And of how to build it: "all these screens
 *  exists - just modify them."
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AddAccountScreen from '../AddAccountScreen';
import { DebtEditorSheet } from '../../components/DebtEditorSheet';
import { useStore } from '../../store/useStore';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));

const home = (id: string, label: string) => ({ asset_id: id, label, kind: 'home', tax_bucket: 'PROPERTY', balance: 400000, target_return: 0 });
const state = () => useStore.getState() as any;
beforeEach(() => { useStore.getState().resetAll(); useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self' } as any); });

describe('the debt editor', () => {
  test('a mortgage with no property in Net worth cannot be saved, and the form says why', () => {
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);
    fireEvent.press(screen.getByLabelText('Mortgage'));
    expect(screen.getByText('Which property is it on?')).toBeOnTheScreen();
    expect(screen.getByText('A mortgage is always on a property. Add the property in Net worth first, then add its mortgage.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('0'), '250000');
    fireEvent.press(screen.getByLabelText('Add debt'));
    expect(state().liabilities).toHaveLength(0);
  });

  test('with properties, it asks which one — and the mortgage is saved on it', () => {
    useStore.setState({ assetAccounts: [home('p1', 'Home'), home('p2', 'Lake house')] } as any);
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);
    fireEvent.press(screen.getByLabelText('Mortgage'));
    fireEvent.changeText(screen.getByPlaceholderText('Lender / name (e.g. Chase Sapphire)'), 'Chase');
    fireEvent.changeText(screen.getByPlaceholderText('0'), '250000');
    fireEvent.press(screen.getByLabelText('Add debt'));
    expect(state().liabilities).toHaveLength(0);                       // not until it says which property
    fireEvent.press(screen.getByLabelText('On Lake house'));
    fireEvent.press(screen.getByLabelText('Add debt'));
    expect(state().liabilities).toHaveLength(1);
    expect(state().liabilities[0]).toMatchObject({ label: 'Chase', debt_type: 'MORTGAGE', property_id: 'p2' });
  });

  test('a property that already carries a mortgage is not offered to a second one; a card is never asked', () => {
    useStore.setState({ assetAccounts: [home('p1', 'Home'), home('p2', 'Lake house')],
      liabilities: [{ debt_id: 'm1', label: 'Chase', debt_type: 'MORTGAGE', remaining_balance: 1, interest_rate_apr: 0, minimum_monthly_payment: 1, property_id: 'p1' }] } as any);
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);
    expect(screen.queryByText('Which property is it on?')).toBeNull();   // it opens on Credit card
    fireEvent.press(screen.getByLabelText('Mortgage'));
    expect(screen.queryByLabelText('On Home')).toBeNull();
    expect(screen.getByLabelText('On Lake house')).toBeOnTheScreen();
  });
});

describe('adding a property by hand', () => {
  test('its mortgage is written with its monthly payment, on that property', () => {
    render(<AddAccountScreen />);
    fireEvent.press(screen.getByLabelText('Real estate'));
    fireEvent.changeText(screen.getByLabelText('Account name'), 'Lake house');
    fireEvent.changeText(screen.getByLabelText(/^Balance|^Value|^Current value/), '350000');
    expect(screen.queryByLabelText('Monthly mortgage payment')).toBeNull();   // asked only once there is a mortgage
    fireEvent.changeText(screen.getByLabelText('Amount still owed'), '210000');
    fireEvent.changeText(screen.getByLabelText('Monthly mortgage payment'), '1480');
    fireEvent.press(screen.getByLabelText('Save this account'));
    const property = state().assetAccounts.find((a: any) => a.label === 'Lake house');
    expect(property).toBeDefined();
    expect(state().liabilities).toHaveLength(1);
    expect(state().liabilities[0]).toMatchObject({ label: 'Lake house mortgage', debt_type: 'MORTGAGE', remaining_balance: 210000,
      minimum_monthly_payment: 1480, property_id: property.asset_id });   // it used to be written with a $0 payment and no property
  });
});

describe('Net worth', () => {
  const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
  const mortgage = (id: string, label: string, property_id?: string) => ({ debt_id: id, label, debt_type: 'MORTGAGE', remaining_balance: 200000, interest_rate_apr: 0.06, minimum_monthly_payment: 1500, property_id });
  test('a mortgage on no property is named under the debts; with every mortgage placed the line is gone', () => {
    useStore.setState({ assetAccounts: [home('p1', 'Home'), home('p2', 'Lake house')], liabilities: [mortgage('m1', 'Chase')] } as any);
    const first = render(<NetWorth />);
    expect(screen.getByText('Chase is not on a property. A mortgage is always on a property — open it and say which one.')).toBeOnTheScreen();
    first.unmount();
    useStore.setState({ liabilities: [mortgage('m1', 'Chase', 'p2')] } as any);
    render(<NetWorth />);
    expect(screen.queryByText(/is not on a property/)).toBeNull();
  });
});
