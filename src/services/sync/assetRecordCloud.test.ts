import { addRows, valueRows, type NewRow } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';
import { partsOf, partsToWrite, saveRecordToCloud, loadRecordFromCloud, recordToKeep } from './assetRecordCloud';

const A = 'acct-1';
const purchase = (date: string, shares: number, price: number): NewRow => ({ accountId: A, holding: 'MSFT', kind: 'PURCHASE', date, shares, price, amount: shares * price, source: 'linked' });
/** A record of n rows, one purchase per row. */
const recordOf = (n: number) => addRows([], Array.from({ length: n }, (_, i) => purchase('2026-01-01', i + 1, 100)), '2026-01-01T12:00:00.000Z');

test('the record is saved in parts of a fixed size, in order, and every row is in exactly one part', () => {
  const r = recordOf(10);
  const parts = partsOf(r, 4);
  expect(parts.map((p) => p.length)).toEqual([4, 4, 2]);
  expect(parts.flat()).toEqual(r);
});

test('a save writes only the part the last saved row is in and the parts after it; with nothing new, nothing', () => {
  const r = recordOf(10);
  expect(partsToWrite(r, 0, 4).map((p) => p.part)).toEqual([0, 1, 2]);
  expect(partsToWrite(r, 6, 4).map((p) => p.part)).toEqual([1, 2]);   // part 1 holds rows 5–8: it grew
  expect(partsToWrite(r, 8, 4).map((p) => p.part)).toEqual([2]);
  expect(partsToWrite(r, 10, 4)).toEqual([]);
});

test('saved and loaded back, the record is the same, row for row — his Microsoft case, ten days of values and the purchase', async () => {
  let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
  const days: [string, number][] = [['2026-09-15', 450], ['2026-09-27', 470], ['2026-10-15', 475], ['2026-10-16', 340], ['2026-10-17', 340],
    ['2026-10-18', 345], ['2026-10-30', 380], ['2026-11-01', 470], ['2026-11-02', 420], ['2026-11-03', 340]];
  for (const [d, p] of days) r = addRows(r, valueRows({ accountId: A, date: d, source: 'linked', cash: 0, holdings: [{ holding: 'MSFT', shares: 500, price: p, value: 500 * p }] }), `${d}T17:00:00.000Z`);
  const cloud = new Map<number, unknown>();
  // the write goes through JSON, as the cloud copy does
  const write = async (part: number, rows: unknown[]) => { cloud.set(part, JSON.parse(JSON.stringify(rows))); };
  const read = async (part: number) => (cloud.get(part) as never) ?? null;
  let inCloud = await saveRecordToCloud(r.slice(0, 11), 0, write, 4);
  expect(inCloud).toBe(11);
  inCloud = await saveRecordToCloud(r, inCloud, write, 4);
  expect(inCloud).toBe(21);
  expect(await loadRecordFromCloud(read)).toEqual(JSON.parse(JSON.stringify(r)));
});

test('the phone and the cloud: the longer is kept where one is the start of the other; where they part ways the phone\'s is kept and it says so', () => {
  const r = recordOf(6);
  expect(recordToKeep(r.slice(0, 4), r)).toEqual({ record: r, differ: false });
  expect(recordToKeep(r, r.slice(0, 4))).toEqual({ record: r, differ: false });
  expect(recordToKeep([], r)).toEqual({ record: r, differ: false });
  const other = addRows(r.slice(0, 4), [purchase('2026-02-01', 9, 1)], '2026-02-01T12:00:00.000Z');
  expect(recordToKeep(r, other)).toEqual({ record: r, differ: true });
});
