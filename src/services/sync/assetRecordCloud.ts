// The master record of what an account holder owns, saved to the account holder's cloud account (his "yes", 2026-11-11:
// "should the list also be saved to your cloud account? - yes").
//
// The record only ever grows: rows are added, never changed. So it is saved in parts of a fixed size, and a save writes
// only the parts that changed — the last part the phone had, and any new ones. Each part is encrypted by the writer the
// rest of the cloud copy uses, and lives under users/{uid}/assetRecord/{part}, which the access rules keep to the account
// holder and a household member.
import { salesNeedingAnAnswer, sortArriving, tagOfRowName, highestCountOf, setRowTag, rowTagNow, type AssetRow, type EventQuestion } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';
import { getDeviceTag, renewDeviceTag, generateDeviceTag } from '../dataCrypto';

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
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-225 partsToWrite · MK-XS-F-240 saveRecordGuarded
 *               MK-XS-F-286 saveRecordMerging · MK-XS-F-226 saveRecordToCloud
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
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-240 saveRecordGuarded · MK-XS-F-286 saveRecordMerging
 *               MK-XS-F-226 saveRecordToCloud
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
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-239 loadCloudRecord · MK-XS-F-285 mergeQuestions
 *               MK-XS-F-274 syncAssetRecordQuestions
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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-230 recordOnSignIn · MK-XS-F-287 recordOnSignInMerging
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
/* ─ MK-XS-F-230 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 * Called by ... MK-XS-F-287 recordOnSignInMerging
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-287 recordOnSignInMerging
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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-240 saveRecordGuarded · MK-XS-F-286 saveRecordMerging
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
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-239 loadCloudRecord
 *               MK-XS-F-285 mergeQuestions · MK-XS-F-274 syncAssetRecordQuestions
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
 * Called by ... MK-XS-F-285 mergeQuestions
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-285 mergeQuestions · MK-XS-F-274 syncAssetRecordQuestions
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
/* ─ MK-XS-F-240 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 * Called by ... MK-XS-F-286 saveRecordMerging
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-286 saveRecordMerging
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

// ── THE MERGE (design v02 of the cloud copy of the master record, 2026-11-12: R2, R6, R6a, R7) ─────────────────────────
// Replaces DEC-10685's stop-gap refusal: read the newer cloud copy whole, keep every cloud row in order, add this phone's
// rows the cloud lacks after them, and save through the same marker transaction.
// PART B (2026-11-12): R1 new rows are named `<tag>.<count>` (MK-NW-F-233), and a phone that finds its tag on rows it did not
// write takes a new tag; R3 a broker, file or price-feed event both phones fetched goes back through MK-NW-F-238
// sortArriving and is saved once, and whatever named the dropped copy names the kept row; R4 a phone row that never
// reached the cloud whose NAME the cloud gives to a different row is renamed once, and everything naming it follows. Only
// where no tag is known to rename with is a clash still refused: nothing is merged or written, and a fault says so.

/** The same row on both sides: its name, when it was written, its kind and its account. */
/* ─ MK-XS-F-281 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * sameRow
 *
 * Answers ..... The same row on both sides: its name, when it was written, its kind and its account.
 *
 * Formula .....
 *     row id = row id and written at = written at and kind = kind and account id = account id
 *
 * Called by ... MK-XS-F-282 mergeRecord
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-282 mergeRecord · MK-XS-F-287 recordOnSignInMerging
 *               MK-XS-F-286 saveRecordMerging
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-281
 * Changed ..... not in git yet (—)
 */
const sameRow = (a: AssetRow, b: AssetRow) => a.rowId === b.rowId && a.writtenAt === b.writtenAt && a.kind === b.kind && a.accountId === b.accountId;

/** R2: every cloud row, in order, then this phone's rows the cloud lacks, in the phone's order. `clashes`: phone rows whose
 *  name the cloud gives to a different row (R4, part B) — where there is any, `record` is the phone's, unmerged. */
