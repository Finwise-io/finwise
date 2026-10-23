/* THE OUTSIDE CASES, RUN AGAINST THE APP — Net worth module re-run (brief v02), OpenAI, cards MK-NW-F-001 to 030.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_nw_part1_audit_and_claude_brief.json
 * (150 cases) and its run brief moneykeel_nw_part1_claude_code_brief.md. Every expected answer is OpenAI's, as it wrote
 * it; only its input names are mapped onto the app's fields. A case the app fails is a finding — never fixed by
 * changing the answer here.
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing until fixed) · `// BRIEF WRONG:` OpenAI's
 * own expectation is wrong (test.failing, its answer kept, plus a test pinning the app's hand-checked answer) ·
 * `// CARD MISREAD:` the case tests something the card does not describe · `// UNCLEAR:` no rule settles it.
 *
 * TOLERANCE: money to 1e-6 dollars (toBeCloseTo 6), rates to 1e-12 (toBeCloseTo 12) — floating-point sums only.
 * INVARIANT (brief step 6): every case with cash and investments only also asserts
 *   MK-NW-F-016 cashTotal + MK-NW-F-021 investmentsTotal = MK-NW-F-022 investableAssets.
 *
 * INPUT NAMES MAPPED (OpenAI's names → the app's fields):
 *   Class words → AssetClass ids: "Cash" 'cash', "Stocks / Funds" 'stocks_etf', "Bonds & CDs" 'bonds', "Alternatives"
 *   'alternatives', "Real estate" 'real_estate', "Personal property" 'personal_property', "Unclassified" 'mixed'.
 *   A stated class is the account's asset_class. Kind words → kind ids ("high-yield savings" 'hysa', "money market
 *   fund" 'money_market', "foreign currency" 'foreign_currency', "fixed income" 'fixed_income', "529" 'college_529',
 *   "other" 'other_asset', "Roth IRA" 'roth_ira', "401(k)" '401k', "HSA" 'hsa'). Tax words → tax_bucket ("taxable"
 *   TAXABLE, "pre-tax" PRE_TAX, "Roth"/"tax-free" ROTH); tax answers tax-free/tax-deferred → 'tax_free'/'tax_deferred',
 *   no answer (null) → the app's 'not_stated'. wrapperWord's "no word" (null) is the app's ''.
 *   Wrapper selections → AddWrapper ("Roth 401(k)" 'roth_401k', "Traditional IRA" 'trad_ira', "HSA" 'hsa',
 *   "Taxable" 'taxable'); an unknown word is passed through as is.
 *   assetKind catalogue: the app's catalogue is ASSET_KINDS keyed by kind id, so "kind-checking" → 'checking' and
 *   "kind-new" → 'new'; capital letters and the trailing space are kept as written.
 *   A class "allocation" / "split": one class alone is a hand account of a kind in that class (Stocks / Funds
 *   'stocks_etf', Bonds & CDs 'fixed_income', Alternatives 'crypto', Real estate 'home', Personal property 'vehicle',
 *   Cash 'checking', Unclassified 'brokerage' with nothing inside); several classes in one account is a LINKED account
 *   (source 'connected') whose priced holdings are worth each part (VTI Stocks / Funds, BND Bonds & CDs, GLD gold,
 *   a brokered CD Bonds & CDs, a private placement with no tag Unclassified), its uninvested cash as cash_balance.
 *   A "hand-built"/"manual" account with its own cash is cash_balance on a hand account (derive_balance true when it
 *   lists holdings). An unknown balance is balance null.
 *   alternativesSummary: a part's "rate" is the person's own rate for that kind (the overrides argument); a part
 *   with kind null is alternatives money no priced holding explains (DEC-4036h) — built as a linked account holding
 *   an unpriced alternative. The app's "unclassified" is notClassifiedValue, "count" counts accounts.
 *   valueFreshness: today = the now argument (local date); value_month = value_as_of 'YYYY-MM'; holdings_built =
 *   derive_balance true. Its no-answer is null for the whole result.
 *   portfolioActualReturn: retirement_now = balance with retirement_pct 100; return = actual_ttm; property = kind home
 *   (PROPERTY). The function returns the rate only — start_total / end_total are OpenAI's working, not app output.
 *   realEstateUseOf: rent entry { property } = { income, property_id }; household_home = the property stored with
 *   re_use 'primary'; stated "home" = re_use 'primary'; the app says 'primary' for home, 'secondary' for second home.
 *   earmarkDefault: share 0 / 1 = the app's percent 0 / 100; primary_home_id = the third argument.
 *   "complete: false" / "missing" answers: the function returns a number, so the known part is checked on the
 *   function, the missing count on MK-NW-F-066 sumWhere, and the named account on the amber box (MK-XS-F-002
 *   dataGaps 'no-balance', DEC-3279e) the Net worth screen prints above the total.
 */
