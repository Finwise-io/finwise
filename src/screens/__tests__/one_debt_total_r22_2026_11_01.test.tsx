/** ONE DEBT TOTAL, NET WORTH'S SIDE (2026-11-01, FX-NW; the lead's ruling R22 — every dollar is counted once; Net worth v08 row of
 *  that date). A student loan entered in setup is a debt: the Cash flow tab's Debts counted it in YOUR DEBT (FX-CF-A), and Net worth's
 *  DEBTS and its net worth left it out, so two screens gave one household two debt totals. Both now read the one reader of the setup
 *  loans, src/domain/debt setupStudentLoans / setupLoansNotEntered, and a setup loan that is also entered as a debt is that debt.
 *
 *  The household: $5,000 of checking, a $3,200 Visa and a $9,800 car loan entered as debts, and a $30,000 student loan entered in
 *  setup. By hand: DEBTS = 30,000 + 3,200 + 9,800 = $43,000 on both screens; net worth = 5,000 − 43,000 = −$38,000.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { setupLoansNotEntered, setupStudentLoans, setupLoanDebts } from '../../domain/debt';
import { theNetWorth } from '../../../MoneyKeel/functions/networth-and-performance/net-worth';
import { netWorthInputs } from '../../hooks/useNetWorthInputs';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const textOf = (n: any): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n?.children ?? []).map(textOf).join(''));
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

const VISA = { debt_id: 'visa', label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 3_200, interest_rate_apr: 0.229, minimum_monthly_payment: 90 };
const CAR = { debt_id: 'car', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9_800, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' };
const LOAN = { label: 'Student loan', amount: '30000', apr: '5.5', termYears: '10' };   // no month paid out entered: owed today (R22a)
const HOUSEHOLD = (liabilities: any[], loans: any[] = [LOAN]) => ({
  onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self', nwSeeded: true,
  onboardingProfile: { status: 'employed', incomeSources: ['employment', 'loans'], birthYear: '1990', baseSalary: '6000', salaryMode: 'takehome', salaryFreq: 'monthly',
    taxMode: 'manual', manualTaxRate: '0', monthlySpending: '3000', loans },
  assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5_000 }],
  liabilities,
});
const setup = (liabilities: any[], loans?: any[]) => {
  jest.useFakeTimers({ now: new Date('2026-11-01T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  useStore.getState().resetAll(); useStore.setState(HOUSEHOLD(liabilities, loans) as any);
};
afterEach(() => jest.useRealTimers());

/** Net worth's DEBTS bar and Debts' YOUR DEBT, as each screen prints them */
const netWorthDebts = () => {
  const C = require('../NetWorthScreen').default; const r = render(<C />);
  const ls = lines(); r.unmount();
  return { debts: ls[ls.indexOf('DEBTS') + 2], rows: ls, total: ls[3] };
};
const debtsTab = () => {
  const C = require('../CashFlowScreen').default; const r = render(<C />);
  fireEvent.press(screen.getByLabelText('Debts tab'));
  const ls = lines(); r.unmount();
  return ls[ls.indexOf('YOUR DEBT') + 1];
};

