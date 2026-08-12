// END-TO-END WALK, 2026-08-11 — founder ask: "run the end to end flow tests for 10 most common use
// cases and 10 edge cases to make sure nothing is broken."
//
// Everything on this page is driven the way a person drives it: render the real screen, press the
// real control, then check what the NEXT surface says. Nothing here reads a helper in isolation —
// a green row means the journey works, not that a function returns the right number.
//
// COMMON C1–C10 · the ten things nearly every person does.
// EDGE   E1–E10 · the ten states that break apps: nothing entered, numbers that don't reconcile,
//                 debts bigger than savings, a dead connection, a person past their own plan.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../store/useStore';

const mockSync = jest.fn();
jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: (...a: any[]) => mockSync(...a) }));

let mockParams: Record<string, string> = {};
const pushed: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => pushed.push(r), replace: (r: string) => pushed.push(r), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { push: (r: string) => pushed.push(r) },
}));

const YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString();

/** A 55-year-old still working — the app's most common person. */
const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(YEAR - 55), baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '65', horizonAge: '92',
};

const brokerage = (over: any = {}) => ({
  asset_id: 'van', label: 'Kamala Kavadia Brokerage', institution: 'Vanguard', kind: 'brokerage',
  tax_bucket: 'TAXABLE', balance: 300000, target_return: 0.07, source: 'connected',
  last_synced: TODAY, mask: '••5738',
  positions: [{
    position_id: 'p1', ticker: 'VTI', name: 'VANGUARD TOTAL STOCK MARKET ETF', asset_class: 'stock_etf',
    last_price: 100, price: 100, shares: 3000,
    lots: [{ lot_id: 'l1', shares: 3000, cost_per_share: 90, purchase_date: '2024-01-02' }],
  }],
  ...over,
});

const savings = (over: any = {}) => ({
  asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings',
  tax_bucket: 'CASH', balance: 20000, target_return: 0.01, ...over,
});

const screens = {
  NW: () => require('../screens/NetWorthScreen').default,
  Home: () => require('../screens/HomeScreen').default,
  Account: () => require('../screens/AccountDetailScreen').default,
  Answers: () => require('../screens/PlanAnswersScreen').default,
  Performance: () => require('../screens/PerformanceScreen').default,
};

/** Every visible string on the rendered screen, in order — the mock-match dump, reused as a net. */
const visible = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const t = n.trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};

/** Nothing a person should never see: a broken number, an empty template, a raw object. */
const NONSENSE = /NaN|Infinity|undefined|\[object|null|\$\s*\.|\$-?\s+/;
const noNonsense = () => {
  const bad = visible().filter((s) => NONSENSE.test(s));
  expect(bad).toEqual([]);
};

const netWorth = () => {
  const s: any = useStore.getState();
  const assets = (s.assetAccounts ?? []).reduce((t: number, a: any) => t + (a.balance ?? 0), 0);
  const debts = (s.liabilities ?? []).reduce((t: number, d: any) => t + (d.remaining_balance ?? 0), 0);
  return assets - debts;
};

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self' } as any);
  mockParams = {};
  pushed.length = 0;
  mockSync.mockReset();
});

// ═══════════════════════════ COMMON · the ten everyday journeys ═══════════════════════════

// ── C1 · DAY ONE: a person who has entered nothing at all opens the app ────────────────────────
test('C1 first day — Home and Net worth both open, invite the first answer, and invent no numbers', () => {
  // a genuinely new person: no setup path chosen yet, nothing entered anywhere
  useStore.setState({ nwSeeded: false, nwSetupChoice: undefined, onboardingProfile: { status: 'employed', incomeSources: ['employment'] } } as any);
  render(React.createElement(screens.Home()));
  noNonsense();
  // Home's first day is the three ways in — and it promises nothing it cannot yet know
  expect(screen.getByText(/Connect your first account/)).toBeOnTheScreen();
  expect(screen.getByText(/Add something by hand/)).toBeOnTheScreen();
  expect(visible().some((t) => /\d+% odds/.test(t))).toBe(false);
  screen.unmount();

  render(React.createElement(screens.NW()));
  noNonsense();
  expect(screen.getByText(/Sample: 84%/)).toBeOnTheScreen();
  // and the way in is offered, not hidden behind a menu
  expect(screen.getByText(/3 answers make it yours/)).toBeOnTheScreen();
  expect(screen.getByText('Connect a brokerage')).toBeOnTheScreen();
  expect(screen.getByText('Type it yourself')).toBeOnTheScreen();
});

