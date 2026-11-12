// The master record of what an account holder owns, saved to the account holder's cloud account (his "yes", 2026-11-11:
// "should the list also be saved to your cloud account? - yes").
//
// The record only ever grows: rows are added, never changed. So it is saved in parts of a fixed size, and a save writes
// only the parts that changed — the last part the phone had, and any new ones. Each part is encrypted by the writer the
// rest of the cloud copy uses, and lives under users/{uid}/assetRecord/{part}, which the access rules keep to the account
// holder and a household member.
import type { AssetRow } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';

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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-225 partsToWrite · MK-XS-F-226 saveRecordToCloud
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
 * Called by ... MK-XS-F-226 saveRecordToCloud
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
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
/* ─ MK-XS-F-226 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
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
/* ─ MK-XS-F-227 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
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
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in part of 0.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-227
 * Changed ..... 2026-11-11 (d188fd68)
 */
export async function loadRecordFromCloud(read: (part: number) => Promise<AssetRow[] | null>): Promise<AssetRow[]> {
  const out: AssetRow[] = [];
  for (let part = 0; ; part++) {
    const rows = await read(part);
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
