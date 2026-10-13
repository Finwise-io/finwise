// Plan-hub selectors (founder-approved mock v9, 2026-08-01). Three small pure functions:
//   oddsLine       — THE one sentence for the odds, everywhere they are said
//   planDoor       — the DYNAMIC first-day door: counts ONLY the missing answers, credits live accounts
//   nextDecision   — the ONE amber card: the single most urgent dated decision, absent when none is
import type { AssetAccount } from '../assets';
import { retirementEarmarkedValue } from '../assets';
import { rmdStartAgeFor, rmdAtAge, rmdRequiredThisYear, rmdTakenThisYear } from '../decumulation';

/** THE ONE way the odds are said, anywhere they are said (founder rule 2026-08-11: "we should have
 *  the same language on Home, NW and Plan"). Three screens had three phrasings for one number —
 *  "78% odds of lasting to age 90", "84 in 100 paths last to 90", and a bare "Uncertain". One helper
 *  now, so a fourth phrasing cannot appear.
 *
 *  THE WORD IS GONE (founder ruling 2026-08-12): "uncertain and giving it 60% probability does not
 *  make sense — it should be either or." A percentage IS the uncertainty; labelling it as well says
 *  the same thing twice, and at 60% it hedges a hedge. The number speaks for itself. This also
 *  retires the two rival word-sets (Likely/Uncertain/Unlikely and Holding/Watch closely/Running
 *  short) that gave one person two different verdicts on two screens. The LENS still decides the
 *  question asked around it — "will my money last" vs "is my money lasting" — never the verdict. */
/** The window in which "when should I claim?" is a live question (founder 2026-08-14).
 *  60 — earlier than that it is not yet a decision, it is trivia.
 *  70 — the delayed credit stops accruing, so waiting longer buys nothing and there is no decision
 *       left to make. Claiming itself opens at 62; between 60 and 62 the row previews a dated window.
 *  The row only ever appears to someone who has NOT claimed, so anyone inside this window genuinely
 *  still has the choice — including at 68, where waiting is worth the most it will ever be worth. */
export const SS_DECISION_FROM = 60;
export const SS_DECISION_TO = 70;

/* ─ MK-PL-F-024 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * oddsLine
 *
 * Answers ..... How do we state the odds in words?
 *
 * Formula .....
 *     `${chance}% ${odds tail(horizon age)}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-024
 * Changed ..... 2026-08-12 (bb56c4d)
 */
export function oddsLine(_lens: 'retired' | string, chance: number, horizonAge: number): string {
  return `${chance}% ${oddsTail(horizonAge)}`;
}
/** THE WORDS WITHOUT THE NUMBER — for the gauge, which prints the number large and the words beneath
 *  it. The gauge used to hand-type that half of the sentence, so his one wording (DEC-0104, DEC-0109)
 *  lived in two places and a change to `oddsLine` could not reach the screen he actually looks at. */
/* ─ MK-PL-F-085 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * oddsTail
 *
 * Answers ..... THE WORDS WITHOUT THE NUMBER — for the gauge, which prints the number large and the words beneath it.
 *
 * Formula .....
 *     `odds of lasting to age ${horizon age}`
 *
 * Called by ... MK-PL-F-024 oddsLine
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-024 oddsLine
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-085
 * Changed ..... not in git yet (—)
 */
export function oddsTail(horizonAge: number): string {
  return `odds of lasting to age ${horizonAge}`;
}
/** The same sentence for the app-wide SAMPLE, always labelled as one. */
/* ─ MK-PL-F-025 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * sampleOddsLine
 *
 * Answers ..... The same sentence for the app-wide SAMPLE, always labelled as one.
 *
 * Formula .....
 *     `sample: ${SAMPLE_CHANCE}% odds of lasting to age ${horizon age}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-025
 * Changed ..... 2026-08-11 (76511f4)
 */
