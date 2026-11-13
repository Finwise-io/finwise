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
import { plural } from '../../../src/domain/_shared/plural';   // the one list of words and plurals (DEC-4082)

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
  /** On a VALUE row from the price feed: the day its price is from, where that is more than seven days before the row's
   *  date (his ruling, 2026-11-11: a stale price is still shown and used, and the screen says it is old). */
  priceDate?: string | null;
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
  /** On the account holder's removal of a purchase that sales had sold from: each such sale (as first saved) and the
   *  shares it took from it. Those shares are asked about — which purchase they came from — never given to another
   *  purchase in silence. */
  salesToAsk?: { rowId: string; shares: number }[];
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
  /** On a row an answer of the account holder wrote: the name of the question it answers (questionName — no figures),
   *  so the answer can be undone, and the newest answer wins after undoing the earlier one (design v02, 2026-11-12). */
  answerTo?: string;
  /** On a row an undo wrote (design v02, rule 2): the name of the answer it undoes. Never read as an answer. */
  undoes?: string;
}

/** A row before it is saved: everything but its number and the time it was saved. */
export type NewRow = Omit<AssetRow, 'rowId' | 'writtenAt'>;

/** The record after a change, and — where the change was refused — why. A refused change leaves the record as it was. */
export interface Changed { record: AssetRow[]; problem: string | null }

const GIVEN: ReadonlySet<RowSource> = new Set<RowSource>(['linked', 'file', 'typed']);
const DAY_OR_STAMP = /^\d{4}-\d{2}-\d{2}(T[\d:.+\-Zz]*)?$/;
const EPS = 1e-9;

// ── R1 · ROW NAMES UNIQUE ACROSS PHONES (design v02 of the cloud copy of the master record, 2026-11-12) ─────────────────
// A new row is `<tag>.<count>`: the tag is this phone's own 12 characters (kept in the keychain with the "this device only"
// setting, src/services/dataCrypto.ts getDeviceTag), and the count is this tag's highest + 1. Old names "1", "2"… stay.
// Rows are put in order by where they sit in the record, never by turning a name into a number.
let rowTag: string | null = null;
/** R1: the tag this phone names its new rows with (null: none yet, rows are numbered on as before). The app sets it once
 *  the keychain gives it. */
/* ─ MK-NW-F-346 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * setRowTag
 *
 * Answers ..... R1: the tag this phone names its new rows with (null: none yet, rows are numbered on as before).
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... MK-XS-F-308 startRowTag · MK-XS-F-310 questionsAfterMerge
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-309 mergeNaming · MK-XS-F-310 questionsAfterMerge
 *               MK-XS-F-308 startRowTag
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-346
 * Changed ..... not in git yet (—)
 */
export function setRowTag(tag: string | null | undefined): void { rowTag = typeof tag === 'string' && /^[a-z0-9]{12}$/.test(tag) ? tag : null; }
/** R1: the tag this phone names its new rows with now. */
/* ─ MK-NW-F-347 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rowTagNow
 *
 * Answers ..... R1: the tag this phone names its new rows with now.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-XS-F-308 startRowTag · MK-XS-F-309 mergeNaming
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-309 mergeNaming · MK-XS-F-308 startRowTag
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-347
 * Changed ..... not in git yet (—)
 */
export function rowTagNow(): string | null { return rowTag; }
/** R1: the tag part of a row name `<tag>.<count>`; null for an old name "1", "2"… */
/* ─ MK-NW-F-348 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * tagOfRowName
 *
 * Answers ..... R1: the tag part of a row name `<tag>.<count>`; null for an old name "1", "2"…
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-XS-F-282 mergeRecord · MK-XS-F-287 recordOnSignInMerging
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-282 mergeRecord · MK-XS-F-287 recordOnSignInMerging
 *               MK-XS-F-286 saveRecordMerging
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-348
 * Changed ..... not in git yet (—)
 */
export function tagOfRowName(rowId: string): string | null { const m = /^([a-z0-9]{12})\.\d+$/.exec(rowId); return m ? m[1] : null; }
/** R1: the highest count a tag has used in the record (0 where none). */
/* ─ MK-NW-F-349 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * highestCountOf
 *
 * Answers ..... R1: the highest count a tag has used in the record (0 where none).
 *
 * Formula .....
 *     top = 0
 *     the answer = top
 *
 * Called by ... MK-NW-F-233 addRows · MK-XS-F-282 mergeRecord
 *
 * Reaches ..... 51 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-233 addRows
 *               MK-NW-F-342 afterAWrite · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-218 arrive
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-219 correct
 *               MK-NW-F-281 correctRow · MK-XS-F-002 dataGaps
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               … and 33 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in top of 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-349
 * Changed ..... not in git yet (—)
 */
export function highestCountOf(record: readonly Pick<AssetRow, 'rowId'>[], tag: string): number {
  let top = 0;
  for (const r of record) if (r.rowId.startsWith(tag + '.')) { const n = Number(r.rowId.slice(tag.length + 1)); if (Number.isInteger(n) && n > top) top = n; }
  return top;
}
const POSITIONS = new WeakMap<readonly AssetRow[], { length: number; at: Map<string, number> }>();
/** R1: where each row sits in the record (its first appearance) — the order rows were saved in, read the same on every
 *  phone after a merge. A name the record does not hold sorts last. */
/* ─ MK-NW-F-350 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rowPosition
 *
 * Answers ..... R1: where each row sits in the record (its first appearance) — the order rows were saved in, read the same on every phone after a merge.
 *
 * Formula .....
 *     c = POSITIONS.get(record)
 *     at = new map<string, number>()
 *     at = at
 *     the answer = (row id) => (row id = nothing ? number.MAX_SAFE_INTEGER : at.get(row id) ?? number.MAX_SAFE_INTEGER)
 *
 * Called by ... MK-NW-F-243 theLater · MK-NW-F-251 oldestLotFirst
 *               MK-NW-F-252 walkHolding · MK-NW-F-284 activityOf
 *               MK-NW-F-285 factsOf · MK-NW-F-339 settleTwoPhones
 *
 * Reaches ..... 77 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-342 afterAWrite · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-218 arrive
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-XS-F-307 composeNames · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               MK-XS-F-002 dataGaps · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               … and 59 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-350
 * Changed ..... not in git yet (—)
 */
export function rowPosition(record: readonly AssetRow[]): (rowId: string | null | undefined) => number {
  let c = POSITIONS.get(record);
  if (!c || c.length !== record.length) {
    const at = new Map<string, number>();
    record.forEach((r, i) => { if (!at.has(r.rowId)) at.set(r.rowId, i); });
    c = { length: record.length, at };
    POSITIONS.set(record, c);
  }
  const at = c.at;
  return (rowId) => (rowId == null ? Number.MAX_SAFE_INTEGER : at.get(rowId) ?? Number.MAX_SAFE_INTEGER);
}

/** A date as a row keeps it: the day as given ('YYYY-MM-DD', or a time-stamp cut to its day), or null. A day that
 *  does not exist, or anything in another shape, is not a date. */
/* ─ MK-NW-F-229 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * dayOrNull
 *
 * Answers ..... A date as a row keeps it: the day as given ('YYYY-MM-DD', or a time-stamp cut to its day), or null.
 *
 * Formula .....
 *     nothing   when v is not a string (or !DAY_OR_STAMP.test(trim()) when missing or zero)
 *     day = the first 10 of trim()
 *     real = the date date.UTC(y, m − 1, d)
 *     the answer:
 *     day   if real.get utcfull year() = y and real.get utcmonth() = m − 1 and real.get utcdate() = d
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-190 dateAsSent · MK-NW-F-193 eventRow
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-199 fileToRecord
 *               MK-NW-F-208 dateAsGiven · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-233 addRows · MK-NW-F-238 sortArriving
 *               MK-NW-F-265 historyPurchaseRow · MK-NW-F-268 arrivingKey
 *               MK-NW-F-270 sameEventElsewhere · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-275 besideTheList · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-281 correctRow
 *               MK-NW-F-286 dayOfInstant · MK-NW-F-287 splitOf
 *               MK-NW-F-288 importedListDay · MK-NW-F-289 activityRefs
 *               MK-NW-F-291 lotsOf · MK-NW-F-296 askWhich
 *               MK-NW-F-298 dayInWords · MK-NW-F-310 differenceKey
 *               MK-NW-F-312 optionDetailsOf · MK-NW-F-314 listNamesTheSoldLot
 *               MK-NW-F-324 questionsOf · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-335 writeAnswer · MK-NW-F-338 newerListUndoes
 *               MK-NW-F-356 optionOfLine
 *
 * Reaches ..... 84 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-214 accountValueRows · MK-NW-F-289 activityRefs
 *               MK-NW-F-233 addRows · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-268 arrivingKey
 *               MK-NW-F-296 askWhich · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               MK-XS-F-002 dataGaps · MK-NW-F-208 dateAsGiven
 *               … and 66 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-229
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function dayOrNull(v: unknown): string | null {
  if (typeof v !== 'string' || !DAY_OR_STAMP.test(v.trim())) return null;
  const day = v.trim().slice(0, 10);
  const [y, m, d] = day.split('-').map(Number);
  const real = new Date(Date.UTC(y, m - 1, d));
  return real.getUTCFullYear() === y && real.getUTCMonth() === m - 1 && real.getUTCDate() === d ? day : null;
}

/** Whether a text was given at all: not missing and not only spaces. */
/* ─ MK-NW-F-230 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * wasGiven
 *
 * Answers ..... Whether a text was given at all: not missing and not only spaces.
 *
 * Formula .....
 *     typeof v = 'string' and trim() ! = ''
 *
 * Called by ... MK-NW-F-233 addRows · MK-NW-F-275 besideTheList
 *               MK-NW-F-281 correctRow
 *
 * Reaches ..... 51 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-233 addRows
 *               MK-NW-F-342 afterAWrite · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-218 arrive
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-219 correct
 *               MK-NW-F-281 correctRow · MK-XS-F-002 dataGaps
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               … and 33 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-230
 * Changed ..... not in git yet (—)
 */
const wasGiven = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
/** The moment a time-stamp names, so two stamps written in different time zones are read in their true order. */
/* ─ MK-NW-F-231 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * instantOf
 *
 * Answers ..... The moment a time-stamp names, so two stamps written in different time zones are read in their true order.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-243 theLater · MK-NW-F-247 valuesThatDiffer
 *               MK-NW-F-252 walkHolding · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-284 activityOf · MK-NW-F-285 factsOf
 *               MK-NW-F-322 answerFactsOf · MK-NW-F-339 settleTwoPhones
 *
 * Reaches ..... 78 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-342 afterAWrite · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-322 answerFactsOf · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-323 answeredAlready · MK-NW-F-218 arrive
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-XS-F-307 composeNames · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               MK-XS-F-002 dataGaps · MK-NW-F-279 differsFromGiven
 *               … and 60 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-231
 * Changed ..... not in git yet (—)
 */
const instantOf = (stamp: string): number => { const t = Date.parse(stamp); return Number.isFinite(t) ? t : 0; };
/** One spelling for a holding: no spaces at its ends, in capitals — so "msft" and "MSFT" are one holding. */
/* ─ MK-NW-F-232 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * oneHoldingSpelling
 *
 * Answers ..... One spelling for a holding: no spaces at its ends, in capitals — so "msft" and "MSFT" are one holding.
 *
 * Formula .....
 *     nothing   if h = nothing (or trim() = '' when missing or zero)
 *     trim().to upper case()   otherwise
 *
 * Called by ... MK-NW-F-192 optionName · MK-NW-F-193 eventRow
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-196 fileHoldingName
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-205 priceFeedValues
 *               MK-NW-F-213 lotRow · MK-NW-F-217 transactionRow
 *               MK-NW-F-221 lotsFollow · MK-NW-F-223 openingRow
 *               MK-NW-F-224 typedChangeToRecord · MK-NW-F-226 fileValues
 *               MK-NW-F-227 fileFacts · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-233 addRows · MK-NW-F-238 sortArriving
 *               MK-NW-F-252 walkHolding · MK-NW-F-264 lastListDay
 *               MK-NW-F-268 arrivingKey · MK-NW-F-270 sameEventElsewhere
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-285 factsOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-297 valueOnlyHoldingName · MK-NW-F-312 optionDetailsOf
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-338 newerListUndoes
 *               MK-NW-F-340 oneQuestionPerExercise
 *
 * Reaches ..... 92 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-233 addRows · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-268 arrivingKey
 *               MK-NW-F-296 askWhich · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-XS-F-307 composeNames
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-219 correct
 *               MK-NW-F-281 correctRow · MK-XS-F-002 dataGaps
 *               … and 74 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-232
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export const oneHoldingSpelling = (h: string | null | undefined): string | null => (h == null || h.trim() === '' ? null : h.trim().toUpperCase());

/** Save rows. The record that comes back holds every row it held before, unchanged, and the new rows after them,
 *  each numbered on from the last and stamped with the one time they were saved together. Each account's own value
 *  row starts a new set of values, and the holding rows after it belong to that set (a holding's value with no such
 *  row before it stops). The shares of a purchase, a sale or a transfer are saved without a minus sign. A date that cannot be read is
 *  left blank and kept as given. A row that names a row to replace is saved only where that row stands today and —
 *  if a person typed it — only where the new row is typed too; anything else is a mistake in the caller and stops. */
/* ─ MK-NW-F-233 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * addRows
 *
 * Answers ..... Save rows. The record that comes back holds every row it held before, unchanged, and the new rows after them, each numbered on from the last and stamped with the one time they were saved together. Each account's own valu
 *
 * Formula .....
 *     tag = row tag
 *     n = highest count of(record, tag)   if tag
 *     record.reduce((top, r) => math.max(top, number(row id) or 0), record.length)   otherwise
 *     out = [...record]
 *     batch of = new map<string, string>()
 *     row id = `${tag}.${++n}`   if tag
 *     string(++n)   otherwise
 *     date = day or null(date)
 *     settlement date = settlement date   if settlement date = nothing
 *     day or null(settlement date)   otherwise
 *     row = ...r = ...r
 *     holding = one holding spelling(holding)
 *     date = date
 *     settlement date = settlement date
 *     row id = row id
 *     written at = written at
 *     the answer = out
 *
 * Called by ... MK-NW-F-201 fileRowsToSave · MK-NW-F-218 arrive
 *               MK-NW-F-224 typedChangeToRecord · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-238 sortArriving · MK-NW-F-272 salesMovedBy
 *               MK-NW-F-281 correctRow · MK-NW-F-289 activityRefs
 *               MK-NW-F-319 listQuestionToAsk · MK-NW-F-337 answerQuestion
 *               MK-NW-F-339 settleTwoPhones · MK-NW-F-342 afterAWrite
 *
 * Reaches ..... 50 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               MK-XS-F-002 dataGaps · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-271 eventsThatDiffer · MK-NW-F-201 fileRowsToSave
 *               … and 32 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-233
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function addRows(record: readonly AssetRow[], rows: readonly NewRow[], writtenAt: string): AssetRow[] {
  // R1: with this phone's tag, `<tag>.<count>` (this tag's highest + 1); before the tag is known, numbered on as before
  const tag = rowTag;
  let n = tag ? highestCountOf(record, tag) : record.reduce((top, r) => Math.max(top, Number(r.rowId) || 0), record.length);
  const out: AssetRow[] = [...record];
  const batchOf = new Map<string, string>();
  for (const r of rows) {
    if (r.replacesRowId) {
      // an undo puts back a row an answer took away: it replaces that removal, which nothing else replaces
      const target = rowsInForce(out).find((x) => x.rowId === r.replacesRowId)
        ?? (r.removed ? undefined : out.find((x) => x.rowId === r.replacesRowId && x.removed && (x.answerTo != null || x.byAnswer) && !out.some((y) => y.replacesRowId === x.rowId)))
        // R5: the account holder's answer to two corrections of one row takes away the last row of the one not kept
        ?? (r.removed && isTwoCorrectionsAnswer(r) ? out.find((x) => x.rowId === r.replacesRowId && !out.some((y) => y.replacesRowId === x.rowId)) : undefined);
      if (!target) throw new Error(`Row ${r.replacesRowId} does not stand in the record, so nothing can replace it.`);
      if (target.source === 'typed' && r.source !== 'typed') throw new Error(`Row ${target.rowId} was typed by the person, so it is not replaced.`);
    }
    const rowId = tag ? `${tag}.${++n}` : String(++n);
    const date = dayOrNull(r.date);
    const settlementDate = r.settlementDate == null ? r.settlementDate : dayOrNull(r.settlementDate);
    const row: AssetRow = { ...r, holding: oneHoldingSpelling(r.holding), date, settlementDate, rowId, writtenAt };
    // a broker's minus sign on a purchase, a sale or a transfer says which way the shares went; the kind already says it
    if ((r.kind === 'PURCHASE' || r.kind === 'SALE' || r.kind === 'TRANSFER') && typeof r.shares === 'number' && r.shares < 0) row.shares = -r.shares;
    if (date == null && wasGiven(r.date)) row.dateAsGiven = String(r.date);
    if (settlementDate == null && wasGiven(r.settlementDate)) row.settlementDateAsGiven = String(r.settlementDate);
    if (r.kind === 'VALUE' && !r.replacesRowId) {
      if (row.holding == null) batchOf.set(r.accountId, rowId);
      else if (!batchOf.has(r.accountId)) throw new Error(`A holding’s value for account ${r.accountId} was saved without the account’s own value row before it.`);
      row.batch = batchOf.get(r.accountId);
    }
    out.push(row);
  }
  return out;
}

/** The rows that count: every row that no later row replaces, and that is not itself a removal. */
/* ─ MK-NW-F-234 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rowsInForce
 *
 * Answers ..... The rows that count: every row that no later row replaces, and that is not itself a removal.
 *
 * Formula .....
 *     replaced = new set<string>()
 *     twice = false
 *     competing = competing corrections(record)
 *     by = replacers of(record)
 *     out = new set<string>()
 *     drop = (id: string) => { for (const x of by.get(id) ?? []) if (!out.has(row id)) { out.add(row id); drop(row id); } }
 *     the answer = record where !out.has(row id) and !replaced.has(row id) and !removed
 *
 * Called by ... MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-205 priceFeedValues · MK-NW-F-216 rowOfLot
 *               MK-NW-F-224 typedChangeToRecord · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-233 addRows · MK-NW-F-236 rowAsItStands
 *               MK-NW-F-238 sortArriving · MK-NW-F-242 valueBatchesOf
 *               MK-NW-F-247 valuesThatDiffer · MK-NW-F-252 walkHolding
 *               MK-NW-F-256 salesNeedingAnAnswer · MK-NW-F-257 typedSalesTheListContradicts
 *               MK-NW-F-263 sharesThatDisagree · MK-NW-F-266 listAnswered
 *               MK-NW-F-269 eventAnswers · MK-NW-F-272 salesMovedBy
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-281 correctRow
 *               MK-NW-F-283 splitsBetween · MK-NW-F-284 activityOf
 *               MK-NW-F-285 factsOf · MK-NW-F-293 keptAwayByEvent
 *               MK-NW-F-294 removalKept · MK-NW-F-296 askWhich
 *               MK-NW-F-322 answerFactsOf · MK-NW-F-324 questionsOf
 *               MK-NW-F-328 keyOldAnswers · MK-NW-F-335 writeAnswer
 *               MK-NW-F-338 newerListUndoes · MK-NW-F-339 settleTwoPhones
 *
 * Reaches ..... 92 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-233 addRows · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-322 answerFactsOf
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-323 answeredAlready
 *               MK-NW-F-218 arrive · MK-NW-F-296 askWhich
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-XS-F-307 composeNames · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               … and 74 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-234
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function rowsInForce(record: readonly AssetRow[]): AssetRow[] {
  const replaced = new Set<string>();
  let twice = false;
  for (const r of record) if (r.replacesRowId) { if (replaced.has(r.replacesRowId)) twice = true; replaced.add(r.replacesRowId); }
  if (twice) {
    // R5 (DEC-10471): two corrections of one row, made on two phones, change nothing until the account holder answers —
    // the row they correct still counts, and neither correction does
    const competing = competingCorrections(record);
    if (competing.length) {
      const by = replacersOf(record);
      const out = new Set<string>();
      const drop = (id: string) => { for (const x of by.get(id) ?? []) if (!out.has(x.rowId)) { out.add(x.rowId); drop(x.rowId); } };
      for (const c of competing) { replaced.delete(c.rowId); drop(c.rowId); }
      return record.filter((r) => !out.has(r.rowId) && !replaced.has(r.rowId) && !r.removed);
    }
  }
  return record.filter((r) => !replaced.has(r.rowId) && !r.removed);
}

/** R5: the name an answer to two corrections of one row carries (the question's name, no figures). */
/* ─ MK-NW-F-351 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * twoCorrectionsName
 *
 * Answers ..... R5: the name an answer to two corrections of one row carries (the question's name, no figures).
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-355 keepOneCorrection
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-355 keepOneCorrection
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-351
 * Changed ..... not in git yet (—)
 */
export const twoCorrectionsName = (rowId: string): string => `two-corrections|${rowId}`;
/** Whether a row is the account holder’s answer to a question about two corrections of one row: its answer names a question that starts “two-corrections|”. */
/* ─ MK-NW-F-352 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isTwoCorrectionsAnswer
 *
 * Answers ..... Whether a row is the account holder’s answer to a question about two corrections of one row: its answer names a question that starts “two-corrections|”.
 *
 * Formula .....
 *     typeof answer to = 'string' and answer to.starts with('two − corrections|')
 *
 * Called by ... MK-NW-F-233 addRows · MK-NW-F-354 competingCorrections
 *
 * Reaches ..... 95 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-233 addRows · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-322 answerFactsOf
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-323 answeredAlready
 *               MK-NW-F-218 arrive · MK-NW-F-296 askWhich
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-NW-F-354 competingCorrections · MK-XS-F-307 composeNames
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-219 correct
 *               … and 77 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-352
 * Changed ..... not in git yet (—)
 */
const isTwoCorrectionsAnswer = (r: Pick<AssetRow, 'answerTo'>): boolean => typeof r.answerTo === 'string' && r.answerTo.startsWith('two-corrections|');

/** Every row that names each row as the one it replaces. */
/* ─ MK-NW-F-353 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * replacersOf
 *
 * Answers ..... Every row that names each row as the one it replaces.
 *
 * Formula .....
 *     by = new map<string, asset row[]>()
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-234 rowsInForce · MK-NW-F-354 competingCorrections
 *
 * Reaches ..... 95 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-233 addRows · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-322 answerFactsOf
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-323 answeredAlready
 *               MK-NW-F-218 arrive · MK-NW-F-296 askWhich
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-NW-F-354 competingCorrections · MK-XS-F-307 composeNames
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-219 correct
 *               … and 77 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-353
 * Changed ..... not in git yet (—)
 */
function replacersOf(record: readonly AssetRow[]): Map<string, AssetRow[]> {
  const by = new Map<string, AssetRow[]>();
  for (const r of record) if (r.replacesRowId) by.set(r.replacesRowId, [...(by.get(r.replacesRowId) ?? []), r]);
  return by;
}

/** R5 · TWO CORRECTIONS OF ONE ROW (two phones each corrected it, offline): each such row, and the last row of each
 *  correction still standing, oldest first — shown with the question. A correction the account holder's answer took
 *  away no longer stands; with one left, the row is settled. */
/* ─ MK-NW-F-354 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * competingCorrections
 *
 * Answers ..... R5 · TWO CORRECTIONS OF ONE ROW (two phones each corrected it, offline): each such row, and the last row of each correction still standing, oldest first — shown with the question.
 *
 * Formula .....
 *     by = replacers of(record)
 *     memo = new map<string, boolean>()
 *     was = memo.get(row id)
 *     was   when was ≠ nothing
 *     next = by.get(row id) (or none when missing)
 *     v = next.some(stands)   if count of next
 *     not (removed and is two corrections answer(r))   otherwise
 *     last of = (r: asset row): asset row => { let x = r; const seen = new set<string>(); for (;;) { const n = (by.get(row id) ?? []).filter(stands); if (length ! = 1 or seen.has(row id)) return x; seen.add(row id); x = n[0]; } }
 *     out = []
 *     live = rs where stands(each) and !is two corrections answer(each)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-234 rowsInForce · MK-NW-F-355 keepOneCorrection
 *
 * Reaches ..... 94 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-233 addRows · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-322 answerFactsOf
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-323 answeredAlready
 *               MK-NW-F-218 arrive · MK-NW-F-296 askWhich
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-XS-F-307 composeNames · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               … and 76 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-354
 * Changed ..... not in git yet (—)
 */
export function competingCorrections(record: readonly AssetRow[]): { rowId: string; corrections: AssetRow[] }[] {
  const by = replacersOf(record);
  const memo = new Map<string, boolean>();
  // a correction stands unless it ends in the account holder's answer taking it away
  const stands = (r: AssetRow): boolean => {
    const was = memo.get(r.rowId);
    if (was != null) return was;
    memo.set(r.rowId, true);
    const next = by.get(r.rowId) ?? [];
    const v = next.length ? next.some(stands) : !(r.removed && isTwoCorrectionsAnswer(r));
    memo.set(r.rowId, v);
    return v;
  };
  const lastOf = (r: AssetRow): AssetRow => { let x = r; const seen = new Set<string>(); for (;;) { const n = (by.get(x.rowId) ?? []).filter(stands); if (n.length !== 1 || seen.has(x.rowId)) return x; seen.add(x.rowId); x = n[0]; } };
  const out: { rowId: string; corrections: AssetRow[] }[] = [];
  for (const [rowId, rs] of by) {
    // an undo that puts back a row an answer took away, and the removal of a correction by this answer, never compete
    const live = rs.filter((r) => stands(r) && !isTwoCorrectionsAnswer(r));
    if (live.length >= 2) out.push({ rowId, corrections: live.map(lastOf) });
  }
  return out;
}

/** R5: the account holder keeps one of two corrections of a row — the rows to save take the last row of every other
 *  correction away. Nothing changes until this answer is saved. */
/* ─ MK-NW-F-355 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * keepOneCorrection
 *
 * Answers ..... R5: the account holder keeps one of two corrections of a row — the rows to save take the last row of every other correction away.
 *
 * Formula .....
 *     c = competing corrections(record).find((x) => row id = row id)
 *     []   when c is missing (or !corrections.some((r) => row id = keep) when missing or zero)
 *     the answer:
 *     ...rest = ...rest
 *     source = 'typed' as const
 *     replaces row id = row id
 *     removed = true
 *     answer to = two corrections name(row id)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-355
 * Changed ..... not in git yet (—)
 */
export function keepOneCorrection(record: readonly AssetRow[], rowId: string, keep: string): NewRow[] {
  const c = competingCorrections(record).find((x) => x.rowId === rowId);
  if (!c || !c.corrections.some((r) => r.rowId === keep)) return [];
  return c.corrections.filter((r) => r.rowId !== keep).map((r) => {
    const { rowId: _n, writtenAt: _w, ...rest } = r;
    return { ...rest, source: 'typed' as const, replacesRowId: r.rowId, removed: true, answerTo: twoCorrectionsName(rowId) };
  });
}

