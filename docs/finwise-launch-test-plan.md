# FinWise — Production & Launch Readiness Test Plan (2026-06-12)

Lesson that triggered this plan: 4-tier onboarding QA passed while the onboarding→dashboard handoff
was broken (#15: answers never became Net Worth accounts). **Screen-level passes ≠ journey-level
truth.** This plan tests the app as a system: every data producer must have a tested consumer.

Status legend: ✅ covered today · 🟡 partial · 🔴 missing · 🧑 needs user/device/build

---

## P0 — must pass before any external user

### 1. Journey / handoff tests (the class we just got burned by) 🔴
The seam between onboarding answers → store → snapshot → app screens, per persona.
- Complete onboarding in code as each persona (employed+partner unemployment case, student-aid,
  hourly server, retiree couple, maximal) → assert: cockpit inputs, NW chip, Home dashboard,
  Budget, Bill calendar, Goals all agree with the answers given. (First case: the 75-year-old —
  $250k must show in the cockpit after #15 is fixed.)
- Producer→consumer inventory: every onboarding field → which screens consume it (the data
  schematic doc exists; turn it into assertions). Fields with NO consumer = cut or wire.
- Re-run onboarding over an existing profile (no duplicate accounts, no clobbered edits).

### 2. One-source-of-truth invariants 🟡 (started today)
- Free cash: same number on save-plan screen, goals screens, snapshot, dashboard. ✅ today
- Wealth: NW chip = Net Worth tab = cockpit nest egg basis. 🔴 (#15)
- Tax: income recap = full recap = tax organizer. ✅ today
- Retirement income: current vs future separation everywhere. ✅ today
- Add a single invariants test file that asserts these across modules with one shared fixture.

### 3. Cloud sync & household 🔴🧑
- Fresh signup → empty-cloud resetAll → local answers survive (the noted race) — two-device test.
- Invite end-to-end on real devices: create → share → redeem at signup → both see same data;
  edits from BOTH devices converge (last-write-wins risks: simultaneous edits, offline queue).
- Sign out / sign in another account on same device: zero data bleed.
- Reinstall: household membership + data restore from users/{uid} root doc.
- Offline behavior: app usable, sync catches up, no silent data loss (debounced writer vs kill).

### 4. Firestore security rules 🔴🧑 (deploy + verify — DB is currently OPEN)
- Deploy `firestore.rules`; then emulator-test: stranger cannot read/write another uid;
  household member CAN read/write shared doc; invites: create-own/get-only; feedback create-only.
- Verify the app still functions fully POST-deploy (rules often break legitimate paths).

### 5. Auth lifecycle 🟡
- Signup (+ duplicate email), login, wrong password, password reset, email verification flow,
  logout (state cleared), delete-account path (exists?). Token expiry mid-session.

### 6. Native-build-only features 🧑 (production build required — launch checklist 1.3)
- Receipt OCR (ML Kit), SecureStore keychain encryption (fallback path off), push notifications
  (the typed triggers fixed this week — verify they actually schedule), share sheet, deep links
  from cold start.

### 7. Crash & error resilience 🔴
- ErrorBoundary catches per-screen render failures (not just root).
- Yahoo Finance down / bad ticker / rate-limited → Performance & NW degrade gracefully.
- BLS/Treasury fetch fail → fallbacks used, labeled as such.
- Firestore unavailable → app fully usable from local cache.
- Corrupt/legacy persisted store (old schema versions) → migration not crash. (storage key v3 —
  test v2→v3 path or confirm wipe is intended.)

---

## P1 — before/at App Store submission

### 8. Edge personas & data extremes 🟡
- $0 income, $0 everything, negative net worth, deficit households (✅ deduction rule today),
  single-digit and 9-figure amounts, 120% allocations, all-skip onboarding (every optional
  skipped) → every screen renders sane.
- Date edges: Dec→Jan rollover (rolling 12-mo windows), leap day, year-boundary scholarships
  ('27 labels), DST.
- Currency/locale: non-USD currency selected → every hardcoded $ caught (money() audit),
  decimal-comma locales.

### 9. Device & accessibility matrix 🧑
- iPhone SE (small) / Pro Max / iPad (letterboxed?), iOS N and N-1.
- Large-text (fontScale 1.3) on the dense screens (salary, save-plan, cockpit); VoiceOver pass
  on onboarding at minimum; color-blind check on red/green callouts (we encode meaning in color).
- Keyboard avoidance: every input visible while typing (known RN pain; salary table, modals).

### 10. Performance 🔴
- Profile with 3+ years of expenses/transactions (100s of rows): Home/Budget/Performance render
  time, scroll jank, startup time. Excel-scale stress: 50 goals, 30 accounts, 20 holdings.
- Memory: chart-heavy screens repeated navigation (leak check).
- Bundle/launch: production build cold-start under ~3s on an older device.

### 11. Security & privacy review 🟡
- ⚠️ **API keys ship in the client bundle** (Anthropic, Google Vision via app config extra) —
  acceptable for beta? Rate-limit/abuse plan; long-term: proxy via Cloud Function.
- No PII in console logs; encrypted-at-rest verified on device (keychain build);
  privacy policy/ToS links current; data-deletion request path documented.

### 12. Store readiness 🧑
- TestFlight beta: 5-10 real users, crash-free sessions ≥99%; collect onboarding completion rate.
- App Review risks: finance disclaimer visible (exists ✓), no medical/financial-advice claims,
  account deletion (Apple requires it), screenshots/metadata/keywords, age rating.

---

## Continuous (make it impossible to regress)

### 13. CI pipeline 🔴 (currently tests run only on this machine)
- GitHub Action on push: tsc --noEmit (incremental false), jest (incl. flow audit default mode),
  the new invariants + handoff suites. Block merge on red.

### 14. Existing assets to keep running ✅
- 264 unit/scenario tests · 851,903-flow onboarding audit (FLOW_AUDIT=full weekly) ·
  use-case harness pattern (portfolio_usecases) — extend per new module.

---

## Suggested order of attack
1. #15 fix + handoff test suite (unblocks trusting everything else)   ← biggest gap, this week
2. Invariants suite (cheap, locks today's wins)
3. Firestore rules deploy + emulator tests (security hole, 1 day)
4. CI pipeline (half day, then everything above runs forever)
5. Production native build → device pass (taps, OCR, keychain, notifications)
6. TestFlight beta with the persona scripts → fix crop → submit
