/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "nw module final — part 2", written by OpenAI from the cards alone.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_nw_part2_audit.json (cards
 * MK-NW-F-027..041 and MK-NW-F-044..054, 130 cases). Every expected answer below is the outside model's, copied as it
 * wrote it; only its plain input names are mapped onto the app's fields. A case the app fails is a finding — never
 * fixed by changing the answer here. Results, case by case: MoneyKeel/documents/audit/outside-test-cases/returned/
 * results/moneykeel_nw_final_openai_part2_results.json.
 *
 * MARKS: `test.failing` + `// FINDING` = the app gives another answer than a correct expectation (goes red the day it
 * is fixed). `test.failing` + `// BRIEF WRONG` = the auditor's own expectation is wrong (its arithmetic, or an owner
 * decision says otherwise); the auditor's answer is kept. `// UNCLEAR` = no single expected answer and no decision
 * settles it: the app's current behaviour is asserted and the open question named. `test.skip` + `// BLOCKED` = the
 * case tests an input the app has no notion of.
 * The last describe block holds PROOF RUNS for the two WRONG formula checks (F-053, F-054). They are not among the
 * 130 cases; each is marked the same way.
 *
 * TOLERANCE: money to 1e-6 dollars (toBeCloseTo 6), rates to 1e-12 (toBeCloseTo 12), percentage shares the auditor
 * wrote to ten decimals to 1e-8 (toBeCloseTo 8) — floating-point sums only. "shown" (display) strings are not run:
 * they belong to the display formatter, not these functions.
 * SENTENCES: the cards fix what a sentence says, not its words; where the auditor wrote its own sentence (historyCoverage,
 * a missing-value warning) the test checks the facts it states — the span, the start date, the account named — and
 * the app's exact sentence is recorded in the results file.
 *
 * INPUT NAMES MAPPED (the app's fields, not the answers):
 *   Class words → AssetClass ids: "Cash" 'cash', "Stocks / Funds" 'stocks_etf', "Bonds & CDs" 'bonds', "Alternatives"
 *   'alternatives', "Real estate" 'real_estate', "Personal property" 'personal_property', "Unclassified" 'mixed'. An
 *   account's class is its asset_class. A HOLDING's stored class is its asset_class tag: 'stock_etf' Stocks / Funds,
 *   'bond' Bonds & CDs, 'other' Alternatives, 'cash' Cash; a holding class the person confirmed is class_source 'user'
 *   (the only holding-confirmation the app has — src/domain/performance/index.ts:23).
 *   An account the person "confirmed" is wrapper_confirmed true — the only confirmation an ACCOUNT carries
 *   (src/domain/assets/index.ts:79: it records that the person confirmed the kind / tax bucket).
 *   Kind words → kind ids: "401(k)" '401k', "Roth IRA" 'roth_ira', "529" 'college_529', "vehicle" 'vehicle', "home"
 *   'home', "checking" 'checking', "savings" 'savings', "brokerage" 'brokerage', "crypto" 'crypto', "stocks"
 *   'stocks_etf', "fixed income" 'fixed_income'. Tax bucket "pre-tax" 'PRE_TAX', "Roth" 'ROTH'.
 *   A share or percent (0.5, 1.3) is retirement_pct × 100 (the app keeps 0–100). An "earmarked amount" is an account
 *   of that balance at retirement_pct 100 (or the share given). A "benchmark_return" or "volatility" per holding is
 *   carried by a kind whose benchmark is that rate (8% brokerage, 4.5% home, 7.9% 401k, 10.4% stocks_etf, 6% hedge
 *   funds) or handed in as the person's own figure for the kind (the overrides argument).
 *   A "linked" account is source 'connected' with cash_balance and priced positions (lots × last_price); an
 *   "unpriced holding" has last_price null. A "hand-built" account is derive_balance true + cash_balance.
 *   "Told nothing" = earmarkDefault / earmarkedAmount called without the car and home arguments; a "primary_home_id"
 *   is the primaryHomeId argument. Properties "entered first" are LAST in the list (the store keeps newest first).
 *   benchmarkInfo's "benchmark_record" is placed in the app's BENCHMARK_META table for that kind for the one test and
 *   restored after — the table is where the app keeps the record; a kind is chosen whose rate is the record's.
 *   getAssetsState reads storage and returns assetsStateFrom of what it read (index.ts:2391-2392); the saved record is
 *   handed to assetsStateFrom directly ("no saved record" = null).
 *   sourceWording: "N days since a successful sync" is last_synced = now − N days; "imported" source 'imported';
 *   "manual" source 'manual'.
 *   historyCoverage: "history_start" is history_from, "period_start" the windowStart, "today" the now Date (local).
 *   Onboarding answers → the setup fields: traditional currentRetirementSavings, Roth currentRetirementSavingsRoth,
 *   investment holdings investmentHoldings, savings or portfolio currentSavingsPortfolio; 401k_monthly c_401k,
 *   roth_monthly c_roth, investing_monthly c_invest, match_percent employerMatchMode 'pct' + employerMatchValue ×100,
 *   match_dollars employerMatchMode 'dollars' + employerMatchValue, property_saving_monthly c_property, birth_year
 *   birthYear; the year is set to 2026 with a fake clock.
 *   Itemising: a holding value is ItemHolding { cls, label, value } (null = no value); "account_total" the lump
 *   balance; "retirement_share" retirement_pct ×100; "linked" source 'connected'.
 *   correctClassOf: the "correction" is what the sweep applies — the class correctClassOf gives when it differs from
 *   the one carried (reclassify.ts:102), else none.
 *   A missing-value WARNING ("Incomplete — X has no value") is checked on the app's amber box, MK-XS-F-002 dataGaps:
 *   a 'no-balance' gap whose title names the account (the wording is the app's, "X has no balance").
 *   "REFUSES" = null or undefined.
 */
import {
  accountClassBreakdown, classPortionLabel, assetAllocation, earmarkDefault, primaryCarIdOf, primaryHomeIdOf,
  earmarkedAmount, retirementEarmarkedValue, benchmarkReturn, blendedVolatility, benchmarkInfo, blendedReturn,
  earmarkedKinds, buildAssetsState, assetsFromOnboarding, monthlyContributionsFromOnboarding, assetsStateFrom,
  sourceWording, historyCoverage, uberGroupOf, uberGroupRows, UBER_LABEL, BENCHMARK_META, holdingClassOf,
  type AssetClass,
} from '../../../src/domain/assets';
import {
  itemizedTotal, itemizeMissingCount, itemizeRemainder, itemizedResultTotal, buildItemizedAccounts, type ItemHolding,
} from '../../../src/domain/assets/itemize';
import { correctClassOf, reclassifyAccounts } from '../../../src/domain/assets/reclassify';
import { dataGaps } from '../../../src/domain/gaps';
import { itemising } from './account';

const CLS: Record<string, AssetClass> = {
  Cash: 'cash', 'Stocks / Funds': 'stocks_etf', 'Bonds & CDs': 'bonds', Alternatives: 'alternatives',
  'Real estate': 'real_estate', 'Personal property': 'personal_property', Unclassified: 'mixed',
};
const NAME_OF: Record<string, string> = Object.fromEntries(Object.entries(CLS).map(([k, v]) => [v, k]));
const TAG_NAME: Record<string, string> = { stock_etf: 'Stocks / Funds', bond: 'Bonds & CDs', other: 'Alternatives', cash: 'Cash' };
const kinds: Record<string, string> = { '401(k)': '401k', 'Roth IRA': 'roth_ira', '529': 'college_529', stocks: 'stocks_etf', 'fixed income': 'fixed_income' };
const acct = (over: Record<string, any> = {}) => {
  const kind = over.kind == null ? over.kind : (kinds[over.kind] ?? over.kind);
  const bucket = over.tax_bucket ?? (['checking', 'savings', 'hysa', 'cash_mgmt'].includes(kind) ? 'CASH'
    : ['home', 'vehicle', 'valuables'].includes(kind) ? 'PROPERTY' : ['401k', 'trad_ira', 'hsa'].includes(kind) ? 'PRE_TAX' : 'TAXABLE');
  return ({ asset_id: over.id ?? 'a', label: 'Account', tax_bucket: bucket, balance: 0, target_return: 0.06, ...over, kind }) as any;
};
const pos = (ticker: string, name: string, shares: number, price: number | null, stored = 'stock_etf', extra: Record<string, any> = {}) =>
  ({ ticker, name, asset_class: stored, last_price: price, lots: [{ shares, cost_per_share: 0, purchase_date: '' }], ...extra });
const linked = (over: Record<string, any>, cash: number, positions: any[], options: any[] = []) =>
  acct({ kind: 'brokerage', source: 'connected', cash_balance: cash, positions, option_holdings: options, ...over });
const refuses = (v: unknown) => expect(v == null).toBe(true);
/** an expected split { Cash: 100, 'Stocks / Funds': 900, total: 1000 } against the app's seven classes, at 1e-6 */
const matchSplit = (got: Record<AssetClass, number> | null, want: Record<string, number>) => {
  expect(got).not.toBeNull();
  const named = Object.keys(want).filter((k) => k !== 'total');
  for (const k of named) expect(got![CLS[k]]).toBeCloseTo(want[k], 6);
  for (const k of Object.keys(got!) as AssetClass[]) if (!named.includes(NAME_OF[k])) expect(got![k]).toBeCloseTo(0, 6);
  if (want.total != null) expect(Object.values(got!).reduce((t, v) => t + v, 0)).toBeCloseTo(want.total, 6);
};
const item = (value: number | null, cls: ItemHolding['cls'] = 'stocks_etf', label = 'Holding', extra: Partial<ItemHolding> = {}): ItemHolding =>
  ({ cls, label, value, ...extra });
const NOW = Date.parse('2026-10-09T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const TODAY = new Date(2026, 9, 9);   // 2026-10-09, local
const correction = (a: any) => { const want = correctClassOf(a); return want && want !== a.asset_class ? want : null; };
const noBalanceGap = (accounts: any[], who: string) =>
  dataGaps(accounts, null, NOW).some((g) => g.kind === 'no-balance' && g.title.includes(who));

describe('MK-NW-F-027 accountClassBreakdown — five cases', () => {
  test('easy · Linked account splits cleanly', () => {
    matchSplit(accountClassBreakdown(linked({ balance: 1000 }, 100, [pos('VTI', 'VANGUARD TOTAL STOCK MARKET ETF', 3, 300)])),
      { Cash: 100, 'Stocks / Funds': 900, total: 1000 });
  });
  test('easy · Small positive difference goes to cash', () => {
    matchSplit(accountClassBreakdown(linked({ balance: 1000, asset_class: 'stocks_etf' }, 0, [pos('VTI', 'VANGUARD TOTAL STOCK MARKET ETF', 5, 199)])),
      { Cash: 5, 'Stocks / Funds': 995, total: 1000 });
  });
  test('complex · Hand-built split weights remaining balance', () => {
    const a = acct({ kind: 'brokerage', derive_balance: true, cash_balance: 500, balance: 10000,
      positions: [pos('VTI', 'VANGUARD TOTAL STOCK MARKET ETF', 10, 400), pos('', 'US TREASURY BILL 2027', 20, 100, 'bond')] });
    matchSplit(accountClassBreakdown(a), { Cash: 500, 'Stocks / Funds': 6333.333333333333, 'Bonds & CDs': 3166.666666666667, total: 10000 });
  });
  test('complex · Unpriced holdings sharing one class absorb residual', () => {
    const a = linked({ balance: 20000 }, 1000, [pos('VTI', 'VANGUARD TOTAL STOCK MARKET ETF', 20, 400),
      pos('FXAIX', 'FIDELITY 500 INDEX FUND', 10, null), pos('DODGX', 'DODGE & COX STOCK', 5, null)]);
    matchSplit(accountClassBreakdown(a), { Cash: 1000, 'Stocks / Funds': 19000, total: 20000 });
  });
  test('edge · Negative balance with positive cash field', () => {
    // UNCLEAR: app files the whole −$100 under the account's own class (a bare brokerage: Unclassified) with cash $0
    // (index.ts:1533, 1539); open question: should an overdrawn hand-built account with recorded cash be refused or flagged?
    const got = accountClassBreakdown(acct({ kind: 'brokerage', balance: -100, cash_balance: 50 }));
    matchSplit(got, { Unclassified: -100, total: -100 });
  });
});

describe('MK-NW-F-028 classPortionLabel — five cases', () => {
  const bondsAcct = (...names: string[]) => acct({ kind: 'brokerage', positions: names.map((n) => pos('', n, 1, 100, 'bond')) });
  test('easy · Single CD label', () => { expect(classPortionLabel(bondsAcct('Brokered CD 2028'), 'bonds')).toBe('1 CD in this account'); });
  test('easy · No stock holdings label', () => { expect(classPortionLabel(acct({ kind: 'brokerage', positions: [] }), 'stocks_etf')).toBe('stocks & funds in this account'); });
  test('complex · Treasury broker wording pluralizes', () => {
    expect(classPortionLabel(bondsAcct('UST 4.25% 2031', 'T-bill 2027', 'Corporate 5% 2030'), 'bonds')).toBe('2 Treasuries & 1 bond in this account');
  });
  test('complex · Government word may overstate Treasury classification', () => {
    // UNCLEAR: app counts "US Government Agency 2032" as a Treasury — TREASURY_RE carries govt|government (index.ts:1602);
    // open question: is "government" an approved Treasury word? DEC-3035g names TREAS, UST, T-bond only.
    expect(classPortionLabel(bondsAcct('US Government Agency 2032', 'Municipal bond 2030'), 'bonds')).toBe('1 Treasury & 1 bond in this account');
  });
  test('edge · Zero alternatives holdings use generic label', () => {
    expect(classPortionLabel(acct({ kind: 'brokerage', positions: [], option_holdings: [] }), 'alternatives')).toBe('alternatives in this account');
  });
});

describe('MK-NW-F-029 assetAllocation — five cases', () => {
  test('easy · One cash account allocation', () => {
    matchSplit(assetAllocation([acct({ kind: 'checking', balance: 1000 })]),
      { Cash: 1000, 'Stocks / Funds': 0, 'Bonds & CDs': 0, Alternatives: 0, 'Real estate': 0, 'Personal property': 0, Unclassified: 0, total: 1000 });
  });
  test('easy · One unclassified account stays unclassified', () => {
    matchSplit(assetAllocation([acct({ kind: 'brokerage', asset_class: 'mixed', balance: 500 })]), { Unclassified: 500, total: 500 });
  });
  test('complex · Split account classes sum to total', () => {
    const a = linked({ balance: 20000 }, 500, [pos('VTI', 'VANGUARD TOTAL STOCK MARKET ETF', 40, 300),
      pos('BND', 'VANGUARD TOTAL BOND MARKET ETF', 50, 100, 'bond'), pos('GLD', 'SPDR GOLD SHARES', 10, 250)]);
    matchSplit(assetAllocation([a]), { Cash: 500, 'Stocks / Funds': 12000, 'Bonds & CDs': 5000, Alternatives: 2500, total: 20000 });
  });
  test('complex · Property and personal property group remain separate classes', () => {
    matchSplit(assetAllocation([acct({ id: 'h', kind: 'home', balance: 350000 }), acct({ id: 'v', kind: 'vehicle', balance: 18000 }),
      acct({ id: 'g', kind: 'commodities', balance: 6000 })]), { 'Real estate': 350000, 'Personal property': 18000, Alternatives: 6000, total: 374000 });
  });
  test.failing('edge · Missing split cannot certify complete total', () => {
    // BRIEF WRONG: REFUSES — right is the known classes ($0 here) with the account left out and named in the amber box,
    // because DEC-3279e rules "a missing balance is never $0: it is left out of the total and the amber box names the
    // account", and DEC-2747f rules the total carries no count of accounts with no value. The app does exactly that:
    // assetAllocation leaves it out (index.ts:1743), dataGaps names it (gaps/index.ts:166).
    const a = acct({ id: 'b', label: 'Brokerage', kind: 'brokerage', asset_class: 'stocks_etf', balance: null, source: 'connected' });
    expect(noBalanceGap([a], 'Brokerage')).toBe(true);
    refuses(assetAllocation([a]));
  });
});

describe('MK-NW-F-030 earmarkDefault — five cases', () => {
  test('easy · Marked home gets zero retirement share', () => {
    expect(earmarkDefault(acct({ id: 'home-1', kind: 'home', balance: 400000 }), undefined, 'home-1')).toBe(0);
  });
  test('easy · Rental defaults fully earmarked', () => {
    // the rent entry names it; the function takes no rent entries — the household's home id is handed in
    expect(earmarkDefault(acct({ id: 'rental-1', kind: 'home', re_use: 'rental', balance: 250000 }), undefined, 'home-1')).toBe(100);
  });
  test('complex · Primary car excluded but second car included', () => {
    const accounts = [acct({ id: 'A', kind: 'vehicle', balance: 30000 }), acct({ id: 'B', kind: 'vehicle', balance: 12000 })];
    const car = primaryCarIdOf(accounts);
    expect({ car, A_share: earmarkDefault(accounts[0], car), B_share: earmarkDefault(accounts[1], car) }).toEqual({ car: 'A', A_share: 0, B_share: 100 });
  });
  test.failing('complex · First property default home versus “told nothing”', () => {
    // FINDING: app gives A 0% and B 0% when told nothing (index.ts:1806 — every property with no use stated is the home),
    // expected per DEC-2747e (decision settles the RULE UNCLEAR): the one entered first (A) is the home at 0%, B counts 100%.
    // Handed the household's home the app is right (A 0, B 100). Callers that tell it nothing: src/screens/RetirementCockpit.tsx:161,165,173
    // and src/domain/decumulation/index.ts:43 (earmarkedAmount(a) with no car or home).
    const A = acct({ id: 'A', kind: 'home', balance: 300000 }), B = acct({ id: 'B', kind: 'home', balance: 200000 });
    const accounts = [B, A];                                     // newest first: A entered first
    const home = primaryHomeIdOf(accounts);
    expect({ A: earmarkDefault(A, undefined, home), B: earmarkDefault(B, undefined, home) }).toEqual({ A: 0, B: 100 });
    expect({ A: earmarkDefault(A), B: earmarkDefault(B) }).toEqual({ A: 0, B: 100 });
  });
  test('edge · Saved share outside range', () => {
    // UNCLEAR: earmarkDefault never reads a saved share; earmarkedAmount holds a saved 130% at 100% (index.ts:1895), so
    // $10,000 counts $10,000. No decision on stored shares out of range; the card's own MK-NW-F-032 text says "held
    // between 0% and 100%". Open question: clamp (as built) or refuse the stored value?
    const a = acct({ kind: 'brokerage', balance: 10000, retirement_pct: 130 });
    expect([earmarkDefault(a), earmarkedAmount(a)]).toEqual([100, 10000]);
  });
});

describe('MK-NW-F-031 primaryCarIdOf — five cases', () => {
  test('easy · Most valuable vehicle chosen', () => {
    expect(primaryCarIdOf([acct({ id: 'A', kind: 'vehicle', balance: 20000 }), acct({ id: 'B', kind: 'vehicle', balance: 10000 })])).toBe('A');
  });
  test('easy · No vehicle returns null', () => { refuses(primaryCarIdOf([acct({ id: 'J', kind: 'valuables', balance: 30000 })])); });
  test('complex · Tie uses ID text order', () => {
    expect(primaryCarIdOf([acct({ id: '2', kind: 'vehicle', balance: 12000 }), acct({ id: '10', kind: 'vehicle', balance: 12000 })])).toBe('10');
  });
  test('complex · Valuables never count as car', () => {
    expect(primaryCarIdOf([acct({ id: 'J', kind: 'jewellery', tax_bucket: 'PROPERTY', balance: 80000 }), acct({ id: 'V', kind: 'vehicle', balance: 28000 }),
      acct({ id: 'B', kind: 'boat', tax_bucket: 'PROPERTY', balance: 50000 })])).toBe('V');
  });
  test('edge · Missing balance among vehicles', () => {
    // UNCLEAR: app ranks a vehicle with no balance as $0 ((balance || 0), index.ts:1853) and picks B; open question:
    // may a primary car be named while another vehicle's value is unknown? No decision on it.
    expect(primaryCarIdOf([acct({ id: 'A', kind: 'vehicle', balance: null }), acct({ id: 'B', kind: 'vehicle', balance: 8000 })])).toBe('B');
  });
});

describe('MK-NW-F-032 earmarkedAmount — five cases', () => {
  test('easy · Saved 50% share', () => { expect(earmarkedAmount(acct({ kind: 'brokerage', balance: 10000, retirement_pct: 50 }))).toBeCloseTo(5000, 6); });
  test('easy · Default 100% share', () => { expect(earmarkedAmount(acct({ kind: 'brokerage', balance: 7500 }))).toBeCloseTo(7500, 6); });
  test('complex · Mixed household earmarks', () => {
    const accounts = [acct({ id: 'k', kind: '401k', balance: 87654.32, retirement_pct: 100 }), acct({ id: 'h', kind: 'home', balance: 420000, retirement_pct: 0 }),
      acct({ id: 'r', kind: 'home', re_use: 'rental', balance: 185500, retirement_pct: 100 }), acct({ id: 'b', kind: 'brokerage', balance: 32111.11, retirement_pct: 35 })];
    const amounts = accounts.map((a) => earmarkedAmount(a));
    [87654.32, 0, 185500, 11238.8885].forEach((v, i) => expect(amounts[i]).toBeCloseTo(v, 6));
    expect(amounts.reduce((t, v) => t + v, 0)).toBeCloseTo(284393.2085, 6);
  });
  test('complex · Property default depends on resolved home identity', () => {
    expect(earmarkedAmount(acct({ id: 'B', kind: 'home', re_use: 'secondary', balance: 200000 }), undefined, 'A')).toBeCloseTo(200000, 6);
  });
  test('edge · Out-of-range share', () => {
    // UNCLEAR: app holds a saved −10% at 0% (index.ts:1895) → $0, never −$500; the card itself says "held between 0%
    // and 100%". Open question (no decision): clamp a corrupt stored share, as built, or refuse it?
    expect(earmarkedAmount(acct({ kind: 'brokerage', balance: 5000, retirement_pct: -10 }))).toBe(0);
  });
});

describe('MK-NW-F-033 retirementEarmarkedValue — five cases', () => {
  test('easy · Two earmarked accounts sum', () => {
    expect(retirementEarmarkedValue([acct({ id: 'A', kind: 'brokerage', balance: 4000 }), acct({ id: 'B', kind: 'brokerage', balance: 6000 })])).toBeCloseTo(10000, 6);
  });
  test('easy · Home excluded from nest egg', () => {
    expect(retirementEarmarkedValue([acct({ id: 'h', kind: 'home', balance: 300000, retirement_pct: 0 }), acct({ id: 'k', kind: '401k', balance: 25000, retirement_pct: 100 })])).toBeCloseTo(25000, 6);
  });
  test('complex · Multiple account types and home/car exclusion', () => {
    expect(retirementEarmarkedValue([acct({ id: 'k', kind: '401k', balance: 124567.89, retirement_pct: 100 }), acct({ id: 'v', kind: 'vehicle', balance: 22000, retirement_pct: 0 }),
      acct({ id: 'h', kind: 'home', balance: 350000, retirement_pct: 0 }), acct({ id: 'r', kind: 'home', re_use: 'rental', balance: 178900, retirement_pct: 100 }),
      acct({ id: 'ro', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 65432.1, retirement_pct: 75 })])).toBeCloseTo(352541.965, 6);
  });
  test('complex · Use same home/car identity as defaults', () => {
    const accounts = [acct({ id: 'H1', kind: 'home', re_use: 'primary', balance: 250000 }), acct({ id: 'H2', kind: 'home', re_use: 'secondary', balance: 150000 }),
      acct({ id: 'V1', kind: 'vehicle', balance: 20000 }), acct({ id: 'V2', kind: 'vehicle', balance: 9000 })];
    const car = primaryCarIdOf(accounts), home = primaryHomeIdOf(accounts);
    expect({ home, car, earmarked: accounts.map((a) => earmarkedAmount(a, car, home)), total: retirementEarmarkedValue(accounts) })
      .toEqual({ home: 'H1', car: 'V1', earmarked: [0, 150000, 0, 9000], total: 159000 });
  });
  test('edge · Missing balance makes nest egg incomplete', () => {
    const accounts = [acct({ id: 'l', label: 'Linked 401(k)', kind: '401k', source: 'connected', balance: null, retirement_pct: 100 }),
      acct({ id: 'b', kind: 'brokerage', balance: 10000, retirement_pct: 100 })];
    expect(retirementEarmarkedValue(accounts)).toBeCloseTo(10000, 6);           // known_subtotal
    expect(noBalanceGap(accounts, 'Linked 401(k)')).toBe(true);                // the warning naming it (app wording: "… has no balance")
  });
});

describe('MK-NW-F-034 benchmarkReturn — five cases', () => {
  test('easy · Owner override zero is still set', () => {
    expect({ rate: benchmarkReturn('savings', { savings: 0 }), owner_override: benchmarkInfo('savings', { savings: 0 }).edited }).toEqual({ rate: 0, owner_override: true });
  });
  test('easy · Known kind uses stated default', () => { expect(benchmarkReturn('checking')).toBeCloseTo(0.005, 12); });
  test('complex · Exact kind match matters', () => { expect(benchmarkReturn('roth_ira')).toBeCloseTo(0.079, 12); });   // "Roth IRA" is the app's 'roth_ira'
  test('complex · Unknown kind uses generic estimate', () => {
    expect({ rate: benchmarkReturn('rare asset'), label: benchmarkInfo('rare asset').source }).toEqual({ rate: 0.06, label: 'Generic blended estimate' });
  });
  test('edge · Missing kind gets generic estimate or refusal?', () => {
    // UNCLEAR: app gives 6% for a missing kind, labelled "Generic blended estimate", estimate true (index.ts:1960, 2098);
    // open question: should a missing kind refuse rather than take the generic 6%? No decision on it.
    const info = benchmarkInfo(undefined);
    expect({ rate: benchmarkReturn(undefined), source: info.source, estimate: info.estimate }).toEqual({ rate: 0.06, source: 'Generic blended estimate', estimate: true });
  });
});

describe('MK-NW-F-035 blendedVolatility — five cases', () => {
  test('easy · Single holding volatility', () => {
    expect(blendedVolatility([acct({ kind: 'stocks_etf', balance: 10000 })], { stocks_etf: 0.2 })!).toBeCloseTo(0.2, 12);
  });
  test('easy · No earmarked money refuses', () => { refuses(blendedVolatility([])); });
  test('complex · Weighted holding volatilities', () => {
    expect(blendedVolatility([acct({ id: 'a', kind: 'stocks_etf', balance: 20000 }), acct({ id: 'b', kind: 'crypto', balance: 10000 })], { stocks_etf: 0.15, crypto: 0.3 })!).toBeCloseTo(0.2, 12);
  });
  test.skip('complex · Weighted average is not true portfolio volatility', () => {
    // BLOCKED: the app has no correlation input — no table of how classes move together exists (index.ts:2038-2041);
    // the same two $50,000 holdings at 20% give 0.2 (the formula_gives answer), expected portfolio_volatility 0.0.
    expect(blendedVolatility([acct({ id: 'a', kind: 'stocks_etf', balance: 50000 }), acct({ id: 'b', kind: 'crypto', balance: 50000 })], { stocks_etf: 0.2, crypto: 0.2 })).toBe(0);
  });
  test('edge · Missing per-kind volatility fallback', () => {
    expect(blendedVolatility([acct({ kind: null, balance: 2000 })])!).toBeCloseTo(0.12, 12);
  });
});

describe('MK-NW-F-036 benchmarkInfo — five cases', () => {
  const withRecord = (kind: string, rec: any, run: () => void) => {
    const saved = (BENCHMARK_META as any)[kind];
    (BENCHMARK_META as any)[kind] = { source: rec.source, period: rec.period, estimate: rec.estimate };
    try { run(); } finally { if (saved === undefined) delete (BENCHMARK_META as any)[kind]; else (BENCHMARK_META as any)[kind] = saved; }
  };
  test.failing('easy · Custom zero is labelled estimate', () => {
    // FINDING: app gives period '—' (index.ts:2101), expected "" — the card says "the period is blank"; rate, source
    // and estimate match. A file/code disagreement on the empty-period mark.
    withRecord('stocks_etf', { source: 'Index', period: '10 years', estimate: false }, () => {
      const i = benchmarkInfo('stocks_etf', { stocks_etf: 0 });
      expect({ rate: i.ret, source: i.source, period: i.period, estimate: i.estimate }).toEqual({ rate: 0, source: 'Your custom estimate', period: '', estimate: true });
    });
  });
  test('easy · Measured record source passes through', () => {
    withRecord('fixed_income', { source: 'US Aggregate Bond Index', period: '10 years', estimate: false }, () => {
      const i = benchmarkInfo('fixed_income');
      expect({ rate: i.ret, source: i.source, period: i.period, estimate: i.estimate }).toEqual({ rate: 0.042, source: 'US Aggregate Bond Index', period: '10 years', estimate: false });
    });
  });
  test.failing('complex · Custom nonzero hides benchmark period', () => {
    // FINDING: app gives period '—' (index.ts:2101), expected ""; the rest matches.
    withRecord('stocks_etf', { source: 'Index', period: '30 years', estimate: false }, () => {
      const i = benchmarkInfo('stocks_etf', { stocks_etf: 0.0825 });
      expect({ rate: i.ret, source: i.source, period: i.period, estimate: i.estimate }).toEqual({ rate: 0.0825, source: 'Your custom estimate', period: '', estimate: true });
    });
  });
  test.failing('complex · Unknown kind generic fallback disclosed', () => {
    // FINDING: app gives period '—' (index.ts:2098), expected ""; rate 0.06, source and estimate match.
    const i = benchmarkInfo('rare_asset');
    expect({ rate: i.ret, source: i.source, period: i.period, estimate: i.estimate }).toEqual({ rate: 0.06, source: 'Generic blended estimate', period: '', estimate: true });
  });
  test.failing('edge · Custom rate exactly zero must not be treated as absent', () => {
    // FINDING: app gives period '—' (index.ts:2101), expected ""; the zero is honoured (rate 0, custom, estimate).
    withRecord('brokerage', { source: 'Index', period: '5 years', estimate: false }, () => {
      const i = benchmarkInfo('brokerage', { brokerage: 0 });
      expect({ rate: i.ret, source: i.source, period: i.period, estimate: i.estimate }).toEqual({ rate: 0, source: 'Your custom estimate', period: '', estimate: true });
    });
  });
});

describe('MK-NW-F-037 blendedReturn — five cases', () => {
  test('easy · One earmarked holding', () => { expect(blendedReturn([acct({ kind: 'brokerage', balance: 10000 })])!).toBeCloseTo(0.08, 12); });
  test('easy · Zero earmarked total refuses', () => { refuses(blendedReturn([acct({ kind: 'home', balance: 300000, retirement_pct: 0 })])); });
  test('complex · Weighted return over nest egg', () => {
    expect(blendedReturn([acct({ id: 'k', kind: '401k', balance: 80000 }), acct({ id: 's', kind: 'stocks_etf', balance: 20000 }),
      acct({ id: 'h', kind: 'home', re_use: 'primary', balance: 400000 })])!).toBeCloseTo(0.084, 12);
  });
  test('complex · Rental counts fully, home does not', () => {
    expect(blendedReturn([acct({ id: 'r', kind: 'home', re_use: 'rental', balance: 225000 }), acct({ id: 'h', kind: 'home', re_use: 'primary', balance: 500000 }),
      acct({ id: 'k', kind: '401k', balance: 125000 })])!).toBeCloseTo(0.05714285714285714, 12);
  });
  test('edge · No held value but default rate exists', () => {
    refuses(blendedReturn([acct({ id: 'b', kind: 'brokerage', balance: 1000, retirement_pct: 0 }), acct({ id: 'h', kind: 'hedge_funds', balance: 1000, retirement_pct: 0 })]));
  });
});

describe('MK-NW-F-038 earmarkedKinds — five cases', () => {
  test('easy · One investment kind', () => { expect(earmarkedKinds([acct({ kind: 'brokerage', balance: 1000 })])).toEqual(['brokerage']); });
  test('easy · Zero earmark excluded', () => { expect(earmarkedKinds([acct({ kind: '529', balance: 1000 })])).toEqual([]); });
  test('complex · Deduplicate kinds', () => {
    expect(earmarkedKinds([acct({ id: '1', kind: 'brokerage', balance: 1000 }), acct({ id: '2', kind: 'brokerage', balance: 2000 }), acct({ id: '3', kind: 'crypto', balance: 500 })]))
      .toEqual(['brokerage', 'crypto']);
  });
  test('complex · Missing kind becomes other', () => {
    // UNCLEAR: app counts a kind-less account as 'other_asset' — the app's id for "other" (index.ts:2172), the formula_gives
    // answer; open question: is "other" an approved fallback or should the kind stay unknown? No decision on it.
    expect(earmarkedKinds([acct({ kind: null, balance: 1200 })])).toEqual(['other_asset']);
  });
  test('edge · Property excluded even if earmark positive', () => {
    expect(earmarkedKinds([acct({ kind: 'home', balance: 50000, retirement_pct: 100 })])).toEqual([]);
  });
});

describe('MK-NW-F-039 buildAssetsState — five cases', () => {
  const st = (rows: [number, number][]) => buildAssetsState('u1' as any, rows.map(([balance, target_return], i) => acct({ id: String(i), balance, target_return })));
  test('easy · Two positive balances', () => {
    const s = st([[6000, 0.08], [4000, 0.04]]);
    expect(s.total_asset_value).toBeCloseTo(10000, 6); expect(s.accounts.map((a) => a.portfolio_percentage)).toEqual([60, 40]);
    expect(s.average_target_return!).toBeCloseTo(0.064, 12);
  });
  test('easy · Zero total has no average return', () => {
    const s = st([[0, 0.07]]);
    expect([s.total_asset_value, s.accounts.map((a) => a.portfolio_percentage)]).toEqual([0, [0]]); refuses(s.average_target_return);
  });
  test('complex · Overdrawn account shares can be negative', () => {
    const s = st([[100000, 0.08], [-20000, 0]]);
    expect(s.total_asset_value).toBeCloseTo(80000, 6); expect(s.accounts.map((a) => a.portfolio_percentage)).toEqual([125, -25]);
    expect(s.average_target_return!).toBeCloseTo(0.1, 12);
  });
  test('complex · Negative balance and target return', () => {
    const s = st([[15234.56, 0.079], [4765.44, 0.104], [-2000, 0.005]]);
    expect(s.total_asset_value).toBeCloseTo(18000, 6);
    [84.6364444444, 26.4746666667, -11.1111111111].forEach((v, i) => expect(s.accounts[i].portfolio_percentage).toBeCloseTo(v, 8));
    expect(s.average_target_return!).toBeCloseTo(0.09384088888888889, 12);
  });
  test('edge · All balances net to zero', () => {
    const s = st([[5000, 0.1], [-5000, 0.1]]);
    expect([s.total_asset_value, s.accounts.map((a) => a.portfolio_percentage)]).toEqual([0, [0, 0]]); refuses(s.average_target_return);
  });
});

describe('MK-NW-F-040 assetsFromOnboarding — five cases', () => {
  const ob = (trad: any, roth: any, holdings: any, savingsOrPortfolio: any) => assetsFromOnboarding('u1' as any, {
    currentRetirementSavings: trad, currentRetirementSavingsRoth: roth, investmentHoldings: holdings, currentSavingsPortfolio: savingsOrPortfolio }).accounts;
  test('easy · One retirement answer creates account', () => {
    expect(ob(20000, null, null, null).map((a) => [a.kind, a.tax_bucket, a.balance, a.target_return])).toEqual([['401k', 'PRE_TAX', 20000, 0.07]]);
  });
  test('easy · Typed zero is retained', () => {
    expect(ob(null, 0, null, null).map((a) => [a.kind, a.tax_bucket, a.balance, a.target_return])).toEqual([['roth_ira', 'ROTH', 0, 0.07]]);
  });
  test('complex · Four answers create four accounts', () => {
    const a = ob(18765.43, 12345.67, 32100.5, 4000);
    expect(a.length).toBe(4); expect(a.reduce((t, x) => t + x.balance, 0)).toBeCloseTo(67211.6, 6);
    expect(a.map((x) => x.target_return)).toEqual([0.07, 0.07, 0.07, 0.07]);
  });
  test('complex · Negative answers skipped', () => {
    const a = ob(-100, 2000, null, 1500);
    expect(a.length).toBe(2); expect(a.reduce((t, x) => t + x.balance, 0)).toBeCloseTo(3500, 6);
  });
  test('edge · Ambiguous “savings or portfolio” value', () => {
    // UNCLEAR: app makes a taxable Stocks / Funds account (kind stocks_etf, TAXABLE) for the answer (index.ts:2278), the
    // formula_gives answer; open question: does the old "savings or portfolio" answer mean bank savings (Cash) or a
    // portfolio? No decision on it (DEC-0051 does not settle the meaning of the answer).
    expect(ob(null, null, null, 8000).map((a) => [a.kind, a.tax_bucket, a.balance])).toEqual([['stocks_etf', 'TAXABLE', 8000]]);
  });
});

describe('MK-NW-F-041 monthlyContributionsFromOnboarding — five cases', () => {
  beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-10-09T12:00:00') }); });
  afterAll(() => { jest.useRealTimers(); });
  test('easy · Under-50 401(k) contribution', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1986, c_401k: 1000 })!).toBeCloseTo(1000, 6);
  });
  test('easy · No contribution questions answered refuses', () => {
    refuses(monthlyContributionsFromOnboarding({ c_401k: null, c_roth: null, c_invest: null, employerMatchValue: null }));
  });
  test('complex · Age 62 higher catch-up tier and match', () => {
    // limit 35,750/12 = 2,979.1666…; match 50% of the held figure 1,489.5833…; total 5,218.75
    expect(monthlyContributionsFromOnboarding({ birthYear: 1964, c_401k: 3500, c_roth: 300, c_invest: 450, employerMatchMode: 'pct', employerMatchValue: 50 })!)
      .toBeCloseTo(5218.75, 6);
  });
  test('complex · Property saving excluded; fixed-dollar match included', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: 1978, c_401k: 2500, c_roth: 100, c_invest: 350, employerMatchMode: 'dollars', employerMatchValue: 250, c_property: 800 })!)
      .toBeCloseTo(2741.666666666667, 6);
  });
  test('edge · Age 60 exactly uses age-60–63 limit', () => {
    // capped_401k_monthly = 35,750 / 12 — with nothing else answered the month's total is the held 401(k) figure
    expect(monthlyContributionsFromOnboarding({ birthYear: 1966, c_401k: 4000 })!).toBeCloseTo(2979.166666666667, 6);
  });
});

