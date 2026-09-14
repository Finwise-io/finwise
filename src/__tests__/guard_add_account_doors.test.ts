/** GUARD — the ways to add an account are typed once (founder, 2026-09-14: "one door one term rule").
 *  Their words and the question above them live in src/constants/doors.ts (ADD_ACCOUNT_DOORS,
 *  ADD_ACCOUNT_QUESTION). A screen that types one of them itself fails here, so the words and where each
 *  door goes cannot drift apart again — which is how Home and Net worth came to name the same door
 *  differently. */
import * as fs from 'fs';
import * as path from 'path';
import { ADD_ACCOUNT_DOORS, ADD_ACCOUNT_QUESTION } from '../constants/doors';

const ROOTS = ['src/screens', 'src/components', 'app'];
/** Owed, each named with where it gets decided — the list may only shrink. */
const OWED: Record<string, string> = {
  'src/screens/ConnectFlowScreen.tsx': 'the Link an account screen — ways-to-add-an-account mock v10 waits on the founder',
  'src/screens/PerformanceScreen.tsx': '"Import from a file instead" — the Performance screen step, next',
  'src/screens/CashFlowScreen.tsx': '"Add by hand" adds an EXPENSE there, not an account — the same words for a different door; to the founder',
};
const walk = (dir: string): string[] => !fs.existsSync(dir) ? [] : fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
  return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
});

test('no screen types an add-account door or its question — every one comes from src/constants/doors.ts', () => {
  const words = [ADD_ACCOUNT_QUESTION, ...ADD_ACCOUNT_DOORS.map((d) => d.title)];
  const offences: string[] = [];
  for (const root of ROOTS) for (const f of walk(root)) {
    if (OWED[f]) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const w of words) {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`['"\`>]\\s*(?:[^'"\`<]{0,4})${esc}`).test(src)) offences.push(`${f} types "${w}"`);
    }
  }
  expect(offences).toEqual([]);
});
