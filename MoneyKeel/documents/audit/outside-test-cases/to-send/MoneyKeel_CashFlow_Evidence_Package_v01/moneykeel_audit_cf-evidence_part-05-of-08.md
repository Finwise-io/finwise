# Cash flow evidence — part 05 of 08: Your future paycheck and the retired month — the cards no drawing draws, and the simulation

10 cases. Read `moneykeel_audit_cf-evidence_brief_v01.md` first. Answer each case with one JSON line, in the format the brief gives.

## The cases

Each case: the figure and the tenet, what the first reviewer said it lacked, the figure's own record, the evidence (by the render's key in the next section), the decisions that name the figure (quoted at the end), our own tests and their results, and our status. Our status is not the answer.

```json
[
 {
  "case": "MK-CF-M-022#1",
  "figure": "MK-CF-M-022",
  "figure_label": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
  "tenet": 1,
  "tenet_words": "A wrong number ends trust. Being right comes before being fast, being complete or looking good. A late, correct figure beats an on-time, wrong one.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "specification_issue",
   "what_it_said_it_lacked": "Projection/simulation contract insufficient for an independently computed positive-pot paycheck."
  },
  "figure_record": {
   "label": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
   "formula": "guaranteed income a month + the draw the projected pot can support (the paycheck year’s level draw)",
   "inputs": [
    "MK-NW-I-001 your accounts",
    "MK-XS-I-017 birth year",
    "MK-XS-I-018 retirement age",
    "MK-XS-I-028 assumed return",
    "MK-XS-I-020 Social Security monthly amount"
   ],
   "decisions": [
    "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise.",
    "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
   ],
   "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
    "answer": "$4,345/month"
   }
  },
  "evidence": {
   "render": "SAVER",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "YOUR FUTURE PAYCHECK",
    "found_at_render_line": 29
   },
   "printed_under": "MK-CF-M-022",
   "printed_texts": [
    "$6,565"
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
       "after_the_sync": "6000"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$6,565"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-0244",
   "DEC-0245",
   "DEC-0247",
   "DEC-8369",
   "DEC-8387"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-022 YOUR FUTURE PAYCHECK — At <age>: ~$X/month › T1 · reviewer FAIL (specification_issue) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the simulated figure is the same on every run, and the draw search is the one the contract states"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the simulation contract is in this part; judge whether it is complete and whether the figure follows from it"
 },
 {
  "case": "MK-CF-M-022#5",
  "figure": "MK-CF-M-022",
  "figure_label": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for YOUR FUTURE PAYCHECK — At <age>: ~$X/month. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
   "formula": "guaranteed income a month + the draw the projected pot can support (the paycheck year’s level draw)",
   "inputs": [
    "MK-NW-I-001 your accounts",
    "MK-XS-I-017 birth year",
    "MK-XS-I-018 retirement age",
    "MK-XS-I-028 assumed return",
    "MK-XS-I-020 Social Security monthly amount"
   ],
   "decisions": [
    "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise.",
    "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
   ],
   "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
    "answer": "$4,345/month"
   }
  },
  "evidence": {
   "render": "SAVER",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "YOUR FUTURE PAYCHECK",
    "found_at_render_line": 29
   },
   "printed_under": "MK-CF-M-022",
   "printed_texts": [
    "$6,565"
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
       "after_the_sync": "6000"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$6,565"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-0244",
   "DEC-0245",
   "DEC-0247",
   "DEC-8369",
   "DEC-8387"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-022 YOUR FUTURE PAYCHECK — At <age>: ~$X/month › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-022; a sync of the same household left 6 of 7 entered values exactly as typed and rewrote onboardingProfile: grossWorkedBack, landsTypical, salaryMode; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-022#6",
  "figure": "MK-CF-M-022",
  "figure_label": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
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
   "label": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
   "formula": "guaranteed income a month + the draw the projected pot can support (the paycheck year’s level draw)",
   "inputs": [
    "MK-NW-I-001 your accounts",
    "MK-XS-I-017 birth year",
    "MK-XS-I-018 retirement age",
    "MK-XS-I-028 assumed return",
    "MK-XS-I-020 Social Security monthly amount"
   ],
   "decisions": [
    "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise.",
    "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
   ],
   "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
    "answer": "$4,345/month"
   }
  },
  "evidence": {
   "render": "SAVER",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "YOUR FUTURE PAYCHECK",
    "found_at_render_line": 29
   },
   "printed_under": "MK-CF-M-022",
   "printed_texts": [
    "$6,565"
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
       "after_the_sync": "6000"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$6,565"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "none": "No approved drawing draws this figure: it is not on any drawing: kept by his ruling on its arithmetic, DEC-0244 and DEC-0245 (2026-09-08), named in cashflow_matches_v01 (difference 3)."
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-0244",
   "DEC-0245",
   "DEC-0247",
   "DEC-8369",
   "DEC-8387"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-022 YOUR FUTURE PAYCHECK — At <age>: ~$X/month › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "no approved drawing draws it, so tenet 6 rests on the decisions quoted"
 },
 {
  "case": "MK-CF-M-023#5",
  "figure": "MK-CF-M-023",
  "figure_label": "YOUR FUTURE PAYCHECK — Social Security · pension",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for YOUR FUTURE PAYCHECK — Social Security · pension. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "YOUR FUTURE PAYCHECK — Social Security · pension",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "The guaranteed part of that future month: Social Security, pension, annuity, other.",
   "formula": "the outside guaranteed streams a month, added up",
   "inputs": [
    "MK-XS-I-020 Social Security monthly amount",
    "MK-XS-I-022 pension monthly amount",
    "MK-XS-I-035 annuity income",
    "MK-XS-I-036 other guaranteed income"
   ],
   "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
    "answer": "$2,000/month"
   }
  },
  "evidence": {
   "render": "SAVER",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Social Security · pension",
    "found_at_render_line": 33
   },
   "printed_under": "MK-CF-M-023",
   "printed_texts": [
    "$2,000"
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
       "after_the_sync": "6000"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$2,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-0244",
   "DEC-0245",
   "DEC-8369",
   "DEC-8387"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-023 YOUR FUTURE PAYCHECK — Social Security · pension › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-023; a sync of the same household left 6 of 7 entered values exactly as typed and rewrote onboardingProfile: grossWorkedBack, landsTypical, salaryMode; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-023#6",
  "figure": "MK-CF-M-023",
  "figure_label": "YOUR FUTURE PAYCHECK — Social Security · pension",
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
   "label": "YOUR FUTURE PAYCHECK — Social Security · pension",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "The guaranteed part of that future month: Social Security, pension, annuity, other.",
   "formula": "the outside guaranteed streams a month, added up",
   "inputs": [
    "MK-XS-I-020 Social Security monthly amount",
    "MK-XS-I-022 pension monthly amount",
    "MK-XS-I-035 annuity income",
    "MK-XS-I-036 other guaranteed income"
   ],
   "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
    "answer": "$2,000/month"
   }
  },
  "evidence": {
   "render": "SAVER",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Social Security · pension",
    "found_at_render_line": 33
   },
   "printed_under": "MK-CF-M-023",
   "printed_texts": [
    "$2,000"
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
       "after_the_sync": "6000"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$2,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "none": "No approved drawing draws this figure: it is not on any drawing: kept by his ruling on its arithmetic, DEC-0244 and DEC-0245 (2026-09-08), named in cashflow_matches_v01 (difference 3)."
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-0244",
   "DEC-0245",
   "DEC-8369",
   "DEC-8387"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-023 YOUR FUTURE PAYCHECK — Social Security · pension › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "no approved drawing draws it, so tenet 6 rests on the decisions quoted"
 },
 {
  "case": "MK-CF-M-055#1",
  "figure": "MK-CF-M-055",
  "figure_label": "Draw from savings",
  "tenet": 1,
  "tenet_words": "A wrong number ends trust. Being right comes before being fast, being complete or looking good. A late, correct figure beats an on-time, wrong one.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "specification_issue",
   "what_it_said_it_lacked": "Numerical draw remains conditional on an unspecified stochasticmodel and a search without proven upperbound."
  },
  "figure_record": {
   "label": "Draw from savings",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "The level amount a month the pot can support, so the paycheck does not fall when a bill lands.",
   "formula": "the paycheck year’s level draw from the pot, at the assumed return and horizon",
   "inputs": [
    "MK-NW-I-001 your accounts",
    "MK-XS-I-028 assumed return",
    "MK-XS-I-018 retirement age"
   ],
   "decisions": [
    "IN TODAY’S DOLLARS (decided 2026-10-03, the master’s old Q30): the draw keeps its buying power — the figure shown is what it buys today, and the dollars paid rise with inflation each year. It is what the simulation behind the odds already charges, so the draw shown and the odds beside it are the same plan. To reverse: hold the dollars flat instead, and the odds must be re-run that way."
   ],
   "refusal": "No age entered, retirement age already reached, or no pot to project from — the card is not drawn.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
    "answer": "$2,345/month"
   }
  },
  "evidence": {
   "render": "SAVER",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Draw from savings",
    "found_at_render_line": 35
   },
   "printed_under": "MK-CF-M-055",
   "printed_texts": [
    "$4,565"
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
       "after_the_sync": "6000"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$4,565"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-0244",
   "DEC-0245",
   "DEC-2164",
   "DEC-8387",
   "DEC-8769"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-055 Draw from savings › T1 · reviewer FAIL (specification_issue) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the simulated figure is the same on every run, and the draw search is the one the contract states"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the simulation contract is in this part; judge whether it is complete and whether the figure follows from it"
 },
 {
  "case": "MK-CF-M-055#5",
  "figure": "MK-CF-M-055",
  "figure_label": "Draw from savings",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for Draw from savings. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "Draw from savings",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "The level amount a month the pot can support, so the paycheck does not fall when a bill lands.",
   "formula": "the paycheck year’s level draw from the pot, at the assumed return and horizon",
   "inputs": [
    "MK-NW-I-001 your accounts",
    "MK-XS-I-028 assumed return",
    "MK-XS-I-018 retirement age"
   ],
   "decisions": [
    "IN TODAY’S DOLLARS (decided 2026-10-03, the master’s old Q30): the draw keeps its buying power — the figure shown is what it buys today, and the dollars paid rise with inflation each year. It is what the simulation behind the odds already charges, so the draw shown and the odds beside it are the same plan. To reverse: hold the dollars flat instead, and the odds must be re-run that way."
   ],
   "refusal": "No age entered, retirement age already reached, or no pot to project from — the card is not drawn.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
    "answer": "$2,345/month"
   }
  },
  "evidence": {
   "render": "SAVER",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Draw from savings",
    "found_at_render_line": 35
   },
   "printed_under": "MK-CF-M-055",
   "printed_texts": [
    "$4,565"
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
       "after_the_sync": "6000"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$4,565"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-0244",
   "DEC-0245",
   "DEC-2164",
   "DEC-8387",
   "DEC-8769"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-055 Draw from savings › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-055; a sync of the same household left 6 of 7 entered values exactly as typed and rewrote onboardingProfile: grossWorkedBack, landsTypical, salaryMode; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-055#6",
  "figure": "MK-CF-M-055",
  "figure_label": "Draw from savings",
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
   "label": "Draw from savings",
   "unit": "money",
   "per": "month",
   "screens": [
    "/cashflow"
   ],
   "answers": "The level amount a month the pot can support, so the paycheck does not fall when a bill lands.",
   "formula": "the paycheck year’s level draw from the pot, at the assumed return and horizon",
   "inputs": [
    "MK-NW-I-001 your accounts",
    "MK-XS-I-028 assumed return",
    "MK-XS-I-018 retirement age"
   ],
   "decisions": [
    "IN TODAY’S DOLLARS (decided 2026-10-03, the master’s old Q30): the draw keeps its buying power — the figure shown is what it buys today, and the dollars paid rise with inflation each year. It is what the simulation behind the odds already charges, so the draw shown and the odds beside it are the same plan. To reverse: hold the dollars flat instead, and the odds must be re-run that way."
   ],
   "refusal": "No age entered, retirement age already reached, or no pot to project from — the card is not drawn.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
    "answer": "$2,345/month"
   }
  },
  "evidence": {
   "render": "SAVER",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Draw from savings",
    "found_at_render_line": 35
   },
   "printed_under": "MK-CF-M-055",
   "printed_texts": [
    "$4,565"
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
       "after_the_sync": "6000"
      },
      "salaryMode": {
       "as_entered": "takehome",
       "after_the_sync": "gross"
      }
     }
    },
    "figure_printed_after_the_sync": [
     "$4,565"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "none": "No approved drawing draws this figure: it is not on any drawing: kept by his ruling on its arithmetic, DEC-0244 and DEC-0245 (2026-09-08), named in cashflow_matches_v01 (difference 3)."
   }
  },
  "decisions": [
   "DEC-0200",
   "DEC-0244",
   "DEC-0245",
   "DEC-2164",
   "DEC-8387",
   "DEC-8769"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-055 Draw from savings › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "no approved drawing draws it, so tenet 6 rests on the decisions quoted"
 },
 {
  "case": "MK-CF-M-070#5",
  "figure": "MK-CF-M-070",
  "figure_label": "each step of the withdrawal order",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for each step of the withdrawal order. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "each step of the withdrawal order",
   "unit": "money",
   "grain": "one step",
   "screens": [
    "/cashflow"
   ],
   "answers": "Which pot the retired paycheck draws from first, second and so on, and how much sits in each.",
   "formula": "cash first, then taxable, then pre-tax, then Roth — each with what is earmarked for retirement in it",
   "inputs": [
    "MK-NW-I-001 your accounts",
    "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
    "MK-XS-I-050 the share of an account earmarked for retirement"
   ],
   "refusal": "No retirement money in any pot — no order to explain.",
   "ruled": "2026-10-02",
   "worked": {
    "given": "A $50,000 taxable brokerage account and a $120,000 pre-tax 401(k), both for retirement, at 68.",
    "answer": "$50,000"
   }
  },
  "evidence": {
   "render": "DRAW",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Why this order?",
    "found_at_render_line": 50
   },
   "printed_under": "MK-CF-M-070",
   "printed_texts": [
    "$50,000",
    "$120,000"
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
    "any_stored_value_changed": [
     "transitionChecks"
    ]
   },
   "sync": {
    "how": "the same household handed to the store's loadFromCloud (what a sync from the cloud does) instead of set directly; then the same screen, day and taps",
    "entered_keys_unchanged": 7,
    "of": 7,
    "what_the_sync_rewrote": {},
    "figure_printed_after_the_sync": [
     "$50,000",
     "$120,000"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-070 each step of the withdrawal order › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-070; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-078#5",
  "figure": "MK-CF-M-078",
  "figure_label": "YOUR PAYCHECK — <MONTH> (retired)",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "18",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for SURPLUS — <MONTH> (retired). No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
   "label": "YOUR PAYCHECK — <MONTH> (retired)",
   "unit": "money",
   "per": "month",
   "grain": "one figure per household per month",
   "screens": [
    "/cashflow"
   ],
   "answers": "What a retired person can spend this month: the guaranteed income that lands this month, plus the level draw from savings, less the big dated bills that fall in it.",
   "formula": "this month’s paycheck = guaranteed income landing this month + the level draw the savings can support − the big dated bills in this month (everyday expenses and monthly debt payments are what it is for, so they are not taken off)",
   "inputs": [
    "MK-XS-I-020 Social Security monthly amount",
    "MK-XS-I-022 pension monthly amount",
    "MK-NW-I-001 your accounts",
    "MK-CF-I-014 big bill"
   ],
   "decisions": [
    "A short month shows the minus with the word “short” and the bill named — never smoothed, never clipped to zero."
   ],
   "refusal": "No guaranteed income entered: the card asks for Social Security and pension; with nothing to spend, the pace line is not drawn.",
   "note": "Printed in the retired view of This month: the paycheck card’s hero, and the $Y of the pace line (drawn only when it is above $0).",
   "worked": {
    "given": "Retired, on 15 Oct 2026: $2,400/month of Social Security, no savings to draw on, and $1,200 of car insurance due in October.",
    "answer": "$1,200/month"
   }
  },
  "evidence": {
   "render": "RET",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "YOUR PAYCHECK — OCT",
    "found_at_render_line": 10
   },
   "printed_under": "MK-CF-M-078",
   "printed_texts": [
    "$1,200",
    "$1,200",
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
     "$1,200",
     "$1,200",
     "$1,200"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-8153",
   "DEC-8370"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-078 YOUR PAYCHECK — <MONTH> (retired) › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-078; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 }
]
```

