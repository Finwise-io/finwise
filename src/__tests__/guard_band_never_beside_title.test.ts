/** A GREEN BAR NEVER SITS IN A ROW BESIDE A TITLE OR A BUTTON (2026-10-25, the Net worth drawing match of 2026-10-24, findings 20 and 25).
 *
 *  Bonds and Alternatives put their title, their bar and its info dot in one row: `<View style={{ flexDirection: 'row' }}>`
 *  holding the title, then the bar. A bar in a row is only as wide as its words and starts where the title ends, so it
 *  cannot run edge to edge — against the dark-green bar standard (square corners, edge to edge, founder 2026-08-11) and
 *  against both approved drawings, which draw the title on its own line and the bar under it, edge to edge, with the dot
 *  white inside it. Since 2026-08-10 they read that way, and no guard could see it: the edge-to-edge guard reads bands
 *  inside cards, and these two sat on the page.
 *
 *  How it reads: every `<SectionBand` in src/screens, src/components and app/, through the TypeScript parser (never a
 *  pattern typed from memory). For each, the element that holds it: if that element lays its children out in a row —
 *  `flexDirection: 'row'` written in its style, inline or in its file's StyleSheet, alone or in an array — the band is
 *  beside something, and the build fails. Every band written is read and classed, or the guard fails.
 *  Its first full read (2026-10-25) found two more of the class, light-green: the step-by-step add's bars beside "+ Add"
 *  (NetWorthScreen, renderAssetSection and renderDebtSection) — fixed the same day, on v08's READ THIS FIRST row of that date.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..', '..');
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
  return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
});
const FILES = [path.join(ROOT, 'src', 'screens'), path.join(ROOT, 'src', 'components'), path.join(ROOT, 'app')].flatMap(walk);

const isRowObject = (o: ts.Node | undefined): boolean => !!o && ts.isObjectLiteralExpression(o) && o.properties.some((p) =>
  ts.isPropertyAssignment(p) && (p.name as any).text === 'flexDirection' && ts.isStringLiteral(p.initializer) && p.initializer.text === 'row');

/** The file's StyleSheet entries that lay out in a row: `name: { flexDirection: 'row', … }`. */
function rowStyles(sf: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && /StyleSheet\.create$/.test(n.expression.getText(sf)) && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
      for (const p of n.arguments[0].properties) if (ts.isPropertyAssignment(p) && isRowObject(p.initializer)) out.add((p.name as any).text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** Does this style expression lay out in a row? Inline object, `styles.name`, or an array holding either (a condition too). */
function isRow(expr: ts.Expression | undefined, rows: Set<string>): boolean {
  if (!expr) return false;
  if (ts.isParenthesizedExpression(expr)) return isRow(expr.expression, rows);
  if (isRowObject(expr)) return true;
  if (ts.isPropertyAccessExpression(expr)) return rows.has(expr.name.text);
  if (ts.isArrayLiteralExpression(expr)) return expr.elements.some((e) => isRow(e as ts.Expression, rows));
  if (ts.isBinaryExpression(expr)) return isRow(expr.right, rows);
  if (ts.isConditionalExpression(expr)) return isRow(expr.whenTrue, rows) || isRow(expr.whenFalse, rows);
  return false;
}

const styleOf = (el: ts.JsxOpeningLikeElement) => {
  const a = el.attributes.properties.find((p) => ts.isJsxAttribute(p) && (p.name as any).text === 'style') as ts.JsxAttribute | undefined;
  return a?.initializer && ts.isJsxExpression(a.initializer) ? a.initializer.expression : undefined;
};

function readBands() {
  const bands: { at: string; parent: string; row: boolean }[] = [];
  let written = 0;
  for (const f of FILES) {
    const src = fs.readFileSync(f, 'utf8');
    if (!src.includes('<SectionBand')) continue;
    written += (src.match(/<SectionBand\b/g) ?? []).length;
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const rows = rowStyles(sf);
    const visit = (n: ts.Node) => {
      const open = ts.isJsxSelfClosingElement(n) ? n : ts.isJsxElement(n) ? n.openingElement : null;
      if (open && open.tagName.getText(sf) === 'SectionBand') {
        // the element that holds it: the nearest JSX element above, past fragments and expressions ({cond && <SectionBand />})
        let p: ts.Node | undefined = (ts.isJsxElement(n) ? n : n).parent;
        while (p && !ts.isJsxElement(p) && !ts.isSourceFile(p)) p = p.parent;
        const holder = p && ts.isJsxElement(p) ? p.openingElement : null;
        const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        bands.push({ at: `${path.relative(ROOT, f)}:${line}`, parent: holder ? holder.tagName.getText(sf) : '(none)', row: !!holder && isRow(styleOf(holder), rows) });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return { bands, written };
}

test('no green bar sits in a row beside a title or a button — every band written is read', () => {
  const { bands, written } = readBands();
  expect(FILES.length).toBeGreaterThanOrEqual(100);   // the screen, component and route files it walks
  expect(bands.length).toBe(written);                  // every band written was read and classed — none skipped
  expect(bands.length).toBeGreaterThanOrEqual(135);    // 137 on 2026-10-25, in the screen, component and route files
  expect(bands.filter((b) => b.row).map((b) => `${b.at} — held by a ${b.parent} that lays out in a row`)).toEqual([]);
});

test('the reader sees the shape Bonds and Alternatives had: a row style inline, in the StyleSheet, and in an array', () => {
  const probe = (code: string) => {
    const sf = ts.createSourceFile('p.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const rows = rowStyles(sf); let hit = false;
    const visit = (n: ts.Node) => {
      if (ts.isJsxSelfClosingElement(n) && n.tagName.getText(sf) === 'SectionBand') {
        let p: ts.Node | undefined = n.parent; while (p && !ts.isJsxElement(p)) p = p.parent;
        hit = !!p && isRow(styleOf((p as ts.JsxElement).openingElement), rows);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf); return hit;
  };
  expect(probe(`const x = <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text>Bonds</Text><SectionBand title="B" /></View>;`)).toBe(true);
  expect(probe(`const s = StyleSheet.create({ head: { flexDirection: 'row' } }); const x = <View style={s.head}><SectionBand title="B" /></View>;`)).toBe(true);
  expect(probe(`const s = StyleSheet.create({ head: { flexDirection: 'row' } }); const x = <View style={[s.pad, on && s.head]}><SectionBand title="B" /></View>;`)).toBe(true);
  expect(probe(`const x = <><Text>Bonds</Text><View style={s.bleed}><SectionBand title="B" /></View></>;`)).toBe(false);
});
