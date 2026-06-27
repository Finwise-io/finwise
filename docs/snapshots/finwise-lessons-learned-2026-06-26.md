# FinWise — Lessons Learned

> A running log of what broke, why, why QA missed it, and the rule we'll follow so it doesn't recur.
> Each entry is written plainly. Reviewed (with the UI design guidelines + data schematics) before
> recommending any fix. Newest first.

---

## L‑10 (2026‑06‑26) — A "loop" was the route guard bouncing a screen that wasn't on its allow‑list

**What happened:** On device, tapping "Cash‑flow detail →" appeared to loop straight back to Home (test
T22). It wasn't a navigation cycle in the screen — the global auth route guard runs on every screen change
and `router.replace()`s any top‑level segment **not** in its `MODAL_SEGMENTS` allow‑list back to Home.
`cashflow` was never added to that list, so the push to `/cashflow` was instantly reversed. The brand‑new
`/contribution-room` screen had the identical latent bug and would have looped the same way.

**Why QA missed it:** unit tests covered the *known* branches of the guard, but nothing asserted that
*every* navigable screen is allow‑listed — so a screen could be added to `app/` and wired to a button
without anyone noticing the guard would reject it.

**The rule:** an allow‑list guard needs a test that enumerates the **whole set it's supposed to cover**, not
just sampled members. Added a filesystem test: every `app/*.tsx` root route (minus auth/onboarding) must be
in `MODAL_SEGMENTS`, or the test fails. **Generalise:** when a guard silently *redirects* on an unknown
input, a missing entry looks identical to "working" — pin the complete set, and treat any new screen as
also requiring a guard entry. (B‑89)

## L‑9 (2026‑06‑26) — A controlled number input that parses on every keystroke can't accept a decimal

**What happened:** On the Add‑holding form, "Cost / share" and "Shares" silently refused decimals — typing
`10.` immediately became `10`. The field ran `num(text)` on every keystroke and wrote the parsed **number**
back to the controlled `value`; the moment you typed the ".", the parse dropped it and the controlled value
re‑rendered without it, so you could never reach `10.5`.

**Why it's sneaky:** the field *looks* fully wired (keyboardType="decimal-pad", value bound, onChange bound)
and works for whole numbers — only fractional entry exposes it.

**The rule:** for free‑form numeric input, **keep the raw text in state while editing and parse only on
save** (or buffer the raw string alongside the parsed number). Never round‑trip the displayed value through
a number parser on each keystroke. Also: format *displayed* counts to a sane precision so float drift never
shows ("965.0000001" → "965"). (B‑81)

## L‑8 (2026‑06‑26) — Free‑tier EAS iOS build quota is scarce near launch; don't spend it on checkpoints, and local builds can't bail you out on macOS 26

**What happened:** Mid‑session we cut build #34 as a "verify these now" checkpoint while more fixes were
still in flight. It used the **last free iOS build of the month**, so build #35 — which had the full fix set
*and* the critical T22 fix — was blocked until the quota resets (~the 1st). The fallback, `eas build
--local`, **compiles fine but fails to import the distribution certificate into the keychain on macOS 26**
("…hasn't been imported successfully") — confirmed across two attempts and an eas‑cli upgrade. So once the
cloud quota is gone there's currently **no way to produce a device‑testable build** until the reset.

**The rule:** treat each free iOS build as scarce near launch — **batch all fixes into ONE build**; before
cutting, confirm it's the last needed for the batch. If asked to "cut a build then keep going," flag that it
may spend the only remaining build and block a follow‑up. (`eas submit` is *separate* from the build quota.)
Also: the local‑build escape hatch is unreliable on current macOS — don't count on it for distribution
signing — see L‑3 (ML Kit / Apple‑Silicon Simulator) below for the related "test on a real device" rule.

---

## L‑7 (2026‑06‑23) — "Take‑home" showed two different numbers on two screens; my agreement tests were intra‑domain, not cross‑screen

**What happened:** A user testing on device found the income recap showed **$22,990/mo** take‑home while
the spending‑plan screen showed **$24,490** — a $1,500 gap = their 401(k). The spending plan used
`monthlyIncome` (net of tax, **before** 401(k)); the income screen used after‑401(k). Same word
"take‑home," two definitions — the exact "defined two ways" class I'd claimed to have audited. It also
let the budget allocate against money that's actually locked in the 401(k).

**Why QA / the dedup audit missed it:** my agreement tests verified the new canonical path reconciled
with *itself* (`annualCashflow ≡ Σ savingsByMonth`) — never that the **rendered** take‑home number on
screen A equals the one on screen B. The two screens call different helpers; nothing pinned them equal.
A stale code comment even *claimed* they agreed. The audit keyed on one helper and didn't notice a
second screen bypassed it. And I can't run the app, so cross‑screen number comparison fell to manual.

**Lesson / rule going forward:** agreement tests must assert the **rendered number is identical across
every screen that displays a concept**, not just that a domain helper reconciles with itself. One
concept → one helper → one number, pinned by a cross‑screen test. (Added canonical `takeHomeMonthly` +
`take_home_agreement.test.ts`.)

## L‑6 (2026‑06‑22) — "appears a few seconds later" = a TIMING bug, not a render‑layering bug

**What happened:** After signup, the onboarding question showed first and the recovery‑code screen
appeared **a few seconds later**. Two fixes failed because they targeted *rendering*: (1) made the
modal opaque + instant; (2) converted the native `<Modal>` to an in‑tree overlay. Neither helped,
because the screen wasn't rendering late — its trigger was being *set* late.

**Root cause (proven):** `registerUser` set `pendingRecoveryCode` only after it fully completed —
including **PBKDF2 envelope‑wrapping (~100k iters) + a Firestore write (~a few seconds)**. But
`createUserWithEmailAndPassword` fires the auth listener *immediately*, which routes into onboarding.
So the app navigated seconds before the recovery code was ever set.

**The tell I missed twice:** **a multi‑*second* delay is almost never a render/z‑index problem** —
rendering races are sub‑frame (milliseconds). A seconds‑long gap means the *state that drives the UI*
is being produced late (slow async work). Fix the data timing, not the layout.

**Fix / rule going forward:** surface the value the instant it's available — generate the recovery
code and fire an `onCodeReady` callback right after the account is created, **before** the slow
crypto/network steps. General rule: **when something appears "a few seconds late," profile the async
chain that sets its state; don't re‑layer the view.**

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
