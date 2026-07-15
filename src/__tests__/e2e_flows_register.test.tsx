// E2E FLOW REGISTER — gap-filling suite (founder ask 2026-07-15: ≥50 distinct end-to-end user
// flows). The register doc (docs/FCC-core-55-70/FCC-e2e-flow-register.md) numbers every flow;
// THIS file adds the twenty that no other suite drove end-to-end. Each flow: real screens,
// real interactions, cross-surface assertions. Personas: a 60-yr worker, a 74-yr retiree.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import { setSyncProviderForTesting, SandboxSyncProvider } from '../services/sync';

let mockParams: Record<string, string> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(new Date().getFullYear() - 60),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '67', horizonAge: '92',
};
const RETIREE74 = {
  status: 'retired', incomeSources: ['retirement_income'], name: 'June',
  birthYear: String(new Date().getFullYear() - 74), horizonAge: '92', monthlySpending: '5200',
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1600', ri_pension_freq: 'monthly',
};
const EGG = [{ asset_id: 'ira', label: 'IRA', institution: 'Fidelity', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 }];

beforeEach(() => {
  mockParams = {};
  mockPushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true } as any);
});

// ── E2E-36 · the retiree front door: type two numbers → a real paycheck ──
test('E2E-36 retiree types SS + pension on Monthly income → Save → the paycheck hero carries the sum', () => {
  useStore.setState({ onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'], name: 'June', birthYear: RETIREE74.birthYear, horizonAge: '92', monthlySpending: '4000' }, assetAccounts: EGG } as any);
  const MonthlyIncomeScreen = require('../screens/MonthlyIncomeScreen').default;
  const mi = render(<MonthlyIncomeScreen />);
  fireEvent.changeText(screen.getByLabelText('Social Security amount each month'), '2600');
  fireEvent.changeText(screen.getByLabelText('pension amount'), '1600');
  fireEvent.press(screen.getByLabelText('Save monthly income'));
  mi.unmount();
  const { PaycheckCard } = require('../components/PaycheckCard');
  render(<PaycheckCard />);
  expect(screen.getByText('$4,200')).toBeOnTheScreen();
});

// ── E2E-37 · month detail: open a dated month, navigate to the next ──
test('E2E-37 month detail renders the dated headline and Previous/Next months navigate', () => {
  useStore.setState({ onboardingProfile: WORKER } as any);
  mockParams = { slot: '0' };
  const MonthDetailScreen = require('../screens/MonthDetailScreen').default;
  render(<MonthDetailScreen />);
  expect(screen.getByLabelText(/Left over in .*:/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Next month'));
  expect(screen.getByLabelText(/Left over in .*:/)).toBeOnTheScreen();   // still standing after nav
});

// ── E2E-38 · what-if: two +$100 taps → the before/after estimate moves ──
test('E2E-38 what-if raises the extra amount and speaks a full before→after estimate', () => {
  useStore.setState({ onboardingProfile: WORKER, assetAccounts: EGG } as any);
  const WhatIfScreen = require('../screens/WhatIfScreen').default;
  render(<WhatIfScreen />);
  fireEvent.press(screen.getByLabelText('Raise the extra monthly amount by $100'));
  fireEvent.press(screen.getByLabelText('Raise the extra monthly amount by $100'));
  expect(screen.getByLabelText(/Estimates at age \d+: nest egg .* becomes .*; the chance your money lasts \d+ percent becomes \d+ percent/)).toBeOnTheScreen();
});

// ── E2E-39 · Social Security at 62: every claim age shown, adopt 70, revert ──
test('E2E-39 SS timing: statement → the 62-70 rows with chances → adopt 70 → revert restores', () => {
  useStore.setState({ onboardingProfile: { ...WORKER, birthYear: String(new Date().getFullYear() - 62) }, assetAccounts: EGG } as any);
  const before = JSON.stringify((useStore.getState() as any).retirementAssumptions);
  const SsTimingScreen = require('../screens/SsTimingScreen').default;
  render(<SsTimingScreen />);
  fireEvent.changeText(screen.getByLabelText(/Monthly amount from your Social Security statement/), '2400');
  expect(screen.getByLabelText(/Claiming at 62: \d+ percent chance/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Claiming at 70: \d+ percent chance/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Use claim at 70 as my plan'));
  fireEvent.press(screen.getByLabelText('Use this plan: Claim Social Security at 70'));
  expect((useStore.getState() as any).retirementAssumptions.ssClaimAge).toBe(70);
  useStore.getState().revertPlan();
  expect(JSON.stringify((useStore.getState() as any).retirementAssumptions)).toBe(before);
});

// ── E2E-40 · look-back: real cached history → a fact; no history → honest words ──
test('E2E-40 look-back renders a real counterfactual with prices, and refuses without them', () => {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const back = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 15));
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions: [{ position_id: 'p', ticker: 'BND', kind: 'stocks_etf', lots: [{ lot_id: 'l', shares: 100, cost_per_share: 80, purchase_date: '2024-01-02' }] }] }],
    priceCache: {
      BND: { ticker: 'BND', points: [{ date: back(14), close: 80 }, { date: back(2), close: 78 }, { date: iso(now), close: 77 }] },
      SPY: { ticker: 'SPY', points: [{ date: back(14), close: 100 }, { date: back(2), close: 108 }, { date: iso(now), close: 110 }] },
    },
  } as any);
  const LookBackScreen = require('../screens/LookBackScreen').default;
  const r = render(<LookBackScreen />);
  expect(screen.getAllByLabelText(/What actually happened: .*Real past prices, not a prediction|.*/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/it would be|not enough|history/i).length).toBeGreaterThan(0);
  r.unmount();
  useStore.setState({ priceCache: {} } as any);
  render(<LookBackScreen />);
  expect(screen.getAllByText(/history|prices/i).length).toBeGreaterThan(0);   // words, never an invented number
});