describe('MK-NW-F-044 getAssetsState — five cases', () => {
  const doc = (accounts: any[]) => ({ user_id: 'u1', accounts }) as any;
  test('easy · Saved account returned', () => {
    const accounts = [acct({ balance: 1000 })];
    expect(assetsStateFrom('u1' as any, doc(accounts))).toEqual(buildAssetsState('u1' as any, accounts));
  });
  test('easy · No saved record returns nothing', () => { refuses(assetsStateFrom('u1' as any, null)); });
  test('complex · Several saved accounts aggregate', () => {
    expect(assetsStateFrom('u1' as any, doc([acct({ id: 'c', kind: 'checking', balance: 2000 }), acct({ id: 'b', kind: 'brokerage', balance: 8000 })]))!.total_asset_value).toBeCloseTo(10000, 6);
  });
  test('complex · Persisted record with empty list is not $0 state', () => { refuses(assetsStateFrom('u1' as any, doc([]))); });
  test('edge · All saved accounts deleted', () => { refuses(assetsStateFrom('u1' as any, doc([]))); });
});

describe('MK-NW-F-045 sourceWording — five cases', () => {
  test('easy · Fresh linked account', () => { expect(sourceWording(acct({ source: 'connected', last_synced: daysAgo(2) }), NOW)).toBe('Linked'); });
  test('easy · Manual account wording', () => { expect(sourceWording(acct({ source: 'manual' }), NOW)).toBe('By hand · you update it'); });
  test('complex · Imported account stale at four days', () => {
    expect(sourceWording(acct({ source: 'imported', last_synced: daysAgo(4) }), NOW)).toBe('Imported · 4 days old');
  });
  test('complex · No successful sync timestamp', () => {
    // the failed attempt yesterday is not a successful sync: last_synced stays empty
    expect(sourceWording(acct({ source: 'connected', last_synced: undefined }), NOW)).toBe('Linked · not updated yet');
  });
  test('edge · Three days is not stale', () => { expect(sourceWording(acct({ source: 'connected', last_synced: daysAgo(3) }), NOW)).toBe('Linked'); });
});

