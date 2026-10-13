/** THE ACCOUNT PAGE, v14 (founder-approved 2026-09-25 — the SECOND phone of
 *  MoneyKeel/documents/networth-and-performance/archive/2026-09-30_moneykeel_pres_mock_performance_v14.html —
 *  dated into archive/ on 2026-09-30 when v15 went to him. These pins hold what v14 APPROVED AND BUILT, which
 *  is still what ships; v15 changes only the state where the Return refuses.)
 *
 *  Five things this pins, each one a thing the founder asked for by name:
 *   1. the header trio reads Market value · Wealth generated · Return, in that order — Income is no
 *      longer a headline figure;
 *   2. the Return is the WINDOW return at two decimals (ruling Q49), not the lifetime return on cost;
 *   3. the header Return and the walk beneath it are the SAME arithmetic — wealth generated over the
 *      money working in the window — so the two can never disagree, which is the defect v14 fixes;
 *   4. this account's own walk, line by line, reaching the ending value exactly;
 *   5. BY CATEGORY & HOLDING carries a RETURN column and a Total row, and the five record buttons
 *      became the mock's three doors with every kind of record still reachable behind them.
 *
 *  The figures are the mock's own: $52,404 became $52,704 — $120 dividends, $100 interest, $80 of
 *  price movement — which is +0.57% on the money that was working.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate, dateShown } from '../../domain/_shared/dates';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const BEGAN = '2026-07-19';                 // the daily record's first day — the walk's beginning
const TODAY = isoLocalDate(new Date());
const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** The mock's E*TRADE account: $52,704 today, made of LCTX + two bonds + a sweep balance. */
const ETRADE = {
  asset_id: 'e1', label: 'Account 1', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 52704, target_return: 0.05, source: 'connected', last_synced: new Date().toISOString(),
  cash_balance: 4000,
  positions: [
    { position_id: 'p1', ticker: 'LCTX', asset_class: 'stock_etf', last_price: 50, lots: [{ lot_id: 'l1', shares: 800, cost_per_share: 30 }] },
    { position_id: 'p2', ticker: 'KEYBANK CD 4.00%', asset_class: 'bond', last_price: 1, lots: [{ lot_id: 'l2', shares: 5704, cost_per_share: 1 }] },
    { position_id: 'p3', ticker: 'US TREASURY 4.25%', asset_class: 'bond', last_price: 1, lots: [{ lot_id: 'l3', shares: 3000, cost_per_share: 1 }] },
  ],
};
/** The record of what this account was worth on its first recorded day: $48,404 held + $4,000 cash. */
const DAY_ONE = {
  date: BEGAN, origin: 'observed', writtenAt: `${BEGAN}T21:00:00.000Z`,
  holdings: [
    { date: BEGAN, accountId: 'e1', securityKey: 'LCTX', units: 800, price: 49.625, value: 39700, currency: 'USD' },
    { date: BEGAN, accountId: 'e1', securityKey: 'KEYBANK CD 4.00%', units: 5704, price: 1, value: 5704, currency: 'USD' },
    { date: BEGAN, accountId: 'e1', securityKey: 'US TREASURY 4.25%', units: 3000, price: 1, value: 3000, currency: 'USD' },
  ],
  accounts: [{ date: BEGAN, accountId: 'e1', cash: 4000, statedTotal: 52404, typedValue: null, currency: 'USD' }],
};
const INCOME = [
  { id: 'd1', account_id: 'e1', type: 'DIVIDEND', ticker: 'LCTX', amount: 120, date: '2026-08-01' },
  { id: 'i1', account_id: 'e1', type: 'INTEREST', ticker: 'KEYBANK CD 4.00%', amount: 40, date: '2026-07-31' },
  { id: 'i2', account_id: 'e1', type: 'INTEREST', ticker: 'US TREASURY 4.25%', amount: 20, date: '2026-07-31' },
  { id: 'i3', account_id: 'e1', type: 'INTEREST', amount: 40, date: '2026-07-31' },
];

/** The window return the founder approved: wealth generated ÷ the money that was working. */
const BEGINNING = 52404, ENDING = 52704, WEALTH = ENDING - BEGINNING;
const RETURN_TEXT = `+${((WEALTH / BEGINNING) * 100).toFixed(2)}%`;   // +0.57%

function seed(extra: Record<string, unknown> = {}) {
  useStore.getState().resetAll();
  mockPushes.length = 0;
  mockParams = { id: 'e1' };
  useStore.setState({
    hideBalances: false,
    assetAccounts: [ETRADE],
    transactions: INCOME,
    invDaily: { [BEGAN]: BEGINNING, [TODAY]: ENDING },
    snapshotDays: [DAY_ONE],
    ...extra,
  } as any);
}

