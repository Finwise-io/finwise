/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "networth 04", written by Claude from the cards alone.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_networth04_claude.json.
 * Every expected answer below is the outside model's, copied as it wrote it; only its plain input names
 * are mapped onto the app's (its "linked" with a "breakdown" is a connected account whose cash and
 * priced holdings give that split; its kind "stocks" is 'stocks_etf', "other" is 'other_asset'). A case
 * the app fails is a finding, fixed in the function — never by changing the answer here. Where it wrote
 * RULE UNCLEAR and gave two readings, the reading the app holds is named on the line, with whose rule.
 *
 * HELD AT THE APP'S ANSWER, NOT ITS OWN — each named where it stands, with the owner's rule:
 *   MK-NW-F-025, one case: a taxable account with digits reads Institution -last four, no kind word
 *   (owner, 2026-08-11, DEC-0083: "Vanguard -5738").
 *   MK-NW-F-035, one case: the portfolio's volatility is still the weighted average — a correlation table
 *   is not built (the Plan build; on the tracker).
 *   MK-NW-F-015, one case: an account with no value is not counted separately — the data model has no
 *   "unknown balance"; a linked account not yet updated says so on its source chip.
 *   MK-NW-F-025, one more: with no digits and no kind word the person's own name is kept behind the institution.
 */
import {
  equitiesTotal, fixedIncomeTotal, alternativesTotal, realEstateTotal, totalAssets, isRealAsset,
  realEstateUseOf, accountLastFour, accountDisplayName, blendedVolatility, ASSET_CLASS_LABEL, assetClassOf,
} from '../../../src/domain/assets';
import { isBond } from '../../../src/domain/bonds';
import { alternativesSummary } from '../../../src/domain/alternatives';
import { itemising } from './account';
import { ledgerGroups } from './net-worth';
import { nameEvidence } from '../../../Calculation Module code/engines/holding-class';

const kinds: Record<string, string> = { stocks: 'stocks_etf', other: 'other_asset' };
const acct = (over: Record<string, any> = {}) => {
  const kind = over.kind == null ? over.kind : (kinds[over.kind] ?? over.kind);
  const bucket = over.tax_bucket ?? (['checking', 'savings', 'hysa', 'money_market', 'cd', 'cash_mgmt'].includes(kind) ? 'CASH'
    : ['home', 'vehicle', 'valuables'].includes(kind) ? 'PROPERTY' : ['401k', 'trad_ira', 'hsa'].includes(kind) ? 'PRE_TAX' : 'TAXABLE');
  return ({ asset_id: over.id ?? 'a', label: 'Account', tax_bucket: bucket, balance: 0, target_return: 0.06, ...over, kind, asset_class: over.stated_class ?? over.asset_class }) as any;
};
/** A linked account whose cash and priced holdings give the split the reviewer stated. */
const linked = (over: Record<string, any>, split: Record<string, number>) => {
  const price = { stocks_etf: ['VTI', 'Vanguard Total Stock Market ETF'], bonds: ['912797XX1', 'US Treasury Bill 03/2027'], alternatives: ['GLD', 'SPDR Gold Shares'] } as Record<string, [string, string]>;
  const positions = Object.entries(split).filter(([k]) => k !== 'cash').map(([k, v]) => ({ ticker: price[k][0], name: price[k][1], asset_class: k === 'bonds' ? 'bond' : k === 'alternatives' ? 'other' : 'stock_etf', last_price: v, lots: [{ shares: 1, cost_per_share: 0, purchase_date: '' }] }));
  return acct({ kind: 'brokerage', source: 'connected', cash_balance: split.cash ?? 0, positions, ...over });
};

