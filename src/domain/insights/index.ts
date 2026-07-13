// Centralized insight service — one rules engine that turns the user's financial state into a ranked
// list of insights, instead of hardcoding them per screen. Each rule is a pure function returning an
// Insight (or null). Screens compute the primitive inputs and render the top results.
export type InsightTheme = 'protect' | 'grow' | 'optimize';   // the three themes the list is grouped under
export interface Insight {
  id: string; priority: 1 | 2 | 3; theme: InsightTheme; icon: string; title: string; body: string;
  route?: string;
  details?: { label: string; value: string }[];   // provenance (which accounts / the math) — attached by the screen
}

export interface InsightInput {
  cashMonths: number | null;                       // emergency-fund runway (months of spending)
  toxicDebt: { label: string; apr: number } | null; // highest-APR debt above the toxic threshold
  k401Remaining: number;                            // 401(k) headroom this year
  hasEarnedIncome: boolean;                         // has W-2 wages this year (401(k) needs earned income)
  retireChance: number | null;                      // Monte-Carlo % the plan lasts
  cashDragPct: number;                              // % of investable assets sitting in cash
  topAccountPct: number;                            // largest single investment ACCOUNT as % of investable
  planPct: number;                                  // "sharpen your plan" completeness
  beatBy: number | null;                            // portfolio vs benchmark (decimal pts)
  investRate: number | null;                        // retirement/investment contributions ÷ GROSS income
                                                    // (distinct from budget's "savings rate" = take-home not spent)
  // ── FCC additions (all optional so existing callers stay valid) ──
  worthALook?: {                                    // F10: the newest open "worth a look" flag
    amount: number; account: string; more: number;  // more = other open flags beyond this card
    followUp: boolean;                              // true = user flagged it; keep a quiet "settled?" item
  } | null;
  rmdDue?: { amount: number } | null;               // required withdrawal this year (age 73+, pre-tax > 0)
  ssWindow?: boolean;                               // Social Security claim window open, no decision adopted
  goalsGap?: number | null;                         // $/mo goals need beyond the planned surplus (quantified)
}

const pctTxt = (d: number) => `${Math.round(d * 100)}%`;
const money0 = (n: number) => `$${Math.round(n).toLocaleString()}`;

