/** THE PERFORMANCE TAB AGAINST ITS APPROVED DRAWING, WORD FOR WORD (Performance v17, approved in full
 *  2026-10-01 — phones 1, 3, 4 and 5; phone 2 is the Account portfolio and has its own test).
 *
 *  Method (the mock-match standing order): take every visible word on a phone of the drawing, in
 *  order; render the screen in that phone's data state and take every visible word, in order; the two
 *  must be the SAME stream. Figures, dates and account names are data, so each is compared as a
 *  token — "$123,000" and "$52,704" are both "a dollar amount here".
 *
 *  What this cannot see, said plainly: colours, sizes, spacing, and the graph's axis (drawn by SVG
 *  after layout, which a test render never reaches — phones 4 and 5 draw the day-one frame in plain
 *  text and ARE compared). The three places the screen knowingly differs are named in KNOWN below,
 *  each with its reason; nothing else is exempt.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
const TODAY = isoLocalDate(new Date());
const series = (ticker: string, from: number, to: number, start: string) => ({ ticker, points: [{ date: start, close: from }, { date: TODAY, close: to }] });
const day = (date: string, rows: [string, string, number, number][]) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: rows.filter((r) => r[1] !== 'CASH').map(([accountId, securityKey, units, value]) => ({ date, accountId, securityKey, symbol: securityKey, units, price: value / units, value, currency: 'USD' })),
  accounts: [...new Set(rows.map((r) => r[0]))].map((accountId) => ({ date, accountId, cash: rows.filter((r) => r[0] === accountId && r[1] === 'CASH').reduce((t, r) => t + r[3], 0), statedTotal: rows.filter((r) => r[0] === accountId).reduce((t, r) => t + r[3], 0), typedValue: null, currency: 'USD' })),
});
/** A daily record from `start` to today: each account's holdings move in a straight line from its first to its last value. */
function daily(start: string, lines: [string, string, number, number, number][]): any[] {
  const out: any[] = []; const a = new Date(`${start}T12:00:00`); const b = new Date(`${TODAY}T12:00:00`);
  const n = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
  for (let i = 0; i <= n; i += 1) {
    const d = new Date(a.getTime() + i * 86_400_000); const date = isoLocalDate(d);
    out.push(day(date, lines.map(([acc, key, units, v0, v1]) => [acc, key, units, v0 + (v1 - v0) * (i / n)] as [string, string, number, number])));
  }
  return out;
}
const monthsAgo = (m: number) => { const d = new Date(`${TODAY}T12:00:00`); d.setMonth(d.getMonth() - m); return isoLocalDate(d); };
const acct = (id: string, institution: string, label: string, balance: number, source: string | undefined, positions: any[], cash = 0) => ({
  asset_id: id, label, institution, kind: 'brokerage', tax_bucket: 'TAXABLE', balance, target_return: 0.05, source, cash_balance: cash,
  last_synced: source ? new Date().toISOString() : undefined, positions,
});
const pos = (id: string, ticker: string, shares: number, price: number, cost: number, date: string, cls = 'stock_etf') => ({ position_id: id, ticker, asset_class: cls, last_price: price, lots: [{ lot_id: `${id}l`, shares, cost_per_share: cost, purchase_date: date }] });

