# FinWise — Launch Checklist

Step-by-step to get from "feature-complete" to "live on the App Store."
**Owner:** 🧑 = you (account/legal/manual) · 🤖 = Claude can do it in-repo.
**Status:** 🟢 done · 🔴 blocker (can't ship without it) · 🟡 recommended · ⚪ optional.

Current build facts (verified in repo): app `co.finwise.app`, version `1.0.0`, EAS production +
submit configured, App Store Connect app exists (`ascAppId 6773866960`, Apple ID
`blahblahnynj@gmail.com`), Firestore rules written, 183 tests, full-screen smoke test passed.

---

## Phase 0 — Already done 🟢
- 🟢 App config, bundle id, version (`app.config.js`)
- 🟢 EAS build + submit profiles (`eas.json`)
- 🟢 App Store Connect app record created
- 🟢 Firestore security rules **written** (`firestore.rules`) — *not yet deployed (see 1.2)*
- 🟢 Encrypted on-device storage + cloud sync, email/password auth + recovery
- 🟢 Clean `PriceProvider` seam (`src/services/marketData.ts`) so the data vendor is a one-file swap
- 🟢 183 unit tests green · all 22 screens render (smoke test)

---

## Phase 1 — Hard blockers (must clear before submitting) 🔴

### 1.1 Swap market-data to a licensed vendor 🔴 🧑→🤖
**Why:** dev uses the **unofficial Yahoo endpoint** (`query1.finance.yahoo.com`), which is **not licensed for a commercial app**. This is a legal blocker, not a code one.
**You:** pick a vendor + get an API key. End-of-day/delayed data is cheap (~$10–50/mo); real-time triggers costly exchange agreements you don't need for this app.
- Tiingo · EODHD · Alpha Vantage · Twelve Data (all have commercial EOD tiers). Confirm commercial terms + any required attribution.
**Claude (once you have the key):** add a new `PriceProvider` in `src/services/marketData.ts` mirroring `yahooProvider`, make it the default in `fetchPriceSeries`, and read the key from `app.config.js → extra` (set as an EAS secret for builds). Domain + UI need **no changes** (that's the whole point of the seam).
**Done when:** Performance/Net Worth prices load from the licensed source and the Yahoo provider is gone.

### 1.2 Deploy Firestore security rules 🔴 🧑
**Why:** rules are written but **not deployed** — until they are, your database access is wide open.
```
firebase deploy --only firestore:rules
```
**Done when:** the rules show as active in the Firebase console and a logged-out client is denied reads/writes.

### 1.3 Production native build (activates OCR + keychain) 🔴 🧑
**Why:** Receipt OCR (`@react-native-ml-kit/text-recognition`) and keychain-backed encryption
(`expo-secure-store`) are **native modules** — they only run in a real build, not Expo Go. They have
safe fallbacks today, but you must verify them in a production build.
```
# test locally first (optional):
npx expo run:ios --configuration Release
# then the real build:
eas build --platform ios --profile production
```
**Done when:** a production build installs, receipt scan reads a real receipt, and secure storage works.

---

## Phase 2 — App Store submission package 🔴 🧑 (🤖 drafts copy)

**📄 Full listing copy + screenshots plan: `docs/finwise-appstore-listing.md`** (supersedes Appendix A).

In App Store Connect, the listing needs:
- 🔴 **Screenshots** — 6.9" iPhone (primary) + optional 6.5". **Capture on a REAL device, NOT the
  Simulator** (the app can't run on the Simulator — ML Kit). 8 frames with captions + per-persona setup
  are specified in the listing doc.
- 🔴 **Description, keywords, subtitle, promo text** — drafted in `docs/finwise-appstore-listing.md`.
- 🔴 **Category** — Finance (primary).
- 🔴 **Privacy Policy URL** + **Support URL** — 🧑 host a page (a simple one is fine).
- 🔴 **App Privacy questionnaire** ("data collected") — 🤖 draft below (Appendix B); 🧑 enter it.
- 🔴 **Age rating** questionnaire — Finance app, no objectionable content → 4+.
- 🟡 **App icon** (1024×1024) + launch screen — confirm present in `app.config.js` assets.

---

## Phase 2.5 — App Review compliance (added 2026-06-19) 🔴

Two requirements that get finance apps **auto-rejected** are now handled in code; three matching
manual steps remain on your side.

**Done in-repo 🟢🤖:**
- 🟢 **In-app account deletion** — Settings → Account → **Delete account** (re-asks password, erases the
  user's cloud data + login, signs out). Required by App Store Guideline 5.1.1(v).
- 🟢 **Apple Privacy Manifest** — `app.config.js → ios.privacyManifests` (generated into the build).
  Declares: no tracking; email, name, financial info, crash/performance data — all for app
  functionality, none for tracking.

**Your three to-dos 🔴🧑:**
- 🔴 **Match the App Privacy "nutrition label" in App Store Connect to the manifest.** Apple compares
  the two. In the App Privacy section, declare you collect **Email, Name, Financial Info,** and
  **Crash/Diagnostics** — each marked "used to run the app" and **not** "used to track you." (This
  supersedes Appendix B below.)
- 🔴 **Create a demo login for Apple's reviewer.** Make a real account (email + password) with some
  sample data, and paste those credentials into the "Notes for the reviewer" box when you submit —
  otherwise they can't get past the login screen and will reject.
- 🔴 **Test the Delete-account button on a real production build** (not the dev app) to confirm it
  fully removes the account and data end-to-end before you submit.

---

## Phase 2.6 — Independent launch review findings (added 2026-06-23) 🔴

From the Principal-PM launch review (`docs/finwise-launch-review.md`). **All must be addressed before
we ship.** Grounded in current US fintech standards (sources in the review doc).

### 🔴 Blockers

- 🟢 🤖 **B-L1 — Reconcile the privacy claim with the AI-tips data path. DONE (Option A, commit 945f929).**
  Tips now compute **on-device only** (dropped the Anthropic `analyzeExpenses` call); Add-expense OCR
  routed to **on-device ML Kit** (dropped the Google Vision cloud call). No financial data or receipt
  images leave the device for AI. Claim updated + scoped: _"encrypted — even we can't read it — and
  never sent to AI or LLM providers,"_ shown (in a larger font) in the recovery modal, Settings, and
  Tips; privacy policy reconciled (`docs/privacy/index.html`). Static guard test blocks re-wiring the
  cloud paths into a screen. _Cloud AI remains in-repo, dormant, for a future opt-in feature._
  **🧑 Remaining:** re-host the updated `docs/privacy/index.html` at the live Privacy Policy URL.
- 🟠 🧑 **B-L2 — Wire production crash reporting. CODE PRE-STAGED (f43819e).** crashReporter is DSN-ready
  (+ fixed a latent bug where it never actually reported), sends no PII beyond the uid, and Settings →
  "Send a diagnostic report" triggers a test event; privacy policy discloses Sentry. **Remaining 🧑:**
  per `docs/finwise-sentry-setup.md` — create the Sentry project, `npx expo install @sentry/react-native`,
  send me the DSN + org/project (I finish the 1-line activation + plugin), set the auth-token secret,
  rebuild. **Done when:** the test event appears in the Sentry dashboard from a production build.
- 🟢 🤖 **B-L3 — Disclaimer at every projection / "on-track" verdict. DONE (bb68bad).** New shared
  `<Disclaimer/>` component added to the five judgment screens that lacked it (Retirement, Analytics,
  Home, StressTest, JobSafety); Cockpit/Tax/Credit/Estate already had it. The one imperative ("you must
  withdraw" — an RMD) reworded to the factual "the IRS requires a withdrawal." Coverage guard test bans
  re-introducing advice imperatives or dropping the disclaimer from a judgment screen.
- 🟢 🤖 **B-L4 — Graceful network degradation. DONE (verified, no code change).** On inspection every
  wired network path already degrades gracefully: prices use `Promise.allSettled` + try/catch → null and
  the store keeps its cache on failure; the econ feed uses `allSettled` + fallback constants + flags (and
  isn't even wired — inflation is a static default). The feared crash can't occur; existing tests prove
  it (`marketData.test`, `economicData.test`, `store_prices.test` offline cases).

### 🟠 Important (before launch)

- 🟠 🤖 **Verify the bug ledger is clean** — confirm no `open`/`by-design?` row in
  `docs/finwise-bug-ledger.md` is a user-facing money error.
- 🟠 🧑 **Run the Maestro flows on a real device** (`auth-signup`, `smoke`, `b21-add-sheet`, `nw-donut`,
  `cashflow`) — selectors have never executed on-device (ML Kit blocks the simulator).
- 🟠 🧑 **Prep the App Review note:** "informational/educational planning tool — no money movement, no
  account linking, no securities recommendations" (de-risks the fintech-licensing guideline).

### 🟡 Positioning (decide explicitly)

- 🟡 🧑 **Scope launch as US-only** — the app is USD-only (currency picker removed) despite the "every
  country" objective. Don't market global; GLBA/state-privacy posture assumes US.
- 🟡 🧑 **Track onboarding completion as the #1 launch metric** — manual entry (no account linking) is the
  privacy differentiator and the churn risk.

---

## Phase 3 — Optional (post-v1 unless you want them now) ⚪
- ⚪ **Plaid bank linking** — biggest stickiness lever, but needs Plaid keys + a small backend (Cloud Function) to hold the secret. Out of scope for a v1 manual-entry launch.
- ⚪ **Push notifications** — plugin is configured; needs APNs setup + reminder logic.

---

## Phase 4 — Final pre-submit QA 🔴 🧑
- 🔴 Run a **clean onboarding for each persona** (student / variable-income / professional / retiree) using `docs/finwise-user-guide.md` as the script — confirm the numbers reconcile.
- 🔴 Confirm prices load from the **licensed** provider (not Yahoo).
- 🔴 Sign up → log out → recover account → log back in.
- 🟡 Test on a physical device (gestures, keyboard, safe-area, large text).
- 🔴 `eas submit --platform ios --profile production` → TestFlight → submit for review.

---

## Critical path (shortest route to "submitted")
1. **1.1** licensed data vendor (you pick/pay → Claude wires) ← the long pole
2. **1.2** deploy Firestore rules (one command)
3. **1.3** production build (verifies OCR + keychain)
4. **Phase 2** listing (Claude drafts copy → you add screenshots + privacy/support URLs)
5. **Phase 2.6** independent-review blockers (B-L1 AI/privacy · B-L2 crash reporting · B-L3 disclaimers · B-L4 network degradation)
6. **Phase 4** QA on the production build → submit

Everything else (Plaid, push) is post-launch.

---

## Appendix A — App Store listing copy (draft 🤖 — review before use)

**App name:** FinWise — Money, simplified
**Subtitle (30 chars):** Budget, net worth & retire
**Promo text (170):** Your whole financial life in one place — track spending, see your net worth, plan retirement, and know exactly when money will be tight. Built for real life, not spreadsheets.

**Keywords (100 chars):** budget,net worth,retirement,savings,debt,bill calendar,cash flow,credit,portfolio,finance,money

**Description (draft):**
> FinWise meets you where you are. Whether you're a student living on a part-time paycheck, a server whose income changes week to week, a professional juggling salary and stock, or a retiree making savings last — FinWise turns your real numbers into clear, honest answers.
>
> • Bill calendar & cash flow — see when money lands, when bills hit, and the months you'll be short.
> • Net worth — every account and debt in one picture, with an emergency-fund runway.
> • Budget — track income and spending, prioritize the bills that matter most.
> • Goals & debt — save toward what matters and find the fastest way out of debt.
> • Retirement — will your money last? Plan with real market simulations.
> • Investments — track your portfolio against the market and see the tax of selling.
> • Build credit — understand your utilization and the habits that raise your score.
>
> Simple mode keeps it friendly; Advisor mode shows the full detail. Your data is encrypted and private.
>
> FinWise provides general information, not financial advice.

---

## Appendix B — App Privacy ("data collected") draft 🤖
- **Financial info** (accounts, balances, income) — stored for app functionality; linked to the user; not used for tracking.
- **Contact info** (email) — for account/auth; linked to the user.
- **Identifiers** (user id) — app functionality.
- **No** data used for third-party advertising or tracking.
*(Confirm against your actual Firebase/analytics usage before submitting.)*
