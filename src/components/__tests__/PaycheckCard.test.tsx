// FCC Phase 2: the retired paycheck hero — pins the card to the F5 engine (real simulation, no
// stubs), the guaranteed-missing prompt (never a fake $0 guaranteed), the safe-draw explainer,
// and the Cash flow flag gating (off by default; retired lens only).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaycheckCard } from '../PaycheckCard';
import CashFlowScreen from '../../screens/CashFlowScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }) }));

const JUNE_OP = {
  status: 'retired', incomeSources: ['retirement_income'],
  birthYear: String(new Date().getFullYear() - 68),
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_ss_day: 3,
  ri_pension: '1600', ri_pension_freq: 'monthly',
  spendCats: [{ id: 'rent', bucket: 'fixed', amount: '1200', unit: 'dollar' }],
};

beforeEach(() => {
  useStore.setState({
    onboardingProfile: JUNE_OP,
    assetAccounts: [{ asset_id: 'a1', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 }],
    liabilities: [], hideBalances: false, fccPaycheckEnabled: false,
  } as any);
});

describe('PaycheckCard', () => {
  it('renders the month-named hero with source-first guaranteed lines and a real safe draw', () => {
    render(<PaycheckCard />);
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
    expect(screen.getByText(/Social Security \(day 3\)/)).toBeOnTheScreen();   // source first, day shown
    expect(screen.getByText('Pension')).toBeOnTheScreen();
    expect(screen.getByText('= Guaranteed')).toBeOnTheScreen();
    expect(screen.getByText('$4,200')).toBeOnTheScreen();                      // 2600 + 1600
    expect(screen.getByText(/estimate/)).toBeOnTheScreen();
    expect(screen.getByText(/This year/)).toBeOnTheScreen();
  });

  it('safe-draw explainer answers "says who?" on tap', () => {
    render(<PaycheckCard />);
    fireEvent.press(screen.getByLabelText('What makes the draw safe?'));
    expect(screen.getByText(/largest steady monthly draw/)).toBeOnTheScreen();
    expect(screen.getByText(/An estimate, never a promise/)).toBeOnTheScreen();
  });

  it('no guaranteed income → the prompt to add it, never a fake $0 guaranteed line', () => {
    useStore.setState({ onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'] } } as any);
    render(<PaycheckCard />);
    expect(screen.getByText(/Add your Social Security and pension/)).toBeOnTheScreen();
    expect(screen.queryByText('= Guaranteed')).toBeNull();
  });
});

describe('Cash flow gating (early-preview flag)', () => {
  it('flag OFF: no paycheck card on Cash flow', () => {
    render(<CashFlowScreen />);
    expect(screen.queryByText(/SAFE TO SPEND —/)).toBeNull();
  });
  it('flag ON + retired: the paycheck card leads the screen', () => {
    useStore.setState({ fccPaycheckEnabled: true } as any);
    render(<CashFlowScreen />);
    expect(screen.getByText(/SAFE TO SPEND —/)).toBeOnTheScreen();
  });
  it('flag ON but working lens: no card (retired lens only)', () => {
    useStore.setState({ fccPaycheckEnabled: true, onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '8000' } } as any);
    render(<CashFlowScreen />);
    expect(screen.queryByText(/SAFE TO SPEND —/)).toBeNull();
  });
});

// The month-by-month screen: rows sum to the number (the month-detail pin), a December pension
// lands in December only, and a bill month carries its word.
describe('PaycheckMonthsScreen', () => {
  const PaycheckMonthsScreen = require('../../screens/PaycheckMonthsScreen').default;
  beforeEach(() => {
    useStore.setState({
      onboardingProfile: {
        ...JUNE_OP,
        ri_pension: '19200', ri_pension_freq: 'annual', ri_pension_month: 12,
        spendCats: [
          { id: 'rent', bucket: 'fixed', amount: '1200', unit: 'dollar' },
          { id: 'proptax', label: 'Property tax', bucket: 'nonmonthly', amount: '1900', unit: 'dollar', months: [11], dueDay: 15, tier: 'critical' },
        ],
      },
    } as any);
  });

  it('renders 12 dated months; December carries the pension; November is a flagged bill month', () => {
    render(<PaycheckMonthsScreen />);
    const dec = screen.getByLabelText(/^Dec.*safe to spend/);
    fireEvent.press(dec);
    expect(screen.getByText(/Pension/)).toBeOnTheScreen();
    expect(screen.getByText('$19,200')).toBeOnTheScreen();          // the lump, in full, in December
    expect(screen.getByLabelText(/^Nov.*lower — big bill this month/)).toBeOnTheScreen();
  });

  it('an opened month shows the sum lines (rows → number)', () => {
    render(<PaycheckMonthsScreen />);
    fireEvent.press(screen.getByLabelText(/^Nov.*safe to spend/));
    expect(screen.getByText('Property tax · day 15')).toBeOnTheScreen();
    expect(screen.getByText('= Safe to spend')).toBeOnTheScreen();
    expect(screen.getByText('= In')).toBeOnTheScreen();
  });
});
