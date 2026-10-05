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

# The cards — batch "cashflow 14"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "cashflow 14"` in your reply.

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
  "id": "MK-CF-F-176",
  "name": "sumMonthsOverEarners",
  "kind": "function",
  "what_it_is_for": "Add up twelve numbers per earner, month by month.",
  "formula_in_words": "The chosen twelve-month row worked for each earner and added month by month.",
  "handed": "export function sumMonthsOverEarners(\n  op: OnboardingProfile | null, of: (w: EarnerWage) => number[],\n): number[]"
 },
 {
  "id": "MK-CF-F-177",
  "name": "wageGrossByMonth",
  "kind": "function",
  "what_it_is_for": "ONE person's wage, month by month, January first.",
  "formula_in_words": "With a month table: this calendar year's twelve months from the table, any month not in it taking the typical monthly figure. With none: the typical monthly figure (enteredMonthlyRaw) in every month.",
  "handed": "export function wageGrossByMonth(w: Record<string, any> | null): number[]"
 },
 {
  "id": "MK-CF-F-178",
  "name": "wageMatchMonthly",
  "kind": "function",
  "what_it_is_for": "ONE person's employer match: a share of their own contribution, or a flat amount.",
  "formula_in_words": "A match typed as a percent: monthly 401(k) × that percent ÷ 100. Typed as dollars: that amount.",
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
  "formula_in_words": "Nothing unless EVERY earner typed a take-home above zero. Otherwise each earner's typed take-home — a monthly figure, whatever the pay frequency — × 12, added.",
  "handed": "export function enteredLandsAnnual(op: OnboardingProfile | null): number | null"
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "kind": "function",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income.",
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
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date last year), not reinvested, added by account.",
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
  "formula_in_words": "True when the pay was stored the old way — as take-home — and is above zero.",
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
  "formula_in_words": "Unchanged unless it needs converting (needsTakeHomeConversion). Otherwise: yearly take-home = the stored figure × the periods in a year (weekly 52, every two weeks 26, monthly 12, hourly counted as 12); yearly gross = the gross whose federal tax leaves exactly that take-home (grossFromNet); the stored base pay becomes yearly gross ÷ periods; the typed take-home becomes the yearly take-home ÷ 12 — the month every screen now asks for; the mode becomes gross.",
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
  "formula_in_words": "0 outside tax years 2025 to 2028; when filing separately; when nobody is 65 or over; or when the income is not known. Otherwise $6,000 × the people 65 or over (2 at most), less 6% of the income above $75,000 (single, head of household) or $150,000 (married); never below 0.",
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
  "formula_in_words": "Each earner's monthly 401(k) added, × 12.",
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
  "formula_in_words": "Adds the logged expenses by calendar month. Looks at the 12 months BEFORE the current month. When at least one of those months holds any expense: average = their total ÷ the number of months that hold any — empty months are not counted as zero — labelled N month average. When none does: if the current month holds any, that month's total so far, labelled as one month; otherwise nothing.",
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
  "formula_in_words": "The logged average (essentialsFromLoggedSpending) when there is one; otherwise the typed figure when it is above zero, labelled you entered; otherwise nothing.",
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
    "when_it_refuses": "No essentials figure yet — it says so rather than dividing by nothing. And no count of months where the rent pays for the whole month: the cash is then not drawn on.",
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
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-013",
    "words": "FOUNDER 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\" Rent arrives every month, so it is added to the cash every month — which is the cash ÷ (the month − the rent)."
   }
  ]
 },
 {
  "id": "MK-CF-F-192",
  "name": "inflowLabel",
  "kind": "function",
  "what_it_is_for": "The inflow line names what is inside it — founder's cluster #5 ruling (2026-09-10): the words in the brackets are the sources, \"Inflow (income (take-home) + rent)\".",
  "formula_in_words": "The prefix, then the source words in brackets joined by a plus sign — each word once, in the order given. With no sources: income (take-home).",
  "handed": "export function inflowLabel(prefix: 'Inflow' | 'Actual inflow' | 'Planned inflow', sources?: string[]): string"
 },
 {
  "id": "MK-CF-F-193",
  "name": "inflowSourceWord",
  "kind": "function",
  "what_it_is_for": "One source of money arriving, as the bracket says it: pay is \"income (take-home)\", a rental is \"rent\", Social Security keeps its name, anything else is its own name in lower case.",
  "formula_in_words": "The source lower-cased and trimmed. Starting with salary, base salary or paycheck → income (take-home). Starting with rental, or exactly rent → rent. Starting with social security → Social Security. Anything else → itself, with a trailing bracketed part removed.",
  "handed": "export function inflowSourceWord(source: string): string"
 },
 {
  "id": "MK-CF-F-195",
  "name": "monthsLeftInYear",
  "kind": "function",
  "what_it_is_for": "Months left in the year INCLUDING the current one — December counts as 1, never 0.",
  "formula_in_words": "12 − the number of months already finished this year: 12 in January, 1 in December. The current month counts as left.",
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

## Formulas these cards lean on

7 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-CF-F-083",
  "name": "totalGrossAnnual",
  "what_it_is_for": "Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).",
  "formula_in_words": "Salary for the year + tips for the year + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + untaxed extra in a month × 12 + one-off taxed + one-off untaxed + retirement income in a month × 12."
 },
 {
  "id": "MK-CF-F-084",
  "name": "taxableAnnual",
  "what_it_is_for": "Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates.",
  "formula_in_words": "totalGrossAnnual WITHOUT the untaxed parts: salary + tips + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + one-off taxed + retirement income in a month × 12. The 401(k) is NOT taken off here."
 },
 {
  "id": "MK-CF-F-097",
  "name": "grossFromNet",
  "what_it_is_for": "Invert the schedule: the gross income whose take-home equals `net` (bisection).",
  "formula_in_words": "0 when the take-home is zero or less. Otherwise it searches between the take-home and three times it, halving the range 50 times, for the gross at which gross − federal tax (taxOwedFor, no state tax) equals the take-home."
 },
 {
  "id": "MK-CF-F-099",
  "name": "deductionFor",
  "what_it_is_for": "The amount of income that is free of tax before the brackets start: the standard deduction for the way the person files, plus the extra amounts for anyone 65 or older.",
  "formula_in_words": "The standard deduction for the filing status + the age-65 addition × the number of people 65 or over (2 at most) + the senior deduction (seniorDeductionFor). The amounts are in the 2026 table above the cards."
 },
 {
  "id": "MK-CF-F-100",
  "name": "taxableIncomeFor",
  "what_it_is_for": "What income is taxed, given how this person files?",
  "formula_in_words": "Gross − the deduction (deductionFor, with the gross itself used as the income for the senior deduction's phase-out); never below 0."
 },
 {
  "id": "MK-CF-F-101",
  "name": "taxOwedFor",
  "what_it_is_for": "Federal tax owed under a filing status, plus an optional user-set FLAT state rate applied to TAXABLE income (E10) — states differ wildly, so one honest user-entered percent beats fifty guessed tables, and it never taxes the deduction.",
  "formula_in_words": "Taxable income (taxableIncomeFor) taxed band by band on the filing status's 2026 table — each slice at its own rate — plus taxable income × the state rate (held between 0 and 15%)."
 },
 {
  "id": "MK-CF-F-130",
  "name": "enteredMonthlyRaw",
  "what_it_is_for": "A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly).",
  "formula_in_words": "Hourly: base pay × hours a week (40 when none) × 52 ÷ 12. Otherwise base pay × the periods in a year ÷ 12 (weekly 52, every two weeks 26, monthly 12, yearly 1)."
 }
]
```
