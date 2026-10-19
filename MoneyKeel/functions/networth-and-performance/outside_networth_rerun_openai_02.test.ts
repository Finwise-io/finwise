/* THE OUTSIDE CASES, RUN AGAINST THE APP — Net worth module re-run (brief v02), OpenAI, part 2: cards MK-NW-F-031 to
 * 041 and 044 to 062.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_nw_part2_audit_and_claude_brief.json
 * (150 cases, five per card, nested under "cards") and its run brief moneykeel_nw_part2_claude_code_brief.md. Every
 * expected answer is OpenAI's, as it wrote it; only its input names are mapped onto the app's fields. A case the app
 * fails is a finding — never fixed by changing the answer here.
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing until fixed) · `// BRIEF WRONG:` OpenAI's
 * own expectation is wrong (test.failing, its answer kept, plus a test pinning the app's hand-checked answer) ·
 * `// CARD MISREAD:` the case tests something the card does not describe · `// BLOCKED:` the case cannot be run as
 * written · `// CONDITIONAL:` OpenAI left the answer to be settled from the source; the reading taken is said.
 *
 * TOLERANCE: money to 1e-6 dollars (toBeCloseTo 6), rates to 1e-9 or better — floating-point sums only. Itemizing
 * (MK-NW-F-049 to 052) is checked EXACTLY (toBe): the card promises exact decimals.
 * FIXED DATES: every date-reading case passes its own `now`; MK-NW-F-041 reads the clock for the age, so the clock is
 * held at 2026-10-13 noon for that card.
 *
 * INPUT NAMES MAPPED (OpenAI's names → the app's fields):
 *   Kind words → kind ids: "stocks_funds" 'stocks_etf', "ira" 'trad_ira', "529" 'college_529', "other" 'other_asset',
 *   "gold" 'commodities', "cash_management" 'cash_mgmt', "treasury" 'fixed_income' (the app has no treasury kind),
 *   "valuables" class personal_property / kind other_asset. Kinds "A", "B", "mystery_kind", "Checking", "unknown" are
 *   passed as written. A property kind (home, vehicle) carries tax bucket PROPERTY, as the app's kind list gives it.
 *   Tax words: "taxable" TAXABLE, "pre_tax" PRE_TAX, "roth" ROTH; "not_stated"/null = no tax bucket (undefined).
 *   "confirmed" → wrapper_confirmed. A class the person chose ("explicit chosen class", "asset_class_chosen") →
 *   class_source 'user'. A holding "tag" → the position's stored asset_class.
 *   An expected null where the app's type says undefined (no car, no kind, no tax type, no face value) is the same
 *   answer — "nothing" — and is compared as such.
 *   benchmarkInfo "benchmarkRecord": the function takes no record — it reads the app's own table BENCHMARK_META — so a
 *   record OpenAI supplies cannot be fed in; where its text differs from the table it is said below.
 *   Onboarding answers: traditionalRetirementSavings → currentRetirementSavings · rothRetirementSavings →
 *   currentRetirementSavingsRoth · investmentHoldings as is · savingsOrPortfolio → currentSavingsPortfolio ·
 *   needs_classification_question → class_question 'cash_or_investments'. Contributions: traditional401kMonthly →
 *   c_401k · rothContributionMonthly → c_roth · investingMonthly → c_invest · propertySavingsMonthly → c_property ·
 *   employerMatchPct N → employerMatchMode 'pct', employerMatchValue N · employerMatchDollarsMonthly N →
 *   employerMatchMode 'dollar', employerMatchValue N.
 *   getAssetsState: REMOVED 2026-10-14 with the function (inputs-and-use audit, Net worth) — see its note below.
 *   historyCoverage: history_start → history_start_override (the person's date, DEC-4059c); synced_history_start →
 *   history_from. THE SENTENCE IS COMPARED ON ITS CONTENT where the card gives only its content ("a sentence saying it
 *   has no activity records"; the span and the start date); OpenAI itself marks its wording "schematic". The refusal is
 *   compared exactly, because the card quotes it.
 *   uberGroupOf / uberGroupRows: group names → the app's ids ("Cash" 'cash', "Investments" 'investments',
 *   "Personal property" 'property'). Class keys as written.
 *   Itemizing: items {cls,label,ticker,value,couponRate,maturityDate} are the app's ItemHolding as is; lump fields as is.
 *   Bonds: a "bond" object is the app's BondInfo as is (face, couponRate, maturity, value, accruedInterest, isCd,
 *   cdBought); a missing maturity is ''. Accounts for couponIncomeAnnual are AssetAccounts as written.
 *   yearsToMaturity / sourceWording "now": a local time for the first, milliseconds for the second.
 *
 * IN FLIGHT ELSEWHERE (another agent, same day): primaryHomeIdOf / propertyUseMap (src/domain/assets/index.ts),
 * nameEvidence (Calculation Module code/engines/holding-class.ts) and benchmarkInfo's blank period. Cases touching
 * them are tested against the INTENDED rule and say so; this file was run on the working tree with those edits in it
 * (not yet committed). The blank-period cases of MK-NW-F-036 fail at HEAD ('—') and pass on that edit.
 */
import {
  primaryCarIdOf, earmarkedAmount, retirementEarmarkedValue, benchmarkReturn, blendedVolatility, benchmarkInfo,
  blendedReturn, buildAssetsState, assetsFromOnboarding, monthlyContributionsFromOnboarding,
  sourceWording, historyCoverage, uberGroupOf, uberGroupRows, assetClassOf,
  HISTORY_START_UNREADABLE, EDIT_HISTORY_START, KIND_VOLATILITY,
} from '../../../src/domain/assets';
import { itemizedTotal, itemizeRemainder, itemizedResultTotal, buildItemizedAccounts, itemizeMissingCount } from '../../../src/domain/assets/itemize';
import { correctClassOf, reclassifyAccounts } from '../../../src/domain/assets/reclassify';
import {
  isBond, bondInfo, annualCoupon, yearsToMaturity, currentYield, approxYTM, bondSummary, couponIncomeAnnual,
} from '../../../src/domain/bonds';

let n = 0;
const PROPERTY_KINDS = ['home', 'vehicle'];
const A = (o: Record<string, any>) => ({
  asset_id: `a${++n}`, label: 'Account', target_return: 0.06,
  ...(PROPERTY_KINDS.includes(o.kind) ? { tax_bucket: 'PROPERTY' } : {}), ...o,
}) as any;
const local = (s: string) => {   // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SS' → that local time
  const [d, t = '00:00:00'] = s.split('T');
  const [y, mo, dd] = d.split('-').map(Number); const [h, mi, se] = t.split(':').map(Number);
  return new Date(y, mo - 1, dd, h, mi, se || 0);
};
const ms = (iso: string) => Date.parse(iso);
const nothing = (v: unknown) => v ?? null;

