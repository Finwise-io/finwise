# Cash flow evidence — part 03 of 08: The Cash flow tab: Income

9 cases. Read `moneykeel_audit_cf-evidence_brief_v01.md` first. Answer each case with one JSON line, in the format the brief gives.

## The cases

Each case: the figure and the tenet, what the first reviewer said it lacked, the figure's own record, the evidence (by the render's key in the next section), the decisions that name the figure (quoted at the end), our own tests and their results, and our status. Our status is not the answer.

```json
[
 {
  "case": "MK-CF-M-006#5",
  "figure": "MK-CF-M-006",
  "figure_label": "YOUR SOURCES — Base salary",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for YOUR SOURCES — Base salary. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "YOUR SOURCES — Base salary",
   "unit": "money",
   "grain": "one earner",
   "screens": [
    "/cashflow"
   ],
   "answers": "Each earner’s base pay, as it was entered, with whether it was entered before tax or as take-home.",
   "formula": "the base salary of each earner, in the period it was entered",
   "inputs": [
    "MK-XS-I-023 salary and other income",
    "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
   ],
   "decisions": [
    "NEVER CONVERTED SILENTLY: the amount is shown in the period it was entered, and the period is said beside it."
   ],
   "refusal": "No salary entered — the row does not appear; the door to enter it does.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$4,200"
   }
  },
  "evidence": {
   "render": "INC_OK_TAB",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "You · Salary — steady",
    "found_at_render_line": 14
   },
   "printed_under": "MK-CF-M-006",
   "printed_texts": [
    "$4,200",
    "$5,000"
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
     "$4,200",
     "$5,000"
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
    "test": "MK-CF-M-006 YOUR SOURCES — Base salary › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-006; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-006#6",
  "figure": "MK-CF-M-006",
  "figure_label": "YOUR SOURCES — Base salary",
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
   "label": "YOUR SOURCES — Base salary",
   "unit": "money",
   "grain": "one earner",
   "screens": [
    "/cashflow"
   ],
   "answers": "Each earner’s base pay, as it was entered, with whether it was entered before tax or as take-home.",
   "formula": "the base salary of each earner, in the period it was entered",
   "inputs": [
    "MK-XS-I-023 salary and other income",
    "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
   ],
   "decisions": [
    "NEVER CONVERTED SILENTLY: the amount is shown in the period it was entered, and the period is said beside it."
   ],
   "refusal": "No salary entered — the row does not appear; the door to enter it does.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$4,200"
   }
  },
  "evidence": {
   "render": "INC_OK_TAB",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "You · Salary — steady",
    "found_at_render_line": 14
   },
   "printed_under": "MK-CF-M-006",
   "printed_texts": [
    "$4,200",
    "$5,000"
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
     "$4,200",
     "$5,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html",
    "phones_read": "as the match test holds it (the drawn phone with each dated row and kept item applied by name)",
    "phones_that_hold_this_screen": [
     5
    ],
    "the_rendered_line": "You · Salary — steady",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Cash flow"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/cashflow_matches_v01.test.tsx",
     "test": "E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "81–86",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-006 YOUR SOURCES — Base salary › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phone that hold this screen (5) — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it"
 },
 {
  "case": "MK-CF-M-007#6",
  "figure": "MK-CF-M-007",
  "figure_label": "YOUR SOURCES — Self-employment",
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
   "label": "YOUR SOURCES — Self-employment",
   "unit": "money",
   "screens": [
    "/cashflow"
   ],
   "answers": "Self-employment income, net, in the period it was entered.",
   "formula": "the self-employment amount as entered, monthly or yearly",
   "inputs": [
    "MK-XS-I-023 salary and other income"
   ],
   "refusal": "None entered — the row does not appear.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$24,000"
   }
  },
  "evidence": {
   "render": "INC_OK_TAB",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Self-employment",
    "found_at_render_line": 20
   },
   "printed_under": "MK-CF-M-007",
   "printed_texts": [
    "$24,000"
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
     "$24,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html",
    "phones_read": "as the match test holds it (the drawn phone with each dated row and kept item applied by name)",
    "phones_that_hold_this_screen": [
     5
    ],
    "the_rendered_line": "Self-employment",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Cash flow"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/cashflow_matches_v01.test.tsx",
     "test": "E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "81–86",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0375",
   "DEC-8368"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-007 YOUR SOURCES — Self-employment › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phone that hold this screen (5) — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it"
 },
 {
  "case": "MK-CF-M-008#5",
  "figure": "MK-CF-M-008",
  "figure_label": "YOUR SOURCES — Bonus",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for YOUR SOURCES — Bonus. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "YOUR SOURCES — Bonus",
   "unit": "money",
   "per": "year",
   "screens": [
    "/cashflow",
    "/income-manager"
   ],
   "answers": "The bonus for the year and the month it lands.",
   "formula": "the bonus as entered, a year; shown in the month it lands, never spread",
   "inputs": [
    "MK-CF-I-009 bonus",
    "MK-XS-I-059 the month a bonus lands"
   ],
   "decisions": [
    "A LUMP THAT LANDS ONCE IS NEVER AVERAGED across the year (founder, 2026-08-28)."
   ],
   "refusal": "None entered — the row does not appear.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$12,000/year"
   }
  },
  "evidence": {
   "render": "INC_OK_TAB",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Bonus",
    "found_at_render_line": 23
   },
   "printed_under": "MK-CF-M-008",
   "printed_texts": [
    "$12,000"
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
     "$12,000"
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
    "test": "MK-CF-M-008 YOUR SOURCES — Bonus › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-008; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-008#6",
  "figure": "MK-CF-M-008",
  "figure_label": "YOUR SOURCES — Bonus",
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
   "label": "YOUR SOURCES — Bonus",
   "unit": "money",
   "per": "year",
   "screens": [
    "/cashflow",
    "/income-manager"
   ],
   "answers": "The bonus for the year and the month it lands.",
   "formula": "the bonus as entered, a year; shown in the month it lands, never spread",
   "inputs": [
    "MK-CF-I-009 bonus",
    "MK-XS-I-059 the month a bonus lands"
   ],
   "decisions": [
    "A LUMP THAT LANDS ONCE IS NEVER AVERAGED across the year (founder, 2026-08-28)."
   ],
   "refusal": "None entered — the row does not appear.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$12,000/year"
   }
  },
  "evidence": {
   "render": "INC_OK_TAB",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Bonus",
    "found_at_render_line": 23
   },
   "printed_under": "MK-CF-M-008",
   "printed_texts": [
    "$12,000"
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
     "$12,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html",
    "phones_read": "as the match test holds it (the drawn phone with each dated row and kept item applied by name)",
    "phones_that_hold_this_screen": [
     5
    ],
    "the_rendered_line": "Bonus",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Cash flow"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/cashflow_matches_v01.test.tsx",
     "test": "E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "81–86",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-008 YOUR SOURCES — Bonus › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phone that hold this screen (5) — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it"
 },
 {
  "case": "MK-CF-M-009#6",
  "figure": "MK-CF-M-009",
  "figure_label": "YOUR SOURCES — Stock vesting (equity)",
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
   "label": "YOUR SOURCES — Stock vesting (equity)",
   "unit": "money",
   "per": "year",
   "screens": [
    "/cashflow",
    "/income-manager"
   ],
   "answers": "What vests in this calendar year, valued at the price entered.",
   "formula": "the vests whose date names this calendar year, each shares × price per share, added up — a vest with a year and no month counted, one with no date not counted (\"vest date not entered\"); typed as one yearly figure, that figure",
   "inputs": [
    "MK-CF-I-010 equity vesting",
    "MK-XS-I-005 holding price"
   ],
   "refusal": "No equity entered — the row does not appear.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$20,000/year"
   }
  },
  "evidence": {
   "render": "INC_OK_TAB",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/^(Stock vesting \\(equity\\)|Equity comp)$/",
    "found_at_render_line": 29
   },
   "printed_under": "MK-CF-M-009",
   "printed_texts": [
    "$20,000"
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
     "$20,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html",
    "phones_read": "as the match test holds it (the drawn phone with each dated row and kept item applied by name)",
    "phones_that_hold_this_screen": [
     5
    ],
    "the_rendered_line": "Equity comp",
    "drawn_on_those_phones": [
     {
      "phone": 5,
      "line": 20,
      "text": "Equity comp"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Cash flow"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/cashflow_matches_v01.test.tsx",
     "test": "E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "81–86",
     "holds_the_phone_with_the_line": true
    }
   ]
  },
  "decisions": [
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-009 YOUR SOURCES — Stock vesting (equity) › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 5 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-010#6",
  "figure": "MK-CF-M-010",
  "figure_label": "YOUR SOURCES — Rental property",
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
   "label": "YOUR SOURCES — Rental property",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow",
    "/income-manager"
   ],
   "answers": "What the rental brings in each month after its running costs.",
   "formula": "(rent − running costs) for each rental, added up",
   "inputs": [
    "MK-CF-I-007 rental income"
   ],
   "refusal": "No rental entered — the row does not appear.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$1,200/month"
   }
  },
  "evidence": {
   "render": "INC_OK_TAB",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/^Rental (property|income)$/",
    "found_at_render_line": 26
   },
   "printed_under": "MK-CF-M-010",
   "printed_texts": [
    "$1,200"
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
     "$1,200"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html",
    "phones_read": "as the match test holds it (the drawn phone with each dated row and kept item applied by name)",
    "phones_that_hold_this_screen": [
     5
    ],
    "the_rendered_line": "Rental income",
    "drawn_on_those_phones": [
     {
      "phone": 5,
      "line": 17,
      "text": "Rental income"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Cash flow"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/cashflow_matches_v01.test.tsx",
     "test": "E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "81–86",
     "holds_the_phone_with_the_line": true
    }
   ]
  },
  "decisions": [
   "DEC-0375"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-010 YOUR SOURCES — Rental property › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 5 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-011#6",
  "figure": "MK-CF-M-011",
  "figure_label": "YOUR SOURCES — Social Security · pension",
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
   "label": "YOUR SOURCES — Social Security · pension",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "Guaranteed income being received now — Social Security, pension, annuity and other — in a month.",
   "formula": "Social Security + pension + annuity + other, each brought to a monthly amount",
   "inputs": [
    "MK-XS-I-020 Social Security monthly amount",
    "MK-XS-I-022 pension monthly amount",
    "MK-XS-I-035 annuity income",
    "MK-XS-I-036 other guaranteed income"
   ],
   "refusal": "None being received — the row does not appear.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
    "answer": "$2,100/month"
   }
  },
  "evidence": {
   "render": "INC_OK_TAB",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Social Security · pension",
    "found_at_render_line": 32
   },
   "printed_under": "MK-CF-M-011",
   "printed_texts": [
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
     "$2,100"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html",
    "phones_read": "as the match test holds it (the drawn phone with each dated row and kept item applied by name)",
    "phones_that_hold_this_screen": [
     5
    ],
    "the_rendered_line": "Social Security · pension",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Cash flow"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/cashflow_matches_v01.test.tsx",
     "test": "E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks",
     "kind": "test",
     "phones": [
      5
     ],
     "result": "passed",
     "lines": "81–86",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-8368"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-011 YOUR SOURCES — Social Security · pension › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phone that hold this screen (5) — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it"
 },
 {
  "case": "MK-CF-M-012#5",
  "figure": "MK-CF-M-012",
  "figure_label": "RECEIVED · <month> — each payment",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for RECEIVED · <month> — each payment. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "RECEIVED · <month> — each payment",
   "unit": "money-cents",
   "grain": "one payment",
   "screens": [
    "/cashflow",
    "/income-manager"
   ],
   "answers": "Each payment that has actually arrived this month, and when.",
   "formula": "the income records dated inside the month",
   "inputs": [
    "MK-NW-I-004 the activity records"
   ],
   "refusal": "Nothing received yet this month.",
   "ruled": "2026-09-27",
   "worked": {
    "given": "Two $3,600 salary payments landed in September, on the 15th and the 30th; one landed on 31 August.",
    "answer": "$3,600.00"
   }
  },
  "evidence": {
   "render": "CF_INC",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Sep 30 · Salary",
    "found_at_render_line": 19
   },
   "printed_under": "MK-CF-M-012",
   "printed_texts": [
    "$3,600.00",
    "$3,600.00"
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
    "entered_keys_unchanged": 6,
    "of": 7,
    "what_the_sync_rewrote": {
     "onboardingProfile": {
      "grossWorkedBack": {
       "as_entered": null,
       "after_the_sync": true
      },
      "landsTypical": {
       "as_entered": null,
       "after_the_sync": "7200"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$3,600.00",
     "$3,600.00"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": false
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-8375",
   "DEC-8387"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-012 RECEIVED · <month> — each payment › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-012; a sync of the same household left 6 of 7 entered values exactly as typed and rewrote onboardingProfile: grossWorkedBack, landsTypical, salaryMode; the figure prints the same after it. Edits on another screen are not shown."
 }
]
```

## The renders — each screen as it rendered, with the store before and after

Every line in order (`[icon]` is an icon); every figure printed under its identifier; every value the person entered, before the screen opened and after; and the same household arriving by a cloud sync.

