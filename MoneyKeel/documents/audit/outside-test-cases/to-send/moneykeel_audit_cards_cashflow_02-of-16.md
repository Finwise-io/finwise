# Brief — check the formula, then write the test cases, from outside

MoneyKeel · calculation audit · v04 · 2026-10-04

## What this is

MoneyKeel is a personal-finance app. Every number it shows comes from a small function, and groups of
functions are run by an **orchestrator** — the one function a screen asks for a whole answer (for
example, "how are my investments doing").

Those functions already have tests, and the tests pass. Five of the functions were still wrong. The
reason: the person who wrote each function also wrote its test, from the same understanding. A wrong
rule produced a wrong example that agreed with it.

**You are the outside judge. You have two jobs for every function:**

1. **Check the formula.** Each function comes with its formula written out in words. Decide whether
   that is the right way to get the answer the function is for.
2. **Write five test cases**, with the answer worked out by hand.

Afterwards a script runs every one of your cases against the app. The owner is then shown, side by
side: your answer, the answer of a second model working separately, and the app's answer.

## The one rule that matters

**You are not shown the code inside any function, the existing tests, or any answer the app gives. Do
not ask for them.**

If you saw them you would start to agree with them. Work from what a function is *for*, its formula
in words, the owner's written decisions, published sources, and ordinary arithmetic and finance.

You are also working alone. Do not try to guess what the other model will write.

## What you are given

Below this brief is a batch of **cards**, one for each function or orchestrator. A card holds:

| Field | What it is |
|---|---|
| `id`, `name` | Its identifier and name. Quote the `id` exactly in everything you write. |
| `kind` | `orchestrator` or `function`. |
| `what_it_is_for` | The question it answers, in one sentence. |
| `formula_in_words` | **How it gets its answer — every step and every number.** Written by the in-house author from the function as it stands today. This is the thing you are judging. |
| `handed` | What it is given, as the code names it. Type names are the app's own; they are spelled out once, above the cards. |
| `inputs_it_reads` | The registered inputs behind it, each with a plain name. |
| `figures_it_feeds` | The numbers on screen it produces: the words beside each, its unit, what it answers, and when it must refuse to give a number. |
| `rules` | Rules it must follow, each marked with **who said it**. |
| `approved_drawing` | On a few orchestrators: a worked household the owner approved, with numbers that add up. |

A formula often names another function in brackets, for example `(perMonth)`. When that function's
card is not in your batch, its formula is printed under **Formulas these cards lean on**, after the
cards. Use it to work your answers. You are not asked to judge or test those.

Batches for Cash flow also carry **the published amounts the app uses** — tax bands, deductions,
contribution limits. Check them against their published source.

### Who said a rule — read this before you use one

- `"said_by": "owner"` — the owner's decision, in his own words, with its number and date. **Settled.**
  A formula that goes against an owner rule is wrong.
- `"said_by": "author"` — the in-house author's record. **A claim, not a fact.**

`formula_in_words`, the comments inside `handed`, and the comments inside the types are all the
author's. Treat every one as a claim to be checked.

## Job 1 — check the formula

For every card, read `what_it_is_for`, then `formula_in_words`, and give one verdict:

| Verdict | When |
|---|---|
| `RIGHT` | The formula is a correct way to get what the function is for, and it covers the cases it needs to. |
| `WRONG` | The formula gives a wrong answer for some input a real household could have. Say which input, and what the answer should be. |
| `INCOMPLETE` | The formula is right as far as it goes but is silent, or vague, on a case that changes the answer. Say which case. |
| `CANNOT TELL` | The card does not say enough about what the function is for to judge. Say what is missing. |

Judge it against, in this order:

1. **The owner's rules** on the card, and the **approved drawing** where there is one.
   Every return is a time-weighted return (owner, 2026-10-04). A return made any other way is `WRONG`.
2. **Published sources** — for tax bands, deductions, contribution limits and thresholds. Name the
   source and the year. A wrong amount is a `WRONG` formula.
3. **Standard finance practice** — for returns, loan payments, payoff orders, yearly rates. Name the
   method (for example, the time-weighted return; the standard loan-payment formula).
4. **Ordinary arithmetic, and whether it agrees with itself.**

Look hard for these, because they are the shapes the five known errors took:

- A rule applied to money it should not touch — for example a payslip rate applied to rent.
- Two formulas that describe the same thing differently — for example one function counting an hourly
  worker's year one way and another counting it a different way. Name both cards.