describe('MK-NW-F-031 primaryCarIdOf — five cases', () => {
  test('easy · One vehicle among unrelated assets', () => {
    expect(primaryCarIdOf([A({ asset_id: 'car1', kind: 'vehicle', balance: 12000 }), A({ asset_id: 'home', kind: 'home', balance: 300000 })])).toBe('car1');
  });
  test('easy · Highest valued vehicle wins', () => {
    expect(primaryCarIdOf([A({ asset_id: 'car1', kind: 'vehicle', balance: 9000 }), A({ asset_id: 'car2', kind: 'vehicle', balance: 14000 })])).toBe('car2');
  });
  test('complex · Missing value must not outrank entered value', () => {
    expect(primaryCarIdOf([A({ asset_id: 'carA', kind: 'vehicle', balance: null }), A({ asset_id: 'carB', kind: 'vehicle', balance: 8000 })])).toBe('carB');
  });
  test('complex · Tie uses id as text, not numeric ordering', () => {
    expect(primaryCarIdOf([A({ asset_id: '10', kind: 'vehicle', balance: 5000 }), A({ asset_id: '2', kind: 'vehicle', balance: 5000 })])).toBe('10');
  });
  test('edge · No vehicle returns undefined', () => {
    expect(nothing(primaryCarIdOf([A({ asset_id: 'ring', asset_class: 'personal_property', kind: 'other_asset', tax_bucket: 'PROPERTY', balance: 1000 })]))).toBeNull();
  });
});

describe('MK-NW-F-032 earmarkedAmount — five cases', () => {
  test('easy · Explicit half earmarked', () => { expect(earmarkedAmount(A({ balance: 10000, retirement_pct: 50, kind: 'brokerage' }), undefined, null)).toBe(5000); });
  test('easy · Explicit zero is not absent', () => { expect(earmarkedAmount(A({ balance: 12000, retirement_pct: 0, kind: 'brokerage' }), undefined, null)).toBe(0); });
  test('complex · Full earmark', () => { expect(earmarkedAmount(A({ balance: 2500, retirement_pct: 100, kind: 'savings' }), undefined, null)).toBe(2500); });
  test('complex · Default for driven car', () => {
    expect(earmarkedAmount(A({ asset_id: 'car1', balance: 20000, kind: 'vehicle', retirement_pct: null }), 'car1', null)).toBe(0);
  });
  test('edge · Default for primary home vs rental needs explicit context', () => {
    // CONDITIONAL resolved: told the home's id, only that property is 0% (earmarkDefault, DEC-0100)
    expect(earmarkedAmount(A({ asset_id: 'home1', balance: 300000, kind: 'home', retirement_pct: null }), undefined, 'home1')).toBe(0);
  });
});

describe('MK-NW-F-033 retirementEarmarkedValue — five cases', () => {
  test('easy · Sum two explicit earmarks', () => {
    expect(retirementEarmarkedValue([A({ asset_id: 'a', kind: 'brokerage', balance: 10000, retirement_pct: 50 }), A({ asset_id: 'b', kind: 'trad_ira', balance: 5000, retirement_pct: 100 })])).toBe(10000);
  });
  test('easy · Zero earmarks yield zero', () => { expect(retirementEarmarkedValue([A({ asset_id: 'a', kind: 'college_529', balance: 4000, retirement_pct: 0 })])).toBe(0); });
  test('complex · Primary car excluded by default, other car retained', () => {
    expect(retirementEarmarkedValue([A({ asset_id: 'carA', kind: 'vehicle', balance: 20000, retirement_pct: null }), A({ asset_id: 'carB', kind: 'vehicle', balance: 8000, retirement_pct: null })])).toBe(8000);
  });
  test('complex · Mix explicit percentage and default', () => {
    // touches primaryHomeIdOf (in flight elsewhere) — intended rule: one property, no use stated, is the home (DEC-2747e, DEC-0100)
    expect(retirementEarmarkedValue([A({ asset_id: 'a', kind: 'brokerage', balance: 10000, retirement_pct: 25 }), A({ asset_id: 'home', kind: 'home', balance: 250000, retirement_pct: null })])).toBe(2500);
  });
  test('edge · Empty accounts', () => { expect(retirementEarmarkedValue([])).toBe(0); });
});

describe('MK-NW-F-034 benchmarkReturn — five cases', () => {
  test('easy · Known default stocks and funds', () => { expect(benchmarkReturn('stocks_etf', {})).toBe(0.104); });
  test('easy · Override is used', () => { expect(benchmarkReturn('checking', { checking: 0.03 })).toBe(0.03); });
  test('complex · Zero override counts as set', () => { expect(benchmarkReturn('checking', { checking: 0 })).toBe(0); });
  test('complex · Unknown kind uses 6%', () => { expect(benchmarkReturn('mystery_kind', {})).toBe(0.06); });
  test('edge · Case-sensitive key mismatch falls back', () => { expect(benchmarkReturn('Checking', { checking: 0.03 })).toBe(0.06); });
});

describe('MK-NW-F-035 blendedVolatility — five cases', () => {
  test('easy · One account weighted fully', () => {
    // CONDITIONAL resolved: OpenAI's 12% was "conditional on no stored default for stocks_funds" and told the runner to
    // substitute the app's figure. The app holds one: KIND_VOLATILITY.stocks_etf = 18% (S&P 500 annual std dev, 30-yr).
    expect(KIND_VOLATILITY.stocks_etf).toBe(0.18);
    expect(blendedVolatility([A({ kind: 'stocks_etf', balance: 10000, retirement_pct: 100 })], {})!).toBeCloseTo(0.18, 12);
  });
  test('easy · Two equal weights with 10% and 20%', () => {
    expect(blendedVolatility([A({ kind: 'A', balance: 100, retirement_pct: 100 }), A({ kind: 'B', balance: 100, retirement_pct: 100 })], { A: 0.1, B: 0.2 })!).toBeCloseTo(0.15, 12);
  });
  test('complex · Unequal weights', () => {
    expect(blendedVolatility([A({ kind: 'A', balance: 300, retirement_pct: 100 }), A({ kind: 'B', balance: 100, retirement_pct: 100 })], { A: 0.1, B: 0.2 })!).toBeCloseTo(0.125, 12);
  });
  test('complex · Zero earmarked account must not affect blend', () => {
    expect(blendedVolatility([A({ kind: 'A', balance: 100, retirement_pct: 100 }), A({ kind: 'B', balance: 900, retirement_pct: 0 })], { A: 0.08, B: 0.5 })!).toBeCloseTo(0.08, 12);
  });
  test('edge · No earmarked amount returns null', () => {
    expect(blendedVolatility([A({ kind: 'A', balance: 100, retirement_pct: 0 })], { A: 0.1 })).toBeNull();
  });
});

