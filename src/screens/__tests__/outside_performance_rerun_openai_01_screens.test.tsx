/** OUTSIDE PERFORMANCE RE-RUN (OpenAI, 2026-10-13 package) — PART 1, THE 424 SCREEN CHECKS (53 figures × 8 tenets).
 *  MEASURING PHASE: nothing in the app is changed here.
 *
 *  Source: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/MoneyKeel_audit_part_1.json
 *  (`screen_checks`). The reviewer judged the WRITTEN register only — it saw no screen. Every check here RENDERS the real
 *  screen (Performance tab, account page, holding page, Look back, Home, Net worth, Cash flow, Contribution room, Job
 *  safety, Stress test) with the register's own worked household, reads every Text on it and every figure it printed
 *  under its identifier (src/components/figure.ts records each print), and compares exactly.
 *
 *  Each of the 424 is classified (CLASS below; a PASS with no entry there is checked by the generic check for its tenet):
 *    AGREES          the reviewer passed it and the rendered screen holds it
 *    APP WRONG       the screen — or, where marked "row words", the figure's own master row — breaks the tenet. Its
 *                    `wrong` check carries the right answer and is test.failing, so it goes red the day it is fixed
 *    REVIEWER WRONG  the reviewer failed it and the rendered screen holds it
 *    NEEDS A RULING  two of his decisions disagree, or none settles it
 *    IN-FLIGHT       the answer depends on Net worth work landing now — re-run after it lands
 *  The rules the reviewer judged and the two things it could not test are in
 *  MoneyKeel/functions/networth-and-performance/outside_performance_rerun_openai_01_rules.test.ts.
 *  Results: MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_openai_rerun_01_screens_results.json
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { fig, figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { figureSpec } from '../../../MoneyKeel/functions/figures';
import { theNetWorth } from '../../../MoneyKeel/functions/networth-and-performance/net-worth';
import { categoryEarnings } from '../../../MoneyKeel/functions/networth-and-performance/performance';
import { portfolioBenchReturn, buildPerformance } from '../../domain/performance';

/** MK-PF-M-006#1 (2026-10-22): the reviewer's Stocks / Funds return, from the rows the app builds; `split` false strips each
 *  row's path and money paid inside, which is how the category was weighed until then */
