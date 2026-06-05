# FinWise — Build Plan to a Top-3 App

_Companion to `finwise-scorecard.md`. Goal: close every gap to the 5 objectives without cutting corners._
_Effort key: S ≈ days · M ≈ 1–2 wks · L ≈ 3–4 wks · XL ≈ 5+ wks (single-builder estimates)._

## Sequencing rationale
Build **foundations that are expensive to retrofit first** (global/currency/tax plumbing, design system, data schema + security), then **finish the core product to top-3 polish**, then **widen to all personas**, then **go global**, with **differentiation + moat** running throughout. Shipping order can still be "US-first," but the *plumbing* lands in Phase 0 so we never rewrite.

---

## Phase 0 — Foundations & hardening _(must precede scale; pillars P3,P5,P7 + trust)_

### 0.1 Internationalization & currency plumbing — **L** _(P5; blocks "every country")_
- Introduce a **Money model** (amount + currency code; integer minor-units to avoid float drift) and a single `formatMoney(amount, currency, locale)` (Intl.NumberFormat). Replace every hardcoded `$`/`toLocaleString`.
- **i18n**: `expo-localization` + `i18next`; externalize all UI strings; date/number via locale; **RTL** layout pass.
- User setting: country, currency, locale, number format.
- **Acceptance:** switch locale → all currency/number/date/strings localize; no `$` literals remain; RTL renders.

### 0.2 Tax & account-type "packs" — **L** _(P5,P2)_
- Abstract the US-2026 IRS logic into a **TaxPack interface** (brackets, standard deduction, filing statuses, effective-rate, gross↔net) keyed by `country/year`. Add **filing status** (single/married/HoH) — currently single-only.
- **AccountTypePack**: region account types + tax buckets (US: 401k/IRA/Roth/HSA/529; UK: ISA/SIPP/LISA; CA: RRSP/TFSA; AU: super; IN: EPF/PPF/NPS).
- Ship US pack complete + scaffold 2 more (UK, India) to prove the abstraction.
- **Acceptance:** changing country swaps tax math + account options; US results unchanged from today; a second pack computes correctly.

### 0.3 Design system & accessibility baseline — **M** _(P3,P4)_
- Tokenize the locked **color principle** + a **type scale that respects Dynamic Type** (font scaling); shared components (Hero, Card, Sheet, Segmented, Donut, ProgressBar, Row, EmptyState, Skeleton).
- **Accessibility AA**: ≥4.5:1 contrast audit, `accessibilityLabel`/roles, ≥44px touch targets, focus order, VoiceOver/TalkBack pass.
- **Empty / loading / error** states standardized.
- **Acceptance:** a11y audit passes AA; Dynamic Type XL doesn't break layouts; screen-reader can complete add-expense + view net worth.

### 0.4 Data architecture, history & portability — **M** _(P7, trust)_
- **Schema versioning + migrations** on store hydrate (we keep adding fields; need safe upgrades).
- Formalize **monthly snapshots** (already granular) + retention policy + a typed read API for trends.
- **Export/import** (JSON + CSV) — trust, portability, and (paradoxically) reduces churn anxiety.
- **Acceptance:** old persisted state migrates cleanly; export→wipe→import round-trips; snapshot history queryable.

### 0.5 Security & compliance — **S–M** _(trust; partly parked)_
- **Deploy Firestore rules** (written); **encrypt local cache** (expo-secure-store key + AES over AsyncStorage); **auth**: email verification + forgot-password; sanitize all cloud writes (done).
- Disclaimers ("not financial advice"), privacy policy, data-deletion flow.
- **Acceptance:** rules live (cross-account read denied in test); local store encrypted at rest; account deletion wipes cloud+local.

### 0.6 Quality infra — **S (ongoing)**
- Expand domain tests; add component/integration tests for the money loops; error monitoring (Sentry); basic analytics/telemetry (funnels, retention) — **needed to know if we're "top-3."**
- **Exit Phase 0:** plumbing in place so no feature later forces a rewrite.

---

## Phase 1 — Finish the core to top-3 polish _(P1,P2,P3,P6,P7)_

