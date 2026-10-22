// PRECISION — founder ruling Q49 (2026-09-09): every calculation runs at full precision; rounding
// happens once, at display. This guard reads the calculation code and fails on any rounding inside
// it. Standard: MoneyKeel/documents/standards/moneykeel_calc_spec_precision-and-display_v01.md
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const ROOTS = ['src/domain', 'MoneyKeel/functions', 'Calculation Module code/engines'];
const ALLOWED = new Set(['Calculation Module code/engines/money.ts']);   // round2 is DEFINED here, for the display layer

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { if (!name.includes('__tests__') && name !== 'probes') walk(p, out); }
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, '');

test('no calculation rounds inside itself — round2 calls and cents / four-decimal idioms are absent', () => {
  const offenders: string[] = [];
  const seen: Record<string, number> = {};
  for (const root of ROOTS) {
    for (const file of walk(path.join(ROOT, root))) {
      seen[root] = (seen[root] ?? 0) + 1;
      const rel = path.relative(ROOT, file);
      if (ALLOWED.has(rel)) continue;
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      const lines = src.split('\n');
      lines.forEach((ln, i) => {
        if (/(?<![\w.])round2\s*\(/.test(ln)) offenders.push(`${rel}:${i + 1} round2(`);
        if (/Math\.round\([^;]*\*\s*(100|1e4|10000)\s*\)\s*\/\s*(100|1e4|10000)\b/.test(ln)) offenders.push(`${rel}:${i + 1} rounding idiom`);
      });
    }
  }
  // A GUARD MUST PROVE IT LOOKED (2026-09-28): on 2026-10-20 it read 65 · 24 · 13 files. A folder that moves goes red here.
  expect(seen['src/domain'] ?? 0).toBeGreaterThanOrEqual(60);
  expect(seen['MoneyKeel/functions'] ?? 0).toBeGreaterThanOrEqual(20);
  expect(seen['Calculation Module code/engines'] ?? 0).toBeGreaterThanOrEqual(10);
  expect(offenders).toEqual([]);
});

// ══ NOTHING ROUNDS WHEN IT IS SAVED (DEC-0403, 2026-09-09: "held as a float, decimals shown only for prices") ══
//
// The test above reads only the calculation folders. On 2026-10-20 the check of his Net worth decisions found the
// rounding had moved to where values are SAVED: the store rounded every built balance to cents, and the holdings
// import rounded the cost per share, the account's value and every row's value before storing them. None of those
// files was read by any guard. This test reads every other folder that holds app code.
//
// WHAT IT LOOKS FOR, read off the code's own syntax tree (never a line pattern):
//   · a SHORTENING rounding — round2(x), Math.round|floor|ceil|trunc(x × 10ⁿ) ÷ 10ⁿ, Number(x.toFixed(n)),
//     parseFloat(x.toFixed(n)), +x.toFixed(n). These exist only to keep a number with fewer decimals.
//   · a WHOLE-NUMBER rounding (Math.round/floor/ceil/trunc) handed straight to the store — inside the arguments of a
//     call to one of the store's actions, whose names are read from the store's own type (AppState).
//   · in src/store itself, ANY rounding: the store is where values are saved, and it prints nothing.
// HOW EACH ONE IS JUDGED:
//   · WORDS — the rounded number becomes text on the spot: inside a `${…}` of a template, a JSX child, the receiver
//     of .toFixed / .toLocaleString / .toString, an argument of String(…), or a const used only in those places.
//     That is display rounding, which the ruling allows. Counted, and not a failure.
//   · anything else is a rounding of a value that is kept. It fails the build unless it is on CARRIED below, by
//     its file and its exact code, with the reason it is still there. CARRIED must match exactly: a fixed one has
//     to come off the list (the debt only falls), and a new one cannot hide behind an old entry.
// WHAT IT CANNOT SEE, said plainly: a whole-number rounding kept in a variable and saved later (the Roth screen's
// tax bill was one — it was found by reading, and fixed the same day). Those are counted and printed as not judged.
const SAVE_ROOTS: Record<string, number> = {   // folder → the fewest files it may hold (2026-10-20 counts in brackets)
  'src/store': 2,          // (2)
  'src/screens': 45,       // (49)
  'src/components': 36,   // (40)
  'src/services': 14,      // (16)
  'src/onboarding': 4,     // (4)
  'src/hooks': 2,          // (2)
  'src/utils': 3,          // (3)
  'src/navigation': 1,     // (1)
  'src/constants': 6,      // (7)
  'app': 50,               // (56)
};
/** Every folder under src/ must be read by one of the two tests, or be named here with the reason it is not. */
const NOT_READ_HERE: Record<string, string> = {
  'src/domain': 'the calculation folder — read by the test above',
  'src/__tests__': 'tests, not app code',
  'src/testing': 'fixtures that tests feed the app; nothing here runs in the app',
};

type Verdict = 'kept' | 'saved';
/** The roundings still in the code, each with its reason. Matched by file + verdict + its exact code. */
const CARRIED: { file: string; code: string; n: number; verdict: Verdict; display_only?: true; why: string }[] = [
  // ── files another agent owns on 2026-10-20 — not changed by this pass; each is a real rounding of a kept value ──
  // AccountPortfolioScreen's two (a holding row's value; the last part of the income sum) left 2026-10-20: the value is asked
  // of MK-NW-O-006 theHolding at full precision, and the remainder is subtracted exactly in decimals.
  // BondsScreen's and OtherInvestmentsScreen's two (a bond's value and face after a part-sale; an investment's value after a
  // sale) left 2026-10-20: both are saved at full precision and rounded only where they are shown.
  { file: 'src/screens/NetWorthScreen.tsx', code: 'Math.round(runwayMonths * 10) / 10', n: 1, verdict: 'kept', display_only: true,
    why: 'DISPLAY ONLY, never saved: the emergency fund\'s months as the card prints them, one decimal; the bar and the word beside the months are drawn from this printed figure on purpose, so they can never disagree with it' },
  // ── a screen change, drawn before it is built (mock-first order) ──
  { file: 'src/screens/RetirementCockpit.tsx', code: 'Math.round(planGrowth * 1000) / 10', n: 2, verdict: 'kept',
    why: 'the scenario dials start from the plan cut to one decimal of a percent, and "Use as my plan" saves what the dials hold — an untouched 5.63% return is saved back as 5.6%' },
  { file: 'src/screens/RetirementCockpit.tsx', code: 'Math.round(planInfl * 1000) / 10', n: 2, verdict: 'kept', why: 'the same dials — inflation' },
  { file: 'src/screens/RetirementCockpit.tsx', code: 'Math.round((A.salaryGrowth ?? 0) * 1000) / 10', n: 1, verdict: 'kept', why: 'the same dials — raises' },
  { file: 'src/screens/RetirementCockpit.tsx', code: 'Math.round((a.expectedReturn ?? planGrowth) * 1000) / 10', n: 1, verdict: 'kept', why: 'the same dials, loading a saved scenario — return' },
  { file: 'src/screens/RetirementCockpit.tsx', code: 'Math.round((a.inflation ?? planInfl) * 1000) / 10', n: 1, verdict: 'kept', why: 'the same dials, loading a saved scenario — inflation' },
  { file: 'src/screens/RetirementCockpit.tsx', code: 'Math.round((a.salaryGrowth ?? A.salaryGrowth ?? 0) * 1000) / 10', n: 1, verdict: 'kept', why: 'the same dials, loading a saved scenario — raises' },
  { file: 'src/screens/RothScreen.tsx', code: 'Math.round((cost / amt) * 100) / 100', n: 1, verdict: 'kept',
    why: 'the tax rate is cut to a whole percent and the tax bill is worked from the cut rate; the exact rate changes the bill the screen prints ($10,000 at 22.34% is about $2,234, not $2,200), and the screen prints the rate as a whole percent' },
  // ── a reader prints the kept value as it is, so the reader must format it first ──
  { file: 'src/services/economicData.ts', code: 'Math.round(rate * 100) / 100', n: 2, verdict: 'kept',
    why: 'the fetched inflation and ten-year Treasury rates are cut to two decimals before they are kept; app/invest.tsx prints the kept Treasury rate as it is ({treasuryYield}%)' },
];

function walkApp(dir: string, out: string[] = []): string[] {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) { if (d.name !== '__tests__' && d.name !== 'node_modules') walkApp(p, out); }
    else if (/\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) && !/\.d\.ts$/.test(d.name)) out.push(p);
  }
  return out;
}

