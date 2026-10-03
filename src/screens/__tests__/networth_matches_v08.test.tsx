/** THE NET WORTH SCREEN AGAINST ITS APPROVED DRAWING, WORD FOR WORD (Quiet Instrument v08, approved
 *  2026-09-14) — all eight states it draws: A with data · A2 by institution · B collapsed, and down ·
 *  C first day · D the missing-data banner · E the change walk · F the fix sheet · G the add sheet.
 *
 *  Method and limits: src/testing/mockMatch.ts. Each state is rendered in the drawing's own data shape
 *  (the fixture reproduces its arithmetic: 8,000 + 838 + 348,495 + 5,819 + 450,000 = $813,152, less
 *  $418,000 owed = $395,152) and must give the same words in the same order.
 *
 *  ONE KNOWN DIFFERENCE, and it is a later ruling of his, not a gap: under the emergency fund the
 *  screen prints two lines the drawing does not — the months at the planned spend, and that both
 *  figures include the debt payments that cannot be stopped ("both numbers", founder, 2026-09-28,
 *  two weeks after this drawing was approved). Newest ruling wins, so they stay and are named in KNOWN.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { isoLocalDate } from '../../domain/_shared/dates';
import { norm, drawingLines, builtLines, firstDifference } from '../../testing/mockMatch';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
const today = isoLocalDate(new Date());
const daysAgo = (n: number) => isoLocalDate(new Date(Date.now() - n * 86_400_000));

const DRAWING = 'MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html';
const LINES = drawingLines(DRAWING, [/<span class="pn">[^<]*<\/span>/g, /<span class="idot"[^>]*>i<\/span>/g, /<svg[\s\S]*?<\/svg>/g]);
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
const CHROME = new Set(['9:41', '▮▮▮ ⌁ ▐', '▦ Menu', 'MoneyKeel', '◉', '⚙']);
/** A phone's own words: from its status bar to its tab bar (or to its caption, where it has none). */
const phone = (n: number): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length);
  let end = seg.findIndex((l, k) => l === 'Home' && seg[k + 1] === 'Net worth');
  if (end < 0) end = seg.findIndex((l) => /^STATE [A-G]/.test(l));
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
};
/** A sheet drawn beside a phone: from its first line to its last. */
const between = (from: RegExp, to: RegExp, nth = 0): string[] => {
  const hits = LINES.map((l, i) => (from.test(l) ? i : -1)).filter((i) => i >= 0);
  const a = hits[nth]; const b = LINES.findIndex((l, i) => i > a && to.test(l));
  return LINES.slice(a, b + 1);
};

