// F2 dated grid — the agreement suite that lets screens move onto the grid without any number
// changing: cells reconcile with cashflowYear and spendByMonth by construction, and the new
// dated behaviors (real one-time dates, quarterly anchoring, deferred debts, F5 income seam)
// are pinned here once, for every future surface.
import { buildDatedGrid } from './index';
import { cashflowYear } from '../cashflow';
import { spendByMonth } from '../budget';
import { payoffPlan, type Debt } from '../debt';

const NOW = new Date('2026-07-15T12:00:00');   // mid-July → window Jul 2026 … Jun 2027

const employed: Record<string, any> = {
  status: 'employed', baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly',
  bonusAnnual: '12000', bonusMonth: 3,            // bonus lands in March (2027 in this window)
  taxMode: 'flat', flatRate: '25',
  spendCats: [
    { id: 'rent', bucket: 'fixed', amount: '2200', unit: 'dollar' },
    { id: 'groceries', bucket: 'flexible', amount: '600', unit: 'dollar' },
    { id: 'proptax', label: 'Property tax', bucket: 'nonmonthly', amount: '1900', unit: 'dollar', months: [11], dueDay: 15, tier: 'critical' },
  ],
};

describe('F2 dated grid — skeleton', () => {
  const g = buildDatedGrid(employed, { now: NOW });
  test('12 cells, anchored to the current month, with REAL years across the wrap', () => {
    expect(g.cells).toHaveLength(12);
    expect(g.cells[0]).toMatchObject({ calendarMonth: 7, year: 2026, label: 'Jul' });
    expect(g.cells[5]).toMatchObject({ calendarMonth: 12, year: 2026, label: 'Dec' });
    expect(g.cells[6]).toMatchObject({ calendarMonth: 1, year: 2027 });
    expect(g.cells[6].label).toBe('Jan ’27');
    expect(g.cells[11]).toMatchObject({ calendarMonth: 6, year: 2027, label: 'Jun ’27' });
  });
  test('every cell: the rows visibly sum to the bar (month-detail pin)', () => {
    for (const c of g.cells) {
      expect(c.inflow).toBeCloseTo(c.incomeItems.reduce((t, i) => t + i.amount, 0), 1);
      expect(c.outflow).toBeCloseTo(c.billItems.reduce((t, b) => t + b.amount, 0), 1);
    }
  });
});

describe('F2 — agreement with the canonical engines (numbers cannot change when screens move over)', () => {
  test('bill totals per cell equal spendByMonth for that calendar month, to the cent', () => {
    const g = buildDatedGrid(employed, { now: NOW });
    const cal = spendByMonth(employed);
    for (const c of g.cells) {
      const billSum = c.billItems.filter((b) => b.kind === 'bill').reduce((t, b) => t + b.amount, 0);
      expect(billSum).toBeCloseTo(cal[c.calendarMonth - 1], 1);
    }
  });
  test('total money in ≈ cashflowYear.totalIn on the same profile (no new features used)', () => {
    const g = buildDatedGrid(employed, { now: NOW });
    const cy = cashflowYear(employed, 0, NOW);
    expect(g.totalIn).toBeCloseTo(cy.totalIn, 0);
    // and the bonus lands in the SAME slot both ways (March)
    const slotMar = g.cells.findIndex((c) => c.calendarMonth === 3);
    expect(g.cells[slotMar].incomeItems.some((i) => i.source === 'Bonus')).toBe(true);
    expect(g.cells[slotMar].year).toBe(2027);
  });
});

