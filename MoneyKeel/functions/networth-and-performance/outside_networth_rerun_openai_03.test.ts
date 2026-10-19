/* THE OUTSIDE CASES, RUN AGAINST THE APP — Net worth module re-run (brief v02), OpenAI, part 3: cards MK-NW-F-063 to
 * 073, 084, 090 to 092, 094, 103 to 116 (30 cards; the batch has no MK-NW-F-093).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_nw_part3_audit_and_claude_brief.json
 * (150 cases, five per card, nested under "cards") and its run brief moneykeel_nw_part3_claude_code_brief.md. Every
 * expected answer is OpenAI's, as it wrote it; only its input names are mapped onto the app's fields. Where OpenAI wrote
 * its expectation in words ("Non-null sensitivity object", "Row with face 10000 …"), the test asserts exactly what those
 * words state, with the number worked by hand where the case gives enough to work it. A case the app fails is a finding
 * — never fixed by changing the answer here.
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing until fixed) · `// BRIEF WRONG:` OpenAI's
 * own expectation is wrong (test.failing, its answer kept, plus a test pinning the app's hand-checked answer) ·
 * `// CARD MISREAD:` the case tests something the card does not describe (same two tests) · `// BLOCKED:` the case
 * cannot be run as written · `// SPECIFICATION_CONFLICT:` the card and the code (or a later ruling) disagree; both
 * sources are quoted and the one that governs is said.
 *
 * TOLERANCE: money to 1e-6 dollars (toBeCloseTo 6), rates to 1e-9 — floating-point sums only. A rounded figure OpenAI
 * wrote ($952.38) is compared to the cent and the full-precision answer is pinned beside it.
 * FIXED DATES: every date-reading case passes its own `now`, a LOCAL calendar day (2026-10-13 unless the case says).
 *
 * INPUT NAMES MAPPED (OpenAI's names → the app's fields):
 *   Accounts: kind "bond" → asset_class 'bonds', kind 'fixed_income'; kind "cash" → asset_class 'cash', kind 'savings';
 *   "stocks" → asset_class 'stocks_etf'. face_value / coupon_rate / maturity_date / balance as written; a cash account's
 *   "rate" → coupon_rate (the one rate field an account has). A "bond" handed to a BondInfo function → BondInfo
 *   { face, couponRate, maturity, value: market_value, accruedInterest, isCd: kind "cd", cdBought: purchase_channel };
 *   a missing maturity is '' (what bondInfo gives). A "ytm" OpenAI supplies cannot be handed in — the app solves its own
 *   (approxYTM); "estimated_accrued", "days_since_coupon", "is_coupon_day" likewise — the bond that produces them is built.
 *   Classes: "Stocks / Funds" 'stocks_etf' (a holding's tag 'stock_etf'), "Bonds & CDs" 'bonds' (tag 'bond'), "Cash"
 *   'cash', "Alternatives" 'alternatives' (tag 'other'), "Unclassified" 'mixed', "Real estate" → kind 'home', tax bucket
 *   PROPERTY. A class split ("classSplit") → an account whose accountClassBreakdown makes that split (a linked account's
 *   cash and priced holdings, or a hand account's own cash), as the app computes it.
 *   Holdings (holdingClassOf): the person's answer → class_source 'user' + that tag (the app stores the answer in the tag);
 *   "classification_asked" → class_asked; stored_class → the tag; ticker / name as written.
 *   Properties: use "HOME" → re_use 'primary', "SECOND" → 'secondary', "rental" → 'rental'; answers 'home' / 'rental' /
 *   'second' = HOME / RENTAL / SECOND. ORDER: OpenAI lists properties in the order they were ENTERED; the app keeps the
 *   newest first (addAsset prepends, src/store/useStore.ts:760), so the list is handed in reversed — "the first entered"
 *   means the same property on both sides.
 *   Debts: type "mortgage" → debt_type 'MORTGAGE', minimum_payment → minimum_monthly_payment.
 *   Tax words: tax_treatment "tax-deferred"/"tax-free"/"taxable" → 'tax_deferred'/'tax_free'/'taxable'; tax_bucket
 *   "pre-tax" PRE_TAX, "Roth" ROTH, "taxable" TAXABLE. Kinds "529" 'college_529', "HSA" 'hsa', "IRA" 'trad_ira', "401k"
 *   '401k'.
 *   Performance: transaction types → 'DIVIDEND' / 'INTEREST'; "This year" → 'YTD', "Since" → 'SINCE'. A recorded day
 *   { date, values: {a: v} } → { date, holdings: [], accounts: [{ accountId: 'a', typedValue: v }] }. pricedGainOf rows:
 *   boughtWithinPeriod → cappedSince with gain = value − cost; annualRate → couponRate. categoryEarnings: periodTotal is
 *   the window's own total RETURN (a share, src/domain/performance/index.ts windowTotal), not dollars — OpenAI's
 *   "periodTotal: 100" beside a 10% return is a $100 gain, so it is handed in as 0.1 (a one-year window's total).
 *   whyNoReturn reasons → the verdict's `refused`: movement_without_value 'MOVEMENT_DAY_NOT_RECORDED',
 *   movement_without_date 'MOVEMENT_HAS_NO_DATE', beginning_not_covered 'START_NOT_RECORDED'; "measured: true" → a rate.
 *   closedWith, rentAmount, liveRent and rentedIdsOf are not exported: each is read out of its own source file and
 *   compiled as written — the app's own text, nothing re-typed (rentAmount is handed the exported rentFigure it calls).
 *   An expected null where the app's type says undefined is the same answer — "nothing" — and is compared as such.
 *
 * IN FLIGHT ELSEWHERE (another agent, same day): primaryHomeIdOf / propertyUseMap (src/domain/assets/index.ts — the
 * entered-first fallback must not run when any property carries a stated use, DEC-4913) and nameEvidence (Calculation
 * Module code/engines/holding-class.ts). The cases here that touch them (MK-NW-F-107, 109, 110) are judged against the
 * INTENDED rule; none of them has a stated use beside an unstated one, so the in-flight edit does not decide any of them.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  interestIncomeAnnual, bondRateSensitivity, priceAtYield, accruedInterestCaveat, yearlyInterest, type BondInfo,
} from '../../../src/domain/bonds';
import {
  sumWhere, prettyDay, taxWordsOf, holdingClassOf, primaryHomeIdOf, buildAssetsState,
  assetClassOf, ASSET_CLASS_LABEL,
} from '../../../src/domain/assets';
import { plural } from '../../../src/domain/_shared/plural';
import { rentFigure } from '../../../src/domain/_shared/num';
import { buildNetWorth } from '../../../src/domain/networth';
import { altPartsOf } from '../../../src/domain/alternatives';
import { isCertificateOfDeposit, rowOf } from './bonds';
import { itemising } from './account';
import { ledgerGroups, mortgagesByProperty, propertyUses } from './net-worth';
import {
  categoryEarnings, windowStartKey, pricedGainOf, investmentAccountIdsOf, investmentRecordDates, whyNoReturn,
} from './performance';

// ── the functions the app does not export, compiled from their own source text ──────────────────────
const sourceSlice = (file: string, start: string, end: string) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = text.indexOf(start);
  const to = text.indexOf(end, at);
  if (at < 0 || to < 0) throw new Error(`${start} not found in ${file}`);
  return ts.transpileModule(text.slice(at, to), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
};
const closedWith: (days: any[], ids: Set<string>, today: string, ending: number) => any[] = new Function(
  `${sourceSlice('performance.ts', 'function closedWith(', '\n/* ─ MK-NW-O-008')}\nreturn closedWith;`)();
const rent = new Function('rentFigure',
  `${sourceSlice('../../../src/domain/assets/index.ts', 'const rentAmount = ', 'export function propertyUseMap')}\nreturn { rentAmount, liveRent, rentedIdsOf };`)(rentFigure);
const rentAmount: (v: any) => number = rent.rentAmount;
const liveRent: (r: any) => any[] = rent.liveRent;
const rentedIdsOf: (r: any) => Set<string> = rent.rentedIdsOf;

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const D = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const NOW = D('2026-10-13');
const nothing = (v: unknown) => v ?? null;
const acct = (o: Record<string, any> = {}) => ({ asset_id: 'a', label: 'Account', tax_bucket: 'TAXABLE', target_return: 0.06, ...o }) as any;
const bondAcct = (o: Record<string, any>) => acct({ asset_class: 'bonds', kind: 'fixed_income', ...o });
const cashAcct = (o: Record<string, any>) => acct({ asset_class: 'cash', kind: 'savings', ...o });
const bond = (o: Partial<BondInfo>): BondInfo => ({ face: null, couponRate: null, maturity: '', value: 0, accruedInterest: null, isCd: false, cdBought: 'bank', ...o });
const home = (id: string, use: string | null, label = id) =>
  acct({ asset_id: id, label, kind: 'home', tax_bucket: 'PROPERTY', balance: 300000, ...(use ? { re_use: use } : {}) });
const entered = <T,>(list: T[]) => [...list].reverse();   // OpenAI's entry order → the app's newest-first list
const pos = (ticker: string | null, name: string, shares: number, price: number | null, tag: string) =>
  ({ ticker, name, asset_class: tag, last_price: price, lots: [{ shares, cost_per_share: 0, purchase_date: '' }] });
const linked = (o: Record<string, any>, cash: number, positions: any[], options: any[] = []) =>
  acct({ kind: 'brokerage', source: 'connected', cash_balance: cash, positions, option_holdings: options, ...o });
const groups = (accounts: any[], by: 'class' | 'institution') =>
  ledgerGroups(accounts, by, (a: any) => (ASSET_CLASS_LABEL as any)[assetClassOf(a)], assetClassOf);
const day = (date: string, values: Record<string, number>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
const plain = (days: any[]) => days.map((d) => ({ date: d.date, values: Object.fromEntries((d.accounts ?? []).map((a: any) => [a.accountId, a.typedValue])) }));
const USES: Record<string, string> = { home: 'HOME', rental: 'RENTAL', second: 'SECOND' };
const usesOf = (m: Map<string, string>) => Object.fromEntries([...m].map(([k, v]) => [k, USES[v]]));

describe('MK-NW-F-063 interestIncomeAnnual — five cases', () => {
  test('easy · Bond face × coupon rate', () => {
    expect(interestIncomeAnnual([bondAcct({ face_value: 10000, coupon_rate: 0.04, maturity_date: '2030-01-01' })], NOW)).toBeCloseTo(400, 6);
  });
  test('easy · Rate-paying cash account plus bond', () => {
    expect(interestIncomeAnnual([bondAcct({ asset_id: 'b', face_value: 20000, coupon_rate: 0.05, maturity_date: '2030-01-01' }),
      cashAcct({ asset_id: 'c', balance: 5000, coupon_rate: 0.02 })], NOW)).toBeCloseTo(1100, 6);
  });
  test('complex · Missing face falls back to balance', () => {
    expect(interestIncomeAnnual([bondAcct({ face_value: null, balance: 8000, coupon_rate: 0.03, maturity_date: '2030-01-01' })], NOW)).toBeCloseTo(240, 6);
  });
  test('complex · Matured bond excluded; no date is not matured', () => {
    expect(interestIncomeAnnual([bondAcct({ asset_id: 'x', face_value: 10000, coupon_rate: 0.05, maturity_date: '2026-01-01' }),
      bondAcct({ asset_id: 'y', face_value: 5000, coupon_rate: 0.04, maturity_date: null })], NOW)).toBeCloseTo(200, 6);
  });
  test('edge · Unknown rates and non-bond non-cash assets add nothing', () => {
    expect(interestIncomeAnnual([bondAcct({ asset_id: 'b', face_value: 10000, coupon_rate: null, maturity_date: '2030-01-01' }),
      acct({ asset_id: 's', asset_class: 'stocks_etf', kind: 'brokerage', balance: 90000 }), cashAcct({ asset_id: 'c', balance: 2000, coupon_rate: null })], NOW)).toBe(0);
  });
});

describe('MK-NW-F-064 bondRateSensitivity — five cases', () => {
  // By hand, a $10,000 4% bond with exactly 4 years left, worth $10,000, on its coupon day (no accrued interest): the
  // yield to maturity is 4.00%. Price at 5% = 400/1.05 + 400/1.05² + 400/1.05³ + 10,400/1.05⁴ = $9,645.40 → change
  // −$354.60; at 3% = $10,371.71 → change +$371.71. Rounded to $100 (a $10,000 bond): rates up $9,500 to $9,700, change
  // −$400; rates down $10,300 to $10,500, change +$400.
  // OpenAI's "3.01%" is not the down move — that is 4% − 1 point = 3.00%; the 0.01% is the FLOOR the move never goes
  // below (bonds/index.ts:928). Its assertion — a non-null result priced from priceAtYield one point either side — holds.
  test('easy · Ordinary bond has a sensitivity estimate', () => {
    const b = bond({ face: 10000, couponRate: 0.04, maturity: '2030-10-13', value: 10000 });
    const s = bondRateSensitivity(b, NOW)!;
    expect(s).not.toBeNull();
    expect(s).toEqual({ ratesUp: { low: 9500, high: 9700, delta: -400 }, ratesDown: { low: 10300, high: 10500, delta: 400 } });
    expect(priceAtYield(b, 0.05, NOW)! - priceAtYield(b, 0.04, NOW)!).toBeCloseTo(-354.5950504162356, 6);
    expect(priceAtYield(b, 0.03, NOW)! - priceAtYield(b, 0.04, NOW)!).toBeCloseTo(371.70984028103703, 6);
  });
  test('easy · Bank CD refused with explicit reason', () => {
    expect(bondRateSensitivity(bond({ isCd: true, cdBought: 'bank', face: 10000, couponRate: 0.04, maturity: '2028-10-13', value: 10000 }), NOW)).toBeNull();
  });
  test('complex · Broker CD eligible like bond', () => {
    expect(bondRateSensitivity(bond({ isCd: true, cdBought: 'broker', face: 10000, couponRate: 0.04, maturity: '2028-10-13', value: 9850 }), NOW)).not.toBeNull();
  });
  test('complex · Missing or nonpositive face/rate refuses', () => {
    expect(bondRateSensitivity(bond({ face: null, couponRate: 0, maturity: '2030-01-01', value: 10000 }), NOW)).toBeNull();
  });
  test('edge · Matured or undated bond refuses', () => {
    expect(bondRateSensitivity(bond({ face: 10000, couponRate: 0.04, maturity: '', value: 10000 }), NOW)).toBeNull();
  });
});

describe('MK-NW-F-065 buildNetWorth — five cases', () => {
  const nw = (a: number, d: number) => { const s = buildNetWorth('u1' as any, a, d); return { totalAssets: s.gross_assets, totalDebt: s.gross_debt, netWorth: s.net_worth }; };
  test('easy · Assets exceed debt', () => { expect(nw(125000, 25000)).toEqual({ totalAssets: 125000, totalDebt: 25000, netWorth: 100000 }); });
  test('easy · Debt exceeds assets', () => { expect(nw(20000, 45000)).toEqual({ totalAssets: 20000, totalDebt: 45000, netWorth: -25000 }); });
  test('complex · Zero totals', () => { expect(nw(0, 0)).toEqual({ totalAssets: 0, totalDebt: 0, netWorth: 0 }); });
  test('complex · Fractional cents preserve arithmetic per implementation precision', () => {
    const s = nw(100.25, 30.1);   // full precision, rounded only on screen: 70.15 to well under a cent
    expect({ ...s, netWorth: 0 }).toEqual({ totalAssets: 100.25, totalDebt: 30.1, netWorth: 0 });
    expect(s.netWorth).toBeCloseTo(70.15, 9);
  });
  test('edge · Negative debt input is not silently normalized', () => { expect(nw(1000, -50)).toEqual({ totalAssets: 1000, totalDebt: -50, netWorth: 1050 }); });
});

describe('MK-NW-F-066 sumWhere — five cases', () => {
  const run = (bals: (number | null)[], pred: 'all' | 'none') =>
    sumWhere(bals.map((b, i) => acct({ asset_id: String(i), balance: b ?? undefined })), () => pred === 'all');
  test('easy · Sum matching positive balances', () => { expect(run([100, 200, 50], 'all')).toEqual({ total: 350, missingCount: 0 }); });
  test('easy · No matching accounts', () => { expect(run([100], 'none')).toEqual({ total: 0, missingCount: 0 }); });
  test('complex · Missing balance counted separately, not as zero', () => { expect(run([100, null, 50], 'all')).toEqual({ total: 150, missingCount: 1 }); });
  test('complex · Negative balance is included', () => { expect(run([500, -100], 'all')).toEqual({ total: 400, missingCount: 0 }); });
  test('edge · Missing and negative balances together', () => { expect(run([-25, null, 0], 'all')).toEqual({ total: -25, missingCount: 1 }); });
});

describe('MK-NW-F-067 plural — five cases', () => {
  test('easy · Singular one', () => { expect(plural(1, 'CD', 1)).toBe('1 CD'); });
  test('easy · Plural count', () => { expect(plural(3, 'CD', 3)).toBe('3 CDs'); });
  test('complex · Special plural Treasury', () => { expect(plural(2, 'Treasury', '2')).toBe('2 Treasuries'); });
  test('complex · Zero plural and formatted shown value', () => { expect(plural(0, 'property', '0')).toBe('0 properties'); });
  test('edge · Unknown word is refused in test/development', () => {
    expect(() => plural(2, 'widget' as any, 2)).toThrow(/not on PLURAL_WORDS/);
    const was = process.env.NODE_ENV;
    try { (process.env as any).NODE_ENV = 'production'; expect(plural(2, 'widget' as any, 2)).toBe('2 widget'); }
    finally { (process.env as any).NODE_ENV = was; }
  });
});

describe('MK-NW-F-068 prettyDay — five cases', () => {
  test('easy · ISO date formats short month', () => { expect(prettyDay('2026-08-04')).toBe('Aug 4, 2026'); });
  test('easy · September is Sep, not Sept', () => { expect(prettyDay('2026-09-09')).toBe('Sep 9, 2026'); });
  test('complex · Leap day', () => { expect(prettyDay('2024-02-29')).toBe('Feb 29, 2024'); });
  test('complex · Impossible date gives empty string', () => { expect(prettyDay('2026-02-30')).toBe(''); });
  test('edge · Empty date gives empty string', () => { expect(prettyDay('')).toBe(''); });
});

describe('MK-NW-F-069 priceAtYield — five cases', () => {
  test('easy · Zero-coupon bond price', () => {
    const p = priceAtYield(bond({ face: 1000, couponRate: 0, maturity: '2027-10-13' }), 0.05, NOW)!;
    expect(p).toBeCloseTo(952.38, 2); expect(p).toBeCloseTo(1000 / 1.05, 9);
  });
  test('easy · Annual coupon plus principal', () => {
    expect(priceAtYield(bond({ face: 1000, couponRate: 0.05, maturity: '2027-10-13' }), 0.05, NOW)!).toBeCloseTo(1000, 9);
  });
  test('complex · Two years with coupon payments at anniversaries', () => {
    const p = priceAtYield(bond({ face: 1000, couponRate: 0.04, maturity: '2028-10-13' }), 0.05, NOW)!;
    expect(p).toBeCloseTo(981.41, 2); expect(p).toBeCloseTo(40 / 1.05 + 1040 / 1.05 ** 2, 9);
  });
  test('complex · Matured or undated returns null', () => {
    expect(priceAtYield(bond({ face: 1000, couponRate: 0.05, maturity: '2026-10-12' }), 0.05, NOW)).toBeNull();
    expect(priceAtYield(bond({ face: 1000, couponRate: 0.05, maturity: '' }), 0.05, NOW)).toBeNull();
  });
  test('edge · Invalid discount base returns null', () => {
    expect(priceAtYield(bond({ face: 1000, couponRate: 0.05, maturity: '2027-10-13' }), -1, NOW)).toBeNull();
  });
});

describe('MK-NW-F-070 accruedInterestCaveat — five cases', () => {
  test('easy · No caveat when actual accrued interest entered', () => {
    expect(accruedInterestCaveat(bond({ face: 10000, couponRate: 0.04, value: 9900, accruedInterest: 120, maturity: '2028-10-13' }), NOW)).toBeNull();
  });
  // The estimate ($40, 90 days) cannot be handed in, and the case's own bond could not make it: no face value (no
  // estimate is possible) and a maturity of 2028-10-13 makes 2026-10-13 a coupon day (0 days, no estimate). The bond that
  // makes exactly the case's figures is built: face $4,056 at 4%, last coupon 2026-07-15 (maturity 2028-07-15), so
  // 90 days of a 365-day coupon year: 4,056 × 4% × 90/365 = $40.0044 → "$40".
  const estBond = bond({ face: 4056, couponRate: 0.04, value: 9900, accruedInterest: null, maturity: '2028-07-15' });
  // BRIEF WRONG: a full stop after "enter actual accrued interest" — his words (DEC-3390, 2026-10-09) end without one:
  // Say "Added estimated $1,119 … If this is not accurate, enter actual accrued interest". The card's full stop ends the
  // card's own sentence, before "Otherwise nothing." Every other word, figure and the day count agree.
  test.failing('easy · Estimated accrued interest yields explanatory caveat', () => {
    expect(accruedInterestCaveat(estBond, NOW)).toBe('Added estimated $40 in accrued interest to bond value at 4% coupon for 90 days to calculate YTM. If this is not accurate, enter actual accrued interest.');
  });
  test('easy · Estimated accrued interest yields explanatory caveat — the app\'s answer, hand-checked', () => {
    expect(accruedInterestCaveat(estBond, NOW)).toBe('Added estimated $40 in accrued interest to bond value at 4% coupon for 90 days to calculate YTM. If this is not accurate, enter actual accrued interest');
  });
  test('complex · Bank CD excluded from estimate caveat', () => {
    expect(accruedInterestCaveat(bond({ isCd: true, cdBought: 'bank', face: 10000, couponRate: 0.04, value: 10000, maturity: '2028-10-13' }), NOW)).toBeNull();
  });
  test('complex · Coupon day excluded', () => {
    expect(accruedInterestCaveat(bond({ face: 10000, couponRate: 0.04, value: 9900, maturity: '2028-10-13' }), NOW)).toBeNull();
  });
  test('edge · Matured or no rate yields no estimate caveat', () => {
    expect(accruedInterestCaveat(bond({ face: 10000, couponRate: null, value: 9900, maturity: '2026-01-01' }), NOW)).toBeNull();
  });
});

describe('MK-NW-F-071 isCertificateOfDeposit — five cases', () => {
  test('easy · Kind explicitly CD', () => { expect(isCertificateOfDeposit({ label: 'Brokered deposit', kind: 'cd', institution: 'Example Bank' })).toBe(true); });
  test('easy · Whole word CD in own label, case-insensitive', () => { expect(isCertificateOfDeposit({ label: 'My cd ladder', kind: 'other', institution: 'Bank' })).toBe(true); });
  test('complex · Certificate of deposit phrase in own label', () => { expect(isCertificateOfDeposit({ label: 'Certificate of Deposit 2028', kind: 'other' })).toBe(true); });
  test('complex · Institution name alone must not trigger CD', () => { expect(isCertificateOfDeposit({ label: 'Taxable brokerage', kind: 'investment', institution: 'CD Capital' })).toBe(false); });
  test('edge · Substring inside a larger word is not whole word', () => { expect(isCertificateOfDeposit({ label: 'CDsavings?', kind: 'investment', institution: 'Bank' })).toBe(false); });
});

describe('MK-NW-F-072 rowOf — five cases', () => {
  test('easy · Bond row exposes face, rate, interest, maturity and value', () => {
    const r = rowOf(bondAcct({ label: 'Treasury note', institution: 'Treasury Direct', face_value: 10000, coupon_rate: 0.04, maturity_date: '2028-10-13', balance: 9800 }), NOW);
    expect({ face: r.face, rate: r.couponRate, maturity: r.maturity, yearsLeft: r.yearsLeft, value: r.value, heading: r.institution })
      .toEqual({ face: 10000, rate: 0.04, maturity: '2028-10-13', yearsLeft: 2, value: 9800, heading: 'Treasury Direct' });
    expect(r.couponPerYear!).toBeCloseTo(400, 6);
  });
  test('easy · Missing face/rate remain not entered', () => {
    const r = rowOf(bondAcct({ label: 'Bond X', face_value: null, coupon_rate: null, maturity_date: '2030-01-01', balance: 5000 }), NOW);
    expect([r.face, r.couponRate, r.couponPerYear, r.currentYield]).toEqual([null, null, null, null]);
  });
  test('complex · Past maturity row interest is zero and YTM absent', () => {
    const r = rowOf(bondAcct({ label: 'Old bond', face_value: 10000, coupon_rate: 0.04, maturity_date: '2026-01-01', balance: 10000 }), NOW);
    expect({ interest: r.couponPerYear, yearsLeft: r.yearsLeft, ytm: r.yieldToMaturity }).toEqual({ interest: 0, yearsLeft: 0, ytm: null });
  });
  // CARD MISREAD: the card says "the heading is the institution when it is not blank after trimming, otherwise the
  // account's name" — the institution is trimmed, the name is used as stored. Names are trimmed when they are saved
  // (AddAccountScreen.tsx:117 `label: name.trim()`), so "  My Bond  " is not a name the app stores; handed one, the
  // heading is that name as given. The fallback itself (blank institution → the name) agrees.
  test.failing('complex · Blank institution falls back to account name', () => {
    expect(rowOf(bondAcct({ label: '  My Bond  ', institution: '  ', face_value: 1000, coupon_rate: 0.03, maturity_date: '2028-01-01', balance: 1000 }), NOW).institution).toBe('My Bond');
  });
  test('complex · Blank institution falls back to account name — the app\'s answer', () => {
    expect(rowOf(bondAcct({ label: '  My Bond  ', institution: '  ', face_value: 1000, coupon_rate: 0.03, maturity_date: '2028-01-01', balance: 1000 }), NOW).institution).toBe('  My Bond  ');
    expect(rowOf(bondAcct({ label: 'My Bond', institution: '  ', face_value: 1000, coupon_rate: 0.03, maturity_date: '2028-01-01', balance: 1000 }), NOW).institution).toBe('My Bond');
  });
  // By hand: a broker CD, $10,000 face at 4%, worth $9,850, exactly 2 years left, on its coupon day (nothing accrued).
  // 400/x + 10,400/x² = 9,850 → x = (400 + √(400² + 4 × 9,850 × 10,400)) ÷ (2 × 9,850) = 1.0480447 → YTM 4.80447%.
  test('edge · Broker CD gets bond pricing and caveat only when applicable', () => {
    const r = rowOf(bondAcct({ label: 'Broker CD', institution: 'Broker', kind: 'cd', cd_bought: 'broker', face_value: 10000, coupon_rate: 0.04,
      maturity_date: '2028-10-13', balance: 9850, accrued_interest: null }), NOW);
    expect({ isCD: r.isCD, pricedLikeBond: r.pricedLikeBond, caveat: r.accruedCaveat }).toEqual({ isCD: true, pricedLikeBond: true, caveat: null });
    expect(r.yieldToMaturity!).toBeCloseTo(0.0480447297335036, 9);
  });
});

describe('MK-NW-F-073 itemising — five cases', () => {
  const items = (vals: (number | null)[]) => vals.map((v, i) => ({ label: `h${i}`, cls: 'stocks_etf' as const, value: v as any }));
  test('easy · All holdings priced; remainder final', () => {
    expect(itemising(10000, items([4000, 2500]))).toEqual({ keepTotalAt: 10000, itemised: 6500, remainder: 3500, remainderFinal: true });
  });
  test('easy · One unpriced holding makes remainder non-final', () => {
    expect(itemising(10000, items([4000, null]))).toEqual({ keepTotalAt: 10000, itemised: 4000, remainder: 6000, remainderFinal: false });
  });
  test('complex · Items exceed lump total creates negative remainder', () => {
    expect(itemising(10000, items([7000, 4000]))).toEqual({ keepTotalAt: 10000, itemised: 11000, remainder: -1000, remainderFinal: true });
  });
  test('complex · Empty items leaves full balance remainder', () => {
    expect(itemising(7500, [])).toEqual({ keepTotalAt: 7500, itemised: 0, remainder: 7500, remainderFinal: true });
  });
  test('edge · Explicit zero item is valued, missing item is not', () => {
    expect(itemising(5000, items([0, null]))).toEqual({ keepTotalAt: 5000, itemised: 0, remainder: 5000, remainderFinal: false });
  });
});

describe('MK-NW-F-084 categoryEarnings — five cases', () => {
  const by = (c: any[]) => Object.fromEntries(c.map((x) => [x.label, { earned: x.earned, ret: x.ret, yearly: x.yearly }]));
  test('easy · Ticker dividend maps to holding class and positive income', () => {
    const c = categoryEarnings({ transactions: [{ type: 'DIVIDEND', ticker: 'ABC', amount: 25, date: '2026-01-15' }], windowStart: '2026-01-01',
      rows: [{ position: { ticker: 'ABC', asset_class: 'stock_etf' }, marketValue: 1000, periodReturn: 0.1, periodTotal: 0.1 }], dayOne: false });
    expect(c.map((x) => [x.label, x.earned])).toEqual([['Stocks / Funds', 25]]);
    expect(c[0].ret!).toBeCloseTo(0.1, 12);   // 1,000 ÷ (1,000 ÷ 1.1) − 1
  });
  test('easy · Ticker with no holding: dividend stocks, interest bonds', () => {
    const c = categoryEarnings({ transactions: [{ type: 'DIVIDEND', ticker: 'MISS', amount: 10, date: '2026-01-15' }, { type: 'INTEREST', ticker: 'MISS', amount: 20, date: '2026-01-16' }],
      windowStart: '2026-01-01', rows: [], dayOne: false });
    expect(c.map((x) => [x.label, x.earned])).toEqual([['Stocks / Funds', 10], ['Bonds & CDs', 20]]);
  });
  test('complex · Undated/out-of-window records excluded; amounts taken positive', () => {
    const c = categoryEarnings({ transactions: [{ type: 'DIVIDEND', ticker: 'ABC', amount: -10, date: '2025-12-31' }, { type: 'DIVIDEND', ticker: 'ABC', amount: 5, date: '2026-01-01' }],
      windowStart: '2026-01-01', rows: [], dayOne: false });
    expect(c.map((x) => [x.label, x.earned])).toEqual([['Stocks / Funds', 5]]);
  });
  test('complex · Day one returns all three categories with zero', () => {
    const c = categoryEarnings({ transactions: [], windowStart: '2026-01-01', rows: [], dayOne: true });
    expect(by(c)).toEqual({ 'Stocks / Funds': { earned: 0, ret: null, yearly: false }, 'Bonds & CDs': { earned: 0, ret: null, yearly: false },
      'Cash in this account': { earned: 0, ret: null, yearly: false } });
  });
  // SETTLED 2026-10-13: a bond row worth exactly $0 holds no shares (buildPerformance writes marketValue 0 only when none
  // are held, src/domain/performance/index.ts marketValue), so it holds nothing and no longer hides the rate the bond
  // account states. categoryEarnings counts a Bonds row as a holding only when its worth is not $0 (performance.ts
  // `bondHoldings`); a row whose worth is not known (null) may still hold shares and still counts. $10,000 at 4%, a
  // sold-out bond row, $100 of interest → Bonds & CDs $100 at 4.00%/year.
  test('edge · No eligible positive return rows yields no category return; yearly bond rate fallback', () => {
    const c = categoryEarnings({ transactions: [{ type: 'INTEREST', amount: 100, date: '2026-02-01', account_id: 'b1' }], windowStart: '2026-01-01',
      rows: [{ position: { kind: 'fixed_income', asset_class: 'bond' }, marketValue: 0, periodReturn: null }],
      bonds: [{ asset_id: 'b1', balance: 10000, coupon_rate: 0.04 }], dayOne: false });
    expect(by(c)).toEqual({ 'Bonds & CDs': { earned: 100, ret: 0.04, yearly: true } });
  });
  test('edge · a bond row whose worth is NOT known still hides the stated rate — it may hold shares', () => {
    const c = categoryEarnings({ transactions: [{ type: 'INTEREST', amount: 100, date: '2026-02-01', account_id: 'b1' }], windowStart: '2026-01-01',
      rows: [{ position: { kind: 'fixed_income', asset_class: 'bond' }, marketValue: null as any, periodReturn: null }],
      bonds: [{ asset_id: 'b1', balance: 10000, coupon_rate: 0.04 }], dayOne: false });
    expect(by(c)).toEqual({ 'Bonds & CDs': { earned: 100, ret: null, yearly: false } });
  });
});

describe('MK-NW-F-090 windowStartKey — five cases', () => {
  test('easy · This year starts January 1', () => { expect(windowStartKey('YTD', ['2026-01-03'], '2026-10-13')).toBe('2026-01-01'); });
  test('easy · One month back from month end clamps to prior month end', () => { expect(windowStartKey('1M', [], '2026-03-31')).toBe('2026-02-28'); });
  test('complex · Since starts after earliest record but not after today', () => {
    expect(windowStartKey('SINCE', ['2025-04-02', '2025-06-15'], '2026-10-13')).toBe('2025-04-03');
  });
  test('complex · Since with future earliest date caps at today', () => { expect(windowStartKey('SINCE', ['2027-01-01'], '2026-10-13')).toBe('2026-10-13'); });
  // SPECIFICATION_CONFLICT → BRIEF WRONG: OpenAI follows the card, which says "Any other label: 12 months back, the same
  // way" (v02 cards part 3, MK-NW-F-090). His later ruling DEC-4640 (2026-10-12, "1, 2 - approved") says a window name
  // the app does not have gives NO figure — never a guessed one — and the code follows it (performance.ts: startDateFor
  // refuses an unknown name, windowStartKey returns null). The newer ruling governs; the card text was stale and is corrected 2026-10-13 (function rules + the code's own description now say: nothing). (Its own
  // month-end clamp is right: 12 months before 2024-02-29 IS 2023-02-28, as '1Y' gives.)
  test.failing('edge · Unknown label defaults to 12 months back', () => { expect(windowStartKey('weird', [], '2024-02-29')).toBe('2023-02-28'); });
  test('edge · Unknown label — the app\'s answer, by DEC-4640', () => {
    expect(windowStartKey('weird', [], '2024-02-29')).toBeNull();
    expect(windowStartKey('1Y', [], '2024-02-29')).toBe('2023-02-28');
  });
});

describe('MK-NW-F-091 pricedGainOf — five cases', () => {
  test('easy · Bought within period uses whole gain', () => {
    expect(pricedGainOf([{ cappedSince: '2026-01-01', gain: 1200 - 1000, marketValue: 1200, periodReturn: null }], 1)).toBe(200);
  });
  test('easy · Known period return uses today value less reconstructed start value', () => {
    expect(pricedGainOf([{ marketValue: 1100, periodReturn: 0.1 }], 1)!).toBeCloseTo(100, 9);
  });
  test('complex · Rate-only CD uses compound annual rate over years', () => {
    expect(pricedGainOf([{ marketValue: 1040, periodReturn: null, couponRate: 0.04 }], 1)!).toBeCloseTo(40, 9);
  });
  test('complex · Unknown gain on any positive holding makes whole total unknown', () => {
    expect(pricedGainOf([{ marketValue: 1100, periodReturn: 0.1 }, { marketValue: 500, periodReturn: null, couponRate: null }], 1)).toBeNull();
  });
  test('edge · Empty holdings gain nothing', () => { expect(pricedGainOf([], 1)).toBe(0); });
});

describe('MK-NW-F-092 investmentAccountIdsOf — five cases', () => {
  const KEY: Record<string, string> = { 'Stocks / Funds': 'stocks_etf', 'Bonds & CDs': 'bonds', Alternatives: 'alternatives', Unclassified: 'mixed', Cash: 'cash', 'Real estate': 'real_estate' };
  const ids = (accounts: any[], classes: Record<string, string>) =>
    [...investmentAccountIdsOf(accounts, (a: any) => { const c = classes[String(a.asset_id)]; return c == null ? (undefined as any) : KEY[c] ?? c; })].sort();
  test('easy · Investment classes included', () => {
    expect(ids([{ asset_id: 'a' }, { asset_id: 'b' }, { asset_id: 'c' }, { asset_id: 'd' }], { a: 'Stocks / Funds', b: 'Bonds & CDs', c: 'Alternatives', d: 'Unclassified' })).toEqual(['a', 'b', 'c', 'd']);
  });
  test('easy · Cash and real estate excluded', () => {
    expect(ids([{ asset_id: 'cash' }, { asset_id: 'home' }, { asset_id: 'fund' }], { cash: 'Cash', home: 'Real estate', fund: 'Stocks / Funds' })).toEqual(['fund']);
  });
  test('complex · Mixed ids are string-normalized', () => { expect(ids([{ asset_id: 123 }, { asset_id: 'x' }], { 123: 'Unclassified', x: 'Cash' })).toEqual(['123']); });
  test('complex · Missing id does not create accidental undefined entry', () => {
    expect(ids([{ asset_id: null }, { asset_id: 'ok' }], { ok: 'Alternatives' })).toEqual(['ok']);
  });
  test('edge · Unknown class is not implicitly investment class', () => { expect(ids([{ asset_id: 'x' }], { x: 'Other unknown' })).toEqual([]); });
});

describe('MK-NW-F-094 ledgerGroups — five cases', () => {
  test('easy · Class grouping totals rows', () => {
    const g = groups([acct({ asset_id: 'a', label: 'A', kind: 'checking', asset_class: 'cash', balance: 100 }), acct({ asset_id: 'b', label: 'B', kind: 'brokerage', asset_class: 'stocks_etf', balance: 200 })], 'class');
    expect(g.map((x) => ({ group: x.label, total: x.total }))).toEqual([{ group: 'Cash', total: 100 }, { group: 'Stocks / Funds', total: 200 }]);
  });
  test('easy · Class split appears in each class at split amount', () => {
    const g = groups([linked({ asset_id: 'a', label: 'A', balance: 1000 }, 0, [pos('VTI', 'VTI', 6, 100, 'stock_etf'), pos('BND', 'BND', 4, 100, 'bond')])], 'class');
    // the card gives no heading order (the screen sorts the headings) — compared by heading
    expect(Object.fromEntries(g.map((x) => [x.label, { total: x.total, rows: x.rows }]))).toEqual({
      'Stocks / Funds': { total: 600, rows: [{ accountId: 'a', amount: 600 }] }, 'Bonds & CDs': { total: 400, rows: [{ accountId: 'a', amount: 400 }] } });
  });
  test('complex · Institution grouping trims and ignores case', () => {
    const g = groups([acct({ asset_id: 'a', institution: ' Vanguard ', kind: 'checking', asset_class: 'cash', balance: 100 }),
      acct({ asset_id: 'b', institution: 'vanguard', kind: 'brokerage', asset_class: 'stocks_etf', balance: 200 })], 'institution');
    expect(g.map((x) => ({ group: x.label, total: x.total, classes: Object.fromEntries(x.mix.map((m) => [(ASSET_CLASS_LABEL as any)[m.key], m.total])) })))
      .toEqual([{ group: 'Vanguard', total: 300, classes: { Cash: 100, 'Stocks / Funds': 200 } }]);
  });
  test('complex · Missing institution gets No institution set', () => {
    const g = groups([acct({ asset_id: 'a', institution: ' ', asset_class: 'mixed', balance: 50 })], 'institution');
    expect(g.map((x) => ({ group: x.label, total: x.total, classes: Object.fromEntries(x.mix.map((m) => [(ASSET_CLASS_LABEL as any)[m.key], m.total])) })))
      .toEqual([{ group: 'No institution set', total: 50, classes: { Unclassified: 50 } }]);
  });
  // SETTLED 2026-10-13: the account with no balance is no longer written as a row of $0 (DEC-3279e, tenet 3). Its row
  // carries null — not known — and the Bank group total stays the known sum, $100 (net-worth.ts ledgerGroups). The
  // screen still reads "Value not entered" off the account itself (NetWorthScreen.tsx assetRow), and its totals are
  // unchanged; the screen check is in src/screens/__tests__/nw_ledger_no_balance.test.tsx.
  const missing = () => groups([acct({ asset_id: 'a', institution: 'Bank', kind: 'checking', asset_class: 'cash', balance: null }),
    acct({ asset_id: 'b', institution: 'Bank', kind: 'checking', asset_class: 'cash', balance: 100 })], 'institution');
  test('edge · Unknown balance cannot be fabricated into row or total', () => {
    const g = missing();
    expect(g.map((x) => x.total)).toEqual([100]);
    expect(g[0].rows.find((r) => r.accountId === 'a')!.amount).toBeNull();
  });
  test('edge · by class too: the row is null, the Cash total the known $100', () => {
    const g = groups([acct({ asset_id: 'a', kind: 'checking', asset_class: 'cash', balance: null }),
      acct({ asset_id: 'b', kind: 'checking', asset_class: 'cash', balance: 100 })], 'class');
    expect(g.map((x) => ({ label: x.label, total: x.total, rows: x.rows }))).toEqual([{ label: 'Cash', total: 100, rows: [{ accountId: 'a', amount: null }, { accountId: 'b', amount: 100 }] }]);
  });
});

describe('MK-NW-F-103 investmentRecordDates — five cases', () => {
  test('easy · Returns unique dates with values for named accounts', () => {
    expect(investmentRecordDates([day('2026-01-01', { a: 100 }), day('2026-01-02', { a: 110 }), day('2026-01-02', { b: 50 })], new Set(['a']))).toEqual(['2026-01-01', '2026-01-02']);
  });
  test('easy · Exclude days only for unrelated accounts', () => {
    expect(investmentRecordDates([day('2026-01-01', { x: 100 }), day('2026-01-02', { a: 50 })], new Set(['a']))).toEqual(['2026-01-02']);
  });
  test('complex · Sort chronological not input order', () => {
    expect(investmentRecordDates([day('2026-03-01', { a: 3 }), day('2026-01-01', { a: 1 }), day('2026-02-01', { a: 2 })], new Set(['a']))).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });
  test('complex · No named accounts returns empty', () => { expect(investmentRecordDates([day('2026-01-01', { a: 1 })], new Set())).toEqual([]); });
  test('edge · Named account but no snapshot value returns empty', () => { expect(investmentRecordDates([day('2026-01-01', { x: 1 })], new Set(['a']))).toEqual([]); });
});

describe('MK-NW-F-104 closedWith — five cases', () => {
  test('easy · Adds today row from latest earlier day', () => {
    const out = plain(closedWith([day('2026-10-10', { a: 100, b: 50 })], new Set(['a', 'b']), '2026-10-13', 180));
    expect(out.length).toBe(2);
    expect(out[0]).toEqual({ date: '2026-10-10', values: { a: 100, b: 50 } });
    expect(out[1].date).toBe('2026-10-13');
    expect(Object.keys(out[1].values).sort()).toEqual(['a', 'b']);
    expect(Object.values(out[1].values).reduce((t: number, v: any) => t + v, 0)).toBe(180);
  });
  test('easy · No earlier day returns unchanged', () => { expect(closedWith([], new Set(['a']), '2026-10-13', 100)).toEqual([]); });
  test('complex · Earlier day contains none of named accounts returns unchanged', () => {
    const rec = [day('2026-10-10', { x: 100 })];
    expect(closedWith(rec, new Set(['a']), '2026-10-13', 100)).toBe(rec);
  });
  test('complex · Only latest earlier accounts carried forward', () => {
    const out = plain(closedWith([day('2026-10-09', { a: 80 }), day('2026-10-12', { b: 90 })], new Set(['a', 'b']), '2026-10-13', 110));
    expect(out[out.length - 1]).toEqual({ date: '2026-10-13', values: { b: 110 } });
  });
  test('edge · No arithmetic applied to ending value', () => {
    const out = plain(closedWith([day('2026-10-12', { a: 100 })], new Set(['a']), '2026-10-13', 75));
    expect(out[1]).toEqual({ date: '2026-10-13', values: { a: 75 } });
  });
});

describe('MK-NW-F-105 whyNoReturn — five cases', () => {
  test('easy · No verdict gives empty explanation', () => { expect(whyNoReturn(null)).toBe(''); });
  test('easy · Movement on day without value identifies day', () => {
    const s = whyNoReturn({ rate: null, refused: 'MOVEMENT_DAY_NOT_RECORDED', day: '2026-05-04', measuredFrom: null });
    expect(s).toContain('May 4, 2026'); expect(s).toContain('a return cannot be measured across it');
  });
  test('complex · Undated movement names missing date', () => {
    const s = whyNoReturn({ rate: null, refused: 'MOVEMENT_HAS_NO_DATE', measuredFrom: null });
    expect(s).toContain('has no date'); expect(s).toContain('a return cannot be measured');
  });
  test('complex · Value below deposit is measured loss, no sentence', () => {
    expect(whyNoReturn({ rate: -0.05, measuredFrom: '2026-05-04' })).toBe('');
  });
  test('edge · Uncovered beginning is not handled here', () => {
    expect(whyNoReturn({ rate: null, refused: 'START_NOT_RECORDED', measuredFrom: null })).toBe('');
  });
});

describe('MK-NW-F-106 mortgagesByProperty — five cases', () => {
  const mort = (id: string, property: string | null, label?: string, pay?: number) =>
    ({ debt_id: id, debt_type: 'MORTGAGE', property_id: property, label, remaining_balance: 100000, minimum_monthly_payment: pay }) as any;
  const onOf = (m: any) => Object.fromEntries(m.byProperty.map((p: any) => [p.propertyId, p.mortgageId]));
  test('easy · Single mortgage matched to named property', () => {
    const m = mortgagesByProperty([home('p1', null, 'Home'), home('p2', null, 'Cabin')], [mort('m1', 'p1', 'Home mortgage', 1500)]);
    expect({ propertyCount: m.properties, mortgageCount: m.mortgages, unmatched: m.unmatched.map((u) => u.id), ...onOf(m) })
      .toEqual({ propertyCount: 2, mortgageCount: 1, unmatched: [], p1: 'm1', p2: null });
  });
  test('easy · Named property already assigned: second mortgage stays unmatched', () => {
    const m = mortgagesByProperty([home('p1', null, 'Home')], [mort('m1', 'p1', 'First'), mort('m2', 'p1', 'Second')]);
    expect({ propertyCount: m.properties, mortgageCount: m.mortgages, unmatched: m.unmatched.map((u) => u.id) }).toEqual({ propertyCount: 1, mortgageCount: 2, unmatched: ['m2'] });
  });
  test('complex · One unassigned mortgage and one free property gets unique match', () => {
    const m = mortgagesByProperty([home('p1', null, 'Cabin')], [mort('m1', null, 'Cabin mortgage')]);
    expect({ ...onOf(m), unmatched: m.unmatched.map((u) => u.id) }).toEqual({ p1: 'm1', unmatched: [] });
  });
  test('complex · Multiple possible free properties leaves mortgage unmatched', () => {
    const m = mortgagesByProperty([home('p1', null, 'Home'), home('p2', null, 'Cabin')], [mort('m1', null, 'Loan')]);
    expect({ unmatched: m.unmatched.map((u) => u.id), ...onOf(m) }).toEqual({ unmatched: ['m1'], p1: null, p2: null });
  });
  test('edge · Non-mortgage debts excluded; no property means mortgage unmatched', () => {
    const m = mortgagesByProperty([], [{ debt_id: 'd1', debt_type: 'CREDIT_CARD' } as any, mort('m1', null)]);
    expect({ propertyCount: m.properties, mortgageCount: m.mortgages, unmatched: m.unmatched.map((u) => u.id) }).toEqual({ propertyCount: 0, mortgageCount: 1, unmatched: ['m1'] });
  });
});

describe('MK-NW-F-107 propertyUses — five cases', () => {
  test('easy · Rent entry makes named property rental', () => {
    expect(usesOf(propertyUses([home('p1', null)], [{ property_id: 'p1', income: 1500, expenses: 0 }]))).toEqual({ p1: 'RENTAL' });
  });
  test('easy · No rent and no use: first property is home', () => {
    expect(usesOf(propertyUses(entered([home('p1', null), home('p2', null)]), []))).toEqual({ p1: 'HOME', p2: 'SECOND' });
  });
  test('complex · Stored rental fallback only when no rent entries supplied', () => {
    expect(usesOf(propertyUses([home('p1', 'rental')], null))).toEqual({ p1: 'RENTAL' });
  });
  // SPECIFICATION_CONFLICT (OpenAI's answer agrees with the app): the card says "SECOND = every other property, except
  // that a rent entry naming no property makes the one remaining property a rental when there is exactly one" — read
  // literally, p2 (the one property left once p1 is the home) would be a RENTAL. His ruling DEC-4059d (2026-10-10) and
  // card MK-NW-F-115 say an entry that names no property is not rent; the code follows them (assets/index.ts
  // propertyUseMap: "AN ENTRY WITH NO PROPERTY MAKES NOTHING A RENTAL"). The ruling governs; the F-107 card text was stale and is corrected 2026-10-13 (an entry naming no property is not rent).
  test('complex · Rent entry naming no property only promotes unique remaining property', () => {
    expect(usesOf(propertyUses(entered([home('p1', 'primary'), home('p2', 'secondary')]), [{ property_id: null, income: 1000 }]))).toEqual({ p1: 'HOME', p2: 'SECOND' });
  });
  test('edge · No properties returns empty map', () => {
    expect(usesOf(propertyUses([acct({ asset_id: 'cash', kind: 'checking', asset_class: 'cash' })], []))).toEqual({});
  });
});

describe('MK-NW-F-108 taxWordsOf — five cases', () => {
  test('easy · 529 always tax-free for education', () => {
    expect(taxWordsOf(acct({ kind: 'college_529', tax_treatment: 'taxable', tax_bucket: 'TAXABLE' }))).toBe('tax-free for education');
  });
  test('easy · HSA always pre-tax, tax-free for medical costs', () => {
    expect(taxWordsOf(acct({ kind: 'hsa', tax_treatment: 'taxable', tax_bucket: 'ROTH' }))).toBe('pre-tax — tax-free for medical costs');
  });
  // BRIEF WRONG: 'tax type not stated' — right is 'pre-tax — taxed when it comes out'. The case states the tax bucket:
  // pre-tax. The app has no separate "treatment" beside the bucket for an IRA; taxTreatmentOf reads the stored treatment,
  // else the bucket, else the kind's own bucket when the kind says how it is taxed (DEC-4036f, 2026-10-10: "a 401(k), an
  // IRA, a checking account"). A pre-tax bucket IS a stated tax type, and a traditional IRA's own bucket is pre-tax too.
  // "Not guessed from the wrapper" is DEC-4036f's rule for a brokerage, a bond, a CD or crypto — kinds that do not say.
  test.failing('complex · Unstated treatment stays unstated', () => {
    expect(taxWordsOf(acct({ kind: 'trad_ira', tax_treatment: undefined, tax_bucket: 'PRE_TAX' }))).toBe('tax type not stated');
  });
  test('complex · Unstated treatment stays unstated — the app\'s answer, hand-checked', () => {
    expect(taxWordsOf(acct({ kind: 'trad_ira', tax_treatment: undefined, tax_bucket: 'PRE_TAX' }))).toBe('pre-tax — taxed when it comes out');
    // the rule OpenAI meant, where it applies: a brokerage with no tax type stored reads 'tax type not stated'
    expect(taxWordsOf(acct({ kind: 'brokerage', tax_treatment: undefined, tax_bucket: undefined }))).toBe('tax type not stated');
  });
  test('complex · Tax-deferred account words', () => {
    expect(taxWordsOf(acct({ kind: '401k', tax_treatment: 'tax_deferred', tax_bucket: 'PRE_TAX' }))).toBe('pre-tax — taxed when it comes out');
  });
  test('edge · Tax-free wording depends on Roth bucket', () => {
    expect(taxWordsOf(acct({ kind: 'brokerage', tax_treatment: 'tax_free', tax_bucket: 'ROTH' }))).toBe('tax-free (Roth)');
  });
});

describe('MK-NW-F-109 holdingClassOf — five cases', () => {
  test('easy · Stored person answer wins', () => {
    expect(holdingClassOf({ asset_class: 'bond', class_source: 'user', class_asked: false, ticker: 'ABC', name: 'ABC fund' })).toBe('bonds');
  });
  test('easy · Asked-but-unanswered is Unclassified', () => {
    expect(holdingClassOf({ asset_class: 'stock_etf', class_asked: true, ticker: 'ABC', name: 'ABC fund' })).toBe('mixed');
  });
  test('complex · Ticker/name evidence makes money market Stocks / Funds, not cash', () => {
    expect(holdingClassOf({ asset_class: 'cash', class_asked: false, ticker: 'VMFXX', name: 'Money Market Fund' })).toBe('stocks_etf');
  });
  test('complex · CD or T-bill evidence means Bonds & CDs', () => {
    expect(holdingClassOf({ asset_class: 'stock_etf', class_asked: false, ticker: null, name: 'Treasury bill' })).toBe('bonds');
  });
  test('edge · No stored class and no cash name stays Unclassified', () => {
    expect(holdingClassOf({ asset_class: null, class_asked: false, ticker: null, name: 'Mystery holding' })).toBe('mixed');
  });
});

describe('MK-NW-F-110 primaryHomeIdOf — five cases', () => {
  test('easy · Explicit home is selected', () => {
    expect(primaryHomeIdOf(entered([home('p1', 'secondary'), home('p2', 'primary')]), [])).toBe('p2');
  });
  test('easy · No use stated anywhere: first entered property is home', () => {
    expect(primaryHomeIdOf(entered([home('p1', null), home('p2', null)]))).toBe('p1');
  });
  test('complex · No home and some other use stated: return null', () => {
    expect(primaryHomeIdOf([home('p1', 'secondary')])).toBeNull();
  });
  // BRIEF WRONG: null — right is 'p1'. No use is stated on either property (both null); rent entered for p2 makes p2 a
  // rental (DEC-1926), which is not a stated USE on a property. The card (MK-NW-F-107, which this reads): "HOME = the one
  // marked as the home lived in; with none marked and no use stated on any, the one entered first" — p1, the first
  // entered and not the rental. DEC-2747e (2026-10-07): "With two or more properties and no use stated, the one entered
  // first is the home." DEC-4913 (2026-10-13) stops the fallback only when a use is STATED on some property (its case:
  // B marked the home). OpenAI's "not all uses blank" is false here — all stored uses are blank. Reading it OpenAI's way,
  // the person who lives in p1 and rents out p2 would have no home, and p1 would count toward retirement money.
  test.failing('complex · Rent entries are passed through property-use rule', () => {
    expect(primaryHomeIdOf(entered([home('p1', null), home('p2', null)]), [{ property_id: 'p2', income: 1000 }])).toBeNull();
  });
  test('complex · Rent entries are passed through property-use rule — the app\'s answer', () => {
    expect(primaryHomeIdOf(entered([home('p1', null), home('p2', null)]), [{ property_id: 'p2', income: 1000 }])).toBe('p1');
    // and whichever was entered first, the rental is never made the home
    expect(primaryHomeIdOf([home('p1', null), home('p2', null)], [{ property_id: 'p2', income: 1000 }])).toBe('p1');
  });
  test('edge · No properties returns null', () => {
    expect(primaryHomeIdOf([acct({ asset_id: 'cash', kind: 'checking', asset_class: 'cash' })])).toBeNull();
  });
});

// REMOVED 2026-10-14 (inputs-and-use audit, 2026-10-11, Net worth: "Called only by those … Remove"): MK-NW-F-111
// assetsStateFrom was called only by MK-NW-F-044 getAssetsState, which nothing called; both left the code with
// MK-NW-F-042 loadAssets and MK-NW-F-043 saveAssets. Its five cases are no longer run. DEC-2748i governed this path only.
// The numbers are retired in moneykeel_function_register.json, never reused.

describe('MK-NW-F-112 yearlyInterest — five cases', () => {
  test('easy · Face times coupon rate', () => { expect(yearlyInterest(bond({ face: 10000, couponRate: 0.04, value: 9800 }))!).toBeCloseTo(400, 6); });
  test('easy · Missing face falls back to current value', () => { expect(yearlyInterest(bond({ face: null, couponRate: 0.03, value: 8000 }))!).toBeCloseTo(240, 6); });
  // the layer question (DEC-2748c "with no rate, $0 and said so"; A46): the helper says null; the totals that add it
  // count $0 (yearlyInterestNow ?? 0 in couponIncomeAnnual / interestIncomeAnnual / bondSummary) and the Bonds screen
  // names the bond as having no rate (theBonds.leftOutNoRate) — the row itself reads "coupon not entered", never $0
  test('complex · Missing rate returns null, not zero', () => { expect(yearlyInterest(bond({ face: 10000, couponRate: null, value: 10000 }))).toBeNull(); });
  test('complex · Explicit zero rate is known zero', () => { expect(yearlyInterest(bond({ face: 10000, couponRate: 0, value: 10000 }))).toBe(0); });
  test('edge · Negative rate is literal if accepted by schema', () => { expect(yearlyInterest(bond({ face: 10000, couponRate: -0.01, value: 10000 }))!).toBeCloseTo(-100, 6); });
});

describe('MK-NW-F-113 altPartsOf — five cases', () => {
  const shape = (parts: any[]) => parts.map((p) => ({ value: p.value, kind: nothing(p.kind), notClassified: !!p.notClassified }));
  // a crypto account held by hand that records its own cash: $200 cash, $800 alternatives — the split the case gives
  test('easy · Alternative account uses own kind and split part', () => {
    expect(shape(altPartsOf(acct({ asset_id: 'a', kind: 'crypto', asset_class: 'alternatives', balance: 1000, cash_balance: 200 })))).toEqual([{ value: 800, kind: 'crypto', notClassified: false }]);
  });
  test('easy · Option positions use synced values and options kind', () => {
    expect(shape(altPartsOf(linked({ asset_id: 'a', balance: 1000 }, 750, [], [{ value: 250 }])))).toEqual([{ value: 250, kind: 'options', notClassified: false }]);
  });
  test('complex · Crypto/commodity holding kind inferred from name', () => {
    const a = linked({ asset_id: 'a', balance: 350 }, 0, [pos(null, 'Bitcoin', 2, 100, 'other'), pos(null, 'Gold bullion', 3, 50, 'other')]);
    expect(shape(altPartsOf(a))).toEqual([{ value: 200, kind: 'crypto', notClassified: false }, { value: 150, kind: 'commodities', notClassified: false }]);
  });
  // the case's split (Alternatives $400 of $1,000, no priced holding, no option) is made by a linked account with $600
  // cash and one alternative it holds with NO price: $400 of alternatives that no priced holding or option explains
  test('complex · Remainder above half cent is unclassified, no rate', () => {
    const a = linked({ asset_id: 'a', balance: 1000 }, 600, [pos(null, 'Private stake', 1, null, 'other')]);
    expect(shape(altPartsOf(a))).toEqual([{ value: 400, kind: null, notClassified: true }]);
  });
  test('edge · No alternatives returns empty list', () => {
    expect(altPartsOf(linked({ asset_id: 'a', balance: 1000 }, 0, [pos('VTI', 'VTI', 10, 100, 'stock_etf')]))).toEqual([]);
  });
});

describe('MK-NW-F-114 rentAmount — five cases', () => {
  test('easy · Plain integer string accepted', () => { expect(rentAmount('2000')).toBe(2000); });
  test('easy · Dollar sign, comma and spaces accepted', () => { expect(rentAmount(' $2,500.50 ')).toBe(2500.5); });
  test('complex · Text with digits is rejected', () => { expect(rentAmount('about 2k')).toBe(0); });
  test('complex · Minus sign and n/a rejected', () => { expect(rentAmount('-100')).toBe(0); expect(rentAmount('n/a')).toBe(0); });
  test('edge · Multiple decimals rejected', () => { expect(rentAmount('1.2.3')).toBe(0); });
});

describe('MK-NW-F-115 liveRent — five cases', () => {
  test('easy · Named property with positive income is live', () => {
    expect(liveRent([{ property_id: 'p1', income: 1500, expenses: 0 }])).toEqual([{ property_id: 'p1', income: 1500, expenses: 0 }]);
  });
  test('easy · Named property with positive costs is live', () => {
    expect(liveRent([{ property_id: 'p2', income: 0, expenses: 300 }])).toEqual([{ property_id: 'p2', income: 0, expenses: 300 }]);
  });
  test('complex · No property identifier is excluded despite figures', () => { expect(liveRent([{ property_id: null, income: 1500, expenses: 300 }])).toEqual([]); });
  test('complex · Zero and negative values do not qualify', () => {
    expect(liveRent([{ property_id: 'p1', income: 0, expenses: 0 }, { property_id: 'p2', income: -1, expenses: -2 }])).toEqual([]);
  });
  test('edge · Null rentals returns empty list', () => { expect(liveRent(null)).toEqual([]); });
});

describe('MK-NW-F-116 rentedIdsOf — five cases', () => {
  const ids = (r: any) => [...rentedIdsOf(r)];
  test('easy · Returns ids from live rent entries', () => { expect(ids([{ property_id: 'p1', income: 100 }, { property_id: 'p2', expenses: 50 }])).toEqual(['p1', 'p2']); });
  test('easy · Duplicate property ids collapse', () => { expect(ids([{ property_id: 'p1', income: 100 }, { property_id: 'p1', expenses: 50 }])).toEqual(['p1']); });
  test('complex · Unattached rent excluded via liveRent', () => { expect(ids([{ property_id: null, income: 1000 }, { property_id: 'p1', income: 100 }])).toEqual(['p1']); });
  test('complex · Zero income and zero expense excluded', () => { expect(ids([{ property_id: 'p1', income: 0, expenses: 0 }])).toEqual([]); });
  test('edge · Missing rentals returns empty', () => { expect(ids(null)).toEqual([]); });
});
