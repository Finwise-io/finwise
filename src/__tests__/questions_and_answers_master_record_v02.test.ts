/* QUESTIONS AND ANSWERS ON THE MASTER RECORD — held to the design v02 of 2026-11-12,
 * MoneyKeel/documents/standards/moneykeel_calc_spec_questions-and-answers-on-the-master-record_v02.md, on its own worked
 * numbers. One test per test the design names (§ 6), one per question kind's sentence (§ 3), and one per rule (§ 4).
 * "Robinhood" stands for the broker, as in the design. */
import {
  addRows, rowsInForce, correctRow, removeRow, valueRows, valuesNow, openPurchases, saleRow, saleGain, sharesOnRecord, purchasesFromList,
  answerListQuestion, answerEventQuestion, answerValuesQuestion, sortArriving, historyPurchaseRow, valuesThatDiffer, valuesNeedingADate,
  salesNeedingAnAnswer, rowAsItStands,
  QUESTION_KINDS, eventQuestionToAsk, listQuestionToAsk, editQuestionToAsk, confirmMyChangeQuestion, questionsOf, questionsStillTrue,
  answerQuestion, undoAnswer, keyOldAnswers, newerListUndoes, afterAWrite, oneQuestionPerExercise, eventQuestionName, listQuestionName,
  type AssetRow, type NewRow, type AssetQuestion, type AnswerChoice, type QuestionKind, type StoredQuestions, type ListQuestion,
} from '../../MoneyKeel/functions/networth-and-performance/asset-record';
import { brokerUpdateToRecord } from '../../MoneyKeel/functions/networth-and-performance/asset-record-from-broker';
import { typedChangeToRecord } from '../../MoneyKeel/functions/networth-and-performance/asset-record-from-typed';

const A = 'acct-1';
const who = () => 'Robinhood';
const at = (day: string, hm = '12:00') => `${day}T${hm}:00.000Z`;
const buy = (holding: string, date: string | null, shares: number, price: number | null, over: Partial<NewRow> = {}): NewRow =>
  ({ accountId: A, holding, kind: 'PURCHASE', date, shares, price, amount: price == null ? null : shares * price, source: 'typed', ...over });
const sell = (holding: string, date: string, shares: number, price: number, source: NewRow['source'] = 'typed') =>
  saleRow({ accountId: A, holding, date, shares, price, source });
const cost = (r: AssetRow[], h: string) => openPurchases(r, A, h).reduce((t, p) => t + p.shares * (p.price ?? 0), 0);
const keepFacts = (r: AssetRow[]) => rowsInForce(r).filter((x) => typeof x.facts?.keepsOverList === 'string').length;
const ask = (r: AssetRow[], stored: Record<string, StoredQuestions> = {}) => questionsOf(r, stored, A, who);
const one = <T>(xs: T[]): T => { expect(xs).toHaveLength(1); return xs[0]; };
const answer = (r: AssetRow[], q: AssetQuestion, id: string, when: string, more: Partial<AnswerChoice> = {}) => answerQuestion(r, q, { id, ...more }, when, who);

/** An event question from what Robinhood sends, set against the record. */
function eventAsk(r: AssetRow[], rows: NewRow[]): AssetQuestion[] {
  return sortArriving(r, rows).ask.map((q) => eventQuestionToAsk(r, q, who));
}
/** A list question from Robinhood's list of one day. */
function listAsk(r: AssetRow[], holding: string, listed: Parameters<typeof purchasesFromList>[3], day: string): { rows: NewRow[]; qs: AssetQuestion[]; raw: ListQuestion[] } {
  const got = purchasesFromList(r, A, holding, listed, 'linked', day);
  return { rows: got.rows, raw: got.ask, qs: got.ask.flatMap((q) => listQuestionToAsk(r, q, who)) };
}
/** Robinhood's list of one day set beside the record, as the sync sets it: its rows and the day's values. */
function setBeside(r: AssetRow[], holding: string, listed: Parameters<typeof purchasesFromList>[3], day: string, shares: number, price: number) {
  const got = purchasesFromList(r, A, holding, listed, 'linked', day);
  return { record: addRows(r, [...got.rows, ...valueRows({ accountId: A, date: day, source: 'linked', cash: 0, holdings: [{ holding, shares, price, value: shares * price }] })], at(day, '17:00')), ask: got.ask };
}

// ── the cases the design works through, kept in one place so every kind is answered (every-kind-has-a-writer) ──────

const OPTION = 'AAPL  260220C00260000';
const cases: Partial<Record<QuestionKind, () => { record: AssetRow[]; q: AssetQuestion; choice: AnswerChoice }>> = {};

/** E1, his case: typed 20 VTI at $205 on Feb 10, 2026, a typed sale of 5 at $250 on Mar 10; Robinhood sends $210. */
function e1Case() {
  const r = addRows([], [buy('VTI', '2026-02-10', 20, 205), sell('VTI', '2026-03-10', 5, 250)], at('2026-03-01'));
  const [q] = eventAsk(r, [buy('VTI', '2026-02-10', 20, 210, { source: 'linked', ref: 'rh-1' })]);
  return { record: r, q };
}
cases.E1 = () => ({ ...e1Case(), choice: { id: 'change' } });