const DATA = (over: any = {}) => ({
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  retirementAssumptions: { retireAge: 65, contribMonthly: 1200, spendMonthly: 4500, horizonAge: 92 },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 349333,
      target_return: 0.07, source: 'connected', last_synced: `${today}T09:00:00Z`, cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105, price: 105, shares: 3319,
        lots: [{ lot_id: 'l1', shares: 3319, cost_per_share: 84, purchase_date: '2024-01-02' }] }] },
    { asset_id: 'etr', label: 'E*TRADE Brokerage', institution: 'E*TRADE', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      asset_class: 'bonds', balance: 5819, target_return: 0.042, source: 'connected', last_synced: `${today}T09:00:00Z`,
      maturity_date: '2027-08-24', coupon_rate: 0.04 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, value_as_of: today },
  ],
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 412000, interest_rate_apr: 0.055, minimum_monthly_payment: 2400 },
    { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 },
  ],
  transactions: [
    { id: 'c', account_id: 'van', type: 'DEPOSIT', amount: 500, date: today },
    { id: 'w', account_id: 'van', type: 'WITHDRAWAL', amount: 500, date: today },
    { id: 'd', account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 1220, date: today },
    { id: 'i', account_id: 'etr', type: 'INTEREST', amount: 430, date: today },
  ],
  nwDaily: { [daysAgo(8)]: 393042, [today]: 395152 },
  invDaily: { [daysAgo(8)]: 361242, [today]: 363152 },
  ...over,
});
const setup = (over: any = {}) => { useStore.getState().resetAll(); useStore.setState(DATA(over) as any); };
/** The two lines his ruling of 2026-09-28 added under the emergency fund (see the header). */
const KNOWN = (built: string) => built.replace(/ # months at your planned spend — \$# cash ÷ \$#\/month both include \$#\/month of debt payments you cannot stop\./, '');
const compare = (_name: string, drawn: string[], built: string[], minWords = 35) => {
  const want = norm(drawn), got = KNOWN(norm(built));
  expect(want.split(' ').length).toBeGreaterThanOrEqual(minWords);   // a state that read as empty would match anything
  expect(firstDifference(want, got)).toBe('');
};
test('the drawing still has its six phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(6); });

const collapseAll = () => { for (const g of [/^▾ 💵 Cash/, /^▾ 📈 Investments/, /^▾ 🏠 Personal property/]) fireEvent.press(screen.getByText(g)); };
const GAPS = {
  assetAccounts: DATA().assetAccounts.map((a: any) => a.asset_id === 'etr' ? { ...a, last_synced: `${daysAgo(8)}T09:00:00Z` }
    : a.asset_id === 'van' ? { ...a, positions: [...a.positions, { position_id: 'p2', ticker: 'LCTX', asset_class: 'stock_etf', shares: 965, price: null, lots: [{ lot_id: 'l2', shares: 965, cost_per_share: 1, purchase_date: '2024-01-02' }] }] } : a),
};
const from = (lines: string[], start: RegExp, nth = 0) => { const hits = lines.map((l, i) => (start.test(l) ? i : -1)).filter((i) => i >= 0); return lines.slice(hits[nth]); };
const upTo = (lines: string[], stop: RegExp) => { const i = lines.findIndex((l) => stop.test(l)); return i < 0 ? lines : lines.slice(0, i); };
const through = (lines: string[], last: RegExp) => { const i = lines.findIndex((l) => last.test(l)); return i < 0 ? lines : lines.slice(0, i + 1); };

test('A — with data, by category', () => { setup(); render(<NetWorth />); compare('A', phone(1), builtLines(screen.toJSON())); });
test('A2 — by institution', () => { setup(); render(<NetWorth />); fireEvent.press(screen.getByText('By institution')); compare('A2', phone(2), builtLines(screen.toJSON())); });
test('B — all collapsed, and the down case', () => {
  setup({ nwDaily: { [daysAgo(8)]: 396632, [today]: 395152 }, invDaily: { [daysAgo(8)]: 364632, [today]: 363152 } });
  render(<NetWorth />); collapseAll(); compare('B', phone(3), builtLines(screen.toJSON()));
});
test('C — first day', () => { useStore.getState().resetAll(); useStore.getState().setOnboardingProfile(employedPartner as any); render(<NetWorth />); compare('C', phone(4), builtLines(screen.toJSON())); });
test('D — the missing-data banner', () => {
  setup(GAPS); render(<NetWorth />); collapseAll();
  compare('D', phone(5), upTo(builtLines(screen.toJSON()), /^EMERGENCY FUND/));
});
test('E — the change walk', () => {
  setup(); render(<NetWorth />); fireEvent.press(screen.getByText(/Change in net worth/));
  compare('E', between(/^How \$393,042 became/, /^Contributions are not a gain/), through(from(builtLines(screen.toJSON()), /^How .* became/i), /Contributions are not a gain/));
});
test('F — the fix sheet', () => {
  setup(GAPS); render(<NetWorth />); fireEvent.press(screen.getByText(/numbers? needs? more information/));
  compare('F', between(/^2 numbers need more information$/, /^Nothing here is a nag/), through(from(builtLines(screen.toJSON()), /numbers? needs? more information/, 1), /^Nothing here is a nag/));
});
test('G — the add sheet', () => {
  setup(); render(<NetWorth />); fireEvent.press(screen.getByText(/Add an account/));
  compare('G', from(phone(6), /^How do you want to add an account/), from(builtLines(screen.toJSON()), /^How do you want to add an account/));
});
