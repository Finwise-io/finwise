// F5 — the safe-to-spend paycheck function (approved detailed design v1.1; the headline net-new
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
// Assumptions are ADOPTED from Plan — this function never invents its own. The classic 4%-a-year
// guideline is a sanity BAND (drawRateFlag), never the derivation.
import type { OnboardingProfile } from '../onboardingProfile';
import { toNum } from '../_shared/num';
import { simulate, type RetirementInputs } from '../retirement';
import { volOf } from '../retirement/willItLast';
import { retirementEarmarkedValue, blendedReturn, blendedVolatility, portfolioActualReturn, type AssetAccount } from '../assets';
import { buildDatedGrid, datedBillsIn, type GridBillItem } from '../grid';
import type { Debt } from '../debt';
import { declareFigures, writeFigure } from '../../../MoneyKeel/functions/_figure-spec';   // the assumed return is a declared figure (MK-CF-M-082, 2026-10-26)

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
  billsTotal: number;                                          // monthly expenses is what the
  netSafeToSpend: number;                                      // paycheck is FOR — not subtracted)
}
export interface PaycheckYear {
  months: PaycheckMonth[];
  thisMonth: PaycheckMonth;
  thisYear: number;                  // EXACT sum of the 12 months — never monthly × 12
  safeDrawMonthly: number;
  drawRateFlag: 'ok' | 'high' | null;   // 'high' = above the classic 4%/year guideline (inform, never advise)
  guaranteedMissing: boolean;        // no guaranteed income entered → the UI prompts, never fakes $0
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

export interface PaycheckReturn {
  mean_return: number;               // decimal
  vol_return: number;                // decimal
  /** where the rate comes from: the return set on the Plan, the accounts' own 12-month return, the blended benchmark of
   *  the accounts, or the typical 6% when nothing is set aside for retirement */
  basis: 'scenario' | 'actual' | 'benchmark' | 'typical';
  /** the rate stated in words, for the screen that shows the paycheck: "6.00%/year — the typical return, with nothing
   *  set aside for retirement" */
  said: string;
}

/** WHAT RETURN THE PAYCHECK SIMULATION RUNS ON — the Retirement cockpit's own, so the paycheck and the odds are one plan.
 *  (2026-10-25, FIX-ROOM; the lead's ruling on CFR-4's second question, under tenet 4 of DEC-3523.) With no return set
 *  it is the blended benchmark of the accounts set aside for retirement, and 6% when nothing is (MK-PL-F-067 willItLastInputs
 *  chooses the same); a return set on the Plan, or the 12-month basis, is used the way the cockpit uses it; the volatility
 *  is the accounts' own, else the rate's band (volOf). Until now the paycheck ran a flat 5.5% with a 1.7 × spread
 *  whenever no return was set: accounts blending to 7.0% put the odds on 7.0% and the paycheck on 5.5%.
 *  Example: nothing set aside, nothing set → 6.00%/year, volatility 10.2%, "the typical return". */
/* ─ MK-CF-F-279 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * paycheckReturn
 *
 * Answers ..... WHAT RETURN THE PAYCHECK SIMULATION RUNS ON — the Retirement cockpit's own, so the paycheck and the odds are one plan.
 *
 * Formula .....
 *     a = assumptions (or none when missing)
 *     held = accounts (or none when missing)
 *     rentals = op!.rentals   if array.is array(op.rentals)
 *     nothing   otherwise
 *     blended = blended return(held, undefined, rentals)
 *     bench = blended (or 0.06 when missing)
 *     actual = portfolio actual return(held)
 *     chosen = A.return basis (or 'benchmark' when missing)
 *     mean = actual (or bench when missing)   if chosen = 'actual'
 *     A.expected return (or bench when missing)   if chosen = 'scenario'
 *     bench   otherwise   otherwise
 *
 * Called by ... MK-CF-F-107 buildPaycheckYear
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-O-017 futurePaycheck
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-028 assumed return
 *               MK-XS-I-044 the person’s own plan overrides
 *
 * Decides .....
 *     · If blended is missing it uses 6%.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-279
 * Changed ..... not in git yet (—)
 */
export function paycheckReturn(accounts: AssetAccount[] | null | undefined, assumptions: Record<string, any> | null | undefined, op?: Record<string, any> | null): PaycheckReturn {
  const A = assumptions ?? {};
  const held = accounts ?? [];
  const rentals = Array.isArray(op?.rentals) ? op!.rentals : null;   // the rent entries decide the home (DEC-4913)
  const blended = blendedReturn(held, undefined, rentals);
  const bench = blended ?? 0.06;
  const actual = portfolioActualReturn(held);
  const chosen: 'benchmark' | 'actual' | 'scenario' = A.returnBasis ?? 'benchmark';
  const mean = chosen === 'actual' ? (actual ?? bench) : chosen === 'scenario' ? (A.expectedReturn ?? bench) : bench;
  const basis: PaycheckReturn['basis'] =
    chosen === 'scenario' && A.expectedReturn != null ? 'scenario'
      : chosen === 'actual' && actual != null ? 'actual'
        : blended != null ? 'benchmark' : 'typical';
  const words = { scenario: 'your scenario return', actual: 'your 12-month return', benchmark: 'the blended benchmark',
    typical: 'the typical return, with nothing set aside for retirement' }[basis];
  return {
    mean_return: mean,
    vol_return: blendedVolatility(held, undefined, rentals) ?? volOf(mean),
    basis,
    // the rate is written by its declaration, MK-CF-M-082 — the one writer and its identifier (2026-10-26, PF-TOOLS)
    // canon row 14: printed "6.00%/year" — the period comes from the declaration (cash-flow_v01, READ THIS FIRST 2026-10-26)
    said: `${writeFigure(PAYCHECK_RETURN_FIGURES['MK-CF-M-082'], mean, { withPeriod: true })} — ${words}`,
  };
}

/** What it is for: THE GROWTH A PRE-TAX BALANCE IS PROJECTED AT, AND THE LINE THAT SAYS IT (2026-10-26, CLEANUP-LEFT; the lead's
 *  round 2, item 5; tenet 1 of DEC-3523 — the rate stated is the rate used). Roth conversion and Required withdrawals grow pre-tax
 *  money to the first required withdrawal at the Plan's one return (paycheckReturn), never below 0%: a balance is not projected
 *  to shrink on a past loss. Until today a negative 12-month return was stated as it was and the balance grown at 0%. When the
 *  floor is what is used, the words say so; a screen prints them after "Growth used: ". Example: a 12-month return of −4.20% →
 *  rate 0, "0.00%/year — your last 12 months were −4.20%; we don’t project a loss forward". A 7.90% benchmark → rate 0.079,
 *  "7.90%/year — the blended benchmark" (paycheckReturn's own words). */
/* ─ MK-CF-F-282 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * growthUsed
 *
 * Answers ..... What it is for: THE GROWTH A PRE-TAX BALANCE IS PROJECTED AT, AND THE LINE THAT SAYS IT (2026-10-26, CLEANUP-LEFT; the lead's round 2, item 5; tenet 1 of DEC-3523 — the rate stated is the rate used).
 *
 * Formula .....
 *     rate = ret.mean return
 *     said = ret.said   when ret.mean return ≥ 0
 *     lost = `−${write figure(PAYCHECK_RETURN_FIGURES['MK − CF − M − 082'], math.abs(ret.mean return))}`
 *     whose = `your last 12 months were ${lost}`   if ret.basis = 'actual'
 *     `your scenario return is ${lost}`   if ret.basis = 'scenario'
 *     `the return is ${lost}`   otherwise   otherwise
 *     the answer:
 *     rate = 0
 *     said = `0.00% ÷ year — ${whose}; we don’t project a loss forward`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-028 assumed return
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-282
 * Changed ..... not in git yet (—)
 */
export function growthUsed(ret: PaycheckReturn): { rate: number; said: string } {
  if (ret.mean_return >= 0) return { rate: ret.mean_return, said: ret.said };
  const lost = `−${writeFigure(PAYCHECK_RETURN_FIGURES['MK-CF-M-082'], Math.abs(ret.mean_return))}`;
  const whose = ret.basis === 'actual' ? `your last 12 months were ${lost}` : ret.basis === 'scenario' ? `your scenario return is ${lost}` : `the return is ${lost}`;
  return { rate: 0, said: `0.00%/year — ${whose}; we don’t project a loss forward` };
}

/** The dated guaranteed-income rows for the next 12 months (the F2 grid seam).
 *  Received-now gate: identical rule to currentRetirementIncomeMonthly — ri_* counts only when
 *  'retirement_income' is among the selected income sources (or there is no source list). */
/* ─ MK-CF-F-105 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * guaranteedRows
 *
 * Answers ..... The dated guaranteed-income rows for the next 12 months (the F2 grid seam).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     srcs = income sources
 *     []   when array.is array(srcs) and !srcs.includes('retirement_income')
 *     start month = now.get month(), start year = now.get full year()
 *     month at = (s: number) => ((start month + s) % 12) + 1
 *     year at = (s: number) => start year + round down((start month + s) ÷ 12)
 *     slot of = (m1to12: number) => ((m1to12 − 1) − start month + 12) % 12
 *     rows = []
 *     amt = a['ri_' + key] read as a number (0 when it is not one)
 *     freq = a['ri_' + key + '_freq'] (or 'monthly' when missing)
 *     day = a['ri_' + key + '_day'] read as a number (0 when it is not one) (or undefined when missing or zero)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-107 buildPaycheckYear
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-O-017 futurePaycheck
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-040 whether a stream is already being received
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-105
 * Changed ..... 2026-07-12 (652a06e)
 */
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
/* ─ MK-CF-F-106 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * solveSafeDraw
 *
 * Answers ..... Largest level monthly draw that keeps chance-of-success ≥ the floor.
 *
 * Formula .....
 *     0   when nest egg ≤ 0
 *     years = max(1, sim.horizon age − sim.current age)
 *     lo = 0, hi = max(100, (nest egg ÷ years ÷ 12) × 2)
 *     round down(hi ÷ 5) × 5   when k ≥ 20
 *     mid = (lo + hi) ÷ 2
 *     draw = round down(lo ÷ 5) × 5
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-CF-F-107 buildPaycheckYear
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-O-017 futurePaycheck
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-029 inflation rate
 *               MK-XS-I-043 their own retirement contribution
 *
 * Decides .....
 *     · If paths is missing it uses 1000.
 *     · If seed is missing it uses 42.
 *     · Treats a year as twelve equal months.
 *     · Never lets draw fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-106
 * Changed ..... 2026-07-12 (652a06e)
 */
export function solveSafeDraw(nestEgg: number, guaranteedMonthlyAvg: number, sim: PaycheckSimInputs, chanceFloor = 80): number {
  if (nestEgg <= 0) return 0;
  const base: RetirementInputs = {
    current_age: sim.current_age, retire_age: sim.current_age, horizon_age: sim.horizon_age,
    start_balance: nestEgg, annual_contribution: 0,
    retire_monthly_spend_today: 0, guaranteed_monthly_income: guaranteedMonthlyAvg,
    guaranteed_start_age: sim.current_age,
    inflation: sim.inflation, mean_return: sim.mean_return, vol_return: sim.vol_return,
    paths: sim.paths ?? 1000, seed: sim.seed ?? 42,
  };
  const chanceAt = (draw: number) =>
    simulate({ ...base, retire_monthly_spend_today: guaranteedMonthlyAvg + draw }).chance_of_success;
  // the first top: spend the whole egg flat over the remaining years, doubled
  const years = Math.max(1, sim.horizon_age - sim.current_age);
  let lo = 0, hi = Math.max(100, (nestEgg / years / 12) * 2);
  // RAISE THE TOP UNTIL A DRAW FAILS (2026-10-25, FIX-ROOM; tenet 1 and this function's own word, "largest"): the first top
  // is not always too much — a 10% plan on a 6%-volatility pot passes there — and the search handed that top back,
  // $961.73, unrounded and never tried higher. Doubled up to 20 times (a million times the first top) before it gives up.
  for (let k = 0; chanceAt(hi) >= chanceFloor; k++) {
    if (k >= 20) return Math.floor(hi / 5) * 5;          // no draw fails at all (a floor of 0)
    lo = hi; hi *= 2;
  }
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (chanceAt(mid) >= chanceFloor) lo = mid; else hi = mid;
  }
  // round DOWN to $5 — never overstate "safe" — and TEST THE ROUNDED DRAW (2026-10-25, FIX-ROOM; tenet 1): the seeded chance
  // does not fall steadily as the draw rises ($570: 94.7, $575: 95.4, $580: 94.7 on one plan), so $580 came back for a
  // floor of 95 and tested at 94.7. Step down $5 at a time until the draw handed back holds the floor; $0 always does.
  let draw = Math.floor(lo / 5) * 5;
  while (draw > 0 && chanceAt(draw) < chanceFloor) draw -= 5;
  return Math.max(0, draw);
}