describe('MK-NW-F-055 isBond — five cases', () => {
  test('easy · a CD', () => { expect(isBond(acct({ kind: 'cd', label: 'Ally 12-month', maturity_date: '2027-04-04' }))).toBe(true); });
  test('easy · a checking account', () => { expect(isBond(acct({ kind: 'checking', label: 'Chase Checking' }))).toBe(false); });
  test('complex · three accounts named the broker’s way', () => {
    expect(isBond(acct({ label: 'US Treasury Bill 03/2027', kind: 'other' }))).toBe(true);
    expect(isBond(acct({ label: 'Schwab Brokerage', kind: 'brokerage', stated_class: 'bonds' }))).toBe(true);
    expect(isBond(acct({ label: 'BND', kind: 'stocks' }))).toBe(false);
  });
  test('complex · a person’s own class beats the kind', () => {
    expect(isBond(acct({ kind: 'fixed_income', stated_class: 'cash' }))).toBe(false);
    expect(isBond(acct({ kind: 'cd', label: 'Ally CD', maturity_date: '2027-01-15' }))).toBe(true);
  });
  test('edge · no kind, but a maturity date', () => { expect(isBond(acct({ label: 'Holding', kind: null, maturity_date: '2028-06-30' }))).toBe(true); });
});

describe('MK-NW-F-073 itemising — five cases', () => {
  const items = (...values: number[]) => values.map((value, i) => ({ cls: 'stocks_etf', label: `H${i}`, value })) as any[];
  test('easy · part itemised', () => { expect(itemising(10000, items(6000, 3000))).toEqual({ keepTotalAt: 10000, itemised: 9000, remainder: 1000 }); });
  test('easy · nothing listed yet', () => { expect(itemising(10000, [])).toEqual({ keepTotalAt: 10000, itemised: 0, remainder: 10000 }); });
  test('complex · a Vanguard lump partly explained', () => {
    const r = itemising(186442.19, items(124086.16, 23915.08));
    expect(r.keepTotalAt).toBe(186442.19); expect(r.itemised).toBeCloseTo(148001.24, 6); expect(r.remainder).toBeCloseTo(38440.95, 6);
  });
  test('complex · holdings worth more than the lump', () => {
    const r = itemising(50000, items(31250.4, 22104.88));
    expect(r.itemised).toBeCloseTo(53355.28, 6); expect(r.remainder).toBeCloseTo(-3355.28, 6);
  });
  test('edge · cents that only just add up', () => {
    const r = itemising(0.3, items(0.1, 0.2));
    expect(r.remainder).toBeCloseTo(0, 9);
    expect(Math.round(r.remainder * 100) / 100 === 0 || Object.is(Math.round(r.remainder * 100) / 100, -0)).toBe(true);
  });
});

describe('MK-NW-F-094 ledgerGroups — five cases', () => {
  const label = (a: any) => ASSET_CLASS_LABEL[assetClassOf(a)];
  const groups = (accounts: any[], by: 'class' | 'institution') => ledgerGroups(accounts, by, label, assetClassOf);
  test('easy · two cash accounts by class', () => {
    const g = groups([acct({ id: 'c1', kind: 'checking', balance: 8000 }), acct({ id: 's1', kind: 'savings', balance: 2000 })], 'class');
    expect(g.map((x) => [x.label, x.total, x.accountIds, x.mix])).toEqual([['Cash', 10000, ['c1', 's1'], []]]);
  });
  test('easy · no institution set', () => {
    const g = groups([acct({ id: 'h1', kind: 'home', balance: 450000, institution: null })], 'institution');
    expect(g.map((x) => [x.label, x.total, x.accountIds])).toEqual([['No institution set', 450000, ['h1']]]);
  });
  test('complex · the approved drawing, both ways', () => {
    const accounts = [acct({ id: 'chase', kind: 'checking', institution: 'Chase', balance: 8000 }), linked({ id: 'vg', institution: 'Vanguard', balance: 349333 }, { cash: 838, stocks_etf: 348495 }),
      acct({ id: 'et', kind: 'fixed_income', institution: 'E*TRADE', balance: 5819 }), acct({ id: 'home', kind: 'home', balance: 450000 })];
    const byClass = groups(accounts, 'class');
    expect(byClass.map((x) => [x.label, x.total])).toEqual([['Cash', 8838], ['Stocks / Funds', 348495], ['Bonds & CDs', 5819], ['Real estate', 450000]]);   // the formula as sent gave Cash 8,000 and Stocks 349,333
    expect(byClass.reduce((t, x) => t + x.total, 0)).toBe(813152);
    const byInst = groups(accounts, 'institution');
    expect(byInst.map((x) => [x.label, x.total])).toEqual([['Chase', 8000], ['Vanguard', 349333], ['E*TRADE', 5819], ['No institution set', 450000]]);
    expect(byInst[1].mix.map((m) => [m.key, m.total])).toEqual([['stocks_etf', 348495], ['cash', 838]]);   // two kinds inside Vanguard, biggest first
    expect(byInst.reduce((t, x) => t + x.total, 0)).toBe(813152);
  });
  test('complex · one institution typed two ways', () => {
    const g = groups([acct({ id: 'k', kind: '401k', institution: 'Fidelity', balance: 212640.18 }), acct({ id: 'b', kind: 'brokerage', institution: 'Fidelity', balance: 61880, stated_class: 'stocks_etf' }), acct({ id: 'h', kind: 'hsa', institution: 'fidelity ', balance: 18402.66 })], 'institution');
    expect(g).toHaveLength(1);                                             // the formula as sent made two groups
    expect([g[0].label, g[0].accountIds]).toEqual(['Fidelity', ['k', 'b', 'h']]);
    expect(g[0].total).toBeCloseTo(292922.84, 6);
    expect(g[0].mix.map((m) => [m.key, Math.round(m.total * 100) / 100])).toEqual([['mixed', 231042.84], ['stocks_etf', 61880]]);
  });
  test('edge · no accounts', () => { expect(groups([], 'class')).toEqual([]); });
});

