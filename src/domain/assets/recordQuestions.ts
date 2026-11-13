// WHAT A PAGE SHOWS OF THE MASTER RECORD'S QUESTIONS (account-page v02 and holding-detail v03, 2026-11-12; design
// moneykeel_calc_spec_questions-and-answers-on-the-master-record_v02.md § 3, § 4). One door between the record's question
// functions (MoneyKeel/functions/networth-and-performance/asset-record.ts) and the two pages that ask them: the questions of an
// account, each one's sentence and choices as the record writes them, where each is asked, the other source's figure shown
// beside the record's, what each choice makes (read from the record as the answer would leave it — the page works nothing out),
// the answers already given, the day the account's value is from, and a price's own day where it is older than 7 days
// (DEC-10558: "if price is stale, app just state so. but still display it and use it.").
import {
  questionsOf, confirmMyChangeQuestion, answerQuestion, undoAnswer, addRows, openPurchases, sharesOnRecord, saleGain,
  rowsInForce, rowAsItStands, valuesNow, valueBatchesOf, valuesNeedingADate, firstUp,
  type AssetRow, type AssetQuestion, type StoredQuestions, type SaysWho, type RowSource, type NewRow,
} from '../../../MoneyKeel/functions/networth-and-performance/asset-record';
import { dateShown } from '../_shared/dates';
import { writeFigure } from '../../../MoneyKeel/functions/_figure-spec';
import { ACCOUNT_FIGURES } from '../../../MoneyKeel/functions/networth-and-performance/account';
/** An amount a question quotes, in whole dollars, written by its declaration MK-NW-M-076 (rule 11). */
/* ─ MK-NW-F-417 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * amountSaid
 *
 * Answers ..... An amount a question quotes, in whole dollars, written by its declaration MK-NW-M-076 (rule 11).
 *
 * Formula .....
 *     write figure(ACCOUNT_FIGURES['MK − NW − M − 076'], n)
 *
 * Called by ... MK-NW-F-390 priceShown · MK-NW-F-400 choiceMakes
 *               MK-NW-F-408 answerWords
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-408 answerWords · MK-NW-F-409 answersShown
 *               MK-NW-F-400 choiceMakes · MK-NW-F-401 choiceTitle
 *               MK-NW-F-390 priceShown · MK-NW-F-402 questionFootLine
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-417
 * Changed ..... not in git yet (—)
 */
const amountSaid = (n: number) => writeFigure(ACCOUNT_FIGURES['MK-NW-M-076'], n);
/** A price a question quotes, with cents, written by its declaration MK-NW-M-077 (rule 11). */
/* ─ MK-NW-F-418 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * priceSaid
 *
 * Answers ..... A price a question quotes, with cents, written by its declaration MK-NW-M-077 (rule 11).
 *
 * Formula .....
 *     write figure(ACCOUNT_FIGURES['MK − NW − M − 077'], n)
 *
 * Called by ... MK-NW-F-390 priceShown · MK-NW-F-396 otherSays
 *               MK-NW-F-407 enteredOverGiven
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-408 answerWords · MK-NW-F-409 answersShown
 *               MK-NW-F-400 choiceMakes · MK-NW-F-401 choiceTitle
 *               MK-NW-F-407 enteredOverGiven · MK-NW-F-396 otherSays
 *               MK-NW-F-390 priceShown · MK-NW-F-402 questionFootLine
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-418
 * Changed ..... not in git yet (—)
 */
const priceSaid = (n: number) => writeFigure(ACCOUNT_FIGURES['MK-NW-M-077'], n);
import { plural } from '../_shared/plural';

/** An account as these functions read it: its id, and the broker that sends its records. */
export interface QuestionAccount { asset_id: string | number; institution?: string | null; label?: string | null }

const FAR = '9999-12-31T00:00:00.000Z';
/** A day without its year: "Nov 10". */
/* ─ MK-NW-F-388 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * dayNoYear
 *
 * Answers ..... A day without its year: "Nov 10".
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-400 choiceMakes · MK-NW-F-408 answerWords
 *               MK-NW-F-414 saleNotKnownWords
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-408 answerWords · MK-NW-F-409 answersShown
 *               MK-NW-F-400 choiceMakes · MK-NW-F-414 saleNotKnownWords
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-388
 * Changed ..... not in git yet (—)
 */
const dayNoYear = (d: string | null | undefined) => dateShown(d).replace(/, \d{4}$/, '');
/** A count of shares as a person reads it: 1,000 · 2.5. */
/* ─ MK-NW-F-389 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * countShown
 *
 * Answers ..... A count of shares as a person reads it: 1,000 · 2.5.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-396 otherSays · MK-NW-F-397 questionSummary
 *               MK-NW-F-400 choiceMakes · MK-NW-F-401 choiceTitle
 *               MK-NW-F-402 questionFootLine · MK-NW-F-408 answerWords
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-408 answerWords · MK-NW-F-409 answersShown
 *               MK-NW-F-400 choiceMakes · MK-NW-F-401 choiceTitle
 *               MK-NW-F-396 otherSays · MK-NW-F-402 questionFootLine
 *               MK-NW-F-397 questionSummary
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Shows 8 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-389
 * Changed ..... not in git yet (—)
 */
const countShown = (n: number | null | undefined) => (n == null ? 'not known' : Number(Number(n).toFixed(8)).toLocaleString('en-US', { maximumFractionDigits: 8 }));
/** A price as a sentence writes it: $350 when whole, $50.35 otherwise. */
/* ─ MK-NW-F-390 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * priceShown
 *
 * Answers ..... A price as a sentence writes it: $350 when whole, $50.35 otherwise.
 *
 * Formula .....
 *     'not known'   if n = nothing
 *     size of(n − round(n)) < 0.005 ? amount said(n) : price said(n)   otherwise
 *
 * Called by ... MK-NW-F-400 choiceMakes · MK-NW-F-401 choiceTitle
 *               MK-NW-F-402 questionFootLine · MK-NW-F-408 answerWords
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-408 answerWords · MK-NW-F-409 answersShown
 *               MK-NW-F-400 choiceMakes · MK-NW-F-401 choiceTitle
 *               MK-NW-F-402 questionFootLine
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-390
 * Changed ..... not in git yet (—)
 */
const priceShown = (n: number | null | undefined) => (n == null ? 'not known' : Math.abs(n - Math.round(n)) < 0.005 ? amountSaid(n) : priceSaid(n));

/** WHO GAVE A FIGURE, AS THE PAGE NAMES IT: the broker by its name ("Robinhood"), a file by its day ("your file of Jan 4,
 *  2027"), the person as "you". The record's sentences take this as their `who`. */
