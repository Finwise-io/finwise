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
// FIXED 2026-08-14. This used to be `/<TouchableOpacity\b[^>]*?>/gs`, which stops at the FIRST ">"
// it meets — and an arrow function in a prop (`onPress={() => ...}`) contains one. So any control
// whose onPress came before its accessibility props was reported unlabeled even when it carried a
// perfectly good label, and the fix a person would reach for is to shuffle props around to satisfy
// a broken matcher. Walk the tag instead, tracking brace depth, and end on a ">" at depth zero.
function openingTags(src: string, tag: string): string[] {
  const out: string[] = [];
  let i = 0;
  while ((i = src.indexOf('<' + tag, i)) !== -1) {
    let depth = 0, j = i + tag.length + 1;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    out.push(src.slice(i, j + 1));
    i = j + 1;
  }
  return out;
}
function unlabeled(src: string): number {
  return openingTags(src, 'TouchableOpacity').filter((t) => !/accessibility(Label|Role)/.test(t)).length;
}

// A RATCHET CARRIES THE TRUE NUMBER (CLAUDE.md, "a guard must prove it looked"; Performance audit row 31, 2026-10-21).
// This test only failed when a file went UP, so a file that was paid down kept its old allowance: PerformanceScreen
// stood at 29 unlabeled controls while it had 0, and 15 other files carried more debt than they had (TopBar 6 for 0,
// IncomeManager 12 for 0). Each line now has to equal what the file holds — lower it the day it falls, delete it at
// zero — and the test states how many files and controls it read, so a matcher that stops matching goes red.
test('every file holds exactly its unlabeled-control number — the ratchet carries the true count', () => {
  const files = [...walk(path.join(root, 'screens')), ...walk(path.join(root, 'components'))]
    .filter((f) => !f.includes('__tests__'));
  const regressions: string[] = [];
  let controls = 0;
  const seen = new Set<string>();
  for (const f of files) {
    const rel = path.relative(root, f);
    const src = fs.readFileSync(f, 'utf8');
    controls += openingTags(src, 'TouchableOpacity').length;
    const n = unlabeled(src);
    seen.add(rel);
    const allowed = baseline[rel] ?? 0;
    if (n > allowed) regressions.push(`${rel}: ${n} unlabeled controls (baseline ${allowed}) — add accessibilityLabel or accessibilityRole`);
    else if (n < allowed) regressions.push(`${rel}: down to ${n} unlabeled controls from ${allowed} — lower its line in a11y-baseline.json${n === 0 ? ' (delete it at zero)' : ''}`);
  }
  // a line for a file that no longer exists, or a zero line, is debt nobody can see
  for (const [rel, n] of Object.entries(baseline)) {
    if (!seen.has(rel)) regressions.push(`${rel}: on the baseline but not found under src/screens or src/components — delete its line`);
    else if (n === 0) regressions.push(`${rel}: a zero line — delete it`);
  }
  // what it read, so a walk that stops finding files cannot report clean (86 files, 564 controls on 2026-10-21)
  expect(files.length).toBeGreaterThanOrEqual(80);
  expect(controls).toBeGreaterThanOrEqual(500);
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
