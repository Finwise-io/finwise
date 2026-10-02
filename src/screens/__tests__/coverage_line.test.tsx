// The app must SAY how far back it can see — on every screen that offers a window.
// Founder 2026-08-18: "Is the reasoning displayed to the user? Or is this a gate for a human
// developer?" It was a developer gate. These pin the user-facing half so it cannot quietly go away.
import * as fs from 'fs';
import * as path from 'path';

const SCREENS = ['NetWorthScreen.tsx', 'PerformanceScreen.tsx', 'HoldingDetailScreen.tsx'];
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
// 2026-09-28: these two rules moved behind MK-NW-O-008 thePerformance (Q-PF-1). The pins are
// unchanged in purpose — the beginning comes from the record, and a refused rate says why — they
// just read the door now instead of the screen, which is where the rules actually live.
const door = () => fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'functions', 'networth-and-performance', 'performance.ts'), 'utf8');

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
  test('the beginning is READ from the record — for the portfolio walk AND each account walk', () => {
    // 2026-09-28: both walks are the same door now (MK-NW-O-008 thePerformance, Q-PF-1), so the rule
    // is pinned once, where it lives, instead of twice in a screen that could drift apart from itself.
    const src = door();
    expect(src).toContain("engines/snapshots");
    expect(src).toMatch(/snapshotCovers\(days, bounds\.beginningAsOf\)/);
    expect(src).toMatch(/beginningAsOf/);   // D3: the close of the day BEFORE the start
    // and the screen asks it twice — once for everything, once per account
    expect((read('PerformanceScreen.tsx').match(/thePerformance\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
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

  test('the D4 return refusals are wired — and since v17 a refusal shows the EXACT RATE, not its sentence', () => {
    const src = door();
    expect(src).toContain("engines/window-return");
    // the refusal is carried on the window's own figures (one set per window, 2026-09-25) and only a
    // REAL refusal speaks: having no record yet is an em-dash, not a sentence
    expect(src).toMatch(/const refused = verdict != null && verdict\.rate == null;/);
    expect(src).toMatch(/sentence: refused \? verdict!\.sentence : ''/);
    // HIS RULING ON Q52, built as mock v17 mark 16 and approved 2026-09-30: where the window return
    // refuses, the exact rate per year stands in its place and the note says WHAT THE FIGURE IS. So the
    // screen no longer prints the refusal sentence when a rate could be stated — it prints it only when
    // even the rate refuses. This assertion is inverted rather than deleted, so the old behaviour
    // cannot creep back.
    const screen = read('PerformanceScreen.tsx');
    expect(src).toMatch(/refusedRate/);                                  // the door hands it out
    expect(screen).toMatch(/sentence && refusedRate != null/);           // the screen prefers the rate
    // the words live in the door (RATE_STANDS_IN_WORDS, 2026-10-01) and both screens print that one constant
    expect(src).toMatch(/this is your rate per year, counting when you added money/);
    expect(screen).toMatch(/RATE_STANDS_IN_WORDS/);
    expect(screen).not.toMatch(/\{sentence\s*\n?\s*\?\s*sentence/);     // the old unconditional branch is gone
  });
});
