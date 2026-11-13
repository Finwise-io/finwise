/** THE CLOUD COPY OF THE MASTER RECORD, design v02 (2026-11-12), PART B: R1 row names by tag, R3 one broker event saved
 *  once, R4 clashing old names renamed once, R5 two corrections of one row wait for the account holder (DEC-10471).
 *  The worked numbers are the design's. */
import {
  addRows, setRowTag, rowsInForce, competingCorrections, keepOneCorrection, correctRow, openPurchases, activityOf, factsOf,
  type NewRow, type AssetRow,
} from '../../../MoneyKeel/functions/networth-and-performance/asset-record';
import { mergeRecord, saveRecordMerging, saveRecordGuarded, loadCloudRecord, sameMarker, recordOnSignInMerging, repointQuestions, type CloudMarker } from './assetRecordCloud';

const ACC = 'acct-1';
const A_TAG = 'q8z3m1x7k2pa', B_TAG = 'h4t9w2c6n0re';
const buy = (i: number): NewRow => ({ accountId: ACC, holding: 'VTI', kind: 'PURCHASE', date: '2026-02-01', shares: i, price: 1, amount: i, source: 'typed' });
const base = (n: number) => addRows([], Array.from({ length: n }, (_, i) => buy(i + 1)), '2026-11-01T00:00:00.000Z');
const holdingValue = (record: AssetRow[], holding: string) => rowsInForce(record).filter((r) => r.holding === holding && r.kind === 'PURCHASE')
  .reduce((t, r) => t + (r.shares ?? 0) * (r.price ?? 0), 0);

afterEach(() => setRowTag(null));

describe('R1 row names are unique across phones', () => {
  test('cloud rows 1–390; A adds 20 as q8z3m1x7k2pa.1–.20, B adds 5 as h4t9w2c6n0re.1–.5: 25 names, none alike', () => {
    const cloud = base(390);
    setRowTag(A_TAG);
    const a = addRows(cloud, Array.from({ length: 20 }, (_, i) => buy(i + 1)), '2026-11-02T00:00:00.000Z');
    setRowTag(B_TAG);
    const b = addRows(cloud, Array.from({ length: 5 }, (_, i) => buy(i + 1)), '2026-11-02T00:00:05.000Z');
    const names = [...a.slice(390), ...b.slice(390)].map((r) => r.rowId);
    expect(names.slice(0, 2)).toEqual(['q8z3m1x7k2pa.1', 'q8z3m1x7k2pa.2']);
    expect(names.at(19)).toBe('q8z3m1x7k2pa.20');
    expect(names.slice(20)).toEqual(['h4t9w2c6n0re.1', 'h4t9w2c6n0re.2', 'h4t9w2c6n0re.3', 'h4t9w2c6n0re.4', 'h4t9w2c6n0re.5']);
    expect(new Set(names).size).toBe(25);
    expect(cloud.slice(0, 3).map((r) => r.rowId)).toEqual(['1', '2', '3']);   // old names stay
    // count = this tag's highest + 1
    expect(addRows(b, [buy(1)], '2026-11-03T00:00:00.000Z').at(-1)!.rowId).toBe('h4t9w2c6n0re.6');
  });

  test('rows are put in order by their place in the record, never by turning the name into a number', () => {
    // two purchases on one day: the one saved first is sold first, whatever its name reads as
    setRowTag('zzzzzzzzzzzz');
    let r = addRows([], [{ ...buy(10), date: '2026-03-01', price: 100 }], '2026-11-01T00:00:00.000Z');
    setRowTag('aaaaaaaaaaaa');
    r = addRows(r, [{ ...buy(10), date: '2026-03-01', price: 200 }], '2026-11-02T00:00:00.000Z');
    r = addRows(r, [{ accountId: ACC, holding: 'VTI', kind: 'SALE', date: '2026-04-01', shares: 10, price: 300, amount: 3000, source: 'typed' }], '2026-11-03T00:00:00.000Z');
    expect(openPurchases(r, ACC, 'VTI').map((p) => p.price)).toEqual([200]);   // the $100 lot, saved first, was sold
    expect(activityOf(r, ACC).map((x) => x.price)).toEqual([100, 200, 300]);
    // facts on one time-stamp: the one later in the record stands
    const f = addRows(r, [{ accountId: ACC, holding: 'VTI', kind: 'FACT', date: null, source: 'file', facts: { note: 'first' } }, { accountId: ACC, holding: 'VTI', kind: 'FACT', date: null, source: 'file', facts: { note: 'second' } }], '2026-11-04T00:00:00.000Z');
    expect(factsOf(f, ACC, 'VTI').note).toBe('second');
  });

  test('a phone that finds its tag on rows it did not write takes a new tag (backup restored on another phone)', () => {
    const cloud = [...base(390), ...addRows([], [buy(1)], 'x').map((r) => ({ ...r, rowId: `${A_TAG}.1`, writtenAt: '2026-11-02T00:00:00.000Z' }))];
    const phone = [...base(390), ...addRows([], [buy(2)], 'y').map((r) => ({ ...r, rowId: `${A_TAG}.1`, writtenAt: '2026-11-02T00:00:09.000Z' }))];
    const m = mergeRecord(cloud, phone, { tag: A_TAG, spareTag: () => B_TAG });
    expect(m.tagTaken).toBe(true);
    expect(m.record.map((r) => r.rowId).slice(390)).toEqual([`${A_TAG}.1`, `${B_TAG}.1`]);
  });
});

