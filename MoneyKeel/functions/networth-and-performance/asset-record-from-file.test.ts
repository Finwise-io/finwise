/* ONE IMPORTED FILE, AS ROWS OF THE ONE MASTER RECORD — held on his own file, as E*TRADE exported it
 * (src/screens/__tests__/__fixtures__/build55-nov4-26-jj_as-exported.csv), dated Jun 21, 2026 and imported Nov 4.
 * Its own lines: the CD $109,992.74, LCTX $1,167.65, the QQQ put $1,407.50, VMFXX $50,000.00, cash $7,096.82 = $169,664.71. */
import * as fs from 'fs';
import * as path from 'path';
import { importHoldings, importedAccountOf } from '../../../src/domain/import/holdingsImport';
import { fileToRecord, fileRowsToSave } from './asset-record-from-file';
import { addRows, factsOf, openPurchases, sharesOnRecord, valuesNeedingADate, valuesNow, valuesOn, statedTotalGap, type AssetRow } from './asset-record';

const HIS_FILE = fs.readFileSync(path.join(__dirname, '../../../src/screens/__tests__/__fixtures__/build55-nov4-26-jj_as-exported.csv'), 'utf8');
const A = 'rh';
const CD = 'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026';
const PUT = "QQQ DEC 31 '26 $600 PUT";

/** The calling order, run and saved at one moment. */
const importInto = (record: AssetRow[], text: string, at: string): AssetRow[] => {
  const got = fileRowsToSave(record, importHoldings(text), A);
  expect(got.askEvents).toEqual([]);
  expect(got.askLists).toEqual([]);
  return addRows(record, got.rows, at);
};

describe('his file', () => {
  const result = importHoldings(HIS_FILE);
  const f = fileToRecord(result, A);

  test('the day is the file\'s own, Jun 21, 2026', () => {
    expect(f.listDay).toBe('2026-06-21');
    expect(f.needsADate).toBe(false);
    expect(f.events).toEqual([]);
    expect(f.values.every((r) => r.date === '2026-06-21' && r.source === 'file')).toBe(true);
  });

  test('the values add up to the file\'s own $169,664.71, the put at $1,407.50, and match the account the import builds', () => {
    const own = f.values[0];
    expect(own.holding).toBeNull();
    expect(own.amount).toBe(7096.82);
    expect(own.statedTotal).toBe(169664.71);
    const byHolding = Object.fromEntries(f.values.slice(1).map((r) => [r.holding, r.amount]));
    expect(byHolding).toEqual({ [CD]: 109992.74, LCTX: 1167.65, [PUT]: 1407.5, VMFXX: 50000 });
    expect(f.values).toHaveLength(5);                                     // 1 account row + 4 of 4 holdings
    const total = f.values.reduce((t, r) => t + (r.amount ?? 0), 0);
    expect(Math.round(total * 100)).toBe(16966471);
    const account = importedAccountOf(result, { institution: 'E*TRADE', name: '', nowIso: '2026-11-04T18:00:00.000Z' }) as any;
    expect(total).toBeCloseTo(account.balance, 9);
  });

  test('the CD\'s facts: face $110,000, 3.85%, maturity Aug 24, 2026; the put\'s 100 shares a contract', () => {
    const cd = f.facts.find((x) => x.holding === CD)!;
    expect(cd.facts).toEqual({ face_value: 110000, coupon_rate: 0.0385, maturity_date: '2026-08-24', price_quote: 'per_100_of_face' });
    expect(cd.source).toBe('file');
    expect(f.facts.find((x) => x.holding === PUT)!.facts).toEqual({ multiplier: 100 });
    expect(f.facts).toHaveLength(2);
  });

  test('the purchases listed: no dates in the file, its "Price Paid" kept per unit, none marked average', () => {
    expect(Object.fromEntries(f.lists.map((l) => [l.holding, l.listed]))).toEqual({
      [CD]: [{ date: null, shares: 110000, price: 1 }],               // $100 per $100 of face → $110,000 paid
      LCTX: [{ date: null, shares: 965, price: 1.74 }],
      [PUT]: [{ date: null, shares: 100, price: 50.35 }],              // 1 contract = 100 shares, at $50.35 a share (comparison check, 2026-11-11: counted in shares as every other way counts an option)
      VMFXX: [{ date: null, shares: 50000, price: 1 }],
    });
  });

  test('run through the record: values now are dated Jun 21 at $169,664.71; nothing is under Nov 4', () => {
    const record = importInto([], HIS_FILE, '2026-11-04T18:00:00.000Z');
    const now = valuesNow(record, A)!;
    expect(now.date).toBe('2026-06-21');
    expect(Math.round((now.total as number) * 100)).toBe(16966471);
    expect(statedTotalGap(now)).toBeCloseTo(0, 6);
    expect(valuesOn(record, A, '2026-11-04')).toBeNull();
    expect(factsOf(record, A, CD)).toEqual({ face_value: 110000, coupon_rate: 0.0385, maturity_date: '2026-08-24', price_quote: 'per_100_of_face' });
    expect(openPurchases(record, A, 'LCTX').map((p) => [p.date, p.shares, p.price, p.stillHeldOn])).toEqual([[null, 965, 1.74, '2026-06-21']]);
    expect(record.filter((r) => r.kind === 'PURCHASE')).toHaveLength(4);
  });

  test('the same file imported twice adds nothing', () => {
    const once = importInto([], HIS_FILE, '2026-11-04T18:00:00.000Z');
    const twice = importInto(once, HIS_FILE, '2026-11-05T18:00:00.000Z');
    expect(twice).toHaveLength(once.length);
  });
});

