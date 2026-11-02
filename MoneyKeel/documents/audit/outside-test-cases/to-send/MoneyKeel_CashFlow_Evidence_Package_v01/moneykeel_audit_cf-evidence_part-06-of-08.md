# Cash flow evidence — part 06 of 08: Your base pay

12 cases. Read `moneykeel_audit_cf-evidence_brief_v01.md` first. Answer each case with one JSON line, in the format the brief gives.

## The cases

Each case: the figure and the tenet, what the first reviewer said it lacked, the figure's own record, the evidence (by the render's key in the next section), the decisions that name the figure (quoted at the end), our own tests and their results, and our status. Our status is not the answer.

```json
[
 {
  "case": "MK-CF-M-031#6",
  "figure": "MK-CF-M-031",
  "figure_label": "Take-home",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-14. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
   "label": "Take-home",
   "unit": "money",
   "per": "month",
   "screens": [
    "/base-pay",
    "/cashflow",
    "/income-manager"
   ],
   "answers": "What actually reaches the bank each month, after federal tax and 401(k) — for one earner, and for the household.",
   "formula": "for one earner: what they entered, or their gross less federal tax less their own 401(k). For the household: the sum of the earners’ figures, never a second calculation.",
   "inputs": [
    "MK-CF-I-001 wage",
    "MK-CF-I-003 take-home as entered",
    "MK-CF-I-004 401(k) contribution",
    "MK-CF-I-005 tax rate as entered"
   ],
   "decisions": [
    "Federal income tax when it is calculated, plus the state rate when one was entered (the Tax organizer’s \"State income tax %\", applied to taxable income) — no Social Security or Medicare, and no state tax when none was entered (MK-CF-D-001, DEC-0384)."
   ],
   "refusal": "Shows $0 until a wage is entered.",
   "note": "ONE figure over two sets: one earner, and the household — so a total and its parts cannot disagree (rule 2). It wears ≈ whenever the app worked it with the calculated rate; one entered, or worked from the person’s own typed rate, wears none.",
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
    "answer": "$9,398/month"
   }
  },
  "evidence": {
   "render": "PAY",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "= Take-home",
    "found_at_render_line": 52
   },
   "printed_under": "MK-CF-M-031",
   "printed_texts": [
    "$9,398/month",
    "$5,898",
    "$3,500",
    "$9,398/month",
    "$9,398/month"
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
     "$9,398/month",
     "$5,898",
     "$3,500",
     "$9,398/month",
     "$9,398/month"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     2,
     3,
     4,
     5,
     6,
     7,
     8
    ],
    "the_rendered_line": "= Take-home",
    "drawn_on_those_phones": [
     {
      "phone": 2,
      "line": 29,
      "text": "= Take-home"
     },
     {
      "phone": 3,
      "line": 17,
      "text": "= Take-home"
     },
     {
      "phone": 3,
      "line": 28,
      "text": "= Take-home"
     },
     {
      "phone": 4,
      "line": 20,
      "text": "= Take-home"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Base pay"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "96–112",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · nobody entered a take-home — the household card, before a rate is typed",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "116–128",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · once a rate is typed — where it is used, and the take-home under it",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "130–139",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 4 · one entered, one calculated — a labelled fact per person and no tax row",
     "kind": "test",
     "phones": [
      4
     ],
     "result": "passed",
     "lines": "153–166",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 5 · your section open — every question, every box as drawn, then everything else taken out",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "168–181",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month",
     "kind": "test",
     "phones": [
      6
     ],
     "result": "passed",
     "lines": "183–196",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits",
     "kind": "test",
     "phones": [
      7
     ],
     "result": "passed",
     "lines": "198–205",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate",
     "kind": "test",
     "phones": [
      8
     ],
     "result": "passed",
     "lines": "209–223",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0188",
   "DEC-0194",
   "DEC-0208",
   "DEC-0209",
   "DEC-0375",
   "DEC-0380",
   "DEC-0384",
   "DEC-0389",
   "DEC-0503",
   "DEC-7608"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-031 Take-home › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 2, 3, 4 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed; phone 3 · nobody entered a take-home — the household card, before a rate is typed; phone 3 · once a rate is typed — where it is used, and the take-home under it; phone 4 · one entered, one calculated — a labelled fact per person and no tax row. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-030#6",
  "figure": "MK-CF-M-030",
  "figure_label": "Each person’s pay",
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
    "answer": "$109,200/year"
   }
  },
  "evidence": {
   "render": "PAY",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Gross /year",
    "found_at_render_line": 41
   },
   "printed_under": "MK-CF-M-030",
   "printed_texts": [
    "$169,200/year",
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
     "$169,200/year",
     "$169,200"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     2,
     3,
     4,
     5,
     6,
     7,
     8
    ],
    "the_rendered_line": "Gross /year",
    "drawn_on_those_phones": [
     {
      "phone": 2,
      "line": 20,
      "text": "Gross /year"
     },
     {
      "phone": 3,
      "line": 6,
      "text": "Gross /year"
     },
     {
      "phone": 4,
      "line": 14,
      "text": "Gross /year"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Base pay"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "96–112",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · nobody entered a take-home — the household card, before a rate is typed",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "116–128",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · once a rate is typed — where it is used, and the take-home under it",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "130–139",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 4 · one entered, one calculated — a labelled fact per person and no tax row",
     "kind": "test",
     "phones": [
      4
     ],
     "result": "passed",
     "lines": "153–166",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 5 · your section open — every question, every box as drawn, then everything else taken out",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "168–181",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month",
     "kind": "test",
     "phones": [
      6
     ],
     "result": "passed",
     "lines": "183–196",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits",
     "kind": "test",
     "phones": [
      7
     ],
     "result": "passed",
     "lines": "198–205",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate",
     "kind": "test",
     "phones": [
      8
     ],
     "result": "passed",
     "lines": "209–223",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0188",
   "DEC-0207",
   "DEC-0352",
   "DEC-0375",
   "DEC-0380",
   "DEC-7942"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-030 Each person’s pay › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 2, 3, 4 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed; phone 3 · nobody entered a take-home — the household card, before a rate is typed; phone 3 · once a rate is typed — where it is used, and the take-home under it; phone 4 · one entered, one calculated — a labelled fact per person and no tax row. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-032#5",
  "figure": "MK-CF-M-032",
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
    "answer": "22%"
   }
  },
  "evidence": {
   "render": "PAY",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Federal tax bracket",
    "found_at_render_line": 44
   },
   "printed_under": "MK-CF-M-032",
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
   "DEC-0197",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-0380",
   "DEC-7797",
   "DEC-8434"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-032 Federal tax bracket › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-032; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-032#6",
  "figure": "MK-CF-M-032",
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
    "answer": "22%"
   }
  },
  "evidence": {
   "render": "PAY",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Federal tax bracket",
    "found_at_render_line": 44
   },
   "printed_under": "MK-CF-M-032",
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
     2,
     3,
     4,
     5,
     6,
     7,
     8
    ],
    "the_rendered_line": "Federal tax bracket",
    "drawn_on_those_phones": [
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
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [
     {
      "phone": 16,
      "line": 36,
      "text": "Federal tax bracket"
     }
    ],
    "design_record_rows": [
     "Base pay"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "96–112",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · nobody entered a take-home — the household card, before a rate is typed",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "116–128",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · once a rate is typed — where it is used, and the take-home under it",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "130–139",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 4 · one entered, one calculated — a labelled fact per person and no tax row",
     "kind": "test",
     "phones": [
      4
     ],
     "result": "passed",
     "lines": "153–166",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 5 · your section open — every question, every box as drawn, then everything else taken out",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "168–181",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month",
     "kind": "test",
     "phones": [
      6
     ],
     "result": "passed",
     "lines": "183–196",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits",
     "kind": "test",
     "phones": [
      7
     ],
     "result": "passed",
     "lines": "198–205",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate",
     "kind": "test",
     "phones": [
      8
     ],
     "result": "passed",
     "lines": "209–223",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0178",
   "DEC-0184",
   "DEC-0195",
   "DEC-0197",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-0380",
   "DEC-7797",
   "DEC-8434"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-032 Federal tax bracket › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 2, 3, 4 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed; phone 3 · nobody entered a take-home — the household card, before a rate is typed; phone 3 · once a rate is typed — where it is used, and the take-home under it; phone 4 · one entered, one calculated — a labelled fact per person and no tax row. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-034#5",
  "figure": "MK-CF-M-034",
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
    "answer": "$1,600/month"
   }
  },
  "evidence": {
   "render": "PAY",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Your 401(k)s",
    "found_at_render_line": 50
   },
   "printed_under": "MK-CF-M-034",
   "printed_texts": [
    "$1,600/month"
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
     "$1,600/month"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0375",
   "DEC-0380",
   "DEC-8432"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-034 Your 401(k)s › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-034; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-034#6",
  "figure": "MK-CF-M-034",
  "figure_label": "Your 401(k)s",
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
    "answer": "$1,600/month"
   }
  },
  "evidence": {
   "render": "PAY",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Your 401(k)s",
    "found_at_render_line": 50
   },
   "printed_under": "MK-CF-M-034",
   "printed_texts": [
    "$1,600/month"
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
     "$1,600/month"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     2,
     3,
     4,
     5,
     6,
     7,
     8
    ],
    "the_rendered_line": "Your 401(k)s",
    "drawn_on_those_phones": [
     {
      "phone": 3,
      "line": 15,
      "text": "Your 401(k)s"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Base pay"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "96–112",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · nobody entered a take-home — the household card, before a rate is typed",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "116–128",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · once a rate is typed — where it is used, and the take-home under it",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "130–139",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 4 · one entered, one calculated — a labelled fact per person and no tax row",
     "kind": "test",
     "phones": [
      4
     ],
     "result": "passed",
     "lines": "153–166",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 5 · your section open — every question, every box as drawn, then everything else taken out",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "168–181",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month",
     "kind": "test",
     "phones": [
      6
     ],
     "result": "passed",
     "lines": "183–196",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits",
     "kind": "test",
     "phones": [
      7
     ],
     "result": "passed",
     "lines": "198–205",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate",
     "kind": "test",
     "phones": [
      8
     ],
     "result": "passed",
     "lines": "209–223",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0375",
   "DEC-0380",
   "DEC-8432"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-034 Your 401(k)s › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 3 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 3 · nobody entered a take-home — the household card, before a rate is typed; phone 3 · once a rate is typed — where it is used, and the take-home under it. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-035#6",
  "figure": "MK-CF-M-035",
  "figure_label": "The take-home above is higher than it will really be",
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have told us no tax rate and no take-home, so the take-home shown is ours.",
    "answer": "$1,079/month"
   }
  },
  "evidence": {
   "render": "PAY_EST",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/^The take-home above is higher than it will really be/",
    "found_at_render_line": 55
   },
   "printed_under": "MK-CF-M-035",
   "printed_texts": [
    "$1,079"
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
     "$1,079"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     2,
     3,
     4,
     5,
     6,
     7,
     8
    ],
    "the_rendered_line": "The take-home above is higher than it will really be, by roughly $1,079/month. Only federal income tax is taken out here. Social Security takes 6.2% of a wage up to $184,500/year and Medicare 1.45% of all of it (0.9% more above $200,000), and your state may take more. If you itemise rather than take the standard deduction, your bill is different again.",
    "drawn_on_those_phones": [
     {
      "phone": 3,
      "line": 20,
      "text": "The take-home above is higher than it will really be, by roughly $880/month."
     }
    ],
    "matched": "the measurer's line beside the figure, as it reads it",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Base pay"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "96–112",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · nobody entered a take-home — the household card, before a rate is typed",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "116–128",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · once a rate is typed — where it is used, and the take-home under it",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "130–139",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 4 · one entered, one calculated — a labelled fact per person and no tax row",
     "kind": "test",
     "phones": [
      4
     ],
     "result": "passed",
     "lines": "153–166",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 5 · your section open — every question, every box as drawn, then everything else taken out",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "168–181",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month",
     "kind": "test",
     "phones": [
      6
     ],
     "result": "passed",
     "lines": "183–196",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits",
     "kind": "test",
     "phones": [
      7
     ],
     "result": "passed",
     "lines": "198–205",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate",
     "kind": "test",
     "phones": [
      8
     ],
     "result": "passed",
     "lines": "209–223",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0194",
   "DEC-0208",
   "DEC-0326",
   "DEC-0375",
   "DEC-0384",
   "DEC-0389"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-035 The take-home above is higher than it will really be › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 3 (the measurer's line beside the figure, as it reads it), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 3 · nobody entered a take-home — the household card, before a rate is typed; phone 3 · once a rate is typed — where it is used, and the take-home under it. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-036#5",
  "figure": "MK-CF-M-036",
  "figure_label": "Everything else taken out",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for Everything else taken out. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. Each has typed their take-home each month: $5,850 and $3,400.",
    "answer": "$3,250/month"
   }
  },
  "evidence": {
   "render": "PAY_LANDS",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Everything else taken out",
    "found_at_render_line": 34
   },
   "printed_under": "MK-CF-M-036",
   "printed_texts": [
    "$2,050/month",
    "$3,250/month"
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
     "$2,050/month",
     "$3,250/month"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0188",
   "DEC-0375",
   "DEC-8391",
   "DEC-8431"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-036 Everything else taken out › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-036; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-045#5",
  "figure": "MK-CF-M-045",
  "figure_label": "Social Security takes 6.2% of a wage up to",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for Social Security takes 6.2% of a wage up to. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not ours to choose; they are read back so the sentence on screen can be checked against the law.",
    "answer": "$184,500/year"
   }
  },
  "evidence": {
   "render": "PAY_EST",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/Social Security takes 6\\.2% of a wage up to/",
    "found_at_render_line": 55
   },
   "printed_under": "MK-CF-M-045",
   "printed_texts": [
    "$184,500"
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
     "$184,500"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0205",
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-045 Social Security takes 6.2% of a wage up to › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-045; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-045#6",
  "figure": "MK-CF-M-045",
  "figure_label": "Social Security takes 6.2% of a wage up to",
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not ours to choose; they are read back so the sentence on screen can be checked against the law.",
    "answer": "$184,500/year"
   }
  },
  "evidence": {
   "render": "PAY_EST",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/Social Security takes 6\\.2% of a wage up to/",
    "found_at_render_line": 55
   },
   "printed_under": "MK-CF-M-045",
   "printed_texts": [
    "$184,500"
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
     "$184,500"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     2,
     3,
     4,
     5,
     6,
     7,
     8
    ],
    "the_rendered_line": "The take-home above is higher than it will really be, by roughly $1,079/month. Only federal income tax is taken out here. Social Security takes 6.2% of a wage up to $184,500/year and Medicare 1.45% of all of it (0.9% more above $200,000), and your state may take more. If you itemise rather than take the standard deduction, your bill is different again.",
    "drawn_on_those_phones": [
     {
      "phone": 3,
      "line": 21,
      "text": "Only federal income tax is taken out here. Social Security takes 6.2% of a wage up to $184,500/year and Medicare 1.45% of all of it (0.9% more above $200,000), and your state may take more. If you itemise rather than take the standard deduction, your bill is different again."
     }
    ],
    "matched": "the measurer's line beside the figure, as it reads it",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Base pay"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "96–112",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · nobody entered a take-home — the household card, before a rate is typed",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "116–128",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · once a rate is typed — where it is used, and the take-home under it",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "130–139",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 4 · one entered, one calculated — a labelled fact per person and no tax row",
     "kind": "test",
     "phones": [
      4
     ],
     "result": "passed",
     "lines": "153–166",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 5 · your section open — every question, every box as drawn, then everything else taken out",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "168–181",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month",
     "kind": "test",
     "phones": [
      6
     ],
     "result": "passed",
     "lines": "183–196",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits",
     "kind": "test",
     "phones": [
      7
     ],
     "result": "passed",
     "lines": "198–205",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate",
     "kind": "test",
     "phones": [
      8
     ],
     "result": "passed",
     "lines": "209–223",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0205",
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-045 Social Security takes 6.2% of a wage up to › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 3 (the measurer's line beside the figure, as it reads it), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 3 · nobody entered a take-home — the household card, before a rate is typed; phone 3 · once a rate is typed — where it is used, and the take-home under it. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-046#5",
  "figure": "MK-CF-M-046",
  "figure_label": "Medicare 1.45% of everything, 0.9% more above",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for Medicare 1.45% of everything, 0.9% more above. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not ours to choose; they are read back so the sentence on screen can be checked against the law.",
    "answer": "$200,000/year"
   }
  },
  "evidence": {
   "render": "PAY_EST",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/Medicare 1\\.45% of all of it/",
    "found_at_render_line": 55
   },
   "printed_under": "MK-CF-M-046",
   "printed_texts": [
    "$200,000"
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
     "$200,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0194",
   "DEC-0205",
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-046 Medicare 1.45% of everything, 0.9% more above › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-046; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-046#6",
  "figure": "MK-CF-M-046",
  "figure_label": "Medicare 1.45% of everything, 0.9% more above",
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
   "ruled": "2026-09-14",
   "worked": {
    "given": "The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not ours to choose; they are read back so the sentence on screen can be checked against the law.",
    "answer": "$200,000/year"
   }
  },
  "evidence": {
   "render": "PAY_EST",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/Medicare 1\\.45% of all of it/",
    "found_at_render_line": 55
   },
   "printed_under": "MK-CF-M-046",
   "printed_texts": [
    "$200,000"
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
     "$200,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     2,
     3,
     4,
     5,
     6,
     7,
     8
    ],
    "the_rendered_line": "The take-home above is higher than it will really be, by roughly $1,079/month. Only federal income tax is taken out here. Social Security takes 6.2% of a wage up to $184,500/year and Medicare 1.45% of all of it (0.9% more above $200,000), and your state may take more. If you itemise rather than take the standard deduction, your bill is different again.",
    "drawn_on_those_phones": [
     {
      "phone": 3,
      "line": 21,
      "text": "Only federal income tax is taken out here. Social Security takes 6.2% of a wage up to $184,500/year and Medicare 1.45% of all of it (0.9% more above $200,000), and your state may take more. If you itemise rather than take the standard deduction, your bill is different again."
     }
    ],
    "matched": "the measurer's line beside the figure, as it reads it",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Base pay"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "96–112",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · nobody entered a take-home — the household card, before a rate is typed",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "116–128",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 3 · once a rate is typed — where it is used, and the take-home under it",
     "kind": "test",
     "phones": [
      3
     ],
     "result": "passed",
     "lines": "130–139",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 4 · one entered, one calculated — a labelled fact per person and no tax row",
     "kind": "test",
     "phones": [
      4
     ],
     "result": "passed",
     "lines": "153–166",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 5 · your section open — every question, every box as drawn, then everything else taken out",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "168–181",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month",
     "kind": "test",
     "phones": [
      6
     ],
     "result": "passed",
     "lines": "183–196",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits",
     "kind": "test",
     "phones": [
      7
     ],
     "result": "passed",
     "lines": "198–205",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/basepay_matches_v07.test.tsx",
     "test": "phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate",
     "kind": "test",
     "phones": [
      8
     ],
     "result": "passed",
     "lines": "209–223",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0194",
   "DEC-0205",
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-046 Medicare 1.45% of everything, 0.9% more above › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 3 (the measurer's line beside the figure, as it reads it), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: phone 3 · nobody entered a take-home — the household card, before a rate is typed; phone 3 · once a rate is typed — where it is used, and the take-home under it. Appearance (colour, size, spacing) is not tested here."
 }
]
```

