/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "networth 02 final", re-audited by Claude.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/networth02_final_claude.json
 * (120 cases, five per function, 24 functions). Every expected answer below is the reviewer's, copied as
 * it wrote it; only its plain input names are mapped onto the app's fields:
 *   · its kind "529" is 'college_529', "stocks" is 'stocks_etf', "other" is 'other_asset', "cash_management"
 *     is 'cash_mgmt'; a "bank account" is a checking / savings / high-yield savings kind by its name;
 *   · "linked to the broker" is source 'connected' with cash_balance = its uninvested cash;
 *   · "built by hand from its own holdings" is derive_balance with cash_balance, and its balance is what the
 *     app stores for such an account: the cash plus every holding at its price;
 *   · a holding's "cls" / "stored_tag" is the class stored when it arrived ('stock_etf' · 'bond' · 'other' ·
 *     'cash'); "person_answer" is class_source 'user'; "marked_asked" is class_asked;
 *   · "REFUSES" is null (or undefined) from the app; "unclassified" is the app's 'mixed'.
 * Money is compared to the cent and percents to four decimals of a share. Display strings ("shown") are
 * not compared — only the exact figures. Where the reviewer wrote RULE UNCLEAR, the reading the app holds
 * is named on the line.
 *
 * A case the app fails is a finding — never fixed by changing the expected value here.
 */
import {
  valueFreshness, portfolioActualReturn, accountAllowsTicker, assetKind, maturityClass, wrapperAccount, assetClassOf,
  taxTreatmentOf, taxWordsOf, cashTotal, investmentsTotal, investableAssets, accountDisplayName, accountDisplayNames,
  holdingClassOf, accountClassBreakdown, classPortionLabel,
} from '../../../src/domain/assets';
import { isAlternative, alternativesSummary } from '../../../src/domain/alternatives';
import { assetClassForSymbol } from '../../../src/domain/import/holdingsImport';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';
import { theNetWorth } from './net-worth';
import { thePerformance, windowStartKey } from './performance';

// ── input mapping ─────────────────────────────────────────────────────────────────────────────────
const KIND: Record<string, string> = { '529': 'college_529', stocks: 'stocks_etf', other: 'other_asset', cash_management: 'cash_mgmt' };
const CASH_KINDS = ['checking', 'savings', 'hysa', 'money_market', 'cd', 'cash_mgmt'];
const PROPERTY_KINDS = ['home', 'vehicle', 'valuables', 'real_estate', 'boat'];
const PRE_TAX_KINDS = ['401k', 'trad_ira', 'hsa'];
const acct = (over: Record<string, any> = {}) => {
  const kind = over.kind == null ? over.kind : (KIND[over.kind] ?? over.kind);
  const bucket = over.tax_bucket ?? (CASH_KINDS.includes(kind) ? 'CASH' : PROPERTY_KINDS.includes(kind) ? 'PROPERTY'
    : PRE_TAX_KINDS.includes(kind) ? 'PRE_TAX' : kind === 'roth_ira' ? 'ROTH' : 'TAXABLE');
  return ({ asset_id: 'a', label: 'Account', balance: 0, target_return: 0.06, ...over, kind, tax_bucket: bucket }) as any;
};
const on = (iso: string) => new Date(`${iso}T12:00:00`);
const STORED: Record<string, string> = { stocks_etf: 'stock_etf', stock: 'stock_etf', bonds: 'bond', bond: 'bond', alternatives: 'other', other: 'other', cash: 'cash' };
/** A holding as stored: its name, the ticker when the name is one, the class it arrived with. */
const pos = (name: string, qty: number, price: number | null, cls?: string | null, extra: Record<string, any> = {}) => ({
  position_id: `p-${name}`, ticker: /^[A-Z]{2,5}$/.test(name) ? name : undefined, name,
  last_price: price ?? undefined, lots: [{ lot_id: 'l', shares: qty, cost_per_share: 0, purchase_date: '' }],
  ...(cls ? { asset_class: STORED[cls] } : {}), ...extra,
});
const valueOf = (h: any[]) => h.reduce((t, x) => t + x.qty * (x.price ?? 0), 0);
const dated = (note?: string) => (note ?? '').match(/(?:maturity|matures) (\d{4}-\d{2}-\d{2})/)?.[1];

/** One of the reviewer's account rows, as the app stores it. */
const R = (r: any, i = 0) => {
  const base = { asset_id: `r${i}`, label: r.account };
  const holdings = (r.holdings ?? []).map((h: any) => pos(h.name, h.qty, h.price, h.cls));
  if (r.how_valued === 'bank account') {
    const kind = /high-yield/i.test(r.account) ? 'hysa' : /savings/i.test(r.account) ? 'savings' : 'checking';
    return acct({ ...base, kind, balance: r.balance });
  }
  if (r.how_valued === 'linked to the broker') {
    return acct({ ...base, kind: r.kind ?? 'brokerage', source: 'connected', balance: r.balance, cash_balance: r.uninvested_cash, positions: holdings,
      option_holdings: (r.options ?? []).map((o: any) => ({ label: o.name, contracts: 1, value: o.value })) });
  }
  if (/built by hand/.test(r.how_valued)) {
    const kind = r.class_of_account === 'alternatives' ? 'crypto' : r.class_of_account === 'bonds' ? 'fixed_income' : 'brokerage';
    return acct({ ...base, kind, derive_balance: true, cash_balance: r.uninvested_cash, balance: r.uninvested_cash + valueOf(r.holdings), positions: holdings });
  }
  // typed by hand
  const kind = r.kind !== undefined ? r.kind : r.class_of_account === 'bonds' ? 'fixed_income' : r.class_of_account === 'real_estate' ? null : undefined;
  return acct({ ...base, kind, balance: r.balance, re_use: r.re_use, maturity_date: dated(r.note),
    ...(r.class_of_account === 'real_estate' && kind == null ? { tax_bucket: 'PROPERTY' } : {}) });
};
const Rs = (rows: any[]) => rows.map(R);
const near = (x: number) => expect.closeTo(x, 2);
const rowsBy = (fn: (a: any[]) => number, accounts: any[]) => accounts.map((a) => ({ label: a.label, exact: fn([a]) }));
const wantRows = (rows: { label: string; exact: number }[]) => rows.map((r) => ({ label: r.label, exact: near(r.exact) }));
const nonZero = (b: Record<string, number> | null) => (b ? Object.fromEntries(Object.entries(b).filter(([, v]) => v !== 0)) : b);
const debt = (label: string, type: string, balance: number, minimum: number, extra: Record<string, any> = {}) =>
  ({ debt_id: label, label, debt_type: type, remaining_balance: balance, interest_rate_apr: 0.05, minimum_monthly_payment: minimum, ...extra }) as any;

// ══════════════════════════════════════════════════════════════════════════════════════════════════
describe('MK-NW-F-001 isAlternative — five cases', () => {
  test('easy · Crypto account typed by hand', () => {
    expect(isAlternative(acct({ kind: 'crypto', balance: 8400 }))).toBe(true);
  });
  test('easy · Brokerage that lists its holdings', () => {
    expect(isAlternative(acct({ kind: 'brokerage', positions: [pos('VTI', 1, 300), pos('BND', 1, 70)] }))).toBe(false);
  });
  test('complex · Private-equity row saved before the phase-1 cut, beside a structured note with a maturity date', () => {
    const got = {
      A: isAlternative(acct({ label: 'A', kind: 'private_equity', balance: 150000 })),
      B: isAlternative(acct({ kind: 'other', label: 'Goldman Sachs Buffered Note', maturity_date: '2028-03-15', balance: 25000 })),
      C: isAlternative(acct({ label: 'C', kind: 'commodities', asset_class: 'stocks_etf', balance: 12000 })),
    };
    expect(got).toEqual({ A: true, B: false, C: false });
  });
  test('complex · Hedge-fund row and an options account with holdings', () => {
    const got = {
      D: isAlternative(acct({ label: 'D', kind: 'hedge_funds', balance: 80000 })),
      E: isAlternative(acct({ label: 'E', kind: 'options', source: 'connected', option_holdings: [1, 2, 3].map((n) => ({ label: `opt ${n}`, contracts: 1, value: 100 })) })),
      F: isAlternative(acct({ label: 'F', kind: 'annuities', balance: 64210.33 })),
    };
    expect(got).toEqual({ D: true, E: true, F: true });
  });
  test('edge · Nothing recorded on the account at all', () => {
    const a = acct({ kind: null, balance: 5000 });
    expect({ is_alternative: isAlternative(a), class: assetClassOf(a) }).toEqual({ is_alternative: false, class: 'mixed' });   // 'mixed' is Unclassified
  });
});

