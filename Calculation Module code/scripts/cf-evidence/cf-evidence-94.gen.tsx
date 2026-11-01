/** CF-EVIDENCE-94 — WHAT THE OUTSIDE REVIEWER COULD NOT SEE, GENERATED FROM THE CODE AS IT STANDS (2026-10-31, BRIEF-94).
 *
 *  OpenAI's screen checks of the Cash flow module (parts 18 and 19, 2026-10-25) gave 94 FAILs our measurer classed EVIDENCE
 *  GAP: the reviewer saw the figures' written records and nothing else. Workplan row #362: the next package carries the renders,
 *  the store before and after, each drawing and its match test, and the simulation contract. This file produces all of it.
 *
 *  NOTHING HERE IS RETYPED. The households, the days, the taps and the rendering harness are the measurer's own
 *  (src/screens/__tests__/outside_cashflow_openai_screens.test.tsx): its source is read from the disk, the harness region and the
 *  figure map are cut out of it between named lines, three named patches are applied (each must match exactly the times it says,
 *  or this stops), and the result is compiled and run. So when the fixers move a household or a screen, the next build of the
 *  package shows what the code shows that day.
 *
 *  Run only by "Calculation Module code/scripts/build-cf-evidence-package.py", with its own jest config. The name has no
 *  ".test." in it, so the app's own suite never runs it. It writes one JSON file (CF94_OUT) and changes nothing else.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { useStore } from '../../../src/store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../../src/components/figure';
import { figureSpec } from '../../../MoneyKeel/functions/figures';
import { drawingLines, builtLines } from '../../../src/testing/mockMatch';
import * as CFD from '../../../src/testing/cashflowDrawing';

// ── THE MEASURER'S TWO MOCKS, AS IT WRITES THEM. The text is checked against its source below: if it changes there, this stops.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => (globalThis as any).__cf94Params ?? {}, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../../src/services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));
const MEASURER_MOCKS = `jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));`;

// ── THE SIMULATION, WATCHED. Both wrappers pass every call through unchanged; while the log is on they record what the future
// paycheck was handed, every run of the simulation it made, and what it handed back — the contract, as it ran.
jest.mock('../../../src/domain/retirement', () => {
  const actual = jest.requireActual('../../../src/domain/retirement');
  return { __esModule: true, ...actual, simulate: (inp: any) => {
    const out = actual.simulate(inp);
    const log = (globalThis as any).__cf94Sim;
    if (log && log.on) log.calls.push({ input: JSON.parse(JSON.stringify(inp)), chance_of_success: out.chance_of_success, projected_at_retirement: out.projected_at_retirement });
    return out;
  } };
});
jest.mock('../../../MoneyKeel/functions/cashflow/future-paycheck', () => {
  const actual = jest.requireActual('../../../MoneyKeel/functions/cashflow/future-paycheck');
  return { __esModule: true, ...actual, futurePaycheck: (input: any) => {
    const log = (globalThis as any).__cf94Sim;
    if (log && log.on) log.calls = [];
    const out = actual.futurePaycheck(input);
    if (log && log.on) log.runs.push({ input: JSON.parse(JSON.stringify(input)), out: JSON.parse(JSON.stringify(out)), calls: log.calls.splice(0) });
    return out;
  } };
});

const ROOT = path.resolve(__dirname, '..', '..', '..');
const rel = (p: string) => path.relative(ROOT, p);
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} is not set — run build-cf-evidence-package.py, not this file`); return v; };

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. THE MEASURER'S HARNESS AND HOUSEHOLDS, CUT FROM ITS SOURCE AND RUN
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function lineIndex(lines: string[], re: RegExp, what: string): number {
  const at = lines.map((l, i) => (re.test(l) ? i : -1)).filter((i) => i >= 0);
  if (at.length !== 1) throw new Error(`the measurer's ${what} line (${re}) is there ${at.length} times, not once — the cut no longer sees its source`);
  return at[0];
}
function patch(code: string, from: string, to: string, times: number, why: string): string {
  const n = code.split(from).length - 1;
  if (n !== times) throw new Error(`patch "${why}": "${from}" found ${n} times, expected ${times}`);
  return code.split(from).join(to);
}
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function loadMeasurer(file: string) {
  const src = read(file);
  const lines = src.split('\n');
  // the two mocks, word for word (only the name of the variable that carries the screen's parameters differs)
  const mocksAt = lineIndex(lines, /^jest\.mock\('expo-router'/, 'expo-router mock');
  const mocksText = lines.slice(mocksAt, mocksAt + 8).join('\n');
  if (norm(mocksText) !== norm(MEASURER_MOCKS)) throw new Error(`the measurer's mocks changed — copy them into this file:\n${mocksText}`);
  const a0 = lineIndex(lines, /^const flat = \(st: any\)/, 'harness start');
  const a1 = lineIndex(lines, /^const CACHE = new Map/, 'renders end');
  const b0 = lineIndex(lines, /^const MOCK = \{/, 'drawing map start');
  const b1 = lineIndex(lines, /^const lineOn = /, 'figure map end');
  if (!(a0 < a1 && a1 < b0 && b0 < b1)) throw new Error('the measurer\'s regions are out of order');
  let code = lines.slice(a0, a1).join('\n') + '\n' + lines.slice(b0, b1).join('\n');
  // PATCH 1: keep every stored value before and after, not only the names of what changed
  code = patch(code, 'const before = ENTERED.map((k) => JSON.stringify((useStore.getState() as any)[k]));',
    'const before = ENTERED.map((k) => JSON.stringify((useStore.getState() as any)[k]));\n    const __all = () => { const s: any = useStore.getState(); return Object.fromEntries(Object.keys(s).filter((k) => typeof s[k] !== \'function\').map((k) => [k, JSON.stringify(s[k] ?? null)])); };\n    const __b = __all();',
    1, 'the store before');
  code = patch(code, 'const shot = { printed, lines: readLines(), changed };',
    'const shot: any = { printed, lines: readLines(), changed, __before: __b, __after: __all(), __args: { name, state, today, params, act, pre } };',
    1, 'the store after');
  // PATCH 2: the screen's parameters reach the router mock above
  code = patch(code, 'mockParams = params;', '(globalThis as any).__cf94Params = params;', 1, 'parameters set');
  code = patch(code, 'mockParams = {};', '(globalThis as any).__cf94Params = {};', 1, 'parameters cleared');
  // PATCH 3: the screens are required from the measurer's own folder
  const nScreens = code.split("require('../").length - 1;
  if (nScreens < 7) throw new Error(`the measurer requires ${nScreens} screens, expected at least 7`);
  code = patch(code, "require('../", "__req('../", nScreens, 'screens');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  const base = path.dirname(path.join(ROOT, file));
  const __req = (p: string) => require(path.join(base, p));   // eslint-disable-line @typescript-eslint/no-var-requires
  // eslint-disable-next-line no-new-func
  const make = new Function('React', 'render', 'screen', 'fireEvent', 'StyleSheet', 'useStore', 'figuresPrinted', 'resetFiguresPrinted', 'jest', '__req',
    `${js}\nreturn { RENDERS, SCREENS, ENTERED, FIGS, MOCK, MATCH, shoot };`);
  // `screen` is a live binding that render() replaces, so the harness reads it through the module each time, never a copy
  const RNTL = require('@testing-library/react-native');   // eslint-disable-line @typescript-eslint/no-var-requires
  const liveScreen = new Proxy({}, { get: (_t, k) => (RNTL.screen as any)[k] });
  const M = make(React, render, liveScreen, fireEvent, StyleSheet, useStore, figuresPrinted, resetFiguresPrinted, jest, __req);
  // each render's own line of source, so the package can say which household, which day, and which taps
  const renderSrc: Record<string, string> = {};
  for (const l of lines.slice(a0, a1)) { const m = l.match(/^ {2}([A-Z][A-Z0-9_]*): \(\) => (shoot\(.*\)),?\s*(\/\/.*)?$/); if (m) renderSrc[m[1]] = m[2]; }
  const keys = Object.keys(M.RENDERS);
  const missing = keys.filter((k) => !renderSrc[k]);
  if (missing.length) throw new Error(`renders whose source line could not be read: ${missing.join(', ')}`);
  // the measurer's helpers the taps use (tab, next, prev, pressPlanned …), each one line of its source
  const helpers: Record<string, string> = {};
  for (const l of lines.slice(a0, a1)) { const m = l.match(/^const (tab|next|prev|pressPlanned|fromCloud|throughTheApp) = (.*)$/); if (m) helpers[m[1]] = m[2]; }
  return { M, regions: { harness: [a0 + 1, a1], figures: [b0 + 1, b1] }, renderSrc, helpers, nRenders: keys.length };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 2. TEST BLOCKS, READ WITH THE TYPESCRIPT PARSER — every test and describe, its name, its lines, its text
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Block = { file: string; ancestors: string[]; name: string; dynamic: boolean; kind: string; from: number; to: number; text: string };
function testBlocks(file: string): Block[] {
  const text = read(file);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Block[] = [];
  const nameOf = (a: ts.Node | undefined): { name: string; dynamic: boolean } => {
    if (!a) return { name: '', dynamic: true };
    if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) return { name: a.text, dynamic: false };
    return { name: a.getText(sf), dynamic: true };
  };
  const calleeKind = (e: ts.Expression): string | null => {
    const t = e.getText(sf);
    if (/^(test|it|describe)(\.(failing|skip|only|todo))?$/.test(t)) return t;
    if (ts.isCallExpression(e) && /^(test|it|describe)\.each$/.test(e.expression.getText(sf))) return `${e.expression.getText(sf)}(…)`;
    return null;
  };
  const visit = (n: ts.Node, anc: string[]) => {
    if (ts.isCallExpression(n)) {
      const k = calleeKind(n.expression);
      if (k) {
        const { name, dynamic } = nameOf(n.arguments[0]);
        const from = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        const to = sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1;
        if (k.startsWith('describe')) { n.arguments.slice(1).forEach((c) => visit(c, [...anc, name])); return; }
        out.push({ file, ancestors: anc, name, dynamic, kind: k, from, to, text: n.getText(sf) });
        return;
      }
    }
    ts.forEachChild(n, (c) => visit(c, anc));
  };
  visit(sf, []);
  return out;
}
/** The source of one named function or const in a file, read with the parser (the simulation's method, as written). */
function sourceOf(file: string, names: string[]): Record<string, string> {
  const text = read(file);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: Record<string, string> = {};
  const visit = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name && names.includes(n.name.text)) out[n.name.text] = n.getText(sf);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  for (const k of names) if (!out[k]) throw new Error(`${file} has no function ${k} — the simulation contract cannot be read`);
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 3. THE DRAWINGS, READ AS THE MATCH TESTS READ THEM
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function phonesOf(file: string): string[][] {
  if (file === CFD.CASHFLOW_DRAWING) return [1, 2, 3, 4, 5, 6].map((n) => CFD.cashflowPhone(n));
  const L = drawingLines(file, [/<svg[\s\S]*?<\/svg>/g]);
  const st = L.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  if (!st.length) throw new Error(`${file}: no phone found (no 9:41 status bar)`);
  return st.map((s, n) => L.slice(s + 1, st[n + 1] ?? L.length).filter((l) => l !== '▮▮▮ ⌁'));
}
/** A drawn line against the line the measurer reads beside a figure: case and the kind of quote mark levelled, as the match tests'
 *  normExact levels them (a drawing writes a band title in small letters under a CSS capitals rule). */
