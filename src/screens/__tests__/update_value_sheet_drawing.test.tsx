/** THE UPDATE VALUE SHEET AGAINST ITS DRAWING, WORD FOR WORD, STATE BY STATE.
 *
 *  The drawing: MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_update-value-sheet_v02.html (v02, 2026-10-22: the
 *  sheet's title names the account as the page does — Ally Savings, where v01 drew Savings; v01 is in archive/) — eight
 *  states, A to H, on one phone (DEC-0470: every state of updating a value by hand is drawn). It draws the sheet that
 *  changes the value of an account built by hand (src/screens/AccountPortfolioScreen.tsx, UpdateValueSheet) over the
 *  account page, and the page around the three buttons that open it. The page's own design is the approved account-page
 *  drawing v01 (DEC-6457), held by account_page_drawing_states.test.tsx; this file holds only this drawing.
 *
 *  Method, the mock-match standing order (docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md):
 *   1. every visible line of each state of the drawing, in order, is read out of the file, and marked as on the page or
 *      on the sheet. The phone's own parts are the drawing's, not the app's, and are left out: the orange state labels,
 *      the status bar, the number keyboard and the typing cursor;
 *   2. the REAL screen is rendered with that state's account on the drawing's day (Sep 30, 2026), the state's buttons are
 *      pressed and its amount typed, and every visible line is read off the rendered tree, in order — each Text with
 *      what is nested in it, and the amount field as what it shows (the figure entered, or its grey 0 when empty);
 *   3. the lists must be the same. A state drawn as the whole page: the drawing's lines ARE the page's lines. A state
 *      drawn with the sheet up: the sheet's lines are the sheet's, and the page lines drawn above the sheet are the
 *      page's FIRST lines, in order, then — where the sheet's top edge crosses a row of the page — only that row's lines
 *      that sit above the edge (the summary's three labels; their figures are under it). Nothing else of the page is
 *      drawn: the rest is under the sheet and the keyboard;
 *   4. what a text diff cannot see: every line's size, weight and colour against the rendered style, the theme tokens,
 *      and the dark-green bars (square corners, edge to edge).
 *
 *  TWO READINGS, NOT DIFFERENCES — the only ones:
 *   · the top bar's icons: the drawing draws them as glyphs ("Money"+"Keel", "◉", "⚙"); the app draws the wordmark
 *     image and two icon buttons. Both are read as [wordmark MoneyKeel], [icon Hide balances], [icon Settings].
 *   · the save button's opacity: the code sets 40% exactly when the button is disabled (an amount of 0 or less). On the
 *     phone TouchableOpacity fades to that style on the native side, which a test render cannot run, so the rendered
 *     tree keeps the opacity the sheet mounted with (40%: the amount is empty for one render before it is filled). The
 *     opacity is therefore read through the disabled flag: 40% when disabled, full otherwise.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

const TODAY = '2026-09-30';
/** A hand-entered account's recorded day: the value entered. */
const typedDay = (id: string, date: string, value: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: 0, typedValue: value, currency: 'USD' }],
});

