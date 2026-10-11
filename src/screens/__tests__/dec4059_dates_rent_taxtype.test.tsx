/** HIS DECISIONS OF 2026-10-10 ON THE SCREENS — DEC-4059b, DEC-4059c, DEC-4059d and the DEC-4036f follow-up.
 *
 *  DEC-4059b: "8: The app is not launched so not date typed before fix. Use date picker for date." — a bond's or CD's
 *  maturity on the Net worth account editor is picked, never typed.
 *  DEC-4059c: "9: Say date cannot be read. Edit date. and give user an option to enter or correct date." — the
 *  Account portfolio's history line refuses an unreadable start date and offers "Edit date"; the person's date is saved.
 *  DEC-4059d: "10 - approved" — a rent entry with no property is not counted, asks in amber, and offers a door to add one.
 *  DEC-4036f: "An account with no account type chosen is never assumed taxable." — no form saves Taxable for the person.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  router: { push: mockPush, back: jest.fn(), setParams: jest.fn() },
  useFocusEffect: () => {},
  useSegments: () => [],
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));

const st = () => useStore.getState() as any;
beforeEach(() => {
  useStore.getState().resetAll();
  mockParams = {}; mockPush.mockClear();
  useStore.setState({ hideBalances: false, nwSeeded: true, nwSetupChoice: 'self', onboardingComplete: true } as any);
});
const tenYearsOut = () => `${new Date().getFullYear() + 10}-01-01`;
/** Opens the Net worth add sheet the way the guided set-up does — its first step, Cash, "+ Add". */
const openAddSheet = (toPicker: boolean) => {
  const NetWorthScreen = require('../NetWorthScreen').default;
  useStore.setState({ nwSetupChoice: 'guided' } as any);
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Add to Cash'));
  if (toPicker) fireEvent.press(screen.getByLabelText('Back'));
};

describe('DEC-4059b — the Net worth account editor picks a maturity date, never types one', () => {
  test('editing a CD shows a date picker (no typed box), and Save stores the full picked date', () => {
    const NetWorthScreen = require('../NetWorthScreen').default;
    useStore.setState({ assetAccounts: [{ asset_id: 'cd1', label: 'Ally CD', kind: 'cd', asset_class: 'bonds', tax_bucket: 'CASH', balance: 10000, target_return: 0.04 }] } as any);
    mockParams = { edit: 'cd1' };
    render(<NetWorthScreen />);
    expect(screen.getByText('Matures (CDs and dated bonds count under Bonds & CDs)')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('2027-06')).toBeNull();                       // the typed box is gone
    fireEvent.press(screen.getByLabelText('Pick a maturity date'));                    // opens ten years out, as Bonds does
    expect(screen.getByLabelText(/^maturity date, Jan 1, \d{4}\. Tap to change\.$/)).toBeOnTheScreen();
    fireEvent(screen.UNSAFE_getByType(DateTimePicker), 'onChange', { type: 'set' }, new Date(2031, 5, 15));
    fireEvent.press(screen.getByLabelText('Save account'));
    expect(st().assetAccounts[0]).toMatchObject({ maturity_date: '2031-06-15', asset_class: 'bonds' });
  });
  test('adding a CD from the cash picks its maturity too — no "Matures YYYY-MM" box', () => {
    openAddSheet(false);
    fireEvent.press(screen.getByLabelText('CD'));
    expect(screen.queryByPlaceholderText(/Matures YYYY-MM/)).toBeNull();
    fireEvent.press(screen.getByLabelText('Pick a maturity date'));
    expect(screen.getByLabelText(`maturity date, Jan 1, ${new Date().getFullYear() + 10}. Tap to change.`)).toBeOnTheScreen();
    expect(tenYearsOut()).toMatch(/-01-01$/);
  });
});

