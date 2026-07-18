# Finwise — Quality Assurance Plan

| | |
|---|---|
| **Project** | Finwise (mobile — React Native / Expo) |
| **Version under test** | 1.0.1 (`main` @ git tag `v1.0.1`) |
| **Document version** | 1.0 |
| **Last updated** | 2026-06-18 |
| **Owner** | Engineering (acting QA lead) |
| **Status** | Formal QA artifact — audit-grade. Every check cites a real file/function and maps to a Data-Integrity Rule (DR-#) or UI gap (G-#). |

> **What this is.** The authoritative test strategy for Finwise. It is **risk-tiered** (a finance app
> lives or dies on *accuracy* and *security*), grounded in the app's own governing docs — the 14
> **Data-Integrity Rules** (`finwise-data-schematics.md` §0) and the **UI principles + gap register**
> (`finwise-ui-design-guidelines.md`, `finwise-ui-compliance-audit.md`) — and reconciled with the
> engineering **bug ledger** (`finwise-bug-ledger.md`). It defines *what* we test, *how*, *with what
> tools*, *who owns it*, and *when a release may ship*. Execution results live in a companion
> `finwise-qa-results-<date>.md`.

---

## §0 — Purpose, scope, and how to use this document

### 0.1 Why this exists
The codebase is **largely AI-generated**. AI writes correct-looking "happy-path" code but
systematically under-delivers on: input sanitization, error handling for network/timeout failures,
secure-coding defaults, accessibility, and edge-case math. For a finance app a single rounding error
or a silent balance overwrite is a **trust-ending** defect. This plan exists to find those before
users do.

### 0.2 Risk-tiered scope
Tests are organized by **blast radius**, highest first. A release is gated on the higher tiers.

| Tier | Area | Why it ranks here |
|---|---|---|
| **1** | **Financial logic & accuracy** | A wrong number is the worst failure a finance app can have. |
| **2** | **Security & compliance** | High-value target; AI-code hides vulns; PII/financial data at stake. |
| **3** | **UI/UX, accessibility & functional** | Usable, accessible, correct on real devices; legal a11y exposure. |
| **4** | **AI-code-specific audit** | Hallucinated APIs, missing error handling, complexity bug-nests. |
| **5** | **Pipeline, tooling & observability** | Automation + "know when it breaks in the wild". |

### 0.3 In scope / out of scope
- **In scope:** the RN/Expo app (`src/`, `app/`), domain logic (`src/domain`), persistence/sync
  (`src/store`, `src/services`, `firestore.rules`), and the design-doc principles.
- **Out of scope (this revision):** the separate `finwise-legal` site; native push-notification
  delivery; the Phase-3 multi-currency epic (not yet built); paid backend load testing.

### 0.4 Severity & priority

| Severity | Definition | Example |
|---|---|---|
| **S1 Critical** | Wrong money, data loss, security hole, or crash on a core path. | B-60 (holding wiped a balance); a tax calc off by >$1. |
| **S2 Major** | Incorrect non-money behavior, broken flow, or a real a11y barrier. | Income strip showed $0; no screen-reader labels. |
| **S3 Minor** | Cosmetic, copy, or low-impact inconsistency. | $4 rounding drift; an unlabeled "↻" tag. |

| Priority | Meaning |
|---|---|
| **P0** | Must fix before next release. Release-gating. |
| **P1** | Fix this cycle. |
| **P2** | Backlog; schedule. |

### 0.5 Entry / exit criteria (release gate)
- **Entry to QA:** `tsc --noEmit` clean; full Jest suite green; `npm run test:rules` green; CI green.
- **Exit / ship:** **zero open S1**; no open **P0**; Tier-1 golden + edge suites green to 4 decimals;
  security scan shows no high-severity dependency or secret findings; the **a11y P0 backlog** has a
  dated remediation plan (see §3). Sign-off block (§6.4) completed.

### 0.6 How to read a test case
Each case: **ID · Title · Steps/Method · Expected · Maps-to (DR-#/G-#/B-#) · Severity · Priority ·
Automated?**. IDs are stable for traceability (§6.1).

---

## §1 — Tier 1: Financial Logic & Accuracy *(most critical)*

> **Objective:** prove every monetary calculation is correct to the cent (rates to 4 decimals),
> stable under edge inputs, and never silently corrupts stored state.

### 1.1 Golden-scenario verification ("known-good" set)
Hand-compute each scenario independently (Appendix A holds the full table + formulas), run it through
the real function, and assert equality **to 4 decimal places**. These become a permanent regression
suite (`src/__tests__/golden.test.ts`).

| ID | Function (file) | Scenario | Expected (independent calc) | Maps |
|---|---|---|---|---|
| QA-T1-001 | compound FV via `simulate`/`projectNestEgg` (`domain/retirement`) | $100k, 7%/yr, 10y, no contrib | **$196,715.14** | DR-11 |
| QA-T1-002 | `rmdAtAge` (`domain/decumulation`) | $500k pre-tax, age 73 (ULT 26.5) | **$18,867.92** | DR-11 |
| QA-T1-003 | `rmdAtAge` | $500k, age 75 (ULT 24.6) | **$20,325.20** | DR-11 |
| QA-T1-004 | `loanPayment` (`domain/debt`) | $30k, 6% APR, 5y | monthly **$579.98**, interest **$4,799.04** | DR-11 |
| QA-T1-005 | `currentYield` (`domain/bonds`) | face $10k, 4.5% coupon, value $9.5k | **0.0474** (4.74%) | DR-5 |
| QA-T1-006 | `debtToIncome` (`domain/debt`) | debt $2k/mo, gross $8k/mo, renter | ratio **0.25**, status **caution** | DR-4 |
| QA-T1-007 | `creditUtilization` | balance $3k, limit $10k | **0.30**, status **good** | — |
| QA-T1-008 | `withdrawalPlan` (`domain/decumulation`) | spend $5k/mo, guar $2k/mo, egg $1M | net **$36,000/yr**, rate **0.036**, band **safe** | DR-4 |
| QA-T1-009 | `buildNetWorth` (`domain/networth`) | assets $800k, debt $250k | **$550,000** | DR-1, DR-3 |
| QA-T1-010 | `taxOwed`/`effectiveRateOnGross` (`domain/income/tax`) | gross $100k (std ded $16,100) | from `TAX_BRACKETS` — assert to the cent | DR-4 |
| QA-T1-011 | `payoffPlan` avalanche vs snowball (`domain/debt`) | 2 cards, fixed budget | identical total interest order; debt-free month matches hand-sim | DR-11 |
| QA-T1-012 | `simulate` Monte-Carlo (`domain/retirement`) | seed=42, fixed inputs | **byte-identical** `chance_of_success` on re-run (seeded `mulberry32`) | DR-11 |

### 1.2 Edge-case math matrix
For **every** Tier-1 function, run the boundary set and assert no `NaN`/`Infinity`/throw and a sane
result. Extends `src/__tests__/edge_extremes.test.ts`.

| ID | Input class | Applied to | Expected |
|---|---|---|---|
| QA-T1-020 | **$0** balances / income / spend | net worth, budget, withdrawal, payoff | $0 / "no data" states, no divide-by-zero |
| QA-T1-021 | **Negative** balance / net worth / left-over | `buildNetWorth`, cash-flow, `leftOver` | negative shown correctly, never abs()'d away |
| QA-T1-022 | **Very large** (1e12) | FV, amortization, formatting | no IEEE-754 overflow/precision loss in display |
| QA-T1-023 | **Divide-by-zero** | `creditUtilization` (limit 0), `totalROI` (basis 0), `currentYield` (value 0) | returns 0 / null, never `Infinity` |
| QA-T1-024 | **Rate ≥ 100%** / negative rate | benchmark/return inputs | clamped or handled, projection stays finite |
| QA-T1-025 | **Age boundaries** 72 / 73 / 100 / 120 | `rmdDivisor`, `withdrawalOrder` | 0 before 73; first ULT at 73; clamp ≥100 |
| QA-T1-026 | **Null override** (DR-8) | `expectedReturn=null`, `monthly_payment=null` | derive the default, **never read as 0** |
| QA-T1-027 | **13th month / bad date** | month-bucket inputs (`"YYYY-MM"`) | rejected at the edge (DR-10) |

### 1.3 Coverage-gap register (functions with **no dedicated unit test** today)
Close these in execution (each gets a unit test). Confirmed by coverage exploration:

| ID | Untested function (file) | Risk if wrong | Priority |
|---|---|---|---|
| QA-T1-030 | `simulate()` (`retirement/index.ts:115`) — Monte-Carlo | the headline "chance of success" number | **P0** |
| QA-T1-031 | `capitalNeeded()` (`retirement/index.ts:32`) — amortized corpus | "how much you need" | P0 |
| QA-T1-032 | `solveRetireAge()` (`retirement/index.ts:225`) | "retire at age X" | P1 |
| QA-T1-033 | `blendedReturn()`/`benchmarkReturn()`/`earmarkedAmount()`/`retirementEarmarkedValue()`/`investableValue()`/`portfolioActualReturn()` (`assets/index.ts`) | nest-egg value + projection return | **P0** |
| QA-T1-034 | `grossFromNet()` (`income/tax.ts:47`) — bisection invert | reverse take-home solves | P1 |
| QA-T1-035 | `effectiveAnnualContribution()` (`snapshot.ts:35`) — neg-cash-flow | over-optimistic savings | P1 |
| QA-T1-036 | `savingsByMonth()` (`budget/index.ts:154`) | monthly savings grid | P2 |

### 1.4 Transaction & state integrity (the DR-rule conformance suite)
The data-integrity rules are testable invariants. Each becomes an assertion.

| ID | Rule | Test |
|---|---|---|
| QA-T1-040 | **DR-1 / DR-4** single source / one definition | Net worth equals across TopBar chip, Net Worth screen, Money, snapshot. "Savings rate" / "monthly spend" each have one value. (B-49/B-52 watch.) |
| QA-T1-041 | **DR-3** derive-don't-store | No calculated field (`net_worth`, `nest_egg`, ratios) is persisted in the store/Firestore shape. |
| QA-T1-042 | **DR-11** precision | No round-then-multiply; assert `loanPayment`, income-grid, MC use full precision then round once. |
| QA-T1-043 | **DR-14** audit-don't-overwrite | A debt payment / balance change writes a `Transaction` (ledger) and never silently mutates a stored balance with no record. (Cousin of B-60.) |
| QA-T1-044 | **DR-8** null = derive-default | nullable assumptions fall back to computed value, not 0. |
| QA-T1-045 | **DR-9** seed-once | Re-seeding from onboarding replaces only `origin:'onboarding'` rows; user-added/edited rows survive. |
| QA-T1-046 | **B-60 regression** | Adding a tracked holding to a manual-balance account never collapses the balance to the holding (the `derive_balance` flag). |
| QA-T1-047 | **Interruption / persistence** | Force-close mid-write; on relaunch the encrypted store loads or cleanly resets — never a half-written/limbo state. Encryption **fallback** path (`secureStorage.ts` SecureStore→AsyncStorage) preserves/zeroes safely. |

---

## §2 — Tier 2: Security & Compliance

> **Objective:** financial data + PII are encrypted, access-controlled, never leaked, and the AI-code
> has no obvious injection/secret/dependency holes. Assume hidden vulnerabilities until proven absent.

| ID | Check | Current posture (evidence) | Target | Tool | Pri |
|---|---|---|---|---|---|
| QA-T2-001 | **Encryption at rest** | ✅ AES-256, key in Keychain/Keystore via `expo-secure-store`, whole store encrypted, `enc:` prefix (`store/secureStorage.ts`) | Verify key never in plaintext storage; fallback path can't silently downgrade in prod | manual + unit | P0 |
| QA-T2-002 | **Firestore rules** | ✅ owner + household + invite-code; B-53 escalation closed (`firestore.rules` + `firestore.rules.test.cjs`, 8 emulator tests) | Keep emulator suite green in CI; add tests for any new collection | jest + emulator | P0 |
| QA-T2-003 | **Secrets / env** | ⚠️ `.env` gitignored; Anthropic/Vision via `extra`; **Firebase client key hardcoded but public-by-design** (`firebaseConfig.ts`) | No *private* secret in source; CI secret-scan on every push | **gitleaks**, `git secrets` | P0 |
| QA-T2-004 | **PII / logging** | ✅ no balances/PII in `console.*`; only error/stack/config logs | Lint rule to forbid logging PII; **no crash reporter wired (gap)** | grep + ESLint rule | P1 |
| QA-T2-005 | **Dependency vulns** | not yet scanned | 0 high/critical | **`npm audit` (CI)** + **Snyk** | P0 |
| QA-T2-006 | **SAST (static)** | none | clean high-severity | **SonarQube** / Semgrep OSS | P1 |
| QA-T2-007 | **Mobile binary scan (DAST-ish)** | none | no insecure storage/transport flags | **MobSF** (OSS) on the EAS build | P1 |
| QA-T2-008 | **Auth hardening** | ⚠️ email/password + persistent session only (`services/firebase.ts`) | **biometric (Face ID), session/inactivity timeout, app-lock, MFA** | `expo-local-authentication` | **P0 (biometric+lock)** |
| QA-T2-009 | **Input sanitization** | ⚠️ loose `parseFloat`; **CSV import has no format/length/dup validation** (`BudgetScreen` `importFromCSV`) | bound lengths, validate dates, reject malformed rows, cap row count | unit + fuzz | P1 |
| QA-T2-010 | **Transport security** | Firebase SDK over TLS; Yahoo/BLS/Treasury fetches | enforce HTTPS only; handle cert/timeout failures (→ §4) | manual + unit | P1 |

**Compliance note.** US consumer-finance context: even pre-bank-feed, treat balances/SSN-adjacent
inputs as regulated PII. Document data-retention + delete-all (exists) and add **data export** (G-28,
a user data-right) to the roadmap.

---

## §3 — Tier 3: UI/UX, Accessibility & Functional *(maps to the UI Design Guidelines)*

> **Objective:** correct, usable, and **accessible** on real devices; conforms to the written UI
> principles. Accessibility is the single largest open risk and a legal exposure.

### 3.1 Accessibility (WCAG 2.1 AA) — the biggest gap
| ID | Check | Posture | Target | Maps | Pri |
|---|---|---|---|---|---|
| QA-T3-001 | **Screen-reader labels** | ❌ **0 `accessibilityLabel`/`Role`/`Hint` in the entire `src/`** | VoiceOver/TalkBack reads every balance, button, error, chart value | **G-13** | **P0** |
| QA-T3-002 | **Touch targets ≥44×44** | ⚠️ `hitSlop` 6–14px; most targets sub-44 | grow elements (some Home rows already 44+) | **G-14** | P0 |
| QA-T3-003 | **Contrast (AA)** | not audited; light-only | text + data-viz pass AA | **G-32** | P1 |
| QA-T3-004 | **Beyond color** | ✅ status pairs icon+label (✓/⚠️, ▲/▼) | keep; verify on new screens | **G** §5.1 | P1 |
| QA-T3-005 | **Text scaling** | ✅ Default/Large/Larger (`fontScale.ts`) | layout survives 1.3× without clipping | §1.2 | P1 |
| QA-T3-006 | **Privacy-blur / hide balances** | ❌ absent | a hide-balances toggle (sensitive on shoulder-surf) | **G-16** | P1 |
| QA-T3-007 | **Dark / high-contrast** | ❌ light-only (`userInterfaceStyle:'automatic'` but no dark styles) | token-swap dark + high-contrast | **G-21** | P2 |

### 3.2 UI-principle conformance (from the guidelines)
| ID | Principle | Check |
|---|---|---|
| QA-T3-020 | **§1.1 color carries meaning** | green=reassure, amber=heads-up, red=true-alert-only; no decorative status color. |
| QA-T3-021 | **§2.4 plain-language errors** | no error codes; every failure is recoverable + reassuring ("your data is safe"). |
| QA-T3-022 | **§4.4 never shame** | overspend framed amber as a heads-up, never red "you failed". |
| QA-T3-023 | **§3.1 progressive disclosure** | Simple vs Advisor genuinely simplifies; one verdict first. |
| QA-T3-024 | **§7 one term per concept** | take-home / nest egg / spending / left-over used consistently (B-52 watch). |

### 3.3 Functional & device
| ID | Check |
|---|---|
| QA-T3-040 | **Device fragmentation** — small (SE) → large (Pro Max), notch/safe-area, thumb-zone reachability. |
| QA-T3-041 | **State management** — background→foreground refreshes data; sensitive state handled on resume; (with QA-T2-008) re-auth/app-lock on resume. |
| QA-T3-042 | **Offline / sync** — graceful offline (queue + sync); no data loss; quiet status (G-20/G-25 gaps). |
| QA-T3-043 | **Core journeys (E2E)** — onboarding→Home; add income/expense + edit + delete-undo; set budget; log a debt payment; run a retirement scenario; add a bond (institution + double-count prompt). |

---

## §4 — Tier 4: AI-Code-Specific Audit

> **Objective:** catch the failure modes LLM-written code is prone to.

| ID | Audit | Method | Pri |
|---|---|---|---|
| QA-T4-001 | **Hallucinated / deprecated APIs** | Verify every third-party import resolves to a real, current API. Known suspects: `Swipeable` (deprecated in gesture-handler 2.x → migrate to `ReanimatedSwipeable`), date APIs, expo modules vs installed versions (`expo-doctor`). | P1 |
| QA-T4-002 | **Missing error handling** | Grep `src/services/*` for `fetch`/network calls; each needs try-catch + a typed fallback (prices→cost-basis fallback exists; verify BLS/Treasury/OCR/Firebase). "Happy-path-only" = a finding. | **P0** |
| QA-T4-003 | **Network timeout / retry** | Every external call has a timeout + offline fallback; no infinite spinner. | P1 |
| QA-T4-004 | **Complexity hotspots** | Flag deeply nested logic (the retirement cockpit, the income grid) for review/refactor; high complexity = bug nest. | P2 |
| QA-T4-005 | **Dead/orphan code & TODOs** | unused exports, `@deprecated` (legacy `debts` array B-42), leftover scaffolding. | P2 |
| QA-T4-006 | **Type-safety escapes** | audit `as any` casts (store is `as any`) for masked type bugs. | P2 |

---

## §5 — Tier 5: Test Pipeline, Tooling & Observability

### 5.1 Pipeline (current → target)
| Phase | Focus | Today | Best-in-class target (cost/ROI) |
|---|---|---|---|
| **Unit** | business logic, math | ✅ Jest, 1201 tests (2026-07-18), `ci.yml` | keep; add coverage gate (e.g. 80% on `domain/`) |
| **Static / SAST** | secure-coding, smells | ❌ | **Snyk Code** (paid, ~$25/dev/mo — best vuln DB) + **SonarQube** (Community free / Cloud paid) + Semgrep OSS (free) |
| **Dependency** | CVEs | ❌ | **`npm audit`** (free, CI) + **Snyk Open Source** (free tier ok) |
| **Mobile binary** | insecure storage/transport | ❌ | **MobSF** (free, OSS) on EAS builds |
| **Integration** | API + store/db | ✅ store + rules-emulator tests | add Postman/Newman for any future REST |
| **E2E** | critical journeys | 🟡 Maestro smoke only | **Maestro** (free) on **BrowserStack/Sauce App Live** (paid device cloud, ~$30–200/mo) for fragmentation |
| **Observability** | client crashes + API errors in the wild | ❌ **none** | **Sentry** (free tier → ~$26/mo) *recommended first* for RN crash + breadcrumbs; **Datadog RUM** (paid) if scaling |

> **Pro-tip (founder's note, endorsed):** in finance, **observability is QA**. Wire **Sentry** before
> a public launch so a crash in the wild ties to an exact line + the user's last actions (PII-scrubbed).

### 5.2 CI additions (to `ci.yml`)
- `npm audit --audit-level=high` as a job (fail on high/critical).
- **gitleaks** secret scan on push/PR.
- Coverage report + threshold on `src/domain`.
- (Later) Maestro flow on a device-cloud runner.

---

## §6 — Traceability, RACI, backlog, sign-off

### 6.1 Traceability matrix (excerpt — full set is the QA-ID column above)
| Requirement / Rule | Test ID(s) | Owner | Status |
|---|---|---|---|
| DR-1/DR-4 single source | QA-T1-040 | Eng | partial (B-49/B-52 open) |
| DR-11 precision | QA-T1-004, -012, -042 | Eng | to add |
| DR-14 audit ledger | QA-T1-043 | Eng | to add |
| Encryption at rest | QA-T2-001 | Eng | met |
| Firestore rules | QA-T2-002 | Eng | met (CI) |
| Biometric + app-lock | QA-T2-008 | Eng | **gap (P0)** |
| Screen-reader a11y | QA-T3-001 | Eng/Design | **gap (P0)** |
| Error handling (services) | QA-T4-002 | Eng | to audit |
| Crash observability | §5.1 | Eng | **gap** |

### 6.2 RACI
| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Tier-1 math tests | Eng | Founder | — | — |
| Security scan + rules | Eng | Founder | (security advisor) | — |
| Accessibility remediation | Eng | Founder | Designer | — |
| Release sign-off | Founder | Founder | Eng | — |

### 6.3 Prioritized backlog (rolls up the QA-IDs)
- **P0:** QA-T1-030/-033 (untested core calcs), QA-T1-043/-046 (ledger/B-60), QA-T2-003/-005/-008
  (secrets/deps/biometric+lock), QA-T3-001/-002 (screen-reader, targets), QA-T4-002 (error handling).
- **P1:** QA-T1-031/-032/-034/-035, QA-T2-006/-007/-009, QA-T3-003/-006, QA-T4-001/-003, Sentry.
- **P2:** QA-T1-036, QA-T3-007, QA-T4-004/-005/-006, dark mode, data export (G-28).

### 6.4 Sign-off
| Role | Name | Gate met? | Date |
|---|---|---|---|
| QA lead (Eng) | | ☐ entry ☐ exit | |
| Product / Founder | | ☐ approve ship | |

---

## Appendix A — Golden-scenario data tables (independently computed)

> Each row: inputs → **expected output** (hand/spreadsheet-computed) the code must match to 4 dp.
> Encoded as `src/__tests__/golden.test.ts`.

### A.1 Compound growth (no contributions) — `FV = P·(1+r)^n`
| P | r | n | Expected FV |
|---|---|---|---|
| 100,000 | 0.07 | 10 | **196,715.1357** |
| 250,000 | 0.05 | 20 | **663,324.0794** |
| 50,000 | 0.10 | 30 | **872,470.1130** |

### A.2 RMD — `balance ÷ IRS ULT divisor`
| Pre-tax balance | Age | ULT divisor | Expected RMD |
|---|---|---|---|
| 500,000 | 73 | 26.5 | **18,867.92** |
| 500,000 | 75 | 24.6 | **20,325.20** |
| 1,000,000 | 80 | 20.2 | **49,504.95** |
| 250,000 | 72 | — (none) | **0.00** |

### A.3 Loan amortization — `M = P·r / (1−(1+r)^−n)`, r = APR/12, n = years·12
| Principal | APR | Years | Monthly | Total interest |
|---|---|---|---|---|
| 30,000 | 0.06 | 5 | **579.98** | **4,799.04** |
| 250,000 | 0.045 | 30 | **1,266.71** | **206,016.78** |
| 5,000 | 0.1999 | — (min-pay) | `payoffPlan` neverPaysOff at low min → flagged | — |

### A.4 Bond current yield — `annual coupon ÷ value`
| Face | Coupon | Value | Annual coupon | Current yield |
|---|---|---|---|---|
| 10,000 | 0.045 | 9,500 | 450.00 | **0.0474** |
| 10,000 | 0.03 | 10,500 | 300.00 | **0.0286** |

### A.5 Net worth / DTI / utilization / withdrawal
| Function | Inputs | Expected |
|---|---|---|
| `buildNetWorth` | assets 800,000; debt 250,000 | **550,000.00** |
| `debtToIncome` | debt 2,000/mo; gross 8,000/mo; renter | ratio **0.25**, **caution** |
| `creditUtilization` | balance 3,000; limit 10,000 | **0.30**, **good** |
| `withdrawalPlan` | spend 5,000/mo; guar 2,000/mo; egg 1,000,000 | net **36,000**, rate **0.036**, **safe** |
| `withdrawalPlan` | spend 5,000/mo; guar 2,000/mo; egg 500,000 | rate **0.072**, **high** |

### A.6 Tax (verify against `TAX_BRACKETS`, std deduction 16,100)
| Gross | Taxable | Expected `taxOwed` | Effective rate |
|---|---|---|---|
| 100,000 | 83,900 | *compute from code brackets — assert to the cent* | — |
| 0 | 0 | **0.00** | **0** |
| 16,100 | 0 | **0.00** | **0** |

> A.6 values are intentionally left to be captured from a verified run of `taxOwed` (the 2026 bracket
> constants live in `src/domain/income/tax.ts`); the test pins them so any future bracket edit is a
> deliberate, reviewed change.

---

## §7 — Navigation & Auth-Flow Contract  *(added 2026-06-21 after L-1/L-4)*

**Why this section exists.** The two account-creation defects (L-1 forked signup form; L-4
"You're signed in" dead-end) both slipped through because our tests are **logic-heavy + a render
"doesn't-crash" smoke** — *nothing* asserted **cross-screen routing** or **auth-state-dependent
rendering**. A user-journey can be broken while every unit test is green.

**New exit-criteria for any change that touches auth, onboarding, or routing:**

1. **Routing is a pure, tested function.** Navigation decisions live in `src/navigation/routeGuard.ts`
   (`nextRoute(state)`), not inline in `app/_layout.tsx`. Every state combination
   (`user × onboardingComplete × onboardingPaused × segment`) is asserted in
   `routeGuard.test.ts`. Adding a route group or auth state → add a row to that matrix.
2. **One account screen.** Account creation/login exists **only** in `AuthScreen.tsx`. No screen may
   hand-roll a second signup/login form (DR-4, UI §1.5/§8). `auth_register.test.tsx` pins its UX
   affordances (name, confirm-password, show/hide, strength, invite code).
3. **Flow screens assert intent, not just "renders".** A new step/screen needs at least one test of
   the user-visible affordance or the *absence* of a wrong one (e.g. `onboarding_flow.test.tsx`
   asserts onboarding shows the first question and **no** account form / dead-end).
4. **Dead-end check.** No reachable screen may render a terminal state with no forward action. The
   "alreadyAuthed → You're signed in" branch is the cautionary example.
5. **On-device verification.** Native/runtime behaviour (auth, crypto, routing after signup) is
   verified on **TestFlight**, not the local simulator (ML Kit blocks it on Apple Silicon — L-3).

**Definition of Done for an auth/onboarding/routing change:** `tsc` clean · full `jest` green ·
routeGuard matrix updated · one flow/affordance test added or updated · TestFlight build smoke-tested
on a real device for the specific journey changed.