## The renders — each screen as it rendered, with the store before and after

Every line in order (`[icon]` is an icon); every figure printed under its identifier; every value the person entered, before the screen opened and after; and the same household arriving by a cloud sync.

```json
{
 "PAY": {
  "screen": "BasePayScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('basepay', H_PAY, '2026-09-28')",
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
   "004  Your base pay",
   "005  Bonus, stocks and other income are captured separately",
   "006  WHO EARNS A WAGE?",
   "007  Just me",
   "008  Just Sam",
   "009  Both of us",
   "010  EACH PERSON’S PAY",
   "011  $169,200/year",
   "012  You",
   "013  Fortnightly · the same each month",
   "014  Done ⌃",
   "015  How often you are paid",
   "016  Hourly",
   "017  Weekly",
   "018  Bi-weekly",
   "019  Monthly",
   "020  Is your pay the same every month?",
   "021  The same",
   "022  It varies",
   "023  Gross a fortnight",
   "024  Before anything comes out.",
   "025  Into your 401(k) each month",
   "026  Your own contribution, not your employer’s match.",
   "027  Your employer’s match",
   "028  A share of what you put in, or a flat amount.",
   "029  % of theirs",
   "030  A set amount",
   "031  %",
   "032  Your take-home each month",
   "033  After tax and everything else taken out of your pay.",
   "034  We’ll calculate $5,898/month, using the 22.00% rate you entered.",
   "035  Sam",
   "036  ✓",
   "037  Monthly · the same each month · take-home $3,500 (calculated)",
   "038  Edit ⌄",
   "039  YOUR HOUSEHOLD",
   "040  $9,398/month",
   "041  Gross /year",
   "042  both wages",
   "043  $169,200",
   "044  Federal tax bracket",
   "045  on both wages, filing jointly",
   "046  22%",
   "047  Tax",
   "048  your rate, 22.00%",
   "049  $3,102/month",
   "050  Your 401(k)s",
   "051  $1,600/month",
   "052  = Take-home",
   "053  $9,398/month",
   "054  $14,100 gross − $3,102 tax − $1,600 of 401(k)s = $9,398.",
   "055  The tax rate you want us to use",
   "056  Everything that comes out, as a share of your gross — from a payslip, add up every deduction except your 401(k) and divide by the gross. Leave it blank to use the calculated rate.",
   "057  We’ll use 22.00% everywhere your take-home matters — cash flow, budget, the surplus. One-time events like a Roth conversion still use the tax tables.",
   "058  = Take-home",
   "059  $9,398/month",
   "060  Save"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-030  $169,200/year",
   "MK-CF-M-031  $9,398/month",
   "MK-CF-M-031  $5,898",
   "MK-CF-M-081  22.00%",
   "MK-CF-M-031  $3,500",
   "MK-CF-M-030  $169,200",
   "MK-CF-M-032  22%",
   "MK-CF-M-033  $3,102/month",
   "MK-CF-M-034  $1,600/month",
   "MK-CF-M-031  $9,398/month",
   "MK-CF-M-081  22.00%",
   "MK-CF-M-031  $9,398/month"
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
    "MK-CF-M-030  $169,200/year",
    "MK-CF-M-031  $9,398/month",
    "MK-CF-M-031  $5,898",
    "MK-CF-M-081  22.00%",
    "MK-CF-M-031  $3,500",
    "MK-CF-M-030  $169,200",
    "MK-CF-M-032  22%",
    "MK-CF-M-033  $3,102/month",
    "MK-CF-M-034  $1,600/month",
    "MK-CF-M-031  $9,398/month",
    "MK-CF-M-081  22.00%",
    "MK-CF-M-031  $9,398/month"
   ],
   "whole_screen_the_same": true
  }
 },
 "PAY_EST": {
  "screen": "BasePayScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('basepay', H_PAY_EST, '2026-09-28')",
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
   "004  Your base pay",
   "005  Bonus, stocks and other income are captured separately",
   "006  WHO EARNS A WAGE?",
   "007  Just me",
   "008  Just Sam",
   "009  Both of us",
   "010  EACH PERSON’S PAY",
   "011  $169,200/year",
   "012  You",
   "013  Fortnightly · the same each month",
   "014  Done ⌃",
   "015  How often you are paid",
   "016  Hourly",
   "017  Weekly",
   "018  Bi-weekly",
   "019  Monthly",
   "020  Is your pay the same every month?",
   "021  The same",
   "022  It varies",
   "023  Gross a fortnight",
   "024  Before anything comes out.",
   "025  Into your 401(k) each month",
   "026  Your own contribution, not your employer’s match.",
   "027  Your employer’s match",
   "028  A share of what you put in, or a flat amount.",
   "029  % of theirs",
   "030  A set amount",
   "031  %",
   "032  Your take-home each month",
   "033  After tax and everything else taken out of your pay.",
   "034  We’ll calculate ≈$7,075/month, using your tax band read on the $169,200 you have entered so far — add rent or a bonus later and the band is calculated again, so this figure moves. It knows nothing about your state or your insurance, so the ≈$7,075 is higher than it will really be.",
   "035  Sam",
   "036  ✓",
   "037  Monthly · the same each month · take-home ≈$4,147 (calculated)",
   "038  Edit ⌄",
   "039  YOUR HOUSEHOLD",
   "040  ≈$11,222/month",
   "041  Gross /year",
   "042  both wages",
   "043  $169,200",
   "044  Federal tax bracket",
   "045  on both wages, filing jointly",
   "046  22%",
   "047  Calculated federal tax",
   "048  assumes you take the standard deduction",
   "049  ≈$1,278/month",
   "050  Your 401(k)s",
   "051  $1,600/month",
   "052  = Take-home",
   "053  ≈$11,222/month",
   "054  $14,100 gross − $1,278 tax − $1,600 of 401(k)s = $11,222.",
   "055  The take-home above is higher than it will really be, by roughly $1,079/month. Only federal income tax is taken out here. Social Security takes 6.2% of a wage up to $184,500/year and Medicare 1.45% of all of it (0.9% more above $200,000), and your state may take more. If you itemise rather than take the standard deduction, your bill is different again.",
   "056  The tax rate you want us to use",
   "057  Everything that comes out, as a share of your gross — from a payslip, add up every deduction except your 401(k) and divide by the gross. Leave it blank to use the calculated rate.",
   "058  Save"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-030  $169,200/year",
   "MK-CF-M-031  $11,222/month",
   "MK-CF-M-031  $7,075",
   "MK-CF-M-076  $169,200",
   "MK-CF-M-031  $7,075",
   "MK-CF-M-031  $4,147",
   "MK-CF-M-030  $169,200",
   "MK-CF-M-032  22%",
   "MK-CF-M-033  $1,278/month",
   "MK-CF-M-034  $1,600/month",
   "MK-CF-M-031  $11,222/month",
   "MK-CF-M-035  $1,079",
   "MK-CF-M-045  $184,500",
   "MK-CF-M-046  $200,000"
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
    "MK-CF-M-030  $169,200/year",
    "MK-CF-M-031  $11,222/month",
    "MK-CF-M-031  $7,075",
    "MK-CF-M-076  $169,200",
    "MK-CF-M-031  $7,075",
    "MK-CF-M-031  $4,147",
    "MK-CF-M-030  $169,200",
    "MK-CF-M-032  22%",
    "MK-CF-M-033  $1,278/month",
    "MK-CF-M-034  $1,600/month",
    "MK-CF-M-031  $11,222/month",
    "MK-CF-M-035  $1,079",
    "MK-CF-M-045  $184,500",
    "MK-CF-M-046  $200,000"
   ],
   "whole_screen_the_same": true
  }
 },
 "PAY_LANDS": {
  "screen": "BasePayScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('basepay', H_PAY_LANDS, '2026-09-28')",
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
     "c_401k": "400",
     "landsTypical": "3400"
    },
    "landsTypical": "5850"
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
   "004  Your base pay",
   "005  Bonus, stocks and other income are captured separately",
   "006  WHO EARNS A WAGE?",
   "007  Just me",
   "008  Just Sam",
   "009  Both of us",
   "010  EACH PERSON’S PAY",
   "011  $169,200/year",
   "012  You",
   "013  Fortnightly · the same each month",
   "014  Done ⌃",
   "015  How often you are paid",
   "016  Hourly",
   "017  Weekly",
   "018  Bi-weekly",
   "019  Monthly",
   "020  Is your pay the same every month?",
   "021  The same",
   "022  It varies",
   "023  Gross a fortnight",
   "024  Before anything comes out.",
   "025  Into your 401(k) each month",
   "026  Your own contribution, not your employer’s match.",
   "027  Your employer’s match",
   "028  A share of what you put in, or a flat amount.",
   "029  % of theirs",
   "030  A set amount",
   "031  %",
   "032  Your take-home each month",
   "033  After tax and everything else taken out of your pay.",
   "034  Everything else taken out",
   "035  $2,050/month",
   "036  22.53% of your gross. Tax, medical cover and anything else bought through work — we do not need to ask about each.",
   "037  Sam",
   "038  ✓",
   "039  Monthly · the same each month · take-home $3,400",
   "040  Edit ⌄",
   "041  YOUR HOUSEHOLD",
   "042  $9,250/month",
   "043  Gross /year",
   "044  both wages",
   "045  $169,200",
   "046  Federal tax bracket",
   "047  on both wages, filing jointly",
   "048  22%",
   "049  Everything else taken out",
   "050  what you entered",
   "051  $3,250/month · 23.05%",
   "052  = Take-home",
   "053  $9,250/month",
   "054  Both figures are what you entered — nothing here is calculated.",
   "055  Filing jointly, the band comes from what you earn together. On your pay alone we would have read 12% and shown about $1,410/month more than your real take-home. The 23.05% is your own figures — tax, Social Security, Medicare, everything.",
   "056  Save"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-030  $169,200/year",
   "MK-CF-M-031  $9,250/month",
   "MK-CF-M-036  $2,050/month",
   "MK-CF-M-031  $3,400",
   "MK-CF-M-030  $169,200",
   "MK-CF-M-032  22%",
   "MK-CF-M-036  $3,250/month",
   "MK-CF-M-081  23.05%",
   "MK-CF-M-031  $9,250/month"
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
    "MK-CF-M-030  $169,200/year",
    "MK-CF-M-031  $9,250/month",
    "MK-CF-M-036  $2,050/month",
    "MK-CF-M-031  $3,400",
    "MK-CF-M-030  $169,200",
    "MK-CF-M-032  22%",
    "MK-CF-M-036  $3,250/month",
    "MK-CF-M-081  23.05%",
    "MK-CF-M-031  $9,250/month"
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
 "Base pay": "`MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html` **frame 2, Your base pay — APPROVED** (v02 on 2026-08-27, *\"yes\"*, DEC-0177; v07 approved on 2026-09-02 per the file's own change block). **Held word for word since 2026-10-04**, phones 2 to 8, by `src/screens/__tests__/basepay_matches_v07.test.tsx` (9 named differences). The filing question (phones 13 to 15) is held by `filing_matches_v07.test.tsx`. **2026-10-24, a correction line on the drawing (his DEC-4529):** phone 2's Federal tax bracket reads 12% in the build where the drawing draws 22% — the band of what is taxed once each earner's 401(k) is out, $138,000 − $14,400 − $32,200 = $91,400, by his DEC-0283 (DEC-7797); for that household the band sentence for two earners no longer prints. `filing-status-question_v03` carries its first ruling note the same day: its tax figures are worked after the 401(k) (DEC-7797). Held by `basepay_matches_v07.test.tsx` (difference 10), 10 of 10 on 2026-10-24. **2026-10-24, two more READ THIS FIRST rows on income-end-to-end v07:** a take-home typed before 2026-08-28 has its gross worked back with the person's own rate and says so (DEC-7942); phone 15, the filing-status comparison, shows a fall as well as a rise against the status in force, and its figure is the difference of the two printed take-homes, $327 a month (DEC-7944, DEC-7945); filing-status-question v03 carries the same rows. **2026-10-25/26, rows on v07 (the phones not redrawn):** drawing errors with the app's figures, phone 2 $2,000 · 17%, phones 3 and 4 ≈$9,427 ≈$873 ≈$3,759 ≈$8,759, phone 3 $7,540 (DEC-8391); a typed rate is his (DEC-8383); the match's worth (DEC-8384); money boxes (DEC-8385); nothing entered (DEC-8386); the sign-up step (DEC-8382); the old-way take-home on load (DEC-8387); this calendar year (DEC-8380); a blank month is the typical month (DEC-8381); Calculated tax with a state rate (DEC-8389); part-year pay (DEC-8431), the paid month (DEC-8432), **a new Hours a week box** (DEC-8433), the bracket with other income (DEC-8434), a typed $0 (DEC-8435), the February failure (DEC-8436), the old-way 401(k) (DEC-8437). FIX-TAX wrote its two rows of 2026-10-25 after the code. | —"
}
```

