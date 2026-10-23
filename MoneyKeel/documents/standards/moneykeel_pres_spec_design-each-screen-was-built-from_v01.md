# Which design each screen was built from, by build

**Version 01 · 2026-09-14**

**Why this exists.** The founder asked on 2026-09-14: *"Do you not keep track of mock you use to build 53."* Nothing recorded it. The Build 54 commit (2026-09-01) moved the `mockups/` folder into `MoneyKeel/documents/` under the file-naming standard. It filed the Build 53 finals under `archive/` with a date, and a dated file in `archive/` means "replaced". They were not replaced. The next mock therefore started from the wrong files and cost six hours.

**The newest approval wins — and closing the gap is mine (founder, 2026-09-27).**

> *"If I approved mock up post build - that the latest approval. Why you keep asking me same thing
> over and over."*

When a mock he approved is NEWER than the build that ships that screen, the mock is the design and the
build is behind it. That is not a question. It is a defect with a known answer, and bringing the build
up to the mock is mine to do. I asked him to choose between his own approved design and the code twice
— on the Plan tab and on Cash flow's This month — and both times the answer was already on the file:
the later date.

Asking again costs him twice: once to read a question he has answered by approving, and once more
because the gap stays open while he does.

**The rules.**
- The day a build is cut, it adds its rows here.
- A design file named in the latest build's rows is never moved to `archive/`.
- Every screen task starts here (screen standard, step 0).

Each file below was matched to Build 53 by exact content (the same fingerprint as the file in commit `263f741`), not by name.

---

## Build 53 · commit `263f741`

| Screen | Built from | Where that file is today | The rest of the set |
|---|---|---|---|
| **Net worth** | Three layers, in order. (1) `networth-FINAL.html`, from `mockups/NW-Performance-Mockup Finals - August 10/`, for states C to F (first day, the missing-data banner, the change walk, the fix sheet). (2) **Quiet Instrument mock v5**, `networth-quiet-instrument-v5-BUILT-full-width-banners-2026-08-11.html`, which the Build 53 index calls *"THE CURRENT ONE"*: the flat list, five full-width dark-green bars, and light-green group bars. (3) **Square corners, with no mock:** on 2026-08-11 the rounded top corners came off every green bar, on the founder's direction *"no mock up ... just build it"* (commit `bfefb86`). v5 still draws rounded top corners. **No mock file shows the square-cornered screen.** The founder's device screenshot of Build 53 (`August 14th Design/Feedback-Calculations/NWscreen.png`, 2026-08-17) shows it. **(4) Drawn after the fact on 2026-09-14:** `MoneyKeel/documents/networth-and-performance/archive/2026-09-14_moneykeel_pres_mock_net-worth-quiet-instrument_v06.html`, all seven states rendered from the Build 53 code: the one picture of what shipped (confirmed 2026-09-14). The current design is v08 (table below). | (1) `MoneyKeel/documents/networth-and-performance/archive/2026-08-10_moneykeel_pres_mock_net-worth_v01.html` · (2) `…/archive/2026-08-11_moneykeel_pres_mock_net-worth-quiet-instrument-full-width-banners_v05.html` | In the same `archive/` folder: v1 to v4 of Quiet Instrument, the Claude Design handoff (`…quiet-instrument-handoff-1b_v01`), the two 2026-08-10 PDFs, and screens 01 to 11 (`01-net-worth-main`, `02-add-or-connect-chooser`, `03-account-sheet`, `04-debt-editor`, `05`–`07` account detail, `08-itemize`, `09-import-holdings`, `10-connect-flow`, `11-bond-alt-editors`) |
| **Performance** | `performance-FINAL.html`, from the same folder | `MoneyKeel/documents/networth-and-performance/archive/2026-08-10_moneykeel_pres_mock_performance_v01.html` | `…_spec_net-worth-vs-performance-the-definitive-pair_v01.pdf` |
| **Plan** | Claude Design Plan v4, with brief v3 | `August 14th Design/design_handoff_net_worth/Plan.dc.html` (unchanged since Build 53) and `August 14th Design/PLAN-REDESIGN-BRIEF-v3-2026-08-14.md` | **Not built in Build 53:** brief section 3.2, "Your plan at a glance". The app still shows the 08-12 facts-and-choices layout (workplan row, 2026-09-14). |

