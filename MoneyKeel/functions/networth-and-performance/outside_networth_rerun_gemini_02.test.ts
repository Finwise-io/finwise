/* THE OUTSIDE CASES, RUN AGAINST THE APP — Net worth module re-run (brief v02), Gemini, part 2: cards MK-NW-F-031 to 041,
 * 044 to 047 and 048.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/NW-test-cases-re-run-03-part02.json (77 cases:
 * 5 each for MK-NW-F-031 to 041 and 044 to 047, 2 for MK-NW-F-048). The file is cut off after the 77th case, two cases
 * carry `"edge",` with the `"kind":` key missing, and two inputs use the bare word `undefined`; it was read as text and
 * nothing in it was repaired — `undefined` is read as "not there".
 * Every expected answer is Gemini's, as it wrote it; only its input names are mapped onto the app's fields.
 * A case the app fails is a finding — never fixed by changing the answer here.
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing until fixed) · `// BRIEF WRONG:` Gemini's
 * own expectation is wrong (test.failing, its answer kept) · `// CARD MISREAD:` the case tests something the card does
 * not describe; it is run on the nearest true reading and said so.
 *
 * INPUT NAMES MAPPED (Gemini's names → the app's fields):
 *   kind "ira" → 'trad_ira'; "roth" → 'roth_ira'; "real_estate" → 'home' (every property the Net worth editor saves
 *     is kind 'home'; its use is re_use); "personal_property" (valuables, a boat) → class personal_property, tax
 *     bucket PROPERTY, kind 'other_asset' (the editor's only non-vehicle property choice); "foreign currency" →
 *     'foreign_currency'. A property account carries tax bucket PROPERTY, as the app's kind list gives it.
 *   An expected kind "other" → 'other_asset' (the app's id for Other); "ira" → 'trad_ira'.
 *   Volatility override "brokerage_vol" → overrides.brokerage: blendedVolatility reads its own map keyed by kind.
 *   Onboarding answers: traditional_retirement → currentRetirementSavings · roth_retirement → currentRetirementSavingsRoth
 *     · investment_holdings → investmentHoldings · savings_or_portfolio → currentSavingsPortfolio · unclassified_flag →
 *     class_question 'cash_or_investments' with class Unclassified ('mixed'); "kind: undefined" = no kind.
 *   Contributions: birth_year → birthYear · retirement_401k → c_401k · roth_contribution → c_roth ·
 *     investing_contribution → c_invest · property_savings → c_property · employer_match_type "percent" →
 *     employerMatchMode 'pct' with the share as a whole percent (0.5 → 50), "dollars" → 'dollar'.
 *   getAssetsState: REMOVED 2026-10-14 with the function (inputs-and-use audit, Net worth) — see its note below.
 *     account_count → the length of the accounts list returned.
 *   buildAssetsState: account_1_pct / account_2_pct / portfolio_percentage → each account's portfolio_percentage.
 *   sourceWording: last_synced as given; now → its time in milliseconds.
 *   historyCoverage: history_start → history_from (the date the sync recorded); now → that local calendar day.
 *     A result of nothing = no sentence and no months. THE SENTENCE IS COMPARED ON ITS CONTENT: the card gives what
 *     the sentence says (no records / the span and the start date), not its words; Gemini's wording is a guess at copy
 *     the card does not give, so the span and the start date (written as the app writes dates, "Jul 13, 2025") are
 *     checked, not the punctuation.
 *   uberGroupOf: class 'unclassified' → 'mixed'; group 'property' is the app's id for Personal property.
 *   uberGroupRows: classes_count → the length of a group's classes.
 */
import {
  primaryCarIdOf, earmarkedAmount, retirementEarmarkedValue, benchmarkReturn, blendedVolatility, benchmarkInfo,
  blendedReturn, buildAssetsState, assetsFromOnboarding, monthlyContributionsFromOnboarding,
  sourceWording, historyCoverage, uberGroupOf, uberGroupRows, assetClassOf,
} from '../../../src/domain/assets';

let n = 0;
const A = (o: Record<string, any>) => ({ asset_id: `a${++n}`, label: 'Account', ...o }) as any;
const PROP = { tax_bucket: 'PROPERTY' };
const VALUABLE = { asset_class: 'personal_property', kind: 'other_asset', tax_bucket: 'PROPERTY' };
const day = (d: string) => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const ms = (iso: string) => Date.parse(iso);

