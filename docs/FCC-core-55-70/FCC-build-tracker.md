# FCC core build tracker — MoneyKeel 55–70

_Working doc. Started 2026-07-13 after the founder's call: **stop building testable slices — build the
whole approved design, gate with the automated suite, then cut ONE build.** Source of truth for scope:
`FCC-core-detailed-design-v1.1-2026-07-06.xlsx` (40 screens) + `FCC-core-UX-design-v1.1` + PRD v1.1._

_Last updated 2026-07-13 end of session 2. Suite: **937 green** (was 839 pre-FCC), tsc clean, UI gate
passing. Commits: 9ac80a7 · 4cb258a · 7b2a507 · acc096c · 9eb6359 · 04777bc · d33eeae · f26bf23 · 95c0853
(branch taxonomy-v1.0.7, NOT pushed). NOTE 2026-07-13: Apple account is registered as an INDIVIDUAL —
founder decided NO App Store Connect rename needed; the device shows MoneyKeel from the binary._

## Why Build 40 looked identical (recorded so we don't repeat it)
Build 40 (commit b4205b3) DID contain the new engines + rename, but: (1) the new hero sat behind the
`fccPaycheckEnabled` Settings switch, default OFF; (2) the bottom bar / navigation rebuild hadn't started;
(3) the TestFlight listing name comes from App Store Connect, not the binary. Lesson: partial slices behind
flags are invisible and untestable on device. New rule: **build complete → automated tests are the gate →
one build at the end.**

## Status legend
✅ done (code + tests green) · 🔨 partial · ⬜ not started · ♻️ mostly reuse (thin work) · 🚫 blocked

## Engines
| Engine | Status | Where |
|---|---|---|
| F5 safe-to-spend paycheck | ✅ (+ projection mode used on Cash flow working lens) | `src/domain/paycheck/index.ts` |
| F2 dated 12-month canonical grid | ✅ | `src/domain/grid/index.ts` |
| Lens resolver (stage → hero + tab order) | ✅ | `src/domain/profile/lens.ts` |
| ONE model invocation (hero=bar=detail by construction) | ✅ | `src/hooks/useCashflowModel.ts` |
| F10 single-transaction worth-a-look flag | ✅ (engine + store wiring + resolution + known-payees) | `src/domain/transactions/flags.ts` |
| F11 scenario composer + adoption contract | ✅ core (planHistory + adoptPlan/revertPlan + shared sheet) | store + `src/components/UseThisPlanSheet.tsx` |
| selectWillItLast (the ONE will-it-last selector) | ✅ | `src/domain/retirement/willItLast.ts` |
| F8 Social Security claim math (SSA schedule) | ✅ | `src/domain/retirement/ssTiming.ts` |
| Insight rules: worth-a-look slot-1 · rmd-due · ss-window · goals-gap | ✅ | `src/domain/insights/index.ts` |
| F4 multi-goal weigher | ✅ (weighGoals + trimHints-as-pre-runs + retireAgeWithContribution) | `src/domain/planning/multiGoal.ts` |
| F1 secure sync seam + connection freshness | ⬜ (Transaction.source field ready; manual rows never flagged) | `src/services/sync/` |
| Bond rate-sensitivity estimate | ⬜ | `src/domain/bonds/` |
| Look-back counterfactual | ⬜ | `src/domain/performance/` |
| Manual-value freshness nudge | ✅ (valueFreshness + value_as_of/source/last_synced fields) | `src/domain/assets/` |
| Holding-level concentration callout | ⬜ | `src/domain/insights/` |

## Screens (40, by tab)
### Foundation
| Item | Status |
|---|---|
| 5-tab bar: Home · Net worth · Invest · Cash flow · Plan, lens-ordered, label+underline | ✅ |
| Kill `fccPaycheckEnabled` flag — lens drives the experience (Settings → Your setup override) | ✅ |
| '+ Expense' floating button (Home + Cash flow) · top-bar net-worth chip removed · MoneyKeel wordmark | ✅ |
| Mask-ALL discipline: maskedMoney/maskDollars + the zero-'$' walk test | ✅ |

### Home (9)
| Screen | Status |
|---|---|
| Home — still-working hero (Grow & Track) | ✅ (investments + 1M vs market + freshness + net-worth line + what-needs-you + will-it-last) |
| Home — retired hero (Safe to spend) | ✅ (PaycheckCard leads, no flag) |
| Worth a look — transaction detail (F10) | ✅ (facts, comparison, two buttons, checklist, prev/next, copy ban tested) |
| First run — what did you come for? (sets the lens) | ✅ (/first-run: intents + stage + retired fast-path + Skip; Settings links to it). Onboarding-flow insertion for brand-new users still pending |
| Home — first run (nothing connected yet) | 🔨 (honest empty state exists; FCC two-door layout pending) |
| Home — balances hidden | ✅ (banner + walk test) |
| Home — stale connection + partial data | 🔨 (price freshness live; connection part blocked on F1) |
| Idle cash — nudge detail | ✅ (`/idle-cash`; cash-drag insight repointed) |
| 401(k) room this year — nudge detail | ♻️ (contribution-room screen exists; k401 insight routes there) |
| Onboarding flow map (5 steps) | ⬜ |