```json
{
 "CF_INC": {
  "screen": "CashFlowScreen",
  "day": "2026-09-30",
  "taps": "pressed the \"Income tab\" button",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('cashflow', H_RECV, '2026-09-30', {}, tab('Income'))",
  "stored_before_opening": {
   "assetAccounts": [
    {
     "asset_id": "a1",
     "label": "Checking",
     "kind": "checking",
     "tax_bucket": "TAXABLE",
     "balance": 5000,
     "asset_class": "cash"
    }
   ],
   "liabilities": [
    {
     "debt_id": "d1",
     "label": "Mortgage",
     "debt_type": "MORTGAGE",
     "remaining_balance": 228000,
     "interest_rate_apr": 0.0625,
     "minimum_monthly_payment": 2400,
     "payment_type": "installment"
    },
    {
     "debt_id": "d2",
     "label": "Car loan",
     "debt_type": "AUTO",
     "remaining_balance": 14000,
     "interest_rate_apr": 0.069,
     "minimum_monthly_payment": 250,
     "payment_type": "installment"
    }
   ],
   "transactions": [],
   "expenses": [
    {
     "id": "e1",
     "amount": 2300,
     "category": "Rent / Mortgage",
     "store": "Rent",
     "date": "2026-09-01",
     "createdAt": "2026-09-01"
    },
    {
     "id": "e2",
     "amount": 512,
     "category": "Groceries",
     "store": "Grocer",
     "date": "2026-09-07",
     "createdAt": "2026-09-07"
    },
    {
     "id": "e3",
     "amount": 186,
     "category": "Eating out",
     "store": "Diner",
     "date": "2026-09-12",
     "createdAt": "2026-09-12"
    },
    {
     "id": "e4",
     "amount": 250,
     "category": "Debt payment",
     "store": "Car loan",
     "date": "2026-09-12",
     "createdAt": "2026-09-12"
    }
   ],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment"
    ],
    "birthYear": "1975",
    "baseSalary": "7200",
    "salaryMode": "takehome",
    "salaryFreq": "monthly",
    "taxMode": "manual",
    "manualTaxRate": "0",
    "monthlySpending": "3400",
    "spendCats": [
     {
      "id": "rent",
      "label": "Rent / Mortgage",
      "amount": 2300,
      "bucket": "fixed",
      "tier": "need"
     },
     {
      "id": "groceries",
      "label": "Groceries",
      "amount": 700,
      "bucket": "flexible",
      "tier": "need"
     },
     {
      "id": "dining",
      "label": "Eating out",
      "amount": 400,
      "bucket": "flexible",
      "tier": "flex"
     }
    ]
   },
   "incomes": [
    {
     "id": "r1",
     "date": "2026-09-15",
     "source": "Salary",
     "amount": 3600
    },
    {
     "id": "r2",
     "date": "2026-09-30",
     "source": "Salary",
     "amount": 3600
    },
    {
     "id": "r0",
     "date": "2026-08-31",
     "source": "Salary",
     "amount": 3600
    }
   ],
   "retirementAssumptions": {
    "commitments": [
     {
      "label": "Emergency fund",
      "monthlyAmount": 300
     }
    ]
   }
  },
  "other_stored_values_the_household_sets": {
   "nwSetupChoice": "self"
  },
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
   "001  Cash flow",
   "002  September 2026",
   "003  ‹",
   "004  September 2026",
   "005  ›",
   "006  This month",
   "007  Income",
   "008  Expenses",
   "009  Debts",
   "010  THIS MONTH",
   "011  $7,200",
   "012  expected take-home",
   "013  YOUR SOURCES",
   "014  Salary — steady",
   "015  take-home · monthly",
   "016  $7,200 ›",
   "017  Add your income ›",
   "018  RECEIVED THIS MONTH",
   "019  Sep 30 · Salary",
   "020  +$3,600.00",
   "021  Sep 15 · Salary",
   "022  +$3,600.00",
   "023  Your income, all of it",
   "024  the take-home, and what it is taxed on",
   "025  Open ›",
   "026  ＋ Expense"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-006  $7,200",
   "MK-CF-M-047  $7,200",
   "MK-CF-M-012  $3,600.00",
   "MK-CF-M-012  $3,600.00",
   "MK-CF-M-070  $5,000"
  ],
  "after_a_cloud_sync": {
   "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
   "entered_unchanged": {
    "assetAccounts": true,
    "liabilities": true,
    "transactions": true,
    "expenses": true,
    "onboardingProfile": false,
    "incomes": true,
    "retirementAssumptions": true
   },
   "figures_printed_by_identifier": [
    "MK-CF-M-031  $7,200",
    "MK-CF-M-006  $7,200",
    "MK-CF-M-047  $7,200",
    "MK-CF-M-012  $3,600.00",
    "MK-CF-M-012  $3,600.00",
    "MK-CF-M-070  $5,000"
   ],
   "whole_screen_the_same": false
  }
 },
 "INC_OK_TAB": {
  "screen": "CashFlowScreen",
  "day": "2026-09-28",
  "taps": "pressed the \"Income tab\" button",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('cashflow', H_INC_OK, '2026-09-28', {}, tab('Income'))",
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
   "001  Cash flow",
   "002  September 2026",
   "003  ‹",
   "004  September 2026",
   "005  ›",
   "006  This month",
   "007  Income",
   "008  Expenses",
   "009  Debts",
   "010  THIS MONTH",
   "011  $13,865",
   "012  expected take-home",
   "013  YOUR SOURCES",
   "014  You · Salary — steady",
   "015  before tax · every 2 weeks · $5,898/month take-home",
   "016  $4,200 ›",
   "017  Sam · Salary — steady",
   "018  before tax · monthly · $3,500/month take-home",
   "019  $5,000 ›",
   "020  Self-employment",
   "021  net · yearly",
   "022  $24,000 ›",
   "023  Bonus",
   "024  lands in March",
   "025  $12,000/year ›",
   "026  Rental income",
   "027  1 property",
   "028  $1,200 ›",
   "029  Equity comp",
   "030  RSU grants",
   "031  $20,000/year ›",
   "032  Social Security · pension",
   "033  guaranteed income",
   "034  $2,100/month ›",
   "035  Add your income ›",
   "036  RECEIVED THIS MONTH",
   "037  Nothing received yet this month.",
   "038  Your income, all of it",
   "039  the take-home, and what it is taxed on",
   "040  Open ›",
   "041  ＋ Expense"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-031  $5,898",
   "MK-CF-M-006  $4,200",
   "MK-CF-M-031  $3,500",
   "MK-CF-M-006  $5,000",
   "MK-CF-M-007  $24,000",
   "MK-CF-M-008  $12,000",
   "MK-CF-M-010  $1,200",
   "MK-CF-M-009  $20,000",
   "MK-CF-M-011  $2,100",
   "MK-CF-M-047  $13,865"
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
    "MK-CF-M-031  $5,898",
    "MK-CF-M-006  $4,200",
    "MK-CF-M-031  $3,500",
    "MK-CF-M-006  $5,000",
    "MK-CF-M-007  $24,000",
    "MK-CF-M-008  $12,000",
    "MK-CF-M-010  $1,200",
    "MK-CF-M-009  $20,000",
    "MK-CF-M-011  $2,100",
    "MK-CF-M-047  $13,865"
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
 "Cash flow": "`MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html` **frame 1, This month — APPROVED 2026-09-28** (*\"Approved\"*, DEC-0440: the four-tab architecture from v02 with This month and Expenses revised in v07; v02 and v07 are dated and archived). The folder also holds `income-end-to-end_v07`, `look-ahead_v04` and `filing-status-question_v03`, each with a \"What changed from vNN, and why\" block; where the architecture file and a detail file disagree, the detail file wins. **Traced 2026-09-27**; the per-screen rows below were added 2026-10-02 so step 1.a reads one row per screen. **BUILT 2026-10-03, This month only (frames A and B):** compared word for word and rebuilt — a Planned card and an Actual card, every row spelled out; `src/screens/__tests__/cashflow_matches_v01.test.tsx` holds it. Three differences are named in that test: the words under the planned inflow show in both frames, the ＋ Expense button stays, and the future-paycheck card stays (he ruled on its arithmetic on 2026-09-08). **Expenses, Income and Debts (frames C to F) built the same day**, each held word for word by the same test, which lists every named difference (fourteen across the four tabs — the future-paycheck card, the payoff plan with the mortgage comparison he moved here in DEC-0157, and the doors a person needs that the drawing does not draw). **2026-10-24, eight READ THIS FIRST rows (the phones not redrawn):** rows add up to the total printed under them (DEC-7937); the month's take-home is Your base pay's, after the 401(k) (DEC-7938); one-time income has its own choice and lands once (DEC-7940); the budget editor's card is this month's plan (DEC-7939); Log a payment to the cent (DEC-7943); a past or future month's card words, the spoken rows (DEC-7946, DEC-7950); a late entry on a past month's list and the info dot beside its sentence (DEC-7949, DEC-7948); a dated bill on top of the typed budget (DEC-7951). Held by `cashflow_matches_v01.test.tsx`, 7 of 7, and the Cash flow journeys, 14 of 14 and 15 of 15, on 2026-10-24. **2026-10-25/26, 32 dated READ THIS FIRST rows on cash-flow v01 (the phones not redrawn).** By decision: DEC-8355, DEC-8356, DEC-8357, DEC-8358, DEC-8359, DEC-8360, DEC-8361, DEC-8362, DEC-8363, DEC-8364, DEC-8365, DEC-8366, DEC-8367, DEC-8368, DEC-8369, DEC-8370, DEC-8375, DEC-8378, DEC-8379 (CF-MMFIX-A); DEC-8392, DEC-8412, DEC-8413 (the draw sheet, the mortgage comparison, the paycheck's return); DEC-8344, DEC-8455, DEC-8457, DEC-8458, DEC-8459, DEC-8460, DEC-8461, DEC-8462, DEC-8463, DEC-8464, DEC-8422 (FIX-MONTH and NW-MMFIX); DEC-8443, DEC-8449, DEC-8453 (FIX-INCOME-B); the article before the return (CLEANUP-TESTS, 2026-10-26). CF-MMFIX-A wrote its 15 rows of 2026-10-25 after the code, not before (mock-first not kept in order). **The register's September household moved (DEC-8459):** planned surplus $1,150 → $3,450, free after the goal $850 → $3,150, October's outflow $6,050 → $3,750, planned expenses $3,400 → $1,100, actual expenses $2,998 → $698; the outflow, the surplus and Home's $7,200 / $3,248 / $3,952 do not move. **2026-10-27/30, fifteen dated READ THIS FIRST rows on cash-flow v01 (the phones not redrawn), all written before the code:** rows rounded once and totals to the cent, $400.80 (DEC-8922); a mortgage counted once, rows 44 and 56, +$2,950 (DEC-8919); nothing ranked on a rate not entered (DEC-8923); a month before tracking (DEC-8955); the surplus with its sign (DEC-8956); /year (DEC-8957); the budget editor's shares to two decimals (DEC-8958); the paycheck to the cent, bold (DEC-8954); the Debts total line (DEC-8959); the month switcher's sizes (DEC-8960); Log an expense (DEC-8964); every box title on a bar (DEC-8915); the tab bar and the dot (DEC-8927, DEC-8926); the logo row of 2026-10-30 (his DEC-8914), the phones not redrawn. | —"
}
```

## The drawing — `MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html`

**READ THIS FIRST — ADDED AFTER THIS MOCKUP · BUILD 54. Each row says whose decision it is: his, in his own words with the day he gave them, or the lead’s, made without asking him under his order of 2026-09-30. (Corrected 2026-10-31: this line said every row was his ruling and approved, which was untrue of the lead’s rows.)** These were ruled after this drawing was approved, during work on Build 54 (the build on TestFlight). They are in the app’s code unless a line says ‘Not built yet’, and reach a phone with the next build cut. The phones below are not redrawn: where a line here and a phone disagree, this line is the design.

Its dated rows, every one, as written on the drawing (94):

