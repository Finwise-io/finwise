# How to create a screen — the MoneyKeel screen standard

**Version 01 · 2026-09-14 · DRAFT, waiting for the founder's yes**

The founder, 2026-09-14: *"We spent 5 hours trying to design one set of screens"* and *"You are consistently relying on me to tell what's wrong, versus doing it right the first time."*

This document holds every rule a new or changed screen must meet, and the order in which the work is done. It is the checklist walked before any mock or screen reaches the founder. Each rule names where it was decided, where it lives in the code, and what checks it. A rule marked **PROPOSED** is drawn in a mock but not yet approved. A rule marked **WAITING ON YOU** needs a ruling.

---

## 1. The steps, in order

0. **Start from the last approved version — never from today's code, never from scratch** (founder, 2026-09-14: *"Shouldn't you have started from version I last approved or build 53? Wasted 6 hours, re-inventing the wheel."*). For every screen the task touches:
   - find the last design the founder approved for it (the approved mock, the Claude Design handoff and its brief such as `August 14th Design/`, the Changelog row that says APPROVED, the rulings ledger) and the build that shipped it;
   - compare today's code with that design, strings in order and structure;
   - report every difference to the founder **before drawing anything**. A difference is a defect, never a "today" to design on top of.

   The "as it will be built" column starts from the approved design plus every ruling made after it. The "today" column shows the code.

   **THIS RULE IS NOT ONLY ABOUT DRAWING (widened 2026-09-28).** The founder: *"go an check the rule
   which requires you to work off latest approved design and files - as you said last two times in two
   days that it is fixed and will not happen again and it happened again."* It did, and for two reasons
   that are not "I forgot":

   - **It was scoped to screens and mocks.** This document opens "every rule a new or changed SCREEN
     must meet… walked before any MOCK OR SCREEN reaches the founder", and step 0 says "for every
     SCREEN the task touches". Writing down WHAT A SCREEN ANSWERS — the orchestrator map's questions —
     draws no mock and changes no screen, so the rule never fired. Both misses came out of that gap:
     Q-CF-1 (base pay vs income summary) and Q-CF-2 (This month vs Expenses) were written from the
     CODE, and both times the answer was already in a design he had approved.
   - **Nothing enforced it.** Every rule here that holds is held by a test that fails the build. This
     one was held by my memory, which is exactly what failed — twice in two days.

   So it now covers **any work that says what a screen shows or answers**: a mock, a screen, a figure's
   row, a question on the orchestrator map, a line in the working plan. And it is gated:
   `Calculation Module code/scripts/check-read-from-approved.py`, step B5 of the build. A question
   about a screen that HAS an approved design must record which design it was read from and when, in
   `read_from`; the build fails otherwise. Two questions are on a ratchet, owed and named, and nothing
   may join them.

   **When the gate was first run it found 11 questions describing screens with an approved design, and
   not one of them cited it.** That is the size of the thing, and it was never two mistakes.
1. **Read before drawing.** For the screen and each of its data states, read:
   - the words the screen shows, from the screen census (`Calculation Module code/scripts/moneykeel_figure_census.json`, written by `src/__tests__/figure_census.test.tsx`);
   - the size, weight and colour of every text style, from the screen's own StyleSheet;
   - what sits above the screen: `src/components/TopBar.tsx` on the five tab screens, or the native header set in `app/_layout.tsx`;
   - the rulings ledger entries for that screen, the one-term canon, and the door list.

   If a fact is uncertain, the code settles it, never an older mock.
