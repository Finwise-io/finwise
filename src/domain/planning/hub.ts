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

// ── the on-course sentence (founder-approved words, 2026-08-04) ──────────────
// "on course for ~$890,000 by 92" read as "working till 92" — the founder had to ask.
// The approved shape leads with what each lens acts on: workers get the pot at retirement
// day FIRST, then survival; retirees have no retirement-day pot, so lasting IS the headline.

/** THE ONE app-wide sample verdict — shown, always labelled as a sample, while the real one cannot
 *  be computed. One constant so Home and Net worth can never drift to two different samples. */
export const SAMPLE_CHANCE = 84;
export const SAMPLE_HORIZON = 90;

/** The invitation under a sample: name the answers still missing, so a dead end becomes one tap.
 *  Founder rule 2026-08-11 — sample + ask, whether ONE answer is missing or all three. */
export function sampleAskLine(missing: string[]): string {
  const n = missing.length;
  if (n === 0) return '';
  if (n === 1) return `a sample, not your number — add ${missing[0]} and it becomes yours`;
  const list = n === 2 ? `${missing[0]} and ${missing[1]}` : `${missing.slice(0, -1).join(', ')} and ${missing[n - 1]}`;
  return `a sample, not your number — ${n} answers make it yours: ${list}`;
}

/** The age the middle path first hits zero, from a simulation band — null while it never does. */
export function shortfallAgeFromBand(band?: { age: number; p50: number }[] | null): number | null {
  return (band ?? []).find((pt) => pt.p50 <= 0)?.age ?? null;
}
export function onCourseSentence(args: {
  lens: 'retired' | string; chance: number | null;
  retireAge: number; horizonAge: number;
  potAtRetire: number | null; leftoverAtHorizon: number | null;
  money: (n: number) => string;
  /** The age the middle path runs out, when it does — so a plan that falls short says WHEN,
   *  not just that it does (founder finding 2026-08-11). */
  shortfallAge?: number | null;
}): string | null {
  const { lens, chance, money } = args;
  // FOUNDER FINDING 2026-08-11: this used to return null below 80% odds, so the card fell back to a
  // bare "See your plan ›" — the app went QUIET exactly when the news was worth hearing. The verdict
  // words prove it was never meant to: Likely / Uncertain / Unlikely (Holding / Watch closely /
  // Running short). It now speaks for every computable plan and tells the truth about the ending —
  // "to spare" only when there IS something spare, otherwise when the money runs short.
  // It stays null only when there is genuinely nothing to say yet: no odds, or no projected pot.
  if (chance == null) return null;
  const near = (n: number) => money(Math.max(1000, Math.round(n / 1000) * 1000));
  const lasts = (args.leftoverAtHorizon ?? 0) > 0;
  const shortAt = args.shortfallAge;
  const ending = lasts
    ? `lasting past ${args.horizonAge} with ~${near(args.leftoverAtHorizon!)} to spare`
    : shortAt != null
      ? `running short around age ${shortAt}`
      : `running short before ${args.horizonAge}`;
  if (lens === 'retired') {
    return lasts
      ? `on course to last past ${args.horizonAge}, ~${near(args.leftoverAtHorizon!)} to spare`
      : shortAt != null ? `running short around age ${shortAt}` : `running short before ${args.horizonAge}`;
  }
  if (!(args.potAtRetire! > 0)) return null;
  return `retire at ${args.retireAge} with ~${near(args.potAtRetire!)}, ${ending}`;
}
