/** Cluster #5 ruling (founder, 2026-09-10): the inflow line names its sources —
 *  "Inflow (income (take-home) + rent)" — the words in the brackets are what is in the number. */
import { inflowLabel, inflowSourceWord, plannedMonthFlow, actualMonthFlow } from './this-month';

test('no sources named → the take-home alone', () => {
  expect(inflowLabel('Inflow')).toBe('Inflow (income (take-home))');
  expect(inflowLabel('Actual inflow', [])).toBe('Actual inflow (income (take-home))');
});

test('the founder’s own example: pay plus a rental', () => {
  expect(inflowLabel('Inflow', ['Salary (take-home share)', 'Rental (after costs)'])).toBe('Inflow (income (take-home) + rent)');
});

test('each source once, in the order it arrives, in its own words', () => {
  expect(inflowLabel('Inflow', ['Salary (take-home share)', 'Salary (take-home share)', 'Social Security', 'Bonus', 'Family support']))
    .toBe('Inflow (income (take-home) + Social Security + bonus + family support)');
});

test('the word for a source', () => {
  expect(inflowSourceWord('Salary (take-home share)')).toBe('income (take-home)');
  expect(inflowSourceWord('Base salary')).toBe('income (take-home)');
  expect(inflowSourceWord('Rental (after costs)')).toBe('rent');
  expect(inflowSourceWord('Social Security')).toBe('Social Security');
  expect(inflowSourceWord('Investment income')).toBe('investment income');
});

test('the month cards print the sources they were given', () => {
  const m = { ym: '2026-09', takeHomeMonthly: 6000, inflowSources: ['Salary (take-home share)', 'Rental (after costs)'], debts: [], plannedExpenses: 4000, expenses: [] };
  expect(plannedMonthFlow(m).lines[0].label).toBe('Inflow (income (take-home) + rent)');
  expect(actualMonthFlow(m).lines[0].label).toBe('Actual inflow (income (take-home) + rent)');
  expect(plannedMonthFlow({ ...m, inflowSources: undefined }).lines[0].label).toBe('Inflow (income (take-home))');
});