describe('MK-NW-F-046 historyCoverage — five cases', () => {
  const linkedFrom = (from: string | null) => acct({ label: 'Schwab brokerage', institution: 'Schwab', source: 'connected', history_from: from });
  test('easy · Manual account has no activity history', () => {
    const h = historyCoverage(acct({ label: 'Chase', institution: 'Chase', source: 'manual' }), '2025-01-01', TODAY)!;
    expect(h.kind).toBe('none'); expect(h.sentence).toMatch(/no activity records/);
  });
  test('easy · History covers requested period', () => { refuses(historyCoverage(linkedFrom('2024-01-01'), '2025-01-01', TODAY)); });   // wording "" = nothing to say
  test.failing('complex · 18 whole months plus part month is not rounded up', () => {
    // BRIEF WRONG: 18.3 — right is nothing to say (null) for these inputs, and 18.2 on a period the history does not cover.
    // (1) The history starts 2025-04-01, BEFORE the period's first day 2026-01-01, so by the card ("History starting on
    // or before the period's first day: nothing to say") there is no sentence and no months figure.
    // (2) The arithmetic: Apr 1 2025 → Oct 1 2026 is 18 whole months; Oct 1 → Oct 9 is 8/31 = 0.258; 18.258 rounded DOWN
    // to one decimal is 18.2 — the auditor's working says 18.2 in one line and 18.3 in the next.
    const longer = historyCoverage(linkedFrom('2025-04-01'), '2024-01-01', TODAY)!;     // a period it does not cover
    expect(longer.monthsCovered).toBe(18.2); expect(longer.sentence).toMatch(/1 year 6 months of history \(from Apr 1, 2025\)/);
    refuses(historyCoverage(linkedFrom('2025-04-01'), '2026-01-01', TODAY));            // the auditor's own inputs
    expect(historyCoverage(linkedFrom('2025-04-01'), '2026-01-01', TODAY)?.monthsCovered).toBe(18.3);
  });
  test.failing('complex · One day short of year never rounds up', () => {
    // BRIEF WRONG: 11.9 and "11 months of history" — right is nothing to say (null) for these inputs: the history starts
    // 2025-10-10, BEFORE the period's first day 2026-01-01, so the period is covered (the card's own rule). On a period
    // it does not cover, the app gives exactly the auditor's figures: 11.9 and "11 months of history (from Oct 10, 2025)".
    const longer = historyCoverage(linkedFrom('2025-10-10'), '2024-01-01', TODAY)!;
    expect(longer.monthsCovered).toBe(11.9); expect(longer.sentence).toMatch(/ 11 months of history \(from Oct 10, 2025\)/);
    refuses(historyCoverage(linkedFrom('2025-10-10'), '2026-01-01', TODAY));
    expect(historyCoverage(linkedFrom('2025-10-10'), '2026-01-01', TODAY)?.monthsCovered).toBe(11.9);
  });
  test('edge · Future history date', () => {
    // UNCLEAR: app says "Schwab shared a few days of history (from Dec 1, 2026)" with monthsCovered 0 — no negative,
    // no refusal (index.ts:2538-2543); open question: should a history start after today be refused as invalid? No decision.
    const h = historyCoverage(linkedFrom('2026-12-01'), '2026-01-01', TODAY)!;
    expect({ kind: h.kind, months: h.monthsCovered }).toEqual({ kind: 'partial', months: 0 });
    expect(h.sentence).toMatch(/a few days of history \(from Dec 1, 2026\)/);
  });
});

