// G21 — founder rulings brief Q-21 (2026-08-20) and Q47 (2026-09-08): essentials a month = the average of
// ACTUAL logged spending over the months logged, labelled "N month average"; typed only when nothing is logged.
import { essentialsFromLoggedSpending, essentialsMonthly } from '../../MoneyKeel/functions/cashflow/essentials';

const NOW = new Date(2026, 8, 8);   // 8 September 2026 — the current month is September
const e = (date: string, amount: number, category = 'Groceries') => ({ date, amount, category });

test('seven months logged in the last twelve → the average over those seven, labelled "7 month average"', () => {
  const rows = [
    e('2026-02-10', 3000), e('2026-03-10', 3200), e('2026-04-10', 2800), e('2026-05-10', 3000, 'Debt payment'),
    e('2026-06-10', 3000), e('2026-07-10', 2600), e('2026-08-10', 3400),
  ];
  const r = essentialsFromLoggedSpending(rows, NOW)!;
  expect(r.monthsCounted).toBe(7);
  expect(r.monthly).toBe(3000);              // 21,000 ÷ 7
  expect(r.label).toBe('7 month average');
  expect([r.from, r.to]).toEqual(['2026-02', '2026-08']);
});

test('mortgage and big items are IN (brief Q-21 (2026-08-20)): a debt payment and a one-time roof are part of the month', () => {
  const r = essentialsFromLoggedSpending([e('2026-08-01', 1000), e('2026-08-02', 2000, 'Debt payment'), e('2026-08-03', 9000, 'Home repair')], NOW)!;
  expect(r.monthly).toBe(12000);
  expect(r.monthsCounted).toBe(1);
});

test('the current, unfinished month is left out unless it is the only month with entries (stated assumption)', () => {
  const r = essentialsFromLoggedSpending([e('2026-08-10', 3000), e('2026-09-02', 100)], NOW)!;
  expect(r.monthsCounted).toBe(1);
  expect(r.monthly).toBe(3000);              // September's $100 so far does not drag it down
  const only = essentialsFromLoggedSpending([e('2026-09-02', 100)], NOW)!;
  expect(only.monthly).toBe(100);
  expect(only.label).toBe('1 month average — this month so far');
});

test('entries older than twelve complete months are outside the window', () => {
  const r = essentialsFromLoggedSpending([e('2025-08-10', 9999), e('2026-08-10', 3000)], NOW)!;
  expect(r.monthsCounted).toBe(1);
  expect(r.monthly).toBe(3000);
});

test('nothing logged → nothing; the typed figure serves only then, labelled "you entered"', () => {
  expect(essentialsFromLoggedSpending([], NOW)).toBeNull();
  expect(essentialsMonthly([], 2500, NOW)).toEqual({ monthly: 2500, basis: 'entered', label: 'you entered', logged: null });
  expect(essentialsMonthly([], 0, NOW)).toBeNull();
  const m = essentialsMonthly([e('2026-08-10', 3000)], 2500, NOW)!;
  expect(m.basis).toBe('logged');           // logged outranks typed
  expect(m.monthly).toBe(3000);
});
