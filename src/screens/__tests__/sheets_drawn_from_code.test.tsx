/** THE FIVE SHEETS AGAINST THEIR DRAWINGS, WORD FOR WORD, STATE BY STATE (2026-10-22, gap 24 of the Performance launch audit).
 *
 *  Five sheets had no drawing (DEC-0470: every state is drawn). Each is now drawn from the code, approval pending, in
 *  MoneyKeel/documents/networth-and-performance/:
 *    moneykeel_pres_mock_trade-sheet_v02.html ............ the trade sheet, 12 states (Record activity)
 *    moneykeel_pres_mock_holding-editor_v02.html ......... the holding editor, 9 states (Edit holding)
 *    moneykeel_pres_mock_activity-sheet_v01.html ......... the activity sheet, 2 states
 *    moneykeel_pres_mock_record-activity-sheet_v01.html .. the account page's recorder, 9 states
 *    moneykeel_pres_mock_edit-record-sheet_v02.html ...... the edit sheet for a record you entered, 3 states
 *  Each state — its accounts, records, prices, page and taps — is src/testing/sheetStates.tsx, the one list the drawing
 *  was drawn from, so the drawing and this test cannot be of two different states.
 *
 *  Method, the mock-match standing order (docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md):
 *   1. every visible line of each state of the drawing, in order, is read out of the file and marked as on the sheet or on
 *      the page under it. The phone's own parts are left out: the orange state labels, the status bar, the dimmed strip;
 *   2. the REAL page is rendered with that state's data on Sep 30, 2026, the state's taps are made, and every visible line
 *      is read off the rendered tree, in order;
 *   3. the sheet's lines must be the same list as the drawing's; the page's lines drawn under the sheet must be the page's
 *      first lines, in order (the page is drawn to its first card — its design is its own drawing);
 *   4. what a text diff cannot see: every line's size, weight and colour, the faded button that waits, the theme tokens,
 *      and the dark-green bar (square, edge to edge).
 *  TWO READINGS, NOT DIFFERENCES: the top bar's wordmark and two icons are drawn as glyphs and read as [wordmark MoneyKeel],
 *  [icon Hide balances], [icon Settings]; a faded button is read by the code's own rule (it fades to 40% when it cannot be pressed).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { SHEETS, SHEET_DAY, type Sheet, type SheetState } from '../../testing/sheetStates';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${SHEET_DAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

const DIR = path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance');
type Line = { t: string; sheet: boolean; size?: number; weight?: string; color?: string; opacity: number };
const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const norm = (c?: string) => (c == null ? undefined : String(c).replace(/\s+/g, '').toUpperCase());
const SKIP = new Set(['sbar', 'state', 'peek']);   // the phone's own parts, not the app's

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// READING A DRAWING
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function readDrawing(file: string) {
  const html = fs.readFileSync(path.join(DIR, file), 'utf8');
  const root: Record<string, string> = Object.fromEntries([...(/:root\{([^}]*)\}/.exec(html)?.[1] ?? '').matchAll(/--([A-Za-z0-9_]+):([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
  const colour = (v?: string) => { if (!v) return undefined; const m = /^var\(--([A-Za-z0-9_]+)\)$/.exec(v.trim()); return norm(m ? root[m[1]] : v); };
  const cssOf = (attrs: string): Record<string, string> => {
    const st = decode(/style="([^"]*)"/.exec(attrs)?.[1] ?? '');
    return Object.fromEntries(st.split(';').map((d) => d.split(':')).filter((x) => x.length >= 2).map(([k, ...v]) => [k.trim(), v.join(':').trim()]));
  };
  const phone = html.slice(html.indexOf('<div class="phone">'), html.indexOf('<div class="side">'));
  const states: { key: string; label: string; lines: Line[] }[] = [];
  type El = { cls: string[]; css: Record<string, string> };
  const stack: El[] = [];
  let cur: { line: Line; depth: number } | null = null;
  let label: string | null = null;
  for (const m of phone.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi)) {
    if (m[4] != null) {
      const text = decode(m[4]);
      if (label != null) { label += text; continue; }
      if (stack.some((e) => e.cls.some((c) => SKIP.has(c)))) continue;
      const top = stack[stack.length - 1];
      const st = states[states.length - 1];
      if (top?.cls.includes('ico')) { st.lines.push({ t: text.trim() === '◉' ? '[icon Hide balances]' : '[icon Settings]', sheet: false, opacity: 1 }); continue; }
      if (stack.some((e) => e.cls.includes('wm'))) { if (text === 'Money') st.lines.push({ t: '[wordmark MoneyKeel]', sheet: false, opacity: 1 }); continue; }
      if (cur) cur.line.t += text;
      continue;
    }
    const [, close, tag, attrs] = m;
    if (close) {
      const el = stack.pop();
      if (el?.cls.includes('state')) { const t = clean(label ?? ''); states.push({ key: t.charAt(6), label: t, lines: [] }); label = null; }
      if (cur && stack.length === cur.depth) { cur.line.t = clean(cur.line.t); if (cur.line.t) states[states.length - 1].lines.push(cur.line); cur = null; }
      continue;
    }
    if (tag === 'i' && /style=/.test(attrs) && stack.some((e) => e.cls.includes('sb'))) continue;   // the status bar's battery: no closing problem, it is skipped
    const cls = (/class="([^"]*)"/.exec(attrs)?.[1] ?? '').split(/\s+/).filter(Boolean);
    const css = cssOf(attrs);
    const el: El = { cls, css };
    if (cls.includes('state')) { label = ''; stack.push(el); continue; }
    if (!cur && (cls.includes('t') || cls.includes('in')) && !stack.some((e) => e.cls.some((c) => SKIP.has(c)))) {
      const faded = [...stack].reverse().find((e) => e.css.opacity != null);
      cur = { depth: stack.length, line: { t: '', sheet: stack.some((e) => e.cls.includes('modal')),
        size: css['font-size'] ? parseFloat(css['font-size']) : undefined, weight: css['font-weight'], color: colour(css.color),
        opacity: faded ? parseFloat(faded.css.opacity) : 1 } };
      if (cls.includes('in')) cur.line.color = undefined;                  // an input's words take the colour of what it shows
    } else if (cur && cur.line.color === undefined && stack[cur.depth]?.cls.includes('in') && cls.includes('t')) {
      cur.line.color = colour(css.color);
    }
    stack.push(el);
  }
  return { html, root, states };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// READING THE SCREEN
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const transform = (s: string, tt?: string) => (tt === 'uppercase' ? s.toUpperCase() : tt === 'lowercase' ? s.toLowerCase()
  : tt === 'capitalize' ? s.replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase()) : s);
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return transform(n, tt);
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
const PUA = /[-]/g;
const ICONS = new Set(['Hide balances', 'Show balances', 'Settings']);
function builtLines(): Line[] {
  const out: Line[] = [];
  const walk = (n: any, sheet: boolean, opacity: number) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, sheet, opacity)); return; }
    const p = n.props ?? {};
    if (n.type === 'Modal') { (n.children ?? []).forEach((c: any) => walk(c, true, opacity)); return; }
    if (n.type === 'Text') {
      const t = clean(textOf(n).replace(PUA, ''));
      const st = flat(p.style);
      if (t) out.push({ t, sheet, size: st.fontSize, weight: st.fontWeight, color: norm(st.color), opacity });
      return;
    }
    if (n.type === 'TextInput') {
      const st = flat(p.style);
      const t = clean(String(p.value || p.placeholder || ''));
      if (t) out.push({ t, sheet, size: st.fontSize, weight: st.fontWeight, color: norm(p.value ? st.color : p.placeholderTextColor), opacity });
      return;
    }
    if (n.type === 'Image' && p.accessibilityLabel === 'MoneyKeel') { out.push({ t: '[wordmark MoneyKeel]', sheet, opacity: 1 }); return; }
    if (p.accessibilityRole === 'button' && ICONS.has(p.accessibilityLabel)) { out.push({ t: `[icon ${p.accessibilityLabel}]`, sheet, opacity: 1 }); return; }
    // THE FADE, BY THE CODE'S OWN RULE: a button that cannot be pressed shows its style's fade (0.4, or 0.5 on the edit
    // sheet); one that can, none. Any other view keeps the opacity its style gives it.
    let op = opacity;
    const st = flat(p.style);
    if (p.accessibilityRole === 'button' || p.accessible) { if (p.accessibilityState?.disabled) op = st.opacity != null && st.opacity < 1 ? st.opacity : 0.4; }
    else if (st.opacity != null) op = st.opacity;
    (n.children ?? []).forEach((c: any) => walk(c, sheet, op));
  };
  walk(screen.toJSON(), false, 1);
  return out;
}

function renderState(st: SheetState) {
  useStore.getState().resetAll();
  mockParams = st.params;
  useStore.setState({ onboardingComplete: true, hideBalances: false, ...st.store } as any);
  const Page = st.page === 'account' ? require('../AccountPortfolioScreen').default : require('../HoldingDetailScreen').default;
  render(<Page />);
  st.steps();
}
const see = (l?: Line | null) => (l ? `${l.t} · ${l.size} · ${l.weight ?? '400'} · ${l.color} · ${l.opacity}` : '(no line)');
const firstDifference = (drawn: string[], built: string[]): string | null => {
  for (let k = 0; k < Math.max(drawn.length, built.length); k++) if (drawn[k] !== built[k]) return `line ${k + 1}: the drawing reads «${drawn[k] ?? '(nothing)'}», the screen reads «${built[k] ?? '(nothing)'}»`;
  return null;
};

const REPORT: string[] = [];
afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`\nTHE FIVE SHEETS vs their drawings (drawn from the code 2026-10-22, approval pending)\n${REPORT.join('\n')}\n`);
});

describe.each(SHEETS.map((s) => [s.file, s] as [string, Sheet]))('%s', (_file, sheet) => {
  const D = readDrawing(sheet.file);

  test('the drawing, read (a guard must prove it looked): its states are the state list\'s, each with its sheet and the page under it', () => {
    expect(D.states.map((s) => s.key)).toEqual(sheet.states.map((s) => s.key));
    expect(D.states.map((s) => s.label)).toEqual(sheet.states.map((s) => `STATE ${s.key} · ${s.label.toUpperCase()}`));
    for (const s of D.states) {
      expect(s.lines.filter((l) => l.sheet).length).toBeGreaterThanOrEqual(4);   // the activity sheet with nothing in it: title, line, empty line, Done
      expect(s.lines.filter((l) => !l.sheet).slice(0, 4).map((l) => l.t)).toEqual(['‹ Back', '[wordmark MoneyKeel]', '[icon Hide balances]', '[icon Settings]']);
    }
    // its colours are the app's tokens, name for name
    for (const [k, v] of Object.entries(Colors)) expect(`${k} ${norm(D.root[k])}`).toBe(`${k} ${norm(v as string)}`);
    // it says what it is, and asks nothing
    expect(D.html).toMatch(/approval pending/);
    expect(D.html).toMatch(/READ THIS FIRST/);
    expect(D.html).not.toMatch(/\?<\/td>/);
  });

  test.each(sheet.states.map((st, i) => [st.key, st, i] as [string, SheetState, number]))('state %s · word for word, in order, and every line\'s size, weight, colour and fade', (k, st, i) => {
    renderState(st);
    const built = builtLines();
    const drawn = D.states[i].lines;
    const dSheet = drawn.filter((l) => l.sheet), bSheet = built.filter((l) => l.sheet);
    const dPage = drawn.filter((l) => !l.sheet), bPage = built.filter((l) => !l.sheet).slice(0, dPage.length);
    const diff = firstDifference(dSheet.map((l) => l.t), bSheet.map((l) => l.t)) ?? firstDifference(dPage.map((l) => l.t), bPage.map((l) => l.t));
    REPORT.push(`${sheet.id} ${k}: sheet ${dSheet.length} of ${bSheet.length} lines drawn; page ${dPage.length} lines drawn above it${diff ? ` — ${diff}` : ', identical'}`);
    if (diff) throw new Error(`state ${k}: ${diff}`);
    // appearance, line by line (the wordmark and the icons are drawn, not typeset)
    const pairs = [...dSheet.map((l, j) => [l, bSheet[j]] as const), ...dPage.map((l, j) => [l, bPage[j]] as const)].filter(([d]) => !d.t.startsWith('['));
    for (const [d, b] of pairs) expect(see(d)).toBe(see(b));
    expect(pairs.length).toBeGreaterThanOrEqual(8);                                  // it looked
    expect(dPage.length).toBeGreaterThanOrEqual(6);                                  // the page's head is under every sheet
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THE WORDS CANNOT SEE
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('the dark-green bar and the button that waits', () => {
  test('the INTO bar on the recorder runs edge to edge across the sheet with square corners — drawn (states D and E) and built', () => {
    const { html } = readDrawing('moneykeel_pres_mock_record-activity-sheet_v01.html');
    const bars = [...html.matchAll(/<div class="v" style="([^"]*)"><div class="v" style="([^"]*background-color:var\(--primaryDeep\)[^"]*)">/g)];
    expect(bars).toHaveLength(2);
    for (const [, wrap, bar] of bars) {
      expect(wrap).toMatch(/margin-left:-20px;margin-right:-20px/);                  // the sheet's own 20, taken back on both sides
      expect(bar).toMatch(/border-top-left-radius:0px;border-top-right-radius:0px/);
      expect(bar).not.toMatch(/border-radius:[1-9]/);
    }
    expect(html).toMatch(/padding-left:20px;padding-right:20px[^"]*background-color:var\(--bgSecondary\)/);   // the sheet's 20
    renderState(SHEETS.find((s) => s.id === 'record-activity')!.states.find((s) => s.key === 'D')!);
    const band = screen.getByText('INTO');
    let bar: any = band.parent; while (bar && flat(bar.props?.style).backgroundColor !== Colors.primaryDeep) bar = bar.parent;
    expect(flat(bar.props.style)).toMatchObject({ borderTopLeftRadius: 0, borderTopRightRadius: 0 });
    let bleed: any = bar.parent, hops = 0; while (bleed && flat(bleed.props?.style).marginHorizontal == null && hops < 4) { bleed = bleed.parent; hops++; }
    expect(flat(bleed.props.style).marginHorizontal).toBe(-20);                     // found within a few steps up: the bar's own wrapper
  });

  test('every sheet\'s save button waits faded until the form can be saved, drawn and built (the guard counts them)', () => {
    let waiting = 0;
    for (const sheet of SHEETS) {
      const D = readDrawing(sheet.file);
      // ONE FADE (2026-10-22): 40%, as the approved drawings draw a button that waits (Add an account v02, Itemize v02)
      for (const s of D.states) for (const l of s.lines) if (l.sheet && l.opacity < 1) { waiting++; expect(l.opacity).toBe(0.4); }
    }
    // trade A (nothing typed), C (more than the cash), E (more than held), J, K, L (nothing typed) · holding editor H (no share
    // count) · recorder A, E, F, H, I (no amount) · edit record B (amount cleared)
    expect(waiting).toBe(13);
  });
});
