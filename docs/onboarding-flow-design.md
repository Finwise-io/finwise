# FinWise Onboarding — Adaptive Flow Design Spec (v2: life-stage-first)
_Design date: 2026-05-31 · revised 2026-06-01 (employment-status branch, retirement depth, decumulation)_

## Principles
- **One question per screen.** Tap-first; typing only when unavoidable. Conversational, encouraging.
- **Two adaptive axes:** **(A) life stage** (Q1 employment status) and **(B) goals** (Q2). Together they decide which modules appear, what "income" means, and accumulation vs. decumulation framing.
- **Logical narrative:** stage → goals → account → who you are → what you earn → what you have → retirement detail → spending → goals → your plan.
- **Fun (Beli):** progress, micro-encouragement, smart defaults, reuse prior answers, **never hard-gate** (every heavy question has "Skip for now").
- **Boldin payoff:** end on a colorful Overview with a hero metric + flowing charts, then "add more to sharpen."
- **Privacy:** Q1 & Q2 collect **no personal data**; account creation comes right after, *before* any PII (name/birth/income). Birth = month+year. Gender dropped.

---

## Q1 — "Which best describes you?" (single-select → STATUS)
The foundational branch.

| Option | STATUS | Drives |
|---|---|---|
| 🧑‍💼 Employed | `EMPLOYED` | Job income; retirement = **accumulation** |
| 🌴 Retired | `RETIRED` | Retirement-income sources; retirement = **decumulation** |
| 🕐 Partially employed | `PARTIAL` | Part-time job **+** some retirement income; either framing |
| 🎓 Student | `STUDENT` | Light income; debt/goals focus; future-oriented |

v1 build priority: **EMPLOYED + RETIRED full**; PARTIAL + STUDENT lighter (reuse modules, fewer screens).

## Q2 — "What brings you to FinWise?" (multi-select → TRACKS, filtered by STATUS)
| Goal card | Track | Shown for |
|---|---|---|
| 📊 Track income & spending | SPEND | all |
| 📈 Track my investments | INVEST | all |
| 🎯 Save for big purchases & goals | GOALS | all |
| 👫 Manage money with a partner | PARTNER | all |
| 👨‍👩‍👧 Manage money with family | FAMILY | all |
| 🏖️ Plan for retirement / when can I retire | RETIRE_ACC | EMPLOYED, PARTIAL, STUDENT |
| 🛟 Make my money last (am I drawing down safely?) | RETIRE_DEC | RETIRED, PARTIAL |
| 🎁 Leave a legacy / estate planning | LEGACY | RETIRED (optional) |
| 🎓 Pay down student debt | DEBT | STUDENT (optional) |

→ **Create account** (email/password/social) immediately after Q2.

---

## Module catalog (gated by STATUS + TRACKS)
| Module | Question / copy | Input | Shown when |
|---|---|---|---|
| **Name** | "What should we call you?" | first name | always |
| **Birth** | "When were you born?" | month + year | RETIRE_ACC or RETIRE_DEC |
| **Marital** | "Married or have a partner?" | yes/no | RETIRE_*, PARTNER, FAMILY |
| **Dependents** | "Kids or dependents? How many?" | yes/no → stepper | FAMILY (or RETIRE_* to refine) |
| **Income — EMPLOYED** | "Tell us about your job — take-home, how often, changes expected in 6 mo?" → recap + "add job / bonus / RSUs" | amount+freq (+ who-earns if partnered) | EMPLOYED / PARTIAL job portion |
| **Income — RETIRED** | "What are your retirement income sources?" → per source: amount + frequency | multi-select: **Social Security, Pension, 401(k)/IRA withdrawals, RMDs, Annuities, Investment/dividend income, Rental, Other** | RETIRED (+ PARTIAL) |
| **Income — STUDENT** | "Any income? Part-time, stipend, family support, loans" | light amounts | STUDENT |
| **Other income** | "Any other income? (consulting, rental, side gigs…)" | add / Skip | any earning (skippable) |
| **Savings & investments** | "What have you saved? Retirement accounts, investments, other savings/cash" | 3 amounts (skippable) | RETIRE_*, INVEST |
| **Retirement — location** | "Where do you plan to retire?" (country/region) | picker | RETIRE_* |
| **Retirement — spending change** | "Will your monthly spending in retirement be about the same as now, less, or more?" → optional target | same / less / more + amount | RETIRE_* |
| **Retirement — add-on budgets** | "Add extra retirement budget for travel or medical/long-term care?" | travel $ + medical $ (skippable) | RETIRE_* |
| **Retirement age (ACC)** | "When do you hope to retire?" | age slider (default 65) | RETIRE_ACC |
| **Retirement horizon (DEC)** | "How long should your money last?" (life expectancy / to age) | age slider (default ~90) | RETIRE_DEC |
| **Spending** | "What's your average monthly spending?" | monthly amount OR Skip | SPEND or RETIRE_* |
| **Goals detail** | "What are you saving for?" → per goal: target $ + by when | multi-select → target+date | GOALS |
| **Student debt** | "Tell us about your student loans" — balance, rate, payment | amounts | DEBT |
| **Invite partner** | "Manage money together? Invite your partner." | email invite OR Skip | PARTNER |
| **Summary / Overview** | "Here's your plan 🎉" | Boldin-style charts → dashboard | always |

