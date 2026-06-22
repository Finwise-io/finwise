/**
 * P0 dedup — "planned monthly spend" must be ONE number everywhere (Home, Budget, runway).
 * The bug: Home read the raw stated estimate / categories-only and could undershoot the canonical
 * MAX(stated, categories) that Budget uses. This pins the contract so they can't drift apart.
 */
import { plannedMonthlySpend, budgetFromOnboarding, spendBuckets } from './index';

const stated5k = { monthlySpending: '5000' } as any;
const stated5k_cats3k = { monthlySpending: '5000', spendCats: [{ amount: '3000', bucket: 'flexible', unit: '$' }] } as any;
const stated5k_cats7k = { monthlySpending: '5000', spendCats: [{ amount: '7000', bucket: 'flexible', unit: '$' }] } as any;
const catsOnly4k = { spendCats: [{ amount: '4000', bucket: 'flexible', unit: '$' }] } as any;

describe('planned monthly spend — single source of truth', () => {
  test('canonical = MAX(stated estimate, sum of categories)', () => {
    expect(plannedMonthlySpend(stated5k)).toBe(5000);
    expect(plannedMonthlySpend(stated5k_cats3k)).toBe(5000);   // stated wins (the case Home used to undershoot)
    expect(plannedMonthlySpend(stated5k_cats7k)).toBe(7000);   // categories win
    expect(plannedMonthlySpend(catsOnly4k)).toBe(4000);
  });

  test('both components are recoverable for the "show both" Home insight', () => {
    expect(spendBuckets(stated5k_cats7k).monthly_total).toBe(7000);   // categories shown
    expect(Number(stated5k_cats7k.monthlySpending)).toBe(5000);       // estimate shown
  });

  test('Budget doc agrees with the canonical selector (Home & Budget cannot diverge)', () => {
    [stated5k, stated5k_cats3k, stated5k_cats7k, catsOnly4k].forEach((op) => {
      expect(budgetFromOnboarding('u' as any, op).monthly_spending).toBe(plannedMonthlySpend(op));
    });
  });
});