beforeEach(() => seed());

// ── 1 · THE HEADER TRIO ─────────────────────────────────────────────────────────────────────────
test('the trio reads Ending value · Wealth generated · Return, in that order (Performance v17 frame 2), and Income is not one of them', () => {
  render(<AccountPortfolioScreen />);
  // the first three are the trio; "Wealth generated" appears again further down, as a walk line
  const labels = screen.getAllByText(/^(Ending value|Wealth generated|Return)$/).map((n: any) => String(n.props.children));
  expect(labels.slice(0, 3)).toEqual(['Ending value', 'Wealth generated', 'Return']);
  expect(screen.queryByText('Income')).toBeNull();          // it sits with the holding that earned it
  expect(screen.getAllByText('$52,704').length).toBeGreaterThan(0);
  expect(screen.getAllByText('$300').length).toBeGreaterThan(0);
});

test('the Return carries TWO decimals (ruling Q49) and is the WINDOW return, not the return on cost', () => {
  render(<AccountPortfolioScreen />);
  expect(RETURN_TEXT).toBe('+0.57%');                        // the mock's own figure
  expect(screen.getAllByText(RETURN_TEXT).length).toBeGreaterThan(0);
  // the lifetime return on cost — LCTX cost $24,000 and is worth $40,000 — must appear NOWHERE:
  // that figure (+120.43% on a $52,704 account against $32,704 of cost) was the founder's defect.
  expect(screen.queryByText('+61.16%')).toBeNull();
  expect(screen.queryByText(/^\+\d+\.\d%$/)).toBeNull();     // never one decimal
});

test('the header Return and the walk cannot disagree — one is the other divided by the beginning', () => {
  render(<AccountPortfolioScreen />);
  // read the walk's own two figures off the screen, then check the header against THEM
  expect(screen.getByText('HOW $52,404 BECAME $52,704 · THIS ACCOUNT')).toBeOnTheScreen();
  const expected = `+${((WEALTH / BEGINNING) * 100).toFixed(2)}%`;
  // the Since segment, the SUMMARY trio and the Total row of BY CATEGORY & HOLDING all carry it
  expect(screen.getAllByText(expected).length).toBeGreaterThanOrEqual(3);
  expect(screen.getByLabelText(`Total, $52,704, return ${expected}`)).toBeOnTheScreen();
});

// ── 2 · THIS ACCOUNT'S OWN WALK ─────────────────────────────────────────────────────────────────
test('the walk names every line the mock names, in order, and its rows reach the ending value', () => {
  render(<AccountPortfolioScreen />);
  const rows = [
    `Beginning market value (${dateShown(BEGAN)})`, 'Contributions', 'Withdrawals', 'Wealth generated',
    'Dividends', 'Interest', 'Change in investment value', `Ending market value (${dateShown(TODAY)})`,
  ];
  for (const r of rows) expect(screen.getAllByText(r).length).toBeGreaterThan(0);
  expect(screen.getByText('$52,404')).toBeOnTheScreen();      // beginning
  // each figure is on the walk, and may also sit in WHAT EACH CATEGORY EARNED beneath it
  expect(screen.getAllByText('$120').length).toBeGreaterThan(0);   // dividends
  expect(screen.getAllByText('$100').length).toBeGreaterThan(0);   // interest
  expect(screen.getAllByText('$80').length).toBeGreaterThan(0);    // the residual IS the price movement
  // 120 + 100 + 80 = 300 = wealth generated, and 52,404 + 300 = 52,704 — the walk closes exactly
  expect(120 + 100 + 80).toBe(WEALTH);
  expect(BEGINNING + WEALTH).toBe(ENDING);
});

