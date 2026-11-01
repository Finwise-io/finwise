// FIX-TAX, 2026-10-25 — the screens the tax fixes reach, rendered, and the figures they share held to one answer.
//
// 1 · Nothing a screen calls is gone: two functions were retired today (MK-CF-F-098 progressiveMonthlyTax, MK-CF-F-048
//     effectiveTaxRate) and three changed their inputs (MK-PL-F-010 drawOrderOutcome, MK-CF-F-049 buildIncomeState,
//     MK-CF-O-007 theTaxOrganizer). Home, the Income summary, the Tax organizer, Income detail and Cash flow with the
//     draw-order sheet open are rendered here in a household with data and in a fresh one.
// 2 · The Tax organizer's three visible changes: the status in force on "How you file" (DEC-7944), the spouse's age line
//     (the lead's ruling on CFR-4's needs-ruling 4), and nothing entered → the one line and its door (tenet 3, Q48).
// 3 · Cross-screen agreement: Interest & dividends and the Tax organizer read one records rule (MK-CF-F-183); Income detail's
//     take-home is the one Cash flow reads (MK-CF-F-049 → MK-CF-F-181 / MK-CF-F-092).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { employedPartner, retiree75 } from '../../testing/personas';
import HomeScreen from '../HomeScreen';
import IncomeSummaryScreen from '../IncomeSummaryScreen';
import TaxOrganizerScreen from '../TaxOrganizerScreen';
import IncomeDetailScreen from '../IncomeDetailScreen';
import CashFlowScreen from '../CashFlowScreen';
import { incomeFromAccounts } from '../../domain/income/from-accounts';
import { theTaxOrganizer } from '../../../MoneyKeel/functions/cashflow/tax-organizer';
import { buildDatedGrid } from '../../domain/grid';
import * as TAX from '../../domain/income/tax';
import * as INCOME from '../../domain/income';

const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
  Link: ({ children }: any) => children,
}));

beforeEach(() => { mockPushes.length = 0; useStore.getState().resetAll(); });

const seed = (persona: any) => {
  const s = useStore.getState();
  s.setOnboardingProfile(persona);
  s.setOnboardingComplete(true);
  s.seedNetWorth(persona);
  useStore.setState({ hideBalances: false } as any);
};

