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
  | 'OTHER'        // a broker's word the app does not know: kept, shown, counted in nothing
  | 'ADJUSTMENT';  // SHOWN ONLY, never saved: shares an answer about a list changed with no transaction behind it

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
  /** On the account holder's own correction: the figures the account holder changed. */
  changed?: string[];
  /** On shares an answer about a list kept to show: the sales (as first saved) that were still waiting for shares
   *  when the account holder answered — they, and any sale that arrives later, may take from these shares. */
  forSales?: string[];
  /** On a PURCHASE an answer about a list saved: the purchase on record (as first saved) it restates. */
  standsFor?: string;
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

/** WHAT ARRIVES FROM A BROKER OR A FILE, SORTED ONCE: the rows to save, and the events to ask the account holder
 *  about — so nothing sent twice, or sent by two roads, is saved twice, and the two answers never disagree.
 *   · A row carrying a key the record already holds for that account is left out. A dated row with no key is given
 *     one made from the row (its kind, date, holding, shares, price and amount) and its place among rows alike in
 *     the same delivery — so the same delivery arriving twice adds nothing, and two sales alike in one delivery are
 *     still two sales. A row with no date and no key is always kept.
 *   · FIRST, every arriving event that is exactly one the record already holds from another source — the same
 *     account, kind, holding, date, shares and price — is set against it and left out. Only then:
 *   · an event that DIFFERS from one still unmatched on record from another source — the same shares at another
 *     price, or on a date up to five days away — or that the account holder took away, is left out and returned as
 *     a question (his ruling, 2026-11-11). Once answered (answerEventQuestion) it is not asked again.
 *   · The same event re-sent under its key with another date, price or shares — or, from a file, re-sent at another
 *     price with no key of this delivery matching the row on record — is a question, never a second event.
 *   · A purchase on record with no date and an arriving purchase of the same shares at the same price are one purchase:
 *     a question about the date.
 *   · Shares one account reports as arriving, where the record already holds the transfer that sent them there
 *     within five days, are left out; and a transfer naming both accounts takes the place of such an arrival. */
export function sortArriving(record: readonly AssetRow[], rows: readonly NewRow[]): { save: NewRow[]; ask: EventQuestion[] } {
  const seen = new Set(record.filter((r) => r.ref).map((r) => `${r.accountId}|${r.ref}`));
  const nth = new Map<string, number>();
  const inForce = rowsInForce(record), first = firstRowOf(record), answers = eventAnswers(record);
  // an arriving event the account holder already answered "mine is correct" for — whatever has changed on record since
  const keptMineFor = new Set([...answers].filter(([, a]) => a === 'mine').map(([pair]) => pair.slice(pair.indexOf('|') + 1)));
  const claimed = new Set<string>();
  const matched = new Set<string>();                    // record rows (as first saved) this delivery sent again under their key
  const changedUnderKey: EventQuestion[] = [];
  const near = (a: string | null, b: string | null) => a != null && b != null && daysFromOneDateToAnother(a, b) <= NEARBY_DAYS;
  const isEvent = (r: NewRow) => EVENT_KINDS.has(r.kind) && !r.replacesRowId;
  // keys, and the rows the record already holds under them
  const fresh: NewRow[] = [];
  for (const given of rows) {
    let r = given;
    if (!r.ref && isEvent(r) && dayOrNull(r.date) != null) {
      const made = [r.kind, dayOrNull(r.date) ?? r.date ?? '', oneHoldingSpelling(r.holding) ?? '', r.shares == null ? '' : Math.abs(r.shares), r.price ?? '', r.amount ?? '',
        r.toAccountId ?? '', r.arrives ? 'in' : ''].join('|');
      const k = `${r.accountId}|${made}`;
      nth.set(k, (nth.get(k) ?? 0) + 1);
      r = { ...r, ref: `${r.source}:${made}#${nth.get(k)}` };
    }
    if (r.ref) {
      const key = `${r.accountId}|${r.ref}`;
      if (seen.has(key)) {
        // the same event, sent again under its key: where the broker now sends another date, price or shares for it, the
        // account holder is asked; otherwise nothing is saved
        const held = inForce.find((x) => x.accountId === r.accountId && x.ref === r.ref) ?? record.find((x) => x.accountId === r.accountId && x.ref === r.ref);
        if (held) {
          matched.add(first(held.rowId)?.rowId ?? held.rowId);
          const live = rowAsItStands(record, held.rowId) ?? held;
          const ratioMoved = r.kind === 'SPLIT' && !sameNumber(live.ratio ?? null, r.ratio ?? null);
          const moved = live.source !== 'typed' && isEvent(r) && !live.removed
            && (dayOrNull(r.date) !== live.date || !sameNumber(live.shares, r.shares == null ? null : Math.abs(r.shares)) || !sameNumber(live.price, r.price) || ratioMoved);
          const pair = `${first(live.rowId)?.rowId ?? live.rowId}|${arrivingKey(r)}|${r.ratio ?? ''}`;
          if (moved && !answers.has(pair))
            changedUnderKey.push({ arriving: r, onRecord: live, why: ratioMoved ? 'ratio' : dayOrNull(r.date) !== live.date ? 'date' : 'price', key: pair });
        }
        continue;
      }
      seen.add(key);
    }
    fresh.push(r);
  }
  // a file or broker row, from the SAME source as one on record, that no key of this delivery matched and that has the
  // same kind, holding, date and shares at another price: the same event re-sent with a correction — a question
  const sameSourceCorrection = (r: NewRow): AssetRow | undefined => {
    if (!isEvent(r) || r.kind === 'VALUE') return undefined;
    const H = oneHoldingSpelling(r.holding), day = dayOrNull(r.date), shares = r.shares == null ? null : Math.abs(r.shares);
    if (day == null || shares == null) return undefined;
    const sentNow = new Set(fresh.filter((x) => x !== r).map((x) => [x.kind, dayOrNull(x.date), oneHoldingSpelling(x.holding), x.shares == null ? '' : Math.abs(x.shares), x.price ?? ''].join('|')));
    return inForce.find((x) => !claimed.has(x.rowId) && !matched.has(first(x.rowId)?.rowId ?? x.rowId) && x.source === r.source && x.accountId === r.accountId
      && x.kind === r.kind && x.holding === H && x.date === day && sameNumber(x.shares, shares) && !sameNumber(x.price, r.price)
      && !sentNow.has([x.kind, x.date, x.holding, x.shares ?? '', x.price ?? ''].join('|')));
  };
  // first: the events the record already holds exactly, from another source
  const already = new Set<NewRow>();
  for (const r of fresh) {
    if (!isEvent(r)) continue;
    const day = dayOrNull(r.date);
    const twin = sameEventElsewhere(record, r, claimed, inForce).find((x) => x.source !== r.source && x.date === day && (x.shares != null ? sameNumber(x.price, r.price) : true));
    if (twin) { claimed.add(twin.rowId); already.add(r); }
  }
  const save: NewRow[] = [], ask: EventQuestion[] = [...changedUnderKey];
  for (const r of fresh) {
    if (already.has(r)) continue;
    if (isEvent(r)) {
      const H = oneHoldingSpelling(r.holding), day = dayOrNull(r.date), shares = r.shares == null ? null : Math.abs(r.shares);
      const key = (x: AssetRow) => `${first(x.rowId)?.rowId ?? x.rowId}|${arrivingKey(r)}`;
      if (day != null) {
        // an event the account holder took away (never one an answer about a list replaced)
        const backAgain = sameEventElsewhere(record, r, claimed, inForce).some((x) => x.date === day);
        const gone = backAgain ? undefined : sameEventElsewhere(record, r, claimed, record.filter((x) => x.removed && !x.byAnswer && x.source === 'typed' && (first(x.rowId)?.source ?? x.source) !== 'typed'))
          .find((x) => x.date === day);
        if (gone) { if (!answers.has(key(gone))) ask.push({ arriving: r, onRecord: gone, why: 'taken-away', key: key(gone) }); continue; }
        const others = sameEventElsewhere(record, r, claimed, inForce).filter((x) => x.source !== r.source);
        if (others.some((x) => answers.get(key(x)) === 'mine') || keptMineFor.has(arrivingKey(r))) continue;   // already answered "mine is correct": left out, unasked
        if (others.some((x) => listAnswered(record, x, day))) continue;       // the same difference already answered about the list
        const other = others.find((x) => !answers.has(key(x)));
        if (other) { claimed.add(other.rowId); ask.push({ arriving: r, onRecord: other, why: other.date === day ? 'price' : 'date', key: key(other) }); continue; }
        const corrected = sameSourceCorrection(r);
        if (corrected) {
          claimed.add(corrected.rowId);
          if (!answers.has(key(corrected))) ask.push({ arriving: r, onRecord: corrected, why: 'price', key: key(corrected) });
          continue;
        }
      }
      if (r.kind === 'TRANSFER' && H != null && shares != null) {
        const sofar = rowsInForce(addRows(record, save, ''));
        const same = (x: AssetRow) => x.kind === 'TRANSFER' && x.holding === H && near(x.date, day) && sameNumber(x.shares, shares);
        if (r.arrives && sofar.some((x) => same(x) && x.toAccountId === r.accountId)) continue;
        const arrival = r.toAccountId ? sofar.find((x) => same(x) && x.arrives && x.accountId === r.toAccountId && x.source !== 'typed') : undefined;
        if (arrival) {
          const { rowId: _n, writtenAt: _w, ...rest } = arrival;
          save.push({ ...rest, source: r.source, replacesRowId: arrival.rowId, removed: true });
        }
      }
    }
    save.push(r);
  }
  return { save, ask };
}