## The drawing — `MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html`

**READ THIS FIRST — ADDED AFTER THIS MOCKUP · BUILD 54. Each row says whose decision it is: his, in his own words with the day he gave them, or the lead’s, made without asking him under his order of 2026-09-30. (Corrected 2026-10-31: this line said every row was his ruling and approved, which was untrue of the lead’s rows.)** These were ruled after this drawing was approved, during work on Build 54 (the build on TestFlight). They are in the app’s code unless a line says ‘Not built yet’, and reach a phone with the next build cut. The phones below are not redrawn: where a line here and a phone disagree, this line is the design.

Its dated rows, every one, as written on the drawing (67):

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
 }
]
```

Its phones that hold the screens in this part (2, 3, 4, 5, 6, 7, 8, 16), every line in order, as the match tests read them. Phones 1, 9, 10, 11, 12, 13, 14, 15, 17 draw other screens and are left out.

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
 "phone 5": [
  "‹ Income",
  "Your base pay",
  "Bonus, stocks and other income are captured separately",
  "Each person’s pay",
  "$138,000/year",
  "You",
  "Monthly · the same each month",
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
  "Before anything comes out.",
  "$7,000",
  "Into your 401(k) each month",
  "Your own contribution, not your employer’s match.",
  "$800",
  "Your employer’s match",
  "A share of what you put in, or a flat amount.",
  "% of theirs",
  "A set amount",
  "50% · $400/month",
  "Your take-home each month",
  "After tax and everything else taken out of your pay.",
  "$5,000",
  "Everything else taken out",
  "$1,200",
  "17% of your gross. Tax, medical cover and anything else bought through work — we do not need to ask about each.",
  "Sam",
  "✓",
  "Fortnightly · varies · take-home $3,300",
  "Edit ⌄",
  "Save",
  "The 401(k) and the match are here now",
  ", not two screens later. They come out of this wage, so they are asked where the wage is — and every earner’s section carries them, which is how three copies of the match arithmetic came to exist when it was one screen for one person.",
  "2c · Sam’s section, pay varies"
 ],
 "phone 6": [
  "‹ Income",
  "Your base pay",
  "Bonus, stocks and other income are captured separately",
  "Each person’s pay",
  "$138,000/year",
  "You",
  "✓",
  "Monthly · the same · take-home $5,000",
  "Edit ⌄",
  "Sam",
  "Fortnightly · varies",
  "Done ⌃",
  "How often Sam is paid",
  "Hourly",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Is Sam’s pay the same every month?",
  "The same",
  "It varies",
  "Gross a fortnight",
  "A typical one. Every month below starts from this.",
  "$2,077",
  "Jul 26",
  "$4,500",
  "Aug 26",
  "$4,500",
  "Sep 26",
  "$6,000",
  "Oct 26",
  "$4,500",
  "Nov 26",
  "$4,500",
  "Dec 26",
  "$4,500",
  "Jan 27",
  "$4,500",
  "Feb 27",
  "$4,500",
  "Mar 27",
  "$6,000",
  "Apr 27",
  "$4,500",
  "May 27",
  "$4,500",
  "Jun 27",
  "$4,500",
  "Jul 27",
  "$4,500",
  "Aug 27",
  "$4,500",
  "Into Sam’s 401(k) each month",
  "$400",
  "Sam’s employer’s match",
  "A share of what they put in, or a flat amount.",
  "% of theirs",
  "A set amount",
  "$150/month · a set amount",
  "Sam’s take-home each month",
  "$3,300",
  "The months are shown as months even though Sam is paid fortnightly — a fortnightly figure typed into a monthly box is the mistake this prevents.",
  "Save",
  "Fourteen months, last month to twelve ahead, two per row with the year. Last month is greyed — already happened, there to check against. The table lives inside Sam’s section, so it never lengthens the screen for someone steadily paid.",
  "2d · the three do not agree"
 ],
 "phone 7": [
  "‹ Income",
  "Your base pay",
  "Bonus, stocks and other income are captured separately",
  "Each person’s pay",
  "You",
  "Monthly · the same each month",
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
  "$5,500",
  "Into your 401(k) each month",
  "$800",
  "Your employer’s match",
  "A share of what you put in, or a flat amount.",
  "% of theirs",
  "A set amount",
  "50% · $400/month",
  "Your take-home each month",
  "$5,000",
  "These three cannot all be right.",
  "$5,500 gross, less $800 into your 401(k), leaves $4,700 — but you entered a take-home of $5,000. That is $300 more than there is.",
  "Most likely the gross figure is per fortnight rather than per month, or the 401(k) is a yearly amount.",
  "Save",
  "Three figures that must reconcile catch each other; one figure alone never could. Save waits until it holds. On variable pay every month is checked on its own, not only the total.",
  "2e · the same screen in onboarding"
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
 ]
}
```