## The renders — each screen as it rendered, with the store before and after

Every line in order (`[icon]` is an icon); every figure printed under its identifier; every value the person entered, before the screen opened and after; and the same household arriving by a cloud sync.

```json
{
 "DRAW": {
  "screen": "CashFlowScreen",
  "day": "2026-10-15",
  "taps": "ran: (s) => fireEvent.press(s.getByLabelText('Why this order?'))",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('cashflow', H_DRAW, '2026-10-15', {}, (s) => fireEvent.press(s.getByLabelText('Why this order?')))",
  "stored_before_opening": {
   "assetAccounts": [
    {
     "asset_id": "b",
     "label": "Brokerage",
     "kind": "brokerage",
     "tax_bucket": "TAXABLE",
     "balance": 50000,
     "target_return": 0.05,
     "retirement_pct": 100
    },
    {
     "asset_id": "k",
     "label": "401(k)",
     "kind": "401k",
     "tax_bucket": "PRE_TAX",
     "balance": 120000,
     "target_return": 0.05,
     "retirement_pct": 100
    }
   ],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "retired",
    "birthYear": "1958",
    "incomeSources": [
     "retirement_income"
    ],
    "ri_ss": "2400",
    "ri_ss_freq": "monthly",
    "monthlySpending": "3000"
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
  "any_stored_value_changed_by_opening": [
   "transitionChecks"
  ],
  "lines": [
   "001  Cash flow",
   "002  October 2026",
   "003  ‹",
   "004  October 2026",
   "005  ›",
   "006  This month",
   "007  Income",
   "008  Expenses",
   "009  Debts",
   "010  YOUR PAYCHECK — OCT",
   "011  $3,180 this month",
   "012  estimate",
   "013  Social Security",
   "014  $2,400",
   "015  = Guaranteed",
   "016  ⓘ",
   "017  $2,400",
   "018  + Draw from savings",
   "019  ⓘ",
   "020  $780",
   "021  This year ~$38,160 estimate — varies month to month",
   "022  The draw assumes 7.93%/year — the blended benchmark.",
   "023  Heads-up: this draw is above what your own numbers support long-term — the pace itself is the risk.",
   "024  Spent $0 of your $3,180 paycheck this month",
   "025  0% spent, 48% of the month gone",
   "026  DRAW COMES FROM",
   "027  Steer it ›",
   "028  Why? ›",
   "029  1 Taxable / brokerage 2 Pre-tax (401k / Traditional IRA)",
   "030  The order the math would tap your accounts — not a directive. Balances match your Net worth.",
   "031  BY MONTH · OCT – SEP ’27",
   "032  Oct",
   "033  Nov",
   "034  Dec",
   "035  Jan ’27",
   "036  Feb ’27",
   "037  Mar ’27",
   "038  Apr ’27",
   "039  May ’27",
   "040  Jun ’27",
   "041  Jul ’27",
   "042  Aug ’27",
   "043  Sep ’27",
   "044  in",
   "045  out",
   "046  WILL MY MONEY LAST?",
   "047  96% estimate",
   "048  Lives in your Plan ›",
   "049  ＋ Expense",
   "050  Why this order?",
   "051  1. Taxable / brokerage — $50,000",
   "052  Next — lets your tax-advantaged accounts keep compounding (you only owe tax on gains).",
   "053  2. Pre-tax (401k / Traditional IRA) — $120,000",
   "054  Then pre-tax — withdrawals are taxed as income, and required withdrawals force this from 73 anyway.",
   "055  Got it"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-013  $0",
   "MK-CF-M-078  $3,180",
   "MK-CF-M-078  $3,180",
   "MK-CF-M-078  $3,180",
   "MK-CF-M-082  The draw assumes 7.93%/year — the blended benchmark.",
   "MK-CF-M-070  $50,000",
   "MK-CF-M-070  $120,000"
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
    "MK-CF-M-013  $0",
    "MK-CF-M-078  $3,180",
    "MK-CF-M-078  $3,180",
    "MK-CF-M-078  $3,180",
    "MK-CF-M-082  The draw assumes 7.93%/year — the blended benchmark.",
    "MK-CF-M-070  $50,000",
    "MK-CF-M-070  $120,000"
   ],
   "whole_screen_the_same": true
  }
 },
 "RET": {
  "screen": "CashFlowScreen",
  "day": "2026-10-15",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('cashflow', H_RET, '2026-10-15')",
  "stored_before_opening": {
   "assetAccounts": [],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "retired",
    "birthYear": "1956",
    "incomeSources": [
     "retirement_income"
    ],
    "ri_ss": "2400",
    "ri_ss_freq": "monthly",
    "monthlySpending": "1500",
    "spendCats": [
     {
      "id": "ins",
      "label": "Car insurance",
      "amount": 1200,
      "bucket": "nonmonthly",
      "months": [
       10
      ],
      "tier": "critical",
      "custom": true
     }
    ]
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
   "002  October 2026",
   "003  ‹",
   "004  October 2026",
   "005  ›",
   "006  This month",
   "007  Income",
   "008  Expenses",
   "009  Debts",
   "010  YOUR PAYCHECK — OCT",
   "011  $1,200 this month",
   "012  estimate",
   "013  Social Security",
   "014  $2,400",
   "015  = Guaranteed",
   "016  ⓘ",
   "017  $2,400",
   "018  + Draw from savings",
   "019  ⓘ",
   "020  $0",
   "021  − Big bills this month (Car insurance)",
   "022  $1,200",
   "023  This year ~$27,600 estimate — varies month to month",
   "024  The draw assumes 6.00%/year — the typical return, with nothing set aside for retirement.",
   "025  Spent $0 of your $1,200 paycheck this month",
   "026  0% spent, 48% of the month gone",
   "027  DRAW COMES FROM",
   "028  Steer it ›",
   "029  Why? ›",
   "030  Nothing entered yet. Add your accounts ›",
   "031  BY MONTH · OCT – SEP ’27",
   "032  Oct",
   "033  ! Car insurance −$1,200",
   "034  Nov",
   "035  Dec",
   "036  Jan ’27",
   "037  Feb ’27",
   "038  Mar ’27",
   "039  Apr ’27",
   "040  May ’27",
   "041  Jun ’27",
   "042  Jul ’27",
   "043  Aug ’27",
   "044  Sep ’27",
   "045  in",
   "046  out",
   "047  WILL MY MONEY LAST?",
   "048  Answer 3 quick questions in Plan to see your odds",
   "049  Lives in your Plan ›",
   "050  ＋ Expense"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-013  $0",
   "MK-CF-M-078  $1,200",
   "MK-CF-M-078  $1,200",
   "MK-CF-M-078  $1,200",
   "MK-CF-M-082  The draw assumes 6.00%/year — the typical return, with nothing set aside for retirement.",
   "MK-CF-M-016  $1,200"
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
    "MK-CF-M-013  $0",
    "MK-CF-M-078  $1,200",
    "MK-CF-M-078  $1,200",
    "MK-CF-M-078  $1,200",
    "MK-CF-M-082  The draw assumes 6.00%/year — the typical return, with nothing set aside for retirement.",
    "MK-CF-M-016  $1,200"
   ],
   "whole_screen_the_same": true
  }
 },
 "SAVER": {
  "screen": "CashFlowScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('cashflow', H_SAVER, '2026-09-28')",
  "stored_before_opening": {
   "assetAccounts": [
    {
     "asset_id": "k",
     "label": "401(k)",
     "kind": "401k",
     "tax_bucket": "PRE_TAX",
     "balance": 200000,
     "target_return": 0.06,
     "retirement_pct": 100
    }
   ],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "birthYear": 1981,
    "targetRetirementAge": 67,
    "ri_ss": "2000",
    "ri_ss_receiving": "no",
    "ri_ss_freq": "monthly",
    "monthlySpending": 3000,
    "incomeSources": [
     "employment",
     "retirement_income"
    ],
    "baseSalary": "6000",
    "salaryMode": "takehome",
    "salaryFreq": "monthly",
    "taxMode": "manual",
    "manualTaxRate": "0"
   },
   "incomes": [],
   "retirementAssumptions": {
    "expectedReturn": 0.06
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
   "010  PLANNED · SEPTEMBER",
   "011  +$3,000",
   "012  Inflow (income (take-home))",
   "013  after tax and 401(k)",
   "014  $6,000",
   "015  Expenses",
   "016  your budget",
   "017  −$3,000",
   "018  = Planned surplus",
   "019  +$3,000",
   "020  ACTUAL · SO FAR",
   "021  +$6,000",
   "022  Actual inflow (income (take-home))",
   "023  $6,000",
   "024  Expenses entered by hand",
   "025  $0",
   "026  = Actual surplus so far",
   "027  +$6,000",
   "028  Nothing logged yet, and no card connected. Connect a card and your purchases arrive here on their own.",
   "029  YOUR FUTURE PAYCHECK",
   "030  PROJECTION — an estimate, not a promise",
   "031  At 67: ~$6,565/month",
   "032  In today’s dollars · assumes a 7.90%/year return and 2.50%/year inflation",
   "033  Social Security · pension",
   "034  ~$2,000",
   "035  Draw from savings",
   "036  ~$4,565",
   "037  Based on your plan’s 98.3% odds of lasting to age 90 · see Plan ›",
   "038  ＋ Expense"
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-002  $3,000",
   "MK-CF-M-002  $3,000",
   "MK-CF-M-002  $3,000",
   "MK-CF-M-003  $6,000",
   "MK-CF-M-003  $6,000",
   "MK-CF-M-003  $6,000",
   "MK-CF-M-022  $6,565",
   "MK-CF-M-082  7.90%/year",
   "MK-CF-M-083  2.50%",
   "MK-CF-M-023  $2,000",
   "MK-CF-M-055  $4,565",
   "MK-CF-M-004  $6,000",
   "MK-CF-M-004  $3,000",
   "MK-CF-M-004  $6,000",
   "MK-CF-M-004  $0",
   "MK-CF-M-070  $200,000"
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
    "MK-CF-M-002  $3,000",
    "MK-CF-M-002  $3,000",
    "MK-CF-M-002  $3,000",
    "MK-CF-M-003  $6,000",
    "MK-CF-M-003  $6,000",
    "MK-CF-M-003  $6,000",
    "MK-CF-M-022  $6,565",
    "MK-CF-M-082  7.90%/year",
    "MK-CF-M-083  2.50%",
    "MK-CF-M-023  $2,000",
    "MK-CF-M-055  $4,565",
    "MK-CF-M-004  $6,000",
    "MK-CF-M-004  $3,000",
    "MK-CF-M-004  $6,000",
    "MK-CF-M-004  $0",
    "MK-CF-M-070  $200,000"
   ],
   "whole_screen_the_same": true
  }
 }
}
```

