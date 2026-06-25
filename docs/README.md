# FinWise docs — index (what does what)

**One source of truth per topic.** If two files seem to cover the same thing, the one listed here is
canonical; anything else is stale and should be deleted, not read. Last cleaned: 2026-06-25.

## 🚀 Active — launch & ship
| File | What it is |
|---|---|
| `finwise-launch-checklist.md` | **THE** launch checklist — every step to ship, with current status. Start here. |
| `finwise-appstore-listing.md` | App Store listing copy (name, subtitle, keywords, description) + screenshot plan |
| `finwise-app-review-notes.md` | "Notes for the Reviewer" text + demo-login placeholder |
| `finwise-sentry-setup.md` | Crash reporting (Sentry) setup + verification — **status in the launch checklist** |
| `finwise-device-test-build33.md` | **Device test checklist** for build #33 (v1.0.8) — tick off on the TestFlight build |
| `finwise-dev-loop.md` | Fast local device debug loop (don't use TestFlight to debug) |

## 📐 Canonical specs (living — keep current)
| File | What it is |
|---|---|
| `finwise-taxonomy-spec.md` | **THE money vocabulary** — one word + one number per concept. Cite this for any label/number. |
| `finwise-data-schematics.md` | Data model / schema + the 14 Data-Integrity Rules (DR-1..14) |
| `finwise-ui-design-guidelines.md` | UI standards (legibility, tone, a11y, progressive disclosure) |
| `finwise-features.md` | Feature & capability tracker |
| `finwise-bug-ledger.md` | **THE bug tracker** — every bug + its fix/status (B-1..B-72) |
| `finwise-lessons-learned.md` | Engineering lessons (e.g. L-7 cross-screen agreement) |
| `finwise-qa-plan.md` | QA plan / process |

## 🔍 Audits (reference — the work they drove is done, in code + tests)
| File | What it is |
|---|---|
| `finwise-compliance-audit.md` | The 5-theme compliance audit that drove the Jun-2026 ship work |
| `finwise-ui-compliance-audit.md` | UI-guidelines conformance audit |

## 📚 Product reference / history (candidates to archive — say the word)
`finwise-roadmap.md` · `finwise-scorecard.md` · `build-plan.md` · `microservices-blueprint.md` ·
`competitive-analysis.md` · `monarch-budgeting-review.md` · `finwise-cfpb-toolkit-review.md` ·
`finwise-tax-export-proposal.md` · `portfolio-module.md` · `finwise-user-guide.md` ·
`onboarding-flow-design.md` · `onboarding-data-matrix.md` · `onboarding-scorecard.md` ·
`finwise-onboarding-flow-review.md` · `finwise-onboarding-screen-review.md`

## ⚖️ Legal
`privacy/` · `terms/` — hosted policy + terms.

## 🚩 Needs your decision (left untouched)
- `finwise-rename-candidates.md` — flags that **"FinWise" may be trademarked**. Real legal question — resolve before public launch.
- `*.docx` (Design_document, Product-design, RP-PD) + `RP-PD.pdf` — look like **your** documents; not mine to delete.
- HTML/PNG mockups (`*_mock.html/png`, `nav_mockups*`, `mockup.*`) — design mockups; archive if you don't want them in the repo.
- `finwise-test-plan-v1.0.8.pdf` / `.xlsx` — the build-30 device-test record (findings now resolved).

## 🗑️ Deleted 2026-06-25 (duplicates / exports / superseded — recover from git if needed)
launch-checklist-flat.md, launch-checklist.xlsx, preship-checklist.md, launch-review.md,
feature-list.xlsx/csv, data-schematic.md, data-review.md, data-schematics.xlsx, launch-test-plan.md,
testflight-test-plan.md, qa-results-2026-06-18.md, compliance-audit.xlsx, test-register.xlsx,
money-agreement-matrix.xlsx, tracker.xlsx, fix-list.md, dedup-audit.md, robustness-assessment.md,
userlens-qa-2026-06-12.md, asset-taxonomy-analysis.md.
