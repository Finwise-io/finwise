# Which design each screen was built from, by build

**Version 01 · 2026-09-14**

**Why this exists.** The founder asked on 2026-09-14: *"Do you not keep track of mock you use to build 53."* Nothing recorded it. The Build 54 commit (2026-09-01) moved the `mockups/` folder into `MoneyKeel/documents/` under the file-naming standard. It filed the Build 53 finals under `archive/` with a date, and a dated file in `archive/` means "replaced". They were not replaced. The next mock therefore started from the wrong files and cost six hours.

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

## Screens not yet recorded

Home and every screen opened from another screen still need their Build 53 design traced by the same method. (Cash flow's designs ARE approved and filed — see the table below; what it lacks is the traced link from a build to a mock.) Until then, a task that touches one of them starts by tracing it.

## The current approved design, by screen

The file each next task on that screen starts from. It is updated the same day an approval changes it.

| Screen | Current approved design | Waiting for approval |
|---|---|---|
| Net worth | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html` (approved 2026-09-14; built the same day) | — |
| Performance | `MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_performance_v14.html` — **APPROVED 2026-09-25** (*"approved. save and built it"*) and **BUILT the same day** (commit `727e22a`). It carries Performance FINAL of 2026-08-04 plus every ruling since: the window selector as one control with two lines per segment, one meaning of return, a Y axis on the value line, day one rebuilt from a linked account's own records, the account page's Market value · Wealth generated · Return with its own walk and a return per holding, and the older Invest sections removed. v10 to v13 are dated in `archive/`. | — |
| Plan | `MoneyKeel/documents/plan/moneykeel_pres_mock_plan_v06.html` — v05 with the founder's eight decisions applied (2026-09-26: *"Plan - Q1 - 8 - your recommendation approved"*), the five blockers fixed, every figure re-run at 1,000 futures, the words brought onto the canon, and every template placeholder filled so the file reads on its own. v04 and v05 are dated in `archive/`. **Not built:** the tab still shows the 2026-08-12 layout he rejected, and its code waits on the Q-PL-1 and Q-PL-2 doors. | Approval of v06 |
| Cash flow | **Approved, and filed all along — I reported it as "not recorded" on 2026-09-26 by reading only this file.** `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` (income end to end; v4, v5 and v6 each approved in the changelog — v6 on 2026-09-02, "Mock v6 approved and live" — and v07 is that mock with the canon words applied on 2026-09-12: "a one-time payment", "/year", "/month"), `…_cash-flow-this-month-and-spending_v06.html` (This month + Spending, 2026-08-26), `…_look-ahead_v03.html`, `…_money-four-tabs_v01.html`. **What is genuinely missing is the traceability**: which build shipped which of these, by the fingerprint method. | The v07 file still carries a v6 eyebrow — does it supersede v06, or is it v06 with the words fixed? |