/* ─ MK-NW-F-391 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * whoSaysFor
 *
 * Answers ..... WHO GAVE A FIGURE, AS THE PAGE NAMES IT: the broker by its name ("Robinhood"), a file by its day ("your file of Jan 4, 2027"), the person as "you".
 *
 * Formula .....
 *     broker = string(account.institution or account.label or 'your broker').trim()
 *     file days = value batches of(record, string(account.asset id)) where source = 'file' and date ≠ nothingfor each of : date as string, in order
 *     file day = file days[file days.length − 1]   if count of file days
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-392 accountQuestions · MK-NW-F-395 questionHeadline
 *               MK-NW-F-396 otherSays · MK-NW-F-397 questionSummary
 *               MK-NW-F-398 questionsCountLine · MK-NW-F-400 choiceMakes
 *               MK-NW-F-402 questionFootLine · MK-NW-F-405 confirmChangeQuestion
 *               MK-NW-F-407 enteredOverGiven · MK-NW-F-408 answerWords
 *               MK-NW-F-409 answersShown
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-392 accountQuestions · MK-NW-F-408 answerWords
 *               MK-NW-F-409 answersShown · MK-NW-F-400 choiceMakes
 *               MK-NW-F-405 confirmChangeQuestion · MK-NW-F-415 confirmForSavedLots
 *               MK-NW-F-407 enteredOverGiven · MK-NW-F-396 otherSays
 *               MK-NW-F-402 questionFootLine · MK-NW-F-395 questionHeadline
 *               MK-NW-F-397 questionSummary · MK-NW-F-398 questionsCountLine
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-391
 * Changed ..... not in git yet (—)
 */
export function whoSaysFor(record: readonly AssetRow[], account: QuestionAccount): SaysWho {
  const broker = String(account.institution || account.label || 'your broker').trim();
  const fileDays = valueBatchesOf(record, String(account.asset_id)).filter((b) => b.source === 'file' && b.date != null).map((b) => b.date as string).sort();
  const fileDay = fileDays.length ? fileDays[fileDays.length - 1] : null;
  return (_a, source) => (source === 'file' ? (fileDay ? `your file of ${dateShown(fileDay)}` : 'your file')
    : source === 'typed' ? 'you' : source === 'price-feed' ? 'the price feed' : broker);
}

/** EVERY QUESTION FOR ONE ACCOUNT, as the record asks it (questionsOf), its sources named as the page names them. */
/* ─ MK-NW-F-392 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * accountQuestions
 *
 * Answers ..... EVERY QUESTION FOR ONE ACCOUNT, as the record asks it (questionsOf), its sources named as the page names them.
 *
 * Formula .....
 *     questions of(record, stored, string(account.asset id), who says for(record, account))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-392
 * Changed ..... not in git yet (—)
 */
export function accountQuestions(record: readonly AssetRow[], stored: Record<string, StoredQuestions>, account: QuestionAccount): AssetQuestion[] {
  return questionsOf(record, stored, String(account.asset_id), whoSaysFor(record, account));
}

/** WHERE A QUESTION IS ASKED (account-page v02 row 1; holding-detail v03 row 1): beside the figure its answer changes. */
export type AskedWhere = 'account' | 'purchase' | 'shares' | 'sale';
/** WHERE ONE QUESTION IS ASKED on screen: beside the account when it names no holding, beside the purchase when it is about a purchase's date, price or shares, beside the sale when it is about a sale, else beside the holding's shares. */
/* ─ MK-NW-F-393 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * askedWhere
 *
 * Answers ..... WHERE ONE QUESTION IS ASKED on screen: beside the account when it names no holding, beside the purchase when it is about a purchase's date, price or shares, beside the sale when it is about a sale, else beside the holding's shares.
 *
 * Formula .....
 *     'account'   when holding = nothing
 *     'purchase'   when ['E1', 'E2', 'E3', 'E4', 'L4', 'R1', 'C1'].includes(kind)
 *     'sale'   when family = 'sale'
 *     'shares'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-393
 * Changed ..... not in git yet (—)
 */
export function askedWhere(q: AssetQuestion): AskedWhere {
  if (q.holding == null) return 'account';
  if (['E1', 'E2', 'E3', 'E4', 'L4', 'R1', 'C1'].includes(q.kind)) return 'purchase';
  if (q.family === 'sale') return 'sale';
  return 'shares';
}

/** The source a question's other figure comes from. */
/* ─ MK-NW-F-394 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sourceOf
 *
 * Answers ..... The source a question's other figure comes from.
 *
 * Formula .....
 *     event.arriving.source (or list.source (or values.given.source (or q.batch.source (or (q.kind === 'D1' || q.kind === 'T1' ? 'linked' : null) when missing) when missing) when missing) when missing)
 *
 * Called by ... MK-NW-F-228 moveOldCopies · MK-NW-F-395 questionHeadline
 *               MK-NW-F-396 otherSays · MK-NW-F-398 questionsCountLine
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-400 choiceMakes · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-396 otherSays · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-F-395 questionHeadline · MK-NW-F-398 questionsCountLine
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-394
 * Changed ..... not in git yet (—)
 */
function sourceOf(q: AssetQuestion): RowSource | null {
  return q.event?.arriving.source ?? q.list?.source ?? q.values?.given.source ?? q.batch?.source ?? (q.kind === 'D1' || q.kind === 'T1' ? 'linked' : null);
}

/** THE BOX'S HEADLINE: who asks. "A question from Robinhood", "A question about your file", "A question about your sale",
 *  "Confirm your change" (C1, his own sentence). */
/* ─ MK-NW-F-395 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * questionHeadline
 *
 * Answers ..... THE BOX'S HEADLINE: who asks.
 *
 * Formula .....
 *     'confirm your change'   when kind = 'C1'
 *     'A question about your sale'   when family = 'sale'
 *     src = source of(q)
 *     'A question about your file'   when src = 'file'
 *     'A question about what you entered'   when src = 'typed'
 *     the answer = `A question from ${who says for(record, account)(string(account.asset id), src ?? 'linked')}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-395
 * Changed ..... not in git yet (—)
 */
export function questionHeadline(q: AssetQuestion, account: QuestionAccount, record: readonly AssetRow[]): string {
  if (q.kind === 'C1') return 'Confirm your change';
  if (q.family === 'sale') return 'A question about your sale';
  const src = sourceOf(q);
  if (src === 'file') return 'A question about your file';
  if (src === 'typed') return 'A question about what you entered';
  return `A question from ${whoSaysFor(record, account)(String(account.asset_id), src ?? 'linked')}`;
}

/** THE OTHER SOURCE'S FIGURE, SHOWN UNDER THE RECORD'S WHILE THE QUESTION WAITS (holding-detail v03 row 2; account-page v02
 *  row 8): "Robinhood says $350.00", "Robinhood says Jul 30, 2026", "Robinhood says 300", "Your file of Jan 4, 2027 says 0".
 *  Null where the question carries no other figure. */