describe('DEC-4036f — no form saves Taxable when the person chose nothing', () => {
  test('Net worth Quick add saves no tax type and no kind', () => {
    openAddSheet(true);
    fireEvent.press(screen.getByLabelText('Quick add'));
    fireEvent.changeText(screen.getByPlaceholderText('Name (e.g. My Robinhood)'), 'My Robinhood');
    fireEvent.changeText(screen.getByPlaceholderText('0'), '5000');
    fireEvent.press(screen.getByLabelText('Add account'));
    const a = st().assetAccounts.find((x: any) => x.label === 'My Robinhood');
    expect(a.tax_bucket).toBeUndefined();
    expect(a.kind).toBeUndefined();
  });
  test('Net worth Stocks / Funds: no Held-in chip is chosen, and saved untapped it has no tax type', () => {
    openAddSheet(true);
    fireEvent.press(screen.getByLabelText('Stocks / Funds'));
    fireEvent.changeText(screen.getByPlaceholderText('Institution / name (e.g. Chase)'), 'Schwab');
    fireEvent.changeText(screen.getByPlaceholderText('0'), '1000');
    fireEvent.press(screen.getByLabelText('Add account'));
    expect(st().assetAccounts.find((x: any) => x.institution === 'Schwab').tax_bucket).toBeUndefined();
  });
  test('Net worth Retirement: no 401(k) is chosen for the person — Add waits for a tap', () => {
    openAddSheet(true);
    fireEvent.press(screen.getByLabelText('Retirement (401k / IRA / HSA)'));
    expect(screen.getByText('Pick which kind of retirement account it is.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('0'), '1000');
    expect(screen.getByLabelText('Add account').props.accessibilityState).toMatchObject({ disabled: true });   // nothing saves untapped
    expect(st().assetAccounts).toHaveLength(0);
    fireEvent.press(screen.getByLabelText('Roth IRA'));
    expect(screen.getByLabelText('Add account').props.accessibilityState).toMatchObject({ disabled: false });
    fireEvent.press(screen.getByLabelText('Add account'));
    expect(st().assetAccounts[0]).toMatchObject({ kind: 'roth_ira', tax_bucket: 'ROTH' });
  });
  test('Bonds editor: no account type preselected; a new bond saved untapped has no tax type', () => {
    const { BondEditor } = require('../BondsScreen');
    const onSave = jest.fn();
    render(<BondEditor bond={null} open onClose={() => {}} onSave={onSave} />);
    expect(screen.getByLabelText('Account type Taxable').props.accessibilityState).toEqual({ selected: false });
    fireEvent.changeText(screen.getByPlaceholderText('e.g. US Treasury 2030, Apple Corp 4.5%'), 'US Treasury 2030');
    fireEvent.changeText(screen.getByPlaceholderText('10000'), '10000');
    fireEvent.changeText(screen.getByPlaceholderText('4.5'), '4');
    fireEvent.press(screen.getByLabelText('Pick a maturity date'));
    fireEvent.press(screen.getByText('Add bond'));
    expect(onSave.mock.calls[0][0].tax_bucket).toBeUndefined();
  });
  test('Alternatives editor: a new holding saved untapped has no tax type', () => {
    const { AltEditor } = require('../OtherInvestmentsScreen');
    const onSave = jest.fn();
    render(<AltEditor item={null} open onClose={() => {}} onSave={onSave} />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Bitcoin, Fund III, Gold'), 'Bitcoin');
    fireEvent.changeText(screen.getByPlaceholderText('0'), '6000');
    fireEvent.press(screen.getByText('Add'));
    expect(onSave.mock.calls[0][0].tax_bucket).toBeUndefined();
  });
  test('Add an account: a new investment starts with no Held-in chip, and saves no tax type', () => {
    const AddAccountScreen = require('../AddAccountScreen').default;
    render(<AddAccountScreen />);
    fireEvent.press(screen.getByLabelText('Stocks / Funds'));
    expect(screen.getByLabelText('Held in Taxable').props.accessibilityState).toEqual({ selected: false });
    fireEvent.changeText(screen.getByLabelText('Account name'), 'Brokerage');
    fireEvent.changeText(screen.getByLabelText('Balance'), '1000');
    fireEvent.press(screen.getByLabelText('Save this account'));
    expect(st().assetAccounts.find((x: any) => x.label === 'Brokerage').tax_bucket).toBeUndefined();
  });
});

describe('DEC-4059c — the history start date that cannot be read, and the person who corrects it', () => {
  test('Account portfolio refuses the date, offers "Edit date", and saves the picked date on the account', () => {
    const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
    useStore.setState({ assetAccounts: [{ asset_id: 'sch', label: 'Schwab brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE',
      balance: 10000, target_return: 0.07, source: 'connected', history_from: '2099-01-01' }] } as any);
    mockParams = { id: 'sch' };
    render(<AccountPortfolioScreen />);
    expect(screen.getByText(/History start date cannot be read\./)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Edit the history start date'));
    fireEvent(screen.UNSAFE_getByType(DateTimePicker), 'onChange', { type: 'set' }, new Date(2025, 0, 15));
    expect(st().assetAccounts[0].history_start_override).toBe('2025-01-15');
    expect(st().assetAccounts[0].history_from).toBe('2099-01-01');                    // the sync's value is left as it was
    expect(screen.queryByText(/History start date cannot be read\./)).toBeNull();
  });
});

describe('DEC-4059d — a rent entry is not saved as rent until it names its property', () => {
  test('with no property in Net worth: amber question, "not counted", and a door that opens Add an account on Real estate', () => {
    const IncomeManagerScreen = require('../IncomeManagerScreen').default;
    useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['rental'], rentals: [{ type: 'long', income: '2000', expenses: '500' }] } } as any);
    mockParams = { open: 'rental' };
    render(<IncomeManagerScreen />);
    expect(screen.getByText('Not counted as rent until you pick its property.')).toBeOnTheScreen();
    expect(screen.queryByText(/This is the figure every other screen uses/)).toBeNull();
    fireEvent.press(screen.getByLabelText('Add the property in Net worth first'));
    expect(mockPush).toHaveBeenCalledWith('/add-account?cls=property');
  });
  test('picking the property turns the question back to its normal colour and the rent counts', () => {
    const IncomeManagerScreen = require('../IncomeManagerScreen').default;
    const { incomeSummary } = require('../../../MoneyKeel/functions/cashflow/income-summary');
    useStore.setState({ assetAccounts: [{ asset_id: 'p2', label: 'Lake house', kind: 'home', tax_bucket: 'PROPERTY', balance: 300000, target_return: 0 }],
      onboardingProfile: { status: 'employed', incomeSources: ['rental'], taxMode: 'manual', manualTaxRate: '0', rentals: [{ type: 'long', income: '2000', expenses: '500' }] } } as any);
    mockParams = { open: 'rental' };
    render(<IncomeManagerScreen />);
    expect(incomeSummary(st().onboardingProfile).lands.rentMonthly).toBe(0);
    fireEvent.press(screen.getByLabelText('Property 1 is Lake house'));
    expect(screen.queryByText('Not counted as rent until you pick its property.')).toBeNull();
    expect(incomeSummary(st().onboardingProfile).lands.rentMonthly).toBeGreaterThan(0);
  });
  test('Add an account opened from that door starts on Real estate', () => {
    const AddAccountScreen = require('../AddAccountScreen').default;
    mockParams = { cls: 'property' };
    render(<AddAccountScreen />);
    expect(screen.getByLabelText('Real estate').props.accessibilityState).toEqual({ selected: true });
  });
});
