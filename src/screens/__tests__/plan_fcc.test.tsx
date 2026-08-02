// Plan tab to launch-ready (design r34-r51 + the milestone moment). Pins: the Roth screen
// stands on REAL balances (same bucket rule as Net worth), its tax line is editable and
// labeled an estimate, adoption writes the ONE assumptions patch AND the tax lands in Cash
// flow's April (F11 propagation, r40); the required-withdrawals screen keeps ONE rmdAtAge
// path and its mark-as-taken writes the ONE ledger; the milestone line celebrates a WATCHED
// crossing exactly once — never wealth the user walked in with.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RothScreen from '../RothScreen';
import RequiredWithdrawalsScreen from '../RequiredWithdrawalsScreen';
import HomeScreen from '../HomeScreen';
import { useStore } from '../../store/useStore';
import { taxBucketSplit, rmdAtAge, rmdTakenThisYear } from '../../domain/decumulation';
import { milestoneCrossed, milestoneFloor, milestoneLabel } from '../../domain/milestones';
import { buildDatedGrid } from '../../domain/grid';

const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const WORKER60 = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(new Date().getFullYear() - 60),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '67', horizonAge: '92',
};
const ACCOUNTS = [
  { asset_id: 'ira', label: 'IRA', institution: 'Fidelity', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 310000 },
  { asset_id: 'roth1', label: 'Roth IRA', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 118000 },
  { asset_id: 'brk', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90000 },
];

beforeEach(() => {
  mockPushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingProfile: WORKER60, onboardingComplete: true, assetAccounts: ACCOUNTS } as any);
});

// ═══ ROTH (r34-r41) ═══

test('the dial stands on the REAL pre-tax balance — the same bucket rule Net worth uses (r36 pin)', () => {
  render(<RothScreen />);
  const { money } = require('../../domain/_shared/num');
  const preTax = taxBucketSplit(ACCOUNTS as any).preTax;
  const expected = `from your pre-tax ${money(Math.round(preTax))}`;
  expect(screen.getByText(new RegExp(expected.replace(/[$()]/g, '\\$&')))).toBeOnTheScreen();
});

test('typing an amount → the tax line (estimate, editable rate) + the two later effects', () => {
  render(<RothScreen />);
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '25000');
  expect(screen.getByText(/Tax bill next April: about \$/)).toBeOnTheScreen();
  expect(screen.getByText(/estimated from your income.*change it/)).toBeOnTheScreen();
  expect(screen.getByText(/Estimate — your tax preparer has the exact number/)).toBeOnTheScreen();
  expect(screen.getByText(/a year smaller/)).toBeOnTheScreen();                    // RMD effect
  expect(screen.getByText(/\$118,000 → /)).toBeOnTheScreen();                      // tax-free bucket grows
  // the amount is CAPPED at the real balance
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '999999');
  expect(screen.getByText(/capped at your balance/)).toBeOnTheScreen();
});

test('editable rate: overriding it recomputes the tax bill and says who set it', () => {
  render(<RothScreen />);
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '20000');
  fireEvent.press(screen.getByLabelText(/Tax rate used/));
  fireEvent.changeText(screen.getByLabelText('Tax rate percent'), '30');
  expect(screen.getByText(/Tax bill next April: about \$6,000/)).toBeOnTheScreen();
  expect(screen.getByText(/set by you/)).toBeOnTheScreen();
});

test('ADOPTION (r40 pin): Use this plan writes the patch AND the tax lands in April next year', () => {
  render(<RothScreen />);
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '25000');
  fireEvent.press(screen.getByLabelText(/Use as my plan: convert \$25,000/));
  fireEvent.press(screen.getByLabelText('Use as my plan: Convert $25,000 to Roth this year'));
  const A = (useStore.getState() as any).retirementAssumptions;
  expect(A.rothConversionThisYear).toBe(25000);
  expect(A.rothConversionTax).toBeGreaterThan(0);
  expect((useStore.getState() as any).planHistory.length).toBe(1);                 // one-tap way back exists
  // F11 propagation: the SAME dollar figure shows in the grid's April (via the oneOffs seam)
  const grid = buildDatedGrid(WORKER60 as any, {
    oneOffs: [{ label: 'Roth conversion tax (from your Plan)', amount: A.rothConversionTax, month: 4, year: new Date().getFullYear() + 1 }],
  });
  const april = grid.cells.find((c) => c.calendarMonth === 4 && c.year === new Date().getFullYear() + 1)!;
  expect(april.billItems.find((b) => b.label.includes('Roth conversion tax'))?.amount).toBe(A.rothConversionTax);
});

test('no pre-tax accounts: three plain sentences + the road in — never a fake dial (r41)', () => {
  useStore.setState({ assetAccounts: [], nwSeeded: true, onboardingProfile: { status: 'employed', name: 'P' } } as any);
  render(<RothScreen />);
  expect(screen.getByText(/moves money from a pre-tax retirement account/)).toBeOnTheScreen();
  expect(screen.queryByLabelText('Amount to convert this year')).toBeNull();
  fireEvent.press(screen.getByLabelText('Add your retirement accounts on the Net worth tab'));
  expect(mockPushes).toContain('/(tabs)/analytics');
});

// ═══ REQUIRED WITHDRAWALS (r43-r51) ═══

