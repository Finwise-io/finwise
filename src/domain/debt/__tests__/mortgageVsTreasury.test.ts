// The mortgage-versus-Treasury comparison (founder ruling, 2026-08-14).
// Pinned against the figures in brief §3.3.1, which were computed independently.
import { compareMortgageToTreasury, TOO_CLOSE_POINTS } from '../mortgageVsTreasury';

const TSY = 0.0463;   // the live ten-year at the time these were pinned

test("ABOVE the yield: Pat's 5.5% loan — paying down wins, and by how much", () => {
  const c = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })!;
  expect(c.mortgagePct).toBe(5.5);
  expect(c.treasuryPct).toBe(4.63);
  expect(c.gapPoints).toBe(0.87);
  expect(c.annualDifference).toBe(3_584);
  expect(c.lifetimeDifference).toBe(36_577);
  expect(c.direction).toBe('paying-down-wins');
});

test('BELOW the yield: a 2021 loan at 3.1% — paying down COSTS, and by MORE', () => {
  const c = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.031, monthlyPayment: 2000, extraMonthly: 500, treasuryYield: TSY })!;
  expect(c.gapPoints).toBe(-1.53);
  expect(c.annualDifference).toBe(-6_304);
  expect(c.lifetimeDifference).toBe(-40_217);
  expect(c.direction).toBe('treasuries-win');
  // THE POINT OF THE FEATURE: the loss on a cheap loan is bigger than the gain on an expensive one.
  const above = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })!;
  expect(Math.abs(c.lifetimeDifference)).toBeGreaterThan(Math.abs(above.lifetimeDifference));
});

test("the figures follow the BALANCE — the v4 design kept one balance's numbers on another", () => {
  const at412 = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.031, monthlyPayment: 2000, extraMonthly: 500, treasuryYield: TSY })!;
  const at380 = compareMortgageToTreasury({ balance: 380_000, annualRate: 0.031, monthlyPayment: 2000, extraMonthly: 500, treasuryYield: TSY })!;
  expect(at412.annualDifference).toBe(-6_304);
  expect(at380.annualDifference).toBe(-5_814);
});

test('within a quarter-point we do not pick a winner', () => {
  const c = compareMortgageToTreasury({ balance: 400_000, annualRate: 0.045, monthlyPayment: 2200, extraMonthly: 500, treasuryYield: TSY })!;
  expect(Math.abs(c.gapPoints)).toBeLessThan(TOO_CLOSE_POINTS);
  expect(c.tooCloseToCall).toBe(true);
  expect(c.direction).toBe('too-close');
});

test('no extra payment → no lifetime figure invented, but the rate gap still holds', () => {
  const none = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 0, treasuryYield: TSY })!;
  expect(none.lifetimeDifference).toBe(0);
  expect(none.annualDifference).toBe(3_584);
});

test('a payment too small to cover the interest never invents a payoff date', () => {
  const c = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 100, extraMonthly: 50, treasuryYield: TSY })!;
  expect(c.lifetimeDifference).toBe(0);
});

test('nothing to compare → null, never a zero dressed as an answer', () => {
  expect(compareMortgageToTreasury({ balance: 0, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })).toBeNull();
  expect(compareMortgageToTreasury({ balance: 412_000, annualRate: 0, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })).toBeNull();
});