describe('the one reader: which setup loans no debt entered is', () => {
  test('nothing entered as a student loan: the $30,000 setup loan counts', () => {
    expect(setupLoansNotEntered({ loans: [LOAN] }, [VISA, CAR] as any).map((l) => [l.label, l.amount])).toEqual([['Student loan', 30_000]]);
    expect(setupStudentLoans({ loans: [LOAN] }, [VISA, CAR] as any)).toEqual({ owed: 30_000, count: 1 });
    expect(setupStudentLoans({ loans: [LOAN] })).toEqual({ owed: 30_000, count: 1 });              // the Debts tab's old call, unchanged
  });
  test('the same loan entered as a debt — by name, by amount, or saved from its row — is that debt: nothing left over', () => {
    const byName = { debt_id: 's', label: 'student LOAN', debt_type: 'STUDENT_LOAN', remaining_balance: 27_500 };   // paid down since
    const byAmount = { debt_id: 's', label: 'Navient', debt_type: 'STUDENT_LOAN', remaining_balance: 30_000.4 };   // $30,000 to the dollar
    const fromRow = { debt_id: 's', label: 'My loan', debt_type: 'OTHER', remaining_balance: 12_000, setup_loan: 0 };
    for (const d of [byName, byAmount, fromRow]) expect(setupLoansNotEntered({ loans: [LOAN] }, [VISA, CAR, d] as any)).toEqual([]);
    // not the same loan: another kind with the same amount, or a student loan of another name and amount
    expect(setupLoansNotEntered({ loans: [LOAN] }, [{ debt_id: 'x', label: 'Boat', debt_type: 'OTHER', remaining_balance: 30_000 }] as any)).toHaveLength(1);
    expect(setupLoansNotEntered({ loans: [LOAN] }, [{ debt_id: 'x', label: 'Navient', debt_type: 'STUDENT_LOAN', remaining_balance: 8_000 }] as any)).toHaveLength(1);
  });
  test('one debt is one setup loan at most: two $30,000 setup loans and one $30,000 student-loan debt leave one', () => {
    const two = { loans: [LOAN, { label: '', amount: '30000' }] };
    expect(setupStudentLoans(two, [{ debt_id: 's', label: 'Student loan', debt_type: 'STUDENT_LOAN', remaining_balance: 30_000 }] as any)).toEqual({ owed: 30_000, count: 1 });
  });
  test('as a debt row: its name, its amount, and the payment setup gave — $30,000 at 5.5% over 10 years is $325.58 a month', () => {
    const [d] = setupLoanDebts({ loans: [LOAN] }, []);
    // by hand: r = 0.055 ÷ 12 = 0.0045833; n = 120; 30,000 × r ÷ (1 − (1 + r)^−120) = 325.58
    const r = 0.055 / 12;
    expect(Math.round(30_000 * r / (1 - Math.pow(1 + r, -120)) * 100) / 100).toBe(325.58);
    expect(d).toMatchObject({ debt_id: 'setup-loan-0', label: 'Student loan (from setup)', debt_type: 'STUDENT_LOAN', remaining_balance: 30_000, setup_loan: 0 });   // one name on every screen (NW6-03)
    expect(d.interest_rate_apr).toBeCloseTo(0.055, 12);
    // R22d (2026-11-02, FX-CF-A): the payment is not assumed — when repayment starts is never asked in setup; the outlook keeps $325.58 as an estimate
    expect(d.minimum_monthly_payment).toBeUndefined();
    // no rate given in setup: the rate and the payment are not entered, never 0
    const [bare] = setupLoanDebts({ loans: [{ amount: '12000' }] }, []);
    expect([bare.label, bare.interest_rate_apr, bare.minimum_monthly_payment]).toEqual(['Student loan (from setup)', undefined, undefined]);
  });
});

test.failing('R22d · the round-5 answer, kept (FX-CF-A, 2026-11-02): the setup loan’s debt row carried the $325.58 worked from its rate and term', () => {
  const [d] = setupLoanDebts({ loans: [LOAN] }, []);
  expect(Math.round(d.minimum_monthly_payment * 100) / 100).toBe(325.58);
});

describe('Debts and Net worth agree on one household (the v08 row of 2026-11-01)', () => {
  test('a $30,000 setup loan, a $3,200 Visa and a $9,800 car loan: $43,000 on both screens, net worth −$38,000', () => {
    setup([VISA, CAR]);
    const nw = netWorthDebts();
    expect(nw.debts).toBe('−$43,000');                                       // 30,000 + 3,200 + 9,800
    expect(nw.rows).toContain('Student loan (from setup)');                    // its own row under DEBTS, named as on Debts (NW6-03)
    expect(nw.total).toMatch(/^−\$38,000/);                                     // 5,000 − 43,000
    expect(debtsTab()).toBe('$43,000');
    expect(theNetWorth(netWorthInputs(useStore.getState())).debts).toBe(43_000);
  });
  test('the same loan also entered as a debt: still $43,000 on both — counted once', () => {
    setup([VISA, CAR, { debt_id: 'sl', label: 'Student loan', debt_type: 'STUDENT_LOAN', remaining_balance: 30_000, interest_rate_apr: 0.055, minimum_monthly_payment: 325.58 }]);
    expect(netWorthDebts().debts).toBe('−$43,000');
    expect(debtsTab()).toBe('$43,000');
    expect(netWorthInputs(useStore.getState()).debts.map((d: any) => d.debt_id)).toEqual(['visa', 'car', 'sl']);   // no setup row beside it
  });
  test('no setup loan: nothing changes — $13,000 on both', () => {
    setup([VISA, CAR], []);
    expect(netWorthDebts().debts).toBe('−$13,000');                           // 3,200 + 9,800
    expect(debtsTab()).toBe('$13,000');
  });
  test('the setup loan’s row opens the debt editor; saving it there makes it an entered debt — still $43,000, once', () => {
    setup([VISA, CAR]);
    const C = require('../NetWorthScreen').default; render(<C />);
    fireEvent.press(screen.getByLabelText(/^Student loan \(from setup\), you owe \$30,000\. Opens the editor\.$/));
    expect(screen.queryByLabelText('Remove debt')).toBeNull();                // a setup answer is not removed from here
    fireEvent.press(screen.getByLabelText('Save debt'));
    const saved = (useStore.getState() as any).liabilities;
    expect(saved).toHaveLength(3);
    expect(saved.find((d: any) => d.setup_loan === 0)).toMatchObject({ label: 'Student loan', remaining_balance: 30_000, debt_type: 'STUDENT_LOAN' });   // saved, it is an entered debt, named as the editor names it (v08 row of 2026-11-02)
    expect(netWorthInputs(useStore.getState()).debts).toHaveLength(3);         // the saved debt is that loan: no setup row beside it
    expect(theNetWorth(netWorthInputs(useStore.getState())).debts).toBe(43_000);
  });
});

