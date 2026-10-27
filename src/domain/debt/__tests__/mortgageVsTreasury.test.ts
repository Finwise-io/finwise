// The mortgage-versus-Treasury comparison (founder ruling, 2026-08-14).
// Pinned against the figures in brief §3.3.1, which were computed independently.
import { compareMortgageToTreasury, TOO_CLOSE_POINTS } from '../mortgageVsTreasury';

const TSY = 0.0463;   // the live ten-year at the time these were pinned

test("ABOVE the yield: Pat's 5.5% loan — paying down wins, and by how much", () => {
  const c = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })!;
  expect(c.mortgagePct).toBe(5.5);
  expect(c.treasuryPct).toBe(4.63);
  expect(c.gapPoints).toBe(0.87);
  expect(Math.round(c.annualDifference)).toBe(3_584);
  expect(Math.round(c.lifetimeDifference)).toBe(39_618);   // FIXED 2026-10-25: each route's last payment is only what is left (was 36,577)
  expect(c.direction).toBe('paying-down-wins');
});

test('BELOW the yield: a 2021 loan at 3.1% — paying down COSTS, and by MORE', () => {
  const c = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.031, monthlyPayment: 2000, extraMonthly: 500, treasuryYield: TSY })!;
  expect(c.gapPoints).toBe(-1.53);
  expect(Math.round(c.annualDifference)).toBe(-6_304);
  expect(Math.round(c.lifetimeDifference)).toBe(-41_295);  // FIXED 2026-10-25: the last payment is only what is left (was −40,217)
  expect(c.direction).toBe('treasuries-win');
  // THE POINT OF THE FEATURE: the loss on a cheap loan is bigger than the gain on an expensive one.
  const above = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })!;
  expect(Math.abs(c.lifetimeDifference)).toBeGreaterThan(Math.abs(above.lifetimeDifference));
});

test("the figures follow the BALANCE — the v4 design kept one balance's numbers on another", () => {
  const at412 = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.031, monthlyPayment: 2000, extraMonthly: 500, treasuryYield: TSY })!;
  const at380 = compareMortgageToTreasury({ balance: 380_000, annualRate: 0.031, monthlyPayment: 2000, extraMonthly: 500, treasuryYield: TSY })!;
  expect(Math.round(at412.annualDifference)).toBe(-6_304);
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
  expect(Math.round(none.annualDifference)).toBe(3_584);
});

test('a payment too small to cover the interest never invents a payoff date', () => {
  const c = compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 100, extraMonthly: 50, treasuryYield: TSY })!;
  expect(c.lifetimeDifference).toBe(0);
});

test('nothing to compare → null, never a zero dressed as an answer', () => {
  expect(compareMortgageToTreasury({ balance: 0, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })).toBeNull();
  expect(compareMortgageToTreasury({ balance: 412_000, annualRate: 0, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })).toBeNull();
});

// ── 2026-10-25, FIX-ROOM — the three fixes of this wave, worked by hand ───────────────────────────────────────────────
import { balanceGrownTo } from '../mortgageVsTreasury';

test('AFTER FEDERAL TAX when the bracket is known (the lead\'s ruling on MK-CF-F-043, tenet 7, DEC-0160): 4.10% against a 4.30% Treasury at 24%', () => {
  const c = compareMortgageToTreasury({ balance: 173_111.17, annualRate: 0.041, monthlyPayment: 1131.43, extraMonthly: 0, treasuryYield: 0.043, federalRate: 0.24 })!;
  expect(c.basis).toBe('after-tax');
  expect(c.treasuryAfterTaxPct).toBeCloseTo(3.268, 12);                  // 4.30 × (1 − 0.24)
  expect(c.federalRatePct).toBe(24);
  expect(c.gapPoints).toBe(0.83);                                         // 4.10 − 3.268, to two decimals
  expect(c.direction).toBe('paying-down-wins');
  expect(c.annualDifference).toBeCloseTo((0.041 - 0.043 * 0.76) * 173_111.17, 9);   // $1,440.28
  expect(Math.round(c.annualDifference)).toBe(1440);
  // with no bracket the same loan is compared before tax, and says so
  const before = compareMortgageToTreasury({ balance: 173_111.17, annualRate: 0.041, monthlyPayment: 1131.43, extraMonthly: 0, treasuryYield: 0.043 })!;
  expect([before.basis, before.treasuryAfterTaxPct, before.gapPoints, before.direction]).toEqual(['before-tax', null, -0.2, 'too-close']);
});
test.failing('the comparison until 2026-10-25, pinned: before tax whatever the bracket — "too close to call" at 24% — no longer its answer (FIXED 2026-10-25)', () => {
  expect(compareMortgageToTreasury({ balance: 173_111.17, annualRate: 0.041, monthlyPayment: 1131.43, extraMonthly: 0, treasuryYield: 0.043, federalRate: 0.24 })!.direction).toBe('too-close');
});

