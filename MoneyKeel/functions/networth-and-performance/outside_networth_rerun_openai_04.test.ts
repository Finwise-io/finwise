/* THE OUTSIDE CASES, RUN AGAINST THE APP — Net worth module re-run (brief v02), OpenAI, part 4: cards MK-NW-F-117 to
 * 137 and the orchestrators MK-NW-O-001 to 008 (29 cards).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_nw_part4_audit_and_claude_brief.json
 * (145 cases, five per card, nested under "cards") and its run brief moneykeel_nw_part4_claude_code_brief.md. Every
 * expected answer is OpenAI's, as it wrote it; only its input names are mapped onto the app's fields. Where OpenAI wrote
 * its expectation in words ("only priced bonds with usable yield", "computed_without_unpriced_holding"), the test
 * asserts exactly what those words state, with the number worked by hand. A case the app fails is a finding — never
 * fixed by changing the answer here.
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing until fixed) · `// BRIEF WRONG:` OpenAI's
 * own expectation is wrong (test.failing, its answer kept, plus a test pinning the app's hand-checked answer) ·
 * `// CARD MISREAD:` the case tests something the card does not describe (same two tests) · `// BLOCKED:` the case
 * cannot be run as written · `// SPECIFICATION_CONFLICT:` the card and the code (or a later ruling) disagree; both
 * sources are quoted and the one that governs is said.
 *
 * TOLERANCE: money to 1e-6 dollars (toBeCloseTo 6), rates to 1e-9 — floating-point sums only.
 * FIXED DATES: every date-reading case passes its own `now`, a LOCAL calendar day (2026-10-13 unless the case says);
 * the emergency fund reads the logged months against the clock, so its block runs on a fake clock set to that day.
 *
 * INPUT NAMES MAPPED (OpenAI's names → the app's fields):
 *   Properties: kind "real_estate" → kind 'home', tax_bucket PROPERTY; is_primary_home → re_use 'primary'; stored_use
 *   "rental" → re_use 'rental'; a rent entry { property_id, monthly_rent } → { type: 'long', property_id, income,
 *   expenses: 0 }. ORDER: OpenAI lists properties in the order they were ENTERED; the app keeps the newest first
 *   (addAsset prepends, src/store/useStore.ts), so the list is handed in reversed. Answers home / rental / second as is.
 *   Bonds: kind "bond" → asset_class 'bonds', kind 'fixed_income'; kind "cd" → kind 'cd' (asset_class 'bonds');
 *   purchase_channel "broker" → cd_bought 'broker', anything else → nothing (read as bank, DEC-3837). A "bond" handed to
 *   a BondInfo function → BondInfo { face, couponRate, maturity, value: balance, isCd, cdBought }.
 *   Classes: "Stocks / Funds" 'stocks_etf' (tag 'stock_etf'), "Bonds & CDs" 'bonds' (tag 'bond'), "Cash" 'cash',
 *   "Alternatives" 'alternatives' (tag 'other'), "Unclassified" 'mixed'. A holding's "description" → its name.
 *   GainRow (gainOfRow / heldValueOf / gainRowName): bought_in_window → cappedSince with gain = value − cost;
 *   value_now / market_value → marketValue; cd_rate → couponRate; period_return in a "whole-window" case → periodTotal
 *   (the window's own total); shares / last_price / built_value / contract_multiplier / is_option → position { lots:
 *   [{ shares }], last_price, value_now, multiplier, kind 'options' }; name → the row's own name; ticker → position.ticker.
 *   Vehicles and earmarks: name → the shown-name map (`names`), label / institution as written, balance null → none
 *   entered; retirement_share → retirement_pct (a percent: 0.5 → 50). "picked_as_primary" is not a field: the app
 *   picks the car you drive itself (MK-NW-F-031 primaryCarIdOf — the most valuable valued vehicle; with none valued,
 *   the lowest id). Where OpenAI says a vehicle was NOT picked and the app would pick it, a valued vehicle 'zz-car' is
 *   added that the app picks — it is never in the notes, so the case's meaning is kept.
 *   asksCashOrInvestments: ask_cash_or_investments true → class_question 'cash_or_investments'.
 *   Accounts / records: "linked" → source 'connected'; transaction types → DIVIDEND / INTEREST / DEPOSIT / WITHDRAWAL;
 *   OpenAI's "transfer_in" record on the receiving account → the app's one TRANSFER record, kept on the account the
 *   money LEFT, with counter_account_id = the receiving account; an "expense" of −$20 → WITHDRAWAL of $20.
 *   Daily values { date, value } → a recorded day for one hand-entered investment account 'a' (typedValue); today's
 *   value is read from the account handed in, as the app does. A movement { type, amount } → that record on 'a'; a
 *   "shares_transfer" with no direction and no value → TRANSFER_IN_KIND with neither.
 *   Debts: minimum → minimum_monthly_payment, payment → monthly_payment, balance → remaining_balance.
 *   Emergency fund: essential_monthly → a typed budget line tiered 'need'; debt_minimums → an AUTO loan with that minimum;
 *   rent_net_monthly → a rental property and a rent entry naming it; logged amounts → expenses logged in Sep 2026.
 *   Alternatives: a "rate" is NOT an input — the app reads each part's yearly rate from the benchmark for its KIND
 *   (benchmarkReturn). 6% = hedge funds, 5% = other / options, 8% = crypto; no kind is 10%. Classified / unclassified
 *   parts → a linked brokerage holding a priced alternative and an unpriced one (DEC-4036h).
 *   Look-back: holding_prices / benchmark_prices → price series whose points sit on month boundaries ending today.
 *   An expected null where the app's type says undefined is the same answer — "nothing" — and is compared as such.
 *
 * IN FLIGHT ELSEWHERE (another agent, same day): the rent entries handed to Plan's retirement-money callers (DEC-4913),
 * categoryEarnings' stated bond rate, ledgerGroups' missing balance, card wording for windowStartKey / propertyUses.
 * None of the 145 cases here calls those; MK-NW-F-117 propertyUseMap is judged against DEC-4913 as already coded.
 */
import { writeFigure } from '../_figure-spec';
import { PERFORMANCE_FIGURES } from './performance';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  propertyUseMap, classEvidenceOf, holdingTagClass, holdingTagFor, holdingNameEvidence, carValueNotEnteredNotes,
  earmarkLeavesOut, earmarkLeavesOutWords, asksCashOrInvestments, maturityClass, assetAllocation,
} from '../../../src/domain/assets';
import { itemizeMissingCount } from '../../../src/domain/assets/itemize';
import {
  estimatedAccrued, maturityParts, isPastMaturity, yearlyInterestNow, pricedLikeBond, type BondInfo,
  yearsToMaturity, bondInfo, bondSummary,
} from '../../../src/domain/bonds';
import { classifyHoldingClass } from '../../../Calculation Module code/engines/holding-class';
import { windowTotal, totalShares, contractMultiplier, capGains, worthWithInterest } from '../../../src/domain/performance';
import { plural } from '../../../src/domain/_shared/plural';
import * as lookBackModule from '../../../src/domain/performance/lookBack';
import { applyTransaction } from '../../../src/domain/transactions';
import { timeWeightedReturn, movementsOf } from '../../../Calculation Module code/engines/time-weighted-return';
import { notClassifiedWords, theAlternativesOutlook } from './alternatives-outlook';
import { theBonds } from './bonds';
import { theAccount } from './account';
import { theNetWorth } from './net-worth';
import { theEmergencyFund } from './emergency-fund';
import { theHolding } from './holding';
import { theLookBack } from './look-back';
import { thePerformance, whyNoReturn } from './performance';

jest.mock('../../../src/domain/performance/lookBack', () => {
  const actual = jest.requireActual('../../../src/domain/performance/lookBack');
  return { ...actual, lookBack: jest.fn(actual.lookBack) };
});

// ── the functions the app does not export, compiled from their own source text ──────────────────────
const sourceSlice = (file: string, start: string, end: string) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = text.indexOf(start);
  const to = text.indexOf(end, at);
  if (at < 0 || to < 0) throw new Error(`${start} not found in ${file}`);
  return ts.transpileModule(text.slice(at, to), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
};
// plural is handed in too since 2026-10-13: the sentence's has / have comes from the one list (MK-NW-F-130)
// writeFigure and the declared figures since 2026-10-19: the sentence writes its two amounts under MK-PF-M-021 / 022 (DEC-6076)
// worthWithInterest since 2026-10-19: a bond's gain counts the interest it was paid in the window (DEC-6212)
const perf = new Function('windowTotal', 'totalShares', 'contractMultiplier', 'plural', 'writeFigure', 'PERFORMANCE_FIGURES', 'worthWithInterest',
  `${sourceSlice('performance.ts', 'function gainOfRow(', '/** MK-NW-F-092 ')}\nreturn { gainOfRow, heldValueOf, gainRowName, notIncludedSentence };`,
)(windowTotal, totalShares, contractMultiplier, plural, writeFigure, PERFORMANCE_FIGURES, worthWithInterest);
const gainOfRow: (r: any, years: number) => number | null = perf.gainOfRow;
const heldValueOf: (r: any) => number | null = perf.heldValueOf;
const gainRowName: (r: any) => string = perf.gainRowName;
const notIncludedSentence: (left: { name: string; value: number | null }[], countedValue: number) => string = perf.notIncludedSentence;
const valueEntered: (a: any) => boolean = new Function(
  `${sourceSlice('../../../src/domain/assets/index.ts', 'const valueEntered = ', '\n/** (DEC-4036j')}\nreturn valueEntered;`)();

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const D = (iso: string, h = 0, mi = 0) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, h, mi); };
const NOW = D('2026-10-13');
const TODAY = '2026-10-13';
const nothing = (v: unknown) => v ?? null;
const acct = (o: Record<string, any> = {}) => ({ asset_id: 'a', label: 'Account', tax_bucket: 'TAXABLE', target_return: 0.06, ...o }) as any;
const bondAcct = (o: Record<string, any>) => acct({ asset_class: 'bonds', kind: 'fixed_income', ...o });
const cdAcct = (o: Record<string, any>) => acct({ asset_class: 'bonds', kind: 'cd', ...o });
const bond = (o: Partial<BondInfo>): BondInfo => ({ face: null, couponRate: null, maturity: '', value: 0, accruedInterest: null, isCd: false, cdBought: 'bank', ...o });
const prop = (id: string, use: string | null) =>
  acct({ asset_id: id, label: id, kind: 'home', tax_bucket: 'PROPERTY', balance: 300000, ...(use ? { re_use: use } : {}) });
