# FinWise — Launch Checklist (consolidated)

_Flat, trackable view of every launch item. Excel: `docs/finwise-launch-checklist.xlsx`. Narrative + context: `docs/finwise-launch-checklist.md`. Review rationale: `docs/finwise-launch-review.md`._

**Owner:** 🧑 you (account/legal/manual) · 🤖 Claude (in-repo). **Priority:** Blocker · Important · Recommended · Optional · Positioning · Done.

**Open blockers: 19.**

| Phase | ID | Item | Owner | Priority | Status | Done when / Notes |
|---|---|---|---|---|---|---|
| Phase 0 — Already done | P0.1 | App config, bundle id, version (app.config.js) | 🤖 | Done | Done |  |
| Phase 0 — Already done | P0.2 | EAS build + submit profiles (eas.json) | 🤖 | Done | Done |  |
| Phase 0 — Already done | P0.3 | App Store Connect app record created | 🧑 | Done | Done | ascAppId 6773866960 |
| Phase 0 — Already done | P0.4 | Firestore security rules written (firestore.rules) | 🤖 | Done | Done | Written; deploy = 1.2 |
| Phase 0 — Already done | P0.5 | Encrypted on-device storage + cloud sync, auth + recovery | 🤖 | Done | Done | Zero-knowledge AES-256 |
| Phase 0 — Already done | P0.6 | PriceProvider seam (one-file vendor swap) | 🤖 | Done | Done |  |
| Phase 0 — Already done | P0.7 | Test suite green + all screens render (smoke) | 🤖 | Done | Done | 677 tests as of 2026-06-23 |
| Phase 1 — Hard blockers | 1.1 | Swap market data to a LICENSED vendor (Yahoo unofficial endpoint is not commercial-licensed) | 🧑→🤖 | Blocker | Open | Prices load from licensed source; Yahoo provider gone |
| Phase 1 — Hard blockers | 1.2 | Deploy Firestore security rules (firebase deploy --only firestore:rules) | 🧑 | Blocker | Open | Rules active; logged-out client denied |
| Phase 1 — Hard blockers | 1.3 | Production native build (activates OCR + keychain) | 🧑 | Blocker | Open | Prod build installs; receipt scan + secure storage work |
| Phase 2 — App Store package | 2.1 | Screenshots (6.7" + 6.5") | 🧑 | Blocker | Open | Home, Net Worth, Bill calendar, Retirement, Performance |
| Phase 2 — App Store package | 2.2 | Description, keywords, subtitle, promo text | 🤖 draft | Blocker | Open | Draft in checklist Appendix A |
| Phase 2 — App Store package | 2.3 | Category — Finance (primary) | 🧑 | Blocker | Open |  |
| Phase 2 — App Store package | 2.4 | Privacy Policy URL + Support URL | 🧑 | Blocker | Open | Host pages; URLs in App Store Connect |
| Phase 2 — App Store package | 2.5 | App Privacy questionnaire ("data collected") | 🧑 | Blocker | Open | See Phase 2.5 nutrition-label match |
| Phase 2 — App Store package | 2.6 | Age rating questionnaire → 4+ | 🧑 | Blocker | Open |  |
| Phase 2 — App Store package | 2.7 | App icon (1024) + launch screen present | 🧑 | Recommended | Open |  |
| Phase 2.5 — App Review compliance | 2.5.1 | In-app account deletion (Settings → Delete account) | 🤖 | Done | Done | Guideline 5.1.1(v) |
| Phase 2.5 — App Review compliance | 2.5.2 | Apple Privacy Manifest (app.config.js) | 🤖 | Done | Done | No tracking declared |
| Phase 2.5 — App Review compliance | 2.5.3 | Match App Privacy nutrition label to the manifest | 🧑 | Blocker | Open | Email, Name, Financial, Crash — "run app", not "track" |
| Phase 2.5 — App Review compliance | 2.5.4 | Create a demo login for Apple’s reviewer | 🧑 | Blocker | Open | Real account + sample data in reviewer notes |
| Phase 2.5 — App Review compliance | 2.5.5 | Test Delete-account on a real production build | 🧑 | Blocker | Open | End-to-end removal verified |
| Phase 2.6 — Launch-review findings | B-L1 | Reconcile privacy claim with AI-tips data path (analyzeExpenses → proxy → Anthropic) | 🤖→🧑 | Blocker | Done | DONE 945f929 — on-device tips + OCR; claim updated; policy reconciled; re-host policy = 🧑 |
| Phase 2.6 — Launch-review findings | B-L2 | Wire production crash reporting (live Sentry DSN) | 🧑 | Blocker | Open | Forced test crash appears in dashboard |
| Phase 2.6 — Launch-review findings | B-L3 | Disclaimer at every projection / "on-track" verdict; no imperative "you should" | 🤖 | Blocker | Open | Verified by test/screenshot pass |
| Phase 2.6 — Launch-review findings | B-L4 | Graceful network degradation on BLS/Treasury/AI feeds (try/catch + default) | 🤖 | Blocker | Open | No thrown error / corrupted projection on failure; test |
| Phase 2.6 — Launch-review findings | R-1 | Verify bug ledger clean (no user-facing money error open) | 🤖 | Important | Open | docs/finwise-bug-ledger.md |
| Phase 2.6 — Launch-review findings | R-2 | Run Maestro flows on a REAL device (selectors never run on-device) | 🧑 | Important | Open | auth-signup, smoke, b21-add-sheet, nw-donut, cashflow |
| Phase 2.6 — Launch-review findings | R-3 | Prep App Review note: educational planner, no money movement/linking/securities recs | 🧑 | Important | Open | De-risks fintech-licensing guideline |
| Phase 2.6 — Launch-review findings | R-4 | Scope launch as US-only (app is USD-only; "every country" objective deferred) | 🧑 | Positioning | Open | Don't market global |
| Phase 2.6 — Launch-review findings | R-5 | Track onboarding completion as #1 launch metric (manual entry = churn risk) | 🧑 | Positioning | Open |  |
| Phase 3 — Optional (post-v1) | P3.1 | Plaid bank linking | 🧑 | Optional | Open | Needs Plaid keys + backend |
| Phase 3 — Optional (post-v1) | P3.2 | Push notifications | 🧑 | Optional | Open | Needs APNs + reminder logic |
| Phase 4 — Final pre-submit QA | 4.1 | Clean onboarding for each persona (numbers reconcile) | 🧑 | Blocker | Open | student / variable / professional / retiree |
| Phase 4 — Final pre-submit QA | 4.2 | Prices load from the LICENSED provider (not Yahoo) | 🧑 | Blocker | Open |  |
| Phase 4 — Final pre-submit QA | 4.3 | Sign up → log out → recover account → log back in | 🧑 | Blocker | Open |  |
| Phase 4 — Final pre-submit QA | 4.4 | Test on a physical device (gestures, keyboard, safe-area, large text) | 🧑 | Recommended | Open |  |
| Phase 4 — Final pre-submit QA | 4.5 | eas submit → TestFlight → submit for review | 🧑 | Blocker | Open |  |
