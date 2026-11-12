/* THE ONE MASTER RECORD — held to his ruling of 2026-11-10, on his own two cases:
 *   · 500 MSFT bought at $350 on Jul 30, 2026, linked on Sept 15 and updated nine more times (his question of 2026-11-10);
 *   · his file MoneyKeel/documents/feedback/Build55-nov4-26-jj.csv, dated Jun 21, 2026 and imported Nov 4.
 * Every expected figure below is written out by hand beside it. */
import {
  addRows, rowsInForce, correctRow, removeRow, valueRows, valueBatchesOf, valuesNow, valuesOn, openPurchases, saleRow, saleGain,
  sharesOnRecord, sharesThatDisagree, purchasesFromList, answerListQuestion, historyPurchaseRow, differsFromGiven, eventsThatDiffer, answerEventQuestion, lastListDay, sortArriving, typedSalesTheListContradicts, valuesThatDiffer, answerValuesQuestion, salesMovedBy, salesNeedingAnAnswer, valuesNeedingADate, activityOf, factsOf, placedOn, dayOrNull, rowAsItStands, rowsNotYetSaved,
  soldBeyondRecord, statedTotalGap, transferRow, soldFrom, valuesLastGiven, rowsInForce as inForce, type AssetRow, type NewRow,
} from './asset-record';

const A = 'acct-1';
/** A list's answer changed no purchase and asked nothing (a fact it keeps — the average the broker stated — is not a change). */
const noChange = (a: { rows: NewRow[]; ask: unknown[] }) => a.ask.length === 0 && a.rows.every((r) => r.kind === 'FACT');
/** The rows a list adds or replaces — and it proves no question was returned. A test that expects a question reads
 *  purchasesFromList itself. */
const purchasesToAdd = (record: AssetRow[], accountId: string, holding: string, listed: Parameters<typeof purchasesFromList>[3], source: 'linked' | 'file', listDay: string | null = null): NewRow[] => {
  const answer = purchasesFromList(record, accountId, holding, listed, source, listDay);
  expect(answer.ask).toEqual([]);
  return answer.rows;
};
/** His ten updates: the day, and Microsoft's price that day. */
const UPDATES: [string, number][] = [
  ['2026-09-15', 450], ['2026-09-27', 470], ['2026-10-15', 475], ['2026-10-16', 340], ['2026-10-17', 340],
  ['2026-10-18', 345], ['2026-10-30', 380], ['2026-11-01', 470], ['2026-11-02', 420], ['2026-11-03', 340],
];
const purchase = (date: string | null, shares: number, price: number, over: Partial<NewRow> = {}): NewRow =>
  ({ accountId: A, holding: 'MSFT', kind: 'PURCHASE', date, shares, price, amount: shares * price, source: 'linked', ...over });
const msftDay = (date: string | null, price: number, shares = 500) => valueRows({
  accountId: A, date, source: 'linked', cash: 0, statedTotal: shares * price, holdings: [{ holding: 'MSFT', shares, price, value: shares * price }] });

/** His case as the app saves it: the purchase with the first update, then a set of values on each update. */
function hisMicrosoftCase(): AssetRow[] {
  let record: AssetRow[] = [];
  UPDATES.forEach(([day, price], i) => {
    const at = `${day}T17:00:00.000Z`;
    const rows = [...(i === 0 ? [purchase('2026-07-30', 500, 350, { settlementDate: '2026-07-31' })] : []), ...msftDay(day, price)];
    record = addRows(record, rows, at);
  });
  return record;
}

describe('his Microsoft case: 500 shares bought at $350 on Jul 30, 2026, updated ten times', () => {
  const record = hisMicrosoftCase();

  test('21 rows are saved and none is overwritten: 1 purchase, and on each of the 10 days a row for MSFT and a row for the account', () => {
    expect(record.length).toBe(21);
    expect(record.map((r) => r.rowId)).toEqual(Array.from({ length: 21 }, (_, i) => String(i + 1)));
    expect(record.filter((r) => r.kind === 'PURCHASE').length).toBe(1);
    expect(record.filter((r) => r.kind === 'VALUE' && r.holding === 'MSFT').length).toBe(10);
    expect(record.filter((r) => r.kind === 'VALUE' && r.holding === null).length).toBe(10);
    expect(rowsInForce(record).length).toBe(21);
  });

  test('every price he gave is still there, each under its own day', () => {
    expect(record.filter((r) => r.kind === 'VALUE' && r.holding === 'MSFT').map((r) => [r.date, r.shares, r.price, r.amount])).toEqual([
      ['2026-09-15', 500, 450, 225000], ['2026-09-27', 500, 470, 235000], ['2026-10-15', 500, 475, 237500],
      ['2026-10-16', 500, 340, 170000], ['2026-10-17', 500, 340, 170000], ['2026-10-18', 500, 345, 172500],
      ['2026-10-30', 500, 380, 190000], ['2026-11-01', 500, 470, 235000], ['2026-11-02', 500, 420, 210000],
      ['2026-11-03', 500, 340, 170000],
    ]);
  });

  test('the purchase keeps its own date, its settlement date and its price: Jul 30, settled Jul 31, 500 at $350 = $175,000', () => {
    const p = record.find((r) => r.kind === 'PURCHASE')!;
    expect([p.date, p.settlementDate, p.shares, p.price, p.amount, p.source]).toEqual(['2026-07-30', '2026-07-31', 500, 350, 175000, 'linked']);
  });

  test('what the screens show today is the row with the latest date: Nov 3, 500 shares at $340 = $170,000', () => {
    const now = valuesNow(record, A)!;
    expect([now.date, now.total, now.cash, now.statedTotal]).toEqual(['2026-11-03', 170000, 0, 170000]);
    expect(now.holdings).toEqual([{ holding: 'MSFT', shares: 500, price: 340, value: 170000 }]);
  });

  test('any earlier day can still be read: Oct 15 was $237,500; a day with no update has no values', () => {
    expect(valuesOn(record, A, '2026-10-15')!.total).toBe(237500);
    expect(valuesOn(record, A, '2026-10-19')).toBeNull();
  });

  test('the purchases on record add up to the shares the broker states', () => {
    expect(sharesOnRecord(record, A, 'MSFT')).toBe(500);
    expect(sharesThatDisagree(record, A)).toEqual([]);
  });
});

describe('every purchase and every sale is its own row — nothing is averaged', () => {
  // after his ten updates: 100 more bought at $400 on Nov 5, then 200 sold at $420 on Nov 10
  let record = hisMicrosoftCase();
  record = addRows(record, [purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
  record = addRows(record, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
  const sale = record[record.length - 1];

  test('the sale names the purchase it sold: the oldest, row 1', () => {
    expect([sale.kind, sale.date, sale.shares, sale.price, sale.amount]).toEqual(['SALE', '2026-11-10', 200, 420, 84000]);
    expect(soldFrom(record, sale.rowId)).toEqual([{ rowId: '1', shares: 200 }]);
  });

  test('the sale made 200 × ($420 − $350) = $14,000', () => {
    expect(saleGain(record, sale.rowId)).toBe(14000);
  });

  test('what is left is two purchases, each at its own price and date: 300 at $350 (Jul 30) and 100 at $400 (Nov 5)', () => {
    expect(openPurchases(record, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 300, 350], ['2026-11-05', 100, 400]]);
    expect(sharesOnRecord(record, A, 'MSFT')).toBe(400);
  });

  test('a sale larger than the oldest purchase runs on into the next: 350 sold takes 300 from Jul 30 and 50 from Nov 5', () => {
    const more = addRows(record, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-12', shares: 350, price: 430, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    const second = more[more.length - 1];
    expect(soldFrom(more, second.rowId)).toEqual([{ rowId: '1', shares: 300 }, { rowId: '22', shares: 50 }]);
    // 300 × (430 − 350) + 50 × (430 − 400) = 24,000 + 1,500
    expect(saleGain(more, second.rowId)).toBe(25500);
    expect(openPurchases(more, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-11-05', 50, 400]]);
  });

  test('where the broker says which purchase was sold, that purchase is the one sold', () => {
    const base = addRows(hisMicrosoftCase(), [purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    const named = addRows(base, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'linked', sells: [{ rowId: '22', shares: 100 }] })], '2026-11-10T17:00:00.000Z');
    expect(saleGain(named, named[named.length - 1].rowId)).toBe(2000);   // 100 × (420 − 400)
    expect(openPurchases(named, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 500, 350]]);
  });

  test('the activity lists the two purchases and the sale, oldest first', () => {
    expect(activityOf(record, A).map((r) => [r.kind, r.date, r.shares, r.price])).toEqual([
      ['PURCHASE', '2026-07-30', 500, 350], ['PURCHASE', '2026-11-05', 100, 400], ['SALE', '2026-11-10', 200, 420]]);
  });
});

describe('a date is the day the data is from — never the phone\'s date', () => {
  test('his file, dated Jun 21, 2026 and imported Nov 4, is saved under Jun 21, at the file\'s own total of $169,664.71', () => {
    // the file's own lines: the CD $109,992.74, LCTX $1,167.65, the QQQ put $1,407.50, VMFXX $50,000.00, cash $7,096.82
    const rows = valueRows({ accountId: 'rh', date: '2026-06-21', source: 'file', cash: 7096.82, statedTotal: 169664.71, holdings: [
      { holding: 'KEY BANK CD 3.85% 08/24/2026', shares: 110000, price: 99.9934, value: 109992.74 },
      { holding: 'LCTX', shares: 965, price: 1.21, value: 1167.65 },
      { holding: "QQQ DEC 31 '26 $600 PUT", shares: 1, price: 14.075, value: 1407.5 },
      { holding: 'VMFXX', shares: 50000, price: 1, value: 50000 },
    ] });
    const record = addRows([], rows, '2026-11-04T18:00:00.000Z');
    const now = valuesNow(record, 'rh')!;
    expect(now.date).toBe('2026-06-21');
    expect(now.writtenAt).toBe('2026-11-04T18:00:00.000Z');
    expect(now.total).toBeCloseTo(169664.71, 6);
    expect(now.total).toBeCloseTo(now.statedTotal as number, 6);
    expect(valuesOn(record, 'rh', '2026-11-04')).toBeNull();          // nothing is written down under the day of the import
    expect(valuesOn(record, 'rh', '2026-06-21')!.total).toBeCloseTo(169664.71, 6);
  });

  test('a value nobody dated keeps a blank date, belongs to no day, and never stands in front of a dated one', () => {
    let record = addRows([], msftDay('2026-09-15', 450), '2026-09-15T17:00:00.000Z');
    record = addRows(record, msftDay(null, 470), '2026-09-27T17:00:00.000Z');
    const undated = record.filter((r) => r.writtenAt.startsWith('2026-09-27'));
    expect(undated.map((r) => r.date)).toEqual([null, null]);
    expect(placedOn(undated[0])).toBe('2026-09-27');
    expect(valuesNow(record, A)!.total).toBe(225000);                 // the dated Sept 15 values, 500 × $450
    expect(valuesOn(record, A, '2026-09-27')).toBeNull();              // not written down under the day it was saved
  });

  test('where no values are dated at all, the latest saved is the one read', () => {
    let record = addRows([], msftDay(null, 450), '2026-09-15T17:00:00.000Z');
    record = addRows(record, msftDay(null, 470), '2026-09-27T17:00:00.000Z');
    expect(valuesNow(record, A)!.total).toBe(235000);
  });

  test('a date that cannot be read is left blank and kept exactly as it was given', () => {
    const record = addRows([], [purchase('07/29/2026', 10, 100)], '2026-09-15T17:00:00.000Z');
    expect([record[0].date, record[0].dateAsGiven]).toEqual([null, '07/29/2026']);
  });

  test('an interest payment the broker sent with no date keeps a blank date; a dividend keeps its trade date and its settlement date', () => {
    const record = addRows([], [
      { accountId: A, holding: 'MSFT', kind: 'DIVIDEND', date: '2026-07-10', settlementDate: '2026-07-12', amount: 55, source: 'linked' },
      { accountId: A, holding: null, kind: 'INTEREST', date: null, amount: 4, source: 'linked' },
    ], '2026-07-20T15:00:00.000Z');
    expect(record.map((r) => [r.kind, r.date, r.settlementDate ?? null, r.amount])).toEqual([['DIVIDEND', '2026-07-10', '2026-07-12', 55], ['INTEREST', null, null, 4]]);
    expect(activityOf(record, A).map((r) => r.kind)).toEqual(['DIVIDEND', 'INTEREST']);   // the undated one after the dated
  });

  test('a day that does not exist is not a date', () => {
    expect([dayOrNull('2026-02-31'), dayOrNull('2026-07-18T06:00:00Z'), dayOrNull(''), dayOrNull(undefined)]).toEqual([null, '2026-07-18', null, null]);
  });

  test('a later update with an earlier date does not become today\'s value: values dated Jun 21 saved after values dated Nov 3', () => {
    let record = hisMicrosoftCase();
    record = addRows(record, msftDay('2026-06-21', 300), '2026-11-04T18:00:00.000Z');
    expect(valuesNow(record, A)!.date).toBe('2026-11-03');
    expect(valuesOn(record, A, '2026-06-21')!.total).toBe(150000);
  });

  test('two updates on one day: the later time-stamp is the one read', () => {
    let record = addRows([], msftDay('2026-11-03', 340), '2026-11-03T15:00:00.000Z');
    record = addRows(record, msftDay('2026-11-03', 342), '2026-11-03T21:00:00.000Z');
    expect(valuesNow(record, A)!.total).toBe(171000);
    expect(valueBatchesOf(record, A).length).toBe(2);   // and the earlier one is still there
  });
});

describe('what a person typed is never replaced', () => {
  // the broker sends only an average: 100 shares at $200, no date
  const first = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked'), '2026-07-20T15:00:00.000Z');

  test('a broker that sends only an average price gets one purchase row, marked as an average, with no date', () => {
    expect(first.map((r) => [r.kind, r.date, r.shares, r.price, r.averageOnly, r.source])).toEqual([['PURCHASE', null, 100, 200, true, 'linked']]);
  });

  // the person types the purchase date and the price paid
  const typed = correctRow(first, '1', { date: '2020-01-15', price: 180, amount: 18000, averageOnly: false }, 'typed', '2026-07-20T16:00:00.000Z').record;

  test('the typed date and price are what counts, and the broker\'s row is still in the record', () => {
    expect(typed.length).toBe(2);
    expect(typed[0]).toEqual(first[0]);
    expect(openPurchases(typed, A, 'VTI').map((p) => [p.date, p.shares, p.price, p.source])).toEqual([['2020-01-15', 100, 180, 'typed']]);
  });

  test('the next sync, sending the same average again, adds nothing — the typed date and price stand', () => {
    expect(purchasesToAdd(typed, A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked')).toEqual([]);
    expect(openPurchases(typed, A, 'VTI').map((p) => [p.date, p.price])).toEqual([['2020-01-15', 180]]);
  });

  test('a file imported again over the same account adds no purchase a second time, and typed dates stand', () => {
    const listed = [{ date: '2024-03-01', shares: 965, price: 1.74 }];
    let record = addRows([], purchasesToAdd([], 'rh', 'LCTX', listed, 'file'), '2026-11-04T18:00:00.000Z');
    record = correctRow(record, '1', { date: '2021-03-01' }, 'typed', '2026-11-05T09:00:00.000Z').record;
    expect(purchasesToAdd(record, 'rh', 'LCTX', listed, 'file')).toEqual([]);
    expect(openPurchases(record, 'rh', 'LCTX').map((p) => [p.date, p.shares, p.price])).toEqual([['2021-03-01', 965, 1.74]]);
  });

  test('the first list over a purchase the broker\'s history sent: the list is taken in, the history\'s purchase is kept to show — 600 shares, never 1,100', () => {
    const base = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    const answer = purchasesFromList(base, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }, { date: '2026-11-05', shares: 100, price: 400 }], 'linked', '2026-11-05');
    expect(answer.ask).toEqual([]);
    const r = addRows(base, answer.rows, '2026-11-05T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares])]).toEqual([600, [['2026-07-30', 500], ['2026-11-05', 100]]]);
  });

  test('a list taken in before, then a list that adds a tax lot dated after it: only that purchase is added', () => {
    const base = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    const added = purchasesToAdd(base, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }, { date: '2026-11-05', shares: 100, price: 400 }], 'linked', '2026-11-05');
    expect(added.map((r) => [r.date, r.shares, r.price])).toEqual([['2026-11-05', 100, 400]]);
  });

  test('an average sent beside dated purchases already on record changes nothing and is asked — the missing shares are never bought', () => {
    // 300 at $340 and 200 at $365 are on record; the broker's average says 600 shares: the app does not invent the other 100
    const base = addRows([], [purchase('2026-05-01', 300, 340), purchase('2026-06-01', 200, 365)], '2026-09-15T17:00:00.000Z');
    const answer = purchasesFromList(base, A, 'MSFT', [{ date: null, shares: 600, price: 355, average: true }], 'linked', '2026-09-16');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['count', 500, 600]]]);
  });

  test('a typed fact stands in front of a later linked one; a fact nobody typed takes the latest given', () => {
    let record = addRows([], [{ accountId: A, holding: 'CD', kind: 'FACT', date: null, source: 'file', facts: { face_value: 110000, coupon_rate: 0.0385 } }], '2026-11-04T18:00:00.000Z');
    record = addRows(record, [{ accountId: A, holding: 'CD', kind: 'FACT', date: null, source: 'typed', facts: { maturity_date: '2026-08-24', coupon_rate: 0.04 } }], '2026-11-05T09:00:00.000Z');
    record = addRows(record, [{ accountId: A, holding: 'CD', kind: 'FACT', date: null, source: 'linked', facts: { coupon_rate: 0.0385, face_value: 111000 } }], '2026-11-06T09:00:00.000Z');
    expect(factsOf(record, A, 'CD')).toEqual({ face_value: 111000, coupon_rate: 0.04, maturity_date: '2026-08-24' });
  });
});

