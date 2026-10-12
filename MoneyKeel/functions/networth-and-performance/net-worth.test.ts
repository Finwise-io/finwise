/** THE DOOR FOR "what am I worth" — MK-NW-O-003 theNetWorth (Q-NW-1, ruled 2026-09-27:
 *  "Yes - for home, NW tab, and insights").
 *
 *  The law this door exists for: Home, the Net worth tab, Insights and Alternatives get ONE answer,
 *  so they cannot show two numbers for the same money.
 */
import { theNetWorth, ledgerGroups } from './net-worth';

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

const recorded = (date: string, rows: [string, number, ('cash' | 'typed')?][]) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: rows.map(([accountId, v, kind]) => ({ date, accountId, cash: kind === 'cash' ? v : 0, statedTotal: null, typedValue: kind === 'cash' ? null : v, currency: 'USD' })),
});

test('NO BASELINE, NO RETURN — a movement from a day nobody recorded is not a movement', () => {
  const a = theNetWorth({ uid: 'u', accounts: ACCOUNTS, debts: [], since: null });
  expect(a.investableChangePct).toBeNull();
  const b = theNetWorth({ uid: 'u', accounts: ACCOUNTS, debts: [], snapshotDays: [], since: '2026-01-01', today: '2026-09-28' });
  expect(b.investableChangePct).toBeNull();
});

test('THE DAY COMPARED FROM MUST BE ON RECORD — a record that begins later gives no figure, never one measured from the later day', () => {
  const later: [string, number, ('cash' | 'typed')?][] = [['c1', 8000, 'cash'], ['s1', 52000], ['x1', 6000]];
  const a = theNetWorth({ uid: 'u', accounts: ACCOUNTS, debts: [], snapshotDays: [recorded('2026-01-02', later)], since: '2026-01-01', today: '2026-09-28' });
  expect(a.investableChangePct).toBeNull();
  // the same record, compared from the day it has: an answer
  const b = theNetWorth({ uid: 'u', accounts: ACCOUNTS, debts: [], snapshotDays: [recorded('2026-01-02', later)], since: '2026-01-02', today: '2026-09-28' });
  expect(b.investableChangePct).toBeCloseTo(0, 10);       // nothing has changed since that day
});

test('THE RETURN ON CASH + INVESTMENTS IS TIME-WEIGHTED — money paid in is not counted as earned, and a paycheck is not a return', () => {
  // 2 Jan: $8,000 checking, $40,000 brokerage, $6,000 bitcoin = $54,000.
  // 1 Jun: $10,000 was paid into the brokerage (worth $44,000 just before, $54,000 after); checking is up $3,000 from pay.
  const days = [recorded('2026-01-02', [['c1', 5000, 'cash'], ['s1', 40000], ['x1', 6000]]),
                recorded('2026-06-01', [['c1', 8000, 'cash'], ['s1', 54000], ['x1', 6000]])];
  const a = theNetWorth({
    uid: 'u', accounts: ACCOUNTS, debts: [], snapshotDays: days, since: '2026-01-02', today: '2026-09-28',
    transactions: [{ id: 'd', type: 'DEPOSIT', account_id: 's1', amount: 10000, date: '2026-06-01' }],
  });
  // MOVED 2026-10-11 by DEC-4439: 4.6713% → 3.1250%, hand-checked: the $10,000 paid in and the $3,000 of pay count all of
  // 1 Jun: 68,000 ÷ (51,000 + 13,000) = 1.0625; then 66,000 ÷ 68,000 → 66,000 ÷ 64,000 − 1 = 3.125%
  // (before: (68,000 − 10,000 − 3,000) ÷ 51,000 × 66,000 ÷ 68,000 − 1, the money counted at the end of its day)
  expect(a.investableChangePct).toBeCloseTo((68000 / 64000) * (66000 / 68000) - 1, 10);
  // a balance change would have said (66,000 − 51,000) ÷ 51,000 = 29.4%
  expect(a.investableChangePct as number).toBeLessThan(0.05);
});

test('nothing entered → zero, and no invented movement', () => {
  const a = theNetWorth({ uid: 'u', accounts: [], debts: [] });
  expect(a.netWorth).toBe(0);
  expect(a.debtLines).toEqual([]);
  expect(a.investableChangePct).toBeNull();
});

