# FinWise Onboarding — Adaptive Flow Design Spec
_Design date: 2026-05-31_

## Principles
- **One question per screen.** Tap-first; typing only when unavoidable. Conversational, encouraging copy.
- **Adaptive.** Q1 (multi-select goals) decides which question *modules* a user sees. Never ask what a user's goals don't require.
- **Logical narrative:** *who you are → what you earn → what you have → when you want to retire → what you spend → what you're saving for → your plan.*
- **Fun (Beli lesson):** progress, micro-encouragement, smart defaults, reuse prior answers; **never hard-gate** — every heavy question has "Skip for now."
- **Boldin payoff:** end on a colorful **Overview** — a hero metric + flowing projection charts, then "add more to sharpen your plan."
- **Privacy-conscious:** birth = month + year only; gender optional ("prefer not to say"); copy reassures data is on-device.

---

## Step 1 — "What brings you to FinWise?" (multi-select → TRACKS)
Visual cards; pick any combination. Each maps to a data **track** that gates later modules.

| Option (card) | Track |
|---|---|
| 📊 Track my income & spending | **SPEND** |
| 🏖️ Plan for retirement / know when I can retire | **RETIRE** |
| 📈 Track my investments | **INVEST** |
| 🎯 Save for big purchases & goals | **GOALS** |
| 👫 Manage money with a partner | **PARTNER** |
| 👨‍👩‍👧 Manage money with family | **FAMILY** |

Derived flags: `HOUSEHOLD = PARTNER or FAMILY or (RETIRE & married)`; `MONEY = SPEND or RETIRE or GOALS or PARTNER or FAMILY` (almost always true → income matters).

---

## Question modules (catalog + gating)
Each module = one screen (or a tight mini-sequence). "Shown when" is the branch condition.

| # | Module | Question / copy | Input | Why we ask | Shown when |
|---|---|---|---|---|---|
| 1 | **Goals** | "What brings you to FinWise?" | multi-select cards | Drives the whole flow; no personal data | always |
| 1b | **Create account** | "Create your free account to save your plan" | email/password (or social) | Trust before any personal Qs; enables persistence & save-resume | always (right after Q1) |
| 2 | **Name** | "First, what should we call you?" | text (first name) | Personalize | always |
| 4 | **Birth** | "When were you born?" (month + year) | month/year pickers | Retirement horizon, age-based defaults | RETIRE |
| 5 | **Marital** | "Are you married or have a partner?" | yes/no | Household modeling, who-earns | RETIRE or PARTNER or FAMILY |
| 6 | **Dependents** | "Any kids or dependents? How many?" | yes/no → stepper | Family expenses, education goals | FAMILY (or RETIRE to refine) |
| 7 | **Earning?** | "Are you (or your partner) earning from a job?" | yes/no | Gate income flow | MONEY |
| 8 | **Who earns** | "Who's earning income?" You / Partner / Both / Other | choice | Route job questions | married & Earning=yes |
| 9 | **Job details** | "Tell us about your job — take-home, how often, any changes expected in 6 months?" | amount + frequency + change y/n | Income tracking & projections | Earning=yes (per earner if Both) |
| 10 | **Income recap + add** | shows job income from #9; "Add another job, bonus, or RSUs/stock?" | list + add | Capture full comp | Earning=yes |
| 11 | **Other income** | "Any other income? (consulting, rental, side gigs…)" | add / Skip | Complete cash-in | MONEY (skippable) |
| 12 | **Savings & investments** | "What have you saved? Retirement accounts, investments, other savings" | 3 amounts (each skippable) | Net worth, retirement base, investment tracking | RETIRE or INVEST |
| 13 | **Housing** | "Do you own or rent? Monthly payment?" | own/rent + amount | Big expense + home equity (Boldin) | RETIRE (skippable) |
| 14 | **Retirement age** | "When do you hope to retire?" | age slider (default 65) | Horizon | RETIRE |
| 15 | **Spending** | "What's your average monthly spending?" | monthly amount OR Skip | Budgeting + retirement needs | SPEND or RETIRE |
| 16 | **Goals detail** | "What are you saving for?" (multi) → per goal: target $ + by when | multi-select → target+date | Goal plans & timelines | GOALS |
| 16b | **Invite partner** | "Want to manage money together? Invite your partner." | email invite OR Skip | In-flow partner collaboration | PARTNER |
| 17 | **Summary / Overview** | "Here's your plan 🎉" | Boldin-style charts → "Go to dashboard" | The payoff (already signed in) | always |