describe('nothing is overwritten', () => {
  test('saving rows returns every earlier row unchanged, and never changes the record it was given', () => {
    const before = hisMicrosoftCase();
    const copy = JSON.parse(JSON.stringify(before));
    const after = addRows(before, msftDay('2026-11-04', 350), '2026-11-04T17:00:00.000Z');
    expect(before).toEqual(copy);
    expect(after.slice(0, before.length)).toEqual(copy);
    expect(after.length).toBe(before.length + 2);
  });

  test('a removed purchase stays in the record and counts no more', () => {
    const base = addRows([], [purchase('2026-07-30', 500, 350), purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    const after = removeRow(base, '2', 'typed', '2026-11-06T09:00:00.000Z').record;
    expect(after.length).toBe(3);
    expect(after.slice(0, 2)).toEqual(base);
    expect(openPurchases(after, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-07-30', 500]]);
  });

  test('a row number is never used twice, even after a correction', () => {
    let record = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    record = correctRow(record, '1', { price: 351 }, 'typed', '2026-09-16T09:00:00.000Z').record;
    record = addRows(record, msftDay('2026-09-16', 450), '2026-09-16T17:00:00.000Z');
    expect(record.map((r) => r.rowId)).toEqual(['1', '2', '3', '4']);
    expect(new Set(record.map((r) => r.rowId)).size).toBe(record.length);
  });
});

describe('a day filled in from the price feed never stands in front of a given value', () => {
  const feedDay = (date: string, price: number) => valueRows({ accountId: A, date, source: 'price-feed', cash: 0, holdings: [{ holding: 'MSFT', shares: 500, price, value: 500 * price }] });

  test('a day with no update is read from the price feed: Sept 16 at $455 is $227,500', () => {
    const record = addRows(hisMicrosoftCase(), feedDay('2026-09-16', 455), '2026-11-03T18:00:00.000Z');
    const day = valuesOn(record, A, '2026-09-16')!;
    expect([day.source, day.total]).toEqual(['price-feed', 227500]);
  });

  test('on a day the broker gave a value, the broker\'s is the one read, however late the price feed\'s row was saved', () => {
    const record = addRows(hisMicrosoftCase(), feedDay('2026-10-15', 480), '2026-11-03T18:00:00.000Z');
    const day = valuesOn(record, A, '2026-10-15')!;
    expect([day.source, day.total]).toEqual(['linked', 237500]);
  });

  test('a price-feed day later than the broker\'s last update is the latest date, so it is what the screens show: Nov 4 at $360 is $180,000', () => {
    const record = addRows(hisMicrosoftCase(), feedDay('2026-11-04', 360), '2026-11-04T18:00:00.000Z');
    const now = valuesNow(record, A)!;
    expect([now.date, now.source, now.total]).toEqual(['2026-11-04', 'price-feed', 180000]);
  });
});

describe('the purchases and sales on record are checked against the shares the broker states', () => {
  test('the broker now states 400 shares and no sale is on record: the holding is named, 100 short', () => {
    const record = addRows(hisMicrosoftCase(), msftDay('2026-11-04', 340, 400), '2026-11-04T17:00:00.000Z');
    expect(sharesThatDisagree(record, A)).toEqual([{ holding: 'MSFT', onRecord: 500, stated: 400, gap: -100 }]);
  });
});

// ── THE INDEPENDENT AUDIT OF 2026-11-10, ROUND 1 (5 critical, 10 high): each finding, held ──────────────────────────
describe('a correction is followed by whatever named the old row (audit round 1)', () => {
  /** 500 at $350 (row 1) and 100 at $400 (row 2), then 200 sold at $420 (row 3, naming row 1). */
  const sold = (): AssetRow[] => {
    let r = addRows([], [purchase('2026-07-30', 500, 350), purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    return r;
  };

  test('#1 a typed date on a purchase a sale names: the sale still sold it — 400 shares on record, the sale still made $14,000', () => {
    const c = correctRow(sold(), '1', { date: '2026-07-29' }, 'typed', '2026-11-11T09:00:00.000Z');
    expect(c.problem).toBeNull();
    expect(sharesOnRecord(c.record, A, 'MSFT')).toBe(400);
    expect(saleGain(c.record, '3')).toBe(14000);
    expect(openPurchases(c.record, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-29', 300, 350], ['2026-11-05', 100, 400]]);
  });

  test('#6 a sale corrected from 200 shares to 100 sells 100: 500 shares on record, and it made 100 × ($420 − $350) = $7,000', () => {
    const c = correctRow(sold(), '3', { shares: 100, amount: 42000 }, 'typed', '2026-11-11T09:00:00.000Z');
    expect(c.problem).toBeNull();
    expect(sharesOnRecord(c.record, A, 'MSFT')).toBe(500);
    expect(saleGain(c.record, '3')).toBe(7000);
  });

  test('#7 a sync does not replace a row the person typed: the change is refused and the typed row stands', () => {
    const typed = correctRow(sold(), '1', { date: '2020-01-15', price: 180 }, 'typed', '2026-11-11T09:00:00.000Z').record;
    const c = correctRow(typed, '1', { date: '2026-07-20', price: 200 }, 'linked', '2026-11-12T09:00:00.000Z');
    expect(c.problem).toMatch(/typed by the person/);
    expect(c.record).toEqual(typed);
    expect(rowAsItStands(c.record, '1')!.date).toBe('2020-01-15');
  });

  test('#8 a typed date the record cannot read is refused — the date on record is not blanked', () => {
    for (const bad of ['07/29/2026', '2026-1-5', '2026-02-31']) {
      const c = correctRow(sold(), '1', { date: bad }, 'typed', '2026-11-11T09:00:00.000Z');
      expect(c.problem).toMatch(/not a date/);
      expect(rowAsItStands(c.record, '1')!.date).toBe('2026-07-30');
    }
  });

  test('#20 a second correction naming the first row number corrects the row as it stands today; a row that never existed is refused', () => {
    const once = correctRow(sold(), '1', { price: 351 }, 'typed', '2026-11-11T09:00:00.000Z').record;
    const twice = correctRow(once, '1', { price: 352 }, 'typed', '2026-11-12T09:00:00.000Z');
    expect(twice.problem).toBeNull();
    expect(rowAsItStands(twice.record, '1')!.price).toBe(352);
    expect(twice.record.length).toBe(once.length + 1);
    expect(correctRow(sold(), '99', { price: 1 }, 'typed', '2026-11-11T09:00:00.000Z').problem).toMatch(/not in the record/);
  });

  test('#21 a purchase a sale names is not taken away: the removal is refused and the sale keeps its $14,000', () => {
    const c = removeRow(sold(), '1', 'typed', '2026-11-11T09:00:00.000Z');
    expect(c.problem).toMatch(/took shares from this purchase/);
    expect(saleGain(c.record, '3')).toBe(14000);
  });
});

describe('values saved together stay together (audit round 1)', () => {
  test('#2 correcting one row of a day\'s values keeps the rest of that day: MSFT corrected from $340 to $341 reads $170,500', () => {
    const record = addRows([], msftDay('2026-11-03', 340), '2026-11-03T17:00:00.000Z');
    const msft = record.find((r) => r.holding === 'MSFT')!;
    const c = correctRow(record, msft.rowId, { price: 341, amount: 170500 }, 'typed', '2026-11-04T09:00:00.000Z');
    const now = valuesNow(c.record, A)!;
    expect([now.total, now.holdings.length, now.date]).toEqual([170500, 1, '2026-11-03']);
    const own = record.find((r) => r.holding === null)!;
    const c2 = correctRow(record, own.rowId, { amount: 50 }, 'typed', '2026-11-04T09:00:00.000Z');
    expect([valuesNow(c2.record, A)!.total, valuesNow(c2.record, A)!.holdings.length]).toEqual([170050, 1]);
  });

  test('#5 the same values saved twice at the same instant are read once: $170,000, not $340,000', () => {
    const rows = msftDay('2026-11-03', 340);
    const record = addRows(addRows([], rows, '2026-11-03T17:00:00.000Z'), rows, '2026-11-03T17:00:00.000Z');
    const now = valuesNow(record, A)!;
    expect([now.total, now.holdings.length]).toEqual([170000, 1]);
  });

  test('two accounts saved in one instant are each read on their own', () => {
    const other = valueRows({ accountId: 'acct-2', date: '2026-11-03', source: 'linked', cash: 10, holdings: [{ holding: 'MSFT', shares: 1, price: 340, value: 340 }] });
    const record = addRows([], [...msftDay('2026-11-03', 340), ...other], '2026-11-03T17:00:00.000Z');
    expect(valuesNow(record, A)!.total).toBe(170000);
    expect(valuesNow(record, 'acct-2')!.total).toBe(350);
  });

  test('a holding sold in full is gone from today\'s values: the later save lists it no more', () => {
    let record = addRows([], valueRows({ accountId: A, date: '2026-11-03', source: 'linked', cash: 0, holdings: [
      { holding: 'MSFT', shares: 500, price: 340, value: 170000 }, { holding: 'AAPL', shares: 10, price: 200, value: 2000 }] }), '2026-11-03T15:00:00.000Z');
    record = addRows(record, valueRows({ accountId: A, date: '2026-11-03', source: 'linked', cash: 2000, holdings: [
      { holding: 'MSFT', shares: 500, price: 340, value: 170000 }] }), '2026-11-03T21:00:00.000Z');
    const now = valuesNow(record, A)!;
    expect(now.holdings.map((h) => h.holding)).toEqual(['MSFT']);
    expect(now.total).toBe(172000);
  });

  test('#16 time-stamps written in two time zones are read in their true order', () => {
    let record = addRows([], msftDay('2026-11-03', 340), '2026-11-03T01:00:00.000Z');
    record = addRows(record, msftDay('2026-11-03', 999), '2026-11-02T23:00:00.000-08:00');   // 07:00 the same day, six hours later
    expect(valuesNow(record, A)!.total).toBe(499500);
  });

  test('#18 an unknown is not $0: a holding with no value given makes the total unknown; cash nobody gave is unknown', () => {
    const record = addRows([], valueRows({ accountId: A, date: '2026-11-03', source: 'file', cash: 100, holdings: [{ holding: 'PRIV', shares: 10, price: null, value: null }] }), '2026-11-03T17:00:00.000Z');
    const now = valuesNow(record, A)!;
    expect([now.total, now.holdings[0].value, now.cash]).toEqual([null, null, 100]);
    const noCash = addRows([], valueRows({ accountId: A, date: '2026-11-03', source: 'file', holdings: [] }), '2026-11-03T17:00:00.000Z');
    expect([valuesNow(noCash, A)!.cash, valuesNow(noCash, A)!.total]).toEqual([null, null]);
  });

  test('#24 the broker\'s stated total is checked against the rows: his file\'s option written at $14.08 leaves a gap of $1,393.43', () => {
    // $7,096.82 + $109,992.74 + $1,167.65 + $14.075 + $50,000 = $168,271.285; the file says $169,664.71
    const record = addRows([], valueRows({ accountId: 'rh', date: '2026-06-21', source: 'file', cash: 7096.82, statedTotal: 169664.71, holdings: [
      { holding: 'CD', shares: 110000, price: 99.9934, value: 109992.74 }, { holding: 'LCTX', shares: 965, price: 1.21, value: 1167.65 },
      { holding: 'PUT', shares: 1, price: 14.075, value: 14.075 }, { holding: 'VMFXX', shares: 50000, price: 1, value: 50000 }] }), '2026-11-04T18:00:00.000Z');
    expect(statedTotalGap(valuesNow(record, 'rh')!)).toBeCloseTo(1393.425, 6);
  });
});

describe('a broker\'s list of purchases never buys the same shares twice (audit round 1)', () => {
  const afterSale = (): AssetRow[] => {
    let r = addRows([], [purchase('2026-07-30', 500, 350), purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    return r;
  };

  test('#3 after a sale of 200, the broker lists Jul 30 at its remaining 300 and Nov 5 at 100: nothing is added, 400 on record', () => {
    const r = afterSale();
    expect(purchasesToAdd(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }, { date: '2026-11-05', shares: 100, price: 400 }], 'linked')).toEqual([]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(400);
  });

  test('HIS RULE: a tax lot that shrinks with no sale on record changes nothing — the account holder is asked; when the sale arrives it explains the difference', () => {
    // 500 on record (Jul 30); on Nov 12 the broker's tax lot says 300 and no sale is on record
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-12');
    expect(answer.rows).toEqual([]);
    expect(answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])).toEqual([['not-listed', 500, 300]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);                        // nothing is removed without a transaction
    // the sale of 200, dated Nov 10, arrives on Nov 13: it explains the 200, and it made 200 × ($420 − $350) = $14,000
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-13T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, '2')]).toEqual([300, 14000]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-14')).toEqual({ rows: [], ask: [] });
  });

  test('HIS RULE: the account holder answers "the broker is correct" — the 500 become 300; or "mine is correct" — 500 stay and the question is not asked again', () => {
    const r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    const listed = [{ date: '2026-07-30', shares: 300, price: 350 }];
    const [q] = purchasesFromList(r, A, 'MSFT', listed, 'linked', '2026-11-12').ask;
    const yes = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-12'), '2026-11-12T18:00:00.000Z');
    expect(openPurchases(yes, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 300, 350]]);
    expect(yes.slice(0, r.length)).toEqual(r);                             // the 500 stay in the history
    const no = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-11-12'), '2026-11-12T18:00:00.000Z');
    expect(sharesOnRecord(no, A, 'MSFT')).toBe(500);
    expect(purchasesFromList(no, A, 'MSFT', listed, 'linked', '2026-11-13').ask).toEqual([]);
    expect(purchasesFromList(no, A, 'MSFT', [{ date: '2026-07-30', shares: 250, price: 350 }], 'linked', '2026-11-14').ask.length).toBe(1);   // a new difference is asked
  });

  test('#4 an average one day, dated purchases the next: the dated ones stand in for the average — 100 shares, not 200', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked'), '2026-07-20T15:00:00.000Z');
    r = addRows(r, purchasesToAdd(r, A, 'VTI', [{ date: '2025-01-10', shares: 60, price: 190 }, { date: '2025-06-10', shares: 40, price: 215 }], 'linked'), '2026-07-21T15:00:00.000Z');
    expect(sharesOnRecord(r, A, 'VTI')).toBe(100);
    expect(openPurchases(r, A, 'VTI').map((p) => [p.date, p.shares, p.price, p.averageOnly])).toEqual([['2025-01-10', 60, 190, false], ['2025-06-10', 40, 215, false]]);
    expect(r.length).toBe(4);   // the average row and its removal are both still in the record
  });

  test('dated purchases arriving after the account holder typed over the average add nothing — the typed purchase stands and the account holder is asked', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked'), '2026-07-20T15:00:00.000Z');
    r = correctRow(r, '1', { date: '2020-01-15', price: 180, averageOnly: false }, 'typed', '2026-07-20T16:00:00.000Z').record;
    const answer = purchasesFromList(r, A, 'VTI', [{ date: '2025-01-10', shares: 60, price: 190 }, { date: '2025-06-10', shares: 40, price: 215 }], 'linked', '2026-07-21');
    expect([answer.rows, answer.ask.map((q) => q.kind)]).toEqual([[], ['typed']]);
    expect(openPurchases(r, A, 'VTI').map((p) => [p.date, p.shares, p.price])).toEqual([['2020-01-15', 100, 180]]);
  });

  test('dated purchases one day, only an average the next: nothing is added', () => {
    const r = addRows([], [purchase('2025-01-10', 60, 190), purchase('2025-06-10', 40, 215)], '2026-07-20T15:00:00.000Z');
    // no purchase is added; the broker's average is only kept as what it stated
    expect(purchasesToAdd(r, A, 'MSFT', [{ date: null, shares: 100, price: 200, average: true }], 'linked').filter((x) => x.kind === 'PURCHASE')).toEqual([]);
  });

  test('#11 a two-for-one split is not a purchase: 500 at $350 on record, the broker\'s average now says 1,000 at $175 — nothing is bought, and the account holder is asked', () => {
    const r = addRows(addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z'), msftDay('2026-11-12', 175, 1000), '2026-11-12T17:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: null, shares: 1000, price: 175, average: true }], 'linked', '2026-11-12');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['count', 500, 1000]]]);
    expect(sharesThatDisagree(r, A)).toEqual([{ holding: 'MSFT', onRecord: 500, stated: 1000, gap: 500 }]);
  });

  test('a split on record doubles the shares and halves the price of every purchase before it; a sale after it is measured against the halved price', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-11-11', ratio: 2, source: 'linked' }], '2026-11-11T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 1000, 175]]);
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-12', shares: 200, price: 215, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    expect(saleGain(r, r[r.length - 1].rowId)).toBe(8000);   // 200 × ($215 − $175)
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(800);
  });
});

describe('sales the record cannot cover, sent twice, or dated before the purchase (audit round 1)', () => {
  const base = () => addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');

  test('#13 a sale of 600 where 500 are on record: the 100 no purchase accounts for are named, and what the sale made is not known', () => {
    let r = base();
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 600, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    const sale = r[r.length - 1];
    expect(soldFrom(r, sale.rowId)).toEqual([{ rowId: '1', shares: 500 }]);
    expect(soldBeyondRecord(r, A, 'MSFT')).toEqual([{ rowId: sale.rowId, shares: 100 }]);
    expect(saleGain(r, sale.rowId)).toBeNull();
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(0);
  });

  test('#23 a sale naming 600 shares of a 500-share purchase: 100 are named as beyond the record', () => {
    const r = addRows(base(), [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 600, price: 420, source: 'linked', sells: [{ rowId: '1', shares: 600 }] })], '2026-11-10T17:00:00.000Z');
    expect(soldBeyondRecord(r, A, 'MSFT')).toEqual([{ rowId: '2', shares: 100 }]);
    expect(saleGain(r, '2')).toBeNull();
  });

  test('#14 the same sale sent twice, under the broker\'s own key, is saved once: 300 shares on record, not 100', () => {
    let r = base();
    const sale = () => saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 'broker-key-77' });
    r = addRows(r, rowsNotYetSaved(r, [sale()]), '2026-11-10T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [sale()]), '2026-11-11T17:00:00.000Z');
    expect(r.filter((x) => x.kind === 'SALE').length).toBe(1);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(300);
  });

  test('#19 a sale does not sell a purchase made after it: a sale dated Jul 1 finds nothing to sell in a purchase of Jul 30', () => {
    const r = addRows(base(), [saleRow({ accountId: A, holding: 'MSFT', date: '2026-07-01', shares: 100, price: 300, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    expect(soldFrom(r, '2')).toEqual([]);
    expect(soldBeyondRecord(r, A, 'MSFT')).toEqual([{ rowId: '2', shares: 100 }]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
  });

  test('HIS RULING: a sale that could have sold a purchase with no date — the person is asked which tax lot was sold; until then what it made is not known', () => {
    // 100 held with no purchase date (an average of $50), 100 bought Nov 5 at $400; 100 sold Nov 10 at $420
    let r = addRows([], [purchase(null, 100, 50, { averageOnly: true })], '2020-03-01T12:00:00.000Z');
    r = addRows(r, [purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    expect(r[2].date).toBe('2026-11-10');                                  // the sale is saved on its own sale date
    expect(saleGain(r, '3')).toBeNull();
    expect(soldFrom(r, '3')).toEqual([]);
    const asked = salesNeedingAnAnswer(r, A);
    expect(asked.map((q) => [q.rowId, q.holding, q.shares, q.choices.map((c) => [c.rowId, c.date, c.shares])])).toEqual([['3', 'MSFT', 100, [['1', null, 100], ['2', '2026-11-05', 100]]]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(100);                        // the 100 sold are counted as sold
    // the person answers: the Nov 5 purchase — 100 × ($420 − $400) = $2,000
    const nov5 = correctRow(r, '3', { sells: [{ rowId: '2', shares: 100 }] }, 'typed', '2026-11-11T09:00:00.000Z').record;
    expect([saleGain(nov5, '3'), salesNeedingAnAnswer(nov5, A).length]).toEqual([2000, 0]);
    expect(openPurchases(nov5, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([[null, 100]]);
    // or: the undated one — 100 × ($420 − $50) = $37,000
    const undated = correctRow(r, '3', { sells: [{ rowId: '1', shares: 100 }] }, 'typed', '2026-11-11T09:00:00.000Z').record;
    expect(saleGain(undated, '3')).toBe(37000);
  });

  test('HIS RULING: where every purchase has a date the oldest is sold first and nobody is asked; a holding with one purchase needs no question', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350), purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    expect([saleGain(r, '3'), salesNeedingAnAnswer(r, A).length]).toEqual([14000, 0]);
    let one = addRows([], [purchase(null, 100, 50, { averageOnly: true })], '2020-03-01T12:00:00.000Z');
    one = addRows(one, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 40, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    expect([saleGain(one, '2'), salesNeedingAnAnswer(one, A).length, sharesOnRecord(one, A, 'MSFT')]).toEqual([14800, 0, 60]);   // 40 × ($420 − $50)
  });

  test('fractional shares: 0.3 sold from 0.1 + 0.2 leaves nothing on record', () => {
    let r = addRows([], [purchase('2026-01-01', 0.1, 100), purchase('2026-02-01', 0.2, 100)], '2026-03-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-03-02', shares: 0.3, price: 110, source: 'linked' })], '2026-03-02T12:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT')).toEqual([]);
    expect(soldBeyondRecord(r, A, 'MSFT')).toEqual([]);
  });
});

describe('#9 a holding the latest values no longer list is named (audit round 1)', () => {
  test('500 MSFT on record, the broker\'s latest values list no MSFT and no sale is on record: named, stated at 0', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, valueRows({ accountId: A, date: '2026-11-12', source: 'linked', cash: 215000, holdings: [] }), '2026-11-12T17:00:00.000Z');
    expect(sharesThatDisagree(r, A)).toEqual([{ holding: 'MSFT', onRecord: 500, stated: 0, gap: -500 }]);
  });
});

describe('#15 shares moved to another account carry their purchases with them (audit round 1)', () => {
  test('all 500 MSFT moved: the first account holds none; the second holds 500 bought Jul 30 at $350', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 500, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(0);
    expect(openPurchases(r, 'acct-2', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 500, 350]]);
    expect(soldBeyondRecord(r, A, 'MSFT')).toEqual([]);
  });

  test('200 of two purchases moved: the oldest goes first, and each keeps its own date and price', () => {
    let r = addRows([], [purchase('2026-07-30', 150, 350), purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 200, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-11-05', 50, 400]]);
    expect(openPurchases(r, 'acct-2', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 150, 350], ['2026-11-05', 50, 400]]);
  });
});

describe('#17 a row number is never reused (audit round 1)', () => {
  test('numbering runs on from the highest number in the record, and never below the count of rows', () => {
    const r = addRows([], [purchase('2026-07-30', 500, 350), purchase('2026-11-05', 100, 400), purchase('2026-11-06', 1, 1)], '2026-11-06T17:00:00.000Z');
    expect(addRows([r[0], r[2]], [purchase('2026-11-07', 1, 1)], '2026-11-07T17:00:00.000Z').map((x) => x.rowId)).toEqual(['1', '3', '4']);
  });
});

// ── THE INDEPENDENT AUDIT OF 2026-11-10, ROUND 2 (5 critical, 8 high): each finding, held ───────────────────────────
describe('shares moved between accounts are one row (audit round 2)', () => {
  const moved = (shares = 500): AssetRow[] => {
    const r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    return addRows(r, rowsNotYetSaved(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares, source: 'linked', ref: 'k1' })]), '2026-11-12T17:00:00.000Z');
  };

  test('#1 the same transfer sent twice is saved once: the second account holds 500, not 1,000', () => {
    let r = moved();
    r = addRows(r, rowsNotYetSaved(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 500, source: 'linked', ref: 'k1' })]), '2026-11-13T17:00:00.000Z');
    expect(sharesOnRecord(r, 'acct-2', 'MSFT')).toBe(500);
    expect(r.length).toBe(2);
  });

  test('#2 a split before the move is counted once: 500 at $350, two-for-one on Aug 1 in both accounts, 1,000 moved — 1,000 at $175', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-07-30T17:00:00.000Z');
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-08-01', ratio: 2, source: 'linked' },
      { accountId: 'acct-2', holding: 'MSFT', kind: 'SPLIT', date: '2026-08-01', ratio: 2, source: 'linked' }], '2026-08-01T17:00:00.000Z');
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 1000, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    expect(openPurchases(r, 'acct-2', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 1000, 175]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(0);
  });

  test('#5 a transfer corrected from 500 shares to 200: 300 stay, 200 arrive', () => {
    const c = correctRow(moved(), '2', { shares: 200 }, 'typed', '2026-11-13T09:00:00.000Z');
    expect(c.problem).toBeNull();
    expect([sharesOnRecord(c.record, A, 'MSFT'), sharesOnRecord(c.record, 'acct-2', 'MSFT')]).toEqual([300, 200]);
  });

  test('#13 a purchase the person typed stays theirs after it is moved: a sync\'s change to it is refused', () => {
    let r = correctRow(addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z'), '1', { date: '2020-01-15', price: 180 }, 'typed', '2026-09-16T09:00:00.000Z').record;
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 500, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    const there = openPurchases(r, 'acct-2', 'MSFT');
    expect(there.map((p) => [p.date, p.shares, p.price, p.source])).toEqual([['2020-01-15', 500, 180, 'typed']]);
    expect(correctRow(r, there[0].rowId, { date: '2026-01-01', price: 1 }, 'linked', '2026-11-13T09:00:00.000Z').problem).toMatch(/typed by the person/);
  });

  test('#21 a purchase with no date, moved to an account that also holds a dated purchase: a sale there asks the person', () => {
    let r = addRows([], [purchase(null, 100, 50, { averageOnly: true })], '2020-03-01T12:00:00.000Z');
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 100, source: 'linked' }),
      { ...purchase('2026-01-10', 100, 400), accountId: 'acct-2' }], '2026-11-12T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: 'acct-2', holding: 'MSFT', date: '2026-11-20', shares: 100, price: 420, source: 'linked' })], '2026-11-20T17:00:00.000Z');
    expect(saleGain(r, r[r.length - 1].rowId)).toBeNull();
    expect(salesNeedingAnAnswer(r, 'acct-2').map((q) => q.shares)).toEqual([100]);
  });

  test('shares that arrive from outside the record are held with no purchase date and no price; shares sent outside leave', () => {
    let r = addRows([], [{ accountId: A, holding: 'MSFT', kind: 'TRANSFER', date: '2026-11-12', shares: 50, arrives: true, source: 'linked' }], '2026-11-12T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([[null, 50, null]]);
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'TRANSFER', date: '2026-11-13', shares: 20, source: 'linked' }], '2026-11-13T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(30);
  });
});

describe('values (audit round 2)', () => {
  test('#3 the same values handed over twice in one save are read once: $170,000', () => {
    const record = addRows([], [...msftDay('2026-11-03', 340), ...msftDay('2026-11-03', 340)], '2026-11-03T17:00:00.000Z');
    const now = valuesNow(record, A)!;
    expect([now.total, now.holdings.length]).toEqual([170000, 1]);
  });

  test('#6 a value the person typed for an account with nothing listed inside it: $250,000', () => {
    const record = addRows([], valueRows({ accountId: 'house', date: '2026-10-01', source: 'typed', typedValue: 250000 }), '2026-10-05T12:00:00.000Z');
    expect([valuesNow(record, 'house')!.total, valuesNow(record, 'house')!.date]).toEqual([250000, '2026-10-01']);
  });

  test('#11 the shares are checked against what the broker last stated, not against a price-feed day', () => {
    let r = addRows(hisMicrosoftCase(), msftDay('2026-11-04', 340, 400), '2026-11-04T17:00:00.000Z');
    r = addRows(r, valueRows({ accountId: A, date: '2026-11-05', source: 'price-feed', cash: 0, holdings: [{ holding: 'MSFT', shares: 500, price: 350, value: 175000 }] }), '2026-11-05T17:00:00.000Z');
    expect(valuesLastGiven(r, A)!.date).toBe('2026-11-04');
    expect(sharesThatDisagree(r, A)).toEqual([{ holding: 'MSFT', onRecord: 500, stated: 400, gap: -100 }]);
  });

  test('#18 a holding listed twice is added up, and "msft" is MSFT', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350, { holding: 'msft' })], '2026-09-15T17:00:00.000Z');
    r = addRows(r, valueRows({ accountId: A, date: '2026-11-03', source: 'linked', cash: 0, holdings: [
      { holding: 'MSFT', shares: 300, price: 340, value: 102000 }, { holding: 'MSFT', shares: 200, price: 340, value: 68000 }] }), '2026-11-03T17:00:00.000Z');
    expect(sharesThatDisagree(r, A)).toEqual([]);
    expect(sharesOnRecord(r, A, 'Msft')).toBe(500);
  });

  test('two saves at one time-stamp: the one saved later is read', () => {
    const record = addRows(addRows([], msftDay('2026-11-03', 340), '2026-11-03T17:00:00.000Z'), msftDay('2026-11-03', 342), '2026-11-03T17:00:00.000Z');
    expect(valuesNow(record, A)!.total).toBe(171000);
  });

  test('a new date on one row of a day\'s values is refused', () => {
    const record = addRows([], msftDay('2026-11-03', 340), '2026-11-03T17:00:00.000Z');
    expect(correctRow(record, '2', { date: '2026-11-04' }, 'typed', '2026-11-04T09:00:00.000Z').problem).toMatch(/not moved to another day/);
  });
});

describe('sales are read afresh in their true order (audit round 2)', () => {
  test('#8 an older purchase that arrives late is the one sold: Nov 5 lot and a sale on record, then the Jul 30 lot arrives — the sale made 100 × ($420 − $350) = $7,000', () => {
    let r = addRows([], [purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    expect(saleGain(r, '2')).toBe(2000);
    r = addRows(r, [purchase('2026-07-30', 500, 350)], '2026-11-11T17:00:00.000Z');
    expect(saleGain(r, '2')).toBe(7000);
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-07-30', 400], ['2026-11-05', 100]]);
  });

  test('#8 a sale saved before its purchase: once the purchase arrives the sale has its gain', () => {
    let r = addRows([], [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    expect(saleGain(r, '1')).toBeNull();
    r = addRows(r, [purchase('2026-07-30', 500, 350)], '2026-11-11T17:00:00.000Z');
    expect([saleGain(r, '1'), sharesOnRecord(r, A, 'MSFT')]).toEqual([14000, 300]);
  });

  test('#8 a Nov 10 sale that arrives after a Nov 12 sale still sells the older purchase', () => {
    let r = addRows([], [purchase('2026-07-30', 100, 350), purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-12', shares: 100, price: 430, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'linked' })], '2026-11-13T17:00:00.000Z');
    expect([saleGain(r, '4'), saleGain(r, '3')]).toEqual([7000, 3000]);   // 100 × (420 − 350); 100 × (430 − 400)
  });

  test('#9 a new date typed on a sale keeps the purchase the broker named: still the Nov 5 lot, $2,000', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350), purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'linked', sells: [{ rowId: '2', shares: 100 }] })], '2026-11-10T17:00:00.000Z');
    const c = correctRow(r, '3', { date: '2026-11-11' }, 'typed', '2026-11-12T09:00:00.000Z');
    expect([saleGain(c.record, '3'), sharesOnRecord(c.record, A, 'MSFT')]).toEqual([2000, 500]);
  });

  test('#14 a sale of 200 that names 300 shares sells 200: $14,000, and 300 are left', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', sells: [{ rowId: '1', shares: 300 }] })], '2026-11-10T17:00:00.000Z');
    expect([saleGain(r, '2'), sharesOnRecord(r, A, 'MSFT')]).toEqual([14000, 300]);
  });

  test('#19 a file imported twice adds its sale once; two sales alike in one file are both kept', () => {
    const sale = (): NewRow => saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'file' });
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [sale(), sale()]), '2026-11-11T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [sale(), sale()]), '2026-11-12T17:00:00.000Z');
    expect(inForce(r).filter((x) => x.kind === 'SALE').length).toBe(2);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(300);
  });
});

