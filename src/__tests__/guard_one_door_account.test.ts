/** ONE DOOR FOR "what is this one account worth, what is inside it, what happened in it" —
 *  MK-NW-O-002 theAccount (Q-NW-2, ruled by the founder 2026-09-27: "yes").
 *
 *  The account page assembled this answer in five pieces of its own while the itemise screen
 *  assembled its own — the shape that lets two screens disagree about what one account holds. Both
 *  ask the door now, and the two findings the answer carries live in the door rather than in a
 *  screen: an untickered record names no holding, and a hand-entered lump has no inside to read.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the two screens that ask the question import the door', () => {
  expect(read('src/screens/AccountPortfolioScreen.tsx')).toMatch(/theAccount/);
  expect(read('src/screens/ItemizeScreen.tsx')).toMatch(/itemising/);
});

test('neither screen works out an account’s income or a holding’s income for itself', () => {
  for (const rel of ['src/screens/AccountPortfolioScreen.tsx', 'src/screens/ItemizeScreen.tsx']) {
    const src = read(rel);
    // the door answers both; a screen that filters the ledger for DIVIDEND/INTEREST again is
    // assembling a second answer to a question that already has one
    expect(src).not.toMatch(/type === 'DIVIDEND' \|\| t\.type === 'INTEREST'/);
  }
});

test('the itemise screen no longer sums or subtracts the lump for itself', () => {
  const src = read('src/screens/ItemizeScreen.tsx');
  expect(src).not.toMatch(/\bitemizedTotal\(/);
  expect(src).not.toMatch(/\bitemizeRemainder\(/);
});
