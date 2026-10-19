/** THE PERFORMANCE MODULE AGAINST ITS APPROVED DRAWINGS, WORD FOR WORD AND FIGURE FOR FIGURE (drawing check of
 *  2026-10-12 — report MoneyKeel/documents/audit/moneykeel_audit_mock-match_performance_2026-10-12_v01.md).
 *
 *  perf_matches_v17 compares the WORDS of each phone and treats every figure as "a figure here". This file compares
 *  the figures too: each phone is rendered on the drawing's own day (Sep 30, 2026 for phone 1; Aug 4, 2026 for
 *  phones 3 to 5) with a household whose daily record gives the drawn figures — $100,000 became $123,000 with
 *  $15,000 added; +0.41% over a month, +4.90% this year; $38,000 became $52,704; and so on. Every place the screen
 *  still differs from the drawing is listed in KNOWN with its reason, and each entry must be found (a list that
 *  stops matching fails, rather than going quiet).
 *
 *  It also holds what a word stream cannot see — the rendered colour, size and weight the drawing gives, for every
 *  defect the check found and fixed (FIXED below, numbered as the report's table).
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { niceTicks } from '../../components/ValueGraph';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

// ── dates, without time zones: a calendar day is a string, arithmetic is on UTC midnights ──────────────────────
const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const plus = (d: string, n: number) => iso(ms(d) + n * 86_400_000);
/** the value on day d, on straight lines between the anchors */
function at(anchors: [string, number][], d: string): number {
  for (let i = 0; i + 1 < anchors.length; i += 1) {
    const [d0, v0] = anchors[i]; const [d1, v1] = anchors[i + 1];
    if (d >= d0 && d <= d1) return d1 === d0 ? v1 : v0 + (v1 - v0) * ((ms(d) - ms(d0)) / (ms(d1) - ms(d0)));
  }
  return anchors[anchors.length - 1][1];
}
type Line = [account: string, key: string, units: number, value: (d: string) => number];
/** a daily record from `from` to `to`, every day observed; 'CASH' rows are the account's cash */
function record(from: string, to: string, lines: Line[]): any[] {
  const out: any[] = [];
  for (let d = from; d <= to; d = plus(d, 1)) {
    const rows = lines.map(([a, k, u, v]) => [a, k, u, v(d)] as [string, string, number, number]);
    out.push({
      date: d, origin: 'observed', writtenAt: `${d}T00:00:00Z`,
      holdings: rows.filter((r) => r[1] !== 'CASH').map(([accountId, securityKey, units, value]) => ({ date: d, accountId, securityKey, symbol: securityKey, units, price: value / units, value, currency: 'USD' })),
      accounts: [...new Set(rows.map((r) => r[0]))].map((accountId) => ({ date: d, accountId, currency: 'USD', typedValue: null,
        cash: rows.filter((r) => r[0] === accountId && r[1] === 'CASH').reduce((t, r) => t + r[3], 0),
        statedTotal: rows.filter((r) => r[0] === accountId).reduce((t, r) => t + r[3], 0) })),
    });
  }
  return out;
}
const acct = (id: string, institution: string, label: string, balance: number, linked: boolean, today: string, positions: any[], cash = 0) => ({
  asset_id: id, label, institution, kind: 'brokerage', tax_bucket: 'TAXABLE', balance, target_return: 0.05, cash_balance: cash, positions,
  ...(linked ? { source: 'connected', last_synced: `${today}T09:00:00Z` } : {}),
});
const pos = (id: string, ticker: string, shares: number, price: number, cost: number, date: string, cls = 'stock_etf') => (
  { position_id: id, ticker, asset_class: cls, last_price: price, lots: [{ lot_id: `${id}l`, shares, cost_per_share: cost, purchase_date: date }] });
const closes = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
const txn = (id: string, date: string, type: string, account_id: string, amount: number, ticker?: string) => ({ id, date, type, account_id, amount, ticker, created_at: 'x', source: 'connected' });