describe('MK-NW-F-003 valueFreshness — five cases', () => {
  const T = on('2026-10-07');
  test('easy · Value set three months ago to the day', () => {
    expect(valueFreshness(acct({ value_as_of: '2026-07-07' }), T)).toEqual({ asOf: '2026-07-07', monthsOld: 3, stale: false });
  });
  test('easy · Brokerage whose balance is built from its holdings', () => {
    expect(valueFreshness(acct({ derive_balance: true, value_as_of: '2025-01-15' }), T)).toBeNull();
  });
  test('complex · Value dated by its month only', () => {
    expect(valueFreshness(acct({ value_as_of: '2026-04' }), T)).toEqual({ asOf: '2026-04-01', monthsOld: 6, stale: true });
  });
  test('complex · One day short of six months', () => {
    expect(valueFreshness(acct({ value_as_of: '2026-04-08' }), T)).toEqual({ asOf: '2026-04-08', monthsOld: 5, stale: false });
  });
  test('edge · Exactly six months to the day', () => {
    expect(valueFreshness(acct({ value_as_of: '2026-04-07' }), T)).toEqual({ asOf: '2026-04-07', monthsOld: 6, stale: true });
  });
});

describe('MK-NW-F-004 portfolioActualReturn — five cases', () => {
  const kindOf = (n: string) => /roth ira/i.test(n) ? 'roth_ira' : /401\(k\)/i.test(n) ? '401k' : /hsa/i.test(n) ? 'hsa' : /ira/i.test(n) ? 'trad_ira'
    : /home|rental|condo/i.test(n) ? 'home' : /checking/i.test(n) ? 'checking' : /savings/i.test(n) ? 'savings' : 'brokerage';
  const accts = (rows: any[]) => rows.map((r, i) => acct({ asset_id: `x${i}`, label: r.name, kind: kindOf(r.name), balance: r.bal, retirement_pct: r.pct,
    actual_ttm: r.ttm ?? undefined, ...(/rental/i.test(r.name) ? { re_use: 'rental' } : {}) }));
  test('easy · One account fully set aside for retirement', () => {
    expect(portfolioActualReturn(accts([{ name: 'Fidelity 401(k)', bal: 100000, pct: 100, ttm: 0.08 }]))).toBeCloseTo(0.08, 4);
  });
  test('easy · An account with no return reported is left out, not read as 0', () => {
    expect(portfolioActualReturn(accts([{ name: 'Vanguard IRA', bal: 50000, pct: 100, ttm: 0.1 }, { name: 'Schwab brokerage', bal: 50000, pct: 100, ttm: null }]))).toBeCloseTo(0.1, 4);
  });
  test('complex · Three accounts, partly set aside, returns far apart', () => {
    expect(portfolioActualReturn(accts([
      { name: 'Fidelity 401(k)', bal: 412600, pct: 100, ttm: 0.184 }, { name: 'Vanguard brokerage', bal: 192500, pct: 50, ttm: -0.0475 },
      { name: 'Fidelity HSA', bal: 80000, pct: 75, ttm: 0.112 }, { name: 'Home', bal: 612400, pct: 100, ttm: 0.06 },
      { name: 'Chase Checking', bal: 14206.15, pct: 0, ttm: null }]))).toBeCloseTo(0.129822, 4);   // the formula as sent gave 0.137236
  });
  test('complex · A reported 0%, an account with nothing set aside, and a rental', () => {
    expect(portfolioActualReturn(accts([
      { name: 'Schwab Roth IRA', bal: 73418.22, pct: 100, ttm: 0.0 }, { name: 'E*TRADE brokerage', bal: 41250.0, pct: 0, ttm: 0.25 },
      { name: 'Vanguard 401(k)', bal: 128904.6, pct: 100, ttm: 0.0915 }, { name: 'Rental condo', bal: 348750, pct: 100, ttm: 0.06 }]))).toBeCloseTo(0.056423, 4);   // the formula as sent gave 0.058297
  });
  test('edge · Returns reported but nothing set aside for retirement', () => {
    expect(portfolioActualReturn(accts([{ name: 'Schwab brokerage', bal: 60000, pct: 0, ttm: 0.07 }, { name: 'Ally savings', bal: 20000, pct: 0, ttm: 0.041 }]))).toBeNull();
  });
});

describe('MK-NW-F-005 accountAllowsTicker — five cases', () => {
  const listing = (n: number) => Array.from({ length: n }, (_, i) => pos(`H${i}`, 1, 100));
  test('easy · Checking account', () => {
    expect(accountAllowsTicker(acct({ kind: 'checking' }))).toBe(false);
  });
  test('easy · Empty brokerage', () => {
    expect(accountAllowsTicker(acct({ kind: 'brokerage' }))).toBe(true);
  });
  test('complex · 529 with holdings, typed CD, crypto account, tax-advantaged accounts', () => {
    expect({
      529: accountAllowsTicker(acct({ kind: '529', positions: listing(2) })),
      'Ally CD': accountAllowsTicker(acct({ kind: 'cd' })),
      Crypto: accountAllowsTicker(acct({ kind: 'crypto' })),
      HSA: accountAllowsTicker(acct({ kind: 'hsa', tax_bucket: 'PRE_TAX' })),
    }).toEqual({ 529: false, 'Ally CD': false, Crypto: false, HSA: true });
  });
  test('complex · Cash-management, savings, home and unclassified account', () => {
    expect({
      CMA: accountAllowsTicker(acct({ kind: 'cash_management' })),
      Savings: accountAllowsTicker(acct({ kind: 'savings' })),
      Home: accountAllowsTicker(acct({ kind: 'home', tax_bucket: 'PROPERTY' })),
      Unknown: accountAllowsTicker(acct({ kind: null })),
    }).toEqual({ CMA: false, Savings: false, Home: false, Unknown: true });
  });
  test('edge · Bonds account that already lists holdings', () => {
    expect(accountAllowsTicker(acct({ kind: 'fixed_income', positions: listing(3) }))).toBe(true);
  });
});

describe('MK-NW-F-007 assetKind — five cases', () => {
  const look = (id: any) => { const k = assetKind(id); return k ? { found: true, typical_yearly_return: k.ret } : { found: false }; };
  test('easy · Known id', () => { expect(look('checking')).toEqual({ found: true, typical_yearly_return: 0.005 }); });
  test('easy · Same word, different capitals', () => { expect(look('Checking')).toEqual({ found: false }); });
  test('complex · Stray spaces and the right ids side by side', () => {
    expect({ ' brokerage': look(' brokerage'), brokerage: look('brokerage'), 'brokerage ': look('brokerage ') })
      .toEqual({ ' brokerage': { found: false }, brokerage: { found: true, typical_yearly_return: 0.08 }, 'brokerage ': { found: false } });
  });
  test('complex · Wrapper ids typed the person’s way', () => {
    expect({ '401k': look('401k'), '401(k)': look('401(k)'), home: look('home'), HOME: look('HOME') })
      .toEqual({ '401k': { found: true, typical_yearly_return: 0.079 }, '401(k)': { found: false }, home: { found: true, typical_yearly_return: 0.045 }, HOME: { found: false } });
  });
  test('edge · No id at all', () => { expect({ absent: look(null), empty: look('') }).toEqual({ absent: { found: false }, empty: { found: false } }); });
});

describe('MK-NW-F-009 maturityClass — five cases', () => {
  test('easy · A CD with a maturity date', () => { expect(maturityClass('2027-03-15')).toBe('bonds'); });
  test('easy · No maturity date', () => { expect(maturityClass(null)).toBe('cash'); });
  test('complex · Past date, blank text and month-only date', () => {
    expect(['2025-06-30', '   ', '2026-11'].map(maturityClass)).toEqual(['bonds', 'cash', 'bonds']);
  });
  test('complex · Six-week T-bill and a 30-year bond', () => {
    expect(['2026-11-18', '2056-08-15', ''].map(maturityClass)).toEqual(['bonds', 'bonds', 'cash']);
  });
  test('edge · Matures today', () => { expect(maturityClass('2026-10-07')).toBe('bonds'); });
});