test('no daily record but activity records → the window opens the first day money moved, the beginning is worked back, and the screen names the holdings left out', () => {
  seed({ invDaily: {}, snapshotDays: [] });
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('Since Jul 31, 2026')).toBeOnTheScreen();
  // MOVED 2026-10-09 by DEC-3656: "Beginning market value (Jul 31, 2026)" $52,704 and "Your daily record does
  // not reach back to Jul 31, 2026 yet…" → no walk, and "The beginning can't be worked back: LCTX, KEYBANK CD
  // 4.00% and US TREASURY 4.25% have no price history." Hand-checked: no price series is cached for any of the
  // three, and each is held (800 × $50 = $40,000; 5,704 × $1 = $5,704; 3,000 × $1 = $3,000 — all > 0), so each
  // gain is unknown; before, each added $0 and the beginning read $52,704 − $0 − $0 moved = $52,704, too high.
  // SETTLED 2026-10-13 by DEC-5068 (replaces DEC-3656 part 2): the walk is drawn again. None of the three has a price
  // history, so each adds no gain (its value taken as unchanged): beginning $52,704 − $0 gained − $0 moved = $52,704,
  // Return "—" (no holding with a history; never 0%), and the sentence below the summary names all three.
  expect(screen.getByText('Beginning market value (Jul 31, 2026)')).toBeOnTheScreen();
  expect(screen.getByText('Wealth generated and Return do not include the gains of LCTX, KEYBANK CD 4.00% and US TREASURY 4.25%, as they have no price history.')).toBeOnTheScreen();
  expect(screen.getByText("Your daily record does not reach back to Jul 31, 2026 yet, so the beginning is worked back from today's values and each holding's price history.")).toBeOnTheScreen();
  expect(screen.queryByText(/can't be worked back/)).toBeNull();
  expect(screen.queryByText(/Day one:/)).toBeNull();
});

test('day one — no record and nothing moved → Since today, every line a real $0, and the day-one sentence (v17)', () => {
  seed({ invDaily: {}, snapshotDays: [], transactions: [] });
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('Since today')).toBeOnTheScreen();
  expect(screen.getByText('SUMMARY · SINCE TODAY')).toBeOnTheScreen();
  expect(screen.getByText(/Day one: your value is real, your return starts measuring from today/)).toBeOnTheScreen();
  // DEC-5136 (2026-10-13): one title in every state — "HOW TODAY'S VALUE STANDS" is retired
  expect(screen.getByText(/^HOW \$[\d,]+ BECAME \$[\d,]+ · THIS ACCOUNT$/)).toBeOnTheScreen();
  expect(screen.queryByText(/VALUE STANDS/)).toBeNull();
  expect(screen.getByText('Beginning market value (today)')).toBeOnTheScreen();
  expect(screen.getByText('Ending market value (today)')).toBeOnTheScreen();
  expect(screen.getByText('Every line fills in as days pass — the structure never changes.')).toBeOnTheScreen();
  expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);   // five windows and the trio's Return
});

// ── 3 · BY CATEGORY & HOLDING: the RETURN column and the Total row ──────────────────────────────
test('the holdings table carries a RETURN column beside MARKET VALUE and a Total row with both figures', () => {
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('BY CATEGORY & HOLDING')).toBeOnTheScreen();
  expect(screen.getByText('MARKET VALUE')).toBeOnTheScreen();
  // RETURN heads two tables now: WHAT EACH CATEGORY EARNED (v17) and BY CATEGORY & HOLDING (v14)
  expect(screen.getAllByText('RETURN').length).toBe(2);
  expect(screen.getByText('Total')).toBeOnTheScreen();
  expect(screen.getByLabelText(`Total, $52,704, return ${RETURN_TEXT}`)).toBeOnTheScreen();
  // a class narrower than the whole account has no measured window return of its own yet — "—",
  // never a lifetime return on cost standing in a window return column
  expect(screen.getByLabelText(/Stocks \/ Funds, \$40,000, return —/)).toBeOnTheScreen();
  // income still sits with the holding that earned it, and the account's total is said out loud
  expect(screen.getByText('Income: $120 dividends')).toBeOnTheScreen();
  expect(screen.getAllByText('$220').length).toBeGreaterThan(0);   // the account's income, said out loud
});

test('a class that IS the whole account shows the account\'s own return — the two cannot differ', () => {
  seed({
    assetAccounts: [{ ...ETRADE, cash_balance: 0, balance: 52704,
      positions: [{ position_id: 'p1', ticker: 'LCTX', asset_class: 'stock_etf', last_price: 52704, lots: [{ lot_id: 'l1', shares: 1, cost_per_share: 100 }] }] }],
  });
  render(<AccountPortfolioScreen />);
  expect(screen.getByLabelText(`Stocks / Funds, $52,704, return ${RETURN_TEXT}`)).toBeOnTheScreen();
});

test('a bond states its own yearly rate, and the column spells the period out in full', () => {
  seed({
    assetAccounts: [{
      asset_id: 'e1', label: 'KeyBank CD', institution: 'KeyBank', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      asset_class: 'bonds', balance: 5704, target_return: 0.042, source: 'connected', last_synced: new Date().toISOString(),
      face_value: 6000, coupon_rate: 0.042, maturity_date: '2028-08-24',
      positions: [{ position_id: 'p2', ticker: 'KEYBANK CD 4.00%', asset_class: 'bond', last_price: 1, lots: [{ lot_id: 'l2', shares: 5704, cost_per_share: 1 }] }],
    }],
  });
  render(<AccountPortfolioScreen />);
  expect(screen.getAllByText('4.20%/year').length).toBeGreaterThan(0);
  expect(screen.queryByText(/4\.20%\/yr\b/)).toBeNull();
});

