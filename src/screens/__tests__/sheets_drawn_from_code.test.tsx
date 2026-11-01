/** THE FIVE SHEETS AGAINST THEIR DRAWINGS, WORD FOR WORD, STATE BY STATE (2026-10-22, gap 24 of the Performance launch audit).
 *
 *  Five sheets had no drawing (DEC-0470: every state is drawn). Each is now drawn from the code, approval pending, in
 *  MoneyKeel/documents/networth-and-performance/:
 *    moneykeel_pres_mock_trade-sheet_v04.html ............ the trade sheet, 15 states (Record activity; v03 2026-10-23, its fee; v04 2026-10-30, M–O)
 *    moneykeel_pres_mock_holding-editor_v02.html ......... the holding editor, 9 states (Edit holding)
 *    moneykeel_pres_mock_activity-sheet_v02.html ......... the activity sheet, 3 states (v02 2026-10-30, C)
 *    moneykeel_pres_mock_record-activity-sheet_v01.html .. the account page's recorder, 9 states
 *    moneykeel_pres_mock_edit-record-sheet_v03.html ...... the edit sheet for a record you entered, 10 states (v03 2026-10-30, D–J)
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
import { amountInBox } from '../../components/MoneyBox';

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
type Line = { t: string; sheet: boolean; size?: number; weight?: string; color?: string; opacity: number; typed?: boolean;
  /** WHERE THE LINE SITS (2026-10-31, FX-PF, NW3-33): its container's padding above and below and its height, then the same of the
   *  container around that — so a padding or a height drawn one way and built another fails, as a word or a size does. */
  box?: string;
  /** a box (a drawn `in`, a built TextInput) — so a grey figure drawn in a box nobody filled can be told from a grey line of words (R16) */
  input?: boolean };
/** one container's padding above · below · height, as drawn (CSS) or as built (the flattened style) */
const boxOf = (pt: any, pb: any, h: any) => `${Number(pt) || 0}/${Number(pb) || 0}/${h == null ? '-' : Number(h)}`;
const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
/** THE ONE READING OF A DRAWING'S WORDS (2026-10-25): a drawing whose READ THIS FIRST row of that date says its apostrophes are
 *  drawn straight, copied from the code, is read with ’ inside a word — the app prints ’. The app side is held as printed, and a
 *  drawing that draws a straight one without the row goes red below. */
