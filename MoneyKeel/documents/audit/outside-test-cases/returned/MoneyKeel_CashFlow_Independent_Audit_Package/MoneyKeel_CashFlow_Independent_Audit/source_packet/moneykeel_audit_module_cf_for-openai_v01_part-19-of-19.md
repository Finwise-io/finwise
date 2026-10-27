# Cash flow — part 19 of 19: The screens — Base pay, Income summary, the income manager, the bill calendar and guaranteed income

26 figures to check against the tenets, 65 decisions to check, and the cross-card checks named below. No cards in this part. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 19"` in your reply, with `screen_checks`, `rules_held` and `cross_card_checks`.

## The figures — as the screen register holds them

Each figure: the words beside it on screen, its unit and period, the screens and the parts of them it is printed in, what it answers, how it is worked, what it says when it cannot be worked, the author's notes, the worked example the app's own door ran, and the decisions that govern it.

```json
[
 {
  "id": "MK-CF-M-024",
  "label": "each source of guaranteed income",
  "unit": "money",
  "per": "month",
  "grain": "one source",
  "screens": [
   "/monthly-income"
  ],
  "answers": "One line per guaranteed source — Social Security, a pension, an annuity, other — and what it pays a month.",
  "formula": "each stream as entered, brought to a monthly amount",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income"
  ],
  "refusal": "Nothing entered — the list is replaced by the door to enter it.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$2,100/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › MonthBars"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-028",
  "label": "each bill and the day it falls",
  "unit": "money",
  "grain": "one bill",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "One line per bill ahead, with its date and what is left after it.",
  "formula": "each dated bill in the window, in date order, with the running balance after it",
  "inputs": [
   "MK-CF-I-002 your bills",
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "A bill with NO date is not on the calendar — a date nobody gave would be read as one they did. It is still counted in the month’s total."
  ],
  "refusal": "No dated bill ahead — the COMING UP card is not drawn; with nothing behind the table at all, the one line \"Nothing entered yet. Add your bills ›\" sits under it (Q48).",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$4,800"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-09-27",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0078",
   "DEC-0187"
  ]
 },
 {
  "id": "MK-CF-M-030",
  "label": "Each person’s pay",
  "unit": "money",
  "per": "year",
  "screens": [
   "/base-pay"
  ],
  "answers": "What everyone in the household earns before anything is taken out.",
  "formula": "gross a year = the sum of every earner’s wage, each annualised from the rhythm they are paid in",
  "inputs": [
   "MK-CF-I-001 wage",
   "MK-CF-I-002 how often it is paid",
   "MK-XS-I-021 spouse wage"
  ],
  "decisions": [
   "A wage entered for a rhythm is annualised by that rhythm, never by a flat twelve."
  ],
  "refusal": "Shows $0 until a wage is entered; the screen offers the door to enter one.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
   "answer": "$109,200/year"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen",
   "BasePayScreen › EarnerSection"
  ],
  "decisions_that_govern_it": [
   "DEC-0188",
   "DEC-0207",
   "DEC-0352",
   "DEC-0375",
   "DEC-0380",
   "DEC-7942"
  ]
 },
 {
  "id": "MK-CF-M-032",
  "label": "Federal tax bracket",
  "unit": "percent",
  "screens": [
   "/base-pay"
  ],
  "answers": "What the next dollar earned costs in federal income tax.",
  "formula": "the published bracket the household’s wages fall in once each earner’s own 401(k) is out — the 401(k) is not taxed — less the standard deduction, for their filing status",
  "inputs": [
   "MK-CF-M-030 gross a year",
   "MK-XS-I-024 filing status"
  ],
  "decisions": [
   "Filing status is assumed to be jointly when two people earn and nobody has said (MK-CF-D-004)."
  ],
  "refusal": "The row is not shown until a wage is entered.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
   "answer": "22%"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0178",
   "DEC-0184",
   "DEC-0195",
   "DEC-0197",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-0380",
   "DEC-7797"
  ]
 },
 {
  "id": "MK-CF-M-033",
  "label": "Calculated federal tax",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay"
  ],
  "answers": "The federal income tax we calculate on the household’s wages, when nobody has entered their own figure.",
  "formula": "tax a month = federal tax on (everything taxable, less the 401(k)s and the standard deduction, at the published bands) ÷ 12 — the same in every month",
  "inputs": [
   "MK-CF-M-030 gross a year",
   "MK-XS-I-024 filing status",
   "MK-XS-I-025 how many are over 65"
  ],
  "decisions": [
   "Assumes the standard deduction, never itemised (MK-CF-D-002)."
  ],
  "refusal": "The row appears only when the figure is ours; an entered take-home already has tax inside it.",
  "worked": {
   "given": "One earner filing single: $5,000/month ($60,000/year), paying $400/month into a 401(k); no tax rate and no take-home told us, so the tax is ours. Taxed: $60,000 − $4,800 − $16,100 = $39,100 → $1,240 + 12% × $26,700 = $4,444/year, 7.41% of the $60,000.",
   "answer": "$370/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0195",
   "DEC-0208",
   "DEC-0375",
   "DEC-0380",
   "DEC-0384",
   "DEC-0389"
  ]
 },
 {
  "id": "MK-CF-M-034",
  "label": "Your 401(k)s",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay"
  ],
  "answers": "What everyone in the household puts into their own 401(k) each month.",
  "formula": "401(k) a month = the sum of every earner’s own contribution, the employer’s match excluded",
  "inputs": [
   "MK-CF-I-004 401(k) contribution"
  ],
  "decisions": [
   "The employer’s match is not counted here — it is not taken out of take-home (MK-CF-D-003)."
  ],
  "refusal": "The row is hidden when nobody contributes.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
   "answer": "$1,600/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-0380"
  ]
 },
 {
  "id": "MK-CF-M-035",
  "label": "The take-home above is higher than it will really be",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay"
  ],
  "answers": "By roughly how much the calculated take-home overstates what will reach the bank, because only federal income tax is taken out of it.",
  "formula": "overstated by = Σ over earners of (Social Security 6.2% of the wage up to the wage base + Medicare 1.45% of the whole wage + 0.9% of the wage above the additional-tax threshold) ÷ 12",
  "inputs": [
   "MK-CF-I-001 wage",
   "MK-ST-I-030 Social Security wage base",
   "MK-ST-I-031 Medicare additional-tax threshold"
  ],
  "decisions": [
   "State tax is not in this figure, because we do not know their state (MK-CF-D-005)."
  ],
  "refusal": "The warning appears only when the take-home is ours and estimated.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have told us no tax rate and no take-home, so the take-home shown is ours.",
   "answer": "$1,079/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0194",
   "DEC-0208",
   "DEC-0326",
   "DEC-0375",
   "DEC-0384",
   "DEC-0389"
  ]
 },
 {
  "id": "MK-CF-M-036",
  "label": "Everything else taken out",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay"
  ],
  "answers": "What a payslip takes out beyond the 401(k) — tax, medical cover and anything else bought through work — read back from the figures the person entered.",
  "formula": "for one earner: everything else = (their gross a year − their 401(k) a year − their take-home /year) ÷ 12. For the household: the sum of the earners’ figures, never a second subtraction.",
  "inputs": [
   "MK-CF-I-001 wage",
   "MK-CF-I-003 take-home as entered",
   "MK-CF-I-004 401(k) contribution"
  ],
  "decisions": [
   "Shown only when the person entered their own take-home, so the difference is theirs and not ours.",
   "The household figure is the sum of the earners’, so a total and its parts cannot disagree (rule 2)."
  ],
  "refusal": "The row is hidden for anyone whose take-home was calculated rather than entered; the household row is hidden unless every earner entered one.",
  "note": "ONE figure over two sets: one earner, and the household. Moved off the screen into this door on 2026-09-14 — the base-pay card used to do the subtraction itself (rule 5).",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. Each has typed their take-home each month: $5,850 and $3,400.",
   "answer": "$3,250/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen",
   "BasePayScreen › EarnerSection"
  ],
  "decisions_that_govern_it": [
   "DEC-0188",
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-037",
  "label": "Take-home each month",
  "unit": "money",
  "per": "month",
  "screens": [
   "/income-summary",
   "/income-manager"
  ],
  "answers": "What reaches the bank in a usual month, from every source of income added together.",
  "formula": "take-home a usual month = Σ of every source’s take-home in a usual month; a source that lands in one month of the year is not spread across twelve",
  "inputs": [
   "MK-CF-M-031 household take-home",
   "MK-CF-I-006 other income",
   "MK-CF-I-007 rental income",
   "MK-CF-I-008 retirement income"
  ],
  "decisions": [
   "A once-a-year source keeps its own month and is shown separately, never averaged in."
  ],
  "refusal": "Shows $0 on a fresh account, with the door to enter income — never a dash.",
  "note": "FOUND BY THE WORKED EXAMPLE AND FIXED THE SAME DAY, 2026-09-28. This total read $9,798/month while the two take-home lines beneath it (MK-CF-M-038) added to $9,398 — $400 apart, exactly the spouse's monthly 401(k). MK-CF-F-060 salaryGrossByMonth sums EVERY earner's wage (his ruling, 2026-08-27) but the 401(k) taken off that household gross was written as the first earner's alone, so a spouse's was never subtracted — the take-home read too high by their contribution, and the taxable base too. NOT A NEW QUESTION: he ruled this on 2026-09-12 on income-end-to-end v07 — \"one card disagreeing with itself; corrected to the take-home line\" — and the correction reached the mock and not the code. Now MK-CF-F-206 householdK401ByMonth counts every earner in the months that earner is paid, and [a test of the app] holds the ruling. The six personas all passed throughout because none had a spouse with their own wage AND their own 401(k); twoEarnersBoth401k now does.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$9,398/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeManagerScreen › BonusAndStock",
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0078",
   "DEC-0108",
   "DEC-0149",
   "DEC-0152",
   "DEC-0165",
   "DEC-0166",
   "DEC-0181",
   "DEC-0182",
   "DEC-0187",
   "DEC-0188",
   "DEC-0189",
   "DEC-0191",
   "DEC-0194",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-0376",
   "DEC-0387",
   "DEC-0431"
  ]
 },
 {
  "id": "MK-CF-M-038",
  "label": "each source of take-home",
  "unit": "money",
  "per": "month",
  "screens": [
   "/income-summary"
  ],
  "answers": "What each source of income puts into the bank in a usual month, named and listed.",
  "formula": "one line per source: the earner’s take-home, or the source’s monthly amount",
  "inputs": [
   "MK-CF-M-031 household take-home",
   "MK-CF-I-006 other income",
   "MK-CF-I-007 rental income"
  ],
  "refusal": "The list is replaced by the door to enter income when nothing is entered.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$5,898/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-0376",
   "DEC-0387"
  ]
 },
 {
  "id": "MK-CF-M-039",
  "label": "its own month, never spread",
  "unit": "money",
  "screens": [
   "/income-summary",
   "/income-manager"
  ],
  "answers": "What the month a once-a-year source lands in brings in, all of it — the usual take-home plus that source after tax — shown in its own month rather than divided by twelve.",
  "formula": "the standout month = of the twelve months’ take-home, the largest, when it is more than the usual month by over $1: its amount is that whole month’s take-home (the usual month plus the lump, after tax), its label the month’s name",
  "inputs": [
   "MK-CF-I-009 bonus",
   "MK-CF-I-010 equity vesting"
  ],
  "decisions": [
   "A lump that lands once is never averaged across the year (founder, 2026-08-28)."
  ],
  "refusal": "The line is hidden when no source behaves this way.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$40,316"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeManagerScreen › BonusAndStock",
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-040",
  "label": "is not here — it is reinvested where it is earned",
  "unit": "money",
  "per": "month",
  "screens": [
   "/income-summary"
  ],
  "answers": "Income that is taxed but never reaches the bank, so the two totals on this screen can be told apart.",
  "formula": "taxed but not landed = interest and dividends earned inside accounts, which stay where they are earned",
  "inputs": [
   "MK-CF-I-011 interest and dividends"
  ],
  "refusal": "The sentence is hidden when there is none.",
  "worked": {
   "given": "The two earners above, with $3,600/year of interest and dividends earned inside their accounts and left there.",
   "answer": "$300/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0179",
   "DEC-0182",
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-041",
  "label": "What it is taxed on",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "The whole year of income the tax is calculated on — the gross less the 401(k)s — a different number from the take-home, and said to be one.",
  "formula": "what it is taxed on = gross a year (MK-CF-M-076) − the year's 401(k)s (MK-CF-M-077), never below $0 — his DEC-0283: income before tax is gross less the 401(k)",
  "inputs": [
   "MK-CF-M-076 gross a year",
   "MK-CF-M-077 401(k)s a year"
  ],
  "decisions": [
   "Income before tax is gross less the 401(k) and any other deduction; gross is before any deductions (DEC-0283, 2026-09-10)."
  ],
  "refusal": "Shows $0 on a fresh account, with the door to enter income.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$150,000/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-0387",
   "DEC-7796",
   "DEC-7887"
  ]
 },
 {
  "id": "MK-CF-M-042",
  "label": "each taxed source",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "What each source contributes to the year the tax is calculated on.",
  "formula": "one line per taxable source, at its yearly amount",
  "inputs": [
   "MK-CF-M-041 gross a year"
  ],
  "refusal": "The list is replaced by the door to enter income when nothing is entered.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$109,200/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-0387"
  ]
 },
 {
  "id": "MK-CF-M-043",
  "label": "Federal tax bracket",
  "unit": "percent",
  "screens": [
   "/income-summary"
  ],
  "answers": "What the next dollar costs in federal income tax, with every source counted, not wages alone.",
  "formula": "the published bracket that what the year is taxed on falls in once the 401(k)s are out — every source counted, less each earner’s own 401(k), less the standard deduction — for their filing status",
  "inputs": [
   "MK-CF-M-041 gross a year",
   "MK-XS-I-024 filing status"
  ],
  "refusal": "The row is not shown until income is entered.",
  "note": "The same concept as MK-CF-M-032 on the base-pay screen, over a wider base: that one counts wages, this one counts every source. Conflict C-5 on the orchestrator map asks whether they stay two figures.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "22%"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0178",
   "DEC-0184",
   "DEC-0195",
   "DEC-0196",
   "DEC-0197",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-7796",
   "DEC-7797"
  ]
 },
 {
  "id": "MK-CF-M-044",
  "label": "Calculated federal tax",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "The federal income tax for the year, at whichever rate is in force — theirs if they entered one, ours if not.",
  "formula": "tax a year = a rate typed by the person × the year's gross (MK-CF-M-076); when it is ours, federal tax on what it is taxed on (MK-CF-M-041: the gross less the 401(k)s) less the standard deduction, at the published bands — plus a state rate the person entered",
  "inputs": [
   "MK-CF-M-041 what it is taxed on",
   "MK-CF-M-076 gross a year",
   "MK-CF-I-005 tax rate as entered",
   "MK-XS-I-024 filing status"
  ],
  "decisions": [
   "When it is ours it assumes the standard deduction and is federal only, plus a state rate entered (MK-CF-D-002, DEC-7608).",
   "The 401(k) comes off before tax (DEC-0283)."
  ],
  "refusal": "The row is not shown until income is entered.",
  "worked": {
   "given": "The same two earners filing jointly, $169,200 of wages and $19,200 into their 401(k)s, with no tax rate typed. Taxed on $150,000; less the $32,200 standard deduction, $117,800 → $2,480 + $9,120 + 22% × $17,000 = $15,340.",
   "answer": "$15,340/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0195",
   "DEC-0197",
   "DEC-0208",
   "DEC-0375",
   "DEC-0389",
   "DEC-7798",
   "DEC-7887"
  ]
 },
 {
  "id": "MK-CF-M-045",
  "label": "Social Security takes 6.2% of a wage up to",
  "unit": "money",
  "per": "year",
  "screens": [
   "/base-pay"
  ],
  "answers": "The wage ceiling above which no more Social Security tax is taken, named in the warning so the 6.2% can be checked.",
  "formula": "the published wage base for the tax year",
  "inputs": [
   "MK-ST-I-030 Social Security wage base"
  ],
  "decisions": [
   "Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4)."
  ],
  "refusal": "Never absent — it is a published figure, not a calculation.",
  "worked": {
   "given": "The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not ours to choose; they are read back so the sentence on screen can be checked against the law.",
   "answer": "$184,500/year"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0205",
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-046",
  "label": "Medicare 1.45% of everything, 0.9% more above",
  "unit": "money",
  "per": "year",
  "screens": [
   "/base-pay"
  ],
  "answers": "The wage above which the extra Medicare tax starts, named in the warning so the 0.9% can be checked.",
  "formula": "the published additional-Medicare-tax threshold for the tax year",
  "inputs": [
   "MK-ST-I-031 Medicare additional-tax threshold"
  ],
  "decisions": [
   "Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4)."
  ],
  "refusal": "Never absent — it is a published figure, not a calculation.",
  "worked": {
   "given": "The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not ours to choose; they are read back so the sentence on screen can be checked against the law.",
   "answer": "$200,000/year"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0194",
   "DEC-0205",
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-060",
  "label": "Lowest point",
  "unit": "money",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "The lowest the balance falls to in the twelve months ahead, and which month.",
  "formula": "the smallest running balance across the twelve month-ends, starting from the balance you gave",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-002 your bills",
   "MK-XS-I-023 salary and other income"
  ],
  "refusal": "No starting balance — the table starts from $0 and says so.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$1,800"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-061",
  "label": "END — where the month leaves you",
  "unit": "money",
  "grain": "one month",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "The balance at the end of each month: the month before’s end, plus what came in, less what went out.",
  "formula": "running balance = last month’s end + inflow − outflow, month by month from the starting balance",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-002 your bills",
   "MK-XS-I-023 salary and other income"
  ],
  "refusal": "No starting balance — the chain starts from $0 and says so.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$6,600"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-062",
  "label": "Short — set it aside by <date>",
  "unit": "money",
  "grain": "one bill",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "How much more is needed for a bill by the day the money has to be there.",
  "formula": "the bill − what is there by its need-by date (MK-CF-M-063, read from the month table), when that is less",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-002 your bills",
   "MK-XS-I-023 salary and other income",
   "MK-NW-I-002 your debts"
  ],
  "refusal": "Nothing short — the line reads Covered instead.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$0"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-7936"
  ]
 },
 {
  "id": "MK-CF-M-063",
  "label": "Covered — about $X there by <date>",
  "unit": "money",
  "grain": "one bill",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "What is projected to be in the account on the day a bill’s money has to be there.",
  "formula": "the month table’s End for the month before the need-by date (the starting balance when that day is in this month), plus what that month brings or takes on a day already passed — aid or a loan on the day it lands, a dated bill on its day (the 1st when it has none) — less the month’s regular money (pay, everyday expenses, debt payments) only when it takes out more than it brings in: the lower of the two month-ends either side of the day; less any bill listed above it that falls due after that day and by this bill’s due date",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-002 your bills",
   "MK-XS-I-023 salary and other income",
   "MK-NW-I-002 your debts"
  ],
  "decisions": [
   "Read from the month table on the same screen, so this line and the End column cannot disagree.",
   "Pay is never counted before its month ends: the table does not know the day it lands, and no day is invented."
  ],
  "refusal": "No balance to start from — nothing is projected.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$8,000"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-7936"
  ]
 },
 {
  "id": "MK-CF-M-066",
  "label": "Dividends, interest & coupons",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-manager"
  ],
  "answers": "What your holdings and bonds paid out over the last twelve months, from the records.",
  "formula": "the dividend, interest and coupon records of the last twelve months, added up",
  "inputs": [
   "MK-NW-I-004 the activity records",
   "MK-NW-I-001 your accounts"
  ],
  "refusal": "No record of any — $0, never an estimate.",
  "worked": {
   "given": "One account that recorded a $300 dividend in June and $120 of interest in March.",
   "answer": "$420/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "IncomeManagerScreen › InterestAndDividends"
  ],
  "decisions_that_govern_it": [
   "DEC-7933"
  ]
 },
 {
  "id": "MK-CF-M-069",
  "label": "Your guaranteed income",
  "unit": "money",
  "per": "month",
  "screens": [
   "/monthly-income"
  ],
  "answers": "All the guaranteed income being received now, added up for a month.",
  "formula": "the sum of each source of guaranteed income (MK-CF-M-024)",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income"
  ],
  "refusal": "Nothing entered — $0, with the door to enter it.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$2,100/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "MonthlyIncomeScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-076",
  "label": "= Gross /year",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "The whole year of income before any deductions — every taxable source, wages at gross.",
  "formula": "gross a year = Σ of every taxable source over the year, wages included at gross, before any deductions",
  "inputs": [
   "MK-CF-M-030 gross a year",
   "MK-CF-I-006 other income",
   "MK-CF-I-007 rental income",
   "MK-CF-I-011 interest and dividends"
  ],
  "decisions": [
   "Gross is before any deductions (DEC-0283, 2026-09-10). It was printed as MK-CF-M-041 until 2026-10-24, when that became the income after the 401(k)s."
  ],
  "refusal": "Not shown on a fresh account — the door to enter income stands in the list.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$169,200/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-7887"
  ]
 },
 {
  "id": "MK-CF-M-077",
  "label": "Your 401(k)s",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "What every earner puts into their own 401(k) over the year — taken off the gross before tax.",
  "formula": "401(k)s a year = each earner's own contribution for the months they are paid, added up (the employer's match excluded) — as many dollars as the gross is above what it is taxed on",
  "inputs": [
   "MK-CF-I-004 401(k) contribution"
  ],
  "decisions": [
   "A 401(k) comes off the gross before tax (DEC-0283, 2026-09-10; founder audit B05)."
  ],
  "refusal": "A real $0 when no 401(k) is entered; not shown on a fresh account.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$19,200/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-7887"
  ]
 }
]
```

