/** THE ABOUT MARK IS ONE MARK, WRITTEN ONE WAY, AGAINST ITS FIGURE: "~$6,196" (FX-CF-A 2026-11-01, round-4 CF4-02; widened by
 *  FX-SHARED the same day under the lead's ruling R25, one mark for 'about', his one-term rule of 2026-09-02, tenet 4).
 *
 *  CF4-02 settled the spacing: no space between the mark and its figure. R25 settled the mark: Net worth printed '~' as its approved
 *  drawings draw it (v08, DEC-0644; Alternatives and Bonds v02, DEC-0650: 15 marks on their phones) and Cash flow printed '≈' (income
 *  v07, approved 2026-09-02: 9 on its phones). The newer and more numerous approvals draw '~', the code printed '~' 55 times to '≈' 40, and
 *  his recorded wording for MK-NW-M-015 is "~$X". The 40 '≈' moved to '~'; the income drawing's rule 9 carries a dated row saying so.
 *
 *  What this reads, from the disk: every non-test .ts and .tsx file under src and MoneyKeel/functions; in each, every string, template
 *  piece and JSX text — never a comment (a comment's hand working may write ≈). It fails on any '≈' in printed text, and on "~ " followed
 *  by a figure: a "$" or a digit in the same text, or the end of the text where a filled-in figure or a nested <Text> follows.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const MARKS_FLOOR = 95;   // 95 '~' marks in strings on 2026-11-01 after R25 (55 Net worth and Plan always printed, 40 Cash flow's '≈' moved); the true count (PF-TOOLS, 2026-11-02; it sat just under at 93)
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
  return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && !/\.d\.ts$/.test(e.name) ? [p] : [];
});

function scan(file: string) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = []; const retired: string[] = []; let marks = 0;
  const visit = (n: ts.Node) => {
    const lit = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n);
    if (lit) {
      const text = (n as any).text as string;
      const where = `${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: ${text.trim().slice(0, 80)}`;
      // R25 (2026-11-01, the lead's ruling, FX-SHARED): ONE MARK FOR 'ABOUT' — '~', as the approved drawings draw it; '≈' is retired
      if (/≈/.test(text)) retired.push(where);
      // a '~' that is the about mark: before a figure, a filled-in figure or a nested <Text> (not '~' inside a word or a path)
      const asMark = /(^|[\s(‘'"·:—–-])~(?=\s?[$\d−]|\s?$)/;
      if (asMark.test(text)) marks += (text.match(/~(?=\s?[$\d−]|\s?$)/g) ?? []).length;
      const spaced = /~ (?=[$\d])/.test(text)
        || ((ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isJsxText(n)) && /(^|[\s(])~ $/.test(text));
      if (spaced) hits.push(where);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { hits, marks, retired };
}

test('every about-mark the app prints is ‘~’, against its figure — "~$326/month", never "≈$326/month" or "~ $326/month" — and the guard proves it looked', () => {
  const files = ['src', 'MoneyKeel/functions'].flatMap((d) => walk(path.join(ROOT, d)));
  let marks = 0; const hits: string[] = []; const retired: string[] = [];
  for (const f of files) { const r = scan(f); marks += r.marks; hits.push(...r.hits); retired.push(...r.retired); }
  // IT LOOKED (2026-11-01, R25): 234 files; the 40 '≈' that Cash flow printed are '~' now, beside the '~' Net worth always printed
  console.log(`about mark: ${files.length} files, ${marks} ~ marks in strings, ${retired.length} ≈ left`);
  expect(files.length).toBeGreaterThanOrEqual(234);
  expect(marks).toBeGreaterThanOrEqual(MARKS_FLOOR);
  expect(retired).toEqual([]);
  expect(hits).toEqual([]);
});

test('the guard catches what it is for', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'approx-'));
  const f = path.join(dir, 'Probe.tsx');
  fs.writeFileSync(f, "const a = '~ $5'; const b = `~ ${x}/month`; const c = <T>~ <T>{x}</T></T>; const d = '~$5'; const e = `~${x}`; const g = '≈$5'; const h = `(≈${x})`; // ≈ $9 in a comment\n");
  const r = scan(f);
  expect(r.hits).toHaveLength(3);
  expect(r.retired).toHaveLength(2);
  fs.rmSync(dir, { recursive: true, force: true });
});

// THE OLD ANSWER, KEPT (the test-change rule): before R25 Cash flow printed '≈' — 40 marks, e.g. 'Take-home ≈$9,242/month'. 160 expected
// strings in 16 test files moved from '≈' to '~' on 2026-11-01; this holds the answer they used to give, and fails while '~' stands.
test.failing('the old answer: Cash flow prints "≈" before a calculated figure', () => {
  const files = ['src', 'MoneyKeel/functions'].flatMap((d) => walk(path.join(ROOT, d)));
  expect(files.reduce((n, f) => n + scan(f).retired.length, 0)).toBeGreaterThan(0);
});