/** Rows not yet in the record: what sortArriving says to save. */
export function rowsNotYetSaved(record: readonly AssetRow[], rows: readonly NewRow[]): NewRow[] {
  return sortArriving(record, rows).save;
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

/** ON ONE DAY, A VALUE THE ACCOUNT HOLDER TYPED AND A LATER ONE FROM A BROKER OR A FILE THAT DIFFERS: the typed one
 *  stands (the account holder can always override) and the two are handed back so the account holder is asked which is
 *  correct (his ruling, 2026-11-11: every difference is asked). */
export function valuesThatDiffer(record: readonly AssetRow[], accountId: string): { typed: ValueBatch; given: ValueBatch }[] {
  const all = valueBatchesOf(record, accountId);
  const answered = new Set(rowsInForce(record).filter((r) => r.kind === 'FACT' && r.source === 'typed' && r.accountId === accountId && typeof r.facts?.valuesAnswered === 'string')
    .map((r) => r.facts?.valuesAnswered as string));
  const answeredBatches = new Set(rowsInForce(record).filter((r) => r.kind === 'FACT' && typeof r.facts?.valuesAnswered === 'string').map((r) => (r.facts?.valuesAnswered as string).split('|')[0]));
  const latestTyped = all.filter((t) => t.typed && t.date != null).filter((t, _i, typedAll) => !typedAll.some((o) => o !== t && o.date === t.date && instantOf(o.writtenAt) > instantOf(t.writtenAt)));
  return latestTyped.flatMap((typed) => all
    .filter((g) => !g.typed && GIVEN.has(g.source) && g.date === typed.date && instantOf(g.writtenAt) > instantOf(typed.writtenAt) && !sameNumber(g.total, typed.total)
      && !answered.has(`${typed.batch}|${g.batch}`))
    .map((given) => ({ typed, given })));
}

/** The account holder's answer about a typed value and a broker's: "mine" keeps the typed one; "theirs" types the
 *  broker's figures for that day as the account holder's own. Either way the question is not asked again. */
export function answerValuesQuestion(d: { typed: ValueBatch; given: ValueBatch }, answer: 'mine' | 'theirs', record: readonly AssetRow[] = []): NewRow[] {
  const pair = `${d.typed.batch}|${d.given.batch}`;
  const without = record.filter((r) => !(r.kind === 'FACT' && r.facts?.valuesAnswered === pair));
  const earlier = [...rowsInForce(record)].reverse().find((r) => r.kind === 'FACT' && r.facts?.valuesAnswered === pair);
  // "mine" after "theirs": the account holder's own values of that day are typed again, after the broker's copy
  if (record.length && answer === 'mine' && earlier?.facts?.valuesAnswer === 'theirs') {
    return [{ accountId: d.typed.accountId, holding: null, kind: 'FACT', date: null, source: 'typed', facts: { valuesAnswered: pair, valuesAnswer: 'mine' } },
      ...valueRows({ accountId: d.typed.accountId, date: d.typed.date, source: 'typed', cash: d.typed.cash, statedTotal: d.typed.statedTotal, typedValue: d.typed.typedValue, holdings: d.typed.holdings })];
  }
  if (record.length && !valuesThatDiffer(without, d.typed.accountId).some((x) => x.typed.batch === d.typed.batch && x.given.batch === d.given.batch)) return [];
  const remember: NewRow = { accountId: d.typed.accountId, holding: null, kind: 'FACT', date: null, source: 'typed', facts: { valuesAnswered: `${d.typed.batch}|${d.given.batch}`, valuesAnswer: answer } };
  if (answer === 'mine') return [remember];
  return [remember, ...valueRows({ accountId: d.given.accountId, date: d.given.date, source: 'typed', cash: d.given.cash, statedTotal: d.given.statedTotal, typedValue: d.given.typedValue, holdings: d.given.holdings })];
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
  /** On a broker's tax lot: shares sales dated before its list sold from it — the list already states it without them. */
  soldBeforeList: number;
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
  /** Shares of a sale dated before a broker's list that the list is already net of, priced from the oldest listed tax
   *  lot dated before the sale (which is not reduced again). */
  attributed: number;
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
function walkHolding(record: readonly AssetRow[], holding: string, upTo: string | null = null): { lots: OpenPurchase[]; taken: SharesTaken[]; everyLot: OpenPurchase[] } {
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
  const shown: (OpenPurchase & { inListOf: string; leftByAnswer: boolean; forSales: string[] })[] = [];   // the history's purchases the list already counts, and shares an answer kept to show
  const taken: SharesTaken[] = [];
  const pending = new Map<string, number>();                    // shares waiting for an answer, by account
  const unknownLot = (r: AssetRow, accountId: string, day: string, shares: number): OpenPurchase => ({ accountId, rowId: r.rowId, firstRowId: began(r.rowId),
    date: null, firstDate: null, shares, price: r.arrives ? r.price ?? null : null, averageOnly: false, source: r.source, stillHeldOn: null, splitBy: 1,
    movedInBy: r.rowId, arrived: day, savedAt: savedAt(r), ownEntry: false, soldBeforeList: 0 });
  for (const { r, day } of events) {
    if (r.kind === 'PURCHASE') {
      const f = first(r.rowId) ?? r;
      const lot: OpenPurchase = { accountId: r.accountId, rowId: r.rowId, firstRowId: f.rowId, date: r.date, firstDate: f.date, shares: r.shares ?? 0,
        price: r.price ?? null, averageOnly: !!r.averageOnly, source: r.source, stillHeldOn: r.stillHeldOn ?? null,
        splitBy: 1, movedInBy: null, arrived: null, savedAt: f.writtenAt, ownEntry: f.source === 'typed', soldBeforeList: 0 };
      if (r.inListOf) shown.push({ ...lot, inListOf: r.inListOf, leftByAnswer: !!r.byAnswer, forSales: r.forSales ?? [] }); else lots.push(lot);
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
    let left = asked, unassigned = 0, beforeList = 0, attributed = 0;
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
      // a sale dated on or before a list: that list is already net of it, so the sale takes first from the shares the
      // list no longer states — the broker's history's own purchases that list counted, or the shares an answer about
      // the list kept to show — oldest first, and only then from the purchases held
      // shares an answer kept to show stand for a sale that had NOT yet arrived when the account holder answered, or that
      // was still waiting for shares then: a sale that had its shares then keeps taking from the purchase it took from
      const history = shown.filter((p) => p.accountId === r.accountId && p.shares > EPS && (p.date ?? '') <= day && !afterList(p, p.inListOf)
        && (!p.leftByAnswer || instantOf(savedAt(r)) > instantOf(p.savedAt) || p.forSales.includes(began(r.rowId)))).sort(oldestLotFirst);
      for (const p of history) {
        if (left <= EPS) break;
        // a history purchase its list still states (under its date) was not sold before that list: only the shares the
        // list no longer states are there to have been sold
        const stillListed = p.leftByAnswer ? 0 : lots.filter((x) => x.accountId === r.accountId && x.date === p.date && x.stillHeldOn === p.inListOf && x.source !== 'typed' && x.movedInBy == null)
          .reduce((n, x) => n + x.shares + x.soldBeforeList, 0);
        const take = Math.min(Math.max(p.shares - stillListed, 0), left);
        if (take <= EPS) continue;
        from.push({ rowId: p.rowId, firstRowId: p.firstRowId, shares: take, price: p.price }); p.shares -= take; left -= take;
      }
      const could = mine.filter((p) => ((p.arrived ?? p.date ?? '') <= day) && afterList(p, p.stillHeldOn) && p.shares - picked(p) > EPS).sort(oldestLotFirst);
      const predates = !could.length && (history.length > 0 || mine.some((p) => p.stillHeldOn != null && !afterList(p, p.stillHeldOn)));
      if (left <= EPS) {
        // every share the sale took is accounted for
      } else if (predates) {
        // the list is already net of this sale: it sold, oldest first, from the oldest tax lot that list states dated on or
        // before the sale — that lot is not reduced again; with none, the shares are before the list and not known
        const listed = mine.filter((p) => p.stillHeldOn != null && !afterList(p, p.stillHeldOn) && (p.date ?? '') <= day && p.movedInBy == null).sort(oldestLotFirst);
        if (listed.length > 1 && listed.some((p) => p.date == null)) {
          unassigned = left;                                         // the account holder is asked which tax lot was sold
          pending.set(r.accountId, (pending.get(r.accountId) ?? 0) + unassigned);
        } else if (listed.length) {
          from.push({ rowId: listed[0].rowId, firstRowId: listed[0].firstRowId, shares: left, price: listed[0].price });
          listed[0].soldBeforeList += left; attributed = left;
        } else beforeList = left;
        left = 0;
      } else if (could.length > 1 && could.some((p) => p.date == null) && ((pending.get(r.accountId) ?? 0) > EPS || left < could.reduce((n, p) => n + p.shares - picked(p), 0) - EPS)) {
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
    taken.push({ rowId: r.rowId, accountId: r.accountId, from, beyond: left > EPS ? left : 0, unassigned, beforeList, attributed });
  }
  return { lots: lots.filter((p) => p.shares > EPS), taken, everyLot: lots };
}

/** The purchases of one holding still held in one account, each on its own: its date, its price, the shares of it
 *  left — the oldest first, one with no date before the dated. Shares that reached the account by a transfer are
 *  listed as the purchases they came from. Shares a sale took that wait for the person's answer are still listed. */
export function openPurchases(record: readonly AssetRow[], accountId: string, holding: string): OpenPurchase[] {
  const w = walkHolding(record, holding);
  const lots = w.lots.filter((p) => p.accountId === accountId).sort(oldestLotFirst);
  // where the sales waiting for "which tax lot" take every share that is left, nothing is open
  const waiting = w.taken.filter((t) => t.accountId === accountId).reduce((n, t) => n + t.unassigned, 0);
  return waiting > EPS && lots.reduce((n, p) => n + p.shares, 0) - waiting <= EPS ? [] : lots;
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

/** THE SALES THE ACCOUNT HOLDER TYPED THAT A LATER LIST CONTRADICTS: a sale dated on or before a day the broker's
 *  list still stated the shares as held — a list that was taken in — with no purchase in the history to sell from.
 *  Nothing changes; each is a question for the account holder — the sale's date, or the list, is not right. A list
 *  that was NOT taken in because it contradicts a typed sale is asked by purchasesFromList itself; one taken in on the
 *  account holder's answer that still states the shares a typed sale sold is handed back here too. */
export function typedSalesTheListContradicts(record: readonly AssetRow[], accountId: string): { rowId: string; holding: string; shares: number }[] {
  const inForce = rowsInForce(record);
  const holdings = [...new Set(inForce.filter((r) => r.accountId === accountId && r.holding != null && r.kind === 'SALE' && r.source === 'typed').map((r) => r.holding as string))];
  return holdings.flatMap((holding) => sharesTakenBy(record, accountId, holding).flatMap((t) => {
    const sale = rowAsItStands(record, t.rowId);
    if (!sale || sale.source !== 'typed') return [];
    if (t.beforeList + t.attributed > EPS) return [{ rowId: t.rowId, holding, shares: t.beforeList + t.attributed }];
    // the purchases it sold that a broker's list, taken in on or after the sale's day, still states under their date
    const restated = t.from.filter((f) => {
      const bought = rowAsItStands(record, f.rowId);
      return bought != null && !(bought.byAnswer && bought.inListOf) && inForce.some((x) => x.accountId === accountId && x.holding === holding && x.kind === 'PURCHASE' && x.source !== 'typed' && x.stillHeldOn != null
        && sale.date != null && x.stillHeldOn >= sale.date && x.date === bought.date && x.rowId !== bought.rowId);
    }).reduce((n, f) => n + f.shares, 0);
    return restated > EPS ? [{ rowId: t.rowId, holding, shares: restated }] : [];
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
 *  file or the person gave (a gap the account holder already answered "mine is correct" for is not flagged again): the holding, the two counts, and the gap. The record is counted as of the day those
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
  // a gap the account holder already answered "mine is correct" for, about this holding, is not flagged again
  const answeredGaps = new Map<string, number[]>();
  for (const r of rowsInForce(record)) if (r.kind === 'FACT' && r.source === 'typed' && r.accountId === accountId && r.holding && typeof r.facts?.keepsOverList === 'string') {
    const gap = Number((r.facts.keepsOverList as string).split('|').pop());
    if (Number.isFinite(gap)) answeredGaps.set(r.holding, [...(answeredGaps.get(r.holding) ?? []), gap]);
  }
  return names.map((holding) => {
    const onRecord = sharesOnRecord(record, accountId, holding, now.date), says = stated.get(holding) ?? 0;
    return { holding, onRecord, stated: says, gap: says - onRecord };
  }).filter((x) => Math.abs(x.gap) > EPS && !(answeredGaps.get(x.holding) ?? []).some((g) => sameShares(g, x.gap)));
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
   *  on a date up to five days away · ratio: a split re-sent with another ratio · taken-away: the account holder took
   *  this event away. */
  why: 'price' | 'date' | 'ratio' | 'taken-away';
  /** The pair in one line, so the answer is remembered for exactly this pair. */
  key: string;
  /** The past sales whose gain "theirs" would move, each with both figures — shown with the question. */
  salesMoved?: { saleRowId: string; was: number | null; will: number | null }[];
}

const NEARBY_DAYS = 5;

/** True where the account holder already answered a question about a broker's list that set this purchase against a
 *  tax lot of this date — either answer settles the same difference when the broker's history then sends it. */
function listAnswered(record: readonly AssetRow[], onRecord: AssetRow, day: string): boolean {
  if (onRecord.kind !== 'PURCHASE') return false;
  const first = firstRowOf(record), id = first(onRecord.rowId)?.rowId ?? onRecord.rowId;
  return record.some((r) => r.kind === 'FACT' && r.source === 'typed' && r.accountId === onRecord.accountId && r.holding === onRecord.holding
    && typeof r.facts?.keepsOverList === 'string' && (() => { const [, ids, dates] = (r.facts?.keepsOverList as string).split('|'); return ids.split(',').includes(id) && dates.split(',').includes(day); })());
}
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
  // a purchase on record with no date is the same purchase as an arriving one of the same shares and the same price
  // (his case, 2026-11-11: 30 typed at $90 with no date, the broker's 30 at $90 of Dec 1 — one purchase, a question)
  const undatedTwin = (x: AssetRow) => x.date == null && x.kind === 'PURCHASE' && r.kind === 'PURCHASE' && x.price != null && sameNumber(x.price, r.price);
  return rows.filter((x) => !claimed.has(x.rowId) && x.accountId === r.accountId && x.kind === r.kind && x.holding === H
    && (x.date != null ? daysFromOneDateToAnother(x.date, day) <= NEARBY_DAYS : undatedTwin(x))
    && sameNumber(x.shares, shares) && (shares != null || sameNumber(x.amount, r.amount))
    && (x.toAccountId ?? null) === (r.toAccountId ?? null) && !!x.arrives === !!r.arrives)
    .sort((a, b) => (a.date == null ? 99 : daysFromOneDateToAnother(a.date, day)) - (b.date == null ? 99 : daysFromOneDateToAnother(b.date, day)));
}

/** AN EVENT THAT ARRIVES AND DIFFERS FROM WHAT THE RECORD HOLDS — a question for the account holder, never saved
 *  beside the other (his ruling, 2026-11-11: in every difference the account holder is asked which is correct): what
 *  sortArriving says to ask, for the same rows. A purchase typed as Jul 29 and the broker's of Jul 30 are one
 *  purchase and a question, not two purchases. A pair already answered is not returned. */
export function eventsThatDiffer(record: readonly AssetRow[], rows: readonly NewRow[]): EventQuestion[] {
  return sortArriving(record, rows).ask;
}

/** The past sales an answer of "theirs" would move, each with what it made now and what it would make. */
export function salesMovedBy(record: readonly AssetRow[], q: EventQuestion): { saleRowId: string; was: number | null; will: number | null }[] {
  if (q.onRecord.kind !== 'PURCHASE' || q.onRecord.holding == null) return [];
  const after = addRows(record, answerEventQuestion(q, 'theirs', record), '9999-12-31T00:00:00.000Z');
  return rowsInForce(record).filter((r) => r.kind === 'SALE' && r.accountId === q.onRecord.accountId && r.holding === q.onRecord.holding)
    .map((r) => ({ saleRowId: r.rowId, was: saleGain(record, r.rowId), will: saleGain(after, r.rowId) })).filter((x) => !sameNumber(x.was, x.will));
}

/** THE ACCOUNT HOLDER'S ANSWER ABOUT AN ARRIVING EVENT, as rows to save.
 *  "theirs": the event on record takes the arriving event's date, price and amount — one event, saved as the account
 *  holder's own confirmed change, and the same delivery never asks again. Given the record, a purchase's tax lot from
 *  the broker's list under the same date takes the same date and price too.
 *  "mine": nothing changes, and the arriving event is left out from now on without asking.
 *  "both": they are two different events; the arriving one is saved beside the other.
 *  Given the record, the question is first asked again of it as it stands: an answer saved twice changes nothing more. */
export function answerEventQuestion(asked: EventQuestion, answer: 'theirs' | 'mine' | 'both', record: readonly AssetRow[] = []): NewRow[] {
  // given the record, the question is asked again of it as it stands: already answered, or settled since, nothing changes
  const without = record.filter((r) => !(r.kind === 'FACT' && r.facts?.eventPair === asked.key));
  // "mine" after "theirs": the figures the account holder had before are put back
  const before = eventAnswers(record).get(asked.key);
  if (record.length && answer === 'mine' && before === 'theirs') {
    const now = rowAsItStands(record, asked.onRecord.rowId);
    if (now) {
      const { rowId: _n, writtenAt: _w, ...rest } = now;
      return [{ ...rest, date: asked.onRecord.date, price: asked.onRecord.price, amount: asked.onRecord.amount, ...(asked.onRecord.ratio != null ? { ratio: asked.onRecord.ratio } : {}),
        source: 'typed', replacesRowId: now.rowId, changed: ['date', 'price', 'ratio'] },
        { accountId: asked.onRecord.accountId, holding: asked.onRecord.holding, kind: 'FACT', date: null, source: 'typed', facts: { eventPair: asked.key, eventAnswer: 'mine' } }];
    }
  }
  const q = record.length ? sortArriving(without, [asked.arriving]).ask.find((x) => x.key === asked.key) : asked;
  if (!q) return [];
  const remember: NewRow = { accountId: q.onRecord.accountId, holding: q.onRecord.holding, kind: 'FACT', date: null, source: 'typed', facts: { eventPair: q.key, eventAnswer: answer } };
  // "mine" on a purchase also stands against the broker's list stating that purchase under the arriving date
  if (answer === 'mine') return [q.onRecord.kind === 'PURCHASE' && dayOrNull(q.arriving.date) != null
    ? { ...remember, facts: { ...remember.facts, keepsDateOverList: `${q.key.split('|')[0]}|${dayOrNull(q.arriving.date)}`,
      ...(q.why === 'price' ? { keepsPriceOverList: `${dayOrNull(q.arriving.date)}|${Math.abs(q.arriving.shares ?? 0)}@${q.arriving.price}` } : {}) } } : remember];
  if (answer === 'both' || q.why === 'taken-away') return [{ ...remember, facts: { eventPair: q.key, eventAnswer: 'both' } }, q.arriving];   // an event taken away comes back only on the account holder's word
  const { rowId: _n, writtenAt: _w, dateAsGiven: _d, ...rest } = q.onRecord;
  return [{ ...rest, removed: undefined, date: q.arriving.date, settlementDate: q.arriving.settlementDate ?? rest.settlementDate ?? null, price: q.arriving.price ?? rest.price,
    amount: q.arriving.amount ?? rest.amount, fee: q.arriving.fee ?? rest.fee, ...(q.arriving.ratio != null ? { ratio: q.arriving.ratio } : {}),
    ...(q.arriving.ref ? { ref: q.arriving.ref } : {}), source: 'typed', replacesRowId: q.onRecord.rowId, changed: ['date', 'price', 'settlementDate', 'ratio'] }, remember,
    // the broker's tax lot that holds those shares, under the same date, takes the same date and price, so every screen agrees
    ...(q.onRecord.kind === 'PURCHASE' ? rowsInForce(record).filter((x) => x.rowId !== q.onRecord.rowId && x.kind === 'PURCHASE' && x.accountId === q.onRecord.accountId
      && x.holding === q.onRecord.holding && x.stillHeldOn != null && x.source !== 'typed' && !x.inListOf && x.date === q.onRecord.date
      && (q.onRecord.shares == null || (x.shares ?? 0) <= (q.onRecord.shares ?? 0) + EPS)).map((x): NewRow => {
        const { rowId: _x, writtenAt: _y, ...lot } = x;
        return { ...lot, date: q.arriving.date, price: q.arriving.price ?? lot.price, amount: q.arriving.price != null && lot.shares != null ? lot.shares * q.arriving.price : lot.amount,
          source: 'typed', replacesRowId: x.rowId, changed: ['date', 'price'] };
      }) : [])];
}

const sameShares = (a: number, b: number) => Math.abs(a - b) <= EPS;

/** A difference between a broker's or a file's list and the purchases on record that no transaction explains. The
 *  app changes nothing; the account holder is asked which is correct (his ruling, 2026-11-11). One question for
 *  each difference: a list can return more than one for a holding (a purchase restated, a price, the rest). */
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
  /** Everything the list stated for the holding, and its day: an answer re-asks the question against the record as it
   *  stands when the account holder answers, so a question a later transaction settled, or one already answered, changes
   *  nothing. */
  listedAll: ListedPurchase[];
  listDay: string | null;
  source: RowSource;
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
  const first: ListedPurchase[] = [];
  for (const l of listed) {                                          // the same date, shares and price first
    const i = pool.findIndex((p) => under(p, l) && sameShares(p.shares, l.shares) && (p.price == null || l.price == null || sameNumber(p.price, l.price)));
    if (i >= 0) held.push({ p: pool.splice(i, 1)[0], l }); else first.push(l);
  }
  for (const l of first) {
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
 *      list adds tax lots dated AFTER the last list taken in — or a purchase the broker's history holds, dated on that
 *      list's own day: those are new purchases. On a FIRST list over purchases already on record, a tax lot the record
 *      does not hold is a question, never added.
 *   5. A purchase on record has no price and the list gives one: the price is taken.
 *  IN EVERY OTHER CASE NOTHING CHANGES AND A QUESTION IS RETURNED FOR THE ACCOUNT HOLDER: one for each purchase the
 *  list states under another date, with other shares or at another price; one for whatever else differs (a purchase
 *  the list does not state, a tax lot the record does not hold, a purchase the account holder took away); one where
 *  a broker's average states another number of shares. A purchase the account holder entered themselves that the
 *  list does not state is asked about on its own and holds back nothing else. A difference already answered "mine
 *  is correct" is not asked again — also after a sale or a purchase that moves both sides alike. A difference the same
 *  update's history already asks about (`askedAlready`, the questions sortArriving returned) is not asked twice. */
export function purchasesFromList(
  record: readonly AssetRow[], accountId: string, holding: string, listed: readonly ListedPurchase[], source: RowSource, listDay: string | null,
  askedAlready: readonly EventQuestion[] = [], includeAnswered = false,
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
    ask.push({ accountId, holding: H, kind, onRecord, sharesOnRecord: sharesOnRec, listed: states, sharesListed, listedAll: [...listed], listDay, source,
      signature: signature ?? `${kind === 'typed' || kind === 'not-listed' ? 'list' : kind}|${onRecord.map((p) => p.firstRowId).sort().join(',')}|${states.map((l) => l.date ?? '').sort().join(',')}|${sharesListed - sharesOnRec}` });
  };
  const keptMine = new Set(rowsInForce(record).filter((r) => r.kind === 'FACT' && r.accountId === accountId && r.holding === H && r.source === 'typed')
    .map((r) => r.facts?.keepsOverList).filter((x): x is string => typeof x === 'string'));
  if (includeAnswered) keptMine.clear();
  const done = () => ({ rows, ask: ask.filter((q) => !keptMine.has(q.signature)) });
  const onRecordAlready = sharesOnRecord(record, accountId, H);
  if (askedAlready.some((q) => q.why === 'ratio' && q.onRecord.holding === H)) return { rows: [], ask: [] };
  // every purchase the record holds for the holding that holds, or held, shares
  const everything = rowsInForce(record).filter((r) => r.accountId === accountId && r.holding === H && r.kind === 'PURCHASE' && !r.inListOf);
  const everHeld = everything.length > 0 || open.length > 0;
  const tookAway = (l: ListedPurchase) => record.some((r) => r.removed && !r.byAnswer && r.source === 'typed' && r.kind === 'PURCHASE' && r.accountId === accountId
    && r.holding === H && r.date === dayOrNull(l.date));
  const last = lastListDay(record, accountId, H);
  // sales still waiting for the account holder to say which tax lot they sold: while the shares on record (those sales
  // counted as sold) agree with the list, the difference is that question, not a question about the list
  const waitingForAnAnswer = sharesTakenBy(record, accountId, H).reduce((n, t) => n + t.unassigned, 0);
  if (waitingForAnAnswer > EPS && sameShares(onRecordAlready, valid.reduce((t, l) => t + l.shares, 0))) return done();

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
      if (row.source === 'typed' && !rowsInForce(record).some((x) => x.kind === 'FACT' && x.accountId === accountId && x.holding === H && x.facts?.listedPriceOf === `${p.firstRowId}@${l.price}`)
        && !(firstRowOf(record)(row.rowId)?.source !== 'typed')) {
        // the broker's list states a price for a purchase the account holder entered: kept, so a later change by the
        // account holder is set against it
        rows.push({ accountId, holding: H, kind: 'FACT', date: null, source, facts: { listedPriceOf: `${p.firstRowId}@${l.price}`, listedPrice: l.price / p.splitBy * p.splitBy } });
      }
      if (row.price == null && row.source !== 'typed') {             // case 5: a price the record lacks
        const { rowId: _n, writtenAt: _w, ...rest } = row;
        rows.push({ ...rest, price: l.price * p.splitBy, amount: (row.shares ?? 0) * l.price * p.splitBy, source, replacesRowId: row.rowId });
      } else if (p.price != null && !sameNumber(p.price, l.price)) {
        // over a price the account holder typed, the list is set against what the broker last gave: a new figure is asked
        const firstOf = firstRowOf(record), began = firstOf(row.rowId)?.rowId;
        const lastGiven = row.source === 'typed' ? [...record].reverse().find((v) => (firstOf(v.rowId)?.rowId ?? v.rowId) === began && v.source !== 'typed' && !v.removed) : row;
        const statedFact = [...rowsInForce(record)].reverse().find((x) => x.kind === 'FACT' && x.accountId === accountId && x.holding === H && typeof x.facts?.listedPriceOf === 'string'
          && (x.facts.listedPriceOf as string).startsWith(`${p.firstRowId}@`));
        const brokersWas = lastGiven?.price != null ? lastGiven.price / p.splitBy : statedFact ? Number((statedFact.facts?.listedPriceOf as string).split('@')[1]) : null;
        if (row.source !== 'typed' || (brokersWas != null && !sameNumber(brokersWas, l.price))) priceDiffers.push({ p, l });
      }
    }
    // a difference this update's history already asks about is not asked a second time
    // (the same purchase: the same holding, date and shares; the history and the list number it apart) — and a price the
    // account holder already kept against the broker's for that purchase is not asked again
    const purchaseOf = (date: string | null, shares: number | null) => `${date ?? ''}|${shares ?? ''}`;
    const askedFor = new Set(askedAlready.filter((q) => q.onRecord.holding === H).map((q) => purchaseOf(dayOrNull(q.arriving.date), q.arriving.shares == null ? null : Math.abs(q.arriving.shares))));
    const askedAt = new Set(askedAlready.filter((q) => q.onRecord.holding === H && q.onRecord.kind === 'PURCHASE').map((q) => `${dayOrNull(q.arriving.date) ?? ''}@${q.arriving.price ?? ''}`));
    const keptPrices = new Set(rowsInForce(record).filter((r) => r.kind === 'FACT' && r.source === 'typed' && r.accountId === accountId && r.holding === H
      && typeof r.facts?.keepsPriceOverList === 'string').map((r) => r.facts?.keepsPriceOverList as string));
    for (let i = priceDiffers.length - 1; i >= 0; i--) {
      const d = priceDiffers[i], at = purchaseOf(d.l.date, d.l.shares);
      if (askedFor.has(at) || askedAt.has(`${d.l.date ?? ''}@${d.l.price ?? ''}`) || keptPrices.has(`${at}@${d.l.price}`)) priceDiffers.splice(i, 1);
    }
    const pairSignature = (d: { p: OpenPurchase; l: ListedPurchase }) => `pair|${d.p.firstRowId}|${d.l.date ?? ''}|${d.l.shares - d.p.shares}`;
    const keptDates = new Set(rowsInForce(record).filter((r) => r.kind === 'FACT' && r.accountId === accountId && r.holding === H && r.source === 'typed')
      .map((r) => r.facts?.keepsDateOverList).filter((x): x is string => typeof x === 'string'));
    // a sale dated on or before the day a tax lot was listed could not be placed against that list (the list may or may
    // not have counted it); where this list now states the lot smaller by exactly those shares, the sales explain it:
    // the lot is read as held up to the day before the earliest of them
    const waiting = sharesTakenBy(record, accountId, H).filter((t) => t.beforeList + t.attributed > EPS).map((t) => ({ ...t, beforeList: t.beforeList + t.attributed }));
    const explained = differ.filter((d) => {
      const row = rowAsItStands(record, d.p.rowId);
      if (!row || row.source === 'typed' || d.p.stillHeldOn == null || d.p.movedInBy != null) return false;
      const listTakenIn = instantOf(row.writtenAt);
      const firstOfRow = firstRowOf(record);
      const dated = waiting.map((t) => ({ t, day: rowAsItStands(record, t.rowId)?.date ?? null, saved: instantOf((firstOfRow(t.rowId) ?? rowAsItStands(record, t.rowId) as AssetRow).writtenAt) }))
        .filter((x) => x.day != null && (x.day as string) <= (d.p.stillHeldOn as string) && x.saved > listTakenIn);
      const sold = dated.reduce((n, x) => n + x.t.beforeList, 0);
      return sold > EPS && sameShares(d.p.shares - d.l.shares, sold);
    });
    for (const d of explained) {
      const row = rowAsItStands(record, d.p.rowId) as AssetRow;
      const { rowId: _n, writtenAt: _w, ...rest } = row;
      // the lot is read as held up to the day before the earliest of the sales that explain the change
      const earliest = waiting.map((t) => rowAsItStands(record, t.rowId)?.date ?? null).filter((x): x is string => x != null && x <= (d.p.stillHeldOn as string))
        .reduce((a, b) => (a < b ? a : b));
      const before = new Date(Date.parse(earliest) - 86400000).toISOString().slice(0, 10);
      rows.push({ ...rest, stillHeldOn: before, source, replacesRowId: row.rowId });
    }
    const unansweredPairs = differ.filter((d) => !explained.includes(d) && !keptMine.has(pairSignature(d))
      && !(keptDates.has(`${d.p.firstRowId}|${dayOrNull(d.l.date)}`) && sameShares(d.p.shares, d.l.shares)));
    const unanswered = unansweredPairs;
    // a purchase on record and a listed tax lot of the same shares that this update's history already asks about, or
    // that the account holder already answered "mine is correct" for under that date, are that question — set aside
    const askedRoots = new Map<string, string | null>(askedAlready.filter((q) => q.onRecord.holding === H && q.onRecord.kind === 'PURCHASE')
      .map((q) => [firstRowOf(record)(q.onRecord.rowId)?.rowId ?? q.onRecord.rowId, dayOrNull(q.arriving.date)]));
    const setAside = (p: OpenPurchase, l: ListedPurchase) => sameShares(p.shares, l.shares)
      && ((askedRoots.has(p.firstRowId) && askedRoots.get(p.firstRowId) === dayOrNull(l.date)) || keptDates.has(`${p.firstRowId}|${dayOrNull(l.date)}`));
    for (let i = notListed.length - 1; i >= 0; i--) {
      const j = notHeld.findIndex((l) => setAside(notListed[i], l));
      if (j >= 0) { notHeld.splice(j, 1); notListed.splice(i, 1); }
    }
    for (let i = unansweredPairs.length - 1; i >= 0; i--) if (askedRoots.has(unansweredPairs[i].p.firstRowId)) unansweredPairs.splice(i, 1);
    const own = notListed.filter((p) => p.ownEntry && p.source === 'typed');            // entered by the account holder themselves
    const rest = notListed.filter((p) => !own.includes(p));
    // fix 3: a purchase in the history dated on the last list's own day, which this list now states, is that purchase
    const fromHistory = (l: ListedPurchase) => {
      const d = dayOrNull(l.date);
      return d != null && rowsInForce(record).some((r) => r.accountId === accountId && r.holding === H && r.kind === 'PURCHASE' && r.inListOf === d && r.date === d
        && r.source !== 'typed' && sameShares(r.shares ?? 0, l.shares));
    };
    // a listed tax lot is a NEW purchase only where a list was taken in before and it is dated after that list, or the
    // history holds it — never on a first list over purchases already on record (that is a question)
    const isLater = (l: ListedPurchase) => { const d = dayOrNull(l.date); return d != null && !tookAway(l) && ((last != null && d > last) || fromHistory(l)); };
    if (!everHeld && !notHeld.some(tookAway)) rows.push(...notHeld.map(asRow));                                                // case 1
    else if (!differ.length && !own.length && rest.length && notHeld.length && !notHeld.some(tookAway)
      && rest.every((p) => p.averageOnly && p.source !== 'typed' && p.movedInBy == null)) {                                      // case 3
      rows.push(...rest.map((p) => replacedPurchase(record, p, source)).filter((r): r is NewRow => r != null), ...notHeld.map(asRow));
    } else {
      for (const d of unanswered) question(d.p.source === 'typed' ? 'typed' : 'not-listed', [d.p], [d.l], pairSignature(d));
      // case 4 — but never over a purchase the account holder entered themselves before any list was taken in:
      // then the whole difference is one question
      if (!rest.length && notHeld.every(isLater) && (last != null || !own.length)) {
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
    else if (line.price != null) {
      // the same shares at another average price: set against the average this broker last STATED for the holding (each
      // new figure is kept as a fact); with none stated before, it is kept and nothing is asked — the purchases' own prices stand
      const stated = [...rowsInForce(record)].reverse().find((r) => r.kind === 'FACT' && r.accountId === accountId && r.holding === H && r.source !== 'typed'
        && typeof r.facts?.averageStated === 'number');
      const lastAverage = [...record].reverse().find((r) => r.kind === 'PURCHASE' && r.accountId === accountId && r.holding === H && r.averageOnly && r.source !== 'typed' && !r.byAnswer);
      // only with the same number of shares as when it was last stated: a purchase or a sale since moves an average by itself
      const statedShares = stated ? (stated.facts?.averageShares as number | undefined) : lastAverage?.shares ?? undefined;
      const wasPrice = stated ? (stated.facts?.averageStated as number) : lastAverage?.price ?? null;
      const restate = { accountId, holding: H, kind: 'FACT' as const, date: null, source, facts: { averageStated: line.price, averageShares: shares } };
      if (wasPrice == null || statedShares == null || !sameShares(statedShares, shares)) { if (wasPrice == null || !sameNumber(wasPrice, line.price)) rows.push(restate); }
      else if (Math.abs(wasPrice - line.price) >= 0.005) question('price', open, [line], `price|average|${shares}@${line.price}`);
    }
  }
  return done();
}

/** THE ACCOUNT HOLDER'S ANSWER TO A LIST QUESTION, as rows to save.
 *  "The list is correct": what the list states takes the place of the purchases in question. Each of those keeps
 *  the shares already sold from it, so each earlier sale keeps what it made; the shares the list no longer states
 *  are kept to show, counted as held no more, so a sale that arrives later and explains them still says what it made.
 *  Shares that had arrived from outside the record give way to the tax lots that now state them.
 *  "Mine is correct": nothing changes, and the answer is kept so the same difference is not asked again.
 *  The question is first asked again of the record as it stands: where a transaction saved since settled it, or the same
 *  answer was already saved, the answer changes nothing. */
export function answerListQuestion(record: readonly AssetRow[], asked: ListQuestion, listIsCorrect: boolean, source: RowSource, listDay: string | null): NewRow[] {
  // the question is asked again of the record as it stands now: settled since, or already answered, nothing changes
  // (an answer already given may be changed: "mine" first, "the list is correct" later)
  const q = purchasesFromList(record, asked.accountId, asked.holding, asked.listedAll ?? asked.listed, asked.source ?? source, asked.listDay ?? listDay, [], listIsCorrect).ask
    .find((x) => x.signature === asked.signature);
  if (!q) return [];
  if (!listIsCorrect) return [{ accountId: q.accountId, holding: q.holding, kind: 'FACT', date: null, source: 'typed', facts: { keepsOverList: q.signature } }];
  const stillHeldOn = dayOrNull(listDay);
  const out: NewRow[] = [];
  // the sales still waiting for shares as the account holder answers (asked which tax lot, before the list, beyond it)
  const waitingSales = sharesTakenBy(record, q.accountId, q.holding).filter((t) => t.unassigned > EPS || t.beyond > EPS || t.beforeList > EPS)
    .map((t) => firstRowOf(record)(t.rowId)?.rowId ?? t.rowId);
  if (q.kind === 'count' && q.onRecord.some((p) => !p.averageOnly)) {
    // the broker states another number of shares and gives only an average: nothing is averaged. The dated purchases
    // stand; the shares the broker states beyond them are one line with no date and no price (the account holder can
    // fill in its cost); shares it states fewer of are taken from the oldest purchase first and kept to show.
    const gapShares = q.sharesListed - q.sharesOnRecord;
    if (gapShares > EPS) {
      out.push({ accountId: q.accountId, holding: q.holding, kind: 'PURCHASE', date: null, shares: gapShares, price: null, amount: null, source,
        averageOnly: true, byAnswer: true, ...(stillHeldOn ? { stillHeldOn } : {}) });
      return out;
    }
    let less = -gapShares;
    const raisedByHand = (p: OpenPurchase) => { const row = rowAsItStands(record, p.rowId); return row?.source === 'typed' && !p.ownEntry ? 0 : 1; };
    for (const p of [...q.onRecord].sort((a, b) => raisedByHand(a) - raisedByHand(b) || oldestLotFirst(a, b))) {
      if (less <= EPS) break;
      const row = rowAsItStands(record, p.rowId);
      if (!row || p.movedInBy != null) continue;
      const take = Math.min(p.shares, less); less -= take;
      const { rowId: _n, writtenAt: _w, ...rest } = row;
      const keep = (p.shares - take) / p.splitBy, sold = (row.shares ?? 0) - p.shares / p.splitBy;
      const stays = keep + sold;
      out.push(stays > EPS ? { ...rest, shares: stays, amount: row.price != null ? stays * row.price : null, source: 'typed', replacesRowId: row.rowId, byAnswer: true }
        : { ...rest, source: 'typed', replacesRowId: row.rowId, removed: true, byAnswer: true });
      if (stillHeldOn) out.push({ accountId: q.accountId, holding: q.holding, kind: 'PURCHASE', date: row.date, shares: take / p.splitBy, price: row.price ?? null,
        amount: row.price != null ? (take / p.splitBy) * row.price : null, source: 'typed', inListOf: stillHeldOn, byAnswer: true, ...(waitingSales.length ? { forSales: waitingSales } : {}) });
    }
    return out;
  }
  if (q.kind === 'price' && q.listed.length === 1 && q.listed[0].average) {
    const l = q.listed[0];
    for (const p of q.onRecord.filter((x) => x.averageOnly && x.source !== 'typed')) {
      const row = rowAsItStands(record, p.rowId);
      if (!row || l.price == null) continue;
      const { rowId: _n, writtenAt: _w, ...rest } = row;
      out.push({ ...rest, price: l.price * p.splitBy, amount: (row.shares ?? 0) * l.price * p.splitBy, source: 'typed', replacesRowId: row.rowId, byAnswer: true });
    }
    // over dated purchases the broker's average is not a purchase price: the answer is kept, and nothing is averaged
    return [...out, { accountId: q.accountId, holding: q.holding, kind: 'FACT', date: null, source: 'typed', facts: { keepsOverList: q.signature } },
      { accountId: q.accountId, holding: q.holding, kind: 'FACT', date: null, source: q.source, facts: { averageStated: l.price, averageShares: l.shares } }];
  }
  if (q.kind === 'price') {
    q.onRecord.forEach((p, i) => {
      const row = rowAsItStands(record, p.rowId), l = q.listed[i];
      if (!row || !l || l.price == null) return;
      const { rowId: _n, writtenAt: _w, ...rest } = row;
      out.push({ ...rest, price: l.price * p.splitBy, amount: (row.shares ?? 0) * l.price * p.splitBy, source: 'typed', replacesRowId: row.rowId, changed: ['price'] });
    });
    return out;
  }
  // the shares the list no longer states at all — the gap, taken from the oldest purchase first; a purchase the list
  // restates under another date or price gives up nothing to show
  let gap = Math.max(0, q.sharesOnRecord - q.sharesListed);
  const goneOf = new Map<OpenPurchase, number>();
  for (const p of [...q.onRecord].sort(oldestLotFirst)) { const g = Math.min(p.shares, gap); goneOf.set(p, g); gap -= g; }
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
    const gone = (goneOf.get(p) ?? 0) / p.splitBy;                   // shares the list no longer states: kept to show
    if (gone > EPS && stillHeldOn) out.push({ accountId: q.accountId, holding: q.holding, kind: 'PURCHASE', date: row.date, shares: gone, price: row.price ?? null,
      amount: row.price != null ? gone * row.price : null, source: 'typed', inListOf: stillHeldOn, byAnswer: true, ...(waitingSales.length ? { forSales: waitingSales } : {}) });
  }
  // each tax lot the list states for a purchase on record says which purchase it stands for, so the activity shows that
  // purchase once, as it was bought
  const standsFor = (l: ListedPurchase): string | undefined => {
    const d = dayOrNull(l.date);
    const p = q.onRecord.find((x) => x.movedInBy == null && d != null && (x.date === d || x.firstDate === d)) ?? (q.onRecord.length === 1 && q.listed.length === 1 ? q.onRecord[0] : undefined);
    return p?.firstRowId;
  };
  out.push(...q.listed.map((l): NewRow => ({ accountId: q.accountId, holding: q.holding, kind: 'PURCHASE', date: l.date, shares: l.shares, price: l.price, source,
    amount: l.price != null ? l.shares * l.price : null, ...(stillHeldOn ? { stillHeldOn } : {}), ...(l.average ? { averageOnly: true } : {}),
    ...(standsFor(l) ? { standsFor: standsFor(l) } : {}) })));
  return out;
}

/** WHERE WHAT THE ACCOUNT HOLDER IS ABOUT TO ENTER DIFFERS FROM WHAT A BROKER OR A FILE GAVE: each figure, as given
 *  and as entered — for the confirmation the account holder sees before the change is saved (his words, 2026-11-11:
 *  "The information from Robinhood indicates price of 350, you entered 320. Confirm changing price for 100 shares
 *  of MSFT to 320."). The figure "given" is the one a broker or a file last gave for that field, even where the account
 *  holder has since typed over another field of the row; `shares` is what the purchase holds now. An empty list means
 *  nothing differs, or the row was the account holder's own entry from the start. */
export function differsFromGiven(record: readonly AssetRow[], rowId: string, change: Partial<Pick<NewRow, 'date' | 'price' | 'shares' | 'amount'>>):
{ field: 'date' | 'price' | 'shares' | 'amount' | 'saleGain' | 'sharesHeld'; given: string | number | null; entered: string | number | null; holding: string | null; shares: number | null; saleRowId?: string }[] {
  const now = rowAsItStands(record, rowId);
  if (!now) return [];
  // every version of the row, oldest first; the figure each field was last given by a broker or a file
  const first = firstRowOf(record), began = first(now.rowId)?.rowId;
  const versions = record.filter((r) => (first(r.rowId)?.rowId ?? r.rowId) === began && !r.removed);
  let given = [...versions].reverse().find((r) => r.source !== 'typed');
  if (!given && now.kind === 'PURCHASE') {
    // the account holder's own entry that a broker's list later stated a price for: that price is the broker's figure
    const stated = [...rowsInForce(record)].reverse().find((x) => x.kind === 'FACT' && x.accountId === now.accountId && x.holding === now.holding && typeof x.facts?.listedPriceOf === 'string'
      && (x.facts.listedPriceOf as string).startsWith(`${began}@`));
    if (stated) given = { ...now, price: Number((stated.facts?.listedPriceOf as string).split('@')[1]) * splitByOf(record, now) };
  }
  if (!given) return [];                                               // the account holder's own entry: nothing to confirm
  // a purchase is shown in its figures after every split since; the confirmation uses the same figures
  const split = now.kind === 'PURCHASE' && now.holding != null ? splitByOf(record, now) : 1;
  const shownOf = { date: given.date ?? null, price: given.price == null ? null : given.price / split, shares: given.shares == null ? null : given.shares * split, amount: given.amount ?? null };
  const lot = now.kind === 'PURCHASE' && now.holding != null ? openPurchases(record, now.accountId, now.holding).find((p) => p.firstRowId === began) : undefined;
  const heldNow = lot?.shares ?? (now.shares == null ? null : now.shares * split);
  const out: { field: 'date' | 'price' | 'shares' | 'amount' | 'saleGain' | 'sharesHeld'; given: string | number | null; entered: string | number | null; holding: string | null; shares: number | null; saleRowId?: string }[] =
    (['date', 'price', 'shares', 'amount'] as const).filter((f) => f in change)
    .map((f) => ({ field: f, given: shownOf[f] as string | number | null, entered: (change[f] ?? null) as string | number | null, holding: now.holding, shares: heldNow }))
    .filter((d) => (typeof d.given === 'number' && typeof d.entered === 'number' ? Math.abs(d.given - d.entered) > EPS : d.given !== d.entered));
  // a change to a purchase can move what a past sale made (oldest first): each such sale is named with both figures
  if (now.kind === 'PURCHASE' && now.holding != null && out.length) {
    const after = correctRow(record, rowId, change, 'typed', '9999-12-31T00:00:00.000Z').record;
    for (const sale of rowsInForce(record).filter((r) => r.kind === 'SALE' && r.accountId === now.accountId && r.holding === now.holding)) {
      const was = saleGain(record, sale.rowId), will = saleGain(after, sale.rowId);
      if (!sameNumber(was, will)) out.push({ field: 'saleGain', given: was, entered: will, holding: now.holding, shares: sale.shares ?? null, saleRowId: sale.rowId });
    }
    const heldWas = sharesOnRecord(record, now.accountId, now.holding), heldWill = sharesOnRecord(after, now.accountId, now.holding);
    if (!sameNumber(heldWas, heldWill)) out.push({ field: 'sharesHeld', given: heldWas, entered: heldWill, holding: now.holding, shares: heldWill });
  }
  return out;
}

/** How many shares each first share of a purchase has become through the splits since it was bought. */
function splitByOf(record: readonly AssetRow[], row: AssetRow): number {
  const first = firstRowOf(record), began = first(row.rowId)?.rowId ?? row.rowId;
  const lot = walkHolding(record, row.holding as string).lots.find((p) => p.firstRowId === began && p.movedInBy == null)
    ?? walkHolding(record, row.holding as string).lots.find((p) => p.firstRowId === began);
  return lot?.splitBy ?? 1;
}

// ── corrections ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Correct a row. The old row stays in the record; a new row carrying the change names it, and whatever named the
 *  old row follows. A person's own change is saved as typed. REFUSED, with the record left as it was: a change to a
 *  row that does not exist or was taken away; a change by a sync or a file to a row the person typed; a date that
 *  cannot be read as a day; a new date on a value row (values for another day are saved as that day's own rows). A
 *  purchase's shares and price are entered as the screen shows them after every split since. */
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
  // a purchase's shares and price are entered as the screen shows them, after every split since; they are saved as bought
  const split = old.kind === 'PURCHASE' && old.holding != null && ('price' in change || 'shares' in change) ? splitByOf(record, old) : 1;
  const asBought: Partial<NewRow> = { ...change };
  if (split !== 1 && typeof change.price === 'number') asBought.price = change.price * split;
  if (split !== 1 && typeof change.shares === 'number') asBought.shares = change.shares / split;
  const next: NewRow = { ...rest, ...asBought, source, replacesRowId: old.rowId };
  if (source === 'typed') {
    // the account holder's own correction: it is not an answer's row, and it says which figures the account holder changed
    delete next.byAnswer; delete next.standsFor; delete next.forSales;
    next.changed = Object.keys(change).filter((k) => k !== 'removed');
  }
  if ('date' in change) delete next.dateAsGiven;
  if ('settlementDate' in change) delete next.settlementDateAsGiven;
  const twins: NewRow[] = [];
  if (source === 'typed' && old.kind === 'PURCHASE' && !('removed' in change) && ('price' in change || 'date' in change)) {
    const firstOf = firstRowOf(record), mine = firstOf(old.rowId)?.rowId;
    const isLot = (x: AssetRow) => x.stillHeldOn != null && !x.inListOf, isHistory = (x: AssetRow) => x.inListOf != null && !x.byAnswer;
    for (const x of rowsInForce(record)) {
      if (x.kind !== 'PURCHASE' || x.accountId !== old.accountId || x.holding !== old.holding || (firstOf(x.rowId)?.rowId ?? x.rowId) === mine || x.date !== old.date) continue;
      if (!((isLot(old) && isHistory(x)) || (isHistory(old) && isLot(x)))) continue;
      const { rowId: _i, writtenAt: _a, ...twin } = x;
      // the price is entered as the screen shows it; each copy is saved in its own figures (a history row as bought)
      const priceOfTwin = typeof change.price === 'number' ? change.price * splitByOf(record, x) : undefined;
      twins.push({ ...twin, ...('date' in change ? { date: change.date ?? null } : {}),
        ...(priceOfTwin != null ? { price: priceOfTwin, amount: x.shares != null ? x.shares * priceOfTwin : x.amount } : {}),
        source: 'typed', replacesRowId: x.rowId, changed: Object.keys(change).filter((k) => k === 'price' || k === 'date') });
    }
  }
  return { record: addRows(record, [next, ...twins], writtenAt), problem: null };
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

/** How many shares each share became through the splits of one holding in one account dated after `from` and on or
 *  before `to`. */
function splitsBetween(record: readonly AssetRow[], accountId: string, holding: string | null, from: string | null, to: string): number {
  return rowsInForce(record).filter((r) => r.kind === 'SPLIT' && r.accountId === accountId && r.holding === holding && r.date != null && (r.ratio ?? 0) > 0
    && (from == null || r.date > from) && r.date <= to).reduce((f, r) => f * (r.ratio as number), 1);
}

/** The activity of an account: every purchase, sale, dividend, interest payment, deposit, withdrawal, transfer (out
 *  of it or into it), fee, split and unknown word on record, the dated ones oldest first and the undated after them.
 *  EACH PURCHASE IS SHOWN ONCE, AS IT WAS BOUGHT:
 *   · A purchase is every version of one row — its corrections, and the tax lot an answer about a list saved in its
 *     place. It is shown as bought — before any split since — with the account holder's own corrections (date,
 *     price, shares) where there are any, else the largest number of shares the broker or a file gave for it, never a
 *     count an answer left behind. A purchase the account holder took away is not shown.
 *   · A tax lot a broker's list states under the same first date as a purchase the broker's history or the account
 *     holder gave stands for that purchase, and is not shown beside it — unless the broker lists more separate lots
 *     on that date than there are purchases: then each lot is shown (his words, 2026-11-11: "if broker is listing them
 *     as two holding - record them as two, and not one"). A purchase the account holder corrected shows as corrected.
 *   · THE ACTIVITY ADDS UP to the shares on record: where an answer about a list changed the shares with no
 *     transaction behind it, one ADJUSTMENT line (shown only, never saved) says by how many, dated by the list. */
export function activityOf(record: readonly AssetRow[], accountId: string): AssetRow[] {
  const first = firstRowOf(record);
  const rootOf = (r: AssetRow): string => {
    let id = first(r.rowId)?.rowId ?? r.rowId;
    const seen = new Set<string>();
    for (;;) {
      const base = record.find((x) => x.rowId === id);
      const into = base?.standsFor;
      if (!into || seen.has(id)) return id;
      seen.add(id); id = first(into)?.rowId ?? into;
    }
  };
  const inForce = rowsInForce(record);
  const inForceIds = new Set(inForce.map((r) => r.rowId));
  const others = inForce.filter((r) => (r.accountId === accountId || r.toAccountId === accountId) && r.kind !== 'VALUE' && r.kind !== 'FACT' && r.kind !== 'PURCHASE' && !r.restated);
  const lines = new Map<string, AssetRow[]>();
  for (const r of record.filter((x) => x.kind === 'PURCHASE' && x.accountId === accountId)) lines.set(rootOf(r), [...(lines.get(rootOf(r)) ?? []), r]);
  type Line = { show: AssetRow; root: AssetRow; isLot: boolean; corrected: boolean };
  const shownLines: Line[] = [];
  // purchases the account holder took away: their broker's history row of the same date goes with them
  const takenAwayOn = new Set<string>();
  for (const [, versions] of lines) {
    const live = versions.filter((v) => inForceIds.has(v.rowId));
    if (!live.length && versions.some((v) => v.removed && v.source === 'typed' && !v.byAnswer)) versions.forEach((v) => v.date && takenAwayOn.add(`${v.holding}|${v.date}`));
  }
  for (const [rootId, versions] of lines) {
    const root = record.find((x) => x.rowId === rootId) as AssetRow;
    if (root.byAnswer && root.inListOf) continue;                                  // shares an answer kept to show
    if (root.byAnswer && !root.standsFor && !root.replacesRowId) continue;            // shares an answer added: its own adjustment line
    if (versions.some((v) => v.inListOf && !v.byAnswer) && takenAwayOn.has(`${root.holding}|${root.date}`)) continue;
    const live = versions.filter((v) => inForceIds.has(v.rowId));
    if (versions.some((v) => v.removed && v.source === 'typed' && !v.byAnswer && !v.changed?.length) && !live.length) continue;   // taken away by the account holder
    if (!live.length && !versions.some((v) => v.byAnswer)) continue;
    // as given, before any split since; then each correction in turn: the account holder's own (only the figures they
    // changed), an answer's date and price, a list's restatement's date and price — never a count an answer changed
    const asBought = (v: AssetRow) => { const f = v.stillHeldOn ? splitsBetween(record, accountId, v.holding, root.date, v.stillHeldOn) : 1; return { shares: v.shares == null ? null : v.shares / f, price: v.price == null ? null : v.price * f }; };
    let { shares, price } = asBought(root);
    let date = root.date;
    let corrected = false;
    for (const v of versions) {
      if (v === root || v.removed || (v.byAnswer && v.inListOf)) continue;
      const b = asBought(v);
      // a purchase line keeps the count it was given: every later change of count with no transaction behind it — the
      // account holder's own, or an answer's — is its own ADJUSTMENT line below; dates and prices follow the corrections
      if (v.source === 'typed' && v.changed?.length) {
        if (v.changed.includes('date')) date = v.date;
        if (v.changed.includes('price')) price = b.price;
        corrected = true;
      } else if (v.standsFor) { date = v.date; price = b.price ?? price; }
    }
    const current = [...live].reverse()[0] ?? root;
    const lotLike = (v: AssetRow) => v.stillHeldOn != null && v.source !== 'typed' && !v.inListOf;
    if ((lotLike(current) || lotLike(root)) && root.holding != null) {
      // a broker's tax lot shows the shares sales dated before its list sold from it (the list is net of them), as bought
      const ids = new Set(versions.map((v) => first(v.rowId)?.rowId ?? v.rowId));
      const sold = walkHolding(record, root.holding).everyLot.filter((x) => x.accountId === accountId && ids.has(x.firstRowId)).reduce((n, x) => n + x.soldBeforeList, 0);
      if (sold > EPS && shares != null) shares += sold;
    }
    shownLines.push({ show: { ...current, date, price, shares, amount: price != null && shares != null ? shares * price : current.amount }, root,
      isLot: lotLike(root) || lotLike(current), corrected: corrected && root.source !== 'typed' });
  }
  // a lot and a purchase given for one date are one line — unless the broker lists more lots than purchases
  const groupOf = shownLines.map((_, i) => i);
  const top = (i: number): number => (groupOf[i] === i ? i : (groupOf[i] = top(groupOf[i])));
  for (let i = 0; i < shownLines.length; i++) for (let j = i + 1; j < shownLines.length; j++) {
    const a = shownLines[i], b = shownLines[j];
    if (a.root.holding !== b.root.holding) continue;
    const da = [a.root.date, a.show.date].filter(Boolean), db = [b.root.date, b.show.date].filter(Boolean);
    if (da.some((d) => db.includes(d)) || (!da.length && !db.length)) groupOf[top(j)] = top(i);
  }
  const groups = new Map<number, Line[]>();
  shownLines.forEach((l, i) => groups.set(top(i), [...(groups.get(top(i)) ?? []), l]));
  const picked: AssetRow[] = [];
  for (const g of groups.values()) {
    const lots = g.filter((l) => l.isLot), tx = g.filter((l) => !l.isLot);
    const use = lots.length > tx.length || (!tx.length) ? lots : lots.some((l) => l.corrected) && !tx.some((l) => l.corrected) ? lots : tx;
    picked.push(...use.map((l) => l.show));
  }
  const byDate = (a: AssetRow, b: AssetRow) => (a.date && b.date ? (a.date < b.date ? -1 : a.date > b.date ? 1 : Number(a.rowId) - Number(b.rowId))
    : a.date ? -1 : b.date ? 1 : Number(a.rowId) - Number(b.rowId));
  const listed = [...others, ...picked].sort(byDate);
  // THE ACTIVITY ADDS UP: each answer about a list that changed the shares with no transaction behind it is one line,
  // dated by that list; shares the broker states that no purchase on record accounts for are one line of their own
  const holdings = [...new Set(listed.map((r) => r.holding).filter((h): h is string => h != null))];
  const adjustments: AssetRow[] = [];
  for (const h of holdings) {
    const splits = inForce.filter((r) => r.kind === 'SPLIT' && r.accountId === accountId && r.holding === h && r.date != null && (r.ratio ?? 0) > 0);
    const steps = [...listed.filter((x) => x.holding === h && x.kind !== 'SPLIT'), ...splits].sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : (a.date ?? '') > (b.date ?? '') ? 1
      : (a.kind === 'SPLIT' ? -1 : 0) - (b.kind === 'SPLIT' ? -1 : 0)));
    let running = 0;
    for (const r of steps) {
      if (r.kind === 'SPLIT') { running *= r.ratio as number; continue; }
      if (r.kind === 'PURCHASE') running += r.shares ?? 0;
      else if (r.kind === 'SALE' && r.accountId === accountId) running -= r.shares ?? 0;
      else if (r.kind === 'TRANSFER' && r.accountId === accountId && !r.arrives) running -= r.shares ?? 0;
      else if (r.kind === 'TRANSFER' && (r.toAccountId === accountId || (r.arrives && r.accountId === accountId))) running += r.shares ?? 0;
    }
    // each change of count with no transaction behind it — an answer about a list, or the account holder's own
    // correction of a count — in the order they were saved: the shares on record with it and the changes before it,
    // less with the changes before it only (the lines then add up exactly to the shares on record)
    const isChange = (x: AssetRow) => x.accountId === accountId && x.holding === h && (x.byAnswer || (x.source === 'typed' && !!x.changed?.includes('shares')));
    const times = [...new Set(record.filter(isChange).map((x) => x.writtenAt))].sort((a, b) => instantOf(a) - instantOf(b));
    const withChangesUpTo = (i: number) => record.filter((x) => !(x.holding === h && x.accountId === accountId && times.indexOf(x.writtenAt) > i && times.indexOf(x.writtenAt) >= 0
      && record.some((y) => y.writtenAt === x.writtenAt && isChange(y))));
    let byAnswers = 0;
    let heldBefore = sharesOnRecord(withChangesUpTo(-1), accountId, h);
    times.forEach((at, i) => {
      const heldAfter = sharesOnRecord(withChangesUpTo(i), accountId, h);
      const delta = heldAfter - heldBefore;
      heldBefore = heldAfter;
      if (Math.abs(delta) <= EPS) return;
      const batch = record.filter((x) => x.writtenAt === at && x.holding === h);
      const byHolder = batch.some((x) => x.source === 'typed' && x.changed?.includes('shares') && !x.byAnswer);
      const on = byHolder ? null : batch.map((x) => x.inListOf ?? x.stillHeldOn ?? null).filter((d): d is string => d != null).sort().pop() ?? null;
      adjustments.push({ rowId: `adjustment-${h}-${i}`, accountId, holding: h, kind: 'ADJUSTMENT', date: on ?? (byHolder ? at.slice(0, 10) : null), shares: delta, source: 'typed', writtenAt: at,
        word: byHolder ? 'the account holder corrected the count' : 'the account holder accepted the broker\'s list' });
      byAnswers += delta;
    });
    const rest = sharesOnRecord(record, accountId, h) - running - byAnswers;
    if (Math.abs(rest) > EPS) adjustments.push({ rowId: `adjustment-${h}-before`, accountId, holding: h, kind: 'ADJUSTMENT', date: null, shares: rest, source: 'linked', writtenAt: '', word: 'held before the record begins' });
  }
  return [...listed, ...adjustments].sort(byDate);
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
