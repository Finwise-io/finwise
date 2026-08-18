// The app must SAY how far back it can see — on every screen that offers a window.
// Founder 2026-08-18: "Is the reasoning displayed to the user? Or is this a gate for a human
// developer?" It was a developer gate. These pin the user-facing half so it cannot quietly go away.
import * as fs from 'fs';
import * as path from 'path';

const SCREENS = ['NetWorthScreen.tsx', 'PerformanceScreen.tsx', 'HoldingDetailScreen.tsx'];
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe('COVERAGE IS STATED ON EVERY SCREEN THAT OFFERS A WINDOW', () => {
  for (const f of SCREENS) {
    test(`${f} computes coverage from the engine and renders the sentence`, () => {
      const src = read(f);
      expect(src).toContain("engines/coverage");          // the ONE engine, not a local rewrite
      expect(src).toMatch(/coverageFor\(/);
      expect(src).toMatch(/coverage\.sentence !== ''/);    // silent when the record covers the window
    });
  }

  test('no screen writes its own version of the sentence', () => {
    for (const f of SCREENS) {
      const src = read(f);
      expect(src).not.toMatch(/when your records begin/);  // the words live in the engine only
    }
  });
});