const STATES: Record<number, () => void> = {
  // phone 1 — two linked accounts, a record that begins 1 Oct 2025, money added: the window return refuses
  1: () => useStore.setState({
    assetAccounts: [acct('van', 'Vanguard', 'BROKERAGE', 101_000, 'connected', [pos('p1', 'VTI', 300, 330, 260, monthsAgo(11))], 2_000),
                    acct('etr', 'E*TRADE', 'ACCOUNT 1', 22_000, 'connected', [pos('p2', 'VOO', 40, 550, 500, monthsAgo(11))], 0)],
    transactions: [
      { id: 'd1', date: monthsAgo(10), type: 'DEPOSIT', account_id: 'van', amount: 15_000, created_at: 'x', source: 'connected' },
      { id: 'v1', date: monthsAgo(3), type: 'DIVIDEND', account_id: 'van', ticker: 'VTI', amount: 1_500, created_at: 'x', source: 'connected' },
      { id: 'i1', date: monthsAgo(3), type: 'INTEREST', account_id: 'van', amount: 200, created_at: 'x', source: 'connected' },
      { id: 'v2', date: monthsAgo(3), type: 'DIVIDEND', account_id: 'etr', ticker: 'VOO', amount: 300, created_at: 'x', source: 'connected' },
      { id: 'i2', date: monthsAgo(3), type: 'INTEREST', account_id: 'etr', amount: 200, created_at: 'x', source: 'connected' },
    ],
    snapshotDays: daily(monthsAgo(11), [['van', 'VTI', 300, 78_000, 99_000], ['van', 'CASH', 1, 2_000, 2_000], ['etr', 'VOO', 40, 20_000, 22_000]]),
    invDaily: { [monthsAgo(11)]: 100_000, [TODAY]: 123_000 },
    priceCache: { VTI: series('VTI', 260, 330, monthsAgo(11)), VOO: series('VOO', 500, 550, monthsAgo(11)) }, pricesFetchedAt: new Date().toISOString(),
  } as any),
  // phone 3 — one linked account, 26 months of record: every window answers
  3: () => useStore.setState({
    assetAccounts: [acct('etr', 'E*TRADE', 'ACCOUNT 1', 52_704, 'connected', [pos('p1', 'VTI', 100, 400, 260, monthsAgo(26)), pos('p2', 'US TREASURY 4.25%', 7000, 1, 1, monthsAgo(26), 'bond')], 5_704)],
    transactions: [
      { id: 'd1', date: monthsAgo(20), type: 'DEPOSIT', account_id: 'etr', amount: 900, created_at: 'x', source: 'connected' },
      { id: 'w1', date: monthsAgo(14), type: 'WITHDRAWAL', account_id: 'etr', amount: 120, created_at: 'x', source: 'connected' },
      { id: 'v1', date: monthsAgo(10), type: 'DIVIDEND', account_id: 'etr', ticker: 'VTI', amount: 1_180, created_at: 'x', source: 'connected' },
      { id: 'b1', date: monthsAgo(8), type: 'INTEREST', account_id: 'etr', ticker: 'US TREASURY 4.25%', amount: 300, created_at: 'x', source: 'connected' },
      { id: 'i1', date: monthsAgo(6), type: 'INTEREST', account_id: 'etr', amount: 220, created_at: 'x', source: 'connected' },
    ],
    snapshotDays: daily(monthsAgo(26), [['etr', 'VTI', 100, 26_000, 40_000], ['etr', 'US TREASURY 4.25%', 7000, 7_000, 7_000], ['etr', 'CASH', 1, 5_000, 5_704]]),
    invDaily: { [monthsAgo(26)]: 38_000, [TODAY]: 52_704 }, rebuiltFrom: { etr: monthsAgo(26) },
    priceCache: { VTI: series('VTI', 260, 400, monthsAgo(26)) }, pricesFetchedAt: new Date().toISOString(),
  } as any),
  // phone 4 — day one, two hand-entered accounts, nothing recorded
  4: () => useStore.setState({
    assetAccounts: [acct('van', 'Vanguard', 'BROKERAGE', 301_610, undefined, [pos('p1', 'VTI', 900, 330, 300, TODAY), pos('p3', 'KEYBANK CD 4.00%', 4610, 1, 1, TODAY, 'bond')], 0),
                    acct('etr', 'E*TRADE', 'ACCOUNT 1', 52_704, undefined, [pos('p2', 'VOO', 90, 550, 500, TODAY)], 3_204)],
    transactions: [], snapshotDays: [], invDaily: {},
    priceCache: { VTI: series('VTI', 330, 330, TODAY), VOO: series('VOO', 550, 550, TODAY) }, pricesFetchedAt: new Date().toISOString(),
  } as any),
  // phone 5 — no accounts yet
  5: () => useStore.setState({ assetAccounts: [], transactions: [], snapshotDays: [], invDaily: {}, priceCache: {} } as any),
};

const MON = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
/** One stream of words: figures, dates and account names become tokens; glyphs that are not words go. */
const norm = (lines: string[]) => lines.join(' ').toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/\p{Extended_Pictographic}|️|[ⓘ›↺·]/gu, ' ')
  .replace(/vanguard brokerage|e\*trade account 1|e\*trade brokerage/g, '<account>')
  .replace(new RegExp(`${MON} \\d{1,2}(, \\d{4})?`, 'g'), '<date>')
  .replace(/[−-]?\$[\d,]+(\.\d+)?/g, '$#').replace(/[+−-]?\d+(\.\d+)?%/g, '#%').replace(/\d+/g, '#')
  .replace(/\s+/g, ' ').trim();

