// The app must SAY how far back it can see — on every screen that offers a window.
// Founder 2026-08-18: "Is the reasoning displayed to the user? Or is this a gate for a human
// developer?" It was a developer gate. These pin the user-facing half so it cannot quietly go away.
import * as fs from 'fs';
import * as path from 'path';

const SCREENS = ['NetWorthScreen.tsx', 'PerformanceScreen.tsx', 'HoldingDetailScreen.tsx'];
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe('COVERAGE IS STATED ON EVERY SCREEN THAT OFFERS A WINDOW', () => {
  for (const f of SCREENS) {
    test(`${f} computes coverage from the function and renders the sentence`, () => {
      const src = read(f);
      expect(src).toContain("engines/coverage");          // the ONE function, not a local rewrite
      expect(src).toMatch(/coverageFor\(/);
      expect(src).toMatch(/coverage\.sentence !== ''/);    // silent when the record covers the window
    });
  }

  test('no screen writes its own version of the sentence', () => {
    for (const f of SCREENS) {
      const src = read(f);
      expect(src).not.toMatch(/when your records begin/);  // the words live in the function only
    }
  });
});

// ── Track 1 step 7: the beginning value is READ from the daily record, never back-solved,
// wherever the record covers the window — pinned as source, and proven through the function. ──
describe('BEGINNING VALUES COME FROM THE RECORD', () => {
  test('PerformanceScreen reads valueOn/covers from the snapshot function for BOTH walks', () => {
    const src = read('PerformanceScreen.tsx');
    expect(src).toContain("engines/snapshots");
    expect(src).toMatch(/snapshotCovers\(snapDays, bounds\.beginningAsOf\)/);    // the summary walk
    expect(src).toMatch(/snapshotCovers\(snapDays2, bounds2\.beginningAsOf\)/);  // the per-account walk
    expect(src).toMatch(/beginningAsOf/);   // D3: the close of the day BEFORE the start
  });

  test('a covered window resolves the beginning from the record (function truth)', () => {
    const { buildDayFromAccounts, record, valueOn, covers } = require('../../../Calculation Module code/engines/snapshots');
    const day = buildDayFromAccounts([
      { asset_id: 'vg', source: 'connected', balance: 378022, cash_balance: 837.94,
        positions: [{ ticker: 'VTI', last_price: 250, lots: [{ shares: 1508.73624, cost_per_share: 200 }] }] },
    ], '2026-06-30', '2026-06-30T23:59:00Z');
    const days = record([], day);
    expect(covers(days, '2026-06-30')).toBe(true);          // a July window's beginning is covered
    expect(valueOn(days, new Set(['vg']), '2026-06-30')).toBeCloseTo(1508.73624 * 250 + 837.94, 2);
    expect(covers(days, '2026-06-29')).toBe(false);          // and June's is honestly not
  });

  test('the D4 return refusals are wired: a refused rate shows its sentence in the summary note', () => {
    const src = read('PerformanceScreen.tsx');
    expect(src).toContain("engines/window-return");
    // the refusal is carried on the window's own figures now (one set of figures per window,
    // 2026-09-25) and only a REAL refusal speaks: having no record yet is an em-dash, not a sentence
    expect(src).toMatch(/const refused = verdict != null && verdict\.rate == null;/);
    expect(src).toMatch(/sentence: refused \? verdict!\.sentence : ''/);
    expect(src).toMatch(/\{sentence\s*\n?\s*\?\s*sentence/);
  });
});
