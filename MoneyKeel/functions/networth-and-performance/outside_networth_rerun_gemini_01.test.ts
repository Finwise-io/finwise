/* THE OUTSIDE CASES, RUN AGAINST THE APP — Net worth module re-run (brief v02), Gemini, cards MK-NW-F-001 to 010.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/NW-test-cases-re-run-03-part01.json (50 cases).
 * Every expected answer is Gemini's, as it wrote it; only its input names are mapped onto the app's fields.
 * A case the app fails is a finding — never fixed by changing the answer here.
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing until fixed) · `// BRIEF WRONG:` Gemini's
 * own expectation is wrong (test.failing, its answer kept) · `// CARD MISREAD:` the case tests a function the card does
 * not describe; it is run on the nearest true reading and said so.
 *
 * INPUT NAMES MAPPED (Gemini's names → the app's fields):
 *   asset_class / class → asset_class (an account Gemini calls "unclassified" is an account with no class and no kind).
 *   value_date → value_as_of; current_date → the clock handed to valueFreshness (local midnight).
 *   start_balance + return_rate → an account set aside 100% for retirement whose balance today is
 *     start × (1 + rate) and whose reported twelve-month return (actual_ttm) is the rate — the card weighs by what was
 *     set aside when the twelve months began, which is exactly the start balance. cash_flow is not an input of this card.
 *   class "brokerage"/"investment" + has_holdings → kind 'brokerage' / 'stocks_etf', with positions when true;
 *     "cash" → kind checking; "real_estate" → kind home. account_kind → the app's kind id ("money_market_fund" →
 *     'money_market'). assetKind looks up a KIND id in the app's list of kinds, not an account id in a catalogue:
 *     each case is run on the kind word Gemini's catalogue holds ("employer_401k" → '401k').
 *   is_income_bearing → incomeBearingClassOf returns a class (bonds, cash, stocks_etf, …) or nothing: true = a class.
 *   is_bond → maturityClass(...) === 'bonds'. wrapper_type → the app's wrapper word ("roth_ira" → 'roth');
 *     "tax_free" → ROTH, "pre_tax" → PRE_TAX, kind "retirement" = any retirement kind; assumed_taxable false =
 *     no tax type set.
 */
import { isAlternative, alternativesSummary } from '../../../src/domain/alternatives';
import {
  valueFreshness, portfolioActualReturn, accountAllowsTicker, isCashKind, assetKind, incomeBearingClassOf, maturityClass,
  wrapperAccount,
} from '../../../src/domain/assets';

let n = 0;
const A = (o: Record<string, any>) => ({ asset_id: `a${++n}`, label: 'Account', ...o }) as any;
const day = (d: string) => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const RETIRE = ['401k', 'trad_ira', 'roth_ira', 'hsa'];

describe('MK-NW-F-001 isAlternative — five cases', () => {
  test('easy · Alternative asset class check', () => { expect(isAlternative(A({ asset_class: 'alternatives' }))).toBe(true); });
  test('easy · Non-alternative asset class check', () => { expect(isAlternative(A({ asset_class: 'cash' }))).toBe(false); });
  test('complex · Physical gold alternative holding', () => { expect(isAlternative(A({ asset_class: 'alternatives', balance: 18500 }))).toBe(true); });
  test('complex · Brokerage stocks and ETFs account', () => { expect(isAlternative(A({ asset_class: 'stocks_etf', balance: 125000 }))).toBe(false); });
  test('edge · Missing asset_class attribute', () => { expect(isAlternative(A({ asset_class: null }))).toBe(false); });
});

describe('MK-NW-F-002 alternativesSummary — five cases', () => {
  const total = (accts: any[]) => alternativesSummary(accts).totalValue;
  test('easy · Single alternative account summary', () => { expect(total([A({ asset_class: 'alternatives', kind: 'crypto', balance: 10000 })])).toBe(10000); });
  test('easy · Empty alternatives list', () => { expect(total([])).toBe(0); });
  // Gemini's title says private equity; DEC-2334 offers none in this phase, so the second account is gold.
  test('complex · Multiple alternative accounts', () => {
    expect(total([A({ asset_class: 'alternatives', kind: 'crypto', balance: 15000 }), A({ asset_class: 'alternatives', kind: 'commodities', balance: 75000 })])).toBe(90000);
  });
  test('complex · Alternatives with unclassified sleeve filtering', () => {
    expect(total([A({ asset_class: 'alternatives', kind: 'crypto', balance: 20000 }), A({ balance: 5000 })])).toBe(20000);
  });
  // the total is $0 with one account counted; the screen says "Value not entered" for it (DEC-3657, DEC-3279e)
  test('edge · Alternative account with null balance', () => { expect(total([A({ asset_class: 'alternatives', kind: 'crypto', balance: null })])).toBe(0); });
});