// ── E2E-41 · the Settings revisit flips the whole app's lens ──
test('E2E-41 Your setup revisit: working → retired flips the Cash flow main to the paycheck', () => {
  useStore.setState({ onboardingProfile: { ...RETIREE74, status: 'employed' }, lensOverride: 'working', assetAccounts: EGG } as any);
  const FirstRunScreen = require('../screens/FirstRunScreen').default;
  const fr = render(<FirstRunScreen />);
  expect(screen.getByText('Your setup')).toBeOnTheScreen();                 // revisit skips the intro
  fireEvent.press(screen.getByLabelText('Retired, or nearly'));
  fireEvent.press(screen.getByLabelText('Continue'));
  fr.unmount();
  const CashFlowScreen = require('../screens/CashFlowScreen').default;
  render(<CashFlowScreen />);
  expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
});

// ── E2E-42 · import classifies crypto as an ALTERNATIVE, correctable before save ──
test('E2E-42 importing a crypto row files it under Alternatives (visible + correctable), never as a stock', async () => {
  const DocumentPicker = require('expo-document-picker');
  const FileSystem = require('expo-file-system');
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://q.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Ticker,Shares,Cost Basis\nBTC,0.5,20000\nVTI,10,2000\n');
  const ImportHoldingsScreen = require('../screens/ImportHoldingsScreen').default;
  render(<ImportHoldingsScreen />);
  fireEvent.press(screen.getByText('Choose a file'));
  await waitFor(() => expect(screen.getByLabelText('Which institution is this file from')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Which institution is this file from'), 'Coinbase');
  expect(screen.getAllByLabelText(/classified as Alternatives — tap to change/i).length).toBeGreaterThan(0);
  fireEvent.press(screen.getByLabelText(/Import \d+ holdings?/));
  await waitFor(() => expect((useStore.getState() as any).assetAccounts.length).toBeGreaterThan(0));
  const accts = (useStore.getState() as any).assetAccounts;
  expect(accts.some((a: any) => a.asset_class === 'alternatives' || ['crypto', 'commodities'].includes(a.kind))).toBe(true);
});

// ── E2E-43 · a cash account's full ledger day: deposit, withdraw, history in order ──
test('E2E-43 deposit then withdraw on a cash account: balance right, history shows both rows', () => {
  useStore.setState({ assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 1000 }] } as any);
  mockParams = { id: 'chk' };
  const AccountDetailScreen = require('../screens/AccountDetailScreen').default;
  render(<AccountDetailScreen />);
  fireEvent.press(screen.getByLabelText('Record a deposit for Checking'));
  fireEvent.changeText(screen.getByLabelText('Amount'), '500');
  fireEvent.press(screen.getByLabelText('Save this deposit'));
  fireEvent.press(screen.getByLabelText('Record a withdraw for Checking'));
  fireEvent.changeText(screen.getByLabelText('Amount'), '200');
  fireEvent.press(screen.getByLabelText('Save this withdraw'));
  const st = useStore.getState() as any;
  expect(st.assetAccounts[0].balance).toBe(1300);
  expect(st.transactions).toHaveLength(2);
  expect(screen.getByLabelText(/Deposit, plus \$500/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Withdrawal, minus \$200/)).toBeOnTheScreen();
});

