// FCC: the retired paycheck hero — pins the card to the F5 function (real simulation, no stubs),
// the guaranteed-missing prompt (never a fake $0 guaranteed), the draw explainer, and the
// LENS gating (no flag: the retired lens leads with the paycheck; the working lens never sees it).
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
    liabilities: [], hideBalances: false, lensOverride: null,
  } as any);
});

describe('PaycheckCard', () => {
  it('renders the month-named hero with source-first guaranteed lines and a real draw from savings', () => {
    render(<PaycheckCard />);
    expect(screen.getByText(/YOUR PAYCHECK — [A-Z]/)).toBeOnTheScreen();
    expect(screen.getByText(/Social Security \(day 3\)/)).toBeOnTheScreen();   // source first, day shown
    expect(screen.getByText('Pension')).toBeOnTheScreen();
    expect(screen.getByText('= Guaranteed')).toBeOnTheScreen();
    expect(screen.getByText('$4,200')).toBeOnTheScreen();                      // 2600 + 1600
    expect(screen.getAllByText(/estimate/).length).toBeGreaterThanOrEqual(2);   // pre-48 A9: chip on the hero AND the year figure
    expect(screen.getByText(/This year/)).toBeOnTheScreen();
  });

  it('draw explainer is the ONE glossary InfoDot (pre-48 audit U4 — no bespoke modal)', () => {
    render(<PaycheckCard />);
    fireEvent.press(screen.getByLabelText('About Draw from savings'));
    expect(screen.getByText(/steady monthly amount the math says your savings can support/)).toBeOnTheScreen();
  });

  it('no guaranteed income → the prompt to add it, never a fake $0 guaranteed line', () => {
    // (2026-10-25, FIX-MONTH) the birth year is entered, so a paycheck can be worked out — this case is about guaranteed income
    useStore.setState({ onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'], birthYear: JUNE_OP.birthYear } } as any);
    render(<PaycheckCard />);
    expect(screen.getByText(/Add your Social Security and pension/)).toBeOnTheScreen();
    expect(screen.queryByText('= Guaranteed')).toBeNull();
  });

  // NO BIRTH YEAR, NO PAYCHECK (2026-10-25, FIX-MONTH; DEC-0296; CFR-4 MK-CF-F-225-C05; cash-flow_v01's row of that date): it was
  // worked out at age 68. The card keeps its name and says why — no figure, no prompt built on a guessed age
  it('no birth year → no paycheck is worked out, and the card says why', () => {
    useStore.setState({ onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'] } } as any);
    render(<PaycheckCard />);
    expect(screen.getByText('YOUR PAYCHECK')).toBeOnTheScreen();
    expect(screen.getByText('Your birth year is not entered, so there is no paycheck to work out — we won’t guess one.')).toBeOnTheScreen();
    expect(screen.queryByText('= Guaranteed')).toBeNull();
    expect(screen.queryByText(/This year/)).toBeNull();
  });

  // THE RETURN IT RUNS ON IS SAID (2026-10-25, FIX-MONTH; the lead's ruling 2): the cockpit's blended benchmark of the accounts set aside
  // for retirement — here the IRA's own, as paycheckReturn reads it — and the card states it under "This year"
  it('the draw states the return it assumes, the Retirement cockpit’s own', () => {
    const { paycheckReturn } = require('../../domain/paycheck');
    const st: any = useStore.getState();
    const said = paycheckReturn(st.assetAccounts, st.retirementAssumptions ?? {}, st.onboardingProfile).said;
    render(<PaycheckCard />);
    expect(screen.getByText(`The draw assumes ${said}.`)).toBeOnTheScreen();
    // printed "7.90%/year" since 2026-10-26: the rate is written by its declaration, MK-CF-M-082, with the canon's period (row 14,
    // "/month · /year"; cash-flow_v01 READ THIS FIRST 2026-10-26) — it read "7.90% a year", the spoken form, in print
    expect(said).toMatch(/^\d+\.\d{2}%\/year — /);
  });
});

describe('Cash flow lens gating (no flag — the lens decides)', () => {
  it('retired lens: the paycheck card leads the screen, no switch needed', () => {
    render(<CashFlowScreen />);   // JUNE_OP has status retired → retired lens
    expect(screen.getByText(/YOUR PAYCHECK —/)).toBeOnTheScreen();
  });
  it('working lens: no paycheck card', () => {
    useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '8000' } } as any);
    render(<CashFlowScreen />);
    expect(screen.queryByText(/YOUR PAYCHECK —/)).toBeNull();
  });
  it('the explicit Settings choice (lens override) wins over the profile status', () => {
    useStore.setState({ lensOverride: 'working' } as any);   // retired profile, but chose "Still working"
    render(<CashFlowScreen />);
    expect(screen.queryByText(/YOUR PAYCHECK —/)).toBeNull();
  });
});

// The month-by-month screen: rows sum to the number (the month-detail pin), a December pension
// lands in December only, and a bill month carries its word.
