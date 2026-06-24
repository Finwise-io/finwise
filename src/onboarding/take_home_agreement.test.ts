/**
 * Cross-screen AGREEMENT guard for "take-home" (the bug a user caught on build #30: the income recap
 * showed $22,990/mo while the spending plan showed $24,490 — they disagreed by exactly the 401(k),
 * because the spending plan used `monthlyIncome` (net of tax, BEFORE 401(k)) and the income screen used
 * after-401(k)). Lesson: every screen that DISPLAYS a concept must read ONE helper; agreement tests must
 * cover rendered numbers across screens, not just intra-domain reconciliation.
 *
 * modules.tsx imports React Native, so (like flow_audit.test) we assert on the source text.
 */
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.join(__dirname, 'modules.tsx'), 'utf8');

test('takeHomeMonthly is the canonical take-home = monthlyIncome minus the 401(k)', () => {
  expect(src).toMatch(/export function takeHomeMonthly\([^)]*\)[^{]*{[\s\S]*?monthlyIncome\(a\)\s*-\s*num\(a\.c_401k\)/);
});

test('the income recap shows take-home from takeHomeMonthly (not a bespoke calc)', () => {
  expect(src).toMatch(/const avgMo = takeHomeMonthly\(a\)/);
});

test('the spending-plan screen shows take-home from takeHomeMonthly (the bug fix)', () => {
  expect(src).toMatch(/const net = takeHomeMonthly\(a\)/);
});

test('no screen displays the BEFORE-401(k) figure as "take-home" (regression guard)', () => {
  // the exact buggy line: spending plan binding its displayed net to the net-of-tax helper
  expect(src).not.toMatch(/const net = monthlyIncome\(a\)/);
});