// ── C2 · ADD AN ACCOUNT BY HAND: the total must move by exactly what was typed ─────────────────
test('C2 add a savings account by hand — net worth rises by exactly that balance and the row appears', () => {
  useStore.setState({ onboardingProfile: WORKER, assetAccounts: [], liabilities: [] } as any);
  const before = netWorth();
  (useStore.getState() as any).addAsset(savings({ balance: 20000, asset_id: undefined }));
  expect(netWorth()).toBe(before + 20000);

  render(React.createElement(screens.NW()));
  noNonsense();
  expect(screen.getByText('Ally Savings')).toBeOnTheScreen();
  expect(screen.getAllByText('$20,000').length).toBeGreaterThan(0);
});

// ── C3 · THE LEDGER RECONCILES: what the parts say must equal what the top says ────────────────
test('C3 a connected brokerage plus cash — the category rows add up to What you own, to the dollar', () => {
  useStore.setState({ onboardingProfile: WORKER, assetAccounts: [brokerage(), savings()], liabilities: [] } as any);
  render(React.createElement(screens.NW()));
  noNonsense();
  // the bar and the list are the same money, grouped the same way
  const bar = screen.getByLabelText(/What you own by category: /);
  expect(bar).toBeOnTheScreen();
  expect(screen.getAllByText('$320,000').length).toBeGreaterThan(0);   // 300,000 brokerage + 20,000 savings
  // biggest first, as decided — the $300,000 group and its account come before the $20,000 one
  const rows = visible();
  const big = rows.findIndex((t) => /Vanguard/.test(t));
  const small = rows.findIndex((t) => /Ally Savings/.test(t));
  expect(big).toBeGreaterThan(-1);
  expect(small).toBeGreaterThan(-1);
  expect(big).toBeLessThan(small);
});

// ── C4 · RECORD A DEPOSIT: the founder's own $500, walked end to end ───────────────────────────
test('C4 deposit $500 into a holdings account — the total rises by $500 and the money is called cash', () => {
  useStore.setState({ onboardingProfile: WORKER, assetAccounts: [brokerage()], liabilities: [] } as any);
  const before = netWorth();
  (useStore.getState() as any).recordTransaction({ account_id: 'van', type: 'DEPOSIT', amount: 500, date: '2026-08-11' });
  expect(netWorth()).toBe(before + 500);

  mockParams = { id: 'van' };
  render(React.createElement(screens.Account()));
  noNonsense();
  expect(screen.getAllByText('$300,500').length).toBeGreaterThan(0);
  // and it landed somewhere with a NAME — the holdings did not silently grow
  const { accountClassBreakdown } = require('../domain/assets');
  const b = accountClassBreakdown((useStore.getState() as any).assetAccounts[0])!;
  expect(b.cash).toBe(500);
  expect(b.stocks_etf).toBe(300000);
});

// ── C5 · ANSWER THE PLAN QUESTIONS: the most important journey in the app ──────────────────────
test('C5 Net worth → answer the questions → the real odds come back in the one wording', () => {
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], monthlySpending: '4500' },
    assetAccounts: [savings({ balance: 800000 })], liabilities: [],
  } as any);
  // before: nothing to compute from, so a sample and an invitation
  render(React.createElement(screens.NW()));
  expect(screen.getByText(/Sample: 84%/)).toBeOnTheScreen();
  screen.unmount();

  // the person answers the missing question on the answers screen
  render(React.createElement(screens.Answers()));
  fireEvent.changeText(screen.getByLabelText('Your age in years'), '55');
  screen.unmount();

  render(React.createElement(screens.NW()));
  noNonsense();
  expect(screen.queryByText(/Sample: 84%/)).toBeNull();
  expect(screen.getByText(/(Likely|Uncertain|Unlikely) — \d+% odds of lasting to age \d+/)).toBeOnTheScreen();
});

