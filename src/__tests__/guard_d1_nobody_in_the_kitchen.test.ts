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
  'src/screens/CashFlowScreen.tsx': 1,
  'src/screens/HomeScreen.tsx': 1,
  'src/screens/ImportHoldingsScreen.tsx': 1,
  'src/screens/IncomeDetailScreen.tsx': 2,
  'src/screens/IncomeManagerScreen.tsx': 2,
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
