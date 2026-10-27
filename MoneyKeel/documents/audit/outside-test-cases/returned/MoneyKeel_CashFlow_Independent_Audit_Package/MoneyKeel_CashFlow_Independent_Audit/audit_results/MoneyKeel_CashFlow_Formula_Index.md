# MoneyKeel CashFlow independent formula review

Scope: written specifications, not running-app certification.

| Part | ID | Calculation | Verdict | Severity | Finding |
|---|---|---|---|---|---|
| 1 | MK-CF-F-059 | annualizedEnteredSalary | INCOMPLETE | medium | The arithmetic converts a known pay rhythm correctly. Missing hours or pay rhythm silently become 40 hours or monthly pay without an assumption flag. |
| 1 | MK-CF-F-130 | enteredMonthlyRaw | INCOMPLETE | medium | The arithmetic converts a known pay rhythm correctly. Missing hours or pay rhythm silently become 40 hours or monthly pay without an assumption flag. |
| 1 | MK-CF-F-060 | salaryGrossByMonth | RIGHT | — | Adds the same calendar slots across the earners; an explicit zero month remains zero. |
| 1 | MK-CF-F-177 | wageGrossByMonth | RIGHT | — | Dated table values override the explicitly supplied typical fallback, including a typed zero. Null-record propagation is not established by the prose; the edge case records that limitation. |
| 1 | MK-CF-F-061 | grossSalaryMonthly | RIGHT | — | Correct maximum, positivity check, count, or sum on a known twelve-month wage vector; no annualization of an already dated year. |
| 1 | MK-CF-F-080 | jobActiveMonth | RIGHT | — | Correct maximum, positivity check, count, or sum on a known twelve-month wage vector; no annualization of an already dated year. |
| 1 | MK-CF-F-081 | salaryActiveMonths | RIGHT | — | Correct maximum, positivity check, count, or sum on a known twelve-month wage vector; no annualization of an already dated year. |
| 1 | MK-CF-F-082 | salaryAnnual | RIGHT | — | Correct maximum, positivity check, count, or sum on a known twelve-month wage vector; no annualization of an already dated year. |
| 1 | MK-CF-F-083 | totalGrossAnnual | INCOMPLETE | high | Annual identity is valid for already classified sources, but yearly totals inherit undated repeating one-offs and a level equity run-rate instead of actual dated vesting. |
| 1 | MK-CF-F-206 | householdK401ByMonth | RIGHT | — | Counts each earner’s contribution only in that earner’s paid months and sums by month. Assumes traditional pre-tax contributions already identified. |
| 1 | MK-CF-F-233 | earnerWageShares | WRONG | high | Subtracts twelve months of entered take-home even when the earner is paid in fewer months. The resulting share cannot reproduce take-home in a paid month. |
| 1 | MK-CF-F-234 | wagesLandingByMonth | INCOMPLETE | high | The combining identity is right, but it inherits the part-year and explicit-zero errors of earnerWageShares. |
| 1 | MK-CF-F-078 | employerMatchMonthly | RIGHT | — | A match defined as a share of the employee contribution uses that contribution as its base; a flat amount stays flat. This is not a percent of wages. |
| 1 | MK-CF-F-178 | wageMatchMonthly | RIGHT | — | A match defined as a share of the employee contribution uses that contribution as its base; a flat amount stays flat. This is not a percent of wages. |
| 1 | MK-CF-F-079 | incomeFromOnboarding | INCOMPLETE | high | A yearly wage divided by 12 erases unpaid months; a signing bonus is pinned to January and may recur without a year. Stored-source timing is not shown to preserve the profile’s dated evidence. |
| 2 | MK-CF-F-172 | hasWage | RIGHT | — | Presence detector: a stored table is evidence of a wage record even when an explicit row is zero; this does not assert positive pay. |
| 2 | MK-CF-F-173 | earnerWages | RIGHT | — | Honors the explicit who-earns selection and uses the spouse’s own wage record; no household sum is substituted into a person’s row. |
| 2 | MK-CF-F-174 | hasTwoEarners | RIGHT | — | True exactly when the selected wage list has two records, rather than from marital status alone. |
| 2 | MK-CF-F-175 | sumOverEarners | INCOMPLETE | medium | Adding known values is correct, but a missing figure becomes 0 without completeness metadata. |
| 2 | MK-CF-F-176 | sumMonthsOverEarners | RIGHT | — | Adds the same calendar slots across the earners; an explicit zero month remains zero. |
| 2 | MK-CF-F-188 | householdPreTaxContributionsAnnual | WRONG | high | Multiplies every monthly contribution by 12 although householdK401ByMonth counts contributions only in paid months. |
| 2 | MK-CF-F-163 | monthKey | RIGHT | — | Uses the person’s local calendar month; UTC date conversion must not change it. Cases include offset crossings. |
| 2 | MK-CF-F-164 | monthWindow | RIGHT | — | Calendar arithmetic across year boundaries; count is a nonnegative integer and back is an integer. |
| 2 | MK-CF-F-165 | salaryMonths | RIGHT | — | Preserves year-month keys and explicit zero; legacy twelve-cell arrays have the explicitly documented current-year interpretation. |
| 2 | MK-CF-F-166 | hasMonthlySalaryTable | RIGHT | — | Presence detector for the canonical month map, retaining a zero row. |
| 2 | MK-CF-F-167 | salaryCalendarYear | RIGHT | — | Reads the requested dated slots, using the explicit fallback only for absent keys; zero is preserved. |
| 2 | MK-CF-F-168 | salaryWindow | RIGHT | — | Reads the requested dated slots, using the explicit fallback only for absent keys; zero is preserved. |
| 2 | MK-CF-F-169 | withSalaryMonth | INCOMPLETE | medium | Writing a known amount is correct, but blank becomes an explicit 0 and destroys the distinction between clearing a cell and entering zero. |
| 2 | MK-CF-F-170 | salaryYearFromCells | RIGHT | — | Maps the first twelve supplied cells to the stated year; does not overwrite another year. |
| 3 | MK-CF-F-062 | equityRowValue | RIGHT | — | Correct intrinsic option value, floored at zero, and share value for other grants; vesting value is not necessarily spendable cash. |
| 3 | MK-CF-F-063 | rowVestYear | WRONG | high | Assigns this year to an undated vest rather than identifying the missing date. |
| 3 | MK-CF-F-064 | equityCashFlow | INCOMPLETE | high | Grouping known vest values by actual year is correct, but an undated positive vest inherits rowVestYear’s invented current year. Vesting is not cash unless a sale/settlement pays it. |
| 3 | MK-CF-F-065 | equityVestWeights | INCOMPLETE | high | Month weights ignore the vesting year and place undated vesting in December. A run-rate allocation is not an actual calendar-year payment schedule. |
| 3 | MK-CF-F-066 | rsuAnnual | INCOMPLETE | medium | Distinct nonempty vest years define a run-rate, but the label annual equity/stock vesting can be read as this year’s actual value; gaps and unknown dates need a contract. |
| 3 | MK-CF-F-219 | rentEntryMonthly | INCOMPLETE | high | The owner explicitly treats nonnumeric rent as not entered, but returning the other number minus zero can present a complete net despite a missing component. |
| 3 | MK-CF-F-067 | rentalList | RIGHT | — | Counts only named properties, preserves a rental loss and uses the owner’s strict parser; unentered component metadata must be supplied by the parser/consumer. |
| 3 | MK-CF-F-068 | rentalNetAnnual | RIGHT | — | Adds net rent including losses and annualizes known monthly amounts; mortgages are outside running costs under the owner ruling. |
| 3 | MK-CF-F-216 | typed | RIGHT | — | Checks presence without losing an explicit zero; does not establish the figure’s numeric validity. |
| 3 | MK-CF-F-217 | hasOldRentFigure | RIGHT | — | Checks presence without losing an explicit zero; does not establish the figure’s numeric validity. |
| 3 | MK-CF-F-218 | moveOldRentFigure | RIGHT | — | Idempotent migration preserves existing lists and raw text, removes old fields, and never invents a property identity. |
| 4 | MK-CF-F-069 | benefitActiveMonths | RIGHT | — | Selects the recorded payment months; all twelve when none is named is an explicit planning convention, not confirmation of receipts. |
| 4 | MK-CF-F-070 | benefitAnnual | RIGHT | — | Monthly amount times the confirmed/planned active-month count; no annualizing a seasonal benefit to twelve months. |
| 4 | MK-CF-F-071 | extraIncome | WRONG | high | A supposedly one-time payment with no year recurs every year; missing timing is treated as recurring income. General taxability also needs source-specific classification. |
| 4 | MK-CF-F-072 | currentRetirementIncomeMonthly | RIGHT | — | Honors an explicit deselection of current retirement income; the conversion is delegated without adding withdrawals to guaranteed outside income. |
| 4 | MK-CF-F-073 | otherIncomeMonth | RIGHT | — | Uses the explicit January default and valid 1–12 calendar month range. This month helper does not establish a missing one-time year. |
| 4 | MK-CF-F-074 | tipsAnnual | INCOMPLETE | high | Counts months in which either earner has any salary; a tipped earner’s employment months can differ from the household’s. |
| 4 | MK-CF-F-075 | retirementIncomeMonthly | RIGHT | — | Correct monthly conversion of the stated payment amounts. This arithmetic alone does not prove all streams taxable or guaranteed. |
| 4 | MK-CF-F-076 | guaranteedOutsideStreams | RIGHT | — | Includes only the four owner-approved outside stream kinds, excluding withdrawals/RMDs and preserving an explicit inflation choice. |
| 4 | MK-CF-F-077 | scholarshipByCalendarMonth | RIGHT | — | Places annual awards in their named months and monthly awards every month, rather than averaging a dated award. |
| 4 | MK-CF-F-092 | incomeMonthlyGrid | INCOMPLETE | high | The take-home identity is coherent on complete inputs, but it inherits the part-year wage-share error, undated recurring one-offs and yearless equity allocation. |
| 5 | MK-CF-O-004 | incomeSummary | WRONG | high | Positive-only taxed rows omit legitimate losses and several taxable sources despite a broader total; rent losses also disappear from usual-month take-home. The total cannot be traced to the printed rows in these cases. |
| 5 | MK-CF-O-016 | incomeSources | INCOMPLETE | high | The described source inventory omits interest/dividends, benefits, support and other entered sources; retirement total is labeled Social Security/pension but includes withdrawals. |
| 5 | MK-CF-O-019 | theIncomeManager | WRONG | high | Classifies entered status by a positive net amount: a named rental losing money is presented as not entered, and outstanding stock vesting is hidden when no current job remains. |
| 5 | MK-CF-F-210 | annualOfSource | WRONG | high | For every salary row it substitutes the household’s total salary, duplicating household pay when there are two salary rows. |
| 5 | MK-CF-F-182 | asPercent | RIGHT | — | Formats a fractional rate once, with at most two decimals and the percent sign. |
| 5 | MK-CF-F-183 | paidOutByAccount | INCOMPLETE | high | The trailing window has a lower bound but no stated upper bound at as_of, allowing future-dated payouts. Missing amounts silently disappear from a purported total. |
| 5 | MK-CF-F-184 | incomeFromAccounts | INCOMPLETE | high | The precedence avoids double counting estimates and receipts, but complete trailing income depends on the incomplete payout reader; estimates and unknown-principal zero rows need coverage. |
| 5 | MK-CF-F-127 | isRental | RIGHT | — | Recognizes exactly the long-term and short-term rental kinds. |
| 5 | MK-CF-F-044 | annualNet | RIGHT | — | Correct known-period conversion and aggregation on an explicitly annualized run-rate basis. A one-off amount is included once, not a monthly cash promise. |
| 5 | MK-CF-F-045 | grossAnnualBaseline | RIGHT | — | Correct known-period conversion and aggregation on an explicitly annualized run-rate basis. A one-off amount is included once, not a monthly cash promise. |
| 5 | MK-CF-F-046 | employerMatchAnnual | RIGHT | — | Correct known-period conversion and aggregation on an explicitly annualized run-rate basis. A one-off amount is included once, not a monthly cash promise. |
| 5 | MK-CF-F-161 | monthlyGrossOfSource | RIGHT | — | Correct documented normalized weekly/fortnightly run-rate and dated quarterly/yearly/one-time placement; one-off year filtering belongs upstream. |
| 5 | MK-CF-F-049 | buildIncomeState | WRONG | high | Calculated monthly tax is always single/federal-only while yearly tax can use household filing status; monthly and annual take-home can disagree. |
| 5 | MK-CF-F-129 | round4 | RIGHT | — | Identity function preserves precision until display. |
| 5 | MK-CF-F-052 | getIncomeState | RIGHT | — | Thin storage/event seam: passes the domain result unchanged or returns no stored result. Storage correctness cannot be inferred without implementation evidence. |
| 6 | MK-CF-F-001 | buildBudgetState | WRONG | high | Missing stored expenses become zero and therefore produce a positive projected saving without a budget. |
| 6 | MK-CF-F-002 | plannedMonthlySpend | RIGHT | — | Adds the actual calendar-year plan and divides by twelve; an explicitly dated annual bill is counted once on top of the recurring typed figure. This is an annual average, not a selected month. |
| 6 | MK-CF-F-120 | pctBaseMonthly | RIGHT | — | Uses take-home after both tax and employee contributions as the common percentage base. |
| 6 | MK-CF-F-003 | categoryMonthly | RIGHT | — | Normalizes a known category once; percent categories use the same annual-average take-home base and preserve the annual/monthly distinction. |
| 6 | MK-CF-F-004 | spendBuckets | RIGHT | — | Aggregates explicitly normalized categories into fixed, non-monthly and flexible groups; fallback totals apply only without categories. |
| 6 | MK-CF-F-221 | spendByMonthByBucket | RIGHT | — | Dated annual categories land only in their selected months; monthly remainder is added consistently and each bucket retains its identity. |
| 6 | MK-CF-F-008 | spendByMonth | RIGHT | — | Sums the same three dated bucket amounts without doing a second allocation. |
| 6 | MK-CF-O-002 | expenses | INCOMPLETE | high | The approved drawing and formula can reconcile expenses, but linked-card payment exclusion differs from the actual flow contract, and repeated names can double-assign a payment. |
| 6 | MK-CF-F-149 | recurringDebtPayments | RIGHT | — | Applies each instalment payment’s start/payoff months and excludes revolving and due-in-full debt. Missing-payment disclosure remains the caller’s duty. |
| 6 | MK-CF-F-150 | debtPaymentsCountedAsExpenses | INCOMPLETE | high | Name-based payment matching can attach one expense to multiple debts with identical normalized names. |
| 6 | MK-CF-F-151 | actualSpending | RIGHT | — | Filters debt-payment expenses, source and month before sorting; shown and hidden subtotals reconcile. Inputs here are the month’s logs, not a claim that all spending was captured. |
| 6 | MK-CF-F-152 | isRadarItem | RIGHT | — | Correctly separates instalment, revolving and due-in-full shapes. |
| 6 | MK-CF-F-153 | radar | INCOMPLETE | medium | Known debt due/paid selection is coherent, but the prose does not establish the date window of bigBills or prevent showing a future bill as this month’s expense. |
| 6 | MK-CF-O-020 | theBudgetCounted | INCOMPLETE | high | Suppresses the named home mortgage category correctly, but does not identify any other debt duplicated in a user budget despite the broader any-debt rule. |
| 7 | MK-CF-F-006 | allocatableThisMonth | RIGHT | — | Surplus less dated allocations, floored at zero for the allocation capacity; this is distinct from a negative surplus itself. |
| 7 | MK-CF-F-007 | nonMonthlyBasis | RIGHT | — | Percent-basis label applies only if every positive nonmonthly category is a percentage; rounding here is display metadata. |
| 7 | MK-CF-F-009 | monthlyEssentials | INCOMPLETE | medium | The algorithm intentionally estimates essentials from recurring categories, but no-category fallback includes all planned spending and ignores the needs distinction. Debts and continuing rent require the higher-level emergency-fund contract. |
| 7 | MK-CF-F-010 | emergencyTest | WRONG | high | Returns 0 months when essentials is zero and replaces a supplied zero essentials with another estimate. Neither is a valid cash ÷ zero result. |
| 7 | MK-CF-F-011 | savingsByMonth | RIGHT | — | Correct take-home minus planned expenses for the same month; monthly debt inclusion must be explicit at the calling door, rather than assumed inside spendByMonth. |
| 7 | MK-CF-F-012 | annualCashflow | RIGHT | — | Yearly identities reconcile when all inputs use the same twelve months and complete income/spending scope. |
| 7 | MK-CF-F-013 | budgetFromOnboarding | INCOMPLETE | high | Storing an annual-average expense total alongside the same dated categories risks adding the annual bill again on reread. The persisted field meanings are not established. |
| 7 | MK-CF-F-014 | budgetVsActual | WRONG | high | Uses average spendBuckets as the selected month’s budget, which understates dated bill months and overstates other months. |
| 7 | MK-CF-F-017 | publishSurplus | RIGHT | — | Thin storage/event seam: passes the domain result unchanged or returns no stored result. Storage correctness cannot be inferred without implementation evidence. |
| 7 | MK-CF-F-191 | ym | RIGHT | — | Uses the person’s local calendar month; UTC date conversion must not change it. Cases include offset crossings. |
| 7 | MK-CF-F-189 | essentialsFromLoggedSpending | RIGHT | — | Averages the logged completed months only, labels sample count, and uses current month-to-date only when there is no earlier month. Partial-history coverage must accompany the estimate. |
| 7 | MK-CF-F-190 | essentialsMonthly | RIGHT | — | Uses the logged estimate before a positive typed fallback and otherwise refuses; sample basis is retained. |
| 8 | MK-CF-O-008 | whatsComing | INCOMPLETE | medium | Composes the declared grid and bill reader, inheriting bill-date ambiguity and unknown starting-balance assumptions. |
| 8 | MK-CF-F-212 | receivedInMonth | RIGHT | — | Filters the requested recorded year-month and sorts newest first; this is month membership, not a guarantee that every record is before an in-month as-of time. |
| 8 | MK-CF-F-121 | zero12 | RIGHT | — | A structural zero accumulator, not a claim about missing user financial data. |
| 8 | MK-CF-F-018 | equityByMonth | INCOMPLETE | high | Allocates a level annual run-rate using all vest months and ignores which calendar year actually vests. It silently puts undated vesting in December. |
| 8 | MK-CF-F-160 | daysBetweenDates | INCOMPLETE | low | Elapsed milliseconds rounded to days does not define calendar-day behavior across daylight saving time and non-midnight timestamps. |
| 8 | MK-CF-F-122 | addDays | RIGHT | — | Moves by local calendar days; day and offset must be preserved across DST rather than blindly adding 24-hour milliseconds. |
| 8 | MK-CF-F-124 | nextOccurrence | INCOMPLETE | low | The revised rule deliberately leaves earlier days in the current month in the past, despite a purpose that says next occurrence on/after now. Leap-day rollover is also unspecified. |
| 8 | MK-CF-F-019 | upcomingBills | INCOMPLETE | high | Undated annual categories are spread over twelve months by the budget reader but placed wholly in January here. The relationship to conservative availability is clear, but bill timing/unknown coverage is inconsistent. |
| 8 | MK-CF-F-232 | balanceByDay | RIGHT | — | Implements the documented conservative availability policy: prior End plus dated items, counting undated regular money only when negative. It is a conservative projection, not a measured daily balance. |
| 8 | MK-CF-F-020 | cashflowYear | WRONG | high | Uses one rate against all taxed income without subtracting 401(k)s, includes reinvested dividends in inflow, and omits debt outflow. Its own take-home promise differs from the current shared grid. |
| 8 | MK-CF-O-006 | theCreditLine | INCOMPLETE | medium | The prose rounds the share before describing threshold status, unlike creditUtilization’s explicit pre-rounding classification. |
| 9 | MK-CF-O-018 | theDebts | INCOMPLETE | high | Known positive balances produce the debt total, but missing balances/rates/payments lack complete-total flags and the payoff horizon can be misreported as never. |
| 9 | MK-CF-F-021 | defaultPaymentType | RIGHT | — | Uses an explicit payment-shape override before the documented kind default. |
| 9 | MK-CF-F-022 | paymentShape | RIGHT | — | Uses an explicit payment-shape override before the documented kind default. |
| 9 | MK-CF-F-023 | requiredPayment | RIGHT | — | Correct complete-input balance/minimum/override arithmetic for a generic monthly obligation. Dated-month selection and missing-input disclosure are separate readers. |
| 9 | MK-CF-F-024 | totalDebtMonthly | RIGHT | — | Correct complete-input balance/minimum/override arithmetic for a generic monthly obligation. Dated-month selection and missing-input disclosure are separate readers. |
| 9 | MK-CF-F-025 | minimumDebtService | RIGHT | — | Correct complete-input balance/minimum/override arithmetic for a generic monthly obligation. Dated-month selection and missing-input disclosure are separate readers. |
| 9 | MK-CF-F-026 | actualDebtPayment | INCOMPLETE | high | The legacy name says actual but the formula is a planned obligation, not logged payments. The owner chose a payment override as the normal monthly plan, but actual-month records must not reuse it. |
| 9 | MK-CF-F-027 | totalDebtBalance | RIGHT | — | Correct complete-input balance/minimum/override arithmetic for a generic monthly obligation. Dated-month selection and missing-input disclosure are separate readers. |
| 9 | MK-CF-F-028 | loanPayment | RIGHT | — | Correct ordinary fixed-rate monthly amortization, with APR supplied as a percent and an explicit zero-rate branch. |
| 9 | MK-CF-F-029 | monthsToClear | RIGHT | — | Correct logarithmic monthly-payoff formula and nonamortizing refusal, with zero-rate and zero-balance branches. |
| 9 | MK-CF-F-030 | paymentToClearBy | RIGHT | — | Correct fixed monthly payment and upward-cent contract on positive months; invalid/nonpositive horizon is a documented sentinel and should not be presented as a real payment. |
| 9 | MK-CF-F-034 | payoffPlan | INCOMPLETE | high | A 600-month cap is called never pays off although an amortizing zero-rate debt can take 601 months. Due-in-full interest/cash funding and exact payoff dates need an explicit contract. |
| 9 | MK-CF-F-159 | isRecurringDebt | RIGHT | — | Uses an explicit payment-shape override before the documented kind default. |
| 9 | MK-CF-F-235 | paysInMonth | RIGHT | — | Inclusive start/payoff calendar bounds; balloon only in recorded payoff month while a positive balance remains. |
| 9 | MK-CF-F-236 | paymentInMonth | RIGHT | — | Uses the same inclusion test; full balance in balloon month, otherwise required payment. |
| 10 | MK-CF-F-031 | creditUtilization | WRONG | high | Zero/nonpositive limit yields 0 share and a good status, which confuses an undefined ratio with zero utilization. |
| 10 | MK-CF-F-032 | creditScoreBand | RIGHT | — | Uses the stated threshold labels and inclusive lower boundaries. Does not establish a lender approval probability. |
| 10 | MK-CF-F-033 | debtToIncome | WRONG | high | Nonpositive gross income gives a zero share and good classification despite an undefined or unbounded debt ratio. |
| 10 | MK-CF-F-035 | debtKind | CANNOT TELL | low | The prose refers to a label/icon registry but does not supply its complete mapping. |
| 10 | MK-CF-F-036 | buildDebtState | INCOMPLETE | high | Known-balance subtotal can hide debts whose balances or rates are missing; a highest-rate choice cannot be complete if a missing rate is treated as 0. |
| 10 | MK-CF-F-037 | inferDebtType | RIGHT | — | Applies the documented first-match name heuristic. It is a suggestion and must not overwrite an explicit user classification. |
| 10 | MK-CF-F-038 | debtsFromOnboarding | RIGHT | — | Creates one debt only for a positive entered balance, preserves payment and converts APR percent to fraction once; property-link validation belongs outside this converter. |
| 10 | MK-CF-F-041 | getDebtState | RIGHT | — | Thin storage/event seam: passes the domain result unchanged or returns no stored result. Storage correctness cannot be inferred without implementation evidence. |
| 10 | MK-CF-F-042 | mortgageOddsEffect | CANNOT TELL | high | The independent retirement projection equations/inputs are not fully specified; exact before/after probabilities cannot be recovered from this wrapper. |
| 10 | MK-CF-F-125 | amortise | INCOMPLETE | medium | A 1200-month cap can truncate an amortizing loan without distinguishing horizon exhaustion from complete payoff; zero-balance behavior also is not explicitly stated. |
| 10 | MK-CF-F-126 | futureValue | WRONG | high | The stated formula divides by the monthly rate without a zero-rate branch: a positive contribution at 0% gives 0/0. |
| 10 | MK-CF-F-229 | balanceGrownTo | WRONG | high | Inherits the zero-rate 0/0 from futureValue even though a zero-return pot has a fully known future balance. |
| 10 | MK-CF-F-043 | compareMortgageToTreasury | INCOMPLETE | medium | The rate gap is a stated pretax heuristic, not a complete recommendation; lifetime comparison lacks an explicit last-payment treatment, taxes, liquidity and Treasury reinvestment assumptions. |
| 11 | MK-CF-F-132 | map | RIGHT | — | Applies the transformation only to the named account and preserves other accounts/order. |
| 11 | MK-CF-F-133 | cashOf | INCOMPLETE | high | Unentered investment cash is returned as zero, unlike availableCash’s explicit unknown state. A structural fallback must not become a displayed or spendable cash balance. |
| 11 | MK-CF-F-134 | usesSleeve | RIGHT | — | Identifies the storage location of investment cash; this does not authorize treating property market value as spendable cash. |
| 11 | MK-CF-F-135 | availableCash | WRONG | high | Treats property market value as spendable balance. A $400,000 home is not $400,000 available to settle a purchase without a sale. |
| 11 | MK-CF-F-136 | bumpCash | INCOMPLETE | high | Investment cash can be initialized from a missing amount; updates must preserve unknown cash and linked/derived total conventions. |
| 11 | MK-CF-F-137 | findPos | RIGHT | — | Uses stable holding id before ticker. Multiple holdings with the same ticker require unique-id resolution upstream. |
| 11 | MK-CF-F-138 | addLot | INCOMPLETE | medium | Adds shares/cost correctly, but a missing date cannot become a known acquisition date and ticker classification is delegated without a fully supplied mapping. |
| 11 | MK-CF-F-139 | removeShares | INCOMPLETE | high | FIFO order is stated correctly, including undated lots last, but excess removals and a lot with unknown quantity have no explicit refusal/allocation contract. |
| 11 | MK-CF-F-111 | applyTransaction | INCOMPLETE | high | Its broad transaction contract contains unresolved paths: sale without shares lowers balance although a sale is internal cash conversion, and unknown existing quantities allow a sale to stand without a specified residual position. |
| 11 | MK-CF-F-222 | tradeCash | WRONG | high | Explicitly changes missing cash as if it were zero, creating an invented balance even though applyTransaction promises missing cash stays unentered. |
| 11 | MK-CF-F-223 | tradeMultiplierOf | INCOMPLETE | high | Known holdings use the correct multiplier, but a newly bought option has no holding and falls back to 1. The recorded limitation undercounts a new option trade unless type is acquired upstream. |
| 11 | MK-CF-F-224 | openingRecordsOf | RIGHT | — | One opening record per purchase retains quantity, date, and known basis without fabricating a zero basis. |
| 11 | MK-CF-F-112 | makeTransaction | RIGHT | — | Preserves supplied economic data while adding a unique id/time and canonical ticker; deterministic id/time cannot be asserted, only their properties. |
| 11 | MK-CF-F-113 | affectedAccountIds | RIGHT | — | Identifies primary and optional receiving accounts; consumers must treat identities as a set to avoid double mutation. |
| 12 | MK-CF-F-114 | undoSnapshot | RIGHT | — | Deep copies only affected accounts before mutation, allowing exact restoration rather than an approximate opposite trade. |
| 12 | MK-CF-F-115 | restoreUndo | RIGHT | — | Replaces affected accounts with authoritative pre-transaction copies; unrelated accounts remain unchanged. |
| 12 | MK-CF-F-116 | inverseOf | INCOMPLETE | high | Direction flipping plus kind switching is clear for explicit in/out records, but legacy signed-negative records without direction can be reversed twice depending on whether amount or kind owns its sign. |
| 12 | MK-CF-F-117 | txnLabel | CANNOT TELL | low | The literal transaction-kind-to-label mapping is absent. |
| 12 | MK-CF-F-118 | cashEffect | INCOMPLETE | high | A missing amount returns 0 for a financial display even when its cash effect is unknown. Sale amount fallback also lacks a fee contract. |
| 12 | MK-CF-F-119 | investmentIncomeAnnual | INCOMPLETE | high | The trailing window has a lower bound but no stated upper bound at as_of, allowing future-dated payouts. Missing amounts silently disappear from a purported total. |
| 12 | MK-CF-F-108 | isMoneyOut | RIGHT | — | Kind-based unknown classification is explicitly only a flag, not a guessed amount; signed refunds/reversals are excluded correctly. |
| 12 | MK-CF-F-131 | normPayee | RIGHT | — | Trims outer whitespace and folds case; does not merge distinct payee identities or internal whitespace. |
| 12 | MK-CF-F-162 | daysApart | RIGHT | — | Absolute difference of date-only records is correct; timestamps require the declared calendar/elapsed convention. |
| 12 | MK-CF-F-109 | reviewTransactions | INCOMPLETE | medium | Flags possible issues appropriately, but earlier-history direction, same-timestamp duplicates, negative reversal magnitudes, median convention, and duplicate normalized payees need explicit definitions. |
| 12 | MK-CF-F-110 | flagComparisonText | INCOMPLETE | low | Threshold says at least $1000 while its fallback prose says over $1000; exactly $1000 is described inaccurately. |
| 13 | MK-CF-O-005 | theContributionRoom | WRONG | high | Calls monthly contribution ×12 money used so far, hides overcontributions by capping used at the limit, counts only Roth IRA amounts for combined IRA room, and assumes self-only HSA cover. |
| 13 | MK-CF-F-197 | ageAttainedInYear | RIGHT | — | Uses the calendar-year age required for catch-up thresholds and refuses an absent/unusable birth year; future birth years should be rejected at input. |
| 13 | MK-CF-F-195 | monthsLeftInYear | RIGHT | — | Includes the current month explicitly: January12, December1. |
| 13 | MK-CF-F-196 | perMonthToFill | RIGHT | — | Divides known room by explicitly inclusive remaining months and rounds only the displayed planning amount to $100; this rounded amount may leave residual room. |
| 13 | MK-CF-F-053 | annual401kLimit | RIGHT | — | The supplied 2026 base and catch-up constants match IRS Notice 2025-67. Returns a statutory ceiling, not a determination of compensation/plan eligibility. |
| 13 | MK-CF-F-054 | annualIraLimit | RIGHT | — | The 2026 base and catch-up constants match IRS Notice 2025-67; this is the combined statutory IRA ceiling, subject to compensation/eligibility rules. |
| 13 | MK-CF-F-055 | annualHsaLimit | INCOMPLETE | high | Base/catch-up constants are correct for a full eligible year, but current Medicare status alone cannot determine this year’s limit: eligible pre-enrollment months may still allow contributions. |
| 13 | MK-CF-F-056 | k401Headroom | INCOMPLETE | high | Caps reported used at the statutory limit, hiding an actual excess even though remaining room is correctly floored at zero. |
| 13 | MK-CF-F-057 | rothVsTraditional | RIGHT | — | Implements a clearly conditional heuristic comparing current and expected future marginal bands; it is not an individualized optimal strategy. |
| 13 | MK-CF-F-058 | rothConversionWindow | INCOMPLETE | medium | Age73 and Social Security claiming age are heuristic cutoff points, not a complete conversion-opportunity test. It can return false for a low-income retiree already claiming a small benefit. |
| 13 | MK-CF-O-017 | futurePaycheck | CANNOT TELL | high | Positive savings projections and simulation-supported draws cannot be independently computed without the projection’s public equations and timing conventions. |
| 13 | MK-CF-F-105 | guaranteedRows | INCOMPLETE | medium | Dated payment placement is correct, but the inflation flags captured by guaranteedOutsideStreams are not reflected in next-year payments in the described rolling grid. |
| 13 | MK-CF-F-106 | solveSafeDraw | INCOMPLETE | high | Twelve bisections inside an unverified initial upper bound do not establish the largest feasible draw. An all-feasible bracket can cap the answer too low; a chanceFloor argument is not reflected in the fixed80 wording. |
| 13 | MK-CF-F-107 | buildPaycheckYear | INCOMPLETE | high | Combines guaranteed receipts and a draw coherently, but safe-to-spend wording is forbidden, simulation assumptions are incomplete, and guaranteed monthly average can hide timing risk. |
| 14 | MK-CF-O-010 | theMonth | RIGHT | — | Composes distinct planned/actual blocks and subtracts stated goal commitments from planned surplus. A negative free figure is a funding gap, not allocatable cash. Propagates refusal states from inputs. |
| 14 | MK-CF-O-003 | thisMonth | RIGHT | — | Keeps planned and actual blocks distinct, with their independent sums and refusal states; no new arithmetic is introduced. |
| 14 | MK-CF-F-227 | thisMonthInputs | INCOMPLETE | high | Takes the first grid cell even when an explicit queried month differs, and substitutes 0 for absent take-home/bill amounts. |
| 14 | MK-CF-F-226 | datedGridOf | INCOMPLETE | high | Roth-conversion tax is put in April next year with no adoption-year contract, risking a moving bill on later reads; omitted starting cash uses0 as a projection assumption. |
| 14 | MK-CF-F-225 | useCashflowModel | WRONG | high | An unknown age becomes68 and missing return/inflation become assumed values without a refusal or disclosed provenance in the returned public contract. |
| 14 | MK-CF-F-156 | plannedMonthFlow | INCOMPLETE | high | Explicit debt-payment unknown handling is good, but no-budget expenses are represented as0 and the formula’s final refusal condition mentions only missing debt payments, while screen rules forbid a surplus with no budget. |
| 14 | MK-CF-F-005 | actualMonthFlow | RIGHT | — | Uses approved month take-home inflow and only logged debt payments, keeps planned obligations from actual outflow, and partitions expense/debt rows once. It is the owner’s hybrid month view, not verified income received. |
| 14 | MK-CF-F-220 | pastMonthFlow | INCOMPLETE | high | A saved record’s missing expense/debt component becomes0, and absent records use current logs without identifying whether they are complete. |
| 14 | MK-CF-F-231 | addedAfterRecord | INCOMPLETE | medium | When the saved record has no timestamp, returns no later additions as if none existed, although ordering cannot be established. |
| 14 | MK-CF-F-157 | debtPaymentsByDebt | WRONG | high | Matching by normalized payee/name can allocate a single payment to multiple debts with the same name. |
| 14 | MK-CF-F-155 | cash | RIGHT | — | Converts negative zero to positive zero while preserving every other value, preventing a misleading minus zero display. |
| 14 | MK-CF-F-192 | inflowLabel | RIGHT | — | Deduplicates source words while retaining order and uses the approved fallback phrase. |
| 14 | MK-CF-F-193 | inflowSourceWord | RIGHT | — | Canonicalizes the described source prefix without doing financial arithmetic. |
| 14 | MK-CF-F-194 | monthOutflow | RIGHT | — | Uses stored expense+debt components or the already known logged subtotal; it does not itself invent completeness. Inputs must distinguish absent components upstream. |
| 14 | MK-CF-F-148 | inMonth | RIGHT | — | Correct year-month membership for valid date records; as-of filtering, when needed, is separate from month membership. |
| 15 | MK-CF-O-001 | basePay | INCOMPLETE | high | The household tax row uses gross×household rate even in mixed entered/calculated take-home mode, while actual implied deductions can differ by earner. Its bracket is wages-only despite the owner’s all-income band rule. |
| 15 | MK-CF-F-140 | periodsAYear | RIGHT | — | Documented run-rate conversion: 52 weekly/26 fortnightly/12 monthly/1 yearly. Hourly2080 means the explicitly assumed40×52 and is not variable-hours gross. |
| 15 | MK-CF-F-141 | perMonth | INCOMPLETE | medium | The arithmetic converts a known pay rhythm correctly. Missing hours or pay rhythm silently become 40 hours or monthly pay without an assumption flag. |
| 15 | MK-CF-F-142 | monthsOf | INCOMPLETE | medium | Blank amounts become0, making an unentered cell indistinguishable from confirmed unpaid time. |
| 15 | MK-CF-F-128 | grossByMonth | INCOMPLETE | medium | Purpose promises twelve identical months for steady pay, but formula returns one typical row; consumers that sum versus annualize can disagree. |
| 15 | MK-CF-F-143 | annualisedGross | INCOMPLETE | high | Average of a partial or14-month table ×12 is a run-rate, not the actual tax-year wages; it can disagree with salaryAnnual on known dated cells. |
| 15 | MK-CF-F-144 | takeHomeAsEntered | INCOMPLETE | high | Preserves positive typed monthly take-home, but rejects a confirmed0 and can use full-year contributions/averages for partial-year pay. |
| 15 | MK-CF-F-145 | deductionsFromPay | INCOMPLETE | high | Yearly gross−12×monthly401(k)−12×typical take-home is wrong for employment gaps; a partially covered year is not a full-year observation. |
| 15 | MK-CF-F-146 | payFiguresAgree | WRONG | high | Returns at the first warning and can skip a later actual failure; also subtracts typical take-home and401(k) in unpaid months without a matching table. |
| 15 | MK-CF-F-171 | earnerPay | INCOMPLETE | high | Combines correctly scoped primitives on a full-year complete record, but inherits run-rate and part-year deduction problems. |
| 15 | MK-CF-F-198 | payrollTaxWithheld | RIGHT | — | Correct employee withholding at one employer using known Social-Security/Medicare wages. It is not household final Additional Medicare liability; pretax benefit wage-base differences are outside the one-number input. |
| 15 | MK-CF-F-179 | entryFromWage | RIGHT | — | Preserves each wage’s input fields and canonical month table in one pay entry; it should not create a separate tax calculation. |
| 15 | MK-CF-F-180 | enteredLandsAnnual | INCOMPLETE | high | Multiplies typical take-home by12 and treats entered0 as absent, despite paid-month gaps and year-specific records. |
| 15 | MK-CF-F-181 | rateInForce | INCOMPLETE | high | Precedence is correct for complete full-year wages. Implied rates inherit12-month contribution/take-home errors; a rate of0 for no known taxable income needs an explicit absence state. |
| 16 | MK-CF-F-097 | grossFromNet | RIGHT | — | A monotone federal-schedule inversion on the stated no-payroll/no-state domain; [net,3×net] brackets the 2026 rates, and50 bisections give ample numerical precision. |
| 16 | MK-CF-F-098 | progressiveMonthlyTax | INCOMPLETE | high | Clipping negative income months to0 breaks the year-tax reconciliation when a legitimate loss lowers cumulative taxable income. This is an allocation illustration, not payroll withholding. |
| 16 | MK-CF-F-187 | seniorDeductionFor | INCOMPLETE | medium | Per-person6% phaseout is correct, but unknown MAGI gives an actual0 rather than a missing eligibility result. |
| 16 | MK-CF-F-099 | deductionFor | INCOMPLETE | medium | Correct statutory amounts on an eligible standard-deduction return; MAGI/eligibility missing and nonstandard filing constraints are not represented. |
| 16 | MK-CF-F-100 | taxableIncomeFor | INCOMPLETE | high | Uses gross as MAGI; equivalent only when the caller has already adjusted gross to the statutory MAGI basis. Broad gross income can overphase the senior deduction. |
| 16 | MK-CF-F-101 | taxOwedFor | RIGHT | — | Correct2026 band-by-band standard-deduction-model tax, plus the explicitly user-entered flat state assumption on taxable income. Full-return tax treatments and MAGI domain remain outside this primitive. |
| 16 | MK-CF-F-102 | effectiveRateOnGrossFor | RIGHT | — | Divides the same modeled tax by its matching positive gross base; zero-income output is a rate sentinel, not proof of an entered0 tax rate. |
| 16 | MK-CF-F-103 | marginalBracketFor | RIGHT | — | Correct inclusive upper-bound marginal band lookup on the modeled ordinary taxable income; zero taxable income maps to first band by convention, not a positive tax bill. |
| 16 | MK-CF-F-104 | ltcgRateFor | INCOMPLETE | high | Constants are correct, but one marginal rate selected from current ordinary income cannot price a finite gain that crosses the0/15/20% bands. |
| 16 | MK-CF-F-185 | needsTakeHomeConversion | RIGHT | — | Detects only a positive legacy take-home-mode record, without re-running conversion on already migrated data. |
| 16 | MK-CF-F-186 | convertTakeHomeMode | WRONG | high | The calculated-rate conversion inverts net to gross without adding back401(k) contributions, so the later gross−tax−401(k) cannot equal the typed take-home. Manual-rate branch handles401(k), calculated branch does not. |
| 17 | MK-CF-O-007 | theTaxOrganizer | WRONG | high | Rounds account income before handing it to another tax calculator and uses mixed trailing paid/estimated account income for an explicit tax year. Reinvested taxable income may be omitted. |
| 17 | MK-CF-F-084 | taxableAnnual | WRONG | high | Treats all retirement cash receipts as taxable income, including full Social Security and withdrawals, without taxable-fraction/account-basis data. |
| 17 | MK-CF-F-230 | taxedAfterPreTax | INCOMPLETE | high | Correct identity only with correctly scoped taxable income and contributions; the text says paid-month contributions while the legacy household annual helper uses12. |
| 17 | MK-CF-F-085 | filingStatusOf | INCOMPLETE | medium | The formula reads filing status, but the purpose wrongly describes a tax-rate function. Missing status is inferred from spouse presence rather than a confirmed filing election. |
| 17 | MK-CF-F-086 | stateRateOf | RIGHT | — | Converts an explicitly entered percent to a fraction within the documented0–15% estimate range; absence must be labeled as no state estimate, not known0 tax. |
| 17 | MK-CF-F-087 | monthlyTaxRates | RIGHT | — | Uses the same household rate in every month as explicitly decided; this is a budgeting allocation, not IRS actual paycheck withholding. |
| 17 | MK-CF-F-088 | taxableByCalendarMonth | INCOMPLETE | high | Floors each month’s taxable amount at0, discarding negative net rental/business income; summing months can exceed taxableAnnual. |
| 17 | MK-CF-F-089 | over65CountOf | INCOMPLETE | high | Defaults a joint household with an unanswered spouse-age question to the person’s age alone; January1 birthdays and unknown eligibility require the IRS age rule. |
| 17 | MK-CF-F-090 | effectiveRate | RIGHT | — | Delegates to the same authoritative rate without a second calculation. |
| 17 | MK-CF-F-048 | effectiveTaxRate | WRONG | high | Calculated branch ignores entered state tax and uses a separate gross/status path instead of the one rateInForce promised throughout the app. |
