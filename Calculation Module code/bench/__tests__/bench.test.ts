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

// ── the file readers: ANY institution's columns, found by name — and honest when absent ──
describe('the file drop', () => {
  const fs = require('fs');
  const path = require('path');
  const { parseActivityFile, parseHoldingsFile } = require('../bench-entry');
  const DL = path.join(__dirname, '../../../Calculation Module/real-downloads');

  test('a made-up file with unfamiliar column names still parses — and unknown words count in nothing', () => {
    const r = parseActivityFile('Date,Activity Type,Memo,Principal Amount\n1/2/26,Wire In,opening,50000\n3/2/26,Mystery,who knows,777', 'random.csv');
    expect(r.values.rows.split('\n')).toHaveLength(2);
    expect(r.note).toContain('Activity Type');
  });

  test('a file with no recognisable columns says so instead of guessing', () => {
    const r = parseActivityFile('a,b,c\n1,2,3', 'junk.csv');
    expect(r.values.rows).toBeUndefined();
    expect(r.note).toContain('Could not find');
  });

  const vg = path.join(DL, 'tes-vk.csv');
  (fs.existsSync(vg) ? test : test.skip)('the real Vanguard file: 31 activity rows AND 7 holdings from the same file', () => {
    const text = fs.readFileSync(vg, 'utf8');
    expect(parseActivityFile(text, 'tes-vk.csv').values.rows.split('\n')).toHaveLength(31);
    expect(parseHoldingsFile(text, 'tes-vk.csv').values.rows.split('\n')).toHaveLength(7);
  });

  const fid = path.join(DL, 'Fidelity-activity.csv');
  (fs.existsSync(fid) ? test : test.skip)('the real Fidelity file: the Action/Amount columns are found', () => {
    const r = parseActivityFile(fs.readFileSync(fid, 'utf8'), 'Fidelity-activity.csv');
    expect(r.values.rows.split('\n').length).toBeGreaterThan(0);
    expect(r.note).toContain('Action');
  });
});
