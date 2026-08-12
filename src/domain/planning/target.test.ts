// THE DERIVED TARGET — the second gauge's engine. The point of these tests is that the target and
// the odds can never contradict each other, because they come from one simulation.
import { planTarget, targetAtRetirement, requiredAnnualSaving, leverDeltas, ssUpliftFactor, TARGET_ODDS } from './target';
import { simulate, type RetirementInputs } from '../retirement';

// Pat, 58, working — the brief's persona, with the numbers that reconcile
const PAT: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90,
  start_balance: 909_152, annual_contribution: 0,
  retire_monthly_spend_today: 5_200,
  guaranteed_monthly_income: 0, guaranteed_start_age: 67,
  inflation: 0.025, mean_return: 0.077, vol_return: 0.11,
  paths: 400, seed: 42,
};

test('the target is the pot that reaches 80% odds — and it really does reach it', () => {
  const t = targetAtRetirement(PAT)!;
  expect(t).toBeGreaterThan(0);
  // start retirement with exactly that pot and the odds clear the bar…
  const atTarget = simulate({ ...PAT, current_age: PAT.retire_age, start_balance: t, annual_contribution: 0 });
  expect(atTarget.chance_of_success).toBeGreaterThanOrEqual(TARGET_ODDS);
  // …and meaningfully less than it does not. (A target you could undershoot and still hit is no target.)
  const short = simulate({ ...PAT, current_age: PAT.retire_age, start_balance: t * 0.7, annual_contribution: 0 });
  expect(short.chance_of_success).toBeLessThan(TARGET_ODDS);
});

test('the target and the odds are one fact, not two — progress and odds move the same way', () => {
  const poor = planTarget({ ...PAT, start_balance: 300_000 });
  const rich = planTarget({ ...PAT, start_balance: 2_000_000 });
  expect(poor.odds).toBeLessThan(rich.odds);
  expect(poor.progressPct!).toBeLessThan(rich.progressPct!);
  // the failure this design exists to prevent: being most of the way to a "target" with poor odds
  expect(poor.progressPct!).toBeLessThan(80);
});

test('both figures are measured AT RETIREMENT, so the comparison is apples to apples', () => {
  const p = planTarget(PAT);
  // the numerator is what the plan is on track for at the same moment the target describes
  expect(p.projectedAtRetirement).toBe(Math.round(simulate(PAT).projected_at_retirement));
  expect(p.projectedAtRetirement).toBeGreaterThan(PAT.start_balance);   // seven years of growth
  expect(p.progressPct).toBe(Math.round((p.projectedAtRetirement / p.targetAtRetirement!) * 100));
});

test('the required saving actually gets there, and is returned as the EXTRA over what they already put away', () => {
  const need = requiredAnnualSaving(PAT)!;
  expect(simulate({ ...PAT, annual_contribution: need.total }).chance_of_success).toBeGreaterThanOrEqual(TARGET_ODDS);
  expect(need.extra).toBe(need.total);                       // Pat saves nothing today, so all of it is extra
  const saver = requiredAnnualSaving({ ...PAT, annual_contribution: 12_000 })!;
  expect(saver.extra).toBe(Math.max(0, saver.total - 12_000));
});

test('someone already past 80% is told there is nothing to add', () => {
  const p = planTarget({ ...PAT, start_balance: 3_000_000 });
  expect(p.alreadyThere).toBe(true);
  expect(p.requiredExtraAnnual).toBe(0);
  expect(p.impossible).toBe(false);
  expect(p.progressPct!).toBeGreaterThanOrEqual(100);
});

test('when the honest number is more than they earn, it is flagged — never softened', () => {
  const broke = planTarget({ ...PAT, start_balance: 120_000, current_age: 58 }, 90_000);
  expect(broke.odds).toBeLessThan(TARGET_ODDS);
  expect(broke.requiredExtraAnnual).toBeGreaterThan(90_000);
  expect(broke.impossible).toBe(true);
});

test('the levers are real re-runs — each one names what it is worth, biggest first', () => {
  const levers = leverDeltas({ ...PAT, start_balance: 400_000, guaranteed_monthly_income: 2_600 });
  expect(levers.length).toBeGreaterThan(0);
  for (const l of levers) expect(l.points).toBeGreaterThan(0);
  expect(levers.map((l) => l.points)).toEqual([...levers.map((l) => l.points)].sort((a, b) => b - a));
  // each lever's claim is checkable against the engine it came from
  const base = simulate({ ...PAT, start_balance: 400_000, guaranteed_monthly_income: 2_600 }).chance_of_success;
  for (const l of levers) {
    const moved = simulate({ ...PAT, start_balance: 400_000, guaranteed_monthly_income: 2_600, ...l.apply }).chance_of_success;
    expect(moved - base).toBe(l.points);
  }
});

test('claiming later raises the CHECK, not just its start date', () => {
  expect(ssUpliftFactor(67, 70)).toBeCloseTo(1.24);
  expect(ssUpliftFactor(67, 67)).toBe(1);
  const levers = leverDeltas({ ...PAT, start_balance: 400_000, guaranteed_monthly_income: 2_600 });
  const claim = levers.find((l) => l.key === 'claim-later');
  if (claim) expect(claim.apply.guaranteed_monthly_income!).toBeGreaterThan(2_600);
});

test('no Social Security on file means no claim-later lever — we never offer a choice they do not have', () => {
  expect(leverDeltas(PAT).some((l) => l.key === 'claim-later')).toBe(false);
});

test('the same inputs always give the same target — a person who reopens the screen sees no drift', () => {
  expect(targetAtRetirement(PAT)).toBe(targetAtRetirement(PAT));
  expect(planTarget(PAT).requiredExtraAnnual).toBe(planTarget(PAT).requiredExtraAnnual);
});

test('SPEED: the whole outcome block computes fast enough to sit behind a stepper', () => {
  const t0 = Date.now();
  planTarget(PAT, 108_000);
  leverDeltas(PAT);
  const ms = Date.now() - t0;
  // a person holding a stepper expects the number to move; this is the budget that keeps it honest
  expect(ms).toBeLessThan(1500);
  console.log(`   outcome block: ${ms}ms (target solve + saving solve + levers)`);
});