describe('a broker\'s list of what is held now (audit round 2)', () => {
  test('#4 an average partly sold, then dated purchases arrive for what is left: the sale keeps its $2,000 and 60 shares are left', () => {
    // 100 at an average of $200, listed Jul 20; 40 sold at $250 on Aug 1 (40 × $50 = $2,000); on Sept 1 the broker lists 20 and 40
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked', '2026-07-20'), '2026-07-20T15:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'VTI', date: '2026-08-01', shares: 40, price: 250, source: 'linked' })], '2026-08-01T15:00:00.000Z');
    expect(saleGain(r, '2')).toBe(2000);
    r = addRows(r, purchasesToAdd(r, A, 'VTI', [{ date: '2025-01-10', shares: 20, price: 190 }, { date: '2025-06-10', shares: 40, price: 215 }], 'linked', '2026-09-01'), '2026-09-01T15:00:00.000Z');
    expect(saleGain(r, '2')).toBe(2000);
    expect(soldBeyondRecord(r, A, 'VTI')).toEqual([]);
    expect(openPurchases(r, A, 'VTI').map((p) => [p.date, p.shares, p.price])).toEqual([['2025-01-10', 20, 190], ['2025-06-10', 40, 215]]);
  });

  test('a sale made before the broker\'s list takes nothing from the listed tax lot: listed Nov 20 at 300 (Jul 30 @ $350), a Nov 10 sale of 200 leaves 300 — the list is net of it, so it sold from that lot, oldest first: 200 × ($420 − $350) = $14,000', () => {
    let r = addRows([], [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-20T15:00:00.000Z');
    r = addRows(r, purchasesToAdd(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-20'), '2026-11-20T15:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), soldBeyondRecord(r, A, 'MSFT'), saleGain(r, '1')]).toEqual([300, [], 14000]);
    // the activity adds up: the Jul 30 purchase shows as 500 bought, the sale 200
    expect(activityOf(r, A).map((x) => [x.kind, x.date, x.shares])).toEqual([['PURCHASE', '2026-07-30', 500], ['SALE', '2026-11-10', 200]]);
  });

  test('#7 a purchase with no date, from his file dated Jun 21 and imported Nov 4, can be sold by a Jul 15 sale: 60 left', () => {
    let r = addRows([], purchasesToAdd([], 'rh', 'LCTX', [{ date: null, shares: 100, price: 1.74, average: true }], 'file', '2026-06-21'), '2026-11-04T18:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: 'rh', holding: 'LCTX', date: '2026-07-15', shares: 40, price: 2, source: 'file' })], '2026-11-04T18:00:00.000Z');
    expect(sharesOnRecord(r, 'rh', 'LCTX')).toBe(60);
    expect(saleGain(r, '2')).toBeCloseTo(40 * (2 - 1.74), 9);
  });

  test('HIS RULING: the broker lists three tax lots where the account holder typed one purchase of 100 — the typed purchase is kept and the account holder is asked; on "the broker is correct" the tax lots take its place', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked', '2026-07-20'), '2026-07-20T15:00:00.000Z');
    r = correctRow(r, '1', { date: '2020-01-15', price: 180, averageOnly: false }, 'typed', '2026-07-20T16:00:00.000Z').record;
    const listed = [{ date: '2025-01-10', shares: 50, price: 190 }, { date: '2025-06-10', shares: 50, price: 215 }, { date: '2026-08-01', shares: 50, price: 230 }];
    const answer = purchasesFromList(r, A, 'VTI', listed, 'linked', '2026-08-02');
    expect(answer.rows).toEqual([]);
    expect(answer.ask.map((q) => [q.kind, q.onRecord.map((t) => [t.date, t.shares, t.price]), q.sharesListed])).toEqual([['typed', [['2020-01-15', 100, 180]], 150]]);
    expect(sharesOnRecord(r, A, 'VTI')).toBe(100);                         // nothing changed without the account holder
    const yes = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-08-02'), '2026-08-03T09:00:00.000Z');
    expect(openPurchases(yes, A, 'VTI').map((p) => [p.date, p.shares, p.price])).toEqual([['2025-01-10', 50, 190], ['2025-06-10', 50, 215], ['2026-08-01', 50, 230]]);
    expect(sharesOnRecord(yes, A, 'VTI')).toBe(150);                       // 150, as the broker states — never 250
    expect(yes.slice(0, r.length)).toEqual(r);                             // and the typed purchase is still in the record
  });

  test('HIS RULING: three tax lots of 50 take the place of one purchase of 100 the broker itself gave — 150 shares, never 250', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked', '2026-07-20'), '2026-07-20T15:00:00.000Z');
    const listed = [{ date: '2025-01-10', shares: 50, price: 190 }, { date: '2025-06-10', shares: 50, price: 215 }, { date: '2026-08-01', shares: 50, price: 230 }];
    r = addRows(r, purchasesToAdd(r, A, 'VTI', listed, 'linked', '2026-08-02'), '2026-08-02T15:00:00.000Z');
    expect(sharesOnRecord(r, A, 'VTI')).toBe(150);
    expect(openPurchases(r, A, 'VTI').map((p) => [p.date, p.shares])).toEqual([['2025-01-10', 50], ['2025-06-10', 50], ['2026-08-01', 50]]);
    expect(r.length).toBe(5);                                              // the 100, its removal, and three tax lots
    expect(purchasesToAdd(r, A, 'VTI', listed, 'linked', '2026-08-03')).toEqual([]);   // the same list again changes nothing
  });

  test('three listed tax lots against one purchase the account holder typed: none is added, and the account holder is asked with all three', () => {
    const r = correctRow(addRows([], [purchase(null, 100, 200, { averageOnly: true, holding: 'VTI' })], '2026-07-20T15:00:00.000Z'), '1', { date: '2020-01-15', averageOnly: false }, 'typed', '2026-07-20T16:00:00.000Z').record;
    const listed = [{ date: '2025-01-10', shares: 50, price: 190 }, { date: '2025-06-10', shares: 50, price: 215 }, { date: '2026-08-01', shares: 50, price: 230 }];
    const answer = purchasesFromList(r, A, 'VTI', listed, 'linked', '2026-08-02');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.listed.length])]).toEqual([[], [['typed', 3]]]);
  });

  test('#12 a listed purchase whose date cannot be read is kept as its own purchase, with the date as it was given', () => {
    const r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '07/30/2026', shares: 500, price: 350 }], 'file', '2026-11-04'), '2026-11-04T18:00:00.000Z');
    expect([r[0].date, r[0].dateAsGiven, r[0].averageOnly ?? false, r[0].shares]).toEqual([null, '07/30/2026', false, 500]);
    expect(purchasesToAdd(r, A, 'MSFT', [{ date: '07/30/2026', shares: 500, price: 350 }], 'file', '2026-11-05')).toEqual([]);
  });

  test('#15 a correction that leaves the date alone keeps the date as it was given', () => {
    const r = addRows([], [purchase('07/29/2026', 10, 100)], '2026-09-15T17:00:00.000Z');
    const c = correctRow(r, '1', { price: 101 }, 'typed', '2026-09-16T09:00:00.000Z');
    expect(rowAsItStands(c.record, '1')!.dateAsGiven).toBe('07/29/2026');
    const s2 = addRows([], [{ ...purchase('2026-07-30', 1, 1), settlementDate: '07/31/2026' }], '2026-09-15T17:00:00.000Z');
    expect([s2[0].settlementDate, s2[0].settlementDateAsGiven]).toEqual([null, '07/31/2026']);
  });

  test('#16 two purchases listed with no date stay two purchases: 60 at $190 and 40 at $215, not 100 at $200', () => {
    const added = purchasesToAdd([], A, 'VTI', [{ date: null, shares: 60, price: 190 }, { date: null, shares: 40, price: 215 }], 'file', '2026-06-21');
    expect(added.map((x) => [x.date, x.shares, x.price, x.averageOnly ?? false])).toEqual([[null, 60, 190, false], [null, 40, 215, false]]);
    const r = addRows([], added, '2026-11-04T18:00:00.000Z');
    expect(purchasesToAdd(r, A, 'VTI', [{ date: null, shares: 60, price: 190 }, { date: null, shares: 40, price: 215 }], 'file', '2026-06-21')).toEqual([]);
  });

  test('#17 a broker\'s average that grows beside a purchase the account holder typed changes nothing — no price is invented; the account holder is asked', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked', '2026-07-20'), '2026-07-20T15:00:00.000Z');
    r = correctRow(r, '1', { date: '2020-01-15', price: 180, averageOnly: false }, 'typed', '2026-07-20T16:00:00.000Z').record;
    const answer = purchasesFromList(r, A, 'VTI', [{ date: null, shares: 150, price: 210, average: true }], 'linked', '2026-08-02');
    expect(answer.rows).toEqual([]);
    expect(answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])).toEqual([['count', 100, 150]]);
  });

  test('#22 a row that names a typed row to replace, saved straight into the record by a sync, stops', () => {
    const r = correctRow(addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z'), '1', { price: 351 }, 'typed', '2026-09-16T09:00:00.000Z').record;
    expect(() => addRows(r, [{ ...purchase('2026-07-30', 500, 1), replacesRowId: '2' }], '2026-09-17T09:00:00.000Z')).toThrow(/typed by the person/);
    expect(() => addRows(r, [{ ...purchase('2026-07-30', 500, 1), replacesRowId: '1' }], '2026-09-17T09:00:00.000Z')).toThrow(/does not stand/);
  });
});

describe('every kind of row is kept and listed (audit round 2)', () => {
  test('a deposit, a withdrawal, a fee, a dividend, an interest payment and a word the app does not know are each one row of activity', () => {
    const rows: NewRow[] = [
      { accountId: A, holding: null, kind: 'DEPOSIT', date: '2026-08-01', amount: 5000, source: 'linked' },
      { accountId: A, holding: null, kind: 'WITHDRAWAL', date: '2026-08-02', amount: 1200, source: 'linked' },
      { accountId: A, holding: null, kind: 'FEE', date: '2026-08-03', amount: 4.95, source: 'linked' },
      { accountId: A, holding: 'MSFT', kind: 'DIVIDEND', date: '2026-08-04', amount: 55, source: 'linked' },
      { accountId: A, holding: null, kind: 'INTEREST', date: '2026-08-05', amount: 35.17, source: 'linked' },
      { accountId: A, holding: null, kind: 'OTHER', date: '2026-08-06', amount: 9, word: 'Sweep out', source: 'linked' },
    ];
    const r = addRows(hisMicrosoftCase(), rows, '2026-08-07T12:00:00.000Z');
    expect(activityOf(r, A).map((x) => [x.kind, x.date, x.amount])).toEqual([
      ['PURCHASE', '2026-07-30', 175000], ['DEPOSIT', '2026-08-01', 5000], ['WITHDRAWAL', '2026-08-02', 1200], ['FEE', '2026-08-03', 4.95],
      ['DIVIDEND', '2026-08-04', 55], ['INTEREST', '2026-08-05', 35.17], ['OTHER', '2026-08-06', 9]]);
    expect(valuesNow(r, A)!.total).toBe(170000);   // activity changes no value row
  });

  test('two splits: 100 at $400, two-for-one then three-for-one — 600 shares at $66.67 (400 ÷ 6)', () => {
    let r = addRows([], [purchase('2026-01-10', 100, 400)], '2026-01-10T12:00:00.000Z');
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-03-01', ratio: 2, source: 'linked' },
      { accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-06-01', ratio: 3, source: 'linked' }], '2026-06-01T12:00:00.000Z');
    const [p] = openPurchases(r, A, 'MSFT');
    expect(p.shares).toBe(600);
    expect(p.price as number).toBeCloseTo(400 / 6, 12);
  });

  test('a linked blank does not erase a fact a file gave', () => {
    let r = addRows([], [{ accountId: A, holding: 'CD', kind: 'FACT', date: null, source: 'file', facts: { maturity_date: '2026-08-24' } }], '2026-11-04T18:00:00.000Z');
    r = addRows(r, [{ accountId: A, holding: 'CD', kind: 'FACT', date: null, source: 'linked', facts: { maturity_date: null } }], '2026-11-05T18:00:00.000Z');
    expect(factsOf(r, A, 'CD')).toEqual({ maturity_date: '2026-08-24' });
  });
});

// ── THE INDEPENDENT AUDIT OF 2026-11-10, ROUND 3 (2 critical, 5 high): each finding, held ───────────────────────────
describe('splits and a broker\'s list (audit round 3)', () => {
  test('#1 a tax lot a file lists after a split is not split again: 200 at $175 bought 2020-01-10, listed Nov 4, 2026, with a 2024 two-for-one on record — 200 at $175', () => {
    let r = addRows([], [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2024-06-01', ratio: 2, source: 'file' }], '2026-11-04T18:00:00.000Z');
    r = addRows(r, purchasesToAdd(r, A, 'MSFT', [{ date: '2020-01-10', shares: 200, price: 175 }], 'file', '2026-11-04'), '2026-11-04T18:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2020-01-10', 200, 175]]);
  });

  test('#2 a broker\'s average that changes with no transaction behind it (100 at $100 becomes 300 at $33.34) changes nothing and is asked — no purchase at $0.01 is invented; on "the broker is correct" it is 300 at $33.34', () => {
    const r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 100, average: true }], 'linked', '2026-07-20'), '2026-07-20T15:00:00.000Z');
    const answer = purchasesFromList(r, A, 'VTI', [{ date: null, shares: 300, price: 33.34, average: true }], 'linked', '2026-08-02');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['count', 100, 300]]]);
    const yes = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-08-02'), '2026-08-02T18:00:00.000Z');
    expect(openPurchases(yes, A, 'VTI').map((p) => [p.date, p.shares, p.price, p.averageOnly])).toEqual([[null, 300, 33.34, true]]);
  });

  test('#8 a sale dated on the very day a tax lot was first listed waits for the next list: 500 listed Nov 10, 200 sold Nov 10 — when the next list says 300, the sale explains it: 300 shares, $14,000, and nobody is asked', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-10'), '2026-11-10T15:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-10T21:00:00.000Z');
    // until the next list says, the list of Nov 10 is read as already net of the sale: 500 held, the sale priced from the lot
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, '2'), soldBeyondRecord(r, A, 'MSFT')]).toEqual([500, 14000, []]);
    const next = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-11');
    expect(next.ask).toEqual([]);
    r = addRows(r, next.rows, '2026-11-11T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, '2')]).toEqual([300, 14000]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-12')).toEqual({ rows: [], ask: [] });
  });

  test('a sale dated on the day of a list that already shows it changes nothing: listed 300 on Nov 16, the sale of 200 dated Nov 16 arrives Nov 17, the next list still says 300 — 300, and nobody is asked', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-16'), '2026-11-16T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-16', shares: 200, price: 420, source: 'linked' })], '2026-11-17T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(300);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-17')).toEqual({ rows: [], ask: [] });
  });

  test('#11 a list with tax lots and an average line: the tax lots are the purchases; the average is not added on top', () => {
    const rows = purchasesToAdd([], A, 'MSFT', [{ date: '2026-05-01', shares: 300, price: 340 }, { date: '2026-06-01', shares: 200, price: 365 }, { date: null, shares: 500, price: 350, average: true }], 'linked', '2026-09-15');
    expect(rows.map((x) => [x.date, x.shares, x.price])).toEqual([['2026-05-01', 300, 340], ['2026-06-01', 200, 365]]);
  });
});

describe('one event arriving by two roads is saved once (audit round 3)', () => {
  test('#3 a purchase in the broker\'s history dated before the list adds no shares: listed 500 (Jul 30), and the history\'s purchase of 500 on Jul 30 — 500 shares, not 1,000', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    const history = (): NewRow => historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'tx-1' });
    r = addRows(r, rowsNotYetSaved(r, [history()]), '2026-09-15T17:00:01.000Z');
    r = addRows(r, rowsNotYetSaved(r, [history()]), '2026-09-16T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
    expect(activityOf(r, A).map((x) => [x.kind, x.date, x.shares, x.source, !!x.inListOf])).toEqual([['PURCHASE', '2026-07-30', 500, 'linked', true]]);   // ONE line: the history's purchase; the tax lot stands for it
  });

  test('#3 a broker\'s average of 500, then the purchase itself in the history (before the list): still 500 shares — the history adds none', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: null, shares: 500, price: 350, average: true }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'tx-1' })]), '2026-09-15T17:00:01.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
  });

  test('a purchase made after the day of the broker\'s average is new shares: 500 on average Sept 15, 100 bought Nov 5 — 600', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: null, shares: 500, price: 350, average: true }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [{ ...purchase('2026-11-05', 100, 400), ref: 'tx-2' }]), '2026-11-05T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(600);
  });

  test('#4 a sale in a file, then the same sale from the linked broker: one sale, 300 shares left', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'file' })]), '2026-11-11T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 'tx-9' })]), '2026-11-12T17:00:00.000Z');
    expect([r.filter((x) => x.kind === 'SALE').length, sharesOnRecord(r, A, 'MSFT')]).toEqual([1, 300]);
  });

  test('#6 one move reported by both accounts is one move: 500 leave the first account, 500 arrive in the second — 500 at $350, not 1,000', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    const out = (): NewRow => transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 500, source: 'linked', ref: 'out-1' });
    const arrives = (): NewRow => ({ accountId: 'acct-2', holding: 'MSFT', kind: 'TRANSFER', date: '2026-11-12', shares: 500, arrives: true, source: 'linked', ref: 'in-1' });
    const both = addRows(r, rowsNotYetSaved(r, [out(), arrives()]), '2026-11-12T17:00:00.000Z');
    expect(openPurchases(both, 'acct-2', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 500, 350]]);
    // and the other way round: the arrival is saved first, then the move that names both accounts
    r = addRows(r, rowsNotYetSaved(r, [arrives()]), '2026-11-12T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [out()]), '2026-11-13T17:00:00.000Z');
    expect(openPurchases(r, 'acct-2', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 500, 350]]);
  });

  test('#7 a sale the broker sends as −200 shares sells 200: 300 left, $14,000', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: -200, price: 420, amount: -84000, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    expect([r[1].shares, r[1].amount, sharesOnRecord(r, A, 'MSFT'), saleGain(r, '2')]).toEqual([200, 84000, 300, 14000]);
    const raw = addRows(addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z'), [{ accountId: A, holding: 'MSFT', kind: 'SALE', date: '2026-11-10', shares: -200, price: 420, source: 'linked' }], '2026-11-10T17:00:00.000Z');
    expect(sharesOnRecord(raw, A, 'MSFT')).toBe(300);
  });
});

describe('the share check and the rest (audit round 3)', () => {
  test('#5 his own case raises no flag: the Nov 3 values state 500; 100 bought Nov 5 and 200 sold Nov 10 come after', () => {
    let r = hisMicrosoftCase();
    r = addRows(r, [purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');
    expect(sharesThatDisagree(r, A)).toEqual([]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(400);
  });

  test('#9 a sale naming a purchase that reached the account in two moves takes from both pieces: 400 of 500 sold — $28,000', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-01', shares: 200, source: 'linked' })], '2026-11-01T17:00:00.000Z');
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-02', shares: 300, source: 'linked' })], '2026-11-02T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: 'acct-2', holding: 'MSFT', date: '2026-11-10', shares: 400, price: 420, source: 'linked', sells: [{ rowId: '1', shares: 400 }] })], '2026-11-10T17:00:00.000Z');
    expect([saleGain(r, '4'), sharesOnRecord(r, 'acct-2', 'MSFT')]).toEqual([28000, 100]);   // 400 × ($420 − $350)
  });

  test('#14 a holding\'s value saved without the account\'s own value row stops', () => {
    expect(() => addRows([], [{ accountId: A, holding: 'MSFT', kind: 'VALUE', date: '2026-11-03', source: 'price-feed', shares: 500, price: 340, amount: 170000 }], '2026-11-03T17:00:00.000Z')).toThrow(/without the account’s own value row/);
  });

  test('#15 on one day, a value the person typed stands in front of a later update that day: typed $341, then an update at $340 — $170,500', () => {
    let r = addRows([], msftDay('2026-11-03', 340), '2026-11-03T15:00:00.000Z');
    r = correctRow(r, '2', { price: 341, amount: 170500 }, 'typed', '2026-11-03T16:00:00.000Z').record;
    r = addRows(r, msftDay('2026-11-03', 340), '2026-11-03T21:00:00.000Z');
    expect(valuesNow(r, A)!.total).toBe(170500);
    r = addRows(r, msftDay('2026-11-04', 345), '2026-11-04T21:00:00.000Z');
    expect(valuesNow(r, A)!.total).toBe(172500);                           // the next day's update is the latest date
  });

  test('#16 a sale naming part of its shares sells the rest oldest first: 150 sold, 100 named from the Nov 5 purchase, 50 from Jul 30', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350), purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 150, price: 420, source: 'linked', sells: [{ rowId: '2', shares: 100 }] })], '2026-11-10T17:00:00.000Z');
    expect(soldFrom(r, '3')).toEqual([{ rowId: '2', shares: 100 }, { rowId: '1', shares: 50 }]);
    expect(saleGain(r, '3')).toBe(5500);   // 100 × ($420 − $400) + 50 × ($420 − $350)
  });

  test('#13 values a file gave with no date are listed so the person can be asked their date', () => {
    let r = addRows([], msftDay('2026-09-15', 450), '2026-09-15T17:00:00.000Z');
    r = addRows(r, valueRows({ accountId: A, date: null, source: 'file', cash: 0, holdings: [{ holding: 'MSFT', shares: 300, price: 340, value: 102000 }] }), '2026-11-04T18:00:00.000Z');
    expect(valuesNeedingADate(r, A).map((b) => [b.source, b.total])).toEqual([['file', 102000]]);
    expect(valuesNow(r, A)!.total).toBe(225000);
  });

  test('"2026-07-18 garbage" is not a date; a time-stamp is cut to its day', () => {
    expect([dayOrNull('2026-07-18 garbage'), dayOrNull('2026-07-18T06:00:00Z'), dayOrNull('2026-07-18')]).toEqual([null, '2026-07-18', '2026-07-18']);
  });
});

