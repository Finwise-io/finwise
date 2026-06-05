# FinWise — Objectives → Features → Guidelines → Scorecard

_Last evaluated: 2026-06-04. Re-run this scorecard each milestone._

## 1. Objectives (from product owner)
- **A. Top-3** financial-planning & budgeting app.
- **B. All users** — tech-savvy, non-tech seniors, Gen Z, retired, employed, partially-employed, unemployed.
- **C. Every country** — local currency, tax rates, account types.
- **D. Differentiators** — solve unmet needs, not a me-too app.
- **E. Stickiness** — hard to leave (data, history, personalization, habit).

## 2. Objectives → capability pillars (what we grade)
| # | Pillar | From | Weight |
|---|--------|------|--------|
| P1 | Core money tracking (income, spend vs budget, debt) | A | 15% |
| P2 | Financial planning (net worth, retirement, goals, scenarios) | A,D | 15% |
| P3 | UX quality & polish ("top-3" bar) | A | 15% |
| P4 | Persona coverage (all 7 user types) | B | 15% |
| P5 | Global readiness (currency, tax, i18n, accounts) | C | 12% |
| P6 | Differentiation / unmet needs | D | 14% |
| P7 | Stickiness (data, history, habit, lock-in) | E | 14% |

## 3. Design guidelines (the standard we build to)
- **Mock-first** for detail screens (HTML→PNG, iterate, then build).
- **Hero number + supporting detail + green insight** pattern per screen.
- **Color = meaning**: green positive/growth/inflow; red problem; amber caution; blue/purple/gold categorical; neutral ink for values; captions = dark grey. ≤2 accent colors/view.
- **One source of truth** per domain; screens read from snapshot/store, no duplicate logic.
- **Money/data formatting**: compact ($182K / $2.43MM) where space-tight.
- _Missing guidelines to add_: **accessibility** (Dynamic Type / font scaling, ≥4.5:1 contrast, screen-reader labels, "simple mode"); **i18n** (no hardcoded currency symbol/locale; externalized strings); **empty/loading/error states**; **motion** (subtle, purposeful).

## 4. Scorecard (1–5; weighted)
| Pillar | Score | Evidence | Biggest gaps |
|--------|:---:|----------|--------------|
| P1 Core tracking | **4.0** | Rich income capture (salary gross/net+tax, equity vesting, bonus, rental), spend-by-category vs budget, debt tracking + payments, quick-add, lumpy monthly cash flow | Manual entry only (no **bank linking/Plaid** → friction & gaps); no recurring-txn automation; receipt OCR pending rebuild |
| P2 Planning | **3.0** | Net Worth (per-account, donut), Monte Carlo retirement engine + cockpit v1, savings plan | **Goals = placeholder** (not built); retirement is **accumulation-only** (no decumulation for retirees); no cross-goal scenario planning; retirement screen mid-redesign |
| P3 UX polish | **3.5** | Home/Income/Net Worth heavily polished; locked color & layout system; mock-first discipline | **Old un-redesigned screens behind nav** (Budget tab=old Transactions, Settings, Tips, Rewards); onboarding is long; thin empty/loading states |
| P4 Persona coverage | **2.5** | Employed ✓; partially-employed/variable income modeled well (equity/bonus lumpiness); streaks (a Gen-Z nod) | **No accessibility** (seniors); **no decumulation** (retired); **no unemployed/runway/safety-net** mode; no "simple mode"; gamification thin |
| P5 Global readiness | **1.0** | — | **USD-only**, **US 2026 single-filer tax only**, **English-only**, US-only accounts (401k/IRA). No multi-currency, i18n, or localized tax/accounts |
| P6 Differentiation | **3.5** | **Equity-comp (RSU/options) vesting tracking** (genuinely underserved); **lumpy-income → monthly cash flow**; **closed loop: income→allocate savings→net worth**; budgeting+debt+net-worth+Monte-Carlo unified | Net worth & basic budgeting are commoditized; differentiators not yet sharpened/surfaced as the headline; no AI/insight engine yet |
| P7 Stickiness | **2.5** | **Granular monthly snapshots** (per-category, per-account, per-debt) = real history moat; personalized projections; cloud sync; streaks | No **bank linking** (daily-habit driver); no insight/notification engine; no couples/shared; no data export/report; history not yet *surfaced* as value |

**Weighted overall ≈ 2.9 / 5 (~58%).** Strong, differentiated core; major gaps in global readiness, persona breadth, goals, and replacing old screens.

## 5. What it takes to move the needle (priority)
1. **P5 Global (biggest single gap, blocks "every country"):** currency-agnostic money formatting + locale; externalize strings (i18n); pluggable tax & account-type packs (US/UK/India/EU…). Foundational — do the *plumbing* early even if only US ships first.
2. **P2 Goals module** (it's a tab placeholder) + **decumulation** for retirees (P4).
3. **P3 Replace old screens** behind the new nav (Budget/Transactions, Settings, Tips, Rewards) → consistency = "top-3" feel.
4. **P4 Accessibility + Simple mode** (seniors) and an **unemployed/runway** lens (emergency-fund months) → "all users."
5. **P7 Bank linking (Plaid/equiv.)** = the biggest stickiness + friction-reduction lever (also fixes P1 manual-entry).
6. **P6 Sharpen differentiators**: lead with equity-comp + lumpy-income + the closed income→net-worth loop; add an **insight engine** (the deferred service) to turn the snapshot history into "gas +15%, stocks −12%" nudges (P7 too).
7. **Security pre-reqs** (already parked): deploy Firestore rules; encrypt local cache.

## 6. Honest verdict
We've built a **differentiated, well-designed core for the employed/accumulating US user** with a real data-history moat forming. To hit the objectives we are **furthest on "every country" (P5) and "all users" (P4)**, and we have **unfinished planning (goals, decumulation)** and a **consistency debt** (old screens). The differentiators are real but need to become the headline and be reinforced by bank-linking + an insight engine for stickiness.
