/** A DEBT BOX LEFT BLANK IS NEVER SAVED AS $0 OR 0% (2026-10-25, tenet 3, DEC-3523 — found by the Cash flow measurer).
 *
 *  The person adds a debt by hand on Add an account, leaves a box blank, and looks where the debt shows next: Net worth, the Cash
 *  flow tab's Debts and This month. Add an account v02 stars a debt's balance, rate and payment (phone 6), so Save waits for all
 *  three — the rate was starred and never waited for, so a blank rate was saved as 0%. A mortgage added with its property asks its
 *  payment without a star (DEC-1925): left blank it is saved as not entered — it was saved as $0, and the Debts tab's payoff read
 *  "never at this rate". Every figure below is worked by hand; the rows on Add an account v02 and cash-flow_v01 of 2026-10-25 say so.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const textOf = (n: any): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n?.children ?? []).map(textOf).join(''));
/** Every line a person reads, in order: each Text with what is nested in it. */
const lines = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};

/** A working household: $7,200 a month take-home, $3,400 of planned spending, $5,000 in checking, a $14,000 car loan at 6.9%, $250 a month. */
const CAR = { debt_id: 'car', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14_000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' };
const HOUSEHOLD = (liabilities: any[] = [CAR]) => ({
  onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self', nwSeeded: true,
  onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly',
    taxMode: 'manual', manualTaxRate: '0', monthlySpending: '3400', spendCats: [{ id: 'groceries', label: 'Groceries', amount: 3400, bucket: 'flexible', tier: 'need' }] },
  assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5_000 }],
  liabilities,
});
const setup = (liabilities?: any[]) => {
  jest.useFakeTimers({ now: new Date('2026-10-25T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  useStore.getState().resetAll(); useStore.setState(HOUSEHOLD(liabilities) as any);
};
afterEach(() => jest.useRealTimers());
const debts = () => (useStore.getState() as any).liabilities as any[];
const AddAccount = () => { const C = require('../AddAccountScreen').default; return <C />; };
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const look = (which: 'networth' | 'debts' | 'month') => {
  const C = which === 'networth' ? require('../NetWorthScreen').default : require('../CashFlowScreen').default;
  const r = render(<C />);
  if (which === 'debts') fireEvent.press(screen.getByLabelText('Debts tab'));
  const ls = lines(); r.unmount(); return ls;
};

describe('a card added by hand with its balance and payment left blank', () => {
  test('Save waits: nothing is saved, and Net worth, Debts and This month show no card and no $0', () => {
    setup([]);
    const r = render(<AddAccount />);
    fireEvent.press(screen.getByLabelText('Debt'));
    type('Account name', 'Visa card');
    type('Interest rate percent', '22.9');
    // the balance and the payment left blank: the button is faded and does nothing (both starred on the drawing, phone 6)
    const save = screen.getByLabelText('Save this account');
    expect(save.props.accessibilityState?.disabled ?? save.props.disabled).toBe(true);
    fireEvent.press(save);
    expect(debts()).toEqual([]);
    r.unmount();
    const nw = look('networth');
    expect(nw.join(' ')).not.toMatch(/Visa card/);
    const at = nw.indexOf('DEBTS');   // the Debts bar reads $0 and the one empty line, as on a first day (DEC-4528)
    // since 2026-10-31 (NW3-10) in frame C's shape: the line, then the door row with its › (it was one line with the door inline)
    expect(nw.slice(at, at + 6)).toEqual(['DEBTS', 'ⓘ', '$0', 'Nothing entered yet.', 'Add your debts', '›']);
    const dt = look('debts');
    expect(dt.join(' ')).not.toMatch(/Visa card|\$0\/month in payments/);
    expect(dt).toContain('Nothing entered yet. Add your debts ›');
    expect(look('month').join(' ')).not.toMatch(/Visa card/);
  });

  // THE OLD ANSWER, KEPT (NW3-10, 2026-10-31): Net worth's empty Debts was one line with the door inline
  test.failing('the old answer: Net worth reads DEBTS $0, then "Nothing entered yet. Add your debts ›" on one line', () => {
    setup([]);
    const nw = look('networth');
    const at = nw.indexOf('DEBTS');
    expect(at).toBeGreaterThan(0);
    expect(nw.slice(at, at + 4)).toEqual(['DEBTS', 'ⓘ', '$0', 'Nothing entered yet. Add your debts ›']);
  });
  test('the rate left blank: Save waits too — it was saved as 0% — and with all three typed the card is saved as typed', () => {
    setup([]);
    render(<AddAccount />);
    fireEvent.press(screen.getByLabelText('Debt'));
    type('Account name', 'Visa card'); type('Balance', '3200'); type('Minimum monthly payment', '90');
    fireEvent.press(screen.getByLabelText('Save this account'));
    expect(debts()).toEqual([]);                                        // no rate, no save
    type('Interest rate percent', '22.9');
    fireEvent.press(screen.getByLabelText('Save this account'));
    expect(debts()).toHaveLength(1);
    expect(debts()[0]).toMatchObject({ label: 'Visa card', remaining_balance: 3_200, minimum_monthly_payment: 90 });
    expect(debts()[0].interest_rate_apr).toBeCloseTo(0.229, 10);         // 22.9 ÷ 100
  });
});

describe('a mortgage added with its property, its payment left blank', () => {
  const addLakeHouse = (payment: string | null) => {
    setup();
    const r = render(<AddAccount />);
    fireEvent.press(screen.getByLabelText('Real estate'));
    type('Account name', 'Lake house'); type('Balance', '400000'); type('Amount still owed', '300000');
    // the box opens empty: no "$0", and since R16 (2026-10-31, the Add an account v02 row of that date) no example either; it showed $2,400
    expect(screen.getByLabelText('Monthly mortgage payment').props.placeholder ?? '').toBe('');
    if (payment != null) type('Monthly mortgage payment', payment);
    fireEvent.press(screen.getByLabelText('Save this account'));
    r.unmount();
    return debts().find((d) => d.debt_type === 'MORTGAGE');
  };

  // THE OLD ANSWER, KEPT (R16, 2026-10-31): the payment box showed a grey $2,400 as its example; it opens empty now
  test.failing('the old answer: the monthly mortgage payment box shows the example $2,400', () => {
    setup();
    render(<AddAccount />);
    fireEvent.press(screen.getByLabelText('Real estate'));
    type('Account name', 'Lake house'); type('Balance', '400000'); type('Amount still owed', '300000');
    expect(screen.getByPlaceholderText('$2,400')).toBeTruthy();
  });

  test('it is saved as not entered — never $0 — and every screen that reads it says “payment not entered”', () => {
    const m = addLakeHouse(null);
    expect(m).toMatchObject({ label: 'Lake house mortgage', remaining_balance: 300_000 });
    expect(m.minimum_monthly_payment).toBeUndefined();                  // it was 0
    expect(m.monthly_payment).toBeUndefined();

    // NET WORTH: the debts are $300,000 + $14,000 = $314,000; the payments the emergency fund counts are the car's $250 alone,
    // and the mortgage is named as left out
    const nw = look('networth');
    expect(nw).toContain('−$314,000');
    expect(nw).toContain('Both include $250/month of debt payments you cannot stop.');
    expect(nw).toContain('Lake house mortgage · payment not entered, so it is not included. Enter it to include.');

    // THE DEBTS TAB: the total owed counts the balance; the payments are the car's $250; the mortgage named, its row in words,
    // and no payoff date guessed from a $0 payment. THE MORTGAGE'S RATE, which this form never asks, is NOT ENTERED (2026-10-25,
    // FIX-MONTH; tenet 3; cash-flow_v01's row of that date) — it was saved as 0% and read "0.00% · … · ~$0/month interest": so there
    // is no interest figure (the car's $14,000 × 6.9% ÷ 12 = $80.50 alone would leave the mortgage's out), and the line names it
    const dt = look('debts');
    expect(dt).toContain('$314,000');
    expect(dt).toContain('across 2 debts · $250/month in payments');
    expect(dt).toContain('Lake house mortgage · payment not entered, so it is not included. Enter it to include.');
    expect(dt).toContain('Lake house mortgage’s rate is not entered, so there is no interest figure — we won’t guess one.');
    expect(dt.find((l) => /^rate not entered · on Lake house/.test(l))).toBe('rate not entered · on Lake house · payment not entered');
    expect(dt).toContain('Lake house mortgage’s payment and rate are not entered, so there is no payoff date — we won’t guess one.');
    expect(dt.join(' ')).not.toMatch(/0\.00%/);
    expect(m.interest_rate_apr).toBeUndefined();                        // it was 0
    expect(dt.join(' ')).not.toMatch(/never at this rate|balance grows faster|\$0\/month min|NaN|undefined/);

    // THIS MONTH: the mortgage's row reads "payment not entered", and the month refuses a planned surplus rather than guess one
    const tm = look('month');
    const at = tm.indexOf('Lake house mortgage');
    expect(at).toBeGreaterThan(0);
    expect(tm.slice(at, at + 4)).toContain('payment not entered');
    expect(tm).toContain('Lake house mortgage’s payment is not entered, so there is no planned surplus — we won’t guess one.');
  });

  test('a typed 0 is $0, entered — no line names its payment; the payoff waits only for the rate this form never asks (2026-10-25, FIX-MONTH)', () => {
    const m = addLakeHouse('0');
    expect(m.minimum_monthly_payment).toBe(0);
    const dt = look('debts');
    expect(dt.join(' ')).not.toMatch(/payment not entered|payment is not entered|payment and rate/);
    expect(dt.find((l) => /^rate not entered · on Lake house/.test(l))).toBe('rate not entered · on Lake house · $0/month min');
    expect(dt).toContain('Lake house mortgage’s rate is not entered, so there is no payoff date — we won’t guess one.');
  });
  test.failing('the answers before 2026-10-25 (FIX-MONTH), kept: the mortgage saved at 0% — "0.00% · … · ~$0/month interest" — and a payoff run on it', () => {
    addLakeHouse(null);
    const dt = look('debts');
    expect(dt.find((l) => /^0\.00% · on Lake house/.test(l))).toBe('0.00% · on Lake house · payment not entered · ~$0/month interest');
  });
});