describe('MK-NW-F-047 uberGroupOf — five cases', () => {
  const g = (c: string) => UBER_LABEL[uberGroupOf(c as AssetClass)];
  test('easy · Cash class maps to Cash group', () => { expect(g('cash')).toBe('Cash'); });
  test('easy · Real estate maps to Personal property group', () => { expect(g('real_estate')).toBe('Personal property'); });
  test('complex · All seven classes map correctly', () => {
    expect(['Cash', 'Stocks / Funds', 'Bonds & CDs', 'Alternatives', 'Unclassified', 'Real estate', 'Personal property'].map((c) => g(CLS[c])))
      .toEqual(['Cash', 'Investments', 'Investments', 'Investments', 'Investments', 'Personal property', 'Personal property']);
  });
  test('complex · Unknown class must not be assigned arbitrarily', () => {
    // UNCLEAR: app puts a class it does not know under Investments (CLASS_UBER[cls] ?? 'investments', index.ts:2619);
    // open question: refuse/flag an invalid class instead? No decision. (The AssetClass type admits only the seven.)
    expect(g('mystery')).toBe('Investments');
  });
  test('edge · Unclassified remains investment group', () => { expect(g('mixed')).toBe('Investments'); });
});

describe('MK-NW-F-048 uberGroupRows — five cases', () => {
  const rows = (r: [string, number | null][]) => r.map(([c, total]) => ({ key: CLS[c], label: c, color: '#000', total: total as number }));
  const view = (r: ReturnType<typeof uberGroupRows>) => r.map((x) => ({ name: x.label, total: x.total }));
  test('easy · Single group total', () => {
    const r = uberGroupRows(rows([['Cash', 1000]]));
    expect(view(r)).toEqual([{ name: 'Cash', total: 1000 }]); expect(r.reduce((t, x) => t + x.total, 0)).toBeCloseTo(1000, 6);
  });
  test('easy · Empty group omitted', () => { expect(view(uberGroupRows(rows([['Cash', 500]])))).toEqual([{ name: 'Cash', total: 500 }]); });
  test('complex · Groups sum to everything owned', () => {
    const r = uberGroupRows(rows([['Cash', 5000], ['Stocks / Funds', 20000], ['Bonds & CDs', 8000], ['Alternatives', 2000], ['Unclassified', 1000],
      ['Real estate', 300000], ['Personal property', 15000]]));
    expect(view(r)).toEqual([{ name: 'Cash', total: 5000 }, { name: 'Investments', total: 31000 }, { name: 'Personal property', total: 315000 }]);
    expect(r.reduce((t, x) => t + x.total, 0)).toBeCloseTo(351000, 6);
  });
  test('complex · Within-group class order preserved', () => {
    const r = uberGroupRows(rows([['Stocks / Funds', 20], ['Bonds & CDs', 30], ['Alternatives', 40], ['Unclassified', 10]]));
    expect(r[0].classes.map((c) => c.label)).toEqual(['Stocks / Funds', 'Bonds & CDs', 'Alternatives', 'Unclassified']); expect(r[0].total).toBeCloseTo(100, 6);
  });
  test('edge · Missing class amount makes group incomplete', () => {
    // the known subtotal from the rows; the warning is the amber box naming the account (dataGaps)
    expect(uberGroupRows(rows([['Stocks / Funds', 5000], ['Bonds & CDs', null]]))[0].total).toBeCloseTo(5000, 6);
    expect(noBalanceGap([acct({ id: 'lb', label: 'Linked bond', kind: 'fixed_income', source: 'connected', balance: null })], 'Linked bond')).toBe(true);
  });
});

