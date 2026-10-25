# Outside test cases — what to send, and what comes back

MoneyKeel · calculation audit · built by `Calculation Module code/scripts/build-outside-test-cards.py` — hand edits die

## How to use this

1. Open a new chat with the model. Paste the whole of one file from `to-send/`. Each file is the brief followed by its cards.
2. Give the same file to the other model in its own new chat. Neither sees the other's reply.
3. Save each reply, unchanged, in `returned/` as `<the batch file's name>_claude.json` or `…_gemini.json`.

## What is in the pack

- Read from the code: 223 files, 358 function and orchestrator records in Net worth, Performance and Cash flow.
- To be judged and tested: **315 cards in 26 files — 315 formula checks and 1,575 cases from each model.**
- Every card carries its formula in words: 315 of 315. Figures stated in those formulas: 470, each traced to the function it describes or checked by hand and recorded.
- Left out, each for a stated reason: 43 (listed at the foot).

| File | Batch | Cards | Cases | First and last card |
|---|---|---|---|---|
| `moneykeel_audit_cards_networth_01-of-06.md` | networth 01 | 6 | 30 | MK-NW-O-001 theBonds … MK-NW-O-006 theHolding |
| `moneykeel_audit_cards_networth_02-of-06.md` | networth 02 | 15 | 75 | MK-NW-F-001 isAlternative … MK-NW-F-028 classPortionLabel |
| `moneykeel_audit_cards_networth_03-of-06.md` | networth 03 | 15 | 75 | MK-NW-F-029 assetAllocation … MK-NW-F-052 buildItemizedAccounts |
| `moneykeel_audit_cards_networth_04-of-06.md` | networth 04 | 15 | 75 | MK-NW-F-055 isBond … MK-NW-F-035 blendedVolatility |
| `moneykeel_audit_cards_networth_05-of-06.md` | networth 05 | 15 | 75 | MK-NW-F-038 earmarkedKinds … MK-NW-F-065 buildNetWorth |
| `moneykeel_audit_cards_networth_06-of-06.md` | networth 06 | 12 | 60 | MK-NW-F-066 sumWhere … MK-NW-F-067 plural |
| `moneykeel_audit_cards_performance_01-of-04.md` | performance 01 | 2 | 10 | MK-NW-O-007 theLookBack … MK-NW-O-008 thePerformance |
| `moneykeel_audit_cards_performance_02-of-04.md` | performance 02 | 15 | 75 | MK-NW-F-084 categoryEarnings … MK-PF-F-020 portfolioBenchReturn |
| `moneykeel_audit_cards_performance_03-of-04.md` | performance 03 | 15 | 75 | MK-PF-F-033 quantityWithUnit … MK-PF-F-022 factorOverMonths |
| `moneykeel_audit_cards_performance_04-of-04.md` | performance 04 | 6 | 30 | MK-PF-F-023 lookBack … MK-PF-F-034 closeOnOrBefore |
| `to-send/MoneyKeel_CashFlow_Audit_Package/` (and its .zip) | cashflow module v01 — replaces the Cash flow batches | 219 | 1,095 | 19 parts — see "The Cash flow package" below |

## Left out of the pack

| Function | Why no cases are asked for |
|---|---|
| Cash flow | listed with the reason in the package brief `moneykeel_audit_module_cf_for-openai_v01.md`, section "Not on a card" (22 on 2026-10-24) |
| MK-NW-F-042 loadAssets | storage only — it reads or saves and does no arithmetic |
| MK-NW-F-043 saveAssets | storage only — it reads or saves and does no arithmetic |
| MK-NW-F-075 ACC | an example helper — it runs another function on a worked example |
| MK-NW-F-076 ALT | an example helper — it runs another function on a worked example |
| MK-NW-F-077 ALL | an example helper — it runs another function on a worked example |
| MK-NW-F-078 ONE | an example helper — it runs another function on a worked example |
| MK-NW-F-079 EF | an example helper — it runs another function on a worked example |
| MK-NW-F-080 HOLD | an example helper — it runs another function on a worked example |
| MK-NW-F-081 LB | an example helper — it runs another function on a worked example |
| MK-NW-F-082 NW | an example helper — it runs another function on a worked example |
| MK-NW-F-083 PERF | an example helper — it runs another function on a worked example |
| MK-NW-F-085 PERF_ONE | an example helper — it runs another function on a worked example |
| MK-NW-F-086 CATS | an example helper — it runs another function on a worked example |
| MK-NW-F-087 CAT | an example helper — it runs another function on a worked example |
| MK-NW-F-088 BENCH | an example helper — it runs another function on a worked example |
| MK-NW-F-093 QUIET_PERF | an example helper — it runs another function on a worked example |
| MK-NW-F-095 CLASS_LABEL_OF | an example helper — it runs another function on a worked example |
| MK-NW-F-096 CLASS_KEY_OF | an example helper — it runs another function on a worked example |
| MK-NW-F-097 LEDGER | an example helper — it runs another function on a worked example |
| MK-NW-F-098 LEDGER_BAND | an example helper — it runs another function on a worked example |
| MK-NW-F-099 SNAP | an example helper — it runs another function on a worked example |
| MK-NW-F-100 TREND | an example helper — it runs another function on a worked example |
| MK-NW-F-101 PLAN | an example helper — it runs another function on a worked example |

