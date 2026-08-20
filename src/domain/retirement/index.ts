// Retirement / Simulation module (spec service 6) — accumulation only.
// Monte Carlo probability-of-success ("chance of success", Boldin-style), netting
// guaranteed income out of required spending. Pure + seedable for tests.
import type { UserId } from '../_shared/ids';
import { rmdStartAgeFromAge, rmdDivisor as engineRmdDivisor } from '../../../Calculation Module code/engines/rmd';
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
  /** B1 (founder brief 2026-08-20): guaranteed income as separate STREAMS — Social Security
   *  inflates (COLA); most private pensions and annuities are FLAT, and inflating a flat pension
   *  for 30 years at 2.5% roughly doubles it (the largest single arithmetic error in the plan
   *  engine). When present this replaces guaranteed_monthly_income/guaranteed_start_age.
   *  B5: OUTSIDE money only — never portfolio withdrawals or RMDs, which would let the pot fund
   *  itself. */
  guaranteed_streams?: { kind?: 'ss' | 'pension' | 'annuity' | 'other'; monthly: number; inflates: boolean; start_age?: number }[];
  inflation: number;                 // annual, decimal (default from economic data)
  contribution_growth?: number;      // annual raise applied to contributions (decimal, default 0)
  mean_return: number;               // annual nominal, decimal
  vol_return: number;                // annual stdev, decimal
  paths?: number;
  seed?: number;
  with_band?: boolean;               // also return the per-year percentile balance band
  /** Big one-time costs (founder-approved 2026-08-02): today's dollars + the calendar year they
   *  land. Each is inflated to its year and subtracted once — before AND after retirement. */
  one_off_costs?: { amount: number; year: number }[];
  /** PAYMENTS THAT STOP — a mortgage or loan that ends inside the plan (founder, 2026-08-14).
   *
   *  The app asks what a person will spend each month and charged that figure, raised by inflation,
   *  for EVERY year to the horizon. Anyone whose spending answer included a mortgage was being
   *  charged it long after the house was paid off — Pat's clears in 2054 and his plan runs to 2058,
   *  four years of a payment that will not exist. Today's odds are pessimistic for all of them and
   *  no screen says so.
   *
   *  The founder's ruling: we TELL the person we include their loan payments for as long as they
   *  run, and take them from the loan itself. So the spending answer excludes debt, and these are
   *  charged on top until they end.
   *
   *  NOT INFLATED, and that is the point of a separate field rather than a spending adjustment: a
   *  fixed-rate mortgage payment is the same number of dollars in 2054 as today. Inflating it for
   *  28 years would overstate it by more than half. */
  recurring_until?: { annual: number; through_year: number }[];
  /** Changes to what goes IN, year by year (founder, 2026-08-14). Paying $500 a month extra on a
   *  mortgage is $6,000 a year NOT going into savings while the loan runs — and the whole payment
   *  freeing up once it clears. One flat contribution figure can represent neither half. */
  contribution_adjustments?: { annual: number; from_year: number; through_year?: number }[];
  now_year?: number;                 // calendar year of 'today' (callers pass it; deterministic default)
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

// B4 (founder brief 2026-08-20): the RMD rule lives in the ONE dated, sourced table — the
// Calculation Module's rmd engine. The mirror this file used to carry is gone.

