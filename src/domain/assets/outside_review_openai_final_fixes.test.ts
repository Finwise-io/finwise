// FIXES FROM OpenAI's final audit of the Net worth module (2026-10-09). Each test is the proof run the
// audit named, asserted the way the decision reads.
import { correctClassOf, reclassifyAccounts } from './reclassify';
import { buildAssetsState, classPortionLabel, holdingClassOf, propertyUseMap, realEstateUseOf, assetClassOf } from './index';
import { dataGaps } from '../gaps';

const acct = (o: any) => ({ asset_id: 'x', label: 'acct', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0, ...o });

describe('MK-NW-F-028 classPortionLabel — government is not a Treasury word (DEC-3035g)', () => {
  test("'US Government Agency 2032' + 'Municipal bond 2030' read '2 bonds'", () => {
    const a = acct({ positions: [
      { position_id: 'p1', ticker: '', name: 'US Government Agency 2032', asset_class: 'bond' },
      { position_id: 'p2', ticker: '', name: 'Municipal bond 2030', asset_class: 'bond' },
    ] });
    expect(classPortionLabel(a as any, 'bonds')).toBe('2 bonds in this account');
  });
  test('broker Treasury wording still counts (TREAS, UST, T-bill)', () => {
    const a = acct({ positions: [
      { position_id: 'p1', ticker: '', name: 'UNITED STATES TREAS BILLS', asset_class: 'bond' },
      { position_id: 'p2', ticker: 'UST', name: '2.5% 2031', asset_class: 'bond' },
      { position_id: 'p3', ticker: '', name: 'GOVT agency note', asset_class: 'bond' },
    ] });
    expect(classPortionLabel(a as any, 'bonds')).toBe('2 Treasuries & 1 bond in this account');
  });
});

describe('MK-NW-F-053 correctClassOf — the same order as assetClassOf', () => {
  test("a maturity date decides before the name: 'Ally Money Market CD' maturing 2027-06-30 stays Bonds & CDs (DEC-2484i)", () => {
    const a = acct({ label: 'Ally Money Market CD', maturity_date: '2027-06-30', asset_class: 'bonds' });
    expect(correctClassOf(a as any)).toBe('bonds');
    expect(reclassifyAccounts([a] as any).changed).toBe(0);
  });
  test("a property's name is no evidence: 'Silver Creek land' is not re-filed Alternatives (DEC-3035o)", () => {
    const a = acct({ label: 'Silver Creek land', kind: 'real_estate', tax_bucket: 'PROPERTY', asset_class: 'real_estate', re_use: 'land' });
    expect(correctClassOf(a as any)).toBeNull();
    const out = reclassifyAccounts([a] as any);
    expect(out.accounts[0].asset_class).toBe('real_estate');
    expect(out.changed).toBe(0);
  });
  test('a class the person chose is never changed (DEC-2748h)', () => {
    const a = acct({ label: 'Marcus CD ladder', asset_class: 'stocks_etf', class_source: 'user' });
    expect(correctClassOf(a as any)).toBe('stocks_etf');
    const out = reclassifyAccounts([a] as any);
    expect(out.accounts[0].asset_class).toBe('stocks_etf');
    expect(out.changed).toBe(0);
  });
  test('the same account, not chosen by the person, is still corrected', () => {
    const a = acct({ label: 'Marcus CD ladder', asset_class: 'stocks_etf' });
    expect(reclassifyAccounts([a] as any).accounts[0].asset_class).toBe('bonds');
  });
  test('correctClassOf and assetClassOf agree on every unstored account below', () => {
    const cases = [
      acct({ label: 'Ally Money Market CD', maturity_date: '2027-06-30' }),
      acct({ label: 'Silver Creek land', kind: 'real_estate', tax_bucket: 'PROPERTY' }),
      acct({ label: 'Vanguard Federal Money Market' }),
      acct({ label: 'KEY BANK CD 4.00%' }),
    ];
    for (const c of cases) {
      const want = correctClassOf(c as any);
      if (want) expect(want).toBe(assetClassOf(c as any));
    }
  });
});