type RawInsight = Omit<Insight, 'theme'>;   // rules return everything but the theme; buildInsights attaches it
type Rule = (i: InsightInput) => RawInsight | null;
const THEME_BY_ID: Record<string, InsightTheme> = {
  'worth-a-look': 'protect', 'rmd-due': 'protect', 'goals-gap': 'protect',
  'toxic-debt': 'protect', 'runway': 'protect', 'retire-offtrack': 'protect', 'concentration': 'protect',
  'behind-bench': 'grow', 'cash-drag': 'grow', 'invest-rate': 'grow',
  'k401-room': 'optimize', 'plan-incomplete': 'optimize', 'ss-window': 'optimize',
};
const RULES: Rule[] = [
  // F10 (FCC): an open "worth a look" card ALWAYS takes slot 1 — first priority-1 rule, stable sort
  // keeps it on top. Calm wording: never the words scam/fraud/alert, never red.
  (i) => i.worthALook ? {
    id: 'worth-a-look', priority: 1, icon: '🔍',
    title: i.worthALook.followUp ? `You flagged ${money0(i.worthALook.amount)} — settled?` : 'Worth a look',
    body: i.worthALook.followUp
      ? `The ${money0(i.worthALook.amount)} from ${i.worthALook.account} you flagged is still open — mark it settled when your bank sorts it out.`
      : `${money0(i.worthALook.amount)} went out of ${i.worthALook.account}${i.worthALook.more > 0 ? ` — and ${i.worthALook.more} more` : ''}. Most large payments are fine — you know best.`,
    route: '/worth-a-look',
  } : null,
  // FCC retiree rule: the government-required yearly withdrawal from pre-tax accounts (age 73+).
  (i) => i.rmdDue ? { id: 'rmd-due', priority: 1, icon: '📌', title: 'Required withdrawal due', body: `${money0(i.rmdDue.amount)} must come out of your pre-tax retirement accounts by Dec 31 — the IRS requires it from age 73.`, route: '/(tabs)/plan' } : null,
  (i) => i.toxicDebt ? { id: 'toxic-debt', priority: 1, icon: '🔥', title: 'Tackle high-interest debt first', body: `${i.toxicDebt.label} is at ${pctTxt(i.toxicDebt.apr)} APR — paying it down beats almost any investment return.`, route: '/(tabs)/goals' } : null,
  // B-44: a robotic "0.0 months" alarms a user with plenty in investments; word the no-cash case plainly.
  (i) => (i.cashMonths != null && i.cashMonths < 3) ? { id: 'runway', priority: 1, icon: '🛟', title: 'Build your emergency fund', body: i.cashMonths < 0.1 ? `You have no cash set aside for emergencies — aim for 3–6 months of spending (investments aren't counted here).` : `Your cash covers about ${i.cashMonths.toFixed(1)} months of spending — aim for 3–6.`, route: '/(tabs)/goals' } : null,
  (i) => (i.retireChance != null && i.retireChance < 60) ? { id: 'retire-offtrack', priority: 1, icon: '🏖️', title: 'Your retirement plan needs attention', body: `Only a ${i.retireChance}% chance it lasts — adjust savings, age, or spending in the scenario.`, route: '/retirement' } : null,
  // B-48: a 401(k) needs earned income — don't nudge a retiree / no-wage user to contribute.
  (i) => (i.k401Remaining > 1000 && i.hasEarnedIncome) ? { id: 'k401-room', priority: 2, icon: '💼', title: 'Room left in your 401(k)', body: `You can still contribute ${money0(i.k401Remaining)} this year — tax-advantaged.`, route: '/contribution-room' } : null,
  (i) => (i.beatBy != null && i.beatBy < -0.02) ? { id: 'behind-bench', priority: 2, icon: '📉', title: 'Trailing your benchmark', body: `Your portfolio is ${Math.abs(Math.round(i.beatBy * 100))} pts behind its benchmark — review your holdings.`, route: '/performance' } : null,
  // FCC: routes to the designed idle-cash landing (the fact + where it sits + comparison math) — no more dead-end.
  (i) => i.cashDragPct > 30 ? { id: 'cash-drag', priority: 2, icon: '💵', title: 'A lot is sitting in cash', body: `${Math.round(i.cashDragPct)}% of your investable money is in cash earning little — see what it could earn.`, route: '/idle-cash' } : null,
  // B-45: this measures the largest ACCOUNT, not a single ticker — word it honestly.
  (i) => i.topAccountPct > 40 ? { id: 'concentration', priority: 2, icon: '🎯', title: 'Concentrated in one account', body: `${Math.round(i.topAccountPct)}% of your invested money is in a single account — add the holdings inside it and spread across accounts to lower risk.`, route: '/performance' } : null,
  // B-52: this is contributions/gross — name it "investing" so it doesn't collide with the budget's
  // "savings rate" (take-home not spent), which is a different number.
  (i) => (i.investRate != null && i.investRate < 0.1) ? { id: 'invest-rate', priority: 2, icon: '📈', title: 'Nudge up your investing', body: `You're investing about ${pctTxt(i.investRate)} of your gross income toward retirement — even +1% compounds over time.`, route: '/(tabs)/goals' } : null,
  // FCC: goals need more per month than the plan frees up — a quantified fact, no instruction.
  (i) => (i.goalsGap != null && i.goalsGap > 0) ? { id: 'goals-gap', priority: 2, icon: '🎯', title: 'Your goals outpace your surplus', body: `Hitting every goal on time needs about ${money0(i.goalsGap)}/mo more than your plan frees up — see the trade-offs in Plan.`, route: '/(tabs)/goals' } : null,
  // FCC: the Social Security claim window is open and no timing has been adopted — logistics, no opinion.
  (i) => i.ssWindow ? { id: 'ss-window', priority: 2, icon: '🗓️', title: 'Your Social Security window is open', body: `You can claim any time from 62 to 70 — no deadline, but timing changes the check. See it laid out in your dollars.`, route: '/ss-timing' } : null,
  (i) => i.planPct < 100 ? { id: 'plan-incomplete', priority: 3, icon: '✨', title: 'Sharpen your plan', body: `Your plan is ${i.planPct}% complete — finishing it makes every number sharper.`, route: '/sharpen' } : null,
];

/** Ranked insights (highest priority first). `limit` caps the result (default all). */
export function buildInsights(input: InsightInput, limit?: number): Insight[] {
  const out = RULES.map((r) => r(input)).filter((x): x is RawInsight => x != null)
    .sort((a, b) => a.priority - b.priority)
    .map((i) => ({ ...i, theme: THEME_BY_ID[i.id] ?? 'optimize' as InsightTheme }));
  return limit != null ? out.slice(0, limit) : out;
}
