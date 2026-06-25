# FinWise — working rules (read every session)

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
