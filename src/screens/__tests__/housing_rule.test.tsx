/** HIS HOUSING RULE ON THE SCREENS — steps 2 and 3 of it (2026-10-04, DEC-1923, DEC-1924, DEC-1926):
 *  Rent from a property asks which property it is and its monthly mortgage payment, and sends the
 *  mortgage to Debts; the property form asks which property is the home lived in; and wherever the plan
 *  is shown, a mortgage in Debts is counted from Debts and the screen says the budget line is not. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AddAccountScreen from '../AddAccountScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';
import { useStore } from '../../store/useStore';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
let mockOpen: string | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({ open: mockOpen }), router: { push: jest.fn(), back: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));

const home = (id: string, label: string, more: Record<string, any> = {}) => ({ asset_id: id, label, kind: 'home', tax_bucket: 'PROPERTY', balance: 400000, target_return: 0, ...more });
const state = () => useStore.getState() as any;
const PROFILE = { status: 'employed', incomeSources: ['employment', 'rental'], baseSalary: '9000', salaryFreq: 'monthly', salaryMode: 'gross',
  taxMode: 'manual', manualTaxRate: '20', rentals: [{ type: 'long', income: '2400', expenses: '700' }] };
beforeEach(() => {
  mockOpen = undefined;
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', onboardingProfile: PROFILE } as any);
});

describe('Rent from a property', () => {
  test('with no property in Net worth it says to add the property first — and asks for no mortgage', () => {
    mockOpen = 'rental';
    render(<IncomeManagerScreen />);
    expect(screen.getByText('Which property is it?')).toBeOnTheScreen();
    expect(screen.getByText('Add this property first, on the Net worth page. Then its mortgage can be recorded here.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Monthly mortgage payment, property 1')).toBeNull();
    expect(screen.getByText('Tax, insurance, repairs, management.')).toBeOnTheScreen();      // and a mortgage is not a cost to run
  });

  test('it asks which property, then the monthly mortgage payment — and leaving the screen puts that mortgage in Debts, on that property', () => {
    useStore.setState({ assetAccounts: [home('p2', 'Lake house'), home('p1', 'Home', { re_use: 'primary' })] } as any);
    mockOpen = 'rental';
    render(<IncomeManagerScreen />);
    expect(screen.queryByLabelText('Monthly mortgage payment, property 1')).toBeNull();        // not until it says which property
    fireEvent.press(screen.getByLabelText('Property 1 is Lake house'));
    fireEvent.changeText(screen.getByLabelText('Monthly mortgage payment, property 1'), '1480');
    expect(state().liabilities).toHaveLength(0);                                                // nothing is written while typing
    fireEvent.press(screen.getByLabelText('Back'));
    expect(state().liabilities).toHaveLength(1);
    expect(state().liabilities[0]).toMatchObject({ label: 'Lake house mortgage', debt_type: 'MORTGAGE', minimum_monthly_payment: 1480, property_id: 'p2' });
    const rent = state().onboardingProfile.rentals[0];
    expect(rent.property_id).toBe('p2');                    // which is also what makes the Lake house a rental, not a second home
    expect(rent.expenses).toBe('700');                      // the running costs are untouched: the mortgage is not in them
    expect(rent.mortgage).toBe('');                         // the payment lives in Debts, once
  });

  test('a property that already has a mortgage in Debts is not asked again: the screen names it', () => {
    useStore.setState({ assetAccounts: [home('p2', 'Lake house')],
      liabilities: [{ debt_id: 'm1', label: 'Wells Fargo', debt_type: 'MORTGAGE', remaining_balance: 200000, interest_rate_apr: 0.06, minimum_monthly_payment: 1480, property_id: 'p2' }],
      onboardingProfile: { ...PROFILE, rentals: [{ type: 'long', income: '2400', expenses: '700', property_id: 'p2' }] } } as any);
    mockOpen = 'rental';
    render(<IncomeManagerScreen />);
    expect(screen.getByText('Its mortgage is in Debts: Wells Fargo. It is counted from there, not in the costs above.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Monthly mortgage payment, property 1')).toBeNull();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(state().liabilities).toHaveLength(1);            // and leaving adds nothing
  });
});

describe('adding a property: which one is the home lived in', () => {
  const add = (name: string, answer?: 'This is the home I live in' | 'This is not the home I live in') => {
    const r = render(<AddAccountScreen />);
    fireEvent.press(screen.getByLabelText('Real estate'));
    fireEvent.changeText(screen.getByLabelText('Account name'), name);
    fireEvent.changeText(screen.getByLabelText(/^Balance|^Value|^Current value|worth/i), '300000');
    if (answer) fireEvent.press(screen.getByLabelText(answer));
    fireEvent.press(screen.getByLabelText('Save this account'));
    r.unmount();
  };
  const useOf = (label: string) => state().assetAccounts.find((a: any) => a.label === label)?.re_use;

  test('the first property is the home unless they say otherwise; the next one is not, unless they say so', () => {
    add('Home');
    expect(useOf('Home')).toBe('primary');
    add('Lake house');
    expect([useOf('Home'), useOf('Lake house')]).toEqual(['primary', 'secondary']);
  });

  test('marking another property as the home takes the mark off the first — one home', () => {
    add('Old house');
    add('New house', 'This is the home I live in');
    expect([useOf('Old house'), useOf('New house')]).toEqual(['secondary', 'primary']);
  });
});

describe('the plan says when the budget line is not counted', () => {
  const HOUSEHOLD = {
    onboardingProfile: { ...PROFILE, rentals: [], monthlySpending: '0', spendCats: [
      { id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed', tier: 'critical' }, { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'critical' }] },
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 31000, target_return: 0 }, home('p1', 'Home')],
    liabilities: [{ debt_id: 'm1', label: 'Chase', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.06, minimum_monthly_payment: 2400, property_id: 'p1' }],
  };
  const SENTENCE = 'Your Rent / Mortgage budget line is not counted here: your home’s mortgage, Chase, is in Debts and is counted from there.';

  test('Net worth: the emergency fund counts the $2,400 from Debts, not the $2,300 budget line — $31,000 ÷ $3,100 = 10.0 months — and says so', () => {
    useStore.setState(HOUSEHOLD as any);
    const NetWorth = require('../NetWorthScreen').default;
    render(<NetWorth />);
    expect(screen.getByText('10.0 months')).toBeOnTheScreen();
    expect(screen.getByText(SENTENCE)).toBeOnTheScreen();
    expect(screen.getByText('Both include $2,400/month of debt payments you cannot stop.')).toBeOnTheScreen();
  });

  test('a renter sees no such sentence, and their rent is counted', () => {
    useStore.setState({ ...HOUSEHOLD, assetAccounts: [HOUSEHOLD.assetAccounts[0]], liabilities: [] } as any);
    const NetWorth = require('../NetWorthScreen').default;
    render(<NetWorth />);
    expect(screen.queryByText(/budget line is not counted/)).toBeNull();
    expect(screen.getByText(/\$31,000 cash ÷ \$3,000\/month essentials/)).toBeOnTheScreen();
  });

  test('Cash flow: the planned month takes the mortgage from Debts once, and says the budget line is not counted', () => {
    useStore.setState(HOUSEHOLD as any);
    const CashFlow = require('../CashFlowScreen').default;
    render(<CashFlow />);
    expect(screen.getAllByText(SENTENCE).length).toBeGreaterThan(0);
  });
});
