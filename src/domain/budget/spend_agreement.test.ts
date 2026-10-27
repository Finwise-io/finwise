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

/** ONE MONTH, ONE PLAN (2026-10-25, FIX-BUDGET; the outside audit MK-CF-F-014, F-013, F-004; DEC-7611, DEC-7951; tenet 4). The budget
 *  editor's card and buckets (budgetVsActual, budgetEditorBuckets), the month table This month and the Expenses tab read
 *  (spendByMonth / spendByMonthByBucket) and the stored budget (budgetFromOnboarding) are one figure, month by month — the
 *  handoff's own example: $2,000 a month and $1,200 of insurance due in December → $2,000 in September, $3,200 in December,
 *  $25,200 in the year, $2,100 the average (never a month's plan). */
import { budgetVsActual, budgetEditorBuckets, spendByMonth, spendByMonthByBucket } from './index';
describe('one month, one plan — the budget editor, the month table and the stored budget agree', () => {
  const bill = { id: 'ins', label: 'Insurance', amount: 1200, unit: 'dollar', bucket: 'nonmonthly', months: [12] };
  const HOUSEHOLDS: Record<string, any> = {
    handoff: { spendCats: [{ id: 'r', label: 'Rent / Mortgage', amount: 2000, unit: 'dollar', bucket: 'fixed' }, bill] },
    dec7951: { monthlySpending: 2000, b_fixed: 1100, b_flexible: 900, spendCats: [bill] },
    dec7611: { spendCats: [{ id: 'g', label: 'Groceries', amount: 700, unit: 'dollar', bucket: 'flexible' }, bill] },
    typedOnly: { monthlySpending: '3400' },
    emptyList: { b_fixed: '1000', b_nonmonthly: '100', b_flexible: '900', spendCats: [] },
    remainder: { monthlySpending: '2000', spendCats: [{ id: 'gas', label: 'Gas', amount: 200, unit: 'dollar', bucket: 'flexible' }, bill] },
  };
  test('6 households × 12 months: editor card = editor buckets added = the month table', () => {
    let seen = 0;
    for (const [name, op] of Object.entries(HOUSEHOLDS)) {
      const table = spendByMonth(op), groups = spendByMonthByBucket(op);
      for (let m = 0; m < 12; m++) {
        const now = new Date(2026, m, 15);
        const card = budgetVsActual([], op, now);
        const buckets = budgetEditorBuckets([], op, now);
        expect([name, m, card.planned_total]).toEqual([name, m, table[m]]);
        expect(buckets.reduce((t, b) => t + b.planned, 0)).toBeCloseTo(table[m], 9);
        for (const b of card.buckets) expect(b.planned).toBe(groups[m][b.key]);
        seen++;
      }
      // the stored budget is the year ÷ 12, its parts add up to it, and a dated bill is in it once
      const doc = budgetFromOnboarding('u' as any, op);
      expect(doc.monthly_spending! * 12).toBeCloseTo(table.reduce((t, x) => t + x, 0), 9);
      expect(doc.fixed! + doc.non_monthly! + doc.flexible!).toBeCloseTo(doc.monthly_spending!, 9);
    }
    expect(seen).toBe(72);   // a guard proves it looked
  });
  test('the handoff example by hand: Sep $2,000, Dec $3,200, year $25,200, average $2,100 — the average is never a month\'s plan', () => {
    const op = HOUSEHOLDS.handoff;
    expect(budgetVsActual([], op, new Date(2026, 8, 15)).planned_total).toBe(2000);
    expect(budgetVsActual([], op, new Date(2026, 11, 15)).planned_total).toBe(3200);
    expect(spendByMonth(op).reduce((t, m) => t + m, 0)).toBe(25200);
    expect(plannedMonthlySpend(op)).toBe(2100);
    expect(budgetFromOnboarding('u' as any, op).monthly_spending).toBe(2100);
  });
});

/** THE STORED AVERAGE IS NEVER READ BACK IN (2026-10-25, FIX-BUDGET; MK-CF-F-013). budgetFromOnboarding stores the year ÷ 12 with
 *  every dated bill inside it once. Were a stored budget ever loaded back into the typed monthly total, the December bill would
 *  be in it twice ($2,100 typed + the $1,200 again in December). This proves nothing loads one: no code outside the budget module
 *  calls loadBudget, and the one reader of a stored doc (buildBudgetState) reads monthly_spending once. */
import * as fs from 'fs';
import * as path from 'path';
test('no code reads a stored budget back in — loadBudget has no caller, and buildBudgetState reads monthly_spending once', () => {
  const ROOT = path.join(__dirname, '..', '..', '..');
  const files: string[] = [];
  const walk = (d: string) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|__tests__|^\./.test(e.name)) walk(p); continue; }
    if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
  } };
  for (const d of ['src', 'app', 'MoneyKeel/functions']) walk(d);
  expect(files.length).toBeGreaterThanOrEqual(250);   // a guard proves it looked (280 source files on 2026-10-26)
  const callers = files.filter((f) => !f.endsWith(path.join('budget', 'index.ts')))
    .filter((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').some((l) => /\bloadBudget\(/.test(l) && !/^\s*(\*|\/\/)/.test(l)));
  expect(callers).toEqual([]);
  const src = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
  expect(src.match(/doc\.monthly_spending/g)).toHaveLength(1);
});
