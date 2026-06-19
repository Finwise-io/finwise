# FinWise — QA Execution Report

**Run date:** 2026-06-18 · **Build:** v1.0.1 · **Branch:** `qa/test-plan` · **Engineer:** QA (automated, senior-test-engineer pass)
**Plan executed:** [`docs/finwise-qa-plan.md`](./finwise-qa-plan.md) · **Method:** repo-automatable checks only; device/manual/paid-tool items flagged as backlog.

---

## 1. Executive summary

The financial core is **accurate and now well-guarded**: every hand-computed golden scenario matches the
code to the cent, and the previously-untested calculation functions are now under test. No accuracy defect
was found. The notable risks are **not in the math** — they are **(a) accessibility (zero screen-reader
support)**, **(b) two security-architecture gaps** (privileged API keys can ship in the client bundle; no
auth hardening), and **(c) no crash/error observability**. None of these block a soft launch, but P0/P1
items below should be scheduled before a wide release.

| Tier | Area | Verdict | New tests | Findings |
|---|---|---|---|---|
| 1 | Financial logic & accuracy | ✅ Pass | +23 | 0 defects (gaps closed) |
| 2 | Security & compliance | ⚠️ Gaps | — | F-1 (S2), F-2 (S2), F-3 (S3), F-7 (deps) |
| 3 | UI / accessibility | ❌ Gap | — | F-4 (P0, G-13), F-8 (P1) |
| 4 | AI-code audit | ✅ Pass | (covered) | F-5 (S3, defense-in-depth) |
| 5 | Observability | ❌ Gap | — | F-6 (no crash reporter) |

**Baseline (entry criteria met):** `tsc --noEmit` clean · `jest` **574 passed / 574** (was 551) · 50 suites ·
`npm run test:rules` (Firestore emulator) **pass, exit 0**.

---

## 2. Tier 1 — Financial logic & accuracy ✅

**Result: PASS.** Coverage gaps from the plan (§1) are closed; all golden values reconcile to the cent.

### Tests added (+23, all green)
- **`src/__tests__/golden.test.ts`** — 12 hand-computed golden scenarios (QA-T1-001..012):
  compound FV `$100k @7%×10y = $196,715.14`; Monte-Carlo determinism (`vol=0` collapses to the closed-form
  FV) + **seed reproducibility**; `capitalNeeded` (`$3k/mo net, 30y @3% real ≈ $705,615.84`);
  2026 federal tax (`taxOwed($100k)=$13,170`, marginal 22%, effective 13.17%) + `grossFromNet` inversion;
  loan amortization (`$30k @6%×5y → $579.98/mo`); bond current yield (`450/9,500 = 0.0474`);
  IRS RMD (`$500k/26.5 = $18,867.92`); asset earmarking; blended return.
- **`src/__tests__/edge_extremes.test.ts`** — pure-function boundary matrix (QA-T1-020..027):
  0% real return, guaranteed > spend, bequest PV, $0/negative tax, `grossFromNet` monotonicity,
  0% APR loan, RMD age bounds (72/73/130), $0-value bond → `null`, `retirement_pct` clamp, empty/all-property
  asset sets → fallback (never `NaN`).
- **`src/domain/invariants.test.ts`** — **DR-11 precision guard** (the "$4 income drift" regression):
  `retirementIncomeMonthly` retains full precision so `monthly × 12` reconciles to the annual figure.

### Gaps closed (previously no dedicated test)
`simulate` · `capitalNeeded` · `grossFromNet` · `earmarkedAmount` · `blendedReturn` ·
`portfolioActualReturn` · `investableValue`. *(Note: `solveRetireAge`, `effectiveAnnualContribution`,
`savingsByMonth` were already exercised in `edge_extremes`/`invariants`; `recomputeBalances`/`derive_balance`
— the B-60 data-loss fix — is covered by `store_prices.test.ts` + `portfolio_usecases.test.ts`.)*

### Note on the one "discrepancy" found
`loanPayment($30k,6%,5y)` total interest is **$4,799.04**, not the $4,799.02 in the draft Appendix A. The
**code is correct** (textbook amortization with full-precision payment, rounded at the edge per DR-11); the
draft value came from hand-arithmetic rounding `1.005^60`. Golden table corrected to $4,799.04.

---

## 3. Tier 2 — Security & compliance ⚠️