describe('§ 3 · each kind of question, in the design’s own sentence', () => {
  test('E1 · price: names both sources and values, and each sale it moves ($225 → $200)', () => {
    const { record, q } = e1Case();
    expect(q.kind).toBe('E1');
    expect(q.sentence).toBe('The information from Robinhood indicates price of $210 for 20 VTI bought Feb 10, 2026; you entered $205. Confirm changing the price to $210. This changes the sale of 5 VTI on Mar 10: it made $225, it will make $200.');
    expect(q.choices.map((c) => c.label)).toEqual(['Change', 'Keep mine', 'Two purchases']);
    const sale = rowsInForce(record).find((x) => x.kind === 'SALE')!;
    expect(saleGain(record, sale.rowId)).toBe(225);
    const after = answer(record, q, 'change', at('2026-03-02')).record;
    expect(saleGain(after, sale.rowId)).toBe(200);
  });

  test('E2 · date: 10 VTI bought Jan 10 against Jan 12', () => {
    const r = addRows([], [buy('VTI', '2026-01-12', 10, 200)], at('2026-02-01'));
    const q = one(eventAsk(r, [buy('VTI', '2026-01-10', 10, 200, { source: 'linked', ref: 'rh-2' })]));
    expect([q.kind, q.sentence]).toEqual(['E2', 'The information from Robinhood indicates 10 VTI bought Jan 10, 2026; you entered Jan 12. Confirm changing the date to Jan 10.']);
    cases.E2 = () => ({ record: r, q, choice: { id: 'change' } });
    expect(openPurchases(answer(r, q, 'change', at('2026-02-02')).record, A, 'VTI').map((p) => p.date)).toEqual(['2026-01-10']);
  });

  test('E3 · ratio: the TSLA split of Jan 15, 2026 resent as 3-for-1 against 2-for-1', () => {
    const split = (ratio: number): NewRow => ({ accountId: A, holding: 'TSLA', kind: 'SPLIT', date: '2026-01-15', ratio, source: 'linked', ref: 'rh-split' });
    const r = addRows([], [buy('TSLA', '2026-01-02', 10, 300, { source: 'linked', ref: 'rh-t' }), split(2)], at('2026-02-01'));
    const q = one(eventAsk(r, [split(3)]));
    expect([q.kind, q.sentence]).toEqual(['E3', 'The information from Robinhood indicates the TSLA split of Jan 15, 2026 was 3-for-1; the record holds 2-for-1. Confirm changing it to 3-for-1.']);
    cases.E3 = () => ({ record: r, q, choice: { id: 'change' } });
    expect(sharesOnRecord(answer(r, q, 'change', at('2026-02-02')).record, A, 'TSLA')).toBe(30);
  });

  test('E4 · taken away: Robinhood sends again 10 VTI bought Jan 10, 2026 at $200 — 20 shares', () => {
    const { record, q } = takenAwayCase();
    expect([q.kind, q.sentence]).toEqual(['E4', 'Robinhood sends again 10 VTI bought Jan 10, 2026 at $200; you took this purchase away. Confirm it stays taken away: 20 shares.']);
    expect(sharesOnRecord(record, A, 'VTI')).toBe(20);
  });

  test('L1 · list typed: Robinhood’s list of Mar 1, 2026 states 300 MSFT bought Jul 30 against 500 he entered for Jul 29', () => {
    const r = addRows([], [buy('MSFT', '2025-07-29', 500, 350)], at('2026-01-01'));
    const q = one(listAsk(r, 'MSFT', [{ date: '2025-07-30', shares: 300, price: 350 }], '2026-03-01').qs);
    expect([q.kind, q.sentence]).toEqual(['L1', 'Robinhood’s list of Mar 1, 2026 indicates 300 MSFT bought Jul 30; you entered 500 bought Jul 29. Confirm changing MSFT to 300 shares bought Jul 30.']);
    cases.L1 = () => ({ record: r, q, choice: { id: 'list-correct' } });
    expect(sharesOnRecord(answer(r, q, 'list-correct', at('2026-03-02')).record, A, 'MSFT')).toBe(300);
  });

  test('L2 · not listed: Robinhood’s list of Jul 31, 2026 leaves out the 20 VTI on record — 0 shares', () => {
    const { record, q } = julyCase();
    expect([q.kind, q.sentence]).toEqual(['L2', 'Robinhood’s list of Jul 31, 2026 leaves out the 20 VTI on record, and no sale is on record. Confirm changing VTI to 0 shares.']);
    cases.L2 = () => ({ record, q, choice: { id: 'list-correct' } });
    expect(sharesOnRecord(answer(record, q, 'list-correct', at('2026-08-01')).record, A, 'VTI')).toBe(0);
  });

  test('L4 · list price: $345 for 100 MSFT bought Jul 30, 2026 against $350', () => {
    const r = addRows([], [buy('MSFT', '2026-07-30', 100, 350, { source: 'linked', stillHeldOn: '2026-08-01' })], at('2026-08-01'));
    const q = one(listAsk(r, 'MSFT', [{ date: '2026-07-30', shares: 100, price: 345 }], '2026-08-02').qs);
    expect([q.kind, q.sentence]).toEqual(['L4', 'Robinhood’s list indicates $345 for 100 MSFT bought Jul 30, 2026; the record holds $350. Confirm changing to $345.']);
    cases.L4 = () => ({ record: r, q, choice: { id: 'change' } });
    expect(openPurchases(answer(r, q, 'change', at('2026-08-03')).record, A, 'MSFT')[0].price).toBe(345);
  });

  test('L5 · count: Robinhood indicates 1,000 X against 500, and no transaction explains the other 500', () => {
    const r = addRows([], [buy('X', '2026-01-05', 500, 10, { source: 'linked', ref: 'rh-x' })], at('2026-02-01'));
    const q = one(listAsk(r, 'X', [{ date: null, shares: 1000, price: 12, average: true }], '2026-02-02').qs);
    expect([q.kind, q.sentence]).toEqual(['L5', 'Robinhood indicates 1,000 X; the record holds 500, and no transaction explains the other 500. Confirm adding 500 shares with no date or price.']);
    cases.L5 = () => ({ record: r, q, choice: { id: 'change' } });
    const after = answer(r, q, 'change', at('2026-02-03')).record;
    expect([sharesOnRecord(after, A, 'X'), openPurchases(after, A, 'X').filter((p) => p.date == null).map((p) => [p.shares, p.price])]).toEqual([1000, [[500, null]]]);
  });

  test('S1 · which lot: You sold 100 X on Nov 10, 2026 at $420 — "Nov 5 · 100 at $400 → $2,000"', () => {
    const r = addRows([], [buy('X', null, 100, 380), buy('X', '2026-11-05', 100, 400), sell('X', '2026-11-10', 100, 420)], at('2026-11-11'));
    const q = ask(r).find((x) => x.kind === 'S1')!;
    expect(q.sentence).toBe('You sold 100 X on Nov 10, 2026 at $420. Which purchase did they come from?');
    expect(q.choices.map((c) => c.label)).toContain('Nov 5 · 100 at $400 → $2,000');
    const nov5 = q.choices.find((c) => c.label.startsWith('Nov 5'))!;
    cases.S1 = () => ({ record: r, q, choice: { id: nov5.id } });
    const after = answer(r, q, nov5.id, at('2026-11-12')).record;
    const sale = rowsInForce(after).find((x) => x.kind === 'SALE')!;
    expect([saleGain(after, sale.rowId), salesNeedingAnAnswer(after, A)]).toEqual([2000, []]);
  });

  test('S2 · sale before list: a typed sale of 200 MSFT on Nov 10, 2026 that Robinhood’s Nov 16 list still shows', () => {
    const r = addRows(addRows([], [buy('MSFT', '2026-07-30', 500, 350, { source: 'linked', stillHeldOn: '2026-11-16' })], at('2026-11-16')),
      [sell('MSFT', '2026-11-10', 200, 400)], at('2026-11-17'));
    const q = ask(r).find((x) => x.kind === 'S2')!;
    expect(q.sentence).toBe('You entered a sale of 200 MSFT on Nov 10, 2026, but Robinhood’s Nov 16 list still shows them. Confirm Nov 10.');
    expect(q.choices.map((c) => c.label)).toEqual(['Keep', 'Change the date', 'Take it away']);
    cases.S2 = () => ({ record: r, q, choice: { id: 'change-date', date: '2026-11-20' } });
    const moved = answer(r, q, 'change-date', at('2026-11-18'), { date: '2026-11-20' }).record;
    expect(rowsInForce(moved).find((x) => x.kind === 'SALE')!.date).toBe('2026-11-20');
    // "Keep" writes the answer and the question is not asked again (rule 8)
    const kept = answer(r, q, 'keep', at('2026-11-18')).record;
    expect(ask(kept).filter((x) => x.kind === 'S2')).toEqual([]);
  });

  test('S3 · sold beyond: Robinhood sends a sale of 300 X on Feb 5, 2026; the record holds 200', () => {
    const r = addRows([], [buy('X', '2026-01-05', 200, 10, { source: 'linked', ref: 'rh-x1' }), sell('X', '2026-02-05', 300, 12, 'linked')], at('2026-02-06'));
    const q = ask(r).find((x) => x.kind === 'S3')!;
    expect(q.sentence).toBe('Robinhood sends a sale of 300 X on Feb 5, 2026; the record holds 200. Enter the purchase the other 100 came from.');
    const rows = [buy('X', '2026-01-02', 100, 9)];
    cases.S3 = () => ({ record: r, q, choice: { id: 'enter', rows } });
    const after = answer(r, q, 'enter', at('2026-02-07'), { rows }).record;
    expect([ask(after).filter((x) => x.kind === 'S3'), saleGain(after, rowsInForce(after).find((x) => x.kind === 'SALE')!.rowId)]).toEqual([[], 100 * 3 + 200 * 2]);
  });

  test('T1 · total differs: Robinhood states $169,665; the record adds up to $168,271, $1,394 less', () => {
    const r = addRows([], valueRows({ accountId: A, date: '2026-11-03', source: 'linked', cash: 271, statedTotal: 169665, holdings: [{ holding: 'MSFT', shares: 400, price: 420, value: 168000 }] }), at('2026-11-03'));
    const q = ask(r).find((x) => x.kind === 'T1')!;
    expect(q.sentence).toBe('Robinhood states $169,665; the record adds up to $168,271, $1,394 less. Enter what is missing.');
    const rows = valueRows({ accountId: A, date: '2026-11-03', source: 'typed', cash: 1665, statedTotal: 169665, holdings: [{ holding: 'MSFT', shares: 400, price: 420, value: 168000 }] });
    cases.T1 = () => ({ record: r, q, choice: { id: 'enter', rows } });
    const after = answer(r, q, 'enter', at('2026-11-04'), { rows }).record;
    expect(valuesNow(after, A)!.total).toBe(169665);
    expect(ask(answer(r, q, 'rows-right', at('2026-11-04')).record).filter((x) => x.kind === 'T1')).toEqual([]);
  });

  test('R1 · which purchase: his edit of the MSFT lot of Jul 30, 2026 to $320 matches two purchases — asked, never refused in silence', () => {
    let r = addRows([], [buy('MSFT', '2026-07-30', 100, 350, { source: 'linked', ref: 'rh-m' }), buy('MSFT', '2026-07-30', 100, 350, { ref: 'typed-lot:acct-1:other' })], at('2026-08-01'));
    const lot = (price: number) => ({ lot_id: 'L9', shares: 100, cost_per_share: price, purchase_date: '2026-07-30' });
    const pos = (price: number) => ({ position_id: 'p1', ticker: 'MSFT', kind: 'stock_etf', lots: [lot(price)] }) as any;
    const out = typedChangeToRecord(r, { kind: 'holding-changed', accountId: A, before: pos(350), after: pos(320) }, at('2026-08-02'));
    expect(out.problems).toEqual([]);
    const ed = one(out.which);
    const q = editQuestionToAsk(r, ed, who);
    expect(q.sentence).toBe('You changed the MSFT lot of Jul 30, 2026 to $320. Two purchases match: 100 at $350 from Robinhood and 100 at $350 you entered. Which one?');
    expect(q.choices.map((c) => c.label)).toEqual(['100 at $350 from Robinhood', '100 at $350 you entered', 'Cancel']);
    const mine = q.choices[1].id;
    const before = r;
    cases.R1 = () => ({ record: before, q, choice: { id: mine } });
    r = answer(r, q, mine, at('2026-08-03')).record;
    expect(openPurchases(r, A, 'MSFT').map((p) => p.price).sort()).toEqual([320, 350]);
    expect(answer(r, q, 'cancel', at('2026-08-04')).rows).toEqual([]);
  });

  test('V1 · values: Robinhood $170,000 on Nov 3, 2026 against $172,500 he entered', () => {
    let r = addRows([], valueRows({ accountId: A, date: '2026-11-03', source: 'typed', typedValue: 172500 }), at('2026-11-03', '09:00'));
    r = addRows(r, valueRows({ accountId: A, date: '2026-11-03', source: 'linked', cash: 170000 }), at('2026-11-03', '17:00'));
    const q = ask(r).find((x) => x.kind === 'V1')!;
    expect(q.sentence).toBe('The information from Robinhood indicates $170,000 on Nov 3, 2026; you entered $172,500. Confirm changing Nov 3 to $170,000.');
    cases.V1 = () => ({ record: r, q, choice: { id: 'change' } });
    expect(valuesNow(answer(r, q, 'change', at('2026-11-04')).record, A)!.total).toBe(170000);
  });

  test('V2 · no date: his file imported Nov 4, 2026 does not say what day its $4,800 is from', () => {
    const r = addRows([], valueRows({ accountId: A, date: null, source: 'file', cash: 4800 }), at('2026-11-04'));
    const q = ask(r).find((x) => x.kind === 'V2')!;
    expect(q.sentence).toBe('Your file imported Nov 4, 2026 does not say what day its $4,800 is from. What day is it from?');
    cases.V2 = () => ({ record: r, q, choice: { id: 'date', date: '2026-06-21' } });
    const after = answer(r, q, 'date', at('2026-11-05'), { date: '2026-06-21' }).record;
    expect([valuesNow(after, A)!.date, valuesNow(after, A)!.total, valuesNeedingADate(after, A)]).toEqual(['2026-06-21', 4800, []]);
  });

  test('M1 · not explained: the move could not place 20 VTI moved out on Mar 3, 2026', () => {
    const said = 'The phone shows 20 VTI moved out on Mar 3, 2026, but not which purchase they came from. Enter that purchase, or leave the move off.';
    const stored: Record<string, StoredQuestions> = { [`${A}#moved`]: { events: [], lists: [], unexplained: [said], at: at('2026-11-12') } };
    const q = ask([], stored).find((x) => x.kind === 'M1')!;
    expect([q.sentence, q.choices.map((c) => c.label)]).toEqual([said, ['Enter it', 'Leave it']]);
    cases.M1 = () => ({ record: [], q, choice: { id: 'leave' } });
    const after = answer([], q, 'leave', at('2026-11-13')).record;
    expect(questionsStillTrue(after, stored)[`${A}#moved`].unexplained).toEqual([]);
  });

  test('C1 · confirm my change: Robinhood’s 350, he enters 320 — asked at once, never stored', () => {
    const r = addRows([], [buy('MSFT', '2026-07-30', 100, 350, { source: 'linked', ref: 'rh-c' })], at('2026-08-01'));
    const id = rowsInForce(r)[0].rowId;
    const q = confirmMyChangeQuestion(r, id, { price: 320 }, who)!;
    expect(q.sentence).toBe('The information from Robinhood indicates price of 350, you entered 320. Confirm changing price for 100 shares of MSFT to 320.');
    cases.C1 = () => ({ record: r, q, choice: { id: 'confirm' } });
    expect(openPurchases(answer(r, q, 'confirm', at('2026-08-02')).record, A, 'MSFT')[0].price).toBe(320);
    expect(answer(r, q, 'cancel', at('2026-08-02')).rows).toEqual([]);
  });
});

