/** EIGHT NET WORTH FIGURES THE PERFORMANCE RE-RUN'S SCREEN CHECKS FOUND WRONG (OpenAI package of 2026-10-13, part 1) — MADE
 *  RIGHT 2026-10-21, each held here with the cross-screen agreement it needs (CLAUDE.md: one concept, one function, one number).
 *
 *  The findings are recorded, and now pass, in src/screens/__tests__/outside_performance_rerun_openai_01_screens.test.tsx
 *  (MK-NW-M-020 T2, MK-PF-M-004 T4, MK-NW-M-012 T3, MK-NW-M-013 T4, MK-NW-M-028 T3, MK-XS-M-001 T3, F1, F2) and
 *  MoneyKeel/functions/networth-and-performance/outside_performance_rerun_openai_01_rules.test.ts (owner-7). This file
 *  holds what each fix promises beyond the one line the measurement read:
 *    1. The broker's total is more than what it lists: the difference is cash (DEC-0095) — the account page's cash row and
 *       Net worth's Cash line are one figure, and the rows add up to the total.
 *    2. A debt whose payment was never entered is named, never a silent $0 (DEC-3523 tenet 3) — by one test, on both doors.
 *    3. Job safety's savings are the emergency fund's cash on Net worth (MK-NW-M-013): one figure on both screens.
 *    4. A CD whose "bank or broker?" was never answered asks it (DEC-3837), and the answer is kept.
 *    5. A holding nothing classes is Unclassified on Net worth, the account page and the Performance tab alike (DEC-2160).
 *    6. One date for one window on the account page (the one date writer, MK-ST-F-078).
 *    7. Home names a balance not entered under its Net worth line, in the Net worth tab's own words (MK-XS-M-001).
 *    8. Home's one-account card is a share of Net worth's Investments line, never of cash or property (DEC-0457).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { theNetWorth, paymentNotEntered } from '../../../MoneyKeel/functions/networth-and-performance/net-worth';
import { theEmergencyFund } from '../../../MoneyKeel/functions/networth-and-performance/emergency-fund';
import { theAccount } from '../../../MoneyKeel/functions/networth-and-performance/account';
import { theBonds } from '../../../MoneyKeel/functions/networth-and-performance/bonds';
import { categoryEarnings } from '../../../MoneyKeel/functions/networth-and-performance/performance';
import { accountClassBreakdown, accountInvestments, uninvestedCashOf } from '../../domain/assets';
import { dataGaps } from '../../domain/gaps';
import { priceHistoryShortSentence } from '../../domain/performance';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

// ── reading a screen: every Text in order, as a person reads it ──────────────────────────────────────────────────────
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
  networth: () => require('../NetWorthScreen').default, account: () => require('../AccountPortfolioScreen').default,
  home: () => require('../HomeScreen').default, jobsafety: () => require('../JobSafetyScreen').default,
  invest: () => require('../PerformanceScreen').default,
};
type Shot = { lines: string[]; printed: { id: string; text: string }[] };
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
/** Render one screen on one household on 28 Sep 2026; `act` presses something, then the screen is read again. */
function shoot(name: string, state: any, params: Record<string, string | undefined> = {}, act?: () => void): Shot {
  jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00'), doNotFake: [...FAKE] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, nwSetupChoice: 'self', ...state } as any);
    mockParams = params;
    const C = SCREENS[name]();
    const r = render(<C />);
    if (act) act();
    resetFiguresPrinted();
    r.rerender(<C />);
    const shot = { lines: readLines(), printed: figuresPrinted().filter((p) => !p.spoken).map((p) => ({ id: p.id, text: p.text })) };
    r.unmount();
    return shot;
  } finally { jest.useRealTimers(); }
}
const dollars = (s: string) => Number(s.replace('−', '-').replace(/[^0-9.\-]/g, ''));
const after = (L: string[], label: string, n = 1) => { const i = L.indexOf(label); return i >= 0 ? L[i + n] : undefined; };
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const txn = (id: string, account_id: string, type: string, amount: number, date: string, extra: any = {}) => ({ id, txn_id: id, account_id, type, amount, date, source: 'connected', ...extra });

// ── the households (the re-run's own, in the store's shapes) ────────────────────────────────────────────────────────
/** A linked Schwab brokerage: the broker says $50,000; it lists 100 VTI at $400 ($40,000) and $5,000 of cash. */
const GAP_ACCOUNT = { asset_id: 'g', label: 'Schwab Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50_000,
  cash_balance: 5_000, source: 'connected', last_synced: '2026-09-28T08:00:00Z',
  positions: [{ position_id: 'p', ticker: 'VTI', asset_class: 'stock_etf', last_price: 400, lots: [{ lot_id: 'x', shares: 100, cost_per_share: 300, purchase_date: '2024-01-01' }] }] };
