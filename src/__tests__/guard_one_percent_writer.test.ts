/** ONE PERCENT WRITER, ROUNDING HALF UP ON THE DECIMAL VALUE (2026-11-01, FX-CF-C; the lead's ruling R24; CF5-08; Q49).
 *
 *  CF5-08: on the Tax organizer, $120,000 single with a $20,000 401(k) has $13,170 of tax, and 13,170 ÷ 120,000 = 10.975% exactly — which
 *  rounds to 10.98%. The screen printed 10.97%: the computer holds 0.10975 × 100 as 10.97499…, and `toFixed(2)` rounds what it holds. Every
 *  percent the app prints now goes through one writer in MoneyKeel/functions/_figure-spec.ts — percentDigits (a rate held 0…1) or
 *  pointsDigits (a figure already in percent) — which clears the binary noise past the twelfth significant figure before it rounds.
 *
 *  What this guard holds:
 *   1. the probe set, on both writers, at 2, 1 and 0 decimals;
 *   2. no file writes a percent any other way: `(x × 100).toFixed(n)`, `Math.round(x × 100)` before a %, or `x.toFixed(n)` before a %.
 *      It reads every source file under src/, app/ and MoneyKeel/functions, and proves it looked.
 *  Routed on 2026-11-01: 69 `(x × 100).toFixed(n)`, 20 `x.toFixed(n)` on a figure already in percent, 10 `Math.round(x × 100)%`, the
 *  three kept percents of the mortgage comparison and the figure writer's own 'percent' unit.
 */
import * as fs from 'fs';
import * as path from 'path';
import { percentDigits, pointsDigits } from '../../MoneyKeel/functions/_figure-spec';

const ROOT = path.join(__dirname, '..', '..');

describe('the probe set — half up on the decimal value, never on the binary one', () => {
  test.each([
    [10.975, 2, '10.98'], [0.125, 2, '0.13'], [2.675, 2, '2.68'], [1.005, 2, '1.01'], [2.125, 2, '2.13'],
    [-2.675, 2, '−2.68'], [0.004, 2, '0.00'], [-0.004, 2, '0.00'], [14.5, 0, '15'], [8.25, 1, '8.3'], [7, 2, '7.00'],
  ])('pointsDigits(%p, %p) = %p', (points, digits, want) => expect(pointsDigits(points, digits)).toBe(want));

  test.each([
    [0.10975, 2, '10.98'], [0.00125, 2, '0.13'], [0.02675, 2, '2.68'], [0.145, 0, '15'], [0.0825, 1, '8.3'], [-0.02675, 2, '−2.68'],
  ])('percentDigits(%p, %p) = %p', (rate, digits, want) => expect(percentDigits(rate, digits)).toBe(want));

  test('CF5-08 by hand: 13,170 ÷ 120,000 = 0.10975 exactly → 10.98% (toFixed wrote 10.97)', () => {
    expect(13_170 / 120_000).toBeCloseTo(0.10975, 12);
    expect(percentDigits(13_170 / 120_000, 2)).toBe('10.98');
    expect(((13_170 / 120_000) * 100).toFixed(2)).toBe('10.97');   // the slip, kept to show why the writer exists
  });
});

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' || d.name === 'node_modules' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}
/** the inline percent writers this guard refuses — each the shape a percent was written before 2026-11-01 */
const SHAPES: [string, RegExp][] = [
  ['(x × 100).toFixed(n)', /\*\s*100\s*\)\s*\.toFixed\(/],
  ['Math.round(x × 100) before a %', /Math\.round\((?:[^()]|\([^()]*\))*\*\s*100\)\s*\}?\s*%/],
  ['x.toFixed(n) before a %', /\.toFixed\(\d\)\s*\}?\s*%/],
  // WIDENED 2026-11-02 (FX-CF-C, NW6-05): a whole percent stored first and printed later — Net worth's bar legend (barSegments,
  // Math.round(r.exact)), its spoken shares (pctOf, Math.round((v / total) * 100)), Home's share spent, plan progress — never met a '%'
  // on its own line, so the shapes above could not see it
  ['Math.round(x × 100), a whole percent', /Math\.round\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\*\s*100\)(?!\s*\/\s*100)/],
  ['Math.round of a share already in percent', /Math\.round\(\w+\.(?:exact|pct|percent|share)\w*\)/],
];
/** a rounding of this shape that prints nothing as a percent — each named, with what it is */
const NOT_A_PERCENT: [string, string][] = [
  ['src/screens/BudgetScreen.tsx', 'ProgressBar pct={Math.round(spentPct * 100)}'],   // a bar's drawn width, never printed
  ['src/screens/BudgetScreen.tsx', 'ProgressBar pct={Math.round(bpct * 100)}'],       // a bar's drawn width, never printed
];
const WRITER = 'MoneyKeel/functions/_figure-spec.ts';

test('no file writes a percent except through the one writer — every source file read', () => {
  const files = ['src', 'app', 'MoneyKeel/functions'].flatMap((d) => walk(path.join(ROOT, d)));
  // A GUARD MUST PROVE IT LOOKED: 290 source files on 2026-11-01; a folder that moves goes red here
  expect(files.length).toBeGreaterThanOrEqual(280);
  const offences: string[] = [];
  let lines = 0;
  let carried = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    if (rel === WRITER) continue;
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      lines++;
      if (/^\s*(\*|\/\/)/.test(line)) return;   // a comment describing a shape is not a writer
      if (NOT_A_PERCENT.some(([f, code]) => rel === f && line.includes(code))) { carried++; return; }
      for (const [name, re] of SHAPES) if (re.test(line)) offences.push(`${rel}:${i + 1} — ${name}: ${line.trim().slice(0, 120)}`);
    });
  }
  expect(lines).toBeGreaterThanOrEqual(80_000);   // 84,885 lines read on 2026-11-01
  expect(offences).toEqual([]);
  expect(carried).toBe(NOT_A_PERCENT.length);   // each carried line is still there, found once — none is left to hide
});

test('the detector still fires: each shape is caught on a line written the old way', () => {
  const old = ['`${(rate * 100).toFixed(2)}%`', '`${Math.round(r * 100)}%`', '`${retPct.toFixed(2)}%`',
    'const pctOf = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);', 'const out = raw.map((r) => ({ ...r, pct: Math.round(r.exact) }));'];
  old.forEach((line, i) => expect(SHAPES[i][1].test(line)).toBe(true));
  expect(SHAPES.some(([, re]) => re.test('`${percentDigits(rate, 2)}%`'))).toBe(false);
  expect(SHAPES.some(([, re]) => re.test('return Math.round(rate * 100) / 100;'))).toBe(false);   // a cut to two decimals is not a whole percent
});