2. **Draw the mock** by the rules in section 3.
3. **Audit the mock** against the checklist in section 5, on a screenshot, frame by frame, and fix what fails. The mock carries a "Checked before sending" list at the top, and every item on that list was actually looked at.
4. **Send it.** Say exactly what to approve: "say yes, or name a screen and a mark number."
5. **Record the approval the same day** in three places (section 4).
6. **Build it with a test.** When a rule can be broken again by someone else's change, add a guard test that fails when it is.
7. **Run the mock-match audit** in every data state (`docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md`). The audit compares every visible string in order, then the appearance.
8. **Report done with a coverage line** ("did X on N of N screens"). The ledger status moves from CODED to TESTED. Only the founder's mark makes a row VERIFIED.
9. **Nothing ships** until the founder says "cut the build".

---

## 2. The rules every screen meets

### 2.1 The top of the screen

| Rule | Where it lives | Checked by |
|---|---|---|
| The status bar comes first, then the MoneyKeel top bar. | — | the checklist |
| **Tab screens** (Home, Net worth, Performance, Cash flow, Plan) show the top bar: Menu on the left, the MoneyKeel wordmark, then the hide-balances eye and the settings button on the right. Built. | `src/components/TopBar.tsx` (decided 2026-07-12) | the checklist |
| **Screens opened from another screen** also show MoneyKeel at the top (founder, 2026-09-14: *"every other screen has"* it). **PROPOSED:** "‹ Back" takes the place of "Menu", and the eye and settings buttons stay. Drawn in mock v10. **Not built.** Today these screens show the plain native header, with its title at 17 points. | `app/_layout.tsx` today; `MoneyKeel/documents/home-screen/moneykeel_pres_mock_ways-to-add-an-account_v10.html` | **WAITING ON YOU** (section 6, item 1) |
| The tab bar shows on the five tab screens only. | `app/(tabs)/_layout.tsx` | the checklist |

### 2.2 The title

| Rule | Where it lives | Checked by |
|---|---|---|
| A screen does not need a title (founder, 2026-09-14). The Net worth tab has none. | ruling "Screen title size — 20 points" | — |
| When a screen has a title, the title is **20 points, weight 800** (`Typography.sizes.lg`). Set on 2026-09-14 on 38 title styles, in every screen that has one. | `src/screens/*.tsx` | `src/__tests__/guard_screen_title_size.test.ts` |
| A screen has one title, and nothing else on the screen repeats it (founder, 2026-09-14, import screen). | — | the checklist |
| A mock never invents a title the code does not have. | — | the checklist |
| **PROPOSED:** a screen opened by a door is titled with that door's words ("Add by hand" opens "Add by hand"), so nobody is asked the same thing twice. Drawn in mock v10. | mock v10, section 9 | WAITING ON YOU (mock v10) |
| A large figure at the top of a screen is a figure, not a title. It keeps its hero size of 38 or 30 points. | `Typography.sizes.hero`, `xxl` | the title guard lists the figures it leaves alone |

### 2.3 Headings inside a screen

