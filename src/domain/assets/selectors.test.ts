// Canonical asset-total selectors (Term #2/#3/#4) — agreement tests. Every total derives from one
// selector, so screens can't disagree. Fixture mirrors the real E*TRADE export + home/car/401(k)/bond.
import {
  totalAssets, cashTotal, equitiesTotal, fixedIncomeTotal, alternativesTotal, realEstateTotal,
  investmentsTotal, investableAssets, assetAllocation, type AssetAccount,
  ASSET_KINDS, assetKind, assetClassOf, accountAllowsTicker, maturityClass, wrapperAccount,
} from './index';

const a = (over: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'x' as any, label: 'acct', tax_bucket: 'TAXABLE', balance: 0, target_return: 0, ...over,
});

const portfolio: AssetAccount[] = [
  a({ label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 7096 }),
  a({ label: 'KEY BANK CD 3.85% 08/24/2026', maturity_date: '2026-08-24', balance: 109992 }), // bonds (CD — founder rule 2026-08-04)
  a({ label: 'VMFXX', asset_class: 'stocks_etf', balance: 50000 }),                              // stocks (money-market FUND — pays dividends, measured)
  a({ label: 'LCTX', kind: 'stocks_etf', balance: 1167 }),                                      // equities
  a({ label: 'QQQ Put', asset_class: 'alternatives', balance: 1407 }),                          // alternatives (option)
  a({ label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000 }),                   // wrapper, contents unspecified → 'mixed' (#10)
  a({ label: 'US Treasury Note 4% 2032', maturity_date: '2032-05-15', balance: 10000 }),        // bonds
  a({ label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000 }),                  // real estate
  a({ label: 'Car', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 20000 }),                 // personal property
];

describe('canonical asset selectors — agreement', () => {
  test('per-class totals (cash = cash ONLY; CD → bonds, money-market fund → stocks — founder rule 2026-08-04)', () => {
    expect(cashTotal(portfolio)).toBe(7096);                      // checking only — cash means cash
    expect(equitiesTotal(portfolio)).toBe(1167 + 50000);          // LCTX + the money-market fund (a dividend-paying fund)
    expect(assetAllocation(portfolio).mixed).toBe(200000);        // the wrapper's unspecified contents land here
    expect(fixedIncomeTotal(portfolio)).toBe(10000 + 109992);     // Treasury note + the CD (it pays interest)
    expect(alternativesTotal(portfolio)).toBe(1407);              // the option
    expect(realEstateTotal(portfolio)).toBe(500000);
  });

  test('investments = equities + fixed income + alternatives + mixed (a 401(k) still counts as an investment)', () => {
    expect(investmentsTotal(portfolio)).toBe(
      equitiesTotal(portfolio) + fixedIncomeTotal(portfolio) + alternativesTotal(portfolio) + assetAllocation(portfolio).mixed,
    );
    expect(investmentsTotal(portfolio)).toBe(51167 + 119992 + 1407 + 200000);   // 372,566 — the CD + money-market fund now measured
  });

  test('investable = cash + investments (home + car excluded)', () => {
    expect(investableAssets(portfolio)).toBe(cashTotal(portfolio) + investmentsTotal(portfolio));
    expect(investableAssets(portfolio)).toBe(379662);             // excludes the $520k of property
  });

  test('total assets = investable + real estate + personal property', () => {
    expect(totalAssets(portfolio)).toBe(investableAssets(portfolio) + 500000 + 20000);
  });

  test('allocation (donut) sums to total assets and matches the per-class selectors', () => {
    const alloc = assetAllocation(portfolio);
    expect(Object.values(alloc).reduce((t, v) => t + v, 0)).toBeCloseTo(totalAssets(portfolio), 2);
    expect(alloc.cash).toBe(cashTotal(portfolio));
    expect(alloc.stocks_etf).toBe(equitiesTotal(portfolio));
    expect(alloc.personal_property).toBe(20000);
  });
});

