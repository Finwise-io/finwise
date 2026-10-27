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
type Line = [account: string, key: string, units: number | ((d: string) => number), value: (d: string) => number];
/** a daily record from `from` to `to`, every day observed; 'CASH' rows are the account's cash */
function record(from: string, to: string, lines: Line[]): any[] {
  const out: any[] = [];
  for (let d = from; d <= to; d = plus(d, 1)) {
    const rows = lines.map(([a, k, u, v]) => [a, k, typeof u === 'function' ? u(d) : u, v(d)] as [string, string, number, number]);
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
  // ONE HOUSEHOLD THAT AGREES WITH ITSELF (2026-10-25, MM-PF D17). Its prices said 300 VTI were worth 300 × $313.48 = $94,043 on
  // Oct 1, 2025 while its daily record said $78,000 — the price was solved backwards to force Stocks / Funds +6.10%. The record
  // is the true one: it is what phone 1 draws (Vanguard $80,000, E*TRADE $20,000 on Oct 1). So the household is built from what
  // phone 1 states, and every price equals the record's value on every day both hold one:
  //   Vanguard $80,000 → $101,000, $15,000 paid in (Dec 1), dividends $1,500, interest $200 → change in investment value $4,300
  //   E*TRADE  $20,000 →  $22,000, nothing paid in,       dividends   $300, interest $200 → change in investment value $1,500
  // The money paid in, the dividends and the interest land in each account's cash; the holdings move only by their price:
  //   Vanguard cash $2,000 → +15,000 (Dec 1) → +1,700 (Jun 30) = $18,700; VTI 200 × $390.00 = $78,000 → 200 × $411.50 = $82,300 (+$4,300)
  //   E*TRADE  cash $2,900 → +500 (Jun 30) = $3,400;                       VOO  40 × $427.50 = $17,100 →  40 × $465.00 = $18,600 (+$1,500)
  //   Stocks / Funds: (82,300 + 18,600) ÷ (78,000 + 17,100) − 1 = 100,900 ÷ 95,100 − 1 = +6.10%, as drawn.
  // The two cash figures at the start are the only free choice (the drawing gives none); they are set so Stocks / Funds is +6.10%.
  // Each holding was bought on Sep 1, 2025 at its Oct 1 price, as the old lots were ($260 = $78,000 ÷ 300, $500 = $20,000 ÷ 40).
  const cashV = (d: string) => 2_000 + (d >= '2025-12-01' ? 15_000 : 0) + (d >= '2026-06-30' ? 1_500 + 200 : 0);
  const cashE = (d: string) => 2_900 + (d >= '2026-06-30' ? 300 + 200 : 0);
  return { today: T, state: {
    assetAccounts: [acct('van', 'Vanguard', 'BROKERAGE', 101_000, true, T, [pos('p1', 'VTI', 200, 411.5, 390, '2025-09-01')], 18_700),
                    acct('etr', 'E*TRADE', 'ACCOUNT 1', 22_000, true, T, [pos('p2', 'VOO', 40, 465, 427.5, '2025-09-01')], 3_400)],
    transactions: [txn('d1', '2025-12-01', 'DEPOSIT', 'van', 15_000), txn('v1', '2026-06-30', 'DIVIDEND', 'van', 1_500, 'VTI'), txn('i1', '2026-06-30', 'INTEREST', 'van', 200),
                   txn('v2', '2026-06-30', 'DIVIDEND', 'etr', 300, 'VOO'), txn('i2', '2026-06-30', 'INTEREST', 'etr', 200)],
    snapshotDays: record(S, T, [['van', 'VTI', 200, (d) => at(van, d) - cashV(d)], ['van', 'CASH', 1, cashV], ['etr', 'VOO', 40, (d) => at(etr, d) - cashE(d)], ['etr', 'CASH', 1, cashE]]),
    invDaily: { [S]: 100_000, [T]: 123_000 },
    priceCache: { VTI: closes('VTI', [[plus(S, -1), 390], [S, 390], [T, 411.5]]), VOO: closes('VOO', [[plus(S, -1), 427.5], [S, 427.5], [T, 465]]) },
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
  // ONE HOUSEHOLD THAT AGREES WITH ITSELF (2026-10-25, the D17 class). Its prices put 100 VTI at 100 × $350.26 = $35,026 on
  // Jun 3, 2024 and its daily record at $38,000 − $7,000 − $5,704 = $25,296; the $9,000 paid in and the $1,200 taken out moved
  // VTI's value with no share bought or sold, and the dividends and interest landed nowhere. The record is the true one: its
  // account values are what phone 3 draws ($38,000 → $52,704, $9,000 in on Jul 1, 2024, $1,200 out on Jul 15). So:
  //   · every flow moves the cash: + $9,000 paid in, − $Q of it spent on 21 VTI the same day, − $1,200 taken out, + $1,180 of
  //     dividends, + $300 and + $220 of interest;
  //   · VTI moves only by its price: 99 shares held, 21 bought on Jul 1, 2024, so 120 today; the Treasury is $3,000, flat
  //     (no price history the app holds, so Bonds & CDs reads — , as drawn on the 2026-10-25 line);
  //   · the prices agree with the record on every day both hold one (Jun 2 and 3, Jun 30 and Jul 1, 2024, today).
  // Five conditions fix the figures (P0 VTI's price on Jun 3, 2024, P1 on Jul 1, 2024, PT today, C0 the cash on Jun 3):
  //   PT = 1.142 × P0 ............................... Stocks / Funds +14.20%, VTI's own move (the purchase at that day's close)
  //   99 P0 + 3,000 + C0 = 38,000 ................... the beginning
  //   99 P1 + 3,000 + C0 = a ........................ the value the evening before the $9,000 (a, set by the drawn +16.24%)
  //   120 PT + 3,000 + C0 + 9,000 − 21 P1 + 500 = 52,704   the ending (the cash's flows: + 9,000 − buy − 1,200 + 1,700)
  // so 99 (P1 − P0) = a − 38,000 = $2,377.76, and 0.142 × 120 × P0 = 5,204 + 21 (P1 − P0): P0 = $335.00, P1 = $359.02,
  // PT = $382.57, the 21 shares cost $7,539.34, C0 = $1,835.15 (cash today $3,795.81). A $7,000 Treasury cannot hold: the
  // cash on Jun 3 would be 31,000 − 99 × 335.00 = −$2,165. VTI's own move: (99 × 359.02 ÷ 99 × 335.00) × (120 × 382.57 ÷
  // (99 × 359.02 + 7,539.34)) − 1 = 382.57 ÷ 335.00 − 1 = +14.20%.
  // The window figures (+0.90% · +4.30% · +7.80% · +7.30% a year · Since +16.24%) are the account's record, unchanged.
  const A = a - 38_000;
  const P0 = (5_204 + 21 * (A / 99)) / (0.142 * 120), P1 = P0 + A / 99, PT = 1.142 * P0, Q = 21 * P1, C0 = 38_000 - 3_000 - 99 * P0;
  const cash = (d: string) => C0 + (d >= '2024-07-01' ? 9_000 - Q : 0) - (d >= '2024-07-15' ? 1_200 : 0) + (d >= '2025-10-01' ? 1_180 : 0) + (d >= '2025-12-01' ? 300 : 0) + (d >= '2026-02-01' ? 220 : 0);
  const vti = { position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: PT,
    lots: [{ lot_id: 'p1a', shares: 99, cost_per_share: 260, purchase_date: '2024-05-01' }, { lot_id: 'p1b', shares: 21, cost_per_share: P1, purchase_date: '2024-07-01' }] };
  return { today: T, state: {
    assetAccounts: [acct('etr', 'E*TRADE', 'ACCOUNT 1', E, true, T, [vti, pos('p2', 'US TREASURY 4.25%', 3000, 1, 1, '2024-05-01', 'bond')], cash(T))],
    transactions: [txn('d1', '2024-07-01', 'DEPOSIT', 'etr', 9_000), { ...txn('t1', '2024-07-01', 'BUY', 'etr', Q, 'VTI'), shares: 21, price: P1 },
                   txn('w1', '2024-07-15', 'WITHDRAWAL', 'etr', 1_200), txn('v1', '2025-10-01', 'DIVIDEND', 'etr', 1_180, 'VTI'),
                   txn('b1', '2025-12-01', 'INTEREST', 'etr', 300, 'US TREASURY 4.25%'), txn('i1', '2026-02-01', 'INTEREST', 'etr', 220)],
    snapshotDays: record(S, T, [['etr', 'VTI', (d) => (d >= '2024-07-01' ? 120 : 99), (d) => at(all, d) - 3_000 - cash(d)], ['etr', 'US TREASURY 4.25%', 3000, () => 3_000], ['etr', 'CASH', 1, cash]]),
    invDaily: { [S]: 38_000, [T]: E }, rebuiltFrom: { etr: S },
    priceCache: { VTI: closes('VTI', [[plus(S, -1), P0], [S, P0], ['2024-06-30', P1], ['2024-07-01', P1], [T, PT]]) }, pricesFetchedAt: `${T}T11:00:00Z`,
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
  // DEC-6412 (2026-10-19, his word "approved.", amending DEC-5291): a window that opens before the record begins is
  // JOINED at the record's first day — only the days before it are worked back from prices, then the record's own return.
  [1, '1y — 2y — summary', '1y +7.46% 2y +3.66% 2y is shown per year, so it sits fairly beside 1y summary',
    'DEC-6412: the record begins Oct 1, 2025. 1Y: VTI and VOO did not move from Sep 29 to Oct 1, 2025 (their first closes are Sep 30), so 1Y = the record\'s own +7.46%, as Since. 2Y: each holding from its Sep 1, 2025 purchase to Oct 1, 2025 — bought at its Oct 1 price, so +0.00% — chained to +7.46%: 1.0000 × 1.0746 = 1.0746 over the 731 days of Sep 30, 2024 → Sep 30, 2026, (1.0746)^(365 ÷ 731) − 1 = +3.66% a year. It read +11.81% a year while the household\'s prices put VTI at $313.48 on Oct 1 against $260 in its own record (2026-10-25, MM-PF D17; the drawing\'s line of that day gives both). Before DEC-6412 (worked back whole): 1Y +6.10%, 2Y +11.10%'],
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
    // and they sit in one wrapping row, not a row each. THE ROW IS THE NEAREST VIEW LAID OUT AS A ROW above each note — read by
    // what it is, not by counting parents: a Text that speaks its figures (SaidText, 2026-10-22) is one more component between a
    // note and its row, and a fixed ".parent.parent" then named the wrapper. Compared as a yes/no, so a failure prints one line,
    // never two whole element trees (which ran the run out of memory, 2026-10-22).
    const rowOf = (t: string) => {
      let n: any = screen.getByText(t).parent;
      while (n && !(n.type === 'View' && StyleSheet.flatten(n.props?.style)?.flexDirection === 'row')) n = n.parent;
      return n;
    };
    const one = rowOf('Return is for the window you picked (Jun 3, 2024 → Aug 4, 2026) — not a yearly rate');
    expect(one != null).toBe(true);
    expect(rowOf('time-weighted, so money you added never counts as return') === one ? 'one row' : 'two rows').toBe('one row');
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
    // THE SMALLEST ROUND STEP THAT HOLDS THE LINE (2026-10-25, MM-PF D6): phone 3's four lines are the ones v17 phone 3 draws, read
    // off the drawing itself — they were $60,000 … $30,000
    const v17 = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_performance_v17.html'), 'utf8');
    const frames = v17.split('<div class="phone">');
    expect(frames).toHaveLength(6);                                  // five phones, read by their frames, not by line numbers
    const p3 = frames[3];
    const drawnTicks = [...p3.matchAll(/class="axlab">\$([\d,]+)</g)].map((m) => Number(m[1].replace(/,/g, '')));
    expect(drawnTicks).toEqual([54_000, 48_000, 42_000, 36_000]);
    expect(t).toEqual(drawnTicks);
    // phone 1: unchanged. v17 phone 1 draws $125,000 · $115,000 · $105,000, a bottom line above the $100,000 its line starts at
    // (DEC-0229 (11)); the app's lines hold the line, and the drawing's dated line of 2026-10-25 says so
    expect(niceTicks(100_000, 123_000, 4)).toEqual([130_000, 120_000, 110_000, 100_000]);
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

describe('DEC-6412 · the Performance tab joins a window that opens before the record at its first day (2026-10-19)', () => {
  test('phone 1, 1Y picked: Return +7.46%, the same as Since, and the line naming the record\'s first day', () => {
    open(1);
    const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Show 1Y'))!;
    fireEvent.press(btn);
    const words = shown().map((x) => x.t);
    expect(words[words.indexOf('Return') + 1]).toBe('+7.46%');
    expect(words).toContain('Your daily record begins Oct 1, 2025, so the days before it are worked back from each holding’s price history.');
  });
});


// ── THE PERFORMANCE DRAWING CHECK OF 2026-10-24 (MM-PF), ITS DEFECTS FIXED 2026-10-25 ──────────────────────────────────────
// Each test names the defect it holds. The drawing's READ THIS FIRST lines of 2026-10-25 say what changed and why.
describe('FIXED by the drawing check of 2026-10-24 (MM-PF, fixed 2026-10-25) — on the drawing\'s own days', () => {
  const pick = (w: string) => {
    const b = screen.getAllByRole('button').find((x) => String(x.props.accessibilityLabel ?? '').startsWith(`Show ${w}`));
    expect(b).toBeDefined();
    fireEvent.press(b!);
  };
  /** the category table as printed: from its bar to the All categories figure */
  const table = (r: Shown[]) => {
    const at = idx(r, 'WHAT EACH CATEGORY EARNED');
    expect(at).toBeGreaterThan(0);                                   // the table is drawn
    return r.slice(at, idx(r, 'All categories', at) + 2);
  };

  test('D3 · the category table is drawn in every window, each category held at $0 where nothing came in (phone 1 on 1M; it vanished)', () => {
    open(1); pick('1M');
    const t = table(shown());
    // phone 1's accounts hold VTI and VOO (Stocks / Funds) and cash in both: the two rows phone 1 draws, nothing received this month
    expect(t.map((x) => x.t).filter((x) => /^(Stocks \/ Funds|Cash in this account|Bonds & CDs)$/.test(x))).toEqual(['Stocks / Funds', 'Cash in this account']);
    const earned = t.filter((x) => x.t === '$0');
    expect(earned).toHaveLength(3);                                  // two rows and All categories
    for (const e of earned) expect(e.color).not.toBe(Colors.gainText);   // $0 is in the text colour, as phones 4 and 5 draw it
  });
  test('D3 · phones 4 and 5 outside Since: the three rows at $0, and phone 5\'s "the structure never changes" in every window', () => {
    for (const n of [4, 5] as const) {
      for (const w of ['1M', '2Y']) {
        open(n); pick(w);
        const r = shown();
        const t = table(r).map((x) => x.t);
        expect(t.filter((x) => /^(Stocks \/ Funds|Bonds & CDs|Cash in this account)$/.test(x))).toEqual(['Stocks / Funds', 'Bonds & CDs', 'Cash in this account']);
        if (n === 5) {
          expect(r.map((x) => x.t)).toContain('Every line fills in as days pass — the structure never changes.');
          expect(r.map((x) => x.t)).toContain('Fills in with your first dividend or interest record. A file import carries no activity — that line will say so rather than show a false $0.');
        }
        screen.unmount();
      }
    }
  });
  test('D4 · a closed linked account names its source as the green 🔗 Linked label, as an open one does (phone 1, E*TRADE)', () => {
    const r = open(1).map((x) => x.t);
    const at = r.indexOf('🔗 Linked', r.indexOf('▸ E*TRADE BROKERAGE'));
    expect(at).toBeGreaterThan(0);
    expect(r[at + 1]).toBe('· wealth generated $2,000 · return +10.00%');
    expect(find(shown(), '🔗 Linked', at)).toMatchObject({ color: Colors.primaryDark });
    const chips = screen.getAllByText('🔗 Linked');
    expect(chips.length).toBe(2);                                    // the open Vanguard walk's and the closed E*TRADE line's — the guard looked
    for (const c of chips) { let v: any = c.parent; while (v && v.type !== 'View') v = v.parent; expect(StyleSheet.flatten(v.props.style).backgroundColor).toBe(Colors.primaryLight); }
  });
  test('D21 · a closed account typed by hand names its source as the grey ✍️ By hand label Net worth v08 draws (phone 4 on 1M, E*TRADE closed)', () => {
    open(4); pick('1M');
    const r = shown();
    const labels = r.filter((x) => x.t === '✍️ By hand · you update it');
    expect(labels).toHaveLength(2);                                  // the open walk's and the closed line's
    for (const l of labels) expect(l.color).toBe(Colors.textSecondary);
    // E*TRADE, closed: 90 VOO bought today at $500, worth $550 — worked back, it gained 90 × $50 = $4,500, +10.00%
    const r2 = r.map((x) => x.t); const closed = r2.indexOf('✍️ By hand · you update it', r2.indexOf('▸ E*TRADE BROKERAGE'));
    expect(r2[closed + 1]).toBe('· wealth generated $4,500 · return +10.00%');
    for (const c of screen.getAllByText('✍️ By hand · you update it')) { let v: any = c.parent; while (v && v.type !== 'View') v = v.parent; expect(StyleSheet.flatten(v.props.style).backgroundColor).toBe(Colors.bgTertiary); }
  });
  test('D5 · the category bar\'s window words are 13 points, not a money total\'s 15 (v17 .bandv 12; DEC-0059)', () => {
    const r = open(1);
    expect(find(r, 'SINCE OCT 1, 2025', idx(r, 'WHAT EACH CATEGORY EARNED'))).toMatchObject({ size: 13 });
    expect(find(r, '$101,000')).toMatchObject({ size: 15 });         // a bar's money total stays 15 (row of 2026-10-12, (5))
  });
  test('D17 · phone 1 on 2Y, its household agreeing with itself: +7.46% over the two years, which is +3.66%/year', () => {
    open(1); pick('2Y');
    const w = shown().map((x) => x.t);
    // each holding bought Sep 1, 2025 at its Oct 1 price: the days before the record add +0.00%; then the record's +7.46%.
    // 1.0000 × 1.0746 = 1.0746 over the 731 days of Sep 30, 2024 → Sep 30, 2026; 1.0746^(365 ÷ 731) − 1 = +3.66% a year
    expect(w[w.indexOf('Return') + 1]).toBe('+3.66%');
    expect(w).toContain('+7.46% over the two years, which is +3.66%/year — a yearly rate, so it sits fairly beside a one-year window.');
    // E*TRADE added nothing: 1.10^(365 ÷ 731) − 1 = +4.87% a year (the drawing's line of 2026-10-22 had this one right)
    expect(w).toContain('· wealth generated $2,000 · return +10.00% over the two years, which is +4.87%/year');
  });
  test('D7 · Bonds & CDs: a bond whose prices the app holds shows its price change plus its interest (DEC-6212), the same on the account page; cash a dash', () => {
    // phone 3's household with its Treasury an individual bond (a maturity date and its 4.25% rate, as phone 2 draws US Treasury 4.25%)
    // whose prices the app holds, flat at $1.00 for 3,000: (3,000 + 300) ÷ 3,000 − 1 = +10.00% over the 26 months of Since — never
    // /year (Q49). (26 months of a 4.25% coupon on $3,000 is about $276; the drawn $300 is its interest on record.)
    const { today, state } = phone3();
    const st: any = state;
    st.assetAccounts[0].positions[1] = { ...st.assetAccounts[0].positions[1], maturity_date: '2028-02-15', coupon_rate: 0.0425 };
    st.priceCache = { ...st.priceCache, 'US TREASURY 4.25%': closes('US TREASURY 4.25%', [['2024-06-02', 1], ['2024-06-03', 1], [today, 1]]) };
    jest.useFakeTimers({ now: new Date(`${today}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete(true);
    useStore.setState({ hideBalances: false, ...st } as any);
    const PerformanceScreen = require('../PerformanceScreen').default;
    render(<PerformanceScreen />);
    const t = table(shown()).map((x) => x.t);
    expect(t.slice(t.indexOf('Bonds & CDs'), t.indexOf('Bonds & CDs') + 3)).toEqual(['Bonds & CDs', '$300', '+10.00%']);
    expect(t.slice(t.indexOf('Cash in this account') + 1, t.indexOf('Cash in this account') + 4)).toEqual(['ⓘ', '$220', '—']);
    screen.unmount();
    // the account page asks the same function for its BONDS & CDS bar, on the same window
    mockParams = { id: 'etr', period: 'SINCE' };
    const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
    render(<AccountPortfolioScreen />);
    const a = shown().map((x) => x.t);
    const bar = a.findIndex((x) => /^▾ BONDS & CDS$|^BONDS & CDS$/.test(x));
    expect(bar).toBeGreaterThan(0);
    expect(a.slice(bar, bar + 6)).toContain('+10.00%');
    mockParams = {};
  });
});