describe('a file with no date', () => {
  const NO_DATE = HIS_FILE.replace(/Generated at[^\n]*\n?/, '');

  test('no day; the account holder is asked it; the values are saved with a blank date', () => {
    const f = fileToRecord(importHoldings(NO_DATE), A);
    expect(f.listDay).toBeNull();
    expect(f.needsADate).toBe(true);
    expect(f.values.every((r) => r.date === null)).toBe(true);
    const record = importInto([], NO_DATE, '2026-11-04T18:00:00.000Z');
    expect(valuesNeedingADate(record, A)).toHaveLength(1);
    expect(valuesOn(record, A, '2026-11-04')).toBeNull();
  });
});

describe('a file with purchase dates and costs per lot', () => {
  const LOTS = [
    'Symbol,Quantity,Purchase Date,Cost Per Share,Value',
    'MSFT,10,03/15/2024,300,4200',
    'MSFT,5,2025-01-10,,2100',
    'VTI,20,,250,5000',
    'Cash,,,,100',
    'As of 06/30/2026',
  ].join('\n');

  test('each lot keeps its own date and cost; a cost the file does not give is blank, never $0', () => {
    const f = fileToRecord(importHoldings(LOTS), A);
    expect(f.listDay).toBe('2026-06-30');
    expect(f.lists).toEqual([
      { holding: 'MSFT', listed: [{ date: '2024-03-15', shares: 10, price: 300 }, { date: '2025-01-10', shares: 5, price: null }] },
      { holding: 'VTI', listed: [{ date: null, shares: 20, price: 250 }] },
    ]);
    expect(f.values[0].amount).toBe(100);
    const record = importInto([], LOTS, '2026-11-04T18:00:00.000Z');
    expect(openPurchases(record, A, 'MSFT').map((p) => [p.date, p.shares, p.price])).toEqual([['2024-03-15', 10, 300], ['2025-01-10', 5, null]]);
    expect(valuesNow(record, A)!.total).toBe(11400);
  });

  test('a file whose cost column is an average cost marks its line as the average; one with no cash line gives no cash', () => {
    const f = fileToRecord(importHoldings('Symbol,Quantity,Average Cost,Value\nVTI,20,250,5000'), A);
    expect(f.lists).toEqual([{ holding: 'VTI', listed: [{ date: null, shares: 20, price: 250, average: true }] }]);
    expect(f.values[0].amount).toBeNull();
  });
});

describe('outside check, 2026-11-12', () => {
  const HEAD = 'Symbol,Quantity,Price Paid $,Last Price $,Value $,Date Acquired\n';
  const save = (record: AssetRow[], text: string, at: string, ids: string[] = []) => {
    const got = fileRowsToSave(record, importHoldings(text), A, ids);
    return { got, record: addRows(record, got.rows, at) };
  };

  test('Jun 21: 10 AAPL and 5 MSFT; Jul 21: AAPL only — the file no longer lists MSFT, so it is asked, and the 5 MSFT stay until answered', () => {
    const one = save([], HEAD + 'AAPL,10,150,200,2000,01/05/2026\nMSFT,5,300,400,2000,02/01/2026\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n', '2026-06-22T10:00:00Z');
    expect(one.got.askLists).toEqual([]);
    const two = save(one.record, HEAD + 'AAPL,10,150,210,2100,01/05/2026\nCASH,,,,3100,\nGenerated at Jul 21 2026 03:37 PM ET\n', '2026-07-22T10:00:00Z');
    expect(two.got.askLists.map((q) => [q.holding, q.kind, q.sharesOnRecord, q.sharesListed, q.listDay])).toEqual([['MSFT', 'not-listed', 5, 0, '2026-07-21']]);
    expect(sharesOnRecord(two.record, A, 'MSFT')).toBe(5);
    expect(sharesOnRecord(two.record, A, 'AAPL')).toBe(10);
    // a holding bought after the file's own day is not one the file could list: not asked
    const later = save(one.record, HEAD + 'AAPL,10,150,200,2000,01/05/2026\nMSFT,5,300,400,2000,02/01/2026\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n', '2026-06-23T10:00:00Z');
    expect(later.got.askLists).toEqual([]);
  });

  test('10 AAPL, a $5,000 bond with no quantity and $1,000 cash: the account holds $3,000 and the bond\'s own account $5,000, both on Jun 21', () => {
    const { got, record } = save([], HEAD + 'AAPL,10,150,200,2000,01/05/2026\nUS TREASURY BOND 4% 2030,,,,5000,\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n', '2026-06-22T10:00:00Z', ['bond']);
    expect(got.askLists).toEqual([]);
    expect(valuesNow(record, A)).toMatchObject({ date: '2026-06-21', total: 3000 });
    expect(valuesNow(record, 'bond')).toMatchObject({ date: '2026-06-21', total: 5000, source: 'file' });
    // a file of only such a row has no account of its own to hold anything: the bond's account still gets its $5,000
    const only = fileRowsToSave([], importHoldings(HEAD + 'US TREASURY BOND 4% 2030,,,,5000,\nGenerated at Jun 21 2026 03:37 PM ET\n'), null, ['bond']);
    expect(valuesNow(addRows([], only.rows, '2026-06-22T10:00:00Z'), 'bond')).toMatchObject({ date: '2026-06-21', total: 5000 });
    expect(only.rows.every((r) => r.accountId === 'bond')).toBe(true);
  });
});
