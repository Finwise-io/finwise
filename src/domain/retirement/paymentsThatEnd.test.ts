// A LOAN PAYMENT THAT ENDS (founder ruling, 2026-08-14) — and what goes in changing year by year.
//
// The defect this closes shipped for a long time and no screen mentioned it: the app charged a
// person's whole spending figure, raised by inflation, for every year to the horizon. If that
// figure included a mortgage — and most people's would — it kept charging it after the house was
// paid off. Pat's clears in 2054 and his plan runs to 2058: four years of a payment that will not
// exist, making his odds pessimistic with nobody saying so.
import { simulate, type RetirementInputs } from './index';

const BASE: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90, start_balance: 909_152,
  annual_contribution: 12_000, retire_monthly_spend_today: 5200,
  guaranteed_monthly_income: 0, guaranteed_start_age: 67,
  mean_return: 0.0585, vol_return: 0.0752, inflation: 0.025, seed: 42, paths: 400, now_year: 2026,
} as any;
const odds = (o: Partial<RetirementInputs>) => simulate({ ...BASE, ...o } as RetirementInputs).chance_of_success;

test('a plan with no loan behaves EXACTLY as before — legacy pins untouched', () => {
  expect(odds({})).toBe(odds({ recurring_until: [] }));
  expect(odds({})).toBe(odds({ contribution_adjustments: [] }));
});

test('a payment that ends costs LESS than one charged forever', () => {
  const ends = odds({ recurring_until: [{ annual: 28_800, through_year: 2054 }] });
  const forever = odds({ recurring_until: [{ annual: 28_800, through_year: 2200 }] });
  expect(ends).toBeGreaterThan(forever);
});

test('THE POINT: paying it off sooner leaves more, because the payment genuinely stops', () => {
  const to2054 = odds({ recurring_until: [{ annual: 28_800, through_year: 2054 }] });
  const to2045 = odds({ recurring_until: [{ annual: 28_800, through_year: 2045 }] });
  expect(to2045).toBeGreaterThan(to2054);
});

test('the payment is FLAT, never inflated — a fixed mortgage is the same dollars in 2054', () => {
  const flat = simulate({ ...BASE, recurring_until: [{ annual: 28_800, through_year: 2054 }] } as any);
  const bigger = simulate({ ...BASE, recurring_until: [{ annual: 40_000, through_year: 2054 }] } as any);
  expect(flat.chance_of_success).toBeGreaterThan(bigger.chance_of_success);
});

test('a payment already finished costs nothing', () => {
  expect(odds({ recurring_until: [{ annual: 28_800, through_year: 2020 }] })).toBe(odds({}));
});

test('less going in while a loan runs LOWERS the odds — the trade is real, not a penalty', () => {
  const normal = odds({});
  const squeezed = odds({ contribution_adjustments: [{ annual: -6_000, from_year: 2026, through_year: 2045 }] });
  expect(squeezed).toBeLessThan(normal);
});

test('and the freed payment afterwards RAISES them — both halves of the trade are modelled', () => {
  // Pat retires in 2033, so contributions only exist 2026-2032. A loan cleared inside that window
  // frees its payment into savings; one cleared AFTER retirement frees it into spending instead,
  // which is what `recurring_until` handles. The two mechanisms cover different halves of a life
  // and neither is a substitute for the other — that is why both exist.
  const squeezedOnly = odds({ contribution_adjustments: [{ annual: -6_000, from_year: 2026, through_year: 2030 }] });
  const squeezedThenFreed = odds({ contribution_adjustments: [
    { annual: -6_000, from_year: 2026, through_year: 2030 },
    { annual: 34_800, from_year: 2031, through_year: 2032 },
  ] });
  expect(squeezedThenFreed).toBeGreaterThan(squeezedOnly);
});

test('a contribution change after retirement does nothing — there are no contributions then', () => {
  // guards the modelling mistake this test itself first made: a mortgage clearing at 79 does not
  // start topping up savings, it stops draining them.
  expect(odds({ contribution_adjustments: [{ annual: 34_800, from_year: 2046 }] })).toBe(odds({}));
});

test('what goes in never goes negative — a reduction bigger than the contribution stops at zero', () => {
  const inputs = { ...BASE, contribution_adjustments: [{ annual: -99_000, from_year: 2026 }] } as any;
  expect(simulate(inputs).projected_at_retirement).toBeGreaterThan(0);
});