describe('MK-NW-F-036 benchmarkInfo — five cases', () => {
  // The blank period: the app returned '—' at HEAD; another agent's same-day edit (uncommitted when this ran) makes it
  // '' as the card says. These three cases pass on that edit and would fail at HEAD — they hold it in place.
  test('easy · Custom positive override', () => {
    expect(benchmarkInfo('checking', { checking: 0.02 })).toEqual({ ret: 0.02, source: 'Your custom estimate', period: '', edited: true, estimate: true });
  });
  test('easy · Custom zero override', () => {
    expect(benchmarkInfo('checking', { checking: 0 })).toEqual({ ret: 0, source: 'Your custom estimate', period: '', edited: true, estimate: true });
  });
  // BRIEF WRONG: source "S&P broad-market index", period "2015–2025" — the function takes no record; it reads the app's
  // own table, which says "S&P 500 total return" over "30-yr". OpenAI supplied a record that does not exist. Rate 10.4%,
  // edited false and estimate false agree.
  test.failing('complex · Recorded measured benchmark', () => {
    expect(benchmarkInfo('stocks_etf', {})).toEqual({ ret: 0.104, source: 'S&P broad-market index', period: '2015–2025', edited: false, estimate: false });
  });
  test('complex · Recorded measured benchmark — the app\'s answer, hand-checked', () => {
    expect(benchmarkInfo('stocks_etf', {})).toEqual({ ret: 0.104, source: 'S&P 500 total return', period: '30-yr', edited: false, estimate: false });
  });
  // BRIEF WRONG: source "Generic estimate" — the app's record for Other reads "Generic blended estimate" (an invented
  // record again). Rate 5%, period blank, edited false, estimate true agree.
  test.failing('complex · Recorded assumption', () => {
    expect(benchmarkInfo('other_asset', {})).toEqual({ ret: 0.05, source: 'Generic estimate', period: '', edited: false, estimate: true });
  });
  test('complex · Recorded assumption — the app\'s answer, hand-checked', () => {
    expect(benchmarkInfo('other_asset', {})).toEqual({ ret: 0.05, source: 'Generic blended estimate', period: '', edited: false, estimate: true });
  });
  test('edge · No record and unknown kind', () => {
    expect(benchmarkInfo('unknown', {})).toEqual({ ret: 0.06, source: 'Generic blended estimate', period: '', edited: false, estimate: true });
  });
});

describe('MK-NW-F-037 blendedReturn — five cases', () => {
  test('easy · One fully earmarked account', () => { expect(blendedReturn([A({ kind: 'checking', balance: 1000, retirement_pct: 100 })], {})!).toBeCloseTo(0.005, 12); });
  test('easy · Equal weights blend 10% and 4%', () => {
    expect(blendedReturn([A({ kind: 'A', balance: 100, retirement_pct: 100 }), A({ kind: 'B', balance: 100, retirement_pct: 100 })], { A: 0.1, B: 0.04 })!).toBeCloseTo(0.07, 12);
  });
  test('complex · Unequal weighted rates', () => {
    expect(blendedReturn([A({ kind: 'A', balance: 300, retirement_pct: 100 }), A({ kind: 'B', balance: 100, retirement_pct: 100 })], { A: 0.1, B: 0.04 })!).toBeCloseTo(0.085, 12);
  });
  test('complex · Home/529 default exclusions', () => {
    expect(blendedReturn([A({ kind: 'home', balance: 300000, retirement_pct: 0 }), A({ kind: 'college_529', balance: 50000, retirement_pct: 0 }), A({ kind: 'checking', balance: 10000, retirement_pct: 100 })], {})!).toBeCloseTo(0.005, 12);
  });
  test('edge · No positive earmark returns null', () => { expect(blendedReturn([A({ kind: 'home', balance: 300000, retirement_pct: 0 })], {})).toBeNull(); });
});

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-038 earmarkedKinds left the code —
// nothing in the app, the doors or the engines called it; nothing showed what it returned. The block "MK-NW-F-038 earmarkedKinds — five cases"
// (5 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

describe('MK-NW-F-039 buildAssetsState — five cases', () => {
  const S = (accounts: any[]) => {
    const s = buildAssetsState('u1' as any, accounts);
    return { total: s.total_asset_value, pct: Object.fromEntries(s.accounts.map((a) => [a.asset_id, a.portfolio_percentage])), avg: s.average_target_return };
  };
  test('easy · Two positive balances', () => {
    const s = S([A({ asset_id: 'a', balance: 100, target_return: 0.05 }), A({ asset_id: 'b', balance: 300, target_return: 0.1 })]);
    expect([s.total, s.pct]).toEqual([400, { a: 25, b: 75 }]); expect(s.avg!).toBeCloseTo(0.0875, 12);
  });
  test('easy · Missing balance excluded', () => {
    const s = S([A({ asset_id: 'a', balance: 100, target_return: 0.05 }), A({ asset_id: 'b', balance: null, target_return: 0.2 })]);
    expect([s.total, s.pct]).toEqual([100, { a: 100, b: 0 }]); expect(s.avg!).toBeCloseTo(0.05, 12);
  });
  test('complex · Negative account balance signed share', () => {
    const s = S([A({ asset_id: 'a', balance: 100, target_return: 0.1 }), A({ asset_id: 'b', balance: -20, target_return: 0.05 })]);
    expect(s.total).toBe(80); expect(s.pct.a).toBeCloseTo(125, 9); expect(s.pct.b).toBeCloseTo(-25, 9); expect(s.avg!).toBeCloseTo(0.1125, 12);
  });
  test('complex · Offsetting balances produce zero total', () => {
    expect(S([A({ asset_id: 'a', balance: 100, target_return: 0.1 }), A({ asset_id: 'b', balance: -100, target_return: 0.05 })])).toEqual({ total: 0, pct: { a: 0, b: 0 }, avg: null });
  });
  test('edge · Empty accounts', () => {
    const s = buildAssetsState('u1' as any, []);
    expect({ total_asset_value: s.total_asset_value, accounts: s.accounts, average_target_return: s.average_target_return }).toEqual({ total_asset_value: 0, accounts: [], average_target_return: null });
  });
});

describe('MK-NW-F-040 assetsFromOnboarding — five cases', () => {
  const pick = (a: any) => ({ kind: a.kind, balance: a.balance, tax_bucket: a.tax_bucket, target_return: a.target_return });
  test('easy · Traditional retirement only', () => {
    expect(assetsFromOnboarding('u1' as any, { currentRetirementSavings: 10000 }).accounts.map(pick)).toEqual([{ kind: '401k', balance: 10000, tax_bucket: 'PRE_TAX', target_return: 0.07 }]);
  });
  test('easy · Typed zero is retained', () => {
    expect(assetsFromOnboarding('u1' as any, { currentRetirementSavingsRoth: 0 }).accounts.map(pick)).toEqual([{ kind: 'roth_ira', balance: 0, tax_bucket: 'ROTH', target_return: 0.07 }]);
  });
  test('complex · Skip negative and blank, keep investment holding', () => {
    expect(assetsFromOnboarding('u1' as any, { currentRetirementSavings: -1, currentRetirementSavingsRoth: null, investmentHoldings: 2500 }).accounts.map(pick)).toEqual([{ kind: 'stocks_etf', balance: 2500, tax_bucket: 'TAXABLE', target_return: 0.07 }]);
  });
  test('complex · Savings-or-portfolio remains unclassified', () => {
    const d = assetsFromOnboarding('u1' as any, { currentSavingsPortfolio: 15000 });
    expect(d.accounts.map((a: any) => ({ kind: nothing(a.kind), asset_class: assetClassOf(a), balance: a.balance, tax_bucket: nothing(a.tax_bucket), target_return: a.target_return, needs_classification_question: a.class_question === 'cash_or_investments' })))
      .toEqual([{ kind: null, asset_class: 'mixed', balance: 15000, tax_bucket: null, target_return: 0, needs_classification_question: true }]);
  });
  test('edge · Null onboarding object creates no accounts', () => { expect(assetsFromOnboarding('u1' as any, null).accounts).toEqual([]); });
});

