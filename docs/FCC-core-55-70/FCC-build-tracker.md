# FCC core build tracker — MoneyKeel 55–70

_Working doc. Started 2026-07-13 after the founder's call: **stop building testable slices — build the
whole approved design, gate with the automated suite, then cut ONE build.** Source of truth for scope:
`FCC-core-detailed-design-v1.1-2026-07-06.xlsx` (40 screens) + `FCC-core-UX-design-v1.1` + PRD v1.1._

_Last updated 2026-07-14. Suite: **969 green** (was 839 pre-FCC), tsc clean, UI gate passing.
All FCC commits PUSHED (9ac80a7 → 0969193, branch taxonomy-v1.0.7)._

## BUILD STATUS — the review build is out
| | |
|---|---|
| **Build** | **#41 · v1.1.0** (the FCC redesign build) |
| Cut from | commit d0a898d, 2026-07-13 11:50 PM |
| EAS build | ✅ finished 2026-07-13 11:57 PM (7 min) |
| TestFlight | ✅ auto-submitted (submission 19e8e1b1…) — update the app on your phone; Apple emails when processed |
| Review materials | `FCC-launch-review-2026-07-13.md` (the verdict + script) · `../finwise-device-test-build41.xlsx` (the fillable walk sheet) |
| Founder verdict | 💬 _your call after the device walk:_ |
| Founder findings (2026-07-14) | **#1 FW logo/splash** — icon, splash and adaptive icon still carried the May FinWise artwork (the rename never regenerated the images). FIXED: interim MoneyKeel marks generated in the same visual family (MK tile + keel bar); stale second tagline removed from sign-in. Needs BUILD #42 to appear (images are baked into the binary). **#2 Onboarding ≠ B46** — new users got the old 4-way questionnaire. FIXED: the guard now routes brand-new users to the approved light flow (value intro → what-did-you-come-for → still-working/retired → routed fast-path; every step skippable); the deep questionnaire remains as the set-up-by-hand door from Home. Visible immediately for new accounts in #42. |

_Note 2026-07-13: the Apple account is registered as an INDIVIDUAL — founder decided no App Store
Connect rename is needed; the device shows MoneyKeel from the binary._

## Why Build 40 looked identical (recorded so we don't repeat it)
Build 40 (commit b4205b3) DID contain the new engines + rename, but: (1) the new hero sat behind the
`fccPaycheckEnabled` Settings switch, default OFF; (2) the bottom bar / navigation rebuild hadn't started;
(3) the TestFlight listing name comes from App Store Connect, not the binary. Lesson: partial slices behind
flags are invisible and untestable on device. New rule: **build complete → automated tests are the gate →
one build at the end.**

## Status legend
✅ done (code + tests green) · 🔨 partial · ⬜ not started · ♻️ mostly reuse (thin work) · 🚫 blocked

## Engines
| Engine | Status | Where | 💬 Your comments |
|---|---|---|---|
| F5 safe-to-spend paycheck | ✅ (+ projection mode used on Cash flow working lens) | `src/domain/paycheck/index.ts` | |
| F2 dated 12-month canonical grid | ✅ | `src/domain/grid/index.ts` | |
| Lens resolver (stage → hero + tab order) | ✅ | `src/domain/profile/lens.ts` | |
| ONE model invocation (hero=bar=detail by construction) | ✅ | `src/hooks/useCashflowModel.ts` | |
| F10 single-transaction worth-a-look flag | ✅ (engine + store wiring + resolution + known-payees) | `src/domain/transactions/flags.ts` | |
| F11 scenario composer + adoption contract | ✅ core (planHistory + adoptPlan/revertPlan + shared sheet) | store + `src/components/UseThisPlanSheet.tsx` | |
| selectWillItLast (the ONE will-it-last selector) | ✅ | `src/domain/retirement/willItLast.ts` | |
| F8 Social Security claim math (SSA schedule) | ✅ | `src/domain/retirement/ssTiming.ts` | |
| Insight rules: worth-a-look slot-1 · rmd-due · ss-window · goals-gap | ✅ | `src/domain/insights/index.ts` | |
| F4 multi-goal weigher | ✅ (weighGoals + trimHints-as-pre-runs + retireAgeWithContribution) | `src/domain/planning/multiGoal.ts` | |
| F1 secure sync seam + connection freshness | ⬜ (Transaction.source field ready; manual rows never flagged) | `src/services/sync/` | |
| Bond rate-sensitivity estimate | ✅ (bondRateSensitivity: approxYTM±1% repricing, honest bands, null when no honest math) | `src/domain/bonds/` | |
| Look-back counterfactual | ✅ (lookBack + factorOverMonths — real prices only, never extrapolated) | `src/domain/performance/lookBack.ts` | |
| Manual-value freshness nudge | ✅ (valueFreshness + value_as_of/source/last_synced fields) | `src/domain/assets/` | |
| Holding-level concentration callout | ⬜ | `src/domain/insights/` | |