/** The store's actions, read from its own type — never typed from memory. */
function storeActions(): Set<string> {
  const file = path.join(ROOT, 'src/store/useStore.ts');
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const out = new Set<string>();
  for (const st of sf.statements) {
    if (!ts.isTypeAliasDeclaration(st) || st.name.text !== 'AppState' || !ts.isTypeLiteralNode(st.type)) continue;
    for (const m of st.type.members) {
      if ((ts.isPropertySignature(m) && m.type && ts.isFunctionTypeNode(m.type)) || ts.isMethodSignature(m)) out.add(m.name.getText(sf));
    }
  }
  return out;
}

const POWER_OF_TEN = (n: ts.Node) => ts.isNumericLiteral(n) && Number(n.text) >= 10 && Number.isInteger(Math.log10(Number(n.text)));
const unparen = (e: ts.Node): ts.Node => { while (ts.isParenthesizedExpression(e)) e = e.expression; return e; };
const isMathCall = (n: ts.Node, names = ['round', 'floor', 'ceil', 'trunc']): n is ts.CallExpression =>
  ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression)
  && n.expression.expression.text === 'Math' && names.includes(n.expression.name.text);
const isToFixedCall = (n: ts.Node) => { const u = unparen(n); return ts.isCallExpression(u) && ts.isPropertyAccessExpression(u.expression) && u.expression.name.text === 'toFixed'; };
function multipliesByPowerOfTen(n: ts.Node): boolean {
  let found = false;
  (function look(x: ts.Node) {
    if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.AsteriskToken && (POWER_OF_TEN(unparen(x.left)) || POWER_OF_TEN(unparen(x.right)))) found = true;
    ts.forEachChild(x, look);
  })(n);
  return found;
}

