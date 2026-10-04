# Brief — write the test cases, from outside

MoneyKeel · calculation audit · v02 · 2026-10-04

## What this is

MoneyKeel is a personal-finance app. Every number it shows comes from a small function, and groups of
functions are run by an **orchestrator** — the one function a screen asks for a whole answer (for
example, "how are my investments doing").

Those functions already have tests, and the tests pass. Five of the functions were still wrong. The
reason: the person who wrote each function also wrote its test, from the same understanding. A wrong
rule produced a wrong example that agreed with it.

**Your job is to write test cases that do not share that understanding.** You are the outside judge.

## The one rule that matters

**You are not shown the code inside any function, the existing tests, or any answer the app gives. Do
not ask for them.**

If you saw them you would start to agree with them. Work only from what a function is *for*, the
owner's written decisions, and ordinary arithmetic and finance.

You are also working alone. Another model is doing the same job separately. Do not try to guess what
it will write. Where your answer, its answer and the app's answer differ, the owner sees all three.

## What you are given

Below this brief is a batch of **cards**, one for each function or orchestrator. A card holds:

| Field | What it is |
|---|---|
| `id`, `name` | Its identifier and name. Quote the `id` exactly in every case you write. |
| `kind` | `orchestrator` or `function`. |
| `what_it_is_for` | The question it answers, in one sentence. |
| `handed` | What it is given, as the code names it. Type names are the app's own; they are spelled out once, above the cards. |
| `gives_back` | What it returns. |
| `inputs_it_reads` | The registered inputs behind it, each with a plain name. |
| `figures_it_feeds` | The numbers on screen it produces: the words beside each, its unit, what it answers, and when it must refuse to give a number. |
| `rules` | The rules it must follow, each marked with **who said it**. |
| `approved_drawing` | On a few orchestrators: a worked household the owner approved, with numbers that add up. |

### Who said a rule — read this before you use one

- `"said_by": "owner"` — the owner's decision, in his own words, with its number and date. **Settled.**
- `"said_by": "author"` — the in-house author's record of how the function behaves. **A claim, not a
  fact.** Use it to understand what is intended. If it looks wrong, or contradicts an owner rule, an
  approved drawing or ordinary arithmetic, do not follow it — write the case the way you believe is
  right and say so in `notes`.

Comments inside `handed`, and inside the types above the cards, are the author's too — the same
caution applies.

A card has no formula on it and no worked answer from the app. That is deliberate.

## What to write

**Five cases for every card: two easy, two complex, one edge.**

| Kind | What it is |
|---|---|
| **Easy** (2) | One thing happening. Round numbers. A person can check the answer in their head in under a minute. The two must test different things, not the same thing with different numbers. |
| **Complex** (2) | At least three inputs that all change the answer, with unround, lifelike amounts and dates. Things interacting the way they do in a real household: two earners and rent and a bonus; money added halfway through a period; one account linked and one entered by hand. |
| **Edge** (1) | The place where a rule changes, or where something is missing. Zero. Nothing entered. A negative. A date exactly on a boundary. An amount exactly at a threshold. A record that starts after the period asked about. |

A small function still gets five. For one that only answers yes or no, or tidies a word, "complex"
means the awkward inputs: mixed capitals, stray spaces, a value on each side of the line.

### Go where the mistakes were

Each of the five errors sat in a case nobody had tried. Across your cases for a batch, make sure these
shapes appear wherever a card's inputs allow them:

1. Rent, or interest and dividends, **together with** a wage whose take-home the person typed in.
2. A holding described the way a broker link describes it, not the way a person types it.
3. An account holding **cash as well as** investments.
4. A period that reaches back **further than the record does**.
5. A period of **exactly** one year, and exactly two years, to the day.
6. Money added or taken out **inside** the period, large against what was already there.
7. Two people in the household, earning differently.
8. A debt paid this month, a debt not yet paid, and a debt with no payment required.
9. Nothing entered at all.

## How to work out the expected answer

1. **By hand, from the rule, showing every step.** A reader must be able to follow your arithmetic
   line by line without trusting you.
