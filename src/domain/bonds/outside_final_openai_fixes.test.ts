// The outside review of Net worth (OpenAI final, 2026-10-09) — the bonds fixes, held by number.
import { bondInfo, bondSummary, couponIncomeAnnual, interestIncomeAnnual, priceAtYield, yearsToMaturity,
  estimatedAccrued, yearlyInterestNow, isPastMaturity, maturityParts, type BondInfo } from './index';

const D = (s: string) => new Date(`${s}T12:00:00`);
const TODAY = D('2026-10-09');
const acct = (o: any) => ({ asset_id: o.id ?? 'a', label: o.label ?? 'Bond', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: o.value ?? o.face ?? 0, face_value: o.face, coupon_rate: o.rate, maturity_date: o.maturity }) as any;
const bond = (face: number | null, couponRate: number | null, maturity: string, value = face ?? 0): BondInfo => ({ face, couponRate, maturity, value });

describe('DEC-2748d + DEC-2748c · one matured-bond rule for every interest figure', () => {
  const matured = acct({ id: 'x', face: 10000, rate: 0.05, maturity: '2026-10-08' });   // matured yesterday
  const live = acct({ id: 'y', face: 2000, rate: 0.04, maturity: '2028-10-09' });
  test('couponIncomeAnnual = $80 (was $580)', () => { expect(couponIncomeAnnual([matured, live], TODAY)).toBe(80); });
  test('interestIncomeAnnual = $80', () => { expect(interestIncomeAnnual([matured, live], TODAY)).toBe(80); });
  test('bondSummary annual coupon = $80 (was $580)', () => { expect(bondSummary([matured, live].map(bondInfo), TODAY).annualCoupon).toBe(80); });
  test('the three agree', () => {
    const a = [matured, live];
    expect(couponIncomeAnnual(a, TODAY)).toBe(interestIncomeAnnual(a, TODAY));
    expect(bondSummary(a.map(bondInfo), TODAY).annualCoupon).toBe(interestIncomeAnnual(a, TODAY));
  });
  test('maturing today still pays its year; yesterday pays $0', () => {
    expect(yearlyInterestNow(bond(10000, 0.05, '2026-10-09'), TODAY)).toBe(500);
    expect(yearlyInterestNow(bond(10000, 0.05, '2026-10-08'), TODAY)).toBe(0);
  });
  test('no date, or an impossible one, is unknown — still counted, not matured', () => {
    expect(isPastMaturity('', TODAY)).toBe(false);
    expect(isPastMaturity('2026-02-30', TODAY)).toBe(false);
    expect(yearlyInterestNow(bond(5000, 0.04, ''), TODAY)).toBe(200);
  });
  test('no rate stays nothing from the helper, $0 in the totals', () => {
    expect(yearlyInterestNow(bond(10000, null, '2030-01-01'), TODAY)).toBeNull();
    expect(couponIncomeAnnual([acct({ face: 10000, maturity: '2030-01-01' })], TODAY)).toBe(0);
  });
});

describe('MK-NW-F-069 priceAtYield refuses what it cannot price', () => {
  test('missing face → nothing (was $0)', () => { expect(priceAtYield(bond(null, 0.05, '2030-01-01', 0), 0.04, D('2026-01-01'))).toBeNull(); });
  test('face 0 → nothing', () => { expect(priceAtYield({ face: 0, couponRate: 0.05, maturity: '2030-01-01', value: 0 }, 0.04, D('2026-01-01'))).toBeNull(); });
  test('yield −100% → nothing (was Infinity)', () => { expect(priceAtYield(bond(1000, 0.05, '2028-01-01'), -1, D('2026-01-01'))).toBeNull(); });
  test('yield −150% → nothing', () => { expect(priceAtYield(bond(1000, 0.05, '2028-01-01'), -1.5, D('2026-01-01'))).toBeNull(); });
  test('a real price is unchanged: 1,018.860946745562', () => {
    expect(priceAtYield(bond(1000, 0.05, '2028-01-01'), 0.04, D('2026-01-01'))!).toBeCloseTo(1018.860946745562, 10);
  });
});

describe('MK-NW-F-058 an impossible calendar date gives no answer', () => {
  test('2026-02-30 → nothing (was 0, read as matured)', () => { expect(yearsToMaturity('2026-02-30', TODAY)).toBeNull(); });
  test('2026-13-01 and 2026-04-31 → nothing', () => {
    expect(yearsToMaturity('2026-13-01', TODAY)).toBeNull();
    expect(yearsToMaturity('2026-04-31', TODAY)).toBeNull();
  });
  test('2028-02-29 is a real day', () => { expect(maturityParts('2028-02-29')).toEqual([2028, 2, 29]); });
  test('a real date is unchanged: 2027-01-01 from 2026-01-01 = 1', () => { expect(yearsToMaturity('2027-01-01', D('2026-01-01'))).toBe(1); });
  test('no accrued estimate on an impossible date', () => { expect(estimatedAccrued(bond(10000, 0.05, '2029-02-30'), TODAY)).toBeNull(); });
});
