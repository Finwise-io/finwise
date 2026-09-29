/** ONE DOOR each for the four Cash flow questions built on 2026-09-28:
 *   · MK-CF-O-005 theContributionRoom (Q-CF-4, ruled "yes")
 *   · MK-CF-O-006 theCreditLine       (Q-CF-6 — one screen, no decision)
 *   · MK-CF-O-007 theTaxOrganizer     (Q-CF-5 — shares the ONE tax function with Q-CF-1)
 *   · MK-CF-O-008 whatsComing         (Q-CF-3, ruled "yes")
 *
 *  Q-CF-2 is NOT here: it waits on conflict C-2, which is the founder's to settle — MK-CF-O-002
 *  spending and MK-CF-O-003 thisMonth are genuine siblings (neither calls the other) and both print
 *  on Home and the Cash flow tab. One function, or two?
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('each screen asks its door', () => {
  expect(read('src/screens/ContributionRoomScreen.tsx')).toMatch(/theContributionRoom\(/);
  expect(read('src/screens/CreditScreen.tsx')).toMatch(/theCreditLine\(/);
  expect(read('src/screens/TaxOrganizerScreen.tsx')).toMatch(/theTaxOrganizer\(/);
  expect(read('src/screens/BillCalendarScreen.tsx')).toMatch(/whatsComing\(/);
});

test('none of them works the answer out for itself any more', () => {
  const offences: string[] = [];
  const checks: [string, string[]][] = [
    ['src/screens/ContributionRoomScreen.tsx', ['k401Headroom(', 'annualIraLimit(', 'annualHsaLimit(', 'perMonthToFill(']],
    ['src/screens/CreditScreen.tsx', ['creditUtilization(']],
    ['src/screens/TaxOrganizerScreen.tsx', ['taxOrganizer(op', 'incomeFromAccounts(']],
    ['src/screens/BillCalendarScreen.tsx', ['upcomingBills(']],
  ];
  for (const [rel, parts] of checks) {
    const src = read(rel);
    for (const p of parts) if (src.includes(p)) offences.push(`${rel} still calls ${p}`);
  }
  expect(offences).toEqual([]);
});
