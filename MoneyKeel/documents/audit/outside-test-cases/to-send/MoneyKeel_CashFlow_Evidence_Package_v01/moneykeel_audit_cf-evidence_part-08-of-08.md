# Cash flow evidence — part 08 of 08: The bill calendar

5 cases. Read `moneykeel_audit_cf-evidence_brief_v01.md` first. Answer each case with one JSON line, in the format the brief gives.

## The cases

Each case: the figure and the tenet, what the first reviewer said it lacked, the figure's own record, the evidence (by the render's key in the next section), the decisions that name the figure (quoted at the end), our own tests and their results, and our status. Our status is not the answer.

```json
[
 {
  "case": "MK-CF-M-028#5",
  "figure": "MK-CF-M-028",
  "figure_label": "each bill and the day it falls",
  "tenet": 5,
  "tenet_words": "The person's word outranks the app's guess. What they confirmed, typed or chose is never overwritten by a rule, a sync or a sweep.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "A figure declaration cannot establish that edits,sync,imports and recomputation preserve the person’s entered values for each bill and the day it falls. No code/test/app was inspected;this is an unclosed evidence requirement,not an observed overwrite."
  },
  "figure_record": {
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
   "ruled": "2026-09-27",
   "worked": {
    "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
    "answer": "$4,800"
   }
  },
  "evidence": {
   "render": "BILLS",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Car insurance · $1,400 due Oct 15, 2026",
    "found_at_render_line": 63
   },
   "printed_under": "MK-CF-M-028",
   "printed_texts": [
    "$1,400",
    "$4,800"
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
     "$1,400",
     "$4,800"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   }
  },
  "decisions": [
   "DEC-0078",
   "DEC-0187",
   "DEC-8415"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-028 each bill and the day it falls › T5 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "opening the screen changes nothing entered, and the figure prints under its identifier"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: opening the screen changed nothing entered; the figure prints under MK-CF-M-028; a sync of the same household left 7 of 7 entered values exactly as typed; the figure prints the same after it. Edits on another screen are not shown."
 },
 {
  "case": "MK-CF-M-028#6",
  "figure": "MK-CF-M-028",
  "figure_label": "each bill and the day it falls",
  "tenet": 6,
  "tenet_words": "His decision is the design. The last approved drawing and the decision log say what the app does. A change of mine never stands against them. Every decision is recorded in his words and applied in every place it reaches.",
  "first_review": {
   "date": "2026-10-25",
   "reviewer": "OpenAI",
   "audit_part": "19",
   "verdict": "FAIL",
   "kind": "evidence_gap",
   "what_it_said_it_lacked": "The package supplies decision references and a ruled date 2026-09-27. Latest approved full drawing/rendered implementation for this exact figure was not independently supplied/inspected;do not infer designcompliance from registration alone."
  },
  "figure_record": {
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
   "ruled": "2026-09-27",
   "worked": {
    "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
    "answer": "$4,800"
   }
  },
  "evidence": {
   "render": "BILLS",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "Car insurance · $1,400 due Oct 15, 2026",
    "found_at_render_line": 63
   },
   "printed_under": "MK-CF-M-028",
   "printed_texts": [
    "$1,400",
    "$4,800"
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
     "$1,400",
     "$4,800"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     1,
     2
    ],
    "the_rendered_line": "Car insurance · $1,400 due Oct 15, 2026",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Bill calendar"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/kept_editors_match.test.tsx",
     "test": "Bill calendar v02 › phone 1 · a working household, twelve months ahead — every figure as drawn",
     "kind": "test",
     "phones": [
      1
     ],
     "result": "passed",
     "lines": "170–187",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/kept_editors_match.test.tsx",
     "test": "Bill calendar v02 › phone 2 · the first day, nothing entered — every figure as drawn",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "189–204",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-0078",
   "DEC-0187",
   "DEC-8415"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-028 each bill and the day it falls › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phones that hold this screen (1, 2) — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it"
 },
 {
  "case": "MK-CF-M-061#6",
  "figure": "MK-CF-M-061",
  "figure_label": "END — where the month leaves you",
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
   "ruled": "2026-10-02",
   "worked": {
    "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
    "answer": "$6,600"
   }
  },
  "evidence": {
   "render": "BILLS",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "End",
    "found_at_render_line": 13
   },
   "printed_under": "MK-CF-M-061",
   "printed_texts": [
    "$8,000",
    "$6,600",
    "$1,800",
    "$1,800",
    "$1,800",
    "$1,800",
    "$1,800",
    "$1,800",
    "$1,800",
    "$1,800",
    "$1,800",
    "$1,800"
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
     "$8,000",
     "$6,600",
     "$1,800",
     "$1,800",
     "$1,800",
     "$1,800",
     "$1,800",
     "$1,800",
     "$1,800",
     "$1,800",
     "$1,800",
     "$1,800"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     1,
     2
    ],
    "the_rendered_line": "End",
    "drawn_on_those_phones": [
     {
      "phone": 1,
      "line": 16,
      "text": "End"
     },
     {
      "phone": 2,
      "line": 16,
      "text": "End"
     }
    ],
    "matched": "the whole rendered line, word for word",
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Bill calendar"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/kept_editors_match.test.tsx",
     "test": "Bill calendar v02 › phone 1 · a working household, twelve months ahead — every figure as drawn",
     "kind": "test",
     "phones": [
      1
     ],
     "result": "passed",
     "lines": "170–187",
     "holds_the_phone_with_the_line": true
    },
    {
     "file": "src/screens/__tests__/kept_editors_match.test.tsx",
     "test": "Bill calendar v02 › phone 2 · the first day, nothing entered — every figure as drawn",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "189–204",
     "holds_the_phone_with_the_line": true
    }
   ]
  },
  "decisions": [
   "DEC-8371"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-061 END — where the month leaves you › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "SETTLED BY OUR TESTS — WORDS AND FIGURES",
  "status_reason": "the line is drawn on phone 1, 2 (the whole rendered line, word for word), and every test that holds that phone word for word and figure for figure, in the drawing's own household, passes at this build: Bill calendar v02 › phone 1 · a working household, twelve months ahead — every figure as drawn; Bill calendar v02 › phone 2 · the first day, nothing entered — every figure as drawn. Appearance (colour, size, spacing) is not tested here."
 },
 {
  "case": "MK-CF-M-062#6",
  "figure": "MK-CF-M-062",
  "figure_label": "Short — set it aside by <date>",
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
   "ruled": "2026-10-02",
   "worked": {
    "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
    "answer": "$0"
   }
  },
  "evidence": {
   "render": "BILLS_LOW",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "/^Short \\$400 — set it aside by Oct 13, 2026/",
    "found_at_render_line": 64
   },
   "printed_under": "MK-CF-M-062",
   "printed_texts": [
    "$400",
    "$5,200"
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
     "$400",
     "$5,200"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     1,
     2
    ],
    "the_rendered_line": "Short $400 — set it aside by Oct 13, 2026, from savings or a backup.",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Bill calendar"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/kept_editors_match.test.tsx",
     "test": "Bill calendar v02 › phone 1 · a working household, twelve months ahead — every figure as drawn",
     "kind": "test",
     "phones": [
      1
     ],
     "result": "passed",
     "lines": "170–187",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/kept_editors_match.test.tsx",
     "test": "Bill calendar v02 › phone 2 · the first day, nothing entered — every figure as drawn",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "189–204",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-7936",
   "DEC-8371"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-062 Short — set it aside by <date> › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phones that hold this screen (1, 2) — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it"
 },
 {
  "case": "MK-CF-M-063#6",
  "figure": "MK-CF-M-063",
  "figure_label": "Covered — about $X there by <date>",
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
   "ruled": "2026-10-02",
   "worked": {
    "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
    "answer": "$8,000"
   }
  },
  "evidence": {
   "render": "BILLS",
   "line_beside_the_figure": {
    "as_the_measurer_reads_it": "✓ Covered — about $8,000 there by Oct 13, 2026.",
    "found_at_render_line": 64
   },
   "printed_under": "MK-CF-M-063",
   "printed_texts": [
    "$8,000",
    "$6,600"
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
     "$8,000",
     "$6,600"
    ],
    "figure_same_after_the_sync": true,
    "whole_screen_same_after_the_sync": true
   },
   "drawing": {
    "file": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html",
    "phones_read": "as drawn",
    "phones_that_hold_this_screen": [
     1,
     2
    ],
    "the_rendered_line": "✓ Covered — about $8,000 there by Oct 13, 2026.",
    "drawn_on_those_phones": [],
    "matched": null,
    "drawn_elsewhere_on_the_drawing": [],
    "design_record_rows": [
     "Bill calendar"
    ]
   },
   "match_tests": [
    {
     "file": "src/screens/__tests__/kept_editors_match.test.tsx",
     "test": "Bill calendar v02 › phone 1 · a working household, twelve months ahead — every figure as drawn",
     "kind": "test",
     "phones": [
      1
     ],
     "result": "passed",
     "lines": "170–187",
     "holds_the_phone_with_the_line": false
    },
    {
     "file": "src/screens/__tests__/kept_editors_match.test.tsx",
     "test": "Bill calendar v02 › phone 2 · the first day, nothing entered — every figure as drawn",
     "kind": "test",
     "phones": [
      2
     ],
     "result": "passed",
     "lines": "189–204",
     "holds_the_phone_with_the_line": false
    }
   ]
  },
  "decisions": [
   "DEC-7936",
   "DEC-8371"
  ],
  "our_tests": [
   {
    "file": "src/screens/__tests__/outside_cashflow_openai_screens.test.tsx",
    "test": "MK-CF-M-063 Covered — about $X there by <date> › T6 · reviewer FAIL (evidence_gap) · EVIDENCE GAP · what holds",
    "result": "passed",
    "what_it_checks": "the line beside the figure is on the rendered screen, and its drawing and match test exist"
   }
  ],
  "status": "FOR YOU TO SETTLE",
  "status_reason": "the line is not on the phones that hold this screen (1, 2) — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it"
 }
]
```