describe('MK-NW-F-003 valueFreshness — five cases', () => {
  const months = (v: string, c: string) => valueFreshness(A({ value_as_of: v, balance: 1 }), day(c))!;
  test('easy · Recent valuation date', () => { expect(months('2026-10-03', '2026-10-13').monthsOld).toBe(0); });
  test('easy · Exactly 3 months elapsed', () => { expect(months('2026-07-13', '2026-10-13').monthsOld).toBe(3); });
  test('complex · Stale valuation exceeding 6 months threshold', () => {
    const f = months('2026-02-13', '2026-10-13');
    expect([f.monthsOld, f.stale]).toEqual([8, true]);
  });
  test('complex · Month-end edge case valuation', () => { expect(months('2026-01-31', '2026-03-31').monthsOld).toBe(2); });
  // BRIEF WRONG: 5 — right is 6. A month-only date is read as the 1st (DEC-3035h): 1 Apr → 13 Oct is six whole
  // months (May 1, Jun 1, … Oct 1 each reached), so the value is also old under the six-month rule (DEC-2484f).
  test.failing('edge · Month-only date string format', () => { expect(months('2026-04', '2026-10-13').monthsOld).toBe(5); });
  test('edge · Month-only date string format — the app\'s answer, hand-checked', () => {
    const f = months('2026-04', '2026-10-13');
    expect([f.asOf, f.monthsOld, f.stale]).toEqual(['2026-04-01', 6, true]);
  });
});

describe('MK-NW-F-004 portfolioActualReturn — five cases', () => {
  const R = (rows: [number, number][]) => portfolioActualReturn(rows.map(([s, r]) => A({ kind: '401k', tax_bucket: 'PRE_TAX', balance: s * (1 + r), actual_ttm: r, retirement_pct: 100 })));
  test('easy · Single retirement account return', () => { expect(R([[100000, 0.08]])!).toBeCloseTo(0.08, 12); });
  test('easy · Two equal retirement accounts', () => { expect(R([[50000, 0.06], [50000, 0.10]])!).toBeCloseTo(0.08, 12); });
  test('complex · Unequal capital retirement weighting', () => {
    // (321,000 + 115,000) ÷ (300,000 + 100,000) − 1 = 9%
    expect(R([[300000, 0.07], [100000, 0.15]])!).toBeCloseTo(0.09, 12);
  });
  test('complex · Retirement portfolio with cash flow adjustment', () => { expect(R([[250000, 0.08]])!).toBeCloseTo(0.08, 12); });
  // BRIEF WRONG: 0.0 — right is no figure. Nothing was set aside when the twelve months began, so there is nothing to
  // measure a return from; tenet 3 (a figure with no input refuses, never $0 or 0%) and DEC-2746d.
  test.failing('edge · Zero beginning balance retirement account', () => { expect(R([[0, 0.12]])).toBe(0); });
  test('edge · Zero beginning balance — the app refuses', () => { expect(R([[0, 0.12]])).toBeNull(); });
});

describe('MK-NW-F-005 accountAllowsTicker — five cases', () => {
  test('easy · Brokerage account with holdings structure', () => {
    expect(accountAllowsTicker(A({ kind: 'brokerage', tax_bucket: 'TAXABLE', positions: [{ ticker: 'VTI' }] }))).toBe(true);
  });
  test('easy · Checking account ticker restriction', () => { expect(accountAllowsTicker(A({ kind: 'checking', tax_bucket: 'CASH' }))).toBe(false); });
  test('complex · Manual investment account with stock lots', () => {
    expect(accountAllowsTicker(A({ kind: 'stocks_etf', tax_bucket: 'TAXABLE', positions: [{ ticker: 'AAPL' }] }))).toBe(true);
  });
  test('complex · Real estate property asset class', () => { expect(accountAllowsTicker(A({ kind: 'home', tax_bucket: 'PROPERTY' }))).toBe(false); });
  // BRIEF WRONG: false — right is true. An investment account with no holdings yet must take its FIRST buy, or no
  // holding could ever be recorded in it; DEC-2484g widens the rule for accounts WITH holdings, it does not close
  // empty investment accounts. Only cash, property, 529, bond and alternative accounts refuse.
  test.failing('edge · Investment account with missing holdings flag', () => { expect(accountAllowsTicker(A({ kind: 'stocks_etf', tax_bucket: 'TAXABLE' }))).toBe(false); });
});