## The simulation contract — the future paycheck, as it ran in the case's household

Rendered `SAVER` on 2026-09-28. The card asked the future paycheck once per render (1 run seen). What it was handed, what it handed back, and every run of the simulation inside it:

```json
{
 "handed": {
  "op": {
   "status": "employed",
   "birthYear": 1981,
   "targetRetirementAge": 67,
   "ri_ss": "2000",
   "ri_ss_receiving": "no",
   "ri_ss_freq": "monthly",
   "monthlySpending": 3000,
   "incomeSources": [
    "employment",
    "retirement_income"
   ],
   "baseSalary": "6000",
   "salaryMode": "takehome",
   "salaryFreq": "monthly",
   "taxMode": "manual",
   "manualTaxRate": "0"
  },
  "accounts": [
   {
    "asset_id": "k",
    "label": "401(k)",
    "kind": "401k",
    "tax_bucket": "PRE_TAX",
    "balance": 200000,
    "target_return": 0.06,
    "retirement_pct": 100
   }
  ],
  "assumptions": {
   "expectedReturn": 0.06
  },
  "bigCosts": [],
  "employmentStatus": null,
  "transactions": []
 },
 "returned": {
  "retireAge": 67,
  "retireAgeOurs": false,
  "monthly": 6565,
  "guaranteed": 2000,
  "draw": 4565,
  "assumes": {
   "yearlyReturn": 0.079,
   "yearlyInflation": 0.025
  }
 },
 "futures": {
  "paths_passed_by_futurePaycheck": 1000,
  "seed_passed_by_futurePaycheck": 42
 },
 "projection": {
  "call": 1,
  "input": {
   "current_age": 45,
   "retire_age": 67,
   "horizon_age": 90,
   "start_balance": 200000,
   "pre_tax_share": 1,
   "rmd_tax_rate": 0.1,
   "annual_contribution": 0,
   "contribution_growth": 0,
   "retire_monthly_spend_today": 3000,
   "guaranteed_streams": [
    {
     "kind": "ss",
     "monthly": 2000,
     "inflates": true,
     "start_age": 67
    }
   ],
   "guaranteed_monthly_income": 2000,
   "guaranteed_start_age": 67,
   "one_off_costs": [],
   "now_year": 2026,
   "inflation": 0.025,
   "mean_return": 0.079,
   "vol_return": 0.11,
   "paths": 1000,
   "seed": 42
  },
  "chance_of_success": 98.3,
  "projected_at_retirement_median": 928983.2645590398
 },
 "other_runs_before_the_projection": [],
 "draw_search": {
  "chance_floor_default": 80,
  "raise_top_up_to": 20,
  "round_down_to": 5,
  "halvings": 12,
  "step_down_by": 5,
  "fixed_inputs": {
   "current_age": 67,
   "retire_age": 67,
   "horizon_age": 90,
   "start_balance": 928983.2645590398,
   "annual_contribution": 0,
   "guaranteed_monthly_income": 2000,
   "guaranteed_start_age": 67,
   "inflation": 0.025,
   "mean_return": 0.079,
   "vol_return": 0.11,
   "paths": 1000,
   "seed": 42
  },
  "probes": [
   {
    "call": 2,
    "monthly_draw_tried": 6731.76278665971,
    "monthly_spend_simulated": 8731.76278665971,
    "chance_of_success": 25.5
   },
   {
    "call": 3,
    "monthly_draw_tried": 3365.881393329855,
    "monthly_spend_simulated": 5365.881393329855,
    "chance_of_success": 96.6
   },
   {
    "call": 4,
    "monthly_draw_tried": 5048.822089994782,
    "monthly_spend_simulated": 7048.822089994782,
    "chance_of_success": 67.7
   },
   {
    "call": 5,
    "monthly_draw_tried": 4207.351741662318,
    "monthly_spend_simulated": 6207.351741662318,
    "chance_of_success": 84.9
   },
   {
    "call": 6,
    "monthly_draw_tried": 4628.0869158285495,
    "monthly_spend_simulated": 6628.0869158285495,
    "chance_of_success": 77.4
   },
   {
    "call": 7,
    "monthly_draw_tried": 4417.719328745434,
    "monthly_spend_simulated": 6417.719328745434,
    "chance_of_success": 80
   },
   {
    "call": 8,
    "monthly_draw_tried": 4522.903122286992,
    "monthly_spend_simulated": 6522.903122286992,
    "chance_of_success": 80.8
   },
   {
    "call": 9,
    "monthly_draw_tried": 4575.495019057771,
    "monthly_spend_simulated": 6575.495019057771,
    "chance_of_success": 79.5
   },
   {
    "call": 10,
    "monthly_draw_tried": 4549.199070672381,
    "monthly_spend_simulated": 6549.199070672381,
    "chance_of_success": 80.3
   },
   {
    "call": 11,
    "monthly_draw_tried": 4562.347044865076,
    "monthly_spend_simulated": 6562.347044865076,
    "chance_of_success": 80.7
   },
   {
    "call": 12,
    "monthly_draw_tried": 4568.921031961423,
    "monthly_spend_simulated": 6568.921031961423,
    "chance_of_success": 79.9
   },
   {
    "call": 13,
    "monthly_draw_tried": 4565.634038413249,
    "monthly_spend_simulated": 6565.634038413249,
    "chance_of_success": 80.6
   },
   {
    "call": 14,
    "monthly_draw_tried": 4567.277535187336,
    "monthly_spend_simulated": 6567.277535187336,
    "chance_of_success": 79.9
   },
   {
    "call": 15,
    "monthly_draw_tried": 4565,
    "monthly_spend_simulated": 6565,
    "chance_of_success": 80.6
   }
  ]
 },
 "deterministic": true,
 "printed_on_screen": [
  {
   "id": "MK-CF-M-022",
   "text": "$6,565",
   "value": 6565
  },
  {
   "id": "MK-CF-M-023",
   "text": "$2,000",
   "value": 2000
  },
  {
   "id": "MK-CF-M-055",
   "text": "$4,565",
   "value": 4565
  }
 ]
}
```