Rulings made after Build 53 that change these screens are in the Changelog tab of `docs/FCC-core-55-70/FCC-core-detailed-design-v1.3-2026-08-14.xlsx`. For example: the empty-state pattern (mock approved 2026-09-12), the one-term canon ("Debts", "Emergency fund"), and screen titles at 20 points (2026-09-14).

**Plan, 2026-09-26.** Three copies of `Plan.dc.html` exist in `August 14th Design/` and they DIFFER (`design_handoff_net_worth/` is the v4 one the design notes sit beside; `Claude-Design-handoff-received-2026-08-13/` and `A-instructions for claude/Plan screen/` are older). The one that counts now lives at `MoneyKeel/documents/plan/moneykeel_pres_mock_plan_v06.html` (v05 archived 2026-09-26, as the guard that reads this file found on 2026-10-07); the raw v4 is in that folder's `archive/`. Do not read the `August 14th Design/` copies for design truth again.

## Net worth module, 2026-10-01 — what still has no approved design

His seven-step process, step 1.a, counts a screen as done only when it is designed, approved AND coded.
The Net worth module is SEVEN screens (his scope, 2026-10-01, DEC-0649: *"we are only working on NW module. Forget about these screens - Home, Insights, Import holdings, Job safety, Stress test"*). All seven are coded. After his approvals of 2026-10-01 three of the
seven have an approved design: Net worth itself, Account detail and Add an account by hand.

| Screen | Design today | What it needs |
|---|---|---|

Drawing those six is mine, not a question for him (mock-first standing order). They are drawn from the
census strings, the screen's own StyleSheet and the navigator header — never from an older mock's CSS.


## Screens not yet recorded

