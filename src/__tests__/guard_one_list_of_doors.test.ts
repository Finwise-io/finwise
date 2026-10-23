/** GUARD — the ways into the app come from ONE list (founder rulings, 2026-09-14).
 *
 *  "Connect your bank ›", "Import a file from your brokerage ›" and "Add something by hand ›" are the same
 *  three doors on Home, Sharpen your plan and What counts toward retirement. On 2026-08-11 they were made
 *  one shared list, src/constants/doors.ts, and a comment there said every screen used it. Home never did:
 *  it kept "Connect your first account ›" and sent "Add something by hand" to the Net worth tab instead of
 *  the Add account form. The founder found the first in his build-53 notes; the second surfaced while
 *  checking the first. The synonym review could not see either, because it compared words for ideas,
 *  not the doors a person taps, and it trusted the comment.
 *
 *  This fails when any screen or component types a door's title itself instead of taking it from the list,
 *  so the words and the destination cannot drift apart again.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DOORS } from '../constants/doors';

const ROOTS = ['src/screens', 'src/components', 'app'];
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}

test('no screen types a door title itself — every one comes from src/constants/doors.ts', () => {
  const offences: string[] = [];
  for (const root of ROOTS) for (const f of walk(root)) {
    const text = fs.readFileSync(f, 'utf8');
    for (const d of DOORS) if (text.includes(d.title)) offences.push(`${f} types "${d.title}" — take it from DOORS so its words and destination match every other screen`);
  }
  expect(offences).toEqual([]);
});

test('the three screens that offer the doors all read the one list', () => {
  for (const f of ['src/screens/HomeScreen.tsx', 'src/screens/SharpenPlanScreen.tsx', 'src/components/PlanInputs.tsx']) {
    // DOORS may sit beside other names from the same list (Home also reads EMPTY_DOORS for its hero card's spoken label, 2026-10-22)
    expect(fs.readFileSync(f, 'utf8')).toMatch(/import \{[^}]*\bDOORS\b[^}]*\} from '\.\.\/constants\/doors'/);
  }
});

test('the by-hand door opens the Add account form, and connect opens the connect flow', () => {
  expect(DOORS.find((d) => d.title === 'Add something by hand ›')?.route).toBe('/add-account');
  expect(DOORS.find((d) => d.title === 'Connect your bank ›')?.route).toBe('/connect');
});