/** R22a (the lead's ruling of 2026-11-01; the v08 and cash-flow v01 rows of that date): nothing is owed before the money is lent. A setup
 *  loan is owed from its first month paid out; one still ahead is not counted and is said in words; one with no month counts, and says so. */
describe('R22a — a setup loan is owed from its first month paid out', () => {
  const LATER = { label: 'Student loan', amount: '30000', months: [9], year: '2027' };
  const SAID_LATER = 'A $30,000 student loan starts in Sep 2027, not counted until then.';
  const SAID_UNDATED = 'The $30,000 student loan has no start month entered, so it counts as owed today.';
  test('the one rule, worked on Nov 1, 2026: Sep 2027 is later; Sep 2026 and Nov 2026 are owed; no month is owed', () => {
    const today = new Date('2026-11-01T12:00:00');
    const at = (l: any) => setupStudentLoans({ loans: [l] }, [], today).owed;
    expect(at(LATER)).toBe(0);
    expect(at({ ...LATER, year: '2026' })).toBe(30_000);                       // Sep 2026: paid out already
    expect(at({ ...LATER, months: [11, 12], year: '2026' })).toBe(30_000);     // its first month, Nov 2026, has arrived
    expect(at({ ...LATER, months: [12], year: '2026' })).toBe(0);              // Dec 2026: next month
    expect(at({ label: 'Student loan', amount: '30000' })).toBe(30_000);       // no month entered: owed today
    expect(at({ ...LATER, year: '' })).toBe(30_000);                           // a month but no year: no start month, owed today
    expect(setupLoanDebts({ loans: [LATER] }, [], today)).toEqual([]);
  });
  test('Net worth and Debts on Nov 1, 2026: a $30,000 loan starting Sep 2027, a $3,200 Visa, a $9,800 car loan — $13,000 on both, and the sentence on both', () => {
    setup([VISA, CAR], [LATER]);
    const nw = netWorthDebts();
    expect(nw.debts).toBe('−$13,000');                                       // 3,200 + 9,800: the loan is not owed yet
    expect(nw.rows).not.toContain('Student loan (from setup)');
    expect(nw.rows).toContain(SAID_LATER);
    expect(nw.total).toMatch(/^−\$8,000/);                                     // 5,000 − 13,000
    const C = require('../CashFlowScreen').default; const r = render(<C />);
    fireEvent.press(screen.getByLabelText('Debts tab'));
    const ls = lines(); r.unmount();
    expect(ls[ls.indexOf('YOUR DEBT') + 1]).toBe('$13,000');
    expect(ls).toContain(SAID_LATER);
  });
  test('the same loan once its month has come (first paid out Sep 2026): $43,000 on both, nothing said', () => {
    setup([VISA, CAR], [{ ...LATER, year: '2026' }]);
    const nw = netWorthDebts();
    expect(nw.debts).toBe('−$43,000');                                       // 30,000 + 3,200 + 9,800
    expect(nw.rows).not.toContain(SAID_LATER);
    expect(debtsTab()).toBe('$43,000');
  });
  test('no start month entered: counted, $43,000 on both, and both say the month is not entered', () => {
    setup([VISA, CAR]);                                                       // LOAN has no months
    expect(netWorthDebts().rows).toContain(SAID_UNDATED);
    const C = require('../CashFlowScreen').default; const r = render(<C />);
    fireEvent.press(screen.getByLabelText('Debts tab'));
    const ls = lines(); r.unmount();
    expect(ls[ls.indexOf('YOUR DEBT') + 1]).toBe('$43,000');
    expect(ls).toContain(SAID_UNDATED);
  });
});