const H_GAP = { assetAccounts: [GAP_ACCOUNT], transactions: [], snapshotDays: [], priceCache: { VTI: closes([['2026-09-25', 400], ['2026-09-28', 400]]) }, pricesFetchedAt: '2026-09-28T11:00:00Z' };

/** Checking $18,000, a brokerage $142,000, a Treasury $24,200, a rental $310,000 and gold $9,000; a mortgage and a car loan. */
const NW_ACCOUNTS = [
  { asset_id: 'a1', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'TAXABLE', balance: 18000, target_return: 0, asset_class: 'cash' },
  { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 142000, target_return: 0.07, asset_class: 'stocks_etf' },
  { asset_id: 'a3', label: 'US Treasury 2029', institution: 'Fidelity', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24200, target_return: 0.045, asset_class: 'bonds' },
  { asset_id: 'a4', label: 'Rental duplex', kind: 'real_estate', tax_bucket: 'TAXABLE', balance: 310000, target_return: 0.03, asset_class: 'real_estate', re_use: 'rental' },
  { asset_id: 'a5', label: 'Gold', institution: 'Vault', kind: 'commodity', tax_bucket: 'TAXABLE', balance: 9000, target_return: 0, asset_class: 'alternatives' },
];
const MORTGAGE = { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400 };
const CAR_LOAN = { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 };
const H_NW = { assetAccounts: NW_ACCOUNTS, liabilities: [MORTGAGE, CAR_LOAN], onboardingProfile: { status: 'employed', birthYear: '1970' } };
const H_NOPAY = { ...H_NW, liabilities: [MORTGAGE, { ...CAR_LOAN, minimum_monthly_payment: undefined }] };
const H_NOBAL = { ...H_NW, assetAccounts: NW_ACCOUNTS.map((a) => (a.asset_id === 'a2' ? { ...a, balance: null } : a)) };

