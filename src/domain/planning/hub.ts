// Plan-hub selectors (founder-approved mock v9, 2026-08-01). Three small pure engines:
//   lensChanceWord — the verdict word in each lens's voice (word pairs the number; color never alone)
//   planDoor       — the DYNAMIC first-day door: counts ONLY the missing answers, credits live accounts
//   nextDecision   — the ONE amber card: the single most urgent dated decision, absent when none is
import type { AssetAccount } from '../assets';
import { RMD_START_AGE, rmdAtAge, rmdTakenThisYear } from '../decumulation';
import { round2 } from '../_shared/num';

/** Working asks "will it last?" → Likely/Uncertain/Unlikely. Retired asks "is it lasting?" →
 *  the same thresholds in the present tense. One mapping, so screens can't invent words. */
export function lensChanceWord(lens: 'retired' | string, chance: number): string {
  if (lens === 'retired') return chance >= 80 ? 'Holding' : chance >= 60 ? 'Watch closely' : 'Running short';
  return chance >= 80 ? 'Likely' : chance >= 60 ? 'Uncertain' : 'Unlikely';
}

// ── the dynamic door ──────────────────────────────────────────────────────────
export interface PlanDoor {
  missing: ('your age' | 'what you spend' | 'what you have')[];
  count: number;                      // how many answers are still needed
  credit: { accounts: number; total: number } | null;   // live accounts already counted (never retyped)
}
export function planDoor(op: Record<string, any> | null, accounts: AssetAccount[]): PlanDoor {
  const a = op ?? {};
  const missing: PlanDoor['missing'] = [];
  const hasAge = Number(a.birthYear) > 1900 || Number(a.age) > 0;
  const hasSpend = Number(a.monthlySpending) > 0 || Number(a.spendMonthly) > 0;
  const total = round2((accounts ?? []).reduce((t, x) => t + (x.balance || 0), 0));
  const hasHave = (accounts ?? []).length > 0 && total > 0;
  if (!hasAge) missing.push('your age');
  if (!hasSpend) missing.push('what you spend');
  if (!hasHave) missing.push('what you have');
  return {
    missing,
    count: missing.length,
    credit: hasHave ? { accounts: accounts.length, total } : null,
  };
}

// ── the one next-decision card ────────────────────────────────────────────────
export interface NextDecision {
  kind: 'rmd' | 'ss-window';
  kicker: string;                     // "NEXT DECISION · DUE DEC 31"
  title: string;
  sub: string;
  cta: string;
  route: string;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function nextDecision(args: {
  lens: string;
  age: number | null;
  birthYear?: number | null;
  ssClaimAge?: number | null;         // set = the decision is made (settled)
  preTaxBalance: number;
  preTaxAccountIds: string[];
  transactions: any[];
  moneyWord: (n: number) => string;   // masked formatter from the caller (mask rule holds)
  now?: Date;
}): NextDecision | null {
  const now = args.now ?? new Date();
  // 1) a required withdrawal due THIS year and not yet taken outranks everything — it has a deadline
  if (args.age != null && args.age >= RMD_START_AGE && args.preTaxBalance > 0) {
    const due = rmdAtAge(args.preTaxBalance, args.age);
    const taken = rmdTakenThisYear(args.transactions ?? [], args.preTaxAccountIds, now.getFullYear());
    if (due > 0 && taken < due) {
      return {
        kind: 'rmd',
        kicker: 'NEXT DECISION · DUE DEC 31',
        title: `Required withdrawal: ${args.moneyWord(Math.round(due - taken))} — not yet taken`,
        sub: 'The government requires it from your pre-tax accounts this year. Take it, then mark it taken.',
        cta: 'See the amount & mark it taken ›',
        route: '/required-withdrawals',
      };
    }
  }
  // 2) the Social Security claim window (only while the decision is unmade)
  if (args.ssClaimAge == null && args.age != null && args.age < 71) {
    if (args.age >= 62) {
      return {
        kind: 'ss-window',
        kicker: 'NEXT DECISION · OPEN NOW',
        title: 'Your Social Security claim window is open',
        sub: 'No deadline — each year you wait raises the check ~6–8%. See it in your own dollars.',
        cta: 'Lay out claiming now vs later ›',
        route: '/ss-timing',
      };
    }
    if (args.birthYear) {
      const opens = new Date(args.birthYear + 62, now.getMonth(), 1);   // month precision is honest enough here
      return {
        kind: 'ss-window',
        kicker: 'NEXT DECISION · A REAL DATE',
        title: `Your Social Security claim window opens ${MONTHS[opens.getMonth()]} ${opens.getFullYear()} (age 62)`,
        sub: 'No deadline — each year you wait raises the check ~6–8%. See it in your own dollars.',
        cta: 'Lay out 62 vs 67 vs 70 ›',
        route: '/ss-timing',
      };
    }
  }
  return null;
}