/* ─ MK-NW-F-396 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * otherSays
 *
 * Answers ..... THE OTHER SOURCE'S FIGURE, SHOWN UNDER THE RECORD'S WHILE THE QUESTION WAITS (holding-detail v03 row 2; account-page v02 row 8): "Robinhood says $350.00", "Robinhood says Jul 30, 2026", "Robinhood says 300", "Your file of Jan 4, 2027 says 0".
 *
 * Formula .....
 *     src = source of(q)
 *     nothing   when src = nothing
 *     who = first up(who says for(record, account)(string(account.asset id), src))
 *     `${who} says ${price said(event.arriving.price ?? 0)}`   when kind = 'E1' and event
 *     `${who} says ${date shown(event.arriving.date)}`   when kind = 'E2' and event
 *     `${who} says ${price said(list.listed[0].price)}`   when kind = 'L4' and list.listed[0].price ≠ nothing
 *     `${who} says ${count shown(list.shares listed)}`   when list and ['L1', 'L2', 'L5', 'X1', 'X2'].includes(kind)
 *     `${who} says ${count shown(shares.stated)}`   when kind = 'D1' and shares
 *     the answer = nothing
 *
 * Called by ... MK-NW-F-400 choiceMakes
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-400 choiceMakes
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If price is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-396
 * Changed ..... not in git yet (—)
 */
export function otherSays(q: AssetQuestion, account: QuestionAccount, record: readonly AssetRow[]): string | null {
  const src = sourceOf(q);
  if (src == null) return null;
  const who = firstUp(whoSaysFor(record, account)(String(account.asset_id), src));
  if (q.kind === 'E1' && q.event) return `${who} says ${priceSaid(q.event.arriving.price ?? 0)}`;
  if (q.kind === 'E2' && q.event) return `${who} says ${dateShown(q.event.arriving.date)}`;
  if (q.kind === 'L4' && q.list?.listed[0]?.price != null) return `${who} says ${priceSaid(q.list.listed[0].price)}`;
  if (q.list && ['L1', 'L2', 'L5', 'X1', 'X2'].includes(q.kind)) return `${who} says ${countShown(q.list.sharesListed)}`;
  if (q.kind === 'D1' && q.shares) return `${who} says ${countShown(q.shares.stated)}`;
  return null;
}

/** THE LINE IN THE ACCOUNT PAGE'S AMBER BOX for a question about one holding (account-page v02 row 8). A list's shares are
 *  said in a line; any other question in the record's own sentence. */
/* ─ MK-NW-F-397 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * questionSummary
 *
 * Answers ..... THE LINE IN THE ACCOUNT PAGE'S AMBER BOX for a question about one holding (account-page v02 row 8).
 *
 * Formula .....
 *     h = holding (or '' when missing)
 *     lq = list
 *     who = first up(who says for(record, account)(string(account.asset id), lq.source))
 *     the answer = `${H} — ${sentence}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-397
 * Changed ..... not in git yet (—)
 */
export function questionSummary(q: AssetQuestion, account: QuestionAccount, record: readonly AssetRow[]): string {
  const H = q.holding ?? '';
  const lq = q.list;
  if (lq && (q.kind === 'L1' || q.kind === 'L2' || q.kind === 'L5')) {
    const who = firstUp(whoSaysFor(record, account)(String(account.asset_id), lq.source));
    return lq.sharesListed === 0
      ? `${H} — ${who}’s list of ${dateShown(lq.listDay)} leaves out the ${countShown(lq.sharesOnRecord)} shares on record.`
      : `${H} — ${who}’s list of ${dateShown(lq.listDay)} shows ${countShown(lq.sharesListed)} shares; the record holds ${countShown(lq.sharesOnRecord)}.`;
  }
  return `${H} — ${q.sentence}`;
}

/** THE AMBER BOX'S HEADLINE ON THE ACCOUNT PAGE: the count, and who asks when one source asks them all. */
/* ─ MK-NW-F-398 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * questionsCountLine
 *
 * Answers ..... THE AMBER BOX'S HEADLINE ON THE ACCOUNT PAGE: the count, and who asks when one source asks them all.
 *
 * Formula .....
 *     srcs = [...new set(qs.map((q) => (family = 'sale' or kind = 'C1' ? 'typed' : source of(q) ?? 'linked')))]
 *     count = plural(qs.length, 'question')
 *     count   when srcs.length ! = 1 (or srcs[0] = 'typed' when missing or zero)
 *     the answer:
 *     `${count} about your file`   if srcs[0] = 'file'
 *     `${count} from ${who says for(record, account)(string(account.asset id), srcs[0] as row source)}`   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-398
 * Changed ..... not in git yet (—)
 */
export function questionsCountLine(qs: AssetQuestion[], account: QuestionAccount, record: readonly AssetRow[]): string {
  const srcs = [...new Set(qs.map((q) => (q.family === 'sale' || q.kind === 'C1' ? 'typed' : sourceOf(q) ?? 'linked')))];
  const count = plural(qs.length, 'question');
  if (srcs.length !== 1 || srcs[0] === 'typed') return count;
  return srcs[0] === 'file' ? `${count} about your file` : `${count} from ${whoSaysFor(record, account)(String(account.asset_id), srcs[0] as RowSource)}`;
}

/** The record as one choice would leave it, read and never saved. */
/* ─ MK-NW-F-399 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * after
 *
 * Answers ..... The record as one choice would leave it, read and never saved.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-042 mortgageOddsEffect · MK-CF-F-289 purchaseRecordsFollowEdit
 *               MK-NW-F-091 pricedGainOf · MK-NW-F-143 gainRowBetween
 *               MK-NW-F-221 lotsFollow · MK-NW-F-224 typedChangeToRecord
 *               MK-NW-F-228 moveOldCopies · MK-NW-F-272 salesMovedBy
 *               MK-NW-F-279 differsFromGiven · MK-NW-F-319 listQuestionToAsk
 *               MK-NW-F-342 afterAWrite · MK-NW-F-400 choiceMakes
 *               MK-NW-O-008 thePerformance · MK-PF-F-056 purchasePieces
 *               MK-PF-F-070 holdingPath · MK-PF-F-071 returnSplitAtPurchases
 *               MK-PF-F-074 marketSplitAtPurchases · MK-XS-F-004 buildDatedGrid
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-239 loadCloudRecord
 *               MK-XS-F-321 valueAsTheDaysTakeIt
 *
 * Reaches ..... 80 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-CF-F-205 COMING
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *               MK-CF-F-237 LATER · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-296 LOAD · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-392 accountQuestions · MK-NW-F-342 afterAWrite
 *               MK-NW-F-408 answerWords · MK-NW-F-409 answersShown
 *               MK-NW-F-144 beforeTheRecordSentence · MK-PF-F-013 benchmarkTicker
 *               … and 62 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-399
 * Changed ..... not in git yet (—)
 */