describe('MK-NW-F-031 primaryCarIdOf — five cases', () => {
  test('easy · Single vehicle with entered balance', () => {
    expect(primaryCarIdOf([A({ asset_id: 'car_1', kind: 'vehicle', ...PROP, balance: 25000 })])).toBe('car_1');
  });
  test('easy · Two vehicles, higher balance wins', () => {
    expect(primaryCarIdOf([A({ asset_id: 'car_a', kind: 'vehicle', ...PROP, balance: 15000 }), A({ asset_id: 'car_b', kind: 'vehicle', ...PROP, balance: 30000 })])).toBe('car_b');
  });
  test('complex · Multiple vehicles with unvalued car and tie-breaker', () => {
    expect(primaryCarIdOf([
      A({ asset_id: 'car_1', kind: 'vehicle', ...PROP, balance: null }),
      A({ asset_id: 'car_2', kind: 'vehicle', ...PROP, balance: 20000 }),
      A({ asset_id: 'car_3', kind: 'vehicle', ...PROP, balance: 20000 }),
    ])).toBe('car_2');
  });
  test('complex · Mixed personal property and vehicles', () => {
    expect(primaryCarIdOf([
      A({ asset_id: 'val_1', ...VALUABLE, balance: 50000 }), A({ asset_id: 'boat_1', ...VALUABLE, balance: 40000 }),
      A({ asset_id: 'sedan_1', kind: 'vehicle', ...PROP, balance: 18000 }),
    ])).toBe('sedan_1');
  });
  test('edge · No vehicles present in accounts list', () => {
    expect(primaryCarIdOf([A({ asset_id: 'chk_1', kind: 'checking', tax_bucket: 'CASH', balance: 5000 })])).toBeUndefined();
  });
});

describe('MK-NW-F-032 earmarkedAmount — five cases', () => {
  test('easy · Account with explicit retirement percentage', () => {
    expect(earmarkedAmount(A({ balance: 100000, retirement_pct: 80, kind: 'brokerage', tax_bucket: 'TAXABLE' }))).toBe(80000);
  });
  // BRIEF WRONG: 0 — right is $10,000. With no share stated the default applies, and the default counts everything
  // toward retirement except the home lived in, the car driven and a 529 (DEC-0100: "cash counts, because it is
  // money you can spend"; the card for MK-NW-F-037 says the same). $10,000 × 100% = $10,000.
  test.failing('easy · Checking account with default earmark', () => {
    expect(earmarkedAmount(A({ balance: 10000, retirement_pct: null, kind: 'checking', tax_bucket: 'CASH' }))).toBe(0);
  });
  test('easy · Checking account with default earmark — the app\'s answer, hand-checked', () => {
    expect(earmarkedAmount(A({ balance: 10000, retirement_pct: null, kind: 'checking', tax_bucket: 'CASH' }))).toBe(10000);
  });
  test('complex · Primary home with implicit earmark share', () => {
    expect(earmarkedAmount(A({ asset_id: 'home_1', balance: 450000, kind: 'home', ...PROP, retirement_pct: null }), undefined, 'home_1')).toBe(0);
  });
  test('complex · Rental property with full earmark', () => {
    expect(earmarkedAmount(A({ asset_id: 'rental_1', balance: 300000, kind: 'home', ...PROP, re_use: 'rental', retirement_pct: null }))).toBe(300000);
  });
  test('edge · Account with zero balance and null retirement_pct', () => {
    expect(earmarkedAmount(A({ balance: 0, retirement_pct: null, kind: 'brokerage', tax_bucket: 'TAXABLE' }))).toBe(0);
  });
});