describe('MK-NW-F-041 monthlyContributionsFromOnboarding — five cases (clock held at 2026-10-13)', () => {
  beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 13, 12, 0, 0)); });
  afterAll(() => { jest.useRealTimers(); });
  test('easy · No contribution questions answered', () => { expect(monthlyContributionsFromOnboarding({})).toBeNull(); });
  test('easy · Simple Roth and investing', () => { expect(monthlyContributionsFromOnboarding({ c_roth: 200, c_invest: 100 })).toBe(300); });
  test('complex · 401(k) cap under age 50', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1980, c_401k: 3000, employerMatchMode: 'pct', employerMatchValue: 50 })!).toBeCloseTo(3062.5, 6);
  });
  test('complex · Age 60–63 cap and dollar match', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1964, c_401k: 4000, employerMatchMode: 'dollar', employerMatchValue: 250 })!).toBeCloseTo(3229.1666666666665, 6);
  });
  test('edge · Property savings excluded even if large', () => { expect(monthlyContributionsFromOnboarding({ c_property: 1000 })).toBeNull(); });
});

// REMOVED 2026-10-14 (inputs-and-use audit, 2026-10-11, Net worth: "Nothing calls them … Remove"): MK-NW-F-044 getAssetsState
// left the code with MK-NW-F-042 loadAssets, MK-NW-F-043 saveAssets and MK-NW-F-111 assetsStateFrom — nothing in the app,
// the doors or the engines called them; every screen reads the accounts from the store. Its five cases are no longer run.
// DEC-2748i (a saved record with every account deleted shows the first-day screen) governed this path only; the store path
// has its own first-day state. The numbers are retired in moneykeel_function_register.json, never reused.

describe('MK-NW-F-045 sourceWording — five cases', () => {
  test('easy · Connected synced recently', () => { expect(sourceWording(A({ source: 'connected', last_synced: '2026-10-10T12:00:00Z' }), ms('2026-10-13T12:00:00Z'))).toBe('Linked'); });
  test('easy · Imported account at 4-day threshold', () => { expect(sourceWording(A({ source: 'imported', last_synced: '2026-10-09T12:00:00Z' }), ms('2026-10-13T12:00:00Z'))).toBe('Imported · 4 days old'); });
  test('complex · Connected with no sync timestamp', () => { expect(sourceWording(A({ source: 'connected' }), ms('2026-10-13T12:00:00Z'))).toBe('Linked · not updated yet'); });
  test('complex · Manual account ignores stale timestamp', () => { expect(sourceWording(A({ source: 'manual', last_synced: '2026-01-01T00:00:00Z' }), ms('2026-10-13T12:00:00Z'))).toBe('By hand · you update it'); });
  test('edge · Exactly 4 days with time boundary', () => { expect(sourceWording(A({ source: 'connected', last_synced: '2026-10-09T23:59:59Z' }), ms('2026-10-13T00:00:00Z'))).toBe('Linked'); });
});

describe('MK-NW-F-046 historyCoverage — five cases', () => {
  const H = (o: Record<string, any>) => ({ asset_id: `h${++n}`, ...o }) as any;
  const now = local('2026-10-13');
  test('easy · Manual source always has no activity history', () => {
    const c = historyCoverage(H({ source: 'manual', last_synced: '2026-01-01' }), '2026-01-01', now)!;
    expect([c.kind, c.from, c.monthsCovered]).toEqual(['none', null, null]);
    expect(c.sentence).toContain('has no activity records');
  });
  test('easy · History begins before requested window', () => {
    expect(historyCoverage(H({ source: 'connected', history_start_override: '2025-01-01' }), '2026-01-01', now)).toBeNull();
  });
  test('complex · User-entered date outranks synced date', () => {
    const c = historyCoverage(H({ source: 'connected', history_start_override: '2026-06-01', history_from: '2026-01-01' }), '2026-01-01', now)!;
    expect([c.kind, c.from, c.monthsCovered]).toEqual(['partial', '2026-06-01', 4.3]);   // 4 + 12/31 = 4.387…, down to 4.3
    expect(c.sentence).toContain('4 months of history'); expect(c.sentence).toContain('Jun 1, 2026');
  });
  // BRIEF WRONG: sentence "History start date cannot be read. Edit date" — the card quotes the refusal as 'History start
  // date cannot be read.' and says the SCREEN offers 'Edit date' beside it; it is a link, not part of the sentence.
  // kind, from and months agree.
  test.failing('complex · Invalid date is refused', () => {
    expect(historyCoverage(H({ source: 'connected', history_start_override: '2026-02-30' }), '2026-01-01', now)).toEqual({ kind: 'unreadable', from: null, monthsCovered: null, sentence: 'History start date cannot be read. Edit date' });
  });
  test('complex · Invalid date is refused — the app\'s answer, hand-checked', () => {
    expect(historyCoverage(H({ source: 'connected', history_start_override: '2026-02-30' }), '2026-01-01', now)).toEqual({ kind: 'unreadable', from: null, monthsCovered: null, sentence: 'History start date cannot be read.' });
    expect([HISTORY_START_UNREADABLE, EDIT_HISTORY_START]).toEqual(['History start date cannot be read.', 'Edit date']);
  });
  // BRIEF WRONG: the same — 'Edit date' is the screen's link, not the sentence.
  test.failing('edge · Future date is refused', () => {
    expect(historyCoverage(H({ source: 'connected', history_start_override: '2026-12-01' }), '2026-01-01', now)).toEqual({ kind: 'unreadable', from: null, monthsCovered: null, sentence: 'History start date cannot be read. Edit date' });
  });
  test('edge · Future date is refused — the app\'s answer, hand-checked', () => {
    expect(historyCoverage(H({ source: 'connected', history_start_override: '2026-12-01' }), '2026-01-01', now)).toEqual({ kind: 'unreadable', from: null, monthsCovered: null, sentence: 'History start date cannot be read.' });
  });
});

describe('MK-NW-F-047 uberGroupOf — five cases', () => {
  test('easy · Cash class', () => { expect(uberGroupOf('cash')).toBe('cash'); });
  test('easy · Bond class', () => { expect(uberGroupOf('bonds')).toBe('investments'); });
  test('complex · Alternative class', () => { expect(uberGroupOf('alternatives')).toBe('investments'); });
  test('complex · Real estate class', () => { expect(uberGroupOf('real_estate')).toBe('property'); });
  test('edge · Mixed/unclassified representation', () => { expect(uberGroupOf('mixed')).toBe('investments'); });   // 'mixed' IS Unclassified at runtime
});

