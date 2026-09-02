/**
 * ONE NAME, ONE FUNCTION — guard D2's first half.
 *
 * Founder ruling, 2026-08-27: "fix it completely. No two functions doing same thing."
 *
 * On that day fifteen names were each declared in two or more files. Some were byte-identical copies
 * that had already drifted apart in type (round2 in five places); some were an adapter that had taken
 * the name of the thing it wrapped (rmdDivisor, classifyHolding); some were three genuinely different
 * contracts sharing one word (daysBetween — one clamped at zero, one signed, one absolute); and three
 * were written the same week while two screens were built side by side.
 *
 * None of them were found by reading. They were found by counting. So the count is a test.
 *
 * A duplicate name is not a style problem. The function sweep that gives every function its identifier
 * keeps whichever copy it walks FIRST, so the second copy has no identifier, no row in the master file
 * and no header — it is invisible to every check we have, while still running in the app.
 */
import fs from 'fs';
import path from 'path';

const ROOTS = ['src/domain', 'MoneyKeel/functions', 'Calculation Module code/engines', 'src/services'];

/** Where screens live. A screen re-implementing a calculation is the same defect wearing a different
 *  hat — and the FIRST version of this guard could not see any of it, so it reported clean while
 *  `employerMatchMonthly` sat in both src/domain/income and src/onboarding, `takeHomeMonthly` gave two
 *  different answers for a household with a partner, and two screens stamped dates in UTC while the
 *  cash-flow code used the local day. A guard that looks in too few places is worse than none,
 *  because it gets trusted. */
const SCREEN_ROOTS = ['src/screens', 'src/components', 'src/onboarding', 'app'];
const SKIP_DIRS = new Set(['__tests__', 'node_modules', '.git']);

/** Every top-level function declared in a file — exported or not. A private helper collides just as
 *  hard as an exported one, and is harder to see. */
function declarationsIn(file: string): string[] {
  const names: string[] = [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    const m =
      /^export (?:async )?function ([A-Za-z0-9_]+)/.exec(line) ??
      /^export const ([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/.exec(line) ??
      /^export default (?:async )?function ([A-Za-z0-9_]+)/.exec(line) ??
      /^(?:async )?function ([A-Za-z0-9_]+)/.exec(line) ??
      /^const ([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+?)?=>/.exec(line);
    if (m) names.push(m[1]);
  }
  return names;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !entry.name.includes('.test.')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

test('no function name is declared in two places', () => {
  const where = new Map<string, string[]>();
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      for (const name of declarationsIn(file)) {
        where.set(name, [...(where.get(name) ?? []), file]);
      }
    }
  }
  const clashes = [...where.entries()].filter(([, files]) => files.length > 1);
  const report = clashes
    .map(([name, files]) => `  ${name} — declared in ${files.length}:\n${files.map((f) => `      ${f}`).join('\n')}`)
    .join('\n');
  expect(report).toBe('');
});

test('no screen re-implements a function the calculation code already has', () => {
  const calc = new Map<string, string[]>();
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      for (const name of declarationsIn(file)) calc.set(name, [...(calc.get(name) ?? []), file]);
    }
  }
  const clashes: string[] = [];
  for (const root of SCREEN_ROOTS) {
    for (const file of walk(root)) {
      for (const name of declarationsIn(file)) {
        if (calc.has(name)) clashes.push(`  ${name} — calculation: ${calc.get(name)!.join(', ')} · screen: ${file}`);
      }
    }
  }
  expect([...new Set(clashes)].sort().join('\n')).toBe('');
});
