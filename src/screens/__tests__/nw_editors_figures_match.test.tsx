/** THE NET WORTH MODULE'S KEPT EDITORS AGAINST THEIR APPROVED DRAWINGS, FIGURE FOR FIGURE.
 *
 *  kept_editors_match holds the WORDS of these drawings and reads every figure and date as a placeholder ("$#",
 *  "<date>"); it also drops what sits in an input box. This file holds the other half: every figure and date each
 *  phone draws — the input boxes included, read off the built form's own boxes (what is typed in one, else the hint in
 *  it) — in the drawn order, exactly as drawn. Each phone is rendered ON THE DRAWING'S OWN DAY (Oct 1, 2026 for Bonds,
 *  Alternatives, Itemize and Holding detail, the day the 2026-10-11 audit used and the Bonds row of 2026-10-11 names;
 *  Sep 14, 2026 for Add an account, the "value as of" day it draws) with the data whose arithmetic gives its figures.
 *
 *    Bonds v02 ................ 3 phones     Alternatives v02 ......... 3 phones (+ phone 1 with Fund III kept as PE)
 *    Itemize v02 .............. 3 phones     Holding detail v02 ....... 3 phones
 *    Add an account v02 ....... 6 phones
 *
 *  A DIFFERENCE IS EITHER A DATED ROW ON TOP OF THE DRAWING (its READ THIS FIRST table, or the "ALSO CHANGED IN THE
 *  CODE" table beside it), CITED BY DATE AND RECORD, OR A FAILURE. Each KNOWN entry must still be found in the drawing,
 *  and each phone asserts a floor on how many figures it compared on both sides (A GUARD MUST PROVE IT LOOKED).
 *  Method shared with networth_figures_match_v08.test.tsx. What this cannot see: colour, size, spacing.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { drawingLines } from '../../testing/mockMatch';
import { coinQuantity } from '../../components/useMoney';
import { dateShown } from '../../domain/_shared/dates';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams, router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));

// ── figures: every amount, percent, count and date of a line, in order (the same reader as the Net worth file) ──────
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const FIGURE = new RegExp([
  '\\d{4}-\\d{2}-\\d{2}',                                   // a date written 2032-05-15
  `\\b${MONTH}\\.? \\d{1,2}(?:, \\d{4})?\\b`,                // a date written Mar 14, 2023 / March 14, 2023
  '~?[+−-]?\\$\\d+(?:,\\d{3})*(?:\\.\\d+)?',                 // an amount, its sign and its "~"
  '~?[+−-]?\\d+(?:\\.\\d+)?%',                               // a percent, its sign and its "~"
  '\\d+(?:,\\d{3})*(?:\\.\\d+)?',                            // any other number: counts, years, shares, a typed value
].join('|'), 'g');
type Fig = { f: string; line: string };
const figures = (lines: string[]): Fig[] =>
  lines.flatMap((line) => (line.toLowerCase().match(FIGURE) ?? []).map((f) => ({ f, line })));

/** Every visible Text of the rendered screen, in order — and every input box, as what is typed in it, else its hint. */
function shownLines(): string[] {
  const out: string[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    if (n.type === 'TextInput') { const t = String(n.props.value ?? '').trim() || String(n.props.placeholder ?? '').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

type Known = [phone: string, drawn: string[], built: string[], row: string];
const replaceRun = (xs: string[], from: string[], to: string[]): string[] | null => {
  for (let i = 0; i + from.length <= xs.length; i += 1) {
    if (from.every((f, k) => xs[i + k] === f)) return [...xs.slice(0, i), ...to, ...xs.slice(i + from.length)];
  }
  return null;
};
type Step = { op: 'same' | 'diff'; drawn: Fig[]; built: Fig[] };
function align(a: Fig[], b: Fig[]): Step[] {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) L[i][j] = a[i].f === b[j].f ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const steps: Step[] = [];
  const push = (op: Step['op'], d: Fig[], g: Fig[]) => {
    const last = steps[steps.length - 1];
    if (last && last.op === op) { last.drawn.push(...d); last.built.push(...g); } else steps.push({ op, drawn: [...d], built: [...g] });
  };
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i].f === b[j].f) { push('same', [a[i]], [b[j]]); i += 1; j += 1; }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) { push('diff', [], [b[j]]); j += 1; }
    else { push('diff', [a[i]], []); i += 1; }
  }
  return steps;
}
const REPORT: string[] = [];
/** One phone: the drawn figures, with its rows applied, must be the shown figures exactly, in order. */
function compare(phone: string, drawnLines: string[], shown_: string[], floor: number, known: Known[]) {
  const drawn = figures(drawnLines), shown = figures(shown_);
  expect(drawn.length).toBeGreaterThanOrEqual(floor);           // the guard proves it looked: the drawing's figures were read
  expect(shown.length).toBeGreaterThanOrEqual(floor);           // and the screen's
  const mine = known.filter((k) => k[0] === phone);
  let want = drawn.map((x) => x.f);
  for (const [, from, to, row] of mine) {
    const next = replaceRun(want, from, to);
    expect(next ? 'found' : `KNOWN (${row}) no longer matches the drawing: ${from.join(' | ')}`).toBe('found');
    if (next) want = next;
  }
  const steps = align(drawn, shown);
  const same = steps.filter((s) => s.op === 'same').reduce((t, s) => t + s.drawn.length, 0);
  // a step is KNOWN when every figure in it, drawn and shown, is one a row of this phone names; the strict check below
  // is the exact list
  const rowDrawn = new Set(mine.flatMap((k) => k[1])), rowShown = new Set(mine.flatMap((k) => k[2]));
  const isKnown = (s: Step) => s.drawn.every((d) => rowDrawn.has(d.f)) && s.built.every((b) => rowShown.has(b.f));
  // a step of as many shown figures as drawn is read pair by pair, so one explained figure beside one that is not is
  // counted as one of each
  const diffs = steps.filter((s) => s.op === 'diff').flatMap((s) => (s.drawn.length === s.built.length && s.drawn.length > 1
    ? s.drawn.map((d, k): Step => ({ op: 'diff', drawn: [d], built: [s.built[k]] })) : [s]));
  const drawnIn = (ss: Step[]) => ss.reduce((t, s) => t + s.drawn.length, 0);
  const moreShown = (ss: Step[]) => ss.reduce((t, s) => t + Math.max(0, s.built.length - s.drawn.length), 0);
  const knownSteps = diffs.filter(isKnown), otherSteps = diffs.filter((s) => !isKnown(s));
  const detail = diffs.map((s) => `   ${isKnown(s) ? 'KNOWN' : 'DIFFERENT'} drawn [${s.drawn.map((d) => d.f).join(' | ')}] shown [${s.built.map((b) => b.f).join(' | ')}]`
    + `\n      drawn on: ${[...new Set(s.drawn.map((d) => d.line))].join(' ⏎ ') || '—'}\n      shown on: ${[...new Set(s.built.map((b) => b.line))].join(' ⏎ ') || '—'}`);
  const line = `${phone}: ${same} of ${drawn.length} figures identical; ${drawnIn(otherSteps)} different; ${drawnIn(knownSteps)} known`
    + ` (${shown.length} shown: ${moreShown(knownSteps)} more by a row, ${moreShown(otherSteps)} more with no row)`;
  REPORT.push([line, ...detail].join('\n'));
  const OK = 'every difference is a dated row on the drawing';
  expect(otherSteps.length === 0 ? OK : [line, ...detail].join('\n')).toBe(OK);
  expect(shown.map((x) => x.f)).toEqual(want);
}
/** The instrument is checked before anything it reports is believed: lines that trip a careless reader — a comma after an
 *  amount, a range, a word that starts like a month, a minus sign, a year inside a name. */
