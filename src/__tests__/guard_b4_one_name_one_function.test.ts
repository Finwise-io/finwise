/** GUARD B4 — no name means two things (build spec moneykeel_build_spec_guards-before-a-build_v01.md).
 *
 *  A function name declared in more than one file of the calculation code is two functions
 *  answering to one identifier — the 2026-08-26 sweep found eleven such names across 26
 *  declarations (round2 five times, moneyWeightedReturn twice as two different methods). They were
 *  consolidated by 2026-09-12; this guard holds the count at ZERO so it cannot creep back.
 *
 *  Scope = the roots the function sweep reads (moneykeel_functions.py CALC_ROOTS), because those are
 *  the functions that carry identifiers. A screen-local helper (`num` in twenty screens) is outside
 *  this guard — screens are not calculation code — and is named as owed in the build spec.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const CALC_ROOTS = ['src/domain', 'MoneyKeel/functions', 'Calculation Module code/engines', 'src/services', 'src/store'];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' || d.name === '__mocks__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) && !/\.d\.ts$/.test(d.name) ? [p] : [];
  });
}

/** Top-level function names in a file: `function f` and `const f = () => …` / `function () {}`. */
export function topLevelFunctionNames(file: string, text: string): string[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) out.push(st.name.text);
    else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) out.push(d.name.text);
      }
    }
  }
  return out;
}

test('B4: no function name is declared in more than one file of the calculation code', () => {
  const where = new Map<string, string[]>();
  for (const root of CALC_ROOTS) {
    for (const file of walk(root)) {
      for (const name of topLevelFunctionNames(file, fs.readFileSync(file, 'utf8'))) {
        where.set(name, [...(where.get(name) ?? []), file]);
      }
    }
  }
  const twice = [...where.entries()].filter(([, files]) => new Set(files).size > 1)
    .map(([name, files]) => `${name} — ${[...new Set(files)].join(' · ')}`).sort();
  expect(twice).toEqual([]);
});
