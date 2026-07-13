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
