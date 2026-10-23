/** GUARD D1 — nobody in the kitchen (build spec moneykeel_build_spec_guards-before-a-build_v01.md).
 *
 *  A screen asks an orchestrator; it never calls a dependent function directly, because a dependent
 *  function is one step in a chain and a screen that reaches into the chain can show a number the
 *  chain's own answer disagrees with (the July-24 audit's top finding).
 *
 *  What a function IS comes from the build, not from a guess: the builder writes every function's
 *  category to Calculation Module code/scripts/moneykeel_function_categories.json, and this guard
 *  reads the imports of every screen, component, route and onboarding file against it.
 *
 *  THE BASELINE. On 2026-09-12, 18 such imports stood in 9 files (listed below). This guard is a
 *  ratchet: a file may only shrink its count, and no new file may appear — so the debt is paid down
 *  and never added to. When a file reaches zero, delete its line. Nine files, eighteen imports, owed.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const CATEGORIES = 'Calculation Module code/scripts/moneykeel_function_categories.json';
const SCREEN_ROOTS = ['src/screens', 'src/components', 'app', 'src/onboarding'];
const CALC = /(src\/domain|MoneyKeel\/functions|Calculation Module code\/engines|src\/services|src\/store)/;

/** file → the number of dependent-function imports it carried on 2026-09-12. Only ever goes down. */
const BASELINE: Record<string, number> = {
  'src/onboarding/modules.tsx': 7,
  // HomeScreen and ImportHoldingsScreen reached zero on 2026-10-20: their one import each was round2, the cents
  // rounding, which no longer runs on a value being saved (DEC-0403) — so their lines are gone, as this ratchet asks.
  'src/screens/IncomeDetailScreen.tsx': 2,
  'src/screens/SsTimingScreen.tsx': 1,
  'src/screens/TaxOrganizerScreen.tsx': 2,
};

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}

/** The dependent functions a screen file imports from the calculation code, by name and identifier. */
export function dependentImports(file: string, text: string, cats: Record<string, { id: string; category: string }>): string[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause?.namedBindings || !ts.isNamedImports(st.importClause.namedBindings)) continue;
    const spec = (st.moduleSpecifier as ts.StringLiteral).text;
    if (!CALC.test(path.normalize(path.join(path.dirname(file), spec)))) continue;
    for (const el of st.importClause.namedBindings.elements) {
      const name = (el.propertyName ?? el.name).text;
      const c = cats[name];
      if (c && /^3 · DEPENDENT/.test(c.category)) out.push(`${name} (${c.id})`);
    }
  }
  return out;
}

test('D1: a screen never reaches past an orchestrator — and the 2026-09-12 debt only shrinks', () => {
  const cats = JSON.parse(fs.readFileSync(CATEGORIES, 'utf8'));
  const found: Record<string, string[]> = {};
  for (const root of SCREEN_ROOTS) {
    for (const file of walk(root)) {
      const hits = dependentImports(file, fs.readFileSync(file, 'utf8'), cats);
      if (hits.length) found[file] = hits;
    }
  }
  const offences: string[] = [];
  for (const [file, hits] of Object.entries(found)) {
    const allowed = BASELINE[file];
    if (allowed == null) offences.push(`${file} is NEW to this list — ${hits.join(', ')} (ask the orchestrator instead)`);
    else if (hits.length > allowed) offences.push(`${file} grew from ${allowed} to ${hits.length} — ${hits.join(', ')}`);
  }
  for (const file of Object.keys(BASELINE)) {
    if (!found[file]) offences.push(`${file} is clean now — delete its BASELINE line so the ratchet holds at zero`);
  }
  expect(offences).toEqual([]);
});

/* ═══ D1b — A SCREEN DOES NO ARITHMETIC ON A FIGURE (2026-10-22, W-HOLDING; DEC-0346 "screens compute nothing") ═══════════════
 *
 *  The import check above cannot see a screen that adds figures up itself — the decisions check found DEC-0346 breached on four
 *  sites that import nothing they should not: the Performance tab added "All categories" up on screen, and the account page
 *  added share counts, added each row's income into the income sum, and decided on screen which rows are the whole account.
 *  This reads every expression of every screen, component, route and onboarding file and counts the ones that work a figure
 *  out: a list folded with reduce, decimal arithmetic (Dec), and +, −, ×, ÷ on a figure, or a comparison of two figures. A
 *  figure is a member or name a person reads as money or a count — value, balance, income, earned, shares, total, amount,
 *  paid, cost, gain, price, cash, ending, beginning and the rest of FIGURE_WORDS. Layout arithmetic (widths, indexes) names
 *  none of them and is not counted.
 *
 *  THE BASELINE carries the true number per file on 2026-10-22, after the four sites (and the others of their kind on the same
 *  two screens) moved into the functions those screens read. Before the move the two screens stood at 3 (PerformanceScreen)
 *  and 10 (AccountPortfolioScreen) — 97 places in 28 files — and the guard went red on all four sites; both are at 0 now. A
 *  ratchet: a file may only shrink, and a file that shrinks lowers its line; no new file may appear. */