/* ── NET WORTH PASS 1 · THE GROUPED LEDGER, WHICH USED TO BE WORKED OUT ON THE SCREEN ─────────────
 *
 *  MK-NW-M-006's own row on the master said it: "this section total is computed on the screen itself",
 *  written by hand 2026-09-08, and the row named NO function. NetWorthScreen grouped the accounts and
 *  totalled each band with an inline reduce over balances — the one thing his CLAUDE.md forbids
 *  outright. Nothing could re-run it and no other screen could ask the same question.
 *
 *  These are the two things that were never checkable: that the bands add to what you own, and that
 *  the SAME accounts grouped the other way add to the same number. A person switches By class /
 *  By institution with one tap, and the two views must not disagree about what they hold.
 */
describe('MK-NW-M-006 and MK-NW-M-008 — the grouped ledger', () => {
  const ACCOUNTS = [
    { asset_id: 'a1', institution: 'Chase', balance: 18000, asset_class: 'cash', tax_bucket: 'CASH', target_return: 0 },
    { asset_id: 'a2', institution: 'Fidelity', balance: 142000, asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', target_return: 0.07 },
    { asset_id: 'a3', institution: 'Fidelity', balance: 24200, asset_class: 'bonds', tax_bucket: 'TAXABLE', target_return: 0.045 },
    { asset_id: 'a4', balance: 310000, asset_class: 'real_estate', tax_bucket: 'TAXABLE', target_return: 0.03 },
    { asset_id: 'a5', institution: 'Vault', balance: 9000, asset_class: 'alternatives', tax_bucket: 'TAXABLE', target_return: 0 },
    { asset_id: 'a6', balance: 21000, asset_class: 'personal_property', tax_bucket: 'PROPERTY', target_return: 0 },
  ] as any[];
  const LABELS: Record<string, string> = {
    cash: 'Cash', stocks_etf: 'Stocks / Funds', bonds: 'Bonds & CDs',
    alternatives: 'Alternatives', real_estate: 'Real estate', personal_property: 'Personal property',
  };
  const labelOf = (a: any) => LABELS[String(a.asset_class)] ?? 'Unclassified';
  const keyOf = (a: any) => String(a.asset_class);
  const sum = (gs: { total: number }[]) => gs.reduce((t, g) => t + g.total, 0);

  test('both groupings add to the same total — switching the view cannot change what you own', () => {
    const byClass = ledgerGroups(ACCOUNTS, 'class', labelOf, keyOf);
    const byInst = ledgerGroups(ACCOUNTS, 'institution', labelOf, keyOf);
    expect(byClass.length).toBe(6);
    expect(byInst.length).toBe(4);              // Chase · Fidelity · No institution set · Vault
    expect(sum(byClass)).toBe(524200);
    expect(sum(byInst)).toBe(sum(byClass));
  });

  test('the bands add to what the door says you own — the ledger and the hero cannot disagree', () => {
    const answer = theNetWorth({ uid: 'x', accounts: ACCOUNTS, debts: [] });
    expect(sum(ledgerGroups(ACCOUNTS, 'class', labelOf, keyOf))).toBe(answer.assets);
  });

  test('MK-NW-M-006 — personal property is its own band, and real estate is not in it', () => {
    const byClass = ledgerGroups(ACCOUNTS, 'class', labelOf, keyOf);
    expect(byClass.find((g) => g.label === 'Personal property')!.total).toBe(21000);
    expect(byClass.find((g) => g.label === 'Real estate')!.total).toBe(310000);
  });

  test('MK-NW-M-008 — an institution names the class mix inside it, biggest first', () => {
    const fidelity = ledgerGroups(ACCOUNTS, 'institution', labelOf, keyOf).find((g) => g.label === 'Fidelity')!;
    expect(fidelity.total).toBe(166200);
    expect(fidelity.accountIds).toEqual(['a2', 'a3']);
    expect(fidelity.mix).toEqual([{ key: 'stocks_etf', total: 142000 }, { key: 'bonds', total: 24200 }]);
  });

  test('an account with no institution is grouped, never dropped', () => {
    const byInst = ledgerGroups(ACCOUNTS, 'institution', labelOf, keyOf);
    const none = byInst.find((g) => g.label === 'No institution set')!;
    expect(none.total).toBe(331000);            // the rental and the car
    expect(sum(byInst)).toBe(524200);           // so nothing is lost
  });

  test('no screen groups or totals the ledger itself any more', () => {
    const screen = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', '..', 'src', 'screens', 'NetWorthScreen.tsx'), 'utf8');
    expect(screen).toMatch(/ledgerGroups\(/);
    expect(screen).not.toMatch(/items\.reduce\(\(t, a\) => t \+ a\.balance, 0\)/);
    expect(screen).not.toMatch(/m\[c\]\.t \+= a\.balance/);
  });
});

/* ── NET WORTH PASS 3 · MK-NW-M-012, WHERE A SCREEN AND ITS DOOR GAVE TWO ANSWERS ────────────────
 *
 *  The Net worth screen printed `dState.total_monthly_debt_service` under the words "Monthly debt
 *  payments" while MK-NW-O-003 answered the same question with `requiredPayment`, which counts a
 *  payment the person has set ABOVE the minimum. On one card — $200 minimum, paid $600 — the screen
 *  said $200 and the door said $600. The screen was not reading the door at all.
 *
 *  Both figures are legitimate and the domain says so outright: the minimum is the OBLIGATION (what
 *  debt-to-income is measured on), the actual is what LEAVES THE ACCOUNT (what cash flow is measured
 *  on). So the door hands out both, named, and the screen names which one it prints. Which one belongs
 *  under those words is HIS decision (Q53) — so the figure on screen is deliberately unchanged.
 */
describe('MK-NW-M-012 — the two monthly debt figures, both named', () => {
  const card = (over: any = {}) => ({
    debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000,
    interest_rate_apr: 0.24, minimum_monthly_payment: 200, ...over,
  }) as any;

  test('they are the same where nothing is paid above the minimum', () => {
    const a = theNetWorth({ uid: 'x', accounts: [], debts: [card()] });
    expect(a.monthlyDebtMinimum).toBe(200);
    expect(a.monthlyDebtPayments).toBe(200);
  });

  test('and they PART where a payment is set above it — which is the whole point of naming both', () => {
    const a = theNetWorth({ uid: 'x', accounts: [], debts: [card({ monthly_payment: 600 })] });
    expect(a.monthlyDebtMinimum).toBe(200);       // the obligation
    expect(a.monthlyDebtPayments).toBe(600);      // what actually leaves the account
  });

  test('a DUE-IN-FULL debt obliges no monthly payment, on either figure', () => {
    // the flag is payment_type, which paymentShape reads — my first draft of this test invented
    // "pays_in_full" and the assertion failed, which is the test doing its job on me
    const a = theNetWorth({ uid: 'x', accounts: [], debts: [card({ minimum_monthly_payment: 1800, payment_type: 'due_in_full' })] });
    expect(a.monthlyDebtMinimum).toBe(0);
    expect(a.monthlyDebtPayments).toBe(0);       // a dated lump is not a monthly outflow
  });

  test('HIS RULING ON Q53 — the screen shows WHAT ACTUALLY LEAVES, read from the door', () => {
    // 2026-09-30, in two words: "what actually leaves". The line showed the MINIMUM each debt obliges;
    // it now shows the money that goes, which counts a payment set above the minimum. The minimum is
    // still on the door for debt-to-income, where the obligation is the right figure.
    const screen = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', '..', 'src', 'screens', 'NetWorthScreen.tsx'), 'utf8');
    expect(screen).toMatch(/Monthly debt payments[\s\S]{0,220}worth\.monthlyDebtPayments/);
    expect(screen).not.toMatch(/Monthly debt payments[\s\S]{0,220}dState\.total_monthly_debt_service/);
    expect(screen).not.toMatch(/Monthly debt payments[\s\S]{0,220}worth\.monthlyDebtMinimum/);
  });
});

/** EVERY MORTGAGE IS ON A PROPERTY (his rule, 2026-10-04, DEC-1925): "It is feasible to have property
 *  without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less
 *  mortgage." */
describe('mortgagesByProperty', () => {
  const { mortgagesByProperty } = require('./net-worth');
  const home = (id: string, label: string) => ({ asset_id: id, label, kind: 'home', tax_bucket: 'PROPERTY', balance: 400000 });
  const mortgage = (id: string, label: string, pay: number, property_id?: string) =>
    ({ debt_id: id, label, debt_type: 'MORTGAGE', remaining_balance: 200000, interest_rate_apr: 0.06, minimum_monthly_payment: pay, property_id });
  const THREE = [home('p1', 'Home'), home('p2', 'Lake house'), home('p3', 'Condo')];

  test('three properties, two mortgages that say which property: fine, and a property with none is fine', () => {
    const c = mortgagesByProperty(THREE, [mortgage('m1', 'Chase', 2400, 'p1'), mortgage('m2', 'Wells Fargo', 1500, 'p3')]);
    expect([c.properties, c.mortgages, c.ok, c.sentence]).toEqual([3, 2, true, '']);
    expect(c.byProperty.map((r: any) => [r.property, r.mortgage, r.payment])).toEqual([['Home', 'Chase', 2400], ['Lake house', null, 0], ['Condo', 'Wells Fargo', 1500]]);
  });

  test('three properties, FOUR mortgages: the fourth is on no property, and it is named', () => {
    const c = mortgagesByProperty(THREE, [mortgage('m1', 'A', 1, 'p1'), mortgage('m2', 'B', 1, 'p2'), mortgage('m3', 'C', 1, 'p3'), mortgage('m4', 'Extra loan', 1)]);
    expect(c.ok).toBe(false);
    expect(c.unmatched).toEqual([{ id: 'm4', label: 'Extra loan' }]);
    expect(c.sentence).toBe('Your mortgage “Extra loan” is not on a property. A mortgage is always on a property — open it and say which one.');
  });

  test('a mortgage with no property at all in Net worth is on no property', () => {
    const c = mortgagesByProperty([], [mortgage('m1', 'Home mortgage', 2000)]);
    expect([c.ok, c.unmatched.length]).toEqual([false, 1]);
  });

  test('two mortgages naming one property: the second is not placed — one mortgage to a property', () => {
    const c = mortgagesByProperty(THREE, [mortgage('m1', 'First', 1, 'p1'), mortgage('m2', 'Second', 1, 'p1')]);
    expect(c.unmatched).toEqual([{ id: 'm2', label: 'Second' }]);
    expect(c.sentence).toMatch(/^Your mortgage “Second” is not on a property/);
  });

  test('mortgages stored before the rule name no property: placed only where there is one honest answer', () => {
    // by its own name — the name the app gives a mortgage typed with a property
    expect(mortgagesByProperty(THREE, [mortgage('m1', 'Lake house mortgage', 1500)]).byProperty[1].mortgage).toBe('Lake house mortgage');
    // the one mortgage left and the one property left
    expect(mortgagesByProperty([home('p1', 'Home')], [mortgage('m1', 'Chase', 2400)]).ok).toBe(true);
    // two properties free and one unnamed mortgage: not guessed
    const c = mortgagesByProperty([home('p1', 'Home'), home('p2', 'Condo')], [mortgage('m1', 'Chase', 2400)]);
    expect([c.ok, c.unmatched.map((u: any) => u.label)]).toEqual([false, ['Chase']]);
    // two of them: the sentence counts
    expect(mortgagesByProperty(THREE, [mortgage('m1', 'A', 1), mortgage('m2', 'B', 1)]).sentence).toBe('2 mortgages are not on a property. A mortgage is always on a property — open each and say which one.');
  });

  test('a card or a car loan is not a mortgage and is never asked for a property', () => {
    const c = mortgagesByProperty([], [{ debt_id: 'c', label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 900, interest_rate_apr: 0.2, minimum_monthly_payment: 40 }] as any);
    expect([c.mortgages, c.ok]).toEqual([0, true]);
  });

  test('theNetWorth hands the same answer to the screen', () => {
    const n = theNetWorth({ uid: 'u', accounts: THREE as any, debts: [mortgage('m1', 'Chase', 2400, 'p1')] as any });
    expect(n.mortgageCheck.ok).toBe(true);
    expect(n.mortgageCheck.byProperty[0]).toMatchObject({ property: 'Home', mortgage: 'Chase' });
  });
});
