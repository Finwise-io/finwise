# Onboarding Screen Review — Tier 2 (2026-06-10)

Every onboarding surface judged against its objective: **is it clear, does it ask in the right
format (keyboard / units / cadence), is it honest about what the app does with the answer, is it
skippable when it should be, and does it fit the persona seeing it?**

Companion to the Tier-1 automated flow audit (`src/onboarding/flow_audit.test.ts`), which covers
structure/ordering/gating mechanically. This review covers what rules can't: judgment per screen.

Inventory: 5 meta screens (OnboardingScreen.tsx) + 45 render cases (modules.tsx) + Summary.tsx.

---

## Verdict table

✅ meets its objective · 🟡 works, polish noted · 🔴 defect or broken promise

| Screen | Objective | Verdict |
|---|---|---|
| status | life stage → shapes flow | ✅ |
| goals | pick services, themed + stage-ordered | ✅ |
| account | create/login mid-flow | 🟡 placement & Back (#14, #15) |
| name | personalize | ✅ |
| income_sources | gate income screens | ✅ best-practice multi-select |
| income_salary | base pay, any cadence | 🟡 dense but well-disclosed; hours default hidden (#20) |
| income_401k | contribution + match, limit check | ✅ limit callout w/ catch-up is excellent |
| income_bonus | bonus + landing month | ✅ |
| income_rsu | equity by vesting schedule | 🟡 "Price/sh" ambiguity (#19) |
| income_rental | net rental income | ✅ warns when negative |
| income_self | gig/freelance | ✅ "after business costs" hint |
| income_investment | interest & dividends, cadence | ✅ |
| income_benefits | benefits, CFPB-inclusive | 🟡 benefitTypes captured, unused (#13) |
| income_support | child support/alimony | ✅ |
| income_scholarship | aid w/ disbursement timing | ✅ |
| income_loans | borrowed money + repayment | ✅ honest "borrowed, not income" |
| income_other | catch-all | ✅ |
| income_tax | est. vs own rate | 🔴 label says "(optional)", validator requires it (#2); decimals blocked (#11) |
| recap_income | income adds up → available | ✅ hero + line items + lumpy chart |
| monthlySpending | single spend estimate | ✅ % of income callout |
| flexBuckets | itemize by priority tier | ✅ estimate reconciliation is honest |
| savingsRateTarget | month-by-month savings plan | ✅ |
| recap_spend | full-year cash-flow picture | ✅ donut + stacked columns |
| birth | age for limits/RMD | 🔴 no range check — month 13 accepted (#7) |
| currentRetirementSavings | 401k/IRA total | ✅ zero allowed |
| contributionsByType | other monthly contributions | 🟡 validator vacuous — c_touched never set (#8) |
| employerContribution | — | 🔴 DEAD — never emitted; match lives on income_401k (#5) |
| targetRetirementAge | target age | 🟡 no target>age guard (#10) |
| expectedRetirementSpending | retirement spend | ✅ % of today framing |
| currentSavingsPortfolio | drawdown pool | ✅ adaptive scope + RMD insight |
| retirementIncomeSources | income by source & cadence | 🟡 withdrawals vs RMD double-count risk (#9) |
| horizonAge | plan-to age | ✅ |
| retLocation | retirement location | 🔴 claims "affects cost of living" — consumed nowhere (#4) |
| travelBudget / medicalBudget | optional extras | ✅ wired into retirement spend |
| spendingChangeLater | spend trajectory | ✅ |
| investObjective | why track investments | 🟡 "P&L" jargon (#12) |
| trackingLevel | tracking depth | ✅ |
| investmentHoldings | portfolio total | ✅ adaptive scope vs retirement |
| networthIntro | hand-off to NW tab | ✅ honest "do it in the app" |
| goals_detail | capture goals | 🟡 silent no-op add; no starter chips (#17) |
| monthlySavingsCapacity | goal capacity | ✅ absorbed when spend present |
| hasPartner | household shape | 🟡 title presumes partner (#18) |
| invitePartner | invite partner | 🔴 collects email; NO invite is sent, never consumed (#3) |
| dependentsCount | dependents | 🔴 Continue disabled until stepper touched — 0 kids must tap +/− (#6) |
| debts | biggest debt + payoff math | 🔴 rate keyboard blocks decimals; placeholder is "6.5" (#1) |
| legacyTarget | estate target | ✅ |
| recap_retire | outlook / will-it-last | ✅ both branches strong |
| recap_invest | portfolio recap | ✅ thin but adequate |
| recap_goals | goals + months-to-target | ✅ |
| summary | celebrate + module map | ✅ active/unlock framing is good |

---

## Findings, ranked

### P1 — defects & broken promises (fix before launch)
1. **debts — interest rate can't take a decimal.** `NumRow` uses `number-pad`, which has no
   "." on iOS; the placeholder itself shows `6.5`. → `decimal-pad`.
2. **income_tax — label contradicts validator.** "Effective tax rate % … (optional)" but
   `REQUIRED.income_tax` blocks Continue until a rate > 0 when "Enter my own rate" is chosen.
   Drop "(optional)" (the validator is right: choosing manual then entering nothing is a dead end).
3. **invitePartner — promises an invite that never happens.** `partnerEmail` is consumed nowhere;
   no email is sent. Either cut the screen or reword to "save their email — invites coming soon"
   (decide; cutting is honest).
4. **retLocation — claims an effect the app doesn't deliver.** Sub says "Affects cost of living";
   `retLocation` is read by no model. Reword to "for your records" or wire it (decide).
5. **employerContribution — dead screen.** Render case + StepId never emitted by the engine
   (match captured on income_401k). Remove, same as income_retirement/investRefine.
6. **dependentsCount — 0 kids can't continue without fiddling.** Validator requires a non-empty
   answer but the stepper starts displaying 0 without writing it; users must tap +/− to enable
   Continue. Seed '0' on render (or count untouched as 0).

### P2 — correctness / clarity
7. **birth — no range validation.** Month 13 or year 12 pass the validator; age math goes wild
   downstream. Validate month 1–12, year within (now−120, now).
8. **contributionsByType — validator is vacuous.** `num() >= 0` is always true and `c_touched`
   is never set by the screen, so the "required" step never gates. Zero contributions are
   legitimate — make it honestly optional (Skip) or set `c_touched` on first edit.
9. **retirementIncomeSources — withdrawals vs RMD double-count.** Both rows sum into income;
   an RMD *is* a withdrawal. Add a one-line hint: "enter RMDs here only if not already counted
   in withdrawals."
10. **targetRetirementAge — accepts a target below current age** (callout just disappears).
    Validate target > current age when birth is known.
11. **manualTaxRate — number-pad blocks "22.5".** → decimal-pad (same fix as #1).
12. **investObjective — "Realized & unrealized P&L"** is jargon for an onboarding screen;
    say "gains & losses, realized and on paper."

### P3 — polish & considerations
13. benefitTypes chips are captured but shape nothing — fine as context, but consider dropping
    or using them (e.g. SNAP → food-budget note).
14. Account creation is step 3, before any value is shown — standard practice is to delay sign-up
    until after the aha moment (the income recap would be a natural gate). Worth an A/B think;
    architecture (cloud draft sync) currently wants it early. Revisit in Tier 4.
15. Back is hidden on the account step — a user who wants to change goals before signing up can't.
16. "Step 4 of 27" counts recaps + summary; consider section-based progress ("Income · 2 of 5")
    to reduce perceived length.
17. goals_detail: + Add goal silently no-ops when label/target are empty; no starter suggestions
    (Emergency fund / Down payment / Vacation chips would seed faster).
18. hasPartner title ("Tell us about your partner") presumes one; "Do you manage money with a
    partner?" matches the options better.
19. RSU column "Price/sh" — say "today's price" so users don't enter grant-date price.
20. income_salary: blank hours/week silently assumes 40 — say so in the hint.

---

## What's working well (keep)
- **Progressive disclosure** — source picker gates income screens; month tables, due-day fields,
  and repayment terms appear only once an amount exists.
- **Hero-amount standard** — one big centered number per screen keeps screens scannable.
- **Honest, specific callouts** — 401(k) limit vs catch-up, "payment barely covers interest",
  "you're over by $X", negative-rental warning, RMD ages by birth cohort.
- **Cadence everywhere** — monthly/quarterly/annual toggles match how money actually arrives.
- **Recaps that add up** — line items visibly sum to totals; gross → net → available is the
  single best explainer in the app.
- **Persona adaptation** — titles flip for retirees, students get tuition/meal-plan categories,
  scope titles adapt when both retirement and invest are selected.
- **Every per-source detail is skippable** — "never trap the user" holds everywhere checked.