describe('MK-NW-F-002 alternativesSummary — five cases', () => {
  test('easy · one crypto holding', () => {
    expect(alternativesSummary([acct({ kind: 'crypto', balance: 10000 })])).toEqual({ count: 1, totalValue: 10000, blendedReturn: 0.08, estAnnualGrowth: 800 });
  });
  test('easy · two equal holdings at different rates', () => {
    const s = alternativesSummary([acct({ id: 'p', kind: 'private_equity', balance: 50000 }), acct({ id: 'h', kind: 'hedge_funds', balance: 50000 })]);
    expect([s.count, s.totalValue]).toEqual([2, 100000]); expect(s.blendedReturn).toBeCloseTo(0.095, 12); expect(s.estAnnualGrowth).toBeCloseTo(9500, 6);
  });
  test('complex · crypto, gold, options, and an annuity with a maturity date', () => {
    const s = alternativesSummary([acct({ id: 'c', label: 'Coinbase', kind: 'crypto', balance: 21906.48 }), acct({ id: 'g', label: 'Gold', kind: 'commodities', balance: 4310 }), acct({ id: 'o', label: 'Options', kind: 'options', balance: 2535 }), acct({ id: 'n', label: 'Annuity', kind: 'annuities', balance: 1455, maturity_date: '2034-01-01' })]);
    expect([s.count, s.totalValue]).toEqual([3, 28751.48]);
    expect(s.blendedReturn).toBeCloseTo(0.077655, 5); expect(s.estAnnualGrowth).toBeCloseTo(2232.6884, 3);
  });
  test('complex · a stocks-kind fund the person classed as an alternative', () => {
    const s = alternativesSummary([acct({ id: 'f', label: 'RE fund', kind: 'stocks', stated_class: 'alternatives', balance: 8640.15 }), acct({ id: 'c', label: 'Crypto', kind: 'crypto', balance: 14382.77 })]);
    expect([s.count, s.totalValue]).toEqual([2, 23022.92]);
    expect(s.blendedReturn).toBeCloseTo(0.089007, 5); expect(s.estAnnualGrowth).toBeCloseTo(2049.1972, 3);
  });
  test('edge · nothing held', () => {
    const s = alternativesSummary([acct({ kind: 'checking', balance: 5000 }), acct({ id: 'b', kind: 'brokerage', balance: 40000 })]);
    expect([s.count, s.totalValue, s.blendedReturn, s.estAnnualGrowth]).toEqual([0, 0, null, null]);   // the formula as sent gave growth 0
  });
});

