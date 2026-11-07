import { plural } from '../_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import { pointsDigits, percentDigits, percentValue } from '../../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, 2026-11-01)
// Centralized insight service — one rules function that turns the user's financial state into a ranked
// list of insights, instead of hardcoding them per screen. Each rule is a pure function returning an
// Insight (or null). Screens compute the primitive inputs and render the top results.
export type InsightTheme = 'protect' | 'grow' | 'optimize';   // the three themes the list is grouped under
export interface Insight {
  id: string; priority: 1 | 2 | 3; theme: InsightTheme; icon: string; title: string; body: string;
  route?: string;
  details?: { label: string; value: string }[];   // provenance (which accounts / the math) — attached by the screen
  /** DEC-3836 (2026-10-10): the emergency fund's months ("2.5 months", MK-NW-M-013) when a property's rent is
   *  not known — the card then says "<months>, rent not included. Enter rent to include." Attached by the screen. */
  rentNotKnownMonths?: string;
}

export interface InsightInput {
  cashMonths: number | null;                       // emergency-fund runway (months of expenses)
  toxicDebt: { label: string; apr: number } | null; // highest-APR debt above the toxic threshold
  k401Remaining: number;                            // 401(k) headroom this year
  hasEarnedIncome: boolean;                         // has W-2 wages this year (401(k) needs earned income)
  retireChance: number | null;                      // Monte-Carlo % the plan lasts
  topAccountPct: number;                            // largest single investment ACCOUNT as % of investable
  topAccountAmount?: number;                        // that account's DOLLARS (dollar-first wording, walk row 9)
  topHolding?: { ticker: string; pct: number; value?: number } | null; // largest single HOLDING at 25%+ (topHoldingConcentration — same rule Invest main shows)
  planNext?: string | null;                         // the FIRST missing plan-completeness item (specific beats percent — founder 2026-07-15)
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
  // Social Security: null = not this person's decision yet. Otherwise WHICH end of the founder's
  // 60-to-70 decision window they are in — because at 60 and 61 the window is not open, it is
  // coming, and the card must not say otherwise. See the ss-window rule below.
  ssWindow?: 'approaching' | 'open' | null;
  goalsGap?: number | null;                         // $/month goals need beyond the planned surplus (quantified)
  goalOffTrack?: { label: string; monthsBehind: number } | null;   // r12: worst dated goal running late at its REAL funding rate
}

/* ─ MK-HM-F-005 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * pctTxt
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = round(d × 100) followed by '%'
 *
 * Called by ... MK-HM-F-007 percent2
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-HM-F-007 percent2
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-HM-F-005
 * Changed ..... not in git yet (—)
 */
const pctTxt = (d: number) => `${percentDigits(d, 0)}%`;
/* ─ MK-HM-F-006 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * money0
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = '$' + round(n) with thousands separators
 *
 * Called by ... MK-CF-O-001 basePay · MK-HM-F-007 percent2
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-HM-F-006
 * Changed ..... not in git yet (—)
 */
const money0 = (n: number) => `$${Math.round(n).toLocaleString()}`;
// A SHARE OF A WHOLE, PRINTED ONCE TO TWO DECIMALS (2026-10-27, FX-PF; his precision order Q49, MK-PF-F-015): the concentration
// notices printed a whole percent, "(55%)", where 60,000 ÷ 110,000 is 54.55%. The share arrives at full precision.
/* ─ MK-HM-F-007 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * percent2
 *
 * Answers ..... A SHARE OF A WHOLE, PRINTED ONCE TO TWO DECIMALS (2026-10-27, FX-PF; his precision order Q49, MK-PF-F-015): the concentration notices printed a whole percent, "(55%)", where 60,000 ÷ 110,000 is 54.55%.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · Shows 1 decimal place.
 *
 * Formula also on the master file · functions_from_code · MK-HM-F-007
 * Changed ..... not in git yet (—)
 */
const percent2 = (pct: number) => `${pointsDigits(pct, 2)}%`;   // the one percent writer (R24)

