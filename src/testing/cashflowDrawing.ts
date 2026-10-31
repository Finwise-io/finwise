/** THE HOUSEHOLDS THE CASH FLOW DRAWING DRAWS, ON THE DRAWING'S OWN DAY (2026-10-25, CF-MMFIX-A).
 *
 *  cash-flow_v01 (approved 2026-09-28, DEC-0440) draws August 2026. Every frame is set up here on Aug 20, 2026 — the day after
 *  its newest row ("19 Aug · Target") and before the car loan's 28th — so every figure and every date the drawing prints can
 *  be compared as printed, not as a stand-in token. Each household is worked by hand against the drawing's own sums
 *  (its rule 8): 5,000 − 2,000 − 250 − 2,000 − 200 − 200 = 350 · 5,000 − 2,000 − 0 − 500 − 1,200 − 200 − 200 = 900 ·
 *  200 + 900 + 200 + 700 = 2,000 · 500 + 1,200 + 200 + 200 = 2,100.
 *
 *  Sixteen of the card's purchases are dated Aug 1 on purpose: a calendar day read as midnight in London is Jul 31 in a US
 *  time zone, and that is how the budget editor dropped them out of their rows (CF-21).
 */
import { useStore } from '../store/useStore';
import { drawingLines } from './mockMatch';

/** The drawing's day, at noon on the person's own clock. */
export const DRAWN_DAY = '2026-08-20';
export const DRAWN_NOW = new Date(2026, 7, 20, 12, 0, 0);
/** Everything but Date stays real, so a screen still renders and settles. */
export const ONLY_THE_CLOCK = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;

