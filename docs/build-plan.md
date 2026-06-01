# FinWise — Build Plan
_Created 2026-05-31 · execution starts 2026-06-01_

## Working agreement
- Build **one part of the journey at a time**: **design → you review → build → test**, then move on.
- **After every step, check progress against this plan** (update statuses, re-confirm next step).

## Plan
| # | Step | Owner | Status |
|---|---|---|---|
| 1 | **Crash fix** — build #18 → TestFlight → install & confirm app opens | me (submit) / you (verify) | 🔄 #18 building on EAS; submit when done, then you verify |
| 2 | **Review onboarding design** — sign off `docs/onboarding-flow-design.md` or flag changes | you | pending |
| 3 | **Build onboarding (1/3)** — module engine `buildSteps()` + screen shell (progress/back/continue/skip) + Q1 goals + account-after-Q1 | me | pending (gated on #2) |
| 4 | **Build onboarding (2/3)** — adaptive question modules (identity, income, savings, retirement age, spending, goals, partner) + incremental store/Firestore persistence | me | pending |
| 5 | **Build onboarding (3/3)** — Boldin-style animated summary (readiness gauge, projected balance, cash-flow, goal timelines) | me | pending |
| 6 | **Test onboarding** on simulator — walk key flows (spending-only, retirement, goals, couple) end-to-end | me | pending |
| 7 | **Iterate per journey part** (design→review→build→test). First up: **budgeting redesign** (income-first balanced budget + flex buckets, per `docs/monarch-budgeting-review.md`). Then: home/dashboard, retirement view, goals, etc. | both | ongoing |

## Where we are (resume context)
- **Crash: root-caused & fixed, verified launching in a local release build.** Two stacked bugs: (1) React version mismatch (react pinned to 19.2.3, react-dom too, removed from expo.install.exclude); (2) Firebase "auth not registered" (metro.config `unstable_enablePackageExports=false` + `initializeAuth`). Build #17 errored on `npm ci` ERESOLVE → fixed (react-dom 19.2.3) → **#18 building**.
- **Onboarding design = locked** in `docs/onboarding-flow-design.md`: multi-goal Q1 → account → adaptive modules → Boldin summary. Decisions: account after Q1; single monthly spending; gender dropped; in-flow partner; birth month+year.
- **Reference docs:** `docs/competitive-analysis.md`, `docs/monarch-budgeting-review.md`, `docs/onboarding-flow-design.md`.
- **Open (not launch-blocking):** EAS-secret `EXPO_PUBLIC_` fix for ANTHROPIC/GOOGLE_VISION keys (AI tips + OCR silently broken in prod).

## Tomorrow's first actions
1. Confirm build #18 finished on EAS; `eas submit` it to TestFlight (id 7bf04717-363b-46cf-8a6b-8d4c7c022034). Install on device → confirm it opens.
2. You review/sign off the onboarding design → I start step 3.