describe('R3 an event both phones fetched is saved once', () => {
  test('both fetched Robinhood’s $42.10 dividend (key rh-88213); B corrected its copy to $42.00: one dividend row, and B’s correction names A’s row', () => {
    const div = (tag: string, at: string): AssetRow => ({ rowId: `${tag}.1`, accountId: ACC, holding: 'MSFT', kind: 'DIVIDEND', date: '2026-11-10', amount: 42.10, source: 'linked', ref: 'rh-88213', writtenAt: at });
    const old = base(390);
    const cloud = [...old, div(A_TAG, '2026-11-11T09:00:00.000Z')];
    setRowTag(B_TAG);
    let phone = [...old, div(B_TAG, '2026-11-11T09:00:03.000Z')];
    const c = correctRow(phone, `${B_TAG}.1`, { amount: 42.00 }, 'typed', '2026-11-11T09:05:00.000Z');
    expect(c.problem).toBeNull();
    phone = c.record;
    const questions = { [`${ACC}#typed`]: { at: 'x', events: [], lists: [], edits: [{ accountId: ACC, holding: 'MSFT', matches: [`${B_TAG}.1`] }] } };
    const m = mergeRecord(cloud, phone, { tag: B_TAG });
    const dividends = m.record.filter((r) => r.kind === 'DIVIDEND');
    expect(dividends.filter((r) => !r.replacesRowId)).toHaveLength(1);
    expect(m.dropped).toEqual({ [`${B_TAG}.1`]: `${A_TAG}.1` });
    const correction = m.record.at(-1)!;
    expect([correction.replacesRowId, correction.amount]).toEqual([`${A_TAG}.1`, 42.00]);
    expect(m.record).toHaveLength(392);
    expect(rowsInForce(m.record).filter((r) => r.kind === 'DIVIDEND').map((r) => r.amount)).toEqual([42.00]);
    // the question naming the dropped copy names the kept row
    expect(repointQuestions(questions, m.dropped)[`${ACC}#typed`].edits[0].matches).toEqual([`${A_TAG}.1`]);
  });
});