/** THE THREE KNOWN DIFFERENCES — each is a decision, written where the comparison is made.
 *  1. A yearly rate on a category row. The drawing prints one for cash and for bonds ("2.50%/year").
 *     The app holds no interest rate for cash, and a bond inside a linked account states none, so the
 *     screen prints an em-dash rather than a rate nobody gave it. A bond held as its own account
 *     states its rate and DOES print "/year" — tested below.
 *  2. The closed account line. Phone 1 reads "Linked · wealth generated $2,000 · return +10.00%";
 *     phone 3 reads "Linked · wealth generated $6,904 since Jun 3, 2024". One line cannot be worded
 *     two ways; phone 1's is the one v17 marks as new, so it is the one built.
 *  3. The graph's axis on phones 1 and 3 (see the header). */
const KNOWN = (s: string) => s
  .replace(/(bonds & cds|cash in this account) \$# (#%\/year|—)/g, '$1 $# <rate or dash>')
  .replace(/linked wealth generated \$# since <date>/g, 'linked wealth generated $# return #%');

const CHROME = new Set(['9:41', '▦ Menu', 'Money', 'Keel', '◉', '⚙', '🏠', 'Home', '💎', 'Net worth', '📈', '💵', 'Cash flow', '🧭', 'Plan']);
function drawn(n: number): string[] {
  const p = path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_performance_v17.html');
  let body = fs.readFileSync(p, 'utf8').replace(/^[\s\S]*<body/, '<body').replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  // the graph: its SVG gridline labels go; the day-one frame's own words ("your line starts today") stay
  body = body.replace(/<svg[\s\S]*?<\/svg>/g, (svg) => (/your line starts/.test(svg) ? svg : ''));
  const lines = body.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const starts = lines.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  expect(starts.length).toBe(5);                                     // the guard proves it looked: five phones
  const seg = lines.slice(starts[n - 1], starts[n] ?? lines.length);
  const end = seg.findIndex((l, k) => /^🏠/.test(l) && k > 10);      // the tab bar closes the phone
  expect(end).toBeGreaterThan(20);                                   // and the phone has a body
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
}
function built(): string[] {
  const out: string[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
/** Where two streams part, with the words either side — a failure has to say WHERE. */
function firstDifference(a: string, b: string): string {
  const x = a.split(' '), y = b.split(' ');
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i += 1;
  if (i === x.length && i === y.length) return '';
  return `at word ${i}:\n  DRAWN … ${x.slice(Math.max(0, i - 8), i + 14).join(' ')}\n  BUILT … ${y.slice(Math.max(0, i - 8), i + 14).join(' ')}`;
}

describe('the Performance tab says what Performance v17 draws, word for word', () => {
  // the graph's axis dates sit under a drawn line on phones 1 and 3 only
  const AXIS: Record<number, RegExp | null> = { 1: /<date> ?<date> (?=how \$# became)/, 3: /<date> ?<date> (?=how \$# became)/, 4: null, 5: null };
  test.each([
    [1, 'two linked accounts, money added: the window return refuses and the yearly rate stands in'],
    [3, 'one linked account with 26 months of rebuilt record: every window answers'],
    [4, 'day one, two accounts entered by hand'],
    [5, 'no accounts yet'],
  ])('phone %i — %s', (n) => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete(true); useStore.setState({ hideBalances: false } as any);
    STATES[n as number]();
    render(<PerformanceScreen />);
    let want = KNOWN(norm(drawn(n as number)));
    if (AXIS[n as number]) want = want.replace(AXIS[n as number]!, '');
    const got = KNOWN(norm(built()));
    expect(want.split(' ').length).toBeGreaterThan(60);              // a phone that read as empty would pass anything
    expect(firstDifference(want, got)).toBe('');
    screen.unmount();
  });

  test('a bond held as its own account states its yearly rate, and the category row prints it with /year', () => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete(true); useStore.setState({ hideBalances: false } as any);
    STATES[1]();
    useStore.setState({
      assetAccounts: [...(useStore.getState() as any).assetAccounts,
        { asset_id: 'cd', label: 'KeyBank CD 4.00%', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 5_000, target_return: 0.04, coupon_rate: 0.04, maturity_date: '2027-08-24' }],
      transactions: [...(useStore.getState() as any).transactions,
        { id: 'c1', date: monthsAgo(2), type: 'INTEREST', account_id: 'cd', ticker: 'KeyBank CD 4.00%', amount: 100, created_at: 'x' }],
    } as any);
    render(<PerformanceScreen />);
    expect(built().join(' | ')).toMatch(/Bonds & CDs \| \$100 \| \+4\.00%\/year/);
    screen.unmount();
  });
});
