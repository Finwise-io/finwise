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

## DEFINITION OF COMPLETE (added 2026-07-15 after the second trust breach)
"Complete" = the UNION of every approved document (PRD acceptance criteria AND detailed-design
screens AND UX rules) — not any tracker/checklist derived from one of them. An exclusion is valid
ONLY if (a) an approved document states it in writing (e.g. dark mode "out of scope v1"), or
(b) the founder approved a NAMED exclusions list BEFORE completion was claimed. The word
"deferred" is a tripwire: if I am about to write it, the item goes to the founder FIRST.
Lesson: after Build 42 the tracker was built from the 40 screens only; PRD criteria that didn't
map to a screen silently fell off and were disclosed as "deferred" AFTER declaring 100% —
the founder had approved all of it. Never again.

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

## ONE TERM PER CONCEPT — app-wide standing order (founder, 2026-09-02)
- "Always use same words to describe same thing in the app. There is no score for creative writing
  use different terms to describe same thing." One canonical word per concept in EVERY user-visible
  string; synonyms are RETIRED. The canon table — 21 rows: take-home, calculated, the retired word "engine" (0c, 2026-09-13), the connect door "Connect your bank ›" (17, 2026-09-14), Linked / Link again (18, 2026-09-14), and the sixteen
  cluster rulings of 2026-09-10 (Surplus, odds out of 100 simulated futures, Expenses, you entered,
  Inflow (sources), Emergency fund, Budget, Gross (before any deductions), Performance / Net worth,
  Debt, Holding, activity, one-time, /month · /year, Will my money last, spouse) — lives in ONE
  place: `MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md`,
  section "One term per concept — the canon". `src/__tests__/one_term_per_concept.test.ts` READS
  that table (nothing hard-coded) and scans `src/` + `MoneyKeel/functions` — strings with words,
  template text, JSX text and every comment; a quoted lowercase token is a code value, not copy;
  spoken accessibility labels keep "a month" / "a year" — and fails the build on any retired word.
- Adding copy? Check the canon FIRST. Naming a new concept? Pick its word, add the row to that
  table, and put the synonyms in its Retired column in the same commit. A row's status follows the
  one vocabulary (RULED, NOT CODED → CODED, NOT TESTED → TESTED, NOT VERIFIED → VERIFIED); only the
  founder's mark makes it VERIFIED.

## PRECISION — standing order (founder, master question Q49, 2026-09-09)
- A return over a window LONGER THAN A YEAR is shown as a yearly rate with "a year" on it, and the window's own total stated beside it (founder, 2026-09-25, after the GIPS/brokerage convention was checked); a window of a year or less is never annualised. Standard: the precision-and-display spec, § A return over a window longer than one year.
- Every calculation runs at FULL precision; nothing rounds inside a function. Rounding happens once, at display: whole dollars for totals/balances/projections, two decimals for prices/rates/expenses/per-share, eight for coin quantities, percents to two decimals; any other precision is stated on the figure's row. Standard: `MoneyKeel/documents/standards/moneykeel_calc_spec_precision-and-display_v01.md`. Guard: `src/__tests__/precision_guard.test.ts`.
- BEFORE writing copy or a mock that touches a ruled subject, ASK WHAT HE ALREADY DECIDED — one command: `python3 "Calculation Module code/scripts/rulings-for.py" tax` (any topic words). Built 2026-09-26 after I re-asked a question he had answered twice (G6, G7): the rulings were on the master's rulings tab, in no standard, and the workplan carried a row of mine saying the opposite. The tracker saying "open" is not evidence that it is.
- A ruling's status (RULED → CODED → TESTED → VERIFIED) lives on the master's `rulings` tab, from `Calculation Module code/scripts/moneykeel_rulings.json`. Update it in the same commit as the change.

## MOCK-FIRST — standing order (2026-07-19, after the build-43 trust breach)
- START FROM THE LAST APPROVED VERSION (founder, 2026-09-14, after six hours of mocks drawn over a Plan tab that never matched his approved v4): before any mock, find each screen's last approved design (approved mock, Claude Design handoff + brief e.g. `August 14th Design/`, Changelog APPROVED row) and the build that shipped it, compare the code with it, and report every difference FIRST. "As it will be built" starts from the approved design plus later rulings; "today" is the code. Standard: `MoneyKeel/documents/standards/moneykeel_pres_spec_screen-design-standard_v01.md` step 0.
- EVERY screen change gets a mock-up saved in `MoneyKeel/documents/<domain>/` BEFORE it is built — named by the
  file-and-folder standard (`moneykeel_pres_mock_<descriptor>_vNN.html`), NEVER overwritten: the
  superseded one gains its date and moves to that domain's `archive/`.