/** Climb past brackets, `a ? x : y`, `x as T`, `x!`, `-x` and Math.abs / max / min(…, x, …) — none of them gives the
 *  number more or fewer decimals, so none changes whether it ends as words or as a kept value. */
function climb(n: ts.Node): ts.Node {
  let cur = n;
  for (;;) {
    const p = cur.parent;
    if (!p) return cur;
    if (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p)
      || (ts.isPrefixUnaryExpression(p) && p.operator === ts.SyntaxKind.MinusToken)
      || (isMathCall(p, ['abs', 'max', 'min']) && p.arguments.some((a) => a === cur))
      || (ts.isConditionalExpression(p) && (p.whenTrue === cur || p.whenFalse === cur))) { cur = p; continue; }
    return cur;
  }
}
/** Does the number become words right here? */
function becomesWords(n: ts.Node): boolean {
  const top = climb(n);
  const p = top.parent;
  if (!p) return false;
  if (ts.isTemplateSpan(p) || ts.isJsxExpression(p)) return true;
  if (ts.isPropertyAccessExpression(p) && p.expression === top && ['toFixed', 'toLocaleString', 'toString'].includes(p.name.text)) return true;
  if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === 'String') return true;
  return false;
}
/** …or is it put in a const that is used only where it becomes words? */
function constUsedOnlyAsWords(n: ts.Node, sf: ts.SourceFile): boolean {
  const top = climb(n);
  const decl = top.parent;
  if (!decl || !ts.isVariableDeclaration(decl) || decl.initializer !== top || !ts.isIdentifier(decl.name)) return false;
  const list = decl.parent;
  if (!ts.isVariableDeclarationList(list) || !(list.flags & ts.NodeFlags.Const)) return false;
  const scope = list.parent?.parent;   // the block (or file) the declaration sits in
  if (!scope) return false;
  const name = decl.name.text;
  const uses: ts.Identifier[] = [];
  (function find(x: ts.Node) { if (ts.isIdentifier(x) && x.text === name && x !== decl.name) uses.push(x); ts.forEachChild(x, find); })(scope);
  return uses.length > 0 && uses.every((u) => becomesWords(u));
}
function insideStoreCall(n: ts.Node, actions: Set<string>): string | null {
  for (let cur: ts.Node = n, p = n.parent; p; cur = p, p = p.parent) {
    if (ts.isCallExpression(p) && p.arguments.some((a) => a === cur)) {
      const c = p.expression;
      const name = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : null;
      if (name && actions.has(name)) return name;
    }
  }
  return null;
}

