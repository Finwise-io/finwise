// F15 — measured against the BROKER'S OWN STATEMENT (founder supplied it, 2026-08-16).
//
// Vanguard, 01/01/2026 → 08/14/2026, account 280195928105738:
//   Beginning balance      $378,021.92
//   Ending balance         $362,088.59
//   Deposits & withdrawals       $0.00      ← none. All year.
//   Investment returns       −$15,933.33     (market −19,762.99 + income 3,829.66)
//   Rate of return                  −4.2%
//
// What the app showed on the same day, for the same account:
//   Beginning market value  −$448,028        ← a NEGATIVE market value
//   Contributions         $1,462,462
//   Withdrawals             $623,627
//   Wealth generated        −$28,718
//   Ending market value     $362,089         ← the only figure that is right
//   Hero:  "Return on cash + investments +2.0%"
//
// Every line except the ending value is wrong, and the return has the wrong SIGN.
import { buildChangeWalk } from '../history';

const REAL = { beginning: 378_021.92, ending: 362_088.59, deposits: 0, withdrawals: 0, returns: -15_933.33 };

test("the broker's own figures reconcile — this is the target the app has to hit", () => {
  expect(+(REAL.beginning + REAL.returns).toFixed(2)).toBe(REAL.ending);
  expect(+(-19_762.99 + 3_829.66).toFixed(2)).toBe(REAL.returns);
});

test('THE ROOT CAUSE: "beginning market value" is BACK-SOLVED, never measured', () => {
  // the screen prints ending − contributions + withdrawals − wealthGenerated and calls it a
  // beginning balance. Feed it the app's own numbers and the impossible figure falls straight out.
  const ending = 362_089, contributions = 1_462_462, withdrawals = 623_627, wealth = -28_718;
  expect(ending - contributions + withdrawals - wealth).toBe(-448_028);
  // A market value cannot be negative. The minus sign is the proof it was never a measurement:
  // there is no stored record of what the account was worth on 1 January, so the app derives one
  // from today's value and the ledger — and inherits every error the ledger contains.
});

test('the ledger claims $1.4m of money moving in and out; the broker says none moved', () => {
  expect(REAL.deposits).toBe(0);
  expect(REAL.withdrawals).toBe(0);
  // With contributions and withdrawals both zero, the walk reduces to the truth…
  const honest = buildChangeWalk({
    beginning: REAL.beginning, ending: REAL.ending,
    contributions: 0, withdrawals: 0, dividends: 3_829.66, interest: 0,
    fromLabel: 'Jan 1', toLabel: 'Aug 14',
  });
  expect(honest.wealthGenerated).toBeCloseTo(REAL.returns, 2);
  expect(honest.marketChange).toBeCloseTo(-19_762.99, 2);   // Vanguard's own market gain/loss
  // …so the engine is capable of the right answer. It is being fed internal moves as if they were
  // external ones. Buying and selling inside an account is not money arriving or leaving.
});

test('the return sign is wrong, which is worse than the size being wrong', () => {
  const appSaid = 2.0, actual = -4.2;
  expect(Math.sign(appSaid)).not.toBe(Math.sign(actual));
  // a person reading "+2.0%" believes they made money in a year they lost 4.2%
});

test('and the same account carries two different values on one screen', () => {
  const inNetWorth = 362_089;      // matches the broker exactly
  const inPerformance = 137_660;   // the VANGUARD section on the Performance tab
  expect(inNetWorth).not.toBe(inPerformance);
  expect(inNetWorth).toBe(Math.round(REAL.ending));
});