/** $18,000 checking and a home; a $2,400 mortgage, a $250 car loan, a $120 card; groceries $700 an essential. Nothing logged. */
const H_EF = { expenses: [],
  assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 18000, target_return: 0, asset_class: 'cash' },
                  { asset_id: 'h1', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, re_use: 'primary' }],
  liabilities: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 320000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400 },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
    { debt_id: 'd3', label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 3100, interest_rate_apr: 0.2199, minimum_monthly_payment: 120 }],
  onboardingProfile: { status: 'employed', birthYear: '1970', monthlySpending: '0', spendCats: [
    { id: 'rent', label: 'Rent / Mortgage', amount: 2400, bucket: 'fixed', tier: 'need' }, { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' },
    { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible', tier: 'flex' }] } };
/** The same household with a $10,000 brokerage beside the checking. */
const H_EF_INV = { ...H_EF, assetAccounts: [...H_EF.assetAccounts,
  { asset_id: 'b1', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0.07, asset_class: 'stocks_etf' }] };

/** A $10,000 Ally CD at 5.05% to Mar 15, 2027, added before the bank-or-broker question existed: nothing answered. */
const CD = { asset_id: 'b2', label: 'Ally 12-month CD', institution: 'Ally', kind: 'bond', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0, face_value: 10000, coupon_rate: 0.0505, maturity_date: '2027-03-15' };

/** A linked brokerage: 10 QQ at $100 that nothing classes, and 10 VTI at $400; a $50 dividend from QQ in June. */
const H_UNCL = { assetAccounts: [{ asset_id: 'u', label: 'Schwab Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 5000, cash_balance: 0,
    source: 'connected', last_synced: '2026-09-28T08:00:00Z',
    positions: [{ position_id: 'q', ticker: 'QQ', last_price: 100, lots: [{ lot_id: 'a', shares: 10, cost_per_share: 80, purchase_date: '2024-01-01' }] },
                { position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', last_price: 400, lots: [{ lot_id: 'b', shares: 10, cost_per_share: 300, purchase_date: '2024-01-01' }] }] }],
  transactions: [txn('d', 'u', 'DIVIDEND', 50, '2026-06-01', { ticker: 'QQ' })],
  priceCache: { QQ: closes([['2025-12-31', 90], ['2026-09-28', 100]]), VTI: closes([['2025-12-31', 380], ['2026-09-28', 400]]) },
  pricesFetchedAt: '2026-09-28T11:00:00Z', snapshotDays: [] };

/** A linked Fidelity brokerage, no daily record: its first money moved on Feb 1, 2024; VTI's prices go back to Sep 26, 2025. */
const FID = { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 46600,
  target_return: 0.07, source: 'connected', last_synced: '2026-09-28T08:00:00Z', cash_balance: 6000,
  positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', label: 'Vanguard Total Market', unit: 'shares', last_price: 290,
    lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' }, { lot_id: 'l2', shares: 40, cost_per_share: 265, purchase_date: '2026-06-01' }] }] };
const H_FID = { assetAccounts: [FID], snapshotDays: [], pricesFetchedAt: '2026-09-28T11:00:00Z',
  transactions: [txn('t1', 'a2', 'DIVIDEND', 420, '2026-06-20', { ticker: 'VTI' }), txn('t2', 'a2', 'DIVIDEND', 405, '2026-03-20', { ticker: 'VTI' }),
    txn('t3', 'a2', 'BUY', 4000, '2024-02-01', { ticker: 'VTI', shares: 20, price: 200 }), txn('t4', 'a2', 'SELL', 5700, '2026-08-10', { ticker: 'VTI', shares: 20, price: 285 })],
  priceCache: { VTI: closes([['2025-09-26', 250], ['2026-09-25', 287.69], ['2026-09-28', 290]]) } };

const nwOf = (s: any) => theNetWorth({ uid: 'x', accounts: s.assetAccounts, debts: s.liabilities ?? [], snapshotDays: [], transactions: [], since: '2026-09-28', today: '2026-09-28' } as any);
const efOf = (s: any) => theEmergencyFund({ accounts: s.assetAccounts, debts: s.liabilities ?? [], expenses: s.expenses ?? [], profile: s.onboardingProfile ?? {} });

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('1 · the broker says more than it lists: the difference is cash (DEC-0095), and the page adds up', () => {
  test('the door: Cash $5,000 + $5,000 not listed = $10,000; Unclassified holds nothing; Stocks / Funds $40,000', () => {
    const b = accountClassBreakdown(GAP_ACCOUNT as any)!;
    expect(b.cash).toBe(10_000);
    expect(b.stocks_etf).toBe(40_000);
    expect(b.mixed).toBe(0);
    expect(uninvestedCashOf(GAP_ACCOUNT as any)).toBe(10_000);
    expect(theAccount({ account: GAP_ACCOUNT as any, transactions: [] }).uninvestedCash).toBe(10_000);
  });
  test('the account page: the rows read Stocks / Funds $40,000 and Cash $10,000 — $50,000, the market value above them', () => {
    const s = shoot('account', H_GAP, { id: 'g' });
    const rows = s.printed.filter((p) => p.id === 'MK-NW-M-020').map((p) => dollars(p.text));
    expect(rows.reduce((t, v) => t + v, 0)).toBe(50_000);
    expect(after(s.lines, '▾ CASH')).toBe('$10,000');
    expect(after(s.lines, 'uninvested balance')).toBe('$10,000');
    expect(after(s.lines, 'Total')).toBe('$50,000');
  });
  test('agreement: the account page\'s cash row is the Cash Net worth counts for that account', () => {
    const acct = shoot('account', H_GAP, { id: 'g' });
    const nw = shoot('networth', H_GAP);
    expect(nwOf(H_GAP).cash).toBe(10_000);
    expect(after(nw.lines, '▾ 💵 CASH')).toBe('$10,000');
    expect(after(acct.lines, '▾ CASH')).toBe(after(nw.lines, '▾ 💵 CASH'));
  });
  test('unchanged: an account that lists no holdings keeps a difference under its own class (a CD ladder sending only its total)', () => {
    const ladder = { asset_id: 'l', label: 'CD ladder', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 30_000, cash_balance: 1_000, source: 'connected', positions: [] };
    const b = accountClassBreakdown(ladder as any)!;
    expect(b.bonds).toBe(29_000);
    expect(b.cash).toBe(1_000);
    expect(uninvestedCashOf(ladder as any)).toBe(1_000);
  });
  test('unchanged: a holding with no price takes the difference, never cash (outside review, 2026-10-05)', () => {
    const unpriced = { ...GAP_ACCOUNT, positions: [...GAP_ACCOUNT.positions, { position_id: 'z', ticker: 'ZZ', asset_class: 'stock_etf', lots: [{ lot_id: 'z', shares: 5 }] }] };
    const b = accountClassBreakdown(unpriced as any)!;
    expect(b.cash).toBe(5_000);
    expect(b.stocks_etf).toBe(45_000);
    expect(uninvestedCashOf(unpriced as any)).toBe(5_000);
  });
});

describe('2 · a debt whose payment was never entered is named, never a silent $0 (DEC-3523 tenet 3)', () => {
  test('one test on both doors: the car loan is named; the sums count what is known and stay numbers', () => {
    const nw = nwOf(H_NOPAY); const ef = efOf(H_NOPAY);
    expect(nw.debtPaymentsNotEntered).toEqual([{ id: 'd2', label: 'Car loan' }]);
    expect(ef.paymentsNotEntered).toEqual(nw.debtPaymentsNotEntered);
    expect(nw.monthlyDebtPayments).toBe(2400);           // it read NaN: requiredPayment gave no number for the car loan
    expect(ef.debtMinimums).toBe(2400);
  });
  test('entered is entered: a typed $0, a lump due in full, and a payment entered without a minimum are not named', () => {
    expect(paymentNotEntered({ ...CAR_LOAN, minimum_monthly_payment: 0 })).toBe(false);
    expect(paymentNotEntered({ ...CAR_LOAN, minimum_monthly_payment: undefined, payment_type: 'due_in_full' })).toBe(false);
    expect(paymentNotEntered({ ...CAR_LOAN, minimum_monthly_payment: undefined, monthly_payment: 300 })).toBe(false);
    expect(paymentNotEntered({ ...CAR_LOAN, minimum_monthly_payment: undefined })).toBe(true);
    const paysOnly = { ...H_NW, liabilities: [MORTGAGE, { ...CAR_LOAN, minimum_monthly_payment: undefined, monthly_payment: 300 }] };
    expect(efOf(paysOnly).debtMinimums).toBe(2700);       // the payment on record counts where no minimum was entered
    expect(nwOf(paysOnly).monthlyDebtPayments).toBe(2700);
  });
  test('Net worth: the emergency fund card names it beside the debt payments, and nothing is named when every payment is in', () => {
    const s = shoot('networth', H_NOPAY);
    const i = s.lines.indexOf('Both include $2,400/month of debt payments you cannot stop.');
    expect(i).toBeGreaterThan(0);
    expect(s.lines[i + 1]).toBe('Car loan · payment not entered, so it is not included. Enter it to include.');
    expect(shoot('networth', H_NW).lines.join(' ')).not.toMatch(/payment not entered/);
  });
});

describe('3 · Job safety reads the emergency fund Net worth shows (MK-NW-M-013, one figure on two screens)', () => {
  test('agreement: $18,000 of cash and $3,470 a month on Net worth; the same $18,000 covered on Job safety, $2,820 still needed', () => {
    const nw = shoot('networth', H_EF);
    const job = shoot('jobsafety', H_EF);
    const ef = efOf(H_EF);
    expect(ef.cash).toBe(18_000);
    expect(nw.lines.some((l) => /\$18,000 cash ÷ \$3,470\/month essentials/.test(l))).toBe(true);
    expect(job.lines).toContain('6 months of essentials is $20,820 ($3,470/month) — your savings cover $18,000 of it.');
    expect(after(job.lines, 'STILL NEEDED FOR YOUR EMERGENCY FUND')).toBe('$2,820');
    expect(20_820 - ef.cash).toBe(2_820);
  });
  test('savings and investments are Net worth\'s cash and Investments lines: $18,000 + $10,000 covers the $20,820', () => {
    const job = shoot('jobsafety', H_EF_INV, {}, () => fireEvent.press(screen.getByText('Savings + investments')));
    const nw = nwOf(H_EF_INV);
    expect(nw.cash + nw.investments).toBe(28_000);
    expect(job.lines).toContain('6 months of essentials is $20,820 ($3,470/month) — your savings and investments cover $20,820 of it.');
    expect(job.lines).toContain('✓ Covered');
  });
});

describe('4 · a CD never asked "bank or broker?" asks it, and keeps the answer (DEC-3837)', () => {
  test('the door: no answer is not the bank — it is named, and no rates estimate is invented', () => {
    const one = theBonds({ accounts: [CD] as any, accountId: 'b2', today: new Date('2026-09-28T12:00:00') }).one!;
    expect(one.cdBoughtNotEntered).toBe(true);
    expect(one.ratesMove).toBeNull();
    expect(one.ratesMoveRefusal).toMatch(/^Where this CD was bought is not entered\./);
    expect(one.ratesMoveRefusal).not.toMatch(/marked as bought from the bank/);
    const bank = theBonds({ accounts: [{ ...CD, cd_bought: 'bank' }] as any, accountId: 'b2', today: new Date('2026-09-28T12:00:00') }).one!;
    expect(bank.cdBoughtNotEntered).toBe(false);
    expect(bank.ratesMoveRefusal).toMatch(/marked as bought from the bank\.$/);
  });
  test('the page asks the one question with its two answers; an answer is saved on the CD and the card then reads as that answer', () => {
    const s = shoot('account', { assetAccounts: [CD], transactions: [], snapshotDays: [], priceCache: {} }, { id: 'b2' });
    const q = s.lines.indexOf('Bought from the bank, or through a broker?');
    expect(q).toBeGreaterThan(0);
    expect(s.lines.slice(q + 1, q + 3)).toEqual(['From the bank', 'Through a broker']);
    const broker = shoot('account', { assetAccounts: [CD], transactions: [], snapshotDays: [], priceCache: {} }, { id: 'b2' },
      () => fireEvent.press(screen.getByText('Through a broker')));
    expect((useStore.getState() as any).assetAccounts.find((a: any) => a.asset_id === 'b2').cd_bought).toBe('broker');
    expect(broker.lines.some((l) => /^Rates rise 1% → value roughly/.test(l))).toBe(true);
    expect(broker.lines).not.toContain('Bought from the bank, or through a broker?');
  });
});

describe('5 · a holding nothing classes is Unclassified on all three screens (DEC-2160)', () => {
  test('Net worth, the account page and the Performance tab name it Unclassified; its $1,000 and its $50 sit nowhere else', () => {
    const nw = shoot('networth', H_UNCL);
    const acct = shoot('account', H_UNCL, { id: 'u' });
    const pickThisYear = () => { const b = screen.getAllByRole('button').find((x) => String(x.props.accessibilityLabel ?? '').startsWith('Show This year')); if (!b) throw new Error('no This year'); fireEvent.press(b); };
    const inv = shoot('invest', H_UNCL, {}, pickThisYear);
    expect(after(nw.lines, 'Unclassified')).toBe('$1,000');
    expect(after(acct.lines, '▾ UNCLASSIFIED')).toBe('$1,000');
    expect(after(acct.lines, '▾ STOCKS / FUNDS')).toBe('$4,000');
    expect(after(inv.lines, 'Unclassified')).toBe('$50');
    expect(inv.lines.indexOf('Stocks / Funds')).toBe(-1);     // nothing earned there: QQ's dividend was its only income
  });
  test('the door: the category is keyed as Net worth keys it, and labelled with the one class name', () => {
    const cats = categoryEarnings({ windowStart: '2026-01-01', transactions: H_UNCL.transactions as any,
      rows: [{ position: { ticker: 'QQ' }, periodReturn: 0.1, marketValue: 1000 }] } as any);
    expect(cats).toEqual([{ key: 'mixed', label: 'Unclassified', earned: 50, ret: expect.any(Number), yearly: false }]);
  });
});

describe('6 · one date for one window on the account page', () => {
  test('the Since chip and the holding line beneath it name the same day: Feb 1, 2024', () => {
    const s = shoot('account', H_FID, { id: 'a2' });
    expect(s.lines).toContain('Since Feb 1, 2024');
    expect(s.lines).toContain('Prices for this holding go back 12 months, so the Since figure covers 12 months — not since Feb 1, 2024.');
  });
  test('agreement: with no daily record, a 1M walk begins on the day the Performance tab\'s 1M begins — never on the first money movement', () => {
    const acct = shoot('account', H_FID, { id: 'a2', period: '1M' });
    const pick1M = () => { const b = screen.getAllByRole('button').find((x) => String(x.props.accessibilityLabel ?? '').startsWith('Show 1M')); if (!b) throw new Error('no 1M'); fireEvent.press(b); };
    const inv = shoot('invest', H_FID, {}, pick1M);
    const begin = (L: string[]) => L.filter((l) => /^Beginning market value \(/.test(l));
    expect(begin(acct.lines)).toHaveLength(1);
    expect(begin(inv.lines).length).toBeGreaterThanOrEqual(1);
    expect(begin(acct.lines)[0]).not.toBe('Beginning market value (Feb 1, 2024)');   // the first money movement, before the fix
    for (const l of begin(inv.lines)) expect(l).toBe(begin(acct.lines)[0]);
  });
  test('unchanged where a daily record exists: the window opens the day after its first day, and the sentence names that first day', () => {
    const pts = [{ date: '2025-09-26' }, { date: '2026-09-28' }];
    expect(priceHistoryShortSentence(pts, '2024-02-02', 'SINCE', '2026-09-28')).toMatch(/— not since Feb 1, 2024\.$/);
    expect(priceHistoryShortSentence(pts, '2024-02-01', 'SINCE', '2026-09-28', '2024-02-01')).toMatch(/— not since Feb 1, 2024\.$/);
  });
});

describe('7 · Home names a balance not entered, in the Net worth tab\'s words (MK-XS-M-001)', () => {
  test('Home carries the line under Net worth; the words are the ones the Net worth tab\'s amber box prints', () => {
    const home = shoot('home', H_NOBAL);
    const nw = shoot('networth', H_NOBAL);
    const title = dataGaps(H_NOBAL.assetAccounts as any, null).find((g) => g.kind === 'no-balance')!.title;
    expect(title).toBe('Fidelity Brokerage has no balance');
    expect(nw.lines).toContain(title);
    const i = home.lines.indexOf('Net worth');
    expect(home.lines.slice(i, i + 6)).toContain(`⚠ ${title} ›`);
  });
  test('with every balance entered there is no such line', () => {
    expect(shoot('home', H_NW).lines.join(' ')).not.toMatch(/has no balance/);
  });
});

describe('8 · the one-account card is a share of Net worth\'s Investments line (DEC-0457)', () => {
  test('$142,000 of $175,200 invested is 81% — the rental and the checking are not invested money', () => {
    const nw = nwOf(H_NW);
    expect(nw.investments).toBe(175_200);
    expect(nw.investmentsByAccount.map((x) => [x.label, x.amount])).toEqual([['Fidelity', 142000], ['Fidelity', 24200], ['Vault', 9000]]);
    expect(nw.investmentsByAccount.reduce((t, x) => t + x.amount, 0)).toBe(nw.investments);
    const home = shoot('home', H_NW);
    expect(after(home.lines, 'YOUR INVESTMENTS', 2)).toBe('$175,200');
    expect(home.lines).toContain('$142,000 (81%) of your invested money sits in a single account — spreading across accounts lowers risk.');
  });
  test('an account\'s invested part leaves its cash out, and nothing invested means no card', () => {
    expect(accountInvestments(GAP_ACCOUNT as any)).toBe(40_000);
    expect(accountInvestments(NW_ACCOUNTS[3] as any)).toBe(0);
    expect(shoot('home', H_EF).lines.join(' ')).not.toMatch(/of your invested money/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SAME BUG CLASSES, FOUND WHILE FIXING THE EIGHT (2026-10-21, second pass)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('9 · a holding with no price is not $0 on the account page — the rows still add up to the total (tenets 2, 3)', () => {
  /** Schwab says $50,000: 100 VTI at $400, $5,000 of cash, and 10 ZZ the broker sends no price for. */
  const ONE = { ...GAP_ACCOUNT, positions: [...GAP_ACCOUNT.positions,
    { position_id: 'z', ticker: 'ZZ', asset_class: 'stock_etf', lots: [{ lot_id: 'z', shares: 10, cost_per_share: 50, purchase_date: '2024-01-01' }] }] };
  /** The same, with a second unpriced holding of another class: the $5,000 left over cannot be split between the two. */
  const TWO = { ...ONE, positions: [...ONE.positions,
    { position_id: 'y', ticker: 'YY', asset_class: 'other', lots: [{ lot_id: 'y', shares: 3, cost_per_share: 100, purchase_date: '2024-01-01' }] }] };
  const page = (a: any) => shoot('account', { ...H_GAP, assetAccounts: [a] }, { id: 'g' });
  const rowsSum = (s: Shot) => s.printed.filter((p) => p.id === 'MK-NW-M-020').map((p) => dollars(p.text)).reduce((t, v) => t + v, 0);
  test('alone: its row is what the total leaves over, $5,000, said as such; Stocks / Funds $45,000 is Net worth\'s figure', () => {
    expect(theAccount({ account: ONE as any, transactions: [] }).unpriced).toEqual({ value: 5000, cls: 'stocks_etf', count: 1 });
    const s = page(ONE);
    expect(after(s.lines, 'ZZ')).toBe('10 shares · no price today — the rest of Schwab\'s total');
    expect(after(s.lines, 'ZZ', 2)).toBe('$5,000');
    expect(after(s.lines, '▾ STOCKS / FUNDS')).toBe('$45,000');
    expect(accountClassBreakdown(ONE as any)!.stocks_etf).toBe(45_000);
    expect(rowsSum(s)).toBe(50_000);
  });
  test('with another: each says it has no price, never $0, and one row carries the $5,000 under Unclassified, as Net worth files it', () => {
    const s = page(TWO);
    expect(after(s.lines, 'ZZ', 2)).toBe('no price today');
    expect(after(s.lines, 'YY', 2)).toBe('no price today');
    expect(after(s.lines, 'Holdings with no price today')).toBe('2 holdings · the rest of Schwab\'s total');
    expect(after(s.lines, '▾ UNCLASSIFIED')).toBe('$5,000');
    expect(accountClassBreakdown(TWO as any)!.mixed).toBe(5_000);
    expect(rowsSum(s)).toBe(50_000);
  });
});

describe('10 · Home names a balance not entered under YOUR INVESTMENTS too, in the same words', () => {
  test('a brokerage with no balance: the line sits under the Investments figure and under Net worth', () => {
    const home = shoot('home', H_NOBAL);
    const note = '⚠ Fidelity Brokerage has no balance ›';
    expect(home.lines.filter((l) => l === note)).toHaveLength(2);
    expect(home.lines.indexOf(note)).toBeGreaterThan(home.lines.indexOf('YOUR INVESTMENTS'));
    expect(home.lines.indexOf(note)).toBeLessThan(home.lines.indexOf('Net worth'));
  });
  test('a checking account with no balance is not invested money: named under Net worth only', () => {
    const noChecking = { ...H_NW, assetAccounts: NW_ACCOUNTS.map((a) => (a.asset_id === 'a1' ? { ...a, balance: null } : a)) };
    const home = shoot('home', noChecking);
    expect(home.lines.filter((l) => l === '⚠ Chase Checking has no balance ›')).toHaveLength(1);
    expect(home.lines.indexOf('⚠ Chase Checking has no balance ›')).toBeGreaterThan(home.lines.indexOf('Net worth'));
  });
});

describe('11 · the debt editor saves a payment left blank as not entered, never $0 (tenet 3)', () => {
  const add = (fill: (s: typeof screen) => void) => {
    useStore.getState().resetAll();
    const { DebtEditorSheet } = require('../../components/DebtEditorSheet');
    render(<DebtEditorSheet state={{ open: true }} onClose={() => {}} />);
    fireEvent.press(screen.getByLabelText('Credit card'));
    fireEvent.changeText(screen.getByPlaceholderText('0'), '3100');
    fill(screen);
    fireEvent.press(screen.getByLabelText('Add debt'));
    return ((useStore.getState() as any).liabilities ?? []).slice(-1)[0];
  };
  test('blank minimum: saved as not entered, and Net worth names it', () => {
    const d = add(() => {});
    expect(d.remaining_balance).toBe(3100);
    expect(d.minimum_monthly_payment).toBeUndefined();
    expect(paymentNotEntered(d)).toBe(true);
  });
  test('a typed 0 is 0, and a typed minimum is kept', () => {
    expect(add((s) => fireEvent.changeText(s.getByPlaceholderText('$0'), '0')).minimum_monthly_payment).toBe(0);
    expect(add((s) => fireEvent.changeText(s.getByPlaceholderText('$0'), '120')).minimum_monthly_payment).toBe(120);
  });
});

describe('12 · the class split reads what was paid the one way (paidOnRecord, DEC-6627 tenet 4)', () => {
  const { paidOnRecord } = require('../../domain/performance');
  /** Built by hand, no prices held: a fund bought 10 at $100 plus 10 saved at $0 (a blank cost), 2 option contracts at $5. */
  const fund = { position_id: 'f', ticker: 'FUND', asset_class: 'stock_etf', lots: [{ lot_id: 'a', shares: 10, cost_per_share: 100 }, { lot_id: 'b', shares: 10, cost_per_share: 0 }] };
  const option = { position_id: 'o', ticker: 'AAPL261218C250', kind: 'options', asset_class: 'other', lots: [{ lot_id: 'c', shares: 2, cost_per_share: 5 }] };
  const acct = { asset_id: 'h', label: 'By hand', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true, balance: 2000, positions: [fund, option] };
  test('each holding weighs what the one reading says was paid — a $0 cost adds nothing, a contract counts its 100 shares', () => {
    expect(paidOnRecord(fund).paid).toBe(1000);
    expect(paidOnRecord(option).paid).toBe(1000);
    const b = accountClassBreakdown(acct as any)!;
    expect(b.stocks_etf).toBeCloseTo(1000, 9);          // read as 10 at $100 + 10 at $0 and 2 × $5: it was $1,980.20 of $2,000
    expect(b.alternatives).toBeCloseTo(1000, 9);
  });
  test('nothing paid on record and no price: the holding weighs nothing, never a $0 that shares out the balance', () => {
    const blank = { ...fund, lots: [{ lot_id: 'z', shares: 10, cost_per_share: 0 }] };
    expect(paidOnRecord(blank).paid).toBeNull();
    const b = accountClassBreakdown({ ...acct, balance: 1000, positions: [blank, option] } as any)!;
    expect(b.alternatives).toBeCloseTo(1000, 9);
    expect(b.stocks_etf).toBe(0);
  });
});

describe('13 · one sentence for what the row shows: the amber box and the account page agree in each case (tenet 2)', () => {
  const base = { asset_id: 'S', label: 'Schwab', institution: 'Schwab', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE',
    source: 'connected', last_synced: '2026-09-28T08:00:00Z', cash_balance: 0 };
  const xyz = (last_price: number | undefined) => ({ position_id: 'p', ticker: 'XYZ', asset_class: 'stock_etf', last_price, lots: [{ lot_id: 'l', shares: 10, cost_per_share: 50 }] });
  const both = (a: any) => ({
    box: dataGaps([a] as any).find((g) => g.kind === 'no-price')!.meanwhile,
    lines: shoot('account', { assetAccounts: [a], transactions: [], snapshotDays: [], priceCache: {} }, { id: 'S' }).lines,
  });
  test('the broker sent $0: the row shows $0 and the box says the $0 price Schwab sent (NWFIX\'s case, kept)', () => {
    const r = both({ ...base, balance: 0, positions: [xyz(0)] });
    expect(r.box).toBe('Meanwhile we show the $0 price Schwab sent — it stays out of the change line, and we say so.');
    expect(after(r.lines, 'XYZ', 2)).toBe('$0');
  });
  test('no price at all, a total to explain it: the row shows the rest of the total and the box says so', () => {
    const r = both({ ...base, balance: 1000, positions: [xyz(undefined)] });
    expect(r.box).toMatch(/^Meanwhile it counts as the rest of Schwab's total/);
    expect(after(r.lines, 'XYZ')).toBe('10 shares · no price today — the rest of Schwab\'s total');
    expect(after(r.lines, 'XYZ', 2)).toBe('$1,000');
  });
  test('no price at all, nothing left over: the row gives no figure and the box says it counts for nothing', () => {
    const r = both({ ...base, balance: 0, positions: [xyz(undefined)] });
    expect(r.box).toMatch(/^Meanwhile it counts for nothing: Schwab's total leaves nothing over for it/);
    expect(after(r.lines, 'XYZ', 2)).toBe('no price today');
  });
});

describe('14 · the class split values every holding kind as the balance and the Holding page do — one scaling each', () => {
  // BY HAND, before any reader is asked (account built by hand, its balance built from its holdings, no price held):
  //   Treasury quoted per $100 of face: 10,000 face bought at 99 → 10,000 × 99 ÷ 100 = $9,900 paid
  //   100 shares of a fund at $100 → $10,000;  balance $19,900  →  Bonds & CDs $9,900, Stocks / Funds $10,000
  //   (it read Bonds $195.08 / Stocks $19,704.92: the bond's cost cut to a hundredth twice)
  // Priced: 2 option contracts at $8 → 2 × $8 × 100 = $1,600; 10 shares at $40 → $400; balance $2,000
  //   → Alternatives $1,600, Stocks / Funds $400 (it read Alternatives $76.92: the option's price not × 100)
  const bond = { position_id: 'b', ticker: 'UST 2030', asset_class: 'bond', price_quote: 'per_100_of_face', lots: [{ lot_id: 'b1', shares: 10_000, cost_per_share: 99 }] };
  const fund = { position_id: 'f', ticker: 'FUND', asset_class: 'stock_etf', lots: [{ lot_id: 'f1', shares: 100, cost_per_share: 100 }] };
  const BY_HAND = { asset_id: 'h', label: 'Treasury and fund', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true, balance: 19_900, positions: [bond, fund] };
  const option = { position_id: 'o', ticker: 'AAPL261218C250', kind: 'options', asset_class: 'other', last_price: 8, lots: [{ lot_id: 'o1', shares: 2, cost_per_share: 5 }] };
  const stock = { position_id: 's', ticker: 'XYZ', asset_class: 'stock_etf', last_price: 40, lots: [{ lot_id: 's1', shares: 10, cost_per_share: 30 }] };
  const PRICED = { asset_id: 'p', label: 'Options and a stock', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true, balance: 2_000, positions: [option, stock] };
  test('a bond quoted per $100 of face: $9,900, scaled once — the figure Net worth\'s class rows print', () => {
    const { paidOnRecord } = require('../../domain/performance');
    expect(paidOnRecord(bond).paid).toBeCloseTo(9_900, 9);
    const b = accountClassBreakdown(BY_HAND as any)!;
    expect(b.bonds).toBeCloseTo(9_900, 9);
    expect(b.stocks_etf).toBeCloseTo(10_000, 9);
    const nw = shoot('networth', { assetAccounts: [BY_HAND], transactions: [], snapshotDays: [], priceCache: {} });
    expect(after(nw.lines, 'Bonds & CDs')).toBe('$9,900');
    expect(after(nw.lines, 'Stocks / Funds')).toBe('$10,000');
  });
  test('an option priced at $8: 2 contracts × $8 × 100 = $1,600, as its Holding page values it', () => {
    const b = accountClassBreakdown(PRICED as any)!;
    expect(b.alternatives).toBeCloseTo(1_600, 9);
    expect(b.stocks_etf).toBeCloseTo(400, 9);
    const nw = shoot('networth', { assetAccounts: [PRICED], transactions: [], snapshotDays: [], priceCache: {} });
    expect(after(nw.lines, 'Alternatives')).toBe('$1,600');
    expect(after(nw.lines, 'Stocks / Funds')).toBe('$400');
  });
});
