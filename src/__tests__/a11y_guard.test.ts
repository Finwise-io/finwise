// A11Y RATCHET (Theme 5): the per-file baseline of unlabeled interactive controls can only go DOWN.
// A new <TouchableOpacity> without an accessibilityLabel/Role in ANY file fails this test — so the
// screen-reader debt never grows while we pay down the long tail post-launch (the user-chosen "ratchet
// now, finish later"). Same philosophy as scripts/check-ui-tests.sh. To pay down: add labels, then lower
// the file's number in a11y-baseline.json.
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const baseline: Record<string, number> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'a11y-baseline.json'), 'utf8'),
);

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}
function unlabeled(src: string): number {
  const re = /<TouchableOpacity\b[^>]*?>/gs;
  let m: RegExpExecArray | null, n = 0;
  while ((m = re.exec(src))) { if (!/accessibility(Label|Role)/.test(m[0])) n++; }
  return n;
}

test('no file exceeds its unlabeled-control baseline (ratchet down only)', () => {
  const files = [...walk(path.join(root, 'screens')), ...walk(path.join(root, 'components'))]
    .filter((f) => !f.includes('__tests__'));
  const regressions: string[] = [];
  for (const f of files) {
    const rel = path.relative(root, f);
    const n = unlabeled(fs.readFileSync(f, 'utf8'));
    const allowed = baseline[rel] ?? 0;
    if (n > allowed) regressions.push(`${rel}: ${n} unlabeled controls (baseline ${allowed}) — add accessibilityLabel or accessibilityRole`);
  }
  expect(regressions).toEqual([]);
});