import {
  assetKind, incomeBearingClassOf, maturityClass, wrapperAccount, assetClassOf, taxTreatmentOf,
  primaryHomeIdOf, isRealAsset, cashTotal,
  investmentsTotal, investableAssets, sumWhere, wrapperWord, accountLastFour, accountDisplayName,
  accountDisplayNames, valueFreshness, portfolioActualReturn, accountAllowsTicker, accountClassBreakdown,
  classPortionLabel, assetAllocation, earmarkDefault, earmarkedAmount,
} from '../../../src/domain/assets';
import { isAlternative, alternativesSummary } from '../../../src/domain/alternatives';
import { propertyUses } from './net-worth';
import { dataGaps } from '../../../src/domain/gaps';

const PROPERTY_KINDS = ['home', 'vehicle', 'real_estate'];
let n = 0;
const acct = (over: Record<string, any> = {}) => {
  const { id, ...rest } = over;
  const tax_bucket = 'tax_bucket' in over ? over.tax_bucket
    : PROPERTY_KINDS.includes(over.kind) ? 'PROPERTY' : (assetKind(over.kind)?.bucket ?? 'TAXABLE');
  return ({ asset_id: id ?? `a${++n}`, label: 'Account', balance: 0, target_return: 0.06, ...rest, tax_bucket }) as any;
};
const pos = (ticker: string, label: string, value: number | null, stored?: string) =>
  ({ position_id: `${ticker || label}-${++n}`, ticker, label, ...(stored ? { asset_class: stored } : {}), last_price: value,
    lots: [{ shares: 1, cost_per_share: 0, purchase_date: '' }] });
const linked = (over: Record<string, any>, cash: number, positions: any[]) =>
  acct({ kind: 'brokerage', source: 'connected', cash_balance: cash, positions, ...over });
const STOCK = (v: number | null) => pos('VTI', 'VANGUARD TOTAL STOCK MARKET ETF', v, 'stock_etf');
const BOND = (v: number | null) => pos('BND', 'VANGUARD TOTAL BOND MARKET ETF', v, 'bond');
const GOLD = (v: number) => pos('GLD', 'SPDR GOLD SHARES', v, 'stock_etf');
const CD = (v: number) => pos('', 'BROKERED CD 4.5% DUE 2027', v, 'cash');
const ALT = (v: number | null) => pos('', 'ACME COLLECTIBLE INTEREST', v, 'other');
const UNTAGGED = (v: number) => pos('', 'PRIVATE PLACEMENT XYZ', v);
const ofClass: Record<string, string> = { 'Stocks / Funds': 'stocks_etf', 'Bonds & CDs': 'fixed_income', Alternatives: 'crypto', 'Real estate': 'home', 'Personal property': 'vehicle', Cash: 'checking', Unclassified: 'brokerage' };
const one = (cls: string, balance: number | null, over: Record<string, any> = {}) => acct({ kind: ofClass[cls], balance, ...over });
const noBalanceGaps = (accounts: any[]) => dataGaps(accounts).filter((g) => g.kind === 'no-balance').map((g) => g.title);
const rent = (property_id: string, income: number) => ({ type: 'long', income: String(income), expenses: '0', property_id });
const day = (d: string) => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
// brief step 6: cash + investments = cash and investments together, on every set with no property in it
const invariant = (accounts: any[]) => expect(cashTotal(accounts) + investmentsTotal(accounts)).toBeCloseTo(investableAssets(accounts), 6);
const sum = (o: Record<string, number>) => Object.values(o).reduce((t, v) => t + v, 0);

describe('MK-NW-F-001 isAlternative — five cases', () => {
  test('easy · Alternatives account', () => { expect(isAlternative(acct({ asset_class: 'alternatives' }))).toBe(true); });
  test('easy · Equity account', () => { expect(isAlternative(acct({ asset_class: 'stocks_etf' }))).toBe(false); });
  test('complex · Confirmed class wins over wrapper', () => { expect(isAlternative(acct({ kind: 'roth_ira', asset_class: 'alternatives' }))).toBe(true); });
  test('complex · Manual alternative holding', () => { expect(isAlternative(acct({ kind: 'other_asset', asset_class: 'alternatives' }))).toBe(true); });
  test('edge · Unclassified account', () => { expect(isAlternative(acct({ asset_class: 'mixed' }))).toBe(false); });
});

