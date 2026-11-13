/** THE CLOUD COPY OF THE MASTER RECORD, design v02 (2026-11-12): the merge replaces the stop-gap refusal (R2, R6, R6a, R7).
 *  The worked numbers are the design's. R1, R3, R4 and R5 (part B) are held in record_merge_part_b_2026_11_12.test.ts; with
 *  no tag to rename with, a clash of names is still refused, never mixed (the R4 test below). */
import { addRows, salesNeedingAnAnswer, type NewRow, type AssetRow } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';
import {
  mergeRecord, saveRecordGuarded, saveRecordMerging, loadCloudRecord, sameMarker, mergeQuestions, recordOnSignInMerging,
  accountsTouched, type CloudMarker,
} from './assetRecordCloud';

const ACC = 'acct-1';
const buy = (i: number): NewRow => ({ accountId: ACC, holding: 'VTI', kind: 'PURCHASE', date: '2026-02-01', shares: i, price: 1, amount: i, source: 'typed' });
const base = (n: number) => addRows([], Array.from({ length: n }, (_, i) => buy(i + 1)), '2026-11-01T00:00:00.000Z');
/** Rows named as R1 names them (`<tag>.<count>`): built here by hand until part B makes asset-record.ts name them. */
const tagged = (tag: string, n: number, at: string): AssetRow[] =>
  addRows([], Array.from({ length: n }, (_, i) => buy(1000 + i)), at).map((r, i) => ({ ...r, rowId: `${tag}.${i + 1}` }));

const markedCloud = () => {
  const parts = new Map<number, AssetRow[]>();
  let marker: CloudMarker | null = null;
  const writes: { part: number; rows: number }[][] = [];
  return {
    parts, writes,
    get marker() { return marker; },
    readMarker: async () => (marker ? { ...marker } : null),
    readPart: async (part: number) => (parts.get(part) ?? null) as any,
    commit: async (toWrite: { part: number; rows: AssetRow[] }[], expected: CloudMarker | null, next: CloudMarker) => {
      if (!sameMarker(marker, expected)) return { status: 'moved-on' as const, marker };
      writes.push(toWrite.map((p) => ({ part: p.part, rows: p.rows.length })));
      for (const { part, rows } of toWrite) parts.set(part, JSON.parse(JSON.stringify(rows)));
      marker = { ...next };
      return { status: 'saved' as const };
    },
  };
};

test('R2 merge 390 → 410 → 415: B read 390 and added 5, A saved 20 first; B reads 410, adds its 5 after them, writing only part 1 (rows 401–415)', async () => {
  const cloud = markedCloud();
  await saveRecordGuarded(base(390), { marker: null, rowsInCloud: 0 }, 'phone-0', cloud.commit, '2026-11-01T00:00:00.000Z');
  const readA = await loadCloudRecord(cloud.readMarker, cloud.readPart);
  const readB = await loadCloudRecord(cloud.readMarker, cloud.readPart);
  const recA = [...readA.record, ...tagged('q8z3m1x7k2pa', 20, '2026-11-02T00:00:00.000Z')];
  const recB = [...readB.record, ...tagged('h4t9w2c6n0re', 5, '2026-11-02T00:00:05.000Z')];
  expect((await saveRecordGuarded(recA, { marker: readA.marker, rowsInCloud: 390 }, 'phone-A', cloud.commit, '2026-11-02T00:00:00.000Z')).status).toBe('saved');
  const reload = () => loadCloudRecord(cloud.readMarker, cloud.readPart);
  const b = await saveRecordMerging(recB, { marker: readB.marker, rowsInCloud: 390 }, 'phone-B', cloud.commit, '2026-11-02T00:00:05.000Z', reload);
  expect(b.status).toBe('saved');
  expect(b.merged).toBe(true);
  expect(b.record).toHaveLength(415);
  const after = await reload();
  expect(after.record).toHaveLength(415);
  expect(cloud.writes.at(-1)).toEqual([{ part: 1, rows: 15 }]);   // part 1 holds rows 401–415
  expect(after.record.slice(0, 410).map((r) => r.rowId)).toEqual(recA.map((r) => r.rowId));   // every cloud row, in order
  expect(after.record.slice(410).map((r) => r.rowId)).toEqual(['h4t9w2c6n0re.1', 'h4t9w2c6n0re.2', 'h4t9w2c6n0re.3', 'h4t9w2c6n0re.4', 'h4t9w2c6n0re.5']);
});

test('R7 three phones save at once: none of the 25 rows is lost', async () => {
  const cloud = markedCloud();
  await saveRecordGuarded(base(390), { marker: null, rowsInCloud: 0 }, 'phone-0', cloud.commit, '2026-11-01T00:00:00.000Z');
  const read = await loadCloudRecord(cloud.readMarker, cloud.readPart);
  const reload = () => loadCloudRecord(cloud.readMarker, cloud.readPart);
  const seen = { marker: read.marker, rowsInCloud: 390 };
  const recs = [['aaaaaaaaaaaa', 10], ['bbbbbbbbbbbb', 10], ['cccccccccccc', 5]].map(([t, n], i) => [...read.record, ...tagged(t as string, n as number, `2026-11-02T00:00:0${i}.000Z`)]);
  const outs = await Promise.all(recs.map((r, i) => saveRecordMerging(r, seen, 'phone-' + i, cloud.commit, '2026-11-02T00:00:00.000Z', reload)));
  expect(outs.every((o) => o.status === 'saved')).toBe(true);
  const after = await reload();
  expect(after.record).toHaveLength(415);
  expect(new Set(after.record.map((r) => r.rowId)).size).toBe(415);
});

