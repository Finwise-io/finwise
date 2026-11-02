/** THE PERFORMANCE JOURNEY SUITE — RECORDING FLOWS, E2E-57 TO E2E-62 (2026-10-23).
 *
 *  A person records or changes something, then looks at what it did — on the next sheet or screen, and on every screen that
 *  prints the same figure: the Performance tab (/invest), the account page (/account-detail), the Holding page
 *  (/holding-detail), Home and, for a value typed by hand, Net worth. Real screens, real taps and typing on the controls a
 *  person touches (found by their label or text); the store is written only to set up the starting household. Where a tap
 *  sends the person to another page, that page is rendered next with what the tap carried.
 *
 *  Every figure is worked by hand beside its check. The day is Sep 30, 2026 (the sheet drawings' day); the 1M window opens
 *  Aug 30, so it begins at the Aug 29 close.
 *
 *  WHAT THE FLOWS FOUND, AND WHAT CHANGED IN THE APP (each fix is checked by the flow that found it):
 *   · E2E-57 — a buy recorded in an account built by hand with its own total ($40,000, holding 100 VTI worth $10,000) turned the
 *     account into $10,000 on every screen: the buy opened a cash figure of −$1,000, and an account with a cash figure was
 *     rebuilt from cash and holdings. A trade now moves money inside the account (tradeCash), and only an account built from
 *     its holdings is rebuilt (recomputeBalances).
 *   · E2E-58 — the trade sheet had no way to record a sale's fee. "Fee (opt)" now sits under Shares, Price / share and Date
 *     (trade-sheet drawing v03); the fee comes off once, in the cash, the activity list, wealth generated and the realized gain.
 *   · E2E-59 — recording a sale of every share from the Holding page stopped the page ("Rendered fewer hooks than expected"),
 *     as Delete holding did. The page now closes back to where the person came from.
 *   · E2E-60 — saving the holding editor dropped a purchase whose share count is not on record, so the holding's figures
 *     turned from "Not stated" to a confident, wrong count. It is kept now. A bond fund's row on the account page now gives
 *     the reason too (it read "CDs & Treasuries" over "not stated").
 *   · E2E-61 — the ✎ on a buy you entered asked for an "Amount" that a trade does not have; a price typed wrong could not be
 *     corrected. A buy or a sale is corrected by its shares, price and fee now.
 *   · E2E-62 — nothing wrong found: Update value moves Net worth, the Performance tab and Home together, stamped today.
 *  FOUND HERE AND FIXED BY W-START THE SAME DAY (the return's method, src/domain/performance/index.ts): a holding held when the
 *  window began that sells or buys inside it is now measured from its trades — a sale out at what it brought in after its fee,
 *  a purchase in at what was paid, each from the start of its day — on every window. The flows pin the rule's figures:
 *  E2E-58 +4.15% (it read +4.18%), VTI +5.21% (+5.26%); E2E-61 +4.07% (+4.21%); a buy at today's close moves 1M too (E2E-57).
 */
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { TRADE_SHEET } from '../../testing/sheetStates';
import { amountInBox } from '../../components/MoneyBox';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';

let mockParams: Record<string, string | undefined> = {};
const mockNav = { pushes: [] as string[], backs: 0 };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: () => { mockNav.backs += 1; }, push: (r: string) => mockNav.pushes.push(r), replace: (r: string) => mockNav.pushes.push(r),
    setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const TODAY = '2026-09-30';
beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

