/** THE APPROXIMATELY MARK IS WRITTEN ONE WAY, AGAINST ITS FIGURE: "≈$6,196" (2026-11-01, FX-CF-A; round-4 item CF4-02, tenet 4).
 *
 *  The income drawing's rule 9 ("Every estimate is prefixed ≈") and cash-flow_v01's line of 2026-10-25 write it with no space; 40 of
 *  the 45 marks on the live drawings do. The app wrote "≈ $326/month" in twelve places — the Debts tab's student loan outlook, the old
 *  Goals screen and ten sign-up lines — beside "≈$6,196" everywhere else.
 *
 *  What this reads, from the disk: every non-test .ts and .tsx file under src and MoneyKeel/functions; in each, every string, template
 *  piece and JSX text — never a comment. It fails on "≈ " followed by a figure: a "$" or a digit in the same text, or the end of the
 *  text where a filled-in figure or a nested <Text> follows ("≈ ${money(x)}", "≈ <Text>…"). A comment's words are not read.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
  return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && !/\.d\.ts$/.test(e.name) ? [p] : [];
});

function scan(file: string) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = []; let marks = 0;
  const visit = (n: ts.Node) => {
    const lit = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n);
    if (lit) {
      const text = (n as any).text as string;
      marks += (text.match(/≈/g) ?? []).length;
      const spaced = /≈ (?=[$\d])/.test(text)
        || ((ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isJsxText(n)) && /≈ $/.test(text));
      if (spaced) hits.push(`${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: ${text.trim().slice(0, 80)}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { hits, marks };
}

test('every ≈ the app prints sits against its figure — "≈$326/month", never "≈ $326/month" — and the guard proves it looked', () => {
  const files = ['src', 'MoneyKeel/functions'].flatMap((d) => walk(path.join(ROOT, d)));
  let marks = 0; const hits: string[] = [];
  for (const f of files) { const r = scan(f); marks += r.marks; hits.push(...r.hits); }
  // IT LOOKED (2026-11-01): 232 files and 40 marks in their strings; the floors sit just under the true numbers
  console.log(`approx mark: ${files.length} files, ${marks} ≈ marks in strings`);
  expect(files.length).toBeGreaterThanOrEqual(234);   // 234 files, 40 ≈ marks on 2026-11-01 (PF-TOOLS)
  expect(marks).toBeGreaterThanOrEqual(40);
  expect(hits).toEqual([]);
});

test('the guard catches what it is for', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'approx-'));
  const f = path.join(dir, 'Probe.tsx');
  fs.writeFileSync(f, "const a = '≈ $5'; const b = `≈ ${x}/month`; const c = <T>≈ <T>{x}</T></T>; const d = '≈$5'; const e = `≈${x}`; // ≈ $9 in a comment\n");
  expect(scan(f).hits).toHaveLength(3);
  fs.rmSync(dir, { recursive: true, force: true });
});
