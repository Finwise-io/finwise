// USER-FLOW walkthroughs (the founder's question: "did you test as a user?"). Each block is a
// persona arriving at the app, not a component in isolation:
//   1. RETURNING WORKING user upgrading from Build 40 — old persisted shape, stale flag, missing
//      new fields (the riskiest real-world path for a redesign).
//   2. RETURNING RETIRED user upgrading — the paycheck must now LEAD with no switch to flip.
//   3. BRAND-NEW user after onboarding — first Home is real, the one capture affordance exists.
//   4. BRAND-NEW user who skips everything — honest empty states on every surface, no dead end.
//   5. SEMI-RETIRED (partially working, drawing retirement income) — counts as retired.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import CashFlowScreen from '../CashFlowScreen';
import PlanHubScreen from '../PlanHubScreen';
import { useStore } from '../../store/useStore';
import { resolveLens, tabOrder } from '../../domain/profile/lens';
import { nextRoute } from '../../navigation/routeGuard';
import { employedPartner, retiree75 } from '../../testing/personas';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => useStore.getState().resetAll());

// simulate zustand rehydration of an OLD (v1.0.8 / Build 40) persisted store: stale keys present,
// none of the new FCC fields — setState shallow-merges exactly like persist's default merge does.
const upgradeFromBuild40 = (extra: Record<string, any>) => useStore.setState({
  fccPaycheckEnabled: true,                    // the retired old flag, still on disk
  // note what is ABSENT: lensOverride, txnFlags, knownPayees, planHistory, commitments —
  // they must all fall back to the new defaults without a crash
  onboardingComplete: true,
  ...extra,
} as any);

describe('1 · returning WORKING user upgrades from Build 40', () => {
  beforeEach(() => upgradeFromBuild40({
    onboardingProfile: employedPartner,
    assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 120000 }],
  }));

  test('lands on the working Home — new layout, no crash, stale flag ignored', () => {
    render(<HomeScreen />);
    expect(screen.getByText('YOUR INVESTMENTS')).toBeOnTheScreen();
    expect(screen.getByText(/WHAT NEEDS YOU/)).toBeOnTheScreen();
    expect(screen.getByText('WILL MY MONEY LAST?')).toBeOnTheScreen();
    expect(screen.queryByText(/SAFE TO SPEND/)).toBeNull();           // the stale flag flips nothing
  });

  test('their tab order is the working order; new store fields arrived as defaults', () => {
    const s = useStore.getState() as any;
    expect(tabOrder(resolveLens(s.onboardingProfile, s.lensOverride)))
      .toEqual(['home', 'analytics', 'invest', 'cashflow', 'plan']);
    expect(s.lensOverride).toBeNull();
    expect(s.txnFlags).toEqual([]);
    expect(s.planHistory).toEqual([]);
    expect(s.knownPayees).toEqual({});
  });

  test('Cash flow and Plan render their working-lens content', () => {
    const cf = render(<CashFlowScreen />);
    expect(screen.getByText('THIS MONTH')).toBeOnTheScreen();
    cf.unmount();
    render(<PlanHubScreen />);
    expect(screen.getByText('BIG DECISIONS')).toBeOnTheScreen();
  });
});

describe('2 · returning RETIRED user upgrades from Build 40', () => {
  beforeEach(() => upgradeFromBuild40({
    onboardingProfile: retiree75,
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 }],
  }));

  test('the paycheck LEADS Home and Cash flow with no switch to flip (the Build-40 fix)', () => {
    const home = render(<HomeScreen />);
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
    home.unmount();
    render(<CashFlowScreen />);
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
    expect(screen.getByText(/DRAW COMES FROM/)).toBeOnTheScreen();
  });

  test('their tab order puts Cash flow next to Home', () => {
    const s = useStore.getState() as any;
    expect(tabOrder(resolveLens(s.onboardingProfile, s.lensOverride)))
      .toEqual(['home', 'cashflow', 'analytics', 'plan', 'invest']);
  });
});

describe('3 · brand-new user, day one, finishes onboarding', () => {
  test('the guard walks them auth → first-run → Home (the B46 routing contract)', () => {
    expect(nextRoute({ user: false, onboardingComplete: false, onboardingPaused: false, segment: '(tabs)' })).toBe('/auth');
    expect(nextRoute({ user: true, onboardingComplete: false, onboardingPaused: false, segment: 'auth' })).toBe('/first-run');
    expect(nextRoute({ user: true, onboardingComplete: false, onboardingPaused: false, segment: 'onboarding' })).toBeNull();   // the by-hand door stays legal
    expect(nextRoute({ user: true, onboardingComplete: true, onboardingPaused: false, segment: '(tabs)' })).toBeNull();
  });

  test('first Home after onboarding: a real hero from their answers + the ONE capture affordance', () => {
    const s = useStore.getState();
    s.setOnboardingProfile(employedPartner as any);
    s.setOnboardingComplete(true);
    render(<HomeScreen />);
    expect(screen.getByText('YOUR INVESTMENTS')).toBeOnTheScreen();   // onboarding-derived rows, not zeros
    expect(screen.getByLabelText('Add expense')).toBeOnTheScreen();   // the '+ Expense' button
  });
});

describe('4 · brand-new user who skips everything (just explore)', () => {
  test('Home shows the DOORS in (import · by hand · connect-honestly-coming-soon); no dead end, no fake zeros', () => {
    const home = render(<HomeScreen />);
    expect(screen.getByText(/Let's get your real numbers in/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Import a file from your brokerage')).toBeOnTheScreen();
    expect(screen.getByLabelText(/Add something by hand/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Connect your first account/)).toBeOnTheScreen();   // honest, not hidden
    expect(screen.getByText(/WHAT YOU'LL SEE HERE/)).toBeOnTheScreen();
    expect(screen.queryByText(/\$0/)).toBeNull();                      // never a fake zero
    home.unmount();
    const cf = render(<CashFlowScreen />);
    expect(screen.getByText('Cash flow')).toBeOnTheScreen();           // renders, honest and alive
    cf.unmount();
    render(<PlanHubScreen />);
    expect(screen.getByText(/Answer three quick questions/)).toBeOnTheScreen();   // invitation, not a guess
  });
});

describe('5 · semi-retired: partially working AND drawing retirement income', () => {
  test('counts as retired — the paycheck leads', () => {
    useStore.setState({
      onboardingProfile: {
        status: 'partial', incomeSources: ['employment', 'retirement_income'],
        birthYear: String(new Date().getFullYear() - 66),
        baseSalary: '3000', salaryMode: 'gross', salaryFreq: 'monthly',
        ri_ss: '2200', ri_ss_freq: 'monthly',
        monthlySpending: '4000',
      },
      assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 300000 }],
      onboardingComplete: true,
    } as any);
    render(<HomeScreen />);
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
  });
});