describe('MK-NW-F-010 wrapperAccount — five cases', () => {
  test('easy · 401(k)', () => { expect(wrapperAccount('401k')).toEqual({ kind: '401k', tax_bucket: 'PRE_TAX' }); });
  // SETTLED 2026-10-10 by DEC-4036f: nothing chosen is never assumed taxable — no kind, no tax type
  test('easy · Nothing chosen', () => { expect(wrapperAccount(null)).toStrictEqual({ kind: undefined, tax_bucket: undefined }); });
  test('complex · Roth 401(k) beside a Roth IRA', () => {
    expect({ roth_401k: wrapperAccount('roth_401k'), roth: wrapperAccount('roth') })
      .toEqual({ roth_401k: { kind: '401k', tax_bucket: 'ROTH' }, roth: { kind: 'roth_ira', tax_bucket: 'ROTH' } });
  });
  test('complex · HSA, Traditional IRA and taxable', () => {
    expect({ hsa: wrapperAccount('hsa'), trad_ira: wrapperAccount('trad_ira'), taxable: wrapperAccount('taxable') })
      .toEqual({ hsa: { kind: 'hsa', tax_bucket: 'PRE_TAX' }, trad_ira: { kind: 'trad_ira', tax_bucket: 'PRE_TAX' }, taxable: { kind: 'brokerage', tax_bucket: 'TAXABLE' } });
  });
  // SETTLED 2026-10-10 by DEC-4036f: an unknown wrapper word is treated as nothing chosen
  test('edge · A wrapper the list does not have', () => { expect(wrapperAccount('ISA' as any)).toStrictEqual({ kind: undefined, tax_bucket: undefined }); });
});

describe('MK-NW-F-011 assetClassOf — five cases', () => {
  test('easy · Checking account', () => { expect(assetClassOf(acct({ kind: 'checking' }))).toBe('cash'); });
  test('easy · Car', () => { expect(assetClassOf(acct({ kind: 'vehicle', tax_bucket: 'PROPERTY' }))).toBe('personal_property'); });
  test('complex · Savings kind holding a CD, a rental, and a person’s own answer', () => {
    expect({
      A: assetClassOf(acct({ kind: 'savings', label: 'Ally 12-month CD', maturity_date: '2027-04-22', balance: 15000 })),
      B: assetClassOf(acct({ label: 'B', kind: 'home', re_use: 'rental', balance: 348750 })),
      C: assetClassOf(acct({ label: 'C', kind: 'savings', asset_class: 'stocks_etf' })),
    }).toEqual({ A: 'bonds', B: 'real_estate', C: 'stocks_etf' });
  });
  test('complex · Money-market fund imported with the broker’s ‘cash’ tag', () => {
    // INPUT MAPPING: the app's importer (MK-XS-F-129, holdingsImport) never copies a broker's tag onto the
    // account — it writes the class its own name test gives (assetClassForSymbol), and 'cash' only for a
    // line whose symbol is literally CASH. So the class an import stores on this row is that answer.
    const label = 'Fidelity Government Money Market (SPAXX)';
    expect(assetClassOf(acct({ label, kind: null, asset_class: assetClassForSymbol('SPAXX', label) }))).toBe('stocks_etf');
  });
  test('edge · Nothing known about the account', () => { expect(assetClassOf(acct({ kind: null }))).toBe('mixed'); });   // 'mixed' is Unclassified
});

describe('MK-NW-F-012 taxTreatmentOf — five cases', () => {
  test('easy · Roth IRA', () => { expect(taxTreatmentOf(acct({ tax_bucket: 'ROTH', kind: 'roth_ira' }))).toBe('tax_free'); });
  test('easy · 529 plan', () => { expect(taxTreatmentOf(acct({ kind: '529', tax_bucket: 'TAXABLE' }))).toBe('tax_free'); });
  test('complex · HSA, brokerage, and a stated treatment that overrides its bucket', () => {
    expect({
      HSA: taxTreatmentOf(acct({ kind: 'hsa', tax_bucket: 'PRE_TAX' })),
      Brokerage: taxTreatmentOf(acct({ kind: 'brokerage', tax_bucket: 'TAXABLE' })),
      'Old 401k': taxTreatmentOf(acct({ kind: '401k', tax_bucket: 'PRE_TAX', tax_treatment: 'taxable' })),
    }).toEqual({ HSA: 'tax_deferred', Brokerage: 'taxable', 'Old 401k': 'taxable' });
  });
  test('complex · Cash, property and a Roth 401(k)', () => {
    expect({
      Checking: taxTreatmentOf(acct({ tax_bucket: 'CASH' })),
      Home: taxTreatmentOf(acct({ tax_bucket: 'PROPERTY' })),
      'Roth 401k': taxTreatmentOf(acct({ kind: '401k', tax_bucket: 'ROTH' })),
    }).toEqual({ Checking: 'taxable', Home: 'taxable', 'Roth 401k': 'tax_free' });
  });
  // SETTLED 2026-10-10 by DEC-4036d: a 529 is tax-free for education whatever treatment is stored
  test('edge · Stated treatment on a 529', () => { expect(taxTreatmentOf(acct({ kind: '529', tax_treatment: 'tax_deferred' }))).toBe('tax_free'); });
});

describe('MK-NW-F-108 taxWordsOf — five cases', () => {
  test('easy · Roth IRA', () => { expect(taxWordsOf(acct({ tax_bucket: 'ROTH' }))).toBe('tax-free (Roth)'); });
  test('easy · Brokerage', () => { expect(taxWordsOf(acct({ tax_bucket: 'TAXABLE' }))).toBe('taxable'); });
  test('complex · HSA, 401(k) and 529, nothing stated', () => {
    expect({
      HSA: taxWordsOf(acct({ kind: 'hsa', tax_bucket: 'PRE_TAX' })),
      '401k': taxWordsOf(acct({ kind: '401k', tax_bucket: 'PRE_TAX' })),
      529: taxWordsOf(acct({ kind: '529' })),
    }).toEqual({ HSA: 'pre-tax — tax-free for medical costs', '401k': 'pre-tax — taxed when it comes out', 529: 'tax-free for education' });
  });
  test('complex · 529 and HSA with a treatment stated by the editor', () => {
    expect({
      529: taxWordsOf(acct({ kind: '529', tax_treatment: 'tax_free' })),
      HSA: taxWordsOf(acct({ kind: 'hsa', tax_bucket: 'PRE_TAX', tax_treatment: 'tax_deferred' })),
    }).toEqual({ 529: 'tax-free for education', HSA: 'pre-tax — tax-free for medical costs' });   // the formula as sent gave 'tax-free (Roth)' and 'taxed when it comes out'
  });
  test('edge · A taxable account of municipal bonds stated tax-free', () => {
    expect(taxWordsOf(acct({ kind: 'brokerage', tax_bucket: 'TAXABLE', tax_treatment: 'tax_free' }))).toBe('tax-free');   // the formula as sent gave 'tax-free (Roth)'
  });
});

// ── the reviewer's recurring accounts ─────────────────────────────────────────────────────────────
const FIDELITY_LINKED = { account: 'Fidelity brokerage', how_valued: 'linked to the broker', class_of_account: 'stocks_etf', balance: 91417.01, uninvested_cash: 1247.55,
  holdings: [{ name: 'FIDELITY GOVERNMENT MONEY MARKET (SPAXX)', qty: 18330.1, price: 1.0, cls: 'stocks_etf' }, { name: 'VTI', qty: 145, price: 288.879, cls: 'stocks_etf' },
    { name: 'UNITED STATES TREAS BILLS 0% 03/19/27', qty: 10, price: 986.13, cls: 'bonds' }, { name: 'CAPITAL ONE NA CD 4.25% 03/18/27', qty: 20, price: 1004.53, cls: 'bonds' }] };
const SCHWAB_BUILT = { account: 'Schwab brokerage', how_valued: 'built by hand from its own holdings (derive_balance)', class_of_account: 'stocks_etf', uninvested_cash: 6120.55,
  holdings: [{ name: 'VTI', qty: 240, price: 263.48, cls: 'stocks_etf' }] };
const SCHWAB_TBILL = { account: 'Schwab brokerage', how_valued: 'built by hand from its own holdings (derive_balance)', class_of_account: 'stocks_etf', uninvested_cash: 2410.18,
  holdings: [{ name: 'VTI', qty: 131, price: 289.33, cls: 'stocks_etf' }, { name: 'UNITED STATES TREAS BILLS 0% 01/15/27', qty: 10, price: 986.13, cls: 'bonds' },
    { name: 'SCHWAB VALUE ADVANTAGE MONEY FUND (SWVXX)', qty: 62465.8, price: 1.0, cls: 'stocks_etf' }] };