describe('MK-NW-F-006 isCashKind — five cases', () => {
  test('easy · Checking account cash kind check', () => { expect(isCashKind('checking')).toBe(true); });
  test('easy · Money market fund exclusion check', () => { expect(isCashKind('money_market')).toBe(false); });
  test('complex · Savings account cash kind check', () => { expect(isCashKind('savings')).toBe(true); });
  test('complex · Certificate of Deposit exclusion check', () => { expect(isCashKind('cd')).toBe(false); });
  test('edge · Custom unlisted cash equivalent check', () => { expect(isCashKind('digital_wallet')).toBe(false); });
});

describe('MK-NW-F-007 assetKind — five cases (CARD MISREAD: run on kind ids)', () => {
  test('easy · Checking account catalogue lookup', () => { expect(assetKind('checking')?.id).toBe('checking'); });
  // CARD MISREAD: the list holds what you OWN; a mortgage is a debt and is not in it, so no kind comes back.
  test.failing('easy · Mortgage debt catalogue lookup', () => { expect(assetKind('mortgage')?.id).toBe('mortgage'); });
  test('complex · Institution brokerage catalogue lookup', () => { expect(assetKind('brokerage')?.id).toBe('brokerage'); });
  test('complex · Employer 401k account catalogue lookup', () => { expect(assetKind('401k')?.id).toBe('401k'); });
  test('edge · Unknown account ID lookup', () => { expect(assetKind('unknown_id_99')).toBeUndefined(); });
});

describe('MK-NW-F-008 incomeBearingClassOf — five cases', () => {
  const bearing = (l: string) => incomeBearingClassOf(l) != null;
  test('easy · Treasury bond income bearing check', () => { expect(incomeBearingClassOf('US Treasury Bond 10Y')).toBe('bonds'); });
  test('easy · Common stock non-yielding check', () => { expect(bearing('Common Stock Shares')).toBe(false); });
  test('complex · Brokerage cash settlement fund check', () => { expect(bearing('Brokerage Cash Settlement Fund')).toBe(true); });
  // SETTLED 2026-10-13 by DEC-2747d: a coupon percent right beside a bond word says the word is the instrument, so a
  // company word does not switch it off — 'Apple Corp 4.5% Bond' is Bonds & CDs.
  test('complex · Corporate bond instrument label check', () => { expect(incomeBearingClassOf('Apple Corp 4.5% Bond')).toBe('bonds'); });
  // BRIEF WRONG: false — right is Bonds & CDs. The card files a holding by its class, not by whether it pays: a
  // "note" is a fixed-income instrument whatever it pays, as a zero-coupon bond is.
  test.failing('edge · Explicitly non-yielding note label', () => { expect(bearing('Non-yielding bond derivative note')).toBe(false); });
});

describe('MK-NW-F-009 maturityClass — five cases', () => {
  test('easy · Valid maturity date check', () => { expect(maturityClass('2030-12-31')).toBe('bonds'); });
  test('easy · Null maturity date check', () => { expect(maturityClass(null)).toBe('cash'); });
  test('complex · Picker date maturity classification', () => { expect(maturityClass('2028-06-15')).toBe('bonds'); });
  // is_matured is not this card's answer; a past maturity is still a bond (DEC-2748d stops its interest elsewhere)
  test('complex · Expired maturity date classification', () => { expect(maturityClass('2024-01-01')).toBe('bonds'); });
  test('edge · Malformed maturity date string', () => { expect(maturityClass('maturity in five years')).toBe('cash'); });
});

describe('MK-NW-F-010 wrapperAccount — five cases', () => {
  test('easy · Roth IRA wrapper mapping', () => {
    const w = wrapperAccount('roth');
    expect(RETIRE.includes(w.kind!) && w.tax_bucket === 'ROTH').toBe(true);
  });
  test('easy · Taxable brokerage wrapper mapping', () => { expect(wrapperAccount('taxable')).toEqual({ kind: 'brokerage', tax_bucket: 'TAXABLE' }); });
  test('complex · Roth 401(k) distinct wrapper mapping', () => {
    const w = wrapperAccount('roth_401k');
    expect(RETIRE.includes(w.kind!) && w.tax_bucket === 'ROTH').toBe(true);
  });
  test('complex · Health Savings Account wrapper mapping', () => { expect(wrapperAccount('hsa')).toEqual({ kind: 'hsa', tax_bucket: 'PRE_TAX' }); });
  test('edge · Unstated account wrapper type check', () => { expect(wrapperAccount(null).tax_bucket).toBeUndefined(); });
});
