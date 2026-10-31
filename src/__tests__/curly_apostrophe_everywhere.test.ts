/** EVERY APOSTROPHE PRINTED INSIDE A WORD IS ’ — IN EVERY SCREEN, COMPONENT, SIGN-UP STEP AND FUNCTION (2026-10-27, FX-SHARED;
 *  CF2-10, NW2-11, NW2-26).
 *
 *  The Net worth guard (nw_curly_apostrophe_guard) reads what the Net worth, Performance and Look back screens reach. Cash flow,
 *  sign-up, Plan, Home, Settings and the shared sheets were read by nothing, and printed "they're", "Here's", "WHAT'S", "it's"
 *  with a straight ' beside drawings that draw ’ — one sentence spelled two ways (tenet 4, DEC-3523; DEC-8336 carried app-wide).
 *
 *  WHAT IT READS — the disk, whole, never a list from memory: every .ts and .tsx file under src/screens, src/components,
 *  src/onboarding and MoneyKeel/functions (tests excluded). In each, every string, template text and JSX text with a letter in it —
 *  never a comment, never code. A string under a figure's identifier (MK-..-.-NNN: { label … }) is the record's, not a screen's,
 *  and is counted as skipped. A straight ' between two letters (it's), or straight after a name filled in (${name}'s), is a hit.
 *  It says how much it read, and the files still carrying hits are named with their owner and count: a debt that may only fall.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
// WIDENED 2026-10-30 (CLEANUP-TESTS): sentences written in src/domain reach the screens too — the cockpit's Roth lean ("You're in
// a low bracket now", income/limits.ts) and Home's notices (insights/index.ts) printed a straight ' while nothing here read them.
// src/hooks, src/utils, src/constants and app/ are read for the same reason: what reaches a screen is read where it is written.
const DIRS = ['src/screens', 'src/components', 'src/onboarding', 'MoneyKeel/functions', 'src/domain', 'src/hooks', 'src/utils', 'src/constants', 'app'];
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name) ? [p] : [];
  });
}
const underFigure = (n: ts.Node) => { for (let p = n.parent; p; p = p.parent) if (ts.isPropertyAssignment(p) && /^MK-[A-Z]{2}-[A-Z]-\d{3}/.test((p.name as any).text ?? '')) return true; return false; };
const STRAIGHT = (n: ts.Node, text: string) => /[A-Za-z]'[A-Za-z]/.test(text)
  || ((ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) && /^\s*'[a-z]/.test(text));

export function scanFile(file: string) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = []; let strings = 0, skipped = 0;
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) {
      const t = (n as any).text as string;
      if (/[A-Za-z]/.test(t)) {
        if (underFigure(n)) skipped++;
        else { strings++; if (STRAIGHT(n, t)) hits.push(`${rel(file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: ${t.trim().slice(0, 80)}`); }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { hits, strings, skipped };
}

/** THE TRUE DEBT on 2026-10-27, by file and owner, counted from the disk — files another fix agent owns, handed to them in
 *  FX-SHARED's report. A count may only fall; a file not named here may carry none. */
// PAID 2026-10-30 (CLEANUP-TESTS): RetirementCockpit 21, GoalsScreen 7 (typography only, DEC-8889), RequiredWithdrawals 5, Roth 1,
// OnboardingScreen 1 and Home's cash-flow box 2 — 37 strings, each screen's drawing given a dated row first. The debt is 0.
const DEBT: Record<string, { owner: string; max: number }> = {};

test('every apostrophe printed inside a word, anywhere in screens, components, sign-up and functions, is ’ — and the guard proves it looked', () => {
  const byDir: Record<string, number> = {};
  const byFile: Record<string, string[]> = {};
  let files = 0, strings = 0, skipped = 0;
  for (const d of DIRS) {
    for (const f of walk(path.join(ROOT, d))) {
      files += 1; byDir[d] = (byDir[d] ?? 0) + 1;
      const r = scanFile(f);
      strings += r.strings; skipped += r.skipped;
      if (r.hits.length) byFile[rel(f)] = r.hits;
    }
  }
  console.log(`curly apostrophe: ${files} files (${Object.entries(byDir).map(([d, n]) => `${d} ${n}`).join(', ')}), ${strings} strings with words, `
    + `${skipped} figure-record strings skipped; carried: ${Object.entries(byFile).map(([f, h]) => `${f} ${h.length}`).join(', ') || 'none'}`);
  // IT LOOKED — counted 2026-10-27 from the disk: 120 files (screens 49, components 42, sign-up 4, functions 25), 15,146 strings
  // with words, 2,506 figure-record strings skipped. Floors sit just under, so a reader that stops finding files goes red.
  expect(byDir['src/screens']).toBeGreaterThanOrEqual(45);
  expect(byDir['src/components']).toBeGreaterThanOrEqual(40);
  expect(byDir['src/onboarding']).toBeGreaterThanOrEqual(4);
  expect(byDir['MoneyKeel/functions']).toBeGreaterThanOrEqual(20);
  // and since 2026-10-30, the five folders added (137 files, 3,893 strings with words, counted from the disk that day)
  expect(['src/domain', 'src/hooks', 'src/utils', 'src/constants', 'app'].reduce((t, d) => t + (byDir[d] ?? 0), 0)).toBeGreaterThanOrEqual(130);
  expect(files).toBeGreaterThanOrEqual(250);
  expect(strings).toBeGreaterThanOrEqual(18_000);
  expect(skipped).toBeGreaterThanOrEqual(2_300);
  // nothing outside the named debt, and the debt never grows
  const outside = Object.entries(byFile).filter(([f]) => !DEBT[f]).flatMap(([, h]) => h);
  expect(outside).toEqual([]);
  for (const [f, { owner, max }] of Object.entries(DEBT)) expect(`${f} (${owner}): ${(byFile[f] ?? []).length}`).toBe(`${f} (${owner}): ${Math.min((byFile[f] ?? []).length, max)}`);
});

test('the guard catches what it is for: a straight apostrophe in a word, after a name filled in, and in JSX text', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'apos-all-'));
  const f = path.join(dir, 'Probe.tsx');
  fs.writeFileSync(f, "const a = \"it's\"; const b = `${n}'s total`; const c = <T>{n}'s</T>; const d = 'it’s'; // a comment's words are not read\nconst e = { 'MK-CF-M-013': { label: \"Today's spend\" } };\n");
  const r = scanFile(f);
  expect(r.hits).toHaveLength(3);
  expect(r.skipped).toBe(2);   // the figure's identifier and its label
  fs.rmSync(dir, { recursive: true, force: true });
});