Notes: income module **switches by STATUS** (job vs. retirement-income-sources vs. student). PARTIAL shows *both* a (part-time) job income screen and the retirement-income-sources screen. Job income from the first screen is **reused** on the "add more" screen.

---

## Branch table (module × STATUS, assuming relevant goals selected)
| Module | EMPLOYED | RETIRED | PARTIAL | STUDENT |
|---|:--:|:--:|:--:|:--:|
| Birth | ✅(if RETIRE) | ✅ | ✅ | ◻︎ |
| Income source type | Job | Retirement sources | Job + Retirement | Light |
| Savings & investments | ✅ | ✅ (drawdown pool) | ✅ | ◻︎ |
| Retirement location/spending/add-ons | ✅ | ✅ | ✅ | — |
| Retirement age vs horizon | **age (ACC)** | **horizon (DEC)** | either | — |
| Student debt | — | — | — | ✅ |
| Summary framing | nest-egg / readiness | **money-lasts / longevity** | blended | savings + debt payoff |

---

## Representative flows
All begin: **Q1 status → Q2 goals (filtered) → Create account → Name → …**
- **Employed, retirement plan** (EMPLOYED + RETIRE_ACC + SPEND): … Birth → Marital → Job income (+add) → Other income → Savings & investments → Retirement location → spending-change → travel/medical → Retirement age → Spending → **Summary: nest-egg projection + readiness**. ~13 screens.
- **Retired, will-my-money-last** (RETIRED + RETIRE_DEC + SPEND): … Birth → Marital → **Retirement income sources** (SS/pension/withdrawals/RMDs/…) → Savings & investments (drawdown pool) → Retirement location → spending-change → travel/medical → horizon (to age ~90) → Spending → **Summary: chance your money lasts + drawdown chart**. ~12 screens.
- **Student** (STUDENT + GOALS + DEBT): … Light income → Student debt → Goals → **Summary: debt payoff + goal timelines**. ~7 screens.
- **Just spending** (any status + SPEND only): … Income(by status) → Spending → **Summary: cash flow**. ~6–7 screens.

---

## The finale — Boldin-style Overview (per status/track, animated)
- **EMPLOYED/RETIRE_ACC:** hero **Retirement Readiness** ("on track for ~$X by {age}" + confidence band) → projected-balance area chart climbing to retirement.
- **RETIRED/RETIRE_DEC:** hero **"Your money is projected to last to age {N}"** / chance-it-lasts gauge → **drawdown** balance chart (declines through retirement, incl. travel/medical add-ons & location cost-of-living).
- **SPEND:** income vs. expenses + "≈ $Y/mo left."
- **GOALS:** per-goal ETAs. **DEBT:** payoff date.
- CTA: "Add accounts & details to sharpen your plan →" → dashboard.

---

## Locked decisions
1. **Q1 = employment status; Q2 = goals filtered by status; account created right after Q2** (before any PII).
2. **Retired = decumulation framing** ("will my money last?"), retirement-income sources (SS/pension/withdrawals/RMDs/annuities/investments), drawdown summary.
3. **v1 builds EMPLOYED + RETIRED fully; PARTIAL + STUDENT lighter.**
4. **Retirement depth added:** location/country, post-retirement spending change, travel + medical/LTC add-on budgets.
5. Spending = single monthly number (+Skip). Gender dropped. Birth = month+year. Partner = in-flow.
6. **Icons = Lottie animated characters** (lottie-react-native) — fun, reused in the Boldin summary.
   Done as a focused pass once the screens exist (native dep + `<LottieIcon>` wrapper + sourced/【provided】
   animations applied per screen). Emoji are interim placeholders until then.

## Build notes
- `buildSteps(status, tracks, answers)` returns the ordered, gated module list (now keyed off **status first**, then tracks + answers). Replaces `OnboardingScreen.tsx`'s linear `getSteps()`.
- Auth boundary: Q1+Q2 unauthenticated → **Create account** → modules authenticated; persist to store + Firestore incrementally (save-and-resume).
- Retirement math: extend `retirementMath` with a **decumulation/longevity** model (drawdown vs. SS/pension/RMD income, location cost-of-living factor, travel/medical add-ons) alongside the accumulation projection.
- _This spec is comprehensive but the question list isn't final — flagged items are the v1 set; refine in review._
