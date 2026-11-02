# Build 55 pre-build checklist — open workplan rows (written 2026-11-02, from moneykeel_workplan.json)

Row number = position in the workplan (one tab, by date added). Status is the row's own.


## A. Rows that name Net worth, Performance or Cash flow — 46

| Row | Status | Task |
|---|---|---|
| 19 | TO DO | Brief: your 56 decisions — fixes B1–B8 (pensions, Social Security factors, legacy target, RMD age, RMD as income, odds calibration, money-market class, decimals), 14 metrics cut, D1–D7 builds, E corrections |
| 50 | WAITING ON YOU | Commit — the branch was 278 files behind on 2026-09-14; committed since: 983805a (catch-up), f0e1d6d (Net worth v08), c4f2679 (the Since crash), 727e22a (Performance v14). Nothing is pushed — the branch taxonomy-v1.0.7 i |
| 53 | WAITING ON YOU | Empty state, the last 8 of 58 rows (4 more do not apply — the holding page): Account detail (the classes and income inside one account — MK-NW-M-019/020/021); a past month that predates tracking (MK-CF-M-004); a goal row |
| 83 | WAITING ON YOU | Q-CF-2 'how much have I spent this month, against the plan, and what is left' — eight figures DRAFTED on MK-CF-O-003 thisMonth: expected inflow, planned outflow, planned surplus, each planned line, inflow so far, outflow |
| 91 | WAITING ON YOU | One door, one term: the three ways to add an account read 'Link it (read-only)', 'Add by hand' and 'Import from a file' on every screen, under the heading 'How do you want to add an account?' — Home, Sharpen your plan, t |
| 93 | WAITING ON YOU | MoneyKeel at the top of every screen — today only the five tab screens show it; every pushed screen (Import from File, Add by hand, Link an account, Sharpen your plan and the rest) has a native bar or none |
| 104 | WAITING ON YOU | Exact odds moved the amounts found by holding 80%: June's draw $4,155 → $4,140 a month (paycheck $8,155 → $8,140), a retiree's surplus $4,025 → $4,010, a future paycheck $2,460 → $2,455; Ray's claim at 70 now reads 79.5% |
| 120 | TO DO | Q-PL-2 — ‘What will my retirement paycheck be’ behind its own door: 10 figures, 88 functions, spilling onto Plan, Cash flow, Monthly income and Retirement. The Plan tab prints its paycheck, so this door and MK-PL-O-001 b |
| 121 | WAITING ON YOU | SEQUENCING DECISION — is the Plan tab’s CODE built against its doors (MK-PL-O-001 thePlan for Q-PL-1, and the Q-PL-2 door) or in front of them? Built in front, the screen is built twice and can still disagree with Home a |
| 127 | CODED, NOT VERIFIED | Cash flow · every screen brought onto the standards (words, bars, decimals) |
| 129 | CODED, NOT VERIFIED | Cash flow · This month — build the tab to the approved mock (itemised rows) |
| 130 | CODED, NOT VERIFIED | A dark-green bar that did not reach the edge — 44 of them, across 15 screens |
| 133 | CODED, NOT VERIFIED | Performance · "tap the name to open this account's portfolio" is drawn but not built |
| 137 | CODED, NOT VERIFIED | The orchestrator map asked about a conflict the code had already settled |
| 138 | CODED, NOT VERIFIED | The map never said the questions come from the code, not from his approved mockups |
| 151 | CODED, NOT VERIFIED | Orchestrators 7 and 8 of 12 — MK-PF-O-001 thePerformance (Q-PF-1) and MK-PF-O-002 theLookBack (Q-PF-2) |
| 152 | CODED, NOT VERIFIED | Orchestrators 9-12 of 12 — the four cash-flow questions that were not blocked |
| 161 | TESTED, NOT VERIFIED | MK-CF-M-037 Take-home each month — the total disagreed with its own lines by the spouse's 401(k); HE HAD ALREADY RULED IT (2026-09-12), so it is fixed |
| 162 | NICE TO HAVE — PARKED | NICE TO HAVE — the Income screen’s “=” row names money its lines do not: a server’s tips, a retiree’s pension |
| 168 | CODED, NOT VERIFIED | THE DECISION LOG IS BUILT AND COMPLETE — 591 decisions from all five sources, every one in plain English |
| 175 | WAITING ON YOU | LAUNCH ANSWER LIST — 61 things need you for Net worth, Cash flow and Performance to be launch-ready |
| 176 | TO DO | BEFORE THE NEXT BUILD — review and correct every underlying calculation for Net worth, Cash flow and Performance |
| 184 | DECIDED 2026-10-20 — option A, his words: "A. This was a que | Net worth — DEC-0299 "class and liquidity are separate fields": no liquidity field exists on an account |
| 192 | READY TO SEND — to-send/ holds the 25 files exactly as first | Outside test cases — two outside models check each formula and write the cases, so my functions are judged by someone other than me |
| 193 | OPEN — mine. (1) is FIXED 2026-10-04: the approved drawing d | Formulas that look wrong to me — seen while writing all 318 out; not changed |
| 195 | OPEN — mine. | Two drawings for one screen: retire filing-status-question_v03 |
| 215 | OPEN — mine, for the Plan build. | Plan and the tax on money coming out — an HSA is treated as a 401(k), a 529 as taxable |
| 216 | OPEN — for the Plan build. Nothing changed. | Plan build — the retirement money the Plan grows, and the rate it grows by, checked against his words of 2026-10-06 |
| 265 | TO DO | The $0 empty-state refusal of Q48 still prints over declared figures' own refusals |
| 282 | TO DO — with Cash flow, Menu and Plan | Metric register: duplicate IDs already in HEAD (MK-CF-M-001 to 004, MK-MN-M-011 and 013, MK-PL-M-023) |
| 292 | TO DO — at the integration run (build-all, then validate Per | Integration check: the approved drawings' figures still hold after W-START's F1/F2 change |
| 297 | WAITING ON YOU | Performance · account page v01 row 70: an account whose total was typed lists its holdings — awaits his approval |
| 307 | TO DO | 34 functions with no record outside the calculation folders |
| 320 | TO DO — on the next device build | A phone check of the two info dots moved beside their sentence |
| 348 | RECORDED 2026-10-26 — a breach of the mock-first order, name | Mock-first not kept in order: drawing rows written after the code (CF-MMFIX-A, FIX-TAX, FIX-BUDGET) |
| 349 | TO DO — on the next device build (the lead) | Phone checks owed — Net worth (the 2026-10-25 drawing match and its fixes) |
| 350 | TO DO — on the next device build (the lead) | Phone checks owed — Performance (the 2026-10-25 drawing match and its fixes) |
| 351 | TO DO — on the next device build (the lead) | Phone checks owed — Cash flow and its income screens (the 2026-10-25/26 fixes) |
| 380 | TO DO — the lead decides it from the record and takes the ma | Screen-design standard, line 69 (section 6, item 1): MoneyKeel at the top of screens opened from another screen |
| 381 | TO DO — the lead decides it from the record and takes the ma | Screen-design standard, line 80: a screen opened by a door is titled with the door’s words |
| 382 | TO DO — the lead decides it from the record and takes the ma | Screen-design standard, line 93: the heading above a set of doors |
| 384 | RECORDED 2026-10-31 — a breach of the mock-first order, name | Mock-first not kept in order, 2026-10-27/30: drawing rows written after the code, and screens changed with no drawing or to an archived one |
| 388 | TO DO — on the next device build | Phone check: Performance’s category rows at 15 points and the 104-wide Return column |
| 389 | TO DO — on the next device build | Phone check: Contribution room and the Stress test at larger text and in contrast |
| 391 | TO DO — on the next device build | Phone check: what the Net worth drawing match could not see (round 2) |
| 417 | TO DO — the owner of MoneySheets (FX-SHARED) | Remove the unreachable IncomeSheet in MoneySheets |

## B. All other open rows (Home, Plan, Menu, tooling) — 70

| Row | Status | Task |
|---|---|---|
| 1 | WAITING ON YOU | Live prices: the Tiingo key (price feed is seam-ready, no key) |
| 22 | TO DO | First master audit — 51 findings A01–A51: A09, A10, A11, A44 fixed; the other 47 are recorded on their master rows, not yet worked |
| 23 | TO DO | Formula audit — 25 findings B01–B25: B05 (401(k) taxed) fixed; B02, B03, B04 are file fixes; B01 (minimum-payment rule never built) and B06 (three return methods, one label) need your decision; B07–B25 not re-verified |
| 26 | TO DO | Function identifiers made permanent (register); a header on every function; guards B1 (header is a printed view) and B2 (formula agrees); build spec of 22 guards — 17 built, 1 partial, 4 to build |
| 27 | TO DO | Formulas read from the code onto every master row — 49 of 596 still read "NOT READ YET" (bodies the generator cannot render) |
| 32 | TO DO | Second verification — 14 rulings coded but without a named test: G14, G16, G18, G19, G20, G23, G25, G26, G27, G29, G33, G35, C2, C4 (plus Q07, A15 and the cash-flow worked example on the rulings tab) |
| 35 | WAITING ON YOU | Master questions Q34–Q45 and Q50 (your cash-flow example arithmetic) — open |
| 36 | WAITING ON YOU | Per-asset-class capture list — 15 items NOT CAPTURED, 4 DERIVED but blocked, 1 rule pending, 1 wrong until Q42 (options), display currency Q43 |
| 43 | WAITING ON YOU | Two of your earlier answers still open on their rows: the current-month rule for the essentials window (MK-CF-F-190) and where the Medicare question sits (MK-XS-I-062) |
| 46 | WAITING ON YOU | Four questions from the cluster work: #3 "spending" in prose (173 places), #11 the "Close position" button, #13 "plan for the lump sum" (my answer is on the row), #14 "/qtr", "/wk" labels |
| 47 | TO DO | One stale header: MK-CF-F-123 (the retired local-date helper) carries a header but has no master row |
| 48 | WAITING ON YOU | VERIFIED marks — 33 rulings, 18 cluster rows and 11 assessment rows stand at TESTED, NOT VERIFIED |
| 49 | TO DO | Build 55 — release gate: scope complete, audits closed, journey pass, checklist presented |
| 52 | WAITING ON YOU | Stand-in ages when the birth year is missing: the Retirement cockpit and Insights assume 45, the cash-flow model and the draw steer assume 68, the onboarding helper 35 (or 65 for the retirement age). Your rule R2 says an |
| 56 | WAITING ON YOU | One-door architecture — three decisions the spec leaves to you: (1) the pilot question, (2) does a door hand out figures only or also the walk behind them, (3) what doors are called |
| 57 | WAITING ON YOU | One-door architecture — step 1 for the pilot: the row (what it answers, formula in plain English, inputs, decisions, identifier, exact list of figures the door hands out) |
| 58 | TO DO | One-door architecture — will it last, MK-PL-O-001 thePlan: the row, then the door beside the old code, then 16 callers moved one at a time against the photograph, then the old doors closed |
| 65 | WAITING ON YOU | Orchestrator plan · phase 1d — Conflicts: every grouping conflict one row by identifier with a recommendation (two totals for one concept; a function under two questions; two functions for one concept; a figure the scree |
| 67 | WAITING ON YOU | Orchestrator plan · phase 1 gate — approve the Map, answer Conflicts, name the pilot question (proposed: Social Security timing) |
| 68 | TO DO | Orchestrator plan · phase 2 — the loop guards: one producer per figure row; the forward hop read from screen imports; the reverse hop generated from the rows; the trace test |
| 69 | TO DO | Orchestrator plan · phase 3 — the pilot question through the six steps (row → photograph → door → callers moved one at a time → old doors closed → reconcile) |
| 70 | TO DO | Orchestrator plan · phase 4 — will my money last: MK-PL-O-001 thePlan; the 16 files move behind the door |
| 71 | TO DO | Orchestrator plan · phase 5 — every remaining Map row by blast radius, one question at a time, same gate each |
| 72 | TO DO | Orchestrator plan · phase 6 — the walls: every ratchet at zero and turned into a wall; Calculation Module code/engines/ emptied and removed; the trace test over all figure rows |
| 73 | WAITING ON YOU | Orchestrator plan — proposed rule 11: a door DECLARES each figure by identifier beside the code that computes it, the screen prints only by identifier, and the builder generates the master's figure rows from those declar |
| 81 | WAITING ON YOU | The next questions to declare their figures — each one lowers the ratchet and takes its slice of the findings out of existence |
| 90 | TO DO | The design changelog has no row after 2026-09-02, although the same-day changelog standing order asks for one on every approval — the cluster rulings of 2026-09-10, the empty-state mock of 2026-09-12 and others are missi |
| 94 | TO DO | One standard for designing a new screen — every rule a screen and its mock must meet, in one document, so a mock is right before it reaches you (founder 2026-09-14: "We spent 5 hours trying to design one set of screens") |
| 96 | WAITING ON YOU | One standard for creating a new screen: every rule a screen and its mock must meet, in one document (founder 2026-09-14: "We spent 5 hours trying to design one set of screens") |
| 97 | WAITING ON YOU | The Plan tab does not match the Plan design you approved (Claude Design Plan v4, brief v3-2026-08-14, built for Build 53). Built from it: the two dials, the typed target, Retire / Goals / Prepare, 'Can I spend more?' in  |
| 103 | WAITING ON YOU | With the odds exact, the Retirement cockpit disagrees with Home and the Plan tab for the same household: the working household reads 13.3% in the cockpit and 13.9% on Home and Plan; the retired household reads 87.8 out o |
| 118 | WAITING ON YOU | Plan v06 — the five blockers fixed and every figure re-run at 1,000 futures: the below-yield mortgage frame ($6,304 → $5,814; $40,217 → $31,873), the spend-more bucket that says 9 in 10 where $2,500 is really 81%, the mo |
| 119 | WAITING ON YOU | Q-PL-3 — ‘When should I claim Social Security’ as the PILOT door: 4 figures, 3 functions, one screen (/ss-timing). The smallest thing on the Map that proves the six steps end to end, and its answer is a decision row insi |
| 124 | WAITING ON YOU | Plan · present value vs future value — the screen subtracts today’s pot from a target stated in the retirement year’s dollars, and called the result “today’s money” (founder, 2026-09-26). The simulation is nominal: spend |
| 135 | CODED, NOT VERIFIED | The orchestrator map asked him a question he could not answer |
| 136 | CODED, NOT VERIFIED | Every workbook he opens is now formatted to be read |
| 142 | CODED, NOT VERIFIED | The map said PROPOSED beside 13 questions he had already answered |
| 143 | CODED, NOT VERIFIED | His answers on the orchestrator map now reach every other file |
| 153 | CODED, NOT VERIFIED | Orchestrator 12 of 12 — MK-CF-O-009 theMonth (Q-CF-2) |
| 154 | CODED, NOT VERIFIED | The function MK-CF-O-002 is still named `spending`, a retired word |
| 155 | CODED, NOT VERIFIED | WHY the "work off the latest approved design" rule failed a third time — found, widened, gated |
| 156 | RULED, NOT CODED | The cash-flow mocks are one file |
| 157 | CODED, NOT VERIFIED | Ten live mocks had no <meta charset> — a browser had to guess |
| 163 | CODED, NOT VERIFIED | Every declared row on the master was shifted one column right, and its ROW VERIFIED text fell off the sheet |
| 164 | CODED, NOT VERIFIED | I hand-edited the workbook instead of its source, and the next build wiped four rows |
| 165 | TO DO | HOW HE CAN TRUST IT — the honest number: 195 of his 238 recorded decisions reach NO ruling, and I reported 'all 42 clean' an hour earlier because I built the gate from memory |
| 169 | TO DO | THE DECISION LOG’S OWN GAPS — 41 rows still need his wording, 248 name no test |
| 170 | CODED, NOT VERIFIED | WHAT IS THE DECISION? — all 591 rows written in plain English, and the gate keeps it that way |
| 171 | TO DO | PLAN — the 41 low-confidence decisions get his own words back (three steps, in order) |
| 172 | TO DO | PLAN — the 248 untested decisions get a test, worked BY KIND not one at a time |
| 173 | WAITING ON YOU | CONFIDENCE — 35 decisions need your wording; the list is ready and deliberately short |
| 174 | TO DO | TESTING — 169 of 591 decisions name a test; 422 do not, and each carries its own plan |
| 231 | PARKED by him 2026-10-10 (DEC-4082) until the Plan module | Risk swing for Will my money last: a weighted average of each account's swing overstates the mix (60/40 at 18%/6% reads 13.2%, about 11.5% is right) |
| 262 | TO DO | extract-decisions.py uses up about 22 decision numbers each run before merging them away |
| 309 | TO DO — with the Plan module | Plan: sign-up's retirement outlook works its own "needed" figure and its own growth, not Plan's MK-PL-F-055 projectNestEgg |
| 310 | TO DO — the lead's decision of 2026-10-24: not now | Add src/hooks to the function sweep (CALC_ROOTS) |
| 321 | TO DO | The info dot component (ⓘ) has no record of its own |
| 375 | TO DO — the Plan module round | The Plan tab’s target dial says the nest egg at retirement a third way |
| 376 | TO DO — a desktop drawing first (the desktop is web only, ou | The desktop sidebar still shows a typed K tile beside MoneyKeel |
| 377 | TO DO — the lead, before the device build | The Android notification icon is the full-colour icon |
| 378 | TO DO — the lead, with the pre-build checklist | The app icon is soft: his mark file is 460 pixels wide |
| 379 | TO DO — the lead decides it from the record and takes the ma | Screen-design standard, line 7 and section 6: the WAITING ON YOU marker and its section |
| 383 | TO DO — the lead decides it from the record and takes the ma | Screen-design standard, line 94 (section 6, item 2): one size for a sheet title |
| 390 | TO DO — on the next device build (the build gate holds it) | Phone check: his logo on the icon, the launch screen and the 84-point top-bar lettering |
| 400 | TO DO — the Plan module round | Plan v06, Mark 5: the mortgage consequence has no figure — it needs a second full simulation |
| 401 | TO DO — from 2026-10-31 (the lead); the marking follows his  | Nothing goes to him for review until the build is ready; his TestFlight review approves the screens he passes, with their drawings (his decision of 2026-10-31, DEC-9228) |
| 407 | TO DO — after his TestFlight review (the lead) | Remove the dead GoalsScreen.tsx and its goals_drawing_v02 test after his TestFlight review |
| 408 | TO DO — the lead (not deleted now) | A stray probe, src/__tests__/zz_nwx.test.tsx, asserts nothing |
| 416 | TO DO — on the next device build (the build gate holds it) | Phone check: the hourly take-home repair on his and the testers’ profiles |
| 425 | TO DO — after the build (the lead) | The round-7 drawing-match audit runs after the TestFlight build (his order of 2026-11-02) |