```json
[
 {
  "Ruled": "2026-10-04",
  "What changed, against the phones below": "Kept as built though not drawn below: the ‘＋ Expense’ button on every tab; ‘Import a statement ›’ at the foot of Expenses; rows under ‘Show all N’ open in the full list; ‘Your income, all of it — Open ›’ under Income; on Debts, PAYOFF PLAN with the mortgage comparison, each debt’s monthly payment and interest on its line, and ‘+ Add debt account’ under the list.",
  "His words, or where it came from": "“Rest - keep it.”",
  "Record": "DEC-1560 · DEC-0157",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-04",
  "What changed, against the phones below": "Planned: every debt is taken from Debts (as drawn), and the Rent / Mortgage budget line is not counted when the home’s mortgage is in Debts. Where that happens, This month and Expenses say: ‘Your Rent / Mortgage budget line is not counted here: your home’s mortgage, …, is in Debts and is counted from there.’ Actual: unchanged — a debt counts when its payment is logged.",
  "His words, or where it came from": "“Once user enters mortgage or any debt - the app deduct it directly … Actual expenses - we wait for debt to be paid, and not assume it is paid, similar to mock up.”",
  "Record": "DEC-1923",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-04",
  "What changed, against the phones below": "Debts: a mortgage says which property it is on.",
  "His words, or where it came from": "“Properties, mortgages, and debt we should ask user to name. … no mortgage without property.”",
  "Record": "DEC-1925",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-10",
  "What changed, against the phones below": "Every count written in words takes its plural from one list of words and plurals, so it is right for 0, 1 and many — Expenses: ‘Entered by hand · 1 item’, ‘Imported · 12 purchases’; Debts: ‘across 1 debt’.",
  "His words, or where it came from": "“15 - why not go ahead and make a list of words and plurals.”",
  "Record": "DEC-4082",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-10",
  "What changed, against the phones below": "Cash flow when retired (not drawn below): under DRAW COMES FROM, an account with no tax type gets one line naming it — ‘Brokerage — tax type not stated; counted as taxable until you choose.’ — and a tap opens that account’s editor. The draw-steer sheet says the same. No line when every account has a tax type.",
  "His words, or where it came from": "“…An account with no tax type would be counted as taxable for the plan, with a line naming it: “Brokerage — tax type not stated; counted as taxable until you choose.” … approved”",
  "Record": "DEC-4105",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-21",
  "What changed, against the phones below": "DRAWING ERROR, every frame — the top bar’s menu button is drawn with semicircle ends (border-radius 19px on a button 30px tall), copied from the code. His ruling of 2026-09-25 is rounded corners, not semicircle ends, for the buttons on every screen: the corner is corrected to 12 , the one corner of a button and of a choice in the app. Its size, colours and words do not change. The round icon buttons at the right of the bar stay circles: a circle has no ends. The phones are not redrawn. Line added 2026-10-21.",
  "His words, or where it came from": "“make the buttons same as all radio buttons across all screens — rounded corners not semicircle ends”",
  "Record": "DEC-0231 · DEC-4529",
  "State": "Drawing corrected by this line — in the code since 2026-10-21"
 },
 {
  "Ruled": "2026-10-23",
  "What changed, against the phones below": "This month, PLANNED (not drawn below): a debt whose monthly payment was never entered keeps its row, and the row reads ‘payment not entered’ where the amount would be. There is then no planned surplus: the band reads —, and under the rows: ‘Car loan’s payment is not entered, so there is no planned surplus — we won’t guess one.’ It read ‘+No budget set — …’ with a budget set, and the debt’s row printed a sentence written for the master file. ACTUAL: unchanged. Home’s THIS MONTH’S CASH FLOW box now prints this tab’s own ACTUAL · SO FAR figures (Income, Outflow (expenses + debt), Left = ‘= Actual surplus so far’). Line added 2026-10-23.",
  "His words, or where it came from": "Not a decision of his: made under his tenet 3 (approved 2026-10-09: ‘Something never entered shows as ‘not entered’ and the reason, never as $0 or a default that looks like an answer.’, DEC-3523) without asking him; found by the outside re-run of Performance (OpenAI), screen check MK-CF-M-002 tenet 3. One word from him reverses it. To reverse: give the debt’s row and the surplus their earlier words.",
  "Record": "DEC-3523 (tenet 3) · DEC-0345",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-23",
  "What changed, against the phones below": "Expenses (frames C and D), PLANNED EXPENSES: each group is what is planned for this month , the same figure This month’s Expenses row deducts. A once-a-year bill counts in the month it falls, never as a twelfth: with a $700 everyday budget and a $1,200 bill in December, September reads Everyday expenses $700 · = Total $700 and no Once in a while row (it read Once in a while $100 · = Total $800 while This month read Expenses −$700); December reads Once in a while $1,200 · = Total $1,900. A group with nothing planned this month is not drawn. When a budget is set but nothing in it falls this month, the band reads $0 — not ‘—’ and ‘You haven’t set your budget yet’. The words and the layout do not change. The phones are not redrawn. Line added 2026-10-23.",
  "His words, or where it came from": "His rules: big bills that come once get their own list (DEC-0002, 2026-07-19, “cashflow. Approve.”) and his rule that money which comes once counts in its own month, not spread across twelve (DEC-0447); his correction of 2026-09-28 that Expenses is the detail behind This month’s Expenses row, not a second answer. Applied without asking him; one word from him reverses it. To reverse: read the budget’s monthly average on Expenses again.",
  "Record": "DEC-0002 · DEC-0447 · DEC-3523 (tenet 4) · MK-CF-M-001 · MK-CF-M-015",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "A past or future month on This month (not drawn below; last drawn in the archived this-month-and-spending v02, ‘MAY — WHAT ACTUALLY HAPPENED’, ‘NOVEMBER — THE PLAN (AN ESTIMATE)’, ‘usual $4,500 + property tax $2,400’). The band names the month once: ‘SEPTEMBER 2026 — WHAT ACTUALLY HAPPENED’, ‘DECEMBER 2026 — THE PLAN (AN ESTIMATE)’; it read ‘SEPTEMBER 2026 — FINAL — WHAT ACTUALLY HAPPENED’ under a switcher already saying ‘— final’. A future month’s outflow names a dated bill only (‘· incl. Car insurance’), never the everyday budget left over or a debt’s monthly payment (it read ‘· incl. Everyday expenses’). ‘Nothing entered yet. Add your bills ›’ shows only when the month plans $0; it showed in every month without a dated bill, a budget entered. Every screen-reader label on the four tabs now says its row in words — ‘hidden’, never the dots. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: made under tenets 1 and 3 (DEC-3523; Q48 is for a $0 with nothing behind it) without asking him; found by the Cash flow journeys E2E-76, E2E-78 and E2E-80. One word from him reverses it. To reverse: give the band, the outflow’s line and the note their earlier words.",
  "Record": "DEC-3523 (tenets 1, 3) · DEC-0440 · MK-CF-M-048 · MK-CF-M-053",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "This month (frames A and B), and everywhere a month is shown as rows over a total — Home’s THIS MONTH’S CASH FLOW box, a past or a future month, and the lists on Expenses: the rows as printed add up to the total printed under them . Each total is rounded to the dollar as before; the rows share it, each rounded down, and the dollars still missing go to the rows with the most cents left over, so no row is more than a dollar from its exact value and a whole-dollar row never moves. A surplus is the inflow printed less the outflow printed. Frame A’s household with a $6.50 coffee: Expenses entered by hand −$507 and ‘= Actual surplus so far +$893’ (it read +$894 under rows that make $893); Home: Income $5,000 · Outflow (expenses + debt) $4,107 · Left $893 (it read Left $894). The words and the layout do not change. The phones are not redrawn. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: made under tenet 2 (approved 2026-10-09, ‘the rows under a total add up to it’, DEC-3523) and his precision ruling (whole dollars for totals, DEC-0264), by the method the Performance walk already uses; found by the Cash flow journey E2E-69. One word from him reverses it. To reverse: round every row and every total on its own again.",
  "Record": "DEC-3523 (tenet 2) · DEC-0264 · MK-CF-M-002 · MK-CF-M-003 · MK-CF-M-004 · MK-CF-M-051 · MK-CF-M-052 · MK-CF-M-053",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "The inflow on This month, ‘THIS MONTH … expected take-home’ on Income, Home’s Income and the Bill calendar’s In are the take-home Your base pay and the Income summary print: after tax and the 401(k) ; a take-home the person typed, as typed; a rate the person gave not laid on rent; interest and dividends that are reinvested not counted as arriving. $9,000 a month with $1,000 into a 401(k), single: $6,976 (it read $7,976 here while Your base pay read $6,976); a take-home typed as $6,200 reads $6,200 (it read $7,200). The words do not change: they already said ‘after tax and 401(k)’. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: the drawing’s own words (‘after tax and 401(k)’, frame A), his ruling that income before tax is gross less the 401(k) (DEC-0283) and the income drawing’s rule that the take-home someone enters is the take-home (income-end-to-end_v07, rule 5), under tenets 1 and 4; found by the Cash flow journey E2E-71. To reverse: take the tax off the wage and leave the 401(k) in again.",
  "Record": "DEC-0283 · DEC-0440 · DEC-3523 (tenets 1, 4) · MK-CF-M-047 · MK-CF-M-051",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Income (frame 5): ‘Add your income ›’ offers Bonus and One-time income as two choices; it offered ‘Bonus / one-time’, which opened the bonus editor, where a bonus is paid every year, so a one-time $2,000 came back the next September. One-time income opens the ‘Something else’ question (One time, the month it lands); the month is kept with its year, so the money lands once and is not in another year’s taxed income. YOUR SOURCES lists it under its name: ‘Bonus · one-time · lands in September · $2,000 ›’ (it was in THIS MONTH’s figure with no row saying why). Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: his rule that one-time money ‘lands in its own month, rather than being spread across twelve’ (DEC-0447), and the rule under YOUR SOURCES that every stored source is visible (pre-48 audit A3); found by the Cash flow journey E2E-70. To reverse: one choice, ‘Bonus / one-time’, to the bonus editor, and no row for other income.",
  "Record": "DEC-0447 · DEC-3523 (tenets 2, 4) · MK-CF-M-027 · MK-CF-M-047",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "The budget editor, ‘Your budget’ (opened by ‘Set your budget’ and by the planned rows; not drawn below): its card is this month’s plan , the figures This month’s PLANNED prints. With nothing set it reads ‘− Expenses (plan) — not set’ and ‘= Planned surplus —’ (it read $0 and $2,350 beside This month’s ‘— not set’); with a $1,200 bill in December, September’s card reads without it (it read $100 a month of it); the Rent / Mortgage line is not counted when the home’s mortgage is in Debts. A screen reader names each box under ‘Monthly limits’ by its category (‘Groceries, monthly limit’); it heard ‘No limit’ fifteen times. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: made under tenets 3 and 4 (DEC-3523) and his rulings DEC-0002, DEC-0447 and DEC-1923; found by the Cash flow journey E2E-73. To reverse: give the card its own typical month again.",
  "Record": "DEC-3523 (tenets 3, 4) · DEC-0002 · DEC-0447 · DEC-1923 · MK-CF-M-001 · MK-CF-M-002",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Debts (frame 6), ‘Log a payment ›’ (the sheet is not drawn): the amount it offers is the payment to the cent — a $386.42 car payment is offered as 386.42; it was offered as ‘386’, so Log recorded $386 and left the balance 42¢ too high. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: his precision ruling (an expense at two decimals, DEC-0264) under tenet 1; found by the Cash flow journey E2E-74. To reverse: offer the payment rounded to the dollar again.",
  "Record": "DEC-0264 · DEC-3523 (tenet 1) · MK-NW-M-010",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Expenses, for a past month (not drawn below): an expense dated in that month but entered after the month’s record was saved — a statement imported later — is listed, and says so under its name: ‘Groceries · added after September closed — not in September’s figures’. Under ‘= Actual expenses, all sources’: ‘$150 of it was added after September closed — not in September’s figures.’ The month’s card on This month stays as it was (‘Frozen — past months never change under you.’), so the list and the card never disagree without saying why. Debts: the mortgage comparison’s ‘ⓘ’ sits beside its last sentence rather than at its end, and a screen reader says it as ‘About How we calculate your odds’. Line added 2026-10-24.",
  "His words, or where it came from": "The lead’s rulings of 2026-10-24 on the Cash flow journeys E2E-76 and E2E-78: keep his frozen rule and say on the row that the figures leave it out; say every info dot in words. Not a decision of his; one word from him reverses it. To reverse: drop the two lines, and put the dot back inside the sentence.",
  "Record": "DEC-3523 (tenets 1, 4) · MK-CF-M-013 · MK-CF-M-052",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "Expenses (frames C and D), This month’s Expenses row, Home’s THIS MONTH’S CASH FLOW box and the Bill calendar: the monthly budget the person typed is what is spent every month , and a bill with its own month is added in that month only. With the budget typed as $2,000/month ($1,100 bills & fixed, $900 everyday) and $1,200 of car insurance added for December, every other month reads Bills & fixed $1,100 · Everyday expenses $900 · = Total $2,000, and December $3,200. It read Everyday expenses $1,900 · = Total $1,900 in every month: the typed $2,000 was taken to hold $100/month of the bill, and the $1,100 / $900 split was dropped. Where a figure is the planned expenses for a whole year shown by the month — the emergency fund’s months at your planned spend on Net worth, the retirement draw, sign-up’s cash-flow recap — the bill counts once in the year: 2,000 + 1,200 ÷ 12 = $2,100 (it read $2,000). The must-pay figure is the typed $2,000 (it read $1,900). The words and the layout do not change. The phones are not redrawn. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: made under his rules DEC-0002 (big bills that come once get their own list, so a bill that lands once a year is not lost inside a monthly average) and DEC-0447 (money that comes once counts in its own month), and tenet 1 (DEC-3523). No ruling of his says a typed budget already holds such a bill. Found by the Cash flow journeys’ test H4. Applied without asking him; one word from him reverses it. To reverse: read the typed budget as holding a twelfth of each dated bill again.",
  "Record": "DEC-0002 · DEC-0447 · DEC-3523 (tenet 1) · B-24 · MK-CF-M-001 · MK-CF-F-221 · MK-CF-F-008 · MK-CF-F-002 · MK-CF-F-009",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-24",
  "What changed, against the phones below": "This month (frames A and B), Expenses (frames C and D) and Home’s due-soon reminder: a debt counts in a month only if a payment falls in that month — from its first payment to its payoff, and a balance due in full once, in the month it is due, at its balance — the rule a later month’s plan card and the Bill calendar already read. With a $7,200 take-home, a $3,400 budget, the $2,400 mortgage, a $250 car loan whose first payment is Oct 28, a $300 loan paid off in August and a $1,000 tax bill due in full Sep 20, September’s PLANNED reads Mortgage −$2,400 · Expenses −$3,400 · Tax bill — due in full −$1,000 · = Planned surplus +$400, the figure the Bill calendar’s September holds (it read +$850, with the car loan and the paid-off loan and without the tax bill). The car loan is not under ACTUAL as ‘due 28th · $0’ in September; MONTHLY RECURRING EXPENSES reads Mortgage $2,400 (it read $2,650); the tax bill is on the BIG-TICKET RADAR at $1,000; one debt there reads ‘Your mortgage never appears here. It is the same every month, …’ (it read ‘never appear … They are’). October’s plan card is unchanged: $1,150. The phones are not redrawn. Line added 2026-10-24.",
  "His words, or where it came from": "Not a decision of his: made under tenets 1 and 4 (DEC-3523) and his rule that every debt is taken from Debts (DEC-1923); found by PF-TOOLS while it settled MK-CF-M-001 to 004. Applied without asking him; one word from him reverses it. To reverse: count every debt’s payment in this month again, whatever its dates.",
  "Record": "DEC-3523 (tenets 1, 4) · DEC-1923 · MK-CF-M-002 · MK-CF-M-004 · MK-CF-M-016 · MK-CF-M-049 · MK-CF-F-156 · MK-CF-F-005 · MK-XS-F-004",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Debts (frame 4), not a drawn state: a debt whose monthly payment was never entered — say a mortgage added with its property and its payment left blank. Its row reads ‘payment not entered’ where ‘$X/month min’ stands; under the total a line names it in Net worth’s words: ‘Lake house mortgage · payment not entered, so it is not included. Enter it to include.’; and the payoff plan gives no debt-free date: ‘Lake house mortgage’s payment is not entered, so there is no payoff date — we won’t guess one.’ It read ‘never at this rate’ and ‘At this payment your balance grows faster than you pay it down’, as if the payment were $0, and the row printed a sentence about debts due in full before ‘/month min’. The total owed counts its balance; the monthly payments leave its payment out.",
  "His words, or where it came from": "Tenet 3, approved 2026-10-09 (DEC-3523): Unknown is not zero. Something never entered shows as ‘not entered’ and the reason, never as $0 or a default that looks like an answer. Found by the Cash flow measurer on 2026-10-25. The refusal is This month’s, in the same words (2026-10-23). The lead’s decision, made without asking him; to reverse it, count a payment never entered as $0 again.",
  "Record": "DEC-3523 · MK-CF-M-071 · MK-CF-M-073 · MK-CF-M-058",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "The budget editor, ‘Your budget’ (opened by ‘Set your budget’ and by the planned rows; not drawn below): under each bucket the rows are that bucket’s own expenses this month and add up to it , and the buckets’ plans add up to ‘− Expenses (plan)’. An expense dated the 1st stays in its month in a US time zone, and a debt payment is not an expense row (it is under Debt this month). Frame C’s household: Fixed $22 / $200 · Utilities $22 / $200; Flexible $1,678 / $1,800 · Other $1,075 / $700 · Grocery $418 / $900 · Gas $185 / $200. The same expenses with the budget typed as $1,100 bills & fixed and $900 everyday: Fixed $22 / $1,100 · Utilities $22; Flexible $1,678 / $900 · Other $1,075 · Grocery $418 · Gas $185 — it read Fixed $22 over Debt payment $400 · Utilities $22, and Flexible $1,678 over Other $653 · Grocery $418 · Gas $185: sixteen purchases dated Aug 1 were read as Jul 31. The card says ‘Your budget’ once, under the editor’s own title, and ‘= Planned surplus +$350’ as This month prints it (it read $350). With no budget set there is no bar and no ‘$0 spent so far · $0 left · of $0 plan’. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under tenets 2 and 3 (DEC-3523) and this drawing’s rule 6, ‘Nothing is guessed. No plan set → ‘not set’, never $0 dressed as an answer.’ (CF-20, CF-21, CF-22). To reverse: read the rows from the categories’ own sums again, and print the bar and its two lines with no budget.",
  "Record": "DEC-3523 (tenets 2, 3) · MK-CF-F-014 · MK-CF-F-221 · MK-CF-M-001 · MK-CF-M-002 · MK-CF-M-013 · MK-CF-M-015",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Every tab, Home’s THIS MONTH’S CASH FLOW box and the budget editor read the day of an expense or an income where the person is . A day picked or typed (‘2026-08-01’) is that day: the budget editor and the Expenses screen read it as Jul 31 in a US time zone, and the Expenses screen saved an edited Aug 1 expense back as Jul 31. A purchase an older build stamped as an instant is the day it was on the person’s clock: 6:30pm on Aug 31 in California is August’s (it was filed under September). The Expenses screen saves the day and time as typed, and a repeating bill or income lands on its own day (one due on a calendar day landed the evening before). The words and the layout do not change. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under tenets 1 and 4 (DEC-3523) (CF-21, the whole class: twelve readers in nine files). To reverse: read each date as a moment in London again.",
  "Record": "DEC-3523 (tenets 1, 4) · MK-CF-F-148 · MK-CF-F-014 · MK-CF-F-212 · MK-CF-F-220 · MK-CF-F-189 · MK-XS-F-176 · MK-XS-F-177",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Expenses (frame C), PLANNED EXPENSES: the budget is listed the way it was entered, as frame C draws it — each category given an amount, in the order entered, then what is left of the monthly total as Other: Gas $200 · Grocery $900 · Utilities $200 · Other $700 · = Total $2,000 (it read Bills & fixed $200 · Everyday expenses $1,800). A once-a-year category is a row in its own month only: with Groceries $700 and Car insurance $1,200 in December, September reads Groceries $700 · = Total $700 and December Groceries $700 · Car insurance $1,200 · = Total $1,900. For a budget entered by category this line replaces the group names in the lines of 2026-10-23 and 2026-10-24 above (Everyday expenses, Once in a while); a budget typed only as bills & fixed and everyday expenses still reads Bills & fixed · Everyday expenses, as they say. The total does not change: it is This month’s Expenses row. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under this drawing’s frame C (DEC-0440) and his rules DEC-0002 and DEC-0447; no ruling of his names the groups (CF-09). To reverse: list the budget’s three groups again.",
  "Record": "DEC-0440 · DEC-0002 · DEC-0447 · MK-CF-M-001 · MK-CF-M-015 · MK-CF-F-227",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "This month (frame B) and Expenses (frame D) — an account with no budget set: no ‘after tax and 401(k)’ under the inflow and no ‘same every month’ under the recurring debts, as drawn. With a budget set (frames A and C) both print, as drawn. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under this drawing’s frames B and D (CF-11). To reverse: print both lines in every state.",
  "Record": "DEC-0440 · MK-CF-F-156",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Income (frame 5), YOUR SOURCES: every source the household has is listed under the drawing’s names, at $0 or with no value yet — two rentals that cover their costs read ‘Rental income · 2 properties · $0 ›’, and RSU grants with no value entered ‘Equity comp · RSU grants · — ›’ (both were listed only once worth more than $0, as ‘Rental property · net’ and ‘Stock vesting (equity)’). DRAWING ERROR: the grey line under ‘Add your income ›’ — ‘opens the steady-or-varies pop-up — variable earners fine-tune month by month’ — is set in this drawing’s own note style and describes a pop-up that became the Your base pay screen on 2026-08-27; it is not printed. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under this drawing’s frame 5 and tenet 1 (DEC-3523) (CF-12). To reverse: list a source only once it is worth more than $0, under its old names.",
  "Record": "DEC-0440 · DEC-3523 (tenet 1) · MK-CF-M-009 · MK-CF-M-010",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "A person who has entered nothing yet (not drawn below). Each section shows its figure, says why, and offers ONE door: This month — the two set-up steps sit under a quiet grey label, ‘SET UP YOUR MONTH — 2 STEPS’ (it was a dark-green bar with no total); Income — THIS MONTH $0, then ‘Nothing entered yet. Add your income ›’ once, which opens the same chooser (the door was printed twice in a row); Expenses — MONTHLY RECURRING EXPENSES $0 with ‘Nothing entered yet. Add your debts ›’ under it, opening Debts (it had nothing under it); Debts — YOUR DEBT $0 and ‘Nothing entered yet. Add your debts ›’, opening the debt editor (it read ‘across 0 debts · $0/month in payments · ~$0/month interest’, ‘No debts tracked — if that's true, it's all yours. 🎉’, ‘+ Add debt account’ as a second door, and ‘Tap a debt to edit • Hold to delete’ with nothing to tap). Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under his rulings DEC-0260 and DEC-0431 (a fresh account keeps its shape, the figure reads $0, ‘Nothing entered yet.’ says why, and the door sits beneath) and tenet 3 (DEC-3523) (CF-16 to CF-19). To reverse: give the four tabs their earlier first-day words.",
  "Record": "DEC-0260 · DEC-0431 · DEC-3523 (tenet 3) · MK-CF-M-037",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Debts (frame 6): each debt is a row in one card, as drawn, with no icon before its name; its line reads ‘· ’ with the space; a time left is said for a loan paid in fixed payments only — a card’s minimum floats with its balance, so the Visa reads ‘22.90% — the costliest · $110/month min · ~$61/month interest’ (it added ‘· 3 years left’) and the car loan ‘6.40% · 3 years left · $300/month min · ~$52/month interest’. A mortgage names the property it is on — ‘5.00% · on Lake house · 15 years left · …’ — and one on no property reads, in amber, Net worth’s own sentence: ‘Your mortgage “Chase” is not on a property. A mortgage is always on a property — open it and say which one.’ (the line of 2026-10-04 above said this was in the code; it was not on this tab). PROGRESS draws its bar, filled to the share paid down: 4,100 ÷ 17,100 = 24%. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under this drawing’s frame 6 (DEC-0440) and his rule DEC-1925, “Properties, mortgages, and debt we should ask user to name. … no mortgage without property.” (CF-03, CF-05, CF-06, CF-07, CF-23). To reverse: give each debt its own card and icon again, and say a card’s time left.",
  "Record": "DEC-0440 · DEC-1925 · MK-CF-O-018 · MK-NW-F-106 · MK-CF-M-074 · MK-CF-M-075",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "This month’s inflow, the Income tab’s THIS MONTH, a later month’s Planned inflow and Home’s Income wear ≈ when the take-home is the app’s calculation, as Your base pay prints it: $8,000 a month with $1,000 into a 401(k), single, reads ‘≈$6,196’ (it read $6,196 beside the source line’s ‘≈ $6,196’). A take-home the person typed has none: ‘$5,000’. The mark is written one way, ‘≈$6,196’, with no space. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under the income drawing’s rule 9 (income-end-to-end_v07: ‘Every estimate is prefixed ≈’) and tenet 1 (DEC-3523) (CF-24). To reverse: print the take-home without ≈ on these four.",
  "Record": "DEC-3523 (tenet 1) · MK-CF-M-047 · MK-CF-M-051 · MK-CF-M-031",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Appearance, every frame, built to the drawing: each card runs edge to edge with square corners, and every band total sits on the rows’ one right edge (it sat 12 points left of them); the Income and Debts sections are named by quiet grey labels — THIS MONTH, YOUR SOURCES, RECEIVED THIS MONTH, YOUR DEBT, YOUR DEBTS, PROGRESS (they were dark-green bars with no total); the IMPORTED tag is grey; ‘pay first’ has no fill; ‘Show all …’ is dark green at 800; ‘Log a payment ›’ is bold; a row’s figure is bold (700) and a total heavier (800); the date under the title is the drawing’s lighter grey. DRAWING ERROR: the sub-tab chips are drawn with square corners; a choice’s corner is 12 (DEC-0231). DRAWING ERROR: the type sizes are off the app’s one scale (13.5, 12.5, 12, 11.5, 10.5, 9); they are built at its steps — rows and every money figure 15, totals bold (DEC-0093), sub-lines, bands and tags 11, sub-tabs, empty-state lines and the date 13. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. Made under this drawing (DEC-0440), his rulings DEC-0093 (every money figure one size, totals bold, one right edge) and DEC-0231, and the screen standard 2.3 (a group with no total is a quiet label) (CF-01, CF-02, CF-13, CF-14, CF-15). To reverse: give the cards their rounded corners and the bands their earlier padding.",
  "Record": "DEC-0440 · DEC-0093 · DEC-0231",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "DRAWING ERRORS, kept as built: Debts (frame 6) reads ‘across 2 debts · $410/month in payments’ — $110 for the Visa and $300 for the car loan (the drawn $310 leaves $10 for the Visa). An expense row and a payment received print to the cent — ‘$100.00’, ‘+$3,100.00’ (his precision ruling, an expense at two decimals, DEC-0264); totals stay whole dollars. The radar row for a connected card (frame C’s first radar row) cannot occur: no card can be connected yet, so it is not printed, and rule 3 below still holds. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. The app is right under DEC-0264 and tenet 1 (DEC-3523) (CF-04, CF-08, CF-10). To reverse: nothing to undo in the app; the phones are not redrawn.",
  "Record": "DEC-0264 · DEC-3523 (tenet 1) · DEC-4529 · MK-CF-M-014 · MK-CF-M-012 · MK-CF-M-071",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Debts, PAYOFF PLAN, the mortgage comparison (not drawn below; kept by DEC-0157): after federal tax when the person’s federal tax bracket is known — the bracket the Income summary shows. 4.10% mortgage, 4.30% Treasury, 24% bracket, $173,111 owed: ‘Your mortgage costs 4.1%. A ten-year Treasury pays 4.3% today — 3.27% after your 24% federal tax bracket.’ then ‘So a dollar into your mortgage saves you more than the same dollar would earn sitting in Treasuries — about $1,440/year at your balance.’ It read ‘They are close enough that neither choice is clearly better …’ (−0.20 points before tax). The last sentence’s second half reads ‘The Treasury is shown after federal tax (it pays no state tax), the mortgage without any interest deduction.’ With no bracket known (no income entered) the rates line ends ‘… pays 4.3% today, before tax.’ and the second half reads ‘Before tax: a Treasury’s interest is taxed, so after tax it pays less than this.’ Both replace ‘Tax usually widens this gap rather than closing it, but that depends on your own return.’, which is not always so. A payment that never clears the loan , with an extra typed: ‘At this payment the loan never clears, so there is no lifetime figure.’ where the lifetime sentence was silently left out; and a loan that clears after 1,200 months is run to the month it clears ($100,000 at 6% with $501/month: 1,247 months; it stopped at 1,200 with about $20,700 still owed). Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25 on MK-CF-F-043 (CFR-3) under tenet 7 (DEC-3523) and his DEC-0160 (“what would be the net saving or cost?”); the 1,247 months under tenets 1 and 2. Same sentence shape whichever way it falls (DEC-0161). To reverse: compare before tax again and drop the two halves; the 1,200-month stop is not to be restored.",
  "Record": "DEC-0160 · DEC-0161 · DEC-3523 (tenets 1, 2, 7) · MK-CF-F-043 · MK-CF-F-125 · MK-CF-O-004 (the bracket)",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "A later month (not drawn below) with no budget set: ‘Planned outflow (expenses + debt) — not set’, then This month’s own sentence and its door — ‘Your debts are here, but you haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.’ · Set your budget — and no planned surplus. October read ‘Planned outflow $2,650 · = Planned surplus $4,550’, the take-home less the debts, as if nothing were spent. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the outside measurement of Cash flow’s screens (OpenAI, measured by CFR-5) and built by CF-MMFIX-A. One word from him reverses it. Made under DEC-7939 and tenet 3 (DEC-3523) (MK-CF-M-049). To reverse: work the later month’s surplus without a budget again.",
  "Record": "DEC-7939 · DEC-3523 (tenet 3) · MK-CF-M-048 · MK-CF-M-049",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Debts (frame 6): a payment the person set above the minimum reads as theirs — ‘24.00% — the costliest · $300/month · your payment’ (it read ‘$300/month min’) — and the total line adds up what is paid: a $300 card payment and a $250 car loan read ‘across 2 debts · $550/month in payments’ (it read $450, the minimums). A payment set below the minimum reads ‘$200/month min · the payment you set is below it’. Each debt’s interest a month prints under the interest’s own figure. This line does not change the payoff plan’s figures. Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the outside measurement of Cash flow’s screens (OpenAI, measured by CFR-5) and built by CF-MMFIX-A. One word from him reverses it. Made under tenets 1 and 5 (DEC-3523) (MK-CF-M-073; F1). To reverse: call every payment the minimum, and add up the minimums.",
  "Record": "DEC-3523 (tenets 1, 5) · MK-CF-M-073 · MK-NW-M-012 · MK-CF-M-057",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Income (frame 5): ‘Social Security · pension · guaranteed income’ is what arrives now from outside your savings — Social Security, a pension, an annuity, another — and only once you said you receive it: $2,400 of Social Security with $1,500/month taken from a 401(k) reads $2,400/month (it read $3,900 — a withdrawal is a draw on savings), and a Social Security estimate typed in the Plan is not listed as received (it read $2,900/month). Self-employment entered per month reads ‘net · monthly’ (it read ‘net · yearly’ when the question’s ‘Per month’ was left as it was). Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the outside measurement of Cash flow’s screens (OpenAI, measured by CFR-5) and built by CF-MMFIX-A. One word from him reverses it. Made under his rule DEC-0244 (the guaranteed income is the outside sources) and tenets 1 and 4 (DEC-3523) (MK-CF-M-011, MK-CF-M-007). To reverse: add the withdrawals back into the row and read a period not stored as yearly.",
  "Record": "DEC-0244 · DEC-3523 (tenets 1, 4) · MK-CF-M-011 · MK-CF-M-007 · MK-CF-F-076",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "This month’s YOUR FUTURE PAYCHECK card (not drawn below) says, under its figure, what its dollars are and what it assumes, from the projection itself: ‘In today’s dollars · assumes a 6.00% return and 2.40% inflation a year’ (the household’s own rates). Cash flow when retired (not drawn below): the card that read ‘SURPLUS — OCT’ reads ‘YOUR PAYCHECK — OCT’, and its pace line ‘Spent $X of your $Y paycheck this month’ — it is what everyday expenses and debt payments are paid from, and Surplus is the one word for what is left after everything out (the canon’s row 26, added the same day). Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the outside measurement of Cash flow’s screens (OpenAI, measured by CFR-5) and built by CF-MMFIX-A. One word from him reverses it. Made under his rulings DEC-2164 (the figure is what it buys today) and DEC-0088 (an explanation names every figure it assumes), and his one-term order (DEC-0382; canon row 1) (MK-CF-M-022, MK-CF-M-023, MK-CF-M-078). To reverse: drop the line, and call the retired card a surplus again.",
  "Record": "DEC-2164 · DEC-0088 · MK-CF-M-022 · MK-CF-M-023 · MK-CF-M-078",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "YOUR FUTURE PAYCHECK’s line of 2026-10-25 (not drawn below): the ‘a’ or ‘an’ before the return is chosen by the app’s one article rule, so an 8.00% return reads ‘assumes an 8.00% return and 2.40% inflation a year’ (it read ‘assumes a 8.00% return’). A 6.00% return reads as the line above says. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; built by CLEANUP-TESTS, held by the article guard (src/domain/_shared/article.test.ts). Made under the article rule (DEC-7306) and the one list of words (DEC-4082). One word from him reverses it. To reverse: type ‘a’ before the return again.",
  "Record": "DEC-7306 · DEC-4082 · MK-CF-M-022",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "The budget editor with no budget set: a bucket reads ‘Fixed $2,300 · no limit’, as its categories do (it read ‘$2,300 / $0’, a limit nobody set). Line added 2026-10-25.",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the outside measurement of Cash flow’s screens (OpenAI, measured by CFR-5) and built by CF-MMFIX-A. One word from him reverses it. Made under tenet 3 (DEC-3523) (F5). To reverse: print the bucket’s $0 plan again.",
  "Record": "DEC-3523 (tenet 3) · MK-CF-M-015",
  "State": "In the code since 2026-10-25"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Where the draw comes from (the draw-order sheet, opened from Cash flow when retired; not drawn): a gain drawn from taxable accounts is taxed stacked on the year’s income, across the 0%, 15% and 20% bands, as the IRS Schedule D worksheet does — single, $48,111.17 of taxable income and a $3,311.43 gain: $1,338.83 at 0% and $1,972.60 at 15%, $295.89 (it read $0, the whole gain at the 0% of the first dollar). The pre-tax money drawn the same year sits under the gains too. The rates line reads ‘Rates used — yours, calculated: 12% on pre-tax draws · on gains, 0% until your taxable income passes $49,450, then 15% · gains are 33% of your taxable holdings’ value.’ (it read ‘· 0% on gains ·’); above the 15% band’s top it reads ‘20% on gains’. The same line then states the growth the money is run on: ‘Growth used: 6.00% a year — the typical return, with nothing set aside for retirement, less 2.50% inflation.’ — the Retirement cockpit’s own return (a return set on the Plan, else the blended benchmark of the retirement accounts, e.g. ‘7.00% a year — the blended benchmark’, else the typical 6%), less the one inflation rate; it ran a flat 5.5% stand-in, never said (the lead’s ruling of 2026-10-25 on the measurer’s second question).",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside audit of 2026-10-24 (OpenAI, Cash flow part 16 and the source checks), made without asking him, under tenets 1 and 7 (DEC-3523) and the published rule (IRS Rev. Proc. 2025-32 §4.03; Schedule D Tax Worksheet). One word from him reverses it. To reverse: tax every dollar of gain at the rate of the first.",
  "Record": "DEC-3523 (tenets 1, 7) · MK-CF-F-104 · MK-PL-F-010",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Debts, PAYOFF PLAN (not drawn below; DEC-1560): a plan whose payments do get ahead of the interest but are still owing after a thousand years reads in words, with what is still owed, and never a date — debt-free ‘not within 1,000 years’, total interest ‘—’, and under them ‘Not paid off within 1,000 years at this rate — $X still owed then. Add extra to make progress.’, the Goals tab’s own sentence. ‘never at this rate’ stays for payments that cannot beat the interest. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s rulings of 2026-10-26 on FIX-BILLS’ findings, made without asking him, as his order of 2026-09-30 says; built by CF-MMFIX-A. One word from him reverses it. Made under tenet 1 (DEC-3523) on FIX-BILLS’ payoff walk (MK-CF-F-034). To reverse: print the month the walk stopped as the debt-free date.",
  "Record": "DEC-3523 (tenet 1) · DEC-1560 · MK-CF-M-058 · MK-CF-M-059 · MK-CF-F-034",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "A month’s dated bills are read one way on every card (datedBillsIn): a later month’s ‘Planned outflow (expenses + debt) · incl. …’ and the retired paycheck card’s ‘− Big bills this month (…)’ name only bills that fall on a date of their own — never the month’s everyday expenses and never a debt: a balance due in full is a debt, counted from Debts, and a later month’s outflow no longer names it (September read ‘· incl. Tax bill — due in full’). The figures do not change. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s rulings of 2026-10-26 on FIX-BILLS’ findings, made without asking him, as his order of 2026-09-30 says; built by CF-MMFIX-A. One word from him reverses it. Made under his rule DEC-0002 (big one-time bills get their own list) and tenet 4 (DEC-3523). To reverse: give each card its own reading of the month’s bills again.",
  "Record": "DEC-0002 · DEC-3523 (tenet 4) · MK-CF-M-048 · MK-CF-M-078 · MK-CF-F-107",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "This month (frames A and B), Expenses (frames C and D), the budget editor and Home’s THIS MONTH’S CASH FLOW box: a debt in Debts is counted once, from Debts, even when the budget also has a line for it . A mortgage in Debts that is on no property yet, beside a Rent / Mortgage budget line, is taken as that line: the line is not counted, and the screen says ‘Your Rent / Mortgage budget line is not counted here: your mortgage, Mortgage, is in Debts and is counted from there. Place it on your home in Net worth, so we know they are the same.’ The budget’s own ‘Debt payment’ line, and a line named as a debt is (‘Car loan’), are not counted either: ‘Your Car loan budget line is not counted here: Car loan is in Debts and is counted from there.’ With a $7,200 take-home, a $3,400 budget ($2,300 of it Rent / Mortgage), a $2,400 mortgage on no property and a $250 car loan, September’s PLANNED reads Mortgage −$2,400 · Car loan −$250 · Expenses −$1,100 · = Planned surplus +$3,450 (it read +$1,150: the mortgage counted twice); a $250 Car loan budget line beside the $250 car loan plans $250 of outflow, not $500. Placing the mortgage on a property that is not the home puts the Rent / Mortgage line back. It moves the figures of the 2026-10-24 line on a debt counting in a month only if a payment falls in it, for its household (the $3,400 budget has a $2,300 Rent / Mortgage line and the mortgage is on no property): September’s PLANNED reads Mortgage −$2,400 · Expenses −$1,100 · Tax bill — due in full −$1,000 · = Planned surplus +$2,700 (it read +$400), and October’s plan card $3,450 (it read $1,150). Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under his rules DEC-1923 (“the app deduct it directly … instead of leaving it for user to add it to planned expenses”) and DEC-2440, on CFR-5’s open question and CFR-2’s MK-CF-O-020-C05. To reverse: count the Rent / Mortgage line as rent until a home is placed, and count every budget line however it is named.",
  "Record": "DEC-1923 · DEC-2440 · MK-CF-O-020 · MK-CF-M-001 · MK-CF-M-002 · MK-CF-M-048",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Debts (frame 6), PAYOFF PLAN: the plan pays what the person pays — each debt at the payment they set, never less than its minimum — plus the extra a month. A $9,000 card at 24% with a $200 minimum paid at $300, and a $14,000 car loan at 6.9% at $250, on Oct 1, 2026: ‘$550 /month total’, debt-free Jun 2031, $7,647 total interest (it read $450 /month total, Oct 2033, $14,787 — the minimums). This replaces the words ‘This line does not change the payoff plan’s figures’ in the 2026-10-25 line on a payment set above the minimum. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under his ruling DEC-0641 (Q53, “what actually leaves”) and tenet 1 (DEC-3523), on CFR-5’s MK-CF-M-073 (tenets 1 and 5). To reverse: run the plan on the minimums again.",
  "Record": "DEC-0641 · DEC-3523 (tenet 1) · MK-CF-M-072 · MK-CF-M-058 · MK-CF-M-059 · MK-CF-M-073 · MK-CF-F-034 · MK-CF-O-018",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Debts (frame 6), and wherever a debt’s rate is shown: a rate never entered reads ‘rate not entered’, never 0.00% — a mortgage added with its property (the form does not ask its rate) or a rate box left blank in the debt editor; a typed 0 is 0.00%. The row has no ‘/month interest’: ‘rate not entered · on Lake house · $1,900/month min’. The line under YOUR DEBT reads ‘across 2 debts · $2,150/month in payments’, and under it ‘Lake house mortgage’s rate is not entered, so there is no interest figure — we won’t guess one.’ PAYOFF PLAN: ‘Lake house mortgage’s rate is not entered, so there is no payoff date — we won’t guess one.’ (a payment not entered already reads so). Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under tenet 3 (DEC-3523, unknown is not zero) and his ruling DEC-0296 (“an unknown input produces no number and a reason — never a default”), on NW-MMFIX’s follow-up finding (a mortgage’s rate is never asked and was saved as 0). To reverse: save a blank rate as 0% again.",
  "Record": "DEC-3523 (tenet 3) · DEC-0296 · MK-CF-M-057 · MK-CF-M-058 · MK-CF-M-059 · MK-CF-O-018 · MK-CF-F-034",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Debts (frame 6), PAYOFF PLAN, a debt whose payment was never entered: the plan gives no date and no ‘never’, from the plan itself — ‘Car loan’s payment is not entered, so there is no payoff date — we won’t guess one.’ (it was the screen that held the words back; the plan said ‘never’, and the Goals tab printed ‘⚠ Minimum payments don’t cover the interest’). Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under tenet 3 (DEC-3523) and DEC-0296, on CFR-3’s MK-CF-O-018-C03. To reverse: let the plan call an unentered payment ‘never’ again.",
  "Record": "DEC-3523 (tenet 3) · DEC-0296 · MK-CF-O-018 · MK-CF-F-034 · MK-CF-M-058",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Cash flow when retired, YOUR PAYCHECK (not drawn below), and Home’s paycheck card: the draw is worked out at the Plan’s own return — the return set on the Plan, else the blended benchmark of the accounts set aside for retirement, else 6.00% — the figure the Retirement cockpit runs (it was a flat 5.50% whenever no return was set). Under ‘This year ~…’ a line says it: ‘The draw assumes 6.00% a year — the typical return, with nothing set aside for retirement.’ With no birth year entered there is no paycheck to work out: under ‘YOUR PAYCHECK’ the card reads ‘Your birth year is not entered, so there is no paycheck to work out — we won’t guess one.’ (it worked one out at age 68). Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under tenet 4 (DEC-3523, one plan, one return) and his ruling DEC-0296, on CFR-4’s MK-CF-F-225 (its case C05 and its open question). To reverse: run the paycheck at 5.50% and at 68 again.",
  "Record": "DEC-3523 (tenets 3, 4) · DEC-0296 · MK-CF-F-225 · MK-CF-M-078",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Cash flow when retired, DRAW COMES FROM (not drawn below), its ‘Why this order?’ card and the draw-steer sheet: with no birth year entered, nothing that depends on age is calculated . The order of the kinds of account still shows — Cash, Taxable / brokerage, Pre-tax, Roth does not depend on age — but whether the required withdrawal comes first, and its amount, does: with pre-tax money held, under the order the card reads ‘Your birth year is not entered, so there is no required withdrawal to work out — we won’t guess one.’, in the paycheck card’s words. The steer sheet draws no required-withdrawal row, and its comparison reads ‘Your birth year is not entered, so there is no comparison to work out — we won’t guess one.’ in place of ‘lasts to … · taxes over the plan …’. All three calculated them at age 68, a made-up age. With a birth year entered nothing changes. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says; built by CLEANUP-LEFT. One word from him reverses it. Made under tenet 3 (DEC-3523, unknown is not zero) and his ruling DEC-0296 (an unknown input gives no number and a reason, never a default) — the same class as the paycheck card’s line above. To reverse: work the order at 68 again.",
  "Record": "DEC-3523 (tenet 3) · DEC-0296 · MK-PL-F-004 withdrawalOrder · MK-PL-F-010 drawOrderOutcome · MK-CF-M-070",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Cash flow when retired, YOUR PAYCHECK (not drawn below), Home’s paycheck card, the draw-steer sheet, Roth and Required withdrawals: the return the draw runs on is written the canon’s way, with ‘/year’ — ‘The draw assumes 6.00%/year — the typical return, with nothing set aside for retirement.’ and ‘Growth used: 6.00%/year — the typical return, with nothing set aside for retirement, less 2.50% inflation.’ (it was ‘6.00% a year’); a screen reader still hears ‘6.00% a year’. The figures are unchanged. Each now prints under its own number: the return MK-CF-M-082, the inflation MK-CF-M-083, the sheet’s rates MK-CF-M-084 to 088 (they printed under MK-CF-M-078 and MK-CF-M-022, or with none). Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his and not a new one: his canon row 14 (2026-09-12) — a label says per year as ‘/year’ in printed copy, and ‘a year’ stays in spoken labels (the canon’s own words). The old wording slipped past the canon guard because a ‘%’ stood between the figure and ‘a year’; printing the figure through its declaration showed it. Applied by PF-TOOLS. To reverse: write ‘a year’ again — which the canon guard will then report.",
  "Record": "Canon row 14 · MK-CF-M-082 · MK-CF-M-083 · MK-CF-M-084 · MK-CF-M-085 · MK-CF-M-086 · MK-CF-M-087 · MK-CF-M-088 · MK-CF-F-279",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-26",
  "What changed, against the phones below": "Debts (frame 6), the mortgage comparison under a mortgage: its rates are written to two decimals , as every percent is — ‘Your mortgage costs 4.10%. A ten-year Treasury pays 4.30% today — 3.27% after your 24% federal tax bracket.’ and, with no income entered, ‘Your mortgage costs 5.50%. A ten-year Treasury pays 4.63% today, before tax.’ (it read ‘4.1%’, ‘4.3%’ and ‘5.5%’, the digits each rate happened to have). Nothing else on the card changes. Each figure prints under its own number: MK-CF-M-090 to 095, the bracket under the Income summary’s MK-CF-M-043. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his and not a new one: his precision standard (master question Q49, 2026-09-09) — percents to two decimals, rounded once at display. Applied by PF-TOOLS while giving the card’s figures their identifiers. To reverse: write each rate with the digits it has, and state that precision on its row.",
  "Record": "Q49 · MK-CF-F-043 · MK-CF-M-043 · MK-CF-M-090 · MK-CF-M-091 · MK-CF-M-092 · MK-CF-M-093 · MK-CF-M-094 · MK-CF-M-095",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "A past month on This month (not drawn below): ‘Frozen — past months never change under you.’ is said only when the month’s record was saved. A month with no record is added up from what is logged in it, and says so: ‘Added up from what is logged for this month — it changes if more is logged.’ Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under tenets 2 and 7 (DEC-3523), on CFR-4’s formula check of MK-CF-F-220 (a month never saved read ‘Frozen’ while it moved from $500 to $600 as purchases were imported). To reverse: print ‘Frozen —’ under every past month.",
  "Record": "DEC-3523 (tenets 2, 7) · MK-CF-F-220 · MK-CF-M-052",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Expenses, for a past month whose record does not say when it was saved (an older record): under ‘= Actual expenses, all sources’, when the list holds more than the month’s record: ‘August’s record does not say when it was saved, so it may leave out later entries — this list holds $150 more than August’s figures.’ A record that says when it was saved names each late entry, as the 2026-10-24 line says. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under tenet 2 (DEC-3523), on CFR-5’s rule check DEC-7949 (the card read $1,360 and the list $1,510 with nothing said). To reverse: say nothing when a record has no saved time.",
  "Record": "DEC-7949 · DEC-3523 (tenet 2) · MK-CF-F-231 · MK-CF-M-013 · MK-CF-M-052",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Expenses (frame C), BIG-TICKET RADAR: a bill of $500 or more with its own month is on the radar in that month only — $1,200 of car insurance due Dec 15 reads, in December, ‘Car insurance · due Dec 15 · $1,200’; October’s radar has nothing for it. It is the month’s dated bill the Bill calendar and a later month’s plan card name (datedBillsIn); the radar never deducts it again. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under his rule DEC-0002 (big one-time bills get their own list) and tenet 4 (DEC-3523), on CFR-2’s MK-CF-F-153-C05 (reading A). To reverse: hand the radar no bills.",
  "Record": "DEC-0002 · DEC-3523 (tenet 4) · MK-CF-F-153 · MK-CF-M-016 · MK-XS-F-004",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "This month, ACTUAL (frames A and B), and Expenses’ DEBT PAYMENTS COUNTED AS EXPENSES and BIG-TICKET RADAR: a payment is matched to the debt it was logged against by the debt itself, never by its name — ‘Log a payment’ now records which debt. A payment logged before this, under a name two debts share, is given to neither: ACTUAL reads ‘Other debt payments −$250 · logged as “Loan” — two of your debts have that name, so it is given to neither’, and Expenses lists it once, ‘Loan payment $250 · two of your debts have that name — counted once’. With one debt of that name it is that debt’s, as before. Line added 2026-10-26.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-25, made without asking him, as his order of 2026-09-30 says; built by FIX-MONTH. One word from him reverses it. Made under his rule DEC-1923 (on the actual side nothing is assumed paid) and tenet 1 (DEC-3523), on CFR-2 and CFR-4’s MK-CF-F-157-C05 and MK-CF-F-150-C05 (one $250 given to the second ‘Loan’, or to both). To reverse: match a payment by its name again.",
  "Record": "DEC-1923 · DEC-3523 (tenet 1) · MK-CF-F-157 · MK-CF-F-150 · MK-CF-F-153 · MK-CF-M-054",
  "State": "In the code since 2026-10-26"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Income tab (frame 5), YOUR SOURCES: a one-time payment with no year reads ‘Gift · one-time · year not entered · $2,000 ›’ — it is counted in no month and no year until its year is known (it read ‘lands in January’ and landed again every year). This month (frames A and B): a rental that loses money is a row of the inflow, ‘Rental (after costs) −$500’, so $7,200 of take-home and a rental losing $500/month read $6,700 in and a planned surplus of +$650 (it read $7,200 and +$1,150). Shares that vest are not money in their month unless sold when they vest; Social Security lands whole except the tax on the part IRS Publication 915 taxes; unemployment pay is a row after tax.",
  "His words, or where it came from": "Not a decision of his: the lead’s, on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under his DEC-0447 and DEC-7940 (lands once), DEC-0012, the same shape as DEC-0179 for vests kept as shares, and tenets 1 and 4. To reverse: drop rows below $0 from the month; land a yearless one-time payment in its next month.",
  "Record": "DEC-0447 · DEC-7940 · DEC-0012 · DEC-0179 · MK-XS-F-004 · MK-CF-M-002 · MK-CF-M-027",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-25",
  "What changed, against the phones below": "Income (frame 5), YOUR SOURCES: the list is the one function every income screen reads (incomeSources, MK-CF-O-016), so a source entered anywhere has its row here, in its own period, under the drawn names and in the drawn order — Salary, Self-employment, Bonus, Other income, Rental income, Equity comp, Social Security · pension — then, when entered, Benefits (‘every month’ or ‘6 months of the year’ · $731/month ›), Child support or alimony (‘not taxed’ · $511/month ›) and Interest & dividends (‘reinvested’ or ‘paid to your bank’ · $1,831/year ›). A rental losing money reads ‘Rental income · 1 property · −$500 ›’; grants with no vest date ‘Equity comp · RSU grants · vest date not entered · — ›’. Each row is the figure the Income summary and Your income print for the same source.",
  "His words, or where it came from": "Not a decision of his: the lead’s follow-up on the outside Cash flow audit of 2026-10-24 (OpenAI), made without asking him, under tenets 1 and 4 (one thing, one number) and his DEC-0181 (no two functions doing the same thing). To reverse: build the list on the screen again.",
  "Record": "DEC-0181 · DEC-3523 (tenets 1, 4) · MK-CF-O-016 · MK-CF-M-006 to 011 · MK-CF-M-027",
  "State": "In the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Expenses (frames C and D), ACTUAL EXPENSES and BIG-TICKET RADAR, and Income (frame 5), RECEIVED THIS MONTH: every row is printed once, from its full value, and the rows under a total add up to that total as printed . An expense, a payment logged and a payment received are written to the cent (the 2026-10-25 line of drawing errors), so each total over them is written to the cent too: ‘= Entered by hand’, ‘= Imported’, the three source bars, ‘Show all N · $X more’, ‘= Actual expenses, all sources’ and the ACTUAL EXPENSES bar. Frame A’s household with a $6.50 coffee and its HELOC and card payments logged as $200.40 each: ENTERED BY HAND $300.00 + $6.50 + $200.00 = $506.50 (it read $506); DEBT PAYMENTS COUNTED AS EXPENSES $200.40 + $200.40 = $400.80 (it read $200 + $200 under $401); ‘= Actual expenses, all sources’ $506.50 + $1,200.00 + $400.80 = $2,107.30 (it read $2,107); each payment on the radar $200.40 (it read $200). A paycheck of $3,100.40 received reads ‘+$3,100.40’ (it read +$3,100.00: rounded to the dollar first, then given cents). Frame C’s own figures, all whole, read $500.00 · $1,200.00 · $400.00 · $2,100.00, ‘Show all 9 · $195.00 more ›’ and ‘Show all 23 · $560.00 more ›’, its radar payments $200.00; frame D’s ACTUAL EXPENSES reads $0.00. A bill on the radar (‘Car insurance · due Dec 15 · $1,200’) stays in whole dollars, as PLANNED EXPENSES and the Bill calendar print it; This month keeps whole dollars that add up to its surplus (the 2026-10-24 line). For these totals this replaces ‘totals stay whole dollars’ in the 2026-10-25 line of drawing errors.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R5 of 2026-10-27 on the round-2 drawing match (CF2-06), made without asking him, as his order of 2026-09-30 says. Made under tenet 2 (DEC-3523, the rows under a total add up to it), which stands above tenet 4 (one form) where the two pull apart, and his precision ruling (an expense at two decimals, DEC-0264). One word from him reverses it. To reverse: print every Expenses total in whole dollars again.",
  "Record": "DEC-3523 (tenets 2, 4) · DEC-0264 · MK-CF-M-014 · MK-CF-M-012 · MK-CF-M-101 (new) · MK-CF-M-016",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "This month (frames A and B), the household of the 2026-10-25 line on a rental that loses money: a $7,200 take-home, a $3,400 budget ($2,300 of it Rent / Mortgage), a $2,400 mortgage the person never placed on a property, a $250 car loan and a rental house losing $500/month. The mortgage is counted once, from Debts, and the Rent / Mortgage line stands down , as the 2026-10-25 line on a debt counted once says for a mortgage on no property: September’s PLANNED reads Inflow $6,700 · Mortgage −$2,400 · Car loan −$250 · Expenses −$1,100 · = Planned surplus +$2,950 (6,700 − 2,400 − 250 − 1,100). It read Expenses −$3,400 and +$650: with one property and one mortgage on none, the app had put the mortgage on the rental by itself, so the line came back and the same $2,300–$2,400 of housing was counted twice. ACTUAL: the $2,300 logged under Rent / Mortgage is the mortgage’s payment, ‘Mortgage −$2,300’, and Expenses entered by hand −$698; = Actual surplus so far +$3,452, as before. The mortgage counts as the rental’s only when the person places it there (the mortgage’s own property, or a name that begins with the property’s, ‘Rental house mortgage’); then the line is rent again and +$650 is right. This corrects the +$650 of the 2026-10-25 line on a rental that loses money; the two lines now read the same.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R3 of 2026-10-27 (CF2-13), worked by hand from what the person entered, made without asking him. Made under his rule DEC-1923 (“the app deduct it directly … instead of leaving it for user to add it to planned expenses”), DEC-2440, tenet 1 and tenet 5 (DEC-3523: the person’s word outranks the app’s guess — the placement was the app’s guess). One word from him reverses it. To reverse: count a mortgage the app placed by itself as the person’s placing again.",
  "Record": "DEC-1923 · DEC-2440 · DEC-3523 (tenets 1, 5) · MK-CF-O-020 · MK-CF-M-002 · MK-CF-M-003",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Debts (frame 6), YOUR DEBTS: nothing is ranked on a rate that is not entered . Under ‘Highest interest rate first’ the debts with a rate come first, highest first, then each debt whose rate is not entered; and while any rate is not entered no debt reads ‘pay first’ and none ‘— the costliest’, because both answers turn on the rate nobody gave. The household of the 2026-10-25 line on a rate never entered (a Lake house mortgage, rate not entered, $1,900/month; a $14,000 car loan at 6.90%, $250/month): Car loan ‘6.90% · $250/month min · ~$81/month interest’ (14,000 × 6.90% ÷ 12 = $80.50), then Lake house mortgage ‘rate not entered · on Lake house · $1,900/month min’. It read the mortgage first with ‘pay first’, and the car loan ‘6.90% — the costliest’. ‘Smallest balance first’ ranks on the balances, which are entered: the car loan reads ‘pay first’, still without ‘— the costliest’.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R6 of 2026-10-27 (CF2-12), made without asking him. Made under tenet 3 (DEC-3523, unknown is not zero) and his ruling DEC-0296 (an unknown input produces no number and a reason — never a default). One word from him reverses it. To reverse: rank a rate not entered as 0% again.",
  "Record": "DEC-3523 (tenet 3) · DEC-0296 · MK-CF-O-018 · MK-CF-M-057",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "A past month on This month (not drawn below) with no saved record: one line says what the figures are, never two that disagree . Before anything was logged at all — frame A’s household in July, its first expense logged in August — the card reads Actual inflow $0 · Outflow (expenses + debt) $0 · = Surplus +$0 and ‘Nothing recorded for this month — it predates your tracking.’, and no more; it also printed ‘Added up from what is logged for this month — it changes if more is logged.’, which says the month was added up. A month after the first thing logged, with no saved record, reads only ‘Added up from what is logged …’; a month with its record saved only ‘Frozen — past months never change under you.’",
  "His words, or where it came from": "Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the round-2 drawing match (CF2-08). Made under the 2026-10-25 line on a past month (DEC-3523 tenets 2 and 7) and tenet 1 (two lines that contradict). One word from him reverses it. To reverse: print both lines again.",
  "Record": "DEC-3523 (tenets 1, 2, 7) · MK-CF-F-220 · MK-CF-M-051 · MK-CF-M-052 · MK-CF-M-053",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "A later month and a past month on This month (not drawn below): the surplus carries its sign , as This month prints it (‘+$350’). The register household’s October: ‘= Planned surplus +$3,450’ (7,200 − 3,750; it read $3,450, no sign); a past month’s ‘= Surplus’ the same way; a month that comes out short reads ‘−$…’. Nothing else moves.",
  "His words, or where it came from": "Not a decision of his: made without asking him; found by the round-2 drawing match (CF2-07). Made under tenet 4 (DEC-3523: one thing, one number, one form) — the class the budget editor’s line of 2026-10-25 fixed. One word from him reverses it. To reverse: print a later and a past month’s surplus without its sign.",
  "Record": "DEC-3523 (tenet 4) · MK-CF-M-049 · MK-CF-M-053",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "This month’s YOUR FUTURE PAYCHECK card (not drawn below): the line under its figure writes each rate the canon’s way, with ‘/year’ — ‘In today’s dollars · assumes a 6.00%/year return and 2.40%/year inflation’ (it read ‘… assumes a 6.00% return and 2.40% inflation a year’, the words of the 2026-10-25 and 2026-10-26 lines, which this replaces). The figures and the article rule do not change: an 8.00% return reads ‘an 8.00%/year return’.",
  "His words, or where it came from": "Not a decision of his and not a new one: his canon row 14 (2026-09-12) — a label says per year as ‘/year’ in printed copy — as the 2026-10-26 line already applied to the retired paycheck and the draw sheet; found by the round-2 drawing match (CF2-09). To reverse: write ‘a year’ again.",
  "Record": "Canon row 14 · MK-CF-M-082 · MK-CF-M-083 · MK-CF-M-022",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "The budget editor, ‘Your budget’ (not drawn below): its share of take-home is written to two decimals — frame A’s household ‘Your expense budget is 40.00% of take-home pay.’ (2,000 ÷ 5,000; it read 40%), the register household’s 15.28% (1,100 ÷ 7,200 = 15.277…%; it read 15%); its doors end in ‘›’ , as every Cash flow door does — ‘Set your budget ›’, ‘Manage ›’, ‘+ Add ›’ (they ended in ‘→’); and its quotes and apostrophes are the typographic ones the drawings use — the marks around ‘+ Add’ in the empty list’s line and around a category’s name in the delete question, and the ’ in ‘plan what you’ll spend’.",
  "His words, or where it came from": "Not a decision of his: made without asking him; found by the round-2 drawing match (CF2-11). Made under his precision ruling (Q49: percents to two decimals), the one door glyph (DEC-0440, the drawing’s ‘›’) and tenet 4 (DEC-3523). One word from him reverses it. To reverse: write the share whole and the doors with ‘→’ again.",
  "Record": "Q49 · DEC-0440 · DEC-3523 (tenet 4) · MK-CF-M-001 · MK-CF-M-031",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Every Cash flow tab, the budget editor and the Bill calendar: an apostrophe inside a word is ’ , as the drawings write it — ‘Based on your plan’s odds …’, ‘No zeros shown until they’re real.’, ‘plan what you’ll spend’, ‘we’ll import it’, ‘make sure it’s a valid CSV’, ‘e.g. Trader Joe’s’, and on the Bill calendar ‘it’s built from …’, ‘it’s in that month’s Out column.’, ‘IF YOU CAN’T PAY EVERYTHING …’, the marks around essential in ‘Mark bills … to see them here.’. One sentence was spelled two ways on one screen. A guard reads Cash flow’s own files and fails on a straight ' inside a word.",
  "His words, or where it came from": "Not a decision of his: made without asking him; found by the round-2 drawing match (CF2-10). The class DEC-8336 fixed on Net worth, under tenet 4 (DEC-3523). The sign-up’s words are FX-CF-B’s and the shared parts FX-SHARED’s. To reverse: nothing to undo in the figures; write ' again.",
  "Record": "DEC-8336 · DEC-3523 (tenet 4)",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "DRAWING ERROR, frames 5 and 6 — the links ‘Add your income ›’ and ‘Log a payment ›’ are drawn at 14 (the drawing’s .link style), a size off the app’s one scale like the six the 2026-10-25 appearance line names (13.5, 12.5, 12, 11.5, 10.5, 9). They are built at 13, the scale’s step for a link and an empty-state line; this line adds 14 to that list. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the record the round-2 drawing match asked for (REC2-06), under the 2026-10-25 appearance line (DEC-0093, the type scale). Nothing changes in the app. To reverse: nothing to undo.",
  "Record": "DEC-0093 · DEC-4529",
  "State": "Drawing corrected by this line — nothing in the app changes"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Every tab: the door to add an expense yourself is ‘Log an expense’ (Expenses, frame D), and the corner button that opens the same sheet reads ‘＋ Expense’ (kept by DEC-1560). ‘Add by hand’ is the account door’s (Home, Net worth, Sharpen your plan, src/constants/doors.ts) and no Cash flow tab prints it: Cash flow’s ‘Add an expense by hand’ door left the tab on 2026-10-03, when Expenses was built to frame C. ‘Entered by hand’ stays: it names where an expense came from (frame C), not a door. The canon carries it as row 27.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-10-27 on workplan row 106 (his two word collisions, 2026-09-14), made without asking him. Made under his one-term order (DEC-0382) and tenet 4 (DEC-3523). The sheet the two open is titled ‘Add expense’ in the shared sheet file; it reads ‘Log an expense’ once FX-SHARED changes it. One word from him reverses it. To reverse: give the expense door other words, on this row and canon row 27.",
  "Record": "DEC-0382 · DEC-1560 · DEC-3523 (tenet 4) · canon row 27",
  "State": "In the code — the door left the tab on 2026-10-03; canon row 27 since 2026-10-27"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). Every phone draws the tab bar with letter shapes above the names (⌂ ◈ ▤ ⇄ ▲), the names 9.5 points; and the top bar 11 points in from each side and 8 above the page, its button 30 points tall with 12.5-point words. His feedback: His words, 2026-08-04 (DEC-0059): “make sure font size and color and overall design are same across all screens.” His UX review of 2026-07-16, as the code records it: ‘it is hard to link menu to button bar’. His words, 2026-09-14 (DEC-0354): “you did not have ‘MoneyKeel’ at the top which every other screen has”; 2026-08-04 (DEC-0059): “make sure font size and color and overall design are same across all screens.” New: The tab bar is the one the app draws: each tab an icon above its name — the same five icons the Menu’s top strip shows, filled on the picked tab, outlined on the others; the picked tab brand green #178F6B with a short green bar (22 × 3 points) above its icon; the other four grey #76766F; names weight 700. One thing changes in the app: the names are 11 points, where they were 10.5 — the one size in the app off the scale (11 · 13 · 15 · 17 · 20 · 24 · 30 · 38). The MoneyKeel top bar starts 4 points below the status bar (the app started it 6 down until today), sits 20 points in from each side and 10 above the page; its button and two round icons are 38 points tall, the button’s words 13 points. The phones are not redrawn.",
  "His words, or where it came from": "Why the app’s bar: Net worth v08, approved 2026-10-01 (DEC-0644), draws its names, colours and green bar; Cash flow v01 (DEC-0440) draws the picked tab #178F6B; the UX design v1.2 says ‘active = brand teal + label bold’; the screen standard says ‘Brand green #178F6B is for buttons and the active tab’; and the Menu mirrors the bar from one list, so a drawn emoji or letter would break the pair. Why 4 · 20 · 10: the account page v01, approved 2026-10-19 (DEC-6457), the newest approved drawing with this bar, and Net worth v08 (DEC-0644) both draw it. Not a decision of his: the lead’s ruling of 2026-10-27, made without asking him, as his order of 2026-09-30 says. To reverse: the names at 10.5 again. To reverse: start the bar 6 points down again.",
  "Record": "DEC-0059 · DEC-0644 · DEC-0440 · DEC-4529 · DEC-0354 · DEC-6457",
  "State": "In the code since 2026-10-27"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Every frame, and the screens they open (the budget editor, the import sheet, Cash flow when retired): every box title sits on a dark-green bar and every sub-title on a light-green bar , edge to edge with square corners (white capitals 11 points, weight 800, on #085041; deep green on #DFF2E9). What moves: This month’s first day, ‘SET UP YOUR MONTH — 2 STEPS’ (the 2026-10-25 line on a person who has entered nothing had made it a quiet grey label); Income (frame 5), THIS MONTH, YOUR SOURCES and RECEIVED THIS MONTH; Debts (frame 6), YOUR DEBT, PAYOFF PLAN, YOUR DEBTS and PROGRESS (the 2026-10-25 appearance line had made them quiet grey labels, as this drawing draws them); Cash flow when retired, DRAW COMES FROM, its two doors ‘Steer it ›’ and ‘Why? ›’ on the line under the bar; the budget editor, YOUR BUDGET, EXPENSES BY BUCKET with each bucket on a light bar that carries its spend and plan (‘FIXED $22 / $200’), DEBT THIS MONTH and CUSTOM CATEGORIES, each door (‘Set your budget ›’, ‘Manage ›’, ‘+ Add ›’) on the line under its bar, and each bucket of the Monthly limits sheet on a light bar; the import sheet, IMPORT FROM EXCEL OR CSV and EXAMPLE CSV FORMAT. The words, the figures and the order do not change. This replaces the quiet labels of the 2026-10-25 lines named. The phones are not redrawn.",
  "His words, or where it came from": "His words: “ContributionRoom, Stress Test screens - both are not standard app design as the standard design says box titles in dark green bar, and sub-titles in light green bar.” (DEC-8839, 2026-10-27). The lead’s ruling R1 of 2026-10-27 makes it app-wide, and the screen-design standard carries it (section 2.3). Applied to Cash flow by FX-CF-A without asking him again. To reverse: give these titles their quiet grey labels again.",
  "Record": "DEC-8839 · DEC-0440 · DEC-3523 (tenet 6)",
  "State": "In the code since 2026-10-27 — row written before the code"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). The expense, payment and budget boxes print a typed figure plain. His feedback: None on these boxes. He approved the income drawing on 2026-08-27 (DEC-0177: “yes”), which draws a money box with its figure as money, ‘$7,000’. New: Every money box on this screen shows its figure the way a figure is printed, while it is typed — ‘$1,000’ where a box was drawn ‘1000’, ‘$192.50’ where ‘192.5’; where the screen prints its own $ just before the box, the box reads ‘1,000’, so the $ is printed once — and it stores the plain amount, so no figure moves. The box keeps its look. A typed letter is refused whole (DEC-3768c). Shares, contracts, rates, days and years keep their plain digits. The phones are not redrawn.",
  "His words, or where it came from": "One figure, one form (tenet 4, DEC-3523): the money boxes of the income screens already show ‘$7,000’ (DEC-8385), and one component, MoneyBox, now draws every money box in the app — src/__tests__/every_money_box_is_moneybox.test.tsx counts them all. Not a decision of his: the lead’s ruling of 2026-10-27, made without asking him, as his order of 2026-09-30 says. To reverse: print the plain figure in the box again.",
  "Record": "DEC-8385 · DEC-0177 · DEC-3768c · DEC-3523",
  "State": "In the code since 2026-10-27"
 },
 {
  "Ruled": "2026-10-27",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). The sheet that ＋ Expense and Log an expense open is not drawn; it was titled ‘Add expense’ with its four group names (EVERYDAY · ONCE IN A WHILE · BILLS & FIXED · MORE) in 11-point grey capitals. Home’s sheet that splits a surplus named GOALS and ACCOUNTS / INVESTING the same way. His feedback: His words, 2026-10-27 (DEC-8839): “the standard design says box titles in dark green bar, and sub-titles in light green bar”. New: Not a drawn state: the expense sheet is titled ‘Log an expense’ (canon row 27, the line above of this date), and the expense sheet’s four group names stand on light-green bars, deep-green capitals 11 points weight 800, edge to edge across the sheet; on Home’s split sheet GOALS and ACCOUNTS / INVESTING stand on the same bars. No figure changes. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his beyond those words: the lead’s ruling R1 of 2026-10-27 makes them app-wide, applied without asking him, as his order of 2026-09-30 says. To reverse: the group names back to grey capitals, and the title to Add expense.",
  "Record": "DEC-8839 · canon row 27",
  "State": "In the code since 2026-10-27"
 },
 {
  "Ruled": "2026-10-30",
  "What changed, against the phones below": "Approved before: this drawing, 2026-09-28 (DEC-0440); Home’s THIS MONTH’S CASH FLOW box is not drawn below. His feedback: His words, 2026-08-04 (DEC-0059): “make sure font size and color and overall design are same across all screens.” New: Home’s box prints its title ‘THIS MONTH’S CASH FLOW’ and says ‘This month’s cash flow’ to a screen reader with ’, as this drawing writes it; both had a straight '. No word and no figure moves. The phones are not redrawn.",
  "His words, or where it came from": "One sentence, spelled one way (tenet 4, DEC-3523): the lead’s rule of 2026-10-25 (DEC-8336), carried to every screen on 2026-10-27 and held by src/__tests__/curly_apostrophe_everywhere.test.ts, which now carries no debt for Home. Not a decision of his: the lead’s ruling of 2026-10-30, made without asking him, as his order of 2026-09-30 says; built by CLEANUP-TESTS. One word from him reverses it. To reverse: type a straight ' in these strings again.",
  "Record": "DEC-8336 · DEC-3523 · DEC-0059 · DEC-0440",
  "State": "In the code since 2026-10-30"
 },
 {
  "Ruled": "2026-10-30",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). Its top bar draws the name typed in two colours, ‘Money’ green and ‘Keel’ navy, as the app drew it until 2026-10-30. No logo decision of his is on record before this one. His feedback: his instruction of 2026-10-30, with his three logo files: “change the logo to attached”. New: The lettering in the top bar is now his logo of 2026-10-30, his dark-green ‘MoneyKeel’ lettering at 84 × 17.1 points, as ‘MoneyKeel/documents/other/moneykeel_pres_mock_brand-wordmark_v02.html’ draws it. Nothing else on the phones moves. The phones are not redrawn.",
  "His words, or where it came from": "His instruction, carried to this drawing by the lead’s row of 2026-10-30, made without asking him, as his order of 2026-09-30 says. To reverse: the old lettering is kept in ‘assets/brand/archive-2026-10-30/’.",
  "Record": "His instruction of 2026-10-30 · ‘moneykeel_pres_mock_brand-wordmark_v02.html’ · DEC-8891",
  "State": "In the code since 2026-10-30"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). The budget editor is not drawn; its lines of 2026-10-24, 10-25 and 10-27 describe it. His feedback: His words, 2026-10-27 (DEC-8839): “the standard design says box titles in dark green bar, and sub-titles in light green bar”; and 2026-08-04 (DEC-0059): “make sure font size and color and overall design are same across all screens.” New: the editor’s card stands under the bar This month’s planned card carries — ‘PLANNED · AUGUST +$350’ in frame A’s household — because the sheet’s own title already reads ‘Your budget’ and the card says it once (the 2026-10-25 line); this corrects ‘YOUR BUDGET’ in the 2026-10-27 line on bars. Its ‘= Planned surplus +$350’ is printed as This month prints it, 15 points weight 800 in the gain green #006300 (it was 20 points weight 700 in the brand green #178F6B, which is kept for buttons and the picked tab), and ‘$300 left · of $2,000 plan’ is in the gain green too, red when over (2,000 − 500 − 1,200 = 300). With the register household’s $2,300 Rent / Mortgage line beside a mortgage on no property, the card says what This month says, under ‘− Expenses (plan) $1,100’: ‘Your Rent / Mortgage budget line is not counted here: your mortgage, Mortgage, is in Debts and is counted from there. Place it on your home in Net worth, so we know they are the same.’ (the $2,300 left the plan with nothing said; the 2026-10-25 line on a debt counted once names this editor). DEBT THIS MONTH writes ‘$2,000/month min’ with no space before /month, as Debts does (it read ‘$2,000 /month min’).",
  "His words, or where it came from": "Not a decision of his: the lead’s round-3 items CF3-01, CF3-02, CF3-03 and CF3-08 (2026-10-31), made under his words above without asking him; under DEC-9228 he judges the built screens on TestFlight. Tenets 1 and 4 (DEC-3523). To reverse: the ‘YOUR BUDGET’ bar, the brand green at 20, no sentence, and the space before /month.",
  "Record": "DEC-8839 · DEC-0059 · DEC-1923 · DEC-3523 (tenets 1, 4) · MK-CF-M-002 · MK-CF-M-056 · MK-NW-M-011",
  "State": "In the code since 2026-10-31 — row written before the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). The expense sheet is not drawn; the 2026-10-27 lines title it ‘Log an expense’. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New: the amount box opens empty — no grey ‘0’ inside it, which reads as an amount entered — and the button says the door’s own words: ‘Log an expense’ while nothing is typed, and ‘Log $6.50’ once $6.50 is (it read ‘Add expense’ and ‘Add $6.50’ under the title ‘Log an expense’). Canon row 27.",
  "His words, or where it came from": "Not a decision of his: the lead’s round-3 items CF3-04 and CF3-05 (2026-10-31), made under his words above without asking him; under DEC-9228 he judges the built screens on TestFlight. The lead’s ruling R16 (empty means empty) and tenet 4 (DEC-3523). To reverse: the grey ‘0’ and the words ‘Add expense’.",
  "Record": "DEC-0296 · DEC-3523 (tenet 4) · canon row 27",
  "State": "In the code since 2026-10-31 — row written before the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). The budget editor’s sheets are not drawn. His feedback: His words, 2026-08-04 (DEC-0059): “make sure font size and color and overall design are same across all screens.” New: every sheet the budget editor opens is titled at the sheet-title size, 20 points weight 800 — ‘Monthly limits’, ‘New category’, ‘Log payment’, ‘Recurring’ and the add or edit sheet (they read 17 points weight 600). The words do not change.",
  "His words, or where it came from": "Not a decision of his: the lead’s round-3 item CF3-06 (2026-10-31), made under his words above without asking him; under DEC-9228 he judges the built screens on TestFlight. The sheet-title size is the lead’s DEC-8931 (2026-10-30). To reverse: the titles at 17/600.",
  "Record": "DEC-0059 · DEC-8931",
  "State": "In the code since 2026-10-31 — row written before the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). The YOUR FUTURE PAYCHECK card is not drawn (its lines of 2026-10-25 to 10-27). His feedback: His words, 2026-08-04 (DEC-0059): “make sure font size and color and overall design are same across all screens.” New: its figure line reads ‘At 65 (ours until you change it): ~$10/month’ for the register household, with one space after the colon (it had two). No figure changes. (Corrected 2026-11-01: this row’s example read ‘At 67: ~$15/month’, which the row of 2026-10-31 below and the app replaced: with no retirement age entered the card retires the person at 65, the plan’s one age. CF4-07.)",
  "His words, or where it came from": "Not a decision of his: the lead’s round-3 item CF3-07 (2026-10-31), made under his words above without asking him; under DEC-9228 he judges the built screens on TestFlight. Tenet 4 (DEC-3523). To reverse: two spaces.",
  "Record": "DEC-0059 · MK-CF-M-022",
  "State": "In the code since 2026-10-31 — row written before the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). It draws its four sub-tabs (This month · Income · Expenses · Debts) as 10-point words with a line under the picked one; the app built them as boxes 40 points tall. His feedback: None on the height of these choices. His standing rule is the 44-point tap (DEC-0141, 2026-08-13: a tap target raised to the 44-point minimum); and DEC-9228 (2026-10-31): he judges the built screens on TestFlight. New: the four sub-tab boxes are 44 points tall (Tap.min), their words centred; the words, the order and the picked tab’s mark do not change. The phones are not redrawn.",
  "His words, or where it came from": "One floor for every choice (tenet 4), held by src/__tests__/every_choice_is_44_points.test.tsx. Not a decision of his: the lead’s, made without asking him. To reverse: the boxes back to 40.",
  "Record": "DEC-0141 · DEC-9228 · NW3-16",
  "State": "In the code since 2026-10-31"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "CORRECTION of the 44-point row of 2026-10-31 above: it said the drawing draws the sub-tabs 40 points tall; the drawing draws them as words with a line under the picked one, and 40 was the built height. The row now says both.",
  "His words, or where it came from": "A drawing row must be true (found by FX-PLAN on Goals v03, 2026-11-01, and checked on every drawing FX-SHARED wrote on). The row had been written from the code’s styles, not from this drawing.",
  "Record": "NW3-16 · NW3-18",
  "State": "Row corrected 2026-11-01"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "YOUR FUTURE PAYCHECK (not drawn on this drawing; the card his ruling of 2026-09-08 keeps): with no retirement age entered, the card states the age the plan retires you at, 65, and says it is ours: ‘At 65 (ours until you change it): ~$X/month’ . It read ‘At 67’ — the card’s own fallback, while the odds beside it retire the person at 65 — so the two figures on one card stood on two ages. With an age entered the line is unchanged (‘At 67: ~$X/month’ for a person who typed 67). Line added 2026-10-31, before the code.",
  "His words, or where it came from": "The lead’s ruling R10 of 2026-10-31, made without asking him, under tenet 2 (DEC-3523): one age for the plan, read by one function (planRetireAgeOf). One word from him reverses it. To reverse: ‘67’ and no mark.",
  "Record": "R10 · NW3-01 · MK-CF-M-022 · DEC-3523",
  "State": "Drawn 2026-10-31, before the code"
 },
 {
  "Ruled": "2026-10-31",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). The expense and split sheets (not drawn) used a handle 40 by 4 in the border grey. His feedback: None on the sheets’ frame. He approved Net worth v08, frames A to G, on 2026-10-01 (DEC-0644: “Quite Instrument v08 - approved all screens from A to G”), whose sheets have corners of 24 and a handle 36 by 4 in the light grey; and DEC-9228 (2026-10-31): he judges the built screens on TestFlight. New: the sheet takes the app’s one sheet frame: grey #F6F7F5, top corners 24, a handle 36 by 4 points in #EEEEE9 with 10 points below it. What is on the sheet does not change. The phones are not redrawn.",
  "His words, or where it came from": "One sheet frame (tenet 4, DEC-3523; NW3-18): every sheet takes SHEET_FRAME and SHEET_HANDLE (src/components/sheetFrame.ts), held by src/__tests__/one_sheet_frame.test.tsx. Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says. To reverse: each sheet back to its own frame.",
  "Record": "DEC-0644 · DEC-9228 · NW3-18",
  "State": "In the code since 2026-10-31"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); Debts is frame 6, and its payoff plan is kept by DEC-1560. The two sections below were drawn on Goals (plan/moneykeel_pres_mock_goals_v01.html, from the build), which Goals v03 (2026-10-31) moves to Cash flow, under Debts. His feedback: His words, 2026-10-04 (DEC-1560): “Rest - keep it.”; and 2026-09-30 (DEC-0641): “Q53 - what actually leaves.” — the record of that decision keeps the minimum for debt-to-income, ‘because debt-to-income is measured on the obligation and not on what someone chooses to pay’. New: Debts carries, under PROGRESS, two boxes each on its dark-green bar, with the figures and words the Goals screen printed, unchanged. DEBT-TO-INCOME — what the debts oblige each month against income before tax, measured on the minimums (DEC-0641), never what someone chooses to pay: frame 6’s household, $110 + $300 = $410 of minimums on $60,000 a year ($5,000 a month), reads ‘8.20%’ · ‘Healthy’ · ‘$410/month in minimum debt payments ÷ $5,000/month income’ · ‘Aim for 20% or less (renters; rent isn’t counted). You’re in good shape.’ (410 ÷ 5,000 = 8.20%; a household with a mortgage is measured against 36%). With no income entered the box says ‘Your income is not entered, so there is no debt-to-income figure — we won’t guess one.’ STUDENT LOAN OUTLOOK — only when a student loan is entered in setup: $30,000 at 5.50% over 10 years reads ‘$30,000 borrowed’ · ‘≈ $326/month once you’re repaying · $9,069 total interest’ · ‘That’s ~6.51% of today’s income — keeping total debt under 20% keeps you comfortable.’ (30,000 × 0.4583% ÷ (1 − 1.004583^−120) = $325.58; 120 × 325.58 − 30,000 = $9,069.46; 325.58 ÷ 5,000 = 6.51%). A loan with no rate or term reads ‘Add an interest rate and term to each loan (in setup) to see the monthly repayment.’ A door that opens Cash flow on Debts — Goals’ ‘Your debts … are on Cash flow, under Debts ›’ — lands on the Debts tab, not on This month. A screen reader hears the corner button as ‘Log an expense from any tab’, so it is never taken for the Expenses tab’s own ‘Log an expense’ door. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-11-01 (a feature reachable from nowhere once Goals v03 sent every Goals door to Plan · Goals), applied without asking him; under DEC-9228 he judges the built screens on TestFlight. The functions are the ones the Goals screen ran, unchanged: MK-CF-F-033 debtToIncome on MK-CF-F-025 minimumDebtService, and MK-CF-F-028 loanPayment. To reverse: take the two boxes off Debts and open Cash flow on This month.",
  "Record": "DEC-0641 · DEC-1560 · DEC-8839 · MK-CF-F-033 · MK-CF-F-025 · MK-CF-F-028 · MK-CF-M-102 to MK-CF-M-108 (new)",
  "State": "In the code since 2026-11-01 — row written before the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). Every phone draws the top bar’s ‘Menu’ button with its words 11 points in from each side. The account page’s drawing, approved 2026-10-19 (DEC-6457), the newest approved drawing with this bar, draws them 13 points in. His feedback: None on the button’s inset. His words on which drawing holds: “If I approved mock up post build - that the latest approval.” (DEC-0808, 2026-09-27). New: DRAWING ERROR, every phone — the button’s words sit 13 points in from each side, as the account page’s drawing draws them and the app draws them; this drawing’s 11 is 2 points short on each side. Its words, height, corner and colours do not change. The phones are not redrawn. Line added 2026-11-01.",
  "His words, or where it came from": "The top bar is the one bar every screen carries (DEC-0354), and its ‘Menu’ and ‘‹ Back’ buttons share one style (src/components/TopBar.tsx, menuBtn). No row named the inset until the drawing match of 2026-10-31 (NW3-14, on Net worth v08). The lead’s reading under DEC-4529: the drawing is left, a dated line corrects it. To reverse: the buttons’ side inset set to 11 in menuBtn, and this line removed.",
  "Record": "DEC-0440 · DEC-6457 · DEC-0354 · DEC-0808 · DEC-4529 · NW3-14",
  "State": "Drawing corrected by this line — the app already shows it"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). No phone draws these three boxes empty: Debts’ ‘Extra / month’, the ‘Log payment’ sheet’s ‘Amount’, and the ‘Amount’ on the ‘Log an expense’ sheet and on the income sheet’s ‘Add income’ tab. (Corrected 2026-11-01: this called the first ‘Add expense’; the rows of 2026-10-27 and 2026-10-31 above and the app title it ‘Log an expense’. CF4-08.) His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”; 2026-10-31 (DEC-9228): “I will review the screens in testflight”. New: each of the three boxes opens empty, with no grey ‘0’ in it; the ‘$’ beside it stays. The two sheet boxes that had no name of their own are named ‘Amount’, the word above them, so a screen reader no longer reads the grey ‘0’ as the name. Nothing else moves. The phones are not redrawn.",
  "His words, or where it came from": "Empty means empty (the lead’s ruling R16 of 2026-10-31, under DEC-0296 and tenet 3, DEC-3523: unknown is not zero): a box nobody filled shows no figure that could be read as an entry. Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says. To reverse: the grey ‘0’ in the empty boxes again. Row written before the code.",
  "Record": "DEC-0296 · DEC-3523 · DEC-9228 · R16",
  "State": "In the code since 2026-11-01"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). No phone draws the allocation boxes of the money sheets empty. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”; 2026-10-31 (DEC-9228): “I will review the screens in testflight”. New: the money sheets’ allocation boxes open empty — the grey ‘$0’ and ‘0%’ are gone; the ‘%’ or ‘$’ unit beside a box stays. Nothing else moves. The phones are not redrawn.",
  "His words, or where it came from": "Empty means empty (the lead’s ruling R16 of 2026-10-31, under DEC-0296 and tenet 3, DEC-3523: unknown is not zero): a box nobody filled shows no figure that could be read as an entry. Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says. To reverse: the grey examples in the empty boxes again. Row written before the code.",
  "Record": "DEC-0296 · DEC-3523 · DEC-9228 · R16",
  "State": "In the code since 2026-11-01"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); Debts is frame 6. The DEBT-TO-INCOME and STUDENT LOAN OUTLOOK boxes are the 2026-11-01 line’s, not drawn on a phone. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New: (1) The sum in DEBT-TO-INCOME works as printed: the minimum payments are a payment, written to the cent, so a $386.42 minimum reads ‘$386.42/month in minimum debt payments ÷ $5,000/month income’ beside ‘7.73%’ (386.42 ÷ 5,000 = 7.7284%; it read ‘$386’, and 386 ÷ 5,000 = 7.72%). Frame 6’s household reads ‘$410.00/month …’ beside ‘8.20%’; this corrects ‘$410/month’ in the 2026-11-01 line. (2) The approximately mark is written one way, against the figure, ‘≈$326/month’, as the 2026-10-25 line on ≈ and 40 of the 45 marks on the live drawings write it (it read ‘≈ $326/month’, and the 2026-11-01 line wrote it so too, which this corrects). (3) A student loan entered in setup is a debt: YOUR DEBT counts it, and never says ‘Nothing entered yet’ above it. With only a $30,000 setup loan, YOUR DEBT reads ‘$30,000’ and under it ‘Includes $30,000 of student loans entered in setup — repayment starts after you graduate.’ (it read ‘$0 · Nothing entered yet. Add your debts ›’ above ‘$30,000 borrowed’). With a $3,200 Visa and a $9,800 car loan beside it: 3,200 + 9,800 + 30,000 = $43,000. (4) A YOUR DEBT of $0 is printed in the grey this drawing gives a $0 with nothing behind it (frame A’s ‘Car loan due 28th $0’, #6B6B66), never in the brand green #178F6B, which is for buttons and the picked tab; a debt above $0 stays red, as drawn. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s rulings R21 (a printed sum works as printed) and R22 (one debt total), and round-4 items CF4-02 and CF4-04, made under his words above and tenets 1, 2 and 4 (DEC-3523) without asking him; under DEC-9228 he judges the built screen on TestFlight. To reverse: the payment in whole dollars, ‘≈ ’ with a space, the setup loan left out of YOUR DEBT, and $0 in brand green.",
  "Record": "DEC-0296 · DEC-3523 (tenets 1, 2, 4) · Q49 · MK-CF-M-103 · MK-CF-M-106 · MK-NW-M-009",
  "State": "In the code since 2026-11-01 — row written before the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Not a drawn state: A student loan entered in setup is owed from the month it is first paid out. One whose first month is still ahead is not owed today: it is not counted in DEBTS on Net worth or YOUR DEBT on Debts, and the screen says so in words — ‘A $30,000 student loan starts in Sep 2027, not counted until then.’ From Sep 2027 it counts. A loan entered with no month counts as owed today, and the screen says ‘The $30,000 student loan has no start month entered, so it counts as owed today.’ Example, on Nov 1, 2026: a $30,000 loan starting Sep 2027, a $3,200 Visa and a $9,800 car loan give DEBTS −$13,000 on Net worth and YOUR DEBT $13,000 on Debts (3,200 + 9,800); the same loan first paid out in Sep 2026 gives $43,000 on both. The phones are not redrawn. Line added 2026-11-01.",
  "His words, or where it came from": "Nothing is owed before the money is lent (the lead’s ruling R22a of 2026-11-01, tenet 2, DEC-3523). One rule for both screens: setupStudentLoans and setupLoanDebts (src/domain/debt). Held by src/screens/__tests__/one_debt_total_r22_2026_11_01.test.tsx. Not a decision of his. To reverse: count every setup loan from the day it is entered.",
  "Record": "R22a · R22 · MK-NW-M-009 · DEC-3523",
  "State": "Drawn 2026-11-01, before the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). It draws ‘Steer it’, ‘Why this order?’, ‘Show all’ and ‘Import a statement’ at the size of their words, under 44 points tall to the touch. His feedback: None on these taps. His standing rule is the 44-point tap (DEC-0141, 2026-08-13: a tap target raised to the 44-point minimum); and DEC-9228 (2026-10-31): he judges the built screens on TestFlight. New: each keeps its drawn size, words and place and takes a touch area 16 points above and below it (Tap.slop), so a finger lands on it across at least 44 points; that does not show on the phone. Nothing on the phones moves. The phones are not redrawn. Line added 2026-11-01.",
  "His words, or where it came from": "One floor for every tap (tenet 4, DEC-3523): Tap.slop, held by src/__tests__/every_choice_is_44_points.test.tsx, whose count of short lines and links in the app is now 0 of 488 (99 that morning, FX-NW’s count, NW4-04). Not a decision of his: the lead’s, made without asking him, as his order of 2026-09-30 says. To reverse: take hitSlop={Tap.slop} off each of these buttons.",
  "Record": "DEC-0440 · DEC-0141 · DEC-9228 · DEC-3523 · NW4-04 · NW3-16 · NW3-17",
  "State": "In the code since 2026-11-01 — row written after the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); Debts is frame 6; the setup loan lines are the 2026-11-01 lines’. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New: a student loan entered in setup is a debt everywhere Debts counts one, counted by the one function Net worth counts debts with (MK-NW-O-003 theNetWorth), so the two screens give one count and one payment total. (1) The count and the payments include an owed setup loan: with a $3,200 Visa ($110/month), a $9,800 car loan ($300/month) and a $30,000 setup loan owed at 5.50% over 10 years ($325.58/month), YOUR DEBT reads ‘$43,000’, then ‘across 3 debts · $736/month in payments’ ($110 + $300 + $325.58 = $735.58), then ‘Includes $30,000 of student loans entered in setup. When repayment starts is not entered.’ (it read ‘across 2 debts · $410/month in payments’ and ‘— repayment starts after you graduate’, words nothing the person entered says; setup asks for the month a loan is paid out, never when repayment starts). (2) STUDENT LOAN OUTLOOK shows whenever a loan is entered in setup, owed today or paid out later; for a later one it says only what was entered: a $30,000 loan paid out from Sep 2027 reads ‘$30,000 borrowed’ · ‘~$326/month once you’re repaying · $9,069 total interest’ · ‘Paid out from Sep 2027. When repayment starts is not entered.’ (the box was not drawn for it). (3) With only a loan paid out later, YOUR DEBT reads ‘$0’ and the later loan’s sentence, ‘A $30,000 student loan starts in Sep 2027, not counted until then.’, and never ‘Nothing entered yet’ — something is entered. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R22b (2026-11-01, CF5-01 to CF5-03), made under his words above and tenets 1 and 4 (DEC-3523) without asking him; under DEC-9228 he judges the built screen on TestFlight. To reverse: count and add up only the debts entered, show the outlook only for an owed loan, and print ‘Nothing entered yet’ beside a later loan.",
  "Record": "DEC-0296 · DEC-3523 (tenets 1, 4) · MK-CF-M-105 · MK-CF-M-106 · MK-NW-M-009",
  "State": "In the code since 2026-11-01 — row written 2026-11-01 (round 5), before the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); Debts is frame 6, the PAYOFF PLAN its second box; the setup loan lines are the round-5 row’s above. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New: a student loan entered in setup and owed today joins the PAYOFF PLAN with its repayment, so the payments line, the plan’s ‘/month total’ and Net worth give one figure. With a $3,200 Visa at 22.90% ($110/month), a $9,800 car loan at 6.40% ($300/month) and a $30,000 setup loan owed at 5.50% over 10 years ($325.58/month), highest rate first, nothing extra, from Aug 2026: ‘/month total’ reads ‘$736’ ($110 + $300 + $325.58 = $735.58; it read ‘$410’). The car loan clears in month 36 and the Visa in month 38, as before; their $410 then goes to the loan, which clears in month 71: debt-free ‘Jul 2032’ (it read ‘Oct 2029’, month 38), and total interest ‘$8,794’ ($996.61 car + $1,479.14 Visa + $6,317.98 loan = $8,793.73; it read ‘$2,476’). A setup loan with no rate or term gives the plan’s own refusal, naming it (its payment is not entered). A loan paid out later stays out of the plan, and the plan names it in Debts’ words: ‘A $30,000 student loan starts in Sep 2027, not counted until then.’ With only a setup loan owed, the plan shows for it alone. The debt rows under the plan stay the debts entered. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling on FX-CF-A’s round-5 ‘Left’ item (2026-11-01: every dollar counted once; payments line, plan total and Net worth agree), made under his words above and tenets 1 and 4 (DEC-3523) without asking him; under DEC-9228 he judges the built screen on TestFlight. To reverse: plan only the debts entered.",
  "Record": "DEC-0296 · DEC-3523 (tenets 1, 4) · MK-CF-M-072 · MK-CF-M-058 · MK-CF-M-059 · MK-NW-M-012",
  "State": "In the code since 2026-11-01 — row written 2026-11-01 (round 5b), before the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); Debts is frame 6, YOUR DEBTS the list of rows under the plan (row 6, DEC-1560); the plan’s figures are the round-5b row’s above. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New: the setup loan owed today is its own row in YOUR DEBTS, in the entered rows’ form, so the rows add up to the plan’s ‘/month total’ (tenet 2). In the round-5b household, highest rate first, the rows read: ‘Visa card’ · ‘22.90% — the costliest · $110/month min · ~$61/month interest’ · ‘−$3,200 ›’; ‘Car loan’ · ‘6.40% · 3 years left · $300/month min · ~$52/month interest’ · ‘−$9,800 ›’; ‘Student loan (from setup)’ · ‘5.50% · 6 years left · $326/month min · ~$138/month interest’ · ‘−$30,000’ (month 71 of the plan’s walk, Jul 2032, is 71 ÷ 12 = 5.9 → 6 years; interest 30,000 × 5.50% ÷ 12 = $137.50 → $138). $110 + $300 + $325.58 = $735.58 → ‘$736’, the plan’s total. The loan’s row has no ‘›’ and does not open: it is changed in setup, so it is not edited, deleted or offered under ‘Log a payment ›’ here. A loan paid out later has no row. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-11-01 on FX-CF-A’s round 5b (a total adds up from the rows printed above it, tenet 2, DEC-3523), made without asking him; under DEC-9228 he judges the built screen on TestFlight. To reverse: list only the debts entered, and take the loan out of the plan with them.",
  "Record": "DEC-0296 · DEC-1560 · DEC-3523 (tenet 2) · MK-CF-M-072 · MK-CF-M-073 · MK-CF-M-089 · MK-NW-M-010",
  "State": "In the code since 2026-11-01 — row written 2026-11-01 (round 5c), before the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); This month is frames A and B, the set-up doors the first-open frame, the Income tab frame 5. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New: a wage entered with a pay frequency that cannot be read is something entered, so the tab shows what it can instead of ‘SET UP YOUR MONTH — 2 STEPS’ (the lead’s R23a follow-on; R23’s sentence, as Base pay, the Income summary and Home print it). The household: a $100,000 wage with frequency ‘annual’ (not one of the app’s frequencies), and one rental at $1,800 a month less $600 = $1,200 a month net; no budget; August 2026. This month: ‘PLANNED · AUGUST’ ‘—’ · ‘Inflow (rent)’ ‘$1,200’ · ‘Pay frequency not recognised — open Base pay to choose one.’ where the wage would be · ‘Expenses’ ‘— not set’ · the no-budget sentence; ‘ACTUAL · SO FAR’ ‘—’ · ‘Actual inflow (rent)’ ‘$1,200’ · the same sentence · ‘Expenses entered by hand’ ‘$0’ · ‘= Actual surplus so far’ ‘—’ (it read ‘+$1,200’, a surplus on a month whose wage is left out). With a budget set, ‘= Planned surplus’ reads ‘—’ the same way. Income tab: ‘THIS MONTH’ ‘—’ ‘expected take-home’ and the sentence (it read ‘$1,200’); the salary row reads ‘Salary — steady’ · ‘before tax · pay frequency not recognised’ · ‘$100,000 ›’ (it read ‘before tax · yearly · ~$0/month take-home’); ‘Rental income’ · ‘1 property’ · ‘$1,200 ›’ as before. Choose a frequency and every figure is back. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s R23a follow-on (2026-11-01), made under his words above and tenets 1 and 3 (DEC-3523) without asking him; under DEC-9228 he judges the built screen on TestFlight. To reverse: show the set-up doors again whenever the wage cannot be read.",
  "Record": "DEC-0296 · DEC-3523 (tenets 1, 3) · MK-CF-M-002 · MK-CF-M-003 · MK-CF-M-031 · MK-CF-M-047",
  "State": "In the code since 2026-11-01 — row written 2026-11-01 (round 5d), before the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); the set-up doors are the first-open frame (nothing entered), This month frames A and B. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New: the set-up doors show only when nothing at all is entered — the first-open frame as drawn. Any inflow entered opens the month (rent, benefits, support, other income, self-employment, a wage), and so does any expense logged or a budget set; the doors still offer what is missing, in words: ‘Your pay is not entered yet — add it ›’, where the pay would be, opening Your base pay. Worked by hand, a rent-only household: one rental at $1,800 a month less $600 = $1,200 a month net; no pay, no budget, nothing logged; August 2026. ‘PLANNED · AUGUST’ ‘—’ · ‘Inflow (rent)’ ‘$1,200’ · ‘Your pay is not entered yet — add it ›’ · ‘Expenses’ ‘— not set’ · the no-budget sentence; ‘ACTUAL · SO FAR’ ‘+$1,200’ · ‘Actual inflow (rent)’ ‘$1,200’ · ‘Expenses entered by hand’ ‘$0’ · ‘= Actual surplus so far’ ‘+$1,200’ ($1,200 − $0: the totals are what is entered). With nothing coming in at all — only a budget or an expense — no surplus rests on an income nobody entered: each surplus reads ‘—’ and the pay line says why (Home’s box reads ‘Left —’ the same way). With nothing entered, the two set-up doors are unchanged. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling of 2026-11-01 on FX-CF-A’s round-5d ‘Left’ item, made under his words above and tenets 1 and 3 (DEC-3523) without asking him; under DEC-9228 he judges the built screen on TestFlight. To reverse: show the set-up doors again until a wage, self-employment or retirement income is entered.",
  "Record": "DEC-0296 · DEC-3523 (tenets 1, 3) · MK-CF-M-002 · MK-CF-M-003",
  "State": "In the code since 2026-11-01 — row written 2026-11-01 (round 5e), before the code"
 },
 {
  "Ruled": "2026-11-02",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); Debts is frame 6; the setup loan lines are the round-5 to 5c rows’ above, which this row changes. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New: a setup student loan’s balance is owed and counts; its monthly payment is not assumed, because setup never asks when repayment starts (the lead’s R22d). Worked by hand, the round-5b household (a $3,200 Visa at $110/month, a $9,800 car loan at $300/month, a $30,000 setup loan owed at 5.50% over 10 years), highest rate first, nothing extra, from Aug 2026: YOUR DEBT ‘$43,000’, then ‘across 3 debts · $410/month in payments · the student loan’s payment is not counted: when repayment starts is not entered’ ($110 + $300; it read ‘$736/month’). The loan’s row reads ‘Student loan (from setup)’ · ‘5.50% · payment not entered · ~$138/month interest’ · ‘−$30,000’ (it read ‘6 years left · $326/month min’), so the rows’ payments are $110 + $300 = $410, the total. PAYOFF PLAN pays the debts entered: ‘$410’ ‘/month total’, debt-free ‘Oct 2029’ (car loan month 36, Visa month 38), ‘$2,476’ total interest ($996.61 + $1,479.14 = $2,475.75) — it read ‘$736’, ‘Jul 2032’, ‘$8,794’ — and it says ‘The student loan (from setup) is not in the plan until its repayment start is entered.’ DEBT-TO-INCOME divides the minimums counted, $410.00, and says the student loan’s payment is not among them. STUDENT LOAN OUTLOOK keeps ‘~$326/month once you’re repaying’, labelled: ‘An estimate from the rate and term entered in setup — not in your payments until repayment starts.’ Net worth’s monthly debt payments read the same one list and agree: $410. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R22d (round 6, 2026-11-02), made under his words above (DEC-0296) and tenets 1 and 3 (DEC-3523) without asking him; under DEC-9228 he judges the built screen on TestFlight. It reverses the payment part of the round-5b and 5c rows. To reverse: count the loan’s repayment from its rate and term again.",
  "Record": "DEC-0296 · DEC-3523 (tenets 1, 3) · MK-NW-M-012 · MK-CF-M-072 · MK-CF-M-073 · MK-CF-M-103 · MK-CF-M-106",
  "State": "In the code since 2026-11-02 — row written 2026-11-02 (round 6), before the code"
 },
 {
  "Ruled": "2026-11-02",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); Debts is frame 6; STUDENT LOAN OUTLOOK is row 77’s box; the R22d row above. His feedback: His words, 2026-08-20 (DEC-0296): “an unknown input produces no number and a reason — never a default”. New (round 6, CF6-01, CF6-03, CF6-04, CF6-05, and the payoff dates): (1) DEBT-TO-INCOME with a setup loan owed: beside entered debts it divides the minimums counted and says the loan’s payment is not among them — the round-5b household reads ‘8.20%’, ‘$410.00/month in minimum debt payments ÷ $5,000/month income’ (410 ÷ 5,000 = 8.20%), then ‘The student loan’s payment is not counted here: when repayment starts is not entered.’; with only the setup loan the box stays and reads ‘The student loan’s payment is not counted: when repayment starts is not entered, so there is no debt-to-income figure — we won’t guess one.’ (the box was missing). The same loan typed in as a debt with its payment is an entered debt and is divided as before. (2) With only a setup loan, YOUR DEBTS keeps its door: ‘+ Add debt account’ under the loan’s row (it showed only once a debt was entered). (3) STUDENT LOAN OUTLOOK, every line it prints, for a $30,000 loan at 5.50% over 10 years and $5,000/month of income: ‘$30,000 borrowed’ · ‘~$326/month once you’re repaying · $9,069 total interest’ · ‘An estimate from the rate and term entered in setup — not in your payments until repayment starts.’ · ‘That’s ~6.51% of today’s income — keeping total debt under 20% keeps you comfortable.’ (325.58 ÷ 5,000 = 6.51%); for a loan paid out later a fifth line follows, ‘Paid out from Sep 2027. When repayment starts is not entered.’ (the round-5 row listed three lines). (4) A setup loan also entered as a debt is counted once, as the debt; the outlook still shows, once, for every loan entered in setup, and its estimate line then reads ‘An estimate from the rate and term entered in setup.’ (the box disappeared). (5) THE PAYOFF DATES are counted from the month the plan is read in: the plan pays the debts entered, so read in Aug 2026 the car loan clears in month 36 and the Visa in month 38, debt-free ‘Oct 2029’; read in Nov 2026, month 38 is ‘Jan 2030’. The phones are not redrawn.",
  "His words, or where it came from": "Not a decision of his: the lead’s round-6 items on R22d (2026-11-02), made under his words above and tenets 1, 2 and 3 (DEC-3523) without asking him; under DEC-9228 he judges the built screen on TestFlight. To reverse: drop the debt-to-income sentence and the box with only a loan, hide the door with only a loan, and show the outlook only for a loan not entered as a debt.",
  "Record": "DEC-0296 · DEC-3523 (tenets 1, 2, 3) · MK-CF-M-058 · MK-CF-M-102 · MK-CF-M-103 · MK-CF-M-105 · MK-CF-M-106 · MK-CF-M-108",
  "State": "In the code since 2026-11-02 — row written 2026-11-02 (round 6b), before the code"
 },
 {
  "Ruled": "2026-11-01",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”). Its rows of 2026-10-25 to 2026-11-01 write a calculated figure with ‘≈’ (‘≈$6,196’, the student loan outlook’s ‘≈$326/month once you’re repaying’). His feedback: None on the mark itself. His words, 2026-09-02: “Always use same words to describe same thing in the app. There is no score for creative writing use different terms to describe same thing.” New: the app writes ‘about’ with one mark, ‘~’, against its figure, as Net worth always has: ‘~$6,196’, ‘~$326/month once you’re repaying’; where an earlier row on this drawing writes ‘≈’, read ‘~’. Only the mark changes; every figure and every word stays. The phones are not redrawn. Line added 2026-11-01.",
  "His words, or where it came from": "One mark for one concept (his one-term rule of 2026-09-02; tenet 4, DEC-3523). The approved drawings draw ‘~’ 15 times on three drawings (Net worth v08, DEC-0644; Alternatives and Bonds v02, DEC-0650, all approved 2026-10-01) and ‘≈’ 9 times on one (the income drawing v07, approved 2026-09-02); the newer approvals draw ‘~’; the app printed ‘~’ 55 times and ‘≈’ 40; his recorded wording for MK-NW-M-015 is ‘~$X’. The lead’s ruling R25 of 2026-11-01, made without asking him, as his order of 2026-09-30 says; held by src/__tests__/approx_mark_one_form.test.ts (no ‘≈’ in any printed text, and no space between ‘~’ and its figure). To reverse: the 40 Cash flow marks back to ‘≈’, and this line removed.",
  "Record": "R25 · DEC-3523 · DEC-0644 · DEC-0650 · MK-NW-M-015 · CF4-02 · DEC-0440",
  "State": "In the code since 2026-11-01 — row written after the code"
 },
 {
  "Ruled": "2026-11-02",
  "What changed, against the phones below": "Approved before: Cash flow v01 frames A, B and 5, 2026-09-28 (DEC-0440: ‘Approved’); the row of 2026-11-01 for a wage that cannot be read. His words: none on these states. New: no month prints a $0 that is not known. — This month, a later month, a past month, and the Income tab, with a wage that cannot be read (a pay frequency not recognised, or hourly with no hours a week): no inflow row prints a figure that rests on that wage — not ‘$0’, not a spouse’s take-home or a rent worked on a rate the missing wage sets; the reason stands where the inflow would be, and each surplus reads ‘—’. A later month reads ‘Planned inflow —’ with the reason (it read ‘Planned inflow $0 · Nothing entered yet’, or ‘$1,200’ with nothing saying the wage was left out). The Income tab’s source row says which wage cannot be read and why, on that wage’s own row. A past month before tracking reads ‘—’ on Actual inflow, Outflow and Surplus with ‘Nothing recorded for this month — it predates your tracking.’ (it read ‘$0 · $0 · +$0’ beside an Income tab that expects $1,200 that month: nothing was recorded, which is not $0). Rent waiting for its property says so on the Income tab and This month. Line added 2026-11-02, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R27 of 2026-11-02, made without asking him, under his DEC-0296 and tenets 1 to 3 (DEC-3523). One word from him reverses it. To reverse: print $0 again.",
  "Record": "DEC-0296 · DEC-3523 · R27 · MK-CF-O-010 theMonth · MK-CF-O-016 incomeSources",
  "State": "In the code"
 },
 {
  "Ruled": "2026-11-02",
  "What changed, against the phones below": "Approved before: Cash flow v01, 2026-09-28 (DEC-0440: “Approved”); the set-up doors are the first-open frame (nothing entered), This month frames A and B; the round-5e row of 2026-11-01 opens the month on any inflow, any expense logged or a budget set. His words: none on these states. New: a debt entered alone, or a student loan entered in setup alone (owed now or later), opens the month too. A $9,800 car loan and nothing else: This month shows PLANNED with ‘Your debts are here, but you haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.’ and its Set your budget door, ‘Your pay is not entered yet — add it ›’ where the pay would be, and ACTUAL · SO FAR with its surplus ‘—’ (it showed the set-up doors, SET UP YOUR MONTH — 2 STEPS, while the Debts tab listed the $9,800 loan). Cash flow, Home, Insights and Summary read one answer to ‘is anything entered yet?’ (setupEntered): an inflow (a wage that cannot be read among them), an expense logged, a budget set, a debt or a setup loan — the debt part is Net worth’s own (debtsEntered). The phones are not redrawn. Line added 2026-11-02, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R26 of 2026-11-02 (CF6-09, CF6-10), made without asking him, as his order of 2026-09-30 says; under his DEC-0296 and tenets 3 and 4 (DEC-3523). One word from him reverses it. To reverse: leave debts and setup loans out of the gate again.",
  "Record": "R26 · CF6-09 · CF6-10 · DEC-0296 · DEC-3523 · DEC-0440 · MK-CF-M-002 · MK-CF-M-003",
  "State": "In the code since 2026-11-02 — row written before the code"
 },
 {
  "Ruled": "2026-11-02",
  "What changed, against the phones below": "Approved before: Cash flow v01 frames A and B, 2026-09-28 (DEC-0440: ‘Approved’); frame A draws ‘+$350’ on a typed take-home. His words: none on this mark. New: a surplus worked on a calculated take-home carries the one ‘about’ mark before its sign. — This month and a later month, a surplus that rests on an estimate: where the take-home is the app’s calculation (it wears ‘~’, R25), the planned and the actual surplus and each band total read ‘~+$5,022’ / ‘~−$800’ — the mark before the sign, as Home’s Left reads ‘~$4,582’ — where they read ‘+$5,022’. A surplus on a take-home typed keeps no mark: ‘+$350’, as drawn. Said aloud ‘about plus $5,022’. Line added 2026-11-02, before the code.",
  "His words, or where it came from": "Not a decision of his: the lead’s ruling R25a of 2026-11-02, made without asking him, under tenet 4 (DEC-3523: one figure, one form) and this drawing’s rule that every estimate says so. One word from him reverses it. To reverse: print the surplus without the mark.",
  "Record": "R25 · R25a · DEC-3523 (tenet 4) · MK-CF-M-002 · MK-CF-M-049 · MK-CF-M-053",
  "State": "In the code"
 }
]
```

