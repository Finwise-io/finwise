/** ONE DOOR FOR "what am I worth" — MK-NW-O-003 theNetWorth (Q-NW-1, ruled by the founder
 *  2026-09-27: "Yes - for home, NW tab, and insights").
 *
 *  Four screens each assembled this question for themselves: Home built its own net worth from its
 *  own assets state, the Net worth tab built another, Insights took cash and investable its own way,
 *  and Alternatives took investable a third. Four assemblies of one question — on the figures a
 *  person compares first, where a disagreement is seen immediately.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ASKERS = [
  'src/screens/HomeScreen.tsx',
  'src/screens/NetWorthScreen.tsx',
  'src/screens/InsightsScreen.tsx',
  'src/screens/OtherInvestmentsScreen.tsx',
];

test('every screen that asks "what am I worth" asks the door', () => {
  for (const rel of ASKERS) expect(read(rel)).toMatch(/theNetWorth\(/);
});

test('none of them builds a net worth, a cash total or an investable total for itself', () => {
  const offences: string[] = [];
  for (const rel of ASKERS) {
    const src = read(rel);
    for (const part of ['buildNetWorth(', 'cashTotal(', 'investableAssets(', 'investmentsTotal(']) {
      if (src.includes(part)) offences.push(`${rel} calls ${part} — ask MK-NW-O-003 theNetWorth instead`);
    }
  }
  expect(offences).toEqual([]);
});

test('the change on cash + investments comes from the door, not from the history function', () => {
  // the door hands a RATE and refuses when the record holds no baseline day; a screen calling the
  // history function directly gets a percentage and can print a movement from a day nobody recorded
  expect(read('src/screens/NetWorthScreen.tsx')).not.toMatch(/investableChangePct\(store/);
});