export function simulate(inp: RetirementInputs) {
  const paths = inp.paths ?? 500;
  const nAcc = Math.max(0, inp.retire_age - inp.current_age);
  const nDec = Math.max(0, inp.horizon_age - inp.retire_age);
  const rng = mulberry32(inp.seed ?? 12345);
  const inflFactor = Math.pow(1 + inp.inflation, nAcc);
  const spendAtRetire = inp.retire_monthly_spend_today * 12 * inflFactor;       // nominal $ at retirement
  // B1: each stream inflates to retirement ONLY if it actually rises; a flat pension stays flat.
  // The legacy single figure keeps its old (inflating) behaviour for callers not yet migrated.
  const streams = (inp.guaranteed_streams ?? [
    { monthly: inp.guaranteed_monthly_income, inflates: true, start_age: inp.guaranteed_start_age },
  ]).map((st) => ({
    startAge: Math.max(st.start_age ?? inp.retire_age, inp.retire_age),
    inflates: st.inflates,
    annualAtRetire: (st.monthly || 0) * 12 * (st.inflates ? inflFactor : 1),
  }));
  const guarAtRetire = streams.reduce((t, st) => t + st.annualAtRetire, 0);

  const totalYears = nAcc + nDec;                      // year 0 = today, …, year totalYears = horizon
  // big one-time costs by sim-year offset, inflated from today's dollars to their year
  const nowYear = inp.now_year ?? 2026;
  // B4: the person's own RMD start age (birth year ≈ now − current age), from the one table
  const birthYearSim = nowYear - inp.current_age;
  const rmdStartSim = rmdStartAgeFromAge(inp.current_age, nowYear);
  const oneOffByYear: Record<number, number> = {};
  for (const c of inp.one_off_costs ?? []) {
    if (!(c.amount > 0)) continue;
    const off = c.year - nowYear;
    if (off < 0 || off > totalYears) continue;         // past or beyond the horizon: not simulated
    oneOffByYear[off] = (oneOffByYear[off] || 0) + c.amount * Math.pow(1 + inp.inflation, Math.max(0, off));
  }
  // PAYMENTS THAT STOP — charged flat, never inflated (a fixed mortgage payment does not rise)
  const recurringByYear: Record<number, number> = {};
  for (const r of inp.recurring_until ?? []) {
    if (!(r.annual > 0)) continue;
    const last = Math.min(totalYears, r.through_year - nowYear);
    for (let y = 1; y <= last; y++) recurringByYear[y] = (recurringByYear[y] || 0) + r.annual;
  }
  // CHANGES TO WHAT GOES IN, by year — reductions while a loan runs, the freed payment afterwards
  const contribByYear: Record<number, number> = {};
  for (const a of inp.contribution_adjustments ?? []) {
    const from = Math.max(0, a.from_year - nowYear);
    const through = a.through_year != null ? Math.min(totalYears, a.through_year - nowYear) : totalYears;
    for (let y = from; y <= through; y++) contribByYear[y] = (contribByYear[y] || 0) + a.annual;
  }
  // per-year balance across paths, only when a band is requested (keeps the hot path lean)
  const yearly: number[][] | null = inp.with_band ? Array.from({ length: totalYears + 1 }, () => [] as number[]) : null;

  let successes = 0;
  const atRetire: number[] = [];
  for (let p = 0; p < paths; p++) {
    let bal = inp.start_balance;
    if (yearly) yearly[0].push(bal);
    const g = inp.contribution_growth ?? 0;
    for (let y = 0; y < nAcc; y++) {
      // what goes in this year: the plan's contribution, plus or minus anything a loan changed
      const putIn = Math.max(0, inp.annual_contribution * Math.pow(1 + g, y) + (contribByYear[y] || 0));
      bal = bal * (1 + normal(rng, inp.mean_return, inp.vol_return)) + putIn;
      bal -= oneOffByYear[y + 1] || 0;                 // a roof in 2028 leaves the egg in 2028
      bal -= recurringByYear[y + 1] || 0;              // …and a loan payment leaves it until it ends
      if (yearly) yearly[y + 1].push(Math.max(0, bal));
    }
    atRetire.push(bal);
    let spend = spendAtRetire, survived = true, depleted = false;
    let streamVals = streams.map((st) => st.annualAtRetire);
    // RMD drag: track the pre-tax slice so the forced withdrawal + its tax can leave the egg
    const rmdOn = (inp.pre_tax_share ?? 0) > 0;
    let preTaxBal = rmdOn ? bal * Math.min(1, Math.max(0, inp.pre_tax_share!)) : 0;
    const rmdRate = Math.min(0.6, Math.max(0, inp.rmd_tax_rate ?? 0.22));
    for (let y = 0; y < nDec; y++) {
      if (!depleted) {
        const age = inp.retire_age + y;
        // each stream pays only once its own start age is reached (SS from its claim age)
        const guarNow = streams.reduce((t, st, i) => t + (age >= st.startAge ? streamVals[i] : 0), 0);
        const net = Math.max(0, spend - guarNow);
        const growth = 1 + normal(rng, inp.mean_return, inp.vol_return);
        // the loan payment is charged flat on top of spending, and stops in its own year
        bal = bal * growth - net - (oneOffByYear[nAcc + y + 1] || 0) - (recurringByYear[nAcc + y + 1] || 0);
        if (rmdOn) {
          preTaxBal = Math.max(0, Math.min(bal, preTaxBal * growth - net * (bal > 0 ? preTaxBal / Math.max(bal, preTaxBal) : 1)));
          if (age >= rmdStartSim && preTaxBal > 0) {
            const rmd = preTaxBal / Math.max(1, engineRmdDivisor(age, birthYearSim));
            preTaxBal -= rmd;                          // forced OUT of pre-tax (net stays in the egg)
            bal -= rmd * rmdRate;                      // …but its TAX leaves the egg for real
          }
        }
        if (bal < 0) { bal = 0; survived = false; depleted = true; }
        spend *= (1 + inp.inflation);
        // B1: only the streams that actually rise, rise — a flat pension is flat forever
        streamVals = streamVals.map((v, i) => (streams[i].inflates ? v * (1 + inp.inflation) : v));
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

/** The Social Security stream inside an input set, when streams are in use. */
export function ssStreamOf(inp: RetirementInputs): { monthly: number; start_age?: number } | null {
  const st = (inp.guaranteed_streams ?? []).find((x) => x.kind === 'ss');
  return st ? { monthly: st.monthly, start_age: st.start_age } : null;
}

/** An input set with its Social Security stream replaced — the ONE way a decision screen patches
 *  a claim scenario, so the flat streams ride along untouched and the legacy fields stay in step
 *  for anything still reading them. */
export function withSsStream(inp: RetirementInputs, monthly: number, claimAge: number): RetirementInputs {
  const others = (inp.guaranteed_streams ?? []).filter((x) => x.kind !== 'ss');
  return {
    ...inp,
    guaranteed_streams: [{ kind: 'ss', monthly, inflates: true, start_age: claimAge }, ...others],
    guaranteed_monthly_income: monthly + others.reduce((t, x) => t + x.monthly, 0),
    guaranteed_start_age: claimAge,
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
/** THE one-year growth step (Build-47 walk row 9, audit Strategy #10): every deterministic
 *  projection grows money through this. The RMD schedule used its own inline compounding WITH a
 *  schedule-only 12% clamp — a quiet divergence from the nest-egg projection's convention. The
 *  closed-form projections (compound interest via Math.pow) are mathematically THIS step iterated;
 *  an agreement test pins that equivalence. */
export function growOneYear(balance: number, rate: number): number {
  return balance * (1 + (rate || 0));
}

export interface NestEggProjection {
  will_have: number;   // nest egg you'll have AT retirement (current pot grown + contributions)
  will_need: number;   // nest egg you'll need at retirement to fund the plan to the horizon
  shortfall: number;   // need − have (positive = short)
}

export function projectNestEgg(inp: RetirementInputs): NestEggProjection {
  const r = inp.mean_return, f = inp.inflation;
  const nAcc = Math.max(0, inp.retire_age - inp.current_age);
  const nDec = Math.max(0, inp.horizon_age - inp.retire_age);
  // accumulate: current balance compounds; each year's contribution (growing with raises) compounds for the years left
  const g = inp.contribution_growth ?? 0;
  let have = inp.start_balance * Math.pow(1 + r, nAcc);
  for (let y = 0; y < nAcc; y++) have += inp.annual_contribution * Math.pow(1 + g, y) * Math.pow(1 + r, nAcc - y - 1);

  // need: present value (at retirement) of the inflation-growing net withdrawal stream
  // B1: same stream rule as simulate() — flat streams stay flat, only inflating ones rise
  const inflFactor = Math.pow(1 + f, nAcc);
  const streams = (inp.guaranteed_streams ?? [
    { monthly: inp.guaranteed_monthly_income, inflates: true, start_age: inp.guaranteed_start_age },
  ]).map((st) => ({
    startAge: Math.max(st.start_age ?? inp.retire_age, inp.retire_age),
    inflates: st.inflates,
    annual: (st.monthly || 0) * 12 * (st.inflates ? inflFactor : 1),
  }));
  let spend = inp.retire_monthly_spend_today * 12 * inflFactor;
  let streamVals = streams.map((st) => st.annual);
  let need = 0;
  for (let y = 0; y < nDec; y++) {
    const ageNow = inp.retire_age + y;
    const guarNow = streams.reduce((t, st, i) => t + (ageNow >= st.startAge ? streamVals[i] : 0), 0);
    const net = Math.max(0, spend - guarNow);
    need += net / Math.pow(1 + r, y);          // discount back to the retirement year
    spend *= (1 + f);
    streamVals = streamVals.map((v, i) => (streams[i].inflates ? v * (1 + f) : v));
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