const FIDELITY_401K = { account: 'Fidelity 401(k)', how_valued: 'value typed by hand', class_of_account: 'unclassified', balance: 277845.43, kind: '401k' };
const ALLY_CD = { account: 'Ally 12-month CD', how_valued: 'value typed by hand', class_of_account: 'bonds', balance: 15000.0, kind: 'savings', note: 'maturity 2027-04-22 → Bonds & CDs (assetClassOf step 2)' };
const CHASE = (balance: number) => ({ account: 'Chase Checking', how_valued: 'bank account', class_of_account: 'cash', balance });
const COINBASE_BUILT = { account: 'Coinbase', how_valued: 'built by hand from its own holdings (derive_balance)', class_of_account: 'alternatives', uninvested_cash: 1906.4,
  holdings: [{ name: 'BTC', qty: 0.37, price: 112907.65, cls: 'alternatives' }, { name: 'ETH', qty: 3.1, price: 4065.84, cls: 'alternatives' }] };
const ACME_PE = { account: 'Acme Growth Fund III (private equity, saved 2026-07-02)', how_valued: 'value typed by hand', class_of_account: 'alternatives', balance: 150000.0, kind: 'private_equity' };
const ART = { account: 'Masterworks art share', how_valued: 'value typed by hand', class_of_account: 'alternatives', balance: 12500.0, kind: 'other' };
const HOME = (balance: number, re_use?: string) => ({ account: 'Home', how_valued: 'value typed by hand', class_of_account: 'real_estate', balance, kind: 'home', ...(re_use ? { re_use } : {}) });
const RAV4 = { account: 'Toyota RAV4', how_valued: 'value typed by hand', class_of_account: 'personal_property', balance: 28900.0, kind: 'vehicle' };

describe('MK-NW-F-016 cashTotal — five cases', () => {
  test('easy · Two bank accounts', () => {
    expect(cashTotal(Rs([{ account: 'Chase Checking', how_valued: 'bank account', balance: 3000 }, { account: 'Ally savings', how_valued: 'bank account', balance: 2000 }]))).toBeCloseTo(5000, 2);
  });
  test('easy · Uninvested cash inside a linked brokerage', () => {
    expect(cashTotal(Rs([{ account: 'Vanguard brokerage', how_valued: 'linked to the broker', class_of_account: 'stocks_etf', balance: 349333.0, uninvested_cash: 838.0,
      holdings: [{ name: 'VTI', qty: 1, price: 348495.0, cls: 'stocks_etf' }] }]))).toBeCloseTo(838, 2);
  });
  test('complex · Bank accounts, a CD in a savings kind, and a linked brokerage holding a money-market fund', () => {
    const a = Rs([CHASE(14206.15), { account: 'Ally high-yield savings', how_valued: 'bank account', class_of_account: 'cash', balance: 24906.18 }, ALLY_CD, FIDELITY_LINKED]);
    expect({ total: cashTotal(a), rows: rowsBy(cashTotal, a) }).toEqual({ total: near(40359.885), rows: wantRows([
      { label: 'Chase Checking', exact: 14206.15 }, { label: 'Ally high-yield savings', exact: 24906.18 }, { label: 'Ally 12-month CD', exact: 0.0 }, { label: 'Fidelity brokerage', exact: 1247.555 }]) });
  });
  test('complex · Overdrawn checking, an account built by hand with cash, a typed 401(k)', () => {
    const a = Rs([CHASE(-312.4), SCHWAB_BUILT, FIDELITY_401K]);
    expect({ total: cashTotal(a), rows: rowsBy(cashTotal, a) }).toEqual({ total: near(5808.15), rows: wantRows([
      { label: 'Chase Checking', exact: -312.4 }, { label: 'Schwab brokerage', exact: 6120.55 }, { label: 'Fidelity 401(k)', exact: 0.0 }]) });
  });
  test('edge · Recorded uninvested cash larger than what the account is built to', () => {
    const row = { account: 'Schwab brokerage', how_valued: 'built by hand from its own holdings (derive_balance)', class_of_account: 'stocks_etf', uninvested_cash: 4500.0,
      holdings: [{ name: 'VTI', qty: 0, price: 289.33, cls: 'stocks_etf' }] };
    expect({ cash_total: cashTotal(Rs([row])), second_reading_cash_total: cashTotal(Rs([{ ...row, uninvested_cash: 0 }])) })
      .toEqual({ cash_total: near(4500.0), second_reading_cash_total: near(0) });
  });
});

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-017 equitiesTotal left the code —
// nothing in the app, the doors or the engines called it; the screen takes the class totals from the class split, MK-NW-F-029 assetAllocation. The block "MK-NW-F-017 equitiesTotal — five cases"
// (5 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-018 fixedIncomeTotal left the code —
// nothing in the app, the doors or the engines called it; the screen takes the class totals from the class split, MK-NW-F-029 assetAllocation. The block "MK-NW-F-018 fixedIncomeTotal — five cases"
// (5 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-019 alternativesTotal left the code —
// nothing in the app, the doors or the engines called it; the screen takes the class totals from the class split, MK-NW-F-029 assetAllocation. The block "MK-NW-F-019 alternativesTotal — five cases"
// (5 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-020 realEstateTotal left the code —
// nothing in the app, the doors or the engines called it; the screen takes the class totals from the class split, MK-NW-F-029 assetAllocation. The block "MK-NW-F-020 realEstateTotal — five cases"
// (5 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

describe('MK-NW-F-021 investmentsTotal — five cases', () => {
  const four = (a: any[]) => ({ investments_total: investmentsTotal(a), rows: rowsBy(investmentsTotal, a), cash_total: cashTotal(a), investable_assets: investableAssets(a),
    check_cash_plus_investments_equals_investable: Math.abs(cashTotal(a) + investmentsTotal(a) - investableAssets(a)) < 0.005 });
  const want = (inv: number, rows: any[], cash: number, investable: number) => ({ investments_total: near(inv), rows: wantRows(rows), cash_total: near(cash), investable_assets: near(investable), check_cash_plus_investments_equals_investable: true });
  test('easy · A stocks account and a checking account', () => {
    const a = Rs([{ account: 'Vanguard stocks', how_valued: 'value typed by hand', class_of_account: 'stocks_etf', balance: 50000.0, kind: 'stocks' }, { ...CHASE(5000), }]);
    expect(four(a)).toEqual(want(50000, [{ label: 'Vanguard stocks', exact: 50000 }, { label: 'Chase Checking', exact: 0 }], 5000, 55000));
  });
  test('easy · A typed 401(k) not yet classed still counts', () => {
    const a = Rs([{ ...FIDELITY_401K, balance: 100000.0 }]);
    expect(four(a)).toEqual(want(100000, [{ label: 'Fidelity 401(k)', exact: 100000 }], 0, 100000));
  });
  test('complex · Account built by hand with cash, beside checking and a typed 401(k)', () => {
    const a = Rs([CHASE(5000), SCHWAB_BUILT, FIDELITY_401K]);
    expect(four(a)).toEqual(want(341080.63, [{ label: 'Chase Checking', exact: 0 }, { label: 'Schwab brokerage', exact: 63235.2 }, { label: 'Fidelity 401(k)', exact: 277845.43 }], 11120.55, 352201.18));   // the formula as sent gave 347,201.18
  });
  test('complex · Linked broker with a money-market fund, a CD in a savings kind, crypto and a home', () => {
    const a = Rs([FIDELITY_LINKED, ALLY_CD, { account: 'Ally high-yield savings', how_valued: 'bank account', class_of_account: 'cash', balance: 24906.18 },
      { account: 'Coinbase', how_valued: 'value typed by hand', class_of_account: 'alternatives', balance: 8400.0, kind: 'crypto' }, HOME(612400, 'primary')]);
    expect(four(a)).toEqual(want(113569.455, [{ label: 'Fidelity brokerage', exact: 90169.455 }, { label: 'Ally 12-month CD', exact: 15000 }, { label: 'Ally high-yield savings', exact: 0 },
      { label: 'Coinbase', exact: 8400 }, { label: 'Home', exact: 0 }], 26153.735, 139723.19));
  });
  test('edge · Account built by hand with recorded cash of exactly zero', () => {
    const a = Rs([{ ...SCHWAB_BUILT, uninvested_cash: 0.0, holdings: [{ name: 'VTI', qty: 100, price: 289.33, cls: 'stocks_etf' }] }]);
    expect(four(a)).toEqual(want(28933, [{ label: 'Schwab brokerage', exact: 28933 }], 0, 28933));
  });
});

