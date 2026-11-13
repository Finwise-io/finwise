/* The words of the record's questions, on worked examples (account-page v02, holding-detail v03). */
import { askedWhere, priceFromDay, saleNotKnownWords, whoSaysFor, accountValueDay, purchaseOnRecord } from './recordQuestions';
import { addRows, type NewRow } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';

const at = '2026-11-12T10:00:00.000Z';

test('where a question is asked: no holding → beside the account; a price question → beside the purchase; a sale → beside the sale', () => {
  expect(askedWhere({ holding: null, kind: 'V2' } as any)).toBe('account');
  expect(askedWhere({ holding: 'MSFT', kind: 'E1' } as any)).toBe('purchase');
  expect(askedWhere({ holding: 'MSFT', kind: 'S1', family: 'sale' } as any)).toBe('sale');
  expect(askedWhere({ holding: 'MSFT', kind: 'L1' } as any)).toBe('shares');
});

test('a price from Nov 1 measured on Nov 12 is 11 days old, so its day is shown; one from Nov 6 (6 days) is not', () => {
  expect(priceFromDay('2026-11-01', '2026-11-12')).toBe('2026-11-01');
  expect(priceFromDay('2026-11-06', '2026-11-12')).toBeNull();
  expect(priceFromDay(null, '2026-11-12')).toBeNull();
});

test('who gave a figure: the broker by its name, the account holder as you, a file by its day', () => {
  const record = addRows([], [{ accountId: 'R', holding: null, kind: 'VALUE', date: '2026-06-21', source: 'file', amount: 0 } as NewRow], at);
  const who = whoSaysFor(record, { asset_id: 'R', institution: 'Robinhood' });
  expect(who('R', 'linked')).toBe('Robinhood');
  expect(who('R', 'typed')).toBe('you');
  expect(who('R', 'file')).toBe('your file of Jun 21, 2026');
});

test('the day the account’s value is from is the record’s latest value row, never the phone’s day', () => {
  const record = addRows([], [{ accountId: 'S', holding: null, kind: 'VALUE', date: '2026-11-01', source: 'typed', typedValue: 1_000 } as NewRow], at);
  expect(accountValueDay(record, 'S')).toEqual({ onRecord: true, day: '2026-11-01' });
  expect(accountValueDay([], 'S')).toEqual({ onRecord: false, day: null });
});

test('500 MSFT bought Jul 30 at $350: the lot on the page stands for that purchase; a sale waiting for its purchase says so', () => {
  const record = addRows([], [{ accountId: 'R', holding: 'MSFT', kind: 'PURCHASE', date: '2026-07-30', source: 'typed', shares: 500, price: 350 } as NewRow], at);
  expect(purchaseOnRecord(record, 'R', 'msft', '2026-07-30')).toMatchObject({ price: 350, shares: 500, date: '2026-07-30' });
  expect(purchaseOnRecord(record, 'R', 'MSFT', '2026-07-31')).toBeNull();
  const sale = addRows(record, [{ accountId: 'R', holding: 'MSFT', kind: 'SALE', date: '2026-11-10', source: 'typed', shares: 100, price: 400 } as NewRow], at);
  const saleRow = sale[sale.length - 1];
  expect(saleNotKnownWords(sale, { kind: 'S1', sale: { rowId: saleRow.rowId } } as any)).toBe('Not known until you say which purchase the Nov 10 sale came from');
});
