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

# The cards — batch "cashflow 04"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "cashflow 04"` in your reply.

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
export interface BudgetVsActual {
  month: string;            // 'YYYY-MM'
  planned_total: number;    // planned monthly budget (from onboarding)
  spent_total: number;      // month-to-date actual
  remaining: number;        // planned − spent
  buckets: BucketActual[];
}

export interface Debt {
  debt_id: EntityId;
  label: string;                   // account name, e.g. "Chase Sapphire"
  institution?: string;
  debt_type: DebtType;
  remaining_balance: number;
  interest_rate_apr: number;       // decimal
  minimum_monthly_payment: number;
  monthly_payment?: number;        // what you actually pay each month (≥ minimum); defaults to minimum
  due_day?: number;                // day of month the payment is due (1–31)
  first_payment_date?: string;     // 'YYYY-MM-DD' — payments START here (deferred/future-start loans);
                                   // absent = already paying. Interest accrues from now either way (F2).
  // #17 / Term #9 / B47 finding 11 — payment shape (drives DTI bucket + how cash flow shows it):
  payoff_date?: string;            // 'YYYY-MM-DD' final payoff / loan maturity (term loans);
                                   // for due_in_full this IS the due date of the lump sum
  payment_frequency?: 'monthly' | 'annual';     // default monthly
  payment_type?: 'installment' | 'revolving' | 'due_in_full';   // fixed loan payment vs revolving
                                   // minimum (cards) vs one lump sum on a date; defaults by debt_type
  origin?: 'onboarding';           // seeded from onboarding answers; re-seeding replaces ONLY these
                                   // rows (absent = user-created, never touched by seeding/restart)
}

export type DebtType = 'MORTGAGE' | 'HELOC' | 'CREDIT_CARD' | 'STUDENT_LOAN' | 'AUTO' | 'PERSONAL' | 'MEDICAL' | 'OTHER';

export interface MonthBlock { lines: Line[]; surplus: number;
  /** False on the PLANNED side when no budget is set: there is no planned surplus, and the screen
   *  prints an em-dash rather than a figure built on a guess. Always true on the actual side. */
  planSet: boolean; }

