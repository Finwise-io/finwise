import { buildInsights, type InsightInput } from './index';

const clean: InsightInput = { cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: true, retireChance: 90, cashDragPct: 10, topAccountPct: 20, planPct: 100, beatBy: 0.01, investRate: 0.2 };

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

  // BUG-LEDGER: B-48 — don't nudge a no-earned-income user (retiree/gig) about 401(k) room.
  test('401(k)-room nudge requires earned income', () => {
    expect(buildInsights({ ...clean, k401Remaining: 9000, hasEarnedIncome: false }).map((i) => i.id)).not.toContain('k401-room');
    expect(buildInsights({ ...clean, k401Remaining: 9000, hasEarnedIncome: true }).map((i) => i.id)).toContain('k401-room');
  });

  // BUG-LEDGER: B-52 — the investing nudge must be named distinctly from the budget's "savings rate".
  test('low contributions fire an "investing" insight, not a "savings rate" one', () => {
    const ins = buildInsights({ ...clean, investRate: 0.05 }).find((i) => i.id === 'invest-rate')!;
    expect(ins.title).toMatch(/investing/i);
    expect(ins.body).toMatch(/gross income/i);
    expect(ins.title).not.toMatch(/savings rate/i);
  });

  // BUG-LEDGER: B-45 — concentration is measured per ACCOUNT; the copy must not claim "single position".
  test('concentration insight says "account", not "position"', () => {
    const ins = buildInsights({ ...clean, topAccountPct: 86 }).find((i) => i.id === 'concentration')!;
    expect(ins.title).toMatch(/account/i);
    expect(ins.body).not.toMatch(/single position/i);
  });

  // BUG-LEDGER: B-44 — no-cash runway must read plainly, not "0.0 months".
  test('zero-cash runway insight says "no cash set aside", not "0.0 months"', () => {
    const ins = buildInsights({ ...clean, cashMonths: 0 }).find((i) => i.id === 'runway')!;
    expect(ins.body).toMatch(/no cash set aside/i);
    expect(ins.body).not.toMatch(/0\.0 months/);
    // a real-but-low runway still quotes the number
    expect(buildInsights({ ...clean, cashMonths: 1.5 }).find((i) => i.id === 'runway')!.body).toMatch(/1\.5 months/);
  });
});
