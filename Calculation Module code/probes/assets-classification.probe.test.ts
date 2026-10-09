// PROBES — how an account is CLASSIFIED and TOTALLED.
//
// This is the layer the founder's F6 landed in: VMFXX imported as cash when the rule says a
// money-market fund is measured. Classification decides which total a pound lands in, which slice
// of the donut it colours, and whether its income is counted — so a wrong class is never cosmetic.
import {
  assetClassOf, incomeBearingClassOf, maturityClass, taxTreatmentOf, isRealAsset, isCashKind,
  assetKind, cashTotal, investmentsTotal, investableAssets, assetAllocation,
  earmarkDefault, earmarkedAmount, retirementEarmarkedValue, primaryCarIdOf,
  benchmarkReturn, blendedReturn, blendedVolatility,
} from '../../src/domain/assets';

const A = (o: any) => ({ asset_id: 'a', label: 'acct', tax_bucket: 'TAXABLE', balance: 1000, ...o } as any);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ACCOUNT_CLASS  ·  the order of precedence is the whole rule
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('ACCOUNT_CLASS', () => {
  test('an explicit class always wins — a person\'s own answer is never overridden', () => {
    expect(assetClassOf(A({ asset_class: 'bonds', kind: 'checking' }))).toBe('bonds');
  });

  test('then the LABEL, under the cash-means-cash rule', () => {
    expect(assetClassOf(A({ label: 'Vanguard Federal Money Market', kind: 'savings' }))).toBe('stocks_etf');
    expect(assetClassOf(A({ label: 'Chase sweep', kind: 'brokerage' }))).toBe('cash');
    expect(assetClassOf(A({ label: 'KeyBank CD 4.00%', kind: 'savings' }))).toBe('bonds');
  });

  test('then a maturity date — anything with one is a bond, whatever it is called', () => {
    expect(assetClassOf(A({ maturity_date: '2028-02-15', kind: 'savings' }))).toBe('bonds');
  });

  test('then the KIND', () => {
    expect(assetClassOf(A({ kind: 'checking' }))).toBe('cash');
    expect(assetClassOf(A({ kind: 'money_market' }))).toBe('stocks_etf');   // founder rule 2026-08-04
    expect(assetClassOf(A({ kind: 'cd' }))).toBe('bonds');
  });

  test('a wrapper whose contents we do not know is MIXED, never pretended to be stocks', () => {
    // the honest answer for a 401(k) with no positions: we do not know what is inside it
    expect(assetClassOf(A({ kind: '401k', tax_bucket: 'PRE_TAX' }))).toBe('mixed');
  });

  test('THE F6 CONTRADICTION IS CLOSED (2026-10-08): the class and the kind metadata agree — measured, not Cash', () => {
    expect(assetClassOf(A({ kind: 'money_market' }))).toBe('stocks_etf');
    expect(assetKind('money_market')!.section).toBe('Investments');
    expect(assetKind('money_market')!.bucket).toBe('TAXABLE');
    expect(isCashKind('money_market')).toBe(false);
    expect(isCashKind('cd')).toBe(false);                        // the same fix for a CD (batch 06 fix brief)
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// INCOME_BEARING_CLASS  ·  the rule that decides cash from not-cash by NAME
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('INCOME_BEARING_CLASS', () => {
  test('sweep and settlement balances ARE cash — that is the only thing that is', () => {
    expect(incomeBearingClassOf('Vanguard sweep cash')).toBe('cash');
    expect(incomeBearingClassOf('settlement fund')).toBe('cash');
  });

  test('money-market by name, or by ticker for a broker that sends no name', () => {
    expect(incomeBearingClassOf('Fidelity Money Market')).toBe('stocks_etf');
    expect(incomeBearingClassOf('VMFXX')).toBe('stocks_etf');
    expect(incomeBearingClassOf('SPAXX')).toBe('stocks_etf');
  });

  test('CDs and T-bills are bonds', () => {
    expect(incomeBearingClassOf('KeyBank Certificate of Deposit')).toBe('bonds');
    expect(incomeBearingClassOf('US Treasury Bills')).toBe('bonds');
  });

  test('an ordinary name matches nothing and falls through to the next rule', () => {
    expect(incomeBearingClassOf('Chase Checking')).toBeNull();
    expect(incomeBearingClassOf('')).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ACCOUNT_TOTALS
// DERIVATION RULE: a total is a sum over CLASSIFIED accounts, and an account holding several
// classes is split by its own breakdown rather than counted whole in one bucket.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('ACCOUNT_TOTALS', () => {
  const rows = [
    A({ asset_id: 'c', kind: 'checking', balance: 8_000 }),
    A({ asset_id: 's', kind: 'stocks_etf', balance: 350_000 }),
    A({ asset_id: 'b', kind: 'cd', balance: 5_000 }),
    A({ asset_id: 'h', kind: 'home', tax_bucket: 'PROPERTY', balance: 620_000 }),
  ];

  test('cash counts only cash; investments count equities, bonds, alternatives and mixed', () => {
    expect(cashTotal(rows)).toBe(8_000);
    expect(investmentsTotal(rows)).toBe(355_000);
  });

  test('INVESTABLE excludes the home and the car — the money that could actually fund something', () => {
    expect(investableAssets(rows)).toBe(363_000);
    expect(isRealAsset(rows[3])).toBe(true);
  });

  test('the allocation sums to total assets, so the donut can never leak', () => {
    const alloc = assetAllocation(rows);
    const sum = Object.values(alloc).reduce((t: number, v: any) => t + v, 0);
    expect(Math.round(sum)).toBe(983_000);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// NEST_EGG_EARMARK
// DERIVATION RULE: everything counts toward retirement EXCEPT the home you live in, the car you
// drive, and a 529 — and any of those defaults can be overridden by the person, whose choice wins.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('NEST_EGG_EARMARK', () => {
  test('the home you live in and a 529 are out by default', () => {
    expect(earmarkDefault(A({ kind: 'home', tax_bucket: 'PROPERTY', real_estate_use: 'primary' }))).toBe(0);
    expect(earmarkDefault(A({ kind: 'college_529' }))).toBe(0);
    expect(earmarkDefault(A({ kind: 'brokerage' }))).toBe(100);
  });

  test('only the MOST VALUABLE car is excluded — a second car stays a real asset you could sell', () => {
    const cars = [A({ asset_id: 'car1', kind: 'vehicle', balance: 30_000 }), A({ asset_id: 'car2', kind: 'vehicle', balance: 8_000 })];
    expect(primaryCarIdOf(cars)).toBe('car1');
    expect(earmarkDefault(cars[0], 'car1')).toBe(0);
    expect(earmarkDefault(cars[1], 'car1')).toBe(100);
  });

  test('ties break on id, so the choice never shuffles between renders', () => {
    const same = [A({ asset_id: 'b', kind: 'vehicle', balance: 10_000 }), A({ asset_id: 'a', kind: 'vehicle', balance: 10_000 })];
    expect(primaryCarIdOf(same)).toBe('a');
    expect(primaryCarIdOf([...same].reverse())).toBe('a');
  });

  test('a saved percentage always beats the default, and is clamped to 0-100', () => {
    expect(earmarkedAmount(A({ kind: 'brokerage', balance: 1000, retirement_pct: 50 }))).toBe(500);
    expect(earmarkedAmount(A({ kind: 'home', tax_bucket: 'PROPERTY', balance: 1000, retirement_pct: 100 }))).toBe(1000);
    expect(earmarkedAmount(A({ balance: 1000, retirement_pct: 300 }))).toBe(1000);
    expect(earmarkedAmount(A({ balance: 1000, retirement_pct: -5 }))).toBe(0);
  });

  test('the nest egg is the sum of the earmarked portions — NOT net worth', () => {
    const rows = [A({ asset_id: 'b', kind: 'brokerage', balance: 100_000 }),
                  A({ asset_id: 'h', kind: 'home', tax_bucket: 'PROPERTY', real_estate_use: 'primary', balance: 600_000 })];
    expect(retirementEarmarkedValue(rows)).toBe(100_000);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// EXPECTED_RETURN  ·  the number every projection stands on
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('EXPECTED_RETURN', () => {
  test('a blended return is weighted by how much sits in each kind', () => {
    const half = [A({ asset_id: '1', kind: 'stocks_etf', balance: 100 }), A({ asset_id: '2', kind: 'savings', balance: 100 })];
    const r = blendedReturn(half);
    expect(r).toBeGreaterThan(benchmarkReturn('savings'));
    expect(r).toBeLessThan(benchmarkReturn('stocks_etf'));
  });

  test('THIS IS WHY PAT WAS WRONG: the mix decides the return, so the mix must be stated', () => {
    const growth = [A({ asset_id: '1', kind: 'stocks_etf', balance: 909_152 })];
    const cashy  = [A({ asset_id: '1', kind: 'stocks_etf', balance: 90_000 }),
                    A({ asset_id: '2', kind: 'savings', balance: 379_152 }),
                    A({ asset_id: '3', kind: 'trad_ira', balance: 380_000 }),
                    A({ asset_id: '4', kind: 'roth_ira', balance: 60_000 })];
    expect(blendedReturn(growth) ?? 0).toBeGreaterThan((blendedReturn(cashy) ?? 0) + 0.02);
  });

  test('a user override beats the default for that kind', () => {
    expect(benchmarkReturn('stocks_etf', { stocks_etf: 0.05 })).toBe(0.05);
  });

  test('no accounts falls back to a stated default rather than zero', () => {
    expect(blendedReturn([])).toBeNull();            // nothing set aside, no blended return (2026-10-07) — the 6% was invented
    expect(blendedVolatility([])).toBeNull();        // nothing set aside, no portfolio to measure (2026-10-07) — the 12% was invented
  });
});