// ── CONNECTED ACCOUNTS WITHOUT POSITION DETAIL (2026-08-10) ─────────────────────────────────────
// Same class of defect as the founder's "the E*TRADE CD still shows under Cash": a connected account
// that sends a balance but no holdings was dumped WHOLE into Unclassified, even when we know exactly
// what it is. Its own class wins; only a wrapper whose contents are genuinely unknown stays mixed.
describe('a connected account with no position detail keeps its own class', () => {
  const connected = (over: Partial<AssetAccount>) => a({ source: 'connected', ...over });

  test('a connected Treasuries & CDs account is Bonds & CDs, not Unclassified', () => {
    const acct = connected({ label: 'E*TRADE Treasuries & CDs', kind: 'fixed_income', asset_class: 'bonds', balance: 5819 });
    expect(assetClassOf(acct)).toBe('bonds');
    expect(assetAllocation([acct]).bonds).toBe(5819);
    expect(assetAllocation([acct]).mixed).toBe(0);
  });

  test('a connected savings account is Cash — and the cushion counts it', () => {
    const acct = connected({ label: 'Ally Savings', kind: 'savings', tax_bucket: 'CASH', balance: 12000 });
    expect(assetAllocation([acct]).cash).toBe(12000);
    expect(cashTotal([acct])).toBe(12000);
  });

  test('a bare connected brokerage stays honestly Unclassified — we still do not know what it holds', () => {
    const acct = connected({ label: 'Some Brokerage', kind: 'brokerage', balance: 40000 });
    expect(assetAllocation([acct]).mixed).toBe(40000);
  });
});

// ── ONE CASH NUMBER (L-7, 2026-08-10) ───────────────────────────────────────────────────────────
// The Net worth screen printed "CASH $8,838" one inch above "…$8,000 cash ÷ $4,500/mo": the CASH
// group counted a connected brokerage's sweep balance and the emergency cushion did not. Both read
// the same breakdown now, so the two figures cannot disagree again.
test('cash includes a connected brokerage sweep balance — the CASH group and the cushion agree', () => {
  const p: AssetAccount[] = [
    a({ label: 'Chase Checking', kind: 'checking', tax_bucket: 'CASH', balance: 8000 }),
    a({ label: 'Vanguard Brokerage', kind: 'brokerage', balance: 349333, source: 'connected', cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105,
        lots: [{ lot_id: 'l1', shares: 3319, cost_per_share: 84 }] }] } as any),
  ];
  expect(assetAllocation(p).cash).toBe(8838);
  expect(cashTotal(p)).toBe(8838);            // the cushion's numerator — the same number the group shows
  expect(assetAllocation(p).stocks_etf).toBe(348495);
});

// pj review note: the "add cash" picker only offered Checking/Savings. Added the common cash sub-types.
// They MUST behave as cash (CASH bucket, class 'cash', no individual tickers) — not be mistaken for investments.
describe('cash sub-types (HYSA / money-market / CD / cash management)', () => {
  const CASH_KINDS = ['hysa', 'money_market', 'cd', 'cash_mgmt'] as const;

  test('each is registered in the Cash section as a CASH-bucket account', () => {
    for (const id of CASH_KINDS) {
      const k = assetKind(id);
      expect(k).toBeDefined();
      expect(k!.section).toBe('Cash');
      expect(k!.bucket).toBe('CASH');
    }
  });

  test('FOUNDER RULE 2026-08-04: hysa/cash-mgmt stay cash; money_market → stocks; cd → bonds; none holds tickers here', () => {
    const mk = (id: string) => ({ asset_id: 'x', label: 'acct', kind: id, tax_bucket: 'CASH', balance: 1000, target_return: 0 } as AssetAccount);
    expect(assetClassOf(mk('hysa'))).toBe('cash');
    expect(assetClassOf(mk('cash_mgmt'))).toBe('cash');
    expect(assetClassOf(mk('money_market'))).toBe('stocks_etf');   // a dividend-paying fund — measured
    expect(assetClassOf(mk('cd'))).toBe('bonds');                  // interest-paying — measured
    for (const id of CASH_KINDS) expect(accountAllowsTicker(mk(id))).toBe(false);   // CASH-bucket accounts never trade tickers
    // cash total counts ONLY the true-cash kinds now
    const p = CASH_KINDS.map((id) => mk(id));
    expect(cashTotal(p)).toBe(2000);
  });

  test('the Cash picker now offers 6 types in order (checking, savings, then the four new ones)', () => {
    const cashIds = ASSET_KINDS.filter((k) => k.section === 'Cash').map((k) => k.id);
    expect(cashIds).toEqual(['checking', 'savings', 'hysa', 'money_market', 'cd', 'cash_mgmt']);
  });
});