describe('MK-NW-F-002 alternativesSummary — five cases', () => {
  const S = (accounts: any[], rates: Record<string, number> = {}) => {
    const s = alternativesSummary(accounts, rates);
    return { count: s.count, total: s.totalValue, unclassified: s.notClassifiedValue, blended_rate: s.blendedReturn, growth_year: s.estAnnualGrowth };
  };
  test('easy · One classified alternative', () => {
    const s = S([acct({ kind: 'other_asset', balance: 2000 })], { other_asset: 0.05 });
    expect([s.count, s.total, s.unclassified]).toEqual([1, 2000, 0]);
    expect(s.blended_rate!).toBeCloseTo(0.05, 12); expect(s.growth_year!).toBeCloseTo(100, 6);
  });
  test('easy · No alternatives accounts', () => {
    expect(S([])).toEqual({ count: 0, total: 0, unclassified: 0, blended_rate: null, growth_year: null });
  });
  test('complex · Two rates blended by dollars', () => {
    const s = S([acct({ kind: 'other_asset', balance: 3000 }), acct({ kind: 'crypto', balance: 1000 })], { other_asset: 0.04, crypto: 0.1 });
    expect([s.count, s.total, s.unclassified]).toEqual([2, 4000, 0]);
    expect(s.blended_rate!).toBeCloseTo(0.055, 12); expect(s.growth_year!).toBeCloseTo(220, 6);
  });
  test('complex · Unclassified excluded from growth', () => {
    // one account: a priced $2,000 alternative and $1,500 of alternatives money no priced holding explains
    const s = S([linked({ balance: 3500 }, 0, [ALT(2000), ALT(null)])], { other_asset: 0.05 });
    expect(s.count).toBe(1); expect(s.total).toBeCloseTo(3500, 6); expect(s.unclassified).toBeCloseTo(1500, 6);
    expect(s.blended_rate!).toBeCloseTo(0.05, 12); expect(s.growth_year!).toBeCloseTo(100, 6);
  });
  test('edge · Zero classified base', () => {
    const s = S([linked({ balance: 800 }, 0, [ALT(null)])]);
    expect(s).toEqual({ count: 1, total: 800, unclassified: 800, blended_rate: null, growth_year: null });
  });
});

describe('MK-NW-F-003 valueFreshness — five cases', () => {
  const F = (asOf: string, today: string, built = false) => valueFreshness(acct({ value_as_of: asOf, derive_balance: built, balance: 1 }), day(today));
  test('easy · Exactly six completed months', () => { expect(F('2026-04-15', '2026-10-15')).toMatchObject({ monthsOld: 6, stale: true }); });
  test('easy · Five months and one day short', () => { expect(F('2026-04-15', '2026-10-14')).toMatchObject({ monthsOld: 5, stale: false }); });
  test('complex · Month-only date', () => { expect(F('2026-04', '2026-10-01')).toEqual({ asOf: '2026-04-01', monthsOld: 6, stale: true }); });
  test('complex · End-of-month exception', () => { expect(F('2026-01-31', '2026-02-28')).toMatchObject({ monthsOld: 1, stale: false }); });
  test('edge · No answer for holdings-built value', () => { expect(F('2026-01-01', '2026-10-15', true)).toBeNull(); });
});

describe('MK-NW-F-004 portfolioActualReturn — five cases (DEC-2484o / DEC-3035b: weighed by the beginning amounts)', () => {
  const ret = (now: number, r: number | null, property = false) =>
    acct({ kind: property ? 'home' : 'brokerage', balance: now, retirement_pct: 100, actual_ttm: r ?? undefined });
  // the function returns the rate only; start_total / end_total are OpenAI's working (hand-checked in each comment)
  test('easy · One reported return', () => { expect(portfolioActualReturn([ret(11000, 0.1)])!).toBeCloseTo(0.1, 12); });   // 11,000 ÷ 10,000 − 1
  test('easy · Reported zero counts', () => { expect(portfolioActualReturn([ret(5000, 0)])).toBe(0); });
  test('complex · Beginning-value weighting', () => {
    // start 10,000 + 10,000 = 20,000; end 11,000 + 9,000 = 20,000
    expect(portfolioActualReturn([ret(11000, 0.1), ret(9000, -0.1)])!).toBeCloseTo(0, 12);
  });
  test('complex · Missing and property excluded', () => {
    expect(portfolioActualReturn([ret(11000, 0.1), ret(4000, null), ret(20000, 0.2, true)])!).toBeCloseTo(0.1, 12);
  });
  test('edge · Total-loss return excluded', () => { expect(portfolioActualReturn([ret(1000, -1.0), ret(0, 0.2)])).toBeNull(); });
});

describe('MK-NW-F-005 accountAllowsTicker — five cases', () => {
  test('easy · Brokerage with holdings', () => { expect(accountAllowsTicker(acct({ kind: 'brokerage', asset_class: 'stocks_etf', positions: [STOCK(100)] }))).toBe(true); });
  test('easy · Checking blocked', () => { expect(accountAllowsTicker(acct({ kind: 'checking', asset_class: 'cash', positions: [STOCK(100)] }))).toBe(false); });
  test('complex · Bond account with existing holdings', () => {
    expect(accountAllowsTicker(acct({ kind: 'fixed_income', asset_class: 'bonds', positions: [BOND(100)] }))).toBe(true);
  });
  test('complex · Manual alternative no holdings', () => { expect(accountAllowsTicker(acct({ kind: 'other_asset', asset_class: 'alternatives', positions: [] }))).toBe(false); });
  // BRIEF WRONG (2026-10-22): his ruling DEC-2484g — "Any account that already lists holdings can take a recorded buy or sale"
  // — covers a 529 listing its funds; the card it was written from said otherwise and was corrected. The auditor's answer is kept.
  test.failing('edge · 529 blocked regardless holdings', () => { expect(accountAllowsTicker(acct({ kind: 'college_529', positions: [STOCK(100)] }))).toBe(false); });
  test('pin · a 529 that lists holdings takes a buy or sale (DEC-2484g)', () => { expect(accountAllowsTicker(acct({ kind: 'college_529', positions: [STOCK(100)] }))).toBe(true); });
});

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-006 isCashKind left the code —
// nothing in the app, the doors or the engines called it; the screens use the account's class instead. The block "MK-NW-F-006 isCashKind — five cases"
// (5 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