// ── the three accounts built by hand, and the one with no value date ─────────────────────────────────────────────
/** Ally, named Savings: a cash account entered Sep 1, 2026 at $12,400 */
const SAVINGS = { asset_id: 'sav', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-09-01' };
/** Muni 2029: the account-page drawing v01's state B — a bond entered Jun 2, 2026 at $10,000, updated Sep 1 to $10,150 */
const MUNI = { asset_id: 'muni', label: 'Muni 2029', kind: 'fixed_income', asset_class: 'bonds', balance: 10_150, face_value: 10_000, maturity_date: '2029-06-01', source: 'manual', value_as_of: '2026-09-01' };
/** Gold coins: an alternative entered Feb 14, 2026 at $8,000 — 7 months old on Sep 30 */
const GOLD = { asset_id: 'gold', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 8_000, source: 'manual', value_as_of: '2026-02-14' };
/** Chase, named Checking: an account from before value dates were kept — no source, no value date */
const CHECKING = { asset_id: 'chk', label: 'Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 3_200 };

const UPDATE_BUTTON = "Update this account's value";            // the button under the walk
const UPDATE_IN_BOX = 'Update the value';                       // the button in the age box
const STILL_RIGHT = 'Still right — keep the amount and re-stamp today';
const FIELD = 'Current value';
const SAVE = 'Save the updated value';

type Step = ['press', string] | ['type', string, string];
type State = { key: string; account: any; days: [string, number][]; steps: Step[]; sheet: boolean };
const STATES: State[] = [
  { key: 'A', account: SAVINGS, days: [['2026-09-01', 12_400]], steps: [['press', UPDATE_BUTTON]], sheet: true },
  { key: 'B', account: MUNI, days: [['2026-06-02', 10_000], ['2026-09-01', 10_150]], steps: [['press', UPDATE_BUTTON]], sheet: true },
  { key: 'C', account: MUNI, days: [['2026-06-02', 10_000], ['2026-09-01', 10_150]], steps: [['press', UPDATE_BUTTON], ['type', FIELD, '']], sheet: true },
  { key: 'D', account: GOLD, days: [['2026-02-14', 8_000]], steps: [], sheet: false },
  { key: 'E', account: GOLD, days: [['2026-02-14', 8_000]], steps: [['press', STILL_RIGHT]], sheet: false },
  { key: 'F', account: GOLD, days: [['2026-02-14', 8_000]], steps: [['press', UPDATE_IN_BOX]], sheet: true },
  { key: 'G', account: GOLD, days: [['2026-02-14', 8_000]], steps: [['press', UPDATE_IN_BOX], ['type', FIELD, '8400'], ['press', SAVE]], sheet: false },
  { key: 'H', account: CHECKING, days: [['2026-06-02', 3_200]], steps: [], sheet: false },
];

function renderState(st: State) {
  useStore.getState().resetAll();
  mockParams = { id: st.account.asset_id };
  useStore.setState({ hideBalances: false, assetAccounts: [{ ...st.account }], transactions: [],
    snapshotDays: st.days.map(([d, v]) => typedDay(st.account.asset_id, d, v)), priceCache: {} } as any);
  render(<AccountPortfolioScreen />);
  for (const step of st.steps) {
    if (step[0] === 'press') fireEvent.press(screen.getByLabelText(step[1]));
    else fireEvent.changeText(screen.getByLabelText(step[1]), step[2]);
  }
}

beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// READING THE DRAWING
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const DRAWING = path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_update-value-sheet_v02.html');
const HTML = fs.readFileSync(DRAWING, 'utf8');
/** One line a person reads: its words, whether it is on the sheet, and the size, weight and colour it is drawn in. */
type Line = { t: string; sheet: boolean; size?: number; weight?: string; color?: string; opacity?: number; row?: number };
const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const ROOT_TOKENS: Record<string, string> = Object.fromEntries(
  [...(/:root\{([^}]*)\}/.exec(HTML)?.[1] ?? '').matchAll(/--([A-Za-z0-9_]+):([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const colourOf = (v?: string) => {
  if (!v) return undefined;
  const m = /^var\(--([A-Za-z0-9_]+)\)$/.exec(v.trim());
  return (m ? ROOT_TOKENS[m[1]] : v.trim()).toUpperCase();
};
const cssOf = (attrs: string): Record<string, string> => {
  const st = /style="([^"]*)"/.exec(attrs)?.[1] ?? '';
  return Object.fromEntries(st.split(';').map((d) => d.split(':')).filter((x) => x.length >= 2).map(([k, ...v]) => [k.trim(), v.join(':').trim()]));
};
const SKIP = new Set(['sbar', 'kbd', 'caret', 'state']);   // the phone's own parts: not the app's words

function drawnStates(): { key: string; label: string; lines: Line[] }[] {
  const a = HTML.indexOf('<div class="phone">');
  const b = HTML.indexOf('<div class="side">');
  const phone = HTML.slice(a, b);
  const out: { key: string; label: string; lines: Line[] }[] = [];
  type El = { tag: string; cls: string[]; css: Record<string, string> };
  const stack: El[] = [];
  let cur: { line: Line; depth: number; inner?: Record<string, string> } | null = null;
  let label: string | null = null;
  for (const m of phone.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi)) {
    if (m[4] != null) {
      const text = decode(m[4]);
      if (label != null) { label += text; continue; }
      if (stack.some((e) => e.cls.some((c) => SKIP.has(c)))) continue;
      const top = stack[stack.length - 1];
      if (top?.cls.includes('ico')) {
        const st = out[out.length - 1];
        st.lines.push({ t: text.trim() === '◉' ? '[icon Hide balances]' : '[icon Settings]', sheet: false });
        continue;
      }
      if (stack.some((e) => e.cls.includes('wm'))) {
        if (text === 'Money') out[out.length - 1].lines.push({ t: '[wordmark MoneyKeel]', sheet: false });
        continue;
      }
      if (cur) cur.line.t += text;
      continue;
    }
    const [, close, tag, attrs] = m;
    if (close) {
      const el = stack.pop();
      if (el?.cls.includes('state')) {
        const t = clean(label ?? '');
        out.push({ key: t.charAt(6), label: t, lines: [] });
        label = null;
      }
      if (cur && stack.length === cur.depth) {
        cur.line.t = clean(cur.line.t);
        if (cur.line.t) out[out.length - 1].lines.push(cur.line);
        cur = null;
      }
      continue;
    }
    const cls = (/class="([^"]*)"/.exec(attrs)?.[1] ?? '').split(/\s+/).filter(Boolean);
    const css = cssOf(attrs);
    const el: El = { tag, cls, css };
    if (cls.includes('state')) { label = ''; stack.push(el); continue; }
    // a line starts at the outermost Text, or at the amount field
    if (!cur && (cls.includes('t') || cls.includes('in')) && !stack.some((e) => e.cls.some((c) => SKIP.has(c)))) {
      const sheet = stack.some((e) => e.cls.includes('modal'));
      const button = [...stack].reverse().find((e) => e.css.opacity != null || e.css['min-height'] === '48px');
      cur = { depth: stack.length, line: { t: '', sheet,
        size: css['font-size'] ? parseFloat(css['font-size']) : undefined, weight: css['font-weight'], color: colourOf(css.color),
        opacity: button?.css.opacity != null ? parseFloat(button.css.opacity) : undefined } };
    } else if (cur && stack.length > cur.depth && stack[cur.depth]?.cls.includes('in') && cls.includes('t') && css.color) {
      cur.line.color = colourOf(css.color);   // the empty field's grey 0 is drawn in the placeholder's colour
    }
    stack.push(el);
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// READING THE SCREEN
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
const ICON_BUTTONS = new Set(['Hide balances', 'Show balances', 'Settings']);
const PUA = /^[-\s]+$/;   // an icon-font glyph is not a word
const hex = (c: any) => (c == null ? undefined : String(c).toUpperCase());

function builtLines(): Line[] {
  const out: Line[] = [];
  let rows = 0;
  /** `row`: the nearest view that lays its children side by side — the line's row on the screen */
  const walk = (n: any, sheet: boolean, opacity?: number, row?: number) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, sheet, opacity, row)); return; }
    const p = n.props ?? {};
    if (n.type === 'Modal') { (n.children ?? []).forEach((c: any) => walk(c, true, opacity, row)); return; }
    if (n.type === 'Text') {
      const t = clean(textOf(n));
      const st = flat(p.style);
      if (t && !PUA.test(t)) out.push({ t, sheet, size: st.fontSize, weight: st.fontWeight, color: hex(st.color), opacity, row });
      return;
    }
    if (n.type === 'TextInput') {
      const st = flat(p.style);
      out.push({ t: clean(String(p.value || p.placeholder || '')), sheet, size: st.fontSize, weight: st.fontWeight,
        color: hex(p.value ? st.color : p.placeholderTextColor), opacity, row });
      return;
    }
    if (n.type === 'Image' && p.accessibilityLabel === 'MoneyKeel') { out.push({ t: '[wordmark MoneyKeel]', sheet }); return; }
    if (p.accessibilityRole === 'button' && ICON_BUTTONS.has(p.accessibilityLabel)) { out.push({ t: `[icon ${p.accessibilityLabel}]`, sheet }); return; }
    // the save button: its opacity by the code's own rule (the header's second reading)
    const op = p.accessibilityLabel === SAVE ? (p.accessibilityState?.disabled ? 0.4 : 1) : opacity;
    const r = flat(p.style).flexDirection === 'row' ? ++rows : row;
    (n.children ?? []).forEach((c: any) => walk(c, sheet, op, r));
  };
  walk(screen.toJSON(), false);
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
  return { identical, line: `${identical} of ${n} identical; ${different} different; ${missing} missing; ${extra} extra` };
}
const firstDifference = (drawn: string[], built: string[]): string | null => {
  for (let k = 0; k < Math.max(drawn.length, built.length); k++) {
    if (drawn[k] !== built[k]) return `line ${k + 1}: the drawing reads «${drawn[k] ?? '(nothing)'}», the screen reads «${built[k] ?? '(nothing)'}»`;
  }
  return null;
};