/** PHONE 1 — Sep 30, 2026. The record begins Oct 1, 2025: Vanguard $80,000 and E*TRADE $20,000. $15,000 goes into
 *  Vanguard on Dec 1. Dividends $1,500 + $300 and interest $200 + $200. The month reads +0.41% (Aug 30 → today), the
 *  year +4.90% (Dec 31 → today); Vanguard's own time-weighted return 6.88% and everything's 7.46%, the figures phone 1
 *  draws (each solved for the value the evening before the money came in). E*TRADE adds nothing: +10.00%. */
function phone1() {
  const T = '2026-09-30', S = '2025-10-01';
  const X = 123_000 / 1.049, Y = 123_000 / 1.0041;
  const vPre = (1.0688 * 80_000 * 15_000) / (101_000 - 1.0688 * 80_000);      // Vanguard: 6.88% = v/80,000 × 101,000/(v + 15,000)
  const tPre = (1.0746 * 100_000 * 15_000) / (123_000 - 1.0746 * 100_000);    // all: 7.46% = t/100,000 × 123,000/(t + 15,000)
  const etrDec31 = at([[S, 20_000], [T, 22_000]], '2025-12-31'), etrAug30 = at([[S, 20_000], [T, 22_000]], '2026-08-30');
  const etr: [string, number][] = [[S, 20_000], ['2025-11-30', tPre - vPre], ['2025-12-30', etrDec31], ['2025-12-31', etrDec31], ['2026-08-29', etrAug30], ['2026-08-30', etrAug30], [T, 22_000]];
  const van: [string, number][] = [[S, 80_000], ['2025-11-30', vPre], ['2025-12-01', vPre + 15_000], ['2025-12-30', X - etrDec31], ['2025-12-31', X - etrDec31],
    ['2026-08-29', Y - etrAug30], ['2026-08-30', Y - etrAug30], [T, 101_000]];
  // Stocks / Funds +6.10%: VTI's price at the start makes 300 VTI + 40 VOO earn 6.10% to today's $121,000
  const vti0 = ((300 * 330 + 40 * 550) / 1.061 - 40 * 500) / 300;
  return { today: T, state: {
    assetAccounts: [acct('van', 'Vanguard', 'BROKERAGE', 101_000, true, T, [pos('p1', 'VTI', 300, 330, 260, '2025-09-01')], 2_000),
                    acct('etr', 'E*TRADE', 'ACCOUNT 1', 22_000, true, T, [pos('p2', 'VOO', 40, 550, 500, '2025-09-01')], 0)],
    transactions: [txn('d1', '2025-12-01', 'DEPOSIT', 'van', 15_000), txn('v1', '2026-06-30', 'DIVIDEND', 'van', 1_500, 'VTI'), txn('i1', '2026-06-30', 'INTEREST', 'van', 200),
                   txn('v2', '2026-06-30', 'DIVIDEND', 'etr', 300, 'VOO'), txn('i2', '2026-06-30', 'INTEREST', 'etr', 200)],
    snapshotDays: record(S, T, [['van', 'VTI', 300, (d) => at(van, d) - 2_000], ['van', 'CASH', 1, () => 2_000], ['etr', 'VOO', 40, (d) => at(etr, d)]]),
    invDaily: { [S]: 100_000, [T]: 123_000 },
    priceCache: { VTI: closes('VTI', [[plus(S, -1), vti0], [S, vti0], [T, 330]]), VOO: closes('VOO', [[plus(S, -1), 500], [S, 500], [T, 550]]) },
    pricesFetchedAt: `${T}T11:00:00Z`,
  } };
}
/** PHONE 3 — Aug 4, 2026, one linked account rebuilt back to Jun 3, 2024: $38,000 became $52,704 with $9,000 added
 *  (Jul 1, 2024) and $1,200 taken out (Jul 15, 2024). The windows read +0.90% · +4.30% · +7.80% · +7.30% a year, and
 *  Since +16.24%: each anchor is the drawn figure worked back from $52,704 (2Y over its 731 days, the code's ÷ 365). */