- Mocks are FULL-COLOR, HIGH-FIDELITY (founder order, 2026-07-19): styled HTML phone frames using
  the app's REAL tokens from `src/utils/theme.ts` (colors, type sizes, radii) — never ASCII, never
  grayscale boxes. Show BOTH the rich state and the empty/first-day state.
- Mocks show the FULL SCREEN, top to bottom (founder order, same day): status bar → header → hero →
  every section → tab bar. Never a cropped card. Reference: `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html` (the current Net worth design),
  `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_performance_v14.html` (the current Performance design, approved and built 2026-09-25),
  `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-detail_v01.html`. Numbers inside mocks must ADD UP (accuracy rule applies).
- WHICH DESIGN EACH SCREEN IS BUILT FROM, and which is current, lives in ONE record:
  `MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md`. Read it at step 0 and update it the same day an approval changes it.
- A mock is only satisfied when the built screen matches it in EVERY data state — including a
  fresh/empty account. Lesson: build 43 had the approved change+date elements in code but hid
  them behind has-data conditions; in the founder's new-account state the screen looked nothing
  like the mock. Verify mock compliance in the founder's actual state, not just rich sample data.
- Feedback workbooks: `docs/FCC-core-55-70/build43-feedback-v1-2026-07-19.xlsx` pattern — founder
  rows + verified root cause + fix citation + mock link + status.

## FULL-SURFACE DONE — standing order (2026-07-29, after the column-on-one-tab miss)
- The scope of a request = the WHOLE object the founder names, never the part I happen to be
  working in: a file = EVERY tab; the app = every screen and data state; a bug = its whole class;
  "status" = every workstream. Prior breaches of this class: keyboard fix screen-by-screen
  (5 recurrences), the 'deferred' scope cut (2026-07-15), build-status column on 1 of 6 tabs (2026-07-28).