describe('MK-NW-F-049 itemizedTotal — five cases', () => {
  const its = (vals: (number | null)[]) => vals.map((v) => item(v));
  test('easy · Two holding values sum', () => { expect(itemizedTotal(its([100, 250]))).toBe(350); });
  test('easy · Missing value excluded', () => { expect([itemizedTotal(its([500, null])), itemizeMissingCount(its([500, null]))]).toEqual([500, 1]); });
  test('complex · Decimals and negative value', () => { expect(itemizedTotal(its([1234.56, -12.34, 98.765]))).toBe(1320.985); });
  test('complex · Missing and zero values differ', () => { expect([itemizedTotal(its([0, null, 75.25])), itemizeMissingCount(its([0, null, 75.25]))]).toEqual([75.25, 1]); });
  test('edge · No holdings', () => { expect([itemizedTotal([]), itemizeMissingCount([])]).toEqual([0, 0]); });
});

describe('MK-NW-F-050 itemizeRemainder — five cases', () => {
  const its = (vals: (number | null)[]) => vals.map((v) => item(v));
  test('easy · Positive remainder', () => { expect(itemizeRemainder(1000, its([700]))).toBe(300); });
  test('easy · Negative remainder', () => { expect(itemizeRemainder(1000, its([1200]))).toBe(-200); });
  test('complex · Unround itemized amounts', () => {
    const i = its([7654.32, 4321.09, 1234.56]);
    expect([itemizedTotal(i), itemizeRemainder(18765.43, i)]).toEqual([13209.97, 5555.46]);
  });
  test('complex · Exact cent equality is zero', () => { expect(itemizeRemainder(100, its([33.33, 66.67]))).toBe(0); });
  test('edge · Unknown holding value makes remainder nonfinal', () => {
    // known_remainder and remainder_final from MK-NW-F-073 itemising (the screen's reader); the "Not final" words are on
    // no screen — and the Itemize screen cannot add a holding with no value (ItemizeScreen.tsx:72, value must be > 0)
    const p = itemising(10000, its([4000, null]));
    expect({ known_remainder: p.remainder, remainder_final: p.remainderFinal, missing: itemizeMissingCount(its([4000, null])) })
      .toEqual({ known_remainder: 6000, remainder_final: false, missing: 1 });
  });
});

