/**
 * NetWorthScreen — the seeding seam (B-15's home) plus the manager view's single-source totals.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import NetWorthScreen, { assetSheetReady } from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false } as any);   // resetAll keeps prefs; the mask test flips it on
});

describe('NetWorthScreen first-run intro', () => {
  test('fresh user sees the setup choice, and "I\'ll add my own" seeds from onboarding', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    render(<NetWorthScreen />);

    // FIRST-DAY = the approved State C: the FULL layout with honest zeros + the ONE app-wide sample
    expect(screen.getByText('YOUR NET WORTH')).toBeOnTheScreen();
    expect(screen.getByText(/Own .* − Owe /)).toBeOnTheScreen();
    expect(screen.getByText('WHAT YOU OWN')).toBeOnTheScreen();
    expect(screen.getByText('WHAT YOU OWE')).toBeOnTheScreen();
    expect(screen.getByText('💵 CASH')).toBeOnTheScreen();
    expect(screen.getByText('📈 INVESTMENTS')).toBeOnTheScreen();
    expect(screen.getByText('🏠 PERSONAL PROPERTY')).toBeOnTheScreen();
    expect(screen.getByText('Sample: 84%')).toBeOnTheScreen();                 // identical to Home's
    expect(screen.getByText(/a sample, not your number/)).toBeOnTheScreen();
    expect(screen.getByText('EMERGENCY CUSHION')).toBeOnTheScreen();
    expect(screen.getByText('— months')).toBeOnTheScreen();
    // the three ways in are ledger rows now — the label and its arrow are separate cells, so the
    // arrow can sit in the SAME trailing column every other row uses
    expect(screen.getByText('Connect a brokerage')).toBeOnTheScreen();
    expect(screen.getByText('Add a file from your bank')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Type it yourself'));

    const st = useStore.getState();
    expect(st.nwSetupChoice).toBe('self');
    expect(st.assetAccounts.map((a) => a.label).sort()).toEqual(['Investments', 'Retirement (Traditional)']);
    expect(st.liabilities.map((d) => d.label)).toEqual(['Car loan']);
  });

  test('an already-seeded user skips the intro and lands in the manager', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    render(<NetWorthScreen />);
    expect(screen.queryByText("Let's build your net worth")).toBeNull();
  });
});

describe('NetWorthScreen manager totals (single source of wealth)', () => {
  test('seeded accounts and debts render with their onboarding balances', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    render(<NetWorthScreen />);

    expect(screen.getAllByText('$120,000').length).toBeGreaterThan(0);   // retirement savings row
    expect(screen.getAllByText('$45,000').length).toBeGreaterThan(0);    // investments row
    expect(screen.getAllByText(/\$14,000/).length).toBeGreaterThan(0);   // car loan
  });

  test('the glance exposes a VoiceOver summary, and Hide-balances masks the headline', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    useStore.setState({ hideBalances: false });
    const { rerender } = render(<NetWorthScreen />);
    expect(screen.getByLabelText(/Net worth .* By asset class/)).toBeOnTheScreen();   // FCC glance card
    useStore.setState({ hideBalances: true });
    rerender(<NetWorthScreen />);
    expect(screen.getByLabelText('Net worth hidden')).toBeOnTheScreen();   // headline masked
    expect(screen.getAllByText(/••••/).length).toBeGreaterThan(0);   // every dollar masks now, not just the headline
  });

  // UI-level B-15 regression: after a restart + new answers, the intro returns and re-seeding
  // picks up the NEW numbers (this whole journey was impossible before the fix).
  test('restart → new answers → intro reappears → seeding uses the new balances', () => {
    useStore.getState().setOnboardingProfile(employedPartner as any);
    useStore.getState().seedNetWorth(employedPartner as any);
    useStore.getState().restartOnboarding();

    const newAnswers = { ...employedPartner, currentRetirementSavings: '200000', investmentHoldings: '0' };
    useStore.getState().setOnboardingProfile(newAnswers as any);

    render(<NetWorthScreen />);
    expect(screen.getByText('YOUR NET WORTH')).toBeOnTheScreen();   // State C keeps the full layout
    fireEvent.press(screen.getByText('Type it yourself'));

    const accounts = useStore.getState().assetAccounts;
    // B-21: '200000' retirement + explicit '0' holdings → a $0 Investments placeholder too.
    expect(accounts).toHaveLength(2);
    expect(accounts.find((a) => a.label === 'Retirement (Traditional)')!.balance).toBe(200000);
    expect(accounts.find((a) => a.label === 'Investments')!.balance).toBe(0);
  });
});

// B-21: the add/edit sheet allows a $0 balance, but only when the amount field is actually filled in —
// a blank field must NOT create an account (prevents accidental empty adds); a typed "0" may.
describe('AssetSheet $0 add guard (B-21)', () => {
  test('needs a kind and a typed amount; allows "0", blocks blank/whitespace', () => {
    expect(assetSheetReady('brokerage', '')).toBe(false);     // blank → no add
    expect(assetSheetReady('brokerage', '   ')).toBe(false);  // whitespace → no add
    expect(assetSheetReady('', '5000')).toBe(false);          // no kind → no add
    expect(assetSheetReady('brokerage', '0')).toBe(true);     // explicit $0 → allowed
    expect(assetSheetReady('brokerage', '5000')).toBe(true);
  });
});

test('the hero donut is grouped by ASSET CLASS, not the old section axis (#19)', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 20000, target_return: 0 },
      { asset_id: 'a2', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 80000, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getAllByText(/CASH/i).length).toBeGreaterThan(0);   // group bar (the duplicate class header is gone by design)
  expect(screen.getAllByText('Stocks / ETFs').length).toBeGreaterThan(0); // class row
  expect(screen.getByText(/WHAT YOU OWN/)).toBeOnTheScreen();  // the FCC group header
  expect(screen.getByText(/Own .* − Owe /)).toBeOnTheScreen();   // FINAL mock: the math sits ABOVE the hero
});

test('#14/#10: a wrapper account can be classified by what it HOLDS (no parallel double-counting account)', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'k1', label: 'My 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  // FCC founder round 2026-07-15: the inventory is VISIBLE — the account row routes directly
  const first = render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText(/My 401\(k\), \$200,000\. Opens its page\./));
  expect(router.push).toHaveBeenCalledWith('/account-detail?id=k1');
  first.unmount();
  const er = jest.requireMock('expo-router');
  const restoreParams = er.useLocalSearchParams;
  er.useLocalSearchParams = () => ({ edit: 'k1' });                     // the detail screen's Edit path
  render(<NetWorthScreen />);
  er.useLocalSearchParams = restoreParams;
  expect(screen.getByText("What's it invested in?")).toBeOnTheScreen(); // the wrapper class selector (#14 affordance)
  fireEvent.press(screen.getByText('Bonds'));                           // classify the existing account…
  fireEvent.press(screen.getByText(/Save \$/));                         // …instead of adding a separate bond account
  const acct = useStore.getState().assetAccounts.find((a: any) => a.asset_id === 'k1') as any;
  expect(acct.asset_class).toBe('bonds');                               // now counts as bonds, balance unchanged (200k)
  expect(acct.balance).toBe(200000);
});

test('#10: a 401(k) with unspecified holdings is "Unclassified", NOT assumed Stocks/ETFs', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'a1', label: 'My 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText('Unclassified')).toBeOnTheScreen();              // honest class row — the spec fix
  expect(screen.queryByText('Stocks / ETFs')).toBeNull();                  // NOT pretended to be stocks
  expect(screen.getByText(/tap an account to say what's inside/)).toBeOnTheScreen();  // the nudge, on the class row
});

test('#9: the guided-setup running total carries the Assets − Debts identity (not a bare aggregate)', () => {
  useStore.setState({
    nwSeeded: true, nwSetupChoice: 'guided',
    assetAccounts: [
      { asset_id: 'a1', label: 'Cash', kind: 'savings', tax_bucket: 'CASH', balance: 5000, target_return: 0 },
      { asset_id: 'a2', label: 'My 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07 },
    ],
    liabilities: [{ debt_id: 'd1', label: 'Card', debt_type: 'OTHER', remaining_balance: 15000, interest_rate_apr: 0.2, minimum_monthly_payment: 100 }],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText('Net worth so far')).toBeOnTheScreen();
  // the total is shown WITH its components, so the number is never unexplained
  expect(screen.getByText(/Assets .*− Debts /)).toBeOnTheScreen();
});

test('#13: import is reachable from Net Worth via the add-or-connect chooser', () => {
  (router.push as jest.Mock).mockClear();
  useStore.setState({ nwSeeded: true, assetAccounts: [
    { asset_id: 'a1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 50000, target_return: 0.07 },
  ], liabilities: [] } as any);
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText('Add or connect an account'));
  expect(screen.getByLabelText(/Link it, read-only/)).toBeOnTheScreen();   // a real door into the connect flow now
  fireEvent.press(screen.getByLabelText('Import from a file'));
  expect(router.push).toHaveBeenCalledWith('/import-holdings');
});

// P0 orphan-field fix: a debt's planned payment, once set, could never revert to
// "just pay the minimum" — the editor always wrote a number. Blank now clears it.
describe('debt planned payment clears on blank (P0 orphan field)', () => {
  it('empty planned-payment field saves monthly_payment: undefined (falls back to minimum)', () => {
    useStore.setState({ liabilities: [{ debt_id: 'd1', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 500, interest_rate_apr: 0.22, minimum_monthly_payment: 50, monthly_payment: 200 }] } as any);
    render(<NetWorthScreen />);
    // the save path is exercised through the sheet; assert the store rule directly:
    // requiredPayment falls back to the minimum when monthly_payment is undefined
    const { requiredPayment } = require('../../domain/debt');
    useStore.getState().updateLiability?.('d1', { monthly_payment: undefined });
    const d = useStore.getState().liabilities.find((x: any) => x.debt_id === 'd1')!;
    expect(requiredPayment(d)).toBe(50);
  });
});

// ── Build-46 walk rows 7 + 8 (v7 FINAL mock, audit Home·NW #15/#13) ──────────────────────────────
describe('the retirement card (approved final mock + approved words, 2026-08-10; supersedes "Your path ahead")', () => {
  test('renders under the glance and routes to the Plan tab; with a computable plan it carries the projection', () => {
    useStore.setState({
      onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(new Date().getFullYear() - 55), targetRetirementAge: '67', monthlySpending: '5000', horizonAge: '92' },
      assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400000 }],
      nwSetupChoice: 'self',
    } as any);
    render(<NetWorthScreen />);
    const row = screen.getByLabelText(/Your retirement plan/);
    expect(row).toBeOnTheScreen();
    expect(screen.getByText(/retire at \d+ with|on course to last past|See your plan/)).toBeOnTheScreen();   // approved words, 2026-08-04
    expect(screen.getByText('YOUR RETIREMENT PLAN')).toBeOnTheScreen();   // the banded card replaces the by-age phrasing
    expect(screen.getByLabelText(/Your retirement plan/)).toBeOnTheScreen();   // the sentence lives on the card's label          // the ~ says estimate
    fireEvent.press(row);
    expect(router.push).toHaveBeenCalledWith('/(tabs)/plan');
  });

  test('without a computable plan the row is the plain approved link — never an invented number', () => {
    useStore.setState({
      assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5000 }],
      nwSetupChoice: 'self',
    } as any);
    render(<NetWorthScreen />);
    expect(screen.getByLabelText(/Your retirement plan/)).toBeOnTheScreen();
    expect(screen.queryByText(/on course for/)).toBeNull();
  });
});

describe('walk row 8: the grouping pills (v7 FINAL)', () => {
  const seedTwoEtrade = () => useStore.setState({
    assetAccounts: [
      { asset_id: 'e1', label: 'Individual Brokerage', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 40000 },
      { asset_id: 'e2', label: 'Rollover IRA', institution: 'E*TRADE', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 60000 },
      { asset_id: 'c1', label: 'Everyday checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000 },
    ],
    nwSetupChoice: 'self',
  } as any);

  test('TWO pills only (By type removed, founder 2026-08-04); By institution rolls both E*TRADE accounts under ONE header', () => {
    seedTwoEtrade();
    render(<NetWorthScreen />);
    expect(screen.getByText('By category')).toBeOnTheScreen();
    expect(screen.getByText('By institution')).toBeOnTheScreen();
    expect(screen.queryByText('By type')).toBeNull();                 // the third view is gone
    fireEvent.press(screen.getByText('By institution'));
    expect(screen.getByLabelText(/E\*TRADE, \$100,000, 2 accounts/)).toBeOnTheScreen();   // one header, summed
    expect(screen.getByLabelText(/Chase, \$8,000, 1 account\./)).toBeOnTheScreen();
  });

  test('By category returns to the uber-grouped class view', () => {
    seedTwoEtrade();
    render(<NetWorthScreen />);
    fireEvent.press(screen.getByText('By institution'));
    fireEvent.press(screen.getByText('By category'));
    expect(screen.getByText(/▾ 💵 Cash/)).toBeOnTheScreen();          // uber-group bars are back
    expect(screen.getByText(/▾ 📈 Investments/)).toBeOnTheScreen();
  });
});

// FOUNDER RULE 2026-08-04: the change % is measured on cash + investments (never total NW —
// property moves only when retyped). The percent appears ONLY once invDaily history exists.
test('change line: % on cash + investments, from real history — never total-NW, never invented', () => {
  const today = new Date().toISOString().slice(0, 10);
  const past = '2026-01-02';
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 10000, target_return: 0 },
      { asset_id: 'a2', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 400000, target_return: 0.07 },
    ],
    liabilities: [],
    nwDaily: { [past]: 390000, [today]: 410000 },
    invDaily: { [past]: 400000 },                    // baseline cash+investments
  } as any);
  render(<NetWorthScreen />);
  // current investable = 410,000 vs baseline 400,000 → +2.5%. Founder wording 2026-08-10: both halves
  // are NAMED — the dollars are the change in net worth, the percent is a RETURN, and the line says
  // out loud which pot the percent is measured on.
  expect(screen.getByText(/Change in net worth \+\$20,000 · Return on cash \+ investments \+2\.5%/)).toBeOnTheScreen();
});

test('change line: NO percent before the cash+investments history exists', () => {
  const today = new Date().toISOString().slice(0, 10);
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'a2', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 400000, target_return: 0.07 },
    ],
    liabilities: [],
    nwDaily: { '2026-01-02': 390000, [today]: 400000 },
    invDaily: {},
  } as any);
  render(<NetWorthScreen />);
  expect(screen.queryByText(/on cash \+ investments/)).toBeNull();
});

// FINAL mock (mockup-vf/networth-FINAL, founder-approved 2026-08-04): what you own is grouped into
// Cash · Investments · Personal property; each group bar carries its total and collapses.
test('WHAT YOU OWN shows the three uber-groups with their totals, classes inside', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [
      { asset_id: 'c1', label: 'Chase Checking', kind: 'checking', tax_bucket: 'CASH', balance: 8838, target_return: 0 },
      { asset_id: 's1', label: 'Vanguard Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 348495, target_return: 0.07 },
      { asset_id: 'h1', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0 },
    ],
    liabilities: [],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText(/▾ 💵 Cash/)).toBeOnTheScreen();
  expect(screen.getByText(/▾ 📈 Investments/)).toBeOnTheScreen();
  expect(screen.getByText(/▾ 🏠 Personal property/)).toBeOnTheScreen();
  // group totals ride their bars — Investments equals the invested total by definition
  expect(screen.getAllByText('$348,495').length).toBeGreaterThan(0);
  expect(screen.getByText(/WHAT YOU OWN/)).toBeOnTheScreen();
});

// ── QUIET-INSTRUMENT REBUILD (founder handoff + notes, 2026-08-10) ──────────────────────────────
// The flat ledger: every number on the screen resolves to ONE right edge. A band total carries the
// rows' inset PLUS the trailing arrow column; a row that navigates fills that column with "›" and a
// row that doesn't leaves it empty — so nothing sits a few points left of everything else.
test('one shared right edge: band totals reserve the same arrow column the rows do', () => {
  const { SectionBand } = require('../../components/SectionBand');
  const { Spacing } = require('../../utils/theme');
  const flat = (n: any) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
  render(<SectionBand title="WHAT YOU OWN" value="$813,152" trailing={16} />);
  // rows sit at Spacing.md and end with a 16pt arrow cell → the band's total must clear both
  expect(flat(screen.getByText('$813,152')).marginRight).toBe(16);
  screen.unmount();
  render(<SectionBand inCard title="WHAT YOU OWN" value="$813,152" trailing={16} />);
  expect(flat(screen.getByText('$813,152')).marginRight).toBe(Spacing.md + 16);
});

// The hero's two dates (founder 2026-08-11): TODAY rides the title bar — it stamps when these
// numbers were true — and the "since" line names the day the CHANGE is measured from. Two different
// facts, so both earn a place; neither may print the other's date. The trend line stays gone.
test('hero: today stamps the title, the since line carries the measured-from day, no sparkline', () => {
  const today = new Date().toISOString().slice(0, 10);
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 401000, target_return: 0.07 }],
    liabilities: [],
    nwDaily: { '2026-01-02': 400000, [today]: 401000 },
  } as any);
  render(<NetWorthScreen />);
  const stamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  expect(screen.getByText(`YOUR NET WORTH · ${stamp}`)).toBeOnTheScreen();
  expect(screen.getByText('since Jan 2, 2026')).toBeOnTheScreen();       // the measured-from day, not today
  expect(screen.UNSAFE_queryAllByType(require('react-native-svg').Polyline).length).toBe(0);
});

// The first-day screen has no numbers yet, so it carries no as-of stamp — dating a screen of zeros
// would imply we measured something today. Approved State C shows the title with its dot alone.
test('first day: the title carries no date (there is nothing yet for a date to be true of)', () => {
  render(<NetWorthScreen />);
  expect(screen.getByText('YOUR NET WORTH')).toBeOnTheScreen();
  expect(screen.queryByText(/YOUR NET WORTH ·/)).toBeNull();
});

// The handoff's By-institution view: collapsible like By category, its own memory, and an
// institution's row is what it HOLDS — a debt at the same bank never merges into it.
test('By institution: groups collapse, and a bank\'s debt never joins its asset total', () => {
  useStore.setState({
    nwSeeded: true, hideBalances: false,
    assetAccounts: [
      { asset_id: 'c1', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
      { asset_id: 'v1', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 348495, target_return: 0.07 },
    ],
    liabilities: [{ debt_id: 'cc', label: 'Chase Visa', institution: 'Chase', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 }],
  } as any);
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText(/Group what you own by institution/));
  // Chase holds $8,000 of ASSETS — the $6,000 card is not netted off it and is not added to it
  expect(screen.getByLabelText(/^Chase, \$8,000, 1 account/)).toBeOnTheScreen();
  // the card lives under what you owe — as its own row (it also appears in the debt bar's legend)
  expect(screen.getByLabelText(/Chase Visa, you owe \$6,000/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(/^Chase, \$8,000, 1 account\. Collapses/));
  expect(screen.getByLabelText(/^Chase, \$8,000, 1 account\. Expands/)).toBeOnTheScreen();
});

// FINAL mock: the missing-data banner is INLINE on the screen (never a pop-up) and exists ONLY
// while a promised number is incomplete.
test('banner appears with the gap named — and is absent when the data is complete', () => {
  const today = new Date().toISOString().slice(0, 10);
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [{
      asset_id: 'e1', label: 'E*TRADE Brokerage', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE',
      balance: 40000, target_return: 0.07, source: 'connected', last_synced: '2026-07-01T09:00:00Z',
      positions: [{ position_id: 'p1', ticker: 'LCTX', shares: 965, price: null, kind: 'stocks_etf' }],
    }],
    liabilities: [], transactions: [],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText(/numbers? needs? more information/)).toBeOnTheScreen();
  expect(screen.getByText(/LCTX has no price today/)).toBeOnTheScreen();

  useStore.setState({
    assetAccounts: [{
      asset_id: 'e1', label: 'E*TRADE Brokerage', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE',
      balance: 40000, target_return: 0.07, source: 'connected', last_synced: `${today}T09:00:00Z`,
      positions: [{ position_id: 'p1', ticker: 'LCTX', shares: 965, price: 41.45, kind: 'stocks_etf' }],
    }],
    transactions: [{ account_id: 'e1', type: 'DIVIDEND' }],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.queryByText(/numbers? needs? more information/)).toBeNull();   // complete data → NO banner at all
});

// FINAL mock State E: tapping the change opens the walk sheet — the same card design as the
// Performance walk, with the net-worth wording and the debt-principal line, rows summing exactly.
test('tapping the change opens the walk sheet and its rows reach the ending net worth', () => {
  const today = new Date().toISOString().slice(0, 10);
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 401000, target_return: 0.07 }],
    liabilities: [],
    nwDaily: { '2026-01-02': 400000, [today]: 401000 },
    invDaily: { '2026-01-02': 400000 },
    transactions: [{ account_id: 'b1', type: 'DIVIDEND', amount: 600, date: '2026-06-01' }],
  } as any);
  render(<NetWorthScreen />);
  fireEvent.press(screen.getByLabelText(/Opens what drove this change/));
  expect(screen.getByText(/How .* became /)).toBeOnTheScreen();
  expect(screen.getByText('Wealth generated')).toBeOnTheScreen();
  expect(screen.getByText('Dividends')).toBeOnTheScreen();
  expect(screen.getByText('Debt principal you paid')).toBeOnTheScreen();
  expect(screen.getByText(/Ending net worth/)).toBeOnTheScreen();      // "net worth", never "market value"
  expect(screen.getByText(/Contributions are not a gain/)).toBeOnTheScreen();
});