describe('MK-NW-F-033 retirementEarmarkedValue — five cases', () => {
  test('easy · Single retirement account nest egg', () => {
    expect(retirementEarmarkedValue([A({ balance: 50000, retirement_pct: 100, kind: '401k', tax_bucket: 'PRE_TAX' })])).toBe(50000);
  });
  test('easy · Mixed brokerage and checking nest egg', () => {
    expect(retirementEarmarkedValue([A({ balance: 80000, retirement_pct: 100, kind: 'brokerage', tax_bucket: 'TAXABLE' }), A({ balance: 10000, retirement_pct: 0, kind: 'checking', tax_bucket: 'CASH' })])).toBe(80000);
  });
  test('complex · Portfolio including primary home and rental property', () => {
    expect(retirementEarmarkedValue([
      A({ asset_id: 'home_1', balance: 500000, kind: 'home', ...PROP, retirement_pct: null }),
      A({ asset_id: 'rental_1', balance: 250000, kind: 'home', ...PROP, re_use: 'rental', retirement_pct: null }),
      A({ asset_id: 'ira_1', balance: 100000, kind: 'trad_ira', tax_bucket: 'PRE_TAX', retirement_pct: 100 }),
    ])).toBe(350000);
  });
  test('complex · Retirement portfolio with partial earmarking and cash flow', () => {
    // 60,000 × 50% + 120,000 × 25% = 30,000 + 30,000
    expect(retirementEarmarkedValue([A({ balance: 60000, retirement_pct: 50, kind: 'roth_ira', tax_bucket: 'ROTH' }), A({ balance: 120000, retirement_pct: 25, kind: 'brokerage', tax_bucket: 'TAXABLE' })])).toBe(60000);
  });
  test('edge · Empty accounts list', () => { expect(retirementEarmarkedValue([])).toBe(0); });
});

describe('MK-NW-F-034 benchmarkReturn — five cases', () => {
  test('easy · Default rate for savings account kind', () => { expect(benchmarkReturn('savings', {})).toBe(0.024); });
  test('easy · User override for brokerage return', () => { expect(benchmarkReturn('brokerage', { brokerage: 0.09 })).toBe(0.09); });
  test('complex · Zero rate override check', () => { expect(benchmarkReturn('checking', { checking: 0 })).toBe(0); });
  // BRIEF WRONG: 7.9% — right is 6%. The card: "A kind is matched exactly as the app writes it; capitals count."
  // 'Roth IRA' is the kind's label, not how the app writes the kind ('roth_ira'), so it is an unknown kind: 6%.
  test.failing('complex · Exact string matching with capitalization', () => { expect(benchmarkReturn('Roth IRA', {})).toBe(0.079); });
  test('complex · Exact string matching with capitalization — the app\'s answer, hand-checked', () => {
    expect([benchmarkReturn('Roth IRA', {}), benchmarkReturn('roth_ira', {})]).toEqual([0.06, 0.079]);
  });
  test('edge · Unknown or missing kind fallback', () => { expect(benchmarkReturn('unknown_asset_type', {})).toBe(0.06); });
});

describe('MK-NW-F-035 blendedVolatility — five cases', () => {
  test('easy · Single account portfolio volatility', () => {
    expect(blendedVolatility([A({ balance: 10000, retirement_pct: 100, kind: 'brokerage', tax_bucket: 'TAXABLE' })], { brokerage: 0.15 })!).toBeCloseTo(0.15, 12);
  });
  // BRIEF WRONG: 0.705 — right is 9.25%. The app's figures are checking 0.5% and stocks and funds 18%; two equal
  // halves average to (0.5% + 18%) ÷ 2 = 9.25%. 70.5% is not even the average of Gemini's own 2% and 15% (8.5%).
  test.failing('easy · Two accounts with app default volatilities', () => {
    expect(blendedVolatility([A({ balance: 50000, retirement_pct: 100, kind: 'checking', tax_bucket: 'CASH' }), A({ balance: 50000, retirement_pct: 100, kind: 'stocks_etf', tax_bucket: 'TAXABLE' })], {})!).toBeCloseTo(0.705, 12);
  });
  test('easy · Two accounts with app default volatilities — the app\'s answer, hand-checked', () => {
    expect(blendedVolatility([A({ balance: 50000, retirement_pct: 100, kind: 'checking', tax_bucket: 'CASH' }), A({ balance: 50000, retirement_pct: 100, kind: 'stocks_etf', tax_bucket: 'TAXABLE' })], {})!).toBeCloseTo(0.0925, 12);
  });
  test('complex · Unequal capital weighting with custom overrides', () => {
    // (300,000 × 10% + 100,000 × 25%) ÷ 400,000 = 13.75%
    expect(blendedVolatility([A({ balance: 300000, retirement_pct: 100, kind: 'fixed_income', tax_bucket: 'TAXABLE' }), A({ balance: 100000, retirement_pct: 100, kind: 'crypto', tax_bucket: 'TAXABLE' })], { fixed_income: 0.1, crypto: 0.25 })!).toBeCloseTo(0.1375, 12);
  });
  test('complex · Portfolio with fallback to 12% default volatility', () => {
    expect(blendedVolatility([A({ balance: 50000, retirement_pct: 100, kind: 'unrecognized_kind', tax_bucket: 'TAXABLE' })], {})!).toBeCloseTo(0.12, 12);
  });
  test('edge · Zero earmarked nest egg total', () => {
    expect(blendedVolatility([A({ balance: 50000, retirement_pct: 0, kind: 'checking', tax_bucket: 'CASH' })], {})).toBeNull();
  });
});