/* ─ MK-XS-F-282 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * mergeRecord
 *
 * Answers ..... R2: every cloud row, in order, then this phone's rows the cloud lacks, in the phone's order.
 *
 * Formula .....
 *     by name = a lookup of for each of cloud: [row id, each] as const
 *     phone by name = a lookup of for each of phone: [row id, each] as const
 *     lacking = []
 *     clashes = []
 *     c = by name.get(row id)
 *     tag = opts.tag (or nothing when missing)
 *     tag taken = !!tag and cloud.some((c) => tag of row name(row id) = tag and !(phone by name.get(row id) and same row(phone by name.get(row id) as asset row, c)))
 *     rename tag = tag   if tag and !tag taken
 *     opts.spare tag.() (or nothing when missing)   otherwise   if count of clashes
 *     nothing   otherwise
 *     none = renamed = {}
 *     dropped = {}
 *     asks = []
 *     tag taken = tag taken
 *     record = [...phone]
 *     added = []
 *     clashes = clashes
 *     ...none = ...none   when clashes.length and !rename tag
 *     map = new map<string, string>()
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-286 saveRecordMerging · MK-XS-F-287 recordOnSignInMerging
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-287 recordOnSignInMerging · MK-XS-F-286 saveRecordMerging
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-282
 * Changed ..... not in git yet (—)
 */
export function mergeRecord(cloud: readonly AssetRow[], phone: readonly AssetRow[], opts: MergeOptions = {}): MergeOutcome {
  const byName = new Map(cloud.map((r) => [r.rowId, r] as const));
  const phoneByName = new Map(phone.map((r) => [r.rowId, r] as const));
  const lacking: AssetRow[] = [];
  const clashes: string[] = [];
  for (const r of phone) {
    const c = byName.get(r.rowId);
    if (!c) lacking.push(r);
    else if (!sameRow(c, r)) { clashes.push(r.rowId); lacking.push(r); }
  }
  // R1: this phone's tag on a cloud row this phone did not write — the phone takes a new tag (the caller keeps it)
  const tag = opts.tag ?? null;
  const tagTaken = !!tag && cloud.some((c) => tagOfRowName(c.rowId) === tag && !(phoneByName.get(c.rowId) && sameRow(phoneByName.get(c.rowId) as AssetRow, c)));
  const renameTag = clashes.length ? (tag && !tagTaken ? tag : opts.spareTag?.() ?? null) : null;
  const none = { renamed: {}, dropped: {}, asks: [], tagTaken };
  if (clashes.length && !renameTag) return { record: [...phone], added: [], clashes, ...none };
  const map = new Map<string, string>();
  const renamed: Record<string, string> = {}, dropped: Record<string, string> = {};
  const asks: EventQuestion[] = [];
  const merged: AssetRow[] = [...cloud];
  const added: AssetRow[] = [];
  const used = new Set(cloud.map((r) => r.rowId));
  let count = renameTag ? Math.max(highestCountOf(cloud, renameTag), highestCountOf(phone, renameTag)) : 0;
  for (const r of lacking) {
    let x = repointRow(r, map);
    // R3: a broker, file or price-feed event the cloud already holds under the broker's own key is saved once
    if (x.source !== 'typed' && x.ref && !x.replacesRowId && x.kind !== 'VALUE' && x.kind !== 'FACT' && x.kind !== 'ADJUSTMENT') {
      const { rowId: _n, writtenAt: _w, ...arriving } = x;
      const sorted = sortArriving(merged, [arriving]);
      if (!sorted.save.length) {
        const kept = merged.find((c) => c.accountId === x.accountId && c.ref === x.ref);
        if (kept) {
          map.set(r.rowId, kept.rowId); dropped[r.rowId] = kept.rowId;
          asks.push(...sorted.ask);
          continue;
        }
      }
    }
    // R4: a name the cloud gives to a different row is renamed once, to this phone's tag
    if (used.has(x.rowId) && renameTag) {
      const to = `${renameTag}.${++count}`;
      map.set(r.rowId, to); renamed[r.rowId] = to;
      x = { ...x, rowId: to };
    }
    used.add(x.rowId);
    merged.push(x); added.push(x);
  }
  return { record: merged, added, clashes: [], renamed, dropped, asks, tagTaken };
}