## The cross-card checks for this part

From `moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json`. For each, build one household of your own, work the figures named, and say whether they agree.

```json
[
 {
  "id": "X3",
  "check": "For a household whose only income is wages, the take-home on Base pay equals the take-home each month on the Income summary.",
  "figures": [
   "MK-CF-M-031",
   "MK-CF-M-037"
  ],
  "tenet": 4,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
 },
 {
  "id": "X5",
  "check": "The 401(k) of each earner comes off the take-home and off the income that is taxed, and the household total is the earners' figures added.",
  "figures": [
   "MK-CF-M-034",
   "MK-CF-M-037",
   "MK-CF-M-041"
  ],
  "tenet": 4,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
 },
 {
  "id": "X6",
  "check": "For a household whose only income is wages, the federal band on Base pay and on the Income summary is the same band.",
  "figures": [
   "MK-CF-M-032",
   "MK-CF-M-043"
  ],
  "tenet": 4,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
 },
 {
  "id": "X7",
  "check": "A bill that falls once a year is in its own month on the bill calendar and in that month's planned outflow, and in no other month.",
  "figures": [
   "MK-CF-M-016",
   "MK-CF-M-028",
   "MK-CF-M-048"
  ],
  "tenet": 4,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0018",
  "decided": "2026-07-31",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "saves as you type",
  "the_log_records": "Two findings from his walk of build 47:\n1. The company-share editor gains a field for the ticker symbol, which fetches the live price to start you off and stays editable.\n2. It gains a real Done button at the bottom. The link at the top of the screen was invisible from the end of a long form, and the form says it saves as you type.",
  "governs": "src/screens/IncomeManagerScreen.tsx"
 },
 {
  "id": "DEC-0078",
  "decided": "2026-08-11",
  "type": "DESIGN",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "cut the build",
  "the_log_records": "Build 51 was cut only after his explicit “cut the build” against a presented checklist, with the gates satisfied in order: scope complete at 59 of 59 rows, and the mock-match audits FINISHED rather than running alongside.",
  "governs": "MK-CF-M-037 · MK-CF-M-028"
 },
 {
  "id": "DEC-0108",
  "decided": "2026-08-11",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "Update master PRD document. Go to master list of what",
  "the_log_records": "The master list of what is built now records the day’s work rather than being reconstructed later: 18 built items in five groups, written down the day they were built.",
  "governs": "MK-CF-M-037 · MK-NW-M-027 · MK-NW-M-020 · MK-NW-M-034"
 },
 {
  "id": "DEC-0149",
  "decided": "2026-08-14",
  "type": "DESIGN",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "rename the latest folder that way we know what is single source of truth",
  "the_log_records": "Four folders of design deliveries had accumulated outside the app, all named after net worth because that was the first screen drawn, though they now also held the Performance and Plan work. One named home for them, so the newest delivery can be found.",
  "governs": "MK-PF-M-008 · MK-CF-M-037 · MK-NW-M-021 · MK-NW-M-008"
 },
 {
  "id": "DEC-0152",
  "decided": "2026-08-14",
  "type": "DESIGN",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "s own five words,",
  "the_log_records": "“create a folder called August 14th Design, move the latest files there so there is no confusion, and re-check every file carries the decisions we made.” One named home for the live set, and every file in it re-checked against the decisions rather than assumed to carry them.",
  "governs": "MK-CF-M-037 · MK-NW-M-006 · MK-NW-M-029"
 },
 {
  "id": "DEC-0165",
  "decided": "2026-08-14",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "how to avoid this in the next brief?",
  "the_log_records": "“how to avoid this in the next brief?” The honest answer is that more care would not have helped — all three errors were written while reading carefully, and two survived several reviews. So every number in a brief is now either computed by a test or explicitly labelled as his own figure, and a test fails the build when a brief and the calculation disagree.",
  "governs": "MK-CF-M-037 · MK-NW-M-029 · MK-PF-M-008 · MK-NW-M-006"
 },
 {
  "id": "DEC-0166",
  "decided": "2026-08-14",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "not sure what you want me to check here.",
  "the_log_records": "“not sure what you want me to check here.” He was right and the framing was mine: I put three options to him as a product decision when it was a technical correction with one right answer. A correction is not a question.",
  "governs": "MK-CF-M-037 · MK-NW-M-006 · MK-NW-M-021 · MK-NW-M-015"
 },
 {
  "id": "DEC-0176",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "s against two people",
  "the_log_records": "The whole income surface redesigned. Six decisions:\n1. Base pay becomes a full screen with one expandable section per earner — gross, 401(k), employer match, and what actually lands.\n2. A 14-month dated table when pay varies, rather than one typical figure.\n3. BOTH earners are captured, not one: a household on $84,000 plus $54,000 was being read as $84,000 — one person’s income against two people’s spending.\n4. A filing-status question, which had never been asked, so every couple was taxed as a single filer.\n5. Bonus and company shares follow the same who-earns pattern.\n6. Interest and dividends are worked out from your holdings rather than asked for, and treated as TAXABLE BUT NOT SPENDABLE.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/base-pay.ts"
 },
 {
  "id": "DEC-0178",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0178, confirmed as written: The tax band is produced ONCE, at total income (MK-CF-F-084 taxable annual → MK-CF-F-090 effective rate). The base-pay s",
  "the_log_records": "Your tax band is worked out ONCE, from your total income, and every screen reads that one figure. The base-pay screen does not work out a band of its own — a band is set by everything you are taxed on together, so a screen that sees only your wage would show the wrong one.",
  "governs": "MK-CF-M-032 · MK-CF-M-043"
 },
 {
  "id": "DEC-0179",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0179, confirmed as written: Interest and dividends are WORKED OUT from the accounts (MK-NW-F-063 interest income annual), shown with the working, an",
  "the_log_records": "Interest and dividends are taxed but are not money you can spend, unless you tell us they reach your bank. Two decisions:\n1. In most accounts they are reinvested where they are earned and never arrive, so they are taken out of your spendable take-home.\n2. The tax on them still comes out, because it is real — so simply deleting them would have been wrong in the other direction.",
  "governs": "MK-CF-M-040 · MK-CF-O-004"
 },
 {
  "id": "DEC-0181",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "fix it completely. No two functions doing same thing.",
  "the_log_records": "Fifteen calculations were each written in two or more places; now none is. 560 calculations, 560 distinct names. A second copy of a calculation cannot be fixed by fixing the first — which is how the same defect kept coming back.",
  "governs": "MK-CF-M-037"
 },
 {
  "id": "DEC-0182",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "for orchestrator use O instead of F to make it easy to identify.",
  "the_log_records": "The one function a screen calls for its question gets its own kind of identifier, so it can be told apart at a glance from the ordinary calculations underneath it.",
  "governs": "MK-CF-M-037 · MK-CF-M-040 · MK-XS-M-004"
 },
 {
  "id": "DEC-0184",
  "decided": "2026-08-27",
  "type": "BUILD RECORD",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "",
  "the_log_records": "The app carried TWO complete tax engines, both live from the same profile on the same day, and one of them could not read a filing status at all. One is deleted. ZERO numbers moved for a single filer — the two were identical arithmetic there — and it becomes correct for couples the moment the filing-status question lands.",
  "governs": "MK-CF-F-100 taxableIncomeFor · MK-CF-F-101 taxOwedFor · MK-CF-F-102 effectiveRateOnGrossFor · MK-CF-F-103 marginalBracketFor · MK-CF-F-097 grossFromNet (src/domain/income/tax.ts) · MK-CF-M-032 · MK-CF-M-043 · MK-MN-M-028"
 },
 {
  "id": "DEC-0187",
  "decided": "2026-08-27",
  "type": "BUILD RECORD",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "",
  "the_log_records": "Months are keyed by their actual date rather than by position — “2026-07”, not “slot 7 of twelve”. The twelve-slot version wrote January into the wrong year whenever the twelve months crossed a New Year.",
  "governs": "MK-CF-M-037 · MK-CF-M-016 · MK-CF-M-028"
 },
 {
  "id": "DEC-0188",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Who earns this income? You / Partner / Both",
  "the_log_records": "A spouse’s wage becomes its own block, using the SAME field names as your own, and the household total sums every earner. A household on $84,000 plus $54,000 had been read as $84,000 — one person’s income against two people’s spending.",
  "governs": "MK-CF-M-037 · MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-036"
 },
 {
  "id": "DEC-0189",
  "decided": "2026-08-27",
  "type": "BUILD RECORD",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "",
  "the_log_records": "Every “today” in the app is the person’s OWN calendar day, not the day in universal time. Converting local midnight to universal time moves the date back a day anywhere east of Greenwich — which made every look-back answer “nothing” on a device set to India time.",
  "governs": "MK-CF-M-037"
 },
 {
  "id": "DEC-0190",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "Or answer guided setup questions",
  "the_log_records": "A signed-in person opening the guided setup now STAYS there. It previously bounced them back to Home in three of its four states, so the setup was effectively unreachable.",
  "governs": "src/screens/FirstRunScreen.tsx · src/screens/BasePayScreen.tsx"
 },
 {
  "id": "DEC-0191",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "your tax band, on everything you are taxed on",
  "the_log_records": "Your tax band is named as being on EVERYTHING you are taxed on — not just your wage. The band reads every source, so rent and dividends count toward which band you are in.",
  "governs": "MK-CF-M-037"
 },
 {
  "id": "DEC-0194",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "effective tax rate % from last year",
  "the_log_records": "The tax rate is shown where the money is, and can be corrected there. The rate could previously only be changed on a step inside the guided setup — itself unreachable — so the figure driving every take-home in the app could not be put right where you noticed it was wrong.",
  "governs": "MK-CF-M-035 · MK-CF-M-037 · MK-CF-M-031 · MK-CF-M-046"
 },
 {
  "id": "DEC-0195",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Federal tax bracket",
  "the_log_records": "The base-pay card names the federal tax bracket, shows the estimated tax in MONEY rather than as a percentage, and says it assumes the standard deduction. A payslip has dollars on it, not a rate.",
  "governs": "MK-CF-M-044 · MK-CF-M-032 · MK-CF-M-033 · MK-CF-M-043"
 },
 {
  "id": "DEC-0196",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "ll use 24% everywhere your take-home matters — cash flow, budget, what",
  "the_log_records": "“We’ll use 24% everywhere your take-home matters — cash flow, budget, what’s left over. One-offs like a Roth conversion still use the tax tables.” The screen promises only what a payslip figure can answer: a rate off a payslip is an AVERAGE, and four places need the rate on your NEXT dollar.",
  "governs": "MK-CF-M-043 · MK-CF-F-181"
 },
 {
  "id": "DEC-0197",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in your bank, or OUR estimate — and each one says whose it is on the screen.",
  "the_log_records": "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in your bank, or OUR estimate — and each one says whose it is on the screen.",
  "governs": "MK-CF-M-029 · MK-CF-M-032 · MK-CF-M-043 · MK-CF-M-044"
 },
 {
  "id": "DEC-0198",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "by default = reinvested). The onboarding dividends screen now asks",
  "the_log_records": "Dividends and interest come OUT of your spendable take-home, because in most accounts they are reinvested where they are earned and never reach your bank. The onboarding screen asks “Does this reach your bank?” and says what the answer means.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/income-summary.ts"
 },
 {
  "id": "DEC-0202",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "onboarding",
  "the_log_records": "The base-pay step in the guided setup IS the base-pay screen — one piece of screen, two frames — so the questions cannot drift apart between the two places you can answer them. It saves as you type rather than on a Save button the setup never shows.",
  "governs": "src/screens/BasePayScreen.tsx · src/screens/FirstRunScreen.tsx"
 },
 {
  "id": "DEC-0205",
  "decided": "2026-09-01",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0205, confirmed as written: New src/__tests__/statutory_constants.test.ts: the 2026 bracket tables and deductions, the complete IRS Uniform Lifetime",
  "the_log_records": "Every figure set by law is typed in from the published source. The first run against the real figures found three errors: the IRA limits were a year out of date, the bigger catch-up allowance for ages 60 to 63 was missing entirely in an app built for ages 55 to 70, and four of the required-withdrawal divisors were slightly wrong from being interpolated rather than typed.",
  "governs": "IRS_LIMITS in src/domain · MK-CF-M-045 · MK-CF-M-046"
 },
 {
  "id": "DEC-0207",
  "decided": "2026-09-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "s first device pass, two accuracy-class: the card contradicted itself ($21,159 − $4,380 − $1,656 ≠ $16,403 — every estimated earner was granted the FULL joint deduction), and a two-earner household was banded as single (32% vs jointly 24%) because",
  "the_log_records": "The pay card's own rows must add up: your gross pay, minus tax, minus your 401(k) contributions, equals your take-home — to the dollar, with a 401(k) row shown. It came from his first device pass, where the card contradicted itself because each earner was being given the whole married-couple tax allowance separately.",
  "governs": "MK-CF-M-037 · MK-CF-M-032 · MK-CF-M-043 · MK-CF-M-030"
 },
 {
  "id": "DEC-0208",
  "decided": "2026-09-02",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "worked out",
  "the_log_records": "Where one person entered their take-home and the other’s is calculated, the note says so per person — “Your take-home: $5,000 (you entered) · Sam’s take-home: about $3,686 (calculated)”. The prose version was misread: the entered $5,000 was taken for gross.",
  "governs": "MK-CF-M-031 · MK-CF-M-033 · MK-CF-M-035 · MK-CF-M-044"
 },
 {
  "id": "DEC-0209",
  "decided": "2026-09-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Always use same words to describe same thing in the app. There is no score for creative writing.",
  "the_log_records": "One word per concept across the income screens: “take-home” replaces “lands in your bank” and “takes home”; “calculated” replaces “worked out”, “Estimated federal tax” and “our estimate”. A test enforces it.",
  "governs": "MK-CF-M-037 · MK-CF-M-043 · MK-CF-M-032 · MK-CF-M-031"
 },
 {
  "id": "DEC-0270",
  "decided": "2026-09-03",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "a figure the person gave us → 'you entered'",
  "the_log_records": "“a figure the person gave us → ‘you entered’.” One phrase for a number you typed, so it is never confused with one the app worked out.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/domain/income/tax-rate.ts"
 },
 {
  "id": "DEC-0283",
  "decided": "2026-09-10",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "Gross should be before any deductions. For example Income before tax is not same as gross as Income Before Tax = Gross Income - 401K - any other deductions such as medical premium.",
  "the_log_records": "“Gross should be before any deductions. For example Income before tax is not same as gross as Income Before Tax = Gross Income - 401K - any other deductions such as medical premium.” So “Gross” is labelled “before any deductions”, and the earlier wording “before tax” is retired — it meant something different and narrower.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md"
 },
 {
  "id": "DEC-0291",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "spouse",
  "the_log_records": "“spouse.” The word is spouse, not partner, in everything a person reads.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/base-pay.ts"
 },
 {
  "id": "DEC-0326",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "married bands are not double the single ones at the top",
  "the_log_records": "“married bands are not double the single ones at the top.” A couple’s tax bands are NOT simply twice a single person’s in the upper brackets — assuming they are overstates take-home for higher earners.",
  "governs": "MK-CF-M-035"
 },
 {
  "id": "DEC-0327",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "state tax applies to taxable income, never gross",
  "the_log_records": "“state tax applies to taxable income, never gross.” Applying a state rate to gross income overstates the tax by the whole deduction.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/domain/income/onboarding.ts"
 },
 {
  "id": "DEC-0345",
  "decided": "2026-09-13",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "inputs assembled once per family — one function builds the person's state for a family and every orchestrator in that family reads it; no orchestrator and no screen assembles its own",
  "the_log_records": "“inputs assembled once per family — one function builds the person’s state for a family and every orchestrator in that family reads it.” The data a group of screens needs is assembled once, so two screens in the same family cannot start from different inputs.",
  "governs": "MK-NW-F-145 netWorthInputs (src/hooks/useNetWorthInputs.ts) · src/screens/NetWorthScreen.tsx · src/screens/HomeScreen.tsx · src/screens/InsightsScreen.tsx · src/screens/OtherInvestmentsScreen.tsx · src/screens/StressTestScreen.tsx · src/screens/JobSafetyScreen.tsx · src/screens/IncomeManagerScreen.tsx"
 },
 {
  "id": "DEC-0352",
  "decided": "2026-09-14",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "a door DECLARES each figure it hands out beside the code that computes it (identifier, the words on screen, unit, formula in plain English, inputs, decisions, refusal); a screen prints a figure ONLY by its identifier; and the master file's figure rows are PRINTED from those declarations rather than typed, so the file and the code cannot disagree",
  "the_log_records": "“a door DECLARES each figure it hands out beside the code that computes it — identifier, the words on screen, unit, formula in plain English, inputs, decisions.” The master file’s rows are then PRINTED from those declarations, so the file is a printout of the code rather than a description of it that can go stale.",
  "governs": "MK-CF-M-030"
 },
 {
  "id": "DEC-0375",
  "decided": "2026-09-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "No. Base Pay is one component of total income or income summary and not the same. Have your checked underlying function? Are two functions calculating save thing?",
  "the_log_records": "“No. Base Pay is one component of total income or income summary and not the same. Have your checked underlying function? Are two functions calculating save thing?” He rejected the grouping and sent me to check the code — where the nesting turned out to be correct, and my proposal was wrong.",
  "governs": "MK-XS-M-006 · MK-CF-M-006 · MK-CF-M-007 · MK-CF-M-008 · MK-CF-M-009 · MK-CF-M-010 · MK-CF-M-027 · MK-CF-M-029 · MK-MN-M-011 · MK-MN-M-012 · MK-MN-M-013 · MK-MN-M-014 · MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-032 · MK-CF-M-033 · MK-CF-M-034 · MK-CF-M-035 · MK-CF-M-036 · MK-CF-M-037 · MK-CF-M-038 · MK-CF-M-039 · MK-CF-M-040 · MK-CF-M-041 · MK-CF-M-042 · MK-CF-M-043 · MK-CF-M-044 · MK-CF-M-045 · MK-CF-M-046"
 },
 {
  "id": "DEC-0376",
  "decided": "2026-09-12",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "one card disagreeing with itself: the household take-home row read ~$10,442/month over a take-home line of ~$9,242; corrected to ~$9,242. A total agrees with the lines printed above it, and it is the LINES that are right.",
  "the_log_records": "A total must equal the lines printed above it, and where they disagree it is the LINES that are right. The income card showed a household take-home of about $10,442 a month over a take-home line of about $9,242 — the total was corrected down to the lines.",
  "governs": "MK-CF-M-037 · MK-CF-M-038 · MK-CF-O-004 · MK-CF-O-001 · MK-CF-M-037 · MK-CF-F-060 · MK-CF-F-206"
 },
 {
  "id": "DEC-0380",
  "decided": "2026-09-02",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his first build-54 device pass — the card contradicted itself ($21,159 − $4,380 − $1,656 ≠ $16,403) because every estimated earner was granted the FULL joint deduction; and a two-earner household was banded as single (32% vs jointly 24%).",
  "the_log_records": "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his first device pass of build 54, where the card contradicted itself because every estimated earner was granted the FULL joint deduction.",
  "governs": "MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-032 · MK-CF-M-033 · MK-CF-M-034 · MK-CF-O-001 · MK-CF-O-001"
 },
 {
  "id": "DEC-0384",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "FOUNDER RULING: the tax estimate STAYS FEDERAL. “Payroll tax applies to wages, and our gross also carries rent, dividends and bonuses — applying 7.65% to that total would be wrong, not merely imprecise. State tax cannot be known without asking. So we work out the one thing we can, say so, and let it be corrected.”",
  "the_log_records": "Our tax estimate covers federal income tax only, and says so on the screen. Three decisions:\n1. We do not add payroll tax to it. Payroll tax applies to wages, and our gross figure also holds rent, dividends and bonuses — applying 7.65% to all of that would be wrong, not just rough.\n2. We do not guess state tax, because it cannot be known without asking.\n3. We work out the one thing we can, name the gap in dollars, and let you correct it.",
  "governs": "MK-CF-M-033 · MK-CF-M-035 · MK-CF-O-001"
 },
 {
  "id": "DEC-0387",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "TWO TOTALS, NEVER ONE on the income recap: what lands each month, and what the year is taxed on — each labelled. And a recap SHOWS, it does not ask: the rate is set on Your base pay and every other screen reads it.",
  "the_log_records": "The income screen shows two totals and labels each: what lands in your bank each month, and what the year is taxed on. They are different numbers about the same wages. Mixing them is how a take-home figure comes to include a bonus nobody has been paid yet.",
  "governs": "MK-CF-M-037 · MK-CF-M-038 · MK-CF-M-041 · MK-CF-M-042 · MK-CF-O-004 · MK-CF-O-004"
 },
 {
  "id": "DEC-0389",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "calculated (your standing order, 2026-09-02)",
  "the_log_records": "“calculated” is the word for a figure the app worked out — his standing order. “worked out”, “Estimated federal tax” and “our estimate” are retired.",
  "governs": "MK-CF-M-031 · MK-CF-M-033 · MK-CF-M-035 · MK-CF-M-044"
 },
 {
  "id": "DEC-0392",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "\"you entered\"",
  "the_log_records": "“a figure the person gave us → ‘you entered’.” One phrase for a number you typed, so it is never confused with one the app worked out.",
  "governs": "the canon table · BasePayScreen · ItemizeScreen · WillItLastScreen · ContributionRoomScreen"
 },
 {
  "id": "DEC-0396",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "/month, /year",
  "the_log_records": "“/month, /year.” One way of writing a period, everywhere — and, asked about the rest, “/quarter, /week, /2 weeks”. “a month” and “/mo” are retired.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/screens/IncomeDetailScreen.tsx"
 },
 {
  "id": "DEC-0431",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "Nothing entered yet.",
  "the_log_records": "“Nothing entered yet.” The approved wording for a screen with no data: the layout stays, the figure reads $0, this sentence explains it, and the door to enter something sits beneath.",
  "governs": "MK-CF-M-037"
 },
 {
  "id": "DEC-1112",
  "decided": "2026-10-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "ok. open them from build but make sure it meets new design standards.",
  "the_log_records": "The six Cash flow screens that had no drawing — Log income, Month detail, Bill calendar, Paycheck months, Monthly income, Worth a look — are approved as built, on condition that each meets the screen standard. Each was audited against it the same day and the gaps fixed; the v02 drawings show the result.",
  "governs": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html · MoneyKeel/documents/cashflow/moneykeel_pres_mock_monthly-income_v02.html · src/screens/BillCalendarScreen.tsx · src/screens/MonthlyIncomeScreen.tsx · src/constants/doors.ts"
 },
 {
  "id": "DEC-1134",
  "decided": "2026-10-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "I am pretty confident - these are no longer needed per new design and like before you like to beat around the bush and be stubborn that you are right, versus trying to think through - why we need this, and does the need still exists.",
  "the_log_records": "Four Cash flow screens are retired: Month detail, Paycheck months, Log income and Worth a look. No approved design draws a door to any of them, and no ruling needs them. Bill calendar and Monthly income stay only as the editors behind figures the approved designs show — not as destinations.",
  "governs": "src/screens/CashFlowScreen.tsx (no door to a month or the calendar) · src/components/PaycheckCard.tsx · src/domain/insights/index.ts · app/_layout.tsx · MK-CF-M-017 · MK-CF-M-026 · MK-CF-M-064 · MK-CF-M-067 · MK-CF-M-068 (retired) · MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md"
 },
 {
  "id": "DEC-1560",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Rest - keep it.",
  "the_log_records": "In twelve named places the app differs from its approved drawing and the app stays as it is.",
  "governs": "[a test of the app] · [a test of the app] · [a test of the app] (each names the difference) · Calculation Module code/scripts/moneykeel_workplan.json"
 },
 {
  "id": "DEC-1625",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "#4 - remove second sentence.",
  "the_log_records": "On Your base pay, when the app calculates the tax, the card states its own sum and stops: \"$11,500 gross − $873 tax − $1,200 of 401(k)s = $9,427.\" The second drawn sentence is not shown.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts (MK-CF-O-001 basePay) · src/screens/BasePayScreen.tsx · [a test of the app]"
 },
 {
  "id": "DEC-1668",
  "decided": "2026-10-04",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "add it to the cash as losing job does not mean loosing rental income too.",
  "the_log_records": "The emergency fund counts rent from a property. Rent keeps arriving when pay stops, so each month it is added to the cash: months = cash ÷ (a month of essentials − the rent).",
  "governs": "MK-NW-M-013 EMERGENCY FUND — X.X months · MK-NW-M-046 at your planned spend · MK-NW-M-064 rent from your property, which keeps arriving · MK-MN-M-020 · MK-MN-M-025 · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-O-004 theEmergencyFund) · MoneyKeel/functions/cashflow/income-summary.ts (MK-CF-O-004 incomeSummary, lands.rentMonthly) · src/screens/NetWorthScreen.tsx · src/screens/StressTestScreen.tsx · src/screens/JobSafetyScreen.tsx · src/screens/InsightsScreen.tsx"
 },
 {
  "id": "DEC-1859",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "#1 - remove langage to include interest on mortgage in maintenance expenses, as that is not standard practice.",
  "the_log_records": "On the Rent from a property screen, the hint under \"What it costs to run each month\" no longer lists mortgage interest. It reads \"Tax, insurance, repairs, management.\" A mortgage on a rented-out property belongs in Debts.",
  "governs": "src/screens/IncomeManagerScreen.tsx (Rent from a property) · MK-CF-M-027 · MK-NW-M-064 rent from your property, which keeps arriving · [a test of the app]"
 },
 {
  "id": "DEC-1924",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "11 - mortgage should not costs to run. We should ask to add monthly mortgage payment if any mortgage on second property. And automatically add it to debt.",
  "the_log_records": "On Rent from a property, a mortgage is never part of what the property costs to run. The screen asks for the monthly mortgage payment on that property, if there is one, and the app adds that mortgage to Debts by itself.",
  "governs": "src/screens/IncomeManagerScreen.tsx (Rent from a property) · src/onboarding/modules.tsx (Rental property) · MK-CF-M-027 · MK-NW-M-064 rent from your property, which keeps arriving · src/domain/debt/index.ts"
 },
 {
  "id": "DEC-1926",
  "decided": "2026-10-04",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "unless rental income is added on the income screen, assume property is second or vacation home.",
  "the_log_records": "A property is a second or vacation home unless rental income is entered for it on the Income screen. With rental income entered, it is a rental.",
  "governs": "src/domain/assets/index.ts (realEstateUseOf) · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-O-004 theEmergencyFund) · src/screens/IncomeManagerScreen.tsx (Rent from a property) · MK-NW-M-064 rent from your property, which keeps arriving"
 },
 {
  "id": "DEC-2484",
  "decided": "2026-10-07",
  "type": "PROCESS",
  "tab": "networth",
  "whose": "his",
  "his_words": "all the code changes, findings and changes - for batch one and two - I approved.",
  "the_log_records": "His approval of batches 1 and 2 of the outside review of Net worth, as a whole. Each rule it approved is its own row beside this one, so it can be found and read alone.",
  "governs": "MK-NW-O-001 theBonds · MK-NW-O-002 theAccount · MK-NW-O-003 theNetWorth · MK-NW-O-004 theEmergencyFund · MK-NW-O-005 theAlternativesOutlook · MK-NW-O-006 theHolding · MK-NW-O-008 thePerformance · MK-NW-F-003 valueFreshness · MK-NW-F-004 portfolioActualReturn · MK-NW-F-005 accountAllowsTicker · MK-NW-F-010 wrapperAccount · MK-NW-F-011 assetClassOf · MK-NW-F-012 taxTreatmentOf · MK-NW-F-016 cashTotal · MK-NW-F-017 equitiesTotal · MK-NW-F-018 fixedIncomeTotal · MK-NW-F-019 alternativesTotal · MK-NW-F-020 realEstateTotal · MK-NW-F-021 investmentsTotal · MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames · MK-NW-F-027 accountClassBreakdown · MK-NW-F-028 classPortionLabel · MK-NW-F-061 bondSummary · MK-NW-F-064 bondRateSensitivity · MK-NW-F-106 mortgagesByProperty · MK-NW-F-107 propertyUses · MK-NW-F-108 taxWordsOf · MK-NW-F-109 holdingClassOf · MK-CF-O-020 theBudgetCounted · MK-CF-F-139 removeShares · MK-PF-F-006 capGains · MK-XS-F-102 ingestSync · Calculation Module code/engines/time-weighted-return.ts · MK-NW-M-002 · MK-NW-M-005 · MK-NW-M-007 · MK-NW-M-008 · MK-NW-M-013 · MK-NW-M-014 · MK-NW-M-036 · MK-NW-M-044 · MK-NW-M-064 · MK-PF-M-001 · MK-PF-M-016"
 },
 {
  "id": "DEC-7171",
  "decided": "2026-10-21",
  "type": "RULE",
  "tab": "networth",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-21 on master question Q35, made without asking him, as his order of 2026-09-30 says, following his comment of 2026-08-26 on this figure (Trailing Twelve Months, not just 12 months). Holding detail reads Dividends received (trailing twelve months); it read Dividends received (12 mo). Income's line for an account's interest and dividends reads paid out over the trailing twelve months; it read over the last year. The figures do not change. One word from him reverses it.",
  "governs": "MK-NW-M-034 (where Q35 sits) · MK-NW-O-006 theHolding (MoneyKeel/functions/networth-and-performance/holding.ts) · MK-CF-F-184 incomeFromAccounts (src/domain/income/from-accounts.ts) · src/screens/HoldingDetailScreen.tsx · src/screens/IncomeManagerScreen.tsx"
 },
 {
  "id": "DEC-7796",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. $60,000 of wages, $4,800 into a 401(k) and $700 a month of benefits that are not taxed: the line read \"On ~$68,400 gross\" replaced by \"On the ~$60,000 it is taxed on\" — the full line now reads that the estimate comes from the IRS schedule after your 401(k) and the standard deduction. It worked over every source, the untaxed ones too, with its own bracket, 22% ($68,400 − $16,100 = $52,300), and about 8%; it now shows Cash flow's 12% ($60,000 − $16,100 = $43,900) and about 7%, beside Cash flow's What it is taxed on, $60,000. With a state rate entered, the line says the rate includes it. To reverse: give the step its own rate and the total of every source again. One word from him reverses it.",
  "governs": "src/onboarding/modules.tsx (the Taxes step) · MK-CF-O-004 incomeSummary · MK-CF-M-041 · MK-CF-M-043"
 },
 {
  "id": "DEC-7797",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283, DEC-4529 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. His ruling DEC-0283 (2026-09-10): income before tax is gross less the 401(k) and other deductions. The tax was already worked that way while the bracket named the band of the gross. 5 of 5 places now read the income after the 401(k). The Income summary bracket, single, $70,000 of wages and $10,000 into a 401(k): 22% on $53,900 → 12% on $43,900, tax about $5,020 unchanged. Sign-up's Taxes step shows the same 12%. Your base pay, the drawing's own household, $138,000 of wages and $14,400 into 401(k)s, taxed on $91,400: 22% → 12%. The filing-status comparison works its tax after the 401(k), its line naming what was entered less the 401(k). The draw-order sheet's rates are worked after the 401(k). Base pay's 12% is A FIGURE ON HIS APPROVED DRAWING (income-end-to-end v07, phone 2, which draws 22%), applied under tenet 1, which ranks above tenet 6, with the correction line his DEC-4529 asks for on the drawing. For that household the drawn sentence that begins Filing jointly, the band comes from what you earn together no longer prints (both bands are 12%), and the sentence about the 24% stands on its own. What it is taxed on was left as drawn, each gross line, then Gross a year. CORRECTED 2026-10-24: that no longer holds — two rows were added under the gross, Your 401(k)s and What it is taxed on, drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07 under his DEC-0283 (DEC-7887). To reverse: read the bracket off the gross again. One word from him reverses it.",
  "governs": "MK-CF-F-230 taxedAfterPreTax (src/domain/income/tax-rate.ts) · MK-CF-F-181 rateInForce · MK-CF-M-043 (the Income summary bracket) · MK-CF-M-032 (the Base pay bracket) · MK-CF-O-001 · MK-CF-O-004 · the filing-status comparison · the draw-order sheet"
 },
 {
  "id": "DEC-7798",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. A 5.00% state rate entered on the Tax organizer, no rate typed: the line under Calculated federal tax said federal only, that the rate knew nothing about the state, while the calculated rate held the state rate the person entered. It now reads \"Federal income tax, plus the 5.00% state rate you entered — it knows nothing about Social Security or Medicare.\", the words built for the typed-rate case (DEC-7608). With no state rate entered it reads as built, federal only. The figures do not change. To reverse: take the state rate out of the calculated rate, and the line stands as built. One word from him reverses it.",
  "governs": "MK-CF-M-044 (the line under Calculated federal tax) · MK-CF-O-004 incomeSummary (MoneyKeel/functions/cashflow/income-summary.ts) · MK-CF-F-181 rateInForce"
 },
 {
  "id": "DEC-7887",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283 and DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. A couple with $169,200 of wages and $19,200 into 401(k)s: the card printed only the gross, $169,200, while the bracket and a calculated tax were worked on $150,000. It now prints three rows: Gross a year $169,200, Your 401(k)s −$19,200, What it is taxed on $150,000. The drawing's own household (frame 5a): $167,400 − $14,400 = $153,000, bracket 22%. With no 401(k) the 401(k) row reads $0 and the two totals are the same. Two new figures: MK-CF-M-076, the gross a year, and MK-CF-M-077, the year's 401(k)s; MK-CF-M-041, What it is taxed on, is the gross less the 401(k)s. MK-CF-M-044's worked example is now the calculated case, $15,340, the federal tax on $150,000 less the $32,200 standard deduction ($2,480 + $9,120 + 22% × $17,000); it showed the typed 22% case, $37,224 — the code was right and the words were wrong. Sign-up's Taxes step names about $55,200 it is taxed on, the gross less the 401(k) (it named about $60,000, for $60,000 of wages and $4,800 into a 401(k)). The two rows are drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07. To reverse: drop the two rows and print the gross as What it is taxed on again. One word from him reverses it.",
  "governs": "MK-CF-M-041 · MK-CF-M-076 · MK-CF-M-077 · MK-CF-M-044 · MK-CF-O-004 incomeSummary (MoneyKeel/functions/cashflow/income-summary.ts) · src/screens/IncomeSummaryScreen.tsx · src/onboarding/modules.tsx (the Taxes step)"
 },
 {
  "id": "DEC-7933",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "networth",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-2748c and DEC-3523 (tenets 3 and 4), made without asking him, as his order of 2026-09-30 says. A $25,000 Treasury at 4.5%, worth $24,200, face value left blank: the account page read \"4.50%/year · $1,089/year\" and a yield on today's value of 4.50%; it now reads \"4.50%/year · face value not entered\" and gives no yield. A bond pays its coupon on its face: $25,000 × 4.5% = $1,125 a year once the face is entered. On Bonds its card names the missing face value, and the summary says \"Average yield leaves out US Treasury 2031 — face value not entered.\" The income sheet counts it at $0 and says why (it counted $1,089), and a bond past its maturity date counts $0 there too, \"matured Jun 30, 2026 — it pays no more interest\" (it counted $400). Tenet 3 outranks the no-face half of DEC-2748c for a dated bond only: a bank CD typed by its balance keeps its rate on that balance ($10,000 at 5.05% = $505), and so does a bond fund with no maturity date, so the income drawing's 4.2% on $30,000 line stands. The four bonds add to $1,630 on all three screens. To reverse: in src/domain/bonds/index.ts remove the maturity condition (keeps the CD and fund exception), or read every bond with no face at its value again. One word from him reverses it.",
  "governs": "MK-NW-M-024 · MK-NW-M-056 · MK-NW-F-126 yearlyInterestNow · MK-NW-F-112 yearlyInterest · MK-CF-F-184 incomeFromAccounts · src/domain/bonds/index.ts · MK-CF-M-066"
 },
 {
  "id": "DEC-7936",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0269 and DEC-3523 (tenets 1, 2, 4 and 7), made without asking him, as his order of 2026-09-30 says. Money there by a day is the table's End for the month before, plus or less anything dated earlier in that month; that month's own pay, everyday expenses and debt payments count only when the month loses money (tenet 7: never better than it is). Sep 28, $0 on hand, $5,000 take-home, $700 of groceries, $2,650 of debt payments, $1,200 due Dec 15 (need-by Dec 13): the line said about $10,744, the wage spread by day with the debts left out; it now reads November's End, about $4,950 (Sep End 5,000 − 3,350 = $1,650, Oct $3,300, Nov $4,950). With property tax of $4,800 due Dec 1 as well: Covered, about $8,765, became Short $1,500 (October's End $3,300), and the Dec 15 bill Short $1,050. Two bills due the same day both counted the whole balance; the first listed now gets the money first ($4,950, then $3,750). A one-time bill for March 2028 is no longer listed as March 2027. Whole months, because the app never asks the day pay lands. To reverse: in MK-CF-F-232 balanceByDay change Math.min(0, regular) to regular, and drop aheadOfIt in upcomingBills. One word from him reverses it.",
  "governs": "MK-CF-F-019 upcomingBills · MK-CF-F-232 balanceByDay (src/domain/cashflow/index.ts) · MK-CF-O-008 whatsComing (MoneyKeel/functions/cashflow/whats-coming.ts) · MK-CF-M-062 · MK-CF-M-063 · src/screens/BillCalendarScreen.tsx"
 },
 {
  "id": "DEC-7937",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0264 and DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. Frame A's household with a $6.50 coffee: the rows made $893 but the surplus read +$894, and Home's Left $894; both read +$893. The rows share the rounded total, each rounded down, the dollars still missing going to the rows with the most cents left over; a whole-dollar row never moves. It is the method the Performance walk already uses. The Bill calendar's rows do the same: each End is the balance rounded to the dollar, and In and Out share the change between two Ends — from $3,000, $5,415.83 in and $1,198.77 out read Sep +$5,416 · −$1,199 · $7,217. To reverse: round every row and every total on its own again. One word from him reverses it.",
  "governs": "MK-XS-F-195 monthShown, MK-XS-F-196 flowShown, MK-XS-F-194 partsShown, MK-XS-F-197 chainShown (MoneyKeel/functions/_figure-spec.ts) · MK-CF-M-002 · MK-CF-M-003 · MK-CF-M-004 · MK-CF-M-051 · MK-CF-M-052 · MK-CF-M-053 · src/screens/CashFlowScreen.tsx · src/screens/HomeScreen.tsx · src/screens/BillCalendarScreen.tsx"
 },
 {
  "id": "DEC-7940",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0447 and DEC-0196, made without asking him, as his order of 2026-09-30 says. Add your income offered Bonus / one-time as one choice, which opened the yearly bonus editor, so a one-time $2,000 came back the next September and stayed in the next year's taxed income. Bonus and One-time income are now two choices; one-time income keeps its month with its year and lands once. Your sources lists it: Bonus · one-time · lands in September $2,000 (nothing said why THIS MONTH read $7,195). September reads $7,195 on the Income tab, This month and Home; October $5,396; 2027 is back to $5,416. Under his one-rate rule (DEC-0196, ruled as G46) the bonus raises the rate for every month that year, so October falls by $19.88; that is his rule, left as it is. An unpaid one-time bill dated in a passed month stays in Later; only income that has landed leaves it. To reverse: one choice to the bonus editor, and no row for other income. One word from him reverses it.",
  "governs": "MK-CF-F-071 extraIncome · MK-CF-F-124 nextOccurrence · MK-XS-F-004 buildDatedGrid · MK-CF-M-027 · MK-CF-M-047 · the Income tab (src/screens/IncomeManagerScreen.tsx)"
 },
 {
  "id": "DEC-7941",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-1923, DEC-0283 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. With the home's mortgage in Debts, the Rent / Mortgage budget line is not counted beside it, as This month does not count it: $7,200 in, $700 of groceries and the $2,400 mortgage out, September's End $4,100 (it read $5,400 out and an End of $1,800, the $2,300 line counted too). The In column is the take-home after tax and the 401(k), as Your base pay prints it. A yearly bill whose day passed earlier this month has one place, this month's Out and plan, and is not under COMING UP for next year. To reverse: build the calendar's months from the budget as typed again. One word from him reverses it.",
  "governs": "src/screens/BillCalendarScreen.tsx · MK-XS-F-004 buildDatedGrid · MK-CF-F-019 upcomingBills"
 },
 {
  "id": "DEC-7942",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenets 3 and 5), made without asking him, as his order of 2026-09-30 says. A $5,000 take-home with the person's own 0% rate: the gross box showed 5475.378787878787, worked back from the federal tables, the card read Everything else taken out $475/month · 0%, and its last line said nothing there was calculated. The gross is now worked back with their own rate, $5,000.00, under the line \"≈ Worked back from the take-home you entered. Type the gross from a payslip to replace it.\", and the card's last line says the take-home is what was entered and the gross was worked back from it. The typed take-home is unchanged ($5,000 on This month). Typing a gross brings back the drawing's words. The drawing's rule 9: every estimate is prefixed ≈ and says what it cannot see. To reverse: work the gross back from the federal schedule and print the drawn words. One word from him reverses it.",
  "governs": "MK-CF-F-186 convertTakeHomeMode · MK-CF-O-001 basePay · MK-CF-M-030 · src/screens/BasePayScreen.tsx"
 },
 {
  "id": "DEC-7947",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-4529 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. Two drawing errors, each left as drawn with its correction line on bill-calendar v02, as his DEC-4529 asks. The foot line ended with a promise to tap any row for that month's full detail, and a screen reader said each month row opens the month's detail; month detail was retired on 2026-10-02, so the sentence is gone and no row promises it. The line under the title read Oct 2026 – Sep '27 2027, the year twice, copied from the build; it reads \"Oct 2026 – Sep 2027\", each end written by the app's one date writer, and a screen reader hears Jan 2027 where it heard Jan '27 2027. The month names in the table do not change. To reverse: give each month row a door and print the sentence again; print the drawn line. One word from him reverses it.",
  "governs": "src/screens/BillCalendarScreen.tsx · MK-ST-F-095 monthYearShown (src/domain/_shared/dates.ts)"
 }
]
```