## Screens (40, by tab)
### Foundation
| Item | Status | 💬 Your comments |
|---|---|---|
| 5-tab bar: Home · Net worth · Invest · Cash flow · Plan, lens-ordered, label+underline | ✅ | |
| Kill `fccPaycheckEnabled` flag — lens drives the experience (Settings → Your setup override) | ✅ | |
| '+ Expense' floating button (Home + Cash flow) · top-bar net-worth chip removed · MoneyKeel wordmark | ✅ | |
| Mask-ALL discipline: maskedMoney/maskDollars + the zero-'$' walk test | ✅ | |

### Home (9)
| Screen | Status | 💬 Your comments |
|---|---|---|
| Home — still-working hero (Grow & Track) | ✅ (investments + 1M vs market + freshness + net-worth line + what-needs-you + will-it-last) | |
| Home — retired hero (Safe to spend) | ✅ (PaycheckCard leads, no flag) | |
| Worth a look — transaction detail (F10) | ✅ (facts, comparison, two buttons, checklist, prev/next, copy ban tested) | |
| First run — what did you come for? (sets the lens) | ✅ FULL B46 flow (founder finding #2): value intro + intents + stage + fast-path; the GUARD now routes new users here; deep questionnaire = the by-hand door | |
| Home — first run (nothing connected yet) | ✅ (doors: Connect 'coming soon' honest / Import / Add by hand + retired-paycheck fast door; skip completes; 2026-07-14: no-data gate now counts LIVE accounts — skip→import lands on the real Home) | |
| Home — balances hidden | ✅ (banner + walk test) | |
| Home — stale connection + partial data | 🔨 (price freshness live; connection part blocked on F1) | |
| Idle cash — nudge detail | ✅ (`/idle-cash`; cash-drag insight repointed) | |
| 401(k) room this year — nudge detail | ♻️ (contribution-room screen exists; k401 insight routes there) | |
| Onboarding flow map (5 steps) | ✅ (founder finding #2) — intro → intents → stage → routed fast-path → Home; every step skippable | |

### Cash flow (7)
| Screen | Status | 💬 Your comments |
|---|---|---|
| Cash flow main — retired (F5 hero + 12 dated bars + draw-order + will-it-last) | ✅ | |
| Cash flow main — working (in/out/surplus + bars + commitments seam + projection card) | ✅ | |
| Month detail (pure renderer over one F2/F5 cell, prev/next) | ✅ (`/month-detail?slot=N`) | |
| Bill calendar v2 | 🔨 (v1 linked from 'All bills & the calendar'; running-balance table pending) | |
| Draw-order steer sheet | ✅ (2026-07-15, founder retiree-mock round): reorder by buttons, RMD pinned at 73+, honest depletion-model comparison (lasts-to + taxes; % deliberately not re-run), Keep/Reset persists ONE store.drawOrder the preview reads | |
| Your monthly income (SS · pension · annuity) | ✅ | |
| Quick-add expense (+ sheet) | ✅ (shared MoneySheets) | |

### Plan (7)
| Screen | Status | 💬 Your comments |
|---|---|---|
| Plan hub | ✅ (will-it-last card + band, big decisions, scenarios, revert row, sharpen meter, retired income row) | |
| Social Security claim timing | ✅ (`/ss-timing`, 7-test journey) | |
| Use this plan (adoption sheet, F11 — shared) | ✅ | |
| Multi-goal trade-off composer (F4) | ✅ (/multi-goal: dials, verdict vs canonical capacity, before→after retirement, tappable trim hints, adoption → commitments[] named on Cash flow) | |
| Roth conversion (simple scenario) | ♻️ (RothScreen linked from hub; scenario-ify + adoption pending) | |
| Retirement transition + required withdrawals | 🔨 (rmd-due insight + hub row → cockpit; dedicated screen pending) | |
| Will-it-last detail | ✅ (/will-it-last: one-selector headline + range + plain meaning + sourced drivers with change-roads) | |

### Net worth (8) — next session's first target
| Screen | Status | 💬 Your comments |
|---|---|---|
| Net worth tab — main | ✅ rebuilt to the approved glance-that-expands (2026-07-14, in Build 42): glance + trend + OWN/OWE + math line + collapsed detail + one add-or-connect | |
| Connect flow — institution + consent / accounts found + merge (F1) | ⬜ ⬜ (merge rule EXISTS: matchImportAccount, shared) | |
| Import from a file v2 | ✅ (institution required + provenance stamps, merge-not-duplicate w/ asset_id preserved, per-row class correction) | |
| Account detail — any class | ✅ (/account-detail: source chip, per-class record-activity through recordTransaction, ledger history, value_as_of + 6-month nudge, Edit round-trip) | |
| Bond editor / Alternative editor | ✅ ✅ | |
| Add or edit an account by hand (dynamic by class) | ⬜ (AssetSheet remains the editor; unified dynamic add screen pending) | |

### Invest (8)
| Screen | Status | 💬 Your comments |
|---|---|---|
| Invest — main (glance then drill) | ✅ rebuilt to the approved wireframe (2026-07-14, in Build 42): TOTAL RETURN glance + winners/laggards + concentration fact + look ahead/back + plan chip + ONE grouped list (bonds/alts/untracked folded in) | |
| Holding detail — equity / bond / alternative | ⬜ ✅ ✅ (bond facts + yields + rates card, alt typical-return + look-back door, shared reported-return editor — all on /account-detail; equity per-ticker page pending) | |
| Look back — what if I'd moved money? | ✅ (/look-back; design's worked example pinned to the dollar) | |
| What if I add more? (forward what-if) | ✅ (/what-if; before-chance = hub chance pinned; ?addMonthly= prefill from the 401(k)-room try-it) | |
| Record a transaction + History | ✅ | |
| Empty/stale/hidden/loading state contract | 🔨 (mask + freshness pinned; written contract pending) | |

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
1. Equity per-ticker detail page + the empty/stale/hidden state contract + concentration callout.
2. Plan: RMD/transition screen, Roth scenario-ify + adoption.
3. Net worth: unified manual add/edit (M1) + FCC main re-shell; F1 connect screens (consent +
   accounts-found reconcile — matchImportAccount is the shared merge rule; Plaid sandbox live).
4. First-run insertion into the new-user onboarding flow + empty-Home two-door state.
5. Bill calendar v2 running-balance table; draw-order steering.
6. Then: bump version, ONE TestFlight build (quota fresh; Apple account = individual, no ASC rename).

## Senior-UI-Tester pass — 2026-07-14 (after Build 42 was cut)
10 executable journeys added (`src/__tests__/ui_tester_flows.test.tsx`): 5 paying-user flows + 5 new edge cases. Suite 1004 green.

| Finding | Severity | Status | Founder comment 💬 |
|---|---|---|---|
| Home ignored LIVE accounts in its no-data gate — skip the questions, import a file, and Home still showed "Let's get your real numbers in" | P1 | ✅ FIXED same day (7b400be) — **not in Build 42**; lands in the next build | |
| + Expense button said "Add $7" for a typed $6.50 (display only; saved amount was exact) | LOW | ✅ FIXED same day (7b400be) — **not in Build 42**; lands in the next build | |