- A line on the wrong side — "above 60%" where "60% or more" is meant; "after one year" where "one
  year or more" is meant.
- A yearly rate made from a period of a year or less, or a period total shown for a longer one.
- A percent given when the starting value was never really known.
- Something missing counted as zero, or a default number invented where the honest answer is "no
  answer".
- Parts that do not add up to the whole they are shown beside.
- A number rounded before the end.

For `WRONG` and `INCOMPLETE`, write **what the formula should be**, in words, and what you rest that
on. Give a `severity`: `high` when a household would see a wrong number, `medium` when it happens only
in an unusual case, `low` when it changes no number a person sees.

Many cards are small — they tidy a word, pick a label, copy a record. Judge those too; one line is
enough.

## Job 2 — write five test cases

**Five cases for every card: two easy, two complex, one edge.**

| Kind | What it is |
|---|---|
| **Easy** (2) | One thing happening. Round numbers. A person can check the answer in their head in under a minute. The two must test different things, not the same thing with different numbers. |
| **Complex** (2) | At least three inputs that all change the answer, with unround, lifelike amounts and dates. Things interacting the way they do in a real household: two earners and rent and a bonus; money added halfway through a period; one account linked and one entered by hand. |
| **Edge** (1) | The place where the formula changes, or where something is missing. Zero. Nothing entered. A negative. A date exactly on a boundary. An amount exactly at a threshold. A record that starts after the period asked about. |

A small function still gets five. For one that only answers yes or no, or tidies a word, "complex"
means the awkward inputs: mixed capitals, stray spaces, a value on each side of the line.

### Go where the mistakes were

Across your cases for a batch, make sure these shapes appear wherever a card's inputs allow them:

1. Rent, or interest and dividends, **together with** a wage whose take-home the person typed in.
2. A holding described the way a broker link describes it, not the way a person types it.
3. An account holding **cash as well as** investments.
4. A period that reaches back **further than the record does**.
5. A period of **exactly** one year, and exactly two years, to the day.
6. Money added or taken out **inside** the period, large against what was already there.
7. Two people in the household, earning differently.
8. A debt paid this month, a debt not yet paid, and a debt with no payment required.
9. Nothing entered at all.

### How to work out the expected answer

1. **By hand, showing every step.** A reader must be able to follow your arithmetic line by line
   without trusting you.
2. **`expected` is the answer you believe is RIGHT.** Where you judged the formula `RIGHT`, that is
   the formula's answer. Where you judged it `WRONG` or `INCOMPLETE`, at least one of your five cases
   must be one where the two differ — and that case carries both: `expected` (the right answer) and
   `formula_gives` (what the formula as written produces). Leave `formula_gives` out when the two are
   the same.
3. **Keep full precision until the end.** Then give two values: the exact one (at least four decimal
   places) and the one a person would see — whole dollars for totals and balances, two decimals for
   prices, expenses and percentages.
4. **"No answer" is a valid answer.** Where an input is missing or the formula cannot honestly produce
   a number, the right result is a refusal — the app shows a dash and says why. Write
   `"expected": "REFUSES"` and the reason. Never invent a default number.
5. **Some functions cannot be worked by hand** — a simulation of a thousand futures, a search for a
   rate. Test what can be: when it must refuse, what it gives at zero, which of two inputs must give
   the larger answer. Say so in `notes`.
6. **If the card does not settle the answer, do not guess.** Mark the case `RULE UNCLEAR`, write each
   reading you can see, and give the answer under each.
7. **If you cannot tell what a function is for, do not write cases for it.** List it under
   `could_not_test` with what is missing from the card.
8. **Say what the answer rests on**: the formula in words, an owner decision number, the approved
   drawing, or the published table and its year.

### Orchestrators — two more things to check

An orchestrator's answer has parts. For each orchestrator, at least one complex case must state, as
separate expected values:

- **The parts add up to the whole.** If the answer is a list of rows and a total, give each row and
  the total, and show that they sum.
- **The same input gives the same number everywhere it is used.** Where `figures_it_feeds` shows a
  figure on more than one screen, say so in the case, so the two can be compared.

Where a card carries an `approved_drawing`, one of your cases must be that household exactly as
drawn. Your other four must be your own.

## What to send back

One JSON reply for the batch, exactly in this shape and nothing outside it. Use your own plain names
for inputs; do not invent code names. They will be mapped onto the app afterwards, and **your numbers
will not be changed in the mapping** — a case that cannot be mapped goes back to the owner, not into
a drawer.