/** THE PAGE ABOVE THE SHEET, matched line by line: the page's first lines in order; then, from the one row the sheet's
 *  top edge crosses, its lines that are drawn, in order; nothing after that row. Returns each drawn line's rendered line
 *  (null where it has none) and the plain account of what was matched. */
function pageAboveSheet(dPage: string[], bPage: Line[]) {
  let c = 0;
  while (c < dPage.length && c < bPage.length && dPage[c] === bPage[c].t) c++;
  const matched: (Line | null)[] = bPage.slice(0, c);
  const cutRow = bPage[c]?.row;
  const rowLines = cutRow == null ? [] : bPage.slice(c).filter((l) => l.row === cutRow);
  let j = 0;
  for (const t of dPage.slice(c)) {
    while (j < rowLines.length && rowLines[j].t !== t) j++;
    matched.push(j < rowLines.length ? rowLines[j++] : null);
  }
  const identical = matched.filter(Boolean).length;
  const fromRow = dPage.length - c;
  return { matched, identical, c, fromRow, rowSize: rowLines.length,
    line: `${identical} of ${dPage.length} identical — the page's first ${c} lines, then ${fromRow} of the ${rowLines.length} lines left in the row the sheet's top edge crosses; the page's other ${bPage.length - c - fromRow} lines are under the sheet` };
}

