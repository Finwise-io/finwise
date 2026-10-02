import { inMonth, DEBT_CATEGORY } from './logged-expenses';

describe('MK-CF-F-148 inMonth — an expense belongs to the month its date starts with', () => {
  it('matches the month and nothing else', () => {
    expect(inMonth({ amount: 10, category: 'x', date: '2026-09-12' }, '2026-09')).toBe(true);
    expect(inMonth({ amount: 10, category: 'x', date: '2026-10-01' }, '2026-09')).toBe(false);
    expect(inMonth({ amount: 10, category: 'x', date: '' } as any, '2026-09')).toBe(false);
  });
  it('the one category name a debt payment is logged under', () => {
    expect(DEBT_CATEGORY).toBe('Debt payment');
  });
});
