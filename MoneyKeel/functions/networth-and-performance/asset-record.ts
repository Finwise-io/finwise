// Net worth and Performance · THE ONE MASTER RECORD of what a person owns.
//
// HIS RULING, 2026-11-10 (in chat, during the Build 57 Performance audit):
//   "All data should be written into record 3. And record 1, simply pull data from row with most latest date and
//    time-stamp to display on the screen."
//   "combine record 2 and 3. No need for two separate master data record for asset details. The database should hold
//    multiple purchase dates, purchase price, sale price, sale dates as separate and not just average them."
//   "When file is imported or information imported via API, capture the important dates ... Do not override dates
//    imported or entered by user."
//   "this database design approved. Go ahead and update the structure."
//
// WHAT THIS REPLACES. The app kept three copies: the account as it stands (rebuilt from nothing on every sync), the
// activity list, and the daily values (copied from the account once a day, under the phone's date). A file dated
// Jun 21 was written down as Nov 4; a purchase date a person typed was blanked by the next sync; a missing date was
// filled with the day of the sync.
//
// THE RULES OF THIS RECORD, each held by a test beside this file:
//   1. ONE ROW PER EVENT: a day's value, a purchase, a sale, a dividend, an interest payment, a deposit, a
//      withdrawal, a transfer, a fee, a split, or a fact. Shares moved between two accounts are ONE row; the
//      purchases they came from are read across with their own dates and prices.
//   2. NOTHING IS OVERWRITTEN. A correction is a new row that names the row it replaces. Whatever named the old row
//      (a sale naming the purchase it sold) follows the correction.
//   3. A ROW'S DATE IS THE DAY THE EVENT HAPPENED OR THE VALUE IS FROM. Where nobody gave one it stays blank. It is
//      never the phone's date. A date that cannot be read is kept as it was given and never silently blanked.
//   4. WHAT THE SCREENS SHOW TODAY is the value with the latest date and, within that date, the latest time-stamp.
//      Values nobody dated are listed so the person can be asked their date; until then they do not stand in front
//      of dated ones.
//   5. EVERY PURCHASE AND EVERY SALE IS ITS OWN ROW. Nothing is averaged. A sale is saved on its own date. It sells
//      the purchases the broker or the person names; a sale that names none sells the oldest first where every
//      purchase it could have sold has a date — and where one has no date, the person is asked which was sold
//      (his ruling of 2026-11-10: a sale goes on its sale date; a purchase date is used where there is one; where
//      there is none the person is asked which tax lot was sold).
//   9. THE BROKER'S TAX LOTS SAY WHAT IS HELD AND WHAT WAS PAID. Tax lots take the place of a broker's own average —
//      never added on top (three lots of 50 replace one purchase of 100). A purchase in the broker's history dated
//      on or before the day of its list adds no shares: the list already counts it.
//  10. THE APP ADDS OR REMOVES SHARES ONLY ON A TRANSACTION DETAIL IT HAS — a purchase, a sale, a transfer, a split, a
//      tax lot — or on what the account holder gives (his ruling, 2026-11-11). Where a broker's numbers change with
//      no transaction behind them, nothing changes and the account holder is asked.
//  11. THE ACCOUNT HOLDER CAN ALWAYS OVERRIDE AND CORRECT, and in every difference between a broker or a file and the
//      account holder, the account holder is asked which is correct before anything changes (his ruling, 2026-11-11).
//   6. WHAT A PERSON TYPED IS NEVER REPLACED by a sync or a file.
//   7. ON ANY ONE DAY, a value the broker, a file or the person gave stands in front of one filled in from the price
//      feed.
//   8. AN UNKNOWN IS NOT $0. A value, a price or a cash figure nobody gave stays blank, and a total with a blank part
//      is blank.

/** What a row records. */
export type RowKind =
  | 'VALUE'        // what a holding (or, with no holding, the account's cash) was worth on a day
  | 'PURCHASE' | 'SALE'
  | 'DIVIDEND' | 'INTEREST'
  | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'FEE'
  | 'SPLIT'        // the shares of a holding multiplied and its price divided, with no money moved
  | 'FACT'         // a bond's face value, rate or maturity; an account's own details
  | 'OTHER';       // a broker's word the app does not know: kept, shown, counted in nothing

/** Who gave the row. */
export type RowSource = 'linked' | 'file' | 'typed' | 'price-feed';

export interface AssetRow {
  /** Its own number. It never changes and is never reused. */
  rowId: string;
  accountId: string;
  /** Which stock, fund, bond or option, in capitals. Null on a row about the account itself (its cash, its details). */
  holding: string | null;
  kind: RowKind;
  /** 'YYYY-MM-DD' — the day the event happened or the value is from. Null where nobody gave it. */
  date: string | null;
  /** A date exactly as it was given, kept where it could not be read as a day — so nothing given is lost. */
  dateAsGiven?: string;
  /** Kept beside the date where the broker sends it. */
  settlementDate?: string | null;
  /** A settlement date exactly as it was given, kept where it could not be read as a day. */
  settlementDateAsGiven?: string;
  shares?: number | null;
  /** Per share, on that date. */
  price?: number | null;
  /** The dollars moved, or the value held. On an account's own VALUE row: its uninvested cash. */
  amount?: number | null;
  fee?: number | null;
  /** On a SALE or a TRANSFER, ONLY where the broker or the person says which purchases the shares came from: those
   *  purchases, and how many shares of each. A sale that names none sells the oldest first, read afresh each time. */
  sells?: { rowId: string; shares: number }[];
  /** On a TRANSFER of shares: the account the shares reach. With none, the shares leave the record. */
  toAccountId?: string;
  /** On a TRANSFER of shares: true where the shares reach this account from outside the record. */
  arrives?: boolean;
  source: RowSource;
  /** When the row was saved. */
  writtenAt: string;
  /** On a correction: the row it stands in for. */
  replacesRowId?: string | null;
  /** On a correction that takes a row away: the row it replaces counts no more, and neither does this one. */
  removed?: boolean;
  /** On a PURCHASE a broker gave only as an average price: it is one row, marked, with no date. */
  averageOnly?: boolean;
  /** On a PURCHASE taken from a broker's or a file's list of what is held: the day that list is from. The shares
   *  were still held that day, so no sale on or before it sold them. */
  stillHeldOn?: string | null;
  /** On a PURCHASE from a broker's history dated on or before the day of the broker's list: that day. The list
   *  already counts these shares, so this row adds none; it is kept to show, and to say what earlier sales made. */
  inListOf?: string | null;
  /** True on a row saved as the account holder's answer to a question about a list — so a purchase replaced by an
   *  answer is never read as one the account holder took away. */
  byAnswer?: boolean;
  /** On a TRANSFER saved by such an answer: shares that had moved into the account give way to the tax lots the list
   *  now states for them. It is not shown as activity. */
  restated?: boolean;
  /** On a SPLIT: how many shares each share became (2 for a two-for-one). */
  ratio?: number;
  /** On a VALUE row: the number of the account's own row saved with it — the rows of one save read together. */
  batch?: string;
  /** On an account's own VALUE row: the broker's own stated total, the one outside check there is. */
  statedTotal?: number | null;
  /** On an account's own VALUE row: the value a person typed for an account with nothing listed inside it. */
  typedValue?: number | null;
  /** On a FACT row: the facts, by name. */
  facts?: Record<string, unknown>;
  /** The broker's own word for the event, kept as sent. */
  word?: string;
  /** The broker's own key for the event (or, for a file's row, one made from the row), so the same event sent twice is saved once. */
  ref?: string;
}

/** A row before it is saved: everything but its number and the time it was saved. */
export type NewRow = Omit<AssetRow, 'rowId' | 'writtenAt'>;

/** The record after a change, and — where the change was refused — why. A refused change leaves the record as it was. */
export interface Changed { record: AssetRow[]; problem: string | null }

const GIVEN: ReadonlySet<RowSource> = new Set<RowSource>(['linked', 'file', 'typed']);
const DAY_OR_STAMP = /^\d{4}-\d{2}-\d{2}(T[\d:.+\-Zz]*)?$/;
const EPS = 1e-9;

/** A date as a row keeps it: the day as given ('YYYY-MM-DD', or a time-stamp cut to its day), or null. A day that
 *  does not exist, or anything in another shape, is not a date. */
export function dayOrNull(v: unknown): string | null {
  if (typeof v !== 'string' || !DAY_OR_STAMP.test(v.trim())) return null;
  const day = v.trim().slice(0, 10);
  const [y, m, d] = day.split('-').map(Number);
  const real = new Date(Date.UTC(y, m - 1, d));
  return real.getUTCFullYear() === y && real.getUTCMonth() === m - 1 && real.getUTCDate() === d ? day : null;
}