describe('MK-NW-F-051 itemizedResultTotal — five cases', () => {
  test('easy · Itemized total below account keeps account total', () => {
    const i = [item(700)];
    expect({ new_total: itemizedResultTotal({ balance: 1000 }, i), cash_remainder: itemizeRemainder(1000, i) }).toEqual({ new_total: 1000, cash_remainder: 300 });
  });
  test('easy · Holdings above account increase result', () => { expect(itemizedResultTotal({ balance: 1000 }, [item(1200)])).toBe(1200); });
  test('complex · Partial itemization preserves $186,442 total', () => {
    const i = [item(148001)];
    expect({ remainder: itemizeRemainder(186442, i), new_total: itemizedResultTotal({ balance: 186442 }, i) }).toEqual({ remainder: 38441, new_total: 186442 });
  });
  test('complex · Listed items exceed balance by cents', () => { expect(itemizedResultTotal({ balance: 10000 }, [item(10000.01)])).toBe(10000.01); });
  test('edge · Missing value makes remainder provisional', () => {
    const i = [item(3000), item(null)];
    expect({ new_total: itemizedResultTotal({ balance: 10000 }, i), remainder_final: itemising(10000, i).remainderFinal }).toEqual({ new_total: 10000, remainder_final: false });
  });
});

describe('MK-NW-F-052 buildItemizedAccounts — five cases', () => {
  test('easy · One stock holding creates one account', () => {
    const out = buildItemizedAccounts(acct({ institution: 'Fidelity', kind: 'brokerage', source: 'manual', retirement_pct: 100, balance: 5000 }),
      [item(5000, 'stocks_etf', 'VTI', { ticker: 'VTI' })]);
    expect(out.map((a) => ({ name: a.label, institution: a.institution, balance: a.balance, class: a.asset_class, target_rate: a.target_return, retirement_pct: a.retirement_pct, source: a.source })))
      .toEqual([{ name: 'VTI', institution: 'Fidelity', balance: 5000, class: 'stocks_etf', target_rate: 0.104, retirement_pct: 100, source: 'manual' }]);
  });
  test('easy · Bond face value is not invented', () => {
    const [b] = buildItemizedAccounts(acct({ institution: 'Vanguard', kind: 'brokerage', balance: 9500 }),
      [item(9500, 'bonds', 'Treasury', { maturityDate: '2030-01-01' })]);
    expect({ name: b.label, balance: b.balance, face_value: b.face_value ?? null, coupon_rate: b.coupon_rate ?? null, maturity: b.maturity_date })
      .toEqual({ name: 'Treasury', balance: 9500, face_value: null, coupon_rate: null, maturity: '2030-01-01' });
  });
  test('complex · Residual becomes cash and inherits retirement share', () => {
    const out = buildItemizedAccounts(acct({ institution: 'Schwab', retirement_pct: 75, source: 'connected', kind: '401(k)', balance: 18000 }),
      [item(12000, 'stocks_etf', 'VTI'), item(3000, 'bonds', 'UST 2031')]);
    expect(out.map((a) => ({ name: a.label, balance: a.balance, retirement_pct: a.retirement_pct, source: a.source, kind: a.kind })))
      .toEqual([{ name: 'VTI', balance: 12000, retirement_pct: 75, source: 'connected', kind: '401k' },
        { name: 'UST 2031', balance: 3000, retirement_pct: 75, source: 'connected', kind: '401k' },
        { name: 'Schwab cash', balance: 3000, retirement_pct: 75, source: 'connected', kind: '401k' }]);
    expect({ class: out[2].asset_class, target_rate: out[2].target_return }).toEqual({ class: 'cash', target_rate: 0.035 });
  });
  test.failing('complex · Missing holding value stays missing', () => {
    // FINDING: app creates "Unpriced bond" with balance $0 (balance: (h.value || 0), itemize.ts:193) and a $6,000 cash
    // account as if the remainder were final; expected per DEC-3279e ("a missing balance is never $0") and DEC-3279f
    // ("a holding with no value is left out, and the remainder is then not final") — the decisions settle the RULE
    // UNCLEAR: the record keeps no value (null), never $0. Not reachable from the Itemize screen today (ItemizeScreen.tsx:72).
    const out = buildItemizedAccounts(acct({ institution: 'Chase', kind: 'brokerage', balance: 10000 }),
      [item(4000, 'stocks_etf', 'VTI'), item(null, 'bonds', 'Unpriced bond')]);
    const bond = out.find((a) => a.label === 'Unpriced bond')!;
    expect(bond.balance).toBeNull();
  });
  test('edge · No remainder cash when holdings exceed total', () => {
    const items = [item(6000, 'stocks_etf', 'A'), item(4500, 'bonds', 'B')];
    const out = buildItemizedAccounts(acct({ institution: 'Fidelity', retirement_pct: 100, kind: 'brokerage', balance: 10000 }), items);
    expect({ cash_account: out.some((a) => a.asset_class === 'cash') ? 'some' : 'none', new_total: out.reduce((t, a) => t + a.balance, 0), result_total: itemizedResultTotal({ balance: 10000 }, items) })
      .toEqual({ cash_account: 'none', new_total: 10500, result_total: 10500 });
  });
});