Home and every screen opened from another screen still need their Build 53 design traced by the same method. (Cash flow's designs ARE approved, filed and — since 2026-09-26 — on the canon; see the table below. What it still lacks is the traced link from a build to a mock, which needs git.) Until then, a task that touches one of them starts by tracing it.

## The current approved design, by screen

**Held by test since 2026-10-04.** Every phone of every drawing named below for Net worth, Performance and Cash flow is compared with the built screen word for word: `perf_matches_v17`, `networth_matches_v08`, `cashflow_matches_v01`, `income_matches_v07`, `basepay_matches_v07`, `filing_matches_v07`, `income_manager_matches_v07` and `kept_editors_match` (Bill calendar, Monthly income, Look back, Add an account, Bonds, Alternatives, Itemize, Holding detail) in `src/screens/__tests__/`. Each file lists the differences it allows and why; one phone — the Alternatives editor — is held as ruled, not as matched: his ruling of 2026-10-04 (DEC-1560, *"Rest - keep it."*) keeps the kinds the app offers and the line under the kind as built, and the five drawn lines not on the form are pinned by `kept_editors_match`. (This line said "held as open" until 2026-10-20, after he had ruled it.)

The file each next task on that screen starts from. It is updated the same day an approval changes it.

| Screen | Current approved design | Waiting for approval |
|---|---|---|
| Net worth | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html` — **ALL SEVEN FRAMES, A TO G, APPROVED 2026-10-01** (*"Quite Instrument v08 - approved all screens from A to G"*, DEC-0644). A with data by category · B all collapsed and the down case · C the first day · D the missing-data banner · E the change walk · F the fix sheet · G the add sheet. The screen itself was approved 2026-09-14 and built the same day; the four sheets had no approval on record until now, and none of them has been mock-matched. | — |
| Account portfolio | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v01.html` — **THE ACCOUNT-PAGE DRAWING v01, APPROVED 2026-10-19** (his word *"approved."*, DEC-6457), five states on one phone: A a linked account · B an account built by hand (a bond) · C day one, linked today, no past activity sent · D the same account with 1Y picked, worked back from price history · E a bond's own page; READ THIS FIRST rows 1 to 43 carry the rulings of 2026-10-19 (DEC-5847, DEC-5848, DEC-5849, DEC-5982, DEC-6005, DEC-6074 to DEC-6079, DEC-6212, DEC-6323, DEC-6412). **It replaces Performance v17 frame 2 as this screen's design**; it is v17 frame 2 redrawn so its figures add up, so it keeps frame 2's layout. Still ONE screen with one design (DEC-0646): /account-detail opens src/screens/AccountPortfolioScreen.tsx; `account-detail_v01` stays rejected and archived. Frames 1, 3, 4 and 5 are the Performance module's and are approved too (*"I have already approved Perf v17 for perf module"*, DEC-0647); they remain the Performance tab's design. **BUILT 2026-10-19 to the drawing, in all five states, and held word for word** by `src/screens/__tests__/account_page_drawing_states.test.tsx` (every line of each state, in order, in the card the drawing puts it in; rendered colours, sizes and weights against the drawing's CSS; the one right edge): A 124 of 124 lines, B 65 of 65, C 83 of 83, D 89 of 89, E 71 of 71. Audit: `MoneyKeel/documents/audit/moneykeel_audit_mock-match_account-page_2026-10-19_v01.md`. Four appearance differences are named in that test with their reasons (the shared amber box's radius and padding; the app's one content padding; the right column set flush; the amber box's door text on the type scale, 13 not 12). **What came before, for the record:** built 2026-10-01 to sections that account_portfolio_vs_mock.test.tsx read from the wrong phone of v17 (phone 3, the Performance tab) — the SUMMARY band, Ending value, the value line, the account's own row and WHAT EACH CATEGORY EARNED, none of which frame 2 drew; the line-by-line check of 2026-10-11 found frame 2 did not match and its figures did not add up, which is why it was redrawn. | — |
| Update value (a sheet on the account page) | **NOT APPROVED — no approval is recorded.** The sheet is built and held to the drawing in the next column; approving it is his. Recorded here 2026-10-21. | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_update-value-sheet_v02.html` (v02, 2026-10-22: the title names the account as the page names it (Update value — Ally Savings, DEC-7379) and the back button is drawn with its 12 corner; nothing else changed; v01 is archived as `archive/2026-10-22_moneykeel_pres_mock_update-value-sheet_v01.html`, and the states below are as drawn) — drawn 2026-10-20 from the sheet as built (`UpdateValueSheet` in src/screens/AccountPortfolioScreen.tsx), eight states on one phone: A a cash account built by hand (Ally, Savings) · B a bond built by hand (Muni 2029) · C the amount cleared, Save cannot be pressed · D an alternative valued 7 months ago (Gold coins), the page · E D after Still right · F D, Update value tapped in the 7-months-old box · G F after 8400 is saved, the page · H a cash account with no value date (Chase, Checking), the page. Its three doors: Update value, the box for a value 6 or more months old, the box for a value with no date. **Held word for word, state by state,** by `src/screens/__tests__/update_value_sheet_drawing.test.tsx` (20 of 20, run 2026-10-21). It is the answer to his question DEC-0470, "what does screen look like for manual update?", written on that decision's row on 2026-10-21. |
| Trade sheet (Record a buy or sell) | **NOT APPROVED — no approval is recorded.** Drawn from the sheet as built and held to the drawing in the next column; approving it is his. Recorded here 2026-10-22. | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_trade-sheet_v02.html` (v02, 2026-10-22: the title reads Record activity (canon row 12, DEC-7380), and a 529 that lists its funds shows the account page's third door (his DEC-2484g); the twelve states are v01's; v01 is archived as `archive/2026-10-22_moneykeel_pres_mock_trade-sheet_v01.html`, and the states below are as drawn) — 12 states: A–C a buy (empty; $1,000 of $5,000 cash; more than the cash) · D–E a sell (normal; more than held) · F a deposit · G a transfer · H–I a dividend (cash; reinvested) · J–K a fresh account (buy; sell) · L opened from the Holding page. Opened by the account page's Add a buy or sale › (row 62) and the Holding page's Record a buy or sell. held word for word (size, weight, colour, the faded save button) by `src/screens/__tests__/sheets_drawn_from_code.test.tsx`, its states from one list, `src/testing/sheetStates.tsx`; drawn 2026-10-21 by a script, with the dimmed top of its page under each state and a READ THIS FIRST table. |
| Holding editor | **NOT APPROVED — no approval is recorded.** Drawn from the sheet as built and held to the drawing in the next column; approving it is his. Recorded here 2026-10-22. | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_holding-editor_v02.html` (v02, 2026-10-22: its note names the tab Net worth, with a small w (canon row 9, DEC-7381); the nine states are v01's; v01 is archived as `archive/2026-10-22_moneykeel_pres_mock_holding-editor_v01.html`, and the states below are as drawn) — 9 states: a stock · an account with a typed total · an option · a bond · a CD · typing a ticker · a mistyped ticker · no purchase on record · a private-equity holding. held word for word (size, weight, colour, the faded save button) by `src/screens/__tests__/sheets_drawn_from_code.test.tsx`, its states from one list, `src/testing/sheetStates.tsx`; drawn 2026-10-21 by a script, with the dimmed top of its page under each state and a READ THIS FIRST table. |
| Activity sheet (one holding's records) | **NOT APPROVED — no approval is recorded.** Drawn from the sheet as built and held to the drawing in the next column; approving it is his. Recorded here 2026-10-22. | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_activity-sheet_v01.html` — 2 states: with records (newest first), with none. Opened by the Holding page's See activity. held word for word (size, weight, colour, the faded save button) by `src/screens/__tests__/sheets_drawn_from_code.test.tsx`, its states from one list, `src/testing/sheetStates.tsx`; drawn 2026-10-21 by a script, with the dimmed top of its page under each state and a READ THIS FIRST table. |
| Record-activity sheet (the account page's recorder) | **NOT APPROVED — no approval is recorded.** Drawn from the sheet as built and held to the drawing in the next column; approving it is his. Recorded here 2026-10-22. | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_record-activity-sheet_v01.html` — 9 states: a deposit, empty and typed · a withdrawal · a transfer · a transfer with nowhere to go · a fresh deposit · a dividend · a bond's income · a savings account's interest. held word for word (size, weight, colour, the faded save button) by `src/screens/__tests__/sheets_drawn_from_code.test.tsx`, its states from one list, `src/testing/sheetStates.tsx`; drawn 2026-10-21 by a script, with the dimmed top of its page under each state and a READ THIS FIRST table. |
| Edit-record sheet | **NOT APPROVED — no approval is recorded.** Drawn from the sheet as built and held to the drawing in the next column; approving it is his. Recorded here 2026-10-22. | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_edit-record-sheet_v02.html` (v02, 2026-10-22: with no amount, Save fades to 40%, the one fade every sheet uses (DEC-7382); it faded to half; the three states are v01's; v01 is archived as `archive/2026-10-22_moneykeel_pres_mock_edit-record-sheet_v01.html`, and the states below are as drawn) — 3 states: a deposit, the amount cleared, a dividend. held word for word (size, weight, colour, the faded save button) by `src/screens/__tests__/sheets_drawn_from_code.test.tsx`, its states from one list, `src/testing/sheetStates.tsx`; drawn 2026-10-21 by a script, with the dimmed top of its page under each state and a READ THIS FIRST table. |
| Add an account, by hand | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_add-account-by-hand_v02.html` — **approved 2026-10-01** (*"Add Account by hand v01 - approved"*, DEC-0645). It was drawn from the code as a reference and named "as built"; his approval makes it the design, so it carries the name of the thing rather than the stage it was drawn at. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** **2026-10-20, a dated READ THIS FIRST line (DEC-4529):** the Alternatives phone's chip “Annuity” reads “Annuities”, the one word for the kind; the form now reads its chip words from the one list of kinds. | — |
| Bonds | **APPROVED 2026-10-01** (*"Mark these three as approved as of now. Will need to review them in test flight"*, DEC-0650) — the approval is on the drawing; confirmation comes on a TestFlight build. `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_bonds_v02.html` — drawn 2026-10-01 from the screen's own code and tokens. Three states: with bonds · the first day · the editor. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** | — |
| Other investments | **APPROVED 2026-10-01** (*"Mark these three as approved as of now. Will need to review them in test flight"*, DEC-0650) — the approval is on the drawing; confirmation comes on a TestFlight build. `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_alternatives_v02.html` — drawn 2026-10-01. The screen is titled **Alternatives**; its route is `/other-investments`. Three states: with holdings · the first day · the editor. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** **The editor (phone 3) stays as built, by his ruling of 2026-10-04 (DEC-1560, *"Rest - keep it."*):** the kinds the app offers and the line under the kind — not open. **2026-10-20, a dated READ THIS FIRST line (DEC-4529):** phone 1's rates, blend and growth are not the app's; the line gives the app's figures for the drawn holdings, Fund III entered as Other because private equity is not offered (DEC-2334): 8.00% · 5.00% · 8.20%, EXP. RETURN 6.81%, EST. GROWTH /year $4,187. | — |
| Holding detail | **APPROVED 2026-10-01** (*"Mark these three as approved as of now. Will need to review them in test flight"*, DEC-0650) — the approval is on the drawing; confirmation comes on a TestFlight build. `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_holding-detail_v02.html` — drawn 2026-10-01. Three states: a priced holding · no live price · sold, with a window the price history cannot reach. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** | — |
| Itemize | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_itemize_v02.html` — drawn 2026-10-01 from the screen’s own code and tokens, three states on three phones (nothing placed · money left over · more placed than the account holds). Build 53 plus the only three visible changes since, all his rulings. — **TAKEN AS THE DESIGN 2026-10-01 on my decision, not his** (DEC-0651). He had been asked three times to approve a screen that no approved design reached; the way in was decided and built instead. **Its one door is on the Account portfolio**, shown when an account holds money with nothing recorded inside it. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** | — to be reviewed with the other three on a TestFlight build |
| Look back | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_look-back_v01.html` — drawn 2026-10-01 from the screen's own code and tokens, two states on two phones (with prices · without). **APPROVED 2026-10-02** (*"approved."*, DEC-1069). The Performance tab and the Account portfolio are frames 1 and 2 of v17; Holding detail is Net worth's. **2026-10-22:** Look back fetches the prices it compares — its pairing, SPY and his four yardsticks (DEC-1624) — through the app's one price refresh (DEC-7383), so phone A is reachable with nothing held; while it fetches and if the refresh brings nothing it says so (DEC-7384). Held word for word by `look_back_fetches_what_it_compares.test.tsx`; the drawing's READ THIS FIRST row of 2026-10-22 says the same. | — |
| Performance | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_performance_v17.html` — **APPROVED IN FULL, ALL FIVE FRAMES, 2026-10-01** (*"I have already approved Perf v17 for perf module"*, DEC-0647). 1 Performance main, with a window being refused · 2 Account portfolio · 3 Day one, a linked account · 4 Day one, hand-entered · 5 No accounts yet. Every colour comes from the app’s own tokens (`src/utils/theme.ts`), and it adds the two states where the Return refuses and shows the exact yearly rate instead (his Q52 ruling, 2026-09-30). Frame 2 is also the approved design for the **Account detail** screen (DEC-0646) — one screen, one design. **Since 2026-10-19 it no longer is: the account-page drawing v01 replaces frame 2 for that screen (DEC-6457, the Account portfolio row above).** **WHAT IS BUILT IS v17, since 2026-10-03.** The tab was compared with phones 1, 3, 4 and 5 word for word and rebuilt to them; `src/screens/__tests__/perf_matches_v17.test.tsx` renders each phone’s data state and fails on the first word that differs. Three differences are known and named in that test: no yearly rate is printed for cash (the app holds none, so it shows an em-dash); the closed account line is worded as phone 1 words it on every phone; and the arrows drawn on the category rows and on the all-accounts bar are not built, because no approved screen exists for them to open (DEC-0128); the arrows on the account bars are built (2026-10-12). (v14 was the build until then: approved 2026-09-25, commit `727e22a`, dated in `archive/`.) v10 to v15 are dated in `archive/`. **2026-10-12, the line-by-line check with figures** (`MoneyKeel/documents/audit/moneykeel_audit_mock-match_performance_2026-10-12_v01.md`): phones 1, 3, 4 and 5 rendered on the drawing's own day now match word for word AND figure for figure, except the differences named in `src/screens/__tests__/perf_mock_match_2026_10_12.test.tsx` (each a READ THIS FIRST row or a decision written in the report); thirteen defects were fixed there, among them the "›" on every account bar (it opens that account's page) inside one right-hand column every money row keeps, so all figures share one edge (DEC-0093). The all-accounts bar and the category rows carry no arrow: they open no approved screen (DEC-0128); a dated READ THIS FIRST row on v17 says so. **2026-10-13, DEC-5291 ("approved." — let price history count):** a window that starts before the daily record is worked back from each holding's price history instead of greyed, so phone 1's 1Y and 2Y and phone 4's 1M, This year, 1Y and 2Y now carry figures, and phone 4's day-one line reads, in his words of 2026-10-14 (DEC-5425, "approved."), "You added your accounts today. Figures for 1M, 1Y and longer come from each holding's past prices." Phone 5 is unchanged. A dated READ THIS FIRST row on v17 says so; both mock-match tests name it as a known difference. | — |
| Plan | `MoneyKeel/documents/plan/moneykeel_pres_mock_plan_v06.html` — v05 with the founder's eight decisions applied (2026-09-26: *"Plan - Q1 - 8 - your recommendation approved"*), the five blockers fixed, every figure re-run at 1,000 futures, the words brought onto the canon, and every template placeholder filled so the file reads on its own. v04 and v05 are dated in `archive/`. **Not built:** the tab still shows the 2026-08-12 layout he rejected, and its code waits on the Q-PL-1 and Q-PL-2 doors. | Approval of v06 |
| Cash flow | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html` **frame 1, This month — APPROVED 2026-09-28** (*"Approved"*, DEC-0440: the four-tab architecture from v02 with This month and Expenses revised in v07; v02 and v07 are dated and archived). The folder also holds `income-end-to-end_v07`, `look-ahead_v04` and `filing-status-question_v03`, each with a "What changed from vNN, and why" block; where the architecture file and a detail file disagree, the detail file wins. **Traced 2026-09-27**; the per-screen rows below were added 2026-10-02 so step 1.a reads one row per screen. **BUILT 2026-10-03, This month only (frames A and B):** compared word for word and rebuilt — a Planned card and an Actual card, every row spelled out; `src/screens/__tests__/cashflow_matches_v01.test.tsx` holds it. Three differences are named in that test: the words under the planned inflow show in both frames, the ＋ Expense button stays, and the future-paycheck card stays (he ruled on its arithmetic on 2026-09-08). **Expenses, Income and Debts (frames C to F) built the same day**, each held word for word by the same test, which lists every named difference (fourteen across the four tabs — the future-paycheck card, the payoff plan with the mortgage comparison he moved here in DEC-0157, and the doors a person needs that the drawing does not draw). | — |
| Budget (Expenses · Debts) | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html` **frames 2 and 4 — APPROVED 2026-09-28** (DEC-0440). The Budget screen is embedded in the Cash flow tab as its Expenses and Debts sub-tabs; it has no route of its own. | — |
| Base pay | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frame 2, Your base pay — APPROVED** (v02 on 2026-08-27, *"yes"*, DEC-0177; v07 approved on 2026-09-02 per the file's own change block). **Held word for word since 2026-10-04**, phones 2 to 8, by `src/screens/__tests__/basepay_matches_v07.test.tsx` (9 named differences). The filing question (phones 13 to 15) is held by `filing_matches_v07.test.tsx`. | — |
| Income summary | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frame 5, Your income, all of it — APPROVED** (DEC-0177 lineage, v07 approved 2026-09-02). | — |
| Income manager | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frames 1 and 3 — APPROVED** (DEC-0177 lineage, v07 approved 2026-09-02): where the money comes from, and bonus, equity and the other sources. **BUILT 2026-10-04** — the manager (phone 12) and its three editors (phones 9, 10, 11) rebuilt to the drawing and held word for word, with the picker (phone 1), by `src/screens/__tests__/income_manager_matches_v07.test.tsx` (8 named differences). | — |
| Log income | **RETIRED 2026-10-02** — no approved design draws a door to it and no ruling needs it (his finding: *"these are no longer needed per new design"*). The screen, its route and its figures are gone; its v02 drawing is in `archive/` as RETIRED. | — |
| Month detail | **RETIRED 2026-10-02** — no approved design draws a door to it and no ruling needs it (his finding: *"these are no longer needed per new design"*). The screen, its route and its figures are gone; its v02 drawing is in `archive/` as RETIRED. | — |
| Bill calendar | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html` — drawn 2026-10-02 from the build (every string the screen renders, at its StyleSheet's size, weight and colour, both data states), audited against the screen standard and the gaps fixed the same day. **APPROVED 2026-10-02** (*"ok. open them from build but make sure it meets new design standards"*). v01 is archived. Kept 2026-10-02 as an EDITOR, not a destination: reached from the menu and the Money sheet ("A dated bill") — the editor behind the big-ticket radar rows of the approved This month (cash-flow_v01, frame 1); the link from This month to the calendar, which that drawing does not have, is gone. | — |
| Paycheck months | **RETIRED 2026-10-02** — no approved design draws a door to it and no ruling needs it (his finding: *"these are no longer needed per new design"*). The screen, its route and its figures are gone; its v02 drawing is in `archive/` as RETIRED. | — |
| Monthly income | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_monthly-income_v02.html` — drawn 2026-10-02 from the build (every string the screen renders, at its StyleSheet's size, weight and colour, both data states), audited against the screen standard and the gaps fixed the same day. **APPROVED 2026-10-02** (*"ok. open them from build but make sure it meets new design standards"*). v01 is archived. Kept 2026-10-02 as an EDITOR, not a destination: reached from Home, Plan and the paycheck card — the editor behind the Social Security and pension figures the approved Plan draws (plan_v06, mark 13, "as you gave them"). | — |
| Worth a look | **RETIRED 2026-10-02** — no approved design draws a door to it and no ruling needs it (his finding: *"these are no longer needed per new design"*). The screen, its route and its figures are gone; its v02 drawing is in `archive/` as RETIRED. | — |

---

## Cash flow, 2026-09-26 — the day the words were fixed

The founder: *"fix cashflow screens before moving forward."* Three of the four cash-flow mocks were
approved **before** the one-term-per-concept rulings (2026-09-10, 2026-09-12) and the one-door list
(2026-09-14), so they drew words the app no longer says. They were redrawn as v07, v04 and v02 — the
words only; no figure, frame or design decision moved — and the code was brought with them:

- **The canon guard could not see two whole shapes of the offence.** Row 14 was written `/mo` and `/yr`,
  which can never match `/ mo` with a space — eleven labels were living in that gap. Row 12's
  `Records a Debt payment` was written with straight text while the code writes curly quotes, so it never
  matched either, and five more ledger phrases sat beside it. Both rows were widened, and every site
  they exposed was fixed.
- **Two screens disagreed with a third about the same figure**: the total under the INFLOW band said
  `= In` on Month detail and on Your retirement paycheck, while Cash flow one tap away said
  `Inflow (income (take-home))`. All three now say Inflow, and `/= In\b/` is retired.
- **The mocks now have a guard of their own.** `src/__tests__/mock_copy_on_canon.test.ts` reads the
  canon table and every live mock's phone frames. On its first run it found **20 more breaches across
  four mocks** — including in two files edited that same morning: "A usual month", "Gross a year",
  eleven money figures written "$3,300 a month", "work this out", "you told us", "lands in your bank",
  "Connected ·" and "WHAT YOU OWE". All fixed.
- **The tab bar in the mocks was not the tab bar in the app.** Every cash-flow frame drew a Menu tab
  that does not exist (Menu is the top-bar button), and the third tab as "Invest", renamed to
  **Performance** on 2026-08-04. Two code comments still said Invest too.

**The rule this leaves behind:** a mock approved before a ruling is not on the canon because it was
approved. When a word is ruled, every live mock that draws it is redrawn the same day, or the ruling
only reached the code.

---

## Net worth and Performance, audited 2026-09-26

The founder: *"go back and audit NW and Performance screens to make sure all is per standards, and
rulings."* Every rule in the screen standard that a machine can check was run over both screens, and
every static string the approved mocks draw was compared with every string the app can render.

**What holds.** The canon words (both screens, code and mocks) · the one-door list · screen titles at 20
points · the type scale and the 10.5-point floor · the colour tokens · hide-balances over every money
figure · the spoken-label count · Net worth against mock v08 — of its strings, the only ones the app
never renders are account names and a ticker, which are data, not design.

**What was wrong, and is now fixed.**
- **44 dark-green bars did not reach the edge of the card they head** (B-107), across 15 screens —
  including six on Cash flow that bled while ten beside them did not. `src/__tests__/guard_bands_edge_to_edge.test.ts`
  now reads each band's enclosing card and its padding, so the next one cannot slip past.
- **Four lines of approved mock v14 were never built** (B-108 to B-110): an empty category vanished from
  the account page instead of keeping its heading; the activity list never explained which records can be
  edited; a linked account's walk never said where its lines come from; the value line had no day-one
  caption. All four built, each with a test.
- **Every percentage on both screens now shows two decimals** (ruling Q49). The one-decimal ratchet is
  down from 48 sites to 31, and none of the 31 is on Net worth or Performance.

**What needs the founder.**
1. **"Sweep cash" or "Cash in the account"** — the same money, two of his own approvals (B-111).
2. **"tap the name to open this account's portfolio"** — drawn in mock v14, not built: it needs the band
   split into two tap targets, which is behaviour, not copy. Left unbuilt rather than printed and
   dishonoured.
3. **Rule 11** — 51 figures on Net worth and 24 on Performance print with no identifier. That is the
   orchestrator work, and every row of the map is still PROPOSED.

Mock v14's category legend and the built one also differ in wording: the mock says *"a /year figure is
that category's yearly pace"*, the build says *"A category with no records shows —, never a false $0"*
and adds the yearly-rate sentence only when the window is longer than a year. The build says more, and
says it only when it is true; the mock is the approved words. **Not changed either way — his call.**

---

## Cash flow, traced to its builds — 2026-09-27

Traced by the fingerprint method the moment `git` would answer again. **Build 54 (2026-09-01) is the
last build cut**, so anything approved after that date is designed and not shipped.

| Design | Built | Shipped in |
|---|---|---|
| **The four-tab surface** — one screen, four tabs, the separate Budget screen retired (now `cash-flow_v01`, drawn 2026-07-19) | `cd1e6c7`, 2026-07-21, *"THE CASH FLOW SURFACE BUILT (v1.3 FINAL, founder-approved): four tabs, income pop-up, month switcher, first-open doors; Budget screen retired"* | **Build 47** (cut `58ca55d`, 2026-07-31) |
| **The banded version of that surface** — deep-green section bands across all five tab screens | `9dea34a`, 2026-08-04, then the band sweep `b6340a5`, 2026-08-10 | **Build 53** (cut `4fcde07`, 2026-08-15) |
| **The income rebuild** — two earners, one tax engine, one rate, the base-pay screen and the filing-status question (`filing-status-question_v02`, `base-pay_v07`) | `6e360fb`, 2026-09-01 | **Build 54** (`6e360fb`, 2026-09-01) — on TestFlight |
| **This month + Spending, in detail** (`…_v06`, 2026-08-26 — now v07) | never built as drawn: the build shows three rows and puts the itemised rows on Month detail | **no build** — it is a workplan row |
| **Income end to end v06** (approved 2026-09-02, `addbf53`) and **v07** | after Build 54 | **no build** |
| **The tabs renamed to This month · Income · Expenses · Debts** | `983805a`, 2026-09-14 | **no build** |
| **Everything from 2026-09-26/27** — the canon words, the 44 bars, the two-decimal percentages, the four Performance lines | this session | **no build** |

**Look ahead** (`…_v04`) belongs to the What-if screen (/what-if), not a cash-flow tab. Corrected 2026-10-21: this line said it is opened from Performance. Its one door in the code is Contribution room (src/screens/ContributionRoomScreen.tsx, read 2026-10-21; the screen map shows /what-if with ONE DOOR); the drawing's back arrow says ‹ Performance, and the Performance tab has no door to it. The redesign it draws was recorded on 2026-07-19 (DEC-0001). No approval of v04 as the screen's design is recorded, and the What-if screen is not in Build 55's scope (Net worth, Cash flow, Performance). It is traced with that screen when its turn comes.

**What this table says plainly:** the app on TestFlight is Build 54. Three of the five cash-flow designs
in the folder, and every correction made since 2026-09-14, exist only in the code and in these files.
Nothing reaches a phone until the founder says "cut the build".

**2026-10-11 — drawing errors are corrected by a dated line, not a redraw (DEC-4529).** Net worth v08 (states B, E, F), Bonds v02, Other investments v02 and Holding detail v02 carry correction lines in their READ THIS FIRST boxes, each with what is drawn, what is right and the arithmetic.
