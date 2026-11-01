/** ONE SHEET FRAME (NW3-18, FX-SHARED 2026-10-31; tenet 4, DEC-3523).
 *
 *  The account page opened sheets in two looks — white with corners 22 and a 38 × 5 handle, grey with corners 24 and a 40 × 4 one — and
 *  Net worth's used a third handle, 36 × 4. Every sheet now wears SHEET_FRAME and SHEET_HANDLE (src/components/sheetFrame.ts), as Net
 *  worth v08 draws its sheets (approved 2026-10-01, DEC-0644).
 *
 *  WHAT IT READS — the disk: every StyleSheet entry in src and app (tests excluded). An entry with rounded top corners of 16 or more and
 *  none at the bottom is a SHEET; an entry named grip, grab or handle is a HANDLE. Every sheet spreads SHEET_FRAME and sets no other
 *  corner; every handle is SHEET_HANDLE and nothing else. A sheet that sets its own background over the frame must be the one named
 *  exception: the change walk, which v08 frame E draws white. It says how much it read.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { SHEET_FRAME, SHEET_HANDLE } from '../components/sheetFrame';
import { Colors } from '../utils/theme';

const ROOT = path.join(__dirname, '..', '..');
const WHITE_BY_APPROVAL = new Set(['src/components/ChangeWalkSheet.tsx sheet']);   // v08 frame E, the change walk, drawn white (DEC-0644)

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name) ? [p] : [];
  });
}

test('the one frame is v08\'s: grey, top corners 24, a handle 36 × 4 in the light grey with 10 below', () => {
  expect(SHEET_FRAME).toEqual({ backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24 });
  expect(SHEET_HANDLE).toEqual({ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.bgTertiary, alignSelf: 'center', marginBottom: 10 });
});

test('every sheet in the app wears the one frame and the one handle — and the guard says how much it read', () => {
  const bad: string[] = [];
  let files = 0, entries = 0, sheets = 0, handles = 0;
  for (const root of ['src', 'app']) {
    for (const f of walk(path.join(ROOT, root))) {
      files += 1;
      const r = path.relative(ROOT, f);
      const text = fs.readFileSync(f, 'utf8');
      const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (n: ts.Node) => {
        if (ts.isCallExpression(n) && /StyleSheet\.create$/.test(n.expression.getText(sf)) && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
          for (const p of n.arguments[0].properties) {
            if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer)) continue;
            entries += 1;
            const name = p.name.getText(sf);
            const body = p.initializer.getText(sf);
            const spreadsFrame = /\.\.\.SHEET_FRAME\b/.test(body);
            const topCorner = body.match(/borderTopLeftRadius:\s*([\w.]+)/)?.[1];
            const roundTop = spreadsFrame || (topCorner != null && /^(1[6-9]|2\d|3\d|Radii\.(lg|xl))$/.test(topCorner) && !/borderBottom(Left|Right)Radius|borderRadius:/.test(body));
            if (roundTop) {
              sheets += 1;
              if (!spreadsFrame) bad.push(`${r} ${name} — a sheet with its own frame`);
              else if (/borderTop(Left|Right)Radius/.test(body)) bad.push(`${r} ${name} — sets its own corners over the frame`);
              else if (/backgroundColor/.test(body) && !WHITE_BY_APPROVAL.has(`${r} ${name}`)) bad.push(`${r} ${name} — sets its own background over the frame`);
            }
            if (/^(grip|grab|handle|grabber|sheetGrip|sheetHandle)$/.test(name)) {
              handles += 1;
              if (body.replace(/\s+/g, '') !== '{...SHEET_HANDLE}') bad.push(`${r} ${name} — a handle of its own`);
            }
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
  }
  console.log(`one sheet frame: ${files} files, ${entries} style entries, ${sheets} sheets, ${handles} handles`);
  // counted 2026-10-31 from the disk, not typed from memory: 263 files, 3,004 style entries, 21 sheets, 15 handles (floors just under)
  expect(entries).toBeGreaterThanOrEqual(3012);   // 3,012 style entries, 21 sheets, 15 handles on 2026-11-01 (PF-TOOLS)
  expect(sheets).toBeGreaterThanOrEqual(21);
  expect(handles).toBeGreaterThanOrEqual(15);
  expect(bad).toEqual([]);
});