test('a holding row still opens its own page', () => {
  render(<AccountPortfolioScreen />);
  fireEvent.press(screen.getAllByLabelText(/^LCTX · 800 shares/)[0]);
  expect(mockPushes.some((r) => r.startsWith('/holding-detail?account=e1&position=p1'))).toBe(true);
});

// ── 4 · THE THREE DOORS ─────────────────────────────────────────────────────────────────────────
test('three doors, in the mock\'s order and wording, with every kind of record still behind them', () => {
  render(<AccountPortfolioScreen />);
  const doors = screen.getAllByText(/^Add a .* ›$/).map((n: any) => String(n.props.children));
  expect(doors).toEqual([
    'Add a contribution or withdrawal ›', 'Add a dividend or interest ›', 'Add a buy or sale ›',
  ]);
  expect(screen.queryByText('RECORD ACTIVITY')).toBeNull();      // the five-button row is gone

  // door one: money in, money out, and a move between accounts
  fireEvent.press(screen.getByLabelText('Add a contribution or withdrawal for Account 1'));
  for (const k of ['deposit', 'withdraw', 'transfer']) {
    expect(screen.getByLabelText(`Record a ${k} for Account 1`)).toBeOnTheScreen();
  }
  fireEvent.press(screen.getByLabelText('Record a deposit for Account 1'));
  fireEvent.changeText(screen.getByLabelText('Amount'), '500');
  fireEvent.press(screen.getByLabelText('Save this deposit'));
  // money arriving in an investment account IS settlement cash until a purchase moves it — the one
  // recorder behind the door applies it exactly as the five buttons did
  const after = useStore.getState() as any;
  expect(after.assetAccounts[0].cash_balance).toBe(4500);
  expect(after.transactions[0].type).toBe('DEPOSIT');
  expect(after.transactions[0].amount).toBe(500);
});

test('door two records income, and door three opens the buy-or-sale flow', () => {
  render(<AccountPortfolioScreen />);
  fireEvent.press(screen.getByLabelText('Add a dividend or interest for Account 1'));
  expect(screen.getByLabelText('Record a dividend for Account 1')).toBeOnTheScreen();
  expect(screen.getByLabelText('Record a interest for Account 1')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByLabelText('Amount'), '75');
  fireEvent.press(screen.getByLabelText('Save this dividend'));
  expect((useStore.getState() as any).transactions.some((t: any) => t.type === 'DIVIDEND' && t.amount === 75)).toBe(true);

  fireEvent.press(screen.getByLabelText('Add a buy or sale for Account 1'));
  expect(mockPushes).toContain('/(tabs)/invest');
});

// ── 5 · THE TOP BAR ─────────────────────────────────────────────────────────────────────────────
test('the page carries the app\'s own top bar, with "‹ Back" where a tab screen carries Menu', () => {
  render(<AccountPortfolioScreen />);
  expect(screen.getByLabelText('Back')).toBeOnTheScreen();
  expect(screen.getByText('‹ Back')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Menu')).toBeNull();
});

// mock v14, second phone: every priced holding shows ITS OWN price move over the same window —
// the mock draws LCTX at +2.10% beside its value, with its income on the line beneath.
test('each priced holding carries its own return, and an unpriced one says nothing', () => {
  const iso = (back: number) => new Date(Date.now() - back * 86400000).toISOString().slice(0, 10);
  useStore.setState({
    assetAccounts: [{
      asset_id: 'e1', label: 'E*TRADE Account 1', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE',
      source: 'connected', balance: 52704, cash_balance: 0,
      positions: [
        { position_id: 'p1', ticker: 'LCTX', kind: 'stocks_etf', asset_class: 'stock_etf', last_price: 41.45,
          lots: [{ lot_id: 'l1', shares: 965, cost_per_share: 30, purchase_date: iso(400) }] },
        { position_id: 'p2', ticker: 'NOPRICE', kind: 'stocks_etf', asset_class: 'stock_etf', last_price: 10,
          lots: [{ lot_id: 'l2', shares: 100, cost_per_share: 9, purchase_date: iso(400) }] },
      ],
    }],
    priceCache: { LCTX: { ticker: 'LCTX', points: [{ date: iso(31), close: 40 }, { date: iso(1), close: 41.45 }] } },
    // the window this page names comes from the daily record's own first day
    invDaily: { [iso(31)]: 50000, [iso(0)]: 52704 }, transactions: [],
  } as any);
  render(<AccountPortfolioScreen />);
  // +3.625% from 40 → 41.45, to two decimals; the unpriced holding refuses rather than guesses
  expect(screen.getAllByText('+3.63%').length).toBeGreaterThan(0);
  expect(screen.getAllByText('—').length).toBeGreaterThan(0);
});