/** How a merge names new rows (R1, R4): this phone's tag, and a spare to rename with where the tag is found on a row this
 *  phone did not write. With neither, a clash of names is refused. */
export interface MergeOptions { tag?: string | null; spareTag?: () => string }
/** What a merge gives: the record, the phone's rows added after the cloud's, `clashes` (only where no tag could rename
 *  them: then `record` is the phone's, unmerged), the names renamed (R4) and dropped (R3) — old name → the name now used —
 *  the questions a dropped copy raises, and whether this phone's tag was found on a row it did not write (R1). */
export interface MergeOutcome {
  record: AssetRow[]; added: AssetRow[]; clashes: string[];
  renamed: Record<string, string>; dropped: Record<string, string>; asks: EventQuestion[]; tagTaken: boolean;
}

// ── R3 + R4: everything naming a row follows it to its new name ─────────────────────────────────────────────────────
const NAME_FIELDS = new Set(['rowId', 'firstRowId', 'replacesRowId', 'batch', 'standsFor', 'movedInBy', 'saleRowId']);
const NAME_LIST_FIELDS = new Set(['forSales', 'matches']);
const NAMED_IN_FIELDS = new Set(['answerTo', 'undoes', 'key', 'signature', 'name', 'difference', 'eventPair', 'keepsOverList', 'answerOf', 'answerDifference']);
/** A name inside a key or a question's name (`<row>|<more>`, `list|12,14|…`) follows its row. */
/* ─ MK-XS-F-303 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * renameInside
 *
 * Answers ..... A name inside a key or a question's name (`<row>|<more>`, `list|12,14|…`) follows its row.
 *
 * Formula .....
 *     for each of split( ÷ ([|,@]) ÷ ): map.get(each) (or each when missing).join('')
 *
 * Called by ... MK-XS-F-304 repointValue
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-282 mergeRecord · MK-XS-F-310 questionsAfterMerge
 *               MK-XS-F-287 recordOnSignInMerging · MK-XS-F-306 repointQuestions
 *               MK-XS-F-305 repointRow · MK-XS-F-304 repointValue
 *               MK-XS-F-311 rowsAfterMerge · MK-XS-F-286 saveRecordMerging
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-303
 * Changed ..... not in git yet (—)
 */
const renameInside = (s: string, map: ReadonlyMap<string, string>) => s.split(/([|,@])/).map((t) => map.get(t) ?? t).join('');
/** R3 + R4: any stored value with every row name it holds changed to the name now used — a name field exactly, a key or a question's name piece by piece. */
/* ─ MK-XS-F-304 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * repointValue
 *
 * Answers ..... R3 + R4: any stored value with every row name it holds changed to the name now used — a name field exactly, a key or a question's name piece by piece.
 *
 * Formula .....
 *     map.get(v) (or v when missing)   when field and NAME_FIELDS.has(field)
 *     rename inside(v, map)   when field and NAMED_IN_FIELDS.has(field)
 *     for each of v: repoint value(each, map, field and NAME_LIST_FIELDS.has(field) ? 'rowId' : nothing)   when array.is array(v)
 *     out = {}
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-305 repointRow · MK-XS-F-306 repointQuestions
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-282 mergeRecord · MK-XS-F-310 questionsAfterMerge
 *               MK-XS-F-287 recordOnSignInMerging · MK-XS-F-306 repointQuestions
 *               MK-XS-F-305 repointRow · MK-XS-F-311 rowsAfterMerge
 *               MK-XS-F-286 saveRecordMerging
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-304
 * Changed ..... not in git yet (—)
 */
