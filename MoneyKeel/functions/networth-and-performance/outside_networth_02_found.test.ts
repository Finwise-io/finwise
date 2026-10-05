/* FOUND WHILE FIXING the outside review of batch "networth 02" (2026-10-05) — the same defects one step
 * further on, and four that the reviewer could not see from the cards. Each test names what was wrong.
 * The reviewer's own 75 cases are in outside_networth_02.test.ts; nothing here is counted among them.
 */
import {
  valueFreshness, accountAllowsTicker, assetClassOf, taxTreatmentOf, taxWordsOf, cashTotal, investmentsTotal,
  investableAssets, equitiesTotal, fixedIncomeTotal, alternativesTotal, realEstateTotal, assetAllocation,
  accountDisplayName, accountDisplayNames, accountClassBreakdown, classPortionLabel, holdingClassOf,
} from '../../../src/domain/assets';
import { theNetWorth } from './net-worth';
import { theEmergencyFund } from './emergency-fund';
import { theAccount } from './account';
import { thePerformance } from './performance';

const acct = (over: Record<string, any> = {}) =>
  ({ asset_id: 'a', label: 'Account', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.06, ...over }) as any;
const on = (iso: string) => new Date(`${iso}T12:00:00`);
const pos = (ticker: string, name: string, shares: number, price: number | null, extra: Record<string, any> = {}) =>
  ({ ticker, name, last_price: price ?? undefined, asset_class: 'stock_etf', lots: [{ shares, cost_per_share: 0, purchase_date: '' }], ...extra });
const sum = (b: Record<string, number>) => Object.values(b).reduce((t, v) => t + v, 0);

describe('MK-NW-F-003 valueFreshness — the months that have fully passed', () => {
  test('a value set on the 31st is a month old on the last day of a shorter month', () => {
    expect(valueFreshness(acct({ value_as_of: '2026-01-31' }), on('2026-02-27'))!.monthsOld).toBe(0);
    expect(valueFreshness(acct({ value_as_of: '2026-01-31' }), on('2026-02-28'))!.monthsOld).toBe(1);
    expect(valueFreshness(acct({ value_as_of: '2025-08-31' }), on('2026-02-28'))).toEqual({ asOf: '2025-08-31', monthsOld: 6, stale: true });
  });
  test('the line between five months and six falls on the day the value was set', () => {
    expect(valueFreshness(acct({ value_as_of: '2026-04-15' }), on('2026-10-14'))!.stale).toBe(false);
    expect(valueFreshness(acct({ value_as_of: '2026-04-15' }), on('2026-10-15'))!.stale).toBe(true);
  });
  test('a value dated by its month alone counts from the first of that month', () => {
    expect(valueFreshness(acct({ value_as_of: '2026-04' }), on('2026-10-01'))!.monthsOld).toBe(6);
  });
});

describe('MK-NW-F-011 assetClassOf — a maturity date outranks the name; property that is not a house', () => {
  test('a name that is evidence of cash does not make a dated instrument cash', () => {
    // "settlement" is a cash word; the owner’s rule of 2026-08-04 is that ANY maturity date makes a bond
    expect(assetClassOf(acct({ kind: 'cd', tax_bucket: 'CASH', label: 'Settlement fund certificate', maturity_date: '2027-05-01' }))).toBe('bonds');   // it read cash
    expect(assetClassOf(acct({ kind: 'checking', tax_bucket: 'CASH', label: 'Settlement fund' }))).toBe('cash');   // and with no date the name still decides
    expect(assetClassOf(acct({ label: 'Settlement fund certificate', maturity_date: '2027-05-01', asset_class: 'cash' }))).toBe('cash');   // the person’s own answer outranks both
  });
  test('every property a screen can add is still real estate; only a kind that is not a house moves', () => {
    expect(assetClassOf(acct({ tax_bucket: 'PROPERTY' }))).toBe('real_estate');                                   // an old row with no kind
    expect(assetClassOf(acct({ kind: 'home', tax_bucket: 'PROPERTY' }))).toBe('real_estate');
    expect(assetClassOf(acct({ kind: 'real_estate', tax_bucket: 'PROPERTY', re_use: 'secondary' }))).toBe('real_estate');   // what Add an account writes
    expect(assetClassOf(acct({ kind: 'real_estate', tax_bucket: 'PROPERTY' }))).toBe('real_estate');
    expect(assetClassOf(acct({ kind: 'vehicle', tax_bucket: 'PROPERTY' }))).toBe('personal_property');
    expect(assetClassOf(acct({ kind: 'boat', tax_bucket: 'PROPERTY' }))).toBe('personal_property');
    expect(assetClassOf(acct({ kind: 'boat', tax_bucket: 'PROPERTY', re_use: 'land' }))).toBe('real_estate');     // its use is recorded as land
  });
});