/** E4 and L3: Robinhood's lots of 10 VTI at $200 (Jan 10) and 20 at $210 (Feb 10); he takes the Jan 10 purchase away;
 *  Robinhood resends it and still lists it. */
function takenAwayCase() {
  let r = addRows([], [buy('VTI', '2026-01-10', 10, 200, { source: 'linked', ref: 'b1', stillHeldOn: '2026-03-01' }),
    buy('VTI', '2026-02-10', 20, 210, { source: 'linked', ref: 'b2', stillHeldOn: '2026-03-01' })], at('2026-03-01'));
  r = removeRow(r, rowsInForce(r).find((x) => x.date === '2026-01-10')!.rowId, 'typed', at('2026-03-02')).record;
  const resent = historyPurchaseRow(r, { accountId: A, holding: 'VTI', date: '2026-01-10', shares: 10, price: 200, source: 'linked', ref: 'b1' });
  const events = sortArriving(r, [resent]).ask;
  return { record: r, q: eventQuestionToAsk(r, one(events), who), events };
}
cases.E4 = () => ({ ...takenAwayCase(), choice: { id: 'put-back' } });

/** L2 and rule 5: Jun 30 lists VTI Jan 10 20 at $200; Jul 31 leaves it out. */
function julyCase() {
  const june = setBeside([], 'VTI', [{ date: '2026-01-10', shares: 20, price: 200 }], '2026-06-30', 20, 210);
  expect(june.ask).toEqual([]);
  const july = purchasesFromList(june.record, A, 'VTI', [], 'linked', '2026-07-31');
  const raw = one(july.ask);
  return { record: june.record, raw, q: one(listQuestionToAsk(june.record, raw, who)) };
}