const APOSTROPHE_ROW = /<tr><td>\d+<\/td><td>2026-10-25 · Every apostrophe inside a word is drawn straight here/;
const curled = (t: string) => t.replace(/([A-Za-z])'([A-Za-z])/g, '$1’$2');
/** ONE NAME PER ACCOUNT (2026-10-27, FX-PF, PF-8; DEC-0083): a drawing whose row of that date says so is read with the account's one
 *  name where it draws the institution alone — the holding editor's chip and its 📊 line, the Holding page's 'in …', the activity
 *  line's '· …'. The app side is held as printed. */
const NAME_ROW = /<tr><td>\d+<\/td><td>2026-10-27 · (?:(?!<\/td>)[\s\S])*One name per account\./;
const oneName = (t: string) => (t === 'Fidelity' ? 'Fidelity Brokerage' : t === 'in Fidelity' ? 'in Fidelity Brokerage'
  : t.replace('won’t change Fidelity’s', 'won’t change Fidelity Brokerage’s').replace(/ · Fidelity$/, ' · Fidelity Brokerage'));
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
      const text = APOSTROPHE_ROW.test(html) ? curled(decode(m[4])) : decode(m[4]);
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
      if (cur && stack.length === cur.depth) { cur.line.t = clean(cur.line.t); if (NAME_ROW.test(html)) cur.line.t = oneName(cur.line.t); if (cur.line.t) states[states.length - 1].lines.push(cur.line); cur = null; }
      continue;
    }
    if (tag === 'i' && /style=/.test(attrs) && stack.some((e) => e.cls.includes('sb'))) continue;   // the status bar's battery: no closing problem, it is skipped
    const cls = (/class="([^"]*)"/.exec(attrs)?.[1] ?? '').split(/\s+/).filter(Boolean);
    const css = cssOf(attrs);
    const el: El = { cls, css };
    if (cls.includes('state')) { label = ''; stack.push(el); continue; }
    if (!cur && (cls.includes('t') || cls.includes('in')) && !stack.some((e) => e.cls.some((c) => SKIP.has(c)))) {
      const faded = [...stack].reverse().find((e) => e.css.opacity != null);
      // the containers: an input is its own; a line of words sits in the nearest view, and that in the next
      const views = [...(cls.includes('in') ? [el] : []), ...[...stack].reverse().filter((e) => e.cls.includes('v'))].slice(0, 2);
      const side = (c: Record<string, string>, k: 'top' | 'bottom') => {
        if (c[`padding-${k}`] != null) return parseFloat(c[`padding-${k}`]);
        const sh = (c.padding ?? '').trim().split(/\s+/).filter(Boolean).map(parseFloat);
        return sh.length ? (k === 'top' ? sh[0] : sh[sh.length === 1 ? 0 : 2] ?? sh[0]) : 0;
      };
      const box = views.map((v) => boxOf(side(v.css, 'top'), side(v.css, 'bottom'), v.css.height != null ? parseFloat(v.css.height) : v.css['min-height'] != null ? parseFloat(v.css['min-height']) : null)).join(' | ');
      cur = { depth: stack.length, line: { t: '', sheet: stack.some((e) => e.cls.includes('modal')),
        size: css['font-size'] ? parseFloat(css['font-size']) : undefined, weight: css['font-weight'], color: colour(css.color),
        opacity: faded ? parseFloat(faded.css.opacity) : 1, box } };
      if (cls.includes('in')) { cur.line.color = undefined; cur.line.input = true; }   // an input's words take the colour of what it shows
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
/** EVERY LINE OF THE RENDERED SCREEN, READ FROM THE COMPONENT TREE (2026-10-31, FX-PF, NW3-33): its words, size, weight and colour; the fade
 *  THE CODE'S OWN STYLE DECLARES for the element it sits in (a disabled button with no fade in its style is drawn full strength — it
 *  was given 40% by a rule typed here, which hid two drawings' error and would pass a Save that lost its fade); and its box, the
 *  padding and height of its container and of the one around that. The fade is read from the style the screen hands each
 *  component, not from the animated host, which a test never runs. */
function builtLines(): Line[] {
  const out: Line[] = [];
  const hostOf = (n: any) => { let a = n?.parent; while (a && (typeof a.type !== 'string' || a.type === 'Text')) a = a.parent; return a; };
  const side = (st: any, k: 'Top' | 'Bottom') => st[`padding${k}`] ?? st.paddingVertical ?? st.padding ?? 0;
  // a scroll view's own box is its content's: the drawing draws the content container, which holds the page's padding
  const sig = (n: any) => { const st = flat(n?.type === 'RCTScrollView' ? n?.props?.contentContainerStyle : n?.props?.style); return boxOf(side(st, 'Top'), side(st, 'Bottom'), st.height ?? st.minHeight ?? null); };
  const boxFor = (n: any, own: boolean) => {
    const a = own ? n : hostOf(n), b = hostOf(a);
    return [a, b].filter(Boolean).map(sig).join(' | ');
  };
  const textI = (n: any, tt?: string): string => {
    if (typeof n === 'string') return transform(n, tt);
    const t2 = n.type === 'Text' ? (flat(n.props?.style).textTransform ?? tt) : tt;
    return (n.children ?? []).map((c: any) => textI(c, t2)).join('');
  };
  // `inner`: inside a touchable's own parts, before its first native view — the animated fade it builds there is the test
  // renderer's frozen value (it never runs the animation), so only the style the screen handed the touchable counts
  const walk = (n: any, sheet: boolean, opacity: number, inner = false) => {
    if (n == null || typeof n === 'string') return;
    const p = n.props ?? {};
    if (n.type === 'Modal') { (n.children ?? []).forEach((c: any) => walk(c, true, opacity)); return; }
    if (n.type === 'Text') {
      const t = clean(textI(n).replace(PUA, ''));
      const st = flat(p.style);
      if (t) out.push({ t, sheet, size: st.fontSize, weight: st.fontWeight, color: norm(st.color), opacity, box: boxFor(n, false) });
      return;
    }
    if (n.type === 'TextInput') {
      const st = flat(p.style);
      const t = clean(String(p.value || p.placeholder || ''));
      if (t) out.push({ t, sheet, size: st.fontSize, weight: st.fontWeight, color: norm(p.value ? st.color : p.placeholderTextColor), opacity, typed: !!p.value, box: boxFor(n, true) });
      return;
    }
    if (n.type === 'Image' && p.accessibilityLabel === 'MoneyKeel') { out.push({ t: '[wordmark MoneyKeel]', sheet, opacity: 1 }); return; }
    if (typeof n.type === 'string' && p.accessibilityRole === 'button' && ICONS.has(p.accessibilityLabel)) { out.push({ t: `[icon ${p.accessibilityLabel}]`, sheet, opacity: 1 }); return; }
    // the fade the screen's own style declares, on the component it hands it to (a number only: an animated value is the host's)
    let op = opacity;
    const host = typeof n.type === 'string';
    if (!host && !inner) { const o = flat(p.style)?.opacity; if (typeof o === 'number') op = o; }
    const touchable = !host && !inner && (typeof p.onPress === 'function' || typeof p.onPressIn === 'function');
    (n.children ?? []).forEach((c: any) => walk(c, sheet, op, host ? false : inner || touchable));
  };
  walk(screen.UNSAFE_root, false, 1);
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
/** what is compared of a line: its words, size, weight, colour and fade, and its box — on the sheet, its own container (padding above and
 *  below, height); on the page under it, the top bar's two containers (where the page sits under the sheet the two drawings' generators
 *  nest the page's views differently, so only the bar, whose nesting is one component, is compared there) */
const see = (l?: Line | null, page = false) => (l ? `${l.t} · ${l.size} · ${l.weight ?? '400'} · ${l.color} · ${l.opacity}${!page ? ` · ${String(l.box ?? '').split(' | ')[0]}` : l.t === '‹ Back' ? ` · ${l.box}` : ''}` : '(no line)');
const firstDifference = (drawn: string[], built: string[]): string | null => {
  for (let k = 0; k < Math.max(drawn.length, built.length); k++) if (drawn[k] !== built[k]) return `line ${k + 1}: the drawing reads «${drawn[k] ?? '(nothing)'}», the screen reads «${built[k] ?? '(nothing)'}»`;
  return null;
};

/** THE DATED ROW OF 2026-10-27 ON EACH SHEET'S DRAWING (DEC-8385, FX-SHARED): "Every money box on this screen shows its figure the way a
 *  figure is printed, while it is typed — ‘$1,000’ where a box was drawn ‘1000’ …; where the screen prints its own $ just before the box,
 *  the box reads ‘1,000’". Applied here exactly as written, and only where the drawing carries it: a box drawn with a plain figure reads
 *  that same figure in money form on the screen. A box whose figure differs, a line that is not a typed box, or a drawing without the
 *  row is compared as drawn. */
const MONEY_BOX_ROW = 'Every money box on this screen shows its figure the way a figure is printed';
function moneyBoxRow(html: string, dSheet: Line[], bSheet: Line[]): Line[] {
  if (!html.includes(MONEY_BOX_ROW)) return dSheet;
  return dSheet.map((d, j) => {
    const b = bSheet[j];
    if (!b?.typed || !/^\d+(\.\d+)?$/.test(d.t)) return d;
    // THE ROW'S OWN WORDS, NOT THE CODE'S RULE (2026-10-31, FX-PF, NW3-33): ‘$1,000’ where ‘1000’, ‘$192.50’ where ‘192.5’ — a figure
    // with cents is written with two decimals. It was read through the box's own formatter, so ‘$192.5’ passed beside the row.
    const [int, dec] = d.t.split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec != null ? `.${dec.padEnd(2, '0')}` : '');
    return b.t === `$${grouped}` || b.t === grouped ? { ...d, t: b.t } : d;
  });
}

/** THE DRAWINGS' CORRECTION ROWS OF 2026-10-31 (FX-PF, NW3-S02, NW3-S03, NW3-02), applied as they are written, only where a drawing carries
 *  them and only to the page under the sheet:
 *   · the top bar drawn 6 points below the status bar is read at 4 (DEC-8928);
 *   · in the states the row names, a page line drawn at 40% is read at full strength — the drawing took its fade from the old test;
 *   · edit-record state I's window figures are read as the row gives them (R11): +12.23% → +2.25%, +44.30% → +7.07%. */
const TOP_ROW = /2026-10-31 · (?:(?!<\/td>)[\s\S])*DRAWING ERROR, the page under the sheet, every state drawn before 2026-10-27: the MoneyKeel top bar is drawn 6 points/;
const FADE_ROW = /2026-10-31 · (?:(?!<\/td>)[\s\S])*DRAWING ERROR, the page under the sheet in states ([A-Z](?:, [A-Z])*(?: and [A-Z])?|[A-Z] to [A-Z]): the window chips/;
const I_ROW = /2026-10-31 · (?:(?!<\/td>)[\s\S])*State I, the page under the sheet: an account whose total was typed that sold inside the window/;
function asCorrected(html: string, key: string, dPage: Line[]): Line[] {
  const fade = FADE_ROW.exec(html)?.[1];
  const fadeStates = !fade ? [] : / to /.test(fade)
    ? (([a, b]) => Array.from({ length: b.charCodeAt(0) - a.charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(a.charCodeAt(0) + i)))(fade.split(' to '))
    : fade.split(/, | and /);
  return dPage.map((l) => {
    let x = l;
    if (TOP_ROW.test(html) && x.t === '‹ Back' && x.box?.endsWith(' | 6/10/-')) x = { ...x, box: x.box.replace(/ \| 6\/10\/-$/, ' | 4/10/-') };
    if (fadeStates.includes(key) && x.opacity === 0.4) x = { ...x, opacity: 1 };
    return x;
  }).map((x, j, all) => {
    // state I: the account's figures — its window chips, its summary and its Total row — not its holding's own row
    if (key !== 'I' || !I_ROW.test(html)) return x;
    const table = all.findIndex((y) => y.t === 'BY CATEGORY & HOLDING'), total = all.findIndex((y) => y.t === 'Total');
    return j < table || j === total + 2 ? { ...x, t: x.t.replace('+12.23%', '+2.25%').replace('+44.30%', '+7.07%') } : x;
  });
}

/** EMPTY MEANS EMPTY (2026-11-01, FX-PF; the lead's ruling R16 of 2026-10-31, DEC-0296): a drawing whose row of that date says so has the
 *  grey figure it draws in a box nobody filled — ‘0’ — read as an empty box. The line goes from the drawn sheet (an empty box prints no
 *  line), and the state test then holds the box itself: the sheet shows at least that many empty boxes, and no box shows a grey figure. */
const R16_ROW = /2026-11-01(?:<\/td>| · )(?:(?!<\/tr>)[\s\S])*Empty means empty \(the lead’s ruling R16 of 2026-10-31/;
const FIGURE = /^\$?[\d,.]+$/;
const greyFigure = (l: Line) => !!l.input && l.color === norm(Colors.textTertiary) && FIGURE.test(l.t);
const emptyRow = (html: string, dSheet: Line[]): Line[] => (R16_ROW.test(html) ? dSheet.filter((l) => !greyFigure(l)) : dSheet);
/** a guard must prove it looked: the grey figures each drawing draws in a box, counted by hand on 2026-11-01 — record activity A, E, F, H
 *  and I (the amount, 5); the trade sheet A, J, K, L, M and O (Shares and Price / share, 12); the holding editor H (Shares, 1); the ✎ sheet
 *  none (every box opens filled from the record). The activity sheet has no box and no row. */
const R16_GREY: Record<string, number> = { 'moneykeel_pres_mock_record-activity-sheet_v01.html': 5, 'moneykeel_pres_mock_trade-sheet_v04.html': 12,
  'moneykeel_pres_mock_holding-editor_v02.html': 1, 'moneykeel_pres_mock_edit-record-sheet_v03.html': 0 };
/** every box on the sheet as built: what it holds and the grey words it shows when empty */
const sheetBoxes = () => screen.UNSAFE_root.findAll((n: any) => n.type === 'Modal').flatMap((m: any) => m.findAll((n: any) => n.type === 'TextInput'))
  .map((n: any) => ({ value: String(n.props.value ?? ''), placeholder: String(n.props.placeholder ?? '') }));

/** the true number of sheet choices under 44 points tall on 2026-10-31 (NW3-S05) — it may only fall */
const RATCHET_SHORT_CHOICES = 0;    // 0 of 900 on 2026-11-01, after FX-SHARED's Tap.slop (92 of 900 that morning; 628 on 2026-10-31, before Tap.min): it may only fall
/** FX-SHARED'S ROW OF 2026-10-31 ON THE TRADE SHEET, THE HOLDING EDITOR AND THE RECORDER (DEC-0141, NW3-16/17): "every choice on the sheet
 *  is at least 44 points tall (Tap.min)… nothing else moves". Applied as written: a choice drawn shorter (no height of its own, or 40)
 *  reads at 44 — only its height, only where the build gives that line's container the floor, only on a drawing that says so. */
const TAP_ROW = /every (?:day )?choice (?:on the sheet )?is at least 44 points tall \(Tap\.min\)/;
function tapRow(html: string, dSheet: Line[], bSheet: Line[]): Line[] {
  if (!TAP_ROW.test(html)) return dSheet;
  return dSheet.map((d, j) => {
    const [own, ...rest] = String(d.box ?? '').split(' | '), b = String(bSheet[j]?.box ?? '').split(' | ')[0];
    const [pt, pb, h] = own.split('/'), [bpt, bpb, bh] = b.split('/');
    return bh === '44' && pt === bpt && pb === bpb && (h === '-' || Number(h) < 44) ? { ...d, box: [`${pt}/${pb}/44`, ...rest].join(' | ') } : d;
  });
}
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
    // R16: the four sheets with boxes carry the row, and their grey figures are the number counted by hand
    if (sheet.file in R16_GREY) {
      expect(D.html).toMatch(R16_ROW);
      expect(D.states.flatMap((st) => st.lines.filter((l) => l.sheet && greyFigure(l))).length).toBe(R16_GREY[sheet.file]);
    } else expect(D.html).not.toMatch(R16_ROW);
  });

  test.each(sheet.states.map((st, i) => [st.key, st, i] as [string, SheetState, number]))('state %s · word for word, in order, and every line\'s size, weight, colour and fade', (k, st, i) => {
    renderState(st);
    const built = builtLines();
    const drawn = D.states[i].lines;
    const bSheet = built.filter((l) => l.sheet);
    const emptied = drawn.filter((l) => l.sheet && R16_ROW.test(D.html) && greyFigure(l)).length;
    const dSheet = tapRow(D.html, moneyBoxRow(D.html, emptyRow(D.html, drawn.filter((l) => l.sheet)), bSheet), bSheet);
    const dPage = asCorrected(D.html, k, drawn.filter((l) => !l.sheet)), bPage = built.filter((l) => !l.sheet).slice(0, dPage.length);
    const diff = firstDifference(dSheet.map((l) => l.t), bSheet.map((l) => l.t)) ?? firstDifference(dPage.map((l) => l.t), bPage.map((l) => l.t));
    REPORT.push(`${sheet.id} ${k}: sheet ${dSheet.length} of ${bSheet.length} lines drawn; page ${dPage.length} lines drawn above it${diff ? ` — ${diff}` : ', identical'}`);
    if (diff) throw new Error(`state ${k}: ${diff}`);
    // appearance, line by line (the wordmark and the icons are drawn, not typeset)
    const pairs = [...dSheet.map((l, j) => [l, bSheet[j], false] as const), ...dPage.map((l, j) => [l, bPage[j], true] as const)].filter(([d]) => !d.t.startsWith('['));
    for (const [d, b, page] of pairs) expect(see(d, page)).toBe(see(b, page));
    expect(pairs.length).toBeGreaterThanOrEqual(8);                                  // it looked
    // R16: the boxes the drawing's grey figures sat in are on the sheet, empty, and no box anywhere on it shows a grey figure
    if (R16_ROW.test(D.html)) {
      const boxes = sheetBoxes();
      expect(boxes.filter((b) => !b.value && !b.placeholder).length).toBeGreaterThanOrEqual(emptied);
      expect(boxes.filter((b) => !b.value && FIGURE.test(b.placeholder)).map((b) => b.placeholder)).toEqual([]);
    }
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
    // trade A (nothing typed), C (more than the cash), E (more than held), J, K, L (nothing typed), M (no type chosen), O (a share count
    // not on record; 2026-10-30) · holding editor H (no share count) · recorder A, E, F, H, I (no amount) · edit record B (amount cleared)
    expect(waiting).toBe(15);
  });
});