Notes:
- **#9 reused in #10** (Beli pattern): the income entered is shown back, with an obvious "add more."
- **#8** only appears for couples; solo users skip straight to their own job.
- Sensitive/heavy screens (#3 gender, #11 other income, #12 savings, #13 housing, #15 spending) all offer **Skip for now**.

---

## Master order & branch table
Spine order: `1 → 1b → 2 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 16b → 17`, each gated above (Create account always follows Q1; gender removed). Result by track:

| Module | SPEND | RETIRE | INVEST | GOALS | PARTNER | FAMILY |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Name | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Birth | | ✅ | | | | |
| Marital | | ✅ | | | ✅ | ✅ |
| Dependents | | ◻︎ | | | | ✅ |
| Earning?/Who/Job/Recap | ✅ | ✅ | | ◻︎ | ✅ | ✅ |
| Other income | ✅ | ✅ | | ◻︎ | ✅ | ✅ |
| Savings & investments | | ✅ | ✅ | ◻︎ | | |
| Housing | | ✅ | | | | |
| Retirement age | | ✅ | | | | |
| Spending | ✅ | ✅ | | | ◻︎ | ◻︎ |
| Goals detail | | | | ✅ | | |
| Summary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

✅ = shown · ◻︎ = shown only if it adds value for that combo · blank = skipped

---

## Representative flows (combinations)
All flows: **Goals → Create account → …** (account always second). Then:
- **Just spending** (SPEND): … → Name → Earning? → Job → Income recap+add → Other income → Spending → **Summary (cash-flow)**. ~7–8 screens.
- **Retirement planning** (RETIRE) — the Boldin-style flow: … → Name → Birth → Marital → [Who/Job] → Income recap → Savings & investments → Housing → Retirement age → Spending → **Summary (Chance-of-Success + projection)**. ~11 screens.
- **Save for goals** (GOALS): … → Name → Earning?/Job → Goals detail (targets+dates) → Spending(capacity, skippable) → **Summary (goal timelines)**. ~7 screens.
- **Couple, full plan** (RETIRE+PARTNER+SPEND): adds Marital → Who-earns(Both) → Job ×2 → in-flow partner invite. ~14 screens, each fast.
- **Investments only** (INVEST): … → Name → Savings & investments → **Summary (portfolio snapshot)**. ~5 screens.

---

## The finale — Boldin-style "Overview" summary (the part that "flows nicely")
Render only the cards relevant to the user's tracks, in this order, each animating in:
1. **Hero metric (RETIRE):** a **Retirement Readiness** gauge — "You're on track for ~$X by 67" with a confidence band (our simplified chance-of-success). Big, colorful, the centerpiece.
2. **Projected savings balance over age (RETIRE/INVEST):** area chart climbing to retirement age.
3. **Cash flow (SPEND):** income vs. expenses bars + "≈ $Y/mo left to save."
4. **Goal timelines (GOALS):** each goal with an ETA ("Hawaii trip — on track for Aug 2027").
5. **CTA:** "Add accounts & details to sharpen your plan →" (Boldin's progressive-enrichment nudge) → dashboard.

Keep it scrollable, animated, shareable-feeling. This is the dopamine moment that earns retention.

---

## Locked decisions (2026-05-31)
1. **Account creation = right after Q1 (goals).** Q1 ("what brought you to FinWise?") asks for **zero personal data** — low-commitment. Immediately after, prompt **Create account**, *before* any personal questions (name, birth, income), because users won't share personal details without an account. From Name onward the flow is **authenticated**, and answers persist to the account as they're entered (free save-and-resume). The Summary is then just the payoff (no sign-up there).
2. **Spending = single monthly number** (+ Skip). No 3-bucket estimate in onboarding; users refine by category in-app later.
3. **Gender = dropped.** Module #3 removed. Retirement math uses blended life expectancy.
4. **Partner/family = in-flow setup.** Partner details (and an optional "invite your partner") are captured *during* onboarding via the Who-earns → partner job → invite modules.
5. **Birth = month + year only.** ✅

---

## Implementation notes
- Replaces the current `src/screens/OnboardingScreen.tsx` linear wizard with a **module-driven engine**: a `buildSteps(tracks, answers)` function returns the ordered, gated module list (extends the existing `getSteps()` branching, now keyed off the multi-select goals + answers).
- Each module = a small component with a consistent shell (progress bar, back, Continue, optional Skip).
- **Auth boundary:** Q1 (Goals) is unauthenticated; **Create account (1b)** runs right after; modules 2→17 are authenticated. Reuse the existing `AuthScreen`/Firebase auth as an inline step (not a separate route gate).
- Persist answers to the Zustand store **and Firestore incrementally** from Name onward (free save-and-resume — closes the gap we noted vs. best practice).
- Summary reuses existing retirement math (`retirementMath`) + new cash-flow/goal projections.