describe('MK-NW-F-053 correctClassOf — five cases', () => {
  test('easy · CD name suggests Bonds & CDs', () => {
    const a = acct({ label: 'Brokered CD 2028', kind: 'brokerage', asset_class: 'cash', wrapper_confirmed: false });
    expect(NAME_OF[correctClassOf(a)!]).toBe('Bonds & CDs');
  });
  test('easy · No correction when class already matches', () => {
    refuses(correction(acct({ label: 'Treasury', maturity_date: '2030-01-01', asset_class: 'bonds' })));
  });
  test('complex · Maturity date outranks misleading name', () => {
    // the app answers Bonds & CDs here, not the formula_gives "Cash": "Savings" is no name evidence (nameEvidence finds
    // nothing in it), so the maturity date decides. The precedence defect is real for a name that IS evidence — see the
    // proof runs below.
    expect(NAME_OF[correctClassOf(acct({ label: 'Savings', maturity_date: '2028-01-01', asset_class: 'cash' }))!]).toBe('Bonds & CDs');
  });
  test('complex · Property name must not be inferred as alternative', () => {
    const c = correction(acct({ label: 'Silver Lake house', kind: 'home', tax_bucket: 'PROPERTY', asset_class: 'alternatives' }));
    expect([null, 'real_estate']).toContain(c);              // "Real estate or no correction from name"
  });
  test('edge · Person-confirmed class must not be corrected', () => {
    // correctClassOf itself proposes Bonds & CDs for "CD Fund" (it reads no confirmation); the sweep, the only place its
    // answer is applied, leaves a confirmed account as it is (reclassify.ts:99, DEC-2748h)
    const a = acct({ label: 'CD Fund', kind: 'brokerage', asset_class: 'stocks_etf', wrapper_confirmed: true });
    const r = reclassifyAccounts([a]);
    expect({ class: r.accounts[0].asset_class, changed: r.changed }).toEqual({ class: 'stocks_etf', changed: 0 });
  });
});