function after(record: readonly AssetRow[], q: AssetQuestion, id: string, date?: string): AssetRow[] {
  try { return answerQuestion(record, q, { id, ...(date ? { date } : {}) }, FAR).record; } catch { return [...record]; }
}

/** WHAT EACH CHOICE MAKES, IN FIGURES, ON ITS BUTTON'S SECOND LINE (holding-detail v03 row 3; account-page v02 row 2): read
 *  from the record as that answer would leave it. `price` is the holding's price the page shows, for what the shares are worth. */
/* ─ MK-NW-F-400 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * choiceMakes
 *
 * Answers ..... WHAT EACH CHOICE MAKES, IN FIGURES, ON ITS BUTTON'S SECOND LINE (holding-detail v03 row 3; account-page v02 row 2): read from the record as that answer would leave it.
 *
 * Formula .....
 *     a = string(account.asset id), H = holding (or '' when missing)
 *     who = (src: row source) => who says for(record, account)(A, src)
 *     lots = open purchases(after(record, q, choice id), A, H)
 *     the answer = `${count shown(shares)} shares · total paid ${amount said(paid)}`
 *     lot = the first of lots.find((p) => first row id = event.on record.row id or row id = event.on record.row id) (or lots when missing)
 *     nothing   when lot is missing
 *     next = after(record, q, choice id)
 *     shares = shares on record(next, A, H), lots = open purchases(next, A, H)
 *     day = ` bought ${day no year(lots[0].date)}`   if kind = 'L1' and lots.length = 1 and lots[0].date
 *     ''   otherwise
 *     lot = choice id.slice('purchase:'.length)   if choice id.starts with('purchase:')
 *     nothing   otherwise
 *     sale id = sale.row id
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If price is missing it uses 0.
 *     · If shares is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-400
 * Changed ..... not in git yet (—)
 */
export function choiceMakes(record: readonly AssetRow[], q: AssetQuestion, choiceId: string, account: QuestionAccount, price: number | null = null): string | null {
  const A = String(account.asset_id), H = q.holding ?? '';
  const who = (src: RowSource) => whoSaysFor(record, account)(A, src);
  switch (q.kind) {
    case 'E1': case 'E2': {
      const lots = openPurchases(after(record, q, choiceId), A, H);
      if (choiceId === 'two-purchases') {
        const shares = lots.reduce((t, p) => t + p.shares, 0), paid = lots.reduce((t, p) => t + p.shares * (p.price ?? 0), 0);
        return `${countShown(shares)} shares · total paid ${amountSaid(paid)}`;
      }
      const lot = lots.find((p) => p.firstRowId === q.event?.onRecord.rowId || p.rowId === q.event?.onRecord.rowId) ?? lots[0];
      if (!lot) return null;
      return q.kind === 'E1' ? `${countShown(lot.shares)} at ${priceShown(lot.price)} · total paid ${amountSaid(lot.shares * (lot.price ?? 0))}` : `bought ${dateShown(lot.date)}`;
    }
    case 'L1': case 'L2': {
      const next = after(record, q, choiceId);
      const shares = sharesOnRecord(next, A, H), lots = openPurchases(next, A, H);
      const day = q.kind === 'L1' && lots.length === 1 && lots[0].date ? ` bought ${dayNoYear(lots[0].date)}` : '';
      return `${countShown(shares)} shares${day}${price != null ? ` · worth ${amountSaid(shares * price)}` : ''}`;
    }
    case 'S1': {
      const lot = choiceId.startsWith('purchase:') ? choiceId.slice('purchase:'.length) : null;
      const saleId = q.sale?.rowId;
      if (lot == null || saleId == null) return null;
      const gain = saleGain(after(record, q, choiceId), rowAsItStands(record, saleId)?.rowId ?? saleId);
      return gain == null ? null : `the sale made ${gain < 0 ? '−' : ''}${amountSaid(Math.abs(gain))}`;
    }
    case 'X1': {
      // the figure kept shown meanwhile, its source named short ("Your file says 0", holding-detail v03 state I)
      if (choiceId !== 'expired') return `you enter what happened; until then “${q.list?.source === 'file' ? `Your file says ${countShown(q.list.sharesListed)}` : otherSays(q, account, record) ?? ''}” stays shown`;
      const next = after(record, q, choiceId);
      const sale = rowsInForce(next).filter((r) => r.kind === 'SALE' && r.accountId === A && r.holding === H && r.price === 0).pop();
      if (!sale) return null;
      const gain = saleGain(next, sale.rowId);
      return `a sale of ${countShown(sale.shares)} shares at $0 on ${dateShown(sale.date)}${gain != null ? ` · ${gain < 0 ? 'a loss' : 'a gain'} of ${amountSaid(Math.abs(gain))}` : ''}`;
    }
    case 'C1': {
      const rowId = q.confirm?.rowId;
      if (!rowId) return null;
      const lot = (r: readonly AssetRow[]) => rowAsItStands(r, rowId);
      if (choiceId === 'confirm') {
        const now = lot(after(record, q, 'confirm'));
        return now ? `${countShown(now.shares)} at ${priceShown(now.price)} · total paid ${amountSaid((now.shares ?? 0) * (now.price ?? 0))}` : null;
      }
      const was = lot(record);
      if (!was) return null;
      const src = firstSourceOf(record, rowId);
      return `${firstUp(who(src))}’s ${priceShown(was.price)} stays · total paid ${amountSaid((was.shares ?? 0) * (was.price ?? 0))}`;
    }
    case 'V2':
      return choiceId === 'date' ? 'its values are saved on that day, and the walk and Return start from it'
        // the file as it is (his words, 2026-11-12: "import file as-is"; and "never take a value off the totals", 2026-11-13):
        // with no day given, its values still count, as the file states them (account-page v03, READ THIS FIRST row D)
        : 'its values count in Net worth and Performance as your file states them, with no day';
    default: return null;
  }
}

/** THE WORDS ON A CHOICE'S BUTTON: the record's own label; a choice that needs a day ("A date") opens the date picker, and
 *  its button says so (account-page v02, state A); a purchase a sale may have come from is named by its day, its shares and
 *  its price (holding-detail v03, state G). */
