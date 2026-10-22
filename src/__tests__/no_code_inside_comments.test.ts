/** NO LIVE CODE INSIDE A COMMENT — found by the launch check of 2026-10-20 (commit b1017749).
 *
 *  A note appended to the END of a line of code with `//` turns everything after it on that line into comment. Twice,
 *  a note was put in the middle of a line, and the statements after it stopped running without any test or the
 *  compiler noticing:
 *    · src/screens/BondsScreen.tsx — `// (DEC-4036f, 2026-10-10) unstated stays unstated setInstitution(…); setSellAmt('');
 *      setValueAsOf(…);` — so editing a bond and saving wiped its institution and reset its "Value as of".
 *    · src/screens/OtherInvestmentsScreen.tsx — the same note swallowed `setSellAmt(''); setValueAsOf(…);` — so saving
 *      an alternative reset its "Value as of" to today.
 *
 *  THE SHAPE LOOKED FOR: a `//` comment holding a statement — `name(…);` — followed by another call. Words about code
 *  ("calls foo(x)") do not have that shape; a line of code pasted after a note does. Block comments (the generated
 *  headers, which quote formulas) are not read: a `/* … *\/` comment ends where it says, so it cannot swallow a line.
 *
 *  It reads the disk (src, app, MoneyKeel/functions, Calculation Module code/engines), says how many files it read and
 *  what it skipped, and fails below a floor, so a pattern that stops matching goes red rather than quiet.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const ROOTS = ['src', 'app', 'MoneyKeel/functions', 'Calculation Module code/engines'];

/** A statement — a call closed by ";" (one level of nested brackets allowed) — and then another call. */
export const CODE_IN_COMMENT = /[A-Za-z_$][\w$.?]*\((?:[^()]|\([^()]*\))*\)\s*;\s*[A-Za-z_$][\w$.?]*\(/;

interface Walked { files: string[]; skipped: { tests: number; declarations: number } }
function walk(dir: string, out: Walked) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (d.name === 'node_modules') continue;
      if (d.name === '__tests__') { out.skipped.tests += countTs(p); continue; }
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(d.name)) {
      if (/\.d\.ts$/.test(d.name)) out.skipped.declarations += 1;
      else if (/\.test\./.test(d.name)) out.skipped.tests += 1;
      else out.files.push(p);
    }
  }
}
function countTs(dir: string): number {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, d) =>
    n + (d.isDirectory() ? countTs(path.join(dir, d.name)) : /\.(ts|tsx)$/.test(d.name) ? 1 : 0), 0);
}

/** Every `//` comment in a file, read by the TypeScript parser (so a `//` inside a string or a URL is not a comment). */
export function lineComments(file: string, text: string): { text: string; line: number }[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const seen = new Set<number>();
  const out: { text: string; line: number }[] = [];
  const take = (r: ts.CommentRange) => {
    if (r.kind !== ts.SyntaxKind.SingleLineCommentTrivia || seen.has(r.pos)) return;
    seen.add(r.pos);
    out.push({ text: text.slice(r.pos, r.end), line: sf.getLineAndCharacterOfPosition(r.pos).line + 1 });
  };
  const visit = (n: ts.Node) => {
    ts.getLeadingCommentRanges(text, n.getFullStart())?.forEach(take);
    ts.getTrailingCommentRanges(text, n.getEnd())?.forEach(take);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

export function codeInComments(): { offences: string[]; walked: Walked; comments: number } {
  const walked: Walked = { files: [], skipped: { tests: 0, declarations: 0 } };
  for (const r of ROOTS) walk(path.join(ROOT, r), walked);
  const offences: string[] = [];
  let comments = 0;
  for (const f of walked.files) {
    const cs = lineComments(f, fs.readFileSync(f, 'utf8'));
    comments += cs.length;
    for (const c of cs) if (CODE_IN_COMMENT.test(c.text)) offences.push(`${path.relative(ROOT, f)}:${c.line} — ${c.text.slice(0, 160)}`);
  }
  return { offences, walked, comments };
}

test('no `//` comment swallows a line of code', () => {
  const { offences, walked, comments } = codeInComments();
  // eslint-disable-next-line no-console
  console.log(`no_code_inside_comments: read ${walked.files.length} files and ${comments} line comments under ${ROOTS.join(', ')}; `
    + `skipped ${walked.skipped.tests} test files and ${walked.skipped.declarations} type-declaration files (.d.ts).`);
  expect(walked.files.length).toBeGreaterThanOrEqual(250);   // 2026-10-20: the four roots held more than 250 source files
  expect(comments).toBeGreaterThanOrEqual(5000);
  expect(offences).toEqual([]);
}, 120_000);

test('the pattern catches the two lines it was written for, and not a note that names a function', () => {
  expect(CODE_IN_COMMENT.test("// (DEC-4036f, 2026-10-10) unstated stays unstated setInstitution(bond?.institution ?? ''); setSellAmt(''); setValueAsOf(bond?.value_as_of ?? '');")).toBe(true);
  expect(CODE_IN_COMMENT.test("// (DEC-4036f, 2026-10-10) unstated stays unstated setSellAmt(''); setValueAsOf(item?.value_as_of ?? '');")).toBe(true);
  expect(CODE_IN_COMMENT.test('// the rate comes from benchmarkReturn(kind), the same reader the editor uses')).toBe(false);
  expect(CODE_IN_COMMENT.test('// see https://example.com/a(b)')).toBe(false);
});
