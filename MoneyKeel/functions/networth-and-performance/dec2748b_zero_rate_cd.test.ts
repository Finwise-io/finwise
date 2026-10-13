/** DEC-2748b, applied to Performance 2026-10-12: "a typed 0 rate is a zero-coupon bond" / "a face value or rate
 *  that was never entered stays blank". A CD with 0% ENTERED gains $0 and states 0.00%/year; a CD with NO rate
 *  entered stays unknown, exactly as before. Found by the outside review (Claude, Performance 01, "CD with a
 *  stated 0% rate"). Functions: MK-NW-F-127 gainOfRow (through MK-NW-F-091 pricedGainOf), MK-NW-F-084
 *  categoryEarnings, MK-NW-O-008 thePerformance (the account-level CD, DEC-3656). */
import { thePerformance, pricedGainOf, categoryEarnings } from './performance';

const TODAY = '2026-10-09';
const YEAR_AGO = '2025-10-10';   // 365 days inclusive = one year
const base = (accounts: any[]) => ({
  windowStart: YEAR_AGO, windowLabel: 'past year', today: TODAY,
  transactions: [] as any[], snapshotDays: [] as any[],
  investmentAccountIds: new Set(['a']), wholeRecord: false, accounts,
});
const cd = (coupon_rate?: number) => ({ asset_id: 'a', label: 'Ally CD', kind: 'cd', asset_class: 'bonds', balance: 10000,
  ...(coupon_rate === undefined ? {} : { coupon_rate }) });

describe('MK-NW-F-091 pricedGainOf / MK-NW-F-127 gainOfRow (DEC-2748b, 2026-10-12)', () => {
  test('entered 0%: $10,000 over one year gained $0', () => {
    expect(pricedGainOf([{ name: 'Promo CD', marketValue: 10000, periodReturn: null, couponRate: 0 }], 1)).toBe(0);
  });
  test('no rate entered: unknown (null), as before', () => {
    expect(pricedGainOf([{ name: 'Promo CD', marketValue: 10000, periodReturn: null, couponRate: null }], 1)).toBeNull();
    expect(pricedGainOf([{ name: 'Promo CD', marketValue: 10000, periodReturn: null }], 1)).toBeNull();
  });
});

describe('MK-NW-O-008 thePerformance — a CD account with no positions (DEC-3656 + DEC-2748b)', () => {
  test('entered 0%: beginning $10,000, wealth generated $0, nothing refused', () => {
    const f = thePerformance(base([cd(0)]));
    expect(f.notIncluded).toBe('');
    expect(f.walk).not.toBeNull();
    expect(f.walk!.beginning).toBe(10000);
    expect(f.walk!.ending).toBe(10000);
    expect(f.walk!.wealthGenerated).toBe(0);
  });
  // SETTLED 2026-10-13 by DEC-5068 (replaces DEC-3656 part 2): was "no walk, and The beginning can't be worked back: …".
  test('no rate entered: the walk stands at $0 gained, and the sentence names the CD', () => {
    const f = thePerformance(base([cd()]));
    expect(f.walk!.beginning).toBe(10000);
    expect(f.walk!.wealthGenerated).toBe(0);
    expect(f.notIncluded).toMatch(/^Wealth generated and Return do not include .+'s gains, as it has no price history\.$/);
  });
});

describe('MK-NW-F-084 categoryEarnings — Bonds & CDs stated yearly rate (DEC-2748b)', () => {
  // one interest record on the CD's own account, so the category is on the table (any day but day one)
  const tx = [{ account_id: 'a', type: 'INTEREST', amount: 25, date: '2026-01-15' }];
  const bonds = (rate?: number) => categoryEarnings({ transactions: tx, windowStart: YEAR_AGO, rows: [],
    bonds: [{ asset_id: 'a', balance: 10000, ...(rate === undefined ? {} : { coupon_rate: rate }) }] }).find((c) => c.key === 'bonds')!;
  test('entered 0%: the category states 0.00%/year', () => {
    const b = bonds(0);
    expect(b.ret).toBe(0);
    expect(b.yearly).toBe(true);
    expect(`${(b.ret! * 100).toFixed(2)}%`).toBe('0.00%');
  });
  test('no rate entered: no stated rate — nothing to show (unchanged)', () => {
    const b = bonds();
    expect(b.ret).toBeNull();
    expect(b.yearly).toBe(false);
  });
  test('one CD at 0% beside one at 4%: weighted by value → 2.00%/year', () => {
    const c = categoryEarnings({ transactions: tx, windowStart: YEAR_AGO, rows: [],
      bonds: [{ asset_id: 'a', balance: 10000, coupon_rate: 0 }, { asset_id: 'b', balance: 10000, coupon_rate: 0.04 }] }).find((x) => x.key === 'bonds')!;
    expect(c.ret).toBeCloseTo(0.02, 12);
    expect(c.yearly).toBe(true);
  });
});
