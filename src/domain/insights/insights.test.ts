import { buildInsights, type InsightInput } from './index';

const clean: InsightInput = { cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: true, retireChance: 90, cashDragPct: 10, topAccountPct: 20, planPct: 100, planNext: null, beatBy: 0.01, investRate: 0.2 };

describe('insight service', () => {
  test('healthy state → no insights', () => {
    expect(buildInsights(clean)).toEqual([]);
  });
  test('fires the right rules', () => {
    const ins = buildInsights({ ...clean, toxicDebt: { label: 'Visa', apr: 0.22 }, cashMonths: 1, k401Remaining: 5000, planPct: 60, planNext: 'Add your monthly spending' });
    const ids = ins.map((i) => i.id);
    expect(ids).toContain('toxic-debt');
    expect(ids).toContain('runway');
    expect(ids).toContain('k401-room');
    expect(ids).toContain('plan-incomplete');
  });
  test('ranked by priority (P1 before P3) + limit', () => {
    const ins = buildInsights({ ...clean, toxicDebt: { label: 'Visa', apr: 0.2 }, planPct: 50, planNext: 'Add your monthly spending', k401Remaining: 9000 });
    expect(ins[0].priority).toBe(1);                 // toxic debt first
    expect(ins[ins.length - 1].id).toBe('plan-incomplete'); // P3 last
    expect(buildInsights({ ...clean, toxicDebt: { label: 'V', apr: 0.2 }, planPct: 50, k401Remaining: 9000 }, 1)).toHaveLength(1);
  });
  test('each insight has title + body + route + a theme (for grouping)', () => {
    // force-fire as many rules as possible so we cover every id's theme mapping.
    const all = buildInsights({ cashMonths: 0.5, toxicDebt: { label: 'Card', apr: 0.24 }, k401Remaining: 9000, hasEarnedIncome: true, retireChance: 40, cashDragPct: 50, topAccountPct: 60, planPct: 50, beatBy: -0.05, investRate: 0.05 });
    all.forEach((i) => {
      expect(i.title.length).toBeGreaterThan(0);
      expect(i.body.length).toBeGreaterThan(0);
      expect(i.route).toBeTruthy();
      expect(['protect', 'grow', 'optimize']).toContain(i.theme);
    });
  });

  // BUG-LEDGER: B-48 — don't nudge a no-earned-income user (retiree/gig) about 401(k) room.
  test('401(k)-room nudge requires earned income', () => {
    expect(buildInsights({ ...clean, k401Remaining: 9000, hasEarnedIncome: false }).map((i) => i.id)).not.toContain('k401-room');
    expect(buildInsights({ ...clean, k401Remaining: 9000, hasEarnedIncome: true }).map((i) => i.id)).toContain('k401-room');
  });

  // device-test fix: the 401(k)-room insight opens the dedicated contribution-room detail, not the Retire cockpit.
  test('401(k)-room insight routes to /contribution-room', () => {
    const card = buildInsights({ ...clean, k401Remaining: 9000, hasEarnedIncome: true }).find((i) => i.id === 'k401-room');
    expect(card?.route).toBe('/contribution-room');
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

// ── Social Security window: ONE age gate across the app (2026-08-14) ──────────────────────────────
// The founder ruled the decision belongs to ages 60-70. The Plan tab was changed and Insights was
// not, so the same decision had two different gates — the exact "fixed it in one of six places"
// class the standing order exists to stop. These pin both ends and the honest wording in between.
describe('Social Security window — one gate, honest words at each end', () => {
  const { SS_DECISION_FROM, SS_DECISION_TO } = require('../planning/hub');
  const card = (ssWindow: any) => buildInsights({ ...clean, ssWindow } as any).find((i) => i.id === 'ss-window');

  test('the founder window is 60 to 70 and Insights reads it from the same place the Plan tab does', () => {
    expect([SS_DECISION_FROM, SS_DECISION_TO]).toEqual([60, 70]);
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'screens', 'InsightsScreen.tsx'), 'utf8');
    expect(src).toMatch(/age >= SS_DECISION_FROM && age <= SS_DECISION_TO/);
    expect(src).not.toMatch(/age >= 62 && age < 70/);        // the old hard-coded gate is gone
  });

  test('at 60 and 61 it does NOT claim a window is open — it says the decision is coming', () => {
    const c = card('approaching');
    expect(c!.title).toBe('Your Social Security decision is coming up');
    expect(c!.title).not.toMatch(/is open/);
    expect(c!.body).toMatch(/first claim at 62/);
  });

  test('from 62 the window is genuinely open and the card says so', () => {
    expect(card('open')!.title).toBe('Your Social Security window is open');
  });

  test('outside the window there is no card at all', () => {
    expect(card(null)).toBeUndefined();
    expect(card(undefined)).toBeUndefined();
  });

  test('both variants lead to the same place — the screen that lays 62/67/70 out in dollars', () => {
    expect(card('approaching')!.route).toBe('/ss-timing');
    expect(card('open')!.route).toBe('/ss-timing');
  });
});
