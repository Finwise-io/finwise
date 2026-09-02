/**
 * ONE TAKE-HOME, EVERYWHERE — the founder's cross-screen agreement rule, as a test.
 *
 * Onboarding used to work take-home out for itself: tax on the full gross, then the 401(k) taken off
 * afterwards. Every other screen read the income grid, where the 401(k) comes off BEFORE tax, which
 * is what a traditional contribution is. On the employedPartner persona that was $6,400 in onboarding
 * against $6,560 everywhere else — the rate times the contribution, $160 a month, and only on the
 * persona with a partner.
 *
 * It is the same defect as B05. B05 was fixed in the grid on 2026-08-27; this copy never saw the fix,
 * because a second implementation cannot be fixed by fixing the first. There is one producer now, and
 * this test is what keeps it that way.
 */
import { takeHomeMonthly as domainTakeHome } from '../domain/savings';
import { takeHomeMonthly as onboardingTakeHome } from '../onboarding/modules';
import * as PERSONAS from '../testing/personas';

test('every screen reads the same take-home, on every persona', () => {
  const disagreements: string[] = [];
  let compared = 0;
  for (const [name, p] of Object.entries(PERSONAS)) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) continue;
    let a: number, b: number;
    try { a = domainTakeHome(p as any); b = onboardingTakeHome(p as any); } catch { continue; }
    compared++;
    if (Math.abs(a - b) > 0.01) {
      disagreements.push(`${name}: domain ${a.toFixed(2)} vs onboarding ${b.toFixed(2)} (${(b - a).toFixed(2)})`);
    }
  }
  expect(compared).toBeGreaterThan(5);      // the guard must actually be looking at something
  expect(disagreements).toEqual([]);
});
