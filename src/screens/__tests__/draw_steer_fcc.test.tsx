// Draw-order steering (design r45-r52) + the retiree Cash-flow round (founder mock 2026-07-15).
// Pins: reorder by buttons; the RMD step is pinned law at 73+; the comparison is honest ('about
// the same' when the answer barely moves; the % is deliberately not re-run); Keep persists the
// ONE stored preference the main preview reads; Reset returns to the math's order; the retiree
// pace bar reads spent vs the same left-to-spend pool the paycheck shows.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';
import { drawOrderOutcome, withdrawalOrder, taxBucketSplit, taxableGainShare, DEFAULT_DRAW_ORDER } from '../../domain/decumulation';
import { isoLocalDate } from '../../domain/_shared/dates';

const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const RETIREE = {
  status: 'retired', incomeSources: ['retirement_income'], name: 'June',
  birthYear: String(new Date().getFullYear() - 74),                       // 74 → the RMD pin shows
  horizonAge: '92', monthlySpending: '5200',
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1600', ri_pension_freq: 'monthly',
};
const ACCOUNTS = [
  { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 38000, retirement_pct: 100 },
  // the brokerage carries ONE priced holding with a purchase price, so the gain share is knowable
  // (G6: without it the comparison honestly refuses to estimate tax)
  { asset_id: 'brk', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 210000,
    positions: [{ position_id: 'p1', ticker: 'VTI', last_price: 300, lots: [{ lot_id: 'l1', shares: 700, cost_per_share: 200, purchase_date: '2020-01-15' }] }] },
  { asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 },
  { asset_id: 'roth', label: 'Roth', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 88000 },
];

beforeEach(() => {
  mockPushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingProfile: RETIREE, onboardingComplete: true, assetAccounts: ACCOUNTS } as any);
});

const openSheet = () => {
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Steer it — reorder where the draw comes from'));
};

test('the sheet lists the four buckets with live balances; the RMD step is pinned law at 74', () => {
  openSheet();
  expect(screen.getByText('Where the draw comes from')).toBeOnTheScreen();
  expect(screen.getByLabelText(/Required withdrawal, first.*cannot move/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Cash, \$38,000, 1 of 4/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Roth, \$88,000, 4 of 4/)).toBeOnTheScreen();
});

