# Cut metrics — the founder's 14, removed 2026-08-20

Source of authority: BRIEF-decisions-and-fixes-2026-08-20.md §C (the founder's own table, reasons
verbatim there; full reasoning in tab 3 of METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx).
This ledger records only WHERE each cut landed, so nothing was removed silently. The removed grid
text is recoverable from git — the sections existed intact at commit ae39c4e.

| Metric | Q | Removed from the grid | Removed from the code |
|---|---|---|---|
| Tax-loss harvesting | 22 | section-B.md whole section | never implemented — nothing to remove |
| Cash drag | 24 | section-B.md whole section | idle-cash insight rule, Idle cash screen and route, their tests |
| Age of money | 31 | section-C.md whole section | never implemented |
| Savings rate | 29 | section-C.md whole section | the two rate functions in src/domain/savings (monthlySavings stays — three screens use it); the onboarding recap line that quoted a rate |
| Safe to spend | 33 | section-C.md whole section | never implemented as a budget metric. The retiree paycheck draw ("Left to spend") is a DIFFERENT concept — withdrawal sizing, a kept core feature — and is untouched |
| Personal inflation | 50 | section-C.md whole section | never implemented — inflation was always the plan assumption only |
| Sequence-of-returns buffer | 21 | section-B.md whole section | never implemented |
| Allocation vs target / drift | 19 | section-B.md whole section | never implemented; the word "drift" swept from user-facing copy (audit item 14) |
| Funded ratio | 46 | section-D.md whole section | never implemented (goal funded % and plan on-track % are different, kept concepts) |
| Risk measures (σ, β, Sharpe) | 20 | section-B.md whole section | never displayed. The volatility INPUT to the odds simulation stays — the simulation needs it; the cut is the display of risk statistics |
| Look-through exposure | 17 | section-B.md whole section AND the look-through purpose inside Allocation by asset class (section-A.md) | never implemented |
| Fund-internal fees | 17, 36 | the two fund-fee purposes inside Fees paid (section-B.md); the honest absence sentence stays in P1-F | never implemented |
| Embedded tax on unrealised gains | 12 | section-A.md whole section | the estimated-tax display on Holding detail; the dead portfolio-level compute on Performance. Realised-gains math and drawdown tax treatment are different, kept concepts |
| Employer-stock flag | 10 | the employer-stock purpose inside Concentration (section-A.md) | the unconsumed employer-ticker capture field and its onboarding input |

Deferred, NOT cut (founder's own distinction — "phase 2 quietly becomes never" is the failure to
avoid): Forward income (Q18) · Budget rollover (Q28) · Non-USD holdings (Q25 — the currency FIELD
is stored now). Their grids stay.