const entered = <T,>(list: T[]) => [...list].reverse();   // OpenAI's entry order → the app's newest-first list
const rentFor = (property_id: string | null, income: number) => ({ type: 'long', property_id, income, expenses: 0 });
const uses = (m: Map<string, string>) => Object.fromEntries([...m].sort(([x], [y]) => x.localeCompare(y)));
const pos = (ticker: string | null, name: string, shares: number, price: number | null, tag: string) =>
  ({ position_id: `${ticker ?? name}`, ticker, name, asset_class: tag, last_price: price, lots: [{ shares, cost_per_share: 0, purchase_date: '' }] });
const linked = (o: Record<string, any>, cash: number, positions: any[]) =>
  acct({ kind: 'brokerage', source: 'connected', cash_balance: cash, positions, ...o });
const day = (date: string, values: Record<string, number>, holdings: any[] = []) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings,
  accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
const handAcct = (balance: number, o: Record<string, any> = {}) => acct({ asset_id: 'a', kind: 'brokerage', asset_class: 'stocks_etf', balance, ...o });
const debt = (o: Record<string, any>) => ({ debt_id: 'd', label: 'Car loan', debt_type: 'AUTO', interest_rate_apr: 0.05, ...o }) as any;

// ═══════════════════════════════════════════════════════ FUNCTIONS ═══════════════════════════════════════

describe('MK-NW-F-117 propertyUseMap — five cases', () => {
  test('easy · Explicit rent entry makes named property a rental', () => {
    expect(uses(propertyUseMap(entered([prop('home', 'primary'), prop('rental', null)]), [rentFor('rental', 1800)] as any)))
      .toEqual({ home: 'home', rental: 'rental' });
  });
  test('easy · One marked home, other property with no rent', () => {
    expect(uses(propertyUseMap(entered([prop('p1', 'primary'), prop('p2', null)]), []))).toEqual({ p1: 'home', p2: 'second' });
  });
  // THE null-vs-[] CONTRACT (OpenAI's P0 question), read from the code: `told = Array.isArray(rentals)`. null or
  // missing = the Income screen's entries were NOT handed in (unknown) — a stored 'rental' word stands. [] = handed in,
  // and none names the property — a stored 'rental' is a second home. That is DEC-1926 ("unless rental income is added
  // on the income screen, assume property is second or vacation home") and DEC-3035p ("handed the rent entries, a
  // property is a rental only when an entry names it"). No conflict: the fallback is only for unknown entries.
  test('complex · No rent list supplied: stored rental may be used as fallback', () => {
    expect(uses(propertyUseMap(entered([prop('p1', 'rental'), prop('p2', null)]), null))).toEqual({ p1: 'rental', p2: 'home' });
  });
  test('complex · Orphan rent entry does not make the only property a rental', () => {
    expect(uses(propertyUseMap([prop('p1', null)], [rentFor(null, 1000)] as any))).toEqual({ p1: 'home' });
  });
  // BRIEF WRONG: p1 'rental' — right is 'second'. rentals is [] — handed in, and empty — so the stored 'rental' word no
  // longer counts (DEC-1926, DEC-3035p; the card: "or — ONLY when no rent entries were handed in at all (unknown, not
  // none) — when it is stored as a rental"). OpenAI's own title for case 3 draws the line at null; here it reads [] as
  // null. p2 is the home: the only property not stored as a rental, no use stated on any (DEC-2747e; DEC-4913 does not
  // stop it — a stored 'rental' word is not a stated use, the card says so in brackets).
  test.failing('edge · No marked home; stored rental should not become default home', () => {
    expect(uses(propertyUseMap(entered([prop('p1', 'rental'), prop('p2', null)]), []))).toEqual({ p1: 'rental', p2: 'home' });
  });
  test('edge · No marked home; stored rental should not become default home — the app\'s answer', () => {
    expect(uses(propertyUseMap(entered([prop('p1', 'rental'), prop('p2', null)]), []))).toEqual({ p1: 'second', p2: 'home' });
    // and whichever was entered first, the stored rental is never made the home
    expect(uses(propertyUseMap([prop('p1', 'rental'), prop('p2', null)], []))).toEqual({ p1: 'second', p2: 'home' });
  });
  // DEC-4913 (2026-10-13), as coded today: B marked home with rent entered is a rental; A, nothing stated, is a second home
  test('DEC-4913 · a stated use on any property stops the entered-first fallback', () => {
    expect(uses(propertyUseMap(entered([prop('A', null), prop('B', 'primary')]), [rentFor('B', 2000)] as any))).toEqual({ A: 'second', B: 'rental' });
  });
});

describe('MK-NW-F-118 itemizeMissingCount — five cases', () => {
  const items = (values: any[]) => values.map((v, i) => ({ cls: 'stocks_etf', label: String(i), ...(v === undefined ? {} : { value: v }) })) as any;
  test('easy · All holdings valued', () => { expect(itemizeMissingCount(items([10, 0, 2.5]))).toBe(0); });
  test('easy · Two missing values', () => { expect(itemizeMissingCount(items([10, null, undefined, 'n/a']))).toBe(3); });
  test('complex · Numeric strings are not numbers unless source parser converts them', () => { expect(itemizeMissingCount(items(['12.50', 12.5]))).toBe(1); });
  test('complex · Negative numeric value is entered, not missing', () => { expect(itemizeMissingCount(items([-25, 0, null]))).toBe(1); });
  test('edge · Empty list', () => { expect(itemizeMissingCount([])).toBe(0); });
});

describe('MK-NW-F-119 estimatedAccrued — five cases', () => {
  // THE CODE'S DAY COUNT (bonds/index.ts estimatedAccrued): coupons fall yearly on the maturity date's anniversaries;
  // days = calendar days from the last anniversary on or before today to today; the denominator = the calendar days
  // from that anniversary to the next one (365, or 366 when the coupon year holds a 29 February) — actual/actual by
  // coupon year. On an anniversary itself nothing has accrued (null).
  test('easy · Annual coupon anniversary date has no accrual', () => {
    expect(estimatedAccrued(bond({ face: 10000, couponRate: 0.05, maturity: '2027-06-15', value: 10000 }), D('2026-06-15'))).toBeNull();
  });
  // 2025-06-15 → 2025-09-14 = 15 + 31 + 31 + 14 = 91 days; 2025-06-15 → 2026-06-15 = 365. $50,000 × 4% × 91 ÷ 365
  test('easy · Accrued interest for 91 days in a 365-day coupon year', () => {
    const r = estimatedAccrued(bond({ face: 50000, couponRate: 0.04, maturity: '2026-06-15', value: 50000 }), D('2025-09-14'))!;
    expect(r.days).toBe(91);
    expect(r.amount).toBeCloseTo(498.6301369863, 9);
  });
  // BLOCKED (OpenAI's own marker), RESOLVED from the code's convention above: last coupon 2025-12-31, next 2026-12-31
  // (365 days); 2025-12-31 → 2026-03-31 = 31 + 28 + 31 = 90 days. $10,000 × 6% × 90 ÷ 365 = $147.945205479452. A broker CD
  // is priced like a bond (DEC-3837), so it is estimated. OpenAI's null was a placeholder "rather than a guessed amount";
  // kept here as written, and the resolved answer pinned beside it.
  test.failing('complex · Broker CD follows bond accrued-interest path', () => {
    expect(estimatedAccrued(bond({ isCd: true, cdBought: 'broker', face: 10000, couponRate: 0.06, maturity: '2027-12-31', value: 10000 }), D('2026-03-31'))).toBeNull();
  });
  test('complex · Broker CD follows bond accrued-interest path — resolved from the code\'s day count', () => {
    const r = estimatedAccrued(bond({ isCd: true, cdBought: 'broker', face: 10000, couponRate: 0.06, maturity: '2027-12-31', value: 10000 }), D('2026-03-31'))!;
    expect(r.days).toBe(90);
    expect(r.amount).toBeCloseTo(147.945205479452, 9);
    // the leap-year side of the same convention: coupon year 2027-12-31 → 2028-12-31 holds 29 Feb 2028, so 366
    const leap = estimatedAccrued(bond({ face: 10000, couponRate: 0.06, maturity: '2029-12-31', value: 10000 }), D('2028-03-31'))!;
    expect(leap.days).toBe(91);
    expect(leap.amount).toBeCloseTo(10000 * 0.06 * 91 / 366, 9);
  });
  test('complex · Bank CD is not accrued like a bond', () => {
    expect(estimatedAccrued(bond({ isCd: true, cdBought: 'bank', face: 10000, couponRate: 0.05, maturity: '2027-06-15', value: 10000 }), D('2026-03-01'))).toBeNull();
  });
  test('edge · Missing face, zero rate, impossible date all refuse', () => {
    expect(estimatedAccrued(bond({ face: null, couponRate: 0, maturity: '2026-02-30', value: 10000 }), D('2026-01-01'))).toBeNull();
  });
});

describe('MK-NW-F-120 classEvidenceOf — five cases', () => {
  test('easy · Real maturity date outranks account name evidence', () => {
    expect(classEvidenceOf(acct({ kind: 'savings', label: 'Savings', maturity_date: '2030-01-01' }))).toBe('bonds');
  });
  test('easy · Property name is not class evidence', () => {
    expect(classEvidenceOf(acct({ kind: 'home', tax_bucket: 'PROPERTY', label: 'Bond Street House', maturity_date: null }))).toBeNull();
  });
  test('complex · Impossible maturity date treated as absent; name can provide evidence', () => {
    expect(maturityClass('2030-02-30')).toBe('cash');   // no date
    expect(classEvidenceOf(acct({ label: 'Treasury Bond 2030', maturity_date: '2030-02-30' }))).toBe('bonds');
  });
  test('complex · Name with no class evidence returns null', () => {
    expect(classEvidenceOf(acct({ label: 'Main account', maturity_date: null }))).toBeNull();
  });
  test('edge · Wrapper/tax type must not override maturity-first evidence', () => {
    expect(classEvidenceOf(acct({ kind: 'roth_ira', tax_bucket: 'ROTH', label: 'Roth IRA', maturity_date: '2031-05-01' }))).toBe('bonds');
  });
});

describe('MK-NW-F-121 holdingTagClass — five cases', () => {
  test('easy · bond tag', () => { expect(holdingTagClass('bond')).toBe('bonds'); });
  test('easy · other tag', () => { expect(holdingTagClass('other')).toBe('alternatives'); });
  test('complex · cash tag and stock_etf tag', () => { expect(['cash', 'stock_etf'].map(holdingTagClass)).toEqual(['cash', 'stocks_etf']); });
  test('complex · Unknown non-empty tag defaults to stocks/funds', () => { expect(holdingTagClass('legacy_tag')).toBe('stocks_etf'); });
  test('edge · Null/empty tag means no stored class', () => { expect([null, ''].map(holdingTagClass)).toEqual([null, null]); });
});