## The renders — each screen as it rendered, with the store before and after

Every line in order (`[icon]` is an icon); every figure printed under its identifier; every value the person entered, before the screen opened and after; and the same household arriving by a cloud sync.

```json
{
 "BILLS": {
  "screen": "BillCalendarScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('bills', H_BILL, '2026-09-28')",
  "stored_before_opening": {
   "assetAccounts": [
    {
     "asset_id": "chk",
     "label": "Checking",
     "kind": "checking",
     "tax_bucket": "CASH",
     "balance": 8000
    }
   ],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment"
    ],
    "birthYear": "1975",
    "baseSalary": "0",
    "monthlySpending": 0,
    "spendCats": [
     {
      "id": "proptax",
      "label": "Property tax",
      "amount": 4800,
      "bucket": "nonmonthly",
      "months": [
       11
      ],
      "dueDay": 1,
      "tier": "critical"
     },
     {
      "id": "carins",
      "label": "Car insurance",
      "amount": 1400,
      "bucket": "nonmonthly",
      "months": [
       10
      ],
      "dueDay": 15
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
   "001  ‹ Back",
   "002  [icon]",
   "003  [icon]",
   "004  Bill calendar",
   "005  Sep 2026 – Aug 2027 · when money lands, when bills are due, and the surplus.",
   "006  Cash on hand now",
   "007  Auto-filled from your accounts ($8,000) — the starting balance the table carries forward. Edit it and the End column recalculates from there.",
   "008  OK — you stay above zero in all 12 months",
   "009  Lowest point $1,800 — Nov.",
   "010  Month",
   "011  In",
   "012  Out",
   "013  End",
   "014  Sep",
   "015  —",
   "016  —",
   "017  $8,000",
   "018  Oct",
   "019  —",
   "020  −$1,400",
   "021  $6,600",
   "022  Nov",
   "023  —",
   "024  −$4,800",
   "025  $1,800",
   "026  Dec",
   "027  —",
   "028  —",
   "029  $1,800",
   "030  Jan ’27",
   "031  —",
   "032  —",
   "033  $1,800",
   "034  Feb ’27",
   "035  —",
   "036  —",
   "037  $1,800",
   "038  Mar ’27",
   "039  —",
   "040  —",
   "041  $1,800",
   "042  Apr ’27",
   "043  —",
   "044  —",
   "045  $1,800",
   "046  May ’27",
   "047  —",
   "048  —",
   "049  $1,800",
   "050  Jun ’27",
   "051  —",
   "052  —",
   "053  $1,800",
   "054  Jul ’27",
   "055  —",
   "056  —",
   "057  $1,800",
   "058  Aug ’27",
   "059  —",
   "060  —",
   "061  $1,800",
   "062  COMING UP",
   "063  Car insurance · $1,400 due Oct 15, 2026",
   "064  ✓ Covered — about $8,000 there by Oct 13, 2026.",
   "065  Property tax · $4,800 due Nov 1, 2026",
   "066  ✓ Covered — about $6,600 there by Oct 30, 2026.",
   "067  Assumes money should be in your account 2 days before the due date.",
   "068  + Add a dated bill",
   "069  A forward plan, not a promise: expenses use your planned amounts, income is after estimated tax, and non-monthly bills land in the months you chose."
  ],
  "figures_printed_by_identifier": [
   "MK-NW-M-005  $8,000",
   "MK-CF-M-060  $1,800",
   "MK-CF-M-060  $1,800",
   "MK-CF-M-061  $8,000",
   "MK-CF-M-052  $1,400",
   "MK-CF-M-061  $6,600",
   "MK-CF-M-052  $4,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-061  $1,800",
   "MK-CF-M-028  $1,400",
   "MK-CF-M-063  $8,000",
   "MK-CF-M-028  $4,800",
   "MK-CF-M-063  $6,600"
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
    "MK-NW-M-005  $8,000",
    "MK-CF-M-060  $1,800",
    "MK-CF-M-060  $1,800",
    "MK-CF-M-061  $8,000",
    "MK-CF-M-052  $1,400",
    "MK-CF-M-061  $6,600",
    "MK-CF-M-052  $4,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-061  $1,800",
    "MK-CF-M-028  $1,400",
    "MK-CF-M-063  $8,000",
    "MK-CF-M-028  $4,800",
    "MK-CF-M-063  $6,600"
   ],
   "whole_screen_the_same": true
  }
 },
 "BILLS_LOW": {
  "screen": "BillCalendarScreen",
  "day": "2026-09-28",
  "taps": "none — the screen as it opens",
  "screen_parameters": {},
  "how_the_measurer_rendered_it": "shoot('bills', { ...H_BILL, assetAccounts: [{ ...H_BILL.assetAccounts[0], balance: 1000 }] }, '2026-09-28')",
  "stored_before_opening": {
   "assetAccounts": [
    {
     "asset_id": "chk",
     "label": "Checking",
     "kind": "checking",
     "tax_bucket": "CASH",
     "balance": 1000
    }
   ],
   "liabilities": [],
   "transactions": [],
   "expenses": [],
   "onboardingProfile": {
    "status": "employed",
    "incomeSources": [
     "employment"
    ],
    "birthYear": "1975",
    "baseSalary": "0",
    "monthlySpending": 0,
    "spendCats": [
     {
      "id": "proptax",
      "label": "Property tax",
      "amount": 4800,
      "bucket": "nonmonthly",
      "months": [
       11
      ],
      "dueDay": 1,
      "tier": "critical"
     },
     {
      "id": "carins",
      "label": "Car insurance",
      "amount": 1400,
      "bucket": "nonmonthly",
      "months": [
       10
      ],
      "dueDay": 15
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
   "001  ‹ Back",
   "002  [icon]",
   "003  [icon]",
   "004  Bill calendar",
   "005  Sep 2026 – Aug 2027 · when money lands, when bills are due, and the surplus.",
   "006  Cash on hand now",
   "007  Auto-filled from your accounts ($1,000) — the starting balance the table carries forward. Edit it and the End column recalculates from there.",
   "008  Careful — short in Oct, Nov, Dec, Jan ’27, Feb ’27, Mar ’27, Apr ’27, May ’27, Jun ’27, Jul ’27, Aug ’27",
   "009  Lowest point −$5,200 (Nov). The biggest cause: Car insurance ($1,400) in Oct.",
   "010  Month",
   "011  In",
   "012  Out",
   "013  End",
   "014  Sep",
   "015  —",
   "016  —",
   "017  $1,000",
   "018  Oct !",
   "019  —",
   "020  −$1,400",
   "021  −$400 short",
   "022  Nov !",
   "023  —",
   "024  −$4,800",
   "025  −$5,200 short",
   "026  Dec !",
   "027  —",
   "028  —",
   "029  −$5,200 short",
   "030  Jan ’27 !",
   "031  —",
   "032  —",
   "033  −$5,200 short",
   "034  Feb ’27 !",
   "035  —",
   "036  —",
   "037  −$5,200 short",
   "038  Mar ’27 !",
   "039  —",
   "040  —",
   "041  −$5,200 short",
   "042  Apr ’27 !",
   "043  —",
   "044  —",
   "045  −$5,200 short",
   "046  May ’27 !",
   "047  —",
   "048  —",
   "049  −$5,200 short",
   "050  Jun ’27 !",
   "051  —",
   "052  —",
   "053  −$5,200 short",
   "054  Jul ’27 !",
   "055  —",
   "056  —",
   "057  −$5,200 short",
   "058  Aug ’27 !",
   "059  —",
   "060  —",
   "061  −$5,200 short",
   "062  COMING UP",
   "063  Car insurance · $1,400 due Oct 15, 2026",
   "064  Short $400 — set it aside by Oct 13, 2026, from savings or a backup.",
   "065  Property tax · $4,800 due Nov 1, 2026",
   "066  Short $5,200 — set it aside by Oct 30, 2026, from savings or a backup.",
   "067  Assumes money should be in your account 2 days before the due date.",
   "068  + Add a dated bill",
   "069  IF YOU CAN’T PAY EVERYTHING, PAY THESE FIRST",
   "070  Protect the essentials — housing, food, utilities, medicine — before anything optional.",
   "071  • Property tax",
   "072  A forward plan, not a promise: expenses use your planned amounts, income is after estimated tax, and non-monthly bills land in the months you chose."
  ],
  "figures_printed_by_identifier": [
   "MK-CF-M-016  $1,400",
   "MK-NW-M-005  $1,000",
   "MK-CF-M-060  −$5,200",
   "MK-CF-M-061  $1,000",
   "MK-CF-M-052  $1,400",
   "MK-CF-M-061  −$400",
   "MK-CF-M-052  $4,800",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-061  −$5,200",
   "MK-CF-M-028  $1,400",
   "MK-CF-M-062  $400",
   "MK-CF-M-028  $4,800",
   "MK-CF-M-062  $5,200"
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
    "MK-CF-M-016  $1,400",
    "MK-NW-M-005  $1,000",
    "MK-CF-M-060  −$5,200",
    "MK-CF-M-061  $1,000",
    "MK-CF-M-052  $1,400",
    "MK-CF-M-061  −$400",
    "MK-CF-M-052  $4,800",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-061  −$5,200",
    "MK-CF-M-028  $1,400",
    "MK-CF-M-062  $400",
    "MK-CF-M-028  $4,800",
    "MK-CF-M-062  $5,200"
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
 "Bill calendar": "`MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html` — drawn 2026-10-02 from the build (every string the screen renders, at its StyleSheet's size, weight and colour, both data states), audited against the screen standard and the gaps fixed the same day. **APPROVED 2026-10-02** (*\"ok. open them from build but make sure it meets new design standards\"*). v01 is archived. Kept 2026-10-02 as an EDITOR, not a destination: reached from the menu and the Money sheet (\"A dated bill\") — the editor behind the big-ticket radar rows of the approved This month (cash-flow_v01, frame 1); the link from This month to the calendar, which that drawing does not have, is gone. **2026-10-24, five READ THIS FIRST rows on v02 (the phones not redrawn):** two DRAWING ERROR lines left as drawn with their correction, as his DEC-4529 asks — the foot line's promise of a tap no row has, and the year written twice, Oct 2026 – Sep 2027 (DEC-7947); the twelve months are the Cash flow tab's own (DEC-7941); every row adds up as printed (DEC-7937); a dated bill is on top of the typed budget (DEC-7951). COMING UP is not drawn on v02; its line now reads the month table (DEC-7936). Held by `kept_editors_match.test.tsx` (difference 23), 54 of 54, and `bill_calendar_coming_up_agrees_2026_10_24.test.tsx`, 8 of 8, on 2026-10-24. **2026-10-25/26, four READ THIS FIRST rows on v02:** In, Out and End black at 800, and no verdict on the first day (DEC-8371); a yearly bill with no month is not on COMING UP (DEC-8415); no verdict without a cash balance on record, and a $0 balance projected (DEC-8376, DEC-8377). CF-MMFIX-A wrote its two rows of 2026-10-25 after the code. **2026-10-27/30, rows, before the code:** the Cash on hand box empty, no grey $0 (DEC-8961); the top bar 4 points down (DEC-8928); every box title on a bar, the cards square (DEC-8915); the money boxes show $12,000 (DEC-8930); the logo row of 2026-10-30 (his DEC-8914), the phones not redrawn. | —"
}
```

