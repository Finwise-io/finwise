// The master record of what an account holder owns, saved to the account holder's cloud account (his "yes", 2026-11-11:
// "should the list also be saved to your cloud account? - yes").
//
// The record only ever grows: rows are added, never changed. So it is saved in parts of a fixed size, and a save writes
// only the parts that changed — the last part the phone had, and any new ones. Each part is encrypted by the writer the
// rest of the cloud copy uses, and lives under users/{uid}/assetRecord/{part}, which the access rules keep to the account
// holder and a household member.
import type { AssetRow } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';

/** What reading one part gives: its rows, null where there is no such part, or UNREADABLE where the part is there but this
 *  phone cannot read it (no key yet, after a password reset and before the recovery code). */
export const UNREADABLE = 'unreadable' as const;
export type PartRead = AssetRow[] | null | typeof UNREADABLE;

/** A part of the cloud's record this phone cannot read: the load stops and no save is allowed. */
export class RecordCannotBeRead extends Error {
  constructor(public part: number) {
    super(`part ${part + 1} of the record in the cloud cannot be read on this phone (no key yet — the recovery code brings it); nothing is saved to the cloud until every part can be read`);
    this.name = 'RecordCannotBeRead';
  }
}

/** Rows per saved part: small enough that a part stays far below the cloud's size limit for one document. */
export const ROWS_PER_PART = 400;

/** The parts the record is saved in, in order. */
/* ─ MK-XS-F-224 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * partsOf
 *
 * Answers ..... The parts the record is saved in, in order.
 *
 * Formula .....
 *     out = []
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-225 partsToWrite
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-225 partsToWrite · MK-XS-F-240 saveRecordGuarded
 *               MK-XS-F-226 saveRecordToCloud
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-224
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function partsOf(record: readonly AssetRow[], size = ROWS_PER_PART): AssetRow[][] {
  const out: AssetRow[][] = [];
  for (let i = 0; i < record.length; i += size) out.push(record.slice(i, i + size));
  return out;
}

/** The parts a save must write, given how many rows the cloud already holds: the part the last saved row is in (it may
 *  have grown) and every part after it. Nothing, where the cloud already holds every row. */
/* ─ MK-XS-F-225 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * partsToWrite
 *
 * Answers ..... The parts a save must write, given how many rows the cloud already holds: the part the last saved row is in (it may have grown) and every part after it.
 *
 * Formula .....
 *     []   when record.length ≤ rows in cloud
 *     first part = round down(rows in cloud ÷ size)
 *     the answer = for each of parts of(record, size): { part, each } where part ≥ first part
 *
 * Called by ... MK-XS-F-226 saveRecordToCloud · MK-XS-F-240 saveRecordGuarded
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-240 saveRecordGuarded · MK-XS-F-226 saveRecordToCloud
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-225
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function partsToWrite(record: readonly AssetRow[], rowsInCloud: number, size = ROWS_PER_PART): { part: number; rows: AssetRow[] }[] {
  if (record.length <= rowsInCloud) return [];
  const firstPart = Math.floor(rowsInCloud / size);
  return partsOf(record, size).map((rows, part) => ({ part, rows })).filter((p) => p.part >= firstPart);
}

/** Save the parts that changed. `write` saves one part; it is the cloud's, or a test's. Returns the rows now in the cloud. */
/* ─ MK-XS-F-226 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * saveRecordToCloud
 *
 * Answers ..... Save the parts that changed.
 *
 * Formula .....
 *     max(count of record, rows in cloud)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-226
 * Changed ..... 2026-11-11 (d188fd68)
 */
export async function saveRecordToCloud(record: readonly AssetRow[], rowsInCloud: number,
  write: (part: number, rows: AssetRow[]) => Promise<boolean | void>, size = ROWS_PER_PART): Promise<number> {
  // a part the cloud did not take (false: no key on the phone yet) stops the save, and only the rows before it count as
  // saved, so the next save writes it again (found 2026-11-12: every row was counted, and that part was never written)
  for (const { part, rows } of partsToWrite(record, rowsInCloud, size)) if ((await write(part, rows)) === false) return Math.max(rowsInCloud, part * size);
  return Math.max(record.length, rowsInCloud);
}