describe('MK-NW-F-122 holdingTagFor — five cases', () => {
  test('easy · Cash class returns cash tag', () => { expect(holdingTagFor('cash')).toBe('cash'); });
  test('easy · Alternatives class returns other tag', () => { expect(holdingTagFor('alternatives')).toBe('other'); });
  test('complex · All four supported classes', () => {
    expect((['bonds', 'alternatives', 'cash', 'stocks_etf'] as const).map(holdingTagFor)).toEqual(['bond', 'other', 'cash', 'stock_etf']);
    // the round trip holds for exactly these four
    expect(['bond', 'other', 'cash', 'stock_etf'].map((t) => holdingTagFor(holdingTagClass(t)!))).toEqual(['bond', 'other', 'cash', 'stock_etf']);
  });
  test('complex · Unrecognized class has no tag', () => { expect(holdingTagFor('mixed')).toBeNull(); });
  test('edge · Class value is null/invalid', () => { expect(holdingTagFor(null as any)).toBeNull(); expect(holdingTagFor('nonsense' as any)).toBeNull(); });
});

describe('MK-NW-F-123 holdingNameEvidence — five cases', () => {
  test('easy · Ticker and description clearly identify Treasury', () => {
    expect(holdingNameEvidence({ ticker: 'UST2030', description: 'US Treasury Note' })).toBe('bonds');
  });
  test('easy · Money-market fund is Stocks / Funds, not cash', () => {
    expect(holdingNameEvidence({ ticker: 'VMFXX', description: 'Vanguard Federal Money Market Fund' })).toBe('stocks_etf');
  });
  // BRIEF WRONG: 'Stocks / Funds' — right is null. Name evidence is what moves a holding AWAY from its stored tag, and
  // the one list of evidence words (Calculation Module code/engines/holding-class.ts nameEvidence — the owner's B7 rule
  // and DEC-0051) names money-market funds, sweep cash, T-bill funds, options, crypto, commodities, currency, bonds and
  // CDs — no equity words. "Apple Inc common stock" says nothing on that list, so the stored tag decides (holdingTagClass
  // 'stock_etf' → Stocks / Funds), and with no tag the app asks rather than guesses (DEC-2160, "Refuse the line and ask").
  test.failing('complex · Ticker and description jointly supply evidence', () => {
    expect(holdingNameEvidence({ ticker: 'AAPL', description: 'Apple Inc common stock' })).toBe('stocks_etf');
  });
  test('complex · Ticker and description jointly supply evidence — the app\'s answer', () => {
    expect(holdingNameEvidence({ ticker: 'AAPL', description: 'Apple Inc common stock' })).toBeNull();
  });
  test('complex · Ambiguous words return null', () => { expect(holdingNameEvidence({ ticker: 'ABC', description: 'Core Portfolio' })).toBeNull(); });
  test('edge · CD/t-bill wording maps Bonds & CDs, even when ticker generic', () => {
    expect(holdingNameEvidence({ ticker: 'FUNDX', description: 'Brokered CD 4.5%' })).toBe('bonds');
  });
});

describe('MK-NW-F-124 maturityParts — five cases', () => {
  test('easy · Valid leap day', () => { expect(maturityParts('2028-02-29')).toEqual([2028, 2, 29]); });
  test('easy · Valid ISO date', () => { expect(maturityParts('2030-12-31')).toEqual([2030, 12, 31]); });
  test('complex · Impossible non-leap February day', () => { expect(maturityParts('2027-02-29')).toBeNull(); });
  test('complex · Month 13 / alternate format refused', () => { expect(['2028-13-01', '06/15/2028'].map(maturityParts)).toEqual([null, null]); });
  // SETTLED 2026-10-13 (first half): '2028-2-09' — a month with no leading zero — read as 9 Feb 2028 here, while
  // maturityClass (MK-NW-F-009) read the same text as NO date. One maturity, two readings: MK-NW-F-120 classEvidenceOf
  // did not call it a bond, while isPastMaturity, yearsToMaturity and estimatedAccrued treated it as 9 Feb 2028. The
  // card: "Nothing when ... it is written another way"; F-120's card: "the same reading as MK-NW-F-009 maturityClass";
  // tenet 4 (one thing, one number). Now one reader (src/domain/_shared/dates.ts maturityParts) serves every one of them.
  // BRIEF WRONG (second half): ' 2028-02-09 ' with spaces round it is the same written date, and BOTH readers agree on it
  // (spaces round a date do not unmake it) — [2028, 2, 9] is right; OpenAI itself wrote "exact whitespace normalization
  // needs source confirmation", and the source accepts it in both places.
  test.failing('edge · Zero-padded requirement and whitespace', () => {
    expect(['2028-2-09', ' 2028-02-09 '].map(maturityParts)).toEqual([null, null]);
  });
  test('edge · Zero-padded requirement — SETTLED 2026-10-13: an unpadded month is no date, as maturityClass reads it', () => {
    expect(maturityParts('2028-2-09')).toBeNull();
  });
  test('edge · Zero-padded requirement and whitespace — the app\'s answer for the whitespace half', () => {
    expect(maturityParts(' 2028-02-09 ')).toEqual([2028, 2, 9]);
    expect(maturityClass(' 2028-02-09 ')).toBe('bonds');     // agreed: spaces round a date do not unmake it
  });
  // SETTLED 2026-10-13 — EVERY MATURITY READER GIVES THE ONE READING. For each odd text: the class (F-009), the class
  // evidence (F-120), the date's parts (F-124), the years left (F-058), matured or not (F-125), the interest earned so
  // far (F-119), the bond's facts (bondInfo F-056), the next maturity (bondSummary F-061), the order on the Bonds screen
  // (theBonds O-001) and the holding-class engine (MK-ST-F-011) all say "a date" or all say "no date".
  test('SETTLED 2026-10-13 · every maturity reader agrees on the odd dates', () => {
    const now = D('2026-10-13');
    const cases: [string, [number, number, number] | null][] = [
      ['2028-2-09', null], ['2028-02-30', null], [' 2028-02-09 ', [2028, 2, 9]], ['2028-02', [2028, 2, 1]], ['tomorrow', null],
      ['2028-02-09T00:00', null], ['2028-02-091', null], ['2027-02-29', null], ['2028-02-29', [2028, 2, 29]], ['', null],
    ];
    const seen: string[] = [];
    for (const [text, want] of cases) {
      const isDate = want != null;
      const iso = want ? `${want[0]}-${String(want[1]).padStart(2, '0')}-${String(want[2]).padStart(2, '0')}` : '';
      const a = acct({ kind: 'fixed_income', label: 'Holding 7', maturity_date: text, face_value: 10000, coupon_rate: 0.04, balance: 10000 });
      const b = bond({ face: 10000, couponRate: 0.04, maturity: text, value: 10000 });
      expect([text, maturityParts(text)]).toEqual([text, want]);
      expect([text, maturityClass(text)]).toEqual([text, isDate ? 'bonds' : 'cash']);
      expect([text, classEvidenceOf(acct({ label: 'Holding 7', maturity_date: text }))]).toEqual([text, isDate ? 'bonds' : null]);
      expect([text, yearsToMaturity(text, now) != null]).toEqual([text, isDate]);
      expect([text, isPastMaturity(text, now)]).toEqual([text, false]);          // every date here is after today
      expect([text, estimatedAccrued(b, now) != null]).toEqual([text, isDate]);
      expect([text, bondInfo(a).maturity]).toEqual([text, iso]);
      expect([text, bondSummary([bondInfo(a)], now).nextMaturity]).toEqual([text, isDate ? iso : null]);
      expect([text, classifyHoldingClass({ name: 'Holding 7', maturityDate: text }).source === 'maturity']).toEqual([text, isDate]);
      // the Bonds screen's order: a text that is no date sorts with the dateless, after a real date
      const rows = theBonds({ accounts: [a, acct({ asset_id: 'z', kind: 'fixed_income', label: 'Holding 8', maturity_date: '2030-01-01', balance: 1 })], today: now }).rows;
      expect([text, rows.map((r) => r.accountId)]).toEqual([text, isDate ? [String(a.asset_id), 'z'] : ['z', String(a.asset_id)]]);
      seen.push(text);
    }
    expect(seen.length).toBe(cases.length);   // a guard proves it looked: ten texts, every reader asked of each
  });
});

describe('MK-NW-F-125 isPastMaturity — five cases', () => {
  test('easy · Day before maturity is not past', () => { expect(isPastMaturity('2026-10-14', NOW)).toBe(false); });
  test('easy · Day after maturity is past', () => { expect(isPastMaturity('2026-10-12', NOW)).toBe(true); });
  test('complex · Maturity today is not past', () => { expect(isPastMaturity('2026-10-13', NOW)).toBe(false); });
  test('complex · Invalid and missing dates are not past', () => { expect(['2026-02-30', ''].map((m) => isPastMaturity(m, NOW))).toEqual([false, false]); });
  // 23:30 on 13 Oct on the device's own clock (UTC-07:00 is 06:30 UTC on the 14th): still the maturity day
  test('edge · Timezone edge: compare calendar dates, not UTC instant', () => { expect(isPastMaturity('2026-10-13', D('2026-10-13', 23, 30))).toBe(false); });
});

describe('MK-NW-F-126 yearlyInterestNow — five cases', () => {
  test('easy · Face times rate for live bond', () => {
    expect(yearlyInterestNow(bond({ face: 10000, value: 9500, couponRate: 0.04, maturity: '2030-01-01' }), NOW)!).toBeCloseTo(400, 6);
  });
  test('easy · Missing face falls back to value times rate', () => {
    expect(yearlyInterestNow(bond({ face: null, value: 8000, couponRate: 0.03, maturity: '2030-01-01' }), NOW)!).toBeCloseTo(240, 6);
  });
  test('complex · Past maturity returns numeric zero', () => {
    expect(yearlyInterestNow(bond({ face: 10000, couponRate: 0.05, maturity: '2026-10-12' }), NOW)).toBe(0);
  });
  test('complex · Missing rate remains unknown, not zero', () => {
    expect(yearlyInterestNow(bond({ face: 10000, couponRate: null, maturity: '2030-01-01' }), NOW)).toBeNull();
  });
  test('edge · Maturity today is still paying; impossible date is not past', () => {
    const r = ['2026-10-13', '2026-02-30'].map((m) => yearlyInterestNow(bond({ face: 5000, couponRate: 0.02, maturity: m }), NOW)!);
    expect(r[0]).toBeCloseTo(100, 6);
    expect(r[1]).toBeCloseTo(100, 6);
  });
});

