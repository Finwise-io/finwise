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

# The cards — batch "cashflow 13"

15 cards, so 75 cases. Put `"batch": "cashflow 13"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface EarnerWage {
  baseSalary?: Money;
  salaryFreq?: 'hourly' | 'weekly' | 'biweekly' | 'monthly';
  salaryMode?: 'gross' | 'takehome';
  hoursPerWeek?: Money;
  salaryByMonth?: Record<string, Money> | Money[];
  salaryMonthMode?: 'same' | 'months';
  c_401k?: Money;
  employerMatchValue?: Money;
  employerMatchMode?: 'pct' | 'dollar';
  /** The take-home they enter, per period. Used as typed — never grossed up. */
  landsTypical?: Money;
}

export interface EssentialsAverage {
  monthly: number;          // the average over the months counted
  monthsCounted: number;    // calendar months with at least one logged entry, inside the window
  label: string;            // "7 month average" — the words the screen prints beside the figure
  from: string;             // first month counted, 'YYYY-MM'
  to: string;               // last month counted, 'YYYY-MM'
}

export interface EssentialsMonthly { monthly: number; basis: 'logged' | 'entered'; label: string; logged: EssentialsAverage | null }

export type FilingStatus = 'single' | 'married' | 'mfs' | 'hoh';

export interface LoggedSpend { amount: any; date: string; category?: string }

export interface RateInForce {
  rate: number;          // 0–1, of gross
  source: RateSource;
  mine: boolean;         // true when it is the person's own figure, not ours
  label: string;         // what a screen prints beside the number
  covers: string;        // what the rate includes, in words
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-175",
  "name": "sumOverEarners",
  "kind": "function",
  "what_it_is_for": "Adds up one figure across every earner in the household.",
  "handed": "export function sumOverEarners(op: OnboardingProfile | null, of: (w: EarnerWage) => number): number"
 },
 {
  "id": "MK-CF-F-176",
  "name": "sumMonthsOverEarners",
  "kind": "function",
  "what_it_is_for": "Add up twelve numbers per earner, month by month.",
  "handed": "export function sumMonthsOverEarners(\n  op: OnboardingProfile | null, of: (w: EarnerWage) => number[],\n): number[]"
 },
 {
  "id": "MK-CF-F-178",
  "name": "wageMatchMonthly",
  "kind": "function",
  "what_it_is_for": "ONE person's employer match: a share of their own contribution, or a flat amount.",
  "handed": "export function wageMatchMonthly(w: Record<string, any> | null): number",
  "inputs_it_reads": [
   "MK-XS-I-043 their own retirement contribution",
   "MK-XS-I-046 how the employer match is expressed — percent or dollars"
  ]
 },
 {
  "id": "MK-CF-F-180",
  "name": "enteredLandsAnnual",
  "kind": "function",
  "what_it_is_for": "Every earner’s entered take-home, a year — or null when any of them did not say.",
  "handed": "export function enteredLandsAnnual(op: OnboardingProfile | null): number | null",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives"
  ]
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "kind": "function",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "handed": "export function rateInForce(op: OnboardingProfile | null): RateInForce",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-043 their own retirement contribution"
  ]
 },
 {
  "id": "MK-CF-F-183",
  "name": "paidOutByAccount",
  "kind": "function",
  "what_it_is_for": "What each account actually PAID OUT in the last year, by account.",
  "handed": "function paidOutByAccount(txns: any[] | null | undefined, now: Date): Map<string, number>",
  "inputs_it_reads": [
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-CF-F-185",
  "name": "needsTakeHomeConversion",
  "kind": "function",
  "what_it_is_for": "True when this profile still holds a pre-2026-08-28 take-home entry.",
  "handed": "export function needsTakeHomeConversion(op: OnboardingProfile | null): boolean",
  "inputs_it_reads": [
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ]
 },
 {
  "id": "MK-CF-F-186",
  "name": "convertTakeHomeMode",
  "kind": "function",
  "what_it_is_for": "Convert it. What they typed becomes what LANDS; the gross is worked back once and stored.",
  "handed": "export function convertTakeHomeMode<T extends Record<string, any>>(op: T): T {",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ]
 },
 {
  "id": "MK-CF-F-187",
  "name": "seniorDeductionFor",
  "kind": "function",
  "what_it_is_for": "How much of the $6,000-per-person senior deduction does this return get?",
  "handed": "export function seniorDeductionFor(status: FilingStatus = 'single', over65 = 0, magi: number | null = null): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 },
 {
  "id": "MK-CF-F-188",
  "name": "householdPreTaxContributionsAnnual",
  "kind": "function",
  "what_it_is_for": "The household's pre-tax 401(k) contributions for the year — every earner's, added up.",
  "handed": "export function householdPreTaxContributionsAnnual(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-043 their own retirement contribution"
  ]
 },
 {
  "id": "MK-CF-F-189",
  "name": "essentialsFromLoggedSpending",
  "kind": "function",
  "what_it_is_for": "What does a month actually cost, from what has been logged?",
  "handed": "export function essentialsFromLoggedSpending(expenses: LoggedSpend[], now: Date = new Date()): EssentialsAverage | null",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-020",
    "words_on_screen": "N months of essentials is $X ($Y/month)",
    "unit": "words",
    "what_it_answers": "What the emergency fund you are aiming for actually costs.",
    "when_it_refuses": "No essentials figure yet.",
    "shown_on": [
     "/jobsafety"
    ]
   },
   {
    "id": "MK-MN-M-021",
    "words_on_screen": "Using $X/month from your logged expenses",
    "unit": "words",
    "what_it_answers": "Where the essentials figure came from, and how many months it stands on.",
    "when_it_refuses": "Nothing logged — it says the plan you entered is being used instead.",
    "shown_on": [
     "/jobsafety"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-021",
    "words": "The label names the basis so nobody has to guess whether it is one month or a year (his ruling G21)."
   }
  ]
 },
 {
  "id": "MK-CF-F-190",
  "name": "essentialsMonthly",
  "kind": "function",
  "what_it_is_for": "The one essentials-a-month figure a screen divides by, and where it came from.",
  "handed": "export function essentialsMonthly(expenses: LoggedSpend[], typed: number, now: Date = new Date()): EssentialsMonthly | null",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-024",
    "words_on_screen": "You could cover a $X hit",
    "unit": "money",
    "what_it_answers": "Whether your cash would absorb a sudden cost.",
    "when_it_refuses": "No cash entered.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-MN-M-025",
    "words_on_screen": "You'd have $X left — about N months of essentials",
    "unit": "words",
    "what_it_answers": "What would be left after the hit, and how long that would last.",
    "when_it_refuses": "No essentials figure — the months are not stated rather than guessed.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-MN-M-026",
    "words_on_screen": "your $X/month of essentials",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What one month of the things you cannot skip costs.",
    "when_it_refuses": "Nothing logged and no plan set.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-NW-M-013",
    "words_on_screen": "EMERGENCY FUND — X.X months",
    "unit": "months",
    "what_it_answers": "How many months your cash would cover, if your income stopped tomorrow.",
    "when_it_refuses": "No essentials figure yet — it says so rather than dividing by nothing.",
    "shown_on": [
     "/analytics",
     "/jobsafety"
    ]
   },
   {
    "id": "MK-NW-M-014",
    "words_on_screen": "of essentials covered by your cash — $X cash ÷ $Y/month essentials",
    "unit": "words",
    "what_it_answers": "The sum written out, so the months figure can be checked by eye.",
    "when_it_refuses": "Nothing logged and no plan set.",
    "shown_on": [
     "/analytics"
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
    "about": "MK-NW-M-013",
    "words": "ONE essentials figure across all three screens (his ruling G21, 2026-09-08): the average of what has been logged, over the months logged."
   }
  ]
 },
 {
  "id": "MK-CF-F-192",
  "name": "inflowLabel",
  "kind": "function",
  "what_it_is_for": "The inflow line names what is inside it — founder's cluster #5 ruling (2026-09-10): the words in the brackets are the sources, \"Inflow (income (take-home) + rent)\".",
  "handed": "export function inflowLabel(prefix: 'Inflow' | 'Actual inflow' | 'Planned inflow', sources?: string[]): string"
 },
 {
  "id": "MK-CF-F-193",
  "name": "inflowSourceWord",
  "kind": "function",
  "what_it_is_for": "One source of money arriving, as the bracket says it: pay is \"income (take-home)\", a rental is \"rent\", Social Security keeps its name, anything else is its own name in lower case.",
  "handed": "export function inflowSourceWord(source: string): string"
 },
 {
  "id": "MK-CF-F-195",
  "name": "monthsLeftInYear",
  "kind": "function",
  "what_it_is_for": "Months left in the year INCLUDING the current one — December counts as 1, never 0.",
  "handed": "export function monthsLeftInYear(now: Date = new Date()): number",
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   },
   {
    "id": "MK-MN-M-005",
    "words_on_screen": "about $X for the rest of the year",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What filling the remaining room would cost you each month.",
    "when_it_refuses": "Nothing left to fill.",
    "shown_on": [
     "/contribution-room"
    ]
   },
   {
    "id": "MK-MN-M-029",
    "words_on_screen": "each contribution and its amount",
    "unit": "money",
    "what_it_answers": "One line per tax-advantaged account, and what has gone into it.",
    "when_it_refuses": "Nothing entered for that account.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-005",
    "words": "THIS MONTH COUNTS (his ruling G36). Leaving it out told people to save more per month than they need to."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-029",
    "words": "Enrolled in Medicare means NO HSA contribution is allowed at all — not a smaller one (his ruling G10, 2026-09-08)."
   }
  ]
 }
]
```