// A CHOICE IS AT LEAST 44 POINTS TALL (his DEC-0141; the round-3 drawing match NW3-S05, 2026-10-31, FX-PF). The drawings were drawn as built,
// so drawing and screen agree and the comparison above cannot see a choice that is too short. This guard reads every choice the five
// sheets offer, in every state, and counts those whose own style gives them less than 44 points — the TRUE number, printed every run.
// It is a ratchet: it may only fall (FX-SHARED's tap-size work, NW3-16/17, lowers it). It looked: at least 300 choices.
test('every choice on the five sheets: how many are under 44 points tall (a ratchet that may only fall, NW3-S05)', () => {
  let looked = 0; const short = new Map<string, number>();
  for (const sheet of SHEETS) for (const st of sheet.states) {
    renderState(st);
    const inSheet = (n: any) => { for (let a = n?.parent; a; a = a.parent) if (a.type === 'Modal') return true; return false; };
    for (const n of screen.UNSAFE_root.findAll((x: any) => typeof x.type !== 'string' && typeof x.props?.onPress === 'function' && x.props?.accessibilityRole === 'button')) {
      if (!inSheet(n)) continue;
      // its tap height: its own height or minimum height, else its padding, borders and its words' line (a line is 1.2 × the size,
      // or the line height the style gives), and the touch area its hitSlop adds above and below
      const fs = flat(n.props.style);
      const words = n.findAll((x: any) => x.type === 'Text')[0];
      const ws = flat(words?.props?.style);
      const line = Number(ws.lineHeight) || (Number(ws.fontSize) || 14) * 1.2;
      const pad = (k: 'Top' | 'Bottom') => Number(fs[`padding${k}`] ?? fs.paddingVertical ?? fs.padding ?? 0) + Number(fs[`border${k}Width`] ?? fs.borderWidth ?? 0);
      const slop = (Number(n.props.hitSlop?.top) || 0) + (Number(n.props.hitSlop?.bottom) || 0);
      // the dimmed backdrop that closes a sheet fills the screen (absolute, pinned top and bottom): not a short choice
      const fills = fs.position === 'absolute' && ((fs.top != null && fs.bottom != null) || fs.inset != null) || fs.flex === 1;
      const tall = fills ? 844 : Math.max(Number(fs.height) || 0, Number(fs.minHeight) || 0, pad('Top') + pad('Bottom') + line) + slop;
      looked += 1;
      if (tall < 44) { const k = `${sheet.id}: ${String(n.props.accessibilityLabel ?? '').slice(0, 40)}`; short.set(k, (short.get(k) ?? 0) + 1); }
    }
    screen.unmount();
  }
  const count = [...short.values()].reduce((a, b) => a + b, 0);
  // eslint-disable-next-line no-console
  console.log(`Choices on the five sheets (tap height: own height, else padding + borders + its line; hitSlop added): ${looked} read, ${count} under 44 points tall, ${short.size} kinds:\n  ${[...short.keys()].slice(0, 40).join('\n  ')}`);
  expect(looked).toBeGreaterThanOrEqual(300);
  expect(count).toBeLessThanOrEqual(RATCHET_SHORT_CHOICES);
});