describe('MK-NW-F-007 assetKind — five cases', () => {
  test('easy · Exact catalogue id', () => { expect(assetKind('checking')).toEqual(expect.objectContaining({ id: 'checking', label: 'Checking' })); });
  test('easy · Missing id', () => { expect(assetKind(null as any)).toBeUndefined(); });
  test('complex · Wrong capitalization', () => { expect(assetKind('CHECKING')).toBeUndefined(); });
  test('complex · Whitespace altered id', () => { expect(assetKind('checking ')).toBeUndefined(); });
  test('edge · Unknown future kind', () => { expect(assetKind('new')).toBeUndefined(); });
});

describe('MK-NW-F-008 incomeBearingClassOf — five cases', () => {
  test('easy · Money-market fund priority', () => { expect(incomeBearingClassOf('Money Market Settlement Fund')).toBe('stocks_etf'); });
  test('easy · Plain CD', () => { expect(incomeBearingClassOf('12 month CD')).toBe('bonds'); });
  // SETTLED 2026-10-13 by DEC-2747d: a bond word followed straight away by a business word (Wine, Estates, Group,
  // Holdings …) starts a company's name, so 'Treasury Wine Estates' is nothing with or without "Ltd"; real Treasury
  // names keep their bond reading (the hand-checked line below).
  test('complex · Company name false positive', () => { expect(incomeBearingClassOf('Treasury Wine Estates')).toBeNull(); });
  test('complex · Company name false positive — with Ltd, and real Treasury names still bonds', () => {
    expect([incomeBearingClassOf('Treasury Wine Estates'), incomeBearingClassOf('Treasury Wine Estates Ltd')]).toEqual([null, null]);
    expect(['US Treasury Bond 10Y', 'UST 2031', 'Treasury 2031', 'TREAS NOTE'].map((l) => incomeBearingClassOf(l))).toEqual(['bonds', 'bonds', 'bonds', 'bonds']);
  });
  test('complex · Option language', () => { expect(incomeBearingClassOf('ABC 2027 call')).toBe('alternatives'); });
  test('edge · Embedded letters are not words', () => { expect(incomeBearingClassOf('ABCD Growth')).toBeNull(); });
});

describe('MK-NW-F-009 maturityClass — five cases', () => {
  test('easy · Full valid date', () => { expect(maturityClass('2030-06-15')).toBe('bonds'); });
  test('easy · No maturity date', () => { expect(maturityClass('')).toBe('cash'); });
  // normalized_date is OpenAI's working; the function returns the class only (it reads '2030-06' as '2030-06-01')
  test('complex · Month-only date', () => { expect(maturityClass('2030-06')).toBe('bonds'); });
  test('complex · Past maturity still classifies bond', () => { expect(maturityClass('2020-01-01')).toBe('bonds'); });
  test('edge · Impossible date', () => { expect(maturityClass('2026-02-30')).toBe('cash'); });
});

describe('MK-NW-F-010 wrapperAccount — five cases', () => {
  test('easy · Roth 401(k)', () => { expect(wrapperAccount('roth_401k')).toEqual({ kind: '401k', tax_bucket: 'ROTH' }); });
  test('easy · Traditional IRA', () => { expect(wrapperAccount('trad_ira')).toEqual({ kind: 'trad_ira', tax_bucket: 'PRE_TAX' }); });
  test('complex · HSA', () => { expect(wrapperAccount('hsa')).toEqual({ kind: 'hsa', tax_bucket: 'PRE_TAX' }); });
  test('complex · Taxable brokerage', () => { expect(wrapperAccount('taxable')).toEqual({ kind: 'brokerage', tax_bucket: 'TAXABLE' }); });
  test('edge · Unrecognized value', () => { expect(wrapperAccount('SEP IRA Plus' as any)).toStrictEqual({ kind: undefined, tax_bucket: undefined }); });
});

describe('MK-NW-F-011 assetClassOf — five cases', () => {
  test('easy · Explicit class wins', () => { expect(assetClassOf(acct({ asset_class: 'alternatives', label: 'Checking', kind: 'checking', positions: [] }))).toBe('alternatives'); });
  test('easy · Maturity outranks name', () => { expect(assetClassOf(acct({ maturity_date: '2030-01-01', label: 'Savings', kind: 'checking' }))).toBe('bonds'); });
  test('complex · Property name ignored', () => { expect(assetClassOf(acct({ label: 'Silver Lake', kind: 'home' }))).toBe('real_estate'); });
  test('complex · Unclassified no evidence', () => { expect(assetClassOf(acct({ label: '', kind: undefined, tax_bucket: undefined, positions: [] }))).toBe('mixed'); });
  test('edge · Holding exists but kind/name blank', () => {
    expect(assetClassOf(acct({ label: '', kind: undefined, tax_bucket: undefined, positions: [STOCK(100)] }))).toBe('stocks_etf');
  });
});

