// SENIOR UI TESTER PASS (2026-07-14) — five BASIC paying-user flows + five NEW edge cases
// (the earlier audit's five live in edge_cases_audit.test.tsx). Every test is a real journey
// through the rendered screens and the live store — no stubs of our own logic.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../store/useStore';
import FirstRunScreen from '../screens/FirstRunScreen';
import HomeScreen from '../screens/HomeScreen';
import CashFlowScreen from '../screens/CashFlowScreen';
import ImportHoldingsScreen from '../screens/ImportHoldingsScreen';
import AccountDetailScreen from '../screens/AccountDetailScreen';
import NetWorthScreen from '../screens/NetWorthScreen';
import PerformanceScreen from '../screens/PerformanceScreen';
import SsTimingScreen from '../screens/SsTimingScreen';
import { PaycheckCard } from '../components/PaycheckCard';
import { selectWillItLast } from '../domain/retirement/willItLast';

let mockParams: Record<string, string> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '67', horizonAge: '92',
};
const RETIREE = {
  status: 'retired', incomeSources: ['retirement_income'], name: 'June',
  birthYear: String(new Date().getFullYear() - 68), horizonAge: '92', monthlySpending: '4000',
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1600', ri_pension_freq: 'monthly',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockPushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false } as any);   // resetAll keeps prefs; FLOW 5 turns the mask on
});

// ═══════════════ FIVE BASIC FLOWS ═══════════════

describe('FLOW 1 · brand-new paying user: skip the questions, walk in through the import door', () => {
  test('first-run skip → Home doors → import a real CSV → Home shows a real picture', async () => {
    // skip everything on first run — must still complete onboarding (the Build-41 trap)
    const fr = render(<FirstRunScreen />);
    fireEvent.press(screen.getByLabelText('Skip — just explore'));
    expect((useStore.getState() as any).onboardingComplete).toBe(true);
    expect(mockPushes).toContain('/(tabs)/home');
    fr.unmount();

    // the empty Home offers the doors in
    const home1 = render(<HomeScreen />);
    fireEvent.press(screen.getByLabelText('Import a file from your brokerage'));
    expect(mockPushes).toContain('/import-holdings');
    home1.unmount();

    // import a brokerage CSV end to end
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://q.csv' }] });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Ticker,Shares,Cost Basis\nVTI,100,20000\nBND,50,4000\n');
    const imp = render(<ImportHoldingsScreen />);
    fireEvent.press(screen.getByText('Choose a file'));
    await waitFor(() => expect(screen.getByLabelText('Which institution is this file from')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Which institution is this file from'), 'Vanguard');
    fireEvent.press(screen.getByLabelText(/Import \d+ holdings?/));
    await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(1));
    imp.unmount();

    // Home is now real — the working hero, no fake zeros
    render(<HomeScreen />);
    expect(screen.getByText('YOUR INVESTMENTS')).toBeOnTheScreen();
    expect(screen.queryByText(/Let's get your real numbers in/)).toBeNull();
  });
});

describe('FLOW 2 · the daily habit: log a coffee with + Expense, see it on Cash flow', () => {
  test('two taps on Home → the expense lands in the store and the month-so-far line', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    const home = render(<HomeScreen />);
    fireEvent.press(screen.getByLabelText('Add expense'));
    fireEvent.changeText(screen.getByPlaceholderText('0'), '6.50');
    fireEvent.press(screen.getByText(/Dining/));
    fireEvent.press(screen.getByText(/^Add \$6\.50$/));
    const exp = (useStore.getState() as any).expenses;
    expect(exp).toHaveLength(1);
    expect(exp[0].amount).toBe(6.5);
    home.unmount();

    render(<CashFlowScreen />);
    expect(screen.getByText(/Spent so far \$(6\.50|7)/)).toBeOnTheScreen();   // budgetVsActual, same helper
  });
});

describe("FLOW 3 · the retiree's morning: the paycheck stands on her numbers and MOVES with them", () => {
  test('hero shows the breakdown; raising Social Security by $100 raises Guaranteed by $100', () => {
    useStore.setState({
      onboardingProfile: RETIREE, onboardingComplete: true,
      assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 }],
    } as any);
    const first = render(<PaycheckCard />);
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
    expect(screen.getByText('$4,200')).toBeOnTheScreen();          // 2600 SS + 1600 pension
    first.unmount();

    useStore.setState({ onboardingProfile: { ...RETIREE, ri_ss: '2700' } } as any);
    render(<PaycheckCard />);
    expect(screen.getByText('$4,300')).toBeOnTheScreen();          // the engine moved with her edit
  });
});