describe('MK-NW-F-127 gainOfRow — five cases', () => {
  test('easy · Bought during window: value less cost', () => { expect(gainOfRow({ cappedSince: '2026-01-01', gain: 1200 - 1000, marketValue: 1200 }, 1)).toBe(200); });
  test('easy · CD rate 5% for one year', () => { expect(gainOfRow({ marketValue: 10500, couponRate: 0.05 }, 1)!).toBeCloseTo(500, 6); });
  // the window's own total (periodTotal) is used as given, never compounded: $1,100 × (1 − 1 ÷ 1.1) = $100. Handed as a
  // periodReturn with no total, over 2 years it is a YEARLY rate (card): 1.1² − 1 = 21%, $1,100 × (1 − 1 ÷ 1.21) = $190.91
  test('complex · Whole-window return row uses window total, not annual rate', () => {
    expect(gainOfRow({ marketValue: 1100, periodReturn: 0.1, periodTotal: 0.1 }, 2)!).toBeCloseTo(100, 6);
    expect(gainOfRow({ marketValue: 1100, periodReturn: 0.1 }, 2)!).toBeCloseTo(1100 * (1 - 1 / 1.21), 6);
  });
  test('complex · Unknown price history for positive holding propagates null', () => {
    expect(gainOfRow({ marketValue: 500, periodReturn: null, couponRate: null }, 1)).toBeNull();
  });
  test('edge · Empty holding gain is zero', () => { expect(gainOfRow({ marketValue: 0 }, 2)).toBe(0); });
});

describe('MK-NW-F-128 heldValueOf — five cases', () => {
  test('easy · Market value above zero wins', () => {
    expect(heldValueOf({ marketValue: 1250, position: { lots: [{ shares: 10 }], last_price: 100, value_now: 900 } })).toBe(1250);
  });
  test('easy · Shares × last price × option multiplier', () => {
    expect(heldValueOf({ marketValue: undefined, position: { kind: 'options', multiplier: 100, lots: [{ shares: 2 }], last_price: 15 } })).toBe(3000);
  });
  test('complex · Use hand-built value if no market mark', () => {
    expect(heldValueOf({ marketValue: 0, position: { lots: [{ shares: null }], last_price: undefined, value_now: 450 } })).toBe(450);
  });
  test('complex · Known zero shares means zero value', () => {
    expect(heldValueOf({ marketValue: undefined, position: { lots: [{ shares: 0 }] } })).toBe(0);
  });
  test('edge · Shares but no price and no built value is unknown', () => {
    expect(heldValueOf({ marketValue: undefined, position: { lots: [{ shares: 5 }] } })).toBeNull();
  });
});

describe('MK-NW-F-129 gainRowName — five cases', () => {
  test('easy · Use supplied holding name', () => { expect(gainRowName({ name: 'Apple Inc', position: { ticker: 'AAPL' } })).toBe('Apple Inc'); });
  test('easy · Ticker used when no name', () => { expect(gainRowName({ position: { ticker: 'AAPL' } })).toBe('AAPL'); });
  test('complex · CUSIP-shaped ticker gives way to security name', () => {
    expect(gainRowName({ name: 'US Treasury 2030', position: { ticker: '91282CJL6' } })).toBe('US Treasury 2030');
    // the security's own name (position name) beside a CUSIP wins too — the card's "unless" branch
    expect(gainRowName({ position: { ticker: '91282CJL6', name: 'US Treasury 2030' } })).toBe('US Treasury 2030');
  });
  test('complex · Non-CUSIP ticker remains fallback', () => { expect(gainRowName({ position: { ticker: '91282CJL6' } })).toBe('91282CJL6'); });
  test('edge · No name and no ticker', () => { expect(gainRowName({ position: {} })).toBe('a holding'); expect(gainRowName({})).toBe('a holding'); });
});

// SETTLED 2026-10-13 by DEC-5068: the sentence these cases pinned ("The beginning can't be worked back: … has no price
// history.") is replaced by his: "Wealth generated and Return do not include <name>'s gains, as it has no price history."
// Each case keeps its names, its de-duplication and its has / have; only the words around the names moved.
describe('MK-NW-F-130 notIncludedSentence — five cases', () => {
  // REWORDED 2026-10-19 by DEC-6076 ("approved."): values unknown here (null) so no brackets, nothing counted so only the
  // second sentence; the names, their de-duplication and has / have are what these cases hold.
  const un = (...names: string[]) => names.map((name) => ({ name, value: null }));
  test('easy · Single name uses has', () => {
    expect(notIncludedSentence(un('Treasury 2030'), 0)).toBe('Treasury 2030 has no price history, so its gains are not included.');
  });
  test('easy · No names uses generic holding', () => {
    expect(notIncludedSentence([], 0)).toBe('A holding has no price history, so its gains are not included.');
  });
  test('complex · Deduplicate names and join three with Oxford-style and', () => {
    expect(notIncludedSentence(un('Apple', 'Treasury', 'Apple', 'Gold'), 0)).toBe('Apple, Treasury and Gold have no price history, so their gains are not included.');
  });
  test('complex · Duplicate only yields singular grammar', () => {
    expect(notIncludedSentence(un('ETF', 'ETF'), 0)).toBe('ETF has no price history, so its gains are not included.');
  });
  // SETTLED 2026-10-13: blank names are dropped and duplicates named once, then has / have comes from the one list.
  test('edge · Whitespace/name handling must not produce duplicate blanks', () => {
    expect(notIncludedSentence(un('', 'Treasury', 'Treasury'), 0)).toBe('Treasury has no price history, so its gains are not included.');
  });
  test('edge · Whitespace/name handling — names all blank read as no name, and spaces round a name are not a second name', () => {
    expect(notIncludedSentence(un('', '  '), 0)).toBe('A holding has no price history, so its gains are not included.');
    expect(notIncludedSentence(un(' Apple', 'Apple ', '', 'Gold'), 0)).toBe('Apple and Gold have no price history, so their gains are not included.');
    expect(gainRowName({ name: '', position: { ticker: '', name: '' } })).toBe('a holding');
  });
});

describe('MK-NW-F-131 pricedLikeBond — five cases', () => {
  test('easy · Non-CD bond is priced like bond', () => { expect(pricedLikeBond(bond({ isCd: false }))).toBe(true); });
  test('easy · Broker CD is priced like bond', () => { expect(pricedLikeBond(bond({ isCd: true, cdBought: 'broker' }))).toBe(true); });
  test('complex · Bank CD is not priced like bond', () => { expect(pricedLikeBond(bond({ isCd: true, cdBought: 'bank' }))).toBe(false); });
  test('complex · Unanswered CD source defaults to bank treatment', () => { expect(pricedLikeBond(bond({ isCd: true, cdBought: undefined }))).toBe(false); });
  test('edge · Institution name cannot decide CD purchase channel', () => {
    // through the account reader too: an institution called "Brokerage Capital" sets nothing
    const b = theBonds({ accounts: [cdAcct({ asset_id: 'c', institution: 'Brokerage Capital', balance: 1000, face_value: 1000, coupon_rate: 0.04, maturity_date: '2028-01-01' })], today: NOW });
    expect(b.rows[0].pricedLikeBond).toBe(false);
  });
});

describe('MK-NW-F-132 notClassifiedWords — five cases', () => {
  test('easy · Whole-dollar unclassified amount', () => { expect(notClassifiedWords(1250)).toBe('$1,250 asset type not classified'); });
  test('easy · Zero amount formatting', () => { expect(notClassifiedWords(0)).toBe('$0 asset type not classified'); });
  // BRIEF WRONG ×3 (cases 3, 4, 5): the amount is an account balance part, and a balance is shown in WHOLE DOLLARS
  // (precision-and-display standard, his ruling Q49: "Totals, balances, projections — whole dollars", formatter money).
  // OpenAI wrote "verify currency locale" / "do not use guessed formatting as authoritative" itself. −12.5 rounds to
  // −12 (JavaScript rounds a half toward +∞), 12.345 to 12, 1,234,567.89 to 1,234,568.
  test.failing('complex · Negative amount formatting', () => { expect(notClassifiedWords(-12.5)).toBe('-$12.50 asset type not classified'); });
  test('complex · Negative amount formatting — the app\'s answer', () => { expect(notClassifiedWords(-12.5)).toBe('-$12 asset type not classified'); });
  test.failing('complex · Cent precision', () => { expect(notClassifiedWords(12.345)).toBe('$12.35 asset type not classified'); });
  test('complex · Cent precision — the app\'s answer', () => { expect(notClassifiedWords(12.345)).toBe('$12 asset type not classified'); });
  test.failing('edge · Large amount grouping', () => { expect(notClassifiedWords(1234567.89)).toBe('$1,234,567.89 asset type not classified'); });
  test('edge · Large amount grouping — the app\'s answer', () => { expect(notClassifiedWords(1234567.89)).toBe('$1,234,568 asset type not classified'); });
});

describe('MK-NW-F-133 valueEntered — five cases', () => {
  test('easy · Explicit zero is entered', () => { expect(valueEntered({ balance: 0 })).toBe(true); });
  test('easy · Positive numeric value entered', () => { expect(valueEntered({ balance: 250 })).toBe(true); });
  test('complex · Missing balance not entered', () => { expect(valueEntered({})).toBe(false); });
  test('complex · Nonnumeric string not entered', () => { expect(valueEntered({ balance: 'unknown' })).toBe(false); });
  test('edge · Negative numeric balance still entered', () => { expect(valueEntered({ balance: -100 })).toBe(true); });
});

