/** THE BILL CALENDAR'S COMING UP LINE AND ITS MONTH TABLE ARE ONE FIGURE (2026-10-24, Cash flow journey E2E-81).
 *
 *  "✓ Covered — about $X there by <need-by date>" (MK-CF-M-063, from MK-CF-O-008 whatsComing → MK-CF-F-019 upcomingBills) was
 *  worked a second way: the take-home before the 401(k), less the budget, with no debt payment, spread evenly over the days from
 *  today. On 28 Sep 2026 — $0 on hand, $5,000 take-home, $700 of groceries, $2,650 of debt payments a month, car insurance of
 *  $1,200 due Dec 15 — it read (5,000 − 700) × 12 ÷ 365 × 76 days = about $10,744 by Dec 13, on a screen whose own table reads
 *  November End $4,950. Leaving out the debts (DEC-0269, outflow = expenses + debt) was a wrong number (DEC-3523 tenet 1), and
 *  two ways of working one figure on one screen broke tenet 4.
 *
 *  THE ONE WAY NOW (balanceByDay, read from the table the screen draws — the debts in, the wage after tax and the 401(k)): by a
 *  day, the money there is the End of the month before (the starting balance in this month), plus what that month brings or
 *  takes on a day already passed (aid or a loan on the day it lands, a dated bill on its day), and the month's regular money —
 *  pay, everyday expenses, debt payments — only when it takes out more than it brings in. WHOLE MONTHS, AS THE TABLE DOES: the
 *  table does not know the day pay lands and never invents one (the grid's own rule), and the line then reads a row the person
 *  can see on the same screen. A by-day spread would invent a pay day, and a table cannot read a line.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLines } from '../../testing/mockMatch';
import { balanceByDay } from '../../domain/cashflow';
import { datedGridOf } from '../../hooks/useCashflowModel';
import { theBudgetCounted } from '../../../MoneyKeel/functions/cashflow/budget-counted';
import { whatsComing } from '../../../MoneyKeel/functions/cashflow/whats-coming';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
const mockBacks = { n: 0 };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: () => { mockBacks.n += 1; }, push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r), back: () => { mockBacks.n += 1; } },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const onDay = (iso: string) => jest.useFakeTimers({ now: new Date(`${iso}T12:00:00`), doNotFake: [...FAKE] });
const lines = () => builtLines(screen.toJSON());

const SCREENS: Record<string, () => any> = {
  '/(tabs)/cashflow': () => require('../CashFlowScreen').default,
  '/bill-calendar': () => require('../BillCalendarScreen').default,
};
function Root({ children }: { children: React.ReactNode }) {
  const hidden = useStore((s: any) => s.hideBalances);
  setHideBalances(!!hidden);
  return <React.Fragment key={String(!!hidden)}>{children}</React.Fragment>;
}
function open(route: string) {
  const [where, q] = route.split('?');
  mockParams = Object.fromEntries(new URLSearchParams(q ?? '').entries());
  const C = SCREENS[where]?.();
  if (!C) throw new Error(`no screen for ${where}`);
  const TopBar = require('../../components/TopBar').default;
  return render(<Root>{where.startsWith('/(tabs)/') && <TopBar />}<C /></Root>);
}
function follow(): string {
  const to = mockPushes[mockPushes.length - 1];
  if (!to) throw new Error('nothing was pushed');
  screen.unmount();
  open(to);
  return to;
}
function back(to: string) {
  const before = mockBacks.n;
  fireEvent.press(screen.getAllByLabelText('Back')[0]);
  expect(mockBacks.n).toBe(before + 1);
  screen.unmount();
  open(to);
}
function start(state: Record<string, any>) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, ...state } as any);
  mockPushes.length = 0;
}
afterEach(() => { setHideBalances(false); jest.useRealTimers(); });

/** a month row of the table, as printed: [month, In, Out, End] */
const row = (m: string, ls = lines()) => { const i = ls.indexOf(m); expect(i).toBeGreaterThanOrEqual(0); return ls.slice(i, i + 4); };
const dollars = (s: string) => Number(s.replace('−', '-').replace(/[^0-9.\-]/g, ''));
/** the COMING UP card, as printed, up to its foot line */
const comingUp = (ls = lines()) => {
  const i = ls.indexOf('COMING UP'); expect(i).toBeGreaterThanOrEqual(0);
  const j = ls.indexOf('Assumes money should be in your account 2 days before the due date.', i); expect(j).toBeGreaterThan(i);
  return ls.slice(i + 1, j);
};
/** NO BALANCE GIVEN, NOTHING PROJECTED (2026-10-25, FIX-BILLS; tenet 3): with $0 on hand and the box blank, COMING UP lists the
 *  bills and says MK-CF-M-063's refusal. These households have no cash account, so the person types their $0 — a typed $0 is
 *  an answer (tenet 5) and the line is worked from it, as the table is. */
