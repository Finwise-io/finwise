// PRD F3#16 — money-weighted return: known-answer math + every honesty rule.
import { moneyWeightedReturn, userFlows, isMoneyWeighted } from './moneyWeighted';

const DAY = 86400000;
const NOW = Date.parse('2026-07-15');
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10);
const ACC = [{ asset_id: 'brk', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0 }] as any[];
const ids = new Set(['brk']);

test('known answer: $10,000 in one year ago, worth $11,000 today → ~10%/yr', () => {
  const txns = [{ id: 't1', type: 'DEPOSIT', account_id: 'brk', amount: 10000, date: iso(365) }] as any[];
  const r = moneyWeightedReturn(txns, ACC, ids, 11000, NOW);
  expect(isMoneyWeighted(r)).toBe(true);
  if (isMoneyWeighted(r)) expect(r.ratePerYear).toBeCloseTo(0.10, 2);
});

test('timing matters: a big deposit right before a flat stretch drags the money-weighted rate down', () => {
  // $1,000 two years ago doubled; then $10,000 added 30 days ago that went nowhere.
  const txns = [
    { id: 't1', type: 'DEPOSIT', account_id: 'brk', amount: 1000, date: iso(730) },
    { id: 't2', type: 'DEPOSIT', account_id: 'brk', amount: 10000, date: iso(30) },
  ] as any[];
  const r = moneyWeightedReturn(txns, ACC, ids, 12000, NOW);
  expect(isMoneyWeighted(r)).toBe(true);
  if (isMoneyWeighted(r)) {
    expect(r.ratePerYear).toBeGreaterThan(0);
    expect(r.ratePerYear).toBeLessThan(0.40);   // far below the naive 'doubled my first grand' story
  }
});

test('withdrawals are money OUT and raise the rate for the same end value', () => {
  const base = [{ id: 't1', type: 'DEPOSIT', account_id: 'brk', amount: 10000, date: iso(365) }] as any[];
  const withW = [...base, { id: 't2', type: 'WITHDRAWAL', account_id: 'brk', amount: 2000, date: iso(180) }] as any[];
  const a = moneyWeightedReturn(base, ACC, ids, 10500, NOW);
  const b = moneyWeightedReturn(withW, ACC, ids, 10500, NOW);
  if (isMoneyWeighted(a) && isMoneyWeighted(b)) expect(b.ratePerYear).toBeGreaterThan(a.ratePerYear);
});

test('transfers INSIDE the measured set cancel; crossing the boundary is a real flow', () => {
  const two = new Set(['brk', 'ira']);
  const txns = [
    { id: 't1', type: 'DEPOSIT', account_id: 'brk', amount: 10000, date: iso(365) },
    { id: 't2', type: 'OPENING_CASH', account_id: 'ira', amount: 0, date: iso(365) },
    { id: 't3', type: 'TRANSFER', account_id: 'brk', counter_account_id: 'ira', amount: 4000, date: iso(200) },
  ] as any[];
  expect(userFlows(txns, two).filter((f) => Math.abs(f.amount) === 4000)).toHaveLength(0);   // internal
  expect(userFlows(txns, new Set(['brk'])).find((f) => f.amount === 4000)).toBeTruthy();     // out of the set
});

test('HONESTY: an account whose balance predates its ledger → no_history, never a guess', () => {
  const txns = [{ id: 't1', type: 'WITHDRAWAL', account_id: 'brk', amount: 500, date: iso(100) }] as any[];
  const r = moneyWeightedReturn(txns, ACC, ids, 9000, NOW);
  expect(isMoneyWeighted(r)).toBe(false);
  if (!isMoneyWeighted(r)) expect(r.reason).toBe('no_history');
});

test('HONESTY: under 30 days of history → too_short (annualizing noise is not a return)', () => {
  const txns = [{ id: 't1', type: 'DEPOSIT', account_id: 'brk', amount: 10000, date: iso(10) }] as any[];
  const r = moneyWeightedReturn(txns, ACC, ids, 10100, NOW);
  if (!isMoneyWeighted(r)) expect(r.reason).toBe('too_short');
  expect(isMoneyWeighted(r)).toBe(false);
});

test('reinvested dividends and buys/sells are internal — they never appear as user flows', () => {
  const txns = [
    { id: 't1', type: 'DEPOSIT', account_id: 'brk', amount: 10000, date: iso(365) },
    { id: 't2', type: 'BUY', account_id: 'brk', ticker: 'VTI', shares: 10, price: 200, date: iso(300) },
    { id: 't3', type: 'DIVIDEND', account_id: 'brk', ticker: 'VTI', amount: 120, reinvested: true, date: iso(200) },
    { id: 't4', type: 'SELL', account_id: 'brk', ticker: 'VTI', shares: 5, price: 220, date: iso(100) },
  ] as any[];
  expect(userFlows(txns, ids)).toHaveLength(1);
});