describe('§ 6 · the tests the design names', () => {
  test('gap-moves-then-list-correct: 450 kept against 500, then a list of 650 → 650, and no keep fact left', () => {
    let r = addRows([], [buy('MSFT', '2026-07-29', 450, 350)], at('2026-07-29'));
    const first = one(listAsk(r, 'MSFT', [{ date: '2026-07-29', shares: 500, price: 350 }], '2026-08-01').qs);
    r = answer(r, first, 'mine-correct', at('2026-08-01', '18:00')).record;
    expect([sharesOnRecord(r, A, 'MSFT'), keepFacts(r)]).toEqual([450, 1]);
    const second = one(listAsk(r, 'MSFT', [{ date: '2026-07-29', shares: 650, price: 350 }], '2026-09-01').qs);
    // the same name, a new difference (rule 1): asked
    expect([second.name === first.name, second.difference === first.difference]).toEqual([true, false]);
    r = answer(r, second, 'list-correct', at('2026-09-01', '18:00')).record;
    expect([sharesOnRecord(r, A, 'MSFT'), keepFacts(r)]).toEqual([650, 0]);
  });

  test('undo-spares-his-edit: $210, then he types $208, then "Keep mine" → he is asked first', () => {
    let { record: r, q } = e1Case();
    r = answer(r, q, 'change', at('2026-03-02')).record;
    const lot = openPurchases(r, A, 'VTI')[0];
    expect(lot.price).toBe(210);
    r = correctRow(r, lot.rowId, { price: 208, amount: 20 * 208 }, 'typed', at('2026-03-03')).record;
    const out = answer(r, q, 'keep-mine', at('2026-03-04'));
    expect(out.rows).toEqual([]);
    expect(one(out.ask).sentence).toBe('You entered $208 on Mar 3 after this answer. Confirm changing price for 20 shares of VTI to $205.');
    expect(openPurchases(out.record, A, 'VTI')[0].price).toBe(208);
    // he confirms: $205, and the switch then goes through
    r = answer(r, out.ask[0], 'confirm', at('2026-03-04', '13:00')).record;
    r = answer(r, q, 'keep-mine', at('2026-03-04', '14:00')).record;
    expect(openPurchases(r, A, 'VTI')[0].price).toBe(205);
  });

  test('changed-answers: 20 → 30; $6,200 → $6,050; 60 → 30', () => {
    // E4: "Stays away" (20), switched to "Put it back" (30)
    let { record: v, q: e4 } = takenAwayCase();
    v = answer(v, e4, 'stays-away', at('2026-03-03')).record;
    expect(sharesOnRecord(v, A, 'VTI')).toBe(20);
    v = answer(v, e4, 'put-back', at('2026-03-04')).record;
    expect(sharesOnRecord(v, A, 'VTI')).toBe(30);
    // typed 10 at $195 and 20 at $205; Robinhood sends $200 and $210
    const typed = () => addRows([], [buy('VTI', '2026-01-10', 10, 195), buy('VTI', '2026-02-10', 20, 205)], at('2026-03-01'));
    const sent = [buy('VTI', '2026-01-10', 10, 200, { source: 'linked', ref: 'r1' }), buy('VTI', '2026-02-10', 20, 210, { source: 'linked', ref: 'r2' })];
    let r = typed();
    const [q1, q2] = eventAsk(r, sent);
    r = answer(r, q1, 'change', at('2026-03-02', '10:00')).record;
    r = answer(r, q2, 'change', at('2026-03-02', '11:00')).record;
    expect(cost(r, 'VTI')).toBe(6200);
    r = answer(r, q1, 'keep-mine', at('2026-03-03', '10:00')).record;
    r = answer(r, q2, 'keep-mine', at('2026-03-03', '11:00')).record;
    expect(cost(r, 'VTI')).toBe(1950 + 4100);
    // "Two purchases" (60), switched to "Keep mine" (30)
    let t = typed();
    const [p1, p2] = eventAsk(t, sent);
    t = answer(t, p1, 'two-purchases', at('2026-03-02', '10:00')).record;
    t = answer(t, p2, 'two-purchases', at('2026-03-02', '11:00')).record;
    expect(sharesOnRecord(t, A, 'VTI')).toBe(60);
    t = answer(t, p1, 'keep-mine', at('2026-03-03', '10:00')).record;
    t = answer(t, p2, 'keep-mine', at('2026-03-03', '11:00')).record;
    expect(sharesOnRecord(t, A, 'VTI')).toBe(30);
  });

  test('undo-dated-lots-no-question: a sale from an undone lot takes the oldest dated purchase first — 0 questions', () => {
    let r = addRows([], [buy('VTI', '2026-01-05', 10, 190), buy('VTI', '2026-02-10', 20, 205), buy('VTI', '2026-03-01', 10, 220)], at('2026-03-01'));
    const q = one(eventAsk(r, [buy('VTI', '2026-02-10', 20, 210, { source: 'linked', ref: 'r9' })]));
    r = answer(r, q, 'two-purchases', at('2026-03-02')).record;
    r = addRows(r, [sell('VTI', '2026-03-20', 35, 230)], at('2026-03-21'));
    const sale = rowsInForce(r).find((x) => x.kind === 'SALE')!;
    expect(saleGain(r, sale.rowId)).toBe(10 * 40 + 20 * 25 + 5 * 20);
    const out = answer(r, q, 'keep-mine', at('2026-03-22'));
    expect(out.ask).toEqual([]);
    expect(ask(out.record).filter((x) => x.family === 'sale')).toEqual([]);
    expect(saleGain(out.record, sale.rowId)).toBe(10 * 40 + 20 * 25 + 5 * 10);
  });

  test('list-names-the-sold-lot: 100 at $50 (Jan 10) and 100 at $60 (Feb 10), 50 sold at $65 on Mar 10 — $750 → $250', () => {
    const r = addRows([], [buy('MSFT', '2026-01-10', 100, 50), buy('MSFT', '2026-02-10', 100, 60), sell('MSFT', '2026-03-10', 50, 65)], at('2026-03-11'));
    const sale = rowsInForce(r).find((x) => x.kind === 'SALE')!;
    expect(saleGain(r, sale.rowId)).toBe(750);                                   // oldest first: 50 × $15
    const q = one(listAsk(r, 'MSFT', [{ date: '2026-01-10', shares: 100, price: 50 }, { date: '2026-02-10', shares: 50, price: 60 }], '2026-03-31').qs);
    expect([q.kind, q.sentence]).toEqual(['L6', 'Robinhood lists 100 MSFT bought Jan 10 and 50 bought Feb 10, 2026. The record counts the 50 shares sold on Mar 10 as coming from the Jan 10 purchase. Confirm they came from Feb 10: the sale made $250, not $750.']);
    cases.L6 = () => ({ record: r, q, choice: { id: 'list-correct' } });
    const after = answer(r, q, 'list-correct', at('2026-04-01')).record;
    expect([saleGain(after, sale.rowId), sharesOnRecord(after, A, 'MSFT')]).toEqual([250, 150]);   // 50 × $5; shares do not change
  });

  test('one-removal-one-question: removing VTI Jan 10 raises only L3, and its answer writes both facts', () => {
    const { record: r, events } = takenAwayCase();
    const lists = purchasesFromList(r, A, 'VTI', [{ date: '2026-01-10', shares: 10, price: 200 }, { date: '2026-02-10', shares: 20, price: 210 }], 'linked', '2026-03-05', events).ask;
    const qs = ask(r, { [A]: { events, lists, at: at('2026-03-05') } }).filter((x) => x.family === 'event' || x.family === 'list');
    const q = one(qs);
    expect([q.kind, q.sentence]).toEqual(['L3', 'Robinhood still lists and resends 10 VTI bought Jan 10, 2026 at $200; you took it away. Confirm it stays taken away: 20 shares.']);
    cases.L3 = () => ({ record: r, q, choice: { id: 'stays-away' } });
    const after = answer(r, q, 'stays-away', at('2026-03-06')).record;
    const facts = rowsInForce(after).filter((x) => x.kind === 'FACT');
    expect([facts.some((f) => typeof f.facts?.keepsOverList === 'string'), facts.some((f) => typeof f.facts?.eventPair === 'string'), sharesOnRecord(after, A, 'VTI')]).toEqual([true, true, 20]);
  });

  test('same-question-three-keys: one question kept under the account, #typed and #moved is shown once', () => {
    const { record, q } = e1Case();
    const e = q.event!;
    const stored: Record<string, StoredQuestions> = Object.fromEntries([A, `${A}#typed`, `${A}#moved`].map((k) => [k, { events: [e], lists: [], at: at('2026-03-01') }]));
    expect(ask(record, stored).filter((x) => x.family === 'event').map((x) => x.name)).toEqual([eventQuestionName(e)]);
    const kept = questionsStillTrue(record, stored);
    expect(Object.values(kept).reduce((n, x) => n + x.events.length, 0)).toBe(1);
  });

  test('newer-list-closes-older: the Jul 31 question closes once Aug 31 is set beside the record — 0 questions', () => {
    const { record, raw } = julyCase();
    const stored = { [A]: { events: [], lists: [raw], at: at('2026-07-31') } };
    expect(ask(record, stored).filter((x) => x.family === 'list')).toHaveLength(1);
    const aug = setBeside(record, 'VTI', [{ date: '2026-01-10', shares: 20, price: 200 }], '2026-08-31', 20, 220);
    expect(aug.ask).toEqual([]);
    const kept = questionsStillTrue(aug.record, stored);
    expect([kept[A].lists, ask(aug.record, kept).filter((x) => x.family === 'list')]).toEqual([[], []]);
  });

  test('newer-list-undoes-answer: $4,000 from Jan 10, with the note', () => {
    const { record, q } = julyCase();
    let r = answer(record, q, 'list-correct', at('2026-08-01')).record;
    expect(sharesOnRecord(r, A, 'VTI')).toBe(0);
    const aug = [{ date: '2026-01-10', shares: 20, price: 200 }];
    const undone = newerListUndoes(r, A, 'VTI', aug, 'linked', '2026-08-31', who);
    expect(undone.notes).toEqual(['Robinhood’s list of Aug 31 shows the 20 VTI again, so your Jul 31 answer was undone.']);
    r = addRows(r, undone.rows, at('2026-08-31', '17:00'));
    const after = purchasesFromList(r, A, 'VTI', aug, 'linked', '2026-08-31');
    expect([after.ask, after.rows.filter((x) => x.kind !== 'FACT')]).toEqual([[], []]);
    // 20 shares at $200 bought Jan 10, $4,000 — nothing added without a date or price
    expect(openPurchases(r, A, 'VTI').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-01-10', 20, 200]]);
    expect(cost(r, 'VTI')).toBe(4000);
  });

  test('closed-question-answer: an answer sent to the closed Jul 31 question writes 0 rows — "already settled"', () => {
    const { record, q } = julyCase();
    const aug = setBeside(record, 'VTI', [{ date: '2026-01-10', shares: 20, price: 200 }], '2026-08-31', 20, 220);
    const out = answer(aug.record, q, 'list-correct', at('2026-09-01'));
    expect([out.rows, out.told]).toEqual([[], 'Robinhood’s list of Aug 31 already settled this; nothing changed.']);
    expect(sharesOnRecord(out.record, A, 'VTI')).toBe(20);
  });

  test('option-expiry-sale: 2 calls bought at $4.00 a share, OPTIONEXPIRATION on Feb 20 — a sale at $0, −$800, nothing asked', () => {
    const os = { ticker: OPTION, option_type: 'CALL', strike_price: 260, expiration_date: '2026-02-20', underlying_symbol: { raw_symbol: 'AAPL' }, is_mini_option: false };
    const p = {
      account: { id: 'acc-1', institution_name: 'Robinhood', name: 'Robinhood Individual', sync_status: { holdings: { last_successful_sync: '2026-02-21T12:00:00' } }, balance: { total: { amount: 0, currency: 'USD' } } },
      balancesCash: 0, positions: [],
      activities: [
        { id: 'o1', type: 'BUY', trade_date: '2026-02-01', units: 2, price: 400, amount: -800, option_symbol: os, option_type: 'CALL' },
        { id: 'o2', type: 'OPTIONEXPIRATION', trade_date: '2026-02-20', units: -2, price: 0, amount: 0, option_symbol: os, option_type: 'CALL' },
      ],
    } as any;
    const u = brokerUpdateToRecord([], p, A);
    const sorted = sortArriving([], u.events);
    expect(sorted.ask).toEqual([]);
    const r = addRows([], sorted.save, at('2026-02-21'));
    const sale = one(rowsInForce(r).filter((x) => x.kind === 'SALE'));
    expect([sale.holding, sale.date, sale.shares, sale.price, saleGain(r, sale.rowId), sharesOnRecord(r, A, OPTION)]).toEqual([OPTION, '2026-02-20', 200, 0, -800, 0]);
  });

  /** X1 and X2: 2 AAPL $260 calls expiring Feb 20, 2026, bought at $4.00 a share. */
  const optionRecord = () => addRows([], [buy(OPTION, '2026-02-01', 200, 4, { source: 'linked', ref: 'o1' })], at('2026-02-01'));

  test('x1-sold-closes: Robinhood no longer lists the calls — "Sold or exercised" closes it, and the sale he enters makes 0', () => {
    let r = optionRecord();
    const raw = one(purchasesFromList(r, A, OPTION, [], 'linked', '2026-02-21').ask);
    const q = one(listQuestionToAsk(r, raw, who));
    expect([q.kind, q.sentence]).toEqual(['X1', 'Robinhood no longer lists your 2 AAPL $260 calls expiring Feb 20, 2026 (200 shares, bought at $4.00 a share). Confirm they expired worthless on Feb 20: a loss of $800.']);
    const before = r;
    cases.X1 = () => ({ record: before, q, choice: { id: 'expired' } });
    // "Expired": a sale of 200 at $0 on Feb 20, a loss of $800
    const expired = answer(r, q, 'expired', at('2026-02-22')).record;
    const sale = one(rowsInForce(expired).filter((x) => x.kind === 'SALE'));
    expect([sale.date, sale.shares, saleGain(expired, sale.rowId)]).toEqual(['2026-02-20', 200, -800]);
    // "Sold or exercised": the question closes; he enters the sale
    r = answer(r, q, 'sold', at('2026-02-22')).record;
    const stored = { [A]: { events: [], lists: [raw], at: at('2026-02-21') } };
    expect(questionsStillTrue(r, stored)[A].lists).toEqual([]);
    r = addRows(r, [sell(OPTION, '2026-02-15', 200, 5)], at('2026-02-23'));
    expect([sharesOnRecord(r, A, OPTION), purchasesFromList(r, A, OPTION, [], 'linked', '2026-02-24').ask]).toEqual([0, []]);
  });

  test('exercise-one-question: the calls leave and 200 AAPL arrive in one update — one question, never two', () => {
    const r = optionRecord();
    const lists = [{ holding: OPTION, listed: [] }, { holding: 'AAPL', listed: [{ date: '2026-02-20', shares: 200, price: 260 }] }];
    const asks = lists.flatMap((l) => purchasesFromList(r, A, l.holding, l.listed, 'linked', '2026-02-20').ask);
    const raw = one(oneQuestionPerExercise(r, A, lists, asks));
    const q = one(listQuestionToAsk(r, raw, who));
    expect([q.kind, q.sentence]).toEqual(['X2', 'Robinhood dropped 2 AAPL $260 calls and added 200 AAPL shares on Feb 20, 2026. Enter what happened.']);
    const rows = [sell(OPTION, '2026-02-20', 200, 0)];
    cases.X2 = () => ({ record: r, q, choice: { id: 'enter', rows } });
    const after = answer(r, q, 'enter', at('2026-02-21'), { rows }).record;
    expect([sharesOnRecord(after, A, OPTION), questionsStillTrue(after, { [A]: { events: [], lists: [raw], at: at('2026-02-20') } })[A].lists]).toEqual([0, []]);
  });

  test('keeps-500-shows-300: 500 stays and Robinhood’s 300 is asked; the sale of 200 arriving makes it 300', () => {
    let r = addRows([], [buy('MSFT', '2026-07-30', 500, 350, { source: 'linked', ref: 'rh-500' })], at('2026-08-01'));
    r = addRows(r, valueRows({ accountId: A, date: '2026-08-10', source: 'linked', cash: 0, holdings: [{ holding: 'MSFT', shares: 300, price: 400, value: 120000 }] }), at('2026-08-10'));
    const q = ask(r).find((x) => x.kind === 'D1')!;
    expect(q.sentence).toBe('Robinhood says 300 MSFT; the record holds 500 and no sale explains 200. Confirm changing MSFT to 300 shares.');
    expect(q.choices.map((c) => c.label)).toEqual(['Change', 'Keep 500']);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
    const before = r;
    cases.D1 = () => ({ record: before, q, choice: { id: 'change' } });
    expect(sharesOnRecord(answer(r, q, 'change', at('2026-08-11')).record, A, 'MSFT')).toBe(300);
    const kept = answer(r, q, 'keep', at('2026-08-11')).record;
    expect([sharesOnRecord(kept, A, 'MSFT'), ask(kept).filter((x) => x.kind === 'D1')]).toEqual([500, []]);
    r = addRows(r, [sell('MSFT', '2026-08-05', 200, 400, 'linked')], at('2026-08-12'));
    expect([sharesOnRecord(r, A, 'MSFT'), ask(r).filter((x) => x.kind === 'D1')]).toEqual([300, []]);
  });

  test('e1-names-sales: $225 → $200 (above, § 3 E1)', () => {
    const { record, q } = e1Case();
    expect(q.sentence).toContain('This changes the sale of 5 VTI on Mar 10: it made $225, it will make $200.');
    void record;
  });

  test('two-phones: phone A "Keep mine" at 10:02, phone B "Change" at 10:05 — $210 and one note', () => {
    const { record: base, q } = e1Case();
    const a = answer(base, q, 'keep-mine', '2026-03-02T10:02:00.000Z');
    const b = answer(base, q, 'change', '2026-03-02T10:05:00.000Z');
    const merged = addRows(addRows(base, a.rows, '2026-03-02T10:02:00.000Z'), b.rows, '2026-03-02T10:05:00.000Z');
    const out = afterAWrite(merged, {}, '2026-03-02T10:06:00.000Z', who);
    expect(openPurchases(out.record, A, 'VTI')[0].price).toBe(210);
    expect(out.questions[A].notes).toEqual(['Another phone answered “Keep mine” at 10:02; the later answer, “Change”, counts.']);
    expect(rowsInForce(out.record).filter((x) => x.facts?.answerOf === q.name)).toHaveLength(1);
    // settled once: a second check writes nothing more
    expect(afterAWrite(out.record, {}, '2026-03-02T10:07:00.000Z', who).record).toHaveLength(out.record.length);
  });

  test('old-answers-keyed: every answer saved before names existed is given its name — the guard counts what it saw', () => {
    // each kind of answer the record held before 2026-11-12, written by the functions that wrote them
    let r = addRows([], [buy('VTI', '2026-01-10', 10, 195), buy('VTI', '2026-02-10', 20, 205), buy('VTI', '2026-03-10', 5, 230)], at('2026-03-01'));
    const [e1, e2, e3] = sortArriving(r, [buy('VTI', '2026-01-10', 10, 200, { source: 'linked', ref: 'k1' }), buy('VTI', '2026-02-10', 20, 210, { source: 'linked', ref: 'k2' }),
      buy('VTI', '2026-03-10', 5, 231, { source: 'linked', ref: 'k3' })]).ask;
    r = addRows(r, answerEventQuestion(e1, 'mine', r), at('2026-03-02', '01:00'));
    r = addRows(r, answerEventQuestion(e2, 'theirs', r), at('2026-03-02', '02:00'));
    r = addRows(r, answerEventQuestion(e3, 'both', r), at('2026-03-02', '03:00'));
    r = addRows(r, [buy('MSFT', '2026-07-29', 450, 350)], at('2026-07-29'));
    const [l1] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-29', shares: 500, price: 350 }], 'linked', '2026-08-01').ask;
    r = addRows(r, answerListQuestion(r, l1, false, 'linked', '2026-08-01'), at('2026-08-01', '18:00'));
    r = addRows(r, [buy('QQQ', '2026-04-01', 30, 400)], at('2026-04-01'));
    const [l2] = purchasesFromList(r, A, 'QQQ', [{ date: '2026-04-02', shares: 30, price: 400 }], 'linked', '2026-04-30').ask;
    r = addRows(r, answerListQuestion(r, l2, true, 'linked', '2026-04-30'), at('2026-04-30', '18:00'));
    r = addRows(r, [buy('X', '2026-01-05', 500, 10, { source: 'linked', ref: 'kx' })], at('2026-02-01'));
    const [l3] = purchasesFromList(r, A, 'X', [{ date: null, shares: 1000, price: 12, average: true }], 'linked', '2026-02-02').ask;
    r = addRows(r, answerListQuestion(r, l3, true, 'linked', '2026-02-02'), at('2026-02-02', '18:00'));
    // (the values on another account: a later day's values from the broker would settle the lists above, rule 5)
    r = addRows(r, valueRows({ accountId: 'acct-2', date: '2026-09-15', source: 'typed', typedValue: 100 }), at('2026-09-15', '09:00'));
    r = addRows(r, valueRows({ accountId: 'acct-2', date: '2026-09-15', source: 'linked', cash: 150 }), at('2026-09-15', '17:00'));
    r = addRows(r, answerValuesQuestion(valuesThatDiffer(r, 'acct-2')[0], 'theirs', r), at('2026-09-15', '18:00'));
    const k = keyOldAnswers(r);
    // eslint-disable-next-line no-console
    console.log(`old answers: saw ${k.seen} rows, keyed ${k.keyed}, unkeyed ${k.unkeyed.length}`);
    // 3 event facts, 1 list fact, 1 value fact, and the rows the two "the list is correct" answers marked byAnswer
    expect(k.seen).toBeGreaterThanOrEqual(7);
    expect([k.keyed, k.unkeyed]).toEqual([k.seen, []]);
    // each old answer carries the name its question has today, so a changed answer finds and undoes it
    const named = (pred: (x: AssetRow) => boolean) => [...new Set(k.record.filter(pred).map((x) => x.answerTo))];
    expect(named((x) => x.facts?.eventPair === e2.key)).toEqual([eventQuestionName(e2)]);
    expect(named((x) => x.facts?.keepsOverList === l1.signature)).toEqual([listQuestionName(l1)]);
    expect(named((x) => !!x.byAnswer && x.holding === 'QQQ')).toEqual([listQuestionName(l2)]);
    expect(named((x) => !!x.byAnswer && x.holding === 'X')).toEqual([listQuestionName(l3)]);
    // the old "theirs" of e2 switched to "Keep mine" puts $205 back; the old keep-mine of l1 switched to the list: 500
    let s = answerQuestion(r, eventQuestionToAsk(r, e2, who), { id: 'keep-mine' }, at('2026-10-01'), who).record;
    expect(openPurchases(s, A, 'VTI').find((p) => p.date === '2026-02-10')!.price).toBe(205);
    s = answerQuestion(s, one(listQuestionToAsk(s, l1, who)), { id: 'list-correct' }, at('2026-10-02'), who).record;
    expect(sharesOnRecord(s, A, 'MSFT')).toBe(500);
  });
});

describe('§ 4 · the rules for answers', () => {
  test('rule 7 · a question no longer true is dropped: E2 (typed Jul 29, Robinhood Jul 30) goes when he edits his date to Jul 30', () => {
    let r = addRows([], [buy('VTI', '2026-07-29', 10, 200)], at('2026-08-01'));
    const e = one(sortArriving(r, [buy('VTI', '2026-07-30', 10, 200, { source: 'linked', ref: 'rh-7' })]).ask);
    const stored = { [A]: { events: [e], lists: [], at: at('2026-08-01') } };
    expect(questionsStillTrue(r, stored)[A].events).toHaveLength(1);
    r = correctRow(r, rowsInForce(r)[0].rowId, { date: '2026-07-30' }, 'typed', at('2026-08-02')).record;
    expect(questionsStillTrue(r, stored)[A].events).toEqual([]);
  });

  test('rule 7 · needsADate is read from MK-NW-F-249: it no longer sticks once the values are dated', () => {
    let r = addRows([], valueRows({ accountId: A, date: null, source: 'file', cash: 4800 }), at('2026-11-04'));
    const stored = { [A]: { events: [], lists: [], needsADate: true, at: at('2026-11-04') } };
    expect(questionsStillTrue(r, stored)[A].needsADate).toBe(true);
    const q = ask(r).find((x) => x.kind === 'V2')!;
    r = answer(r, q, 'date', at('2026-11-05'), { date: '2026-06-21' }).record;
    expect(questionsStillTrue(r, stored)[A].needsADate).toBe(false);
  });

  test('rule 8 · 450 kept against 500 (a gap of 50): after buying 100, 550 against 600 is not asked; 650 against 550 is', () => {
    let r = addRows([], [buy('MSFT', '2026-07-29', 450, 350)], at('2026-07-29'));
    const q = one(listAsk(r, 'MSFT', [{ date: '2026-07-29', shares: 500, price: 350 }], '2026-08-01').qs);
    r = answer(r, q, 'mine-correct', at('2026-08-01', '18:00')).record;
    r = addRows(r, [buy('MSFT', '2026-08-15', 100, 400)], at('2026-08-15'));
    expect(listAsk(r, 'MSFT', [{ date: '2026-07-29', shares: 500, price: 350 }, { date: '2026-08-15', shares: 100, price: 400 }], '2026-09-01').qs).toEqual([]);
    expect(listAsk(r, 'MSFT', [{ date: '2026-07-29', shares: 550, price: 350 }, { date: '2026-08-15', shares: 100, price: 400 }], '2026-09-02').qs).toHaveLength(1);
  });

  test('rule 2 · the undo touches only rows still in force; a new row is removed, a correction goes back', () => {
    const { record, q } = e1Case();
    const after = answer(record, q, 'change', at('2026-03-02')).record;
    const u = undoAnswer(after, q.name);
    expect(u.ask).toEqual([]);
    const back = addRows(after, u.rows, at('2026-03-03'));
    expect([openPurchases(back, A, 'VTI')[0].price, rowsInForce(back).filter((x) => x.answerTo === q.name)]).toEqual([205, []]);
    // nothing left to undo
    expect(undoAnswer(back, q.name).rows).toEqual([]);
  });
});

test('every-kind-has-a-writer: 22 of 22 kinds answered, each writing its answer', () => {
  expect(QUESTION_KINDS).toHaveLength(22);
  const answered: string[] = [];
  for (const kind of QUESTION_KINDS) {
    const make = cases[kind];
    expect([kind, typeof make]).toEqual([kind, 'function']);
    const { record, q, choice } = (make as NonNullable<typeof make>)();
    expect(q.kind).toBe(kind);
    const out = answerQuestion(record, q, choice, '2027-01-01T00:00:00.000Z', who);
    expect([kind, out.told, out.ask.length]).toEqual([kind, null, 0]);
    // every answer writes; all but C1 write the answer's own fact, named by the question
    expect(out.rows.length).toBeGreaterThan(0);
    if (kind !== 'C1') expect(out.rows.some((x) => x.facts?.answerOf === q.name)).toBe(true);
    answered.push(kind);
  }
  // eslint-disable-next-line no-console
  console.log(`every-kind-has-a-writer: ${answered.length} of ${QUESTION_KINDS.length}`);
  expect(answered).toHaveLength(22);
});

test('a row the record already held is found as it stands after an answer', () => {
  const { record, q } = e1Case();
  const after = answer(record, q, 'change', at('2026-03-02')).record;
  expect(rowAsItStands(after, q.event!.onRecord.rowId)?.price).toBe(210);
});