The first formula check below is an invented example of the shape, not a real card.

```json
{
  "batch": "cashflow 01",
  "written_by": "claude | gemini",
  "formula_checks": [
    {
      "id": "MK-XX-F-000",
      "name": "exampleOnly",
      "verdict": "WRONG",
      "why": "For pay every two weeks the formula divides the yearly amount by 52. There are 26 such pay days in a year, so each one comes out at half its real size.",
      "should_be": "Pay every two weeks = the yearly amount ÷ 26.",
      "rests_on": "Ordinary arithmetic: 52 weeks ÷ 2.",
      "severity": "high"
    },
    {
      "id": "MK-CF-O-004",
      "name": "incomeSummary",
      "verdict": "RIGHT",
      "why": "The rows shown are the rows added, and a typed take-home is used as typed.",
      "should_be": "",
      "rests_on": "Approved drawing income-end-to-end v07, frame 16.",
      "severity": ""
    }
  ],
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
      "rests_on": "Approved drawing income-end-to-end v07, frame 16; its rule 5: the take-home someone enters IS the take-home",
      "confidence": "high",
      "notes": ""
    }
  ],
  "could_not_test": [
    { "id": "MK-XX-F-000", "missing": "What is missing from the card." }
  ]
}
```

`verdict` is one of `RIGHT`, `WRONG`, `INCOMPLETE`, `CANNOT TELL`. `kind` is one of `easy`,
`complex`, `edge`. `confidence` is `high`, `medium` or `low`; anything below `high` needs a sentence
in `notes` saying why.

## Before you send

- One formula check for every card in the batch.
- Five cases for every card you could test — two easy, two complex, one edge — and every other card
  listed under `could_not_test`.
- Every card judged `WRONG` or `INCOMPLETE` has a case that shows the difference, with `formula_gives`.
- Everything quotes its card's `id` exactly.
- Every case shows its working, and the working reaches the expected value.
- Every list of rows sums to its total.
- No two cases for one card are the same case with different numbers.
- No answer was taken from, or adjusted towards, anything the app produces.

---

# The cards — batch "cashflow 02"

6 cards, so 6 formula checks and 30 cases. Put `"batch": "cashflow 02"` in your reply.

## The published 2026 amounts the app uses

Read from the app. **Check each against its published source and say so in `formula_checks` when one is wrong.**

**Federal income tax, 2026 — each slice of taxable income at its own rate.** Taxable income = income − the deduction.

| Filing status | Standard deduction | Added for each person 65 or over | Bands: up to … at … |
|---|---|---|---|
| Single | $16,100 | $2,050 | $12,400 at 10% · $50,400 at 12% · $105,700 at 22% · $201,775 at 24% · $256,225 at 32% · $640,600 at 35% · above that at 37% |
| Married filing jointly | $32,200 | $1,650 | $24,800 at 10% · $100,800 at 12% · $211,400 at 22% · $403,550 at 24% · $512,450 at 32% · $768,700 at 35% · above that at 37% |
| Married filing separately | $16,100 | $1,650 | $12,400 at 10% · $50,400 at 12% · $105,700 at 22% · $201,775 at 24% · $256,225 at 32% · $384,350 at 35% · above that at 37% |
| Head of household | $24,150 | $2,050 | $17,700 at 10% · $67,450 at 12% · $105,700 at 22% · $201,775 at 24% · $256,225 at 32% · $640,600 at 35% · above that at 37% |

**Senior deduction, tax years 2025 to 2028:** $6,000 for each person 65 or over, less 6% of income above $75,000 (single, head of household) or $150,000 (married filing jointly). Not given when married filing separately.

**Long-term capital gains, 2026** — 0% up to the first amount of taxable income, 15% up to the second, 20% above: Single $49,450 and $545,500 · Married filing jointly $98,900 and $613,700 · Married filing separately $49,450 and $306,850 · Head of household $66,200 and $579,600.

**Contribution limits, 2026:** 401(k) $24,500, plus $8,000 at 50 or over, or plus $11,250 instead at ages 60 to 63. IRA $7,500, plus $1,100 at 50 or over. HSA $4,400 self-only or $8,750 family, plus $1,000 at 55 or over.

