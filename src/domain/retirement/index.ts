// Retirement / Simulation module (spec service 6) — accumulation only.
// Monte Carlo probability-of-success ("chance of success", Boldin-style), netting
// guaranteed income out of required spending. Pure + seedable for tests.
import type { UserId } from '../_shared/ids';
import { round2, toNum } from '../_shared/num';
import type { OnboardingProfile } from '../onboardingProfile';
import { colFactor } from './col';

export { colFactor, type ColMatch } from './col';

// ── Capital needed at retirement (amortization-based, Bogleheads-ABW style) ──
// Replaces the 4%-rule ×25 heuristic: horizon-aware, nets guaranteed income, and treats a
// bequest as an EXPLICIT input (default 0 = spend down to zero — the 25× rule silently
// preserved principal forever, which is a bequest assumption nobody asked for).
// All amounts in TODAY'S dollars; `realReturn` = nominal portfolio return minus inflation,
// so no separate inflation escalator is needed and the answer reads in today's money.
export interface CapitalNeedInputs {
  monthlySpend: number;        // retirement spending, today's $
  guaranteedMonthly: number;   // Social Security / pension / annuities, today's $
  retireAge: number;
  horizonAge: number;          // plan-to age (money lasts until here)
  realReturn: number;          // drawdown-phase REAL return (decimal, e.g. 0.03)
  bequest: number;             // desired terminal balance, today's $ (0 = die near zero)
}
export interface CapitalNeed {
  needed: number;              // capital required at retirement
  netAnnual: number;           // spending net of guaranteed income, per year
  years: number;               // funded years (retire → horizon)
  annuityFactor: number;       // PV factor applied to netAnnual
  pvBequest: number;           // today's-$ cost of the bequest
}
export function capitalNeeded(inp: CapitalNeedInputs): CapitalNeed {
  const years = Math.max(1, inp.horizonAge - inp.retireAge);
  const netAnnual = Math.max(0, (inp.monthlySpend - inp.guaranteedMonthly) * 12);
  const r = inp.realReturn;
  const annuityFactor = r > 0 ? (1 - Math.pow(1 + r, -years)) / r : years;
  const pvBequest = inp.bequest > 0 ? inp.bequest / Math.pow(1 + Math.max(0, r), years) : 0;
  return {
    needed: round2(netAnnual * annuityFactor + pvBequest),
    netAnnual: round2(netAnnual), years, annuityFactor: Math.round(annuityFactor * 100) / 100,
    pvBequest: round2(pvBequest),
  };
}

/** All-in monthly retirement spend = base + travel + medical (annual→monthly), adjusted by the
 *  expected trajectory (spend less / same / more later) and the retirement location's
 *  cost-of-living factor (retLocation). Returns 0 if nothing's set (caller falls back). */
export function retirementSpendMonthly(op: OnboardingProfile | null): number {
  const a = op ?? {};
  const base = toNum(a.expectedRetirementSpending) || toNum(a.monthlySpending) || 0;
  const travel = toNum(a.travelBudget) / 12;
  const medical = toNum(a.medicalBudget) / 12;
  const mult = a.spendingChangeLater === 'less' ? 0.85 : a.spendingChangeLater === 'more' ? 1.15 : 1;
  return round2((base + travel + medical) * mult * colFactor(a.retLocation).factor);
}

export interface RetirementInputs {
  /** PRD F9#12 — the law forces pre-tax money out from 73 and the TAX on it is a real drag.
   *  pre_tax_share = the fraction of start_balance that is pre-tax (from taxBucketSplit);
   *  rmd_tax_rate = the effective ordinary rate on those withdrawals. Both optional —
   *  omitted, the model behaves exactly as before (legacy pins unchanged). */
  pre_tax_share?: number;            // 0-1
  rmd_tax_rate?: number;             // 0-1, default 0.22 when pre_tax_share is set
  current_age: number;
  retire_age: number;
  horizon_age: number;               // plan-to age
  start_balance: number;             // current investable assets
  annual_contribution: number;       // contributions + employer match, per year
  retire_monthly_spend_today: number;// desired retirement spend, today's dollars
  guaranteed_monthly_income: number; // Social Security / pension (0 if unknown), today's $
  guaranteed_start_age?: number;     // age guaranteed income begins (SS claim age); defaults to retire_age
  inflation: number;                 // annual, decimal (default from economic data)
  contribution_growth?: number;      // annual raise applied to contributions (decimal, default 0)
  mean_return: number;               // annual nominal, decimal
  vol_return: number;                // annual stdev, decimal
  paths?: number;
  seed?: number;
  with_band?: boolean;               // also return the per-year percentile balance band
}

