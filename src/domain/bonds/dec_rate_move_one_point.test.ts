// THE SIZE OF THE RATE MOVE IS 1 PERCENTAGE POINT — his approval, 2026-10-19, his words "rate rise 1% - approved."
// (DEC-6074 · MK-NW-F-064 bondRateSensitivity · figure MK-NW-M-028, the IF INTEREST RATES MOVE card on the account page).
// The estimate is what the bond would sell for if market rates moved 1 point up or down today — not its actual value;
// held to maturity, the face value comes back. Pinned on the account-page drawing v01's state E bond:
// US Treasury 4.00%, face $10,000, matures Sep 30, 2030, worth $9,850, today Sep 30, 2026 (yield about 4.4173%).
import { bondRateSensitivity, approxYTM, priceAtYield, type BondInfo } from './index';

const now = new Date('2026-09-30T12:00:00');
const bond: BondInfo = { face: 10000, couponRate: 0.04, maturity: '2030-09-30', value: 9850 };

test('the move is exactly 1 percentage point each way, and the ranges are the drawing’s', () => {
  const s = bondRateSensitivity(bond, now)!;
  const ytm = approxYTM(bond, now)!;
  const base = priceAtYield(bond, ytm, now)!;
  // rates up: the price at ytm + 0.01, less the price at ytm — exactly one point, nothing else
  expect(s.ratesUp.delta).toBe(Math.round(((priceAtYield(bond, ytm + 0.01, now)! - base)) / 10) * 10);
  expect(s.ratesDown.delta).toBe(Math.round(((priceAtYield(bond, ytm - 0.01, now)! - base)) / 10) * 10);
  expect(s.ratesUp).toEqual({ low: 9410, high: 9600, delta: -350 });
  expect(s.ratesDown.low).toBe(10110);
  expect(s.ratesDown.high).toBe(10320);
});