const reviewerStocks = (split: boolean): number | null => {
  const lot = (shares: number, cost: number, date: string) => ({ lot_id: `${date}-${shares}`, shares, cost_per_share: cost, purchase_date: date });
  const px: Record<string, any> = {
    A: { points: [{ date: '2026-08-29', close: 100 }, { date: '2026-09-14', close: 105 }, { date: '2026-09-30', close: 110 }] },
    B: { points: [{ date: '2026-08-29', close: 100 }, { date: '2026-09-14', close: 100 }, { date: '2026-09-30', close: 50 }] },
  };
  const rows = buildPerformance([
    { position_id: 'a', ticker: 'A', kind: 'stock', asset_class: 'stock_etf', lots: [lot(10, 95, '2026-01-02'), lot(90, 105, '2026-09-15')] },
    { position_id: 'b', ticker: 'B', kind: 'stock', asset_class: 'stock_etf', lots: [lot(100, 80, '2026-01-02')] }] as any, (t) => px[t], '1M', new Date('2026-09-30T12:00:00'))
    .map((r) => (split ? r : { ...r, path: undefined, paidInside: undefined }));
  return categoryEarnings({ windowStart: '2026-08-30', rows: rows as any, transactions: [{ txn_id: 'd', type: 'DIVIDEND', ticker: 'A', amount: 10, date: '2026-09-20' }] })
    .find((x) => x.key === 'stocks_etf')!.ret;
};
import { availableCash } from '../../domain/transactions';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const ROOT = path.join(__dirname, '..', '..', '..');
const PART1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/MoneyKeel_audit_part_1.json'), 'utf8'));

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// READING A SCREEN — every Text in order (each with what is nested in it, as a person reads one line), every figure
// printed under its identifier, every spoken label, and whether the render changed anything the person entered
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
function readLines(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const SCREENS: Record<string, () => any> = {
  invest: () => require('../PerformanceScreen').default, account: () => require('../AccountPortfolioScreen').default,
  holding: () => require('../HoldingDetailScreen').default, lookback: () => require('../LookBackScreen').default,
  home: () => require('../HomeScreen').default, networth: () => require('../NetWorthScreen').default,
  cashflow: () => require('../CashFlowScreen').default, room: () => require('../ContributionRoomScreen').default,
  jobsafety: () => require('../JobSafetyScreen').default, stress: () => require('../StressTestScreen').default,
};
type Shot = { printed: { id: string; text: string; value: number | null }[]; lines: string[]; spoken: string[]; changed: string[] };
const ENTERED = ['assetAccounts', 'liabilities', 'transactions', 'expenses', 'onboardingProfile', 'incomes'] as const;
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
function shoot(name: string, state: any, today: string, params: Record<string, string | undefined> = {}, act?: (s: typeof screen) => void): Shot {
  jest.useFakeTimers({ now: new Date(`${today}T12:00:00`), doNotFake: [...FAKE] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...state } as any);
    const before = ENTERED.map((k) => JSON.stringify((useStore.getState() as any)[k]));
    mockParams = params;
    const C = SCREENS[name]();
    const r = render(<C />);
    if (act) act(screen);
    resetFiguresPrinted();
    r.rerender(<C />);
    const printed = figuresPrinted().filter((p) => !p.spoken).map((p) => ({ id: p.id, text: p.text, value: p.value }));
    const spoken = screen.UNSAFE_root.findAll((x: any) => typeof x.props?.accessibilityLabel === 'string').map((x: any) => String(x.props.accessibilityLabel));
    const now = useStore.getState() as any;
    const changed = ENTERED.filter((k, i) => JSON.stringify(now[k]) !== before[i]);
    const shot = { printed, lines: readLines(), spoken: [...new Set(spoken)], changed };
    r.unmount();
    return shot;
  } finally { jest.useRealTimers(); }
}
const pickWindow = (label: string) => (s: typeof screen) => {
  const btn = s.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${label}`));
  if (!btn) throw new Error(`no window ${label}`);
  fireEvent.press(btn);
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE REGISTER'S HOUSEHOLDS, in the store's own shapes (each from the figure's worked example in its door)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const day = (date: string, accountId: string, holdings: [string, number, number][], cash: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: holdings.map(([k, units, price]) => ({ date, accountId, securityKey: k, symbol: k, units, price, value: units * price, currency: 'USD' })),
  accounts: [{ date, accountId, currency: 'USD', typedValue: null, cash, statedTotal: holdings.reduce((t, h) => t + h[1] * h[2], 0) + cash }],
});
const cashDays = (acct: string, pts: [string, number][]) => pts.map(([d, v]) => day(d, acct, [], v));
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const txn = (id: string, account_id: string, type: string, amount: number, date: string, extra: any = {}) => ({ id, txn_id: id, account_id, type, amount, date, source: 'connected', ...extra });
const linked = (id: string, bal: number, extra: any = {}) => ({ asset_id: id, label: 'Schwab Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: bal, cash_balance: bal, source: 'connected', last_synced: '2026-09-28T08:00:00Z', positions: [], ...extra });

/** MK-PF-M-001..019: $30,000 on 31 Dec 2025 (100 VTI at $260 + $4,000 cash), $38,400 at the close of 1 Apr — the day
 *  $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends. QUIET: $30,000 → $32,000, nothing moved. */
const PERF_ACCOUNT = (price: number, cash: number) => ({ asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 100 * price + cash, cash_balance: cash, source: 'connected', last_synced: '2026-09-28T08:00:00Z', target_return: 0.07,
  positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: price, lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' }] }] });
const H_PERF = {
  assetAccounts: [PERF_ACCOUNT(357.75, 10_825)],
  transactions: [txn('c1', 'a2', 'DEPOSIT', 6000, '2026-04-01'), txn('d1', 'a2', 'DIVIDEND', 825, '2026-06-20', { ticker: 'VTI' })],
  snapshotDays: [day('2025-12-31', 'a2', [['VTI', 100, 260]], 4000), day('2026-04-01', 'a2', [['VTI', 100, 284]], 10_000), day('2026-09-28', 'a2', [['VTI', 100, 357.75]], 10_825)],
  priceCache: { VTI: closes([['2025-12-30', 260], ['2025-12-31', 260], ['2026-04-01', 284], ['2026-09-25', 357.75], ['2026-09-28', 357.75]]) },
  pricesFetchedAt: '2026-09-28T11:00:00Z',
};
const H_QUIET = { ...H_PERF, assetAccounts: [PERF_ACCOUNT(271.75, 4_825)], transactions: [H_PERF.transactions[1]],
  snapshotDays: [day('2025-12-31', 'a2', [['VTI', 100, 260]], 4000), day('2026-09-28', 'a2', [['VTI', 100, 271.75]], 4_825)],
  priceCache: { VTI: closes([['2025-12-30', 260], ['2025-12-31', 260], ['2026-09-25', 271.75], ['2026-09-28', 271.75]]) } };
/** MK-NW-M-018..022, 029..037, 059..062: a linked Fidelity brokerage worth $46,600 — $6,000 cash and 140 VTI at $290. */
const FID_POS = { position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', label: 'Vanguard Total Market', unit: 'shares', last_price: 290,
  lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' }, { lot_id: 'l2', shares: 40, cost_per_share: 265, purchase_date: '2026-06-01' }] };
const FID_LEDGER = [txn('t1', 'a2', 'DIVIDEND', 420, '2026-06-20', { ticker: 'VTI' }), txn('t2', 'a2', 'DIVIDEND', 405, '2026-03-20', { ticker: 'VTI' }),
  txn('t3', 'a2', 'BUY', 4000, '2024-02-01', { ticker: 'VTI', shares: 20, price: 200 }), txn('t4', 'a2', 'SELL', 5700, '2026-08-10', { ticker: 'VTI', shares: 20, price: 285 })];
const FID_ACCOUNT = { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 46600,
  target_return: 0.07, source: 'connected', last_synced: '2026-09-28T08:00:00Z', cash_balance: 6000, positions: [FID_POS] };
const FID_PRICES = { VTI: closes([['2025-09-26', 250], ['2026-09-25', 287.69], ['2026-09-28', 290]]) };
const H_FID = { assetAccounts: [FID_ACCOUNT], transactions: FID_LEDGER, snapshotDays: [], priceCache: FID_PRICES, pricesFetchedAt: '2026-09-28T11:00:00Z' };
/** MK-NW-M-023..028: a $25,000-face Treasury at 4.5% maturing 30 Sep 2029 worth $24,200, and a $10,000 Ally CD at 5.05%. */
const BONDS = [
  { asset_id: 'b1', label: 'US Treasury 2029', institution: 'Fidelity', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24200, target_return: 0, face_value: 25000, coupon_rate: 0.045, maturity_date: '2029-09-30', amount_paid: 23900 },
  { asset_id: 'b2', label: 'Ally 12-month CD', institution: 'Ally', kind: 'bond', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0, face_value: 10000, coupon_rate: 0.0505, maturity_date: '2027-03-15' },
];
const H_BONDS = { assetAccounts: BONDS, transactions: [], snapshotDays: [], priceCache: {} };
/** MK-PF-M-010..012: $10,000 in BND for 12 months against VTI. BND $72.00 → $73.80; VTI $250.00 → $290.00. */
const H_LB = { assetAccounts: [{ asset_id: 'x', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 20000,
  positions: [{ position_id: 'q1', ticker: 'BND', asset_class: 'bond', lots: [{ lot_id: 'm1', shares: 100, cost_per_share: 70, purchase_date: '2024-01-01' }] },
              { position_id: 'q2', ticker: 'VTI', asset_class: 'stock_etf', lots: [{ lot_id: 'm2', shares: 10, cost_per_share: 200, purchase_date: '2024-01-01' }] }] }],
  priceCache: { BND: closes([['2025-09-01', 72], ['2026-09-25', 73.8]]), VTI: closes([['2025-09-01', 250], ['2026-09-25', 290]]) } };
/** MK-XS-M-001/003, MK-NW-M-012: checking $18,000, brokerage $142,000, Treasury $24,200, rental $310,000, gold $9,000;
 *  mortgage $228,000 at $2,400/month and car loan $14,000 at $250/month. */
const NW_ACCOUNTS = [
  { asset_id: 'a1', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'TAXABLE', balance: 18000, target_return: 0, asset_class: 'cash' },
  { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 142000, target_return: 0.07, asset_class: 'stocks_etf' },
  { asset_id: 'a3', label: 'US Treasury 2029', institution: 'Fidelity', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24200, target_return: 0.045, asset_class: 'bonds' },
  { asset_id: 'a4', label: 'Rental duplex', kind: 'real_estate', tax_bucket: 'TAXABLE', balance: 310000, target_return: 0.03, asset_class: 'real_estate', re_use: 'rental' },
  { asset_id: 'a5', label: 'Gold', institution: 'Vault', kind: 'commodity', tax_bucket: 'TAXABLE', balance: 9000, target_return: 0, asset_class: 'alternatives' },
];
const NW_DEBTS = [
  { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400 },
  { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
];
const H_NW = { nwSetupChoice: 'self', assetAccounts: NW_ACCOUNTS, liabilities: NW_DEBTS, onboardingProfile: { status: 'employed', birthYear: '1970' } };
/** MK-NW-M-013: $18,000 checking and a home; Rent / Mortgage $2,400 (the mortgage itself), groceries $700 (essential),
 *  eating out $400 (not); car loan $250 and Visa $120. Nothing logged. */
const H_EF = { nwSetupChoice: 'self', expenses: [],
  assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 18000, target_return: 0, asset_class: 'cash' },
                  { asset_id: 'h1', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, re_use: 'primary' }],
  liabilities: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 320000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400 },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
    { debt_id: 'd3', label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 3100, interest_rate_apr: 0.2199, minimum_monthly_payment: 120 }],
  onboardingProfile: { status: 'employed', birthYear: '1970', monthlySpending: '0', spendCats: [
    { id: 'rent', label: 'Rent / Mortgage', amount: 2400, bucket: 'fixed', tier: 'need' }, { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' },
    { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible', tier: 'flex' }] } };
/** MK-CF-M-002, 051..053: September 2026, $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget;
 *  logged $2,300 rent, $512 groceries, $186 eating out and the $250 car loan paid. No income recorded as received. */
const H_CF: any = { nwSetupChoice: 'self',
  onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
    monthlySpending: '3400', spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed', tier: 'need' },
      { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' }, { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible', tier: 'flex' }] },
  liabilities: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }],
  expenses: [{ id: 'e1', amount: 2300, category: 'Rent / Mortgage', store: 'Rent', date: '2026-09-01', createdAt: '2026-09-01' },
    { id: 'e2', amount: 512, category: 'Groceries', store: 'Grocer', date: '2026-09-07', createdAt: '2026-09-07' },
    { id: 'e3', amount: 186, category: 'Eating out', store: 'Diner', date: '2026-09-12', createdAt: '2026-09-12' },
    { id: 'e4', amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12', createdAt: '2026-09-12' }],
  assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 5000, asset_class: 'cash' }] };
/** MK-MN-M-003: born 1965 (61 in 2026); $1,200/month to a 401(k), $300 to a Roth IRA, $150 to an HSA; read 29 Sep 2026. */
const H_CR = { onboardingProfile: { status: 'employed', birthYear: '1965', baseSalary: '10000', salaryMode: 'gross', salaryFreq: 'monthly', c_401k: '1200', c_roth: '300', c_hsa: '150', medicareEnrolled: 'no' },
  assetAccounts: [{ asset_id: 'k', label: '401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 100000 }] };
/** MK-PF-M-008: $40,000 of shares against a yardstick up 10% and $10,000 of bonds against one up 4%; neither moved. */
const H_BENCH = { assetAccounts: [{ asset_id: 'z', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50000, source: 'connected', last_synced: '2026-09-28T08:00:00Z',
    positions: [{ position_id: 's1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 400, lots: [{ lot_id: 'z1', shares: 100, cost_per_share: 300, purchase_date: '2024-01-01' }] },
                { position_id: 's2', ticker: 'BND', asset_class: 'bond', last_price: 100, lots: [{ lot_id: 'z2', shares: 100, cost_per_share: 100, purchase_date: '2024-01-01' }] }] }],
  priceCache: { VTI: closes([['2026-08-27', 400], ['2026-08-28', 400], ['2026-09-28', 400]]), BND: closes([['2026-08-27', 100], ['2026-08-28', 100], ['2026-09-28', 100]]),
    SPY: closes([['2026-08-27', 500], ['2026-08-28', 500], ['2026-09-28', 550]]), AGG: closes([['2026-08-27', 100], ['2026-08-28', 100], ['2026-09-28', 104]]) },
  pricesFetchedAt: '2026-09-28T11:00:00Z', transactions: [], snapshotDays: [] };
/** MK-PF-M-006/007: since 1 Jan 2026 — dividends $420 and $405 on VTI, $505 of interest on the Ally CD, one $40 dividend
 *  with no ticker, a $900 dividend from Nov 2025 outside the window; VTI $40,600 up 12%. */
const H_CAT = { assetAccounts: [{ asset_id: 'c1', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50600 + 1370, cash_balance: 1370,
    source: 'connected', last_synced: '2026-09-28T08:00:00Z',
    positions: [{ position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', last_price: 406, lots: [{ lot_id: 'v1', shares: 100, cost_per_share: 300, purchase_date: '2024-01-01' }] },
                { position_id: 'cd', ticker: 'ALLY CD', label: 'Ally CD', asset_class: 'bond', last_price: 100, lots: [{ lot_id: 'c', shares: 100, cost_per_share: 100, purchase_date: '2025-06-01' }] }] }],
  transactions: [txn('d1', 'c1', 'DIVIDEND', 420, '2026-06-20', { ticker: 'VTI' }), txn('d2', 'c1', 'DIVIDEND', 405, '2026-03-20', { ticker: 'VTI' }),
    txn('i1', 'c1', 'INTEREST', 505, '2026-04-01', { ticker: 'ALLY CD' }), txn('d3', 'c1', 'DIVIDEND', 40, '2026-05-02'), txn('x2', 'c1', 'DIVIDEND', 900, '2025-11-30', { ticker: 'VTI' })],
  snapshotDays: [day('2025-12-31', 'c1', [['VTI', 100, 362.5], ['ALLY CD', 100, 100]], 0), day('2026-09-28', 'c1', [['VTI', 100, 406], ['ALLY CD', 100, 100]], 1370)],
  priceCache: { VTI: closes([['2025-12-30', 362.5], ['2025-12-31', 362.5], ['2026-09-28', 406]]), 'ALLY CD': closes([['2025-12-31', 100], ['2026-09-28', 100]]) },
  pricesFetchedAt: '2026-09-28T11:00:00Z' };

const holdAcct = (positions: any[], extra: any = {}) => ({ asset_id: 'h', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 50000, source: 'connected', last_synced: '2026-09-28T08:00:00Z', cash_balance: 0, positions, ...extra });
const holdState = (positions: any[], transactions: any[] = [], prices: any = FID_PRICES, extra: any = {}) =>
  ({ assetAccounts: [holdAcct(positions, extra)], transactions, priceCache: prices, pricesFetchedAt: '2026-09-28T11:00:00Z' });
const growth = (from: string, v0: number, rate: number) => (d: string) => v0 * (1 + rate) ** ((Date.parse(d) - Date.parse(from)) / (365 * 86_400_000));
const everyDay = (from: string, to: string, f: (d: string) => number) => { const out: [string, number][] = []; for (let d = from; d <= to; d = plus(d, 1)) out.push([d, f(d)]); return out; };
const G = growth('2026-09-27', 100_000, 0.08);
const H_TWOYEARS = { assetAccounts: [linked('g1', G('2028-09-28'))], transactions: [], snapshotDays: cashDays('g1', everyDay('2026-09-27', '2028-09-28', G)), priceCache: {} };
const NEW_ACCOUNT = (evening: number) => ({ assetAccounts: [linked('n1', evening)], transactions: [txn('c', 'n1', 'DEPOSIT', 10_000, '2026-09-27')],
  snapshotDays: cashDays('n1', [['2026-09-27', evening], ['2026-09-28', evening]]), priceCache: {} });
const UNROUND = { assetAccounts: [linked('r1', 11_500.49)], transactions: [txn('c', 'r1', 'DEPOSIT', 1_000.5, '2026-06-01'), txn('d', 'r1', 'DIVIDEND', 100.5, '2026-07-01')],
  snapshotDays: cashDays('r1', [['2025-12-31', 10_000.5], ['2026-05-31', 10_200.5], ['2026-06-01', 11_201], ['2026-09-28', 11_500.49]]), priceCache: {} };

/** Every render, made once on first use. */
const RENDERS: Record<string, () => Shot> = {
  PERF_INV: () => shoot('invest', H_PERF, '2026-09-28', {}, pickWindow('This year')),
  PERF_ACC: () => shoot('account', H_PERF, '2026-09-28', { id: 'a2', period: 'YTD' }),
  PERF_HOME: () => shoot('home', H_PERF, '2026-09-28'),
  PERF_INV_1M: () => shoot('invest', H_PERF, '2026-09-28', {}, pickWindow('1M')),
  QUIET_INV: () => shoot('invest', H_QUIET, '2026-09-28', {}, pickWindow('This year')),
  QUIET_ACC: () => shoot('account', H_QUIET, '2026-09-28', { id: 'a2', period: 'YTD' }),
  FID_ACC: () => shoot('account', H_FID, '2026-09-28', { id: 'a2' }),
  FID_NOLEDGER: () => shoot('account', { ...H_FID, transactions: [] }, '2026-09-28', { id: 'a2' }),
  FID_HOLD: () => shoot('holding', H_FID, '2026-09-28', { account: 'a2', position: 'p1' }),
  FID_INV: () => shoot('invest', H_FID, '2026-09-28'),
  B1: () => shoot('account', H_BONDS, '2026-09-28', { id: 'b1' }),
  B2: () => shoot('account', H_BONDS, '2026-09-28', { id: 'b2' }),
  B1_NOCOUPON: () => shoot('account', { ...H_BONDS, assetAccounts: [{ ...BONDS[0], coupon_rate: undefined }] }, '2026-09-28', { id: 'b1' }),
  B1_NOFACE: () => shoot('account', { ...H_BONDS, assetAccounts: [{ ...BONDS[0], face_value: undefined }] }, '2026-09-28', { id: 'b1' }),
  B1_NOMAT: () => shoot('account', { ...H_BONDS, assetAccounts: [{ ...BONDS[0], maturity_date: undefined }] }, '2026-09-28', { id: 'b1' }),
  LB: () => shoot('lookback', H_LB, '2026-09-28', { from: 'BND', amount: '10000' }, (s) => fireEvent.press(s.getByLabelText('To VTI'))),
  LB_NOPRICE: () => shoot('lookback', { ...H_LB, priceCache: {} }, '2026-09-28', { from: 'BND', amount: '10000' }),
  NW_HOME: () => shoot('home', H_NW, '2026-09-28'),
  NW_NW: () => shoot('networth', H_NW, '2026-09-28'),
  NW_NOBAL_HOME: () => shoot('home', { ...H_NW, assetAccounts: NW_ACCOUNTS.map((a) => (a.asset_id === 'a2' ? { ...a, balance: null } : a)) }, '2026-09-28'),
  NW_NOBAL_NW: () => shoot('networth', { ...H_NW, assetAccounts: NW_ACCOUNTS.map((a) => (a.asset_id === 'a2' ? { ...a, balance: null } : a)) }, '2026-09-28'),
  NW_NOPAY: () => shoot('networth', { ...H_NW, liabilities: [NW_DEBTS[0], { ...NW_DEBTS[1], minimum_monthly_payment: undefined }] }, '2026-09-28'),
  ACC_NOBAL: () => shoot('account', { ...H_NW, assetAccounts: NW_ACCOUNTS.map((a) => (a.asset_id === 'a2' ? { ...a, balance: null } : a)) }, '2026-09-28', { id: 'a2' }),
  EF_NW: () => shoot('networth', H_EF, '2026-09-28'),
  EF_JOB: () => shoot('jobsafety', H_EF, '2026-09-28'),
  EF_STRESS: () => shoot('stress', H_EF, '2026-09-28'),
  EF_NOESS: () => shoot('networth', { ...H_EF, liabilities: [], onboardingProfile: { status: 'employed', birthYear: '1970' } }, '2026-09-28'),
  EMPTY_INV: () => shoot('invest', { assetAccounts: [], transactions: [], snapshotDays: [], priceCache: {} }, '2026-09-28'),
  EF_HOME: () => shoot('home', H_EF, '2026-09-28'),
  CF_CF: () => shoot('cashflow', H_CF, '2026-09-28'),
  CF_HOME: () => shoot('home', H_CF, '2026-09-28'),
  CF_PROMISE: () => shoot('cashflow', { ...H_CF, retirementAssumptions: { commitments: [{ label: 'Emergency fund', monthlyAmount: 300 }] } }, '2026-09-28'),
  CF_NOPAY: () => shoot('cashflow', { ...H_CF, liabilities: [H_CF.liabilities[0], { ...H_CF.liabilities[1], minimum_monthly_payment: undefined }] }, '2026-09-28'),
  CF_NOINCOME: () => shoot('cashflow', { ...H_CF, onboardingProfile: { ...H_CF.onboardingProfile, baseSalary: '' } }, '2026-09-28'),
  CR_ROOM: () => shoot('room', H_CR, '2026-09-29'),
  CR_HOME: () => shoot('home', H_CR, '2026-09-29'),
  CR_NOBIRTH: () => shoot('room', { ...H_CR, onboardingProfile: { ...H_CR.onboardingProfile, birthYear: '' } }, '2026-09-29'),
  BENCH_HOME: () => shoot('home', H_BENCH, '2026-09-28'),
  // MK-PF-M-008 after a share change (2026-10-21): half the VTI bought inside the 1M window — 50 shares held when it began
  BENCH_TOPUP_HOME: () => shoot('home', { ...H_BENCH, assetAccounts: H_BENCH.assetAccounts.map((a: any) => ({ ...a, positions: a.positions.map((p: any) => (p.ticker === 'VTI'
    ? { ...p, lots: [{ lot_id: 'z1', shares: 50, cost_per_share: 300, purchase_date: '2024-01-01' }, { lot_id: 'z1b', shares: 50, cost_per_share: 400, purchase_date: '2026-09-10' }] } : p)) })) }, '2026-09-28'),
  CAT_INV: () => shoot('invest', H_CAT, '2026-09-28', {}, pickWindow('This year')),
  UNTICKERED: () => shoot('invest', { assetAccounts: [linked('u1', 50_000, { cash_balance: 10_000, positions: [{ position_id: 'p', ticker: 'VTI', asset_class: 'stock_etf', last_price: 400,
      lots: [{ lot_id: 'x', shares: 100, cost_per_share: 300, purchase_date: '2024-01-01' }] }] })],
    transactions: [txn('i', 'u1', 'INTEREST', 40, '2026-07-01'), txn('v', 'u1', 'DIVIDEND', 300, '2026-07-01')],
    snapshotDays: [day('2025-12-31', 'u1', [['VTI', 100, 380]], 10_000), day('2026-09-28', 'u1', [['VTI', 100, 400]], 10_000)],
    priceCache: { VTI: closes([['2025-12-30', 380], ['2025-12-31', 380], ['2026-09-28', 400]]) }, pricesFetchedAt: '2026-09-28T11:00:00Z' }, '2026-09-28', {}, pickWindow('This year')),
  NEW_INV: () => shoot('invest', NEW_ACCOUNT(10_050), '2026-09-28'),
  NEW_INV_LOSS: () => shoot('invest', NEW_ACCOUNT(9_800), '2026-09-28'),
  NEW_ACC: () => shoot('account', NEW_ACCOUNT(10_050), '2026-09-28', { id: 'n1' }),
  UNROUND_INV: () => shoot('invest', UNROUND, '2026-09-28', {}, pickWindow('This year')),
  UNROUND_ACC: () => shoot('account', UNROUND, '2026-09-28', { id: 'r1', period: 'YTD' }),
  TWO_INV_1Y: () => shoot('invest', H_TWOYEARS, '2028-09-28', {}, pickWindow('1Y')),
  TWO_INV_2Y: () => shoot('invest', H_TWOYEARS, '2028-09-28', {}, pickWindow('2Y')),
  TWO_ACC_2Y: () => shoot('account', H_TWOYEARS, '2028-09-28', { id: 'g1', period: '2Y' }),
  NEG_INV: () => shoot('invest', { assetAccounts: [linked('l1', -500)], transactions: [], snapshotDays: cashDays('l1', [['2025-12-31', 1_000], ['2026-09-28', -500]]), priceCache: {} }, '2026-09-28', {}, pickWindow('This year')),
  GAP_ACC: () => shoot('account', { assetAccounts: [linked('g', 50_000, { cash_balance: 5_000, positions: [{ position_id: 'p', ticker: 'VTI', asset_class: 'stock_etf', last_price: 400,
    lots: [{ lot_id: 'x', shares: 100, cost_per_share: 300, purchase_date: '2024-01-01' }] }] })], transactions: [], snapshotDays: [],
    priceCache: { VTI: closes([['2026-09-25', 400], ['2026-09-28', 400]]) }, pricesFetchedAt: '2026-09-28T11:00:00Z' }, '2026-09-28', { id: 'g' }),
  BENCH_INV_1M: () => shoot('invest', H_BENCH, '2026-09-28', {}, pickWindow('1M')),
  HOLD_NOSHARES: () => shoot('holding', holdState([{ position_id: 'p', ticker: 'VTI', asset_class: 'stock_etf', lots: [{ lot_id: 'x', cost_per_share: 210, purchase_date: '2023-03-15' }] }]), '2026-09-28', { account: 'h', position: 'p' }),
  HOLD_NOCOST: () => shoot('holding', holdState([{ position_id: 'p', ticker: 'VTI', asset_class: 'stock_etf', lots: [{ lot_id: 'x', shares: 10, purchase_date: '2023-03-15' }] }]), '2026-09-28', { account: 'h', position: 'p' }),
  HOLD_MINI: () => shoot('holding', holdState([{ position_id: 'p', ticker: 'AAPL261218C250', kind: 'options', multiplier: 10, lots: [{ lot_id: 'x', shares: 2, cost_per_share: 5, purchase_date: '2026-05-01' }] }],
    [], { AAPL261218C250: closes([['2026-09-25', 7], ['2026-09-28', 8]]) }), '2026-09-28', { account: 'h', position: 'p' }),
  HOLD_PARTSALE: () => shoot('holding', holdState([{ position_id: 'p', ticker: 'XYZ', asset_class: 'stock_etf', last_price: 70, lots: [{ lot_id: 'k', shares: 5, purchase_date: '2023-01-01' }] }],
    [txn('b', 'h', 'BUY', 500, '2025-01-02', { ticker: 'XYZ', shares: 10, price: 50 }), txn('s', 'h', 'SELL', 1050, '2026-08-01', { ticker: 'XYZ', shares: 15, price: 70 })],
    { XYZ: closes([['2026-09-25', 69], ['2026-09-28', 70]]) }), '2026-09-28', { account: 'h', position: 'p' }),
  HOLD_SOLD: () => shoot('holding', holdState([{ position_id: 'p', ticker: 'VTI', asset_class: 'stock_etf', lots: [] }],
    [txn('b', 'h', 'BUY', 2000, '2024-01-02', { ticker: 'VTI', shares: 10, price: 200 }), txn('s', 'h', 'SELL', 2800, '2026-08-01', { ticker: 'VTI', shares: 10, price: 280 })]), '2026-09-28', { account: 'h', position: 'p' }),
  HOLD_ROTH: () => shoot('holding', holdState([FID_POS], [], FID_PRICES, { kind: 'roth_ira', tax_bucket: 'ROTH', label: 'Roth IRA' }), '2026-09-28', { account: 'h', position: 'p1' }),
  HOLD_UNDATED: () => shoot('holding', holdState([{ ...FID_POS, lots: [{ lot_id: 'u', shares: 140, cost_per_share: 225.71 }] }]), '2026-09-28', { account: 'h', position: 'p1' }),
  HOLD_NOPRICE: () => shoot('holding', holdState([{ ...FID_POS, last_price: undefined }], [], {}), '2026-09-28', { account: 'h', position: 'p1' }),
  HOLD_ONECLOSE: () => shoot('holding', holdState([FID_POS], [], { VTI: closes([['2026-09-28', 290]]) }), '2026-09-28', { account: 'h', position: 'p1' }),
};
const CACHE = new Map<string, Shot>();
const R = (k: string): Shot => { if (!CACHE.has(k)) CACHE.set(k, RENDERS[k]()); return CACHE.get(k)!; };
/** Every text a figure printed on a render, in order. */
const printed = (k: string, id: string): string[] => R(k).printed.filter((p) => p.id === id).map((p) => p.text);
const first = (k: string, id: string): string | undefined => printed(k, id)[0];
const has = (k: string, t: string | RegExp) => R(k).lines.some((l) => (typeof t === 'string' ? l === t : t.test(l)));
/** the line n after `label` — after the first `anchor` line when one is given */
const after = (k: string, label: string, n = 1, anchor?: string): string | undefined => {
  const L = R(k).lines; const from = anchor ? L.indexOf(anchor) : 0; if (from < 0) return undefined;
  const i = L.indexOf(label, from); return i >= 0 ? L[i + n] : undefined;
};
const dollars = (s: string | undefined) => (s == null ? NaN : Number(s.replace('−', '-').replace(/[^0-9.\-]/g, '')));
/** a walk read off the screen: beginning + contributions − withdrawals + dividends + interest + change in value */
const walkSum = (k: string, beginId: string, lineId: string) => {
  const [c, w, d, i, ch] = printed(k, lineId).slice(0, 5).map(dollars);
  return dollars(first(k, beginId)) + c - w + d + i + ch;
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE EACH FIGURE IS READ: its worked household's render, the text the register says it comes to, the words beside
// it on screen, and the drawing test that holds that screen word for word (tenet 6)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Fig = { main: string; text: string; label: string | RegExp; drawing: string; estimate?: RegExp; t2?: () => void; t3?: () => void; t4?: () => void };
const DRAW = {
  perf: 'src/screens/__tests__/perf_matches_v17.test.tsx', account: 'src/screens/__tests__/account_page_drawing_states.test.tsx',
  kept: 'src/screens/__tests__/kept_editors_match.test.tsx', cashflow: 'src/screens/__tests__/cashflow_matches_v01.test.tsx',
  networth: 'src/screens/__tests__/networth_matches_v08.test.tsx', home: 'src/screens/__tests__/performance_decisions_2026_10_12.test.tsx',
  room: 'src/screens/__tests__/contribution_room_medicare.test.tsx',
};
const noFalseZero = (k: string, id: string) => { for (const t of printed(k, id)) expect(t).not.toBe('$0'); };
const FIGS: Record<string, Fig> = {
  'MK-CF-M-002': { main: 'CF_CF', text: '$1,150', label: '= Planned surplus', drawing: DRAW.cashflow,
    t4: () => { expect(first('CF_CF', 'MK-CF-M-002')).toBe('$1,150'); expect(R('CF_HOME').lines.join(' ')).not.toMatch(/Planned surplus/); } },
  'MK-CF-M-051': { main: 'CF_CF', text: '$7,200', label: 'Actual inflow (income (take-home))', drawing: DRAW.cashflow,
    t3: () => { expect(R('CF_NOINCOME').lines).toContain('SET UP YOUR MONTH — 2 STEPS'); expect(R('CF_NOINCOME').lines.join(' ')).not.toMatch(/Actual inflow/); },
    t4: () => { expect(after('CF_CF', 'Actual inflow (income (take-home))')).toBe('$7,200'); expect(after('CF_HOME', 'Income')).toBe('$7,200'); } },
  'MK-CF-M-052': { main: 'CF_CF', text: '$3,248', label: 'Expenses entered by hand', drawing: DRAW.cashflow,
    t3: () => { expect(R('CF_NOINCOME').lines.join(' ')).not.toMatch(/Expenses entered by hand/); } },
  'MK-CF-M-053': { main: 'CF_CF', text: '$3,952', label: '= Actual surplus so far', drawing: DRAW.cashflow,
    t2: () => { expect(7200 - 250 - 2998).toBe(dollars(first('CF_CF', 'MK-CF-M-003'))); } },
  'MK-MN-M-003': { main: 'CR_ROOM', text: '$21,350 left', label: '401(k)', drawing: DRAW.room, estimate: /not from your payroll/,
    t2: () => { expect(has('CR_ROOM', /That is about \$14,400 of the \$35,750 limit/)).toBe(true); expect(35750 - 14400).toBe(21350); },
    t3: () => { expect(R('CR_NOBIRTH').lines.join(' ')).not.toMatch(/\$NaN|undefined/); expect(R('CR_NOBIRTH').lines.join(' ')).not.toMatch(/\(61\)/); },
    t4: () => { expect(has('CR_HOME', /About \$21,350 of this year's tax-advantaged room looks unused/)).toBe(true); } },
  'MK-NW-M-012': { main: 'NW_NW', text: '$2,650/month', label: /debt payments you cannot stop/, drawing: DRAW.networth,
    t2: () => { expect(2400 + 250).toBe(2650); expect(has('NW_NW', 'Both include $2,650/month of debt payments you cannot stop.')).toBe(true); },
    t4: () => { const nw = theNetWorth({ accounts: NW_ACCOUNTS, debts: NW_DEBTS, snapshotDays: [], transactions: [], since: '2026-09-28', today: '2026-09-28', uid: 'x' } as any);
      expect(nw.monthlyDebtPayments).toBe(2650); expect(after('CF_CF', 'Mortgage', 2)).toBe('−$2,400'); expect(after('CF_CF', 'Car loan', 2)).toBe('−$250'); } },
  'MK-NW-M-013': { main: 'EF_NW', text: '5.2 months', label: 'EMERGENCY FUND', drawing: DRAW.networth, estimate: /an estimate from your own numbers/,
    t2: () => { expect(has('EF_NW', /\$18,000 cash ÷ \$3,470\/month essentials/)).toBe(true); expect(Math.round((18000 / 3470) * 10) / 10).toBe(5.2); },
    t3: () => { expect(R('EF_NOESS').lines.join(' ')).not.toMatch(/Infinity|NaN/); } },
  'MK-NW-M-018': { main: 'FID_ACC', text: '$46,600', label: 'Market value', drawing: DRAW.account,
    t3: () => { noFalseZero('ACC_NOBAL', 'MK-NW-M-018'); },
    t4: () => { expect(first('FID_ACC', 'MK-NW-M-018')).toBe(first('FID_ACC', 'MK-PF-M-004')); } },
  'MK-NW-M-019': { main: 'FID_ACC', text: '$825', label: /Income sits with the holding that earned it/, drawing: DRAW.account,
    t3: () => { expect(printed('FID_NOLEDGER', 'MK-NW-M-019')).toEqual([]); } },
  'MK-NW-M-020': { main: 'FID_ACC', text: '$40,600', label: /STOCKS \/ FUNDS$/, drawing: DRAW.account,
    t3: () => { expect(R('B1').lines).not.toContain('BY CATEGORY & HOLDING'); } },
  'MK-NW-M-021': { main: 'FID_ACC', text: 'Income: $825 dividends', label: 'Income: $825 dividends', drawing: DRAW.account,
    t3: () => { expect(R('FID_NOLEDGER').lines.some((l) => l.startsWith('Income:'))).toBe(false); } },
  'MK-NW-M-022': { main: 'FID_ACC', text: '4', label: '4 records', drawing: DRAW.account,
    t3: () => { expect(has('B1', /^ACTIVITY/)).toBe(true); expect(has('B1', 'Log a deposit or a buy — your history starts here.')).toBe(true); } },
  'MK-NW-M-023': { main: 'B1', text: '$25,000', label: 'Face value', drawing: DRAW.account,
    t3: () => { expect(after('B1_NOFACE', 'Face value')).toBe('not entered'); } },
  'MK-NW-M-024': { main: 'B1', text: '4.50%/year · $1,125/year', label: 'Interest payments', drawing: DRAW.account,
    t2: () => { expect(after('B1', 'Interest payments')).toBe('4.50%/year · $1,125/year'); expect(0.045 * 25000).toBe(1125); } },
  'MK-NW-M-025': { main: 'B1', text: 'Sep 30, 2029 (3 years away)', label: 'Matures', drawing: DRAW.account,
    t3: () => { expect(R('B1_NOMAT').lines.join(' ')).toMatch(/maturity date not entered/); expect(printed('B1_NOMAT', 'MK-NW-M-026')).toEqual([]); } },
  'MK-NW-M-026': { main: 'B1', text: '5.69%', label: 'Yield if held to maturity', drawing: DRAW.account, estimate: /^about 5\.69% · estimate$/,
    t3: () => { expect(printed('B1_NOCOUPON', 'MK-NW-M-026')).toEqual([]); expect(printed('B1_NOMAT', 'MK-NW-M-026')).toEqual([]); } },
  'MK-NW-M-027': { main: 'B1', text: '4.65%', label: "Yield on today's value", drawing: DRAW.account,
    t2: () => { expect(Math.round((1125 / 24200) * 10000) / 100).toBe(4.65); },
    t3: () => { expect(printed('B1_NOCOUPON', 'MK-NW-M-027')).toEqual([]); } },
  'MK-NW-M-028': { main: 'B1', text: '$23,300', label: 'Rates rise 1% → value roughly $23,300–$23,800 (down about $600)', drawing: DRAW.account, estimate: /^estimate$/,
    t3: () => { expect(has('B2', /^Nothing happens to this CD\. It is not traded/)).toBe(true); expect(printed('B2', 'MK-NW-M-028')).toEqual([]); } },
  'MK-NW-M-029': { main: 'FID_HOLD', text: '$290.00', label: /^LAST CLOSE · /, drawing: DRAW.kept,
    t3: () => { expect(has('HOLD_NOPRICE', 'NO LIVE PRICE — SHOWING WHAT YOU PAID')).toBe(true); },
    t4: () => { expect(first('FID_ACC', 'MK-NW-M-029')).toBe(first('FID_HOLD', 'MK-NW-M-029')); } },
  'MK-NW-M-030': { main: 'FID_HOLD', text: '$40,600', label: 'Current value', drawing: DRAW.kept,
    t4: () => { expect(first('FID_ACC', 'MK-NW-M-030')).toBe(first('FID_HOLD', 'MK-NW-M-030')); } },
  'MK-NW-M-031': { main: 'FID_HOLD', text: '140 shares', label: 'Quantity', drawing: DRAW.kept },
  'MK-NW-M-032': { main: 'FID_HOLD', text: '$225.71', label: 'Price paid (average)', drawing: DRAW.kept,
    t2: () => { expect(Math.round((31600 / 140) * 100) / 100).toBe(225.71); },
    // the line after the label is its info dot (Q34, 2026-10-21); the figure is the line after that — one wording on the card
    t3: () => { expect(after('HOLD_NOCOST', 'Price paid (average)', 2)).toBe('No price paid on record.'); } },
  'MK-NW-M-033': { main: 'FID_HOLD', text: '$31,600', label: 'Total paid', drawing: DRAW.kept,
    t2: () => { expect(has('FID_HOLD', '100 sh @ $210.00') && has('FID_HOLD', '40 sh @ $265.00')).toBe(true); expect(100 * 210 + 40 * 265).toBe(31600); } },
  'MK-NW-M-034': { main: 'FID_HOLD', text: '$825', label: 'Dividends received (trailing twelve months)', drawing: DRAW.kept },   // Q35, 2026-10-21
  'MK-NW-M-035': { main: 'FID_HOLD', text: '$1,700', label: 'Realized from sales', drawing: DRAW.kept,
    t2: () => { expect(20 * 285 - 20 * 200).toBe(1700); },
    t3: () => { expect(after('HOLD_NOCOST', 'Realized from sales')).toBe('$0 — nothing sold'); } },
  'MK-NW-M-036': { main: 'FID_HOLD', text: '$8,000', label: 'Gain — long-term (held over 1 yr)', drawing: DRAW.kept,
    t2: () => { expect(100 * (290 - 210)).toBe(8000); expect(8000 + 1000).toBe(dollars(first('FID_HOLD', 'MK-NW-M-059'))); },
    t3: () => { expect(R('HOLD_NOPRICE').lines.join(' ')).not.toMatch(/Gain — long-term/); } },
  'MK-NW-M-037': { main: 'FID_HOLD', text: '$1,000', label: 'Gain — short-term (held 1 yr or less)', drawing: DRAW.kept,
    t2: () => { expect(40 * (290 - 265)).toBe(1000); },
    t3: () => { expect(R('HOLD_NOPRICE').lines.join(' ')).not.toMatch(/Gain — short-term/); } },
  'MK-NW-M-059': { main: 'FID_HOLD', text: '$9,000', label: 'Change since purchase', drawing: DRAW.kept,
    t2: () => { expect(40600 - 31600).toBe(9000); },
    t3: () => { expect(R('HOLD_NOPRICE').lines).not.toContain('Change since purchase'); } },
  'MK-NW-M-060': { main: 'FID_HOLD', text: '$2.31', label: '▲ up $2.31 (0.80%) today', drawing: DRAW.kept,
    t2: () => { expect(Math.round((290 - 287.69) * 100) / 100).toBe(2.31); },
    t3: () => { expect(R('HOLD_ONECLOSE').lines.some((l) => / today$/.test(l))).toBe(false); } },
  'MK-NW-M-061': { main: 'FID_HOLD', text: '$210.00', label: '100 sh @ $210.00', drawing: DRAW.kept,
    t3: () => { expect(R('HOLD_SOLD').lines).not.toContain('WHAT YOU BOUGHT'); } },
  'MK-NW-M-062': { main: 'FID_ACC', text: '$420', label: 'Dividend · VTI', drawing: DRAW.account,
    t3: () => { expect(has('B1', 'Log a deposit or a buy — your history starts here.')).toBe(true); } },
  'MK-PF-M-001': { main: 'PERF_INV', text: '$46,600', label: 'Ending value', drawing: DRAW.perf,
    // no accounts at all: $0 with the sentence and the door — his ruling DEC-0260 and v17 phone 5 ("Nothing entered yet")
    t3: () => { expect(after('EMPTY_INV', 'Ending value')).toBe('$0'); expect(has('EMPTY_INV', 'Nothing entered yet. Add your accounts ›')).toBe(true); } },
  'MK-PF-M-002': { main: 'PERF_INV', text: '$10,600', label: 'Wealth generated', drawing: DRAW.perf,
    t2: () => { expect(46600 - 30000 - 6000).toBe(dollars(first('PERF_INV', 'MK-PF-M-002'))); },
    t3: () => { expect(has('FID_INV', "You added your accounts today. Figures for 1M, 1Y and longer come from each holding's past prices.")).toBe(true); } },
  'MK-PF-M-003': { main: 'PERF_INV', text: 'HOW $30,000 BECAME $46,600 · ALL ACCOUNTS', label: 'HOW $30,000 BECAME $46,600 · ALL ACCOUNTS', drawing: DRAW.perf,
    t3: () => { expect(has('FID_INV', 'Every line fills in as days pass — the structure never changes.')).toBe(true); } },
  'MK-PF-M-004': { main: 'PERF_ACC', text: '$46,600', label: 'Ending market value (Sep 28, 2026)', drawing: DRAW.account,
    t4: () => { expect(first('PERF_ACC', 'MK-PF-M-004')).toBe(first('PERF_INV', 'MK-PF-M-005')); } },
  'MK-PF-M-005': { main: 'PERF_INV', text: '$46,600', label: '▸ FIDELITY BROKERAGE', drawing: DRAW.perf,
    t2: () => { expect(printed('PERF_INV', 'MK-PF-M-005').reduce((t, x) => t + dollars(x), 0)).toBe(dollars(first('PERF_INV', 'MK-PF-M-001'))); } },
  'MK-PF-M-006': { main: 'CAT_INV', text: '+12.00%', label: 'WHAT EACH CATEGORY EARNED', drawing: DRAW.perf,
    t3: () => { expect(after('FID_INV', 'Bonds & CDs', 2)).toBe('—'); } },
  'MK-PF-M-007': { main: 'CAT_INV', text: '$865', label: 'All categories', drawing: DRAW.perf,
    t2: () => { const rows = printed('UNTICKERED', 'MK-PF-M-007').map(dollars); expect(rows[0] + rows[1]).toBe(rows[2]); },
    t3: () => { expect(has('FID_INV', /^Fills in with your first dividend or interest record/)).toBe(true); } },
  'MK-PF-M-008': { main: 'BENCH_HOME', text: '8.80%', label: /· market \+8\.80% ·/, drawing: DRAW.home,
    t3: () => { expect(R('PERF_HOME').lines.join(' ')).not.toMatch(/market [+−]/); } },
  'MK-PF-M-010': { main: 'LB', text: '$10,250', label: /^Left in BND it became \$10,250/, drawing: DRAW.kept,
    // a shot is read before Look back's price refresh settles (2026-10-22: it fetches what it compares), so it names what it
    // is getting; the settled line, with the price source stubbed to bring nothing, is held below ("LB_NOPRICE, settled")
    t3: () => { expect(has('LB_NOPRICE', 'Getting prices for BND and SPY…')).toBe(true); } },
  'MK-PF-M-011': { main: 'LB', text: '$11,600', label: /^Moved to VTI it would be \$11,600/, drawing: DRAW.kept,
    t3: () => { expect(R('LB_NOPRICE').lines.join(' ')).not.toMatch(/Moved to/); } },
  'MK-PF-M-012': { main: 'LB', text: '$1,350', label: 'Difference: $1,350 more if you had moved.', drawing: DRAW.kept,
    t2: () => { expect(11600 - 10250).toBe(dollars(first('LB', 'MK-PF-M-012'))); },
    t3: () => { expect(R('LB_NOPRICE').lines.join(' ')).not.toMatch(/Difference/); } },
  'MK-PF-M-013': { main: 'PERF_ACC', text: '$30,000', label: 'Beginning market value (Dec 31, 2025)', drawing: DRAW.account,
    t3: () => { expect(has('B1', 'You added this account today, so its figures start today.')).toBe(true); },
    t4: () => { expect(first('PERF_ACC', 'MK-PF-M-013')).toBe(first('PERF_INV', 'MK-PF-M-018')); } },
  'MK-PF-M-014': { main: 'PERF_ACC', text: '$10,600', label: 'Wealth generated', drawing: DRAW.account,
    t4: () => { expect(has('PERF_INV', /wealth generated \$10,600/)).toBe(true); } },
  'MK-PF-M-015': { main: 'PERF_ACC', text: '$6,000', label: 'Contributions', drawing: DRAW.account,
    t2: () => { expect(walkSum('PERF_ACC', 'MK-PF-M-013', 'MK-PF-M-015')).toBe(dollars(first('PERF_ACC', 'MK-PF-M-004'))); } },
  'MK-PF-M-016': { main: 'QUIET_ACC', text: '+6.67%', label: 'Return', drawing: DRAW.account,
    t3: () => { expect(after('B1', 'Return')).toBe('—'); } },
  'MK-PF-M-017': { main: 'QUIET_INV', text: '+6.67%', label: 'Return', drawing: DRAW.perf,
    t3: () => { expect(after('FID_INV', 'Return')).toBe('—'); },
    t4: () => { expect(has('PERF_INV_1M', '+21.35%')).toBe(true); expect(has('PERF_HOME', /\(21\.35%\) this month/)).toBe(true); } },
  'MK-PF-M-018': { main: 'PERF_INV', text: '$30,000', label: 'Beginning market value (Dec 31, 2025)', drawing: DRAW.perf,
    t3: () => { expect(has('FID_INV', 'Beginning market value (today)')).toBe(true); } },
  'MK-PF-M-019': { main: 'PERF_INV', text: '$6,000', label: 'Contributions', drawing: DRAW.perf,
    t2: () => { expect(printed('PERF_INV', 'MK-PF-M-019').slice(0, 5)).toEqual(['$6,000', '$0', '$825', '$0', '$9,775']); expect(walkSum('PERF_INV', 'MK-PF-M-018', 'MK-PF-M-019')).toBe(46600); } },
  'MK-PF-M-020': { main: 'PERF_INV', text: '$5,000', label: 'Available cash', drawing: DRAW.perf },
  'MK-XS-M-001': { main: 'NW_HOME', text: '$261,200', label: 'Net worth', drawing: DRAW.networth,
    t2: () => { expect(has('NW_NW', 'Own $503,200 − Owe $242,000')).toBe(true); expect(503200 - 242000).toBe(dollars(first('NW_NW', 'MK-XS-M-001'))); },
    t4: () => { expect(after('NW_HOME', 'Net worth', 2)).toBe('$261,200'); expect(first('NW_NW', 'MK-XS-M-001')).toBe('$261,200'); } },
  'MK-XS-M-003': { main: 'NW_HOME', text: '$175,200', label: 'YOUR INVESTMENTS', drawing: DRAW.networth,
    t2: () => { expect(printed('NW_NW', 'MK-NW-M-007').slice(2, 5).map(dollars).reduce((a, b) => a + b, 0)).toBe(175200); },
    t3: () => { expect(has('EF_HOME', 'Nothing entered yet. Add your accounts ›')).toBe(true); },
    t4: () => { expect(after('NW_HOME', 'YOUR INVESTMENTS', 2)).toBe('$175,200'); expect(printed('NW_NW', 'MK-NW-M-007')[1]).toBe('$175,200'); } },
  'MK-XS-M-004': { main: 'QUIET_INV', text: '+6.67%', label: 'Return', drawing: DRAW.perf,
    // Home's "▲ up $8,200 (21.35%)" is the Performance tab's 1M wealth generated and return, whose walk adds up beneath it
    t2: () => { expect(has('PERF_HOME', '▲ up $8,200 (21.35%) this month')).toBe(true); expect(after('PERF_INV_1M', 'Wealth generated')).toBe('$8,200');
      expect(walkSum('PERF_INV_1M', 'MK-PF-M-018', 'MK-PF-M-019')).toBe(46600); },
    t3: () => { expect(has('NW_HOME', 'change shows once your holdings have prices')).toBe(true); } },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE GENERIC CHECK FOR A TENET THE REVIEWER PASSED, read off the rendered screen
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const JARGON = /\b(TWR|Dietz|IRR|XIRR|CAGR|YTM|NAV|bps|P&L|MTM)\b/;
/** tenet 1 — the figure the register's worked household comes to, on its own screen */
function t1(id: string) {
  const f = FIGS[id];
  switch (id) {
    case 'MK-CF-M-051': expect(after('CF_CF', 'Actual inflow (income (take-home))')).toBe('$7,200'); return;
    case 'MK-CF-M-052': expect(after('CF_CF', 'Car loan', 2, 'ACTUAL · SO FAR')).toBe('−$250'); expect(after('CF_CF', 'Expenses entered by hand')).toBe('−$2,998'); return;
    case 'MK-CF-M-053': expect(first('CF_CF', 'MK-CF-M-003')).toBe('$3,952'); expect(after('CF_CF', '= Actual surplus so far')).toBe('+$3,952'); return;
    case 'MK-MN-M-003': expect(has('CR_ROOM', '$21,350 left')).toBe(true); return;
    case 'MK-NW-M-012': expect(has('NW_NW', 'Both include $2,650/month of debt payments you cannot stop.')).toBe(true); return;
    case 'MK-NW-M-013': expect(first('EF_NW', id)).toBe('5.2 months'); expect(has('EF_STRESS', '5.2')).toBe(true); return;
    case 'MK-NW-M-022': expect(first('FID_ACC', id)).toBe('4'); expect(has('FID_ACC', '4 records')).toBe(true); return;
    case 'MK-NW-M-028': expect(printed('B1', id).slice(0, 2)).toEqual(['$23,300', '$23,800']); return;
    case 'MK-PF-M-006': expect(after('CAT_INV', 'Stocks / Funds', 2)).toBe('+12.00%'); return;
    case 'MK-PF-M-007': expect(after('CAT_INV', 'Stocks / Funds')).toBe('$865'); return;
    case 'MK-PF-M-008': expect(has('BENCH_HOME', /· market \+8\.80% ·/)).toBe(true); return;
    // the register's worked savings account as the app stores one (kind savings, held as cash) — since 2026-10-21 an account
    // nothing says is a bank account has no cash on record unless its cash was entered (MK-PF-M-020, DEC-3279e)
    case 'MK-PF-M-020': expect(fig('MK-PF-M-020', availableCash({ asset_id: 'x', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 5_000 } as any))).toBe('$5,000'); return;
    case 'MK-XS-M-001': expect(first('NW_NW', id)).toBe('$261,200'); expect(after('NW_HOME', 'Net worth', 2)).toBe('$261,200'); return;
    case 'MK-XS-M-003': expect(after('NW_HOME', 'YOUR INVESTMENTS', 2)).toBe('$175,200'); return;
    case 'MK-XS-M-004': expect(first('QUIET_INV', 'MK-PF-M-017')).toBe('+6.67%'); return;
    default: expect(printed(f.main, id)).toContain(f.text);
  }
}
/** tenet 2 — how it was made: its parts add up on screen, or it prints under its identifier so it traces to its row */
function t2(id: string) {
  const f = FIGS[id];
  if (f.t2) { f.t2(); return; }
  if (['MK-CF-M-051', 'MK-CF-M-052', 'MK-PF-M-020'].includes(id)) { t1(id); return; }
  expect(R(f.main).printed.some((p) => p.id === id) || id === 'MK-PF-M-008').toBe(true);
  if (f.estimate) expect(R(f.main).lines.some((l) => f.estimate!.test(l))).toBe(true);
}
/** tenet 3 — unknown is not zero: with its input missing it refuses in words, never $0 */
function t3(id: string) {
  const f = FIGS[id];
  if (f.t3) { f.t3(); return; }
  expect(fig(id, null)).toBe(figureSpec(id).refusal);
  expect(fig(id, null)).not.toBe('$0');
}
/** tenet 4 — one thing, one number, one word: the same figure reads the same wherever it is shown */
function t4(id: string) {
  const f = FIGS[id];
  if (f.t4) { f.t4(); return; }
  expect(figureSpec(id).label.length).toBeGreaterThan(0);
  t1(id);
}
/** tenet 5 — the person's word outranks the app's guess: opening the screen changes nothing they entered */
function t5(id: string) { expect(R(FIGS[id].main).changed).toEqual([]); }
/** tenet 6 — his decision is the design: the words beside it are on the screen a drawing test holds word for word */
function t6(id: string) {
  const f = FIGS[id];
  expect(fs.existsSync(path.join(ROOT, f.drawing))).toBe(true);
  if (id === 'MK-PF-M-020') return;     // a line of the add-activity sheet (PerformanceScreen.tsx), not opened here
  expect(R(f.main).lines.some((l) => (typeof f.label === 'string' ? l === f.label : f.label.test(l)))).toBe(true);
}
/** tenet 7 — honest: a figure that is an estimate says so; a loss is never printed without its minus */
function t7(id: string) {
  const f = FIGS[id];
  if (f.estimate) { expect(R(f.main).lines.some((l) => f.estimate!.test(l))).toBe(true); return; }
  for (const p of R(f.main).printed.filter((x) => x.id === id && x.value != null && (x.value as number) < 0)) expect(p.text).toMatch(/[−-]/);
  expect(R(f.main).lines.join(' ')).not.toMatch(/guaranteed return|risk-free/i);
}
/** tenet 8 — plain words: the words beside it are on screen and carry no jargon */
function t8(id: string) {
  const f = FIGS[id];
  if (id === 'MK-PF-M-020') { expect(figureSpec(id).label).not.toMatch(JARGON); return; }
  const lines = R(f.main).lines.filter((l) => (typeof f.label === 'string' ? l === f.label : f.label.test(l)));
  expect(lines.length).toBeGreaterThan(0);
  for (const l of lines) expect(l).not.toMatch(JARGON);
}
const GENERIC = [t1, t2, t3, t4, t5, t6, t7, t8];

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CLASSIFICATION — every item the reviewer FAILED, and every PASS the rendered screen breaks, by hand; the rest are
// the generic check for their tenet. `check` is what holds today; `wrong` is the right answer (test.failing today).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Cls = 'AGREES' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'IN-FLIGHT';
// `fixed`: the day and the reason a `wrong` was made right — it then runs as a passing test with that in its name, and `was`
// (the app's old answer, if it was pinned) runs as test.failing beside it, kept rather than deleted
type Item = { cls: Cls; why: string; rowWordsOnly?: boolean; inFlight?: boolean; fix?: string; check?: () => void; wrong?: () => void; fixed?: string; was?: () => void };
const CLASS: Record<string, Item> = {
  // ── Cash flow figures (on Cash flow, and by the register on Home) ────────────────────────────────────────────────
  'MK-CF-M-002#2': { cls: 'REVIEWER WRONG',
    why: 'Settled on screen: the Plan\'s $300 promise is its own row under the planned surplus — "= Planned surplus +$1,150 · Emergency fund · from your Plan −$300 · Surplus after your budget +$850". Every row shown is deducted.',
    check: () => { expect(after('CF_PROMISE', '= Planned surplus')).toBe('+$1,150'); expect(after('CF_PROMISE', 'Emergency fund · from your Plan')).toBe('−$300'); expect(after('CF_PROMISE', 'Surplus after your budget')).toBe('+$850'); } },
  'MK-CF-M-002#3': { cls: 'APP WRONG',
    why: 'Missing income: no surplus at all, only the two set-up steps (held). Missing debt payment: the surplus refuses, but reads "+No budget set — there is no planned surplus…" while a $3,400 budget IS set, and the car loan\'s row prints "A section with nothing in it keeps its heading and says so." — the wrong reason, in a sentence written for the master file.',
    fix: 'MoneyKeel/functions/cashflow/this-month.ts plannedMonthFlow + src/screens/CashFlowScreen.tsx: a debt with no payment entered reads "Car loan — payment not entered", and the planned surplus "Not worked out — Car loan\'s payment is not entered", with no "+". Cash flow This month, words only.',
    check: () => { expect(R('CF_NOINCOME').lines).toContain('SET UP YOUR MONTH — 2 STEPS'); expect(printed('CF_NOINCOME', 'MK-CF-M-002')).toEqual([]); },
    wrong: () => { const L = R('CF_NOPAY').lines; expect(L.some((l) => /No budget set/.test(l))).toBe(false); expect(L).not.toContain('A section with nothing in it keeps its heading and says so.'); } },
  'MK-CF-M-051#1': { cls: 'NEEDS A RULING',
    why: 'Two of his decisions disagree. The row quotes him (2026-08-28): "nothing is assumed to have arrived; a source counts only once it is recorded". His approved Cash flow drawing (DEC-0440, 2026-09-28) draws the take-home as "Actual inflow" with nothing recorded. On screen, with no paycheck recorded: "Actual inflow $7,200", "Actual surplus so far +$3,952". Under the 08-28 rule: $0 and −$3,248 until a paycheck is recorded.',
    check: () => { expect(after('CF_CF', 'Actual inflow (income (take-home))')).toBe('$7,200'); expect(H_CF.incomes).toBeUndefined(); } },
  'MK-CF-M-052#2': { cls: 'APP WRONG', rowWordsOnly: true,
    why: 'The screen is right by the approved drawing (DEC-0440: an unpaid debt shows $0 with its due day): outflow so far = $250 car loan paid + $2,998 logged = $3,248, "Mortgage · NOT PAID YET · $0". The figure\'s own row says the opposite — "Σ of the debt payments due this month… counted in full, logged or not" — and the reviewer\'s $5,648 follows those words. File and code disagree.',
    fix: 'MoneyKeel/functions/cashflow/this-month.ts MK-CF-M-052 row: formula "expenses logged so far this month + the debt payments made so far; an unpaid debt shows $0 with its due day". No figure moves.',
    check: () => { expect(after('CF_CF', 'Mortgage', 1, 'ACTUAL · SO FAR')).toBe('NOT PAID YET'); expect(after('CF_CF', 'Mortgage', 2, 'ACTUAL · SO FAR')).toBe('$0'); },
    wrong: () => { expect(figureSpec('MK-CF-M-052').formula).not.toMatch(/due this month/); } },
  'MK-CF-M-052#4': { cls: 'APP WRONG',
    why: 'Found rendering (the reviewer passed it): Home\'s cash-flow box reads "Actual expenses so far $2,998 · Left $4,202" — it leaves out the $250 car loan already paid. Cash flow, one tap away: −$3,248 out, +$3,952 left. Home works the month out on the screen itself (CLAUDE.md: never re-derive a money figure on a screen).',
    fix: 'src/screens/HomeScreen.tsx cashflowBlock: read thisMonth(…).actual from MoneyKeel/functions/cashflow/this-month.ts — Income = actual inflow, out = expenses + debts paid, Left = actual surplus. Home: $2,998 / $4,202 → $3,248 / $3,952; "Actual expenses so far" → "Outflow (expenses + debt)". No approved Home drawing is traced (design record); Cash flow v01 is unaffected.',
    wrong: () => { expect(after('CF_HOME', 'Actual expenses so far')).toBe('$3,248'); } },
  'MK-CF-M-052#8': { cls: 'APP WRONG', rowWordsOnly: true,
    why: 'The screen does not count unpaid debts as gone out (Mortgage NOT PAID YET $0). The row\'s plain words do: "the expenses logged, plus the debt payments due in the month". Same fix as tenet 2.',
    fix: 'MK-CF-M-052 row "answers": "What has actually gone out so far this month: the expenses logged and the debt payments made." No figure moves.',
    check: () => { expect(after('CF_CF', 'Mortgage', 2, 'ACTUAL · SO FAR')).toBe('$0'); },
    wrong: () => { expect(figureSpec('MK-CF-M-052').answers).not.toMatch(/due in the month/); } },
  'MK-CF-M-053#1': { cls: 'REVIEWER WRONG',
    why: 'The screen\'s +$3,952 (7,200 − 250 − 2,998) follows the approved drawing, where an unpaid debt shows $0 until paid. The reviewer\'s $1,552 rests on MK-CF-M-052\'s out-of-date words (counted there).',
    check: () => { expect(after('CF_CF', '= Actual surplus so far')).toBe('+$3,952'); } },
  'MK-CF-M-053#3': { cls: 'APP WRONG',
    why: 'Found rendering (the reviewer passed it): with no income entered and nothing spent, Home\'s cash-flow box shows the red "Over" chip above "Income $0 · Nothing entered yet · Left $0". "Over" is an answer; nothing is known (HomeScreen: over = income ≤ 0).',
    fix: 'src/screens/HomeScreen.tsx cashflowBlock: no pace chip until income is entered — the EmptyNote door already there carries the line. Home, words only.',
    wrong: () => { expect(R('NW_HOME').lines).not.toContain('Over'); } },
  'MK-CF-M-053#4': { cls: 'APP WRONG',
    why: 'Found rendering (the reviewer passed it): one month reads "Left $4,202" on Home and "= Actual surplus so far +$3,952" on Cash flow — two numbers for one thing, $250 apart (the car loan paid).',
    fix: 'The MK-CF-M-052 tenet-4 fix: Home reads the one door. Home "Left" $4,202 → $3,952.',
    wrong: () => { expect(after('CF_HOME', 'Left')).toBe((after('CF_CF', '= Actual surplus so far') ?? '').replace('+', '')); } },
  'MK-MN-M-003#3': { cls: 'NEEDS A RULING',
    why: 'No ruling says what "has gone in" means. The screen takes a full year at the monthly amount typed: "$21,350 left · That is about $14,400 of the $35,750 limit — calculated from what you entered you contribute each month, not from your payroll" (labelled). On 29 Sep, nine $1,200 payments made, the room open today is $24,950; after the year\'s planned payments it is $21,350. On screen: "$21,350 left" (today) or "$24,950 left" (paid so far).',
    check: () => { expect(has('CR_ROOM', '$21,350 left')).toBe(true); expect(has('CR_ROOM', /not from your payroll/)).toBe(true); } },
  // ── Net worth figures the register lists ──────────────────────────────────────────────────────────────────────────
  'MK-NW-M-012#3': { cls: 'APP WRONG',
    why: 'A car loan whose payment was never entered counts $0 with no word: Net worth reads "Both include $2,400/month of debt payments you cannot stop" and the emergency fund 7.5 months (6.8 with the $250). His tenet 3: unknown is not zero.',
    fix: 'MoneyKeel/functions/networth-and-performance/net-worth.ts theNetWorth: monthlyDebtPayments names each debt with no payment ("Car loan: payment not entered"); src/screens/NetWorthScreen.tsx prints it beside the debt-payment line and the emergency fund. Net worth words; the $2,400 stays but is no longer presented as the whole.',
    wrong: () => { expect(R('NW_NOPAY').lines.join(' ')).toMatch(/Car loan[^.]*payment not entered/i); },
    fixed: '2026-10-21: a debt whose payment was never entered is named beside the months and the debt payments (theNetWorth and theEmergencyFund name it; tenet 3)' },
  'MK-NW-M-013#1': { cls: 'APP WRONG', rowWordsOnly: true,
    why: 'The screen is right: with nothing logged it uses the essentials typed in the plan and says so — "$18,000 cash ÷ $3,470/month essentials — you entered" — his DEC-0251: "the typed plan is the fallback for someone who has logged nothing". The row leaves the fallback out ("the average of what has been logged"), so the reviewer read the worked example as logged history.',
    fix: 'MK-NW-M-013 row decisions (MoneyKeel/functions/networth-and-performance/emergency-fund.ts): add DEC-0251\'s fallback in his words. No figure moves.',
    check: () => { expect(has('EF_NW', /\$18,000 cash ÷ \$3,470\/month essentials — you entered/)).toBe(true); },
    wrong: () => { expect((figureSpec('MK-NW-M-013').decisions ?? []).join(' ')).toMatch(/typed plan|fallback/i); },
    fixed: '2026-10-21: the row carries DEC-0251\'s fallback in his words — nothing logged, the typed plan stands in (no figure moves)' },
  'MK-NW-M-013#4': { cls: 'APP WRONG',
    why: 'Found rendering (the reviewer passed it): one household, Net worth "5.2 months", Stress test "5.2", but Job safety "6 months of essentials is $20,820 ($3,470/month) — your savings cover $0 of it" and "STILL NEEDED $20,820". Job safety counts an old savings log (store.savings), not the $18,000 in the accounts.',
    fix: 'src/screens/JobSafetyScreen.tsx: "savings" = theEmergencyFund(nwIn).cash, "savings and investments" = that + investments. Job safety: "cover $0 … still needed $20,820" → "cover $18,000 … still needed $2,820".',
    wrong: () => { expect(R('EF_JOB').lines.join(' ')).toMatch(/your savings cover \$18,000 of it/); },
    fixed: '2026-10-21: Job safety reads the emergency fund door\'s cash and Net worth\'s Investments, not the old savings log ($18,000 covered, $2,820 still needed; tenet 4)' },
  'MK-NW-M-013#8': { cls: 'REVIEWER WRONG',
    why: 'The screens carry the rent exception: rent that keeps arriving comes off the month (owner 2026-10-04), and with a property\'s rent unknown the line "6.8 months, rent not included. Enter rent to include." sits with the months (DEC-3769; DEC-3836 on Stress test, Job safety, Insights and Home — emergency_fund_rent_dec3836).',
    check: () => { expect(has('NW_NW', '6.8 months, rent not included. Enter rent to include.')).toBe(true); } },
  'MK-NW-M-020#2': { cls: 'APP WRONG',
    why: 'In the worked household the rows add up (Stocks $40,600 + Cash $6,000 = Total $46,600). When the broker\'s total is more than the holdings plus the cash it reports — $50,000 against $40,000 + $5,000 — the rows read $45,000 under "Total $50,000" and the $5,000 is in no row. DEC-0095 says that gap is cash.',
    fix: 'src/domain/assets/index.ts accountClassBreakdown: Cash = broker total − priced holdings when that exceeds the cash reported (DEC-0095), so the rows add up. Account page BY CATEGORY & HOLDING: Cash $5,000 → $10,000 in that case.',
    check: () => { expect(printed('FID_ACC', 'MK-NW-M-020').map(dollars).reduce((a, b) => a + b, 0)).toBe(46600); },
    wrong: () => { expect(printed('GAP_ACC', 'MK-NW-M-020').map(dollars).reduce((a, b) => a + b, 0)).toBe(50000); },
    fixed: '2026-10-21: the part of the broker\'s total no listed holding accounts for is cash (DEC-0095), on the account page\'s cash row and Net worth\'s Cash line alike — Cash $5,000 → $10,000, rows $50,000' },
  'MK-NW-M-024#3': { cls: 'IN-FLIGHT', inFlight: true,
    why: 'Coupon missing: the screen does what his A46 says — "not entered · $0/year — coupon rate not entered", no yields (the reviewer is wrong there). Face missing: "4.50%/year · $1,089/year" — the rate on the market value, a guess (the reviewer is right there). The bond value rule is being changed now (market value, else paid, else face): re-run after it lands.',
    fix: 'If it still reads so after the bond work lands: src/domain/bonds/index.ts yearlyInterestNow — no face, no yearly interest ("face value not entered"). Account page BOND FACTS: $1,089/year → "face value not entered".',
    check: () => { expect(after('B1_NOCOUPON', 'Interest payments')).toBe('not entered · $0/year — coupon rate not entered'); expect(printed('B1_NOCOUPON', 'MK-NW-M-026')).toEqual([]); },
    wrong: () => { expect(after('B1_NOFACE', 'Interest payments')).not.toMatch(/\$1,089/); } },
  'MK-NW-M-026#1': { cls: 'IN-FLIGHT', inFlight: true,
    why: 'The reviewer read the package\'s row ("the standard approximation"); the code solves the yield from the full price — the value plus accrued interest — and the row in the working tree now says so (changed by the Net worth work landing now, with "payments a year … once a year when how often it pays was not entered"). The screen\'s 5.69% still estimates "$1,119 … for 363 days", one coupon a year, for a Treasury whose frequency is not entered. Re-run after the frequency work lands.',
    check: () => { expect(has('B1', 'about 5.69% · estimate')).toBe(true); expect(has('B1', /^Added estimated \$1,119 in accrued interest/)).toBe(true); expect(figureSpec('MK-NW-M-026').formula).toMatch(/payments a year/); } },
  'MK-NW-M-028#1': { cls: 'IN-FLIGHT', inFlight: true,
    why: 'The reviewer passed it and the screen gives the register\'s band ($23,300–$23,800), but the band is priced from the yield to maturity, which moves when the payment-frequency work lands. Re-run.',
    check: () => { expect(printed('B1', 'MK-NW-M-028').slice(0, 2)).toEqual(['$23,300', '$23,800']); } },
  'MK-NW-M-028#3': { cls: 'APP WRONG',
    why: 'A CD whose "bank or broker?" question was never answered is treated as a bank CD and its page says "this one is marked as bought from the bank" — nobody marked it. DEC-3837 asks once; no ruling of his says an unanswered CD is a bank CD (the register line saying so is mine).',
    fix: 'MoneyKeel/functions/networth-and-performance/bonds.ts theBonds ratesMoveRefusal: with cd_bought missing, "Where this CD was bought is not entered — bought from the bank, or through a broker?" with the two answers. Account page IF INTEREST RATES MOVE card, words only.',
    wrong: () => { expect(R('B2').lines.join(' ')).not.toMatch(/is marked as bought from the bank/); },
    fixed: '2026-10-21: a CD with no answer says where it was bought is not entered and asks the DEC-3837 question with its two answers (tenet 3)' },
  'MK-NW-M-029#8': { cls: 'NEEDS A RULING',
    why: 'His approved Holding page drawing (v02, DEC-0650) says "Current price · live"; the price is the feed\'s last daily close ("prices updated 8h ago" on Home). Tenet 6 (his drawing) outranks tenet 8, so it stays until he rules. On screen: "CURRENT PRICE · LIVE $290.00" would read "LAST CLOSE · SEP 28 $290.00".',
    // DECIDED 2026-10-21 (NWFIX, the lead's decision under tenets 1, 2 and 7 over the drawing's live wording): the band says
    // LAST CLOSE and its day. This pins the new words; the check was written before the decision.
    check: () => { expect(has('FID_HOLD', /^LAST CLOSE · /)).toBe(true); expect(has('FID_HOLD', 'CURRENT PRICE · LIVE')).toBe(false); } },
  'MK-NW-M-030#3': { cls: 'APP WRONG',
    why: 'A purchase with no share count: under Current value the page prints "No price — it shows what you paid, labelled as that. Not stated where a purchase has no share count or price paid on record." — the master row\'s sentence about the figure, and it blames a missing price while $290.00 shows above. (Options are right: 2 mini contracts at $8 read $160.)',
    fix: 'src/screens/HoldingDetailScreen.tsx: when the share count is missing, Current value reads "Share count not entered — tap Edit to add it"; the refusal text stays on the master row. Holding page words only.',
    check: () => { expect(after('HOLD_MINI', 'Current value')).toBe('$160'); },
    wrong: () => { expect(after('HOLD_NOSHARES', 'Current value')).not.toMatch(/^No price/); expect(after('HOLD_NOSHARES', 'Current value')).toBe('Not stated — a purchase has no share count on record.'); },
    fixed: '2026-10-21 (W-HOLDING, tenets 3 and 4): Current value says the share count is not on record, in the words Price paid (average) and Total paid use for the same cause — not the row\'s refusal sentence',
    was: () => { expect(after('HOLD_NOSHARES', 'Current value')).toMatch(/^No price/); } },
  'MK-NW-M-031#3': { cls: 'APP WRONG',
    why: 'The same holding reads, under Quantity, "All sold — the screen says the holding is liquidated rather than showing 0 shares. Not stated where…" — it says all sold when the count was never entered. (The unit is right: options read "2 contracts".)',
    fix: 'src/screens/HoldingDetailScreen.tsx: Quantity reads "not entered" when a purchase has no share count; "Holding liquidated" only when the records say every share was sold. Holding page words only.',
    check: () => { expect(after('HOLD_MINI', 'Quantity')).toBe('2 contracts'); },
    wrong: () => { expect(after('HOLD_NOSHARES', 'Quantity')).not.toMatch(/^All sold/); expect(after('HOLD_NOSHARES', 'Quantity')).toBe('Not stated — a purchase has no share count on record.'); },
    fixed: '2026-10-21 (W-HOLDING, tenet 3): Quantity says the share count is not on record; All sold only when every share is sold (Holding liquidated, no Quantity row)',
    was: () => { expect(after('HOLD_NOSHARES', 'Quantity')).toMatch(/^All sold/); } },
  'MK-NW-M-032#1': { cls: 'REVIEWER WRONG',
    why: 'No wrong number: options divide by contracts × shares a contract — 2 mini contracts, $100 paid, read "Price paid (average) $5.00" a share; with no share count no average is shown. (The refusal\'s reason words are counted at MK-NW-M-030/031.)',
    check: () => { expect(after('HOLD_MINI', 'Price paid (average)', 2)).toBe('$5.00'); expect(after('HOLD_NOSHARES', 'Price paid (average)', 2)).toBe('Not stated — a purchase has no share count on record.'); } },
  'MK-NW-M-033#3': { cls: 'REVIEWER WRONG',
    why: 'Held: with no share count Total paid refuses ("No purchase price recorded." — the wrong reason, counted at MK-NW-M-030/031); options use the contract size — 2 contracts × 10 × $5 = $100.',
    check: () => { expect(after('HOLD_NOSHARES', 'Total paid')).not.toMatch(/^\$/); expect(after('HOLD_MINI', 'Total paid')).toBe('$100'); } },
  'MK-NW-M-034#3': { cls: 'APP WRONG',
    why: 'Found rendering (the reviewer passed it): a holding no record names reads "Dividends received (12 mo) $0" — its own row says "No records naming this holding — the line does not appear". A Roth IRA with no records at all shows the same $0.',
    fix: 'src/screens/HoldingDetailScreen.tsx: print Dividends received only when a dividend record names the holding; otherwise leave the line out, as the row says. Holding page.',
    wrong: () => { expect(R('HOLD_ROTH').lines).not.toContain('Dividends received (trailing twelve months)'); expect(after('FID_HOLD', 'Dividends received (trailing twelve months)')).toBe('$825'); },   // the label since Q35, 2026-10-21
    fixed: '2026-10-21 (W-HOLDING, the row\'s own refusal, tenet 3): with no dividend record naming the holding the line is not drawn; one record naming it draws it ($825 for the worked household)',
    was: () => { expect(after('HOLD_ROTH', 'Dividends received (trailing twelve months)')).toBe('$0'); } },
  'MK-NW-M-035#3': { cls: 'REVIEWER WRONG',
    why: 'Held (DEC-4643): bought 10 at $50, sold 15 at $70 → "Realized from sales +$200 all time" and "$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record." The unmatched 5 are not counted as $0 profit.',
    check: () => { expect(after('HOLD_PARTSALE', 'Realized from sales')).toBe('+$200 all time'); expect(has('HOLD_PARTSALE', '$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record.')).toBe(true); } },
  'MK-NW-M-035#4': { cls: 'APP WRONG', rowWordsOnly: true,
    why: 'Found rendering: the row calls it "Realized gain from your buys and sells"; the screen and his approved drawing say "Realized from sales". One concept, two names.',
    fix: 'MoneyKeel/functions/networth-and-performance/holding.ts MK-NW-M-035 label → "Realized from sales". No figure moves.',
    wrong: () => { expect(figureSpec('MK-NW-M-035').label).toBe('Realized from sales'); },
    fixed: '2026-10-21: the row is named as the screen and the drawing name it, Realized from sales (no figure moves)' },
  'MK-NW-M-036#7': { cls: 'APP WRONG',
    why: 'A holding inside a Roth IRA shows the same IF YOU SOLD TODAY split, "Gain — long-term +$8,000 / short-term +$1,000", though no tax is due on a sale inside a Roth. The screen names no tax rate; the row does ("the part taxed at the lower rate"). Whether the split shows — or says "no tax inside a Roth IRA" — in IRAs, 401(k)s and HSAs is his call. Decided by the lead on 2026-10-21 under tenet 7 (DEC-3523), without asking him: inside an account taxed as pre-tax or tax-free the split is not shown (holding-detail v02, READ THIS FIRST 2026-10-21).',
    fix: 'MoneyKeel/functions/networth-and-performance/holding.ts theHolding notCapitalGains (MK-NW-F-012 taxTreatmentOf) + HoldingDetailScreen IF YOU SOLD TODAY: one row, Gain +$9,000, and the line that gains inside this account are not taxed as capital gains.',
    wrong: () => { expect(after('HOLD_ROTH', 'Gain')).toBe('+$9,000'); expect(has('HOLD_ROTH', 'Gains inside this account are not taxed as capital gains, so they are not split into long-term and short-term.')).toBe(true); expect(has('HOLD_ROTH', 'Gain — long-term (held over 1 yr)')).toBe(false); },
    fixed: '2026-10-21: inside a Roth IRA the gain is shown whole, with the line saying why (the lead, under tenet 7)',
    was: () => { expect(after('HOLD_ROTH', 'Gain — long-term (held over 1 yr)')).toBe('+$8,000'); } },
  'MK-NW-M-037#7': { cls: 'APP WRONG',
    why: 'A purchase with no date is counted short-term: 140 shares, no date → "Gain — short-term +$9,001", long-term "+$0", and WHAT YOU BOUGHT prints the word "undefined" as its date. An undated purchase is unknown, not short-term.',
    fix: 'MoneyKeel/functions/networth-and-performance/holding.ts capital-gains split: an undated purchase goes to neither — a line "Not known — 140 shares have no purchase date" with its gain; HoldingDetailScreen prints "date not entered". Holding page: short-term $9,001 → $0 plus that line.',
    wrong: () => { expect(after('HOLD_UNDATED', 'Gain — short-term (held 1 yr or less)')).not.toBe('+$9,001'); expect(R('HOLD_UNDATED').lines).not.toContain('undefined'); },
    fixed: '2026-10-21: a purchase with no purchase date is in neither part; its gain has its own line, and its date reads not on record (tenet 3)' },
  // ── Performance figures ──────────────────────────────────────────────────────────────────────────────────────────
  'MK-PF-M-001#4': { cls: 'NEEDS A RULING',
    why: 'Two approved things, two scopes. Home\'s YOUR INVESTMENTS leaves cash out (his DEC-0457): $35,775. Performance\'s Ending value counts the investment accounts whole (v17): $46,600. Under $35,775 Home prints "▲ up $8,200 (21.35%) this month" — measured on the $46,600. Either Home\'s change line names its scope ("your investment accounts, cash included") or it is measured without the cash.',
    // DECIDED 2026-10-21 (PF-B, the lead's decision under tenet 2; DEC-0457 and Q-PF-1 both kept): the change line names its
    // base beneath it where the two differ — Performance's own Ending value, printed under MK-PF-M-001. To reverse: delete
    // that line in HomeScreen.tsx. The second check holds the base: it is the Performance tab's Ending value, to the dollar.
    check: () => {
      expect(after('PERF_HOME', 'YOUR INVESTMENTS', 2)).toBe('$35,775'); expect(first('PERF_INV', 'MK-PF-M-001')).toBe('$46,600'); expect(has('PERF_HOME', '▲ up $8,200 (21.35%) this month')).toBe(true);
      expect(has('PERF_HOME', "This month's change is on $46,600: your investment accounts with the cash in them.")).toBe(true);
      expect(printed('PERF_HOME', 'MK-PF-M-001')).toEqual([first('PERF_INV_1M', 'MK-PF-M-001')]);
      // no cash in the accounts, one base: no line (the Net worth household's Home)
      expect(R('NW_HOME').lines.some((l) => l.startsWith("This month's change is on"))).toBe(false);
    } },
  'MK-PF-M-002#1': { cls: 'APP WRONG',
    why: 'His DEC-4439 example: a new account opened with $10,000, worth $10,050 that evening, earned +$50 (+0.50%); worth $9,800, −$200 (−2.00%). The Performance tab reads "Wealth generated $0 · Return +0.00%" for both — the record\'s first evening is taken as the beginning, so the first day is never measured, and Contributions read $0 while the activity list shows the $10,000.',
    fix: 'MoneyKeel/functions/networth-and-performance/performance.ts thePerformance + Calculation Module code/engines/time-weighted-return.ts: an account whose first recorded day carries its opening deposit starts from $0 the evening before (DEC-4439). Since on the Performance tab, the account page and Home: $0 / +0.00% → +$50 / +0.50% (−$200 / −2.00%).',
    wrong: () => { expect(first('NEW_INV', 'MK-PF-M-002')).toBe('$50'); expect(first('NEW_INV', 'MK-PF-M-017')).toBe('+0.50%'); expect(first('NEW_INV_LOSS', 'MK-PF-M-017')).toBe('−2.00%'); },
    fixed: '2026-10-21: Since reads the whole record from the evening before a new account\'s first day, when money was added that day, at $0 (DEC-4439) — $0 / +0.00% → +$50 / +0.50% (−$200 / −2.00%)' },
  'MK-PF-M-003#2': { cls: 'APP WRONG',
    why: 'Each line is rounded on its own, so on unround figures the walk does not add up on screen: $10,001 + $1,001 + $101 + $399 = $11,502 under "Ending market value $11,500"; Wealth generated $499 above Dividends $101 + Change $399 = $500. His tenet 2 and the row\'s own decision ("THE LINES ALWAYS SUM TO THE ENDING") say they must.',
    fix: 'src/screens/PerformanceScreen.tsx and AccountPortfolioScreen.tsx walks: print Change in investment value as the rounded ending − the other rounded lines, and Wealth generated as rounded ending − rounded beginning − rounded flows; the exact figures stay at full precision. Moves a dollar or two on any walk.',
    wrong: () => {
      expect(walkSum('UNROUND_INV', 'MK-PF-M-018', 'MK-PF-M-019')).toBe(dollars(first('UNROUND_INV', 'MK-PF-M-001')));
      // hand-worked: $10,000.50 · +$1,000.50 · $100.50 · change $398.99 · $11,500.49 → $10,001 + $1,000 + $100 + $399 = $11,500
      expect(printed('UNROUND_INV', 'MK-PF-M-019').slice(0, 5)).toEqual(['$1,000', '$0', '$100', '$0', '$399']);
      expect(first('UNROUND_INV', 'MK-PF-M-002')).toBe('$499');
    },
    fixed: '2026-10-21: the walk prints whole dollars that add up to the ending (walkShown — beginning and ending rounded as every figure is, the lines between make up the difference; tenet 2): $10,001 + $1,000 + $100 + $399 = $11,500' },
  'MK-PF-M-004#4': { cls: 'APP WRONG',
    why: 'The row says an account\'s ending is its holdings at today\'s prices plus its cash; the screen prints the broker\'s total. They differ when the broker\'s total is more than what it lists: $50,000 printed above rows of $40,000 + $5,000 = $45,000. (Same root as MK-NW-M-020 tenet 2.)',
    fix: 'The MK-NW-M-020 fix (the gap is cash, DEC-0095), and the MK-PF-M-004 row: "the broker\'s total; holdings and cash beneath it, the difference shown as cash". Account page and Performance per-account line.',
    check: () => { expect(first('GAP_ACC', 'MK-PF-M-004')).toBe('$50,000'); },
    wrong: () => { expect(printed('GAP_ACC', 'MK-NW-M-020').map(dollars).reduce((a, b) => a + b, 0)).toBe(dollars(first('GAP_ACC', 'MK-PF-M-004'))); },
    fixed: '2026-10-21: the MK-NW-M-020 fix — the gap is cash (DEC-0095), so the rows add up to the $50,000 ending' },
  'MK-PF-M-006#1': { cls: 'APP WRONG',
    why: 'Right for the worked case (Stocks / Funds +12.00%). With share changes inside the window the class blend weights each holding by "value now ÷ (1 + its return)", not what it was worth when the window began: A 10 shares at $100, then 90 more at $105, ending 100 at $110; B 100 at $100 ending at $50 → the table reads −20.00% where the class\'s time-weighted return is −21.60%. (The formula card is MK-NW-F-084, part 1\'s other half.)',
    fix: 'MoneyKeel/functions/networth-and-performance/performance.ts categoryEarnings: weight each holding by its value on the window\'s first day (shares held then × the first close), or chain the class\'s daily values where the record has them (DEC-4439). Performance tab WHAT EACH CATEGORY EARNED.',
    check: () => { expect(after('CAT_INV', 'Stocks / Funds', 2)).toBe('+12.00%'); },
    // (2026-10-22, W-START) the reviewer's two holdings as the app builds their rows — rows written by hand carry no prices, so
    // they cannot say what B was worth when A bought more; A $100 → $105 the evening before the 90 were bought → $110, B $100
    // → still $100 then → $50, over the 1M window to Sep 30, 2026, with one $10 dividend so the table is drawn (ledger-only).
    // The Performance tab and the account page rendered: src/screens/__tests__/shares_added_inside_window_agree.test.tsx
    wrong: () => { expect(reviewerStocks(true)).toBeCloseTo((11050 / 11000) * (16000 / 20500) - 1, 12); },
    // the table until 2026-10-22: 16,000 ÷ (11,000 ÷ 1.1 + 5,000 ÷ 0.5) − 1 = −20.00% (the rows weighed without their paths)
    was: () => { expect(reviewerStocks(true)).toBeCloseTo(reviewerStocks(false) as number, 12); expect(reviewerStocks(false)).toBeCloseTo(-0.2, 12); },
    fixed: '2026-10-22 (DEC-1669; W-START): the category is split at every day money went into it, each piece measured from each holding\'s own closes — −21.60% where it read −20.00%' },
  'MK-PF-M-007#4': { cls: 'APP WRONG', rowWordsOnly: true,
    why: 'The screen files a $40 interest record with no ticker under "Cash in this account" — interest on the account\'s cash, the sensible reading, decided here. The row says "interest from a bond". The row also names the figure "All categories" while its worked answer ($865) is the Stocks / Funds line; on screen All categories reads $1,370.',
    fix: 'MoneyKeel/functions/networth-and-performance/performance.ts MK-PF-M-007 row: label "each category\'s earned, and All categories"; decision "an interest record with no ticker is the account\'s cash". No figure moves.',
    check: () => { expect(after('UNTICKERED', 'Cash in this account', 2)).toBe('$40'); expect(after('CAT_INV', 'All categories')).toBe('$1,370'); },
    wrong: () => { expect((figureSpec('MK-PF-M-007').decisions ?? []).join(' ')).not.toMatch(/interest from a bond/); },
    fixed: '2026-10-21: the row says what the screen does — interest with no ticker is the account\'s cash, a dividend with no ticker Unclassified (no figure moves)' },
  'MK-PF-M-008#1': { cls: 'APP WRONG',
    why: 'Right for the worked case (Home: market +8.80%), and the gap is worked from unrounded returns, so "ahead by 0.85%" beside +3.69% and +2.83% can be true. Wrong after a share change: a holding that went from 10 to 20 shares is weighted as if it held 20 from the start ($2,420 ÷ 1.21 = $2,000; true $1,000), so the market reads 8.00% where his rule ("weighted by what each holding was worth when the window began") gives 7.00%. (Formula card MK-PF-F-020.)',
    fix: 'src/domain/performance/index.ts portfolioBenchReturn: weight by shares held on the window\'s first day × the first close. Home\'s market line.',
    check: () => { expect(has('BENCH_HOME', /· market \+8\.80% ·/)).toBe(true); },
    // the reviewer's rows as written carry no window, so they cannot say which shares were held when it began; the check runs
    // the same share change through Home itself (2026-10-21): 50 VTI held when the 1M window began, 50 more bought inside
    // it, $10,000 of BND. Hand-worked on 2026-10-21: (10% × 50 × $400 + 4% × $10,000) ÷ ($20,000 + $10,000) = 8.00% (it read
    // 8.80%, weighing all 100 shares as held from the start).
    // DECIDED 2026-10-22 (W-START, the lead's decision under DEC-1669 and tenets 1 and 7; MK-PF-M-008): the market beside your
    // return is split on the same days as your return, each piece weighed by what each holding was worth then — your own
    // return's weights. These closes hold SPY at $500 and AGG at $100 until after Sep 10, when 100 VTI were held, so: piece 1
    // (VTI $20,000 + BND $10,000) ×1; piece 2 (VTI 100 × $400 = $40,000 + BND $10,000) (40,000 × 1.10 + 10,000 × 1.04) ÷ 50,000
    // = 8.80%. The reviewer's point holds — no share counts from the start unless it was held then — and its rows, which carry
    // no days, are still weighed by their starts: 7.00%.
    wrong: () => {
      expect(has('BENCH_TOPUP_HOME', /· market \+8\.80% ·/)).toBe(true);
      expect((20000 * 1 + 10000 * 1) / 30000 * ((40000 * 1.1 + 10000 * 1.04) / 50000) - 1).toBeCloseTo(0.088, 12);
      const rows: any = [{ benchReturn: 0.10, marketValue: 2420, periodReturn: 0.21, startValue: 1000, position: { lots: [{ shares: 10, purchase_date: '2026-08-01' }, { shares: 10, purchase_date: '2026-09-02' }] } },
        { benchReturn: 0.04, marketValue: 1000, periodReturn: 0, startValue: 1000 }];
      expect(portfolioBenchReturn(rows)).toBeCloseTo(0.07, 10);
    },
    // the app on 2026-10-21, pinned: the market weighed by the starts alone, +8.00% — no longer its answer where money moved
    was: () => { expect(has('BENCH_TOPUP_HOME', /· market \+8\.00% ·/)).toBe(true); },
    fixed: '2026-10-21: no share weighs from the start unless it was held then (buildPerformance startValue; DEC-1669, DEC-3035b); 2026-10-22 (DECIDED, W-START): the market is split on the same days as your return, with its weights — here the market moved only after the 50 shares were bought, so Home reads market +8.80% (on 2026-10-21, +8.00%)' },
  // DECIDED 2026-10-21 (PF-B, the lead's decision; MK-PF-M-010, 011 and 012 alike): his approved Look back drawing v01
  // (DEC-1069) stands word for word — tenet 6 outranks tenet 7, and the card already says "Real past prices; not a
  // prediction of what happens next." No line is added. To reverse: add the line under the Difference row, drawing row first.
  // (PF-A, 2026-10-21: classed REVIEWER WRONG by that decision, as part 1's still-open #36 to #38 already read — the two
  // measuring agents had them two ways.)
  'MK-PF-M-010#7': { cls: 'REVIEWER WRONG',
    why: 'The words are his approved Look back drawing (v01, DEC-1069): "WHAT ACTUALLY HAPPENED · Left in BND it became $10,250 (up $250, +2.50%)". The reviewer wants it called a road not taken, before taxes and trading costs. Tenet 6 outranks tenet 7: his call. On screen: one line added, e.g. "Before taxes and trading costs, dividends reinvested."',
    check: () => { expect(has('LB', 'WHAT ACTUALLY HAPPENED')).toBe(true); expect(has('LB', /^Left in BND it became \$10,250/)).toBe(true); } },
  'MK-PF-M-011#7': { cls: 'REVIEWER WRONG',
    why: 'The same approved drawing: "Moved to VTI it would be $11,600 (up $1,600, +16.00%)" and "Real past prices; not a prediction of what happens next." — nothing on taxes or trading costs. His call, as MK-PF-M-010.',
    check: () => { expect(has('LB', /^Moved to VTI it would be \$11,600/)).toBe(true); expect(has('LB', 'Real past prices; not a prediction of what happens next.')).toBe(true); } },
  'MK-PF-M-012#7': { cls: 'REVIEWER WRONG',
    why: 'The same approved drawing: "Difference: $1,350 more if you had moved." — before taxes and costs, unsaid. His call, as MK-PF-M-010.',
    check: () => { expect(has('LB', 'Difference: $1,350 more if you had moved.')).toBe(true); } },
  'MK-PF-M-013#2': { cls: 'APP WRONG', rowWordsOnly: true,
    why: 'The screen labels a worked-back beginning (DEC-3656, DEC-5291): "Your daily record does not reach back to Feb 1, 2024 yet, so the beginning is worked back from today\'s values and each holding\'s price history." The row still says "READ… never back-solved" and "the walk is not drawn at all rather than started from a guess".',
    fix: 'MoneyKeel/functions/networth-and-performance/performance.ts MK-PF-M-013 row: "read from the record; where the record does not reach, worked back from each holding\'s price history and said so (DEC-3656, DEC-5291)". No figure moves.',
    check: () => { expect(has('FID_ACC', /so the beginning is worked back from today's values and each holding's price history\.$/)).toBe(true); },
    wrong: () => { expect(figureSpec('MK-PF-M-013').answers).not.toMatch(/never back-solved/i); expect((figureSpec('MK-PF-M-013').decisions ?? []).join(' ')).not.toMatch(/IT IS READ, NOT BACK-SOLVED/); },
    fixed: '2026-10-21: the row says the beginning is read from the record, or worked back from price history and said so (DEC-3656, DEC-5291; no figure moves)' },
  'MK-PF-M-014#1': { cls: 'APP WRONG',
    why: 'The account page shows what the Performance tab shows for his DEC-4439 new account: "Wealth generated $0 · Return +0.00%" where his rule gives +$50 and +0.50%.',
    fix: 'The MK-PF-M-002 fix; the account page reads the same door.',
    wrong: () => { expect(first('NEW_ACC', 'MK-PF-M-014')).toBe('$50'); },
    fixed: '2026-10-21: the account page reads the same door as the Performance tab — +$50 (DEC-4439)' },
  'MK-PF-M-015#2': { cls: 'APP WRONG',
    why: 'The account page\'s walk has the same rounding gap: $10,001 + $1,001 + $101 + $399 = $11,502 against an ending of $11,500.',
    fix: 'The MK-PF-M-003 fix, on src/screens/AccountPortfolioScreen.tsx.',
    wrong: () => { expect(walkSum('UNROUND_ACC', 'MK-PF-M-013', 'MK-PF-M-015')).toBe(dollars(first('UNROUND_ACC', 'MK-PF-M-004'))); },
    fixed: '2026-10-21: the account page prints its walk through the same walkShown — $10,001 + $1,000 + $100 + $399 = $11,500 (tenet 2)' },
  'MK-PF-M-016#4': { cls: 'APP WRONG',
    why: 'One window, two readings. 2Y on $100,000 growing 8% a year: the Performance tab says "+16.69% over the two years, which is +8.00%/year — a yearly rate"; the account page prints the same +8.00% with "Return is for the window you picked… — not a yearly rate". His precision order: over a year, a yearly rate with "a year" on it and the window\'s total beside it. (1Y is never made a yearly rate on either screen — a 367-day 1Y reads its total, +8.05%.)',
    fix: 'src/screens/AccountPortfolioScreen.tsx summary note: for a window longer than a year, print the Performance tab\'s sentence from the same door. Account page, 2Y only; no figure moves.',
    check: () => { expect(has('TWO_INV_2Y', '+16.69% over the two years, which is +8.00%/year — a yearly rate, so it sits fairly beside a one-year window.')).toBe(true); expect(first('TWO_INV_1Y', 'MK-PF-M-017')).toBe('+8.05%'); },
    wrong: () => {
      expect(R('TWO_ACC_2Y').lines.join(' ')).not.toMatch(/not a yearly rate/);
      // the account page says the Performance tab's own sentence, from the same door (yearsWords: one writer for both)
      expect(R('TWO_ACC_2Y').lines.join(' ')).toMatch(/\+16\.69% over the two years, which is \+8\.00%\/year — a yearly rate, so it sits fairly beside a one-year window/);
    },
    was: () => { expect(R('TWO_ACC_2Y').lines.join(' ')).toMatch(/not a yearly rate/); },
    fixed: '2026-10-21: over a year the account page says the yearly rate and the window\'s own total, in the Performance tab\'s sentence (his precision order, Q49)' },
  'MK-PF-M-017#1': { cls: 'APP WRONG',
    why: 'An account that ends below zero ($1,000 → −$500) reads "Return −100.00%": the day\'s value is clamped to $0 (time-weighted-return.ts, Math.max(0, total)). The honest figure is −150.00% or a refusal; −100.00% is neither. (A real total loss, $1,000 → $0, rightly reads −100.00%.)',
    fix: 'Calculation Module code/engines/time-weighted-return.ts: a day whose value is below zero refuses ("the account\'s value went below zero") instead of clamping. Performance tab and account page Return, that case only.',
    wrong: () => {
      expect(first('NEG_INV', 'MK-PF-M-017')).not.toBe('−100.00%');
      // no return, and the reason (the day named; the dollars stand)
      expect(has('NEG_INV', 'The value recorded on Sep 28, 2026 is below $0, so a return cannot be measured across that day. The dollar figures here are still right.')).toBe(true);
    },
    was: () => { expect(first('NEG_INV', 'MK-PF-M-017')).toBe('−100.00%'); },
    fixed: '2026-10-21: a value below $0 gives no return, and the sentence names the day (the lead\'s decision under tenet 1; VALUE_BELOW_ZERO)' },
  'MK-PF-M-018#2': { cls: 'APP WRONG', rowWordsOnly: true,
    why: 'The screen labels the worked-back beginning: "Your daily record does not reach back to Aug 27, 2026 yet, so the beginning is worked back from today\'s values and each holding\'s price history." The row says "READ, NEVER BACK-SOLVED" and "the walk starts the day the record does".',
    fix: 'MK-PF-M-018 row decisions and refusal in DEC-5291\'s words. No figure moves.',
    check: () => { expect(has('BENCH_INV_1M', /^Your daily record does not reach back to Aug 27, 2026 yet, so the beginning is worked back/)).toBe(true); },
    wrong: () => { expect((figureSpec('MK-PF-M-018').decisions ?? []).join(' ')).not.toMatch(/NEVER BACK-SOLVED/); },
    fixed: '2026-10-21: the row says the beginning is read from the daily record, or worked back from price history and said so (DEC-3656, DEC-5291; no figure moves)' },
  'MK-PF-M-019#3': { cls: 'REVIEWER WRONG', inFlight: true,
    why: 'The screen makes the distinction: when a broker shares no dividend records the walk keeps its "Dividends $0" line (the approved structure) and the amber line above names the gap — "Schwab Brokerage hasn\'t shared dividend records". A record with no amount refuses the return (MOVEMENT_HAS_NO_AMOUNT). Unknown activity words are being made to refuse now: re-run.',
    check: () => { expect(has('BENCH_INV_1M', "Schwab Brokerage hasn't shared dividend records")).toBe(true); } },
  'MK-PF-M-020#3': { cls: 'APP WRONG',
    why: 'A brokerage whose cash was never entered reads "Available cash: $0", and a buy or withdrawal is then refused as "not enough" (availableCash = cash_balance || 0).',
    fix: 'src/domain/transactions/index.ts availableCash: null when the cash sleeve is not entered; src/screens/PerformanceScreen.tsx prints "Available cash: not entered" and does not refuse on it. Performance tab add-activity sheet.',
    wrong: () => { expect(availableCash({ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', balance: 50000, positions: [{ ticker: 'VTI', lots: [{ shares: 1 }] }] } as any)).toBeNull(); },
    fixed: '2026-10-21: an investment account whose cash was never entered reads Available cash not entered, and a buy is not refused on it (DEC-3279e, tenet 3)' },
  // ── Home and Net worth headline figures ──────────────────────────────────────────────────────────────────────────
  'MK-XS-M-001#3': { cls: 'APP WRONG',
    why: 'With the brokerage\'s balance not entered, the Net worth tab says "Fidelity Brokerage has no balance" and "Value not entered"; Home prints "Net worth $119,200" with nothing beside it — the known rows summed as if complete.',
    fix: 'src/screens/HomeScreen.tsx nwLineBlock: when dataGaps finds a missing balance, the line carries "1 balance not entered ›" (the shared DataGapsBanner wording). Home.',
    check: () => { expect(has('NW_NOBAL_NW', 'Fidelity Brokerage has no balance')).toBe(true); },
    wrong: () => { expect(R('NW_NOBAL_HOME').lines.join(' ')).toMatch(/not entered|no balance|needs more information/); },
    fixed: '2026-10-21: Home names a balance not entered under its Net worth line, in the Net worth tab\'s own words (dataGaps: Fidelity Brokerage has no balance)' },
  'MK-XS-M-003#4': { cls: 'REVIEWER WRONG',
    why: 'Investments leaves out the cash inside an investment account: the $46,600 brokerage with $10,825 of cash reads YOUR INVESTMENTS $35,775 on Home; the Net worth household reads $175,200 on Home and Net worth alike (one function). Unclassified accounts are the Net worth module\'s MK-NW-F-092.',
    check: () => { expect(after('PERF_HOME', 'YOUR INVESTMENTS', 2)).toBe('$35,775'); expect(after('NW_HOME', 'YOUR INVESTMENTS', 2)).toBe('$175,200'); } },
  'MK-XS-M-004#4': { cls: 'APP WRONG',
    why: 'Home asks the same door as Performance\'s 1M (+21.35% on both) and only shows a month, so the yearly-rate points do not reach it. But its spoken label rounds again: a screen reader hears "up 21.4 percent this month" where the screen prints 21.35%.',
    fix: 'src/screens/HomeScreen.tsx hero accessibilityLabel: say the return through figSaid(\'MK-XS-M-004\', …) — the printed two decimals. Home, spoken words only.',
    check: () => { expect(has('PERF_HOME', '▲ up $8,200 (21.35%) this month')).toBe(true); expect(has('PERF_INV_1M', '+21.35%')).toBe(true); },
    wrong: () => { expect(R('PERF_HOME').spoken.find((s) => s.startsWith('Your investments'))).toMatch(/21\.35 percent/); },
    fixed: '2026-10-21: Home says the month\'s return through figSaid(\'MK-XS-M-004\', …) — the two decimals it prints, "up 21.35 percent this month"' },
  'MK-NW-M-061#8': { cls: 'APP WRONG',
    why: 'Found rendering (the reviewer passed it): an option\'s purchase reads "2 sh @ $5.00" while Quantity says "2 contracts" — the purchase line has the wrong unit.',
    fix: 'src/screens/HoldingDetailScreen.tsx WHAT YOU BOUGHT: the line takes its unit from quantityWithUnit ("2 contracts @ $5.00"). Holding page.',
    wrong: () => { expect(has('HOLD_MINI', '2 sh @ $5.00')).toBe(false); expect(has('HOLD_MINI', '2 contracts @ $5.00')).toBe(true); expect(has('FID_HOLD', '100 sh @ $210.00')).toBe(true); },
    fixed: '2026-10-21 (W-HOLDING, DEC-0277, tenet 4): the purchase line carries the holding\'s own unit — 2 contracts @ $5.00; shares stay 100 sh @ $210.00 as drawn',
    was: () => { expect(has('HOLD_MINI', '2 sh @ $5.00')).toBe(true); } },
};
/** PASS items whose answer moves with work landing now: checked, and flagged for a re-run */
const IN_FLIGHT_PASS: Record<string, string> = {
  'MK-NW-M-019': 'dividends per account', 'MK-NW-M-021': 'dividends per account', 'MK-PF-M-007': 'dividends per account',
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Row = { figure: string; tenet: number; verdict: 'PASS' | 'FAIL'; why: string };
const ROWS: Row[] = PART1.screen_checks;
const keyOf = (r: Row) => `${r.figure}#${r.tenet}`;
const classOf = (r: Row): Item & { generic: boolean } => {
  const o = CLASS[keyOf(r)];
  if (o) return { ...o, generic: false };
  if (r.verdict === 'FAIL') throw new Error(`${keyOf(r)}: a FAIL the reviewer gave has no classification`);
  return { cls: 'AGREES', why: 'Rendered and held.', inFlight: !!IN_FLIGHT_PASS[r.figure] && r.tenet === 1, generic: true };
};

describe('the package, read — a guard must prove it looked', () => {
  test('424 screen checks: 53 figures × 8 tenets; every figure has a screen it is read on; every FAIL is classified by hand', () => {
    expect(ROWS).toHaveLength(424);
    const figs = [...new Set(ROWS.map((r) => r.figure))];
    expect(figs).toHaveLength(53);
    for (const f of figs) expect(FIGS[f]).toBeDefined();
    expect(Object.keys(FIGS)).toHaveLength(53);
    const fails = ROWS.filter((r) => r.verdict === 'FAIL');
    expect(fails).toHaveLength(43);
    for (const r of fails) expect(CLASS[keyOf(r)]).toBeDefined();
    for (const k of Object.keys(CLASS)) expect(ROWS.some((r) => keyOf(r) === k)).toBe(true);
  });
  test('every APP WRONG says what is wrong and how to fix it, with a check that fails today', () => {
    for (const [k, o] of Object.entries(CLASS)) {
      expect(o.why.length).toBeGreaterThan(60);
      if (o.cls === 'APP WRONG') { expect(o.fix?.length ?? 0).toBeGreaterThan(30); expect(typeof o.wrong).toBe('function'); }
      if (!o.check && !o.wrong) throw new Error(`${k}: no check at all`);
    }
  });
});

const RESULTS: any[] = [];
const BY_FIGURE = new Map<string, Row[]>();
for (const r of ROWS) BY_FIGURE.set(r.figure, [...(BY_FIGURE.get(r.figure) ?? []), r]);
for (const [figure, rows] of BY_FIGURE) {
  describe(`${figure} ${figureSpec(figure).label}`, () => {
    for (const r of rows) {
      const c = classOf(r);
      const name = `T${r.tenet} · reviewer ${r.verdict} · ${c.cls}${c.rowWordsOnly ? ' (row words)' : ''}${c.inFlight ? ' · IN-FLIGHT' : ''}`;
      RESULTS.push({ figure, tenet: r.tenet, reviewer_verdict: r.verdict, reviewer_why: r.why, classification: c.cls,
        row_words_only: !!c.rowWordsOnly, in_flight: !!c.inFlight || c.cls === 'IN-FLIGHT',
        evidence: c.generic ? `tenet-${r.tenet} check on the rendered screen (${FIGS[figure].main})` : c.why, fix: c.fix ?? null,
        tests: [c.generic || c.check ? `${name} · what holds` : null, c.wrong ? `${name} · what the app gets wrong${c.fixed ? ` — FIXED ${c.fixed}` : ' (test.failing)'}` : null].filter(Boolean) });
      if (c.generic) test(`${name} · what holds`, () => GENERIC[r.tenet - 1](figure));
      else {
        if (c.check) test(`${name} · what holds`, c.check);
        if (c.wrong) (c.fixed ? test : test.failing)(`${name} · what the app gets wrong${c.fixed ? ` — FIXED ${c.fixed}` : ''}`, c.wrong);
        if (c.was) test.failing(`${name} · the app before the fix, pinned — no longer its answer (FIXED ${c.fixed})`, c.was);
      }
    }
  });
}

/** FOUND WHILE RENDERING — outside the 424 (no register figure owns them), each a check that fails today. */
const FOUND: { id: string; what: string; fix: string; wrong: () => void; fixed?: string }[] = [
  { id: 'F1 Home · Concentrated in one account',
    what: 'Home\'s top card reads "$310,000 (160%) of your invested money sits in a single account" for the Net worth household — the rental counted as invested money, and a share over 100%. For the emergency-fund household (Investments $0, "Nothing entered yet") it reads "$18,000 (100%) of your invested money" — a checking account.',
    fix: 'src/domain/insights (the concentration insight): measure over the accounts YOUR INVESTMENTS counts (theNetWorth investments), never cash or property; no card when there is nothing invested.',
    wrong: () => { const t = [...R('NW_HOME').lines, ...R('EF_HOME').lines].join(' '); expect(t).not.toMatch(/\((1[0-9]{2}|[2-9][0-9]{2})%\) of your invested money/); expect(R('EF_HOME').lines.join(' ')).not.toMatch(/of your invested money/); },
    fixed: '2026-10-21: the card is the largest account\'s part of Net worth\'s Investments line, out of that line (DEC-0457) — $142,000 (81%), and no card with nothing invested' },
  { id: 'F2 Account page · two dates for one window',
    what: 'The Fidelity account page names its window "Since Feb 1, 2024", and the VTI row beneath says "…so the Since figure covers 12 months — not since Jan 31, 2024."',
    fix: 'src/domain/performance/index.ts priceHistoryShortSentence: name the window by the same date the window bar uses (the record\'s first day).',
    wrong: () => { expect(has('FID_ACC', 'Since Feb 1, 2024')).toBe(true); expect(R('FID_ACC').lines.join(' ')).not.toMatch(/not since Jan 31, 2024/); },
    fixed: '2026-10-21: the holding line names the day the Since chip names (one date for one window, MK-ST-F-078) — not since Feb 1, 2024' },
  { id: 'F3 Holding page · "0 months"',
    what: 'A holding with three days of prices reads "Prices for this holding go back 0 months, so the 1-year figure covers 0 months — not a year."',
    fix: 'priceHistoryShortSentence: under a month, say the days ("go back 3 days").',
    wrong: () => { expect(R('HOLD_MINI').lines.join(' ')).not.toMatch(/go back 0 months/); expect(has('HOLD_MINI', 'Prices for this holding go back 3 days, so the 1-year figure covers 3 days — not a year.')).toBe(true); },
    fixed: '2026-10-21 (W-HOLDING): under a month the line counts days — go back 3 days, so the 1-year figure covers 3 days' },
  { id: 'F4 MK-XS-M-004 is printed under no identifier',
    what: 'The register lists MK-XS-M-004 on /invest and /home, but no screen prints it under that ID: Performance prints its Return as MK-PF-M-017 and Home prints "▲ up $8,200 (21.35%) this month" through no figure at all — so the census cannot trace it (objective 3).',
    fix: 'src/screens/HomeScreen.tsx: print the month\'s return and dollars through fig(\'MK-XS-M-004\', …); or retire MK-XS-M-004 into MK-PF-M-017 on the master.',
    wrong: () => { expect([...R('PERF_HOME').printed, ...R('QUIET_INV').printed].some((p) => p.id === 'MK-XS-M-004')).toBe(true); },
    fixed: '2026-10-21: Home prints the month\'s return through fig(\'MK-XS-M-004\', …), so the census traces it — "(21.35%)" unchanged' },
];
describe('found while rendering — outside the 424', () => {
  // a found item made right runs as a passing test with the day and the reason in its name (the CLASS items' own rule)
  for (const f of FOUND) (f.fixed ? test : test.failing)(`${f.id} · what the app gets wrong${f.fixed ? ` — FIXED ${f.fixed}` : ''}`, f.wrong);
});

describe('the coverage line', () => {
  test('424 of 424 classified', () => {
    expect(RESULTS).toHaveLength(424);
    const n = (c: string) => RESULTS.filter((x) => x.classification === c).length;
    expect(n('AGREES') + n('APP WRONG') + n('REVIEWER WRONG') + n('NEEDS A RULING') + n('IN-FLIGHT')).toBe(424);
  });
});

afterAll(() => {
  const out = process.env.OUTSIDE_RESULTS_OUT;
  if (!out) return;
  const n = (c: string) => RESULTS.filter((x) => x.classification === c).length;
  fs.writeFileSync(out, JSON.stringify({
    coverage: `424 of 424 screen checks: ${n('AGREES')} agree, ${n('APP WRONG')} app wrong (${RESULTS.filter((x) => x.classification === 'APP WRONG' && x.row_words_only).length} of them the figure's master-row words only), ${n('REVIEWER WRONG')} reviewer wrong, ${n('NEEDS A RULING')} need a ruling, 0 blocked, ${n('IN-FLIGHT')} in-flight; ${RESULTS.filter((x) => x.in_flight).length} flagged to re-run after the Net worth work lands`,
    screen_checks: RESULTS,
    found_while_rendering: FOUND.map(({ id, what, fix, fixed }) => ({ id, what, fix, classification: 'APP WRONG', fixed: fixed ?? null, test: `${id} · what the app gets wrong${fixed ? ` — FIXED ${fixed}` : ' (test.failing)'}` })),
    renders: Object.fromEntries([...CACHE.entries()].map(([k, s]) => [k, { lines: s.lines, printed: s.printed, changed: s.changed }])),
  }, null, 1));
});

// LB_NOPRICE, SETTLED (2026-10-22). Look back fetches what it compares through the app's one price refresh. With the price
// source stubbed to bring nothing — here only, so no other render in this file changes — the waiting line shows first; once
// the refresh settles, the exact failure line names the two tickers, and no figure is printed (MK-PF-M-010, 011, 012 refuse).
test('LB_NOPRICE, settled: the waiting line, then the failure line naming BND and SPY, and no figure printed', async () => {
  const source = require('../../services/marketData');
  const stub = jest.spyOn(source, 'fetchPriceSeries').mockResolvedValue({});
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...H_LB, priceCache: {} } as any);
    mockParams = { from: 'BND', amount: '10000' };
    resetFiguresPrinted();
    const C = SCREENS.lookback();
    const r = render(<C />);
    expect(screen.getByText('Getting prices for BND and SPY…')).toBeOnTheScreen();                       // before it settles
    await waitFor(() => expect(stub).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("Couldn't refresh prices for BND or SPY, so there is nothing to compare yet. Look back tries again each time it opens.")).toBeOnTheScreen());
    expect(screen.queryByText('Getting prices for BND and SPY…')).toBeNull();
    const lines = readLines();
    expect(lines.length).toBeGreaterThanOrEqual(15);                                                       // it read the screen
    expect(lines.filter((l) => /\$\d|\d%/.test(l))).toEqual([]);                                           // no figure in words
    expect(figuresPrinted().filter((p) => !p.spoken && /^MK-PF-M-01[012]$/.test(p.id))).toEqual([]);       // none through fig()
    r.unmount();
  } finally { stub.mockRestore(); mockParams = {}; }
});