/** For every row, the row it began as: a correction, and a correction of a correction, lead back to the first. */
/* ─ MK-NW-F-235 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * firstRowOf
 *
 * Answers ..... For every row, the row it began as: a correction, and a correction of a correction, lead back to the first.
 *
 * Formula .....
 *     by id = a lookup of for each of record: [row id, each]
 *     r = by id.get(row id)
 *     seen = new set<string>()
 *     the answer = r
 *
 * Called by ... MK-NW-F-236 rowAsItStands · MK-NW-F-238 sortArriving
 *               MK-NW-F-242 valueBatchesOf · MK-NW-F-252 walkHolding
 *               MK-NW-F-266 listAnswered · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-280 splitByOf · MK-NW-F-281 correctRow
 *               MK-NW-F-282 removeRow · MK-NW-F-284 activityOf
 *               MK-NW-F-319 listQuestionToAsk · MK-NW-F-320 saleQuestionToAsk
 *               MK-NW-F-324 questionsOf · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-328 keyOldAnswers
 *               MK-NW-F-335 writeAnswer · MK-NW-F-336 stillAsked
 *
 * Reaches ..... 82 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-342 afterAWrite · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-218 arrive
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-XS-F-307 composeNames · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               MK-XS-F-002 dataGaps · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               … and 64 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-235
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-236 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rowAsItStands
 *
 * Answers ..... The row that stands today for a row number, however many times it has been corrected.
 *
 * Formula .....
 *     first = first row of(record)
 *     began = first(row id).row id
 *     nothing   when began = nothing
 *     the answer = rows in force(record).find((r) => first(row id).row id = began) (or nothing when missing)
 *
 * Called by ... MK-NW-F-238 sortArriving · MK-NW-F-256 salesNeedingAnAnswer
 *               MK-NW-F-257 typedSalesTheListContradicts · MK-NW-F-260 soldFrom
 *               MK-NW-F-261 saleGain · MK-NW-F-275 besideTheList
 *               MK-NW-F-276 replacedPurchase · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-281 correctRow · MK-NW-F-282 removeRow
 *               MK-NW-F-293 keptAwayByEvent · MK-NW-F-314 listNamesTheSoldLot
 *               MK-NW-F-316 salesSentence · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-324 questionsOf
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-329 undoAnswer · MK-NW-F-333 sharesToStated
 *               MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 63 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-XS-F-307 composeNames
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-219 correct
 *               MK-NW-F-281 correctRow · MK-XS-F-002 dataGaps
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               … and 45 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-236
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function rowAsItStands(record: readonly AssetRow[], rowId: string): AssetRow | null {
  const first = firstRowOf(record);
  const began = first(rowId)?.rowId;
  if (began == null) return null;
  return rowsInForce(record).find((r) => first(r.rowId)?.rowId === began) ?? null;
}

const EVENT_KINDS: ReadonlySet<RowKind> = new Set<RowKind>(['PURCHASE', 'SALE', 'DIVIDEND', 'INTEREST', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'SPLIT', 'OTHER']);
/** Whether two amounts are the same to a billionth, or both missing. */
/* ─ MK-NW-F-237 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * sameNumber
 *
 * Answers ..... Whether two amounts are the same to a billionth, or both missing.
 *
 * Formula .....
 *     x = nothing and y = nothing   if x = nothing (or y = nothing when missing or zero)
 *     size of(x − y) ≤ EPS   otherwise
 *
 * Called by ... MK-NW-F-238 sortArriving · MK-NW-F-247 valuesThatDiffer
 *               MK-NW-F-270 sameEventElsewhere · MK-NW-F-272 salesMovedBy
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-275 besideTheList
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-327 sameFigures
 *               MK-NW-F-330 undoAskQuestion · MK-NW-F-343 lotChange
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-237
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-238 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sortArriving
 *
 * Answers ..... WHAT ARRIVES FROM A BROKER OR A FILE, SORTED ONCE: the rows to save, and the events to ask the account holder about — so nothing sent twice, or sent by two roads, is saved twice, and the two answers never disagree.
 *
 * Formula .....
 *     in force keys = a list with no repeats of rows in force(record) where reffor each of : `${account id}|${ref}`
 *     taken away keys = a list with no repeats of record where ref and removed and source = 'typed' and !by answerfor each of : `${account id}|${ref}`
 *     nth = new map<string, number>()
 *     in force = rows in force(record), first = first row of(record), answers = event answers(record)
 *     kept mine for = a list with no repeats of [...answers] where ([, a]) => a = 'mine'for each of : [pair]) => pair.slice(pair.index of('|') + 1
 *     claimed = new set<string>()
 *     matched = new set<string>()
 *     changed under key = []
 *     near = (a: string | nothing, b: string | nothing) => a ≠ nothing and b ≠ nothing and days from one date to another(a, b) ≤ NEARBY_DAYS
 *     is event = (r: new row) => EVENT_KINDS.has(kind) and !replaces row id
 *     fresh = []
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-201 fileRowsToSave · MK-NW-F-218 arrive
 *               MK-NW-F-239 rowsNotYetSaved · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-289 activityRefs
 *               MK-NW-F-336 stillAsked · MK-NW-F-341 questionsStillTrue
 *               MK-XS-F-192 typedValueDatedBack · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-282 mergeRecord
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-238
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function sortArriving(record: readonly AssetRow[], rows: readonly NewRow[]): { save: NewRow[]; ask: EventQuestion[] } {
  // a key whose rows the account holder took away (none in force, a removal of theirs) does not block a row arriving under
  // it: what they add again is saved again (a lot deleted and re-added keeps its lot number)
  const inForceKeys = new Set(rowsInForce(record).filter((r) => r.ref).map((r) => `${r.accountId}|${r.ref}`));
  const takenAwayKeys = new Set(record.filter((r) => r.ref && r.removed && r.source === 'typed' && !r.byAnswer).map((r) => `${r.accountId}|${r.ref}`));
  const seen = new Set(record.filter((r) => r.ref).map((r) => `${r.accountId}|${r.ref}`)
    .filter((k) => inForceKeys.has(k) || !takenAwayKeys.has(k)));
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
        if (gone) { if (!answers.has(key(gone)) && !removalKept(record, r.accountId, H, day)) ask.push({ arriving: r, onRecord: gone, why: 'taken-away', key: key(gone) }); continue; }
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
/* ─ MK-NW-F-239 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * rowsNotYetSaved
 *
 * Answers ..... Rows not yet in the record: what sortArriving says to save.
 *
 * Formula .....
 *     sort arriving(record, rows).save
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-239
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function rowsNotYetSaved(record: readonly AssetRow[], rows: readonly NewRow[]): NewRow[] {
  return sortArriving(record, rows).save;
}

/** Where a row sits in time: its own date, or — where nobody gave one — the day it was first saved, the latest day
 *  it can have happened by. The row's date itself stays blank; this is only the order rows are read in. */
/* ─ MK-NW-F-240 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * placedOn
 *
 * Answers ..... Where a row sits in time: its own date, or — where nobody gave one — the day it was first saved, the latest day it can have happened by.
 *
 * Formula .....
 *     the first 10 of date (or written at when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-240
 * Changed ..... 2026-11-11 (70d29ae8)
 */
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
  holdings: { holding: string; shares: number | null; price: number | null; value: number | null; priceDate?: string }[];
  /** Cash, the typed value and every holding added up. Null where a holding's value is not known, or where
   *  neither cash nor a typed value was given. */
  total: number | null;
  /** True where the person typed any of these values, or corrected one. */
  typed: boolean;
}

/** The rows for one account's values on one day: one row for the account itself (its cash, the broker's total, a
 *  typed value) and one for each holding, to be saved together. */
/* ─ MK-NW-F-241 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * valueRows
 *
 * Answers ..... The rows for one account's values on one day: one row for the account itself (its cash, the broker's total, a typed value) and one for each holding, to be saved together.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-199 fileToRecord
 *               MK-NW-F-205 priceFeedValues · MK-NW-F-214 accountValueRows
 *               MK-NW-F-217 transactionRow · MK-NW-F-226 fileValues
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 20 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-214 accountValueRows · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-199 fileToRecord · MK-NW-F-226 fileValues
 *               MK-XS-F-219 importedAccountOf · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-205 priceFeedValues · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-195 readImport · MK-NW-F-217 transactionRow
 *               MK-NW-F-222 typedAccountRows · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               … and 2 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-241
 * Changed ..... 2026-11-11 (06ef67aa)
 */
export function valueRows(v: {
  accountId: string; date: string | null; source: RowSource; cash?: number | null; statedTotal?: number | null;
  typedValue?: number | null; holdings?: { holding: string; shares: number | null; price: number | null; value: number | null; priceDate?: string }[];
}): NewRow[] {
  return [
    { accountId: v.accountId, holding: null, kind: 'VALUE', date: v.date, source: v.source, amount: v.cash ?? null,
      statedTotal: v.statedTotal ?? null, typedValue: v.typedValue ?? null },
    ...(v.holdings ?? []).map((h) => ({ accountId: v.accountId, holding: h.holding, kind: 'VALUE' as const, date: v.date,
      source: v.source, shares: h.shares, price: h.price, amount: h.value ?? null, ...(h.priceDate ? { priceDate: h.priceDate } : {}) })),
  ];
}

/** Every set of values saved for an account, each as it was saved together — a corrected row read in its place. */
/* ─ MK-NW-F-242 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * valueBatchesOf
 *
 * Answers ..... Every set of values saved for an account, each as it was saved together — a corrected row read in its place.
 *
 * Formula .....
 *     first = first row of(record)
 *     rows = rows in force(record) where account id = account id and kind = 'VALUE'
 *     cash = own.amount (or nothing, typed value = own.typed value (or nothing when missing) when missing)
 *     unknown = holdings.some((h) => value = nothing) (or cash = nothing and typed value = nothing when missing or zero)
 *
 * Called by ... MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-205 priceFeedValues · MK-NW-F-244 valuesNow
 *               MK-NW-F-245 valuesLastGiven · MK-NW-F-246 valuesOn
 *               MK-NW-F-247 valuesThatDiffer · MK-NW-F-249 valuesNeedingADate
 *               MK-NW-F-321 latestListDayOf
 *
 * Reaches ..... 21 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-321 latestListDayOf · MK-NW-F-205 priceFeedValues
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-341 questionsStillTrue · MK-NW-F-263 sharesThatDisagree
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-245 valuesLastGiven
 *               MK-NW-F-249 valuesNeedingADate · MK-NW-F-244 valuesNow
 *               … and 3 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If cash is missing it uses 0.
 *     · If typed value is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-242
 * Changed ..... 2026-11-11 (06ef67aa)
 */