// ── HIS COMPLETE RULE OF 2026-11-11, AND THE INDEPENDENT AUDIT, ROUND 4 (5 critical, 6 high) ────────────────────────
describe('one linked account followed from its first day (his rule of 2026-11-11; audit round 4)', () => {
  /** Day 1, Nov 15: the broker's list says 300 MSFT bought Jul 30 at $350; its history says 500 bought Jul 30 and 200 sold Nov 10 at $420. */
  const firstDay = (): AssetRow[] => {
    const at = '2026-11-15T17:00:00.000Z', listDay = '2026-11-15';
    let r: AssetRow[] = [];
    r = addRows(r, rowsNotYetSaved(r, [
      historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' }),
      saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 's-1' }),
    ]), at);
    r = addRows(r, [...purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', listDay).rows, ...msftDay(listDay, 430, 300)], at);
    return r;
  };

  test('#1 first day: 300 shares — not 600 — and the sale before the list made 200 × ($420 − $350) = $14,000', () => {
    const r = firstDay();
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(300);
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 300, 350]]);
    expect(saleGain(r, '2')).toBe(14000);
    expect([sharesThatDisagree(r, A), soldBeyondRecord(r, A, 'MSFT'), salesNeedingAnAnswer(r, A)]).toEqual([[], [], []]);
    expect(valuesNow(r, A)!.total).toBe(129000);   // 300 × $430
  });

  test('the same first day arriving twice changes nothing', () => {
    const r = firstDay();
    const again = rowsNotYetSaved(r, [
      historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' }),
      saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 's-1' })]);
    expect(again).toEqual([]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-16')).toEqual({ rows: [], ask: [] });
  });

  test('later days: 100 bought Nov 20 at $400 (in the history, then on the list), 150 sold Dec 1 at $450, a two-for-one split Dec 10 — every day the shares agree with the broker and nobody is asked', () => {
    let r = firstDay();
    // Nov 20: the purchase arrives in the history (after the list day, so it is a new transaction) and on the list
    r = addRows(r, rowsNotYetSaved(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-11-20', shares: 100, price: 400, source: 'linked', ref: 'b-2' })]), '2026-11-20T17:00:00.000Z');
    let list = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }, { date: '2026-11-20', shares: 100, price: 400 }], 'linked', '2026-11-20');
    expect(list).toEqual({ rows: [], ask: [] });
    r = addRows(r, msftDay('2026-11-20', 400, 400), '2026-11-20T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), sharesThatDisagree(r, A)]).toEqual([400, []]);
    // Dec 1: 150 sold at $450 — the oldest first: 150 × ($450 − $350) = $15,000; the list now says 150 and 100
    r = addRows(r, rowsNotYetSaved(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-12-01', shares: 150, price: 450, source: 'linked', ref: 's-2' })]), '2026-12-01T17:00:00.000Z');
    list = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 150, price: 350 }, { date: '2026-11-20', shares: 100, price: 400 }], 'linked', '2026-12-01');
    expect(list).toEqual({ rows: [], ask: [] });
    r = addRows(r, msftDay('2026-12-01', 450, 250), '2026-12-01T17:00:00.000Z');
    expect([saleGain(r, r.find((x) => x.ref === 's-2')!.rowId), sharesOnRecord(r, A, 'MSFT'), sharesThatDisagree(r, A)]).toEqual([15000, 250, []]);
    // Dec 10: a two-for-one split in the history; the list now says 300 at $175 and 200 at $200
    r = addRows(r, rowsNotYetSaved(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-12-10', ratio: 2, source: 'linked', ref: 'x-1' }]), '2026-12-10T17:00:00.000Z');
    list = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 175 }, { date: '2026-11-20', shares: 200, price: 200 }], 'linked', '2026-12-10');
    expect(list).toEqual({ rows: [], ask: [] });
    r = addRows(r, msftDay('2026-12-10', 225, 500), '2026-12-10T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 300, 175], ['2026-11-20', 200, 200]]);
    expect([sharesThatDisagree(r, A), salesNeedingAnAnswer(r, A), valuesNow(r, A)!.total]).toEqual([[], [], 112500]);
    expect(saleGain(r, '2')).toBe(14000);                                  // and the first sale still made $14,000
  });

  test('#4 a sale that arrives after the list already shows it: the account holder is asked on Nov 12; the sale arriving Nov 13 explains it and made $14,000', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-12').ask.length).toBe(1);
    r = addRows(r, rowsNotYetSaved(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 's-1' })]), '2026-11-13T17:00:00.000Z');
    expect([saleGain(r, '2'), sharesOnRecord(r, A, 'MSFT'), soldBeyondRecord(r, A, 'MSFT')]).toEqual([14000, 300, []]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-13').ask).toEqual([]);
  });
});

describe('a broker that only ever sends an average, followed from its first day (audit round 4)', () => {
  test('#2 first day: an average of 300 at $350, with a history of 500 bought and 200 sold — 300 shares, not 600; a later purchase of 50 is a new transaction, and the next average of 350 agrees', () => {
    const listDay = '2026-09-15';
    let r: AssetRow[] = [];
    r = addRows(r, rowsNotYetSaved(r, [
      historyPurchaseRow(r, { accountId: A, holding: 'VTI', date: '2026-03-01', shares: 500, price: 340, source: 'linked', ref: 'b-1' }),
      saleRow({ accountId: A, holding: 'VTI', date: '2026-08-01', shares: 200, price: 380, source: 'linked', ref: 's-1' }),
    ]), '2026-09-15T17:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'VTI', [{ date: null, shares: 300, price: 350, average: true }], 'linked', listDay).rows, '2026-09-15T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'VTI')).toBe(300);
    expect(saleGain(r, '2')).toBe(8000);                                   // 200 × ($380 − $340), from the history's own purchase
    expect(noChange(purchasesFromList(r, A, 'VTI', [{ date: null, shares: 300, price: 350, average: true }], 'linked', '2026-09-16'))).toBe(true);
    // Oct 5: 50 bought at $360 — after the list day, so a new transaction; the broker's average then says 350 shares
    r = addRows(r, rowsNotYetSaved(r, [historyPurchaseRow(r, { accountId: A, holding: 'VTI', date: '2026-10-05', shares: 50, price: 360, source: 'linked', ref: 'b-2' })]), '2026-10-05T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'VTI')).toBe(350);
    expect(noChange(purchasesFromList(r, A, 'VTI', [{ date: null, shares: 350, price: 351.43, average: true }], 'linked', '2026-10-05'))).toBe(true);
    // Oct 20: the average says 400 with no purchase in the history — nothing changes, and the account holder is asked
    const grown = purchasesFromList(r, A, 'VTI', [{ date: null, shares: 400, price: 352, average: true }], 'linked', '2026-10-20');
    expect([grown.rows, grown.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['count', 350, 400]]]);
  });
});

describe('his rule: the account holder is asked, and the answer is kept (audit round 4)', () => {
  test('HIS EXAMPLE: Robinhood gave a price of $350; the account holder enters $320 for 100 shares of MSFT — both figures are handed back for the confirmation before anything is saved', () => {
    const r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 100, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    expect(differsFromGiven(r, '1', { price: 320 })).toEqual([{ field: 'price', given: 350, entered: 320, holding: 'MSFT', shares: 100 }]);
    expect(differsFromGiven(r, '1', { price: 350 })).toEqual([]);          // nothing differs: nothing to confirm
    const confirmed = correctRow(r, '1', { price: 320, amount: 32000 }, 'typed', '2026-09-16T09:00:00.000Z').record;
    expect(openPurchases(confirmed, A, 'MSFT').map((p) => [p.price, p.source])).toEqual([[320, 'typed']]);
    expect(confirmed[0].price).toBe(350);                                  // Robinhood's $350 stays in the history
    // a further change is still set against what Robinhood gave: $350 against $300
    expect(differsFromGiven(confirmed, '1', { price: 300 })).toEqual([{ field: 'price', given: 350, entered: 300, holding: 'MSFT', shares: 100 }]);
    expect(differsFromGiven(addRows([], [purchase('2026-07-30', 100, 350, { source: 'typed' })], '2026-09-15T17:00:00.000Z'), '1', { price: 320 })).toEqual([]);   // the account holder's own entry: nothing to confirm
    // and the other way: Robinhood's next list still says $350 — the $320 stays, nothing is asked while date and shares agree
    expect(purchasesFromList(confirmed, A, 'MSFT', [{ date: '2026-07-30', shares: 100, price: 350 }], 'linked', '2026-09-17')).toEqual({ rows: [], ask: [] });
  });

  test('#16 a purchase the account holder took away, listed again by the broker, is not added back — the account holder is asked', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = removeRow(r, '1', 'typed', '2026-09-16T09:00:00.000Z').record;
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-17');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesListed])]).toEqual([[], [['removed', 500]]]);
  });

  test('#17 a holding the list no longer states, with no sale on record: nothing is removed, and the account holder is asked', () => {
    const r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [], 'linked', '2026-11-12');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['not-listed', 500, 0]]]);
  });

  test('#3 shares that arrived by a transfer are set beside the list like any other: 500 moved in, the list states Jul 30 at 500 — 500, not 1,000', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 500, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    expect(purchasesFromList(r, 'acct-2', 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-13')).toEqual({ rows: [], ask: [] });
    expect(sharesOnRecord(r, 'acct-2', 'MSFT')).toBe(500);
  });

  test('#15 a price the record lacks is taken from the list: the tax lot first arrives with no price, later at $350', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: null }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = addRows(r, purchasesToAdd(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-16'), '2026-09-16T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 500, 350]]);
  });

  test('#21 where a list adds nothing because the account holder typed the purchase, the account holder IS asked', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 200, average: true }], 'linked', '2026-07-20'), '2026-07-20T15:00:00.000Z');
    r = correctRow(r, '1', { date: '2020-01-15', price: 180, averageOnly: false }, 'typed', '2026-07-20T16:00:00.000Z').record;
    const answer = purchasesFromList(r, A, 'VTI', [{ date: '2025-01-10', shares: 60, price: 190 }, { date: '2025-06-10', shares: 40, price: 215 }], 'linked', '2026-08-02');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['typed', 100, 100]]]);
  });
});

describe('nothing sent twice is saved twice (audit round 4)', () => {
  test('#5 values and purchases saved through one delivery keep their own row numbers: the values still read $21,005', () => {
    const delivery: NewRow[] = [
      ...valueRows({ accountId: A, date: '2026-09-15', source: 'linked', cash: 5, holdings: [{ holding: 'VTI', shares: 100, price: 210, value: 21000 }] }),
      ...purchasesToAdd([], A, 'VTI', [{ date: '2025-01-10', shares: 60, price: 190 }, { date: '2025-06-10', shares: 40, price: 215 }], 'linked', '2026-09-15'),
    ];
    const r = addRows([], rowsNotYetSaved([], delivery), '2026-09-15T17:00:00.000Z');
    expect([valuesNow(r, A)!.total, sharesOnRecord(r, A, 'VTI')]).toEqual([21005, 100]);
  });

  test('#10 a linked sale and a dividend with no key from the broker, sent twice, are saved once', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    const delivery = (): NewRow[] => [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' }),
      { accountId: A, holding: 'MSFT', kind: 'DIVIDEND', date: '2026-11-11', amount: 55, source: 'linked' }];
    r = addRows(r, rowsNotYetSaved(r, delivery()), '2026-11-12T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, delivery()), '2026-11-13T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), r.filter((x) => x.kind === 'DIVIDEND').length]).toEqual([300, 1]);
  });

  test('#11 a sale in a file at $84,000 and the same sale from the broker net of a $4.95 fee are one sale: 300 left', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, amount: 84000, source: 'file' })]), '2026-11-11T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, amount: 83995.05, fee: 4.95, source: 'linked', ref: 'tx-9' })]), '2026-11-12T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(300);
  });

  test('#8 one move reported by the two accounts two days apart is one move: 500, not 1,000', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-12', shares: 500, source: 'linked', ref: 'out-1' })]), '2026-11-12T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [{ accountId: 'acct-2', holding: 'MSFT', kind: 'TRANSFER', date: '2026-11-14', shares: 500, arrives: true, source: 'linked', ref: 'in-1' }]), '2026-11-14T17:00:00.000Z');
    expect(openPurchases(r, 'acct-2', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 500, 350]]);
  });
});

describe('questions about which tax lot was sold (audit round 4)', () => {
  const twoLots = () => addRows(addRows([], [purchase(null, 100, 50, { averageOnly: true })], '2020-03-01T12:00:00.000Z'), [purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');

  test('#12 three unanswered sales of 100 against 200 held: the third is named as beyond the record', () => {
    let r = twoLots();
    for (const d of ['2026-11-10', '2026-11-11', '2026-11-12']) r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: d, shares: 100, price: 420, source: 'linked' })], `${d}T17:00:00.000Z`);
    expect(salesNeedingAnAnswer(r, A).map((q) => [q.rowId, q.shares])).toEqual([['3', 100], ['4', 100]]);
    expect(soldBeyondRecord(r, A, 'MSFT')).toEqual([{ rowId: '5', shares: 100 }]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(0);
  });

  test('#13 the question offers only purchases made by the day of the sale, and an answer naming a later purchase sells nothing from it', () => {
    let r = twoLots();
    r = addRows(r, [purchase('2026-12-01', 100, 500)], '2026-12-01T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'linked' })], '2026-12-02T17:00:00.000Z');
    expect(salesNeedingAnAnswer(r, A)[0].choices.map((c) => c.date)).toEqual([null, '2026-11-05']);
    const wrong = correctRow(r, '4', { sells: [{ rowId: '3', shares: 100 }] }, 'typed', '2026-12-03T09:00:00.000Z').record;
    expect(saleGain(wrong, '4')).toBeNull();
    expect(openPurchases(wrong, A, 'MSFT').find((p) => p.date === '2026-12-01')!.shares).toBe(100);
  });
});

// ── THE INDEPENDENT AUDIT, ROUND 5 (4 critical, 6 high): the list changes purchases in four cases only; the rest asks ─
describe('a list that differs is a question, never a silent change (audit round 5)', () => {
  const listed500 = () => addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');

  test('#2 the broker restates a date with no transaction (Jul 30 becomes Jul 31): nothing is added — 500, not 1,000 — and the account holder is asked; "mine is correct" keeps 500', () => {
    const r = listed500();
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-31', shares: 500, price: 350 }], 'linked', '2026-09-16');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['not-listed', 500, 500]]]);
    const mine = addRows(r, answerListQuestion(r, answer.ask[0], false, 'linked', '2026-09-16'), '2026-09-16T18:00:00.000Z');
    expect(sharesOnRecord(mine, A, 'MSFT')).toBe(500);
    expect(purchasesFromList(mine, A, 'MSFT', [{ date: '2026-07-31', shares: 500, price: 350 }], 'linked', '2026-09-17')).toEqual({ rows: [], ask: [] });
    const theirs = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-09-16'), '2026-09-16T18:00:00.000Z');
    expect(openPurchases(theirs, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-07-31', 500]]);
  });

  test('#1 50 shares arrive from outside, then the broker lists them as a tax lot of 2024-01-10: nothing is added — 50, not 100 — and on "the list is correct" the tax lot states them', () => {
    let r = addRows([], [{ accountId: A, holding: 'MSFT', kind: 'TRANSFER', date: '2026-11-12', shares: 50, arrives: true, source: 'linked' }], '2026-11-12T17:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2024-01-10', shares: 50, price: 300 }], 'linked', '2026-11-13');
    expect([answer.rows, answer.ask.length, sharesOnRecord(r, A, 'MSFT')]).toEqual([[], 1, 50]);
    r = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-11-13'), '2026-11-13T18:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2024-01-10', 50, 300]]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2024-01-10', shares: 50, price: 300 }], 'linked', '2026-11-14')).toEqual({ rows: [], ask: [] });
  });

  test('#5 a purchase the account holder took away, listed again with other shares, is not added back — the account holder is asked', () => {
    const r = removeRow(listed500(), '1', 'typed', '2026-09-16T09:00:00.000Z').record;
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-09-17');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesListed])]).toEqual([[], [['removed', 300]]]);
  });

  test('#6 "the broker is correct" (500 become 300), then the sale of 200 arrives: it made $14,000; and for a full sale answered first (500 become 0), the sale of 500 made $35,000 and nothing is beyond the record', () => {
    let r = listed500();
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-12').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-12'), '2026-11-12T18:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked' })], '2026-11-13T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, r[r.length - 1].rowId), soldBeyondRecord(r, A, 'MSFT')]).toEqual([300, 14000, []]);
    let full = listed500();
    const [gone] = purchasesFromList(full, A, 'MSFT', [], 'linked', '2026-11-12').ask;
    full = addRows(full, answerListQuestion(full, gone, true, 'linked', '2026-11-12'), '2026-11-12T18:00:00.000Z');
    full = addRows(full, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 500, price: 420, source: 'linked' })], '2026-11-13T17:00:00.000Z');
    expect([sharesOnRecord(full, A, 'MSFT'), saleGain(full, full[full.length - 1].rowId), soldBeyondRecord(full, A, 'MSFT')]).toEqual([0, 35000, []]);   // 500 × ($420 − $350)
  });

  test('#9 a purchase the account holder typed does not hold back an unrelated new tax lot: the Nov 20 lot of 100 is added, and only the typed purchase is asked about', () => {
    let r = listed500();
    r = addRows(r, [purchase('2026-10-01', 20, 300, { source: 'typed' })], '2026-10-01T12:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }, { date: '2026-11-20', shares: 100, price: 400 }], 'linked', '2026-11-20');
    expect(answer.rows.map((x) => [x.date, x.shares])).toEqual([['2026-11-20', 100]]);
    expect(answer.ask.map((q) => [q.kind, q.onRecord.map((p) => p.shares), q.listed.length])).toEqual([['typed', [20], 0]]);
    const mine = addRows(addRows(r, answer.rows, '2026-11-20T17:00:00.000Z'), answerListQuestion(r, answer.ask[0], false, 'linked', '2026-11-20'), '2026-11-20T18:00:00.000Z');
    expect(sharesOnRecord(mine, A, 'MSFT')).toBe(620);                     // the broker's 600 and the account holder's own 20
  });

  test('#11 a broker stating another price for a tax lot with no transaction is asked, not taken: $350 becomes $345', () => {
    const r = listed500();
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 345 }], 'linked', '2026-09-16');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.onRecord[0].price, q.listed[0].price])]).toEqual([[], [['price', 350, 345]]]);
    const yes = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-09-16'), '2026-09-16T18:00:00.000Z');
    expect(openPurchases(yes, A, 'MSFT').map((p) => p.price)).toEqual([345]);
  });

  test('#12 "mine is correct" is not asked again after a sale that moves both sides alike: 450 typed against the broker\'s 500, then 100 sold', () => {
    let r = correctRow(listed500(), '1', { shares: 450 }, 'typed', '2026-09-16T09:00:00.000Z').record;
    const listed = [{ date: '2026-07-30', shares: 500, price: 350 }];
    const [q] = purchasesFromList(r, A, 'MSFT', listed, 'linked', '2026-09-17').ask;
    expect([q.kind, q.sharesOnRecord, q.sharesListed]).toEqual(['typed', 450, 500]);
    r = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-09-17'), '2026-09-17T18:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-01', shares: 100, price: 420, source: 'linked' })], '2026-10-01T17:00:00.000Z');
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 400, price: 350 }], 'linked', '2026-10-01').ask).toEqual([]);
  });

  test('#7 an average is set beside the shares on record, counting shares a sale took that still wait for an answer: average 300, 50 bought, 100 sold, average now 250 — no question', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 300, price: 350, average: true }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = addRows(r, [historyPurchaseRow(r, { accountId: A, holding: 'VTI', date: '2026-10-05', shares: 50, price: 360, source: 'linked', ref: 'b-2' })], '2026-10-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'VTI', date: '2026-10-10', shares: 100, price: 380, source: 'linked' })], '2026-10-10T17:00:00.000Z');
    expect(salesNeedingAnAnswer(r, A).length).toBe(1);                      // which tax lot was sold is asked — that is another question
    expect(purchasesFromList(r, A, 'VTI', [{ date: null, shares: 250, price: 352, average: true }], 'linked', '2026-10-10')).toEqual({ rows: [], ask: [] });
  });
});

describe('the history\'s purchases and the day of the list (audit round 5, #8)', () => {
  test('the day of the list is read from the record: a purchase of Nov 20 that reaches the history a day after the list already stated it adds no shares — 600, not 700', () => {
    let r = addRows([], [...purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-15'), ...msftDay('2026-11-15', 430)], '2026-11-15T17:00:00.000Z');
    r = addRows(r, [...purchasesToAdd(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }, { date: '2026-11-20', shares: 100, price: 400 }], 'linked', '2026-11-20'), ...msftDay('2026-11-20', 400, 600)], '2026-11-20T17:00:00.000Z');
    expect(lastListDay(r, A, 'MSFT')).toBe('2026-11-20');
    r = addRows(r, rowsNotYetSaved(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-11-20', shares: 100, price: 400, source: 'linked', ref: 'b-2' })]), '2026-11-21T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(600);
  });

  test('only a list that was taken in moves the day on: a purchase of Oct 3 the Oct 4 list did not state, arriving Oct 5, is a new transaction', () => {
    let r = addRows([], [...purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), ...msftDay('2026-09-15', 450)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, msftDay('2026-10-04', 460), '2026-10-04T17:00:00.000Z');
    expect(lastListDay(r, A, 'MSFT')).toBe('2026-09-15');
    expect(historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-10-03', shares: 10, price: 455, source: 'linked' }).inListOf).toBeUndefined();
    expect(historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-09-01', shares: 10, price: 455, source: 'linked' }).inListOf).toBe('2026-09-15');
  });
});

describe('one event by two roads that differs is a question (audit round 5)', () => {
  const held = () => addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');

  test('#4 the account holder typed a sale of 200 at $420.50; the broker sends it at $420: one sale, 300 shares — and both prices are handed back for the question', () => {
    let r = addRows(held(), [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420.5, source: 'typed' })], '2026-11-10T17:00:00.000Z');
    const arriving = [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 'tx-9' })];
    expect(eventsThatDiffer(r, arriving).map((d) => [d.why, d.onRecord.price, d.arriving.price])).toEqual([['price', 420.5, 420]]);
    r = addRows(r, rowsNotYetSaved(r, arriving), '2026-11-11T17:00:00.000Z');
    expect([r.filter((x) => x.kind === 'SALE').length, sharesOnRecord(r, A, 'MSFT')]).toEqual([1, 300]);
  });

  test('#10 a sale from a file that the account holder took away is not saved again when the broker sends it — it is handed back as a question', () => {
    let r = addRows(held(), rowsNotYetSaved(held(), [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'file' })]), '2026-11-10T17:00:00.000Z');
    r = removeRow(r, '2', 'typed', '2026-11-11T09:00:00.000Z').record;
    const arriving = [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 'tx-9' })];
    expect(eventsThatDiffer(r, arriving).map((d) => d.why)).toEqual(['taken-away']);
    expect(rowsNotYetSaved(r, arriving)).toEqual([]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
  });

  test('#14 two interest payments with no date and no key, a month apart, are both kept', () => {
    const interest = (): NewRow => ({ accountId: A, holding: null, kind: 'INTEREST', date: null, amount: 4, source: 'linked' });
    let r = addRows([], rowsNotYetSaved([], [interest()]), '2026-10-01T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [interest()]), '2026-11-01T17:00:00.000Z');
    expect(r.filter((x) => x.kind === 'INTEREST').length).toBe(2);
  });

  test('#13 shares on record never go below zero unnamed: 200 held, 260 sold in three sales — the 60 are named as beyond the record', () => {
    let r = addRows(addRows([], [purchase(null, 100, 50, { averageOnly: true })], '2020-03-01T12:00:00.000Z'), [purchase('2026-11-05', 100, 400)], '2026-11-05T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'linked' })], '2026-11-10T17:00:00.000Z');             // waits for an answer
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-11', shares: 100, price: 420, source: 'linked', sells: [{ rowId: '1', shares: 100 }] })], '2026-11-11T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-12', shares: 60, price: 420, source: 'linked' })], '2026-11-12T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(0);
    expect(soldBeyondRecord(r, A, 'MSFT')).toEqual([{ rowId: '5', shares: 60 }]);
  });
});