- Before reporting done: re-read the request, enumerate the full surface, then walk the deliverable
  exactly as the founder will open it (open the file fresh and look at every tab; run the flow in
  the founder's actual data state).
- Every "done" report must carry a COVERAGE LINE — "did X on N of N <units>", with the units named.
  A done-claim without a coverage line is invalid. "Suite green" is never evidence of completeness:
  tests verify what was built, they cannot see what was never built.

## SAME-DAY CHANGELOG — standing order (2026-07-28, founder-adopted after the July-24 audit)
- EVERY founder approval (design change, copy, decision) gets a dated row in the Changelog tab of
  `docs/FCC-core-55-70/FCC-core-detailed-design-v1.3-…xlsx` THE SAME DAY, alongside the mock.
  Columns: Date | Sheet | Change | Why | Approved by. The design doc is the source of truth;
  approvals must never live only in chat, code comments, or feedback workbooks.
  Root cause this fixes: the July-24 audit found dozens of July approvals with only 4 changelog rows.

## Workflow
- Branch `taxonomy-v1.0.7`. Commit per logical change; push when asked. Keep `docs/finwise-bug-ledger.md` current.
- Device truth: ML Kit has no arm64-sim slice → verify on a real TestFlight build, not the iOS Simulator.

## SCREEN MAP — regenerate before every build (standing order, 2026-08-14)
- `node scripts/screen-map.mjs` → `docs/FCC-core-55-70/screen-architecture.html`. Run it as part of
  the pre-build checklist and read the three lines it prints: what has **no way in**, what appears
  **only if an insight fires**, and what hangs on a **single door**.
- The top half of that page is READ FROM THE CODE and must never be hand-edited; the proposed
  structure lives in the script as a marked constant. A test forces the map and
  `orphan_route_guard.test.ts` to agree, so a stale committed map fails the suite.
- Why: `/big-costs` shipped fully built and reachable from nowhere, and Tips and Rewards sat
  stranded for eleven days. Both were found by accident while looking for something else.
- Lesson worth keeping: that guard was built too narrow THREE times — it could not see `src/domain`
  (insight routes), then skipped `(tabs)/` entirely, then turned out to read `_layout` declarations
  which cover about half the live routes. **Read the disk; the disk is what ships.** A guard that
  looks in too few places is worse than none, because it reports clean and gets trusted.

## BRIEFS ARE CODE — every figure and behavioural claim is verified (standing order, 2026-08-14)
Founder question after three errors shipped as instructions in one brief: *"how to avoid this in the
next brief?"* The answer is not more care — all three were written while reading carefully.
- **Every number in a design brief is either computed by the engine in a test, or explicitly labelled
  as founder-stated.** `src/__tests__/brief_figures_guard.test.ts` recomputes them and fails the build
  when the brief and the engine disagree. A new persona or a new figure gets a line there in the same
  commit that puts it in the brief.
- **Any sentence claiming what the app DOES, or what a change is WORTH, must be measured before it is
  written.** "Saving is no longer the lever" was reasoned, not run — and was false by 45 points.
  If a sentence contains a causal claim, the number behind it came from an actual run.
- **Any sentence describing CURRENT behaviour is checked against the shipped code**, never memory.
  The day-one guidance contradicted what the app already did, and the app was right.
- **A figure with no recorded provenance is a defect, even when nobody can prove it wrong.** Pat's
  48% survived four rounds of review because it looked plausible; it does not follow from his own
  accounts (they blend to 8.65%, which puts him at 82%). Every persona table states its inputs
  INCLUDING the assumed return, or the headline cannot be reproduced by anyone, including me.
- Lesson to keep: three guards now exist — orphan routes, the banned word, brief figures — and **each
  caught a real defect within minutes of being written**, after the same surfaces had been read
  carefully by hand. Careful reading finds some; a gate finds the rest.

## MOCK-MATCH AUDIT — standing order (2026-08-10, after three false "it matches" reports)
"Match" = 100% mirror of the approved mock: same elements, words, ORDER, nesting, alignment,
numbers and flow. A presence check (grep for a component, or a passing text assertion) NEVER
proves a match and must never be reported as one.
The only accepted method — full procedure in `docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md`:
1. Extract EVERY visible string from the mock, in order → that list is the spec.
2. Render the screen with the founder's real data shape and dump EVERY visible string, in order.
3. DIFF the two lists. Every different / missing / extra line is a defect until the founder says
   otherwise. Report a coverage line: "N of N identical; X different; Y missing".
4. Check what a text diff cannot see: section ORDER · NESTING (nothing duplicated or under the
   wrong parent) · ALIGNMENT (all numbers on one right edge, band totals included) · DATA REALITY
   (open it with real data — a rule change must RE-CLASSIFY existing accounts, not just new ones).
5. AUDIT APPEARANCE — not optional: pull the RENDERED style values (not the stylesheet) and compare
   to the mock — band/sub-band colours, hero and row colours, font sizes+weights on the design scale,
   the ONE shared right edge for every number (band totals included), card padding / row height /
   nested indent, and the donut (slice order, validated palette, direct labels, centre content).
   Where a test truly cannot reach (device fonts), name the exact item left unchecked and how you
   would check it. Never let "audit complete" imply "looks right".
Find every instance of a defect's CLASS before reporting. The founder must never be the one who
finds the 6th gap.

## POST FEEDBACK SYNC — "PFS" (founder, 2026-09-14)
- When the founder says **PFS**: fold every unarchived feedback file of his (`-jj`, or a `jj/` folder) —
  master and audit unless he names one — into its original, then archive it as
  `YYYY-MM-DD_folded-in_<file>` in that folder's `JJ-feedback-archive/`. Full steps:
  `MoneyKeel/documents/standards/moneykeel_naming_spec_file-and-folder-naming_v01.md` § Post Feedback Sync.
- Read EVERY comment, including a cell-by-cell diff against the original. A ruling is coded and tested the
  same day; a question to Claude is answered on its row. His words are never rewritten — the master build
  stops if any cell he typed changed. Report with a coverage line.
- **A DECISION IS NOT RECORDED UNTIL IT IS IN EVERY FILE THAT CARRIES IT** (founder, 2026-09-26: *"the whole
  purpose of executing PFS after every change or decision is to ensure all files are in sync"*): the rulings
  ledger (his words + what it governs + a test or file check), a STANDARD if it is not about one screen, the
  screen's own master rows, the working plan (every open row it answers is CLOSED), the design changelog, and
  code + test. Gate: `check-rulings-sync.py`, step B4 of the build — it fails on an unanchored ruling and
  prints every open row that re-asks something already ruled.