## The match tests — each test that holds one of these screens to a drawing phone, its code and its result at this build

**phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed** — `src/screens/__tests__/basepay_matches_v07.test.tsx`, lines 96–112, phones 2: **passed**

```ts
test('phone 2 · both sections closed, both take-homes entered — the whole screen, every figure as printed', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  closeYours();
  const want = applyNamed(normPrinted(phone(2, /^‹ Income$/, /^Save$/)), [
    ['‹ Income', '‹ Back', 'difference 1 (DEC-0354)'],
    ['on both wages, filing jointly 22%', 'on both wages, filing jointly 12%', 'difference 10: $138,000 − $14,400 − $32,200 = $91,400, the 12% band'],
    ['$4,700/month · 24%', '$2,000/month · 17.39%', 'difference 11: $11,500 − $8,300 − $1,200 = $2,000; $24,000 ÷ $138,000 = 17.39% (two decimals, difference 12, the v07 row of 2026-10-26)'],
    [' Filing jointly, the band comes from what you earn together. On your pay alone we would have read 12% and shown about $168/month more than your real take-home. The 24% is your own figures',
     ' The 17.39% is your own figures', 'differences 10, 11 and 12: the two bands agree, and the share is 17.39%'],
  ]);
  const got = normPrinted(builtLinesWithBoxes(screen.toJSON()));
  expect(want.split(' ').length).toBeGreaterThan(90);
  expect(firstDifference(want, got)).toBe('');
  // by hand: $84,000 + $54,000 (12 × $4,500) = $138,000 a year; $5,000 + $3,300 = $8,300 a month, twice (band and = Take-home)
  expect(got).toContain('Each person’s pay $138,000/year');
  expect(got.split('$8,300/month').length - 1).toBe(2);
})
```

