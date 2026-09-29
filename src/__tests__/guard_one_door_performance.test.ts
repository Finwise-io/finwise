/** ONE DOOR for the two Performance questions:
 *   · MK-NW-O-008 thePerformance (Q-PF-1, ruled 2026-09-27: "yes") — the Performance tab and Home
 *   · MK-NW-O-007 theLookBack (Q-PF-2) — one screen, no decision
 *
 *  Performance worked the whole answer out for itself — the window's records, the flows, the
 *  beginning, the walk, the money-weighted return and the yearly-rate rule — while Home printed a
 *  return of its own. The four rulings that answer carries were paid for once each, and they belong
 *  in the door, not in a screen that can lose them.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the Performance screen asks the door, for the portfolio AND for each account', () => {
  const src = read('src/screens/PerformanceScreen.tsx');
  expect((src.match(/thePerformance\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
});

test('it no longer builds a change walk or works the flows out for itself', () => {
  const src = read('src/screens/PerformanceScreen.tsx');
  expect(src).not.toMatch(/buildChangeWalk\(/);
  expect(src).not.toMatch(/modifiedDietzOverWindow\(/);
  expect(src).not.toMatch(/personalFlowTotals\(/);
});

test('the look-back screen asks its door', () => {
  const src = read('src/screens/LookBackScreen.tsx');
  expect(src).toMatch(/theLookBack\(/);
  expect(src).not.toMatch(/from '\.\.\/domain\/performance\/lookBack'/);
});
