# Build 45 — your feedback, the real root causes, and why I missed each one
*2026-07-24 · plain English, no excuses. Workbook rows 44–50 in `build43-feedback-v1-2026-07-19.xlsx` hold the same items with fix citations.*

## The honest pattern first

Three failure patterns explain almost everything below. I'm naming them because fixes for individual bugs don't rebuild trust — closing the pattern does.

1. **I verified rich sample data, not YOUR phone's data.** Your device is the hardest case we have: a young history (days old), an account imported months ago under old rules, a half-deleted test login, no live price feed yet. Screens that looked right with fat sample data lied on yours. The mock rule already says "every data state" — I under-enforced it.
2. **Some bugs live where our tests can't see.** Real finger-drags, the phone's launch-screen cache, the timing of slow security math — none of these are visible to screen tests, which drive accessibility paths and instant fake services. I treated "tests green" as "device right." They are not the same thing, and only your device walk finds the difference.
3. **Old leftovers survive every redesign unless something pins them.** The entry route pointed at the dead onboarding; the imported account wore a label from an old naming rule; the sign-in screen typed the brand name from before the logo existed. New approved designs replaced the screens but nothing swept the app for stragglers referencing the old world.

## Item by item

### 1 · First screen was the OLD onboarding (skip landed at the brand gate)
- **Root cause:** the app's entry file still hard-redirected every cold start to the old deep questionnaire — a leftover from the pre-June architecture. The route guard is correct, but it deliberately treats that questionnaire as a legal "by-hand" door, so it never bounced you.
- **Why I missed it:** the guard has tests and they pass — because the guard is right. The screens have tests and they pass. Nobody ever pinned the one-line ENTRY file sitting between them. A blind spot between two well-tested layers.
- **Fixed:** entry now lands on the sign-in gate; the guard routes new users to the approved first-run. Pinned so the entry can never target the questionnaire again. *Rides Build 46.*

### 2 · MoneyKeel black at launch (and after delete + restart, still black)
- **Root cause:** two different things wore the same symptom. The LAUNCH screen: the approved splash IS inside Build 45 — I downloaded the actual build artifact and verified it; the black there is the iPhone's cached snapshot from broken Build 43 (delete + restart + reinstall clears it). The SIGN-IN screen: genuinely black in code — see item 3.
- **Why I missed it:** at Build 43 I fixed the launch screen but never asked "where ELSE does the name render, and does it match the logo?" So when you said "still black," I re-litigated the launch screen instead of finding the second source.

### 3 · The name matches the designed logo NOWHERE (black on sign-in, flat green elsewhere)
- **Root cause:** every surface TYPED "MoneyKeel" as text and styled it locally — sign-in in near-black, the top bar in flat green. Typed text can never match the logo: the design is two-tone ("Money" teal, "Keel" navy) in the logo's own typeface.
- **Why I missed it:** I treated the logo as an image for image slots and text everywhere else, without a rule that the brand name is ONLY ever the logo art. No single source of truth for the wordmark.
- **Fixed:** the wordmark art itself (cut from your approved logo file) now renders on sign-in, welcome, and the top bar — one shared asset, no screen types the name. Mock: `mockups/brand-wordmark-v1-2026-07-24.html`. *Rides Build 46.*

### 4 · Sign-in: Welcome for ~30 seconds → recovery code → Welcome again
- **Root cause:** your test account is half-deleted — data removed, login still alive (that's also the "email already exists"). Signing in makes the app build the account's encryption from scratch: deliberately slow security math, ~30 seconds, and the SIGN-IN path had no feedback while it ran (the SIGN-UP path already had an honest "Securing…" spinner — sign-in never got the same care). Returning to Welcome afterward is correct — the account has no data, so setup must run.
- **Why I missed it:** I fixed the visible complaint at signup and never asked "what other path runs this same slow code?" Classic fix-the-symptom-not-the-class.
- **Fixed:** sign-in now shows the recovery-code sheet immediately with the honest "Securing your account…" state. **Your step for clean testing:** Firebase console → Authentication → Users → delete `blah1@gmail.com`, then the email behaves like a truly fresh account. *Rides Build 46.*

### 5 · What-if slider jumps to max the moment you touch it
- **Root cause:** the touch handler is created once when the screen first draws, and it permanently froze the slider-track width from that instant — a 1-pixel placeholder measured before the real layout arrived. Every touch divided by 1 pixel → enormous value → clamped to max.
- **Why I missed it:** our tests drive the slider through its accessibility controls, which read live values and always worked. The bug lived only in the physical-touch path, which tests can't press. Only a real finger finds it.
- **Fixed:** the handler reads current width and values on every touch, a parent scroll can no longer steal the drag, and new tests now drive the REAL touch path with real coordinates. *Rides Build 46.*

### 6 · Net worth: "up $0 this year"
- **Root cause:** the label lied twice. "This year" implies a January baseline, but your history began ~5 days ago — it was really comparing to last week. And because your imported holdings have no live price feed yet (price provider still to be chosen), the value genuinely hadn't moved — which was then worded as "up $0."
- **Why I missed it:** the line was verified against long sample histories where "this year" was true. Nobody ran it against a days-old history — your exact state.
- **Fixed:** "this year" only when the baseline really is January; young history says "since Jul 19"; no movement says "no change since Jul 19," never "up $0." Both pinned. *Rides Build 46.*

### 7 · "E*TRADE Imported holdings" next to "E*TRADE VMFXX"
- **Root cause:** your LCTX account was created by an older import that used the generic default name; newer single-security imports are named by ticker. The naming rule improved but old accounts were never healed.
- **Why I missed it:** I fixed naming at the point of NEW imports and didn't sweep existing data — pattern 3 again.
- **Fixed:** in the one shared naming helper (every screen inherits): a generically-named account holding exactly one security wears that security's name → "E*TRADE LCTX." Pinned. *Rides Build 46.*

## What changes so these classes stop recurring
1. **Founder-state fixtures:** the test suite now contains your device's actual shape — young history, old-labeled imports, half-deleted login, frozen prices — and new screens must pass against it, not just rich samples.
2. **Real-path tests where they're possible:** the slider pins now press the actual touch path; the entry route is pinned; artifact-level verification (opening the real build file) is the standard for "it's in the build."
3. **Leftover sweeps:** when a design supersedes an old one, the definition of done includes searching the app for every reference to the old world — routes, labels, typed brand text — not just building the new screens.

*Everything above is committed and tested (1,270 green). Nothing is on your phone until Build 46 — which waits for your "cut the build."*