function repointValue(v: any, map: ReadonlyMap<string, string>, field: string | null): any {
  if (typeof v === 'string') {
    if (field && NAME_FIELDS.has(field)) return map.get(v) ?? v;
    if (field && NAMED_IN_FIELDS.has(field)) return renameInside(v, map);
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => repointValue(x, map, field && NAME_LIST_FIELDS.has(field) ? 'rowId' : null));
  if (v && typeof v === 'object') {
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = repointValue(x, map, k);
    return out;
  }
  return v;
}
/** R3 + R4: a row with every name it holds of a renamed or dropped row changed to the name now used — the row it corrects,
 *  the purchases a sale names, its set of values, the question its answer names. */
/* ─ MK-XS-F-305 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * repointRow
 *
 * Answers ..... R3 + R4: a row with every name it holds of a renamed or dropped row changed to the name now used — the row it corrects, the purchases a sale names, its set of values, the question its answer names.
 *
 * Formula .....
 *     r   when map.size is missing
 *     { row id, ...repoint value(rest, map, nothing) } as asset row
 *
 * Called by ... MK-XS-F-282 mergeRecord · MK-XS-F-311 rowsAfterMerge
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-282 mergeRecord · MK-XS-F-287 recordOnSignInMerging
 *               MK-XS-F-311 rowsAfterMerge · MK-XS-F-286 saveRecordMerging
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-305
 * Changed ..... not in git yet (—)
 */
export function repointRow(r: AssetRow, map: ReadonlyMap<string, string>): AssetRow {
  if (!map.size) return r;
  const { rowId, ...rest } = r;
  return { rowId, ...repointValue(rest, map, null) } as AssetRow;
}
/** R3 + R4: the stored questions, with every name of a renamed or dropped row changed to the name now used — the keys of
 *  the questions follow, so an answer still finds its question. */
/* ─ MK-XS-F-306 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * repointQuestions
 *
 * Answers ..... R3 + R4: the stored questions, with every name of a renamed or dropped row changed to the name now used — the keys of the questions follow, so an answer still finds its question.
 *
 * Formula .....
 *     map = a lookup of object.entries(names)
 *     the answer:
 *     repoint value(questions, map, nothing)   if map.size
 *     questions   otherwise
 *
 * Called by ... MK-XS-F-310 questionsAfterMerge
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-310 questionsAfterMerge
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-306
 * Changed ..... not in git yet (—)
 */
export function repointQuestions<T>(questions: T, names: Readonly<Record<string, string>>): T {
  const map = new Map(Object.entries(names));
  return map.size ? repointValue(questions, map, null) : questions;
}

/** The fault said where a merge meets a clash of names (left for part B: R4 renames them once). */
/* ─ MK-XS-F-283 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * clashFault
 *
 * Answers ..... The fault said where a merge meets a clash of names (left for part B: R4 renames them once).
 *
 * Formula .....
 *     `the record on this phone and the one in the cloud (${cloud rows} rows) both use the row names ${clashes.slice(0, 5).join(', ')}${clashes.length > 5 ? ` and ${clashes.length − 5} more` : ''} for different rows; nothing is merged or saved until they are renamed, so the two are never mixed`
 *
 * Called by ... MK-XS-F-286 saveRecordMerging
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-286 saveRecordMerging
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-283
 * Changed ..... not in git yet (—)
 */
export function clashFault(clashes: readonly string[], cloudRows: number): string {
  return `the record on this phone and the one in the cloud (${cloudRows} rows) both use the row names ${clashes.slice(0, 5).join(', ')}${clashes.length > 5 ? ` and ${clashes.length - 5} more` : ''} for different rows; nothing is merged or saved until they are renamed, so the two are never mixed`;
}

