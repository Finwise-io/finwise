# FinWise — Lessons Learned

> A running log of what broke, why, why QA missed it, and the rule we'll follow so it doesn't recur.
> Each entry is written plainly. Reviewed (with the UI design guidelines + data schematics) before
> recommending any fix. Newest first.

---

## L‑5 (2026‑06‑22) — cloud hydration ran on every auth event and clobbered unsynced local changes

**What happened:** Settings → "re‑run setup" → the wizard started, but after a Face ID unlock the app
jumped to **Home instead of setup**.

**Root cause (proven):** `handleRerunOnboarding` correctly calls `restartOnboarding()` (`onboardingComplete:false`)
then routes to `/onboarding`. But `onAuthChange` in `app/_layout.tsx` ran `loadFromCloud(cloudData)` on
**every** fire — and Firebase `onAuthStateChanged` fires again on **token refresh / app resume** (which the
Face ID prompt triggers). At that moment the cloud still had `onboardingComplete:true` (the local reset
hadn't synced), so the reload **overwrote the reset → route guard sent the user Home**. Broader bug:
re‑hydrating on every event clobbers *any* unsynced local change, and could `resetAll()` a brand‑new
account mid‑onboarding.

**Why QA missed it:** resume/token‑refresh behaviour isn't exercised by unit tests; the routing logic is
inside a Firebase effect (no coverage of the hydrate‑then‑refresh sequence).

**Lesson / rule going forward:** **Hydrate from the cloud ONCE per signed‑in user**, not on every auth
event — track the hydrated uid and skip re‑hydration on refresh/resume (re‑hydrate only when the uid
actually changes). Local state is the source of truth within a session; the cloud pull is for first
load / account switch. Never let a background reload silently overwrite unsynced local edits.

---

## L‑4 (2026‑06‑21) — "You're signed in" dead‑end: two signup screens + a routing path that drops users on the onboarding account step

**What happened:** After creating an account *and* after logging back in, the first screen is a pointless **"You're signed in / Let's keep going."** Also, the create‑account screen the user actually used (Name + confirm‑password + strength meter) is **not** the screen changed in fixes 1.1–1.4.

**Root cause (proven in code):**
- **Two account screens exist:** the standalone `AuthScreen.tsx` (polished — Name, email, password + show/hide, **confirm‑password**, strength meter) and the onboarding `account` step in `OnboardingScreen.tsx` (email + show/hide only). The L‑1 "forked form" problem, still live.
- Real account creation happens on **AuthScreen**. AuthScreen's register handler **doesn't navigate** — it relies on the auth listener. On a brand‑new account the listener runs `resetAll()` → `onboardingComplete:false` → the router sends the user to `/onboarding`. Fix **1.1** made onboarding's **first** step `account`; since the user is already signed in, that step renders its `alreadyAuthed` branch → **"You're signed in."** Same after login whenever `onboardingComplete` is false (a freshly‑created account that never finished onboarding).
- So the onboarding `account` step only ever shows "You're signed in" for these users — and 1.1 made it the very first thing they see. **Fix 1.1 (account‑as‑first‑onboarding‑step) was the wrong shape.**

**Why QA didn't catch it:** No test covers cross‑screen **routing** + **auth‑state‑dependent** rendering. The step‑order test only checks the list; the new `onboarding_account` test renders the *unauthenticated* branch (the form), never the authed "You're signed in" branch.

**Did it meet our guidelines?** No — §1.5/§8 (two forked signup forms) and §3.2/§3.4 (a no‑purpose "Let's keep going" step is not a real step).

**Lesson / rule going forward:** Account creation is **ONE screen, ONE entry point** (AuthScreen). **Onboarding = questions only, after auth** — it must not contain an account step. Route unauthenticated users to the single auth screen first, then into questions. The correct shape isn't "account step first in onboarding," it's "auth screen first, then onboarding questions."

---

## L‑3 (2026‑06‑21) — ML Kit makes the app un‑runnable on an Apple‑Silicon iOS Simulator

**What happened:** Local simulator builds **compiled fine** but failed to **install** with *"Failed to find matching arch"* / "Needs to be updated for this version of iOS." The built `.app` binary was **x86_64**, while the Mac and its simulators are **arm64**.

**Root cause (proven):** `@react-native-ml-kit/text-recognition` (receipt OCR) pulls in Google's **ML Kit** pods, which **do not ship an arm64 simulator slice**, so they set `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` (found in `ios/Pods/Target Support Files/MLKitCommon|MLKitVision/*.xcconfig`). That forces the *whole app* to build x86_64 for the simulator — and Apple‑Silicon simulators are arm64 (newer Xcode/iOS dropped Rosetta/x86_64), so nothing can run it. Real iPhones are fine (ML Kit ships arm64 **device** binaries), which is why EAS/TestFlight builds work.

**Why QA didn't catch it:** N/A — local tooling. EAS builds in the cloud for devices and never touches the local simulator.

**Lesson / rule going forward:**
1. **On Apple‑Silicon Macs, don't rely on the local iOS Simulator to verify this app** — ML Kit makes it effectively impossible without removing the library.
2. **TestFlight (a real device) is the verification path** for anything that must run the full native app. (See also L‑2.)
3. A fast local loop would require a **simulator‑only build that stubs out ML Kit** — a deliberate separate task, not worth it for routine UI/flow checks.

---

## L‑2 (2026‑06‑21) — Local simulator build failed: the native `ios/` project went stale after native‑dependency changes

**What happened:** Tried to preview changes in the iOS Simulator. `npx expo run:ios` failed with *"Unable to find a destination matching the provided destination specifier"* — `xcodebuild` listed **no concrete simulators**, only the generic "Any iOS Simulator Device" placeholder. The app that *was* already installed on the simulator turned out to be a stale build from **weeks earlier** (checked the `.app` timestamp).

**Root cause (proven):**
- The local `ios/` folder is generated by **prebuild** and is **gitignored**. After we added/removed **native modules** — Face‑ID (`expo-local-authentication`), the secure‑random crypto polyfill (`react-native-get-random-values`), and removing `@sentry/react-native` — the local `ios/` drifted out of sync with the JS/config. **EAS cloud builds kept working because they regenerate `ios/` from scratch every time; the local copy didn't.**
- A **debug build loads its JS from Metro at runtime.** So a stale native shell + current JS silently mismatch: native modules the JS now needs (e.g. secure random at signup) aren't compiled into the old shell → it crashes in ways that *look* like JS bugs but aren't.
- The very new local **Xcode 26.5** additionally hit a destination‑resolution quirk: targeting a simulator by **device id** failed even though the sim was booted.

**Why QA didn't catch it:** N/A — a local tooling/build issue, not a shipped defect. But it's a **testing trap**: launching the stale app "works" yet doesn't reflect the current code.

**Did it meet our guidelines?** Not a product‑guideline issue — a build‑hygiene one.

**Lesson / rule going forward:**
1. **Any change touching native dependencies → regenerate the native project before a local run:** `npx expo prebuild --platform ios --clean` (+ re‑pod). Never trust the already‑installed simulator app.
2. **Check the installed `.app` build timestamp** (`stat -f %Sm "$(xcrun simctl get_app_container booted <bundleId>)"`) before believing a local test — stale shell + Metro JS is a trap.
3. **Workaround for the Xcode "no concrete simulator destination" quirk:** build with `xcodebuild … -sdk iphonesimulator -derivedDataPath <dir> build`, then `xcrun simctl install booted <app>` + `xcrun simctl launch booted <bundleId>` — sidesteps device‑id destination resolution.
4. **EAS cloud build (TestFlight) is the reliable cross‑check** for anything native, since it always regenerates from scratch.

---

## L‑1 (2026‑06‑21) — Account‑creation module: a second, hand‑rolled signup form drifted from the polished one

**Issues that exposed it:** 1.1 signup buried 3 screens deep · 1.2 no confirm/verify of password · 1.3 no show‑password · 1.4 clunky "Verify your email" step.

**Root cause (proven in code):** There are **two** signup implementations.
- `AuthScreen.tsx` (the standalone login/register screen) is the polished one: it has a **show‑password** toggle, password **confirmation**, an **8‑character** minimum, and friendly error handling.
- `OnboardingScreen.tsx`'s inline `account` step is a **separate, hand‑rolled form**: email + one masked password (**6‑char** min, *no* show‑password, *no* confirmation) + invite code. It was forked from the polished one and silently drifted.
The email step (`modules.tsx` `VerifyEmail`) is a full breadcrumb screen with "I've clicked the link — check" / "Resend" buttons, rather than a simple "email sent — verify when you can" confirmation.

**Why QA didn't catch it:** Our tests are logic/data‑heavy (595 unit tests) plus a render‑smoke that only checks screens *don't crash* — they assert **nothing about signup UX** (no test that the onboarding password field offers show/hide, matches AuthScreen's rules, or that the flow order is sensible). Flow/UX quality isn't covered by any test, and there was no design review gate against the guidelines for the inline form.

**Did it meet our guidelines?** No.
- **UI §1.5 / §8 — "reuse, don't fork; a bespoke style is a smell."** The inline signup is a fork of AuthScreen → it diverged. Direct violation.
- **UI §3.5 — forms: "allow showing the password, indicate requirements upfront."** The onboarding password can't be shown. Violation.
- **Data DR‑4 — "one concept, one definition."** The password minimum is defined twice (6 vs 8) → two policies. Violation.

**Lesson / rule going forward:**
1. **One auth component, used everywhere.** Never hand‑roll a second signup/login form. Onboarding should embed the *same* component AuthScreen uses, so rules + show‑password + validation can't drift.
2. **One password policy** in a single constant, referenced by every form.
3. **Follow signup UX research:** prefer a **show‑password toggle over a confirm‑password field** (removing confirm‑password measurably *raises* conversion); set email‑verify expectations plainly; keep friction minimal.
4. **Add a UX gate:** any new input/flow screen gets reviewed against the UI guidelines before merge — and ideally a lightweight test asserting the key UX affordance (e.g., show‑password present).