export function sampleOddsLine(horizonAge: number = SAMPLE_HORIZON): string {
  return `Sample: ${SAMPLE_CHANCE}% odds of lasting to age ${horizonAge}`;
}

// ── the dynamic door ──────────────────────────────────────────────────────────
export interface PlanDoor {
  missing: ('your age' | 'what you spend' | 'what you have' | 'what counts toward retirement')[];
  count: number;                      // how many answers are still needed
  credit: { accounts: number; total: number } | null;   // live accounts already counted (never retyped)
}
/* ─ MK-PL-F-026 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * planDoor
 *
 * Answers ..... Is there enough to show this person their own odds?
 *
 * Formula .....
 *     a = op (or none when missing)
 *     missing = []
 *     has age = number(birth year) > 1900 (or number(age) > 0 when missing or zero)
 *     has spend = number(monthly expenses) > 0 (or number(spend monthly) > 0 when missing or zero)
 *     total = Σ over accounts (or none when missing) of (balance (or 0 when missing or zero))
 *     earmarked = retirement earmarked value(accounts ?? [], array.is array(rentals) ? rentals : nothing)
 *     has have = earmarked > 0
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-PL-M-001 · MK-PL-M-002
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-017 birth year
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-026
 * Changed ..... 2026-08-11 (53309f3)
 */