/** R6: the accounts whose sales must be checked again after a merge — every account a row the phone added names. */
/* ─ MK-XS-F-284 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accountsTouched
 *
 * Answers ..... R6: the accounts whose sales must be checked again after a merge — every account a row the phone added names.
 *
 * Formula .....
 *     [...new set(added.flat map((r) => [account id, ...(to account id ? [to account id] : [])]))]
 *
 * Called by ... MK-XS-F-288 salesAskedAgain
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-288 salesAskedAgain
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-284
 * Changed ..... not in git yet (—)
 */
export function accountsTouched(added: readonly AssetRow[]): string[] {
  return [...new Set(added.flatMap((r) => [r.accountId, ...(r.toAccountId ? [r.toAccountId] : [])]))];
}

/** One account's open questions, as the store keeps them (services' useStore assetRecordQuestions). */
export type QuestionsDoc = Record<string, { at: string; [k: string]: any }>;

/** R6a: open questions are saved to the cloud, merged by question key. A key this phone saw in the cloud and no longer holds
 *  was answered here: it goes from both; a key it saw in the cloud that the cloud no longer holds was answered elsewhere: it
 *  goes from this phone. A key on both sides keeps the later-asked version; one on one side only is kept. */
/* ─ MK-XS-F-285 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * mergeQuestions
 *
 * Answers ..... R6a: open questions are saved to the cloud, merged by question key.
 *
 * Formula .....
 *     c = cloud (or {}, p = phone (or none when missing) when missing)
 *     seen = a list with no repeats of seen in cloud
 *     out = {}
 *     answered here = []
 *     answered elsewhere = []
 *     the answer:
 *     questions = out
 *     answered here = answered here
 *     answered elsewhere = answered elsewhere
 *
 * Called by ... MK-XS-F-274 syncAssetRecordQuestions
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-274 syncAssetRecordQuestions
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in m e r g e t r i e s of 3.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-285
 * Changed ..... not in git yet (—)
 */
export function mergeQuestions(cloud: QuestionsDoc | null | undefined, phone: QuestionsDoc | null | undefined, seenInCloud: readonly string[]):
  { questions: QuestionsDoc; answeredHere: string[]; answeredElsewhere: string[] } {
  const c = cloud ?? {}, p = phone ?? {};
  const seen = new Set(seenInCloud);
  const out: QuestionsDoc = {};
  const answeredHere: string[] = [];
  for (const k of Object.keys(c)) {
    if (!(k in p)) { if (seen.has(k)) { answeredHere.push(k); continue; } out[k] = c[k]; continue; }
    out[k] = Date.parse(p[k]?.at ?? '') >= Date.parse(c[k]?.at ?? '') || !c[k]?.at ? p[k] : c[k];
  }
  // a key this phone saw in the cloud and the cloud no longer holds was answered on another phone: it goes from this one too
  const answeredElsewhere: string[] = [];
  for (const k of Object.keys(p)) {
    if (k in c) continue;
    if (seen.has(k)) { answeredElsewhere.push(k); continue; }
    out[k] = p[k];
  }
  return { questions: out, answeredHere, answeredElsewhere };
}

/** R7: a merge beaten by a third phone tries again, at most this many times, then records a fault. */
export const MERGE_TRIES = 3;

/** R2 + R7: save the record; where another phone saved since, read the cloud's copy whole, merge this phone's rows after it,
 *  and try again — at most 3 times — then a fault, the rows staying on the phone for the next change. `reload` reads the
 *  cloud's record and marker (loadCloudRecord). The merged record comes back in `record`, for the phone to keep. */