The method, as its code is written (the simulation's random numbers, the draw search, and the card's own function):

**mulberry32**

```ts
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**normal**

```ts
function normal(rng: () => number, mean: number, sd: number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
```

**simulate**

```ts
export function simulate(inp: RetirementInputs) {
  const paths = inp.paths ?? 1000;
  const nAcc = Math.max(0, inp.retire_age - inp.current_age);
  const nDec = Math.max(0, inp.horizon_age - inp.retire_age);
  const rng = mulberry32(inp.seed ?? 12345);
  const inflFactor = Math.pow(1 + inp.inflation, nAcc);
  const spendAtRetire = inp.retire_monthly_spend_today * 12 * inflFactor;       // nominal $ at retirement
  // B1: each stream inflates to retirement ONLY if it actually rises; a flat pension stays flat.
  // The legacy single figure keeps its old (inflating) behaviour for callers not yet migrated.
  const streams = (inp.guaranteed_streams ?? [
    { monthly: inp.guaranteed_monthly_income, inflates: true, start_age: inp.guaranteed_start_age },
  ]).map((st) => ({
    startAge: Math.max(st.start_age ?? inp.retire_age, inp.retire_age),
    inflates: st.inflates,
    annualAtRetire: (st.monthly || 0) * 12 * (st.inflates ? inflFactor : 1),
  }));
  const guarAtRetire = streams.reduce((t, st) => t + st.annualAtRetire, 0);

  const totalYears = nAcc + nDec;                      // year 0 = today, …, year totalYears = horizon
  // big one-time costs by sim-year offset, inflated from today's dollars to their year
  const nowYear = inp.now_year ?? 2026;
  // B4: the person's own RMD start age (birth year ≈ now − current age), from the one table
  const birthYearSim = nowYear - inp.current_age;
  const rmdStartSim = rmdStartAgeFromAge(inp.current_age, nowYear);
  const oneOffByYear: Record<number, number> = {};
  for (const c of inp.one_off_costs ?? []) {
    if (!(c.amount > 0)) continue;
    const off = c.year - nowYear;
    if (off < 0 || off > totalYears) continue;         // past or beyond the horizon: not simulated
    oneOffByYear[off] = (oneOffByYear[off] || 0) + c.amount * Math.pow(1 + inp.inflation, Math.max(0, off));
  }
  // PAYMENTS THAT STOP — charged flat, never inflated (a fixed mortgage payment does not rise)
  const recurringByYear: Record<number, number> = {};
  for (const r of inp.recurring_until ?? []) {
    if (!(r.annual > 0)) continue;
    const last = Math.min(totalYears, r.through_year - nowYear);
    for (let y = 1; y <= last; y++) recurringByYear[y] = (recurringByYear[y] || 0) + r.annual;
  }
  // CHANGES TO WHAT GOES IN, by year — reductions while a loan runs, the freed payment afterwards
  const contribByYear: Record<number, number> = {};
  for (const a of inp.contribution_adjustments ?? []) {
    const from = Math.max(0, a.from_year - nowYear);
    const through = a.through_year != null ? Math.min(totalYears, a.through_year - nowYear) : totalYears;
    for (let y = from; y <= through; y++) contribByYear[y] = (contribByYear[y] || 0) + a.annual;
  }
  // per-year balance across paths, only when a band is requested (keeps the hot path lean)
  const yearly: number[][] | null = inp.with_band ? Array.from({ length: totalYears + 1 }, () => [] as number[]) : null;

  let successes = 0;
  const atRetire: number[] = [];
  for (let p = 0; p < paths; p++) {
    let bal = inp.start_balance;
    if (yearly) yearly[0].push(bal);
    const g = inp.contribution_growth ?? 0;
    for (let y = 0; y < nAcc; y++) {
      // what goes in this year: the plan's contribution, plus or minus anything a loan changed
      const putIn = Math.max(0, inp.annual_contribution * Math.pow(1 + g, y) + (contribByYear[y] || 0));
      bal = bal * (1 + normal(rng, inp.mean_return, inp.vol_return)) + putIn;
      bal -= oneOffByYear[y + 1] || 0;                 // a roof in 2028 leaves the egg in 2028
      bal -= recurringByYear[y + 1] || 0;              // …and a loan payment leaves it until it ends
      if (yearly) yearly[y + 1].push(Math.max(0, bal));
    }
    atRetire.push(bal);
    let spend = spendAtRetire, survived = true, depleted = false;
    let streamVals = streams.map((st) => st.annualAtRetire);
    // RMD drag: track the pre-tax slice so the forced withdrawal + its tax can leave the egg
    const rmdOn = (inp.pre_tax_share ?? 0) > 0;
    let preTaxBal = rmdOn ? bal * Math.min(1, Math.max(0, inp.pre_tax_share!)) : 0;
    const rmdRate = inp.rmd_tax_rate == null ? 0 : Math.min(0.6, Math.max(0, inp.rmd_tax_rate));   // G7: never 22% by default; capped at 60%
    for (let y = 0; y < nDec; y++) {
      if (!depleted) {
        const age = inp.retire_age + y;
        // each stream pays only once its own start age is reached (SS from its claim age)
        const guarNow = streams.reduce((t, st, i) => t + (age >= st.startAge ? streamVals[i] : 0), 0);
        const net = Math.max(0, spend - guarNow);
        const growth = 1 + normal(rng, inp.mean_return, inp.vol_return);
        // the loan payment is charged flat on top of expenses, and stops in its own year
        bal = bal * growth - net - (oneOffByYear[nAcc + y + 1] || 0) - (recurringByYear[nAcc + y + 1] || 0);
        if (rmdOn) {
          preTaxBal = Math.max(0, Math.min(bal, preTaxBal * growth - net * (bal > 0 ? preTaxBal / Math.max(bal, preTaxBal) : 1)));
          if (age >= rmdStartSim && preTaxBal > 0) {
            const rmd = preTaxBal / Math.max(1, tableRmdDivisor(age, birthYearSim));
            preTaxBal -= rmd;                          // forced OUT of pre-tax (net stays in the egg)
            bal -= rmd * rmdRate;                      // …but its TAX leaves the egg for real
          }
        }
        if (bal < 0) { bal = 0; survived = false; depleted = true; }
        spend *= (1 + inp.inflation);
        // B1: only the streams that actually rise, rise — a flat pension is flat forever
        streamVals = streamVals.map((v, i) => (streams[i].inflates ? v * (1 + inp.inflation) : v));
      }
      if (yearly) yearly[nAcc + y + 1].push(Math.max(0, bal));
    }
    if (survived) successes++;
  }

  let band: BandPoint[] | undefined;
  if (yearly) {
    band = yearly.map((col, y) => {
      const s = [...col].sort((a, b) => a - b);
      return { age: inp.current_age + y, p10: (pctOfSorted(s, 0.1)), p50: (pctOfSorted(s, 0.5)), p90: (pctOfSorted(s, 0.9)) };
    });
  }

  const projected = median(atRetire);
  const needed = Math.max(0, spendAtRetire - guarAtRetire) * 25;               // 4% rule on net spend
  const gap = Math.max(0, needed - projected);
  // extra monthly contribution to close the gap by retirement (future value of an annuity)
  const rm = inp.mean_return / 12, n = nAcc * 12;
  const fvFactor = rm > 0 && n > 0 ? (Math.pow(1 + rm, n) - 1) / rm : n;
  const extraMonthly = gap > 0 && fvFactor > 0 ? gap / fvFactor : 0;

  return {
    // founder 2026-09-14: "use exact everywhere no rounding for odds" (replaces B6's nearest 5 and the
    // whole-number rounding here) — 1,000 futures give the odds to a tenth
    chance_of_success: (successes * 100) / paths,
    projected_at_retirement: (projected),
    needed: (needed),
    gap: (gap),
    suggested_extra_monthly: (extraMonthly),
    band,
  };
}
```

**solveSafeDraw**

```ts
export function solveSafeDraw(nestEgg: number, guaranteedMonthlyAvg: number, sim: PaycheckSimInputs, chanceFloor = 80): number {
  if (nestEgg <= 0) return 0;
  const base: RetirementInputs = {
    current_age: sim.current_age, retire_age: sim.current_age, horizon_age: sim.horizon_age,
    start_balance: nestEgg, annual_contribution: 0,
    retire_monthly_spend_today: 0, guaranteed_monthly_income: guaranteedMonthlyAvg,
    guaranteed_start_age: sim.current_age,
    inflation: sim.inflation, mean_return: sim.mean_return, vol_return: sim.vol_return,
    paths: sim.paths ?? 1000, seed: sim.seed ?? 42,
  };
  const chanceAt = (draw: number) =>
    simulate({ ...base, retire_monthly_spend_today: guaranteedMonthlyAvg + draw }).chance_of_success;
  // the first top: spend the whole egg flat over the remaining years, doubled
  const years = Math.max(1, sim.horizon_age - sim.current_age);
  let lo = 0, hi = Math.max(100, (nestEgg / years / 12) * 2);
  // RAISE THE TOP UNTIL A DRAW FAILS (2026-10-25, FIX-ROOM; tenet 1 and this function's own word, "largest"): the first top
  // is not always too much — a 10% plan on a 6%-volatility pot passes there — and the search handed that top back,
  // $961.73, unrounded and never tried higher. Doubled up to 20 times (a million times the first top) before it gives up.
  for (let k = 0; chanceAt(hi) >= chanceFloor; k++) {
    if (k >= 20) return Math.floor(hi / 5) * 5;          // no draw fails at all (a floor of 0)
    lo = hi; hi *= 2;
  }
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (chanceAt(mid) >= chanceFloor) lo = mid; else hi = mid;
  }
  // round DOWN to $5 — never overstate "safe" — and TEST THE ROUNDED DRAW (2026-10-25, FIX-ROOM; tenet 1): the seeded chance
  // does not fall steadily as the draw rises ($570: 94.7, $575: 95.4, $580: 94.7 on one plan), so $580 came back for a
  // floor of 95 and tested at 94.7. Step down $5 at a time until the draw handed back holds the floor; $0 always does.
  let draw = Math.floor(lo / 5) * 5;
  while (draw > 0 && chanceAt(draw) < chanceFloor) draw -= 5;
  return Math.max(0, draw);
}
```

**buildPaycheckYear**

```ts
export function buildPaycheckYear(op: OnboardingProfile | null, opts: PaycheckOptions): PaycheckYear {
  const now = opts.now ?? new Date();
  const rows = guaranteedRows(op, now);
  // the rent entries decide the home, as Net worth reads it (DEC-4913, 2026-10-13)
  const nestEgg = (opts.nestEgg ?? retirementEarmarkedValue(opts.accounts ?? [], Array.isArray((op as any)?.rentals) ? (op as any).rentals : null));
  const guaranteedAnnual = rows.reduce((t, r) => t + r.amount, 0);
  const safeDraw = solveSafeDraw(nestEgg, guaranteedAnnual / 12, opts.sim, opts.chanceFloor ?? 80);
  const drawRateFlag: PaycheckYear['drawRateFlag'] =
    nestEgg <= 0 || safeDraw <= 0 ? null : (safeDraw * 12) / nestEgg > 0.045 ? 'high' : 'ok';

  // dated bills come from the F2 grid (one grid — the paycheck never invents its own calendar);
  // big bills = the NAMED dated items; the grid's 'Everyday expenses' reconciler and regular
  // monthly debt payments stay OUT — the paycheck exists to pay those.
  const grid = buildDatedGrid(op, { now, liabilities: opts.liabilities, guaranteedIncome: rows });
  // A MONTH'S DATED BILLS, READ ONE WAY (2026-10-26, the lead's ruling on FIX-BILLS' datedBillsIn): this card kept its own filter
  // (every bill but the everyday reconciler) beside the later-month card's; both now ask the one reader — bills with a date of
  // their own, never the everyday expenses and never a debt.
  const bigBills = (cell: any) => datedBillsIn(cell);

  const startMonth = now.getMonth(), startYear = now.getFullYear();
  const months: PaycheckMonth[] = Array.from({ length: 12 }, (_, s) => {
    const cm = ((startMonth + s) % 12) + 1;
    const yr = startYear + Math.floor((startMonth + s) / 12);
    const label = MONTHS[cm - 1] + (yr > startYear ? ` ’${String(yr).slice(2)}` : '');
    const g = rows.filter((r) => r.month === cm && r.year === yr)
      .map((r) => ({ source: r.source, amount: (r.amount), day: r.day }));
    const gTotal = g.reduce((t, x) => t + x.amount, 0);
    const cell = grid.cells[s];
    const bills = bigBills(cell).map((b) => ({ label: b.label, amount: b.amount, day: b.day }));
    const bTotal = bills.reduce((t, b) => t + b.amount, 0);
    return {
      calendarMonth: cm, year: yr, label,
      guaranteed: g, guaranteedTotal: (gTotal),
      safeDraw, bills, billsTotal: (bTotal),
      netSafeToSpend: (gTotal + safeDraw - bTotal),
    };
  });
  return {
    months, thisMonth: months[0],
    thisYear: (months.reduce((t, m) => t + m.netSafeToSpend, 0)),   // exact sum, never ×12
    safeDrawMonthly: safeDraw, drawRateFlag,
    guaranteedMissing: rows.length === 0,
    nestEgg,
  };
}
```

**futurePaycheck**

```ts
export function futurePaycheck(input: {
  // no inflationRate (2026-10-31, the lead's order; DEC-0259): nothing read it, and the store's 3.2% feed was being handed in and ignored —
  // the one inflation is inflationRateInForce, read inside the plan's inputs
  op: any; accounts: any[]; assumptions: any; bigCosts?: any[]; employmentStatus?: any;
  transactions?: any[];   // the year's interest records, for the plan's tax rate (2026-10-26, CLEANUP-LEFT)
}): FuturePaycheck | null {
  const { op, assumptions: A } = input;
  const age = ageFromProfile(op);
  // ONE RETIREMENT AGE (R10, 2026-10-31; cash-flow v01's row of that date): the plan's own age, 65 and ours when nothing is entered —
  // the card read 67 while the odds beside it were worked at 65
  const retireOf = planRetireAgeOf({ assumptions: A, op, retiredNow: input.employmentStatus === 'retired', age });
  const retireAge = retireOf.age;
  // OUTSIDE money only — Social Security, pension, annuity, other (MK-CF-F-076). The six-source figure
  // also carries planned withdrawals and the required withdrawal; this card prints a draw beside it,
  // and counting both is the double count his ruling Q-38 (2026-08-20) forbids.
  const guaranteed = guaranteedOutsideStreams(op).reduce((t, st) => t + st.monthly, 0);
  if (age == null || age >= retireAge) return null;
  const inputs = willItLastInputs({ op, accounts: input.accounts ?? [], assumptions: A, bigCosts: input.bigCosts, employmentStatus: input.employmentStatus, transactions: input.transactions ?? [] } as any);
  if (!inputs || inputs.start_balance <= 0) return null;
  const projectedEgg = simulate(inputs).projected_at_retirement;
  if (!projectedEgg || projectedEgg <= 0) return null;
  const projYear = buildPaycheckYear(op, {
    nestEgg: projectedEgg,
    sim: { current_age: retireAge, horizon_age: Math.max(retireAge + 5, inputs.horizon_age), mean_return: inputs.mean_return, vol_return: inputs.vol_return, inflation: inputs.inflation, seed: 42, paths: 1000 },
  } as any);
  // FULL PRECISION, ROUNDED ONCE AT THE SCREEN (2026-10-25, FIX-ROOM; his PRECISION order, Q49): $2,731.17 guaranteed + a
  // $1,730 draw is $4,461.17, and the card prints $4,461 through fig(). It was rounded here, to 4,461 and 2,731.
  return { retireAge, retireAgeOurs: retireOf.ours, monthly: guaranteed + projYear.safeDrawMonthly, guaranteed, draw: projYear.safeDrawMonthly,
    assumes: { yearlyReturn: inputs.mean_return, yearlyInflation: inputs.inflation } };
}
```

## The decisions these cases name — quoted from the decision log

```json
[
 {
  "id": "DEC-0088",
  "decided": "2026-08-11",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "to the write add - assumption we are using. Again save all this in the master PRD file.",
  "the_log_records": "At his request the explanation names every FIGURE it assumes, not just the categories — shares at 10.4% over 30 years, a 60/40 retirement mix at 7.9%, a brokerage at 8%. An assumption you cannot see the number for cannot be argued with."
 },
 {
  "id": "DEC-0200",
  "decided": "2026-08-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "takehome",
  "the_log_records": "When you type your take-home instead of your gross, it is converted ONCE on the way in and stored. The old code re-ran the tax schedule backwards on EVERY read to find a gross that would produce your figure — a guess laid on top of an estimate."
 },
 {
  "id": "DEC-0244",
  "decided": "2026-09-08",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "ok — the paycheck's guaranteed line = the four outside sources",
  "the_log_records": "“ok — the paycheck’s guaranteed line = the four outside sources.” The guaranteed part of a retirement paycheck is the income that comes from outside your savings — four named sources — not anything drawn from the pot."
 },
 {
  "id": "DEC-0245",
  "decided": "2026-09-08",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "question answered: yes, the row named the wrong function; the screen was right",
  "the_log_records": "“question answered: yes, the row named the wrong function; the screen was right.” The master file pointed at the wrong calculation; the app was correct. The file was fixed, not the code."
 },
 {
  "id": "DEC-0247",
  "decided": "2026-09-08",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "1000 everywhere",
  "the_log_records": "“1000 everywhere.” Every projection runs 1,000 possible futures — one number, on every screen and in every calculation, so no two screens run a different many."
 },
 {
  "id": "DEC-2164",
  "decided": "2026-09-28",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "rise with inflation each year",
  "the_log_records": "The draw from savings rises with inflation each year, so it keeps its buying power. The figure shown is what it buys today."
 },
 {
  "id": "DEC-8153",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-1923 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. One rule for a debt in a month, in two new shared functions, MK-CF-F-235 paysInMonth and MK-CF-F-236 paymentInMonth: from its first payment to its payoff, and a balance due in full once, in its month, at its balance. A $7,200 take-home, a $3,400 budget, the $2,400 mortgage, a $250 car loan whose first payment is Oct 28, a $300 loan paid off in August and a $1,000 tax bill due in full Sep 20: September's planned surplus read +$850, the car loan and the paid-off loan counted and the tax bill left out; it reads +$400 = 7,200 − 3,400 − 2,400 − 1,000, what the Bill calendar's September holds. October's card is unchanged, $1,150. ACTUAL no longer lists the car loan as due the 28th at $0; MONTHLY RECURRING EXPENSES reads $2,400 (it read $2,650); the tax bill is on the BIG-TICKET RADAR at $1,000; Home's due-soon reminder no longer fires for a loan not yet started. MK-CF-M-047, 048 and 049 now say they print on a later month's plan card, from the grid ($7,200 / $6,050 / $1,150), and the retired surplus line and the paycheck card's SURPLUS have their own number, MK-CF-M-078 (it printed under MK-CF-M-049). To reverse: count every debt's payment in this month again, whatever its dates. One word from him reverses it."
 },
 {
  "id": "DEC-8369",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-2164, DEC-0088, DEC-7306 and DEC-4082, made without asking him, as his order of 2026-09-30 says. “At 67: ~$X/month” never said what its dollars were or what it assumed. Under the figure it reads “In today’s dollars · assumes a 6.00% return and 2.40% inflation a year”, the household's own rates. The article is chosen by the app's one rule, so an 8.00% return reads “assumes an 8.00% return” (it read “a 8.00%”, fixed 2026-10-26). The two rates print under MK-CF-M-022 until they have numbers of their own. To reverse: take the line off. One word from him reverses it."
 },
 {
  "id": "DEC-8370",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his ruling DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. The card read “SURPLUS — OCT $1,200”, money before everyday expenses, against the canon's Surplus (what is left after everything out). It reads “YOUR PAYCHECK — OCT”, and its pace line “Spent $X of your $Y paycheck this month”. Canon row 26 records the word. To reverse: call it SURPLUS again. One word from him reverses it."
 },
 {
  "id": "DEC-8387",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-7942 and DEC-3523 (tenet 5), made without asking him, as his order of 2026-09-30 says. The founder's $5,000 typed the old way showed $5,000 in the gross box under “Before anything comes out.”, and a profile loaded from the cloud was read as gross, $4,582 where $5,000 lands. The conversion now runs as the profile comes in: “$5,000.00 ≈ Worked back…”, “$0/month · 0%”. To reverse: convert only on save. One word from him reverses it."
 },
 {
  "id": "DEC-8769",
  "decided": "2026-10-27",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-27 under his ruling DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. The refusal said the card is drawn without a pot as the guaranteed income alone; the code stops when no age is entered, when retirement age is already reached, or when there is no pot to project from. It reads: No age entered, retirement age already reached, or no pot to project from — the card is not drawn. No figure moves. To reverse: drop the No age entered clause. One word from him reverses it."
 }
]
```