Its phones that hold the screens in this part (5), every line in order, as the match tests read them. Phones 1, 2, 3, 4, 6 draw other screens and are left out.

```json
{
 "phone 5": [
  "Cash flow",
  "August 2026",
  "‹",
  "August 2026",
  "›",
  "This month",
  "Income",
  "Expenses",
  "Debts",
  "THIS MONTH",
  "$6,200",
  "expected take-home",
  "YOUR SOURCES",
  "Salary — steady",
  "take-home · monthly",
  "$6,200 ›",
  "Rental income",
  "2 properties",
  "$0 ›",
  "Equity comp",
  "RSU grants",
  "— ›",
  "Add your income ›",
  "opens the steady-or-varies pop-up — variable earners fine-tune month by month",
  "RECEIVED THIS MONTH",
  "Aug 15 · Paycheck",
  "+$3,100",
  "Aug 1 · Paycheck",
  "+$3,100"
 ]
}
```

The same phones as the match test holds the screen to them: the drawn phone with each dated row and kept item applied by name — the test's own expected lines:

```json
{
 "phone 5 (frame E)": [
  "Cash flow",
  "August 2026",
  "‹",
  "August 2026",
  "›",
  "This month",
  "Income",
  "Expenses",
  "Debts",
  "THIS MONTH",
  "$6,200",
  "expected take-home",
  "YOUR SOURCES",
  "Salary — steady",
  "take-home · monthly",
  "$6,200 ›",
  "Rental income",
  "2 properties",
  "$0 ›",
  "Equity comp",
  "RSU grants",
  "— ›",
  "Add your income ›",
  "RECEIVED THIS MONTH",
  "Aug 15 · Paycheck",
  "+$3,100.00",
  "Aug 1 · Paycheck",
  "+$3,100.00",
  "Your income, all of it",
  "the take-home, and what it is taxed on",
  "Open ›",
  "＋ Expense"
 ]
}
```

