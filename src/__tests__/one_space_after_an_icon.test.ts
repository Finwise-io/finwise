/** ONE SPACE AFTER AN ICON (PF3-4, FX-SHARED 2026-10-31; tenet 4, DEC-3523; the class of PF-9).
 *
 *  The add sheet's choices printed "🔗  Connect your bank" with two spaces after the icon, where v08 frame G — a page that, like
 *  every drawing, shows a run of spaces as one — reads "🔗 Connect your bank". The same two spaces sat after the icons of Net
 *  worth's step pickers, Itemize, PlanInputs, Insights, the radio marks ◉ ○, the bullets · •, and the signs ＋ − = ≈ before a word.
 *
 *  WHAT IT READS — the disk: every string, template and JSX text in src and app (tests excluded), and every icon expression in JSX
 *  ({d.icon}) or a template (${ICON[x]}). A run of two or more spaces right after an icon or mark is a hit; a separator with spaces on
 *  both sides ("   ·   " between two items) is not after an icon and is left. It says how much it read.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const ICON = String.raw`(?:\p{Extended_Pictographic}️?|[◉○·•⚡⬇＋≈✓−=])`;
const AFTER = new RegExp(String.raw`(^|[^ ])${ICON} {2,}(?=\S)`, 'u');      // "🔗  Link"
const ENDS = new RegExp(String.raw`(^|[^ ])${ICON} {2,}$`, 'u');            // "·  " right before {line}
const ICON_EXPR = /(\bicon\b|ICON\b|\.icon\b|'[◉○⚠✅]|\? '[◉○]')/;

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name) ? [p] : [];
  });
}

export function twoSpacesAfterIcon(file: string, text: string): { hits: string[]; pieces: number } {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = [];
  let pieces = 0;
  const at = (pos: number) => `${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(pos).line + 1}`;
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      pieces += 1;
      if (AFTER.test(n.text)) hits.push(`${at(n.getStart(sf))} — "${n.text.trim().slice(0, 40)}"`);
    }
    if (ts.isJsxElement(n)) {
      n.children.forEach((c, i) => {
        const prev = n.children[i - 1], next = n.children[i + 1];
        if (!ts.isJsxText(c)) return;
        if (prev && ts.isJsxExpression(prev) && prev.expression && ICON_EXPR.test(prev.expression.getText(sf)) && /^ {2,}(\S|$)/.test(c.text)) hits.push(`${at(c.pos)} — {${prev.expression.getText(sf).slice(0, 30)}} then two spaces`);
        if (next && ts.isJsxExpression(next) && ENDS.test(c.text)) hits.push(`${at(c.pos)} — "${c.text.trim()}" then two spaces before {…}`);
      });
    }
    if (ts.isTemplateExpression(n)) {
      for (const sp of n.templateSpans) if (ICON_EXPR.test(sp.expression.getText(sf)) && /^ {2,}/.test(sp.literal.text)) hits.push(`${at(sp.getStart(sf))} — \${${sp.expression.getText(sf).slice(0, 30)}} then two spaces`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { hits, pieces };
}

test('one space after every icon, radio mark, bullet and sign the app prints — and the guard says how much it read', () => {
  const hits: string[] = [];
  let files = 0, pieces = 0;
  for (const root of ['src', 'app']) {
    for (const f of walk(path.join(ROOT, root))) {
      files += 1;
      const r = twoSpacesAfterIcon(f, fs.readFileSync(f, 'utf8'));
      hits.push(...r.hits); pieces += r.pieces;
    }
  }
  console.log(`one space after an icon: ${files} files, ${pieces} printed pieces`);
  // counted 2026-10-31 from the disk, not typed from memory: 261 files, 34,065 printed pieces (floors just under)
  expect(files).toBeGreaterThanOrEqual(263);       // 263 files, 34,519 printed pieces on 2026-11-01 (PF-TOOLS)
  expect(pieces).toBeGreaterThanOrEqual(34_516);   // 34,516 on 2026-11-01: 34,519, less CLEANUP-TESTS's plural change in PlanGoals (4 strings out, 1 in)
  expect(hits).toEqual([]);
});

test('the guard catches what it is for (fed one of each), and leaves a separator alone', () => {
  const probe = "const a = <T>{d.icon}  {d.title}</T>; const b = '⚡  Quick add'; const c = <T>·  {line}</T>; const d = `${ICON[x]}  ${y}`; const ok = mix.join('   ·   '); const fine = <T>{d.icon} {d.title}</T>;\n";
  expect(twoSpacesAfterIcon(path.join(ROOT, 'probe.tsx'), probe).hits).toHaveLength(4);
});