## The drawing — `MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html`

**READ THIS FIRST — RULED AFTER THIS MOCKUP. The phones below are not redrawn; where this line and a phone disagree, this line is the design.** 

Its dated rows, every one, as written on the drawing (13):

```json
[
 {
  "text": "2026-10-21 · DEC-0231 · DEC-4529 — DRAWING ERROR, both phones — the top bar’s back button is drawn with semicircle ends (border-radius 19px on a button 32px tall), copied from the code. His ruling of 2026-09-25 is rounded corners, not semicircle ends, for the buttons on every screen: the corner is corrected to 12 , the one corner of a button and of a choice in the app. Its size, colours and words do not change. The round icon buttons at the right of the bar stay circles: a circle has no ends. The phones are not redrawn. Line added 2026-10-21. His words: “make the buttons same as all radio buttons across all screens — rounded corners not semicircle ends” (DEC-0231). In the code."
 },
 {
  "text": "2026-10-24 · DEC-3523 (tenet 1) · DEC-0440 — DRAWING ERROR, both phones — the foot line ends “Tap any row for that month’s full detail.”, and a screen reader said each month row “Opens the month’s detail.” No row has a tap: month detail was retired on 2026-10-02, when This month (cash-flow_v01) was built without a door to it. The sentence is not printed and the rows no longer promise it; the rest of the foot line is unchanged. Found by the Cash flow journey E2E-80. Not a decision of his: made under tenet 1 without asking him; one word from him reverses it. To reverse: give each month row a door to that month, and print the sentence again. Line added 2026-10-24. In the code."
 },
 {
  "text": "2026-10-24 · DEC-3523 (tenet 4) — DRAWING ERROR, both phones — a typo: the line under the title reads “Oct 2026 – Sep ’27 2027”, the year twice, copied from the build. It reads “Oct 2026 – Sep 2027”: each end is a month as the app’s one date writer writes it, without the day. A screen reader hears each month row the same way (“Jan 2027: in …”, where it heard “Jan ’27 2027”). The month names in the table (“Jan ’27”) do not change. The lead’s ruling on the Cash flow journey E2E-80. Line added 2026-10-24. In the code."
 },
 {
  "text": "2026-10-24 · DEC-1923 · DEC-0283 · DEC-3523 (tenets 1, 4) — The twelve months are the Cash flow tab’s own. With the home’s mortgage in Debts, the Rent / Mortgage budget line is not counted beside it, as This month does not count it: $7,200 in, $700 of groceries and the $2,400 mortgage out, September’s End $4,100 (it read $5,400 out and an End of $1,800, the $2,300 line counted too). The In column is the take-home after tax and the 401(k), as Your base pay prints it. A yearly bill whose day has already passed this month is in this month’s Out and is not under COMING UP (it was listed for the same day next year). The words do not change. Found by the Cash flow journeys E2E-72 and E2E-81. Not a decision of his: made under tenets 1 and 4 and his rule DEC-1923 without asking him; one word from him reverses it. To reverse: build the calendar’s months from the budget as typed again. Line added 2026-10-24. In the code."
 },
 {
  "text": "2026-10-24 · DEC-0002 · DEC-0447 · DEC-3523 (tenet 1) — A bill added here with its own month is on top of the monthly budget, in that month only. With $2,000/month typed, $2,650/month of debt payments and $1,200 of car insurance added for Oct 15, every month’s Out keeps the full $2,000 — Out $4,650, October $5,850 — and COMING UP reads “Short $500 — set it aside by Oct 13, 2026, from savings or a backup.” It read Out $4,550, October $5,750 and short $300: the typed $2,000 was taken to hold $100/month of the bill. The words do not change. Found by the Cash flow journeys’ test H4. Not a decision of his: made under his rules DEC-0002 and DEC-0447 and tenet 1 without asking him; one word from him reverses it. To reverse: read the typed budget as holding a twelfth of each dated bill again. Line added 2026-10-24. In the code."
 },
 {
  "text": "2026-10-24 · DEC-3523 (tenet 2) · DEC-0264 — Every row of the table adds up as printed: the End before it, plus In, less Out, is its End. Each End is the balance rounded to the dollar, as the lowest point beside it is; In and Out share the change between two Ends, each less than a dollar from its exact value, a whole-dollar figure never moving. From $3,000, $5,415.83 in and $1,198.77 out end at $7,217.06: Sep +$5,416 · −$1,199 · $7,217 — each rounded alone, a row could miss its End by a dollar. The words do not change. Found by the Cash flow journey E2E-72. Not a decision of his: made under tenet 2 without asking him; one word from him reverses it. To reverse: round In, Out and End each on its own again. Line added 2026-10-24. In the code."
 },
 {
  "text": "2026-10-25 · DEC-3523 (tenets 1, 3) · MK-CF-M-051 · MK-CF-M-052 · MK-CF-M-061 — The table’s In, Out and End are drawn black at 800, every one: In was green at regular weight and Out regular with no colour of its own; both now read as End reads. A screen reader hears a month as printed: where In or Out is “—” it hears “—” (it heard “in $0 a month, out $0 a month” beside a printed —). The words do not change. Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the Cash flow drawing match (MM-CF, 2026-10-24) and built by CF-MMFIX-A. One word from him reverses it. To reverse: give In its green and Out its regular weight again. Line added 2026-10-25. In the code since 2026-10-25."
 },
 {
  "text": "2026-10-25 · DEC-3523 (tenet 3) · DEC-0431 · MK-CF-M-060 — DRAWING ERROR, phone 1 (the first day): with nothing entered there is no verdict — no “OK — you stay above zero in all 12 months” and no “Lowest point $0”, a verdict on nothing; the table says “Nothing entered yet” and its door, as his rule DEC-0431 words a fresh account. A cash on hand typed in the box is kept, with the day it was typed, when the person leaves the screen, and the line under the box says so: “You entered this on Oct 25, 2026; your accounts hold $5,000. The table carries forward what you entered — edit it and the End column recalculates from there.” (it went back to the accounts’ cash on the next visit). Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the outside measurement of Cash flow’s screens (OpenAI, measured by CFR-5) and built by CF-MMFIX-A. One word from him reverses it. The second part is the lead’s ruling of 2026-10-25. To reverse: draw the verdict on the first day again, and read the accounts’ cash on every visit. Line added 2026-10-25. In the code since 2026-10-25."
 },
 {
  "text": "2026-10-25 · DEC-3523 (tenets 3, 5) · DEC-7611 · MK-CF-M-028 · MK-CF-M-062 · MK-CF-M-063 — COMING UP (not drawn on this version): with no cash on hand given — the box blank — each bill keeps its name, amount and due date, and the line under it reads the row’s own refusal, “No balance to start from — nothing is projected.” It read “Short $1,400 — set it aside by Oct 13, 2026, from savings or a backup.”, worked from a $0 nobody entered. A cash on hand typed as 0 is an answer, and the line is worked from it. A once-in-a-while bill with no month set is not listed: it has no date, and the table counts it as a twelfth a month in Out ($1,200 a year reads $100 in every month; it read “Insurance · $1,200 due Jan 1, 2027”, a date nobody gave, while the table took $100 a month). A bill typed for the 29th, 30th or 31st falls on the last day of a shorter month (the 29th of February is Feb 28, 2027). The verdict above the table is not changed by this line. Not a decision of his: made without asking him, as his order of 2026-09-30 says, on the outside review’s part 8 (CFR-2) and built by FIX-BILLS. One word from him reverses it. To reverse: project COMING UP from $0 when the box is blank, and date a bill with no month on January 1. Line added 2026-10-25. In the code since 2026-10-25."
 },
 {
  "text": "2026-10-26 · DEC-3523 (tenets 3, 5) · MK-CF-M-060 · MK-CF-M-063 — With no balance to start from (the box left blank), the calendar gives no verdict: no “Careful — short in …” and no “OK — you stay above zero”, which were worked from a $0 nobody entered; where the verdict stands it says only “No balance to start from — nothing is projected.”, the line COMING UP already says. A cash account holding $0 on record is an answer, not a blank: the box reads 0 and the table and the verdict are projected from it (it read blank and refused). The box is blank only when no cash balance is on record, and the line under it then reads “No cash balance on record yet — enter what you have, and the table starts from it.” (it said “Auto-filled from your accounts ($0)”). Not a decision of his: the lead’s rulings of 2026-10-26 on FIX-BILLS’ findings, made without asking him, as his order of 2026-09-30 says; built by CF-MMFIX-A. One word from him reverses it. To reverse: work the verdict from $0 with the box blank, and leave a $0 balance’s box blank. Line added 2026-10-26. In the code since 2026-10-26."
 },
 {
  "text": "2026-10-27 · DEC-0296 · DEC-3523 (tenet 3) · MK-CF-M-060 — Phone 2 (the first day), and whenever no cash balance is on record: the Cash on hand box is empty — no grey ‘$0’ inside it, which reads as a balance entered. The line under it already says why: ‘No cash balance on record yet — enter what you have, and the table starts from it.’ The bill form’s boxes lose their grey samples too: Amount, Day and Year are empty until typed (they showed ‘$0’, ‘15’ and this year); the name keeps its example, ‘Property tax’, a word and not a figure. A typed 0 is still an answer (the 2026-10-25 line). Not a decision of his: made without asking him, as his order of 2026-09-30 says; found by the round-2 drawing match (BC2-01), under his rule DEC-0296 (an unknown input produces no number and a reason — never a default) — the Monthly income drawing’s row of 2026-10-25 took the grey samples out of its boxes for the same reason. One word from him reverses it. To reverse: put ‘$0’, ‘15’ and the year back as the boxes’ samples. Line added 2026-10-27. In the code since 2026-10-27 — row written before the code."
 },
 {
  "text": "2026-10-27 · DEC-8336 · DEC-3523 (tenet 4) — Words not drawn on these phones (the first-day gate, the lump-sum line, the short-month card): an apostrophe inside a word is ’ , as the phones draw it — ‘it’s built from …’, ‘it’s in that month’s Out column.’, ‘IF YOU CAN’T PAY EVERYTHING, PAY THESE FIRST’, the marks around essential in ‘Mark bills … to see them here.’ Not a decision of his: the class DEC-8336 fixed on Net worth; found by the round-2 drawing match (CF2-10). To reverse: write ' again. Line added 2026-10-27. In the code since 2026-10-27 — row written before the code. 2026-10-27 · DEC-0354 · DEC-0059 · DEC-6457 · DEC-4529 — Approved before: this drawing, 2026-10-02 (‘ok. open them from build but make sure it meets new design standards’). Both phones draw the top bar 14 points in from each side, its back button and round icons 32 points tall. His feedback: His words, 2026-09-14 (DEC-0354): ‘you did not have ‘MoneyKeel’ at the top which every other screen has’; 2026-08-04 (DEC-0059): ‘make sure font size and color and overall design are same across all screens.’ New: The MoneyKeel top bar starts 4 points below the status bar (the app started it 6 down until today), sits 20 points in from each side and 10 above the page; its button and two round icons are 38 points tall, the button’s words 13 points. The phones are not redrawn. Why 4 · 20 · 10: the account page v01, approved 2026-10-19 (DEC-6457), the newest approved drawing with this bar, and Net worth v08 (DEC-0644) both draw it. Not a decision of his: the lead’s ruling of 2026-10-27, made without asking him, as his order of 2026-09-30 says. To reverse: start the bar 6 points down again. In the code since 2026-10-27."
 },
 {
  "text": "2026-10-27 · DEC-8839 · DEC-3523 (tenet 6) — Both phones, and the cards they open: every box title sits on a dark-green bar , edge to edge with square corners — COMING UP, LATER — BEYOND THIS 12-MONTH WINDOW, IF YOU CAN’T PAY EVERYTHING, PAY THESE FIRST, and the bill form’s ADD A DATED BILL / EDIT THIS BILL (they were quiet labels and a 15-point title). So that each bar can run to its card’s edges, every card is square and white , its rows 16 points in, as Cash flow’s own tabs are (they were rounded, 12 in). The words, the figures and the order do not change. His words: “ContributionRoom, Stress Test screens - both are not standard app design as the standard design says box titles in dark green bar, and sub-titles in light green bar.” (DEC-8839, 2026-10-27); the lead’s ruling R1 of 2026-10-27 makes it app-wide, and the screen-design standard carries it (section 2.3). Applied by FX-CF-A without asking him again. To reverse: give the titles their quiet labels and the cards their rounded corners again. Line added 2026-10-27. In the code since 2026-10-27 — row written before the code. 2026-10-27 · DEC-8385 · DEC-0177 · DEC-3768c · DEC-3523 — Approved before: this drawing, 2026-10-02 (“ok. open them from build but make sure it meets new design standards”). Its money boxes print a typed figure plain. His feedback: None on these boxes. He approved the income drawing on 2026-08-27 (DEC-0177: “yes”), which draws a money box with its figure as money, ‘$7,000’. New: Every money box on this screen shows its figure the way a figure is printed, while it is typed — ‘$1,000’ where a box was drawn ‘1000’, ‘$192.50’ where ‘192.5’; where the screen prints its own $ just before the box, the box reads ‘1,000’, so the $ is printed once — and it stores the plain amount, so no figure moves. The box keeps its look. A typed letter is refused whole (DEC-3768c). Shares, contracts, rates, days and years keep their plain digits. The phones are not redrawn. One figure, one form (tenet 4, DEC-3523): the money boxes of the income screens already show ‘$7,000’ (DEC-8385), and one component, MoneyBox, now draws every money box in the app — src/__tests__/every_money_box_is_moneybox.test.tsx counts them all. Not a decision of his: the lead’s ruling of 2026-10-27, made without asking him, as his order of 2026-09-30 says. To reverse: print the plain figure in the box again. In the code since 2026-10-27. 2026-10-30 · brand-wordmark v02 · DEC-8891 — Approved before: this drawing, 2026-10-02 (“ok. open them from build but make sure it meets new design standards”). Its top bar draws the name typed in two colours, ‘Money’ green and ‘Keel’ navy, as the app drew it until 2026-10-30. No logo decision of his is on record before this one. His feedback: his instruction of 2026-10-30, with his three logo files: “change the logo to attached”. New: The lettering in the top bar is now his logo of 2026-10-30, his dark-green ‘MoneyKeel’ lettering at 84 × 17.1 points, as ‘MoneyKeel/documents/other/moneykeel_pres_mock_brand-wordmark_v02.html’ draws it. Nothing else on the phones moves. The phones are not redrawn. His instruction, carried to this drawing by the lead’s row of 2026-10-30, made without asking him, as his order of 2026-09-30 says. To reverse: the old lettering is kept in ‘assets/brand/archive-2026-10-30/’. In the code since 2026-10-30."
 }
]
```

