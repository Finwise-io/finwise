/** THE DOOR FOR "how is this one holding doing" — MK-NW-O-006 theHolding (Q-NW-3).
 *
 *  One screen, one question, so nothing here was a founder decision. What it must hold are the two
 *  refusals that were paid for once already: no price means WHAT YOU PAID and no gain at all, and a
 *  dividend record belongs to this holding only when it names this ticker.
 */
import { theHolding } from './holding';

const YEAR = 365 * 24 * 3600 * 1000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const NOW = new Date('2026-09-28T12:00:00Z');

const position = (over: any = {}) => ({
  position_id: 'p1', ticker: 'VTI', label: 'Vanguard Total Market', asset_class: 'stock',
  lots: [{ shares: 100, cost_per_share: 200, purchase_date: iso(NOW.getTime() - 2 * YEAR) }],
  ...over,
} as any);

const txns = [
  { id: 1, account_id: 'a1', ticker: 'VTI', type: 'DIVIDEND', amount: 120, date: iso(NOW.getTime() - 30 * 864e5) },
  { id: 2, account_id: 'a1', ticker: 'VTI', type: 'DIVIDEND', amount: 300, date: iso(NOW.getTime() - 2 * YEAR) },
  { id: 3, account_id: 'a1', ticker: null, type: 'DIVIDEND', amount: 999, date: iso(NOW.getTime() - 10 * 864e5) },
  { id: 4, account_id: 'a1', ticker: 'OTHER', type: 'DIVIDEND', amount: 777, date: iso(NOW.getTime() - 10 * 864e5) },
];

test('value is shares × price, and the gain is what it is worth less what it cost', () => {
  const h = theHolding({ position: position(), accountId: 'a1', price: 250, transactions: [], now: NOW });
  expect(h.shares).toBe(100);
  expect(h.totalPaid).toBe(20000);
  expect(h.avgPaidPerShare).toBe(200);
  expect(h.value).toBe(25000);
  expect(h.gain).toBe(5000);
  expect(h.returnOnCost).toBeCloseTo(0.25, 6);
});

test('NO PRICE: it shows what you paid, and states NO gain at all (r30)', () => {
  const h = theHolding({ position: position(), accountId: 'a1', price: null, transactions: [], now: NOW });
  expect(h.priced).toBe(false);
  expect(h.value).toBe(20000);          // what you paid — never a zero
  expect(h.gain).toBeNull();
  expect(h.returnOnCost).toBeNull();
  expect(h.capitalGains).toBeNull();
});

test('a dividend belongs to this holding only when the record names this ticker', () => {
  const h = theHolding({ position: position(), accountId: 'a1', price: 250, transactions: txns, now: NOW });
  expect(h.dividends.trailing12).toBe(120);     // not the untickered $999, not the $777 of OTHER
  expect(h.dividends.allTime).toBe(420);        // and the two-year-old $300 is in all-time only
});

test('a fully sold holding says it is closed rather than showing a $0 position', () => {
  const h = theHolding({ position: position({ lots: [] }), accountId: 'a1', price: 250, transactions: [], now: NOW });
  expect(h.closed).toBe(true);
  expect(h.shares).toBe(0);
  expect(h.avgPaidPerShare).toBe(0);
});

test('the gain splits long and short by how long each lot was held', () => {
  const p = position({ lots: [
    { shares: 50, cost_per_share: 200, purchase_date: iso(NOW.getTime() - 2 * YEAR) },   // long
    { shares: 50, cost_per_share: 200, purchase_date: iso(NOW.getTime() - 30 * 864e5) }, // short
  ] });
  const h = theHolding({ position: p, accountId: 'a1', price: 250, transactions: [], now: NOW });
  expect(h.capitalGains!.longGain).toBeCloseTo(2500, 4);
  expect(h.capitalGains!.shortGain).toBeCloseTo(2500, 4);
});

test('the realised figure carries the sales it could NOT price honestly', () => {
  const h = theHolding({ position: position(), accountId: 'a1', price: 250, transactions: [], now: NOW });
  expect(h.realised).toHaveProperty('realizedAllTime');
  expect(h.realised).toHaveProperty('sellsWithoutBasis');
});