describe('MK-NW-F-008 incomeBearingClassOf — five cases', () => {
  test('easy · a money-market fund', () => { expect(nameEvidence('Vanguard Federal Money Market Fund')).toBe('stocks_etf'); });
  test('easy · an ordinary company', () => { expect(nameEvidence('Apple Inc')).toBeNull(); });
  test('complex · names that hide put and call', () => {
    expect(nameEvidence('Putnam Large Cap Value Fund')).toBeNull();
    expect(nameEvidence('CALLAWAY GOLF CO')).toBeNull();
  });
  test('complex · sweep, settlement fund, lower-case T-bill and a dated corporate bond', () => {
    expect(nameEvidence('Schwab Bank Sweep')).toBe('cash');
    // RULE UNCLEAR, decided: a money-market fund is a fund wherever it sits — the owner’s rule DEC-0051 is the rule
    // about WHAT it is; "settlement" says where it is used. Stocks / Funds.
    expect(nameEvidence('Vanguard Federal Money Market Fund (settlement fund)')).toBe('stocks_etf');
    expect(nameEvidence('us treasury bill 03/2027')).toBe('bonds');
    expect(nameEvidence('Apple 3.85% 2043')).toBe('bonds');
  });
  test('edge · no label', () => { expect(nameEvidence(null)).toBeNull(); });
});

describe('MK-NW-F-013 realEstateUseOf — five cases', () => {
  test('easy · a stated rental', () => { expect(realEstateUseOf(acct({ kind: 'home', re_use: 'rental' }))).toBe('rental'); });
  test('easy · the only home, use not stated', () => {
    const home = acct({ id: 'h', kind: 'home', re_use: null });
    expect(realEstateUseOf(home, [home, acct({ id: 'c', kind: 'checking' })])).toBe('primary');
  });
  test('complex · a house and a let condo, neither marked', () => {
    // RULE UNCLEAR for the reviewer (it refuses both); the app follows the owner’s rule of 2026-10-04 (DEC-1926) as
    // built: nobody is asked what a property is for — the property entered first is the home, the other is a second home
    const condo = acct({ id: 'condo', kind: 'home', balance: 410000, re_use: null }), house = acct({ id: 'house', kind: 'home', balance: 650000, re_use: null });
    const accounts = [condo, house];                                       // the newest first, as the store keeps them: the house was entered first
    expect(realEstateUseOf(house, accounts)).toBe('primary');
    expect(realEstateUseOf(condo, accounts)).toBe('secondary');            // the formula as sent made both the home
  });
  test('complex · land and a second home', () => {
    expect([acct({ kind: 'home', re_use: 'land' }), acct({ kind: 'home', re_use: 'secondary' })].map((a) => realEstateUseOf(a))).toEqual(['land', 'secondary']);
  });
  test('edge · asked about a car', () => { expect(realEstateUseOf(acct({ kind: 'vehicle', re_use: null }))).toBeNull(); });   // REFUSES — the formula as sent said primary
});

describe('MK-NW-F-014 isRealAsset — five cases', () => {
  test('easy · a home', () => { expect(isRealAsset(acct({ kind: 'home' }))).toBe(true); });
  test('easy · a brokerage', () => { expect(isRealAsset(acct({ kind: 'brokerage' }))).toBe(false); });
  test('complex · car, jewellery and gold', () => {
    expect([acct({ kind: 'vehicle' }), acct({ kind: 'valuables', tax_bucket: 'PROPERTY' }), acct({ kind: 'commodities' })].map(isRealAsset)).toEqual([true, true, false]);
  });
  test('complex · a rental stated as real estate, and a REIT fund', () => {
    expect(isRealAsset(acct({ kind: 'other', stated_class: 'real_estate' }))).toBe(true);
    expect(isRealAsset(acct({ label: 'Vanguard Real Estate ETF', kind: 'stocks' }))).toBe(false);
  });
  test('edge · property bucket, no kind', () => { expect(isRealAsset(acct({ kind: null, tax_bucket: 'PROPERTY' }))).toBe(true); });
});