**phone 3 · nobody entered a take-home — the household card, before a rate is typed** — `src/screens/__tests__/basepay_matches_v07.test.tsx`, lines 116–128, phones 3: **passed**

```ts
test('phone 3 · nobody entered a take-home — the household card, before a rate is typed', () => {
  show(PHONE_3);
  const want = applyNamed(normPrinted(phone(3, /^Your household$/, /^Everything that comes out, as a share of your gross/)), [
    ['≈$9,242/month', '≈$9,427/month', 'difference 11 (DEC-0283): $11,500 − $873 − $1,200 = $9,427', 2],
    ['both of you earn 22%', 'both of you earn 12%', 'difference 10: $138,000 − $14,400 − $32,200 = $91,400'],
    ['≈$1,058/month', '≈$873/month', 'difference 11: the year’s tax on $91,400, $10,472, ÷ 12 = $873'],
    ['$11,500 gross − $1,058 tax − $1,200 of 401(k)s = $9,242. The rows on this card always add up — a card whose own rows disagree is a wrong number wearing a layout.',
     '$11,500 gross − $873 tax − $1,200 of 401(k)s = $9,427.', 'differences 6 (DEC-1625) and 11'],
  ]) + ' calculated, 7.59% Save';   // $10,472 ÷ $138,000 = 7.588% — two decimals (difference 12, 2026-10-26)                                                                                       // 5
  const got = normPrinted(builtRun(/^Your household$/));
  expect(want.split(' ').length).toBeGreaterThan(130);
  expect(firstDifference(want, got)).toBe('');
})
```