| Verdict | Item |
|---|---|
| ✅ | **Encryption at rest** — `secureStorage.ts` AES-256, Keychain/Keystore with `enc:` prefix + AsyncStorage fallback; unit-tested (`secureStorage.test.ts`). |
| ✅ | **Firestore rules** — owner/household/invite-code enforced; B-53 privilege-escalation regression covered; emulator suite passes (exit 0). |
| ✅ | **Secrets hygiene** — `.env` is gitignored and **not tracked**; no `sk-ant…`/`ghp_…`/Google keys in tracked source. |
| ✅ | **PII in logs** — no balances/income/SSN/account numbers in `console.*`. |
| ℹ️ | **Firebase Web API key hardcoded** (`firebaseConfig.ts:6`) — **not a vulnerability**: Firebase web keys are public identifiers; security is enforced by Firestore rules. Documented to pre-empt false-positive scanner flags. |

### Findings

**F-1 (S2) — Privileged API keys can ship in the client bundle.** `app.config.js` wires
`ANTHROPIC_API_KEY` and `GOOGLE_VISION_API_KEY` into `expoConfig.extra` (lines 57–58); `economicData.ts`
reads `Constants.expoConfig.extra.ANTHROPIC_API_KEY` and calls `api.anthropic.com` **directly from the
device**. Any key present at build time is baked into the app binary and is extractable — a leaked Anthropic
key bills the developer and can be abused. *Today the feature throws when no key is set, so the exposure
only realizes if a production build supplies the key — but the AI-Tips feature requires it, so this is a real
architectural gap, not a theoretical one.*
**Fix:** proxy the call through a backend (Firebase Function / Cloud Run) holding the key server-side; the
client calls your endpoint, never Anthropic directly. → **P1**.

**F-2 (S2) — No auth hardening.** No biometric app-lock, no session/inactivity timeout, no MFA
(`grep` for `LocalAuthentication`/`biometric`/`sessionTimeout` → none). For an app holding net-worth and
account data, add at minimum a biometric/passcode lock (`expo-local-authentication`) and an inactivity
re-auth. → **P1**.

**F-3 (S3) — Plaintext passwords in AsyncStorage.** `AuthScreen.tsx` keeps a local `accounts` map with
**cleartext passwords** (`saveAccount` line 120, `checkLogin` line 138) in **unencrypted** AsyncStorage,
redundant with the real Firebase auth it also calls. Remove the local mirror and rely on Firebase (or, if a
local cache is truly needed, store only a salted hash via `secureStorage`). → **P1**.

**F-7 (deps) — `npm audit`: 58 advisories (6 high, 51 moderate, 1 low).** Overwhelmingly the
**expo/metro/webpack toolchain** (dev-time, not shipped in the app bundle — e.g. `undici` in build tooling).
**Action:** run `npm audit --omit=dev` to isolate runtime-shipped vulns, then `npm audit fix` the safe set;
schedule Snyk/Dependabot for ongoing triage. → **P2**.

---

## 4. Tier 3 — UI / accessibility ❌

**F-4 (P0, G-13) — Zero accessibility support.** `accessibilityLabel` / `accessibilityRole` /
`accessibilityHint` appear in **0 files** across `src/`. VoiceOver/TalkBack users cannot operate the app;
this is also an App Store / ADA-exposure risk. **Action:** add labels/roles to all interactive elements,
starting with the bottom bar, TopBar chips, and the money-entry sheets. → **P0** (largest UX-compliance gap).

**F-8 (P1) — Remaining UI gaps (backlog):** G-14 sub-44px touch targets, G-16 no privacy-blur on
backgrounding, G-21 no dark mode, G-32 no contrast audit. Text scaling **is** supported (`fontScale.ts`). → **P1/P2**.

---

## 5. Tier 4 — AI-code audit ✅

**Result: PASS — better than typical AI-generated code.**

- ✅ **All third-party imports resolve** (tsc clean → no hallucinated/renamed APIs).
- ✅ **Network calls are guarded:** `marketData.yahooProvider` wraps `fetch` in try/catch → `null` on failure;
  `economicData.fetchEconomicData` uses `Promise.allSettled` with explicit `*IsFallback` flags (graceful
  degradation to fallback economic values); `TipsScreen.runAnalysis` wraps `analyzeExpenses` with tailored
  fallbacks (API-key prompt / "no internet" / **local tips**).
- ℹ️ **F-5 (S3, defense-in-depth):** `analyzeExpenses` has no *internal* try/catch around its `fetch`; it
  relies on its sole caller (TipsScreen) to guard. Add a local catch so a future second caller can't trigger
  an unhandled rejection. → **P2**.
- ℹ️ `parseReceipt` is a **stub** (Google Vision call commented out) — no OCR network call ships. Informational.

