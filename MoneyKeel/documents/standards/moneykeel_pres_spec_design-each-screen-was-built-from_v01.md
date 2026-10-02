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

**Plan, 2026-09-26.** Three copies of `Plan.dc.html` exist in `August 14th Design/` and they DIFFER (`design_handoff_net_worth/` is the v4 one the design notes sit beside; `Claude-Design-handoff-received-2026-08-13/` and `A-instructions for claude/Plan screen/` are older). The one that counts now lives at `MoneyKeel/documents/plan/moneykeel_pres_mock_plan_v05.html`; the raw v4 is in that folder's `archive/`. Do not read the `August 14th Design/` copies for design truth again.

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

The file each next task on that screen starts from. It is updated the same day an approval changes it.

| Screen | Current approved design | Waiting for approval |
|---|---|---|
| Net worth | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html` — **ALL SEVEN FRAMES, A TO G, APPROVED 2026-10-01** (*"Quite Instrument v08 - approved all screens from A to G"*, DEC-0644). A with data by category · B all collapsed and the down case · C the first day · D the missing-data banner · E the change walk · F the fix sheet · G the add sheet. The screen itself was approved 2026-09-14 and built the same day; the four sheets had no approval on record until now, and none of them has been mock-matched. | — |
| Account portfolio | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_performance_v17.html` **frame 2, ACCOUNT PORTFOLIO — approved 2026-10-01** (*"Account detail screen should be same as Account Portfolio screen - use approved screen - Perf v17 #2"*, DEC-0646). It is ONE screen with one design: `account-detail_v01` drew the same surface differently and is **rejected**, dated into `archive/` on 2026-10-01. Frames 1, 3, 4 and 5 are the Performance module's and are approved too (*"I have already approved Perf v17 for perf module"*, DEC-0647). **BUILT 2026-10-01** as ONE file, src/screens/AccountPortfolioScreen.tsx (the old AccountDetailScreen.tsx is gone): frame 2 across the top — the five windows, the SUMMARY trio, the value line, this account's walk — and below it, in the drawing's own caption, *"its holdings, income and activity are v14's, unchanged"*: BY CATEGORY & HOLDING, the three record doors, ACTIVITY and the editors. app/account-detail.tsx opens it. Checked line by line against the drawing by account_portfolio_vs_mock.test.tsx: 11 of 11 sections; the v14 half by account_detail_v14.test.tsx. The day-one state follows the drawing's DAY ONE phone. | — |
| Add an account, by hand | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_add-account-by-hand_v02.html` — **approved 2026-10-01** (*"Add Account by hand v01 - approved"*, DEC-0645). It was drawn from the code as a reference and named "as built"; his approval makes it the design, so it carries the name of the thing rather than the stage it was drawn at. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** | — |
| Bonds | **APPROVED 2026-10-01** (*"Mark these three as approved as of now. Will need to review them in test flight"*, DEC-0650) — the approval is on the drawing; confirmation comes on a TestFlight build. `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_bonds_v02.html` — drawn 2026-10-01 from the screen's own code and tokens. Three states: with bonds · the first day · the editor. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** | — |
| Other investments | **APPROVED 2026-10-01** (*"Mark these three as approved as of now. Will need to review them in test flight"*, DEC-0650) — the approval is on the drawing; confirmation comes on a TestFlight build. `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_alternatives_v02.html` — drawn 2026-10-01. The screen is titled **Alternatives**; its route is `/other-investments`. Three states: with holdings · the first day · the editor. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** | — |
| Holding detail | **APPROVED 2026-10-01** (*"Mark these three as approved as of now. Will need to review them in test flight"*, DEC-0650) — the approval is on the drawing; confirmation comes on a TestFlight build. `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_holding-detail_v02.html` — drawn 2026-10-01. Three states: a priced holding · no live price · sold, with a window the price history cannot reach. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** | — |
| Itemize | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_itemize_v02.html` — drawn 2026-10-01 from the screen’s own code and tokens, three states on three phones (nothing placed · money left over · more placed than the account holds). Build 53 plus the only three visible changes since, all his rulings. — **TAKEN AS THE DESIGN 2026-10-01 on my decision, not his** (DEC-0651). He had been asked three times to approve a screen that no approved design reached; the way in was decided and built instead. **Its one door is on the Account portfolio**, shown when an account holds money with nothing recorded inside it. **v02 (2026-10-01) = v01 + his rule DEC-0354 applied: the MoneyKeel bar with ‹ Back at the top, in place of the navigator's empty or route-name header; v01 is archived.** | — to be reviewed with the other three on a TestFlight build |
| Look back | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_look-back_v01.html` — drawn 2026-10-01 from the screen's own code and tokens, two states on two phones (with prices · without). **APPROVED 2026-10-02** (*"approved."*, DEC-1069). The Performance tab and the Account portfolio are frames 1 and 2 of v17; Holding detail is Net worth's. | — |
| Performance | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_performance_v17.html` — **APPROVED IN FULL, ALL FIVE FRAMES, 2026-10-01** (*"I have already approved Perf v17 for perf module"*, DEC-0647). 1 Performance main, with a window being refused · 2 Account portfolio · 3 Day one, a linked account · 4 Day one, hand-entered · 5 No accounts yet. Every colour comes from the app’s own tokens (`src/utils/theme.ts`), and it adds the two states where the Return refuses and shows the exact yearly rate instead (his Q52 ruling, 2026-09-30). Frame 2 is also the approved design for the **Account detail** screen (DEC-0646) — one screen, one design. **WHAT IS BUILT IS v14** (approved 2026-09-25, built the same day, commit `727e22a`, now dated in `archive/`). v17 is newer than the build, so v17 is the design and the build is behind it: closing that gap is mine, not a question for him (his standing order, 2026-09-27). v10 to v15 are dated in `archive/`. | — |
| Plan | `MoneyKeel/documents/plan/moneykeel_pres_mock_plan_v06.html` — v05 with the founder's eight decisions applied (2026-09-26: *"Plan - Q1 - 8 - your recommendation approved"*), the five blockers fixed, every figure re-run at 1,000 futures, the words brought onto the canon, and every template placeholder filled so the file reads on its own. v04 and v05 are dated in `archive/`. **Not built:** the tab still shows the 2026-08-12 layout he rejected, and its code waits on the Q-PL-1 and Q-PL-2 doors. | Approval of v06 |
| Cash flow | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html` **frame 1, This month — APPROVED 2026-09-28** (*"Approved"*, DEC-0440: the four-tab architecture from v02 with This month and Expenses revised in v07; v02 and v07 are dated and archived). The folder also holds `income-end-to-end_v07`, `look-ahead_v04` and `filing-status-question_v03`, each with a "What changed from vNN, and why" block; where the architecture file and a detail file disagree, the detail file wins. **Traced 2026-09-27**; the per-screen rows below were added 2026-10-02 so step 1.a reads one row per screen. | — |
| Budget (Expenses · Debts) | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html` **frames 2 and 4 — APPROVED 2026-09-28** (DEC-0440). The Budget screen is embedded in the Cash flow tab as its Expenses and Debts sub-tabs; it has no route of its own. | — |
| Base pay | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frame 2, Your base pay — APPROVED** (v02 on 2026-08-27, *"yes"*, DEC-0177; v07 approved on 2026-09-02 per the file's own change block). | — |
| Income summary | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frame 5, Your income, all of it — APPROVED** (DEC-0177 lineage, v07 approved 2026-09-02). | — |
| Income manager | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frames 1 and 3 — APPROVED** (DEC-0177 lineage, v07 approved 2026-09-02): where the money comes from, and bonus, equity and the other sources. | — |
| Log income | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_log-income_v01.html` — drawn 2026-10-02 from the screen's own code (every string it renders for the worker sample household, with the app bar). **NOT YET APPROVED** — awaits his word. | — |
| Month detail | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_month-detail_v01.html` — drawn 2026-10-02 from the screen's own code (every string it renders for the worker sample household, with the app bar). **NOT YET APPROVED** — awaits his word. | — |
| Bill calendar | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v01.html` — drawn 2026-10-02 from the screen's own code (every string it renders for the worker sample household, with the app bar). **NOT YET APPROVED** — awaits his word. | — |
| Paycheck months | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_paycheck-months_v01.html` — drawn 2026-10-02 from the screen's own code (every string it renders for the retiree sample household, with the app bar). **NOT YET APPROVED** — awaits his word. | — |
| Monthly income | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_monthly-income_v01.html` — drawn 2026-10-02 from the screen's own code (every string it renders for the retiree sample household, with the app bar). **NOT YET APPROVED** — awaits his word. | — |
| Worth a look | `MoneyKeel/documents/cashflow/moneykeel_pres_mock_worth-a-look_v01.html` — drawn 2026-10-02 from the screen's own code (every string it renders for the worker sample household, with the app bar). **NOT YET APPROVED** — awaits his word. | — |

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

**Look ahead** (`…_v04`) belongs to the What-if screen, which is opened from Performance, not a cash-flow
tab; it is traced with that screen when its turn comes.

**What this table says plainly:** the app on TestFlight is Build 54. Three of the five cash-flow designs
in the folder, and every correction made since 2026-09-14, exist only in the code and in these files.
Nothing reaches a phone until the founder says "cut the build".