/* ─ MK-XS-F-286 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * saveRecordMerging
 *
 * Answers ..... R2 + R7: save the record; where another phone saved since, read the cloud's copy whole, merge this phone's rows after it, and try again — at most 3 times — then a fault, the rows staying on the phone for the next change.
 *
 * Formula .....
 *     rec = [...record]
 *     s = seen
 *     merged = false
 *     renamed = {}
 *     asks = []
 *     tag taken = false
 *     o = { ...opts }
 *     more = () => ({ renamed, asks, tag taken })
 *     out = await save record guarded(rec, s, writer, commit, at, size)
 *     status = out.status
 *     seen = out.seen
 *     record = rec
 *     fault = out.fault
 *     merged = merged
 *     ...more() = ...more()   when out.status ! = 'moved − on'
 *     cloud = await reload()
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-286
 * Changed ..... not in git yet (—)
 */
export async function saveRecordMerging(record: readonly AssetRow[], seen: CloudSeen, writer: string, commit: CommitRecord, at: string,
  reload: () => Promise<{ record: AssetRow[]; marker: CloudMarker | null }>, size = ROWS_PER_PART, opts: MergeOptions = {}):
  Promise<{ status: 'saved' | 'nothing' | 'no-key' | 'moved-on' | 'clash'; seen: CloudSeen; record: AssetRow[]; fault: string | null; merged: boolean }
    & Pick<MergeOutcome, 'renamed' | 'asks' | 'tagTaken'>> {
  let rec: AssetRow[] = [...record];
  let s = seen;
  let merged = false;
  // R3 + R4: every name changed across the tries, old name → the name now used (renamed or dropped as a copy)
  let renamed: Record<string, string> = {};
  const asks: EventQuestion[] = [];
  let tagTaken = false;
  const o = { ...opts };
  const more = () => ({ renamed, asks, tagTaken });
  for (let i = 0; i < MERGE_TRIES; i++) {
    const out = await saveRecordGuarded(rec, s, writer, commit, at, size);
    if (out.status !== 'moved-on') return { status: out.status, seen: out.seen, record: rec, fault: out.fault, merged, ...more() };
    const cloud = await reload();
    const m = mergeRecord(cloud.record, rec, o);
    if (m.tagTaken && !tagTaken) { tagTaken = true; o.tag = o.spareTag?.() ?? null; }
    if (m.clashes.length) return { status: 'clash', seen: s, record: rec, fault: clashFault(m.clashes, cloud.record.length), merged, ...more() };
    renamed = composeNames(renamed, { ...m.renamed, ...m.dropped });
    asks.push(...m.asks);
    rec = m.record;
    merged = true;
    s = { marker: cloud.marker, rowsInCloud: cloud.record.length };
    if (rec.length <= s.rowsInCloud) return { status: 'nothing', seen: s, record: rec, fault: null, merged, ...more() };
  }
  return { status: 'moved-on', seen: s, record: rec, merged, ...more(),
    fault: `other phones saved the record to the cloud ${MERGE_TRIES} times while this phone was merging; this phone\u2019s rows stay on the phone and are saved at the next change` };
}

/** R2 at sign-in: where the phone's record (this same owner's) and the cloud's part ways, the phone's rows the cloud lacks
 *  are added after the cloud's, and may be uploaded. A clash of names (part B) keeps today's refusal. */
/* ─ MK-XS-F-287 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * recordOnSignInMerging
 *
 * Answers ..... R2 at sign-in: where the phone's record (this same owner's) and the cloud's part ways, the phone's rows the cloud lacks are added after the cloud's, and may be uploaded.
 *
 * Formula .....
 *     start = record on sign in(phone, cloud, owner)
 *     mine = phone.record   if phone.owner = owner
 *     []   otherwise
 *     foreign = !!opts.tag and cloud.slice(mine.length).some((c) => tag of row name(row id) = opts.tag)
 *     ...start = ...start
 *     added = start.record.slice(cloud.length)
 *     renamed = {}
 *     asks = []
 *     tag taken = foreign   when start.fault is missing
 *     m = merge record(cloud, phone.record, opts)
 *     ...start = ...start
 *     added = []
 *     renamed = {}
 *     asks = []
 *     tag taken = tag taken   when count of clashes
 *     the answer:
 *     record = record
 *     rows in cloud = count of cloud
 *     may upload = true
 *     fault = nothing
 *     added = added
 *     renamed = { ...renamed, ...dropped }
 *     asks = asks
 *     tag taken = tag taken
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-287
 * Changed ..... not in git yet (—)
 */