const DRAWN = drawnStates();
const REPORT: Record<string, string> = {};

describe('the drawing, read (a guard must prove it looked)', () => {
  test('eight states, A to H; each starts at the top bar; a sheet state has its sheet, a page state none', () => {
    expect(DRAWN.map((d) => d.key)).toEqual(STATES.map((s) => s.key));
    for (const [i, d] of DRAWN.entries()) {
      expect(d.lines.slice(0, 4).map((l) => l.t)).toEqual(['‹ Back', '[wordmark MoneyKeel]', '[icon Hide balances]', '[icon Settings]']);
      const sheet = d.lines.filter((l) => l.sheet);
      const page = d.lines.filter((l) => !l.sheet);
      if (STATES[i].sheet) {
        expect(sheet.length).toBe(5);                      // title, $, the amount, the date line, the save button
        expect(page.length).toBeGreaterThanOrEqual(20);    // the top of the page shows above the sheet
      } else {
        expect(sheet.length).toBe(0);
        expect(page.length).toBeGreaterThanOrEqual(55);
      }
    }
  });
  test('the drawing\'s colours are the app\'s tokens, name for name (its :root is src/utils/theme.ts Colors)', () => {
    const names = Object.keys(Colors);
    expect(names.length).toBeGreaterThanOrEqual(30);
    for (const k of names) expect(`${k} ${ROOT_TOKENS[k]?.toUpperCase()}`).toBe(`${k} ${(Colors as any)[k].toUpperCase()}`);
  });
  test('every dark-green bar runs edge to edge with square corners (founder standard, 2026-08-11 and 2026-09-14)', () => {
    const bars = [...HTML.matchAll(/style="([^"]*background:var\(--primaryDeep\)[^"]*)"/g)].map((m) => m[1])
      .filter((s) => !/min-height:44px/.test(s));   // a filled door is a button, not a bar
    expect(bars.length).toBe(16);                   // 3 on each of the 4 pages, 1 above each of the 4 sheets
    for (const b of bars) {
      expect(b).toMatch(/border-radius:0px/);
      expect(b).toMatch(/margin-left:-12px/);       // the card's own 12 of padding, taken back on both sides
      expect(b).toMatch(/margin-right:-12px/);
    }
  });
});