describe('MK-NW-F-048 uberGroupRows — five cases', () => {
  const R = (rows: { key: string; label: string; total: number }[]) => uberGroupRows(rows.map((r) => ({ ...r, color: '#000' })) as any)
    .map((g) => ({ group: g.group, total: g.total }));
  test('easy · One class per group', () => {
    expect(R([{ key: 'cash', label: 'Cash', total: 100 }, { key: 'stocks_etf', label: 'Stocks / Funds', total: 200 }, { key: 'real_estate', label: 'Real estate', total: 300 }]))
      .toEqual([{ group: 'cash', total: 100 }, { group: 'investments', total: 200 }, { group: 'property', total: 300 }]);
  });
  test('easy · Empty input', () => { expect(R([])).toEqual([]); });
  test('complex · Multiple investment classes preserve row order', () => {
    const rows = [{ key: 'alternatives', label: 'Alternatives', total: 40 }, { key: 'bonds', label: 'Bonds & CDs', total: 60 }, { key: 'cash', label: 'Cash', total: 10 }];
    expect(R(rows)).toEqual([{ group: 'cash', total: 10 }, { group: 'investments', total: 100 }]);
    expect(uberGroupRows(rows.map((r) => ({ ...r, color: '#000' })) as any)[1].classes.map((c) => c.key)).toEqual(['alternatives', 'bonds']);
  });
  test('complex · Negative row total reconciles', () => {
    expect(R([{ key: 'cash', label: 'Cash', total: 100 }, { key: 'bonds', label: 'Bonds & CDs', total: -20 }])).toEqual([{ group: 'cash', total: 100 }, { group: 'investments', total: -20 }]);
  });
  test('edge · Only personal property rows', () => {
    expect(R([{ key: 'personal_property', label: 'Personal property', total: 0 }])).toEqual([{ group: 'property', total: 0 }]);
  });
});

describe('MK-NW-F-049 itemizedTotal — five cases (exact)', () => {
  const I = (vs: (number | null)[]) => vs.map((value, i) => ({ cls: 'stocks_etf' as const, label: `h${i}`, value }));
  test('easy · Two values', () => { expect(itemizedTotal(I([10.25, 2.5]))).toBe(12.75); });
  test('easy · Missing value omitted', () => { expect(itemizedTotal(I([10, null, 5]))).toBe(15); expect(itemizeMissingCount(I([10, null, 5]))).toBe(1); });
  test('complex · Negative value counts', () => { expect(itemizedTotal(I([100, -20, 5.5]))).toBe(85.5); });
  test('complex · Exact cents do not accumulate binary error', () => { expect(itemizedTotal(I([0.1, 0.2, 0.3]))).toBe(0.6); });
  test('edge · All missing and empty list', () => { expect(itemizedTotal(I([null, null]))).toBe(0); expect(itemizeMissingCount(I([null, null]))).toBe(2); });
});

describe('MK-NW-F-050 itemizeRemainder — five cases (exact)', () => {
  const I = (vs: (number | null)[]) => vs.map((value, i) => ({ cls: 'stocks_etf' as const, label: `h${i}`, value }));
  test('easy · Positive remainder', () => { expect(itemizeRemainder(1000, I([300, 200]))).toBe(500); });
  test('easy · Exact match', () => { expect(itemizeRemainder(100, I([60, 40]))).toBe(0); });
  test('complex · Holdings exceed lump', () => { expect(itemizeRemainder(100, I([80, 40]))).toBe(-20); });
  test('complex · Missing value omitted from itemized total', () => { expect(itemizeRemainder(100, I([40, null]))).toBe(60); });
  test('edge · Cent precision equality', () => { expect(itemizeRemainder(0.3, I([0.1, 0.2]))).toBe(0); });
});

describe('MK-NW-F-051 itemizedResultTotal — five cases (exact)', () => {
  const I = (vs: (number | null)[]) => vs.map((value, i) => ({ cls: 'stocks_etf' as const, label: `h${i}`, value }));
  test('easy · Holdings below lump retain original total', () => { expect(itemizedResultTotal({ balance: 1000 }, I([300, 200]))).toBe(1000); });
  test('easy · Holdings equal lump', () => { expect(itemizedResultTotal({ balance: 100 }, I([60, 40]))).toBe(100); });
  test('complex · Holdings exceed lump', () => { expect(itemizedResultTotal({ balance: 100 }, I([80, 40]))).toBe(120); });
  test('complex · Negative holding value included', () => { expect(itemizedResultTotal({ balance: 100 }, I([120, -10]))).toBe(110); });
  test('edge · One missing value should be provisional / not committable', () => {
    expect(itemizedResultTotal({ balance: 100 }, I([40, null]))).toBe(100);
    expect(() => buildItemizedAccounts(A({ label: 'L', balance: 100 }), I([40, null]))).toThrow();   // and the commit refuses
  });
});

describe('MK-NW-F-052 buildItemizedAccounts — five cases + the brief\'s all-or-nothing checks', () => {
  test('easy · Single stock holding with remainder', () => {
    const out = buildItemizedAccounts({ asset_id: 'L', label: 'Fidelity', institution: 'Fidelity', balance: 1000, tax_bucket: 'TAXABLE', retirement_pct: 50, source: 'manual', kind: 'brokerage', target_return: 0.08 } as any,
      [{ cls: 'stocks_etf', label: 'AAPL', ticker: 'AAPL', value: 600 }]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ label: 'AAPL', balance: 600, asset_class: 'stocks_etf', target_return: benchmarkReturn('stocks_etf') });
    expect(out[1]).toMatchObject({ label: 'Fidelity cash', balance: 400, retirement_pct: 50, source: 'manual', target_return: benchmarkReturn('cash_mgmt') });
  });
  test('easy · Holding label fallback to ticker then Holding', () => {
    const out = buildItemizedAccounts({ asset_id: 'L', label: 'Broker', institution: 'Broker', balance: 100, tax_bucket: 'TAXABLE', target_return: 0 } as any, [{ cls: 'stocks_etf', label: '', ticker: 'XYZ', value: 100 }]);
    expect(out.map((a) => ({ label: a.label, balance: a.balance }))).toEqual([{ label: 'XYZ', balance: 100 }]);
  });
  test('complex · Missing value refuses entire build', () => {
    const lump = { asset_id: 'L', label: 'Broker', balance: 100, tax_bucket: 'TAXABLE', target_return: 0 } as any;
    const items = [{ cls: 'stocks_etf' as const, label: 'A', value: 60 }, { cls: 'bonds' as const, label: 'B', value: null }];
    const before = JSON.stringify([lump, items]);
    let out: unknown = 'not reached';
    expect(() => { out = buildItemizedAccounts(lump, items); }).toThrow(/no value \(B\)/);
    expect(out).toBe('not reached');                    // nothing built, not even the holding that had a value
    expect(JSON.stringify([lump, items])).toBe(before);  // the original account and the list are unchanged
  });
  test('complex · Bond fields remain only if entered', () => {
    const out = buildItemizedAccounts({ asset_id: 'L', label: 'Broker', institution: 'Broker', balance: 1000, tax_bucket: 'TAXABLE', target_return: 0 } as any,
      [{ cls: 'bonds', label: 'Treasury', value: 950, couponRate: 0.04, maturityDate: '2030-01-01' }]);
    expect({ label: out[0].label, balance: out[0].balance, coupon_rate: out[0].coupon_rate, maturity_date: out[0].maturity_date, face_value: nothing(out[0].face_value) })
      .toEqual({ label: 'Treasury', balance: 950, coupon_rate: 0.04, maturity_date: '2030-01-01', face_value: null });
  });
  test('edge · No positive remainder creates no cash account', () => {
    const out = buildItemizedAccounts({ asset_id: 'L', label: 'Broker', institution: 'Broker', balance: 100, tax_bucket: 'TAXABLE', target_return: 0 } as any, [{ cls: 'stocks_etf', label: 'A', value: 120 }]);
    expect(out.map((a) => ({ label: a.label, balance: a.balance }))).toEqual([{ label: 'A', balance: 120 }]);
  });
  test('brief step 7 · a successful build leaves the original untouched', () => {
    const lump = { asset_id: 'L', label: 'Broker', institution: 'Broker', balance: 1000, tax_bucket: 'PRE_TAX', kind: '401k', retirement_pct: 40, target_return: 0.079 } as any;
    const before = JSON.stringify(lump);
    const out = buildItemizedAccounts(lump, [{ cls: 'bonds', label: 'T', value: 300, faceValue: 0 }]);
    expect(JSON.stringify(lump)).toBe(before);
    expect(out.map((a) => [a.kind, a.tax_bucket, a.retirement_pct, a.face_value])).toEqual([['401k', 'PRE_TAX', 40, undefined], ['401k', 'PRE_TAX', 40, undefined]]);
  });
});