describe('MK-NW-F-134 carValueNotEnteredNotes — five cases', () => {
  const car = (id: string, o: Record<string, any> = {}) => acct({ asset_id: id, kind: 'vehicle', tax_bucket: 'PROPERTY', label: '', ...o });
  const PICKED = car('zz-car', { label: 'Driven car', balance: 30000 });   // valued, so the app picks it (see the header)
  const note = (n: string) => `${n}'s value not entered — it may be the car you drive.`;
  test('easy · Unpicked vehicle missing value gets note', () => {
    expect(carValueNotEnteredNotes([car('car1', { balance: null }), PICKED], new Map([['car1', 'Car A']]))).toEqual([note('Car A')]);
    // as written — the only vehicle, so the app picks it as the car you drive (with none valued every vehicle is a
    // candidate, DEC-4036j): no note. That is the pick rule, not this function; "not picked" cannot be said of it.
    expect(carValueNotEnteredNotes([car('car1', { balance: null })], new Map([['car1', 'Car A']]))).toEqual([]);
  });
  test('easy · No missing value means no note', () => {
    expect(carValueNotEnteredNotes([car('car1', { balance: 20000 })], new Map([['car1', 'Car A']]))).toEqual([]);
  });
  test('complex · Picked vehicle excluded, another missing vehicle included', () => {
    // neither valued: the app picks car1 (lowest id) — the one OpenAI marks picked
    expect(carValueNotEnteredNotes([car('car1', { balance: null }), car('car2', { balance: null })], new Map([['car1', 'Car A'], ['car2', 'Car B']]))).toEqual([note('Car B')]);
  });
  test('complex · Name fallback chain label then institution', () => {
    expect(carValueNotEnteredNotes([car('v1', { label: 'Vehicle 1', institution: 'Dealer', balance: null }), car('v2', { institution: 'Dealer', balance: null }), PICKED]))
      .toEqual([note('Vehicle 1'), note('Dealer')]);
  });
  test('edge · No usable names falls back to A vehicle', () => {
    expect(carValueNotEnteredNotes([car('v1', { balance: null }), PICKED])).toEqual([note('A vehicle')]);
  });
});

describe('MK-NW-F-135 earmarkLeavesOut — five cases', () => {
  const acc = (id: string, o: Record<string, any>) => acct({ asset_id: id, kind: 'brokerage', asset_class: 'stocks_etf', label: '', ...o });
  test('easy · Missing value and positive retirement share is left out', () => {
    expect(earmarkLeavesOut([acc('a', { label: '401(k)', balance: null, retirement_pct: 50 })])).toEqual(['401(k)']);
  });
  test('easy · Entered zero is not left out', () => { expect(earmarkLeavesOut([acc('a', { label: 'IRA', balance: 0, retirement_pct: 50 })])).toEqual([]); });
  // "default_retirement_share 0.6" cannot be handed in: the default is the app's own (earmarkDefault — 100% for an
  // account that is not the home, the car or a 529). Above zero either way, so the meaning holds.
  test('complex · Default positive share applies when no saved share', () => {
    expect(earmarkLeavesOut([acc('a', { label: 'Plan A', balance: null })])).toEqual(['Plan A']);
  });
  test('complex · Zero or negative share excluded', () => {
    expect(earmarkLeavesOut([acc('a', { label: 'Plan A', balance: null, retirement_pct: 0 }), acc('b', { label: 'Plan B', balance: null, retirement_pct: -10 })])).toEqual([]);
  });
  test('edge · Fallback name chain and multiple accounts', () => {
    expect(earmarkLeavesOut([acc('a', { label: 'Account A', balance: null, retirement_pct: 20 }), acc('b', { institution: 'Bank B', balance: null, retirement_pct: 20 }),
      acc('c', { balance: null, retirement_pct: 20 })])).toEqual(['Account A', 'Bank B', 'An account']);
  });
});

describe('MK-NW-F-136 earmarkLeavesOutWords — five cases', () => {
  const acc = (id: string, o: Record<string, any>) => acct({ asset_id: id, kind: 'brokerage', asset_class: 'stocks_etf', label: '', ...o });
  test('easy · One excluded account', () => {
    expect(earmarkLeavesOutWords([acc('a', { label: 'Linked 401(k)', balance: null, retirement_pct: 40 })])).toBe('leaves out Linked 401(k) — Value not entered');
  });
  test('easy · No excluded accounts returns null', () => { expect(earmarkLeavesOutWords([acc('a', { label: 'IRA', balance: 10000, retirement_pct: 40 })])).toBeNull(); });
  test('complex · Multiple excluded accounts comma-separated', () => {
    expect(earmarkLeavesOutWords([acc('a', { label: '401(k)', balance: null, retirement_pct: 40 }), acc('b', { label: 'IRA', balance: null, retirement_pct: 20 })]))
      .toBe('leaves out 401(k), IRA — Value not entered');
  });
  test('complex · Name fallback uses label/institution', () => {
    expect(earmarkLeavesOutWords([acc('a', { label: 'Plan A', balance: null, retirement_pct: 40 }), acc('b', { institution: 'Bank B', balance: null, retirement_pct: 20 })]))
      .toBe('leaves out Plan A, Bank B — Value not entered');
  });
  test('edge · Zero share does not trigger note', () => { expect(earmarkLeavesOutWords([acc('a', { label: 'IRA', balance: null, retirement_pct: 0 })])).toBeNull(); });
});

describe('MK-NW-F-137 asksCashOrInvestments — five cases', () => {
  const a = (asked: boolean | undefined, cls: string | undefined) => acct({ kind: 'brokerage', ...(asked ? { class_question: 'cash_or_investments' } : {}), ...(cls ? { asset_class: cls } : {}) });
  test('easy · Flagged and Unclassified asks question', () => { expect(asksCashOrInvestments(a(true, 'mixed'))).toBe(true); });
  test('easy · Flagged but classified does not ask', () => { expect(asksCashOrInvestments(a(true, 'cash'))).toBe(false); });
  test('complex · Unclassified but not flagged does not ask', () => { expect(asksCashOrInvestments(a(false, 'mixed'))).toBe(false); });
  test('complex · Different class values', () => { expect([a(true, 'mixed'), a(true, 'stocks_etf')].map(asksCashOrInvestments)).toEqual([true, false]); });
  test('edge · Missing flag/class is false, not inferred', () => { expect(asksCashOrInvestments({} as any)).toBe(false); });
});

// ═════════════════════════════════════════════════════ ORCHESTRATORS ═════════════════════════════════════

describe('MK-NW-O-001 theBonds — five cases', () => {
  test('easy · Sort maturity ascending and put undated last', () => {
    const b = theBonds({ today: NOW, accounts: [
      bondAcct({ asset_id: 'late', label: 'late', maturity_date: '2030-01-01', balance: 9000, face_value: 10000, coupon_rate: 0.04 }),
      bondAcct({ asset_id: 'soon', label: 'soon', maturity_date: '2027-01-01', balance: 9500, face_value: 10000, coupon_rate: 0.03 }),
      bondAcct({ asset_id: 'undated', label: 'undated', maturity_date: null, balance: 1000 })] });
    expect(b.rows.map((r) => r.accountId)).toEqual(['soon', 'late', 'undated']);
    // the rows add to the totals above them
    expect(b.totalValue).toBe(b.rows.reduce((t, r) => t + (r.value ?? 0), 0));
    expect(b.couponPerYear).toBeCloseTo(b.rows.reduce((t, r) => t + (r.couponPerYear ?? 0), 0), 6);
    expect(b.nextMaturity).toBe('2027-01-01');
  });
  test('easy · Totals and coupon use face value, not market value', () => {
    const b = theBonds({ today: NOW, accounts: [bondAcct({ face_value: 25000, coupon_rate: 0.045, balance: 24200, maturity_date: '2030-01-01' })] });
    expect({ count: b.count, total_value: b.totalValue, total_face_value: b.totalFace }).toEqual({ count: 1, total_value: 24200, total_face_value: 25000 });
    expect(b.couponPerYear).toBeCloseTo(1125, 6);
    // current yield on today's value, not on face: 1,125 ÷ 24,200
    expect(b.rows[0].currentYield!).toBeCloseTo(1125 / 24200, 9);
  });
  // by hand, the broker CD: 2 years exactly to maturity, on a coupon day (nothing accrued): 9,850 = 400/(1+y) +
  // 10,400/(1+y)² → y = 4.804473% (solved to 1e-12). The bank CD yields its stated 4.00% (DEC-3837).
  test('complex · Bank CD and broker CD take different YTM/sensitivity paths', () => {
    // the reviewer's bank CD is marked so (2026-10-21): a CD with no answer is no longer called a bank CD on its page — it asks
    const accounts = [cdAcct({ asset_id: 'bankcd', label: 'bankcd', cd_bought: 'bank', face_value: 10000, coupon_rate: 0.04, balance: 9850, maturity_date: '2028-10-13' }),
      cdAcct({ asset_id: 'brokercd', label: 'brokercd', cd_bought: 'broker', face_value: 10000, coupon_rate: 0.04, balance: 9850, maturity_date: '2028-10-13' })];
    const bank = theBonds({ accounts, accountId: 'bankcd', today: NOW }).one!;
    const broker = theBonds({ accounts, accountId: 'brokercd', today: NOW }).one!;
    expect(bank.yieldToMaturity!).toBeCloseTo(0.04, 9);
    expect(bank.ratesMove).toBeNull();
    expect(bank.ratesMoveRefusal).toMatch(/^Nothing happens to this CD\. It is not traded/);
    expect(broker.yieldToMaturity!).toBeCloseTo(0.04804472973350349, 4);
    expect(broker.ratesMove).not.toBeNull();
    expect(broker.ratesMoveRefusal).toBe('');
  });
  test('complex · Average yield excludes unpriced bond and separately names missing rate', () => {
    const b = theBonds({ today: NOW, accounts: [
      bondAcct({ asset_id: 'a', label: 'a', balance: 10000, face_value: 10000, coupon_rate: 0.05, maturity_date: '2030-01-01' }),
      bondAcct({ asset_id: 'b', label: 'b', balance: null, face_value: 10000, coupon_rate: 0.04, maturity_date: '2031-01-01' }),
      bondAcct({ asset_id: 'c', label: 'c', balance: 8000, face_value: 10000, coupon_rate: null, maturity_date: '2032-01-01' })] });
    expect(b.avgYield!).toBeCloseTo(500 / 10000, 9);   // only a: priced, with a rate — b and c are in neither half
    expect(b.leftOutOfAverage).toEqual(['b']);
    expect(b.leftOutNoRate).toEqual(['c']);
  });
  test('edge · Maturity today counts as matured in detail view', () => {
    const one = theBonds({ accounts: [bondAcct({ asset_id: 'x', face_value: 10000, coupon_rate: 0.05, balance: 10000, maturity_date: '2026-10-13' })], accountId: 'x', today: NOW }).one!;
    expect({ matured: one.matured, ytm: one.yieldToMaturity, sensitivity: one.ratesMove }).toEqual({ matured: true, ytm: null, sensitivity: null });
    expect(isPastMaturity('2026-10-13', NOW)).toBe(false);   // the stated difference: the helper says not past until tomorrow
  });
});

