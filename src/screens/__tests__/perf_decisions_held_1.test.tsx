/** HIS DECISIONS, READ AGAINST THE PERFORMANCE TAB ITSELF — part 1 (PF-DECISIONS, 2026-10-22).
 *
 *  Each decision below governs the Performance tab and was "RECORDED — status not established" or "RULED" in the
 *  decision log: nothing re-ran it. Each test renders the tab in the founder's own data shape (Performance v17's
 *  phones 1 and 3: two linked accounts with money added; one linked account with 26 months of record) or in a fresh
 *  account (phones 4 and 5: day one by hand; nothing entered), and fails if the screen breaks the decision. Every test
 *  is named by the decision it holds.
 *
 *  A decision the screen BREAKS is pinned with test.failing and the word BREACHED in its name, the way the outside
 *  re-run files pin an open item: the pin turns red the day the screen is fixed, so it is flipped, never deleted.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';
import { Radii, ClassMarkColors } from '../../utils/theme';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';

const mockPush = jest.fn();
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(() => { cb(); }, []); },
  router: { push: mockPush, replace: jest.fn(), back: jest.fn() },
}));

// ── the data states: Performance v17's own phones, as perf_matches_v17 builds them ───────────────────────────────
const TODAY = isoLocalDate(new Date());
const series = (ticker: string, from: number, to: number, start: string) => ({ ticker, points: [{ date: start, close: from }, { date: TODAY, close: to }] });
const day = (date: string, rows: [string, string, number, number][]) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: rows.filter((r) => r[1] !== 'CASH').map(([accountId, securityKey, units, value]) => ({ date, accountId, securityKey, symbol: securityKey, units, price: value / units, value, currency: 'USD' })),
  accounts: [...new Set(rows.map((r) => r[0]))].map((accountId) => ({ date, accountId, cash: rows.filter((r) => r[0] === accountId && r[1] === 'CASH').reduce((t, r) => t + r[3], 0), statedTotal: rows.filter((r) => r[0] === accountId).reduce((t, r) => t + r[3], 0), typedValue: null, currency: 'USD' })),
});
function daily(start: string, lines: [string, string, number, number, number][]): any[] {
  const out: any[] = []; const a = new Date(`${start}T12:00:00`); const b = new Date(`${TODAY}T12:00:00`);
  const n = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
  for (let i = 0; i <= n; i += 1) {
    const d = new Date(a.getTime() + i * 86_400_000); const date = isoLocalDate(d);
    out.push(day(date, lines.map(([acc, key, units, v0, v1]) => [acc, key, units, v0 + (v1 - v0) * (i / n)] as [string, string, number, number])));
  }
  return out;
}
function paidIn(days: any[], accountId: string, key: string, from: string, amount: number): any[] {
  return days.map((d) => (d.date < from ? d : {
    ...d,
    holdings: d.holdings.map((h: any) => (h.accountId === accountId && h.securityKey === key ? { ...h, value: h.value + amount, price: (h.value + amount) / h.units } : h)),
    accounts: d.accounts.map((a: any) => (a.accountId === accountId && key === 'CASH' ? { ...a, cash: a.cash + amount } : a)),
  }));
}
const monthsAgo = (m: number) => { const d = new Date(`${TODAY}T12:00:00`); d.setMonth(d.getMonth() - m); return isoLocalDate(d); };
const daysAgo = (n: number) => { const d = new Date(`${TODAY}T12:00:00`); d.setDate(d.getDate() - n); return isoLocalDate(d); };
const acct = (id: string, institution: string | undefined, label: string, balance: number, source: string | undefined, positions: any[], cash = 0) => ({
  asset_id: id, label, institution, kind: 'brokerage', tax_bucket: 'TAXABLE', balance, target_return: 0.05, source, cash_balance: cash,
  last_synced: source ? new Date().toISOString() : undefined, positions,
});
const pos = (id: string, ticker: string, shares: number, price: number, cost: number, date: string, cls = 'stock_etf') => ({ position_id: id, ticker, asset_class: cls, last_price: price, lots: [{ lot_id: `${id}l`, shares, cost_per_share: cost, purchase_date: date }] });

const PHONE: Record<number, () => void> = {
  // phone 1 — two linked accounts, a record that begins eleven months ago, $15,000 added
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
    snapshotDays: paidIn(daily(monthsAgo(11), [['van', 'VTI', 300, 78_000, 84_000], ['van', 'CASH', 1, 2_000, 2_000], ['etr', 'VOO', 40, 20_000, 22_000]]), 'van', 'VTI', monthsAgo(10), 15_000),
    invDaily: { [monthsAgo(11)]: 100_000, [TODAY]: 123_000 },
    priceCache: { VTI: series('VTI', 260, 330, monthsAgo(11)), VOO: series('VOO', 500, 550, monthsAgo(11)) }, pricesFetchedAt: new Date().toISOString(),
  } as any),
  // phone 3 — one linked account, 26 months of rebuilt record: every window answers
  3: () => useStore.setState({
    assetAccounts: [acct('etr', 'E*TRADE', 'ACCOUNT 1', 52_704, 'connected', [pos('p1', 'VTI', 100, 400, 260, monthsAgo(26)), pos('p2', 'US TREASURY 4.25%', 7000, 1, 1, monthsAgo(26), 'bond')], 5_704)],
    transactions: [
      { id: 'd1', date: monthsAgo(20), type: 'DEPOSIT', account_id: 'etr', amount: 900, created_at: 'x', source: 'connected' },
      { id: 'w1', date: monthsAgo(14), type: 'WITHDRAWAL', account_id: 'etr', amount: 120, created_at: 'x', source: 'connected' },
      { id: 'v1', date: monthsAgo(10), type: 'DIVIDEND', account_id: 'etr', ticker: 'VTI', amount: 1_180, created_at: 'x', source: 'connected' },
      { id: 'b1', date: monthsAgo(8), type: 'INTEREST', account_id: 'etr', ticker: 'US TREASURY 4.25%', amount: 300, created_at: 'x', source: 'connected' },
      { id: 'i1', date: monthsAgo(6), type: 'INTEREST', account_id: 'etr', amount: 220, created_at: 'x', source: 'connected' },
    ],
    snapshotDays: paidIn(paidIn(daily(monthsAgo(26), [['etr', 'VTI', 100, 26_000, 40_000], ['etr', 'US TREASURY 4.25%', 7000, 7_000, 7_000], ['etr', 'CASH', 1, 5_000, 4_924]]),
      'etr', 'CASH', monthsAgo(20), 900), 'etr', 'CASH', monthsAgo(14), -120),
    invDaily: { [monthsAgo(26)]: 38_000, [TODAY]: 52_704 }, rebuiltFrom: { etr: monthsAgo(26) },
    priceCache: { VTI: series('VTI', 260, 400, monthsAgo(26)) }, pricesFetchedAt: new Date().toISOString(),
  } as any),
  // phone 4 — day one, two accounts entered by hand, nothing recorded before today
  4: () => {
    const accounts = [acct('van', 'Vanguard', 'BROKERAGE', 301_610, undefined, [pos('p1', 'VTI', 900, 330, 300, TODAY), pos('p3', 'KEYBANK CD 4.00%', 4610, 1, 1, TODAY, 'bond')], 0),
                      acct('etr', 'E*TRADE', 'ACCOUNT 1', 52_704, undefined, [pos('p2', 'VOO', 90, 550, 500, TODAY)], 3_204)];
    return useStore.setState({
      assetAccounts: accounts,
      transactions: [], snapshotDays: [buildDayFromAccounts(accounts as any, TODAY, `${TODAY}T09:00:00Z`)], invDaily: {},
      priceCache: { VTI: series('VTI', 330, 330, TODAY), VOO: series('VOO', 550, 550, TODAY) }, pricesFetchedAt: new Date().toISOString(),
    } as any);
  },
  // phone 5 — a fresh account: nothing entered
  5: () => useStore.setState({ assetAccounts: [], transactions: [], snapshotDays: [], invDaily: {}, priceCache: {} } as any),
};

function open(n: number, extra?: () => void) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete(true); useStore.setState({ hideBalances: false } as any);
  PHONE[n]();
  extra?.();
  mockPush.mockClear();
  render(<PerformanceScreen />);
}
/** every visible line, in order — what a person reads */
function lines(): string[] {
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
const pick = (w: string) => fireEvent.press(screen.getAllByLabelText(new RegExp(`^Show ${w}`))[0]);
/** the five windows as the bar prints them: [label, figure] */
function bar(): [string, string][] {
  const all = lines();
  const at = all.indexOf('Performance');
  const seg = all.slice(at + 2, at + 12);
  expect(seg.length).toBe(10);                                     // the guard looked: five windows, two lines each
  return [0, 2, 4, 6, 8].map((i) => [seg[i], seg[i + 1]]);
}
const flat = (n: any) => StyleSheet.flatten(n?.props?.style) ?? {};
const money = (s: string) => Number(s.replace(/[$,]/g, '').replace('−', '-'));
const PCT = /^[+−-]\d+\.\d{2}%$/;


// ── DEC-0008 ─────────────────────────────────────────────────────────────────────────────────────────
// "yes" — dense tables keep their compact approved size; the 17-point minimum is for the big headline money figures.
test('DEC-0008 — the three headline figures print at 17 points or more; the dense category table keeps its compact size (phone 1, his shape)', () => {
  open(1);
  const heads = ['Ending value', 'Wealth generated', 'Return'].map((l) => screen.getAllByLabelText(new RegExp(`^${l}, `))[0]);   // the trio comes first
  expect(heads).toHaveLength(3);
  for (const cell of heads) {
    const texts = cell.findAll((n: any) => n.type === 'Text' && typeof n.props.children !== 'undefined');
    const fig = texts[texts.length - 1];
    expect(flat(fig).fontSize).toBeGreaterThanOrEqual(17);
  }
  const row = screen.getByLabelText(/^Stocks \/ Funds, earned /);
  const vals = row.findAll((n: any) => n.type === 'Text');
  expect(vals.length).toBeGreaterThanOrEqual(3);
  for (const v of vals) expect(flat(v).fontSize).toBeLessThan(17);  // a table of rows is never hero size
});

// ── DEC-0013 ─────────────────────────────────────────────────────────────────────────────────────────
// "Approve all 25" — among them: one shared way of printing the big figures, so hidden balances cannot leak through one.
test('DEC-0013 — with balances hidden, no dollar amount is readable anywhere on the Performance tab (phone 1), while returns stay', () => {
  open(1, () => useStore.setState({ hideBalances: true } as any));
  const all = lines();
  expect(all.length).toBeGreaterThan(60);
  expect(all.filter((l) => /\$\d/.test(l))).toEqual([]);
  expect(all.filter((l) => l.includes('••••')).length).toBeGreaterThanOrEqual(20);
  expect(all).toContain('+7.05%');                                 // the Return is a percent, not a balance
});

// ── DEC-0014 ─────────────────────────────────────────────────────────────────────────────────────────
// "yes" to the final chart palette: one fixed colour per class, checked for colourblind readers. Colours only.
test('DEC-0014 — the palette is his seven colours, and each category row on the Performance tab wears its class\'s colour (phone 3)', () => {
  expect(ClassMarkColors).toEqual({
    stocks_etf: '#2a78d6', cash: '#1baf7a', real_estate: '#eda100', bonds: '#4a3aa7',
    alternatives: '#eb6834', personal_property: '#e87ba4', mixed: '#898781',
  });
  open(3);
  const dot = (label: RegExp) => {
    const row = screen.getByLabelText(label);
    const v = row.findAll((n: any) => n.type === 'View' && flat(n).backgroundColor && flat(n).width != null);
    expect(v.length).toBeGreaterThan(0);
    return String(flat(v[0]).backgroundColor).toLowerCase();
  };
  expect(dot(/^Stocks \/ Funds, earned /)).toBe('#2a78d6');
  expect(dot(/^Bonds & CDs, earned /)).toBe('#4a3aa7');
  expect(dot(/^Cash in this account, earned /)).toBe('#1baf7a');
});

// ── DEC-0057 ─────────────────────────────────────────────────────────────────────────────────────────
// "past year" — where a window reaches back further than the broker shared, the screen says so in one plain sentence.
test('DEC-0057 — a broker that shared 3 months: 1Y names the shortfall in one sentence; 1M, which it covers, says nothing', () => {
  const setUp = () => useStore.setState({
    assetAccounts: [{ ...acct('etr', 'E*TRADE', 'ACCOUNT 1', 44_000, 'connected', [pos('p1', 'VTI', 100, 400, 300, monthsAgo(14))], 4_000), history_from: monthsAgo(3) }],
    transactions: [{ id: 'v1', date: monthsAgo(2), type: 'DIVIDEND', account_id: 'etr', ticker: 'VTI', amount: 100, created_at: 'x', source: 'connected' }],
    snapshotDays: daily(monthsAgo(3), [['etr', 'VTI', 100, 36_000, 40_000], ['etr', 'CASH', 1, 4_000, 4_000]]),
    invDaily: {}, priceCache: { VTI: series('VTI', 300, 400, monthsAgo(14)) }, pricesFetchedAt: new Date().toISOString(),
  } as any);
  open(5, setUp);
  const SAID = /^E\*TRADE shared 3 months of history \(from [A-Z][a-z]{2} \d{1,2}, \d{4}\) — figures before that aren't counted\.$/;
  pick('1M');
  expect(lines().filter((l) => SAID.test(l))).toEqual([]);
  pick('1Y');
  expect(lines().filter((l) => SAID.test(l))).toHaveLength(1);
});

// ── DEC-0063 ─────────────────────────────────────────────────────────────────────────────────────────
// "for the window you picked — not a yearly rate; money you added never counts as return" — three figures lead, then the walk.
test('DEC-0063 — three figures lead (Ending value, Wealth generated, Return), the sentence says what the Return is, and the walk adds up in the approved order (phone 3)', () => {
  open(3);
  const all = lines();
  const e = all.indexOf('Ending value');
  expect(e).toBeGreaterThan(0);
  expect([all[e], all[e + 2], all[e + 4]]).toEqual(['Ending value', 'Wealth generated', 'Return']);
  expect(all[e + 6]).toMatch(/^Return is for the window you picked \([A-Z][a-z]{2} \d{1,2}, \d{4} → [A-Z][a-z]{2} \d{1,2}, \d{4}\) — not a yearly rate$/);
  expect(all).toContain('time-weighted, so money you added never counts as return');
  // the walk: beginning, money in, money out, wealth generated (dividends, interest, change in value), ending
  const b = all.findIndex((l) => l.startsWith('Beginning market value'));
  const order = ['Contributions', 'Withdrawals', 'Wealth generated', 'Dividends', 'Interest', 'Change in investment value'];
  expect(order.map((l, i) => all[b + 2 + 2 * i])).toEqual(order);
  expect(all[b + 14]).toMatch(/^Ending market value/);
  const v = (k: number) => money(all[b + 1 + 2 * k]);
  expect(v(0) + v(1) + v(2) + v(3)).toBe(v(7));                    // beginning + in − out + wealth generated = ending
  expect(v(4) + v(5) + v(6)).toBe(v(3));                           // dividends + interest + change in value = wealth generated
  expect(money(all[e + 3])).toBe(v(3));                             // the summary's Wealth generated is the walk's
});

// ── DEC-0064 ─────────────────────────────────────────────────────────────────────────────────────────
// "income below individual asset" — each window carries its own return; no data is a dash, never a zero; the category
// table shows records only and is not drawn when nothing was received.
test('DEC-0064 — with 26 months of record every window prints its own return (phone 3)', () => {
  open(3);
  const b = bar();
  expect(b.map((x) => x[0])).toEqual([expect.stringMatching(/^Since /), '1M', 'This year', '1Y', '2Y']);
  for (const [, f] of b) expect(f).toMatch(PCT);
  expect(new Set(b.map((x) => x[1])).size).toBe(5);                // five windows, five figures of their own
});
test('DEC-0064 — a fresh account (phone 5): every window is a dash, never 0.00%', () => {
  open(5);
  expect(bar().map((x) => x[1])).toEqual(['—', '—', '—', '—', '—']);
  expect(lines().filter((l) => /^[+−-]?0\.00%$/.test(l))).toEqual([]);
});
test('DEC-0064 — after day one, a window in which nothing was received draws no category table (phone 1 with no dividend or interest records)', () => {
  open(1, () => useStore.setState({ transactions: (useStore.getState() as any).transactions.filter((t: any) => t.type === 'DEPOSIT') } as any));
  const all = lines();
  expect(all).toContain('Ending value');                           // the screen rendered
  expect(all).not.toContain('WHAT EACH CATEGORY EARNED');
  // (on day one Performance v17 draws the table at $0 in every row — phones 4 and 5, approved in full, DEC-0647)
});

// ── DEC-0082 ─────────────────────────────────────────────────────────────────────────────────────────
// "it shows connected read only yet numbers are not updated. Is it connected or not?" — a broken connection says so.
test('DEC-0082 — an account the last sync could not reach is named on the Performance tab as unreachable (phone 1)', () => {
  open(1, () => useStore.setState({ syncFailures: [{ accountId: 'etr', at: new Date().toISOString(), reason: 'login expired' }] } as any));
  const all = lines();
  expect(all.filter((l) => /^We couldn't reach E\*TRADE/.test(l))).toHaveLength(1);
});

// ── DEC-0216 ─────────────────────────────────────────────────────────────────────────────────────────
// "standard size 20" — every screen title is 20 points.
test('DEC-0216 — the Performance title prints at 20 points (phone 1 and a fresh account)', () => {
  for (const n of [1, 5]) {
    open(n);
    const t = screen.getAllByText('Performance')[0];
    expect(flat(t).fontSize).toBe(20);
    screen.unmount();
  }
});

// ── DEC-0229 ─────────────────────────────────────────────────────────────────────────────────────────
// the window buttons sit on ONE row, with the app's own corner radius, not semicircle ends. (Its 10.5-point type was
// redrawn at 11 in Performance v17, approved in full on 2026-10-01, DEC-0647; the app prints v17's 11.)
test('DEC-0229 — the five windows sit in one row with the app\'s corner radius, not semicircle ends (phone 1)', () => {
  open(1);
  const track = screen.getByTestId('window-bar');
  const st = flat(track);
  expect(st.flexDirection).toBe('row');
  expect(st.flexWrap).not.toBe('wrap');
  expect(st.borderRadius).toBe(Radii.md);
  const buttons = track.findAll((n: any) => n.props?.accessibilityRole === 'button' && /^Show /.test(String(n.props?.accessibilityLabel ?? '')), { deep: false });
  expect(new Set(buttons.map((b: any) => b.props.accessibilityLabel)).size).toBe(5);
  for (const b of buttons) {
    const s = flat(b);
    expect(s.borderRadius).toBeLessThan((s.minHeight ?? 50) / 2);  // a semicircle end is half the height
  }
});

// ── DEC-0230 ─────────────────────────────────────────────────────────────────────────────────────────
// "We never back-fill a year we didn't record." A value typed by hand, with no holding history, gets no invented start.
test('DEC-0230 — an account typed by hand as one total, recorded from today: 1M, This year, 1Y and 2Y are dashes, never a figure', () => {
  open(5, () => {
    const accounts = [acct('ira', undefined, 'MY IRA', 50_000, undefined, [], 0)];
    useStore.setState({ assetAccounts: accounts, transactions: [], snapshotDays: [buildDayFromAccounts(accounts as any, TODAY, `${TODAY}T09:00:00Z`)], invDaily: {}, priceCache: {} } as any);
  });
  const b = bar();
  expect(b.slice(1).map((x) => x[1])).toEqual(['—', '—', '—', '—']);
  expect(lines()).toContain('$50,000');                            // the value itself is real and shown
});

// ── DEC-0232 ─────────────────────────────────────────────────────────────────────────────────────────
// "Yes rebuild — day one history." A linked account's history is rebuilt from its own records, not left blank.
test('DEC-0232 — a linked account rebuilt from its own records: the tab names the source and the first day, and Since begins there (phone 3)', () => {
  open(3);
  const all = lines();
  const line = all.find((l) => l.startsWith('↺ '));
  expect(line).toMatch(/^↺ Rebuilt from E\*TRADE’s own records, back to ([A-Z][a-z]{2} \d{1,2}, \d{4}) — the first day it shares\.$/);
  const first = line!.match(/back to ([A-Z][a-z]{2} \d{1,2}, \d{4})/)![1];
  expect(bar()[0][0]).toBe(`Since ${first}`);
});

// ── DEC-0233 ─────────────────────────────────────────────────────────────────────────────────────────
// "Can it be done like one row with dividers for different periods?" — one control, split by hairlines.
test('DEC-0233 — one control, split by one-point hairlines between the windows not picked (phone 1, Since picked)', () => {
  open(1);
  const track = screen.getByTestId('window-bar');
  const hairlines = track.findAll((n: any) => n.type === 'View' && flat(n).width === 1, { deep: false });
  // Since is picked, so the hairlines sit between 1M | This year | 1Y | 2Y: three of them
  expect(hairlines.length).toBe(3);
});

// ── DEC-0234 ─────────────────────────────────────────────────────────────────────────────────────────
// "why the accounts say linked if hand entered?" — they must not: a hand-entered account says By hand.
test('DEC-0234 — on day one with two accounts entered by hand (phone 4), each says "By hand · you update it" and nothing says Linked', () => {
  open(4);
  const all = lines();
  expect(all.filter((l) => l.includes('By hand · you update it'))).toHaveLength(2);
  expect(all.filter((l) => /\bLinked\b/.test(l))).toEqual([]);
});

// ── DEC-0235 ─────────────────────────────────────────────────────────────────────────────────────────
// "make it two rows, one for time period and second for return below it."
test('DEC-0235 — each window button carries two lines: the window on top, its return beneath (phone 3 and a fresh account)', () => {
  for (const n of [3, 5]) {
    open(n);
    const track = screen.getByTestId('window-bar');
    const buttons = track.findAll((x: any) => x.props?.accessibilityRole === 'button' && /^Show /.test(String(x.props?.accessibilityLabel ?? '')), { deep: false });
    const seen = new Set<string>();
    for (const b of buttons) {
      const label = String(b.props.accessibilityLabel);
      if (seen.has(label)) continue; seen.add(label);
      const texts = b.findAll((x: any) => x.type === 'Text');
      expect(texts).toHaveLength(2);
      const [top, under] = texts.map((t: any) => [].concat(t.props.children).join(''));
      expect(label.startsWith(`Show ${top}`)).toBe(true);
      expect(under).toMatch(/^([+−-]\d+\.\d{2}%|—)$/);
    }
    expect(seen.size).toBe(5);
    screen.unmount();
  }
});

// ── DEC-0237 and DEC-0404 ────────────────────────────────────────────────────────────────────────────
// "2Y — should not be annualized … double check what financial institutions do." → a window longer than a year is a
// yearly rate that says so, with the window's own total beside it; a window of a year or less is never annualised.
test('DEC-0237 · DEC-0404 — with a record covering two years (phone 3), 2Y prints the yearly rate, says so under the control, and states the window\'s own total beside it', () => {
  open(3);
  expect(lines()).toContain('2Y is shown per year, so it sits fairly beside 1Y');
  const twoY = bar()[4][1];
  pick('2Y');
  const all = lines();
  const e = all.indexOf('Return');
  expect(all[e + 1]).toBe(twoY);                                   // the trio's Return is the yearly rate the button shows
  const note = all.find((l) => / over the two years, which is /.test(l));
  expect(note).toBe(`${note!.match(/^([+−-]\d+\.\d{2}%)/)![1]} over the two years, which is ${twoY}/year — a yearly rate, so it sits fairly beside a one-year window.`);
  const total = Number(note!.match(/^\+(\d+\.\d{2})%/)![1]) / 100, rate = Number(twoY.replace(/[+%]/g, '')) / 100;
  expect(Math.abs((1 + rate) ** 2 - 1 - total)).toBeLessThan(0.002);   // the total and the rate are one figure, two ways
});
test('DEC-0237 — a window of a year or less is never annualised: 1Y says "not a yearly rate" (phone 3)', () => {
  open(3);
  pick('1Y');
  expect(lines().filter((l) => /^Return is for the window you picked \(.+\) — not a yearly rate$/.test(l))).toHaveLength(1);
  expect(lines().filter((l) => /\/year — a yearly rate/.test(l))).toEqual([]);
});
// BREACHED, reported to the lead 2026-10-22; FIXED the same day (PF-A, DEC-0237 · DEC-0404): in his own household shape
// (phone 1: the daily record begins eleven months ago, so 2Y's first months are worked back from price history) the 2Y
// summary printed the yearly rate +3.46% and the sentence about the record, but never the two years' own total; and every
// account row printed its 2Y yearly rate with no "/year" and no total ("Linked · wealth generated $2,000 · return +4.87%").
// Both now say the one sentence phone 3 draws — the window's own total, "which is" the yearly rate, "/year".
test('DEC-0237 · DEC-0404 — 2Y worked back from price history (phone 1): the summary states the two years\' own total beside the yearly rate (was BREACHED; fixed 2026-10-22)', () => {
  open(1);
  pick('2Y');
  // the sentence is said once for every account together and once for each account (its open walk or its closed row)
  const said = lines().filter((l) => / over the two years, which is /.test(l));
  expect(said).toHaveLength(3);
  // the summary's: its rate is the one the trio's Return prints, and the total and the rate are one figure, two ways
  const all = lines(); const ret = all[all.indexOf('Return') + 1];
  const summary = said.find((l) => l.includes(`, which is ${ret}/year — a yearly rate`));
  expect(summary).toBeDefined();
  const m = summary!.match(/^\+(\d+\.\d{2})% over the two years, which is ([+−-]\d+\.\d{2}%)\/year — a yearly rate, so it sits fairly beside a one-year window\.$/)!;
  expect(m).not.toBeNull();
  expect(m[2]).toBe(ret);
  expect(Math.abs((1 + Number(ret.replace(/[+%]/g, '')) / 100) ** (2) - 1 - Number(m[1]) / 100)).toBeLessThan(0.002);
});
test('DEC-0237 · DEC-0404 — 2Y on an account row (phone 1): the account\'s yearly rate says so, with its own total (was BREACHED; fixed 2026-10-22)', () => {
  open(1);
  pick('2Y');
  const rows = lines().filter((l) => l.startsWith('🔗 Linked · wealth generated'));
  expect(rows.length).toBeGreaterThanOrEqual(1);   // a guard that proves it looked: the closed account rows
  for (const row of rows) expect(row).toMatch(/ · return [+−-]\d+\.\d{2}% over the two years, which is [+−-]\d+\.\d{2}%\/year$/);
});

// ── DEC-0323 ─────────────────────────────────────────────────────────────────────────────────────────
// "'money-weighted' names two things — rename PORTFOLIO_RETURN to value-weighted; reserve money-weighted for the IRR."
// Since DEC-1669 no return on screen is money-weighted, so the words "money-weighted" must not be read anywhere here.
test('DEC-0323 — no window, in his shape or a fresh account, shows the words "money-weighted" on the Performance tab', () => {
  let looked = 0;
  for (const n of [1, 3, 4, 5]) {
    open(n);
    for (const w of ['1M', 'This year', '1Y', '2Y']) {
      pick(w);
      const all = lines(); looked += all.length;
      expect(all.filter((l) => /money-weighted/i.test(l))).toEqual([]);
    }
    screen.unmount();
  }
  expect(looked).toBeGreaterThan(600);                             // the guard looked: four phones, four windows each
});

// ── DEC-0421 ─────────────────────────────────────────────────────────────────────────────────────────
// "tap the name to open this account's portfolio" — the account's name opens that account's page.
test('DEC-0421 — tapping an account\'s name on the Performance tab opens that account\'s own page, on the window picked (phone 1)', () => {
  open(1);
  pick('1Y');
  fireEvent.press(screen.getAllByLabelText('Open E*TRADE Brokerage — this account\'s own page')[0]);
  expect(mockPush).toHaveBeenCalledWith('/account-detail?id=etr&period=1Y');
  expect(lines()).toContain('Tap ▾ to collapse · tap the name to open this account\'s portfolio ›');
});

// ── DEC-0465 ─────────────────────────────────────────────────────────────────────────────────────────
// "This does not have refresh date and time." A figure from a linked account says when it was last true. (Narrowed by
// DEC-0015: the date shows once the figures are three or more days old; fresh figures carry today's date in the header.)
test('DEC-0465 — the header carries the day the figures are true as of; a linked account last updated five days ago is named with its date, and old prices say when they were fetched (phone 1)', () => {
  open(1, () => {
    const s = useStore.getState() as any;
    const old = new Date(Date.now() - 5 * 86_400_000).toISOString();
    useStore.setState({ assetAccounts: s.assetAccounts.map((a: any) => (a.asset_id === 'etr' ? { ...a, last_synced: old } : a)), pricesFetchedAt: old } as any);
  });
  const all = lines();
  expect(all[1]).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);       // Performance · <today>
  expect(all.filter((l) => /^E\*TRADE.* last updated [A-Z][a-z]{2} \d{1,2}(, \d{4})?$/.test(l))).toHaveLength(1);
  expect(all.filter((l) => l.startsWith('⚠ Prices may be out of date · updated '))).toHaveLength(1);
});

// ── DEC-0479 (the Performance tab's half) ───────────────────────────────────────────────────────────
// "Is there any place we display realized P/L, unrealized P/L, total dividend, and total interest separately?"
// On the Performance tab the walk names dividends and interest on lines of their own, for all accounts and for each.
test('DEC-0479 — dividends and interest each have their own line in the walk, for all accounts and inside each account (phone 1)', () => {
  open(1);
  const all = lines();
  const at = (l: string) => all.reduce((n: number[], x, i) => (x === l ? [...n, i] : n), []);
  expect(at('Dividends').length).toBeGreaterThanOrEqual(2);
  expect(at('Interest').length).toBeGreaterThanOrEqual(2);
  expect(all[at('Dividends')[0] + 1]).toBe('$1,800');              // $1,500 + $300 received
  expect(all[at('Interest')[0] + 1]).toBe('$400');                 // $200 + $200 received
});
