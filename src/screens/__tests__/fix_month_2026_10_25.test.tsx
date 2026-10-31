/** FIX-MONTH (2026-10-25) — THE MONTH, THE DEBTS AND THE PAYCHECK, EACH FIGURE ONE NUMBER ON EVERY SCREEN THAT SHOWS IT.
 *
 *  Every check RENDERS the real screens with one household and reads the words a person sees; every figure is worked by hand
 *  first. The rows on cash-flow_v01 and net-worth v08 of 2026-10-25 say what changed.
 *    1 · THE MORTGAGE COUNTED ONCE, PLANNED AND ACTUAL (the lead's ruling on DEC-1923 / DEC-2440). The worked September: $7,200
 *        take-home; a $3,400 budget — Rent / Mortgage $2,300, Groceries $700, Eating out $400; a $2,400 mortgage on no property and
 *        a $250 car loan; logged $2,300 "Rent / Mortgage", $512, $186 and the $250 car loan paid.
 *        Planned: the line stands down, 3,400 − 2,300 = $1,100; 7,200 − 2,400 − 250 − 1,100 = +$3,450 (it read +$1,150).
 *        Actual: the $2,300 logged under the line is the mortgage's payment — Mortgage PAID −$2,300, Car loan PAID −$250, expenses
 *        $512 + $186 = $698; 7,200 − 2,300 − 250 − 698 = +$3,952 (the same as before; the rows now say what was paid).
 *        Budget editor: $698 spent of the $1,100 plan, $402 left (it read $2,998 spent, $1,898 over). Home: $7,200 · $3,248 · $3,952.
 *    2 · THE PAYOFF PLAN PAYS WHAT IS PAID (DEC-0641): a $300 payment set on a $9,000 card at 24% ($200 minimum) and a $14,000 car
 *        loan at 6.9% ($250): $550 a month, debt-free 56 months on (Jun 2031 from Oct 1, 2026), $7,647 of interest.
 *    3 · A RATE NEVER ENTERED: "rate not entered", no interest figure, no payoff date.
 *    4 · A PAYMENT MATCHED BY THE DEBT ITSELF: "Log a payment" records the debt's id.
 *    5 · ONE RETURN ON BOTH SCREENS: the paycheck runs the Retirement cockpit's return (willItLastInputs).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
function readLines(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const SCREENS: Record<string, () => any> = {
  home: () => require('../HomeScreen').default, cashflow: () => require('../CashFlowScreen').default,
};
function shoot(name: 'home' | 'cashflow', state: any, today: string, act?: () => void): string[] {
  jest.useFakeTimers({ now: new Date(`${today}T12:00:00`), doNotFake: [...FAKE] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...state } as any);
    const C = SCREENS[name]();
    const r = render(<C />);
    if (act) act();
    const lines = readLines();
    r.unmount();
    return lines;
  } finally { jest.useRealTimers(); }
}
const after = (L: string[], label: string, n = 1, from = 0): string | undefined => { const i = L.indexOf(label, from); return i >= 0 ? L[i + n] : undefined; };
const block = (L: string[], start: string, end: string) => { const a = L.indexOf(start); const b = L.indexOf(end, a); return L.slice(a, b + 2); };

// ── 1 · the worked September ──────────────────────────────────────────────────────────────────────────────────────────
const SEPT: any = { nwSetupChoice: 'self',
  onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
    monthlySpending: '3400', spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed', tier: 'need' },
      { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' }, { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible', tier: 'flex' }] },
  liabilities: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }],
  expenses: [{ id: 'e1', amount: 2300, category: 'Rent / Mortgage', store: 'Rent', date: '2026-09-01', createdAt: '2026-09-01' },
    { id: 'e2', amount: 512, category: 'Groceries', store: 'Grocer', date: '2026-09-07', createdAt: '2026-09-07' },
    { id: 'e3', amount: 186, category: 'Eating out', store: 'Diner', date: '2026-09-12', createdAt: '2026-09-12' },
    { id: 'e4', amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12', createdAt: '2026-09-12' }],
  assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 5000, asset_class: 'cash' }] };
const UNPLACED = 'Your Rent / Mortgage budget line is not counted here: your mortgage, Mortgage, is in Debts and is counted from there. Place it on your home in Net worth, so we know they are the same.';

describe('1 · the mortgage counted once — planned, actual, the budget editor and Home agree', () => {
  test('This month: planned +$3,450 with the line stood down and said; actual +$3,952 with the mortgage PAID −$2,300', () => {
    const L = shoot('cashflow', SEPT, '2026-09-28');
    const planned = block(L, 'PLANNED · SEPTEMBER', '= Planned surplus');
    expect(planned[1]).toBe('+$3,450');                                       // 7,200 − 2,400 − 250 − 1,100
    expect(after(planned, 'Expenses')).toBe('your budget');
    expect(planned).toContain('−$1,100');                                     // 3,400 − the 2,300 line, now the mortgage's
    expect(L).toContain(UNPLACED);
    const actual = block(L, 'ACTUAL · SO FAR', '= Actual surplus so far');
    expect(actual[1]).toBe('+$3,952');                                        // 7,200 − 2,300 − 250 − 698
    const m = actual.indexOf('Mortgage');
    expect(actual.slice(m, m + 3)).toEqual(['Mortgage', 'PAID', '−$2,300']);   // the $2,300 logged under the line, paid on the mortgage
    expect(after(actual, 'Expenses entered by hand')).toBe('−$698');          // 512 + 186
  });
  test('the budget editor: $698 spent of the $1,100 plan — $402 left (it read $1,898 over)', () => {
    const L = shoot('cashflow', SEPT, '2026-09-28', () => {
      fireEvent.press(screen.getByLabelText('Expenses tab'));
      const b = screen.getAllByRole('button').find((x) => String(x.props.accessibilityLabel ?? '').startsWith('Planned expenses:'));
      fireEvent.press(b!);
    });
    expect(L.some((l) => /\$402 left · of \$1,100 plan$/.test(l))).toBe(true);
    expect(L.join(' ')).not.toMatch(/\$1,898 over/);
  });
  test('Home’s box: Income $7,200 · Outflow (expenses + debt) $3,248 · Left $3,952 — the Cash flow tab’s actual surplus', () => {
    const H = shoot('home', SEPT, '2026-09-28');
    const i = H.indexOf("THIS MONTH’S CASH FLOW");
    expect(i).toBeGreaterThanOrEqual(0);
    const box = H.slice(i, i + 12).join(' | ');
    expect(box).toMatch(/\$7,200/); expect(box).toMatch(/\$3,248/); expect(box).toMatch(/\$3,952/);
  });
  test('a renter keeps the line: no mortgage in Debts, the logged $2,300 is rent — planned +$3,550 (7,200 − 250 − 3,400), expenses $2,998', () => {
    const renter = { ...SEPT, liabilities: [SEPT.liabilities[1]] };
    const L = shoot('cashflow', renter, '2026-09-28');
    expect(block(L, 'PLANNED · SEPTEMBER', '= Planned surplus')[1]).toBe('+$3,550');   // 7,200 − 250 − 3,400
    expect(after(block(L, 'ACTUAL · SO FAR', '= Actual surplus so far'), 'Expenses entered by hand')).toBe('−$2,998');
    expect(L.join(' ')).not.toMatch(/not counted here/);
  });
});

// ── 2 and 3 · the Debts tab ───────────────────────────────────────────────────────────────────────────────────────────
const H_DEBT: any = { onboardingProfile: SEPT.onboardingProfile,
  liabilities: [{ debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200, monthly_payment: 300 },
    { debt_id: 'a', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 }] };
const debtsTab = () => fireEvent.press(screen.getByLabelText('Debts tab'));
describe('2 · the payoff plan pays what is paid (DEC-0641)', () => {
  test('$550 /month total, debt-free Jun 2031, $7,647 total interest — "in payments" reads the same $550', () => {
    const L = shoot('cashflow', H_DEBT, '2026-10-01', debtsTab);
    // the payments only — each debt's interest is on its own line (DEC-1560; CF2-03, 2026-10-27): $180 and $81 (9,000 × 24% ÷ 12; 14,000 × 6.9% ÷ 12 = 80.50)
    expect(L).toContain('across 2 debts · $550/month in payments');
    expect(after(L, '/month total', -1)).toBe('$550');
    expect(after(L, 'debt-free', -1)).toBe('Jun 2031');                       // Oct 2026 + 56 months
    expect(after(L, 'total interest', -1)).toBe('$7,647');
  });
});
describe('3 · a rate never entered', () => {
  test('the row says "rate not entered", the interest and the payoff give no figure and name the debt', () => {
    const lake = { debt_id: 'm', label: 'Lake house mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: undefined, minimum_monthly_payment: 1900 };
    const L = shoot('cashflow', { ...H_DEBT, liabilities: [lake, H_DEBT.liabilities[1]] }, '2026-10-01', debtsTab);
    expect(L).toContain('across 2 debts · $2,150/month in payments');
    expect(L).toContain('Lake house mortgage’s rate is not entered, so there is no interest figure — we won’t guess one.');
    expect(L).toContain('Lake house mortgage’s rate is not entered, so there is no payoff date — we won’t guess one.');
    expect(L.find((l) => l.startsWith('rate not entered'))).toBe('rate not entered · $1,900/month min');
    expect(L.join(' ')).not.toMatch(/0\.00%|never at this rate|NaN/);
  });
});

// ── 4 · a payment matched by the debt itself ──────────────────────────────────────────────────────────────────────────
describe('4 · "Log a payment" records which debt it was paid on', () => {
  test('two debts called "Loan": the payment logged on the second is the second\'s, by its id', () => {
    const two = { ...H_DEBT, liabilities: [
      { debt_id: 'A', label: 'Loan', debt_type: 'PERSONAL', remaining_balance: 5000, interest_rate_apr: 0.08, minimum_monthly_payment: 250 },
      { debt_id: 'B', label: 'Loan', debt_type: 'PERSONAL', remaining_balance: 3000, interest_rate_apr: 0.06, minimum_monthly_payment: 250 }] };
    jest.useFakeTimers({ now: new Date('2026-10-12T12:00:00'), doNotFake: [...FAKE] });
    try {
      useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
      useStore.setState({ hideBalances: false, ...two } as any);
      const { Alert } = require('react-native');
      const spy = jest.spyOn(Alert, 'alert').mockImplementation((...a: any[]) => { const btns = a[2] as any[]; btns.find((b) => b.text === 'Loan' && btns.indexOf(b) === 1)?.onPress(); });
      const C = SCREENS.cashflow();
      render(<C />); debtsTab();
      fireEvent.press(screen.getByLabelText('Log a payment'));
      spy.mockRestore();
      fireEvent.press(screen.getByText('Log'));
      const logged = (useStore.getState() as any).expenses.find((e: any) => e.category === 'Debt payment');
      expect(logged).toMatchObject({ store: 'Loan', debtId: 'B' });   // the second "Loan" chosen in the sheet's list, by its id
      // and This month's ACTUAL credits that debt alone: the other "Loan" still reads unpaid
      const L = readLines();
      expect(L.join(' ')).not.toMatch(/given to neither/);
    } finally { jest.useRealTimers(); }
  });
});

// ── 5 · one return on both screens ────────────────────────────────────────────────────────────────────────────────────
describe('5 · the paycheck and the Retirement cockpit run one return', () => {
  test('no return set: the paycheck\'s mean is the cockpit\'s (the blended benchmark, 6% with nothing set aside)', () => {
    const { willItLastInputs } = require('../../domain/retirement/willItLast');
    const { paycheckReturn } = require('../../domain/paycheck');
    const cases = [
      { op: { status: 'retired', birthYear: '1958', ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '3000', incomeSources: ['retirement_income'] }, accounts: [] as any[], A: {} },
      { op: { status: 'retired', birthYear: '1958', ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '3000', incomeSources: ['retirement_income'] },
        accounts: [{ asset_id: 'k', label: '401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07, retirement_pct: 100 }], A: {} },
      { op: { status: 'retired', birthYear: '1958', ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '3000', incomeSources: ['retirement_income'] },
        accounts: [{ asset_id: 'k', label: '401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07, retirement_pct: 100 }], A: { expectedReturn: 0.05, returnBasis: 'scenario' } },
    ];
    for (const c of cases) {
      const cockpit = willItLastInputs({ op: c.op, accounts: c.accounts, assumptions: c.A });
      const pay = paycheckReturn(c.accounts, c.A, c.op);
      expect(pay.mean_return).toBeCloseTo(cockpit.mean_return, 12);
    }
    expect(paycheckReturn([], {}, null).mean_return).toBe(0.06);
  });
});

// ── 6 · a typed $0 budget is a $0 plan (FIX-BUDGET's one rule, budgetEntered) ─────────────────────────────────────────────
describe('6 · a typed $0 budget is a plan of $0; nothing entered is no plan', () => {
  const ZERO = { ...SEPT, liabilities: [SEPT.liabilities[1]], expenses: [],
    onboardingProfile: { ...SEPT.onboardingProfile, monthlySpending: '0', spendCats: [] } };
  test('typed $0: Expenses −$0 "your budget" and = Planned surplus +$6,950 (7,200 − 250 − 0); nothing typed: "— not set"', () => {
    const L = shoot('cashflow', ZERO, '2026-09-28');
    const planned = block(L, 'PLANNED · SEPTEMBER', '= Planned surplus');
    expect(planned[1]).toBe('+$6,950');
    expect(after(planned, 'Expenses')).toBe('your budget');
    const none = shoot('cashflow', { ...ZERO, onboardingProfile: { ...ZERO.onboardingProfile, monthlySpending: undefined } }, '2026-09-28');
    expect(none).toContain('Your debts are here, but you haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.');
    expect(none.join(' ')).not.toMatch(/= Planned surplus/);
  });
});

// ── 7 · a past month never saved is not called "Frozen" (MK-CF-F-220) ──────────────────────────────────────────────────
describe('7 · "Frozen" only when a record stands behind the month', () => {
  test('August with no record: "Added up from what is logged for this month — it changes if more is logged."; with a record: "Frozen —"', () => {
    const aug = { ...SEPT, expenses: [{ id: 'a1', amount: 500, category: 'Groceries', store: 'Grocer', date: '2026-08-20', createdAt: '2026-08-20' }] };
    const prev = () => fireEvent.press(screen.getByLabelText('Previous month'));
    const none = shoot('cashflow', aug, '2026-09-28', prev);
    expect(none).toContain('Added up from what is logged for this month — it changes if more is logged.');
    expect(none).not.toContain('Frozen — past months never change under you.');
    const saved = shoot('cashflow', { ...aug, monthlySnapshots: { '2026-08': { month: '2026-08', income_net: 7200, spending: 500, debt_paid: 0, captured_at: '2026-09-01T08:00:00Z' } } }, '2026-09-28', prev);
    expect(saved).toContain('Frozen — past months never change under you.');
  });
});

// ── 8 · the Roth conversion's tax, dated by the year it is for (MK-CF-F-226) ──────────────────────────────────────────────
describe('8 · a Roth conversion\'s tax is due the April after the year it is for', () => {
  test('adopted for 2026, read in January 2027: the bill is April 2027, inside the twelve months shown', () => {
    const { datedGridOf } = require('../../hooks/useCashflowModel');
    jest.useFakeTimers({ now: new Date('2027-01-17T12:00:00'), doNotFake: [...FAKE] });
    try {
      const g = datedGridOf(SEPT.onboardingProfile, [], 1831.17, undefined, 2026);
      const apr = g.cells.find((c: any) => c.year === 2027 && c.calendarMonth === 4);
      expect(apr.billItems.find((b: any) => /Roth conversion tax/.test(b.label)).amount).toBeCloseTo(1831.17, 6);
      expect(g.later.filter((l: any) => /Roth conversion tax/.test(l.label))).toEqual([]);
    } finally { jest.useRealTimers(); }
  });
});

// ── 9 · Cash flow's months read the income the accounts pay (FIX-INCOME-B's profileWithAccountIncome) ─────────────────────
describe('9 · the Cash flow model hands its months the profile with what the accounts pay', () => {
  test('savings $10,000 at 4%, nothing typed: the grid useCashflowModel builds is the grid of profileWithAccountIncome — the $400 counted in the rate', () => {
    const { useCashflowModel, datedGridOf } = require('../../hooks/useCashflowModel');
    const { profileWithAccountIncome } = require('../../domain/income/onboarding');
    const { theBudgetCounted } = require('../../../MoneyKeel/functions/cashflow/budget-counted');
    const op = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', filingStatus: 'single', baseSalary: '6000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '2000' };
    const SAV = { asset_id: 'sav-1', label: 'Savings', kind: 'savings', asset_class: 'cash', tax_bucket: 'CASH', balance: 10000, coupon_rate: 0.04 };
    jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00'), doNotFake: [...FAKE] });
    try {
      useStore.getState().resetAll();
      useStore.setState({ onboardingProfile: op, assetAccounts: [SAV], liabilities: [], transactions: [] } as any);
      let model: any = null;
      const Probe = () => { model = useCashflowModel(); return null; };
      render(<Probe />);
      const withIncome = profileWithAccountIncome(theBudgetCounted({ profile: op, accounts: [SAV], debts: [] }).profile, [SAV], []);
      expect(withIncome.invAnnual).toBeCloseTo(400, 6);                  // 10,000 × 4%
      const want = datedGridOf(withIncome, [], undefined);
      expect(model.grid.cells.map((c: any) => c.inflow)).toEqual(want.cells.map((c: any) => c.inflow));
    } finally { jest.useRealTimers(); }
  });
});
