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

# The cards — batch "cashflow 05"

15 cards, so 75 cases. Put `"batch": "cashflow 05"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface GuaranteedStream { kind: 'ss' | 'pension' | 'annuity' | 'other'; monthly: number; inflates: boolean }
```

## The cards

```json
[
 {
  "id": "MK-CF-F-058",
  "name": "rothConversionWindow",
  "kind": "function",
  "what_it_is_for": "Are you in the low-income \"Roth conversion window\" (retired, before RMDs/SS push income up)?",
  "handed": "export function rothConversionWindow(age: number, retireAge: number, claimAge: number, rmdAge = 73): boolean",
  "inputs_it_reads": [
   "MK-XS-I-018 retirement age",
   "MK-XS-I-021 Social Security claim age"
  ]
 },
 {
  "id": "MK-CF-F-064",
  "name": "equityCashFlow",
  "kind": "function",
  "what_it_is_for": "Per-calendar-year vesting cash flow across all schedule rows — drives the chart & table.",
  "handed": "export function equityCashFlow(op: OnboardingProfile | null): { year: number; amount: number }[]"
 },
 {
  "id": "MK-CF-F-066",
  "name": "rsuAnnual",
  "kind": "function",
  "what_it_is_for": "Annual equity-comp run-rate: total scheduled value spread over the years it vests across (a level annual figure for the income estimate).",
  "handed": "export function rsuAnnual(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-068",
  "name": "rentalNetAnnual",
  "kind": "function",
  "what_it_is_for": "Total net rental income per year, across all properties (income − operating expenses).",
  "handed": "export function rentalNetAnnual(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-CF-F-070",
  "name": "benefitAnnual",
  "kind": "function",
  "what_it_is_for": "Annual benefits = monthly amount × the months it's actually received.",
  "handed": "export function benefitAnnual(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-071",
  "name": "extraIncome",
  "kind": "function",
  "what_it_is_for": "Extra income sources beyond salary/rental/equity (self-employment, investment, benefits, support, scholarship, other), split into taxable vs non-taxable steady monthly amounts + a one-time Jan amount.",
  "handed": "export function extraIncome(op: OnboardingProfile | null): {\n  taxableMonthly: number; nontaxMonthly: number; onetimeTaxable: number; onetimeNontax: number;\n  reinvestedMonthly: number;\n}",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives"
  ]
 },
 {
  "id": "MK-CF-F-072",
  "name": "currentRetirementIncomeMonthly",
  "kind": "function",
  "what_it_is_for": "Retirement income (ri_*) counts as CURRENT income only when the user actually receives it now — i.e.",
  "handed": "export function currentRetirementIncomeMonthly(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-040 whether a stream is already being received"
  ]
 },
 {
  "id": "MK-CF-F-075",
  "name": "retirementIncomeMonthly",
  "kind": "function",
  "what_it_is_for": "Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable.",
  "handed": "export function retirementIncomeMonthly(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income",
   "MK-XS-I-037 required-withdrawal income stream (ri_rmd)",
   "MK-XS-I-038 withdrawal income stream (ri_withdrawals)",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-CF-F-076",
  "name": "guaranteedOutsideStreams",
  "kind": "function",
  "what_it_is_for": "The guaranteed income that comes from outside the person's own savings, one row for each source that pays anything: Social Security, a pension, an annuity or another, each as a monthly amount with whether it rises with prices.",
  "handed": "export function guaranteedOutsideStreams(op: OnboardingProfile | null): GuaranteedStream[]",
  "inputs_it_reads": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
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
   }
  ]
 },
 {
  "id": "MK-CF-F-078",
  "name": "employerMatchMonthly",
  "kind": "function",
  "what_it_is_for": "Employer match resolved to $/month.",
  "handed": "export function employerMatchMonthly(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-079",
  "name": "incomeFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Turns the income answers given during setup into the list of income sources the app stores.",
  "handed": "export function incomeFromOnboarding(uid: UserId, op: OnboardingProfile | null): IncomeDoc",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-059 the month a bonus lands"
  ]
 },
 {
  "id": "MK-CF-F-082",
  "name": "salaryAnnual",
  "kind": "function",
  "what_it_is_for": "Salary income for the year = sum of the per-month gross salary.",
  "handed": "export function salaryAnnual(op: OnboardingProfile | null, _now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income"
  ]
 },
 {
  "id": "MK-CF-F-083",
  "name": "totalGrossAnnual",
  "kind": "function",
  "what_it_is_for": "Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).",
  "handed": "export function totalGrossAnnual(op: OnboardingProfile | null, now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income"
  ]
 },
 {
  "id": "MK-CF-F-084",
  "name": "taxableAnnual",
  "kind": "function",
  "what_it_is_for": "Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates.",
  "handed": "export function taxableAnnual(op: OnboardingProfile | null, now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income"
  ]
 },
 {
  "id": "MK-CF-F-085",
  "name": "filingStatusOf",
  "kind": "function",
  "what_it_is_for": "Effective tax rate in use: the user's manual rate, else the IRS-schedule estimate on taxable income.",
  "handed": "export function filingStatusOf(op: OnboardingProfile | null): import('./tax').FilingStatus",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 }
]
```
