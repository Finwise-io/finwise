#!/usr/bin/env bash
# QUALITY GATE (feedback_quality_first): a change to src/screens or src/components MUST ship with a
# test change — or carry an explicit "// no-test-needed: <reason>" escape hatch. Enforced, not optional,
# so the new QA discipline survives deadline pressure instead of being skipped (see the recovery-bug
# post-mortem: 4 build rounds because UI shipped without a test).
#
# Usage: scripts/check-ui-tests.sh [base-ref]   (default base: origin/main)
set -uo pipefail
BASE="${1:-origin/main}"

if git rev-parse --verify --quiet "$BASE" >/dev/null 2>&1; then
  MB="$(git merge-base "$BASE" HEAD 2>/dev/null || echo HEAD~1)"
else
  MB="HEAD~1"   # base ref unavailable (e.g. shallow CI) — fall back to the previous commit
fi
changed="$(git diff --name-only "$MB" HEAD)"

ui_changed="$(echo "$changed" | grep -E '^src/(screens|components)/.*\.[tj]sx?$' | grep -vE '(\.test\.|__tests__/)' || true)"
test_changed="$(echo "$changed" | grep -E '(\.test\.[tj]sx?$|/__tests__/)' || true)"

if [ -z "$ui_changed" ]; then echo "✓ quality gate: no UI (screens/components) changes"; exit 0; fi
if [ -n "$test_changed" ]; then echo "✓ quality gate: UI changed AND tests changed"; exit 0; fi

# No test change → allowed only if EVERY changed UI file carries the escape hatch.
missing=()
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if [ -f "$f" ] && grep -q "no-test-needed:" "$f"; then continue; fi
  missing+=("$f")
done <<< "$ui_changed"

if [ ${#missing[@]} -gt 0 ]; then
  echo "✗ QUALITY GATE FAILED — these UI files changed with NO test change and no escape hatch:"
  printf '     %s\n' "${missing[@]}"
  echo ""
  echo "Quality is non-negotiable. Either:"
  echo "  • add a render / journey / contract test for the change, or"
  echo "  • annotate the file with '// no-test-needed: <reason>' (a deliberate, reviewed skip)."
  exit 1
fi
echo "✓ quality gate: UI changed but every file carries an explicit no-test-needed reason"