| Rule | Where it lives | Checked by |
|---|---|---|
| **The full band** has a deep-green fill (`primaryDeep` #085041), white capitals at 11 points weight 800, and a total at 15 points on the right. On most screens it is used only for a group that shows its own total (Plan heading rule, 2026-08-13). **On Net worth (founder, 2026-09-14): *"dark bars for section headings and light green for sub-headings"*** — its five sections (your net worth, your retirement plan, what you own, debts, emergency fund) wear the dark bar and its groups (Cash, Investments, Personal property, each institution) the light-green bar, as ruled 2026-08-11 and confirmed with v06. WAITING ON YOU: whether this also replaces the quiet labels on the Plan tab. | `src/components/SectionBand.tsx` (founder, 2026-08-04, 2026-08-11 and 2026-08-13) | the checklist |
| A dark-green bar **always runs edge to edge with square corners**, in the app and in every mock, change marks included (founder, 2026-09-14). | `SectionBand.tsx` | the checklist |
| **The one named exception:** the import screen's title is "Import from File" on a dark-green bar at the top, with no total (founder, 2026-09-14). | mock v10, section 9 | — |
| **The light band** has a light-green fill (`bandLight` #DFF2E9) and deep-green text. It is used for a group inside a full band, for example Cash inside What you own. | `SectionBand.tsx` `light` | the checklist |
| **The quiet label** is deep-green capitals, 11 points, weight 800, with no fill. It is used for a section that has no total. The label uses deep green because the brand green measures 3.78 to 1 on the page and fails the contrast floor. | `SectionBand.tsx` `quiet` (2026-08-13) | the checklist |
| **PROPOSED:** the heading above a set of doors is "How do you want to add an account?", as a quiet label on a screen and as the sheet title on a sheet. | mock v10 | WAITING ON YOU (mock v10) |
| **Sheet title size is not yet ruled.** Today sheets use two sizes (section 6, item 2). | — | WAITING ON YOU |

### 2.4 Type and reading at 65 and over

| Rule | Where it lives | Checked by |
|---|---|---|
| **ONE PHONE PER SCREEN, in its final state.** A mock never draws the old version of a screen beside the new one, and never draws two candidate designs for the same screen. Earlier versions live in `archive/` and nowhere else. | founder, 2026-09-30 | the checklist |
| Sizes come from the scale only: 11 · 13 · 15 · 17 · 20 · 24 · 30 · 38. | `src/utils/theme.ts` `Typography.sizes` | the checklist |
| No text is smaller than 10.5 points. Only the tab-bar labels use 10.5. | UX design v1.2, "Type & readability 65+" | `src/__tests__/type_floor_guard.test.ts` |
| A money figure is at least 17 points. Reference tables may use 12 to 15 points (founder amendment, 2026-07-15). | UX design v1.2 | the checklist |
| One hero figure per screen, at 38 or 30 points. | UX design v1.2 | the checklist |
| A column of figures uses fixed-width digits, so the digits line up. | `fontVariant: ['tabular-nums']` | the checklist |
| Contrast: body text at least 4.5 to 1, large figures at least 3 to 1, small date stamps at least 4.5 to 1. | UX design v1.2, accessibility check 4 | the checklist |
| The screen survives the larger text settings, in the app and on the phone, without clipping. | accessibility check 2 | device screenshot |

### 2.5 Colour

| Rule | Where it lives | Checked by |
|---|---|---|
| Colours come from the theme tokens only. No raw colour code appears on a screen. | `src/utils/theme.ts` | `src/__tests__/color_token_guard.test.ts` |
| Colour never carries meaning alone: a word or an icon travels with it ("Up $11.2k ▲", never just a green number). | UX design v1.2, Color tab | the checklist (grayscale look) |
| Brand green #178F6B is for buttons and the active tab. Deep green #085041 is for bands and quiet labels. The page is #F6F7F5, with white cards. | `theme.ts` | the checklist |
| Charts use the validated palette only. | UX design v1.2, Color tab | the checklist |

### 2.6 Words

| Rule | Where it lives | Checked by |
|---|---|---|
| **One term per concept.** Each concept has one word in every string, and synonyms are retired. | `MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md`, the canon table | `src/__tests__/one_term_per_concept.test.ts` |
| **One door, one term, one destination.** A way in has the same words and opens the same place on every screen, and every door comes from one list. | `src/constants/doors.ts` (`DOORS`, `EMPTY_DOORS`) | `src/__tests__/guard_one_list_of_doors.test.ts` |
| Every sentence names its subject ("the take-home above is higher…", never "this reads high"). | standing order, 2026-09-12 | the checklist |
| The word "safe" is never used about money (founder, 2026-08-12). | — | `src/__tests__/banned_word_guard.test.ts` |
| Plain English. A finance term carries the ⓘ explanation. | `InfoDot`, `src/components/UI.tsx` | the checklist |

### 2.7 Numbers

| Rule | Where it lives | Checked by |
|---|---|---|
| Every figure a screen shows is declared in the code and printed through `fig`, `figPer` or `figSpoken` (rule 11). The master file prints the figure's row from that declaration. | `src/components/figure.ts`, `MoneyKeel/functions/` | `src/__tests__/guard_figures_declared.test.ts` |
| Calculations run at full precision, and rounding happens once, at display (ruling Q49). | `moneykeel_calc_spec_precision-and-display_v01.md` | `src/__tests__/precision_guard.test.ts` |
| **Nothing entered yet** (ruling Q48): a figure with nothing behind it shows $0, then "Nothing entered yet." and the door to add it. A zero that was entered shows a plain $0. | `EmptyNote` in `src/components/UI.tsx`; mock `moneykeel_pres_mock_empty-state-pattern_v01.html` (approved 2026-09-12) | `src/screens/__tests__/empty_state_q48*.test.tsx` |
| The same figure shows the same number on every screen. | — | `src/__tests__/guard_d3_screens_agree.test.tsx` (covers two shared figures so far; the rest are checked by hand) |
| With hide balances on, no amount appears anywhere on the screen, including spoken labels. | accessibility check 7 | the checklist |
| An estimate wears the estimate label, and a number that can go stale shows its age. | accessibility checks 8 and 9 | the checklist |
| The numbers in a mock add up, and the sum is written under the section heading. | mock-first standing order | the checklist |

### 2.8 Touch, sound and keyboard

| Rule | Where it lives | Checked by |
|---|---|---|
| Nothing tappable is smaller than 44 by 44 points. List rows are at least 52 points. Nothing works by gesture alone. | accessibility check 5 | the checklist |
| Every tappable thing has a spoken label. | — | `src/__tests__/a11y_guard.test.ts` (a count that can only go down) |
| Every money figure has a spoken label that says what it is. | accessibility check 1 | the checklist |
| A screen with a text box handles the keyboard, so its buttons stay visible when the keyboard is open. | — | `src/__tests__/keyboard_guard.test.ts` (checks the handling is there; a device screenshot checks the buttons) |
| Reduce motion turns off count-ups, bar fills and sheet springs. | accessibility check 6 | the checklist |

### 2.9 Every screen can be reached

| Rule | Where it lives | Checked by |
|---|---|---|
| Every registered screen has at least one door a person can tap. The screen map is regenerated before every build. | `scripts/screen-map.mjs` | `src/__tests__/orphan_route_guard.test.ts` |

---

## 3. How a mock is drawn

1. **Name and place.** A mock is saved as `MoneyKeel/documents/<area>/moneykeel_pres_mock_<descriptor>_vNN.html` and is never overwritten. The version it replaces moves to that folder's `archive/` as `YYYY-MM-DD_<its name>`. The folder's README points at the live version, and the ledger and workplan references move with it.
2. **Drawn from the code, never from an older mock.** Words come from the census, and sizes, weights and colours from the screen's StyleSheet. The top of the frame comes from `TopBar.tsx` or the native header. An older mock is a reference for page layout only.
3. **Full colour, real tokens, the full screen:** status bar, top bar, title, every section and the tab bar, top to bottom. Never a cropped card.
4. **Two columns per screen.** "Today" is exactly what the code draws. "As it will be built" is the proposal.
5. **Every data state that changes:** the first day with nothing entered, and a person with accounts. The numbers add up.
6. **Every change carries an orange numbered mark that sits inside the element.** A mark on a dark-green bar keeps the bar square and edge to edge. Each mark is explained beside the screen, and a choice of mine is named as mine.
7. **The top of the mock has three blocks:** what to approve; what changed from the last version; and the "Checked before sending" list.

---

## 4. Where an approval is recorded — the same day

| What | Where |
|---|---|
| The ruling and its status (RULED → CODED → TESTED → VERIFIED) | `Calculation Module code/scripts/moneykeel_rulings.json`, printed on the master's `rulings` tab |
| A dated row: date, sheet, change, why, approved by | the Changelog tab of `docs/FCC-core-55-70/FCC-core-detailed-design-v1.3-2026-08-14.xlsx` |
| The task and who it waits on | `Calculation Module code/scripts/moneykeel_workplan.json`, printed as `MoneyKeel/documents/other/moneykeel_calc_plan_workplan_v01.xlsx` |
| The founder's feedback files | folded in by Post Feedback Sync, then archived |

---

## 5. The checklist — walked on the screenshot before anything is sent

- [ ] 0. Every screen in the mock was started from its last approved design, the approval is named on the mock, and every place the code differs from that design was reported first.
- [ ] 1. Every frame shows the status bar and the MoneyKeel top bar: Menu on tab screens, and the ruled form on screens opened from another screen. The tab bar shows on tab screens only.
- [ ] 2. Every title is 20 points and appears once. No frame shows a title the code does not have.
- [ ] 3. Every dark-green bar runs edge to edge, with square corners and capitals, and sits on a group that shows its total (or is the named exception).
- [ ] 4. A section without a total uses the quiet label, and a sheet uses its sheet title.
- [ ] 5. Every size is on the scale. Nothing is under 10.5 points, and money is at least 17 points outside reference tables.
- [ ] 6. The words match the canon. Every door has the same words and the same destination everywhere. Every sentence names its subject, and "safe" never appears about money.
- [ ] 7. The numbers add up. A figure with nothing behind it reads $0, then "Nothing entered yet." and its door.
- [ ] 8. Every "today" frame matches the code: census words, StyleSheet sizes, and what sits above it.
- [ ] 9. Every data state that changes is drawn.
- [ ] 10. Every change is marked, and every mark is explained. The marks sit inside their elements, and the bars stay square.
- [ ] 11. The colours are the tokens, and no meaning rests on colour alone.
- [ ] 12. Tap targets are drawn at 44 points, and rows at 52.
- [ ] 13. The file name, version, archive copy, README, ledger and workplan references are all updated.
- [ ] 14. The page has no broken markup and reads at phone width.
- [ ] 15. The "Checked before sending" list on the mock names these checks, and each one was done.

---

## 6. Waiting on you

1. **MoneyKeel at the top of screens opened from another screen.** Mock v10 draws it with "‹ Back" in place of "Menu", and keeps the eye and settings buttons. When this is built, each screen's native header goes. A screen whose header carried a title (for example "Month detail" or "Will my money last?") then shows that title inside the screen at 20 points, and each one is drawn before it is built. Say yes, or say what changes.
2. **One size for a sheet title.** My recommendation is **20 points, the same as a screen title**, because a sheet takes the screen's place while it is open, and the Add expense sheet already uses 20. The files that open a sheet show these titles today:
   - **At 20 points:** "Add expense", "Pay {debt}" and "Put your {label} surplus to work" (`src/components/MoneySheets.tsx`) · "Where the draw comes from" (`DrawSteerSheet.tsx`) · "Save your recovery code" (`RecoveryCodeModal.tsx`) · "Restore your data" (`AuthScreen.tsx`) · "Confirm account deletion" (`SettingsScreen.tsx`).
   - **At 17 points:** the shared keyboard sheet with "Edit account" and its step titles, "Add a big cost" and "Add debt" (`KeyboardAwareSheet.tsx`) · the "Use this plan?" sheet (`UseThisPlanSheet.tsx`) · Account detail's "{action} — {account}", "Update value — {account}" and "{activity} — you entered this" · the Insights detail sheet · the data-gaps sheet · Budget's "New category", "Log payment", "Monthly limits" and "Recurring" · Settings' "Send feedback" · the ⓘ explanation's title.

   This list came from reading the files that open a sheet. Each sheet will be checked on screen before the ruling is coded. Say "20", or name another size.
3. **The ways-to-add-an-account mock v10** (the three doors, their heading, the titles behind them, and the wording check "Import from a file" against "Import from File"). Say yes, or name a screen and a mark.