type Hit = { file: string; line: number; code: string; kind: 'shortening' | 'whole'; verdict: 'words' | Verdict | 'not judged' };
export function roundingsIn(rel: string, text: string, actions: Set<string>): Hit[] {
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const inStore = rel.startsWith('src/store/');
  const hits: Hit[] = [];
  const inner = new Set<ts.Node>();   // the Math.round inside a shortening idiom is not counted a second time
  const add = (n: ts.Node, kind: Hit['kind']) => {
    const where = insideStoreCall(n, actions);
    const words = becomesWords(n) || (kind === 'shortening' && constUsedOnlyAsWords(n, sf));
    const verdict: Hit['verdict'] = words ? 'words'
      : (inStore || where) ? 'saved'
      : kind === 'shortening' ? 'kept' : 'not judged';
    hits.push({ file: rel, line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, code: n.getText(sf).replace(/\s+/g, ' '), kind, verdict });
  };
  (function visit(n: ts.Node) {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.SlashToken && POWER_OF_TEN(unparen(n.right))) {
      const l = unparen(n.left);
      if (isMathCall(l) && l.arguments[0] && multipliesByPowerOfTen(l.arguments[0])) { add(n, 'shortening'); inner.add(l); }
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      if (n.expression.text === 'round2') add(n, 'shortening');
      if (['Number', 'parseFloat'].includes(n.expression.text) && n.arguments[0] && isToFixedCall(n.arguments[0])) add(n, 'shortening');
    }
    if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.PlusToken && isToFixedCall(n.operand)) add(n, 'shortening');
    ts.forEachChild(n, visit);
  })(sf);
  (function visit(n: ts.Node) {
    if (isMathCall(n) && !inner.has(n)) add(n, 'whole');
    ts.forEachChild(n, visit);
  })(sf);
  return hits;
}