export function valueBatchesOf(record: readonly AssetRow[], accountId: string): ValueBatch[] {
  const first = firstRowOf(record);
  const rows = rowsInForce(record).filter((r) => r.accountId === accountId && r.kind === 'VALUE');
  return rows.filter((r) => r.holding == null).map((own) => {
    const holdings = rows.filter((r) => r.holding != null && r.batch === own.batch)
      .map((r) => ({ holding: r.holding as string, shares: r.shares ?? null, price: r.price ?? null, value: r.amount ?? null, ...(r.priceDate ? { priceDate: r.priceDate } : {}) }));
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
/* ─ MK-NW-F-243 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * theLater
 *
 * Answers ..... Of two sets of values, the one to read: a dated one before an undated one; then the later date; on one date a given one before the price feed's, and one the person typed before the rest; then the later time-stamp; at one time-stamp, the one saved later.
 *
 * Formula .....
 *     a   if date ≠ nothing
 *     b   otherwise   when (date = nothing) ! = (date = nothing)
 *     a   if (date as string) > (date as string)
 *     b   otherwise   when date ! = date
 *     a   if GIVEN.has(source)
 *     b   otherwise   when GIVEN.has(source) ! = GIVEN.has(source)
 *     a   if typed
 *     b   otherwise   when typed ! = typed
 *     ta = instant of(written at), tb = instant of(written at)
 *     at = row position(record)
 *     the answer:
 *     a   if ta > tb
 *     b   otherwise   if ta ! = tb
 *     a   if at(batch) > at(batch)
 *     b   otherwise   otherwise
 *
 * Called by ... MK-NW-F-244 valuesNow · MK-NW-F-245 valuesLastGiven
 *               MK-NW-F-246 valuesOn
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-263 sharesThatDisagree · MK-NW-F-336 stillAsked
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-245 valuesLastGiven
 *               MK-NW-F-244 valuesNow · MK-NW-F-246 valuesOn
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-243
 * Changed ..... not in git yet (—)
 */
const theLater = (record: readonly AssetRow[]) => (a: ValueBatch, b: ValueBatch): ValueBatch => {
  if ((a.date == null) !== (b.date == null)) return a.date != null ? a : b;
  if (a.date !== b.date) return (a.date as string) > (b.date as string) ? a : b;
  if (GIVEN.has(a.source) !== GIVEN.has(b.source)) return GIVEN.has(a.source) ? a : b;
  if (a.typed !== b.typed) return a.typed ? a : b;   // on one day, what the person typed stands in front
  const ta = instantOf(a.writtenAt), tb = instantOf(b.writtenAt);
  // R1: on one time-stamp, the set saved later in the record
  const at = rowPosition(record);
  return ta !== tb ? (ta > tb ? a : b) : (at(a.batch) > at(b.batch) ? a : b);
};

/** WHAT THE SCREENS SHOW TODAY: the values with the latest date and, within that date, the latest time-stamp. On
 *  one date a value the broker, a file or the person gave stands in front of the price feed's. Values nobody dated
 *  are read only where no dated values exist. */
/* ─ MK-NW-F-244 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * valuesNow
 *
 * Answers ..... WHAT THE SCREENS SHOW TODAY: the values with the latest date and, within that date, the latest time-stamp.
 *
 * Formula .....
 *     all = value batches of(record, account id)
 *     the answer:
 *     all.reduce((a, b) => the later(record)(a, b))   if count of all
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-244
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function valuesNow(record: readonly AssetRow[], accountId: string): ValueBatch | null {
  const all = valueBatchesOf(record, accountId);
  return all.length ? all.reduce((a, b) => theLater(record)(a, b)) : null;
}

/** The latest values the broker, a file or the person gave — never the price feed's. This is what the shares on
 *  record are checked against. */
/* ─ MK-NW-F-245 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * valuesLastGiven
 *
 * Answers ..... The latest values the broker, a file or the person gave — never the price feed's.
 *
 * Formula .....
 *     all = value batches of(record, account id) where GIVEN.has(source)
 *     the answer:
 *     all.reduce((a, b) => the later(record)(a, b))   if count of all
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-263 sharesThatDisagree · MK-NW-F-324 questionsOf
 *               MK-NW-F-336 stillAsked
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-263 sharesThatDisagree · MK-NW-F-336 stillAsked
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-245
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function valuesLastGiven(record: readonly AssetRow[], accountId: string): ValueBatch | null {
  const all = valueBatchesOf(record, accountId).filter((b) => GIVEN.has(b.source));
  return all.length ? all.reduce((a, b) => theLater(record)(a, b)) : null;
}

/** What an account was worth on one day: the values dated that day — given ones before the price feed's, the latest
 *  saved. Values nobody dated belong to no day. With none, nothing. */
/* ─ MK-NW-F-246 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * valuesOn
 *
 * Answers ..... What an account was worth on one day: the values dated that day — given ones before the price feed's, the latest saved.
 *
 * Formula .....
 *     that = value batches of(record, account id) where date = day
 *     the answer:
 *     that.reduce((a, b) => the later(record)(a, b))   if count of that
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-246
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function valuesOn(record: readonly AssetRow[], accountId: string, day: string): ValueBatch | null {
  const that = valueBatchesOf(record, accountId).filter((b) => b.date === day);
  return that.length ? that.reduce((a, b) => theLater(record)(a, b)) : null;
}

/** ON ONE DAY, A VALUE THE ACCOUNT HOLDER TYPED AND A LATER ONE FROM A BROKER OR A FILE THAT DIFFERS: the typed one
 *  stands (the account holder can always override) and the two are handed back so the account holder is asked which is
 *  correct (his ruling, 2026-11-11: every difference is asked). */
/* ─ MK-NW-F-247 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * valuesThatDiffer
 *
 * Answers ..... ON ONE DAY, A VALUE THE ACCOUNT HOLDER TYPED AND A LATER ONE FROM A BROKER OR A FILE THAT DIFFERS: the typed one stands (the account holder can always override) and the two are handed back so the account holder is asked which is correct (his ruling, 2026-11-11: every difference is asked).
 *
 * Formula .....
 *     all = value batches of(record, account id)
 *     answered batches = a list with no repeats of rows in force(record) where kind = 'FACT' and typeof facts.values answered = 'string'for each of : the first of (facts.values answered as string).split('|')
 *     latest typed = all where typed and date ≠ nothing where !typed all.some((o) => o ! = each and date = date and instant of(written at) > instant of(written at))
 *
 * Called by ... MK-NW-F-248 answerValuesQuestion · MK-NW-F-324 questionsOf
 *               MK-NW-F-336 stillAsked
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-324 questionsOf · MK-NW-F-336 stillAsked
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-009 transaction date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-247
 * Changed ..... 2026-11-11 (a6679cea)
 */
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
/* ─ MK-NW-F-248 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * answerValuesQuestion
 *
 * Answers ..... The account holder's answer about a typed value and a broker's: "mine" keeps the typed one; "theirs" types the broker's figures for that day as the account holder's own.
 *
 * Formula .....
 *     pair = `${typed.batch}|${given.batch}`
 *     without = record where not (kind = 'FACT' and facts.values answered = pair)
 *     []   when record.length and !values that differ(without, typed.account id).some((x) => typed.batch = typed.batch and given.batch = given.batch)
 *     remember = account id = typed.account id
 *     holding = nothing
 *     kind = 'FACT'
 *     date = nothing
 *     source = 'typed'
 *     facts = values answered = `${typed.batch}|${given.batch}`
 *     values answer = answer
 *     [remember]   when answer = 'mine'
 *     the answer = [remember, ...value rows({ account id: given.account id, date: given.date, source: 'typed', cash: given.cash, stated total: given.stated total, typed value: given.typed value, holdings: given.holdings })]
 *
 * Called by ... MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-248
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function answerValuesQuestion(d: { typed: ValueBatch; given: ValueBatch }, answer: 'mine' | 'theirs', record: readonly AssetRow[] = []): NewRow[] {
  const pair = `${d.typed.batch}|${d.given.batch}`;
  // a changed answer ("mine" after "theirs") is answerQuestion's: it undoes the earlier answer first (design v02, rule 2)
  const without = record.filter((r) => !(r.kind === 'FACT' && r.facts?.valuesAnswered === pair));
  if (record.length && !valuesThatDiffer(without, d.typed.accountId).some((x) => x.typed.batch === d.typed.batch && x.given.batch === d.given.batch)) return [];
  const remember: NewRow = { accountId: d.typed.accountId, holding: null, kind: 'FACT', date: null, source: 'typed', facts: { valuesAnswered: `${d.typed.batch}|${d.given.batch}`, valuesAnswer: answer } };
  if (answer === 'mine') return [remember];
  return [remember, ...valueRows({ accountId: d.given.accountId, date: d.given.date, source: 'typed', cash: d.given.cash, statedTotal: d.given.statedTotal, typedValue: d.given.typedValue, holdings: d.given.holdings })];
}

/** The values a broker, a file or the person gave with no date: the person is asked what day they are from. */
/* ─ MK-NW-F-249 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * valuesNeedingADate
 *
 * Answers ..... The values a broker, a file or the person gave with no date: the person is asked what day they are from.
 *
 * Formula .....
 *     value batches of(record, account id) where date = nothing and GIVEN.has(source)
 *
 * Called by ... MK-NW-F-324 questionsOf · MK-NW-F-336 stillAsked
 *               MK-NW-F-341 questionsStillTrue
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-324 questionsOf · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-249
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function valuesNeedingADate(record: readonly AssetRow[], accountId: string): ValueBatch[] {
  return valueBatchesOf(record, accountId).filter((b) => b.date == null && GIVEN.has(b.source));
}

/** The broker's own stated total less the total the rows add up to. Null where either is not known. */
/* ─ MK-NW-F-250 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * statedTotalGap
 *
 * Answers ..... The broker's own stated total less the total the rows add up to.
 *
 * Formula .....
 *     nothing   if batch.stated total = nothing (or batch.total = nothing when missing or zero)
 *     batch.stated total − batch.total   otherwise
 *
 * Called by ... MK-NW-F-324 questionsOf · MK-NW-F-336 stillAsked
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-336 stillAsked · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-250
 * Changed ..... 2026-11-11 (70d29ae8)
 */
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
/** The order purchases are listed and sold in: a purchase with no date first, then by date, oldest first; on one day, the one saved first. */
/* ─ MK-NW-F-251 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * oldestLotFirst
 *
 * Answers ..... The order purchases are listed and sold in: a purchase with no date first, then by date, oldest first; on one day, the one saved first.
 *
 * Formula .....
 *     at = row position(record)
 *     the answer = (a: open purchase, b: open purchase) => ((date ?? '') < (date ?? '') ? -1 : (date ?? '') > (date ?? '') ? 1 : at(first row id) − at(first row id))
 *
 * Called by ... MK-NW-F-252 walkHolding · MK-NW-F-253 openPurchases
 *               MK-NW-F-256 salesNeedingAnAnswer · MK-NW-F-278 answerListQuestion
 *
 * Reaches ..... 70 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-342 afterAWrite · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-218 arrive
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-XS-F-307 composeNames · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               MK-XS-F-002 dataGaps · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               … and 52 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-251
 * Changed ..... not in git yet (—)
 */
const oldestLotFirst = (record: readonly AssetRow[]) => {
  const at = rowPosition(record);   // R1: on one day, the one saved first — by its place in the record
  return (a: OpenPurchase, b: OpenPurchase) => ((a.date ?? '') < (b.date ?? '') ? -1 : (a.date ?? '') > (b.date ?? '') ? 1 : at(a.firstRowId) - at(b.firstRowId));
};

/** Walk one holding through every account, in the order things happened (up to a given day, where one is given):
 *  each purchase enters on its day (one with no date is there from the start); a split multiplies the shares and
 *  divides the price of the purchases already in that account — never of a purchase a later list already states
 *  after the split; a sale or a transfer out takes the shares it names (only from purchases made by its day), then
 *  the rest from the oldest purchase first — unless a purchase it could take from has no date and there is more than
 *  one to choose from, in which case those shares wait for the account holder's answer. A sale made before the
 *  broker's list began takes nothing from the listed tax lots (the list is already net of it): what it made is read
 *  from the purchases in the broker's history. Shares transferred to another account arrive there as the same
 *  purchases, with their own dates and prices. On one day: a split, then purchases, then transfers, then sales. */
/* ─ MK-NW-F-252 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * walkHolding
 *
 * Answers ..... Walk one holding through every account, in the order things happened (up to a given day, where one is given): each purchase enters on its day (one with no date is there from the start); a split multiplies the shares and divides the price of the purchases already in that account — never of a purchase a later list already states after the split; a sale or a transfer out takes the shares it names (only from purchases made by its day), then the rest from the oldest purchase first — unless a purchase it could take from has no date and there is more than one to choose from, in which case those shares wait for the account holder's answer.
 *
 * Formula .....
 *     h = one holding spelling(holding)
 *     first = first row of(record)
 *     began = (row id: string) => first(row id).row id (or row id when missing)
 *     at = row position(record)
 *     saved at = (r: asset row) => (first(row id) ?? r).written at
 *     day of = the first 10) of (r: asset row) => date (or (kind = 'PURCHASE' ? '' : saved at(r) when missing)
 *     lots = []
 *     shown = []
 *     taken = []
 *     pending = new map<string, number>()
 *     to ask = new map<string, number>()
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-253 openPurchases · MK-NW-F-254 sharesTakenBy
 *               MK-NW-F-256 salesNeedingAnAnswer · MK-NW-F-262 sharesOnRecord
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-280 splitByOf
 *               MK-NW-F-282 removeRow · MK-NW-F-284 activityOf
 *               MK-NW-F-314 listNamesTheSoldLot
 *
 * Reaches ..... 69 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-342 afterAWrite · MK-NW-F-273 answerEventQuestion
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-248 answerValuesQuestion · MK-NW-F-218 arrive
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-XS-F-307 composeNames · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               MK-XS-F-002 dataGaps · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               … and 51 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *     · If ratio is missing it uses 1.
 *     · Never lets free fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-252
 * Changed ..... not in git yet (—)
 */
function walkHolding(record: readonly AssetRow[], holding: string, upTo: string | null = null): { lots: OpenPurchase[]; taken: SharesTaken[]; everyLot: OpenPurchase[] } {
  const H = oneHoldingSpelling(holding);
  const first = firstRowOf(record);
  const began = (rowId: string) => first(rowId)?.rowId ?? rowId;
  const at = rowPosition(record);   // R1: on one day and kind, the one saved first — by its place in the record
  const savedAt = (r: AssetRow) => (first(r.rowId) ?? r).writtenAt;
  const dayOf = (r: AssetRow) => r.date ?? (r.kind === 'PURCHASE' ? '' : savedAt(r).slice(0, 10));
  const events = rowsInForce(record).filter((r) => r.holding === H && ORDER[r.kind] != null && (r.kind !== 'TRANSFER' || (r.shares ?? 0) > 0))
    .map((r) => ({ r, day: dayOf(r) })).filter((e) => upTo == null || e.day <= upTo)
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1
      : (ORDER[a.r.kind] as number) - (ORDER[b.r.kind] as number) || at(began(a.r.rowId)) - at(began(b.r.rowId))));
  const lots: OpenPurchase[] = [];
  const shown: (OpenPurchase & { inListOf: string; leftByAnswer: boolean; forSales: string[] })[] = [];   // the history's purchases the list already counts, and shares an answer kept to show
  const taken: SharesTaken[] = [];
  const pending = new Map<string, number>();                    // shares waiting for an answer, by account
  // shares of a sale whose purchase the account holder took away: asked about, never sold from another purchase in silence
  const toAsk = new Map<string, number>();
  for (const x of record) if (x.removed && x.holding === H) for (const t of x.salesToAsk ?? []) toAsk.set(t.rowId, (toAsk.get(t.rowId) ?? 0) + t.shares);
  // R6 (design v02 of the cloud copy, 2026-11-12): a sale that names a purchase the account holder took away on another
  // phone, before that phone knew of the sale — its removal names no such sale — is asked about too (which purchase the
  // shares came from), never sold beyond the record in silence
  const standing = new Set(rowsInForce(record).map((x) => began(x.rowId)));
  const takenAwayElsewhere = new Set(record.filter((x) => x.removed && x.replacesRowId && x.holding === H && !x.byAnswer && x.answerTo == null)
    .map((x) => began(x.rowId)).filter((id) => !standing.has(id)));
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
    let left = asked, unassigned = 0, beforeList = 0, attributed = 0, beyondAsked = 0;
    const mine = lots.filter((p) => p.accountId === r.accountId && p.shares > EPS);
    for (const t of r.sells ?? []) {
      let want = Math.min(t.shares, left);
      for (const lot of mine.filter((p) => p.firstRowId === began(t.rowId) && (p.date ?? '') <= day)) {   // every piece of that purchase, made by this day
        const take = Math.min(lot.shares - picked(lot), want);
        if (take > EPS) { picks.push({ lot, shares: take }); want -= take; left -= take; }
      }
    }
    const from: SharesTaken['from'] = [];
    const askFor = toAsk.get(began(r.rowId)) ?? 0;
    if (askFor <= EPS && left > EPS) {
      const named = (r.sells ?? []).filter((t) => takenAwayElsewhere.has(began(t.rowId))).reduce((n, t) => n + t.shares, 0);
      const ask = Math.min(left, named);
      if (ask > EPS) { unassigned += ask; pending.set(r.accountId, (pending.get(r.accountId) ?? 0) + ask); left -= ask; }
    }
    if (askFor > EPS && left > EPS) {
      // the shares that came from a purchase taken away: a question while any purchase made by the sale's day could hold
      // them; the rest are sold beyond the record
      const free = mine.filter((p) => (p.arrived ?? p.date ?? '') <= day && p.shares - picked(p) > EPS).reduce((n, p) => n + p.shares - picked(p), 0) - (pending.get(r.accountId) ?? 0);
      const ask = Math.min(left, askFor);
      const asked = Math.min(ask, Math.max(free, 0));
      if (asked > EPS) { unassigned += asked; pending.set(r.accountId, (pending.get(r.accountId) ?? 0) + asked); }
      beyondAsked = ask - asked;
      left -= ask;
    }
    if (left > EPS) {
      // a sale dated on or before a list: that list is already net of it, so the sale takes first from the shares the
      // list no longer states — the broker's history's own purchases that list counted, or the shares an answer about
      // the list kept to show — oldest first, and only then from the purchases held
      // shares an answer kept to show stand for a sale that had NOT yet arrived when the account holder answered, or that
      // was still waiting for shares then: a sale that had its shares then keeps taking from the purchase it took from
      const history = shown.filter((p) => p.accountId === r.accountId && p.shares > EPS && (p.date ?? '') <= day && !afterList(p, p.inListOf)
        && (!p.leftByAnswer || instantOf(savedAt(r)) > instantOf(p.savedAt) || p.forSales.includes(began(r.rowId)))).sort(oldestLotFirst(record));
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
      const could = mine.filter((p) => ((p.arrived ?? p.date ?? '') <= day) && afterList(p, p.stillHeldOn) && p.shares - picked(p) > EPS).sort(oldestLotFirst(record));
      const predates = !could.length && (history.length > 0 || mine.some((p) => p.stillHeldOn != null && !afterList(p, p.stillHeldOn)));
      if (left <= EPS) {
        // every share the sale took is accounted for
      } else if (predates) {
        // the list is already net of this sale: it sold, oldest first, from the oldest tax lot that list states dated on or
        // before the sale — that lot is not reduced again; with none, the shares are before the list and not known
        const listed = mine.filter((p) => p.stillHeldOn != null && !afterList(p, p.stillHeldOn) && (p.date ?? '') <= day && p.movedInBy == null).sort(oldestLotFirst(record));
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
    left += beyondAsked;
    taken.push({ rowId: r.rowId, accountId: r.accountId, from, beyond: left > EPS ? left : 0, unassigned, beforeList, attributed });
  }
  return { lots: lots.filter((p) => p.shares > EPS), taken, everyLot: lots };
}

/** The purchases of one holding still held in one account, each on its own: its date, its price, the shares of it
 *  left — the oldest first, one with no date before the dated. Shares that reached the account by a transfer are
 *  listed as the purchases they came from. Shares a sale took that wait for the person's answer are still listed. */
/* ─ MK-NW-F-253 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * openPurchases
 *
 * Answers ..... The purchases of one holding still held in one account, each on its own: its date, its price, the shares of it left — the oldest first, one with no date before the dated.
 *
 * Formula .....
 *     w = walk holding(record, holding, up to)
 *     lots = lots where account id = account id.sort(oldest lot first(record))
 *     waiting = Σ over taken where account id = account id of (unassigned)
 *     the answer:
 *     Σ over waiting > EPS and lots of (shares)[]   if - waiting ≤ EPS
 *     lots   otherwise
 *
 * Called by ... MK-NW-F-201 fileRowsToSave · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-333 sharesToStated
 *               MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 17 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-333 sharesToStated · MK-NW-F-336 stillAsked
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-253
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function openPurchases(record: readonly AssetRow[], accountId: string, holding: string, upTo: string | null = null): OpenPurchase[] {
  // with a day: the purchases still held at the end of that day, before anything dated later
  const w = walkHolding(record, holding, upTo);
  const lots = w.lots.filter((p) => p.accountId === accountId).sort(oldestLotFirst(record));
  // where the sales waiting for "which tax lot" take every share that is left, nothing is open
  const waiting = w.taken.filter((t) => t.accountId === accountId).reduce((n, t) => n + t.unassigned, 0);
  return waiting > EPS && lots.reduce((n, p) => n + p.shares, 0) - waiting <= EPS ? [] : lots;
}

/** What each sale and transfer out of one account took, for one holding: the purchases it took shares from (with
 *  each purchase's price at that moment), the shares no purchase on record accounts for, and the shares waiting for
 *  the person to say which purchase they came from. */
/* ─ MK-NW-F-254 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sharesTakenBy
 *
 * Answers ..... What each sale and transfer out of one account took, for one holding: the purchases it took shares from (with each purchase's price at that moment), the shares no purchase on record accounts for, and the shares waiting for the person to say which purchase they came from.
 *
 * Formula .....
 *     walk holding(record, holding).taken where account id = account id
 *
 * Called by ... MK-NW-F-228 moveOldCopies · MK-NW-F-255 soldBeyondRecord
 *               MK-NW-F-256 salesNeedingAnAnswer · MK-NW-F-257 typedSalesTheListContradicts
 *               MK-NW-F-260 soldFrom · MK-NW-F-261 saleGain
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-314 listNamesTheSoldLot · MK-NW-F-319 listQuestionToAsk
 *
 * Reaches ..... 30 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-XS-F-307 composeNames
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-314 listNamesTheSoldLot · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-228 moveOldCopies · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-324 questionsOf · MK-NW-F-341 questionsStillTrue
 *               … and 12 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-254
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function sharesTakenBy(record: readonly AssetRow[], accountId: string, holding: string): SharesTaken[] {
  return walkHolding(record, holding).taken.filter((t) => t.accountId === accountId);
}

/** The sales and transfers out that took more shares than the purchases on record hold: each one, and the shares
 *  no purchase accounts for. An empty list means every share sold was a share on record. */
/* ─ MK-NW-F-255 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * soldBeyondRecord
 *
 * Answers ..... The sales and transfers out that took more shares than the purchases on record hold: each one, and the shares no purchase accounts for.
 *
 * Formula .....
 *     shares taken by(record, account id, holding) where beyond > EPSfor each of : row id = row id
 *     shares = beyond
 *
 * Called by ... MK-NW-F-324 questionsOf · MK-NW-F-336 stillAsked
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-336 stillAsked · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-255
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function soldBeyondRecord(record: readonly AssetRow[], accountId: string, holding: string): { rowId: string; shares: number }[] {
  return sharesTakenBy(record, accountId, holding).filter((t) => t.beyond > EPS).map((t) => ({ rowId: t.rowId, shares: t.beyond }));
}

/** THE SALES THE PERSON IS ASKED ABOUT (his ruling, 2026-11-10): each sale or transfer out that could have taken its
 *  shares from a purchase with no date, the shares in question, and the purchases to choose from. The answer is
 *  saved as a typed correction of the sale naming the purchases (correctRow with `sells`). */
/* ─ MK-NW-F-256 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * salesNeedingAnAnswer
 *
 * Answers ..... THE SALES THE PERSON IS ASKED ABOUT (his ruling, 2026-11-10): each sale or transfer out that could have taken its shares from a purchase with no date, the shares in question, and the purchases to choose from.
 *
 * Formula .....
 *     holdings = [...new set(rows in force(record).filter((r) => account id = account id and holding ≠ nothing and (kind = 'SALE' or kind = 'TRANSFER')).map((r) => holding as string))]
 *     sale = row as it stands(record, row id)
 *     lots = walk holding(record, holding).lots where account id = account id.sort(oldest lot first(record))
 *
 * Called by ... MK-NW-F-324 questionsOf · MK-NW-F-336 stillAsked
 *               MK-NW-F-341 questionsStillTrue · MK-XS-F-192 typedValueDatedBack
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-288 salesAskedAgain · MK-XS-F-307 composeNames
 *
 * Reaches ..... 13 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-XS-F-307 composeNames
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-341 questionsStillTrue · MK-XS-F-288 salesAskedAgain
 *               MK-XS-F-286 saveRecordMerging · MK-NW-F-336 stillAsked
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-256
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function salesNeedingAnAnswer(record: readonly AssetRow[], accountId: string): { rowId: string; holding: string; shares: number; choices: OpenPurchase[] }[] {
  const holdings = [...new Set(rowsInForce(record).filter((r) => r.accountId === accountId && r.holding != null && (r.kind === 'SALE' || r.kind === 'TRANSFER')).map((r) => r.holding as string))];
  return holdings.flatMap((holding) => sharesTakenBy(record, accountId, holding).filter((t) => t.unassigned > EPS)
    .map((t) => {
      const sale = rowAsItStands(record, t.rowId);
      // the choices are every purchase still holding shares, even where the questions waiting take all of them
      const lots = walkHolding(record, holding).lots.filter((p) => p.accountId === accountId).sort(oldestLotFirst(record));
      return { rowId: t.rowId, holding, shares: t.unassigned,
        choices: lots.filter((p) => sale?.date == null || (p.date ?? '') <= sale.date) };
    }));
}

/** THE SALES THE ACCOUNT HOLDER TYPED THAT A LATER LIST CONTRADICTS: a sale dated on or before a day the broker's
 *  list still stated the shares as held — a list that was taken in — with no purchase in the history to sell from.
 *  Nothing changes; each is a question for the account holder — the sale's date, or the list, is not right. A list
 *  that was NOT taken in because it contradicts a typed sale is asked by purchasesFromList itself; one taken in on the
 *  account holder's answer that still states the shares a typed sale sold is handed back here too. */
/* ─ MK-NW-F-257 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * typedSalesTheListContradicts
 *
 * Answers ..... THE SALES THE ACCOUNT HOLDER TYPED THAT A LATER LIST CONTRADICTS: a sale dated on or before a day the broker's list still stated the shares as held — a list that was taken in — with no purchase in the history to sell from.
 *
 * Formula .....
 *     in force = rows in force(record)
 *     holdings = [...new set(in force.filter((r) => account id = account id and holding ≠ nothing and kind = 'SALE' and source = 'typed').map((r) => holding as string))]
 *     sale = row as it stands(record, row id)
 *     []   when sale is missing (or sale.source ! = 'typed' when missing or zero)
 *     [{ row id: row id, holding, shares: before list + attributed }]   when before list + attributed > EPS
 *     bought = row as it stands(record, row id)
 *     the answer:
 *     [{ row id: row id, holding, shares: restated }]   if restated > EPS
 *     []   otherwise
 *
 * Called by ... MK-NW-F-324 questionsOf · MK-NW-F-336 stillAsked
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-336 stillAsked · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-257
 * Changed ..... 2026-11-11 (a6679cea)
 */
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
/* ─ MK-NW-F-258 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * saleRow
 *
 * Answers ..... A sale as it is saved: on its own date, at its own price, its shares without a minus sign.
 *
 * Formula .....
 *     shares = size of(shares)
 *
 * Called by ... MK-NW-F-193 eventRow · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-217 transactionRow · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-193 eventRow
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-228 moveOldCopies
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-217 transactionRow
 *               MK-NW-F-224 typedChangeToRecord · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-258
 * Changed ..... 2026-11-11 (70d29ae8)
 */
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
/* ─ MK-NW-F-259 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * transferRow
 *
 * Answers ..... Shares moved from one account to another, as ONE row.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-217 transactionRow · MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-217 transactionRow · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-259
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function transferRow(t: {
  fromAccountId: string; toAccountId: string; holding: string; date: string | null; shares: number; source: RowSource;
  sells?: { rowId: string; shares: number }[]; ref?: string;
}): NewRow {
  return { accountId: t.fromAccountId, toAccountId: t.toAccountId, holding: t.holding, kind: 'TRANSFER', date: t.date, shares: Math.abs(t.shares),
    source: t.source, ...(t.ref ? { ref: t.ref } : {}), ...(t.sells?.length ? { sells: t.sells } : {}) };
}

/** The purchases a sale sold, and how many shares of each. */
/* ─ MK-NW-F-260 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * soldFrom
 *
 * Answers ..... The purchases a sale sold, and how many shares of each.
 *
 * Formula .....
 *     sale = row as it stands(record, sale row id)
 *     []   when sale is missing (or sale.holding = nothing when missing or zero)
 *     t = shares taken by(record, sale.account id, sale.holding).find((x) => row id = sale.row id)
 *     the answer:
 *     for each of from (or none when missing): row id = row id
 *     shares = shares
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-260
 * Changed ..... 2026-11-11 (70d29ae8)
 */
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
/* ─ MK-NW-F-261 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * saleGain
 *
 * Answers ..... What a sale made, before fees: for each purchase it sold, the shares sold × (the sale's price − that purchase's price, as any split before the sale left it).
 *
 * Formula .....
 *     sale = row as it stands(record, sale row id)
 *     nothing   when sale is missing (or sale.kind ! = 'SALE' (or sale.price = nothing (or sale.holding = nothing when missing or zero) when missing or zero) when missing or zero)
 *     t = shares taken by(record, sale.account id, sale.holding).find((x) => row id = sale.row id)
 *     nothing   when count of t is missing (or beyond > EPS (or unassigned > EPS (or before list > EPS (or from is missing when missing or zero) when missing or zero) when missing or zero) when missing or zero)
 *     gain = 0
 *     nothing   when price = nothing
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-228 moveOldCopies · MK-NW-F-272 salesMovedBy
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-319 listQuestionToAsk
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-324 questionsOf · MK-NW-F-272 salesMovedBy
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · Uses a built-in gain of 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-261
 * Changed ..... 2026-11-11 (70d29ae8)
 */
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
/* ─ MK-NW-F-262 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * sharesOnRecord
 *
 * Answers ..... The shares of a holding the purchases, splits, transfers and sales on record add up to in one account — up to a given day, where one is given.
 *
 * Formula .....
 *     w = walk holding(record, holding, up to)
 *
 * Called by ... MK-NW-F-193 eventRow · MK-NW-F-194 brokerUpdateToRecord
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-205 priceFeedValues
 *               MK-NW-F-224 typedChangeToRecord · MK-NW-F-263 sharesThatDisagree
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-284 activityOf · MK-NW-F-287 splitOf
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-333 sharesToStated · MK-NW-F-335 writeAnswer
 *               MK-NW-F-338 newerListUndoes · MK-NW-F-340 oneQuestionPerExercise
 *
 * Reaches ..... 28 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf · MK-NW-F-289 activityRefs
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-194 brokerUpdateToRecord
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-193 eventRow
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-228 moveOldCopies · MK-NW-F-338 newerListUndoes
 *               MK-NW-F-340 oneQuestionPerExercise · MK-NW-F-205 priceFeedValues
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-277 purchasesFromList
 *               … and 10 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-262
 * Changed ..... 2026-11-11 (a6679cea)
 */
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
/* ─ MK-NW-F-263 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * sharesThatDisagree
 *
 * Answers ..... Where the purchases and sales on record do not add up to the shares stated by the latest values the broker, a file or the person gave (a gap the account holder already answered "mine is correct" for is not flagged again): the holding, the two counts, and the gap.
 *
 * Formula .....
 *     now = values last given(record, account id)
 *     []   when now is missing
 *     stated = new map<string, number>(), unknown = new set<string>()
 *     names = [...new set([...stated.keys(), ...mine])] where !unknown.has(each)
 *     answered gaps = new map<string, number[]>()
 *     gap = facts.holding gap as number   if facts.holding gap is a number
 *     (facts.keeps over list as string).split('|').pop() read as a number   otherwise
 *     away = Σ over kept away by event(record, account id, h) of (shares (or 0 when missing))
 *     on record = shares on record(record, account id, holding, now.date), says = stated.get(holding) (or 0 when missing)
 *     the answer:
 *     holding = holding
 *     on record = on record
 *     stated = says
 *     gap = says − on record
 *
 * Called by ... MK-NW-F-324 questionsOf · MK-NW-F-336 stillAsked
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-336 stillAsked · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-263
 * Changed ..... 2026-11-11 (a6679cea)
 */
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
    // the whole holding's gap when the answer was given; an older answer kept only its own difference's gap
    const gap = typeof r.facts.holdingGap === 'number' ? r.facts.holdingGap as number : Number((r.facts.keepsOverList as string).split('|').pop());
    if (Number.isFinite(gap)) answeredGaps.set(r.holding, [...(answeredGaps.get(r.holding) ?? []), gap]);
  }
  // purchases taken away and kept away when the broker sent them again: the shares the broker states for them are answered
  for (const h of names) {
    const away = keptAwayByEvent(record, accountId, h).reduce((t, r) => t + (r.shares ?? 0), 0);
    if (away > EPS) answeredGaps.set(h, [...(answeredGaps.get(h) ?? []), away]);
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
/* ─ MK-NW-F-264 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * lastListDay
 *
 * Answers ..... The latest day a broker's or a file's list was taken into the record for one holding of one account: the latest day any of its purchases was stated by a list as still held.
 *
 * Formula .....
 *     h = one holding spelling(holding)
 *     days = record where account id = account id and holding = H and kind = 'PURCHASE' and still held onfor each of : still held on as string
 *     the answer:
 *     days.reduce((a, b) => (a > b ? a : b))   if count of days
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-265 historyPurchaseRow · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-321 latestListDayOf · MK-NW-F-324 questionsOf
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-193 eventRow
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-265 historyPurchaseRow
 *               MK-NW-F-321 latestListDayOf · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-324 questionsOf · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-264
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function lastListDay(record: readonly AssetRow[], accountId: string, holding: string): string | null {
  const H = oneHoldingSpelling(holding);
  const days = record.filter((r) => r.accountId === accountId && r.holding === H && r.kind === 'PURCHASE' && r.stillHeldOn).map((r) => r.stillHeldOn as string);
  return days.length ? days.reduce((a, b) => (a > b ? a : b)) : null;
}

/** A purchase from a broker's history, as it is saved. Dated on or before the latest day the broker's list was taken
 *  into the record (or with no date, where there is such a list) it is marked as already counted in that list: it
 *  adds no shares, and is kept to show and to say what the sales before the list made. Dated after that day — or
 *  where no list has been taken in — it is a new transaction, and adds its shares. */
/* ─ MK-NW-F-265 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * historyPurchaseRow
 *
 * Answers ..... A purchase from a broker's history, as it is saved.
 *
 * Formula .....
 *     day = day or null(date), list = last list day(record, account id, holding)
 *     shares = size of(shares)
 *
 * Called by ... MK-NW-F-193 eventRow
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-193 eventRow
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · Uses a built-in n e a r b y d a y s of 5.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-265
 * Changed ..... 2026-11-11 (70d29ae8)
 */
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
/* ─ MK-NW-F-266 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * listAnswered
 *
 * Answers ..... True where the account holder already answered a question about a broker's list that set this purchase against a tax lot of this date — either answer settles the same difference when the broker's history then sends it.
 *
 * Formula .....
 *     false   when on record.kind ! = 'PURCHASE'
 *     first = first row of(record), id = first(on record.row id).row id (or on record.row id when missing)
 *
 * Called by ... MK-NW-F-238 sortArriving
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-266
 * Changed ..... not in git yet (—)
 */
function listAnswered(record: readonly AssetRow[], onRecord: AssetRow, day: string): boolean {
  if (onRecord.kind !== 'PURCHASE') return false;
  const first = firstRowOf(record), id = first(onRecord.rowId)?.rowId ?? onRecord.rowId;
  // only an answer still standing: an answer undone (design v02, rule 2) answers nothing
  return rowsInForce(record).some((r) => r.kind === 'FACT' && r.source === 'typed' && r.accountId === onRecord.accountId && r.holding === onRecord.holding
    && typeof r.facts?.keepsOverList === 'string' && (() => { const [, ids, dates] = (r.facts?.keepsOverList as string).split('|'); return ids.split(',').includes(id) && dates.split(',').includes(day); })());
}
/** How many days lie between two dates, whichever comes first. */
/* ─ MK-NW-F-267 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * daysFromOneDateToAnother
 *
 * Answers ..... How many days lie between two dates, whichever comes first.
 *
 * Formula .....
 *     size of(date.parse(a) − date.parse(b)) ÷ 86400000
 *
 * Called by ... MK-NW-F-238 sortArriving · MK-NW-F-270 sameEventElsewhere
 *               MK-NW-F-275 besideTheList
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-267
 * Changed ..... not in git yet (—)
 */
const daysFromOneDateToAnother = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
/** What makes an arriving row the same event as one already saved: the source's own reference, or its kind, date, holding, shares, price and amount. */
/* ─ MK-NW-F-268 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * arrivingKey
 *
 * Answers ..... What makes an arriving row the same event as one already saved: the source's own reference, or its kind, date, holding, shares, price and amount.
 *
 * Formula .....
 *     ref (or [kind, day or null(date) ?? '', one holding spelling(holding) ?? '', shares = nothing ? '' : math.abs(shares), price ?? '', amount ?? ''].join('|') when missing)
 *
 * Called by ... MK-NW-F-238 sortArriving
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-268
 * Changed ..... not in git yet (—)
 */
const arrivingKey = (r: NewRow) => r.ref ?? [r.kind, dayOrNull(r.date) ?? '', oneHoldingSpelling(r.holding) ?? '', r.shares == null ? '' : Math.abs(r.shares), r.price ?? '', r.amount ?? ''].join('|');
/** The answers the account holder has given about arriving events: by pair, "mine" or "both". */
/* ─ MK-NW-F-269 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * eventAnswers
 *
 * Answers ..... The answers the account holder has given about arriving events: by pair, "mine" or "both".
 *
 * Formula .....
 *     out = new map<string, string>()
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-238 sortArriving
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-269
 * Changed ..... not in git yet (—)
 */
function eventAnswers(record: readonly AssetRow[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of rowsInForce(record)) if (r.kind === 'FACT' && r.source === 'typed' && typeof r.facts?.eventPair === 'string') out.set(r.facts.eventPair as string, String(r.facts.eventAnswer));
  return out;
}

/** The on-record events an arriving event could be the same as: another source, the same account, kind, holding and
 *  shares (with no shares: the same amount), the same way round, dated the same day or up to five days away. */
/* ─ MK-NW-F-270 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sameEventElsewhere
 *
 * Answers ..... The on-record events an arriving event could be the same as: another source, the same account, kind, holding and shares (with no shares: the same amount), the same way round, dated the same day or up to five days away.
 *
 * Formula .....
 *     h = nothing   if one holding spelling(holding), day = day or null(date), shares = shares = nothing
 *     size of(shares)   otherwise
 *     []   when day = nothing
 *     undated twin = (x: asset row) => date = nothing and kind = 'PURCHASE' and kind = 'PURCHASE' and price ≠ nothing and same number(price, price)
 *
 * Called by ... MK-NW-F-238 sortArriving
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-270
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-271 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * eventsThatDiffer
 *
 * Answers ..... AN EVENT THAT ARRIVES AND DIFFERS FROM WHAT THE RECORD HOLDS — a question for the account holder, never saved beside the other (his ruling, 2026-11-11: in every difference the account holder is asked which is correct): what sortArriving says to ask, for the same rows.
 *
 * Formula .....
 *     sort arriving(record, rows).ask
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-271
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function eventsThatDiffer(record: readonly AssetRow[], rows: readonly NewRow[]): EventQuestion[] {
  return sortArriving(record, rows).ask;
}

/** The past sales an answer of "theirs" would move, each with what it made now and what it would make. */
/* ─ MK-NW-F-272 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * salesMovedBy
 *
 * Answers ..... The past sales an answer of "theirs" would move, each with what it made now and what it would make.
 *
 * Formula .....
 *     []   when on record.kind ! = 'PURCHASE' (or on record.holding = nothing when missing or zero)
 *     after = add rows(record, answer event question(q, 'theirs', record), '9999 − 12 − 31T00:00:00.000Z')
 *
 * Called by ... MK-NW-F-317 eventQuestionToAsk
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-272
 * Changed ..... 2026-11-11 (a6679cea)
 */
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
/* ─ MK-NW-F-273 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * answerEventQuestion
 *
 * Answers ..... THE ACCOUNT HOLDER'S ANSWER ABOUT AN ARRIVING EVENT, as rows to save.
 *
 * Formula .....
 *     without = record where not (kind = 'FACT' and facts.event pair = asked.key)
 *     q = sort arriving(without, [asked.arriving]).ask.find((x) => key = asked.key)   if count of record
 *     asked   otherwise
 *     []   when q is missing
 *     remember = account id = on record.account id
 *     holding = on record.holding
 *     kind = 'FACT'
 *     date = nothing
 *     source = 'typed'
 *     facts = event pair = key
 *     event answer = answer
 *     back = arriving
 *     h = one holding spelling(back.holding), day = day or null(back.date)
 *     the answer = [{ ...remember, facts: { event pair: key, event answer: 'both' } }, back]
 *
 * Called by ... MK-NW-F-237 sameNumber · MK-NW-F-272 salesMovedBy
 *               MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-273
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function answerEventQuestion(asked: EventQuestion, answer: 'theirs' | 'mine' | 'both', record: readonly AssetRow[] = []): NewRow[] {
  // given the record, the question is asked again of it as it stands: already answered, or settled since, nothing changes
  // a changed answer ("mine" after "theirs") is answerQuestion's: it undoes the earlier answer first (design v02, rule 2)
  const without = record.filter((r) => !(r.kind === 'FACT' && r.facts?.eventPair === asked.key));
  const q = record.length ? sortArriving(without, [asked.arriving]).ask.find((x) => x.key === asked.key) : asked;
  if (!q) return [];
  const remember: NewRow = { accountId: q.onRecord.accountId, holding: q.onRecord.holding, kind: 'FACT', date: null, source: 'typed', facts: { eventPair: q.key, eventAnswer: answer } };
  // "mine" on a purchase also stands against the broker's list stating that purchase under the arriving date
  if (answer === 'mine') return [q.onRecord.kind === 'PURCHASE' && dayOrNull(q.arriving.date) != null
    ? { ...remember, facts: { ...remember.facts, keepsDateOverList: `${q.key.split('|')[0]}|${dayOrNull(q.arriving.date)}`,
      ...(q.why === 'price' ? { keepsPriceOverList: `${dayOrNull(q.arriving.date)}|${Math.abs(q.arriving.shares ?? 0)}@${q.arriving.price}` } : {}) } } : remember];
  if (answer === 'both' || q.why === 'taken-away') {   // an event taken away comes back only on the account holder's word
    let back = q.arriving;
    // a purchase brought back holds its shares again, unless a tax lot on record still holds them (then, like any
    // purchase of the history on or before the list's day, it adds none)
    if (q.why === 'taken-away' && back.kind === 'PURCHASE' && back.inListOf) {
      const H = oneHoldingSpelling(back.holding), day = dayOrNull(back.date);
      const lotHolds = rowsInForce(record).some((x) => x.kind === 'PURCHASE' && x.accountId === back.accountId && x.holding === H && !x.inListOf
        && x.date === day && sameNumber(x.shares, back.shares == null ? null : Math.abs(back.shares)));
      if (!lotHolds) { const { inListOf: _i, ...rest } = back; back = rest; }
    }
    return [{ ...remember, facts: { eventPair: q.key, eventAnswer: 'both' } }, back];
  }
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

/** Whether two share counts are the same to a billionth. */
/* ─ MK-NW-F-274 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * sameShares
 *
 * Answers ..... Whether two share counts are the same to a billionth.
 *
 * Formula .....
 *     size of(a − b) ≤ EPS
 *
 * Called by ... MK-NW-F-263 sharesThatDisagree · MK-NW-F-275 besideTheList
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-314 listNamesTheSoldLot · MK-NW-F-324 questionsOf
 *               MK-NW-F-340 oneQuestionPerExercise
 *
 * Reaches ..... 19 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-275 besideTheList · MK-NW-F-194 brokerUpdateToRecord
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-314 listNamesTheSoldLot
 *               MK-NW-F-338 newerListUndoes · MK-NW-F-340 oneQuestionPerExercise
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-324 questionsOf · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-263 sharesThatDisagree · MK-NW-F-336 stillAsked
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               … and 1 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-274
 * Changed ..... not in git yet (—)
 */
const sameShares = (a: number, b: number) => Math.abs(a - b) <= EPS;

/** The purchases of a holding the account holder took away and then, asked about the broker sending them again,
 *  answered "mine is correct" (kept away): one removal raises two questions, and either answer settles both. */
/* ─ MK-NW-F-293 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * keptAwayByEvent
 *
 * Answers ..... The purchases of a holding the account holder took away and then, asked about the broker sending them again, answered "mine is correct" (kept away): one removal raises two questions, and either answer settles both.
 *
 * Formula .....
 *     by id = a lookup of for each of record: [row id, each]
 *     out = []
 *     id = (facts.event pair as string).split('|')[0], r = by id.get(id)
 *     the answer = out
 *
 * Called by ... MK-NW-F-263 sharesThatDisagree · MK-NW-F-277 purchasesFromList
 *
 * Reaches ..... 16 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-324 questionsOf
 *               MK-NW-F-341 questionsStillTrue · MK-NW-F-263 sharesThatDisagree
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-293
 * Changed ..... not in git yet (—)
 */
function keptAwayByEvent(record: readonly AssetRow[], accountId: string, holding: string): AssetRow[] {
  const byId = new Map(record.map((r) => [r.rowId, r]));
  const out: AssetRow[] = [];
  for (const f of rowsInForce(record)) {
    if (f.kind !== 'FACT' || f.source !== 'typed' || f.facts?.eventAnswer !== 'mine' || typeof f.facts?.eventPair !== 'string') continue;
    const id = (f.facts.eventPair as string).split('|')[0], r = byId.get(id);
    if (r && r.kind === 'PURCHASE' && r.accountId === accountId && r.holding === holding && rowAsItStands(record, id) == null && !out.includes(r)) out.push(r);
  }
  return out;
}
/** True where the account holder answered "mine is correct" to a list's question about a purchase they took away, for
 *  this holding and this date: the broker's history sending that purchase again is the same difference, already answered. */
/* ─ MK-NW-F-294 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * removalKept
 *
 * Answers ..... True where the account holder answered "mine is correct" to a list's question about a purchase they took away, for this holding and this date: the broker's history sending that purchase again is the same difference, already answered.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-238 sortArriving
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-343 lotChange
 *               MK-NW-F-221 lotsFollow · MK-XS-F-282 mergeRecord
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-294
 * Changed ..... not in git yet (—)
 */
function removalKept(record: readonly AssetRow[], accountId: string, holding: string | null, day: string): boolean {
  return rowsInForce(record).some((r) => r.kind === 'FACT' && r.source === 'typed' && r.accountId === accountId && r.holding === holding
    && typeof r.facts?.keepsOverList === 'string' && (r.facts.keepsOverList as string).startsWith('removed|')
    && ((r.facts.keepsOverList as string).split('|')[2] ?? '').split(',').includes(day));
}

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
  kind: 'typed' | 'removed' | 'not-listed' | 'price' | 'count'
    /** sold-from (L6): the list and the record differ only by which purchase a sale that names none sold from ·
     *  expired (X1): an option past its expiry left the list, and no sale is on record · exercised (X2): in one update an
     *  option left the list and its shares arrived (design v02, 2026-11-12). */
    | 'sold-from' | 'expired' | 'exercised';
  /** On sold-from: each sale that names no purchase, and the purchases the list says it sold from. */
  sales?: { rowId: string; shares: number; sells: { rowId: string; shares: number }[] }[];
  /** On expired and exercised: the option's expiry date, and, on exercised, the holding whose shares arrived. */
  expiry?: string;
  arrivedHolding?: string;
  arrivedShares?: number;
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
  /** The shares the whole list states for the holding less the shares on record, when asked: an answer of "mine is
   *  correct" covers its difference only while the holding as a whole is apart by this same number. */
  holdingGap?: number;
}

/** Set a broker's or a file's list beside the purchases still held. A listed tax lot is already held where an open
 *  purchase carries its date (as first given, or as it stands; a date that could not be read, by the date as given;
 *  no date, by having none) AND the same shares. Of the rest, a listed tax lot and a purchase under one date are the
 *  same purchase with two share counts, and a listed tax lot and a purchase of the same shares dated up to five days
 *  apart are the same purchase with two dates. What is left is a tax lot the record does not hold, or a purchase the
 *  list does not state. */
/* ─ MK-NW-F-275 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * besideTheList
 *
 * Answers ..... Set a broker's or a file's list beside the purchases still held.
 *
 * Formula .....
 *     pool = [...open]
 *     as given = (p: open purchase) => row as it stands(record, row id).date as given (or nothing when missing)
 *     day = day or null(date)
 *     held = [], differ: { p: open purchase; l: listed purchase }[] = []
 *     rest = [], not held: listed purchase[] = []
 *     first = []
 *     i = pool.find index((p) => under(p, l) and same shares(shares, shares) and (price = nothing or price = nothing or same number(price, price)))
 *     i = pool.find index((p) => under(p, l) and same shares(shares, shares))
 *     still = []
 *     i = pool.find index((p) => under(p, l))
 *     day = day or null(date)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-277 purchasesFromList
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-275
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-276 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * replacedPurchase
 *
 * Answers ..... A purchase marked as replaced: it keeps only the shares already sold from it, so each earlier sale keeps what it made; with none sold it is taken away.
 *
 * Formula .....
 *     row = row as it stands(record, row id)
 *     nothing   when row is missing (or moved in by ≠ nothing when missing or zero)
 *     sold = (row.shares ?? 0) − shares ÷ split by
 *
 * Called by ... MK-NW-F-277 purchasesFromList
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-276
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-277 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * purchasesFromList
 *
 * Answers ..... WHAT A BROKER'S UPDATE OR A FILE DOES TO THE PURCHASES OF ONE HOLDING.
 *
 * Formula .....
 *     h = one holding spelling(holding) as string
 *     still held on = day or null(list day)
 *     as of = still held on   if later on record
 *     nothing   otherwise
 *     open = open purchases(record, account id, H, as of)
 *     valid = listed where shares > 0
 *     lots = valid where average is missing, average lines = valid where average
 *     rows = [], ask: list question[] = []
 *     shares on rec = Σ over on record of (shares)Σ over , shares listed = states of (shares)
 *     kept mine = new map<string, (number | undefined)[]>()
 *     sig = facts.holding gap as number   if facts.keeps over list as string, gap = typeof facts.holding gap = 'number'
 *     undefined   otherwise
 *     covered = (sig: string) => (kept mine.get(sig) ?? []).some((g) => g = nothing or same shares(g, holding gap))
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-201 fileRowsToSave · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-289 activityRefs · MK-NW-F-336 stillAsked
 *               MK-NW-F-338 newerListUndoes · MK-NW-F-341 questionsStillTrue
 *               MK-XS-F-192 typedValueDatedBack · MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 13 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-341 questionsStillTrue · MK-NW-F-336 stillAsked
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-277
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function purchasesFromList(
  record: readonly AssetRow[], accountId: string, holding: string, listed: readonly ListedPurchase[], source: RowSource, listDay: string | null,
  askedAlready: readonly EventQuestion[] = [], includeAnswered = false,
): { rows: NewRow[]; ask: ListQuestion[] } {
  const H = oneHoldingSpelling(holding) as string;
  const stillHeldOn = dayOrNull(listDay);
  // a list says what was held on its own day: it is set beside the record as of that day, so a sale, a purchase or a split
  // the record holds dated after it is not contradicted by it (the tax lots have not caught up yet)
  const laterOnRecord = stillHeldOn != null && rowsInForce(record).some((r) => r.accountId === accountId && r.holding === H && r.date != null && r.date > stillHeldOn
    && (r.kind === 'SALE' || r.kind === 'PURCHASE' || r.kind === 'SPLIT' || (r.kind === 'TRANSFER' && (r.shares ?? 0) > 0)));
  const asOf = laterOnRecord ? stillHeldOn : null;
  const open = openPurchases(record, accountId, H, asOf);
  const valid = listed.filter((l) => l.shares > 0);
  const lots = valid.filter((l) => !l.average), averageLines = valid.filter((l) => l.average);
  const asRow = (l: ListedPurchase): NewRow => ({ accountId, holding: H, kind: 'PURCHASE', date: l.date, shares: l.shares, price: l.price, source,
    amount: l.price != null ? l.shares * l.price : null, ...(stillHeldOn ? { stillHeldOn } : {}), ...(l.average ? { averageOnly: true } : {}) });
  const rows: NewRow[] = [], ask: ListQuestion[] = [];
  const question = (kind: ListQuestion['kind'], onRecord: OpenPurchase[], states: ListedPurchase[], signature?: string) => {
    const sharesOnRec = onRecord.reduce((t, p) => t + p.shares, 0), sharesListed = states.reduce((t, l) => t + l.shares, 0);
    ask.push({ accountId, holding: H, kind, onRecord, sharesOnRecord: sharesOnRec, listed: states, sharesListed, listedAll: [...listed], listDay, source, holdingGap,
      signature: signature ?? `${kind === 'typed' || kind === 'not-listed' ? 'list' : kind}|${onRecord.map((p) => p.firstRowId).sort().join(',')}|${states.map((l) => l.date ?? '').sort().join(',')}|${sharesListed - sharesOnRec}` });
  };
  // each "mine is correct" answer, with how far apart the whole holding was when it was given: it covers its own
  // difference only while the holding is apart by that same number — a change elsewhere (another answer, a lot) that
  // moves the record against the list is a difference no standing answer covers, and is asked
  const keptMine = new Map<string, (number | undefined)[]>();
  for (const r of rowsInForce(record)) if (r.kind === 'FACT' && r.accountId === accountId && r.holding === H && r.source === 'typed' && typeof r.facts?.keepsOverList === 'string') {
    const sig = r.facts.keepsOverList as string, gap = typeof r.facts.holdingGap === 'number' ? r.facts.holdingGap as number : undefined;
    keptMine.set(sig, [...(keptMine.get(sig) ?? []), gap]);
  }
  if (includeAnswered) keptMine.clear();
  const covered = (sig: string) => (keptMine.get(sig) ?? []).some((g) => g == null || sameShares(g, holdingGap));
  const done = () => ({ rows, ask: ask.filter((q) => !covered(q.signature)) });
  const onRecordAlready = sharesOnRecord(record, accountId, H, asOf);
  let holdingGap = valid.reduce((t, l) => t + l.shares, 0) - onRecordAlready;
  if (askedAlready.some((q) => q.why === 'ratio' && q.onRecord.holding === H)) return { rows: [], ask: [] };
  // X1 (design v02, rule 6): an option past its expiry that the list no longer states, with no sale on record, is one
  // question — did it expire worthless — never a question about a list
  if (!valid.length && open.length && stillHeldOn != null) {
    const expiry = optionExpiryOf(record, accountId, H);
    if (expiry != null && expiry <= stillHeldOn && open.every((p) => p.movedInBy == null)) {
      question('expired', open, [], `expired|${open.map((p) => p.firstRowId).sort().join(',')}`);
      ask[ask.length - 1].expiry = expiry;
      return done();
    }
  }
  // every purchase the record holds for the holding that holds, or held, shares
  const everything = rowsInForce(record).filter((r) => r.accountId === accountId && r.holding === H && r.kind === 'PURCHASE' && !r.inListOf);
  const everHeld = everything.length > 0 || open.length > 0;
  const tookAway = (l: ListedPurchase) => record.some((r) => r.removed && !r.byAnswer && r.source === 'typed' && r.kind === 'PURCHASE' && r.accountId === accountId
    && r.holding === H && r.date === dayOrNull(l.date));
  const last = lastListDay(record, accountId, H);
  // sales still waiting for the account holder to say which tax lot they sold: while the shares on record (those sales
  // counted as sold) agree with the list, the difference is that question, not a question about the list
  const waitingForAnAnswer = (asOf ? walkHolding(record, H, asOf).taken.filter((t) => t.accountId === accountId) : sharesTakenBy(record, accountId, H)).reduce((n, t) => n + t.unassigned, 0);
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
    // a tax lot of a purchase the account holder took away and kept away when the history sent it again: answered
    const keptAway = keptAwayByEvent(record, accountId, H);
    for (let i = notHeld.length - 1; i >= 0; i--) {
      const l = notHeld[i], j = keptAway.findIndex((r) => r.date === dayOrNull(l.date) && sameShares(r.shares ?? 0, l.shares));
      if (j >= 0 && tookAway(l)) { holdingGap -= l.shares; keptAway.splice(j, 1); notHeld.splice(i, 1); }
    }
    // a tax lot this list adds as a new purchase (dated after the last list taken in, or a purchase the history holds on
    // that list's own day) is no gap: it is set aside before a standing answer is weighed against the holding
    holdingGap -= notHeld.filter((l) => {
      const d = dayOrNull(l.date);
      return d != null && !tookAway(l) && ((last != null && d > last) || rowsInForce(record).some((r) => r.accountId === accountId && r.holding === H
        && r.kind === 'PURCHASE' && r.inListOf === d && r.date === d && r.source !== 'typed' && sameShares(r.shares ?? 0, l.shares)));
    }).reduce((t, l) => t + l.shares, 0);
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
    // L6 (design v02, rule 3): the list and the record differ only by which purchase one sale that names none sold from —
    // the same purchases, the same shares in all, each listed lot no larger than its purchase — the list names the lot
    const soldFromPairs = !notHeld.length && !notListed.length ? listNamesTheSoldLot(record, accountId, H, differ, asOf) : null;
    if (soldFromPairs) {
      question('sold-from', soldFromPairs.pairs.map((d) => d.p), soldFromPairs.pairs.map((d) => d.l),
        `sold|${soldFromPairs.pairs.map((d) => d.p.firstRowId).sort().join(',')}|${soldFromPairs.sales.map((x) => firstRowOf(record)(x.rowId)?.rowId ?? x.rowId).sort().join(',')}`);
      ask[ask.length - 1].sales = soldFromPairs.sales;
    }
    const unansweredPairs = differ.filter((d) => !explained.includes(d) && !soldFromPairs?.pairs.includes(d) && !covered(pairSignature(d))
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
      // over a purchase the account holder typed, the first average a broker states is set against what was typed: a
      // difference is asked on the first link, never kept in silence until the broker's average moves
      const typedCost = open.some((p) => p.ownEntry && p.source === 'typed') && open.every((p) => p.price != null)
        ? open.reduce((t, p) => t + p.shares * (p.price as number), 0) / shares : null;
      if (wasPrice == null && typedCost != null && Math.abs(typedCost - line.price) >= 0.005) question('price', open, [line], `price|average|${shares}@${line.price}`);
      else if (wasPrice == null || statedShares == null || !sameShares(statedShares, shares)) { if (wasPrice == null || !sameNumber(wasPrice, line.price)) rows.push(restate); }
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
/* ─ MK-NW-F-278 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * answerListQuestion
 *
 * Answers ..... THE ACCOUNT HOLDER'S ANSWER TO A LIST QUESTION, as rows to save.
 *
 * Formula .....
 *     []   when q is missing
 *     still held on = day or null(list day)
 *     out = []
 *     row = row as it stands(record, sale.row id)
 *     the answer = out
 *     out   when kind = 'expired' (or kind = 'exercised' when missing or zero)
 *     gap shares = shares listed − shares on record
 *     less = -gap shares
 *     raised by hand = (p: open purchase) => { const row = row as it stands(record, row id); return row.source = 'typed' and !own entry ? 0 : 1; }
 *     row = row as it stands(record, row id)
 *     take = min(shares, less); less -= take
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-278
 * Changed ..... 2026-11-11 (a6679cea)
 */
export function answerListQuestion(record: readonly AssetRow[], asked: ListQuestion, listIsCorrect: boolean, source: RowSource, listDay: string | null): NewRow[] {
  // the question is asked again of the record as it stands now: settled since, or already answered, nothing changes
  // (an answer already given may be changed: "mine" first, "the list is correct" later)
  const q = purchasesFromList(record, asked.accountId, asked.holding, asked.listedAll ?? asked.listed, asked.source ?? source, asked.listDay ?? listDay, [], listIsCorrect).ask
    .find((x) => x.signature === asked.signature);
  if (!q) return [];
  if (!listIsCorrect) return [{ accountId: q.accountId, holding: q.holding, kind: 'FACT', date: null, source: 'typed',
    facts: { keepsOverList: q.signature, ...(q.holdingGap != null ? { holdingGap: q.holdingGap } : {}) } }];
  const stillHeldOn = dayOrNull(listDay);
  const out: NewRow[] = [];
  // L6: "the list is correct" names the purchase each sale sold from; no shares change (design v02, rule 3)
  if (q.kind === 'sold-from') {
    for (const sale of q.sales ?? []) {
      const row = rowAsItStands(record, sale.rowId);
      if (!row) continue;
      const { rowId: _n, writtenAt: _w, ...rest } = row;
      out.push({ ...rest, sells: sale.sells, source: 'typed', replacesRowId: row.rowId, changed: ['sells'] });
    }
    return out;
  }
  // an option's expiry or exercise is answered by answerQuestion (X1, X2); a list's answer writes nothing for it
  if (q.kind === 'expired' || q.kind === 'exercised') return out;
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
    for (const p of [...q.onRecord].sort((a, b) => raisedByHand(a) - raisedByHand(b) || oldestLotFirst(record)(a, b))) {
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
    // the broker's average restates a purchase given only as an average — and, where the account holder typed the holding
    // as one undated purchase of the same shares, that purchase (the account holder said the list is correct)
    const onlyOne = q.onRecord.length === 1 && q.onRecord[0].date == null && sameShares(q.onRecord[0].shares, l.shares);
    for (const p of q.onRecord.filter((x) => (x.averageOnly && x.source !== 'typed') || onlyOne)) {
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
  for (const p of [...q.onRecord].sort(oldestLotFirst(record))) { const g = Math.min(p.shares, gap); goneOf.set(p, g); gap -= g; }
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
/* ─ MK-NW-F-279 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * differsFromGiven
 *
 * Answers ..... WHERE WHAT THE ACCOUNT HOLDER IS ABOUT TO ENTER DIFFERS FROM WHAT A BROKER OR A FILE GAVE: each figure, as given and as entered — for the confirmation the account holder sees before the change is saved (his words, 2026-11-11: "The information from Robinhood indicates price of 350, you entered 320.
 *
 * Formula .....
 *     now = row as it stands(record, row id)
 *     []   when now is missing
 *     first = first row of(record), began = first(now.row id).row id
 *     versions = record where (first(row id).row id ?? row id) = began and !removed
 *     given = [...versions].reverse().find((r) => source ! = 'typed')
 *     []   when given is missing
 *     split = split by of(record, now)   if now.kind = 'PURCHASE' and now.holding ≠ nothing
 *     1   otherwise
 *     shown of = date = given.date (or nothing when missing)
 *     price = nothing   if given.price = nothing
 *     given.price ÷ split   otherwise
 *     shares = nothing   if given.shares = nothing
 *     given.shares × split   otherwise
 *     amount = given.amount (or nothing when missing)
 *     lot = open purchases(record, now.account id, now.holding).find((p) => first row id = began)   if now.kind = 'PURCHASE' and now.holding ≠ nothing
 *     undefined   otherwise
 *     held now = lot.shares (or nothing   if now.shares = nothing
 *     now.shares × split   otherwise when missing)
 *     after = correct row(record, row id, change, 'typed', '9999 − 12 − 31T00:00:00.000Z').record
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-326 confirmMyChangeQuestion
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-279
 * Changed ..... 2026-11-11 (a6679cea)
 */
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
/* ─ MK-NW-F-280 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * splitByOf
 *
 * Answers ..... How many shares each first share of a purchase has become through the splits since it was bought.
 *
 * Formula .....
 *     first = first row of(record), began = first(row.row id).row id (or row.row id when missing)
 *     the answer = lot.split by (or 1 when missing)
 *
 * Called by ... MK-NW-F-279 differsFromGiven · MK-NW-F-281 correctRow
 *
 * Reaches ..... 49 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-NW-F-281 correctRow
 *               MK-XS-F-002 dataGaps · MK-NW-F-279 differsFromGiven
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-271 eventsThatDiffer · MK-NW-F-201 fileRowsToSave
 *               … and 31 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If split by is missing it uses 1.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-280
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-281 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * correctRow
 *
 * Answers ..... Correct a row.
 *
 * Formula .....
 *     same = [...record]
 *     old = row as it stands(record, row id)
 *     record = same
 *     problem = `row ${row id} is not in the record, or was taken away.`   when old is missing
 *     record = same
 *     problem = `row ${old.row id} was typed by the person, so it is not replaced.`   when old.source = 'typed' and source ! = 'typed'
 *     record = same
 *     problem = `"${change[k]}" is not a date the record can read (year − month − day).`   when k in change and was given(change[k]) and day or null(change[k]) = nothing
 *     the answer:
 *     record = same
 *     problem = 'the values of one day are not moved to another day; the other day is saved as its own values.'
 *     split = split by of(record, old)   if old.kind = 'PURCHASE' and old.holding ≠ nothing and ('price' in change or 'shares' in change)
 *     1   otherwise
 *     as bought = { ...change }
 *     next = ...rest = ...rest
 *     ...as bought = ...as bought
 *     source = source
 *     replaces row id = old.row id
 *     twins = []
 *     first of = first row of(record), mine = first of(old.row id).row id
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-219 correct · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-282 removeRow
 *               MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 48 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-273 answerEventQuestion · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-248 answerValuesQuestion
 *               MK-NW-F-218 arrive · MK-NW-F-275 besideTheList
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-219 correct · MK-XS-F-002 dataGaps
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-271 eventsThatDiffer
 *               MK-NW-F-201 fileRowsToSave · MK-XS-F-254 giveBackSetAside
 *               … and 30 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-281
 * Changed ..... 2026-11-11 (70d29ae8)
 */
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
    delete next.byAnswer; delete next.standsFor; delete next.forSales; delete next.answerTo; delete next.undoes;
    next.changed = Object.keys(change).filter((k) => k !== 'removed' && k !== 'salesToAsk');
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
/* ─ MK-NW-F-282 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * removeRow
 *
 * Answers ..... Take a row away.
 *
 * Formula .....
 *     old = row as it stands(record, row id)
 *     first = first row of(record), began = first(old.row id).row id
 *     correct row(record, row id, { removed: true, sales to ask }, source, written at)   when count of sales to ask
 *     the answer = correct row(record, row id, { removed: true }, source, written at)
 *
 * Called by ... MK-NW-F-220 remove · MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-254 giveBackSetAside · MK-NW-F-221 lotsFollow
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-220 remove · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-282
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function removeRow(record: readonly AssetRow[], rowId: string, source: RowSource, writtenAt: string): Changed {
  const old = rowAsItStands(record, rowId);
  if (old?.kind === 'PURCHASE' && old.holding != null) {
    // the account holder can always take a purchase away (his rule, 2026-11-12): the removal is saved, and each sale that
    // sold from it is named on the removal, so the shares it took become a question — which purchase they came from
    const first = firstRowOf(record), began = first(old.rowId)?.rowId;
    const salesToAsk = walkHolding(record, old.holding).taken
      .map((t) => ({ rowId: first(t.rowId)?.rowId ?? t.rowId, shares: t.from.filter((f) => f.firstRowId === began).reduce((n, f) => n + f.shares, 0) }))
      .filter((t) => t.shares > EPS);
    if (salesToAsk.length) return correctRow(record, rowId, { removed: true, salesToAsk }, source, writtenAt);
  }
  return correctRow(record, rowId, { removed: true }, source, writtenAt);
}

// ── activity and facts ──────────────────────────────────────────────────────────────────────────────────────────

/** How many shares each share became through the splits of one holding in one account dated after `from` and on or
 *  before `to`. */
/* ─ MK-NW-F-283 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * splitsBetween
 *
 * Answers ..... How many shares each share became through the splits of one holding in one account dated after `from` and on or before `to`.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-284 activityOf
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-284 activityOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If ratio is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-283
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-NW-F-284 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * activityOf
 *
 * Answers ..... The activity of an account: every purchase, sale, dividend, interest payment, deposit, withdrawal, transfer (out of it or into it), fee, split and unknown word on record, the dated ones oldest first and the undated after them.
 *
 * Formula .....
 *     first = first row of(record)
 *     id = first(row id).row id (or row id when missing)
 *     seen = new set<string>()
 *     base = record.find((x) => row id = id)
 *     into = base.stands for
 *     id   when into is missing (or seen.has(id) when missing or zero)
 *     in force = rows in force(record)
 *     in force ids = a list with no repeats of for each of in force: row id
 *     others = in force where (account id = account id or to account id = account id) and kind ! = 'VALUE' and kind ! = 'FACT' and kind ! = 'PURCHASE' and !restated
 *     lines = new map<string, asset row[]>()
 *     shown lines = []
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If ratio is missing it uses 0.
 *     · If shares is missing it uses 0.
 *     · Uses a built-in running of 0.
 *     · Uses a built-in by answers of 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-284
 * Changed ..... 2026-11-11 (a6679cea)
 */
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
  const at = rowPosition(record);   // R1: on one day, by place in the record
  const byDate = (a: AssetRow, b: AssetRow) => (a.date && b.date ? (a.date < b.date ? -1 : a.date > b.date ? 1 : at(a.rowId) - at(b.rowId))
    : a.date ? -1 : b.date ? 1 : at(a.rowId) - at(b.rowId));
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
        word: byHolder ? 'the account holder corrected the count' : 'the account holder accepted the broker’s list' });
      byAnswers += delta;
    });
    const rest = sharesOnRecord(record, accountId, h) - running - byAnswers;
    if (Math.abs(rest) > EPS) adjustments.push({ rowId: `adjustment-${h}-before`, accountId, holding: h, kind: 'ADJUSTMENT', date: null, shares: rest, source: 'linked', writtenAt: '', word: 'held before the record begins' });
  }
  return [...listed, ...adjustments].sort(byDate);
}

