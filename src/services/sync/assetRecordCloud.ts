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
export function partsOf(record: readonly AssetRow[], size = ROWS_PER_PART): AssetRow[][] {
  const out: AssetRow[][] = [];
  for (let i = 0; i < record.length; i += size) out.push(record.slice(i, i + size));
  return out;
}

/** The parts a save must write, given how many rows the cloud already holds: the part the last saved row is in (it may
 *  have grown) and every part after it. Nothing, where the cloud already holds every row. */
export function partsToWrite(record: readonly AssetRow[], rowsInCloud: number, size = ROWS_PER_PART): { part: number; rows: AssetRow[] }[] {
  if (record.length <= rowsInCloud) return [];
  const firstPart = Math.floor(rowsInCloud / size);
  return partsOf(record, size).map((rows, part) => ({ part, rows })).filter((p) => p.part >= firstPart);
}

/** Save the parts that changed. `write` saves one part; it is the cloud's, or a test's. Returns the rows now in the cloud. */
export async function saveRecordToCloud(record: readonly AssetRow[], rowsInCloud: number,
  write: (part: number, rows: AssetRow[]) => Promise<void>, size = ROWS_PER_PART): Promise<number> {
  for (const { part, rows } of partsToWrite(record, rowsInCloud, size)) await write(part, rows);
  return Math.max(record.length, rowsInCloud);
}

/** Read every part in order until one is missing. `read` reads one part (null where there is none). */
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
export function recordToKeep(phone: readonly AssetRow[], cloud: readonly AssetRow[]): { record: AssetRow[]; differ: boolean } {
  const n = Math.min(phone.length, cloud.length);
  const sameStart = (a: AssetRow, b: AssetRow) => a.rowId === b.rowId && a.writtenAt === b.writtenAt && a.kind === b.kind && a.accountId === b.accountId;
  for (let i = 0; i < n; i++) if (!sameStart(phone[i], cloud[i])) return { record: [...phone], differ: true };
  return { record: [...(cloud.length > phone.length ? cloud : phone)], differ: false };
}
