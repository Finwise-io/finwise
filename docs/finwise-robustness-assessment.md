# FinWise — Why so many errors, and how to stop them
### A Principal-PM assessment (2026-06-21)

## The headline
The ~21 defects across builds #22–#23 are **not random** and **not bad luck**. They cluster into
**two repeating shapes**, and almost none of them were caught by our 600+ automated tests because the
tests check the wrong layer. Fix the two shapes and add one missing test layer, and the escape rate
drops sharply. This is a **structural** problem, not an effort problem.

---

## Root-cause diagnosis — the errors cluster into 5 systemic causes

**1. Duplicated concepts that drift apart (the #1 cause).**
The same idea got built twice and the copies diverged: *two* signup forms (L-1, then L-4), the salary
figure defined two ways (`grossSalaryMonthly` = max-month vs annual/12, B-34), budget spend defined
multiple ways (B-24). When code is generated screen-by-screen / fix-by-fix, the generator re-implements
instead of reusing. Every duplicate is a future bug waiting for the two copies to disagree.

**2. The tests check the wrong layer (the #1 reason bugs escape).**
We have 600+ unit tests on **math and data**, and a render-smoke that only proves screens **don't
crash**. But the defects that reach you are **user-journey** defects — signup routes to a dead-end,
the wrong screen appears, a flow has no exit. There were **zero** tests on routing, auth-state, or
cross-screen flow. The safety net has a hole exactly where the user walks.

**3. We verified on the wrong artifact.**
Several "bugs" (the signup crash, "Something went wrong", Settings errors) were really us testing a
**stale or incompatible build** (L-2 stale native project; L-3 ML Kit blocks the simulator). "Done"
never required a smoke test on a *real* TestFlight build, so broken journeys looked fine locally.

**4. We fixed instances, not classes.**
Each fix patched the symptom in front of us; the underlying duplication survived and resurfaced — L-1
(forked signup) came back as L-4. We never asked "where else does this pattern live?"

**5. Manual testing is our discovery mechanism.**
You are finding these by hand. That means defects pass **every** automated gate and reach a human —
which is slow, stressful, and only finds what you happen to tap. The machine should find them first.

---

## Recommendations — prioritized by leverage

### P0 — Highest leverage (do these next; ~1–2 focused days)
1. **Add a journey-test layer.** Automated end-to-end tests for the 6 critical journeys:
   signup→onboarding→home · login→home · forgot-password→recovery · delete-account · add-account/holding ·
   partner-invite join. Tooling: **Maestro** (you already have a Maestro smoke — extend it) or Detox.
   This is the missing net under cause #2. *(Today I started this pattern: routing is now a pure
   `nextRoute()` function with a full test matrix, plus `onboarding_flow` + `auth_register` flow
   tests. Generalize it.)*
2. **A real-device smoke gate per build.** No build is "done" until the changed journey is tapped
   through on TestFlight. Codified today as **§7 Definition of Done** in `finwise-qa-plan.md`.
3. **One source of truth for every concept.** One auth component (done today), one money definition
   module, one place per derived number. A hard "no forking a screen/definition" review rule.

### P1 — Strong leverage (this/next week)
4. **Fix the class, not the instance.** Every bug triaged with "where else does this pattern exist?"
   and a guard test added so it can't silently return. (We already keep `finwise-lessons-learned.md` —
   keep converting each "why QA missed it" into a new automated gate.)
5. **Shrink the surface.** Delete dead code on sight (we removed the dead onboarding account step
   today). Less code = fewer divergence points. Turn on `noUnusedLocals`/`noUnusedParameters` and a
   duplicate-component lint check.
6. **A pre-release regression checklist** generated from the bug ledger — every past defect becomes a
   line item or (better) a test, so #22/#23 bugs can't reappear in #25.

### P2 — Foundational (ongoing)
7. **Design flows before coding them.** Map each journey as a small state machine (entry, steps, exit,
   dead-end check) — the routing guard is now exactly this shape; extend it to onboarding and money.
8. **Observability.** Wire crash/error reporting (Sentry scaffolding exists) so real-user errors are
   reported automatically instead of discovered by hand.
9. **Stop-the-line for the critical path.** For auth, money math, and data integrity: no new features
   until those journeys have green E2E + a real-device smoke.

---

## The one-sentence version
We optimized for **building features fast** and tested the **math**, but the users live in the
**journeys between screens** — so we must (a) stop duplicating concepts, (b) add automated
**journey** tests, and (c) require a **real-device smoke** before calling anything done. Those three
close the gap that produced ~21 escaped defects.

## Expected impact
Causes #1 and #2 account for the large majority of the escaped defects. Closing them (P0 items)
should cut the per-build escape rate substantially and move bug-discovery from *you, by hand* to
*CI, automatically* — which is the real goal.