describe('MK-NW-F-022 investableAssets — five cases', () => {
  const two = (a: any[]) => ({ investable_assets: investableAssets(a), rows: rowsBy(investableAssets, a) });
  test('easy · Checking and a 401(k)', () => {
    expect(two(Rs([CHASE(5000), { ...FIDELITY_401K, balance: 100000.0 }]))).toEqual({ investable_assets: near(105000), rows: wantRows([{ label: 'Chase Checking', exact: 5000 }, { label: 'Fidelity 401(k)', exact: 100000 }]) });
  });
  test('easy · A home is left out', () => {
    expect(two(Rs([HOME(450000), { account: 'Ally savings', how_valued: 'bank account', class_of_account: 'cash', balance: 20000.0 }])))
      .toEqual({ investable_assets: near(20000), rows: wantRows([{ label: 'Home', exact: 0 }, { label: 'Ally savings', exact: 20000 }]) });
  });
  test('complex · Overdrawn checking, an account built by hand, linked broker, rental, car', () => {
    expect(two(Rs([CHASE(-312.4), SCHWAB_BUILT, FIDELITY_LINKED, { account: 'Rental condo', how_valued: 'value typed by hand', class_of_account: 'real_estate', balance: 348750.0, kind: 'home', re_use: 'rental' }, RAV4])))
      .toEqual({ investable_assets: near(160460.36), rows: wantRows([{ label: 'Chase Checking', exact: -312.4 }, { label: 'Schwab brokerage', exact: 69355.75 }, { label: 'Fidelity brokerage', exact: 91417.01 },
        { label: 'Rental condo', exact: 0 }, { label: 'Toyota RAV4', exact: 0 }]) });
  });
  test('complex · Crypto built by hand, private equity kept from before the cut, CD, art, land', () => {
    expect(two(Rs([COINBASE_BUILT, ACME_PE, ALLY_CD, ART, { account: 'Wenatchee lot', how_valued: 'value typed by hand', class_of_account: 'real_estate', balance: 75500.0, kind: 'real_estate', re_use: 'land' }])))
      .toEqual({ investable_assets: near(233786.3345), rows: wantRows([{ label: 'Coinbase', exact: 56286.3345 }, { label: ACME_PE.account, exact: 150000 }, { label: 'Ally 12-month CD', exact: 15000 },
        { label: 'Masterworks art share', exact: 12500 }, { label: 'Wenatchee lot', exact: 0 }]) });
  });
  test('edge · Only property entered', () => {
    expect(two(Rs([HOME(612400, 'primary'), RAV4]))).toEqual({ investable_assets: near(0), rows: wantRows([{ label: 'Home', exact: 0 }, { label: 'Toyota RAV4', exact: 0 }]) });
  });
});

describe('MK-NW-F-025 accountDisplayName — five cases', () => {
  test('easy · Bank account with institution and digits', () => {
    expect(accountDisplayName(acct({ institution: 'Chase', kind: 'checking', mask: '••4821', tax_bucket: 'CASH', label: 'TOTAL CHECKING' }))).toBe('Chase -4821');
  });
  test('easy · Brokerage with institution, no digits', () => {
    expect(accountDisplayName(acct({ institution: 'Vanguard', kind: 'brokerage', mask: null, tax_bucket: 'TAXABLE' }))).toBe('Vanguard Brokerage');
  });
  test('complex · Tax-advantaged accounts at one broker', () => {
    expect({
      A: accountDisplayName(acct({ institution: 'Fidelity', kind: 'brokerage', tax_treatment: 'tax_free', mask: '••7712' })),
      B: accountDisplayName(acct({ institution: 'Fidelity', kind: '401k', tax_bucket: 'PRE_TAX', mask: null })),
    }).toEqual({ A: 'Fidelity Roth -7712', B: 'Fidelity 401(k)' });
  });
  test('complex · Roth 401(k) beside a pre-tax 401(k) at one employer', () => {
    expect({
      Roth: accountDisplayName(acct({ institution: 'Fidelity', kind: '401k', tax_bucket: 'ROTH', mask: '••3390' })),
      'Pre-tax': accountDisplayName(acct({ institution: 'Fidelity', kind: '401k', tax_bucket: 'PRE_TAX', mask: '••3391' })),
    }).toEqual({ Roth: 'Fidelity Roth 401(k) -3390', 'Pre-tax': 'Fidelity 401(k) -3391' });   // the formula as sent gave 'Fidelity 401(k) -3390' for the Roth
  });
  test('edge · Imported holding with exactly one holding, no institution', () => {
    expect(accountDisplayName(acct({ label: 'Imported holding', institution: null, mask: null, positions: [{ ticker: 'VTI' }] }))).toBe('VTI');
  });
});

describe('MK-NW-F-026 accountDisplayNames — five cases', () => {
  const names = (rows: { id: string; name: string }[]) => Object.fromEntries(accountDisplayNames(rows.map((r) => ({ asset_id: r.id, label: r.name })) as any));
  test('easy · No clash', () => {
    expect(names([{ id: 'a1', name: 'Savings' }, { id: 'a2', name: 'Checking' }])).toEqual({ a1: 'Savings', a2: 'Checking' });
  });
  test('easy · Two alike', () => {
    expect(names([{ id: 'a1', name: 'Savings' }, { id: 'a2', name: 'Savings' }])).toEqual({ a1: 'Savings · 1', a2: 'Savings · 2' });
  });
  test('complex · Three alike, ids out of creation order, beside one other', () => {
    expect(names([{ id: '1727000000000-b', name: 'Vanguard Brokerage' }, { id: '1690000000000-a', name: 'Vanguard Brokerage' }, { id: '1727000000000-a', name: 'Vanguard Brokerage' }, { id: '1700000000000-z', name: 'Chase -4821' }]))
      .toEqual({ '1690000000000-a': 'Vanguard Brokerage · 1', '1727000000000-a': 'Vanguard Brokerage · 2', '1727000000000-b': 'Vanguard Brokerage · 3', '1700000000000-z': 'Chase -4821' });
  });
  test('complex · A numbered name already taken', () => {
    expect(names([{ id: 'a', name: 'Savings' }, { id: 'b', name: 'Savings' }, { id: 'c', name: 'Savings · 1' }])).toEqual({ a: 'Savings · 2', b: 'Savings · 3', c: 'Savings · 1' });
  });
  test('edge · Ids that sort differently as text than as numbers', () => {
    expect(names([{ id: '9', name: 'Ally Savings' }, { id: '10', name: 'Ally Savings' }])).toEqual({ 10: 'Ally Savings · 1', 9: 'Ally Savings · 2' });
  });
});

describe('MK-NW-F-109 holdingClassOf — five cases', () => {
  const answered = (cls: string) => ({ asset_class: STORED[cls], class_source: 'user' });
  test('easy · Person’s own answer', () => {
    expect(holdingClassOf(pos('AAPL', 1, 230, 'stock', answered('alternatives')))).toBe('alternatives');
  });
  test('easy · Plain equity ETF', () => {
    expect(holdingClassOf(pos('VANGUARD TOTAL STOCK MARKET ETF', 1, 300, 'stock', { ticker: 'VTI' }))).toBe('stocks_etf');
  });
  test('complex · Holdings as a broker link describes them', () => {
    expect({
      SPAXX: holdingClassOf(pos('FIDELITY GOVERNMENT MONEY MARKET (SPAXX)', 1, 1, 'cash')),
      'T-bill': holdingClassOf(pos('UNITED STATES TREAS BILLS 0.000% 01/15/2027', 1, 1, 'cash')),
      CD: holdingClassOf(pos('CAPITAL ONE NA CD 4.25% 03/18/27', 1, 1, 'cash')),
      'USD CASH': holdingClassOf(pos('USD CASH', 1, 1, 'cash')),
    }).toEqual({ SPAXX: 'stocks_etf', 'T-bill': 'bonds', CD: 'bonds', 'USD CASH': 'cash' });
  });
  test('complex · Asked holdings, answered and not', () => {
    expect({
      'XYZ PRIVATE PLACEMENT LP': holdingClassOf(pos('XYZ PRIVATE PLACEMENT LP', 1, 1, 'stock', { class_asked: true })),
      'ACME 5.5% 2031': holdingClassOf(pos('ACME 5.5% 2031', 1, 1, null, { class_asked: true, ...answered('bonds') })),
      'Fundrise eREIT': holdingClassOf(pos('Fundrise eREIT', 1, 1, 'other')),
    }).toEqual({ 'XYZ PRIVATE PLACEMENT LP': 'mixed', 'ACME 5.5% 2031': 'bonds', 'Fundrise eREIT': 'alternatives' });   // 'mixed' is Unclassified
  });
  test('edge · Holding with no stored class and no evidence', () => {
    // its "asks_the_person: true" — the app asks about a holding only through class_asked (theNetWorth.unclassed);
    // the class is the part a function can answer here
    expect(holdingClassOf(pos('ACME HOLDINGS 2021-A', 1, 1, null))).toBe('mixed');   // the formula as sent gave stocks_etf
  });
});