/* ─ MK-NW-F-401 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * choiceTitle
 *
 * Answers ..... THE WORDS ON A CHOICE'S BUTTON: the record's own label; a choice that needs a day ("A date") opens the date picker, and its button says so (account-page v02, state A); a purchase a sale may have come from is named by its day, its shares and its price (holding-detail v03, state G).
 *
 * Formula .....
 *     'choose the day ›'   when kind = 'V2' and id = 'date'
 *     p = sale.choices.find((x) => `purchase:${first row id}` = id)
 *     `${date ? date shown(date) : 'date not on record'} · ${count shown(shares)} at ${price shown(price)}`   when p
 *     the answer = label
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-401
 * Changed ..... not in git yet (—)
 */
export function choiceTitle(record: readonly AssetRow[], q: AssetQuestion, c: { id: string; label: string }): string {
  if (q.kind === 'V2' && c.id === 'date') return 'Choose the day ›';
  if (q.kind === 'S1' && c.id.startsWith('purchase:')) {
    const p = q.sale?.choices.find((x) => `purchase:${x.firstRowId}` === c.id);
    if (p) return `${p.date ? dateShown(p.date) : 'Date not on record'} · ${countShown(p.shares)} at ${priceShown(p.price)}`;
  }
  return c.label;
}

/** THE LINE UNDER THE BUTTONS (holding-detail v03 states A, C, D, F, G, K): what stands until he answers, or the other way out. */
/* ─ MK-NW-F-402 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * questionFootLine
 *
 * Answers ..... THE LINE UNDER THE BUTTONS (holding-detail v03 states A, C, D, F, G, K): what stands until he answers, or the other way out.
 *
 * Formula .....
 *     a = string(account.asset id), H = holding (or '' when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-402
 * Changed ..... not in git yet (—)
 */
export function questionFootLine(record: readonly AssetRow[], q: AssetQuestion, account: QuestionAccount): string | null {
  const A = String(account.asset_id), H = q.holding ?? '';
  switch (q.kind) {
    case 'E1': return q.event ? `Until you answer, your ${priceShown(q.event.onRecord.price)} stays on record and every figure on this page uses it.` : null;
    case 'E2': return q.sentence.includes('This changes the sale') ? null : 'No sale is on record, so no sale’s gain moves with the date.';
    case 'L1': return q.list ? `Until you answer, the record keeps ${countShown(sharesOnRecord(record, A, H))} shares and shows ${firstUp(whoSaysFor(record, account)(A, q.list.source))}’s ${countShown(q.list.sharesListed)} beside them.` : null;
    case 'L2': return 'If you sold them, record the sale instead (Record buy/sell, below), and this question closes.';
    case 'S1': return 'Oldest shares are sold first; a purchase with no date is never guessed, so you are asked.';
    case 'C1': return 'Asked the moment you save; nothing is written until you confirm.';
    default: return null;
  }
}

/** The source a row first came with — a broker's or a file's row he has corrected since is still theirs at its root. */
/* ─ MK-NW-F-403 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * firstSourceOf
 *
 * Answers ..... The source a row first came with — a broker's or a file's row he has corrected since is still theirs at its root.
 *
 * Formula .....
 *     by id = a lookup of for each of record: [row id, each]
 *     r = by id.get(row id)
 *     now = row as it stands(record, row id)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-400 choiceMakes
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-400 choiceMakes
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-403
 * Changed ..... not in git yet (—)
 */
function firstSourceOf(record: readonly AssetRow[], rowId: string): RowSource {
  const byId = new Map(record.map((r) => [r.rowId, r]));
  let r = byId.get(rowId);
  while (r?.replacesRowId && byId.get(r.replacesRowId)) r = byId.get(r.replacesRowId);
  const now = rowAsItStands(record, rowId);
  return [...record].reverse().find((x) => x.source !== 'typed' && (x.rowId === r?.rowId || chainHas(byId, x.rowId, r?.rowId)))?.source ?? r?.source ?? now?.source ?? 'linked';
}
/** True where a row, followed back through the rows it corrected, reaches the given first row. */
/* ─ MK-NW-F-404 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * chainHas
 *
 * Answers ..... True where a row, followed back through the rows it corrected, reaches the given first row.
 *
 * Formula .....
 *     r = by id.get(from)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-403 firstSourceOf
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-400 choiceMakes · MK-NW-F-403 firstSourceOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-404
 * Changed ..... not in git yet (—)
 */
function chainHas(byId: Map<string, AssetRow>, from: string, root: string | undefined): boolean {
  let r = byId.get(from);
  while (r) { if (r.rowId === root) return true; r = r.replacesRowId ? byId.get(r.replacesRowId) : undefined; }
  return false;
}

/** C1 (his own sentence, DEC-10471): he changed a figure a broker or a file gave — the confirmation to put to him before
 *  anything is written. Null where nothing he changed differs from what was given. */
/* ─ MK-NW-F-405 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * confirmChangeQuestion
 *
 * Answers ..... C1 (his own sentence, DEC-10471): he changed a figure a broker or a file gave — the confirmation to put to him before anything is written.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-415 confirmForSavedLots
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-415 confirmForSavedLots
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-405
 * Changed ..... not in git yet (—)
 */
export function confirmChangeQuestion(record: readonly AssetRow[], account: QuestionAccount, rowId: string, change: Partial<Pick<NewRow, 'date' | 'price' | 'shares' | 'amount'>>): AssetQuestion | null {
  try { return confirmMyChangeQuestion(record, rowId, change, whoSaysFor(record, account)); } catch { return null; }
}

/** THE PURCHASE ON RECORD A LOT ON THE PAGE STANDS FOR: the record's purchase of the holding on that day (and, where two
 *  share the day, with those shares). */
/* ─ MK-NW-F-406 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * purchaseOnRecord
 *
 * Answers ..... THE PURCHASE ON RECORD A LOT ON THE PAGE STANDS FOR: the record's purchase of the holding on that day (and, where two share the day, with those shares).
 *
 * Formula .....
 *     lots = open purchases(record, account id, holding.trim().to upper case()) where (date ?? nothing) = (date ?? nothing)
 *     p = the first of lots.find((x) => shares = nothing or math.abs(shares − shares) < 1e − 9) (or lots when missing)
 *     the answer:
 *     row id = row id
 *     price = price
 *     shares = shares
 *     date = date   if p
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-407 enteredOverGiven · MK-NW-F-415 confirmForSavedLots
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-415 confirmForSavedLots · MK-NW-F-407 enteredOverGiven
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-406
 * Changed ..... not in git yet (—)
 */
export function purchaseOnRecord(record: readonly AssetRow[], accountId: string, holding: string, date: string | null, shares?: number | null): { rowId: string; price: number | null; shares: number; date: string | null } | null {
  const lots = openPurchases(record, accountId, holding.trim().toUpperCase()).filter((p) => (p.date ?? null) === (date ?? null));
  const p = lots.find((x) => shares == null || Math.abs(x.shares - shares) < 1e-9) ?? lots[0];
  return p ? { rowId: p.rowId, price: p.price, shares: p.shares, date: p.date } : null;
}

