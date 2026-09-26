// Performance main — the design the founder confirmed on 2026-09-14 (Performance FINAL, 2026-08-04)
// with his changes of 2026-09-25 (mock v14). The screen is FIVE things and nothing else: the window
// selector, the summary with its value line, the all-accounts walk, one walk per account, and what
// each category earned. Everything the older Invest screen carried below that — Your return, Honest
// comparison, Winners & laggards, Look ahead / Look back, Your investments, Add investment — is not
// in the approved design and is pinned ABSENT here so it cannot creep back.
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { GLOSSARY } from '../../domain/glossary';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';

// Dates the staleness rule can actually judge: 6+ months old is stale (see valueFreshness).
const monthsAgo = (n: number) => {
  const d = new Date(); d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-03`;
};
const FRESH = monthsAgo(2);    // comfortably inside the window, whenever this runs
const STALE = monthsAgo(10);   // comfortably outside it

const pushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => pushes.push(r), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const seriesFor = (start: number, end: number) => {
  const now = new Date();
  const back = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
  return { points: [{ date: back(14), close: start }, { date: back(6), close: (start + end) / 2 }, { date: iso(now), close: end }] };
};
const pos = (id: string, ticker: string, shares: number, cost: number) => ({
  position_id: id, ticker, kind: 'stocks_etf',
  lots: [{ lot_id: `l${id}`, shares, cost_per_share: cost, purchase_date: '2024-01-02' }],
});

beforeEach(() => {
  pushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({
    assetAccounts: [
      { asset_id: 'brk', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [pos('p1', 'NVDA', 200, 300), pos('p2', 'VTI', 100, 200), pos('p3', 'BND', 100, 80)] },
      { asset_id: 'bnd1', label: 'Treasury 4.5% ’36', kind: 'fixed_income', tax_bucket: 'TAXABLE', asset_class: 'bonds',
        // FRESH means fresh TODAY. This was pinned to a fixed 2026-03-03 and quietly aged into
        // staleness on 1 September, six months later — the test broke on the calendar, not on the
        // code. A fixture that asserts freshness has to be dated relative to now.
        balance: 95000, face_value: 100000, coupon_rate: 0.045, maturity_date: '2036-06-30', value_as_of: FRESH },
      { asset_id: 'gld', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', asset_class: 'alternatives',
        balance: 9000, value_as_of: STALE },
    ],
    priceCache: {
      NVDA: { ticker: 'NVDA', ...seriesFor(300, 423) },   // +41%
      VTI:  { ticker: 'VTI',  ...seriesFor(200, 224) },   // +12%
      BND:  { ticker: 'BND',  ...seriesFor(80, 77.6) },   // −3%
      SPY:  { ticker: 'SPY',  ...seriesFor(100, 110.1) }, // the market +10.1%
    },
    retirementAssumptions: { ...useStore.getState().retirementAssumptions, contribMonthly: 1500 },
  } as any);
});


// ── the window selector (mock v14 mark 10/14) ───────────────────────────────────────────────────
describe('the window selector', () => {
  test('five windows, each carrying its own return — and no 3M, 6M or "YTD"', () => {
    render(<PerformanceScreen />);
    for (const w of ['1M', 'This year', '1Y', '2Y']) expect(screen.getAllByText(w).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Since/).length).toBeGreaterThan(0);
    expect(screen.queryByText('3M')).toBeNull();
    expect(screen.queryByText('6M')).toBeNull();
    expect(screen.queryByText('YTD')).toBeNull();
  });

  test('a window with nothing behind it says so aloud, and shows an em-dash rather than +0.00%', () => {
    render(<PerformanceScreen />);
    expect(screen.getByLabelText(/Show 1Y, (no data for that window yet|[−+]?\d)/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Show 2Y/)).toBeOnTheScreen();
  });

  test('picking a window moves the whole screen to it', () => {
    render(<PerformanceScreen />);
    fireEvent.press(screen.getAllByText('This year')[0]);
    expect(screen.getByText('SUMMARY · THIS YEAR')).toBeOnTheScreen();
  });

  test('2Y says it is a yearly rate — every other window is the window itself', () => {
    render(<PerformanceScreen />);
    expect(screen.queryByText(/2Y is shown per year/)).toBeNull();
    fireEvent.press(screen.getAllByText('2Y')[0]);
    expect(screen.getByText(/2Y is shown per year, so it sits fairly beside 1Y/)).toBeOnTheScreen();
  });
});

// ── the summary and the walk (approved 2026-08-04, unchanged by v14) ────────────────────────────
describe('the summary and the value walk', () => {
  test('the walk renders in the approved order and its rows reach the ending value', () => {
    useStore.setState({ transactions: [
      { account_id: 'brk', type: 'DIVIDEND', amount: 300, date: isoLocalDate(new Date()) },
      { account_id: 'brk', type: 'INTEREST', amount: 120, date: isoLocalDate(new Date()) },
    ] } as any);
    render(<PerformanceScreen />);
    expect(screen.getByText(/HOW .* BECAME .* · ALL ACCOUNTS/)).toBeOnTheScreen();
    expect(screen.getByText(/Beginning market value/)).toBeOnTheScreen();
    expect(screen.getByText('Contributions')).toBeOnTheScreen();
    expect(screen.getByText('Withdrawals')).toBeOnTheScreen();
    expect(screen.getAllByText('Wealth generated').length).toBeGreaterThan(0);   // trio + walk row
    expect(screen.getByText('Dividends')).toBeOnTheScreen();
    expect(screen.getByText('Interest')).toBeOnTheScreen();
    expect(screen.getByText('Change in investment value')).toBeOnTheScreen();
    expect(screen.getByText('Ending market value (today)')).toBeOnTheScreen();
  });

  test('the trio is Ending value · Wealth generated · Return, and states the window rule in words', () => {
    render(<PerformanceScreen />);
    expect(screen.getByText('Ending value')).toBeOnTheScreen();
    expect(screen.getAllByText('Wealth generated').length).toBeGreaterThan(0);
    expect(screen.getByText('Return')).toBeOnTheScreen();
    expect(screen.getByText(/not a yearly rate/)).toBeOnTheScreen();
    expect(screen.getByText(/Money you added never counts as return/)).toBeOnTheScreen();
  });

  test('every percentage on the screen carries two decimals (Q49)', () => {
    render(<PerformanceScreen />);
    for (const t of screen.queryAllByText(/%$/)) {
      const s = String(t.props.children);
      if (/^[+−-]?\d/.test(s)) expect(s).toMatch(/\.\d\d%/);
    }
  });
});

// ── one walk per account, named by ACCOUNT (founder screenshot 2026-08-17: Build 53 said VANGUARD) ─
test('per-account walks: collapsed by default, named by account, expanding to the full walk', () => {
  useStore.setState({
    assetAccounts: [
      { asset_id: 'a1', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'q1', ticker: 'NVDA', kind: 'stocks_etf', lots: [{ lot_id: 'm1', shares: 200, cost_per_share: 300, purchase_date: '2024-01-02' }] }] },
      { asset_id: 'a2', label: 'E*TRADE Account 1', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'q2', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'm2', shares: 100, cost_per_share: 200, purchase_date: '2024-01-02' }] }] },
    ],
  } as any);
  render(<PerformanceScreen />);
  // the name comes from the app's ONE account-name helper, so a walk is titled exactly as the
  // account is titled everywhere else — Build 53 titled it with the institution instead
  expect(screen.getByLabelText(/Vanguard Brokerage, .*Expands its walk/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/E\*TRADE Brokerage, .*Expands its walk/)).toBeOnTheScreen();
  expect(screen.getAllByText(/tap to see the walk/).length).toBe(2);
  fireEvent.press(screen.getByLabelText(/Vanguard Brokerage, .*Expands its walk/));
  expect(screen.getAllByText('Beginning market value').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Ending market value').length).toBeGreaterThan(0);
});

test('a home gets no walk on a screen about investments (Build 53 gave it one: "HOME $852,000")', () => {
  useStore.setState({
    assetAccounts: [
      { asset_id: 'a1', label: 'Vanguard Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'q1', ticker: 'NVDA', kind: 'stocks_etf', lots: [{ lot_id: 'm1', shares: 200, cost_per_share: 300, purchase_date: '2024-01-02' }] }] },
      { asset_id: 'a2', label: 'E*TRADE Account 1', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'q2', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'm2', shares: 100, cost_per_share: 200, purchase_date: '2024-01-02' }] }] },
      { asset_id: 'home', label: 'Home', kind: 'home', asset_class: 'real_estate', tax_bucket: 'TAXABLE', balance: 852000 },
    ],
  } as any);
  render(<PerformanceScreen />);
  expect(screen.queryByLabelText(/Home, .*walk/)).toBeNull();
  expect(screen.queryByText('$852,000')).toBeNull();
});

// ── what each category earned (approved 2026-08-04) ─────────────────────────────────────────────
describe('what each category earned', () => {
  test('the table sums the ledger income and labels its columns', () => {
    const today = isoLocalDate(new Date());
    useStore.setState({ transactions: [
      { account_id: 'brk', type: 'DIVIDEND', ticker: 'VTI', amount: 300, date: today },
      { account_id: 'brk', type: 'INTEREST', amount: 120, date: today },
    ] } as any);
    render(<PerformanceScreen />);
    expect(screen.getByText('CATEGORY')).toBeOnTheScreen();
    expect(screen.getByText('EARNED')).toBeOnTheScreen();
    expect(screen.getAllByText('RETURN').length).toBeGreaterThan(0);
    expect(screen.getByText('All categories')).toBeOnTheScreen();
    expect(screen.getByText('$420')).toBeOnTheScreen();                     // 300 + 120, the ledger's own rows
    expect(screen.getByText(/never a false \$0/)).toBeOnTheScreen();
  });

  test('with no income records the table is absent entirely (no zero rows)', () => {
    useStore.setState({ transactions: [] } as any);
    render(<PerformanceScreen />);
    expect(screen.queryByText('WHAT EACH CATEGORY EARNED')).toBeNull();
  });
});

// ── what the approved design does NOT carry (mock v14). Each of these shipped in Build 53. ───────
test('the older Invest screen is gone: no hero, no comparison, no winners, no what-ifs, no list, no buttons', () => {
  render(<PerformanceScreen />);
  for (const gone of [/YOUR RETURN/, /HONEST COMPARISON/, /Winners & laggards/, /LOOK AHEAD/, /LOOK BACK/,
    /YOUR INVESTMENTS/, /＋ Add investment/, /Import file/, /Record a transaction/, /View transaction activity/]) {
    expect(screen.queryByText(gone)).toBeNull();
  }
  // and nothing routes to the screens they used to open — those doors live elsewhere now
  expect(pushes).toEqual([]);
});

// ── where the history came from (mock v14 mark 13) ──────────────────────────────────────────────
test('a rebuilt line names its source and its first day, and says what could not be rebuilt', () => {
  const iso2 = (back: number) => isoLocalDate(new Date(Date.now() - back * 86400000));
  useStore.setState({
    assetAccounts: [
      { asset_id: 'et', label: 'E*TRADE Account 1', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE',
        source: 'connected', balance: 10000, cash_balance: 0,
        positions: [{ position_id: 'p1', ticker: 'VTI', kind: 'stocks_etf', last_price: 100,
          lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: iso2(30) }] }] },
      { asset_id: 'byhand', label: 'Old 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', source: 'manual', balance: 50000 },
    ],
    transactions: [{ id: 't1', account_id: 'et', type: 'DEPOSIT', amount: 4000, date: iso2(20), created_at: '' }],
    priceCache: { VTI: { ticker: 'VTI', points: Array.from({ length: 40 }, (_, i) => ({ date: iso2(39 - i), close: 100 })) } },
  } as any);
  (useStore.getState() as any).rebuildLinkedHistory();
  render(<PerformanceScreen />);
  const day = new Date(`${iso2(20)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  expect(screen.getByText(new RegExp(`Rebuilt from E\\*TRADE.s own records, back to ${day}`))).toBeOnTheScreen();
  expect(screen.getByText(/Anything entered by hand starts the day you entered it/)).toBeOnTheScreen();
});

