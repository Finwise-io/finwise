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

In App Store Connect, the listing needs:
- 🔴 **Screenshots** — 6.7" (iPhone 15/16 Pro Max) and 6.5". Capture from the simulator: Home, Net Worth, Bill calendar, Retirement, Performance. (Per-persona setups make these look real.)
- 🔴 **Description, keywords, subtitle, promo text** — 🤖 draft below (Appendix A).
- 🔴 **Category** — Finance (primary).
- 🔴 **Privacy Policy URL** + **Support URL** — 🧑 host a page (a simple one is fine).
- 🔴 **App Privacy questionnaire** ("data collected") — 🤖 draft below (Appendix B); 🧑 enter it.
- 🔴 **Age rating** questionnaire — Finance app, no objectionable content → 4+.
- 🟡 **App icon** (1024×1024) + launch screen — confirm present in `app.config.js` assets.

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
5. **Phase 4** QA on the production build → submit

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