**Social Security and Medicare, 2026:** 6.2% of wages up to $184,500; 1.45% of all wages; 0.9% more on wages above $200,000.

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
  "formula_in_words": "Interest, dividends and coupons the accounts paid out over the last year (incomeFromAccounts), rounded to whole dollars, are handed with the profile, the accounts, the debts and the year (this year when none is given) to the tax organiser, whose answer is returned unchanged.",
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
  "formula_in_words": "The upcoming bills (upcomingBills) from the starting balance, today and the horizon given (365 days when none), soonest first; and the first of them as the next one — nothing when there are none.",
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
  "formula_in_words": "The planned and actual blocks (thisMonth); the Expenses tab (expenses); committed = the monthly amounts of the goals added up; free = planned surplus − committed.",
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
  "formula_in_words": "One row for each of these, only when its amount is above zero: every earner with a base salary or a month table (steady or varies; named You or the spouse when there are two); self-employment (monthly or yearly, as entered); the bonus for the year, with its month; stock vesting for the year (rsuAnnual); rental property = net rent for the year ÷ 12, per month; Social Security and pension together, per month (retirementIncomeMonthly).",
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
  "formula_in_words": "Nothing when the age is unknown; when the person is at or past the retirement age (the plan's, else the profile's target, else 67); when the savings are zero or less; or when the projection gives nothing. Otherwise: the retirement projection is run to the retirement age and gives the projected savings at that age; the monthly draw those savings can support comes from buildPaycheckYear (solveSafeDraw); monthly paycheck = guaranteed income (Social Security, pension, annuity, other — guaranteedOutsideStreams) + that draw, each rounded to whole dollars.",
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
  "formula_in_words": "Counts only debts with a balance above zero. Total = their balances added. Minimum in a month = each debt's minimum payment added, a debt due in full counting 0. Payments in a month = each debt's required payment added (requiredPayment). Interest in a month = balance × yearly rate ÷ 12, added over the debts. Plan in a month = the minimums + the extra. Progress: paid down = the debt at the start of the year − the total now; share = paid down ÷ the start-of-year debt; given only when the start-of-year debt and the paid-down amount are both above zero. The payoff plan is payoffPlan, with the extra and the method chosen (highest rate first when none is).",
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

## Formulas these cards lean on