export function planDoor(op: Record<string, any> | null, accounts: AssetAccount[]): PlanDoor {
  const a = op ?? {};
  const missing: PlanDoor['missing'] = [];
  const hasAge = Number(a.birthYear) > 1900 || Number(a.age) > 0;
  const hasSpend = Number(a.monthlySpending) > 0 || Number(a.spendMonthly) > 0;
  const total = ((accounts ?? []).reduce((t, x) => t + (x.balance || 0), 0));
  // FOUNDER FINDING 2026-08-11: this counted ANY account with a balance, but the odds run on what is
  // EARMARKED for retirement. Someone whose only asset is the home they live in looked complete to
  // this door and produced no odds at all — landing on a bare "See your plan ›", the very fallback
  // we removed everywhere else. The gate now means what the odds mean.
  // the rent entries decide the home, as Net worth reads it (DEC-4913, 2026-10-13)
  const earmarked = retirementEarmarkedValue(accounts ?? [], Array.isArray(a.rentals) ? a.rentals : null);
  const hasHave = earmarked > 0;
  if (!hasAge) missing.push('your age');
  if (!hasSpend) missing.push('what you spend');
  // owning things but none of them counting is a DIFFERENT problem from owning nothing — say which
  if (!hasHave) missing.push((accounts ?? []).length > 0 && total > 0 ? 'what counts toward retirement' : 'what you have');
  return {
    missing,
    count: missing.length,
    credit: hasHave ? { accounts: accounts.length, total: earmarked } : null,
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

/* ─ MK-PL-F-027 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * nextDecision
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     now = args.now (or new date() when missing)
 *     due = rmd required this year(args.pre tax balance, args.prior year end pre tax, args.age).amount
 *     taken = rmd taken this year(args.transactions ?? [], args.pre tax account ids, now.get full year())
 *     opens = the date args.birth year + 62, now.get month(), 1
 *     the answer = nothing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-021 Social Security claim age
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-061 pre-tax balance on 31 December last year
 *
 * Decides .....
 *     · Uses a built-in s a m p l e c h a n c e of 84.
 *     · Uses a built-in s a m p l e h o r i z o n of 90.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-027
 * Changed ..... 2026-08-12 (4abeef7)
 */
export function nextDecision(args: {
  lens: string;
  age: number | null;
  birthYear?: number | null;
  ssClaimAge?: number | null;         // set = the decision is made (settled)
  alreadyClaiming?: boolean;          // a check is already arriving — the question no longer exists
  preTaxBalance: number;
  priorYearEndPreTax?: number | null;   // MK-XS-I-061 — last 31 December's pre-tax balance, when entered (G8)
  preTaxAccountIds: string[];
  transactions: any[];
  moneyWord: (n: number) => string;   // masked formatter from the caller (mask rule holds)
  now?: Date;
}): NextDecision | null {
  const now = args.now ?? new Date();
  // 1) a required withdrawal due THIS year and not yet taken outranks everything — it has a deadline
  if (args.age != null && args.age >= rmdStartAgeFor(args.age) && args.preTaxBalance > 0) {
    const due = rmdRequiredThisYear(args.preTaxBalance, args.priorYearEndPreTax, args.age).amount;   // G8: last Dec 31's balance when entered
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
  // 2) the Social Security claim window — only while the decision is UNMADE. Someone already
  //    drawing has answered it; founder 2026-08-12: for them the question is removed, not answered
  //    with a dead end.
  // FOUNDER RULING 2026-08-14: this is a decision from 60 to 70, and nowhere else. Not in your
  // fifties — "that decision makes sense when someone is 60+" — and not past 70, because the delayed
  // credit stops there, so after 70 there is nothing left to decide. Before this, the only bound was
  // age < 71, so a 58-year-old was told their claim window was the next decision in front of them.
  if (!args.alreadyClaiming && args.ssClaimAge == null && args.age != null
      && args.age >= SS_DECISION_FROM && args.age <= SS_DECISION_TO) {
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
/* ─ MK-PL-F-028 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * sampleAskLine
 *
 * Answers ..... The invitation under a sample: name the answers still missing, so a dead end becomes one tap.
 *
 * Formula .....
 *     n = count of missing
 *     ''   when n = 0
 *     verb = (m: string) => (starts with('what counts') ? 'choose' : 'add')
 *     `a sample, not your number — ${verb(missing[0])} ${missing[0]} and it becomes yours`   when n = 1
 *     list = `${missing[0]} and ${missing[1]}`   if n = 2
 *     `${missing.slice(0, -1).join(', ')} and ${missing[n − 1]}`   otherwise
 *     the answer = `a sample, not your number — ${n} answers make it yours: ${list}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-028
 * Changed ..... 2026-08-11 (53309f3)
 */
export function sampleAskLine(missing: string[]): string {
  const n = missing.length;
  if (n === 0) return '';
  const verb = (m: string) => (m.startsWith('what counts') ? 'choose' : 'add');
  if (n === 1) return `a sample, not your number — ${verb(missing[0])} ${missing[0]} and it becomes yours`;
  const list = n === 2 ? `${missing[0]} and ${missing[1]}` : `${missing.slice(0, -1).join(', ')} and ${missing[n - 1]}`;
  return `a sample, not your number — ${n} answers make it yours: ${list}`;
}

/** The age the middle path first hits zero, from a simulation band — null while it never does. */
/* ─ MK-PL-F-029 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * shortfallAgeFromBand
 *
 * Answers ..... The age the middle path first hits zero, from a simulation band — null while it never does.
 *
 * Formula .....
 *     (band ?? []).find((pt) => pt.p50 ≤ 0).age (or nothing when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-029
 * Changed ..... 2026-08-11 (debe967)
 */
export function shortfallAgeFromBand(band?: { age: number; p50: number }[] | null): number | null {
  return (band ?? []).find((pt) => pt.p50 <= 0)?.age ?? null;
}
/* ─ MK-PL-F-030 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * onCourseSentence
 *
 * Answers ..... In one sentence, how is this plan doing?
 *
 * Formula .....
 *     nothing   when chance = nothing
 *     near = (n: number) => money(math.max(1000, math.round(n ÷ 1000) × 1000))
 *     lasts = (args.leftover at horizon ?? 0) > 0
 *     short at = args.shortfall age
 *     nothing   when not (args.pot at retire! > 0)
 *     the answer = `retire at ${args.retire age} with ~${near(args.pot at retire!)}, ${ending}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *
 * Decides .....
 *     · If leftover at horizon is missing it uses 0.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-030
 * Changed ..... 2026-08-11 (debe967)
 */
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
