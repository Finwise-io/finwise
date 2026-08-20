// THE BENCH'S OWN PROBE — every card computes with its default inputs, through the real engines,
// without throwing, and returns labelled rows. A card that breaks here would break under the
// founder's fingers; this is the "does the interface actually work" gate, run with the suite.
import { CARDS } from '../bench-entry';

describe('the engine bench', () => {
  test('every card computes on its defaults and returns labelled rows', () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(12);
    for (const card of CARDS) {
      const values: Record<string, any> = {};
      for (const f of card.fields) values[f.key] = f.default;
      const rows = card.compute(values);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(typeof r.label).toBe('string');
        expect(typeof r.value).toBe('string');
      }
    }
  });

  test('the ledger card understands its default rows except the deliberate unknown', () => {
    const card = CARDS.find((c) => c.id === 'ledger')!;
    const values: Record<string, any> = {};
    for (const f of card.fields) values[f.key] = f.default;
    const rows = card.compute(values);
    const understood = rows.find((r) => r.label === 'Rows understood')!;
    expect(understood.value).toBe('4 of 5');                       // "Something new" counts in nothing
    expect(understood.note).toContain('Something new');
  });

  test('the identity card closes on the Vanguard statement defaults', () => {
    const card = CARDS.find((c) => c.id === 'identity')!;
    const values: Record<string, any> = {};
    for (const f of card.fields) values[f.key] = f.default;
    const rows = card.compute(values);
    expect(rows[0].value).toContain('CLOSES');
  });

  test('the plan card returns odds on fives with the exact figure in the note', () => {
    const card = CARDS.find((c) => c.id === 'plan')!;
    const values: Record<string, any> = {};
    for (const f of card.fields) values[f.key] = f.default;
    const odds = card.compute(values)[0];
    expect(odds.value).toMatch(/^\d{1,3}%$/);
    expect(Number(odds.value.replace('%', '')) % 5).toBe(0);
  });

  test('every card names its engine as the master file lists it', () => {
    for (const card of CARDS) expect(card.engine.length).toBeGreaterThan(3);
  });
});