// ── HIS GO-AHEAD OF 2026-11-11: the same shares on nearby dates from two places are ONE item with a question ────────
describe('an account the account holder typed, then linked: one purchase and one sale, each with a question — never two of each', () => {
  /** Typed by the account holder: 500 MSFT bought Jul 29 at $350, 200 sold Nov 9 at $420. */
  const typedAccount = (): AssetRow[] => {
    let r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-09', shares: 200, price: 420, source: 'typed' })], '2026-11-09T12:05:00.000Z');
    return r;
  };
  /** What the broker's history then sends: the same purchase dated Jul 30, the same sale dated Nov 10. */
  const fromBroker = (r: AssetRow[]): NewRow[] => [
    historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' }),
    saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 's-1' }),
  ];

  test('nothing is saved twice: 300 shares, one sale of $14,000 — and both dates of each are handed back as questions', () => {
    const r = typedAccount();
    expect(rowsNotYetSaved(r, fromBroker(r))).toEqual([]);
    expect(eventsThatDiffer(r, fromBroker(r)).map((q) => [q.why, q.onRecord.kind, q.onRecord.date, q.arriving.date])).toEqual([
      ['date', 'PURCHASE', '2026-07-29', '2026-07-30'], ['date', 'SALE', '2026-11-09', '2026-11-10']]);
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, '2'), r.filter((x) => x.kind === 'SALE').length]).toEqual([300, 14000, 1]);
  });

  test('"the broker is correct": the purchase is dated Jul 30 and the sale Nov 10 — still one of each, 300 shares, $14,000 — and the next update asks nothing', () => {
    let r = typedAccount();
    for (const q of eventsThatDiffer(r, fromBroker(r))) r = addRows(r, answerEventQuestion(q, 'theirs'), '2026-11-11T09:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 300, 350]]);
    expect(activityOf(r, A).map((x) => [x.kind, x.date, x.shares])).toEqual([['PURCHASE', '2026-07-30', 500], ['SALE', '2026-11-10', 200]]);
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, '2')]).toEqual([300, 14000]);
    expect([rowsNotYetSaved(r, fromBroker(r)), eventsThatDiffer(r, fromBroker(r))]).toEqual([[], []]);
    expect(r[0].date).toBe('2026-07-29');                                  // what the account holder first typed stays in the history
  });

  test('"mine is correct": Jul 29 and Nov 9 stand, nothing is saved, and the same update does not ask again', () => {
    let r = typedAccount();
    for (const q of eventsThatDiffer(r, fromBroker(r))) r = addRows(r, answerEventQuestion(q, 'mine'), '2026-11-11T09:00:00.000Z');
    expect([rowsNotYetSaved(r, fromBroker(r)), eventsThatDiffer(r, fromBroker(r))]).toEqual([[], []]);
    expect(activityOf(r, A).map((x) => [x.kind, x.date, x.shares])).toEqual([['PURCHASE', '2026-07-29', 500], ['SALE', '2026-11-09', 200]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(300);
  });

  test('"they are two different sales": the broker\'s sale of Nov 10 is saved beside the typed one of Nov 9 — 100 shares left', () => {
    let r = typedAccount();
    const sale = eventsThatDiffer(r, fromBroker(r)).find((q) => q.onRecord.kind === 'SALE')!;
    r = addRows(r, answerEventQuestion(sale, 'both'), '2026-11-11T09:00:00.000Z');
    expect([r.filter((x) => x.kind === 'SALE').length, sharesOnRecord(r, A, 'MSFT')]).toEqual([2, 100]);
    expect(eventsThatDiffer(r, fromBroker(r)).map((q) => q.onRecord.kind)).toEqual(['PURCHASE']);   // only the purchase is still to answer
  });

  test('the broker\'s tax lot of Jul 30 against the typed purchase of Jul 29: nothing is added — 500, not 1,000 — and the account holder is asked with both dates', () => {
    const r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-15');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.onRecord.map((p) => p.date), q.listed.map((l) => l.date)])]).toEqual([[], [['typed', ['2026-07-29'], ['2026-07-30']]]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
    const theirs = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    expect(openPurchases(theirs, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-07-30', 500]]);
    const mine = addRows(r, answerListQuestion(r, answer.ask[0], false, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    expect(purchasesFromList(mine, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-16')).toEqual({ rows: [], ask: [] });
    expect(openPurchases(mine, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-07-29', 500]]);
  });

  test('HIS QUESTION: the broker sends a holding with no cost — the account holder fills in that one cost; everything else stays the broker\'s, and later updates do not replace it', () => {
    let r = addRows([], [...purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 100, price: null }], 'linked', '2026-09-15'),
      ...purchasesToAdd([], A, 'VTI', [{ date: '2025-01-10', shares: 60, price: 190 }], 'linked', '2026-09-15')], '2026-09-15T17:00:00.000Z');
    expect(differsFromGiven(r, '1', { price: 350 })).toEqual([{ field: 'price', given: null, entered: 350, holding: 'MSFT', shares: 100 }]);
    r = correctRow(r, '1', { price: 350, amount: 35000 }, 'typed', '2026-09-16T09:00:00.000Z').record;
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price, p.source])).toEqual([['2026-07-30', 100, 350, 'typed']]);
    expect(openPurchases(r, A, 'VTI').map((p) => [p.price, p.source])).toEqual([[190, 'linked']]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 100, price: null }], 'linked', '2026-09-17')).toEqual({ rows: [], ask: [] });
    expect(openPurchases(r, A, 'MSFT')[0].price).toBe(350);
  });

  test('two real events on one day are both kept: a typed deposit of $500 and a typed purchase of 10 at $400; the broker sends deposits of $500 and $2,000 and purchases of 10 at $400 and 10 at $401', () => {
    let r = addRows([], [{ accountId: A, holding: null, kind: 'DEPOSIT', date: '2026-08-01', amount: 500, source: 'typed' }, purchase('2026-08-01', 10, 400, { source: 'typed' })], '2026-08-01T12:00:00.000Z');
    const arriving: NewRow[] = [
      { accountId: A, holding: null, kind: 'DEPOSIT', date: '2026-08-01', amount: 500, source: 'linked', ref: 'd-1' },
      { accountId: A, holding: null, kind: 'DEPOSIT', date: '2026-08-01', amount: 2000, source: 'linked', ref: 'd-2' },
      { ...purchase('2026-08-01', 10, 400), ref: 'b-1' }, { ...purchase('2026-08-01', 10, 401), ref: 'b-2' }];
    const saved = rowsNotYetSaved(r, arriving);
    expect(saved.map((x) => [x.kind, x.amount])).toEqual([['DEPOSIT', 2000], ['PURCHASE', 4010]]);
    r = addRows(r, saved, '2026-08-02T12:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(20);
  });
});

// ── THE EIGHT FAULTS LEFT OPEN BY THE SIXTH CHECK — his word of 2026-11-11: "All needs to be fixed." ─────────────────
describe('the eight faults of the sixth check', () => {
  const listed500 = () => addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');

  test('1 · shares moved in from another account, then "the broker is correct": 500 in the second account — not 1,000 — and the next update asks nothing', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350)], '2026-09-15T17:00:00.000Z');
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-11-01', shares: 500, source: 'linked' })], '2026-11-01T17:00:00.000Z');
    const listed = [{ date: '2026-11-01', shares: 500, price: 350 }];   // the second broker states the day the shares arrived as their date
    const answer = purchasesFromList(r, 'acct-2', 'MSFT', listed, 'linked', '2026-11-02');
    expect([answer.rows, answer.ask.map((q) => [q.sharesOnRecord, q.sharesListed])]).toEqual([[], [[500, 500]]]);
    r = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-11-02'), '2026-11-02T18:00:00.000Z');
    expect(openPurchases(r, 'acct-2', 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-11-01', 500, 350]]);
    expect(sharesOnRecord(r, 'acct-2', 'MSFT')).toBe(500);
    expect(purchasesFromList(r, 'acct-2', 'MSFT', listed, 'linked', '2026-11-03')).toEqual({ rows: [], ask: [] });
    expect(activityOf(r, 'acct-2').filter((x) => x.kind === 'TRANSFER').length).toBe(1);   // the move itself; the answer's own row is not activity
  });

  test('2 · a purchase with no date that the account holder took away does not come back: the broker\'s average of 500 is a question', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 500, price: 200, average: true }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = removeRow(r, '1', 'typed', '2026-09-16T09:00:00.000Z').record;
    const answer = purchasesFromList(r, A, 'VTI', [{ date: null, shares: 500, price: 200, average: true }], 'linked', '2026-09-17');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesListed]), sharesOnRecord(r, A, 'VTI')]).toEqual([[], [['removed', 500]], 0]);
  });

  test('3 · the account holder typed a sale of everything and the broker still lists the holding: nothing comes back, and the account holder is asked', () => {
    let r = listed500();
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-01', shares: 500, price: 420, source: 'typed' })], '2026-10-01T12:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-10-02');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed]), sharesOnRecord(r, A, 'MSFT')]).toEqual([[], [['not-listed', 0, 500]], 0]);
    const average = addRows(addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 500, price: 200, average: true }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z'),
      [saleRow({ accountId: A, holding: 'VTI', date: '2026-10-01', shares: 500, price: 210, source: 'typed' })], '2026-10-01T12:00:00.000Z');
    expect(purchasesFromList(average, A, 'VTI', [{ date: null, shares: 500, price: 200, average: true }], 'linked', '2026-10-02').ask.map((q) => [q.kind, q.sharesListed])).toEqual([['count', 500]]);
  });

  test('4 · a broker that sends only an average: the average says 600 on Nov 5, and the purchase of 100 reaches the history on Nov 6 — 600 shares, and the question is gone', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 500, price: 200, average: true }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    const nov5 = purchasesFromList(r, A, 'VTI', [{ date: null, shares: 600, price: 205, average: true }], 'linked', '2026-11-05');
    expect(nov5.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])).toEqual([['count', 500, 600]]);
    r = addRows(r, valueRows({ accountId: A, date: '2026-11-05', source: 'linked', cash: 0, holdings: [{ holding: 'VTI', shares: 600, price: 230, value: 138000 }] }), '2026-11-05T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [historyPurchaseRow(r, { accountId: A, holding: 'VTI', date: '2026-11-05', shares: 100, price: 230, source: 'linked', ref: 'b-9' })]), '2026-11-06T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'VTI')).toBe(600);
    expect(noChange(purchasesFromList(r, A, 'VTI', [{ date: null, shares: 600, price: 205, average: true }], 'linked', '2026-11-06'))).toBe(true);
  });

  test('5 · after "mine is correct" (450 typed over the broker\'s 500), a new tax lot of 100 is added on its own and the old question is not asked again: 550', () => {
    let r = correctRow(listed500(), '1', { shares: 450 }, 'typed', '2026-09-16T09:00:00.000Z').record;
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-17').ask;
    r = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-09-17'), '2026-09-17T18:00:00.000Z');
    const next = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }, { date: '2026-11-20', shares: 100, price: 400 }], 'linked', '2026-11-20');
    expect([next.rows.map((x) => [x.date, x.shares]), next.ask]).toEqual([[['2026-11-20', 100]], []]);
    expect(sharesOnRecord(addRows(r, next.rows, '2026-11-20T17:00:00.000Z'), A, 'MSFT')).toBe(550);
  });

  test('6 · "mine is correct" on an average is remembered after a new purchase: 450 against the broker\'s 500, then 100 bought — 550 against 600 is not asked again', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 500, price: 200, average: true }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = correctRow(r, '1', { shares: 450 }, 'typed', '2026-09-16T09:00:00.000Z').record;
    const [q] = purchasesFromList(r, A, 'VTI', [{ date: null, shares: 500, price: 200, average: true }], 'linked', '2026-09-17').ask;
    expect([q.kind, q.sharesOnRecord, q.sharesListed]).toEqual(['count', 450, 500]);
    r = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-09-17'), '2026-09-17T18:00:00.000Z');
    r = addRows(r, [historyPurchaseRow(r, { accountId: A, holding: 'VTI', date: '2026-10-05', shares: 100, price: 210, source: 'linked', ref: 'b-2' })], '2026-10-05T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'VTI')).toBe(550);
    expect(purchasesFromList(r, A, 'VTI', [{ date: null, shares: 600, price: 202, average: true }], 'linked', '2026-10-05')).toEqual({ rows: [], ask: [] });
    expect(purchasesFromList(r, A, 'VTI', [{ date: null, shares: 700, price: 203, average: true }], 'linked', '2026-10-06').ask.length).toBe(1);   // a new gap is asked
  });

  test('7 · a first link where the broker\'s history is shorter than the holding\'s life: the list is taken in — 120 shares, as the broker states — and the history still says what its sale made', () => {
    // history: 50 bought Oct 1 at $200, 30 sold Oct 20 at $230. The list of Nov 15: 70 bought 2020-01-10 at $100, and 50 bought Oct 1 at $200.
    let r: AssetRow[] = [];
    r = addRows(r, rowsNotYetSaved(r, [
      historyPurchaseRow(r, { accountId: A, holding: 'VTI', date: '2026-10-01', shares: 50, price: 200, source: 'linked', ref: 'b-1' }),
      saleRow({ accountId: A, holding: 'VTI', date: '2026-10-20', shares: 30, price: 230, source: 'linked', ref: 's-1' })]), '2026-11-15T17:00:00.000Z');
    const first = purchasesFromList(r, A, 'VTI', [{ date: '2020-01-10', shares: 70, price: 100 }, { date: '2026-10-01', shares: 50, price: 200 }], 'linked', '2026-11-15');
    expect(first.ask).toEqual([]);
    r = addRows(r, [...first.rows, ...valueRows({ accountId: A, date: '2026-11-15', source: 'linked', cash: 0, holdings: [{ holding: 'VTI', shares: 120, price: 240, value: 28800 }] })], '2026-11-15T17:00:00.000Z');
    expect(openPurchases(r, A, 'VTI').map((p) => [p.date, p.shares, p.price])).toEqual([['2020-01-10', 70, 100], ['2026-10-01', 50, 200]]);
    expect([sharesOnRecord(r, A, 'VTI'), sharesThatDisagree(r, A), soldBeyondRecord(r, A, 'VTI')]).toEqual([120, [], []]);
    // the list still states all 50 of Oct 1, so the sale did not sell them: it sold the oldest, the lot of 2020 at $100
    expect(saleGain(r, '2')).toBe(3900);                                   // 30 × ($230 − $100)
    expect(purchasesFromList(r, A, 'VTI', [{ date: '2020-01-10', shares: 70, price: 100 }, { date: '2026-10-01', shares: 50, price: 200 }], 'linked', '2026-11-16')).toEqual({ rows: [], ask: [] });
  });

  test('8 · a broker\'s old split does not change a purchase the account holder typed later: 200 at $175 typed in 2026 stays 200 at $175; a split after it was typed doubles it', () => {
    let r = addRows([], [purchase('2020-01-10', 200, 175, { source: 'typed' })], '2026-11-01T12:00:00.000Z');
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2024-06-01', ratio: 2, source: 'linked' }], '2026-11-02T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2020-01-10', 200, 175]]);
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-12-10', ratio: 2, source: 'linked' }], '2026-12-10T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2020-01-10', 400, 87.5]]);
  });

  test('after "the broker is correct" (500 become 300), a later difference on that purchase (300 against 200) is not called "you took this away"', () => {
    let r = listed500();
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-12').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-12'), '2026-11-12T18:00:00.000Z');
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 200, price: 350 }], 'linked', '2026-11-20').ask.map((x) => [x.kind, x.sharesOnRecord, x.sharesListed])).toEqual([['not-listed', 300, 200]]);
  });
});

// ── THE VERIFIER'S FIVE (2026-11-11; his word: "fix these first") ───────────────────────────────────────────────────
describe('the five faults the verifier reported', () => {
  const typedPurchase = () => addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');

  test('a broker\'s first tax lot never lands on top of a purchase the account holder typed, also where date AND shares differ: typed 500 of Jul 29, listed 300 of Jul 30 (or of Aug 15) — 500 unchanged, and one question', () => {
    for (const date of ['2026-07-30', '2026-08-15']) {
      const answer = purchasesFromList(typedPurchase(), A, 'MSFT', [{ date, shares: 300, price: 350 }], 'linked', '2026-11-15');
      expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['typed', 500, 300]]]);
    }
    const r = typedPurchase();
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-08-15', shares: 300, price: 350 }], 'linked', '2026-11-15').ask;
    const mine = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    expect(sharesOnRecord(mine, A, 'MSFT')).toBe(500);
    expect(purchasesFromList(mine, A, 'MSFT', [{ date: '2026-08-15', shares: 300, price: 350 }], 'linked', '2026-11-16')).toEqual({ rows: [], ask: [] });
    const theirs = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    expect(openPurchases(theirs, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-08-15', 300]]);
  });

  /** Typed: 500 bought Jul 29, 200 sold Nov 9. The broker: the purchase as Jul 30, the sale as Nov 10. */
  const typedAccount = (): AssetRow[] => addRows(typedPurchase(), [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-09', shares: 200, price: 420, source: 'typed' })], '2026-11-09T12:05:00.000Z');
  const fromBroker = (r: AssetRow[]): NewRow[] => [
    historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' }),
    saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 200, price: 420, source: 'linked', ref: 's-1' })];

  test('"they are two different sales" with the purchase question still open: the broker\'s tax lot of 300 is not added on top — 100 shares, and the account holder is asked', () => {
    let r = typedAccount();
    const sale = eventsThatDiffer(r, fromBroker(r)).find((q) => q.onRecord.kind === 'SALE')!;
    r = addRows(r, answerEventQuestion(sale, 'both'), '2026-11-11T09:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(100);
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-15');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.sharesOnRecord, q.sharesListed])]).toEqual([[], [['typed', 100, 300]]]);
  });

  test('"mine is correct" on the purchase is not asked a second time by the list: Jul 29 stands against the broker\'s Jul 30', () => {
    let r = typedAccount();
    for (const q of eventsThatDiffer(r, fromBroker(r))) r = addRows(r, answerEventQuestion(q, 'mine'), '2026-11-11T09:00:00.000Z');
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-15')).toEqual({ rows: [], ask: [] });
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-07-29', 300]]);
  });

  test('"the broker is correct" on a list is never read later as the account holder taking a purchase away', () => {
    let r = typedPurchase();
    const purchaseQ = eventsThatDiffer(r, [fromBroker(r)[0]])[0];
    r = addRows(r, answerEventQuestion(purchaseQ, 'both'), '2026-11-11T09:00:00.000Z');          // both purchases kept: 1,000
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-15').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
    expect(sortArriving(r, [fromBroker(r)[0]])).toEqual({ save: [], ask: [] });
    // the next list is the first one taken in over what is left (the broker's own history): 500 shares still, and nothing is asked
    const next = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-16');
    expect(next.ask).toEqual([]);
    r = addRows(r, next.rows, '2026-11-16T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares])]).toEqual([500, [['2026-07-30', 500]]]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-17')).toEqual({ rows: [], ask: [] });
    expect(sortArriving(r, [fromBroker(r)[0]])).toEqual({ save: [], ask: [] });
  });

  test('two real events on one day: what is saved and what is asked never disagree, whatever order the broker sends them in — the $2,000 deposit and the purchase at $401 are saved, and nothing is asked', () => {
    const r = addRows([], [{ accountId: A, holding: null, kind: 'DEPOSIT', date: '2026-08-01', amount: 500, source: 'typed' }, purchase('2026-08-01', 10, 400, { source: 'typed' })], '2026-08-01T12:00:00.000Z');
    const d500: NewRow = { accountId: A, holding: null, kind: 'DEPOSIT', date: '2026-08-01', amount: 500, source: 'linked', ref: 'd-1' };
    const d2000: NewRow = { accountId: A, holding: null, kind: 'DEPOSIT', date: '2026-08-01', amount: 2000, source: 'linked', ref: 'd-2' };
    const b400: NewRow = { ...purchase('2026-08-01', 10, 400), ref: 'b-1' }, b401: NewRow = { ...purchase('2026-08-01', 10, 401), ref: 'b-2' };
    for (const order of [[d500, d2000, b400, b401], [b401, b400, d2000, d500]]) {
      const sorted = sortArriving(r, order);
      expect(sorted.ask).toEqual([]);
      expect(sorted.save.map((x) => x.ref).sort()).toEqual(['b-2', 'd-2']);
      expect(eventsThatDiffer(r, order)).toEqual([]);
      const after = addRows(r, sorted.save, '2026-08-02T12:00:00.000Z');
      expect(sharesOnRecord(after, A, 'MSFT')).toBe(20);
      expect(sortArriving(after, order)).toEqual({ save: [], ask: [] });   // the same delivery again: nothing
    }
  });

  test('a sale dated on the day of the list, then the next list confirms it: list of Nov 5 says 500, a sale of 200 dated Nov 5 arrives, the next list says 300 — 300 shares and $14,000', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-05'), '2026-11-05T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-05', shares: 200, price: 420, source: 'linked', ref: 's-1' })]), '2026-11-06T17:00:00.000Z');
    const next = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-06');
    expect(next.ask).toEqual([]);
    r = addRows(r, next.rows, '2026-11-06T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, '2'), sharesThatDisagree(r, A)]).toEqual([300, 14000, []]);
  });

  test('a sale the account holder typed with a date before a list that still states the shares is handed back as a question', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-10-15'), '2026-10-15T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-10', shares: 500, price: 420, source: 'typed' })], '2026-10-16T12:00:00.000Z');
    expect(typedSalesTheListContradicts(r, A)).toEqual([{ rowId: '2', holding: 'MSFT', shares: 500 }]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);                        // nothing is removed while the two disagree
    const after = addRows(addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-10-15'), '2026-10-15T17:00:00.000Z'),
      [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-20', shares: 500, price: 420, source: 'typed' })], '2026-10-20T12:00:00.000Z');
    expect([typedSalesTheListContradicts(after, A), sharesOnRecord(after, A, 'MSFT')]).toEqual([[], 0]);   // a sale after the list is simply a sale
  });
});

// ── PHASE 1 OF THE APPROVED PLAN (2026-11-11): the four faults the last check left ──────────────────────────────────
describe('phase 1: the four faults the last check left', () => {
  test('1 · a sale of everything the account holder typed is not undone by the broker\'s first list: 0 shares stay 0, and the account holder is asked', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350, { source: 'typed' })], '2026-10-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-10', shares: 500, price: 420, source: 'typed' })], '2026-10-10T12:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-10-15');
    expect([answer.rows, answer.ask.length, sharesOnRecord(r, A, 'MSFT')]).toEqual([[], 1, 0]);
    expect(answer.ask[0].listed.map((l) => [l.date, l.shares])).toEqual([['2026-07-30', 500]]);
    const mine = addRows(r, answerListQuestion(r, answer.ask[0], false, 'linked', '2026-10-15'), '2026-10-15T18:00:00.000Z');
    expect([sharesOnRecord(mine, A, 'MSFT'), purchasesFromList(mine, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-10-16').ask]).toEqual([0, []]);
  });

  test('2 · "the broker is correct" on a date: only the broker\'s purchase is shown, and the broker\'s history does not ask about the same two dates again', () => {
    let r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-15').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    expect(activityOf(r, A).map((x) => [x.kind, x.date, x.shares])).toEqual([['PURCHASE', '2026-07-30', 500]]);
    const history = [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' })];
    expect(sortArriving(r, history).ask).toEqual([]);
    r = addRows(r, sortArriving(r, history).save, '2026-11-16T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
  });

  test('2 · where the broker\'s list states fewer shares (500 typed, 300 listed), "the broker is correct" keeps only the 200 the list no longer states to show', () => {
    let r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-15').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(300);
    expect(r.filter((x) => x.inListOf && !x.removed).map((x) => [x.date, x.shares])).toEqual([['2026-07-29', 200]]);
  });

  test('2 · "mine is correct" about the list also settles the history\'s question about the same two dates', () => {
    let r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-15').ask;
    r = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    const history = [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' })];
    expect(sortArriving(r, history)).toEqual({ save: [], ask: [] });
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
  });

  test('3 · a purchase dated on the broker\'s list day: the list of Nov 5 says 500, a purchase of 100 dated Nov 5 arrives, the list of Nov 6 says 600 — 600, and nobody is asked', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-05'), '2026-11-05T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-11-05', shares: 100, price: 400, source: 'linked', ref: 'b-2' })]), '2026-11-06T09:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);                        // until a list says, the purchase may already be in the list of Nov 5
    const next = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }, { date: '2026-11-05', shares: 100, price: 400 }], 'linked', '2026-11-06');
    expect(next.ask).toEqual([]);
    r = addRows(r, next.rows, '2026-11-06T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(600);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }, { date: '2026-11-05', shares: 100, price: 400 }], 'linked', '2026-11-07')).toEqual({ rows: [], ask: [] });
  });

  test('4 · a sale dated the day before a broker\'s list that had not caught up: list of Nov 5 says 500, a sale of 200 dated Nov 4 arrives, the next list says 300 — 300 and $14,000, nobody asked', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-11-05'), '2026-11-05T17:00:00.000Z');
    r = addRows(r, rowsNotYetSaved(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-04', shares: 200, price: 420, source: 'linked', ref: 's-1' })]), '2026-11-06T09:00:00.000Z');
    const next = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-06');
    expect(next.ask).toEqual([]);
    r = addRows(r, next.rows, '2026-11-06T17:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, '2')]).toEqual([300, 14000]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-07')).toEqual({ rows: [], ask: [] });
  });
});

