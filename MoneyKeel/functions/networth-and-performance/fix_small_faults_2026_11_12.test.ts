/* FOUR SMALL FAULTS (2026-11-12) — each written out with its real figures beside it.
 *   MK-NW-F-316 salesSentence · MK-NW-F-319 listQuestionToAsk · MK-NW-F-337 answerQuestion. */
import { addRows, sortArriving, saleRow, eventQuestionToAsk, listQuestionToAsk, answerQuestion, openPurchases, type NewRow, type ListQuestion } from './asset-record';

const A = 'acct-1';
const purchase = (date: string | null, shares: number, price: number, over: Partial<NewRow> = {}): NewRow =>
  ({ accountId: A, holding: 'MSFT', kind: 'PURCHASE', date, shares, price, amount: shares * price, source: 'file', ...over });

describe('MK-NW-F-316 salesSentence', () => {
  test('with no holding, the sale of 70 shares on May 1 reads "70 shares on", never a double space', () => {
    const r = addRows([], sortArriving([], [purchase('2025-01-10', 100, 200), saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 70, price: 300, source: 'file' })]).save, '2026-06-01T12:00:00.000Z');
    const [eq] = sortArriving(r, [purchase('2025-01-10', 100, 202), saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 70, price: 300, source: 'file' })]).ask;
    const saleRowId = r.find((x) => x.kind === 'SALE')!.rowId;
    const q = eventQuestionToAsk(r, { ...eq, salesMoved: [{ saleRowId, was: 7000, will: 6860 }] }, undefined);
    // the same question as the salesSentence builds it with no holding name: 70 × ($300 − $200) = $7,000; 70 × ($300 − $202) = $6,860
    const noName = eventQuestionToAsk(r.map((x) => (x.kind === 'SALE' ? { ...x, holding: null } : x)) as any, { ...eq, onRecord: { ...eq.onRecord, holding: null }, arriving: { ...eq.arriving, holding: null }, salesMoved: [{ saleRowId, was: 7000, will: 6860 }] } as any);
    expect(q.sentence).toContain('This changes the sale of 70 MSFT on May 1: it made $7,000, it will make $6,860.');
    expect(noName.sentence).toContain('This changes the sale of 70 shares on May 1: it made $7,000, it will make $6,860.');
    expect(noName.sentence).not.toMatch(/ {2}/);
  });
});

describe('MK-NW-F-319 listQuestionToAsk', () => {
  test('a price list shorter than the record names the lot it leaves out — 50 MSFT bought Feb 10, 2025 at $210 — never "not known"', () => {
    const r = addRows([], [purchase('2025-01-10', 100, 200), purchase('2025-02-10', 50, 210)], '2026-06-01T12:00:00.000Z');
    const open = openPurchases(r, A, 'MSFT');
    expect(open.map((p) => [p.date, p.shares, p.price])).toEqual([['2025-01-10', 100, 200], ['2025-02-10', 50, 210]]);
    const lq: ListQuestion = { accountId: A, holding: 'MSFT', kind: 'price', onRecord: open, sharesOnRecord: 150,
      listed: [{ date: '2025-01-10', shares: 100, price: 202 }], sharesListed: 100, signature: 'price|test', listedAll: [{ date: '2025-01-10', shares: 100, price: 202 }],
      listDay: '2026-07-01', source: 'file' } as ListQuestion;
    const [q] = listQuestionToAsk(r, lq);
    expect(q.sentence).not.toContain('not known');
    expect(q.sentence).toBe('Your file’s list indicates $202 for 100 MSFT bought Jan 10, 2025; the record holds $200. Confirm changing to $202. '
      + 'Your file’s list leaves out the 50 MSFT bought Feb 10, 2025 at $210; that purchase stays as the record holds it.');
  });
});

describe('MK-NW-F-337 answerQuestion', () => {
  test('"Cancel" writes nothing and undoes nothing, even after an answer: the price stays $202, no rows', () => {
    let r = addRows([], sortArriving([], [purchase('2025-01-10', 100, 200)]).save, '2026-06-01T12:00:00.000Z');
    const [eq] = sortArriving(r, [purchase('2025-01-10', 100, 202)]).ask;
    const q = eventQuestionToAsk(r, eq);
    r = answerQuestion(r, q, { id: 'change' }, '2026-06-02T09:00:00.000Z').record;
    expect(openPurchases(r, A, 'MSFT')[0].price).toBe(202);
    const c = answerQuestion(r, q, { id: 'cancel' }, '2026-06-03T09:00:00.000Z');
    expect([c.rows.length, c.ask.length, c.told, c.record.length]).toEqual([0, 0, null, r.length]);
    expect(openPurchases(c.record, A, 'MSFT')[0].price).toBe(202);
  });
});