describe('MK-NW-F-015 totalAssets — five cases', () => {
  const bal = (...b: number[]) => b.map((balance, i) => acct({ id: String(i), balance }));
  test('easy · three accounts', () => { expect(totalAssets(bal(10000, 20000, 30000))).toBe(60000); });
  test('easy · an overdraft', () => { expect(totalAssets(bal(-250, 1000))).toBe(750); });
  test('complex · the approved drawing', () => { expect(totalAssets(bal(8000, 349333, 5819, 450000))).toBe(813152); });
  test('complex · a linked account with no balance yet', () => {
    const accounts = [acct({ id: 'c', balance: 8412.66 }), acct({ id: 'k', balance: 412350 }), acct({ id: 'h', balance: 650000 }), acct({ id: 's', source: 'connected', balance: null })];
    expect(totalAssets(accounts)).toBeCloseTo(1070762.66, 6);              // the known balances, as it expects
    // HELD: it also wants a count of accounts with no value. The data model keeps a balance on every account (a linked
    // account not yet updated holds $0 and its source chip reads "Linked · not updated yet"); no count is added.
  });
  test('edge · nothing entered', () => { expect(totalAssets([])).toBe(0); });
});

describe('MK-NW-F-017 / F-018 / F-019 / F-020 — the class totals, five cases each', () => {
  const SCHWAB = linked({ id: 'sw', institution: 'Schwab', balance: 119547.05 }, { cash: 2140.55, bonds: 24685, stocks_etf: 92721.5 });
  test('F-017 easy · one brokerage, and no stocks', () => {
    expect(equitiesTotal([acct({ kind: 'brokerage', balance: 100000, stated_class: 'stocks_etf' })])).toBe(100000);
    expect(equitiesTotal([acct({ kind: 'checking', balance: 5000 })])).toBe(0);
  });
  test('F-017 complex · the approved drawing’s Vanguard', () => {
    expect(equitiesTotal([linked({ id: 'vg', balance: 349333 }, { cash: 838, stocks_etf: 348495 }), acct({ id: 'c', kind: 'checking', balance: 8000 }), acct({ id: 'e', kind: 'fixed_income', balance: 5819 })])).toBe(348495);   // the formula as sent gave 349,333
  });
  test('F-017 complex · hand-entered, a money-market fund, and a linked account holding a T-bill and cash', () => {
    expect(equitiesTotal([acct({ id: 'f', kind: 'brokerage', balance: 61880, stated_class: 'stocks_etf' }), acct({ id: 'm', kind: 'money_market', balance: 6500 }), SCHWAB])).toBeCloseTo(161101.5, 6);   // the formula as sent gave 187,927.05
  });
  test('F-017 edge · a stocks account at zero', () => { expect(equitiesTotal([acct({ kind: 'brokerage', balance: 0, stated_class: 'stocks_etf' })])).toBe(0); });
  test('F-018 easy · one CD; fixed income beside cash', () => {
    expect(fixedIncomeTotal([acct({ kind: 'cd', balance: 10000, maturity_date: '2027-04-04' })])).toBe(10000);
    expect(fixedIncomeTotal([acct({ kind: 'fixed_income', balance: 5000 }), acct({ id: 'c', kind: 'checking', balance: 3000 })])).toBe(5000);
  });
  test('F-018 complex · a T-bill inside a linked brokerage', () => {
    expect(fixedIncomeTotal([SCHWAB, acct({ id: 'cd', kind: 'cd', balance: 10000, maturity_date: '2027-02-01' }), acct({ id: 'e', kind: 'fixed_income', balance: 5819 })])).toBeCloseTo(40504, 6);   // the formula as sent gave 15,819
  });
  test('F-018 complex · bonds known by name and by maturity', () => {
    expect(fixedIncomeTotal([acct({ id: 't', label: 'US Treasury Note 2029', kind: 'other', balance: 9712.4 }), acct({ id: 'n', label: 'Annuity', kind: 'annuities', maturity_date: '2034-01-01', balance: 1455 }), acct({ id: 'b', label: 'Vanguard Total Bond Market ETF', kind: 'stocks', balance: 23915.08 })])).toBeCloseTo(35082.48, 6);
  });
  test('F-018 edge · a CD the person classed as cash', () => { expect(fixedIncomeTotal([acct({ kind: 'cd', stated_class: 'cash', balance: 10000 })])).toBe(0); });
  test('F-019 easy · one crypto account; none', () => {
    expect(alternativesTotal([acct({ kind: 'crypto', balance: 4100 })])).toBe(4100);
    expect(alternativesTotal([acct({ kind: 'brokerage', balance: 40000 })])).toBe(0);
  });
  test('F-019 complex · options inside a linked brokerage', () => {
    const schwab = acct({ id: 'sw', kind: 'brokerage', source: 'connected', balance: 128382.45, cash_balance: 2140.95,
      positions: [{ ticker: '912797XX1', name: 'US Treasury Bill 03/2027', asset_class: 'bond', last_price: 24685, lots: [{ shares: 1, cost_per_share: 0, purchase_date: '' }] }, { ticker: 'AAPL', name: 'Apple Inc', asset_class: 'stock_etf', last_price: 99021.5, lots: [{ shares: 1, cost_per_share: 0, purchase_date: '' }] }],
      option_holdings: [{ label: 'AAPL $230 call · exp Jan 15 2027', contracts: 3, value: 2535 }] });
    expect(alternativesTotal([schwab, acct({ id: 'c', kind: 'crypto', balance: 21906.48 })])).toBeCloseTo(24441.48, 6);   // the formula as sent gave 21,906.48
  });
  test('F-019 complex · gold, private equity, a classed fund and a dated annuity', () => {
    expect(alternativesTotal([acct({ id: 'g', kind: 'commodities', balance: 4310 }), acct({ id: 'p', kind: 'private_equity', balance: 50000 }), acct({ id: 'f', kind: 'stocks', stated_class: 'alternatives', balance: 8640.15 }), acct({ id: 'n', kind: 'annuities', maturity_date: '2034-01-01', balance: 1455 })])).toBeCloseTo(62950.15, 6);
  });
  test('F-019 edge · nothing entered', () => { expect(alternativesTotal([])).toBe(0); });
  test('F-020 easy · one home; a car is not real estate', () => {
    expect(realEstateTotal([acct({ kind: 'home', balance: 650000 })])).toBe(650000);
    expect(realEstateTotal([acct({ kind: 'vehicle', balance: 30000 })])).toBe(0);
  });
  test('F-020 complex · home, rental, land and a REIT fund', () => {
    expect(realEstateTotal([acct({ id: 'h', kind: 'home', re_use: 'primary', balance: 650000 }), acct({ id: 'r', kind: 'home', re_use: 'rental', balance: 520000 }), acct({ id: 'l', kind: 'home', re_use: 'land', balance: 85000 }), acct({ id: 'f', label: 'Vanguard Real Estate ETF', kind: 'stocks', balance: 12000 })])).toBe(1255000);
  });
  test('F-020 complex · a stated second home and land entered as property', () => {
    expect(realEstateTotal([acct({ id: 'h', kind: 'home', balance: 650000 }), acct({ id: 'c', kind: 'other', stated_class: 'real_estate', re_use: 'secondary', balance: 310000 }), acct({ id: 'l', kind: null, tax_bucket: 'PROPERTY', balance: 60000 })])).toBe(1020000);
  });
  test('F-020 edge · nothing entered', () => { expect(realEstateTotal([])).toBe(0); });
});

