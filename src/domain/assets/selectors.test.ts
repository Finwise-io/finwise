// Canonical asset-total selectors (Term #2/#3/#4) — agreement tests. Every total derives from one
// selector, so screens can't disagree. Fixture mirrors the real E*TRADE export + home/car/401(k)/bond.
import {
  totalAssets, cashTotal, equitiesTotal, fixedIncomeTotal, alternativesTotal, realEstateTotal,
  investmentsTotal, investableAssets, assetAllocation, type AssetAccount,
  ASSET_KINDS, assetKind, assetClassOf, accountAllowsTicker, maturityClass,
} from './index';

const a = (over: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'x' as any, label: 'acct', tax_bucket: 'TAXABLE', balance: 0, target_return: 0, ...over,
});

const portfolio: AssetAccount[] = [
  a({ label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 7096 }),
  a({ label: 'KEY BANK CD 3.85% 08/24/2026', maturity_date: '2026-08-24', balance: 109992 }), // cash (CD)
  a({ label: 'VMFXX', asset_class: 'cash', balance: 50000 }),                                   // cash (money market)
  a({ label: 'LCTX', kind: 'stocks_etf', balance: 1167 }),                                      // equities
  a({ label: 'QQQ Put', asset_class: 'alternatives', balance: 1407 }),                          // alternatives (option)
  a({ label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000 }),                   // wrapper, contents unspecified → 'mixed' (#10)
  a({ label: 'US Treasury Note 4% 2032', maturity_date: '2032-05-15', balance: 10000 }),        // bonds
  a({ label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000 }),                  // real estate
  a({ label: 'Car', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 20000 }),                 // personal property
];

describe('canonical asset selectors — agreement', () => {
  test('per-class totals (CD + money-market = cash; an unclassified 401(k) is "mixed", NOT assumed equities #10)', () => {
    expect(cashTotal(portfolio)).toBe(7096 + 109992 + 50000);     // 167,088
    expect(equitiesTotal(portfolio)).toBe(1167);                  // ONLY the explicit stock (LCTX) — the 401(k) is not pretended to be stocks
    expect(assetAllocation(portfolio).mixed).toBe(200000);        // the wrapper's unspecified contents land here
    expect(fixedIncomeTotal(portfolio)).toBe(10000);              // Treasury note (not the CD)
    expect(alternativesTotal(portfolio)).toBe(1407);              // the option
    expect(realEstateTotal(portfolio)).toBe(500000);
  });

  test('investments = equities + fixed income + alternatives + mixed (a 401(k) still counts as an investment)', () => {
    expect(investmentsTotal(portfolio)).toBe(
      equitiesTotal(portfolio) + fixedIncomeTotal(portfolio) + alternativesTotal(portfolio) + assetAllocation(portfolio).mixed,
    );
    expect(investmentsTotal(portfolio)).toBe(1167 + 10000 + 1407 + 200000);   // 212,574
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

  test('each derives asset class "cash" (not "mixed"/investment) and cannot hold tickers', () => {
    for (const id of CASH_KINDS) {
      const acct = { asset_id: 'x', label: 'acct', kind: id, tax_bucket: 'CASH', balance: 1000, target_return: 0 } as AssetAccount;
      expect(assetClassOf(acct)).toBe('cash');
      expect(accountAllowsTicker(acct)).toBe(false);
    }
    // a portfolio of the new cash kinds counts entirely as cash
    const p = CASH_KINDS.map((id) => ({ asset_id: id, label: id, kind: id, tax_bucket: 'CASH', balance: 1000, target_return: 0 } as AssetAccount));
    expect(cashTotal(p)).toBe(4000);
  });

  test('the Cash picker now offers 6 types in order (checking, savings, then the four new ones)', () => {
    const cashIds = ASSET_KINDS.filter((k) => k.section === 'Cash').map((k) => k.id);
    expect(cashIds).toEqual(['checking', 'savings', 'hysa', 'money_market', 'cd', 'cash_mgmt']);
  });
});

// build-34 #8 approved rule: a CD/short instrument maturing < 12 months = cash, ≥ 12 months = bond.
describe('maturityClass — entry-time cash-vs-bond by maturity', () => {
  const now = new Date('2026-06-15');
  test('matures within 12 months → cash', () => {
    expect(maturityClass('2026-08', now)).toBe('cash');   // ~2 mo (a short CD / T-bill)
    expect(maturityClass('2027-05', now)).toBe('cash');   // 11 mo
  });
  test('matures in 12+ months → bonds', () => {
    expect(maturityClass('2027-06', now)).toBe('bonds');  // exactly 12 mo
    expect(maturityClass('2030-01', now)).toBe('bonds');  // a 2-year+ note stays a bond
  });
  test('no maturity (money-market, plain cash) → cash', () => {
    expect(maturityClass(undefined, now)).toBe('cash');
    expect(maturityClass(null, now)).toBe('cash');
  });
});
