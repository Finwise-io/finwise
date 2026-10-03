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
- ONE PHONE PER SCREEN, IN ITS FINAL STATE (founder, 2026-09-30). A mock never draws the old version of
  a screen beside the new one, and never two candidates for the same screen: *"between phone 1 and 6 and
  2 and 7 — which is final version and how would one know in future?"* Performance v15 asked him to
  compare seven phones of which two were the previous versions of two others. Earlier versions live in
  `archive/` and nowhere else. A state that changes (a refusal, a first day) is drawn ON that screen's
  own phone, because a data state is not a second design.
- Mocks show the FULL SCREEN, top to bottom (founder order, same day): status bar → header → hero →
  every section → tab bar. Never a cropped card. Reference: `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html` (the current Net worth design),
  `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_performance_v17.html` (the Performance
  design, APPROVED IN FULL on 2026-10-01 — all five frames; its frame 2, Account portfolio, is also the Account
  detail screen's design, one screen and one design). The tab is BUILT to v17 since 2026-10-03 and held there,
  word for word, by `src/screens/__tests__/perf_matches_v17.test.tsx`),
  `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_add-account-by-hand_v01.html` (Add an account
  by hand, approved 2026-10-01). Numbers inside mocks must ADD UP (accuracy rule applies).
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

## A GUARD MUST PROVE IT LOOKED — standing order (founder, 2026-09-28)
Founder, after I broke the never-work-off-memory rule inside the same hour I was explaining it:
*"How can you break your own rule? Isn't that the whole purpose of rule? How can I be sure you won't
break rules in future as you have done it over and over again in the past?"*

The answer is not a promise. Every rule here that has held was held by something that EXECUTES; every
rule I have broken repeatedly was held by my attention. So the control is on the guards themselves,
because they are what stands in for my attention.

**Every guard that filters records asserts how many it saw.** The failure always takes one shape: a
filter with a pattern I typed, records it does not recognise, and no assertion about coverage — so it
reports clean while looking at a fraction. Three of mine did exactly this:
- step **B6** read the design Changelog's "Approved by" column as `startsWith('JJ')` — written from my
  memory of the column, not from its values. It saw **42 of 251** rows and printed "✓ all 42 reach the
  ledger" while **196 of his decisions** sat outside its net.
- step **B5**, built the day before to stop the approved-design rule failing a fourth time, exempted
  any screen absent from a hand-typed list. It covered **15 of 38** screens; 23 were exempt because I
  had not typed them, which is indistinguishable from their having no design.
- the **orphan-route guard** was built too narrow three times (that lesson is above).

**So, in every guard:**
1. **Read the data, never your memory of it.** Before filtering a column, print its distinct values.
2. **Count what you skipped, and explain it.** A record the guard does not classify fails the build.
   Silence is not an answer a guard may accept.
3. **Assert a floor on what it examined** (`expect(files.length).toBeGreaterThanOrEqual(n)`). A guard
   whose pattern stops matching must go red, not quiet.
4. **A ratchet carries the TRUE number, not zero.** B6 stands at 195 unanchored decisions of his and
   prints it every build. A gate that hides its debt to stay green is worse than no gate.

**What this does not fix, said plainly:** a decision made only in chat and never written down is still
outside every gate. That is why the same-day changelog rule exists, and it is the remaining hole.

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

## NEVER ASK HIM A QUESTION — DECIDE, SAY WHERE IT APPLIES, APPLY IT (founder, 2026-09-30)
His words, after measuring that of the 33 decisions he sat and answered, ONE named the figures it
governs: *"do not fucking ask me any question - without telling where you plan to apply and apply it
first before moving forward. I am not going to answer any further questions in the file."*

**So the order is: decide it, say where it applies, apply it — then tell him.** Not the reverse.

- **A question is a last resort, not a default.** Before writing one, read the approved mock, the
  standards, the decision log (`rulings-for.py <words>`) and the code. Nearly every question I have
  asked him was already answered in one of those — the cash-flow mock even says on its own face
  *"That is a workplan row, not a question."*
- **If it is genuinely undecidable, decide it anyway on the best evidence, apply it, and say plainly
  what I decided, why, and how to reverse it.** He can overrule a built thing in one word; he cannot
  get back the hour he spent answering a question I could have answered myself.
- **Never put a question in a document he opens.** No "say the word", no "name a mark", no
  "waiting on you" in a mock, a plan or a workbook. The prose sweep now refuses to read my own
  offered wording as a ruling of his, because it recorded one as a decision.
- **An answer of his is worthless until it is applied somewhere.** A recorded answer that names no
  figure bought a record, not a guard: `moneykeel_decisions_anchors.json` gives each decision the rows
  it governs, and `check-rulings-sync.py` counts the ones that still name nothing (418 on 2026-09-30,
  a ratchet that may only fall).

## UNDER 60 WORDS, OR DO NOT WRITE IT (founder, 2026-10-01)
His words, after a paragraph of mine about "grain None", "borrowing the portfolio rows" and "rule 1":

> *"no one but you can read this cryptic language. Anyone who cannot explain thing in less than 60
> words in a way that 10 year old can understand - basically does not understand the concept and is
> trying to sound smart without being smart... if you cannot explain in plain english do not bother
> writing in future."*

**He is right, and the reason matters: jargon is how I hide incomplete understanding from myself.**
"Grain None means every account together" was always sayable as "this number is for all your accounts
added up, not one of them". If the plain sentence will not come, that is the signal I have not
understood the thing — and more words never fix that.

- **Write the plain sentence first.** Then count the words. Over 60, cut; cannot write it, STOP.
- **Nothing internal in anything he reads.** Not grain, orchestrator, door, ratchet, anchor, figure
  declaration, one-door, a rule number as shorthand, or an identifier used as a noun. They are for the
  code and the master file, not for him.