**phone 3 · once a rate is typed — where it is used, and the take-home under it** — `src/screens/__tests__/basepay_matches_v07.test.tsx`, lines 130–139, phones 3: **passed**

```ts
test('phone 3 · once a rate is typed — where it is used, and the take-home under it', () => {
  show({ ...PHONE_3, taxMode: 'manual', manualTaxRate: '24' });
  const want = applyNamed(normPrinted(phone(3, /^The tax rate you want us to use$/, /^Save$/)), [
    ['= Take-home $8,740/month', '= Take-home $7,540/month', 'difference 11 (IN-03): $11,500 − 24% × $11,500 − $1,200 = $7,540'],
    ['We’ll use 24% everywhere', 'We’ll use 24.00% everywhere', 'difference 12: the rate in force, MK-CF-M-081, to two decimals (the v07 row of 2026-10-26)'],
  ]);
  const got = normPrinted(builtRun(/^The tax rate you want us to use$/));
  expect(want.split(' ').length).toBeGreaterThan(55);
  expect(firstDifference(want, got)).toBe('');
})
```

**phone 4 · one entered, one calculated — a labelled fact per person and no tax row** — `src/screens/__tests__/basepay_matches_v07.test.tsx`, lines 153–166, phones 4: **passed**

```ts
test('phone 4 · one entered, one calculated — a labelled fact per person and no tax row', () => {
  show({ ...YOU, ...COUPLE, partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' } });
  closeYours();
  const want = applyNamed(normPrinted(phone(4, /^Each person’s pay$/, /^Save$/)), [
    ...AS_PHONE_2,
    ['Monthly · the same · take-home ≈$3,686 (calculated)', 'Monthly · the same each month · take-home ≈$3,759 (calculated)', 'differences 3 and 11: $4,500 less 7.59% tax less $400'],
    ['≈$8,686/month', '≈$8,759/month', 'difference 11: $5,000 + $3,759', 2],
    ['both of you earn 22%', 'both of you earn 12%', 'difference 10'],
    ['≈$3,686', '≈$3,759', 'difference 11'],
  ]);
  const got = normPrinted(builtRun(/^Each person’s pay$/)).replace(/ ✓/g, '');                                       // 4
  expect(want.split(' ').length).toBeGreaterThan(55);
  expect(firstDifference(want, got)).toBe('');
})
```

