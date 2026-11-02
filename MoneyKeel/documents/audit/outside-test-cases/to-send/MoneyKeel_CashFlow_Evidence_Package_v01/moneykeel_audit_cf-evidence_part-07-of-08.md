# Cash flow evidence — part 07 of 08: Your income, all of it — and the income manager

15 cases. Read `moneykeel_audit_cf-evidence_brief_v01.md` first. Answer each case with one JSON line, in the format the brief gives.

## The cases

Each case: the figure and the tenet, what the first reviewer said it lacked, the figure's own record, the evidence (by the render's key in the next section), the decisions that name the figure (quoted at the end), our own tests and their results, and our status. Our status is not the answer.

```json
[
 {
  "case": "MK-CF-M-027#6",
  "figure": "MK-CF-M-027",
  "figure_label": "each income source and its amount",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-10-02. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
   "label": "each income source and its amount",
   "unit": "money",
   "grain": "one source",
   "screens": [
    "/income-manager",
    "/cashflow"
   ],
   "answers": "Every source of income that has been entered, one line each, in the period it is counted in — a month or a year, said beside it.",
   "formula": "each source as it was entered: rent after its running costs, in a month; interest and dividends, a bonus, scholarships and loans, in a year; the rest in a month",
   "inputs": [
    "MK-XS-I-023 salary and other income",
    "MK-CF-I-009 bonus",
    "MK-CF-I-010 equity vesting",
    "MK-CF-I-007 rental income"
   ],
   "refusal": "Nothing entered — the list is replaced by the one line \"Nothing entered yet. Add your income ›\" (Q48), which opens Base pay.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security. The line shown is the rental’s: what it brings in a month after its costs.",
    "answer": "$1,200"
   }
  },
  "evidence": {
   "render": "INC_OK_MGR",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Rent",
    "found_at_render_line": 16
   },
   "printed_under": "MK-CF-M-027",
   "printed_texts": [
    "$32,000",
    "$24,000",
    "$24,000",
    "$1,200",
    "$1,200",
    "$2,100",
    "$2,100"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$32,000",
     "$24,000",
     "$24,000",
     "$1,200",
     "$1,200",
     "$2,100",
     "$2,100"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     9,
     10,
     11,
     12
    ],
    "the_rendered_line": "Rent",
    "drawn_on_those_phones": [
     {
      "phone": 12,
      "line": 10,
      "text": "Rent"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [
     {
      "phone": 16,
      "line": 11,
      "text": "Rent"
     }
    ],
    "design_record_rows": [
     "Income manager"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_manager_matches_v07.test.tsx",
     "test": "phone 12 · Your income — what is entered, one line each, and the seven not picked one tap away",
     "kind": "test",
     "phones": [
      12
     ],
     "result": "passed",
     "lines": "99–107",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/income_manager_matches_v07.test.tsx",
     "test": "phone 9 · Bonus and stock — who, how much, which month, and what December will look like",
     "kind": "test",
     "phones": [
      9
     ],
     "result": "passed",
     "lines": "120–132",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/income_manager_matches_v07.test.tsx",
     "test": "phone 10 · Rent from a property — two figures, and what is kept",
     "kind": "test",
     "phones": [
      10
     ],
     "result": "passed",
     "lines": "134–145",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/income_manager_matches_v07.test.tsx",
     "test": "phone 11 · Interest & dividends — calculated from the accounts, taxed, and not spendable",
     "kind": "test",
     "phones": [
      11
     ],
     "result": "passed",
     "lines": "147–159",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0375",
   "DEC-1859",
   "DEC-1924",
   "DEC-7940"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-027 each income source and its amount › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 12 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 12 · Your income — what is entered, one line each, and the seven not picked one tap away. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-037#6",
  "figure": "MK-CF-M-037",
  "figure_label": "Take-home each month",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-14. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
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
   "note": "FOUND BY THE WORKED EXAMPLE AND FIXED THE SAME DAY, 2026-09-28. This total read $9,798/month while the two take-home lines beneath it (MK-CF-M-038) added to $9,398 — $400 apart, exactly the spouse's monthly 401(k). MK-CF-F-060 salaryGrossByMonth sums EVERY earner's wage (his ruling, 2026-08-27) but the 401(k) taken off that household gross was written as the first earner's alone, so a spouse's was never subtracted — the take-home read too high by their contribution, and the taxable base too. NOT A NEW QUESTION: he ruled this on 2026-09-12 on income-end-to-end v07 — \"one card disagreeing with itself; corrected to the take-home line\" — and the correction reached the mock and not the code. Now MK-CF-F-206 householdK401ByMonth counts every earner in the months that earner is paid, and src/__tests__/guard_total_agrees_with_its_lines.test.ts holds the ruling. The six personas all passed throughout because none had a spouse with their own wage AND their own 401(k); twoEarnersBoth401k now does.",
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
    "answer": "$9,398/month"
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "TAKE-HOME EACH MONTH",
    "found_at_render_line": 6
   },
   "printed_under": "MK-CF-M-037",
   "printed_texts": [
    "$9,398",
    "$9,398"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$9,398",
     "$9,398"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "TAKE-HOME EACH MONTH",
    "drawn_on_those_phones": [
     {
      "phone": 16,
      "line": 3,
      "text": "Take-home each month"
     },
     {
      "phone": 17,
      "line": 3,
      "text": "Take-home each month"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Income summary"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": true
    }
   ]
  },
  "decisions": [
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
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-037 Take-home each month › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 16, 17 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed; frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-038#6",
  "figure": "MK-CF-M-038",
  "figure_label": "each source of take-home",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-14. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
    "answer": "$5,898/month"
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Your pay",
    "found_at_render_line": 8
   },
   "printed_under": "MK-CF-M-038",
   "printed_texts": [
    "$5,898",
    "$3,500"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$5,898",
     "$3,500"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "Your pay",
    "drawn_on_those_phones": [
     {
      "phone": 16,
      "line": 5,
      "text": "Your pay"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [
     {
      "phone": 8,
      "line": 7,
      "text": "Your pay"
     }
    ],
    "design_record_rows": [
     "Income summary"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0375",
   "DEC-0376",
   "DEC-0387"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-038 each source of take-home › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 16 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-039#5",
  "figure": "MK-CF-M-039",
  "figure_label": "its own month, never spread",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for its own month, never spread. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$23,225"
   }
  },
  "evidence": {
   "render": "INC_OK_SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "March",
    "found_at_render_line": 25
   },
   "printed_under": "MK-CF-M-039",
   "printed_texts": [
    "$23,225"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$23,225"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-039 its own month, never spread › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-039; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-040#5",
  "figure": "MK-CF-M-040",
  "figure_label": "is not here — it is reinvested where it is earned",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for is not here — it is reinvested where it is earned. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "The two earners above, with $3,600/year of interest and dividends earned inside their accounts and left there.",
    "answer": "$300/month"
   }
  },
  "evidence": {
   "render": "SUM_INV",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/of interest and dividends is not here — it is reinvested/",
    "found_at_render_line": 16
   },
   "printed_under": "MK-CF-M-040",
   "printed_texts": [
    "$300"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$300"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0179",
   "DEC-0182",
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-040 is not here — it is reinvested where it is earned › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-040; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-040#6",
  "figure": "MK-CF-M-040",
  "figure_label": "is not here — it is reinvested where it is earned",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-14. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "The two earners above, with $3,600/year of interest and dividends earned inside their accounts and left there.",
    "answer": "$300/month"
   }
  },
  "evidence": {
   "render": "SUM_INV",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/of interest and dividends is not here — it is reinvested/",
    "found_at_render_line": 16
   },
   "printed_under": "MK-CF-M-040",
   "printed_texts": [
    "$300"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$300"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "Your $300/month of interest and dividends is not here — it is reinvested where it is earned and never reaches your bank. It is taxed, so it appears below.",
    "drawn_on_those_phones": [
     {
      "phone": 16,
      "line": 21,
      "text": "of interest and dividends is not here — it is reinvested where it is earned and never reaches your bank. It is taxed, so it appears below."
     }
    ],
    "matched": "the measurer's line beside the figure, as it reads it",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Income summary"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0179",
   "DEC-0182",
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-040 is not here — it is reinvested where it is earned › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 16 (the measurer's line beside the figure, as it reads it), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-041#6",
  "figure": "MK-CF-M-041",
  "figure_label": "What it is taxed on",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-14. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
    "answer": "$150,000/year"
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "= What it is taxed on",
    "found_at_render_line": 26
   },
   "printed_under": "MK-CF-M-041",
   "printed_texts": [
    "$150,000",
    "$150,000"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$150,000",
     "$150,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "= What it is taxed on",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Income summary"
    ],
    "the_test_writes_this_line_itself": [
     "['= Gross /year $167,400 Federal tax bracket', '= Gross /year $167,400 Your 401(k)s −$14,400 = What it is taxed on $153,000 Federal tax bracket',"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0283",
   "DEC-0375",
   "DEC-0387",
   "DEC-7796",
   "DEC-7887",
   "DEC-8442"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-041 What it is taxed on › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phones that hold this screen (16, 17) — the test that holds the screen writes it in by a named change (quoted under the case); check the dated row or decision it names"
 },
 {
  "case": "MK-CF-M-042#6",
  "figure": "MK-CF-M-042",
  "figure_label": "each taxed source",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-14. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
   "label": "each taxed source",
   "unit": "money",
   "per": "year",
   "screens": [
    "/income-summary"
   ],
   "answers": "What each source contributes to the year the tax is calculated on.",
   "formula": "one line per source the year is taxed on, at its yearly amount and signed (a rental loss is a loss) — each earner's wages, tips, self-employment, a bonus, a signing bonus or one-time payment of this year, the stock that vests this year, the rent net of its costs, interest and dividends, other taxed income, unemployment pay, retirement income received now, and the part of Social Security IRS Publication 915 taxes; the lines add to MK-CF-M-076",
   "inputs": [
    "MK-CF-M-041 gross a year"
   ],
   "refusal": "The list is replaced by the door to enter income when nothing is entered.",
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
    "answer": "$109,200/year"
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Your gross",
    "found_at_render_line": 18
   },
   "printed_under": "MK-CF-M-042",
   "printed_texts": [
    "$109,200",
    "$60,000"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$109,200",
     "$60,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "Your gross",
    "drawn_on_those_phones": [
     {
      "phone": 16,
      "line": 24,
      "text": "Your gross"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Income summary"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0375",
   "DEC-0387",
   "DEC-8442"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-042 each taxed source › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 16 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-043#5",
  "figure": "MK-CF-M-043",
  "figure_label": "Federal tax bracket",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for Federal tax bracket. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "Federal tax bracket",
   "unit": "percent",
   "screens": [
    "/income-summary",
    "/cashflow"
   ],
   "answers": "What the next dollar costs in federal income tax, with every source counted, not wages alone.",
   "formula": "the published bracket of (every source counted − each earner’s own 401(k) − the standard deduction, with the 65-and-over additions when they apply), for their filing status",
   "inputs": [
    "MK-CF-M-041 gross a year",
    "MK-XS-I-024 filing status"
   ],
   "refusal": "The row is not shown until income is entered.",
   "note": "The same concept as MK-CF-M-032 on the base-pay screen, over a wider base: that one counts wages, this one counts every source. Conflict C-5 on the orchestrator map asks whether they stay two figures.",
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
    "answer": "22%"
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Federal tax bracket",
    "found_at_render_line": 28
   },
   "printed_under": "MK-CF-M-043",
   "printed_texts": [
    "22%"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "22%"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0178",
   "DEC-0184",
   "DEC-0195",
   "DEC-0196",
   "DEC-0197",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-7796",
   "DEC-7797",
   "DEC-8519",
   "DEC-8770"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-043 Federal tax bracket › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-043; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-043#6",
  "figure": "MK-CF-M-043",
  "figure_label": "Federal tax bracket",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-14. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
   "label": "Federal tax bracket",
   "unit": "percent",
   "screens": [
    "/income-summary",
    "/cashflow"
   ],
   "answers": "What the next dollar costs in federal income tax, with every source counted, not wages alone.",
   "formula": "the published bracket of (every source counted − each earner’s own 401(k) − the standard deduction, with the 65-and-over additions when they apply), for their filing status",
   "inputs": [
    "MK-CF-M-041 gross a year",
    "MK-XS-I-024 filing status"
   ],
   "refusal": "The row is not shown until income is entered.",
   "note": "The same concept as MK-CF-M-032 on the base-pay screen, over a wider base: that one counts wages, this one counts every source. Conflict C-5 on the orchestrator map asks whether they stay two figures.",
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
    "answer": "22%"
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Federal tax bracket",
    "found_at_render_line": 28
   },
   "printed_under": "MK-CF-M-043",
   "printed_texts": [
    "22%"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "22%"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "Federal tax bracket",
    "drawn_on_those_phones": [
     {
      "phone": 16,
      "line": 36,
      "text": "Federal tax bracket"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [
     {
      "phone": 2,
      "line": 23,
      "text": "Federal tax bracket"
     },
     {
      "phone": 3,
      "line": 9,
      "text": "Federal tax bracket"
     },
     {
      "phone": 4,
      "line": 17,
      "text": "Federal tax bracket"
     }
    ],
    "design_record_rows": [
     "Income summary"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0178",
   "DEC-0184",
   "DEC-0195",
   "DEC-0196",
   "DEC-0197",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-7796",
   "DEC-7797",
   "DEC-8519",
   "DEC-8770"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-043 Federal tax bracket › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 16 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-044#6",
  "figure": "MK-CF-M-044",
  "figure_label": "Calculated federal tax",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-14. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
   "label": "Calculated federal tax",
   "unit": "money",
   "per": "year",
   "screens": [
    "/income-summary",
    "/onboarding"
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "The same two earners filing jointly, $169,200 of wages and $19,200 into their 401(k)s, with no tax rate typed. Taxed on $150,000; less the $32,200 standard deduction, $117,800 → $2,480 + $9,120 + 22% × $17,000 = $15,340.",
    "answer": "$15,340/year"
   }
  },
  "evidence": {
   "render": "SUM_EST",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Calculated federal tax",
    "found_at_render_line": 31
   },
   "printed_under": "MK-CF-M-044",
   "printed_texts": [
    "$15,340/year"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$15,340/year"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "Calculated federal tax",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [
     {
      "phone": 3,
      "line": 12,
      "text": "Calculated federal tax"
     }
    ],
    "design_record_rows": [
     "Income summary"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0195",
   "DEC-0197",
   "DEC-0208",
   "DEC-0283",
   "DEC-0375",
   "DEC-0389",
   "DEC-7608",
   "DEC-7798",
   "DEC-7887",
   "DEC-8389",
   "DEC-8676"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-044 Calculated federal tax › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phones that hold this screen (16, 17) — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it"
 },
 {
  "case": "MK-CF-M-066#6",
  "figure": "MK-CF-M-066",
  "figure_label": "Dividends, interest & coupons",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-10-02. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
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
   "refusal": "No record of any — the figure is not shown, and the box asks “How much, a year”.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "One account that recorded a $300 dividend in June and $120 of interest in March.",
    "answer": "$420/year"
   }
  },
  "evidence": {
   "render": "MGR_DIV",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "FROM YOUR ACCOUNTS",
    "found_at_render_line": 6
   },
   "printed_under": "MK-CF-M-066",
   "printed_texts": [
    "$420",
    "$420",
    "$420",
    "$420"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$420",
     "$420",
     "$420",
     "$420"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     9,
     10,
     11,
     12
    ],
    "the_rendered_line": "FROM YOUR ACCOUNTS",
    "drawn_on_those_phones": [
     {
      "phone": 11,
      "line": 4,
      "text": "From your accounts"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Income manager"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_manager_matches_v07.test.tsx",
     "test": "phone 12 · Your income — what is entered, one line each, and the seven not picked one tap away",
     "kind": "test",
     "phones": [
      12
     ],
     "result": "passed",
     "lines": "99–107",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/income_manager_matches_v07.test.tsx",
     "test": "phone 9 · Bonus and stock — who, how much, which month, and what December will look like",
     "kind": "test",
     "phones": [
      9
     ],
     "result": "passed",
     "lines": "120–132",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/income_manager_matches_v07.test.tsx",
     "test": "phone 10 · Rent from a property — two figures, and what is kept",
     "kind": "test",
     "phones": [
      10
     ],
     "result": "passed",
     "lines": "134–145",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/income_manager_matches_v07.test.tsx",
     "test": "phone 11 · Interest & dividends — calculated from the accounts, taxed, and not spendable",
     "kind": "test",
     "phones": [
      11
     ],
     "result": "passed",
     "lines": "147–159",
     "holds_the_phone_with_the_line": true
    }
   ]
  },
  "decisions": [
   "DEC-7933",
   "DEC-8398"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-066 Dividends, interest & coupons › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 11 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 11 · Interest & dividends — calculated from the accounts, taxed, and not spendable. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-076#6",
  "figure": "MK-CF-M-076",
  "figure_label": "= Gross /year",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references,but this row has no ruleddate. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
   "label": "= Gross /year",
   "unit": "money",
   "per": "year",
   "screens": [
    "/income-summary",
    "/base-pay"
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
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "= Gross /year",
    "found_at_render_line": 22
   },
   "printed_under": "MK-CF-M-076",
   "printed_texts": [
    "$169,200"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$169,200"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "= Gross /year",
    "drawn_on_those_phones": [
     {
      "phone": 16,
      "line": 34,
      "text": "= Gross /year"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Income summary"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0283",
   "DEC-7887"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-076 = Gross /year › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 16 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-077#5",
  "figure": "MK-CF-M-077",
  "figure_label": "Your 401(k)s",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for Your 401(k)s. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
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
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Your 401(k)s",
    "found_at_render_line": 24
   },
   "printed_under": "MK-CF-M-077",
   "printed_texts": [
    "$19,200"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$19,200"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0283",
   "DEC-7887"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-077 Your 401(k)s › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-077; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-077#6",
  "figure": "MK-CF-M-077",
  "figure_label": "Your 401(k)s",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references,but this row has no ruleddate. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
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
   }
  },
  "evidence": {
   "render": "SUM",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Your 401(k)s",
    "found_at_render_line": 24
   },
   "printed_under": "MK-CF-M-077",
   "printed_texts": [
    "$19,200"
   ],
   "store": {
    "entered_keys_compared": 7,
    "entered": {
     "assetAccounts": "same",
     "liabilities": "same",
     "transactions": "same",
     "expenses": "same",
     "onboardingProfile": "same",
     "incomes": "same",
     "retirementAssumptions": "same"
    },
    "opening_changed_nothing_entered": true,
    "any_stored_value_changed": []
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$19,200"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     16,
     17
    ],
    "the_rendered_line": "Your 401(k)s",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [
     {
      "phone": 3,
      "line": 15,
      "text": "Your 401(k)s"
     }
    ],
    "design_record_rows": [
     "Income summary"
    ],
    "the_test_writes_this_line_itself": [
     "['= Gross /year $167,400 Federal tax bracket', '= Gross /year $167,400 Your 401(k)s −$14,400 = What it is taxed on $153,000 Federal tax bracket',"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed",
     "kind": "test",
     "phones": [
      16
     ],
     "result": "passed",
     "lines": "60–84",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/income_matches_v07.test.tsx",
     "test": "frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door",
     "kind": "test",
     "phones": [
      17
     ],
     "result": "passed",
     "lines": "86–98",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0283",
   "DEC-7887"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-077 Your 401(k)s › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phones that hold this screen (16, 17) — the test that holds the screen writes it in by a named change (quoted under the case); check the dated row or decision it names"
 }
]
```

## The renders — each screen as it rendered, with the store before and after

Every line in order (`[icon]` is an icon); every figure printed under its identifier; every value the person entered, before the screen opened and after; and the same household arriving by a cloud sync.