2. **Keep full precision until the end.** Then give two values: the exact one (at least four decimal
   places) and the one a person would see — whole dollars for totals and balances, two decimals for
   prices, expenses and percentages.
3. **"No answer" is a valid answer.** Where an input is missing or a rule cannot honestly produce a
   number, the right result is a refusal — the app shows a dash and says why. Write
   `"expected": "REFUSES"` and the reason. Never invent a default number.
4. **If the card does not settle the answer, do not guess.** Mark the case `RULE UNCLEAR`, write
   each reading you can see, and give the answer under each. An unclear rule is a finding, and one of
   the most useful things you can send back.
5. **If you cannot tell what a function is for, do not write cases for it.** List it under
   `could_not_test` with what is missing from the card.
6. **Cite the rule.** Every case names what its answer rests on: an owner decision number, the
   approved drawing, or — for tax and contribution limits — the published table and its year.

## Orchestrators — two more things to check

An orchestrator's answer has parts. For each orchestrator, at least one complex case must state, as
separate expected values:

- **The parts add up to the whole.** Every row shown is a row in the total. If the answer is a list
  of rows and a total, give each row and the total, and show that they sum.
- **The same input gives the same number everywhere it is used.** Where `figures_it_feeds` shows a
  figure on more than one screen, say so in the case, so the two can be compared.

Where a card carries an `approved_drawing`, one of your cases must be that household exactly as
drawn. Your other four must be your own.

## What to send back

One JSON reply for the batch, exactly in this shape and nothing outside it. Use your own plain names
for inputs; do not invent code names. They will be mapped onto the app afterwards, and **your numbers
will not be changed in the mapping** — a case that cannot be mapped goes back to the owner, not into
a drawer.

```json
{
  "batch": "cashflow 01",
  "written_by": "claude | gemini",
  "cases": [
    {
      "id": "MK-CF-O-004",
      "name": "incomeSummary",
      "kind": "complex",
      "title": "Two earners who typed in their take-home, with rent and reinvested dividends",
      "given": "Earner 1 enters take-home $5,000/month. Earner 2 enters take-home $3,300/month. Rent received $1,800/month; running costs $600/month. Dividends $3,000/year, left where they are earned.",
      "inputs": {
        "earner_1_take_home_monthly": 5000,
        "earner_2_take_home_monthly": 3300,
        "rent_received_monthly": 1800,
        "rent_running_costs_monthly": 600,
        "dividends_yearly": 3000,
        "dividends_paid_to_bank": false
      },
      "expected": {
        "take_home_usual_month": { "exact": 9500.0000, "shown": "$9,500" },
        "rows": [
          { "label": "Earner 1 pay", "exact": 5000.0000 },
          { "label": "Earner 2 pay", "exact": 3300.0000 },
          { "label": "Rent after running costs", "exact": 1200.0000 }
        ]
      },
      "working": [
        "Rent after running costs = 1,800 - 600 = 1,200",
        "Dividends are left where they are earned, so they do not reach the bank: 0 in the month",
        "Take-home in a usual month = 5,000 + 3,300 + 1,200 = 9,500",
        "Check: the three rows sum to the total, 9,500"
      ],
      "rule": "Approved drawing income-end-to-end v07, frame 16; its rule 5: the take-home someone enters IS the take-home",
      "confidence": "high",
      "notes": ""
    }
  ],
  "could_not_test": [
    { "id": "MK-XX-F-000", "missing": "What is missing from the card." }
  ]
}
```

`kind` is one of `easy`, `complex`, `edge`. `confidence` is `high`, `medium` or `low`; anything
below `high` needs a sentence in `notes` saying why.

## Before you send

- Five cases for every card you could test — two easy, two complex, one edge — and every other card
  listed under `could_not_test`.
- Every case quotes its card's `id` exactly.
- Every case shows its working, and the working reaches the expected value.
- Every list of rows sums to its total.
- No two cases for one card are the same case with different numbers.
- No answer was taken from, or adjusted towards, anything the app produces.

---

# The cards — batch "cashflow 02"