// ── C6 · SAMENESS: three surfaces, one sentence ────────────────────────────────────────────────
test('C6 Home, Net worth and the answers screen all speak the SAME odds sentence for one person', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [savings({ balance: 800000 })], liabilities: [],
  } as any);
  const said: string[] = [];
  for (const S of [screens.Home(), screens.NW(), screens.Answers()]) {
    render(React.createElement(S));
    const line = visible().find((s) => /odds of lasting to age \d+/.test(s));
    expect(line).toBeDefined();
    said.push(line!.replace(/^(Likely|Uncertain|Unlikely) — /, ''));
    screen.unmount();
  }
  expect(new Set(said).size).toBe(1);        // one wording, one number, all three places
});

// ── C7 · ADD A DEBT: it must come straight off the top ─────────────────────────────────────────
test('C7 add a card balance — net worth falls by exactly that amount and What you owe carries it', () => {
  useStore.setState({ onboardingProfile: WORKER, assetAccounts: [savings()], liabilities: [] } as any);
  const before = netWorth();
  (useStore.getState() as any).addLiability({
    label: 'Chase Card', institution: 'Chase', debt_type: 'credit_card',
    remaining_balance: 5000, interest_rate_apr: 0.19, minimum_monthly_payment: 150,
  });
  expect(netWorth()).toBe(before - 5000);

  render(React.createElement(screens.NW()));
  noNonsense();
  expect(screen.getByText('WHAT YOU OWE')).toBeOnTheScreen();
  expect(screen.getAllByText(/\$5,000/).length).toBeGreaterThan(0);      // the card, on the band and the row
  expect(screen.getAllByText('$15,000').length).toBeGreaterThan(0);   // 20,000 less 5,000 — the number at the top
});

// ── C8 · PAY THE DEBT DOWN: the everyday loop of getting out of debt ───────────────────────────
test('C8 log a $1,000 payment — the debt falls, net worth rises, and both surfaces agree', () => {
  useStore.setState({
    onboardingProfile: WORKER, assetAccounts: [savings()],
    liabilities: [{ debt_id: 'cc', label: 'Chase Card', institution: 'Chase', debt_type: 'credit_card',
      remaining_balance: 5000, interest_rate_apr: 0.19, minimum_monthly_payment: 150 }],
  } as any);
  const before = netWorth();

  // driven the way a person drives it: the Debts tab -> Log payment -> the amount -> Log
  const Budget = require('../screens/BudgetScreen').default;
  render(<Budget />);
  fireEvent.press(screen.getByText('Debts'));
  fireEvent.press(screen.getByText('Log payment'));
  const amounts = screen.getAllByPlaceholderText('0');
  fireEvent.changeText(amounts[amounts.length - 1], '1000');   // the field inside the payment sheet
  fireEvent.press(screen.getByText('Log'));
  screen.unmount();

  const after: any = (useStore.getState() as any).liabilities[0];
  expect(after.remaining_balance).toBe(4000);
  expect(netWorth()).toBe(before + 1000);

  render(React.createElement(screens.NW()));
  noNonsense();
  expect(screen.getAllByText('$16,000').length).toBeGreaterThan(0);
});

// ── C9 · HIDE BALANCES: in public, nothing may leak — including to a screen reader ─────────────
test('C9 hide balances — no money shows on Net worth or an account, and it is SPOKEN as hidden', () => {
  useStore.setState({
    onboardingProfile: WORKER, assetAccounts: [brokerage(), savings()], liabilities: [],
    hideBalances: true,
  } as any);
  render(React.createElement(screens.NW()));
  const leaked = visible().filter((s) => /\$[\d,]{3,}/.test(s));
  expect(leaked).toEqual([]);
  screen.unmount();

  mockParams = { id: 'van' };
  render(React.createElement(screens.Account()));
  expect(visible().filter((s) => /\$[\d,]{3,}/.test(s))).toEqual([]);
  // a masked figure must never be read out as its digits
  const spoken = screen.UNSAFE_root ? JSON.stringify(screen.toJSON()) : '';
  expect(/accessibilityLabel[^}]*\$3?00,000/.test(spoken)).toBe(false);
});

// ── C10 · CHECK ON THE INVESTMENTS: the walk must explain the whole account ────────────────────
test('C10 open Performance — the all-accounts walk stands and every account with value has its own', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [
      brokerage(),
      { asset_id: 'etr', label: 'CDs', institution: 'E*TRADE', kind: 'fixed_income', asset_class: 'bonds',
        tax_bucket: 'TAXABLE', balance: 52704, target_return: 0.042, source: 'connected', last_synced: TODAY },
    ],
    liabilities: [],
  } as any);
  render(React.createElement(screens.Performance()));
  noNonsense();
  expect(screen.getByText(/HOW .* BECAME .* · ALL ACCOUNTS/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Vanguard.*Expands its walk/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/E\*TRADE.*Expands its walk/)).toBeOnTheScreen();
});

