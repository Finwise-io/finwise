// F5 — the safe-to-spend paycheck engine (approved detailed design v1.1; the headline net-new
// build of the 55-70 core). Answers "how much can I spend THIS month?" with that month's REAL
// facts: the guaranteed checks that land that month + a level safe draw from savings − the big
// dated bills due that month. Never a flat average (Principle 5).
//
// GUARANTEED — LOCKED DEFINITION (strategy-traceability round; PRD erratum 18):
//   guaranteed = ri_ss + ri_pension + ri_annuities + ri_other, received-now only.
//   ri_withdrawals and ri_rmd are EXCLUDED — the solved safe draw and the pinned required
//   withdrawal REPLACE them, so a savings-draw is never counted twice in the paycheck.
//
// SAFE DRAW: the largest level monthly draw that keeps the will-it-last simulation at or above
// Likely (chance ≥ 80), found by binary search over ~10 seeded runs (deterministic, testable).
// Assumptions are ADOPTED from Plan — this engine never invents its own. The classic 4%-a-year
// guideline is a sanity BAND (drawRateFlag), never the derivation.
import type { OnboardingProfile } from '../onboardingProfile';
import { toNum, round2 } from '../_shared/num';
import { simulate, type RetirementInputs } from '../retirement';
import { retirementEarmarkedValue, type AssetAccount } from '../assets';
import { buildDatedGrid, type GridBillItem } from '../grid';
import type { Debt } from '../debt';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The four guaranteed sources (LOCKED — withdrawals/rmd deliberately absent):
const GUARANTEED_KEYS: { key: string; label: string }[] = [
  { key: 'ss', label: 'Social Security' },
  { key: 'pension', label: 'Pension' },
  { key: 'annuities', label: 'Annuity' },
  { key: 'other', label: 'Other retirement income' },
];

export interface GuaranteedRow { source: string; amount: number; month: number; year: number; day?: number }
export interface PaycheckMonth {
  calendarMonth: number;             // 1–12
  year: number;
  label: string;                     // 'Jul' … 'Jan ’27'
  guaranteed: { source: string; amount: number; day?: number }[];
  guaranteedTotal: number;
  safeDraw: number;                  // level by design — the steadying flywheel
  bills: { label: string; amount: number; day?: number }[];   // big DATED bills only (everyday
  billsTotal: number;                                          // monthly spending is what the
  netSafeToSpend: number;                                      // paycheck is FOR — not subtracted)
}
export interface PaycheckYear {
  months: PaycheckMonth[];
  thisMonth: PaycheckMonth;
  thisYear: number;                  // EXACT sum of the 12 months — never monthly × 12
  safeDrawMonthly: number;
  drawRateFlag: 'ok' | 'high' | null;   // 'high' = above the classic 4%/yr guideline (inform, never advise)
  guaranteedMissing: boolean;        // no guaranteed income captured → the UI prompts, never fakes $0
  nestEgg: number;
}
export interface PaycheckSimInputs {
  current_age: number;
  horizon_age: number;
  mean_return: number;               // decimal
  vol_return: number;                // decimal
  inflation: number;                 // decimal
  seed?: number;
  paths?: number;
}
export interface PaycheckOptions {
  accounts?: AssetAccount[];         // nest egg = the retirement-earmarked share (live balances)
  nestEgg?: number;                  // explicit override (projection mode)
  liabilities?: Debt[];              // deferred debts surface via the grid
  sim: PaycheckSimInputs;            // ADOPTED from Plan's shared assumptions
  now?: Date;
  chanceFloor?: number;              // default 80 — the 'Likely' threshold
}

/** The dated guaranteed-income rows for the next 12 months (the F2 grid seam).
 *  Received-now gate: identical rule to currentRetirementIncomeMonthly — ri_* counts only when
 *  'retirement_income' is among the selected income sources (or there is no source list). */
export function guaranteedRows(op: OnboardingProfile | null, now: Date = new Date()): GuaranteedRow[] {
  const a: Record<string, any> = op ?? {};
  const srcs = a.incomeSources;
  if (Array.isArray(srcs) && !srcs.includes('retirement_income')) return [];
  const startMonth = now.getMonth(), startYear = now.getFullYear();
  const monthAt = (s: number) => ((startMonth + s) % 12) + 1;
  const yearAt = (s: number) => startYear + Math.floor((startMonth + s) / 12);
  const slotOf = (m1to12: number) => ((m1to12 - 1) - startMonth + 12) % 12;   // next occurrence
  const rows: GuaranteedRow[] = [];
  for (const { key, label } of GUARANTEED_KEYS) {
    const amt = toNum(a['ri_' + key]);
    if (amt <= 0) continue;
    const freq = a['ri_' + key + '_freq'] ?? 'monthly';
    const day = toNum(a['ri_' + key + '_day']) || undefined;
    // 'lands-in' month for annual/quarterly rhythms — the USER's month, never a December default
    const anchorSlot = a['ri_' + key + '_month'] ? slotOf(Math.min(12, Math.max(1, toNum(a['ri_' + key + '_month'])))) : 0;
    if (freq === 'annual') rows.push({ source: label, amount: amt, month: monthAt(anchorSlot), year: yearAt(anchorSlot), day });
    else if (freq === 'quarterly') for (let q = 0; q < 4; q++) { const s = (anchorSlot + q * 3) % 12; rows.push({ source: label, amount: amt, month: monthAt(s), year: yearAt(s), day }); }
    else for (let s = 0; s < 12; s++) rows.push({ source: label, amount: amt, month: monthAt(s), year: yearAt(s), day });
  }
  return rows;
}

