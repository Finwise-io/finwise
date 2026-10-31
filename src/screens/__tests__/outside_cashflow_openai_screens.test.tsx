/** OUTSIDE CASH FLOW AUDIT (OpenAI, 2026-10-24 package) — PARTS 18 AND 19, THE SCREEN CHECKS, THE RULES AND THE CROSS-CARD CHECKS.
 *  MEASURING PHASE (CFR-5, 2026-10-25): nothing in the app, the records or the drawings is changed here.
 *
 *  Source: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 *          MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_18.json and _Part_19.json
 *  The reviewer judged the WRITTEN register only — it saw no screen. Each of its 197 FAILs is measured here on the REAL screen
 *  (Cash flow and its four tabs, Home's box, Your base pay, Your income, the income manager, the bill calendar, Your monthly
 *  income), rendered in the household the figure's own row describes, reading every Text and every figure printed under its
 *  identifier (src/components/figure.ts). Every FAIL gets one class:
 *    APP WRONG       the screen — or, where marked "row words"/"records", the figure's own master row or its drawing — breaks
 *                    the tenet. Its `wrong` check carries the right answer and is test.failing, so it goes red the day it is fixed
 *    REVIEWER WRONG  the rendered screen holds it, under a ruling of his or a published source (named)
 *    NEEDS A RULING  none of his decisions settles it — two readings and a recommendation are written on the item
 *    EVIDENCE GAP    the screen holds it today; the package did not carry the evidence (named) — a records/package fix
 *  The 339 PASSes are not re-measured; each figure's screen is checked to print it under its identifier.
 *  THE WORKING TREE MOVED WHILE THIS RAN: CF-MMFIX is fixing the drawing-match defects (MM-CF's list) in the same screens. An
 *  item whose answer that work changed says so in its class; re-run this file after that work lands.
 *  Results: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_screens_results.json
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { figureSpec } from '../../../MoneyKeel/functions/figures';
import { rowVestYear, householdK401ByMonth } from '../../domain/income/onboarding';
import { householdPreTaxContributionsAnnual } from '../../domain/income/earners';
import { convertTakeHomeMode } from '../../domain/income/take-home-mode-migration';
import { grossFromNet } from '../../domain/income/tax';
import { payoffPlan, requiredPayment } from '../../domain/debt';
import { futurePaycheck } from '../../../MoneyKeel/functions/cashflow/future-paycheck';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const ROOT = path.join(__dirname, '..', '..', '..');
const AUDIT = 'MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results';
const PART: Record<'18' | '19', any> = {
  '18': JSON.parse(fs.readFileSync(path.join(ROOT, AUDIT, 'MoneyKeel_CashFlow_Audit_Part_18.json'), 'utf8')),
  '19': JSON.parse(fs.readFileSync(path.join(ROOT, AUDIT, 'MoneyKeel_CashFlow_Audit_Part_19.json'), 'utf8')),
};
const src = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// READING A SCREEN — every Text in order, every figure printed under its identifier, and whether opening it changed
// anything the person entered
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
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
const SCREENS: Record<string, () => any> = {
  cashflow: () => require('../CashFlowScreen').default, home: () => require('../HomeScreen').default,
  basepay: () => require('../BasePayScreen').default, summary: () => require('../IncomeSummaryScreen').default,
  manager: () => require('../IncomeManagerScreen').default, bills: () => require('../BillCalendarScreen').default,
  monthly: () => require('../MonthlyIncomeScreen').default,
};
type Shot = { printed: { id: string; text: string; value: number | null }[]; lines: string[]; changed: string[] };
const ENTERED = ['assetAccounts', 'liabilities', 'transactions', 'expenses', 'onboardingProfile', 'incomes', 'retirementAssumptions'] as const;
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
function shoot(name: string, state: any, today: string, params: Record<string, string | undefined> = {}, act?: (s: typeof screen) => void, pre?: () => void): Shot {
  jest.useFakeTimers({ now: new Date(`${today}T12:00:00`), doNotFake: [...FAKE] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...state } as any);
    if (pre) pre();
    const before = ENTERED.map((k) => JSON.stringify((useStore.getState() as any)[k]));
    mockParams = params;
    const C = SCREENS[name]();
    const r = render(<C />);
    if (act) act(screen);
    resetFiguresPrinted();
    r.rerender(<C />);
    const printed = figuresPrinted().filter((p) => !p.spoken).map((p) => ({ id: p.id, text: p.text, value: p.value }));
    const now = useStore.getState() as any;
    const changed = ENTERED.filter((k, i) => JSON.stringify(now[k]) !== before[i]);
    const shot = { printed, lines: readLines(), changed };
    r.unmount();
    return shot;
  } finally { jest.useRealTimers(); mockParams = {}; }
}
const tab = (t: string) => (s: typeof screen) => fireEvent.press(s.getByLabelText(`${t} tab`));
const next = (n: number) => (s: typeof screen) => { for (let i = 0; i < n; i++) fireEvent.press(s.getByLabelText('Next month')); };

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE HOUSEHOLDS — the register's own worked households, in the store's shapes, and the witnesses for each finding
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** MK-CF-M-001..004, 013..015, 020, 021, 050..054, 056: September 2026, $7,200 take-home; a $2,400 mortgage and a $250 car
 *  loan; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out); logged $2,300, $512, $186 and the $250 car loan paid;
 *  the Plan promises $300/month to the emergency fund. */
const H_CF: any = { nwSetupChoice: 'self',
  onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
    monthlySpending: '3400', spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed', tier: 'need' },
      { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' }, { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible', tier: 'flex' }] },
  liabilities: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }],
  expenses: [{ id: 'e1', amount: 2300, category: 'Rent / Mortgage', store: 'Rent', date: '2026-09-01', createdAt: '2026-09-01' },
    { id: 'e2', amount: 512, category: 'Groceries', store: 'Grocer', date: '2026-09-07', createdAt: '2026-09-07' },
    { id: 'e3', amount: 186, category: 'Eating out', store: 'Diner', date: '2026-09-12', createdAt: '2026-09-12' },
    { id: 'e4', amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12', createdAt: '2026-09-12' }],
  assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 5000, asset_class: 'cash' }],
  retirementAssumptions: { commitments: [{ label: 'Emergency fund', monthlyAmount: 300 }] } };
const NO_BUDGET = { ...H_CF, onboardingProfile: { ...H_CF.onboardingProfile, monthlySpending: undefined, spendCats: [] } };
/** MK-CF-M-012: two $3,600 salary payments in September (the 15th and the 30th), one on 31 August. */
const H_RECV = { ...H_CF, incomes: [{ id: 'r1', date: '2026-09-15', source: 'Salary', amount: 3600 }, { id: 'r2', date: '2026-09-30', source: 'Salary', amount: 3600 }, { id: 'r0', date: '2026-08-31', source: 'Salary', amount: 3600 }] };
/** MK-CF-M-030..046, 076, 077: two earners filing jointly, $4,200 a fortnight and $5,000 a month, $1,200 and $400 into 401(k)s. */
const PAIR = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', filingStatus: 'married', whoEarns: 'both',
  baseSalary: '4200', salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: '1200', partnerName: 'Sam',
  partnerWage: { baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross', c_401k: '400' } };
const H_PAY = { onboardingProfile: { ...PAIR, taxMode: 'manual', manualTaxRate: '22' } };
const H_PAY_EST = { onboardingProfile: { ...PAIR } };
const H_PAY_LANDS = { onboardingProfile: { ...PAIR, landsTypical: '5850', partnerWage: { ...PAIR.partnerWage, landsTypical: '3400' } } };
/** MK-CF-M-033: one earner filing single, $5,000 a month, $400 into a 401(k), no rate and no take-home told. */
const ONE_P = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', filingStatus: 'single', whoEarns: 'you', baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross', c_401k: '400' };
const H_ONE = { onboardingProfile: ONE_P };
/** MK-CF-M-006..011, 024, 027, 039, 069: the two earners plus $24,000/year of self-employment, a $12,000 bonus in March,
 *  50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, $2,100/month of Social Security.
 *  seFreq is 'annual' — the value the self-employment question writes (src/onboarding/modules.tsx:500); the register's
 *  worked example writes 'yearly', which no screen writes (see FOUND F2). */
const INC_OK = { ...PAIR, taxMode: 'manual', manualTaxRate: '22', incomeSources: ['employment', 'self_employment', 'rental', 'equity', 'retirement_income'],
  seAmount: '24000', seFreq: 'annual', bonusAnnual: '12000', bonusMonth: 3, rsuShares: '50', rsuPrice: '400',
  rentals: [{ type: 'long', income: 2000, expenses: 800, property_id: 'rental-house' }], ri_ss: '2100', ri_ss_receiving: 'yes', ri_ss_freq: 'monthly' };
const RENTAL_HOUSE = { asset_id: 'rental-house', label: 'Rental house', kind: 'real_estate', tax_bucket: 'PROPERTY', balance: 300000, re_use: 'rental' };
const H_INC_OK = { onboardingProfile: INC_OK, assetAccounts: [RENTAL_HOUSE] };
const H_INC_YEARLY = { onboardingProfile: { ...INC_OK, seFreq: 'yearly' }, assetAccounts: [RENTAL_HOUSE] };
/** MK-CF-M-016, 028, 060..063: 28 Sep 2026, $8,000 in the account, car insurance $1,400 due 15 Oct, property tax $4,800 due 1 Nov. */
const H_BILL = { onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '0', monthlySpending: 0,
  spendCats: [{ id: 'proptax', label: 'Property tax', amount: 4800, bucket: 'nonmonthly', months: [11], dueDay: 1, tier: 'critical' },
    { id: 'carins', label: 'Car insurance', amount: 1400, bucket: 'nonmonthly', months: [10], dueDay: 15 }] },
  assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 8000 }] };
/** MK-CF-M-057..059, 071..075: a $9,000 card at 24% ($200 minimum) and a $14,000 car loan at 6.9% ($250); $27,100 at the end of January. */
const H_DEBT = { onboardingProfile: H_CF.onboardingProfile,
  liabilities: [{ debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200 },
    { debt_id: 'a', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 }],
  monthlySnapshots: { '2026-01': { month: '2026-01', gross_debt: 27100 } } };
/** MK-CF-M-022, 023, 055: born 1981, retiring at 67, $200,000 in a 401(k) at 6%, $2,000/month of Social Security from 67
 *  (a $6,000 take-home added so the month is drawn and the card can follow it). */
