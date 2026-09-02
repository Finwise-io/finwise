/**
 * Cross-screen AGREEMENT guard for "take-home" (the bug a user caught on build #30: the income recap
 * showed $22,990/mo while the spending plan showed $24,490 — they disagreed by exactly the 401(k),
 * because the spending plan used `monthlyIncome` (net of tax, BEFORE 401(k)) and the income screen used
 * after-401(k)). Lesson: every screen that DISPLAYS a concept must read ONE helper; agreement tests must
 * cover rendered numbers across screens, not just intra-domain reconciliation.
 *
 * REWRITTEN 2026-08-27. Until today these tests matched the SOURCE TEXT of a local implementation —
 * `monthlyIncome(a) - num(a.c_401k)` — which taxed the full gross and then took the 401(k) off
 * afterwards. That is the wrong order for a traditional contribution, and every other screen used the
 * income grid, which takes it off first: $6,400 here against $6,560 there on a household with a
 * partner. The test could not see it, because it was checking that the code still said what it said.
 * A test that pins an implementation cannot notice the implementation is wrong. These pin behaviour.
 *
 * modules.tsx imports React Native, so the two screen-wiring checks still read the source text — but
 * they now assert only WHICH helper is read, never what the helper contains.
 */
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.join(__dirname, 'modules.tsx'), 'utf8');

test('onboarding does not define its own take-home — it reads the one producer', () => {
  expect(src).not.toMatch(/export function takeHomeMonthly\s*\(/);
  expect(src).toMatch(/from '\.\.\/domain\/savings'/);
});

test('the income recap shows take-home from the shared helper (not a bespoke calc)', () => {
  expect(src).toMatch(/const avgMo = domainTakeHomeMonthly\(a\)/);
});

test('the spending-plan screen shows take-home from the shared helper (the bug fix)', () => {
  expect(src).toMatch(/const net = domainTakeHomeMonthly\(a\)/);
});

test('no screen displays the BEFORE-401(k) figure as "take-home" (regression guard)', () => {
  // the exact buggy line: spending plan binding its displayed net to the net-of-tax helper
  expect(src).not.toMatch(/const net = monthlyIncome\(a\)/);
});