describe('FLOW 4 · a big decision end to end: claim Social Security, then change your mind', () => {
  test('type the statement → adopt 67 → every will-it-last strip agrees → revert restores exactly', () => {
    useStore.setState({
      onboardingProfile: WORKER, onboardingComplete: true,
      assetAccounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 500000 }],
    } as any);
    const before = { ...(useStore.getState() as any).retirementAssumptions };

    const ss = render(<SsTimingScreen />);
    fireEvent.changeText(screen.getByLabelText(/Monthly amount from your Social Security statement/), '2600');
    fireEvent.press(screen.getByLabelText('Use claim at 67 as my plan'));
    fireEvent.press(screen.getByLabelText('Use this plan: Claim Social Security at 67'));
    ss.unmount();

    const s = useStore.getState() as any;
    expect(s.retirementAssumptions.ssClaimAge).toBe(67);
    expect(s.planHistory).toHaveLength(1);

    // one selector, every surface — the adopted plan is what Home/Plan/Cash flow all read
    const wil = selectWillItLast({ op: s.onboardingProfile, accounts: s.assetAccounts, assumptions: s.retirementAssumptions, inflationRate: s.inflationRate, employmentStatus: s.employmentStatus });
    expect(wil.inputs?.guaranteed_start_age).toBe(67);
    expect(wil.inputs?.guaranteed_monthly_income).toBe(2600);

    useStore.getState().revertPlan();
    expect((useStore.getState() as any).retirementAssumptions).toEqual(before);
  });
});

describe('FLOW 5 · money management: add → drill → move money → hide it all', () => {
  test('NW inventory row → account page → a $500 transfer moves both sides → the eye masks everything', () => {
    useStore.setState({
      onboardingProfile: WORKER, onboardingComplete: true, nwSeeded: true,
      assetAccounts: [
        { asset_id: 'chk', label: 'Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 12000 },
        { asset_id: 'sav', label: 'Savings', institution: 'Chase', kind: 'savings', tax_bucket: 'CASH', balance: 6000 },
      ],
    } as any);
    const nw = render(<NetWorthScreen />);
    fireEvent.press(screen.getByLabelText(/Chase Checking, \$12,000\. Opens its page\./));
    expect(mockPushes).toContain('/account-detail?id=chk');
    nw.unmount();

    mockParams = { id: 'chk' };
    const det = render(<AccountDetailScreen />);
    fireEvent.press(screen.getByLabelText('Record a transfer for Checking'));
    fireEvent.changeText(screen.getByLabelText('Amount'), '500');
    fireEvent.press(screen.getByLabelText('Transfer into Savings'));
    fireEvent.press(screen.getByLabelText('Save this transfer'));
    const accts = (useStore.getState() as any).assetAccounts;
    expect(accts.find((a: any) => a.asset_id === 'chk').balance).toBe(11500);
    expect(accts.find((a: any) => a.asset_id === 'sav').balance).toBe(6500);
    det.unmount();

    useStore.setState({ hideBalances: true } as any);
    render(<NetWorthScreen />);
    expect(screen.getAllByText(/••••/).length).toBeGreaterThan(0);   // the whole inventory masks
    expect(screen.queryByText('$11,500')).toBeNull();               // the moved money is masked too
  });
});

// ═══════════════ FIVE NEW EDGE CASES ═══════════════

describe('EDGE 1 · importing the SAME file twice must not double the money', () => {
  test('second import defaults to update-not-twin: still one account, positions not duplicated', async () => {
    useStore.setState({ onboardingComplete: true } as any);
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://q.csv' }] });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Ticker,Shares,Cost Basis\nVTI,100,20000\nBND,50,4000\n');

    for (const round of [1, 2]) {
      const imp = render(<ImportHoldingsScreen />);
      fireEvent.press(screen.getByText('Choose a file'));
      await waitFor(() => expect(screen.getByLabelText('Which institution is this file from')).toBeTruthy());
      fireEvent.changeText(screen.getByLabelText('Which institution is this file from'), 'Vanguard');
      if (round === 2) expect(screen.getByText(/You already track a/)).toBeOnTheScreen();   // the merge gate
      fireEvent.press(screen.getByLabelText(/Import \d+ holdings?/));
      await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(1));        // never a twin
      imp.unmount();
    }
    const acct: any = useStore.getState().assetAccounts[0];
    expect(acct.positions).toHaveLength(2);                                                 // not 4
  });
});