describe('MK-NW-F-053 correctClassOf — five cases', () => {
  // BRIEF WRONG: null — right is 'cash'. The card: "A class the person chose is the class it should carry", so the
  // function returns that class; "nothing" is for no correction to make, and reclassifyAccounts then changes nothing
  // because the class already matches (DEC-2748h). The outcome OpenAI wanted — no correction — holds.
  test.failing('easy · Explicit chosen class wins', () => {
    expect(correctClassOf(A({ asset_class: 'cash', class_source: 'user', kind: 'cd', label: 'Certificate of Deposit', maturity_date: '2030-01-01' }))).toBeNull();
  });
  test('easy · Explicit chosen class wins — the app\'s answer, hand-checked', () => {
    const a = A({ asset_class: 'cash', class_source: 'user', kind: 'cd', label: 'Certificate of Deposit', maturity_date: '2030-01-01' });
    expect(correctClassOf(a)).toBe('cash');
    expect(reclassifyAccounts([a])).toEqual({ accounts: [a], changed: 0 });
  });
  test('easy · Valid maturity implies bonds', () => {
    expect(correctClassOf(A({ asset_class: null, kind: 'stocks_etf', label: 'Generic asset', maturity_date: '2030-01-01' }))).toBe('bonds');
  });
  test('complex · Money-market account maps to stocks/funds', () => {
    expect(correctClassOf(A({ asset_class: null, kind: 'money_market', label: 'Money market' }))).toBe('stocks_etf');
  });
  test('complex · Property name must not be classified from institution/name evidence', () => {
    // touches name evidence (in flight elsewhere) — intended rule: a street address is no class evidence
    expect(correctClassOf(A({ asset_class: null, kind: 'other_asset', label: '123 Main Street Home' }))).toBeNull();
  });
  test('edge · Invalid maturity date treated absent', () => {
    expect(correctClassOf(A({ asset_class: null, kind: 'other_asset', label: 'Generic asset', maturity_date: '2026-02-30' }))).toBeNull();
  });
});

describe('MK-NW-F-054 reclassifyAccounts — five cases + the brief\'s untouched / idempotent checks', () => {
  test('easy · Unconfirmed misclassified CD account', () => {
    const r = reclassifyAccounts([A({ asset_id: 'a', wrapper_confirmed: false, asset_class: null, kind: 'cd', label: 'CD', tax_bucket: 'TAXABLE' })]);
    expect({ changed: r.changed, class: r.accounts[0].asset_class }).toEqual({ changed: 1, class: 'bonds' });
  });
  test('easy · Confirmed account left untouched', () => {
    const a = A({ asset_id: 'a', wrapper_confirmed: true, asset_class: 'cash', kind: 'cd', label: 'CD', tax_bucket: 'TAXABLE' });
    const r = reclassifyAccounts([a]);
    expect({ changed: r.changed, class: r.accounts[0].asset_class }).toEqual({ changed: 0, class: 'cash' });
    expect(r.accounts[0]).toBe(a);   // exactly as it was
  });
  // BRIEF WRONG: tax_bucket "not_stated" — right is taxable, as entered. The card (DEC-4036f): "a CASH tax bucket becomes
  // no tax type stated unless the new class is cash". This account's bucket is taxable, not cash — nothing to clear,
  // and the rule is never to guess, which includes never erasing what is stored. Class and count agree.
  test.failing('complex · Moving cash to investments clears tax bucket', () => {
    const r = reclassifyAccounts([A({ asset_id: 'a', wrapper_confirmed: false, asset_class: null, kind: 'money_market', label: 'Money market', tax_bucket: 'TAXABLE' })]);
    expect({ changed: r.changed, class: r.accounts[0].asset_class, tax_bucket: nothing(r.accounts[0].tax_bucket) }).toEqual({ changed: 1, class: 'stocks_etf', tax_bucket: null });
  });
  test('complex · Moving cash to investments — the app\'s answer, hand-checked (and the cash-bucket case the card means)', () => {
    const taxable = reclassifyAccounts([A({ asset_id: 'a', asset_class: null, kind: 'money_market', label: 'Money market', tax_bucket: 'TAXABLE' })]);
    expect({ changed: taxable.changed, class: taxable.accounts[0].asset_class, tax_bucket: taxable.accounts[0].tax_bucket }).toEqual({ changed: 1, class: 'stocks_etf', tax_bucket: 'TAXABLE' });
    const cash = reclassifyAccounts([A({ asset_id: 'b', asset_class: 'cash', kind: 'money_market', label: 'Money market', tax_bucket: 'CASH' })]);
    expect({ changed: cash.changed, class: cash.accounts[0].asset_class, tax_bucket: nothing(cash.accounts[0].tax_bucket) }).toEqual({ changed: 1, class: 'stocks_etf', tax_bucket: null });
  });
  test('complex · User-classed holding not rewritten', () => {
    const p = { position_id: 'p1', ticker: 'BND', label: 'Bond ETF', class_source: 'user', asset_class: 'stock_etf', lots: [] };
    const r = reclassifyAccounts([A({ asset_id: 'a', wrapper_confirmed: false, asset_class: 'stocks_etf', positions: [p] })]);
    expect({ changed: r.changed, holdingTag: (r.accounts[0].positions as any[])[0].asset_class }).toEqual({ changed: 0, holdingTag: 'stock_etf' });
  });
  test('edge · Idempotent second run', () => {
    const r = reclassifyAccounts([A({ asset_id: 'a', wrapper_confirmed: false, asset_class: 'bonds', kind: 'fixed_income', label: 'Treasury' })]);
    expect({ changed: r.changed, class: r.accounts[0].asset_class }).toEqual({ changed: 0, class: 'bonds' });
  });
  test('brief step 7 · pending holding untouched, input not mutated, second run changes nothing', () => {
    const accounts = [
      A({ asset_id: 'x', asset_class: null, kind: 'cd', label: 'CD', tax_bucket: 'CASH' }),
      A({ asset_id: 'y', wrapper_confirmed: true, asset_class: 'cash', kind: 'money_market', label: 'MM', tax_bucket: 'CASH' }),
      A({ asset_id: 'z', asset_class: 'stocks_etf', positions: [
        { position_id: 'q1', ticker: 'BND', label: 'VANGUARD TOTAL BOND MARKET ETF', class_asked: true, asset_class: 'stock_etf', lots: [] },
        { position_id: 'q2', ticker: 'BND', label: 'VANGUARD TOTAL BOND MARKET ETF', asset_class: 'stock_etf', lots: [] },
      ] }),
    ];
    const before = JSON.stringify(accounts);
    const r1 = reclassifyAccounts(accounts);
    expect(JSON.stringify(accounts)).toBe(before);
    expect(r1.accounts[1]).toBe(accounts[1]);
    const ps = r1.accounts[2].positions as any[];
    expect([ps[0].asset_class, ps[1].asset_class]).toEqual(['stock_etf', 'bond']);
    expect(r1.changed).toBe(2);
    expect(reclassifyAccounts(r1.accounts).changed).toBe(0);
  });
});