const typeStart = (v: string) => fireEvent.changeText(screen.getByLabelText('Cash on hand now, editable'), v);
/** the dollars a COMING UP line says are there (Covered) or short (Short) */
const thereIn = (line: string) => dollars(line.match(/about (\$[\d,]+) there/)![1]);

// ── the households ───────────────────────────────────────────────────────────────────────────────────────────────────────
// the founder's own shape (cash-flow_v01 frames A and C): a $5,000 take-home and the four debts he drew, $2,650 a month
const WORKER = { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '5000', salaryMode: 'takehome',
  salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' };
const DEBTS = [
  { debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300_000, interest_rate_apr: 0.05, minimum_monthly_payment: 2_000, due_day: 1 },
  { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9_800, interest_rate_apr: 0.064, minimum_monthly_payment: 250, due_day: 28 },
  { debt_id: 'h', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 20_000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 },
  { debt_id: 'v', label: 'Credit card debt payment', debt_type: 'CREDIT_CARD', remaining_balance: 3_200, interest_rate_apr: 0.229, minimum_monthly_payment: 200 },
];
const GROCERIES = { id: 'groc', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' };
const CAR_INS_DEC = { id: 'ins', label: 'Car insurance', amount: 1_200, bucket: 'nonmonthly', months: [12], dueDay: 15, tier: 'critical', custom: true };
const PROP_TAX_DEC = { id: 'ptax', label: 'Property tax', amount: 4_800, bucket: 'nonmonthly', months: [12], dueDay: 1, tier: 'critical', custom: true };
const SEP_28 = '2026-09-28';
/** CJA's worked example — $0 on hand; In $5,000; Out 800 + 2,650 = $3,450 a month, December 3,450 + 1,200 = $4,650 */
// THE TYPED TOTAL IS WHAT GOES OUT EVERY MONTH, A DATED BILL ON TOP IN ITS OWN MONTH (2026-10-24, CF-FIX; DEC-0002: a bill that
// lands once a year is not lost inside a monthly average). The households are as typed; the figures below moved with the
// arithmetic. H1 types $800 a month beside $700 of groceries: $100 of everyday expenses besides the groceries, every month, and
// the $1,200 in December on top. It read Out $3,350 a month — the $800 taken to hold $100 a month of the December bill.
const H1 = { onboardingProfile: { ...WORKER, monthlySpending: '800', spendCats: [GROCERIES, CAR_INS_DEC] }, liabilities: DEBTS };
/** two dated bills in one month — property tax $4,800 on Dec 1 and the car insurance on Dec 15 */
const H2 = { onboardingProfile: { ...WORKER, monthlySpending: '1200', spendCats: [GROCERIES, PROP_TAX_DEC, CAR_INS_DEC] }, liabilities: DEBTS };
/** a household that spends more than it takes home: $3,000 in, $4,000 of groceries, $10,000 on hand, no debts */
const H3 = { onboardingProfile: { ...WORKER, baseSalary: '3000', monthlySpending: '4100', spendCats: [{ ...GROCERIES, amount: 4_000 }, CAR_INS_DEC] },
  assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 10_000 }] };
/** the founder's household as cash-flow_v01 draws it — a $2,000 budget (1,100 fixed + 900 everyday) and his four debts */
const AUG_20 = '2026-08-20';
const H4 = { onboardingProfile: { ...WORKER, monthlySpending: '2000', b_fixed: '1100', b_flexible: '900' }, liabilities: DEBTS };