type RawInsight = Omit<Insight, 'theme'>;   // rules return everything but the theme; buildInsights attaches it
type Rule = (i: InsightInput) => RawInsight | null;
const THEME_BY_ID: Record<string, InsightTheme> = {
  'rmd-due': 'protect', 'goals-gap': 'protect', 'goal-offtrack': 'protect',
  'toxic-debt': 'protect', 'runway': 'protect', 'retire-offtrack': 'protect', 'concentration': 'protect', 'holding-concentration': 'protect',
  'behind-bench': 'grow', 'cash-drag': 'grow', 'invest-rate': 'grow',
  'k401-room': 'optimize', 'plan-incomplete': 'optimize', 'ss-window': 'optimize',
};
const RULES: Rule[] = [
  // RETIRED 2026-10-02 (his finding): the "worth a look" card opened a screen no approved design draws; the
  // flag stays recorded (DEC-0317) and nothing shows it until the Insights screen has a design of record.
  // FCC retiree rule: the government-required yearly withdrawal from pre-tax accounts (age 73+).
  (i) => i.rmdDue ? { id: 'rmd-due', priority: 1, icon: '📌', title: 'Required withdrawal due', body: `${money0(i.rmdDue.amount)} must come out of your pre-tax retirement accounts by Dec 31 — the IRS requires it from age 73.`, route: '/required-withdrawals' } : null,
  // a debt's payoff plan lives on Cash flow, under Debts, since Goals was built to goals v03 (2026-10-31, FX-PLAN): it opened Goals
  (i) => i.toxicDebt ? { id: 'toxic-debt', priority: 1, icon: '🔥', title: 'Tackle high-interest debt first', body: `${i.toxicDebt.label} is at ${pctTxt(i.toxicDebt.apr)} APR — paying it down beats almost any investment return.`, route: '/(tabs)/cashflow' } : null,
  // B-44: a robotic "0.0 months" alarms a user with plenty in investments; word the no-cash case plainly.
  (i) => (i.cashMonths != null && i.cashMonths < 3) ? { id: 'runway', priority: 1, icon: '🛟', title: 'Build your emergency fund', body: i.cashMonths < 0.1 ? `You have no cash set aside for emergencies — most planners use 3–6 months of expenses as the range (investments aren’t counted here).` : `Your cash covers about ${i.cashMonths.toFixed(1)} months of expenses — most planners' range is 3–6.`, route: '/(tabs)/goals' } : null,
  (i) => (i.retireChance != null && i.retireChance < 60) ? { id: 'retire-offtrack', priority: 1, icon: '🏖️', title: 'Your retirement plan needs attention', body: `Only a ${i.retireChance}% odds it lasts — adjust savings, age, or expenses in the scenario.`, route: '/retirement' } : null,
  // B-48: a 401(k) needs earned income — don't nudge a retiree / no-wage user to contribute.
  (i) => (i.k401Remaining > 1000 && i.hasEarnedIncome) ? { id: 'k401-room', priority: 2, icon: '💼', title: 'Room left in your 401(k)', body: `About ${money0(i.k401Remaining)} of this year’s tax-advantaged room looks unused — an estimate from what you entered you contribute, not from your payroll.`, route: '/contribution-room' } : null,
  (i) => (i.beatBy != null && i.beatBy < -0.02) ? { id: 'behind-bench', priority: 2, icon: '📉', title: 'Trailing your benchmark', body: `Your portfolio is ${Math.abs(percentValue(i.beatBy, 0))} pts behind its benchmark — review your holdings.`, route: '/performance' } : null,
  // Cash drag CUT by the founder 2026-08-20 (brief §C, Q24): an opinion multiplied by an assumed
  // return. Months-of-cash (the runway rule above) is the kept cash fact.
  // FCC: HOLDING-level concentration — the same 25%+ fact Invest main shows, surfaced as an insight.
  // ONE HOLDING, NOT ONE STOCK (2026-10-25, the Performance drawing check MM-PF): this read "on one stock (VTI)", and VTI is a fund.
  // The app's word for one ticker in an account, whatever it is — a stock, a fund, a bond — is Holding (the canon, row 11), the
  // word the Holding page and Performance use. To reverse: put "stock" back in the title and the body.
  (i) => i.topHolding ? { id: 'holding-concentration', priority: 2, icon: '🎯', title: 'A lot rides on one holding', body: `${i.topHolding.value != null ? `${money0(i.topHolding.value)} (${percent2(i.topHolding.pct)}) of your invested money rides` : `${percent2(i.topHolding.pct)} of your invested money is`} on one holding (${i.topHolding.ticker}) — a fact worth knowing, not advice.`, route: '/(tabs)/invest' } : null,
  // B-45: this measures the largest ACCOUNT, not a single ticker — word it honestly.
  // walk row 9: a FACT, not an instruction (the audit flagged the old imperative wording)
  (i) => i.topAccountPct > 40 ? { id: 'concentration', priority: 2, icon: '🎯', title: 'Concentrated in one account', body: `${i.topAccountAmount != null ? `${money0(i.topAccountAmount)} (${percent2(i.topAccountPct)}) of your invested money sits` : `${percent2(i.topAccountPct)} of your invested money is`} in a single account — spreading across accounts lowers risk.`, route: '/performance' } : null,
  // B-52: this is contributions/gross — name it "investing" so it doesn't collide with the budget's
  // "savings rate" (take-home not spent), which is a different number.
  (i) => (i.investRate != null && i.investRate < 0.1) ? { id: 'invest-rate', priority: 2, icon: '📈', title: 'Nudge up your investing', body: `You’re investing about ${pctTxt(i.investRate)} of your gross income toward retirement — even +1% compounds over time.`, route: '/(tabs)/goals' } : null,
  // r12 (pre-48 audit C4a): a dated goal funded at a pace that misses its date — said in months, no instruction
  (i) => i.goalOffTrack ? { id: 'goal-offtrack', priority: 2, icon: '🗓️', title: 'A goal is running behind its date', body: `${i.goalOffTrack.label} is about ${plural(i.goalOffTrack.monthsBehind, 'month')} behind at this month’s funding pace — the date, the amount, or the pace can move. Your call.`, route: '/(tabs)/goals' } : null,
  // FCC: goals need more per month than the plan frees up — a quantified fact, no instruction.
  (i) => (i.goalsGap != null && i.goalsGap > 0) ? { id: 'goals-gap', priority: 2, icon: '🎯', title: 'Your goals outpace your surplus', body: `Hitting every goal on time needs about ${money0(i.goalsGap)}/month more than your plan frees up — see the trade-offs in Plan.`, route: '/(tabs)/goals' } : null,
  // FCC: the Social Security claim decision is live and no timing has been adopted — logistics, no opinion.
  // 2026-08-14: this used to fire from 62 to under-70 while the Plan tab used the founder's 60-to-70
  // ruling, so the same decision had two different age gates. Both ends were wrong. At 60 and 61 it
  // belongs on the list — it is the last stretch where the answer can still be planned around — but
  // the window is NOT open yet, so the card says so instead of claiming it is. And it must include
  // age 70 itself, which is the most urgent month of all: the delayed credit stops there, so from
  // then on waiting costs money and buys nothing.
  (i) => i.ssWindow === 'approaching'
    ? { id: 'ss-window', priority: 2, icon: '🗓️', title: 'Your Social Security decision is coming up', body: `You can first claim at 62, and every year you wait after that raises the check, up to 70. Worth deciding before it arrives — see it laid out in your dollars.`, route: '/ss-timing' }
    : i.ssWindow === 'open'
    ? { id: 'ss-window', priority: 2, icon: '🗓️', title: 'Your Social Security window is open', body: `You can claim any time from 62 to 70 — no deadline, but timing changes the check. See it laid out in your dollars.`, route: '/ss-timing' }
    : null,
  // founder 2026-07-15: a chief of staff never says 'your work is 17% done' — name the ONE
  // specific next thing and what it buys; the percent stays on the Sharpen screen itself.
  (i) => (i.planPct < 100 && i.planNext) ? { id: 'plan-incomplete', priority: 3, icon: '✨', title: 'One thing would sharpen every number', body: `Next: ${i.planNext.toLowerCase()} — two minutes in Plan.`, route: '/sharpen' } : null,
];

/** Ranked insights (highest priority first). `limit` caps the result (default all). */
/* ─ MK-HM-F-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildInsights
 *
 * Answers ..... Ranked insights (highest priority first).
 *
 * Formula .....
 *     the first limit of out   if limit ≠ nothing
 *     out   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-HM-F-001
 * Changed ..... 2026-07-30 (62656b7)
 */
export function buildInsights(input: InsightInput, limit?: number): Insight[] {
  let out = RULES.map((r) => r(input)).filter((x): x is RawInsight => x != null)
    .sort((a, b) => a.priority - b.priority)
    .map((i) => ({ ...i, theme: THEME_BY_ID[i.id] ?? 'optimize' as InsightTheme }));
  // Build-47 walk row 18 (audit Design ICP #28): the two concentration cards never fire together —
  // when the holding-level fact exists it is the more specific one; the account-level card yields.
  if (out.some((i) => i.id === 'holding-concentration')) out = out.filter((i) => i.id !== 'concentration');
  return limit != null ? out.slice(0, limit) : out;
}