const FIGURE_WORDS = /^(balance|balances|value|values|income|earned|shares|total|totals|amount|paid|cost|costBasis|gain|gains|marketValue|startValue|ending|beginning|cash|price|worth|basis|dividends|interest|contributions|withdrawals)$/i;
const ARITH_OPS = new Set([ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken]);
const COMPARE_OPS = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.LessThanEqualsToken]);

/** Every place in one file that works a figure out, and how many expressions were read to find them. */
export function figureArithmetic(file: string, text: string): { hits: string[]; read: number; skipped: number } {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: string[] = [];
  let read = 0, skipped = 0;
  const line = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const unwrap = (n: ts.Expression | undefined): ts.Expression | undefined => {
    while (n) {
      if (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n) || ts.isAsExpression(n)) { n = n.expression; continue; }
      if (ts.isBinaryExpression(n) && (n.operatorToken.kind === ts.SyntaxKind.BarBarToken || n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) { n = n.left; continue; }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.getText(sf) === 'Math' && n.arguments.length === 1) { n = n.arguments[0]; continue; }
      break;
    }
    return n;
  };
  const isFigure = (n: ts.Expression): boolean => {
    const u = unwrap(n);
    const name = !u ? null : ts.isPropertyAccessExpression(u) ? u.name.text : ts.isIdentifier(u) ? u.text : null;
    return name != null && FIGURE_WORDS.test(name);
  };
  const isWords = (n: ts.Expression) => { const u = unwrap(n); return !!u && (ts.isStringLiteral(u) || ts.isTemplateExpression(u) || ts.isNoSubstitutionTemplateLiteral(u)); };
  const decRoot = (n: ts.Expression): boolean => {
    let x: ts.Expression = n;
    while (ts.isCallExpression(x) || ts.isPropertyAccessExpression(x)) x = x.expression;
    return ts.isIdentifier(x) && x.text === 'Dec';
  };
  const visit = (n: ts.Node, inFold: boolean, inSort: boolean) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      read++;
      const m = n.expression.name.text;
      if (m === 'reduce') { hits.push(`${line(n)} folds a list with reduce`); n.forEachChild((c) => visit(c, true, inSort)); return; }
      if (m === 'sort') { n.forEachChild((c) => visit(c, inFold, true)); return; }
      if (decRoot(n) && !ts.isPropertyAccessExpression(n.parent)) hits.push(`${line(n)} decimal arithmetic (Dec)`);
    }
    if (ts.isBinaryExpression(n) && (ARITH_OPS.has(n.operatorToken.kind) || COMPARE_OPS.has(n.operatorToken.kind))) {
      read++;
      const arith = ARITH_OPS.has(n.operatorToken.kind);
      const counts = !isWords(n.left) && !isWords(n.right)
        && (arith ? isFigure(n.left) || isFigure(n.right) : isFigure(n.left) && isFigure(n.right));
      if (counts && inSort) skipped++;   // the order rows are drawn in, not a figure: explained, and counted
      else if (counts && !inFold) hits.push(`${line(n)} ${n.getText(sf).replace(/\s+/g, ' ').slice(0, 70)}`);
    }
    n.forEachChild((c) => visit(c, inFold, inSort));
  };
  visit(sf, false, false);
  return { hits, read, skipped };
}

/** file → the places it worked a figure out on 2026-10-22. Only ever goes down. */
const ARITH_BASELINE: Record<string, number> = {
  // 75 places in 23 files on 2026-10-22, the true number: 97 in 28 before the account page and the Performance tab moved theirs,
  // 84 in 26 before the Net worth screens moved theirs (NetWorthScreen 7, ItemizeScreen 1, BondsScreen 1). Every Net worth and
  // Performance screen is at 0, and the test below holds each one there by name
  'app/invest.tsx': 1,
  'app/savings.tsx': 1,
  'src/components/MoneySheets.tsx': 3,
  'src/components/PlanInputs.tsx': 3,
  'src/components/PlanSlider.tsx': 2,
  'src/onboarding/modules.tsx': 19,
  'src/screens/BigCostsScreen.tsx': 1,
  'src/screens/BillCalendarScreen.tsx': 1,
  'src/screens/BudgetScreen.tsx': 6,
  'src/screens/CashFlowScreen.tsx': 4,
  'src/screens/CreditScreen.tsx': 1,
  'src/screens/ExpenseScreen.tsx': 1,
  'src/screens/GoalsScreen.tsx': 3,
  'src/screens/HomeScreen.tsx': 4,
  'src/screens/ImportHoldingsScreen.tsx': 2,
  'src/screens/IncomeDetailScreen.tsx': 1,
  'src/screens/IncomeManagerScreen.tsx': 1,
  'src/screens/InsightsScreen.tsx': 3,
  'src/screens/PlanHubScreen.tsx': 1,
  'src/screens/RetirementCockpit.tsx': 10,
  'src/screens/RothScreen.tsx': 2,
  'src/screens/SettingsScreen.tsx': 1,
  'src/screens/TipsScreen.tsx': 4,
};

