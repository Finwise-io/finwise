/**
 * B-L3 guard: every screen that turns numbers into a JUDGMENT (retirement readiness, on-track/gap,
 * savings-rate nudges, emergency-fund verdicts, safety plans) must carry the disclaimer at the point of
 * advice — and must not use imperative "you should / you must withdraw" advice language. Static-source
 * guard so the disclaimer can't be dropped from a judgment screen and the framing can't regress.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', 'screens', f), 'utf8');
// AnalyticsScreen deleted 2026-07-16 (dead code — the analytics tab routes to NetWorthScreen)
const JUDGMENT = ['RetirementCockpit.tsx', 'HomeScreen.tsx', 'StressTestScreen.tsx', 'JobSafetyScreen.tsx'];

test.each(JUDGMENT)('%s renders the shared <Disclaimer/> (B-L3)', (f) => {
  expect(read(f)).toMatch(/<Disclaimer\s*\/>/);
});

test('RetirementCockpit carries a not-advice disclaimer', () => {
  expect(/Disclaimer|not.*advice|informational|educational|guidance/i.test(read('RetirementCockpit.tsx'))).toBe(true);
});

test('no imperative "you should" / "you must withdraw" advice on judgment screens', () => {
  for (const f of [...JUDGMENT, 'RetirementCockpit.tsx']) {
    const src = read(f);
    expect(src).not.toMatch(/you should\b/i);
    expect(src).not.toMatch(/you must withdraw/i);   // RMD is now phrased as a factual IRS requirement
  }
});
