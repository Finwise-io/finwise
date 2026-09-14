/** GUARD — one door for "will it last" (moneykeel_calc_spec_one-door-per-question_v01.md).
 *
 *  Today the retirement function exposes nine inner parts and 16 screen or component files reach for
 *  them directly, each assembling its own inputs — which is how Net worth and Cash flow could show
 *  two different nest eggs for one person. The target is ONE door, MK-PL-O-001 thePlan, and this
 *  guard is the ratchet on the way there: the 16 files are the frozen baseline; no file may start
 *  reaching past the door, and a file that stops is removed from the list so the count only falls.
 *  When the list is empty the ratchet becomes the wall.
 */
import * as fs from 'fs';
import * as path from 'path';

const INNER = ['simulate', 'selectWillItLast', 'willItLastInputs', 'projectNestEgg', 'displayOdds', 'capitalNeeded', 'volOf', 'solveRetireAge', 'RetirementInputs'];
const ROOTS = ['src/screens', 'src/components', 'app', 'src/onboarding', 'src/hooks'];
/** The files that reached past the door on 2026-09-13. Only ever shrinks. */
const BASELINE = new Set<string>([
  'src/components/MortgageRateCompare.tsx',
  'src/components/PlanOutcome.tsx',
  'src/components/SpendMoreControl.tsx',
  'src/onboarding/modules.tsx',
  'src/screens/BigCostsScreen.tsx',
  'src/screens/BudgetScreen.tsx',
  'src/screens/CashFlowScreen.tsx',
  'src/screens/HomeScreen.tsx',
  'src/screens/MultiGoalScreen.tsx',
  'src/screens/NetWorthScreen.tsx',
  'src/screens/PlanHubScreen.tsx',
  'src/screens/RetirementCockpit.tsx',
  'src/screens/RothScreen.tsx',
  'src/screens/SsTimingScreen.tsx',
  'src/screens/WhatIfScreen.tsx',
  'src/screens/WillItLastScreen.tsx',
]);

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}
export function reachingFiles(): string[] {
  const out: string[] = [];
  for (const root of ROOTS) for (const f of walk(root)) {
    const text = fs.readFileSync(f, 'utf8');
    const imports = [...text.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'[^']*(retirement\/willItLast|retirement\/index|retirement'|domain\/retirement)[^']*'/g)].map((m) => m[1]).join(',');
    if (INNER.some((s) => new RegExp(`\\b${s}\\b`).test(imports))) out.push(f);
  }
  return out.sort();
}

test('no screen or component starts reaching past the will-it-last door; the 2026-09-13 list only shrinks', () => {
  const now = reachingFiles();
  const offences = now.filter((f) => !BASELINE.has(f)).map((f) => `${f} is NEW — ask the door (MK-PL-O-001 thePlan), not the function's inner parts`);
  for (const f of BASELINE) if (!now.includes(f)) offences.push(`${f} is clean now — delete its BASELINE line so the ratchet holds`);
  expect(offences).toEqual([]);
});
