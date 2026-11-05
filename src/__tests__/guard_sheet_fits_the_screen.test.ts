/**
 * A SHEET FITS ON THE SCREEN AND HAS A WAY OUT (his Build 55 feedback, 2026-11-04, the Add a bond sheet: "I cannot see top,
 * cannot go back"). Root cause: a sheet pinned to the bottom of the screen (position absolute, bottom 0) grew as tall as
 * its form, because the only height limit sat on the ScrollView inside it as a percentage — and a percentage of a box with
 * no height of its own is no limit at all. The form ran up under the clock, and the backdrop, the one way out, was covered.
 * The rule this guard holds, read from every file on disk:
 *   1. a bottom-pinned sheet style carries its own maxHeight (a percentage of the screen, which has a height);
 *   2. no ScrollView inside such a file is limited by a percentage maxHeight;
 *   3. the bond sheet he could not leave shows the ✕ (SheetClose); every other sheet's backdrop is reachable again by rule 1.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const files: string[] = [];
const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) { if (!/__tests__|node_modules/.test(e.name)) walk(p); }
  else if (/\.tsx$/.test(e.name)) files.push(p);
});
walk(path.join(ROOT, 'screens')); walk(path.join(ROOT, 'components'));

const FLOOR_FILES = 85;   // measured 2026-11-04; a pattern that stops matching goes red, not quiet
const pinned = files.filter((f) => /\bsheet\w*: \{[^}]*position: 'absolute'[^}]*bottom: 0/.test(fs.readFileSync(f, 'utf8')));

test('the guard looked: every screen and component file, and the bottom-pinned sheets among them', () => {
  expect(files.length).toBeGreaterThanOrEqual(FLOOR_FILES);
  // Bonds, Performance, Other investments, Goals, Retirement cockpit, Income manager — measured 2026-11-04
  expect(pinned.length).toBeGreaterThanOrEqual(6);
});

test.each(pinned.map((f) => [path.relative(ROOT, f)]))('%s: its pinned sheet has its own height limit and no percentage limit on a ScrollView', (rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const sheetStyles = src.match(/\bsheet\w*: \{[^}]*position: 'absolute'[^}]*bottom: 0[^}]*\}/g) ?? [];
  sheetStyles.forEach((s) => expect(s).toMatch(/maxHeight: '\d+%'/));
  expect(src).not.toMatch(/<ScrollView[^>]*style=\{\{\s*maxHeight: '\d+%'/);
});

test('the Add a bond / Edit bond sheet shows the ✕ — the way out he could not find', () => {
  const src = fs.readFileSync(path.join(ROOT, 'screens/BondsScreen.tsx'), 'utf8');
  expect(src).toMatch(/<View style=\{styles\.sheet\}>\s*<View style=\{styles\.grab\} \/>\s*<SheetClose onPress=\{onClose\} \/>/);
});
