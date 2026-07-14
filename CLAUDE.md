# FinWise — working rules (read every session)

## RELEASE GATE — no build without explicit founder approval (standing order, 2026-07-14)
A TestFlight build may ONLY be cut after ALL of the following, in order:
1. **Scope complete**: every row of `docs/FCC-core-55-70/FCC-build-tracker.md` for the agreed scope
   is ✅ — "the important ones" does not count as done.
2. **Audit complete**: any doc-vs-code / PRD audit that was planned or started is FINISHED and its
   findings are closed or explicitly deferred by the founder — audits are gates, never parallel work.
3. **Adversarial journey pass complete**: the end-to-end user-journey suites (persona flows, edge
   cases, tester flows) run AND any findings are fixed BEFORE the cut — never after.
4. **Pre-build checklist presented to the founder** (scope vs tracker, audit result, test counts,
   open findings) and the founder replies with an explicit "cut the build".
"Go" on a plan, silence, or enthusiasm is NOT build approval. Only the literal ask counts.
Lesson: Builds 41 and 42 both shipped with known-incomplete scope / unfinished audit — the founder
found bugs on device that journey tests found the same day. Sequencing for speed broke trust.

## Status & truth
- **Verify status against the CODE, not docs.** For any "is X done / what's the current state" question,
  check the live source — the actual file, `package.json`, `app.config.js`, `eas.json`, `eas env:list`,
  `git log`, the test. Docs describe *intent/plans* and lag reality.
- **When you say something is done, cite what you checked** (file:line, command, test name). No claim of
  "done" without proof you looked at the real artifact.
- **If a doc and the code disagree, the code wins** — trust the code, then fix the doc.
- **`docs/README.md` is the canonical doc index** (one file per topic). Use it to find the right file; don't
  read or resurrect the deleted duplicates.

## Quality gates (must stay green before "done")
- `npx tsc --noEmit` clean · full `npx jest` green · `bash scripts/check-ui-tests.sh origin/main` passes
  (a UI change in `src/screens` or `src/components` requires a test change).
- Money math: one canonical helper per concept, pinned by a cross-screen agreement test (lesson L-7).
  Never re-derive a money figure inline on a screen.

## Money/UX conventions
- Take-home = after tax AND 401(k). Surplus = take-home − spending − debt (after debt), labeled
  Actual (this month) / Planned (from the plan). Canonical labels live in `docs/finwise-taxonomy-spec.md`.
- Redesigns: mock first (get approval), then build.

## Workflow
- Branch `taxonomy-v1.0.7`. Commit per logical change; push when asked. Keep `docs/finwise-bug-ledger.md` current.
- Device truth: ML Kit has no arm64-sim slice → verify on a real TestFlight build, not the iOS Simulator.