describe('MK-NW-F-036 benchmarkInfo — five cases', () => {
  // SETTLED 2026-10-13 by DEC-0264 (the calculation hands over the value; what a screen prints is decided once, at
  // display) and the card's own words ("the period is blank"): the period is the empty text '' for a rate the person
  // set and for a kind with no record — the em-dash was a screen's mark made inside the calculation.
  // The one screen that prints it (the Plan's Your investments card) now prints nothing there.
  test('easy · Custom user override benchmark info', () => {
    expect(benchmarkInfo('brokerage', { brokerage: 0.085 })).toEqual({ ret: 0.085, source: 'Your custom estimate', period: '', edited: true, estimate: true });
  });
  // BRIEF WRONG: source "S&P 500 historical total return", period "1926-2025" — right is the record on file for the
  // kind, "S&P 500 total return" over "30-yr". The card gives no record text; Gemini invented one. Rate 10.4%,
  // edited false and estimate false agree.
  test.failing('easy · Standard app benchmark with record', () => {
    expect(benchmarkInfo('stocks_etf', {})).toEqual({ ret: 0.104, source: 'S&P 500 historical total return', period: '1926-2025', edited: false, estimate: false });
  });
  test('easy · Standard app benchmark with record — the app\'s answer, hand-checked', () => {
    expect(benchmarkInfo('stocks_etf', {})).toEqual({ ret: 0.104, source: 'S&P 500 total return', period: '30-yr', edited: false, estimate: false });
  });
  // SETTLED 2026-10-13 by DEC-0264 (same reading): the period is blank, ''.
  test('complex · Zero rate user override check', () => {
    expect(benchmarkInfo('foreign_currency', { foreign_currency: 0 })).toEqual({ ret: 0, source: 'Your custom estimate', period: '', edited: true, estimate: true });
  });
  // BRIEF WRONG: source "Options historical model", period "10-year blended" — the app holds no record for options,
  // so by the card it reads "Generic blended estimate", period blank, estimate true; its rate is the kind's 5%.
  test.failing('complex · Assumption record without user override', () => {
    expect(benchmarkInfo('options', {})).toEqual({ ret: 0.05, source: 'Options historical model', period: '10-year blended', edited: false, estimate: true });
  });
  test('complex · Assumption record without user override — the app\'s answer, hand-checked', () => {
    expect(benchmarkInfo('options', {})).toEqual({ ret: 0.05, source: 'Generic blended estimate', period: '', edited: false, estimate: true });
  });
  // SETTLED 2026-10-13 by DEC-0264 (same reading): the period is blank, ''.
  test('edge · Kind with no record on file', () => {
    expect(benchmarkInfo('mystic_fund', {})).toEqual({ ret: 0.06, source: 'Generic blended estimate', period: '', edited: false, estimate: true });
  });
});

describe('MK-NW-F-037 blendedReturn — five cases', () => {
  test('easy · Single account earmarked return', () => {
    expect(blendedReturn([A({ balance: 100000, retirement_pct: 100, kind: 'brokerage', tax_bucket: 'TAXABLE' })], {})!).toBeCloseTo(0.08, 12);
  });
  test('easy · Two equal accounts with different benchmarks', () => {
    expect(blendedReturn([A({ balance: 50000, retirement_pct: 100, kind: 'checking', tax_bucket: 'CASH' }), A({ balance: 50000, retirement_pct: 100, kind: 'stocks_etf', tax_bucket: 'TAXABLE' })], {})!).toBeCloseTo(0.0545, 12);
  });
  test('complex · Portfolio with home and rental weighting rules', () => {
    expect(blendedReturn([
      A({ asset_id: 'home_1', balance: 400000, kind: 'home', ...PROP, retirement_pct: null }),
      A({ asset_id: 'rental_1', balance: 200000, kind: 'home', ...PROP, re_use: 'rental', retirement_pct: null }),
    ], {})!).toBeCloseTo(0.045, 12);
  });
  test('complex · Unequal retirement weighting across multiple asset kinds', () => {
    // (300,000 × 7.9% + 100,000 × 8%) ÷ 400,000 = 7.925%
    expect(blendedReturn([A({ balance: 300000, retirement_pct: 100, kind: 'trad_ira', tax_bucket: 'PRE_TAX' }), A({ balance: 100000, retirement_pct: 100, kind: 'crypto', tax_bucket: 'TAXABLE' })], {})!).toBeCloseTo(0.07925, 12);
  });
  test('edge · Zero earmarked total value', () => {
    expect(blendedReturn([A({ balance: 50000, retirement_pct: 0, kind: 'checking', tax_bucket: 'CASH' })], {})).toBeNull();
  });
});