test('D1b: a screen works no figure out — and the 2026-10-22 debt only shrinks', () => {
  const found: Record<string, string[]> = {};
  let files = 0, read = 0, skipped = 0;
  const readIn: Record<string, number> = {};
  for (const root of SCREEN_ROOTS) {
    for (const file of walk(root)) {
      files++;
      const r = figureArithmetic(file, fs.readFileSync(file, 'utf8'));
      read += r.read; skipped += r.skipped; readIn[file] = r.read;
      if (r.hits.length) found[file] = r.hits;
    }
  }
  // A GUARD MUST PROVE IT LOOKED: the files and the expressions it read, and what it set aside and why
  expect(files).toBeGreaterThanOrEqual(140);
  expect(read).toBeGreaterThanOrEqual(3000);
  // THE NET WORTH AND PERFORMANCE SCREENS, BY NAME (2026-10-22, both modules launch-ready): each was read — at least the number
  // of expressions it held that day, less a margin, so a screen that stops being read goes red — and works out no figure
  const HELD_AT_ZERO: Record<string, number> = {
    'src/screens/NetWorthScreen.tsx': 400, 'src/screens/AccountPortfolioScreen.tsx': 280, 'src/screens/HoldingDetailScreen.tsx': 70,
    'src/screens/ItemizeScreen.tsx': 45, 'src/screens/BondsScreen.tsx': 95, 'src/screens/OtherInvestmentsScreen.tsx': 40,
    'src/screens/AddAccountScreen.tsx': 120, 'src/screens/PerformanceScreen.tsx': 230, 'src/screens/LookBackScreen.tsx': 35,
  };
  for (const [file, floor] of Object.entries(HELD_AT_ZERO)) {
    expect([file, (readIn[file] ?? 0) >= floor ? 'read' : `read only ${readIn[file] ?? 0}`, found[file] ?? []]).toEqual([file, 'read', []]);
  }
  // eslint-disable-next-line no-console
  console.log(`D1b read ${read} expressions in ${files} files; ${Object.values(found).flat().length} places work a figure out in ${Object.keys(found).length} files; ${skipped} comparisons inside a sort's ordering set aside`);
  const offences: string[] = [];
  for (const [file, hits] of Object.entries(found)) {
    const allowed = ARITH_BASELINE[file];
    if (allowed == null) offences.push(`${file} is NEW to this list — ${hits.join('; ')} (ask the function the screen reads instead)`);
    else if (hits.length > allowed) offences.push(`${file} grew from ${allowed} to ${hits.length} — ${hits.join('; ')}`);
    else if (hits.length < allowed) offences.push(`${file} is down to ${hits.length} from ${allowed} — lower its BASELINE line so the ratchet holds`);
  }
  for (const file of Object.keys(ARITH_BASELINE)) if (!found[file]) offences.push(`${file} is clean now — delete its BASELINE line`);
  expect(offences).toEqual([]);
});

test('D1b proves it still fires: each of the four sites of 2026-10-22, written as they stood, is caught', () => {
  const site = (code: string) => figureArithmetic('x.tsx', code).hits.length;
  expect(site('const total = shown.reduce((n, b) => n + b.earned, 0);')).toBe(1);                                   // All categories
  expect(site('const sh = (p.lots ?? []).reduce((t, l) => t + (l.shares || 0), 0);')).toBe(1);                      // share counts
  expect(site('const n = Number(Dec.of(inc.dividends || 0).add(Dec.of(inc.interest || 0)).toString());')).toBe(2);  // the income sum
  expect(site('const w = Math.round(value) === Math.round(account.balance || 0);')).toBe(1);                       // the whole account
  // and what it does not count: layout, words, a row's order
  expect(site('const w = width - 2 * pad; const s = `${a} b`; rows.sort((x, y) => y.value - x.value);')).toBe(0);
});