```json
{
 "INC_OK_MGR": {
  "screen": "IncomeManagerScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('manager', H_INC_OK, '2026-09-28')",
  "stored_before_opening": {
   "assetAccounts": [
    {
     "asset_id": "rental-house",
     "label": "Rental house",
     "kind": "real_estate",
     "tax_bucket": "PROPERTY",
     "balance": 300000,
     "re_use": "rental"
    }
   ],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment",
     "self_employment",
     "rental",
     "equity",
     "retirement_income"
    ],
    "birthYear": "1975",
    "filingStatus": "married",
    "whoEarns": "both",
    "baseSalary": "4200",
    "salaryFreq": "biweekly",
    "salaryMode": "gross",
    "c_401k": "1200",
    "partnerName": "Sam",
    "partnerWage": {
     "baseSalary": "5000",
     "salaryFreq": "monthly",
     "salaryMode": "gross",
     "c_401k": "400"
    },
    "taxMode": "manual",
    "manualTaxRate": "22",
    "seAmount": "24000",
    "seFreq": "annual",
    "bonusAnnual": "12000",
    "bonusMonth": 3,
    "rsuShares": "50",
    "rsuPrice": "400",
    "rentals": [
     {
      "type": "long",
      "income": 2000,
      "expenses": 800,
      "property_id": "rental-house"
     }
    ],
    "ri_ss": "2100",
    "ri_ss_receiving": "yes",
    "ri_ss_freq": "monthly"
   },
   "incomes": [],
   "retirementAssumptions": {
    "retireAge": null,
    "horizonAge": null,
    "contribMonthly": null,
    "spendMonthly": null,
    "guaranteedMonthly": null,
    "risk": null,
    "expectedReturn": null,
    "inflation": null,
    "ssEligible": null,
    "ssMonthly": null,
    "ssClaimAge": null,
    "targetNestEgg": null,
    "debtExtraMonthly": null,
    "actualReturn": null,
    "returnBasis": null
   }
  },
  "other_stored_values_the_household_sets": {},
  "stored_after": {
   "assetAccounts": "the same as before",
   "liabilities": "the same as before",
   "transactions": "the same as before",
   "expenses": "the same as before",
   "onboardingProfile": "the same as before",
   "incomes": "the same as before",
   "retirementAssumptions": "the same as before"
  },
  "any_stored_value_changed_by_opening": [],
  "lines": [
   "001  ‹ Back",
   "002  [icon]",
   "003  [icon]",
   "004  Your income",
   "005  Add anything that changes",
   "006  YOU ENTERED ABOUT",
   "007  4 SOURCES",
   "008  A job",
   "009  ✓",
   "010  You and Sam · take-home $9,398/month",
   "011  Edit ⌄",
   "012  Self-employed / side gig",
   "013  ✓",
   "014  $24,000/year net",
   "015  Edit ⌄",
   "016  Rent",
   "017  ✓",
   "018  One property · $1,200/month net",
   "019  Edit ⌄",
   "020  Retirement income",
   "021  ✓",
   "022  $2,100/month",
   "023  Edit ⌄",
   "024  ANYTHING ELSE?",
   "025  💵",
   "026  Interest & dividends",
   "027  🛟",
   "028  Benefits",
   "029  👪",
   "030  Child support or alimony",
   "031  🎓",
   "032  Scholarships, grants, stipend",
   "033  🏦",
   "034  Student loans",
   "035  🧾",
   "036  Something else",
   "037  Done"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-027  $32,000",
   "MK-CF-M-031  $9,398",
   "MK-CF-M-031  $9,398",
   "MK-CF-M-027  $24,000",
   "MK-CF-M-027  $24,000",
   "MK-CF-M-027  $1,200",
   "MK-CF-M-027  $1,200",
   "MK-CF-M-027  $2,100",
   "MK-CF-M-027  $2,100"
  ],
  "after_a_cloud_sync": {
   "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
   "entered_unchanged": {
    "assetAccounts": true,
    "liabilities": true,
    "transactions": true,
    "expenses": true,
    "onboardingProfile": true,
    "incomes": true,
    "retirementAssumptions": true
   },
   "figures_printed_by_identifier": [
    "MK-CF-M-027  $32,000",
    "MK-CF-M-031  $9,398",
    "MK-CF-M-031  $9,398",
    "MK-CF-M-027  $24,000",
    "MK-CF-M-027  $24,000",
    "MK-CF-M-027  $1,200",
    "MK-CF-M-027  $1,200",
    "MK-CF-M-027  $2,100",
    "MK-CF-M-027  $2,100"
   ],
   "whole_screen_the_same": true
  }
 },
 "INC_OK_SUM": {
  "screen": "IncomeSummaryScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('summary', H_INC_OK, '2026-09-28')",
  "stored_before_opening": {
   "assetAccounts": [
    {
     "asset_id": "rental-house",
     "label": "Rental house",
     "kind": "real_estate",
     "tax_bucket": "PROPERTY",
     "balance": 300000,
     "re_use": "rental"
    }
   ],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment",
     "self_employment",
     "rental",
     "equity",
     "retirement_income"
    ],
    "birthYear": "1975",
    "filingStatus": "married",
    "whoEarns": "both",
    "baseSalary": "4200",
    "salaryFreq": "biweekly",
    "salaryMode": "gross",
    "c_401k": "1200",
    "partnerName": "Sam",
    "partnerWage": {
     "baseSalary": "5000",
     "salaryFreq": "monthly",
     "salaryMode": "gross",
     "c_401k": "400"
    },
    "taxMode": "manual",
    "manualTaxRate": "22",
    "seAmount": "24000",
    "seFreq": "annual",
    "bonusAnnual": "12000",
    "bonusMonth": 3,
    "rsuShares": "50",
    "rsuPrice": "400",
    "rentals": [
     {
      "type": "long",
      "income": 2000,
      "expenses": 800,
      "property_id": "rental-house"
     }
    ],
    "ri_ss": "2100",
    "ri_ss_receiving": "yes",
    "ri_ss_freq": "monthly"
   },
   "incomes": [],
   "retirementAssumptions": {
    "retireAge": null,
    "horizonAge": null,
    "contribMonthly": null,
    "spendMonthly": null,
    "guaranteedMonthly": null,
    "risk": null,
    "expectedReturn": null,
    "inflation": null,
    "ssEligible": null,
    "ssMonthly": null,
    "ssClaimAge": null,
    "targetNestEgg": null,
    "debtExtraMonthly": null,
    "actualReturn": null,
    "returnBasis": null
   }
  },
  "other_stored_values_the_household_sets": {},
  "stored_after": {
   "assetAccounts": "the same as before",
   "liabilities": "the same as before",
   "transactions": "the same as before",
   "expenses": "the same as before",
   "onboardingProfile": "the same as before",
   "incomes": "the same as before",
   "retirementAssumptions": "the same as before"
  },
  "any_stored_value_changed_by_opening": [],
  "lines": [
   "001  ‹ Back",
   "002  [icon]",
   "003  [icon]",
   "004  Your income",
   "005  Everything coming in, and what reaches your bank",
   "006  TAKE-HOME EACH MONTH",
   "007  $13,865",
   "008  Your pay",
   "009  after tax and 401(k)",
   "010  $5,898",
   "011  Sam’s pay",
   "012  after tax and 401(k)",
   "013  $3,500",
   "014  Self-employment",
   "015  after tax",
   "016  $1,560",
   "017  Rent",
   "018  after running costs",
   "019  $1,200",
   "020  Social Security · pension",
   "021  after tax",
   "022  $1,707",
   "023  = Inflow (income (take-home) + self-employment + rent + Social Security)",
   "024  $13,865",
   "025  March",
   "026  with the bonus",
   "027  $23,225",
   "028  Your $20,000 of stock vesting this year is not here — it vests as shares, not money to spend. It is taxed, so it appears below.",
   "029  WHAT IT IS TAXED ON",
   "030  $241,820",
   "031  Your gross",
   "032  $109,200",
   "033  Sam’s gross",
   "034  $60,000",
   "035  Self-employment",
   "036  $24,000",
   "037  Rent, net",
   "038  $14,400",
   "039  Bonus",
   "040  $12,000",
   "041  Stock vesting",
   "042  $20,000",
   "043  Social Security, the part that is taxed",
   "044  $21,420",
   "045  = Gross /year",
   "046  $261,020",
   "047  Your 401(k)s",
   "048  −$19,200",
   "049  = What it is taxed on",
   "050  $241,820",
   "051  Federal tax bracket",
   "052  filing jointly, every source counted",
   "053  22%",
   "054  Tax",
   "055  your rate, 22.00% (edit on Your base pay screen)",
   "056  $57,424/year",
   "057  Married filing jointly, every source counted. Your 22.00%, used on every figure built from your take-home. Without it we show the calculated rate — federal income tax only, assuming the standard deduction.",
   "058  Edit your income"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-037  $13,865",
   "MK-CF-M-038  $5,898",
   "MK-CF-M-038  $3,500",
   "MK-CF-M-038  $1,560",
   "MK-CF-M-038  $1,200",
   "MK-CF-M-038  $1,707",
   "MK-CF-M-037  $13,865",
   "MK-CF-M-039  $23,225",
   "MK-CF-M-009  $20,000",
   "MK-CF-M-041  $241,820",
   "MK-CF-M-042  $109,200",
   "MK-CF-M-042  $60,000",
   "MK-CF-M-042  $24,000",
   "MK-CF-M-042  $14,400",
   "MK-CF-M-042  $12,000",
   "MK-CF-M-042  $20,000",
   "MK-CF-M-042  $21,420",
   "MK-CF-M-076  $261,020",
   "MK-CF-M-077  $19,200",
   "MK-CF-M-041  $241,820",
   "MK-CF-M-043  22%",
   "MK-CF-M-044  $57,424/year"
  ],
  "after_a_cloud_sync": {
   "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
   "entered_unchanged": {
    "assetAccounts": true,
    "liabilities": true,
    "transactions": true,
    "expenses": true,
    "onboardingProfile": true,
    "incomes": true,
    "retirementAssumptions": true
   },
   "figures_printed_by_identifier": [
    "MK-CF-M-037  $13,865",
    "MK-CF-M-038  $5,898",
    "MK-CF-M-038  $3,500",
    "MK-CF-M-038  $1,560",
    "MK-CF-M-038  $1,200",
    "MK-CF-M-038  $1,707",
    "MK-CF-M-037  $13,865",
    "MK-CF-M-039  $23,225",
    "MK-CF-M-009  $20,000",
    "MK-CF-M-041  $241,820",
    "MK-CF-M-042  $109,200",
    "MK-CF-M-042  $60,000",
    "MK-CF-M-042  $24,000",
    "MK-CF-M-042  $14,400",
    "MK-CF-M-042  $12,000",
    "MK-CF-M-042  $20,000",
    "MK-CF-M-042  $21,420",
    "MK-CF-M-076  $261,020",
    "MK-CF-M-077  $19,200",
    "MK-CF-M-041  $241,820",
    "MK-CF-M-043  22%",
    "MK-CF-M-044  $57,424/year"
   ],
   "whole_screen_the_same": true
  }
 },
 "MGR_DIV": {
  "screen": "IncomeManagerScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {
   "open": "dividends"
  },
  "how_the_measurer_rendered_it": "shoot('manager', H_DIV, '2026-09-28', { open: 'dividends' })",
  "stored_before_opening": {
   "assetAccounts": [
    {
     "asset_id": "a1",
     "label": "Brokerage",
     "kind": "brokerage",
     "tax_bucket": "TAXABLE",
     "balance": 10000
    }
   ],
   "liabilities": [],
   "transactions": [
    {
     "id": "d1",
     "txn_id": "d1",
     "account_id": "a1",
     "type": "DIVIDEND",
     "amount": 300,
     "date": "2026-06-01"
    },
    {
     "id": "i1",
     "txn_id": "i1",
     "account_id": "a1",
     "type": "INTEREST",
     "amount": 120,
     "date": "2026-03-01"
    }
   ],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment"
    ],
    "birthYear": "1975",
    "filingStatus": "single",
    "whoEarns": "you",
    "baseSalary": "5000",
    "salaryFreq": "monthly",
    "salaryMode": "gross",
    "c_401k": "400"
   },
   "incomes": [],
   "retirementAssumptions": {
    "retireAge": null,
    "horizonAge": null,
    "contribMonthly": null,
    "spendMonthly": null,
    "guaranteedMonthly": null,
    "risk": null,
    "expectedReturn": null,
    "inflation": null,
    "ssEligible": null,
    "ssMonthly": null,
    "ssClaimAge": null,
    "targetNestEgg": null,
    "debtExtraMonthly": null,
    "actualReturn": null,
    "returnBasis": null
   }
  },
  "other_stored_values_the_household_sets": {},
  "stored_after": {
   "assetAccounts": "the same as before",
   "liabilities": "the same as before",
   "transactions": "the same as before",
   "expenses": "the same as before",
   "onboardingProfile": "the same as before",
   "incomes": "the same as before",
   "retirementAssumptions": "the same as before"
  },
  "any_stored_value_changed_by_opening": [],
  "lines": [
   "001  ‹ Back",
   "002  [icon]",
   "003  [icon]",
   "004  Interest & dividends",
   "005  What your savings and investments pay you",
   "006  FROM YOUR ACCOUNTS",
   "007  $420/year",
   "008  Brokerage",
   "009  paid out over the trailing twelve months",
   "010  $420",
   "011  = We calculate",
   "012  $420/year",
   "013  Change it if that is not right",
   "014  We only see the accounts you entered.",
   "015  THIS DOES NOT REACH YOUR BANK",
   "016  Interest and dividends are counted as income you are taxed on, not money you can spend. They are normally reinvested where they are earned, so they never reach your bank account. If you actually take them as cash, tell us and we will count them.",
   "017  Reinvested",
   "018  Paid to my bank",
   "019  Save"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-066  $420",
   "MK-CF-M-066  $420",
   "MK-CF-M-066  $420",
   "MK-CF-M-066  $420"
  ],
  "after_a_cloud_sync": {
   "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
   "entered_unchanged": {
    "assetAccounts": true,
    "liabilities": true,
    "transactions": true,
    "expenses": true,
    "onboardingProfile": true,
    "incomes": true,
    "retirementAssumptions": true
   },
   "figures_printed_by_identifier": [
    "MK-CF-M-066  $420",
    "MK-CF-M-066  $420",
    "MK-CF-M-066  $420",
    "MK-CF-M-066  $420"
   ],
   "whole_screen_the_same": true
  }
 },
 "SUM": {
  "screen": "IncomeSummaryScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('summary', H_PAY, '2026-09-28')",
  "stored_before_opening": {
   "assetAccounts": [],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment"
    ],
    "birthYear": "1975",
    "filingStatus": "married",
    "whoEarns": "both",
    "baseSalary": "4200",
    "salaryFreq": "biweekly",
    "salaryMode": "gross",
    "c_401k": "1200",
    "partnerName": "Sam",
    "partnerWage": {
     "baseSalary": "5000",
     "salaryFreq": "monthly",
     "salaryMode": "gross",
     "c_401k": "400"
    },
    "taxMode": "manual",
    "manualTaxRate": "22"
   },
   "incomes": [],
   "retirementAssumptions": {
    "retireAge": null,
    "horizonAge": null,
    "contribMonthly": null,
    "spendMonthly": null,
    "guaranteedMonthly": null,
    "risk": null,
    "expectedReturn": null,
    "inflation": null,
    "ssEligible": null,
    "ssMonthly": null,
    "ssClaimAge": null,
    "targetNestEgg": null,
    "debtExtraMonthly": null,
    "actualReturn": null,
    "returnBasis": null
   }
  },
  "other_stored_values_the_household_sets": {},
  "stored_after": {
   "assetAccounts": "the same as before",
   "liabilities": "the same as before",
   "transactions": "the same as before",
   "expenses": "the same as before",
   "onboardingProfile": "the same as before",
   "incomes": "the same as before",
   "retirementAssumptions": "the same as before"
  },
  "any_stored_value_changed_by_opening": [],
  "lines": [
   "001  ‹ Back",
   "002  [icon]",
   "003  [icon]",
   "004  Your income",
   "005  Everything coming in, and what reaches your bank",
   "006  TAKE-HOME EACH MONTH",
   "007  $9,398",
   "008  Your pay",
   "009  after tax and 401(k)",
   "010  $5,898",
   "011  Sam’s pay",
   "012  after tax and 401(k)",
   "013  $3,500",
   "014  = Inflow (income (take-home))",
   "015  $9,398",
   "016  WHAT IT IS TAXED ON",
   "017  $150,000",
   "018  Your gross",
   "019  $109,200",
   "020  Sam’s gross",
   "021  $60,000",
   "022  = Gross /year",
   "023  $169,200",
   "024  Your 401(k)s",
   "025  −$19,200",
   "026  = What it is taxed on",
   "027  $150,000",
   "028  Federal tax bracket",
   "029  filing jointly, every source counted",
   "030  22%",
   "031  Tax",
   "032  your rate, 22.00% (edit on Your base pay screen)",
   "033  $37,224/year",
   "034  Married filing jointly, every source counted. Your 22.00%, used on every figure built from your take-home. Without it we show the calculated rate — federal income tax only, assuming the standard deduction.",
   "035  Edit your income"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-037  $9,398",
   "MK-CF-M-038  $5,898",
   "MK-CF-M-038  $3,500",
   "MK-CF-M-037  $9,398",
   "MK-CF-M-041  $150,000",
   "MK-CF-M-042  $109,200",
   "MK-CF-M-042  $60,000",
   "MK-CF-M-076  $169,200",
   "MK-CF-M-077  $19,200",
   "MK-CF-M-041  $150,000",
   "MK-CF-M-043  22%",
   "MK-CF-M-044  $37,224/year"
  ],
  "after_a_cloud_sync": {
   "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
   "entered_unchanged": {
    "assetAccounts": true,
    "liabilities": true,
    "transactions": true,
    "expenses": true,
    "onboardingProfile": true,
    "incomes": true,
    "retirementAssumptions": true
   },
   "figures_printed_by_identifier": [
    "MK-CF-M-037  $9,398",
    "MK-CF-M-038  $5,898",
    "MK-CF-M-038  $3,500",
    "MK-CF-M-037  $9,398",
    "MK-CF-M-041  $150,000",
    "MK-CF-M-042  $109,200",
    "MK-CF-M-042  $60,000",
    "MK-CF-M-076  $169,200",
    "MK-CF-M-077  $19,200",
    "MK-CF-M-041  $150,000",
    "MK-CF-M-043  22%",
    "MK-CF-M-044  $37,224/year"
   ],
   "whole_screen_the_same": true
  }
 },
 "SUM_EST": {
  "screen": "IncomeSummaryScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('summary', H_PAY_EST, '2026-09-28')",
  "stored_before_opening": {
   "assetAccounts": [],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment"
    ],
    "birthYear": "1975",
    "filingStatus": "married",
    "whoEarns": "both",
    "baseSalary": "4200",
    "salaryFreq": "biweekly",
    "salaryMode": "gross",
    "c_401k": "1200",
    "partnerName": "Sam",
    "partnerWage": {
     "baseSalary": "5000",
     "salaryFreq": "monthly",
     "salaryMode": "gross",
     "c_401k": "400"
    }
   },
   "incomes": [],
   "retirementAssumptions": {
    "retireAge": null,
    "horizonAge": null,
    "contribMonthly": null,
    "spendMonthly": null,
    "guaranteedMonthly": null,
    "risk": null,
    "expectedReturn": null,
    "inflation": null,
    "ssEligible": null,
    "ssMonthly": null,
    "ssClaimAge": null,
    "targetNestEgg": null,
    "debtExtraMonthly": null,
    "actualReturn": null,
    "returnBasis": null
   }
  },
  "other_stored_values_the_household_sets": {},
  "stored_after": {
   "assetAccounts": "the same as before",
   "liabilities": "the same as before",
   "transactions": "the same as before",
   "expenses": "the same as before",
   "onboardingProfile": "the same as before",
   "incomes": "the same as before",
   "retirementAssumptions": "the same as before"
  },
  "any_stored_value_changed_by_opening": [],
  "lines": [
   "001  ‹ Back",
   "002  [icon]",
   "003  [icon]",
   "004  Your income",
   "005  Everything coming in, and what reaches your bank",
   "006  TAKE-HOME EACH MONTH",
   "007  ≈$11,222",
   "008  Your pay",
   "009  after tax and 401(k)",
   "010  ≈$7,075",
   "011  Sam’s pay",
   "012  after tax and 401(k)",
   "013  ≈$4,147",
   "014  = Inflow (income (take-home))",
   "015  ≈$11,222",
   "016  WHAT IT IS TAXED ON",
   "017  $150,000",
   "018  Your gross",
   "019  $109,200",
   "020  Sam’s gross",
   "021  $60,000",
   "022  = Gross /year",
   "023  $169,200",
   "024  Your 401(k)s",
   "025  −$19,200",
   "026  = What it is taxed on",
   "027  $150,000",
   "028  Federal tax bracket",
   "029  filing jointly, every source counted",
   "030  22%",
   "031  Calculated federal tax",
   "032  assumes you take the standard deduction",
   "033  ≈$15,340/year",
   "034  Federal only — it knows nothing about your state, and nothing about Social Security or Medicare.",
   "035  Edit your income"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-037  $11,222",
   "MK-CF-M-038  $7,075",
   "MK-CF-M-038  $4,147",
   "MK-CF-M-037  $11,222",
   "MK-CF-M-041  $150,000",
   "MK-CF-M-042  $109,200",
   "MK-CF-M-042  $60,000",
   "MK-CF-M-076  $169,200",
   "MK-CF-M-077  $19,200",
   "MK-CF-M-041  $150,000",
   "MK-CF-M-043  22%",
   "MK-CF-M-044  $15,340/year"
  ],
  "after_a_cloud_sync": {
   "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
   "entered_unchanged": {
    "assetAccounts": true,
    "liabilities": true,
    "transactions": true,
    "expenses": true,
    "onboardingProfile": true,
    "incomes": true,
    "retirementAssumptions": true
   },
   "figures_printed_by_identifier": [
    "MK-CF-M-037  $11,222",
    "MK-CF-M-038  $7,075",
    "MK-CF-M-038  $4,147",
    "MK-CF-M-037  $11,222",
    "MK-CF-M-041  $150,000",
    "MK-CF-M-042  $109,200",
    "MK-CF-M-042  $60,000",
    "MK-CF-M-076  $169,200",
    "MK-CF-M-077  $19,200",
    "MK-CF-M-041  $150,000",
    "MK-CF-M-043  22%",
    "MK-CF-M-044  $15,340/year"
   ],
   "whole_screen_the_same": true
  }
 },
 "SUM_INV": {
  "screen": "IncomeSummaryScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('summary', { onboardingProfile: { ...H_PAY.onboardingProfile, invAnnual: '3600' } }, '2026-09-28')",
  "stored_before_opening": {
   "assetAccounts": [],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment"
    ],
    "birthYear": "1975",
    "filingStatus": "married",
    "whoEarns": "both",
    "baseSalary": "4200",
    "salaryFreq": "biweekly",
    "salaryMode": "gross",
    "c_401k": "1200",
    "partnerName": "Sam",
    "partnerWage": {
     "baseSalary": "5000",
     "salaryFreq": "monthly",
     "salaryMode": "gross",
     "c_401k": "400"
    },
    "taxMode": "manual",
    "manualTaxRate": "22",
    "invAnnual": "3600"
   },
   "incomes": [],
   "retirementAssumptions": {
    "retireAge": null,
    "horizonAge": null,
    "contribMonthly": null,
    "spendMonthly": null,
    "guaranteedMonthly": null,
    "risk": null,
    "expectedReturn": null,
    "inflation": null,
    "ssEligible": null,
    "ssMonthly": null,
    "ssClaimAge": null,
    "targetNestEgg": null,
    "debtExtraMonthly": null,
    "actualReturn": null,
    "returnBasis": null
   }
  },
  "other_stored_values_the_household_sets": {},
  "stored_after": {
   "assetAccounts": "the same as before",
   "liabilities": "the same as before",
   "transactions": "the same as before",
   "expenses": "the same as before",
   "onboardingProfile": "the same as before",
   "incomes": "the same as before",
   "retirementAssumptions": "the same as before"
  },
  "any_stored_value_changed_by_opening": [],
  "lines": [
   "001  ‹ Back",
   "002  [icon]",
   "003  [icon]",
   "004  Your income",
   "005  Everything coming in, and what reaches your bank",
   "006  TAKE-HOME EACH MONTH",
   "007  $9,398",
   "008  Your pay",
   "009  after tax and 401(k)",
   "010  $5,898",
   "011  Sam’s pay",
   "012  after tax and 401(k)",
   "013  $3,500",
   "014  = Inflow (income (take-home))",
   "015  $9,398",
   "016  Your $300/month of interest and dividends is not here — it is reinvested where it is earned and never reaches your bank. It is taxed, so it appears below.",
   "017  WHAT IT IS TAXED ON",
   "018  $153,600",
   "019  Your gross",
   "020  $109,200",
   "021  Sam’s gross",
   "022  $60,000",
   "023  Interest & dividends",
   "024  $3,600",
   "025  = Gross /year",
   "026  $172,800",
   "027  Your 401(k)s",
   "028  −$19,200",
   "029  = What it is taxed on",
   "030  $153,600",
   "031  Federal tax bracket",
   "032  filing jointly, every source counted",
   "033  22%",
   "034  Tax",
   "035  your rate, 22.00% (edit on Your base pay screen)",
   "036  $38,016/year",
   "037  Married filing jointly, every source counted. Your 22.00%, used on every figure built from your take-home. Without it we show the calculated rate — federal income tax only, assuming the standard deduction.",
   "038  Edit your income"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-037  $9,398",
   "MK-CF-M-038  $5,898",
   "MK-CF-M-038  $3,500",
   "MK-CF-M-037  $9,398",
   "MK-CF-M-040  $300",
   "MK-CF-M-041  $153,600",
   "MK-CF-M-042  $109,200",
   "MK-CF-M-042  $60,000",
   "MK-CF-M-042  $3,600",
   "MK-CF-M-076  $172,800",
   "MK-CF-M-077  $19,200",
   "MK-CF-M-041  $153,600",
   "MK-CF-M-043  22%",
   "MK-CF-M-044  $38,016/year"
  ],
  "after_a_cloud_sync": {
   "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
   "entered_unchanged": {
    "assetAccounts": true,
    "liabilities": true,
    "transactions": true,
    "expenses": true,
    "onboardingProfile": true,
    "incomes": true,
    "retirementAssumptions": true
   },
   "figures_printed_by_identifier": [
    "MK-CF-M-037  $9,398",
    "MK-CF-M-038  $5,898",
    "MK-CF-M-038  $3,500",
    "MK-CF-M-037  $9,398",
    "MK-CF-M-040  $300",
    "MK-CF-M-041  $153,600",
    "MK-CF-M-042  $109,200",
    "MK-CF-M-042  $60,000",
    "MK-CF-M-042  $3,600",
    "MK-CF-M-076  $172,800",
    "MK-CF-M-077  $19,200",
    "MK-CF-M-041  $153,600",
    "MK-CF-M-043  22%",
    "MK-CF-M-044  $38,016/year"
   ],
   "whole_screen_the_same": true
  }
 }
}
```