describe('F2 — the founder-review behaviors (v1.1)', () => {
  test('one-time income lands in its REAL dated month (month + year), not a default', () => {
    const op: Record<string, any> = { ...employed, otherAmount: '5000', otherFreq: 'onetime', otherMonth: 2, otherIncomeYear: 2027, otherTaxable: 'no' };
    const g = buildDatedGrid(op, { now: NOW });
    const feb27 = g.cells.find((c) => c.calendarMonth === 2 && c.year === 2027)!;
    expect(feb27.incomeItems.find((i) => i.source === 'Other income')?.amount).toBe(5000);
  });
  test('one-time income dated beyond the window is NOT dropped — it lands in `later`', () => {
    const op: Record<string, any> = { ...employed, otherAmount: '5000', otherFreq: 'onetime', otherMonth: 9, otherIncomeYear: 2028, otherTaxable: 'no' };
    const g = buildDatedGrid(op, { now: NOW });
    expect(g.cells.every((c) => !c.incomeItems.some((i) => i.source.includes('One-time')))).toBe(true);
    expect(g.later).toContainEqual(expect.objectContaining({ month: 9, year: 2028, amount: 5000 }));
  });
  test('quarterly income anchors to ITS month (not hardcoded Mar/Jun/Sep/Dec)', () => {
    const op: Record<string, any> = { ...employed, otherAmount: '3000', otherFreq: 'quarterly', otherMonth: 8, otherTaxable: 'no' };
    const g = buildDatedGrid(op, { now: NOW });
    const hitMonths = g.cells.filter((c) => c.incomeItems.some((i) => i.source === 'Other income')).map((c) => c.calendarMonth);
    expect(hitMonths.sort((a, b) => a - b)).toEqual([2, 5, 8, 11]);   // Aug anchor → Aug/Nov/Feb/May
  });
  test('annual income lands FULLY in its month — never smeared /12', () => {
    const op: Record<string, any> = { ...employed, otherAmount: '24000', otherFreq: 'annual', otherMonth: 10, otherTaxable: 'no' };
    const g = buildDatedGrid(op, { now: NOW });
    const oct = g.cells.find((c) => c.calendarMonth === 10)!;
    expect(oct.incomeItems.find((i) => i.source === 'Other income')?.amount).toBe(24000);
    const others = g.cells.filter((c) => c.calendarMonth !== 10 && c.incomeItems.some((i) => i.source === 'Other income'));
    expect(others).toHaveLength(0);
  });
  test('deferred debt: NO payment appears before first_payment_date, payments run from it', () => {
    const carLoan: Debt = { debt_id: 'd1', label: 'Car loan (new)', debt_type: 'AUTO', remaining_balance: 20000, interest_rate_apr: 0.06, minimum_monthly_payment: 385, due_day: 1, first_payment_date: '2026-10-01' } as Debt;
    const g = buildDatedGrid(employed, { now: NOW, liabilities: [carLoan] });
    for (const c of g.cells) {
      const has = c.billItems.some((b) => b.kind === 'debt');
      const expected = c.year * 12 + c.calendarMonth >= 2026 * 12 + 10;
      expect(has).toBe(expected);
    }
  });
  test('deferred debt starting beyond the window shows in `later`, never silently missing', () => {
    const balloon: Debt = { debt_id: 'd2', label: 'Balloon', debt_type: 'PERSONAL', remaining_balance: 9000, interest_rate_apr: 0.05, minimum_monthly_payment: 250, first_payment_date: '2029-03-01' } as Debt;
    const g = buildDatedGrid(employed, { now: NOW, liabilities: [balloon] });
    expect(g.cells.every((c) => c.billItems.every((b) => b.kind !== 'debt'))).toBe(true);
    expect(g.later).toContainEqual(expect.objectContaining({ label: 'Balloon (payments start)', month: 3, year: 2029 }));
  });
  test('F5 seam: dated guaranteed income replaces the flat retirement line (no double counting)', () => {
    const retiree: Record<string, any> = {
      status: 'retired', taxMode: 'flat', flatRate: '10',
      incomeSources: ['retirement_income'], ri_ss: '2600', ri_ss_receiving: 'yes',
      spendCats: [{ id: 'rent', bucket: 'fixed', amount: '1200', unit: 'dollar' }],
    };
    const dated = [
      { source: 'Social Security', amount: 2600, month: 8, year: 2026, day: 3 },
      { source: 'Pension (annual)', amount: 19200, month: 12, year: 2026, day: 1 },
    ];
    const g = buildDatedGrid(retiree, { now: NOW, guaranteedIncome: dated });
    expect(g.cells.every((c) => !c.incomeItems.some((i) => i.source === 'Retirement income'))).toBe(true);
    const aug = g.cells.find((c) => c.calendarMonth === 8 && c.year === 2026)!;
    expect(aug.incomeItems).toContainEqual(expect.objectContaining({ source: 'Social Security', amount: 2600, day: 3 }));
    const dec = g.cells.find((c) => c.calendarMonth === 12 && c.year === 2026)!;
    expect(dec.incomeItems).toContainEqual(expect.objectContaining({ source: 'Pension (annual)', amount: 19200 }));
  });
});