/** Largest level monthly draw that keeps chance-of-success ≥ the floor. Deterministic (seeded). */
export function solveSafeDraw(nestEgg: number, guaranteedMonthlyAvg: number, sim: PaycheckSimInputs, chanceFloor = 80): number {
  if (nestEgg <= 0) return 0;
  const base: RetirementInputs = {
    current_age: sim.current_age, retire_age: sim.current_age, horizon_age: sim.horizon_age,
    start_balance: nestEgg, annual_contribution: 0,
    retire_monthly_spend_today: 0, guaranteed_monthly_income: guaranteedMonthlyAvg,
    guaranteed_start_age: sim.current_age,
    inflation: sim.inflation, mean_return: sim.mean_return, vol_return: sim.vol_return,
    paths: sim.paths ?? 300, seed: sim.seed ?? 42,
  };
  const chanceAt = (draw: number) =>
    simulate({ ...base, retire_monthly_spend_today: guaranteedMonthlyAvg + draw }).chance_of_success;
  // upper bound: spend the whole egg flat over the remaining years, doubled — always infeasible
  const years = Math.max(1, sim.horizon_age - sim.current_age);
  let lo = 0, hi = Math.max(100, (nestEgg / years / 12) * 2);
  if (chanceAt(hi) >= chanceFloor) return round2(hi);          // even the cap is safe (huge egg / short horizon)
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (chanceAt(mid) >= chanceFloor) lo = mid; else hi = mid;
  }
  return round2(Math.floor(lo / 5) * 5);                       // round DOWN to $5 — never overstate "safe"
}

/** Build the month-by-month paycheck. Pure; recompute triggers are the caller's job. */
export function buildPaycheckYear(op: OnboardingProfile | null, opts: PaycheckOptions): PaycheckYear {
  const now = opts.now ?? new Date();
  const rows = guaranteedRows(op, now);
  const nestEgg = round2(opts.nestEgg ?? retirementEarmarkedValue(opts.accounts ?? []));
  const guaranteedAnnual = rows.reduce((t, r) => t + r.amount, 0);
  const safeDraw = solveSafeDraw(nestEgg, guaranteedAnnual / 12, opts.sim, opts.chanceFloor ?? 80);
  const drawRateFlag: PaycheckYear['drawRateFlag'] =
    nestEgg <= 0 || safeDraw <= 0 ? null : (safeDraw * 12) / nestEgg > 0.045 ? 'high' : 'ok';

  // dated bills come from the F2 grid (one grid — the paycheck never invents its own calendar);
  // big bills = the NAMED dated items; the grid's 'Everyday spending' reconciler and regular
  // monthly debt payments stay OUT — the paycheck exists to pay those.
  const grid = buildDatedGrid(op, { now, liabilities: opts.liabilities, guaranteedIncome: rows });
  const bigBills = (items: GridBillItem[]) =>
    items.filter((b) => b.kind === 'bill' && b.label !== 'Everyday spending');

  const startMonth = now.getMonth(), startYear = now.getFullYear();
  const months: PaycheckMonth[] = Array.from({ length: 12 }, (_, s) => {
    const cm = ((startMonth + s) % 12) + 1;
    const yr = startYear + Math.floor((startMonth + s) / 12);
    const label = MONTHS[cm - 1] + (yr > startYear ? ` ’${String(yr).slice(2)}` : '');
    const g = rows.filter((r) => r.month === cm && r.year === yr)
      .map((r) => ({ source: r.source, amount: round2(r.amount), day: r.day }));
    const gTotal = g.reduce((t, x) => t + x.amount, 0);
    const cell = grid.cells[s];
    const bills = bigBills(cell.billItems).map((b) => ({ label: b.label, amount: b.amount, day: b.day }));
    const bTotal = bills.reduce((t, b) => t + b.amount, 0);
    return {
      calendarMonth: cm, year: yr, label,
      guaranteed: g, guaranteedTotal: round2(gTotal),
      safeDraw, bills, billsTotal: round2(bTotal),
      netSafeToSpend: round2(gTotal + safeDraw - bTotal),
    };
  });
  return {
    months, thisMonth: months[0],
    thisYear: round2(months.reduce((t, m) => t + m.netSafeToSpend, 0)),   // exact sum, never ×12
    safeDrawMonthly: safeDraw, drawRateFlag,
    guaranteedMissing: rows.length === 0,
    nestEgg,
  };
}