describe('MK-NW-F-012 taxTreatmentOf — five cases', () => {
  test('easy · 529 fixed treatment', () => { expect(taxTreatmentOf(acct({ kind: 'college_529', tax_bucket: 'TAXABLE' }))).toBe('tax_free'); });
  test('easy · HSA fixed treatment', () => { expect(taxTreatmentOf(acct({ kind: 'hsa', tax_bucket: 'PRE_TAX' }))).toBe('tax_deferred'); });
  test('complex · Roth bucket', () => { expect(taxTreatmentOf(acct({ kind: 'brokerage', tax_bucket: 'ROTH' }))).toBe('tax_free'); });
  // null = the app's 'not_stated' (DEC-4036f: nothing stated is never assumed taxable, the kind's Taxable included)
  test('complex · No tax bucket', () => { expect(taxTreatmentOf(acct({ kind: 'crypto', tax_bucket: null }))).toBe('not_stated'); });
  test('edge · Explicit account bucket beats kind', () => { expect(taxTreatmentOf(acct({ kind: 'brokerage', tax_bucket: 'PRE_TAX' }))).toBe('tax_deferred'); });
});

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-013 realEstateUseOf left the
// code — nothing in the app, the doors or the engines called it; the screens read a property's use from MK-NW-F-107
// propertyUses, which reads the same rule (MK-NW-F-117 propertyUseMap). Five of the block "MK-NW-F-013 realEstateUseOf —
// five cases" (6 cases) are no longer run; their records are kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused. The sixth case is the proof of DEC-4913, so it stays, read through
// MK-NW-F-107 propertyUses ('second' is realEstateUseOf's 'secondary'): the same households, the same answers.
describe('DEC-4913 — the marked home that rent made a rental leaves the other property a second home (read by MK-NW-F-107 propertyUses)', () => {
  // SETTLED 2026-10-13 by DEC-4913 (owner, "approved."): the entered-first fallback (DEC-2747e) runs only when no use
  // is stated on any property; B's 'primary' mark is a stated use even though its rent entry makes it a rental
  // (DEC-3035p), so A is a second home (DEC-1926), not promoted to the home.
  test('complex · Rent entry names another property — B rental, no home, both count: $400,000 + $300,000 = $700,000', () => {
    const A = acct({ id: 'A', kind: 'home', balance: 400000 }); const B = acct({ id: 'B', kind: 'home', re_use: 'primary', balance: 300000 });
    const rentals = [rent('B', 1400)];
    const home = primaryHomeIdOf([A, B], rentals);
    const uses = propertyUses([A, B], rentals);
    expect([uses.get(String(A.asset_id)), uses.get(String(B.asset_id)), home]).toEqual(['second', 'rental', null]);
    expect([earmarkDefault(A, undefined, home), earmarkDefault(B, undefined, home)]).toEqual([100, 100]);   // DEC-0100
    expect(earmarkedAmount(A, undefined, home) + earmarkedAmount(B, undefined, home)).toBeCloseTo(700000, 6);   // was $300,000
    // nothing stated on either property: the fallback still makes the one entered first (last in the list) the home
    const C = acct({ id: 'C', kind: 'home' }); const D = acct({ id: 'D', kind: 'home' });
    expect(primaryHomeIdOf([C, D], [])).toBe('D');
  });
});

describe('MK-NW-F-014 isRealAsset — five cases', () => {
  test('easy · Real estate', () => { expect(isRealAsset(acct({ asset_class: 'real_estate' }))).toBe(true); });
  test('easy · Stocks', () => { expect(isRealAsset(acct({ asset_class: 'stocks_etf' }))).toBe(false); });
  test('complex · Vehicle personal property', () => { expect(isRealAsset(acct({ kind: 'vehicle', asset_class: 'personal_property' }))).toBe(true); });
  test('complex · Alternatives', () => { expect(isRealAsset(acct({ asset_class: 'alternatives' }))).toBe(false); });
  test('edge · Unclassified', () => { expect(isRealAsset(acct({ asset_class: 'mixed' }))).toBe(false); });
});

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-015 totalAssets left the code —
// nothing in the app, the doors or the engines called it; the screen's total comes from MK-NW-F-039 buildAssetsState. The block "MK-NW-F-015 totalAssets — five cases"
// (6 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