/** Read every part in order until one is missing. `read` reads one part (null where there is none). */
/* ─ MK-XS-F-227 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * loadRecordFromCloud
 *
 * Answers ..... Read every part in order until one is missing.
 *
 * Formula .....
 *     out = []
 *     rows = await read(part)
 *     out   when count of rows is missing (or rows is missing when missing or zero)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-239 loadCloudRecord
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-239 loadCloudRecord
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in part of 0.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-227
 * Changed ..... 2026-11-11 (d188fd68)
 */
export async function loadRecordFromCloud(read: (part: number) => Promise<PartRead>): Promise<AssetRow[]> {
  const out: AssetRow[] = [];
  for (let part = 0; ; part++) {
    const rows = await read(part);
    // a part that is there but cannot be read (no key on this phone yet) is NOT the end of the record: the load fails, and
    // nothing is saved until a later load reads every part (outside check 2, 2026-11-12: 800 rows became 402)
    if (rows === UNREADABLE) throw new RecordCannotBeRead(part);
    if (!rows || !rows.length) return out;
    out.push(...rows);
  }
}

/** The record to keep when the phone and the cloud both hold one. The record only grows, so where one is the start of
 *  the other the longer one is kept. Where they part ways (two phones added rows apart), the phone's record is kept and
 *  `differ` says so — the rows are never mixed, and nothing is lost: the cloud's copy stays where it is. */
/* ─ MK-XS-F-228 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * recordToKeep
 *
 * Answers ..... The record to keep when the phone and the cloud both hold one.
 *
 * Formula .....
 *     n = min(count of phone, count of cloud)
 *     same start = (a: asset row, b: asset row) => row id = row id and written at = written at and kind = kind and account id = account id
 *     the answer:
 *     record = [...(cloud.length > phone.length ? cloud : phone)]
 *     differ = false
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-230 recordOnSignIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-230 recordOnSignIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-228
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function recordToKeep(phone: readonly AssetRow[], cloud: readonly AssetRow[]): { record: AssetRow[]; differ: boolean } {
  const n = Math.min(phone.length, cloud.length);
  const sameStart = (a: AssetRow, b: AssetRow) => a.rowId === b.rowId && a.writtenAt === b.writtenAt && a.kind === b.kind && a.accountId === b.accountId;
  for (let i = 0; i < n; i++) if (!sameStart(phone[i], cloud[i])) return { record: [...phone], differ: true };
  return { record: [...(cloud.length > phone.length ? cloud : phone)], differ: false };
}

/** WHAT THE APP STARTS FROM WHEN THE CLOUD'S RECORD COMES IN AT SIGN-IN (outside check, 2026-11-12).
 *  · The phone's record counts only where it is this same person's (`owner` noted when it was last loaded, the household's
 *    id or the person's own); another person's, or one whose owner was never noted, is dropped — never uploaded.
 *  · "Rows in cloud" is what the cloud actually holds, so the next save writes every part the cloud lacks (the phone held
 *    410 rows, the cloud 390: counting 410 meant the 20 were never sent, and rows 391–400 were lost after the next change).
 *  · Where the phone's and the cloud's records part ways (two phones), nothing is uploaded: the cloud's copy stays intact,
 *    the phone keeps its own, and `fault` says so. A mix of the two is never written. */
/* ─ MK-XS-F-230 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * recordOnSignIn
 *
 * Answers ..... WHAT THE APP STARTS FROM WHEN THE CLOUD'S RECORD COMES IN AT SIGN-IN (outside check, 2026-11-12).
 *
 * Formula .....
 *     mine = phone.record   if phone.owner = owner
 *     []   otherwise
 *     kept = record to keep(mine, cloud)
 *     the answer:
 *     record = kept.record
 *     rows in cloud = count of cloud
 *     may upload = true
 *     fault = nothing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-230
 * Changed ..... not in git yet (—)
 */
export function recordOnSignIn(phone: { record: readonly AssetRow[]; owner: string | null | undefined }, cloud: readonly AssetRow[], owner: string):
  { record: AssetRow[]; rowsInCloud: number; mayUpload: boolean; fault: string | null } {
  const mine = phone.owner === owner ? phone.record : [];
  const kept = recordToKeep(mine, cloud);
  if (kept.differ) {
    return { record: kept.record, rowsInCloud: cloud.length, mayUpload: false,
      fault: `the record on this phone (${mine.length} rows) and the one in the cloud (${cloud.length} rows) part ways; this phone's record is not saved to the cloud, and the cloud's is kept as it is` };
  }
  return { record: kept.record, rowsInCloud: cloud.length, mayUpload: true, fault: null };
}