/** Build the month-by-month paycheck. Pure; recompute triggers are the caller's job. */
/* ─ MK-CF-F-107 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * buildPaycheckYear
 *
 * Answers ..... Build the month-by-month paycheck.
 *
 * Formula .....
 *     now = opts.now (or new date() when missing)
 *     rows = guaranteed rows(op, now)
 *     nest egg = opts.nest egg (or retirement earmarked value(opts.accounts ?? [], array.is array((op as any).rentals) ? (op as any).rentals : nothing) when missing)
 *     guaranteed annual = Σ over rows of (amount)
 *     draw from savings = solve draw from savings(nest egg, guaranteed annual ÷ 12, opts.sim, opts.chance floor ?? 80)
 *     grid = build dated grid(op, { now, liabilities: opts.liabilities, guaranteed income: rows })
 *     big bills = (cell: any) => dated bills in(cell)
 *     start month = now.get month(), start year = now.get full year()
 *     cm = ((start month + s) % 12) + 1
 *     yr = start year + round down((start month + s) ÷ 12)
 *     label = MONTHS[cm − 1] + (yr > start year ? ` ’${string(yr).slice(2)}` : '')
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-O-017 futurePaycheck
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck
 *
 * Serves ...... MK-CF-M-022
 * Reads ....... MK-XS-I-028 assumed return
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If chance floor is missing it uses 80.
 *     · Treats a year as twelve equal months.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-107
 * Changed ..... 2026-07-12 (652a06e)
 */