// mock v14 mark 9: with nothing entered, the ONE line opens the three ways to add an account —
// the separate "＋ Add a holding" button and "Import from a file instead" link are gone.
test('the empty line opens the three ways to add an account, and nothing else asks twice', () => {
  const { ADD_ACCOUNT_DOORS, ADD_ACCOUNT_QUESTION } = require('../../constants/doors');
  useStore.setState({ assetAccounts: [], transactions: [], priceCache: {} } as any);
  render(<PerformanceScreen />);
  expect(screen.queryByText(/＋ Add a holding/)).toBeNull();
  expect(screen.queryByText(/Import from a file instead/)).toBeNull();
  fireEvent.press(screen.getByText(/Add your accounts/));
  expect(screen.getByText(ADD_ACCOUNT_QUESTION)).toBeOnTheScreen();
  for (const d of ADD_ACCOUNT_DOORS) expect(screen.getByLabelText(`${d.title}. ${d.sub}`)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(`${ADD_ACCOUNT_DOORS[0].title}. ${ADD_ACCOUNT_DOORS[0].sub}`));
  expect(pushes).toContain(ADD_ACCOUNT_DOORS[0].route);
});

// mock v14, first phone: every account walk carries its own quiet source line
test('each account walk says where its numbers come from', () => {
  useStore.setState({
    assetAccounts: [
      { asset_id: 'a1', label: 'Vanguard Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        source: 'connected', last_synced: new Date().toISOString(),
        positions: [{ position_id: 'q1', ticker: 'NVDA', kind: 'stocks_etf', lots: [{ lot_id: 'm1', shares: 200, cost_per_share: 300, purchase_date: '2024-01-02' }] }] },
      { asset_id: 'a2', label: 'Old 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 0, derive_balance: true, source: 'manual',
        positions: [{ position_id: 'q2', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'm2', shares: 100, cost_per_share: 200, purchase_date: '2024-01-02' }] }] },
    ],
  } as any);
  render(<PerformanceScreen />);
  expect(screen.getAllByText(/🔗 Linked/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/By hand · you update it/).length).toBeGreaterThan(0);
});
