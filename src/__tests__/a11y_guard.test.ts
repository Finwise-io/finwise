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

// Build-46 walk row 13 (audit UX #5): the audit-measured small targets were raised to 44pt on the
// named surfaces; this ratchet keeps ANY sub-44 minHeight from creeping back into them.
test('walk row 13: no sub-44 minHeight on the fixed tap-target surfaces (ratchet)', () => {
  const fixed = ['screens/NetWorthScreen.tsx', 'components/MoneySheets.tsx'];
  const offenders: string[] = [];
  for (const rel of fixed) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    const hits = src.match(/minHeight:\s*(?:[0-3]?\d)\b(?!\d)/g) ?? [];
    for (const h of hits) offenders.push(`${rel}: ${h} — the 44pt tap-target rule (fingers miss smaller)`);
  }
  expect(offenders).toEqual([]);
});

// Build-46 walk row 15 (audit Home·NW #8): spoken labels say "hidden", never the dot characters.
// accessibilityLabel/Hint templates must use the spoken* forms (useMoney.ts) — the visual maskers
// (maskedMoney / maskDollars) may not appear inside them. Class closed with a ratchet, not a sweep.
test('walk row 15: no visual masker inside an accessibility label/hint (spoken forms only)', () => {
  const files = [...walk(path.join(root, 'screens')), ...walk(path.join(root, 'components'))]
    .filter((f) => !f.includes('__tests__'));
  const span = /accessibility(?:Label|Hint)=\{`(?:[^`\\]|\\.|\$\{(?:[^{}]|\{[^{}]*\})*\})*`\}|accessibility(?:Label|Hint)=\{(?:maskedMoney2?|maskDollars)\(/gs;
  const offenders: string[] = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(span)) {
      if (/maskedMoney2?\(|maskDollars\(/.test(m[0])) offenders.push(`${path.relative(root, f)}: ${m[0].slice(0, 90)}…`);
    }
  }
  expect(offenders).toEqual([]);
});

// …and the spoken form itself keeps its contract: the WORD hidden when balances are hidden.
test('walk row 15: spokenMoney says "hidden" under the eye, real dollars otherwise', () => {
  const { useStore } = require('../store/useStore');
  const { spokenMoney, spokenDollars } = require('../components/useMoney');
  useStore.setState({ hideBalances: true } as any);
  expect(spokenMoney(1234)).toBe('hidden');
  expect(spokenDollars('You can still contribute $9,200 this year')).toBe('You can still contribute hidden this year');
  useStore.setState({ hideBalances: false } as any);
  expect(spokenMoney(1234)).toBe('$1,234');
});
