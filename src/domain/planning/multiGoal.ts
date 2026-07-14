// F4 — the multi-goal weigher (FCC detailed design v1.1, Plan sheet). Runs several goals AT ONCE —
// something the single-goal math can't do: sum the toggled dials against the canonical capacity
// (can you do it all?), and show what the combination does to retirement (age + will-it-last),
// with tappable trim hints that ARE pre-runs of the slider (never separate math). Pure functions;
// deterministic because simulate() is seeded.
import { simulate, projectNestEgg, type RetirementInputs } from '../retirement';
import { monthsToGoal, type GoalLike } from '../goals';
import { payoffPlan, type Debt } from '../debt';
import { round2 } from '../_shared/num';

export interface GoalDial {
  id: string;
  label: string;
  on: boolean;
  monthlyAmount: number;
  target?: number;   // GoalLike fields, when the dial wraps a real goal
  saved?: number;
}

export interface WeighInputs {
  dials: GoalDial[];                 // the toggled goals (excl. retirement — that's its own dial)
  retirementMonthly: number;         // the keep-saving-for-retirement dial
  extraDebtMonthly?: number;         // the extra-on-debt dial (0/absent = off)
  capacityMonthly: number;           // the canonical available-to-save (Cash flow's number — the pin)
  baseInputs: RetirementInputs | null;  // the shared willItLastInputs (the hub's exact inputs)
  liabilities?: Debt[];
  now?: Date;
}

export interface WeighResult {
  committed: number;                 // Σ on-dials + extra debt + retirement
  spare: number;                     // capacity − committed (negative = short)
  covered: boolean;
  retireAge: number | null;          // earliest retire age WITH this contribution level
  chance: number | null;             // will-it-last chance WITH this contribution level
  goalEnds: Record<string, string | null>;   // dial id → 'YYYY-MM' finish at its pace (real goals only)
  debtPayoff: { month: string; interestSaved: number } | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Earliest age the projection covers the need, WITH contributions until that age (F4's before/after). */
export function retireAgeWithContribution(inp: RetirementInputs, monthlyContribution: number, maxAge = 80): number | null {
  // same walk as solveRetireAge, but contributions keep flowing until each candidate retire age
  for (let age = inp.current_age; age <= maxAge; age++) {
    const p = projectNestEgg({ ...inp, annual_contribution: monthlyContribution * 12, retire_age: age, guaranteed_start_age: inp.guaranteed_start_age });
    if (p.will_have >= p.will_need) return age;
  }
  return null;
}

/** Run the whole combination once. Deterministic (seeded simulate). */
export function weighGoals(w: WeighInputs): WeighResult {
  const now = w.now ?? new Date();
  const onDials = w.dials.filter((d) => d.on);
  const extraDebt = Math.max(0, w.extraDebtMonthly ?? 0);
  const committed = round2(onDials.reduce((t, d) => t + (d.monthlyAmount || 0), 0) + extraDebt + Math.max(0, w.retirementMonthly));
  const spare = round2(w.capacityMonthly - committed);

  // finish dates at the chosen pace — the SAME monthsToGoal the goal shows anywhere else (the pin)
  const goalEnds: Record<string, string | null> = {};
  for (const d of onDials) {
    if (d.target == null) { goalEnds[d.id] = null; continue; }
    const m = monthsToGoal({ target: d.target, saved: d.saved ?? 0 } as GoalLike, d.monthlyAmount);
    if (m == null) { goalEnds[d.id] = null; continue; }
    const end = new Date(now.getFullYear(), now.getMonth() + m, 1);
    goalEnds[d.id] = `${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }

  // extra-on-debt: payoff month + interest saved vs no extra — ONE payoffPlan call path (the pin)
  let debtPayoff: WeighResult['debtPayoff'] = null;
  if (extraDebt > 0 && (w.liabilities ?? []).some((d) => d.remaining_balance > 0)) {
    const withExtra = payoffPlan(w.liabilities!, extraDebt, 'avalanche', now);
    const without = payoffPlan(w.liabilities!, 0, 'avalanche', now);
    const end = new Date(now.getFullYear(), now.getMonth() + withExtra.months, 1);
    debtPayoff = {
      month: `${MONTHS[end.getMonth()]} ${end.getFullYear()}`,
      interestSaved: round2(Math.max(0, without.totalInterest - withExtra.totalInterest)),
    };
  }

  // effect on retirement: the shared inputs with the dial as the contribution — same seeded engine
  let retireAge: number | null = null;
  let chance: number | null = null;
  if (w.baseInputs) {
    retireAge = retireAgeWithContribution(w.baseInputs, w.retirementMonthly);
    chance = simulate({ ...w.baseInputs, annual_contribution: w.retirementMonthly * 12 }).chance_of_success;
  }

  return { committed, spare, covered: spare >= 0, retireAge, chance, goalEnds, debtPayoff };
}

export interface TrimHint {
  dialId: string;
  label: string;
  trimmedAmount: number;
  retireAge: number | null;
  chance: number | null;
}

/** One hint per active goal: the SAME weigher re-run with that dial reduced — a pre-run of the
 *  slider, so applying the hint's amount reproduces its numbers exactly (the pin). */
export function trimHints(w: WeighInputs, reduceTo = 0.6): TrimHint[] {
  return w.dials.filter((d) => d.on && d.monthlyAmount > 0).map((d) => {
    const trimmedAmount = Math.max(0, Math.round((d.monthlyAmount * reduceTo) / 100) * 100);
    const freed = d.monthlyAmount - trimmedAmount;
    // the freed money goes back to retirement saving — that's the trade the hint describes
    const r = weighGoals({
      ...w,
      dials: w.dials.map((x) => x.id === d.id ? { ...x, monthlyAmount: trimmedAmount } : x),
      retirementMonthly: w.retirementMonthly + freed,
    });
    return { dialId: d.id, label: d.label, trimmedAmount, retireAge: r.retireAge, chance: r.chance };
  });
}