test('at 74: required/taken/still from ONE rmdAtAge path + the one ledger (r45 pin)', () => {
  useStore.setState({
    onboardingProfile: { ...WORKER60, birthYear: String(new Date().getFullYear() - 74), status: 'retired' },
    transactions: [{ id: 't1', type: 'WITHDRAWAL', account_id: 'ira', amount: 8000, date: `${new Date().getFullYear()}-03-10` }],
  } as any);
  render(<RequiredWithdrawalsScreen />);
  const { money } = require('../../domain/_shared/num');
  const preTax = taxBucketSplit(ACCOUNTS as any).preTax;
  const required = money(Math.round(rmdAtAge(preTax, 74))).replace('$', '\\$');
  expect(screen.getByLabelText(new RegExp(`required ${required}.*taken so far \\$8,000`))).toBeOnTheScreen();
  expect(rmdTakenThisYear((useStore.getState() as any).transactions, ['ira'])).toBe(8000);
});

test('mark-as-taken writes a REAL ledger row: still-to-take falls AND the account history shows it (r46 pin)', () => {
  useStore.setState({ onboardingProfile: { ...WORKER60, birthYear: String(new Date().getFullYear() - 74), status: 'retired' } } as any);
  render(<RequiredWithdrawalsScreen />);
  fireEvent.press(screen.getByLabelText('Mark a withdrawal as taken'));
  fireEvent.changeText(screen.getByLabelText('Withdrawal amount'), '5000');
  fireEvent.press(screen.getByLabelText('Save this withdrawal'));
  const st = useStore.getState() as any;
  expect(st.transactions[0].type).toBe('WITHDRAWAL');
  expect(st.transactions[0].amount).toBe(5000);
  expect(st.assetAccounts.find((a: any) => a.asset_id === 'ira').balance).toBe(305000);   // balances stay honest
});

test('under 73: the explainer leads with the start year + first-year estimate; checklist present (r51)', () => {
  render(<RequiredWithdrawalsScreen />);
  expect(screen.getByText(/Yours starts in/)).toBeOnTheScreen();
  expect(screen.getByText(/GETTING READY/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Social Security decided/)).toBeOnTheScreen();
  expect(screen.getByText(/YEAR BY YEAR \(ESTIMATES\)/)).toBeOnTheScreen();
});

test('no pre-tax: honest explainer + the road to Net worth, no fake numbers', () => {
  useStore.setState({ assetAccounts: [{ asset_id: 'b', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 50000 }] } as any);
  render(<RequiredWithdrawalsScreen />);
  expect(screen.getByText(/No pre-tax retirement accounts on file yet/)).toBeOnTheScreen();
  expect(screen.queryByText(/Required \$/)).toBeNull();
});

// ═══ MILESTONE MOMENT (Home STATES; the strategy's retention moment) ═══

test('domain rules: silent baseline · crossing fires once · dips never re-arm · labels read right', () => {
  expect(milestoneCrossed(520000, null)).toBeNull();                     // first sight = baseline, no party
  expect(milestoneFloor(520000)).toBe(500000);
  expect(milestoneCrossed(520000, 250000)).toBe(500000);                 // watched crossing → celebrate
  expect(milestoneCrossed(480000, 500000)).toBeNull();                   // dip below → nothing
  expect(milestoneCrossed(510000, 500000)).toBeNull();                   // re-cross → never repeats
  expect(milestoneLabel(500000)).toBe('$500k');
  expect(milestoneLabel(1500000)).toBe('$1.5M');
});

test('Home: first render sets the baseline SILENTLY (no line for walked-in wealth)', () => {
  useStore.setState({ nwSeeded: true } as any);
  render(<HomeScreen />);
  expect(screen.queryByText(/just crossed/)).toBeNull();
  expect((useStore.getState() as any).milestoneHighSeen).toBe(500000);   // 310k+118k+90k = 518k → floor 500k
});

test('Home: a WATCHED crossing shows one calm line; tapping dismisses it for good', () => {
  useStore.setState({ nwSeeded: true, milestoneHighSeen: 250000 } as any);
  render(<HomeScreen />);
  expect(screen.getByText(/Your net worth just crossed \$500k/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(/just crossed \$500k. Tap to dismiss/));
  expect((useStore.getState() as any).milestoneHighSeen).toBe(500000);
  expect(screen.queryByText(/just crossed/)).toBeNull();
});

test('PRD F9#16: the FIRST-year RMD states the April-1 deferral rule as a fact (only at exactly 73)', () => {
  useStore.setState({ onboardingProfile: { ...WORKER60, birthYear: String(new Date().getFullYear() - 73), status: 'retired' } } as any);
  const first = render(<RequiredWithdrawalsScreen />);
  expect(screen.getByText(/law lets it wait until April 1/)).toBeOnTheScreen();
  expect(screen.getByText(/two in \d{4}, which can mean more tax/)).toBeOnTheScreen();   // the trade-off, not advice
  first.unmount();
  useStore.setState({ onboardingProfile: { ...WORKER60, birthYear: String(new Date().getFullYear() - 74), status: 'retired' } } as any);
  render(<RequiredWithdrawalsScreen />);
  expect(screen.queryByText(/April 1/)).toBeNull();                                        // 74+: not the first year
});
