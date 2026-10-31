/** EVERY APOSTROPHE SIGN-UP AND THE INCOME SCREENS PRINT IN A WORD IS ’ (2026-10-27, FX-CF-B; the Cash flow drawing check CF2-10).
 *
 *  The approved drawings write it’s, you’ll, here’s with the typographic ’ (income-end-to-end_v07 throughout; the picker’s
 *  “We’ll”), and Net worth was moved to it by DEC-8336. Sign-up wrote a straight ' in 59 places — “That's”, “you'll”, “Here's”,
 *  “WHAT'S TAKEN OUT”, “it's” — beside “We’ll” on the same screens: one word, two marks (tenet 4).
 *
 *  What this guard reads, from the disk, never from a list typed from memory: every file in src/onboarding that is not a test, and
 *  the five income screens (Your base pay, the Income summary, Your income and its editors, the Income detail, the filing
 *  question). In each, every string, template text and JSX text — never a comment, never code — is read off the syntax tree. A
 *  straight ' between two letters (it's), or straight after a name filled in (${name}'s), fails the build. It asserts how many
 *  files and strings it read, so a pattern that stops matching goes red, not quiet.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as os from 'os';

const ROOT = path.join(__dirname, '..', '..');
const ONBOARDING = path.join(ROOT, 'src', 'onboarding');
const SCREENS = ['BasePayScreen', 'IncomeSummaryScreen', 'IncomeManagerScreen', 'IncomeDetailScreen', 'FilingStatusScreen']
  .map((n) => path.join(ROOT, 'src', 'screens', `${n}.tsx`));
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');

const FILES = [
  ...fs.readdirSync(ONBOARDING).filter((n) => /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)).map((n) => path.join(ONBOARDING, n)),
  ...SCREENS,
];

const TEXT_KINDS = new Set([ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NoSubstitutionTemplateLiteral, ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail, ts.SyntaxKind.JsxText]);

function straightMarks(file: string): { strings: number; found: string[] } {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let strings = 0;
  const found: string[] = [];
  const visit = (n: ts.Node) => {
    if (TEXT_KINDS.has(n.kind)) {
      strings += 1;
      const raw = text.slice(n.getStart(sf), n.getEnd());
      // in the source: \' inside a '…' string, or ' inside "…", `…` and JSX, between two letters or right after ${…}
      const re = n.kind === ts.SyntaxKind.StringLiteral && raw.startsWith("'") ? /(?<=[A-Za-z])\\'(?=[A-Za-z])/g : /(?<=[A-Za-z]|^})'(?=[A-Za-z])/g;
      for (const m of raw.matchAll(re)) {
        const line = sf.getLineAndCharacterOfPosition(n.getStart(sf) + (m.index ?? 0)).line + 1;
        found.push(`${rel(file)}:${line}: …${raw.slice(Math.max(0, (m.index ?? 0) - 24), (m.index ?? 0) + 24).replace(/\s+/g, ' ')}…`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { strings, found };
}

test('sign-up and the income screens print ’ in every word, never a straight mark — read off the syntax tree', () => {
  let strings = 0;
  const found: string[] = [];
  for (const f of FILES) { const r = straightMarks(f); strings += r.strings; found.push(...r.found); }
  // the guard proves it looked: every sign-up file and the five screens, and the strings in them
  expect(FILES.map(rel)).toEqual(expect.arrayContaining(['src/onboarding/modules.tsx', 'src/onboarding/Summary.tsx', 'src/onboarding/steps.ts',
    'src/screens/BasePayScreen.tsx', 'src/screens/FilingStatusScreen.tsx']));
  expect(FILES.length).toBeGreaterThanOrEqual(9);
  expect(strings).toBeGreaterThan(2500);
  expect(found).toEqual([]);
});

test('the detector still fires — a straight mark in a word, in each kind of text, is found (a self-check on synthetic code)', () => {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'apos-')), 'selfcheck.tsx');   // never inside src, where other guards read
  fs.writeFileSync(tmp, [
    "const a = 'it\\'s';",
    'const b = "you\'ll";',
    'const c = `Here\'s ${a}\'s`;',
    'const d = <Text>WHAT\'S TAKEN OUT</Text>;',
    '// a comment\'s mark is not read',
    "const e = 'we’ll';",
  ].join('\n'));
  try {
    const r = straightMarks(tmp);
    expect(r.found).toHaveLength(5);                    // it's · you'll · Here's · ${a}'s · WHAT'S — never the comment, never ’
  } finally { fs.unlinkSync(tmp); }
});