// ── PHASE 1, STEP 5: the outside check's findings (0 critical, 1 high, 4 medium, 2 low) ──────────────────────────────
describe('phase 1 outside check: findings', () => {
  test('HIGH · each purchase is shown once in the activity: typed 500 of Jul 29, the broker lists 300 of Jul 30, "the broker is correct", then the history sends its purchase of 500 on Jul 30', () => {
    let r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-15').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    r = addRows(r, sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' })]).save, '2026-11-16T17:00:00.000Z');
    // one purchase of 500, and one line saying the answer took 200 away with no transaction — the activity adds up to 300
    expect(activityOf(r, A).map((x) => [x.kind, x.date, x.shares])).toEqual([['PURCHASE', '2026-07-30', 500], ['ADJUSTMENT', '2026-11-15', -200]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(300);
  });

  test('HIGH · a first link with a short history shows each purchase once: 70 of 2020 (from the list) and 50 of Oct 1 (from the history), then the sale', () => {
    let r: AssetRow[] = [];
    r = addRows(r, rowsNotYetSaved(r, [historyPurchaseRow(r, { accountId: A, holding: 'VTI', date: '2026-10-01', shares: 50, price: 200, source: 'linked', ref: 'b-1' }),
      saleRow({ accountId: A, holding: 'VTI', date: '2026-10-20', shares: 30, price: 230, source: 'linked', ref: 's-1' })]), '2026-11-15T17:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'VTI', [{ date: '2020-01-10', shares: 70, price: 100 }, { date: '2026-10-01', shares: 50, price: 200 }], 'linked', '2026-11-15').rows, '2026-11-15T17:00:00.000Z');
    // the 2020 lot shows as bought: the 70 listed and the 30 the sale took before the list — the activity adds up to 120
    expect(activityOf(r, A).map((x) => [x.kind, x.date, x.shares])).toEqual([['PURCHASE', '2020-01-10', 100], ['PURCHASE', '2026-10-01', 50], ['SALE', '2026-10-20', 30]]);
  });

  test('MEDIUM · "mine is correct" about a sale stays answered after a later answer about the list changed the purchase', () => {
    let r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-09', shares: 200, price: 420, source: 'typed' })], '2026-11-09T12:05:00.000Z');
    const broker = (rec: AssetRow[]): NewRow[] => [historyPurchaseRow(rec, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' })];
    for (const q of sortArriving(r, broker(r)).ask) r = addRows(r, answerEventQuestion(q, 'mine'), '2026-11-11T09:00:00.000Z');
    const [lq] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 200, price: 350 }], 'linked', '2026-11-15').ask;
    r = addRows(r, answerListQuestion(r, lq, true, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    expect(sortArriving(r, broker(r))).toEqual({ save: [], ask: [] });
  });

  test('MEDIUM · after a two-for-one split the confirmation and the correction use the figures shown: 20 shown at $150 (bought 10 at $300); the account holder enters $155 — saved as $310 bought, shown $155', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-03-01', shares: 10, price: 300 }], 'linked', '2026-03-02'), '2026-03-02T17:00:00.000Z');
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-06-01', ratio: 2, source: 'linked', ref: 'x-1' }], '2026-06-01T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.shares, p.price])).toEqual([[20, 150]]);
    expect(differsFromGiven(r, '1', { price: 155 })).toEqual([{ field: 'price', given: 150, entered: 155, holding: 'MSFT', shares: 20 }]);
    r = correctRow(r, '1', { price: 155 }, 'typed', '2026-06-02T09:00:00.000Z').record;
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.shares, p.price])).toEqual([[20, 155]]);
    expect(rowAsItStands(r, '1')!.price).toBe(310);
  });

  test('MEDIUM · "the broker is correct" on an average never averages the dated purchases: 20 of Mar 1 and 40 of Sep 18 stand, the 5 more the broker states are one line with no date and no price', () => {
    let r = addRows([], [purchase('2026-03-01', 20, 150), purchase('2026-09-18', 40, 205)], '2026-09-18T17:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: null, shares: 65, price: 170, average: true }], 'linked', '2026-10-01').ask;
    expect([q.kind, q.sharesOnRecord, q.sharesListed]).toEqual(['count', 60, 65]);
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-10-01'), '2026-10-01T18:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([[null, 5, null], ['2026-03-01', 20, 150], ['2026-09-18', 40, 205]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(65);
    // and the broker states FEWER: 50 — the 10 come from the oldest purchase, kept to show
    let fewer = addRows([], [purchase('2026-03-01', 20, 150), purchase('2026-09-18', 40, 205)], '2026-09-18T17:00:00.000Z');
    const [q2] = purchasesFromList(fewer, A, 'MSFT', [{ date: null, shares: 50, price: 170, average: true }], 'linked', '2026-10-01').ask;
    fewer = addRows(fewer, answerListQuestion(fewer, q2, true, 'linked', '2026-10-01'), '2026-10-01T18:00:00.000Z');
    expect(openPurchases(fewer, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-03-01', 10, 150], ['2026-09-18', 40, 205]]);
  });

  test('MEDIUM · the share check does not flag a gap the account holder answered "mine is correct" for', () => {
    let r = addRows([], [purchase('2026-07-30', 500, 350, { source: 'typed' })], '2026-10-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-10', shares: 500, price: 420, source: 'typed' })], '2026-10-10T12:00:00.000Z');
    r = addRows(r, msftDay('2026-10-15', 430, 500), '2026-10-15T17:00:00.000Z');
    expect(sharesThatDisagree(r, A)).toEqual([{ holding: 'MSFT', onRecord: 0, stated: 500, gap: 500 }]);
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-10-15').ask;
    r = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-10-15'), '2026-10-15T18:00:00.000Z');
    expect(sharesThatDisagree(r, A)).toEqual([]);
  });
});

// ── HIS WORDS, 2026-11-11: "It is important to ensure these are not two separate purchases. So, if broker is listing
//    them as two holding - record them as two, and not one." ───────────────────────────────────────────────────────
describe('one purchase is one line; two lots the broker lists are two', () => {
  test('one lot and one purchase for the same shares: ONE purchase — typed Jul 29 × 500, the broker lists Jul 30 × 300 ("the broker is correct"), the history sends Jul 30 × 500', () => {
    let r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-15').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-11-15'), '2026-11-15T18:00:00.000Z');
    r = addRows(r, sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' })]).save, '2026-11-16T17:00:00.000Z');
    expect([activityOf(r, A).filter((x) => x.kind === 'PURCHASE').length, openPurchases(r, A, 'MSFT').length, sharesOnRecord(r, A, 'MSFT')]).toEqual([1, 1, 300]);
  });

  test('the broker lists two lots on one date (Jul 30 × 300 and Jul 30 × 200) and its history one purchase of 500: TWO purchases are held and shown', () => {
    let r: AssetRow[] = [];
    r = addRows(r, rowsNotYetSaved(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' })]), '2026-11-15T17:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }, { date: '2026-07-30', shares: 200, price: 351 }], 'linked', '2026-11-15').rows, '2026-11-15T17:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-30', 300, 350], ['2026-07-30', 200, 351]]);
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE').map((x) => [x.date, x.shares])).toEqual([['2026-07-30', 300], ['2026-07-30', 200]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
  });

  test('the broker lists two lots a day apart (Jul 29 × 500 and Jul 30 × 500) where the account holder typed one of Jul 29: two purchases — the second is never merged into the first', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-29', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-29', shares: 500, price: 350 }, { date: '2026-07-30', shares: 500, price: 352 }], 'linked', '2026-09-16');
    // a lot dated before the last list that the last list did not state is a question, never a silent purchase — and never merged
    expect(answer.rows).toEqual([]);
    expect(answer.ask.map((q) => [q.listed.map((l) => [l.date, l.shares])])).toEqual([[[['2026-07-30', 500]]]]);
    r = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-09-16'), '2026-09-16T18:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2026-07-29', 500, 350], ['2026-07-30', 500, 352]]);
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE').length).toBe(2);
  });

  test('the history sends two purchases a day apart (Jul 29 × 500 and Jul 30 × 500) where the account holder typed the one of Jul 29: the second is a new purchase, never asked as a date question', () => {
    const r = addRows([], [purchase('2026-07-29', 500, 350, { source: 'typed' })], '2026-11-09T12:00:00.000Z');
    const sorted = sortArriving(r, [
      historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-29', shares: 500, price: 350, source: 'linked', ref: 'b-1' }),
      historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 352, source: 'linked', ref: 'b-2' })]);
    expect([sorted.ask, sorted.save.map((x) => [x.date, x.shares])]).toEqual([[], [['2026-07-30', 500]]]);
  });
});

// ── PHASE 1, ROUND 2 OF THE OUTSIDE CHECK (2 critical, 5 high, 2 medium, 1 low) — his "Go ahead and fix", 2026-11-11 ──
describe('phase 1 round 2: each finding, held', () => {
  test('CRITICAL 1 · his worked steps: typed 100 (Jan 5), 50 (Feb 5), 30 at $90 with no date, a sale of 40 (Mar 1); the broker sends 30 at $90 of Dec 1, 2025 and a sale of 20 (Aug 20) — 120 shares, and one question about the date', () => {
    let r = addRows([], [purchase('2026-01-05', 100, 100, { source: 'typed' }), purchase('2026-02-05', 50, 120, { source: 'typed' }), purchase(null, 30, 90, { source: 'typed' })], '2026-03-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 40, price: 130, source: 'typed' })], '2026-03-01T12:05:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(140);                        // 100 + 50 + 30 − 40
    const broker = (rec: AssetRow[]): NewRow[] => [
      historyPurchaseRow(rec, { accountId: A, holding: 'MSFT', date: '2025-12-01', shares: 30, price: 90, source: 'linked', ref: 'b-1' }),
      saleRow({ accountId: A, holding: 'MSFT', date: '2026-08-20', shares: 20, price: 140, source: 'linked', ref: 's-1' })];
    const sorted = sortArriving(r, broker(r));
    expect(sorted.ask.map((q) => [q.why, q.onRecord.date, q.arriving.date, q.onRecord.shares])).toEqual([['date', null, '2025-12-01', 30]]);
    r = addRows(r, sorted.save, '2026-09-01T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(120);                        // 140 − 20: the broker's 30 is the account holder's 30
    const theirs = addRows(r, answerEventQuestion(sorted.ask[0], 'theirs'), '2026-09-01T18:00:00.000Z');
    // with its date given, the 30 of Dec 1, 2025 is the oldest: the sale of Mar 1 sells it first (30) and 10 of Jan 5; the
    // sale of Aug 20 sells 20 more of Jan 5 — left: Jan 5 × 70 and Feb 5 × 50 = 120, and no question about which tax lot
    expect([sharesOnRecord(theirs, A, 'MSFT'), openPurchases(theirs, A, 'MSFT').map((p) => [p.date, p.shares]), salesNeedingAnAnswer(theirs, A)]).toEqual([120, [['2026-01-05', 70], ['2026-02-05', 50]], []]);
    expect(activityOf(theirs, A).filter((x) => x.kind === 'PURCHASE').map((x) => [x.date, x.shares])).toEqual([['2025-12-01', 30], ['2026-01-05', 100], ['2026-02-05', 50]]);
    expect(sortArriving(theirs, broker(theirs))).toEqual({ save: [], ask: [] });
    const mine = addRows(r, answerEventQuestion(sorted.ask[0], 'mine'), '2026-09-01T18:00:00.000Z');
    expect([sharesOnRecord(mine, A, 'MSFT'), sortArriving(mine, broker(mine))]).toEqual([120, { save: [], ask: [] }]);
  });

  test('CRITICAL 2 · a file re-exported with one price corrected (Jul 1 × 20 at $150 becomes $151): no second purchase — 30 shares, and a question with both prices', () => {
    const file1: NewRow[] = [purchase('2026-03-01', 10, 100, { source: 'file' }), purchase('2026-07-01', 20, 150, { source: 'file' })];
    let r = addRows([], sortArriving([], file1).save, '2026-07-02T12:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(30);
    const file2: NewRow[] = [purchase('2026-03-01', 10, 100, { source: 'file' }), purchase('2026-07-01', 20, 151, { source: 'file' })];
    const sorted = sortArriving(r, file2);
    expect([sorted.save, sorted.ask.map((q) => [q.why, q.onRecord.price, q.arriving.price])]).toEqual([[], [['price', 150, 151]]]);
    r = addRows(r, answerEventQuestion(sorted.ask[0], 'theirs'), '2026-07-10T12:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), openPurchases(r, A, 'MSFT').map((p) => p.price)]).toEqual([30, [100, 151]]);
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE').length).toBe(2);
    expect(sortArriving(r, file2)).toEqual({ save: [], ask: [] });         // the same export again: nothing
  });

  test('CRITICAL 2 · a later export that keeps the first purchase and adds a real second one of the same day and shares at another price: the second is saved', () => {
    let r = addRows([], sortArriving([], [purchase('2026-07-01', 20, 150, { source: 'file' })]).save, '2026-07-02T12:00:00.000Z');
    const sorted = sortArriving(r, [purchase('2026-07-01', 20, 150, { source: 'file' }), purchase('2026-07-01', 20, 152, { source: 'file' })]);
    expect([sorted.ask, sorted.save.map((x) => x.price)]).toEqual([[], [152]]);
    r = addRows(r, sorted.save, '2026-07-10T12:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(40);
  });

  test('a broker that re-sends an event under its own key with another price: a question, never a silent change', () => {
    const r = addRows([], sortArriving([], [{ ...purchase('2026-07-01', 20, 150), ref: 'tx-7' }]).save, '2026-07-02T12:00:00.000Z');
    const sorted = sortArriving(r, [{ ...purchase('2026-07-01', 20, 149.5), ref: 'tx-7' }]);
    expect([sorted.save, sorted.ask.map((q) => [q.why, q.onRecord.price, q.arriving.price])]).toEqual([[], [['price', 150, 149.5]]]);
    expect(sortArriving(r, [{ ...purchase('2026-07-01', 20, 150), ref: 'tx-7' }])).toEqual({ save: [], ask: [] });
  });

  test('HIGH 4 · the account holder corrects a broker\'s tax lot from Jul 30 to Jul 29: the activity shows that purchase once, as corrected', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-07-30', shares: 500, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = addRows(r, sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 500, price: 350, source: 'linked', ref: 'b-1' })]).save, '2026-09-15T17:00:01.000Z');
    r = correctRow(r, '1', { date: '2026-07-29' }, 'typed', '2026-09-16T09:00:00.000Z').record;
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE').map((x) => [x.date, x.shares])).toEqual([['2026-07-29', 500]]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(500);
  });

  test('HIGH 5 · "the broker is correct" on a price ($440 becomes $445): the activity shows that purchase once, at $445', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-09-18', shares: 200, price: 440 }], 'linked', '2026-09-18'), '2026-09-18T17:00:00.000Z');
    r = addRows(r, sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-09-18', shares: 200, price: 440, source: 'linked', ref: 'b-1' })]).save, '2026-09-18T17:00:01.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-09-18', shares: 200, price: 445 }], 'linked', '2026-09-19').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-19'), '2026-09-19T18:00:00.000Z');
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE').map((x) => [x.date, x.shares, x.price])).toEqual([['2026-09-18', 200, 445]]);
  });

  test('HIGH 6 · a purchase the account holder removed, brought back by "the broker is correct", is not asked about again as "taken away" when the history sends it', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-06-10', shares: 20, price: 300 }, { date: '2026-07-30', shares: 10, price: 350 }], 'linked', '2026-09-15'), '2026-09-15T17:00:00.000Z');
    r = removeRow(r, '1', 'typed', '2026-09-16T09:00:00.000Z').record;
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-06-10', shares: 20, price: 300 }, { date: '2026-07-30', shares: 10, price: 350 }], 'linked', '2026-09-17').ask;
    expect(q.kind).toBe('removed');
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-17'), '2026-09-17T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(30);
    const sorted = sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-06-10', shares: 20, price: 300, source: 'linked', ref: 'b-1' })]);
    expect(sorted.ask).toEqual([]);
    expect(sharesOnRecord(addRows(r, sorted.save, '2026-09-18T17:00:00.000Z'), A, 'MSFT')).toBe(30);
  });

  test('HIGH 7 · a sale waiting for "which tax lot" explains a list that states nothing: no question about the list, only the question about the tax lot', () => {
    let r = addRows([], [purchase(null, 20, 50, { source: 'typed' }), purchase('2026-01-10', 30, 100, { source: 'typed' }), purchase('2026-01-20', 10, 110, { source: 'typed' })], '2026-02-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 50, price: 120, source: 'typed' })], '2026-03-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-03-02', shares: 10, price: 120, source: 'typed' })], '2026-03-02T12:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), salesNeedingAnAnswer(r, A).length]).toEqual([0, 2]);
    expect(purchasesFromList(r, A, 'MSFT', [], 'linked', '2026-03-05')).toEqual({ rows: [], ask: [] });
  });

  test('MEDIUM 8 · a broker with no history: the lot of Jan 10 × 50 is listed as 20, then not at all, each answered "the broker is correct" — the activity shows the purchase of 50 throughout', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 50, price: 100 }], 'linked', '2026-02-01'), '2026-02-01T17:00:00.000Z');
    let [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 20, price: 100 }], 'linked', '2026-03-01').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-03-01'), '2026-03-01T18:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), activityOf(r, A).filter((x) => x.kind === 'PURCHASE').map((x) => [x.date, x.shares])]).toEqual([20, [['2026-01-10', 50]]]);
    [q] = purchasesFromList(r, A, 'MSFT', [], 'linked', '2026-04-01').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-04-01'), '2026-04-01T18:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), activityOf(r, A).filter((x) => x.kind === 'PURCHASE').map((x) => [x.date, x.shares])]).toEqual([0, [['2026-01-10', 50]]]);
  });

  test('MEDIUM 9 + LOW 10 · after the account holder typed a price over a broker\'s lot, a change of shares (200 to 190) still shows the broker\'s 200, with the shares held now', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-09-18', shares: 200, price: 440 }], 'linked', '2026-09-18'), '2026-09-18T17:00:00.000Z');
    r = correctRow(r, '1', { price: 442 }, 'typed', '2026-09-19T09:00:00.000Z').record;
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-01', shares: 50, price: 460, source: 'linked' })], '2026-10-01T17:00:00.000Z');
    // and the confirmation names what the change does to the shares held: 150 become 140
    expect(differsFromGiven(r, '1', { shares: 190 })).toEqual([{ field: 'shares', given: 200, entered: 190, holding: 'MSFT', shares: 150 },
      { field: 'sharesHeld', given: 150, entered: 140, holding: 'MSFT', shares: 140 }]);
  });
});

// ── PHASE 1, ROUND 3 OF THE OUTSIDE CHECK (2 critical, 2 high, 5 medium, 1 low) ──────────────────────────────────────
describe('phase 1 round 3: each finding, held', () => {
  /** A broker's list of Sep 18: Jan 10 × 30 @ $100, Mar 1 × 50 @ $120, Apr 1 × 30 @ $130, Sep 18 × 20 @ $210 — 130 shares. */
  const fourLots = (): AssetRow[] => addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 30, price: 100 }, { date: '2026-03-01', shares: 50, price: 120 },
    { date: '2026-04-01', shares: 30, price: 130 }, { date: '2026-09-18', shares: 20, price: 210 }], 'linked', '2026-09-18'), '2026-09-18T17:00:00.000Z');
  const withoutJan10 = [{ date: '2026-03-01', shares: 50, price: 120 }, { date: '2026-04-01', shares: 30, price: 130 }, { date: '2026-09-18', shares: 20, price: 210 }];

  test('CRITICAL 1 · the list of Sep 30 drops Jan 10 × 30, answered "the broker is correct" (100); the sale of Sep 29 × 30 at $225 then arrives — 100 shares, and it sold the Jan 10 shares: 30 × ($225 − $100) = $3,750', () => {
    let r = fourLots();
    const [q] = purchasesFromList(r, A, 'MSFT', withoutJan10, 'linked', '2026-09-30').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-30'), '2026-09-30T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(100);
    r = addRows(r, sortArriving(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-09-29', shares: 30, price: 225, source: 'linked', ref: 's-1' })]).save, '2026-10-01T17:00:00.000Z');
    const sale = r[r.length - 1];
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, sale.rowId)]).toEqual([100, 3750]);
    expect(purchasesFromList(r, A, 'MSFT', withoutJan10, 'linked', '2026-10-01')).toEqual({ rows: [], ask: [] });
  });

  test('CRITICAL 1 · the same with a broker that sends only an average: 130 on average, then 100, answered "the broker is correct"; the sale of 30 arrives — 100 shares, and no question', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 130, price: 140, average: true }], 'linked', '2026-09-18'), '2026-09-18T17:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'VTI', [{ date: null, shares: 100, price: 150, average: true }], 'linked', '2026-09-30').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-30'), '2026-09-30T18:00:00.000Z');
    r = addRows(r, sortArriving(r, [saleRow({ accountId: A, holding: 'VTI', date: '2026-09-29', shares: 30, price: 225, source: 'linked', ref: 's-1' })]).save, '2026-10-01T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'VTI')).toBe(100);
    expect(purchasesFromList(r, A, 'VTI', [{ date: null, shares: 100, price: 150, average: true }], 'linked', '2026-10-01').ask).toEqual([]);
  });

  test('CRITICAL 2 · typed then linked, "both" on the date question and "the broker is correct" on every list question: 120 shares as the broker lists, Feb 5 × 50 kept', () => {
    let r = addRows([], [purchase('2026-01-05', 100, 100, { source: 'typed' }), purchase('2026-02-05', 50, 120, { source: 'typed' }), purchase(null, 30, 90, { source: 'typed' })], '2026-03-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 40, price: 130, source: 'typed' })], '2026-03-01T12:05:00.000Z');
    const sorted = sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2025-12-01', shares: 30, price: 90, source: 'linked', ref: 'b-1' }),
      saleRow({ accountId: A, holding: 'MSFT', date: '2026-08-20', shares: 20, price: 140, source: 'linked', ref: 's-1' })]);
    r = addRows(r, sorted.save, '2026-09-01T17:00:00.000Z');
    r = addRows(r, answerEventQuestion(sorted.ask[0], 'both'), '2026-09-01T17:30:00.000Z');
    const list = [{ date: '2026-01-05', shares: 70, price: 100 }, { date: '2026-02-05', shares: 50, price: 120 }];
    for (let i = 0; i < 5; i++) {
      const ask = purchasesFromList(r, A, 'MSFT', list, 'linked', '2026-09-01').ask;
      if (!ask.length) break;
      r = addRows(r, answerListQuestion(r, ask[0], true, 'linked', '2026-09-01'), `2026-09-01T18:0${i}:00.000Z`);
    }
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(120);
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-01-05', 70], ['2026-02-05', 50]]);
    expect(noChange(purchasesFromList(r, A, 'MSFT', list, 'linked', '2026-09-02'))).toBe(true);
  });

  test('HIGH 3 · a file\'s re-export answered "both" (Mar 1 at $121 is another purchase) does not change what the earlier sale made: the sale of May 1 sold Jan 10 at $100 — $2,000', () => {
    const file1: NewRow[] = [purchase('2026-01-10', 100, 100, { source: 'file' }), purchase('2026-03-01', 50, 120, { source: 'file' }),
      saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 40, price: 150, source: 'file' })];
    let r = addRows([], sortArriving([], file1).save, '2026-06-01T12:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 60, price: 100 }, { date: '2026-03-01', shares: 50, price: 120 }], 'file', '2026-06-01').rows, '2026-06-01T12:00:00.000Z');
    const sale = r.find((x) => x.kind === 'SALE')!;
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, sale.rowId)]).toEqual([110, 2000]);
    const sorted = sortArriving(r, [purchase('2026-01-10', 100, 100, { source: 'file' }), purchase('2026-03-01', 50, 121, { source: 'file' })]);
    expect(sorted.ask.map((q) => q.why)).toEqual(['price']);
    r = addRows(r, answerEventQuestion(sorted.ask[0], 'both'), '2026-07-01T12:00:00.000Z');
    expect(saleGain(r, sale.rowId)).toBe(2000);
  });

  test('HIGH 4 · a split re-sent under its key with another ratio (2-for-1 becomes 3-for-1) is a question; "theirs" gives 300 at $33.33 and a sale of all 300 at $40 made $2,000', () => {
    let r = addRows([], [purchase('2026-01-10', 100, 100)], '2026-01-10T12:00:00.000Z');
    r = addRows(r, sortArriving(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-06-01', ratio: 2, source: 'linked', ref: 'x-1' }]).save, '2026-06-01T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(200);
    const sorted = sortArriving(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-06-01', ratio: 3, source: 'linked', ref: 'x-1' }]);
    expect([sorted.save, sorted.ask.map((q) => [q.why, q.onRecord.ratio, q.arriving.ratio])]).toEqual([[], [['ratio', 2, 3]]]);
    r = addRows(r, answerEventQuestion(sorted.ask[0], 'theirs'), '2026-06-02T09:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => p.shares)).toEqual([300]);
    expect(openPurchases(r, A, 'MSFT')[0].price as number).toBeCloseTo(100 / 3, 9);
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-07-01', shares: 300, price: 40, source: 'linked' })], '2026-07-01T17:00:00.000Z');
    expect(saleGain(r, r[r.length - 1].rowId) as number).toBeCloseTo(2000, 9);
    expect(sortArriving(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-06-01', ratio: 3, source: 'linked', ref: 'x-1' }])).toEqual({ save: [], ask: [] });
  });

  test('MEDIUM 5 · one difference is one question: the history already asks about Mar 1 at $121, so the list does not ask it again; "mine is correct" settles both', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-03-01', shares: 50, price: 120 }], 'linked', '2026-06-01'), '2026-06-01T12:00:00.000Z');
    r = addRows(r, sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 50, price: 120, source: 'linked', ref: 'b-1' })]).save, '2026-06-01T12:00:01.000Z');
    const historyAsks = sortArriving(r, [{ ...historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 50, price: 121, source: 'linked', ref: 'b-1' }) }]).ask;
    expect(historyAsks.map((q) => q.why)).toEqual(['price']);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-03-01', shares: 50, price: 121 }], 'linked', '2026-07-01', historyAsks).ask).toEqual([]);
    r = addRows(r, answerEventQuestion(historyAsks[0], 'mine'), '2026-07-01T18:00:00.000Z');
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-03-01', shares: 50, price: 121 }], 'linked', '2026-07-02').ask).toEqual([]);
  });

  test('MEDIUM 6 · "the broker is correct" over a typed sale of everything: the typed sale is handed back, because the broker still states the shares it sold', () => {
    let r = addRows([], [purchase('2026-01-05', 100, 100, { source: 'typed' })], '2026-01-05T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 100, price: 130, source: 'typed' })], '2026-03-01T12:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-05', shares: 100, price: 100 }], 'linked', '2026-03-05').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-03-05'), '2026-03-05T18:00:00.000Z');
    expect(typedSalesTheListContradicts(r, A)).toEqual([{ rowId: '2', holding: 'MSFT', shares: 100 }]);
  });

  test('MEDIUM 7 + 8 · the activity shows each purchase as bought and as the account holder corrected it: 20 bought Sep 18 at $210, a two-for-one split; the account holder corrects it to 38 shares on screen — shown as 19 at $210', () => {
    let r = fourLots();
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-10-01', ratio: 2, source: 'linked', ref: 'x-1' }], '2026-10-01T17:00:00.000Z');
    const sep18 = () => activityOf(r, A).find((x) => x.kind === 'PURCHASE' && x.date === '2026-09-18')!;
    expect([sep18().shares, sep18().price]).toEqual([20, 210]);
    r = correctRow(r, '4', { shares: 38 }, 'typed', '2026-10-02T09:00:00.000Z').record;
    expect(openPurchases(r, A, 'MSFT').find((p) => p.date === '2026-09-18')!.shares).toBe(38);
    // the purchase keeps the 20 it was bought as; the account holder's correction is its own line: 38 against 40, −2
    expect([sep18().shares, sep18().price]).toEqual([20, 210]);
    expect(activityOf(r, A).filter((x) => x.kind === 'ADJUSTMENT').map((x) => [x.shares, x.word])).toEqual([[-2, 'the account holder corrected the count']]);
    // and a list after the split that states it at 40 @ $105, answered "the broker is correct", still shows it as bought: 20 at $210
    let s = fourLots();
    s = addRows(s, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-10-01', ratio: 2, source: 'linked', ref: 'x-1' }], '2026-10-01T17:00:00.000Z');
    const [q] = purchasesFromList(s, A, 'MSFT', [{ date: '2026-01-10', shares: 60, price: 50 }, { date: '2026-03-01', shares: 100, price: 60 }, { date: '2026-04-01', shares: 60, price: 65 }, { date: '2026-09-18', shares: 40, price: 104 }], 'linked', '2026-10-05').ask;
    s = addRows(s, answerListQuestion(s, q, true, 'linked', '2026-10-05'), '2026-10-05T18:00:00.000Z');
    const shown = activityOf(s, A).find((x) => x.kind === 'PURCHASE' && x.date === '2026-09-18')!;
    expect([shown.shares, shown.price]).toEqual([20, 208]);
  });

  test('MEDIUM 9 · on one day, a value the account holder typed and a later, different one from the broker: the typed one stands, and the two are handed back as a question', () => {
    let r = addRows([], valueRows({ accountId: A, date: '2026-11-03', source: 'typed', cash: 0, holdings: [{ holding: 'MSFT', shares: 10, price: 100, value: 1000 }] }), '2026-11-03T09:00:00.000Z');
    r = addRows(r, msftDay('2026-11-03', 110, 10), '2026-11-03T17:00:00.000Z');
    expect(valuesNow(r, A)!.total).toBe(1000);
    expect(valuesThatDiffer(r, A).map((d) => [d.typed.total, d.given.total])).toEqual([[1000, 1100]]);
  });

  test('LOW 10 · over a price the account holder typed, a NEW price from the broker is asked; the price the broker gave before is not', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-04-01', shares: 30, price: 130 }], 'linked', '2026-04-02'), '2026-04-02T17:00:00.000Z');
    r = correctRow(r, '1', { price: 132 }, 'typed', '2026-04-03T09:00:00.000Z').record;
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-04-01', shares: 30, price: 130 }], 'linked', '2026-04-04').ask).toEqual([]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-04-01', shares: 30, price: 128 }], 'linked', '2026-04-05').ask.map((q) => [q.kind, q.listed[0].price])).toEqual([['price', 128]]);
  });
});

