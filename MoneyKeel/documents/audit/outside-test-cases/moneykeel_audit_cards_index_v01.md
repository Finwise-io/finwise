# Outside test cases — what to send, and what comes back

MoneyKeel · calculation audit · built by `Calculation Module code/scripts/build-outside-test-cards.py` — hand edits die

## How to use this

1. Open a new chat with the model. Paste the whole of one file from `to-send/`. Each file is the brief followed by its cards.
2. Give the same file to the other model in its own new chat. Neither sees the other's reply.
3. Save each reply, unchanged, in `returned/` as `<the batch file's name>_claude.json` or `…_gemini.json`.

## What is in the pack

- Read from the code: 222 files, 361 function and orchestrator records in Net worth, Performance and Cash flow.
- To be judged and tested: **318 cards in 25 files — 318 formula checks and 1,590 cases from each model.**
- Every card carries its formula in words: 318 of 318. Figures stated in those formulas: 463, each traced to the function it describes or checked by hand and recorded.
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
| `moneykeel_audit_cards_performance_03-of-04.md` | performance 03 | 15 | 75 | MK-PF-F-033 quantityWithUnit … MK-PF-F-023 lookBack |
| `moneykeel_audit_cards_performance_04-of-04.md` | performance 04 | 10 | 50 | MK-PF-F-024 userFlows … MK-PF-F-034 closeOnOrBefore |
| `moneykeel_audit_cards_cashflow_01-of-15.md` | cashflow 01 | 6 | 30 | MK-CF-O-001 basePay … MK-CF-O-006 theCreditLine |
| `moneykeel_audit_cards_cashflow_02-of-15.md` | cashflow 02 | 6 | 30 | MK-CF-O-007 theTaxOrganizer … MK-CF-O-018 theDebts |
| `moneykeel_audit_cards_cashflow_03-of-15.md` | cashflow 03 | 15 | 75 | MK-CF-F-002 plannedMonthlySpend … MK-CF-F-027 totalDebtBalance |
| `moneykeel_audit_cards_cashflow_04-of-15.md` | cashflow 04 | 15 | 75 | MK-CF-F-028 loanPayment … MK-CF-F-057 rothVsTraditional |
| `moneykeel_audit_cards_cashflow_05-of-15.md` | cashflow 05 | 15 | 75 | MK-CF-F-058 rothConversionWindow … MK-CF-F-085 filingStatusOf |
| `moneykeel_audit_cards_cashflow_06-of-15.md` | cashflow 06 | 15 | 75 | MK-CF-F-086 stateRateOf … MK-CF-F-166 hasMonthlySalaryTable |
| `moneykeel_audit_cards_cashflow_07-of-15.md` | cashflow 07 | 15 | 75 | MK-CF-F-173 earnerWages … MK-CF-F-020 cashflowYear |
| `moneykeel_audit_cards_cashflow_08-of-15.md` | cashflow 08 | 15 | 75 | MK-CF-F-026 actualDebtPayment … MK-CF-F-062 equityRowValue |
| `moneykeel_audit_cards_cashflow_09-of-15.md` | cashflow 09 | 15 | 75 | MK-CF-F-063 rowVestYear … MK-CF-F-099 deductionFor |
| `moneykeel_audit_cards_cashflow_10-of-15.md` | cashflow 10 | 15 | 75 | MK-CF-F-100 taxableIncomeFor … MK-CF-F-120 pctBaseMonthly |
| `moneykeel_audit_cards_cashflow_11-of-15.md` | cashflow 11 | 15 | 75 | MK-CF-F-121 zero12 … MK-CF-F-146 payFiguresAgree |
| `moneykeel_audit_cards_cashflow_12-of-15.md` | cashflow 12 | 15 | 75 | MK-CF-F-149 recurringDebtPayments … MK-CF-F-174 hasTwoEarners |
| `moneykeel_audit_cards_cashflow_13-of-15.md` | cashflow 13 | 15 | 75 | MK-CF-F-175 sumOverEarners … MK-CF-F-195 monthsLeftInYear |
| `moneykeel_audit_cards_cashflow_14-of-15.md` | cashflow 14 | 15 | 75 | MK-CF-F-196 perMonthToFill … MK-CF-F-148 inMonth |
| `moneykeel_audit_cards_cashflow_15-of-15.md` | cashflow 15 | 6 | 30 | MK-CF-F-155 cash … MK-CF-F-191 ym |

## Left out of the pack

| Function | Why no cases are asked for |
|---|---|
| MK-CF-F-015 loadBudget | storage only — it reads or saves and does no arithmetic |
| MK-CF-F-016 saveBudget | storage only — it reads or saves and does no arithmetic |
| MK-CF-F-039 loadDebt | storage only — it reads or saves and does no arithmetic |
| MK-CF-F-040 saveDebt | storage only — it reads or saves and does no arithmetic |
| MK-CF-F-050 loadIncome | storage only — it reads or saves and does no arithmetic |
| MK-CF-F-051 saveIncome | storage only — it reads or saves and does no arithmetic |
| MK-CF-F-199 ROOM | an example helper — it runs another function on a worked example |
| MK-CF-F-200 LINE | an example helper — it runs another function on a worked example |
| MK-CF-F-201 INCOME | an example helper — it runs another function on a worked example |
| MK-CF-F-202 TAX | an example helper — it runs another function on a worked example |
| MK-CF-F-203 MONTH | an example helper — it runs another function on a worked example |
| MK-CF-F-204 line | an example helper — it runs another function on a worked example |
| MK-CF-F-205 COMING | an example helper — it runs another function on a worked example |
| MK-CF-F-207 SOURCE | an example helper — it runs another function on a worked example |
| MK-CF-F-211 DEBTS | an example helper — it runs another function on a worked example |
| MK-CF-O-011 PAY | an example helper — it runs another function on a worked example |
| MK-CF-O-012 PAY_ESTIMATED | an example helper — it runs another function on a worked example |
| MK-CF-O-013 PAY_LANDS_TYPED | an example helper — it runs another function on a worked example |
| MK-CF-O-014 M | an example helper — it runs another function on a worked example |
| MK-CF-O-015 workedLineAmount | an example helper — it runs another function on a worked example |
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