/** The facts on record for an account (holding null) or one of its holdings: each fact as last given, a typed fact
 *  standing in front of a linked or file one however late that one arrived. A blank is not a fact: it changes nothing. */
/* ─ MK-NW-F-285 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * factsOf
 *
 * Answers ..... The facts on record for an account (holding null) or one of its holdings: each fact as last given, a typed fact standing in front of a linked or file one however late that one arrived.
 *
 * Formula .....
 *     h = one holding spelling(holding)
 *     at = row position(record)
 *     out = {}, typed = new set<string>()
 *     the answer = out
 *
 * Called by ... MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-205 priceFeedValues
 *               MK-NW-F-312 optionDetailsOf
 *
 * Reaches ..... 21 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-193 eventRow
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-338 newerListUndoes · MK-NW-F-340 oneQuestionPerExercise
 *               MK-NW-F-312 optionDetailsOf · MK-NW-F-313 optionExpiryOf
 *               MK-NW-F-205 priceFeedValues · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-324 questionsOf
 *               MK-NW-F-341 questionsStillTrue · MK-NW-F-336 stillAsked
 *               … and 3 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-285
 * Changed ..... 2026-11-11 (70d29ae8)
 */
export function factsOf(record: readonly AssetRow[], accountId: string, holding: string | null): Record<string, unknown> {
  const H = oneHoldingSpelling(holding);
  const at = rowPosition(record);   // R1: on one time-stamp, by place in the record
  const rows = rowsInForce(record).filter((r) => r.accountId === accountId && r.holding === H && r.kind === 'FACT')
    .sort((a, b) => instantOf(a.writtenAt) - instantOf(b.writtenAt) || at(a.rowId) - at(b.rowId));
  const out: Record<string, unknown> = {}, typed = new Set<string>();
  for (const r of rows) for (const [k, v] of Object.entries(r.facts ?? {})) {
    if (v == null || v === '') continue;
    if (r.source !== 'typed' && typed.has(k)) continue;
    out[k] = v;
    if (r.source === 'typed') typed.add(k);
  }
  return out;
}