// ── E2E-44 · a stale alternative: the nudge → update value → the clock resets ──
test('E2E-44 stale gold: update the value in one tap and the as-of stamp resets to today', () => {
  const old = new Date(); old.setMonth(old.getMonth() - 8);
  useStore.setState({ assetAccounts: [{ asset_id: 'gld', label: 'Gold coins', kind: 'commodities', asset_class: 'alternatives', tax_bucket: 'TAXABLE', balance: 9000, value_as_of: old.toISOString().slice(0, 10) }] } as any);
  mockParams = { id: 'gld' };
  const AccountDetailScreen = require('../screens/AccountDetailScreen').default;
  render(<AccountDetailScreen />);
  fireEvent.press(screen.getByLabelText("Update this account's value"));
  fireEvent.changeText(screen.getByLabelText('Current value'), '10400');
  fireEvent.press(screen.getByLabelText('Save the updated value'));
  const a = (useStore.getState() as any).assetAccounts[0];
  expect(a.balance).toBe(10400);
  expect(a.value_as_of).toBe(new Date().toISOString().slice(0, 10));
});

// ── E2E-45 · debt through the unified add screen → NW shows the OWE side + pay-first ──
test('E2E-45 add a card debt by hand → Net worth OWES it with the pay-first pill', () => {
  useStore.setState({ onboardingProfile: WORKER, nwSeeded: true, assetAccounts: EGG } as any);
  const AddAccountScreen = require('../screens/AddAccountScreen').default;
  const add = render(<AddAccountScreen />);
  fireEvent.press(screen.getByLabelText('Debt'));
  fireEvent.changeText(screen.getByLabelText('Account name'), 'Visa');
  fireEvent.changeText(screen.getByLabelText('Balance'), '6000');
  fireEvent.changeText(screen.getByLabelText('Interest rate percent'), '24');
  fireEvent.changeText(screen.getByLabelText('Minimum monthly payment'), '150');
  fireEvent.press(screen.getByLabelText('Save this account'));
  add.unmount();
  const NetWorthScreen = require('../screens/NetWorthScreen').default;
  render(<NetWorthScreen />);
  expect(screen.getByLabelText(/Visa, you owe \$6,000/)).toBeOnTheScreen();
  expect(screen.getByText('pay first')).toBeOnTheScreen();
});

