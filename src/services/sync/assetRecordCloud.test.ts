import { addRows, valueRows, type NewRow } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';
import { partsOf, partsToWrite, saveRecordToCloud, loadRecordFromCloud, recordToKeep, recordOnSignIn,
  saveRecordGuarded, loadCloudRecord, sameMarker, RecordCannotBeRead, UNREADABLE, recordWorkAllowed, type CloudMarker } from './assetRecordCloud';

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

// OUTSIDE CHECK 2, 2026-11-12 — the rule he approved ("go", 2026-11-12): the cloud copy is saved only when this phone is the
// one that last saved it, and nothing is saved until the cloud copy has loaded and been read correctly.
/** A cloud held in memory with the marker beside the parts; `commit` checks the marker and writes parts + marker as one step,
 *  as the cloud's transaction does. `noKey` makes it refuse, as a phone with no key does. */
const markedCloud = () => {
  const parts = new Map<number, unknown>();
  let marker: CloudMarker | null = null;
  const unreadable = new Set<number>();
  return {
    parts, unreadable,
    get marker() { return marker; },
    readMarker: async () => (marker ? { ...marker } : null),
    readPart: async (part: number) => (unreadable.has(part) && parts.has(part) ? UNREADABLE : ((parts.get(part) as any) ?? null)),
    commit: async (toWrite: { part: number; rows: unknown[] }[], expected: CloudMarker | null, next: CloudMarker) => {
      if (!sameMarker(marker, expected)) return { status: 'moved-on' as const, marker };
      for (const { part, rows } of toWrite) parts.set(part, JSON.parse(JSON.stringify(rows)));
      marker = { ...next };
      return { status: 'saved' as const };
    },
  };
};
const rowsOf = (n: number, tag: string, at: string, start: readonly any[] = []) =>
  addRows(start as any, Array.from({ length: n }, (_, i) => ({ ...purchase('2026-02-01', i + 1, 1), holding: tag } as NewRow)), at);

test('two phones at once: the cloud holds 390 rows; phone A adds 20 and saves (410); phone B adds 5 and tries to save — nothing of B\'s is written, the cloud keeps A\'s 410, B keeps its 395, a fault says so, and a third phone reads A\'s 410', async () => {
  const cloud = markedCloud();
  const base = rowsOf(390, 'BASE', '2026-11-01T00:00:00.000Z');
  expect((await saveRecordGuarded(base, { marker: null, rowsInCloud: 0 }, 'phone-0', cloud.commit, '2026-11-01T00:00:00.000Z')).status).toBe('saved');
  const loadA = await loadCloudRecord(cloud.readMarker, cloud.readPart);
  const loadB = await loadCloudRecord(cloud.readMarker, cloud.readPart);
  expect(loadA.record).toHaveLength(390);
  const recA = rowsOf(20, 'A', '2026-11-02T00:00:00.000Z', loadA.record);
  const a = await saveRecordGuarded(recA, { marker: loadA.marker, rowsInCloud: 390 }, 'phone-A', cloud.commit, '2026-11-02T00:00:00.000Z');
  expect(a.status).toBe('saved');
  expect(a.seen).toMatchObject({ rowsInCloud: 410 });
  const recB = rowsOf(5, 'B', '2026-11-02T00:00:05.000Z', loadB.record);
  const b = await saveRecordGuarded(recB, { marker: loadB.marker, rowsInCloud: 390 }, 'phone-B', cloud.commit, '2026-11-02T00:00:05.000Z');
  expect(b.status).toBe('moved-on');
  expect(b.fault).toMatch(/another phone/);
  expect(b.seen).toEqual({ marker: loadB.marker, rowsInCloud: 390 });   // B still believes what it read: it never saves over A
  expect(recB).toHaveLength(395);
  const c = await loadCloudRecord(cloud.readMarker, cloud.readPart);
  expect(c.record).toHaveLength(410);
  expect(c.record.filter((r) => r.holding === 'A')).toHaveLength(20);
  expect(c.record.filter((r) => r.holding === 'B')).toHaveLength(0);
  expect(c.record.map((r) => r.rowId)).toEqual(recA.map((r) => r.rowId));
  expect(cloud.marker).toMatchObject({ writer: 'phone-A', rows: 410 });
});

test('a part this phone cannot read (new phone after a password reset, no key yet) is not the end of the record: the cloud holds 800 rows, part 0 cannot be read — the load fails, nothing is saved, and the cloud still holds all 800', async () => {
  const cloud = markedCloud();
  const full = rowsOf(800, 'OLD', '2026-11-01T00:00:00.000Z');
  await saveRecordGuarded(full, { marker: null, rowsInCloud: 0 }, 'phone-0', cloud.commit, '2026-11-01T00:00:00.000Z');
  cloud.unreadable.add(0); cloud.unreadable.add(1);
  await expect(loadRecordFromCloud(cloud.readPart)).rejects.toBeInstanceOf(RecordCannotBeRead);
  await expect(loadCloudRecord(cloud.readMarker, cloud.readPart)).rejects.toThrow(/part 1 of 2|cannot be read/);
  // only part 1 unreadable: still not taken as a 400-row record
  cloud.unreadable.delete(0);
  await expect(loadCloudRecord(cloud.readMarker, cloud.readPart)).rejects.toBeInstanceOf(RecordCannotBeRead);
  // a phone that never loaded holds no "seen" marker; a save from it with 2 new rows is refused, and the 800 stay
  const fresh = rowsOf(2, 'NEW', '2026-11-12T00:00:00.000Z');
  expect((await saveRecordGuarded(fresh, { marker: null, rowsInCloud: 0 }, 'phone-new', cloud.commit, '2026-11-12T00:00:00.000Z')).status).toBe('moved-on');
  cloud.unreadable.clear();   // the recovery code is entered: the next load reads every row
  expect((await loadCloudRecord(cloud.readMarker, cloud.readPart)).record).toHaveLength(800);
});

test('a load that catches another phone mid-save (marker and parts disagree: marker says 390, parts hold 410) is not taken as read', async () => {
  const cloud = markedCloud();
  const base = rowsOf(390, 'BASE', '2026-11-01T00:00:00.000Z');
  await saveRecordGuarded(base, { marker: null, rowsInCloud: 0 }, 'phone-0', cloud.commit, '2026-11-01T00:00:00.000Z');
  const more = rowsOf(20, 'A', '2026-11-02T00:00:00.000Z', base);
  partsOf(more).forEach((rows, part) => cloud.parts.set(part, rows));   // parts written, marker not
  await expect(loadCloudRecord(cloud.readMarker, cloud.readPart, 2)).rejects.toThrow(/does not match/);
});

test('the record is touched (loaded, moved onto, saved) only once this person\'s profile has loaded from the cloud', () => {
  expect(recordWorkAllowed('uid-b', null)).toBe(false);        // B's profile load failed or is still running
  expect(recordWorkAllowed('uid-b', 'uid-a')).toBe(false);     // the profile on the phone is A's
  expect(recordWorkAllowed(null, 'uid-a')).toBe(false);        // nobody signed in
  expect(recordWorkAllowed('uid-b', 'uid-b')).toBe(true);
});