**phone 5 · your section open — every question, every box as drawn, then everything else taken out** — `src/screens/__tests__/basepay_matches_v07.test.tsx`, lines 168–181, phones 5: **passed**

```ts
test('phone 5 · your section open — every question, every box as drawn, then everything else taken out', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  const want = applyNamed(normPrinted(phone(5, /^Each person’s pay$/, /^Edit ⌄$/)), [
    ['Everything else taken out $1,200 ', 'Everything else taken out $1,200/month ', 'difference 7 (canon row 15)'],
    ['Fortnightly · varies · take-home $3,300 ', 'Fortnightly · varies · take-home $3,300/month ', 'difference 3'],
    ['17% of your gross', '17.14% of your gross', 'v07 row of 2026-10-31 (IN3-01; Q49): $1,200 ÷ $7,000 = 17.142857…%, to two decimals'],
  ]);
  const got = normPrinted(builtRun(/^Each person’s pay$/, /^Edit ⌄$/));
  expect(want.split(' ').length).toBeGreaterThan(110);
  expect(firstDifference(want, got)).toBe('');
  // by hand: the boxes as drawn — "$7,000", "$800", the match 50% × $800 = $400 a month, "$5,000"; $7,000 − $800 − $5,000 = $1,200
  expect(got).toContain('$7,000 Into your 401(k) each month');
  expect(got).toContain('50% · $400/month');
})
```

**phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month** — `src/screens/__tests__/basepay_matches_v07.test.tsx`, lines 183–196, phones 6: **passed**

```ts
test('phone 6 · Sam’s section, paid fortnightly, pay varies — fourteen months, each one a month', () => {
  show({ ...YOU, ...COUPLE, filingStatus: 'married', partnerWage: SAM_PHONE_6 });
  closeYours(); openSams();
  const want = applyNamed(normPrinted(phone(6, /^Each person’s pay$/, /the mistake this prevents\.$/)), [
    ...AS_PHONE_2,
    ['$138,000/year', '$139,502/year', 'difference 11: $84,000 + (11 × $2,077 × 26 ÷ 12 + $6,000 = $55,502, this calendar year)'],
  ]);
  const got = normPrinted(builtRun(/^Each person’s pay$/, /the mistake this prevents\.$/));
  expect(screen.getAllByLabelText(/gross pay$/)).toHaveLength(14);                                                     // fourteen built
  expect(firstDifference(want, got)).toBe('');
  // a month not typed shows the month the app counts: $2,077 × 26 ÷ 12 = $4,500.17 → "$4,500" — never "2077" (IN-05)
  expect(got).toContain('Jul 26 $4,500 Aug 26 $4,500 Sep 26 $6,000 Oct 26 $4,500');
  expect(got).not.toContain('2077 ');
})
```

**phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits** — `src/screens/__tests__/basepay_matches_v07.test.tsx`, lines 198–205, phones 7: **passed**

```ts
test('phone 7 · the three do not agree — the boxes marked, the sentence that says by how much, and Save waits', () => {
  show({ ...YOU, baseSalary: '5500', ...COUPLE, filingStatus: 'married', partnerWage: SAM_FORTNIGHTLY });
  const want = normPrinted(phone(7, /^You$/, /^Most likely the gross figure/));
  const got = normPrinted(builtRun(/^You$/, /or the 401\(k\) is a yearly amount\.$/));
  expect(want.split(' ').length).toBeGreaterThan(80);
  expect(firstDifference(want, got)).toBe('');
  expect(screen.getByLabelText('Save your base pay')).toBeDisabled();
})
```

**phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate** — `src/screens/__tests__/basepay_matches_v07.test.tsx`, lines 209–223, phones 8: **passed**

```ts
test('phone 8 · the same screen inside sign-up — the title, its own hints, the boxes, and what we will calculate', () => {
  show({ baseSalary: '7000', salaryFreq: 'monthly', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'you' }, 'onboarding');
  const want = applyNamed(normPrinted(phone(8, /^Your base pay$/, /higher than it will really be\.$/)), [
    ['401(k) , because', '401(k), because', 'the space a bold tag leaves before a comma in the drawing’s markup'],
    ['≈$6,196', '≈$6,523', 'difference 11: a spouse entered, taxed jointly until asked — $7,000 − $477 = $6,523', 2],
    // THE ROW OF 2026-11-01 ON v07 (R16, FX-PF): the 401(k) box nobody filled is empty — read only where the drawing carries that row
    ...(R16_SIGNUP.test(V07_HTML) ? [['Leave blank if you don’t contribute. $0 Your take-home', 'Leave blank if you don’t contribute. Your take-home', 'v07 row of 2026-11-01 (R16)']] as [string, string, string][] : []),
  ]);
  expect(V07_HTML).toMatch(R16_SIGNUP);
  const got = applyNamed(normPrinted(builtLinesWithBoxes(screen.toJSON())), [
    [' Your employer’s match A share of what you put in, or a flat amount. % of theirs A set amount %', '', 'difference 9'],
  ]);
  expect(want.split(' ').length).toBeGreaterThan(120);
  expect(firstDifference(want, got)).toBe('');                                                                         // whole: no household card in sign-up (IN-07)
})
```

## The decisions these cases name — quoted from the decision log

