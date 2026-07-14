# MoneyKeel v1.1.0 — launch-readiness review (Sr PM pass, 2026-07-13)

**BUILD STATUS (updated 2026-07-14): Build #41 · v1.1.0 is OUT — EAS build finished 2026-07-13
11:57 PM and auto-submitted to TestFlight. Update MoneyKeel on your phone and walk the script below.
Log findings in the fillable sheet: `docs/finwise-device-test-build41.xlsx` (Pass/Fail + comments
per step) or straight into the 💬 columns here.**

**Verdict: READY FOR FOUNDER REVIEW.** The approved FCC design is built end-to-end for the core
journeys of both audiences, every number is pinned by cross-screen agreement tests, and the suite
is the gate you asked for: **969 automated tests green** (was 839 before the rebuild — incl. the persona flow walks: upgrade-from-Build-40, new user, skip-everything, semi-retired), zero
TypeScript errors, zero dead navigation links (audited: 54 targets × 59 routes), accessibility
ratchet at zero on every new file. One build, everything in it — no switches to flip.

---

## The 10-minute review script (what to walk on your phone)

| # | Step | What you should see | ✅ Pass? | 💬 Your comments |
|---|---|---|---|---|
| 0 | Update in TestFlight over your existing install | Your data survives the upgrade; the app opens as MoneyKeel | | |
| 1 | Open the app | The bottom bar is FIVE tabs: Home · Net worth · Invest · Cash flow · Plan | | |
| 2 | Look at Home | YOUR INVESTMENTS hero (equals the Invest header to the dollar), one net-worth line, What needs you (top 3), Will my money last? strip | | |
| 3 | Tap the eye, then tap it back | Every dollar on every tab becomes •••• ; percentages stay | | |
| 4 | Tap + Expense (bottom-right) | Amount → category → Save, two taps, no chooser menu | | |
| 5 | Cash flow tab | This month in/out/Planned surplus; twelve dated bars; tap a bar → the month's arithmetic, rows visibly sum; the future-paycheck PROJECTION card | | |
| 6 | Plan tab → tap the headline | What drives this: every input with its source (you set it / estimated) | | |
| 7 | Plan → Claim Social Security → type 2600 | The 62/67/70 table in your dollars; adoption asks 'here's exactly what changes' | | |
| 8 | Plan → Afford it all? → toggle goals | Covered/Short $X per month + the retirement effect; adopt → named on Cash flow → Back to previous plan undoes it | | |
| 9 | Net worth → tap any account | Its own page: freshness, activity history, Deposit/Withdraw/Transfer for cash; a bond shows 'If interest rates move — estimate, not a prediction' | | |
| 10 | Invest tab | The glance header; Look back (real past prices) and What if I add more? (+$100/mo) | | |
| 11 | Settings → Your setup → 'Retired, or nearly' | Tab ORDER changes (Cash flow next to Home); Home leads with SAFE TO SPEND — <month> with the breakdown; the (i) on Safe draw answers 'says who?' | | |
| 12 | Switch back to 'Still working' | Everything returns exactly | | |

---

## What's in this build (all tested)

| Area | Shipped |
|---|---|
| Navigation | 5 tabs, lens-ordered; MoneyKeel wordmark; net-worth chip removed; the old preview switch is GONE — the design IS the app |
| Home | Both heroes (lens-driven), what-needs-you from the one insights engine (+4 new rules: worth-a-look, required-withdrawal, Social Security window, goals-vs-surplus), will-it-last strip, idle-cash landing |
| Worth a look (F10) | The calm transaction watch: 3 fixed rules, two-button resolution, known-payee memory, hand-typed entries never questioned; the words scam/fraud/alert are test-banned |
| Cash flow | Lens-switched main, F5 paycheck hero, 12 dated bars, month detail (pure cell renderer), draw-order preview + Why, future-paycheck projection, adopted commitments named |
| Plan | Hub (band, decisions, scenarios, revert), Social Security timing (SSA math pinned to your design's dollars), Afford it all? (F4), will-it-last detail, the shared "Use this plan" sheet — one write path, always revertible |
| Net worth | Account detail per class (activity through the one ledger engine), bond facts + rates-move estimate, alternatives + reported return, Import v2 (institution required, never doubles an account, correctable classification) |
| Invest | Glance header pinned to Home, Look back (real past prices only), What if I add more (prefilled from the 401(k)-room nudge) |
| First run | The two lens questions (+ retired fast-path to Monthly income), reachable from Settings → Your setup |
| Trust rails | Mask-ALL walk test (zero $ under hide), estimate labels enforced, "we never move your money" copy at the worry moments, all money through one canonical helper per concept |

## Deliberately NOT in this build (per the approved sequencing — not regressions)

1. **Bank connection (Plaid)** — always sequenced last; manual + file import are first-class.
   Sandbox keys are live; the no-duplicates merge rule is already built and shared.
2. **Per-stock detail page** — the Invest table already shows per-holding returns inline.
3. **Required-withdrawals dedicated screen** — the insight + hub row land on the cockpit's
   withdrawal content meanwhile.
4. **Roth screen adoption wiring** — works as the existing calculator today.
5. **Bill calendar running-balance table** — v1 calendar is linked everywhere the design requires.
6. **First-run questions inside new-user onboarding** — new users still get the existing
   onboarding (which sets the lens correctly); the questions screen exists via Settings.

## Notes & watch items (none blocking)

- The paycheck hero runs a real simulation on device (~quarter-second, memoized) — watch for jank
  on your phone; flag it if Home feels slow.
- A few pre-redesign screens still say "benchmark" in Advisor-leaning copy (Settings, cockpit,
  alternatives footer). The new screens all say "the market." Polish pass queued.
- Tiingo price key still pending (your to-do) — prices ride the existing provider until then.
- Version bumped to **1.1.0** (this is a redesign, and the version says so).

## Recommendation
Review on device against the script above; log findings in the bug ledger as usual. If the walk
holds up, this is the App Store submission candidate after your findings round.
