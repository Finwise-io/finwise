/** EVERY APOSTROPHE A CASH FLOW SCREEN PRINTS IN A WORD IS ’ (2026-10-27, FX-CF-A; the round-2 drawing match, CF2-10).
 *
 *  The approved Cash flow drawings write today’s, haven’t, won’t with the typographic ’, and the app wrote most of its sentences
 *  that way — while nine sentences on the same screens wrote a straight ': "No zeros shown until they're real.", "Based on your
 *  plan's odds …", "plan what you'll spend", "we'll import it", "it's a valid CSV", "Trader Joe's", and on the Bill calendar "it's
 *  built from …", "it's in that month's Out column.", "IF YOU CAN'T PAY EVERYTHING". One sentence spelled two ways on one screen
 *  (tenet 4, DEC-3523) — the class DEC-8336 fixed on Net worth (nw_curly_apostrophe_guard.test.ts).
 *
 *  What this guard reads, from the disk, never from a list typed from memory:
 *   1. Cash flow's own screens, whole — the four tabs and the budget editor (CashFlowScreen, BudgetScreen), the Bill calendar and
 *      Monthly income — found by listing src/screens and asserting each is there;
 *   2. every non-test file in MoneyKeel/functions/cashflow, whole — the sentences the Cash flow doors hand the screens;
 *   3. in each, every string, template text and JSX text — never a comment, never code. A string under a figure's identifier
 *      (MK-CF-M-014: { label, answers, formula … }) is the record's, not the screen's, and is counted as skipped;
 *   4. a straight ' between two letters (it's), or straight after a name filled in (${name}'s), fails the build.
 *  The shared parts these screens print (src/components) and the income screens and sign-up are read by their owners' checks.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const SCREENS = ['CashFlowScreen', 'BudgetScreen', 'BillCalendarScreen', 'MonthlyIncomeScreen'];
const parse = (f: string) => ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const underFigure = (n: ts.Node) => { for (let p = n.parent; p; p = p.parent) if (ts.isPropertyAssignment(p) && /^MK-[A-Z]{2}-[A-Z]-\d{3}/.test((p.name as any).text ?? '')) return true; return false; };
const STRAIGHT = (n: ts.Node, text: string) => /[A-Za-z]'[A-Za-z]/.test(text)
  || ((ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) && /^\s*'[a-z]/.test(text));

function scan(file: string) {
  const sf = parse(file);
  const hits: string[] = [];
  let strings = 0, skipped = 0;
  const visit = (n: ts.Node) => {
    const lit = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n);
    if (lit) {
      const text = (n as any).text as string;
      if (/[A-Za-z]/.test(text)) {
        if (underFigure(n)) skipped++;
        else { strings++; if (STRAIGHT(n, text)) hits.push(`${rel(file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: ${text.trim().slice(0, 90)}`); }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { hits, strings, skipped };
}

test('every apostrophe a Cash flow screen prints inside a word is ’ — the guard proves it looked', () => {
  const screensDir = path.join(ROOT, 'src', 'screens');
  const onDisk = fs.readdirSync(screensDir);
  for (const s of SCREENS) expect(onDisk).toContain(`${s}.tsx`);   // the four are where the list says, or the guard goes red
  const fnDir = path.join(ROOT, 'MoneyKeel', 'functions', 'cashflow');
  const functions = fs.readdirSync(fnDir).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f)).map((f) => path.join(fnDir, f));
  const files = [...SCREENS.map((s) => path.join(screensDir, `${s}.tsx`)), ...functions];
  let strings = 0, skipped = 0; const hits: string[] = []; const byScreen: Record<string, number> = {};
  for (const f of files) {
    const r = scan(f);
    hits.push(...r.hits); strings += r.strings; skipped += r.skipped;
    if (/src\/screens\//.test(rel(f))) byScreen[rel(f)] = r.strings;
  }
  // IT LOOKED (2026-10-27, 11:40): the four screens and 15 cash-flow function files, 19 files whole — 2,229 strings with words
  // (CashFlowScreen 506, BudgetScreen 600, BillCalendarScreen 181, MonthlyIncomeScreen 103) and 1,083 figure-record strings skipped.
  // The floors sit just under the true numbers, so a sentence moved between files does not turn it red but a reader that stops
  // finding the strings does
  console.log(`Cash flow apostrophes: ${files.length} files read whole, ${strings} strings with words, ${skipped} figure-record strings skipped; `
    + Object.entries(byScreen).map(([f, n]) => `${f.replace('src/screens/', '')} ${n}`).join(', '));
  expect(files.length).toBeGreaterThanOrEqual(19);
  expect(functions.length).toBeGreaterThanOrEqual(15);
  expect(byScreen['src/screens/CashFlowScreen.tsx']).toBeGreaterThanOrEqual(480);
  expect(byScreen['src/screens/BudgetScreen.tsx']).toBeGreaterThanOrEqual(570);
  expect(byScreen['src/screens/BillCalendarScreen.tsx']).toBeGreaterThanOrEqual(170);
  expect(byScreen['src/screens/MonthlyIncomeScreen.tsx']).toBeGreaterThanOrEqual(95);
  expect(strings).toBeGreaterThanOrEqual(2100);
  expect(skipped).toBeGreaterThanOrEqual(1000);   // the figure records are recognised, not read as screen words
  expect(hits).toEqual([]);
});

test('the guard catches what it is for: a straight apostrophe in a word, and after a name filled in', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cf-apos-'));
  const f = path.join(dir, 'Probe.tsx');
  fs.writeFileSync(f, "const a = \"it's\"; const b = `${n}'s total`; const c = <T>{n}'s</T>; const d = 'it’s'; // a comment's words are not read\nconst e = { 'MK-CF-M-014': { label: \"Today's expense\" } };\n");
  const r = scan(f);
  expect(r.hits).toHaveLength(3);
  expect(r.skipped).toBe(2);   // the figure's identifier and its label
  fs.rmSync(dir, { recursive: true, force: true });
});