// THE OLD ANSWER, KEPT (R22, 2026-11-01): Net worth's DEBTS left the setup loan out
test.failing('the old answer: Net worth reads DEBTS −$13,000 beside a $30,000 setup loan', () => {
  setup([VISA, CAR]);
  expect(netWorthDebts().debts).toBe('−$13,000');
});
// THE OLD ANSWER, KEPT (R22a, 2026-11-01): a loan first paid out in Sep 2027 was counted on Nov 1, 2026
test.failing('the old answer: a setup loan starting Sep 2027 counts in Debts on Nov 1, 2026 — $43,000', () => {
  setup([VISA, CAR], [{ label: 'Student loan', amount: '30000', months: [9], year: '2027' }]);
  expect(debtsTab()).toBe('$43,000');
});

/** NW6-03 (2026-11-02; v08 row of that date): one name on both screens — 'Student loan (from setup)', given once by setupLoanDebts */
test('NW6-03 · the setup loan is ‘Student loan (from setup)’ on Net worth and on Debts', () => {
  setup([VISA, CAR]);
  expect(netWorthDebts().rows).toContain('Student loan (from setup)');
  const C = require('../CashFlowScreen').default; const r = render(<C />);
  fireEvent.press(screen.getByLabelText('Debts tab'));
  const ls = lines(); r.unmount();
  expect(ls).toContain('Student loan (from setup)');
  expect(ls.join(' ')).not.toMatch(/\(from setup\) \(from setup\)/);
});
test.failing('the old answer (NW6-03): Net worth names the setup loan ‘Student loan’', () => {
  setup([VISA, CAR]);
  expect(netWorthDebts().rows).toContain('Student loan');
});

/** CF6-02 (2026-11-02; v08 row of that date): only a later setup loan is entered — Net worth does not say 'Nothing entered yet.' */
test('CF6-02 · no debts, a $30,000 setup loan starting Sep 2027: DEBTS $0, the loan’s sentence, the door — no ‘Nothing entered yet.’', () => {
  setup([], [{ label: 'Student loan', amount: '30000', months: [9], year: '2027' }]);
  const { debtsEntered } = require('../../domain/debt');
  expect(debtsEntered({ loans: [{ amount: '30000', months: [9], year: '2027' }] }, [])).toBe(true);
  expect(debtsEntered({ loans: [] }, [])).toBe(false);
  const C = require('../NetWorthScreen').default; render(<C />);
  const ls = lines(); const at = ls.lastIndexOf('DEBTS');
  expect(ls.slice(at, at + 6)).toEqual(['DEBTS', 'ⓘ', '$0', 'A $30,000 student loan starts in Sep 2027, not counted until then.', 'Add your debts', '›']);
});
test.failing('the old answer (CF6-02): ‘Nothing entered yet.’ above the later loan', () => {
  setup([], [{ label: 'Student loan', amount: '30000', months: [9], year: '2027' }]);
  const C = require('../NetWorthScreen').default; render(<C />);
  const ls = lines(); expect(ls[ls.lastIndexOf('DEBTS') + 3]).toBe('Nothing entered yet.');
});

/** R22d on Net worth (2026-11-02; v08 row of that date): the setup loan's payment is not assumed — named by its reason */
test('R22d · the emergency fund names the setup loan by why its payment is not included', () => {
  setup([VISA, CAR]);
  const C = require('../NetWorthScreen').default; render(<C />);
  const ls = lines();
  expect(ls).toContain('Student loan (from setup): when repayment starts is not entered, so its payment is not included.');
  expect(ls.join(' ')).not.toMatch(/Student loan \(from setup\) payment not entered/);
});
test.failing('the old answer (R22d): ‘Student loan (from setup) payment not entered, so it is not included.’', () => {
  setup([VISA, CAR]);
  const C = require('../NetWorthScreen').default; render(<C />);
  expect(lines().join(' ')).toMatch(/Student loan \(from setup\) payment not entered, so it is not included\./);
});