- **The test:** could a ten-year-old repeat it back? *"Every number on screen needs a name tag so we
  can check it"* passes. *"Rule 11 declares figures through fig()"* does not.

Worked example of the fix, same content both times. Before: *"the walk on one account shows four
figures that had no identifier; they are not the portfolio figures above them, those are grain None."*
After: *"An account page shows how its balance changed: where it started, what you put in, what you
took out, what it earned, where it ended. Those five numbers had no ID tag. Without a tag, nothing can
check them."*

## AN ANCHOR IS NOT COMPLIANCE — VALIDATE THE ARTEFACT (2026-10-01)
His instruction: *"First go and validate does existing screen mock ups, metrics, functions, code —
comply with these decisions or not. Go module by module."*

Mapping a decision to where it applies says WHERE to look. It is not evidence that anything looks.
Run `python3 "Calculation Module code/scripts/validate-module-complies.py" <module>` — it opens the
screens, the doors, the figures and the approved mocks a module's decisions govern and classifies each
one, saying which check it ran. **It reports what it cannot settle as unsettled**, because a validator
that calls its own blind spots compliant is worse than none.

What the first Net worth run cost me, and the rules that come out of it:
- **All 418 anchors were built by WORD OVERLAP** — every one's reason reads *"its own words appear in
  these files"*. So an anchor can point at a file that merely shares vocabulary. DEC-0036 was anchored
  to the Net worth screen because "drawing", "warning" and "framing" appear there; the heads-up it
  governs is written in four other files, three of which were ignoring it outright. `0 unanchored` was
  never the same claim as `mapped correctly`. The gate now prints **how many anchors someone has
  actually READ** (7 of 418) and that number may only rise.
- **I typed the screen list from memory and it was short by two.** Home and Insights both print Net
  worth figures. The list is now DERIVED — each figure declares its routes, each route file in `app/`
  names its screen — and the validator stops if a route resolves to no file. Seventeen more decisions
  came into scope the moment it stopped trusting me.
- **Three of my own checks were unsound and had to be rebuilt before any finding was believable**: the
  file regex matched `.ts` inside `.tsx` (112 false "broken records"), the copy search read my own code
  comments, which quote his decisions verbatim (compliance is what a PERSON reads, so it searches
  string literals and visible mock text only), and a ban anywhere in a sentence poisoned a REQUIRED
  phrase in the same sentence. **Fix the instrument before reporting what it found.**
- **A deferral written in a code comment is invisible to every gate.** `PlanHubScreen` carried a note
  saying the sweep he approved still awaited doing; it sat there while three screens stayed wrong.
- **The code now names his decisions back.** Every generated header carries a `Ruled by ....` line of
  DEC ids, printed from the anchors — 126 in the code, up from 3 — so a wrong number traces to his
  ruling, not just to its formula. That is objective 4, and it had been one-directional.

## THE DECISION LOG IS THE ONE CONSOLIDATED MASTER (founder, 2026-09-30 — DEC-0011)
His wording: *"Every Approval is logged in decision log with date in addition to change log, standards,
Audit, Master and other files. Decision-log is one consolidated master."* My summary of this had it
backwards — it said an approval gets a dated row in the Changelog. The Changelog is one of the places a
decision ALSO appears. **The decision log is where every decision lives, whatever file it was made in**,
and the order of work on any approval is: the decision log first, then the changelog, the standard it
belongs to, the master file's rows, the working plan, and the code with its test. A decision that
reaches a changelog and not the decision log is not recorded.
Source: `MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx`, built from
`moneykeel_decisions.json` — hand edits die.

**NOTHING ENTERS THE LOG WITHOUT A PATH TO APPLY IT — his two controls, 2026-10-01.** Both refuse the
WRITE inside `build-decision-log.py` (*"guard should return failed process"*, not warn), and
`check-decision-gate.py` runs them on their own:
1. **Three questions, answered on the row or the decision is held back**: (a) what's impacted —
   screens, figures, functions, orchestrators; (b) what changes with this decision; (c) the numbered
   steps to apply it (the new `apply_steps` column — `changed` is past tense and a decision recorded
   before anything is built has nothing to put there). The refusal is his wording: *"not added to
   decision log as not clear path defined to apply it to the app."* **These are not questions for
   him** — they are the work I must have done before claiming a decision is recorded.
2. **A repeat stops the write** and prints the pair with both dates in his format: *"prior decision
   … taken on … , current decision … . Should new decision replace old?"* A pair is raised only when
   the two govern some of the same rows AND share the same distinctive words — words alone paired 59,
   rows alone would pair every decision about one screen. Resolve by marking the older row OLD, NOT IN
   USE with the newer named in its Replaces column, or by recording what is genuinely different.
Why both: DEC-0036 was recorded, mapped and counted as handled with no statement of what to change,
and reached 1 of the 4 places that carry its sentence. DEC-0104 and DEC-0109 are one decision ruled
three weeks apart because the first sweep missed a screen, and nothing linked them — so the second
looked like new work instead of evidence the first had failed.
**Debts carried, true numbers, printed every build**: 343 of 491 decisions in force answer none of the
three questions; 25 pairs look like repeats. Both ratchets may only fall.
**The gate proves it still fires.** Both controls pass today only because no new decision is pending,
and an empty subject is indistinguishable from a broken guard — so 10 self-checks feed the detectors
deliberate failures on synthetic rows. One of them first read the live log for DEC-0109/DEC-0104, then
went red when that pair was correctly resolved: a self-test must never depend on the data it checks.

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