// ── PHASE 1, ROUND 4 OF THE OUTSIDE CHECK (1 critical, 3 high, 1 low) ────────────────────────────────────────────────
describe('phase 1 round 4: each finding, held', () => {
  test('CRITICAL 1 · "the broker is correct" with a sale already on record: held Jan 10 × 70 @ $100 (40 sold Sep 24), Mar 10 × 50, Sep 18 × 20 = 100; the list of Oct 5 says Jan 10 × 20 — 90 shares, the sale still made 40 × ($150 − $100) = $2,000, and nothing is asked again', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 70, price: 100 }, { date: '2026-03-10', shares: 50, price: 120 }, { date: '2026-09-18', shares: 20, price: 210 }], 'linked', '2026-09-18'), '2026-09-18T17:00:00.000Z');
    r = addRows(r, sortArriving(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-09-24', shares: 40, price: 150, source: 'linked', ref: 's-1' })]).save, '2026-09-24T17:00:00.000Z');
    const sale = r[r.length - 1];
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, sale.rowId)]).toEqual([100, 2000]);
    const list = [{ date: '2026-01-10', shares: 20, price: 100 }, { date: '2026-03-10', shares: 50, price: 120 }, { date: '2026-09-18', shares: 20, price: 210 }];
    const [q] = purchasesFromList(r, A, 'MSFT', list, 'linked', '2026-10-05').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-10-05'), '2026-10-05T18:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, sale.rowId)]).toEqual([90, 2000]);
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-01-10', 20], ['2026-03-10', 50], ['2026-09-18', 20]]);
    expect(purchasesFromList(r, A, 'MSFT', list, 'linked', '2026-10-06')).toEqual({ rows: [], ask: [] });
    expect(purchasesFromList(r, A, 'MSFT', list, 'linked', '2026-10-07')).toEqual({ rows: [], ask: [] });
  });

  test('CRITICAL 1 · the same for a broker\'s average: held Mar 50 @ $100, May 50 @ $110, Sep 10 @ $130 = 110; the average says 100, "the broker is correct" — 100, and the count is not asked again', () => {
    let r = addRows([], [purchase('2026-03-01', 50, 100), purchase('2026-05-01', 50, 110), purchase('2026-09-01', 10, 130)], '2026-09-02T17:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: null, shares: 100, price: 108, average: true }], 'linked', '2026-10-05').ask;
    expect([q.kind, q.sharesOnRecord, q.sharesListed]).toEqual(['count', 110, 100]);
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-10-05'), '2026-10-05T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(100);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: null, shares: 100, price: 108, average: true }], 'linked', '2026-10-06').ask).toEqual([]);
  });

  test('HIGH 2 · "theirs" to a file\'s corrected price corrects the tax lot that holds the shares too: Feb 5 × 50 at $61 everywhere, and the same file again asks nothing', () => {
    const file = (feb5: number): NewRow[] => [purchase('2026-01-05', 80, 50, { source: 'file' }), purchase('2026-02-05', 50, feb5, { source: 'file' })];
    const list = (feb5: number) => [{ date: '2026-01-05', shares: 80, price: 50 }, { date: '2026-02-05', shares: 50, price: feb5 }];
    let r = addRows([], sortArriving([], file(60)).save, '2026-11-04T18:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'MSFT', list(60), 'file', '2026-06-21').rows, '2026-11-04T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(130);
    const sorted = sortArriving(r, file(61));
    expect(sorted.ask.map((q) => q.why)).toEqual(['price']);
    r = addRows(r, answerEventQuestion(sorted.ask[0], 'theirs', r), '2026-11-20T18:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.price])).toEqual([['2026-01-05', 50], ['2026-02-05', 61]]);
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE').map((x) => [x.date, x.price])).toEqual([['2026-01-05', 50], ['2026-02-05', 61]]);
    expect(purchasesFromList(r, A, 'MSFT', list(61), 'file', '2026-11-20')).toEqual({ rows: [], ask: [] });
    expect(sortArriving(r, file(61))).toEqual({ save: [], ask: [] });
  });

  /** Typed: Feb 1 × 40 @ $100 and 30 @ $90 with no date. The broker's history then sends Jan 15 × 30 @ $90, its list Jan 15 × 30 (and Feb 1 × 40). */
  const typedThenLinked = (): AssetRow[] => addRows([], [purchase('2026-02-01', 40, 100, { source: 'typed' }), purchase(null, 30, 90, { source: 'typed' })], '2026-03-01T12:00:00.000Z');
  const history = (r: AssetRow[]) => [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-01-15', shares: 30, price: 90, source: 'linked', ref: 'b-1' })];
  const list = [{ date: '2026-01-15', shares: 30, price: 90 }, { date: '2026-02-01', shares: 40, price: 100 }];

  test('HIGH 3 · one difference is asked once: the undated 30 and the broker\'s Jan 15 × 30 are one question, asked by the history and not again by the list', () => {
    const r = typedThenLinked();
    const sorted = sortArriving(r, history(r));
    expect(sorted.ask.map((q) => [q.why, q.onRecord.date, q.arriving.date])).toEqual([['date', null, '2026-01-15']]);
    expect(purchasesFromList(r, A, 'MSFT', list, 'linked', '2026-11-15', sorted.ask).ask).toEqual([]);
  });

  test('HIGH 4 · "mine is correct" on that date question settles the list too: the purchase stays with no date, nothing is asked, 70 shares', () => {
    let r = typedThenLinked();
    const sorted = sortArriving(r, history(r));
    r = addRows(r, answerEventQuestion(sorted.ask[0], 'mine', r), '2026-11-15T18:00:00.000Z');
    expect(noChange(purchasesFromList(r, A, 'MSFT', list, 'linked', '2026-11-15'))).toBe(true);
    expect([sharesOnRecord(r, A, 'MSFT'), openPurchases(r, A, 'MSFT').map((p) => p.date)]).toEqual([70, [null, '2026-02-01']]);
    // and "theirs": the purchase takes Jan 15, and the list asks nothing
    let t = typedThenLinked();
    const q = sortArriving(t, history(t)).ask[0];
    t = addRows(t, answerEventQuestion(q, 'theirs', t), '2026-11-15T18:00:00.000Z');
    expect(purchasesFromList(t, A, 'MSFT', list, 'linked', '2026-11-15').ask).toEqual([]);
    expect(openPurchases(t, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-01-15', 30], ['2026-02-01', 40]]);
  });

  test('LOW 5 · the account holder\'s answer about a typed value and the broker\'s same-day value is kept: not asked again', () => {
    let r = addRows([], valueRows({ accountId: A, date: '2026-09-15', source: 'typed', cash: 0, holdings: [{ holding: 'MSFT', shares: 10, price: 1194, value: 11940 }] }), '2026-09-15T09:00:00.000Z');
    r = addRows(r, msftDay('2026-09-15', 1200, 10), '2026-09-15T17:00:00.000Z');
    const [d] = valuesThatDiffer(r, A);
    const mine = addRows(r, answerValuesQuestion(d, 'mine'), '2026-09-15T18:00:00.000Z');
    expect([valuesThatDiffer(mine, A), valuesNow(mine, A)!.total]).toEqual([[], 11940]);
    const theirs = addRows(r, answerValuesQuestion(d, 'theirs'), '2026-09-15T18:00:00.000Z');
    expect([valuesThatDiffer(theirs, A), valuesNow(theirs, A)!.total]).toEqual([[], 12000]);
  });
});

// ── PHASE 1, ROUND 5 OF THE OUTSIDE CHECK (1 critical, 3 high — one cause: an answer was never checked against the
//    record as it stands; 4 medium, 3 low) ────────────────────────────────────────────────────────────────────────
describe('phase 1 round 5: each finding, held', () => {
  test('CRITICAL 1 · a question answered after the sale that settles it changes nothing: lots Jan 10 × 30, Mar 5 × 50, May 5 × 50, Sep 8 × 20 (150); the Sep 25 list leaves out Jan 10; the sale of 30 arrives; then "the broker is correct" — 120 shares, the sale still made $2,250', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 30, price: 100 }, { date: '2026-03-05', shares: 50, price: 120 },
      { date: '2026-05-05', shares: 50, price: 130 }, { date: '2026-09-08', shares: 20, price: 140 }], 'linked', '2026-09-08'), '2026-09-08T17:00:00.000Z');
    const list = [{ date: '2026-03-05', shares: 50, price: 120 }, { date: '2026-05-05', shares: 50, price: 130 }, { date: '2026-09-08', shares: 20, price: 140 }];
    const [q] = purchasesFromList(r, A, 'MSFT', list, 'linked', '2026-09-25').ask;
    r = addRows(r, sortArriving(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-09-24', shares: 30, price: 175, source: 'linked', ref: 's-1' })]).save, '2026-09-26T17:00:00.000Z');
    const sale = r[r.length - 1];
    expect([sharesOnRecord(r, A, 'MSFT'), saleGain(r, sale.rowId)]).toEqual([120, 2250]);   // 30 × ($175 − $100)
    expect(answerListQuestion(r, q, true, 'linked', '2026-09-25')).toEqual([]);              // the question no longer stands
    expect(answerListQuestion(r, q, false, 'linked', '2026-09-25')).toEqual([]);
  });

  test('HIGH 2 · "the broker is correct" saved twice changes nothing the second time: Jan 10 × 70, the list says 40 — 40, one lot', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 70, price: 100 }], 'linked', '2026-02-01'), '2026-02-01T17:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 40, price: 100 }], 'linked', '2026-03-01').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-03-01'), '2026-03-01T18:00:00.000Z');
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-03-01'), '2026-03-01T18:00:05.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), openPurchases(r, A, 'MSFT').length]).toEqual([40, 1]);
  });

  test('HIGH 3 · "both" saved twice saves the broker\'s purchase once: typed Jul 29 × 30 @ $90, the broker\'s Jul 30 × 30 @ $95 — 60 shares', () => {
    let r = addRows([], [purchase('2026-07-29', 30, 90, { source: 'typed' })], '2026-08-01T12:00:00.000Z');
    const [q] = sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-07-30', shares: 30, price: 95, source: 'linked', ref: 'b-1' })]).ask;
    r = addRows(r, answerEventQuestion(q, 'both', r), '2026-08-02T09:00:00.000Z');
    r = addRows(r, answerEventQuestion(q, 'both', r), '2026-08-02T09:00:05.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(60);
  });

  test('HIGH 4 · the account holder types 75 over the broker\'s 70, then accepts the broker\'s 70: the activity and the holdings both say 70', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 70, price: 100 }, { date: '2026-03-05', shares: 50, price: 120 }], 'linked', '2026-03-06'), '2026-03-06T17:00:00.000Z');
    r = correctRow(r, '1', { shares: 75 }, 'typed', '2026-03-07T09:00:00.000Z').record;
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 70, price: 100 }, { date: '2026-03-05', shares: 50, price: 120 }], 'linked', '2026-03-08').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-03-08'), '2026-03-08T18:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').find((p) => p.date === '2026-01-10')!.shares).toBe(70);
    expect(activityOf(r, A).find((x) => x.kind === 'PURCHASE' && x.date === '2026-01-10')!.shares).toBe(70);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(120);
  });

  test('MEDIUM 5 · a broker\'s average at another price, the shares unchanged, is asked: 100 at $100, then 100 at $130', () => {
    let r = addRows([], purchasesToAdd([], A, 'VTI', [{ date: null, shares: 100, price: 100, average: true }], 'linked', '2026-02-01'), '2026-02-01T17:00:00.000Z');
    const answer = purchasesFromList(r, A, 'VTI', [{ date: null, shares: 100, price: 130, average: true }], 'linked', '2026-03-01');
    expect([answer.rows, answer.ask.map((q) => [q.kind, q.listed[0].price])]).toEqual([[], [['price', 130]]]);
    r = addRows(r, answerListQuestion(r, answer.ask[0], true, 'linked', '2026-03-01'), '2026-03-01T18:00:00.000Z');
    expect(openPurchases(r, A, 'VTI').map((p) => p.price)).toEqual([130]);
    expect(purchasesFromList(r, A, 'VTI', [{ date: null, shares: 100, price: 130, average: true }], 'linked', '2026-03-02').ask).toEqual([]);
    // over dated purchases the average is never a purchase price: asked once a stated average moves, answered, nothing averaged
    let d = addRows([], [purchase('2026-01-10', 100, 100)], '2026-01-10T12:00:00.000Z');
    d = addRows(d, purchasesFromList(d, A, 'MSFT', [{ date: null, shares: 100, price: 100, average: true }], 'linked', '2026-02-01').rows, '2026-02-01T17:00:00.000Z');
    const moved = purchasesFromList(d, A, 'MSFT', [{ date: null, shares: 100, price: 130, average: true }], 'linked', '2026-03-01');
    expect(moved.ask.map((q) => q.kind)).toEqual(['price']);
    d = addRows(d, answerListQuestion(d, moved.ask[0], true, 'linked', '2026-03-01'), '2026-03-01T18:00:00.000Z');
    expect([openPurchases(d, A, 'MSFT').map((p) => [p.date, p.price]), purchasesFromList(d, A, 'MSFT', [{ date: null, shares: 100, price: 130, average: true }], 'linked', '2026-03-02').ask])
      .toEqual([[['2026-01-10', 100]], []]);
  });

  test('MEDIUM 6 · two lots of one date and shares are matched by their price: Feb 10 × 40 @ $60 and @ $61 are both held, and the list stating both asks nothing', () => {
    const r = addRows([], [purchase('2026-01-05', 70, 50, { source: 'file', stillHeldOn: '2026-06-21' }), purchase('2026-02-10', 40, 60, { source: 'file', stillHeldOn: '2026-06-21' }),
      purchase('2026-02-10', 40, 61, { source: 'typed' })], '2026-07-01T12:00:00.000Z');
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-05', shares: 70, price: 50 }, { date: '2026-02-10', shares: 40, price: 60 }, { date: '2026-02-10', shares: 40, price: 61 }], 'file', '2026-07-01');
    expect(answer.ask).toEqual([]);
  });

  test('MEDIUM 8 · fewer shares on a count answer come first from the purchase the account holder raised by hand: Mar 5 × 70 and Sep 8 × 100 typed up to 110; the average says 170 — Sep 8 goes back to 100, Mar 5 stays 70', () => {
    let r = addRows([], [purchase('2026-03-05', 70, 100), purchase('2026-09-08', 100, 150)], '2026-09-09T12:00:00.000Z');
    r = correctRow(r, '2', { shares: 110 }, 'typed', '2026-09-10T09:00:00.000Z').record;
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: null, shares: 170, price: 132, average: true }], 'linked', '2026-09-11').ask;
    expect([q.kind, q.sharesOnRecord, q.sharesListed]).toEqual(['count', 180, 170]);
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-11'), '2026-09-11T18:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-03-05', 70], ['2026-09-08', 100]]);
  });
});

// ── PHASE 1, ROUND 6 OF THE OUTSIDE CHECK (0 critical, 7 high, 4 medium, 4 low) ─────────────────────────────────────
describe('phase 1 round 6: each finding, held', () => {
  /** A broker's tax lot of Jan 10 × 100 @ $100 (list of Feb 1). */
  const lot100 = () => addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 100, price: 100 }], 'linked', '2026-02-01'), '2026-02-01T17:00:00.000Z');
  const purchasesShown = (r: AssetRow[]) => activityOf(r, A).filter((x) => x.kind === 'PURCHASE' || x.kind === 'ADJUSTMENT').map((x) => [x.kind, x.date, x.shares]);
  const addsUp = (r: AssetRow[], h = 'MSFT') => activityOf(r, A).filter((x) => x.holding === h).reduce((n, x) => n + (x.kind === 'PURCHASE' || x.kind === 'ADJUSTMENT' ? x.shares ?? 0 : x.kind === 'SALE' ? -(x.shares ?? 0) : 0), 0);

  test('HIGH 4 · after "the broker is correct" with no sale on record, the activity adds up: bought 100, an adjustment of −40, 60 held', () => {
    let r = lot100();
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 60, price: 100 }], 'linked', '2026-09-15').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-15'), '2026-09-15T18:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), purchasesShown(r), addsUp(r)]).toEqual([60, [['PURCHASE', '2026-01-10', 100], ['ADJUSTMENT', '2026-09-15', -40]], 60]);
  });

  test('HIGH 5 · a typed sale that explains a list answered "the broker is correct" is not called a contradiction: the sale of 40 on Sep 10 made $2,000, and the activity adds up with no adjustment', () => {
    let r = lot100();
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 60, price: 100 }], 'linked', '2026-09-15').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-15'), '2026-09-15T18:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-09-10', shares: 40, price: 150, source: 'typed' })], '2026-09-16T09:00:00.000Z');
    const sale = r[r.length - 1];
    expect([typedSalesTheListContradicts(r, A), saleGain(r, sale.rowId), sharesOnRecord(r, A, 'MSFT')]).toEqual([[], 2000, 60]);
    expect([purchasesShown(r), addsUp(r)]).toEqual([[['PURCHASE', '2026-01-10', 100]], 60]);
  });

  test('HIGH 1 · removing a purchase an answer had touched is the account holder\'s own removal: it leaves the activity, and the next update asks "removed"', () => {
    let r = lot100();
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 60, price: 100 }], 'linked', '2026-09-15').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-15'), '2026-09-15T18:00:00.000Z');
    const lot = openPurchases(r, A, 'MSFT')[0];
    r = removeRow(r, lot.rowId, 'typed', '2026-09-16T09:00:00.000Z').record;
    const removal = r[r.length - 1];
    expect([removal.byAnswer, removal.standsFor, sharesOnRecord(r, A, 'MSFT')]).toEqual([undefined, undefined, 0]);
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE')).toEqual([]);
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 60, price: 100 }], 'linked', '2026-09-17').ask.map((x) => x.kind)).toEqual(['removed']);
  });

  test('HIGH 2 · correcting only a price leaves the shares the activity shows: Jan 10 bought 70 @ $100, the account holder corrects the price to $90 — 70 @ $90', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 70, price: 100 }], 'linked', '2026-02-01'), '2026-02-01T17:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 30, price: 100 }], 'linked', '2026-03-01').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-03-01'), '2026-03-01T18:00:00.000Z');
    r = correctRow(r, openPurchases(r, A, 'MSFT')[0].rowId, { price: 90 }, 'typed', '2026-03-02T09:00:00.000Z').record;
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE').map((x) => [x.date, x.shares, x.price])).toEqual([['2026-01-10', 70, 90]]);
    expect([sharesOnRecord(r, A, 'MSFT'), addsUp(r)]).toEqual([30, 30]);
  });

  test('HIGH 3 · "mine is correct" stands after the account holder then corrects only a price: the same file again asks nothing', () => {
    const list = [{ date: '2026-01-10', shares: 60, price: 50 }, { date: '2026-06-01', shares: 50, price: 60 }];
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 70, price: 50 }, { date: '2026-06-01', shares: 50, price: 60 }], 'file', '2026-06-21'), '2026-06-21T12:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', list, 'file', '2026-07-01').ask;
    r = addRows(r, answerListQuestion(r, q, false, 'file', '2026-07-01'), '2026-07-01T18:00:00.000Z');
    r = correctRow(r, '1', { price: 49 }, 'typed', '2026-07-02T09:00:00.000Z').record;
    expect(purchasesFromList(r, A, 'MSFT', list, 'file', '2026-07-03').ask).toEqual([]);
  });

  test('LOW 14 · an answer can be changed: "mine is correct" first, "the broker is correct" later — 60 held', () => {
    let r = lot100();
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 60, price: 100 }], 'linked', '2026-09-15').ask;
    r = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-09-15'), '2026-09-15T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(100);
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-15'), '2026-09-16T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(60);
  });

  test('MEDIUM 8 · a split re-sent with another ratio is ONE question: the list asks nothing about that holding until it is answered', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 30, price: 100 }, { date: '2026-02-10', shares: 20, price: 120 }], 'linked', '2026-03-01'), '2026-03-01T17:00:00.000Z');
    r = addRows(r, sortArriving(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-06-01', ratio: 2, source: 'linked', ref: 'x-1' }]).save, '2026-06-01T17:00:00.000Z');
    const events = sortArriving(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-06-01', ratio: 3, source: 'linked', ref: 'x-1' }]).ask;
    const lists = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 90, price: 33.33 }, { date: '2026-02-10', shares: 60, price: 40 }], 'linked', '2026-06-02', events).ask;
    expect([events.length, lists.length]).toEqual([1, 0]);
  });

  test('MEDIUM 9 + LOW 11 · one difference in values is one question, and an answer saved twice saves nothing more', () => {
    let r = addRows([], valueRows({ accountId: A, date: '2026-09-10', source: 'typed', cash: 0, holdings: [{ holding: 'MSFT', shares: 10, price: 1365, value: 13650 }] }), '2026-09-10T09:00:00.000Z');
    r = addRows(r, msftDay('2026-09-10', 1332.5, 10), '2026-09-10T12:00:00.000Z');
    const [d] = valuesThatDiffer(r, A);
    r = addRows(r, answerValuesQuestion(d, 'theirs', r), '2026-09-10T13:00:00.000Z');
    expect(answerValuesQuestion(d, 'theirs', r)).toEqual([]);
    r = addRows(r, msftDay('2026-09-10', 1339, 10), '2026-09-10T17:00:00.000Z');
    expect(valuesThatDiffer(r, A).map((x) => [x.typed.total, x.given.total])).toEqual([[13325, 13390]]);
  });

  test('MEDIUM 10 · a typed date change that moves what a past sale made says so in the confirmation: Jan 10 × 100 @ $100 moved to May 15 — the May 1 sale goes from $1,500 to $600', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2026-01-10', shares: 100, price: 100 }, { date: '2026-03-10', shares: 50, price: 130 }], 'linked', '2026-04-01'), '2026-04-01T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 30, price: 150, source: 'linked' })], '2026-05-01T17:00:00.000Z');
    expect(saleGain(r, '3')).toBe(1500);
    const confirm = differsFromGiven(r, '1', { date: '2026-05-15' });
    expect(confirm.map((d) => [d.field, d.given, d.entered])).toEqual([['date', '2026-01-10', '2026-05-15'], ['saleGain', 1500, 600]]);
  });

  test('LOW 12 · a sale of every share it could have sold asks nothing about which tax lot: 40 with no date and Mar 10 × 20, a sale of 60', () => {
    let r = addRows([], [purchase(null, 40, 90, { source: 'typed' }), purchase('2026-03-10', 20, 100, { source: 'typed' })], '2026-04-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-04-10', shares: 60, price: 120, source: 'typed' })], '2026-04-10T12:00:00.000Z');
    expect([salesNeedingAnAnswer(r, A), saleGain(r, '3'), sharesOnRecord(r, A, 'MSFT')]).toEqual([[], 40 * 30 + 20 * 20, 0]);
  });
});