const wasGiven = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
/** The moment a time-stamp names, so two stamps written in different time zones are read in their true order. */
const instantOf = (stamp: string): number => { const t = Date.parse(stamp); return Number.isFinite(t) ? t : 0; };
/** One spelling for a holding: no spaces at its ends, in capitals — so "msft" and "MSFT" are one holding. */
export const oneHoldingSpelling = (h: string | null | undefined): string | null => (h == null || h.trim() === '' ? null : h.trim().toUpperCase());

/** Save rows. The record that comes back holds every row it held before, unchanged, and the new rows after them,
 *  each numbered on from the last and stamped with the one time they were saved together. Each account's own value
 *  row starts a new set of values, and the holding rows after it belong to that set (a holding's value with no such
 *  row before it stops). The shares of a purchase, a sale or a transfer are saved without a minus sign. A date that cannot be read is
 *  left blank and kept as given. A row that names a row to replace is saved only where that row stands today and —
 *  if a person typed it — only where the new row is typed too; anything else is a mistake in the caller and stops. */
export function addRows(record: readonly AssetRow[], rows: readonly NewRow[], writtenAt: string): AssetRow[] {
  let n = record.reduce((top, r) => Math.max(top, Number(r.rowId) || 0), record.length);
  const out: AssetRow[] = [...record];
  const batchOf = new Map<string, string>();
  for (const r of rows) {
    if (r.replacesRowId) {
      const target = rowsInForce(out).find((x) => x.rowId === r.replacesRowId);
      if (!target) throw new Error(`Row ${r.replacesRowId} does not stand in the record, so nothing can replace it.`);
      if (target.source === 'typed' && r.source !== 'typed') throw new Error(`Row ${target.rowId} was typed by the person, so it is not replaced.`);
    }
    const rowId = String(++n);
    const date = dayOrNull(r.date);
    const settlementDate = r.settlementDate == null ? r.settlementDate : dayOrNull(r.settlementDate);
    const row: AssetRow = { ...r, holding: oneHoldingSpelling(r.holding), date, settlementDate, rowId, writtenAt };
    // a broker's minus sign on a purchase, a sale or a transfer says which way the shares went; the kind already says it
    if ((r.kind === 'PURCHASE' || r.kind === 'SALE' || r.kind === 'TRANSFER') && typeof r.shares === 'number' && r.shares < 0) row.shares = -r.shares;
    if (date == null && wasGiven(r.date)) row.dateAsGiven = String(r.date);
    if (settlementDate == null && wasGiven(r.settlementDate)) row.settlementDateAsGiven = String(r.settlementDate);
    if (r.kind === 'VALUE' && !r.replacesRowId) {
      if (row.holding == null) batchOf.set(r.accountId, rowId);
      else if (!batchOf.has(r.accountId)) throw new Error(`A holding's value for account ${r.accountId} was saved without the account's own value row before it.`);
      row.batch = batchOf.get(r.accountId);
    }
    out.push(row);
  }
  return out;
}

/** The rows that count: every row that no later row replaces, and that is not itself a removal. */
export function rowsInForce(record: readonly AssetRow[]): AssetRow[] {
  const replaced = new Set(record.map((r) => r.replacesRowId).filter(Boolean) as string[]);
  return record.filter((r) => !replaced.has(r.rowId) && !r.removed);
}

/** For every row, the row it began as: a correction, and a correction of a correction, lead back to the first. */
function firstRowOf(record: readonly AssetRow[]): (rowId: string) => AssetRow | undefined {
  const byId = new Map(record.map((r) => [r.rowId, r]));
  return (rowId) => {
    let r = byId.get(rowId);
    const seen = new Set<string>();
    while (r?.replacesRowId && byId.has(r.replacesRowId) && !seen.has(r.rowId)) { seen.add(r.rowId); r = byId.get(r.replacesRowId); }
    return r;
  };
}

/** The row that stands today for a row number, however many times it has been corrected. Null where it was taken
 *  away or never existed. */
export function rowAsItStands(record: readonly AssetRow[], rowId: string): AssetRow | null {
  const first = firstRowOf(record);
  const began = first(rowId)?.rowId;
  if (began == null) return null;
  return rowsInForce(record).find((r) => first(r.rowId)?.rowId === began) ?? null;
}

const EVENT_KINDS: ReadonlySet<RowKind> = new Set<RowKind>(['PURCHASE', 'SALE', 'DIVIDEND', 'INTEREST', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'SPLIT', 'OTHER']);
const sameNumber = (x: number | null | undefined, y: number | null | undefined) => (x == null || y == null ? x == null && y == null : Math.abs(x - y) <= EPS);

/** Rows not yet in the record — so nothing a broker or a file sends twice, or sends by two roads, is saved twice.
 *   · A row carrying a key the record already holds for that account is left out. A dated row with no key is given
 *     one made from the row (its kind, date, holding, shares, price and amount) and its place among rows alike in
 *     the same delivery — so the same delivery arriving twice adds nothing, and two sales alike in one delivery are
 *     still two sales. A row with no date and no key is always kept.
 *   · An event that DIFFERS from one the record holds from another source — the same shares at another price, or on a
 *     date up to five days away — or that the account holder took away, is left out too: it is a question for the
 *     account holder (eventsThatDiffer), never saved beside the other. Once answered (answerEventQuestion) it is not
 *     asked again.
 *   · An event the record already holds FROM ANOTHER SOURCE — the same account, kind, holding, date, shares and
 *     price — is left out: a sale in a file and the same sale from the linked broker are one sale.
 *   · Shares one account reports as arriving, where the record already holds the transfer that sent them there
 *     within five days, are left out; and a transfer naming both accounts takes the place of such an arrival. */