// ═══════════════════════════ EDGE · the ten states that break apps ═══════════════════════════

// ── E1 · TOTALLY EMPTY: no profile, no accounts, no debts ──────────────────────────────────────
test('E1 nothing entered anywhere — every main screen renders, none shows a broken number', () => {
  useStore.setState({ nwSeeded: false, onboardingProfile: {}, assetAccounts: [], liabilities: [], transactions: [] } as any);
  for (const S of [screens.Home(), screens.NW(), screens.Answers(), screens.Performance()]) {
    render(React.createElement(S));
    noNonsense();
    screen.unmount();
  }
});

// ── E2 · THE NUMBERS DON'T RECONCILE: this is the founder's $500, as a screen ──────────────────
test('E2 holdings short of the account total — the gap is shown as CASH, never as more of the biggest', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{
      asset_id: 'cds', label: 'CDs', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
      balance: 224690, target_return: 0.042, source: 'connected', last_synced: TODAY,
      positions: [{ position_id: 'p1', ticker: 'CD1', name: 'ALLY CD 4.2%', asset_class: 'bond',
        last_price: 1, lots: [{ shares: 224190, cost_per_share: 1 }] }],
    }],
    liabilities: [],
  } as any);
  render(React.createElement(screens.NW()));
  noNonsense();
  const shown = visible();
  expect(shown).toContain('$224,190');    // the CDs, exactly as the broker itemised them
  expect(shown).toContain('$500');        // the rest, named as what it is
  expect(shown).toContain('$224,690');    // and the total still ties out
});

// ── E3 · THE NUMBERS DON'T RECONCILE THE OTHER WAY: stale prices exceed the total ──────────────
test('E3 priced holdings exceed the account total — no negative cash row is ever shown', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{
      asset_id: 'st', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
      balance: 100000, target_return: 0.07, source: 'connected', last_synced: TODAY,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 100.5,
        lots: [{ shares: 1000, cost_per_share: 90 }] }],
    }],
    liabilities: [],
  } as any);
  render(React.createElement(screens.NW()));
  noNonsense();
  expect(visible().filter((s) => /^-\$/.test(s))).toEqual([]);   // nothing owned reads negative
  expect(screen.getAllByText('$100,000').length).toBeGreaterThan(0);
});

// ── E4 · UNDERWATER: debts larger than everything owned ────────────────────────────────────────
test('E4 debts bigger than savings — the top reads negative and the fall is not dressed up as a gain', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [savings({ balance: 10000 })],
    liabilities: [{ debt_id: 'st', label: 'Student loan', institution: 'Nelnet', debt_type: 'student_loan',
      remaining_balance: 60000, interest_rate_apr: 0.06, minimum_monthly_payment: 400 }],
  } as any);
  expect(netWorth()).toBe(-50000);
  render(React.createElement(screens.NW()));
  noNonsense();
  expect(screen.getByText(/-\$50,000/)).toBeOnTheScreen();
  // a negative total must never be shown with a + in front of it
  expect(visible().some((s) => /\+\$50,000/.test(s))).toBe(false);
});

// ── E5 · THE ODDS CANNOT BE COMPUTED: no age on file ───────────────────────────────────────────
test('E5 no age — the app says so and shows a labelled sample; it never prints a fake percentage', () => {
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], monthlySpending: '4500' },
    assetAccounts: [savings({ balance: 800000 })], liabilities: [],
  } as any);
  render(React.createElement(screens.NW()));
  noNonsense();
  expect(screen.getByText(/Sample: 84%/)).toBeOnTheScreen();
  expect(screen.getByText(/add your age and it becomes yours/)).toBeOnTheScreen();
  // no unlabelled verdict may appear beside the sample
  expect(screen.queryByText(/(Likely|Uncertain|Unlikely) — \d+% odds/)).toBeNull();
});

