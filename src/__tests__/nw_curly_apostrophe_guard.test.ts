/** EVERY APOSTROPHE A NET WORTH SCREEN PRINTS IN A WORD IS ’ (2026-10-25, the line-by-line drawing match of 2026-10-24).
 *
 *  The approved drawings write it’s, today’s, hasn’t with the typographic ’ (the account page v01, 46 of them; Net worth v08
 *  prints home’s). The app wrote a straight ' in the same sentences — while Net worth itself printed home’s — so one screen
 *  spelled one sentence two ways, and the account page drawing test read the two as equal instead of holding them.
 *
 *  What this guard reads, from the disk, never from a list typed from memory:
 *   1. the seven Net worth screens (Net worth, the account page, Add an account, Bonds, Alternatives, Itemize, the Holding
 *      page) and every file they import, followed import by import;
 *   2. of those files, the ones whose words a Net worth screen prints: the seven screens; the sheets they open that live in
 *      another screen's file (only the parts imported — the trade sheet, the holding editor, the activity sheet); and every
 *      imported file under src/components, src/constants, the Net worth domain folders and the Net worth functions;
 *   3. in each, every string, template text and JSX text — never a comment, never code. A string under a figure's identifier
 *      (MK-NW-M-027: { label, answers, formula … }) is the record's, not the screen's, and is counted as skipped;
 *   4. a straight ' between two letters (it's), or straight after a name filled in (${name}'s), fails the build.
 *  The other files the screens import (the store, the engines, the Cash flow and Performance functions) are counted and named
 *  by folder: their words are not proven to reach a Net worth screen, and their own module's checks hold them.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const SEEDS = ['NetWorthScreen', 'AccountPortfolioScreen', 'AddAccountScreen', 'BondsScreen', 'OtherInvestmentsScreen', 'ItemizeScreen', 'HoldingDetailScreen']
  .map((s) => path.join(ROOT, 'src', 'screens', `${s}.tsx`));
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
/** read whole: where the words a Net worth screen prints are written */
const SOURCE_DIRS = [/^src\/components\//, /^src\/constants\//, /^src\/domain\//, /^src\/utils\//, /^src\/hooks\//,
  /^MoneyKeel\/functions\/networth-and-performance\//];
/** reached, not read — each with its reason. A file reached that matches neither list fails the guard. */
const NOT_READ: [RegExp, string][] = [
  [/^src\/domain\/(income|planning|transactions)\//, 'Cash flow and Plan sentences (tax advice, a payee seen first): printed on those modules\' screens'],
  [/^src\/(store|services)\//, 'the store and the services: data, sync and storage, no screen words'],
  [/^Calculation Module code\/engines\//, 'the engines: their notes are the record\'s, and no Net worth screen is shown to print them'],
  [/^MoneyKeel\/functions\/(?!networth-and-performance\/)/, 'other modules\' functions (Cash flow, shared): held by their own module\'s checks'],
  [/^assets\//, 'images'],
];

const resolve = (from: string, spec: string) => {
  const base = path.resolve(path.dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
};
const parse = (f: string) => ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/** THE PERFORMANCE TAB (2026-10-26, CLEANUP-TESTS; the lead's widening): the same rule on the Performance tab's own file, read
 *  whole, and every file it imports — the v17 drawing's READ THIS FIRST row of 2026-10-26 carries DEC-8336 to this tab. Until
 *  then this guard read PerformanceScreen.tsx only for the three sheets Net worth opens, and four of its sentences printed '. */
const PERF_SEEDS = ['PerformanceScreen'].map((s) => path.join(ROOT, 'src', 'screens', `${s}.tsx`));

/** Every file the seed screens reach, and — for another screen's file — the names they import from it. */
function reach(seeds: string[] = SEEDS) {
  const seen = new Map<string, Set<string>>();   // file → names imported from it by a file in reach ('*' = all)
  const queue = seeds.map((f) => [f, '*'] as [string, string]);
  const walked = new Set<string>();
  while (queue.length) {
    const [f] = queue.pop()!;
    if (walked.has(f)) continue;
    walked.add(f);
    const sf = parse(f);
    sf.forEachChild((n) => {
      if (!ts.isImportDeclaration(n) || !ts.isStringLiteral(n.moduleSpecifier) || !n.moduleSpecifier.text.startsWith('.')) return;
      const to = resolve(f, n.moduleSpecifier.text);
      if (!to || /__tests__|\.test\./.test(to)) return;
      const names = seen.get(to) ?? new Set<string>();
      const b = n.importClause?.namedBindings;
      if (n.importClause?.name || (b && ts.isNamespaceImport(b))) names.add('*');
      if (b && ts.isNamedImports(b)) for (const e of b.elements) names.add((e.propertyName ?? e.name).text);
      seen.set(to, names);
      queue.push([to, '*']);
    });
    // require('...') calls reach files too
    for (const m of sf.text.matchAll(/require\(\s*'(\.{1,2}\/[^']+)'\s*\)/g)) {
      const to = resolve(f, m[1]);
      if (to && !/__tests__|\.test\./.test(to)) { seen.set(to, new Set([...(seen.get(to) ?? []), '*'])); queue.push([to, '*']); }
    }
  }
  for (const s of seeds) seen.set(s, new Set(['*']));
  return seen;
}

const underFigure = (n: ts.Node) => { for (let p = n.parent; p; p = p.parent) if (ts.isPropertyAssignment(p) && /^MK-[A-Z]{2}-[A-Z]-\d{3}/.test((p.name as any).text ?? '')) return true; return false; };
const STRAIGHT = (n: ts.Node, text: string) => /[A-Za-z]'[A-Za-z]/.test(text)
  || ((ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) && /^\s*'[a-z]/.test(text));

function scan(file: string, only: Set<string> | null) {
  const sf = parse(file);
  const hits: string[] = [];
  let strings = 0, skipped = 0;
  const visit = (n: ts.Node) => {
    const lit = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n);
    if (lit) {
      const text = (n as any).text as string;
      if (/[A-Za-z]/.test(text)) {
        if (underFigure(n)) skipped++;
        else {
          strings++;
          if (STRAIGHT(n, text)) hits.push(`${rel(file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: ${text.trim().slice(0, 90)}`);
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  if (!only) visit(sf);
  else sf.forEachChild((top) => {   // only the declarations the Net worth screens import from this file
    const name = ts.isFunctionDeclaration(top) ? top.name?.text
      : ts.isVariableStatement(top) ? (top.declarationList.declarations[0]?.name as any)?.text : undefined;
    if (name && only.has(name)) visit(top);
  });
  return { hits, strings, skipped };
}

/** Read every file the seed screens reach: the seeds and the source folders whole, another screen's file only for the parts
 *  imported, the rest counted under its reason. */
function sweep(seeds: string[]) {
  const reached = reach(seeds);
  const scanned: string[] = []; const parts: string[] = []; const other: Record<string, number> = {};
  const hits: string[] = []; let strings = 0; let skipped = 0; const bySeed: Record<string, number> = {};
  for (const [file, names] of reached) {
    const r = rel(file);
    const isSeed = seeds.includes(file);
    const notRead = NOT_READ.find(([d]) => d.test(r));
    const isSource = !notRead && SOURCE_DIRS.some((d) => d.test(r));
    const isOtherScreen = /^src\/screens\//.test(r) && !isSeed;
    if (!isSeed && !isSource && !isOtherScreen) {
      if (!notRead) throw new Error(`${r} is reached from a Net worth screen and is neither read nor named with a reason`);
      other[notRead[1]] = (other[notRead[1]] ?? 0) + 1; continue;
    }
    const only = isOtherScreen ? names : null;
    if (only && only.has('*')) throw new Error(`${r} is imported whole by a Net worth file — name the parts it prints`);
    const res = scan(file, only);
    hits.push(...res.hits); strings += res.strings; skipped += res.skipped;
    if (isSeed) bySeed[r] = res.strings;
    (only ? parts : scanned).push(only ? `${r} (${[...only].sort().join(', ')})` : r);
  }
  return { scanned, parts, other, hits, strings, skipped, bySeed };
}

test('every apostrophe a Net worth screen prints inside a word is ’ — the guard proves it looked', () => {
  const { scanned, parts, other, hits, strings, skipped } = sweep(SEEDS);
  // IT LOOKED (2026-10-25): the seven screens; the Performance screen's file read in part, for the three sheets the account
  // page and the Holding page open; 75 more files whole — 6,258 strings with words, 1,416 figure-record strings skipped;
  // 56 files reached and not read, each under its reason
  expect(scanned.filter((f) => /^src\/screens\//.test(f))).toHaveLength(7);
  expect(parts).toEqual(['src/screens/PerformanceScreen.tsx (HistorySheet, HoldingEditor, TransactionSheet)']);
  expect(scanned.length).toBeGreaterThanOrEqual(80);
  expect(strings).toBeGreaterThanOrEqual(6000);
  expect(skipped).toBeGreaterThanOrEqual(1400);   // the figure records are recognised, not read as screen words
  expect(Object.values(other).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(50);
  expect(hits).toEqual([]);
});

test('every apostrophe the Performance tab prints inside a word is ’ — its own file read whole, and the guard proves it looked', () => {
  const { scanned, parts, other, hits, strings, skipped, bySeed } = sweep(PERF_SEEDS);
  // IT LOOKED (2026-10-26): PerformanceScreen.tsx whole — 625 strings with words in the file itself, where four sentences and
  // two spoken labels printed a straight ' (the day-one lines, the account bar's "this account's portfolio" and its door's
  // "this account's own page") — and every file it imports, read or named under its reason as for Net worth: at 20:00 on
  // 2026-10-26, 65 files whole, 3,909 strings with words, 1,443 figure-record strings skipped, 55 files reached and not read
  // (66, 3,932 and 1,568 at 14:40, before the figure records were gathered into one register). The floors sit just under the
  // true numbers, as the Net worth test's do, so an import moved between files does not turn it red but a reader that stops
  // finding the tab's files does.
  console.log(`Performance tab: ${bySeed['src/screens/PerformanceScreen.tsx']} strings in its own file; ${scanned.length} files read whole, `
    + `${parts.length} read in part, ${strings} strings with words, ${skipped} figure-record strings skipped, `
    + `${Object.values(other).reduce((a, b) => a + b, 0)} files reached and not read`);
  expect(scanned).toContain('src/screens/PerformanceScreen.tsx');
  expect(bySeed['src/screens/PerformanceScreen.tsx']).toBeGreaterThanOrEqual(600);
  expect(scanned.length).toBeGreaterThanOrEqual(60);
  expect(strings).toBeGreaterThanOrEqual(3700);
  expect(skipped).toBeGreaterThanOrEqual(1300);   // the figure records are recognised, not read as screen words
  expect(Object.values(other).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(50);
  expect(hits).toEqual([]);
});

test('the guard catches what it is for: a straight apostrophe in a word, and after a name filled in', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'nw-apos-'));
  const f = path.join(dir, 'Probe.tsx');
  fs.writeFileSync(f, "const a = \"it's\"; const b = `${n}'s total`; const c = <T>{n}'s</T>; const d = 'it’s'; // a comment's words are not read\nconst e = { 'MK-NW-M-027': { label: \"Yield on today's value\" } };\n");
  const r = scan(f, null);
  expect(r.hits).toHaveLength(3);
  expect(r.skipped).toBe(2);   // the figure's identifier and its label
  fs.rmSync(dir, { recursive: true, force: true });
});