6 cards, so 30 cases. Put `"batch": "cashflow 02"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface FuturePaycheck {
  retireAge: number;
  /** MK-CF-M-022 — about what a month would bring at retirement: guaranteed income + the draw. */
  monthly: number;
  /** MK-CF-M-023 — the guaranteed part: Social Security, pension, annuity, other. */
  guaranteed: number;
  /** MK-CF-M-055 — the draw from savings the pot can support, level. */
  draw: number;
}

export interface IncomeSource {
  /** The words the screen prints, exactly. */
  label: string;
  /** The quieter second line — what makes this source what it is. */
  note: string;
  /** The amount, and the period it is stated in. Never converted silently. */
  amount: number;
  per: 'month' | 'year' | 'as entered';
  /** Which kind it is, for the row that opens its editor. */
  kind: 'salary' | 'self-employment' | 'bonus' | 'equity' | 'rental' | 'guaranteed';
}

export interface TheDebts {
  /** Every debt still owed, together. */
  totalBalance: number;
  /** The obligation — what the debts require of you in a month (MK-NW-M-012 is what you actually pay). */
  minimumMonthly: number;
  /** What actually leaves each month, across every debt. */
  paymentsMonthly: number;
  /** Interest accruing in a month at today's balances and rates. */
  interestMonthly: number;
  /** What the plan puts to debts each month: every minimum plus anything extra. */
  planMonthly: number;
  /** The plan: months to debt-free, interest paid over it, and whether the payments can ever clear it. */
  plan: PayoffResult;
  /** PROGRESS (cash-flow_v01, frame 6: "$4,100 paid down since January — 24% of where you started").
   *  What the debts stood at on the first month-end we hold this year, less what they stand at now.
   *  Null — and the line is not drawn — where we hold no earlier figure, or the debts have not fallen:
   *  progress is read from two recorded totals, never estimated from the payments. */
  progress: { paidDown: number; share: number } | null;
}

export interface TheMonth {
  /** The flow, spelled out — planned and actual, each ending in its surplus. */
  planned: ThisMonth['planned'];
  actual: ThisMonth['actual'];
  /** The detail behind the Expenses row of that flow. */
  expenses: Expenses;
  /** MK-CF-M-021 — what the Plan has already promised to goals this month, added up. */
  committed: number;
  /** MK-CF-M-020 — the hero figure: the planned surplus, less anything already promised to a goal. */
  free: number;
}

export interface WhatsComing {
  /** Every dated bill and paycheck in the window ahead, soonest first. */
  bills: UpcomingBill[];
  /** The soonest one, or null when nothing is dated. */
  next: UpcomingBill | null;
}
```

## The cards