describe('MK-NW-O-002 theAccount — five cases', () => {
  test('easy · Account market value is balance; income totals records', () => {
    const r = theAccount({ account: acct({ asset_id: 'a', source: 'connected', cash_balance: 5000, balance: 5000 }),
      transactions: [{ account_id: 'a', type: 'DIVIDEND', amount: 25, date: '2026-10-01' }, { account_id: 'a', type: 'INTEREST', amount: 5, date: '2026-10-02' }] });
    expect({ market_value: r.marketValue, income: r.income }).toEqual({ market_value: 5000, income: 30 });
  });
  test('easy · No records means no income figure, not zero', () => {
    const r = theAccount({ account: acct({ asset_id: 'a', balance: 1000 }), transactions: [] });
    expect(r.income).toBeNull();
    expect(r.activityCount).toBe(0);
  });
  test('complex · Inbound transfer shows transferred amount, cash effect otherwise', () => {
    const r = theAccount({ account: acct({ asset_id: 'to', balance: 2000 }), transactions: [
      { id: 't1', account_id: 'from', counter_account_id: 'to', type: 'TRANSFER', amount: 500, date: '2026-10-01', source: 'connected' },
      { id: 't2', account_id: 'to', type: 'WITHDRAWAL', amount: 20, date: '2026-10-02', source: 'manual' }] });
    expect(r.activity.map((x) => x.amount)).toEqual([500, -20]);
    expect(r.activity.map((x) => x.mine)).toEqual([false, true]);
  });
  test('complex · Holding income ticker match ignores case; no ticker belongs to no holding', () => {
    const r = theAccount({ account: acct({ asset_id: 'a', balance: 2000 }), transactions: [
      { account_id: 'a', type: 'DIVIDEND', ticker: 'aapl', amount: 4, date: '2026-10-01' },
      { account_id: 'a', type: 'INTEREST', ticker: 'AAPL', amount: 2, date: '2026-10-02' },
      { account_id: 'a', type: 'DIVIDEND', ticker: null, amount: 10, date: '2026-10-03' }] });
    const h = r.incomeOfHolding('AAPL');
    expect(h.dividends + h.interest).toBe(6);
    expect(r.incomeOfHolding(null)).toEqual({ dividends: 0, interest: 0, words: '' });   // the untagged $10 belongs to no holding
    expect(r.income).toBe(16);                                                             // it is the account's
  });
  test('edge · Non-linked account has no inside breakdown', () => {
    const r = theAccount({ account: acct({ asset_id: 'a', kind: 'brokerage', balance: 1000 }), transactions: [{ account_id: 'a', type: 'INTEREST', amount: 1, date: '2026-10-01' }] });
    expect({ inside: r.inside, income: r.income }).toEqual({ inside: null, income: 1 });
  });
});

describe('MK-NW-O-003 theNetWorth — five cases', () => {
  const nw = (o: Record<string, any>) => theNetWorth({ uid: 'u1', accounts: [], debts: [], today: TODAY, ...o } as any);
  test('easy · Assets minus debts equals net worth', () => {
    const r = nw({ accounts: [acct({ asset_id: 'c', kind: 'checking', asset_class: 'cash', tax_bucket: 'CASH', balance: 10000 }), handAcct(5000, { asset_id: 'i' })],
      debts: [debt({ remaining_balance: 3000, minimum_monthly_payment: 100, monthly_payment: 150 })] });
    expect({ assets: r.assets, debts: r.debts, net_worth: r.netWorth, monthly_debt_minimum: r.monthlyDebtMinimum, monthly_debt_payments: r.monthlyDebtPayments })
      .toEqual({ assets: 15000, debts: 3000, net_worth: 12000, monthly_debt_minimum: 100, monthly_debt_payments: 150 });
    // the invariants: Cash + Investments + property = assets; class rows add to assets
    expect(r.cash + r.investments).toBe(r.assets);
    expect(Object.values(r.byClass).reduce((t, v) => t + v, 0)).toBe(r.assets);
    expect(r.assets - r.debts).toBe(r.netWorth);
  });
  test('easy · Debt payment lower than minimum uses minimum', () => {
    const r = nw({ debts: [debt({ remaining_balance: 1000, minimum_monthly_payment: 125, monthly_payment: 80 })] });
    expect({ monthly_debt_minimum: r.monthlyDebtMinimum, monthly_debt_payments: r.monthlyDebtPayments }).toEqual({ monthly_debt_minimum: 125, monthly_debt_payments: 125 });
  });
  // DEC-4439: the day's link = $11,000 ÷ ($10,000 + $1,000) − 1 = 0
  test('complex · Return is time-weighted and movement counts for whole day', () => {
    const r = nw({ accounts: [handAcct(11000)], since: '2026-10-12', snapshotDays: [day('2026-10-12', { a: 10000 })],
      transactions: [{ account_id: 'a', type: 'DEPOSIT', amount: 1000, date: '2026-10-13' }] });
    expect(r.investableChangePct).toBeCloseTo(0, 9);
    // never a Dietz or plain change: $11,000 ÷ $10,000 − 1 would read +10%
    expect(r.investableChangePct).not.toBeCloseTo(0.1, 3);
  });
  test('complex · Missing daily value on movement date refuses return', () => {
    const days = [day('2026-10-10', { a: 10000 }), day('2026-10-12', { a: 10500 })];
    const tx = [{ account_id: 'a', type: 'DEPOSIT', amount: 500, date: '2026-10-11' }];
    expect(nw({ accounts: [handAcct(10500)], since: '2026-10-10', snapshotDays: days, transactions: tx }).investableChangePct).toBeNull();
    // the reason, from the same engine and inputs the door hands it
    const v = timeWeightedReturn({ days: [...days, day(TODAY, { a: 10500 })] as any, accountIds: new Set(['a']), ...movementsOf(tx, new Set(['a'])), start: '2026-10-10', end: TODAY });
    expect(v).toMatchObject({ rate: null, refused: 'MOVEMENT_DAY_NOT_RECORDED', day: '2026-10-11' });
    expect(whyNoReturn(v)).toMatch(/^Money moved in or out on Oct 11, 2026 and no value was recorded that day/);
  });
  // a linked account: XYZ priced ($100 a share on the start day, $120 today, 10 shares) and H with no price today (1
  // share, $500 paid; $500 on the start day). Without H on every day: $1,200 ÷ $1,000 − 1 = 20%. With H left in the
  // start day only it would be $1,200 ÷ $1,500 − 1 = −20%; with H at cost on both days, $1,700 ÷ $1,500 − 1 = 13.33%.
  test('edge · Unknown-price holding excluded from every day of return window', () => {
    const a = acct({ asset_id: 'a', kind: 'brokerage', source: 'connected', cash_balance: 0, balance: 1700,
      positions: [{ position_id: 'x', ticker: 'XYZ', asset_class: 'stock_etf', last_price: 120, lots: [{ shares: 10, cost_per_share: 90, purchase_date: '2025-01-01' }] },
                  { position_id: 'h', ticker: 'H', asset_class: 'stock_etf', last_price: null, lots: [{ shares: 1, cost_per_share: 500, purchase_date: '2025-01-01' }] }] });
    const start = { date: '2026-10-01', origin: 'observed', writtenAt: '2026-10-01T00:00:00Z',
      holdings: [{ date: '2026-10-01', accountId: 'a', securityKey: 'XYZ', units: 10, price: 100, value: 1000, currency: 'USD' },
                 { date: '2026-10-01', accountId: 'a', securityKey: 'H', units: 1, price: 500, value: 500, currency: 'USD' }],
      accounts: [{ date: '2026-10-01', accountId: 'a', cash: 0, statedTotal: 1500, currency: 'USD' }] };
    const r = nw({ accounts: [a], since: '2026-10-01', snapshotDays: [start], transactions: [] });
    expect(r.investableChangePct).toBeCloseTo(0.2, 9);
  });
});

describe('MK-NW-O-004 theEmergencyFund — five cases', () => {
  beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(D('2026-10-13', 12)); });
  afterAll(() => { jest.useRealTimers(); });
  const checking = (bal: number) => acct({ asset_id: 'chk', label: 'Checking', kind: 'checking', asset_class: 'cash', tax_bucket: 'CASH', balance: bal });
  const need = (amount: number) => ({ id: 'groceries', label: 'Groceries', amount, bucket: 'flexible', tier: 'need' });
  const rental = prop('r', 'rental');
  test('easy · Cash divided by essentials plus debt minimums', () => {
    const e = theEmergencyFund({ accounts: [checking(10000)], expenses: [], profile: { spendCats: [need(1800)] }, debts: [debt({ remaining_balance: 5000, minimum_monthly_payment: 200 })] });
    expect(e.essentialsMonthly).toBeCloseTo(2000, 9);
    expect(e.monthsCovered!).toBeCloseTo(5, 9);
  });
  test('easy · Rent offsets monthly draw, but not below zero', () => {
    const e = theEmergencyFund({ accounts: [checking(12000), rental], expenses: [], profile: { spendCats: [need(2000)], rentals: [rentFor('r', 500)] } });
    expect(e.rentalIncomeMonthly).toBeCloseTo(500, 9);
    expect({ monthly_draw_from_cash: e.fromCashMonthly, months: e.monthsCovered }).toEqual({ monthly_draw_from_cash: 1500, months: 8 });
  });
  // logged in Sep 2026: $2,500 groceries + $300 logged against the mortgage + $1,200 under Rent / Mortgage = $4,000;
  // the mortgage ($300 minimum) is in Debts and on the home. Counted: $2,500 + the $300 minimum once = $2,800.
  test('complex · Debt-linked payments and mortgage budget are not double-counted', () => {
    const home = prop('h', 'primary');
    const e = theEmergencyFund({ accounts: [checking(10000), home],
      expenses: [{ id: 'e1', date: '2026-09-10', amount: 2500, category: 'Groceries', store: 'x' },
                 { id: 'e2', date: '2026-09-11', amount: 300, category: 'Debt payment', store: 'Mortgage' },
                 { id: 'e3', date: '2026-09-12', amount: 1200, category: 'Rent / Mortgage', store: 'x' }],
      profile: { spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 1200, bucket: 'fixed', tier: 'critical' }] },
      debts: [debt({ debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 200000, minimum_monthly_payment: 300, property_id: 'h' })] });
    expect(e.debtMinimums).toBe(300);
    expect(e.essentialsMonthly - e.debtMinimums).toBeCloseTo(2500, 9);   // counted essential expenses after exclusions
    expect(e.essentialsMonthly).toBeCloseTo(2800, 9);
    expect(e.rentLineInDebts).toEqual({ budgeted: 1200, mortgage: 'Mortgage' });   // the budget line is not counted
    expect(e.monthsCovered!).toBeCloseTo(10000 / 2800, 9);
  });
  test('complex · Unknown rent reports months without rent, not blank months', () => {
    const e = theEmergencyFund({ accounts: [checking(10000), rental], expenses: [], profile: { spendCats: [need(2000)], rentals: null } });
    expect({ months: e.monthsCovered, rent_unknown: e.rentNotKnown }).toEqual({ months: 5, rent_unknown: true });
    // the words sit on the screens, beside the months (DEC-3769, DEC-3836)
    for (const f of ['NetWorthScreen', 'JobSafetyScreen', 'StressTestScreen']) {
      expect(fs.readFileSync(path.join(__dirname, `../../../src/screens/${f}.tsx`), 'utf8')).toContain('rent not included. ');
    }
  });
  test('edge · Rent covers all essentials means no months figure', () => {
    const e = theEmergencyFund({ accounts: [checking(10000), rental], expenses: [], profile: { spendCats: [need(1500)], rentals: [rentFor('r', 2000)] } });
    expect({ monthly_draw_from_cash: e.fromCashMonthly, months: e.monthsCovered, rent_covers_month: e.rentCoversEssentials })
      .toEqual({ monthly_draw_from_cash: 0, months: null, rent_covers_month: true });
  });
});

