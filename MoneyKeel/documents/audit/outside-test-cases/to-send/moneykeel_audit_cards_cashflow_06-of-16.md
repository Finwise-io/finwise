# Brief — check the formula, then write the test cases, from outside

MoneyKeel · calculation audit · v03 · 2026-10-04

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
2. **Published sources** — for tax bands, deductions, contribution limits and thresholds. Name the
   source and the year. A wrong amount is a `WRONG` formula.
3. **Standard finance practice** — for returns, loan payments, payoff orders, yearly rates. Name the
   method (for example, the Modified Dietz method; the standard loan-payment formula).
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

# The cards — batch "cashflow 06"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "cashflow 06"` in your reply.

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
  "formula_in_words": "True when the age is at or past the retirement age AND below the earlier of age 73 and the Social Security claiming age (73 when there is no claiming age).",
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
  "formula_in_words": "The value of each vesting row (equityRowValue) added by vesting year; rows of zero or less are left out; earliest year first.",
  "handed": "export function equityCashFlow(op: OnboardingProfile | null): { year: number; amount: number }[]"
 },
 {
  "id": "MK-CF-F-066",
  "name": "rsuAnnual",
  "kind": "function",
  "what_it_is_for": "Annual equity-comp run-rate: total scheduled value spread over the years it vests across (a level annual figure for the income estimate).",
  "formula_in_words": "With vesting rows: their total value ÷ the number of different years in which rows with a value vest (at least 1). With none: shares × price, as typed.",
  "handed": "export function rsuAnnual(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-068",
  "name": "rentalNetAnnual",
  "kind": "function",
  "what_it_is_for": "Total net rental income per year, across all properties (income − operating expenses).",
  "formula_in_words": "(Monthly rent − monthly running costs) added over the rentals, × 12. A rental that loses money pulls the total down.",
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
  "formula_in_words": "The monthly benefit × the number of months it is paid (benefitActiveMonths).",
  "handed": "export function benefitAnnual(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-071",
  "name": "extraIncome",
  "kind": "function",
  "what_it_is_for": "Extra income sources beyond salary/rental/equity (self-employment, investment, benefits, support, scholarship, other), split into taxable vs non-taxable steady monthly amounts + a one-time Jan amount.",
  "formula_in_words": "Taxed in a month = self-employment (yearly ÷ 12, or the monthly figure) + interest and dividends ÷ 12 + other income when taxable (yearly ÷ 12, or the monthly figure). Untaxed in a month = benefits for the year ÷ 12 + support + scholarships (monthly, or yearly ÷ 12) + other income when marked not taxable. One-off other income goes to one-off taxed or one-off untaxed. Reinvested in a month = interest and dividends ÷ 12, unless they are paid to the bank — then 0.",
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
  "formula_in_words": "0 when the person's chosen income sources are listed and retirement income is not among them; otherwise retirementIncomeMonthly.",
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
  "formula_in_words": "Social Security, pension, withdrawals, required distributions, annuities and other, each turned into a month — monthly as it is, quarterly ÷ 3, yearly ÷ 12 — and added.",
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
  "formula_in_words": "Social Security, pension, annuity and other, each as a monthly amount (quarterly ÷ 3, yearly ÷ 12), only those above zero. Rises with prices: Social Security yes, the others no — unless the person said otherwise. Withdrawals and required distributions are not here.",
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
  "formula_in_words": "Each earner's match in a month (wageMatchMonthly), added.",
  "handed": "export function employerMatchMonthly(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-079",
  "name": "incomeFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Turns the income answers given during setup into the list of income sources the app stores.",
  "formula_in_words": "Builds the stored income list from the sign-up answers, one source for each amount above zero: base salary = yearly salary ÷ 12, monthly, with the employer match; the bonus, yearly, in its month (December when none); stock vesting, yearly, split by vesting month; a signing bonus, once, in January; each rental, monthly, with its running costs; tips = yearly tips ÷ 12, monthly; retirement income, monthly; self-employment, monthly or yearly; interest and dividends, yearly; benefits = the year ÷ 12, monthly; support, monthly; each scholarship; other income with its frequency and month. Tax: the person's own rate (percent ÷ 100, held between 0 and 1) when they chose to type one; otherwise calculated.",
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
  "formula_in_words": "The twelve months of gross salary (salaryGrossByMonth) added.",
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
  "formula_in_words": "Salary for the year + tips for the year + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + untaxed extra in a month × 12 + one-off taxed + one-off untaxed + retirement income in a month × 12.",
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
  "formula_in_words": "totalGrossAnnual WITHOUT the untaxed parts: salary + tips + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + one-off taxed + retirement income in a month × 12. The 401(k) is NOT taken off here.",
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
  "formula_in_words": "The filing status the person chose: married, married filing separately or head of household; anything else, single. When none is chosen: married when there is a spouse or the spouse earns; single otherwise.",
  "handed": "export function filingStatusOf(op: OnboardingProfile | null): import('./tax').FilingStatus",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 }
]
```

## Formulas these cards lean on

6 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-CF-F-060",
  "name": "salaryGrossByMonth",
  "what_it_is_for": "Per-month GROSS base salary, Jan→Dec.",
  "formula_in_words": "Each earner's twelve months of gross pay (wageGrossByMonth), added month by month."
 },
 {
  "id": "MK-CF-F-062",
  "name": "equityRowValue",
  "what_it_is_for": "Value of one vesting-schedule row.",
  "formula_in_words": "An option: shares × (market price − strike price), never below 0. Any other grant: shares × price."
 },
 {
  "id": "MK-CF-F-069",
  "name": "benefitActiveMonths",
  "what_it_is_for": "Calendar months (1-12) benefits are received — e.g.",
  "formula_in_words": "The months, 1 to 12, in which the benefit is paid, in order; all twelve when none are named."
 },
 {
  "id": "MK-CF-F-130",
  "name": "enteredMonthlyRaw",
  "what_it_is_for": "A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly).",
  "formula_in_words": "Hourly: base pay × hours a week (40 when none) × 52 ÷ 12. Otherwise base pay × the periods in a year ÷ 12 (weekly 52, every two weeks 26, monthly 12, yearly 1)."
 },
 {
  "id": "MK-CF-F-177",
  "name": "wageGrossByMonth",
  "what_it_is_for": "ONE person's wage, month by month, January first.",
  "formula_in_words": "With a month table: this calendar year's twelve months from the table, any month not in it taking the typical monthly figure. With none: the typical monthly figure (enteredMonthlyRaw) in every month."
 },
 {
  "id": "MK-CF-F-178",
  "name": "wageMatchMonthly",
  "what_it_is_for": "ONE person's employer match: a share of their own contribution, or a flat amount.",
  "formula_in_words": "A match typed as a percent: monthly 401(k) × that percent ÷ 100. Typed as dollars: that amount."
 }
]
```