export interface BandPoint { age: number; p10: number; p50: number; p90: number; }

export interface RetirementState {
  user_id: UserId;
  chance_of_success: number;         // 0–100
  projected_at_retirement: number;   // median balance at retirement
  needed: number;                    // corpus needed (4% rule on net spending)
  gap: number;                       // needed − projected (positive = short)
  suggested_extra_monthly: number;   // extra monthly contribution to close the gap
  assumptions: { inflation: number; mean_return: number; vol_return: number; paths: number };
}

// deterministic RNG so results/tests are reproducible
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(rng: () => number, mean: number, sd: number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
// p in [0,1] over a pre-sorted ascending array (nearest-rank)
function pctOfSorted(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

// SECURE 2.0 / IRS Uniform Lifetime Table — mirrored from decumulation (import would cycle);
// state_contract pins the two in agreement.
const RMD_START_AGE_SIM = 73;
const ULT_SIM: [number, number][] = [[73, 26.5], [75, 24.6], [80, 20.2], [85, 16.0], [90, 12.2], [95, 8.9], [100, 6.4]];
function rmdDivisorSim(age: number): number {
  if (age <= ULT_SIM[0][0]) return ULT_SIM[0][1];
  for (let i = 1; i < ULT_SIM.length; i++) {
    if (age <= ULT_SIM[i][0]) {
      const [a0, d0] = ULT_SIM[i - 1], [a1, d1] = ULT_SIM[i];
      return d0 + ((age - a0) / (a1 - a0)) * (d1 - d0);
    }
  }
  return ULT_SIM[ULT_SIM.length - 1][1];
}

export function simulate(inp: RetirementInputs) {
  const paths = inp.paths ?? 500;
  const nAcc = Math.max(0, inp.retire_age - inp.current_age);
  const nDec = Math.max(0, inp.horizon_age - inp.retire_age);
  const rng = mulberry32(inp.seed ?? 12345);
  const inflFactor = Math.pow(1 + inp.inflation, nAcc);
  const spendAtRetire = inp.retire_monthly_spend_today * 12 * inflFactor;       // nominal $ at retirement
  const guarAtRetire = inp.guaranteed_monthly_income * 12 * inflFactor;
  const claimAge = Math.max(inp.guaranteed_start_age ?? inp.retire_age, inp.retire_age); // SS starts here (≥ retirement)

  const totalYears = nAcc + nDec;                      // year 0 = today, …, year totalYears = horizon
  // per-year balance across paths, only when a band is requested (keeps the hot path lean)
  const yearly: number[][] | null = inp.with_band ? Array.from({ length: totalYears + 1 }, () => [] as number[]) : null;

  let successes = 0;
  const atRetire: number[] = [];
  for (let p = 0; p < paths; p++) {
    let bal = inp.start_balance;
    if (yearly) yearly[0].push(bal);
    const g = inp.contribution_growth ?? 0;
    for (let y = 0; y < nAcc; y++) {
      bal = bal * (1 + normal(rng, inp.mean_return, inp.vol_return)) + inp.annual_contribution * Math.pow(1 + g, y);
      if (yearly) yearly[y + 1].push(Math.max(0, bal));
    }
    atRetire.push(bal);
    let spend = spendAtRetire, guar = guarAtRetire, survived = true, depleted = false;
    // RMD drag: track the pre-tax slice so the forced withdrawal + its tax can leave the egg
    const rmdOn = (inp.pre_tax_share ?? 0) > 0;
    let preTaxBal = rmdOn ? bal * Math.min(1, Math.max(0, inp.pre_tax_share!)) : 0;
    const rmdRate = Math.min(0.6, Math.max(0, inp.rmd_tax_rate ?? 0.22));
    for (let y = 0; y < nDec; y++) {
      if (!depleted) {
        const age = inp.retire_age + y;
        const guarNow = age >= claimAge ? guar : 0;   // SS only from the claim age
        const net = Math.max(0, spend - guarNow);
        const growth = 1 + normal(rng, inp.mean_return, inp.vol_return);
        bal = bal * growth - net;
        if (rmdOn) {
          preTaxBal = Math.max(0, Math.min(bal, preTaxBal * growth - net * (bal > 0 ? preTaxBal / Math.max(bal, preTaxBal) : 1)));
          if (age >= RMD_START_AGE_SIM && preTaxBal > 0) {
            const rmd = preTaxBal / rmdDivisorSim(age);
            preTaxBal -= rmd;                          // forced OUT of pre-tax (net stays in the egg)
            bal -= rmd * rmdRate;                      // …but its TAX leaves the egg for real
          }
        }
        if (bal < 0) { bal = 0; survived = false; depleted = true; }
        spend *= (1 + inp.inflation); guar *= (1 + inp.inflation);
      }
      if (yearly) yearly[nAcc + y + 1].push(Math.max(0, bal));
    }
    if (survived) successes++;
  }

  let band: BandPoint[] | undefined;
  if (yearly) {
    band = yearly.map((col, y) => {
      const s = [...col].sort((a, b) => a - b);
      return { age: inp.current_age + y, p10: round2(pctOfSorted(s, 0.1)), p50: round2(pctOfSorted(s, 0.5)), p90: round2(pctOfSorted(s, 0.9)) };
    });
  }

  const projected = median(atRetire);
  const needed = Math.max(0, spendAtRetire - guarAtRetire) * 25;               // 4% rule on net spend
  const gap = Math.max(0, needed - projected);
  // extra monthly contribution to close the gap by retirement (future value of an annuity)
  const rm = inp.mean_return / 12, n = nAcc * 12;
  const fvFactor = rm > 0 && n > 0 ? (Math.pow(1 + rm, n) - 1) / rm : n;
  const extraMonthly = gap > 0 && fvFactor > 0 ? gap / fvFactor : 0;

  return {
    chance_of_success: Math.round((successes / paths) * 100),
    projected_at_retirement: round2(projected),
    needed: round2(needed),
    gap: round2(gap),
    suggested_extra_monthly: round2(extraMonthly),
    band,
  };
}

export function buildRetirementState(uid: UserId, inp: RetirementInputs): RetirementState {
  const sim = simulate(inp);
  return {
    user_id: uid, ...sim,
    assumptions: { inflation: inp.inflation, mean_return: inp.mean_return, vol_return: inp.vol_return, paths: inp.paths ?? 500 },
  };
}

// ── Deterministic projection (instant — drives the live sliders; no RNG) ──────────────
// Assumes the average return every year (no market swings). Pairs with simulate() for the
// confidence read. Models Social Security starting at its claim age, with inflation on both
// spending and benefits, so an early retiree's pre-claim "gap years" are counted correctly.
export interface NestEggProjection {
  will_have: number;   // nest egg you'll have AT retirement (current pot grown + contributions)
  will_need: number;   // nest egg you'll need at retirement to fund the plan to the horizon
  shortfall: number;   // need − have (positive = short)
}

export function projectNestEgg(inp: RetirementInputs): NestEggProjection {
  const r = inp.mean_return, f = inp.inflation;
  const nAcc = Math.max(0, inp.retire_age - inp.current_age);
  const nDec = Math.max(0, inp.horizon_age - inp.retire_age);
  const claimAge = Math.max(inp.guaranteed_start_age ?? inp.retire_age, inp.retire_age);

  // accumulate: current balance compounds; each year's contribution (growing with raises) compounds for the years left
  const g = inp.contribution_growth ?? 0;
  let have = inp.start_balance * Math.pow(1 + r, nAcc);
  for (let y = 0; y < nAcc; y++) have += inp.annual_contribution * Math.pow(1 + g, y) * Math.pow(1 + r, nAcc - y - 1);

  // need: present value (at retirement) of the inflation-growing net withdrawal stream
  const inflFactor = Math.pow(1 + f, nAcc);
  let spend = inp.retire_monthly_spend_today * 12 * inflFactor;
  let guar = inp.guaranteed_monthly_income * 12 * inflFactor;
  let need = 0;
  for (let y = 0; y < nDec; y++) {
    const guarNow = (inp.retire_age + y) >= claimAge ? guar : 0;
    const net = Math.max(0, spend - guarNow);
    need += net / Math.pow(1 + r, y);          // discount back to the retirement year
    spend *= (1 + f); guar *= (1 + f);
  }
  return { will_have: round2(have), will_need: round2(need), shortfall: round2(Math.max(0, need - have)) };
}

// "Even if you never save another dollar, you can retire at age Y." Earliest retire age where
// the current pot (no further contributions) already covers the plan. Returns null if not by `maxAge`.
export function solveRetireAge(inp: RetirementInputs, maxAge = 80): number | null {
  for (let age = inp.current_age; age <= maxAge; age++) {
    const p = projectNestEgg({ ...inp, annual_contribution: 0, retire_age: age, guaranteed_start_age: inp.guaranteed_start_age });
    if (p.will_have >= p.will_need) return age;
  }
  return null;
}
