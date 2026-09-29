/** THE DOOR FOR "what am I worth" — MK-NW-O-003 theNetWorth (Q-NW-1, ruled 2026-09-27:
 *  "Yes - for home, NW tab, and insights").
 *
 *  The law this door exists for: Home, the Net worth tab, Insights and Alternatives get ONE answer,
 *  so they cannot show two numbers for the same money.
 */
import { theNetWorth } from './net-worth';

const acct = (over: any) => ({ tax_bucket: 'TAXABLE', balance: 0, ...over } as any);
const ACCOUNTS = [
  acct({ asset_id: 'c1', label: 'Chase Checking', kind: 'checking', balance: 8000 }),
  acct({ asset_id: 's1', label: 'E*TRADE', kind: 'brokerage', balance: 52000 }),
  acct({ asset_id: 'x1', label: 'Bitcoin', kind: 'crypto', balance: 6000 }),
  acct({ asset_id: 'h1', label: 'Home', kind: 'home', balance: 400000 }),
];
const DEBTS = [
  { debt_id: 'd1', label: 'Mortgage', remaining_balance: 300000, minimum_monthly_payment: 2000, interest_rate_apr: 0.0635, type: 'mortgage' },
  { debt_id: 'd2', label: 'Car loan', remaining_balance: 9800, minimum_monthly_payment: 250, interest_rate_apr: 0.064, type: 'auto' },
] as any;

test('net worth is assets minus debts, and the parts add up to the whole', () => {
  const a = theNetWorth({ uid: 'u', accounts: ACCOUNTS, debts: DEBTS });
  expect(a.assets).toBe(466000);
  expect(a.debts).toBe(309800);
  expect(a.netWorth).toBe(466000 - 309800);
});

test('ONE ANSWER for the four screens: cash, investments and investable are the same figures', () => {
  const a = theNetWorth({ uid: 'u', accounts: ACCOUNTS, debts: [] });
  expect(a.cash).toBe(8000);
  expect(a.investments).toBe(58000);          // brokerage + crypto
  expect(a.investable).toBe(66000);           // everything that is not the house
  expect(a.alternatives).toBe(6000);          // and Alternatives' own screen shows THIS number
  expect(a.byClass.alternatives).toBe(a.alternatives);
});

test('each debt carries what it costs a month, and the total is their sum', () => {
  const a = theNetWorth({ uid: 'u', accounts: [], debts: DEBTS });
  expect(a.debtLines).toHaveLength(2);
  expect(a.monthlyDebtPayments).toBe(a.debtLines.reduce((t, d) => t + d.minimumMonthly, 0));
  expect(a.monthlyDebtPayments).toBe(2250);
});

test('NO BASELINE, NO CHANGE — a movement from a day nobody recorded is not a movement', () => {
  const a = theNetWorth({ uid: 'u', accounts: ACCOUNTS, debts: [], since: null });
  expect(a.investableChangePct).toBeNull();
  const b = theNetWorth({ uid: 'u', accounts: ACCOUNTS, debts: [], investableDaily: {}, since: '2026-01-01' });
  expect(b.investableChangePct).toBeNull();
});

test('with a recorded day, the return is measured against it', () => {
  const a = theNetWorth({
    uid: 'u', accounts: ACCOUNTS, debts: [],
    investableDaily: { '2026-01-02': 60000 }, since: '2026-01-01',
  });
  expect(a.investableChangePct).toBeCloseTo((66000 - 60000) / 60000, 6);
});

test('nothing entered → zero, and no invented movement', () => {
  const a = theNetWorth({ uid: 'u', accounts: [], debts: [] });
  expect(a.netWorth).toBe(0);
  expect(a.debtLines).toEqual([]);
  expect(a.investableChangePct).toBeNull();
});
