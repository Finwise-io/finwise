/** ONE DOOR EACH for the last two Net worth questions:
 *   · MK-NW-O-006 theHolding (Q-NW-3) — how is this one holding doing
 *   · MK-NW-O-005 theAlternativesOutlook (Q-NW-6) — what might these earn in a year
 *
 *  Neither carried a decision for the founder: one screen, one question. What they carry are the
 *  refusals, and those now live in the doors rather than in a screen — a screen that re-derives one
 *  is a screen that can forget it.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the holding screen asks the door, and works out none of it for itself', () => {
  const src = read('src/screens/HoldingDetailScreen.tsx');
  expect(src).toMatch(/theHolding\(/);
  for (const part of ['totalShares(', 'costBasis(', 'capGains(', 'realizedFromLedger(']) {
    expect(src).not.toContain(part);
  }
  // and it no longer filters the ledger for its own dividends
  expect(src).not.toMatch(/type === 'DIVIDEND' &&/);
});

test('the alternatives screen takes its forecast from the door', () => {
  expect(read('src/screens/OtherInvestmentsScreen.tsx')).toMatch(/theAlternativesOutlook\(/);
});