// REMOVED 2026-10-19 (DEC-5758, his words: "Removing #4,5,6,7-10,11 - approved."): MK-NW-F-038 earmarkedKinds left the code —
// nothing in the app, the doors or the engines called it; nothing showed what it returned. The block "MK-NW-F-038 earmarkedKinds — five cases"
// (5 cases) is no longer run; its record is kept in the results file. The number is retired in
// moneykeel_function_register.json, never reused.

describe('MK-NW-F-039 buildAssetsState — five cases', () => {
  test('easy · Single account assets state', () => {
    const s = buildAssetsState('usr_1' as any, [A({ asset_id: 'acc_1', balance: 50000, target_return: 0.07 })]);
    expect([s.total_asset_value, s.average_target_return, s.accounts[0].portfolio_percentage]).toEqual([50000, 0.07, 100]);
  });
  test('easy · Two accounts with equal balances', () => {
    const s = buildAssetsState('usr_1' as any, [A({ asset_id: 'acc_1', balance: 40000, target_return: 0.06 }), A({ asset_id: 'acc_2', balance: 40000, target_return: 0.1 })]);
    expect(s.total_asset_value).toBe(80000);
    expect(s.average_target_return!).toBeCloseTo(0.08, 12);
  });
  // BRIEF WRONG: account_count 1 — right is 2. The card leaves a missing balance out of the TOTAL and gives that
  // account a share of 0 ("or 0 when … its balance is missing"), so it stays on the list at 0%. Total $60,000 and
  // average 8% agree.
  test.failing('complex · Accounts with missing balance filtering', () => {
    const s = buildAssetsState('usr_1' as any, [A({ asset_id: 'acc_1', balance: 60000, target_return: 0.08 }), A({ asset_id: 'acc_2', balance: null, target_return: 0.1 })]);
    expect([s.total_asset_value, s.average_target_return, s.accounts.length]).toEqual([60000, 0.08, 1]);
  });
  test('complex · Accounts with missing balance filtering — the app\'s answer, hand-checked', () => {
    const s = buildAssetsState('usr_1' as any, [A({ asset_id: 'acc_1', balance: 60000, target_return: 0.08 }), A({ asset_id: 'acc_2', balance: null, target_return: 0.1 })]);
    expect([s.total_asset_value, s.average_target_return, s.accounts.length, s.accounts[1].portfolio_percentage]).toEqual([60000, 0.08, 2, 0]);
  });
  test('complex · Overdrawn account with negative share', () => {
    const s = buildAssetsState('usr_1' as any, [A({ asset_id: 'acc_1', balance: 100000, target_return: 0.08 }), A({ asset_id: 'acc_2', balance: -10000, target_return: 0 })]);
    expect(s.total_asset_value).toBe(90000);
    expect(s.accounts[0].portfolio_percentage).toBeCloseTo(111.1111, 3);
    expect(s.accounts[1].portfolio_percentage).toBeCloseTo(-11.1111, 3);
  });
  test('edge · Zero total asset value', () => {
    const s = buildAssetsState('usr_1' as any, [A({ asset_id: 'acc_1', balance: 0, target_return: 0.07 })]);
    expect([s.total_asset_value, s.average_target_return, s.accounts[0].portfolio_percentage]).toEqual([0, null, 0]);
  });
});

