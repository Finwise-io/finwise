// Centralized insight service — one rules engine that turns the user's financial state into a ranked
// list of insights, instead of hardcoding them per screen. Each rule is a pure function returning an
// Insight (or null). Screens compute the primitive inputs and render the top results.
export interface Insight { id: string; priority: 1 | 2 | 3; icon: string; title: string; body: string; route?: string; }

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
}

const pctTxt = (d: number) => `${Math.round(d * 100)}%`;
const money0 = (n: number) => `$${Math.round(n).toLocaleString()}`;

type Rule = (i: InsightInput) => Insight | null;
const RULES: Rule[] = [
  (i) => i.toxicDebt ? { id: 'toxic-debt', priority: 1, icon: '🔥', title: 'Tackle high-interest debt first', body: `${i.toxicDebt.label} is at ${pctTxt(i.toxicDebt.apr)} APR — paying it down beats almost any investment return.`, route: '/(tabs)/goals' } : null,
  // B-44: a robotic "0.0 months" alarms a user with plenty in investments; word the no-cash case plainly.
  (i) => (i.cashMonths != null && i.cashMonths < 3) ? { id: 'runway', priority: 1, icon: '🛟', title: 'Build your emergency fund', body: i.cashMonths < 0.1 ? `You have no cash set aside for emergencies — aim for 3–6 months of spending (investments aren't counted here).` : `Your cash covers about ${i.cashMonths.toFixed(1)} months of spending — aim for 3–6.`, route: '/(tabs)/goals' } : null,
  (i) => (i.retireChance != null && i.retireChance < 60) ? { id: 'retire-offtrack', priority: 1, icon: '🏖️', title: 'Your retirement plan needs attention', body: `Only a ${i.retireChance}% chance it lasts — adjust savings, age, or spending in the scenario.`, route: '/retirement' } : null,
  // B-48: a 401(k) needs earned income — don't nudge a retiree / no-wage user to contribute.
  (i) => (i.k401Remaining > 1000 && i.hasEarnedIncome) ? { id: 'k401-room', priority: 2, icon: '💼', title: 'Room left in your 401(k)', body: `You can still contribute ${money0(i.k401Remaining)} this year — tax-advantaged.`, route: '/retirement' } : null,
  (i) => (i.beatBy != null && i.beatBy < -0.02) ? { id: 'behind-bench', priority: 2, icon: '📉', title: 'Trailing your benchmark', body: `Your portfolio is ${Math.abs(Math.round(i.beatBy * 100))} pts behind its benchmark — review your holdings.`, route: '/performance' } : null,
  (i) => i.cashDragPct > 30 ? { id: 'cash-drag', priority: 2, icon: '💵', title: 'A lot is sitting in cash', body: `${Math.round(i.cashDragPct)}% of your investable money is in cash earning little — consider investing some.`, route: '/performance' } : null,
  // B-45: this measures the largest ACCOUNT, not a single ticker — word it honestly.
  (i) => i.topAccountPct > 40 ? { id: 'concentration', priority: 2, icon: '🎯', title: 'Concentrated in one account', body: `${Math.round(i.topAccountPct)}% of your invested money is in a single account — add the holdings inside it and spread across accounts to lower risk.`, route: '/performance' } : null,
  // B-52: this is contributions/gross — name it "investing" so it doesn't collide with the budget's
  // "savings rate" (take-home not spent), which is a different number.
  (i) => (i.investRate != null && i.investRate < 0.1) ? { id: 'invest-rate', priority: 2, icon: '📈', title: 'Nudge up your investing', body: `You're investing about ${pctTxt(i.investRate)} of your gross income toward retirement — even +1% compounds over time.`, route: '/(tabs)/goals' } : null,
  (i) => i.planPct < 100 ? { id: 'plan-incomplete', priority: 3, icon: '✨', title: 'Sharpen your plan', body: `Your plan is ${i.planPct}% complete — finishing it makes every number sharper.`, route: '/sharpen' } : null,
];

/** Ranked insights (highest priority first). `limit` caps the result (default all). */
export function buildInsights(input: InsightInput, limit?: number): Insight[] {
  const out = RULES.map((r) => r(input)).filter((x): x is Insight => x != null).sort((a, b) => a.priority - b.priority);
  return limit != null ? out.slice(0, limit) : out;
}