export function recordOnSignInMerging(phone: { record: readonly AssetRow[]; owner: string | null | undefined }, cloud: readonly AssetRow[], owner: string, opts: MergeOptions = {}):
  { record: AssetRow[]; rowsInCloud: number; mayUpload: boolean; fault: string | null; added: AssetRow[] } & Pick<MergeOutcome, 'renamed' | 'asks' | 'tagTaken'> {
  const start = recordOnSignIn(phone, cloud, owner);
  // R1: this phone's tag on a cloud row this phone does not hold — it takes a new tag
  const mine = phone.owner === owner ? phone.record : [];
  const foreign = !!opts.tag && cloud.slice(mine.length).some((c) => tagOfRowName(c.rowId) === opts.tag);
  if (!start.fault) return { ...start, added: start.record.slice(cloud.length), renamed: {}, asks: [], tagTaken: foreign };
  const m = mergeRecord(cloud, phone.record, opts);
  if (m.clashes.length) return { ...start, added: [], renamed: {}, asks: [], tagTaken: m.tagTaken };
  return { record: m.record, rowsInCloud: cloud.length, mayUpload: true, fault: null, added: m.added, renamed: { ...m.renamed, ...m.dropped }, asks: m.asks, tagTaken: m.tagTaken };
}

/** Two rounds of renaming read as one: a name renamed, then renamed again, goes straight to the last. */
/* ─ MK-XS-F-307 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * composeNames
 *
 * Answers ..... Two rounds of renaming read as one: a name renamed, then renamed again, goes straight to the last.
 *
 * Formula .....
 *     out = {}
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-286 saveRecordMerging
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-286 saveRecordMerging
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-307
 * Changed ..... not in git yet (—)
 */
function composeNames(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) out[k] = b[v] ?? v;
  for (const [k, v] of Object.entries(b)) if (!(k in out)) out[k] = v;
  return out;
}

/** R6: after a merge, every sale on an account a merged row names is checked again with the check a sync runs
 *  (MK-NW-F-256 salesNeedingAnAnswer): a sale naming a purchase the other phone removed is put to the account holder.
 *  Returns the questions to keep, or null where nothing changed. */
/* ─ MK-XS-F-288 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * salesAskedAgain
 *
 * Answers ..... R6: after a merge, every sale on an account a merged row names is checked again with the check a sync runs (MK-NW-F-256 salesNeedingAnAnswer): a sale naming a purchase the other phone removed is put to the account holder.
 *
 * Formula .....
 *     out = { ...(questions ?? {}) }
 *     changed = false
 *     sales = sales needing an answer(record, id)
 *     was = out[id]
 *     the answer:
 *     out   if changed
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-288
 * Changed ..... not in git yet (—)
 */
export function salesAskedAgain(record: readonly AssetRow[], rows: readonly AssetRow[], questions: Record<string, any>, at: string): Record<string, any> | null {
  const out = { ...(questions ?? {}) };
  let changed = false;
  for (const id of accountsTouched(rows)) {
    try {
      const sales = salesNeedingAnAnswer(record, id);
      const was = out[id];
      if (sales.length || was?.sales?.length) { out[id] = { ...(was ?? { events: [], lists: [] }), sales, at: was?.at ?? at }; changed = true; }
    } catch { /* the next change asks again */ }
  }
  return changed ? out : null;
}