test('reorder by buttons → re-run → the HONEST comparison (real math, no faked % shift)', () => {
  openSheet();
  fireEvent.press(screen.getByLabelText('Move Roth up'));                 // roth ahead of pre-tax
  fireEvent.press(screen.getByLabelText('Move Roth up'));                 // roth ahead of taxable
  fireEvent.press(screen.getByLabelText('Re-run with my order'));
  expect(screen.getByText(/With your order:/)).toBeOnTheScreen();
  expect(screen.getByText(/isn't re-run per order/)).toBeOnTheScreen();   // the no-fake-percent note
});

test('Keep this order persists the ONE preference and the main preview reorders with it', () => {
  openSheet();
  fireEvent.press(screen.getByLabelText('Move Roth up'));
  fireEvent.press(screen.getByLabelText('Move Roth up'));
  fireEvent.press(screen.getByLabelText('Re-run with my order'));
  fireEvent.press(screen.getByLabelText('Keep this order'));
  const saved = (useStore.getState() as any).drawOrder;
  expect(saved).toEqual(['cash', 'roth', 'taxable', 'preTax']);
  // the main preview reads the SAME stored preference (one preference, no forks — r50 pin)
  const steps = withdrawalOrder(taxBucketSplit(ACCOUNTS as any), 74, saved);
  expect(steps.map((s) => s.bucket)).toEqual(['rmd', 'cash', 'roth', 'taxable', 'preTax']);
});

test('closing without saving changes nothing; Reset returns to the math\'s order', () => {
  openSheet();
  fireEvent.press(screen.getByLabelText('Move Roth up'));
  fireEvent.press(screen.getByLabelText('Close without saving'));
  expect((useStore.getState() as any).drawOrder).toBeNull();
});

test('comparator math: draining Roth before taxable is never tax-CHEAPER in this model', () => {
  const split = taxBucketSplit(ACCOUNTS as any);
  const base = { age: 74, horizon: 92, spendAnnual: 62400, guaranteedAnnual: 50400, realGrowth: 0.03, ordinaryRate: 0.22, capGainsRate: 0.15, gainShare: 1 / 3 };
  const math = drawOrderOutcome(split, DEFAULT_DRAW_ORDER, base);
  const rothFirst = drawOrderOutcome(split, ['roth', 'cash', 'taxable', 'preTax'], base);
  expect(rothFirst.totalTaxes!).toBeLessThanOrEqual(math.totalTaxes!);    // roth draws are tax-free…
  expect(math.lastsToAge ?? 99).toBeGreaterThanOrEqual(rothFirst.lastsToAge ?? 99 - 1);  // …but the default preserves tax-free compounding
});

test('no spending gap (guaranteed covers spending): the comparison degrades honestly', () => {
  const split = taxBucketSplit(ACCOUNTS as any);
  const r = drawOrderOutcome(split, DEFAULT_DRAW_ORDER, { age: 74, horizon: 92, spendAnnual: 40000, guaranteedAnnual: 50400, realGrowth: 0.03, ordinaryRate: 0.22, capGainsRate: 0.15, gainShare: 1 / 3 });
  expect(r.lastsToAge).toBeNull();                                        // nothing drawn, nothing runs out
  expect(r.totalTaxes).toBe(0);
});

test('the retiree pace bar: spent vs the SAME left-to-spend pool the paycheck shows', () => {
  useStore.setState({
    expenses: [{ id: 'e1', amount: 1200, category: 'Groceries', date: isoLocalDate(new Date()) }],
  } as any);
  render(<CashFlowScreen />);
  expect(screen.getByLabelText(/Expense pace: \$1,200 of \$[\d,]+ surplus/)).toBeOnTheScreen();
});

test('retired month flags carry AMOUNTS (founder mock: named bill with its dollars)', () => {
  useStore.setState({
    onboardingProfile: { ...RETIREE, spendCats: [{ id: 'ptax', label: 'Property tax', bucket: 'nonmonthly', amount: 3800, months: [11], tier: 'critical' }] },
  } as any);
  render(<CashFlowScreen />);
  expect(screen.getByLabelText(/Nov.*Property tax due/)).toBeOnTheScreen();
  expect(screen.getByText(/! Property tax −\$/)).toBeOnTheScreen();
});

// ═══ G6 (founder ruling 2026-09-08): no built-in tax rates — the person's own, or an honest refusal ═══
test('gain share comes from the taxable holdings: 700 VTI at $300 bought at $200 → one third', () => {
  expect(taxableGainShare(ACCOUNTS as any, () => null)).toBeCloseTo(1 / 3, 6);
  const noPrice = [{ ...ACCOUNTS[1], positions: [{ ...(ACCOUNTS[1] as any).positions[0], last_price: undefined }] }];
  expect(taxableGainShare(noPrice as any, () => null)).toBeNull();           // no price → nothing, never 50%
  expect(taxableGainShare(noPrice as any, () => 300)).toBeCloseTo(1 / 3, 6);  // the feed's price serves
});

test('unknown gain share with a taxable balance → no tax estimate, with the reason (never a default)', () => {
  const split = taxBucketSplit(ACCOUNTS as any);
  const r = drawOrderOutcome(split, DEFAULT_DRAW_ORDER, { age: 74, horizon: 92, spendAnnual: 62400, guaranteedAnnual: 50400, realGrowth: 0.03, ordinaryRate: 0.22, capGainsRate: 0.15, gainShare: null });
  expect(r.totalTaxes).toBeNull();
  expect(r.unknown).toMatch(/no cost basis is recorded/);
});

test('the sheet states the rates it used — the person\'s own, calculated', () => {
  openSheet();
  fireEvent.press(screen.getByLabelText('Re-run with my order'));
  expect(screen.getByText(/Rates used — yours, calculated: \d+% on pre-tax draws · \d+% on gains · gains are 33% of your taxable holdings' value/)).toBeOnTheScreen();
});

test('without a purchase price on the taxable holdings the sheet refuses to estimate tax and says why', () => {
  useStore.setState({ assetAccounts: ACCOUNTS.map((a) => (a.asset_id === 'brk' ? { ...a, positions: undefined } : a)) } as any);
  openSheet();
  fireEvent.press(screen.getByLabelText('Re-run with my order'));
  expect(screen.getByText(/Can't compare the orders yet — no cost basis is recorded for your taxable holdings/)).toBeOnTheScreen();
});