// ═══ READING A SCREEN: every Text in order, every figure printed under its identifier ═════════════════════════════════════
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
/** every visible line in order; inSheet: only what is inside an open sheet, with what its boxes show */
function readLines(inSheet = false): string[] {
  const out: string[] = [];
  const walk = (n: any, sheet: boolean) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, sheet)); return; }
    if (n.type === 'Modal') { (n.children ?? []).forEach((c: any) => walk(c, true)); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t && (!inSheet || sheet)) out.push(t); return; }
    if (n.type === 'TextInput' && inSheet && sheet) { const t = String(n.props.value || n.props.placeholder || '').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach((c: any) => walk(c, sheet));
  };
  walk(screen.toJSON(), false);
  return out;
}
const SCREENS: Record<string, () => any> = {
  invest: () => require('../PerformanceScreen').default, account: () => require('../AccountPortfolioScreen').default,
  holding: () => require('../HoldingDetailScreen').default, home: () => require('../HomeScreen').default,
  networth: () => require('../NetWorthScreen').default,
};
type Shot = { printed: { id: string; text: string }[]; lines: string[] };
/** a screen as the person opens it now, from the store as it is, with the params the tap that opened it carried */
function look(name: string, params: Record<string, string | undefined> = {}, act?: () => void): Shot {
  mockParams = params;
  const C = SCREENS[name]();
  const r = render(<C />);
  if (act) act();
  resetFiguresPrinted();
  r.rerender(<C />);
  const shot = { printed: figuresPrinted().filter((p) => !p.spoken).map((p) => ({ id: p.id, text: p.text })), lines: readLines() };
  r.unmount();
  return shot;
}
/** open a screen and keep it open, for taps */
function open(name: string, params: Record<string, string | undefined> = {}) {
  mockParams = params;
  const C = SCREENS[name]();
  return render(<C />);
}
const pick = (label: string) => () => {
  const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${label}`));
  if (!btn) throw new Error(`no window ${label}`);
  fireEvent.press(btn);
};
const after = (sh: Shot, label: string, n = 1) => { const i = sh.lines.indexOf(label); return i >= 0 ? sh.lines[i + n] : undefined; };
const printed = (sh: Shot, id: string) => sh.printed.filter((p) => p.id === id).map((p) => p.text);
const press = (label: string | RegExp) => fireEvent.press(screen.getByLabelText(label));
const type = (label: string | RegExp, v: string) => fireEvent.changeText(screen.getByLabelText(label), v);
const pickDay = (y: number, m: number, d: number) => {
  press(/^transaction date, /);
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  fireEvent(screen.UNSAFE_getByType(DateTimePicker), 'onChange', { type: 'set' }, new Date(y, m - 1, d));
};
const pct = (x: number) => `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(2)}%`;
const homeMonth = (sh: Shot) => sh.lines.find((l) => /this month$/.test(l) && /^▲ up|^▼ down/.test(l));
const acct = (id: string) => (useStore.getState().assetAccounts as any[]).find((a) => a.asset_id === id);

// ═══ READING A SHEET DRAWING: the lines of one state's sheet, in order (the mock-match standing order, step 1) ═══════════
const DRAWINGS = path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance');
const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
/** THE DATED ROW OF 2026-10-27 ON EACH SHEET'S DRAWING (DEC-8385): a money box drawn with a plain figure ('100') reads that figure in money
 *  form on the screen ('$100', or '1,000' beside a $ the screen prints). Applied only where the drawing carries the row, and only to a
 *  drawn plain figure whose shown line is that same figure in money form — any other difference is still a difference. */
function asTheRowSays(file: string, drawn: string[], shown: string[]): string[] {
  const html = fs.readFileSync(path.join(DRAWINGS, file), 'utf8');
  if (!html.includes('Every money box on this screen shows its figure the way a figure is printed')) return drawn;
  return drawn.map((d, j) => (/^\d+(\.\d+)?$/.test(d) && (shown[j] === amountInBox(d) || shown[j] === amountInBox(d, false)) ? shown[j] : d));
}
function drawnSheetLines(file: string, key: string): string[] {
  const html = fs.readFileSync(path.join(DRAWINGS, file), 'utf8');
  const seg = html.split(/<div class="state"[^>]*>/).find((s) => s.startsWith(`STATE ${key} ·`));
  if (!seg) throw new Error(`no state ${key} in ${file}`);
  const sheet = seg.slice(seg.indexOf('<div class="modal">'));
  const out: string[] = [];
  const stack: string[][] = [];
  let line: { depth: number; t: string } | null = null;
  for (const m of sheet.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi)) {
    // the phone's own parts are the drawing's, not the app's: the dimmed strip, a drawn keyboard and its caret
    if (m[4] != null) { if (line && !stack.some((c) => c.some((k) => ['peek', 'kbd', 'caret', 'sbar'].includes(k)))) line.t += decode(m[4]); continue; }
    if (m[1]) { stack.pop(); if (line && stack.length === line.depth) { const t = line.t.replace(/\s+/g, ' ').trim(); if (t) out.push(t); line = null; } continue; }
    const cls = (/class="([^"]*)"/.exec(m[3])?.[1] ?? '').split(/\s+/);
    if (!line && (cls.includes('t') || cls.includes('in'))) line = { depth: stack.length, t: '' };
    stack.push(cls);
  }
  return out;
}

// ═══ THE PRICES (Sep 30, 2026) ═══════════════════════════════════════════════════════════════════════════════════════════
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
/** VTI $95 at the Aug 29 close, $98 on Sep 14 and 15, $100 today; BND $72 → $73; SPY $600 → $606 → $612; AGG $98 → $99 */
const PRICES = {
  VTI: closes([['2025-03-03', 80], ['2026-08-28', 95], ['2026-08-29', 95], ['2026-09-14', 98], ['2026-09-15', 98], ['2026-09-29', 99], ['2026-09-30', 100]]),
  BND: closes([['2025-03-03', 70], ['2026-08-28', 72], ['2026-08-29', 72], ['2026-09-30', 73]]),
  // (2026-11-01, R19: a start reads a close at most 7 days old — a buy today is measured from last night, Sep 29, where these held only
  // Sep 15's; the close is added at the same price it was measured from)
  SPY: closes([['2025-03-03', 500], ['2026-08-28', 600], ['2026-08-29', 600], ['2026-09-14', 606], ['2026-09-15', 606], ['2026-09-29', 606], ['2026-09-30', 612]]),
  AGG: closes([['2025-03-03', 95], ['2026-08-28', 98], ['2026-08-29', 98], ['2026-09-14', 98], ['2026-09-15', 98], ['2026-09-29', 98], ['2026-09-30', 99]]),
};
const lot = (id: string, shares: number | null, cost: number | null, date: string) => ({ lot_id: id, shares, cost_per_share: cost, purchase_date: date });
const VTI = (lots: any[]) => ({ position_id: 'vti', ticker: 'VTI', label: 'Vanguard Total Stock Market ETF', kind: 'stocks_etf', lots });
const BND = (lots: any[]) => ({ position_id: 'bnd', ticker: 'BND', label: 'Vanguard Total Bond Market ETF', kind: 'fixed_income', asset_class: 'bond', lots });
/** Fidelity, named Brokerage, built from its holdings (as Import holdings builds one): $2,000 of cash entered, 100 VTI bought
 *  Mar 3, 2025 at $80, 50 BND bought the same day at $70 — worth 2,000 + 100 × $100 + 50 × $73 = $15,650 today */
const BUILT = () => ({ asset_id: 'fid', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true,
  balance: 2_000 + 100 * 100 + 50 * 73, cash_balance: 2_000, source: 'manual',
  positions: [VTI([lot('v1', 100, 80, '2025-03-03')]), BND([lot('b1', 50, 70, '2025-03-03')])] });
/** THE STARTING HOUSEHOLD, AND HOME UNDER EVERY PAGE. A person who finished onboarding has a profile, and Home is the first
 *  tab: it stays mounted under every page the person opens, and whenever the accounts change it writes today's day to the
 *  daily record from the accounts as they now are (HomeScreen → captureDailyNw, same-day supersede). It is mounted here the
 *  same way, so a recorded change reaches the record exactly as it does on the phone. */
/** THE OPENING RECORDS OF BUILT's PURCHASES, as the app writes them when holdings you already own are first entered (addPosition:
 *  one "Opening holding" per purchase, no way to undo it). An account built by Import holdings has none — see E2E-58. */
const OPENINGS = [
  { id: 'o-vti', account_id: 'fid', type: 'OPENING_POSITION', position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf', shares: 100, price: 80, date: '2025-03-03', created_at: '2025-03-03T12:00:00Z' },
  { id: 'o-bnd', account_id: 'fid', type: 'OPENING_POSITION', position_id: 'bnd', ticker: 'BND', kind: 'fixed_income', shares: 50, price: 70, date: '2025-03-03', created_at: '2025-03-03T12:00:00Z' },
];
function household(state: Record<string, any>) {
  useStore.getState().resetAll();
  mockParams = {}; mockNav.pushes.length = 0; mockNav.backs = 0;
  useStore.setState({ onboardingComplete: true, hideBalances: false, onboardingProfile: { name: 'Pat' }, transactions: [], snapshotDays: [],
    priceCache: PRICES, pricesFetchedAt: new Date().toISOString(), ...state } as any);
  render(React.createElement(SCREENS.home()));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-57 · RECORD A BUY FROM THE ACCOUNT PAGE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-57 · Record a buy from the account page: tap "Add a buy or sale", buy 10 VTI at $100.00, save — the activity lists it and every screen shows the same window figures', () => {
  // ── A · THE TRADE SHEET DRAWING'S HOUSEHOLD AND ITS STATE B ─────────────────────────────────────────────────────────
  // Vanguard, named Brokerage, built by hand: $50,000 typed on Sep 1, $5,000 of it cash, 100 VTI bought Mar 3, 2025 at $80
  // (the trade-sheet drawing's state B, src/testing/sheetStates.tsx, with its Ally savings and its Treasury).
  test.failing('the answer until 2026-11-01, kept (no longer the app\'s): the account read VTI\'s own 100 ÷ 90 − 1 = +11.11% before the buy', () => {
    const B = TRADE_SHEET.states.find((s) => s.key === 'B')!;
    household({ ...B.store, pricesFetchedAt: new Date().toISOString() });
    expect(printed(look('account', { id: 'van', period: '1M' }), 'MK-PF-M-016')[0]).toBe(pct(100 / 90 - 1));
  });
  test('A · the sheet opens with Vanguard chosen, reads state B of the trade-sheet drawing word for word, saves, and the $50,000 the person typed stays $50,000', () => {
    const B = TRADE_SHEET.states.find((s) => s.key === 'B')!;
    household({ ...B.store, pricesFetchedAt: new Date().toISOString() });
    // what the account showed before: its walk and its line on the Performance tab, 1M
    const accBefore = look('account', { id: 'van', period: '1M' });
    const invBefore = look('invest', {}, pick('1M'));
    // the person: the account page → "Add a buy or sale ›" → VTI, 10, $100.00
    open('account', { id: 'van', period: '1M' });
    expect(screen.queryByText('Record activity')).toBeNull();
    B.steps();                                                     // the drawing's own taps: the door, then VTI, 10, 100
    expect(mockNav.pushes).toEqual([]);                            // the sheet opens here; no trip to another tab
    expect(flat(screen.getByLabelText('Account: Vanguard Brokerage').props.style).backgroundColor).toBe(Colors.primaryLight);   // chosen
    expect(screen.queryByLabelText('Account: Ally Savings')).toBeNull();     // a buy is offered only where a holding can be held
    // THE DRAWING'S STATE B, WORD FOR WORD, IN ORDER (moneykeel_pres_mock_trade-sheet_v03.html; v03 draws the fee row)
    const drawn = drawnSheetLines(TRADE_SHEET.file, 'B');
    expect(drawn.length).toBeGreaterThanOrEqual(20);               // it looked: the whole sheet
    const shownB = readLines(true);
    expect(shownB).toEqual(asTheRowSays(TRADE_SHEET.file, drawn, shownB));   // the price box: drawn 100, shown $100 (the row of 2026-10-27)
    expect(drawn).toContain('Available cash: $5,000');           // $1,000 of the $5,000 cash
    expect(drawn).toContain('Fee (opt)');
    press('Record buy');
    expect(screen.queryByText('Record activity')).toBeNull();      // the sheet closes on save
    // the account page lists it, under ACTIVITY, as a record the person entered: −$1,000 = 10 × $100.00
    const page = readLines();
    const at = page.indexOf('Buy · VTI · 10 shares @ $100.00');
    expect(at).toBeGreaterThan(page.indexOf('ACTIVITY · THE PAST MONTH'));
    expect(page.slice(at, at + 3)).toEqual(['Buy · VTI · 10 shares @ $100.00', 'Sep 30 · you entered this', '−$1,000']);
    screen.unmount();
    // the cash: $5,000 − $1,000 = $4,000; the total the person typed: $50,000 — a buy moves money inside the account
    expect([acct('van').cash_balance, acct('van').balance]).toEqual([4_000, 50_000]);
    // THE WINDOW PICKED, 1M: the same Beginning, Wealth generated and Ending before the buy and after it, on both pages (a buy is
    // neither money in nor money earned). By hand with the drawing's prices — VTI's last close on or before Aug 29 is the $90 of
    // Sep 30, 2025, $99 last night, $100 today: VTI gained 100 × ($100 − $90) = $1,000 (after the buy: 110 × $100 − 100 × $90 −
    // $1,000 paid = $1,000), so Beginning = $50,000 − $1,000 = $49,000. RETURN, by the rule that a purchase counts from the start
    // of its day at what was paid (DEC-7451): before, 100 ÷ 90 − 1 = +11.11%; after, the $1,000 counts in this morning, when the
    // 100 held stood at $99: 9,900 ÷ 9,000 × 11,000 ÷ (9,900 + 1,000) − 1 = +11.01%.
    const accAfter = look('account', { id: 'van', period: '1M' });
    const invAfter = look('invest', {}, pick('1M'));
    for (const id of ['MK-PF-M-013', 'MK-PF-M-014', 'MK-PF-M-004']) expect(printed(accAfter, id)).toEqual(printed(accBefore, id));
    for (const id of ['MK-PF-M-018', 'MK-PF-M-002', 'MK-PF-M-001', 'MK-PF-M-005']) expect(printed(invAfter, id)).toEqual(printed(invBefore, id));
    // RETURN (R18, 2026-11-01): the account's total was typed, so its Return is its own walk's — $49,000 → $50,000 before the buy and
    // after it (a buy is neither money in nor money out): 50,000 ÷ 49,000 − 1 = +2.04% both times. VTI's own +11.11% before and
    // +11.01% after (9,900 ÷ 9,000 × 11,000 ÷ 10,900 − 1) were printed; they are kept below as test.failing.
    expect(printed(accBefore, 'MK-PF-M-016')[0]).toBe(pct(50_000 / 49_000 - 1));
    expect([printed(accAfter, 'MK-PF-M-013')[0], printed(accAfter, 'MK-PF-M-014')[0], printed(accAfter, 'MK-PF-M-016')[0]]).toEqual(['$49,000', '$1,000', pct(50_000 / 49_000 - 1)]);
    expect(printed(accAfter, 'MK-PF-M-004').slice(-1)).toEqual(['$50,000']);
    // the Performance tab sums every investment account in the household (the drawing's Treasury too); Vanguard's own walk
    // is under its bar, open as the first of several accounts opens (v17 phone 1) — the same lines before the buy and after it
    const walkOf = (sh: Shot) => { const at = sh.lines.indexOf('▾ VANGUARD BROKERAGE'); return sh.lines.slice(at, sh.lines.indexOf('Return', at) + 2); };
    expect(walkOf(invAfter)).toEqual(['▾ VANGUARD BROKERAGE', '$50,000', '›', '✍️ By hand · you update it',
      'Beginning market value (Aug 29, 2026)', '$49,000', 'Contributions', '$0', 'Withdrawals', '$0', 'Wealth generated', '$1,000',
      'Dividends', '$0', 'Interest', '$0', 'Change in investment value', '$1,000', 'Ending market value (Sep 30, 2026)', '$50,000', 'Return', pct(50_000 / 49_000 - 1)]);   // the walk's own (R18)
    expect(walkOf(invBefore)).toEqual(walkOf(invAfter));          // every line, the Return too: a buy moves neither (R18, 2026-11-01)
    expect(walkOf(invBefore).slice(-1)).toEqual([pct(50_000 / 49_000 - 1)]);   // the walk's own before the buy too (R18; it read VTI's +11.11%)
    // THE 2Y CHIP BY THE SAME RULE (DEC-7451: a purchase counts from the start of its day at what was paid). 2Y is measured from the
    // $80 purchase over 731 days: 1.25^(365/731) − 1 = +11.79% a year; the 10 bought today count from this morning, when VTI
    // stood at $99, so today's part falls from 100 ÷ 99 to 11,000 ÷ 10,900 — (1.25 × 11,000 ÷ 10,900 × 99 ÷ 100)^(365/731) − 1 = +11.74%.
    const twoYear = (sh: Shot) => sh.lines[sh.lines.indexOf('2Y') + 1];
    // 2Y (R18, R20, 2026-11-01): the walk's own — VTI up $2,000 since its Mar 3, 2025 purchase, so $48,000 → $50,000 before and after
    // the buy: (50,000 ÷ 48,000)^(365 ÷ 731) − 1 = +2.06% a year, the chip reading "/year" (it read VTI's +11.79% and +11.74%)
    expect([twoYear(invBefore), twoYear(invAfter)]).toEqual([`${pct((50_000 / 48_000) ** (365 / 731) - 1)}/year`, `${pct((50_000 / 48_000) ** (365 / 731) - 1)}/year`]);
  });

  test('A2 · the cash a buy needs counts its fee: 50 VTI at $100.00 is the whole $5,000, and a $5 fee makes it $5,005 — refused, and said so', () => {
    const B = TRADE_SHEET.states.find((st) => st.key === 'B')!;
    household({ ...B.store, pricesFetchedAt: new Date().toISOString() });
    open('account', { id: 'van', period: '1M' });
    press(/^Add a buy or sale for /);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), 'VTI');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);   // the boxes by name — their grey ‘0’ is gone (R16, 2026-11-01)
    fireEvent.changeText(shares, '50'); fireEvent.changeText(price, '100');
    expect(readLines(true)).toContain('Available cash: $5,000');                 // 50 × $100 = $5,000: enough
    expect(screen.getByLabelText('Record buy').props.accessibilityState?.disabled).toBeFalsy();
    type('Fee', '5');
    expect(readLines(true)).toContain('Available cash: $5,000 ⚠ not enough — deposit or transfer cash in first');   // (the reader joins the two spaces)
    expect(screen.getByLabelText('Record buy').props.accessibilityState?.disabled).toBe(true);
  });

  // ── B · AN ACCOUNT BUILT BY HAND WITH ITS OWN TOTAL, NO CASH ENTERED (the holding editor drawing's state B) ───────────
  // Vanguard Brokerage, $40,000 typed on Sep 1, 100 VTI listed inside it (bought Mar 3, 2025 at $80), no cash entered.
  // By hand, 1M — VTI was worth 100 × $95 = $9,500 at the Aug 29 close; after the buy it holds 110 × $100 = $11,000, of
  // which $1,000 was paid today: it gained 11,000 − 9,500 − 1,000 = $500. Nothing was paid in or taken out of the account,
  // so Beginning = $40,000 − $500 = $39,500. Return: the $1,000 counts in from this morning (DEC-7451), when the 100 held stood at
  // last night's $99: 9,900 ÷ 9,500 × 11,000 ÷ (9,900 + 1,000) − 1 = +5.17%.
  // Before the fix the buy turned the account into 110 × $100 − $1,000 = $10,000: Beginning $9,500, the $30,000 gone.
  const TYPED = { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 40_000,
    derive_balance: false, source: 'manual', value_as_of: '2026-09-01', positions: [VTI([lot('v1', 100, 80, '2025-03-03')])] };
  test('B · a total typed by hand: $40,000 before the buy and after it on the account page, the Performance tab, Net worth and Home — Beginning $39,500, Wealth generated $500, Return +5.17%', () => {
    household({ assetAccounts: [TYPED] });
    open('account', { id: 'van', period: '1M' });
    press(/^Add a buy or sale for /);
    expect(screen.getByText('Record activity')).toBeOnTheScreen();
    expect(readLines(true)).toContain('Available cash: not entered');   // its cash was never entered: shown so, never refused on
    fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), 'VTI');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '10'); fireEvent.changeText(price, '100');
    press('Record buy');
    screen.unmount();
    expect(acct('van').balance).toBe(40_000);                       // it read $10,000
    expect(acct('van').cash_balance).toBeUndefined();               // cash still not entered — not −$1,000
    const ACC = look('account', { id: 'van', period: '1M' });
    const INV = look('invest', {}, pick('1M'));
    const NW = look('networth');
    const HOLD = look('holding', { account: 'van', position: 'vti', period: '1M' });
    const HOME = look('home');
    // R18 (2026-11-01): a typed total — its Return is its walk's, $39,500 → $40,000: 40,000 ÷ 39,500 − 1 = +1.27%, on the account page and
    // the Performance tab alike (it read VTI's own 9,900 ÷ 9,500 × 11,000 ÷ 10,900 − 1, kept below as test.failing)
    expect([printed(ACC, 'MK-PF-M-013')[0], printed(ACC, 'MK-PF-M-014')[0], printed(ACC, 'MK-PF-M-016')[0]]).toEqual(['$39,500', '$500', pct(40_000 / 39_500 - 1)]);
    expect(printed(ACC, 'MK-PF-M-004').slice(-1)).toEqual(['$40,000']);
    expect(after(INV, 'Beginning market value (Aug 29, 2026)')).toBe('$39,500');
    expect([after(INV, 'Ending value'), after(INV, 'Wealth generated'), after(INV, 'Return')]).toEqual(['$40,000', '$500', pct(40_000 / 39_500 - 1)]);
    expect(NW.lines).toContain('$40,000');
    expect(after(NW, 'Vanguard Brokerage', 2)).toBe('$40,000');     // the row: name, source, total
    // the Holding page: 110 shares, and its own return for the month is the one the account's return is made of
    expect(after(HOLD, 'Quantity')).toBe('110 shares');
    expect(after(HOLD, 'Your return, past month')).toBe(pct(9_900 / 9_500 * 11_000 / 10_900 - 1));
    expect(after(HOLD, 'The market, same dates')).toBe(pct(612 / 600 - 1));   // SPY $600 → $612 = +2.00%
    // Home's month agrees with the account's own walk (R18): $500 on $39,500, 40,000 ÷ 39,500 − 1 = 1.27% (the Holding page above keeps
    // VTI's own +5.17%, the holding's figure)
    expect(homeMonth(HOME)).toBe(`▲ up $500 (${pct(40_000 / 39_500 - 1).slice(1)}) this month`);
  });

  // ── C · THE FOUNDER'S OWN DATA SHAPE: PERFORMANCE v17 PHONE 1, TWO LINKED ACCOUNTS AND A DAILY RECORD ──────────────────
  // Vanguard BROKERAGE (200 VTI at $411.50, $18,700 cash, $101,000) and E*TRADE ACCOUNT 1 (40 VOO at $465, $3,400 cash,
  // $22,000), both linked; $15,000 paid in ten months ago, dividends and interest three months ago; a daily record from eleven
  // months ago. ONE HOUSEHOLD THAT AGREES WITH ITSELF (2026-10-25, the D17 class): the $15,000 went into VTI's value with no
  // share bought, and the prices (300 VTI $260 → $330, +$21,000) said what the record ($78,000 → $84,000) did not. The record's
  // accounts are what v17 phone 1 draws (Vanguard $80,000 → $101,000, $15,000 in, change in investment value $4,300; E*TRADE
  // $20,000 → $22,000), so every flow now moves the cash and each holding moves only by its price — 200 VTI $390 → $409 last
  // night → $411.50, 40 VOO $427.50 → $464 → $465, the figure-exact household's shares (perf_mock_match_2026_10_12, phone 1).
  // The person records a buy the broker has not sent yet: 4 VTI at $411.50, $1,646 of the $18,700 cash. By hand: a buy is
  // neither money in nor money earned, and a linked account's total is the broker's — every window figure stays as it was but
  // the two a purchase moves by the start-of-day rule; the Holding page holds 204 shares, worth 204 × $411.50 = $83,946; Home's
  // investments rise by the $1,646 that left the cash ($123,000 − $22,100 = $100,900 → $123,000 − $20,454 = $102,546).
  const monthsAgo = (m: number) => { const d = new Date(`${TODAY}T12:00:00`); d.setMonth(d.getMonth() - m); return d.toISOString().slice(0, 10); };
  const linked = (id: string, institution: string, label: string, balance: number, positions: any[], cash: number) => ({
    asset_id: id, label, institution, kind: 'brokerage', tax_bucket: 'TAXABLE', balance, target_return: 0.05, source: 'connected', cash_balance: cash,
    last_synced: `${TODAY}T08:00:00Z`, positions });
  const held = (id: string, ticker: string, shares: number, price: number, cost: number, date: string) => ({ position_id: id, ticker, asset_class: 'stock_etf', last_price: price, lots: [lot(`${id}l`, shares, cost, date)] });
  const dayOf = (date: string, rows: [string, string, number, number][]) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
    holdings: rows.filter((r) => r[1] !== 'CASH').map(([accountId, securityKey, units, value]) => ({ date, accountId, securityKey, symbol: securityKey, units, price: value / units, value, currency: 'USD' })),
    accounts: [...new Set(rows.map((r) => r[0]))].map((accountId) => ({ date, accountId, currency: 'USD', typedValue: null,
      cash: rows.filter((r) => r[0] === accountId && r[1] === 'CASH').reduce((t, r) => t + r[3], 0), statedTotal: rows.filter((r) => r[0] === accountId).reduce((t, r) => t + r[3], 0) })) });
  function phone1() {
    const start = monthsAgo(11), paid = monthsAgo(10), income = monthsAgo(3);
    const days: any[] = [];
    const a = new Date(`${start}T12:00:00`).getTime(), n = Math.round((new Date(`${TODAY}T12:00:00`).getTime() - a) / 86_400_000);
    for (let i = 0; i <= n; i += 1) {
      const date = new Date(a + i * 86_400_000).toISOString().slice(0, 10);
      // each holding at that day's price — VTI $390 → $409 in a straight line to last night, $411.50 today; VOO $427.50 → $464
      // → $465 — and the cash moved by every flow: + $15,000 paid in, + $1,500 + $200 and + $300 + $200 of dividends and interest
      const g = Math.min(i, n - 1) / (n - 1), last = i === n;
      const vti = last ? 411.5 : 390 + 19 * g, voo = last ? 465 : 427.5 + 36.5 * g;
      const vanCash = 2_000 + (date >= paid ? 15_000 : 0) + (date >= income ? 1_700 : 0), etrCash = 2_900 + (date >= income ? 500 : 0);
      days.push(dayOf(date, [['van', 'VTI', 200, 200 * vti], ['van', 'CASH', 1, vanCash], ['etr', 'VOO', 40, 40 * voo], ['etr', 'CASH', 1, etrCash]]));
    }
    const conn = (id: string, date: string, t: string, account_id: string, amount: number, ticker?: string) => ({ id, date, type: t, account_id, amount, ticker, created_at: 'x', source: 'connected' });
    return {
      assetAccounts: [linked('van', 'Vanguard', 'BROKERAGE', 101_000, [held('p1', 'VTI', 200, 411.5, 390, start)], 18_700),
        linked('etr', 'E*TRADE', 'ACCOUNT 1', 22_000, [held('p2', 'VOO', 40, 465, 427.5, start)], 3_400)],
      transactions: [conn('d1', paid, 'DEPOSIT', 'van', 15_000), conn('v1', monthsAgo(3), 'DIVIDEND', 'van', 1_500, 'VTI'), conn('i1', monthsAgo(3), 'INTEREST', 'van', 200),
        conn('v2', monthsAgo(3), 'DIVIDEND', 'etr', 300, 'VOO'), conn('i2', monthsAgo(3), 'INTEREST', 'etr', 200)],
      snapshotDays: days, invDaily: { [start]: 100_000, [TODAY]: 123_000 },
      // daily closes as a price feed gives them, the record's own prices: VTI $390 → $409 yesterday → $411.50 today, VOO $427.50
      // → $464 → $465, SPY $500 → $560
      priceCache: { VTI: closes([[start, 390], ['2026-09-29', 409], [TODAY, 411.5]]), VOO: closes([[start, 427.5], ['2026-09-29', 464], [TODAY, 465]]),
        SPY: closes([[start, 500], ['2026-09-29', 559], [TODAY, 560]]) },
    };
  }
  test('C · v17 phone 1 (linked, a daily record): a buy of 4 VTI at $411.50 changes no window figure on the Performance tab, the account page or Home; the Holding page holds 204 shares worth $83,946; the tab reads every line it read before', () => {
    household(phone1());
    const INV0 = look('invest', {}, pick('1Y'));
    const ACC0 = look('account', { id: 'van', period: '1Y' });
    const HOLD0 = look('holding', { account: 'van', position: 'p1', period: '1Y' });
    open('account', { id: 'van', period: '1Y' });
    press(/^Add a buy or sale for /);
    expect(readLines(true)).toContain('Available cash: $18,700');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), 'VTI');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '4'); fireEvent.changeText(price, '411.50');
    press('Record buy');
    const page = readLines();
    const at = page.indexOf('Buy · VTI · 4 shares @ $411.50');
    expect(page.slice(at, at + 3)).toEqual(['Buy · VTI · 4 shares @ $411.50', 'Sep 30 · you entered this', '−$1,646']);
    screen.unmount();
    // the broker's total stands; the cash the buy spent left the cash: $18,700 − 4 × $411.50 = $18,700 − $1,646 = $17,054
    expect([acct('van').balance, acct('van').cash_balance]).toEqual([101_000, 17_054]);
    const INV = look('invest', {}, pick('1Y'));
    const ACC = look('account', { id: 'van', period: '1Y' });
    const HOLD = look('holding', { account: 'van', position: 'p1', period: '1Y' });
    const HOME = look('home');
    // the Performance tab: the same lines, in the same order — the state perf_matches_v17 holds against v17 phone 1 — but for
    // ONE figure, by the decided rule that a purchase counts from the start of its day at what was paid (DEC-7451, 2026-10-22):
    // WHAT EACH CATEGORY EARNED, Stocks / Funds. The $1,646 counts from this morning, when the 200 VTI held stood at last
    // night's $409; the 4 bought end the day at the $411.50 paid. Before: (82,300 + 18,600) ÷ (78,000 + 17,100) − 1 = +6.10%.
    // After: (81,800 + 18,560) ÷ 95,100 × (82,300 + 1,646 + 18,600) ÷ (81,800 + 18,560 + 1,646) − 1 = 1.055310 × 1.005294 − 1
    // = +6.09%, a hair lower. The summary's Return is the accounts' (cash in them), where a buy moves nothing: every account
    // together stood at 200 × $391.71 + 40 × $430.78 + $4,900 = $100,472 the evening before the $15,000 (Nov 29, 2025, 30 of
    // the 334 days to last night), so (100,472 ÷ 100,000) × (123,000 ÷ 115,472) − 1 = +7.02%.
    expect(INV.lines.length).toBeGreaterThan(40);
    const cat = INV0.lines.indexOf('Stocks / Funds', INV0.lines.indexOf('RETURN'));
    expect(INV0.lines.slice(cat, cat + 3)).toEqual(['Stocks / Funds', '$1,800', '+6.10%']);
    expect(INV.lines.slice(cat, cat + 3)).toEqual(['Stocks / Funds', '$1,800', '+6.09%']);
    expect(INV.lines.filter((l, i) => l !== INV0.lines[i])).toEqual(['+6.09%']);
    expect(INV.lines.length).toBe(INV0.lines.length);
    expect([after(INV, 'Ending value'), after(INV, 'Wealth generated'), after(INV, 'Return')]).toEqual(['$123,000', '$8,000', '+7.02%']);
    for (const id of ['MK-PF-M-013', 'MK-PF-M-014', 'MK-PF-M-016', 'MK-PF-M-004']) expect(printed(ACC, id)).toEqual(printed(ACC0, id));
    // the Holding page: 200 + 4 = 204 shares, 204 × $411.50 = $83,946; paid 200 × $390 + 4 × $411.50 = $79,646 → average $390.42
    expect([after(HOLD, 'Quantity'), after(HOLD, 'Current value')]).toEqual(['204 shares', '$83,946']);
    expect(after(HOLD, 'Total paid')).toBe('$79,646');
    expect(HOLD.lines).toContain('$390.42');
    // its own return since purchase: bought at $390, $409 last night, $411.50 today — before the buy 411.50 ÷ 390 − 1 = +5.51%;
    // after it, the 4 bought count from this morning at the $411.50 paid and gained nothing today:
    // 409 ÷ 390 × (204 × 411.50) ÷ (200 × 409 + 1,646) − 1 = 1.048718 × 1.005992 − 1 = +5.50%
    expect(after(HOLD0, 'Your return since purchase')).toBe(pct(411.5 / 390 - 1));
    expect(after(HOLD, 'Your return since purchase')).toBe(pct((409 / 390) * (204 * 411.5) / (200 * 409 + 1_646) - 1));
    // Home: the month and its base are the Performance tab's 1M, unmoved; the investments move from cash: $100,900 → $102,546
    expect(after(HOME, 'YOUR INVESTMENTS', 2)).toBe('$102,546');
    expect(HOME.lines).toContain("This month’s change is on $123,000: your investment accounts with the cash in them.");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-58 · RECORD A SALE WITH A $5 FEE FROM THE HOLDING PAGE (the fee not in the price)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fidelity Brokerage, built from its holdings: $2,000 cash, 100 VTI, 50 BND (BUILT above). On VTI's page the person taps
// "Record buy/sell", picks Sell, 10 shares at $98.00, a $5 fee, dated Sep 15. By hand, 1M:
//   the sale brought in 10 × $98 − $5 = $975 (the fee once); the cash is $2,000 + $975 = $2,975; the account is worth
//   $2,975 + 90 × $100 + 50 × $73 = $15,625. Beginning (Aug 29) = $2,000 + 100 × $95 + 50 × $72 = $15,100.
//   VTI gained 9,000 + 975 − 9,500 = $475, BND 50 × ($73 − $72) = $50 → Wealth generated $525 (no fee: $530; twice: $520).
//   Return, the holdings split on Sep 15 (Sep 14 and Sep 15 both closed at $98): (90 × 98 + 975 + 3,600) ÷ 13,100 ×
//   (9,000 + 3,650) ÷ (8,820 + 3,600) − 1 = +4.15% (no fee: (9,800 + 3,600) ÷ 13,100 × 12,650 ÷ 12,420 − 1 = +4.18%).
//   VTI's own month: (8,820 + 975) ÷ 9,500 × 9,000 ÷ 8,820 − 1 = +5.21% (no fee: +5.26%).
//   Realized from the sale, all time: $980 − $5 − 10 × $80 = +$175 (no fee: +$180).
const SALE_RETURN = (8_820 + 975 + 3_600) / 13_100 * (9_000 + 3_650) / (8_820 + 3_600) - 1;
const VTI_MONTH = (8_820 + 975) / 9_500 * 9_000 / 8_820 - 1;
describe('E2E-58 · Record a sale with a $5 fee from the Holding page: the fee comes off what the sale brought in, once, on every screen', () => {
  test('the hand-worked figures: +4.15% (no fee +4.18%), VTI +5.21% (no fee +5.26%)', () => {
    expect([pct(SALE_RETURN), pct((9_800 + 3_600) / 13_100 * 12_650 / 12_420 - 1), pct(VTI_MONTH), pct(9_800 / 9_500 * 9_000 / 8_820 - 1)]).toEqual(['+4.15%', '+4.18%', '+5.21%', '+5.26%']);
  });
  test('the sheet takes the fee; the record keeps it apart from the price; the account page, the Performance tab, the Holding page and Home all count $975 brought in', () => {
    household({ assetAccounts: [BUILT()], transactions: OPENINGS });
    open('holding', { account: 'fid', position: 'vti', period: '1M' });
    press('Record a buy or sell for VTI');
    expect(screen.getByText('Record activity')).toBeOnTheScreen();
    press('Transaction type: Sell');
    expect(flat(screen.getByLabelText('Holding: VTI').props.style).backgroundColor).toBe(Colors.primaryLight);   // VTI, chosen
    expect(readLines(true)).toContain('You own 100 shares');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '10'); fireEvent.changeText(price, '98');
    type('Fee', '5');
    pickDay(2026, 9, 15);
    // the sheet as the person sees it before saving: the fee under Shares, Price / share and Date
    const sheet = readLines(true);
    expect(sheet.slice(sheet.indexOf('Shares'), sheet.indexOf('Shares') + 9)).toEqual(['Shares', '10', 'Price / share', '$98', 'Date', 'Sep 15, 2026', 'Fee (opt)', '$5', 'Record sell']);   // the price and the fee as money since 2026-10-27 (DEC-8385); shares stay plain
    press('Record sell');
    expect(screen.queryByText('Record activity')).toBeNull();
    // the Holding page itself: 90 shares, and its realized line counts the fee once: +$175 all time
    expect(after({ printed: [], lines: readLines() }, 'Quantity')).toBe('90 shares');
    expect(after({ printed: [], lines: readLines() }, 'Realized from sales')).toBe('+$175 all time');
    // its Activity sheet: the sale and what it brought in after the fee
    press("See VTI’s activity");
    const act = readLines(true);
    expect(act.slice(act.indexOf('Sell VTI · 10 sh @ $98.00'), act.indexOf('Sell VTI · 10 sh @ $98.00') + 3)).toEqual(['Sell VTI · 10 sh @ $98.00', 'Sep 15, 2026 · Fidelity Brokerage', '+$975']);
    screen.unmount();
    // the record: the $5 is kept beside the price the person typed, not inside it
    const sale = (useStore.getState().transactions as any[])[0];
    expect(sale).toMatchObject({ type: 'SELL', account_id: 'fid', ticker: 'VTI', shares: 10, price: 98, fee: 5, fee_in_price: false, date: '2026-09-15' });
    expect([acct('fid').cash_balance, acct('fid').balance]).toEqual([2_975, 15_625]);
    const ACC = look('account', { id: 'fid', period: '1M' });
    const INV = look('invest', {}, pick('1M'));
    const HOLD = look('holding', { account: 'fid', position: 'vti', period: '1M' });
    const HOME = look('home');
    // the account page: its trio, its walk, and the sale under ACTIVITY at $975
    expect([printed(ACC, 'MK-PF-M-013')[0], printed(ACC, 'MK-PF-M-014')[0], printed(ACC, 'MK-PF-M-016')[0]]).toEqual(['$15,100', '$525', pct(SALE_RETURN)]);
    expect(printed(ACC, 'MK-PF-M-004').slice(-1)).toEqual(['$15,625']);
    const at = ACC.lines.indexOf('Sell · VTI · 10 shares @ $98.00');
    expect(ACC.lines.slice(at, at + 3)).toEqual(['Sell · VTI · 10 shares @ $98.00', 'Sep 15 · you entered this', '$975']);
    // the Performance tab: the same three figures
    expect([after(INV, 'Beginning market value (Aug 29, 2026)'), after(INV, 'Ending value'), after(INV, 'Wealth generated'), after(INV, 'Return')])
      .toEqual(['$15,100', '$15,625', '$525', pct(SALE_RETURN)]);
    // the Holding page: the holding's own month reads what the sale brought in after its fee (it read +5.26%, the bare price)
    expect(after(HOLD, 'Your return, past month')).toBe(pct(VTI_MONTH));
    // Home: the month is the Performance tab's 1M, on the account's own value
    expect(homeMonth(HOME)).toBe(`▲ up $525 (${pct(SALE_RETURN).slice(1)}) this month`);
    expect(HOME.lines).toContain("This month’s change is on $15,625: your investment accounts with the cash in them.");
  });
  test('the same sale, read on its own: the account +4.15% and VTI +5.21% (they read +4.18% and +5.26% before the return was measured from the trades, 2026-10-23)', () => {
    household({ assetAccounts: [BUILT()], transactions: OPENINGS });
    open('holding', { account: 'fid', position: 'vti', period: '1M' });
    press('Record a buy or sell for VTI');
    press('Transaction type: Sell');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '10'); fireEvent.changeText(price, '98');
    type('Fee', '5');
    pickDay(2026, 9, 15);
    press('Record sell');
    screen.unmount();
    const ACC = look('account', { id: 'fid', period: '1M' });
    const HOLD = look('holding', { account: 'fid', position: 'vti', period: '1M' });
    expect([printed(ACC, 'MK-PF-M-016')[0], after(HOLD, 'Your return, past month')]).toEqual([pct(SALE_RETURN), pct(VTI_MONTH)]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-59 · SELL A HOLDING IN FULL INSIDE THE WINDOW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The same Fidelity Brokerage. On VTI's page the person sells all 100 VTI at $98.00 on Sep 15. By hand, 1M: the cash is
// $2,000 + $9,800 = $11,800, the account $11,800 + $3,650 = $15,450; the beginning still counts VTI's start value, 100 × $95:
// $2,000 + $9,500 + $3,600 = $15,100; VTI gained $9,800 − $9,500 = $300, BND $50 → Wealth generated $350; Return
// (9,800 + 3,600) ÷ 13,100 × 3,650 ÷ 3,600 − 1 = +3.71%.
const GONE_RETURN = (9_800 + 3_600) / 13_100 * 3_650 / 3_600 - 1;
describe('E2E-59 · Sell a holding in full inside the window: the page closes, the beginning still counts what it was worth, every screen agrees', () => {
  test('the hand-worked figure: +3.71%', () => {
    expect(pct(GONE_RETURN)).toBe('+3.71%');
  });
  test('recorded on its own page, the sale of every share closes the page (it stopped: "Rendered fewer hooks than expected"); the account page, the Performance tab and Home read $15,100 → $15,450, $350, +3.71%', () => {
    household({ assetAccounts: [BUILT()], transactions: OPENINGS });
    open('holding', { account: 'fid', position: 'vti', period: '1M' });
    press('Record a buy or sell for VTI');
    press('Transaction type: Sell');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '100'); fireEvent.changeText(price, '98');
    pickDay(2026, 9, 15);
    press('Record sell');
    // the holding is out of its account, so its page closes, back to where the person came from — as Delete holding does
    expect(mockNav.backs).toBe(1);
    expect(screen.toJSON()).toBeNull();
    screen.unmount();
    expect(acct('fid').positions.map((q: any) => q.ticker)).toEqual(['BND']);
    expect([acct('fid').cash_balance, acct('fid').balance]).toEqual([11_800, 15_450]);
    // where the person lands: the account page, the sale listed under ACTIVITY
    const ACC = look('account', { id: 'fid', period: '1M' });
    const at = ACC.lines.indexOf('Sell · VTI · 100 shares @ $98.00');
    expect(ACC.lines.slice(at, at + 3)).toEqual(['Sell · VTI · 100 shares @ $98.00', 'Sep 15 · you entered this', '$9,800']);
    expect([printed(ACC, 'MK-PF-M-013')[0], printed(ACC, 'MK-PF-M-014')[0], printed(ACC, 'MK-PF-M-016')[0]]).toEqual(['$15,100', '$350', pct(GONE_RETURN)]);
    expect(printed(ACC, 'MK-PF-M-004').slice(-1)).toEqual(['$15,450']);
    const INV = look('invest', {}, pick('1M'));
    expect([after(INV, 'Beginning market value (Aug 29, 2026)'), after(INV, 'Ending value'), after(INV, 'Wealth generated'), after(INV, 'Return')])
      .toEqual(['$15,100', '$15,450', '$350', pct(GONE_RETURN)]);
    const HOME = look('home');
    expect(homeMonth(HOME)).toBe(`▲ up $350 (${pct(GONE_RETURN).slice(1)}) this month`);
    expect(after(HOME, 'YOUR INVESTMENTS', 2)).toBe('$3,650');       // only BND is invested now; the $11,800 is cash
  });
  test('Delete holding on the same page closes it the same way (it stopped there too, for the same reason)', () => {
    household({ assetAccounts: [BUILT()], transactions: OPENINGS });
    open('holding', { account: 'fid', position: 'vti', period: '1M' });
    press('Edit this holding');
    press('Delete holding');
    expect(mockNav.backs).toBe(1);
    expect(acct('fid').positions.map((q: any) => q.ticker)).toEqual(['BND']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-60 · A PURCHASE WITH NO SHARE COUNT, AND ONE WITH NO PRICE PAID
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const NO_COUNT = 'Not stated — a purchase has no share count on record.';
describe('E2E-60 · A purchase with no share count and one with no price paid: both pages say what is missing, every figure built from it refuses alike, the left-out line gives the true reason', () => {
  // ── A · NO PRICE PAID: recorded by the person in the holding editor ─────────────────────────────────────────────────
  // Vanguard Brokerage, built from its holdings, no cash entered: 100 VTI bought Mar 3, 2025 at $80. On VTI's page the person
  // taps ✎ Edit, ＋ Add another lot, types 10 shares and leaves the price paid blank: dated today. By hand: 110 × $100 =
  // $11,000; what was paid is on record for 100 shares, 100 × $80 = $8,000, average $80.00, and the 10 are left out of both.
  test('A · no price paid: the Holding page says so on the purchase and under the total; the Performance tab and the account page name it as the reason its gains are left out', () => {
    household({ assetAccounts: [{ ...BUILT(), asset_id: 'van', institution: 'Vanguard', cash_balance: undefined, balance: 10_000, positions: [VTI([lot('v1', 100, 80, '2025-03-03')])] }] });
    open('holding', { account: 'van', position: 'vti', period: '1M' });
    press('Edit this holding');
    press('Add another lot');
    const boxes = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(boxes[boxes.length - 1], '10');          // shares; the price paid left as it opens, blank
    press('Save holding');
    screen.unmount();
    expect(acct('van').positions[0].lots.map((l: any) => [l.shares, l.cost_per_share])).toEqual([[100, 80], [10, null]]);
    expect(acct('van').balance).toBe(11_000);
    const HOLD = look('holding', { account: 'van', position: 'vti', period: '1M' });
    expect([after(HOLD, 'Current value'), after(HOLD, 'Quantity'), after(HOLD, 'Total paid')]).toEqual(['$11,000', '110 shares', '$8,000']);
    expect(HOLD.lines).toContain('$80.00');                         // the average, over the 100 with a price paid
    expect(HOLD.lines).toContain('10 sh @ no price paid on record');
    expect(HOLD.lines).toContain('The average above and the total paid leave out 10 shares with no price paid on record.');
    const LEFT = 'Return is on the $11,000 with a price history. VTI ($11,000) has a purchase with no price paid on record, so its gains are not included.';
    const INV = look('invest', {}, pick('1M'));
    const ACC = look('account', { id: 'van', period: '1M' });
    expect(INV.lines).toContain(LEFT);
    expect(ACC.lines).toContain(LEFT);
    expect(INV.lines.some((l) => /has no price history/.test(l))).toBe(false);   // never the wrong reason
    // by the rule for a gain that cannot be known (DEC-5068, canon row 24): VTI's gain is left out of Wealth generated and its
    // value is taken as it stands, so 1M begins at $11,000 and generated $0; its Return is known from its prices,
    // $95 → $100 = +5.26%. The same three on both pages.
    expect([after(INV, 'Beginning market value (Aug 29, 2026)'), after(INV, 'Wealth generated'), after(INV, 'Return')]).toEqual(['$11,000', '$0', pct(100 / 95 - 1)]);
    expect([printed(ACC, 'MK-PF-M-013')[0], printed(ACC, 'MK-PF-M-014')[0], printed(ACC, 'MK-PF-M-016')[0]]).toEqual(['$11,000', '$0', pct(100 / 95 - 1)]);
  });

  // ── B · NO SHARE COUNT: a broker's purchase, kept when the person saves the editor ──────────────────────────────────
  // Fidelity, linked: BND 50 bought Mar 3, 2025 at $70 and a purchase of Jan 5, 2026 at $72 the broker sent with no share
  // count; $1,000 of cash; the broker's total $6,110. The person opens BND's page, taps ✎ Edit, names it and saves.
  const LINKED = { asset_id: 'lnk', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 6_110, cash_balance: 1_000,
    source: 'connected', last_synced: `${TODAY}T08:00:00Z`,
    positions: [{ position_id: 'bnd', ticker: 'BND', asset_class: 'bond', kind: 'fixed_income', last_price: 73, lots: [lot('b1', 50, 70, '2025-03-03'), lot('b2', null, 72, '2026-01-05')] }] };
  test('B · no share count: before and after a save of the editor, the account page and the Holding page read "Not stated — a purchase has no share count on record." where the count would be, and every figure built from the count refuses alike', () => {
    household({ assetAccounts: [LINKED] });
    const read = () => ({ hold: look('holding', { account: 'lnk', position: 'bnd', period: '1M' }), acc: look('account', { id: 'lnk', period: '1M' }) });
    const check = ({ hold, acc }: { hold: Shot; acc: Shot }) => {
      // the Holding page: every figure the count makes — the value, the quantity, the average and the total paid
      for (const row of ['Current value', 'Quantity', 'Total paid']) expect(`${row}: ${after(hold, row)}`).toBe(`${row}: ${NO_COUNT}`);
      expect(after(hold, 'Price paid (average)', 2)).toBe(NO_COUNT);   // after its ⓘ
      expect(hold.lines).toContain('no share count on record @ $72.00');
      // the account page: the holding's row says the same, and its value is not stated
      const row = acc.lines.indexOf('BND');
      expect(acc.lines.slice(row, row + 3)).toEqual(['BND', NO_COUNT, 'not stated']);
    };
    check(read());
    open('holding', { account: 'lnk', position: 'bnd', period: '1M' });
    press('Edit this holding');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Apple Inc.'), 'Vanguard Total Bond Market ETF');
    press('Save holding');
    screen.unmount();
    // the purchase with no share count is still there (it was dropped: 50 shares, $3,650, as if complete)
    expect(acct('lnk').positions[0].lots.map((l: any) => l.shares)).toEqual([50, null]);
    const after2 = read();
    // the row is named by the name the person gave it now
    const named = { ...after2, acc: { ...after2.acc, lines: after2.acc.lines.map((l) => (l === 'Vanguard Total Bond Market ETF' ? 'BND' : l)) } };
    check(named);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-61 · EDIT A RECORD'S PRICE, THEN DELETE A RECORD
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The same Fidelity Brokerage, its two opening purchases on record (Mar 3, 2025; the app keeps no way to undo them). The person
// records a buy of 10 VTI on Sep 15 at $100.00 (they paid $98.00, the day's close), corrects it from its ✎ on the account
// page, deletes it from VTI's Activity sheet, then tries to delete the opening purchase. By hand, 1M:
//   at $100: cash $2,000 − $1,000 = $1,000; worth $1,000 + 110 × $100 + $3,650 = $15,650; VTI gained 11,000 − 9,500 − 1,000
//     = $500, BND $50 → $550 (Beginning $15,100)
//   at $98: cash $1,020; worth $15,670; VTI gained 11,000 − 9,500 − 980 = $520 → $570
//   deleted: as before the buy — cash $2,000, worth $15,650, VTI gained $500 → $550
//   Return at $98 (the price is the day's close, so where the purchase is counted makes no difference):
//     (9,800 + 3,600) ÷ 13,100 × (11,000 + 3,650) ÷ (10,780 + 3,600) − 1 = +4.21%; deleted: 13,650 ÷ 13,100 − 1 = +4.20%.
//   Return at $100, by the rule that a purchase counts in at what was paid (DEC-7451): the $1,000 counts in on Sep 15 and is
//     worth $980 that evening — (9,800 + 3,600) ÷ 13,100 × (10,780 + 3,600) ÷ (9,800 + 1,000 + 3,600) × 14,650 ÷ 14,380 − 1 =
//     +4.07% (it read +4.21%, the figure at $98, before the return was measured from the trades, 2026-10-23).
const R100 = (9_800 + 3_600) / 13_100 * (10_780 + 3_600) / (9_800 + 1_000 + 3_600) * (11_000 + 3_650) / (10_780 + 3_600) - 1;
const R98 = (9_800 + 3_600) / 13_100 * (11_000 + 3_650) / (10_780 + 3_600) - 1;
const R0 = 13_650 / 13_100 - 1;
describe('E2E-61 · Edit a record (its price) from the ✎, then delete a record: every screen moves to the new numbers; a delete the app refuses says so', () => {
  const figures = () => {
    const acc = look('account', { id: 'fid', period: '1M' }), inv = look('invest', {}, pick('1M')), home = look('home');
    return { acc: [printed(acc, 'MK-PF-M-013')[0], printed(acc, 'MK-PF-M-014')[0], printed(acc, 'MK-PF-M-016')[0], printed(acc, 'MK-PF-M-004').slice(-1)[0]],
      inv: [after(inv, 'Beginning market value (Aug 29, 2026)'), after(inv, 'Wealth generated'), after(inv, 'Return'), after(inv, 'Ending value')],
      home: homeMonth(home), lines: acc.lines };
  };
  const buyAt100 = () => {
    household({ assetAccounts: [BUILT()], transactions: OPENINGS });
    open('account', { id: 'fid', period: '1M' });
    press(/^Add a buy or sale for /);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), 'VTI');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '10'); fireEvent.changeText(price, '100');
    pickDay(2026, 9, 15);
    press('Record buy');
    screen.unmount();
  };
  test('the hand-worked figures: +4.07% at $100.00 by the rule, +4.21% at $98.00, +4.20% with the buy deleted', () => {
    expect([pct(R100), pct(R98), pct(R0)]).toEqual(['+4.07%', '+4.21%', '+4.20%']);
  });
  test('a buy typed at $100.00 is corrected to $98.00 on its ✎, then deleted on the Activity sheet; the opening purchase cannot be deleted and both doors say so', () => {
    // 1 · the buy, at the wrong price: one figure for each line on the three screens
    buyAt100();
    const f1 = figures();
    expect(f1.acc).toEqual(['$15,100', '$550', pct(R100), '$15,650']);
    expect(f1.inv).toEqual(['$15,100', '$550', pct(R100), '$15,650']);
    expect(f1.home).toBe(`▲ up $550 (${pct(R100).slice(1)}) this month`);
    expect(after(look('holding', { account: 'fid', position: 'vti', period: '1M' }), 'Total paid')).toBe('$9,000');   // 100 × $80 + 10 × $100
    // 2 · its ✎: the trade's own figures, filled; the price put right
    open('account', { id: 'fid', period: '1M' });
    press('Edit or delete your buy of VTI, 10 shares at $100.00');   // the ✎ names its holding and its own figures (2026-10-23)
    expect(readLines(true)).toEqual(['Buy — you entered this', 'Sep 15, 2026 · correcting it reverses the old record and records the new one, so your balance stays right.',
      'Shares', '10', 'Price / share', '$100', 'Fee (opt)', '—', 'Save', 'Delete this record']);   // the price as money since 2026-10-27 (DEC-8385)
    type('Price per share', '98');
    press('Save this correction');
    const page = readLines();
    const at = page.indexOf('Buy · VTI · 10 shares @ $98.00');
    expect(page.slice(at, at + 3)).toEqual(['Buy · VTI · 10 shares @ $98.00', 'Sep 15 · you entered this', '−$980']);
    expect(page).not.toContain('Buy · VTI · 10 shares @ $100.00');
    screen.unmount();
    expect([acct('fid').cash_balance, acct('fid').balance]).toEqual([1_020, 15_670]);
    const f2 = figures();
    expect(f2.acc).toEqual(['$15,100', '$570', pct(R98), '$15,670']);
    expect(f2.inv).toEqual(['$15,100', '$570', pct(R98), '$15,670']);
    expect(f2.home).toBe(`▲ up $570 (${pct(R98).slice(1)}) this month`);
    // the Holding page: what was paid moves with it — 100 × $80 + 10 × $98 = $8,980, average 8,980 ÷ 110 = $81.64 (it read $81.82)
    const HOLD = look('holding', { account: 'fid', position: 'vti', period: '1M' });
    expect(after(HOLD, 'Total paid')).toBe('$8,980');
    expect(HOLD.lines).toContain('$81.64');
    // 3 · deleted from VTI's Activity sheet: every screen is back where it was before the buy
    open('holding', { account: 'fid', position: 'vti', period: '1M' });
    press("See VTI’s activity");
    expect(readLines(true).filter((l) => /^(Buy|Opening holding) VTI/.test(l))).toEqual(['Buy VTI · 10 sh @ $98.00', 'Opening holding VTI · 100 sh @ $80.00']);
    press('Delete buy VTI');
    screen.unmount();
    expect([acct('fid').cash_balance, acct('fid').balance]).toEqual([2_000, 15_650]);
    const f3 = figures();
    expect(f3.acc).toEqual(['$15,100', '$550', pct(R0), '$15,650']);
    expect(f3.inv).toEqual(['$15,100', '$550', pct(R0), '$15,650']);
    expect(f3.home).toBe(`▲ up $550 (${pct(R0).slice(1)}) this month`);
    expect(f3.lines.some((l) => /^Buy · VTI · 10 shares/.test(l))).toBe(false);
    // 4 · the opening purchase: a delete the ledger refuses says so, on the Activity sheet and on the account page's ✎
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    open('holding', { account: 'fid', position: 'vti', period: '1M' });
    press("See VTI’s activity");
    press('Delete opening holding VTI');
    expect(alert).toHaveBeenLastCalledWith('Can’t remove this entry', expect.stringMatching(/^It was recorded before balance-safe deletes existed/));
    screen.unmount();
    open('account', { id: 'fid', period: '1M' });
    fireEvent.press(screen.getByText(/^See all activity/));
    // each opening purchase's ✎ names its own holding and its figures (FIXED 2026-10-23: both read "Edit or delete your opening
    // holding of $0", so VTI could not be told from BND, and $0 was not what either was)
    expect(screen.getByLabelText('Edit or delete your opening holding of BND, 50 shares at $70.00')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Edit or delete your opening holding of VTI, 100 shares at $80.00'));
    press('Delete this record');
    expect(alert).toHaveBeenLastCalledWith('This one can’t be deleted', 'It is an older record the ledger cannot reverse.');
    screen.unmount();
    alert.mockRestore();
    expect((useStore.getState().transactions as any[]).map((t) => t.id).sort()).toEqual(['o-bnd', 'o-vti']);
    expect([acct('fid').cash_balance, acct('fid').balance]).toEqual([2_000, 15_650]);
  });
  test('at $100.00 the Return reads +4.07% on the account page and the Performance tab, the purchase in at what was paid (it read +4.21%, 2026-10-23)', () => {
    buyAt100();
    const f = figures();
    expect([f.acc[2], f.inv[2]]).toEqual([pct(R100), pct(R100)]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-62 · UPDATE THE VALUE OF AN ACCOUNT BUILT BY HAND
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The Update value drawing's own household (moneykeel_pres_mock_update-value-sheet_v02.html, states D, F and G): Gold coins,
// entered Feb 14, 2026 at $8,000 — 7 months old today. The person taps Update value in the age box, types 8400, saves. By hand:
// Net worth and the Performance tab read $8,400; the account is stamped as valued today, Sep 30, 2026; the age box goes.
describe('E2E-62 · Update the value of an account built by hand with the Update value sheet: Net worth and the Performance tab agree on the new value, stamped today', () => {
  const GOLD = { asset_id: 'gold', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 8_000, source: 'manual', value_as_of: '2026-02-14' };
  const DAY = (date: string, value: number) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
    accounts: [{ date, accountId: 'gold', cash: 0, typedValue: value, currency: 'USD' }] });
  test('the sheet reads the drawing\'s state F word for word; after Save, Net worth, the Performance tab and the account page read $8,400, "Value as of Sep 30, 2026"', () => {
    household({ assetAccounts: [GOLD], snapshotDays: [DAY('2026-02-14', 8_000)], priceCache: {} });
    const NW0 = look('networth');
    expect(NW0.lines).toContain('$8,000');
    open('account', { id: 'gold' });
    const page0 = readLines();
    expect(page0).toContain('Value as of Feb 14, 2026');
    expect(page0).toContain('⏱ This value is 7 months old — still right?');
    press('Update the value');
    const drawn = drawnSheetLines('moneykeel_pres_mock_update-value-sheet_v02.html', 'F');
    expect(drawn.length).toBeGreaterThanOrEqual(4);
    const shownF = readLines(true);
    // "Update value — Gold coins", "$", then the box beside that $: drawn 8000, shown 8,000 (the row of 2026-10-27), the stamp line, "Save value"
    expect(shownF).toEqual(asTheRowSays('moneykeel_pres_mock_update-value-sheet_v02.html', drawn, shownF));
    type('Current value', '8400');
    press('Save the updated value');
    const page = readLines();
    screen.unmount();
    expect(page).toContain('Value as of Sep 30, 2026');             // valued today
    expect(page).not.toContain('⏱ This value is 7 months old — still right?');
    expect([acct('gold').balance, acct('gold').value_as_of]).toEqual([8_400, TODAY]);
    const NW = look('networth');
    const INV = look('invest', {}, pick('1M'));
    const ACC = look('account', { id: 'gold', period: '1M' });
    expect(NW.lines).toContain('$8,400');
    expect(NW.lines).not.toContain('$8,000');
    expect(after(INV, 'Ending value')).toBe('$8,400');
    expect(printed(INV, 'MK-PF-M-005')).toEqual(['$8,400']);          // the account's bar
    expect(printed(ACC, 'MK-PF-M-004').slice(-1)).toEqual(['$8,400']);
    expect(ACC.lines).toContain('Value as of Sep 30, 2026');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-58 B · A SALE'S REALIZED GAIN READS THE PURCHASE RECORDS, WHEREVER THE PURCHASE CAME FROM (F3, 2026-10-23)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Import holdings and a purchase added in the holding editor wrote no record of the purchase, so a sale recorded later read
// "Realized from sales: not on record" beside the purchase the page listed with its price. Both now write the record the
// app writes for holdings you already own ("Opening holding": its date, shares and price paid where on record).
describe('E2E-58 B · a sale\'s realized gain reads what was paid, for a holding brought in by Import holdings or added in the editor', () => {
  test('Import holdings (100 VTI, cost $8,000) → its row on the account page → its page → sell 10 at $98.00: +$180 all time (it read "not on record")', async () => {
    household({ assetAccounts: [] });
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://fidelity.csv' }] });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Ticker,Shares,Cost Basis\nVTI,100,8000\n');
    const imp = render(React.createElement(require('../ImportHoldingsScreen').default));
    fireEvent.press(screen.getByText('Choose a file'));
    await waitFor(() => expect(screen.getByLabelText('Which institution is this file from')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Which institution is this file from'), 'Fidelity');
    fireEvent.press(screen.getByLabelText(/Import \d+ holdings?/));
    await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(1));
    imp.unmount();
    const a = useStore.getState().assetAccounts[0] as any;
    const pos = a.positions[0].position_id;
    // the purchase the file gave is on record: 100 VTI at $8,000 ÷ 100 = $80.00 a share, the file named no date
    expect((useStore.getState().transactions as any[]).map((t) => [t.type, t.ticker, t.shares, t.price, t.date]))
      .toEqual([['OPENING_POSITION', 'VTI', 100, 80, '']]);
    // the account page lists the holding; its row opens its page on the window picked
    open('account', { id: a.asset_id, period: '1M' });
    const row = screen.getAllByRole('button').find((b) => /^VTI, .*Opens its page\.$/.test(String(b.props.accessibilityLabel ?? '')));
    expect(row).toBeDefined();
    fireEvent.press(row!);
    expect(mockNav.pushes.slice(-1)).toEqual([`/holding-detail?account=${a.asset_id}&position=${pos}&period=1M`]);
    screen.unmount();
    // the Holding page that push opens: sell 10 at $98.00 on Sep 15
    open('holding', { account: a.asset_id, position: pos, period: '1M' });
    press('Record a buy or sell for VTI');
    press('Transaction type: Sell');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '10'); fireEvent.changeText(price, '98');
    pickDay(2026, 9, 15);
    press('Record sell');
    // what the sale made: 10 × $98 − 10 × $80 = +$180, the purchase matched oldest first
    const page = { printed: [], lines: readLines() };
    expect(after(page, 'Realized from sales')).toBe('+$180 all time');
    expect(page.lines).toContain('From your recorded buys and sells (oldest shares sold first).');
    expect(page.lines.some((l) => /no price paid on record/.test(l))).toBe(false);
    // the purchase is listed as the file gave it: its date not on record, 90 left at $80.00
    const bought = page.lines.indexOf('WHAT YOU BOUGHT');
    expect(page.lines.slice(bought + 1, bought + 3)).toEqual(['Date not on record', '90 sh @ $80.00']);
    screen.unmount();
    // the account page lists the sale, at what it brought in
    const ACC = look('account', { id: a.asset_id, period: '1M' });
    const at = ACC.lines.indexOf('Sell · VTI · 10 shares @ $98.00');
    expect(ACC.lines.slice(at, at + 3)).toEqual(['Sell · VTI · 10 shares @ $98.00', 'Sep 15 · you entered this', '$980']);
  });

  test('a purchase added in the holding editor (10 VTI at $90.00, Jan 5, 2026) → sell 105 at $100.00 today: +$2,050 all time (it read +$2,000 and "5 shares" with no price paid)', () => {
    household({ assetAccounts: [BUILT()], transactions: OPENINGS });
    open('holding', { account: 'fid', position: 'vti', period: '1M' });
    press('Edit this holding');
    press('Add another lot');
    const sharesBoxes = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(sharesBoxes[sharesBoxes.length - 1], '10');
    const costBoxes = screen.getAllByPlaceholderText('—');
    fireEvent.changeText(costBoxes[costBoxes.length - 1], '90');
    const dates = screen.getAllByLabelText(/^purchase date, /);
    fireEvent.press(dates[dates.length - 1]);
    const DateTimePicker = require('@react-native-community/datetimepicker').default;
    fireEvent(screen.UNSAFE_getByType(DateTimePicker), 'onChange', { type: 'set' }, new Date(2026, 0, 5));
    press('Save holding');
    // the purchase is on record, as an opening holding of the 10 at $90.00 on Jan 5
    expect((useStore.getState().transactions as any[]).filter((t) => t.type === 'OPENING_POSITION' && t.ticker === 'VTI').map((t) => [t.shares, t.price, t.date]))
      .toEqual([[10, 90, '2026-01-05'], [100, 80, '2025-03-03']]);
    // sell 105 at $100.00 today: the 100 bought Mar 3, 2025 first, then 5 of the 10 of Jan 5
    press('Record a buy or sell for VTI');
    press('Transaction type: Sell');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '105'); fireEvent.changeText(price, '100');
    press('Record sell');
    const page = { printed: [], lines: readLines() };
    // 100 × ($100 − $80) + 5 × ($100 − $90) = $2,000 + $50 = +$2,050
    expect(after(page, 'Realized from sales')).toBe('+$2,050 all time');
    expect(page.lines.some((l) => /no price paid on record/.test(l))).toBe(false);
    expect(after(page, 'Quantity')).toBe('5 shares');
  });

  test('bought and sold on the same day: 10 AAA bought at $90.00 today, 5 sold at $100.00 today → +$50 all time (it read "not on record": the sale was matched before the purchase)', () => {
    household({ assetAccounts: [BUILT()], transactions: OPENINGS, priceCache: { ...PRICES, AAA: closes([['2026-09-29', 95], ['2026-09-30', 100]]) } });
    open('account', { id: 'fid', period: '1M' });
    press(/^Add a buy or sale for /);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), 'AAA');
    press('Type: Stocks / Funds');   // a ticker the account does not hold yet is asked its type (2026-10-25, trade-sheet v03 row 16)
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '10'); fireEvent.changeText(price, '90');
    press('Record buy');
    // its row on the account page opens its page
    const row = screen.getAllByRole('button').find((b) => /^AAA, .*Opens its page\.$/.test(String(b.props.accessibilityLabel ?? '')));
    fireEvent.press(row!);
    const route = mockNav.pushes.slice(-1)[0];
    const pos = /position=([^&]+)/.exec(route)![1];
    screen.unmount();
    open('holding', { account: 'fid', position: pos, period: '1M' });
    press('Record a buy or sell for AAA');
    press('Transaction type: Sell');
    const [s2, p2] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(s2, '5'); fireEvent.changeText(p2, '100');
    press('Record sell');
    // 5 × ($100 − $90) = +$50, the sale matched to the purchase of the same day
    expect(after({ printed: [], lines: readLines() }, 'Realized from sales')).toBe('+$50 all time');
    expect(after({ printed: [], lines: readLines() }, 'Quantity')).toBe('5 shares');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-57 D · AN OPTION CONTRACT BOUGHT AND SOLD BY HAND (DEC-0274: contracts × 100 × price; DEC-4646: shares per contract)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fidelity Brokerage, built from its holdings: $1,000 of cash and 2 contracts of an SPY call bought Aug 3 at $2.00 (100 shares
// a contract), $2.50 today — worth 2 × 100 × $2.50 = $500. The person buys 1 contract at $2.50 on its page, then sells 1 at
// $3.00. By hand: the buy costs 1 × 100 × $2.50 = $250 (it moved $2.50), the cash $1,000 − $250 = $750; the sale brings in
// 1 × 100 × $3.00 = $300, the cash $1,050; the sale takes the oldest contract, bought at $2.00: (3.00 − 2.00) × 100 = +$100.
const CALL = 'SPY261218C00600000';
describe('E2E-57 D · an option contract bought and sold by hand moves 100 shares\' worth of cash, on every list', () => {
  test('1 contract at $2.50 costs $250 and 1 at $3.00 brings in $300; the activity says contracts; the realized gain is +$100', () => {
    const opt = { position_id: 'opt', ticker: CALL, label: 'SPY Dec 18 2026 600 call', kind: 'options', lots: [lot('o1', 2, 2, '2026-08-03')] };
    household({
      assetAccounts: [{ asset_id: 'fid', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true,
        balance: 1_000 + 2 * 100 * 2.5, cash_balance: 1_000, source: 'manual', positions: [opt] }],
      transactions: [{ id: 'o-opt', account_id: 'fid', type: 'OPENING_POSITION', position_id: 'opt', ticker: CALL, kind: 'options', shares: 2, price: 2, date: '2026-08-03', created_at: '2026-08-03T12:00:00Z' }],
      priceCache: { ...PRICES, [CALL]: closes([['2026-08-03', 2], ['2026-09-29', 2.5], ['2026-09-30', 2.5]]) },
    });
    open('holding', { account: 'fid', position: 'opt', period: '1M' });
    press(`Record a buy or sell for ${CALL}`);
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '1'); fireEvent.changeText(price, '2.5');
    press('Record buy');
    expect((useStore.getState().transactions as any[])[0]).toMatchObject({ type: 'BUY', ticker: CALL, shares: 1, price: 2.5, multiplier: 100 });
    expect(acct('fid').cash_balance).toBe(750);                       // $1,000 − 1 × 100 × $2.50 (it read $997.50)
    expect(after({ printed: [], lines: readLines() }, 'Quantity')).toBe('3 contracts');
    expect(after({ printed: [], lines: readLines() }, 'Current value')).toBe('$750');   // 3 × 100 × $2.50
    // its Activity sheet: the record in contracts, and what it took out
    press(`See ${CALL}’s activity`);
    const act = readLines(true);
    expect(act.slice(act.indexOf(`Buy ${CALL} · 1 contract @ $2.50`), act.indexOf(`Buy ${CALL} · 1 contract @ $2.50`) + 3)).toEqual([`Buy ${CALL} · 1 contract @ $2.50`, 'Sep 30, 2026 · Fidelity Brokerage', '−$250']);
    press('Done');
    // the sale
    press(`Record a buy or sell for ${CALL}`);
    press('Transaction type: Sell');
    const [s2, p2] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(s2, '1'); fireEvent.changeText(p2, '3');
    press('Record sell');
    expect(acct('fid').cash_balance).toBe(1_050);                     // $750 + 1 × 100 × $3.00
    const page = { printed: [], lines: readLines() };
    expect(after(page, 'Quantity')).toBe('2 contracts');
    expect(after(page, 'Realized from sales')).toBe('+$100 all time');   // (3.00 − 2.00) × 100, the Aug 3 contract
    screen.unmount();
    // the account page lists both, in contracts, at what each moved
    const ACC = look('account', { id: 'fid', period: '1M' });
    const name = ACC.lines.find((l) => /^Buy · .* · 1 contract @ \$2\.50$/.test(l))!;
    expect(name).toBeDefined();
    const b = ACC.lines.indexOf(name);
    expect(ACC.lines.slice(b, b + 3)).toEqual([name, 'Sep 30 · you entered this', '−$250']);
    const sl = ACC.lines.findIndex((l) => /^Sell · .* · 1 contract @ \$3\.00$/.test(l));
    expect(ACC.lines.slice(sl + 1, sl + 3)).toEqual(['Sep 30 · you entered this', '$300']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-57 E · A HOLDING THE TRADE SHEET OPENS IS CLASSED AS ANY OTHER (found by the viewing flows, 2026-10-23)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fidelity Brokerage, built from its holdings: $2,000 of cash and 50 BND. The person buys 10 VTI at $100.00 on the account page
// and then records a $5.00 VTI dividend paid as cash. VTI was saved with no class and listed under Unclassified; it now takes
// its class the one way a ticker is classed (the importer's road into the one classifier): Stocks / Funds.
describe('E2E-57 E · a VTI bought on the trade sheet lists under Stocks / Funds on the account page and in the Performance tab\'s category table', () => {
  test('buy 10 VTI at $100.00 → account page: ▾ STOCKS / FUNDS $1,000 with VTI under it; a $5 dividend → Performance: Stocks / Funds earned $5', () => {
    household({ assetAccounts: [{ ...BUILT(), balance: 2_000 + 50 * 73, positions: [BND([lot('b1', 50, 70, '2025-03-03')])] }], transactions: [OPENINGS[1]] });
    open('account', { id: 'fid', period: '1M' });
    press(/^Add a buy or sale for /);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), 'VTI');
    // Fidelity does not hold VTI yet: the sheet asks its type, nothing chosen, and the buy waits until the person says (2026-10-25,
    // trade-sheet v03 row 16; DEC-2160) — the class is the person's answer, never the classifier's default
    expect(screen.getByLabelText('Record buy').props.accessibilityState?.disabled).toBe(true);
    press('Type: Stocks / Funds');
    const [shares, price] = screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/);
    fireEvent.changeText(shares, '10'); fireEvent.changeText(price, '100');
    press('Record buy');
    // the dividend, from the same door: Dividend, VTI, $5.00 paid as cash
    press(/^Add a buy or sale for /);
    press('Transaction type: Dividend');
    press('Holding: VTI');
    fireEvent.changeText(screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/)[0], '5');
    press('Record dividend');
    const page = readLines();
    screen.unmount();
    // the type chosen, stored as the holding's kind; the one classifier reads it as the class it was given (DEC-7605, 2026-10-25)
    expect((acct('fid').positions as any[]).find((p) => p.ticker === 'VTI')).toMatchObject({ kind: 'stocks_etf' });
    // the account page: VTI under Stocks / Funds, 10 × $100 = $1,000; nothing under Unclassified
    const band = page.indexOf('▾ STOCKS / FUNDS');
    expect(band).toBeGreaterThan(page.indexOf('BY CATEGORY & HOLDING'));
    expect(page[band + 1]).toBe('$1,000');
    expect(page.slice(band, band + 8)).toContain('VTI');
    expect(page.some((l) => /UNCLASSIFIED/.test(l))).toBe(false);
    // the Performance tab's category table: the $5 VTI paid sits with Stocks / Funds
    const INV = look('invest', {}, pick('1M'));
    const cat = INV.lines.indexOf('Stocks / Funds', INV.lines.indexOf('RETURN'));
    expect(cat).toBeGreaterThan(-1);
    expect(INV.lines[cat + 1]).toBe('$5');
    expect(INV.lines.some((l) => l === 'Unclassified')).toBe(false);
  });
});

// THE OLD ANSWER, KEPT (the fix wave's rule). Until 2026-10-27 the trade sheet's price box printed the plain figure the drawing draws, '100';
// it reads '$100' now (DEC-8385, every money box is a MoneyBox). This compares with the drawing as drawn, without its row of 2026-10-27, so it
// fails; the day it passes, the price box has gone back to a plain figure.
describe('before 2026-10-27, kept', () => {
  test.failing('the trade sheet in state B read the drawing word for word, its price box the plain 100', () => {
    const B = TRADE_SHEET.states.find((s) => s.key === 'B')!;
    household({ ...B.store, pricesFetchedAt: new Date().toISOString() });
    open('account', { id: 'van', period: '1M' });
    B.steps();
    expect(readLines(true)).toEqual(drawnSheetLines(TRADE_SHEET.file, 'B'));
  });
});