function phone3() {
  const T = '2026-08-04', S = '2024-06-03', E = 52_704;
  const v2y = E / 1.073 ** (731 / 365), v1y = E / 1.078, vYtd = E / 1.043, v1m = E / 1.009;
  const k = (1.1624 * v2y) / E;                                // what Jun 3 → Aug 3, 2024 must grow, time-weighted
  const a = (k * 38_000 * 7_800) / (v2y - k * 38_000);         // the value the evening before the $9,000
  const all: [string, number][] = [[S, 38_000], ['2024-06-30', a], ['2024-07-01', a + 9_000], ['2024-07-14', a + 9_000], ['2024-07-15', a + 7_800],
    ['2024-08-03', v2y], ['2024-08-04', v2y], ['2025-08-03', v1y], ['2025-08-04', v1y], ['2025-12-30', vYtd], ['2025-12-31', vYtd], ['2026-07-03', v1m], ['2026-07-04', v1m], [T, E]];
  const vti0 = 40_000 / 1.142 / 100;                           // Stocks / Funds +14.20%
  return { today: T, state: {
    assetAccounts: [acct('etr', 'E*TRADE', 'ACCOUNT 1', E, true, T, [pos('p1', 'VTI', 100, 400, 260, '2024-05-01'), pos('p2', 'US TREASURY 4.25%', 7000, 1, 1, '2024-05-01', 'bond')], 5_704)],
    transactions: [txn('d1', '2024-07-01', 'DEPOSIT', 'etr', 9_000), txn('w1', '2024-07-15', 'WITHDRAWAL', 'etr', 1_200), txn('v1', '2025-10-01', 'DIVIDEND', 'etr', 1_180, 'VTI'),
                   txn('b1', '2025-12-01', 'INTEREST', 'etr', 300, 'US TREASURY 4.25%'), txn('i1', '2026-02-01', 'INTEREST', 'etr', 220)],
    snapshotDays: record(S, T, [['etr', 'VTI', 100, (d) => at(all, d) - 7_000 - 5_704], ['etr', 'US TREASURY 4.25%', 7000, () => 7_000], ['etr', 'CASH', 1, () => 5_704]]),
    invDaily: { [S]: 38_000, [T]: E }, rebuiltFrom: { etr: S },
    priceCache: { VTI: closes('VTI', [[plus(S, -1), vti0], [S, vti0], [T, 400]]) }, pricesFetchedAt: `${T}T11:00:00Z`,
  } };
}
/** PHONE 4 — Aug 4, 2026, day one: Vanguard $301,610 and E*TRADE $52,704, both typed by hand. PHONE 5 — nothing. */
function phone4() {
  const T = '2026-08-04';
  const accounts = [acct('van', 'Vanguard', 'BROKERAGE', 301_610, false, T, [pos('p1', 'VTI', 900, 330, 300, T), pos('p3', 'KEYBANK CD 4.00%', 4610, 1, 1, T, 'bond')], 0),
                    acct('etr', 'E*TRADE', 'ACCOUNT 1', 52_704, false, T, [pos('p2', 'VOO', 90, 550, 500, T)], 3_204)];
  // DAY ONE AS THE APP HAS IT: Home writes today's values to the daily record the moment it opens (captureDailyNw), so on
  // day one the record exists and begins today. Every earlier window is one the record cannot reach — greyed until
  // 2026-10-13 (DEC-3035i), now worked back from each holding's price history (DEC-5291; see KNOWN).
  return { today: T, state: {
    assetAccounts: accounts,
    transactions: [], snapshotDays: [buildDayFromAccounts(accounts as any, T, `${T}T09:00:00Z`)], invDaily: {},
    priceCache: { VTI: closes('VTI', [[T, 330]]), VOO: closes('VOO', [[T, 550]]) }, pricesFetchedAt: `${T}T11:00:00Z`,
  } };
}
const phone5 = () => ({ today: '2026-08-04', state: { assetAccounts: [], transactions: [], snapshotDays: [], invDaily: {}, priceCache: {} } });