describe('WORD FOR WORD, IN ORDER: every line of each state of the drawing is the screen\'s, and nothing else is', () => {
  afterAll(() => {
    const text = Object.entries(REPORT).map(([k, v]) => `state ${k}: ${v}`).join('\n');
    // eslint-disable-next-line no-console
    console.log(`\nUPDATE VALUE SHEET vs its drawing v01\n${text}\n`);
    try { fs.writeFileSync(path.join(require('os').tmpdir(), 'update-value-sheet-coverage.txt'), text); } catch { /* a convenience */ }
  });
  test.each(STATES.map((st, i) => [st.key, st, i] as const))('state %s', (k, st, i) => {
    renderState(st);
    const built = builtLines();
    const drawn = DRAWN[i].lines;
    const dSheet = drawn.filter((l) => l.sheet).map((l) => l.t);
    const bSheet = built.filter((l) => l.sheet).map((l) => l.t);
    const dPage = drawn.filter((l) => !l.sheet).map((l) => l.t);
    const bPage = built.filter((l) => !l.sheet).map((l) => l.t);
    expect(bSheet.length > 0).toBe(st.sheet);
    if (st.sheet) {
      const s = coverage(dSheet, bSheet);
      const pg = pageAboveSheet(dPage, built.filter((l) => !l.sheet));
      REPORT[k] = `sheet ${s.line} · page above the sheet ${pg.line}`;
      const diff = firstDifference(dSheet, bSheet)
        ?? (pg.identical < dPage.length ? `the page line «${dPage[pg.matched.indexOf(null)]}» is not where the page has it` : null);
      if (diff) throw new Error(`state ${k}: ${REPORT[k]}\n  first difference — ${diff}`);
      expect(pg.c).toBeGreaterThanOrEqual(20);          // the guard looked: the top of the page is drawn above the sheet
      expect(pg.fromRow).toBeLessThan(pg.rowSize);      // and part of the crossed row is under it
    } else {
      const pg = coverage(dPage, bPage);
      REPORT[k] = `page ${pg.line}`;
      const diff = firstDifference(dPage, bPage);
      if (diff) throw new Error(`state ${k}: ${REPORT[k]}\n  first difference — ${diff}`);
    }
  });
});

describe('APPEARANCE: every line\'s size, weight and colour as rendered, against the drawing', () => {
  test.each(STATES.map((st, i) => [st.key, st, i] as const))('state %s', (k, st, i) => {
    renderState(st);
    const built = builtLines();
    const drawn = DRAWN[i].lines;
    const dPage = drawn.filter((l) => !l.sheet);
    const bPage = built.filter((b) => !b.sheet);
    const pageMatch = st.sheet ? pageAboveSheet(dPage.map((l) => l.t), bPage).matched : bPage;
    const pairs = [...drawn.filter((l) => l.sheet).map((l, j) => [l, built.filter((b) => b.sheet)[j]] as const),
      ...dPage.map((l, j) => [l, pageMatch[j]] as const)];
    let looked = 0;
    for (const [d, b] of pairs) {
      if (d.t.startsWith('[')) continue;    // the wordmark and the two icons are drawn, not typeset
      const see = (x: Line | null | undefined) => (x ? `${x.t} · ${x.size} · ${x.weight ?? '400'} · ${x.color}` : '(no rendered line)');
      expect(see(d)).toBe(see(b));
      looked++;
    }
    expect(looked).toBeGreaterThanOrEqual(st.sheet ? 20 : 50);
  });
  test('the sheet: its title, amount and button, as rendered (the save button 40% only when it cannot be pressed)', () => {
    for (const [i, st] of STATES.entries()) {
      if (!st.sheet) continue;
      renderState(st);
      const sheet = builtLines().filter((l) => l.sheet);
      const drawnSheet = DRAWN[i].lines.filter((l) => l.sheet);
      expect(sheet[0]).toMatchObject({ size: 17, weight: '800', color: hex(Colors.textPrimary) });          // the title
      expect(sheet[1]).toMatchObject({ t: '$', size: 30, weight: '800', color: hex(Colors.textSecondary) });
      expect(sheet[2]).toMatchObject({ size: 38, weight: '800' });                                          // the amount
      expect(sheet[4]).toMatchObject({ t: 'Save value', size: 15, weight: '800', color: hex(Colors.white) });
      const disabled = st.key === 'C';
      expect(sheet[4].opacity).toBe(disabled ? 0.4 : 1);
      expect(drawnSheet[4].opacity ?? 1).toBe(disabled ? 0.4 : 1);
    }
  });
});