describe('MK-NW-F-027 accountClassBreakdown — five cases', () => {
  test('easy · Linked account: cash and one fund', () => {
    const a = R({ account: 'Vanguard brokerage', how_valued: 'linked to the broker', class_of_account: 'stocks_etf', balance: 4000.0, uninvested_cash: 1000.0, holdings: [{ name: 'VTI', qty: 10, price: 300.0, cls: 'stocks_etf' }] });
    const b = accountClassBreakdown(a)!;
    expect({ split: nonZero(b), sum_of_parts: Object.values(b).reduce((t, v) => t + v, 0) }).toEqual({ split: { cash: near(1000), stocks_etf: near(3000) }, sum_of_parts: near(4000) });
  });
  test('easy · Typed balance gets no split', () => {
    expect(accountClassBreakdown(R({ account: 'Merrill brokerage', how_valued: 'value typed by hand', balance: 25000, kind: 'brokerage' }))).toBeNull();
  });
  test('complex · Linked account with an option and an unpriced private placement', () => {
    const b = accountClassBreakdown(R({ account: 'Robinhood', how_valued: 'linked to the broker', class_of_account: 'stocks_etf', balance: 30000.0, uninvested_cash: 2000.0,
      holdings: [{ name: 'AAPL', qty: 10, price: 230.5, cls: 'stocks_etf' }, { name: 'XYZ PRIVATE PLACEMENT LP', qty: 100, price: null, cls: 'alternatives' }], options: [{ name: 'SPY 2026-12-18 650 C ×1', value: 1450.0 }] }))!;
    expect({ split: nonZero(b), sum_of_parts: Object.values(b).reduce((t, v) => t + v, 0) })
      .toEqual({ split: { cash: near(2000), stocks_etf: near(2305), alternatives: near(25695) }, sum_of_parts: near(30000) });
  });
  test('complex · Account built by hand holding a fund, a T-bill and a money-market fund', () => {
    const b = accountClassBreakdown(R(SCHWAB_TBILL))!;
    expect({ split: nonZero(b), sum_of_parts: Object.values(b).reduce((t, v) => t + v, 0) })
      .toEqual({ split: { cash: near(2410.18), bonds: near(9861.3), stocks_etf: near(100368.03) }, sum_of_parts: near(112639.51) });   // the formula as sent gave cash 2,410.18 + stocks 110,229.33
  });
  test('edge · Difference exactly at 1% of the balance, and one cent over', () => {
    const at = (balance: number) => nonZero(accountClassBreakdown(R({ account: 'E*TRADE brokerage', how_valued: 'linked to the broker', class_of_account: 'stocks_etf', balance, uninvested_cash: 3000.0,
      holdings: [{ name: 'VOO', qty: 160, price: 600.0, cls: 'stocks_etf' }] })));
    expect({ at_line: { split: at(100000.0) }, one_cent_over: { split: at(100000.01) } })
      .toEqual({ at_line: { split: { cash: near(4000), stocks_etf: near(96000) } }, one_cent_over: { split: { cash: near(3000), stocks_etf: near(97000.01) } } });
  });
});