export function buildPaycheckYear(op: OnboardingProfile | null, opts: PaycheckOptions): PaycheckYear {
  const now = opts.now ?? new Date();
  const rows = guaranteedRows(op, now);
  // the rent entries decide the home, as Net worth reads it (DEC-4913, 2026-10-13)
  const nestEgg = (opts.nestEgg ?? retirementEarmarkedValue(opts.accounts ?? [], Array.isArray((op as any)?.rentals) ? (op as any).rentals : null));
  const guaranteedAnnual = rows.reduce((t, r) => t + r.amount, 0);
  const safeDraw = solveSafeDraw(nestEgg, guaranteedAnnual / 12, opts.sim, opts.chanceFloor ?? 80);
  const drawRateFlag: PaycheckYear['drawRateFlag'] =
    nestEgg <= 0 || safeDraw <= 0 ? null : (safeDraw * 12) / nestEgg > 0.045 ? 'high' : 'ok';

  // dated bills come from the F2 grid (one grid — the paycheck never invents its own calendar);
  // big bills = the NAMED dated items; the grid's 'Everyday expenses' reconciler and regular
  // monthly debt payments stay OUT — the paycheck exists to pay those.
  const grid = buildDatedGrid(op, { now, liabilities: opts.liabilities, guaranteedIncome: rows });
  // A MONTH'S DATED BILLS, READ ONE WAY (2026-10-26, the lead's ruling on FIX-BILLS' datedBillsIn): this card kept its own filter
  // (every bill but the everyday reconciler) beside the later-month card's; both now ask the one reader — bills with a date of
  // their own, never the everyday expenses and never a debt.
  const bigBills = (cell: any) => datedBillsIn(cell);

  const startMonth = now.getMonth(), startYear = now.getFullYear();
  const months: PaycheckMonth[] = Array.from({ length: 12 }, (_, s) => {
    const cm = ((startMonth + s) % 12) + 1;
    const yr = startYear + Math.floor((startMonth + s) / 12);
    const label = MONTHS[cm - 1] + (yr > startYear ? ` ’${String(yr).slice(2)}` : '');
    const g = rows.filter((r) => r.month === cm && r.year === yr)
      .map((r) => ({ source: r.source, amount: (r.amount), day: r.day }));
    const gTotal = g.reduce((t, x) => t + x.amount, 0);
    const cell = grid.cells[s];
    const bills = bigBills(cell).map((b) => ({ label: b.label, amount: b.amount, day: b.day }));
    const bTotal = bills.reduce((t, b) => t + b.amount, 0);
    return {
      calendarMonth: cm, year: yr, label,
      guaranteed: g, guaranteedTotal: (gTotal),
      safeDraw, bills, billsTotal: (bTotal),
      netSafeToSpend: (gTotal + safeDraw - bTotal),
    };
  });
  return {
    months, thisMonth: months[0],
    thisYear: (months.reduce((t, m) => t + m.netSafeToSpend, 0)),   // exact sum, never ×12
    safeDrawMonthly: safeDraw, drawRateFlag,
    guaranteedMissing: rows.length === 0,
    nestEgg,
  };
}