describe('MK-NW-F-012 taxTreatmentOf and MK-NW-F-108 taxWordsOf — a 529 and an HSA say what makes them tax-free', () => {
  test('the words on the account’s page', () => {
    expect(taxWordsOf(acct({ kind: 'college_529' }))).toBe('tax-free for education');                        // it read "taxable"
    expect(taxWordsOf(acct({ kind: 'hsa', tax_bucket: 'PRE_TAX' }))).toBe('pre-tax — tax-free for medical costs');   // it read "taxed when it comes out"
    expect(taxWordsOf(acct({ kind: 'roth_ira', tax_bucket: 'ROTH' }))).toBe('tax-free (Roth)');
    expect(taxWordsOf(acct({ kind: '401k', tax_bucket: 'PRE_TAX' }))).toBe('pre-tax — taxed when it comes out');
    expect(taxWordsOf(acct({ kind: 'brokerage' }))).toBe('taxable');
    expect(taxWordsOf(acct({ kind: 'college_529', tax_treatment: 'taxable' }))).toBe('taxable');             // what the person stated wins
  });
  test('an HSA stays pre-tax in the three-way sort; a 529 is named as a 529', () => {
    expect(taxTreatmentOf(acct({ kind: 'hsa', tax_bucket: 'PRE_TAX' }))).toBe('tax_deferred');
    // the owner’s naming rule (2026-08-11): a tax-advantaged account always shows what it is
    expect(accountDisplayName(acct({ label: 'Kids college', institution: 'Vanguard', kind: 'college_529', mask: '••1234' }))).toBe('Vanguard 529 -1234');   // it read "Vanguard -1234"
  });
});

describe('MK-NW-F-109 holdingClassOf — one test for the dollars, the words and the account’s page', () => {
  test('the person’s own answer outranks the name', () => {
    // GLD is an alternative by its name; they said it is Stocks / Funds, and the split used to ignore them
    const gld = pos('GLD', 'SPDR Gold Shares', 10, 240, { asset_class: 'stock_etf', class_source: 'user' });
    expect(holdingClassOf(gld)).toBe('stocks_etf');
    const b = accountClassBreakdown(acct({ source: 'connected', kind: 'brokerage', balance: 2400, positions: [gld] }))!;
    expect([b.stocks_etf, b.alternatives]).toEqual([2400, 0]);
  });
  test('a CD the broker tags as cash is counted, and worded, as a CD', () => {
    const a = acct({ source: 'connected', kind: 'brokerage', balance: 30000, cash_balance: 0,
      positions: [pos('06051XYZ1', 'BANK OF AMERICA CD 4.5% 2027', 10, 1000, { asset_class: 'cash' }), pos('912797XX1', 'US TREASURY BILL 03/2027', 20, 1000, { asset_class: 'cash' })] });
    expect(accountClassBreakdown(a)!.bonds).toBe(30000);
    expect(classPortionLabel(a, 'bonds')).toBe('1 CD & 1 Treasury in this account');    // it read "bonds & CDs in this account": the words counted by the broker’s tag
    expect(classPortionLabel(a, 'cash')).toBe('cash in this account');
  });
  test('a holding nothing could class is not yet known, until the person says', () => {
    const asked = pos('ZZZZ', '', 10, 5, { class_asked: true });
    expect(holdingClassOf(asked)).toBe('mixed');
    expect(holdingClassOf({ ...asked, class_source: 'user', asset_class: 'bond' })).toBe('bonds');
  });
});