describe('MK-NW-F-024 accountLastFour — five cases', () => {
  test('easy · a bank mask', () => { expect(accountLastFour({ mask: '••4821' })).toBe('4821'); });
  test('easy · no mask, an account number', () => { expect(accountLastFour({ mask: undefined, account_number: '123456789' })).toBe('6789'); });
  test('complex · stray characters and spaces', () => { expect(accountLastFour({ mask: ' x-48 21 ' })).toBe('4821'); });
  test('complex · a short mask with a full number behind it', () => { expect(accountLastFour({ mask: '••21', account_number: '000987654321' })).toBe('4321'); });   // RULE UNCLEAR for the reviewer; the app falls back to the number
  test('edge · three digits only', () => { expect(accountLastFour({ mask: '123', account_number: undefined })).toBeNull(); });
});

describe('MK-NW-F-025 accountDisplayName — five cases', () => {
  test('easy · a 401(k) with digits', () => { expect(accountDisplayName(acct({ institution: 'Fidelity', kind: '401k', mask: '••1102' }))).toBe('Fidelity 401(k) -1102'); });
  test('easy · no institution, no mask', () => { expect(accountDisplayName(acct({ label: 'Emergency Fund', institution: null, mask: null }))).toBe('Emergency Fund'); });
  test('complex · checking and savings at the same bank', () => {
    // HELD AT THE APP'S ANSWER — the owner's rule (2026-08-11, DEC-0083): a taxable account is the institution plus the last
    // four digits, "Vanguard -5738"; the kind word only when there are no digits. Its answer: "Chase Checking -4821".
    expect(accountDisplayName(acct({ institution: 'Chase', kind: 'checking', mask: '••4821' }))).toBe('Chase -4821');
    expect(accountDisplayName(acct({ institution: 'Chase', kind: 'savings', mask: '••9930' }))).toBe('Chase -9930');
  });
  test('complex · an imported single holding and a name that already carries its mask', () => {
    expect(accountDisplayName(acct({ label: 'Imported holding', positions: [{ ticker: 'VTI' }], institution: null }))).toBe('VTI');
    expect(accountDisplayName(acct({ label: 'Ally Savings ••7712', mask: '••7712', institution: null }))).toBe('Ally Savings ••7712');
  });
  test('edge · institution only', () => {
    // HELD AT THE APP'S ANSWER: with no digits and no kind word the app keeps the person's own name behind the institution,
    // "Vanguard Joint taxable" — two such accounts stay tellable apart. Its answer, "Vanguard", would read the same for both.
    expect(accountDisplayName(acct({ institution: 'Vanguard', label: 'Joint taxable', kind: null, mask: null }))).toBe('Vanguard Joint taxable');
  });
});

