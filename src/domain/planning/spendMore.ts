// "CAN I SPEND MORE?" — the retiree's live control (founder-approved, 2026-08-14).
//
// The founder read the first version and said: "too complex for a user to understand, particularly
// someone with no finance background." He was right. It made her work out four things nobody told
// her — what "draw" means and how it differs from spend, why $2,555 was offered while $0 showed,
// what $5,600 was, and what "odds of 80%" referred to when the dial above said 100%.
//
// So the row LEADS WITH THE ANSWER, and the answer is free money: the largest extra she can spend
// with nothing changing at all. On June's numbers that is about $1,000 a month, and the old static
// "held at odds of 80%" label was sitting directly on top of it.
//
// CONSEQUENCE IS A COUNT, COMPUTED LIVE. The returned design bucketed everything under the maximum
// as "about 9 out of 10", but its stepper lands on $2,500 where the real answer is 81% — nine
// points, in the flattering direction, on the screen about spending more. Every position here is a
// real run.
import { simulate, type RetirementInputs } from '../retirement';

export interface SpendMoreState {
  /** the most she could add before the plan stops holding at the floor she set */
  maxExtra: number;
  /** the largest extra that changes NOTHING — the headline, and the reason the row exists */
  freeExtra: number;
  /** odds at today's spending, so the row can say "exactly as it does today" truthfully */
  oddsToday: number;
}

const oddsAt = (base: RetirementInputs, monthlySpend: number) =>
  simulate({ ...base, retire_monthly_spend_today: monthlySpend }).chance_of_success;

/**
 * How much more she could spend, and how much of it is genuinely free.
 *
 * `step` is the stepper's own increment: the free figure must land ON a position she can actually
 * select, or the headline promises something the control cannot deliver.
 */
export function spendMoreState(base: RetirementInputs, maxExtra: number, step = 500): SpendMoreState {
  const today = base.retire_monthly_spend_today;
  const oddsToday = oddsAt(base, today);
  let free = 0;
  for (let extra = step; extra <= maxExtra; extra += step) {
    if (oddsAt(base, today + extra) < oddsToday) break;
    free = extra;
  }
  return { maxExtra, freeExtra: free, oddsToday };
}

/**
 * What the screen says at a given stepper position — a real run every time, never a bucket.
 *
 * Counts, not percentages: "4 future simulations out of 5" lands with people who bounce off "80%",
 * and where the news is bad the sentence NAMES the losing case rather than leaving her to imagine
 * it. Words banned from this row: draw · odds · held at · floor (§7.1 and the founder's rewrite).
 */
export function spendMoreSentence(base: RetirementInputs, extra: number, horizonAge: number, oddsToday: number): {
  chance: number; text: string; tone: 'clear' | 'watch' | 'edge';
} {
  const chance = oddsAt(base, base.retire_monthly_spend_today + extra);
  if (chance >= oddsToday) {
    return {
      chance, tone: 'clear',
      text: extra === 0
        ? `Your money lasts past ${horizonAge}, in every future simulation we tested.`
        : `Still lasts past ${horizonAge} — nothing changes.`,
    };
  }
  // "about N in 10" reads plainly; below 95 we also name what happens in the futures that fail,
  // because a bare count invites a person to imagine something worse than the truth.
  const inTen = Math.round(chance / 10);
  const failing = 10 - inTen;
  if (chance >= 95) {
    return { chance, tone: 'watch', text: `Lasts in almost every future simulation — about ${chance} out of 100.` };
  }
  return {
    chance,
    tone: chance >= 85 ? 'watch' : 'edge',
    text: `Lasts in about ${inTen} future simulations out of 10. In the other ${failing}, it runs out before ${horizonAge}.`,
  };
}