/** A PURCHASE HE CORRECTED OVER A BROKER'S OR A FILE'S FIGURE (holding-detail v03 row 14): "you entered this · Robinhood
 *  indicates $350.00". Null where the purchase is as it was given, or his own from the start. */
/* ─ MK-NW-F-407 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * enteredOverGiven
 *
 * Answers ..... A PURCHASE HE CORRECTED OVER A BROKER'S OR A FILE'S FIGURE (holding-detail v03 row 14): "you entered this · Robinhood indicates $350.00".
 *
 * Formula .....
 *     p = purchase on record(record, string(account.asset id), holding, date, shares)
 *     nothing   when p is missing
 *     now = row as it stands(record, row id)
 *     nothing   when now is missing (or now.source ! = 'typed' when missing or zero)
 *     by id = a lookup of for each of record: [row id, each]
 *     given = now
 *     nothing   when given is missing (or given.source = 'typed' (or given.price = nothing (or now.price = nothing (or size of(given.price − now.price) < 0.005 when missing or zero) when missing or zero) when missing or zero) when missing or zero)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-407
 * Changed ..... not in git yet (—)
 */
export function enteredOverGiven(record: readonly AssetRow[], account: QuestionAccount, holding: string, date: string | null, shares?: number | null): string | null {
  const p = purchaseOnRecord(record, String(account.asset_id), holding, date, shares);
  if (!p) return null;
  const now = rowAsItStands(record, p.rowId);
  if (!now || now.source !== 'typed') return null;
  const byId = new Map(record.map((r) => [r.rowId, r]));
  let given: AssetRow | undefined = now;
  while (given && given.source === 'typed' && given.replacesRowId) given = byId.get(given.replacesRowId);
  if (!given || given.source === 'typed' || given.price == null || now.price == null || Math.abs(given.price - now.price) < 0.005) return null;
  return `you entered this · ${firstUp(whoSaysFor(record, account)(String(account.asset_id), given.source))} indicates ${priceSaid(given.price)}`;
}

/** AN ANSWER GIVEN, AS THE PAGE SHOWS IT IN THE QUESTION'S PLACE (account-page v02 row 4; holding-detail v03 row 4): what
 *  was answered and the day, and the question again for "Change your answer ›" where the record can ask it again. */
export interface AnswerShown { name: string; kind: string; holding: string | null; day: string; words: string; question: AssetQuestion | null }

/** The words of one answer, kind by kind, read from the rows it wrote. */
/* ─ MK-NW-F-408 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * answerWords
 *
 * Answers ..... The words of one answer, kind by kind, read from the rows it wrote.
 *
 * Formula .....
 *     f = fact.facts (or none when missing)
 *     name = string(answer of), kind = string(answer kind), choice = string(answer choice), label = string(answer label ?? choice)
 *     a = string(account.asset id), H = fact.holding (or '' when missing)
 *     broker = first up(who says for(record, account)(A, 'linked'))
 *     written = record where answer to = name and kind ! = 'FACT'
 *     standing = rows in force(record) where answer to = name and kind ! = 'FACT'
 *     dated = standing.find((r) => kind = 'VALUE' and date ≠ nothing)
 *     replaced = for each of written: record.find((x) => row id = replaces row id)   if replaces row id
 *     undefined   otherwise.find((r) => r and source ! = 'typed')
 *     whose = 'your file’s'   if replaced.source = 'file' (or replaced = nothing when missing or zero)
 *     `${first up(who says for(record, account)(A, replaced.source))}’s`   otherwise
 *     `${whose} values are from ${date shown(dated.date)}.`   when dated
 *     lot = standing.find((r) => kind = 'PURCHASE')
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-409 answersShown
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-409 answersShown
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-408
 * Changed ..... not in git yet (—)
 */
function answerWords(record: readonly AssetRow[], fact: AssetRow, account: QuestionAccount): string {
  const f = fact.facts ?? {};
  const name = String(f.answerOf), kind = String(f.answerKind), choice = String(f.answerChoice), label = String(f.answerLabel ?? choice);
  const A = String(account.asset_id), H = fact.holding ?? '';
  const broker = firstUp(whoSaysFor(record, account)(A, 'linked'));
  const written = record.filter((r) => r.answerTo === name && r.kind !== 'FACT');
  const standing = rowsInForce(record).filter((r) => r.answerTo === name && r.kind !== 'FACT');
  if (kind === 'V2' && choice === 'date') {
    const dated = standing.find((r) => r.kind === 'VALUE' && r.date != null);
    const replaced = written.map((r) => (r.replacesRowId ? record.find((x) => x.rowId === r.replacesRowId) : undefined)).find((r) => r && r.source !== 'typed');
    const whose = replaced?.source === 'file' || replaced == null ? 'your file’s' : `${firstUp(whoSaysFor(record, account)(A, replaced.source))}’s`;
    if (dated) return `${whose} values are from ${dateShown(dated.date)}.`;
  }
  if (kind === 'E1' && choice === 'change') {
    const lot = standing.find((r) => r.kind === 'PURCHASE');
    if (lot) return `${broker}’s price, ${priceShown(lot.price)}.`;
  }
  if (kind === 'E2' && choice === 'change') {
    const lot = standing.find((r) => r.kind === 'PURCHASE');
    if (lot) return `${broker}’s date, ${dateShown(lot.date)}.`;
  }
  if ((kind === 'L1' || kind === 'L2') && choice === 'list-correct') {
    const lots = openPurchases(record, A, H);
    const shares = sharesOnRecord(record, A, H);
    return `${broker}’s list — ${countShown(shares)} shares${lots.length === 1 && lots[0].date ? ` bought ${dateShown(lots[0].date)}` : ''}.`;
  }
  if (kind === 'S1') {
    const sale = standing.find((r) => r.kind === 'SALE');
    const from = sale?.sells?.[sale.sells.length - 1];
    const lot = from ? rowAsItStands(record, from.rowId) : null;
    if (sale && from) return `the ${countShown(from.shares)} sold on ${dayNoYear(sale.date)} came from the ${lot?.date ? `${dateShown(lot.date)} purchase` : 'purchase with no date'}.`;
  }
  if (kind === 'X1' && choice === 'expired') {
    const sale = standing.find((r) => r.kind === 'SALE');
    if (sale) {
      const gain = saleGain(record, sale.rowId);
      return `expired worthless on ${dateShown(sale.date)} — a sale of ${countShown(sale.shares)} shares at $0${gain != null ? `, ${gain < 0 ? 'a loss' : 'a gain'} of ${amountSaid(Math.abs(gain))}` : ''}.`;
    }
  }
  return `${label}.`;
}