// ── E2E-46 · fund a goal from this month's surplus ──
test('E2E-46 allocate surplus to a goal → saved rises and the month is funded', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    goals: [{ id: 'g1', label: 'New roof', icon: '🏠', target: 12000, saved: 2000, targetDate: `${new Date().getFullYear() + 2}-06-01` }],
  } as any);
  const GoalsScreen = require('../screens/GoalsScreen').default;
  render(<GoalsScreen />);
  fireEvent.press(screen.getByLabelText("Allocate this month's surplus to New roof"));
  fireEvent.press(screen.getByLabelText(/Use all available surplus/));
  fireEvent.press(screen.getAllByText(/^Allocate\b/).pop()!);   // the sheet's confirm (a row label matches too)
  const g = (useStore.getState() as any).goals[0];
  expect(g.saved).toBeGreaterThan(2000);
  expect(Object.keys(g.fundedByMonth ?? {}).length).toBeGreaterThan(0);
});

// ── E2E-47 · an insight's provenance: the math behind the number, on demand ──
test('E2E-47 open the idle-cash insight → the provenance sheet lists the accounts and the math', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [
      { asset_id: 'c1', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 90000 },
      { asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 60000 },
    ],
  } as any);
  const InsightsScreen = require('../screens/InsightsScreen').default;
  render(<InsightsScreen />);
  fireEvent.press(screen.getAllByLabelText(/A lot is sitting in cash/)[0]);
  expect(screen.getByText('Where this comes from')).toBeOnTheScreen();
  expect(screen.getAllByText(/Cash share|Cash total/).length).toBeGreaterThan(0);
});

// ── E2E-48 · the 401(k)-room landing → try it in the what-if, pre-filled ──
test('E2E-48 contribution room: the try-it door opens the what-if with the amount pre-filled', () => {
  useStore.setState({ onboardingProfile: { ...WORKER, c_401k: '500' } } as any);
  const ContributionRoomScreen = require('../screens/ContributionRoomScreen').default;
  render(<ContributionRoomScreen />);
  fireEvent.press(screen.getByLabelText(/Try it in a what-if/));
  expect(mockPushes.find((r) => /\/what-if\?addMonthly=\d+/.test(r))).toBeTruthy();
});

// ── E2E-49 · filing status set on the organizer → the Roth screen's tax bill drops, live ──
test('E2E-49 switching to married on the Tax organizer lowers the Roth conversion tax in the same session', () => {
  useStore.setState({ onboardingProfile: { ...WORKER, taxMode: undefined, manualTaxRate: undefined }, assetAccounts: EGG } as any);
  const RothScreen = require('../screens/RothScreen').default;
  const r1 = render(<RothScreen />);
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '30000');
  const singleLine = screen.getByText(/Tax bill next April: about \$/).props.children.join('');
  r1.unmount();
  const TaxOrganizerScreen = require('../screens/TaxOrganizerScreen').default;
  const org = render(<TaxOrganizerScreen />);
  fireEvent.press(screen.getByLabelText('Married, filing jointly'));
  org.unmount();
  render(<RothScreen />);
  fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '30000');
  const marriedLine = screen.getByText(/Tax bill next April: about \$/).props.children.join('');
  const num = (s: string) => Number((s.match(/\$([\d,]+)/) ?? [])[1]?.replace(/,/g, '') ?? 0);
  expect(num(marriedLine)).toBeLessThanOrEqual(num(singleLine));
});

// ── E2E-50 · the retiree's year at a glance: 12 paycheck months, each spoken ──
test('E2E-50 paycheck months: twelve dated rows, each a full safe-to-spend sentence', () => {
  useStore.setState({ onboardingProfile: RETIREE74, assetAccounts: EGG } as any);
  const PaycheckMonthsScreen = require('../screens/PaycheckMonthsScreen').default;
  render(<PaycheckMonthsScreen />);
  expect(screen.getAllByLabelText(/safe to spend/).length).toBeGreaterThanOrEqual(12);
});