export interface MonthInput {
  ym: string;                    // 'YYYY-MM' — the month being shown
  takeHomeMonthly: number;       // from basePay — the take-home
  inflowSources?: string[];      // the sources inside takeHomeMonthly, by name — the inflow line prints them (cluster #5 ruling, 2026-09-10)
  debts: Debt[];
  plannedExpenses: number;       // from plannedMonthlySpend — the ONE canonical planned figure; 0 = no budget set
  expenses: LoggedExpense[];     // everything logged, debt payments included
  /** WHAT THE PLAN HAS ALREADY PROMISED to goals, per month. The hero figure on This month is the
   *  surplus LESS these, because money already committed to a goal is not free (F11). */
  commitments?: { label: string; monthlyAmount: number }[];
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-002",
  "name": "plannedMonthlySpend",
  "kind": "function",
  "what_it_is_for": "The single canonical \"planned monthly spend\": the itemized buckets OR the stated total, whichever is larger (the stated total can include an uncategorized remainder the buckets don't capture).",
  "formula_in_words": "The larger of two figures: the budget categories added up (spendBuckets), and the single monthly figure the person typed.",
  "handed": "export function plannedMonthlySpend(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-003",
  "name": "categoryMonthly",
  "kind": "function",
  "what_it_is_for": "Canonical per-category planned $/month — the ONE conversion the buckets AND the Budget screen share, so a category's on-screen line item ALWAYS reconciles with its bucket total (build-34 #3).",
  "formula_in_words": "0 when the amount is zero or less. A dollar category: the amount, per month — a once-a-year (non-monthly) category is the yearly amount ÷ 12. A percent category: that percent of the average monthly take-home (pctBaseMonthly) — for a non-monthly one the same, worked as a yearly amount and ÷ 12.",
  "handed": "export function categoryMonthly(c: { amount?: any; unit?: string; bucket?: string } | null | undefined, op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-004",
  "name": "spendBuckets",
  "kind": "function",
  "what_it_is_for": "Roll the per-category expenses up into the three monthly-normalized buckets.",
  "formula_in_words": "With categories: each category's monthly amount (categoryMonthly) is added into fixed, non-monthly or flexible — any other bucket counts as flexible; rows of zero are skipped. With no categories: the three typed bucket totals. Monthly total = the three added.",
  "handed": "export function spendBuckets(op: OnboardingProfile | null): { fixed: number; non_monthly: number; flexible: number; monthly_total: number }",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up"
  ]
 },
 {
  "id": "MK-CF-F-005",
  "name": "actualMonthFlow",
  "kind": "function",
  "what_it_is_for": "WHAT HAS ACTUALLY HAPPENED: what landed, less only the debts confirmed paid, less what was really spent.",
  "formula_in_words": "Rows, in this order. Actual inflow = the monthly take-home handed in. One row for each debt with a required payment above zero: minus what was logged as paid against it this month (0 when nothing was), marked paid or not. Other debt payments = debt payments logged this month that match no debt on record, when above zero. Expenses entered by hand = minus the month's logged expenses that were not imported, debt payments left out. Expenses imported from your card = minus the imported ones, shown only when there are any. Debts on the big-ticket radar (cards, lines of credit, debts due in full) are moved to the end. Surplus = every row added up.",
  "handed": "export function actualMonthFlow(m: MonthInput): MonthBlock",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-052 the day of the month a debt payment is due",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-CF-F-006",
  "name": "allocatableThisMonth",
  "kind": "function",
  "what_it_is_for": "What's LEFT of this month's surplus to put to work = surplus − already-allocated this month (never < 0).",
  "formula_in_words": "Surplus − what has already been set aside this month; never below 0.",
  "handed": "export function allocatableThisMonth(surplus: number, allocatedThisMonth: number | undefined): number"
 },
 {
  "id": "MK-CF-F-007",
  "name": "nonMonthlyBasis",
  "kind": "function",
  "what_it_is_for": "Label basis for the non-monthly bucket (e.g.",
  "formula_in_words": "True, with the percents added and rounded to a whole number, only when there is at least one non-monthly category above zero and every one of them is entered as a percent. Otherwise false and 0.",
  "handed": "export function nonMonthlyBasis(op: OnboardingProfile | null): { allPct: boolean; pct: number }",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-011",
  "name": "savingsByMonth",
  "kind": "function",
  "what_it_is_for": "Discretionary amount free to save each month = take-home that month (after tax & 401k) minus the expenses due that month.",
  "formula_in_words": "For each calendar month: the take-home that month (incomeMonthlyGrid, take-home) − the planned expenses that month (spendByMonth).",
  "handed": "export function savingsByMonth(op: OnboardingProfile | null): { label: string; amount: number }[]"
 },
 {
  "id": "MK-CF-F-012",
  "name": "annualCashflow",
  "kind": "function",
  "what_it_is_for": "ONE annual cash-flow roll-up, derived entirely from the per-month income grid + spendByMonth — the SAME bases the savings-plan and budget already use.",
  "formula_in_words": "Gross for the year, after-tax for the year and take-home for the year = the twelve months of incomeMonthlyGrid in each of its three modes, added. Expenses for the year = spendByMonth added. Tax = gross − after-tax. 401(k) = after-tax − take-home. Saved = take-home − expenses.",
  "handed": "export function annualCashflow(op: OnboardingProfile | null): {\n  grossYr: number; taxYr: number; netYr: number; k401Yr: number; availableYr: number; spendYr: number; saveYr: number;\n}"
 },
 {
  "id": "MK-CF-F-014",
  "name": "budgetVsActual",
  "kind": "function",
  "what_it_is_for": "Month-to-date actual expenses vs the planned budget, bucketed.",
  "formula_in_words": "This calendar month's logged expenses, leaving out the category Debt payment, added into fixed, non-monthly or flexible by each expense's category. For each bucket: planned (spendBuckets), spent, remaining = planned − spent. The totals the same way.",
  "handed": "export function budgetVsActual(expenses: any[], op: OnboardingProfile | null, now: Date = new Date()): BudgetVsActual",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-032 expenses categories the person set up"
  ]
 },
 {
  "id": "MK-CF-F-021",
  "name": "defaultPaymentType",
  "kind": "function",
  "what_it_is_for": "How a kind of debt is normally repaid: a card or a credit line revolves, and every other kind is a loan paid in fixed instalments.",
  "formula_in_words": "A credit card or a home-equity line: revolving. Every other kind of debt: instalment.",
  "handed": "export function defaultPaymentType(t: DebtType): NonNullable<Debt['payment_type']>",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ]
 },
 {
  "id": "MK-CF-F-022",
  "name": "paymentShape",
  "kind": "function",
  "what_it_is_for": "How this debt is repaid: the way the person said, or the normal way for its kind when they did not say.",
  "formula_in_words": "The payment type recorded on the debt; when none is recorded, defaultPaymentType.",
  "handed": "export function paymentShape(d: Debt): NonNullable<Debt['payment_type']>",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ]
 },
 {
  "id": "MK-CF-F-023",
  "name": "requiredPayment",
  "kind": "function",
  "what_it_is_for": "The payment reserved/required each month for a debt (planned payment, else the minimum).",
  "formula_in_words": "0 for a debt due in full. Otherwise the larger of the minimum monthly payment and the payment the person says they make.",
  "handed": "export function requiredPayment(d: Debt): number",
  "inputs_it_reads": [
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-041 the payment the person chose to make on a debt",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ]
 },
 {
  "id": "MK-CF-F-024",
  "name": "totalDebtMonthly",
  "kind": "function",
  "what_it_is_for": "Total monthly debt obligation across all debts (override-aware).",
  "formula_in_words": "requiredPayment added over the debts.",
  "handed": "export function totalDebtMonthly(debts: Debt[]): number",
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-012",
    "words_on_screen": "Monthly debt payments",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What all your debts require of you in a month, together.",
    "when_it_refuses": "No debts entered.",
    "shown_on": [
     "/analytics",
     "/home"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0641",
    "date": "2026-09-30",
    "words": "Q53 - what actually leaves."
   }
  ]
 },
 {
  "id": "MK-CF-F-025",
  "name": "minimumDebtService",
  "kind": "function",
  "what_it_is_for": "The minimum payments every debt requires in a month, added up, leaving out any debt due in one lump on a date.",
  "formula_in_words": "Each debt's minimum monthly payment added; a debt due in full counts 0.",
  "handed": "export function minimumDebtService(debts: Debt[]): number",
  "inputs_it_reads": [
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ]
 },
 {
  "id": "MK-CF-F-027",
  "name": "totalDebtBalance",
  "kind": "function",
  "what_it_is_for": "Σ outstanding debt BALANCE — what you still owe (not a monthly payment).",
  "formula_in_words": "The balances added.",
  "handed": "export function totalDebtBalance(debts: Debt[]): number",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance"
  ]
 }
]
```

## Formulas these cards lean on

8 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-CF-F-008",
  "name": "spendByMonth",
  "what_it_is_for": "Expenses placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.",
  "formula_in_words": "Twelve calendar months. Each monthly category adds its monthly amount to every month (a percent category = that percent of the average monthly take-home). Each non-monthly category adds its yearly amount spread evenly over the months it names — over all twelve when it names none (a percent one = percent × average monthly take-home × 12). With no categories: the three typed buckets' total, every month. Then, when the single typed monthly figure is larger than the categories' monthly total, the difference is added to every month."
 },
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
  "id": "MK-CF-F-087",
  "name": "monthlyTaxRates",
  "what_it_is_for": "The tax rate for each of the twelve months, as a share: the one rate in force in every month — the person's own where they gave one, otherwise the calculated rate.",
  "formula_in_words": "Twelve rates, all the same: the rate in force (rateInForce) — the person's own, or the calculated one. A steady income is taxed the same in every month."
 },
 {
  "id": "MK-CF-F-088",
  "name": "taxableByCalendarMonth",
  "what_it_is_for": "The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses, extracted so the rate vector and the grid can never drift apart.",
  "formula_in_words": "For each calendar month: gross salary + tips (only in months with salary) + net rent ÷ 12 + that month's stock vesting + taxed extra in a month + retirement income; + the bonus in its month (December when none); + the signing bonus in January; + one-off taxed other income in its month; − the household's 401(k) that month. Never below 0."
 },
 {
  "id": "MK-CF-F-092",
  "name": "incomeMonthlyGrid",
  "what_it_is_for": "A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness: salary & net rental are steady every month; the annual bonus lands in December; the signing bonus is one-time (January); equity is the level annual vesting spread across the month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).",
  "formula_in_words": "For each calendar month. Earned before 401(k) = that month's taxed income (taxableByCalendarMonth) + that month's 401(k). Untaxed = support + that month's scholarships + benefits in their months + one-off untaxed income in its month. Gross = earned before 401(k) + untaxed − reinvested interest and dividends. Tax = tax on the wages + tax on the rest. The wages, earner by earner: an earner who typed a take-home is taxed at their own share — (their yearly gross − their 401(k) for the year − 12 × the typed take-home) ÷ their yearly gross, held between 0 and 1 — so they land exactly what they typed; any other earner's wage × the rate in force (monthlyTaxRates). The rest (earned before 401(k) − the wages) × the rate in force — except that when the rate is the person's own, the month's rent and interest and dividends are left out, because they are not on a payslip. After-tax = gross − tax. Take-home = gross − tax − 401(k)."
 },
 {
  "id": "MK-CF-F-120",
  "name": "pctBaseMonthly",
  "what_it_is_for": "A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the expenses-plan screen uses (modules.tsx SpendingEditor → takeHomeMonthly).",
  "formula_in_words": "The twelve months of take-home (incomeMonthlyGrid, take-home) added ÷ 12."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income."
 }
]
```