const H_SAVER = { onboardingProfile: { status: 'employed', birthYear: 1981, targetRetirementAge: 67, ri_ss: '2000', ri_ss_receiving: 'no', ri_ss_freq: 'monthly', monthlySpending: 3000,
    incomeSources: ['employment', 'retirement_income'], baseSalary: '6000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' },
  assetAccounts: [{ asset_id: 'k', label: '401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200_000, target_return: 0.06, retirement_pct: 100 }],
  retirementAssumptions: { expectedReturn: 0.06 } };
/** MK-CF-M-078: retired, 15 Oct 2026, $2,400/month of Social Security, no savings, $1,200 of car insurance due in October. */
const H_RET = { onboardingProfile: { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '1500',
  spendCats: [{ id: 'ins', label: 'Car insurance', amount: 1_200, bucket: 'nonmonthly', months: [10], tier: 'critical', custom: true }] } };
/** MK-CF-M-070: a $50,000 taxable brokerage and a $120,000 pre-tax 401(k), at 68. */
const H_DRAW = { onboardingProfile: { status: 'retired', birthYear: '1958', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '3000' },
  assetAccounts: [{ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50_000, target_return: 0.05, retirement_pct: 100 },
    { asset_id: 'k', label: '401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 120_000, target_return: 0.05, retirement_pct: 100 }] };
/** MK-CF-M-024: retired, Social Security $2,600 a month and a $19,200 pension paid once a year in December. */
const H_RET_PENSION = { onboardingProfile: { status: 'retired', birthYear: '1958', incomeSources: ['retirement_income'], ri_ss: '2600', ri_ss_freq: 'monthly',
  ri_pension: '19200', ri_pension_freq: 'annual', ri_pension_month: 12, monthlySpending: '3000' } };
/** MK-CF-M-066: one account that recorded a $300 dividend in June and $120 of interest in March. */
const H_DIV = { onboardingProfile: ONE_P, assetAccounts: [{ asset_id: 'a1', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000 }],
  transactions: [{ id: 'd1', txn_id: 'd1', account_id: 'a1', type: 'DIVIDEND', amount: 300, date: '2026-06-01' }, { id: 'i1', txn_id: 'i1', account_id: 'a1', type: 'INTEREST', amount: 120, date: '2026-03-01' }] };
/** cash-flow_v01 frame A, the drawing's own household (5,000 − 2,000 − 250 − 2,000 − 200 − 200 = 350; actual 900). */
const DRAWING_A: any = { onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0', monthlySpending: '2000', b_fixed: '1100', b_flexible: '900' },
  liabilities: [{ debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.05, minimum_monthly_payment: 2000, due_day: 1 },
    { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 250, due_day: 28 },
    { debt_id: 'h', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 20000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 },
    { debt_id: 'v', label: 'Credit card debt payment', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 200 }],
  expenses: ([['Mortgage', 2000, 'Debt payment'], ['HELOC', 200, 'Debt payment'], ['Credit card debt payment', 200, 'Debt payment'], ['Amazon', 300, 'Other'], ['Shell', 200, 'Other'], ['Target', 700, 'Other', 'imported'], ['Costco', 500, 'Other', 'imported']] as any[])
    .map(([st, a, c, o], i) => ({ id: `x${i}`, amount: a, category: c, store: st, date: '2026-08-20', createdAt: '2026-08-20', ...(o ? { origin: o } : {}) })) };
/** cash-flow_v01 frame F: a $3,200 Visa at 22.90% ($110) and a $9,800 car loan at 6.40% ($300); $17,100 at the end of January. */
const FRAME_F = { onboardingProfile: { ...DRAWING_A.onboardingProfile },
  liabilities: [{ debt_id: 'v', label: 'Visa card', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 110 },
    { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 300 }],
  monthlySnapshots: { '2026-01': { month: '2026-01', gross_debt: 17100 } } };

// ── the witnesses ─────────────────────────────────────────────────────────────────────────────────────────────────
/** A rental losing $500 a month: $1,000 of rent against $1,500 of running costs, on a named property. */
const H_LOSS = { ...H_CF, onboardingProfile: { ...H_CF.onboardingProfile, incomeSources: ['employment', 'rental'], rentals: [{ type: 'long', income: 1000, expenses: 1500, property_id: 'rh' }] },
  assetAccounts: [...H_CF.assetAccounts, { ...RENTAL_HOUSE, asset_id: 'rh' }] };
/** A worker whose Social Security is the ssa.gov estimate typed in the Plan step (src/onboarding/modules.tsx:1889) — not received. */
const WORKER_SS = { status: 'employed', incomeSources: ['employment'], birthYear: '1968', baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '4000', targetRetirementAge: '67', ri_ss: '2900', ri_ss_freq: 'monthly' };
/** A retiree drawing $1,500 a month from a 401(k), entered on the Retirement income step's "401(k) / IRA withdrawals" row. */
const RET_WD = { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly', ri_withdrawals: '1500', ri_withdrawals_freq: 'monthly', monthlySpending: '3000' };
/** One earner, $60,000 of wages, plus a rental netting $2,000 a month. */
const H_ONE_RENT = { onboardingProfile: { ...ONE_P, incomeSources: ['employment', 'rental'], rentals: [{ type: 'long', income: 2500, expenses: 500, property_id: 'rh' }] }, assetAccounts: [{ ...RENTAL_HOUSE, asset_id: 'rh' }] };
/** One earner with a 5.00% state rate typed on the Tax organizer. */
const H_ONE_STATE = { onboardingProfile: { ...ONE_P, stateTaxRate: '5' } };
/** A $1,200 insurance bill with no month set, and $2,000 of groceries; $5,000 take-home; $8,000 in the account. */
const UNDATED_BILL = { ...H_BILL, onboardingProfile: { ...H_BILL.onboardingProfile, baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', monthlySpending: '2000',
  spendCats: [{ id: 'rec', label: 'Groceries', amount: 2000, bucket: 'flexible' }, { id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [] }] } };
/** The same, the bill dated 10 December. */
const DEC_BILL = { ...UNDATED_BILL, onboardingProfile: { ...UNDATED_BILL.onboardingProfile,
  spendCats: [{ id: 'rec', label: 'Groceries', amount: 2000, bucket: 'flexible' }, { id: 'ins', label: 'Insurance', amount: 1200, bucket: 'nonmonthly', months: [12], dueDay: 10 }] } };
/** A worker paid only July to December: $10,000.05 a paid month, $501.13 into a 401(k), take-home typed $3,799.17. */
const months = (v: (i: number) => number) => Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2026-${String(i + 1).padStart(2, '0')}`, v(i)]));
const PART_LANDS = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', filingStatus: 'single', whoEarns: 'you', baseSalary: '10000.05', salaryFreq: 'monthly', salaryMode: 'gross',
  salaryMonthMode: 'months', c_401k: '501.13', landsTypical: '3799.17', monthlySpending: '2000', salaryByMonth: months((i) => (i < 6 ? 0 : 10000.05)) };
/** The same worker, $10,000 a paid month and $1,000 into a 401(k), the take-home calculated. */
const PART_CALC = { ...PART_LANDS, landsTypical: undefined, c_401k: '1000', baseSalary: '10000', salaryByMonth: months((i) => (i < 6 ? 0 : 10000)) };
/** The same shape at $12,500 a paid month: 6 × $12,500 = $75,000, $6,000 into a 401(k) — where the band moves. */
const PART_BAND = { ...PART_CALC, baseSalary: '12500', salaryByMonth: months((i) => (i < 6 ? 0 : 12500)) };
/** Grants: 75 shares at $400 vesting March 2026, 25 at $400 vesting March 2027. */
const GRANTS = { ...ONE_P, incomeSources: ['employment', 'equity'], equityType: 'rsu', rsuGrants: [{ shares: 75, price: 400, date: '2026-03-15' }, { shares: 25, price: 400, date: '2027-03-15' }] };
const DATELESS_GRANT = { ...ONE_P, rsuGrants: [{ shares: 50, price: 400 }] };
/** A take-home typed before 2026-08-28 ("the old way"), arriving from the cloud. */
const OLD_TAKEHOME = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', monthlySpending: '2000' };
const fromCloud = () => (useStore.getState() as any).loadFromCloud({ onboardingProfile: OLD_TAKEHOME });
const throughTheApp = () => (useStore.getState() as any).setOnboardingProfile(OLD_TAKEHOME);
/** A one-time $2,000 gift with neither its month nor its year tapped. */
const ONETIME = { ...H_CF.onboardingProfile, otherAmount: '2000', otherFreq: 'onetime', otherLabel: 'Gift' };
/** August's record saved with no time on it (history.ts:286 reads a missing one as ''), and a $150 expense dated 25 Aug added on 3 Sep. */
const LATE = { ...H_CF, monthlySnapshots: { '2026-08': { month: '2026-08', income_net: 7200, spending: 1360, debt_paid: 0 } },
  expenses: [...H_CF.expenses, { id: 'late1', amount: 150, category: 'Groceries', store: 'Grocer', date: '2026-08-25', createdAt: '2026-09-03' },
    { id: 'aug1', amount: 1360, category: 'Groceries', store: 'Grocer', date: '2026-08-10', createdAt: '2026-08-10' }] };
const LATE_STAMPED = { ...LATE, monthlySnapshots: { '2026-08': { ...LATE.monthlySnapshots['2026-08'], captured_at: '2026-09-01T08:00:00Z' } } };
const pressPlanned = (s: typeof screen) => { fireEvent.press(s.getByLabelText('Expenses tab'));
  const b = s.getAllByRole('button').find((x) => String(x.props.accessibilityLabel ?? '').startsWith('Planned expenses:')); if (b) fireEvent.press(b); };
const prev = (n: number) => (s: typeof screen) => { for (let i = 0; i < n; i++) fireEvent.press(s.getByLabelText('Previous month')); };

const RENDERS: Record<string, () => Shot> = {
  CF: () => shoot('cashflow', H_CF, '2026-09-28'),
  CF_EXP: () => shoot('cashflow', H_CF, '2026-09-28', {}, tab('Expenses')),
  CF_INC: () => shoot('cashflow', H_RECV, '2026-09-30', {}, tab('Income')),
  CF_DEBT: () => shoot('cashflow', H_DEBT, '2026-10-01', {}, tab('Debts')),
  // This month with nothing logged yet: every debt still due (FIX-MONTH, 2026-10-25 — H_CF's mortgage now reads PAID: the $2,300 logged under its line)
  CF_DEBT_MONTH: () => shoot('cashflow', H_DEBT, '2026-10-01'),
  CF_OCT: () => shoot('cashflow', H_CF, '2026-09-15', {}, next(1)),
  CF_BUDGET: () => shoot('cashflow', H_CF, '2026-09-28', {}, pressPlanned),
  CF_NOINCOME: () => shoot('cashflow', { ...H_CF, onboardingProfile: { ...H_CF.onboardingProfile, baseSalary: '' } }, '2026-09-28'),
  CF_NOPAY: () => shoot('cashflow', { ...H_CF, liabilities: [H_CF.liabilities[0], { ...H_CF.liabilities[1], minimum_monthly_payment: undefined }] }, '2026-09-28'),
  CF_PAST_EMPTY: () => shoot('cashflow', H_CF, '2026-09-28', {}, prev(3)),
  HOME: () => shoot('home', H_CF, '2026-09-28'),
  NOBUDGET_CF: () => shoot('cashflow', NO_BUDGET, '2026-09-28'),
  NOBUDGET_NEXT: () => shoot('cashflow', NO_BUDGET, '2026-09-28', {}, next(1)),
  NOBUDGET_EDITOR: () => shoot('cashflow', NO_BUDGET, '2026-09-28', {}, (s) => { fireEvent.press(s.getByLabelText('Expenses tab')); fireEvent.press(s.getAllByLabelText('Set your budget')[0]); }),
  INC_OK_TAB: () => shoot('cashflow', H_INC_OK, '2026-09-28', {}, tab('Income')),
  INC_OK_SUM: () => shoot('summary', H_INC_OK, '2026-09-28'),
  INC_OK_MGR: () => shoot('manager', H_INC_OK, '2026-09-28'),
  INC_YEARLY_SUM: () => shoot('summary', H_INC_YEARLY, '2026-09-28'),
  PAY: () => shoot('basepay', H_PAY, '2026-09-28'),
  PAY_EST: () => shoot('basepay', H_PAY_EST, '2026-09-28'),
  PAY_LANDS: () => shoot('basepay', H_PAY_LANDS, '2026-09-28'),
  ONE: () => shoot('basepay', H_ONE, '2026-09-28'),
  ONE_SUM: () => shoot('summary', H_ONE, '2026-09-28'),
  SUM: () => shoot('summary', H_PAY, '2026-09-28'),
  SUM_EST: () => shoot('summary', H_PAY_EST, '2026-09-28'),
  SUM_INV: () => shoot('summary', { onboardingProfile: { ...H_PAY.onboardingProfile, invAnnual: '3600' } }, '2026-09-28'),
  MGR_DIV: () => shoot('manager', H_DIV, '2026-09-28', { open: 'dividends' }),
  BILLS: () => shoot('bills', H_BILL, '2026-09-28'),
  BILLS_NOBAL: () => shoot('bills', { ...H_BILL, assetAccounts: [] }, '2026-09-28'),
  // a balance given, and short of it (2026-10-25, FIX-BILLS): $1,000 in checking — the car insurance's $1,400 by Oct 13 is $400 short
  BILLS_LOW: () => shoot('bills', { ...H_BILL, assetAccounts: [{ ...H_BILL.assetAccounts[0], balance: 1000 }] }, '2026-09-28'),
  BILLS_EMPTY: () => shoot('bills', { onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1975' } }, '2026-09-28'),
  MONTHLY: () => shoot('monthly', H_INC_OK, '2026-09-28'),
  SAVER: () => shoot('cashflow', H_SAVER, '2026-09-28'),
  NOBIRTH_SAVER: () => shoot('cashflow', { ...H_SAVER, onboardingProfile: { ...H_SAVER.onboardingProfile, birthYear: '' } }, '2026-09-28'),
  NOPOT_SAVER: () => shoot('cashflow', { ...H_SAVER, assetAccounts: [] }, '2026-09-28'),
  RET: () => shoot('cashflow', H_RET, '2026-10-15'),
  DRAW: () => shoot('cashflow', H_DRAW, '2026-10-15', {}, (s) => fireEvent.press(s.getByLabelText('Why this order?'))),
  RET_PENSION: () => shoot('cashflow', H_RET_PENSION, '2026-10-15'),
  LOSS_TAB: () => shoot('cashflow', H_LOSS, '2026-09-28', {}, tab('Income')),
  LOSS_CF: () => shoot('cashflow', H_LOSS, '2026-09-28'),
  LOSS_SUM: () => shoot('summary', H_LOSS, '2026-09-28'),
  LOSS_MGR: () => shoot('manager', H_LOSS, '2026-09-28'),
  WSS_TAB: () => shoot('cashflow', { onboardingProfile: WORKER_SS }, '2026-09-28', {}, tab('Income')),
  RETWD_TAB: () => shoot('cashflow', { onboardingProfile: RET_WD }, '2026-10-15', {}, tab('Income')),
  ONE_RENT_PAY: () => shoot('basepay', H_ONE_RENT, '2026-09-28'),
  ONE_RENT_SUM: () => shoot('summary', H_ONE_RENT, '2026-09-28'),
  ONE_STATE_PAY: () => shoot('basepay', H_ONE_STATE, '2026-09-28'),
  ONE_STATE_SUM: () => shoot('summary', H_ONE_STATE, '2026-09-28'),
  UNDATED_EXP: () => shoot('cashflow', UNDATED_BILL, '2026-09-28', {}, tab('Expenses')),
  UNDATED_BILLS: () => shoot('bills', UNDATED_BILL, '2026-09-28'),
  DEC_BILLS: () => shoot('bills', DEC_BILL, '2026-09-28'),
  DEC_EXP: () => shoot('cashflow', DEC_BILL, '2026-09-28', {}, tab('Expenses')),
  DEC_DEC: () => shoot('cashflow', DEC_BILL, '2026-09-28', {}, next(3)),
  DEC_BUDGET: () => shoot('cashflow', DEC_BILL, '2026-09-28', {}, pressPlanned),
  PART_PAY: () => shoot('basepay', { onboardingProfile: PART_LANDS }, '2026-10-15'),
  PART_SUM: () => shoot('summary', { onboardingProfile: PART_LANDS }, '2026-10-15'),
  PART_CF: () => shoot('cashflow', { onboardingProfile: PART_LANDS }, '2026-10-15'),
  PARTK_PAY: () => shoot('basepay', { onboardingProfile: PART_CALC }, '2026-10-15'),
  PARTK_SUM: () => shoot('summary', { onboardingProfile: PART_CALC }, '2026-10-15'),
  PARTB_PAY: () => shoot('basepay', { onboardingProfile: PART_BAND }, '2026-10-15'),
  PARTB_SUM: () => shoot('summary', { onboardingProfile: PART_BAND }, '2026-10-15'),
  GRANTS_TAB: () => shoot('cashflow', { onboardingProfile: GRANTS }, '2026-09-28', {}, tab('Income')),
  GRANTS_SUM: () => shoot('summary', { onboardingProfile: GRANTS }, '2026-09-28'),
  DATELESS_26: () => shoot('summary', { onboardingProfile: DATELESS_GRANT }, '2026-09-28'),
  DATELESS_27: () => shoot('summary', { onboardingProfile: DATELESS_GRANT }, '2027-09-28'),
  DIV_NONE: () => shoot('manager', { ...H_DIV, transactions: [] }, '2026-09-28', { open: 'dividends' }),
  DIV_FUTURE: () => shoot('manager', { ...H_DIV, transactions: [...H_DIV.transactions, { id: 'f1', txn_id: 'f1', account_id: 'a1', type: 'DIVIDEND', amount: 500, date: '2026-12-01' }] }, '2026-09-28', { open: 'dividends' }),
  DIV_REINV: () => shoot('manager', { ...H_DIV, transactions: [...H_DIV.transactions, { id: 'v1', txn_id: 'v1', account_id: 'a1', type: 'DIVIDEND', ticker: 'VTI', reinvested: true, shares: 1.2, price: 100, date: '2026-07-01' }] }, '2026-09-28', { open: 'dividends' }),
  OLD_CLOUD_TAB: () => shoot('cashflow', {}, '2026-09-28', {}, tab('Income'), fromCloud),
  OLD_SET_TAB: () => shoot('cashflow', {}, '2026-09-28', {}, tab('Income'), throughTheApp),
  OLD_CLOUD_PAY: () => shoot('basepay', {}, '2026-09-28', {}, undefined, fromCloud),
  OLD_SET_PAY: () => shoot('basepay', {}, '2026-09-28', {}, undefined, throughTheApp),
  OLD_CLOUD_SUM: () => shoot('summary', {}, '2026-09-28', {}, undefined, fromCloud),
  OLD_SET_SUM: () => shoot('summary', {}, '2026-09-28', {}, undefined, throughTheApp),
  OLD_CLOUD_HOME: () => shoot('home', {}, '2026-09-28', {}, undefined, fromCloud),
  OLD_SET_HOME: () => shoot('home', {}, '2026-09-28', {}, undefined, throughTheApp),
  SE_DEFAULT_TAB: () => shoot('cashflow', { onboardingProfile: { ...H_CF.onboardingProfile, seAmount: '2000' } }, '2026-09-28', {}, tab('Income')),
  ONETIME_JAN27: () => shoot('cashflow', { onboardingProfile: ONETIME }, '2026-09-28', {}, next(4)),
  ONETIME_SEP27: () => shoot('cashflow', { onboardingProfile: ONETIME }, '2027-09-15', {}, tab('Income')),
  LATE_LIST: () => shoot('cashflow', LATE, '2026-09-28', {}, (s) => { fireEvent.press(s.getByLabelText('Previous month')); fireEvent.press(s.getByLabelText('Expenses tab')); }),
  LATE_CARD: () => shoot('cashflow', LATE, '2026-09-28', {}, prev(1)),
  LATE_STAMPED_LIST: () => shoot('cashflow', LATE_STAMPED, '2026-09-28', {}, (s) => { fireEvent.press(s.getByLabelText('Previous month')); fireEvent.press(s.getByLabelText('Expenses tab')); }),
  DRAW_A_CF: () => shoot('cashflow', DRAWING_A, '2026-08-20'),
  DRAW_A_HOME: () => shoot('home', DRAWING_A, '2026-08-20'),
  DRAW_A_EXP: () => shoot('cashflow', DRAWING_A, '2026-08-20', {}, tab('Expenses')),
  FRAME_F: () => shoot('cashflow', FRAME_F, '2026-08-20', {}, tab('Debts')),
  ABOVEMIN: () => shoot('cashflow', { ...H_DEBT, liabilities: [{ ...H_DEBT.liabilities[0], monthly_payment: 300 }, H_DEBT.liabilities[1]] }, '2026-10-01', {}, tab('Debts')),
  ZERO_RATE: () => shoot('cashflow', { ...H_DEBT, liabilities: [{ debt_id: 'z', label: 'Family loan', debt_type: 'PERSONAL', remaining_balance: 60100, interest_rate_apr: 0, minimum_monthly_payment: 100 }] }, '2026-10-01', {}, tab('Debts')),
  EXP_ONLY_HOME: () => shoot('home', { onboardingProfile: null, expenses: H_CF.expenses.slice(0, 2) }, '2026-09-28'),
};
const CACHE = new Map<string, Shot>();
const R = (k: string): Shot => { if (!CACHE.has(k)) { const f = RENDERS[k]; if (!f) throw new Error(`no render ${k}`); CACHE.set(k, f()); } return CACHE.get(k)!; };
const printed = (k: string, id: string): string[] => R(k).printed.filter((p) => p.id === id).map((p) => p.text);
const first = (k: string, id: string): string | undefined => printed(k, id)[0];
const L = (k: string) => R(k).lines;
const has = (k: string, t: string | RegExp) => L(k).some((l) => (typeof t === 'string' ? l === t : t.test(l)));
const text = (k: string) => L(k).join(' | ');
/** the line n after `label` — after the first `anchor` line when one is given */
const after = (k: string, label: string, n = 1, anchor?: string): string | undefined => {
  const l = L(k); const from = anchor ? l.indexOf(anchor) : 0; if (from < 0) return undefined;
  const i = l.indexOf(label, from); return i >= 0 ? l[i + n] : undefined;
};
const dollars = (s: string | undefined) => (s == null ? NaN : Number(s.replace('−', '-').replace(/[^0-9.\-]/g, '')));
/** Recover a figure's whole-dollar text: "$3,799/month" → "$3,799". */
const dollarsText = (s: string | undefined) => (s ?? '').replace(/\/month$/, '');
/** Monthly income, opened on a profile and saved with one choice or none: what the store holds afterwards. */
function saveMonthlyIncome(op: any, choose?: 'Not yet' | 'I receive it'): any {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: op } as any);
  const M = SCREENS.monthly(); const r = render(<M />);
  if (choose) fireEvent.press(screen.getByText(choose));
  fireEvent.press(screen.getByLabelText('Save monthly income'));
  r.unmount();
  return (useStore.getState() as any).onboardingProfile;
}
/** Lines of source containing a pattern, read from the disk (a guard reads the data, never my memory of it). */
function grep(dir: string, re: RegExp): { file: string; line: string }[] {
  const out: { file: string; line: string }[] = [];
  const walk = (d: string) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|__tests__/.test(e.name)) walk(p); continue; }
    if (!/\.(ts|tsx)$/.test(e.name) || /\.test\./.test(e.name)) continue;
    for (const line of fs.readFileSync(path.join(ROOT, p), 'utf8').split('\n')) if (re.test(line) && !/^\s*(\*|\/\/)/.test(line)) out.push({ file: p, line });
  } };
  walk(dir);
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE EACH FIGURE IS READ: the render in its row's household, and the line beside it on that screen
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const MOCK = {
  cf: 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html', income: 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html',
  bills: 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html', monthly: 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_monthly-income_v02.html',
};
const MATCH = {
  cf: 'src/screens/__tests__/cashflow_matches_v01.test.tsx', pay: 'src/screens/__tests__/basepay_matches_v07.test.tsx', inc: 'src/screens/__tests__/income_matches_v07.test.tsx',
  mgr: 'src/screens/__tests__/income_manager_matches_v07.test.tsx', bills: 'src/screens/__tests__/bill_calendar_coming_up_agrees_2026_10_24.test.tsx',
  monthly: 'src/screens/__tests__/monthly_income.test.tsx', home: 'src/screens/__tests__/cashflow_home_agreement_2026_10_23.test.tsx',
  card: 'src/screens/__tests__/cashflow_fcc.test.tsx',
};
type Fig = { main: string; line: string | RegExp; mock: string | null; match: string | null; viaRows?: boolean; drawingNote?: string;
  /** the line now prints under another identifier (work landed since the measure): the trace reads it, and the old trace is pinned */
  nowAs?: { id: string; seen: string } };
const F = (main: string, line: string | RegExp, mock: string | null, match: string | null, x: Partial<Fig> = {}): Fig => ({ main, line, mock, match, ...x });
const PAYCARD = 'it is not on any drawing: kept by his ruling on its arithmetic, DEC-0244 and DEC-0245 (2026-09-08), named in cashflow_matches_v01 (difference 3)';
const RETIRED = 'the retired This month has NO approved drawing on record: cash-flow_v01 draws the working month only (CashFlowScreen.tsx says so beside the retired block), the design record has no row for it, and Paycheck months was retired on 2026-10-02';
/** CF-MMFIX-A's fixes of 2026-10-25, re-measured by FIX-BUDGET on 2026-10-26, the file's own way: the right answer passes, the
 *  committed answer is pinned as test.failing. */
const FIXMMA = 'CF-MMFIX-A, 2026-10-25 (re-measured by FIX-BUDGET, 2026-10-26)';
const FIGS: Record<string, Fig> = {
  'MK-CF-M-001': F('CF_EXP', 'PLANNED EXPENSES', MOCK.cf, MATCH.cf),
  'MK-CF-M-002': F('CF', '= Planned surplus', MOCK.cf, MATCH.cf),
  'MK-CF-M-003': F('CF', '= Actual surplus so far', MOCK.cf, MATCH.cf),
  'MK-CF-M-004': F('CF', 'Car loan', MOCK.cf, MATCH.cf),
  'MK-CF-M-006': F('INC_OK_TAB', 'You · Salary — steady', MOCK.cf, MATCH.cf),
  'MK-CF-M-007': F('INC_OK_TAB', 'Self-employment', MOCK.cf, MATCH.cf),
  'MK-CF-M-008': F('INC_OK_TAB', 'Bonus', MOCK.cf, MATCH.cf),
  'MK-CF-M-009': F('INC_OK_TAB', /^(Stock vesting \(equity\)|Equity comp)$/, MOCK.cf, MATCH.cf),
  'MK-CF-M-010': F('INC_OK_TAB', /^Rental (property|income)$/, MOCK.cf, MATCH.cf),
  'MK-CF-M-011': F('INC_OK_TAB', 'Social Security · pension', MOCK.cf, MATCH.cf),
  'MK-CF-M-012': F('CF_INC', 'Sep 30 · Salary', MOCK.cf, MATCH.cf),
  'MK-CF-M-013': F('CF_EXP', 'ACTUAL EXPENSES', MOCK.cf, MATCH.cf, { nowAs: { id: 'MK-CF-M-101', seen: `FX-CF-A, 2026-10-27 (the lead's R5, rows round once): the ACTUAL EXPENSES bar and "= Actual expenses, all sources" are written to the cent and print under MK-CF-M-101, each list's total; MK-CF-M-013 prints on the budget editor and the retired pace line` } }),
  'MK-CF-M-014': F('CF_EXP', '12 Sep · Diner', MOCK.cf, MATCH.cf),
  'MK-CF-M-015': F('CF_EXP', 'PLANNED EXPENSES', MOCK.cf, MATCH.cf),
  'MK-CF-M-016': F('DRAW_A_EXP', 'BIG-TICKET RADAR', MOCK.cf, MATCH.cf, { nowAs: { id: 'MK-CF-M-014', seen: `FX-CF-A, 2026-10-27 (R5): a payment logged prints on the radar to the cent, as its row above does, under MK-CF-M-014; a bill or a sum due still prints under MK-CF-M-016` } }),
  'MK-CF-M-020': F('CF', 'Surplus after your budget', MOCK.cf, MATCH.cf),
  'MK-CF-M-021': F('CF', 'Emergency fund · from your Plan', MOCK.cf, MATCH.cf),
  'MK-CF-M-022': F('SAVER', 'YOUR FUTURE PAYCHECK', null, MATCH.card, { drawingNote: PAYCARD }),
  'MK-CF-M-023': F('SAVER', 'Social Security · pension', null, MATCH.card, { drawingNote: PAYCARD }),
  'MK-CF-M-024': F('RET_PENSION', /^\+ .+ \+\$/, null, null, { drawingNote: RETIRED }),
  'MK-CF-M-027': F('INC_OK_MGR', 'Rent', MOCK.income, MATCH.mgr),
  'MK-CF-M-028': F('BILLS', 'Car insurance · $1,400 due Oct 15, 2026', MOCK.bills, MATCH.bills),
  'MK-CF-M-030': F('PAY', 'Gross /year', MOCK.income, MATCH.pay),
  'MK-CF-M-031': F('PAY', '= Take-home', MOCK.income, MATCH.pay),
  'MK-CF-M-032': F('PAY', 'Federal tax bracket', MOCK.income, MATCH.pay),
  'MK-CF-M-033': F('PAY_EST', 'Calculated federal tax', MOCK.income, MATCH.pay),
  'MK-CF-M-034': F('PAY', 'Your 401(k)s', MOCK.income, MATCH.pay),
  'MK-CF-M-035': F('PAY_EST', /^The take-home above is higher than it will really be/, MOCK.income, MATCH.pay),
  'MK-CF-M-036': F('PAY_LANDS', 'Everything else taken out', MOCK.income, MATCH.pay),
  'MK-CF-M-037': F('SUM', 'TAKE-HOME EACH MONTH', MOCK.income, MATCH.inc),
  'MK-CF-M-038': F('SUM', 'Your pay', MOCK.income, MATCH.inc),
  'MK-CF-M-039': F('INC_OK_SUM', 'March', MOCK.income, MATCH.inc),
  'MK-CF-M-040': F('SUM_INV', /of interest and dividends is not here — it is reinvested/, MOCK.income, MATCH.inc),
  'MK-CF-M-041': F('SUM', '= What it is taxed on', MOCK.income, MATCH.inc),
  'MK-CF-M-042': F('SUM', 'Your gross', MOCK.income, MATCH.inc),
  'MK-CF-M-043': F('SUM', 'Federal tax bracket', MOCK.income, MATCH.inc),
  'MK-CF-M-044': F('SUM_EST', 'Calculated federal tax', MOCK.income, MATCH.inc),
  'MK-CF-M-045': F('PAY_EST', /Social Security takes 6\.2% of a wage up to/, MOCK.income, MATCH.pay),
  'MK-CF-M-046': F('PAY_EST', /Medicare 1\.45% of all of it/, MOCK.income, MATCH.pay),
  'MK-CF-M-047': F('CF_OCT', 'Planned inflow', MOCK.cf, MATCH.cf),
  'MK-CF-M-048': F('CF_OCT', /^Planned outflow \(expenses \+ debt\)/, MOCK.cf, MATCH.cf),
  'MK-CF-M-049': F('CF_OCT', '= Planned surplus', MOCK.cf, MATCH.cf),
  'MK-CF-M-050': F('CF', /^PLANNED · SEPTEMBER$/, MOCK.cf, MATCH.cf, { viaRows: true }),
  'MK-CF-M-051': F('HOME', 'Income', MOCK.cf, MATCH.home),
  'MK-CF-M-052': F('HOME', 'Outflow (expenses + debt)', MOCK.cf, MATCH.home),
  'MK-CF-M-053': F('HOME', 'Left', MOCK.cf, MATCH.home),
  'MK-CF-M-054': F('CF', 'ACTUAL · SO FAR', MOCK.cf, MATCH.cf, { viaRows: true }),
  'MK-CF-M-055': F('SAVER', 'Draw from savings', null, MATCH.card, { drawingNote: PAYCARD }),
  'MK-CF-M-056': F('CF_BUDGET', /left · of \$1,100 plan$/, MOCK.cf, MATCH.cf),   // $3,400 until FIX-MONTH, 2026-10-25 (the mortgage counted once)
  'MK-CF-M-057': F('CF_DEBT', /~\$180\/month interest$/, MOCK.cf, MATCH.cf, { nowAs: { id: 'MK-CF-M-089', seen: `FX-CF-A, 2026-10-27 (CF2-03): the total line under YOUR DEBT carries the payments only, as frame 6 draws it; each debt's interest is on its own line under MK-CF-M-089 ($180 = 9,000 × 24% ÷ 12) — MK-CF-M-057 is printed nowhere` } }),
  'MK-CF-M-058': F('CF_DEBT', 'debt-free', MOCK.cf, MATCH.cf),
  'MK-CF-M-059': F('CF_DEBT', 'total interest', MOCK.cf, MATCH.cf),
  'MK-CF-M-060': F('BILLS', 'Lowest point $1,800 — Nov.', MOCK.bills, MATCH.bills),
  'MK-CF-M-061': F('BILLS', 'End', MOCK.bills, MATCH.bills),
  // printed where a balance is given (BILLS_LOW): with none, nothing is projected since 2026-10-25 (MK-CF-M-063#3, FIX-BILLS)
  'MK-CF-M-062': F('BILLS_LOW', /^Short \$400 — set it aside by Oct 13, 2026/, MOCK.bills, MATCH.bills),
  'MK-CF-M-063': F('BILLS', '✓ Covered — about $8,000 there by Oct 13, 2026.', MOCK.bills, MATCH.bills),
  'MK-CF-M-066': F('MGR_DIV', 'FROM YOUR ACCOUNTS', MOCK.income, MATCH.mgr),
  'MK-CF-M-069': F('MONTHLY', 'Your guaranteed income', MOCK.monthly, MATCH.monthly),
  'MK-CF-M-070': F('DRAW', 'Why this order?', null, null, { drawingNote: RETIRED }),
  // the "in payments" total prints under MK-NW-M-012 since CF-MMFIX-A (2026-10-25): it is what is paid, $550 with a $300 payment
  // chosen — no longer the minimums MK-CF-M-071 adds up, which no screen prints now (re-measured by FIX-BUDGET, 2026-10-26)
  'MK-CF-M-071': F('CF_DEBT', /\$450\/month in payments/, MOCK.cf, MATCH.cf, { nowAs: { id: 'MK-NW-M-012', seen: `${FIXMMA}: "across 2 debts · $450/month in payments" prints under MK-NW-M-012 (each debt's payment added up); MK-CF-M-071 is printed nowhere` } }),
  'MK-CF-M-072': F('CF_DEBT', '/month total', MOCK.cf, MATCH.cf),
  'MK-CF-M-073': F('CF_DEBT', /\$200\/month min/, MOCK.cf, MATCH.cf),
  'MK-CF-M-074': F('CF_DEBT', /paid down since January/, MOCK.cf, MATCH.cf),
  'MK-CF-M-075': F('CF_DEBT', /of where you started$/, MOCK.cf, MATCH.cf),
  'MK-CF-M-076': F('SUM', '= Gross /year', MOCK.income, MATCH.inc),
  'MK-CF-M-077': F('SUM', 'Your 401(k)s', MOCK.income, MATCH.inc),
  'MK-CF-M-078': F('RET', 'YOUR PAYCHECK — OCT', null, null, { drawingNote: RETIRED }),   // "SURPLUS — OCT" until CF-MMFIX-A, 2026-10-25
};
const lineOn = (k: string, line: string | RegExp) => L(k).some((l) => (typeof line === 'string' ? l === line : line.test(l)));
/** The figure prints under its own identifier on its screen (its rows print as MK-CF-M-004 where `viaRows`). */
function traced(id: string) {
  const f = FIGS[id];
  expect(R(f.main).printed.some((p) => p.id === (f.nowAs?.id ?? (f.viaRows ? 'MK-CF-M-004' : id)))).toBe(true);
}
/** TENET 5 — what the package could not show: opening the screen changes nothing the person entered, and the figure is
 *  printed, from what they entered, under its identifier. */
function holds5(id: string) { expect(R(FIGS[id].main).changed).toEqual([]); traced(id); }
/** TENET 6 — what the package could not show: the line beside the figure is on the rendered screen, and the drawing it is
 *  held to (and the test that holds it) exist — or, where there is none, the note says why. */
function holds6(id: string) {
  const f = FIGS[id];
  expect(lineOn(f.main, f.line)).toBe(true);
  if (f.mock) expect(fs.existsSync(path.join(ROOT, f.mock))).toBe(true);
  if (f.match) expect(fs.existsSync(path.join(ROOT, f.match))).toBe(true);
  if (!f.mock) expect(f.drawingNote?.length ?? 0).toBeGreaterThan(40);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CLASSIFICATION OF EVERY FAIL
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Cls = 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'EVIDENCE GAP';
type Item = { cls: Cls; why: string; rowWordsOnly?: boolean; records?: boolean; fix?: string; check?: () => void; wrong?: () => void;
  ruling?: { readingA: string; readingB: string; recommend: string }; mmcf?: string;
  /** THE RIGHT ANSWER HOLDS IN THE WORKING TREE (uncommitted work landing while this ran): `wrong` then runs as a passing
   *  test, and `check` — the committed answer at b1c659e8 — as test.failing beside it, kept rather than deleted. */
  fixed?: string;
  /** With `fixed`, where `check` is not itself the committed answer: the committed answer, pinned as test.failing. */
  was?: () => void;
  /** NEITHER ANSWER HOLDS IN THE WORKING TREE: what it shows now, run as a passing test; the right answer stays test.failing. */
  moved?: { seen: string; now: () => void } };
const FLIGHT = 'in the working tree, uncommitted, CF-MMFIX (seen 2026-10-25 19:09)';
/** FIX-MONTH, 2026-10-25 — the lead's ruling on DEC-1923 / DEC-2440 (a mortgage in Debts on no property, beside a Rent / Mortgage
 *  budget line, is that line: counted once, from Debts, planned and actual — cash-flow_v01's row of that date) moves the register's
 *  own September household (H_CF): the line stands down, so the budget counted is 3,400 − 2,300 = $1,100; planned 7,200 − 2,400 −
 *  250 − 1,100 = +$3,450 (it read +$1,150), free after the $300 goal +$3,150 (+$850), October's planned outflow 1,100 + 2,400 + 250 =
 *  $3,750 ($6,050); the $2,300 logged under the line is the mortgage's payment, so ACTUAL EXPENSES is 512 + 186 = $698 ($2,998) and
 *  the budget editor's $1,100 plan has $402 left. Outflow ($3,248) and the actual surplus ($3,952) do not move. */
const FIXMONTH = 'FIX-MONTH, 2026-10-25';
const FIXBILLS = 'FIX-BILLS, 2026-10-25: a bill with no month has no date (upcomingBills MK-CF-F-019; a twelfth a month on the table, MK-XS-F-004), "never" is proven and not read off a 600-month stop (payoffPlan MK-CF-F-034), and with no balance given COMING UP projects nothing and says "No balance to start from — nothing is projected." (whatsComing MK-CF-O-008)';
/** FIX-INCOME-A's fix (2026-10-26), re-measured here the file's own way: the right answer passes, the committed answer is pinned. */
const FIXINCA = 'FIX-INCOME-A, 2026-10-26: part-year pay, one rule — a take-home and a 401(k) are each a PAID month\'s, so the year of either is that month × the months paid (MK-CF-F-233 earnerWageShares, MK-CF-F-180 enteredLandsAnnual, MK-CF-F-181 rateInForce, MK-CF-F-188 householdPreTaxContributionsAnnual; base-pay.ts paidMonthsOf, MK-CF-F-144, MK-CF-F-145, MK-CF-F-171, MK-CF-O-001), every "/month" on Your base pay is a month the wage is paid, and Base pay\'s band is read on everything taxed (DEC-0178); a take-home typed before 2026-08-28 is worked back with the 401(k) added back (MK-CF-F-186, DEC-7942)';
/** CF-MMFIX-B's fixes of 2026-10-25, re-measured by FIX-INCOME-A on 2026-10-26. */
const FIXMMB = 'CF-MMFIX-B, 2026-10-25 (re-measured by FIX-INCOME-A, 2026-10-26)';
/** FIX-INCOME-B's fixes (2026-10-25), re-measured here the file's own way: the right answer passes, the committed answer is pinned. */
const FIXINCB = 'FIX-INCOME-B, 2026-10-25: every source the year is taxed on is a row, signed (taxedSourcesAnnual, MK-CF-F-084); a rental loss is a row of the take-home and of the month (MK-CF-O-004, MK-CF-F-088, MK-XS-F-004); entered means recorded on the income manager (MK-CF-O-019); each vest in its own year, taxed, and not money unless sold when it vests (rsuAnnual MK-CF-F-066, vestsAreCash); money that lands once lands in its own year (landsOnce); Social Security taxed per IRS Publication 915';
/** PF-TOOLS, 2026-10-27 — the records row "Records-only fixes the measurers found": the six figures' words now say what the
 *  screen does (no figure moves), and the drawing errors carry their dated READ THIS FIRST row. */
const FIXREC = 'PF-TOOLS, 2026-10-27 (the records row)';
/** A drawing's text with its numeric entities read (&#183; is "·"), as the person reads it. */
const drawn = (f: string) => src(f).replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
const FIXTAX = 'FIX-TAX, 2026-10-25: paidOutByAccount (MK-CF-F-183) ends the window today and counts a reinvested payout at its amount, or shares × price (DEC-0179, DEC-0198)';
const GAP5 = 'The package carried the figure\'s words only, so the reviewer could not see edits, syncs or the render. Rendered in its row\'s household: opening the screen changes nothing entered, and the figure prints, under its identifier, from what was entered. Package fix: send the render and the store before and after.';
const GAP6 = (id: string) => FIGS[id].mock
  ? `The package named decisions, not the drawing. The line beside the figure is on the rendered screen; the drawing is ${FIGS[id].mock!.split('/').pop()}, held by ${FIGS[id].match!.split('/').pop()}. Package fix: send the drawing and that test. Appearance gaps on these screens (band totals' right edge, type sizes, bands, corners) are MM-CF's list, not counted here.`
  : `The package named decisions, not a drawing — and ${FIGS[id].drawingNote}.`;
const gap5 = (id: string): Item => ({ cls: 'EVIDENCE GAP', why: GAP5, check: () => holds5(id) });
const gap6 = (id: string): Item => ({ cls: 'EVIDENCE GAP', why: GAP6(id), check: () => holds6(id) });

// ── the shared witnesses (each wrong check carries the right answer) ──────────────────────────────────────────────
/** A take-home typed the old way, arriving from the cloud, reads as the gross until something else saves the profile:
 *  useStore.ts loadFromCloud (and the phone's `merge`) run moveOldRentFigure but not convertTakeHomeMode, which only
 *  setOnboardingProfile runs. Right answer: the screen the cloud load shows = the screen after the app's own conversion. */
const OLD = (screenKey: 'TAB' | 'PAY' | 'SUM' | 'HOME', id: string) => () => {
  expect(printed(`OLD_CLOUD_${screenKey}`, id)).toEqual(printed(`OLD_SET_${screenKey}`, id));
};
const OLD_WHY = (what: string) => `A take-home of $5,000 typed the old way and arriving from the cloud: ${what}. useStore.ts loadFromCloud and the phone's merge run moveOldRentFigure but not convertTakeHomeMode (only setOnboardingProfile does), so the typed take-home is read as a gross and taxed until something else saves the profile. The same profile through the app reads $5,000.`;
const OLD_FIX = 'src/store/useStore.ts loadFromCloud and the persist merge: run convertTakeHomeMode beside moveOldRentFigure (take-home-mode-migration.ts). Owner: the store.';
const RENT_LOSS_FIX = 'MoneyKeel/functions/cashflow/income-summary.ts incomeSources / incomeSummary / theIncomeManager, src/screens/CashFlowScreen.tsx IncomeTab and src/domain/grid incomeMonthlyGrid: an entered rental is a source whatever its sign — "−$500/month" net, counted in the month and in the taxed rows (rentalNetAnnual already returns it signed). Owner: MK-CF-O-004 incomeSummary.';
const PART_FIX = 'src/domain/income/onboarding.ts MK-CF-F-233 earnerWageShares and MoneyKeel/functions/cashflow/base-pay.ts (MK-CF-F-145, k401Annual): a typed take-home is per PAID month — share = (year − 401(k) of paid months − take-home × paid months) ÷ year; the 401(k) counts only in paid months on Base pay as on the Income summary (MK-CF-F-206). Owner: MK-CF-O-001 basePay with F-233.';

const CLASS: Record<string, Item> = {
  // ───────────────────────────────────────── PART 18 — the Cash flow tab, its four tabs and Home's box ──────────────
  'MK-CF-M-003#1': { cls: 'APP WRONG', rowWordsOnly: true, fixed: `${FIXREC}: the formula reads "the month’s take-home (MK-CF-M-051), less each debt actually paid, …"`,
    was: () => { expect(figureSpec('MK-CF-M-003').formula).toMatch(/received/); },
    why: 'The row still says "the inflow received"; the code counts the month\'s take-home before anything is recorded (Actual inflow $7,200 with nothing received), as DEC-7607 settled for the same block. DEC-7607 rewrote MK-CF-M-051\'s row; this one was left. File and code disagree; no figure moves.',
    fix: 'MoneyKeel/functions/cashflow/the-month.ts MK-CF-M-003 formula: "the month\'s take-home (MK-CF-M-051), less each debt actually paid, less everything logged by hand and imported". Records only.',
    check: () => { expect(after('CF', 'Actual inflow (income (take-home))')).toBe('$7,200'); expect(first('CF', 'MK-CF-M-003')).toBe('$3,952'); },
    wrong: () => { expect(figureSpec('MK-CF-M-003').formula).not.toMatch(/received/); } },
  'MK-CF-M-003#8': { cls: 'REVIEWER WRONG',
    why: 'The words are his approved drawing\'s ("Actual inflow (income (take-home))", "= Actual surplus so far", cash-flow_v01 frame A, DEC-0440) and DEC-7607 settled that the inflow is the month\'s take-home. Tenet 6 outranks tenet 8 (DEC-3523: the higher tenet wins).',
    check: () => { expect(has('CF', 'Actual inflow (income (take-home))')).toBe(true); expect(has('CF', '= Actual surplus so far')).toBe(true); } },
  'MK-CF-M-006#4': { cls: 'REVIEWER WRONG',
    why: 'Each earner\'s row prints that earner\'s own entry in the period it was entered: "You · Salary — steady · before tax · every 2 weeks · $4,200" and "Sam · … monthly · $5,000". annualOfSource (MK-CF-F-210, the function the reviewer read) had no caller anywhere — retired 2026-10-25 by FIX-INCOME-B.',
    check: () => { expect(text('INC_OK_TAB')).toMatch(/You · Salary — steady \| before tax · every 2 weeks · (≈ ?)?\$5,898\/month take-home \| \$4,200 ›/);
      expect(text('INC_OK_TAB')).toMatch(/Sam · Salary — steady \| before tax · monthly · (≈ ?)?\$3,500\/month take-home \| \$5,000 ›/);
      const callers = ['src', 'MoneyKeel/functions'].flatMap((d) => grep(d, /annualOfSource\(/)).filter((h) => !/export function annualOfSource/.test(h.line));
      expect(callers).toEqual([]); } },
  'MK-CF-M-009#1': { fixed: FIXINCB, cls: 'APP WRONG',
    why: 'Grants of 75 shares vesting March 2026 and 25 vesting March 2027, at $400: the Income tab reads "$20,000/year" (the two years averaged) and the Income summary\'s March reads $22,189 — $20,000 after tax landing in March 2026, when 2026\'s vest is $30,000 and $10,000 of the $20,000 is 2027\'s. MK-CF-F-066 rsuAnnual divides by the vest years.',
    fix: 'src/domain/income/onboarding.ts rsuAnnual (MK-CF-F-066) and the grid\'s equity placement (MK-CF-F-018 equityByMonth — each vest in its own year and month since 2026-10-25, FIX-BILLS): this year\'s vest is the rows dated this year ($30,000 in 2026); a later year\'s rows land in their year. The Income tab and the Income summary read it. Owner: MK-CF-O-004.',
    check: () => { expect(printed('GRANTS_TAB', 'MK-CF-M-009')).toContain('$20,000'); },
    wrong: () => { expect(printed('GRANTS_TAB', 'MK-CF-M-009')).toContain('$30,000'); } },
  'MK-CF-M-009#8': { cls: 'NEEDS A RULING',
    why: 'RULED 2026-10-25 by the lead — reading B, applied by FIX-INCOME-B (vestsAreCash; "Do you sell the shares when they vest?" on the grants\' editor and Bonus and stock). Whether a vest is money in the bank. Until then a vest landed in its month as cash after tax (the Income summary\'s March, This month counts it), and the row says "vests through the year". No ruling of his says whether shares that vest are spendable.',
    ruling: { readingA: 'A vest lands as cash in its month, after tax (as built; his "a lump that lands once is never averaged", 2026-08-28).',
      readingB: 'A vest is shares: taxed in its year but not counted as cash unless the person says they sell at vest — the rule he made for reinvested dividends (DEC-0179). March take-home stays the usual month; the vest is in What it is taxed on.',
      recommend: 'B, with one question on the equity editor ("Do you sell the shares when they vest?") — the same shape as "Does this reach your bank?" (DEC-0198). Reverse in one word.' },
    check: () => { expect(text('INC_OK_TAB')).toMatch(/(vests through the year|RSU grants)/); } },
  'MK-CF-M-010#1': { cls: 'APP WRONG',
    why: 'A rental losing $500 a month ($1,000 rent, $1,500 running costs, on a named property): the Income tab shows no rental at all, This month\'s inflow is $7,200 with the loss left out, and the Income summary\'s taxed row ($86,400) no longer adds to its own total ($80,400, which does carry the −$6,000). MK-CF-F-068 keeps the loss; the readers drop any rental below $0.',
    fix: RENT_LOSS_FIX,
    check: () => { expect(has('LOSS_TAB', /^Rental (property|income)$/)).toBe(false); },
    wrong: () => { expect(text('LOSS_TAB')).toMatch(/Rental (property|income) \| [^|]+ \| −\$500/); },
    fixed: `${FLIGHT}: the Income tab lists "Rental income · 1 property · −$500 ›". This month (FOUND F4), the Income summary (MK-CF-M-037, 038, 076) and the manager (MK-CF-M-027) still drop the loss` },
  'MK-CF-M-010#3': { fixed: FIXINCB, cls: 'APP WRONG',
    why: 'The entered rental with a −$500 net disappears from the Income tab, and the income manager lists "Rent from a property" as not entered ("YOU ENTERED ABOUT 1 source") — an entered thing shown as never entered.',
    fix: RENT_LOSS_FIX,
    check: () => { expect(has('LOSS_MGR', 'Rent from a property')).toBe(true); },
    wrong: () => { expect(has('LOSS_MGR', 'Rent')).toBe(true); expect(has('LOSS_MGR', 'Rent from a property')).toBe(false); } },
  'MK-CF-M-011#4': { cls: 'APP WRONG',
    why: 'The row is "Social Security · pension — guaranteed income", and its own register row says "guaranteed income being received now — SS, pension, annuity and other". The code reads retirementIncomeMonthly, which adds 401(k) withdrawals and RMDs and ignores whether anything is received: a retiree drawing $1,500 from a 401(k) reads "$3,900/month — guaranteed income"; a worker whose $2,900 is the ssa.gov estimate typed in the Plan reads "$2,900/month — guaranteed income" while THIS MONTH leaves it out.',
    fix: 'src/screens/CashFlowScreen.tsx IncomeTab and MoneyKeel/functions/cashflow/income-summary.ts incomeSources: the row reads guaranteedOutsideStreams (MK-CF-F-076, the four outside sources) under currentRetirementIncomeMonthly\'s received-now rule; withdrawals are a draw, not guaranteed income. Owner: MK-CF-O-004.',
    check: () => { expect(text('RETWD_TAB')).toMatch(/Social Security · pension \| guaranteed income \| \$3,900\/month/); },
    wrong: () => { expect(text('RETWD_TAB')).toMatch(/Social Security · pension \| guaranteed income \| \$2,400\/month/); expect(has('WSS_TAB', 'Social Security · pension')).toBe(false); },
    fixed: `${FIXMMA}: the row reads the guaranteed income received now — "$2,400/month" for $2,400 of Social Security beside a $1,500 401(k) draw, and a Plan estimate not yet received is not listed (income-tab.ts guaranteedReceivedNow)` },
  'MK-CF-M-016#4': { fixed: FIXBILLS, cls: 'APP WRONG',
    why: 'A $1,200 insurance bill with no month set: the Expenses tab plans it as a twelfth ("Once in a while $100") and the bill calendar\'s table takes $100 a month off ("Out −$2,100" every month), but the calendar\'s COMING UP reads "Insurance · $1,200 due Jan 1, 2027" — a date nobody entered, and $1,200 in a month whose table shows $100 of it. Two readers, two answers.',
    fix: 'MoneyKeel/functions/cashflow/whats-coming.ts upcomingBills (MK-CF-F-019) and the radar: a once-in-a-while bill with no month is not dated — COMING UP leaves it out, or says "no due month set — counted as $100 a month". Owner: MK-CF-O-008 whatsComing.',
    check: () => { expect(has('UNDATED_BILLS', 'Insurance · $1,200 due Jan 1, 2027')).toBe(true); expect(after('UNDATED_BILLS', 'Jan ’27', 2)).toBe('−$2,100'); },
    wrong: () => { expect(text('UNDATED_BILLS')).not.toMatch(/Insurance · \$1,200 due Jan 1, 2027/); } },
  'MK-CF-M-020#1': { cls: 'REVIEWER WRONG',
    why: 'Rendered: with no budget there is no "Surplus after your budget" line (the no-budget sentence stands in); with the car loan\'s payment not entered there is none either; with no income the month is not drawn (its two set-up steps). The line appears only on a complete plan, as its row says (DEC-7682, DEC-7939).',
    check: () => { expect(has('NOBUDGET_CF', 'Surplus after your budget')).toBe(false); expect(has('CF_NOPAY', 'Surplus after your budget')).toBe(false);
      expect(has('CF_NOINCOME', 'Surplus after your budget')).toBe(false); expect(after('CF', 'Surplus after your budget')).toBe('+$3,150'); /* +$850 until FIX-MONTH, 2026-10-25: 3,450 − 300 */ } },
  'MK-CF-M-022#1': { cls: 'EVIDENCE GAP',
    why: 'The reviewer could not compute a simulated paycheck from words. The app\'s is deterministic: 1,000 seeded paths (DEC-0247), the plan\'s return and inflation, in today\'s dollars (DEC-2164) — the register\'s household gives the same figure every run. Package fix: send the simulation contract (paths, seed, return, volatility, horizon, the draw search) with the card.',
    check: () => { const op = { ...H_SAVER.onboardingProfile, incomeSources: ['retirement_income'], baseSalary: undefined };
      const a = futurePaycheck({ op, accounts: H_SAVER.assetAccounts, assumptions: { expectedReturn: 0.06 } } as any);
      const b = futurePaycheck({ op, accounts: H_SAVER.assetAccounts, assumptions: { expectedReturn: 0.06 } } as any);
      expect(a).toEqual(b); expect(a?.monthly).toBeGreaterThan(0); } },
  'MK-CF-M-022#2': { cls: 'APP WRONG',
    why: 'The card says the age ("At 67"), that it is a projection, and the odds\' horizon — but not the return or inflation it assumes, nor that its dollars are today\'s (DEC-2164: "the figure shown is what it buys today"). His rule DEC-0088: an explanation names every figure it assumes. (The reviewer\'s other clause is wrong: with no birth year there is no card, never an age of 68.)',
    fix: 'src/screens/CashFlowScreen.tsx WorkingMain YOUR FUTURE PAYCHECK: one line under the tag — "in today\'s dollars · assumes a 6.00% return and 2.40% inflation" — from futurePaycheck\'s inputs. Words only. Owner: MK-CF-O-017 futurePaycheck.',
    check: () => { expect(has('NOBIRTH_SAVER', 'YOUR FUTURE PAYCHECK')).toBe(false); expect(has('SAVER', /^At 67: ~\$[\d,]+\/month$/)).toBe(true); },
    wrong: () => { expect(text('SAVER')).toMatch(/today[’']s dollars/); expect(text('SAVER')).toMatch(/return/); },
    fixed: `${FIXMMA}: under the tag, "In today’s dollars · assumes a 7.90% return and 2.50% inflation a year"`,
    was: () => { expect(text('SAVER')).not.toMatch(/today[’']s dollars/); } },
  'MK-CF-M-022#3': { cls: 'REVIEWER WRONG',
    why: 'No pot, or no birth year: the card is not drawn — no $0 and no balance is shown (rendered both ways). Its row\'s refusal, held.',
    check: () => { expect(has('NOPOT_SAVER', 'YOUR FUTURE PAYCHECK')).toBe(false); expect(has('NOBIRTH_SAVER', 'YOUR FUTURE PAYCHECK')).toBe(false); expect(printed('NOPOT_SAVER', 'MK-CF-M-022')).toEqual([]); } },
  'MK-CF-M-022#7': { cls: 'REVIEWER WRONG',
    why: 'The card says so in its own tag: "PROJECTION — an estimate, not a promise"; nothing on it calls the draw safe.',
    check: () => { expect(has('SAVER', 'PROJECTION — an estimate, not a promise')).toBe(true); expect(text('SAVER')).not.toMatch(/\bsafe\b/i); } },
  'MK-CF-M-023#3': { cls: 'REVIEWER WRONG', why: 'As MK-CF-M-022 tenet 3: no pot or no birth year, no card — the guaranteed line is never shown as $0.',
    check: () => { expect(printed('NOPOT_SAVER', 'MK-CF-M-023')).toEqual([]); expect(printed('NOBIRTH_SAVER', 'MK-CF-M-023')).toEqual([]); } },
  'MK-CF-M-023#4': { cls: 'APP WRONG',
    why: 'The guaranteed line reads "~$2,000" at 67 — today\'s dollars, which is right under DEC-2164 and his DEC-0244 (the four outside sources) — but the card never says the dollars are today\'s, so $2,000 in 2048 reads as 2048 dollars.',
    fix: 'Same line as MK-CF-M-022 tenet 2 ("in today\'s dollars"). Words only. Owner: MK-CF-O-017.',
    check: () => { expect(after('SAVER', 'Social Security · pension')).toBe('~$2,000'); },
    wrong: () => { expect(text('SAVER')).toMatch(/today[’']s dollars/); },
    fixed: `${FIXMMA}: the card says "In today’s dollars" above the guaranteed ~$2,000`,
    was: () => { expect(text('SAVER')).not.toMatch(/today[’']s dollars/); } },
  'MK-CF-M-027#1': { fixed: FIXINCB, cls: 'APP WRONG',
    why: 'The income manager counts a source as entered only when its amount is above $0: the rental losing $500 a month is listed under ANYTHING ELSE? as "Rent from a property", and "YOU ENTERED ABOUT 1 source".',
    fix: RENT_LOSS_FIX,
    check: () => { expect(has('LOSS_MGR', '1 source')).toBe(true); },
    wrong: () => { expect(has('LOSS_MGR', '2 sources')).toBe(true); } },
  'MK-CF-M-027#3': { fixed: FIXINCB, cls: 'APP WRONG', why: 'Same: theIncomeManager\'s `entered: amount > 0` reads an entered loss as nothing entered (tenet 3 — what is entered is not "not entered").',
    fix: RENT_LOSS_FIX,
    check: () => { expect(has('LOSS_MGR', 'Rent from a property')).toBe(true); },
    wrong: () => { expect(text('LOSS_MGR')).toMatch(/Rent \| ✓/); } },
  'MK-CF-M-031#1': { fixed: FIXINCA, cls: 'APP WRONG',
    why: 'A worker paid only July to December who typed a $3,799.17 take-home: Base pay and the Income summary\'s usual month read $3,799, but October (a paid month) reads $7,598 on This month and the Income summary\'s July $7,598 — twice what they typed. MK-CF-F-233 subtracts twelve months of take-home from six months of wages.',
    fix: PART_FIX,
    check: () => { expect(first('PART_PAY', 'MK-CF-M-031')).toBe('$3,799/month'); expect(after('PART_CF', 'Actual inflow (income (take-home))')).toBe('$7,598'); },
    wrong: () => { expect(after('PART_CF', 'Actual inflow (income (take-home))')).toBe('$3,799'); } },
  'MK-CF-M-031#4': { fixed: FIXINCA, cls: 'APP WRONG',
    why: 'One take-home, two numbers for the same paid month: Base pay "= Take-home $3,799/month" and This month\'s inflow $7,598 (October, paid). The cross-card check X3.',
    fix: PART_FIX,
    check: () => { expect(printed('PART_CF', 'MK-CF-M-004')[0]).toBe('$7,598'); },
    wrong: () => { expect(printed('PART_CF', 'MK-CF-M-004')[0]).toBe(dollarsText(first('PART_PAY', 'MK-CF-M-031'))); } },
  'MK-CF-M-047#4': { cls: 'REVIEWER WRONG',
    why: 'The later month\'s card reads the dated grid (grid.cells), after the 401(k), with reinvested cash out: October $7,200. MK-CF-F-020 cashflowYear, the reader the reviewer named, has no caller outside its own tests. Records fix: retire F-020.',
    check: () => { expect(first('CF_OCT', 'MK-CF-M-047')).toBe('$7,200'); expect(grep('src', /cashflowYear\(/).filter((h) => !/export function cashflowYear/.test(h.line))).toEqual([]); } },
  'MK-CF-M-048#4': { cls: 'REVIEWER WRONG',
    why: 'October\'s planned outflow is $6,050 = $3,400 budget + $2,400 mortgage + $250 car loan — the debts are in, from the dated grid; December with its own $1,200 bill reads $3,200. cashflowYear (which omits debt) has no caller.',
    // $6,050 until FIX-MONTH, 2026-10-25: the Rent / Mortgage line is the mortgage's, counted once — 1,100 + 2,400 + 250 = $3,750
    check: () => { expect(first('CF_OCT', 'MK-CF-M-048')).toBe('$3,750'); expect(first('DEC_DEC', 'MK-CF-M-048')).toBe('$3,200'); } },
  'MK-CF-M-049#3': { cls: 'APP WRONG',
    why: 'With no budget set, This month gives no planned surplus ("we won\'t guess one", DEC-7939), but October\'s plan card prints "Planned outflow $2,650 · = Planned surplus $4,550" — the take-home less the debts, as if nothing were spent. Its row says "$0 until both sides are entered"; it is neither.',
    fix: 'src/screens/CashFlowScreen.tsx OtherMonthCard and MoneyKeel/functions/cashflow/this-month.ts (the later-month cell): with no budget the card reads Expenses "— not set" and no planned surplus, in This month\'s words (DEC-7939); the row\'s refusal says so. Owner: MK-CF-O-003 thisMonth.',
    check: () => { expect(has('NOBUDGET_CF', /no planned surplus — we won’t guess one/)).toBe(true); expect(has('NOBUDGET_NEXT', /Until you do there is no planned surplus — we won’t guess one\./)).toBe(true); },
    wrong: () => { expect(printed('NOBUDGET_NEXT', 'MK-CF-M-049')).toEqual([]); },
    fixed: `${FIXMMA}: October with no budget reads "Planned outflow (expenses + debt) — not set", This month's sentence and "Set your budget"; no planned surplus`,
    was: () => { expect(first('NOBUDGET_NEXT', 'MK-CF-M-049')).toBe('$4,550'); } },
  'MK-CF-M-051#8': { cls: 'REVIEWER WRONG',
    why: 'As MK-CF-M-003 tenet 8: "Actual inflow" is his drawing\'s word (DEC-0440) and the take-home is the settled inflow (DEC-7607). Tenet 6 outranks tenet 8.',
    check: () => { expect(after('HOME', 'Income')).toMatch(/^≈?\$7,200$/); expect(has('CF', 'Actual inflow (income (take-home))')).toBe(true); } },
  'MK-CF-M-053#3': { cls: 'REVIEWER WRONG',
    why: 'Rendered: no income → Cash flow draws its two set-up steps and no surplus; a past month with no record → "$0" with "Nothing recorded for this month — it predates your tracking." His Q48 rule (DEC-0431): the layout stays, the figure reads $0, the sentence says why. A real $0 with its reason, not a missing value dressed as a measured one.',
    check: () => { expect(has('CF_NOINCOME', 'SET UP YOUR MONTH — 2 STEPS')).toBe(true); expect(printed('CF_NOINCOME', 'MK-CF-M-003')).toEqual([]);
      expect(has('CF_PAST_EMPTY', 'Nothing recorded for this month — it predates your tracking.')).toBe(true); } },
  'MK-CF-M-053#8': { cls: 'REVIEWER WRONG', why: 'As MK-CF-M-051 tenet 8 — the drawing\'s words (DEC-0440, DEC-7607). Tenet 6 outranks tenet 8.',
    check: () => { expect(has('CF', '= Actual surplus so far')).toBe(true); } },
  'MK-CF-M-054#8': { cls: 'APP WRONG', rowWordsOnly: true, fixed: `${FIXREC}: the label reads "each line of what has happened so far"`,
    was: () => { expect(figureSpec('MK-CF-M-054').label).toMatch(/received/); },
    why: 'The register calls the actual block\'s rows "each received line", but the block holds the month\'s take-home before anything is received and debts not yet paid at $0 ("Mortgage NOT PAID YET $0"). No screen prints the name — the rows print as MK-CF-M-004 — so it is the row\'s word that misleads.',
    fix: 'MoneyKeel/functions/cashflow/this-month.ts MK-CF-M-054 label: "each line of what has happened so far". Records only.',
    check: () => { expect(text('CF_DEBT_MONTH')).toMatch(/Car loan \| NOT PAID YET \| \$0/i); },   // the witness moved from H_CF's mortgage (FIX-MONTH, 2026-10-25)
    wrong: () => { expect(figureSpec('MK-CF-M-054').label).not.toMatch(/received/); } },
  'MK-CF-M-055#1': { cls: 'EVIDENCE GAP',
    why: 'The draw is a bisection over the seeded simulation (src/domain/paycheck buildPaycheckYear: 12 halvings between $0 and twice the even spend-down; at the top it returns the top, a draw the simulation supports — never one above it). Package fix: send that search and its bracket with the simulation contract.',
    check: () => { expect(after('SAVER', 'Draw from savings')).toMatch(/^~\$[\d,]+$/); expect(src('src/domain/paycheck/index.ts')).toMatch(/for \(let i = 0; i < 12; i\+\+\)/); } },
  'MK-CF-M-055#3': { cls: 'APP WRONG', rowWordsOnly: true, fixed: `${FIXREC}: the refusal reads "No age entered, retirement age already reached, or no pot to project from — the card is not drawn."`,
    was: () => { expect(figureSpec('MK-CF-M-055').refusal).not.toMatch(/not drawn/); },
    why: 'With no pot the card is not drawn at all (rendered) — it never shows a $0 draw. But the row says "No pot — no draw; the paycheck is the guaranteed income alone", a card the code never draws. File and code disagree; the screen is the right one.',
    fix: 'MoneyKeel/functions/cashflow/future-paycheck.ts MK-CF-M-055 refusal: "No pot to project from, or retirement age already reached — the card is not drawn." Records only.',
    check: () => { expect(printed('NOPOT_SAVER', 'MK-CF-M-055')).toEqual([]); },
    wrong: () => { expect(figureSpec('MK-CF-M-055').refusal).toMatch(/not drawn/); } },
  'MK-CF-M-055#7': { cls: 'REVIEWER WRONG', why: 'The screen says "Draw from savings" under "PROJECTION — an estimate, not a promise"; the word "safe" is the code\'s variable name, never the screen\'s.',
    check: () => { expect(has('SAVER', 'Draw from savings')).toBe(true); expect(text('SAVER')).not.toMatch(/\bsafe\b/i); } },
  'MK-CF-M-056#4': { cls: 'REVIEWER WRONG',
    why: 'The figure reads the dated month: with a $1,200 bill due in December, September\'s budget editor says "$2,000 left · of $2,000 plan" — not the $2,100 average. (The editor\'s bucket rows beside it read the dated month too since 2026-10-25 — CF-MMFIX-A\'s budgetEditorBuckets, and FIX-BUDGET\'s budgetVsActual, MK-CF-F-014 — see DEC-7611.)',
    check: () => { expect(has('DEC_BUDGET', /\$2,000 left · of \$2,000 plan/)).toBe(true); } },
  'MK-CF-M-058#1': { fixed: FIXBILLS, cls: 'APP WRONG',
    why: 'A $60,100 family loan at 0% with $100 a month clears in 601 months. The Debts tab reads "never at this rate", "—" total interest, and "At this payment your balance grows faster than you pay it down" — at 0% the balance falls $100 every month. payoffPlan stops at 600 months and reports never.',
    fix: 'src/domain/debt/index.ts payoffPlan (MK-CF-F-034): tell "the payments do not cover the interest" (never) from "longer than 50 years" (a horizon reached, with the balance left); the screen says which. Owner: MK-CF-O-018 theDebts.',
    check: () => { expect(first('ZERO_RATE', 'MK-CF-M-058')).toBe('never at this rate'); expect(payoffPlan([{ debt_id: 'z', label: 'L', debt_type: 'PERSONAL', remaining_balance: 60100, interest_rate_apr: 0, minimum_monthly_payment: 100 } as any], 0).neverPaysOff).toBe(true); },
    wrong: () => { expect(first('ZERO_RATE', 'MK-CF-M-058')).not.toBe('never at this rate'); expect(text('ZERO_RATE')).not.toMatch(/grows faster than you pay it down/); } },
  'MK-CF-M-059#1': { fixed: FIXBILLS, cls: 'APP WRONG',
    why: 'Same loan: total interest reads "—" beside the false warning, though it is $0 and the loan clears; nothing names the debt that runs past the horizon.',
    fix: 'As MK-CF-M-058: payoffPlan returns the debts left at the horizon; total interest is shown with "after 50 years, $X still owed on <debt>". Owner: MK-CF-O-018.',
    check: () => { expect(printed('ZERO_RATE', 'MK-CF-M-059')).toEqual([]); },
    wrong: () => { expect(first('ZERO_RATE', 'MK-CF-M-059')).toBe('$0'); } },
  'MK-CF-M-070#7': { cls: 'REVIEWER WRONG',
    why: 'The order is labelled as what it is: "The order the math would tap your accounts — not a directive.", each step says why, and "Steer it ›" lets the person set their own (store.drawOrder).',
    check: () => { expect(has('DRAW', 'The order the math would tap your accounts — not a directive. Balances match your Net worth.')).toBe(true); expect(has('DRAW', 'Steer it ›')).toBe(true); } },
  'MK-CF-M-073#1': { cls: 'APP WRONG',
    why: 'A card with a $200 minimum and a chosen $300 a month reads "$300/month min" — the person\'s payment called the minimum — while the total line says "$450/month in payments" (the minimums) and the payoff plan ($450 /month total, Oct 2033) ignores the $300. A chosen $150 reads "$200/month min" with no word that their $150 is below the minimum. requiredPayment takes max(minimum, chosen); the label says minimum.',
    fix: 'src/screens/BudgetScreen.tsx (Debts) and src/domain/debt requiredPayment/payoffPlan: print "$300/month · minimum $200"; the payoff plan and "in payments" use what they pay; a chosen amount below the minimum says so. Owner: MK-CF-O-018.',
    check: () => { expect(text('ABOVEMIN')).toMatch(/\$300\/month min/); expect(requiredPayment({ minimum_monthly_payment: 200, monthly_payment: 150 } as any)).toBe(200); },
    wrong: () => { expect(text('ABOVEMIN')).not.toMatch(/\$300\/month min/); expect(text('ABOVEMIN')).toMatch(/\$550\/month in payments/); },
    fixed: `${FIXMMA}: the card reads "$300/month · your payment" and the total "$550/month in payments" (the payoff plan's own total is tenet 5's, measured there)` },
  'MK-CF-M-074#2': { cls: 'REVIEWER WRONG',
    why: '"$4,100 paid down since January" is his drawing\'s sentence (cash-flow_v01 frame 6, DEC-0440), and the row already says it is read from two recorded totals, "never estimated from the payments made — interest and new borrowing are inside it".',
    check: () => { expect(has('CF_DEBT', /^\$4,100 paid down since January — 15% of where you started$/)).toBe(true); expect(figureSpec('MK-CF-M-074').decisions!.join(' ')).toMatch(/new borrowing are inside it/); } },
  'MK-CF-M-075#2': { cls: 'REVIEWER WRONG', why: 'As MK-CF-M-074: the drawing\'s words, the same two recorded totals ($27,100 → $23,000 = 15%).',
    check: () => { expect(first('CF_DEBT', 'MK-CF-M-075')).toBe('15%'); } },
  'MK-CF-M-078#8': { cls: 'APP WRONG',
    why: 'His canon (naming spec, row 1): Surplus is "the money left after everything out, per month". The retired card\'s "SURPLUS — OCT $1,200" is before everyday expenses and debt payments (its row: "everyday expenses and monthly debt payments are what it is for") — and "Spent $0 of $1,200 surplus" spends it. One word, two things.',
    fix: 'src/components/PaycheckCard.tsx and CashFlowScreen.tsx RetiredMain: name it for what it is (a new canon row, e.g. "Your paycheck this month"), keep Surplus for after everything out. Words only; the canon table gains the row. Owner: MK-CF-O-017.',
    check: () => { expect(has('RET', 'YOUR PAYCHECK — OCT')).toBe(true); expect(text('RET')).toMatch(/Spent \$0 of your \$1,200 paycheck this month/); expect(src('MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md')).toMatch(/The money left after everything out, per month \| Surplus/); },
    wrong: () => { expect(has('RET', 'SURPLUS — OCT')).toBe(false); },
    fixed: `${FIXMMA}: the card is "YOUR PAYCHECK — OCT" and "Spent $0 of your $1,200 paycheck this month" (canon row 26); Surplus stays the money left after everything out`,
    was: () => { expect(has('RET', 'SURPLUS — OCT')).toBe(true); } },

  // ───────────────────────────────────────── PART 19 — Base pay, Income summary, manager, bill calendar, monthly income ─
  'MK-CF-M-032#4': { fixed: FIXINCA, cls: 'APP WRONG',
    why: 'One earner, $60,000 of wages and a rental netting $2,000 a month: Base pay reads "Federal tax bracket · what your next dollar costs · 12%", the Income summary "single, every source counted · 22%". The next dollar costs 22%. His DEC-0178 and DEC-0191: the band is worked once, on everything taxed, and every screen reads it; Base pay works its own on the wages.',
    fix: 'MoneyKeel/functions/cashflow/base-pay.ts basePay: read the band from the one producer at total income (taxedAfterPreTax, MK-CF-F-230) — or, as DEC-0178 allows "for now", say its base ("on your wages only — 22% with your rent"). Owner: MK-CF-O-001 basePay.',
    check: () => { expect(first('ONE_RENT_PAY', 'MK-CF-M-032')).toBe('12%'); expect(first('ONE_RENT_SUM', 'MK-CF-M-043')).toBe('22%'); },
    wrong: () => { expect(first('ONE_RENT_PAY', 'MK-CF-M-032')).toBe(first('ONE_RENT_SUM', 'MK-CF-M-043')); } },
  'MK-CF-M-033#1': { cls: 'REVIEWER WRONG',
    why: 'With rent, Base pay\'s tax on the wage is the one calculated rate — the year\'s tax over everything taxed — laid on the wage, so the card adds up ($5,000 − $512 − $400 = $4,088). That is his rule: the rate is produced once, at total income (DEC-0178), one rate everywhere the take-home matters (DEC-0196), the card adds up (DEC-0380).',
    check: () => { expect(text('ONE_RENT_PAY')).toMatch(/\$5,000 gross − \$512 tax − \$400 of 401\(k\)s = \$4,088\./); } },
  'MK-CF-M-033#8': { fixed: FIXMMB, cls: 'APP WRONG', was: () => { expect(text('ONE_STATE_PAY')).toMatch(/knows nothing about your state/); },
    why: 'A 5.00% state rate typed on the Tax organizer: Base pay\'s "Calculated federal tax ≈$533/month" carries it ($370 federal + $163 state), yet the card says "It knows nothing about your state" and "Only federal income tax is taken out here … your state may take more". The Income summary says "plus the 5.00% state rate you entered" (DEC-7798).',
    fix: 'MoneyKeel/functions/cashflow/base-pay.ts basePay (tax.covers) and src/screens/BasePayScreen.tsx: the row and both sentences say what is in it — "federal, plus the 5.00% state rate you entered" (the Income summary\'s words). Owner: MK-CF-O-001.',
    check: () => { expect(first('ONE_STATE_PAY', 'MK-CF-M-033')).toBe('$533/month'); },
    wrong: () => { expect(text('ONE_STATE_PAY')).not.toMatch(/knows nothing about your state/); expect(text('ONE_STATE_PAY')).toMatch(/5\.00% state rate/); } },
  'MK-CF-M-034#4': { cls: 'APP WRONG',
    fixed: `${FIXINCA}. The take-home is a paid month's: $10,000 gross − $716.67 tax − $1,000 of 401(k)s = $8,283.33, the figure Base pay, the Income summary's usual month and This month's paid months all print (tenet 4); the reviewer's reading, the calendar average ($4,142), would put a third figure beside them — the lead's decision, reversible to the average in one word`,
    was: () => { expect(first('PARTK_PAY', 'MK-CF-M-031')).toBe('$3,642/month'); },
    why: 'A worker paid July to December, $1,000 into a 401(k) each paid month: Base pay reads "Your 401(k)s $1,000/month" inside "$5,000 gross − $358 tax − $1,000 of 401(k)s = $3,642" — a twelve-month average gross less a paid month\'s 401(k), so the 401(k) is counted twelve times ($12,000) where the Income summary counts six ("Your 401(k)s −$6,000"). The average month is ($60,000 − $4,300 − $6,000) ÷ 12 = $4,142, not $3,642.',
    fix: PART_FIX,
    check: () => { expect(first('PARTK_SUM', 'MK-CF-M-077')).toBe('$6,000'); },
    wrong: () => { expect(first('PARTK_PAY', 'MK-CF-M-031')).toBe('$8,283/month'); expect(printed('PARTK_PAY', 'MK-CF-M-034')).toContain('$1,000/month');
      expect(text('PARTK_PAY')).toMatch(/\$10,000 gross − \$717 tax − \$1,000 of 401\(k\)s = \$8,283\./); expect(dollars(first('PARTK_SUM', 'MK-CF-M-037'))).toBe(8283); } },
  'MK-CF-M-035#7': { cls: 'REVIEWER WRONG',
    why: 'The warning is about the paycheck — what the take-home will really be — and a paycheck withholds the 0.9% only on a wage above $200,000 whatever the filing status (IRC §3102(f), the employer\'s withholding rule). The joint $250,000 threshold settles at filing, not in the take-home. The reviewer\'s own handoff says to keep the withholding rule and not replace it with the household rule.',
    check: () => { expect(text('PAY_EST')).toMatch(/The take-home above is higher than it will really be, by roughly \$1,079\/month/); expect(Math.round(((109200 + 60000) * 0.0765) / 12)).toBe(1079); } },
  'MK-CF-M-036#1': { cls: 'APP WRONG', fixed: FIXINCA,
    why: 'The July-to-December worker who typed $3,799.17: "Everything else taken out $700/month · 14%" = ($60,000 − 12 × $501.13 − 12 × $3,799.17) ÷ 12. In a paid month $10,000.05 − $501.13 − $3,799.17 = $5,699.75 is taken out (57%). MK-CF-F-145 subtracts twelve months of take-home and 401(k) from six months of wages.',
    fix: PART_FIX,
    check: () => { expect(printed('PART_PAY', 'MK-CF-M-036')).toContain('$700/month'); },
    wrong: () => { expect(printed('PART_PAY', 'MK-CF-M-036')).toContain('$5,700/month'); } },
  'MK-CF-M-037#1': { fixed: FIXINCB, cls: 'APP WRONG',
    why: 'The rental losing $500 a month: "TAKE-HOME EACH MONTH $7,200" — the loss is not in the month; the rows show only the pay.',
    fix: RENT_LOSS_FIX,
    check: () => { expect(first('LOSS_SUM', 'MK-CF-M-037')).toBe('$7,200'); },
    wrong: () => { expect(first('LOSS_SUM', 'MK-CF-M-037')).toBe('$6,700'); } },
  'MK-CF-M-037#2': { fixed: FIXINCB, cls: 'APP WRONG', why: 'The rows cannot show how the month was made when a signed source is dropped: no "Rent −$500" row.', fix: RENT_LOSS_FIX,
    check: () => { expect(has('LOSS_SUM', 'Rent')).toBe(false); }, wrong: () => { expect(has('LOSS_SUM', 'Rent')).toBe(true); } },
  'MK-CF-M-038#2': { fixed: FIXINCB, cls: 'APP WRONG', why: 'Same: each source of take-home is listed only above $0, so a loss is never a row.', fix: RENT_LOSS_FIX,
    check: () => { expect(printed('LOSS_SUM', 'MK-CF-M-038')).toEqual(['$7,200']); }, wrong: () => { expect(printed('LOSS_SUM', 'MK-CF-M-038').length).toBe(2); } },
  'MK-CF-M-039#4': { fixed: FIXINCB, cls: 'APP WRONG',
    why: 'The grants witness: March 2026 lands $22,189 — $20,000 of vest (the two-year average) after tax — when March 2026 vests $30,000. The level run-rate is landed as if it were the month\'s lump. As MK-CF-M-009 tenet 1.',
    fix: 'As MK-CF-M-009 tenet 1 (rsuAnnual and the grid\'s equity placement). Owner: MK-CF-O-004.',
    check: () => { expect(first('GRANTS_SUM', 'MK-CF-M-039')).toBe('$22,189'); },
    // the lead's ruling of 2026-10-25 (like DEC-0179): a vest kept as shares is not money to spend, so March is the usual month — no
    // month stands out — and the $30,000 that vests in 2026 is said, and taxed below (it was the reviewer's "March lands > $30,000")
    wrong: () => { expect(printed('GRANTS_SUM', 'MK-CF-M-039')).toEqual([]); expect(text('GRANTS_SUM')).toMatch(/\$30,000 of stock vesting this year is not here/);
      expect(text('GRANTS_SUM')).toMatch(/Stock vesting \| \$30,000/); } },
  'MK-CF-M-041#4': { fixed: FIXINCA, was: () => { expect(householdPreTaxContributionsAnnual(PART_CALC as any)).toBe(12000); }, cls: 'APP WRONG',
    why: 'The figure itself counts paid months ($60,000 − $6,000 = $54,000 for the July-to-December worker), but the same household\'s other readers count twelve: Base pay works its band on $60,000 − $12,000, and MK-CF-F-188 householdPreTaxContributionsAnnual (the Tax organizer and the Plan\'s taxable steps) gives $12,000. One concept, two totals.',
    fix: 'src/domain/income/earners.ts MK-CF-F-188: the 401(k) of the months each earner is paid (MK-CF-F-206); base-pay.ts k401Annual the same. Owner: F-188 / MK-CF-O-001.',
    check: () => { expect(first('PARTK_SUM', 'MK-CF-M-041')).toBe('$54,000'); expect(householdK401ByMonth(PART_CALC as any).reduce((t, m) => t + m, 0)).toBe(6000); },
    wrong: () => { expect(householdPreTaxContributionsAnnual(PART_CALC as any)).toBe(6000); } },
  'MK-CF-M-042#2': { fixed: FIXINCB, cls: 'APP WRONG',
    why: 'The register\'s household: the taxed rows are Your gross $109,200 · Sam\'s $60,000 · Rent $14,400 · Bonus $12,000 = $195,600, under "= Gross /year $264,800". The $69,200 between — self-employment $24,000, stock $20,000, Social Security $25,200 — has no row. Tenet 2: the rows under a total add up to it.',
    fix: 'MoneyKeel/functions/cashflow/income-summary.ts incomeSummary taxedLines: one row for every source taxableAnnual counts (self-employment, equity, retirement income, other, tips, one-time), signed. Owner: MK-CF-O-004.',
    check: () => { expect(printed('INC_OK_SUM', 'MK-CF-M-042')).toEqual(['$109,200', '$60,000', '$14,400', '$12,000']); expect(first('INC_OK_SUM', 'MK-CF-M-076')).toBe('$264,800'); },
    wrong: () => { expect(printed('INC_OK_SUM', 'MK-CF-M-042').map(dollars).reduce((t, v) => t + v, 0)).toBe(dollars(first('INC_OK_SUM', 'MK-CF-M-076'))); } },
  'MK-CF-M-043#2': { cls: 'APP WRONG', rowWordsOnly: true, fixed: `${FIXREC}: the formula takes each earner’s own 401(k) off once`,
    was: () => { expect((figureSpec('MK-CF-M-043').formula.match(/401\(k\)/g) ?? []).length).toBe(2); },
    why: 'The row reads "what the year is taxed on falls in once the 401(k)s are out — every source counted, less each earner\'s own 401(k), less the standard deduction": the 401(k) comes off twice in words. The code takes it off once (MK-CF-F-230 taxedAfterPreTax, $150,000 → 22%).',
    fix: 'income-summary.ts MK-CF-M-043 formula: "the published bracket of (every source counted − each earner\'s own 401(k) − the standard deduction), for their filing status". Records only.',
    check: () => { expect(first('SUM', 'MK-CF-M-043')).toBe('22%'); },
    wrong: () => { const f = figureSpec('MK-CF-M-043').formula; expect((f.match(/401\(k\)/g) ?? []).length).toBe(1); } },
  'MK-CF-M-044#8': { cls: 'APP WRONG', fixed: `${FIXMMB}: the lead ruled reading B (2026-10-25, MK-CF-M-033 and MK-CF-M-044 test 8; canon row 25) — with a state rate in it the row is "Calculated tax"`,
    fix: 'MoneyKeel/functions/cashflow/income-summary.ts and src/screens/IncomeSummaryScreen.tsx: with a state rate typed the row reads "Calculated tax" and the line under it names the state rate (canon row 25). Owner: MK-CF-O-004.',
    was: () => { expect(text('ONE_STATE_SUM')).toMatch(/Calculated federal tax .*≈?\$6,399\/year \| Federal income tax, plus the 5\.00% state rate you entered/); },
    wrong: () => { expect(text('ONE_STATE_SUM')).toMatch(/Calculated tax \| assumes you take the standard deduction \| ≈\$6,399\/year \| Federal income tax, plus the 5\.00% state rate you entered/); },
    why: 'With a state rate typed, the Income summary\'s row is still called "Calculated federal tax", while the line under it says "Federal income tax, plus the 5.00% state rate you entered" (DEC-7798, which settled that line only). With a typed payslip rate the row is already "Tax · your rate" — that half of the reviewer\'s point holds.',
    ruling: { readingA: 'The label stays "Calculated federal tax"; the line under it names the state rate (as built, DEC-7798): $6,399/year = federal $4,444 + 5% state on $39,100.',
      readingB: 'With a state rate in it, the label is "Calculated tax" and the line names both — "federal" is not on a figure that is not federal only.',
      recommend: 'B — one word, removes a false word from a tax figure (tenet 1 over tenet 6, where only a lead\'s decision stands). Reverse in one word.' },
    check: () => { expect(text('SUM')).toMatch(/Tax \| your rate, 22\.00%/); } },
  'MK-CF-M-046#8': { cls: 'REVIEWER WRONG',
    why: 'The sentence speaks of a wage — "Social Security takes 6.2% of a wage up to $184,500/year and Medicare 1.45% of all of it (0.9% more above $200,000)" — and $200,000 is the per-wage withholding threshold (IRC §3101(b)(2), §3102(f)), the published figure the row reads back. The household thresholds are a filing matter, as the reviewer\'s own handoff says.',
    check: () => { expect(text('PAY_EST')).toMatch(/Social Security takes 6\.2% of a wage up to \$184,500\/year and Medicare 1\.45% of all of it \(0\.9% more above \$200,000\)/); } },
  'MK-CF-M-060#2': { cls: 'APP WRONG', rowWordsOnly: true, fixed: `${FIXREC}: the row answers "The lowest month-end balance in the twelve months ahead, and which month."`,
    was: () => { expect(figureSpec('MK-CF-M-060').answers).not.toMatch(/month-end/); },
    why: 'The screen\'s words are the approved drawing\'s ("Lowest point $1,800 — Nov." beside a month-end table; bill-calendar_v02, approved as built, DEC-1112), and the formula is the lowest of the twelve month-ends. But the row\'s "answers" says "the lowest the balance falls to" — inside a month it can fall lower (a bill on the 1st, pay on the 30th). The row overclaims, not the screen.',
    fix: 'whats-coming.ts MK-CF-M-060 answers: "The lowest month-end balance in the twelve months ahead, and which month." Records only.',
    check: () => { expect(has('BILLS', 'Lowest point $1,800 — Nov.')).toBe(true); expect(figureSpec('MK-CF-M-060').formula).toMatch(/month-ends/); },
    wrong: () => { expect(figureSpec('MK-CF-M-060').answers).toMatch(/month-end/); } },
  'MK-CF-M-060#7': { cls: 'REVIEWER WRONG', why: 'The screen says so under the table: "A forward plan, not a promise: expenses use your planned amounts, income is after estimated tax…"; COMING UP names its 2-day assumption.',
    check: () => { expect(has('BILLS', /^A forward plan, not a promise/)).toBe(true); expect(has('BILLS', 'Assumes money should be in your account 2 days before the due date.')).toBe(true); } },
  'MK-CF-M-062#4': { fixed: FIXBILLS, cls: 'APP WRONG',
    why: 'As MK-CF-M-016 tenet 4: the undated $1,200 bill is placed on Jan 1 in COMING UP and spread $100 a month in the table — the "set it aside by" line and the End column use two placements.',
    fix: 'whats-coming.ts upcomingBills (MK-CF-F-019): an undated bill is not given Jan 1. Owner: MK-CF-O-008.',
    check: () => { expect(has('UNDATED_BILLS', /Insurance · \$1,200 due Jan 1, 2027/)).toBe(true); },
    wrong: () => { expect(text('UNDATED_BILLS')).not.toMatch(/due Jan 1, 2027/); } },
  'MK-CF-M-063#2': { cls: 'REVIEWER WRONG',
    why: 'The line says "about", names its assumption ("Assumes money should be in your account 2 days before the due date."), and reads the End column beside it — the rule DEC-7936 set ("never better than it is"): Car insurance by Oct 13 → about $8,000 (September\'s End), Property tax by Oct 30 → about $6,600 (October\'s).',
    check: () => { expect(has('BILLS', '✓ Covered — about $8,000 there by Oct 13, 2026.')).toBe(true); expect(has('BILLS', '✓ Covered — about $6,600 there by Oct 30, 2026.')).toBe(true); } },
  'MK-CF-M-063#3': { cls: 'APP WRONG',
    fixed: `${FIXBILLS}; and CF-MMFIX-A, 2026-10-26: with no balance given the verdict above the table is not worked from $0 — it says only the refusal (BillCalendarScreen)`,
    why: 'No account entered, so no balance is known: the row says "nothing is projected", but the calendar starts from "$0" and projects "Short $1,400 — set it aside by Oct 13, 2026, from savings or a backup", "Careful — short in Oct, Nov, …", "Lowest point −$6,200". An unknown balance read as $0, with advice built on it.',
    fix: 'src/screens/BillCalendarScreen.tsx and whats-coming.ts whatsComing: with no balance entered, COMING UP and the verdict are not drawn — "Enter the cash you have now to see whether each bill is covered" (the row\'s refusal). Owner: MK-CF-O-008.',
    check: () => { expect(has('BILLS_NOBAL', /^Short \$1,400 — set it aside by Oct 13, 2026/)).toBe(true); },
    wrong: () => { expect(text('BILLS_NOBAL')).not.toMatch(/Short \$[\d,]+ — set it aside/); expect(text('BILLS_NOBAL')).not.toMatch(/Careful — short/); } },
  'MK-CF-M-066#1': { fixed: FIXTAX, cls: 'APP WRONG',
    why: 'Two ways the trailing twelve months are wrong: a $500 dividend dated 1 Dec 2026, read on 28 Sep 2026, is counted ("$920/year … paid out over the trailing twelve months" — it has not been paid); and a dividend the person logged as reinvested (1.2 VTI at $100) is left out ($420, not $540), though the screen says these are "counted as income you are taxed on" and "normally reinvested". paidOutByAccount has no upper date and skips reinvested records.',
    fix: 'src/domain/income/from-accounts.ts paidOutByAccount (MK-CF-F-184): date ≤ today; a reinvested record counts at shares × price. Owner: MK-CF-O-004 (incomeFromAccounts).',
    check: () => { expect(first('DIV_FUTURE', 'MK-CF-M-066')).toBe('$920'); expect(first('DIV_REINV', 'MK-CF-M-066')).toBe('$420'); },
    wrong: () => { expect(first('DIV_FUTURE', 'MK-CF-M-066')).toBe('$420'); expect(first('DIV_REINV', 'MK-CF-M-066')).toBe('$540'); } },
  'MK-CF-M-066#3': { cls: 'APP WRONG', rowWordsOnly: true, fixed: `${FIXREC}: the refusal reads "No record of any — the figure is not shown, and the box asks “How much, a year”."`,
    was: () => { expect(figureSpec('MK-CF-M-066').refusal).toMatch(/\$0/); },
    why: 'With no records the screen prints no figure at all — the FROM YOUR ACCOUNTS block is not drawn and the person is asked "How much, a year" — so nothing missing is shown as $0. The row\'s refusal says "$0, never an estimate", which the screen never prints. File and code disagree; the screen is the right one.',
    fix: 'income-summary.ts MK-CF-M-066 refusal: "No record of any — the figure is not shown, and the box asks how much a year." Records only.',
    check: () => { expect(printed('DIV_NONE', 'MK-CF-M-066')).toEqual([]); expect(has('DIV_NONE', 'How much, a year')).toBe(true); },
    wrong: () => { expect(figureSpec('MK-CF-M-066').refusal).not.toMatch(/\$0/); } },
  'MK-CF-M-066#4': { cls: 'REVIEWER WRONG',
    why: 'A record and an estimate never share a line: a paid dividend reads "paid out over the trailing twelve months"; a bond\'s coupon reads "4.50% coupon on $25,000 face" (from-accounts.ts); with no record nothing is printed (as tenet 3).',
    check: () => { expect(has('MGR_DIV', 'paid out over the trailing twelve months')).toBe(true); expect(printed('DIV_NONE', 'MK-CF-M-066')).toEqual([]); } },
  'MK-CF-M-076#2': { fixed: FIXINCB, cls: 'APP WRONG',
    why: 'As MK-CF-M-042: "= Gross /year $264,800" over rows that make $195,600; and the rental losing $500 a month gives "= Gross /year $80,400" over a single row of $86,400.',
    fix: 'As MK-CF-M-042 (taxedLines carry every source, signed). Owner: MK-CF-O-004.',
    check: () => { expect(first('LOSS_SUM', 'MK-CF-M-076')).toBe('$80,400'); expect(printed('LOSS_SUM', 'MK-CF-M-042')).toEqual(['$86,400']); },
    wrong: () => { expect(printed('LOSS_SUM', 'MK-CF-M-042').map(dollars).reduce((t, v) => t + v, 0)).toBe(80400); } },
  'MK-CF-M-077#4': { cls: 'REVIEWER WRONG',
    why: 'This figure counts each earner\'s paid months: the July-to-December worker reads "Your 401(k)s −$6,000" (6 × $1,000), from MK-CF-F-206. The ×12 the reviewer read is MK-CF-F-188\'s, a different reader (see MK-CF-M-041 tenet 4 and MK-CF-M-034).',
    check: () => { expect(first('PARTK_SUM', 'MK-CF-M-077')).toBe('$6,000'); } },
};

// ── TENET 5: the FAILs where the person's word is NOT kept (each with its witness); the rest are EVIDENCE GAPs ─────
const T5: Record<string, Item> = {
  'MK-CF-M-007#5': { cls: 'APP WRONG',
    why: 'A self-employment figure typed on its question without touching "Per month" (the default the question shows, modules.tsx:500 — seFreq is then not stored): THIS MONTH counts $2,000 a month ($9,200), while YOUR SOURCES says "Self-employment · net · yearly · $2,000". The row reads anything not "monthly" as yearly; every calculator reads anything not "annual" as monthly.',
    fix: 'src/screens/CashFlowScreen.tsx IncomeTab and income-summary.ts incomeSources: read the period as the calculators do (`seFreq === \'annual\'` is yearly, otherwise monthly). Owner: MK-CF-O-004.',
    check: () => { expect(first('SE_DEFAULT_TAB', 'MK-CF-M-047')).toBe('$9,200'); },
    wrong: () => { expect(text('SE_DEFAULT_TAB')).toMatch(/Self-employment \| net · monthly/); },
    fixed: `${FIXMMA}: YOUR SOURCES reads "Self-employment · net · monthly · $2,000", the period the calculators read`,
    was: () => { expect(text('SE_DEFAULT_TAB')).toMatch(/Self-employment \| net · yearly/); } },
  'MK-CF-M-009#5': { fixed: FIXINCB, cls: 'APP WRONG', why: 'The grants the person dated (75 shares in March 2026, 25 in March 2027) are replaced by a rule — the average, $20,000/year — on the Income tab. As tenet 1.',
    fix: 'As MK-CF-M-009 tenet 1.', check: () => { expect(printed('GRANTS_TAB', 'MK-CF-M-009')).toContain('$20,000'); },
    wrong: () => { expect(printed('GRANTS_TAB', 'MK-CF-M-009')).toContain('$30,000'); } },
  'MK-CF-M-010#5': { fixed: `${FLIGHT}: the Income tab lists "Rental income · 1 property · −$500"`, cls: 'APP WRONG', why: 'The rental the person entered (−$500 net) is dropped from the Income tab by a rule (only above $0). As tenet 1.', fix: RENT_LOSS_FIX,
    check: () => { expect(has('LOSS_TAB', /^Rental (property|income)$/)).toBe(false); }, wrong: () => { expect(has('LOSS_TAB', /^Rental (property|income)$/)).toBe(true); } },
  'MK-CF-M-011#5': { cls: 'APP WRONG',
    why: 'The $2,900 the person typed in the Plan as "Social Security (your estimate from ssa.gov)" is listed on the Income tab as "Social Security · pension — guaranteed income $2,900/month": their word (an estimate for later) outranked by the row\'s guess (received now).',
    fix: 'As MK-CF-M-011 tenet 4.', check: () => { expect(has('WSS_TAB', 'Social Security · pension')).toBe(true); },
    wrong: () => { expect(has('WSS_TAB', 'Social Security · pension')).toBe(false); },
    fixed: `${FIXMMA}: the Plan's ssa.gov estimate, not yet received, is not listed as guaranteed income on the Income tab` },
  'MK-CF-M-024#5': { fixed: FIXMMB, cls: 'APP WRONG',
    why: 'Your monthly income opens a Plan-step Social Security estimate with "I receive it" chosen (MonthlyIncomeScreen.tsx: `num(op.ri_ss) > 0 || …`), so pressing Save with nothing changed writes "receiving" and adds retirement income to the sources — This month then counts the $2,900 as this month\'s income. Choosing "Not yet" erases the $2,900 estimate (ri_ss saved as \'\').',
    fix: 'src/screens/MonthlyIncomeScreen.tsx: open on what was stored (ri_ss_receiving, else "Not yet" for an estimate with no receiving answer); "Not yet" keeps the amount as the estimate. Owner: the Monthly income screen (MK-CF-O-004 reads it).',
    check: () => { const op = saveMonthlyIncome(WORKER_SS); expect(op.incomeSources).toContain('retirement_income'); expect(op.ri_ss_receiving).toBe('yes'); },
    wrong: () => { const op = saveMonthlyIncome(WORKER_SS); expect(op.incomeSources).not.toContain('retirement_income'); const op2 = saveMonthlyIncome(WORKER_SS, 'Not yet'); expect(op2.ri_ss).toBe('2900'); } },
  'MK-CF-M-027#5': { fixed: FIXINCB, cls: 'APP WRONG', why: 'The rental entered with a loss is listed as not entered ("Rent from a property" under ANYTHING ELSE?). As tenet 1.', fix: RENT_LOSS_FIX,
    check: () => { expect(has('LOSS_MGR', 'Rent from a property')).toBe(true); }, wrong: () => { expect(has('LOSS_MGR', 'Rent from a property')).toBe(false); } },
  'MK-CF-M-030#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('Your base pay shows the $5,000 under "Gross pay each month" and "Gross /year $60,000"'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_PAY', 'MK-CF-M-030')).toBe('$60,000'); }, wrong: OLD('PAY', 'MK-CF-M-030') },
  'MK-CF-M-031#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('Your base pay reads "≈$4,582/month" calculated, with "Calculated federal tax ≈$418/month"'), fix: OLD_FIX,
    check: () => { expect(printed('OLD_CLOUD_PAY', 'MK-CF-M-031')).toContain('$4,582/month'); }, wrong: OLD('PAY', 'MK-CF-M-031') },
  'MK-CF-M-033#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('a "Calculated federal tax ≈$418/month" row appears on a take-home the person typed'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_PAY', 'MK-CF-M-033')).toBe('$418/month'); }, wrong: OLD('PAY', 'MK-CF-M-033') },
  'MK-CF-M-035#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('the card warns "The take-home above is higher than it will really be, by roughly $383/month" over a take-home the person typed'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_PAY', 'MK-CF-M-035')).toBe('$383'); }, wrong: OLD('PAY', 'MK-CF-M-035') },
  'MK-CF-M-037#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('the Income summary reads "TAKE-HOME EACH MONTH $4,582"'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_SUM', 'MK-CF-M-037')).toBe('$4,582'); }, wrong: OLD('SUM', 'MK-CF-M-037') },
  'MK-CF-M-038#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('the pay row reads $4,582'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_SUM', 'MK-CF-M-038')).toBe('$4,582'); }, wrong: OLD('SUM', 'MK-CF-M-038') },
  'MK-CF-M-041#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('"What it is taxed on" is $60,000 — the take-home ×12'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_SUM', 'MK-CF-M-041')).toBe('$60,000'); }, wrong: OLD('SUM', 'MK-CF-M-041') },
  'MK-CF-M-042#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('"Your gross $60,000" — the typed take-home ×12 shown as the gross'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_SUM', 'MK-CF-M-042')).toBe('$60,000'); }, wrong: OLD('SUM', 'MK-CF-M-042') },
  'MK-CF-M-044#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('"Calculated federal tax ≈$5,020/year" on the typed take-home'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_SUM', 'MK-CF-M-044')).toBe('$5,020/year'); }, wrong: OLD('SUM', 'MK-CF-M-044') },
  'MK-CF-M-047#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('the Income tab\'s THIS MONTH reads "≈$4,582 expected take-home" above the source row "take-home · monthly $5,000"'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_TAB', 'MK-CF-M-047')).toBe('$4,582'); }, wrong: OLD('TAB', 'MK-CF-M-047') },
  'MK-CF-M-051#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('Home\'s box reads "Income $4,582"'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_HOME', 'MK-CF-M-051')).toBe('$4,582'); }, wrong: OLD('HOME', 'MK-CF-M-051') },
  'MK-CF-M-053#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('Home\'s box reads "Left $4,582"'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_HOME', 'MK-CF-M-053')).toBe('$4,582'); }, wrong: OLD('HOME', 'MK-CF-M-053') },
  'MK-CF-M-076#5': { fixed: `${FLIGHT}: useStore.ts loadFromCloud converts the take-home typed the old way: $5,000 on every screen, "The take-home is what you entered; the gross was worked back from it."`, cls: 'APP WRONG', why: OLD_WHY('"= Gross /year $60,000"'), fix: OLD_FIX,
    check: () => { expect(first('OLD_CLOUD_SUM', 'MK-CF-M-076')).toBe('$60,000'); }, wrong: OLD('SUM', 'MK-CF-M-076') },
  'MK-CF-M-066#5': { fixed: FIXTAX, cls: 'APP WRONG', why: 'A dividend the person logged as reinvested (1.2 VTI at $100) is left out of "FROM YOUR ACCOUNTS" ($420, not $540) by a rule. As tenet 1.',
    fix: 'As MK-CF-M-066 tenet 1.', check: () => { expect(first('DIV_REINV', 'MK-CF-M-066')).toBe('$420'); }, wrong: () => { expect(first('DIV_REINV', 'MK-CF-M-066')).toBe('$540'); } },
  'MK-CF-M-069#5': { fixed: FIXMMB, cls: 'APP WRONG', why: 'As MK-CF-M-024 tenet 5: Your monthly income opens a Plan estimate as "I receive it" (and "Your guaranteed income $2,900/month"); Save with no change makes it received income; "Not yet" erases it.',
    fix: 'As MK-CF-M-024 tenet 5.', check: () => { expect(saveMonthlyIncome(WORKER_SS).ri_ss_receiving).toBe('yes'); },
    wrong: () => { expect(saveMonthlyIncome(WORKER_SS).ri_ss_receiving).not.toBe('yes'); expect(saveMonthlyIncome(WORKER_SS, 'Not yet').ri_ss).toBe('2900'); } },
  'MK-CF-M-073#5': { fixed: `${FIXMONTH}: the payoff plan pays the payment set, never less than its minimum (payoffPlan MK-CF-F-034, his DEC-0641) — "$550 /month total", Jun 2031, $7,647`, cls: 'APP WRONG', why: 'The $300 a month the person chose for the card is not what the payoff plan pays: "$450 /month total", debt-free Oct 2033 — the minimums. As tenet 1.',
    fix: 'As MK-CF-M-073 tenet 1.', check: () => { expect(first('ABOVEMIN', 'MK-CF-M-072')).toBe('$450'); }, wrong: () => { expect(first('ABOVEMIN', 'MK-CF-M-072')).toBe('$550'); } },
};
const BILL_RULING = { readingA: 'The cash on hand typed on the bill calendar is a what-if for this visit (as built — screen state only; leaving the screen brings back the auto-fill).',
  readingB: 'It is the person\'s figure: kept with its date and shown as "you entered $12,000 on Oct 3" until they change it or a newer balance syncs.',
  recommend: 'B — tenet 5; the screen calls it "the starting balance the table carries forward", which reads as kept. Reverse in one word.' };