<!-- THE CASH FLOW PACKAGE — this section and the two Cash flow rows above are written by moneykeel_audit_package.py on each build of the package -->

## The Cash flow package — what to send for Cash flow

Built 2026-10-24 by `build-outside-test-cards.py --audit-package CF`, checked by `check-outside-audit-package.py`, which zips it only when every check passes. It replaces the Cash flow batch files above: the fifteen of 2026-10-04 that were on disk are in `to-send/archive/` under that date.

- Folder: `to-send/MoneyKeel_CashFlow_Audit_Package/`, and `to-send/MoneyKeel_CashFlow_Audit_Package.zip`.
- 227 functions and 14 orchestrators: 219 on cards (1,095 cases asked for), 22 listed with the reason; 67 figures; 175 decisions of his that govern it.
- How to send: one new chat for each part. Paste the brief `moneykeel_audit_module_cf_for-openai_v01.md` and the part. For parts 13, 15, 16, 17 add `moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json`. Save each reply, unchanged, in `returned/`.
- Once sent, the folder and the zip move to `to-send/archive/` under the date they were sent.

| Part | File | What it covers | Cards | Cases |
|---|---|---|---|---|
| 1 | `moneykeel_audit_module_cf_for-openai_v01_part-01-of-19.md` | Wages — what is paid, in which months, and the year it makes | 15 | 75 |
| 2 | `moneykeel_audit_module_cf_for-openai_v01_part-02-of-19.md` | Earners, and a salary that varies month to month | 14 | 70 |
| 3 | `moneykeel_audit_module_cf_for-openai_v01_part-03-of-19.md` | Stock that vests, and rent from a property | 11 | 55 |
| 4 | `moneykeel_audit_module_cf_for-openai_v01_part-04-of-19.md` | Benefits, retirement income and other income | 10 | 50 |
| 5 | `moneykeel_audit_module_cf_for-openai_v01_part-05-of-19.md` | The income summary, the income manager, and income paid by accounts | 15 | 75 |
| 6 | `moneykeel_audit_module_cf_for-openai_v01_part-06-of-19.md` | The budget, and the Expenses tab | 14 | 70 |
| 7 | `moneykeel_audit_module_cf_for-openai_v01_part-07-of-19.md` | Essentials, savings by month, and the budget against what was spent | 12 | 60 |
| 8 | `moneykeel_audit_module_cf_for-openai_v01_part-08-of-19.md` | Bills ahead, what is coming, and the credit line | 11 | 55 |
| 9 | `moneykeel_audit_module_cf_for-openai_v01_part-09-of-19.md` | Debts — payments, balances and paying them off | 15 | 75 |
| 10 | `moneykeel_audit_module_cf_for-openai_v01_part-10-of-19.md` | Debts — credit, kinds of debt, and a mortgage against a Treasury | 13 | 65 |
| 11 | `moneykeel_audit_module_cf_for-openai_v01_part-11-of-19.md` | Recording a transaction — cash, holdings and undo | 14 | 70 |
| 12 | `moneykeel_audit_module_cf_for-openai_v01_part-12-of-19.md` | Transactions — undo, labels, cash effect, income from holdings, and review flags | 11 | 55 |
| 13 | `moneykeel_audit_module_cf_for-openai_v01_part-13-of-19.md` | Contribution limits, room left this year, and the future paycheck | 14 | 70 |
| 14 | `moneykeel_audit_module_cf_for-openai_v01_part-14-of-19.md` | This month — the plan and what has happened | 15 | 75 |
| 15 | `moneykeel_audit_module_cf_for-openai_v01_part-15-of-19.md` | Base pay — gross, take-home, and the rate of tax in force | 14 | 70 |
| 16 | `moneykeel_audit_module_cf_for-openai_v01_part-16-of-19.md` | Federal tax — the 2026 tables, the deductions and the bands | 11 | 55 |
| 17 | `moneykeel_audit_module_cf_for-openai_v01_part-17-of-19.md` | Tax on the household — what is taxed, the filing status, the rates, and the tax organizer | 10 | 50 |
| 18 | `moneykeel_audit_module_cf_for-openai_v01_part-18-of-19.md` | The screens — the Cash flow tab, its four tabs, and Home's box for this month | — | 41 figures against the tenets |
| 19 | `moneykeel_audit_module_cf_for-openai_v01_part-19-of-19.md` | The screens — Base pay, Income summary, the income manager, the bill calendar and guaranteed income | — | 26 figures against the tenets |

<!-- end of the Cash flow package section -->
