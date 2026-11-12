import { addRows, valueRows, type NewRow } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';
import { partsOf, partsToWrite, saveRecordToCloud, loadRecordFromCloud, recordToKeep, recordOnSignIn } from './assetRecordCloud';

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

test('a part the cloud did not take (no key on the phone yet) is not counted as saved: 10 rows, part 1 refused → 4 counted, and the next save writes parts 1 and 2', async () => {
  const r = recordOf(10);
  const written: number[] = [];
  const refuseOne = async (part: number) => { if (part === 1) return false; written.push(part); return true; };
  const inCloud = await saveRecordToCloud(r, 0, refuseOne, 4);
  expect(written).toEqual([0]);
  expect(inCloud).toBe(4);
  expect(partsToWrite(r, inCloud, 4).map((p) => p.part)).toEqual([1, 2]);
});

// OUTSIDE CHECK, 2026-11-12 — what the app starts from when the cloud's record comes in at sign-in.
/** A cloud held in memory, as the app's part writer and reader see it (400 rows a part). */
const memoryCloud = () => {
  const parts = new Map<number, unknown>();
  return {
    write: async (part: number, rows: unknown[]) => { parts.set(part, JSON.parse(JSON.stringify(rows))); return true; },
    read: async (part: number) => (parts.get(part) as any) ?? null,
  };
};

test('the cloud holds 390 rows, the phone 410 (20 never saved, the app was closed); after the restart and one more row the cloud holds all 411', async () => {
  const phone = recordOf(410);
  const cloud = memoryCloud();
  await saveRecordToCloud(phone.slice(0, 390), 0, cloud.write);
  const start = recordOnSignIn({ record: phone, owner: 'uid-a' }, await loadRecordFromCloud(cloud.read), 'uid-a');
  // "rows in cloud" is what the cloud holds, not what the phone holds
  expect(start).toMatchObject({ rowsInCloud: 390, mayUpload: true, fault: null });
  expect(start.record).toHaveLength(410);
  const next = addRows(start.record, [purchase('2026-03-01', 1, 100)], '2026-03-01T12:00:00.000Z');
  await saveRecordToCloud(next, start.rowsInCloud, cloud.write);
  const back = await loadRecordFromCloud(cloud.read);
  expect(back).toHaveLength(411);
  expect(back.map((r) => r.rowId)).toEqual(next.map((r) => r.rowId));
});

test('two phones: the cloud holds 450 rows from phone B, phone A holds 900 of its own; nothing is uploaded, the cloud keeps B\'s 450, the phone keeps its 900, and a fault says so', async () => {
  const b = addRows([], Array.from({ length: 450 }, (_, i) => purchase('2026-01-02', i + 1, 7)), '2026-01-02T12:00:00.000Z');
  const a = recordOf(900);
  const cloud = memoryCloud();
  await saveRecordToCloud(b, 0, cloud.write);
  const start = recordOnSignIn({ record: a, owner: 'uid-a' }, await loadRecordFromCloud(cloud.read), 'uid-a');
  expect(start.mayUpload).toBe(false);
  expect(start.record).toEqual(a);
  expect(start.fault).toMatch(/not saved to the cloud/);
  // a phone record shorter than the cloud's (100 rows) is not written over it either
  const short = recordOnSignIn({ record: recordOf(100), owner: 'uid-a' }, await loadRecordFromCloud(cloud.read), 'uid-a');
  expect(short.mayUpload).toBe(false);
  expect(await loadRecordFromCloud(cloud.read)).toEqual(JSON.parse(JSON.stringify(b)));
});

test('user A signed out and user B signs in on the same phone: A\'s 3 rows are dropped, B starts from B\'s cloud record (none yet), nothing of A\'s is uploaded', () => {
  const aRows = recordOf(3);
  const start = recordOnSignIn({ record: aRows, owner: 'uid-a' }, [], 'uid-b');
  expect(start).toEqual({ record: [], rowsInCloud: 0, mayUpload: true, fault: null });
  // a record on the phone whose owner was never noted is not taken as this person's either
  expect(recordOnSignIn({ record: aRows, owner: undefined }, [], 'uid-b').record).toEqual([]);
});