describe('MK-NW-O-005 theAlternativesOutlook — five cases', () => {
  const alt = (id: string, kind: string, balance: number) => acct({ asset_id: id, label: id, kind, asset_class: 'alternatives', balance });
  const rowsAddUp = (o: ReturnType<typeof theAlternativesOutlook>) => expect(o.rows.reduce((t, r) => t + (r.value ?? 0), 0)).toBeCloseTo(o.totalValue, 6);
  test('easy · One classified alternative at 6%', () => {
    const o = theAlternativesOutlook({ accounts: [alt('a', 'hedge_funds', 10000)] });
    expect({ count: o.count, total_value: o.totalValue }).toEqual({ count: 1, total_value: 10000 });
    expect(o.expectedReturn!).toBeCloseTo(0.06, 9);
    expect(o.estimatedGrowthPerYear!).toBeCloseTo(600, 6);
    rowsAddUp(o);
  });
  // BLOCKED: b's 10% rate cannot be handed in — the rate is the benchmark for the holding's KIND, and no kind is 10%.
  // The case's rule is run instead with the app's own rates: a at 5% (other) $10,000; b a linked brokerage whose
  // $10,000 of alternatives is $5,000 of a priced bitcoin fund (crypto, 8%) and $5,000 nothing explains.
  // By hand: classified $15,000; growth $500 + $400 = $900; blended $900 ÷ $15,000 = 6.00%; not classified $5,000.
  test('easy · Weighted rate across classified parts (BLOCKED as written — run with the benchmark rates)', () => {
    const b = linked({ asset_id: 'b', label: 'b', balance: 10000 }, 0, [pos('IBIT', 'Bitcoin fund', 100, 50, 'other'), pos(null, 'Private stake', 1, null, 'other')]);
    const o = theAlternativesOutlook({ accounts: [alt('a', 'other_asset', 10000), b] });
    expect(o.totalValue - o.notClassifiedValue).toBeCloseTo(15000, 6);
    expect(o.expectedReturn!).toBeCloseTo(0.06, 9);
    expect(o.estimatedGrowthPerYear!).toBeCloseTo(900, 6);
    expect(o.notClassifiedValue).toBeCloseTo(5000, 6);
    rowsAddUp(o);
  });
  // $7,000 of a priced alternative (other, 5%) and $3,000 nothing explains, in a linked brokerage
  const leftOut = () => theAlternativesOutlook({ accounts: [linked({ asset_id: 'a', label: 'a', balance: 10000 }, 0,
    [pos('PSTK', 'Private stake', 1, 7000, 'other'), pos(null, 'Unpriced stake', 1, null, 'other')])] });
  // BRIEF WRONG (punctuation only): the summary is a sentence and ends with a full stop — "…asset type not classified."
  // (the card: "the summary says: Expected return and growth leave out <amount> asset type not classified."; DEC-4036h).
  // Every figure in the case is right.
  test.failing('complex · Unclassified remainder is excluded from rate/growth and disclosed', () => {
    const o = leftOut();
    expect({ total_value: o.totalValue, unclassified: o.notClassifiedValue, message: o.leavesOut })
      .toEqual({ total_value: 10000, unclassified: 3000, message: 'Expected return and growth leave out $3,000 asset type not classified' });
  });
  test('complex · Unclassified remainder is excluded from rate/growth and disclosed — the app\'s answer', () => {
    const o = leftOut();
    expect({ total_value: o.totalValue, unclassified: o.notClassifiedValue, message: o.leavesOut })
      .toEqual({ total_value: 10000, unclassified: 3000, message: 'Expected return and growth leave out $3,000 asset type not classified.' });
    expect(o.estimatedGrowthPerYear!).toBeCloseTo(350, 6);   // $7,000 × 5%, the $3,000 left out
    rowsAddUp(o);
  });
  // a $20,000 brokerage: $16,000 of a stock fund, $3,000 of a priced bitcoin fund (crypto, 8%), $1,000 of an unpriced
  // alternative. BRIEF WRONG (re-labelled 2026-10-18; was CARD MISREAD), on the label only: "Alternatives" — right is
  // "2 holdings in this account". The card says the row names its part with classPortionLabel for Alternatives, and that
  // card (MK-NW-F-028) reads "N options & N holdings in this account, each part left out when its count is zero": 0
  // options (left out) & 2 alternative holdings (the bitcoin fund and the unpriced stake). Every figure is right:
  // $3,000 + $1,000 = $4,000 in the row, 8% on the $3,000 classified, $1,000 not classified.
  const portion = () => theAlternativesOutlook({ accounts: [linked({ asset_id: 'broker', label: 'broker', balance: 20000 }, 0,
    [pos('VTI', 'VTI', 100, 160, 'stock_etf'), pos('IBIT', 'Bitcoin fund', 60, 50, 'other'), pos(null, 'Unpriced stake', 1, null, 'other')])] }).rows[0];
  test.failing('complex · Brokerage containing crypto/option uses alternative portion row', () => {
    const r = portion();
    expect({ row_alternative_value: r.value, row_rate: r.benchmark, row_unclassified: r.notClassified, portion_label: r.inside })
      .toEqual({ row_alternative_value: 4000, row_rate: 0.08, row_unclassified: 1000, portion_label: 'Alternatives' });
  });
  test('complex · Brokerage containing crypto/option uses alternative portion row — the app\'s answer', () => {
    const r = portion();
    expect(r.value).toBeCloseTo(4000, 6);
    expect(r.benchmark!).toBeCloseTo(0.08, 9);
    expect(r.notClassified).toBeCloseTo(1000, 6);
    expect(r.inside).toBe('2 holdings in this account');
  });
  test('edge · No classified value means no blended rate or growth', () => {
    const o = theAlternativesOutlook({ accounts: [linked({ asset_id: 'a', label: 'a', balance: 1000 }, 0, [pos(null, 'Unpriced stake', 1, null, 'other')])] });
    expect({ blended_rate: o.expectedReturn, annual_growth: o.estimatedGrowthPerYear, unclassified: o.notClassifiedValue })
      .toEqual({ blended_rate: null, annual_growth: null, unclassified: 1000 });
  });
});

describe('MK-NW-O-006 theHolding — five cases', () => {
  const position = (o: Record<string, any>) => ({ position_id: 'p', ticker: 'ABC', ...o }) as any;
  test('easy · Long/short gain from value less cost', () => {
    const h = theHolding({ position: position({ lots: [{ shares: 10, cost_per_share: 20, purchase_date: '2025-01-01' }] }), accountId: 'a', price: 25, transactions: [], now: NOW });
    expect({ total_paid: h.totalPaid, value: h.value, gain: h.gain, return_on_cost: h.returnOnCost }).toEqual({ total_paid: 200, value: 250, gain: 50, return_on_cost: 0.25 });
    expect(h.capitalGains).toEqual({ longGain: 50, shortGain: 0, totalGain: 50, countedShares: 10, heldShares: 10 });   // bought 2025-01-01: held over a year; every share counted (Q20, 2026-10-20)
  });
  test('easy · Option multiplier applied to value and cost', () => {
    const h = theHolding({ position: position({ kind: 'options', multiplier: 100, lots: [{ shares: 2, cost_per_share: 5, purchase_date: '2026-01-01' }] }), accountId: 'a', price: 8, transactions: [], now: NOW });
    expect({ total_paid: h.totalPaid, value: h.value, gain: h.gain, average_paid_per_share: h.avgPaidPerShare }).toEqual({ total_paid: 1000, value: 1600, gain: 600, average_paid_per_share: 5 });
  });
  test('complex · No price: show total paid as value, suppress gain and tax estimate', () => {
    const h = theHolding({ position: position({ lots: [{ shares: 10, cost_per_share: 20, purchase_date: '2025-01-01' }] }), accountId: 'a', price: null, transactions: [], now: NOW });
    expect({ total_paid: h.totalPaid, value: h.value, gain: h.gain, return_on_cost: h.returnOnCost, tax_estimate: h.capitalGains })
      .toEqual({ total_paid: 200, value: 200, gain: null, return_on_cost: null, tax_estimate: null });
    expect(h.priced).toBe(false);
  });
  // the full chain: the sale is applied to the stored purchases (applyTransaction → removeShares, oldest purchase first),
  // then the door reads the holding and the records. Sold 6: 5 from the 2025-10-13 purchase, 1 from 2026-01-01; left 4 at
  // $20. Realised: 6 × $30 − (5 × $10 + 1 × $20) = $110. The 2025-10-13 purchase on 2026-10-13 is held EXACTLY one year:
  // short-term (the card: long-term = held MORE than one year).
  test('complex · FIFO sale consumes oldest lot; exact one-year holding is short-term', () => {
    const lots = [{ lot_id: 'l2', shares: 5, cost_per_share: 20, purchase_date: '2026-01-01' }, { lot_id: 'l1', shares: 5, cost_per_share: 10, purchase_date: '2025-10-13' }];
    const ledger = [{ account_id: 'a', ticker: 'ABC', type: 'BUY', shares: 5, price: 10, date: '2025-10-13' },
      { account_id: 'a', ticker: 'ABC', type: 'BUY', shares: 5, price: 20, date: '2026-01-01' },
      { account_id: 'a', ticker: 'ABC', type: 'SELL', shares: 6, price: 30, date: '2026-10-13' }];
    // before the sale, on 2026-10-13: the 2025-10-13 purchase is short-term
    const before = theHolding({ position: position({ lots }), accountId: 'a', price: 30, transactions: [], now: NOW });
    expect(before.capitalGains).toEqual({ longGain: 0, shortGain: 5 * 20 + 5 * 10, totalGain: 150, countedShares: 10, heldShares: 10 });
    const [after] = applyTransaction([acct({ asset_id: 'a', positions: [position({ lots })] })], ledger[2] as any);
    const held = (after.positions as any[])[0];
    const h = theHolding({ position: held, accountId: 'a', price: 30, transactions: ledger, now: NOW });
    expect(h.purchases.map((p) => ({ shares: p.shares, cost_per_share: p.costPerShare }))).toEqual([{ shares: 4, cost_per_share: 20 }]);
    expect(10 - 5 - (5 - 4)).toBe(4);   // first purchase gave 5, second gave 1
    expect(h.realised.realizedAllTime).toBeCloseTo(110, 6);
    expect(h.shares).toBe(4);
  });
  test('edge · Closed holding when shares zero; day change requires two closes', () => {
    const h = theHolding({ position: position({ lots: [] }), accountId: 'a', price: null, transactions: [], recentCloses: [10], now: NOW });
    expect({ closed: h.closed, day_change: nothing(h.dayChange) }).toEqual({ closed: true, day_change: null });
  });
});

