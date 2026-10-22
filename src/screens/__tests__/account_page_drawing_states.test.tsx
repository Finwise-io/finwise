/** THE ACCOUNT PAGE AGAINST ITS APPROVED DRAWING, WORD FOR WORD, STATE BY STATE.
 *
 *  The drawing: MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v01.html — six states A
 *  to F on one phone (F, a bond whose value shown is its face value, added 2026-10-20 under DEC-0281, the drawing's row 47). APPROVED 2026-10-19, his word "approved." (DEC-6457): it is the design of the Account page /
 *  Account detail screen (src/screens/AccountPortfolioScreen.tsx) and replaces Performance v17 frame 2 for it.
 *
 *  Method, the mock-match standing order (docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md):
 *   1. every visible string of each state of the drawing, in order, is read out of the file (its orange change marks,
 *      its state labels and the phone's own status bar are the drawing's, not the app's, and are left out);
 *   2. the REAL screen is rendered with that state's data on the drawing's day (Sep 30, 2026) and every visible string
 *      is read off the rendered tree, in order — each Text with what is nested in it, as a person reads one line;
 *   3. the two lists must be the same list. The test fails on the first line that differs and prints the coverage
 *      ("N of N lines identical; X different; Y missing; Z extra");
 *   4. what a text diff cannot see: which card each line sits in (nesting), the one right edge with its 16-point column,
 *      and the rendered colours, sizes and weights against the drawing's own CSS.
 *  The data state of each phone (the account, its records, its daily record and its prices) is seeded here, so the
 *  drawing's figures are the app's own and cannot drift (DEC-6212).
 *
 *  TWO READINGS, NOT DIFFERENCES — the only ones:
 *   · an apostrophe: the drawing writes ’ and the app writes ' in four shared sentences (the worked-back note, the
 *     yield on today's value, the 12-month card's "it's", the amber box's "hasn't"); the words are the same.
 *   · the top bar's icons: the drawing draws them as glyphs ("Money"+"Keel", "◉", "⚙"); the app draws the wordmark
 *     image and two icon buttons. Both are read as [wordmark MoneyKeel], [icon Hide balances], [icon Settings].
 *
 *  KNOWN DIFFERENCES (each with its reason) — see KNOWN below. There are none in the words; four are in the
 *  appearance, where the drawing's CSS and one of the app's shared rules disagree (its shared amber box, its one content
 *  padding, its one right edge, its one type scale).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';
import { Colors, Radii, Shadows, ClassMarkColors } from '../../utils/theme';
import { settleBondValue } from '../../../MoneyKeel/functions/networth-and-performance/bonds';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
const mockSync = jest.fn(async (..._a: any[]) => 1);
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: (...a: any[]) => mockSync(...a) }));

const TODAY = '2026-09-30';
const series = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const flat100 = series([['2024-09-29', 100], ['2025-09-29', 100], ['2026-04-02', 100], ['2026-08-29', 100], ['2026-09-30', 100]]);

/** A linked account's recorded day: the broker's stated total. */
const linkedDay = (id: string, date: string, total: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: 0, statedTotal: total, currency: 'USD' }],
});
/** A hand-entered account's recorded day: the value typed. */
const typedDay = (id: string, date: string, value: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: 0, typedValue: value, currency: 'USD' }],
});

// ── STATE A · Vanguard Brokerage, linked, record from Oct 1, 2025 ─────────────────────────────────────────────
const VAN = {
  asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 101_000, cash_balance: 2_000, source: 'connected', last_synced: `${TODAY}T08:00:00Z`,
  positions: [
    { position_id: 'voo', ticker: 'VOO', asset_class: 'stock_etf', last_price: 562.5,
      lots: [{ lot_id: 'v1', shares: 150, cost_per_share: 531.33, purchase_date: '2024-01-02' },
             { lot_id: 'v2', shares: 10, cost_per_share: 600, purchase_date: '2026-04-02' }] },
    { position_id: 'kcd', ticker: '49306SAB2', name: 'KeyBank CD', label: 'KeyBank CD', kind: 'cd', asset_class: 'bond', last_price: 100,
      face_value: 5_000, coupon_rate: 0.04, maturity_date: '2027-03-31',
      lots: [{ lot_id: 'k1', shares: 50, cost_per_share: 100, purchase_date: '2026-04-02' }] },
    { position_id: 'ust', ticker: '91282CGM7', name: 'US Treasury 2028', label: 'US Treasury 2028', asset_class: 'bond', last_price: 100,
      face_value: 4_000, coupon_rate: 0.0425, maturity_date: '2028-02-15',
      lots: [{ lot_id: 'u1', shares: 40, cost_per_share: 100, purchase_date: '2026-04-02' }] },
  ],
};
const r = (id: string, date: string, type: string, amount: number, ticker?: string, extra: any = {}) =>
  ({ id, date, type, amount, account_id: 'van', source: 'connected', ...(ticker ? { ticker } : {}), ...extra });
const VAN_LEDGER = [
  r('i1', '2026-09-30', 'INTEREST', 50, '49306SAB2'), r('i2', '2026-09-30', 'INTEREST', 4),
  r('d1', '2026-09-26', 'DIVIDEND', 400, 'VOO'), r('i3', '2026-08-15', 'INTEREST', 85, '91282CGM7'),
  r('i4', '2026-06-30', 'INTEREST', 50, '49306SAB2'), r('i5', '2026-06-30', 'INTEREST', 3),
  r('d2', '2026-06-26', 'DIVIDEND', 380, 'VOO'),
  r('b1', '2026-04-02', 'BUY', 6_000, 'VOO', { shares: 10, price: 600 }),
  r('b2', '2026-04-02', 'BUY', 5_000, '49306SAB2', { shares: 50, price: 100 }),
  r('b3', '2026-04-02', 'BUY', 4_000, '91282CGM7', { shares: 40, price: 100 }),
  r('c1', '2026-04-01', 'DEPOSIT', 15_000),
  r('i6', '2026-03-31', 'INTEREST', 4), r('d3', '2026-03-26', 'DIVIDEND', 360, 'VOO'),
  r('i7', '2025-12-31', 'INTEREST', 4), r('d4', '2025-12-26', 'DIVIDEND', 360, 'VOO'),
];
const VAN_DAYS = [
  linkedDay('van', '2025-10-01', 80_000), linkedDay('van', '2025-12-31', 85_000),
  linkedDay('van', '2026-03-31', 90_278), linkedDay('van', '2026-04-01', 105_278),
  linkedDay('van', '2026-08-29', 100_000),
];
// VOO's dividend-adjusted closes: +7.67% over the year to today
const VOO = series([['2024-09-29', 460], ['2025-09-29', 562.5 / 1.0767], ['2025-12-31', 545], ['2026-03-31', 590],
  ['2026-04-02', 600], ['2026-08-29', 556], ['2026-09-30', 562.5]]);

// ── STATE B · Muni 2029, a bond built by hand Jun 2, 2026 at $10,000, updated Sep 1 to $10,150, no rate ────────
const MUNI = {
  asset_id: 'muni', label: 'Muni 2029', kind: 'fixed_income', asset_class: 'bonds', balance: 10_150,
  face_value: 10_000, maturity_date: '2029-06-01', source: 'manual', value_as_of: '2026-09-01',
};
const MUNI_DAYS = [typedDay('muni', '2026-06-02', 10_000), typedDay('muni', '2026-09-01', 10_150)];

// ── STATES C and D · Fidelity Brokerage, linked today, no past activity sent ──────────────────────────────────
const FID = {
  asset_id: 'fid', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 50_000, source: 'connected', last_synced: `${TODAY}T08:00:00Z`,
  positions: [
    { position_id: 'vti', ticker: 'VTI', asset_class: 'stock_etf', last_price: 312.5,
      lots: [{ lot_id: 't1', shares: 128, cost_per_share: 250 }] },
    { position_id: 't31', ticker: '912810TM0', name: 'Treasury 2031', label: 'Treasury 2031', asset_class: 'bond', last_price: 100,
      face_value: 10_000, maturity_date: '2031-11-15', lots: [{ lot_id: 't2', shares: 100 }] },
  ],
};
const VTI = series([['2024-09-29', 250], ['2025-09-29', 312.5 / 1.1], ['2025-12-31', 295], ['2026-08-29', 305], ['2026-09-30', 312.5]]);
// the day the account is linked. State C is drawn with NO record of it at all (the drawing's row 39: "no day is
// recorded and no money has moved") — the page opened before today's record holds the account. State D is drawn on the
// record AS THE APP WRITES IT: Home writes today's values the moment it opens, so the record holds one day, today.
const FID_TODAY = [linkedDay('fid', TODAY, 50_000)];