/** THE RETURN THE PAYCHECK RUNS ON, AS THE SCREENS PRINT IT (2026-10-26, PF-TOOLS; the figure CF-MMFIX-A, FIX-MONTH and FIX-TAX
 *  asked an identifier for). The retired paycheck card ("The draw assumes 6.00%/year — …", printed under MK-CF-M-078), the future
 *  paycheck card ("assumes a 7.65% return", printed under MK-CF-M-022) and the draw sheet ("Growth used: 6.00%/year — …") each
 *  printed it with no identifier of its own (Roth and Required withdrawals print it too, "Growth used: …"). One return, one figure: paycheckReturn gives the cockpit's own return
 *  (willItLastInputs chooses the same, held by an agreement test), so the three print one number. */
export const PAYCHECK_RETURN_FIGURES = declareFigures({
  'MK-CF-M-082': {
    label: 'the return the paycheck runs on', unit: 'percent-2dp', per: 'year', screens: ['/cashflow', '/home', '/roth', '/required-withdrawals'],
    answers: 'The yearly return the retired paycheck, the future paycheck and the draw sheet grow the savings at — the Retirement cockpit\u2019s own, so the paycheck and the odds are one plan.',
    formula: 'the return set on the Plan when its basis is the scenario; the accounts\u2019 own return over the last twelve months when its basis is that; otherwise the blended benchmark of the accounts set aside for retirement; 6% when nothing is set aside (MK-CF-F-279 paycheckReturn; MK-CF-O-017 futurePaycheck hands it to the card as the return it assumes)',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-028 assumed return'],
    decisions: ['THE COCKPIT\u2019S RETURN, STATED (the lead\u2019s ruling 2 on CFR-4, 2026-10-25, under tenet 4 of DEC-3523): it was a flat 5.5% whenever no return was set; the line says where the rate came from.'],
    refusal: 'Never absent: with nothing set aside and nothing set it is the typical 6%, and the line says so.',
    ruled: '2026-10-26',   // the lead's decision, made without asking him (decide, apply, report); its decision row is PF-RECORDS'
    worked: { given: 'Nothing set aside for retirement and no return set on the Plan, in 2026.', answer: '6.00%/year', run: () => paycheckReturn([], {}, null).mean_return },
  },
} as const);