describe('MK-NW-F-054 reclassifyAccounts — holdings', () => {
  const one = (p: any) => reclassifyAccounts([acct({ label: 'Brokerage', asset_class: 'stocks_etf', positions: [{ position_id: 'p', ...p }] })] as any);
  test('Gold stored Alternatives stays Alternatives, 0 changes (DEC-3035f)', () => {
    const out = one({ ticker: '', name: 'Gold', asset_class: 'other' });
    expect((out.accounts[0].positions as any[])[0].asset_class).toBe('other');
    expect(out.changed).toBe(0);
  });
  test('Gold stored Stocks / Funds becomes Alternatives, 1 change', () => {
    const out = one({ ticker: 'GLD', name: 'SPDR Gold Shares', asset_class: 'stock_etf' });
    const p = (out.accounts[0].positions as any[])[0];
    expect(p.asset_class).toBe('other');
    expect(holdingClassOf(p)).toBe('alternatives');
    expect(out.changed).toBe(1);
  });
  test("the person's Stocks / Funds answer on 'Treasury ETF' is kept (DEC-2484r)", () => {
    const out = one({ ticker: 'GOVT', name: 'iShares Treasury ETF', asset_class: 'stock_etf', class_source: 'user' });
    expect((out.accounts[0].positions as any[])[0].asset_class).toBe('stock_etf');
    expect(out.changed).toBe(0);
  });
  test("the person's Alternatives answer on Gold is kept", () => {
    const out = one({ ticker: '', name: 'Gold bullion', asset_class: 'other', class_source: 'user' });
    expect(out.changed).toBe(0);
  });
  test('a holding waiting on the person (asked) is not touched', () => {
    const out = one({ ticker: '', name: 'Gold', asset_class: 'stock_etf', class_asked: true });
    expect((out.accounts[0].positions as any[])[0].asset_class).toBe('stock_etf');
    expect(out.changed).toBe(0);
  });
  test('no evidence in the name leaves the holding as it is', () => {
    const out = one({ ticker: 'XYZ', name: 'Acme Holdings', asset_class: 'bond' });
    expect((out.accounts[0].positions as any[])[0].asset_class).toBe('bond');
    expect(out.changed).toBe(0);
  });
  test("an account class the person chose still lets its holdings be read", () => {
    const out = reclassifyAccounts([acct({ label: 'Marcus CD', asset_class: 'stocks_etf', class_source: 'user',
      positions: [{ position_id: 'p', ticker: '', name: 'KEYBANK CD 4.00%', asset_class: 'cash' }] })] as any);
    expect(out.accounts[0].asset_class).toBe('stocks_etf');
    expect((out.accounts[0].positions as any[])[0].asset_class).toBe('bond');
    expect(out.changed).toBe(1);
  });
});

describe('MK-NW-F-013 realEstateUseOf — one reading with propertyUseMap (DEC-3035p)', () => {
  const house = acct({ asset_id: 'h', label: 'Maple St house', kind: 'home', tax_bucket: 'PROPERTY', asset_class: 'real_estate', re_use: 'rental', balance: 400000 });
  test("rent entries handed in, none names it: a stored 'rental' is a second home both ways", () => {
    expect(realEstateUseOf(house as any, undefined, [])).toBe('secondary');
    expect(propertyUseMap([house] as any, []).get('h')).toBe('second');
  });
  test('an entry that names it makes it a rental', () => {
    expect(realEstateUseOf(house as any, undefined, [{ income: 2000, property_id: 'h' }])).toBe('rental');
  });
  test('rent entries not handed in: the stored word stands', () => {
    expect(realEstateUseOf(house as any)).toBe('rental');
    expect(realEstateUseOf(house as any, undefined, null)).toBe('rental');
    expect(realEstateUseOf({ ...house, re_use: undefined } as any)).toBe('primary');
  });
});

describe('MK-NW-F-039 buildAssetsState (feeds MK-NW-O-003) — an absent balance is left out (DEC-3279e)', () => {
  test('Checking $2,000 + a CD with no balance field → $2,000, and the amber box names the CD', () => {
    const accounts = [
      acct({ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 2000, target_return: 0.01 }),
      { asset_id: 'cd', label: 'Linked CD', kind: 'cd', tax_bucket: 'TAXABLE', target_return: 0.04, source: 'connected' },
    ];
    const st = buildAssetsState('u' as any, accounts as any);
    expect(st.total_asset_value).toBe(2000);
    expect(st.accounts.map((a) => a.portfolio_percentage)).toEqual([100, 0]);
    expect(st.average_target_return).toBeCloseTo(0.01, 10);
    const gaps = dataGaps(accounts as any);
    expect(gaps.filter((g: any) => g.kind === 'no-balance').map((g: any) => g.accountId)).toEqual(['cd']);
  });
  test('null balance gives the same $2,000', () => {
    const st = buildAssetsState('u' as any, [acct({ balance: 2000 }), acct({ asset_id: 'y', balance: null })] as any);
    expect(st.total_asset_value).toBe(2000);
  });
});