test('a sheet drawing that draws an account by its institution alone says so in its row of 2026-10-27 — and only those do (PF-8)', () => {
  const files = ['moneykeel_pres_mock_trade-sheet_v04.html', 'moneykeel_pres_mock_holding-editor_v02.html', 'moneykeel_pres_mock_activity-sheet_v02.html',
    'moneykeel_pres_mock_record-activity-sheet_v01.html', 'moneykeel_pres_mock_edit-record-sheet_v03.html'];
  const alone = files.filter((f) => {
    const html = fs.readFileSync(path.join(DIR, f), 'utf8');
    return /in Fidelity<|>Fidelity<|· Fidelity<|change Fidelity(’|&#39;|')s/.test(html.slice(html.indexOf('<div class="phone">'), html.indexOf('<div class="side">')));
  });
  expect(alone).toEqual(['moneykeel_pres_mock_trade-sheet_v04.html', 'moneykeel_pres_mock_holding-editor_v02.html', 'moneykeel_pres_mock_activity-sheet_v02.html']);
  for (const f of files) expect(NAME_ROW.test(fs.readFileSync(path.join(DIR, f), 'utf8'))).toBe(alone.includes(f));
});

test('a sheet drawing that draws a straight apostrophe inside a word says so in its row of 2026-10-25 — and only those do', () => {
  const files = ['moneykeel_pres_mock_trade-sheet_v04.html', 'moneykeel_pres_mock_holding-editor_v02.html', 'moneykeel_pres_mock_activity-sheet_v02.html',
    'moneykeel_pres_mock_record-activity-sheet_v01.html', 'moneykeel_pres_mock_edit-record-sheet_v03.html'];
  const straight = files.filter((f) => {
    const html = fs.readFileSync(path.join(DIR, f), 'utf8');
    return /[A-Za-z](?:'|&#39;)[A-Za-z]/.test(html.slice(html.indexOf('<div class="phone">'), html.indexOf('<div class="side">')).replace(/<[^>]+>/g, ' '));
  });
  expect(straight).toEqual(['moneykeel_pres_mock_trade-sheet_v04.html', 'moneykeel_pres_mock_holding-editor_v02.html', 'moneykeel_pres_mock_record-activity-sheet_v01.html']);
  for (const f of files) expect(APOSTROPHE_ROW.test(fs.readFileSync(path.join(DIR, f), 'utf8'))).toBe(straight.includes(f));
});
