import { buildInsights, type InsightInput } from './index';

const clean: InsightInput = { cashMonths: 6, toxicDebt: null, k401Remaining: 0, retireChance: 90, cashDragPct: 10, topHoldingPct: 20, planPct: 100, beatBy: 0.01, savingsRate: 0.2 };

describe('insight service', () => {
  test('healthy state → no insights', () => {
    expect(buildInsights(clean)).toEqual([]);
  });
  test('fires the right rules', () => {
    const ins = buildInsights({ ...clean, toxicDebt: { label: 'Visa', apr: 0.22 }, cashMonths: 1, k401Remaining: 5000, planPct: 60 });
    const ids = ins.map((i) => i.id);
    expect(ids).toContain('toxic-debt');
    expect(ids).toContain('runway');
    expect(ids).toContain('k401-room');
    expect(ids).toContain('plan-incomplete');
  });
  test('ranked by priority (P1 before P3) + limit', () => {
    const ins = buildInsights({ ...clean, toxicDebt: { label: 'Visa', apr: 0.2 }, planPct: 50, k401Remaining: 9000 });
    expect(ins[0].priority).toBe(1);                 // toxic debt first
    expect(ins[ins.length - 1].id).toBe('plan-incomplete'); // P3 last
    expect(buildInsights({ ...clean, toxicDebt: { label: 'V', apr: 0.2 }, planPct: 50, k401Remaining: 9000 }, 1)).toHaveLength(1);
  });
  test('each insight has title + body + route', () => {
    buildInsights({ ...clean, cashMonths: 0.5 }).forEach((i) => {
      expect(i.title.length).toBeGreaterThan(0);
      expect(i.body.length).toBeGreaterThan(0);
      expect(i.route).toBeTruthy();
    });
  });
});