/** EVERY ANSWER STANDING FOR ONE ACCOUNT, newest last. A question is asked again for "Change your answer ›" by undoing its
 *  answer on a copy of the record and asking it there; a question the record can no longer raise by itself is taken from
 *  `asked` (the questions this phone has shown since it opened), else it has none. */
/* ─ MK-NW-F-409 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * answersShown
 *
 * Answers ..... EVERY ANSWER STANDING FOR ONE ACCOUNT, newest last.
 *
 * Formula .....
 *     a = string(account.asset id)
 *     facts = rows in force(record) where account id = A and kind = 'FACT' and typeof facts.answer of = 'string' and typeof facts.answer kind = 'string'
 *     latest = new map<string, asset row>()
 *     who = who says for(record, account)
 *     name = string(facts.answer of)
 *     question = asked.get(name) (or nothing when missing)
 *     at = the date written at
 *     day = ''   if number.is na n(at.get time())
 *     date shown(`${at.get full year()}-${string(at.get month() + 1).pad start(2, '0')}-${string(at.get date()).pad start(2, '0')}`)   otherwise
 *     the answer:
 *     name = name
 *     kind = string(facts.answer kind)
 *     holding = holding (or nothing when missing)
 *     day = day
 *     words = answer words(record, f, account)
 *     question = question
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-409
 * Changed ..... not in git yet (—)
 */
export function answersShown(record: readonly AssetRow[], stored: Record<string, StoredQuestions>, account: QuestionAccount, asked: ReadonlyMap<string, AssetQuestion> = new Map()): AnswerShown[] {
  const A = String(account.asset_id);
  const facts = rowsInForce(record).filter((r) => r.accountId === A && r.kind === 'FACT' && typeof r.facts?.answerOf === 'string' && typeof r.facts?.answerKind === 'string');
  const latest = new Map<string, AssetRow>();
  for (const f of facts) { const n = String(f.facts?.answerOf); const was = latest.get(n); if (!was || was.writtenAt <= f.writtenAt) latest.set(n, f); }
  const who = whoSaysFor(record, account);
  return [...latest.values()].sort((a, b) => a.writtenAt.localeCompare(b.writtenAt)).map((f) => {
    const name = String(f.facts?.answerOf);
    let question: AssetQuestion | null = asked.get(name) ?? null;
    if (!question) {
      try {
        const undo = undoAnswer(record, name, undefined, who);
        if (!undo.ask.length) question = questionsOf(undo.rows.length ? addRows(record, undo.rows, FAR) : [...record], stored, A, who).find((q) => q.name === name) ?? null;
      } catch { question = null; }
    }
    const at = new Date(f.writtenAt);
    const day = Number.isNaN(at.getTime()) ? '' : dateShown(`${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`);
    return { name, kind: String(f.facts?.answerKind), holding: f.holding ?? null, day, words: answerWords(record, f, account), question };
  });
}

/** THE DAY THE ACCOUNT'S VALUE IS FROM (account-page v02 rows 3 and 5): the master record's latest value row — never the
 *  phone's date. `onRecord` false where the record holds no value for the account (the page then reads as before); `day`
 *  null where the values were given with no day and none has been given since ("date not stated"). */
/* ─ MK-NW-F-410 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * accountValueDay
 *
 * Answers ..... THE DAY THE ACCOUNT'S VALUE IS FROM (account-page v02 rows 3 and 5): the master record's latest value row — never the phone's date.
 *
 * Formula .....
 *     moved at = a list with no repeats of record0 where kind = 'FACT' and account id = account id and ref = `moved − from − phone:${account id}`for each of : written at
 *     record = moved at.size ? record0 where not (account id = account id and kind = 'VALUE' and moved at.has(written at)): record0
 *     now = values now(record, account id)
 *     on record = false
 *     day = nothing   when now is missing
 *     dated = value batches of(record, account id) where date ≠ nothingfor each of : date as string, in order
 *     undated = values needing adate(record, account id).length > 0
 *     the answer:
 *     on record = true
 *     day = now.date (or nothing   if undated
 *     dated[dated.length − 1] (or nothing when missing)   otherwise when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-410
 * Changed ..... not in git yet (—)
 */
export function accountValueDay(record0: readonly AssetRow[], accountId: string): { onRecord: boolean; day: string | null } {
  // THE SAME SCREEN WITH THE SWITCH ON OR OFF (his standing order: the screen matches the last approved drawing; decided
  // 2026-11-13): the values the one-time move carried over from the phone are the phone's own copies, which never printed
  // a value day; only a value given since — typed, a file, a broker — says its day
  const movedAt = new Set(record0.filter((r) => r.kind === 'FACT' && r.accountId === accountId && r.ref === `moved-from-phone:${accountId}`).map((r) => r.writtenAt));
  const record = movedAt.size ? record0.filter((r) => !(r.accountId === accountId && r.kind === 'VALUE' && movedAt.has(r.writtenAt))) : record0;
  try {
    const now = valuesNow(record, accountId);
    if (!now) return { onRecord: false, day: null };
    const dated = valueBatchesOf(record, accountId).filter((b) => b.date != null).map((b) => b.date as string).sort();
    const undated = valuesNeedingADate(record, accountId).length > 0;
    return { onRecord: true, day: now.date ?? (undated ? null : dated[dated.length - 1] ?? null) };
  } catch { return { onRecord: false, day: null }; }
}

/** THE DAY OF A HOLDING'S NEWEST PRICE ON RECORD: its own price day where a close older than its batch was used, else the
 *  day of the values that gave it — a price carried into the price feed's values from a broker's or a file's is that one's.
 *  `lastCloseDay` is the day of the price feed's newest close for the holding, where the page holds one. */
/* ─ MK-NW-F-411 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * holdingPriceDay
 *
 * Answers ..... THE DAY OF A HOLDING'S NEWEST PRICE ON RECORD: its own price day where a close older than its batch was used, else the day of the values that gave it — a price carried into the price feed's values from a broker's or a file's is that one's.
 *
 * Formula .....
 *     h = holding.trim().to upper case()
 *     batches = value batches of(record, account id) where date ≠ nothing.sort((a, b) => string(date).locale compare(string(date)))
 *     h = batches[i].holdings.find((x) => holding = H and price ≠ nothing)
 *     price date   when price date
 *     batches[i].date   when batches[i].source ! = 'price − feed'
 *     batches[i].date   when the first 10) ≥ string(batches[i].date of last close day ≠ nothing and last close day
 *     given = the first i).reverse().find((b) => source ! = 'price − feed' and holdings.some((x) => holding = H and price = price) of batches
 *     the answer:
 *     given.holdings.find((x) => holding = H).price date (or given.date when missing)   if given
 *     batches[i].date   otherwise
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-411
 * Changed ..... not in git yet (—)
 */