test('A LOAN THAT CLEARS AFTER 1,200 MONTHS is run to the month it clears (MK-CF-F-125, tenets 1–2): $100,000 at 6%, $501 a month, $100 extra', () => {
  const c = compareMortgageToTreasury({ balance: 100_000, annualRate: 0.06, monthlyPayment: 501, extraMonthly: 100, treasuryYield: 0.04 })!;
  // by hand: 1,247 payments at $501 (monthsToClear), 358 at $601 → the lifetime line is built on 1,247, not on a 1,200 stop
  expect(c.lifetimeDifference).toBeCloseTo(cashWalk(100_000, 0.06, 501, 100, 0.04), 4);   // 1,247 months of float sums: to 1/100 of a cent
  expect(Math.round(c.lifetimeDifference)).toBe(1_425_530);
  expect(c.noLifetimeBecause).toBeNull();
});

/** THE TWO ROUTES WALKED MONTH BY MONTH, AS CASH — written apart from the app's formula: each month both routes have
 *  payment + extra; whatever the loan does not take that month (all of it once the loan is gone, the unneeded part of the last
 *  payment, the extra on the Treasuries route) is put in Treasuries at the month's end. The gap at the later payoff date. */
function cashWalk(balance: number, rate: number, payment: number, extra: number, yieldRate: number): number {
  const pays = (pay: number) => { const out: number[] = []; for (let b = balance; b > 0;) { const due = b * (1 + rate / 12); const p = Math.min(pay, due); out.push(p); b = due - p; } return out; };
  const base = pays(payment), fast = pays(payment + extra);
  let a = 0, t = 0;
  for (let k = 0; k < base.length; k++) {
    a = a * (1 + yieldRate / 12) + (payment + extra - (fast[k] ?? 0));
    t = t * (1 + yieldRate / 12) + (payment + extra - base[k]);
  }
  return a - t;
}

// FIXED 2026-10-25 (FIX-ROOM; tenet 1): THE LAST PAYMENT IS ONLY WHAT IS LEFT, PLUS THAT MONTH'S INTEREST. The lifetime line
// counted each route's last payment as a full one. Worked by hand on $10,000 at 6% with $501/month: after 21 payments $40.11 is
// left (10,000 × 1.005^21 − 501 × (1.005^21 − 1) ÷ 0.005); the 22nd payment is $40.11 × 1.005 = $40.31; the interest is
// 21 × $501 + $40.31 − $10,000 = $561.31.
test('the last payment is what is left plus that month\'s interest — and both routes are walked as cash to the same end date', () => {
  const g = 1.005 ** 21;
  const left = 10_000 * g - 501 * (g - 1) / 0.005;
  expect(left).toBeCloseTo(40.11, 2);
  expect(left * 1.005).toBeCloseTo(40.31, 2);
  expect(21 * 501 + left * 1.005 - 10_000).toBeCloseTo(561.31, 2);
  // the comparison agrees with the cash walk, both ways and on the long loan
  for (const [b, r, p, e] of [[412_000, 0.055, 2400, 500], [412_000, 0.031, 2000, 500], [10_000, 0.06, 401, 100]] as const) {
    expect(compareMortgageToTreasury({ balance: b, annualRate: r, monthlyPayment: p, extraMonthly: e, treasuryYield: TSY })!.lifetimeDifference)
      .toBeCloseTo(cashWalk(b, r, p, e, TSY), 6);
  }
  // at a 0% yield the gap is exactly the interest the extra saves: $10,000 at 6%, $401 or $501 a month
  const interest = (pay: number) => { let i = 0; for (let b = 10_000; b > 0;) { i += b * 0.005; b = b * 1.005 - pay; } return i; };
  expect(compareMortgageToTreasury({ balance: 10_000, annualRate: 0.06, monthlyPayment: 401, extraMonthly: 100, treasuryYield: 0 })!.lifetimeDifference)
    .toBeCloseTo(interest(401) - interest(501), 6);
});
test.failing('the comparison until 2026-10-25, pinned: Pat\'s lifetime figure $36,577, the last payments counted in full — no longer its answer (FIXED 2026-10-25)', () => {
  expect(Math.round(compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 500, treasuryYield: TSY })!.lifetimeDifference)).toBe(36_577);
});
test('a payment that never clears the loan gives no lifetime figure and says why; no extra says that instead', () => {
  expect(compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 100, extraMonthly: 50, treasuryYield: TSY })!.noLifetimeBecause).toBe('never-clears');
  expect(compareMortgageToTreasury({ balance: 412_000, annualRate: 0.055, monthlyPayment: 2400, extraMonthly: 0, treasuryYield: TSY })!.noLifetimeBecause).toBe('no-extra');
});

test('AT 0% THE DEPOSITS THEMSELVES (MK-CF-F-126 through MK-CF-F-229): $500 a month for 12 months = $6,000; with $10,000 opening, $16,000', () => {
  expect(balanceGrownTo(0, 500, 0, 12)).toBe(6000);
  expect(balanceGrownTo(10_000, 500, 0, 12)).toBe(16_000);
});
test.failing('the helper until 2026-10-25, pinned: 0 ÷ 0 at 0% — NaN — no longer its answer (FIXED 2026-10-25)', () => {
  expect(Number.isNaN(balanceGrownTo(0, 500, 0, 12))).toBe(true);
});
