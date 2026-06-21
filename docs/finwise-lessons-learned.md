# FinWise — Lessons Learned

> A running log of what broke, why, why QA missed it, and the rule we'll follow so it doesn't recur.
> Each entry is written plainly. Reviewed (with the UI design guidelines + data schematics) before
> recommending any fix. Newest first.

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
