// Pass-A pins (design audit 2026-07-16, systemic fix 3): the named undersized controls now carry a
// 44pt effective target — pinned at source level so a future style tweak can't quietly shrink them.
import * as fs from 'fs';
import * as path from 'path';
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', 'screens', f), 'utf8');

const PINS: [string, string, RegExp][] = [
  ['StressTestScreen.tsx', 'preset chips are finger-sized', /preset: \{[^}]*minHeight: 44/],
  ['RothScreen.tsx', 'the rate-change link (key honesty affordance) is 44pt', /link: \{[^}]*minHeight: 44/],
  ['MonthDetailScreen.tsx', 'prev/next month nav is 44pt at 15pt text', /navTxt: \{ fontSize: 15[^}]*minHeight: 44/],
  ['WorthALookScreen.tsx', 'Previous/Next are 44pt', /navTxt: \{[^}]*minHeight: 44/],
  ['ConnectFlowScreen.tsx', 'the merge decision rows are 44pt at 15pt', /mergeOpt: \{[^}]*minHeight: 44/],
  ['BondsScreen.tsx', 'the add action reads as a button, not a bare link', /addLink: \{[^}]*borderWidth: 1.5/],
  ['OtherInvestmentsScreen.tsx', 'the add action reads as a button', /addLink: \{[^}]*borderWidth: 1.5/],
  ['ImportHoldingsScreen.tsx', 'the class-fix control is a visible chip', /secClassBtn: \{ fontSize: 13[^}]*backgroundColor: Colors.primaryLight/],
  ['AuthScreen.tsx', 'Forgot-password looks tappable (primary + weight)', /linkText: \{[^}]*Colors.primary, fontWeight: '600'/],
  ['OnboardingScreen.tsx', 'choice explanations read at 13pt secondary', /choiceSub: \{ fontSize: 13, color: Colors.textSecondary/],
];

test.each(PINS)('%s — %s', (file, _what, re) => {
  expect(read(file)).toMatch(re);
});
