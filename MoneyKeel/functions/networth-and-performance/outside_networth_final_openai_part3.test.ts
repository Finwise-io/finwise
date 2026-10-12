/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "nw module final — part 3", written by the OpenAI formula auditor
 * from the cards alone (MK-NW-F-055..073, F-084, F-090..092, F-094, F-103, F-104).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_nw_part3_audit.json (130 cases).
 * Every expected answer below is the auditor's, copied as written; only its plain input names are mapped onto the
 * app's fields. A case the app fails is marked, never fixed by changing the answer here. Results, case by case:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/moneykeel_nw_final_openai_part3_results.json
 *
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing) · `// BRIEF WRONG:` the auditor's own
 * expectation is wrong (test.failing, their number kept) · `// UNCLEAR:` the auditor wrote RULE UNCLEAR, no decision
 * settles it, so the app's current behaviour is asserted · `// SETTLED BY DEC-…:` the auditor wrote RULE UNCLEAR and a
 * decision answers it · `// BLOCKED:` the case cannot be handed to the function (test.skip).
 *
 * INPUT NAMES MAPPED (the app's fields, not the answers):
 *   today → the function's `now` (a local Date at that calendar day) or `today` string; a case with no today runs
 *   on 2026-10-09, the audit date. "REFUSES" / "not entered" = null or undefined (prettyDay: the empty string).
 *   class words → asset_class ids: "Bonds & CDs" 'bonds', "Stocks / Funds" 'stocks_etf', "Cash" 'cash',
 *   "Unclassified" 'mixed', "Real estate"/property kind 'home'. is_cd / kind cd → kind 'cd' (BondInfo.isCd).
 *   A bond account: face_value / face → face_value, rate → coupon_rate, maturity → maturity_date, value / balance →
 *   balance, accrued_interest → accrued_interest; read through the app's bondInfo where the function takes BondInfo.
 *   A "class_breakdown" split account → a linked account (source 'connected') whose cash_balance and priced
 *   positions (lots × last_price, stored class 'stock_etf' / 'bond') make that split, as the app computes it.
 *   Records: { date, values: {A: v} } → a recorded day { date, holdings: [], accounts: [{ accountId, typedValue: v }] };
 *   a record row naming only an account ({date, account}) gets a stand-in value of 1 (only presence is tested).
 *   Transactions: type "dividend"/"interest" → 'DIVIDEND'/'INTEREST'; period_start → windowStart.
 *   categoryEarnings rows: current_value → marketValue, period_return → periodReturn, class → position.asset_class.
 *   pricedGainOf rows: bought_inside_period → cappedSince set and gain = value − cost; otherwise marketValue and
 *   periodReturn. windowStartKey labels: "This year" 'YTD', "Since" 'SINCE', others as written.
 *   buildNetWorth takes two totals: asset rows and debt rows are summed first (debts by the app's totalDebtBalance).
 *   ledgerGroups is called as the Net worth screen calls it (class label + assetClassOf). Account names → asset ids.
 *   accruedInterestCaveat: the auditor gives the estimate ($1,119, 363 days); the bond that produces it is built —
 *   face $25,000 at 4.5%, coupon due 2026-10-11, today 2026-10-09 (25,000 × 4.5% × 363/365 = $1,118.84).
 *   closedWith (MK-NW-F-104) is not exported: it is read out of its source file (plural, MK-NW-F-067, is exported since DEC-4082)
 *   (src/domain/assets/index.ts, performance.ts) and compiled as written — the app's own text, nothing re-typed.
 *   "shown" strings are screen formatting (fig()), not this function's output, and are not asserted.
 * TOLERANCES: exact arithmetic compared with toBe / 12 decimal places; the solved yield to maturity (200 halvings)
 * is checked by repricing — priceAtYield at the app's yield equals the target price to 6 decimal places ($0.000001).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  isBond, bondInfo, annualCoupon, yearsToMaturity, currentYield, approxYTM, bondSummary, couponIncomeAnnual,
  interestIncomeAnnual, bondRateSensitivity, priceAtYield, accruedInterestCaveat, type BondInfo,
} from '../../../src/domain/bonds';
import { sumWhere, prettyDay, assetClassOf, ASSET_CLASS_LABEL, plural as realPlural } from '../../../src/domain/assets';
import { itemizeMissingCount } from '../../../src/domain/assets/itemize';
import { buildNetWorth } from '../../../src/domain/networth';
import { totalDebtBalance } from '../../../src/domain/debt';
import { dataGaps } from '../../../src/domain/gaps';
import { rowOf, isCertificateOfDeposit, theBonds } from './bonds';
import { itemising } from './account';
import { ledgerGroups } from './net-worth';
import { categoryEarnings, windowStartKey, pricedGainOf, investmentAccountIdsOf, investmentRecordDates } from './performance';

// ── the two functions the app does not export, compiled from their own source text ──────────────────
const fromSource = (file: string, start: RegExp, end: string, name: string) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = text.search(start);
  if (at < 0) throw new Error(`${name} not found in ${file}`);
  const code = text.slice(at, text.indexOf(end, at) + end.length);
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(`${js}\nreturn ${name};`)();
};
// plural is exported since DEC-4082 (2026-10-10) and reads its plural from the one list PLURAL_WORDS: imported, not compiled
const plural = (n: number, word: string, _many?: string) => realPlural(n, word as any);
const closedWith: (days: any[], ids: Set<string>, today: string, ending: number) => any[] =
  fromSource('performance.ts', /function closedWith\(/, '\n}\n', 'closedWith');

// ── helpers, in the style of outside_networth_04_final and fix_brief_networth_06 ─────────────────────
const D = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const TODAY = D('2026-10-09');
const refuses = (v: unknown) => expect(v == null).toBe(true);
const bond = (face: number | null, rate: number | null, maturity: string, value: number = face ?? 0, accrued: number | null = null, isCd = false): BondInfo =>
  ({ face, couponRate: rate, maturity, value, accruedInterest: accrued, isCd });
const bondAcct = (o: Record<string, any>) =>
  ({ asset_id: o.id ?? 'a', label: o.label ?? 'Bond', kind: o.kind ?? 'fixed_income', tax_bucket: 'TAXABLE', asset_class: o.asset_class ?? 'bonds',
     balance: o.value, face_value: o.face, coupon_rate: o.rate, maturity_date: o.maturity, accrued_interest: o.accrued ?? undefined,
     institution: o.institution, target_return: 0 } as any);
const acct = (over: Record<string, any> = {}) =>
  ({ asset_id: over.id ?? 'a', label: 'Account', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.06, ...over }) as any;
const pos = (ticker: string, shares: number, price: number | null, stored = 'stock_etf') =>
  ({ ticker, name: ticker, asset_class: stored, last_price: price, lots: [{ shares, cost_per_share: 0, purchase_date: '' }] });
const linked = (over: Record<string, any>, cash: number, positions: any[]) =>
  acct({ kind: 'brokerage', source: 'connected', cash_balance: cash, positions, option_holdings: [], ...over });
const groups = (accounts: any[], by: 'class' | 'institution') =>
  ledgerGroups(accounts, by, (a: any) => (ASSET_CLASS_LABEL as any)[assetClassOf(a)], assetClassOf);
const day = (date: string, values: Record<string, number>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
const plain = (days: any[]) => days.map((d) => ({ date: d.date, values: Object.fromEntries((d.accounts ?? []).map((a: any) => [a.accountId, a.typedValue])) }));
const row = (cls: string, current_value: number | null, period_return: number | null, ticker?: string) =>
  ({ position: { ticker, asset_class: cls }, marketValue: current_value ?? undefined, periodReturn: period_return });

describe('MK-NW-F-055 isBond — five cases', () => {
  test('easy · Bond class returns true', () => { expect(isBond(acct({ asset_class: 'bonds' }))).toBe(true); });
  test('easy · Maturity alone does not make bond', () => { expect(isBond(acct({ asset_class: 'stocks_etf', maturity_date: '2030-01-01' }))).toBe(false); });
  test('complex · CD classified bond', () => { expect(isBond(acct({ asset_class: 'bonds', kind: 'cd' }))).toBe(true); });
  test('complex · Confirmed cash with date still not bond here', () => { expect(isBond(acct({ asset_class: 'cash', maturity_date: '2027-01-01' }))).toBe(false); });
  test('edge · Unknown class false', () => { expect(isBond(acct({ asset_class: 'mixed' }))).toBe(false); });
});

describe('MK-NW-F-056 bondInfo — five cases', () => {
  test('easy · Known bond facts', () => {
    const b = bondInfo(bondAcct({ face: 1000, rate: 0.04, maturity: '2030-01-01', value: 980, accrued: null }));
    expect({ face_value: b.face, rate: b.couponRate, maturity: b.maturity, value: b.value, is_cd: b.isCd }).toEqual(
      { face_value: 1000, rate: 0.04, maturity: '2030-01-01', value: 980, is_cd: false });
    refuses(b.accruedInterest);   // "not entered"
    // value_label "Statement market value (excludes accrued interest)": bondInfo returns no label; the editor's own words
    // (BondsScreen.tsx:239) are "Market value, as your statement shows it — without accrued interest" — same meaning, his DEC-3390
  });
  test('easy · Zero rate is retained', () => {
    const b = bondInfo(bondAcct({ face: 1000, rate: 0, value: 1000, maturity: '2030-01-01' }));
    expect({ face_value: b.face, rate: b.couponRate, value: b.value }).toEqual({ face_value: 1000, rate: 0, value: 1000 });
  });
  test('complex · Market value excludes accrued interest', () => {
    // maturity not given by the case; 2031-10-09 (five whole years, as in the MK-NW-F-060 case) is added only to reprice
    const b = bondInfo(bondAcct({ value: 9850, accrued: 112.5, face: 10000, rate: 0.045, maturity: '2031-10-09' }));
    expect({ value: b.value, accrued_interest: b.accruedInterest }).toEqual({ value: 9850, accrued_interest: 112.5 });
    expect(priceAtYield(b, approxYTM(b, TODAY)!, TODAY)!).toBeCloseTo(9962.5, 6);   // full_price_for_ytm
  });
  test('complex · Missing face stays blank, not zero', () => {
    const b = bondInfo(bondAcct({ value: 9700, face: null, rate: 0.042, kind: 'cd' }));
    refuses(b.face); expect({ value: b.value, rate: b.couponRate }).toEqual({ value: 9700, rate: 0.042 });
  });
  test('edge · Negative face rejected as not entered', () => { refuses(bondInfo(bondAcct({ face: -100, rate: 0.04, value: 100 })).face); });
});

describe('MK-NW-F-057 annualCoupon — five cases', () => {
  test('easy · Annual coupon', () => { expect(annualCoupon(bond(1000, 0.05, '2030-01-01'))).toBe(50); });
  test('easy · Zero rate is zero coupon', () => { expect(annualCoupon(bond(2500, 0, '2030-01-01'))).toBe(0); });
  // BRIEF WRONG: 524.187475 — right is 524.690975 because 12,345.67 × 0.04 = 493.8268 and 12,345.67 × 0.0025 = 30.864175,
  // which add to 524.690975 (the auditor's own working line repeats the slip). The app gives 524.6909750000001.
  test.failing('complex · Unround face and coupon', () => { expect(annualCoupon(bond(12345.67, 0.0425, '2030-01-01'))!).toBeCloseTo(524.187475, 12); });
  // BRIEF WRONG: { annual_interest: 0, disclosure } — right is nothing (null) from THIS helper because DEC-2748c puts
  // "with no rate, $0 and said so" on yearlyInterest (MK-NW-F-112) and the income figures it feeds (F-062, F-063), not on
  // annualCoupon, whose one caller is priceAtYield (bonds/index.ts:669, `?? 0`). The card says "Nothing when either was
  // not entered" and the auditor's note asks exactly this. The $0 + words live at the income figure: couponIncomeAnnual
  // gives 0 and the row reads "coupon not entered" (BondsScreen.tsx:89).
  test.failing('complex · Missing rate must disclose zero annual interest', () => {
    expect(annualCoupon(bond(10000, null, '2030-01-01'))).toBe(0);
  });
  test('edge · Missing face but known rate', () => { refuses(annualCoupon(bond(null, 0.04, '2030-01-01', 5000))); });
});

describe('MK-NW-F-058 yearsToMaturity — five cases', () => {
  test('easy · Exactly one year', () => { expect(yearsToMaturity('2027-01-01', D('2026-01-01'))).toBe(1); });
  test('easy · Maturity today is zero', () => { expect(yearsToMaturity('2026-10-09', D('2026-10-09'))).toBe(0); });
  // SETTLED BY DEC-3279b: anniversaries are counted back from the MATURITY date (Aug 29, which every year has), so a
  // Feb 29 today needs no convention: 2024-08-29 is the first anniversary on or after today → 1 + 182/366.
  test('complex · Leap-year anniversary fraction', () => { expect(yearsToMaturity('2025-08-29', D('2024-02-29'))!).toBeCloseTo(1 + 182 / 366, 12); });
  test('complex · 4.4 years uses exact anniversaries', () => {
    // whole anniversaries + remaining days ÷ days in that anniversary year: 4 + 146/365 = 4.4, no rounding before display
    expect(yearsToMaturity('2030-05-27', D('2026-01-01'))!).toBeCloseTo(4.4, 12);
  });
  // FINDING: app gives 0, expected REFUSES — the validity check is `new Date(maturity)` (bonds/index.ts:222), which JavaScript
  // rolls 2026-02-30 forward to 2026-03-02 instead of rejecting, so the impossible date reads as already matured (and, seen
  // from 2026-01-01, as 0.16 years away). The card says "Nothing when there is no valid date"; DEC-0332: unknown is not due now.
  // FIXED 2026-10-09 after OpenAI's final audit (was test.failing)
  test('edge · Invalid date refuses', () => { refuses(yearsToMaturity('2026-02-30', TODAY)); });
});

describe('MK-NW-F-059 currentYield — five cases', () => {
  test('easy · Current yield', () => { expect(currentYield(bond(1000, 0.05, '2030-01-01', 1000))!).toBeCloseTo(0.05, 12); });
  test('easy · Premium price lowers yield', () => { expect(currentYield(bond(1000, 0.05, '2030-01-01', 1250))!).toBeCloseTo(0.04, 12); });
  test('complex · Accrued interest excluded from denominator', () => {
    expect(currentYield(bond(10000, 0.045, '2030-01-01', 9850, 112.5))!).toBeCloseTo(0.04568527918781726, 12);
  });
  test('complex · No rate refuses yield', () => { refuses(currentYield(bond(10000, null, '2030-01-01', 9500))); });
  test('edge · Zero or negative value refuses', () => { refuses(currentYield(bond(null, 0.05, '2030-01-01', 0))); });
});

describe('MK-NW-F-060 approxYTM — five cases', () => {
  test('easy · CD uses stated rate', () => { expect(approxYTM(bond(10000, 0.042, '2028-01-01', 10000, null, true), D('2026-01-01'))).toBe(0.042); });
  test('easy · Matured bond refuses YTM', () => { refuses(approxYTM(bond(10000, 0.05, '2026-10-08'), D('2026-10-09'))); });
  test('complex · Bond full price includes accrued interest', () => {
    const b = bond(10000, 0.045, '2031-10-09', 9850, 112.5);
    const y = approxYTM(b, D('2026-10-09'))!;
    expect(priceAtYield(b, y, D('2026-10-09'))!).toBeCloseTo(9962.5, 6);   // pricing_target, solved to $0.000001
  });
  // SETTLED 2026-10-10 by DEC-3837 ("Interest rate % is the coupon … #4 - yes"): a CD not marked as bought through a
  // broker is a bank CD, and a bank CD's yield to maturity is its interest rate — no face value needed. So a CD typed
  // by its balance and rate shows its stated 4.2%. (A broker CD with no face still refuses, as a bond does.)
  test('complex · CD with rate but no face value', () => { expect(approxYTM(bond(null, 0.042, '2028-01-01', 9700, null, true), D('2026-01-01'))).toBe(0.042); });
  test('edge · Missing rate refuses', () => { refuses(approxYTM(bond(10000, null, '2030-01-01', 9800), D('2026-01-01'))); });
});

describe('MK-NW-F-061 bondSummary — five cases', () => {
  test('easy · One bond summary', () => {
    const s = bondSummary([bond(1000, 0.05, '2027-01-01', 980)], TODAY);
    expect({ count: s.count, total_value: s.totalValue, total_face: s.totalFace, annual_interest: s.annualCoupon, next_maturity: s.nextMaturity })
      .toEqual({ count: 1, total_value: 980, total_face: 1000, annual_interest: 50, next_maturity: '2027-01-01' });
    expect(s.avgYield!).toBeCloseTo(0.05102040816326531, 12);
  });
  test('easy · No qualifying yield refuses', () => {
    refuses(bondSummary([bondInfo(bondAcct({ value: undefined, face: 1000, rate: 0.05, maturity: '2027-01-01' }))], TODAY).avgYield);
  });
  test('complex · Average yield excludes unpriced bond', () => {
    const accounts = [bondAcct({ id: 'A', label: 'A', value: 950, rate: 0.05, face: 1000 }), bondAcct({ id: 'B', label: 'B', value: undefined, rate: 0.05, face: 2000 }),
      bondAcct({ id: 'C', label: 'C', value: 2000, rate: null, face: null })];
    const s = bondSummary(accounts.map(bondInfo), TODAY);
    expect(s.count).toBe(3);
    expect(s.avgYield!).toBeCloseTo(0.05263157894736842, 12);
    // total_value "REFUSES/incomplete because one value missing", known_value_subtotal 2950: the total is the known
    // subtotal, and B is named as missing — on the Bonds screen (leftOutOfAverage) and in the amber box (dataGaps, DEC-3279e)
    expect(s.totalValue).toBe(2950);
    expect(theBonds({ accounts, today: TODAY }).leftOutOfAverage).toEqual(['B']);
    expect(dataGaps(accounts as any, null, TODAY.getTime()).filter((g) => g.kind === 'no-balance').map((g) => g.accountId)).toEqual(['B']);
  });
  test('complex · Missing face is not zero', () => {
    const accounts = [bondAcct({ id: 'one', label: 'Bond one', face: 1000, value: 980, rate: 0.05 }), bondAcct({ id: 'two', label: 'Bond two', face: null, value: 1000, rate: 0.04 })];
    const s = theBonds({ accounts, today: TODAY });
    // total_face.known_subtotal 1000 + "One face value not entered; total is incomplete": the door names the bond and the
    // Bonds screen prints "Face value leaves out Bond two — not entered." (BondsScreen.tsx:72-73)
    expect(s.totalFace).toBe(1000);
    expect(s.faceNotEntered).toEqual(['Bond two']);
    expect(s.couponPerYear).toBeCloseTo(90, 12);   // annual_interest 50 + 1,000 × 4%
  });
  test('edge · No bonds returns count zero but no average yield', () => {
    const s = bondSummary([], TODAY);
    expect({ count: s.count, total_value: s.totalValue, next_maturity: s.nextMaturity }).toEqual({ count: 0, total_value: 0, next_maturity: null });
    refuses(s.avgYield);
    // total_face: $0 with count 0 — "no holdings" is stated by the count, and the Bonds screen shows its empty state (BondsScreen.tsx:50)
    expect(s.totalFace).toBe(0);
  });
});

describe('MK-NW-F-062 couponIncomeAnnual — five cases', () => {
  test('easy · One bond annual interest', () => { expect(couponIncomeAnnual([bondAcct({ face: 1000, rate: 0.05, value: 980, maturity: '2028-01-01' })])).toBe(50); });
  test('easy · No rate counts zero', () => {
    const accounts = [bondAcct({ label: 'Bond', face: 1000, rate: null, value: 1000 })];
    expect(couponIncomeAnnual(accounts)).toBe(0);
    // the disclosure: the row reads "coupon not entered" (BondsScreen.tsx:89) and the summary names the bond (leftOutNoRate, :70)
    expect(theBonds({ accounts, today: TODAY }).rows[0].couponPerYear).toBeNull();
    expect(theBonds({ accounts, today: TODAY }).leftOutNoRate).toEqual(['Bond']);
  });
  // SETTLED BY DEC-2748c ("one rule everywhere … Before: the Bonds screen counted a CD at $0") and DEC-0051 (a CD is Bonds &
  // CDs): the CD is in this figure → $770.
  test('complex · Several bonds and CD', () => {
    expect(couponIncomeAnnual([bondAcct({ id: 'a', face: 10000, value: 9800, rate: 0.045 }), bondAcct({ id: 'b', face: null, value: 4000, rate: 0.03 }),
      bondAcct({ id: 'c', face: 5000, value: 4900, rate: 0.04 })])).toBeCloseTo(770, 12);
  });
  // FINDING: app gives 580, expected 80 — couponIncomeAnnual takes no date and never drops a matured bond (bonds/index.ts:557),
  // nor does the Bonds screen's COUPON /year, bondSummary (:522); interestIncomeAnnual does (:602, DEC-2748d). Two figures
  // for one year's interest disagree by $500 — DEC-2748c says one rule everywhere.
  // FIXED 2026-10-09 after OpenAI's final audit (was test.failing)
  test('complex · Expired bond omitted', () => {
    expect(couponIncomeAnnual([bondAcct({ id: 'x', face: 10000, rate: 0.05, maturity: '2026-10-08' }), bondAcct({ id: 'y', face: 2000, rate: 0.04, maturity: '2028-10-09' })])).toBe(80);
  });
  // SETTLED 2026-10-10 by DEC-4036b ("1 to 5 - Approved"): a bond or CD with no maturity date keeps counting its interest
  // (DEC-0332: unknown, not matured) — $200 — and its row reads "maturity date not entered" instead of a dash
  test('edge · Maturity date missing', () => { expect(couponIncomeAnnual([bondAcct({ face: 5000, rate: 0.04, maturity: null })])).toBe(200); });
});

describe('MK-NW-F-063 interestIncomeAnnual — five cases', () => {
  test('easy · Cash account rate interest', () => {
    expect(interestIncomeAnnual([acct({ kind: 'savings', asset_class: 'cash', balance: 10000, coupon_rate: 0.03 })], TODAY)).toBeCloseTo(300, 12);
  });
  test('easy · Non-rate cash account contributes nothing', () => {
    expect(interestIncomeAnnual([acct({ kind: 'checking', asset_class: 'cash', balance: 2000, coupon_rate: null })], TODAY)).toBe(0);
  });
  test('complex · Bonds, CD, and savings interest', () => {
    expect(interestIncomeAnnual([bondAcct({ id: 'b', face: 10000, value: 9800, rate: 0.045, maturity: '2030-10-09' }),
      bondAcct({ id: 'cd', face: null, value: 5000, rate: 0.04, maturity: '2027-10-09' }),
      acct({ id: 's', kind: 'savings', asset_class: 'cash', balance: 8000, coupon_rate: 0.025 })], D('2026-10-09'))).toBeCloseTo(850, 12);
  });
  test('complex · Expired bond excluded but cash included', () => {
    expect(interestIncomeAnnual([bondAcct({ id: 'b', face: 5000, rate: 0.05, maturity: '2026-01-01' }),
      acct({ id: 's', kind: 'savings', asset_class: 'cash', balance: 2000, coupon_rate: 0.04 })], D('2026-10-09'))).toBeCloseTo(80, 12);
  });
  // SETTLED 2026-10-10 by DEC-4036b: an undated bond's interest counts ($200); only a date before today drops it
  test('edge · Undated bond interest is treated as active', () => {
    expect(interestIncomeAnnual([bondAcct({ face: 5000, rate: 0.04, maturity: null })], D('2026-10-09'))).toBe(200);
  });
});

describe('MK-NW-F-064 bondRateSensitivity — five cases', () => {
  test('easy · CD has no sensitivity figure', () => { refuses(bondRateSensitivity(bond(10000, 0.04, '2030-01-01', 10000, null, true), TODAY)); });
  // BLOCKED: bondRateSensitivity takes no yield — it solves its own (bounded to −99%…1,000%, bonds/index.ts:454) and floors
  // the down move at 0.01% (:737), so −100% cannot reach it. The −100% price itself is run under MK-NW-F-069 edge.
  test.skip('edge · Invalid yield cannot produce a price range', () => { /* see MK-NW-F-069 edge */ });
  // BLOCKED: the function prices the bond itself (priceAtYield, same module); the case's three given prices ($10,450 /
  // $10,000 / $9,600) cannot be handed in.
  test.skip('complex · Sensitivity uses price change at yield ±1 point', () => { /* cannot inject prices */ });
  // BLOCKED: the raw changes (+$43 / −$37) cannot be handed in. By hand, the app's rule (bonds/index.ts:730, :745) gives
  // step 10 for a $4,250 bond and round(43/10)×10 = 40, round(−37/10)×10 = −40 — the auditor's answer.
  test.skip('complex · Bond under $10k rounds in proportion', () => { /* cannot inject raw changes */ });
  test('easy · Missing coupon/rate refuses', () => {
    // value not given; set to face so the refusal comes from the 0% rate, not from a missing value
    refuses(bondRateSensitivity(bond(10000, 0, '2030-01-01', 10000), TODAY));
  });
});

describe('MK-NW-F-065 buildNetWorth — five cases', () => {
  test('easy · Assets minus debt', () => {
    const n = buildNetWorth('u' as any, 100000, 30000);
    expect({ net_worth: n.net_worth, assets: n.gross_assets, debt: n.gross_debt }).toEqual({ net_worth: 70000, assets: 100000, debt: 30000 });
  });
  test('easy · Debt exceeds assets', () => { expect(buildNetWorth('u' as any, 10000, 25000).net_worth).toBe(-15000); });
  test('complex · Several asset and debt rows', () => {
    const debt = totalDebtBalance([210000, 9500, 1250].map((b) => ({ remaining_balance: b })) as any);
    const n = buildNetWorth('u' as any, 8000 + 52500 + 300000, debt);
    expect({ assets: n.gross_assets, debt: n.gross_debt, net_worth: n.net_worth }).toEqual({ assets: 360500, debt: 220750, net_worth: 139750 });
  });
  // FINDING: app gives { net_worth: 80000 } and no incomplete flag, expected known_net_worth 80000 + "Incomplete — debt
  // balance missing". totalDebtBalance adds a debt with no balance as 0 (src/domain/debt/index.ts:269) and dataGaps names
  // only accounts with no balance (src/domain/gaps/index.ts:166), never a debt. DEC-3279e says "a missing balance is never
  // $0"; its governed list names only asset functions.
  test.failing('complex · Unknown debt balance must flag incomplete', () => {
    const n: any = buildNetWorth('u' as any, 100000, totalDebtBalance([{ remaining_balance: 20000 }, { remaining_balance: null }] as any));
    expect(n.net_worth).toBe(80000);
    expect(n.warning).toBe('Incomplete — debt balance missing');
  });
  // SETTLED BY DEC-0260 / DEC-2748i: with nothing entered the screen shows $0, says nothing is entered and offers the door
  // (the first-day screen) — the arithmetic $0 is right here; the words are the screen's.
  test('edge · No assets and no debt', () => { expect(buildNetWorth('u' as any, 0, 0).net_worth).toBe(0); });
});

describe('MK-NW-F-066 sumWhere — five cases', () => {
  const run = (rows: { balance: number | null; matches: boolean }[]) =>
    sumWhere(rows.map((r, i) => acct({ id: String(i), balance: r.balance ?? undefined, matches: r.matches })), (a: any) => a.matches);
  test('easy · Matching accounts sum', () => { expect(run([{ balance: 100, matches: true }, { balance: 250, matches: true }])).toEqual({ total: 350, missingCount: 0 }); });
  test('easy · Empty match set returns zero', () => { expect(run([{ balance: 100, matches: false }])).toEqual({ total: 0, missingCount: 0 }); });
  test('complex · Negative and missing balances', () => {
    expect(run([{ balance: 1000, matches: true }, { balance: -200, matches: true }, { balance: null, matches: true }, { balance: 500, matches: false }]))
      .toEqual({ total: 800, missingCount: 1 });
  });
  test('complex · Predicate excludes property', () => {
    expect(sumWhere([acct({ id: 'c', asset_class: 'cash', balance: 2000 }), acct({ id: 'h', kind: 'home', balance: 300000 })], (a) => assetClassOf(a) === 'cash'))
      .toEqual({ total: 2000, missingCount: 0 });
  });
  test('edge · Only missing matching account', () => { expect(run([{ balance: null, matches: true }])).toEqual({ total: 0, missingCount: 1 }); });
});

describe('MK-NW-F-067 plural — five cases', () => {
  test('easy · Singular CD', () => { expect(plural(1, 'CD', 'CDs')).toBe('1 CD'); });
  test('easy · Plural CDs', () => { expect(plural(3, 'CD', 'CDs')).toBe('3 CDs'); });
  // RULED (DEC-4082, 2026-10-10 — "make a list of words and plurals"): the plural comes from the one list, so a word
  // the app does not count ('person') is refused, never guessed; the case it stood for is Treasury → Treasuries.
  test('complex · Explicit irregular plural', () => {
    expect(plural(2, 'Treasury')).toBe('2 Treasuries');
    expect(() => plural(2, 'person', 'people')).toThrow(/not on PLURAL_WORDS/);
  });
  test('complex · Zero uses plural', () => { expect(plural(0, 'property', 'properties')).toBe('0 properties'); });
  // was UNCLEAR ("2 propertys" with no plural supplied); answered by DEC-4082: the list knows property → properties
  test('edge · Plural not supplied for irregular noun', () => { expect(plural(2, 'property')).toBe('2 properties'); });
});

describe('MK-NW-F-068 prettyDay — five cases', () => {
  test('easy · Date formatting', () => { expect(prettyDay('2026-08-04')).toBe('Aug 4, 2026'); });
  test('easy · September abbreviation', () => { expect(prettyDay('2026-09-09')).toBe('Sep 9, 2026'); });
  test('complex · Leap-day date', () => { expect(prettyDay('2024-02-29')).toBe('Feb 29, 2024'); });
  test('complex · Timezone offset must not shift date', () => {
    // read by pattern, never through Date: the same in any zone (src/domain/assets/index.ts:2575)
    expect(prettyDay('2026-01-01')).toBe('Jan 1, 2026');
  });
  test('edge · Impossible date refuses', () => { expect(prettyDay('2026-02-30')).toBe(''); });
});

describe('MK-NW-F-069 priceAtYield — five cases', () => {
  test('easy · Zero-coupon bond price', () => { expect(priceAtYield(bond(1000, null, '2027-01-01'), 0.05, D('2026-01-01'))!).toBeCloseTo(952.3809523809523, 10); });
  test('easy · Matured bond refuses price', () => { refuses(priceAtYield(bond(1000, 0.05, '2026-10-08'), 0.05, D('2026-10-09'))); });
  // The expected 1,018.860946745562 is RIGHT; only the working is wrong: 1,050 ÷ 1.04² = 1,050 ÷ 1.0816 = 970.7840237, not
  // 970.0443787, so 48.0769231 + 970.7840237 = 1,018.8609467 (the working's 1,018.1213018 is the slip).
  test('complex · Coupon bond discounted by exact times', () => { expect(priceAtYield(bond(1000, 0.05, '2028-01-01'), 0.04, D('2026-01-01'))!).toBeCloseTo(1018.860946745562, 10); });
  // FINDING: app gives 0, expected REFUSES — the principal is `b.face ?? 0` and the coupon `annualCoupon(b) ?? 0`
  // (bonds/index.ts:669, :672), so a bond with no face is priced at $0. Latent: both callers refuse a missing face first
  // (approxYTM :442, bondRateSensitivity :728). DEC-2748b: a face never entered is never $0.
  test('complex · Missing face must not create a numeric price', () => { refuses(priceAtYield(bond(null, 0.05, '2030-01-01', 0), 0.04, D('2026-01-01'))); });
  // FIXED 2026-10-09 after OpenAI's final audit — it was a FINDING: app gives Infinity, expected REFUSES — (1 + y)^t = 0 at y = −100% and nothing guards it (bonds/index.ts:671-672).
  // Latent: the solver never asks below −99% (:454).
  // FIXED 2026-10-09 after OpenAI's final audit (was test.failing)
  test('edge · Invalid yield at or below −100%', () => { refuses(priceAtYield(bond(1000, 0.05, '2028-01-01'), -1, D('2026-01-01'))); });
});

describe('MK-NW-F-070 accruedInterestCaveat — five cases', () => {
  test('easy · Caveat shown for estimate', () => {
    expect(accruedInterestCaveat(bond(25000, 0.045, '2029-10-11', 24200), D('2026-10-09'))).toBe(
      'Added estimated $1,119 in accrued interest to bond value at 4.5% coupon for 363 days to calculate YTM. If this is not accurate, enter actual accrued interest');
  });
  test('easy · Actual accrued interest means no caveat', () => { refuses(accruedInterestCaveat(bond(25000, 0.045, '2029-10-11', 24200, 100), D('2026-10-09'))); });
  test('complex · CD does not get estimate note', () => { refuses(accruedInterestCaveat(bond(10000, 0.04, '2027-09-09', 10000, null, true), D('2026-10-09'))); });
  test('complex · Matured bond has no estimate caveat', () => { refuses(accruedInterestCaveat(bond(10000, 0.05, '2026-10-01'), D('2026-10-09'))); });
  test('edge · Coupon day has no accrued interest', () => { refuses(accruedInterestCaveat(bond(10000, 0.05, '2029-10-09'), D('2026-10-09'))); });
});

describe('MK-NW-F-071 isCertificateOfDeposit — five cases', () => {
  test('easy · Kind says CD', () => { expect(isCertificateOfDeposit({ kind: 'cd', label: 'Deposit', institution: 'Bank' })).toBe(true); });
  test('easy · CDW institution is not whole-word CD', () => { expect(isCertificateOfDeposit({ kind: 'brokerage', label: 'Brokerage', institution: 'CDW Financial' })).toBe(false); });
  test('complex · Certificate phrase in account name', () => { expect(isCertificateOfDeposit({ kind: 'brokerage', label: 'Certificate of Deposit 2028', institution: 'Bank' })).toBe(true); });
  // SETTLED 2026-10-10 by DEC-4036c: "CD" is read only from an account's own name or type, never its institution — a
  // brokerage account at "CD Capital" is not a CD
  test('complex · Institution name alone triggers CD according to formula', () => {
    expect(isCertificateOfDeposit({ kind: 'brokerage', label: 'Investment account', institution: 'CD Capital' })).toBe(false);
  });
  test('edge · Lowercase whole word CD', () => { expect(isCertificateOfDeposit({ kind: 'brokerage', label: 'bank cd ladder', institution: 'Bank' })).toBe(true); });
});

describe('MK-NW-F-072 rowOf — five cases', () => {
  // BRIEF WRONG: ytm 0.055 — right is 0.0672268 (the app's solved yield) because 0.055 was handed in as an input, not worked out:
  // under DEC-3390 the full price is $980 + $38.49 accrued (1,000 × 5% × 281/365 since the 2026-01-01 coupon) = $1,018.49,
  // and at 5.5% the bond prices at $1,032.46, so the yield must be higher; at 6.72% it prices at $1,018.49. Every other field matches.
  test.failing('easy · Basic bond row', () => {
    const r = rowOf(bondAcct({ institution: 'Vanguard', label: 'Treasury', face: 1000, rate: 0.05, value: 980, maturity: '2028-01-01' }), TODAY);
    expect({ heading: r.institution, face: r.face, rate: r.couponRate, yearly_interest: r.couponPerYear, value: r.value })
      .toEqual({ heading: 'Vanguard', face: 1000, rate: 0.05, yearly_interest: 50, value: 980 });
    expect(r.currentYield!).toBeCloseTo(0.05102040816326531, 12);
    expect(r.yieldToMaturity!).toBeCloseTo(0.055, 4);
  });
  test('easy · Missing rate remains blank', () => {
    const r = rowOf(bondAcct({ institution: '', label: 'Bond account', face: 1000, rate: null, value: 980, maturity: '2030-01-01' }), TODAY);
    expect(r.institution).toBe('Bond account'); refuses(r.couponRate); refuses(r.couponPerYear);
  });
  test('complex · Value excludes accrued interest but YTM includes it', () => {
    const r = rowOf(bondAcct({ institution: ' Fidelity ', label: 'Bond', face: 10000, rate: 0.045, value: 9850, accrued: 112.5, maturity: '2031-10-09' }), TODAY);
    expect({ heading: r.institution, value: r.value }).toEqual({ heading: 'Fidelity', value: 9850 });
    expect(priceAtYield(bond(10000, 0.045, '2031-10-09', 9850, 112.5), r.yieldToMaturity!, TODAY)!).toBeCloseTo(9962.5, 6);
    refuses(r.accruedCaveat);   // none: actual accrued interest entered
  });
  test('complex · Matured bond has no YTM or sensitivity', () => {
    const accounts = [bondAcct({ id: 'old', institution: 'Bank', label: 'Old bond', maturity: '2026-10-09', value: 1000, face: 1000, rate: 0.05 })];
    const one = theBonds({ accounts, accountId: 'old', today: D('2026-10-09') }).one!;
    expect({ matured: one.matured, years_left: one.yearsLeft }).toEqual({ matured: true, years_left: 0 });
    refuses(one.yieldToMaturity); refuses(one.ratesMove);
    refuses(rowOf(accounts[0], D('2026-10-09')).yieldToMaturity);
  });
  test('edge · No maturity is unknown, not matured', () => {
    const accounts = [bondAcct({ id: 'u', institution: '', label: 'Undated bond', maturity: null, face: 1000, rate: 0.05, value: 1000 })];
    const one = theBonds({ accounts, accountId: 'u', today: TODAY }).one!;
    expect(one.matured).toBe(false);
    expect(one.maturity).toBe('');            // "not entered": no date carried
    refuses(one.yieldToMaturity); refuses(one.yearsLeft);
  });
});

describe('MK-NW-F-073 itemising — five cases', () => {
  const items = (vals: any[]) => vals.map((v, i) => ({ label: `h${i}`, cls: 'stocks_etf' as const, value: v }));
  test('easy · Exact itemization', () => {
    expect(itemising(1000, items([600, 400]))).toEqual({ keepTotalAt: 1000, itemised: 1000, remainder: 0, remainderFinal: true });
  });
  test('easy · Missing value makes remainder not final', () => {
    expect(itemising(1000, items([400, null]))).toEqual({ keepTotalAt: 1000, itemised: 400, remainder: 600, remainderFinal: false });
  });
  test('complex · Over-itemized account shows negative remainder', () => {
    expect(itemising(9876.54, items([7654.32, 3000]))).toEqual({ keepTotalAt: 9876.54, itemised: 10654.32, remainder: -777.78, remainderFinal: true });
  });
  test('complex · Several missing values counted separately', () => {
    const it = items([5000, null, 'n/a']);
    const r = itemising(20000, it);
    expect({ itemized: r.itemised, remainder: r.remainder, remainder_final: r.remainderFinal, missing_count: itemizeMissingCount(it) })
      .toEqual({ itemized: 5000, remainder: 15000, remainder_final: false, missing_count: 2 });
  });
  test('edge · No holdings listed', () => {
    const r = itemising(4000, []);
    expect({ itemized: r.itemised, remainder: r.remainder, remainder_final: r.remainderFinal }).toEqual({ itemized: 0, remainder: 4000, remainder_final: true });
  });
});

describe('MK-NW-F-084 categoryEarnings — five cases', () => {
  test('easy · No earnings on day one', () => {
    const c = categoryEarnings({ transactions: [], windowStart: '2026-10-09', rows: [], dayOne: true });
    expect(Object.fromEntries(c.map((x) => [x.key, { earnings: x.earned, return: x.ret }]))).toEqual({
      cash: { earnings: 0, return: null }, stocks_etf: { earnings: 0, return: null }, bonds: { earnings: 0, return: null } });
  });
  test('easy · Tickerless dividend goes to stocks', () => {
    const c = categoryEarnings({ transactions: [{ date: '2026-10-01', type: 'DIVIDEND', amount: 25, ticker: null }], windowStart: '2026-10-01', rows: [] });
    expect(c.find((x) => x.label === 'Stocks / Funds')!.earned).toBe(25);
  });
  // FINDING: app gives 0.10909090909090909, expected 0.1 — the category return is weighted by TODAY's value (performance.ts:621-626:
  // (12,000 × 20% + 10,000 × 0%) ÷ 22,000). With no money moved, the class grew $20,000 → $22,000 = 10%. DEC-1669 (every
  // return time-weighted) and DEC-3035b (the same fix made to the retirement return: weigh by what was there when the
  // period began, Σ now ÷ Σ start − 1) both say 10%. Weighing by beginning value = marketValue ÷ (1 + periodReturn).
  // FIXED 2026-10-09 after OpenAI's final audit (was test.failing)
  test('complex · Current-value weighting differs from beginning-value TWR', () => {
    const c = categoryEarnings({ transactions: [{ date: '2025-10-02', type: 'DIVIDEND', amount: 1, ticker: 'S1' }], windowStart: '2025-10-01',
      rows: [row('stock_etf', 12000, 0.2, 'S1'), row('stock_etf', 10000, 0, 'S2')] });
    expect(c.find((x) => x.key === 'stocks_etf')!.ret!).toBeCloseTo(0.1, 12);
  });
  test('complex · Interest record without ticker goes to cash', () => {
    const c = categoryEarnings({ transactions: [{ date: '2026-09-15', type: 'INTEREST', amount: 18.75, ticker: null }], windowStart: '2026-09-01', rows: [] });
    expect(c.find((x) => x.key === 'cash')!.earned).toBe(18.75);
  });
  test('edge · Return refuses when no holding can be priced', () => {
    const c = categoryEarnings({ transactions: [{ date: '2026-06-01', type: 'DIVIDEND', amount: 5, ticker: 'XYZ' }], windowStart: '2026-01-01',
      rows: [{ position: { ticker: 'XYZ' }, marketValue: undefined, periodReturn: null }] });
    expect(c.length).toBe(1);
    refuses(c[0].ret);
  });
});

describe('MK-NW-F-090 windowStartKey — five cases', () => {
  test('easy · This year starts Jan 1', () => { expect(windowStartKey('YTD', [], '2026-10-09')).toBe('2026-01-01'); });
  test('easy · Since starts day after first record', () => { expect(windowStartKey('SINCE', ['2026-04-30'], '2026-10-09')).toBe('2026-05-01'); });
  // SETTLED 2026-10-10 by his approval DEC-3768b: months back stop at the month's last day — Mar 31 less one month is
  // Feb 28. FIXED: the app gave 2026-03-03 (a 28-day window).
  test('complex · One month back from month-end', () => {
    expect(windowStartKey('1M', [], '2026-03-31')).toBe('2026-02-28');
    expect(windowStartKey('1M', [], '2024-03-31')).toBe('2024-02-29');   // a leap year keeps its 29th
    expect(windowStartKey('1Y', [], '2024-02-29')).toBe('2023-02-28');
    expect(windowStartKey('3M', [], '2026-05-31')).toBe('2026-02-28');
    expect(windowStartKey('1M', [], '2026-10-09')).toBe('2026-09-09');   // an ordinary day is unchanged
  });
  test('complex · Since with no records starts today', () => { expect(windowStartKey('SINCE', [], '2026-10-09')).toBe('2026-10-09'); });
  // SETTLED 2026-10-12 by DEC-4640 ("1, 2 - approved"): a window name the app does not have gives no start — no figure,
  // never a guessed one. OpenAI's '2025-10-09' recorded the old twelve-months-back guess; the answer is now nothing.
  test('edge · Unknown label defaults to 12 months back', () => { expect(windowStartKey('Lifetime', [], '2026-10-09')).toBeNull(); });
});

describe('MK-NW-F-091 pricedGainOf — five cases', () => {
  test('easy · Bought inside period gain', () => { expect(pricedGainOf([{ cappedSince: '2026-01-01', gain: 950 - 800, marketValue: 950 }])).toBe(150); });
  test('easy · Existing holding with 10% return', () => { expect(pricedGainOf([{ marketValue: 1100, periodReturn: 0.1 }])).toBeCloseTo(100, 10); });
  test('complex · Multiple holdings and negative return', () => {
    const a = { cappedSince: '2026-01-01', gain: 1250 - 1000, marketValue: 1250 }, b = { marketValue: 9500, periodReturn: -0.05 };
    expect([pricedGainOf([a]), pricedGainOf([b])].map((x) => +x!.toFixed(9))).toEqual([250, +(-499.99999999999943).toFixed(9)]);
    expect(pricedGainOf([a, b])).toBeCloseTo(-249.99999999999943, 9);
  });
  test('complex · Holding bought before period uses reverse return', () => { expect(pricedGainOf([{ marketValue: 12345.67, periodReturn: 0.0825 }])).toBeCloseTo(940.8940184757511, 9); });
  // FINDING: app gave 0, expected REFUSES — a holding with no period return added $0 to the gain, so a
  // one-holding gain read as "$0 gained" rather than unknown (tenet 3: unknown is not zero).
  // FIXED 2026-10-09 by DEC-3656: a holding held (value > 0) with no price history and no stated rate has an
  // unknown gain — pricedGainOf answers null, and the walk that would be worked back from it is not drawn.
  test('edge · Missing return refuses gain', () => { refuses(pricedGainOf([{ marketValue: 1000, periodReturn: null }])); });
});

describe('MK-NW-F-092 investmentAccountIdsOf — five cases', () => {
  const ids = (accounts: any[]) => [...investmentAccountIdsOf(accounts, assetClassOf)].sort();
  test('easy · Stocks account included', () => { expect(ids([acct({ id: 'A', asset_class: 'stocks_etf' })])).toEqual(['A']); });
  test('easy · Cash account excluded', () => { expect(ids([acct({ id: 'C', asset_class: 'cash' })])).toEqual([]); });
  test('complex · Mixed and unclassified accounts included once', () => {
    // DEC-0338: Unclassified counts as an investment
    expect(ids([linked({ id: 'A', balance: 150 }, 0, [pos('VTI', 1, 100), pos('BND', 1, 50, 'bond')]), acct({ id: 'B', asset_class: 'mixed' }), acct({ id: 'C', kind: 'home', balance: 300000 })]))
      .toEqual(['A', 'B']);
  });
  test('complex · Cash plus investment split includes mixed account', () => {
    expect(ids([linked({ id: 'A', balance: 5500 }, 500, [pos('VTI', 50, 100)])])).toEqual(['A']);
  });
  test('edge · Empty list returns no IDs', () => { expect(ids([])).toEqual([]); });
});

describe('MK-NW-F-094 ledgerGroups — five cases', () => {
  test('easy · Single class row total', () => {
    const g = groups([acct({ id: 'Checking', label: 'Checking', institution: 'Bank', kind: 'checking', asset_class: 'cash', balance: 1000 })], 'class');
    expect(g.map((x) => ({ class: x.label, rows: x.rows.map((r) => ({ name: r.accountId, value: r.amount })), total: x.total })))
      .toEqual([{ class: 'Cash', rows: [{ name: 'Checking', value: 1000 }], total: 1000 }]);
  });
  test('easy · Institution names trimmed and case-insensitive', () => {
    const g = groups([acct({ id: '1', institution: ' Chase ', kind: 'checking', balance: 100 }), acct({ id: '2', institution: 'chase', kind: 'checking', balance: 200 })], 'institution');
    expect(g.map((x) => ({ institution: x.label, total: x.total }))).toEqual([{ institution: 'Chase', total: 300 }]);
  });
  test('complex · Split account appears under every class at its portion', () => {
    const accounts = [linked({ id: 'Vanguard -0008', institution: 'Vanguard', balance: 79000 }, 0, [pos('VTI', 450, 100), pos('BND', 340, 100, 'bond')]),
      acct({ id: 'Chase -0333', institution: 'Chase', kind: 'checking', asset_class: 'cash', balance: 20000 })];
    const g = groups(accounts, 'class');
    // the case lists the headings Stocks, Bonds, Cash; the function gives no heading order (the screen sorts) — compared by heading
    const byHead = Object.fromEntries(g.map((x) => [x.label, { total: x.total, rows: x.rows.map((r) => ({ name: r.accountId, value: r.amount })) }]));
    expect(byHead).toEqual({
      'Stocks / Funds': { total: 45000, rows: [{ name: 'Vanguard -0008', value: 45000 }] },
      'Bonds & CDs': { total: 34000, rows: [{ name: 'Vanguard -0008', value: 34000 }] },
      Cash: { total: 20000, rows: [{ name: 'Chase -0333', value: 20000 }] } });
    expect(g.reduce((t, x) => t + x.total, 0)).toBe(99000);   // grand_total
  });
  test('complex · Institution group class subtotals sum', () => {
    const accounts = [linked({ id: '1', institution: 'Bank A', balance: 10000 }, 1000, [pos('VTI', 90, 100)]),
      acct({ id: '2', institution: 'bank a', kind: 'cd', balance: 5000 })];
    const g = groups(accounts, 'institution');
    expect(g.map((x) => ({ institution: x.label, total: x.total, class_totals: x.mix }))).toEqual([{ institution: 'Bank A', total: 15000,
      class_totals: [{ key: 'stocks_etf', total: 9000 }, { key: 'bonds', total: 5000 }, { key: 'cash', total: 1000 }] }]);   // largest first
  });
  test('edge · Missing balance appears as missing, not zero', () => {
    const accounts = [acct({ id: 'L', label: 'Linked account', source: 'connected', asset_class: 'stocks_etf', balance: undefined })];
    // known_total 0: the account adds nothing — it is in NO group at all, because its split is all zeros and zero parts are
    // dropped (net-worth.ts:445-447); it is named only in the amber box
    expect(groups(accounts, 'class').reduce((t, x) => t + x.total, 0)).toBe(0);
    // the warning naming it: the amber box (dataGaps, DEC-3279e) — "Linked account has no balance"
    expect(dataGaps(accounts, null, TODAY.getTime()).filter((x) => x.kind === 'no-balance').map((x) => x.title)).toEqual(['Linked account has no balance']);
  });
});

describe('MK-NW-F-103 investmentRecordDates — five cases', () => {
  test('easy · Dates sorted oldest first', () => {
    expect(investmentRecordDates([day('2026-04-02', { A: 1 }), day('2026-01-03', { A: 1 })], new Set(['A']))).toEqual(['2026-01-03', '2026-04-02']);
  });
  test('easy · No accounts gives empty list', () => { expect(investmentRecordDates([day('2026-01-01', { A: 1 })], new Set())).toEqual([]); });
  test('complex · Date included when one of multiple accounts valued', () => {
    expect(investmentRecordDates([day('2026-01-01', { A: 100 }), day('2026-01-02', { B: 200 }), day('2026-01-03', {})], new Set(['A', 'B'])))
      .toEqual(['2026-01-01', '2026-01-02']);
  });
  test('complex · Ignore unrelated account records', () => {
    expect(investmentRecordDates([day('2026-01-01', { B: 100 }), day('2026-01-02', { A: 200, B: 300 })], new Set(['A']))).toEqual(['2026-01-02']);
  });
  test('edge · No recorded values', () => { expect(investmentRecordDates([], new Set(['A']))).toEqual([]); });
});

describe('MK-NW-F-104 closedWith — five cases', () => {
  test('easy · Append today using ending value', () => {
    expect(plain(closedWith([day('2026-10-08', { A: 1000 })], new Set(['A']), '2026-10-09', 1100)))
      .toEqual([{ date: '2026-10-08', values: { A: 1000 } }, { date: '2026-10-09', values: { A: 1100 } }]);
  });
  test('easy · No prior day leaves record unchanged', () => { expect(closedWith([], new Set(['A']), '2026-10-09', 1000)).toEqual([]); });
  // BLOCKED: closedWith takes ONE ending total (performance.ts:286); the case's two per-account endings ($12,000 / $8,000)
  // cannot be handed in. Run with their sum, $20,000, the app writes the whole $20,000 on A and $0 on B (performance.ts:290)
  // — the total, which is all the return reads, is right.
  test.skip('complex · Several named accounts carry ending values', () => { /* one ending total only */ });
  // UNCLEAR: app returns the record unchanged and the caller's $1,000 is not added (performance.ts:289) — as the card says;
  // no decision. Open question (the auditor's): confirm, and that the return then refuses (END_NOT_RECORDED).
  test('complex · Latest record has none of named accounts', () => {
    const rec = [day('2026-10-08', { C: 500 })];
    expect(closedWith(rec, new Set(['A']), '2026-10-09', 1000)).toBe(rec);
  });
  // UNCLEAR: app leaves the record unchanged — closedWith finds no EARLIER day (performance.ts:287-288), and its caller never
  // calls it when today is already recorded (performance.ts:409); the recorded $1,000 stands and the caller's $1,100 is
  // ignored. No duplicate row. No decision; open question: should a newer ending value replace today's recorded one?
  test('edge · Today already exists', () => {
    const rec = [day('2026-10-09', { A: 1000 })];
    expect(plain(closedWith(rec, new Set(['A']), '2026-10-09', 1100))).toEqual([{ date: '2026-10-09', values: { A: 1000 } }]);
  });
});