export function holdingPriceDay(record: readonly AssetRow[], accountId: string, holding: string, lastCloseDay: string | null = null): string | null {
  const H = holding.trim().toUpperCase();
  const batches = valueBatchesOf(record, accountId).filter((b) => b.date != null).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (let i = batches.length - 1; i >= 0; i--) {
    const h = batches[i].holdings.find((x) => x.holding === H && x.price != null);
    if (!h) continue;
    if (h.priceDate) return h.priceDate;
    if (batches[i].source !== 'price-feed') return batches[i].date;
    // the price feed holds a close of that day for it: the feed priced it (a fund at $1.00 every day is still today's close)
    if (lastCloseDay != null && lastCloseDay.slice(0, 10) >= String(batches[i].date)) return batches[i].date;
    const given = batches.slice(0, i).reverse().find((b) => b.source !== 'price-feed' && b.holdings.some((x) => x.holding === H && x.price === h.price));
    return given ? (given.holdings.find((x) => x.holding === H)?.priceDate ?? given.date) : batches[i].date;
  }
  return null;
}

/** "PRICE FROM <DAY>" (account-page v02 row 7; holding-detail v03 row 12): the price's day where it is more than 7 days
 *  older than the day it is measured against — the account's value day on the account page, today on the holding's page.
 *  The price is still used. Null otherwise. */
/* ─ MK-NW-F-412 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * priceFromDay
 *
 * Answers ..... "PRICE FROM <DAY>" (account-page v02 row 7; holding-detail v03 row 12): the price's day where it is more than 7 days older than the day it is measured against — the account's value day on the account page, today on the holding's page.
 *
 * Formula .....
 *     nothing   when price day is missing (or against is missing when missing or zero)
 *     a = the first 10)}T00:00:00Z`), b = date.parse(`${string(against).slice(0, 10)}T00:00:00Z` of date.parse(`${string(price day)
 *     nothing   when number.is na n(a) (or number.is na n(b) when missing or zero)
 *     the answer:
 *     the first 10 of string(price day)   if b − a > 7 × 86400000
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-412
 * Changed ..... not in git yet (—)
 */
export function priceFromDay(priceDay: string | null | undefined, against: string | null | undefined): string | null {
  if (!priceDay || !against) return null;
  const a = Date.parse(`${String(priceDay).slice(0, 10)}T00:00:00Z`), b = Date.parse(`${String(against).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return b - a > 7 * 86_400_000 ? String(priceDay).slice(0, 10) : null;
}

/** THE DAY OF THE PURCHASE A QUESTION IS ABOUT, as it stands — so the page asks it on that purchase's line (holding-detail v03
 *  row 1). Null where the question is about no one purchase. */
/* ─ MK-NW-F-413 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * questionLotDate
 *
 * Answers ..... THE DAY OF THE PURCHASE A QUESTION IS ABOUT, as it stands — so the page asks it on that purchase's line (holding-detail v03 row 1).
 *
 * Formula .....
 *     id = confirm.row id (or event.on record.row id (or q.list.onRecord[0].rowId (or q.edit.matches[0] ?? null when missing) when missing) when missing)
 *     nothing   when id = nothing
 *     r = row as it stands(record, id)
 *     the answer:
 *     date = date (or nothing when missing)
 *     shares = shares (or nothing when missing)   if r
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-413
 * Changed ..... not in git yet (—)
 */
export function questionLotDate(record: readonly AssetRow[], q: AssetQuestion): { date: string | null; shares: number | null } | null {
  const id = q.confirm?.rowId ?? q.event?.onRecord.rowId ?? q.list?.onRecord[0]?.rowId ?? q.edit?.matches[0] ?? null;
  if (id == null) return null;
  const r = rowAsItStands(record, id);
  return r ? { date: r.date ?? null, shares: r.shares ?? null } : null;
}

/** WHILE A SALE WAITS TO BE TOLD WHICH PURCHASE IT CAME FROM (S1, holding-detail v03 row 9), every figure that purchase decides
 *  says so: "Not known until you say which purchase the Nov 10 sale came from". Null for any other question. */
/* ─ MK-NW-F-414 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * saleNotKnownWords
 *
 * Answers ..... WHILE A SALE WAITS TO BE TOLD WHICH PURCHASE IT CAME FROM (S1, holding-detail v03 row 9), every figure that purchase decides says so: "Not known until you say which purchase the Nov 10 sale came from".
 *
 * Formula .....
 *     nothing   when kind ! = 'S1' (or sale is missing when missing or zero)
 *     sale = row as it stands(record, sale.row id)
 *     the answer = `not known until you say which purchase the ${day no year(sale.date)} sale came from`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-414
 * Changed ..... not in git yet (—)
 */
export function saleNotKnownWords(record: readonly AssetRow[], q: AssetQuestion): string | null {
  if (q.kind !== 'S1' || !q.sale) return null;
  const sale = rowAsItStands(record, q.sale.rowId);
  return `Not known until you say which purchase the ${dayNoYear(sale?.date)} sale came from`;
}

/** C1 ON SAVE (holding-detail v03 row 13): the first purchase saved in the editor whose price differs from the one the record
 *  holds for that day, as the confirmation to put before anything is written. Null where nothing saved differs. */
/* ─ MK-NW-F-415 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * confirmForSavedLots
 *
 * Answers ..... C1 ON SAVE (holding-detail v03 row 13): the first purchase saved in the editor whose price differs from the one the record holds for that day, as the confirmation to put before anything is written.
 *
 * Formula .....
 *     day = the first 10 of purchase date   if typeof purchase date = 'string' and ÷ ^\d{4}-\d{2}-\d{2} ÷ .test(purchase date)
 *     nothing   otherwise
 *     p = purchase on record(record, string(account.asset id), holding, day, shares ?? nothing)
 *     q = confirm change question(record, account, row id, { price: cost per share })
 *     q   when q
 *     the answer = nothing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-415
 * Changed ..... not in git yet (—)
 */
export function confirmForSavedLots(record: readonly AssetRow[], account: QuestionAccount, holding: string,
  lots: readonly { purchase_date?: string | null; shares?: number | null; cost_per_share?: number | null }[]): AssetQuestion | null {
  for (const l of lots) {
    const day = typeof l.purchase_date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(l.purchase_date) ? l.purchase_date.slice(0, 10) : null;
    const p = purchaseOnRecord(record, String(account.asset_id), holding, day, l.shares ?? null);
    if (!p || p.price == null || l.cost_per_share == null || Math.abs(p.price - l.cost_per_share) < 0.005) continue;
    const q = confirmChangeQuestion(record, account, p.rowId, { price: l.cost_per_share });
    if (q) return q;
  }
  return null;
}