describe('MK-NW-F-016 cashTotal — five cases', () => {
  test('easy · One bank account', () => { const a = [one('Cash', 2500)]; expect(cashTotal(a)).toBeCloseTo(2500, 6); invariant(a); });
  test('easy · Investment cash component', () => { const a = [linked({ balance: 5000 }, 500, [STOCK(4500)])]; expect(cashTotal(a)).toBeCloseTo(500, 6); invariant(a); });
  test('complex · CD in cash-kind account', () => {
    const a = [linked({ kind: 'savings', balance: 1100 }, 100, [CD(1000)])];
    expect(cashTotal(a)).toBeCloseTo(100, 6); invariant(a);
  });
  test('complex · Cash plus negative overdrawn balance', () => {
    // the overdrawn account: a hand-built account whose balance is −$100 is Cash −$100 (DEC-4036i)
    const a = [one('Cash', 700), acct({ kind: 'brokerage', derive_balance: true, cash_balance: 0, balance: -100, positions: [] })];
    expect(cashTotal(a)).toBeCloseTo(600, 6); invariant(a);
  });
  // BRIEF WRONG: cash_total null — right is $0 with the account named in the amber box (DEC-3279e); the screen's Cash
  // row reads "Value not entered" (DEC-3657), so no person sees $0 of cash presented as known.
  test.failing('edge · Missing cash balance', () => { expect(cashTotal([one('Cash', null)])).toBeNull(); });
  test('edge · Missing cash balance — the app\'s answer, hand-checked', () => {
    const a = [one('Cash', null, { label: 'Checking' })];
    expect(cashTotal(a)).toBe(0); expect(noBalanceGaps(a)).toEqual([expect.stringContaining('Checking')]); invariant(a);
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
// (6 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

describe('MK-NW-F-021 investmentsTotal — five cases', () => {
  const check = (accounts: any[], inv: number, both: number) => {
    expect(investmentsTotal(accounts)).toBeCloseTo(inv, 6);
    expect(cashTotal(accounts) + investmentsTotal(accounts)).toBeCloseTo(both, 6);
    expect(investableAssets(accounts)).toBeCloseTo(both, 6);
  };
  test('easy · Stocks and bonds', () => { check([one('Stocks / Funds', 4000), one('Bonds & CDs', 1000), one('Cash', 500)], 5000, 5500); });
  test('easy · Unclassified included', () => { check([one('Unclassified', 300), one('Cash', 200)], 300, 500); });
  test('complex · Cash inside brokerage excluded', () => { check([linked({ balance: 10000 }, 700, [STOCK(8000), BOND(1300)])], 9300, 10000); });
  test('complex · CD in cash-kind account included', () => { check([linked({ kind: 'savings', balance: 2500 }, 500, [CD(2000)])], 2000, 2500); });
  test('edge · Missing balance breaks completeness', () => {
    const accounts = [one('Stocks / Funds', 2000), one('Cash', 100), acct({ label: 'Linked brokerage', kind: 'brokerage', source: 'connected', balance: null })];
    expect(investmentsTotal(accounts)).toBeCloseTo(2000, 6);                 // known_investments
    expect(cashTotal(accounts)).toBeCloseTo(100, 6);                         // known_cash
    expect(investableAssets(accounts)).toBeCloseTo(2100, 6);                 // known_sum
    expect(sumWhere(accounts, (a) => !isRealAsset(a)).missingCount).toBe(1); // complete: false
    expect(noBalanceGaps(accounts)).toEqual([expect.stringContaining('Linked brokerage')]);
    invariant(accounts);
  });
});

describe('MK-NW-F-022 investableAssets — five cases', () => {
  test('easy · Bank and brokerage', () => { const a = [one('Cash', 500), one('Stocks / Funds', 2000)]; expect(investableAssets(a)).toBeCloseTo(2500, 6); invariant(a); });
  test('easy · Property excluded', () => { expect(investableAssets([one('Cash', 500), one('Real estate', 300000)])).toBeCloseTo(500, 6); });
  test('complex · Known zero and unknown', () => {
    const a = [one('Cash', 1000), one('Cash', 0), acct({ label: 'Linked savings', kind: 'savings', source: 'connected', balance: null })];
    expect(investableAssets(a)).toBeCloseTo(1000, 6);
    expect(sumWhere(a, (x) => !isRealAsset(x)).missingCount).toBe(1);
    expect(noBalanceGaps(a)).toEqual([expect.stringContaining('Linked savings')]);
    invariant(a);
  });
  test('complex · Negative cash account included', () => {
    const a = [one('Cash', 400), one('Cash', -100), one('Stocks / Funds', 2000)];
    expect(investableAssets(a)).toBeCloseTo(2300, 6); invariant(a);
  });
  // BRIEF WRONG: total null — right is $0 with both accounts named in the amber box (DEC-3279e, DEC-0260)
  test.failing('edge · All balances unknown', () => { expect(investableAssets([one('Cash', null), one('Stocks / Funds', null)])).toBeNull(); });
  test('edge · All balances unknown — the app\'s answer, hand-checked', () => {
    const a = [one('Cash', null), one('Stocks / Funds', null)];
    expect(investableAssets(a)).toBe(0); expect(sumWhere(a, (x) => !isRealAsset(x)).missingCount).toBe(2); invariant(a);
  });
});

describe('MK-NW-F-023 wrapperWord — five cases', () => {
  test('easy · Checking word', () => { expect(wrapperWord('checking')).toBe('Checking'); });
  test('easy · Brokerage word', () => { expect(wrapperWord('brokerage')).toBe('Brokerage'); });
  test('complex · Crypto is content not wrapper', () => { expect(wrapperWord('crypto', { wrapper_confirmed: false })).toBe(''); });
  test('complex · Crypto confirmed brokerage', () => { expect(wrapperWord('crypto', { wrapper_confirmed: true })).toBe('Brokerage'); });
  test('edge · Unknown kind', () => { expect(wrapperWord('mystery')).toBe(''); });
});

describe('MK-NW-F-024 accountLastFour — five cases', () => {
  test('easy · Mask digits', () => { expect(accountLastFour({ mask: '****1234', account_number: '999999' })).toBe('1234'); });
  test('easy · Account number fallback', () => { expect(accountLastFour({ mask: null as any, account_number: '12-34-5678' })).toBe('5678'); });
  test('complex · Mask has priority', () => { expect(accountLastFour({ mask: 'xx-0042', account_number: '9999' })).toBe('0042'); });
  test('complex · Non-digits stripped', () => { expect(accountLastFour({ mask: 'A-7B-2C-9', account_number: null as any })).toBeNull(); });
  test('edge · No digits', () => { expect(accountLastFour({ mask: '****', account_number: null as any })).toBeNull(); });
});

describe('MK-NW-F-025 accountDisplayName — five cases', () => {
  const N = (o: Record<string, any>) => accountDisplayName({ label: '', ...o } as any);
  test('easy · Taxable institution and suffix', () => { expect(N({ institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', mask: '1234' })).toBe('Fidelity -1234'); });
  test('easy · Roth IRA', () => { expect(N({ institution: 'Fidelity', kind: 'roth_ira', tax_bucket: 'ROTH', mask: '1234' })).toBe('Fidelity Roth IRA -1234'); });
  test('complex · Roth 401(k) label', () => { expect(N({ institution: 'Fidelity', kind: '401k', tax_bucket: 'ROTH', mask: '1234' })).toBe('Fidelity Roth 401(k) -1234'); });
  test('complex · Unknown tax type is not advantaged', () => {
    expect(N({ institution: 'Vanguard', kind: 'crypto', tax_bucket: undefined, mask: '1111', label: 'My Bitcoin' })).toBe('Vanguard -1111');
  });
  test('edge · Imported holding with one holding', () => {
    expect(N({ label: 'Imported holding', institution: undefined, positions: [pos('AAPL', 'APPLE INC', 100, 'stock_etf')] })).toBe('AAPL');
  });
});

describe('MK-NW-F-026 accountDisplayNames — five cases', () => {
  const names = (rows: [string, string][]) => { const m = accountDisplayNames(rows.map(([asset_id, label]) => ({ asset_id, label }) as any)); return rows.map(([id]) => m.get(id)); };
  test('easy · Unique names unchanged', () => { expect(names([['a1', 'Checking'], ['a2', 'Brokerage']])).toEqual(['Checking', 'Brokerage']); });
  test('easy · Two identical names', () => { expect(names([['a1', 'Checking'], ['a2', 'Checking']])).toEqual(['Checking · 1', 'Checking · 2']); });
  test('complex · ID text order differs numeric intuition', () => {
    const m = accountDisplayNames([{ asset_id: '2', label: 'IRA' }, { asset_id: '10', label: 'IRA' }] as any);
    expect({ 10: m.get('10'), 2: m.get('2') }).toEqual({ 10: 'IRA · 1', 2: 'IRA · 2' });
  });
  test('complex · Generated suffix collides with existing base', () => {
    expect(names([['a1', 'Bank'], ['a2', 'Bank'], ['a3', 'Bank · 1']])).toEqual(['Bank · 2', 'Bank · 3', 'Bank · 1']);
  });
  test('edge · Three-way duplicate', () => { expect(names([['a', 'IRA'], ['b', 'IRA'], ['c', 'IRA']])).toEqual(['IRA · 1', 'IRA · 2', 'IRA · 3']); });
});

describe('MK-NW-F-027 accountClassBreakdown — five cases', () => {
  test('easy · Linked account prices add to balance', () => {
    const b = accountClassBreakdown(linked({ balance: 10000 }, 500, [{ ...STOCK(950), lots: [{ shares: 10, cost_per_share: 0, purchase_date: '' }] }]))!;
    expect(b.cash).toBeCloseTo(500, 6); expect(b.stocks_etf).toBeCloseTo(9500, 6); expect(sum(b)).toBeCloseTo(10000, 6);
  });
  test('easy · Hand-built account recorded cash', () => {
    const b = accountClassBreakdown(acct({ kind: 'fixed_income', balance: 5000, cash_balance: 800 }))!;
    expect(b.cash).toBeCloseTo(800, 6); expect(b.bonds).toBeCloseTo(4200, 6); expect(sum(b)).toBeCloseTo(5000, 6);
  });
  test('complex · Unpriced holdings span classes', () => {
    // never cash: the $4,500 the unpriced share and bond explain is Unclassified, cash stays the $500 the broker sent
    const b = accountClassBreakdown(linked({ balance: 7000 }, 500, [STOCK(2000), STOCK(null), BOND(null)]))!;
    expect(b.cash).toBeCloseTo(500, 6); expect(b.stocks_etf).toBeCloseTo(2000, 6); expect(b.mixed).toBeCloseTo(4500, 6);
    expect(sum(b)).toBeCloseTo(7000, 6);
  });
  test('complex · Small negative discrepancy', () => {
    // $50 over a $10,000 balance is inside the 1% tolerance and comes off the largest class
    const b = accountClassBreakdown(linked({ balance: 10000 }, 0, [STOCK(6000), BOND(4050)]))!;
    expect(b.stocks_etf).toBeCloseTo(5950, 6); expect(b.bonds).toBeCloseTo(4050, 6); expect(sum(b)).toBeCloseTo(10000, 6);
  });
  test('edge · Overdrawn manual account', () => {
    const b = accountClassBreakdown(acct({ kind: 'stocks_etf', balance: -100, cash_balance: 50 }))!;
    expect(b.cash).toBe(-100); expect(sum(b)).toBe(-100);
  });
});

describe('MK-NW-F-028 classPortionLabel — five cases', () => {
  test('easy · One stock holding', () => {
    expect(classPortionLabel(acct({ kind: 'brokerage', positions: [pos('AAPL', 'APPLE INC', 100, 'stock_etf')] }), 'stocks_etf')).toBe('1 holding in this account');
  });
  test('easy · No stocks listed', () => { expect(classPortionLabel(acct({ kind: 'brokerage', positions: [] }), 'stocks_etf')).toBe('stocks & funds in this account'); });
  test('complex · Bond aliases and plural', () => {
    const a = acct({ kind: 'brokerage', positions: [pos('', 'UST 2028', 100, 'bond'), pos('', 'T-bill 2029', 100, 'bond'), pos('', '6-month CD', 100, 'bond')] });
    expect(classPortionLabel(a, 'bonds')).toBe('1 CD & 2 Treasuries in this account');
  });
  test('complex · Options and holdings split', () => {
    const a = acct({ kind: 'brokerage', positions: [ALT(100)], option_holdings: [{ value: 10 }, { value: 20 }] });
    expect(classPortionLabel(a, 'alternatives')).toBe('2 options & 1 holding in this account');
  });
  test('edge · Unpriced class with no holdings', () => { expect(classPortionLabel(acct({ kind: 'brokerage', positions: [] }), 'mixed')).toBe('unpriced portion of this account'); });
});

describe('MK-NW-F-029 assetAllocation — five cases', () => {
  test('easy · Single cash account', () => {
    const a = [one('Cash', 1000)]; const by = assetAllocation(a);
    expect(by.cash).toBeCloseTo(1000, 6); expect(sum(by)).toBeCloseTo(1000, 6); invariant(a);
  });
  test('easy · Single equity account', () => {
    const a = [one('Stocks / Funds', 5000)]; const by = assetAllocation(a);
    expect(by.stocks_etf).toBeCloseTo(5000, 6); expect(sum(by)).toBeCloseTo(5000, 6); invariant(a);
  });
  test('complex · Split portfolio reconciles', () => {
    const a = [linked({ balance: 8000 }, 500, [STOCK(4000), BOND(2000), GOLD(1000), UNTAGGED(500)])]; const by = assetAllocation(a);
    expect(sum(by)).toBeCloseTo(8000, 6); expect(by.cash).toBeCloseTo(500, 6);
    expect([by.stocks_etf, by.bonds, by.alternatives, by.mixed, by.real_estate, by.personal_property]).toEqual([4000, 2000, 1000, 500, 0, 0]);
    invariant(a);
  });
  test('complex · Hand-built account split', () => {
    const a = [acct({ kind: 'brokerage', derive_balance: true, balance: 6000, cash_balance: 1000, positions: [STOCK(3000), BOND(2000)] })];
    const by = assetAllocation(a);
    expect(by.cash).toBeCloseTo(1000, 6); expect(by.stocks_etf).toBeCloseTo(3000, 6); expect(by.bonds).toBeCloseTo(2000, 6);
    expect(sum(by)).toBeCloseTo(6000, 6); invariant(a);
  });
  test('edge · Missing balance must be flagged', () => {
    const a = [one('Cash', 1000), one('Stocks / Funds', null, { label: 'Index fund' })];
    expect(sum(assetAllocation(a))).toBeCloseTo(1000, 6);                  // known_class_sum
    expect(sumWhere(a, () => true).missingCount).toBe(1);                   // missing_balance_count, complete: false
    expect(noBalanceGaps(a)).toEqual([expect.stringContaining('Index fund')]);
    invariant(a);
  });
});

describe('MK-NW-F-030 earmarkDefault — five cases', () => {
  test('easy · 529 excluded', () => { expect(earmarkDefault(acct({ kind: 'college_529' }))).toBe(0); });
  test('easy · Ordinary brokerage included', () => { expect(earmarkDefault(acct({ kind: 'brokerage' }))).toBe(100); });
  test('complex · Identified household home excluded', () => { expect(earmarkDefault(acct({ id: 'A', kind: 'home', re_use: 'primary' }), undefined, 'A')).toBe(0); });
  test('complex · Rental property included', () => { expect(earmarkDefault(acct({ id: 'B', kind: 'home', re_use: 'rental' }), undefined, 'A')).toBe(100); });
  test('edge · Household explicitly has no home', () => { expect(earmarkDefault(acct({ id: 'A', kind: 'home' }), undefined, null)).toBe(100); });
});