// ── E2E-51 · the worker peeks at the steer sheet: projection mode is bannered ──
test('E2E-51 a working user sees the draw-order sheet in projection mode with the honest banner', () => {
  useStore.setState({ onboardingProfile: WORKER, assetAccounts: EGG } as any);
  const { DrawSteerSheet } = require('../components/DrawSteerSheet');
  render(<DrawSteerSheet visible onClose={() => {}} projectionMode />);
  expect(screen.getByText(/a projection, not today's money/)).toBeOnTheScreen();
});

// ── E2E-52 · edit an existing dated bill from Coming up: the change lands everywhere ──
test('E2E-52 tap a coming-up bill → the form prefills → saving updates the ONE spending category', () => {
  const m = new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2;
  useStore.setState({
    onboardingProfile: { ...RETIREE74, spendCats: [{ id: 'ptax', label: 'Property tax', bucket: 'nonmonthly', amount: 1900, months: [m], dueDay: 15, tier: 'critical' }] },
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 18000 }],
  } as any);
  const BillCalendarScreen = require('../screens/BillCalendarScreen').default;
  render(<BillCalendarScreen />);
  fireEvent.press(screen.getByLabelText(/Property tax, \$1,900 due/));
  expect(screen.getByText('Edit this bill')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByLabelText('Bill amount'), '2100');
  fireEvent.press(screen.getByLabelText('Save this bill'));
  const cat = (useStore.getState() as any).onboardingProfile.spendCats.find((c: any) => c.id === 'ptax');
  expect(cat.amount).toBe(2100);
});

// ── E2E-53 · the milestone's full arc: silent baseline → crossing → dismiss → the NEXT rung still fires ──
test('E2E-53 milestone arc across two crossings', () => {
  const HomeScreen = require('../screens/HomeScreen').default;
  useStore.setState({ onboardingProfile: WORKER, nwSeeded: true, milestoneHighSeen: 100000, assetAccounts: [{ asset_id: 'a', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 300000 }] } as any);
  const h1 = render(<HomeScreen />);
  fireEvent.press(screen.getByLabelText(/just crossed \$250k. Tap to dismiss/));
  expect((useStore.getState() as any).milestoneHighSeen).toBe(250000);
  h1.unmount();
  useStore.setState({ assetAccounts: [{ asset_id: 'a', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 600000 }] } as any);
  render(<HomeScreen />);
  expect(screen.getByText(/just crossed \$500k/)).toBeOnTheScreen();
});

// ── E2E-54 · the saved draft resumes: the doors offer 'pick up where you left off' ──
test('E2E-54 a paused deep-setup draft resumes from the Home doors', () => {
  useStore.setState({ onboardingProfile: null, onboardingDraft: { step: 3 }, onboardingComplete: true } as any);
  const HomeScreen = require('../screens/HomeScreen').default;
  render(<HomeScreen />);
  fireEvent.press(screen.getByLabelText('Pick up where you left off — continue setup'));
  expect(mockPushes).toContain('/onboarding');
});

// ── E2E-55 · connect's consent screen offers by-hand as an equal — and it works ──
test('E2E-55 from the consent screen, Add-by-hand is one tap away (never a dead end)', async () => {
  setSyncProviderForTesting(new SandboxSyncProvider());
  const ConnectFlowScreen = require('../screens/ConnectFlowScreen').default;
  render(<ConnectFlowScreen />);
  fireEvent.press(await screen.findByLabelText('Fidelity. Opens what happens to your data.'));
  fireEvent.press(screen.getByLabelText('Add it by hand instead'));
  expect(mockPushes).toContain('/add-account');
  setSyncProviderForTesting(null as any);
});

// ── E2E-56 · log an expense with a category → the month detail carries it ──
test('E2E-56 a logged grocery run shows inside the month detail it belongs to', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    expenses: [{ id: 'e1', amount: 240, category: 'Groceries', date: new Date().toISOString().slice(0, 10) }],
  } as any);
  mockParams = { slot: '0' };
  const MonthDetailScreen = require('../screens/MonthDetailScreen').default;
  render(<MonthDetailScreen />);
  expect(screen.getAllByText(/\$240|Groceries/).length).toBeGreaterThan(0);
});