/** The bill calendar opened, a cash on hand typed, the screen left and opened again: what the box holds, and whether it says
 *  the figure is the person's own (the lead's ruling, reading B, 2026-10-25). */
function typedStartKept(): { value: string; said: boolean } {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, ...H_BILL } as any);
  const B = SCREENS.bills();
  const r1 = render(<B />); fireEvent.changeText(screen.getByLabelText('Cash on hand now, editable'), '12000'); r1.unmount();
  const r2 = render(<B />);
  const value = String(screen.getByLabelText('Cash on hand now, editable').props.value);
  const said = readLines().some((l) => /^You entered this on /.test(l));
  r2.unmount();
  return { value, said };
}
for (const id of ['MK-CF-M-060', 'MK-CF-M-061', 'MK-CF-M-062', 'MK-CF-M-063']) {
  // RULED by the lead on 2026-10-25 (reading B — "bill-calendar cash on hand kept with its date") and built by CF-MMFIX-A
  // (store.billCalendarStart); re-measured by FIX-BUDGET, 2026-10-26: the reviewer's FAIL stood under that ruling, so the class
  // is APP WRONG, fixed — the right answer passes and the committed source (a box on the screen only) is pinned
  T5[`${id}#5`] = { cls: 'APP WRONG', ruling: BILL_RULING,
    why: 'Opening the calendar changes nothing entered, and the figures chain from the balance. But a balance the person typed ("Edit it and the End column recalculates") lived only while the screen was open: leave and come back and the auto-fill was back. The lead ruled reading B on 2026-10-25: it is the person\'s figure, kept with its date.',
    fix: 'src/screens/BillCalendarScreen.tsx and src/store/useStore.ts billCalendarStart: a typed cash on hand is kept with its day and the box says "You entered this on <day>; your accounts hold $X". Owner: the bill calendar (MK-CF-O-008 reads it).',
    check: () => { holds5(id); },
    // the box prints its figure as money since 2026-10-27 (every money box is a MoneyBox, DEC-8385); the kept 12000 is the same figure
    wrong: () => { const k = typedStartKept(); expect(k.value).toBe('$12,000'); expect(k.said).toBe(true); },
    fixed: `${FIXMMA}: a cash on hand typed on the bill calendar is kept with its day — opened again it reads 12000 and "You entered this on …"`,
    was: () => { expect(src('src/screens/BillCalendarScreen.tsx')).toMatch(/const \[startStr, setStartStr\] = useState\(/); } };
}

// ── TENET 6: the FAILs where the figure's words or value differ from its latest drawing; the rest are EVIDENCE GAPs ──
const RETIRED_T6: Item = { cls: 'APP WRONG', records: true, why: `Not a gap the package could close: ${RETIRED}. Tenet 6 needs an approved drawing to hold this to; there is none.`,
  fix: 'Draw the retired This month (the paycheck card, the pace line, the draw order and its Why? sheet, the twelve bars) in MoneyKeel/documents/cashflow/, put it to him, and add its row to the design record. Records / design.',
  wrong: () => { expect(src('MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md')).toMatch(/retired (lens|This month)[^|]*APPROVED/i); } };
const T6: Record<string, Item> = {
  'MK-CF-M-012#6': { cls: 'NEEDS A RULING', mmcf: 'CF-08',
    why: 'Each received line prints "+$3,600.00"; the drawing (frame 5) prints whole dollars ("+$3,100"). His precision standard (Q49, DEC-0264) says two decimals for an expense or a payment; his later drawing draws none. Two of his decisions disagree and no dated row reconciles them.',
    ruling: { readingA: 'Two decimals (the precision standard, his Q49) — and a dated READ THIS FIRST row on the drawing.', readingB: 'Whole dollars, as the newer drawing draws them (his "newest approval wins", 2026-09-27).',
      recommend: 'A: the standard is a standing order for every screen, and a $186.40 grocery bill would otherwise read $186; record it on the drawing. Reverse in one word.' },
    check: () => { expect(printed('CF_INC', 'MK-CF-M-012')).toContain('$3,600.00'); } },
  'MK-CF-M-014#6': { cls: 'NEEDS A RULING', mmcf: 'CF-08', why: 'Each expense prints "$186.00"; the drawing (frame C) "$100". As MK-CF-M-012 tenet 6: his precision standard against his later drawing.',
    ruling: { readingA: 'Two decimals (Q49) with a dated row on the drawing.', readingB: 'Whole dollars, as drawn.', recommend: 'A, as MK-CF-M-012.' },
    check: () => { expect(printed('CF_EXP', 'MK-CF-M-014')).toContain('$186.00'); } },
  'MK-CF-M-015#6': { was: () => { expect(text('CF_EXP')).toMatch(/PLANNED EXPENSES \| \$3,400 \| Bills & fixed \| \$2,300 \| Everyday expenses \| \$1,100/); }, fixed: `${FLIGHT}: PLANNED EXPENSES lists Rent / Mortgage $2,300 · Groceries $700 · Eating out $400`, cls: 'APP WRONG', mmcf: 'CF-09',
    why: 'The drawing lists the budget\'s categories under PLANNED EXPENSES (frame C: Gas $200 · Grocery $900 · Utilities $200 · Other $700) and the figure is declared "each category"; the screen lists the groups ("Bills & fixed $2,300 · Everyday expenses $1,100" for a budget of Rent $2,300, Groceries $700, Eating out $400).',
    fix: 'MoneyKeel/functions/cashflow/the-month.ts plannedByCategory: one row per category entered. Owner: MK-CF-O-010 theMonth (CF-MMFIX had this in progress in the working tree, spendByMonthByCategory).',
    // since FIX-MONTH, 2026-10-25 the Rent / Mortgage line is the mortgage's and stands down, said under the band ($3,400 before)
    check: () => { expect(printed('CF_EXP', 'MK-CF-M-001')[0]).toBe('$1,100'); },
    wrong: () => { expect(text('CF_EXP')).toMatch(/PLANNED EXPENSES \| \$1,100 \| Your Rent \/ Mortgage budget line is not counted here: your mortgage, Mortgage, is in Debts and is counted from there\. Place it on your home in Net worth, so we know they are the same\. \| Groceries \| \$700 \| Eating out \| \$400/); } },
  'MK-CF-M-033#6': { was: () => { expect(text('PAY')).toMatch(/Calculated federal tax \| assumes you take the standard deduction/); }, fixed: `${FLIGHT}: with a typed rate the row reads "Tax · your rate, 22% · $3,102/month"`, cls: 'APP WRONG', mmcf: 'IN-03',
    why: 'With their own rate typed, the drawing (v07 phone 3) draws "= Take-home $8,740/month" with no "Calculated federal tax" row; the screen adds "Calculated federal tax — assumes you take the standard deduction" at their rate × the gross (here 22% × $14,100 = ≈$3,102/month). A row the drawing does not draw, saying something untrue.',
    fix: 'src/screens/BasePayScreen.tsx: with a typed rate, no calculated-tax row (or "Tax · your rate, 22%", the Income summary\'s words). Owner: MK-CF-O-001.',
    check: () => { expect(first('PAY', 'MK-CF-M-031')).toMatch(/\$9,398\/month/); },
    wrong: () => { expect(text('PAY')).not.toMatch(/Calculated federal tax \| assumes you take the standard deduction/); } },
  'MK-CF-M-036#6': { cls: 'APP WRONG', records: true, mmcf: 'IN-01', fixed: `${FIXREC}: the drawing's READ THIS FIRST row of 2026-10-25 carries "$2,000/month · 17%" (written &#183;, read here as the person reads it); its row of 2026-10-26 writes the share to two decimals, 17.39% (2,000 ÷ 11,500 = 0.173913), as the screen prints it`,
    was: () => { expect(drawn(MOCK.income)).not.toMatch(/\$2,000\/month · 17%/); },
    why: 'The drawing (v07 phone 2) prints "Everything else taken out $4,700/month · 24%" for $11,500 gross, $8,300 landing and $1,200 of 401(k)s; its own rule 8e gives $11,500 − $8,300 − $1,200 = $2,000 (17%), which the screen prints. The drawing is wrong and carries no dated correction line.',
    fix: 'moneykeel_pres_mock_income-end-to-end_v07.html: a READ THIS FIRST row — phone 2 reads "$2,000/month · 17%". Records only (the drawing).',
    check: () => { expect(11500 - 8300 - 1200).toBe(2000); expect(Math.round((2000 / 11500) * 100)).toBe(17); },
    wrong: () => { expect(drawn(MOCK.income)).toMatch(/\$2,000\/month · 17%/); } },
  'MK-CF-M-039#6': { was: () => { expect(src(MOCK.income)).not.toMatch(/\$18,620/); }, fixed: `${FLIGHT}: the drawing carries $18,620`, cls: 'APP WRONG', records: true, mmcf: 'IN-10',
    why: 'The drawing (v07 phones 9 and 16) prints "December · bonus, after tax $18,860" — the $12,000 bonus at 22%; the household\'s own rate is 24% and the screen prints $9,500 + $12,000 × 0.76 = $18,620. The drawing is wrong, with no correction line.',
    fix: 'income-end-to-end_v07: a READ THIS FIRST row — "$18,620". Records only.',
    check: () => { expect(9500 + 12000 * 0.76).toBe(18620); }, wrong: () => { expect(src(MOCK.income)).toMatch(/\$18,620/); } },
  'MK-CF-M-047#6': { was: () => { expect(after('WSS_TAB', 'THIS MONTH')).toBe('$6,976'); }, fixed: `${FLIGHT}: THIS MONTH reads "≈$6,976"`, cls: 'APP WRONG', mmcf: 'CF-24',
    why: 'A calculated take-home ($8,000 gross, no rate) printed "$6,976" with no ≈ as the Income tab\'s THIS MONTH, while its own source line and Your base pay print "≈$6,976" — the drawing\'s rule 9: every estimate wears ≈ (row 2026-10-24: one figure, one form).',
    fix: 'src/screens/CashFlowScreen.tsx IncomeTab hero and the This month inflow row: ≈ on a calculated take-home (incomeSummary\'s flag). Owner: MK-CF-O-003 (CF-MMFIX had it in progress).',
    check: () => { expect(text('WSS_TAB')).toMatch(/≈ ?\$6,976\/month take-home/); },
    wrong: () => { expect(after('WSS_TAB', 'THIS MONTH')).toBe('≈$6,976'); } },
  'MK-CF-M-052#6': { cls: 'APP WRONG', mmcf: 'HM-02',
    why: 'His row on the Home box (ways-to-add v10, 2026-10-23) says it shows once anything is added. A person whose first act is to log two expenses saw the first-day doors and no box — Home\'s gate ignored expenses.',
    fix: 'src/screens/HomeScreen.tsx hasMoneyData: an expense or an income logged is data (CF-MMFIX had it in progress).',
    check: () => { expect(L('EXP_ONLY_HOME').length).toBeGreaterThan(3); },
    wrong: () => { expect(has('EXP_ONLY_HOME', 'THIS MONTH’S CASH FLOW')).toBe(true); },
    fixed: `${FIXMMA}: two expenses logged and nothing else bring the box — "Outflow (expenses + debt) $2,812"`,
    was: () => { expect(has('EXP_ONLY_HOME', 'THIS MONTH’S CASH FLOW')).toBe(false); } },
  'MK-CF-M-060#6': { cls: 'APP WRONG', mmcf: 'BC-02',
    why: 'On a first day with nothing entered the calendar reads "OK — you stay above zero in all 12 months · Lowest point $0", as the drawing draws it: a verdict on nothing. Tenet 3 outranks tenet 6, so the drawing needs its correction too.',
    fix: 'BillCalendarScreen.tsx and the drawing\'s READ THIS FIRST row: with nothing entered, no verdict — "Nothing entered yet" and the doors (Q48). Owner: MK-CF-O-008.',
    check: () => { expect(L('BILLS_EMPTY').length).toBeGreaterThan(5); },
    wrong: () => { expect(text('BILLS_EMPTY')).not.toMatch(/you stay above zero in all 12 months/); },
    fixed: `${FIXMMA}: with nothing entered there is no verdict — the table says "Nothing entered yet. Add your bills ›"`,
    was: () => { expect(text('BILLS_EMPTY')).toMatch(/you stay above zero in all 12 months/); } },
  'MK-CF-M-069#6': { was: () => { expect(src('src/screens/MonthlyIncomeScreen.tsx')).toMatch(/placeholder="2,600"/); }, fixed: `${FLIGHT}: the boxes\' placeholders read "—"`, cls: 'APP WRONG', mmcf: 'MI-01',
    why: 'The drawing (monthly-income_v02) draws no sample amounts; the build\'s boxes carried grey "2,600", "1,600", "3" as placeholders — defaults that look like answers (tenet 3).',
    fix: 'src/screens/MonthlyIncomeScreen.tsx placeholders: "—" (CF-MMFIX had it in progress).',
    check: () => { expect(has('MONTHLY', 'Your guaranteed income')).toBe(true); },
    wrong: () => { const s = src('src/screens/MonthlyIncomeScreen.tsx'); expect(s).not.toMatch(/placeholder="2,600"/); expect(s).not.toMatch(/placeholder="1,600"/); } },
  'MK-CF-M-071#6': { fixed: `${FLIGHT}: the drawing carries "$410/month in payments"`, was: () => { expect(src(MOCK.cf)).not.toMatch(/\$410\/month in payments/); }, cls: 'APP WRONG', records: true, mmcf: 'CF-04',
    why: 'Frame F prints "across 2 debts · $310/month in payments" for a $110 Visa minimum and a $300 car loan; the screen prints $410 — the drawing\'s sum is wrong and carries no dated correction line.',
    fix: 'cash-flow_v01: a READ THIS FIRST row — "$410/month in payments". Records only (the drawing).',
    check: () => { expect(text('FRAME_F')).toMatch(/across 2 debts · \$410\/month in payments/); }, wrong: () => { expect(src(MOCK.cf)).toMatch(/\$410\/month in payments/); } },
  'MK-CF-M-073#6': { was: () => { expect(text('CF_DEBT')).toMatch(/·\$/); }, fixed: `${FLIGHT}: the row reads "· $200/month min" and the costliest carries no years`, cls: 'APP WRONG', mmcf: 'CF-05, CF-06',
    why: 'The drawing writes "6.40% · 3 years left" and "22.90% — the costliest"; the screen wrote "·$300/month min" with no space after the dot and added "· 3 years left" to the costliest.',
    fix: 'src/screens/BudgetScreen.tsx Debts row (CF-MMFIX had it in progress).',
    check: () => { expect(has('CF_DEBT', /\$200\/month min/)).toBe(true); },
    wrong: () => { expect(text('CF_DEBT')).not.toMatch(/·\$/); expect(text('CF_DEBT')).not.toMatch(/the costliest · \d+ years? left/); } },
  'MK-CF-M-075#6': { was: () => { expect(src('src/screens/BudgetScreen.tsx')).not.toMatch(/debtProgress\.share \* 100/); }, fixed: `${FLIGHT}: the PROGRESS bar is built, filled to the share`, cls: 'APP WRONG', mmcf: 'CF-03',
    why: 'Frame 6 draws a PROGRESS bar filled to the share paid down; the screen built the sentence only.',
    fix: 'src/screens/BudgetScreen.tsx PROGRESS: the bar, filled to MK-CF-M-075 (CF-MMFIX had it in progress).',
    check: () => { expect(first('CF_DEBT', 'MK-CF-M-075')).toBe('15%'); },
    wrong: () => { expect(src('src/screens/BudgetScreen.tsx')).toMatch(/debtProgress\.share \* 100/); } },
  'MK-CF-M-070#6': { ...RETIRED_T6, check: () => { expect(has('DRAW', 'Why this order?')).toBe(true); } },
  // the card's words moved (CF-MMFIX-A, 2026-10-25) and it still has no approved drawing: what it shows now passes, the committed
  // words are pinned, the right answer (a drawing on record) stays test.failing (re-measured by FIX-BUDGET, 2026-10-26)
  'MK-CF-M-078#6': { ...RETIRED_T6, check: () => { expect(has('RET', 'SURPLUS — OCT')).toBe(true); },
    moved: { seen: `${FIXMMA}: the card reads "YOUR PAYCHECK — OCT"; the retired This month still has no approved drawing`, now: () => { expect(has('RET', 'YOUR PAYCHECK — OCT')).toBe(true); } } },
  'MK-CF-M-024#6': { ...RETIRED_T6, check: () => { expect(R('RET_PENSION').printed.some((p) => p.id === 'MK-CF-M-024')).toBe(true); } },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Row = { figure: string; tenet: number; verdict: 'PASS' | 'FAIL'; why: string; finding_kind: string; part: '18' | '19' };
const ROWS: Row[] = (['18', '19'] as const).flatMap((p) => PART[p].screen_checks.map((r: any) => ({ ...r, part: p })));
const keyOf = (r: Row) => `${r.figure}#${r.tenet}`;
function classOf(r: Row): Item | null {
  if (r.verdict === 'PASS') return null;
  const k = keyOf(r);
  if (CLASS[k]) return CLASS[k];
  if (r.tenet === 5) return T5[k] ?? gap5(r.figure);
  if (r.tenet === 6) return T6[k] ?? gap6(r.figure);
  throw new Error(`${k}: a FAIL the reviewer gave has no classification`);
}

describe('the package, read — a guard must prove it looked', () => {
  test('536 screen checks (328 + 208): 67 figures × 8 tenets; 197 FAILs (120 + 77); every FAIL classified; every class names a FAIL', () => {
    expect(PART['18'].screen_checks).toHaveLength(328); expect(PART['19'].screen_checks).toHaveLength(208);
    const figs = [...new Set(ROWS.map((r) => r.figure))];
    expect(figs).toHaveLength(67);
    for (const f of figs) expect(FIGS[f]).toBeDefined();
    expect(Object.keys(FIGS)).toHaveLength(67);
    const fails = ROWS.filter((r) => r.verdict === 'FAIL');
    expect(fails).toHaveLength(197);
    expect(fails.filter((r) => r.part === '18')).toHaveLength(120);
    expect(fails.filter((r) => r.finding_kind === 'evidence_gap')).toHaveLength(134);
    for (const r of fails) expect(classOf(r)).not.toBeNull();
    for (const k of [...Object.keys(CLASS), ...Object.keys(T5), ...Object.keys(T6)]) expect(fails.some((r) => keyOf(r) === k)).toBe(true);
    for (const r of fails.filter((x) => x.finding_kind !== 'evidence_gap')) expect(CLASS[keyOf(r)]).toBeDefined();
  });
  test('every APP WRONG says what is wrong and how to fix it, with a check of the right answer; every NEEDS A RULING has its readings', () => {
    for (const [k, o] of Object.entries({ ...CLASS, ...T5, ...T6 })) {
      expect(o.why.length).toBeGreaterThan(60);
      if (o.cls === 'APP WRONG') { expect(o.fix?.length ?? 0).toBeGreaterThan(20); expect(typeof o.wrong).toBe('function'); }
      if (o.cls === 'NEEDS A RULING') expect(o.ruling?.recommend.length ?? 0).toBeGreaterThan(10);
      if (!o.check && !o.wrong) throw new Error(`${k}: no check at all`);
    }
  });
});

/** Run an item's tests: what holds and the right answer (test.failing) — or, where work landing now changed it, the
 *  right answer as a passing test beside the committed answer pinned (`fixed`), or what it shows now (`moved`). */
function runItem(name: string, c: { check?: () => void; wrong?: () => void; was?: () => void; fixed?: string; moved?: { seen: string; now: () => void } }): string[] {
  const t: string[] = [];
  if (c.fixed) {
    if (c.wrong) { test(`${name} · the right answer — FIXED IN FLIGHT (uncommitted)`, c.wrong); t.push(`${name} · the right answer — FIXED IN FLIGHT (uncommitted)`); }
    if (c.was) { test.failing(`${name} · the committed answer (b1c659e8), pinned (test.failing)`, c.was); t.push(`${name} · the committed answer (b1c659e8), pinned (test.failing)`); }
    if (c.was && c.check) { test(`${name} · what holds`, c.check); t.push(`${name} · what holds`); }
    if (!c.was && c.check) { test.failing(`${name} · the committed answer (b1c659e8), pinned (test.failing)`, c.check); t.push(`${name} · the committed answer (b1c659e8), pinned (test.failing)`); }
    return t;
  }
  if (c.moved) {
    test(`${name} · IN FLIGHT — neither answer: what it shows now`, c.moved.now); t.push(`${name} · IN FLIGHT — neither answer: what it shows now`);
    if (c.check) { test.failing(`${name} · the committed answer (b1c659e8), pinned (test.failing)`, c.check); t.push(`${name} · the committed answer (b1c659e8), pinned (test.failing)`); }
    if (c.wrong) { test.failing(`${name} · the right answer (test.failing)`, c.wrong); t.push(`${name} · the right answer (test.failing)`); }
    return t;
  }
  if (c.check) { test(`${name} · what holds`, c.check); t.push(`${name} · what holds`); }
  if (c.wrong) { test.failing(`${name} · the right answer (test.failing)`, c.wrong); t.push(`${name} · the right answer (test.failing)`); }
  return t;
}
const flightOf = (c: { fixed?: string; moved?: { seen: string } }) => (c.fixed ? `FIXED IN FLIGHT — ${c.fixed}` : c.moved ? `MOVED IN FLIGHT — ${c.moved.seen}` : null);

const RESULTS: any[] = [];
const BY_FIGURE = new Map<string, Row[]>();
for (const r of ROWS) BY_FIGURE.set(r.figure, [...(BY_FIGURE.get(r.figure) ?? []), r]);
/** a figure the register has retired since the package was sent keeps its rows here, named as retired (MK-CF-M-071, RETIRED
 *  2026-10-26 by PF-TOOLS: the Debts tab's "in payments" is MK-NW-M-012 since CF-MMFIX-A, and nothing prints the minimums' sum) */
const RETIRED_FIGURES: Record<string, string> = { 'MK-CF-M-071': 'RETIRED 2026-10-26 (PF-TOOLS) — its line prints under MK-NW-M-012' };
const labelOf = (id: string) => RETIRED_FIGURES[id] ?? figureSpec(id).label;
for (const [figure, rows] of BY_FIGURE) {
  describe(`${figure} ${labelOf(figure)}`, () => {
    test('its screen prints it under its identifier (the PASSes are not re-measured)', () => traced(figure));
    const moved = FIGS[figure].nowAs;
    if (moved) test.failing(`its screen prints it under ${figure} — the committed trace (b1c659e8), pinned (test.failing); now: ${moved.seen}`,
      () => { expect(R(FIGS[figure].main).printed.some((p) => p.id === figure)).toBe(true); });
    for (const r of rows) {
      const c = classOf(r);
      if (!c) { RESULTS.push({ part: r.part, figure, tenet: r.tenet, reviewer_verdict: 'PASS', reviewer_kind: r.finding_kind, classification: 'PASS — not re-measured' }); continue; }
      const name = `T${r.tenet} · reviewer FAIL (${r.finding_kind}) · ${c.cls}${c.rowWordsOnly ? ' (row words)' : ''}${c.records ? ' (records)' : ''}`;
      RESULTS.push({ part: r.part, figure, tenet: r.tenet, reviewer_verdict: 'FAIL', reviewer_kind: r.finding_kind, reviewer_why: r.why, classification: c.cls,
        row_words_only: !!c.rowWordsOnly, records_only: !!c.records, mmcf: c.mmcf ?? null, why: c.why, fix: c.fix ?? null, ruling: c.ruling ?? null,
        committed_b1c659e8: c.wrong ? 'the committed answer holds; the right answer does not (run in a clean worktree of b1c659e8)' : 'holds (run in a clean worktree of b1c659e8)',
        working_tree: flightOf(c) ?? 'unchanged', tests: runItem(name, c) });
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RULE VERDICTS THE REVIEWER GAVE AS NOT HELD (40 of 164) — each checked against the code
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type RuleItem = Item & { claim: string };
const RULE_GROUPS: Record<string, RuleItem> = {
  YEARLESS: { fixed: FIXINCB, claim: 'Dated months are kept, but a vest or a one-time income with no year loses it', cls: 'APP WRONG',
    why: 'Wage tables keep their year-months (held). A grant row left without a vest date (the date box is free text, modules.tsx RsuEditor) is put in "this year" every year: the Income summary\'s standout month reads the same vest in 2026 and again in 2027. A one-time $2,000 gift with neither month nor year tapped lands in January 2027 and is still listed in September 2027 as "one-time · lands in January".',
    fix: 'src/domain/income/onboarding.ts rowVestYear (MK-CF-F-063): no date is not this year — the row is "date not entered" and is left out of every month until dated; extraIncome (MK-CF-F-071) and the one-time question: a one-time with no year is asked for its year, never counted in every year. Owner: MK-CF-O-004.',
    check: () => { expect(rowVestYear({})).toBe(new Date().getFullYear()); expect(first('DATELESS_26', 'MK-CF-M-039')).toBe(first('DATELESS_27', 'MK-CF-M-039')); expect(text('ONETIME_SEP27')).toMatch(/one-time · lands in January/); },
    // FIXED 2026-10-25 (FIX-INCOME-B): no date is no year ("vest date not entered"), and the yearless gift is listed as entered, its
    // year not entered — never "lands in January" again each year (tenet 3: what is entered is shown, and what is missing is said)
    wrong: () => { expect(rowVestYear({})).toBeNull(); expect(printed('DATELESS_27', 'MK-CF-M-039')).toEqual([]);
      expect(text('ONETIME_SEP27')).toMatch(/Gift \| one-time · year not entered/); expect(text('ONETIME_SEP27')).not.toMatch(/lands in January/); } },
  TWO_EARNERS: { claim: 'Two earners are read, but partial-year contributions diverge (and annualOfSource repeats the household salary)', cls: 'APP WRONG',
    why: 'Both earners are captured and summed (held: $169,200 = $109,200 + $60,000). The annualOfSource clause is reviewer-wrong: annualOfSource (MK-CF-F-210, retired 2026-10-25) had no caller. The partial-year clause is right: for a worker paid six months, Base pay subtracts twelve months of 401(k) ($12,000 — its band base $63,000 on $75,000) while the Income summary subtracts six ($69,000): Base pay "12%", the Income summary "22%".',
    fix: PART_FIX,
    check: () => { expect(first('PAY', 'MK-CF-M-030')).toBe('$169,200/year'); expect(first('PARTB_PAY', 'MK-CF-M-032')).toBe('12%'); expect(first('PARTB_SUM', 'MK-CF-M-043')).toBe('22%'); },
    wrong: () => { expect(first('PARTB_PAY', 'MK-CF-M-032')).toBe('22%'); expect(first('PARTB_PAY', 'MK-CF-M-030')).toBe('$75,000'); },
    fixed: FIXINCA },
  REINVESTED: { fixed: FIXTAX, claim: 'The month grid removes reinvested cash, but a cash-payout basis can omit taxable reinvestments (and cashflowYear includes them)', cls: 'APP WRONG',
    why: 'The month grid takes reinvested interest and dividends out of the take-home (held: "Your $300/month of interest and dividends is not here — it is reinvested"). cashflowYear has no caller (reviewer-wrong clause). But the Interest & dividends screen\'s "FROM YOUR ACCOUNTS" — which it says are "counted as income you are taxed on" — skips a dividend logged as reinvested ($420, not $540): the tax on it is lost, against DEC-0179 clause 2.',
    fix: 'As MK-CF-M-066 tenet 1 (paidOutByAccount counts a reinvested record at shares × price).',
    check: () => { expect(has('SUM_INV', /\$300\/month of interest and dividends is not here/)).toBe(true); expect(first('DIV_REINV', 'MK-CF-M-066')).toBe('$420'); },
    wrong: () => { expect(first('DIV_REINV', 'MK-CF-M-066')).toBe('$540'); } },
  K401_TWELVE: { claim: 'The subtraction walk is declared, but 401(k) × 12 disagrees with paid-month contributions', cls: 'APP WRONG',
    why: 'Full year: one subtraction, everywhere (held: $169,200 − $19,200 = $150,000, 22%). Part year: Base pay subtracts twelve months (k401Annual = monthly × 12) and the Income summary six — the band differs (12% against 22% for $75,000 earned in six months).',
    fix: PART_FIX,
    check: () => { expect(first('SUM', 'MK-CF-M-041')).toBe('$150,000'); expect(first('PARTB_PAY', 'MK-CF-M-032')).toBe('12%'); },
    wrong: () => { expect(first('PARTB_PAY', 'MK-CF-M-032')).toBe('22%'); expect(first('PARTB_PAY', 'MK-CF-M-030')).toBe('$75,000'); },
    fixed: FIXINCA },
  K401_ROWS: { claim: 'The Income summary\'s three rows (DEC-7887)', cls: 'REVIEWER WRONG',
    why: 'DEC-7887\'s three rows use the paid months on the Income summary itself: $60,000 − $6,000 = $54,000 for the six-month worker; $169,200 − $19,200 = $150,000 for the couple. The ×12 the reviewer read is MK-CF-F-188\'s, which these rows do not use.',
    check: () => { expect(first('PARTK_SUM', 'MK-CF-M-076')).toBe('$60,000'); expect(first('PARTK_SUM', 'MK-CF-M-077')).toBe('$6,000'); expect(first('PARTK_SUM', 'MK-CF-M-041')).toBe('$54,000'); } },
  LEGACY_TAX: { claim: 'A legacy income path omits the state, reads single, and keeps a second rate', cls: 'REVIEWER WRONG',
    why: 'Every screen of these parts reads the one rate (rateInForce): a 5.00% state rate typed is applied to what is taxed, not to the gross ($533 − $370 = $163 a month = 5% × ($55,200 − $16,100) ÷ 12). The legacy path (buildIncomeState → effectiveTaxRate) now reads the filing status (calc.ts) and reaches only /income-detail, a route with no way in (the screen map: "kept for a future age group"), and Home\'s net worth, which reads no income from it. Records fix: retire the orphan path.',
    check: () => { expect(Math.round(0.05 * (55200 - 16100) / 12)).toBe(163); expect(dollars(first('ONE_STATE_PAY', 'MK-CF-M-033')) - dollars(first('ONE', 'MK-CF-M-033'))).toBe(163);
      for (const s of ['CashFlowScreen', 'BasePayScreen', 'IncomeSummaryScreen', 'IncomeManagerScreen', 'BillCalendarScreen', 'MonthlyIncomeScreen', 'BudgetScreen']) expect(src(`src/screens/${s}.tsx`)).not.toMatch(/buildIncomeState|effectiveTaxRate\(/);
      expect(src('docs/FCC-core-55-70/screen-architecture.html')).toMatch(/\/income-detail[\s\S]{0,200}NO WAY IN/); } },
  STATE_WORDS: { fixed: FIXMMB, claim: 'The rate producer counts an entered state rate, but a reader omits it', cls: 'APP WRONG',
    why: 'The legacy-reader clause is reviewer-wrong (no screen reaches it). But a LIVE reader fails the decision\'s words: Base pay\'s tax carries the 5.00% state rate ($533 against $370) and the card says "It knows nothing about your state" and "Only federal income tax is taken out here … your state may take more" — DEC-7608 and DEC-7798\'s words reached the Income summary, not Base pay.',
    fix: 'As MK-CF-M-033 tenet 8 (Base pay\'s sentences name the state rate). Owner: MK-CF-O-001.',
    check: () => { expect(text('ONE_STATE_SUM')).toMatch(/plus the 5\.00% state rate you entered/); expect(text('ONE_STATE_PAY')).toMatch(/knows nothing about your state/); },
    wrong: () => { expect(text('ONE_STATE_PAY')).not.toMatch(/knows nothing about your state/); } },
  CARD_ADDS_UP: { claim: 'The approved rows reconcile, but part-year shares give counterexamples', cls: 'REVIEWER WRONG',
    why: 'The card adds up on every frame rendered, part-year included: "$5,000 gross − $358 tax − $1,000 of 401(k)s = $3,642"; "$14,100 gross − $1,278 tax − $1,600 of 401(k)s = $11,222". The decisions (the card adds up; the total equals its lines) hold. That the part-year parts are themselves wrong is DEC-7938\'s finding, classified there.',
    check: () => { for (const k of ['PARTK_PAY', 'PAY_EST', 'ONE', 'ONE_RENT_PAY']) {
      const m = text(k).match(/\$([\d,]+) gross − \$([\d,]+) tax − \$([\d,]+) of 401\(k\)s = \$([\d,]+)\./);
      expect(m).not.toBeNull(); const [a, b, c, d] = m!.slice(1).map((x) => Number(x.replace(/,/g, '')));
      expect(Math.abs(a - b - c - d)).toBeLessThanOrEqual(1); } } },
  ONE_TIME: { fixed: FIXINCB, claim: 'One-time income keeps its year when dated, but a missing year still recurs', cls: 'APP WRONG',
    why: 'As YEARLESS: the $2,000 one-time gift with no year lands in January 2027 and is listed again in September 2027 — DEC-0447 ("lands in its own month") and DEC-7940 ("lands once") fail for it. The signing-bonus January default (legacy onboarding) reaches no screen of these parts: signingOnetime has no writer.',
    fix: 'As YEARLESS (extraIncome: a one-time with no year is not counted in every year; the question asks its month and year).',
    check: () => { expect(first('ONETIME_JAN27', 'MK-CF-M-047')).toBe('$9,200'); expect(grep('src', /setAnswer\('signingOnetime'/)).toEqual([]); },
    wrong: () => { expect(first('ONETIME_JAN27', 'MK-CF-M-047')).toBe('$7,200'); expect(text('ONETIME_SEP27')).toMatch(/Gift \| one-time · year not entered/); } },
  DEBTS_ONCE: { fixed: `${FIXMONTH}: RULED by the lead (reading B, with the sentence): the line is the mortgage's — September +$3,450, the $2,300 logged under it the mortgage's payment, and "Place it on your home in Net worth, so we know they are the same."; a budget line named as a debt, or the budget's own "Debt payment" line, stands down too ($500 → $250)`,
    claim: 'Actual counts only logged debt and the home mortgage stands down, but other budget lines that are debts have no link', cls: 'APP WRONG',
    why: 'A car loan payment logged under Debt payment is counted once (X4 holds); a placed home\'s Rent / Mortgage line stands down (DEC-1923, budget-counted.ts). cashflowYear has no caller (reviewer-wrong clause). Left open: a mortgage in Debts with no home placed beside a "Rent / Mortgage" budget line — the register\'s own September household — is counted twice ($2,400 + $2,300) if the line is that mortgage; the app cannot tell.',
    ruling: { readingA: 'The Rent / Mortgage line is rent unless a home is placed with the mortgage (as built): September plans −$2,400 mortgage and −$3,400 of budget, +$1,150.',
      readingB: 'With a mortgage in Debts and no home placed, the line is taken as that mortgage and stands down: +$3,450.',
      recommend: 'A for the figures, plus a sentence under the rows: "Your Rent / Mortgage line and a mortgage in Debts are both counted — if the line is that mortgage, place the mortgage on your home." Reverse in one word.' },
    check: () => { expect(first('CF', 'MK-CF-M-002')).toBe('$1,150'); expect(first('CF_EXP', 'MK-CF-M-013')).toBe('$2,998'); },
    wrong: () => { expect(first('CF', 'MK-CF-M-002')).toBe('$3,450'); expect(first('CF_EXP', 'MK-CF-M-101')).toBe('$698.00');   // to the cent, R5 (FX-CF-A, 2026-10-27)
      expect(text('CF')).toMatch(/Mortgage \| PAID \| −\$2,300/i); expect(first('HOME', 'MK-CF-M-052')).toBe('$3,248');
      expect(text('CF')).toMatch(/Place it on your home in Net worth, so we know they are the same\./); } },
  BUDGET_AVG: { claim: 'Dated budget readers keep own-month bills, but budgetVsActual still uses the annual average', cls: 'APP WRONG',
    why: 'This month, the Expenses tab and the editor\'s "of $2,000 plan" read September without the December bill (held). The editor\'s bucket rows beside them read the average: "Non-monthly $0 / $100 · Insurance $0 / $100" in September — rows of $2,100 under a $2,000 plan.',
    fix: 'src/domain/budget/index.ts budgetVsActual (MK-CF-F-014): category limits for the selected month from the dated plan (MK-CF-F-221), as DEC-7611 set. Owner: the budget.',
    check: () => { expect(has('DEC_BUDGET', /\$2,000 left · of \$2,000 plan/)).toBe(true); expect(text('DEC_BUDGET')).toMatch(/Insurance \| \$0 \/ \$100/); },
    wrong: () => { expect(text('DEC_BUDGET')).not.toMatch(/\$0 \/ \$100/); },
    fixed: `${FLIGHT}: the editor's rows read September's own plan — "Flexible $0 / $2,000 · Groceries $0 / $2,000", no $100 of the December bill` },
  PART_TAKEHOME: { claim: 'The part-year take-home rate multiplies twelve months', cls: 'APP WRONG',
    why: 'As MK-CF-M-031: $3,799 typed, $7,598 in a paid month on This month and the Income summary\'s July.', fix: PART_FIX,
    fixed: `${FIXINCA}: each paid month lands the $3,799 typed, so no month stands out on the Income summary`,
    check: () => { expect(first('PART_SUM', 'MK-CF-M-039')).toBe('$7,598'); },
    wrong: () => { expect(printed('PART_SUM', 'MK-CF-M-039')).toEqual([]); expect(after('PART_CF', 'Actual inflow (income (take-home))')).toBe('$3,799'); } },
  NO_BUDGET: { claim: 'An absent budget can still yield a planned surplus', cls: 'APP WRONG',
    why: 'This month and the editor refuse (held: "— not set", no planned surplus). The later month\'s plan card does not: "= Planned surplus $4,550" with no budget set.', fix: 'As MK-CF-M-049 tenet 3.',
    check: () => { expect(has('NOBUDGET_CF', /we won’t guess one/)).toBe(true); }, wrong: () => { expect(printed('NOBUDGET_NEXT', 'MK-CF-M-049')).toEqual([]); },
    fixed: `${FIXMMA}: the later month's card with no budget reads "— not set" and no planned surplus, in This month's words`,
    was: () => { expect(first('NOBUDGET_NEXT', 'MK-CF-M-049')).toBe('$4,550'); } },
  WORKED_BACK: { fixed: FIXINCA, was: () => { const c = convertTakeHomeMode({ salaryMode: 'takehome', baseSalary: '5000', c_401k: '500' } as any); expect(Number(c.baseSalary) * 12).toBeCloseTo(grossFromNet(60000), 0); }, claim: 'The calculated gross worked back from a take-home leaves the 401(k) out', cls: 'APP WRONG',
    why: 'convertTakeHomeMode, with no rate of their own, works the gross back from the federal tables on the take-home alone (grossFromNet(take-home × 12)) — a $5,000 take-home with $500 into a 401(k) gets the same gross as one with none, so "Everything else taken out" and what it is taxed on are $500 a month short. With their own rate it adds the 401(k) (held).',
    fix: 'src/domain/income/take-home-mode-migration.ts convertTakeHomeMode (MK-CF-F-186): gross − 401(k) − tax(gross − 401(k)) = the take-home — grossFromNet(take-home × 12) + 401(k) × 12. Owner: the migration.',
    check: () => { const own = convertTakeHomeMode({ salaryMode: 'takehome', baseSalary: '5000', c_401k: '500', taxMode: 'manual', manualTaxRate: '20' } as any); expect(Number(own.baseSalary)).toBeCloseTo((60000 + 6000) / 0.8 / 12, 6); },
    wrong: () => { const c = convertTakeHomeMode({ salaryMode: 'takehome', baseSalary: '5000', c_401k: '500' } as any); expect(Number(c.baseSalary) * 12).toBeCloseTo(grossFromNet(60000) + 6000, 0); } },
  LATE_UNSTAMPED: { fixed: `${FIXMONTH}: a record with no saved time says so under the list — "August’s record does not say when it was saved, so it may leave out later entries — this list holds $150 more than August’s figures." (addedAfterRecord MK-CF-F-231)`,
    was: () => { expect(text('LATE_LIST')).not.toMatch(/does not say when/); },
    claim: 'A late entry is said only when the record has its saved time', cls: 'APP WRONG',
    why: 'With its saved time, August\'s list says the $150 was "added after August closed" (held). A record with no saved time (an older record, read as \'\' by history.ts) lists the $150 with nothing said: the card reads $1,360, the list $1,510.',
    fix: 'MoneyKeel/functions/cashflow/this-month.ts addedAfterRecord (MK-CF-F-231): with no saved time, the list says "this month\'s record does not say when it was saved — its figures may leave out later entries" when the list and the card differ. Owner: MK-CF-O-003.',
    check: () => { expect(text('LATE_STAMPED_LIST')).toMatch(/added after August closed/); expect(first('LATE_CARD', 'MK-CF-M-052')).toBe('$1,360'); expect(first('LATE_LIST', 'MK-CF-M-101')).toBe('$1,510.00'); },   // to the cent, R5 (FX-CF-A, 2026-10-27)
    wrong: () => { expect(text('LATE_LIST')).toMatch(/(added after August closed|does not say when)/);
      expect(text('LATE_LIST')).toMatch(/August’s record does not say when it was saved, so it may leave out later entries — this list holds \$150 more than August’s figures\./); } },
  BAND_ONCE: { fixed: FIXINCA, claim: 'Base pay\'s band reads wages while the Income summary reads every source', cls: 'APP WRONG',
    why: 'As MK-CF-M-032 tenet 4: 12% on Base pay ("what your next dollar costs") against 22% on the Income summary for one household with rent.', fix: 'As MK-CF-M-032 tenet 4.',
    check: () => { expect(first('ONE_RENT_PAY', 'MK-CF-M-032')).toBe('12%'); }, wrong: () => { expect(first('ONE_RENT_PAY', 'MK-CF-M-032')).toBe('22%'); } },
};
const RULE_MAP: Record<string, string> = {
  '18:DEC-0003': 'YEARLESS', '18:DEC-0187': 'YEARLESS', '19:DEC-0187': 'YEARLESS',
  '18:DEC-0176': 'TWO_EARNERS', '19:DEC-0176': 'TWO_EARNERS', '18:DEC-0188': 'TWO_EARNERS', '19:DEC-0188': 'TWO_EARNERS',
  '18:DEC-0198': 'REINVESTED', '19:DEC-0198': 'REINVESTED', '19:DEC-0179': 'REINVESTED',
  '18:DEC-0283': 'K401_TWELVE', '19:DEC-0283': 'K401_TWELVE', '19:DEC-7797': 'K401_TWELVE', '18:DEC-7887': 'K401_ROWS', '19:DEC-7887': 'K401_ROWS',
  '18:DEC-0327': 'LEGACY_TAX', '19:DEC-0327': 'LEGACY_TAX', '19:DEC-0181': 'LEGACY_TAX', '19:DEC-0184': 'LEGACY_TAX', '19:DEC-0196': 'LEGACY_TAX',
  '18:DEC-7608': 'STATE_WORDS', '18:DEC-7798': 'STATE_WORDS', '19:DEC-7798': 'STATE_WORDS',
  '18:DEC-0380': 'CARD_ADDS_UP', '19:DEC-0380': 'CARD_ADDS_UP', '19:DEC-0207': 'CARD_ADDS_UP', '19:DEC-0376': 'CARD_ADDS_UP',
  '18:DEC-0447': 'ONE_TIME', '18:DEC-7940': 'ONE_TIME', '19:DEC-7940': 'ONE_TIME',
  '18:DEC-1923': 'DEBTS_ONCE', '18:DEC-2440': 'DEBTS_ONCE', '18:DEC-7611': 'BUDGET_AVG', '18:DEC-7938': 'PART_TAKEHOME', '18:DEC-7939': 'NO_BUDGET',
  '18:DEC-7942': 'WORKED_BACK', '19:DEC-7942': 'WORKED_BACK', '18:DEC-7949': 'LATE_UNSTAMPED', '19:DEC-0178': 'BAND_ONCE', '19:DEC-0191': 'BAND_ONCE',
};
const RULE_ROWS = (['18', '19'] as const).flatMap((p) => PART[p].rules_held.map((r: any) => ({ ...r, part: p })));
const NOT_HELD = RULE_ROWS.filter((r: any) => r.verdict === 'NOT HELD');
const RULE_RESULTS: any[] = [];
describe('the rule verdicts given as NOT HELD', () => {
  test('164 rule verdicts read (99 + 65); 40 NOT HELD (20 + 20); each mapped to one claim, and every claim used', () => {
    expect(RULE_ROWS).toHaveLength(164); expect(NOT_HELD).toHaveLength(40);
    expect(NOT_HELD.filter((r: any) => r.part === '18')).toHaveLength(20);
    for (const r of NOT_HELD) expect(RULE_MAP[`${r.part}:${r.rule}`]).toBeDefined();
    expect(Object.keys(RULE_MAP)).toHaveLength(40);
    for (const g of Object.keys(RULE_GROUPS)) expect(Object.values(RULE_MAP)).toContain(g);
  });
  for (const r of NOT_HELD) {
    const g = RULE_GROUPS[RULE_MAP[`${r.part}:${r.rule}`]];
    if (!g) continue;
    const name = `Part ${r.part} ${r.rule} · reviewer NOT HELD · ${g.cls}`;
    RULE_RESULTS.push({ part: r.part, rule: r.rule, reviewer_verdict: 'NOT HELD', reviewer_why: r.why, claim: g.claim, classification: g.cls, why: g.why, fix: g.fix ?? null, ruling: g.ruling ?? null,
      working_tree: flightOf(g) ?? 'unchanged', tests: runItem(name, g) });
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CROSS-CARD CHECKS (X1–X7: 9 entries, X3 and X7 in both parts)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type CrossItem = { verdict: string; claim: string; agrees: boolean; appWrong: boolean; why: string; fix?: string; check: () => void; wrong?: () => void;
  /** the fix landed (re-measured the file's own way): `wrong` passes, the committed answer is pinned as test.failing */
  fixed?: string; was?: () => void };
const CROSS: Record<string, CrossItem> = {
  X1: { verdict: 'HOLDS', agrees: true, appWrong: false, claim: 'Home\'s box and This month give the same take-home, outflow and left',
    why: 'Measured on the drawing\'s household (frame A): Home "Income $5,000 · Outflow (expenses + debt) $4,100 · Left $900"; This month "Actual inflow $5,000 … = Actual surplus so far +$900"; and on the September household $3,952 Left on both.',
    check: () => { expect(printed('DRAW_A_HOME', 'MK-CF-M-051')[0]).toBe('$5,000'); expect(printed('DRAW_A_HOME', 'MK-CF-M-052')[0]).toBe('$4,100'); expect(printed('DRAW_A_HOME', 'MK-CF-M-053')[0]).toBe('$900');
      expect(first('DRAW_A_CF', 'MK-CF-M-003')).toBe('$900'); expect(first('HOME', 'MK-CF-M-053')).toBe(first('CF', 'MK-CF-M-003')); } },
  X2: { verdict: 'HOLDS', agrees: true, appWrong: false, claim: 'The rows of This month add up to its surplus, planned and actual',
    why: 'Frame A\'s planned rows 5,000 − 2,000 − 250 − 2,000 − 200 − 200 = +$350; actual 5,000 − 2,000 − 0 − 500 − 1,200 − 200 − 200 = +$900 — as printed, by the one writer (DEC-7937).',
    check: () => { const p = printed('DRAW_A_CF', 'MK-CF-M-004'); expect(p.slice(0, 6).map(dollars)).toEqual([5000, 2000, 250, 2000, 200, 200]); expect(first('DRAW_A_CF', 'MK-CF-M-002')).toBe('$350'); expect(first('DRAW_A_CF', 'MK-CF-M-003')).toBe('$900'); } },
  X3: { verdict: 'DOES NOT HOLD', agrees: true, appWrong: true, claim: 'Wages only: Base pay\'s take-home equals the Income summary\'s take-home each month',
    why: 'Full year it holds ($9,398 = $9,398). Six paid months with a typed $3,799: Base pay and the Income summary\'s usual month both say $3,799, but the same household\'s paid month lands $7,598 on This month and the Income summary\'s July — the reviewer\'s witness, measured.', fix: PART_FIX,
    fixed: `${FIXINCA}: each paid month lands the $3,799 typed — on This month and on the Income summary, where no month stands out`,
    was: () => { expect(first('PART_SUM', 'MK-CF-M-039')).toBe('$7,598'); },
    check: () => { expect(first('PAY', 'MK-CF-M-031')).toBe('$9,398/month'); expect(first('SUM', 'MK-CF-M-037')).toBe('$9,398'); },
    wrong: () => { expect(printed('PART_SUM', 'MK-CF-M-039')).toEqual([]); expect(first('PART_PAY', 'MK-CF-M-031')).toBe('$3,799/month'); expect(after('PART_CF', 'Actual inflow (income (take-home))')).toBe('$3,799'); } },
  X4: { verdict: 'HOLDS', agrees: true, appWrong: false, claim: 'A car loan payment logged under Debt payment is counted once',
    why: 'The $250 car loan logged under Debt payment is the "Car loan PAID −$250" row, not an expense — ACTUAL EXPENSES leaves it out. Since FIX-MONTH, 2026-10-25 the $2,300 logged under the stood-down Rent / Mortgage line is the mortgage\'s payment too ("Mortgage PAID −$2,300"): ACTUAL EXPENSES $698, outflow $3,248 = $698 + $2,300 + $250 (it read $2,998 + $250).',
    check: () => { expect(first('CF_EXP', 'MK-CF-M-101')).toBe('$698.00'); expect(text('CF')).toMatch(/Car loan \| PAID \| −\$250/i); expect(first('HOME', 'MK-CF-M-052')).toBe('$3,248'); } },   // R5 (FX-CF-A, 2026-10-27)
  X5: { fixed: FIXINCA, verdict: 'DOES NOT HOLD', agrees: true, appWrong: true, claim: 'Each earner\'s 401(k) comes off the take-home and the taxed income; the household total is the earners added',
    why: 'Two full-year earners: $1,200 + $400 = $1,600 a month, $19,200 a year, on both screens (held). Six paid months at $1,000: Base pay counts it twelve times ($12,000 behind its band and card), the Income summary six (−$6,000) — and MK-CF-F-188 twelve.', fix: PART_FIX,
    check: () => { expect(printed('PAY', 'MK-CF-M-034')).toContain('$1,600/month'); expect(first('SUM', 'MK-CF-M-077')).toBe('$19,200'); expect(householdPreTaxContributionsAnnual(PART_CALC as any)).toBe(12000); },
    wrong: () => { expect(householdPreTaxContributionsAnnual(PART_CALC as any)).toBe(6000); expect(first('PARTB_PAY', 'MK-CF-M-032')).toBe(first('PARTB_SUM', 'MK-CF-M-043')); } },
  X6: { verdict: 'HOLDS', agrees: true, appWrong: false, claim: 'Wages only: the band on Base pay and the Income summary is the same',
    why: 'Wages only, a full year: 12% on both for $60,000 single with $4,800 into a 401(k); 22% on both for the couple. It fails once rent is added (DEC-0178, BAND_ONCE) or the year is partial (X5) — outside this check\'s household.',
    check: () => { expect(first('ONE', 'MK-CF-M-032')).toBe('12%'); expect(first('ONE_SUM', 'MK-CF-M-043')).toBe('12%'); expect(first('PAY', 'MK-CF-M-032')).toBe(first('SUM', 'MK-CF-M-043')); } },
  X7: { verdict: 'DOES NOT HOLD', agrees: true, appWrong: true, claim: 'A once-a-year bill is in its own month on the calendar and in that month\'s plan, and no other',
    why: 'Dated, it holds: $1,200 due 10 Dec — September plans $2,000 on the Expenses tab, December\'s card $3,200, the calendar Out −$3,200 in December only. Undated, it does not: the Expenses tab spreads $100 a month, the calendar\'s table takes $100 a month, and its COMING UP says "$1,200 due Jan 1, 2027". (The editor\'s bucket rows also read the average — BUDGET_AVG.)',
    fix: 'As MK-CF-M-016 tenet 4.',
    fixed: `${FIXBILLS} — re-measured by CLEANUP-TESTS, 2026-10-26: the undated $1,200 is no longer given Jan 1 in COMING UP; the dated one still lands in December only`,
    was: () => { expect(text('UNDATED_BILLS')).toMatch(/Insurance · \$1,200 due Jan 1, 2027/); },
    check: () => { expect(first('DEC_EXP', 'MK-CF-M-001')).toBe('$2,000'); expect(first('DEC_DEC', 'MK-CF-M-048')).toBe('$3,200'); expect(after('DEC_BILLS', 'Dec', 2)).toBe('−$3,200'); expect(after('DEC_BILLS', 'Nov', 2)).toBe('−$2,000'); },
    wrong: () => { expect(text('UNDATED_BILLS')).not.toMatch(/due Jan 1, 2027/); } },
};
const CROSS_ROWS = (['18', '19'] as const).flatMap((p) => PART[p].cross_card_checks.map((c: any) => ({ ...c, part: p })));
const CROSS_RESULTS: any[] = [];
describe('the cross-card checks', () => {
  test('9 entries read (5 + 4), 7 distinct; the reviewer\'s verdicts are the ones measured', () => {
    expect(CROSS_ROWS).toHaveLength(9); expect(new Set(CROSS_ROWS.map((c: any) => c.id)).size).toBe(7);
    for (const c of CROSS_ROWS) expect(CROSS[c.id].verdict).toBe(c.verdict);
  });
  for (const c of CROSS_ROWS) {
    const x = CROSS[c.id];
    const cls = x.appWrong ? 'AGREE — APP WRONG' : 'AGREE';
    const name = `Part ${c.part} ${c.id} · reviewer ${c.verdict} · ${cls}`;
    CROSS_RESULTS.push({ part: c.part, id: c.id, reviewer_verdict: c.verdict, reviewer_why: c.why, check: x.claim, classification: cls, why: x.why, fix: x.fix ?? null,
      working_tree: flightOf(x) ?? 'unchanged', tests: runItem(name, x) });
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// FOUND WHILE RENDERING — outside the 197, each a check of the right answer that fails today
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const FOUND: { id: string; screen: string; what: string; fix: string; check: () => void; wrong: () => void;
  /** the fix landed: `wrong` passes; `was` (or `check`, when `was` is absent) is pinned as test.failing; `wasLabel` names it */
  fixed?: string; was?: () => void; wasLabel?: string }[] = [
  { id: 'F1 MK-CF-M-073 prints each debt\'s monthly interest', screen: 'Cash flow · Debts',
    what: 'Each debt row prints "~$180/month interest" through MK-CF-M-073, the payment figure: the census traces an interest figure to the payment\'s row (objective 3).',
    fix: 'src/screens/BudgetScreen.tsx Debts row: the interest through its own identifier. Owner: MK-CF-O-018.',
    check: () => { expect(printed('CF_DEBT', 'MK-CF-M-073')).toContain('$180'); }, wrong: () => { expect(printed('CF_DEBT', 'MK-CF-M-073')).not.toContain('$180'); },
    fixed: `${FIXMMA}: each debt's "~$180/month interest" prints under MK-CF-M-057, the interest figure` },
  { id: 'F2 the register\'s worked household writes seFreq \'yearly\'', screen: 'Your income (the master file\'s worked examples)',
    what: 'income-summary.ts SOURCES_EXAMPLE stores seFreq: \'yearly\', a value no question writes (\'annual\' | \'monthly\'), so the code reads its "$24,000/year of self-employment" as $24,000 a month: March $40,316 — MK-CF-M-039\'s declared answer. With \'annual\' March is $23,156.',
    fix: 'MoneyKeel/functions/cashflow/income-summary.ts SOURCES_EXAMPLE seFreq \'annual\'; MK-CF-M-039\'s worked answer $23,156 (and income-summary.test.ts). Records.',
    check: () => { expect(first('INC_YEARLY_SUM', 'MK-CF-M-039')).toBe('$40,316'); expect(first('INC_OK_SUM', 'MK-CF-M-039')).toBe('$23,156'); },
    wrong: () => { expect(src('MoneyKeel/functions/cashflow/income-summary.ts')).not.toMatch(/seFreq: 'yearly'/); expect(first('INC_OK_SUM', 'MK-CF-M-039')).toBe(figureSpec('MK-CF-M-039').worked!.answer); },
    fixed: `${FIXINCB}: SOURCES_EXAMPLE writes seFreq 'annual'; MK-CF-M-039's worked answer is what the screen prints` },
  { id: 'F3 Base pay says the band is read on the wages "so far" with rent already entered', screen: 'Your base pay', fixed: FIXMMB,
    what: 'One earner with $2,000 a month of rent entered reads "…using your tax band read on the $60,000 you have entered so far — add rent, a bonus or a spouse\'s wage later and the band is calculated again" — the rent is already entered.',
    fix: 'MoneyKeel/functions/cashflow/base-pay.ts (the estimate sentence): name what the band was read on — "on your wages and your rent". Owner: MK-CF-O-001.',
    check: () => { expect(text('ONE_RENT_PAY')).toMatch(/add rent, a bonus or a spouse’s wage later/); }, wrong: () => { expect(text('ONE_RENT_PAY')).not.toMatch(/add rent, a bonus or a spouse’s wage later/); } },
  { id: 'F4 a rental loss is left out of This month', screen: 'Cash flow · This month',
    what: 'The rental losing $500 a month: This month\'s inflow is $7,200 and the planned surplus +$1,150 — the $500 a month the property costs is in no row.',
    // the loss is a row of the inflow ($6,700); and since FX-CF-A, 2026-10-27 (the lead's R3) the mortgage the person never placed is counted once, from
    // Debts, so the Rent / Mortgage line stands down: 6,700 − 2,400 − 250 − 1,100 = +$2,950 (it read +$650; held as test.failing in
    // cashflow_fix_wave_2026_10_27.test.tsx)
    fix: RENT_LOSS_FIX, check: () => { expect(first('LOSS_CF', 'MK-CF-M-002')).toBe('$1,150'); }, wrong: () => { expect(first('LOSS_CF', 'MK-CF-M-002')).toBe('$2,950'); },
    fixed: `${FIXINCB}: the dated month table carries the rental's −$500/month (MK-XS-F-004 "Rental (after costs)")` },
  { id: 'F5 the budget editor shows a $0 limit when no budget is set', screen: 'Cash flow · Expenses · Your budget',
    what: 'With no budget set the editor\'s groups read "Fixed $2,300 / $0" and "Flexible $698 / $0" — a $0 limit, as if one were set (tenet 3), beside "— not set" above them.',
    fix: 'src/screens/BudgetScreen.tsx (Budget): a group with no limit reads "$2,300 · no limit", as its categories already do. Owner: the budget.',
    check: () => { expect(text('NOBUDGET_EDITOR')).toMatch(/Fixed \| \$2,300 \/ \$0/); }, wrong: () => { expect(text('NOBUDGET_EDITOR')).not.toMatch(/\/ \$0\b/); },
    fixed: `${FIXMMA}: with no budget the groups read "Fixed $2,300 · no limit" and "Flexible $698 · no limit"` },
  { id: 'F6 Base pay blames a 401(k) in a month with no pay', screen: 'Your base pay', fixed: FIXMMB,
    what: 'The July-to-December worker reads "These three cannot all be right in 2026-01. $0 gross, less $501 into your 401(k), leaves -$501 — but you entered a take-home of $3,799." — January has no pay and no 401(k).',
    fix: 'MoneyKeel/functions/cashflow/base-pay.ts earnerPay verdict: check paid months only. Owner: MK-CF-O-001.',
    check: () => { expect(text('PART_PAY')).toMatch(/These three cannot all be right in 2026-0[1-6]/); }, wrong: () => { expect(text('PART_PAY')).not.toMatch(/cannot all be right in 2026-0[1-6]/); } },
  { id: 'F7 IN FLIGHT: a month typed $0 is read as pay (a regression in the working tree)', screen: 'Your base pay · Your income', fixed: FIXMMB,
    wasLabel: 'the working tree before the fix (2026-10-25 19:09; never committed)', was: () => { expect(first('PARTB_PAY', 'MK-CF-M-030')).toBe('$109,091'); },
    what: `${FLIGHT}: CF-MMFIX-B's IN-05 change ("a month left blank counts as the typical month") also reads months TYPED $0. A worker paid $12,500 a month July to December ($75,000) reads "Gross /year $109,091" on Base pay, and the Income summary prints "Your gross $109,091" over "= Gross /year $75,000". At b1c659e8 both read $75,000.`,
    fix: 'MoneyKeel/functions/cashflow/base-pay.ts annualisedGross (the IN-05 change): only a month with nothing typed is the typical month; a month typed $0 is $0. Owner: CF-MMFIX-B, before that work is committed.',
    check: () => { expect(first('PARTB_SUM', 'MK-CF-M-076')).toBe('$75,000'); }, wrong: () => { expect(first('PARTB_SUM', 'MK-CF-M-042')).toBe(first('PARTB_SUM', 'MK-CF-M-076')); expect(first('PARTB_PAY', 'MK-CF-M-030')).toBe('$75,000'); } },
];
describe('found while rendering — outside the 197', () => {
  for (const f of FOUND) {
    if (!f.fixed) { test(`${f.id} · what holds`, f.check); test.failing(`${f.id} · the right answer (test.failing)`, f.wrong); continue; }
    test(`${f.id} · the right answer — FIXED (${f.fixed})`, f.wrong);
    if (f.was) { test.failing(`${f.id} · ${f.wasLabel ?? 'the committed answer (b1c659e8)'}, pinned (test.failing)`, f.was); test(`${f.id} · what holds`, f.check); }
    else test.failing(`${f.id} · ${f.wasLabel ?? 'the committed answer (b1c659e8)'}, pinned (test.failing)`, f.check);
  }
});

describe('the coverage line', () => {
  test('536 of 536 rows recorded; 197 of 197 FAILs classified; 40 of 40 rule verdicts; 9 of 9 cross-card entries', () => {
    expect(RESULTS).toHaveLength(536);
    expect(RESULTS.filter((x) => x.reviewer_verdict === 'FAIL')).toHaveLength(197);
    expect(RULE_RESULTS).toHaveLength(40);
    expect(CROSS_RESULTS).toHaveLength(9);
  });
});

afterAll(() => {
  const out = process.env.OUTSIDE_RESULTS_OUT;
  if (!out) return;
  const fails = RESULTS.filter((x) => x.reviewer_verdict === 'FAIL');
  const n = (rows: any[], c: string) => rows.filter((x) => x.classification === c).length;
  const line = (rows: any[]) => `${n(rows, 'APP WRONG')} app wrong (${rows.filter((x) => x.classification === 'APP WRONG' && (x.row_words_only || x.records_only)).length} of them records or row words only), ${n(rows, 'REVIEWER WRONG')} reviewer wrong, ${n(rows, 'NEEDS A RULING')} need a ruling, ${n(rows, 'EVIDENCE GAP')} evidence gaps (package fix)`;
  fs.writeFileSync(out, JSON.stringify({
    coverage: {
      part_18: `120 of 120 FAILs: ${line(fails.filter((x) => x.part === '18'))}`,
      part_19: `77 of 77 FAILs: ${line(fails.filter((x) => x.part === '19'))}`,
      fails: `197 of 197 FAILs: ${line(fails)}`,
      passes: '339 of 339 PASSes recorded, not re-measured (each figure\'s screen checked to print it under its identifier: 67 of 67)',
      rules: `40 of 40 NOT HELD verdicts: ${n(RULE_RESULTS, 'APP WRONG')} app wrong, ${n(RULE_RESULTS, 'REVIEWER WRONG')} reviewer wrong, ${n(RULE_RESULTS, 'NEEDS A RULING')} need a ruling`,
      cross: `9 of 9 cross-card entries (7 checks): ${CROSS_RESULTS.length} agree with the reviewer's verdict (${CROSS_RESULTS.filter((x) => x.classification === 'AGREE — APP WRONG').length} of them a DOES NOT HOLD that is an app defect)`,
      found: `${FOUND.length} found while rendering, outside the 197`,
    },
    screen_checks: RESULTS, rules: RULE_RESULTS, cross_card_checks: CROSS_RESULTS,
    found_while_rendering: FOUND.map(({ id, screen: s, what, fix }) => ({ id, screen: s, what, fix, classification: 'APP WRONG' })),
    renders: Object.fromEntries([...CACHE.entries()].map(([k, s]) => [k, { lines: s.lines, printed: s.printed, changed: s.changed }])),
  }, null, 1));
});

// FIX-MONTH, 2026-10-25 — THE FIGURES THE LEAD'S RULING MOVED ON THE REGISTER'S SEPTEMBER HOUSEHOLD, the answers before kept beside
// the new ones above (the mortgage counted once: see FIXMONTH). Each fails now, as it should.
describe('FIX-MONTH 2026-10-25 — the answers before the mortgage was counted once, kept', () => {
  test.failing('MK-CF-M-020: "Surplus after your budget" +$850', () => { expect(after('CF', 'Surplus after your budget')).toBe('+$850'); });
  test.failing('MK-CF-M-048: October planned outflow $6,050', () => { expect(first('CF_OCT', 'MK-CF-M-048')).toBe('$6,050'); });
  test.failing('MK-CF-M-056: the budget editor’s plan $3,400', () => { expect(has('CF_BUDGET', /left · of \$3,400 plan$/)).toBe(true); });
  test.failing('X4: ACTUAL EXPENSES $2,998', () => { expect(first('CF_EXP', 'MK-CF-M-013')).toBe('$2,998'); });
});