describe('phase 1 round 6: a count answer after the account holder raised a count', () => {
  test('HIGH 6 · Mar 10 × 20 and Sep 3 × 20 from the broker; the account holder raises Sep 3 to 25; the average says 40, "the broker is correct" — Sep 3 shows 20, and the activity adds up to 40', () => {
    let r = addRows([], [purchase('2026-03-10', 20, 100), purchase('2026-09-03', 20, 144)], '2026-09-04T12:00:00.000Z');
    r = correctRow(r, '2', { shares: 25 }, 'typed', '2026-09-05T09:00:00.000Z').record;
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: null, shares: 40, price: 122, average: true }], 'linked', '2026-09-06').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-09-06'), '2026-09-06T18:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => [p.date, p.shares])).toEqual([['2026-03-10', 20], ['2026-09-03', 20]]);
    // each purchase keeps its count; the account holder's +5 and the answer's −5 are each a line of their own
    expect(activityOf(r, A).filter((x) => x.kind === 'PURCHASE' || x.kind === 'ADJUSTMENT').map((x) => [x.kind, x.date, x.shares])).toEqual([
      ['PURCHASE', '2026-03-10', 20], ['PURCHASE', '2026-09-03', 20], ['ADJUSTMENT', '2026-09-05', 5], ['ADJUSTMENT', '2026-09-06', -5]]);
  });
});

// ── PHASE 1, ROUND 7 OF THE OUTSIDE CHECK (0 critical, 5 high, 3 medium, 1 low) ─────────────────────────────────────
describe('phase 1 round 7: each finding, held', () => {
  const adds = (r: AssetRow[], h = 'MSFT') => activityOf(r, A).filter((x) => x.holding === h);

  /** History: Jan 10 × 100 @ $100, Mar 1 × 50 @ $120, a sale of 40 @ $150 on May 1. First list (Sep 15): Jan 10 × 90, Mar 1 × 50 — 140. */
  const lifeA = (): AssetRow[] => {
    let r: AssetRow[] = [];
    r = addRows(r, sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-01-10', shares: 100, price: 100, source: 'linked', ref: 'b-1' }),
      historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 50, price: 120, source: 'linked', ref: 'b-2' }),
      saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 40, price: 150, source: 'linked', ref: 's-1' })]).save, '2026-09-15T17:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 90, price: 100 }, { date: '2026-03-01', shares: 50, price: 120 }], 'linked', '2026-09-15').rows, '2026-09-15T17:00:00.000Z');
    return r;
  };

  test('first day of life A holds: 140 shares as the broker lists, and the activity adds up', () => {
    const r = lifeA();
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(140);
    expect(adds(r).reduce((n, x) => n + (x.kind === 'SALE' ? -(x.shares ?? 0) : x.shares ?? 0), 0)).toBe(140);
  });

  test('HIGH 1 · an old sale the first list already counted does not "explain" a new gap: the Oct 1 list says Jan 10 × 60 — the account holder is asked, nothing is saved silently', () => {
    const r = lifeA();
    const answer = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 60, price: 100 }, { date: '2026-03-01', shares: 50, price: 120 }], 'linked', '2026-10-01');
    expect([answer.rows, answer.ask.length, sharesOnRecord(r, A, 'MSFT')]).toEqual([[], 1, 140]);
  });

  test('HIGH 2 · after a split the activity needs no adjustment: typed 100 @ $10 (Jan 1), sold 40 (Feb 1), a two-for-one split (Mar 1) — 120 held, the activity adds up to 120 with no adjustment', () => {
    let r = addRows([], [purchase('2026-01-01', 100, 10, { source: 'typed' })], '2026-01-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-02-01', shares: 40, price: 12, source: 'typed' })], '2026-02-01T12:00:00.000Z');
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-03-01', ratio: 2, source: 'typed' }], '2026-03-01T12:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), adds(r).filter((x) => x.kind === 'ADJUSTMENT')]).toEqual([120, []]);
  });

  test('HIGH 3 · a purchase the account holder removed leaves the activity with its history row: remove Mar 1 — 90 held, no Mar 1 line', () => {
    let r = lifeA();
    const mar1 = openPurchases(r, A, 'MSFT').find((p) => p.date === '2026-03-01')!;
    r = removeRow(r, mar1.rowId, 'typed', '2026-09-16T09:00:00.000Z').record;
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(90);
    // no Mar 1 line; the one adjustment is the 30 Jan 10 shares the broker lists that its history does not explain
    // (history: 100 bought, 40 sold = 60; the list says 90) — they were held before the record begins
    expect(adds(r).filter((x) => x.date === '2026-03-01')).toEqual([]);
    expect(adds(r).filter((x) => x.kind === 'ADJUSTMENT').map((x) => [x.date, x.shares, x.word])).toEqual([[null, 30, 'held before the record begins']]);
  });

  test('HIGH 4 · a price correction reaches every copy of the purchase, and the confirmation names the sale it moves: Jan 5 bought 100 @ $50 (file), 40 @ $60, a sale of 30 @ $70; the list says Jan 5 × 70 — corrected to $45, the sale goes from $600 to $750', () => {
    const file: NewRow[] = [purchase('2026-01-05', 100, 50, { source: 'file' }), purchase('2026-02-05', 40, 60, { source: 'file' }), saleRow({ accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 30, price: 70, source: 'file' })];
    let r = addRows([], sortArriving([], file).save, '2026-06-21T12:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-05', shares: 70, price: 50 }, { date: '2026-02-05', shares: 40, price: 60 }], 'file', '2026-06-21').rows, '2026-06-21T12:00:00.000Z');
    const sale = r.find((x) => x.kind === 'SALE')!;
    expect(saleGain(r, sale.rowId)).toBe(600);
    const lot = openPurchases(r, A, 'MSFT').find((p) => p.date === '2026-01-05')!;
    expect(differsFromGiven(r, lot.rowId, { price: 45 }).map((d) => [d.field, d.given, d.entered])).toEqual([['price', 50, 45], ['saleGain', 600, 750]]);
    r = correctRow(r, lot.rowId, { price: 45 }, 'typed', '2026-07-01T09:00:00.000Z').record;
    expect([saleGain(r, sale.rowId), openPurchases(r, A, 'MSFT').find((p) => p.date === '2026-01-05')!.price]).toEqual([750, 45]);
    expect(adds(r).filter((x) => x.kind === 'PURCHASE' || x.kind === 'ADJUSTMENT').map((x) => [x.kind, x.date, x.shares, x.price])).toEqual([['PURCHASE', '2026-01-05', 100, 45], ['PURCHASE', '2026-02-05', 40, 60]]);
  });

  test('HIGH 5 · a changed answer is taken: "mine" then "theirs" on a date question dates the purchase; on a value question it takes the broker\'s value', () => {
    let r = addRows([], [purchase(null, 30, 90, { source: 'typed' })], '2026-03-01T12:00:00.000Z');
    const [q] = sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2025-12-01', shares: 30, price: 90, source: 'linked', ref: 'b-1' })]).ask;
    r = addRows(r, answerEventQuestion(q, 'mine', r), '2026-03-02T09:00:00.000Z');
    r = addRows(r, answerEventQuestion(q, 'theirs', r), '2026-03-03T09:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT').map((p) => p.date)).toEqual(['2025-12-01']);
    let v = addRows([], valueRows({ accountId: A, date: '2026-09-15', source: 'typed', cash: 0, holdings: [{ holding: 'MSFT', shares: 1, price: 100, value: 100 }] }), '2026-09-15T09:00:00.000Z');
    v = addRows(v, msftDay('2026-09-15', 150, 1), '2026-09-15T17:00:00.000Z');
    const [d] = valuesThatDiffer(v, A);
    v = addRows(v, answerValuesQuestion(d, 'mine', v), '2026-09-15T18:00:00.000Z');
    v = addRows(v, answerValuesQuestion(d, 'theirs', v), '2026-09-15T19:00:00.000Z');
    expect(valuesNow(v, A)!.total).toBe(150);
  });

  test('MEDIUM 6 · each answer is its own adjustment line, and shares from before the record are one line of their own', () => {
    let r = lifeA();
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2026-01-10', shares: 65, price: 100 }, { date: '2026-03-01', shares: 50, price: 120 }], 'linked', '2026-10-05').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-10-05'), '2026-10-05T18:00:00.000Z');
    const lines = adds(r).filter((x) => x.kind === 'ADJUSTMENT').map((x) => [x.date, x.shares]);
    expect(lines).toContainEqual(['2026-10-05', -25]);
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(115);
    expect(adds(r).reduce((n, x) => n + (x.kind === 'SALE' ? -(x.shares ?? 0) : x.shares ?? 0), 0)).toBe(115);
  });

  test('MEDIUM 7 · after sales waiting for "which tax lot" take every share that is left, no purchase is listed as open', () => {
    let r = addRows([], [purchase(null, 20, 80, { source: 'typed' }), purchase('2026-02-01', 50, 100, { source: 'typed' }), purchase('2026-04-01', 100, 110, { source: 'typed' }), purchase('2026-09-19', 10, 130, { source: 'typed' })], '2026-09-20T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-01', shares: 30, price: 140, source: 'typed' })], '2026-10-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-10-02', shares: 150, price: 140, source: 'typed' })], '2026-10-02T12:00:00.000Z');
    expect([sharesOnRecord(r, A, 'MSFT'), openPurchases(r, A, 'MSFT')]).toEqual([0, []]);
  });
});

// ── PHASE 1, ROUND 8 OF THE OUTSIDE CHECK (0 critical, 8 high, 3 medium, 1 low) ─────────────────────────────────────
describe('phase 1 round 8: each finding, held', () => {
  const sum = (r: AssetRow[], h = 'MSFT') => {
    let n = 0;
    const rows = activityOf(r, A).filter((x) => x.holding === h);
    const splits = rows.filter((x) => x.kind === 'SPLIT');
    for (const x of rows) {
      if (x.kind === 'SPLIT') continue;
      const after = splits.filter((sp) => (sp.date ?? '') > (x.date ?? '') && x.kind !== 'ADJUSTMENT').reduce((f, sp) => f * (sp.ratio ?? 1), 1);
      n += (x.kind === 'PURCHASE' ? 1 : x.kind === 'ADJUSTMENT' ? 1 : x.kind === 'SALE' || (x.kind === 'TRANSFER' && x.accountId === A && !x.arrives) ? -1 : 0) * (x.shares ?? 0) * after;
    }
    return n;
  };
  /** History: 2025-01-10 × 100 @ $200, 2026-03-01 × 50 @ $300, a sale of 30 on May 1; the list of Jun 1: 70 @ $200 and 50 @ $300. */
  const life = (): AssetRow[] => {
    let r: AssetRow[] = [];
    r = addRows(r, sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2025-01-10', shares: 100, price: 200, source: 'linked', ref: 'b-1' }),
      historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 50, price: 300, source: 'linked', ref: 'b-2' }),
      saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 30, price: 350, source: 'linked', ref: 's-1' })]).save, '2026-06-01T17:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'MSFT', [{ date: '2025-01-10', shares: 70, price: 200 }, { date: '2026-03-01', shares: 50, price: 300 }], 'linked', '2026-06-01').rows, '2026-06-01T17:00:00.000Z');
    return r;
  };

  test('HIGH 1 + 2 · after a split, and after the lot is used up, the 2025 purchase still shows as bought (100 @ $200) and nothing is "held before the record"', () => {
    let r = life();
    r = addRows(r, [{ accountId: A, holding: 'MSFT', kind: 'SPLIT', date: '2026-07-01', ratio: 2, source: 'linked', ref: 'x-1' }], '2026-07-01T17:00:00.000Z');
    const line = () => activityOf(r, A).find((x) => x.kind === 'PURCHASE' && x.date === '2025-01-10')!;
    expect([line().shares, line().price, sharesOnRecord(r, A, 'MSFT')]).toEqual([100, 200, 240]);
    expect(activityOf(r, A).filter((x) => x.kind === 'ADJUSTMENT')).toEqual([]);
    expect(sum(r)).toBe(240);
    r = addRows(r, [transferRow({ fromAccountId: A, toAccountId: 'acct-2', holding: 'MSFT', date: '2026-07-10', shares: 140, source: 'linked' }),
      { accountId: A, holding: 'MSFT', kind: 'TRANSFER', date: '2026-07-11', shares: 20, source: 'linked' }], '2026-07-11T17:00:00.000Z');
    expect([line().shares, activityOf(r, A).filter((x) => x.kind === 'ADJUSTMENT'), sharesOnRecord(r, A, 'MSFT')]).toEqual([100, [], 80]);
  });

  test('HIGH 3 · accepting the broker\'s average count is ONE line: history 50 @ $300 and a sale of 30 (20 held), the average says 120 — one adjustment of +100', () => {
    let r: AssetRow[] = [];
    r = addRows(r, sortArriving(r, [historyPurchaseRow(r, { accountId: A, holding: 'MSFT', date: '2026-03-01', shares: 50, price: 300, source: 'linked', ref: 'b-1' }),
      saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 30, price: 350, source: 'linked', ref: 's-1' })]).save, '2026-06-01T17:00:00.000Z');
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: null, shares: 120, price: 310, average: true }], 'linked', '2026-06-01').ask;
    r = addRows(r, answerListQuestion(r, q, false, 'linked', '2026-06-01'), '2026-06-01T18:00:00.000Z');
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-06-01'), '2026-06-02T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(120);
    expect(activityOf(r, A).filter((x) => x.kind === 'ADJUSTMENT' || (x.kind === 'PURCHASE' && x.date == null)).map((x) => [x.kind, x.shares])).toEqual([['ADJUSTMENT', 100]]);
    expect(sum(r)).toBe(120);
  });

  test('HIGH 5 · the account holder types 50 over a lot, then accepts the list\'s 40: the purchase shows 70 as bought, and the two changes are their own lines — the activity adds up to 40', () => {
    let r = addRows([], purchasesToAdd([], A, 'MSFT', [{ date: '2025-01-10', shares: 70, price: 200 }], 'linked', '2026-06-01'), '2026-06-01T17:00:00.000Z');
    r = addRows(r, sortArriving(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-06-20', shares: 30, price: 230, source: 'linked', ref: 's-1' })]).save, '2026-06-20T17:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(40);
    r = correctRow(r, '1', { shares: 80 }, 'typed', '2026-06-21T09:00:00.000Z').record;                 // shown 50 = 80 bought − 30 sold
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(50);
    const [q] = purchasesFromList(r, A, 'MSFT', [{ date: '2025-01-10', shares: 40, price: 200 }], 'linked', '2026-06-23').ask;
    r = addRows(r, answerListQuestion(r, q, true, 'linked', '2026-06-23'), '2026-06-23T18:00:00.000Z');
    expect(sharesOnRecord(r, A, 'MSFT')).toBe(40);
    expect(activityOf(r, A).find((x) => x.kind === 'PURCHASE')!.shares).toBe(70);
    expect(sum(r)).toBe(40);
  });

  test('HIGH 6 · one corrected price is asked once: the re-export sends 2025-01-10 @ $202 and its list states the lot as 30 @ $202', () => {
    let r = addRows([], sortArriving([], [purchase('2025-01-10', 100, 200, { source: 'file' }), saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 70, price: 300, source: 'file' })]).save, '2026-06-01T12:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'MSFT', [{ date: '2025-01-10', shares: 30, price: 200 }], 'file', '2026-06-01').rows, '2026-06-01T12:00:00.000Z');
    const events = sortArriving(r, [purchase('2025-01-10', 100, 202, { source: 'file' }), saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 70, price: 300, source: 'file' })]).ask;
    const lists = purchasesFromList(r, A, 'MSFT', [{ date: '2025-01-10', shares: 30, price: 202 }], 'file', '2026-07-01', events).ask;
    expect([events.length, lists.length]).toEqual([1, 0]);
  });

  test('HIGH 7 · a price question names the past sales "theirs" would move: $200 → $202 moves the sale of May 1 from $7,000 to $6,860', () => {
    let r = addRows([], sortArriving([], [purchase('2025-01-10', 100, 200, { source: 'file' }), saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 70, price: 300, source: 'file' })]).save, '2026-06-01T12:00:00.000Z');
    const [q] = sortArriving(r, [purchase('2025-01-10', 100, 202, { source: 'file' }), saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-01', shares: 70, price: 300, source: 'file' })]).ask;
    expect(salesMovedBy(r, q).map((x) => [x.was, x.will])).toEqual([[7000, 6860]]);   // 70 × ($300 − $200); 70 × ($300 − $202)
  });

  test('HIGH 8 · a price the account holder types over one the broker\'s list stated is confirmed against the broker\'s figure, names the sale it moves, and a later list asks', () => {
    let r = addRows([], [purchase('2025-01-10', 100, 200, { source: 'typed' })], '2026-01-01T12:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-05-15', shares: 10, price: 360, source: 'typed' })], '2026-05-15T12:00:00.000Z');
    r = addRows(r, purchasesFromList(r, A, 'MSFT', [{ date: '2025-01-10', shares: 90, price: 200 }], 'linked', '2026-06-01').rows, '2026-06-01T17:00:00.000Z');
    expect(differsFromGiven(r, '1', { price: 190 }).map((d) => [d.field, d.given, d.entered])).toEqual([['price', 200, 190], ['saleGain', 1600, 1700]]);
    r = correctRow(r, '1', { price: 190 }, 'typed', '2026-06-02T09:00:00.000Z').record;
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2025-01-10', shares: 90, price: 200 }], 'linked', '2026-06-03').ask.map((q) => q.kind)).toEqual([]);   // the broker's 200 was what was confirmed against
    expect(purchasesFromList(r, A, 'MSFT', [{ date: '2025-01-10', shares: 90, price: 205 }], 'linked', '2026-06-04').ask.map((q) => q.kind)).toEqual(['price']);
  });

  test('MEDIUM 9 · a changed answer is taken both ways: "theirs" then "mine" puts the account holder\'s price back; the same for a day\'s value', () => {
    let r = addRows([], sortArriving([], [purchase('2025-01-10', 100, 200, { source: 'file' })]).save, '2026-06-01T12:00:00.000Z');
    const [q] = sortArriving(r, [purchase('2025-01-10', 100, 202, { source: 'file' })]).ask;
    r = addRows(r, answerEventQuestion(q, 'theirs', r), '2026-06-02T09:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT')[0].price).toBe(202);
    r = addRows(r, answerEventQuestion(q, 'mine', r), '2026-06-03T09:00:00.000Z');
    expect(openPurchases(r, A, 'MSFT')[0].price).toBe(200);
    let v = addRows([], valueRows({ accountId: A, date: '2026-09-15', source: 'typed', cash: 0, holdings: [{ holding: 'MSFT', shares: 1, price: 45000, value: 45000 }] }), '2026-09-15T09:00:00.000Z');
    v = addRows(v, msftDay('2026-09-15', 44500, 1), '2026-09-15T17:00:00.000Z');
    const [d] = valuesThatDiffer(v, A);
    v = addRows(v, answerValuesQuestion(d, 'theirs', v), '2026-09-15T18:00:00.000Z');
    expect(valuesNow(v, A)!.total).toBe(44500);
    v = addRows(v, answerValuesQuestion(d, 'mine', v), '2026-09-15T19:00:00.000Z');
    expect([valuesNow(v, A)!.total, valuesThatDiffer(v, A)]).toEqual([45000, []]);
  });

  test('MEDIUM 10 · a sale dated before a list that could have sold an undated tax lot is a "which tax lot" question, not a gain of nothing', () => {
    let r = addRows([], [purchase(null, 100, null as unknown as number, { source: 'linked', stillHeldOn: '2026-06-21', averageOnly: true, price: null }),
      purchase('2026-03-01', 20, 300, { stillHeldOn: '2026-06-21' }), purchase('2026-06-10', 20, 410, { stillHeldOn: '2026-06-21' })], '2026-06-21T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-06-20', shares: 40, price: 430, source: 'linked' })], '2026-06-22T17:00:00.000Z');
    expect(salesNeedingAnAnswer(r, A).map((q) => q.shares)).toEqual([40]);
  });

  test('MEDIUM 11 · a date change that moves a purchase past a sale names the change in the shares held', () => {
    let r = addRows([], [purchase('2025-01-10', 70, 200)], '2026-06-01T17:00:00.000Z');
    r = addRows(r, [saleRow({ accountId: A, holding: 'MSFT', date: '2026-06-20', shares: 30, price: 230, source: 'linked' })], '2026-06-20T17:00:00.000Z');
    expect(differsFromGiven(r, '1', { date: '2026-06-25' }).map((d) => [d.field, d.given, d.entered])).toEqual([['date', '2025-01-10', '2026-06-25'], ['saleGain', 900, null], ['sharesHeld', 40, 70]]);
  });
});