describe('MK-NW-F-054 reclassifyAccounts — five cases', () => {
  test('easy · Unconfirmed cash sweep corrected', () => {
    const r = reclassifyAccounts([acct({ label: 'Settlement Sweep', kind: 'brokerage', asset_class: 'stocks_etf' })]);
    expect({ class: NAME_OF[r.accounts[0].asset_class!], changed_count: r.changed }).toEqual({ class: 'Cash', changed_count: 1 });
  });
  test('easy · Confirmed account left unchanged', () => {
    const r = reclassifyAccounts([acct({ label: 'CD 2030', kind: 'brokerage', asset_class: 'stocks_etf', wrapper_confirmed: true })]);
    expect({ class: NAME_OF[r.accounts[0].asset_class!], changed_count: r.changed }).toEqual({ class: 'Stocks / Funds', changed_count: 0 });
  });
  test('complex · Confirmed holding class outranks broker name', () => {
    // the person's Bonds & CDs answer replaced the broker's 'stock' tag (class_source 'user'); the name "Treasury ETF" is
    // bond evidence too, so the sweep agrees by coincidence — the proof runs show it overwriting a person's answer
    const r = reclassifyAccounts([acct({ kind: 'brokerage', positions: [pos('', 'Treasury ETF', 10, 100, 'bond', { class_source: 'user' })] })]);
    expect({ class: TAG_NAME[(r.accounts[0].positions as any)[0].asset_class], changed_count: r.changed }).toEqual({ class: 'Bonds & CDs', changed_count: 0 });
  });
  test.failing('complex · Gold holding must become Alternatives, not Stocks / Funds', () => {
    // FINDING: app leaves the holding's stored class Stocks / Funds and counts 0 changes — name evidence other than
    // bonds or cash is written as 'stock_etf' (reclassify.ts:112), so Gold already filed 'stock_etf' looks correct to the
    // sweep; expected Alternatives, 1 change. (The screens still show Alternatives for this holding only because
    // holdingClassOf reads the name before the stored tag for a holding nobody classed — index.ts:1427-1428.)
    const r = reclassifyAccounts([acct({ kind: 'brokerage', positions: [pos('', 'Gold', 5, 2000, 'stock_etf')] })]);
    expect({ class: TAG_NAME[(r.accounts[0].positions as any)[0].asset_class], changed_count: r.changed }).toEqual({ class: 'Alternatives', changed_count: 1 });
  });
  test('edge · Person-confirmed class must survive sweep', () => {
    const r = reclassifyAccounts([acct({ label: 'Treasury CD', kind: 'checking', asset_class: 'cash', wrapper_confirmed: true })]);
    expect({ class: NAME_OF[r.accounts[0].asset_class!], changed_count: r.changed }).toEqual({ class: 'Cash', changed_count: 0 });
  });
});

describe('PROOF RUNS for the WRONG formula checks MK-NW-F-053 / MK-NW-F-054 (not among the 130 cases)', () => {
  test.failing('F-053 · a maturity date does not beat name evidence', () => {
    // FINDING: app gives Stocks / Funds — the name ("money market") is read before the maturity date (reclassify.ts:46-48);
    // expected Bonds & CDs: DEC-2484i "a maturity date makes an account Bonds & CDs before its name is read" (built in
    // assetClassOf, index.ts:519-520, which gives Bonds & CDs for this same account with no stored class).
    const a = acct({ label: 'Ally Money Market CD', maturity_date: '2027-06-30', asset_class: 'bonds', kind: 'brokerage' });
    expect(correctClassOf(a)).toBe('bonds');
    expect(reclassifyAccounts([a]).accounts[0].asset_class).toBe('bonds');
  });
  test.failing('F-053 · a property name is read as class evidence', () => {
    // FINDING: app moves a home named "Silver Creek land" to Alternatives (the word silver, reclassify.ts:46-47) and the
    // sweep re-files it; expected Real estate kept: DEC-3035o "a property's name is not read as evidence of its class"
    // (assetClassOf skips the name for property, index.ts:524-525; correctClassOf does not).
    const a = acct({ id: 'p', label: 'Silver Creek land', kind: 'home', re_use: 'land', tax_bucket: 'PROPERTY', asset_class: 'real_estate', balance: 63250 });
    expect(correctClassOf(a)).toBeNull();
    expect(reclassifyAccounts([a]).accounts[0].asset_class).toBe('real_estate');
  });
  test('F-053 / F-054 · a class the person picked on the Net worth editor carries no confirmation', () => {
    // UNCLEAR: the only account confirmation is wrapper_confirmed (kind / tax bucket, set by confirmWrapper,
    // useStore.ts:782); a class picked in the Net worth editor sets asset_class and no flag (NetWorthScreen.tsx:1155-1165),
    // so the sweep re-files it. Open question: does DEC-2748h's "account the person confirmed" include a class they picked?
    const r = reclassifyAccounts([acct({ label: 'CD 2030 ladder', kind: 'brokerage', asset_class: 'stocks_etf' })]);
    expect({ class: r.accounts[0].asset_class, changed: r.changed }).toEqual({ class: 'bonds', changed: 1 });
  });
  test.failing('F-054 · a Gold holding the person classed as Alternatives becomes Stocks / Funds', () => {
    // FINDING: app rewrites the person's 'other' (Alternatives) to 'stock_etf' and counts a change (reclassify.ts:109-113 —
    // no class_source check), and because a person's answer is read from the stored tag (index.ts:1425) the holding is
    // then filed Stocks / Funds everywhere; expected Alternatives kept, 0 changes: DEC-2484r "the person's own answer
    // about a holding's class outranks what its name suggests".
    const r = reclassifyAccounts([acct({ kind: 'brokerage', positions: [pos('', 'Gold', 5, 2000, 'other', { class_source: 'user' })] })]);
    const p = (r.accounts[0].positions as any)[0];
    expect({ stored: TAG_NAME[p.asset_class], filed: NAME_OF[holdingClassOf(p)], changed: r.changed }).toEqual({ stored: 'Alternatives', filed: 'Alternatives', changed: 0 });
  });
  test.failing('F-054 · a person’s Stocks / Funds answer on a bond-named holding is overwritten', () => {
    // FINDING: app rewrites the person's 'stock_etf' on "Treasury ETF" to 'bond' (reclassify.ts:110-113); holdingClassOf then
    // files it Bonds & CDs; expected Stocks / Funds kept (DEC-2484r).
    const r = reclassifyAccounts([acct({ kind: 'brokerage', positions: [pos('', 'Treasury ETF', 10, 100, 'stock_etf', { class_source: 'user' })] })]);
    const p = (r.accounts[0].positions as any)[0];
    expect({ filed: NAME_OF[holdingClassOf(p)], changed: r.changed }).toEqual({ filed: 'Stocks / Funds', changed: 0 });
  });
  test('F-054 · an unclassed Gold holding stays visible as Alternatives, but its stored tag is rewritten to Stocks / Funds', () => {
    // the run behind the F-054 Gold finding, as the app does it today: stored 'other' becomes 'stock_etf' (1 change);
    // holdingClassOf still reads the name first (index.ts:1427-1428), so screens keep Alternatives
    const r = reclassifyAccounts([acct({ kind: 'brokerage', positions: [pos('', 'Gold', 5, 2000, 'other')] })]);
    const p = (r.accounts[0].positions as any)[0];
    expect({ stored: TAG_NAME[p.asset_class], filed: NAME_OF[holdingClassOf(p)], changed: r.changed }).toEqual({ stored: 'Stocks / Funds', filed: 'Alternatives', changed: 1 });
  });
});