// Device bug: the Stocks/ETFs transaction sheet offered bond ("Chase – fixed income") + alternative
// accounts as trade/cash targets. A dedicated bond or alternative account must NOT be ticker-eligible.
describe('accountAllowsTicker excludes dedicated bond + alternative accounts', () => {
  test('a bond / fixed-income account is not a stock-trading target', () => {
    expect(accountAllowsTicker(a({ label: 'Chase Treasury', kind: 'fixed_income', asset_class: 'bonds', balance: 50000 }))).toBe(false);
    expect(accountAllowsTicker(a({ label: 'T-note', maturity_date: '2032-01-01', balance: 10000 }))).toBe(false); // bonds via maturity
  });
  test('an alternative (crypto / options) account is not a stock-trading target', () => {
    expect(accountAllowsTicker(a({ label: 'Coinbase', kind: 'crypto', asset_class: 'alternatives', balance: 8000 }))).toBe(false);
    expect(accountAllowsTicker(a({ label: 'QQQ Put', kind: 'options', asset_class: 'alternatives', balance: 1400 }))).toBe(false);
  });
  test('a brokerage / 401(k) (equity-capable) IS still ticker-eligible', () => {
    expect(accountAllowsTicker(a({ label: 'Brokerage', kind: 'brokerage', asset_class: 'stocks_etf', balance: 100000 }))).toBe(true);
    expect(accountAllowsTicker(a({ label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000 }))).toBe(true);
  });
});

// FOUNDER RULE 2026-08-04 (supersedes build-34 #8's 12-month split): ANY dated instrument = a bond —
// it pays interest, so it sits in the measured bucket no matter how soon it matures.
describe('maturityClass — any maturity means Bonds & CDs', () => {
  test('a maturity date → bonds, regardless of how soon', () => {
    expect(maturityClass('2026-08')).toBe('bonds');   // a 2-month CD is still a CD
    expect(maturityClass('2030-01')).toBe('bonds');
  });
  test('no maturity (a plain balance) → cash', () => {
    expect(maturityClass(undefined)).toBe('cash');
    expect(maturityClass(null)).toBe('cash');
  });
});

// NW redesign: "where is it held?" → account kind + tax bucket (axis 2). Same asset class, different wrapper.
describe('wrapperAccount — maps the held-in wrapper to kind + tax bucket', () => {
  test('each wrapper maps correctly; default/unspecified = taxable brokerage', () => {
    expect(wrapperAccount('taxable')).toEqual({ kind: 'brokerage', tax_bucket: 'TAXABLE' });
    expect(wrapperAccount('401k')).toEqual({ kind: '401k', tax_bucket: 'PRE_TAX' });
    expect(wrapperAccount('trad_ira')).toEqual({ kind: 'trad_ira', tax_bucket: 'PRE_TAX' });
    expect(wrapperAccount('roth')).toEqual({ kind: 'roth_ira', tax_bucket: 'ROTH' });
    expect(wrapperAccount('hsa')).toEqual({ kind: 'hsa', tax_bucket: 'PRE_TAX' });
    expect(wrapperAccount(undefined)).toEqual({ kind: 'brokerage', tax_bucket: 'TAXABLE' });
  });
});

// THE THREE UBER-GROUPS (founder-approved final mock, mockup-vf/networth-FINAL): Cash ·
// Investments · Personal property, with the asset classes as rows inside each.
describe('uberGroupRows — the Net-worth screen grouping', () => {
  const { uberGroupRows, uberGroupOf } = require('./index');
  const rows = [
    { key: 'cash', label: 'Cash', color: '#1baf7a', total: 8838 },
    { key: 'bonds', label: 'Bonds & CDs', color: '#4a3aa7', total: 5819 },
    { key: 'stocks_etf', label: 'Stocks / ETFs', color: '#2a78d6', total: 348495 },
    { key: 'real_estate', label: 'Real estate', color: '#eda100', total: 450000 },
  ];
  test('three groups in order, each summing its classes', () => {
    const g = uberGroupRows(rows);
    expect(g.map((x: any) => x.label)).toEqual(['Cash', 'Investments', 'Personal property']);
    expect(g.map((x: any) => x.total)).toEqual([8838, 354314, 450000]);
    expect(g.reduce((t: number, x: any) => t + x.total, 0)).toBe(813152);   // = what you own
  });
  test('every class maps to exactly one group — Investments is the Performance set', () => {
    expect(uberGroupOf('cash')).toBe('cash');
    for (const k of ['stocks_etf', 'bonds', 'alternatives', 'mixed']) expect(uberGroupOf(k)).toBe('investments');
    for (const k of ['real_estate', 'personal_property']) expect(uberGroupOf(k)).toBe('property');
  });
  test('a group with no classes is omitted rather than shown as $0', () => {
    expect(uberGroupRows([rows[0]]).map((x: any) => x.label)).toEqual(['Cash']);
  });
});