/** Every Text on screen, in order, with its rendered colour, size and weight. */
type Shown = { t: string; color?: string; size?: number; weight?: string };
function shown(): Shown[] {
  const out: Shown[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') {
      const t = text(n).replace(/\s+/g, ' ').trim();
      const st = StyleSheet.flatten(n.props?.style) ?? {};
      if (t) out.push({ t: st.textTransform === 'uppercase' ? t.toUpperCase() : t, color: st.color, size: st.fontSize, weight: st.fontWeight == null ? undefined : String(st.fontWeight) });
      return;
    }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
function open(n: 1 | 3 | 4 | 5): Shown[] {
  const { today, state } = ({ 1: phone1, 3: phone3, 4: phone4, 5: phone5 } as const)[n]();
  jest.useFakeTimers({ now: new Date(`${today}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete(true);
  useStore.setState({ hideBalances: false, ...state } as any);
  const PerformanceScreen = require('../PerformanceScreen').default;
  render(<PerformanceScreen />);
  // the graph draws after it knows its width; a test render has none, so it is handed a phone's
  for (const v of screen.UNSAFE_root.findAll((x: any) => typeof x.props?.onLayout === 'function' && x.props?.style?.paddingHorizontal != null)) {
    act(() => { fireEvent(v, 'layout', { nativeEvent: { layout: { width: 334, height: 140, x: 0, y: 0 } } }); });
  }
  return shown();
}
afterEach(() => { jest.useRealTimers(); });

// ── the drawing, phone by phone ─────────────────────────────────────────────────────────────────────────────────
const CHROME = new Set(['9:41', '▦ Menu', 'Money', 'Keel', 'MoneyKeel', '◉', '⚙', '🏠', 'Home', '💎', 'Net worth', '📈', '💵', 'Cash flow', '🧭', 'Plan']);
function drawn(n: number): string[] {
  const p = path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_performance_v17.html');
  let body = fs.readFileSync(p, 'utf8').replace(/^[\s\S]*<body/, '<body').replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  // the graph's dollar gridlines are figures the app works out for itself (KNOWN 9); a lone dollar figure in a
  // day-one frame is today's value and stays
  body = body.replace(/<svg[\s\S]*?<\/svg>/g, (svg) => ((svg.match(/>\$[\d,]+</g) ?? []).length > 1 ? svg.replace(/<text[^>]*>\$[\d,]+<\/text>/g, '') : svg));
  const lines = body.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const starts = lines.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  expect(starts.length).toBe(5);                                       // the guard proves it looked: five phones
  const seg = lines.slice(starts[n - 1], starts[n] ?? lines.length);
  const end = seg.findIndex((l, k) => /^🏠/.test(l) && k > 10);
  expect(end).toBeGreaterThan(20);
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
}
/** one stream: case, the ⓘ and the ›, and icons do not count; every word and EVERY FIGURE does */
const stream = (lines: string[]) => lines.join(' ').toLowerCase().replace(/[’‘]/g, "'")
  .replace(/\p{Extended_Pictographic}|️|[ⓘ›]/gu, ' ').replace(/\s+/g, ' ').trim();

/** WHERE THE SCREEN STILL DIFFERS FROM THE DRAWING, AND WHY. [phone, drawn, built, reason]. Each must be found. */
const KNOWN: [number, string, string, string][] = [
  // (b) — a READ THIS FIRST row on the drawing says so
  [1, 'since oct 1 7.46%/year', 'since oct 1, 2025 +7.46%', 'DEC-1669: time-weighted, no rate per year stands in (and the date — see 7)'],
  [1, 'return 7.46% money moved in and out in amounts where when it moved would decide a window return, so this is your rate per year, counting when you added money',
    'return +7.46% return is for the window you picked (oct 1, 2025 → sep 30, 2026) — not a yearly rate · time-weighted, so money you added never counts as return',
    'DEC-1669 (2): mark 16 is gone; the ordinary note, joined by "·" as phone 3 draws it'],
  [1, 'linked money moved in and out in amounts where when it moved would decide a window return, so this is your rate per year, counting when you added money beginning',
    'linked beginning', 'DEC-1669 (2): its sentence is not shown'],
  [1, 'return 6.88%/year tap', 'return +6.88% tap', 'DEC-1669 (2): no "/year" on an open account\'s Return'],
  [3, 'money-weighted, so money you added', 'time-weighted, so money you added', 'DEC-1669 (1)'],
  // (c) — decided here, written in the report
  [1, '(oct 1)', '(oct 1, 2025)', '7: one date writer — the walk and the bars name the year whenever the date is not this year; phone 1 itself writes "SINCE OCT 1, 2025" on its summary bar'],
  [1, '(sep 30)', '(sep 30, 2026)', '7: the same writer'],
  [1, 'since oct 1 category', 'since oct 1, 2025 category', '7: the same writer'],
  [1, 'cash in this account $400 2.50%/year', 'cash in this account $400 —', '8: the app holds no interest rate for cash (perf_matches_v17 difference 1)'],
  [3, 'bonds & cds $300 4.20%/year', 'bonds & cds $300 —', '8: a bond inside a linked account states no rate'],
  [3, 'cash in this account $220 2.50%/year', 'cash in this account $220 —', '8: as above'],
  [1, 'e*trade account 1', 'e*trade brokerage', '10: the account name rule of 2026-08-11 — a taxable account with no digits reads institution + Brokerage'],
  [3, 'e*trade account 1', 'e*trade brokerage', '10'],
  [4, 'e*trade account 1', 'e*trade brokerage', '10'],
  [3, 'linked · wealth generated $6,904 since jun 3, 2024', 'linked · wealth generated $6,904 · return +16.24%', '11: one closed-account line; phone 1\'s wording, the one v17 marks as new'],
  // (b) — DEC-5136 (2026-10-13, his words: "HOW $38,000 BECAME $52,704 · ALL ACCOUNTS - this is the title. Not - "How xxx
  // stands. ALl Accounts""): the walk's title names the beginning and the ending on day one too; a READ THIS FIRST row says so
  [4, "how today's value stands · all accounts $354,314", 'how $354,314 became $354,314 · all accounts', 'DEC-5136: one walk title in every state'],
  [5, "how today's value stands · all accounts $0", 'how $0 became $0 · all accounts', 'DEC-5136: one walk title in every state'],
  // (b) — DEC-5291 (2026-10-13, his word "approved." on: "Let price history count. When a period starts before the daily
  // record, work it back from each holding's price history and name what's left out, rather than greying it."). A window
  // the record cannot reach is worked back where a holding has a history; a READ THIS FIRST row on the drawing says so.
  [1, '1y — 2y — summary', '1y +6.10% 2y +11.10% 2y is shown per year, so it sits fairly beside 1y summary',
    'DEC-5291: the record begins Oct 1, 2025; 1Y is worked back from VTI and VOO prices (Stocks / Funds +6.10%), 2Y counts each holding from its Sep 1, 2025 purchase (330 ÷ 260 and 550 ÷ 500) a year'],
  [4, 'since today — 1m — this year — 1y — 2y — summary', 'since today — 1m +10.00% this year +10.00% 1y +10.00% 2y +4.87% 2y is shown per year, so it sits fairly beside 1y summary',
    'DEC-5291: each holding was bought inside the window, so its gain is value less cost (VTI 330 ÷ 300, VOO 550 ÷ 500); 2Y is (1.10)^(365 ÷ 731) − 1 = 4.87%'],
  [4, "day one: your value is real, your return starts measuring from today. we never back-fill a year we didn't see.",
    "you added your accounts today. figures for 1m, 1y and longer come from each holding's past prices.",
    'DEC-5291: the day-one line says the longer windows come from price history; DEC-5425 (2026-10-14, "approved."): in his words'],
];

describe('Performance v17 — every word and every figure, in each data state', () => {
  test.each([[1], [3], [4], [5]] as [1 | 3 | 4 | 5][])('phone %i', (n) => {
    let want = stream(drawn(n));
    for (const [p, a, b] of KNOWN.filter((k) => k[0] === n)) {
      expect(want.includes(a) ? a : `NOT FOUND: ${a}\n IN: ${want}`).toBe(a);   // a known difference that stopped matching fails
      want = want.split(a).join(b);
    }
    const got = stream(open(n).map((s) => s.t));
    expect(want.split(' ').length).toBeGreaterThan(60);
    expect(got).toBe(want);
  });
});

const find = (rows: Shown[], t: string, from = 0) => { const i = rows.findIndex((r, k) => k >= from && r.t === t); expect(i).toBeGreaterThanOrEqual(0); return rows[i]; };
const idx = (rows: Shown[], t: string, from = 0) => rows.findIndex((r, k) => k >= from && r.t === t);

describe('FIXED by the drawing check of 2026-10-12 — what a word stream cannot see', () => {
  test('1 · two notes on one line with a "·" between (v17 phones 1 and 3; were two rows with no "·")', () => {
    const r = open(3).map((s) => s.t);
    const at1 = r.indexOf('Return is for the window you picked (Jun 3, 2024 → Aug 4, 2026) — not a yearly rate');
    expect(r.slice(at1, at1 + 5)).toEqual(['Return is for the window you picked (Jun 3, 2024 → Aug 4, 2026) — not a yearly rate', 'ⓘ', '·', 'time-weighted, so money you added never counts as return', 'ⓘ']);
    const at2 = r.indexOf('Earned = dividends + interest received in this window');
    expect(r.slice(at2, at2 + 5)).toEqual(['Earned = dividends + interest received in this window', 'ⓘ', '·', 'a /year figure is that category’s yearly pace', 'ⓘ']);
    // and they sit in one wrapping row, not a row each
    const rowOf = (t: string) => screen.getByText(t).parent?.parent;
    expect(rowOf('time-weighted, so money you added never counts as return')).toBe(rowOf('Return is for the window you picked (Jun 3, 2024 → Aug 4, 2026) — not a yearly rate'));
  });

  test('2 · the window control\'s colours (v17 .segK, .segNo, .segOn)', () => {
    const r = open(1);
    expect(find(r, '1M')).toMatchObject({ color: Colors.textTertiary });                        // at rest: #76766F (was #6B6B66)
    // phone 1's 1Y now carries a figure worked back from price history (DEC-5291, 2026-10-13): at rest, not greyed
    expect(r[idx(r, '1Y')]).toMatchObject({ color: Colors.textTertiary });
    screen.unmount(); jest.useRealTimers();
    // a window with no figure is greyed: phone 5, nothing entered, so no holding has a history
    const e = open(5);
    const y1 = idx(e, '1Y');
    expect(e[y1]).toMatchObject({ color: Colors.textDisabled });                                // greyed: #A8A8A2 (was #76766F)
    expect(e[y1 + 1]).toMatchObject({ t: '—', color: Colors.textDisabledFaint });               // its dash: #C2C2BB
    screen.unmount(); jest.useRealTimers();
    const d = open(4);
    expect(d[idx(d, 'Since today') + 1]).toMatchObject({ t: '—', color: Colors.primaryDark }); // the chosen window's dash is green (was grey)
  });

  test('3 · the date and the summary\'s labels at 13 — v17 draws 12, the one scale takes it up (DEC-0059); both were 11', () => {
    const r = open(4);
    expect(find(r, 'Aug 4, 2026')).toMatchObject({ size: 13 });
    for (const l of ['Ending value', 'Wealth generated', 'Return']) expect(find(r, l)).toMatchObject({ size: 13 });
  });

  test('4 · the walk: the strong labels 700, their figures 900; money taken out is not red (v17 phone 3 "−$1,200")', () => {
    const r = open(3);
    const w = idx(r, 'Wealth generated', idx(r, 'HOW $38,000 BECAME $52,704 · ALL ACCOUNTS'));
    expect(r[w]).toMatchObject({ weight: '700' }); expect(r[w + 1]).toMatchObject({ t: '$6,904', weight: '900' });
    expect(find(r, 'Ending market value (Aug 4, 2026)')).toMatchObject({ weight: '700' });
    expect(r[idx(r, 'Ending market value (Aug 4, 2026)') + 1]).toMatchObject({ t: '$52,704', weight: '900', color: Colors.primaryDark });
    expect(r[idx(r, 'Withdrawals') + 1]).toMatchObject({ t: '−$1,200', color: Colors.textPrimary });   // was red
  });

  test('5 · the notes in the secondary grey; the rebuilt line at 13 (v17 .mut, .emptynote)', () => {
    const r = open(3);
    expect(find(r, 'Return is for the window you picked (Jun 3, 2024 → Aug 4, 2026) — not a yearly rate')).toMatchObject({ color: Colors.textSecondary });
    expect(find(r, '2Y is shown per year, so it sits fairly beside 1Y')).toMatchObject({ color: Colors.textSecondary });
    expect(find(r, 'Every line here comes from E*TRADE’s own records. A hand-entered account or a cash balance has none, so it starts the day you enter it — and says so.')).toMatchObject({ color: Colors.textSecondary });
    expect(find(r, '↺ Rebuilt from E*TRADE’s own records, back to Jun 3, 2024 — the first day it shares.')).toMatchObject({ size: 13, color: Colors.textSecondary });
  });

  test('6 · the category table: headings secondary, EARNED and RETURN 700; All categories 700 / 900 in the text colour; a day-one dash secondary', () => {
    const r = open(4);
    expect(find(r, 'CATEGORY')).toMatchObject({ color: Colors.textSecondary, weight: '800' });
    expect(find(r, 'EARNED')).toMatchObject({ color: Colors.textSecondary, weight: '700' });
    expect(find(r, 'RETURN')).toMatchObject({ color: Colors.textSecondary, weight: '700' });
    const s = idx(r, 'Stocks / Funds');
    expect(r[s + 1]).toMatchObject({ t: '$0', color: Colors.textPrimary });
    expect(r[s + 2]).toMatchObject({ t: '—', color: Colors.textSecondary });
    expect(find(r, 'All categories')).toMatchObject({ weight: '700' });
    expect(r[idx(r, 'All categories') + 1]).toMatchObject({ t: '$0', weight: '900', color: Colors.textPrimary });
  });

  test('7 · the graph: a line longer than a year names the year at both ends; a year-long one does not (v17 phones 3 and 1)', () => {
    const r3 = open(3).map((s) => s.t);
    const i = r3.indexOf('Jun 3, 2024');
    expect(r3.slice(i, i + 2)).toEqual(['Jun 3, 2024', 'Aug 4, 2026']);
    screen.unmount(); jest.useRealTimers();
    const r1 = open(1).map((s) => s.t);
    const j = r1.indexOf('Oct 1');
    expect(r1.slice(j, j + 2)).toEqual(['Oct 1', 'Sep 30']);
  });

  test('8 · the gridlines hold the whole line: $38,000 to $52,704 (phone 3) gave a top line of $50,000', () => {
    const t = niceTicks(38_000, 52_704, 4);
    expect(t[0]).toBeGreaterThanOrEqual(52_704); expect(t[t.length - 1]).toBeLessThanOrEqual(38_000);
    expect(t).toEqual([60_000, 50_000, 40_000, 30_000]);
    expect(niceTicks(100_000, 123_000, 4)).toEqual([130_000, 120_000, 110_000, 100_000]);       // phone 1: unchanged
    // the class, not the one case: any range — the four lines hold it
    for (const [lo, hi] of [[1, 99], [38, 52.7], [9_900, 10_100], [354_000, 354_314], [0, 1_000_001], [12_345, 98_765]]) {
      const u = niceTicks(lo, hi, 4); expect(u[0]).toBeGreaterThanOrEqual(hi); expect(u[3]).toBeLessThanOrEqual(lo);
    }
  });

  test('9 · day one: the words inside the empty frame are the chart\'s own labels, tertiary (v17 phones 4 and 5, .axlab)', () => {
    const r = open(4);
    expect(find(r, 'your line starts today')).toMatchObject({ color: Colors.textTertiary });
  });
});


describe('ARROWS AND ONE RIGHT EDGE (follow-up, 2026-10-12): "›" on each account bar as v17 draws it; every figure on one edge (DEC-0093)', () => {
  const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));
  /** every host node with its parent */
  function nodes(): { n: any; parent: any }[] {
    const out: { n: any; parent: any }[] = [];
    const walk = (n: any, parent: any) => { if (n == null || typeof n === 'string') return; if (Array.isArray(n)) { n.forEach((c) => walk(c, parent)); return; } out.push({ n, parent }); (n.children ?? []).forEach((c: any) => walk(c, n)); };
    walk(screen.toJSON(), null);
    return out;
  }
  const FIGURE = /^(?:[−+]?\$[\d,]+|[+−]?\d+\.\d\d%(?:\/year)?|—)$/;
  test.each([[1, 2], [3, 1], [4, 2]] as [1 | 3 | 4, number][])('phone %i: one "›" per account bar (%i), none on the all-accounts bar or the category rows (DEC-0128)', (n, accounts) => {
    open(n);
    const arrows = nodes().filter(({ n: x }) => x.type === 'Text' && textOf(x) === '›');
    expect(arrows).toHaveLength(accounts);
    for (const { parent } of arrows) expect(parent.props.testID).toBe('right-gutter');
    // each sits on an account bar: the bar's title names the account
    const bars = nodes().filter(({ n: x }) => (x.children ?? []).some((c: any) => c?.props?.testID === 'right-gutter' && textOf(c) === '›'));
    expect(bars.map(({ n: x }) => textOf(x))).toEqual(expect.arrayContaining([expect.stringMatching(/Brokerage/)]));
    expect(bars.every(({ n: x }) => !/ALL ACCOUNTS|CATEGORY/.test(textOf(x)))).toBe(true);
  });
  test.each([[1], [3]] as [1 | 3][])('phone %i: every figure in a bar, a walk or the category table ends at the same gutter', (n) => {
    open(n);
    const all = nodes();
    const gutters = all.filter(({ n: x }) => x.props?.testID === 'right-gutter');
    for (const { n: g } of gutters) expect(StyleSheet.flatten(g.props.style).width).toBe(16);
    const figs = all.filter(({ n: x }) => x.type === 'Text' && FIGURE.test(textOf(x).trim()));
    const edged = figs.filter(({ n: x, parent }) => {
      const kids = (parent?.children ?? []).filter((c: any) => c && typeof c !== 'string');
      const st = StyleSheet.flatten(x.props.style) ?? {};
      return kids[kids.length - 1]?.props?.testID === 'right-gutter' && kids[kids.length - 2] === x && !st.marginRight && !st.paddingRight;
    });
    // the figures that are not on the right edge, by design: the five window buttons, the three in the summary row,
    // and the category table's EARNED column — a column of its own, every cell the same fixed width, one cell left of RETURN
    const off = figs.filter((f) => !edged.includes(f));
    const earned = off.filter(({ n: x }) => StyleSheet.flatten(x.props.style)?.width === 84);
    expect(off.length - earned.length).toBe(8);
    expect(earned.length).toBe(n === 1 ? 3 : 4);
    expect(edged.length).toBeGreaterThanOrEqual(n === 1 ? 21 : 12);   // the guard proves it looked
    // a bar bleeds to the card's edge and pads back by the same amount, so its content ends where a row's does
    for (const { n: x } of all.filter(({ n: y }) => (y.children ?? []).some((c: any) => c?.props?.testID === 'right-gutter'))) {
      const st = StyleSheet.flatten(x.props.style) ?? {};
      expect((st.marginRight ?? st.marginHorizontal ?? 0) + (st.paddingRight ?? st.paddingHorizontal ?? 0)).toBe(0);
    }
  });
});

test('10 · Holding detail v02 phone 3: "Holding liquidated …" in the text colour (it had none, so it fell to black)', () => {
  jest.useFakeTimers({ now: new Date('2026-10-01T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, pricesFetchedAt: '2026-10-01T11:00:00Z',
    assetAccounts: [{ asset_id: 'et', label: 'E*TRADE', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
      positions: [{ position_id: 'p1', ticker: 'LCTX', label: 'Lucid Diagnostics', kind: 'stocks_etf', lots: [] }] }],
    priceCache: { LCTX: closes('LCTX', [['2025-08-01', 2.1], ['2026-09-30', 1.48], ['2026-10-01', 1.42]]) } } as any);
  mockParams = { account: 'et', position: 'p1', period: '2Y' };
  const HoldingDetailScreen = require('../HoldingDetailScreen').default;
  render(<HoldingDetailScreen />);
  expect(find(shown(), 'Holding liquidated — all shares sold. Its history is kept below.')).toMatchObject({ color: Colors.textPrimary });
  mockParams = {};
});