---

## 6. Tier 5 — Observability ❌

**F-6 — No crash/error reporter.** No Sentry/Datadog/Crashlytics wired. Production errors are invisible.
**Action:** add Sentry (generous free tier, `@sentry/react-native`) for crash + JS-error capture before wide
release. → **P1**.

---

## 7. Prioritized backlog

| ID | Sev | Tier | Title | Fix | Status |
|---|---|---|---|---|---|
| **F-4** | **P0** | 3 | Zero a11y labels (G-13) | Add `accessibilityLabel`/`Role` to interactive UI | ✅ **Resolved** (shared + high-traffic surfaces); per-screen rollout continues |
| **F-1** | **P1** | 2 | Privileged API keys in client bundle | Backend proxy for Anthropic/Vision | ✅ **Resolved** (keys removed; proxy + Firebase Function shipped) |
| **F-2** | **P1** | 2 | No biometric lock / session timeout / MFA | `expo-local-authentication` + inactivity re-auth | ✅ **Resolved** (app lock + 2-min re-lock; MFA still open) |
| **F-3** | **P1** | 2 | Plaintext passwords in AsyncStorage | Remove local mirror; rely on Firebase | ✅ **Resolved** |
| **F-6** | **P1** | 5 | No crash reporter | Wire Sentry | ✅ **Resolved** (Sentry-ready + global handler) |
| **F-8** | P1/P2 | 3 | G-14/16/21/32 UI gaps | Touch targets, privacy-blur, dark mode, contrast | ⏳ Open (G-14 partially done on buttons/back) |
| **F-7** | P2 | 2 | 58 dep advisories (mostly dev) | `npm audit --omit=dev` + Snyk/Dependabot | ⏳ Open |
| **F-5** | P2 | 4 | `analyzeExpenses` lacks internal try/catch | Add local catch | ⏳ Open (now behind proxy; caller still guards) |

## 7a. Remediation — 2026-06-18 (commits on `qa/test-plan`)

Five findings fixed the same day, each tsc-clean + jest-green (**578 tests**):

- **F-3** (`a3e5aaa`) — deleted the cleartext-password AsyncStorage mirror in `AuthScreen`; auth is
  now Firebase-only, with wrong-password/unknown-email collapsed to one message (anti-enumeration).
- **F-1 + F-6** (`fb87a0b`) — removed `ANTHROPIC_API_KEY`/`GOOGLE_VISION_API_KEY` from bundled
  `extra`; `analyzeExpenses` now calls a configurable `AI_PROXY_URL`; reference proxy shipped at
  `functions/aiTips` (holds the key server-side). `crashReporter.ts` wired into the ErrorBoundary +
  a global `ErrorUtils` handler, Sentry-ready via optional `@sentry/react-native` + `SENTRY_DSN`.
- **F-2** (`fd2e4b0`) — biometric/passcode app lock (`expo-local-authentication`, guarded) with a
  2-minute background re-lock and a Settings toggle that requires auth to enable **and** disable.
- **F-4** (`8b07959`) — accessibility labels/roles/hints on the shared `Button`/`SegmentedControl`/
  `SectionHeader`, the bottom tab bar, the back button, the whole `TopBar`, and the Home landing
  screen; 44pt min touch target on buttons + back.

**Manual activation steps** (need device build / accounts, can't run in CI):
`npx expo install expo-local-authentication @sentry/react-native`; deploy `functions/` (Blaze plan)
and set `AI_PROXY_URL`; set `SENTRY_DSN`. See `functions/README.md`.

**Still open:** MFA (F-2 remainder), remaining a11y gaps G-16/21/32 + per-screen label rollout (F-8),
dep triage (F-7), `analyzeExpenses` internal catch (F-5).

**Set-up-required (paid/manual, not run here):** Snyk + SonarQube (SAST), MobSF (mobile binary scan),
Appium/BrowserStack (device matrix), VoiceOver/TalkBack manual passes. See plan §5.

---

## 8. Exit criteria

| Criterion | Status |
|---|---|
| `tsc --noEmit` clean | ✅ |
| Full `jest` green | ✅ 574/574 |
| Firestore rules pass | ✅ exit 0 |
| Tier-1 gaps closed + golden/edge to the cent | ✅ |
| No open **S1** finding | ✅ none found |
| P0/P1 triaged with owners | ✅ §7 |

**Sign-off:** Tier-1 financial accuracy is **release-ready**. Recommend clearing **F-4 (P0)** and the four
**P1** items before a wide (non-soft) launch. No code accuracy defect outstanding.