test('DEC-0403 — "held as a float, decimals shown only for prices": nothing is rounded when it is saved, in the store or on a screen', () => {
  // every folder under src/ is accounted for — a new one cannot sit outside both tests unnoticed
  const srcDirs = fs.readdirSync(path.join(ROOT, 'src'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `src/${d.name}`);
  const unaccounted = srcDirs.filter((d) => !(d in SAVE_ROOTS) && !(d in NOT_READ_HERE));
  expect(unaccounted).toEqual([]);

  const actions = storeActions();
  expect(actions.size).toBeGreaterThanOrEqual(90);              // 102 on 2026-10-20
  for (const a of ['addAsset', 'updateAsset', 'addGoal', 'fundGoals', 'captureMonthlySnapshot', 'saveRetirementScenario']) expect(actions.has(a)).toBe(true);

  const hits: Hit[] = [];
  const seen: Record<string, number> = {};
  for (const root of Object.keys(SAVE_ROOTS)) {
    for (const file of walkApp(path.join(ROOT, root))) {
      seen[root] = (seen[root] ?? 0) + 1;
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      hits.push(...roundingsIn(rel, fs.readFileSync(file, 'utf8'), actions));
    }
  }
  for (const [root, floor] of Object.entries(SAVE_ROOTS)) expect([root, (seen[root] ?? 0) >= floor ? 'ok' : `only ${seen[root] ?? 0} files`]).toEqual([root, 'ok']);
  const total = Object.values(seen).reduce((t, n) => t + n, 0);
  expect(total).toBeGreaterThanOrEqual(150);                    // 180 on 2026-10-20

  const shortening = hits.filter((h) => h.kind === 'shortening');
  const words = hits.filter((h) => h.verdict === 'words');
  const judged = hits.filter((h) => h.verdict === 'kept' || h.verdict === 'saved');
  const notJudged = hits.filter((h) => h.verdict === 'not judged');
  // the detector itself must still fire: 25 shortening roundings were found on 2026-10-20, 8 of them words on screen; 18 on
  // 2026-10-21, after the Holding page's spoken percents moved to the two-decimal formatter its figures use (three
  // one-decimal roundings in its spoken words removed, not hidden) — the floor is the true number found that day
  expect(shortening.length).toBeGreaterThanOrEqual(18);
  expect(words.length).toBeGreaterThanOrEqual(6);

  const key = (file: string, verdict: string, code: string) => `${file} | ${verdict} | ${code}`;
  const count: Record<string, number> = {};
  for (const h of judged) count[key(h.file, h.verdict, h.code)] = (count[key(h.file, h.verdict, h.code)] ?? 0) + 1;
  const carried = new Map(CARRIED.map((c) => [key(c.file, c.verdict, c.code), c]));
  const offenders = judged.filter((h) => !carried.has(key(h.file, h.verdict, h.code))).map((h) => `${h.file}:${h.line} ${h.verdict.toUpperCase()} — ${h.code}`);
  const stale = CARRIED.filter((c) => (count[key(c.file, c.verdict, c.code)] ?? 0) !== c.n)
    .map((c) => `${c.file} — "${c.code}" is carried ${c.n}× but found ${count[key(c.file, c.verdict, c.code)] ?? 0}× — correct CARRIED to the true number`);

  const owed = CARRIED.filter((c) => !c.display_only).reduce((t, c) => t + c.n, 0);
  // printed every run, so the debt is never hidden to stay green
  // eslint-disable-next-line no-console
  console.log(`DEC-0403 save guard: ${total} files read · ${hits.length} roundings found · ${words.length} become words (allowed) · `
    + `${judged.length} round a kept value — ${owed} owed, ${judged.length - owed} display-only, each carried with its reason · `
    + `${notJudged.length} whole-number roundings not handed to the store, not judged (mostly whole dollars a screen prints)`);

  expect(offenders).toEqual([]);
  expect(stale).toEqual([]);
});

test('DEC-0403 — the save guard tells words from a saved value (it is fed one of each, so it proves it still fires)', () => {
  const actions = new Set(['addAsset']);
  const src = [
    'const a = round2(x);',                                      // kept
    'store.addAsset({ balance: Math.round(v) });',               // saved — a whole-number rounding handed to the store
    'const t = `${Math.round(r * 1000) / 10}%`;',                // words
    'const p = Math.round(q * 1000) / 10; const s = <Text>{p}%</Text>;',   // words, through a const used only as words
    'const k = Number(z.toFixed(2));',                           // kept
    'const w = Math.round(y);',                                   // not judged
  ].join('\n');
  const v = roundingsIn('src/screens/Fixture.tsx', src, actions).map((h) => `${h.kind}:${h.verdict}`);
  expect(v).toEqual(['shortening:kept', 'shortening:words', 'shortening:words', 'shortening:kept', 'whole:saved', 'whole:not judged']);
  // in the store every rounding is a saved one — the store prints nothing
  expect(roundingsIn('src/store/x.ts', 'const b = Math.round(c);', actions).map((h) => h.verdict)).toEqual(['saved']);
});