And the screen rendered in the drawing's own household on the drawing's own day, as that test renders it:

```json
{
 "phone 5 (frame E)": {
  "phone": 5,
  "day": "2026-08-20",
  "tab": "Income",
  "lines": [
   "Cash flow",
   "August 2026",
   "‹",
   "August 2026",
   "›",
   "This month",
   "Income",
   "Expenses",
   "Debts",
   "THIS MONTH",
   "$6,200",
   "expected take-home",
   "YOUR SOURCES",
   "Salary — steady",
   "take-home · monthly",
   "$6,200 ›",
   "Rental income",
   "2 properties",
   "$0 ›",
   "Equity comp",
   "RSU grants",
   "— ›",
   "Add your income ›",
   "RECEIVED THIS MONTH",
   "Aug 15 · Paycheck",
   "+$3,100.00",
   "Aug 1 · Paycheck",
   "+$3,100.00",
   "Your income, all of it",
   "the take-home, and what it is taxed on",
   "Open ›",
   "＋ Expense"
  ]
 }
}
```

## The match tests — each test that holds one of these screens to a drawing phone, its code and its result at this build

**E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks** — `src/screens/__tests__/cashflow_matches_v01.test.tsx`, lines 81–86, phones 5: **passed**

```ts
test('E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks', () => {
  H.householdIncome();
  render(<CashFlowScreen />);
  tab('Income');
  check(H.AS_BUILT.E(), builtLines(screen.toJSON()), 25);
})
```