// ── questions and answers on the master record ────────────────────────────────────────────────────────────────────
//
// THE DESIGN: MoneyKeel/documents/standards/moneykeel_calc_spec_questions-and-answers-on-the-master-record_v02.md
// (2026-11-12). Every question gets one name, the rows its answer writes carry that name, and one checker re-tests every
// stored question after every write. The newest answer wins, after undoing the earlier one — never over something the
// account holder has changed since. An option's expiry becomes a sale at $0.

/** The 22 kinds of question (design v02, § 3). */
export type QuestionKind = 'E1' | 'E2' | 'E3' | 'E4' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'X1' | 'X2'
  | 'S1' | 'S2' | 'S3' | 'D1' | 'T1' | 'R1' | 'V1' | 'V2' | 'M1' | 'C1';
export const QUESTION_KINDS: readonly QuestionKind[] = ['E1', 'E2', 'E3', 'E4', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'X1', 'X2',
  'S1', 'S2', 'S3', 'D1', 'T1', 'R1', 'V1', 'V2', 'M1', 'C1'];
/** What a question is about, part of its name (rule 1). */
export type QuestionFamily = 'event' | 'list' | 'sale' | 'value' | 'move' | 'edit';

/** R1: an edit of the account holder's that matches more than one purchase. `to` null is a removal. */
export interface EditQuestion {
  accountId: string; holding: string; lotDate: string | null;
  from: Pick<NewRow, 'date' | 'shares' | 'price'> | null; to: Pick<NewRow, 'date' | 'shares' | 'price'> | null;
  /** The purchases that match, as they stand. */
  matches: string[];
}

/** One question, as the account holder is asked it. */
export interface AssetQuestion {
  kind: QuestionKind;
  family: QuestionFamily;
  accountId: string;
  holding: string | null;
  /** Rule 1: the name, without figures — what an answer's rows carry, used to undo and to remove duplicates. */
  name: string;
  /** Rule 1: the name with the figures — used to decide whether an answered question is asked again (rule 8). */
  difference: string;
  /** The sentence the account holder reads, naming both sources and both values (DEC-10471). */
  sentence: string;
  choices: { id: string; label: string }[];
  event?: EventQuestion;
  list?: ListQuestion;
  /** Rule 4: the event questions this list question stands for; its answer writes their facts too. */
  absorbs?: EventQuestion[];
  sale?: { rowId: string; shares: number; choices: OpenPurchase[] };
  saleRowId?: string;
  saleShares?: number;
  shares?: { onRecord: number; stated: number; gap: number };
  total?: { stated: number; rows: number; gap: number };
  edit?: EditQuestion;
  values?: { typed: ValueBatch; given: ValueBatch };
  batch?: ValueBatch;
  unexplained?: string;
  /** C1: the change to confirm, on the row as it stands. */
  confirm?: { rowId: string; change: Partial<NewRow> };
}

/** The account holder's choice. `rows` carries what he enters ("Enter it"); `date` the day he gives. */
export interface AnswerChoice { id: string; rows?: NewRow[]; date?: string }

/** What an answer did: the record after it, the rows written, a question to put first (rule 2), and a sentence to tell. */
export interface Answered { record: AssetRow[]; rows: NewRow[]; ask: AssetQuestion[]; told: string | null }

/** The questions kept for one account under one key (the account, `#typed`, `#moved`), as the store keeps them. */
export interface StoredQuestions {
  events: EventQuestion[];
  lists: ListQuestion[];
  needsADate?: boolean;
  sales?: ReturnType<typeof salesNeedingAnAnswer>;
  unexplained?: string[];
  edits?: EditQuestion[];
  /** Sentences told once: an answer a newer list undid (rule 5), another phone's answer (rule 10). */
  notes?: string[];
  at: string;
}

/** Who gave a figure, as the sentence names it ("Robinhood", "your file of Jun 30, 2026"). */
export type SaysWho = (accountId: string, source: RowSource) => string;
export const saysWho: SaysWho = (_a, source) => (source === 'file' ? 'your file' : source === 'typed' ? 'you' : source === 'price-feed' ? 'the price feed' : 'your broker');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A day in words: "Feb 10, 2026", or "Feb 10" without its year. */
/* ─ MK-NW-F-298 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * dayInWords
 *
 * Answers ..... A day in words: "Feb 10, 2026", or "Feb 10" without its year.
 *
 * Formula .....
 *     day = day or null(d)
 *     'no date'   when day = nothing
 *     the answer = `${MONTHS[number(day.slice(5, 7)) − 1]} ${number(day.slice(8, 10))}${year ? `, ${day.slice(0, 4)}` : ''}`
 *
 * Called by ... MK-NW-F-316 salesSentence · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-318 lotsWords · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-324 questionsOf
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-330 undoAskQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-338 newerListUndoes
 *
 * Reaches ..... 20 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-318 lotsWords · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-316 salesSentence
 *               MK-NW-F-339 settleTwoPhones · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-329 undoAnswer
 *               … and 2 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-298
 * Changed ..... not in git yet (—)
 */
const dayInWords = (d: string | null | undefined, year = true): string => {
  const day = dayOrNull(d);
  if (day == null) return 'no date';
  return `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}${year ? `, ${day.slice(0, 4)}` : ''}`;
};
/** Puts a comma between every three digits of a whole number written as text, so 169665 reads 169,665. */
/* ─ MK-NW-F-299 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * withCommas
 *
 * Answers ..... Puts a comma between every three digits of a whole number written as text, so 169665 reads 169,665.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-300 countWords · MK-NW-F-301 dollarWords
 *
 * Reaches ..... 23 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-300 countWords · MK-NW-F-301 dollarWords
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-318 lotsWords · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-303 ratioWords · MK-NW-F-320 saleQuestionToAsk
 *               MK-NW-F-316 salesSentence · MK-NW-F-339 settleTwoPhones
 *               … and 5 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-299
 * Changed ..... not in git yet (—)
 */
const withCommas = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** A number of shares as words show it: 1,000 · 2.5. */
/* ─ MK-NW-F-300 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * countWords
 *
 * Answers ..... A number of shares as words show it: 1,000 · 2.5.
 *
 * Formula .....
 *     'not known'   when n = nothing
 *     `${n < 0 ? '−' : ''}${with commas(w)}${f ? `.${f}` : ''}`
 *
 * Called by ... MK-NW-F-303 ratioWords · MK-NW-F-316 salesSentence
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-318 lotsWords
 *               MK-NW-F-319 listQuestionToAsk · MK-NW-F-320 saleQuestionToAsk
 *               MK-NW-F-324 questionsOf · MK-NW-F-325 editQuestionToAsk
 *               MK-NW-F-326 confirmMyChangeQuestion · MK-NW-F-330 undoAskQuestion
 *               MK-NW-F-338 newerListUndoes
 *
 * Reaches ..... 21 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-318 lotsWords · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-303 ratioWords · MK-NW-F-320 saleQuestionToAsk
 *               MK-NW-F-316 salesSentence · MK-NW-F-339 settleTwoPhones
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               … and 3 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Shows 8 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-300
 * Changed ..... not in git yet (—)
 */
const countWords = (n: number | null | undefined): string => {
  if (n == null) return 'not known';
  const [w, f] = String(Number(Math.abs(n).toFixed(8))).split('.');
  return `${n < 0 ? '−' : ''}${withCommas(w)}${f ? `.${f}` : ''}`;
};
/** Dollars as words show them: $210 · $4.50 · $169,665 (rounded at display only). */
/* ─ MK-NW-F-301 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * dollarWords
 *
 * Answers ..... Dollars as words show them: $210 · $4.50 · $169,665 (rounded at display only).
 *
 * Formula .....
 *     'not known'   when n = nothing
 *     a = size of(n), whole = size of(a − round(a)) < 0.005 and !cents
 *     the answer = `${n < -0.005 ? '−' : ''}$${with commas(w)}${f ? `.${f}` : ''}`
 *
 * Called by ... MK-NW-F-316 salesSentence · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-318 lotsWords · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-324 questionsOf
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-330 undoAskQuestion
 *
 * Reaches ..... 20 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-318 lotsWords · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-316 salesSentence
 *               MK-NW-F-339 settleTwoPhones · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-329 undoAnswer
 *               … and 2 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *     · Shows 2 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-301
 * Changed ..... not in git yet (—)
 */
const dollarWords = (n: number | null | undefined, cents = false): string => {
  if (n == null) return 'not known';
  const a = Math.abs(n), whole = Math.abs(a - Math.round(a)) < 0.005 && !cents;
  const [w, f] = (whole ? String(Math.round(a)) : a.toFixed(2)).split('.');
  return `${n < -0.005 ? '−' : ''}$${withCommas(w)}${f ? `.${f}` : ''}`;
};
/** Gives a text with its first letter in capitals, so a sentence can start with a word written in lower case. */
/* ─ MK-NW-F-302 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * firstUp
 *
 * Answers ..... Gives a text with its first letter in capitals, so a sentence can start with a word written in lower case.
 *
 * Formula .....
 *     char at(0).to upper case() + slice(1)
 *
 * Called by ... MK-NW-F-317 eventQuestionToAsk · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-324 questionsOf · MK-NW-F-337 answerQuestion
 *               MK-NW-F-338 newerListUndoes
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-319 listQuestionToAsk · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-302
 * Changed ..... not in git yet (—)
 */
const firstUp = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Writes a split ratio as words show it: 2 reads "2-for-1" and a half reads "1-for-2"; a missing ratio reads "not known". */
/* ─ MK-NW-F-303 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ratioWords
 *
 * Answers ..... Writes a split ratio as words show it: 2 reads "2-for-1" and a half reads "1-for-2"; a missing ratio reads "not known".
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-317 eventQuestionToAsk
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-303
 * Changed ..... not in git yet (—)
 */
const ratioWords = (r: number | null | undefined) => (r == null ? 'not known' : r >= 1 ? `${countWords(r)}-for-1` : `1-for-${countWords(1 / r)}`);
/** Writes a small count as a word that starts a sentence, None to Five, and any larger count as its number. */
/* ─ MK-NW-F-304 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * countOf
 *
 * Answers ..... Writes a small count as a word that starts a sentence, None to Five, and any larger count as its number.
 *
 * Formula .....
 *     ['None', 'One', 'Two', 'Three', 'Four', 'Five'][n] (or string(n) when missing)
 *
 * Called by ... MK-NW-F-325 editQuestionToAsk
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-304
 * Changed ..... not in git yet (—)
 */
const countOf = (n: number) => (['None', 'One', 'Two', 'Three', 'Four', 'Five'][n] ?? String(n));
/** Gives a row as it is saved fresh, without the row number and the time it was written. */
/* ─ MK-NW-F-305 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * strip
 *
 * Answers ..... Gives a row as it is saved fresh, without the row number and the time it was written.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-319 listQuestionToAsk · MK-NW-F-329 undoAnswer
 *               MK-NW-F-332 rowsOfChange · MK-NW-F-333 sharesToStated
 *               MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 15 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-319 listQuestionToAsk · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-332 rowsOfChange · MK-NW-F-339 settleTwoPhones
 *               MK-NW-F-333 sharesToStated · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-329 undoAnswer
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-305
 * Changed ..... not in git yet (—)
 */
const strip = (r: AssetRow): NewRow => { const { rowId: _n, writtenAt: _w, ...rest } = r; return rest; };

/** Rule 1: a name — the account, the holding, the family, then what the question is about; never a figure. */
const questionNameFrom = (accountId: string, holding: string | null, family: QuestionFamily, ...about: (string | number | null | undefined)[]) =>
  [accountId, holding ?? '', family, ...about.map((x) => x ?? '')].join('|');

/** A list question's name from its signature: the purchases on record and the listed dates, without the gap or a price. A
 *  signature written by an earlier answer gives the same name, so an old answer is found by it (step 2). */
/* ─ MK-NW-F-306 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * listNameFromSignature
 *
 * Answers ..... A list question's name from its signature: the purchases on record and the listed dates, without the gap or a price.
 *
 * Formula .....
 *     p = signature.split('|')
 *
 * Called by ... MK-NW-F-308 listQuestionName · MK-NW-F-328 keyOldAnswers
 *
 * Reaches ..... 24 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-328 keyOldAnswers
 *               MK-NW-F-308 listQuestionName · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-311 makeQuestion · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-309 questionName
 *               MK-NW-F-324 questionsOf · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-339 settleTwoPhones
 *               … and 6 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-306
 * Changed ..... not in git yet (—)
 */
export function listNameFromSignature(accountId: string, holding: string | null, signature: string): string {
  const p = signature.split('|');
  switch (p[0]) {
    case 'list': case 'pair': return questionNameFrom(accountId, holding, 'list', 'list', p[1] ?? '', p[2] ?? '');
    case 'removed': return p[1] === 'average' ? questionNameFrom(accountId, holding, 'list', 'removed', 'average') : questionNameFrom(accountId, holding, 'list', 'list', p[1] ?? '', p[2] ?? '');
    case 'price': return p[1] === 'average' ? questionNameFrom(accountId, holding, 'list', 'price', 'average')
      : questionNameFrom(accountId, holding, 'list', 'price', (p[1] ?? '').split(',').map((x) => x.split('@')[0]).join(','));
    case 'count': return questionNameFrom(accountId, holding, 'list', 'count');
    case 'sold': return questionNameFrom(accountId, holding, 'list', 'sold', p[1] ?? '', p[2] ?? '');
    case 'expired': case 'exercised': return questionNameFrom(accountId, holding, 'list', 'option', p[1] ?? '');
    case 'shares': return questionNameFrom(accountId, holding, 'value', 'shares');
    default: return questionNameFrom(accountId, holding, 'list', p[0]);
  }
}
/** An event question's name: the purchase (or event) on record it is about, as first saved. */
/* ─ MK-NW-F-307 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * eventQuestionName
 *
 * Answers ..... An event question's name: the purchase (or event) on record it is about, as first saved.
 *
 * Formula .....
 *     question name from(on record.account id, on record.holding, 'event', key.split('|')[0])
 *
 * Called by ... MK-NW-F-309 questionName · MK-NW-F-336 stillAsked
 *               MK-NW-F-341 questionsStillTrue
 *
 * Reaches ..... 22 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-311 makeQuestion · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-309 questionName
 *               MK-NW-F-324 questionsOf · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-339 settleTwoPhones
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               … and 4 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-307
 * Changed ..... not in git yet (—)
 */
export const eventQuestionName = (q: EventQuestion): string => questionNameFrom(q.onRecord.accountId, q.onRecord.holding, 'event', q.key.split('|')[0]);
/** A list question’s name: the account, the holding and the purchases and dates the list is about, read from its signature. */
/* ─ MK-NW-F-308 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * listQuestionName
 *
 * Answers ..... A list question’s name: the account, the holding and the purchases and dates the list is about, read from its signature.
 *
 * Formula .....
 *     list name from signature(account id, holding, signature)
 *
 * Called by ... MK-NW-F-309 questionName · MK-NW-F-336 stillAsked
 *               MK-NW-F-341 questionsStillTrue
 *
 * Reaches ..... 22 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-311 makeQuestion · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-309 questionName
 *               MK-NW-F-324 questionsOf · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-339 settleTwoPhones
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               … and 4 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-308
 * Changed ..... not in git yet (—)
 */
export const listQuestionName = (q: ListQuestion): string => listNameFromSignature(q.accountId, q.holding, q.signature);

/** Step 1: the name of any question (rule 1). */
/* ─ MK-NW-F-309 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * questionName
 *
 * Answers ..... Step 1: the name of any question (rule 1).
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-311 makeQuestion
 *
 * Reaches ..... 19 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-311 makeQuestion · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-339 settleTwoPhones
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-329 undoAnswer · MK-NW-F-330 undoAskQuestion
 *               … and 1 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-309
 * Changed ..... not in git yet (—)
 */
export function questionName(q: Omit<AssetQuestion, 'name' | 'difference' | 'sentence' | 'choices'>): string {
  const { accountId: a, holding: h } = q;
  switch (q.kind) {
    case 'E1': case 'E2': case 'E3': case 'E4': return eventQuestionName(q.event as EventQuestion);
    case 'L1': case 'L2': case 'L3': case 'L4': case 'L5': case 'L6': case 'X1': case 'X2': return listQuestionName(q.list as ListQuestion);
    case 'S1': return questionNameFrom(a, h, 'sale', q.sale?.rowId, 'lot');
    case 'S2': return questionNameFrom(a, h, 'sale', q.saleRowId, 'list');
    case 'S3': return questionNameFrom(a, h, 'sale', q.saleRowId, 'beyond');
    case 'D1': return questionNameFrom(a, h, 'value', 'shares');
    case 'T1': return questionNameFrom(a, null, 'value', 'total');
    case 'V1': return questionNameFrom(a, null, 'value', q.values?.typed.date);
    case 'V2': return questionNameFrom(a, null, 'value', 'undated', q.batch?.batch);
    case 'R1': return questionNameFrom(a, h, 'edit', [...(q.edit?.matches ?? [])].sort().join(','));
    case 'M1': return questionNameFrom(a, h, 'move', q.unexplained);
    case 'C1': return questionNameFrom(a, h, 'edit', q.confirm?.rowId, 'confirm');
  }
}
/** Step 1: the difference of any question — its name with the figures (rule 1, rule 8). */
/* ─ MK-NW-F-310 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * differenceKey
 *
 * Answers ..... Step 1: the difference of any question — its name with the figures (rule 1, rule 8).
 *
 * Formula .....
 *     n = name
 *     a = (event as event question).arriving
 *     the answer = [n, day or null(date) ?? '', price ?? '', shares = nothing ? '' : math.abs(shares), ratio ?? ''].join('|')
 *
 * Called by ... MK-NW-F-311 makeQuestion
 *
 * Reaches ..... 19 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-311 makeQuestion · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-339 settleTwoPhones
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-329 undoAnswer · MK-NW-F-330 undoAskQuestion
 *               … and 1 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-310
 * Changed ..... not in git yet (—)
 */
export function differenceKey(q: Omit<AssetQuestion, 'difference' | 'sentence' | 'choices'>): string {
  const n = q.name;
  switch (q.kind) {
    case 'E1': case 'E2': case 'E3': case 'E4': {
      const a = (q.event as EventQuestion).arriving;
      return [n, dayOrNull(a.date) ?? '', a.price ?? '', a.shares == null ? '' : Math.abs(a.shares), a.ratio ?? ''].join('|');
    }
    case 'L1': case 'L2': case 'L3': case 'L4': case 'L5': case 'L6': case 'X1': case 'X2':
      return [n, (q.list as ListQuestion).signature, (q.list as ListQuestion).holdingGap ?? ''].join('|');
    case 'S1': return [n, q.sale?.shares].join('|');
    case 'S2': case 'S3': return [n, q.saleShares].join('|');
    case 'D1': return [n, q.shares?.onRecord, q.shares?.stated].join('|');
    case 'T1': return [n, q.total?.stated, q.total?.rows].join('|');
    case 'V1': return [n, q.values?.typed.total, q.values?.given.total].join('|');
    case 'V2': return [n, q.batch?.total].join('|');
    case 'R1': return [n, JSON.stringify(q.edit?.to ?? null)].join('|');
    case 'M1': return n;
    case 'C1': return [n, JSON.stringify(q.confirm?.change ?? {})].join('|');
  }
}

const FAMILY: Record<QuestionKind, QuestionFamily> = {
  E1: 'event', E2: 'event', E3: 'event', E4: 'event', L1: 'list', L2: 'list', L3: 'list', L4: 'list', L5: 'list', L6: 'list', X1: 'list', X2: 'list',
  S1: 'sale', S2: 'sale', S3: 'sale', D1: 'value', T1: 'value', R1: 'edit', V1: 'value', V2: 'value', M1: 'move', C1: 'edit',
};
const CHOICES: Record<QuestionKind, [string, string][]> = {
  E1: [['change', 'Change'], ['keep-mine', 'Keep mine'], ['two-purchases', 'Two purchases']],
  E2: [['change', 'Change'], ['keep-mine', 'Keep mine'], ['two-purchases', 'Two purchases']],
  E3: [['change', 'Change'], ['keep-mine', 'Keep mine']],
  E4: [['stays-away', 'Stays away'], ['put-back', 'Put it back']],
  L1: [['list-correct', 'The list is correct'], ['mine-correct', 'Mine is correct']],
  L2: [['list-correct', 'The list is correct'], ['mine-correct', 'Mine is correct']],
  L3: [['stays-away', 'Stays away'], ['put-back', 'Put it back']],
  L4: [['change', 'Change'], ['keep-mine', 'Keep mine']],
  L5: [['change', 'Change'], ['keep-mine', 'Keep mine']],
  L6: [['list-correct', 'The list is correct'], ['mine-correct', 'Mine is correct']],
  X1: [['expired', 'Expired'], ['sold', 'Sold or exercised']],
  X2: [['enter', 'Enter it'], ['leave', 'Leave as is']],
  S1: [],
  S2: [['keep', 'Keep'], ['change-date', 'Change the date'], ['take-away', 'Take it away']],
  S3: [['enter', 'Enter it'], ['leave', 'Leave not known']],
  D1: [['change', 'Change'], ['keep', 'Keep']],
  T1: [['enter', 'Enter it'], ['rows-right', 'The rows are right']],
  R1: [['cancel', 'Cancel']],
  V1: [['change', 'Change'], ['keep-mine', 'Keep mine']],
  V2: [['date', 'A date'], ['not-known', 'Not known']],
  M1: [['enter', 'Enter it'], ['leave', 'Leave it']],
  C1: [['confirm', 'Confirm'], ['cancel', 'Cancel']],
};

/** A question, whole: its family, name, difference and choices filled in around what it is about and its sentence. */
/* ─ MK-NW-F-311 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * makeQuestion
 *
 * Answers ..... A question, whole: its family, name, difference and choices filled in around what it is about and its sentence.
 *
 * Formula .....
 *     with name = { ...q, family: FAMILY[kind], name: '' } as asset question
 *     the answer = with name
 *
 * Called by ... MK-NW-F-317 eventQuestionToAsk · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-320 saleQuestionToAsk · MK-NW-F-324 questionsOf
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-330 undoAskQuestion
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-326 confirmMyChangeQuestion
 *               MK-NW-F-325 editQuestionToAsk · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-324 questionsOf · MK-NW-F-320 saleQuestionToAsk
 *               MK-NW-F-339 settleTwoPhones · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-329 undoAnswer
 *               MK-NW-F-330 undoAskQuestion · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-311
 * Changed ..... not in git yet (—)
 */
function makeQuestion(q: Omit<AssetQuestion, 'family' | 'name' | 'difference' | 'choices'> & { choices?: { id: string; label: string }[] }): AssetQuestion {
  const withName = { ...q, family: FAMILY[q.kind], name: '' } as AssetQuestion;
  withName.name = questionName(withName);
  withName.difference = differenceKey(withName);
  withName.choices = q.choices ?? CHOICES[q.kind].map(([id, label]) => ({ id, label }));
  return withName;
}

/** What an option is, from its facts on record, else from its own name (the OCC symbol: AAPL  260220C00260000). */
/* ─ MK-NW-F-312 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * optionDetailsOf
 *
 * Answers ..... What an option is, from its facts on record, else from its own name (the OCC symbol: AAPL  260220C00260000).
 *
 * Formula .....
 *     f = facts of(record, account id, holding)
 *     m = ÷ ^([A − Z.]{1,6})\s × (\d{2})(\d{2})(\d{2})([CP])(\d{8})$ ÷ .exec(one holding spelling(holding) ?? '')
 *     from name = expiry = `20${m[2]}-${m[3]}-${m[4]}`
 *     underlying = m[1]
 *     strike = number(m[6]) ÷ 1000
 *     type = (m[5] = 'C' ? 'call' : 'put') as 'call' | 'put'   if m
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-313 optionExpiryOf · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-340 oneQuestionPerExercise
 *
 * Reaches ..... 19 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-193 eventRow
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-338 newerListUndoes · MK-NW-F-340 oneQuestionPerExercise
 *               MK-NW-F-313 optionExpiryOf · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-324 questionsOf
 *               MK-NW-F-341 questionsStillTrue · MK-NW-F-336 stillAsked
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               … and 1 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-312
 * Changed ..... not in git yet (—)
 */