/** THE MARKER BESIDE THE PARTS (his "go", 2026-11-12): which phone saved the record last, how many rows it holds, and its last
 *  row's id and stamp. Not sensitive — a random phone id, a count, a row number and a time — so it is kept unencrypted, and a
 *  phone with no key yet can still read it. */
export interface CloudMarker { writer: string; rows: number; lastRowId: string | null; lastWrittenAt: string | null; at?: string }

/** A short stamp of the cloud copy of the record: who wrote it, how many rows it has, its last row and when that was written. */
/* ─ MK-XS-F-237 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * markerOf
 *
 * Answers ..... A short stamp of the cloud copy of the record: who wrote it, how many rows it has, its last row and when that was written.
 *
 * Formula .....
 *     last = record[record.length − 1]
 *     the answer:
 *     writer = writer
 *     rows = count of record
 *     last row id = last.row id (or nothing when missing)
 *     last written at = last.written at (or nothing when missing)
 *     at = at
 *
 * Called by ... MK-XS-F-240 saveRecordGuarded
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-240 saveRecordGuarded
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-237
 * Changed ..... not in git yet (—)
 */
export function markerOf(record: readonly AssetRow[], writer: string, at: string): CloudMarker {
  const last = record[record.length - 1];
  return { writer, rows: record.length, lastRowId: last?.rowId ?? null, lastWrittenAt: last?.writtenAt ?? null, at };
}

/** Two markers are the same cloud state when the writer, the count and the last row agree; no marker matches only no marker. */
/* ─ MK-XS-F-238 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sameMarker
 *
 * Answers ..... Two markers are the same cloud state when the writer, the count and the last row agree; no marker matches only no marker.
 *
 * Formula .....
 *     !a and !b   when a is missing (or b is missing when missing or zero)
 *     writer = writer and rows = rows and (last row id ?? nothing) = (last row id ?? nothing) and (last written at ?? nothing) = (last written at ?? nothing)
 *
 * Called by ... MK-XS-F-233 commitAssetRecord · MK-XS-F-239 loadCloudRecord
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-239 loadCloudRecord
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-238
 * Changed ..... not in git yet (—)
 */
export function sameMarker(a: CloudMarker | null | undefined, b: CloudMarker | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.writer === b.writer && a.rows === b.rows && (a.lastRowId ?? null) === (b.lastRowId ?? null) && (a.lastWrittenAt ?? null) === (b.lastWrittenAt ?? null);
}

/** A load whose parts and marker never agreed: taken as not read, so nothing is saved. */
export class RecordNotSettled extends Error {
  constructor(rows: number, marker: CloudMarker) {
    super(`the record in the cloud (${rows} rows read) does not match its marker (${marker.rows} rows, saved by another phone); nothing is saved until a later load reads it whole`);
    this.name = 'RecordNotSettled';
  }
}

/** Read the marker, every part, and the marker again; the load counts only where the two marker reads agree and the parts
 *  hold exactly the rows the marker names (another phone may be mid-save). A cloud saved before the marker existed has none,
 *  and is taken as read. Throws RecordCannotBeRead or RecordNotSettled. */
/* ─ MK-XS-F-239 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * loadCloudRecord
 *
 * Answers ..... Read the marker, every part, and the marker again; the load counts only where the two marker reads agree and the parts hold exactly the rows the marker names (another phone may be mid-save).
 *
 * Formula .....
 *     promise<cloud marker | nothing>, read part: (part: number) => promise<part read>, tries = 3):
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-239
 * Changed ..... not in git yet (—)
 */