Its phones that hold the screens in this part (1, 2), every line in order, as the match tests read them.

```json
{
 "phone 1": [
  "▮▮▮ ◔ ▭",
  "‹ Back",
  "Money",
  "Keel",
  "◉",
  "⚙",
  "Bill calendar",
  "Oct 2026 – Sep ’27 2027 · when money lands, when bills are due, and the surplus.",
  "Cash on hand now",
  "Auto-filled from your accounts ($0) — the starting balance the table carries forward. Edit it and the End column recalculates from there.",
  "OK — you stay above zero in all 12 months",
  "Lowest point $2,980 — Oct.",
  "Month",
  "In",
  "Out",
  "End",
  "Oct",
  "+$7,200",
  "−$4,220",
  "$2,980",
  "Nov",
  "+$7,200",
  "−$4,220",
  "$5,960",
  "Dec",
  "+$7,200",
  "−$4,220",
  "$8,940",
  "Jan ’27",
  "+$7,200",
  "−$4,220",
  "$11,920",
  "Feb ’27",
  "+$7,200",
  "−$4,220",
  "$14,900",
  "Mar ’27",
  "+$7,200",
  "−$4,220",
  "$17,880",
  "Apr ’27",
  "+$7,200",
  "−$7,820",
  "$17,260",
  "May ’27",
  "+$7,200",
  "−$4,220",
  "$20,240",
  "Jun ’27",
  "+$7,200",
  "−$4,220",
  "$23,220",
  "Jul ’27",
  "+$7,200",
  "−$4,220",
  "$26,200",
  "Aug ’27",
  "+$7,200",
  "−$4,220",
  "$29,180",
  "Sep ’27",
  "+$7,200",
  "−$4,220",
  "$32,160",
  "+ Add a dated bill",
  "A forward plan, not a promise: expenses use your planned amounts, income is after estimated tax, and non-monthly bills land in the months you chose. Tap any row for that month's full detail.",
  "Bill calendar — a working household, twelve months ahead."
 ],
 "phone 2": [
  "▮▮▮ ◔ ▭",
  "‹ Back",
  "Money",
  "Keel",
  "◉",
  "⚙",
  "Bill calendar",
  "Oct 2026 – Sep ’27 2027 · when money lands, when bills are due, and the surplus.",
  "Cash on hand now",
  "Auto-filled from your accounts ($0) — the starting balance the table carries forward. Edit it and the End column recalculates from there.",
  "OK — you stay above zero in all 12 months",
  "Lowest point $0 — Oct.",
  "Month",
  "In",
  "Out",
  "End",
  "Oct",
  "—",
  "—",
  "$0",
  "Nov",
  "—",
  "—",
  "$0",
  "Dec",
  "—",
  "—",
  "$0",
  "Jan ’27",
  "—",
  "—",
  "$0",
  "Feb ’27",
  "—",
  "—",
  "$0",
  "Mar ’27",
  "—",
  "—",
  "$0",
  "Apr ’27",
  "—",
  "—",
  "$0",
  "May ’27",
  "—",
  "—",
  "$0",
  "Jun ’27",
  "—",
  "—",
  "$0",
  "Jul ’27",
  "—",
  "—",
  "$0",
  "Aug ’27",
  "—",
  "—",
  "$0",
  "Sep ’27",
  "—",
  "—",
  "$0",
  "Nothing entered yet. Add your bills ›",
  "+ Add a dated bill",
  "A forward plan, not a promise: expenses use your planned amounts, income is after estimated tax, and non-monthly bills land in the months you chose. Tap any row for that month's full detail.",
  "Bill calendar — the first day, nothing entered."
 ]
}
```

