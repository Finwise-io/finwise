// PROBES — bond maths, and how fresh a number is.
//
// Bonds matter disproportionately for this audience: a 55-to-70 saver is far likelier to hold a CD
// than an option, and a CD carries facts a share does not — a coupon, a maturity, a yield. The
// freshness rules matter for a different reason: a stale price is not a wrong price, but showing it
// without saying so IS wrong.
import { annualCoupon, yearsToMaturity, currentYield, approxYTM, bondSummary, bondInfo, isBond } from '../../src/domain/bonds';
import { isPlausibleTicker, priceFreshness } from '../../src/services/marketData';

const B = (o: any = {}) => ({ face: 10_000, couponRate: 0.04, maturity: '2028-08-17', value: 9_800, ...o });
const NOW = new Date('2026-08-17T12:00:00Z');

// ════════════════════════════════════════════════════════════════════════════════════════════════
// BOND_COUPON · BOND_CURRENT_YIELD · BOND_YTM
// DERIVATION RULE: a bond's income comes off its FACE value, but its yield is measured against what
// it is WORTH. Confusing the two is the classic bond error and it flatters a discounted holding.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('BOND_COUPON / YIELD / YTM', () => {
  test('the coupon is paid on FACE value, not on what the bond is worth', () => {
    expect(annualCoupon(B())).toBe(400);                    // 10,000 × 4%, not 9,800 × 4%
  });

  test('current yield measures that income against what it is WORTH today', () => {
    expect(currentYield(B())).toBeCloseTo(0.0408, 4);        // 400 ÷ 9,800 — higher than the coupon
  });

  test('a bond bought at a discount yields MORE than its coupon, and the maths shows it', () => {
    expect(currentYield(B({ value: 9_000 }))!).toBeGreaterThan(0.04);
    expect(currentYield(B({ value: 11_000 }))!).toBeLessThan(0.04);
  });

  test('yield to maturity also counts the pull back to face over the years remaining', () => {
    const ytm = approxYTM(B(), NOW)!;
    expect(ytm).toBeGreaterThan(currentYield(B())!);         // a discount bond gains as it matures
  });

  test('a MATURED bond has no yield to maturity — null, never zero', () => {
    expect(approxYTM(B({ maturity: '2020-01-01' }), NOW)).toBeNull();
    expect(yearsToMaturity('2020-01-01', NOW)).toBe(0);      // never negative
  });

  test('no value means no yield rather than a division by zero', () => {
    expect(currentYield(B({ value: 0 }))).toBeNull();
    expect(approxYTM(B({ value: 0 }), NOW)).toBeNull();
  });

  test('no maturity date at all is UNKNOWN — not zero years, not forever (G11, founder 2026-09-12)', () => {
    expect(yearsToMaturity('', NOW)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// BOND_SUMMARY
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('BOND_SUMMARY', () => {
  test('values, face and coupon all sum, and the average yield is coupon over value', () => {
    const s = bondSummary([B(), B({ face: 5_000, couponRate: 0.05, value: 5_000 })], NOW);
    expect(s.totalValue).toBe(14_800);
    expect(s.totalFace).toBe(15_000);
    expect(s.annualCoupon).toBe(650);                        // 400 + 250 — the field is annualCoupon, not coupon
    expect(s.count).toBe(2);
    expect(s.nextMaturity).toBe('2028-08-17');               // the soonest maturity STILL AHEAD
    expect(s.avgYield).toBeCloseTo(650 / 14_800, 4);
  });

  test('no bonds gives no average yield rather than zero — "none held" is not "yields nothing"', () => {
    expect(bondSummary([], NOW).avgYield).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// PRICE_FRESHNESS
// DERIVATION RULE: four days is the staleness line, because a long weekend or a holiday can put
// three days between two perfectly normal updates. Anything never fetched is stale, not fresh.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('PRICE_FRESHNESS', () => {
  const now = Date.parse('2026-08-17T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  test('it says how long ago in words a person uses', () => {
    expect(priceFreshness(ago(0), now).label).toBe('just now');
    expect(priceFreshness(ago(3 * 3_600_000), now).label).toBe('3h ago');
    expect(priceFreshness(ago(86_400_000), now).label).toBe('1 day ago');
    expect(priceFreshness(ago(2 * 86_400_000), now).label).toBe('2 days ago');
  });

  test('four days is the line — a long weekend must not raise a false alarm', () => {
    expect(priceFreshness(ago(3 * 86_400_000), now).stale).toBe(false);
    expect(priceFreshness(ago(4 * 86_400_000), now).stale).toBe(true);
  });

  test('never fetched is STALE, not fresh — silence is not good news', () => {
    expect(priceFreshness(null, now)).toEqual({ label: 'not updated yet', stale: true });
    expect(priceFreshness('nonsense', now).stale).toBe(true);
  });

  test('a timestamp in the future is treated as unknown rather than as very fresh', () => {
    expect(priceFreshness(new Date(now + 86_400_000).toISOString(), now).stale).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// TICKER_PLAUSIBLE
// DERIVATION RULE: this catches a TYPO before it becomes a silent zero. A CUSIP is deliberately not
// plausible — it is nine characters with digits — because a CD should never be priced as a share.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('TICKER_PLAUSIBLE', () => {
  test('ordinary tickers pass, including class suffixes', () => {
    for (const t of ['VTI', 'AAPL', 'BRK.B', 'RDS-A']) expect(isPlausibleTicker(t)).toBe(true);
  });

  test('a CUSIP is NOT a ticker — a CD must never be sent to a share price feed', () => {
    expect(isPlausibleTicker('06418AAA1')).toBe(false);
  });

  test('empty, spaces and over-long strings are rejected', () => {
    for (const t of ['', '   ', 'TOOLONGTICKER']) expect(isPlausibleTicker(t)).toBe(false);
  });
});