### Cash flow (7)
| Screen | Status |
|---|---|
| Cash flow main — retired (F5 hero + 12 dated bars + draw-order + will-it-last) | ✅ |
| Cash flow main — working (in/out/surplus + bars + commitments seam + projection card) | ✅ |
| Month detail (pure renderer over one F2/F5 cell, prev/next) | ✅ (`/month-detail?slot=N`) |
| Bill calendar v2 | 🔨 (v1 linked from 'All bills & the calendar'; running-balance table pending) |
| Draw-order steer sheet | 🔨 (preview + Why sheet live; steering/reordering pending) |
| Your monthly income (SS · pension · annuity) | ✅ |
| Quick-add expense (+ sheet) | ✅ (shared MoneySheets) |

### Plan (7)
| Screen | Status |
|---|---|
| Plan hub | ✅ (will-it-last card + band, big decisions, scenarios, revert row, sharpen meter, retired income row) |
| Social Security claim timing | ✅ (`/ss-timing`, 7-test journey) |
| Use this plan (adoption sheet, F11 — shared) | ✅ |
| Multi-goal trade-off composer (F4) | ✅ (/multi-goal: dials, verdict vs canonical capacity, before→after retirement, tappable trim hints, adoption → commitments[] named on Cash flow) |
| Roth conversion (simple scenario) | ♻️ (RothScreen linked from hub; scenario-ify + adoption pending) |
| Retirement transition + required withdrawals | 🔨 (rmd-due insight + hub row → cockpit; dedicated screen pending) |
| Will-it-last detail | 🔨 (hub links to cockpit; dedicated detail screen pending) |

### Net worth (8) — next session's first target
| Screen | Status |
|---|---|
| Net worth tab — main | ♻️ rows now open Account detail; FCC glance re-shell pending |
| Connect flow — institution + consent / accounts found + merge (F1) | ⬜ ⬜ (merge rule EXISTS: matchImportAccount, shared) |
| Import from a file v2 | ✅ (institution required + provenance stamps, merge-not-duplicate w/ asset_id preserved, per-row class correction) |
| Account detail — any class | ✅ (/account-detail: source chip, per-class record-activity through recordTransaction, ledger history, value_as_of + 6-month nudge, Edit round-trip) |
| Bond editor / Alternative editor | ✅ ✅ |
| Add or edit an account by hand (dynamic by class) | ⬜ (AssetSheet remains the editor; unified dynamic add screen pending) |

### Invest (8)
| Screen | Status |
|---|---|
| Invest — main (glance then drill) | 🔨 (glance header + Home pin DONE; drill re-shell pending) |
| Holding detail — equity / bond / alternative | ⬜ ♻️ ♻️ |
| Look back — what if I'd moved money? | ⬜ |
| What if I add more? (forward what-if) | ⬜ |
| Record a transaction + History | ✅ |
| Empty/stale/hidden/loading state contract | 🔨 (mask + freshness pinned; written contract pending) |

## Test gates (the founder's ask: thorough automated > manual) — LIVE
- `fcc_agreement.test.tsx`: Home hero = Invest header (rendered, to the dollar) · will-it-last identical
  on Home/Plan/Cash flow (one selector, rendered) · the mask walk (zero '$' under hide, both lenses) ·
  the lens contract (paycheck leads when retired, never when working).
- `cashflow_fcc.test.tsx`: hero = bar = month-detail (PIN 1) · this-year = exact 12-cell sum ≠ ×12 (PIN 2)
  · month rows sum visibly (PIN 3) · projection card estimate-labeled · draw-order Why sheet.
- `ss_timing_journey.test.tsx`: 67-row = statement · SSA factors = design wireframe dollars · adoption
  through the sheet only · revert exact · receiving/passed states · example numbers never adoptable.
- `worth_a_look_integration.test.tsx`: store review pipeline · manual rows never flagged · known-payee
  memory · slot-1 pin · scam/fraud/alert copy ban.
- Route backstop (every root route in MODAL_SEGMENTS), 34-screen smoke matrix, keyboard gate,
  a11y ratchet (Home 35→0, Settings 20→0, all new files 0), check-ui-tests.sh.

## Next session order
1. Invest drills: holding detail (equity/bond/alt), look-back counterfactual, forward what-if,
   state contract; bond rate-sensitivity + concentration callout engines.
2. Plan: RMD/transition screen, will-it-last detail, Roth scenario-ify + adoption.
3. Net worth: unified manual add/edit (M1) + FCC main re-shell; F1 connect screens (consent +
   accounts-found reconcile — matchImportAccount is the shared merge rule; Plaid sandbox live).
4. First-run insertion into the new-user onboarding flow + empty-Home two-door state.
5. Bill calendar v2 running-balance table; draw-order steering.
6. Then: bump version, ONE TestFlight build (quota fresh; Apple account = individual, no ASC rename).