// ── STATE E · US Treasury 4.00% 2030, built by hand Jun 2, 2026 at $9,850; $9,700 paid (row 46, 2026-10-20) ─────────
const TSY = {
  asset_id: 'tsy30', label: 'US Treasury 4.00% 2030', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: 9_850, face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-09-30', source: 'manual', value_as_of: '2026-06-02',
  amount_paid: 9_700,
};
const TSY_DAYS = [typedDay('tsy30', '2026-06-02', 9_850)];

// ── STATE F · state E's bond before a market value was entered (row 47, 2026-10-20, DEC-0281) ──────────────────────
// Stored by the REAL writer: the account as an editor hands it over — a face value, no market value, nothing paid — through
// the one value rule the store applies on save (settleBondValue, asked of the bonds door), never a hand-typed balance.
const { amount_paid: _paid, balance: _market, ...TSY_NO_VALUE } = TSY;
const TSY_FACE = settleBondValue({ ...TSY_NO_VALUE } as any, { ...TSY_NO_VALUE } as any);
const TSY_FACE_DAYS = [typedDay('tsy30', '2026-06-02', 10_000)];

/** `opened`: the window the page is opened with — Performance hands over the window picked there (row 18); `pick`: a window
 *  tapped on the page afterwards. */
type State = { key: string; account: any; ledger: any[]; days: any[]; prices: Record<string, any>; pick: string; others?: any[]; opened?: string };
const STATES: State[] = [
  { key: 'A', account: VAN, ledger: VAN_LEDGER, days: VAN_DAYS, prices: { VOO, '49306SAB2': flat100, '91282CGM7': flat100 }, pick: 'SINCE' },
  { key: 'B', account: MUNI, ledger: [], days: MUNI_DAYS, prices: {}, pick: 'SINCE' },
  { key: 'C', account: FID, ledger: [], days: [], prices: { VTI }, pick: 'SINCE' },
  // "THE SAME ACCOUNT, 1Y PICKED ON PERFORMANCE": opened from Performance with 1Y picked there (row 18)
  { key: 'D', account: FID, ledger: [], days: FID_TODAY, prices: { VTI }, pick: 'SINCE', opened: '1Y' },
  { key: 'E', account: TSY, ledger: [], days: TSY_DAYS, prices: {}, pick: 'SINCE' },
  { key: 'F', account: TSY_FACE, ledger: [], days: TSY_FACE_DAYS, prices: {}, pick: 'SINCE' },
];

function renderState(st: State) {
  useStore.getState().resetAll();
  mockParams = { id: st.account.asset_id, ...(st.opened ? { period: st.opened } : {}) };
  useStore.setState({ hideBalances: false, assetAccounts: [st.account, ...(st.others ?? [])], transactions: st.ledger,
    snapshotDays: st.days, priceCache: st.prices } as any);
  render(<AccountPortfolioScreen />);
  if (st.pick !== 'SINCE') pick(st.pick);
}
function pick(k: string) {
  const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${k}`));
  fireEvent.press(btn!);
}

beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// READING THE DRAWING
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const DRAWING = path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_account-page_v01.html');
const HTML = fs.readFileSync(DRAWING, 'utf8');
/** One line a person reads, and the card (or box, or bar) it sits in: '' = on the page itself. */
type Line = { t: string; g: string };
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
/** The two readings named in the header: an apostrophe is an apostrophe. */
const norm = (s: string) => s.replace(/[’‘]/g, "'");
const GROUP_OF_CLASS: Record<string, string> = { card: 'card', warnb: 'warn', segbar: 'segbar', btnrow: 'btnrow' };

function drawnStates(): { key: string; label: string; lines: Line[] }[] {
  const phone = HTML.slice(HTML.indexOf('<div class="phone">'), HTML.indexOf('<div class="side">'))
    .replace(/<span class="pn">[^<]*<\/span>/g, '')            // the orange change marks: the drawing's, not the app's
    .replace(/<div class="sbar">[\s\S]*?<\/div>/g, '')          // the phone's own status bar
    .replace(/<span class="lnk">([^<]*)<\/span>/g, '$1');       // a link inside a line is read as part of that line
  const out: { key: string; label: string; lines: Line[] }[] = [];
  const stack: { cls: string; g: string | null }[] = [];
  let counters: Record<string, number> = {};
  let inLabel = false;
  for (const m of phone.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi)) {
    if (m[4] != null) {
      const t = clean(decode(m[4]));
      if (!t) continue;
      if (inLabel) { out.push({ key: t.charAt(6), label: t, lines: [] }); continue; }
      const cur = out[out.length - 1];
      if (!cur) continue;
      const classes = stack.map((x) => x.cls);
      if (classes.includes('wordmark')) { if (t === 'Money') cur.lines.push({ t: '[wordmark MoneyKeel]', g: '' }); continue; }
      const g = [...stack].reverse().find((x) => x.g)?.g ?? '';
      cur.lines.push({ t: t === '◉' && classes.includes('tico') ? '[icon Hide balances]' : t === '⚙' && classes.includes('tico') ? '[icon Settings]' : t, g });
      continue;
    }
    const [, close, tag, attrs] = m;
    if (close) { const top = stack.pop(); if (top?.cls === 'state') inLabel = false; continue; }
    if (tag === 'br') continue;
    const cls = (/class="([^"]*)"/.exec(attrs)?.[1] ?? /class=([^\s>]+)/.exec(attrs)?.[1] ?? '').split(/\s+/);
    if (cls.includes('state')) { inLabel = true; counters = {}; stack.push({ cls: 'state', g: null }); continue; }
    const kind = cls.map((c) => GROUP_OF_CLASS[c]).find(Boolean);
    let g: string | null = null;
    if (kind && tag === 'div') { counters[kind] = (counters[kind] ?? 0) + 1; g = `${kind}#${counters[kind]}`; }
    stack.push({ cls: cls.join(' '), g });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// READING THE SCREEN
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
/** What a Text shows: its own words and every Text nested in it, as the rendered style transforms them. */
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
const ICON_BUTTONS = new Set(['Hide balances', 'Show balances', 'Settings']);
/** A card is the page's white rounded box with the theme's card shadow; the box, the bar and the button row say so. */
function groupKind(n: any): string | null {
  const id = n.props?.testID;
  if (id === 'window-bar') return 'segbar';
  if (id === 'gaps-on-page') return 'warn';
  if (id === 'account-buttons') return 'btnrow';
  if (n.type !== 'View') return null;
  const st = flat(n.props?.style);
  return st.backgroundColor === Colors.cardBg && st.borderRadius === Radii.lg && st.shadowOpacity === Shadows.card.shadowOpacity ? 'card' : null;
}
function builtLines(): Line[] {
  const out: Line[] = [];
  const counters: Record<string, number> = {};
  const walk = (n: any, g: string) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, g)); return; }
    let gg = g;
    const kind = groupKind(n);
    if (kind) { counters[kind] = (counters[kind] ?? 0) + 1; gg = `${kind}#${counters[kind]}`; }
    if (n.type === 'Text') {
      const t = clean(textOf(n));
      if (t && !/^[-]+$/.test(t)) out.push({ t, g: gg });   // an icon-font glyph is not a word
      return;
    }
    if (n.type === 'Image' && n.props?.accessibilityLabel === 'MoneyKeel') { out.push({ t: '[wordmark MoneyKeel]', g: gg }); return; }
    if (n.props?.accessibilityRole === 'button' && ICON_BUTTONS.has(n.props?.accessibilityLabel)) { out.push({ t: `[icon ${n.props.accessibilityLabel}]`, g: gg }); return; }
    (n.children ?? []).forEach((c: any) => walk(c, gg));
  };
  walk(screen.toJSON(), '');
  return out;
}