describe('1 · nothing a screen calls is gone (the two retired functions, the three changed ones)', () => {
  test('the retired functions are gone from their modules', () => {
    expect((TAX as any).progressiveMonthlyTax).toBeUndefined();
    expect((INCOME as any).effectiveTaxRate).toBeUndefined();
  });
  const SCREENS: [string, React.ComponentType<any>][] = [
    ['HomeScreen', HomeScreen], ['IncomeSummaryScreen', IncomeSummaryScreen], ['TaxOrganizerScreen', TaxOrganizerScreen],
    ['IncomeDetailScreen', IncomeDetailScreen], ['CashFlowScreen', CashFlowScreen],
  ];
  test.each(SCREENS)('%s renders with a household and with nothing entered', (_n, Screen) => {
    for (const persona of [employedPartner, retiree75, null]) {
      useStore.getState().resetAll();
      if (persona) seed(persona);
      const { unmount } = render(<Screen />);
      unmount();
    }
  });
  test('the draw-order sheet opens and re-runs for a retiree (it hands the gains their income now)', () => {
    seed(retiree75);
    render(<CashFlowScreen />);
    const steer = screen.queryByLabelText('Steer it — reorder where the draw comes from');
    expect(steer).not.toBeNull();
    fireEvent.press(steer!);
    expect(screen.getByText('Where the draw comes from')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Re-run with my order'));
  });
});

describe('2 · the Tax organizer', () => {
  test('a spouse entered, filing never answered: "Married, filing jointly", assumed, over the joint deduction — and the spouse\'s age line with its door', () => {
    useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: {
      status: 'employed', incomeSources: ['employment'], hasPartner: 'yes', baseSalary: '7500', salaryFreq: 'monthly', salaryMode: 'gross',
    } } as any);
    render(<TaxOrganizerScreen />);
    expect(screen.getByText('Married, filing jointly')).toBeOnTheScreen();          // it read "Single" (DEC-7944)
    expect(screen.queryByText('Single')).toBeNull();
    expect(screen.getByText('Assumed — we have never asked')).toBeOnTheScreen();
    expect(screen.getByText('− $32,200')).toBeOnTheScreen();
    expect(screen.getByText('Your spouse counted as under 65 — not entered ›')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Your spouse counted as under 65 — not entered. Answer it'));
    expect(mockPushes).toContain('/filing-status');
  });

  test('filing jointly with the spouse\'s age answered: no spouse line; single: no spouse line', () => {
    useStore.setState({ hideBalances: false, onboardingProfile: { baseSalary: '7500', salaryFreq: 'monthly', filingStatus: 'married', over65Who: 'neither' } } as any);
    const a = render(<TaxOrganizerScreen />);
    expect(screen.getByText('Married, filing jointly')).toBeOnTheScreen();
    expect(screen.queryByText('Assumed — we have never asked')).toBeNull();
    expect(screen.queryByText(/Your spouse counted as under 65/)).toBeNull();
    a.unmount();
    useStore.setState({ onboardingProfile: { baseSalary: '7500', salaryFreq: 'monthly', filingStatus: 'single' } } as any);
    render(<TaxOrganizerScreen />);
    expect(screen.queryByText(/Your spouse counted as under 65/)).toBeNull();
  });

  test('nothing entered (his Q48, DEC-0431): Gross income $0, the one line and its door beneath; no deduction, no taxable income, no rate', () => {
    useStore.setState({ hideBalances: false, onboardingProfile: {} } as any);
    render(<TaxOrganizerScreen />);
    expect(screen.getByText('Gross income')).toBeOnTheScreen();
    expect(screen.getByText('$0')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nothing entered yet. Add your income ›')).toBeOnTheScreen();
    expect(screen.queryByText('Taxable income')).toBeNull();
    expect(screen.queryByText('− $16,100')).toBeNull();
    expect(screen.queryByText(/Calculated (federal )?tax|Est\. effective/)).toBeNull();
  });

  test('empty-state agreement: the Tax organizer and the Income summary say nothing entered the same way — $0, the line, the door', () => {
    useStore.setState({ hideBalances: false, onboardingProfile: {} } as any);
    const a = render(<TaxOrganizerScreen />);
    const org = { zero: screen.getAllByText('$0').length, line: screen.getAllByLabelText('Nothing entered yet. Add your income ›').length };
    a.unmount();
    render(<IncomeSummaryScreen />);
    const sum = { zero: screen.getAllByText(/^\$0(\/month)?$/).length, line: screen.getAllByLabelText('Nothing entered yet. Add your income ›').length };
    expect(org.zero).toBeGreaterThan(0); expect(sum.zero).toBeGreaterThan(0);
    expect(org.line).toBeGreaterThan(0); expect(sum.line).toBeGreaterThan(0);
    expect(screen.queryByText(/bracket 10%/)).toBeNull();
  });

  test('the rate line in canon row 25\'s words — calculated federal, calculated with a state rate, the person\'s own rate', () => {
    const base = { baseSalary: '6000', salaryFreq: 'monthly', filingStatus: 'single' };
    useStore.setState({ hideBalances: false, onboardingProfile: base } as any);
    const a = render(<TaxOrganizerScreen />);
    expect(screen.getByText(/^Calculated federal tax ≈\d+\.\d{2}% of the year’s income — assumes you take the standard deduction\. Figures are/)).toBeOnTheScreen();
    expect(screen.queryByText(/Est\. effective federal rate/)).toBeNull();
    a.unmount();
    useStore.setState({ onboardingProfile: { ...base, stateTaxRate: '5' } } as any);
    const b = render(<TaxOrganizerScreen />);
    expect(screen.getByText(/^Calculated tax ≈\d+\.\d{2}% of the year’s income — federal income tax, plus the 5\.00% state rate you entered; assumes you take the standard deduction\./)).toBeOnTheScreen();
    b.unmount();
    useStore.setState({ onboardingProfile: { ...base, taxMode: 'manual', manualTaxRate: '24' } } as any);
    render(<TaxOrganizerScreen />);
    expect(screen.getByText(/^Tax · your rate, 24\.00%\. Figures are/)).toBeOnTheScreen();   // two decimals since 2026-10-26 (MK-CF-M-081)
  });

  test('Interest & dividends on the Tax organizer says where the figure came from: records, you entered, calculated ≈', () => {
    const y = new Date().getFullYear();
    const savings = { asset_id: 's', label: 'Savings', kind: 'savings', asset_class: 'cash', tax_bucket: 'TAXABLE', balance: 10_000, coupon_rate: 0.04 };
    useStore.setState({ hideBalances: false, onboardingProfile: { baseSalary: '6000', salaryFreq: 'monthly', invAnnual: '1000' }, assetAccounts: [savings],
      transactions: [{ id: 't', account_id: 's', type: 'INTEREST', amount: 123.45, date: `${y}-01-15` }] } as any);
    const a = render(<TaxOrganizerScreen />);
    expect(screen.getByText(`  from your accounts' records for ${y}`)).toBeOnTheScreen();
    expect(screen.getByText('$123')).toBeOnTheScreen();
    a.unmount();
    useStore.setState({ transactions: [] } as any);
    const b = render(<TaxOrganizerScreen />);
    expect(screen.getByText('  you entered')).toBeOnTheScreen();
    expect(screen.getByText('$1,000')).toBeOnTheScreen();
    b.unmount();
    useStore.setState({ onboardingProfile: { baseSalary: '6000', salaryFreq: 'monthly' } } as any);
    render(<TaxOrganizerScreen />);
    expect(screen.getByText('  calculated from your accounts — 4.00% on $10,000')).toBeOnTheScreen();   // two decimals (IN3-04, 2026-10-31)
    expect(screen.getByText('≈$400')).toBeOnTheScreen();
  });
});

describe('3 · one figure on every screen that prints it', () => {
  test('Interest & dividends and the Tax organizer: one records rule — reinvested counted, nothing after today, an IRA left out of both', () => {
    const now = new Date();
    const y = now.getFullYear();
    const d = (m: number) => `${y}-${String(m).padStart(2, '0')}-01`;
    const past = Math.max(1, now.getMonth());          // a month already gone this year
    const accounts: any[] = [
      { asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000 },
      { asset_id: 'i', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 50_000 },
    ];
    const txns: any[] = [
      { account_id: 'b', type: 'DIVIDEND', amount: 300.17, date: d(past) },
      { account_id: 'b', type: 'DIVIDEND', reinvested: true, shares: 1.2, price: 100.5, date: d(past) },   // $120.60
      { account_id: 'b', type: 'INTEREST', amount: 500, date: `${y + 1}-01-15` },                          // not yet paid
      { account_id: 'i', type: 'DIVIDEND', reinvested: true, amount: 900, date: d(past) },                 // inside an IRA
    ];
    const screenFigure = incomeFromAccounts(accounts, txns, now).annual;
    const org = theTaxOrganizer({ profile: { baseSalary: 5000, salaryFreq: 'monthly' }, accounts, debts: [], transactions: txns, year: y });
    const orgLine = org.income.find((l) => l.label === 'Interest & dividends')!.amount;
    expect(screenFigure).toBeCloseTo(300.17 + 120.6, 9);
    expect(orgLine).toBeCloseTo(screenFigure, 9);
  });

  test('Income detail\'s take-home is the take-home Cash flow reads (after tax AND the 401(k))', () => {
    const op = { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross', c_401k: '500', taxMode: 'manual', manualTaxRate: '10' };
    useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: op } as any);
    const inflow = buildDatedGrid(op as any, { now: new Date() }).cells[0].inflow;
    expect(inflow).toBeCloseTo(4000, 6);
    render(<IncomeDetailScreen />);
    expect(screen.getByText('$4,000/month')).toBeOnTheScreen();                       // it read $4,500/month
    expect(screen.getByText('10.00%')).toBeOnTheScreen();
  });
});