describe('MK-NW-F-027 accountClassBreakdown — a holding with no price, and an account built by hand', () => {
  test('unpriced holdings in two classes: the difference is not yet known, never cash', () => {
    const b = accountClassBreakdown(acct({ source: 'connected', kind: 'brokerage', balance: 104000, cash_balance: 1000,
      positions: [pos('VTI', 'Vanguard Total Stock Market ETF', 400, 250), pos('ACME', 'ACME Corp', 30, null), pos('06051XYZ1', 'Bank CD 4.5% 2027', 2, null, { asset_class: 'bond' })] }))!;
    expect([b.cash, b.stocks_etf, b.mixed]).toEqual([1000, 100000, 3000]);
    expect(sum(b)).toBe(104000);
  });
  test('a big difference with one unpriced holding goes to that holding’s class', () => {
    const b = accountClassBreakdown(acct({ source: 'connected', kind: 'brokerage', label: 'Brokerage', balance: 150000, cash_balance: 0,
      positions: [pos('VTI', 'Vanguard Total Stock Market ETF', 400, 250), pos('06051XYZ1', 'Bank CD 4.5% 2027', 50, null, { asset_class: 'bond' })] }))!;
    expect([b.stocks_etf, b.bonds]).toEqual([100000, 50000]);
  });
  test('with every holding priced the owner’s rule stands: a small difference is cash (DEC-0095)', () => {
    const b = accountClassBreakdown(acct({ source: 'connected', kind: 'brokerage', balance: 100050, cash_balance: 0, positions: [pos('VTI', 'Vanguard Total Stock Market ETF', 400, 250)] }))!;
    expect([b.cash, b.stocks_etf]).toEqual([50, 100000]);
  });
  test('built by hand: its recorded uninvested cash is cash, the rest stays whole; a typed balance has no split', () => {
    const built = acct({ kind: 'brokerage', derive_balance: true, cash_balance: 4212.55, balance: 66092.55, positions: [pos('VTI', 'Vanguard Total Stock Market ETF', 200, null)] });
    const b = accountClassBreakdown(built)!;
    expect(b.cash).toBeCloseTo(4212.55, 4);
    expect(b.stocks_etf).toBeCloseTo(61880, 4);
    expect(sum(b)).toBeCloseTo(66092.55, 4);
    expect(accountClassBreakdown(acct({ kind: 'brokerage', balance: 50000 }))).toBeNull();
    expect(accountClassBreakdown(acct({ source: 'manual', balance: 5000 }))).toBeNull();
    // a purchase recorded without its deposit leaves the sum below zero: that is not cash, and not a loan
    expect(accountClassBreakdown(acct({ kind: 'brokerage', derive_balance: true, cash_balance: -5000, balance: 20000 }))).toBeNull();
    // and a bank account is never split
    expect(accountClassBreakdown(acct({ kind: 'savings', tax_bucket: 'CASH', cash_balance: 100, balance: 9000 }))).toBeNull();
  });
  test('the emergency fund counts that cash, and the account’s own page stays as it was', () => {
    const accounts = [acct({ asset_id: 'c', kind: 'checking', tax_bucket: 'CASH', balance: 3000 }),
      acct({ asset_id: 'b', kind: 'brokerage', derive_balance: true, cash_balance: 4000, balance: 64000, positions: [pos('VTI', 'Vanguard Total Stock Market ETF', 200, null)] })];
    expect(theEmergencyFund({ profile: { monthlySpending: '3500' }, accounts, debts: [], expenses: [], today: on('2026-10-05') } as any).cash).toBe(7000);   // it was 3,000
    expect(theAccount({ account: accounts[1], transactions: [] }).inside).toBeNull();
  });
});

