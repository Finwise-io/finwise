// PROBES — the assets helpers not yet documented: account totals, itemising a lump balance,
// the grouping on Net worth, and the small rules about what an account is allowed to hold.
import {
  assetKind, accountAllowsTicker, portfolioActualReturn, buildAssetsState,
  realEstateUseOf, wrapperAccount, sourceWording, uberGroupRows, ASSET_KINDS,
} from '../../src/domain/assets';
import { itemizedTotal, itemizeRemainder } from '../../src/domain/assets/itemize';

const A = (o: any = {}) => ({ asset_id: 'a', label: 'acct', tax_bucket: 'TAXABLE',
  balance: 1000, target_return: 0.07, ...o } as any);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ACCOUNT_TYPE_FACTS — our own table, and the only place these figures live
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('ACCOUNT_TYPE_FACTS', () => {
  test('every account type carries a label, a heading and an assumed return', () => {
    for (const k of ASSET_KINDS) {
      expect(typeof k.label).toBe('string');
      expect(typeof k.section).toBe('string');
      expect(typeof k.ret).toBe('number');
    }
  });
  test('an unknown type returns nothing rather than a stand-in', () => {
    expect(assetKind('not_a_type')).toBeUndefined();
    expect(assetKind(undefined)).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CAN_HOLD_TICKERS — which accounts may appear as a place to track a share
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('CAN_HOLD_TICKERS', () => {
  test('a brokerage or retirement account can; property and plain cash cannot', () => {
    expect(accountAllowsTicker(A({ kind: 'brokerage' }))).toBe(true);
    expect(accountAllowsTicker(A({ kind: 'home', tax_bucket: 'PROPERTY' }))).toBe(false);
    expect(accountAllowsTicker(A({ kind: 'checking', tax_bucket: 'CASH' }))).toBe(false);
    expect(accountAllowsTicker(A({ kind: 'savings' }))).toBe(false);
  });
  test('a 529 cannot — that money is not the household\'s to trade', () => {
    expect(accountAllowsTicker(A({ kind: 'college_529' }))).toBe(false);
  });
  test('a dedicated bond or crypto account holds THOSE, not shares', () => {
    expect(accountAllowsTicker(A({ kind: 'cd' }))).toBe(false);
    expect(accountAllowsTicker(A({ kind: 'crypto' }))).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// REPORTED_RETURN — what the person told us they actually earned
// DERIVATION RULE: weighted by the money counted toward retirement, and NOTHING when nobody has
// reported a figure — so a screen can ask instead of showing a confident 0%.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('REPORTED_RETURN', () => {
  test('it is weighted by money, not an average of the percentages', () => {
    const r = portfolioActualReturn([
      A({ asset_id: '1', kind: 'brokerage', balance: 90_000, actual_ttm: 0.10 }),
      A({ asset_id: '2', kind: 'brokerage', balance: 10_000, actual_ttm: 0 }),
    ]);
    expect(r).toBeCloseTo(0.09, 4);         // not 0.05
  });
  test('nobody reported one → NOTHING, never zero', () => {
    expect(portfolioActualReturn([A({ kind: 'brokerage' })])).toBeNull();
    expect(portfolioActualReturn([])).toBeNull();
  });
  test('property is excluded — a house has no trailing-year return to report', () => {
    expect(portfolioActualReturn([A({ tax_bucket: 'PROPERTY', actual_ttm: 0.5 })])).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ACCOUNT_SHARE_OF_TOTAL
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('ACCOUNT_SHARE_OF_TOTAL', () => {
  test('each account gets its share of the whole, and the shares add to 100', () => {
    const s = buildAssetsState('u', [A({ asset_id: '1', balance: 750 }), A({ asset_id: '2', balance: 250 })]);
    expect(s.total_asset_value).toBe(1000);
    expect(s.accounts.map((a: any) => a.portfolio_percentage)).toEqual([75, 25]);
  });
  test('the blended assumed return is weighted by money', () => {
    const s = buildAssetsState('u', [
      A({ asset_id: '1', balance: 900, target_return: 0.10 }),
      A({ asset_id: '2', balance: 100, target_return: 0 }),
    ]);
    expect(s.average_target_return).toBeCloseTo(0.09, 4);
  });
  test('no money at all divides by nothing — shares are 0 and a stated default return is used', () => {
    const s = buildAssetsState('u', [A({ balance: 0 })]);
    expect(s.accounts[0].portfolio_percentage).toBe(0);
    expect(s.average_target_return).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ITEMISE — turning one typed lump into named holdings without changing the total
// DERIVATION RULE: the account's own total is what the person believes they have. Itemising must
// explain it, not silently move it.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('ITEMISE', () => {
  const items = [{ value: 6_000 } as any, { value: 3_500 } as any];
  test('the pieces add up, and what is left is the lump minus them', () => {
    expect(itemizedTotal(items)).toBe(9_500);
    expect(itemizeRemainder(10_000, items)).toBe(500);
  });
  test('holdings worth MORE than the typed total give a NEGATIVE remainder, shown not hidden', () => {
    // the estimate was low — a real fact about the account, and flooring it at zero would bury it
    expect(itemizeRemainder(9_000, items)).toBe(-500);
  });
  test('nothing itemised leaves the whole lump unallocated', () => {
    expect(itemizedTotal([])).toBe(0);
    expect(itemizeRemainder(10_000, [])).toBe(10_000);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOW_IT_IS_TAXED · HOW_A_HOME_IS_USED · WHERE_THE_VALUE_CAME_FROM
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('THE SMALL RULES', () => {
  test('the tax type chosen on Add account decides the account type AND its tax treatment', () => {
    expect(wrapperAccount('401k')).toEqual({ kind: '401k', tax_bucket: 'PRE_TAX' });
    expect(wrapperAccount('roth').tax_bucket).toBe('ROTH');
    expect(wrapperAccount('taxable').tax_bucket).toBe('TAXABLE');
    expect(wrapperAccount(null).tax_bucket).toBe('TAXABLE');       // taxable is the cautious default
  });

  test('a home is assumed to be the one you live in — the cautious answer for the nest egg', () => {
    expect(realEstateUseOf(A({}))).toBe('primary');
    expect(realEstateUseOf(A({ re_use: 'rental' }))).toBe('rental');
  });

  test('the screen says where a value came from, and when', () => {
    expect(sourceWording(A({ source: 'connected', last_synced: '2026-08-18T09:00:00Z' })))
      .toBe('Linked · 2026-08-18');   // founder 2026-09-14: linked / link again
    expect(sourceWording(A({ source: 'imported' }))).toMatch(/^Imported/);
    expect(sourceWording(A({}))).toBe('By hand · you update it');   // absent means hand-entered
  });

  test('grouping on Net worth drops empty groups rather than showing a zero', () => {
    const rows = uberGroupRows([{ key: 'cash', label: 'Cash', color: '#000', total: 8_000 }] as any);
    expect(rows.length).toBeGreaterThan(0);
    for (const g of rows) expect(g.classes.length).toBeGreaterThan(0);
  });
});