export async function loadCloudRecord(readMarker: () => Promise<CloudMarker | null>, readPart: (part: number) => Promise<PartRead>, tries = 3):
  Promise<{ record: AssetRow[]; marker: CloudMarker | null }> {
  let last: RecordNotSettled | null = null;
  for (let i = 0; i < tries; i++) {
    const before = await readMarker();
    const record = await loadRecordFromCloud(readPart);
    const after = await readMarker();
    if (!sameMarker(before, after)) continue;
    if (!before) return { record, marker: null };
    const end = record[record.length - 1];
    if (record.length === before.rows && (end?.rowId ?? null) === (before.lastRowId ?? null) && (end?.writtenAt ?? null) === (before.lastWrittenAt ?? null)) return { record, marker: before };
    last = new RecordNotSettled(record.length, before);
  }
  throw last ?? new RecordNotSettled(-1, { writer: '?', rows: -1, lastRowId: null, lastWrittenAt: null });
}

/** What this phone last read or wrote in the cloud: the marker and the rows that marker names. */
export interface CloudSeen { marker: CloudMarker | null; rowsInCloud: number }

/** Writes the parts and the new marker as ONE step, and only where the cloud's marker still equals `expected` — the cloud's
 *  transaction does this (services/firebase commitAssetRecord). 'no-key': nothing written, the phone has no key yet. */
export type CommitRecord = (parts: { part: number; rows: AssetRow[] }[], expected: CloudMarker | null, next: CloudMarker) =>
  Promise<{ status: 'saved' } | { status: 'no-key' } | { status: 'moved-on'; marker: CloudMarker | null }>;

/** SAVE THE RECORD ONLY WHERE THIS PHONE SAVED OR READ THE CLOUD'S COPY LAST (his "go", 2026-11-12). Where another phone has
 *  saved since, nothing is written: both copies stay as they are, and `fault` says so. */
/* ─ MK-XS-F-240 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * saveRecordGuarded
 *
 * Answers ..... SAVE THE RECORD ONLY WHERE THIS PHONE SAVED OR READ THE CLOUD'S COPY LAST (his "go", 2026-11-12).
 *
 * Formula .....
 *     parts = parts to write(record, seen.rows in cloud, size)
 *     status = 'nothing'
 *     seen = seen
 *     fault = nothing   when count of parts is missing
 *     next = marker of(record, writer, at)
 *     r = await commit(parts, seen.marker, next)
 *     status = 'saved'
 *     seen = marker = next
 *     rows in cloud = count of record
 *     fault = nothing   when status = 'saved'
 *     status = 'no − key'
 *     seen = seen
 *     fault = nothing   when status = 'no − key'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-240
 * Changed ..... not in git yet (—)
 */
export async function saveRecordGuarded(record: readonly AssetRow[], seen: CloudSeen, writer: string, commit: CommitRecord, at: string, size = ROWS_PER_PART):
  Promise<{ status: 'saved' | 'nothing' | 'no-key' | 'moved-on'; seen: CloudSeen; fault: string | null }> {
  const parts = partsToWrite(record, seen.rowsInCloud, size);
  if (!parts.length) return { status: 'nothing', seen, fault: null };
  const next = markerOf(record, writer, at);
  const r = await commit(parts, seen.marker, next);
  if (r.status === 'saved') return { status: 'saved', seen: { marker: next, rowsInCloud: record.length }, fault: null };
  if (r.status === 'no-key') return { status: 'no-key', seen, fault: null };
  return { status: 'moved-on', seen,
    fault: `another phone has saved the record to the cloud since this phone last read it (the cloud now holds ${r.marker?.rows ?? 'an unknown number of'} rows, this phone read ${seen.rowsInCloud}); this phone's ${record.length} rows are not saved, so the two are never mixed — both copies are kept as they are` };
}

/** The record is loaded, moved onto, or saved only once this person's profile (their accounts) has loaded from the cloud in
 *  this session (outside check 2, 2026-11-12: B's profile load failed, and A's accounts were moved into B's record). */
/* ─ MK-XS-F-241 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * recordWorkAllowed
 *
 * Answers ..... The record is loaded, moved onto, or saved only once this person's profile (their accounts) has loaded from the cloud in this session (outside check 2, 2026-11-12: B's profile load failed, and A's accounts were moved into B's record).
 *
 * Formula .....
 *     !!uid and profile loaded for = uid
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-241
 * Changed ..... not in git yet (—)
 */
export function recordWorkAllowed(uid: string | null | undefined, profileLoadedFor: string | null | undefined): boolean {
  return !!uid && profileLoadedFor === uid;
}