20 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-CF-F-005",
  "name": "actualMonthFlow",
  "what_it_is_for": "WHAT HAS ACTUALLY HAPPENED: what landed, less only the debts confirmed paid, less what was really spent.",
  "formula_in_words": "Rows, in this order. Actual inflow = the monthly take-home handed in. One row for each debt with a required payment above zero: minus what was logged as paid against it this month (0 when nothing was), marked paid or not. Other debt payments = debt payments logged this month that match no debt on record, when above zero. Expenses entered by hand = minus the month's logged expenses that were not imported, debt payments left out. Expenses imported from your card = minus the imported ones, shown only when there are any. Debts on the big-ticket radar (cards, lines of credit, debts due in full) are moved to the end. Surplus = every row added up."
 },
 {
  "id": "MK-CF-F-019",
  "name": "upcomingBills",
  "what_it_is_for": "The dated bills coming due over the next year, each with the day the money must be there, the cash expected by that day and how much short it would be.",
  "formula_in_words": "Bills = each non-monthly budget category, once for every month it names (January when it names none): amount = its yearly amount ÷ the number of months named (a percent one = percent × monthly income after tax × 12), on its due day (the 1st when none), at its next date on or after today. Only bills due from today to the horizon (365 days when none is given) are returned, soonest first. Need-by date = due date − 2 days; ask-by date = need-by − 10 days. Money available by the need-by date = starting balance + steady daily net × the days from today + one-off inflows (yearly scholarships, loans) dated on or before it − other bills dated on or before it. Steady daily net = (steady monthly in − steady monthly out) × 12 ÷ 365. Steady in = the LARGEST month of gross salary, tips, retirement income and net rent ÷ 12, each × (1 − the rate in force), plus support, benefits for the year ÷ 12 and monthly scholarships untaxed. Steady out = fixed + flexible budget + the part of the typed monthly figure above the categories. Shortfall = bill − available, never below 0."
 },
 {
  "id": "MK-CF-F-023",
  "name": "requiredPayment",
  "what_it_is_for": "The payment reserved/required each month for a debt (planned payment, else the minimum).",
  "formula_in_words": "0 for a debt due in full. Otherwise the larger of the minimum monthly payment and the payment the person says they make."
 },
 {
  "id": "MK-CF-F-034",
  "name": "payoffPlan",
  "what_it_is_for": "Simulate paying off debts with a constant monthly budget (sum of minimums + extra), rolling each cleared debt's freed-up payment into the next per the chosen method.",
  "formula_in_words": "Only debts with a balance above zero. A debt due in full is paid in its due month (never earlier than month 1; month 1 when it has no date), with interest = balance × ((1 + yearly rate ÷ 12) to the power of the months until then − 1). The others are walked month by month, for at most 600 months. Each month: every balance grows by balance × yearly rate ÷ 12; the money to pay = the minimums of every debt whose payments have started — including debts already cleared, whose minimums roll on — plus the extra; each debt first gets its minimum (never more than it owes); what is left goes to one debt at a time, highest rate first (avalanche) or smallest balance first (snowball). A debt is cleared when it owes a cent or less. A debt whose first payment date is in the future is not paid until that month, and grows meanwhile. Months = the month the last debt is cleared (or the last lump-sum month, when later); total interest = all the interest charged; it never pays off when anything is still owed at month 600. Order = each debt with the month it is cleared and the interest it cost, earliest first."
 },
 {
  "id": "MK-CF-F-066",
  "name": "rsuAnnual",
  "what_it_is_for": "Annual equity-comp run-rate: total scheduled value spread over the years it vests across (a level annual figure for the income estimate).",
  "formula_in_words": "With vesting rows: their total value ÷ the number of different years in which rows with a value vest (at least 1). With none: shares × price, as typed."
 },
 {
  "id": "MK-CF-F-075",
  "name": "retirementIncomeMonthly",
  "what_it_is_for": "Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable.",
  "formula_in_words": "Social Security, pension, withdrawals, required distributions, annuities and other, each turned into a month — monthly as it is, quarterly ÷ 3, yearly ÷ 12 — and added."
 },
 {
  "id": "MK-CF-F-076",
  "name": "guaranteedOutsideStreams",
  "what_it_is_for": "The guaranteed income that comes from outside the person's own savings, one row for each source that pays anything: Social Security, a pension, an annuity or another, each as a monthly amount with whether it rises with prices.",
  "formula_in_words": "Social Security, pension, annuity and other, each as a monthly amount (quarterly ÷ 3, yearly ÷ 12), only those above zero. Rises with prices: Social Security yes, the others no — unless the person said otherwise. Withdrawals and required distributions are not here."
 },
 {
  "id": "MK-CF-F-105",
  "name": "guaranteedRows",
  "what_it_is_for": "The dated guaranteed-income rows for the next 12 months (the F2 grid seam).",
  "formula_in_words": "Nothing when the person's chosen income sources are listed without retirement income. Otherwise, over the twelve months starting with the current one, for Social Security, pension, annuity and other retirement income with an amount above zero: monthly → the amount in every month; quarterly → the amount in four months, three apart, starting at its named month (the current month when none); yearly → the amount once, in its named month (the current month when none). The amount is the amount of EACH PAYMENT."
 },
 {
  "id": "MK-CF-F-106",
  "name": "solveSafeDraw",
  "what_it_is_for": "Largest level monthly draw that keeps chance-of-success ≥ the floor.",
  "formula_in_words": "0 when the savings are zero or less. Otherwise the largest monthly draw from the savings, on top of the guaranteed income, at which the retirement simulation (1,000 futures, fixed seed 42) still lasts to the horizon in at least 80 of 100. It is tried first at twice (savings ÷ years ÷ 12), $100 at least; then narrowed by halving 12 times; then rounded DOWN to the nearest $5."
 },
 {
  "id": "MK-CF-F-107",
  "name": "buildPaycheckYear",
  "what_it_is_for": "Build the month-by-month paycheck.",
  "formula_in_words": "Guaranteed rows from guaranteedRows; savings = the figure given, otherwise the accounts set aside for retirement. Safe draw = solveSafeDraw, with average guaranteed income in a month = the rows' total ÷ 12. Draw flag: high when safe draw × 12 ÷ savings is above 4.5%; ok otherwise; none with no savings or no draw. For each of twelve months from the current one: guaranteed total = that month's rows; bills = that month's big bills, everyday expenses left out; safe to spend = guaranteed total + safe draw − bills. This year = the twelve added."
 },
 {
  "id": "MK-CF-F-149",
  "name": "recurringDebtPayments",
  "what_it_is_for": "RECURRING DEBT PAYMENTS — the installment debts, one row each.",
  "formula_in_words": "One row for each debt whose payment is the same every month (an instalment loan): its name and its required monthly payment (requiredPayment). Rows of zero are dropped. Cards, lines of credit and debts due in full are not here."
 },
 {
  "id": "MK-CF-F-150",
  "name": "debtPaymentsCountedAsExpenses",
  "what_it_is_for": "DEBT PAYMENTS THAT ARE COUNTED AS EXPENSES — revolving and due-in-full.",
  "formula_in_words": "For each debt that is NOT an instalment loan, and whose purchases are not already imported from a linked card: the payments logged this month under the category Debt payment whose payee matches the debt's name (capitals and outer spaces ignored), added up. A row only when that is above zero, named after the debt with the word payment."
 },
 {
  "id": "MK-CF-F-151",
  "name": "actualSpending",
  "what_it_is_for": "What was actually spent in a month, debt payments left out: every expense newest first, the five shown, how many more there are and the totals, for all of them or only those entered by hand or only those imported.",
  "formula_in_words": "The month's logged expenses, leaving out the category Debt payment, newest first — all of them, or only those entered by hand, or only those imported. Shown = the first 5. Hidden = how many more. Total = all of them added. Hidden total = total − the 5 shown."
 },
 {
  "id": "MK-CF-F-152",
  "name": "isRadarItem",
  "what_it_is_for": "Whether a debt belongs on the big-ticket radar: yes for a card or a credit line and for a debt due in one lump, no for a loan paid the same every month.",
  "formula_in_words": "An instalment loan: not a radar item. A debt due in full: a lump-sum item. Any other debt (a card, a line of credit): a revolving item."
 },
 {
  "id": "MK-CF-F-153",
  "name": "radar",
  "what_it_is_for": "The big-ticket radar for a month: each card, credit-line or lump-sum debt payment and each large dated bill, with its amount and whether it is already counted as an expense.",
  "formula_in_words": "For each debt that is a radar item (isRadarItem): amount = what was logged as paid against it this month when that is above zero, otherwise its required payment; dropped when the amount is zero or less. It counts as an expense unless its purchases are already imported from a linked card. Then every big bill of $500 or more, with its due date, each counted as an expense. Debts first, bills after."
 },
 {
  "id": "MK-CF-F-156",
  "name": "plannedMonthFlow",
  "what_it_is_for": "THE PLAN for this month: the take-home, less each debt, less planned expenses.",
  "formula_in_words": "Rows, in this order. Inflow = the monthly take-home handed in. One row for each instalment debt with a required payment above zero: minus that payment. Expenses = minus the budget when one is set (above zero); otherwise 0, marked not set. Then one row for each radar debt (a card, a line of credit) with a required payment above zero: minus that payment. Surplus = every row added up."
 },
 {
  "id": "MK-CF-F-183",
  "name": "paidOutByAccount",
  "what_it_is_for": "What each account actually PAID OUT in the last year, by account.",
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date last year), not reinvested, added by account."
 },
 {
  "id": "MK-CF-F-184",
  "name": "incomeFromAccounts",
  "what_it_is_for": "One line per account that pays something, and the total.",
  "formula_in_words": "For each account, the first that applies. (1) It paid out more than zero over the last year (paidOutByAccount): that amount. (2) A bond: coupon rate × face value when both are above zero; else rate × balance when a rate is entered; else $0, marked as assumed. (3) Cash with a rate above zero: rate × balance. (4) Any other account with a balance above zero is named as not counted; foreign currency is skipped. Yearly income = the rows added."
 },
 {
  "id": "MK-CF-O-002",
  "name": "expenses",
  "what_it_is_for": "What is being spent this month: the debts that repeat every month, the planned expenses by category, what was actually spent by where it came from, and the big-ticket radar?",
  "formula_in_words": "Recurring debt rows (recurringDebtPayments) and their total. Planned rows by category, as handed in, and their total. Actual expenses for the month — all, entered by hand, and imported (actualSpending). The debt payments that count as expenses (debtPaymentsCountedAsExpenses). Actual total = the actual expenses total + those debt payments. And the radar (radar)."
 },
 {
  "id": "MK-CF-O-003",
  "name": "thisMonth",
  "what_it_is_for": "How is the month going: what the plan says it holds and what has actually happened so far, each row by row and each ending in its surplus?",
  "formula_in_words": "The planned block (plannedMonthFlow) and the actual block (actualMonthFlow), side by side."
 }
]
```