/** THE DIFF: the longest run the two lists share in order; around it, a line in both places is "different", one only
 *  in the drawing "missing", one only on the screen "extra". */
function coverage(drawn: string[], built: string[]) {
  const n = drawn.length, m = built.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = drawn[i] === built[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0, identical = 0, different = 0, missing = 0, extra = 0, gapD = 0, gapB = 0;
  const flush = () => { const d = Math.min(gapD, gapB); different += d; missing += gapD - d; extra += gapB - d; gapD = gapB = 0; };
  while (i < n && j < m) {
    if (drawn[i] === built[j]) { flush(); identical++; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { gapD++; i++; } else { gapB++; j++; }
  }
  gapD += n - i; gapB += m - j; flush();
  return { identical, different, missing, extra, line: `${identical} of ${n} lines identical; ${different} different; ${missing} missing; ${extra} extra` };
}
const firstDifference = (drawn: string[], built: string[]): string | null => {
  for (let k = 0; k < Math.max(drawn.length, built.length); k++) {
    if (drawn[k] !== built[k]) return `line ${k + 1}: the drawing reads «${drawn[k] ?? '(nothing)'}», the screen reads «${built[k] ?? '(nothing)'}»`;
  }
  return null;
};

/** KNOWN DIFFERENCES, EACH WITH ITS REASON. Words: none. Appearance (checked in the appearance block below): */
const KNOWN = {
  /** the amber box is the app's ONE amber box of missing information (DataGapsBanner, Performance and Net worth): 16
   *  round and 12 in, where the drawing's CSS writes 12 round and 10 in. The drawing's row 26 calls it "the same box as
   *  the app’s missing-data banner", and the brief for this build says "build it with the shared amber style". */
  amberBoxRadiusAndPadding: { app: { borderRadius: 16, padding: 12 }, drawing: { borderRadius: 12, padding: '10px 12px' } },
  /** the page's top padding is the app's one content padding, 20 (every tab and page); the drawing's CSS writes 4 above
   *  the name while its own comment says "content padding Spacing.lg (20)". */
  contentTop: { app: 20, drawing: 4 },
  /** the drawing's CSS spaces each figure 8 (on a bar, 6) from the 16-point column; the app sets the column flush
   *  against the figure, the rule every money row on the Performance tab keeps (DEC-0093), so every figure on the page
   *  ends on ONE line. The drawing's own CSS gives two lines, 2 points apart (bars and rows). */
  gutterFlush: { app: 0, drawing: { row: 8, bar: 6 } },
  /** the amber box's two doors write 13, every door's size; the drawing's small door (.door.sm) writes 12, which is not on
   *  the app's one type scale (src/components/__tests__/SectionBand.test.tsx fails the build on any size off it). */
  smallDoorText: { app: 13, drawing: 12 },
};

const DRAWN = drawnStates();
/** The coverage line of every state, written for the audit (the runner cuts console output). */
const REPORT: Record<string, string> = {};

describe('the drawing, read (a guard must prove it looked)', () => {
  test('six states, A to F, each with its lines; every state starts at the top bar', () => {
    expect(DRAWN.map((d) => d.key)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    const floor: Record<string, number> = { A: 120, B: 60, C: 80, D: 85, E: 65, F: 60 };
    for (const d of DRAWN) {
      expect(d.lines.length).toBeGreaterThanOrEqual(floor[d.key]);
      expect(d.lines.slice(0, 4).map((l) => l.t)).toEqual(['‹ Back', '[wordmark MoneyKeel]', '[icon Hide balances]', '[icon Settings]']);
    }
  });
  test('the drawing\'s colours are the app\'s tokens (its :root is read from src/utils/theme.ts)', () => {
    const root = /:root\{([^}]*)\}/.exec(HTML)![1];
    const tok = (k: string) => new RegExp(`--${k}:([^;]+);`).exec(root)![1].trim().toUpperCase();
    expect(tok('primary')).toBe(Colors.primary.toUpperCase());
    expect(tok('primaryDark')).toBe(Colors.primaryDark.toUpperCase());
    expect(tok('primaryDeep')).toBe(Colors.primaryDeep.toUpperCase());
    expect(tok('primaryLight')).toBe(Colors.primaryLight.toUpperCase());
    expect(tok('bandLight')).toBe(Colors.bandLight.toUpperCase());
    expect(tok('amber')).toBe(Colors.amber.toUpperCase());
    expect(tok('amberLight')).toBe(Colors.amberLight.toUpperCase());
    expect(tok('red')).toBe(Colors.red.toUpperCase());
    expect(tok('gain')).toBe(Colors.gainText.toUpperCase());
    expect(tok('bg2')).toBe(Colors.bgSecondary.toUpperCase());
    expect(tok('bg3')).toBe(Colors.bgTertiary.toUpperCase());
    expect(tok('t1')).toBe(Colors.textPrimary.toUpperCase());
    expect(tok('t2')).toBe(Colors.textSecondary.toUpperCase());
    expect(tok('t3')).toBe(Colors.textTertiary.toUpperCase());
    expect(tok('tdis')).toBe(Colors.textDisabled.toUpperCase());
    expect(tok('tdisf')).toBe(Colors.textDisabledFaint.toUpperCase());
    // the class dots, in the order the table draws them
    const dots = [...HTML.matchAll(/class="cdot" style="background:(#[0-9a-f]{6})"/g)].map((x) => x[1]);
    expect(dots.slice(0, 4)).toEqual([ClassMarkColors.stocks_etf, ClassMarkColors.bonds, ClassMarkColors.cash, ClassMarkColors.alternatives]);
    // the card's shadow is the theme's card shadow: 0 1px 4px at 6%
    expect(HTML).toMatch(/\.card\{[^}]*box-shadow:0 1px 4px rgba\(0,0,0,\.06\)/);
    expect(Shadows.card).toMatchObject({ shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, shadowOpacity: 0.06 });
  });
});

describe('WORD FOR WORD, IN ORDER: every line of each state of the drawing is the screen\'s, and nothing else is', () => {
  afterAll(() => {
    // eslint-disable-next-line no-console
    console.log(`\nACCOUNT PAGE vs the account-page drawing v01 (approved 2026-10-19; rows 45-48, 2026-10-20)\n${Object.entries(REPORT).map(([k, v]) => `  state ${k}: ${v}`).join('\n')}\n`);
    try { fs.writeFileSync(path.join(require('os').tmpdir(), 'account-page-coverage.txt'), Object.entries(REPORT).map(([k, v]) => `state ${k}: ${v}`).join('\n')); } catch { /* the report is a convenience */ }
  });
  test.each(STATES.map((st, i) => [st.key, st, i] as const))('state %s', (k, st, i) => {
    renderState(st);
    const drawn = DRAWN[i].lines.map((l) => norm(l.t));
    const built = builtLines().map((l) => norm(l.t));
    const cov = coverage(drawn, built);
    REPORT[k] = cov.line;
    const diff = firstDifference(drawn, built);
    if (diff) throw new Error(`state ${k}: ${cov.line}\n  first difference — ${diff}`);
    expect(cov.identical).toBe(drawn.length);
    expect(built.length).toBe(drawn.length);
  });
});

describe('NESTING: every line sits in the card, box or bar the drawing puts it in, in the same order', () => {
  test.each(STATES.map((st, i) => [st.key, st, i] as const))('state %s', (_k, st, i) => {
    renderState(st);
    const built = builtLines();
    expect(built.map((l) => [norm(l.t), l.g])).toEqual(DRAWN[i].lines.map((l) => [norm(l.t), l.g]));
    // the guard looked: each state has its cards
    expect(new Set(built.map((l) => l.g).filter((g) => g.startsWith('card'))).size).toBeGreaterThanOrEqual(3);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// APPEARANCE — the rendered style of each element against the drawing's CSS rule for it
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Node = { n: any; parent: any; anc: any[] };
function nodes(): Node[] {
  const out: Node[] = [];
  const walk = (n: any, anc: any[]) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, anc)); return; }
    out.push({ n, parent: anc[anc.length - 1] ?? null, anc });
    (n.children ?? []).forEach((c: any) => walk(c, [...anc, n]));   // into a Text too: a link nested in a line has its own style
  };
  walk(screen.toJSON(), []);
  return out;
}
/** The rendered style of the (nth) Text reading exactly these words. */
const styleOf = (words: string | RegExp, nth = 0) => {
  const hits = nodes().filter(({ n }) => n.type === 'Text' && (typeof words === 'string' ? norm(clean(textOf(n))) === norm(words) : words.test(clean(textOf(n)))));
  if (!hits[nth]) throw new Error(`no Text reads ${String(words)}`);
  return flat(hits[nth].n.props.style);
};
const parentStyleOf = (words: string, nth = 0) => {
  const hits = nodes().filter(({ n }) => n.type === 'Text' && norm(clean(textOf(n))) === norm(words));
  return flat(hits[nth].parent.props.style);
};

describe('APPEARANCE: colours, sizes and weights as rendered, against the drawing\'s CSS', () => {
  test('state A — the head, the bar, the summary, the walk, the table, the activity (CSS rule named on each line)', () => {
    renderState(STATES[0]);
    expect(styleOf('Vanguard Brokerage')).toMatchObject({ fontSize: 20, fontWeight: '800', color: Colors.textPrimary });            // .h1
    expect(styleOf('🔗 Linked')).toMatchObject({ fontSize: 11, fontWeight: '700', color: Colors.primaryDark });                     // .chip.linked
    expect(parentStyleOf('🔗 Linked')).toMatchObject({ backgroundColor: Colors.primaryLight, borderRadius: Radii.pill, paddingHorizontal: 8, paddingVertical: 2 });
    expect(styleOf('ⓘ', 0)).toMatchObject({ fontSize: 11, color: Colors.textTertiary });                                           // .idot
    expect(styleOf('Mixed holdings · taxable')).toMatchObject({ fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 8 });   // .classline
    // .segbar / .sg: the picked window white with green words; a window at rest names itself in the tertiary grey
    expect(styleOf('Since Oct 1, 2025')).toMatchObject({ fontSize: 11, fontWeight: '700', color: Colors.primaryDark });
    expect(styleOf('1M')).toMatchObject({ fontSize: 11, fontWeight: '700', color: Colors.textTertiary });
    expect(styleOf('+1.00%')).toMatchObject({ fontSize: 13, fontWeight: '800', color: Colors.textPrimary });
    // .band / .bt / .bv: the dark-green bar, white 11/800 capitals, the figure 15/800
    expect(styleOf('THIS ACCOUNT · SINCE OCT 1, 2025')).toMatchObject({ fontSize: 11, fontWeight: '800', color: Colors.white, textTransform: 'uppercase', letterSpacing: 0.5 });
    expect(parentStyleOf('THIS ACCOUNT · SINCE OCT 1, 2025')).toMatchObject({ backgroundColor: Colors.primaryDeep, paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0 });
    expect(styleOf('$101,000', 0)).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.white });
    // .trio: labels 11/800 tertiary; figures 20/800 — Market value deep green, a measured gain green
    expect(styleOf('Market value')).toMatchObject({ fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 });
    expect(styleOf('$101,000', 1)).toMatchObject({ fontSize: 20, fontWeight: '800', color: Colors.primaryDark });
    expect(styleOf('$6,000', 0)).toMatchObject({ fontSize: 20, fontWeight: '800', color: Colors.gainText });
    expect(styleOf('+8.26%', 2)).toMatchObject({ fontSize: 20, fontWeight: '800', color: Colors.gainText });   // (the bar's Since and 1Y read it first)
    expect(styleOf(/^Return is for the window you picked/)).toMatchObject({ fontSize: 11, color: Colors.textTertiary, lineHeight: 16, marginTop: 6 });   // .note
    // .wr: 15 secondary labels, 15/700 figures; Wealth generated 800; its parts indented 20; the ending deep green 800
    expect(styleOf('Contributions')).toMatchObject({ fontSize: 15, color: Colors.textSecondary });
    expect(styleOf('$15,000')).toMatchObject({ fontSize: 15, fontWeight: '700', color: Colors.textPrimary });
    expect(styleOf('Wealth generated', 1)).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.textPrimary });
    expect(styleOf('$6,000', 1)).toMatchObject({ fontWeight: '800' });
    expect(parentStyleOf('Dividends')).toMatchObject({ paddingLeft: 20, paddingVertical: 7, gap: 8 });
    expect(styleOf('$1,500')).toMatchObject({ color: Colors.textPrimary });                                                     // row 5: text colour, not green
    expect(styleOf('Ending market value (Sep 30, 2026)')).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.textPrimary });
    expect(styleOf('$101,000', 2)).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.primaryDark });
    expect(parentStyleOf('Ending market value (Sep 30, 2026)')).toMatchObject({ borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4 });
    // .colhdr: 11/800 secondary capitals
    expect(styleOf('MARKET VALUE')).toMatchObject({ fontSize: 11, fontWeight: '800', color: Colors.textSecondary, width: 76 });
    expect(styleOf('RETURN')).toMatchObject({ fontSize: 11, fontWeight: '800', color: Colors.textSecondary, width: 88 });
    // .cband: the light-green bar, deep-green 11/800 words and 15/800 figures, the class dot 8
    expect(styleOf('▾ STOCKS / FUNDS')).toMatchObject({ fontSize: 11, fontWeight: '800', color: Colors.primaryDeep, letterSpacing: 0.5 });
    expect(parentStyleOf('▾ STOCKS / FUNDS')).toMatchObject({ backgroundColor: Colors.bandLight, paddingVertical: 8, paddingHorizontal: 12, marginHorizontal: -12, marginTop: 2, marginBottom: 4, gap: 8 });
    expect(styleOf('$90,000', 0)).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.primaryDeep });
    // .hr: name 15/600, the line beneath 11 tertiary, value 15/800, return 15/600, "›" 15 tertiary
    expect(styleOf('VOO')).toMatchObject({ fontSize: 15, fontWeight: '600', color: Colors.textPrimary });
    expect(styleOf('160 shares · $562.50')).toMatchObject({ fontSize: 11, color: Colors.textTertiary, marginTop: 1 });
    expect(styleOf('$90,000', 1)).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.textPrimary });
    expect(styleOf('+7.67%', 1)).toMatchObject({ fontSize: 15, fontWeight: '600', color: Colors.textPrimary });
    expect(styleOf('›', 0)).toMatchObject({ fontSize: 15, color: Colors.textTertiary });
    expect(styleOf('Income: $1,500 dividends')).toMatchObject({ fontSize: 11, color: Colors.textSecondary, paddingLeft: 17, paddingBottom: 6, marginTop: -2 });   // .inc
    expect(styleOf('Nothing held in this account')).toMatchObject({ fontSize: 13, color: Colors.textTertiary, paddingLeft: 17, paddingTop: 4, paddingBottom: 8 });   // .empty
    expect(styleOf('Total')).toMatchObject({ fontSize: 15, fontWeight: '800' });
    expect(styleOf(/^A holding’s return is what its own price did/)).toMatchObject({ fontSize: 11, color: Colors.textTertiary, lineHeight: 16, paddingTop: 2 });   // .note.pad
    // .ar: 15 primary label, 11 tertiary "from", 15/700 amount — green when money came in, text colour when it went out
    expect(styleOf('Interest · KeyBank CD', 0)).toMatchObject({ fontSize: 15, color: Colors.textPrimary });
    expect(styleOf('Sep 30 · from Vanguard', 0)).toMatchObject({ fontSize: 11, color: Colors.textTertiary, marginTop: 1 });
    expect(styleOf('$400')).toMatchObject({ fontSize: 15, fontWeight: '700', color: Colors.gainText });
    expect(styleOf('−$6,000')).toMatchObject({ fontSize: 15, fontWeight: '700', color: Colors.textPrimary });
    // .door / .door.fill: 44 high, 12 round, 13/800; filled deep green, the others outlined
    expect(styleOf('Add a contribution or withdrawal ›')).toMatchObject({ fontSize: 13, fontWeight: '800', color: Colors.white });
    expect(parentStyleOf('Add a contribution or withdrawal ›')).toMatchObject({ backgroundColor: Colors.primaryDeep, borderRadius: 12, minHeight: 44, paddingHorizontal: 14 });
    expect(styleOf('Add a buy or sale ›')).toMatchObject({ fontSize: 13, fontWeight: '800', color: Colors.primaryDeep });
    expect(parentStyleOf('Add a buy or sale ›')).toMatchObject({ borderWidth: 1.5, borderColor: Colors.primaryDeep, borderRadius: 12, minHeight: 44 });
    expect(styleOf('See all activity (older than Apr 2, 2026) ›')).toMatchObject({ fontSize: 15, fontWeight: '700', color: Colors.primary });   // .seeall
    expect(styleOf('7 more records below this date')).toMatchObject({ fontSize: 11, color: Colors.textTertiary });
    // .card: white, 16 round, 12 in, 10 at its foot, 8 apart, the theme's card shadow
    const cards = nodes().filter(({ n }) => groupKind(n) === 'card');
    expect(cards.length).toBe(4);
    for (const { n } of cards) expect(flat(n.props.style)).toMatchObject({ backgroundColor: Colors.cardBg, borderRadius: 16, padding: 12, paddingBottom: 10, marginBottom: 8, ...Shadows.card });
  });

  test('state B — the hand-built head, the tax-type link, the buttons, BOND FACTS and the 12-month card', () => {
    renderState(STATES[1]);
    expect(styleOf('✍️ By hand · you update it')).toMatchObject({ fontSize: 11, fontWeight: '700', color: Colors.textSecondary });  // .chip.hand
    expect(parentStyleOf('✍️ By hand · you update it')).toMatchObject({ backgroundColor: Colors.bgTertiary });
    expect(styleOf('Value as of Sep 1, 2026')).toMatchObject({ fontSize: 13, color: Colors.textTertiary, marginLeft: 4 });           // .upd
    expect(styleOf('choose ›')).toMatchObject({ color: Colors.primary, fontWeight: '700' });                                        // .lnk
    expect(styleOf('This year')).toMatchObject({ color: Colors.textDisabled });                                                     // .sg.no .k
    expect(styleOf('—', 0)).toMatchObject({ color: Colors.textDisabledFaint });                                                     // .sg.no .v
    // .btnrow / .sbtn
    expect(styleOf('Edit')).toMatchObject({ fontSize: 15, fontWeight: '700', color: Colors.textPrimary });
    expect(parentStyleOf('Edit')).toMatchObject({ borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16, minHeight: 44, paddingHorizontal: 18, backgroundColor: Colors.cardBg });
    // .ch2 / .fr
    expect(styleOf('BOND FACTS')).toMatchObject({ fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 });
    expect(styleOf('Face value')).toMatchObject({ fontSize: 15, color: Colors.textSecondary });
    expect(styleOf('$10,000', 0)).toMatchObject({ fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' });
    // .bn / .fr2
    expect(styleOf(/^Add historic 12-month return on your holdings/)).toMatchObject({ fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 6 });
    expect(styleOf('Not entered')).toMatchObject({ fontSize: 13, color: Colors.textPrimary, lineHeight: 20 });
    expect(styleOf('Add')).toMatchObject({ fontSize: 13, fontWeight: '700', color: Colors.primary });
    expect(styleOf('Log a deposit or a buy — your history starts here.')).toMatchObject({ fontSize: 13, color: Colors.textSecondary, paddingVertical: 6 });   // .empty2
  });

  test('state C — day one: Wealth generated and Return in the text colour, the line without a dot', () => {
    renderState(STATES[2]);
    expect(styleOf('$0', 0)).toMatchObject({ fontSize: 20, fontWeight: '800', color: Colors.textPrimary });                         // .tv (no gain)
    const ret = nodes().filter(({ n }) => n.type === 'Text' && textOf(n) === '—').map(({ n }) => flat(n.props.style)).find((st) => st.fontSize === 20);
    expect(ret).toMatchObject({ fontWeight: '800', color: Colors.textPrimary });
    expect(styleOf('Since today')).toMatchObject({ color: Colors.primaryDark });                                                    // picked, a dash
  });

  test('state D — the amber box: the shared box, an amber headline, hanging bullets in the text colour, two small doors', () => {
    renderState(STATES[3]);
    const box = nodes().find(({ n }) => n.props?.testID === 'gaps-on-page')!;
    expect(flat(box.n.props.style)).toMatchObject({ backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber, marginBottom: 8 });
    // KNOWN.amberBoxRadiusAndPadding: the app's one amber box
    expect(flat(box.n.props.style)).toMatchObject(KNOWN.amberBoxRadiusAndPadding.app);
    expect(styleOf('⚠ 1 number needs more information ›')).toMatchObject({ fontSize: 13, fontWeight: '800', color: Colors.amber });   // .warnb b
    expect(styleOf(/^Fidelity hasn't shared dividend records for this account\./)).toMatchObject({ fontSize: 13, color: Colors.textPrimary, flex: 1 });   // .bl2 .w
    expect(parentStyleOf('·')).toMatchObject({ flexDirection: 'row', alignItems: 'flex-start', gap: 6 });                         // .bl2 (DEC-6078)
    expect(styleOf('Enter dividends yourself ›')).toMatchObject({ fontSize: KNOWN.smallDoorText.app, fontWeight: '800', color: Colors.white });   // .door.fill.sm
    expect(parentStyleOf('Enter dividends yourself ›')).toMatchObject({ backgroundColor: Colors.primaryDeep, minHeight: 36, borderRadius: 12 });
    expect(styleOf('Sync now ›')).toMatchObject({ fontSize: KNOWN.smallDoorText.app, fontWeight: '800', color: Colors.primaryDeep });   // .door.sm
    expect(parentStyleOf('Sync now ›')).toMatchObject({ borderWidth: 1.5, borderColor: Colors.primaryDeep, minHeight: 36 });
    expect(styleOf('1Y')).toMatchObject({ color: Colors.primaryDark });
  });

  test('state E — IF INTEREST RATES MOVE: the title and its dot, the estimate tag, the two lines and the note', () => {
    renderState(STATES[4]);
    expect(styleOf('IF INTEREST RATES MOVE')).toMatchObject({ fontSize: 11, fontWeight: '800', color: Colors.textTertiary });       // .ch2
    expect(styleOf('estimate')).toMatchObject({ fontSize: 13, fontWeight: '600', color: Colors.textTertiary });                      // .est
    expect(styleOf(/^Rates rise 1% →/)).toMatchObject({ fontSize: 13, color: Colors.textPrimary, lineHeight: 20, marginTop: 4 });    // .bl
    expect(styleOf(/^Held to maturity, \$10,000 comes back/)).toMatchObject({ fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 6 });   // .bn
    expect(styleOf('$0', 0)).toMatchObject({ color: Colors.gainText });                                                            // a measured $0 is a gain of nothing, green
    expect(styleOf('+0.00%', 2)).toMatchObject({ color: Colors.gainText });
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE RIGHT EDGE (row 8; DEC-0093) — every figure ends at the same 16-point column; "›" only where a row opens a page
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const FIGURE = /^(?:[−+]?\$[\d,]+(?:\.\d\d)?|[+−]?\d+\.\d\d%(?:\/year)?|—|\d[\d,]* records?)$/;
const isGutter = (x: any) => x?.props?.testID === 'right-gutter';
describe('THE ONE RIGHT EDGE: every figure in a bar, the walk, the table and the activity ends at the same column', () => {
  test.each(STATES.map((st) => [st.key, st] as const))('state %s', (k, st) => {
    renderState(st);
    const all = nodes();
    const inCard = (nd: Node, id: string) => nd.anc.some((a) => a.props?.testID === id);
    const figs = all.filter((nd) => nd.n.type === 'Text' && FIGURE.test(clean(textOf(nd.n)))
      && (['card-walk', 'card-holdings', 'card-activity'].some((id) => inCard(nd, id))
        || (inCard(nd, 'card-summary') && flat(nd.parent?.props?.style).backgroundColor === Colors.primaryDeep)));   // the summary's bar, not its trio
    const rowOf = (nd: Node) => [...nd.anc].reverse().find((a) => (a.children ?? []).some(isGutter));
    let edged = 0, columns = 0;
    for (const nd of figs) {
      const row = rowOf(nd);
      expect(row).toBeTruthy();
      const kids = (row.children ?? []).filter((c: any) => c && typeof c !== 'string');
      const gutter = kids[kids.length - 1];
      expect(isGutter(gutter)).toBe(true);
      const gst = flat(gutter.props.style);
      expect(gst.width).toBe(16);
      // the column sits flush: its negative margin gives back the row's gap (KNOWN.gutterFlush)
      expect((gst.marginLeft ?? 0) + (flat(row.props.style).gap ?? 0)).toBe(KNOWN.gutterFlush.app);
      // the cell that ends at the column: the figure itself, or the RETURN cell that holds it
      const cell = kids[kids.length - 2];
      const holds = (c: any): boolean => c === nd.n || (c?.children ?? []).some(holds);
      if (holds(cell)) {
        const cs = flat(cell.props.style);
        expect(cs.marginRight ?? 0).toBe(0); expect(cs.paddingRight ?? 0).toBe(0);
        edged += 1;
      } else {
        // a figure in the MARKET VALUE column: fixed 76 wide, then the 88-wide RETURN column, then the gutter
        expect(flat(nd.n.props.style).width).toBe(76);
        expect(flat(cell.props.style).width).toBe(88);
        columns += 1;
      }
    }
    // the guard proves it looked
    const floor: Record<string, number> = { A: 33, B: 9, C: 19, D: 19, E: 9, F: 9 };
    expect(edged + columns).toBeGreaterThanOrEqual(floor[k]);
    // "›" only in the column, and only on a holding that opens its own page; "✎" only on a record you entered (none drawn)
    const arrows = all.filter((nd) => nd.n.type === 'Text' && textOf(nd.n) === '›');
    for (const nd of arrows) expect(isGutter(nd.parent)).toBe(true);
    expect(arrows.length).toBe({ A: 3, B: 0, C: 2, D: 2, E: 0, F: 0 }[k]);
    expect(all.filter((nd) => nd.n.type === 'Text' && textOf(nd.n) === '✎').length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// DATA REALITY — the states as the app really has them, and the rules the drawing states for states it does not draw
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('DATA REALITY', () => {
  const linesOf = () => builtLines().map((l) => norm(l.t));
  // THE APP'S DAY ONE (gap c of the build brief): Home writes today's record on opening, so on the day an account is
  // linked its record already holds today. The day-one test read "no record at all" and the approved day-one lines
  // (DEC-6075) never showed. Now: every line is state C's, and the window bar is state D's with Since picked — the other
  // windows worked back from VTI's prices (DEC-5291), as the drawing's row 42 says ("picked, it reads as state C does").
  test('day one AS THE APP HAS IT (Home wrote today\'s record): state C\'s lines and day-one line (DEC-6075); the bar is state D\'s with Since picked', () => {
    renderState({ ...STATES[2], days: FID_TODAY });
    const notBar = (ls: Line[]) => ls.filter((l) => !l.g.startsWith('segbar')).map((l) => norm(l.t));
    expect(notBar(builtLines())).toEqual(notBar(DRAWN[2].lines));
    expect(screen.getByText('You linked this account today. Fidelity sent no past activity, so its figures start today.')).toBeOnTheScreen();
    expect(builtBar()).toEqual(asSegs('D').map((sg, i) => ({ ...sg, on: i === 0 })));
  });
  test('state D with "Since today" picked reads as state C, the window bar apart: the day-one line, no amber box, no worked-back note', () => {
    renderState(STATES[3]);
    pick('Since today');
    const notBar = (ls: Line[]) => ls.filter((l) => !l.g.startsWith('segbar')).map((l) => norm(l.t));
    expect(notBar(builtLines())).toEqual(notBar(DRAWN[2].lines));
  });
  test('an account added by hand today, with Home\'s record of today: its own day-one line (DEC-6075)', () => {
    const acct = { asset_id: 'gold', label: 'Gold coins', kind: 'gold', asset_class: 'alternatives', balance: 4_000, source: 'manual', value_as_of: TODAY };
    renderState({ key: 'X', account: acct, ledger: [], days: [typedDay('gold', TODAY, 4_000)], prices: {}, pick: 'SINCE' });
    expect(screen.getByText('You added this account today, so its figures start today.')).toBeOnTheScreen();
    expect(screen.getByText('THIS ACCOUNT · SINCE TODAY')).toBeOnTheScreen();
    expect(screen.getByText('Since today')).toBeOnTheScreen();
  });
  test('the account\'s OWN record: another account recorded for a year does not move state B\'s "Since" off Jun 2, 2026', () => {
    const other = { asset_id: 'chk', label: 'Checking', kind: 'checking', balance: 5_000, source: 'manual', value_as_of: '2025-01-02' };
    renderState({ ...STATES[1], others: [other], days: [typedDay('chk', '2025-01-02', 5_000), ...MUNI_DAYS] });
    expect(linesOf()).toEqual(DRAWN[1].lines.map((l) => norm(l.t)));
  });
  test('a linked account: no "Updated <date, time>" line; its age shows in the chip only once stale (row 7, DEC-0223)', () => {
    renderState(STATES[0]);
    expect(linesOf().some((l) => /^Updated /.test(l))).toBe(false);
    screen.unmount();
    renderState({ ...STATES[0], account: { ...VAN, last_synced: '2026-09-20T08:00:00Z' } });
    expect(screen.getByText('🔗 Linked · 10 days old')).toBeOnTheScreen();
    expect(linesOf().some((l) => /^Updated /.test(l))).toBe(false);
  });
  test('a balance never entered: Market value reads "Value not entered", Wealth generated and Return a dash (row 16, DEC-3657)', () => {
    renderState({ ...STATES[1], account: { ...MUNI, balance: undefined } });
    const ls = linesOf();
    expect(ls[ls.indexOf('Market value') + 1]).toBe('Value not entered');
    expect(ls[ls.indexOf('Wealth generated') + 1]).toBe('—');
    expect(ls[ls.indexOf('Return') + 1]).toBe('—');
    expect(ls.some((l) => /^\$0$/.test(l))).toBe(false);
    // before: Ending value $0, Wealth generated −$10,000, Return −100.00% and −100.00% on every window
    expect(ls.some((l) => /100\.00%/.test(l))).toBe(false);
    expect(builtBar().map((sg) => sg.v)).toEqual(['—', '—', '—', '—', '—']);
  });
  test('▾ closes a class with a tap and reads ▸; the rows come back with a second tap', () => {
    renderState(STATES[0]);
    fireEvent.press(screen.getByLabelText(/^Stocks \/ Funds, \$90,000/));
    expect(screen.queryByText('VOO')).toBeNull();
    expect(screen.getByText('▸ Stocks / Funds')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText(/^Stocks \/ Funds, \$90,000/));
    expect(screen.getByText('VOO')).toBeOnTheScreen();
  });
  test('the amber box\'s doors work: "Enter dividends yourself" opens this page\'s dividend recorder, "Sync now" syncs in place', async () => {
    renderState(STATES[3]);
    fireEvent.press(screen.getByLabelText('Enter dividends yourself'));
    expect(screen.getByLabelText('Record a dividend for Fidelity Brokerage')).toBeOnTheScreen();
    screen.unmount();
    renderState(STATES[3]);
    mockSync.mockClear();
    await fireEvent.press(screen.getByLabelText('Sync now. Updates this account now.'));
    expect(mockSync).toHaveBeenCalledWith({ force: true });
  });
  // ROW 18 (approved 2026-10-19, DEC-6457): "The page opens on the window picked on Performance; opened from Net worth, on Since."
  test('row 18 · opened from Net worth (no window handed over) the page opens on Since', () => {
    renderState({ ...STATES[3], opened: undefined });
    expect(builtBar()[0]).toEqual({ k: 'Since today', v: '—', on: true, no: false });
    expect(screen.getByText('THIS ACCOUNT · SINCE TODAY')).toBeOnTheScreen();
  });
  test('row 18 · opened from Performance with 1Y picked it opens on 1Y — state D, word for word', () => {
    renderState(STATES[3]);
    expect(builtBar().find((b) => b.on)!.k).toBe('1Y');
    expect(builtLines().map((l) => norm(l.t))).toEqual(DRAWN[3].lines.map((l) => norm(l.t)));
  });
  test('row 18 · a window this account cannot show opens on Since (state B handed 1Y; row 19), and so does a name the app does not have', () => {
    renderState({ ...STATES[1], opened: '1Y' });
    expect(builtLines().map((l) => norm(l.t))).toEqual(DRAWN[1].lines.map((l) => norm(l.t)));
    screen.unmount();
    renderState({ ...STATES[0], opened: '5Y' });
    expect(builtBar().find((b) => b.on)!.k).toBe('Since Oct 1, 2025');
    screen.unmount();
    renderState({ ...STATES[0], opened: '1M' });   // and a window it can show is the one it opens on
    expect(builtBar().find((b) => b.on)!.k).toBe('1M');
    expect(screen.getByText('THIS ACCOUNT · THE PAST MONTH')).toBeOnTheScreen();
  });
  test('row 18 · the Performance tab hands over its picked window when it opens an account\'s page', () => {
    const PerformanceScreen = require('../PerformanceScreen').default;
    useStore.getState().resetAll();
    mockParams = {};
    useStore.setState({ hideBalances: false, assetAccounts: [VAN], transactions: VAN_LEDGER, snapshotDays: VAN_DAYS,
      priceCache: { VOO, '49306SAB2': flat100, '91282CGM7': flat100 } } as any);
    render(<PerformanceScreen />);
    pick('1Y');
    mockPushes.length = 0;
    fireEvent.press(screen.getAllByLabelText(/this account’s own page|this account's own page/)[0]);
    expect(mockPushes).toEqual(['/account-detail?id=van&period=1Y']);
  });
  test('ACTIVITY names the picked window and lists its records; "See all activity" names where the list stops', () => {
    renderState(STATES[0]);
    pick('1M');
    expect(screen.getByText('ACTIVITY · THE PAST MONTH')).toBeOnTheScreen();
    expect(screen.getByText('3 records')).toBeOnTheScreen();
    expect(screen.getByText('12 more records below this date')).toBeOnTheScreen();
    expect(screen.getByText(/^See all activity \(older than Aug \d+, 2026\) ›$/)).toBeOnTheScreen();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// DEC-0281 · THE ONE VALUE RULE ON THIS PAGE (the drawing's rows 45 to 47, 2026-10-20)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('DEC-0281 · a bond\'s value, its price and what was paid (rows 45-47)', () => {
  const linesOf = () => builtLines().map((l) => norm(l.t));
  test('state F is the store\'s own writer output: no market value, nothing paid → the balance is the face value, marked so', () => {
    expect(TSY_FACE).toMatchObject({ balance: 10_000, value_basis: 'face', face_value: 10_000 });
    expect('amount_paid' in TSY_FACE).toBe(false);
  });
  // row 47: "Where what was paid is the value shown, the same line says the value shown is what you paid (not a drawn state)"
  test('what was paid and no market value: state F word for word, with $9,700 for $10,000 where the value is shown, the line saying what you paid, and a What you paid row', () => {
    const paidOnly = settleBondValue({ ...TSY_NO_VALUE, amount_paid: 9_700 } as any, { ...TSY_NO_VALUE, amount_paid: 9_700 } as any);
    expect(paidOnly).toMatchObject({ balance: 9_700, value_basis: 'paid' });
    renderState({ ...STATES[5], account: paidOnly, days: [typedDay('tsy30', '2026-06-02', 9_700)] });
    const expected: string[] = [];
    for (const l of DRAWN[5].lines) {
      const t = norm(l.t);
      const factsCard = DRAWN[5].lines.find((x) => x.t === 'BOND FACTS')!.g;
      if (t === 'The value shown is the face value — no market value entered.') { expected.push('The value shown is what you paid — no market value entered.'); continue; }
      if (t === 'HOW $10,000 BECAME $10,000 · THIS ACCOUNT') { expected.push('HOW $9,700 BECAME $9,700 · THIS ACCOUNT'); continue; }
      if (t === '$10,000' && l.g !== factsCard) { expected.push('$9,700'); continue; }
      expected.push(t);
      if (t === '$10,000' && l.g === factsCard) expected.push('What you paid', '$9,700');   // under Face value, as row 46 draws it
    }
    expect(linesOf()).toEqual(expected);
  });
  test('the line under the summary sits in the summary card, in the note\'s own style (11, tertiary, 16 high)', () => {
    renderState(STATES[5]);
    expect(builtLines().find((l) => l.t === 'The value shown is the face value — no market value entered.')!.g).toBe('card#1');
    expect(styleOf('The value shown is the face value — no market value entered.')).toMatchObject({ fontSize: 11, color: Colors.textTertiary, lineHeight: 16 });
  });
  test('Price and What you paid are BOND FACTS rows like Face value: 15 secondary labels, 15/700 figures on the right', () => {
    renderState(STATES[4]);
    for (const label of ['Price', 'What you paid']) expect(styleOf(label)).toMatchObject({ fontSize: 15, color: Colors.textSecondary });
    for (const figure of ['$98.50 per $100 of face', '$9,700']) expect(styleOf(figure)).toMatchObject({ fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' });
  });
  test('Price shows only with a market value AND a face value: none on state F (face value only), none with no face', () => {
    renderState(STATES[5]);
    expect(linesOf()).not.toContain('Price');
    screen.unmount();
    renderState({ ...STATES[1], account: { ...MUNI, face_value: undefined } });
    expect(linesOf()).not.toContain('Price');
    expect(linesOf()).toContain('Face value');   // the card stands, reading not entered (DEC-2748b)
  });
  test('a typed 0 paid is $0, not "not entered" (DEC-2748b); nothing typed shows no row', () => {
    renderState({ ...STATES[4], account: { ...TSY, amount_paid: 0 } });
    const ls = linesOf();
    expect(ls[ls.indexOf('What you paid') + 1]).toBe('$0');
    screen.unmount();
    renderState(STATES[1]);
    expect(linesOf()).not.toContain('What you paid');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIGURES OF EACH STATE (DEC-6212, DEC-6323, DEC-6412) — kept from the drawing's runs of 2026-10-19
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function strings(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const s = n.replace(/\s+/g, ' ').trim(); if (s) out.push(s); return; }
    if (n.props?.accessibilityLabel) out.push(`@${String(n.props.accessibilityLabel)}`);
    (Array.isArray(n.children) ? n.children : []).forEach(walk);
  };
  const tree = screen.toJSON();
  (Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return out;
}

type Seg = { k: string; v: string; on: boolean; no: boolean };
/** The window bar as the built screen draws it: each button's name, its figure, picked or not, greyed or not. */
function builtBar(): Seg[] {
  return screen.getAllByRole('button')
    .filter((b) => /^Show /.test(String(b.props.accessibilityLabel ?? '')))
    .map((b) => {
      const texts = (b.children as any[]).flatMap(function flatT(c: any): string[] {
        return typeof c === 'string' ? [c] : (c?.children ?? []).flatMap(flatT);
      });
      return { k: texts[0], v: texts[1], on: !!b.props.accessibilityState?.selected, no: !!b.props.accessibilityState?.disabled };
    });
}
/** The window bar of each state as the drawing draws it, in the order A to F. */
function drawnBars(): Seg[][] {
  return [...HTML.matchAll(/<div class="segbar">([\s\S]*?)<\/div>/g)].map((m) =>
    [...m[1].matchAll(/<span class="(sg[^"]*)"><span class="k">([^<]*)<\/span><span class="v">([^<]*)<\/span><\/span>/g)]
      .map((x) => ({ k: x[2], v: x[3], on: /\bon\b/.test(x[1]), no: /\bno\b/.test(x[1]) })));
}
/** The trio's Return, as printed. */
const trioReturn = (lines: string[]) => lines[lines.indexOf('Return') + 1];

/** Every button of every state, as the app prints it on Sep 30, 2026 with that state's data. */
const BARS: Record<string, [string, string, 'on' | 'no' | ''][]> = {
  // 1Y and 2Y open before the record's first day (Oct 1, 2025), so they are JOINED there (DEC-6412, 2026-10-19): the days
  // before it worked back from VOO's prices, then the record's own +8.26%. Before (DEC-5291, worked back whole): +7.12%, +9.57%
  A: [['Since Oct 1, 2025', '+8.26%', 'on'], ['1M', '+1.00%', ''], ['This year', '+1.89%', ''], ['1Y', '+8.26%', ''], ['2Y', '+10.87%', '']],
  B: [['Since Jun 2, 2026', '+1.50%', 'on'], ['1M', '+1.50%', ''], ['This year', '—', 'no'], ['1Y', '—', 'no'], ['2Y', '—', 'no']],
  C: [['Since today', '—', 'on'], ['1M', '—', 'no'], ['This year', '—', 'no'], ['1Y', '—', 'no'], ['2Y', '—', 'no']],
  // Since today is never greyed (2026-10-19): state C draws it picked with a dash, state D at rest with a dash, and it can be picked
  D: [['Since today', '—', ''], ['1M', '+2.46%', ''], ['This year', '+5.93%', ''], ['1Y', '+10.00%', 'on'], ['2Y', '+11.79%', '']],
  E: [['Since Jun 2, 2026', '+0.00%', 'on'], ['1M', '+0.00%', ''], ['This year', '—', 'no'], ['1Y', '—', 'no'], ['2Y', '—', 'no']],
  F: [['Since Jun 2, 2026', '+0.00%', 'on'], ['1M', '+0.00%', ''], ['This year', '—', 'no'], ['1Y', '—', 'no'], ['2Y', '—', 'no']],
};
const asSegs = (k: string): Seg[] => BARS[k].map(([kk, v, st]) => ({ k: kk, v, on: st === 'on', no: st === 'no' }));

describe('the window bar of every state is the app\'s own figure (DEC-6212)', () => {
  const drawn = drawnBars();
  test('the drawing has six bars, five buttons each, and each state\'s summary Return is its picked button', () => {
    expect(drawn.length).toBe(6);
    drawn.forEach((b) => expect(b.length).toBe(5));
    const trio = [...HTML.matchAll(/<div class="tl">Return<\/div><div class="tv[^"]*">([^<]*)</g)].map((m) => m[1]);
    expect(trio).toEqual(drawn.map((b) => b.find((x) => x.on)!.v));
  });
  test.each(STATES.map((st, i) => [st.key, st, i] as const))('state %s: built bar = the figures above = the drawing\'s bar, and the picked button = the summary Return', (k, st, i) => {
    renderState(st);
    const built = builtBar();
    expect(built).toEqual(asSegs(k));
    expect(drawn[i]).toEqual(asSegs(k));
    const picked = built.find((b) => b.on)!;
    expect(trioReturn(strings())).toBe(picked.v);
  });
  // state C is drawn on Home's record of today; with no record at all the bar reads the same
  test('state C with no record at all: the same bar', () => {
    renderState({ ...STATES[2], days: [] });
    expect(builtBar()).toEqual(asSegs('C'));
  });
});

describe('state A, Bonds & CDs: price change plus interest (DEC-6212)', () => {
  test('KeyBank CD +2.00%, US Treasury 2028 +2.13%, the bar +2.06%; the Total stays +8.26%; each line shows face, coupon and YTM', () => {
    renderState(STATES[0]);
    const lines = strings();
    // DEC-6323 (owner, 2026-10-19: "Line under a bond - new line missing maturity date."): the maturity date is the line's fourth part
    expect(lines).toContain('@KeyBank CD, $5,000 face · 4.00% · YTM 4.00% · matures Mar 31, 2027, $5,000, return +2.00%, $100 interest. Opens its page.');
    expect(lines).toContain('@US Treasury 2028, $4,000 face · 4.25% · YTM 4.23% · matures Feb 15, 2028, $4,000, return +2.13%, $85 interest. Opens its page.');
    expect(lines).toContain('$5,000 face · 4.00% · YTM 4.00% · matures Mar 31, 2027');
    expect(lines).toContain('@Bonds & CDs, $9,000, return +2.06%');
    expect(lines).toContain('@Total, $101,000, return +8.26%');
    // the name, then its shares and price beneath it (drawing v01: "VOO", "160 shares · $562.50")
    expect(lines).toContain('@VOO, 160 shares · $562.50, $90,000, return +7.67%, $1,500 dividends. Opens its page.');
  });
  test('states C and D: a Treasury with a face value, a maturity date and no rate shows those two; no price history, no return', () => {
    renderState(STATES[3]);
    expect(strings()).toContain('@Treasury 2031, $10,000 face · matures Nov 15, 2031, $10,000, return —. Opens its page.');
    screen.unmount();
    renderState(STATES[2]);
    expect(strings()).toContain('@Treasury 2031, $10,000 face · matures Nov 15, 2031, $10,000, return —. Opens its page.');
  });
});

describe('DEC-6323 · the maturity date on the line under a bond\'s name', () => {
  const withKcd = (extra: any): State => ({ ...STATES[0], account: { ...VAN, positions: VAN.positions.map((q: any) => q.position_id === 'kcd' ? { ...q, ...extra } : q) } });
  test('a matured CD says it matured, the matured banner\'s word, and has no yield to maturity', () => {
    renderState(withKcd({ maturity_date: '2026-09-15' }));
    expect(strings()).toContain('$5,000 face · 4.00% · matured Sep 15, 2026');
  });
  // with no known date there are no years left, so the yield to maturity is not known either (approxYTM) — both are left out
  test('a maturity date not known — missing, or not a real day — is left out', () => {
    renderState(withKcd({ maturity_date: undefined }));
    expect(strings()).toContain('$5,000 face · 4.00%');
    screen.unmount();
    renderState(withKcd({ maturity_date: '2027-02-30' }));
    expect(strings()).toContain('$5,000 face · 4.00%');
  });
});

describe('a record that begins today: the Since window reads one way whichever window is picked (2026-10-19)', () => {
  test('state D: Since today is not greyed, can be picked, and then reads as state C does — picked, a dash', () => {
    renderState(STATES[3]);
    const since = () => builtBar()[0];
    expect(since()).toEqual({ k: 'Since today', v: '—', on: false, no: false });
    pick('Since today');
    expect(since()).toEqual({ k: 'Since today', v: '—', on: true, no: false });
    expect(trioReturn(strings())).toBe('—');
    screen.unmount();
    renderState(STATES[2]);
    expect(builtBar()[0]).toEqual({ k: 'Since today', v: '—', on: true, no: false });
  });
  test('at rest with no figure, its name and dash are in the resting colours, not the greys of a window that cannot be picked', () => {
    renderState(STATES[3]);
    const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Show Since today'))!;
    const [name, dash] = (btn.children as any[]).flatMap(function f(c: any): any[] { return c?.type === 'Text' ? [c] : (c?.children ?? []).flatMap(f); });
    expect(flat(name.props.style).color).toBe(Colors.textTertiary);
    expect(flat(dash.props.style).color).toBe(Colors.textPrimary);
    const y1 = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Show 1Y'))!;
    expect(y1.props.accessibilityState).toMatchObject({ selected: true });
  });
});

describe('DEC-6412 · a window that opens before the record begins is joined at its first day (2026-10-19)', () => {
  test('state A, 1Y picked: Return +8.26%, the Since walk, and the line saying only the days before Oct 1, 2025 are worked back', () => {
    renderState({ ...STATES[0], pick: '1Y' });
    const lines = strings();
    expect(trioReturn(lines)).toBe('+8.26%');
    expect(lines).toContain('Your daily record begins Oct 1, 2025, so the days before it are worked back from each holding\'s price history.');
    expect(lines.some((l) => /Rebuilt from/.test(l))).toBe(false);   // the record does not reach the window's beginning
    expect(lines.some((l) => /has no price history/.test(l))).toBe(false);   // the bonds had no part in those days
  });
});