describe('MK-NW-F-040 assetsFromOnboarding — five cases', () => {
  const pick = (a: any) => ({ kind: a.kind, tax_bucket: a.tax_bucket, target_return: a.target_return });
  test('easy · Traditional retirement savings setup', () => {
    const d = assetsFromOnboarding('usr_1' as any, { currentRetirementSavings: 25000 });
    expect([d.accounts.length, pick(d.accounts[0])]).toEqual([1, { kind: '401k', tax_bucket: 'PRE_TAX', target_return: 0.07 }]);
  });
  test('easy · Roth retirement savings setup', () => {
    const d = assetsFromOnboarding('usr_1' as any, { currentRetirementSavingsRoth: 10000 });
    expect([d.accounts.length, pick(d.accounts[0])]).toEqual([1, { kind: 'roth_ira', tax_bucket: 'ROTH', target_return: 0.07 }]);
  });
  const full = { currentRetirementSavings: 50000, currentRetirementSavingsRoth: 0, investmentHoldings: 100000, currentSavingsPortfolio: 15000 };
  // BRIEF WRONG: account_count 3 and the investments as kind "brokerage" — right is FOUR accounts (Gemini lists four
  // itself; the card keeps a typed 0, so the $0 Roth is one of them), and the investments are taxable stocks and
  // funds, kind 'stocks_etf' (the card: "investment holdings → taxable stocks and funds").
  test.failing('complex · Full onboarding dataset with typed zero preservation', () => {
    const d = assetsFromOnboarding('usr_1' as any, full);
    expect([d.accounts.length, d.accounts.map((a: any) => [a.balance, a.kind ?? undefined])]).toEqual([3, [[50000, '401k'], [0, 'roth_ira'], [100000, 'brokerage'], [15000, undefined]]]);
  });
  test('complex · Full onboarding dataset with typed zero preservation — the app\'s answer, hand-checked', () => {
    const d = assetsFromOnboarding('usr_1' as any, full);
    expect(d.accounts.map((a: any) => [a.balance, a.kind, a.tax_bucket])).toEqual([[50000, '401k', 'PRE_TAX'], [0, 'roth_ira', 'ROTH'], [100000, 'stocks_etf', 'TAXABLE'], [15000, undefined, undefined]]);
    const u: any = d.accounts[3];
    expect([u.target_return, assetClassOf(u), u.class_question]).toEqual([0, 'mixed', 'cash_or_investments']);
  });
  test('complex · Skipping blank or negative answers', () => {
    expect(assetsFromOnboarding('usr_1' as any, { currentRetirementSavings: '', currentSavingsPortfolio: -500 }).accounts.length).toBe(0);
  });
  test('edge · Null onboarding object', () => { expect(assetsFromOnboarding('usr_1' as any, null).accounts).toEqual([]); });
});

describe('MK-NW-F-041 monthlyContributionsFromOnboarding — five cases', () => {
  test('easy · User under 50 with standard contributions', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1990, c_401k: 1000, c_roth: 500, c_invest: 300 })).toBe(1800);
  });
  test('easy · Unanswered contribution questions', () => { expect(monthlyContributionsFromOnboarding({ birthYear: 1980 })).toBeNull(); });
  // BRIEF WRONG: $4,125 — right is $4,062.50. At 52 the 2026 limit is $32,500 a year = $2,708.33 a month; $3,000 is
  // held there, and the 50% match is on the held amount (the card): $2,708.33 + $1,354.17 = $4,062.50. $4,125 is
  // $2,750 × 1.5, a limit that is not the law's.
  test.failing('complex · User aged 52 with 401k capped at limit and employer match', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1974, c_401k: 3000, employerMatchMode: 'pct', employerMatchValue: 50 })!).toBeCloseTo(4125, 2);
  });
  test('complex · User aged 52 … — the app\'s answer, hand-checked', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1974, c_401k: 3000, employerMatchMode: 'pct', employerMatchValue: 50 })!).toBeCloseTo(4062.5, 6);
  });
  test('complex · User aged 62 with catch-up limit and dollar match', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1964, c_401k: 3000, employerMatchMode: 'dollar', employerMatchValue: 500 })!).toBeCloseTo(3479.1667, 4);
  });
  test('edge · Property savings inclusion exclusion check', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1990, c_property: 500, c_invest: 200 })).toBe(200);
  });
});

// REMOVED 2026-10-14 (inputs-and-use audit, 2026-10-11, Net worth: "Nothing calls them … Remove"): MK-NW-F-044 getAssetsState
// left the code with MK-NW-F-042 loadAssets, MK-NW-F-043 saveAssets and MK-NW-F-111 assetsStateFrom — nothing in the app,
// the doors or the engines called them; every screen reads the accounts from the store. Its five cases are no longer run.
// DEC-2748i (a saved record with every account deleted shows the first-day screen) governed this path only; the store path
// has its own first-day state. The numbers are retired in moneykeel_function_register.json, never reused.