const lv = (x: string) => x.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const matches = (l: string, line: { s?: string; re?: string; flags?: string }) => (line.s != null ? lv(l) === lv(line.s) : new RegExp(line.re!, `${line.flags ?? ''}i`).test(l) || new RegExp(line.re!, `${line.flags ?? ''}i`).test(lv(l)));

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** A pause for the promises a render left behind. The icon font loads after a screen first mounts (createIconSet calls
 *  Font.loadAsync); the measurer's later renders see it loaded because jest pauses between its tests. One warm-up render and a
 *  pause before each render here give the same screens, icons included. */
const settle = async () => { for (let i = 0; i < 3; i++) await new Promise((r) => setImmediate(r)); };

test('CF-EVIDENCE-94: the renders, the store before and after, the drawings, the test blocks and the simulation contract', async () => {
  const cases: { figure: string; tenet: number }[] = JSON.parse(fs.readFileSync(env('CF94_CASES'), 'utf8'));
  const measurerFile = process.env.CF94_MEASURER ?? 'src/screens/__tests__/outside_cashflow_openai_screens.test.tsx';
  expect(cases.length).toBeGreaterThanOrEqual(1);
  const { M, regions, renderSrc, helpers, nRenders } = loadMeasurer(measurerFile);

  // ── the figure map, as the measurer reads each figure: which render, which line, which drawing and test
  const ser = (x: string | RegExp | null | undefined) => (x == null ? null : typeof x === 'string' ? { s: x } : { re: x.source, flags: x.flags });
  const figs: Record<string, any> = {};
  for (const c of cases) {
    const f = M.FIGS[c.figure];
    if (!f) throw new Error(`${c.figure}: the measurer's figure map has no entry`);
    figs[c.figure] = { main: f.main, line: ser(f.line), mock: f.mock, match: f.match, viaRows: !!f.viaRows, drawingNote: f.drawingNote ?? null, nowAs: f.nowAs ?? null };
  }

  // ── every render the cases need, with the store before and after; and the same household arriving from the cloud
  const shots: Record<string, any> = {};
  const cloud: Record<string, any> = {};
  const unpack = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === undefined ? null : JSON.parse(v)]));
  const keysNeeded = [...new Set(Object.values(figs).map((f: any) => f.main as string))];
  for (const key of keysNeeded) {
    M.RENDERS[key]();   // the warm-up: each screen loads its own icon fonts on its first mount
    await settle();
    const s = M.RENDERS[key]();
    const a = s.__args;
    const before = unpack(s.__before), after = unpack(s.__after);
    const changedAny = Object.keys(after).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    shots[key] = { source: renderSrc[key], screen: a.name, day: a.today, params: a.params, household_keys: Object.keys(a.state ?? {}),
      has_taps: !!a.act, has_pre: !!a.pre, lines: s.lines, printed: s.printed, entered_changed: s.changed,
      entered_keys: [...M.ENTERED], before, after, any_stored_key_changed: changedAny };
    if (!a.pre) {
      await settle();
      const c = M.shoot(a.name, {}, a.today, a.params, a.act, () => (useStore.getState() as any).loadFromCloud(a.state));
      const cb = unpack(c.__before);
      cloud[key] = { how: 'the same household handed to the store\'s loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps',
        entered_equal: Object.fromEntries(M.ENTERED.map((k: string) => [k, JSON.stringify(cb[k]) === JSON.stringify(before[k])])),
        entered_after_sync: Object.fromEntries(M.ENTERED.map((k: string) => [k, cb[k]])),
        printed: c.printed, lines_equal: JSON.stringify(c.lines) === JSON.stringify(s.lines), entered_changed_by_opening: c.changed };
    }
  }

  // ── the register's own record of each figure, as the code declares it today
  const spec = (id: string) => {
    try {
      const s: any = figureSpec(id);
      const keep = ['label', 'unit', 'per', 'grain', 'screens', 'answers', 'formula', 'inputs', 'decisions', 'refusal', 'note', 'ruled'];
      const o: any = Object.fromEntries(keep.filter((k) => s[k] != null && s[k] !== '').map((k) => [k, s[k]]));
      if (s.worked) o.worked = { given: s.worked.given, answer: s.worked.answer };
      return o;
    } catch (e: any) { return { not_in_register: String(e.message ?? e) }; }
  };
  const ids = new Set<string>(cases.map((c) => c.figure));
  for (const f of Object.values(figs) as any[]) if (f.nowAs) ids.add(f.nowAs.id);
  ids.add('MK-CF-M-004');
  const register = Object.fromEntries([...ids].sort().map((id) => [id, spec(id)]));

  // ── the drawings: every phone, and where each figure's line is drawn
  const drawingFiles = [...new Set(Object.values(figs).map((f: any) => f.mock).filter(Boolean))] as string[];
  const drawings: Record<string, any> = {};
  for (const file of drawingFiles) {
    const phones = phonesOf(file);
    const d: any = { phones };
    if (file === CFD.CASHFLOW_DRAWING) d.as_built = Object.fromEntries(Object.entries(CFD.AS_BUILT).map(([k, f]) => [k, (f as () => string[])()]));
    drawings[file] = d;
  }
  const FRAME_OF: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
  const onDrawing: Record<string, any> = {};
  for (const [id, f] of Object.entries(figs) as [string, any][]) {
    if (!f.mock) continue;
    const d = drawings[f.mock];
    const drawn = d.phones.map((p: string[], i: number) => (p.some((l: string) => matches(l, f.line)) ? i + 1 : 0)).filter(Boolean);
    const built = d.as_built ? Object.entries(d.as_built).filter(([, p]) => (p as string[]).some((l) => matches(l, f.line))).map(([k]) => FRAME_OF[k]) : [];
    onDrawing[id] = { drawn_on_phones: drawn, as_built_on_phones: built };
  }
  // the drawing's own household for the six Cash flow frames, rendered on the drawing's day, as cashflow_matches_v01 renders them
  const frameRenders: Record<string, any> = {};
  const FRAME_SETUP: Record<string, [() => void, string | null]> = {
    A: [CFD.householdWithData, null], B: [CFD.householdFreshB, null], C: [CFD.householdWithData, 'Expenses'],
    D: [CFD.householdFreshD, 'Expenses'], E: [CFD.householdIncome, 'Income'], F: [CFD.householdDebts, 'Debts'] };
  const CashFlowScreen = require('../../../src/screens/CashFlowScreen').default;
  for (const [k, [setup, tabName]] of Object.entries(FRAME_SETUP)) {
    await settle();
    jest.useFakeTimers({ now: CFD.DRAWN_NOW, doNotFake: [...CFD.ONLY_THE_CLOCK] });
    try {
      setup();
      const r = render(<CashFlowScreen />);
      if (tabName) fireEvent.press(screen.getByLabelText(new RegExp(`^${tabName} tab`)));
      frameRenders[k] = { phone: FRAME_OF[k], day: CFD.DRAWN_DAY, tab: tabName, lines: builtLines(screen.toJSON()) };
      r.unmount();
    } finally { jest.useRealTimers(); }
  }

  // ── every test file that reads one of these drawings (its file name, or the Cash flow drawing's helper), found on the disk
  const allTests: string[] = [];
  const walk = (d: string) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
    if (/\.test\.tsx?$/.test(e.name)) allTests.push(p);
  } };
  walk('src');
  expect(allTests.length).toBeGreaterThan(300);   // the walk looked: the app has hundreds of test files
  const testFiles: Record<string, { reads: string[]; imports_screens: string[] }> = {};
  for (const f of allTests) {
    const t = read(f);
    const reads = drawingFiles.filter((d) => t.includes(path.basename(d)) || (d === CFD.CASHFLOW_DRAWING && /testing\/cashflowDrawing/.test(t)));
    const isMatch = Object.values(figs).some((x: any) => x.match === f);
    if (!reads.length && !isMatch && f !== measurerFile) continue;
    const imports = [...t.matchAll(/import (\w+) from '\.\.\/(\w+Screen)'/g)].map((m) => m[2]);
    const requires = [...t.matchAll(/require\('\.\.\/(\w+Screen)'\)/g)].map((m) => m[1]);
    testFiles[f] = { reads, imports_screens: [...new Set([...imports, ...requires])] };
  }
  // ── the test blocks of every one of those files
  const blocks: Block[] = [];
  for (const f of Object.keys(testFiles)) blocks.push(...testBlocks(f));

  // ── the simulation contract: the future paycheck in its row's household, watched as the screen runs it
  const simCases = cases.filter((c) => c.tenet === 1);
  let sim: any = null;
  if (simCases.length) {
    const key = figs[simCases[0].figure].main;
    await settle();
    (globalThis as any).__cf94Sim = { on: true, calls: [], runs: [] };
    const s = M.RENDERS[key]();
    const log = (globalThis as any).__cf94Sim; log.on = false;
    if (!log.runs.length) throw new Error(`the ${key} render ran no future paycheck — the contract cannot be read`);
    const run = log.runs[0];
    const fpSrc = read('MoneyKeel/functions/cashflow/future-paycheck.ts');
    const pcSrc = read('src/domain/paycheck/index.ts');
    const m1 = fpSrc.match(/seed: (\d+), paths: (\d+) \}/);
    const floor = pcSrc.match(/export function solveSafeDraw\([^)]*chanceFloor = (\d+)\)/);
    const halvings = pcSrc.match(/for \(let i = 0; i < (\d+); i\+\+\) \{\s*const mid = \(lo \+ hi\) \/ 2;/);
    const raises = pcSrc.match(/if \(k >= (\d+)\) return Math\.floor\(hi \/ (\d+)\) \* \2;/);
    const step = pcSrc.match(/let draw = Math\.floor\(lo \/ (\d+)\) \* \1;/);
    if (!m1 || !floor || !halvings || !raises || !step) throw new Error('the simulation\'s constants were not found where the contract reads them');
    const probes: any[] = [], others: any[] = [];
    run.calls.forEach((c: any, i: number) => {
      const isProbe = c.input.retire_age === c.input.current_age && c.input.annual_contribution === 0;
      (isProbe ? probes : others).push({ n: i + 1, ...c });
    });
    const projection = others.length ? others[others.length - 1] : null;
    const again1 = (jest.requireActual('../../../MoneyKeel/functions/cashflow/future-paycheck') as any).futurePaycheck(run.input);
    const again2 = (jest.requireActual('../../../MoneyKeel/functions/cashflow/future-paycheck') as any).futurePaycheck(run.input);
    sim = {
      render: key, day: s.__args.today, runs_seen: log.runs.length,
      handed: run.input, returned: run.out,
      futures: { paths_passed_by_futurePaycheck: Number(m1[2]), seed_passed_by_futurePaycheck: Number(m1[1]) },
      projection: projection && { call: projection.n, input: projection.input, chance_of_success: projection.chance_of_success, projected_at_retirement_median: projection.projected_at_retirement },
      other_runs_before_the_projection: others.slice(0, -1).map((o) => ({ call: o.n, paths: o.input.paths, seed: o.input.seed, chance_of_success: o.chance_of_success })),
      draw_search: {
        chance_floor_default: Number(floor[1]), raise_top_up_to: Number(raises[1]), round_down_to: Number(raises[2]), halvings: Number(halvings[1]), step_down_by: Number(step[1]),
        fixed_inputs: probes.length ? Object.fromEntries(Object.entries(probes[0].input).filter(([k]) => k !== 'retire_monthly_spend_today')) : null,
        probes: probes.map((p) => ({ call: p.n, monthly_draw_tried: p.input.retire_monthly_spend_today - p.input.guaranteed_monthly_income, monthly_spend_simulated: p.input.retire_monthly_spend_today, chance_of_success: p.chance_of_success })),
      },
      deterministic: JSON.stringify(again1) === JSON.stringify(again2) && JSON.stringify(again1) === JSON.stringify(run.out),
      method_source: { ...sourceOf('src/domain/retirement/index.ts', ['mulberry32', 'normal', 'simulate']), ...sourceOf('src/domain/paycheck/index.ts', ['solveSafeDraw', 'buildPaycheckYear']), ...sourceOf('MoneyKeel/functions/cashflow/future-paycheck.ts', ['futurePaycheck']) },
      printed_on_screen: s.printed.filter((p: any) => ['MK-CF-M-022', 'MK-CF-M-023', 'MK-CF-M-055'].includes(p.id)),
    };
  }

  const screensOf = Object.fromEntries(Object.entries(M.SCREENS).map(([k, f]) => [k, String(f).match(/__req\('\.\.\/(\w+)'\)/)?.[1] ?? null]));
  if (Object.values(screensOf).some((v) => !v)) throw new Error(`a screen of the measurer's could not be named: ${JSON.stringify(screensOf)}`);
  const out = { built: new Date().toISOString(), measurer: { file: measurerFile, regions, renders_in_file: nRenders, helpers, screens: screensOf }, test_files: testFiles,
    figs, renders: shots, cloud, register, drawings, on_drawing: onDrawing, drawing_frames_rendered: frameRenders, blocks, sim };
  fs.writeFileSync(env('CF94_OUT'), JSON.stringify(out, null, 1));
  // the guard looked: every case's render was made, and every drawing has phones
  for (const c of cases) expect(shots[figs[c.figure].main].lines.length).toBeGreaterThan(3);
  for (const f of drawingFiles) expect(drawings[f].phones.length).toBeGreaterThanOrEqual(2);
  void rel;
});