export function rowsNotYetSaved(record: readonly AssetRow[], rows: readonly NewRow[]): NewRow[] {
  const seen = new Set(record.filter((r) => r.ref).map((r) => `${r.accountId}|${r.ref}`));
  const nth = new Map<string, number>();
  const out: NewRow[] = [];
  const claimed = new Set<string>();
  const near = (a: string | null, b: string | null) => a != null && b != null && Math.abs(Date.parse(a) - Date.parse(b)) <= 5 * 86400000;
  for (const given of rows) {
    let r = given;
    const event = EVENT_KINDS.has(r.kind) && !r.replacesRowId;
    if (!r.ref && event && dayOrNull(r.date) != null) {
      const made = [r.kind, dayOrNull(r.date) ?? r.date ?? '', oneHoldingSpelling(r.holding) ?? '', r.shares == null ? '' : Math.abs(r.shares), r.price ?? '', r.amount ?? '',
        r.toAccountId ?? '', r.arrives ? 'in' : ''].join('|');
      const k = `${r.accountId}|${made}`;
      nth.set(k, (nth.get(k) ?? 0) + 1);
      r = { ...r, ref: `${r.source}:${made}#${nth.get(k)}` };
    }
    if (r.ref) {
      const key = `${r.accountId}|${r.ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    if (event) {
      const H = oneHoldingSpelling(r.holding), day = dayOrNull(r.date), shares = r.shares == null ? null : Math.abs(r.shares);
      const inForce = rowsInForce(addRows(record, out, ''));
      const twin = day == null ? undefined : inForce.find((x) => !claimed.has(x.rowId) && x.source !== r.source && x.accountId === r.accountId && x.kind === r.kind
        && x.holding === H && x.date === day && sameNumber(x.shares, shares) && (x.shares != null ? sameNumber(x.price, r.price) : sameNumber(x.amount, r.amount))
        && (x.toAccountId ?? null) === (r.toAccountId ?? null) && !!x.arrives === !!r.arrives);
      if (twin) { claimed.add(twin.rowId); continue; }
      // an event that differs from one on record, or that the account holder took away or already said to keep theirs over
      const sofar = addRows(record, out, '');
      const differs = eventsThatDiffer(sofar, [r], claimed);
      if (differs.length) { claimed.add(differs[0].onRecord.rowId); continue; }
      if (keptOverArriving(sofar, r, claimed)) continue;
      if (r.kind === 'TRANSFER' && H != null && shares != null) {
        const same = (x: AssetRow) => x.kind === 'TRANSFER' && x.holding === H && near(x.date, day) && sameNumber(x.shares, shares);
        if (r.arrives && inForce.some((x) => same(x) && x.toAccountId === r.accountId)) continue;
        const arrival = r.toAccountId ? inForce.find((x) => same(x) && x.arrives && x.accountId === r.toAccountId && x.source !== 'typed') : undefined;
        if (arrival) {
          const { rowId: _n, writtenAt: _w, ...rest } = arrival;
          out.push({ ...rest, source: r.source, replacesRowId: arrival.rowId, removed: true });
        }
      }
    }
    out.push(r);
  }
  return out;
}

/** Where a row sits in time: its own date, or — where nobody gave one — the day it was first saved, the latest day
 *  it can have happened by. The row's date itself stays blank; this is only the order rows are read in. */
export function placedOn(r: Pick<AssetRow, 'date' | 'writtenAt'>): string {
  return r.date ?? r.writtenAt.slice(0, 10);
}

// ── values ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** The values of one account saved together: the account's own row and a row for each holding. */
export interface ValueBatch {
  accountId: string;
  /** The number of the account's own row, as first saved. */
  batch: string;
  /** The day the values are from, as given. Null where nobody gave it. */
  date: string | null;
  source: RowSource;
  writtenAt: string;
  /** Uninvested cash. Null where nobody gave it. */
  cash: number | null;
  statedTotal: number | null;
  typedValue: number | null;
  holdings: { holding: string; shares: number | null; price: number | null; value: number | null }[];
  /** Cash, the typed value and every holding added up. Null where a holding's value is not known, or where
   *  neither cash nor a typed value was given. */
  total: number | null;
  /** True where the person typed any of these values, or corrected one. */
  typed: boolean;
}

/** The rows for one account's values on one day: one row for the account itself (its cash, the broker's total, a
 *  typed value) and one for each holding, to be saved together. */
export function valueRows(v: {
  accountId: string; date: string | null; source: RowSource; cash?: number | null; statedTotal?: number | null;
  typedValue?: number | null; holdings?: { holding: string; shares: number | null; price: number | null; value: number | null }[];
}): NewRow[] {
  return [
    { accountId: v.accountId, holding: null, kind: 'VALUE', date: v.date, source: v.source, amount: v.cash ?? null,
      statedTotal: v.statedTotal ?? null, typedValue: v.typedValue ?? null },
    ...(v.holdings ?? []).map((h) => ({ accountId: v.accountId, holding: h.holding, kind: 'VALUE' as const, date: v.date,
      source: v.source, shares: h.shares, price: h.price, amount: h.value ?? null })),
  ];
}

/** Every set of values saved for an account, each as it was saved together — a corrected row read in its place. */
export function valueBatchesOf(record: readonly AssetRow[], accountId: string): ValueBatch[] {
  const first = firstRowOf(record);
  const rows = rowsInForce(record).filter((r) => r.accountId === accountId && r.kind === 'VALUE');
  return rows.filter((r) => r.holding == null).map((own) => {
    const holdings = rows.filter((r) => r.holding != null && r.batch === own.batch)
      .map((r) => ({ holding: r.holding as string, shares: r.shares ?? null, price: r.price ?? null, value: r.amount ?? null }));
    const cash = own.amount ?? null, typedValue = own.typedValue ?? null;
    const unknown = holdings.some((h) => h.value == null) || (cash == null && typedValue == null);
    return { accountId, batch: own.batch ?? own.rowId, date: own.date, source: own.source, writtenAt: first(own.rowId)?.writtenAt ?? own.writtenAt, cash,
      statedTotal: own.statedTotal ?? null, typedValue, holdings,
      typed: rows.some((r) => r.batch === own.batch && r.source === 'typed'),
      total: unknown ? null : (cash ?? 0) + (typedValue ?? 0) + holdings.reduce((t, h) => t + (h.value as number), 0) };
  });
}

/** Of two sets of values, the one to read: a dated one before an undated one; then the later date; on one date a
 *  given one before the price feed's, and one the person typed before the rest; then the later time-stamp; at one
 *  time-stamp, the one saved later. */
const theLater = (a: ValueBatch, b: ValueBatch): ValueBatch => {
  if ((a.date == null) !== (b.date == null)) return a.date != null ? a : b;
  if (a.date !== b.date) return (a.date as string) > (b.date as string) ? a : b;
  if (GIVEN.has(a.source) !== GIVEN.has(b.source)) return GIVEN.has(a.source) ? a : b;
  if (a.typed !== b.typed) return a.typed ? a : b;   // on one day, what the person typed stands in front
  const ta = instantOf(a.writtenAt), tb = instantOf(b.writtenAt);
  return ta !== tb ? (ta > tb ? a : b) : (Number(a.batch) > Number(b.batch) ? a : b);
};

/** WHAT THE SCREENS SHOW TODAY: the values with the latest date and, within that date, the latest time-stamp. On
 *  one date a value the broker, a file or the person gave stands in front of the price feed's. Values nobody dated
 *  are read only where no dated values exist. */
export function valuesNow(record: readonly AssetRow[], accountId: string): ValueBatch | null {
  const all = valueBatchesOf(record, accountId);
  return all.length ? all.reduce(theLater) : null;
}

/** The latest values the broker, a file or the person gave — never the price feed's. This is what the shares on
 *  record are checked against. */
export function valuesLastGiven(record: readonly AssetRow[], accountId: string): ValueBatch | null {
  const all = valueBatchesOf(record, accountId).filter((b) => GIVEN.has(b.source));
  return all.length ? all.reduce(theLater) : null;
}

/** What an account was worth on one day: the values dated that day — given ones before the price feed's, the latest
 *  saved. Values nobody dated belong to no day. With none, nothing. */
export function valuesOn(record: readonly AssetRow[], accountId: string, day: string): ValueBatch | null {
  const that = valueBatchesOf(record, accountId).filter((b) => b.date === day);
  return that.length ? that.reduce(theLater) : null;
}

/** The values a broker, a file or the person gave with no date: the person is asked what day they are from. */
export function valuesNeedingADate(record: readonly AssetRow[], accountId: string): ValueBatch[] {
  return valueBatchesOf(record, accountId).filter((b) => b.date == null && GIVEN.has(b.source));
}

/** The broker's own stated total less the total the rows add up to. Null where either is not known. */
export function statedTotalGap(batch: ValueBatch): number | null {
  return batch.statedTotal == null || batch.total == null ? null : batch.statedTotal - batch.total;
}

// ── purchases, sales, splits, transfers ─────────────────────────────────────────────────────────────────────────

/** A purchase still held, in whole or in part, in one account. */
export interface OpenPurchase {
  accountId: string;
  /** The number of the purchase's row as it stands today. */
  rowId: string;
  /** The number of the row it began as, before any correction. */
  firstRowId: string;
  date: string | null;
  /** The date it was first given with, before anyone typed over it. */
  firstDate: string | null;
  /** Shares of this purchase still held in this account, after every split since. */
  shares: number;
  /** Its price per share, after every split since. */
  price: number | null;
  averageOnly: boolean;
  source: RowSource;
  /** The day a broker's or a file's list said these shares were still held; no sale before it sold them. */
  stillHeldOn: string | null;
  /** How many shares each first share has become through the splits since. */
  splitBy: number;
  /** Where the shares reached this account by a transfer: that transfer's row, and the day they arrived. */
  movedInBy: string | null;
  arrived: string | null;
  /** The moment the row was first saved. */
  savedAt: string;
  /** True where the account holder entered the purchase themselves (it did not begin as a broker's or a file's row). */
  ownEntry: boolean;
}

/** What one sale or transfer out took: the purchases it took shares from; the shares no purchase accounts for; the
 *  shares waiting for the account holder to say which purchase they came from; and the shares of a sale made before
 *  the broker's list began, for which the history holds no purchase. */
export interface SharesTaken {
  rowId: string;
  accountId: string;
  from: { rowId: string; firstRowId: string; shares: number; price: number | null }[];
  beyond: number;
  unassigned: number;
  beforeList: number;
}

const ORDER: Partial<Record<RowKind, number>> = { SPLIT: 0, PURCHASE: 1, TRANSFER: 2, SALE: 3 };
const oldestLotFirst = (a: OpenPurchase, b: OpenPurchase) =>
  ((a.date ?? '') < (b.date ?? '') ? -1 : (a.date ?? '') > (b.date ?? '') ? 1 : Number(a.firstRowId) - Number(b.firstRowId));

/** Walk one holding through every account, in the order things happened (up to a given day, where one is given):
 *  each purchase enters on its day (one with no date is there from the start); a split multiplies the shares and
 *  divides the price of the purchases already in that account — never of a purchase a later list already states
 *  after the split; a sale or a transfer out takes the shares it names (only from purchases made by its day), then
 *  the rest from the oldest purchase first — unless a purchase it could take from has no date and there is more than
 *  one to choose from, in which case those shares wait for the account holder's answer. A sale made before the
 *  broker's list began takes nothing from the listed tax lots (the list is already net of it): what it made is read
 *  from the purchases in the broker's history. Shares transferred to another account arrive there as the same
 *  purchases, with their own dates and prices. On one day: a split, then purchases, then transfers, then sales. */
function walkHolding(record: readonly AssetRow[], holding: string, upTo: string | null = null): { lots: OpenPurchase[]; taken: SharesTaken[] } {
  const H = oneHoldingSpelling(holding);
  const first = firstRowOf(record);
  const began = (rowId: string) => first(rowId)?.rowId ?? rowId;
  const savedAt = (r: AssetRow) => (first(r.rowId) ?? r).writtenAt;
  const dayOf = (r: AssetRow) => r.date ?? (r.kind === 'PURCHASE' ? '' : savedAt(r).slice(0, 10));
  const events = rowsInForce(record).filter((r) => r.holding === H && ORDER[r.kind] != null && (r.kind !== 'TRANSFER' || (r.shares ?? 0) > 0))
    .map((r) => ({ r, day: dayOf(r) })).filter((e) => upTo == null || e.day <= upTo)
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1
      : (ORDER[a.r.kind] as number) - (ORDER[b.r.kind] as number) || Number(began(a.r.rowId)) - Number(began(b.r.rowId))));
  const lots: OpenPurchase[] = [];
  const shown: (OpenPurchase & { inListOf: string })[] = [];   // the history's purchases the list already counts
  const taken: SharesTaken[] = [];
  const pending = new Map<string, number>();                    // shares waiting for an answer, by account
  const unknownLot = (r: AssetRow, accountId: string, day: string, shares: number): OpenPurchase => ({ accountId, rowId: r.rowId, firstRowId: began(r.rowId),
    date: null, firstDate: null, shares, price: r.arrives ? r.price ?? null : null, averageOnly: false, source: r.source, stillHeldOn: null, splitBy: 1,
    movedInBy: r.rowId, arrived: day, savedAt: savedAt(r), ownEntry: false });
  for (const { r, day } of events) {
    if (r.kind === 'PURCHASE') {
      const f = first(r.rowId) ?? r;
      const lot: OpenPurchase = { accountId: r.accountId, rowId: r.rowId, firstRowId: f.rowId, date: r.date, firstDate: f.date, shares: r.shares ?? 0,
        price: r.price ?? null, averageOnly: !!r.averageOnly, source: r.source, stillHeldOn: r.stillHeldOn ?? null,
        splitBy: 1, movedInBy: null, arrived: null, savedAt: f.writtenAt, ownEntry: f.source === 'typed' };
      if (r.inListOf) shown.push({ ...lot, inListOf: r.inListOf }); else lots.push(lot);
      continue;
    }
    if (r.kind === 'SPLIT') {
      const ratio = r.ratio ?? 1;
      if (!(ratio > 0)) continue;
      for (const p of [...lots, ...shown]) {
        // a purchase a list states as held on a later day is already stated after this split; and a purchase the account
        // holder entered themselves states the shares held on the day it was entered, so an older split leaves it alone
        const entered = p.savedAt.slice(0, 10);
        const since = p.arrived ?? p.stillHeldOn ?? (p.ownEntry && (p.date ?? '') < entered ? entered : p.date) ?? entered;
        if (p.accountId === r.accountId && since < day) { p.shares *= ratio; p.splitBy *= ratio; if (p.price != null) p.price /= ratio; }
      }
      continue;
    }
    const asked = r.shares ?? 0;
    if (r.kind === 'TRANSFER' && r.arrives) { lots.push(unknownLot(r, r.accountId, day, asked)); continue; }
    // a sale dated on the very day of the list is read as already in it: the hour it was saved cannot say otherwise
    const afterList = (_p: unknown, listDay: string | null) => listDay == null || day > listDay;
    const picked = (lot: OpenPurchase) => picks.filter((x) => x.lot === lot).reduce((n, x) => n + x.shares, 0);
    const picks: { lot: OpenPurchase; shares: number }[] = [];
    let left = asked, unassigned = 0, beforeList = 0;
    const mine = lots.filter((p) => p.accountId === r.accountId && p.shares > EPS);
    for (const t of r.sells ?? []) {
      let want = Math.min(t.shares, left);
      for (const lot of mine.filter((p) => p.firstRowId === began(t.rowId) && (p.date ?? '') <= day)) {   // every piece of that purchase, made by this day
        const take = Math.min(lot.shares - picked(lot), want);
        if (take > EPS) { picks.push({ lot, shares: take }); want -= take; left -= take; }
      }
    }
    const from: SharesTaken['from'] = [];
    if (left > EPS) {
      const could = mine.filter((p) => ((p.arrived ?? p.date ?? '') <= day) && afterList(p, p.stillHeldOn) && p.shares - picked(p) > EPS).sort(oldestLotFirst);
      // a sale made before the broker's list began: the listed tax lots are already net of it
      const history = shown.filter((p) => p.accountId === r.accountId && p.shares > EPS && (p.date ?? '') <= day && !afterList(p, p.inListOf)).sort(oldestLotFirst);
      const predates = !could.length && (history.length > 0 || mine.some((p) => p.stillHeldOn != null && !afterList(p, p.stillHeldOn)));
      if (predates) {
        for (const p of history) {
          if (left <= EPS) break;
          const take = Math.min(p.shares, left);
          from.push({ rowId: p.rowId, firstRowId: p.firstRowId, shares: take, price: p.price }); p.shares -= take; left -= take;
        }
        beforeList = left > EPS ? left : 0; left = 0;
      } else if (could.length > 1 && could.some((p) => p.date == null)) {
        const free = could.reduce((n, p) => n + p.shares - picked(p), 0) - (pending.get(r.accountId) ?? 0);
        unassigned = Math.min(left, Math.max(free, 0));            // the account holder is asked which was sold
        pending.set(r.accountId, (pending.get(r.accountId) ?? 0) + unassigned);
        left -= unassigned;
      } else {
        // shares already waiting for an answer are not sold a second time
        let free = could.reduce((n, p) => n + p.shares - picked(p), 0) - (pending.get(r.accountId) ?? 0);
        for (const lot of could) {
          if (left <= EPS || free <= EPS) break;
          const take = Math.min(lot.shares - picked(lot), left, free);
          picks.push({ lot, shares: take }); left -= take; free -= take;
        }
      }
    }
    from.unshift(...picks.map(({ lot, shares }) => ({ rowId: lot.rowId, firstRowId: lot.firstRowId, shares, price: lot.price })));
    for (const { lot, shares } of picks) {
      lot.shares -= shares;
      if (r.kind === 'TRANSFER' && r.toAccountId) lots.push({ ...lot, accountId: r.toAccountId, shares, stillHeldOn: null, movedInBy: r.rowId, arrived: day });
    }
    if (r.kind === 'TRANSFER' && r.toAccountId && left + unassigned > EPS) lots.push(unknownLot(r, r.toAccountId, day, left + unassigned));
    taken.push({ rowId: r.rowId, accountId: r.accountId, from, beyond: left > EPS ? left : 0, unassigned, beforeList });
  }
  return { lots: lots.filter((p) => p.shares > EPS), taken };
}

/** The purchases of one holding still held in one account, each on its own: its date, its price, the shares of it
 *  left — the oldest first, one with no date before the dated. Shares that reached the account by a transfer are
 *  listed as the purchases they came from. Shares a sale took that wait for the person's answer are still listed. */
export function openPurchases(record: readonly AssetRow[], accountId: string, holding: string): OpenPurchase[] {
  return walkHolding(record, holding).lots.filter((p) => p.accountId === accountId).sort(oldestLotFirst);
}

/** What each sale and transfer out of one account took, for one holding: the purchases it took shares from (with
 *  each purchase's price at that moment), the shares no purchase on record accounts for, and the shares waiting for
 *  the person to say which purchase they came from. */
export function sharesTakenBy(record: readonly AssetRow[], accountId: string, holding: string): SharesTaken[] {
  return walkHolding(record, holding).taken.filter((t) => t.accountId === accountId);
}

/** The sales and transfers out that took more shares than the purchases on record hold: each one, and the shares
 *  no purchase accounts for. An empty list means every share sold was a share on record. */
export function soldBeyondRecord(record: readonly AssetRow[], accountId: string, holding: string): { rowId: string; shares: number }[] {
  return sharesTakenBy(record, accountId, holding).filter((t) => t.beyond > EPS).map((t) => ({ rowId: t.rowId, shares: t.beyond }));
}

/** THE SALES THE PERSON IS ASKED ABOUT (his ruling, 2026-11-10): each sale or transfer out that could have taken its
 *  shares from a purchase with no date, the shares in question, and the purchases to choose from. The answer is
 *  saved as a typed correction of the sale naming the purchases (correctRow with `sells`). */
export function salesNeedingAnAnswer(record: readonly AssetRow[], accountId: string): { rowId: string; holding: string; shares: number; choices: OpenPurchase[] }[] {
  const holdings = [...new Set(rowsInForce(record).filter((r) => r.accountId === accountId && r.holding != null && (r.kind === 'SALE' || r.kind === 'TRANSFER')).map((r) => r.holding as string))];
  return holdings.flatMap((holding) => sharesTakenBy(record, accountId, holding).filter((t) => t.unassigned > EPS)
    .map((t) => {
      const sale = rowAsItStands(record, t.rowId);
      return { rowId: t.rowId, holding, shares: t.unassigned,
        choices: openPurchases(record, accountId, holding).filter((p) => sale?.date == null || (p.date ?? '') <= sale.date) };
    }));
}

/** A sale as it is saved: on its own date, at its own price, its shares without a minus sign. It names purchases
 *  only where the broker or the person says which were sold. */
export function saleRow(s: {
  accountId: string; holding: string; date: string | null; settlementDate?: string | null; shares: number; price: number | null;
  amount?: number | null; fee?: number | null; source: RowSource; sells?: { rowId: string; shares: number }[]; ref?: string;
}): NewRow {
  const shares = Math.abs(s.shares);
  return { accountId: s.accountId, holding: s.holding, kind: 'SALE', date: s.date, settlementDate: s.settlementDate ?? null,
    shares, price: s.price, amount: s.amount != null ? Math.abs(s.amount) : (s.price != null ? shares * s.price : null), fee: s.fee ?? null, source: s.source,
    ...(s.ref ? { ref: s.ref } : {}), ...(s.sells?.length ? { sells: s.sells } : {}) };
}

/** Shares moved from one account to another, as ONE row. The purchases they came from — the ones named, else the
 *  oldest first — are read in the account they reach with their own dates and prices. */
export function transferRow(t: {
  fromAccountId: string; toAccountId: string; holding: string; date: string | null; shares: number; source: RowSource;
  sells?: { rowId: string; shares: number }[]; ref?: string;
}): NewRow {
  return { accountId: t.fromAccountId, toAccountId: t.toAccountId, holding: t.holding, kind: 'TRANSFER', date: t.date, shares: Math.abs(t.shares),
    source: t.source, ...(t.ref ? { ref: t.ref } : {}), ...(t.sells?.length ? { sells: t.sells } : {}) };
}

/** The purchases a sale sold, and how many shares of each. */
export function soldFrom(record: readonly AssetRow[], saleRowId: string): { rowId: string; shares: number }[] {
  const sale = rowAsItStands(record, saleRowId);
  if (!sale || sale.holding == null) return [];
  const t = sharesTakenBy(record, sale.accountId, sale.holding).find((x) => x.rowId === sale.rowId);
  return (t?.from ?? []).map((f) => ({ rowId: f.rowId, shares: f.shares }));
}

/** What a sale made, before fees: for each purchase it sold, the shares sold × (the sale's price − that purchase's
 *  price, as any split before the sale left it). Null — not known — where the sale's price or a purchase's price is
 *  not on record, where it sold more shares than the purchases on record hold, or while the person has not yet said
 *  which purchase was sold. */
export function saleGain(record: readonly AssetRow[], saleRowId: string): number | null {
  const sale = rowAsItStands(record, saleRowId);
  if (!sale || sale.kind !== 'SALE' || sale.price == null || sale.holding == null) return null;
  const t = sharesTakenBy(record, sale.accountId, sale.holding).find((x) => x.rowId === sale.rowId);
  if (!t || t.beyond > EPS || t.unassigned > EPS || t.beforeList > EPS || !t.from.length) return null;
  let gain = 0;
  for (const f of t.from) {
    if (f.price == null) return null;
    gain += f.shares * (sale.price - f.price);
  }
  return gain;
}

/** The shares of a holding the purchases, splits, transfers and sales on record add up to in one account — up to a
 *  given day, where one is given. Shares a sale took that wait for the person's answer are counted as sold. */
export function sharesOnRecord(record: readonly AssetRow[], accountId: string, holding: string, upTo: string | null = null): number {
  const w = walkHolding(record, holding, upTo);
  return w.lots.filter((p) => p.accountId === accountId).reduce((t, p) => t + p.shares, 0)
    - w.taken.filter((t) => t.accountId === accountId).reduce((t, x) => t + x.unassigned, 0);
}

/** Where the purchases and sales on record do not add up to the shares stated by the latest values the broker, a
 *  file or the person gave: the holding, the two counts, and the gap. The record is counted as of the day those
 *  values are from, so a purchase or a sale after that day raises no flag. A holding listed more than once is added
 *  up. A holding with shares on record that those values do not list is named too, as stated at 0. An empty list
 *  means every holding agrees. */
export function sharesThatDisagree(record: readonly AssetRow[], accountId: string): { holding: string; onRecord: number; stated: number; gap: number }[] {
  const now = valuesLastGiven(record, accountId);
  if (!now) return [];
  const stated = new Map<string, number>(), unknown = new Set<string>();
  for (const h of now.holdings) {
    if (h.shares == null) unknown.add(h.holding); else stated.set(h.holding, (stated.get(h.holding) ?? 0) + h.shares);
  }
  const mine = new Set(rowsInForce(record).filter((r) => r.holding != null && (r.kind === 'PURCHASE' || r.kind === 'TRANSFER')
    && (r.accountId === accountId || r.toAccountId === accountId)).map((r) => r.holding as string));
  const names = [...new Set([...stated.keys(), ...mine])].filter((h) => !unknown.has(h));
  return names.map((holding) => {
    const onRecord = sharesOnRecord(record, accountId, holding, now.date), says = stated.get(holding) ?? 0;
    return { holding, onRecord, stated: says, gap: says - onRecord };
  }).filter((x) => Math.abs(x.gap) > EPS);
}

/** A tax lot as a broker or a file lists it among what is held now: its date, the shares of it still held, and its
 *  price. `average` marks a line that is the broker's average for the whole holding, not one tax lot. */
export interface ListedPurchase { date: string | null; shares: number; price: number | null; average?: boolean }

/** The latest day a broker's or a file's list was taken into the record for one holding of one account: the latest
 *  day any of its purchases was stated by a list as still held. A list that only raised a question took nothing in. */
export function lastListDay(record: readonly AssetRow[], accountId: string, holding: string): string | null {
  const H = oneHoldingSpelling(holding);
  const days = record.filter((r) => r.accountId === accountId && r.holding === H && r.kind === 'PURCHASE' && r.stillHeldOn).map((r) => r.stillHeldOn as string);
  return days.length ? days.reduce((a, b) => (a > b ? a : b)) : null;
}

/** A purchase from a broker's history, as it is saved. Dated on or before the latest day the broker's list was taken
 *  into the record (or with no date, where there is such a list) it is marked as already counted in that list: it
 *  adds no shares, and is kept to show and to say what the sales before the list made. Dated after that day — or
 *  where no list has been taken in — it is a new transaction, and adds its shares. */
export function historyPurchaseRow(record: readonly AssetRow[], p: {
  accountId: string; holding: string; date: string | null; settlementDate?: string | null; shares: number; price: number | null;
  amount?: number | null; fee?: number | null; source: RowSource; ref?: string;
}): NewRow {
  const day = dayOrNull(p.date), list = lastListDay(record, p.accountId, p.holding);
  const shares = Math.abs(p.shares);
  return { accountId: p.accountId, holding: p.holding, kind: 'PURCHASE', date: p.date, settlementDate: p.settlementDate ?? null, shares, price: p.price,
    amount: p.amount != null ? Math.abs(p.amount) : (p.price != null ? shares * p.price : null), fee: p.fee ?? null, source: p.source,
    ...(p.ref ? { ref: p.ref } : {}), ...(list != null && (day == null || day <= list) ? { inListOf: list } : {}) };
}

/** An event that arrives and differs from one on record: both, and how they differ. */
export interface EventQuestion {
  arriving: NewRow;
  onRecord: AssetRow;
  /** price: the same day and shares at another price · date: the same shares (or, with no shares, the same amount)
   *  on a date up to five days away · taken-away: the account holder took this event away. */
  why: 'price' | 'date' | 'taken-away';
  /** The pair in one line, so the answer is remembered for exactly this pair. */
  key: string;
}

const NEARBY_DAYS = 5;
const daysFromOneDateToAnother = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
const arrivingKey = (r: NewRow) => r.ref ?? [r.kind, dayOrNull(r.date) ?? '', oneHoldingSpelling(r.holding) ?? '', r.shares == null ? '' : Math.abs(r.shares), r.price ?? '', r.amount ?? ''].join('|');
/** The answers the account holder has given about arriving events: by pair, "mine" or "both". */
function eventAnswers(record: readonly AssetRow[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of rowsInForce(record)) if (r.kind === 'FACT' && r.source === 'typed' && typeof r.facts?.eventPair === 'string') out.set(r.facts.eventPair as string, String(r.facts.eventAnswer));
  return out;
}

/** The on-record events an arriving event could be the same as: another source, the same account, kind, holding and
 *  shares (with no shares: the same amount), the same way round, dated the same day or up to five days away. */
function sameEventElsewhere(record: readonly AssetRow[], r: NewRow, claimed: ReadonlySet<string>, rows: readonly AssetRow[]): AssetRow[] {
  const H = oneHoldingSpelling(r.holding), day = dayOrNull(r.date), shares = r.shares == null ? null : Math.abs(r.shares);
  if (day == null) return [];
  return rows.filter((x) => !claimed.has(x.rowId) && x.accountId === r.accountId && x.kind === r.kind && x.holding === H && x.date != null
    && sameNumber(x.shares, shares) && (shares != null || sameNumber(x.amount, r.amount))
    && (x.toAccountId ?? null) === (r.toAccountId ?? null) && !!x.arrives === !!r.arrives && daysFromOneDateToAnother(x.date, day) <= NEARBY_DAYS)
    .sort((a, b) => daysFromOneDateToAnother(a.date as string, day) - daysFromOneDateToAnother(b.date as string, day));
}

/** True where the account holder already answered "mine is correct" for this arriving event: it is left out, unasked. */
function keptOverArriving(record: readonly AssetRow[], r: NewRow, claimed: ReadonlySet<string>): boolean {
  if (!EVENT_KINDS.has(r.kind) || r.replacesRowId) return false;
  const answers = eventAnswers(record), first = firstRowOf(record);
  return sameEventElsewhere(record, r, claimed, rowsInForce(record)).some((x) => answers.get(`${first(x.rowId)?.rowId ?? x.rowId}|${arrivingKey(r)}`) === 'mine');
}

/** AN EVENT THAT ARRIVES AND DIFFERS FROM WHAT THE RECORD HOLDS — a question for the account holder, never saved
 *  beside the other (his ruling, 2026-11-11: in every difference the account holder is asked which is correct). It
 *  is one from another source for the same account, kind, holding and shares at ANOTHER PRICE the same day, or ON A
 *  DATE UP TO FIVE DAYS AWAY (a purchase typed as Jul 29 and the broker's of Jul 30 are one purchase and a
 *  question, not two purchases); or one the account holder took away. A pair already answered is not returned. */
export function eventsThatDiffer(record: readonly AssetRow[], rows: readonly NewRow[], claimed: ReadonlySet<string> = new Set()): EventQuestion[] {
  const out: EventQuestion[] = [];
  const inForce = rowsInForce(record), first = firstRowOf(record), answers = eventAnswers(record);
  const taken = new Set(claimed);
  for (const r of rows) {
    if (!EVENT_KINDS.has(r.kind) || r.replacesRowId) continue;
    const day = dayOrNull(r.date);
    if (day == null) continue;
    const key = (x: AssetRow) => `${first(x.rowId)?.rowId ?? x.rowId}|${arrivingKey(r)}`;
    const gone = sameEventElsewhere(record, r, taken, record.filter((x) => x.removed && x.source === 'typed' && (first(x.rowId)?.source ?? x.source) !== 'typed'))
      .find((x) => x.date === day);
    if (gone) { if (!answers.has(key(gone))) out.push({ arriving: r, onRecord: gone, why: 'taken-away', key: key(gone) }); continue; }
    const others = sameEventElsewhere(record, r, taken, inForce).filter((x) => x.source !== r.source);
    const same = others.find((x) => x.date === day && (x.shares != null ? sameNumber(x.price, r.price) : true));
    if (same) continue;                                              // the same event: rowsNotYetSaved leaves it out
    const other = others.find((x) => !answers.has(key(x)));
    if (!other) continue;
    taken.add(other.rowId);
    out.push({ arriving: r, onRecord: other, why: other.date === day ? 'price' : 'date', key: key(other) });
  }
  return out;
}

/** THE ACCOUNT HOLDER'S ANSWER ABOUT AN ARRIVING EVENT, as rows to save.
 *  "theirs": the event on record takes the arriving event's date, price and amount — one event, saved as the account
 *  holder's own confirmed change, and the same delivery never asks again.
 *  "mine": nothing changes, and the arriving event is left out from now on without asking.
 *  "both": they are two different events; the arriving one is saved beside the other. */
export function answerEventQuestion(q: EventQuestion, answer: 'theirs' | 'mine' | 'both'): NewRow[] {
  const remember: NewRow = { accountId: q.onRecord.accountId, holding: q.onRecord.holding, kind: 'FACT', date: null, source: 'typed', facts: { eventPair: q.key, eventAnswer: answer } };
  if (answer === 'mine') return [remember];
  if (answer === 'both' || q.why === 'taken-away') return [{ ...remember, facts: { eventPair: q.key, eventAnswer: 'both' } }, q.arriving];   // an event taken away comes back only on the account holder's word
  const { rowId: _n, writtenAt: _w, dateAsGiven: _d, ...rest } = q.onRecord;
  return [{ ...rest, removed: undefined, date: q.arriving.date, settlementDate: q.arriving.settlementDate ?? rest.settlementDate ?? null, price: q.arriving.price ?? rest.price,
    amount: q.arriving.amount ?? rest.amount, fee: q.arriving.fee ?? rest.fee, ...(q.arriving.ref ? { ref: q.arriving.ref } : {}), source: 'typed', replacesRowId: q.onRecord.rowId }];
}

const sameShares = (a: number, b: number) => Math.abs(a - b) <= EPS;

/** A difference between a broker's or a file's list and the purchases on record that no transaction explains. The
 *  app changes nothing; the account holder is asked which is correct (his ruling, 2026-11-11). ONE question for
 *  one holding. */
export interface ListQuestion {
  accountId: string;
  holding: string;
  /** typed: the list differs from a purchase the account holder typed · removed: the list states a purchase the
   *  account holder took away · not-listed: the list and the purchases on record differ and no transaction on record
   *  explains it · price: the list states another price for a purchase · count: a broker's average states another
   *  number of shares. */
  kind: 'typed' | 'removed' | 'not-listed' | 'price' | 'count';
  /** The purchases on record in question, and their shares added up. */
  onRecord: OpenPurchase[];
  sharesOnRecord: number;
  /** What the list states instead, and its shares added up. */
  listed: ListedPurchase[];
  sharesListed: number;
  /** The difference in one line — which purchases, which listed dates, and the gap in shares — so an answer of "mine
   *  is correct" is remembered for this difference, and a sale that moves both sides alike does not ask again. */
  signature: string;
}

/** Set a broker's or a file's list beside the purchases still held. A listed tax lot is already held where an open
 *  purchase carries its date (as first given, or as it stands; a date that could not be read, by the date as given;
 *  no date, by having none) AND the same shares. Of the rest, a listed tax lot and a purchase under one date are the
 *  same purchase with two share counts, and a listed tax lot and a purchase of the same shares dated up to five days
 *  apart are the same purchase with two dates. What is left is a tax lot the record does not hold, or a purchase the
 *  list does not state. */
function besideTheList(record: readonly AssetRow[], open: readonly OpenPurchase[], listed: readonly ListedPurchase[]) {
  const pool = [...open];
  const asGiven = (p: OpenPurchase) => rowAsItStands(record, p.rowId)?.dateAsGiven ?? null;
  const under = (p: OpenPurchase, l: ListedPurchase) => {
    const day = dayOrNull(l.date);
    return day != null ? (p.firstDate === day || p.date === day)
      : wasGiven(l.date) ? asGiven(p) === l.date
        : p.date == null && p.firstDate == null && asGiven(p) == null && !p.averageOnly;
  };
  const held: { p: OpenPurchase; l: ListedPurchase }[] = [], differ: { p: OpenPurchase; l: ListedPurchase }[] = [];
  const rest: ListedPurchase[] = [], notHeld: ListedPurchase[] = [];
  for (const l of listed) {
    const i = pool.findIndex((p) => under(p, l) && sameShares(p.shares, l.shares));
    if (i >= 0) held.push({ p: pool.splice(i, 1)[0], l }); else rest.push(l);
  }
  const still: ListedPurchase[] = [];
  for (const l of rest) {
    const i = pool.findIndex((p) => under(p, l));
    if (i >= 0) differ.push({ p: pool.splice(i, 1)[0], l }); else still.push(l);
  }
  for (const l of still) {                                           // the same shares on a date up to five days away: one purchase, two dates
    const day = dayOrNull(l.date);
    const i = day == null ? -1 : pool.findIndex((p) => p.date != null && sameShares(p.shares, l.shares) && daysFromOneDateToAnother(p.date, day) <= NEARBY_DAYS);
    if (i >= 0) differ.push({ p: pool.splice(i, 1)[0], l }); else notHeld.push(l);
  }
  return { held, differ, notHeld, notListed: pool };
}

/** A purchase marked as replaced: it keeps only the shares already sold from it, so each earlier sale keeps what it
 *  made; with none sold it is taken away. Either way the row itself stays in the record. */
function replacedPurchase(record: readonly AssetRow[], p: OpenPurchase, source: RowSource): NewRow | null {
  const row = rowAsItStands(record, p.rowId);
  if (!row || p.movedInBy != null) return null;
  const { rowId: _n, writtenAt: _w, ...rest } = row;
  const sold = (row.shares ?? 0) - p.shares / p.splitBy;
  return sold > EPS ? { ...rest, shares: sold, amount: row.price != null ? sold * row.price : null, source, replacesRowId: row.rowId }
    : { ...rest, source, replacesRowId: row.rowId, removed: true };
}

/** WHAT A BROKER'S UPDATE OR A FILE DOES TO THE PURCHASES OF ONE HOLDING. `listed` is everything the list states for
 *  the holding (nothing, where the list no longer states it); `listDay` is the day the list is from: each tax lot
 *  added was still held that day, so no sale up to that day sold it. The history's purchases, sales, transfers and
 *  splits that arrive with the list are saved BEFORE this is asked, so a transaction explains what it can.
 *  THE LIST CHANGES THE PURCHASES IN FIVE CASES ONLY:
 *   1. The holding was never on record: the list is taken in.
 *   2. This is the first list for the holding and everything on record came from the broker's own history up to that
 *      day: the list is taken in, and the history's purchases are kept to show and to say what earlier sales made —
 *      they hold no shares (a history may be shorter than the holding's life; the list is not).
 *   3. The record holds only the broker's own average, untouched by the account holder, and the list now gives tax
 *      lots: the tax lots take the average's place — never added on top.
 *   4. Every purchase on record is on the list as it stands (or the account holder already answered for it), and the
 *      list adds tax lots dated AFTER the last list taken in: those are new purchases.
 *   5. A purchase on record has no price and the list gives one: the price is taken.
 *  IN EVERY OTHER CASE NOTHING CHANGES AND A QUESTION IS RETURNED FOR THE ACCOUNT HOLDER: one for each purchase the
 *  list states under another date, with other shares or at another price; one for whatever else differs (a purchase
 *  the list does not state, a tax lot the record does not hold, a purchase the account holder took away); one where
 *  a broker's average states another number of shares. A purchase the account holder entered themselves that the
 *  list does not state is asked about on its own and holds back nothing else. A difference already answered "mine
 *  is correct" is not asked again — also after a sale or a purchase that moves both sides alike. */
export function purchasesFromList(
  record: readonly AssetRow[], accountId: string, holding: string, listed: readonly ListedPurchase[], source: RowSource, listDay: string | null,
): { rows: NewRow[]; ask: ListQuestion[] } {
  const H = oneHoldingSpelling(holding) as string;
  const open = openPurchases(record, accountId, H);
  const valid = listed.filter((l) => l.shares > 0);
  const lots = valid.filter((l) => !l.average), averageLines = valid.filter((l) => l.average);
  const stillHeldOn = dayOrNull(listDay);
  const asRow = (l: ListedPurchase): NewRow => ({ accountId, holding: H, kind: 'PURCHASE', date: l.date, shares: l.shares, price: l.price, source,
    amount: l.price != null ? l.shares * l.price : null, ...(stillHeldOn ? { stillHeldOn } : {}), ...(l.average ? { averageOnly: true } : {}) });
  const rows: NewRow[] = [], ask: ListQuestion[] = [];
  const question = (kind: ListQuestion['kind'], onRecord: OpenPurchase[], states: ListedPurchase[], signature?: string) => {
    const sharesOnRec = onRecord.reduce((t, p) => t + p.shares, 0), sharesListed = states.reduce((t, l) => t + l.shares, 0);
    ask.push({ accountId, holding: H, kind, onRecord, sharesOnRecord: sharesOnRec, listed: states, sharesListed,
      signature: signature ?? `${kind}|${onRecord.map((p) => p.firstRowId).sort().join(',')}|${states.map((l) => l.date ?? '').sort().join(',')}|${sharesListed - sharesOnRec}` });
  };
  const keptMine = new Set(rowsInForce(record).filter((r) => r.kind === 'FACT' && r.accountId === accountId && r.holding === H && r.source === 'typed')
    .map((r) => r.facts?.keepsOverList).filter((x): x is string => typeof x === 'string'));
  const done = () => ({ rows, ask: ask.filter((q) => !keptMine.has(q.signature)) });
  const onRecordAlready = sharesOnRecord(record, accountId, H);
  // every purchase the record holds for the holding that holds, or held, shares
  const everything = rowsInForce(record).filter((r) => r.accountId === accountId && r.holding === H && r.kind === 'PURCHASE' && !r.inListOf);
  const everHeld = everything.length > 0 || open.length > 0;
  const tookAway = (l: ListedPurchase) => record.some((r) => r.removed && !r.byAnswer && r.source === 'typed' && r.kind === 'PURCHASE' && r.accountId === accountId
    && r.holding === H && r.date === dayOrNull(l.date));
  const last = lastListDay(record, accountId, H);

  if (lots.length || !averageLines.length) {
    // case 2: the first list, over a record made only of the broker's own history
    if (last == null && stillHeldOn != null && lots.length && everything.length && !lots.some(tookAway) && !open.some((p) => p.movedInBy != null)
      && everything.every((r) => r.source !== 'typed' && !r.stillHeldOn && (r.date ?? '') <= stillHeldOn)) {
      for (const r of everything) { const { rowId: _n, writtenAt: _w, ...rest } = r; rows.push({ ...rest, inListOf: stillHeldOn, source, replacesRowId: r.rowId }); }
      rows.push(...lots.map(asRow));
      return done();
    }
    const { held, differ, notHeld, notListed } = besideTheList(record, open, lots);
    const priceDiffers: { p: OpenPurchase; l: ListedPurchase }[] = [];
    for (const { p, l } of held) {
      const row = rowAsItStands(record, p.rowId);
      if (!row || l.price == null || p.movedInBy != null) continue;
      if (row.price == null && row.source !== 'typed') {             // case 5: a price the record lacks
        const { rowId: _n, writtenAt: _w, ...rest } = row;
        rows.push({ ...rest, price: l.price * p.splitBy, amount: (row.shares ?? 0) * l.price * p.splitBy, source, replacesRowId: row.rowId });
      } else if (p.price != null && !sameNumber(p.price, l.price) && row.source !== 'typed') priceDiffers.push({ p, l });
    }
    const pairSignature = (d: { p: OpenPurchase; l: ListedPurchase }) => `${d.p.source === 'typed' ? 'typed' : 'not-listed'}|${d.p.firstRowId}|${d.l.date ?? ''}|${d.l.shares - d.p.shares}`;
    const unanswered = differ.filter((d) => !keptMine.has(pairSignature(d)));
    const own = notListed.filter((p) => p.ownEntry && p.source === 'typed');            // entered by the account holder themselves
    const rest = notListed.filter((p) => !own.includes(p));
    const isLater = (l: ListedPurchase) => { const d = dayOrNull(l.date); return d != null && (last == null || d > last) && !tookAway(l); };
    if (!everHeld && !notHeld.some(tookAway)) rows.push(...notHeld.map(asRow));                                                // case 1
    else if (!differ.length && !own.length && rest.length && notHeld.length && !notHeld.some(tookAway)
      && rest.every((p) => p.averageOnly && p.source !== 'typed' && p.movedInBy == null)) {                                      // case 3
      rows.push(...rest.map((p) => replacedPurchase(record, p, source)).filter((r): r is NewRow => r != null), ...notHeld.map(asRow));
    } else {
      for (const d of unanswered) question(d.p.source === 'typed' ? 'typed' : 'not-listed', [d.p], [d.l], pairSignature(d));
      if (!rest.length && notHeld.every(isLater)) {                                                                              // case 4
        if (!unanswered.length) rows.push(...notHeld.map(asRow));
        else if (notHeld.length) question('not-listed', [], notHeld);
        if (own.length) question('typed', own, []);
      } else if (rest.length || notHeld.length || own.length) {
        question(notHeld.some(tookAway) ? 'removed' : [...rest, ...own].some((p) => p.source === 'typed') ? 'typed' : 'not-listed', [...rest, ...own], notHeld);
      }
    }
    if (priceDiffers.length) question('price', priceDiffers.map((d) => d.p), priceDiffers.map((d) => d.l),
      `price|${priceDiffers.map((d) => `${d.p.firstRowId}@${d.l.price}`).join(',')}`);
  } else {
    const shares = averageLines.reduce((t, l) => t + l.shares, 0);
    const cost = averageLines.reduce((t, l) => (t == null || l.price == null ? null : t + l.shares * l.price), 0 as number | null);
    const line: ListedPurchase = { date: null, shares, price: cost == null ? null : cost / shares, average: true };
    const tookAnAverageAway = record.some((r) => r.removed && !r.byAnswer && r.source === 'typed' && r.kind === 'PURCHASE' && r.accountId === accountId && r.holding === H);
    if (!everHeld && !tookAnAverageAway) rows.push(asRow(line));                                                               // case 1
    else if (!everHeld) question('removed', [], [line], `removed|average|${shares}`);
    else if (!sameShares(onRecordAlready, shares)) question('count', open, [line], `count|${shares - onRecordAlready}`);
  }
  return done();
}

/** THE ACCOUNT HOLDER'S ANSWER TO A LIST QUESTION, as rows to save.
 *  "The list is correct": what the list states takes the place of the purchases in question. Each of those keeps
 *  the shares already sold from it, so each earlier sale keeps what it made; the shares the list no longer states
 *  are kept to show, counted as held no more, so a sale that arrives later and explains them still says what it made.
 *  Shares that had arrived from outside the record give way to the tax lots that now state them.
 *  "Mine is correct": nothing changes, and the answer is kept so the same difference is not asked again. */
export function answerListQuestion(record: readonly AssetRow[], q: ListQuestion, listIsCorrect: boolean, source: RowSource, listDay: string | null): NewRow[] {
  if (!listIsCorrect) return [{ accountId: q.accountId, holding: q.holding, kind: 'FACT', date: null, source: 'typed', facts: { keepsOverList: q.signature } }];
  const stillHeldOn = dayOrNull(listDay);
  const out: NewRow[] = [];
  if (q.kind === 'price') {
    q.onRecord.forEach((p, i) => {
      const row = rowAsItStands(record, p.rowId), l = q.listed[i];
      if (!row || !l || l.price == null) return;
      const { rowId: _n, writtenAt: _w, ...rest } = row;
      out.push({ ...rest, price: l.price * p.splitBy, amount: (row.shares ?? 0) * l.price * p.splitBy, source: 'typed', replacesRowId: row.rowId });
    });
    return out;
  }
  const listedUnder = (p: OpenPurchase) => q.listed.filter((l) => dayOrNull(l.date) != null && (dayOrNull(l.date) === p.date || dayOrNull(l.date) === p.firstDate)).reduce((t, l) => t + l.shares, 0);
  for (const p of q.onRecord) {
    const row = rowAsItStands(record, p.rowId);
    if (!row) continue;
    const { rowId: _n, writtenAt: _w, ...rest } = row;
    if (p.movedInBy != null) {
      // shares that had arrived from outside the record give way to the tax lots that now state them
      if (row.kind === 'TRANSFER' && row.arrives && row.accountId === q.accountId) out.push({ ...rest, source: 'typed', replacesRowId: row.rowId, removed: true, byAnswer: true });
      // shares that moved in from another account of the record: one row ends them here, naming the purchase they came from
      else out.push({ accountId: q.accountId, holding: q.holding, kind: 'TRANSFER', date: stillHeldOn, shares: p.shares, source: 'typed',
        sells: [{ rowId: p.firstRowId, shares: p.shares }], restated: true, byAnswer: true });
      continue;
    }
    const soldAlready = (row.shares ?? 0) - p.shares / p.splitBy;
    out.push(soldAlready > EPS ? { ...rest, shares: soldAlready, amount: row.price != null ? soldAlready * row.price : null, source: 'typed', replacesRowId: row.rowId, byAnswer: true }
      : { ...rest, source: 'typed', replacesRowId: row.rowId, removed: true, byAnswer: true });
    const gone = (p.shares - listedUnder(p)) / p.splitBy;            // shares the list no longer states: kept to show
    if (gone > EPS && stillHeldOn) out.push({ accountId: q.accountId, holding: q.holding, kind: 'PURCHASE', date: row.date, shares: gone, price: row.price ?? null,
      amount: row.price != null ? gone * row.price : null, source: 'typed', inListOf: stillHeldOn, byAnswer: true });
  }
  out.push(...q.listed.map((l): NewRow => ({ accountId: q.accountId, holding: q.holding, kind: 'PURCHASE', date: l.date, shares: l.shares, price: l.price, source,
    amount: l.price != null ? l.shares * l.price : null, ...(stillHeldOn ? { stillHeldOn } : {}), ...(l.average ? { averageOnly: true } : {}) })));
  return out;
}

/** WHERE WHAT THE ACCOUNT HOLDER IS ABOUT TO ENTER DIFFERS FROM WHAT A BROKER OR A FILE GAVE: each figure, as given
 *  and as entered — for the confirmation the account holder sees before the change is saved (his words, 2026-11-11:
 *  "The information from Robinhood indicates price of 350, you entered 320. Confirm changing price for 100 shares
 *  of MSFT to 320."). An empty list means nothing differs, or the row is already the account holder's own. */
export function differsFromGiven(record: readonly AssetRow[], rowId: string, change: Partial<Pick<NewRow, 'date' | 'price' | 'shares' | 'amount'>>):
{ field: 'date' | 'price' | 'shares' | 'amount'; given: string | number | null; entered: string | number | null; holding: string | null; shares: number | null }[] {
  const old = rowAsItStands(record, rowId);
  if (!old || old.source === 'typed') return [];
  return (['date', 'price', 'shares', 'amount'] as const).filter((f) => f in change)
    .map((f) => ({ field: f, given: (old[f] ?? null) as string | number | null, entered: (change[f] ?? null) as string | number | null, holding: old.holding, shares: old.shares ?? null }))
    .filter((d) => (typeof d.given === 'number' && typeof d.entered === 'number' ? Math.abs(d.given - d.entered) > EPS : d.given !== d.entered));
}

// ── corrections ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Correct a row. The old row stays in the record; a new row carrying the change names it, and whatever named the
 *  old row follows. A person's own change is saved as typed. REFUSED, with the record left as it was: a change to a
 *  row that does not exist or was taken away; a change by a sync or a file to a row the person typed; a date that
 *  cannot be read as a day; a new date on a value row (values for another day are saved as that day's own rows). */
export function correctRow(
  record: readonly AssetRow[], rowId: string, change: Partial<NewRow>, source: RowSource, writtenAt: string,
): Changed {
  const same = [...record];
  const old = rowAsItStands(record, rowId);
  if (!old) return { record: same, problem: `Row ${rowId} is not in the record, or was taken away.` };
  if (old.source === 'typed' && source !== 'typed') return { record: same, problem: `Row ${old.rowId} was typed by the person, so it is not replaced.` };
  for (const k of ['date', 'settlementDate'] as const) {
    if (k in change && wasGiven(change[k]) && dayOrNull(change[k]) == null) return { record: same, problem: `"${change[k]}" is not a date the record can read (year-month-day).` };
  }
  if (old.kind === 'VALUE' && 'date' in change && dayOrNull(change.date) !== old.date) {
    return { record: same, problem: 'The values of one day are not moved to another day; the other day is saved as its own values.' };
  }
  const { rowId: _id, writtenAt: _at, ...rest } = old;
  const next: NewRow = { ...rest, ...change, source, replacesRowId: old.rowId };
  if ('date' in change) delete next.dateAsGiven;
  if ('settlementDate' in change) delete next.settlementDateAsGiven;
  return { record: addRows(record, [next], writtenAt), problem: null };
}

/** Take a row away. The row stays in the record; a removal names it, and neither counts from then on. REFUSED where
 *  a sale or a transfer took shares from the purchase: that sale is corrected or taken away first. */
export function removeRow(record: readonly AssetRow[], rowId: string, source: RowSource, writtenAt: string): Changed {
  const old = rowAsItStands(record, rowId);
  if (old?.kind === 'PURCHASE' && old.holding != null) {
    const began = firstRowOf(record)(old.rowId)?.rowId;
    const by = walkHolding(record, old.holding).taken.find((t) => t.from.some((f) => f.firstRowId === began));
    if (by) return { record: [...record], problem: `Row ${by.rowId} took shares from this purchase, so the purchase is not taken away.` };
  }
  return correctRow(record, rowId, { removed: true }, source, writtenAt);
}

// ── activity and facts ──────────────────────────────────────────────────────────────────────────────────────────

/** The activity of an account: every purchase, sale, dividend, interest payment, deposit, withdrawal, transfer (out
 *  of it or into it), fee, split and unknown word on record, the dated ones oldest first and the undated after them. */
export function activityOf(record: readonly AssetRow[], accountId: string): AssetRow[] {
  return rowsInForce(record).filter((r) => (r.accountId === accountId || r.toAccountId === accountId) && r.kind !== 'VALUE' && r.kind !== 'FACT' && !r.restated)
    .sort((a, b) => (a.date && b.date ? (a.date < b.date ? -1 : a.date > b.date ? 1 : Number(a.rowId) - Number(b.rowId))
      : a.date ? -1 : b.date ? 1 : Number(a.rowId) - Number(b.rowId)));
}

/** The facts on record for an account (holding null) or one of its holdings: each fact as last given, a typed fact
 *  standing in front of a linked or file one however late that one arrived. A blank is not a fact: it changes nothing. */
export function factsOf(record: readonly AssetRow[], accountId: string, holding: string | null): Record<string, unknown> {
  const H = oneHoldingSpelling(holding);
  const rows = rowsInForce(record).filter((r) => r.accountId === accountId && r.holding === H && r.kind === 'FACT')
    .sort((a, b) => instantOf(a.writtenAt) - instantOf(b.writtenAt) || Number(a.rowId) - Number(b.rowId));
  const out: Record<string, unknown> = {}, typed = new Set<string>();
  for (const r of rows) for (const [k, v] of Object.entries(r.facts ?? {})) {
    if (v == null || v === '') continue;
    if (r.source !== 'typed' && typed.has(k)) continue;
    out[k] = v;
    if (r.source === 'typed') typed.add(k);
  }
  return out;
}