describe('payoffPlan honors first_payment_date (deferred loans)', () => {
  const now = new Date('2026-07-15T12:00:00');
  const base: Debt = { debt_id: 'd1', label: 'Student loan', debt_type: 'STUDENT_LOAN', remaining_balance: 12000, interest_rate_apr: 0.05, minimum_monthly_payment: 300 } as Debt;
  test('undeferred behavior unchanged; deferred pays off later with more interest', () => {
    const nowPlan = payoffPlan([base], 0, 'avalanche', now);
    const deferred = payoffPlan([{ ...base, first_payment_date: '2027-07-01' }], 0, 'avalanche', now);
    expect(deferred.months).toBeGreaterThan(nowPlan.months + 10);       // ~a year of waiting
    expect(deferred.totalInterest).toBeGreaterThan(nowPlan.totalInterest);  // interest accrued while waiting
    expect(deferred.neverPaysOff).toBe(false);
  });
  test('a second live debt is not starved while the deferred one waits', () => {
    const card: Debt = { debt_id: 'd2', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 2000, interest_rate_apr: 0.22, minimum_monthly_payment: 60 } as Debt;
    const plan = payoffPlan([{ ...base, first_payment_date: '2027-07-01' }, card], 100, 'avalanche', now);
    const cardRow = plan.order.find((o) => o.debt_id === 'd2')!;
    const solo = payoffPlan([card], 100, 'avalanche', now);
    expect(cardRow.payoffMonth).toBe(solo.months);   // the waiting loan neither steals nor delays the card
  });
});

// B47 finding 11 — a loan due IN FULL is ONE dated big-ticket in its month, never a monthly row.
describe('B47 finding 11 — due-in-full debts in the dated grid', () => {
  const lump: Debt = { debt_id: 'l1', label: 'Family loan', debt_type: 'PERSONAL', payment_type: 'due_in_full', remaining_balance: 15000, interest_rate_apr: 0, minimum_monthly_payment: 0, payoff_date: '2026-12-31' } as Debt;
  test('the whole balance lands once, in the due month, carrying the due day', () => {
    const g = buildDatedGrid(employed, { now: NOW, liabilities: [lump] });
    const rows = g.cells.map((c) => c.billItems.filter((b) => b.label.includes('Family loan')));
    const hits = rows.flat();
    expect(hits).toHaveLength(1);                                // ONCE — not 12 monthly rows
    expect(hits[0]).toMatchObject({ amount: 15000, kind: 'debt', day: 31, critical: true });
    const dec = g.cells.findIndex((c) => c.calendarMonth === 12 && c.year === 2026);
    expect(rows[dec]).toHaveLength(1);                           // and in December specifically
  });
  test('due beyond the 12-month window → surfaces under "Later", never silently dropped', () => {
    const far = { ...lump, payoff_date: '2028-03-01' } as Debt;
    const g = buildDatedGrid(employed, { now: NOW, liabilities: [far] });
    expect(g.cells.flatMap((c) => c.billItems).some((b) => b.label.includes('Family loan'))).toBe(false);
    expect(g.later.some((l) => l.label.includes('Family loan') && l.amount === 15000 && l.year === 2028)).toBe(true);
  });
});