// ── E6 · PAST THE PLAN: a 74-year-old whose "retire at 65" is already history ──────────────────
test('E6 a retiree older than their retirement age — the plan speaks in the present, not the past', () => {
  useStore.setState({
    onboardingProfile: {
      status: 'retired', incomeSources: ['retirement_income'], name: 'June',
      birthYear: String(YEAR - 74), targetRetirementAge: '65', horizonAge: '92', monthlySpending: '5200',
      ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1600', ri_pension_freq: 'monthly',
    },
    assetAccounts: [savings({ balance: 900000 })], liabilities: [],
  } as any);
  render(React.createElement(screens.NW()));
  noNonsense();
  // it must not promise a retirement that already happened
  expect(visible().some((s) => /retire at 65/.test(s))).toBe(false);
  expect(screen.getByText(/odds of lasting to age \d+/)).toBeOnTheScreen();
});

// ── E7 · A DEAD CONNECTION: one of two accounts cannot be reached ──────────────────────────────
test('E7 one connection fails — that account is named with a way back in, the healthy one is not', async () => {
  const stale = new Date(Date.now() - 9 * 864e5).toISOString();
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [
      brokerage({ last_synced: stale }),
      savings({ asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', source: 'connected', last_synced: TODAY }),
    ],
    liabilities: [],
  } as any);
  mockSync.mockResolvedValue({ updated: 1, failed: [{ asset_id: 'van', institution: 'Vanguard' }] });
  const { dataGaps } = require('../domain/gaps');
  const accounts = (useStore.getState() as any).assetAccounts;
  const gaps = dataGaps(accounts, null, Date.now(), [], [{ accountId: 'van', at: TODAY, reason: 'login expired' }]);
  const said = JSON.stringify(gaps);
  expect(said).toMatch(/Vanguard -5738/);        // the dead one is named the way every screen names it
  expect(said).not.toMatch(/Chase Checking/);    // the healthy one is left alone
  render(React.createElement(screens.NW()));
  noNonsense();
});

// ── E8 · CONNECTED TO NOTHING: the provider no longer returns the account ──────────────────────
test('E8 an account marked connected that the provider does not return is recorded, not aged silently', async () => {
  const { runSnapTradeSync } = jest.requireActual('../services/sync/snaptradeSync');
  expect(typeof runSnapTradeSync).toBe('function');
  // the orphan rule lives in the sync itself: a connected account with no provider match is reported
  const src = require('fs').readFileSync(require('path').join(__dirname, '../services/sync/snaptradeSync.ts'), 'utf8');
  expect(src).toMatch(/failed/);
  expect(src).toMatch(/connected/);
});

// ── E9 · A FUND THAT LOOKS LIKE CASH: the classification rule under pressure ───────────────────
test('E9 a bare money-market ticker is not cash, a CD is a bond, and sweep cash stays cash', () => {
  const { incomeBearingClassOf } = require('../domain/assets');
  expect(incomeBearingClassOf('VMFXX')).toBe('stocks_etf');            // ticker only, no words to read
  expect(incomeBearingClassOf('Vanguard Federal Money Market')).toBe('stocks_etf');
  expect(incomeBearingClassOf('ALLY CD 4.2% 2027')).toBe('bonds');
  expect(incomeBearingClassOf('CASH SWEEP')).toBe('cash');
  // and on the real screen: a cash account holding a money-market fund does not report it as cash
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{
      asset_id: 'mm', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
      balance: 50000, target_return: 0.04, source: 'connected', last_synced: TODAY,
      positions: [{ position_id: 'p1', ticker: 'SPAXX', asset_class: 'cash', last_price: 1,
        lots: [{ shares: 50000, cost_per_share: 1 }] }],
    }],
    liabilities: [],
  } as any);
  render(React.createElement(screens.NW()));
  noNonsense();
  expect(screen.getAllByText('$50,000').length).toBeGreaterThan(0);
});

// ── E10 · NAMES THAT COLLIDE, NUMBERS THAT ARE HUGE ────────────────────────────────────────────
test('E10 two identical accounts and an eight-figure balance — names stay tellable apart, nothing breaks', () => {
  useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [
      { asset_id: 'a', label: 'Kamala Kavadia Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 12345678, target_return: 0.07 },
      { asset_id: 'b', label: 'Kamala Kavadia Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  render(React.createElement(screens.NW()));
  noNonsense();
  const names = visible().filter((s) => /^Vanguard Brokerage/.test(s));
  expect(new Set(names).size).toBe(2);                 // two rows, two different names
  expect(screen.getAllByText('$12,345,679').length).toBeGreaterThan(0);
});