## The match tests — each test that holds one of these screens to a drawing phone, its code and its result at this build

**Bill calendar v02 › phone 1 · a working household, twelve months ahead — every figure as drawn** — `src/screens/__tests__/kept_editors_match.test.tsx`, lines 170–187, phones 1: **passed**

```ts
test('phone 1 · a working household, twelve months ahead — every figure as drawn', () => {
    // $9,000 a month at their own 20% is $7,200 in; $4,220 out, and a $3,600 bill that falls in April
    // the drawing auto-fills the box from the accounts, so its household holds a checking account — at $0, a balance on record, from
    // which the table and the verdict are projected (the drawing's row of 2026-10-26: with no cash on record nothing is projected)
    const built = show(BillCalendarScreen, { onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '9000', salaryFreq: 'monthly',
      taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4220',
      spendCats: [{ id: 'everyday', label: 'Everyday', amount: 4220, bucket: 'flexible' }, { id: 'ins', label: 'Home insurance', amount: 3600, bucket: 'nonmonthly', months: [4], dueDay: 10 }] },
      assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 0, asset_class: 'cash' }] });
    const want = normExact(upTo(P[0], /^A forward plan, not a promise/).map(yearOnce)).replace(/ tap any row for that month's full detail\.$/, '');   // 23
    expect(want.split(' ').length).toBeGreaterThan(120);
    expect(want).toContain('$32,160');                                    // the stream holds the figures, not "$#"
    expect(firstDifference(want, normExact(built))).toBe('');
    // worked by hand: each End is the last + $7,200 − Out — Oct 0 + 7,200 − 4,220 = 2,980 … Apr 17,880 + 7,200 − 7,820 = 17,260 … Sep 32,160
    expect(built.filter((l) => l === '+$7,200')).toHaveLength(12);
    expect(built.filter((l) => l === '−$4,220')).toHaveLength(11);
    expect(built).toContain('−$7,820');                                    // April: $4,220 + the $3,600 bill
    expect(built).toContain('Lowest point $2,980 — Oct.');
  })
```