test('the figure reader reads what a person reads, and nothing else', () => {
  expect(figures([
    '· retire at 65 with ~$4,124,000, lasting past 92 with ~$12,711,000 to spare ›', 'YOUR NET WORTH · AUG 11, 2026',
    '3–6 months is the usual guide', 'Bond · matures 2032-05-15', 'Market value 4.5', 'March 14, 2023', 'Sep 30',
    '▼ Change in net worth −$1,480 · Return on cash + investments −0.41% ›', 'Coinbase · Crypto · ~8.00%/year expected', 'Roth 401(k)',
  ]).map((x) => x.f)).toEqual(['65', '~$4,124,000', '92', '~$12,711,000', 'aug 11, 2026', '3', '6', '2032-05-15', '4.5', 'march 14, 2023', 'sep 30',
    '−$1,480', '−0.41%', '~8.00%', '401']);
});
afterAll(() => { if (process.env.FIGURE_REPORT) console.log(REPORT.join('\n')); });   // eslint-disable-line no-console

// ── the drawings ───────────────────────────────────────────────────────────────────────────────────────────────────
const NW = 'MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_';
/** Every phone of a drawing, from under its status bar to the next phone; the top bar's wordmark and icons left out. */
const phones = (file: string) => {
  const L = drawingLines(NW + file, [/<svg[\s\S]*?<\/svg>/g]).filter((l) => !['◉', '⚙', 'Money', 'Keel', 'i'].includes(l));
  const st = L.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  return st.map((s, n) => L.slice(s + 2, st[n + 1] ?? L.length));
};
/** A phone's own lines, through its last line (what follows is the drawing's caption or its notes). */
const upTo = (seg: string[], last: RegExp) => {
  const end = seg.findIndex((l) => last.test(l));
  expect(end).toBeGreaterThan(3);
  return seg.slice(0, end + 1);
};
const fromLine = (lines: string[], first: RegExp | string) => {
  const i = lines.findIndex((l) => (typeof first === 'string' ? l === first : first.test(l)));
  expect(i).toBeGreaterThanOrEqual(0);
  return lines.slice(i);
};
const at = (day: string) => jest.useFakeTimers({ now: new Date(`${day}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
afterEach(() => { jest.useRealTimers(); mockParams = {}; });
const show = (Screen: any, state: any, params: Record<string, string> = {}) => {
  mockParams = params;
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, ...state } as any);
  render(<Screen />);
  return shownLines();
};

// ── what the rows on top of each drawing changed, each cited by its date and record ─────────────────────────────────
const BONDS_ORDER = 'Bonds v02 READ THIS FIRST 2026-10-04 (DEC-1558): "The bonds are listed soonest-maturing first" — Feb 1, 2027 · Jun 30, 2027 · Mar 15, 2030';
const BONDS_YEARS = 'Bonds v02 READ THIS FIRST 2026-10-11 (DEC-4529 · MK-NW-F-058): DRAWING ERROR, phone 1 — years left "· 2y · 4y · 1y" should read "· 1y · 3y · 0y" on Oct 1, 2026';
const BONDS_EXACT = 'Bonds v02 ALSO CHANGED 2026-10-08 (DEC-3279 · MK-NW-F-060): "Yield to maturity is solved exactly, at the bond\'s exact years left" — the drawn 4.95% was the approximation';
const BONDS_ACCRUED = 'Bonds v02 ALSO CHANGED 2026-10-09 (DEC-3390 · MK-NW-F-119): the star moves to "Yield to maturity" and the note reads "Added estimated $… in accrued interest … at …% coupon for … days to calculate YTM"; READ THIS FIRST 2026-10-20 (DEC-3390): the estimate reads Pays interest, not chosen here';
const BONDS_FIELDS = 'Bonds v02 ALSO CHANGED 2026-10-09 (DEC-3390): phone 3\'s value field reads "Market value, as your statement shows it…"; READ THIS FIRST 2026-10-20 (DEC-0281 · MK-XS-I-067): "A box for what you paid, marked optional, after the value"';
const HELD_IN = (d: string) => `${d} READ THIS FIRST 2026-10-20 (DEC-2441 · DEC-2484h · MK-NW-F-010): Held in offers the one list of six — Taxable, 401(k), Traditional IRA, Roth IRA, Roth 401(k), HSA`;
const ALTS_RATES = 'Alternatives v02 READ THIS FIRST 2026-10-11 (DEC-4529 · DEC-2334 · MK-NW-M-050 · MK-NW-M-051): DRAWING ERROR, phone 1 — "Crypto 8.00%, Gold / commodities 8.20%, Other 5.00%" … EXP. RETURN 6.81%, EST. GROWTH $4,187; kept as private equity 13.00%, 10.06%, $6,187';
const ITEMIZE_DATE = 'Itemize v02 READ THIS FIRST (2026-10-19, MK-ST-F-078 dateShown · DEC-6323): "Bond · matures 2032-05-15" is written "Bond · matures May 15, 2032"';
const HOLDING_GAINS = 'Holding detail v02 READ THIS FIRST 2026-10-11 (DEC-4529 · MK-PF-F-006): DRAWING ERROR — "+$7,400.00 / +$1,957.60" should read "+$7,384 / +$1,974" … "Together $9,357.60, shown $9,358. Whole dollars, not cents, for gains"';
const HOLDING_SOLD = 'Holding detail v02 READ THIS FIRST 2026-10-04 (DEC-1559): "With nothing sold, the row reads \u201c$0 — nothing sold\u201d"';
const HOLDING_PRECISION = 'Holding detail v02 READ THIS FIRST 2026-10-21 (DEC-4529 · Q49 · DEC-0275 · MK-ST-F-078 dateShown): DRAWING ERROR — fifteen figures '
  + 'written as the precision rule and the one date writer write them: a balance or a total in whole dollars, a percent to two decimals and a '
  + 'return with its sign, a coin quantity with its trailing zeros dropped, a date with its month cut to three letters';
const HOLDING_LAST_CLOSE = 'Holding detail v02 READ THIS FIRST 2026-10-21 (DEC-3523 tenets 1, 2, 7 · MK-NW-M-029 · MK-ST-F-078 dateShown): phones A and C — '
  + 'the band above the price, drawn as the current price, live, names the price as the last close, then that close\u2019s date written the app\u2019s one way';
const ADD_PAID = 'Add an account v02 READ THIS FIRST 2026-10-20 (DEC-0281 · DEC-2748b · MK-XS-I-067): Bonds (phone 3): "a box for what you paid, marked optional, under the face value"';
// the three bonds of phone 1, as drawn: name figure, value, face, coupon, maturity, years left, coupon a year, yield, YTM
const TSY = ['2027', '$24,650', '$25,000', '4.25%', 'jun 30, 2027', '2', '$1,063', '4.31%', '4.95%'];
const AAPL = ['4.5%', '$19,530', '$20,000', '4.50%', 'mar 15, 2030', '4', '$900', '4.61%', '5.12%'];
const CD = ['12', '$30,000', '$30,000', '4.00%', 'feb 1, 2027', '1', '$1,200', '4.00%', '4.00%'];
const KNOWN: Known[] = [
  ['bonds 1', [...TSY, ...AAPL, ...CD], [...CD, ...TSY, ...AAPL], BONDS_ORDER],
  ['bonds 1', ['feb 1, 2027', '1', '$1,200'], ['feb 1, 2027', '0', '$1,200'], BONDS_YEARS],
  ['bonds 1', ['jun 30, 2027', '2', '$1,063'], ['jun 30, 2027', '1', '$1,063'], BONDS_YEARS],
  ['bonds 1', ['mar 15, 2030', '4', '$900'], ['mar 15, 2030', '3', '$900'], BONDS_YEARS],
  ['bonds 1', ['4.31%', '4.95%'], ['4.31%', '7.76%'], BONDS_EXACT],
  ['bonds 1', ['4.61%', '5.12%'], ['4.61%', '5.25%', '$493', '4.5%', '200'], BONDS_ACCRUED],
  ['bonds 3', ['jun 30, 2027', '~$1,063'], ['jun 30, 2027', '24650', '$9,700', '~$1,063'], BONDS_FIELDS],
  ['bonds 3', ['401'], ['401', '401'], HELD_IN('Bonds v02')],
  ['alternatives 1', ['7.32%', '$4,502'], ['6.81%', '$4,187'], ALTS_RATES],
  ['alternatives 1', ['~9.00%'], ['~8.00%'], ALTS_RATES],
  ['alternatives 1', ['~7.00%'], ['~5.00%'], ALTS_RATES],
  ['alternatives 1', ['~3.50%'], ['~8.20%'], ALTS_RATES],
  ['alternatives 1 (PE)', ['7.32%', '$4,502'], ['10.06%', '$6,187'], ALTS_RATES],
  ['alternatives 1 (PE)', ['~9.00%'], ['~8.00%'], ALTS_RATES],
  ['alternatives 1 (PE)', ['~7.00%'], ['~13.00%'], ALTS_RATES],
  ['alternatives 1 (PE)', ['~3.50%'], ['~8.20%'], ALTS_RATES],
  // the editor's line under the kind quotes the same benchmark as the row's Crypto 8.00% (one list of kinds)
  ['alternatives 3', ['~9.00%'], ['~8.00%'], ALTS_RATES],
  ['alternatives 3', ['401'], ['401', '401'], HELD_IN('Alternatives v02')],
  ['itemize 2', ['2032-05-15'], ['may 15, 2032'], ITEMIZE_DATE],
  ['itemize 3', ['2032-05-15'], ['may 15, 2032'], ITEMIZE_DATE],
  ['holding 1', ['+$9,357.60'], ['+$9,358'], HOLDING_GAINS],
  ['holding 1', ['$0.00'], ['$0'], HOLDING_SOLD],
  ['holding 1', ['+$7,400.00', '1', '+$1,957.60'], ['+$7,384', '1', '+$1,974'], HOLDING_GAINS],   // the "1" of "(under 1 yr)" between
  // the row of 2026-10-21, phone A in the drawn order: the day's change, the current value, the change since purchase's return,
  // the return over the past year, the market's, the gap between them, the two purchase dates, Total paid, dividends received
  ['holding 1', ['1.0%'], ['0.96%'], HOLDING_PRECISION],
  ['holding 1', ['$33,857.60'], ['$33,858'], HOLDING_PRECISION],
  ['holding 1', ['38.19%'], ['+38.19%'], HOLDING_PRECISION],
  ['holding 1', ['38.19%'], ['+38.19%'], HOLDING_PRECISION],
  ['holding 1', ['22.40%'], ['+22.40%'], HOLDING_PRECISION],
  ['holding 1', ['15.8'], ['15.79'], HOLDING_PRECISION],
  ['holding 1', ['march 14, 2023'], ['mar 14, 2023'], HOLDING_PRECISION],
  ['holding 1', ['january 9, 2026'], ['jan 9, 2026'], HOLDING_PRECISION],
  ['holding 1', ['$24,500.00'], ['$24,500'], HOLDING_PRECISION],
  ['holding 1', ['$134.40'], ['$134'], HOLDING_PRECISION],
  // phone B: what was paid in the large figure, the quantity, the purchase date, Total paid
  ['holding 2', ['$28,000.00'], ['$28,000'], HOLDING_PRECISION],
  ['holding 2', ['0.50000000'], ['0.5'], HOLDING_PRECISION],
  ['holding 2', ['july 2, 2024'], ['jul 2, 2024'], HOLDING_PRECISION],
  ['holding 2', ['$28,000.00'], ['$28,000'], HOLDING_PRECISION],
  // phone C: the day's change
  ['holding 3', ['4.1%'], ['4.05%'], HOLDING_PRECISION],
  // phones A and C: the band names the last close's date ahead of the price (the price itself is unchanged)
  ['holding 1', ['$241.84'], ['oct 1, 2026', '$241.84'], HOLDING_LAST_CLOSE],
  ['holding 3', ['$1.42'], ['oct 1, 2026', '$1.42'], HOLDING_LAST_CLOSE],
  ['add 2', ['401'], ['401', '401'], HELD_IN('Add an account v02')],
  ['add 3', ['$10,000', '4.5'], ['$10,000', '$9,700', '4.5'], ADD_PAID],
  ['add 3', ['401'], ['401', '401'], HELD_IN('Add an account v02')],
  ['add 4', ['401'], ['401', '401'], HELD_IN('Add an account v02')],
];
test('the rows\' own arithmetic: each figure KNOWN puts in place of a drawn one is worked by hand from the drawn data', () => {
  const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const daysFrom = (a: string, b: string) => (day(b) - day(a)) / 86_400_000;
  // Bonds, years left on Oct 1, 2026, to the nearest whole year (DEC-4529)
  expect([daysFrom('2026-10-01', '2027-06-30'), daysFrom('2026-10-01', '2030-03-15'), daysFrom('2026-10-01', '2027-02-01')].map((d) => Math.round(d / 365))).toEqual([1, 3, 0]);
  // Treasury, solved exactly (DEC-3279): one $1,062.50 coupon and the $25,000 face in 272 days, for $24,650
  expect(((Math.pow(26062.5 / 24650, 365 / 272) - 1) * 100).toFixed(2)).toBe('7.76');
  // Apple (DEC-3390): accrued interest estimated at 4.5% on $20,000 for the 200 days since Mar 15, 2026, a year's coupon
  // the payment; then the yield at which the coupons and the face, discounted, are $19,530 + $493
  expect(daysFrom('2026-03-15', '2026-10-01')).toBe(200);
  const accrued = 20000 * 0.045 * 200 / 365;
  expect(Math.round(accrued)).toBe(493);
  const t = daysFrom('2026-10-01', '2030-03-15') / 365;
  const price = (y: number) => { let pv = 0; for (let k = t; k > 1e-9; k -= 1) pv += 900 / Math.pow(1 + y, k); return pv + 20000 / Math.pow(1 + y, t); };
  let lo = 0, hi = 1; for (let i = 0; i < 200; i += 1) { const mid = (lo + hi) / 2; if (price(mid) > 19530 + accrued) lo = mid; else hi = mid; }
  expect((lo * 100).toFixed(2)).toBe('5.25');
  // Alternatives (the row of 2026-10-11): Fund III as Other, then kept as private equity
  expect(((28000 * 0.08 + 25000 * 0.05 + 8500 * 0.082) / 61500 * 100).toFixed(2)).toBe('6.81');
  expect(Math.round(28000 * 0.08 + 25000 * 0.05 + 8500 * 0.082)).toBe(4187);
  expect(((28000 * 0.08 + 25000 * 0.13 + 8500 * 0.082) / 61500 * 100).toFixed(2)).toBe('10.06');
  expect(Math.round(28000 * 0.08 + 25000 * 0.13 + 8500 * 0.082)).toBe(6187);
  // Holding detail (the row of 2026-10-11): 100 × ($241.84 − $168.00) and 40 × ($241.84 − $192.50)
  expect(Math.round(100 * (241.84 - 168))).toBe(7384);
  expect(Math.round(40 * (241.84 - 192.5))).toBe(1974);
  expect(Math.round(100 * (241.84 - 168) + 40 * (241.84 - 192.5))).toBe(9358);
  // Holding detail (the row of 2026-10-21): the drawn arithmetic, written by the precision rule (Q49) and the one date writer
  expect(Math.round(140 * 241.84)).toBe(33858);                                        // $33,857.60, a balance
  expect(100 * 168 + 40 * 192.5).toBe(24500);                                          // Total paid, a total
  expect(Math.round(134.4)).toBe(134);                                                 // dividends received, a total
  expect(((241.84 - 239.53) / 239.53 * 100).toFixed(2)).toBe('0.96');                  // up $2.31 on $239.53
  expect(((140 * 241.84 - 24500) / 24500 * 100).toFixed(2)).toBe('38.19');             // the change since purchase's return
  expect(((241.84 / 175 - 1) * 100).toFixed(2)).toBe('38.19');                         // the past year, $175.00 → $241.84
  expect(((612 / 500 - 1) * 100).toFixed(2)).toBe('22.40');                            // the market, $500 → $612
  expect((((241.84 / 175 - 1) - (612 / 500 - 1)) * 100).toFixed(2)).toBe('15.79');     // the gap, in points
  expect(0.5 * 56000).toBe(28000);                                                     // phone B, what was paid
  expect(coinQuantity(0.5)).toBe('0.5');                                               // eight decimals, trailing zeros dropped
  expect(((1.48 - 1.42) / 1.48 * 100).toFixed(2)).toBe('4.05');                        // phone C, down $0.06 on $1.48
  expect(['2023-03-14', '2026-01-09', '2024-07-02'].map(dateShown)).toEqual(['Mar 14, 2023', 'Jan 9, 2026', 'Jul 2, 2024']);
});

// ═══ BONDS v02 — Oct 1, 2026 ═══════════════════════════════════════════════════════════════════════════════════════
describe('Bonds v02 — every figure and date (Oct 1, 2026)', () => {
  const P = phones('bonds_v02.html');
  const BondsScreen = require('../BondsScreen').default;
  // $24,650 + $19,530 + $30,000 = $74,180 against face $25,000 + $20,000 + $30,000 = $75,000; coupons $1,063 + $900 +
  // $1,200 = $3,163 a year, 4.26% of $74,180. Accrued interest entered (0) on the Treasury and the CD, not on Apple —
  // the drawn "* accrued interest not entered" sits under Apple.
  const BONDS = [
    { asset_id: 'b1', label: 'US Treasury 2027', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24650, face_value: 25000, coupon_rate: 0.0425, maturity_date: '2027-06-30', accrued_interest: 0 },
    { asset_id: 'b2', label: 'Apple Corp 4.5%', kind: 'bond', tax_bucket: 'TAXABLE', balance: 19530, face_value: 20000, coupon_rate: 0.045, maturity_date: '2030-03-15' },
    { asset_id: 'b3', label: 'Chase 12-month CD', kind: 'bond', tax_bucket: 'TAXABLE', balance: 30000, face_value: 30000, coupon_rate: 0.04, maturity_date: '2027-02-01', accrued_interest: 0 },
  ];
  beforeEach(() => at('2026-10-01'));
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });
  test('phone 1 · with bonds', () => {
    const shown = show(BondsScreen, { assetAccounts: BONDS });
    compare('bonds 1', upTo(P[0], /Yield to maturity is an estimate\.$/), shown, 33, KNOWN);
  });
  test('phone 2 · the first day', () => {
    const shown = show(BondsScreen, { assetAccounts: [] });
    compare('bonds 2', upTo(P[1], /^＋ Add a bond$/), shown, 1, KNOWN);
  });
  // phone 3 draws the Treasury's accrued-interest box empty (its hint shows), so in its household that box was not filled
  test('phone 3 · the editor, opened on US Treasury 2027 (its accrued interest not entered, as drawn)', () => {
    show(BondsScreen, { assetAccounts: BONDS.map((x) => (x.asset_id === 'b1' ? { ...x, accrued_interest: undefined } : x)) });
    fireEvent.press(screen.getByText('US Treasury 2027'));
    const shown = fromLine(shownLines(), 'Edit bond');
    compare('bonds 3', upTo(P[2], /^Sold the whole position/), shown, 7, KNOWN);
  });
});

// ═══ ALTERNATIVES v02 — Oct 1, 2026 ════════════════════════════════════════════════════════════════════════════════
describe('Alternatives v02 — every figure and date (Oct 1, 2026)', () => {
  const P = phones('alternatives_v02.html');
  const OtherInvestmentsScreen = require('../OtherInvestmentsScreen').default;
  // $28,000 + $25,000 + $8,500 = $61,500, which is 12% of $61,500 + the $451,000 brokerage. Fund III is entered as
  // Other: private equity is not offered in this phase (DEC-2334), as the drawing's row of 2026-10-11 says.
  const ALTS = (fund3 = 'other_asset') => [
    { asset_id: 'a1', label: 'Bitcoin', institution: 'Coinbase', kind: 'crypto', tax_bucket: 'TAXABLE', balance: 28000 },
    { asset_id: 'a2', label: 'Fund III', kind: fund3, tax_bucket: 'TAXABLE', balance: 25000 },
    { asset_id: 'a3', label: 'Gold', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 8500 },
    { asset_id: 'k', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 451000 },
  ];
  beforeEach(() => at('2026-10-01'));
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });
  test('phone 1 · with holdings, Fund III entered as Other', () => {
    const shown = show(OtherInvestmentsScreen, { assetAccounts: ALTS() });
    compare('alternatives 1', upTo(P[0], /not guarantees\.$/), shown, 11, KNOWN);
  });
  test('phone 1 · with holdings, Fund III a private-equity row saved before this phase', () => {
    const shown = show(OtherInvestmentsScreen, { assetAccounts: ALTS('private_equity') });
    compare('alternatives 1 (PE)', upTo(P[0], /not guarantees\.$/), shown, 11, KNOWN);
  });
  test('phone 2 · the first day', () => {
    const shown = show(OtherInvestmentsScreen, { assetAccounts: [] });
    compare('alternatives 2', upTo(P[1], /^＋ Add an investment$/), shown, 1, KNOWN);
  });
  test('phone 3 · the editor, opened on Bitcoin', () => {
    show(OtherInvestmentsScreen, { assetAccounts: ALTS() });
    fireEvent.press(screen.getByText('Bitcoin'));
    const shown = fromLine(shownLines(), 'Edit investment');
    compare('alternatives 3', upTo(P[2], /^Sold all of it/), shown, 4, KNOWN);
  });
});

// ═══ ITEMIZE v02 — Oct 1, 2026 ═════════════════════════════════════════════════════════════════════════════════════
describe('Itemize v02 — every figure and date', () => {
  const P = phones('itemize_v02.html');
  const ItemizeScreen = require('../ItemizeScreen').default;
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  const start = () => show(ItemizeScreen, { assetAccounts: [{ asset_id: 'chase', label: 'Chase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 48000 }] }, { accountId: 'chase' });
  const place = (kind: string, placeholder: string, name: string, amount: string, matures?: Date) => {
    fireEvent.press(screen.getByLabelText(kind));
    fireEvent.changeText(screen.getByPlaceholderText(placeholder), name);
    fireEvent.changeText(screen.getByPlaceholderText('0'), amount);
    if (matures) {   // the bond's maturity is picked, never typed (DEC-4059b): open the picker and choose the drawn day
      fireEvent.press(screen.getByLabelText('Pick a maturity date'));
      fireEvent(screen.UNSAFE_getByType(DateTimePicker), 'onChange', { type: 'set' }, matures);
    }
    fireEvent.press(screen.getByLabelText('Add this holding'));
  };
  // AAPL $18,400 + US Treasury 2032 $12,000 (matures 2032-05-15, as drawn) + Chase sweep $6,000 = $36,400 of $48,000
  const three = () => {
    place('Stock / Fund', 'Ticker or name (e.g. AAPL)', 'AAPL', '18400');
    place('Bond', 'Bond name (e.g. US Treasury 2032)', 'US Treasury 2032', '12000', new Date(2032, 4, 15));
    place('Cash', 'Name', 'Chase sweep', '6000');
  };
  beforeEach(() => at('2026-10-01'));
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });
  test('phone 1 · nothing placed', () => {
    const shown = start();
    compare('itemize 1', upTo(P[0], /^Done — replace with 0 holdings$/), shown, 6, KNOWN);
  });
  test('phone 2 · three holdings placed, $11,600 left over', () => {
    start(); three(); fireEvent.press(screen.getByLabelText('Stock / Fund'));
    const shown = shownLines();
    compare('itemize 2', upTo(P[1], /^Done — replace with 3 holdings$/), shown, 13, KNOWN);
  });
  test('phone 3 · NVDA $14,200 more: $50,600 of $48,000, $2,600 over', () => {
    start(); three(); place('Stock / Fund', 'Ticker or name (e.g. AAPL)', 'NVDA', '14200'); fireEvent.press(screen.getByLabelText('Bond'));
    const shown = shownLines();
    compare('itemize 3', upTo(P[2], /^Done — replace with 4 holdings$/), shown, 16, KNOWN);
  });
});

// ═══ HOLDING DETAIL v02 — Oct 1, 2026 ══════════════════════════════════════════════════════════════════════════════
describe('Holding detail v02 — every figure and date (Oct 1, 2026)', () => {
  const P = phones('holding-detail_v02.html');
  const HoldingDetailScreen = require('../HoldingDetailScreen').default;
  const series = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
  // the past year opens Oct 1, 2025, measured from the close the day before: AAPL $175 → $241.84 = +38.19%, SPY $500 →
  // $612 = +22.40%, 15.79 points apart; today AAPL $239.53 → $241.84, up $2.31
  const SPY = series('SPY', [['2024-08-01', 400], ['2025-09-30', 500], ['2025-10-01', 500], ['2026-04-01', 560], ['2026-09-30', 610], ['2026-10-01', 612]]);
  const live = { pricesFetchedAt: '2026-10-01T11:00:00Z' };
  beforeEach(() => at('2026-10-01'));
  test('the drawing has its three phones', () => { expect(P).toHaveLength(3); });
  test('phone 1 · a priced holding: 100 AAPL bought Mar 14, 2023 at $168.00 and 40 on Jan 9, 2026 at $192.50', () => {
    const shown = show(HoldingDetailScreen, { ...live,
      assetAccounts: [{ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
          { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: '2026-01-09' }] }] }],
      priceCache: { AAPL: series('AAPL', [['2024-08-01', 150], ['2025-09-30', 175], ['2025-10-01', 175], ['2026-04-01', 210], ['2026-09-30', 239.53], ['2026-10-01', 241.84]]), SPY },
      transactions: [{ id: 'd1', account_id: 'fid', type: 'DIVIDEND', ticker: 'AAPL', amount: 134.4, date: '2026-08-02' }],
    }, { account: 'fid', position: 'p1' });
    compare('holding 1', upTo(P[0], /^Activity$/), upTo(shown, /^Activity$/), 30, KNOWN);
  });
  test('phone 2 · no live price: 0.5 BTC bought Jul 2, 2024 at $56,000', () => {
    const shown = show(HoldingDetailScreen, { ...live,
      assetAccounts: [{ asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots: [{ lot_id: 'l1', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }] }] }],
      priceCache: {} }, { account: 'cb', position: 'p1' });
    compare('holding 2', upTo(P[1], /^Activity$/), upTo(shown, /^Activity$/), 7, KNOWN);
  });
  test('phone 3 · sold, and prices that reach back 14 months under 2Y', () => {
    const shown = show(HoldingDetailScreen, { ...live,
      assetAccounts: [{ asset_id: 'et', label: 'E*TRADE', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'LCTX', label: 'Lucid Diagnostics', kind: 'stocks_etf', lots: [] }] }],
      priceCache: { LCTX: series('LCTX', [['2025-08-01', 2.1], ['2026-04-01', 1.8], ['2026-09-30', 1.48], ['2026-10-01', 1.42]]), SPY },
    }, { account: 'et', position: 'p1', period: '2Y' });
    compare('holding 3', upTo(P[2], /^Activity$/), upTo(shown, /^Activity$/), 12, KNOWN);
  });
});

// ═══ HOLDING DETAIL v02 · THE ROWS OF 2026-10-21 — figure for figure (Oct 1, 2026) ═════════════════════════════════════
// Four states the phones do not draw, each written on the drawing as a dated READ THIS FIRST row with a worked example. The
// built page's figures in the IF YOU SOLD TODAY card (and, with no live price, the large figure and Total paid) are exactly
// the row's own, in order, and each is written in the rows.
describe('Holding detail v02 · the worked examples of 2026-10-21, figure for figure (Oct 1, 2026)', () => {
  const HoldingDetailScreen = require('../HoldingDetailScreen').default;
  const series = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
  const SPY = series('SPY', [['2024-08-01', 400], ['2025-09-30', 500], ['2025-10-01', 500], ['2026-04-01', 560], ['2026-09-30', 610], ['2026-10-01', 612]]);
  const AAPL = series('AAPL', [['2024-08-01', 150], ['2025-09-30', 175], ['2025-10-01', 175], ['2026-04-01', 210], ['2026-09-30', 239.53], ['2026-10-01', 241.84]]);
  const acct = (positions: any[], extra: any = {}) => ({ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions, ...extra });
  const aapl = (second: string) => ({ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
    { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: second }] });
  const live = { pricesFetchedAt: '2026-10-01T11:00:00Z' };
  const rows = (() => {
    const html = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', NW + 'holding-detail_v02.html'), 'utf8') as string;
    const at = html.indexOf('READ THIS FIRST');
    return html.slice(at, html.indexOf('</table>', at)).replace(/<[^>]+>/g, ' ').replace(/&#8722;/g, '−').replace(/\s+/g, ' ');
  })();
  const cardFigures = (shown: string[]) => figures(shown.slice(shown.indexOf('IF YOU SOLD TODAY'), shown.indexOf('Record buy/sell'))).map((x) => x.f);
  beforeEach(() => at('2026-10-01'));

  test.each([
    ['no purchase date for the 40 shares', () => show(HoldingDetailScreen, { ...live, assetAccounts: [acct([aapl('')])], priceCache: { AAPL, SPY } }, { account: 'fid', position: 'p1' }),
      ['1', '+$7,384', '$1,974', '40']],   // the 1 of "held over 1 yr"
    ['held in a Roth IRA', () => show(HoldingDetailScreen, { ...live, assetAccounts: [acct([aapl('2026-01-09')], { kind: 'roth_ira', tax_bucket: 'ROTH' })], priceCache: { AAPL, SPY } }, { account: 'fid', position: 'p1' }),
      ['+$9,358']],
    ['2 SPX calls bought Jul 1, 2026 at $50, today $80', () => show(HoldingDetailScreen, { ...live,
      assetAccounts: [acct([{ position_id: 'p1', ticker: 'SPX', label: 'SPX call', kind: 'options', lots: [{ lot_id: 'l1', shares: 2, cost_per_share: 50, purchase_date: '2026-07-01' }] }])],
      priceCache: { SPX: series('SPX', [['2026-07-01', 50], ['2026-09-30', 78], ['2026-10-01', 80]]), SPY } }, { account: 'fid', position: 'p1' }),
      ['60%', '+$3,600', '40%', '+$2,400', '60%', '40%', '550']],
  ] as [string, () => string[], string[]][])('%s', (_name, render, want) => {
    const got = cardFigures(render());
    expect(got).toEqual(want);
    // every money figure the card prints is written in the drawing's rows of 2026-10-21
    for (const f of got.filter((x) => x.includes('$'))) expect(rows).toContain(f);
  });

  test('no live price, 0.5 coins at $56,000.00 and 0.25 with no price paid: $28,000 large and $28,000 Total paid, as the row writes', () => {
    const shown = show(HoldingDetailScreen, { ...live, priceCache: {}, assetAccounts: [acct([{ position_id: 'p1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots: [
      { lot_id: 'l1', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }, { lot_id: 'l2', shares: 0.25, cost_per_share: null, purchase_date: '2024-08-01' }] }],
      { asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase' })] }, { account: 'cb', position: 'p1' });
    expect([shown[shown.indexOf('NO LIVE PRICE — SHOWING WHAT YOU PAID') + 1], shown[shown.indexOf('Total paid') + 1]]).toEqual(['$28,000', '$28,000']);
    expect(rows).toContain('$28,000');
  });
});

// ═══ ADD AN ACCOUNT, BY HAND v02 — Sep 14, 2026 (the "value as of" day it draws) ════════════════════════════════════
describe('Add an account v02 — every figure and date, the hints in its boxes included (Sep 14, 2026)', () => {
  const P = phones('add-account-by-hand_v02.html');
  const AddAccountScreen = require('../AddAccountScreen').default;
  beforeEach(() => at('2026-09-14'));
  test('the drawing has its six phones', () => { expect(P).toHaveLength(6); });
  test.each([[1, 'Cash', 3], [2, 'Stocks / Funds', 4], [3, 'Bonds', 6], [4, 'Alternatives', 4], [5, 'Real estate', 3], [6, 'Debt', 4]] as [number, string, number][])(
    'phone %i · %s', (n, kind, floor) => {
      const k = n - 1;
      show(AddAccountScreen, { assetAccounts: [] });
      fireEvent.press(screen.getAllByText(kind)[0]);
      const shown = upTo(shownLines(), /^Save$/);
      compare(`add ${k + 1}`, upTo(P[k], /^Save$/), shown, floor, KNOWN);
    });
});