describe('the class totals — every one read from the same split, so they add up', () => {
  const household = [
    acct({ asset_id: 'c', kind: 'checking', tax_bucket: 'CASH', balance: 8000 }),
    acct({ asset_id: 'v', source: 'connected', kind: 'brokerage', label: 'Vanguard', balance: 349333, cash_balance: 838,
      positions: [pos('VTI', 'Vanguard Total Stock Market ETF', 1000, 300), pos('06051XYZ1', 'Bank CD 4.5% 2027', 40, 1000, { asset_class: 'cash' }),
        pos('GLD', 'SPDR Gold Shares', 35, 242.7143)] }),
    acct({ asset_id: 'b', kind: 'brokerage', derive_balance: true, cash_balance: 2000, balance: 22000, positions: [pos('VOO', 'Vanguard S&P 500 ETF', 40, null)] }),
    acct({ asset_id: 'k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000 }),
    acct({ asset_id: 'h', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000 }),
  ];
  test('each class total is its line of the split (they counted whole accounts, so a CD inside a brokerage was "stocks")', () => {
    const by = assetAllocation(household);
    expect(equitiesTotal(household)).toBe(by.stocks_etf);
    expect(fixedIncomeTotal(household)).toBe(by.bonds);
    expect(fixedIncomeTotal(household)).toBeCloseTo(40000, 2);              // the CD inside Vanguard — it was $0
    expect(alternativesTotal(household)).toBe(by.alternatives);
    expect(realEstateTotal(household)).toBe(450000);
  });
  test('cash + investments = cash and investments together, and Net worth prints the same three', () => {
    expect(cashTotal(household)).toBeCloseTo(8000 + 838 + 2000, 2);
    expect(cashTotal(household) + investmentsTotal(household)).toBeCloseTo(investableAssets(household), 2);
    const nw = theNetWorth({ uid: 'u', accounts: household, debts: [] });
    expect([nw.cash, nw.investments, nw.investable]).toEqual([cashTotal(household), investmentsTotal(household), investableAssets(household)]);
  });
});

describe('MK-NW-F-005 accountAllowsTicker — an account that already lists holdings takes a ticker', () => {
  test('one bond typed by hand does not; an alternatives account that lists holdings does', () => {
    expect(accountAllowsTicker(acct({ kind: 'fixed_income', asset_class: 'bonds', face_value: 10000, maturity_date: '2028-01-01' }))).toBe(false);
    expect(accountAllowsTicker(acct({ kind: 'crypto', asset_class: 'alternatives' }))).toBe(false);
    expect(accountAllowsTicker(acct({ kind: 'brokerage', asset_class: 'alternatives', positions: [pos('GBTC', 'Grayscale Bitcoin Trust', 10, 50)] }))).toBe(true);
    expect(accountAllowsTicker(acct({ kind: 'checking', tax_bucket: 'CASH', positions: [pos('X', 'X', 1, 1)] }))).toBe(false);   // a bank account never does
  });
});

describe('MK-NW-F-026 accountDisplayNames — no two alike, however the names fall', () => {
  test('two numbered names already in use are both skipped', () => {
    const n = Object.fromEntries(accountDisplayNames([{ asset_id: 'a1', label: 'Savings' }, { asset_id: 'a2', label: 'Savings' },
      { asset_id: 'a3', label: 'Savings · 1' }, { asset_id: 'a4', label: 'Savings · 2' }] as any));
    expect(n).toEqual({ a1: 'Savings · 3', a2: 'Savings · 4', a3: 'Savings · 1', a4: 'Savings · 2' });
  });
  test('the order is the ids read as text, the same on every device', () => {
    const made = [{ asset_id: 'ast_mg1zk3a0b1', label: 'Joint' }, { asset_id: 'ast_mg1zk2z9x8', label: 'Joint' }];   // the second was made first
    expect(Object.fromEntries(accountDisplayNames(made as any))).toEqual({ ast_mg1zk2z9x8: 'Joint · 1', ast_mg1zk3a0b1: 'Joint · 2' });
  });
});

describe('MK-NW-O-008 thePerformance — what the measured accounts are worth today is read by the function', () => {
  const accounts = [
    acct({ asset_id: 'v', source: 'connected', kind: 'brokerage', label: 'Vanguard', balance: 349333, cash_balance: 838, positions: [pos('VTI', 'Vanguard Total Stock Market ETF', 1000, 348.495)] }),
    acct({ asset_id: 'e', kind: 'fixed_income', balance: 5819 }),
    acct({ asset_id: 'c', kind: 'checking', tax_bucket: 'CASH', balance: 8000 }),
  ];
  const ask = (ending?: number) => thePerformance({ windowStart: '2026-09-05', windowLabel: 'past month', today: '2026-10-05', ending,
    pricedGain: 0, transactions: [], snapshotDays: [], investmentAccountIds: new Set(['v', 'e']), accounts });
  test('each measured account whole — its uninvested cash included — whatever a screen hands in', () => {
    // Home handed in Net worth’s Investments line ($354,314, the cash left to the Cash line); Performance
    // handed in the accounts whole ($355,152). One household, two endings, $838 apart.
    expect(ask(354314).walk.ending).toBe(355152);
    expect(ask(355152).walk.ending).toBe(355152);
    expect(ask().walk.ending).toBe(355152);
    expect(theNetWorth({ uid: 'u', accounts, debts: [] }).investments).toBe(354314);   // Net worth’s line is the classes, as its drawing shows
  });
});

describe('MK-NW-F-025 accountDisplayName — an account added by hand as Roth or 401(k) / IRA says so', () => {
  // the by-hand form records "Taxable · 401(k) / IRA · Roth" as the tax bucket, on a plain brokerage kind
  test('a tax-advantaged account never reads "Brokerage"', () => {
    expect(accountDisplayName(acct({ label: 'My Roth', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'ROTH' }))).toBe('Vanguard Roth');             // it read "Vanguard Brokerage"
    expect(accountDisplayName(acct({ label: 'My Roth', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'ROTH', mask: '••5738' }))).toBe('Vanguard Roth -5738');
    expect(accountDisplayName(acct({ label: 'Rollover', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'PRE_TAX' }))).toBe('Fidelity 401(k) / IRA');   // it read "Fidelity Brokerage"
  });
  test('and nothing else moves: a taxable brokerage, and a kind that already says what it is', () => {
    expect(accountDisplayName(acct({ label: 'Joint', institution: 'Vanguard', kind: 'brokerage' }))).toBe('Vanguard Brokerage');
    expect(accountDisplayName(acct({ label: 'x', institution: 'Vanguard', kind: 'roth_ira', tax_bucket: 'ROTH', mask: '••5738' }))).toBe('Vanguard Roth IRA -5738');
    expect(accountDisplayName(acct({ label: 'x', institution: 'Fidelity', kind: '401k', tax_bucket: 'ROTH' }))).toBe('Fidelity 401(k)');   // a Roth 401(k) is a 401(k)
  });
});