describe('MK-NW-F-055 isBond — five cases', () => {
  test('easy · Explicit bonds class', () => { expect(isBond(A({ asset_class: 'bonds', kind: 'fixed_income' }))).toBe(true); });
  test('easy · Explicit stocks class overrides bond-like name', () => { expect(isBond(A({ asset_class: 'stocks_etf', kind: 'stocks_etf', label: 'Bond Fund' }))).toBe(false); });
  test('complex · CD kind with missing class derives bonds', () => { expect(isBond(A({ asset_class: null, kind: 'cd', label: 'Certificate of deposit' }))).toBe(true); });
  test('complex · Institution name alone is not a CD', () => { expect(isBond(A({ asset_class: null, kind: 'brokerage', label: 'Brokerage account', institution: 'CD Capital' }))).toBe(false); });
  test('edge · Cash class false', () => { expect(isBond(A({ asset_class: 'cash', kind: 'checking' }))).toBe(false); });
});

describe('MK-NW-F-056 bondInfo — five cases', () => {
  test('easy · Ordinary bond fields preserved', () => {
    expect(bondInfo(A({ kind: 'fixed_income', label: 'Treasury note', institution: 'Broker', balance: 980, face_value: 1000, coupon_rate: 0.04, maturity_date: '2030-01-01', accrued_interest: 3 })))
      .toEqual({ face: 1000, couponRate: 0.04, maturity: '2030-01-01', value: 980, accruedInterest: 3, isCd: false, cdBought: 'bank' });
  });
  test('easy · Zero coupon rate is kept', () => {
    expect(bondInfo(A({ kind: 'fixed_income', label: 'Zero coupon bond', balance: 900, face_value: 1000, coupon_rate: 0 }))).toMatchObject({ face: 1000, couponRate: 0, value: 900 });
  });
  test('complex · Missing or nonpositive face omitted', () => {
    expect(bondInfo(A({ kind: 'fixed_income', label: 'Treasury', balance: 900, face_value: 0, coupon_rate: 0.04 }))).toMatchObject({ face: null, couponRate: 0.04 });
  });
  test('complex · CD determined from account name, not institution', () => {
    expect(bondInfo(A({ kind: 'brokerage', label: 'Investment account', institution: 'CD Capital', balance: 1000 }))).toMatchObject({ isCd: false, cdBought: 'bank' });
  });
  test('edge · Broker CD is identified from account kind/name and venue', () => {
    expect(bondInfo(A({ kind: 'cd', label: 'Brokered CD', institution: 'Fidelity', balance: 9850, face_value: 10000, coupon_rate: 0.042, maturity_date: '2028-10-13', cd_bought: 'broker' })))
      .toMatchObject({ isCd: true, cdBought: 'broker', face: 10000 });
  });
});

describe('MK-NW-F-057 annualCoupon — five cases', () => {
  const B = (o: Record<string, any>) => ({ maturity: '', value: 0, ...o }) as any;
  test('easy · Standard coupon', () => { expect(annualCoupon(B({ face: 10000, couponRate: 0.04 }))).toBe(400); });
  test('easy · Zero coupon rate is known', () => { expect(annualCoupon(B({ face: 10000, couponRate: 0 }))).toBe(0); });
  test('complex · Fractional cents retained or exact precision', () => { expect(annualCoupon(B({ face: 1234.56, couponRate: 0.0375 }))!).toBeCloseTo(46.296, 9); });
  test('complex · Missing face means unknown coupon', () => { expect(annualCoupon(B({ face: null, couponRate: 0.04 }))).toBeNull(); });
  test('edge · Missing rate is unknown, not zero', () => { expect(annualCoupon(B({ face: 10000, couponRate: null }))).toBeNull(); });
});

describe('MK-NW-F-058 yearsToMaturity — five cases', () => {
  test('easy · One year exactly', () => { expect(yearsToMaturity('2027-10-13', local('2026-10-13T15:00:00'))).toBe(1); });
  test('easy · Maturity today', () => { expect(yearsToMaturity('2026-10-13', local('2026-10-13T23:59:00'))).toBe(0); });
  test('complex · Past maturity', () => { expect(yearsToMaturity('2025-10-13', local('2026-10-13T00:01:00'))).toBe(0); });
  test('complex · Missing or invalid date', () => { expect(yearsToMaturity('2026-02-30', local('2026-01-01T00:00:00'))).toBeNull(); });
  test('edge · One day before one-year anniversary', () => { expect(yearsToMaturity('2027-10-12', local('2026-10-13T23:59:59'))!).toBeCloseTo(0.9972602739726028, 12); });
});

describe('MK-NW-F-059 currentYield — five cases', () => {
  const B = (o: Record<string, any>) => ({ maturity: '', ...o }) as any;
  test('easy · Standard current yield', () => { expect(currentYield(B({ face: 10000, couponRate: 0.045, value: 24200 }))!).toBeCloseTo(0.0185950413, 9); });
  test('easy · Value is statement market value', () => { expect(currentYield(B({ face: 25000, couponRate: 0.045, value: 24200, accruedInterest: 1119 }))!).toBeCloseTo(0.0464876033, 9); });
  test('complex · Zero coupon rate yields zero when value positive', () => { expect(currentYield(B({ face: 10000, couponRate: 0, value: 9500 }))).toBe(0); });
  test('complex · No coupon rate entered', () => { expect(currentYield(B({ face: 10000, couponRate: null, value: 9500 }))).toBeNull(); });
  test('edge · Nonpositive value refuses yield', () => { expect(currentYield(B({ face: 10000, couponRate: 0.04, value: 0 }))).toBeNull(); });
});