```json
[
 {
  "id": "DEC-0178",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0178, confirmed as written: The tax band is produced ONCE, at total income (MK-CF-F-084 taxable annual → MK-CF-F-090 effective rate). The base-pay s",
  "the_log_records": "Your tax band is worked out ONCE, from your total income, and every screen reads that one figure. The base-pay screen does not work out a band of its own — a band is set by everything you are taxed on together, so a screen that sees only your wage would show the wrong one."
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
  "id": "DEC-0188",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Who earns this income? You / Partner / Both",
  "the_log_records": "A spouse’s wage becomes its own block, using the SAME field names as your own, and the household total sums every earner. A household on $84,000 plus $54,000 had been read as $84,000 — one person’s income against two people’s spending."
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
  "id": "DEC-0197",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in your bank, or OUR estimate — and each one says whose it is on the screen.",
  "the_log_records": "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in your bank, or OUR estimate — and each one says whose it is on the screen."
 },
 {
  "id": "DEC-0205",
  "decided": "2026-09-01",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0205, confirmed as written: New src/__tests__/statutory_constants.test.ts: the 2026 bracket tables and deductions, the complete IRS Uniform Lifetime",
  "the_log_records": "Every figure set by law is typed in from the published source. The first run against the real figures found three errors: the IRA limits were a year out of date, the bigger catch-up allowance for ages 60 to 63 was missing entirely in an app built for ages 55 to 70, and four of the required-withdrawal divisors were slightly wrong from being interpolated rather than typed."
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
  "id": "DEC-0326",
  "decided": "2026-08-20",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "married bands are not double the single ones at the top",
  "the_log_records": "“married bands are not double the single ones at the top.” A couple’s tax bands are NOT simply twice a single person’s in the upper brackets — assuming they are overstates take-home for higher earners."
 },
 {
  "id": "DEC-0352",
  "decided": "2026-09-14",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "a door DECLARES each figure it hands out beside the code that computes it (identifier, the words on screen, unit, formula in plain English, inputs, decisions, refusal); a screen prints a figure ONLY by its identifier; and the master file's figure rows are PRINTED from those declarations rather than typed, so the file and the code cannot disagree",
  "the_log_records": "“a door DECLARES each figure it hands out beside the code that computes it — identifier, the words on screen, unit, formula in plain English, inputs, decisions.” The master file’s rows are then PRINTED from those declarations, so the file is a printout of the code rather than a description of it that can go stale."
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
  "id": "DEC-0380",
  "decided": "2026-09-02",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his first build-54 device pass — the card contradicted itself ($21,159 − $4,380 − $1,656 ≠ $16,403) because every estimated earner was granted the FULL joint deduction; and a two-earner household was banded as single (32% vs jointly 24%).",
  "the_log_records": "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his first device pass of build 54, where the card contradicted itself because every estimated earner was granted the FULL joint deduction."
 },
 {
  "id": "DEC-0384",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "FOUNDER RULING: the tax estimate STAYS FEDERAL. “Payroll tax applies to wages, and our gross also carries rent, dividends and bonuses — applying 7.65% to that total would be wrong, not merely imprecise. State tax cannot be known without asking. So we work out the one thing we can, say so, and let it be corrected.”",
  "the_log_records": "Our tax estimate covers federal income tax only, and says so on the screen. Three decisions:\n1. We do not add payroll tax to it. Payroll tax applies to wages, and our gross figure also holds rent, dividends and bonuses — applying 7.65% to all of that would be wrong, not just rough.\n2. We do not guess state tax, because it cannot be known without asking.\n3. We work out the one thing we can, name the gap in dollars, and let you correct it."
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
  "id": "DEC-0503",
  "decided": "2026-06-30",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "How is income + spending captured, at what frequency, and what about cash / unconnected cards?",
  "the_log_records": "HIS QUESTION: “How is income + spending captured, at what frequency, and what about cash / unconnected cards?” The parts no connection reaches still have to be captured somehow."
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
  "id": "DEC-7797",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283, DEC-4529 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. His ruling DEC-0283 (2026-09-10): income before tax is gross less the 401(k) and other deductions. The tax was already worked that way while the bracket named the band of the gross. 5 of 5 places now read the income after the 401(k). The Income summary bracket, single, $70,000 of wages and $10,000 into a 401(k): 22% on $53,900 → 12% on $43,900, tax about $5,020 unchanged. Sign-up's Taxes step shows the same 12%. Your base pay, the drawing's own household, $138,000 of wages and $14,400 into 401(k)s, taxed on $91,400: 22% → 12%. The filing-status comparison works its tax after the 401(k), its line naming what was entered less the 401(k). The draw-order sheet's rates are worked after the 401(k). Base pay's 12% is A FIGURE ON HIS APPROVED DRAWING (income-end-to-end v07, phone 2, which draws 22%), applied under tenet 1, which ranks above tenet 6, with the correction line his DEC-4529 asks for on the drawing. For that household the drawn sentence that begins Filing jointly, the band comes from what you earn together no longer prints (both bands are 12%), and the sentence about the 24% stands on its own. What it is taxed on was left as drawn, each gross line, then Gross a year. CORRECTED 2026-10-24: that no longer holds — two rows were added under the gross, Your 401(k)s and What it is taxed on, drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07 under his DEC-0283 (DEC-7887). To reverse: read the bracket off the gross again. One word from him reverses it."
 },
 {
  "id": "DEC-7942",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenets 3 and 5), made without asking him, as his order of 2026-09-30 says. A $5,000 take-home with the person's own 0% rate: the gross box showed 5475.378787878787, worked back from the federal tables, the card read Everything else taken out $475/month · 0%, and its last line said nothing there was calculated. The gross is now worked back with their own rate, $5,000.00, under the line \"≈ Worked back from the take-home you entered. Type the gross from a payslip to replace it.\", and the card's last line says the take-home is what was entered and the gross was worked back from it. The typed take-home is unchanged ($5,000 on This month). Typing a gross brings back the drawing's words. The drawing's rule 9: every estimate is prefixed ≈ and says what it cannot see. To reverse: work the gross back from the federal schedule and print the drawn words. One word from him reverses it."
 },
 {
  "id": "DEC-8391",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-4529 and DEC-0283, made without asking him, as his order of 2026-09-30 says. Phone 2 draws $4,700/month · 24%; its own rule gives $11,500 − $8,300 − $1,200 = $2,000 · 17%, as built. Phones 3 and 4 draw ≈$9,242, ≈$1,058, ≈$3,686, ≈$8,686; with the 401(k) off first they are ≈$9,427, ≈$873, ≈$3,759, ≈$8,759. Phone 3's $8,740 is $7,540, phone 6 $139,502, phone 8 ≈$6,523, phones 9 and 16 $18,620 (drawn $18,860). v03 names v07 as the filing question's one phone. To reverse: print the drawn figures. One word from him reverses it."
 },
 {
  "id": "DEC-8431",
  "decided": "2026-10-26",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-26 under his rulings DEC-7938, DEC-0376 and DEC-0252, made without asking him, as his order of 2026-09-30 says. The July starter, $60,000.30 over six paid months, $501.13 a month into a 401(k), $3,799.17 take-home typed: the share read 19.01% and a paid month landed $7,598.34; it reads 57.00% and $3,799.17. The take-home a year read $45,590.04, now $22,795.02; “your figures, 14%” reads 57%; deductions $8,396.70 read $34,198.50. Two earners' 401(k)s read $13,340.40, now $9,060.78; $1,000 a month July to December, $6,000 (it read $12,000). To reverse: work every wage over twelve months. One word from him reverses it."
 },
 {
  "id": "DEC-8432",
  "decided": "2026-10-26",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-26 under his rulings DEC-7938 and DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. $10,000 a month from July with $1,000 into a 401(k) read $5,000 − $358 − $1,000 = $3,642 a month. It reads $10,000 − $717 − $1,000 = $8,283 a paid month — the month Your base pay, the Income summary and This month already print. The outside reviewer's reading, the average over twelve months ($4,142), is not used. To reverse: show the twelve-month average. One word from him reverses it."
 },
 {
  "id": "DEC-8434",
  "decided": "2026-10-26",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-26 under his ruling DEC-0178, made without asking him, as his order of 2026-09-30 says. Single, $60,000 of wages and $50,000 of rent read 12% on Base pay and 22% on the Income summary. Both read 22%. With two wages and other income the note under the bracket reads “on both wages and your other income, filing jointly”. To reverse: band on the wages alone. One word from him reverses it."
 }
]
```