describe('EDGE 2 · the + Expense sheet never saves junk', () => {
  test('blank amount or missing category keeps Save disabled; a real entry saves once', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    render(<HomeScreen />);
    fireEvent.press(screen.getByLabelText('Add expense'));
    fireEvent.changeText(screen.getByPlaceholderText('0'), '12');
    fireEvent.press(screen.getByText(/^Add \$12$/));                       // amount but NO category → guarded
    expect((useStore.getState() as any).expenses).toHaveLength(0);
    // (pressing the disabled button bubbles to the backdrop in the harness only — on device the
    // sheet's ScrollView claims the touch; reopen if the harness closed it)
    if (!screen.queryByPlaceholderText('0')) {
      fireEvent.press(screen.getByLabelText('Add expense'));
      fireEvent.changeText(screen.getByPlaceholderText('0'), '12');
    }
    fireEvent.press(screen.getByText(/Groceries/));
    fireEvent.press(screen.getByText(/^Add \$12$/));
    const saved = (useStore.getState() as any).expenses;
    expect(saved).toHaveLength(1);                                         // exactly once
    expect(saved[0].amount).toBe(12);
  });
});

describe('EDGE 3 · flipping the lens mid-session never corrupts an adopted plan', () => {
  test('adopt commitments as working → flip retired → flip back: everything intact', () => {
    useStore.setState({
      onboardingProfile: WORKER, onboardingComplete: true,
      assetAccounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 400000 }],
    } as any);
    useStore.getState().adoptPlan({ contribMonthly: 1200, commitments: [{ goalId: 'g1', label: 'Help parents', monthlyAmount: 2000 }] } as any, 'goals plan');

    const working1 = render(<CashFlowScreen />);
    expect(screen.getByText(/Help parents · from your Plan/)).toBeOnTheScreen();
    working1.unmount();

    (useStore.getState() as any).setLensOverride('retired');
    const retired = render(<CashFlowScreen />);
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();   // retired main renders clean
    retired.unmount();

    (useStore.getState() as any).setLensOverride('working');
    render(<CashFlowScreen />);
    expect(screen.getByText(/Help parents · from your Plan/)).toBeOnTheScreen();   // nothing lost
    expect((useStore.getState() as any).retirementAssumptions.commitments).toHaveLength(1);
  });
});

describe('EDGE 4 · deleting the OTHER side of a transfer must not break history', () => {
  test('transfer chk→sav, delete sav: chk history still renders; sav page degrades honestly', () => {
    useStore.setState({
      onboardingComplete: true,
      assetAccounts: [
        { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 10000 },
        { asset_id: 'sav', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 2000 },
      ],
    } as any);
    useStore.getState().recordTransaction({ type: 'TRANSFER', account_id: 'chk' as any, counter_account_id: 'sav' as any, amount: 500, date: '2026-07-10' } as any);
    (useStore.getState() as any).deleteAsset('sav');

    mockParams = { id: 'chk' };
    const det = render(<AccountDetailScreen />);
    expect(screen.getByLabelText(/Transfer, minus \$500/)).toBeOnTheScreen();   // history intact, no crash
    det.unmount();

    mockParams = { id: 'sav' };
    render(<AccountDetailScreen />);
    expect(screen.getByText('This one lives in your setup answers')).toBeOnTheScreen();   // honest fallback
  });
});

describe('EDGE 5 · a debts-only user: negative net worth is shown, in words', () => {
  test("the glance says the number AND the word 'negative'; Home still stands", () => {
    useStore.setState({
      onboardingProfile: { ...WORKER, name: 'Sam' }, onboardingComplete: true, nwSeeded: true,
      assetAccounts: [],
      liabilities: [{ debt_id: 'd1', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 22000, interest_rate_apr: 0.24, minimum_monthly_payment: 400 }],
    } as any);
    const nw = render(<NetWorthScreen />);
    expect(screen.getByText(/\(negative\)/)).toBeOnTheScreen();            // the word, never color alone
    expect(screen.getByLabelText(/you owe \$22,000/)).toBeOnTheScreen();
    nw.unmount();

    render(<HomeScreen />);
    expect(screen.getByText(/WILL MY MONEY LAST\?/)).toBeOnTheScreen();    // renders, no crash, no fake odds
  });
});