describe('MK-NW-F-045 sourceWording — five cases', () => {
  const now = ms('2026-10-13T10:00:00Z');
  test('easy · Linked account recently updated', () => { expect(sourceWording(A({ source: 'connected', last_synced: '2026-10-12T10:00:00Z' }), now)).toBe('Linked'); });
  test('easy · Imported account fresh', () => { expect(sourceWording(A({ source: 'imported', last_synced: '2026-10-11T10:00:00Z' }), now)).toBe('Imported'); });
  test('complex · Linked account stale (5 days old)', () => { expect(sourceWording(A({ source: 'connected', last_synced: '2026-10-08T10:00:00Z' }), now)).toBe('Linked · 5 days old'); });
  test('complex · Manual hand-entered account', () => { expect(sourceWording(A({ source: 'manual' }), now)).toBe('By hand · you update it'); });
  test('edge · Linked account with no update on record', () => { expect(sourceWording(A({ source: 'connected', last_synced: null }), now)).toBe('Linked · not updated yet'); });
});

describe('MK-NW-F-046 historyCoverage — five cases', () => {
  const H = (o: Record<string, any>) => ({ asset_id: `h${++n}`, ...o }) as any;   // no name, so the sentence reads "This account"
  test('easy · History starting before window start', () => {
    expect(historyCoverage(H({ source: 'connected', history_from: '2026-01-01' }), '2026-07-01', day('2026-10-13'))).toBeNull();
  });
  test('easy · Manual account with no history records', () => {
    const c = historyCoverage(H({ source: 'manual' }), '2026-01-01', day('2026-10-13'))!;
    expect(c.sentence).toContain('This account has no activity records');
  });
  // BRIEF WRONG: "1 year of history", 12 months — right is nothing to say. The history starts ON the period's first
  // day (2025-10-13 = 2025-10-13), and the card: "History starting on or before the period's first day: nothing to say."
  test.failing('complex · History covering exactly 1 year', () => {
    const c = historyCoverage(H({ source: 'connected', history_from: '2025-10-13' }), '2025-10-13', day('2026-10-13'));
    expect([c?.sentence ?? null, c?.monthsCovered ?? null]).toEqual(['1 year of history (from 2025-10-13)', 12]);
  });
  test('complex · History covering exactly 1 year — the app\'s answer, hand-checked', () => {
    expect(historyCoverage(H({ source: 'connected', history_from: '2025-10-13' }), '2025-10-13', day('2026-10-13'))).toBeNull();
  });
  test('complex · History covering 1 year and 3 months', () => {
    const c = historyCoverage(H({ source: 'connected', history_from: '2025-07-13' }), '2025-01-01', day('2026-10-13'))!;
    expect(c.monthsCovered).toBe(15);
    expect(c.sentence).toContain('1 year 3 months of history (from Jul 13, 2025)');
  });
  test('edge · History start date in the future', () => {
    const c = historyCoverage(H({ source: 'connected', history_from: '2027-01-01' }), '2026-01-01', day('2026-10-13'))!;
    expect([c.kind, c.sentence, c.monthsCovered]).toEqual(['unreadable', 'History start date cannot be read.', null]);
  });
});

describe('MK-NW-F-047 uberGroupOf — five cases', () => {
  test('easy · Cash asset class mapping', () => { expect(uberGroupOf('cash')).toBe('cash'); });
  test('easy · Stocks and ETFs asset class mapping', () => { expect(uberGroupOf('stocks_etf')).toBe('investments'); });
  test('complex · Alternative asset class mapping', () => { expect(uberGroupOf('alternatives')).toBe('investments'); });
  test('complex · Real estate asset class mapping', () => { expect(uberGroupOf('real_estate')).toBe('property'); });
  test('edge · Unclassified asset class mapping', () => { expect(uberGroupOf('mixed')).toBe('investments'); });
});

describe('MK-NW-F-048 uberGroupRows — two cases', () => {
  test('easy · Single cash class row sorting and summing', () => {
    const g = uberGroupRows([{ key: 'cash', label: 'Cash', color: '#000', total: 10000 }]);
    expect(g.map((x) => ({ group: x.group, label: x.label, total: x.total, classes_count: x.classes.length }))).toEqual([{ group: 'cash', label: 'Cash', total: 10000, classes_count: 1 }]);
  });
  test('easy · Empty class rows list', () => { expect(uberGroupRows([])).toEqual([]); });
});