// ── R1 + R3 + R4 on the phone: the tag new rows are named with, and the names a merge changed ──────────────────────
/** R1: this phone's row tag, read from the keychain ("this device only") and put to use for every new row. */
/* ─ MK-XS-F-308 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * startRowTag
 *
 * Answers ..... ── R1 + R3 + R4 on the phone: the tag new rows are named with, and the names a merge changed ────────────────────── R1: this phone's row tag, read from the keychain ("this device only") and put to use for every new row.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... MK-XS-F-309 mergeNaming
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-309 mergeNaming
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-308
 * Changed ..... not in git yet (—)
 */
export async function startRowTag(): Promise<string | null> {
  try { const tag = await getDeviceTag(); setRowTag(tag); return rowTagNow(); } catch { return rowTagNow(); }
}

/** R1: how a merge names rows — this phone's tag, and a spare to rename with where the tag turns up on a row this phone
 *  did not write. */
/* ─ MK-XS-F-309 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * mergeNaming
 *
 * Answers ..... R1: how a merge names rows — this phone's tag, and a spare to rename with where the tag turns up on a row this phone did not write.
 *
 * Formula .....
 *     tag = row tag now() (or await start row tag() when missing)
 *     the answer:
 *     tag = tag
 *     spare tag = generate device tag
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-309
 * Changed ..... not in git yet (—)
 */
export async function mergeNaming(): Promise<MergeOptions> {
  const tag = rowTagNow() ?? (await startRowTag());
  return { tag, spareTag: generateDeviceTag };
}

/** After a merge, on the phone: R1 a tag found on another phone's rows is replaced by a new one; R3 + R4 the stored
 *  questions name renamed and dropped rows as the record now does, and a copy dropped with other figures from the broker
 *  is asked about. Returns the questions to keep, or null where nothing changed. */
/* ─ MK-XS-F-310 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * questionsAfterMerge
 *
 * Answers ..... After a merge, on the phone: R1 a tag found on another phone's rows is replaced by a new one; R3 + R4 the stored questions name renamed and dropped rows as the record now does, and a copy dropped with other figures from the broker is asked about.
 *
 * Formula .....
 *     names = out.renamed (or none when missing)
 *     asks = out.asks (or none when missing)
 *     nothing   when count of !object.keys(names).length and !asks
 *     next = repoint questions(questions ?? {}, names)
 *     id = on record.account id
 *     was = next[id] (or events = []
 *     lists = []
 *     at = at when missing)
 *     the answer = next
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-310
 * Changed ..... not in git yet (—)
 */
export function questionsAfterMerge(out: { renamed?: Record<string, string>; asks?: EventQuestion[]; tagTaken?: boolean },
  questions: Record<string, any>, at: string): Record<string, any> | null {
  if (out.tagTaken) renewDeviceTag().then(setRowTag).catch(() => { /* the next merge tries again */ });
  const names = out.renamed ?? {};
  const asks = out.asks ?? [];
  if (!Object.keys(names).length && !asks.length) return null;
  let next: Record<string, any> = repointQuestions(questions ?? {}, names);
  for (const q of asks) {
    const id = q.onRecord.accountId;
    const was = next[id] ?? { events: [], lists: [], at };
    if (!(was.events ?? []).some((e: EventQuestion) => e.key === q.key)) next = { ...next, [id]: { ...was, events: [...(was.events ?? []), q] } };
  }
  return next;
}

/** R3 + R4: rows added on the phone while a merge ran, naming renamed or dropped rows as the cloud now does. */
/* ─ MK-XS-F-311 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rowsAfterMerge
 *
 * Answers ..... R3 + R4: rows added on the phone while a merge ran, naming renamed or dropped rows as the cloud now does.
 *
 * Formula .....
 *     names = a lookup of object.entries(renamed ?? {})
 *     the answer = for each of rows: repoint row(each, names)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-311
 * Changed ..... not in git yet (—)
 */
export function rowsAfterMerge(rows: readonly AssetRow[], renamed: Readonly<Record<string, string>> | undefined): AssetRow[] {
  const names = new Map(Object.entries(renamed ?? {}));
  return rows.map((r) => repointRow(r, names));
}