describe('MK-NW-F-028 classPortionLabel — five cases', () => {
  const bonds = (names: string[]) => acct({ source: 'connected', kind: 'brokerage', positions: names.map((n) => pos(n, 1, 1000, 'bonds')) });
  test('easy · Three CDs and a Treasury', () => {
    expect(classPortionLabel(bonds(['Ally CD 4.1%', 'Marcus CD 4.0%', 'Synchrony CD 3.9%', 'US Treasury Note 4.25% 2029']), 'bonds')).toBe('3 CDs & 1 Treasury in this account');
  });
  test('easy · Cash', () => { expect(classPortionLabel(acct({ source: 'connected', kind: 'brokerage' }), 'cash')).toBe('cash in this account'); });
  test('complex · Whole-word tests on awkward names', () => {
    expect(classPortionLabel(bonds(['CDW CORP 3.25% 2029', 'certificate of deposit ALLY 4.1%', 't-bill 26wk', 'Apple Inc 2.4% 2030']), 'bonds')).toBe('1 CD, 1 Treasury & 2 bonds in this account');
  });
  test('complex · Options and holdings under Alternatives, and one stock holding', () => {
    const a = acct({ source: 'connected', kind: 'brokerage', positions: [pos('Fundrise eREIT', 1, 1000, 'other'), pos('VTI', 1, 300, 'stocks_etf')],
      option_holdings: [{ label: 'opt A', contracts: 5, value: 100 }, { label: 'opt B', contracts: 1, value: 100 }] });
    expect({ alternatives: classPortionLabel(a, 'alternatives'), stocks: classPortionLabel(a, 'stocks_etf') })
      .toEqual({ alternatives: '2 options & 1 holding in this account', stocks: '1 holding in this account' });
  });
  test('edge · A CD and a T-bill as the broker names them', () => {
    expect(classPortionLabel(bonds(['CAPITAL ONE NA CD 4.25% 03/18/27', 'UNITED STATES TREAS BILLS 0% 01/15/27']), 'bonds')).toBe('1 CD & 1 Treasury in this account');   // the formula as sent gave '1 CD & 1 bond'
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════
/** A recorded day, the way the app records one: built from the accounts as they stood that day. */
const recorded = (date: string, accounts: any[]) => buildDayFromAccounts(accounts, date, `${date}T00:00:00Z`);
/** A linked account whose holdings are one line worth `invested`, plus its uninvested cash. */
const linkedAt = (id: string, invested: number, cash = 0) => acct({ asset_id: id, label: id, kind: 'brokerage', source: 'connected', balance: invested + cash, cash_balance: cash,
  positions: [{ position_id: `p${id}`, ticker: 'X', last_price: invested, lots: [{ lot_id: 'l', shares: 1, cost_per_share: 1, purchase_date: '2024-01-02' }] }] });

describe('MK-NW-O-003 theNetWorth — five cases', () => {
  test('easy · One bank account, one stocks account, one card debt', () => {
    const n = theNetWorth({ uid: 'u', accounts: Rs([CHASE(10000), { account: 'Vanguard stocks', how_valued: 'value typed by hand', class_of_account: 'stocks_etf', balance: 40000.0, kind: 'stocks' }]),
      debts: [debt('Chase Visa', 'CREDIT_CARD', 3000, 100)] });
    expect({ assets: n.assets, debts: n.debts, net_worth: n.netWorth, cash: n.cash, investments: n.investments, monthly_debt_payments: n.monthlyDebtPayments, monthly_debt_minimum: n.monthlyDebtMinimum })
      .toEqual({ assets: near(50000), debts: near(3000), net_worth: near(47000), cash: near(10000), investments: near(40000), monthly_debt_payments: near(100), monthly_debt_minimum: near(100) });
  });
  test('easy · Return with no money moved', () => {
    const today = linkedAt('v', 104000);
    const n = theNetWorth({ uid: 'u', accounts: [today], debts: [], since: '2026-07-01', today: '2026-10-07', snapshotDays: [recorded('2026-07-01', [linkedAt('v', 100000)])], transactions: [] });
    expect(n.investableChangePct).toBeCloseTo(0.04, 4);
  });
  test('complex · Approved drawing: Net worth, Quiet Instrument v08, state A — exactly as drawn', () => {
    const n = theNetWorth({ uid: 'u', accounts: Rs([CHASE(8000),
      { account: 'Vanguard Brokerage', how_valued: 'linked to the broker', class_of_account: 'stocks_etf', balance: 349333.0, uninvested_cash: 838.0, holdings: [{ name: 'stocks and funds (as drawn)', qty: 1, price: 348495.0, cls: 'stocks_etf' }] },
      { account: 'E*TRADE bonds and CDs', how_valued: 'value typed by hand', class_of_account: 'bonds', balance: 5819.0 }, HOME(450000)]),
      debts: [debt('Home mortgage', 'MORTGAGE', 412000, 0), debt('Chase Visa', 'CREDIT_CARD', 6000, 0)] });
    expect({ cash: n.cash, investments: n.investments, property_band: n.byClass.real_estate + n.byClass.personal_property,
      by_class: { cash: n.byClass.cash, stocks_etf: n.byClass.stocks_etf, bonds: n.byClass.bonds, real_estate: n.byClass.real_estate, personal_property: n.byClass.personal_property },
      what_you_own: n.assets, debts: n.debts, net_worth: n.netWorth, investable: n.investable, parts_sum: n.cash + n.investments + n.byClass.real_estate + n.byClass.personal_property })
      .toEqual({ cash: near(8838), investments: near(354314), property_band: near(450000),
        by_class: { cash: near(8838), stocks_etf: near(348495), bonds: near(5819), real_estate: near(450000), personal_property: near(0) },
        what_you_own: near(813152), debts: near(418000), net_worth: near(395152), investable: near(363152), parts_sum: near(813152) });
  });
  test('complex · Account built by hand with cash, two properties with mortgages, three kinds of debt, a year with a large bonus in and tuition out', () => {
    const accounts = Rs([CHASE(14206.15), SCHWAB_BUILT, FIDELITY_401K, HOME(612400, 'primary'),
      { account: 'Rental condo', how_valued: 'value typed by hand', class_of_account: 'real_estate', balance: 348750.0, kind: 'home', re_use: 'rental' }, RAV4]);
    const [chase, schwab, k401, home, condo] = accounts;
    // INPUT MAPPING for the return: the reviewer gives the record as one total a day. Drawn here per account, adding to
    // its totals; checking stands at its balance on every day and the $60,000 bonus is recorded as paid into the
    // brokerage (a cash account's balance change is itself money moving in the app, so where it lands does not move
    // the pieces). The $41.20 of checking interest sits inside the totals.
    const at = (date: string, schwabTotal: number, k: number) => recorded(date, [chase, { ...schwab, balance: schwabTotal,
      positions: [{ ...schwab.positions[0], last_price: (schwabTotal - 6120.55) / 240 }] }, { ...k401, balance: k }]);
    const n = theNetWorth({ uid: 'u', accounts, since: '2025-10-07', today: '2026-10-07',
      debts: [debt('Home mortgage', 'MORTGAGE', 401212.88, 2846.17, { property_id: home.asset_id }),
        debt('Rental condo mortgage', 'MORTGAGE', 236940.1, 1702.55, { property_id: condo.asset_id, monthly_payment: 2000.0 }),
        debt('Chase Visa', 'CREDIT_CARD', 6418.92, 64.0), debt('Federal student loan (in deferment)', 'STUDENT_LOAN', 18300.0, 0.0)],
      snapshotDays: [at('2025-10-07', 45793.85, 230000), at('2026-03-16', 98244.03, 250000), at('2026-07-01', 71911.89, 260000)],
      transactions: [{ id: 'b', type: 'DEPOSIT', account_id: schwab.asset_id, amount: 60000, date: '2026-03-16' },
        { id: 't', type: 'WITHDRAWAL', account_id: schwab.asset_id, amount: 25000, date: '2026-07-01' }] });
    expect({
      by_class: { cash: n.byClass.cash, stocks_etf: n.byClass.stocks_etf, real_estate: n.byClass.real_estate, personal_property: n.byClass.personal_property, unclassified: n.byClass.mixed },
      cash: n.cash, investments: n.investments, what_you_own: n.assets,
      check_cash_plus_investments_plus_property_equals_what_you_own: Math.abs(n.cash + n.investments + n.byClass.real_estate + n.byClass.personal_property - n.assets) < 0.005,
      investable: n.investable, debts: n.debts, net_worth: n.netWorth,
      debt_lines: n.debtLines.map((d) => ({ debt: d.label, balance: d.balance, required_monthly: d.minimumMonthly })),
      monthly_debt_payments: n.monthlyDebtPayments, monthly_debt_minimum: n.monthlyDebtMinimum,
      mortgage_check: { properties: n.mortgageCheck.properties, mortgages: n.mortgageCheck.mortgages,
        Home: n.mortgageCheck.byProperty.find((p) => p.property === 'Home')?.mortgage, 'Rental condo': n.mortgageCheck.byProperty.find((p) => p.property === 'Rental condo')?.mortgage,
        mortgages_on_no_property: n.mortgageCheck.unmatched },
      return_on_cash_and_investments: n.investableChangePct,
    }).toEqual({
      by_class: { cash: near(20326.7), stocks_etf: near(63235.2), real_estate: near(961150), personal_property: near(28900), unclassified: near(277845.43) },
      cash: near(20326.7), investments: near(341080.63), what_you_own: near(1351457.33), check_cash_plus_investments_plus_property_equals_what_you_own: true,
      investable: near(361407.33), debts: near(662871.9), net_worth: near(688585.43),
      debt_lines: [{ debt: 'Home mortgage', balance: near(401212.88), required_monthly: near(2846.17) }, { debt: 'Rental condo mortgage', balance: near(236940.1), required_monthly: near(2000) },
        { debt: 'Chase Visa', balance: near(6418.92), required_monthly: near(64) }, { debt: 'Federal student loan (in deferment)', balance: near(18300), required_monthly: near(0) }],
      // RULE UNCLEAR (which total "Monthly debt payments" prints): the app hands out BOTH — reading A as monthlyDebtPayments, reading B as monthlyDebtMinimum
      monthly_debt_payments: near(4910.17), monthly_debt_minimum: near(4612.72),
      mortgage_check: { properties: 2, mortgages: 2, Home: 'Home mortgage', 'Rental condo': 'Rental condo mortgage', mortgages_on_no_property: [] },
      // MOVED 2026-10-11 by DEC-4439: 11.5045% → 10.9092%, hand-checked: totals 290,000 · 362,450.18 · 346,118.04 · today
      // 361,407.33; the $60,000 counts all of 16 Mar and the $25,000 out all of 1 Jul: 362,450.18 ÷ (290,000 + 60,000) ×
      // 346,118.04 ÷ (362,450.18 − 25,000) × 361,407.33 ÷ 346,118.04 − 1 = 10.9092%
      // (before: (362,450.18 − 60,000) ÷ 290,000 × (346,118.04 + 25,000) ÷ 362,450.18 × 361,407.33 ÷ 346,118.04 − 1)
      return_on_cash_and_investments: expect.closeTo(0.1090920, 4),
    });
  });
  test('edge · Nothing entered at all', () => {
    const n = theNetWorth({ uid: 'u', accounts: [], debts: [], since: null, snapshotDays: [] });
    expect({ net_worth: n.netWorth, what_you_own: n.assets, cash: n.cash, investments: n.investments, debts: n.debts, monthly_debt_payments: n.monthlyDebtPayments,
      return_on_cash_and_investments: n.investableChangePct,
      mortgage_check: { properties: n.mortgageCheck.properties, mortgages: n.mortgageCheck.mortgages, mortgages_on_no_property: n.mortgageCheck.unmatched }, unclassed: n.unclassed })
      // // HELD AT THE APP'S ANSWER — his ruling G32/Q48 (2026-09-09): nothing entered shows $0 with 'Nothing entered yet', not a refusal
      .toEqual({ net_worth: 0, what_you_own: 0, cash: 0, investments: 0, debts: 0, monthly_debt_payments: 0, return_on_cash_and_investments: null,
        mortgage_check: { properties: 0, mortgages: 0, mortgages_on_no_property: [] }, unclassed: [] });   // the formula as sent gave $0 for each
  });
});

describe('MK-NW-O-008 thePerformance — five cases', () => {
  test('easy · A window of exactly one year, nothing added or taken out', () => {
    const f = thePerformance({ windowStart: '2025-10-07', windowLabel: 'past year', today: '2026-10-07', pricedGain: 0, transactions: [],
      snapshotDays: [recorded('2025-10-06', [linkedAt('v', 50000)])], investmentAccountIds: new Set(['v']), accounts: [linkedAt('v', 54100)] });
    expect({ beginning: f.walk!.beginning, ending: f.walk!.ending, wealth_generated: f.walk!.wealthGenerated, return_total: f.cumulative })
      .toEqual({ beginning: near(50000), ending: near(54100), wealth_generated: near(4100), return_total: expect.closeTo(0.082, 4) });
    // SETTLED BY DEC-0237 (outside review Claude Performance, 2026-10-11): a window that opens one year back to the
    // day IS a year, and a window of a year or less is never annualised — so the return is the window's own
    // total, +8.20%, not a yearly rate. It read reading B, +8.18% (366 edge-inclusive days ÷ 365 > 1).
    expect(f.ret).toBeCloseTo(0.082, 9);
    expect(f.perYear).toBeNull();
  });
  test('easy · One deposit inside the window', () => {
    const f = thePerformance({ windowStart: '2026-07-07', windowLabel: 'past 3 months', today: '2026-10-07', pricedGain: 0,
      snapshotDays: [recorded('2026-07-06', [linkedAt('f', 100000)]), recorded('2026-08-15', [linkedAt('f', 130000)])],
      transactions: [{ id: 'd', type: 'DEPOSIT', account_id: 'f', amount: 20000, date: '2026-08-15' }], investmentAccountIds: new Set(['f']), accounts: [linkedAt('f', 132600)] });
    const w = f.walk!;
    expect({ return: f.ret, wealth_generated: w.wealthGenerated, walk: [w.beginning, w.contributions, w.withdrawals, w.dividends, w.interest, w.marketChange], ending: w.ending })
      // MOVED 2026-10-11 by DEC-4439: 12.20% → 10.50%, hand-checked: the $20,000 counts all of 15 Aug: 130,000 ÷ (100,000 +
      // 20,000) × 132,600 ÷ 130,000 − 1 = 132,600 ÷ 120,000 − 1 = 10.50% (before: 110,000 ÷ 100,000 × 1.02 − 1 = 12.20%)
      .toEqual({ return: expect.closeTo(0.105, 4), wealth_generated: near(12600), walk: [100000, 20000, 0, 0, 0, 12600].map(near), ending: near(132600) });
  });
  test('complex · Approved drawing: Performance v17, phone 1 — exactly as drawn', () => {
    // INPUT MAPPING: the drawing gives no day for the $15,000, the dividends or the interest; they are placed on
    // recorded days inside the window. The Since window opens where the screen opens it (windowStartKey 'SINCE').
    const days = [recorded('2025-10-01', [linkedAt('v', 80000), linkedAt('e', 20000)]), recorded('2026-04-01', [linkedAt('v', 98000), linkedAt('e', 21000)])];
    const txns = [{ id: 'c', type: 'DEPOSIT', account_id: 'v', amount: 15000, date: '2026-04-01' }, { id: 'd', type: 'DIVIDEND', account_id: 'v', amount: 1800, date: '2026-06-01' },
      { id: 'i', type: 'INTEREST', account_id: 'v', amount: 400, date: '2026-07-01' }];
    const start = windowStartKey('SINCE', ['2025-10-01'], '2026-09-30');
    const ask = (ids: string[]) => thePerformance({ windowStart: start, windowLabel: 'since Oct 1, 2025', today: '2026-09-30', pricedGain: 0, wholeRecord: true,
      snapshotDays: days, transactions: txns, investmentAccountIds: new Set(ids), accounts: [linkedAt('v', 101000), linkedAt('e', 22000)] });
    const all = ask(['v', 'e']), v = ask(['v']), e = ask(['e']);
    const w = all.walk!;
    expect({ wealth_generated_all: w.wealthGenerated, ending_all: w.ending, walk_all: [w.beginning, w.contributions, w.withdrawals, w.dividends, w.interest, w.marketChange],
      per_account_endings: [v.walk!.ending, e.walk!.ending], Vanguard_wealth_generated: v.walk!.wealthGenerated, 'E*TRADE_wealth_generated': e.walk!.wealthGenerated, 'E*TRADE_return': e.ret })
      .toEqual({ wealth_generated_all: near(8000), ending_all: near(123000), walk_all: [100000, 15000, 0, 1800, 400, 5800].map(near),
        per_account_endings: [near(101000), near(22000)], Vanguard_wealth_generated: near(6000), 'E*TRADE_wealth_generated': near(2000), 'E*TRADE_return': expect.closeTo(0.1, 4) });
  });
  test('complex · Exactly two years, large money in and out, a transfer between the two measured accounts, cash inside the brokerage', () => {
    // INPUT MAPPING: the app keeps a value for every day; the reviewer lists only the days it needed. The day of the
    // transfer between the two measured accounts (2025-06-30) is drawn with a value too — it moves nothing in or
    // out of the whole, so the pieces multiply to the same figure.
    const days = [
      recorded('2024-10-06', [linkedAt('v', 196410), linkedAt('f', 82350)]),
      recorded('2025-02-14', [linkedAt('v', 218118.9), linkedAt('f', 84000)]),
      recorded('2025-06-30', [linkedAt('v', 210000), linkedAt('f', 100000)]),
      recorded('2025-11-03', [linkedAt('v', 225824.17), linkedAt('f', 175000)]),
      recorded('2026-05-20', [linkedAt('v', 250000), linkedAt('f', 153384.62)]),
    ];
    const txns = [
      { id: '1', type: 'DEPOSIT', account_id: 'v', amount: 40000, date: '2025-02-14' },
      { id: '2', type: 'TRANSFER', account_id: 'v', counter_account_id: 'f', amount: 12000, date: '2025-06-30' },
      { id: '3', type: 'DEPOSIT', account_id: 'f', amount: 61920, date: '2025-11-03' },
      { id: '4', type: 'WITHDRAWAL', account_id: 'v', amount: 18275.4, date: '2026-05-20' },
      { id: '5', type: 'DIVIDEND', account_id: 'v', amount: 7842.3, date: '2025-12-15' },
      { id: '6', type: 'INTEREST', account_id: 'f', amount: 1216.85, date: '2026-01-31' },
      { id: '7', type: 'DIVIDEND', account_id: 'chase', amount: 50, date: '2026-02-01' },
    ];
    const accounts = [linkedAt('v', 288283.63, 3118.44), acct({ ...linkedAt('f', 145813.45), label: 'Fidelity IRA' })];
    const f = thePerformance({ windowStart: '2024-10-07', windowLabel: 'past 2 years', today: '2026-10-07', pricedGain: 0, snapshotDays: days, transactions: txns,
      investmentAccountIds: new Set(['v', 'f']), accounts });
    const w = f.walk!;
    expect({ beginning: w.beginning, ending: w.ending, per_account_endings: accounts.map((a) => a.balance),
      walk: [w.beginning, w.contributions, -w.withdrawals, w.dividends, w.interest, w.marketChange], wealth_generated: w.wealthGenerated, return_total: f.cumulative })
      .toEqual({ beginning: near(278760), ending: near(437215.52), per_account_endings: [near(291402.07), near(145813.45)],
        walk: [278760, 101920, -18275.4, 7842.3, 1216.85, 65751.77].map(near), wealth_generated: near(74810.92), return_total: expect.closeTo(0.19787363, 4) });   // its walk prints withdrawals with their minus sign
    // MOVED 2026-10-11 by DEC-4439: total 20.2684% → 19.7874%, yearly 9.6531% → 9.4339%, hand-checked: each day's money counts
    // all that day — 302,118.9 ÷ (278,760 + 40,000) = 0.9477943 · 310,000 ÷ 302,118.9 (the transfer between the two nets to 0)
    // · 400,824.17 ÷ (310,000 + 61,920) = 1.0777161 · 403,384.62 ÷ (400,824.17 − 18,275.4) = 1.0544659 · 437,215.52 ÷ 403,384.62
    // = 1.0838676 → product − 1 = 19.7874%; (1.197874)^(365 ÷ 731) − 1 = 9.4339%
    // RULE UNCLEAR (which day the years are counted from): the app counts from the beginning day, 731 days — reading B
    expect(f.ret).toBeCloseTo(0.09433898, 6);
  });
  test('edge · A window that reaches back further than the record', () => {
    const f = thePerformance({ windowStart: '2025-10-07', windowLabel: 'past year', today: '2026-10-07', pricedGain: 5130.25,
      snapshotDays: [recorded('2026-02-02', [linkedAt('s', 70000)])], transactions: [{ id: 'd', type: 'DEPOSIT', account_id: 's', amount: 10000, date: '2026-04-10' }],
      investmentAccountIds: new Set(['s']), accounts: [linkedAt('s', 87412.66)] });
    // SETTLED 2026-10-13 by DEC-5291 ("approved."): a record that begins too late is worked back from the gain the
    // holdings' price history gives — the outside judge's own figures, $87,412.66 − $5,130.25 − $10,000 = $72,282.41 and
    // wealth generated $5,130.25. No percent: only a dollar gain was handed in. (Was: no walk, "The record begins Feb 2, 2026, …")
    expect({ beginning: f.walk?.beginning ?? null, wealth_generated: f.walk?.wealthGenerated ?? null, return: f.ret, ending: f.ending, sentence: f.sentence })
      .toEqual({ beginning: near(72282.41), wealth_generated: near(5130.25), return: null, ending: near(87412.66), sentence: '' });
  });
});
