// PRECISION — founder ruling Q49 (2026-09-09): every calculation runs at full precision; rounding
// happens once, at display. This guard reads the calculation code and fails on any rounding inside
// it. Standard: MoneyKeel/documents/standards/moneykeel_calc_spec_precision-and-display_v01.md
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const ROOTS = ['src/domain', 'MoneyKeel/functions', 'Calculation Module code/engines'];
const ALLOWED = new Set(['Calculation Module code/engines/money.ts']);   // round2 is DEFINED here, for the display layer

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { if (!name.includes('__tests__') && name !== 'probes') walk(p, out); }
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, '');

test('no calculation rounds inside itself — round2 calls and cents / four-decimal idioms are absent', () => {
  const offenders: string[] = [];
  for (const root of ROOTS) {
    for (const file of walk(path.join(ROOT, root))) {
      const rel = path.relative(ROOT, file);
      if (ALLOWED.has(rel)) continue;
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      const lines = src.split('\n');
      lines.forEach((ln, i) => {
        if (/(?<![\w.])round2\s*\(/.test(ln)) offenders.push(`${rel}:${i + 1} round2(`);
        if (/Math\.round\([^;]*\*\s*(100|1e4|10000)\s*\)\s*\/\s*(100|1e4|10000)\b/.test(ln)) offenders.push(`${rel}:${i + 1} rounding idiom`);
      });
    }
  }
  expect(offenders).toEqual([]);
});