```json
[
 {
  "id": "MK-CF-O-007",
  "name": "theTaxOrganizer",
  "kind": "orchestrator",
  "what_it_is_for": "What will my taxes look like: each taxable line, the deduction and the tax?",
  "handed": "export function theTaxOrganizer(input: {\n  profile: any;\n  accounts: any[];\n  debts: any[];\n  transactions: any[];\n  year?: number;\n}): TaxOrganizer",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-030 tax filing status and age",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-043 their own retirement contribution",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-027",
    "words_on_screen": "each taxable line and its amount",
    "unit": "money",
    "what_it_answers": "One line per kind of income the year is taxed on, and what it came to.",
    "when_it_refuses": "A line with nothing behind it does not appear at all.",
    "shown_on": [
     "/tax-organizer"
    ]
   },
   {
    "id": "MK-MN-M-028",
    "words_on_screen": "Gross income · 401(k) contribution · Standard deduction · Taxable income · Non-taxable",
    "unit": "money",
    "what_it_answers": "The walk from what you earned to what you are taxed on, in the order the form takes it.",
    "when_it_refuses": "No income entered yet.",
    "shown_on": [
     "/tax-organizer"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-027",
    "words": "Interest and dividends come from the RECORDS where they exist, not from an estimate — an estimate on a tax page reads as a figure to file."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-028",
    "words": "ONE tax function across the app (rule 2) — the same one that sets the band on your pay."
   }
  ]
 },
 {
  "id": "MK-CF-O-008",
  "name": "whatsComing",
  "kind": "orchestrator",
  "what_it_is_for": "Which bills and paychecks are coming over the next twelve months, and which look out of the ordinary?",
  "handed": "export function whatsComing(input: {\n  profile: any;\n  startBalance?: number;\n  now?: Date;\n  horizonDays?: number;\n}): WhatsComing",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-012",
    "words_on_screen": "RECEIVED · <month> — each payment",
    "unit": "money-cents",
    "what_it_answers": "Each payment that has actually arrived this month, and when.",
    "when_it_refuses": "Nothing received yet this month.",
    "shown_on": [
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-016",
    "words_on_screen": "BIG-TICKET RADAR — <bill> · due <month>",
    "unit": "money",
    "what_it_answers": "A bill big enough to plan for, and the month it falls in.",
    "when_it_refuses": "Nothing unusual ahead — the section keeps its heading and says so.",
    "shown_on": [
     "/cashflow",
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-028",
    "words_on_screen": "each bill and the day it falls",
    "unit": "money",
    "what_it_answers": "One line per bill ahead, with its date and what is left after it.",
    "when_it_refuses": "No dated bills ahead.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-060",
    "words_on_screen": "Lowest point",
    "unit": "money",
    "what_it_answers": "The lowest the balance falls to in the twelve months ahead, and which month.",
    "when_it_refuses": "No starting balance — the table starts from $0 and says so.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-061",
    "words_on_screen": "END — where the month leaves you",
    "unit": "money",
    "what_it_answers": "The balance at the end of each month: the month before’s end, plus what came in, less what went out.",
    "when_it_refuses": "No starting balance — the chain starts from $0 and says so.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-062",
    "words_on_screen": "Short — set it aside by <date>",
    "unit": "money",
    "what_it_answers": "How much more is needed for a bill by the day the money has to be there.",
    "when_it_refuses": "Nothing short — the line reads Covered instead.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-063",
    "words_on_screen": "Covered — about $X there by <date>",
    "unit": "money",
    "what_it_answers": "What is projected to be in the account on the day a bill’s money has to be there.",
    "when_it_refuses": "No balance to start from — nothing is projected.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-MN-M-030",
    "words_on_screen": "$X left <account> on <date>",
    "unit": "money",
    "what_it_answers": "What would be left after each bill, so a shortfall is visible before it happens.",
    "when_it_refuses": "No balance to start from.",
    "shown_on": [
     "/bill-calendar"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0443",
    "date": "2026-06-30",
    "words": "The display never showcased year. So, user want to see cashflow from July 2026 to June 2027 how would they do that?"
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-016",
    "words": "A regular monthly debt is never a radar item: a warning you see every month stops being a warning."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-028",
    "words": "A bill with NO date is not on the calendar — a date nobody gave would be read as one they did. It is still counted in the month’s total."
   }
  ]
 },
 {
  "id": "MK-CF-O-010",
  "name": "theMonth",
  "kind": "orchestrator",
  "what_it_is_for": "How is this month going: the plan, what has actually happened, the detail behind the expenses, and what is free after anything already promised to a goal?",
  "handed": "export function theMonth(input: MonthInput & ExpensesInput): TheMonth",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-001",
    "words_on_screen": "Expenses",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What you plan to spend in a month, as one line on the flow.",
    "when_it_refuses": "No budget set — the line reads \"not set\" and offers the door, never a planned surplus built on a guess.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-002",
    "words_on_screen": "= Planned surplus",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The surplus in the month if everything goes to plan.",
    "when_it_refuses": "No budget set — there is no planned surplus, and the screen says so rather than guessing one.",
    "shown_on": [
     "/cashflow",
     "/home"
    ]
   },
   {
    "id": "MK-CF-M-003",
    "words_on_screen": "= Actual surplus so far",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What is actually left, on what has really happened so far this month.",
    "when_it_refuses": "Nothing logged and no card linked — it says so and offers the door.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-004",
    "words_on_screen": "each row of the month — what it is and what it costs",
    "unit": "money",
    "what_it_answers": "One line per thing in or out this month, so the surplus can be checked by reading down the column.",
    "when_it_refuses": "A section with nothing in it keeps its heading and says so.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-013",
    "words_on_screen": "Actual expenses",
    "unit": "money",
    "what_it_answers": "What has actually gone out so far this month, from the expenses logged.",
    "when_it_refuses": "Nothing logged yet — $0, and the door to log one.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-014",
    "words_on_screen": "each expense and its amount",
    "unit": "money-cents",
    "what_it_answers": "One logged expense — where, when, how much.",
    "when_it_refuses": "Nothing logged yet — the list is replaced by the door to log one.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-015",
    "words_on_screen": "Planned expenses — each category",
    "unit": "money",
    "what_it_answers": "For each category: what was planned for it this month, and what has been spent against it so far.",
    "when_it_refuses": "No budget set — the comparison is not drawn; the door to set one is.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-020",
    "words_on_screen": "THIS MONTH — free to use",
    "unit": "money",
    "what_it_answers": "The planned surplus, less what the Plan has already promised to goals this month — what is genuinely free.",
    "when_it_refuses": "No budget set — nothing is called free until there is a plan to be free of.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-021",
    "words_on_screen": "<goal> · from your Plan",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the Plan sends to one goal each month, shown on This month as a line already spoken for.",
    "when_it_refuses": "No goal with a monthly amount — no line.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-056",
    "words_on_screen": "left of your budget",
    "unit": "money",
    "what_it_answers": "What is left of this month’s budget after what has been spent so far.",
    "when_it_refuses": "No budget set — nothing to be left of.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0260",
    "date": "2026-09-09",
    "words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen"
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-001",
    "words": "One line on This month, and the Expenses tab is its detail — not a second answer to the same question (his correction, 2026-09-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-002",
    "words": "EVERY ROW SHOWN IS A ROW DEDUCTED (his rule under the approved design): nothing appears on This month without being in the sum."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-003",
    "words": "An unpaid debt shows $0 with its due date — never silently dropped, or the surplus would flatter the month."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-003",
    "words": "A card payment is counted ONCE: connected card → the imported purchases are the expense and the payment is a radar note; not connected → the payment IS the expense."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-004",
    "words": "Drawn from the approved design (cash-flow_v01): the flow is SPELLED OUT, not summarised into three numbers."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-020",
    "words": "A PROMISE TO A GOAL IS MONEY ALREADY SPOKEN FOR — it never reads as free."
   }
  ],
  "approved_drawing": {
   "drawing": "Cash flow v01, frame A (approved 2026-09-28)",
   "household": "Take-home $5,000. Mortgage $2,000 and car loan $250 (the same every month). Budget for expenses $2,000. HELOC payment $200 and credit card payment $200. So far this month: the mortgage is paid, the car loan is not (due the 28th), $500 of expenses entered by hand, $1,200 imported from a card, and the HELOC and card payments are made.",
   "drawn": {
    "Planned surplus": 350,
    "Actual surplus so far": 900
   }
  }
 },
 {
  "id": "MK-CF-O-016",
  "name": "incomeSources",
  "kind": "orchestrator",
  "what_it_is_for": "Which sources of income has this household entered, and what does each one bring in?",
  "handed": "export function incomeSources(op: Record<string, any> | null): IncomeSource[]",
  "inputs_it_reads": [
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-040 whether a stream is already being received",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-059 the month a bonus lands",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ]
 },
 {
  "id": "MK-CF-O-017",
  "name": "futurePaycheck",
  "kind": "orchestrator",
  "what_it_is_for": "About what would a month bring in at retirement: the guaranteed income plus a level draw from savings?",
  "handed": "export function futurePaycheck(input: {\n  op: any; accounts: any[]; assumptions: any; bigCosts?: any[]; inflationRate?: number; employmentStatus?: any;\n}): FuturePaycheck | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-017 birth year",
   "MK-XS-I-018 retirement age",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-026 big costs (amount and year)",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-029 inflation rate"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-022",
    "words_on_screen": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
    "unit": "money",
    "per": "month",
    "what_it_answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
    "when_it_refuses": "No pot to project from, or retirement age already reached — the card is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-023",
    "words_on_screen": "YOUR FUTURE PAYCHECK — Social Security · pension",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The guaranteed part of that future month: Social Security, pension, annuity, other.",
    "when_it_refuses": "No pot to project from, or retirement age already reached — the card is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-055",
    "words_on_screen": "Draw from savings",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The level amount a month the pot can support, so the paycheck does not fall when a bill lands.",
    "when_it_refuses": "No pot — no draw; the paycheck is the guaranteed income alone.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-070",
    "words_on_screen": "each step of the withdrawal order",
    "unit": "money",
    "what_it_answers": "Which pot the retired paycheck draws from first, second and so on, and how much sits in each.",
    "when_it_refuses": "No retirement money in any pot — no order to explain.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-CF-M-022",
    "words": "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-022",
    "words": "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-055",
    "words": "IN TODAY’S DOLLARS (decided 2026-10-03, the master’s old Q30): the draw keeps its buying power — the figure shown is what it buys today, and the dollars paid rise with inflation each year. It is what the simulation behind the odds already charges, so the draw shown and the odds beside it are the same plan. To reverse: hold the dollars flat instead, and the odds must be re-run that way."
   }
  ]
 },
 {
  "id": "MK-CF-O-018",
  "name": "theDebts",
  "kind": "orchestrator",
  "what_it_is_for": "What do I owe, what does it ask of me each month, when would I be clear of it, and how much have I paid down this year?",
  "handed": "export function theDebts(input: { debts: Debt[]; extraMonthly?: number; method?: PayoffMethod; now?: Date;\n  /** what every debt together stood at on the earliest month-end recorded this year, if any */\n  startOfYearDebt?: number | null }): TheDebts",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-057",
    "words_on_screen": "/month interest",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What your debts cost in interest in a month, at today’s balances and rates.",
    "when_it_refuses": "No debts — $0.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-058",
    "words_on_screen": "debt-free",
    "unit": "count",
    "what_it_answers": "How many months until the last debt is cleared, paying the minimums plus anything extra, highest rate first.",
    "when_it_refuses": "The payments cannot cover the interest — the screen says never, not a number.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-059",
    "words_on_screen": "total interest",
    "unit": "money",
    "what_it_answers": "All the interest paid over the plan until the last debt is gone.",
    "when_it_refuses": "The payments cannot cover the interest — the screen says never, not a number.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-071",
    "words_on_screen": "/month min",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The least your debts require of you in a month, every minimum added up — the obligation, not what you choose to pay.",
    "when_it_refuses": "No debts — $0.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-072",
    "words_on_screen": "/month total",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the payoff plan puts to debts each month: every minimum plus the extra you set.",
    "when_it_refuses": "No debts — $0.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-073",
    "words_on_screen": "/month",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What you pay on one debt each month — the payment you set, or its minimum where you set none.",
    "when_it_refuses": "A debt due in full on a date has no monthly payment — the line says when the whole balance is due.",
    "shown_on": [
     "/cashflow",
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-074",
    "words_on_screen": "paid down since <month>",
    "unit": "money",
    "what_it_answers": "How much less you owe than at the first month-end we recorded this year.",
    "when_it_refuses": "No earlier total on record, or the debts have not fallen — the line is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-075",
    "words_on_screen": "% of where you started",
    "unit": "percent",
    "what_it_answers": "That paid-down amount as a share of what you owed at the start.",
    "when_it_refuses": "No earlier total on record, or the debts have not fallen — the line is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-CF-M-074",
    "words": "READ FROM TWO RECORDED TOTALS, never estimated from the payments made — interest and new borrowing are inside it."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-074",
    "words": "NOT DRAWN where there is no earlier total to compare with, or the debts have not fallen."
   }
  ],
  "approved_drawing": {
   "drawing": "Cash flow v01, frame for the Debts tab (approved 2026-09-28)",
   "household": "Visa card $3,200 owed at 22.90%. Car loan $9,800 owed at 6.40%. Together they stood at $17,100 at the first month-end recorded this year.",
   "drawn": {
    "Your debt": 13000,
    "Paid down since January": 4100,
    "Share of where you started": "24%"
   }
  }
 }
]
```