## The decisions these cases name — quoted from the decision log

```json
[
 {
  "id": "DEC-0200",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "takehome",
  "the_log_records": "When you type your take-home instead of your gross, it is converted ONCE on the way in and stored. The old code re-ran the tax schedule backwards on EVERY read to find a gross that would produce your figure — a guess laid on top of an estimate."
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
  "id": "DEC-8368",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-3523 (tenets 1 and 2), made without asking him, as his order of 2026-09-30 says. $2,400 of Social Security with $1,500/month taken from a 401(k) read “guaranteed income $3,900”: a withdrawal is a draw on savings. It reads $2,400/month. A Social Security estimate typed in the Plan is not listed as received (it read $2,900/month). Self-employment entered per month reads “net · monthly” (it read “net · yearly”). To reverse: count withdrawals and estimates as guaranteed again. One word from him reverses it."
 },
 {
  "id": "DEC-8375",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-4529 and DEC-0264, made without asking him, as his order of 2026-09-30 says. Frame 6 draws $310/month in payments; its own debts' minimums are $110 + $300 = $410, which the app prints. Expense rows and payments received print to the cent, “$100.00” and “+$3,100.00” (his precision ruling); totals stay whole dollars. The radar row for a connected card cannot occur — no card can be connected yet. Sizes stay on the app's scale (15 / 11 / 13). To reverse: print as drawn. One word from him reverses it."
 },
 {
  "id": "DEC-8387",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-7942 and DEC-3523 (tenet 5), made without asking him, as his order of 2026-09-30 says. The founder's $5,000 typed the old way showed $5,000 in the gross box under “Before anything comes out.”, and a profile loaded from the cloud was read as gross, $4,582 where $5,000 lands. The conversion now runs as the profile comes in: “$5,000.00 ≈ Worked back…”, “$0/month · 0%”. To reverse: convert only on save. One word from him reverses it."
 }
]
```