## The design record — which approved design each screen here is built from

Rows of `MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md`, the one record of which design each screen was built from, as written today.

```json
{
 "Income manager": "`MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frames 1 and 3 — APPROVED** (DEC-0177 lineage, v07 approved 2026-09-02): where the money comes from, and bonus, equity and the other sources. **BUILT 2026-10-04** — the manager (phone 12) and its three editors (phones 9, 10, 11) rebuilt to the drawing and held word for word, with the picker (phone 1), by `src/screens/__tests__/income_manager_matches_v07.test.tsx` (8 named differences). **2026-10-25/26, rows on v07:** the loss row and the stock row (DEC-8444); a rent not entered (DEC-8445); the Rent editor's mortgage (DEC-8446); Interest & dividends counts only what is paid by today (DEC-8398); the Income tab reads the summary's list (DEC-8453). | —",
 "Income summary": "`MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frame 5, Your income, all of it — APPROVED** (DEC-0177 lineage, v07 approved 2026-09-02). **2026-10-24, READ THIS FIRST rows on the drawing:** its Federal tax bracket is the band after each earner's 401(k) (single, $70,000 of wages, $10,000 into a 401(k): 12%, where it read 22%; DEC-7797); with a state rate entered and no rate typed, the line under Calculated federal tax names that state rate (DEC-7798). **2026-10-24, CORRECTION:** the earlier line on the drawing, that What it is taxed on stays as drawn, no longer holds — two rows were added under the gross, Your 401(k)s and What it is taxed on (a couple with $169,200 of wages and $19,200 into 401(k)s: $169,200 − $19,200 = $150,000; new figures MK-CF-M-076 and MK-CF-M-077), drawn by the READ THIS FIRST row of 2026-10-24 under his DEC-0283 (DEC-7887). Held by `income_matches_v07.test.tsx` (difference 3), 3 of 3 on 2026-10-24. **2026-10-25/26, rows on v07:** the taxed rows add up to the gross (DEC-8442); a rental loss (DEC-8443); support alone (DEC-8444); Social Security as IRS Publication 915 says — the photographed retiree's take-home ≈$2,361 → ≈$2,400 and tax ≈$465 → ≈$0 (DEC-8447); vests are not cash unless sold (DEC-8451); one-time money (DEC-8449); one interest figure for the year (DEC-8400). | —"
}
```

## The drawing — `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html`

**READ THIS FIRST — ADDED AFTER THIS MOCKUP · BUILD 54. Each row says whose decision it is: his, in his own words with the day he gave them, or the lead’s, made without asking him under his order of 2026-09-30. (Corrected 2026-10-31: this line said every row was his ruling and approved, which was untrue of the lead’s rows.)** These were ruled after this drawing was approved, during work on Build 54 (the build on TestFlight). They are in the app’s code unless a line says ‘Not built yet’, and reach a phone with the next build cut. The phones below are not redrawn: where a line here and a phone disagree, this line is the design.

Its dated rows, every one, as written on the drawing (68):

```json
[
 {
  "Ruled": "2026-10-04",
  "What changed, against the phones below": "Your base pay, when the app calculates the tax: the card states its own sum and stops. The second drawn sentence is not shown.",
  "His words, or where it came from": "“#4 - remove second sentence.”",
  "Record": "DEC-1625",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-04",
  "What changed, against the phones below": "Rent from a property (phone 10): the hint reads ‘Tax, insurance, repairs, management.’",
  "His words, or where it came from": "“remove langage to include interest on mortgage in maintenance expenses, as that is not standard practice.”",
  "Record": "DEC-1859",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-04",
  "What changed, against the phones below": "Rent from a property (phone 10) asks ‘Which property is it?’ and, once one is picked, ‘Monthly mortgage payment on this property, if any’. Leaving the screen adds that mortgage to Debts, on that property. With no property in Net worth it says: ‘Add this property first, on the Net worth page. Then its mortgage can be recorded here.’",
  "His words, or where it came from": "“11 - mortgage should not costs to run. We should ask to add monthly mortgage payment if any mortgage on second property. And automatically add it to debt.”",
  "Record": "DEC-1924",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-04",
  "What changed, against the phones below": "Each rent entry is tied to a property in Net worth; a property with no rent entered is a second or vacation home.",
  "His words, or where it came from": "“unless rental income is added on the income screen, assume property is second or vacation home.”",
  "Record": "DEC-1926",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-10",
  "What changed, against the phones below": "Rent from a property (phone 10): an entry that names no property is not counted as rent anywhere — not in income, the emergency fund or the property’s use. ‘Which property is it?’ shows in amber with ‘Not counted as rent until you pick its property.’, and ‘This is the figure every other screen uses’ is left off until it is answered. With no property in Net worth the line is ‘Add the property in Net worth first ›’, opening Add an account on Real estate. The old single rent figure names no property, so it is not counted either.",
  "His words, or where it came from": "His words, “10 -approved.” (DEC-4059d; the recommendation: a rent entry cannot be saved until a property is picked)",
  "Record": "DEC-4059d · MK-CF-F-067 · MK-NW-F-115 · MK-NW-F-117 · MK-NW-O-004",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-10",
  "What changed, against the phones below": "Interest & dividends (phone 11): a linked account whose history start date cannot be read is listed as ‘Schwab: History start date cannot be read. Edit date’; Edit date opens a date picker and the person’s date is saved on that account.",
  "His words, or where it came from": "“9: Say date cannot be read. Edit date. and give user an option to enter or correct date.”",
  "Record": "DEC-4059c · MK-NW-F-046",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-10",
  "What changed, against the phones below": "Every count written in words takes its plural from one list of words and plurals, so it is right for 0, 1 and many — the manager’s count ‘1 source’ / ‘3 sources’; the rent row ‘One property’ / ‘Two properties’; benefits ‘· 1 month of the year’.",
  "His words, or where it came from": "“15 - why not go ahead and make a list of words and plurals.”",
  "Record": "DEC-4082",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-21",
  "What changed, against the phones below": "Interest & dividends (phone 11): the third account, drawn as VTI and holdings with a dividend yield, shows what the account actually paid out, and its line reads paid out over the trailing twelve months. The app holds no yield for shares and funds and invents none; it shows what was paid in the twelve months ending today. The words name that window the way Holding detail names it (canon row 23). The figures do not change. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on master question Q35 (the one phrase for the twelve-month window), made without asking him; one word from him reverses it. To reverse: restore the line’s earlier words.",
  "Record": "DEC-7171 · Q35 · MK-CF-F-184 · canon row 23",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-23",
  "What changed, against the phones below": "Income summary (and the calculated rate wherever it is described): when a state income tax rate has been entered on the Tax organizer, the calculated rate already includes it, so the closing line reads ‘Without it we show the calculated rate — federal income tax, plus the 5.00% state rate you entered, assuming the standard deduction.’ With no state rate entered it reads as drawn: ‘— federal income tax only, assuming the standard deduction.’ The figures do not change. The phones are not redrawn. Line added 2026-10-23.",
  "His words, or where it came from": "Not a decision of his: made under his tenet 5 (the person’s word outranks the app’s guess) without asking him — the Tax organizer says its state rate ‘tunes every tax estimate in the app’, and the calculated rate adds it; the words said ‘federal income tax only’. One word from him reverses it. To reverse: take the state rate out of the calculated rate, and the words stand as drawn.",
  "Record": "DEC-3523 (tenet 5) · DEC-0384 · MK-CF-F-181 · MK-CF-M-031",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Sign-up’s Taxes step (not drawn on this page; it asks Base pay’s question in Base pay’s words) reads the income, the rate and the bracket the Income summary reads — what the year is taxed on, the rate in force, and the bracket on that income. Its line under the estimate reads ‘On the ~$55,200 it is taxed on — your gross less your 401(k) — from the IRS schedule after the standard deduction. It does NOT include Social Security and Medicare — about another 7.7% of a wage — or any state tax.’ It read ‘On ~$68,400 gross, from the IRS schedule after the standard deduction …’, over the total of every source, the untaxed ones too, with its own rate (~8% where Cash flow says 7%) and its own bracket (22% where Cash flow says 12%). With a state rate entered, the line says the rate includes it. The income recap’s tax line and take-home read the same rate. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: made under his tenet 4 (one thing, one number, one word) without asking him — one person had two rates and two brackets on two screens. One word from him reverses it. To reverse: give the step its own rate and the total of every source again.",
  "Record": "DEC-3523 (tenet 4) · DEC-0384 · MK-CF-F-181 · MK-CF-O-004 · MK-CF-M-041 · MK-CF-M-043",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "The Federal tax bracket is the band of what is taxed once each earner’s 401(k) is out — on Your base pay (the wages) and on the Income summary (every source). Phone 2’s household, $138,000 of wages with $14,400 into 401(k)s, is taxed on $138,000 − $14,400 − $32,200 = $91,400: 12% , where phone 2 draws 22%, the band of the gross. One wage alone is 12% too, so the sentence ‘Filing jointly, the band comes from what you earn together. On your pay alone we would have read 12% …’ is not printed for this household; it still is wherever the two bands differ, and ‘The 24% is your own figures — tax, Social Security, Medicare, everything.’ stays. A single filer on $70,000 with a $10,000 401(k) reads 12%, not 22%. What it is taxed on stayed as drawn in this line; corrected later on 2026-10-24 (DEC-7887): under ‘= Gross /year’ the 401(k)s now come off and ‘= What it is taxed on’ is the taxed figure — see that row. Rule 6 (‘read from gross, annualised … never from take-home’) still holds for the base; the 401(k) comes off it first. Line added 2026-10-24.",
  "His words, or where it came from": "His ruling DEC-0283 (2026-09-10): income before tax is gross less the 401(k) and other deductions — the tax was already worked that way while the bracket named the band of the gross. Applied without asking him, under tenet 1 (a wrong number ends trust), which ranks above the drawing (tenet 6). One word from him reverses it. To reverse: read the bracket off the gross again.",
  "Record": "DEC-0185 · DEC-0283 · DEC-3523 (tenets 1, 4) · MK-CF-M-032 · MK-CF-M-043 · MK-CF-F-181",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Income summary, when the tax is calculated (no rate typed) and a state income tax rate has been entered on the Tax organizer: the line under ‘Calculated federal tax’ reads ‘Federal income tax, plus the 5.00% state rate you entered — it knows nothing about Social Security or Medicare.’, because the calculated rate is the federal rate plus that state rate (the words built for the typed-rate case, DEC-7608). With no state rate entered it reads as built: ‘Federal only — it knows nothing about your state, and nothing about Social Security or Medicare.’ The figures do not change. The phones are not redrawn. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: made under tenet 1 (a wrong number, here a false sentence beside one, ends trust) without asking him — the line said the rate knew nothing about the state when it held the state rate the person typed. One word from him reverses it. To reverse: take the state rate out of the calculated rate, and the line stands as built.",
  "Record": "DEC-7608 · DEC-0384 · DEC-3523 (tenet 1) · MK-CF-F-181 · MK-CF-M-044",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Income summary, What it is taxed on (frame 5a): the gross lines stay as drawn, and ‘= Gross /year’ stays the figure before any deductions. Under it, two rows in the same style: Your 401(k)s with the year’s contributions taken off (‘−$14,400’ for frame 5a’s household, $800 and $400 a month), and = What it is taxed on , the total the tax and the bracket are worked on ($167,400 − $14,400 = $153,000). The band beside ‘What it is taxed on’ shows that same total, not the gross. With no 401(k) the two figures are the same and both rows still show, the 401(k) row at $0. The tax row, the bracket row and the sentence under them are unchanged; the bracket is read on the $153,000 (22%). Line added 2026-10-24.",
  "His words, or where it came from": "His ruling DEC-0283 (2026-09-10): gross is before any deductions, and income before tax is gross less the 401(k) and any other deduction. The figure labelled ‘What it is taxed on’ printed the gross, the 401(k) still in it, while the tax and the bracket were worked without it. Applied without asking him, under tenets 1 and 2 (every number shows how it was made); one word from him reverses it. To reverse: print the gross beside ‘What it is taxed on’ again and drop the two rows.",
  "Record": "DEC-0283 · DEC-3523 (tenets 1, 2) · MK-CF-M-041 · new MK-CF-M-076 (= Gross /year) · new MK-CF-M-077 (Your 401(k)s, a year)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Interest & dividends (phone 11), From your accounts , a bond’s line — not a drawn state. A bond’s year of interest is now the one figure its account page and the Bonds screen print. A bond with a rate and a maturity date but no face value reads ‘4.5% coupon — face value not entered, so counted as $0 until it is’ and $0 (it read ‘4.5% on $24,200’ and $1,089, the rate on the market value; a bond pays its coupon on its face). A bond past its maturity date reads ‘matured Jun 30, 2026 — it pays no more interest’ and $0 (it kept its year’s coupon here while every other figure counted $0). A CD bought from the bank with no face value still reads its rate on its balance, ‘5.05% on $10,000’ and $505. The drawn line is unchanged: ‘Treasury bonds’ has no face value and no maturity date, so it is read as a bond fund, which has no face of its own, and keeps its rate on its balance — ‘4.2% on $30,000’, $1,260. Line added 2026-10-24.",
  "His words, or where it came from": "Tenet 3 (DEC-3523): unknown is not zero, and it outranks tenet 6 and the no-face half of DEC-2748c for a dated bond; DEC-2748d: a matured bond pays nothing more, on every figure; tenet 4: one figure, one number. Decided without asking him; to reverse it, the line reads the rate on the value again for a bond with no face.",
  "Record": "DEC-3523 (tenets 3, 4) · DEC-2748c · DEC-2748d · MK-CF-F-184 · MK-NW-F-126 · MK-CF-M-066",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "How do you file your taxes? — phone 15, ‘That changes your take-home’. It compares what the app was showing with what it will show: ‘What we were assuming’ is the status in force before the answer (the answer on record, or filing jointly when a spouse was entered and nothing was asked), and both sides count who is 65 or older the way the take-home does. The phone shows whenever the answer changes the status and the take-home with it: a rise in the drawn words, a fall in the same words with ‘less’ (‘$327/month less’, jointly → separately). The month’s figure is the difference of the two take-homes as printed — $6,196 → $6,523 is ‘$327/month more’, where it read ‘$328’ (the cent-exact $327.50); both over 65, ‘$480’. ‘…if you are both over 65’ goes with its row, on a joint return only. A couple already taxed jointly who confirm it see no phone: nothing moves. Line added 2026-10-24.",
  "His words, or where it came from": "The lead’s rulings of 2026-10-24 on the Cash flow journey E2E-79: show a fall as well as a rise (tenet 1); a difference printed beside the figures it compares is their printed difference (tenet 2). Not a decision of his; one word from him reverses it. To reverse: show the phone only for a rise, and print the cent-exact difference.",
  "Record": "DEC-3523 (tenets 1, 2) · DEC-0283 · MK-CF-F-181",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Your base pay (phones 2 to 7), for a take-home entered before 2026-08-28 — not a drawn state. That take-home stays the take-home; its gross was worked back once, and is now worked back with the person’s own rate when they typed one (a typed 0% on $5,000 gives $5,000, where the federal schedule gave $5,475.38 and the card read ‘Everything else taken out $475/month · 0%’). Until a gross is typed, the gross box shows it to the cent (it showed ‘5475.378787878787’) with the line ‘≈ Worked back from the take-home you entered. Type the gross from a payslip to replace it.’ in place of ‘Before anything comes out.’, and the card’s last line reads ‘The take-home is what you entered; the gross was worked back from it.’ in place of ‘This is what you entered — nothing here is calculated.’ Typing a gross brings back the drawn words. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: made under tenet 3 (approved 2026-10-09: something never entered is never shown as if it were, DEC-3523) and tenet 5 (the person’s word outranks the app’s guess), and this drawing’s rule 9, that every estimate is prefixed ≈ and says what it cannot see; found by the Cash flow journeys E2E-71 and E2E-72. One word from him reverses it. To reverse: work the gross back from the federal schedule and print the drawn words.",
  "Record": "DEC-3523 (tenets 3, 5) · MK-CF-F-186 · MK-CF-O-001 · MK-CF-M-030",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your base pay (phone 3), a tax rate typed . The rate is his, so the card says so: the tax row reads Tax · your rate, 24% · $2,760/month (24% of $11,500), where it read ‘Calculated federal tax — assumes you take the standard deduction ≈$2,760/month’. A take-home worked from his own rate is not an estimate, so it carries no ≈ — the household band, ‘= Take-home’ and the closed lines read $7,540/month, You $4,520, Sam $3,020 (calculated); the open section reads ‘We’ll calculate $4,520/month, using the 24% rate you entered.’ where it spoke of a tax band the figure was not worked from; one take-home typed and one not: ‘Sam’s take-home: $3,020 (calculated at your 24% rate, less 401(k))’. Every figure worked with the calculated rate keeps its ≈ (rule 9), on this screen, the Income summary (its rows, total and band: ≈$5,669, ≈$3,759, ≈$9,427 for phone 3’s household, where they printed with none) and the Income tab. DRAWING ERROR on phone 3: ‘= Take-home $8,740/month’ leaves the $1,200 of 401(k)s in; the rate is everything that comes out except the 401(k) (the phone’s own question), so $11,500 − $2,760 − $1,200 = $7,540.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-03), made without asking him, under his tenets 1, 2 and 4 (DEC-3523: a figure says whose it is, an estimate says so, one figure in one form) and this drawing’s rules 8e and 9. One word from him reverses it. To reverse: label a typed rate ‘Calculated federal tax’ and put ≈ on every take-home the app works out.",
  "Record": "DEC-3523 (tenets 1, 2, 4) · MK-CF-O-001 · MK-CF-O-004 · MK-CF-M-031 · MK-CF-M-033 · MK-CF-M-037 · MK-CF-M-038",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "DRAWING ERRORS, phones 2 to 4 (the app is right; the phones are not redrawn). Phone 2: ‘Everything else taken out $4,700/month · 24%’ is $11,500 − $8,300 − $1,200 = $2,000/month · 17% of the gross, and its sentence reads ‘The 17% is your own figures …’. Phones 3 and 4, worked after the 401(k)s by his DEC-0283: the household and take-home ≈$9,427/month , the tax ≈$873/month , ‘$11,500 gross − $873 tax − $1,200 of 401(k)s = $9,427.’ (drawn ≈$9,242 and ≈$1,058); Sam ≈$3,759 (calculated) and the household ≈$8,759/month (drawn ≈$3,686 and ≈$8,686). Phone 8 has a spouse entered, so it is taxed jointly until the filing question is answered (the 2026-10-24 row on phone 15): ≈$6,523/month where drawn ≈$6,196, the single figure. Phones 9 and 16: December, with the bonus, is $9,500 + $12,000 × (1 − 24%) = $18,620 at the household’s own 24%; the drawn $18,860 is the bonus at 22%.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-01, IN-02, IN-07, IN-10), made without asking him, under his DEC-0283 and tenet 1 (DEC-3523), the way DEC-4529 corrected a drawn figure. One word from him reverses it. To reverse: draw the figures again as the phones show them.",
  "Record": "DEC-0283 · DEC-1625 · DEC-4529 · DEC-3523 (tenet 1) · MK-CF-M-031 · MK-CF-M-033 · MK-CF-M-036 · MK-CF-M-039",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Money boxes, as drawn (Your base pay, Bonus and stock, Rent, Interest & dividends): a box shows its figure with the $ and the thousands mark while it is typed — ‘$7,000’, ‘$12,000’, ‘$1,800’ (it showed ‘7000’). The match box reads ‘50% · $400/month’ (50% of the $800 put in) or ‘$150/month · a set amount’ , its worth beside what was typed (it showed ‘50’, ‘150’). A match typed without tapping either choice is read as the choice the screen shows chosen, % of theirs, everywhere the match counts — it was counted as dollars, so 50 with $800 put in counted $50/month, not $400. An empty box shows what an empty box counts: ‘$0’ for a 401(k) or stock left blank, ‘optional’ for a take-home. Sam’s months (phone 6): a month not typed shows the month the app counts — the fortnight’s $2,077 as a month, $2,077 × 26 ÷ 12 = $4,500 — where it showed ‘2077’, the fortnight figure this phone’s own sentence says a monthly box must never hold; a typed month is marked and last month greyed, as drawn. A month with nothing typed — never typed, or cleared — counts as the typical month in the year’s gross too, and a month typed $0 counts $0: a typed $0 is an answer. The year is this calendar year’s twelve months, as every Cash flow month reads it (rule 6: the average month × 12, never the window’s total): phone 6’s Sam, with September 2026 typed at $6,000, earns 11 × $4,500.17 + $6,000 = $55,502 this year (his March 2027 $6,000 is next year’s); Your base pay counted the typed months only, so it read every month as $6,000 and showed $72,000. A worker paid $12,500 from July, January to June typed $0, reads $75,000. DRAWING ERROR on phone 6: its band reads $139,502/year ($84,000 + $55,502), where drawn $138,000, which leaves the $6,000 month out.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-04, IN-05, IN-06), made without asking him, under his tenets 1 and 4 (DEC-3523: a wrong number ends trust; one figure, one number) and this drawing’s line ‘Every month below starts from this’. One word from him reverses it. To reverse: show the boxes as plain digits, the fortnight figure in an empty month, count only the typed months, and read a match with no choice tapped as dollars.",
  "Record": "DEC-3523 (tenets 1, 4, 5) · MK-CF-F-143 · MK-CF-F-178 · MK-CF-O-001 · MK-CF-M-030",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your base pay with nothing entered (not drawn). His empty-state ruling (Q48): the household band reads $0/month with ‘Nothing entered yet. Add your income ›’ under it, the door opening the first person’s questions; no gross row, no bracket, no tax row, no warning and no rate question until a gross is typed; no ✓ beside a person with nothing entered, and that person is left out of the household’s sentence. It read ‘≈$0/month’, ‘Federal tax bracket 10%’, ‘Calculated federal tax ≈$0/month’, ‘= Take-home ≈$0/month’ and ‘higher than it will really be, by roughly $0/month’.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-08), made without asking him, under his Q48 (DEC-0431, the approved empty-state drawing) and tenet 3 (DEC-3523: unknown is not zero). One word from him reverses it. To reverse: show the card’s rows on an empty profile again.",
  "Record": "DEC-0431 (Q48) · DEC-3523 (tenet 3) · MK-CF-O-001",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Inside sign-up (phone 8; the filing question, phones 13 and 14). The step is titled ‘Your base pay’, as drawn (it had no title); the household card and the rate question are not shown — phone 8 draws neither, and sign-up’s Taxes step asks the rate; the button reads Continue on every step (it read ‘Continue →’); the filing question has no ‘Skip for now’ — it is pre-answered, and Continue keeps the answer. ‘← Back’, ‘Save & come back later’ and the step names at the top stay on every step, though the phones do not draw them: the phones draw the questions, and a person must be able to go back or stop. The picker (phone 1) reads ‘We’ll’ with the curly mark. Phone 6: Sam’s 401(k) and take-home boxes carry no grey line, as drawn. Phone 7: while the three figures disagree, the gross and the take-home boxes are marked and the three grey lines give way to the warning, as drawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-07, IN-18, IN-19, IN-20), made without asking him, under his tenet 6 (DEC-3523: the drawing is the design) and this drawing’s rule 2b; the back and pause buttons under tenet 1 (nobody is trapped in sign-up). One word from him reverses it. To reverse: take the title and Continue’s arrow back to how they were, show the household card in sign-up, or remove Back and Save & come back later.",
  "Record": "DEC-3523 (tenets 1, 6) · rule 2b · MK-CF-O-001",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your base pay, a take-home typed before 2026-08-28 : the row of 2026-10-24 above applies from the first open. The take-home is converted when the profile loads, on the phone and from the cloud, not only when something is saved; until a save the founder’s household showed $5,000 in the gross box under ‘Before anything comes out.’, an empty take-home box, ‘Calculated federal tax ≈$0/month’ and ‘We’ll calculate ≈$5,000/month’.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-09), made without asking him, under his tenets 3 and 5 (DEC-3523) and the mock-match rule that a rule change re-classifies the data already stored. One word from him reverses it. To reverse: convert the take-home only when the profile is saved.",
  "Record": "DEC-3523 (tenets 3, 5) · MK-CF-F-186 · MK-CF-M-030",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "One door on a fresh account. Income summary (phone 17): ‘Nothing entered yet. Add your income ›’ once, where the same door printed twice in a row; the $0 and the sentence stay (Q48). Your income (phone 12): no count band — ‘You entered about 0 sources’ is gone; ‘Nothing entered yet. Add your income ›’ and the ten sources stand.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-11, IN-12), made without asking him, under his Q48 (DEC-0431: one line and its door) and tenet 3 (DEC-3523). One word from him reverses it. To reverse: print the door twice and the count of no sources.",
  "Record": "DEC-0431 (Q48) · DEC-3523 (tenet 3)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Appearance , phones 2 to 12, 14, 16 and 17. A heading drawn as a dark-green band is one — square, edge to edge of its card, white capitals, its total on the rows’ right edge: Who earns a wage?, Each person’s pay, Your pay, Who gets a bonus?, Your bonus, The property, From your accounts, You entered about, Take-home each month. A light-green one is the light band: Your household, December will look different, This does not reach your bank, Anything else?, What it is taxed on, Is either of you 65 or older?. ‘= Take-home’, ‘= You keep’, ‘= Inflow’ and the December bonus are green (#006300); the information boxes sit on the blue tint with a blue rule, the warning on the red tint in ink, the pre-answer on the green tint; Edit ⌄ and Done ⌃ are brand green at 800; ‘Add another property’ is a filled green button. The type stays on the app’s scale (11 · 13 · 15 · 17 · 20) and the choices keep the 12-point corner (DEC-0231), where the phones draw 10 to 14.5 points and square choices.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-13, IN-14, IN-15), made without asking him, under his DEC-0093 (one right edge), DEC-0079 (square green bars) and DEC-0231 (one corner for every choice), and the screen standard 2.3 to 2.5. One word from him reverses it. To reverse: the headings go back to grey capitals on the page.",
  "Record": "DEC-0093 · DEC-0079 · DEC-0231 · standard 2.3, 2.4, 2.5",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "How do you file your taxes? opened with nothing entered (from the Tax organizer, not drawn): ‘Set to Single because you have not entered a spouse. Change it if that is not right.’ — it said ‘because you entered it is just you’ when nothing had been entered. With an answer already on record that differs from the pre-answer: ‘Set to Head of household because you entered it.’ (it said ‘Set to Single’ beside Head of household). The drawn sentences stand wherever they are true.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-24 (IN-17), made without asking him, under his tenet 1 (DEC-3523: an untrue sentence beside a figure ends trust). One word from him reverses it. To reverse: print the drawn sentence whatever was entered.",
  "Record": "DEC-3523 (tenet 1)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your base pay (phone 8’s sentence, wherever it shows): ‘using your tax band read on the $X you have entered so far’ names everything the band is read on — wages, rent kept, a bonus, interest and dividends ($84,000 for phone 8’s household, wages only) — and ‘add … later’ lists only what is not entered yet: one earner with $2,000 a month of rent reads ‘add a bonus or a spouse’s wage later’; with all three entered the clause is left off. It read ‘add rent, a bonus or a spouse’s wage later’ beside rent already entered, and named the wages alone.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow measure (CFR-5, found F3), made without asking him, under tenet 1 (an untrue sentence beside a figure). One word from him reverses it. To reverse: print the drawn sentence whatever is entered.",
  "Record": "DEC-3523 (tenet 1) · MK-CF-O-001 · MK-CF-M-076",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your base pay (phone 7), pay that varies: the three figures are checked in the months that have pay — a month typed $0 has no pay, so no 401(k) comes out of it and nothing is reconciled — and the month is named in words: ‘These three cannot all be right in March 2026.’ It read ‘… in 2026-01. $0 gross, less $501 into your 401(k), leaves -$501’ for a month with no pay.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow measure (CFR-5, found F6), made without asking him, under tenets 1 and 8. One word from him reverses it. To reverse: check every month, paid or not.",
  "Record": "DEC-3523 (tenets 1, 8) · MK-CF-F-146 · MK-CF-O-001",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "A state income tax rate entered on the Tax organizer (not a drawn state). The app’s tax then holds it, so the words say so wherever the calculated tax is printed: the row reads Calculated tax , never ‘Calculated federal tax’, with ‘federal income tax, plus the 5.00% state rate you entered; assumes you take the standard deduction’ under it (Your base pay) — the Income summary keeps its own line under it; the warning reads ‘Only federal income tax and the 5.00% state rate you entered are taken out here …’, without ‘and your state may take more’; and the estimate sentence reads ‘It holds the 5.00% state rate you entered but knows nothing about your insurance’. For one earner on $60,000 with 5.00% typed, ≈$533/month: $370 federal and $163 state. Canon row 25.",
  "His words, or where it came from": "The lead’s ruling of 2026-10-25 on the outside Cash flow measure (MK-CF-M-033 and MK-CF-M-044, test 8): ‘federal’ is never on a figure that is not federal only. Not a decision of his; made without asking him, under tenet 1. One word from him reverses it. To reverse: label it ‘Calculated federal tax’ and print the federal-only words.",
  "Record": "DEC-3523 (tenet 1) · DEC-7608 · DEC-7798 · MK-CF-M-033 · MK-CF-M-044 · canon row 25",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Tax organizer (not drawn), How you file : the line names the status the tax below is worked on. With a spouse entered and the filing question never answered it reads Married, filing jointly with ‘Assumed — we have never asked’ under it, above the $32,200 joint deduction; it read ‘Single’ there. Under the Standard deduction row, on a joint return whose 65-or-older answer was never given: ‘Your spouse counted as under 65 — not entered ›’ , opening How do you file your taxes?, where the question is asked. With nothing entered, his empty-screen rule (Q48, DEC-0431): the INCOME card keeps its layout — Gross income $0 , with ‘Nothing entered yet. Add your income ›’ under it — and the lines that need an assumption stay off: no 401(k), no Standard deduction −$16,100 (it rests on a filing status nobody answered), no Taxable income and no rate line. Interest & dividends on the Tax organizer is the records of the year it names (1 January to today), reinvested payouts counted, from accounts whose income is taxed when paid (a pre-tax or Roth account is left out), to the cent until shown: ‘Tax organizer · 2026’ with $500 paid 2025-11-14 and $700 paid 2026-03-13 reads $700 (it read $1,200); with no record in the year the figure you entered stands. A payout with no amount on record is named under the income lines: ‘Not counted: 1 payment — amount not on record.’",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside audit of 2026-10-24 (OpenAI, Cash flow part 17), made without asking him, under his DEC-7944 (the status in force), his DEC-0298 (“a tax figure requires a YEAR”), DEC-0179 (the tax on reinvested income still comes out), DEC-0264 (full precision), tenet 3 (DEC-3523) and Q48 (DEC-0431); the spouse’s line is the lead’s ruling of 2026-10-25 on the measurer’s open question (count the person only, and say so). One word from him reverses any of it. To reverse: print the stored answer (Single when blank), drop the spouse line, print the walk with nothing entered, and read the twelve months ending today.",
  "Record": "DEC-7944 · DEC-0298 · DEC-0179 · DEC-0264 · DEC-3523 (tenet 3) · DEC-0431 (Q48) · MK-CF-O-007 · MK-MN-M-027 · MK-MN-M-028",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Interest & dividends (phone 11), From your accounts : a payout dated after today is not counted yet — a $500 dividend dated 1 December, read in September, is not in the year (it read $920, now $420); a dividend logged as reinvested counts, at its amount or the shares it bought × their price (1.2 VTI at $100: $540, it read $420), as the screen already says these are counted as income you are taxed on; an account inside a pre-tax or Roth wrapper (an IRA, a 401(k), an HSA, a Roth IRA, a 529) is not listed and not named as not counted, since its income is not taxed when paid; a payout with no amount on record is named: ‘Not counted: 1 payment from Brokerage — amount not on record.’ The line words ‘paid out over the trailing twelve months’ stay. The Tax organizer reads the same rule for its tax year.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside audit of 2026-10-24 (OpenAI, Cash flow part 17), made without asking him, under his DEC-0179 clause 2 (‘the tax on them still comes out’), DEC-0198, DEC-7171 (the twelve months ending today) and tenet 3 (DEC-3523); found by the measurers (parts 5 and 17, the screens check MK-CF-M-066). One word from him reverses it. To reverse: leave reinvested payouts out, let the window run past today, and count every account.",
  "Record": "DEC-0179 · DEC-0198 · DEC-7171 · DEC-3523 (tenet 3) · MK-CF-F-183 · MK-CF-F-184 · MK-CF-M-066",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Tax organizer (not drawn), two more lines. Interest & dividends is the one figure for the year, tried in order: the year’s records (‘from your accounts’ records for 2026’), else the figure you entered on Interest & dividends (‘you entered’), else calculated from your accounts’ rates, with its working and ≈ (‘≈$400 · calculated from your accounts — 4% on $10,000’), else no line. The rate line reads in Base pay’s and the Income summary’s words (canon row 25): ‘Calculated federal tax ≈7% of the year’s income — assumes you take the standard deduction.’; with a state rate entered ‘Calculated tax ≈12% of the year’s income — federal income tax, plus the 5.00% state rate you entered; assumes you take the standard deduction.’; with a rate typed ‘Tax · your rate, 24%.’ (from the take-home entered, ‘Tax · your figures, 28%.’). It read ‘Est. effective federal rate ~7%’ whatever the rate held. ‘Figures are your entries/estimates — verify against your official forms.’ stays. Equity / RSUs vested counts the shares that vest in the year the organizer names; a grant with no vest date is not counted and the line under the income says so: ‘Not counted: shares that vest — vest date not entered.’",
  "His words, or where it came from": "Not a decision of his: the lead’s rulings of 2026-10-25 (one interest-and-dividends figure: records, else entered, else calculated ≈, else not entered — from his DEC-0179 and the figure’s own rule ‘records where they exist’; the rate in canon row 25’s words, as Base pay carries them), made without asking him. One word from him reverses either. To reverse: read the records or the entered figure only, and print ‘Est. effective federal rate’.",
  "Record": "DEC-0179 · DEC-0298 · DEC-0431 (Q48) · canon row 25 · MK-CF-O-007 · MK-CF-F-181",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Your base pay, pay for part of the year (not drawn: a pay table with months typed $0). Every ‘/month’ in the section and on the household card is a month the wage is paid. A take-home typed is what lands in each month with pay; the 401(k) comes out of those months only; Everything else taken out is a paid month’s. Paid $10,000.05 a month July to December, $501.13 into a 401(k), take-home typed $3,799.17: Everything else taken out $5,700/month · 57% (it read $700/month · 14%); the year’s 401(k)s $3,007 and take-home $22,795 (they read $6,014 and $45,590). The take-home calculated, $10,000 a month from July with $1,000 into a 401(k): $10,000 gross − $717 tax − $1,000 of 401(k)s = $8,283 (it read $5,000 − $358 − $1,000 = $3,642). The Cash flow months land the same take-home in each paid month ($3,799.17; they landed $7,598.34).",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under his DEC-7938, DEC-0176 (‘if they told us, that IS take-home’) and DEC-0376, and tenets 1 and 4 of DEC-3523: one rule for part-year pay. One word from him reverses it. To reverse: count the take-home and the 401(k) twelve times.",
  "Record": "DEC-7938 · DEC-0176 · DEC-0376 · DEC-3523 (tenets 1, 4) · MK-CF-F-233 · MK-CF-F-144 · MK-CF-F-145 · MK-CF-F-171 · MK-CF-F-180 · MK-CF-F-181 · MK-CF-F-188 · MK-CF-O-001 · MK-CF-M-031 · MK-CF-M-034 · MK-CF-M-036",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Your base pay, paid by the hour (phones 2 to 7 draw the Hourly choice and no hours). Choosing Hourly shows a money box ‘Hours a week’ under ‘Gross an hour’, hint ‘The hours you are usually paid for.’ Until it is filled the section reads ‘Hours a week not entered — your hourly pay is not counted until it is.’ in the warning box, the closed line reads ‘Hourly · hours a week not entered’, and the household card shows that sentence in place of its figures. A typed 0 is 0 hours. It read a 40-hour week nobody entered: $25 an hour was $4,333.33 a month, on every screen.",
  "His words, or where it came from": "His DEC-0296 (2026-08-20): “an unknown input produces no number and a reason — never a default”; tenet 3 of DEC-3523. The box is the lead’s, made without asking him, so the missing answer can be given where it is missing. To reverse: remove the box and read 40 hours.",
  "Record": "DEC-0296 · DEC-3523 (tenet 3) · MK-CF-F-059 · MK-CF-F-130 · MK-CF-F-141 · MK-CF-O-001",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Your base pay, Federal tax bracket, with rent, a bonus or interest entered (not drawn). The band is the Income summary’s: on the wages less their 401(k)s plus everything else taxed. $60,000 of wages and $50,000 of rent kept, single: 22% (it read 12%, on the wages alone). With two wages and other income the note under it reads ‘on both wages and your other income, filing jointly’.",
  "His words, or where it came from": "His DEC-0178 and DEC-0191: the band is worked out once, on everything taxed together, and every screen reads it; tenet 4 of DEC-3523.",
  "Record": "DEC-0178 · DEC-0191 · DEC-3523 (tenet 4) · MK-CF-O-001 · MK-CF-M-032 · MK-CF-M-043",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Your base pay, a take-home typed as $0 (not drawn). It is his figure: the section reads take-home $0 and Everything else taken out is the gross less the 401(k) — $5,000 a month with $500 into a 401(k): $4,500/month · 90%. It read a calculated take-home in its place. A blank box is still ‘not entered’.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him (the lead’s ruling 3 on the measure CFR-1: a typed $0 is an answer), under tenet 5 of DEC-3523 (the person’s word outranks the app’s guess). To reverse: read a typed 0 as blank.",
  "Record": "DEC-3523 (tenet 5) · MK-CF-F-144 · MK-CF-F-180 · MK-CF-F-233 · MK-CF-M-031 · MK-CF-M-036",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Your base pay (phone 7), pay that varies: every month is read before the section speaks. When one month only warns (‘higher than most’) and a later month cannot be right, the later month’s ‘These three cannot all be right in February 2026 …’ is shown and Save waits — $500.13 into a 401(k) and a take-home of $2,800.19: January’s $10,000.17 leaves 67% going elsewhere (a warning), February’s $3,000.17 − $500.13 − $2,800.19 = −$300.15 cannot be right. It showed January’s warning and saved.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under tenet 1 of DEC-3523 (a wrong number ends trust). To reverse: stop at the first month that warns.",
  "Record": "DEC-3523 (tenet 1) · MK-CF-F-146 · MK-CF-O-001",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Your base pay, a take-home typed before 2026-08-28 with a 401(k) and no rate of his own (not drawn; the row of 2026-10-24 above). The gross worked back adds the 401(k) back, so gross − 401(k) − tax = the take-home entered: $4,211.17 a month with $511.43 into a 401(k) is $61,084.93 a year (it read $54,947.77, which left $1,723.43 less than he said lands, and Everything else taken out $0 · 0%).",
  "His words, or where it came from": "The lead’s DEC-7942, carried to the calculated branch, under his DEC-0200 (convert once, honestly) and DEC-0283 (a 401(k) comes off before tax). To reverse: work the gross back from the take-home alone.",
  "Record": "DEC-7942 · DEC-0200 · DEC-0283 · MK-CF-F-186 · MK-CF-M-030",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your income (phone 16, frame 5a), What it is taxed on : one row for every source the year is taxed on, signed, and they add up to ‘= Gross /year’. After the drawn rows (Your gross, Sam’s gross, Rent, net, Interest & dividends, Bonus) come, when entered: Self-employment, a Signing bonus or one-time payment of this year, Stock vesting (this year’s), Other income, Unemployment, Retirement income and Social Security, the part that is taxed (IRS Publication 915 — printed even at $0, so a retiree sees where it went). A $7,000 wage, $1,000 of self-employment, $2,000 of Social Security and $500 of other income: $84,000 + $12,000 + $6,000 + $20,400 = $122,400 (the rows read $84,000 under $126,000). A rental losing $500/month: Your gross $86,400 · Rent, net −$6,000 · = Gross /year $80,400.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under his DEC-0376 (a total agrees with the lines printed above it) and tenet 2. To reverse: print the wage, rent, interest and bonus rows only.",
  "Record": "DEC-0376 · DEC-3523 (tenet 2) · MK-CF-M-042 · MK-CF-M-076 · MK-CF-O-004 · MK-CF-F-084",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your income (phone 16), Take-home each month : a rental that loses money is a row, signed — ‘Rent · after running costs · −$500’ — and the total counts it: $7,200 of pay and a rental losing $500/month read $6,700, as the Cash flow months read it (it read $7,200). Child support alone shows its amount ($1,000), never $0 and ‘Nothing entered yet.’. Unemployment pay is its own row, after tax; the rest of the benefits stay ‘not taxed’. Social Security lands whole except the tax on its taxed part.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under tenets 1, 3 and 4 and his DEC-0376. To reverse: drop rows below $0 again (the month table would then disagree).",
  "Record": "DEC-0376 · DEC-3523 (tenets 1, 3, 4) · MK-CF-M-037 · MK-CF-M-038",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your income (phone 16), two more sentences in the blue box, in the dividends’ sentence’s words: ‘Your $30,000 of stock vesting this year is not here — it vests as shares, not money to spend. It is taxed, so it appears below.’ (shares kept when they vest), and one line for each thing entered and counted nowhere yet: ‘A stock grant with no vest date is not counted — vest date not entered.’, ‘Your Gift is not counted — year not entered.’, ‘Your signing bonus is not counted — date not entered.’, ‘Hours a week not entered — your hourly pay is not counted until it is.’ Interest and dividends calculated from the accounts’ rates are a taxed row with ≈ and ‘calculated from your accounts’ (≈$400 for $10,000 at 4%).",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him: vested shares are taxed, not cash unless sold at vest (the same shape as his DEC-0179 for reinvested dividends); a figure calculated from the accounts counts in the tax (DEC-0179, DEC-0198); tenet 3 (unknown is not zero). To reverse: count a vest as cash in its month.",
  "Record": "DEC-0179 · DEC-0198 · DEC-0012 · DEC-0296 · MK-CF-M-040 · MK-CF-M-041 · MK-CF-M-042",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Your income (phone 12, frame 3d): entered means recorded . A rental whose rent and costs were typed is entered whatever it nets — ‘Rent ✓ · One property · −$500/month net’ (it sat under ‘Anything else?’ as ‘Rent from a property’). Stock that vests with no job is its own row, ‘Bonus and stock ✓ · $10,000/year · vests through the year’, opening Bonus and stock. The job’s line ends ‘· hours a week not entered’ for an hourly wage with no hours; Retirement income ends ‘· Social Security not received yet’ when Social Security is answered ‘Not yet’; Something else ends ‘· year not entered’ for a one-time payment with no year.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under tenets 3 and 5 (what is entered is never shown as not entered). To reverse: list a source only above $0.",
  "Record": "DEC-3523 (tenets 3, 5) · MK-CF-M-027 · MK-CF-O-019",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Bonus and stock (phone 9) and the grants’ editor: ‘Do you sell the shares when they vest?’ · Keep them / Sell them (Keep them chosen until he picks), with the line ‘Kept, they are shares, not money to spend. They are still taxed in the year they vest.’ or ‘Sold, they land as money in the month they vest, after tax.’ Each vest counts in the year its date names: the grants’ callout reads ‘$30,000 vests in 2026’ (it read ‘$20,000/year average while vesting’); a grant with no date reads ‘One grant has no vest date — vest date not entered, so it is not counted yet.’; a date with a year and no month counts in that year and in no month.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him: vests land in their own year and month (his DEC-0012 ‘shares that vest land in the month they vest on every screen’, DEC-0003); not cash unless sold at vest (like DEC-0179). To reverse: average the vest years again.",
  "Record": "DEC-0012 · DEC-0003 · DEC-0179 · DEC-0296 · MK-CF-M-009 · MK-CF-F-063 · MK-CF-F-066",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Rent from a property (phone 10): a mortgage payment typed here and added to Debts is saved with its balance and its rate not entered — Net worth reads ‘Value not entered’ and the Debts tab ‘rate not entered’ — never $0 and 0%. A rent box left blank, or text that is not a number (‘about 2k’), gives no net and the entry counts nowhere until the rent is typed; a typed 0 is $0 rent, and its costs are a loss.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under tenet 3 and his DEC-3768c (‘it counts as not entered’) and DEC-0296. To reverse: save the mortgage at $0 and 0%.",
  "Record": "DEC-3768c · DEC-0296 · MK-CF-F-219 · MK-CF-F-067",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Sign-up (not drawn on this page): the Benefits step with Unemployment chosen reads ‘Unemployment pay is taxed, so we count it in what you are taxed on.’ (it read ‘We won’t tax this income.’; IRC §85(a), IRS Publication 525); chosen beside another kind it reads ‘Unemployment pay is taxed and the rest is not — we count the unemployment part in what you are taxed on.’ and asks ‘How much of that is unemployment, per month?’, counting all of it as taxed until that is typed (‘Not entered yet — until it is, all $1,300/month is counted as taxed.’). The Bonuses step asks the signing bonus ‘Which month is it paid?’ — the month is stored with its year, the next time it comes — and reads ‘Date not entered — it is not counted until you pick its month.’ until then, ‘Counted once, in Oct 2026.’ after.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him: unemployment pay is taxed by law (IRC §85(a)); money that lands once lands in its own month (his DEC-0447, DEC-7940). To reverse: untax benefits again; land the signing bonus in January.",
  "Record": "DEC-0447 · DEC-7940 · MK-CF-F-071 · MK-CF-F-079",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Sign-up (not drawn on this page), the Other income step, ‘One time’: nothing is picked for him — no month is lit until he taps one — and the step asks both ‘Which month does it land?’ and ‘Which year?’ (this year or next). Until both are given it reads ‘Month and year not entered — it is not counted until you pick both.’ (or only the one missing), and every screen says the payment is not counted, ‘year not entered’ (or ‘month not entered’). It lit January and saved neither, so the payment landed in no year it was told.",
  "His words, or where it came from": "Not a decision of his: the lead’s follow-up on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under tenet 3 (unknown is not zero) and his DEC-0447 (‘lands in its own month’) and DEC-7940 (‘lands once’). To reverse: light January and take the next time the month comes as its year.",
  "Record": "DEC-0447 · DEC-7940 · DEC-3523 (tenet 3) · MK-CF-F-071 · MK-CF-F-073",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Your base pay (phone 8’s sentence, wherever it shows): when the band is read on interest and dividends nobody typed, the sentence says so. Since 2026-10-26 the band is read on the accounts’ interest and dividends too, typed or not (the one profile every tax figure reads), so ‘the $X you have entered so far’ was untrue for it. With $10,000 of savings at 4% and nothing typed, one earner at $5,000/month reads ‘We’ll calculate ≈$4,580/month, using your tax band read on $60,400 — what you have entered so far and the interest and dividends calculated from your accounts. Add rent, a bonus or a spouse’s wage later and the band is calculated again, so this figure moves.’ ($60,000 of wages + $400 calculated = $60,400.) Interest read from the accounts’ records says ‘the interest and dividends from your accounts’ records’. With interest typed, or none, phone 8’s sentence is unchanged. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says; built by CLEANUP-LEFT. Under tenet 1 (DEC-3523: no untrue sentence beside a figure) and canon row 0b (‘calculated’ for a figure the app works out). One word from him reverses it. To reverse: ‘the $X you have entered so far’ whatever the band is read on.",
  "Record": "DEC-3523 (tenet 1) · DEC-0179 · DEC-0198 · MK-CF-O-001 · MK-CF-M-076",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Sign-up (not drawn on this page), the ‘Your income’ recap: ‘Take-home / year’ is the twelve months’ take-home added up — the figure the ‘≈ $X/month average’ beside it is worked from , so money that is taxed but never reaches the bank is in neither. It counted interest and dividends that are reinvested, and stock kept as shares when it vests, as money in the bank, while the monthly average left them out. Under WHAT’S TAKEN OUT the card names each, so its lines still add up to ‘Available /year’: ‘Interest & dividends, reinvested — not money to spend’ and ‘Stock vesting, kept as shares, after its tax — not money to spend’. Pat ($5,000/month, $400/month into a 401(k)) with $3,600/year of interest reinvested: Take-home / year $50,324 (it read $53,924), ≈ $4,194/month average; $63,600 − $4,876 − $4,800 − $3,600 = $50,324. The same with $10,000 of savings at 4% and nothing typed: $50,708 (it read $51,108), the $400 calculated. Paid to the bank, or sold when they vest, they are money to spend and no line is shown. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says; built by CLEANUP-LEFT. Under his DEC-0198 (does this reach your bank?) and DEC-0179, the lead’s ruling of 2026-10-25 for vests kept as shares, and tenet 4 (DEC-3523: one thing, one number). One word from him reverses it. To reverse: take-home a year = total − tax − 401(k) again.",
  "Record": "DEC-0198 · DEC-0179 · DEC-3523 (tenet 4) · MK-XS-F-027 takeHomeMonthly · MK-CF-M-040",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Sign-up (not drawn on this page), the ‘Your income’ recap, when the rate is the person’s own — typed, or worked from a take-home typed — and rent or interest is entered: the rows add up to ‘Available /year’ . This drawing’s rule 5 and phone 16: the take-home someone enters IS the take-home and their own rate is for their pay, so the months take no tax on rent or interest (phone 16’s ‘Rent after running costs $1,200’ lands whole), while the year’s tax is their rate on every source (phone 16’s ‘Tax · your rate, 24% · $40,176/year’). Both stand, as drawn. The card follows the months: its tax row reads ‘Tax taken out of your pay’, and one line under the card gives the year’s tax and the difference. 20% typed, $5,000/month of wages, $400/month into a 401(k), $1,200/month of rent, $3,600/year reinvested: $78,000 − $12,000 tax taken out of pay − $4,800 401(k) − $3,600 reinvested = $57,600, the twelve months’ take-home; under it ‘Your tax for the year is $15,600, at your 20.00% rate. $3,600 of it is on your rent, interest and dividends — your own rate is for your pay, so it is not taken out of your take-home.’ It printed Tax −$15,600 above a $57,600 box, so its rows gave $54,000. With the calculated rate nothing changes: the months take the tax on every source. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s, made without asking him; built by CLEANUP-LEFT. Under this drawing’s rule 5 and phone 16 (the approved drawing wins over our own rule, tenet 6 of DEC-3523), his DEC-0376 (a total agrees with the lines printed above it) and tenet 4. One word from him reverses it. To reverse: print the year’s tax as the row again.",
  "Record": "rule 5 · phone 16 · DEC-0376 · DEC-3523 (tenets 4, 6) · MK-XS-F-027 takeHomeMonthly · MK-CF-O-004",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "The rate in force (MK-CF-M-081) prints to two decimals wherever it shows , one figure written one way. Your base pay: ‘· 24.00%’ beside Everything else taken out, ‘We’ll use 24.00% everywhere your take-home matters …’ and ‘… using the 24.00% rate you entered.’ and the same rate written in words — ‘Tax · your rate, 24.00%’, ‘your figures, 17.39%’, ‘calculated, 7.41%’, ‘The 17.39% is your own figures …’, ‘calculated at your 24.00% rate, less 401(k)’ — where phones 2 to 8 draw ‘24%’ or ‘17%’, they read ‘24.00%’ and ‘17.39%’ (the phones are not redrawn). Your income (phone 16): ‘Your 24.00%, used on every figure built from your take-home.’ Sign-up (not drawn on this page): the Taxes step ‘~7.41% federal income tax’ and ‘Use the calculated rate (~7.41%)’; the ‘Your income’ recap ‘Tax (~7.41% on taxable income)’ for Pat ($4,444 ÷ $60,000 = 7.4067%) — they read ‘~7%’, while the sentence under the recap, with the person’s own rate, already wrote it ‘20.00%’. The Tax organizer’s ‘Calculated federal tax ≈7.41% of the year’s income’. The bracket (12%, 22%) is a published rate and stays whole. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s, made without asking him, on PF-TOOLS’s finding; built by CLEANUP-LEFT. His Q49: percents to two decimals, rounded once, when printed; one figure, one way (tenet 4). One word from him reverses it. To reverse: print the rate whole again.",
  "Record": "MK-CF-M-081 · Q49 · DEC-3523 (tenet 4)",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: phone 1, v02 approved 2026-08-27 (‘yes’, DEC-0177), v07 approved 2026-09-02; his DEC-1560 of 2026-10-04 on which sources. His words: “Rest - keep it.” New: the order, the mark and the title are the drawing’s. — Where does your money come from? (phone 1). The picker offers the sources that fit the person, as his DEC-1560 keeps them — eight for someone employed (no Retirement income, no Scholarships), nine for someone partly retired, eight for a student — not all ten. Each list runs in this phone’s order: A job, Self-employed / side gig, Rent from a property, Interest & dividends, Retirement income, Benefits, Child support or alimony, Scholarships, grants, stipend, Student loans, Something else. Someone employed reads A job, Self-employed, Rent, then Interest & dividends (it read Interest before Rent); a student reads Scholarships and Student loans sixth and seventh (it read them second and third). Retirement income wears 📨, as drawn (it wore 🏖️). The question has no coin and no 💰 above it, as drawn; its title and line are the title and line Your base pay and the filing question print in sign-up. Line added 2026-10-27, before the code.",
  "His words, or where it came from": "His words on which sources: “Rest - keep it.” (DEC-1560, 2026-10-04: ‘The picker — the sources that fit the person (eight for someone employed), not all ten.’). The order and the marks are not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-27 (IN2-07), made without asking him, under tenet 6 (DEC-3523: the drawing is the design) — his ruling names which sources, not their order. One word from him reverses it. To reverse: order each list by life stage again.",
  "Record": "DEC-1560 · DEC-3523 (tenet 6) · src/onboarding/steps.ts incomeSourceOptionsFor",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: phones 9 and 10, v02 approved 2026-08-27 (‘yes’, DEC-0177), v07 approved 2026-09-02. His words: “Rest - keep it.” (DEC-1560, 2026-10-04). New: nothing in the app; the drawing now says it. — Two lines his DEC-1560 keeps as built , written here so the drawing says it (phones 9 and 10 are not redrawn). Bonus and stock (phone 9): ‘Which month is it paid?’ offers all twelve months, Jan to Dec, where the phone draws Mar Jun Sep Dec — a bonus paid in February counts in February, this drawing’s rule 7. Rent from a property (phone 10): ‘… the rent alone would overstate what reaches you by $600/month.’ — $1,800 − $1,200 = $600 — where the phone draws ‘by half’, true of its own figures and of no others (rule 8c: say it in money). Nothing in the app changes. Line added 2026-10-27.",
  "His words, or where it came from": "“Rest - keep it.” (DEC-1560, 2026-10-04: ‘Bonus and stock — twelve months to choose from, not four. Rent — ‘by $600/month’, not ‘by half’.’)",
  "Record": "DEC-1560 · rule 7 · rule 8c",
  "State": "In the code since 2026-10-04"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: phone 15, v02 approved 2026-08-27 (‘yes’, DEC-0177), v07 approved 2026-09-02; his ruling G3 of 2026-09-08. His words: “agree — add the $6,000 senior deduction (65+, 2025–2028)”. New: nothing in the app; the drawing’s figure is corrected here. — DRAWING ERROR, phone 15 (the app is right; the phone is not redrawn). ‘…and both of you over 65’ reads $3,884/year , where the phone draws $5,324/year. The phone was drawn before his ruling G3 of 2026-09-08 added the senior deduction, $6,000 for each person 65 or older (tax years 2025 to 2028, under $150,000 of income on a joint return). By hand, $84,000 filing jointly, both 65 or older: $84,000 − $32,200 standard deduction − 2 × $1,650 for age − 2 × $6,000 senior deduction = $36,500 taxed; 10% × $24,800 + 12% × $11,700 = $2,480 + $1,404 = $3,884 . The drawn $5,324 leaves the $12,000 out: $84,000 − $35,500 = $48,500 taxed, $2,480 + 12% × $23,700 = $5,324. The other two rows stand as drawn: single $9,650, jointly $5,720. Line added 2026-10-27.",
  "His words, or where it came from": "His ruling G3 (2026-09-08): “agree — add the $6,000 senior deduction (65+, 2025–2028)”; his DEC-4529: “leave the drawing, add line detailing correction.”",
  "Record": "G3 · DEC-4529 · MK-CF-F-187 seniorDeductionFor · MK-CF-F-101 taxOwedFor",
  "State": "In the code since 2026-09-08"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: phones 2 to 6, v02 approved 2026-08-27 (‘yes’, DEC-0177), v07 approved 2026-09-02. His words: none on this. New: nothing in the app; which of the three drawn forms is the design. — Your base pay, a closed section’s line (phones 2, 4, 5 and 6 draw it three ways; the phones are not redrawn). Phone 2’s form is the design on every phone: ‘Monthly · the same each month · take-home $5,000’ and ‘Fortnightly · varies · take-home $3,300/month’ — a take-home is a month, so it says /month when the pay is not monthly. Phones 4 and 6 write ‘the same’; phone 5 writes ‘take-home $3,300’. A closed section whose three figures are entered and agree carries ✓ on every phone — phone 4 too, which draws none beside You or Sam. Nothing in the app changes. Line added 2026-10-27.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-27 (REC2-05), made without asking him, under tenet 4 (DEC-3523: one thing, one form) and canon row 15 (a monthly figure says /month). One word from him reverses it. To reverse: print phone 4’s shorter form.",
  "Record": "DEC-3523 (tenet 4) · canon row 15 · MK-CF-O-001",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: no drawing of these two steps (the design record: no drawing traced for sign-up’s steps). His words: none; the lead’s DEC-7951 of 2026-10-24 stands. New: the question’s line, one line under a dated bill, and the budget step’s figures. — Sign-up (not drawn on this page): ‘What are your average monthly expenses?’ and Your budget — a bill that comes once a year is counted once. The question’s line reads: ‘Roughly what leaves your account each month, a yearly bill counted as a twelfth ($1,200/year is $100/month). A bill you give its own month in your budget is counted in that month instead — leave it out of this figure.’ (it read ‘Roughly what leaves your account each month.’). In Your budget, a yearly bill given its months says so under them: ‘Counted in Dec — leave it out of the monthly expenses you entered earlier.’; and the budget’s figures add the bill in its month, on top of the monthly figure typed, as every Cash flow month and the sign-up recap read it (MK-CF-F-002). Worked by hand: $2,000 a month typed, a $1,200 car insurance bill given December, take-home $4,000. Eleven months are $2,000 and December $3,200; the year is 11 × $2,000 + $3,200 = $25,200, which is $2,100 a month. Your budget read Uncategorized $1,900 and Surplus $2,000 — the bill taken to be inside the $2,000 — while the recap read Expenses $2,100: two figures for one budget. It now reads Uncategorized $2,000 , the bill $100 a month on top, Surplus $1,900 ($4,000 − $2,100), the recap’s figure. Someone who had put the bill in their $2,000 as $100 and also given it December was counted $2,200 a month, $100 too much; the line now tells them to leave it out. A yearly bill given no month stays a twelfth inside the figure typed, as before. Line added 2026-10-27, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the workplan row #322 (found by CF-FIX, 2026-10-24), made without asking him, under the lead’s DEC-7951 (a dated bill is on top of the typed monthly figure, in its month), his DEC-0002 and DEC-0447 (a bill that comes once lands in its own month), and tenets 1 and 4 (DEC-3523). One word from him reverses it. To reverse: print the earlier line, and read the bill as inside the figure typed in Your budget alone.",
  "Record": "DEC-7951 · DEC-0002 · DEC-0447 · DEC-3523 (tenets 1, 4) · MK-CF-F-002 plannedMonthlySpend · MK-CF-F-003 categoryMonthly · workplan #322",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: no drawing of these steps; his Q49 of 2026-09-09. His words: percents to two decimals (Q49). New: eight shares print with two decimals. — Sign-up (not drawn on this page): every share printed as a percent reads to two decimals , as the rate in force already does (the row of 2026-10-26). The worked example of the row above ($2,000 a month typed, a $1,200 bill given December, take-home $4,000, $60,000 gross): What are your average monthly expenses?: ‘That’s 50.00% of your monthly income’ and ‘You keep 50.00% to save & invest — healthy.’ ($2,000 of $4,000). Your budget: ‘52.50% of your take-home is spoken for’ ($2,100 ÷ $4,000; it read 53%). How much can you save?: ‘≈ $1,900/month average · 47.50% of take-home’ ($1,900 ÷ $4,000; it read 48%). The full recap: ‘Tax · ~20.00% of gross’ ($12,000 of $60,000), ‘Expenses · 42.00% of gross’ ($25,200), ‘~20.00% goes to tax.’, its legend, and its ring ‘38.00% to savings’ ($22,800 ÷ $60,000). Where you plan to retire: ‘Canada: about 15.00% cheaper than the US average’ (a factor of 0.85; it read 15%). The tax bracket (12%, 22%) is a published rate and stays whole. The figures do not change; each is rounded once, where it is printed. Line added 2026-10-27, after the code (the same day).",
  "His words, or where it came from": "Not a decision of his: the lead’s, made without asking him, on FX-CF-B’s reading of sign-up for the Cash flow drawing check of 2026-10-27 (the class CF2-11 names on the budget editor). His Q49: percents to two decimals, rounded once, when printed; one figure, one way (tenet 4). One word from him reverses it. To reverse: print sign-up’s shares whole again.",
  "Record": "Q49 · DEC-3523 (tenet 4) · src/onboarding/modules.tsx",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: none of these sign-up cards is drawn (the design record: no drawing traced for sign-up’s steps); Something else’s editor opens from Your income (phone 12, v02 approved 2026-08-27 (‘yes’, DEC-0177), v07 approved 2026-09-02). His words (2026-10-27, DEC-8839): “the standard design says box titles in dark green bar, and sub-titles in light green bar”. New: in sign-up and on Your income, each box title written in grey capitals is a dark-green bar, edge to edge with square corners: WHERE IT COMES FROM (the income recap), MONTHLY PLAN (How much can you save?), HOW ‘NEEDED’ IS CALCULATED (the retirement recap), HOW MUCH WILL YOU INVEST PER YEAR?, CRITICAL · MUST-PAY, IMPORTANT · NEEDED and NICE-TO-HAVE · WANTS (Your budget — the coloured dot before each goes; the legend above the bar still names each colour), and ONE-TIME PAYMENTS YOU RECORDED (Something else, opened from Your income). The sub-title WHAT’S TAKEN OUT, inside the income recap’s card, is a light-green bar. Those cards lose their rounded corners, as every banded card does (DEC-0079). No word and no figure changes. Line added 2026-10-27, before the code.",
  "His words, or where it came from": "His DEC-8839 (2026-10-27), said of Contribution room and the Stress test; made app-wide by the lead’s ruling R1 of the same day, without asking him. One word from him reverses it. To reverse: grey capitals again in sign-up.",
  "Record": "DEC-8839 · R1 · DEC-0079 · src/__tests__/guard_box_titles_on_bars.test.ts",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-30",
  "What changed, against the phones below": "Approved before: this drawing, v07 on 2026-09-02 (DEC-0177 lineage); sign-up’s ‘Save & come back later’ is described on the row of 2026-10-25, not drawn. His feedback: His words, 2026-08-04 (DEC-0059): “make sure font size and color and overall design are same across all screens.” New: Saving before an account exists says ‘Progress saved’ and ‘We’ll pick up right here next time you open the app.’ with ’; it had a straight '. No word and no figure moves. The phones are not redrawn.",
  "His words, or where it came from": "One sentence, spelled one way (tenet 4, DEC-3523): the lead’s rule of 2026-10-25 (DEC-8336), carried to every screen on 2026-10-27 and held by src/__tests__/curly_apostrophe_everywhere.test.ts, which now carries no debt for the sign-up screen. Not a decision of his: the lead’s ruling of 2026-10-30, made without asking him, as his order of 2026-09-30 says; built by CLEANUP-TESTS. One word from him reverses it. To reverse: type a straight ' in these strings again.",
  "Record": "DEC-8336 · DEC-3523 · DEC-0059 · DEC-0177",
  "State": "In the code since 2026-10-30"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: no drawing of this step (the design record: no drawing traced for sign-up’s steps); what the rate means is this drawing’s, phone 3 (v02 approved 2026-08-27 (‘yes’, DEC-0177), v07 approved 2026-09-02): ‘Everything that comes out, as a share of your gross’. His words: none on this line. New: two words on sign-up’s income recap, and a correction to the row of 2026-10-26 above. — Sign-up’s ‘Your income’ recap, the tax line, and a correction to the row of 2026-10-26 (‘The rate in force … prints to two decimals’). That row wrote the line as ‘Tax (~7.41% on taxable income)’ for Pat; but $4,444 ÷ $60,000 = 7.41% is a share of his gross , while what he is taxed on is $55,200, on which the same $4,444 would be 8.05%. The line reads ‘Tax (~7.41% of your gross)’ — the meaning this drawing gives the rate, and the full recap’s own words, ‘Tax · ~20.00% of gross’. The figures do not change. Line added 2026-10-31, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-31 (SU3-01, REC3-03), made without asking him, under the lead’s ruling R14 and tenet 1 (DEC-3523: an untrue sentence beside a figure). One word from him reverses it. To reverse: print ‘on taxable income’ and work the rate on the $55,200 (8.05%).",
  "Record": "DEC-3523 (tenet 1) · R14 · MK-CF-M-081 · MK-CF-M-044 · src/onboarding/modules.tsx (IncomeRecap)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: no drawing of this step (the design record: no drawing traced for sign-up’s steps). His words: none on this line. New: the line under ‘Saving about $X this year’ names only what was entered. — Sign-up, How much can you save? The line said ‘Set more aside in Jan & Feb — your equity & bonus months.’ for the household of the row of 2026-10-27 above, who entered no bonus and no stock: January and February stood out only beside December, the month of the $1,200 bill ($2,000 a month left, $800 in December). Now the line names a month only for a bonus or stock sold when it vests that the person entered: a $12,000 bonus paid in December reads ‘Set more aside in Dec — your bonus month.’; with neither entered it reads ‘About $1,900/month on average.’ (11 × $2,000 + $800 = $22,800 ÷ 12). Line added 2026-10-31, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-31 (SU3-03), made without asking him, under the lead’s ruling R15 (a tip names only what the person entered) and tenet 1. One word from him reverses it. To reverse: name the two months that stand out above the lowest, whatever caused them.",
  "Record": "DEC-3523 (tenet 1) · R15 · MK-CF-F-011 savingsByMonth · src/onboarding/modules.tsx (SavingsEditor)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: phones 5, 6 and 11, v02 approved 2026-08-27 (‘yes’, DEC-0177), v07 approved 2026-09-02. His words on a cash account’s rate: “Return on cash - use 2 decimals” (DEC-0221, 2026-09-14); his Q49 of 2026-09-09, percents to two decimals. New: three shares printed whole now read to two decimals. — Percents to two decimals, worked once. Your base pay, an open section (phones 5 and 6): ‘17.14% of your gross’ — $1,200 ÷ $7,000 — where phone 5 draws ‘17%’, and each person’s section the same way; the share is worked by Base pay’s own function, not on the screen. Interest & dividends (phone 11): ‘3.80% on $18,400’ and ‘4.20% on $30,000’, where the phone draws ‘3.8%’ and ‘4.2%’, beside a CD’s ‘5.05%’; the figures stay $699 and $1,260; wherever the app writes an account’s or a bond’s rate beside what it is paid on, the same: ‘4.50% coupon on $25,000 face’, and the Tax organizer’s ‘calculated from your accounts — 4.00% on $10,000’ (the rows of 2026-10-24 and 2026-10-25 above write ‘4.5%’ and ‘4%’). Sign-up’s retirement expenses: ‘80.00% of what you spend today’ ($1,600 of $2,000; it read 80%). The phones are not redrawn. Line added 2026-10-31, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-31 (IN3-01, IN3-04), made without asking him, under his Q49 and DEC-0221, and tenet 4 (one figure, one form). One word from him reverses it. To reverse: print these shares whole again.",
  "Record": "Q49 · DEC-0221 · DEC-3523 (tenet 4) · MK-CF-O-001 basePay · MK-CF-F-184 incomeFromAccounts",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: no drawing of this step (the design record: no drawing traced for sign-up’s steps); the row of 2026-10-27 above put seven of sign-up’s box titles on bars. His words (2026-10-27, DEC-8839): “the standard design says box titles in dark green bar, and sub-titles in light green bar”. New: nine more box titles, and the first step’s group names as sub-titles. — Sign-up, the rest of its box titles on dark-green bars , edge to edge, square: ‘Surplus by month’ (How much can you save?, and the investing step), ‘Monthly cash flow’ (the income recap), ‘Each month: tax · expenses · savings’ (the full recap), ‘Vesting schedule’ and ‘Annual vesting cash flow’ (stock), and ‘From your accounts’ on sign-up’s Interest & dividends step — the dark bar phone 11 draws over the same words; and on the last step, ‘What’s active — tap to open’ and ‘Unlock next — whenever you’re ready’, each the bar of one square card, the modules to unlock as its rows, where they were grey capitals over a stack of rounded cards. On the first step, ‘What brings you to MoneyKeel?’, each group’s name (‘Manage money now’, ‘Plan ahead’ and the rest) is a light-green bar, edge to edge of the phone, where it was grey capitals. The two pop-ups keep their own titles (‘Vesting month’, ‘Guaranteed retirement income’). No word and no figure changes. Line added 2026-10-31, before the code.",
  "His words, or where it came from": "His DEC-8839, made app-wide by the lead’s ruling R1 of 2026-10-27; this pass by the lead on the Cash flow drawing check of 2026-10-31 (SU3-04), made without asking him. One word from him reverses it. To reverse: the bold black titles again.",
  "Record": "DEC-8839 · R1 · DEC-0079 · src/__tests__/guard_box_titles_on_bars.test.ts (now reads what opens every sign-up card)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: no drawing of this step (the design record: no drawing traced for sign-up’s steps); this drawing’s row of 2026-10-25 (‘An empty box shows what an empty box counts’). His words: none on this box. New: one box opens empty. — Sign-up, Benefits, Unemployment chosen beside another kind (the row of 2026-10-25 above): ‘How much of that is unemployment, per month?’ opens empty . It showed a grey ‘$0’ while the line under it said ‘Not entered yet — until it is, all $1,300/month is counted as taxed.’ — an empty box counts all of it, so ‘$0’ was the one answer it does not mean. Line added 2026-10-31, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-31 (SU3-05), made without asking him, under the lead’s ruling R16 (a box nobody filled opens empty) and his DEC-0296 (an unknown input produces no number). One word from him reverses it. To reverse: show the grey ‘$0’ again.",
  "Record": "DEC-0296 · R16 · DEC-3523 (tenet 3) · src/onboarding/modules.tsx (income_benefits)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: no drawing of this step (the design record: no drawing traced for sign-up’s steps); cash-flow v01’s row of 2026-10-27 (the $ printed once). His words: none on these boxes. New: the budget step’s boxes. — Sign-up, Your budget, each category’s box beside its $ / % switch: an empty box opens empty, and a typed one reads ‘1,200’ with its thousands mark beside the ‘$’ switch — the unit printed once, as every money box with a $ / % switch in the app does. It read ‘$0’ then ‘$’ when empty, and ‘1200’ then ‘$’. A % box reads ‘40’ beside ‘%’. The stored amounts do not change. Line added 2026-10-31, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the Cash flow drawing check of 2026-10-31 (SU3-06), made without asking him, under tenet 4 (one figure, one form) and the lead’s ruling R16. One word from him reverses it. To reverse: print ‘$0’ in an empty box and plain digits in a typed one.",
  "Record": "DEC-3523 (tenet 4) · R16 · DEC-8385 · src/components/MoneyBox.tsx (unitBeside)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: this drawing, phones 2 to 6: the ‘Your 401(k)s’ row and the card’s own sum print a whole amount whole (‘$1,200’). His words: none on this row. New: nothing on this screen changes, and no drawn figure moves. — Contribution room now prints a monthly amount typed with cents to the cent (‘At $3,333.33/month’, contribution-room v02, row 7), so its year adds up. This card keeps the same amount to the dollar (‘$3,333/month’), because its own sentence, gross − tax − 401(k)s = take-home, adds up to the dollar. An amount typed whole reads the same on both screens. Line added 2026-10-31.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R13 of 2026-10-31 (CR3-01), applied by FX-CF-C without asking him. Tenet 2 (rows add up) outranks tenet 4 (one figure, one form), so the difference stays only for an amount typed with cents. One word from him reverses it. To reverse: cents on this card too, with every row of its sum to the cent.",
  "Record": "DEC-3523 (tenets 2 and 4) · MK-CF-M-034 · MK-MN-M-032 · CR3-01",
  "State": "In the code (no change on this screen)"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: this drawing, approved 2026-09-02. Phones 2 to 4 draw a note under the card — ‘Both figures are what you entered — nothing here is calculated.’, the card’s own sum, and the two take-homes — in a box whose colours the drawing names nowhere (var(--surf2), var(--ok)), so the note draws as plain text. His feedback: His words, 2026-10-11 (DEC-4529): “leave the drawing, add line detailing correction.” New: DRAWING ERROR, phones 2 to 4 — the note sits on the app’s light grey #F6F7F5 with a 3-point green rule, #178F6B, down its left side; its words are 13 points in #1A1A18, as the app draws it. No word or figure moves. The phones are not redrawn. Line added 2026-11-01.",
  "His words, or where it came from": "A drawing error gets a dated line, not a silent redraw (DEC-4529). Found by the drawing match round 3 (REC3-02). Not a decision of his: the lead’s correction, made without asking him, as his order of 2026-09-30 says. To reverse: delete this line.",
  "Record": "DEC-4529 · REC3-02",
  "State": "In the code (the app already draws it so)"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: this drawing, approved 2026-09-02. Phone 9 draws a grey ‘$0’ in the ‘Stock that vests, a year’ box, which is left blank. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”; 2026-10-31 (DEC-9228): “I will review the screens in testflight”. New: DRAWING CORRECTION, phone 9: the stock box left blank is empty — no grey ‘$0’ in it; ‘Leave blank if you have none.’ above it stays. Nothing else moves. The phone is not redrawn.",
  "His words, or where it came from": "Empty means empty (the lead’s ruling R16 of 2026-10-31, under DEC-0296 and tenet 3, DEC-3523: unknown is not zero): a box nobody filled shows no figure that could be read as an entry. Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says. To reverse: the grey ‘$0’ in the empty box again. Row written after the code (the box was emptied 2026-11-01 in the R16 sweep).",
  "Record": "DEC-0296 · DEC-3523 · DEC-9228 · R16",
  "State": "In the code since 2026-11-01"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: this drawing, approved 2026-09-02. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”; 2026-10-31 (DEC-9228): “I will review the screens in testflight”. New: STATES NOT DRAWN AS WRITTEN HERE, the sign-up steps and Your base pay: every money box nobody filled opens empty — the grey ‘$0’ in the sign-up’s money boxes, ‘$0’ in ‘Into your 401(k) each month’, ‘0’ and ‘50’ in the number boxes, ‘$0 /year’ in the yearly box, ‘100’ and ‘$0’ in the stock-grant rows, and the examples ‘24’ (the tax share), ‘65’ (target age), ‘90’ (to age) and ‘6.5’ (a debt’s rate) are gone. Kept: the word examples (‘e.g. 80’, ‘YYYY-MM’, ‘Name’), the month table’s greyed typical month (phone 6: the figure the app counts, as drawn), the tax box’s calculated rate (‘Leave it blank to use the calculated rate’) and the savings months’ suggested figures (under ‘Use suggested’). Nothing else moves. The phones are not redrawn.",
  "His words, or where it came from": "Empty means empty (the lead’s ruling R16 of 2026-10-31, under DEC-0296 and tenet 3, DEC-3523: unknown is not zero): a box nobody filled shows no figure that could be read as an entry. Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says. To reverse: the grey examples in the empty boxes again. Row written before the code.",
  "Record": "DEC-0296 · DEC-3523 · DEC-9228 · R16",
  "State": "In the code since 2026-11-01"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Your base pay, phones 2 to 8, v02 approved 2026-08-27 (‘yes’, DEC-0177), v07 approved 2026-09-02; the row of 2026-10-26 above (‘Hours a week not entered’). His words: none on this state; his DEC-0296 (2026-08-20) is the rule: an unknown input gives no number and a reason. New: one refusal, for a pay frequency the app does not know. — Your base pay, a pay frequency the app does not recognise (not drawn: a profile saved with a frequency outside the five, such as ‘annual’ or ‘fortnightly’ from an older screen). The app reads one table of pay periods a year — hourly 2,080 (40 hours × 52, the table’s own; an hourly wage is still worked on the hours a week entered), weekly 52, biweekly 26, monthly 12, annually 1. A frequency outside it gives no figure : the section and the household card read ‘Pay frequency not recognised — open Base pay to choose one.’ in the warning box, the closed line reads ‘Pay frequency not recognised’, the band carries no total, the Income summary names it under what is not counted, and Your income ends the job’s line ‘· pay frequency not recognised’. It was read as a month: $100,000 saved as ‘annual’ read $1,200,000 a year ($100,000 × 12). Choosing one of the four drawn choices brings the figures back. A profile with no frequency saved is the Monthly the screen shows chosen, as before. Line added 2026-11-01, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R23 of 2026-11-01 (one pay-frequency table; never a guess), made without asking him, under his DEC-0296 and tenets 2 and 3 (DEC-3523). One word from him reverses it. To reverse: read an unknown frequency as a month again.",
  "Record": "DEC-0296 · DEC-3523 (tenets 2, 3) · R23 · src/domain/income/pay-frequency.ts · MK-CF-O-001 basePay",
  "State": "In the code"
 }
]
```

Its phones that hold the screens in this part (2, 3, 4, 8, 9, 10, 11, 12, 16, 17), every line in order, as the match tests read them. Phones 1, 5, 6, 7, 13, 14, 15 draw other screens and are left out.

```json
{
 "phone 2": [
  "‹ Income",
  "Your base pay",
  "Bonus, stocks and other income are captured separately",
  "Who earns a wage?",
  "Just me",
  "Just Sam",
  "Both of us",
  "Each person’s pay",
  "$138,000/year",
  "You",
  "✓",
  "Monthly · the same each month · take-home $5,000",
  "Edit ⌄",
  "Sam",
  "✓",
  "Fortnightly · varies · take-home $3,300/month",
  "Edit ⌄",
  "Your household",
  "$8,300/month",
  "Gross /year",
  "both wages",
  "$138,000",
  "Federal tax bracket",
  "on both wages, filing jointly",
  "22%",
  "Everything else taken out",
  "what you entered",
  "$4,700/month · 24%",
  "= Take-home",
  "$8,300/month",
  "Both figures are what you entered — nothing here is calculated.",
  "Filing jointly, the band comes from what you earn together. On your pay alone we would have read 12% and shown about",
  "$168/month more",
  "than your real take-home. The 24% is your own figures — tax, Social Security, Medicare, everything.",
  "Save",
  "Closed, each person is one line. The household total is visible without opening anything, and says which band it used and why.",
  "2a-ii · nobody entered a take-home"
 ],
 "phone 3": [
  "‹ Income",
  "Your base pay",
  "Bonus, stocks and other income are captured separately",
  "Your household",
  "≈$9,242/month",
  "Gross /year",
  "both wages",
  "$138,000",
  "Federal tax bracket",
  "assumed filing jointly — both of you earn",
  "22%",
  "Calculated federal tax",
  "assumes you take the standard deduction",
  "≈$1,058/month",
  "Your 401(k)s",
  "$1,200/month",
  "= Take-home",
  "≈$9,242/month",
  "$11,500 gross − $1,058 tax − $1,200 of 401(k)s = $9,242. The rows on this card always add up — a card whose own rows disagree is a wrong number wearing a layout.",
  "The take-home above is higher than it will really be, by roughly $880/month.",
  "Only federal income tax is taken out here. Social Security takes 6.2% of a wage up to $184,500/year and Medicare 1.45% of all of it (0.9% more above $200,000), and your state may take more. If you itemise rather than take the standard deduction, your bill is different again.",
  "The tax rate you want us to use",
  "Everything that comes out, as a share of your gross — from a payslip, add up every deduction except your 401(k) and divide by the gross. Leave it blank to use the calculated rate.",
  "24",
  "We'll use",
  "24%",
  "everywhere your take-home matters — cash flow, budget, the surplus. One-time events like a Roth conversion still use the tax tables.",
  "= Take-home",
  "$8,740/month",
  "Save",
  "The bracket is named, the estimate says what it assumed, and the rate is changed where it is shown.",
  "The words &lsquo;effective tax rate' appear nowhere: TurboTax divides by adjusted gross income, the textbook divides by taxable income, others divide by total income — three products, three answers for one return. A payslip figure is what a person can actually check, so that is what we ask for.",
  "2a-iii · one entered, one calculated"
 ],
 "phone 4": [
  "‹ Income",
  "Your base pay",
  "Bonus, stocks and other income are captured separately",
  "Each person’s pay",
  "$138,000/year",
  "You",
  "Monthly · the same · take-home $5,000",
  "Edit ⌄",
  "Sam",
  "Monthly · the same · take-home ≈$3,686 (calculated)",
  "Edit ⌄",
  "Your household",
  "≈$8,686/month",
  "Gross /year",
  "both wages",
  "$138,000",
  "Federal tax bracket",
  "assumed filing jointly — both of you earn",
  "22%",
  "= Take-home",
  "≈$8,686/month",
  "Your take-home:",
  "$5,000",
  "(you entered)",
  "Sam’s take-home:",
  "≈$3,686",
  "(calculated — gross less federal tax and 401(k))",
  "Save",
  "Entered and estimated are never blended silently.",
  "A labelled fact per person, not a paragraph — each line says WHAT the figure is (take-home), WHOSE it is, and whether it was entered or calculated. [Founder wording, 2026-09-02] No tax row appears here — your tax is already inside your $5,000, so a single tax line for the household would be a number that explains nothing. [Founder 2026-09-02]",
  "2b · your section open"
 ],
 "phone 8": [
  "Your base pay",
  "Bonus, stocks and other income come next",
  "Who earns a wage?",
  "Just me",
  "Just Sam",
  "Both of us",
  "Your pay",
  "You",
  "Tell us how you are paid",
  "Done ⌃",
  "How often you are paid",
  "Hourly",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Is your pay the same every month?",
  "The same",
  "It varies",
  "Gross pay each month",
  "Before anything comes out. The only one we need.",
  "$7,000",
  "Into your 401(k) each month",
  "Leave blank if you don’t contribute.",
  "$0",
  "Your take-home each month",
  "Leave blank and we’ll calculate it.",
  "optional",
  "Nothing is taken out for a 401(k)",
  ", because you have not entered one. We’ll calculate ≈$6,196/month, using your tax band read on the",
  "$84,000 you have entered so far",
  "— add rent, a bonus or a spouse’s wage later and the band is calculated again, so this figure moves. It knows nothing about your state or your insurance, so the ≈$6,196 is higher than it will really be.",
  "Continue",
  "Same screen, same component, two frames.",
  "Onboarding shows a progress bar and Continue; reached from Cash flow it shows a back arrow and Save. The questions are identical because there is only one of them.",
  "[folded in from base-pay-v7, 2026-08-27]",
  "3",
  "Bonus, equity, and the other sources",
  "Each appears only if it was picked. Same accordion, same rule: a lump counts in the month it is paid, never spread across the year — that is what makes a cash-flow month real.",
  "3a · bonus and equity"
 ],
 "phone 9": [
  "‹ Income",
  "Bonus and stock",
  "Paid on top of base pay",
  "Who gets a bonus?",
  "Just me",
  "Just Sam",
  "Both of us",
  "Your bonus",
  "$12,000/year",
  "How much, a year",
  "Before tax. A typical year if it varies.",
  "$12,000",
  "Which month is it paid?",
  "It counts in that month, not spread across the year.",
  "Mar",
  "Jun",
  "Sep",
  "Dec",
  "Stock that vests, a year",
  "Leave blank if you have none.",
  "$0",
  "December will look different",
  "Inflow (income (take-home) + rent)",
  "$9,500",
  "December",
  "bonus, after tax",
  "$18,860",
  "Cash flow will show that spike where it happens. Spreading it across twelve months would make every month wrong to make one look tidy.",
  "Save",
  "A bonus belongs to a person, so it follows the same just-me / just-Sam / both pattern as base pay. The month matters more than the amount. A December bonus in a January plan is a wrong number in both months.",
  "3b · rent from a property"
 ],
 "phone 10": [
  "‹ Income",
  "Rent from a property",
  "What you keep, after what it costs to run",
  "The property",
  "$1,200/month net",
  "Rent you receive each month",
  "$1,800",
  "What it costs to run each month",
  "Mortgage interest, tax, insurance, repairs, management.",
  "$600",
  "= You keep",
  "$1,200/month",
  "$14,400/year. This is the figure every other screen uses — the rent alone would overstate what reaches you by half.",
  "Add another property",
  "Two figures, not one. Rent received is not income; what is left after running the place is.",
  "3c · interest and dividends"
 ],
 "phone 11": [
  "‹ Income",
  "Interest & dividends",
  "What your savings and investments pay you",
  "From your accounts",
  "$3,000/year",
  "Chase savings",
  "3.8% on $18,400",
  "$699",
  "Treasury bonds",
  "4.2% on $30,000",
  "$1,260",
  "VTI and holdings",
  "1.3% dividend yield",
  "$1,041",
  "= We work out",
  "$3,000/year",
  "Change it if that is not right",
  "We only see the accounts you entered.",
  "use $3,000",
  "This does not reach your bank",
  "Interest and dividends are counted as income you are taxed on, not money you can spend.",
  "They are normally reinvested where they are earned, so they never land in your bank account. If you actually take them as cash, tell us and we will count them.",
  "Reinvested",
  "Paid to my bank",
  "Save",
  "Two corrections here.",
  "The app holds the accounts, so it can work this out rather than ask — a typed figure invites a second, different answer to the same question. And it is",
  "taxable but not spendable",
  ": today it flows into take-home, which makes every surplus $250 a month too generous. That is finding B34.",
  "3d · the ones not picked"
 ],
 "phone 12": [
  "‹ Income",
  "Your income",
  "Add anything that changes",
  "You entered about",
  "3 sources",
  "A job",
  "✓",
  "You and Sam · take-home $8,300/month",
  "Edit ⌄",
  "Rent",
  "✓",
  "One property · $1,200/month net",
  "Edit ⌄",
  "Interest & dividends",
  "✓",
  "$3,000/year · reinvested",
  "Edit ⌄",
  "Anything else?",
  "🧰",
  "Self-employed / side gig",
  "📨",
  "Retirement income",
  "🛟",
  "Benefits",
  "👪",
  "Child support or alimony",
  "🎓",
  "Scholarships, grants, stipend",
  "🏦",
  "Student loans",
  "🧾",
  "Something else",
  "Done",
  "The seven not picked are here, one tap away, rather than hidden behind the picker they said no to. Life changes; the screen should not have to be re-run to say so.",
  "4",
  "How do you file your taxes?",
  "Never asked, in the whole app.",
  "The code reads a filing status, finds nothing, and falls back to",
  "single",
  "— for everyone, including the couple who just said they have a spouse. Five surfaces use it: every month’s withholding rate, the effective rate, the Roth conversion, the retirement tax rate, and the base-pay estimate.",
  "4a · they said ‘just me’"
 ],
 "phone 16": [
  "Your income",
  "Everything coming in, and what reaches your bank",
  "Take-home each month",
  "$9,500",
  "Your pay",
  "after tax and 401(k)",
  "$5,000",
  "Sam’s pay",
  "after tax and 401(k)",
  "$3,300",
  "Rent",
  "after running costs",
  "$1,200",
  "= Inflow (income (take-home) + rent)",
  "$9,500",
  "December",
  "with the bonus",
  "$18,860",
  "Your",
  "$250/month",
  "of interest and dividends is not here — it is reinvested where it is earned and never reaches your bank. It is taxed, so it appears below.",
  "What it is taxed on",
  "$167,400",
  "Your gross",
  "$84,000",
  "Sam’s gross",
  "$54,000",
  "Rent, net",
  "$14,400",
  "Interest & dividends",
  "$3,000",
  "Bonus",
  "$12,000",
  "= Gross /year",
  "$167,400",
  "Federal tax bracket",
  "filing jointly, every source counted",
  "22%",
  "Tax",
  "your rate, 24% (edit on Your base pay screen)",
  "$40,176/year",
  "Married filing jointly, every source counted. Your 24%, used on every figure built from your take-home. Without it we show the calculated rate — federal income tax only, assuming the standard deduction.",
  "Edit your income",
  "Two totals, never one.",
  "Take-home is what you can spend; what it is taxed on is a different number and is labelled as one. Mixing them is how a take-home figure comes to include a bonus nobody has been paid yet.",
  "A recap shows, it does not ask.",
  "The tax rate is set in one place — Your base pay — and every other screen reads it and says whose it is. Asking twice is how two screens come to hold two answers. [Founder 2026-08-28]",
  "5b · a fresh account"
 ],
 "phone 17": [
  "Your income",
  "Everything coming in, and what reaches your bank",
  "Take-home each month",
  "—",
  "Nothing yet. Tell us where your money comes from and this fills in — it is what every other screen measures against.",
  "Add your income",
  "What it is taxed on",
  "—",
  "We will calculate this once you enter a wage.",
  "Both sections keep their heading when empty, so the shape of the screen never changes — only what is in it. Neither shows $0 as though it were an answer.",
  "The rules underneath",
  "1 ·",
  "One question decides what gets asked.",
  "Ten sources; only the ones picked ever appear, and the seven not picked stay one tap away rather than hidden.",
  "2 ·",
  "One section per thing, opening on its own.",
  "A screen is never longer than the thing being filled in, whether that is one earner or two.",
  "2b ·",
  "One component, two frames.",
  "Onboarding pushes the same screen with a progress bar and Continue; Cash flow → Income opens it with a back arrow and Save. Two copies of the same questions is how they come to be asked two different ways.",
  "3 ·",
  "Each earner has their own pay pattern",
  "— frequency and steady-or-varies — and their month table lives inside their own section.",
  "4 ·",
  "Three figures that must reconcile.",
  "Gross, the 401(k), and the take-home. One figure alone can never be checked; three catch each other, within $5 a month.",
  "5 ·",
  "Nothing is grossed up, and nothing is subtracted that was not entered.",
  "The take-home someone enters IS the take-home; with no 401(k) given, none is deducted.",
  "6 ·",
  "The tax bracket is read from gross, annualised — average month × 12",
  ", never the total of a fourteen-month window, and never from take-home, which also carries medical cover and anything else bought through work.",
  "7 ·",
  "A lump counts in its own month.",
  "A December bonus makes December different; spreading it makes all twelve wrong to make one look tidy.",
  "8 ·",
  "Two totals, never one.",
  "Take-home is not what it is taxed on, and each says which it is. Interest and dividends are the clearest case: taxed, and never spendable unless someone says they take them as cash. [Founder 2026-08-27]",
  "8b ·",
  "Never ask for what can be calculated.",
  "The app holds the accounts, so it shows what they pay and lets the person correct it. Asking invites a second, different answer to the same question with nothing to reconcile them.",
  "8e ·",
  "The card adds up, and every figure says whose it is.",
  "Gross − tax − 401(k)s = take-home, on the card itself, in every state. Entered beats calculated, per person, never blended; a mixed household shows no single tax row, because one number cannot explain a figure that is half theirs and half ours. Assumptions are stated where they act: &lsquo;assumed filing jointly — both of you earn'. [Founder 2026-09-02]",
  "8d ·",
  "Name the bracket, and say what the estimate assumed.",
  "&lsquo;Federal tax bracket' and &lsquo;estimated federal tax — assumes you take the standard deduction'. Never &lsquo;effective tax rate': three products compute it three ways, so it is a number a person cannot check. One rate, typed once, used for every tax figure in the app. [Founder 2026-08-28]",
  "\\n8c ·",
  "A figure is corrected where it is shown.",
  "The tax rate could only be changed on a screen buried in the guided questionnaire; it belongs beside the number it moves. And an estimate says what it leaves out in MONEY, beside itself — never only as a percentage. [Founder 2026-08-28]",
  "9 ·",
  "Nothing is guessed.",
  "Every estimate is prefixed ≈ and says what it cannot see: no state tax, no insurance, one income unless a spouse’s is given."
 ]
}
```

## The match tests — each test that holds one of these screens to a drawing phone, its code and its result at this build

**phone 10 · Rent from a property — two figures, and what is kept** — `src/screens/__tests__/income_manager_matches_v07.test.tsx`, lines 134–145, phones 10: **passed**

```ts
test('phone 10 · Rent from a property — two figures, and what is kept', () => {
  show('rental');
  const want = drawn(10, /^Add another property$/, [
    ['by half.', 'by $600/month.', 'difference 4: $1,800 − $1,200 = $600'],
    ['Mortgage interest, tax, insurance, repairs, management.', 'Tax, insurance, repairs, management.', 'difference 8 (DEC-1859)'],
    ['the rent alone would overstate what reaches you by $600/month. Add another property',
     'the rent alone would overstate what reaches you by $600/month. Which property is it? Add the property in Net worth first Add another property',
     'difference 9 (DEC-1924, DEC-1925, DEC-4059d): the drawn household has no property in Net worth'],
  ]);
  expect(want.split(' ').length).toBeGreaterThan(55);
  expect(firstDifference(want, built())).toBe('');
})
```

**phone 11 · Interest & dividends — calculated from the accounts, taxed, and not spendable** — `src/screens/__tests__/income_manager_matches_v07.test.tsx`, lines 147–159, phones 11: **passed**

```ts
test('phone 11 · Interest & dividends — calculated from the accounts, taxed, and not spendable', () => {
  show('dividends', { ...HOUSE, invAnnual: undefined });                                            // 11
  const want = drawn(11, /^Save$/, [
    ['= We work out', '= We calculate', 'difference 5 (canon)'],
    ['VTI and holdings 1.3% dividend yield', 'VTI and holdings paid out over the trailing twelve months', 'difference 6 (MK-CF-F-184, Q35)'],
    ['never land in your bank account', 'never reach your bank account', 'difference 7 (canon)'],
    ['3.8% on $18,400', '3.80% on $18,400', 'v07 row of 2026-10-31 (IN3-04; Q49, DEC-0221): a rate to two decimals'],
    ['4.2% on $30,000', '4.20% on $30,000', 'v07 row of 2026-10-31 (IN3-04)'],
  ]);
  expect(want.split(' ').length).toBeGreaterThan(95);
  // by hand: 3.8% × $18,400 = $699.20; 4.2% × $30,000 = $1,260; $1,041 paid; $699 + $1,260 + $1,041 = $3,000 on the band and the sum
  expect(firstDifference(want, built())).toBe('');
})
```

**phone 12 · Your income — what is entered, one line each, and the seven not picked one tap away** — `src/screens/__tests__/income_manager_matches_v07.test.tsx`, lines 99–107, phones 12: **passed**

```ts
test('phone 12 · Your income — what is entered, one line each, and the seven not picked one tap away', () => {
  show();
  // the drawing's CSS prints the bar in capitals, the count with it — 'YOU ENTERED ABOUT · 3 SOURCES'; the build writes the count in
  // capitals and leaves the title's capitals to the bar (IN3-05, 2026-10-31)
  const want = drawn(12, /^Done$/, [['3 sources', '3 SOURCES', 'IN3-05: the count in the bar’s capitals']]);
  expect(want.split(' ').length).toBeGreaterThan(55);
  // by hand: $5,000 + $3,300 = $8,300 a month; $1,800 − $600 = $1,200 a month net; $3,000 a year
  expect(firstDifference(want, built())).toBe('');
})
```

**phone 9 · Bonus and stock — who, how much, which month, and what December will look like** — `src/screens/__tests__/income_manager_matches_v07.test.tsx`, lines 120–132, phones 9: **passed**

```ts
test('phone 9 · Bonus and stock — who, how much, which month, and what December will look like', () => {
  show('bonus');
  const want = drawn(9, /^Save$/, [
    ['Mar Jun Sep Dec', 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec', 'difference 3: all twelve months'],
    ['bonus, after tax $18,860', 'bonus, after tax $18,620', 'difference 10: $9,500 + $12,000 × 76% = $18,620'],
    // THE ROW OF 2026-11-01 (R16, FX-PF): the stock box left blank is empty — read only where the drawing carries that row
    ...(R16_V07.test(V07_HTML) ? [['Leave blank if you have none. $0 December', 'Leave blank if you have none. December', 'v07 row of 2026-11-01 (R16): the blank stock box is empty']] as [string, string, string][] : []),
  ]);
  expect(V07_HTML).toMatch(R16_V07);
  expect(want.split(' ').length).toBeGreaterThan(90);
  // the boxes as drawn: "$12,000" typed; the stock box left blank, empty (R16, the row of 2026-11-01)
  expect(firstDifference(want, built())).toBe('');
})
```

**frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed** — `src/screens/__tests__/income_matches_v07.test.tsx`, lines 60–84, phones 16: **passed**

```ts
test('frame 16 · Your income, with data — the take-home, row by row, then what it is taxed on, every figure as printed', () => {
  // the household the drawing draws: two earners who typed their take-homes, rent after its running costs, dividends left
  // where they are earned, a December bonus, and a rate of their own
  const built = show({
    baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
    partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' },
    invAnnual: '3000', bonusAnnual: '12000', bonusMonth: 12, taxMode: 'manual', manualTaxRate: '24',
    incomeSources: ['employment', 'rental', 'investment'], rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'house' }],   // names its property (DEC-4059d, 2026-10-10)
  });
  const want = applyNamed(normPrinted(phone(16, /^Edit your income$/)), [
    ['December with the bonus $18,860', 'December with the bonus $18,620', 'difference 4: $9,500 + $12,000 × 76% = $18,620'],
    ['What it is taxed on $167,400 Your gross', 'What it is taxed on $153,000 Your gross', 'difference 3: the band is $167,400 − $14,400'],
    ['= Gross /year $167,400 Federal tax bracket', '= Gross /year $167,400 Your 401(k)s −$14,400 = What it is taxed on $153,000 Federal tax bracket',
     'difference 3: $800 + $400 = $1,200 a month, $14,400 a year, off the gross'],
    ['Tax your rate, 24% (edit', 'Tax your rate, 24.00% (edit', 'the rate in force to two decimals (MK-CF-M-081; the v07 row of 2026-10-26)'],
    ['every source counted. Your 24%, used', 'every source counted. Your 24.00%, used', 'the same figure, the same way (the v07 row of 2026-10-26)'],
  ]);
  const got = applyNamed(normPrinted(built), [BACK]);
  expect(want.split(' ').length).toBeGreaterThan(90);
  expect(firstDifference(want, got)).toBe('');
  // by hand: $5,000 + $3,300 + ($1,800 − $600) = $9,500; $84,000 + $54,000 + $14,400 + $3,000 + $12,000 = $167,400;
  // 24% × $167,400 = $40,176; $3,000 ÷ 12 = $250 reinvested
  expect(got).toContain('= Inflow (income (take-home) + rent) $9,500');
  expect(got).toContain('Tax your rate, 24.00% (edit on Your base pay screen) $40,176/year');
})
```

**frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door** — `src/screens/__tests__/income_matches_v07.test.tsx`, lines 86–98, phones 17: **passed**

```ts
test('frame 17 · Your income, a fresh account — both sections keep their heading, each with its one line and door', () => {
  const built = show({});
  const want = applyNamed(normPrinted(phone(17, /^We will calculate this once you enter a wage\.$/)), [
    ['Take-home each month — Nothing yet. Tell us where your money comes from and this fills in — it is what every other screen measures against. Add your income',
     'Take-home each month $0 Nothing entered yet. Add your income', 'difference 2 (Q48): $0, the one line and its door'],
    ['What it is taxed on — We will calculate this once you enter a wage.', 'What it is taxed on $0 Nothing entered yet.',
     'differences 2 (Q48) and 5: the $0 and the sentence, and no second door (IN2-12, 2026-10-27)'],
  ]);
  const got = applyNamed(normPrinted(built), [BACK]);
  expect(want.split(' ').length).toBeGreaterThan(20);
  expect(firstDifference(want, got)).toBe('');                                            // the door once on the screen (difference 5)
  expect(got.split('Add your income').length - 1).toBe(1);
})
```

## The decisions these cases name — quoted from the decision log

```json
[
 {
  "id": "DEC-0078",
  "decided": "2026-08-11",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "cut the build",
  "the_log_records": "Build 51 was cut only after his explicit “cut the build” against a presented checklist, with the gates satisfied in order: scope complete at 59 of 59 rows, and the mock-match audits FINISHED rather than running alongside."
 },
 {
  "id": "DEC-0108",
  "decided": "2026-08-11",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Update master PRD document. Go to master list of what",
  "the_log_records": "The master list of what is built now records the day’s work rather than being reconstructed later: 18 built items in five groups, written down the day they were built."
 },
 {
  "id": "DEC-0149",
  "decided": "2026-08-14",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "rename the latest folder that way we know what is single source of truth",
  "the_log_records": "Four folders of design deliveries had accumulated outside the app, all named after net worth because that was the first screen drawn, though they now also held the Performance and Plan work. One named home for them, so the newest delivery can be found."
 },
 {
  "id": "DEC-0152",
  "decided": "2026-08-14",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "s own five words,",
  "the_log_records": "“create a folder called August 14th Design, move the latest files there so there is no confusion, and re-check every file carries the decisions we made.” One named home for the live set, and every file in it re-checked against the decisions rather than assumed to carry them."
 },
 {
  "id": "DEC-0165",
  "decided": "2026-08-14",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "how to avoid this in the next brief?",
  "the_log_records": "“how to avoid this in the next brief?” The honest answer is that more care would not have helped — all three errors were written while reading carefully, and two survived several reviews. So every number in a brief is now either computed by a test or explicitly labelled as his own figure, and a test fails the build when a brief and the calculation disagree."
 },
 {
  "id": "DEC-0166",
  "decided": "2026-08-14",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "not sure what you want me to check here.",
  "the_log_records": "“not sure what you want me to check here.” He was right and the framing was mine: I put three options to him as a product decision when it was a technical correction with one right answer. A correction is not a question."
 },
 {
  "id": "DEC-0178",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0178, confirmed as written: The tax band is produced ONCE, at total income (MK-CF-F-084 taxable annual → MK-CF-F-090 effective rate). The base-pay s",
  "the_log_records": "Your tax band is worked out ONCE, from your total income, and every screen reads that one figure. The base-pay screen does not work out a band of its own — a band is set by everything you are taxed on together, so a screen that sees only your wage would show the wrong one."
 },
 {
  "id": "DEC-0179",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0179, confirmed as written: Interest and dividends are WORKED OUT from the accounts (MK-NW-F-063 interest income annual), shown with the working, an",
  "the_log_records": "Interest and dividends are taxed but are not money you can spend, unless you tell us they reach your bank. Two decisions:\n1. In most accounts they are reinvested where they are earned and never arrive, so they are taken out of your spendable take-home.\n2. The tax on them still comes out, because it is real — so simply deleting them would have been wrong in the other direction."
 },
 {
  "id": "DEC-0181",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "fix it completely. No two functions doing same thing.",
  "the_log_records": "Fifteen calculations were each written in two or more places; now none is. 560 calculations, 560 distinct names. A second copy of a calculation cannot be fixed by fixing the first — which is how the same defect kept coming back."
 },
 {
  "id": "DEC-0182",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "for orchestrator use O instead of F to make it easy to identify.",
  "the_log_records": "The one function a screen calls for its question gets its own kind of identifier, so it can be told apart at a glance from the ordinary calculations underneath it."
 },
 {
  "id": "DEC-0184",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "",
  "the_log_records": "The app carried TWO complete tax engines, both live from the same profile on the same day, and one of them could not read a filing status at all. One is deleted. ZERO numbers moved for a single filer — the two were identical arithmetic there — and it becomes correct for couples the moment the filing-status question lands."
 },
 {
  "id": "DEC-0187",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "",
  "the_log_records": "Months are keyed by their actual date rather than by position — “2026-07”, not “slot 7 of twelve”. The twelve-slot version wrote January into the wrong year whenever the twelve months crossed a New Year."
 },
 {
  "id": "DEC-0188",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Who earns this income? You / Partner / Both",
  "the_log_records": "A spouse’s wage becomes its own block, using the SAME field names as your own, and the household total sums every earner. A household on $84,000 plus $54,000 had been read as $84,000 — one person’s income against two people’s spending."
 },
 {
  "id": "DEC-0189",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "",
  "the_log_records": "Every “today” in the app is the person’s OWN calendar day, not the day in universal time. Converting local midnight to universal time moves the date back a day anywhere east of Greenwich — which made every look-back answer “nothing” on a device set to India time."
 },
 {
  "id": "DEC-0191",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "your tax band, on everything you are taxed on",
  "the_log_records": "Your tax band is named as being on EVERYTHING you are taxed on — not just your wage. The band reads every source, so rent and dividends count toward which band you are in."
 },
 {
  "id": "DEC-0194",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "effective tax rate % from last year",
  "the_log_records": "The tax rate is shown where the money is, and can be corrected there. The rate could previously only be changed on a step inside the guided setup — itself unreachable — so the figure driving every take-home in the app could not be put right where you noticed it was wrong."
 },
 {
  "id": "DEC-0195",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Federal tax bracket",
  "the_log_records": "The base-pay card names the federal tax bracket, shows the estimated tax in MONEY rather than as a percentage, and says it assumes the standard deduction. A payslip has dollars on it, not a rate."
 },
 {
  "id": "DEC-0196",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "ll use 24% everywhere your take-home matters — cash flow, budget, what",
  "the_log_records": "“We’ll use 24% everywhere your take-home matters — cash flow, budget, what’s left over. One-offs like a Roth conversion still use the tax tables.” The screen promises only what a payslip figure can answer: a rate off a payslip is an AVERAGE, and four places need the rate on your NEXT dollar."
 },
 {
  "id": "DEC-0197",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in your bank, or OUR estimate — and each one says whose it is on the screen.",
  "the_log_records": "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in your bank, or OUR estimate — and each one says whose it is on the screen."
 },
 {
  "id": "DEC-0207",
  "decided": "2026-09-02",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "s first device pass, two accuracy-class: the card contradicted itself ($21,159 − $4,380 − $1,656 ≠ $16,403 — every estimated earner was granted the FULL joint deduction), and a two-earner household was banded as single (32% vs jointly 24%) because",
  "the_log_records": "The pay card's own rows must add up: your gross pay, minus tax, minus your 401(k) contributions, equals your take-home — to the dollar, with a 401(k) row shown. It came from his first device pass, where the card contradicted itself because each earner was being given the whole married-couple tax allowance separately."
 },
 {
  "id": "DEC-0208",
  "decided": "2026-09-02",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "worked out",
  "the_log_records": "Where one person entered their take-home and the other’s is calculated, the note says so per person — “Your take-home: $5,000 (you entered) · Sam’s take-home: about $3,686 (calculated)”. The prose version was misread: the entered $5,000 was taken for gross."
 },
 {
  "id": "DEC-0209",
  "decided": "2026-09-02",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Always use same words to describe same thing in the app. There is no score for creative writing.",
  "the_log_records": "One word per concept across the income screens: “take-home” replaces “lands in your bank” and “takes home”; “calculated” replaces “worked out”, “Estimated federal tax” and “our estimate”. A test enforces it."
 },
 {
  "id": "DEC-0283",
  "decided": "2026-09-10",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Gross should be before any deductions. For example Income before tax is not same as gross as Income Before Tax = Gross Income - 401K - any other deductions such as medical premium.",
  "the_log_records": "“Gross should be before any deductions. For example Income before tax is not same as gross as Income Before Tax = Gross Income - 401K - any other deductions such as medical premium.” So “Gross” is labelled “before any deductions”, and the earlier wording “before tax” is retired — it meant something different and narrower."
 },
 {
  "id": "DEC-0375",
  "decided": "2026-09-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "No. Base Pay is one component of total income or income summary and not the same. Have your checked underlying function? Are two functions calculating save thing?",
  "the_log_records": "“No. Base Pay is one component of total income or income summary and not the same. Have your checked underlying function? Are two functions calculating save thing?” He rejected the grouping and sent me to check the code — where the nesting turned out to be correct, and my proposal was wrong."
 },
 {
  "id": "DEC-0376",
  "decided": "2026-09-12",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "one card disagreeing with itself: the household take-home row read ~$10,442/month over a take-home line of ~$9,242; corrected to ~$9,242. A total agrees with the lines printed above it, and it is the LINES that are right.",
  "the_log_records": "A total must equal the lines printed above it, and where they disagree it is the LINES that are right. The income card showed a household take-home of about $10,442 a month over a take-home line of about $9,242 — the total was corrected down to the lines."
 },
 {
  "id": "DEC-0387",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "TWO TOTALS, NEVER ONE on the income recap: what lands each month, and what the year is taxed on — each labelled. And a recap SHOWS, it does not ask: the rate is set on Your base pay and every other screen reads it.",
  "the_log_records": "The income screen shows two totals and labels each: what lands in your bank each month, and what the year is taxed on. They are different numbers about the same wages. Mixing them is how a take-home figure comes to include a bonus nobody has been paid yet."
 },
 {
  "id": "DEC-0389",
  "decided": "not dated in the log",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "calculated (your standing order, 2026-09-02)",
  "the_log_records": "“calculated” is the word for a figure the app worked out — his standing order. “worked out”, “Estimated federal tax” and “our estimate” are retired."
 },
 {
  "id": "DEC-0431",
  "decided": "not dated in the log",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Nothing entered yet.",
  "the_log_records": "“Nothing entered yet.” The approved wording for a screen with no data: the layout stays, the figure reads $0, this sentence explains it, and the door to enter something sits beneath."
 },
 {
  "id": "DEC-1859",
  "decided": "2026-10-04",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "#1 - remove langage to include interest on mortgage in maintenance expenses, as that is not standard practice.",
  "the_log_records": "On the Rent from a property screen, the hint under \"What it costs to run each month\" no longer lists mortgage interest. It reads \"Tax, insurance, repairs, management.\" A mortgage on a rented-out property belongs in Debts."
 },
 {
  "id": "DEC-1924",
  "decided": "2026-10-04",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "11 - mortgage should not costs to run. We should ask to add monthly mortgage payment if any mortgage on second property. And automatically add it to debt.",
  "the_log_records": "On Rent from a property, a mortgage is never part of what the property costs to run. The screen asks for the monthly mortgage payment on that property, if there is one, and the app adds that mortgage to Debts by itself."
 },
 {
  "id": "DEC-7608",
  "decided": "2026-10-23",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-3523 (tenet 5) and DEC-0327, made without asking him, as his order of 2026-09-30 says. 5.00% state rate typed on the Tax organizer: the words read \"federal income tax only\"; they now read \"federal income tax, plus the 5.00% state rate you entered\". The Tax organizer's own words say the rate tunes every tax estimate, so the typed rate counts. To reverse: leave the typed state rate out of the calculated rate and say \"federal income tax only\". One word from him reverses it."
 },
 {
  "id": "DEC-7796",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. $60,000 of wages, $4,800 into a 401(k) and $700 a month of benefits that are not taxed: the line read \"On ~$68,400 gross\" replaced by \"On the ~$60,000 it is taxed on\" — the full line now reads that the estimate comes from the IRS schedule after your 401(k) and the standard deduction. It worked over every source, the untaxed ones too, with its own bracket, 22% ($68,400 − $16,100 = $52,300), and about 8%; it now shows Cash flow's 12% ($60,000 − $16,100 = $43,900) and about 7%, beside Cash flow's What it is taxed on, $60,000. With a state rate entered, the line says the rate includes it. To reverse: give the step its own rate and the total of every source again. One word from him reverses it."
 },
 {
  "id": "DEC-7797",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283, DEC-4529 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. His ruling DEC-0283 (2026-09-10): income before tax is gross less the 401(k) and other deductions. The tax was already worked that way while the bracket named the band of the gross. 5 of 5 places now read the income after the 401(k). The Income summary bracket, single, $70,000 of wages and $10,000 into a 401(k): 22% on $53,900 → 12% on $43,900, tax about $5,020 unchanged. Sign-up's Taxes step shows the same 12%. Your base pay, the drawing's own household, $138,000 of wages and $14,400 into 401(k)s, taxed on $91,400: 22% → 12%. The filing-status comparison works its tax after the 401(k), its line naming what was entered less the 401(k). The draw-order sheet's rates are worked after the 401(k). Base pay's 12% is A FIGURE ON HIS APPROVED DRAWING (income-end-to-end v07, phone 2, which draws 22%), applied under tenet 1, which ranks above tenet 6, with the correction line his DEC-4529 asks for on the drawing. For that household the drawn sentence that begins Filing jointly, the band comes from what you earn together no longer prints (both bands are 12%), and the sentence about the 24% stands on its own. What it is taxed on was left as drawn, each gross line, then Gross a year. CORRECTED 2026-10-24: that no longer holds — two rows were added under the gross, Your 401(k)s and What it is taxed on, drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07 under his DEC-0283 (DEC-7887). To reverse: read the bracket off the gross again. One word from him reverses it."
 },
 {
  "id": "DEC-7798",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. A 5.00% state rate entered on the Tax organizer, no rate typed: the line under Calculated federal tax said federal only, that the rate knew nothing about the state, while the calculated rate held the state rate the person entered. It now reads \"Federal income tax, plus the 5.00% state rate you entered — it knows nothing about Social Security or Medicare.\", the words built for the typed-rate case (DEC-7608). With no state rate entered it reads as built, federal only. The figures do not change. To reverse: take the state rate out of the calculated rate, and the line stands as built. One word from him reverses it."
 },
 {
  "id": "DEC-7887",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283 and DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. A couple with $169,200 of wages and $19,200 into 401(k)s: the card printed only the gross, $169,200, while the bracket and a calculated tax were worked on $150,000. It now prints three rows: Gross a year $169,200, Your 401(k)s −$19,200, What it is taxed on $150,000. The drawing's own household (frame 5a): $167,400 − $14,400 = $153,000, bracket 22%. With no 401(k) the 401(k) row reads $0 and the two totals are the same. Two new figures: MK-CF-M-076, the gross a year, and MK-CF-M-077, the year's 401(k)s; MK-CF-M-041, What it is taxed on, is the gross less the 401(k)s. MK-CF-M-044's worked example is now the calculated case, $15,340, the federal tax on $150,000 less the $32,200 standard deduction ($2,480 + $9,120 + 22% × $17,000); it showed the typed 22% case, $37,224 — the code was right and the words were wrong. Sign-up's Taxes step names about $55,200 it is taxed on, the gross less the 401(k) (it named about $60,000, for $60,000 of wages and $4,800 into a 401(k)). The two rows are drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07. To reverse: drop the two rows and print the gross as What it is taxed on again. One word from him reverses it."
 },
 {
  "id": "DEC-7933",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-2748c and DEC-3523 (tenets 3 and 4), made without asking him, as his order of 2026-09-30 says. A $25,000 Treasury at 4.5%, worth $24,200, face value left blank: the account page read \"4.50%/year · $1,089/year\" and a yield on today's value of 4.50%; it now reads \"4.50%/year · face value not entered\" and gives no yield. A bond pays its coupon on its face: $25,000 × 4.5% = $1,125 a year once the face is entered. On Bonds its card names the missing face value, and the summary says \"Average yield leaves out US Treasury 2031 — face value not entered.\" The income sheet counts it at $0 and says why (it counted $1,089), and a bond past its maturity date counts $0 there too, \"matured Jun 30, 2026 — it pays no more interest\" (it counted $400). Tenet 3 outranks the no-face half of DEC-2748c for a dated bond only: a bank CD typed by its balance keeps its rate on that balance ($10,000 at 5.05% = $505), and so does a bond fund with no maturity date, so the income drawing's 4.2% on $30,000 line stands. The four bonds add to $1,630 on all three screens. To reverse: in src/domain/bonds/index.ts remove the maturity condition (keeps the CD and fund exception), or read every bond with no face at its value again. One word from him reverses it."
 },
 {
  "id": "DEC-7940",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0447 and DEC-0196, made without asking him, as his order of 2026-09-30 says. Add your income offered Bonus / one-time as one choice, which opened the yearly bonus editor, so a one-time $2,000 came back the next September and stayed in the next year's taxed income. Bonus and One-time income are now two choices; one-time income keeps its month with its year and lands once. Your sources lists it: Bonus · one-time · lands in September $2,000 (nothing said why THIS MONTH read $7,195). September reads $7,195 on the Income tab, This month and Home; October $5,396; 2027 is back to $5,416. Under his one-rate rule (DEC-0196, ruled as G46) the bonus raises the rate for every month that year, so October falls by $19.88; that is his rule, left as it is. An unpaid one-time bill dated in a passed month stays in Later; only income that has landed leaves it. To reverse: one choice to the bonus editor, and no row for other income. One word from him reverses it."
 },
 {
  "id": "DEC-8389",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-7608, DEC-7798 and DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. A 5% state rate on $60,000 read “Calculated federal tax ≈$533” and “It knows nothing about your state”; it reads “Calculated tax ≈$533 · federal income tax, plus the 5.00% state rate you entered” (canon row 25). With $24,000 of rent entered, “read on the $60,000… add rent” reads “read on the $84,000… add a bonus or a spouse’s wage”. A month with no pay is not checked, and a wrong month is named “in July 2026”. To reverse: Calculated federal tax, and the old sentences. One word from him reverses it."
 },
 {
  "id": "DEC-8398",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-0179, DEC-0198, DEC-7171 and DEC-3523 (tenet 3), made without asking him, as his order of 2026-09-30 says. $10,000 at 5% with a $1,000 payout dated tomorrow read $1,000 paid out; it reads $500, “5% on $10,000”. 1.2 VTI at $100 reinvested read $420; it reads $540. A dividend with no amount was added as $0; it reads “Not counted: 1 payment from Brokerage — amount not on record.” The screen keeps the trailing twelve months (DEC-7171). To reverse: count future payouts, skip reinvested ones. One word from him reverses it."
 },
 {
  "id": "DEC-8442",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-0376, DEC-0207 and DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. A $7,000 wage, $1,000 of self-employment, $2,000 of Social Security and $500 of other income gave $84,000 of rows under a $126,000 gross. It gives $84,000 + $12,000 + $6,000 + $20,400 = $122,400 under $122,400. The register's household read $195,600 under $264,800; it reads 7 rows, $261,020 under $261,020 (Social Security taxed $21,420 of $25,200). To reverse: list wages only. One word from him reverses it."
 },
 {
  "id": "DEC-8519",
  "decided": "2026-10-26",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-26 under his rulings DEC-0283, DEC-0178 and DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. The cockpit read the band of the gross: $70,000 of salary with $10,000 into a 401(k) read 22%; it reads 12%, the Income summary's band. $66,000 of wages and $2,000 of interest calculated from savings read 12%; it reads 22%. To reverse: band on totalGrossAnnual again. One word from him reverses it."
 },
 {
  "id": "DEC-8676",
  "decided": "2026-10-26",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-26 under his rulings DEC-0185 and DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. The recap worked its year's tax itself. It reads MK-CF-M-044, the Income summary's tax, which is the same value: what is taxed × the rate in force. Its ~X% prints as MK-CF-M-081, the rate in force. No dollar moves. To reverse: let the recap work its own arithmetic again. One word from him reverses it."
 },
 {
  "id": "DEC-8770",
  "decided": "2026-10-27",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-27 under his rulings DEC-0283 and DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. The formula's words took the 401(k) off twice. They take it off once and add with the 65-and-over additions, because deductionFor (MK-CF-F-099) adds them. Two earners still read 22%. To reverse: drop the 65-and-over clause. One word from him reverses it."
 }
]
```
