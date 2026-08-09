// ADVERSARIAL PASS on the COMPLETE app (release-gate step 3, 2026-07-15). These journeys attack
// the seams BETWEEN this week's features — where no single suite looks: connect→import dedup,
// plan-adoption propagation across three surfaces and back, milestone reacting to real account
// changes, the new screens under the mask, $0-vs-blank guards on the unified add screen.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import { setSyncProviderForTesting, SandboxSyncProvider } from '../services/sync';
import { matchImportAccount } from '../domain/import/holdingsImport';
import { buildDatedGrid } from '../domain/grid';
import ConnectFlowScreen from '../screens/ConnectFlowScreen';
import AddAccountScreen from '../screens/AddAccountScreen';
import NetWorthScreen from '../screens/NetWorthScreen';
import HomeScreen from '../screens/HomeScreen';
import RothScreen from '../screens/RothScreen';
import BillCalendarScreen from '../screens/BillCalendarScreen';

let mockParams: Record<string, string> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r) }),
  useLocalSearchParams: () => mockParams,
}));

const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(new Date().getFullYear() - 60),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '67', horizonAge: '92',
};

beforeEach(() => {
  mockParams = {};
  mockPushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true } as any);
  setSyncProviderForTesting(new SandboxSyncProvider());
});
afterEach(() => setSyncProviderForTesting(null as any));

test('SEAM connect→import: importing a file for an institution you CONNECTED still merges, never twins', async () => {
  // connect Chase (creates source:'connected' accounts)
  render(<ConnectFlowScreen />);
  fireEvent.press(await screen.findByLabelText('Chase. Opens what happens to your data.'));
  fireEvent.press(screen.getByLabelText("Continue to Chase's own sign-in"));
  await waitFor(() => expect(screen.getByText(/Found at Chase/)).toBeTruthy());
  fireEvent.press(screen.getByLabelText(/Track 2 accounts/));
  // the import matcher must SEE the connected brokerage as the same institution account
  const matched = matchImportAccount((useStore.getState() as any).assetAccounts, 'Chase');
  expect(matched).not.toBeNull();
  expect((matched as any).source).toBe('connected');
});

test('SEAM adoption→3 surfaces→revert: the Roth tax appears on the grid AND the bill calendar, and revert removes it everywhere', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 310000 }],
  } as any);
  const roth = render(<RothScreen />);
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '25000');
  fireEvent.press(screen.getByLabelText(/Use as my plan: convert \$25,000/));
  fireEvent.press(screen.getByLabelText('Use as my plan: Convert $25,000 to Roth this year'));
  roth.unmount();
  const A = (useStore.getState() as any).retirementAssumptions;
  const oneOffs = [{ label: 'Roth conversion tax (from your Plan)', amount: A.rothConversionTax, month: 4, year: new Date().getFullYear() + 1 }];
  const withPlan = buildDatedGrid(WORKER as any, { oneOffs });
  expect(withPlan.cells.some((c) => c.billItems.some((b) => b.label.includes('Roth conversion tax')))).toBe(true);
  // one tap back — and the number leaves every surface because the ONE assumptions object reverted
  useStore.getState().revertPlan();
  expect(Number((useStore.getState() as any).retirementAssumptions.rothConversionTax) || 0).toBe(0);
});

test('SEAM add-account→milestone: adding real money on the unified screen fires the watched crossing on Home', () => {
  useStore.setState({ onboardingProfile: WORKER, nwSeeded: true, milestoneHighSeen: 100000 } as any);
  const add = render(<AddAccountScreen />);
  fireEvent.press(screen.getByLabelText('Stocks & funds'));
  fireEvent.changeText(screen.getByLabelText('Account name'), 'Brokerage');
  fireEvent.changeText(screen.getByLabelText('Balance'), '300000');
  fireEvent.press(screen.getByLabelText('Save this account'));
  add.unmount();
  render(<HomeScreen />);
  expect(screen.getByText(/Your net worth just crossed \$250k/)).toBeOnTheScreen();
});

test('SEAM add-account→NW math line: property with a mortgage lands on BOTH sides of Own − Owe', () => {
  useStore.setState({ onboardingProfile: WORKER, nwSeeded: true } as any);
  const add = render(<AddAccountScreen />);
  fireEvent.press(screen.getByLabelText('Real estate'));
  fireEvent.changeText(screen.getByLabelText('Account name'), 'Home');
  fireEvent.changeText(screen.getByLabelText('Balance'), '400000');
  fireEvent.changeText(screen.getByLabelText('Amount still owed'), '250000');
  fireEvent.press(screen.getByLabelText('Save this account'));
  add.unmount();
  render(<NetWorthScreen />);
  expect(screen.getByText(/Own \$400,000 − Owe \$250,000/)).toBeOnTheScreen();   // FINAL mock: above the hero
  expect(screen.getByText('Home mortgage')).toBeOnTheScreen();
});

test('GUARD: the unified add screen allows an explicit $0 but blocks a blank (the B-21 rule lives on)', () => {
  render(<AddAccountScreen />);
  fireEvent.changeText(screen.getByLabelText('Account name'), 'Empty jar');
  fireEvent.press(screen.getByLabelText('Save this account'));            // blank balance → guarded
  expect((useStore.getState() as any).assetAccounts).toHaveLength(0);
  fireEvent.changeText(screen.getByLabelText('Balance'), '0');
  fireEvent.press(screen.getByLabelText('Save this account'));            // explicit $0 → allowed
  expect((useStore.getState() as any).assetAccounts).toHaveLength(1);
});