**Bill calendar v02 › phone 2 · the first day, nothing entered — every figure as drawn** — `src/screens/__tests__/kept_editors_match.test.tsx`, lines 189–204, phones 2: **passed**

```ts
test('phone 2 · the first day, nothing entered — every figure as drawn', () => {
    const built = show(BillCalendarScreen, { onboardingProfile: {} });
    // the drawing's READ THIS FIRST row of 2026-10-25 (BC-02, tenet 3): with nothing entered there is no verdict — the drawn "OK — you
    // stay above zero in all 12 months · Lowest point $0" is a verdict on nothing, and the table's "Nothing entered yet" stands instead
    const want = normExact(upTo(P[1], /^A forward plan, not a promise/).map(yearOnce)).replace(/ tap any row for that month's full detail\.$/, '')   // 23
      .replace(/ ok — you stay above zero in all 12 months lowest point \$0 — oct\./, '')
      // and its row of 2026-10-26: with no cash balance on record the line under the box says so (it said "Auto-filled … ($0)")
      .replace("auto-filled from your accounts ($0) — the starting balance the table carries forward. edit it and the end column recalculates from there.",
        'no cash balance on record yet — enter what you have, and the table starts from it.');
    expect(want.split(' ').length).toBeGreaterThan(100);
    expect(want).not.toMatch(/ok — you stay above zero|auto-filled/);   // both named changes found their drawn lines
    expect(firstDifference(want, normExact(built))).toBe('');
    // twelve months, each — in, — out, $0 at the end: nothing behind them (Q48)
    expect(built.filter((l) => l === '$0')).toHaveLength(12);
    expect(built.filter((l) => l === '—')).toHaveLength(24);
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
  "id": "DEC-0187",
  "decided": "2026-08-27",
  "in_use": "IN USE",
  "whose": "his",
  "his_words": "",
  "the_log_records": "Months are keyed by their actual date rather than by position — “2026-07”, not “slot 7 of twelve”. The twelve-slot version wrote January into the wrong year whenever the twelve months crossed a New Year."
 },
 {
  "id": "DEC-7936",
  "decided": "2026-10-24",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0269 and DEC-3523 (tenets 1, 2, 4 and 7), made without asking him, as his order of 2026-09-30 says. Money there by a day is the table's End for the month before, plus or less anything dated earlier in that month; that month's own pay, everyday expenses and debt payments count only when the month loses money (tenet 7: never better than it is). Sep 28, $0 on hand, $5,000 take-home, $700 of groceries, $2,650 of debt payments, $1,200 due Dec 15 (need-by Dec 13): the line said about $10,744, the wage spread by day with the debts left out; it now reads November's End, about $4,950 (Sep End 5,000 − 3,350 = $1,650, Oct $3,300, Nov $4,950). With property tax of $4,800 due Dec 1 as well: Covered, about $8,765, became Short $1,500 (October's End $3,300), and the Dec 15 bill Short $1,050. Two bills due the same day both counted the whole balance; the first listed now gets the money first ($4,950, then $3,750). A one-time bill for March 2028 is no longer listed as March 2027. Whole months, because the app never asks the day pay lands. To reverse: in MK-CF-F-232 balanceByDay change Math.min(0, regular) to regular, and drop aheadOfIt in upcomingBills. One word from him reverses it."
 },
 {
  "id": "DEC-8371",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-3523 (tenet 3) and DEC-1112, made without asking him, as his order of 2026-09-30 says. In printed green at regular weight; In, Out and End now print black at 800. A screen reader heard “$0” where “—” is printed; it hears the dash. With nothing entered it said “OK — you stay above zero” over $0; it gives no verdict. A cash on hand typed on the calendar was lost on leaving; it is kept with the day it was entered (“You entered this on …”). To reverse: work the first day from $0 and forget the typed cash. One word from him reverses it."
 },
 {
  "id": "DEC-8415",
  "decided": "2026-10-25",
  "in_use": "IN USE",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-25 under his rulings DEC-7611 and DEC-3523 (tenets 3 and 4), made without asking him, as his order of 2026-09-30 says. A $1,200 yearly bill with no month read “due Jan 1”, and the month table counted $1,200 in January plus $100 in every other month, $2,300 a year. It is off the dated list and counts $100 every month, $1,200 a year. To reverse: give it its own named row each month. One word from him reverses it."
 }
]
```