describe('MK-NW-F-060 approxYTM — five cases', () => {
  const now = local('2026-10-13');
  test('easy · Bank CD returns stated rate', () => {
    expect(approxYTM({ isCd: true, cdBought: 'bank', couponRate: 0.042, face: null, value: 10000, maturity: '2028-10-13' }, now)).toBe(0.042);
  });
  test('easy · No maturity date refuses', () => {
    expect(approxYTM({ isCd: false, couponRate: 0.04, face: 10000, value: 9800, maturity: '' }, now)).toBeNull();
  });
  test('complex · Broker CD uses bond pricing, not coupon rate shortcut', () => {
    // "approximately 0.050": hand-check — 420 ÷ 1.05 + 10,420 ÷ 1.05² = 9,851.25, a hair above 9,850, so y is just over 5.0%
    const y = approxYTM({ isCd: true, cdBought: 'broker', couponRate: 0.042, face: 10000, value: 9850, maturity: '2028-10-13', accruedInterest: 0 }, now)!;
    expect(Math.abs(y - 0.05)).toBeLessThan(0.001);
    expect(y).not.toBe(0.042);
    expect(420 / (1 + y) + 10420 / (1 + y) ** 2).toBeCloseTo(9850, 6);
  });
  test('complex · Missing coupon rate refuses bond YTM', () => {
    expect(approxYTM({ isCd: false, couponRate: null, face: 10000, value: 9800, maturity: '2028-10-13' }, now)).toBeNull();
  });
  test('edge · Matured bond returns null', () => {
    expect(approxYTM({ isCd: false, couponRate: 0.04, face: 10000, value: 10000, maturity: '2026-10-12' }, now)).toBeNull();
  });
});

describe('MK-NW-F-061 bondSummary — five cases', () => {
  const now = local('2026-10-13');
  test('easy · One qualifying bond', () => {
    const s = bondSummary([{ face: 10000, couponRate: 0.04, value: 9800, maturity: '2027-10-13' }], now);
    expect({ ...s, avgYield: null }).toEqual({ count: 1, totalValue: 9800, totalFace: 10000, annualCoupon: 400, avgYield: null, nextMaturity: '2027-10-13' });
    expect(s.avgYield!).toBeCloseTo(0.04081632653061224, 12);
  });
  // BRIEF WRONG: annualCoupon 0 and avgYield 4.0816% — right is $392 and 4.00%. OpenAI flagged this one itself as
  // depending on the helper; the helper is the owner's rule DEC-2748c: "face × rate; with no face, value × rate".
  // $9,800 × 4% = $392 a year, and 392 ÷ 9,800 = 4.00% (OpenAI's 4.0816% is 400 ÷ 9,800 — a face of $10,000 it had just
  // said was not entered). "faceNotEntered" is not this function's output: the card names those bonds apart in
  // theBonds. Count, value, total face 0 and next maturity agree.
  test.failing('easy · Missing face separately identified', () => {
    const s = bondSummary([{ face: null, couponRate: 0.04, value: 9800, maturity: '2027-10-13' }], now);
    expect(s).toEqual({ count: 1, totalValue: 9800, totalFace: 0, annualCoupon: 0, avgYield: 0.04081632653061224, nextMaturity: '2027-10-13', faceNotEntered: 1 });
  });
  test('easy · Missing face separately identified — the app\'s answer, hand-checked', () => {
    const s = bondSummary([{ face: null, couponRate: 0.04, value: 9800, maturity: '2027-10-13' }], now);
    expect({ ...s, annualCoupon: 0, avgYield: 0 }).toEqual({ count: 1, totalValue: 9800, totalFace: 0, annualCoupon: 0, avgYield: 0, nextMaturity: '2027-10-13' });
    expect(s.annualCoupon).toBeCloseTo(392, 6); expect(s.avgYield!).toBeCloseTo(0.04, 12);
  });
  test('complex · Matured bond contributes zero interest and is not next maturity', () => {
    const s = bondSummary([{ face: 10000, couponRate: 0.04, value: 10000, maturity: '2026-10-12' }, { face: 5000, couponRate: 0.05, value: 4900, maturity: '2028-01-01' }], now);
    expect({ count: s.count, totalValue: s.totalValue, totalFace: s.totalFace, annualCoupon: s.annualCoupon, nextMaturity: s.nextMaturity }).toEqual({ count: 2, totalValue: 14900, totalFace: 15000, annualCoupon: 250, nextMaturity: '2028-01-01' });
  });
  test('complex · Typed zero coupon rate qualifies in yield average', () => {
    const s = bondSummary([{ face: 10000, couponRate: 0, value: 10000, maturity: '2027-10-13' }, { face: 10000, couponRate: 0.05, value: 10000, maturity: '2028-10-13' }], now);
    expect({ ...s, avgYield: null }).toEqual({ count: 2, totalValue: 20000, totalFace: 20000, annualCoupon: 500, avgYield: null, nextMaturity: '2027-10-13' });
    expect(s.avgYield!).toBeCloseTo(0.025, 12);
  });
  test('edge · No bond qualifies for average yield', () => {
    expect(bondSummary([{ face: 10000, couponRate: null, value: 9800, maturity: '2027-10-13' }], now)).toMatchObject({ avgYield: null, nextMaturity: '2027-10-13' });
  });
});

describe('MK-NW-F-062 couponIncomeAnnual — five cases', () => {
  const now = local('2026-10-13');
  test('easy · Two known coupons sum', () => {
    expect(couponIncomeAnnual([A({ asset_class: 'bonds', face_value: 10000, coupon_rate: 0.04, maturity_date: '2028-01-01', balance: 9800 }), A({ asset_class: 'bonds', face_value: 5000, coupon_rate: 0.05, maturity_date: '2028-01-01', balance: 4900 })], now)).toBeCloseTo(650, 6);
  });
  test('easy · No bonds', () => { expect(couponIncomeAnnual([A({ asset_class: 'cash', balance: 10000 })], now)).toBe(0); });
  test('complex · Matured bond interest is zero', () => {
    expect(couponIncomeAnnual([A({ asset_class: 'bonds', face_value: 10000, coupon_rate: 0.04, maturity_date: '2026-10-12', balance: 10000 }), A({ asset_class: 'bonds', face_value: 5000, coupon_rate: 0.05, maturity_date: '2028-01-01', balance: 5000 })], now)).toBeCloseTo(250, 6);
  });
  test('complex · Missing rate contributes zero in total but remains unknown', () => {
    const accounts = [A({ asset_class: 'bonds', face_value: 10000, coupon_rate: null, maturity_date: '2028-01-01', balance: 9800 }), A({ asset_class: 'bonds', face_value: 5000, coupon_rate: 0.05, maturity_date: '2028-01-01', balance: 4900 })];
    expect(couponIncomeAnnual(accounts, now)).toBeCloseTo(250, 6);
    expect(bondInfo(accounts[0]).couponRate).toBeNull();   // still "not entered" for the screen to name
  });
  test('edge · Typed zero coupon does not mean missing rate', () => {
    const a = A({ asset_class: 'bonds', face_value: 10000, coupon_rate: 0, maturity_date: '2028-01-01', balance: 10000 });
    expect(couponIncomeAnnual([a], now)).toBe(0); expect(bondInfo(a).couponRate).toBe(0);
  });
});