/** the screen's own table and the door's line, from the same store, for the agreement checks below */
const doorAndTable = () => {
  const s = useStore.getState() as any;
  const counted = theBudgetCounted({ profile: s.onboardingProfile, accounts: s.assetAccounts ?? [], debts: s.liabilities ?? [] }).profile;
  const cash = (s.assetAccounts ?? []).reduce((t: number, a: any) => t + (a.balance ?? 0), 0);
  const grid = datedGridOf(counted, s.liabilities ?? [], s.retirementAssumptions?.rothConversionTax, cash);
  return { grid, bills: whatsComing({ profile: counted, startBalance: cash, debts: s.liabilities ?? [], grid }).bills };
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-81 · the person opens the Bill calendar from the menu, reads COMING UP and the table, adds a store card's $100 payment on
// the Debts tab, comes back — and the line and November's End have both moved by the same $300 (Sep, Oct and Nov × $100).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-81 · the COMING UP line and the month table move together', () => {
  test('E2E-81 · Menu → Bill calendar: "about $4,650 there by Dec 13" is November\'s End; a $100 card on the Debts tab takes $300 off both', () => {
    onDay(SEP_28);
    start(H1);
    // the Cash flow tab → Menu → Bill calendar
    open('/(tabs)/cashflow');
    fireEvent.press(screen.getByLabelText('Menu'));
    fireEvent.press(screen.getByLabelText('Bill calendar'));
    expect(follow()).toBe('/bill-calendar');
    typeStart('0');

    // BEFORE. Each month In $5,000 (the take-home); Out the $800 typed (700 groceries + 100 more) + 2,000 + 250 + 200 + 200 debts =
    // $3,450; December adds the $1,200 insurance, $4,650. End chains from $0: Sep 1,550 · Oct 3,100 · Nov 4,650 ·
    // Dec 4,650 + 5,000 − 4,650 = 5,000. (Until 2026-10-24 Out read $3,350, the $800 taken to hold $100 of the insurance:
    // Nov End $4,950.)
    expect([row('Sep'), row('Oct'), row('Nov'), row('Dec')]).toEqual([
      ['Sep', '+$5,000', '−$3,450', '$1,550'], ['Oct', '+$5,000', '−$3,450', '$3,100'],
      ['Nov', '+$5,000', '−$3,450', '$4,650'], ['Dec', '+$5,000', '−$4,650', '$5,000']]);
    // the insurance is due Dec 15, so its money must be there by Dec 13. December's pay is not counted before December ends, and
    // nothing else is dated in December before the 13th: what is there is November's End, $4,650 — covered for $1,200.
    // (It read about $10,744: (5,000 − 700) × 12 ÷ 365 × 76 days, no debts and the wage before the 401(k).)
    expect(comingUp()).toEqual(['Car insurance · $1,200 due Dec 15, 2026', '✓ Covered — about $4,650 there by Dec 13, 2026.']);
    expect(screen.getByLabelText(/^Car insurance, .* due Dec 15, 2026\. Covered: about .* there by Dec 13, 2026\. Opens the editor\.$/)).toBeOnTheScreen();
    const lineBefore = thereIn(comingUp()[1]), novBefore = dollars(row('Nov')[3]);
    expect(lineBefore).toBe(novBefore);

    // back to the Cash flow tab → Debts → + Add debt account → a store card, $1,500 owed, $100 a month minimum → Add card
    back('/(tabs)/cashflow');
    fireEvent.press(screen.getByLabelText('Debts tab'));
    fireEvent.press(screen.getByLabelText('Add debt account'));
    fireEvent.changeText(screen.getByPlaceholderText('Lender / name (e.g. Chase Sapphire)'), 'Store card');
    // the sheet opens over the tab, which has boxes of its own: the sheet's are the last on the screen
    const inSheet = (placeholder: string) => screen.getAllByPlaceholderText(placeholder).slice(-1)[0];
    fireEvent.changeText(inSheet('0'), '1500');                     // what you owe
    fireEvent.changeText(inSheet('$0'), '100');                     // Min payment /month
    fireEvent.press(screen.getByLabelText('Add debt'));
    expect((useStore.getState() as any).liabilities.map((d: any) => d.label)).toContain('Store card');
    expect(lines()).toContain('Store card');                        // the Debts tab lists it, where the person just added it

    // → Menu → Bill calendar again
    fireEvent.press(screen.getByLabelText('Menu'));
    fireEvent.press(screen.getByLabelText('Bill calendar'));
    expect(follow()).toBe('/bill-calendar');
    typeStart('0');
    // AFTER. Out 3,450 + 100 = $3,550 a month, December $4,750. End: Sep 1,450 · Oct 2,900 · Nov 4,350 · Dec 4,350 + 5,000 − 4,750 = 4,600
    expect([row('Sep'), row('Oct'), row('Nov'), row('Dec')]).toEqual([
      ['Sep', '+$5,000', '−$3,550', '$1,450'], ['Oct', '+$5,000', '−$3,550', '$2,900'],
      ['Nov', '+$5,000', '−$3,550', '$4,350'], ['Dec', '+$5,000', '−$4,750', '$4,600']]);
    expect(comingUp()).toEqual(['Car insurance · $1,200 due Dec 15, 2026', '✓ Covered — about $4,350 there by Dec 13, 2026.']);
    // both moved by the same amount: three months of the card's $100, Sep to Nov
    expect(novBefore - dollars(row('Nov')[3])).toBe(300);
    expect(lineBefore - thereIn(comingUp()[1])).toBe(300);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE LINE EQUALS THE TABLE'S BALANCE AT THE NEED-BY DATE — five households, each worked by hand from the rows the person sees
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('the COMING UP line is the table read at the need-by day (5 households)', () => {
  test('H1 · a bill alone in its month: the line is the End of the month before — November, $4,650', () => {
    onDay(SEP_28); start(H1); open('/bill-calendar'); typeStart('0');
    expect(thereIn(comingUp()[1])).toBe(dollars(row('Nov')[3]));    // 4,650 = 4,650 (both read 4,950 until 2026-10-24)
    const { grid, bills } = doorAndTable();
    expect(bills[0].availableByNeed).toBe(balanceByDay(grid, bills[0].needByDate));
    expect(bills[0].availableByNeed).toBeCloseTo(4_650, 6);
  });

  test('H2 · two bills in December: the Dec 1 property tax is taken before the Dec 13 need-by; the Nov 29 need-by reads October', () => {
    onDay(SEP_28); start(H2); open('/bill-calendar'); typeStart('0');
    // Out the $1,200 typed + 2,650 = $3,850 a month; December 3,850 + 4,800 + 1,200 = 9,850. End from $0: Sep 1,150 · Oct 2,300 ·
    // Nov 3,450 · Dec 3,450 + 5,000 − 9,850 = −1,400, short. (Until 2026-10-24 Out read $3,350, the $1,200 taken to hold
    // 400 + 100 a month of the two December bills: Dec End $600.)
    expect([row('Oct'), row('Nov'), row('Dec !')]).toEqual([
      ['Oct', '+$5,000', '−$3,850', '$2,300'], ['Nov', '+$5,000', '−$3,850', '$3,450'], ['Dec !', '+$5,000', '−$9,850', '−$1,400 short']]);
    // property tax due Dec 1 → need-by Nov 29, inside November: November's pay is not counted before November ends, so it is
    // October's End, $2,300 — short 4,800 − 2,300 = $2,500. Car insurance → need-by Dec 13: November's End less the property
    // tax already paid on Dec 1, 3,450 − 4,800 = −1,350 — short 1,200 + 1,350 = $2,550
    expect(comingUp()).toEqual([
      'Property tax · $4,800 due Dec 1, 2026', 'Short $2,500 — set it aside by Nov 29, 2026, from savings or a backup.',
      'Car insurance · $1,200 due Dec 15, 2026', 'Short $2,550 — set it aside by Dec 13, 2026, from savings or a backup.']);
    expect(4_800 - dollars(row('Oct')[3])).toBe(2_500);
    expect(1_200 - (dollars(row('Nov')[3]) - 4_800)).toBe(2_550);
    const { grid, bills } = doorAndTable();
    expect(bills.map((b) => Math.round(b.availableByNeed!))).toEqual([2_300, -1_350]);
    for (const b of bills) expect(b.availableByNeed).toBe(balanceByDay(grid, b.needByDate));
  });

  test('H3 · a month that spends more than it brings in: the lower month-end, December\'s before the bill — $4,800 + $1,200', () => {
    onDay(SEP_28); start(H3); open('/bill-calendar');
    // from $10,000: In 3,000, Out the $4,100 typed → Sep 8,900 · Oct 7,800 · Nov 6,700; December Out 4,100 + 1,200 = 5,300 → End
    // 4,400. (Until 2026-10-24 Out read $4,000, the $4,100 taken to hold $100 a month of the insurance: Nov 7,000, Dec 4,800.)
    expect([row('Nov'), row('Dec')]).toEqual([['Nov', '+$3,000', '−$4,100', '$6,700'], ['Dec', '+$3,000', '−$5,300', '$4,400']]);
    // December's regular money takes $1,100 more out than it brings in, so it is counted: the lower of November's End ($6,700)
    // and December's End without the bill still to come (4,400 + 1,200 = $5,600) — $5,600, covered for $1,200
    expect(comingUp()).toEqual(['Car insurance · $1,200 due Dec 15, 2026', '✓ Covered — about $5,600 there by Dec 13, 2026.']);
    expect(thereIn(comingUp()[1])).toBe(Math.min(dollars(row('Nov')[3]), dollars(row('Dec')[3]) + 1_200));
  });

  test('H4 · the founder\'s household (cash-flow_v01): he adds car insurance for Oct 15 on the calendar; the line is September\'s End', () => {
    onDay(AUG_20); start(H4); open('/bill-calendar'); typeStart('0');
    expect(lines()).not.toContain('COMING UP');                      // nothing dated yet: the card is not drawn
    // + Add a dated bill → Car insurance · $1,200 · Oct · day 15 → Save bill
    fireEvent.press(screen.getByLabelText('Add a dated bill'));
    fireEvent.changeText(screen.getByLabelText('Bill name'), 'Car insurance');
    fireEvent.changeText(screen.getByLabelText('Bill amount'), '1200');
    fireEvent.press(screen.getByLabelText('Due in Oct'));
    fireEvent.changeText(screen.getByLabelText('Due day of month'), '15');
    fireEvent.press(screen.getByLabelText('Save this bill'));
    // THE BILL IS ADDED IN ITS OWN MONTH (2026-10-24, CF-FIX; DEC-0002: a bill that lands once a year is not lost inside a
    // monthly average): everyday expenses stay the typed $2,000 — $1,100 bills & fixed and $900 everyday — in every month, and
    // October adds the $1,200. Out 2,000 + 2,650 = $4,650, October 4,650 + 1,200 = $5,850. End from $0: Aug 350 · Sep 700 ·
    // Oct 700 + 5,000 − 5,850 = −150, short. It read $1,900 a month of everyday expenses (the typed $2,000 taken to hold the
    // insurance's $100), Out $4,550, Oct End $150, and short $300.
    expect([row('Aug'), row('Sep'), row('Oct !')]).toEqual([
      ['Aug', '+$5,000', '−$4,650', '$350'], ['Sep', '+$5,000', '−$4,650', '$700'], ['Oct !', '+$5,000', '−$5,850', '−$150 short']]);
    // need-by Oct 13, inside October: September's End, $700 — short 1,200 − 700 = $500
    expect(comingUp()).toEqual(['Car insurance · $1,200 due Oct 15, 2026', 'Short $500 — set it aside by Oct 13, 2026, from savings or a backup.']);
    expect(1_200 - dollars(row('Sep')[3])).toBe(500);
    const { grid, bills } = doorAndTable();
    expect(bills[0].availableByNeed).toBe(balanceByDay(grid, bills[0].needByDate));
  });

  test('H4, a December bill: the founder\'s $2,000 stays $2,000 in all eleven other months — $1,100 fixed and $900 everyday — and December is $3,200', () => {
    onDay(AUG_20); start(H4); open('/bill-calendar');
    fireEvent.press(screen.getByLabelText('Add a dated bill'));
    fireEvent.changeText(screen.getByLabelText('Bill name'), 'Car insurance');
    fireEvent.changeText(screen.getByLabelText('Bill amount'), '1200');
    fireEvent.press(screen.getByLabelText('Due in Dec'));
    fireEvent.changeText(screen.getByLabelText('Due day of month'), '15');
    fireEvent.press(screen.getByLabelText('Save this bill'));
    const s = useStore.getState() as any;
    const counted = theBudgetCounted({ profile: s.onboardingProfile, accounts: s.assetAccounts ?? [], debts: s.liabilities ?? [] }).profile;
    const { spendByMonthByBucket, spendByMonth } = require('../../domain/budget');
    const groups = spendByMonthByBucket(counted);
    for (let m = 0; m < 12; m++) {
      expect([m + 1, groups[m].fixed, groups[m].flexible]).toEqual([m + 1, 1_100, 900]);
      expect([m + 1, groups[m].nonmonthly]).toEqual([m + 1, m === 11 ? 1_200 : 0]);
    }
    expect(spendByMonth(counted)).toEqual([...Array(11).fill(2_000), 3_200]);
    // the year's planned expenses ÷ 12 count the bill once: 2,000 + 1,200 ÷ 12 = $2,100 (it read $2,000, the bill inside the
    // $2,000); the must-pay remainder is the typed $2,000 (it read 2,000 − 100 = $1,900)
    const { plannedMonthlySpend, monthlyEssentials } = require('../../domain/budget');
    expect([plannedMonthlySpend(counted), monthlyEssentials(counted)]).toEqual([2_100, 2_000]);
    // on the table: Out 2,000 + 2,650 = $4,650 every month to November, December 4,650 + 1,200 = $5,850
    expect([row('Nov')[2], row('Dec')[2]]).toEqual(['−$4,650', '−$5,850']);
    // back on the Cash flow tab, Expenses in August: the typed split as typed, no Once in a while row, and the same $2,000 This
    // month deducts (it read Everyday expenses $1,900 · = Total $1,900, the $1,100 / $900 split dropped)
    back('/(tabs)/cashflow');
    fireEvent.press(screen.getByLabelText('Expenses tab'));
    const L = lines(), i = L.indexOf('PLANNED EXPENSES');
    expect(L.slice(i, L.indexOf('ACTUAL EXPENSES'))).toEqual(
      ['PLANNED EXPENSES', '$2,000', 'Bills & fixed', '$1,100', 'Everyday expenses', '$900', '= Total', '$2,000']);
  });

  test('H5 · two bills due the same day: the second listed reads the November End less the first — the money goes to one first', () => {
    const HOME_INS_DEC = { id: 'home', label: 'Home insurance', amount: 2_000, bucket: 'nonmonthly', months: [12], dueDay: 15, tier: 'critical', custom: true };
    onDay(SEP_28);
    start({ ...H1, onboardingProfile: { ...H1.onboardingProfile, monthlySpending: String(800 + 2_000 / 12), spendCats: [GROCERIES, CAR_INS_DEC, HOME_INS_DEC] } });
    open('/bill-calendar'); typeStart('0');
    // Out the $966.67 typed + 2,650 = $3,616.67 a month, $3,617 as printed; December 3,616.67 + 1,200 + 2,000 = 6,816.67. End
    // from $0: Sep 1,383.33 · Oct 2,766.67 · Nov 4,150 · Dec 4,150 + 5,000 − 6,816.67 = 2,333.33. (Until 2026-10-24 Out read
    // $3,350, the typed total taken to hold 100 + 166.67 a month of the two bills: Nov End $4,950.)
    expect([row('Nov'), row('Dec')]).toEqual([['Nov', '+$5,000', '−$3,617', '$4,150'], ['Dec', '+$5,000', '−$6,817', '$2,333']]);
    // both are due Dec 15, so both need their money by Dec 13: the car insurance, listed first, reads November's End, $4,150; the
    // home insurance reads what is left after it, 4,150 − 1,200 = $2,950 — still covered for $2,000. It read the same for both.
    expect(comingUp()).toEqual([
      'Car insurance · $1,200 due Dec 15, 2026', '✓ Covered — about $4,150 there by Dec 13, 2026.',
      'Home insurance · $2,000 due Dec 15, 2026', '✓ Covered — about $2,950 there by Dec 13, 2026.']);
    expect(thereIn(comingUp()[3])).toBe(dollars(row('Nov')[3]) - 1_200);
  });

  test('FIX-BILLS 2026-10-25 · no balance given: the bill is listed and nothing is projected — "No balance to start from — nothing is projected." (MK-CF-M-063); a typed $0 projects', () => {
    onDay(SEP_28); start(H1); open('/bill-calendar');
    expect(comingUp()).toEqual(['Car insurance · $1,200 due Dec 15, 2026', 'No balance to start from — nothing is projected.']);
    expect(lines().join(' ')).not.toMatch(/Short \$1,200|Covered — about/);
    expect(screen.getByLabelText('Car insurance, $1,200 due Dec 15, 2026. No balance to start from — nothing is projected. Opens the editor.')).toBeOnTheScreen();
    typeStart('0');
    expect(comingUp()).toEqual(['Car insurance · $1,200 due Dec 15, 2026', '✓ Covered — about $4,650 there by Dec 13, 2026.']);
  });

  test('every item in the table is placed one way or the other — regular money at the month\'s end, the rest on its day (7 of 7)', () => {
    onDay(SEP_28); start(H2);
    const { grid } = doorAndTable();
    const dec = grid.cells.find((c) => c.calendarMonth === 12)!;
    const regular = dec.billItems.filter((b) => b.regular).map((b) => b.label);
    const dated = dec.billItems.filter((b) => !b.regular).map((b) => `${b.label} on the ${b.day}`);
    expect(regular.length + dated.length).toBe(dec.billItems.length);   // the guard looked: every item, none skipped
    expect(dec.billItems).toHaveLength(7);
    expect(regular).toEqual(['Everyday expenses', 'Mortgage', 'Car loan', 'HELOC', 'Credit card debt payment']);
    expect(dated).toEqual(['Property tax on the 1', 'Car insurance on the 15']);
  });
});