describe('R4 clashing old names are renamed once', () => {
  test('B’s unsaved 391–395 clash with A’s 391–410; they become h4t9w2c6n0re.1–.5: merged 410 + 5 = 415, and what names them follows', async () => {
    const cloudRows = addRows(base(390), Array.from({ length: 20 }, (_, i) => buy(i + 1)), '2026-11-02T00:00:00.000Z');
    let phoneRows = addRows(base(390), Array.from({ length: 5 }, (_, i) => buy(i + 1)), '2026-11-02T00:00:05.000Z');
    // a sale on B naming its purchase 393, and a question keyed by it
    phoneRows = addRows(phoneRows, [{ accountId: ACC, holding: 'VTI', kind: 'SALE', date: '2026-05-01', shares: 3, price: 2, amount: 6, source: 'typed', sells: [{ rowId: '393', shares: 3 }] }], '2026-11-02T00:00:06.000Z');
    const m = mergeRecord(cloudRows, phoneRows, { tag: B_TAG });
    expect(m.clashes).toEqual([]);
    expect(m.record).toHaveLength(416);
    expect(m.record.slice(410).map((r) => r.rowId)).toEqual(['h4t9w2c6n0re.1', 'h4t9w2c6n0re.2', 'h4t9w2c6n0re.3', 'h4t9w2c6n0re.4', 'h4t9w2c6n0re.5', 'h4t9w2c6n0re.6']);
    expect(m.record.at(-1)!.sells).toEqual([{ rowId: 'h4t9w2c6n0re.3', shares: 3 }]);
    expect(m.renamed['391']).toBe('h4t9w2c6n0re.1');
    const q = repointQuestions({ [ACC]: { at: 'x', events: [], lists: [], sales: [{ rowId: '396', holding: 'VTI', shares: 3, choices: [{ rowId: '393', firstRowId: '393' }] }] } }, m.renamed);
    expect(q[ACC].sales[0]).toMatchObject({ rowId: 'h4t9w2c6n0re.6', choices: [{ rowId: 'h4t9w2c6n0re.3', firstRowId: 'h4t9w2c6n0re.3' }] });
    // the save of the same record merges and writes 416
    const parts = new Map<number, AssetRow[]>();
    let marker: CloudMarker | null = null;
    const commit = async (toWrite: { part: number; rows: AssetRow[] }[], expected: CloudMarker | null, next: CloudMarker) => {
      if (!sameMarker(marker, expected)) return { status: 'moved-on' as const, marker };
      for (const { part, rows } of toWrite) parts.set(part, rows);
      marker = next; return { status: 'saved' as const };
    };
    await saveRecordGuarded(cloudRows, { marker: null, rowsInCloud: 0 }, 'A', commit, 'a');
    const reload = () => loadCloudRecord(async () => marker, async (p) => parts.get(p) ?? null);
    const out = await saveRecordMerging(phoneRows, { marker: null, rowsInCloud: 390 }, 'B', commit, 'b', reload, undefined, { tag: B_TAG });
    expect(out.status).toBe('saved');
    expect((await reload()).record).toHaveLength(416);
    expect(out.renamed['395']).toBe('h4t9w2c6n0re.5');
    // at sign-in too
    const s = recordOnSignInMerging({ record: phoneRows, owner: 'pat' }, cloudRows, 'pat', { tag: B_TAG });
    expect([s.record.length, s.mayUpload, s.fault]).toEqual([416, true, null]);
  });
});

describe('R5 two corrections of one row change nothing until the account holder answers (DEC-10471)', () => {
  test('row 14 is 100 MSFT at $350; A corrects to $320, B offline to $335: $35,000 until answered, both shown; choosing $320 gives $32,000', () => {
    const start = addRows([], [...Array.from({ length: 13 }, () => ({ ...buy(1), holding: 'CASHX' } as NewRow)),
      { accountId: ACC, holding: 'MSFT', kind: 'PURCHASE', date: '2026-01-10', shares: 100, price: 350, amount: 35_000, source: 'typed' }], '2026-11-01T00:00:00.000Z');
    expect(start.at(-1)!.rowId).toBe('14');
    setRowTag(A_TAG);
    const onA = correctRow(start, '14', { price: 320 }, 'typed', '2026-11-02T10:00:00.000Z').record;
    setRowTag(B_TAG);
    const onB = correctRow(start, '14', { price: 335 }, 'typed', '2026-11-02T10:20:00.000Z').record;
    const merged = mergeRecord(onA, onB, { tag: B_TAG }).record;
    expect(holdingValue(merged, 'MSFT')).toBe(35_000);
    const c = competingCorrections(merged);
    expect(c.map((x) => [x.rowId, x.corrections.map((r) => r.price)])).toEqual([['14', [320, 335]]]);
    const answer = keepOneCorrection(merged, '14', `${A_TAG}.1`);
    const after = addRows(merged, answer, '2026-11-02T11:00:00.000Z');
    expect(holdingValue(after, 'MSFT')).toBe(32_000);
    expect(competingCorrections(after)).toEqual([]);
  });
});