export function optionDetailsOf(record: readonly AssetRow[], accountId: string, holding: string): { expiry: string | null; underlying: string | null; strike: number | null; type: 'call' | 'put' | null; perContract: number } {
  const f = factsOf(record, accountId, holding);
  const m = /^([A-Z.]{1,6})\s*(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(oneHoldingSpelling(holding) ?? '');
  const fromName = m ? { expiry: `20${m[2]}-${m[3]}-${m[4]}`, underlying: m[1], strike: Number(m[6]) / 1000, type: (m[5] === 'C' ? 'call' : 'put') as 'call' | 'put' } : null;
  return {
    expiry: dayOrNull(f.optionExpiry) ?? fromName?.expiry ?? null,
    underlying: oneHoldingSpelling(typeof f.optionUnderlying === 'string' ? f.optionUnderlying : null) ?? fromName?.underlying ?? null,
    strike: typeof f.optionStrike === 'number' ? f.optionStrike : fromName?.strike ?? null,
    type: f.optionType === 'CALL' || f.optionType === 'call' ? 'call' : f.optionType === 'PUT' || f.optionType === 'put' ? 'put' : fromName?.type ?? null,
    perContract: typeof f.sharesPerContract === 'number' && f.sharesPerContract > 0 ? f.sharesPerContract : 100,
  };
}
/** Rule 6: an option's expiry date — the fact kept for it, else its own name's. Null where the holding is not an option. */
/* ─ MK-NW-F-313 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * optionExpiryOf
 *
 * Answers ..... Rule 6: an option's expiry date — the fact kept for it, else its own name's.
 *
 * Formula .....
 *     option details of(record, account id, holding).expiry
 *
 * Called by ... MK-NW-F-193 eventRow · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 15 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-193 eventRow
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-341 questionsStillTrue · MK-NW-F-336 stillAsked
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-313
 * Changed ..... not in git yet (—)
 */
export function optionExpiryOf(record: readonly AssetRow[], accountId: string, holding: string): string | null {
  return optionDetailsOf(record, accountId, holding).expiry;
}

/** L6's test (rule 3): the list differs from the record only by which purchase one sale, naming none, sold from. Returns
 *  the pairs and the sale with the purchases the list names; with several such sales, each is asked which (S1). */
/* ─ MK-NW-F-314 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * listNamesTheSoldLot
 *
 * Answers ..... L6's test (rule 3): the list differs from the record only by which purchase one sale, naming none, sold from.
 *
 * Formula .....
 *     nothing   when count of differ is missing
 *     nothing   when differ.some((d) => p.moved in by ≠ nothing or p.average only or day or null(l.date) = nothing or (p.date ! = day or null(l.date) and p.first date ! = day or null(l.date)))
 *     nothing   when !same shares(differ.reduce((t, d) => t + l.shares, 0), differ.reduce((t, d) => t + p.shares, 0))
 *     want = for each of differ: const row = row as it stands(record, p.row id); return row.shares == null ? null : row.shares * p.split by - l.shares; = const row = row as it stands(record, p.row id); return row.shares == null ? null : row.shares * p.split by - l.shares;
 *     nothing   when want.some((w) => w = nothing or w < -EPS)
 *     ids = a list with no repeats of for each of differ: first row id
 *     sales = for each of taken: each = each
 *     row = row as it stands(record, row id)
 *     nothing   when count of sales is missing (or sales.some((x) => row = nothing or row.kind ! = 'SALE' or (row.sells.length ?? 0) > 0) when missing or zero)
 *     took here = Σ over taken of (Σ over from where ids.has(first row id) of (shares))
 *     nothing   when !same shares(took here, (want as number[]).reduce((t, w) => t + w, 0))
 *     nothing   when differ.some((d, i) => (want[i] as number) > EPS and (p.date ?? '') > ((row as asset row).date ?? ''))
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-277 purchasesFromList
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-289 activityRefs · MK-NW-F-342 afterAWrite
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-194 brokerUpdateToRecord · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-277 purchasesFromList · MK-NW-F-341 questionsStillTrue
 *               MK-NW-F-336 stillAsked · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If length is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-314
 * Changed ..... not in git yet (—)
 */
function listNamesTheSoldLot(record: readonly AssetRow[], accountId: string, H: string, differ: readonly { p: OpenPurchase; l: ListedPurchase }[], asOf: string | null):
{ pairs: { p: OpenPurchase; l: ListedPurchase }[]; sales: { rowId: string; shares: number; sells: { rowId: string; shares: number }[] }[] } | null {
  if (!differ.length) return null;
  if (differ.some((d) => d.p.movedInBy != null || d.p.averageOnly || dayOrNull(d.l.date) == null || (d.p.date !== dayOrNull(d.l.date) && d.p.firstDate !== dayOrNull(d.l.date)))) return null;
  if (!sameShares(differ.reduce((t, d) => t + d.l.shares, 0), differ.reduce((t, d) => t + d.p.shares, 0))) return null;
  const want = differ.map((d) => { const row = rowAsItStands(record, d.p.rowId); return row?.shares == null ? null : row.shares * d.p.splitBy - d.l.shares; });
  if (want.some((w) => w == null || w < -EPS)) return null;
  const ids = new Set(differ.map((d) => d.p.firstRowId));
  const taken = (asOf ? walkHolding(record, H, asOf).taken.filter((t) => t.accountId === accountId) : sharesTakenBy(record, accountId, H))
    .filter((t) => t.from.some((f) => ids.has(f.firstRowId)));
  const sales = taken.map((t) => ({ t, row: rowAsItStands(record, t.rowId) }));
  if (!sales.length || sales.some((x) => x.row == null || x.row.kind !== 'SALE' || (x.row.sells?.length ?? 0) > 0)) return null;
  const tookHere = taken.reduce((n, t) => n + t.from.filter((f) => ids.has(f.firstRowId)).reduce((m, f) => m + f.shares, 0), 0);
  if (!sameShares(tookHere, (want as number[]).reduce((t, w) => t + w, 0))) return null;
  if (sales.length === 1) {
    const { t, row } = sales[0];
    if (differ.some((d, i) => (want[i] as number) > EPS && (d.p.date ?? '') > ((row as AssetRow).date ?? ''))) return null;
    const sells = [...differ.map((d, i) => ({ rowId: d.p.firstRowId, shares: want[i] as number })).filter((x) => x.shares > EPS),
      ...t.from.filter((f) => !ids.has(f.firstRowId)).map((f) => ({ rowId: f.firstRowId, shares: f.shares }))];
    return { pairs: [...differ], sales: [{ rowId: t.rowId, shares: t.from.reduce((n, f) => n + f.shares, 0), sells }] };
  }
  return { pairs: [...differ], sales: sales.map(({ t }) => ({ rowId: t.rowId, shares: t.from.reduce((n, f) => n + f.shares, 0), sells: [] })) };
}

/** The verb a row kind is written with: a purchase was bought, a sale sold, a transfer moved; any other kind is its own name in lower case. */
/* ─ MK-NW-F-315 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * verbOf
 *
 * Answers ..... The verb a row kind is written with: a purchase was bought, a sale sold, a transfer moved; any other kind is its own name in lower case.
 *
 * Formula .....
 *     'bought'   if kind = 'PURCHASE'
 *     'sold'   if kind = 'SALE'
 *     'moved'   if kind = 'TRANSFER'
 *     kind.to lower case()   otherwise   otherwise   otherwise
 *
 * Called by ... MK-NW-F-317 eventQuestionToAsk · MK-NW-F-330 undoAskQuestion
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-317 eventQuestionToAsk
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-338 newerListUndoes
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-339 settleTwoPhones · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-329 undoAnswer
 *               MK-NW-F-330 undoAskQuestion · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-315
 * Changed ..... not in git yet (—)
 */
const verbOf = (kind: RowKind) => (kind === 'PURCHASE' ? 'bought' : kind === 'SALE' ? 'sold' : kind === 'TRANSFER' ? 'moved' : kind.toLowerCase());
/** Each past sale an answer would move, as the sentence adds it (MK-NW-F-272). */
/* ─ MK-NW-F-316 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * salesSentence
 *
 * Answers ..... Each past sale an answer would move, as the sentence adds it (MK-NW-F-272).
 *
 * Formula .....
 *     ` this changes the sale of ${count words(shares)} ${holding ?? ''} on ${day in words(date, false)}: it made ${dollar words(was)}, it will make ${dollar words(will)}.`; }).join('')
 *
 * Called by ... MK-NW-F-317 eventQuestionToAsk
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-317 eventQuestionToAsk · MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-316
 * Changed ..... not in git yet (—)
 */
const salesSentence = (record: readonly AssetRow[], moved: { saleRowId: string; was: number | null; will: number | null }[], holding: string | null) =>
  moved.map((m) => { const s = rowAsItStands(record, m.saleRowId);
    return ` This changes the sale of ${countWords(s?.shares)} ${holding ?? ''} on ${dayInWords(s?.date, false)}: it made ${dollarWords(m.was)}, it will make ${dollarWords(m.will)}.`; }).join('');

/** E1–E4: an arriving event that differs from one on record (MK-NW-F-238), as the account holder is asked it. */
/* ─ MK-NW-F-317 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * eventQuestionToAsk
 *
 * Answers ..... E1–E4: an arriving event that differs from one on record (MK-NW-F-238), as the account holder is asked it.
 *
 * Formula .....
 *     a = eq.arriving, r = eq.on record, H = holding (or one holding spelling(holding) when missing)
 *     src = nothing   if who(account id, source), shares = shares = nothing
 *     'you entered'   if size of(shares), yours = source = 'typed'
 *     'the record holds'   otherwise   otherwise
 *     kind = 'E1'   if eq.why = 'price'
 *     'E2'   if eq.why = 'date'
 *     'E3'   if eq.why = 'ratio'
 *     'E4'   otherwise   otherwise   otherwise
 *     the answer = make question({ kind, account id: account id, holding: H, event: eq, sentence })
 *
 * Called by ... MK-NW-F-324 questionsOf
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-317
 * Changed ..... not in git yet (—)
 */
export function eventQuestionToAsk(record: readonly AssetRow[], eq: EventQuestion, who: SaysWho = saysWho): AssetQuestion {
  const a = eq.arriving, r = eq.onRecord, H = r.holding ?? oneHoldingSpelling(a.holding);
  const src = who(a.accountId, a.source), shares = a.shares == null ? null : Math.abs(a.shares), yours = r.source === 'typed' ? 'you entered' : 'the record holds';
  const kind: QuestionKind = eq.why === 'price' ? 'E1' : eq.why === 'date' ? 'E2' : eq.why === 'ratio' ? 'E3' : 'E4';
  let sentence: string;
  if (kind === 'E1') sentence = `The information from ${src} indicates price of ${dollarWords(a.price)} for ${countWords(shares)} ${H} ${verbOf(a.kind)} ${dayInWords(a.date)}; ${yours} ${dollarWords(r.price)}. Confirm changing the price to ${dollarWords(a.price)}.`;
  else if (kind === 'E2') sentence = `The information from ${src} indicates ${countWords(shares)} ${H} ${verbOf(a.kind)} ${dayInWords(a.date)}; ${yours} ${dayInWords(r.date, false)}. Confirm changing the date to ${dayInWords(a.date, false)}.`;
  else if (kind === 'E3') sentence = `The information from ${src} indicates the ${H} split of ${dayInWords(a.date)} was ${ratioWords(a.ratio)}; the record holds ${ratioWords(r.ratio)}. Confirm changing it to ${ratioWords(a.ratio)}.`;
  else sentence = `${firstUp(src)} sends again ${countWords(shares)} ${H} ${verbOf(a.kind)} ${dayInWords(a.date)} at ${dollarWords(a.price)}; you took this purchase away. Confirm it stays taken away: ${countWords(H ? sharesOnRecord(record, r.accountId, H) : null)} shares.`;
  if (kind === 'E1' || kind === 'E2') sentence += salesSentence(record, eq.salesMoved ?? salesMovedBy(record, eq), H);
  return makeQuestion({ kind, accountId: r.accountId, holding: H, event: eq, sentence });
}

/** Lots as a sentence lists them: "300 MSFT bought Jul 30 and 50 bought Feb 10". */
/* ─ MK-NW-F-318 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * lotsWords
 *
 * Answers ..... Lots as a sentence lists them: "300 MSFT bought Jul 30 and 50 bought Feb 10".
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-319 listQuestionToAsk
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-319 listQuestionToAsk · MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-318
 * Changed ..... not in git yet (—)
 */
const lotsWords = (holding: string | null, lots: { date: string | null; shares: number; price?: number | null }[], o: { year?: 'all' | 'last' | 'none'; price?: boolean } = {}) =>
  lots.map((l, i) => `${countWords(l.shares)}${i === 0 && holding ? ` ${holding}` : ''} ${l.date == null ? 'with no date' : `bought ${dayInWords(l.date, o.year === 'all' || (o.year === 'last' && i === lots.length - 1))}`}${o.price && l.price != null ? ` at ${dollarWords(l.price)}` : ''}`).join(' and ');

/** L1–L6, X1, X2: a difference between a list and the record (MK-NW-F-277), as the account holder is asked it. A list
 *  question of several sales that named no purchase is one S1 question per sale (rule 3). */
/* ─ MK-NW-F-319 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * listQuestionToAsk
 *
 * Answers ..... L1–L6, X1, X2: a difference between a list and the record (MK-NW-F-277), as the account holder is asked it.
 *
 * Formula .....
 *     h = lq.holding, src = who(lq.account id, lq.source), day = day in words(lq.list day)
 *     held = shares on record(record, lq.account id, H), after = held − lq.shares on record + lq.shares listed
 *     lots of = for each of (ps: open purchase[]) => ps: date = date
 *     shares = shares
 *     price = price
 *     make = (kind: question kind, sentence: string) => [make question({ kind, account id: lq.account id, holding: H, list: lq, sentence, ...(absorbs.length ? { absorbs } : {}) })]
 *     kind = 'L1'   if lq.kind = 'typed'
 *     'L2'   otherwise
 *     yours = 'you entered'   if lq.kind = 'typed'
 *     'the record holds'   otherwise
 *     to = `confirm changing ${H} to ${count words(after)} shares${lq.listed.length = 1 and lq.listed[0].date ≠ nothing ? ` bought ${day in words(lq.listed[0].date, false)}` : ''}.`
 *     make(kind, `${first up(src)}’s list of ${day} leaves out the ${count words(lq.shares on record)} ${H} ${lq.kind = 'typed' ? 'you entered' : 'on record'}, and no sale is on record. ${to}`)   when count of lq.listed is missing
 *     the answer = make(kind, `${first up(src)}’s list of ${day} indicates ${lots words(H, lq.listed)}; ${yours} ${lq.on record.length ? lots words(nothing, lots of(lq.on record)) : 'no such purchase'}. ${to}`)
 *     gap = lq.shares listed − lq.shares on record
 *     sales = lq.sales (or none when missing)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-324 questionsOf
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-319
 * Changed ..... not in git yet (—)
 */
export function listQuestionToAsk(record: readonly AssetRow[], lq: ListQuestion, who: SaysWho = saysWho, absorbs: EventQuestion[] = []): AssetQuestion[] {
  const H = lq.holding, src = who(lq.accountId, lq.source), day = dayInWords(lq.listDay);
  const held = sharesOnRecord(record, lq.accountId, H), after = held - lq.sharesOnRecord + lq.sharesListed;
  const lotsOf = (ps: OpenPurchase[]) => ps.map((p) => ({ date: p.date, shares: p.shares, price: p.price }));
  const make = (kind: QuestionKind, sentence: string) => [makeQuestion({ kind, accountId: lq.accountId, holding: H, list: lq, sentence, ...(absorbs.length ? { absorbs } : {}) })];
  switch (lq.kind) {
    case 'typed': case 'not-listed': {
      const kind: QuestionKind = lq.kind === 'typed' ? 'L1' : 'L2';
      const yours = lq.kind === 'typed' ? 'you entered' : 'the record holds';
      const to = `Confirm changing ${H} to ${countWords(after)} shares${lq.listed.length === 1 && lq.listed[0].date != null ? ` bought ${dayInWords(lq.listed[0].date, false)}` : ''}.`;
      if (!lq.listed.length) return make(kind, `${firstUp(src)}’s list of ${day} leaves out the ${countWords(lq.sharesOnRecord)} ${H} ${lq.kind === 'typed' ? 'you entered' : 'on record'}, and no sale is on record. ${to}`);
      return make(kind, `${firstUp(src)}’s list of ${day} indicates ${lotsWords(H, lq.listed)}; ${yours} ${lq.onRecord.length ? lotsWords(null, lotsOf(lq.onRecord)) : 'no such purchase'}. ${to}`);
    }
    case 'removed':
      return make('L3', `${firstUp(src)} still lists${absorbs.length ? ' and resends' : ''} ${lotsWords(H, lq.listed, { year: 'all', price: true })}; you took it away. Confirm it stays taken away: ${countWords(held)} shares.`);
    case 'price': {
      if (lq.listed.length === 1 && lq.listed[0].average) {
        const cost = lq.onRecord.every((p) => p.price != null) && lq.sharesOnRecord > EPS ? lq.onRecord.reduce((t, p) => t + p.shares * (p.price as number), 0) / lq.sharesOnRecord : null;
        return make('L4', `${firstUp(src)}’s list indicates ${dollarWords(lq.listed[0].price)} a share for ${countWords(lq.listed[0].shares)} ${H}; the record holds ${dollarWords(cost)}. Confirm changing to ${dollarWords(lq.listed[0].price)}.`);
      }
      return make('L4', lq.onRecord.map((p, i) => { const l = lq.listed[i];
        return `${firstUp(src)}’s list indicates ${dollarWords(l?.price)} for ${countWords(l?.shares)} ${H} bought ${dayInWords(l?.date)}; the record holds ${dollarWords(p.price)}. Confirm changing to ${dollarWords(l?.price)}.`; }).join(' '));
    }
    case 'count': {
      const gap = lq.sharesListed - lq.sharesOnRecord;
      return make('L5', `${firstUp(src)} indicates ${countWords(lq.sharesListed)} ${H}; the record holds ${countWords(lq.sharesOnRecord)}, and no transaction explains the other ${countWords(Math.abs(gap))}. ${gap > 0
        ? `Confirm adding ${countWords(gap)} shares with no date or price.` : `Confirm taking away ${countWords(-gap)} shares, the oldest first.`}`);
    }
    case 'sold-from': {
      const sales = lq.sales ?? [];
      if (sales.length !== 1 || !sales[0].sells.length) {
        // several sales could have sold these purchases: each is asked which (S1)
        return sales.map((s) => ({ ...saleQuestionToAsk(record, { rowId: s.rowId, holding: H, shares: s.shares, choices: lq.onRecord }, lq.accountId), list: lq }));
      }
      const s = sales[0], sale = rowAsItStands(record, s.rowId);
      const was = saleGain(record, s.rowId);
      const will = sale ? saleGain(addRows(record, [{ ...strip(sale), sells: s.sells, source: 'typed', replacesRowId: sale.rowId }], '9999-12-31T00:00:00.000Z'), s.rowId) : null;
      const first = firstRowOf(record);
      const fromNow = sharesTakenBy(record, lq.accountId, H).find((t) => t.rowId === sale?.rowId)?.from ?? [];
      const dateOf = (id: string) => lq.onRecord.find((p) => p.firstRowId === (first(id)?.rowId ?? id))?.date ?? rowAsItStands(record, id)?.date ?? null;
      const fromDates = [...new Set(fromNow.map((f) => dayInWords(dateOf(f.rowId), false)))].join(' and ');
      const toDates = [...new Set(s.sells.map((x) => dayInWords(dateOf(x.rowId), false)))].join(' and ');
      return make('L6', `${firstUp(src)} lists ${lotsWords(H, lq.listed, { year: 'last' })}. The record counts the ${countWords(s.shares)} shares sold on ${dayInWords(sale?.date, false)} as coming from the ${fromDates} purchase. Confirm they came from ${toDates}: the sale made ${dollarWords(will)}, not ${dollarWords(was)}.`);
    }
    case 'expired': case 'exercised': {
      const d = optionDetailsOf(record, lq.accountId, H);
      const contracts = lq.sharesOnRecord / d.perContract;
      // the count's noun from the one list of plurals (DEC-4082): one put, two puts — never an "s" added by hand
      const counted = `${countWords(contracts)} ${d.underlying ?? H}${d.strike != null ? ` ${dollarWords(d.strike)}` : ''}`;
      const what = d.type === 'call' ? plural(contracts, 'call', counted) : d.type === 'put' ? plural(contracts, 'put', counted) : plural(contracts, 'option', counted);
      if (lq.kind === 'exercised') return make('X2', `${firstUp(src)} dropped ${what} and added ${countWords(lq.arrivedShares)} ${lq.arrivedHolding} shares on ${day}. Enter what happened.`);
      const cost = lq.onRecord.every((p) => p.price != null) ? lq.onRecord.reduce((t, p) => t + p.shares * (p.price as number), 0) : null;
      const price = cost != null && lq.sharesOnRecord > EPS ? cost / lq.sharesOnRecord : null;
      return make('X1', `${firstUp(src)} no longer lists your ${what} expiring ${dayInWords(lq.expiry ?? d.expiry)} (${countWords(lq.sharesOnRecord)} shares, bought at ${dollarWords(price, true)} a share). Confirm they expired worthless on ${dayInWords(lq.expiry ?? d.expiry, false)}: a loss of ${dollarWords(cost)}.`);
    }
  }
}

/** S1: a sale that may have sold a purchase with no date (MK-NW-F-256, DEC-10385): which purchase did it come from. */
/* ─ MK-NW-F-320 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * saleQuestionToAsk
 *
 * Answers ..... S1: a sale that may have sold a purchase with no date (MK-NW-F-256, DEC-10385): which purchase did it come from.
 *
 * Formula .....
 *     sale = row as it stands(record, row id)
 *     gain = min(shares, shares) × (sale.price − price)   if sale.price ≠ nothing and price ≠ nothing
 *     nothing   otherwise
 *     the answer:
 *     id = `purchase:${first row id}`
 *     label = `${date = nothing ? 'no date' : day in words(date, false)} · ${count words(shares)} at ${dollar words(price)} → ${dollar words(gain)}`
 *
 * Called by ... MK-NW-F-319 listQuestionToAsk · MK-NW-F-324 questionsOf
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-319 listQuestionToAsk · MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-320
 * Changed ..... not in git yet (—)
 */
export function saleQuestionToAsk(record: readonly AssetRow[], s: { rowId: string; holding: string; shares: number; choices: OpenPurchase[] }, accountId: string): AssetQuestion {
  const sale = rowAsItStands(record, s.rowId);
  const choices = s.choices.map((p) => {
    const gain = sale?.price != null && p.price != null ? Math.min(p.shares, s.shares) * (sale.price - p.price) : null;
    return { id: `purchase:${p.firstRowId}`, label: `${p.date == null ? 'No date' : dayInWords(p.date, false)} · ${countWords(p.shares)} at ${dollarWords(p.price)} → ${dollarWords(gain)}` };
  });
  return makeQuestion({ kind: 'S1', accountId, holding: s.holding, sale: { rowId: firstRowOf(record)(s.rowId)?.rowId ?? s.rowId, shares: s.shares, choices: s.choices }, choices,
    sentence: `You ${sale?.kind === 'TRANSFER' ? 'moved' : 'sold'} ${countWords(s.shares)} ${s.holding} on ${dayInWords(sale?.date)}${sale?.price != null ? ` at ${dollarWords(sale.price)}` : ''}. Which purchase did they come from?` });
}

/** The latest day a broker's or a file's list was set beside the record for a holding: its purchases' list days and the
 *  days of the values it gave (rule 5). */
/* ─ MK-NW-F-321 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * latestListDayOf
 *
 * Answers ..... The latest day a broker's or a file's list was set beside the record for a holding: its purchases' list days and the days of the values it gave (rule 5).
 *
 * Formula .....
 *     days.reduce((a, b) => (a > b ? a : b))   if count of days
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-337 answerQuestion · MK-NW-F-341 questionsStillTrue
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-341 questionsStillTrue · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-321
 * Changed ..... not in git yet (—)
 */
export function latestListDayOf(record: readonly AssetRow[], accountId: string, holding: string | null): string | null {
  const days = [holding ? lastListDay(record, accountId, holding) : null,
    ...valueBatchesOf(record, accountId).filter((b) => b.source === 'linked' || b.source === 'file').map((b) => b.date)].filter((d): d is string => d != null);
  return days.length ? days.reduce((a, b) => (a > b ? a : b)) : null;
}

/** The standing answer facts of a question, by name, oldest first. */
/* ─ MK-NW-F-322 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * answerFactsOf
 *
 * Answers ..... The standing answer facts of a question, by name, oldest first.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-323 answeredAlready · MK-NW-F-341 questionsStillTrue
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-323 answeredAlready
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-324 questionsOf
 *               MK-NW-F-341 questionsStillTrue · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-322
 * Changed ..... not in git yet (—)
 */
const answerFactsOf = (record: readonly AssetRow[], name: string) =>
  rowsInForce(record).filter((r) => r.kind === 'FACT' && r.facts?.answerOf === name).sort((a, b) => instantOf(a.writtenAt) - instantOf(b.writtenAt));
/** Rule 8: an answered question comes back only when its difference changes. */
/* ─ MK-NW-F-323 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * answeredAlready
 *
 * Answers ..... Rule 8: an answered question comes back only when its difference changes.
 *
 * Formula .....
 *     answer facts of(record, name).some((f) => facts.answer difference = difference)
 *
 * Called by ... MK-NW-F-324 questionsOf
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-323
 * Changed ..... not in git yet (—)
 */
const answeredAlready = (record: readonly AssetRow[], q: AssetQuestion) => answerFactsOf(record, q.name).some((f) => f.facts?.answerDifference === q.difference);

/** EVERY QUESTION FOR ONE ACCOUNT, as the account holder is asked it: the ones kept (under the account, `#typed` and
 *  `#moved`) and the ones the record raises by itself (S2, S3, D1, T1, V1, V2) — each once (rule 4), an answered one only
 *  when its difference changed (rule 8). */
/* ─ MK-NW-F-324 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * questionsOf
 *
 * Answers ..... EVERY QUESTION FOR ONE ACCOUNT, as the account holder is asked it: the ones kept (under the account, `#typed` and `#moved`) and the ones the record raises by itself (S2, S3, D1, T1, V1, V2) — each once (rule 4), an answered one only when its difference changed (rule 8).
 *
 * Formula .....
 *     keys = [account id, `${account id}#typed`, `${account id}#moved`, ...object.keys(stored).filter((k) => starts with(`${account id}#`) and !ends with('#typed') and !ends with('#moved'))]
 *     entries = for each of keys: stored[each] where (e): e is stored questions => e ≠ nothing
 *     lists = [...entries.flat map((e) => lists ?? [])].sort((a, b) => (list day ?? '').locale compare(list day ?? ''))
 *     events = entries.flat map((e) => events ?? [])
 *     first = first row of(record)
 *     out = []
 *     sale = row as it stands(record, row id), list day = last list day(record, account id, holding)
 *     list source = rows in force(record).find((r) => account id = account id and holding = holding and still held on = list day).source (or 'linked' when missing)
 *     holdings = [...new set(rows in force(record).filter((r) => account id = account id and holding ≠ nothing and (kind = 'SALE' or kind = 'TRANSFER')).map((r) => holding as string))]
 *     sale = row as it stands(record, row id)
 *     opening = 'you entered a sale of'   if sale.source = 'typed'
 *     `${first up(who(account id, sale.source))} sends a sale of`   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-324
 * Changed ..... not in git yet (—)
 */
export function questionsOf(record: readonly AssetRow[], stored: Record<string, StoredQuestions>, accountId: string, who: SaysWho = saysWho): AssetQuestion[] {
  const keys = [accountId, `${accountId}#typed`, `${accountId}#moved`, ...Object.keys(stored).filter((k) => k.startsWith(`${accountId}#`) && !k.endsWith('#typed') && !k.endsWith('#moved'))];
  const entries = keys.map((k) => stored[k]).filter((e): e is StoredQuestions => e != null);
  const lists = [...entries.flatMap((e) => e.lists ?? [])].sort((a, b) => (b.listDay ?? '').localeCompare(a.listDay ?? ''));
  const events = entries.flatMap((e) => e.events ?? []);
  const first = firstRowOf(record);
  // rule 4: an event and a list question are one question when the event's purchase is among the list question's
  // purchases (taken away: a listed lot of the same date and shares); the list question is shown
  const absorbedBy = (eq: EventQuestion, lq: ListQuestion) => eq.onRecord.holding === lq.holding && (lq.onRecord.some((p) => p.firstRowId === (first(eq.onRecord.rowId)?.rowId ?? eq.onRecord.rowId))
    || (lq.kind === 'removed' && lq.listed.some((l) => dayOrNull(l.date) === dayOrNull(eq.arriving.date) && sameShares(l.shares, Math.abs(eq.arriving.shares ?? 0)))));
  const out: AssetQuestion[] = [];
  for (const lq of lists) out.push(...listQuestionToAsk(record, lq, who, events.filter((eq) => absorbedBy(eq, lq))));
  for (const eq of events) if (!lists.some((lq) => absorbedBy(eq, lq))) out.push(eventQuestionToAsk(record, eq, who));
  for (const s of salesNeedingAnAnswer(record, accountId)) out.push(saleQuestionToAsk(record, s, accountId));
  for (const e of entries) for (const u of e.unexplained ?? []) out.push(makeQuestion({ kind: 'M1', accountId, holding: null, unexplained: u, sentence: u }));
  for (const e of entries) for (const ed of e.edits ?? []) out.push(editQuestionToAsk(record, ed, who));
  for (const s of typedSalesTheListContradicts(record, accountId)) {
    const sale = rowAsItStands(record, s.rowId), listDay = lastListDay(record, accountId, s.holding);
    const listSource = rowsInForce(record).find((r) => r.accountId === accountId && r.holding === s.holding && r.stillHeldOn === listDay)?.source ?? 'linked';
    out.push(makeQuestion({ kind: 'S2', accountId, holding: s.holding, saleRowId: first(s.rowId)?.rowId ?? s.rowId, saleShares: s.shares,
      sentence: `You entered a sale of ${countWords(sale?.shares)} ${s.holding} on ${dayInWords(sale?.date)}, but ${who(accountId, listSource)}’s ${dayInWords(listDay, false)} list still shows them. Confirm ${dayInWords(sale?.date, false)}.` }));
  }
  const holdings = [...new Set(rowsInForce(record).filter((r) => r.accountId === accountId && r.holding != null && (r.kind === 'SALE' || r.kind === 'TRANSFER')).map((r) => r.holding as string))];
  for (const h of holdings) for (const b of soldBeyondRecord(record, accountId, h)) {
    const sale = rowAsItStands(record, b.rowId);
    if (!sale || sale.kind !== 'SALE') continue;
    const opening = sale.source === 'typed' ? 'You entered a sale of' : `${firstUp(who(accountId, sale.source))} sends a sale of`;
    out.push(makeQuestion({ kind: 'S3', accountId, holding: h, saleRowId: first(b.rowId)?.rowId ?? b.rowId, saleShares: b.shares,
      sentence: `${opening} ${countWords(sale.shares)} ${h} on ${dayInWords(sale.date)}; the record holds ${countWords((sale.shares ?? 0) - b.shares)}. Enter the purchase the other ${countWords(b.shares)} came from.` }));
  }
  const now = valuesLastGiven(record, accountId);
  for (const d of sharesThatDisagree(record, accountId)) {
    if (lists.some((lq) => lq.holding === d.holding) || out.some((q) => q.holding === d.holding && (q.family === 'list' || q.kind === 'S3'))) continue;   // a list question covers it
    out.push(makeQuestion({ kind: 'D1', accountId, holding: d.holding, shares: d, choices: [{ id: 'change', label: 'Change' }, { id: 'keep', label: `Keep ${countWords(d.onRecord)}` }],
      sentence: `${firstUp(who(accountId, now?.source ?? 'linked'))} says ${countWords(d.stated)} ${d.holding}; the record holds ${countWords(d.onRecord)} and no ${d.gap < 0 ? 'sale' : 'purchase'} explains ${countWords(Math.abs(d.gap))}. Confirm changing ${d.holding} to ${countWords(d.stated)} shares.` }));
  }
  const gap = now ? statedTotalGap(now) : null;
  if (now && gap != null && Math.abs(gap) >= 0.005 && now.statedTotal != null && now.total != null) {
    out.push(makeQuestion({ kind: 'T1', accountId, holding: null, total: { stated: now.statedTotal, rows: now.total, gap },
      sentence: `${firstUp(who(accountId, now.source))} states ${dollarWords(now.statedTotal)}; the record adds up to ${dollarWords(now.total)}, ${dollarWords(Math.abs(gap))} ${gap > 0 ? 'less' : 'more'}. Enter what is missing.` }));
  }
  for (const v of valuesThatDiffer(record, accountId)) {
    out.push(makeQuestion({ kind: 'V1', accountId, holding: null, values: v,
      sentence: `The information from ${who(accountId, v.given.source)} indicates ${dollarWords(v.given.total)} on ${dayInWords(v.given.date)}; you entered ${dollarWords(v.typed.total)}. Confirm changing ${dayInWords(v.given.date, false)} to ${dollarWords(v.given.total)}.` }));
  }
  for (const b of valuesNeedingADate(record, accountId)) {
    const saved = dayInWords(b.writtenAt), total = b.total == null ? 'values' : dollarWords(b.total);
    const sentence = b.source === 'file' ? `Your file imported ${saved} does not say what day its ${total} is from. What day is it from?`
      : b.source === 'typed' ? `The value you entered on ${saved} does not say what day its ${total} is from. What day is it from?`
        : `${firstUp(who(accountId, b.source))}’s values saved ${saved} do not say what day their ${total} is from. What day is it from?`;
    out.push(makeQuestion({ kind: 'V2', accountId, holding: null, batch: b, sentence }));
  }
  // rule 4: one question per name, wherever kept; rule 8: an answered one only when its difference changed
  const seen = new Set<string>();
  return out.filter((q) => { if (seen.has(q.name) || answeredAlready(record, q)) return false; seen.add(q.name); return true; });
}

/** R1: an edit that matches more than one purchase, as the account holder is asked it. */
/* ─ MK-NW-F-325 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * editQuestionToAsk
 *
 * Answers ..... R1: an edit that matches more than one purchase, as the account holder is asked it.
 *
 * Formula .....
 *     rows = for each of ed.matches: row as it stands(record, each) where (r): r is asset row => r ≠ nothing
 *     each = for each of rows: `${count words(shares)} at ${dollar words(price)} ${source = 'typed' and (first row of(record)(row id).source ?? 'typed') = 'typed' ? 'you entered' : `from ${who(account id, first row of(record)(row id).source ?? source)}`}`
 *     opening = `you took away the ${ed.holding} lot of ${day in words(ed.lot date)}.`   if ed.to = nothing
 *     `you changed the ${ed.holding} lot of ${day in words(ed.lot date)} to ${what}.`   otherwise
 *
 * Called by ... MK-NW-F-324 questionsOf
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-324 questionsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-325
 * Changed ..... not in git yet (—)
 */
export function editQuestionToAsk(record: readonly AssetRow[], ed: EditQuestion, who: SaysWho = saysWho): AssetQuestion {
  const rows = ed.matches.map((id) => rowAsItStands(record, id)).filter((r): r is AssetRow => r != null);
  const what = ed.to == null ? null : [
    ...(ed.from && !sameNumber(ed.from.price, ed.to.price) ? [dollarWords(ed.to.price)] : []),
    ...(ed.from && (dayOrNull(ed.from.date) ?? null) !== (dayOrNull(ed.to.date) ?? null) ? [dayInWords(ed.to.date)] : []),
    ...(ed.from && !sameNumber(ed.from.shares, ed.to.shares) ? [`${countWords(ed.to.shares)} shares`] : []),
  ].join(' and ');
  const each = rows.map((r) => `${countWords(r.shares)} at ${dollarWords(r.price)} ${r.source === 'typed' && (firstRowOf(record)(r.rowId)?.source ?? 'typed') === 'typed' ? 'you entered' : `from ${who(r.accountId, firstRowOf(record)(r.rowId)?.source ?? r.source)}`}`);
  const opening = ed.to == null ? `You took away the ${ed.holding} lot of ${dayInWords(ed.lotDate)}.` : `You changed the ${ed.holding} lot of ${dayInWords(ed.lotDate)} to ${what}.`;
  return makeQuestion({ kind: 'R1', accountId: ed.accountId, holding: ed.holding, edit: ed,
    choices: [...rows.map((r, i) => ({ id: `purchase:${r.rowId}`, label: each[i] })), { id: 'cancel', label: 'Cancel' }],
    sentence: `${opening} ${countOf(rows.length)} purchases match: ${each.join(' and ')}. Which one?` });
}

/** C1: the account holder changes a figure a broker or a file gave (MK-NW-F-279): asked at once, never stored. Null where
 *  nothing differs from what was given. */
/* ─ MK-NW-F-326 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * confirmMyChangeQuestion
 *
 * Answers ..... C1: the account holder changes a figure a broker or a file gave (MK-NW-F-279): asked at once, never stored.
 *
 * Formula .....
 *     d = differs from given(record, row id, change)
 *     figures = d where field = 'date' (or field = 'price' (or field = 'shares' (or field = 'amount' when missing or zero) when missing or zero) when missing or zero)
 *     nothing   when count of figures is missing
 *     now = row as it stands(record, row id) as asset row
 *     first = first row of(record)(now.row id) (or now when missing)
 *     src = who(now.account id, [...record].reverse().find((r) => (first row of(record)(row id).row id ?? row id) = first.row id and source ! = 'typed').source ?? first.source)
 *     shown = (f: string, v: string | number | nothing) => (f = 'date' ? day in words(v as string | nothing) : v = nothing ? 'not known' : f = 'shares' ? count words(v as number) : string(v))
 *     the answer = ` this changes the sale of ${count words(shares)} ${holding} on ${day in words(date, false)}: it made ${dollar words(given as number | nothing)}, it will make ${dollar words(entered as number | nothing)}.`; }).join('')
 *
 * Called by ... MK-XS-F-192 typedValueDatedBack · MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-326
 * Changed ..... not in git yet (—)
 */
export function confirmMyChangeQuestion(record: readonly AssetRow[], rowId: string, change: Partial<Pick<NewRow, 'date' | 'price' | 'shares' | 'amount'>>, who: SaysWho = saysWho): AssetQuestion | null {
  const d = differsFromGiven(record, rowId, change);
  const figures = d.filter((x) => x.field === 'date' || x.field === 'price' || x.field === 'shares' || x.field === 'amount');
  if (!figures.length) return null;
  const now = rowAsItStands(record, rowId) as AssetRow;
  const first = firstRowOf(record)(now.rowId) ?? now;
  const src = who(now.accountId, [...record].reverse().find((r) => (firstRowOf(record)(r.rowId)?.rowId ?? r.rowId) === first.rowId && r.source !== 'typed')?.source ?? first.source);
  const shown = (f: string, v: string | number | null) => (f === 'date' ? dayInWords(v as string | null) : v == null ? 'not known' : f === 'shares' ? countWords(v as number) : String(v));
  const sentence = figures.map((x) => `The information from ${src} indicates ${x.field} of ${shown(x.field, x.given)}, you entered ${shown(x.field, x.entered)}. Confirm changing ${x.field} for ${countWords(x.shares)} shares of ${x.holding} to ${shown(x.field, x.entered)}.`).join(' ')
    + d.filter((x) => x.field === 'saleGain').map((x) => { const s = x.saleRowId ? rowAsItStands(record, x.saleRowId) : null;
      return ` This changes the sale of ${countWords(s?.shares)} ${x.holding} on ${dayInWords(s?.date, false)}: it made ${dollarWords(x.given as number | null)}, it will make ${dollarWords(x.entered as number | null)}.`; }).join('');
  return makeQuestion({ kind: 'C1', accountId: now.accountId, holding: now.holding, confirm: { rowId: now.rowId, change }, sentence });
}

/** Whether two rows hold the same figures. */
/* ─ MK-NW-F-327 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * sameFigures
 *
 * Answers ..... Whether two rows hold the same figures.
 *
 * Formula .....
 *     (date ?? nothing) = (date ?? nothing) and same number(price ?? nothing, price ?? nothing)
 *
 * Called by ... MK-NW-F-329 undoAnswer
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-339 settleTwoPhones · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-329 undoAnswer
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-327
 * Changed ..... not in git yet (—)
 */
const sameFigures = (a: AssetRow | NewRow, b: AssetRow | NewRow) => (a.date ?? null) === (b.date ?? null) && sameNumber(a.price ?? null, b.price ?? null)
  && sameNumber(a.shares ?? null, b.shares ?? null) && sameNumber(a.amount ?? null, b.amount ?? null) && sameNumber(a.ratio ?? null, b.ratio ?? null) && !!a.removed === !!b.removed;

/** STEP 2 · OLD ANSWERS KEYED. An answer saved before names existed (a fact `eventPair`, `keepsOverList` or
 *  `valuesAnswered`, or the rows an answer about a list marked `byAnswer`) is given its question's name, and so are the
 *  rows saved with it (the same account, holding and time-stamp; a holding's value with its account's). Read in memory
 *  only: nothing saved is changed. `seen` counts the old answer rows found, `keyed` those given a name; `unkeyed` lists
 *  the rest, each in a sentence — the guard fails on any. */
/* ─ MK-NW-F-328 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * keyOldAnswers
 *
 * Answers ..... STEP 2 · OLD ANSWERS KEYED.
 *
 * Formula .....
 *     name = new map<string, string>()
 *     group = (r: asset row) => `${account id}|${holding ?? ''}|${written at}`
 *     group name = new map<string, string>()
 *     by id = a lookup of for each of record: [row id, each]
 *     in group = new map<string, asset row[]>()
 *     first = first row of(record)
 *     seen ids = new set<string>()
 *     unkeyed = []
 *     standing = a list with no repeats of for each of rows in force(record): row id
 *     f = facts
 *     n = nothing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-329 undoAnswer · MK-NW-F-337 answerQuestion
 *               MK-NW-F-338 newerListUndoes
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-339 settleTwoPhones · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-329 undoAnswer
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-328
 * Changed ..... not in git yet (—)
 */
export function keyOldAnswers(record: readonly AssetRow[]): { record: AssetRow[]; seen: number; keyed: number; unkeyed: string[] } {
  const name = new Map<string, string>();
  const group = (r: AssetRow) => `${r.accountId}|${r.holding ?? ''}|${r.writtenAt}`;
  const groupName = new Map<string, string>();
  const byId = new Map(record.map((r) => [r.rowId, r]));
  const inGroup = new Map<string, AssetRow[]>();
  for (const r of record) inGroup.set(group(r), [...(inGroup.get(group(r)) ?? []), r]);
  const first = firstRowOf(record);
  const seenIds = new Set<string>();
  const unkeyed: string[] = [];
  const standing = new Set(rowsInForce(record).map((r) => r.rowId));
  for (const r of record) {
    if (r.answerTo != null || r.undoes != null || r.kind !== 'FACT' || r.source !== 'typed' || !r.facts || !standing.has(r.rowId)) continue;
    const f = r.facts;
    if (typeof f.eventPair !== 'string' && typeof f.keepsOverList !== 'string' && typeof f.valuesAnswered !== 'string') continue;
    seenIds.add(r.rowId);
    let n: string | null = null;
    if (typeof f.eventPair === 'string') n = questionNameFrom(r.accountId, r.holding, 'event', f.eventPair.split('|')[0]);
    else if (typeof f.keepsOverList === 'string') n = listNameFromSignature(r.accountId, r.holding, f.keepsOverList);
    else if (typeof f.valuesAnswered === 'string') {
      const typedBatch = byId.get((f.valuesAnswered as string).split('|')[0]);
      n = typedBatch ? questionNameFrom(r.accountId, null, 'value', typedBatch.date) : null;
    }
    if (n == null) { unkeyed.push(`Row ${r.rowId}: an answer whose question cannot be named.`); continue; }
    name.set(r.rowId, n);
    groupName.set(group(r), n);
  }
  // an answer about a list that kept no fact ("the list is correct"): its rows, marked byAnswer, name the purchases it
  // replaced and the lots it saved — the question's name again
  for (const r of record) {
    if (r.answerTo != null || r.undoes != null || !r.byAnswer || groupName.has(group(r))) continue;
    const same = inGroup.get(group(r)) ?? [];
    const ids = [...new Set(same.filter((x) => x.replacesRowId && (x.kind === 'PURCHASE' || x.kind === 'TRANSFER')).map((x) => first(x.replacesRowId as string)?.rowId ?? x.replacesRowId as string))].sort();
    const listedDates = same.filter((x) => x.kind === 'PURCHASE' && !x.replacesRowId && x.stillHeldOn != null && !x.inListOf && !x.byAnswer).map((x) => x.date ?? '').sort();
    const isCount = same.some((x) => x.kind === 'PURCHASE' && !x.replacesRowId && x.averageOnly && x.byAnswer)
      || (!listedDates.length && same.some((x) => x.replacesRowId && !x.removed && x.kind === 'PURCHASE'));
    groupName.set(group(r), isCount ? questionNameFrom(r.accountId, r.holding, 'list', 'count') : questionNameFrom(r.accountId, r.holding, 'list', 'list', ids.join(','), listedDates.join(',')));
  }
  for (const r of record) {
    if (r.answerTo != null || r.undoes != null || name.has(r.rowId)) continue;
    const n = groupName.get(group(r)) ?? (r.batch != null && r.batch !== r.rowId ? name.get(r.batch) : undefined);
    if (n == null) continue;
    if (r.byAnswer || r.source === 'typed' || r.kind === 'PURCHASE' || r.kind === 'VALUE') {
      if (r.byAnswer) seenIds.add(r.rowId);
      name.set(r.rowId, n);
    }
  }
  for (const r of record) if (r.byAnswer && r.answerTo == null && r.undoes == null && !name.has(r.rowId)) { seenIds.add(r.rowId); unkeyed.push(`Row ${r.rowId}: saved by an answer, with no question to name.`); }
  const keyed = [...seenIds].filter((id) => name.has(id)).length;
  return { record: record.map((r) => (name.has(r.rowId) ? { ...r, answerTo: name.get(r.rowId) } : r)), seen: seenIds.size, keyed, unkeyed };
}

/** STEP 3 · UNDO AN ANSWER (rule 2). Only the rows of that answer still in force are touched: a correction goes back to
 *  the figures it replaced, a new row is removed, a row it took away is put back. A row the account holder has changed
 *  since is not undone: he is asked instead (a C1 question). `only` narrows the rows to one of two answers (rule 10). */
/* ─ MK-NW-F-329 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * undoAnswer
 *
 * Answers ..... STEP 3 · UNDO AN ANSWER (rule 2).
 *
 * Formula .....
 *     keyed = key old answers(record).record
 *     by id = a lookup of for each of keyed: [row id, each]
 *     replacers = new map<string, asset row[]>()
 *     of it = (r: asset row | undefined) => !!r and answer to = name and (!only or only(r))
 *     rows = [], ask: asset question[] = []
 *     next = replacers.get(row id) (or none when missing)
 *     before = by id.get(replaces row id)   if replaces row id
 *     undefined   otherwise
 *     twin = before ≠ nothing and (replacers.get(before.row id) ?? []).some((x) => x ! = r and !of it(x) and !removed and answer to ≠ nothing)
 *     now = row as it stands(keyed, row id)
 *     the answer = { rows, ask }
 *
 * Called by ... MK-NW-F-337 answerQuestion · MK-NW-F-338 newerListUndoes
 *               MK-NW-F-339 settleTwoPhones
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-339 settleTwoPhones · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-329
 * Changed ..... not in git yet (—)
 */
export function undoAnswer(record: readonly AssetRow[], name: string, only?: (r: AssetRow) => boolean, who: SaysWho = saysWho): { rows: NewRow[]; ask: AssetQuestion[] } {
  const keyed = keyOldAnswers(record).record;
  const byId = new Map(keyed.map((r) => [r.rowId, r]));
  const replacers = new Map<string, AssetRow[]>();
  for (const r of keyed) if (r.replacesRowId) replacers.set(r.replacesRowId, [...(replacers.get(r.replacesRowId) ?? []), r]);
  const ofIt = (r: AssetRow | undefined) => !!r && r.answerTo === name && (!only || only(r));
  const rows: NewRow[] = [], ask: AssetQuestion[] = [];
  for (const r of keyed.filter((x) => ofIt(x)).reverse()) {
    const next = replacers.get(r.rowId) ?? [];
    if (next.some((x) => ofIt(x))) continue;                         // the same answer changed it again: its last row is undone
    let before = r.replacesRowId ? byId.get(r.replacesRowId) : undefined;
    while (before && ofIt(before)) before = before.replacesRowId ? byId.get(before.replacesRowId) : undefined;
    // another standing row stands in for the same row (two phones answered at once): this one is only taken away
    const twin = before != null && (replacers.get(before.rowId) ?? []).some((x) => x !== r && !ofIt(x) && !x.removed && x.answerTo != null);
    if (!next.length) {
      if (before && !twin) {
        if (before.removed) continue;
        const back: NewRow = { ...strip(before), source: 'typed', replacesRowId: r.rowId, undoes: name };
        delete back.removed; delete back.dateAsGiven;
        if (back.answerTo === name) delete back.answerTo;
        rows.push(back);
      } else if (!r.removed) {
        // a new row of the answer (or, where the chain began with one, the whole chain) is taken away
        const gone: NewRow = { ...strip(r), source: 'typed', replacesRowId: r.rowId, removed: true, byAnswer: true, undoes: name };
        delete gone.answerTo;
        rows.push(gone);
      }
      continue;
    }
    // he changed it since: it is not undone; he is asked
    const now = rowAsItStands(keyed, r.rowId);
    if (!now) continue;
    if (before && sameFigures(now, before)) continue;               // already as it was before the answer
    ask.push(undoAskQuestion(keyed, now, before ?? null, who));
  }
  return { rows, ask };
}

/** Rule 2: the question put to the account holder when an answer would undo a row he has changed since. */
/* ─ MK-NW-F-330 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * undoAskQuestion
 *
 * Answers ..... Rule 2: the question put to the account holder when an answer would undo a row he has changed since.
 *
 * Formula .....
 *     shown = (f: 'date' | 'price' | 'shares', r: asset row) => (f = 'date' ? day in words(date) : f = 'price' ? dollar words(price) : count words(shares))
 *     h = now.holding (or '' when missing)
 *     fields = ['price', 'date', 'shares'] as const where (now.date ?? nothing) ! = (before.date ?? nothing)   if each = 'date'
 *     !same number(now[each] ?? nothing, before[each] ?? nothing)   otherwise
 *     change = {}
 *     shares = (change.shares ?? now.shares) as number | nothing, price = (change.price ?? now.price) as number | nothing
 *
 * Called by ... MK-NW-F-329 undoAnswer
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-NW-F-278 answerListQuestion
 *               MK-NW-F-337 answerQuestion · MK-NW-F-201 fileRowsToSave
 *               MK-NW-F-338 newerListUndoes · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-339 settleTwoPhones · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack · MK-NW-F-329 undoAnswer
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-330
 * Changed ..... not in git yet (—)
 */
function undoAskQuestion(record: readonly AssetRow[], now: AssetRow, before: AssetRow | null, _who: SaysWho): AssetQuestion {
  const shown = (f: 'date' | 'price' | 'shares', r: AssetRow) => (f === 'date' ? dayInWords(r.date) : f === 'price' ? dollarWords(r.price) : countWords(r.shares));
  const H = now.holding ?? '';
  if (before == null) {
    return makeQuestion({ kind: 'C1', accountId: now.accountId, holding: now.holding, confirm: { rowId: now.rowId, change: { removed: true } },
      sentence: `You changed this ${verbOf(now.kind) === 'bought' ? 'purchase' : 'row'} on ${dayInWords(now.writtenAt, false)} after this answer. Confirm taking away ${countWords(now.shares)} ${H} ${verbOf(now.kind)} ${dayInWords(now.date)}.` });
  }
  const fields = (['price', 'date', 'shares'] as const).filter((f) => (f === 'date' ? (now.date ?? null) !== (before.date ?? null) : !sameNumber(now[f] ?? null, before[f] ?? null)));
  const change: Partial<NewRow> = {};
  for (const f of fields) (change as Record<string, unknown>)[f] = before[f] ?? null;
  if (change.price !== undefined || change.shares !== undefined) {
    const shares = (change.shares ?? now.shares) as number | null, price = (change.price ?? now.price) as number | null;
    if (shares != null && price != null) change.amount = shares * price;
  }
  return makeQuestion({ kind: 'C1', accountId: now.accountId, holding: now.holding, confirm: { rowId: now.rowId, change },
    sentence: fields.map((f) => `You entered ${shown(f, now)} on ${dayInWords(now.writtenAt, false)} after this answer. Confirm changing ${f} for ${countWords(now.shares)} shares of ${H} to ${shown(f, before)}.`).join(' ') });
}

/** The fact every answer writes: its question's name, the choice, and the difference it answered (rule 1, rule 8). */
/* ─ MK-NW-F-331 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * answerFact
 *
 * Answers ..... The fact every answer writes: its question's name, the choice, and the difference it answered (rule 1, rule 8).
 *
 * Formula .....
 *     label = choices.find((c) => id = choice.id).label (or choice.id when missing)
 *
 * Called by ... MK-NW-F-337 answerQuestion
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-331
 * Changed ..... not in git yet (—)
 */
function answerFact(q: AssetQuestion, choice: AnswerChoice): NewRow {
  const label = q.choices.find((c) => c.id === choice.id)?.label ?? choice.id;
  return { accountId: q.accountId, holding: q.holding, kind: 'FACT', date: null, source: 'typed', answerTo: q.name,
    facts: { answerOf: q.name, answerKind: q.kind, answerChoice: choice.id, answerLabel: label, answerDifference: q.difference,
      ...(q.list?.listDay ? { answerListDay: q.list.listDay } : {}) } };
}

/** The rows a change makes, as new rows (the record before it is what it was handed). */
/* ─ MK-NW-F-332 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * rowsOfChange
 *
 * Answers ..... The rows a change makes, as new rows (the record before it is what it was handed).
 *
 * Formula .....
 *     for each of []   if problem
 *     record.slice(before.length)   otherwise: strip
 *
 * Called by ... MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-332
 * Changed ..... not in git yet (—)
 */
const rowsOfChange = (before: readonly AssetRow[], c: Changed): NewRow[] => (c.problem ? [] : c.record.slice(before.length).map(strip));

/** D1 "Change": the shares go to what the broker states — shares it states beyond the record are one purchase with no date
 *  and no price; shares it states fewer of are taken from the oldest purchase first. */
/* ─ MK-NW-F-333 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * sharesToStated
 *
 * Answers ..... D1 "Change": the shares go to what the broker states — shares it states beyond the record are one purchase with no date and no price; shares it states fewer of are taken from the oldest purchase first.
 *
 * Formula .....
 *     gap = stated − shares on record(record, account id, holding)
 *     [{ account id, holding, kind: 'PURCHASE', date: nothing, shares: gap, price: nothing, amount: nothing, source: 'typed', average only: true, by answer: true }]   when gap > EPS
 *     less = -gap
 *     out = []
 *     row = row as it stands(record, row id)
 *     take = min(shares, less); less -= take
 *     keep = (row.shares ?? 0) − take ÷ split by
 *     the answer = out
 *
 * Called by ... MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-333
 * Changed ..... not in git yet (—)
 */
function sharesToStated(record: readonly AssetRow[], accountId: string, holding: string, stated: number): NewRow[] {
  const gap = stated - sharesOnRecord(record, accountId, holding);
  if (gap > EPS) return [{ accountId, holding, kind: 'PURCHASE', date: null, shares: gap, price: null, amount: null, source: 'typed', averageOnly: true, byAnswer: true }];
  let less = -gap;
  const out: NewRow[] = [];
  for (const p of openPurchases(record, accountId, holding)) {
    if (less <= EPS) break;
    const row = rowAsItStands(record, p.rowId);
    if (!row || p.movedInBy != null) continue;
    const take = Math.min(p.shares, less); less -= take;
    const keep = (row.shares ?? 0) - take / p.splitBy;
    out.push(keep > EPS ? { ...strip(row), shares: keep, amount: row.price != null ? keep * row.price : null, source: 'typed', replacesRowId: row.rowId, byAnswer: true }
      : { ...strip(row), source: 'typed', replacesRowId: row.rowId, removed: true, byAnswer: true });
  }
  return out;
}

/** The keep-mine fact of a list question (as MK-NW-F-278 writes it). */
/* ─ MK-NW-F-334 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * keepFact
 *
 * Answers ..... The keep-mine fact of a list question (as MK-NW-F-278 writes it).
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-334
 * Changed ..... not in git yet (—)
 */
const keepFact = (lq: ListQuestion): NewRow => ({ accountId: lq.accountId, holding: lq.holding, kind: 'FACT', date: null, source: 'typed',
  facts: { keepsOverList: lq.signature, ...(lq.holdingGap != null ? { holdingGap: lq.holdingGap } : {}) } });

/** What one choice writes, on the record as it stands after the earlier answer is undone (§ 3, the right-hand column). */
/* ─ MK-NW-F-335 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * writeAnswer
 *
 * Answers ..... What one choice writes, on the record as it stands after the earlier answer is undone (§ 3, the right-hand column).
 *
 * Formula .....
 *     c = choice.id
 *     correction = (row id: string, change: partial<new row>) => rows of change(base, correct row(base, row id, change, 'typed', '9999 − 12 − 31T00:00:00.000Z'))
 *     eq = event as event question
 *     now = ...eq = ...eq
 *     on record = row as it stands(base, eq.on record.row id) (or eq.on record when missing)
 *     answer = 'theirs'   if c = 'change' (or c = 'put − back' when missing or zero)
 *     'both'   if c = 'two − purchases'
 *     'mine'   otherwise   otherwise
 *     rows = answer event question(now, answer, base)
 *     the answer:
 *     rows   if count of rows
 *     answer event question(now, answer, [])   otherwise
 *     lq = list as list question
 *     answer list question(base, lq, true, lq.source, lq.list day)   when c = 'list − correct' (or c = 'put − back' (or c = 'change' when missing or zero) when missing or zero)
 *     lq = list as list question
 *     [keep fact(lq)]   when c ! = 'expired'
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-337 answerQuestion
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-335
 * Changed ..... not in git yet (—)
 */
function writeAnswer(base: AssetRow[], q: AssetQuestion, choice: AnswerChoice): NewRow[] {
  const c = choice.id;
  const correction = (rowId: string, change: Partial<NewRow>) => rowsOfChange(base, correctRow(base, rowId, change, 'typed', '9999-12-31T00:00:00.000Z'));
  switch (q.kind) {
    case 'E1': case 'E2': case 'E3': case 'E4': {
      const eq = q.event as EventQuestion;
      const now = { ...eq, onRecord: rowAsItStands(base, eq.onRecord.rowId) ?? eq.onRecord };
      const answer = c === 'change' || c === 'put-back' ? 'theirs' : c === 'two-purchases' ? 'both' : 'mine';
      const rows = answerEventQuestion(now, answer, base);
      return rows.length ? rows : answerEventQuestion(now, answer, []);
    }
    case 'L1': case 'L2': case 'L3': case 'L4': case 'L5': case 'L6': {
      const lq = q.list as ListQuestion;
      if (c === 'list-correct' || c === 'put-back' || c === 'change') return answerListQuestion(base, lq, true, lq.source, lq.listDay);
      // "mine is correct", "stays away", "keep mine": the list's fact, and each event question it stands for (rule 4)
      return [keepFact(lq), ...(q.absorbs ?? []).flatMap((eq) => answerEventQuestion(eq, 'mine', []))];
    }
    case 'X1': {
      const lq = q.list as ListQuestion;
      if (c !== 'expired') return [keepFact(lq)];
      const expiry = lq.expiry ?? optionExpiryOf(base, lq.accountId, lq.holding);
      const shares = sharesOnRecord(base, lq.accountId, lq.holding);
      return shares > EPS ? [saleRow({ accountId: lq.accountId, holding: lq.holding, date: expiry, shares, price: 0, amount: 0, source: 'typed' })] : [];
    }
    case 'X2': return c === 'enter' ? (choice.rows ?? []) : [keepFact(q.list as ListQuestion)];
    case 'S1': {
      const s = q.sale as NonNullable<AssetQuestion['sale']>;
      const sale = rowAsItStands(base, s.rowId), lot = c.startsWith('purchase:') ? c.slice('purchase:'.length) : null;
      if (!sale || lot == null) return [];
      const p = openPurchases(base, q.accountId, q.holding as string).find((x) => x.firstRowId === lot || x.rowId === lot);
      return correction(sale.rowId, { sells: [...(sale.sells ?? []), { rowId: lot, shares: Math.min(s.shares, p?.shares ?? s.shares) }] });
    }
    case 'S2': {
      const sale = rowAsItStands(base, q.saleRowId as string);
      if (!sale || c === 'keep') return [];
      if (c === 'change-date') return choice.date ? correction(sale.rowId, { date: choice.date }) : [];
      return rowsOfChange(base, removeRow(base, sale.rowId, 'typed', '9999-12-31T00:00:00.000Z'));
    }
    case 'S3': case 'T1': case 'M1': return c === 'enter' ? (choice.rows ?? []) : [];
    case 'D1': {
      const d = q.shares as NonNullable<AssetQuestion['shares']>;
      return c === 'change' ? sharesToStated(base, q.accountId, q.holding as string, d.stated)
        : [{ accountId: q.accountId, holding: q.holding, kind: 'FACT', date: null, source: 'typed', facts: { keepsOverList: `shares|${d.gap}`, holdingGap: d.gap } }];
    }
    case 'R1': {
      const ed = q.edit as EditQuestion, rowId = c.startsWith('purchase:') ? c.slice('purchase:'.length) : null;
      const at = rowId ? rowAsItStands(base, rowId) : null;
      if (!at) return [];
      if (ed.to == null) return rowsOfChange(base, removeRow(base, at.rowId, 'typed', '9999-12-31T00:00:00.000Z'));
      const change = lotChange(ed.from ?? at, at, ed.to);
      return Object.keys(change).length ? correction(at.rowId, change) : [];
    }
    case 'V1': {
      const v = q.values as NonNullable<AssetQuestion['values']>;
      const answer = c === 'change' ? 'theirs' : 'mine';
      const rows = answerValuesQuestion(v, answer, base);
      return rows.length ? rows : answerValuesQuestion(v, answer, []);
    }
    case 'V2': {
      const b = q.batch as ValueBatch;
      if (c !== 'date' || dayOrNull(choice.date) == null) return [];
      const copy = valueRows({ accountId: b.accountId, date: dayOrNull(choice.date), source: 'typed', cash: b.cash, statedTotal: b.statedTotal, typedValue: b.typedValue,
        holdings: b.holdings.map((h) => ({ holding: h.holding, shares: h.shares, price: h.price, value: h.value })) });
      const undated = rowsInForce(base).filter((r) => r.kind === 'VALUE' && r.accountId === b.accountId && (r.batch === b.batch || r.rowId === b.batch || (firstRowOf(base)(r.rowId)?.batch === b.batch)));
      return [...copy, ...undated.map((r): NewRow => ({ ...strip(r), source: 'typed', replacesRowId: r.rowId, removed: true }))];
    }
    case 'C1': {
      const cf = q.confirm as NonNullable<AssetQuestion['confirm']>;
      if (c !== 'confirm') return [];
      return cf.change.removed ? rowsOfChange(base, removeRow(base, cf.rowId, 'typed', '9999-12-31T00:00:00.000Z')) : correction(cf.rowId, cf.change);
    }
  }
}

/** Whether a question is still raised by the record as it stands (its own earlier answer undone). */
/* ─ MK-NW-F-336 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * stillAsked
 *
 * Answers ..... Whether a question is still raised by the record as it stands (its own earlier answer undone).
 *
 * Formula .....
 *     first = first row of(record)
 *     lq = list as list question
 *     the answer = purchases from list(record, lq.account id, lq.holding, lq.listed all ?? lq.listed, lq.source, lq.list day, [], true).ask.some((x) => list question name(x) = name)
 *
 * Called by ... MK-NW-F-337 answerQuestion
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-336
 * Changed ..... not in git yet (—)
 */
function stillAsked(record: AssetRow[], q: AssetQuestion): boolean {
  const first = firstRowOf(record);
  switch (q.kind) {
    case 'E1': case 'E2': case 'E3': case 'E4': return sortArriving(record, [(q.event as EventQuestion).arriving]).ask.some((x) => eventQuestionName(x) === q.name);
    case 'L1': case 'L2': case 'L3': case 'L4': case 'L5': case 'L6': case 'X1': {
      const lq = q.list as ListQuestion;
      return purchasesFromList(record, lq.accountId, lq.holding, lq.listedAll ?? lq.listed, lq.source, lq.listDay, [], true).ask.some((x) => listQuestionName(x) === q.name);
    }
    case 'S1': {
      if (q.list) {                                                    // one of several sales a list asks about (rule 3)
        const lq = q.list;
        return purchasesFromList(record, lq.accountId, lq.holding, lq.listedAll ?? lq.listed, lq.source, lq.listDay, [], true).ask.some((x) => x.signature === lq.signature);
      }
      return salesNeedingAnAnswer(record, q.accountId).some((s) => (first(s.rowId)?.rowId ?? s.rowId) === q.sale?.rowId);
    }
    case 'S2': return typedSalesTheListContradicts(record, q.accountId).some((s) => (first(s.rowId)?.rowId ?? s.rowId) === q.saleRowId);
    case 'S3': return soldBeyondRecord(record, q.accountId, q.holding as string).some((s) => (first(s.rowId)?.rowId ?? s.rowId) === q.saleRowId);
    case 'D1': return sharesThatDisagree(record, q.accountId).some((d) => d.holding === q.holding);
    case 'T1': { const now = valuesLastGiven(record, q.accountId); const g = now ? statedTotalGap(now) : null; return g != null && Math.abs(g) >= 0.005; }
    case 'V1': return valuesThatDiffer(record, q.accountId).some((v) => v.typed.date === q.values?.typed.date);
    case 'V2': return valuesNeedingADate(record, q.accountId).some((b) => b.batch === q.batch?.batch);
    default: return true;
  }
}

/** STEP 3 · ANSWER A QUESTION (rules 2 and 5). A question a newer list settled writes nothing, and says so. Otherwise
 *  the earlier answer to the same name is undone first (a row he has changed since stops it: he is asked instead), then
 *  the choice is written; every row carries the question's name, beside one fact of the answer. */
/* ─ MK-NW-F-337 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * answerQuestion
 *
 * Answers ..... STEP 3 · ANSWER A QUESTION (rules 2 and 5).
 *
 * Formula .....
 *     nothing = (told: string | nothing, ask: asset question[] = []): answered => ({ record: [...record], rows: [], ask, told })
 *     nothing(nothing)   when choice.id = 'cancel'
 *     rows = write answer([...record], q, choice)
 *     the answer:
 *     record = add rows(record, rows, written at)   if count of rows
 *     [...record]   otherwise
 *     rows = rows
 *     ask = []
 *     told = nothing
 *     latest = latest list day of(record, account id, holding)
 *     nothing(`${first up(who(account id, list.source))}’s list of ${day in words(latest, false)} already settled this; nothing changed.`)   when latest ≠ nothing and latest > list.list day
 *     keyed = key old answers(record).record
 *     answered before = keyed.some((r) => answer to = name)
 *     undo = undo answer(record, name, undefined, who)
 *     nothing(nothing, undo.ask)   when count of undo.ask
 *     base = add rows(keyed, undo.rows, written at)   if count of undo.rows
 *     keyed   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-278 answerListQuestion · MK-XS-F-192 typedValueDatedBack
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-337
 * Changed ..... not in git yet (—)
 */
export function answerQuestion(record: readonly AssetRow[], q: AssetQuestion, choice: AnswerChoice, writtenAt: string, who: SaysWho = saysWho): Answered {
  const nothing = (told: string | null, ask: AssetQuestion[] = []): Answered => ({ record: [...record], rows: [], ask, told });
  if (choice.id === 'cancel') return nothing(null);                // "Cancel" writes nothing and undoes nothing (R1, C1)
  if (q.kind === 'C1') {
    const rows = writeAnswer([...record], q, choice);
    return { record: rows.length ? addRows(record, rows, writtenAt) : [...record], rows, ask: [], told: null };
  }
  // rule 5: a later list for that holding was set beside the record — the older list's question is closed
  if (q.list?.listDay != null) {
    const latest = latestListDayOf(record, q.accountId, q.holding);
    if (latest != null && latest > q.list.listDay) return nothing(`${firstUp(who(q.accountId, q.list.source))}’s list of ${dayInWords(latest, false)} already settled this; nothing changed.`);
  }
  const keyed = keyOldAnswers(record).record;
  const answeredBefore = keyed.some((r) => r.answerTo === q.name);
  const undo = undoAnswer(record, q.name, undefined, who);
  if (undo.ask.length) return nothing(null, undo.ask);
  const base = undo.rows.length ? addRows(keyed, undo.rows, writtenAt) : keyed;
  if (!answeredBefore && !stillAsked(base, q)) return nothing('The record already settled this; nothing changed.');
  const written = writeAnswer(base, q, choice);
  const tagged = choice.id === 'cancel' ? [] : [...written.map((r) => ({ ...r, answerTo: q.name })), answerFact(q, choice)];
  const rows = [...undo.rows, ...tagged];
  return { record: rows.length ? addRows(record, rows, writtenAt) : [...record], rows, ask: [], told: null };
}

/** RULE 5 · A NEWER LIST UNDOES AN OLDER LIST'S ANSWER where it matches the record as it was before that answer. Run
 *  before the newer list is set beside the record. Returns the rows that undo, and the sentence for each. */
/* ─ MK-NW-F-338 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * newerListUndoes
 *
 * Answers ..... RULE 5 · A NEWER LIST UNDOES AN OLDER LIST'S ANSWER where it matches the record as it was before that answer.
 *
 * Formula .....
 *     h = one holding spelling(holding) as string, day = day or null(list day)
 *     rows = []
 *     notes = []   when day = nothing
 *     keyed = key old answers(record).record
 *     rows = [], notes: string[] = []
 *     quiet = (x: { rows: new row[]; ask: list question[] }) => !ask.length and rows.every((r) => kind = 'FACT')
 *     name = facts.answer of as string
 *     before = keyed where answer to ! = name
 *     u = undo answer(record, name, undefined, who)
 *     the answer = { rows, notes }
 *
 * Called by ... MK-NW-F-201 fileRowsToSave · MK-XS-F-192 typedValueDatedBack
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-201 fileRowsToSave · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-338
 * Changed ..... not in git yet (—)
 */
export function newerListUndoes(record: readonly AssetRow[], accountId: string, holding: string, listed: readonly ListedPurchase[], source: RowSource, listDay: string | null, who: SaysWho = saysWho): { rows: NewRow[]; notes: string[] } {
  const H = oneHoldingSpelling(holding) as string, day = dayOrNull(listDay);
  if (day == null) return { rows: [], notes: [] };
  const keyed = keyOldAnswers(record).record;
  const facts = rowsInForce(keyed).filter((f) => f.kind === 'FACT' && f.accountId === accountId && f.holding === H && typeof f.facts?.answerOf === 'string'
    && typeof f.facts?.answerListDay === 'string' && (f.facts.answerListDay as string) < day);
  const rows: NewRow[] = [], notes: string[] = [];
  const quiet = (x: { rows: NewRow[]; ask: ListQuestion[] }) => !x.ask.length && x.rows.every((r) => r.kind === 'FACT');
  for (const f of facts) {
    const name = f.facts?.answerOf as string;
    const before = keyed.filter((r) => r.answerTo !== name);
    if (!quiet(purchasesFromList(before, accountId, H, listed, source, day, [], true))) continue;
    if (quiet(purchasesFromList(keyed, accountId, H, listed, source, day, [], true))) continue;
    const u = undoAnswer(record, name, undefined, who);
    if (u.ask.length || !u.rows.length) continue;
    rows.push(...u.rows);
    notes.push(`${firstUp(who(accountId, source))}’s list of ${dayInWords(day, false)} shows the ${countWords(sharesOnRecord(before, accountId, H))} ${H} again, so your ${dayInWords(f.facts?.answerListDay as string, false)} answer was undone.`);
  }
  return { rows, notes };
}

/** RULE 10 · TWO PHONES, TWO ANSWERS. Both are kept; the later counts — the earlier one's rows are undone — and the other
 *  is told in a note. */
/* ─ MK-NW-F-339 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * settleTwoPhones
 *
 * Answers ..... RULE 10 · TWO PHONES, TWO ANSWERS.
 *
 * Formula .....
 *     by name = new map<string, asset row[]>()
 *     rows = [], notes: { account id: string; note: string }[] = []
 *     now = [...record]
 *     at = row position(record)
 *     sorted = [...facts].sort((a, b) => instant of(written at) − instant of(written at) or at(row id) − at(row id))
 *     later = sorted[sorted.length − 1]
 *     u = undo answer(now, name, (r) => written at = written at, who)
 *     the answer = { rows, notes }
 *
 * Called by ... MK-NW-F-342 afterAWrite
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-339
 * Changed ..... not in git yet (—)
 */
export function settleTwoPhones(record: readonly AssetRow[], who: SaysWho = saysWho): { rows: NewRow[]; notes: { accountId: string; note: string }[] } {
  const byName = new Map<string, AssetRow[]>();
  for (const f of rowsInForce(record)) if (f.kind === 'FACT' && typeof f.facts?.answerOf === 'string') byName.set(f.facts.answerOf as string, [...(byName.get(f.facts.answerOf as string) ?? []), f]);
  const rows: NewRow[] = [], notes: { accountId: string; note: string }[] = [];
  let now = [...record];
  for (const [name, facts] of byName) {
    if (facts.length < 2) continue;
    const at = rowPosition(record);   // R1: on one time-stamp, by place in the record
    const sorted = [...facts].sort((a, b) => instantOf(a.writtenAt) - instantOf(b.writtenAt) || at(a.rowId) - at(b.rowId));
    const later = sorted[sorted.length - 1];
    for (const e of sorted.slice(0, -1)) {
      const u = undoAnswer(now, name, (r) => r.writtenAt === e.writtenAt, who);
      if (u.ask.length) continue;
      if (u.rows.length) { now = addRows(now, u.rows, later.writtenAt); rows.push(...u.rows); }
      notes.push({ accountId: e.accountId, note: `Another phone answered “${e.facts?.answerLabel}” at ${e.writtenAt.slice(11, 16)}; the later answer, “${later.facts?.answerLabel}”, counts.` });
    }
  }
  return { rows, notes };
}

/** X2 (rule 6): in one update an option left the list and its shares arrived — one question, never two. The X1 question
 *  becomes X2, and the arriving holding's own list questions are dropped. */
/* ─ MK-NW-F-340 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * oneQuestionPerExercise
 *
 * Answers ..... X2 (rule 6): in one update an option left the list and its shares arrived — one question, never two.
 *
 * Formula .....
 *     out = [...asks]
 *     u = option details of(record, account id, holding).underlying
 *     l = lists.find((x) => one holding spelling(holding) = U)   if U
 *     undefined   otherwise
 *     arrived = Σ over listed of (shares)- shares on record(record, account id, U)
 *     the answer = out
 *
 * Called by ... MK-NW-F-201 fileRowsToSave · MK-XS-F-192 typedValueDatedBack
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-201 fileRowsToSave · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-340
 * Changed ..... not in git yet (—)
 */
export function oneQuestionPerExercise(record: readonly AssetRow[], accountId: string, lists: readonly { holding: string; listed: readonly ListedPurchase[] }[], asks: readonly ListQuestion[]): ListQuestion[] {
  let out = [...asks];
  for (const q of asks) {
    if (q.kind !== 'expired') continue;
    const U = optionDetailsOf(record, accountId, q.holding).underlying;
    const l = U ? lists.find((x) => oneHoldingSpelling(x.holding) === U) : undefined;
    if (!U || !l) continue;
    const arrived = l.listed.reduce((t, x) => t + x.shares, 0) - sharesOnRecord(record, accountId, U);
    if (!sameShares(arrived, q.sharesOnRecord)) continue;
    out = out.filter((x) => x !== q && x.holding !== U);
    out.push({ ...q, kind: 'exercised', signature: q.signature.replace(/^expired/, 'exercised'), arrivedHolding: U, arrivedShares: arrived });
  }
  return out;
}

/** STEP 8 · THE QUESTIONS STILL TRUE, after any write (rules 4, 5 and 7, across all three keys): each kept question is
 *  asked again of the record as it stands and dropped where it is not raised again; an older list's question closes once
 *  a later list for that holding is set beside the record; `needsADate` is read from MK-NW-F-249; one question per name. */
/* ─ MK-NW-F-341 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * questionsStillTrue
 *
 * Answers ..... STEP 8 · THE QUESTIONS STILL TRUE, after any write (rules 4, 5 and 7, across all three keys): each kept question is asked again of the record as it stands and dropped where it is not raised again; an older list's question closes once a later list for that holding is set beside the record; `needsADate` is read from MK-NW-F-249; one question per name.
 *
 * Formula .....
 *     out = {}
 *     seen = new map<string, set<string>>()
 *     order = (k: string) => (includes('#') ? (ends with('#typed') ? 1 : 2) : 0)
 *     e = stored[key]
 *     account id = the first of key.split('#')
 *     names = seen.get(account id) (or new set<string>(); seen.set(account id, names) when missing)
 *     once = (n: string) => { if (names.has(n)) return false; names.add(n); return true; }
 *     answered = (n: string) => answer facts of(record, n).length > 0
 *     next = { ...e, events, lists }
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-342 afterAWrite
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-342 afterAWrite · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-341
 * Changed ..... not in git yet (—)
 */
export function questionsStillTrue(record: readonly AssetRow[], stored: Record<string, StoredQuestions>): Record<string, StoredQuestions> {
  const out: Record<string, StoredQuestions> = {};
  const seen = new Map<string, Set<string>>();          // names kept, by account
  const order = (k: string) => (k.includes('#') ? (k.endsWith('#typed') ? 1 : 2) : 0);
  for (const key of Object.keys(stored).sort((a, b) => order(a) - order(b) || a.localeCompare(b))) {
    const e = stored[key];
    if (!e) continue;
    const accountId = key.split('#')[0];
    const names = seen.get(accountId) ?? new Set<string>(); seen.set(accountId, names);
    const once = (n: string) => { if (names.has(n)) return false; names.add(n); return true; };
    const answered = (n: string) => answerFactsOf(record, n).length > 0;
    const events = [...(e.events ?? [])].reverse().filter((q) => sortArriving(record, [q.arriving]).ask.some((x) => x.key === q.key))
      .filter((q) => once(`event:${eventQuestionName(q)}`)).reverse();
    const lists = [...(e.lists ?? [])].sort((a, b) => (b.listDay ?? '').localeCompare(a.listDay ?? ''))
      .filter((q) => { const latest = latestListDayOf(record, q.accountId, q.holding); return !(q.listDay != null && latest != null && latest > q.listDay); })
      .filter((q) => (q.kind === 'exercised' ? !answered(listQuestionName(q))
        : purchasesFromList(record, q.accountId, q.holding, q.listedAll ?? q.listed, q.source ?? 'linked', q.listDay ?? null, events).ask.some((x) => x.signature === q.signature)))
      .filter((q) => once(`list:${listQuestionName(q)}`));
    const next: StoredQuestions = { ...e, events, lists };
    if (e.sales != null) next.sales = salesNeedingAnAnswer(record, accountId);
    if (e.needsADate != null) next.needsADate = valuesNeedingADate(record, accountId).length > 0;
    if (e.unexplained != null) next.unexplained = e.unexplained.filter((u) => !answered(questionNameFrom(accountId, null, 'move', u)));
    if (e.edits != null) next.edits = e.edits.filter((ed) => !answered(questionNameFrom(ed.accountId, ed.holding, 'edit', [...ed.matches].sort().join(','))));
    out[key] = next;                                      // an account's place is kept, empty or not
  }
  return out;
}

/** AFTER ANY WRITE (the four store writers and the answer action): two phones' answers settled (rule 10), then the
 *  questions still true kept (step 8). */
/* ─ MK-NW-F-342 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * afterAWrite
 *
 * Answers ..... AFTER ANY WRITE (the four store writers and the answer action): two phones' answers settled (rule 10), then the questions still true kept (step 8).
 *
 * Formula .....
 *     two = settle two phones(record, who)
 *     next = add rows(record, two.rows, written at)   if count of two.rows
 *     [...record]   otherwise
 *     with notes = { ...stored }
 *     was = with notes[account id] (or events = []
 *     lists = []
 *     at = written at when missing)
 *     the answer:
 *     record = next
 *     questions = questions still true(next, with notes)
 *
 * Called by ... MK-XS-F-192 typedValueDatedBack · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-229 typedIntoRecord
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-229 typedIntoRecord
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-342
 * Changed ..... not in git yet (—)
 */
export function afterAWrite(record: readonly AssetRow[], stored: Record<string, StoredQuestions>, writtenAt: string, who: SaysWho = saysWho): { record: AssetRow[]; questions: Record<string, StoredQuestions> } {
  const two = settleTwoPhones(record, who);
  const next = two.rows.length ? addRows(record, two.rows, writtenAt) : [...record];
  const withNotes = { ...stored };
  for (const n of two.notes) {
    const was = withNotes[n.accountId] ?? { events: [], lists: [], at: writtenAt };
    withNotes[n.accountId] = { ...was, notes: [...(was.notes ?? []), n.note] };
  }
  return { record: next, questions: questionsStillTrue(next, withNotes) };
}

/** What an edit of a tax lot changes on the purchase it stands for — read from the lot before and after, never from the
 *  purchase (a lot shows the shares left after sales, so the purchase keeps its own and takes only the difference). */
/* ─ MK-NW-F-343 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * lotChange
 *
 * Answers ..... What an edit of a tax lot changes on the purchase it stands for — read from the lot before and after, never from the purchase (a lot shows the shares left after sales, so the purchase keeps its own and takes only the difference).
 *
 * Formula .....
 *     same = (x: number | nothing | undefined, y: number | nothing | undefined) => same number(x ?? nothing, y ?? nothing)
 *     change = {}
 *     shares = change.shares (or at.shares (or 0 when missing) when missing)
 *     the answer = change
 *
 * Called by ... MK-NW-F-221 lotsFollow · MK-NW-F-335 writeAnswer
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-337 answerQuestion
 *               MK-NW-F-221 lotsFollow · MK-NW-F-228 moveOldCopies
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-F-224 typedChangeToRecord
 *               MK-XS-F-229 typedIntoRecord · MK-XS-F-192 typedValueDatedBack
 *               MK-NW-F-335 writeAnswer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-343
 * Changed ..... not in git yet (—)
 */
export function lotChange(prior: Pick<NewRow, 'date' | 'shares' | 'price'>, at: Pick<AssetRow, 'date' | 'shares' | 'price'>, to: Pick<NewRow, 'date' | 'shares' | 'price'>): Partial<NewRow> {
  const same = (x: number | null | undefined, y: number | null | undefined) => sameNumber(x ?? null, y ?? null);
  const change: Partial<NewRow> = {};
  if ((prior.date ?? null) !== (to.date ?? null) && (at.date ?? null) !== (to.date ?? null)) change.date = to.date;
  if (!same(prior.shares, to.shares)) change.shares = (at.shares ?? 0) + ((to.shares ?? 0) - (prior.shares ?? 0));
  const shares = change.shares ?? at.shares ?? 0;
  if (!same(prior.price, to.price) && !same(at.price, to.price)) { change.price = to.price; change.amount = to.price == null ? null : shares * to.price; }
  else if (change.shares != null && at.price != null) change.amount = shares * at.price;
  return change;
}
