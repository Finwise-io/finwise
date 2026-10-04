/** ONE DOOR FOR "WHAT ARE MY BONDS WORTH" — MK-NW-O-001 theBonds (Q-NW-4, ruled by the founder
 *  2026-09-27: "Yes - for bonds question only").
 *
 *  A screen that asks this question asks it through the door. Before this, the Bonds screen and an
 *  account's own page each called six bond functions and assembled the answer their own way — the
 *  shape that lets two screens show two numbers for one bond, which is the whole reason the question
 *  has a door.
 *
 *  A RATCHET, like D1 and D6: the files below still reach past the door for something that is NOT
 *  this question, and each one is named with why. No file may join the list; a file that leaves is
 *  struck off, so the count only falls. At zero the ratchet is the wall.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');

/** Reaching past the door is allowed only for these, and only for the reason given. */
const ALLOWED: Record<string, string> = {
  'src/screens/TaxOrganizerScreen.tsx': 'interestIncomeAnnual — an INCOME figure (Q-CF-5), not what a bond is worth',
  'src/screens/IncomeDetailScreen.tsx': 'interestIncomeAnnual — an INCOME figure (Q-CF-1), not what a bond is worth',
  'src/screens/PerformanceScreen.tsx': 'isBond — a CLASSIFIER used to split holdings by category (Q-PF-1), not a bond figure',
};

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
  return /\.tsx?$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
});

test('a screen asks "what are my bonds worth" through the door, and nowhere else', () => {
  const reaching: string[] = [];
  for (const file of walk(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, file);
    if (!/from '.*domain\/bonds'/.test(fs.readFileSync(file, 'utf8'))) continue;
    if (rel in ALLOWED) continue;
    reaching.push(`${rel} imports from domain/bonds — ask MK-NW-O-001 theBonds instead, or add a line to ALLOWED saying which OTHER question it serves`);
  }
  expect(reaching).toEqual([]);

  // the ratchet: a file on the list that has stopped reaching is struck off, so the count only falls
  const stale = Object.keys(ALLOWED).filter((rel) => {
    const p = path.join(ROOT, rel);
    return !fs.existsSync(p) || !/from '.*domain\/bonds'/.test(fs.readFileSync(p, 'utf8'));
  });
  expect(stale.map((f) => `${f} no longer reaches past the door — strike it off ALLOWED so the count only falls`)).toEqual([]);
});

test('the two screens that ask the question import the door, not its parts', () => {
  for (const rel of ['src/screens/BondsScreen.tsx', 'src/screens/AccountPortfolioScreen.tsx']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    expect(src).toMatch(/theBonds/);
    expect(src).not.toMatch(/from '.*domain\/bonds'/);
  }
});
