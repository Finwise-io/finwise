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

# The cards — batch "cashflow 09"

15 cards, so 75 cases. Put `"batch": "cashflow 09"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export type FilingStatus = 'single' | 'married' | 'mfs' | 'hoh';
```

## The cards

```json
[
 {
  "id": "MK-CF-F-063",
  "name": "rowVestYear",
  "kind": "function",
  "what_it_is_for": "Calendar year a row vests (first 4 digits of its date; this year if blank).",
  "handed": "export function rowVestYear(row: any): number"
 },
 {
  "id": "MK-CF-F-065",
  "name": "equityVestWeights",
  "kind": "function",
  "what_it_is_for": "Vest-month weights (Jan→Dec, summing to 1) from the equity grant rows — THE one placement rule.",
  "handed": "export function equityVestWeights(op: OnboardingProfile | null): number[] | null"
 },
 {
  "id": "MK-CF-F-067",
  "name": "rentalList",
  "kind": "function",
  "what_it_is_for": "Normalized list of rental properties.",
  "handed": "export function rentalList(op: OnboardingProfile | null): { type: 'long' | 'short'; income: number; expenses: number }[]",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-CF-F-069",
  "name": "benefitActiveMonths",
  "kind": "function",
  "what_it_is_for": "Calendar months (1-12) benefits are received — e.g.",
  "handed": "export function benefitActiveMonths(op: OnboardingProfile | null): number[]"
 },
 {
  "id": "MK-CF-F-073",
  "name": "otherIncomeMonth",
  "kind": "function",
  "what_it_is_for": "Calendar month (1-12) a one-time \"other income\" lands in (default January).",
  "handed": "export function otherIncomeMonth(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-074",
  "name": "tipsAnnual",
  "kind": "function",
  "what_it_is_for": "Tips are part of employment income — they only count in the months the job is active, and the annual figure is prorated like salary (a temp job that ends stops the tips too).",
  "handed": "export function tipsAnnual(op: OnboardingProfile | null, now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-039 how often each income arrives"
  ]
 },
 {
  "id": "MK-CF-F-077",
  "name": "scholarshipByCalendarMonth",
  "kind": "function",
  "what_it_is_for": "Scholarships/grants placed in the calendar months they actually land (Jan→Dec) — NOT averaged.",
  "handed": "export function scholarshipByCalendarMonth(op: OnboardingProfile | null): number[]"
 },
 {
  "id": "MK-CF-F-080",
  "name": "jobActiveMonth",
  "kind": "function",
  "what_it_is_for": "Is base salary present in calendar month i (0-11)?",
  "handed": "export function jobActiveMonth(op: OnboardingProfile | null, i: number, _now: Date = new Date()): boolean"
 },
 {
  "id": "MK-CF-F-081",
  "name": "salaryActiveMonths",
  "kind": "function",
  "what_it_is_for": "How many months of the year you draw a salary.",
  "handed": "export function salaryActiveMonths(op: OnboardingProfile | null, _now: Date = new Date()): number"
 },
 {
  "id": "MK-CF-F-088",
  "name": "taxableByCalendarMonth",
  "kind": "function",
  "what_it_is_for": "The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses, extracted so the rate vector and the grid can never drift apart.",
  "handed": "export function taxableByCalendarMonth(op: OnboardingProfile | null, now: Date = new Date()): number[]",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-059 the month a bonus lands"
  ]
 },
 {
  "id": "MK-CF-F-090",
  "name": "effectiveRate",
  "kind": "function",
  "what_it_is_for": "The one tax rate in force for the household, as a share of gross: their own figure where they gave one, otherwise the calculated rate.",
  "handed": "export function effectiveRate(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-091",
  "name": "userCapGainsRates",
  "kind": "function",
  "what_it_is_for": "The person's own capital-gains tax rates, long-term and short-term, each with their state rate added.",
  "handed": "export function userCapGainsRates(op: OnboardingProfile | null): { lt: number; st: number }",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 },
 {
  "id": "MK-CF-F-097",
  "name": "grossFromNet",
  "kind": "function",
  "what_it_is_for": "Invert the schedule: the gross income whose take-home equals `net` (bisection).",
  "handed": "export function grossFromNet(net: number, status: FilingStatus = 'single', over65 = 0): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 },
 {
  "id": "MK-CF-F-098",
  "name": "progressiveMonthlyTax",
  "kind": "function",
  "what_it_is_for": "The tax taken in each of the twelve months when the brackets fill as the year's income builds up, so a month with a bonus is taxed higher and the twelve add up to the year's tax exactly.",
  "handed": "export function progressiveMonthlyTax(taxableByMonth: number[], status: FilingStatus = 'single', stateRate = 0, over65 = 0): number[]",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 },
 {
  "id": "MK-CF-F-099",
  "name": "deductionFor",
  "kind": "function",
  "what_it_is_for": "The amount of income that is free of tax before the brackets start: the standard deduction for the way the person files, plus the extra amounts for anyone 65 or older.",
  "handed": "export function deductionFor(status: FilingStatus = 'single', over65 = 0, magi: number | null = null): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 }
]
```