describe('MK-NW-O-007 theLookBack — five cases', () => {
  const mocked = lookBackModule.lookBack as jest.Mock;
  const series = (ticker: string, closes: number[], months: number) => ({ ticker, points: closes.map((close, i) => {
    const d = new Date(2026, 9 - Math.round(months * (closes.length - 1 - i) / Math.max(1, closes.length - 1)), 13);
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-13`, close };
  }) });
  const run = (amount: number, from: number[], to: number[], months: number) => {
    mocked.mockClear();
    const fromSeries = series('HOLD', from, months), toSeries = series('BENCH', to, months);
    const out = theLookBack({ amount, fromSeries, toSeries, months, now: NOW });
    expect(mocked).toHaveBeenCalledTimes(1);
    const [a, f, t, m, n] = mocked.mock.calls[0];
    expect(a).toBe(amount); expect(f).toBe(fromSeries); expect(t).toBe(toSeries); expect(m).toBe(months); expect(n).toBe(NOW);
    expect(out).toBe(mocked.mock.results[0].value);                // returned unchanged — the same object
    return { out, fromSeries, toSeries };
  };
  test('easy · Pass through baseline lookback result unchanged', () => {
    const { out } = run(1000, [10, 12], [20, 22], 12);
    expect(out).toEqual({ stayed: { endValue: 1200, delta: 200, pct: expect.closeTo(20, 9) }, moved: { endValue: expect.closeTo(1100, 9), delta: expect.closeTo(100, 9), pct: expect.closeTo(10, 9) }, difference: expect.closeTo(-100, 9), months: 12 });
  });
  test('easy · No holding price history is passed through as supplied', () => {
    const { out, fromSeries } = run(500, [], [100, 110], 6);
    expect(fromSeries.points).toEqual([]);
    expect(out).toBeNull();
  });
  test('complex · Both histories and requested month count preserved', () => {
    const { fromSeries, toSeries } = run(2500, [20, 19, 22], [40, 42, 44], 3);
    expect(fromSeries.points.map((p) => p.close)).toEqual([20, 19, 22]);
    expect(toSeries.points.map((p) => p.close)).toEqual([40, 42, 44]);
  });
  test('complex · Invalid/insufficient history does not fabricate a result', () => {
    const { out, toSeries } = run(1000, [10], [], 12);
    expect(toSeries.points).toEqual([]);
    expect(out).toBeNull();
  });
  test('edge · Zero amount passed through unchanged', () => {
    const { out } = run(0, [10, 12], [20, 22], 12);
    expect(out).toBeNull();   // the helper's own answer for $0 — the door adds no default
  });
});

describe('MK-NW-O-008 thePerformance — five cases', () => {
  const ids = new Set(['a']);
  const run = (o: Record<string, any>) => thePerformance({ windowLabel: 'window', today: TODAY, transactions: [], snapshotDays: [], investmentAccountIds: ids, ...o } as any);
  test('easy · Known beginning, no flows, value grows 10%', () => {
    const p = run({ windowStart: TODAY, accounts: [handAcct(11000)], snapshotDays: [day('2026-10-12', { a: 10000 })] });
    expect({ beginning: p.walk!.beginning, ending: p.ending, wealth_generated: p.walk!.wealthGenerated }).toEqual({ beginning: 10000, ending: 11000, wealth_generated: 1000 });
    expect(p.ret!).toBeCloseTo(0.1, 9);
  });
  test('easy · Same-day contribution is included for the whole day', () => {
    const p = run({ windowStart: TODAY, accounts: [handAcct(11000)], snapshotDays: [day('2026-10-12', { a: 10000 })],
      transactions: [{ account_id: 'a', type: 'DEPOSIT', amount: 1000, date: TODAY }] });
    expect({ beginning: p.walk!.beginning, ending: p.ending, contributions: p.walk!.contributions }).toEqual({ beginning: 10000, ending: 11000, contributions: 1000 });
    expect(p.ret!).toBeCloseTo(0, 9);
    expect(p.walk!.wealthGenerated).toBeCloseTo(0, 9);
  });
  // SETTLED 2026-10-13 by DEC-5068 (replaces DEC-3656 part 2): the worked-back beginning is no longer refused. XYZ has no
  // price history, so it adds no gain — its $12,000 is taken as unchanged — the walk stands at $12,000 → $12,000, and
  // the sentence names it. No holding has a history, so there is no return (it is never counted at 0%).
  test('complex · Unknown gain for unpriced holding is left out of the worked-back beginning, and named', () => {
    const p = run({ windowStart: '2026-09-01', accounts: [acct({ asset_id: 'a', label: 'Brokerage', asset_class: 'stocks_etf', balance: 12000,
      positions: [{ position_id: 'x', ticker: 'XYZ', last_price: null, lots: [{ shares: 100, cost_per_share: 120, purchase_date: '2026-01-01' }] }] })],
      holdings: [{ position: { ticker: 'XYZ', lots: [{ shares: 100 }] }, marketValue: 12000, periodReturn: null }] });
    expect({ beginning: p.walk?.beginning ?? null, wealth_generated: p.walk?.wealthGenerated ?? null, return: p.ret })
      .toEqual({ beginning: 12000, wealth_generated: 0, return: null });
    expect(p.notIncluded).toBe('XYZ ($12,000) has no price history, so its gains are not included.');
    expect(p.ending).toBe(12000);
  });
  // BRIEF WRONG on the gain, the beginning and the return. (1) The window opens 2025-10-13, so its beginning is the
  // close of 2025-10-12 (DEC-0315: "beginning value = close of the day before the start", both boundary days inside):
  // 366 days, years = 366 ÷ 365 (the card: "years = the period's days ÷ 365"). The CD gained $10,500 × (1 − 1.05^(−366/365))
  // = $501.336627; beginning $9,998.663373; wealth generated $501.336627. (2) No figure for the return: the beginning
  // was worked back, not READ, and the card says it refuses "when: the beginning cannot be read" (B-98). OpenAI's own
  // summary wrote "time_weighted_if_other_conditions_allow". A window of exactly 365 days gives DEC-3656's $500.
  const cd = () => acct({ asset_id: 'a', label: 'CD', kind: 'cd', asset_class: 'bonds', balance: 10500, coupon_rate: 0.05, maturity_date: '2027-06-01' });
  test.failing('complex · Missing beginning but no account history can be reconstructed from priced gains', () => {
    const p = run({ windowStart: '2025-10-13', accounts: [cd()] });
    expect({ ending: p.ending, beginning: p.walk!.beginning, wealth_generated: p.walk!.wealthGenerated, return: p.ret })
      .toEqual({ ending: 10500, beginning: 10000, wealth_generated: 500, return: 0.05 });
  });
  test('complex · Missing beginning … reconstructed from priced gains — the app\'s answer', () => {
    const p = run({ windowStart: '2025-10-13', accounts: [cd()] });
    expect(p.years).toBeCloseTo(366 / 365, 12);
    expect(p.ending).toBe(10500);
    expect(p.walk!.wealthGenerated).toBeCloseTo(501.336627489947, 6);
    expect(p.walk!.beginning).toBeCloseTo(9998.663372510053, 6);
    expect(p.ret).toBeNull();          // no holdings handed over: the door is given no holding to take a return from
    expect(p.notIncluded).toBe('');
    // 365 days (opening 2025-10-14): DEC-3656's own example, $500 gained and a $10,000 beginning
    const y = run({ windowStart: '2025-10-14', accounts: [cd()] });
    expect(y.walk!.wealthGenerated).toBeCloseTo(500, 6);
    expect(y.walk!.beginning).toBeCloseTo(10000, 6);
  });
  test('edge · Shares movement with no direction/value refuses return', () => {
    const p = run({ windowStart: TODAY, accounts: [handAcct(10000)], snapshotDays: [day('2026-10-12', { a: 10000 })],
      transactions: [{ account_id: 'a', type: 'TRANSFER_IN_KIND', amount: null, direction: null, date: TODAY }] });
    expect(p.ret).toBeNull();
    expect(p.sentence).toMatch(/^Shares were moved in or out on Oct 13, 2026, and your records do not say what they were worth that day/);
  });
});

// the invariant the brief names across cards: the class rows reconcile without counting a linked account's cash twice
test('invariant · Cash + Investments + property = assets, a linked account\'s cash counted once', () => {
  const accounts = [acct({ asset_id: 'c', kind: 'checking', asset_class: 'cash', tax_bucket: 'CASH', balance: 8000 }),
    linked({ asset_id: 'v', balance: 349333 }, 838, [pos('VTI', 'VTI', 1, 348495, 'stock_etf')]),
    bondAcct({ asset_id: 'b', balance: 5819 }), prop('h', 'primary')];
  const r = theNetWorth({ uid: 'u1', accounts, debts: [], today: TODAY } as any);
  expect(r.cash).toBe(8838);
  expect(r.investments).toBe(354314);
  expect(r.assets).toBe(8838 + 354314 + 300000);
  expect(Object.values(assetAllocation(accounts)).reduce((t, v) => t + v, 0)).toBe(r.assets);
});