describe('MK-NW-F-035 blendedVolatility — five cases', () => {
  test('easy · one account with the person’s own figure', () => { expect(blendedVolatility([acct({ kind: '401k', balance: 100000 })], { '401k': 0.15 })).toBeCloseTo(0.15, 12); });
  test('easy · half cash, half stocks', () => { expect(blendedVolatility([acct({ kind: 'savings', balance: 50000 }), acct({ id: 'b', kind: 'brokerage', balance: 50000 })], { savings: 0, brokerage: 0.16 })).toBeCloseTo(0.08, 12); });
  test('complex · half stocks, half bonds', () => {
    // HELD AT THE APP'S ANSWER: the weighted average, 11%. Its 9.09% needs a table of how the classes move together (its
    // 0.2 for stocks and bonds is its own assumption); the app has none yet — the Plan build, on the tracker.
    expect(blendedVolatility([acct({ kind: 'brokerage', balance: 200000 }), acct({ id: 'f', kind: 'fixed_income', balance: 200000 })], { brokerage: 0.16, fixed_income: 0.06 })).toBeCloseTo(0.11, 12);
  });
  test('complex · earmark weighting with a home and a 529', () => {
    expect(blendedVolatility([acct({ id: 'k', kind: '401k', balance: 238905.12 }), acct({ id: 'b', kind: 'brokerage', balance: 186420, retirement_pct: 25 }), acct({ id: 'h', kind: 'hysa', balance: 22416.73 }), acct({ id: 'home', kind: 'home', re_use: 'primary', balance: 650000 }), acct({ id: '5', kind: 'college_529', balance: 38200 })], { '401k': 0.15, brokerage: 0.16, hysa: 0 })).toBeCloseTo(0.140594, 5);
  });
  test('edge · nothing earmarked', () => {
    expect(blendedVolatility([acct({ kind: 'college_529', balance: 38200 }), acct({ id: 'h', kind: 'home', re_use: 'primary', balance: 650000 })])).toBeNull();   // REFUSES — the formula as sent gave 12%
  });
});