test('R7 a merge beaten by other phones 3 times records a fault; its rows stay on the phone', async () => {
  let n = 0;
  const marker = (rows: number): CloudMarker => ({ writer: 'other-' + n, rows, lastRowId: String(rows), lastWrittenAt: 'x' });
  const commit = async () => ({ status: 'moved-on' as const, marker: marker(++n) });
  const reload = async () => ({ record: base(390), marker: marker(390 + n) });
  const rec = [...base(390), ...tagged('h4t9w2c6n0re', 5, '2026-11-02T00:00:05.000Z')];
  const out = await saveRecordMerging(rec, { marker: null, rowsInCloud: 390 }, 'phone-B', commit, 'now', reload);
  expect(out.status).toBe('moved-on');
  expect(out.fault).toMatch(/3 times/);
  expect(out.record).toHaveLength(395);
  expect(n).toBe(3);
});

test('R4 (part B) until old names are renamed: B\'s unsaved 391–395 clash with A\'s 391–410 — nothing is merged or written', async () => {
  const cloudRows = addRows(base(390), Array.from({ length: 20 }, (_, i) => buy(i + 1)), '2026-11-02T00:00:00.000Z');
  const phoneRows = addRows(base(390), Array.from({ length: 5 }, (_, i) => buy(i + 1)), '2026-11-02T00:00:05.000Z');
  const m = mergeRecord(cloudRows, phoneRows);
  expect(m.clashes).toEqual(['391', '392', '393', '394', '395']);
  expect(m.record).toEqual(phoneRows);
});

test('R2 at sign-in: the phone holds 5 rows the cloud lacks after another phone saved 20: 415, may upload', () => {
  const cloud = [...base(390), ...tagged('q8z3m1x7k2pa', 20, '2026-11-02T00:00:00.000Z')];
  const phone = [...base(390), ...tagged('h4t9w2c6n0re', 5, '2026-11-02T00:00:05.000Z')];
  const s = recordOnSignInMerging({ record: phone, owner: 'pat' }, cloud, 'pat');
  expect(s).toMatchObject({ rowsInCloud: 410, mayUpload: true, fault: null });
  expect(s.record).toHaveLength(415);
  expect(accountsTouched(s.added)).toEqual([ACC]);
});

test('R6 A removes purchase row 120 (50 VTI at $200); B, offline, sells 20 VTI from it: after the merge the account holder is asked which purchase', () => {
  const start = addRows([], Array.from({ length: 119 }, (_, i) => ({ ...buy(1), holding: 'CASHX' } as NewRow)), '2026-11-01T00:00:00.000Z');
  const withBuy = addRows(start, [{ accountId: ACC, holding: 'VTI', kind: 'PURCHASE', date: '2026-03-01', shares: 50, price: 200, amount: 10_000, source: 'typed' }], '2026-11-01T00:00:01.000Z');
  expect(withBuy.at(-1)!.rowId).toBe('120');
  const removal = { ...withBuy.at(-1)!, rowId: 'q8z3m1x7k2pa.1', replacesRowId: '120', removed: true, writtenAt: '2026-11-02T00:00:00.000Z' } as AssetRow;
  const sale = { rowId: 'h4t9w2c6n0re.1', accountId: ACC, holding: 'VTI', kind: 'SALE', date: '2026-06-01', shares: 20, price: 250, amount: 5_000, source: 'typed', writtenAt: '2026-11-02T00:00:05.000Z', sells: [{ rowId: '120', shares: 20 }] } as AssetRow;
  const m = mergeRecord([...withBuy, removal], [...withBuy, sale]);
  expect(m.clashes).toEqual([]);
  expect(m.record).toHaveLength(122);
  const asks = salesNeedingAnAnswer(m.record, ACC);
  expect(asks.map((a) => [a.rowId, a.holding, a.shares])).toEqual([['h4t9w2c6n0re.1', 'VTI', 20]]);
});

test('R6a the $350/$320 question asked on A shows on B; answering on B removes it from both', () => {
  const q = { 'acct-1#typed': { at: '2026-11-12T09:00:00Z', events: [{ text: 'Robinhood says $350, you entered $320' }], lists: [] } };
  // A saves its question to the cloud: the cloud had none
  const onA = mergeQuestions({}, q, []);
  expect(onA.questions).toEqual(q);
  // B, which saw none before, reads the cloud's
  const onB = mergeQuestions(onA.questions, {}, []);
  expect(Object.keys(onB.questions)).toEqual(['acct-1#typed']);
  // B answers it (gone from B's phone), having seen it in the cloud: removed from the cloud copy
  const afterAnswer = mergeQuestions(onA.questions, {}, ['acct-1#typed']);
  expect(afterAnswer.questions).toEqual({});
  expect(afterAnswer.answeredHere).toEqual(['acct-1#typed']);
  // and A, reading the cloud again, holds none
  const backOnA = mergeQuestions(afterAnswer.questions, onA.questions, ['acct-1#typed']);
  expect(backOnA.questions).toEqual({});
  expect(backOnA.answeredElsewhere).toEqual(['acct-1#typed']);
});
