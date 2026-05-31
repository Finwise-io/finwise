# FinWise — Competitive Analysis: Financial & Retirement Planning Apps
_Research date: 2026-05-30_

## 1. The landscape

**Budgeting / all-in-one personal finance**
- **Monarch Money** — all-in-one dashboard, account aggregation, collaboration (couples), AI categorization. The Mint successor of choice.
- **Copilot Money** — Apple-ecosystem, best-in-class AI auto-categorization + UI polish.
- **YNAB** — zero-based budgeting ("every dollar a job"), hands-on, opinionated method.
- **Quicken Simplifi** — forward-looking cash-flow projections, advanced rules, ~half Monarch's price.
- **Empower (Personal Capital)** — free; leads with investment tracking, fee analysis, net worth.
- **Origin** — expense + investments + retirement + AI advisor layered over the portfolio.
- **Rocket Money** — subscriptions/bills focus.

**Retirement-focused planners**
- **Boldin (NewRetirement)** — deepest paid planner: Monte Carlo, Roth conversion explorer, Social Security optimization, lifetime tax projections, healthcare modeling, spending guardrails.
- **ProjectionLab** — modern projections, Monte Carlo (free tier too), Sankey cash-flow viz, Roth modeling.
- **Empower retirement planner** — widely used, free, but shallow (no withdrawal sequencing / Roth windows / multi-year tax strategy).

## 2. Capability matrix — leaders vs. FinWise

| Capability | Category leaders | FinWise today |
|---|---|---|
| **Account aggregation (bank linking / Plaid)** — auto transactions, balances | Monarch, Copilot, Empower, Simplifi, Origin | ❌ manual entry + CSV import + receipt OCR |
| AI auto-categorization | Copilot, Monarch | ❌ (no linked transactions to categorize) |
| AI tips / advisor | Origin, Monarch | ✅ Claude-powered tips |
| Budgeting (categories, debt, frequency) | All | ✅ + custom categories + debt tracking |
| Cash-flow forecast | Simplifi | ⚠️ partial (budget targets, not forward forecast) |
| Investment / portfolio tracking + fee analysis | Empower | ❌ (manual investments + net worth only) |
| Retirement: basic calculator | Most | ✅ inflation-adjusted + employer match |
| Retirement: **Monte Carlo** | Boldin, ProjectionLab, Empower | ❌ |
| Retirement: Roth conversion / SS optimization / tax / withdrawal sequencing | Boldin, ProjectionLab | ❌ |
| Goals & savings | Most | ✅ + **gamification (XP/badges/streaks)** ← differentiator |
| Recurring / subscriptions | Rocket Money, Copilot | ✅ recurring income + expenses |
| Collaboration (household/couples) | Monarch, Simplifi | ❌ |
| Reports / analytics | All | ✅ 6-month analytics + charts |
| Economic data context | — | ✅ BLS + Treasury ticker ← unusual differentiator |

**Read:** FinWise is strong on _manual_ budgeting, retirement basics, and engagement (gamification, AI tips, economic context). The two biggest category gaps are **(a) automatic account aggregation** (the table-stakes feature that creates instant value) and **(b) advanced retirement modeling** (Monte Carlo / Roth / SS). Neither is required to launch; both are roadmap.

## 3. Onboarding — the bar

Best practices (fintech, 2026):
- **Progressive disclosure** — ask only what's needed per step; explain _why_.
- **Mobile-first, minimal typing** — taps over text fields.
- **Step indicators, inline validation, save-and-exit.**
- **Fast "aha moment"** — show value early. _Betterment shows a projected retirement balance right after a simple setup._
- **Defer heavy data entry** — leaders auto-import via bank linking so users see "all my money" in minutes instead of typing it.
- Retention stakes: only **~26%** of finance-app users return after day 1; **~4.5%** by day 30. Onboarding is make-or-break.

**Beli lesson (the reference app):** signature is **low-effort, fun input** — instead of forms, it uses **"this or that" comparisons** to rank, delivering personalization fast (recommendations kick in after ~15 ranked spots). _Caution:_ Beli also **gates progress on inviting 4 friends** — a friction/dark-pattern critics flag. Takeaway: **make input feel like a game, never hard-gate progress on non-essential actions; always offer "skip for now."**

## 4. FinWise onboarding — assessed against the bar

Flow (from `src/screens/OnboardingScreen.tsx`): **goal-first + adaptive branching** → only relevant steps show.
`goal → [budget_freq, savings_goals, income, expenses] and/or [retirement] → summary`

**Meets the bar:**
- ✅ **Goal-first adaptive branching** — textbook progressive disclosure (better than many leaders).
- ✅ **Step "X of Y" progress indicator.**
- ✅ **Visual choice cards** (icon + title + subtitle) — low-typing, tappable.
- ✅ **Inline validation** (e.g., "Choose tracking method").
- ✅ **Some skip affordance** ("you can always add them later" for savings goals).
- ✅ **Payoff screen** ("You're all set! 🎉" plan recap).

**Gaps vs. the bar:**
1. **Heavy manual data entry up front** (income + expenses) = friction. Leaders defer this via auto-import; FinWise asks users to type it during onboarding → drop-off risk.
2. **"Aha moment" is a recap, not a projection.** The summary lists goal/frequency/income — it does _not_ show a compelling forward number ("You're on track for **$X** at 65" or "You could save **$Y/mo**"). Betterment-style projection would land the eureka.
3. **Aha lands at the very end** (after all data entry) rather than early.
4. **No mid-flow save/resume** — step state is local; closing the app mid-onboarding loses progress.
5. **No bank-linking "wow"** — can't deliver the instant net-worth/spending picture leaders show in onboarding (roadmap item).

## 5. Recommendations (prioritized; none block the current launch)

1. **Make income/expense steps skippable** ("I'll add this later") so users reach the dashboard/value fast. _Highest-leverage, low-effort._
2. **Bring an "aha" forward & make the summary a projection** — after goal + 1–2 inputs, show a real projected number (retirement balance or monthly-savings capacity), not just a recap.
3. **Add save-and-exit / resume** for the wizard.
4. **Beli-ify inputs** where possible — taps/sliders/comparisons over typed fields; per-step "why we ask this."
5. **Roadmap: Plaid account aggregation** — the single biggest capability gap _and_ onboarding accelerator (instant value, less typing).
6. **Roadmap: advanced retirement modeling** (Monte Carlo first — it's the 2026 differentiator across Boldin/ProjectionLab/Empower).

## Sources
- Engadget "best budgeting apps 2026"; Quicken & Origin 2026 guides; Ramsey budgeting comparison; Techno-Pulse "YNAB vs Copilot vs Monarch vs Simplifi."
- Boldin vs Empower vs ProjectionLab comparisons; Rob Berger "best retirement calculators"; ProjectionLab.com.
- Eleken, CleverTap, Appcues, Userpilot fintech-onboarding best-practice guides; Betterment "aha moment" pattern.
- Beli: beliapp.com, App Store, Pratt IXD design critique, startupsignals/Medium write-ups.
