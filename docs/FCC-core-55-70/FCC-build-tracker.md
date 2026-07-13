# FCC core build tracker — MoneyKeel 55–70

_Working doc. Started 2026-07-13 after the founder's call: **stop building testable slices — build the
whole approved design, gate with the automated suite, then cut ONE build.** Source of truth for scope:
`FCC-core-detailed-design-v1.1-2026-07-06.xlsx` (40 screens) + `FCC-core-UX-design-v1.1` + PRD v1.1._

## Why Build 40 looked identical (recorded so we don't repeat it)
Build 40 (commit b4205b3) DID contain the new engines + rename, but: (1) the new hero sat behind the
`fccPaycheckEnabled` Settings switch, default OFF; (2) the bottom bar / navigation rebuild hadn't started;
(3) the TestFlight listing name comes from App Store Connect, not the binary. Lesson: partial slices behind
flags are invisible and untestable on device. New rule: **build complete → automated tests are the gate →
one build at the end.**

## Status legend
✅ done (code + tests green) · 🔨 in progress · ⬜ not started · ♻️ mostly reuse (thin work) · 🚫 blocked

## Engines
| Engine | Status | Where |
|---|---|---|
| F5 safe-to-spend paycheck | ✅ core built (14 tests) | `src/domain/paycheck/index.ts` |
| F2 dated 12-month canonical grid | ✅ built | `src/domain/grid/index.ts` |
| Lens resolver (stage → hero + tab order) | ⬜ | `src/domain/profile/lens.ts` (new) |
| F10 single-transaction worth-a-look flag | ⬜ | `src/domain/transactions/flags.ts` (new) |
| F11 scenario composer + adoption contract | ⬜ | `src/domain/scenario/` (new) |
| F4 multi-goal weigher | ⬜ | `src/domain/planning/` extension |
| F1 secure sync seam + connection freshness | ⬜ | `src/services/sync/` (new seam; Plaid later) |
| Bond rate-sensitivity estimate | ⬜ | `src/domain/bonds/` extension |
| Look-back counterfactual | ⬜ | `src/domain/performance/` extension |
| Manual-value freshness nudge | ⬜ | `src/domain/assets/` extension |
| Holding-level concentration callout | ⬜ | `src/domain/insights/` extension |
| Insight rules: required-withdrawal · claim-window · goal-offtrack | ⬜ | `src/domain/insights/` |

## Screens (40, by tab)
### Foundation
| Item | Status |
|---|---|
| 5-tab bar: Home · Net worth · Invest · Cash flow · Plan, lens-ordered, label+underline | ⬜ |
| Kill `fccPaycheckEnabled` flag — lens drives the experience | ⬜ |
| '+ Expense' floating button (Home + Cash flow) · top-bar net-worth chip removed | ⬜ |
| In-app MoneyKeel branding | ⬜ |

### Home (9)
| Screen | Status |
|---|---|
| Home — still-working hero (Grow & Track) | ⬜ |
| Home — retired hero (Safe to spend) | 🔨 PaycheckCard exists; needs spec layout + big-bills line |
| Worth a look — transaction detail (F10) | ⬜ |
| First run — what did you come for? (sets the lens) | ⬜ |
| Home — first run (nothing connected yet) | ⬜ |
| Home — balances hidden | ♻️ mechanism shipped; needs zero-'$' walk test |
| Home — stale connection + partial data | ⬜ (price part reusable now; connection part on F1 seam) |
| Idle cash — nudge detail | ⬜ |
| 401(k) room this year — nudge detail | ⬜ (contribution-room screen exists; align + route) |
| Onboarding flow map (5 steps) | ⬜ |

### Net worth (8)
| Screen | Status |
|---|---|
| Net worth tab — main | ♻️ NetWorthScreen exists; FCC re-shell |
| Connect flow — choose institution + consent (F1) | ⬜ |
| Connect flow — accounts found + merge/reconcile (F1) | ⬜ |
| Import from a file v2 | ♻️ parser/preview exist; institution + dedup pass |
| Account detail — any class | ⬜ |
| Bond editor | ✅ exists |
| Alternative editor | ✅ exists |
| Add or edit an account by hand (dynamic by class) | ⬜ |

### Invest (8)
| Screen | Status |
|---|---|
| Invest — main (glance then drill) | ♻️ PerformanceScreen re-shell |
| Holding detail — equity | ⬜ |
| Holding detail — bond | ♻️ math exists; page new |
| Holding detail — alternative | ♻️ |
| Look back — what if I'd moved money? | ⬜ |
| What if I add more? (forward what-if) | ⬜ |
| Record a transaction + History | ✅ exists |
| Empty/stale/hidden/loading state contract | ⬜ (written contract + tests) |

### Cash flow (7)
| Screen | Status |
|---|---|
| Cash flow main — retired (F5 hero + 12 dated bars) | 🔨 PaycheckCard on old screen; needs FCC layout |
| Cash flow main — working | ♻️ re-arrangement of CashFlowScreen |
| Month detail | ⬜ (pure renderer over one F2/F5 cell) |
| Bill calendar v2 | ♻️ smallest lift |
| Draw-order steer sheet | ⬜ |
| Your monthly income (SS · pension · annuity) | ✅ built (MonthlyIncomeScreen + paycheck-months) |
| Quick-add expense (+ sheet) | ⬜ |

### Plan (7)
| Screen | Status |
|---|---|
| Plan hub | ⬜ |
| Social Security claim timing | ⬜ |
| Multi-goal trade-off composer (F4) | ⬜ |
| Roth conversion (simple scenario) | ♻️ RothScreen exists; scenario-ify |
| Retirement transition + required withdrawals | ⬜ |
| Use this plan (adoption sheet, F11 — shared) | ⬜ |
| Will-it-last detail | ♻️ engine exists; page new |

## Test gates (the founder's ask: thorough automated > manual)
- `npx tsc --noEmit` clean · full `npx jest` green · `scripts/check-ui-tests.sh` pass — after EVERY phase.
- Journey tests: one per lens (working morning walk · retired morning walk), first-run walk, quick-add walk.
- Cross-screen agreement tests: Home hero = Invest total = Net worth investments row · safe-to-spend Home =
  Cash flow current month · will-it-last identical on Home/Plan/Insights (extend `home_integration.test.ts`).
- Full-app smoke: every registered route renders without crash (extend the 28-screen smoke).
- Mask walk: hideBalances on → zero '$' renders on every tab.
- Route-guard pin: every new segment in `MODAL_SEGMENTS` (T22 lesson).