### 1.1 Replace old screens behind the nav — **M** _(P3 consistency)_
- Redesign **Budget/Transactions** (full ledger: filter, search, edit, recurring), **Settings/Profile**, **Tips**, **Rewards** to the new system. Remove the old monolith screens.
- **Acceptance:** every reachable screen uses the design system; no legacy UI.

### 1.2 Retirement redesign — **L** _(P2,P3,P4)_ — _now PERSONA-ADAPTIVE (decision 2026-06-04)_
- Build the **2-screen** Outlook + Your-Plan/assumptions; extend `simulate()` to return **percentile band** (10–90) for the chart; contributions default from **actuals**; persist assumptions (`retirementAssumptions`); risk toggle → return/vol.
- **Adaptive by life-stage** so it serves more than the accumulator:
  - **Accumulating mode** (employed, pre-retirement): "will I get there?" — the approved mock.
  - **Drawdown mode** (retired / at retirement age): reframe to **"will it last?"** — no contributions, hero = money-lasts probability, declining chart, lever = **safe monthly spend**, Social Security timing + withdrawal. (This is the core of decumulation, pulled forward from Phase 2 so retirees don't see a broken screen.)
  - **Plain-language toggle** ("Show me simply"): swaps "78% / 10th–90th percentile / 400 scenarios" for plain copy ("Looking good — your money lasts in most futures ✅") and hides the band. Essential for non-tech seniors on this screen.
  - **Zero / irregular-income guard**: when contributions are $0 or income unstable, show "contributions paused — restarting $X/mo does this" instead of a failure framing.
- **Acceptance:** assumptions transparent & editable; chance/band update live; numbers reconcile with Home; a retired profile sees drawdown framing; plain toggle removes all jargon; $0-income shows the paused framing (not "you're short").
- **Deferred to Phase 2 (added to plan):** Gen-Z *motivational* framing (start-now compounding, near-term milestones vs age-90 abstraction) → see 2.5; **full app-wide Simple Mode** (this screen only gets a local plain toggle now) → see 2.1.

### 1.3 Goals module (real) — **M** _(P2; currently placeholder)_
- Save-by-date goals (auto from **non-monthly** categories + custom); **waterfall funding** from available-to-save (we saved the spec); progress, priority, projections; ties to allocations.
- **Acceptance:** a $5k-by-July goal computes required $/mo, funds from leftover, tracks progress.

### 1.4 Bank linking (aggregation) — **XL** _(P1 friction, P7 stickiness)_
- Integrate **Plaid** (US) behind an **aggregator interface** (so non-US providers — TrueLayer/Salt Edge/etc. — plug in later). Auto-import transactions + balances; **auto-categorize** to our buckets; reconcile manual vs linked.
- Requires Firestore rules + secure tokens (Phase 0). Server-side via Cloud Functions.
- **Acceptance:** link an account → transactions flow in, categorized, dedup'd; balances update net worth.

### 1.5 Insight engine — **M** _(P6,P7; deferred service)_
- Centralized, ranked insight service over the snapshot history: "gas +15% vs last month", "stocks −12%", budget pace, windfalls, savings-rate trend, costliest debt. Powers in-app cards **and notifications**.
- **Acceptance:** insights are data-driven, ranked, dismissible, and consistent across screens (no hardcoded per-screen logic).

### 1.6 Receipt OCR activation — **S** _(P1)_
- `npx expo run:ios` rebuild → ML Kit live; tune parsing; on-device only (privacy).
- **Exit Phase 1:** the employed/accumulation US product is end-to-end, polished, sticky.

---

## Phase 2 — Serve all personas _(P4)_

### 2.1 Accessibility complete + **Simple Mode** — **M** _(seniors, non-tech)_
- Beyond baseline: a **Simple Mode** (larger type, fewer options, linear guided flows, plain language, "what should I do?" prompts).
- **Acceptance:** a non-tech user can track spending & see "am I okay?" in ≤3 taps; full screen-reader journeys.

### 2.2 Decumulation (retirees) — **L** _(P4,P2; currently accumulation-only)_
- Drawdown modeling: **tax-aware withdrawal order**, **RMDs**, **Social Security claiming age**, pension/annuities, "will my money last" + safe-withdrawal guidance; healthcare/LTC budget.
- **Acceptance:** a retired user models drawdown, sees longevity probability + suggested withdrawal.

### 2.3 Unemployed / transition mode — **M** _(P4)_
- **Runway** (emergency-fund months = liquid assets ÷ spending), reduced-income budgeting, benefits/COBRA reminders, "stretch" plan.
- **Acceptance:** with $0 income, app shows runway, prioritized cuts, and a survival budget.

### 2.4 Gig / partially-employed — **S–M** _(P4)_
- Variable-income smoothing (pay-yourself-a-salary), irregular cadences, tax set-aside for 1099.
- **Acceptance:** irregular income → smoothed budget + tax reserve.

### 2.5 Couples / household + Gen-Z depth — **M** _(P4,P7)_
- Shared household (invite partner — partial today), joint + individual views, shared goals.
- Gen-Z: deeper **gamification** (milestones, challenges, streak rewards), **education** micro-lessons, shareable wins.
- **Gen-Z retirement framing** (deferred from 1.2): reframe the far-off age-90 question into start-now compounding + near-term milestones ("$50/mo now ≈ $X by 60"), since "money lasts to 90" doesn't motivate a 25-year-old.
- **Exit Phase 2:** all 7 personas have a first-class path.

> **Note (1.2 spillover):** the retirement screen ships a *local* plain-language toggle in Phase 1, but the **full app-wide Simple Mode** (large type, fewer options, linear guided flows everywhere) is **2.1**. Gen-Z motivational framing is **2.5**.

---

## Phase 3 — Global expansion _(P5)_

### 3.1 Localize for launch markets — **L per region**
- Complete **tax + account packs + translations + currency** for target set (e.g., UK, Canada, India, EU, Australia).
- Region guidance (ISA/RRSP/super/PF), local benchmarks, compliance/advice disclaimers, **data residency**.
- **Acceptance:** a UK user sees £, ISAs/SIPP, UK tax, English-UK strings, and correct projections.

### 3.2 Scale i18n ops — **M**
- Translation pipeline, locale QA, RTL languages.
- **Exit Phase 3:** "works in their country" for the launch set, with a repeatable add-a-country playbook.

---

## Phase 4 — Differentiation & moat _(P6,P7; runs alongside)_
- **Headline the differentiators**: equity-comp (RSU/options) + lumpy-income + the closed income→allocate→net-worth loop; make them the onboarding/marketing hook.
- **Planning copilot** (LLM Q&A over your data: "can I afford a $600k house?").
- **Life-event scenarios** (home, child, job change, sabbatical) with side-by-side outcomes.
- **Trends & Year-in-Review** from snapshot history; shareable reports; widgets; weekly digest notifications.
- **Stickiness loop**: notifications + insights + history + goals + linked accounts = daily habit + high switch cost.

---

## Cross-cutting (every phase)
Performance/offline-first · error monitoring + analytics · automated tests + device matrix · accessibility · security/privacy/compliance · CI/release process · App Store assets & ASO.

## Success metrics (are we "top-3"?)
- **Activation:** % completing setup + first expense + first plan.
- **Retention:** D1/D7/D30, monthly active, streak length.
- **Engagement:** transactions logged/wk, insights acted on, linked-account rate.
- **Outcome:** users with a positive savings rate / on-track retirement; net-worth growth.
- **Quality:** crash-free rate, a11y score, store rating, churn.

## Top risks
- **Bank aggregation** cost/complexity & per-region availability (XL, external dep).
- **Tax/regulatory** accuracy per country (needs review per market).
- **Scope vs. focus** — resist building all personas/countries before the US core is genuinely top-3.
- **AI/advice** compliance (disclaimers, no unlicensed advice).

## Execution order (chosen 2026-06-04)
1. **Retirement 2-screen redesign** (1.2) — mock approved, finish it first.
2. **Phase 0 foundations** — i18n/currency plumbing (0.1), tax/account packs (0.2), design system + a11y (0.3), data/migrations (0.4).
3. **Goals module** (1.3).
4. **Security** (0.5) — deploy Firestore rules + encrypt local cache.

_(Rationale captured from product owner; differs from pure leverage-order to ship visible planning value first.)_