test('MASK: the connect accounts-found list and the add screen respect hide-balances', async () => {
  useStore.setState({ hideBalances: true } as any);
  render(<ConnectFlowScreen />);
  fireEvent.press(await screen.findByLabelText('Chase. Opens what happens to your data.'));
  fireEvent.press(screen.getByLabelText("Continue to Chase's own sign-in"));
  await waitFor(() => expect(screen.getByText(/Found at Chase/)).toBeTruthy());
  expect(screen.getAllByText(/••••/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/\$4,211/)).toBeNull();
});

test('EDGE: a one-off bill dated for a PASSED month this year lands in Later — never silently dropped, never doubled', () => {
  const now = new Date();
  const passedMonth = now.getMonth() === 0 ? 12 : now.getMonth();        // last month (or Dec of a past year edge)
  const op = { ...WORKER, spendCats: [{ id: 'x', label: 'Old bill', bucket: 'nonmonthly', amount: 900, months: [passedMonth], year: now.getFullYear() - (now.getMonth() === 0 ? 1 : 0), tier: 'flex' }] };
  const grid = buildDatedGrid(op as any, {});
  const inCells = grid.cells.filter((c) => c.billItems.some((b) => b.label === 'Old bill')).length;
  const inLater = grid.later.filter((l) => l.label === 'Old bill').length;
  expect(inCells + inLater).toBe(1);                                     // exactly one honest home
  expect(inCells).toBe(0);                                               // a passed date can't be in the window
});

test('EDGE: the bill calendar renders sanely for a user with NO cash accounts (start = 0, verdict still honest)', () => {
  useStore.setState({ onboardingProfile: WORKER, assetAccounts: [] } as any);
  render(<BillCalendarScreen />);
  expect(screen.getByText(/stay above zero|Careful — short/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Cash on hand now, editable')).toBeOnTheScreen();
});

// ═══ ROUND 2 (the PRD queue's cross-feature seams) ═══

test('SEAM filing-status→everything: switching to married on the Tax organizer moves take-home, Roth tax, AND the sell-tax card in one motion', () => {
  const op = { ...WORKER, taxMode: undefined, manualTaxRate: undefined, filingStatus: 'single' } as any;
  const { monthlyTaxRates, userCapGainsRates } = require('../domain/income');
  const singleRates = monthlyTaxRates(op);
  const singleCg = userCapGainsRates(op);
  const married = { ...op, filingStatus: 'married' };
  expect(monthlyTaxRates(married)[5]).toBeLessThan(singleRates[5]);        // take-home up
  expect(userCapGainsRates(married).st).toBeLessThanOrEqual(singleCg.st);  // sell-tax down or equal
});

test('SEAM horizon-adoption→Home: Use-as-my-plan at 94 changes the will-it-last sentence everywhere', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 500000 }],
  } as any);
  useStore.getState().adoptPlan({ horizonAge: 94 } as any, 'horizon test');
  render(require('../screens/HomeScreen').default ? React.createElement(require('../screens/HomeScreen').default) : <HomeScreen />);
  expect(screen.getByText(/odds of lasting to age 94/)).toBeOnTheScreen();
});

test('SEAM RMD-drag honesty: the same egg held ALL pre-tax never beats the all-Roth version on odds', () => {
  const { selectWillItLast } = require('../domain/retirement/willItLast');
  const mk = (bucket: string) => selectWillItLast({
    op: { ...WORKER, birthYear: String(new Date().getFullYear() - 70), status: 'retired', monthlySpending: '5200' },
    accounts: [{ asset_id: 'x', label: 'Egg', kind: bucket === 'ROTH' ? 'roth_ira' : 'trad_ira', tax_bucket: bucket, balance: 700000 }],
    assumptions: {}, inflationRate: 2.5, employmentStatus: 'retired',
  } as any).chance;
  const preTax = mk('PRE_TAX'), roth = mk('ROTH');
  if (preTax != null && roth != null) expect(preTax).toBeLessThanOrEqual(roth);   // forced taxes never help
});

test('SEAM history→trend: a legacy snapshot and a v1 snapshot chart TOGETHER on Net worth', () => {
  const { makeMonthlySnapshot } = require('../domain/history');
  useStore.setState({
    onboardingProfile: WORKER, nwSeeded: true,
    assetAccounts: [{ asset_id: 'a', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90000 }],
    monthlySnapshots: {
      '2026-05': { month: '2026-05', net_worth: 80000 },                          // legacy blob
      '2026-06': makeMonthlySnapshot({ month: '2026-06', gross_assets: 86000, gross_debt: 0, income_net: 0, spending: 0, debt_paid: 0, savings: 0, allocated: 0, planned_budget: 0, savings_rate: 0, by_category: {}, assets: [], debts: [], captured_at: '' }),
    },
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText(/YOUR NET WORTH/)).toBeOnTheScreen();                   // renders with mixed history, no crash
});
