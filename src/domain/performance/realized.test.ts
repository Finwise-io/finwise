// Realized P/L pins — FIFO honesty: oldest lots first, unpriceable sells never guessed,
// account-scoped queues, calendar-year split.
import { realizedFromLedger } from './realized';
import type { Transaction } from '../transactions';

const yr = new Date().getFullYear();
const t = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36) as any, date: `${yr}-03-01`, type: 'BUY', account_id: 'acc' as any,
  ticker: 'VTI', shares: 10, price: 100, created_at: 'x', ...over,
} as Transaction);

test('FIFO: the oldest buy is consumed first; gain = proceeds − that basis', () => {
  const r = realizedFromLedger([
    t({ date: `${yr - 1}-01-01`, shares: 10, price: 100 }),
    t({ date: `${yr - 1}-06-01`, shares: 10, price: 150 }),
    t({ date: `${yr}-02-01`, type: 'SELL', shares: 12, price: 200 }),
  ]);
  // 10 @100 + 2 @150 = 1300 basis; proceeds 2400 → +1100
  expect(r.realizedAllTime).toBe(1100);
  expect(r.realizedThisYear).toBe(1100);
  expect(r.sellsCounted).toBe(1);
  expect(r.sellsWithoutBasis).toBe(0);
});

test('a sale with no recorded buy contributes NOTHING — reported, never guessed', () => {
  const r = realizedFromLedger([t({ type: 'SELL', shares: 5, price: 300 })]);
  expect(r.realizedAllTime).toBe(0);
  expect(r.sellsWithoutBasis).toBe(1);
});

test('last year’s sale counts all-time but not this year; queues are account-scoped', () => {
  const r = realizedFromLedger([
    t({ date: `${yr - 2}-01-01`, shares: 10, price: 100 }),
    t({ date: `${yr - 1}-05-01`, type: 'SELL', shares: 10, price: 120 }),      // +200 last year
    t({ date: `${yr - 2}-01-01`, account_id: 'other' as any, shares: 10, price: 50 }),
    t({ date: `${yr}-01-05`, account_id: 'other' as any, type: 'SELL', shares: 10, price: 60 }),  // +100 this year
  ]);
  expect(r.realizedAllTime).toBe(300);
  expect(r.realizedThisYear).toBe(100);
});

test('OPENING_POSITION rows seed basis just like buys', () => {
  const r = realizedFromLedger([
    t({ date: `${yr - 1}-01-01`, type: 'OPENING_POSITION', shares: 10, price: 80 }),
    t({ date: `${yr}-02-01`, type: 'SELL', shares: 10, price: 90 }),
  ]);
  expect(r.realizedAllTime).toBe(100);
});