const aug = (d: number) => `2026-08-${String(d).padStart(2, '0')}`;
/** Someone who works and types a take-home of $5,000/month, 45 years old in 2026. */
export const WORKER = { status: 'employed', incomeSources: ['employment'], birthYear: '1981',
  baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' };
/** The budget frame C draws, by category: Gas $200 · Grocery $900 · Utilities $200, and the rest of the $2,000 is Other ($700). */
export const BUDGET_BY_CATEGORY = { monthlySpending: '2000', spendCats: [
  { id: 'gas', label: 'Gas', bucket: 'flexible', amount: 200, unit: 'dollar', custom: true },
  { id: 'grocery', label: 'Grocery', bucket: 'flexible', amount: 900, unit: 'dollar', custom: true },
  { id: 'utilities', label: 'Utilities', bucket: 'fixed', amount: 200, unit: 'dollar' },
] };
export const DEBTS = [
  { debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.05, minimum_monthly_payment: 2000, due_day: 1 },
  { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 250, due_day: 28 },
];
export const RADAR = [
  { debt_id: 'h', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 20000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 },
  { debt_id: 'v', label: 'Credit card debt payment', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 200 },
];
const pay = (store: string, amount: number, day: number) => ({ id: `p-${store}`, amount, category: 'Debt payment', store, date: aug(day), notes: '', createdAt: `${aug(day)}T09:00:00` });
const typed = (day: number, store: string, category: string, amount: number, receipt = false) =>
  ({ id: `h-${store}-${day}`, amount, category, store, date: aug(day), notes: '', createdAt: `${aug(day)}T09:00:00`, ...(receipt ? { receiptUri: 'file://r.jpg' } : {}) });
const card = (day: number, store: string, category: string, amount: number, i = 0) =>
  ({ id: `c-${store}-${day}-${i}`, amount, category, store, date: aug(day), notes: '', createdAt: `${aug(day)}T09:00:00`, origin: 'imported' });

/** Frames A and C: nine by hand ($500: five shown, $195 behind "Show all 9"), twenty-three from the card ($1,200: five shown,
 *  $560 behind "Show all 23" — Safeway $120, Netflix $18 and sixteen more making $422 = 32 + 15 × 26), the mortgage paid on the
 *  1st, the HELOC and the card payment entered on the Debts tab. */
export const FRAME_C_EXPENSES = [
  typed(18, 'Amazon', 'Other', 100), typed(16, 'Trader Joe’s', 'Grocery', 65, true), typed(14, 'Shell', 'Gas', 60), typed(11, 'CVS', 'Other', 42, true), typed(9, 'Starbucks', 'Other', 38, true),
  typed(7, 'Costco', 'Grocery', 88, true), typed(6, 'Chevron', 'Gas', 55), typed(4, 'Walgreens', 'Other', 30, true), typed(2, 'PG&E', 'Utilities', 22),
  card(19, 'Target', 'Other', 15), card(16, 'Home Depot', 'Other', 315), card(11, 'Chevron', 'Gas', 70), card(8, 'Local Kitchen', 'Other', 95), card(3, 'Whole Foods', 'Grocery', 145),
  card(2, 'Safeway', 'Grocery', 120), card(2, 'Netflix', 'Other', 18), ...Array.from({ length: 16 }, (_, i) => card(1, 'Corner shop', 'Other', i === 0 ? 32 : 26, i)),
  pay('Mortgage', 2000, 1), pay('HELOC', 200, 5), pay('Credit card debt payment', 200, 5),
];

function reset(extra: Record<string, unknown>) {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, ...extra } as any);
}
/** Frames A and C — the drawing's household with data. */
export const householdWithData = () => reset({ onboardingProfile: { ...WORKER, ...BUDGET_BY_CATEGORY }, liabilities: [...DEBTS, ...RADAR], expenses: FRAME_C_EXPENSES });
/** Frame B — a fresh account: income and debts, the mortgage paid, no budget. */
export const householdFreshB = () => reset({ onboardingProfile: WORKER, liabilities: DEBTS, expenses: [pay('Mortgage', 2000, 1)] });
/** Frame D — a fresh account: income and debts, nothing logged, no budget. */
export const householdFreshD = () => reset({ onboardingProfile: WORKER, liabilities: DEBTS, expenses: [] });
/** Frame 5 — the Income tab: $6,200/month take-home; two rentals that net $0; RSU grants with no value yet; two paychecks. */
export const householdIncome = () => reset({
  onboardingProfile: { ...WORKER, baseSalary: '6200', monthlySpending: '2000',
    rentals: [{ property_id: 'p1', type: 'long', income: '1500', expenses: '1500' }, { property_id: 'p2', type: 'long', income: '900', expenses: '900' }],
    equityType: 'rsu', rsuGrants: [{ id: 'g1', shares: '', price: '', date: '2027-03' }] },
  incomes: [{ id: 'i2', date: aug(15), source: 'Paycheck', amount: 3100 }, { id: 'i1', date: aug(1), source: 'Paycheck', amount: 3100 }],
});
/** Frame 6 — Debts: a $3,200 Visa at 22.90% ($110/month) and a $9,800 car loan at 6.40% ($300/month), $17,100 owed in January. */
export const householdDebts = () => reset({
  onboardingProfile: { ...WORKER, monthlySpending: '2000' },
  liabilities: [
    { debt_id: 'v', label: 'Visa card', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 110 },
    { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 300 },
  ],
  monthlySnapshots: { '2026-01': { month: '2026-01', gross_debt: 17100 } },
});
/** A brand-new person: signed up, nothing entered anywhere. Not drawn; held to his rulings DEC-0260 / DEC-0431 (Q48). */
export const householdBrandNew = () => reset({ onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1981' } });

// ── THE DRAWING AS IT WILL BE BUILT: its phones, with every dated row and ruling that changes a phone applied by name ─────────

export const CASHFLOW_DRAWING = 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html';
const CHROME = new Set(['9:41', '▮▮▮ ⌁', '▦ Menu', 'Money', 'Keel', '◉', '⚙']);
/** Phone n of cash-flow_v01 (1 = This month A … 6 = Debts), from the status bar to the tab bar, chrome left out. `folded` leaves
 *  out the rows the drawing folds under "Show all N" — they are behind a tap. */
export function cashflowPhone(n: number, folded = false): string[] {
  const L = drawingLines(CASHFLOW_DRAWING, folded ? [/<\/summary>[\s\S]*?<\/details>/g] : []);
  const starts = L.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  if (starts.length !== 6) throw new Error(`cash-flow_v01 has ${starts.length} phones, not 6 — the reader no longer sees the drawing`);
  const seg = L.slice(starts[n - 1], starts[n] ?? L.length);
  const end = seg.findIndex((l, k) => (l === '⌂' || l === 'Home') && k > 8);   // the tab bar closes the phone
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
}

/** One change to a drawn phone, with the row or ruling that makes it. Every anchor must be on the phone exactly once, so an
 *  edit that no longer finds its line fails instead of passing quietly (a guard proves it looked). */
export type DrawnEdit = { why: string } & (
  | { replace: [string, string] }
  /** every occurrence, at least one — for a line the phone prints twice, e.g. the month in the heading and in the switcher */
  | { replaceEvery: [string, string] }
  | { insertAfter: [string, string[]] }
  | { remove: string[] }
  | { append: string[] }
  | { centsAfter: string[] }
  /** the figure after EVERY occurrence of each label, at least one — for a name the phone prints twice (a debt's payment row and
   *  its radar row) */
  | { centsAfterEvery: string[] });
const once = (L: string[], line: string, why: string) => {
  const at = L.map((l, i) => (l === line ? i : -1)).filter((i) => i >= 0);
  if (at.length !== 1) throw new Error(`${why}: "${line}" is on the phone ${at.length} times, not once`);
  return at[0];
};
export function asBuilt(drawn: string[], edits: DrawnEdit[]): string[] {
  let L = drawn.slice();
  for (const e of edits) {
    if ('replace' in e) { const i = once(L, e.replace[0], e.why); L[i] = e.replace[1]; }
    else if ('replaceEvery' in e) {
      const n = L.filter((l) => l === e.replaceEvery[0]).length;
      if (n === 0) throw new Error(`${e.why}: "${e.replaceEvery[0]}" is not on the phone`);
      L = L.map((l) => (l === e.replaceEvery[0] ? e.replaceEvery[1] : l));
    }
    else if ('insertAfter' in e) { const i = once(L, e.insertAfter[0], e.why); L = [...L.slice(0, i + 1), ...e.insertAfter[1], ...L.slice(i + 1)]; }
    else if ('remove' in e) {
      const at = L.map((_, i) => i).filter((i) => e.remove.every((r, k) => L[i + k] === r));
      if (at.length !== 1) throw new Error(`${e.why}: the run "${e.remove.join(' | ')}" is on the phone ${at.length} times, not once`);
      L.splice(at[0], e.remove.length);
    } else if ('append' in e) L = [...L, ...e.append];
    else if ('centsAfterEvery' in e) for (const label of e.centsAfterEvery) {
      const at = L.map((l, i) => (l === label ? i : -1)).filter((i) => i >= 0);
      if (at.length === 0) throw new Error(`${e.why}: "${label}" is not on the phone`);
      for (const i of at) {
        const j = L.findIndex((l, k) => k > i && /^[+−-]?\$[\d,]+$/.test(l));
        if (j < 0) throw new Error(`${e.why}: no figure after "${label}"`);
        L[j] = `${L[j]}.00`;
      }
    }
    else for (const label of e.centsAfter) {
      const i = once(L, label, e.why);
      const j = L.findIndex((l, k) => k > i && /^[+−-]?\$[\d,]+$/.test(l));
      if (j < 0) throw new Error(`${e.why}: no figure after "${label}"`);
      L[j] = `${L[j]}.00`;
    }
  }
  return L;
}

const KEPT = 'DEC-1560 (2026-10-04, “Rest - keep it.”): kept as built, not drawn';
const CENTS = 'cash-flow_v01 READ THIS FIRST, 2026-10-25 — an expense or a payment received prints to the cent (DEC-0264)';
const ONCE = 'cash-flow_v01 READ THIS FIRST, 2026-10-27 — rows round once (the lead’s R5, CF2-06): every total over rows written to the cent is written to the cent';
/** Each frame of cash-flow_v01, as the dated rows say it is built. Figures that depend on today's date are none: every frame is
 *  rendered on the drawing's own day (DRAWN_NOW). */
export const AS_BUILT: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', () => string[]> = {
  A: () => asBuilt(cashflowPhone(1), [{ why: KEPT, append: ['＋ Expense'] }]),
  B: () => asBuilt(cashflowPhone(2), [{ why: KEPT, append: ['＋ Expense'] }]),
  C: () => asBuilt(cashflowPhone(3, true), [
    { why: CENTS, centsAfter: ['18 Aug · Amazon', '16 Aug · Trader Joe’s', '14 Aug · Shell', '11 Aug · CVS', '9 Aug · Starbucks',
      '19 Aug · Target', '16 Aug · Home Depot', '11 Aug · Chevron', '8 Aug · Local Kitchen', '3 Aug · Whole Foods'] },
    { why: 'cash-flow_v01 READ THIS FIRST, 2026-10-25 — no card can be connected yet, so the connected card’s radar row is not drawn',
      remove: ['Credit card debt payment', 'debt', 'connected card · NOT counted as an expense — the $1,200 of purchases is', '$1,200'] },
    // the totals over those rows, and the debt payments and the radar's payments, to the cent: $500.00 · $1,200.00 · $400.00 · $2,100.00
    { why: ONCE, centsAfter: ['Actual expenses', 'Entered by hand', '= Entered by hand · 9 items', 'Imported from your card', '= Imported · 23 purchases',
      'Debt payments counted as expenses', '= Actual expenses, all sources'] },
    { why: ONCE, centsAfterEvery: ['HELOC payment', 'Credit card debt payment'] },
    { why: ONCE, replace: ['Show all 9 · $195 more ›', 'Show all 9 · $195.00 more ›'] },
    { why: ONCE, replace: ['Show all 23 · $560 more ›', 'Show all 23 · $560.00 more ›'] },
    { why: KEPT, insertAfter: ['Your mortgage and car loan never appear here. They are the same every month, and a warning you see every month stops being a warning.', ['Import a statement ›']] },
    { why: KEPT, append: ['＋ Expense'] },
  ]),
  D: () => asBuilt(cashflowPhone(4, true), [
    { why: ONCE, centsAfter: ['Actual expenses'] },   // $0.00, the one form of that total
    { why: KEPT, insertAfter: ['Nothing unusual. Regular debt payments never appear here — only a card or HELOC payment, or a bill well above its usual size.', ['Import a statement ›']] },
    { why: KEPT, append: ['＋ Expense'] },
  ]),
  E: () => asBuilt(cashflowPhone(5), [
    { why: 'cash-flow_v01 READ THIS FIRST, 2026-10-25 — DRAWING ERROR: the grey line under “Add your income ›” is the drawing’s own note', remove: ['opens the steady-or-varies pop-up — variable earners fine-tune month by month'] },
    { why: CENTS, centsAfter: ['Aug 15 · Paycheck', 'Aug 1 · Paycheck'] },
    { why: KEPT, append: ['Your income, all of it', 'the take-home, and what it is taxed on', 'Open ›', '＋ Expense'] },
  ]),
  F: () => asBuilt(cashflowPhone(6), [
    // $110 + $300 = $410 (the drawing's $310 leaves $10 for the Visa); the interest a month is kept: 3,200 × 22.9% ÷ 12 = $61.07
    // and 9,800 × 6.4% ÷ 12 = $52.27, $113.33 in all → $113
    // the total line as drawn — the interest is on each debt's line (DEC-1560), not the total (2026-10-27, CF2-03; it read "· ~$113/month interest")
    { why: 'cash-flow_v01 READ THIS FIRST, 2026-10-25 — DRAWING ERROR: $410/month in payments',
      replace: ['across 2 debts · $310/month in payments', 'across 2 debts · $410/month in payments'] },
    // PAYOFF PLAN: its words, and the payments a month ($110 + $300); the month it ends and its interest are counted from today
    // its title on a dark-green bar (DEC-8839, R1 — cash-flow_v01's row of 2026-10-27)
    { why: KEPT, insertAfter: ['across 2 debts · $410/month in payments', ['PAYOFF PLAN', 'Avalanche', 'Snowball',
      'Highest interest rate first — saves the most interest.', 'Extra / month', '$', '<the month it ends>', 'debt-free', '$410', '/month total', '<its interest>', 'total interest']] },
    { why: KEPT, replace: ['22.90% — the costliest', '22.90% — the costliest · $110/month min · ~$61/month interest'] },
    // a $9,800 loan at 6.40% paying $300/month: n = −ln(1 − 0.0053333 × 9,800 ÷ 300) ÷ ln(1.0053333) = 35.99 → 36 months, 3 years
    { why: KEPT, replace: ['6.40% · 3 years left', '6.40% · 3 years left · $300/month min · ~$52/month interest'] },
    // "+ Add debt account" under the list, as DEC-1560 keeps it (2026-10-27, CF2-05: it was after PROGRESS); no edit hint (CF2-04)
    { why: KEPT, insertAfter: ['Log a payment ›', ['+ Add debt account']] },
    { why: KEPT, append: ['＋ Expense'] },
  ]),
};
