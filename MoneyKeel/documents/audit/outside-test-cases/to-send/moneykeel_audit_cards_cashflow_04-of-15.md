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
export interface DTI { ratio: number; monthlyDebt: number; grossMonthly: number; guideline: number; status: 'good' | 'caution' | 'high'; }

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

export interface DebtState {
  user_id: UserId;
  total_debt_balance: number;
  total_monthly_debt_service: number;   // Σ MINIMUM payments — the obligation (use for DTI)
  total_actual_payment: number;         // Σ ACTUAL payments (override-aware) — use for cash flow
  debts: Debt[];
  highest_rate_debt: Debt | null;   // the "pay this first" (avalanche) target
  toxic_debt_balance: number;       // balances above ~7% APR
}

export interface Headroom { limit: number; used: number; remaining: number; catchUp: boolean; }

export interface LoanPlan { monthly: number; totalInterest: number; totalPaid: number; }

export interface MortgageComparison {
  /** the loan's own rate, as a percentage for display */
  mortgagePct: number;
  /** today's ten-year Treasury yield, as a percentage for display */
  treasuryPct: number;
  /** mortgage rate minus the yield, in percentage points; positive = paying down wins */
  gapPoints: number;
  /** what that gap is worth in a year at today's balance — the number a person can feel */
  annualDifference: number;
  /** over the life of the loan, how much better (positive) or worse (negative) off paying the
   *  extra leaves them versus putting the same money into Treasuries */
  lifetimeDifference: number;
  /** true when the two rates are close enough that neither choice is clearly better */
  tooCloseToCall: boolean;
  /** which way it points — the copy branches on this, never on the sign of a number */
  direction: 'paying-down-wins' | 'treasuries-win' | 'too-close';
}

export interface MortgageOddsEffect {
  /** the plan exactly as it stands today */
  before: number;
  /** the same plan with the extra payment genuinely modelled */
  after: number;
  /** the calendar year the loan clears without the extra payment */
  payoffYear: number;
  /** …and with it */
  fasterPayoffYear: number;
}

export type PayoffMethod = 'avalanche' | 'snowball';

export interface PayoffResult {
  months: number;                 // months to debt-free (0 = already free)
  totalInterest: number;          // interest paid over the plan
  neverPaysOff: boolean;          // payments can't cover interest
  order: { debt_id: EntityId; label: string; payoffMonth: number; interestPaid: number }[];
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-028",
  "name": "loanPayment",
  "kind": "function",
  "what_it_is_for": "UNIT LANDMINE (P0): `aprPct` is a PERCENT (7 = 7%), unlike Debt.interest_rate_apr which is a DECIMAL (0.07).",
  "formula_in_words": "Months = years × 12, rounded to a whole number; monthly rate = the yearly percent ÷ 100 ÷ 12. All zero when the amount borrowed or the months are zero or less. Payment = amount × monthly rate ÷ (1 − (1 + monthly rate) to the power −months); with no interest, amount ÷ months. Total paid = payment × months. Total interest = total paid − amount.",
  "handed": "export function loanPayment(principal: number, aprPct: number, termYears: number): LoanPlan"
 },
 {
  "id": "MK-CF-F-029",
  "name": "monthsToClear",
  "kind": "function",
  "what_it_is_for": "How many months it takes to clear a balance at a given yearly rate and monthly payment, or never when the payment does not cover the interest.",
  "formula_in_words": "0 when nothing is owed. No answer when the payment is zero or less, or when it does not exceed the first month's interest (balance × yearly rate ÷ 12) — the debt would never clear. With no interest: balance ÷ payment, rounded up. Otherwise log(payment ÷ (payment − balance × monthly rate)) ÷ log(1 + monthly rate), rounded up to a whole month.",
  "handed": "export function monthsToClear(principal: number, aprDecimal: number, payment: number): number | null"
 },
 {
  "id": "MK-CF-F-030",
  "name": "paymentToClearBy",
  "kind": "function",
  "what_it_is_for": "Monthly payment that clears `principal` in `months` at decimal APR (amortization).",
  "formula_in_words": "0 when nothing is owed or the months are zero or less. Payment = balance × monthly rate ÷ (1 − (1 + monthly rate) to the power −months), monthly rate = yearly rate ÷ 12; with no interest, balance ÷ months. Rounded UP to the cent.",
  "handed": "export function paymentToClearBy(principal: number, aprDecimal: number, months: number): number"
 },
 {
  "id": "MK-CF-F-032",
  "name": "creditScoreBand",
  "kind": "function",
  "what_it_is_for": "The word for a credit score: Excellent from 800, Very good from 740, Good from 670, Fair from 580 and Poor below that.",
  "formula_in_words": "800 and above Excellent; 740 and above Very good; 670 and above Good; 580 and above Fair; below 580 Poor. Good, Very good and Excellent count as good.",
  "handed": "export function creditScoreBand(score: number): { label: string; good: boolean }"
 },
 {
  "id": "MK-CF-F-033",
  "name": "debtToIncome",
  "kind": "function",
  "what_it_is_for": "Monthly debt payments as a share of gross monthly income, judged against a guideline of 36% for a homeowner and 20% for anyone else.",
  "formula_in_words": "Share = monthly debt payments ÷ monthly gross income (0 when the income is zero or less). Guideline: 36% for a homeowner, 20% otherwise. Good at or under the guideline; caution up to 1.4 × the guideline (50.4% for a homeowner, 28% otherwise); high above that. The share is rounded to three decimals after it is judged.",
  "handed": "export function debtToIncome(monthlyDebt: number, grossMonthly: number, homeowner = false): DTI"
 },
 {
  "id": "MK-CF-F-034",
  "name": "payoffPlan",
  "kind": "function",
  "what_it_is_for": "Simulate paying off debts with a constant monthly budget (sum of minimums + extra), rolling each cleared debt's freed-up payment into the next per the chosen method.",
  "formula_in_words": "Only debts with a balance above zero. A debt due in full is paid in its due month (never earlier than month 1; month 1 when it has no date), with interest = balance × ((1 + yearly rate ÷ 12) to the power of the months until then − 1). The others are walked month by month, for at most 600 months. Each month: every balance grows by balance × yearly rate ÷ 12; the money to pay = the minimums of every debt whose payments have started — including debts already cleared, whose minimums roll on — plus the extra; each debt first gets its minimum (never more than it owes); what is left goes to one debt at a time, highest rate first (avalanche) or smallest balance first (snowball). A debt is cleared when it owes a cent or less. A debt whose first payment date is in the future is not paid until that month, and grows meanwhile. Months = the month the last debt is cleared (or the last lump-sum month, when later); total interest = all the interest charged; it never pays off when anything is still owed at month 600. Order = each debt with the month it is cleared and the interest it cost, earliest first.",
  "handed": "export function payoffPlan(debts: Debt[], extraMonthly: number, method: PayoffMethod = 'avalanche', now: Date = new Date()): PayoffResult",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump",
   "MK-XS-I-053 the month a debt is first paid",
   "MK-XS-I-054 the date a debt is due to be paid off in full"
  ]
 },
 {
  "id": "MK-CF-F-035",
  "name": "debtKind",
  "kind": "function",
  "what_it_is_for": "What do we know about this kind of debt?",
  "formula_in_words": "The label and icon recorded for a kind of debt; nothing for a kind that is not on the list.",
  "handed": "export function debtKind(id?: string)"
 },
 {
  "id": "MK-CF-F-036",
  "name": "buildDebtState",
  "kind": "function",
  "what_it_is_for": "What is the whole debt picture?",
  "formula_in_words": "Total = the balances added. Minimum in a month = minimumDebtService. Actual payment in a month = actualDebtPayment. Highest-rate debt = the one with the largest yearly rate, the first of equals. High-cost debt = the balances of the debts whose rate is ABOVE 7%, added.",
  "handed": "export function buildDebtState(uid: UserId, debts: Debt[]): DebtState",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate"
  ]
 },
 {
  "id": "MK-CF-F-042",
  "name": "mortgageOddsEffect",
  "kind": "function",
  "what_it_is_for": "Run the plan twice and report both results.",
  "formula_in_words": "Nothing when the extra is zero or less, or when the mortgage would never clear at either payment (monthsToClear). Payoff year = this year + the whole years in (months − 1) ÷ 12 — worked for the present payment and for payment + extra. Before = the retirement projection's chance of success with the present payment running through its payoff year. After = the chance with payment + extra running through the earlier payoff year, the yearly saving lowered by extra × 12 until then, and raised by (payment + extra) × 12 from the year after.",
  "handed": "export function mortgageOddsEffect(args: {\n  base: RetirementInputs;\n  balance: number;\n  annualRate: number;\n  monthlyPayment: number;\n  extraMonthly: number;\n  nowYear: number;\n}): MortgageOddsEffect | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-CF-F-043",
  "name": "compareMortgageToTreasury",
  "kind": "function",
  "what_it_is_for": "Compare paying `extraMonthly` into the mortgage against putting the same money into Treasuries.",
  "formula_in_words": "Nothing unless the balance, the rate and the payment are all above zero. Gap = (mortgage rate − Treasury yield) in percentage points, to two decimals. Too close to call when the gap is under 0.25 points either way; otherwise paying down wins when the gap is positive and Treasuries win when it is negative. Yearly difference = (mortgage rate − Treasury yield) × balance. Lifetime difference — only with an extra above zero and a mortgage that clears both ways — = what (payment + extra) a month grows to at the Treasury yield over the months freed by clearing early, minus what the extra a month grows to at the Treasury yield over all the months the mortgage would otherwise run (futureValue, amortise).",
  "handed": "export function compareMortgageToTreasury(args: {\n  balance: number;\n  annualRate: number;          // decimal, e.g. 0.055\n  monthlyPayment: number;\n  extraMonthly: number;\n  treasuryYield: number;       // decimal, e.g. 0.0463\n}): MortgageComparison | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-CF-F-049",
  "name": "buildIncomeState",
  "kind": "function",
  "what_it_is_for": "The income picture for a year: gross, tax rate and take-home, and the gross, tax and take-home of each of the twelve months.",
  "formula_in_words": "Yearly gross = grossAnnualBaseline. Rate = effectiveTaxRate. Yearly after-tax = gross × (1 − rate); monthly after-tax = that ÷ 12. Month grid: each source's gross laid on the calendar (monthlyGrossOfSource), added by month. Tax each month = that month's gross × the rate, when the person's own rate is on; otherwise the federal tax on the year's running total up to and including that month, minus the tax up to the month before — worked AS A SINGLE FILER, with no state tax. After-tax that month = gross − tax. Employer match for the year = employerMatchAnnual.",
  "handed": "export function buildIncomeState(userId: string, sources: IncomeSource[], tax: TaxProfile): IncomeState"
 },
 {
  "id": "MK-CF-F-053",
  "name": "annual401kLimit",
  "kind": "function",
  "what_it_is_for": "Annual employee 401(k) limit for the user's age (adds the 50+ catch-up).",
  "formula_in_words": "2026: $24,500. At age 50 or over, + $8,000. Ages 60 to 63 get + $11,250 INSTEAD of the $8,000. So $32,500 at ages 50 to 59 and from 64 on, and $35,750 at 60 to 63. With no age: $24,500.",
  "handed": "export function annual401kLimit(age: number | null): number"
 },
 {
  "id": "MK-CF-F-054",
  "name": "annualIraLimit",
  "kind": "function",
  "what_it_is_for": "How much a person may put into an IRA this year: the standard limit, plus the catch-up amount from age 50.",
  "formula_in_words": "2026: $7,500; + $1,100 at age 50 or over. With no age: $7,500.",
  "handed": "export function annualIraLimit(age: number | null): number",
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
   }
  ]
 },
 {
  "id": "MK-CF-F-056",
  "name": "k401Headroom",
  "kind": "function",
  "what_it_is_for": "How much more you can still put into your 401(k) this year (incl.",
  "formula_in_words": "Limit = annual401kLimit. Used = the year's contribution (below zero counts 0), never more than the limit. Room = limit − the contribution, never below 0. Catch-up flag at 50 or over.",
  "handed": "export function k401Headroom(age: number | null, annual401kContribution: number): Headroom",
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
   }
  ]
 },
 {
  "id": "MK-CF-F-057",
  "name": "rothVsTraditional",
  "kind": "function",
  "what_it_is_for": "Roth vs Traditional lean from current vs expected-retirement marginal rate (decimals).",
  "formula_in_words": "Top tax band now at 12% or under: lean Roth. Band now at 24% or over AND the band expected in retirement lower than now: lean Traditional. Anything else: either.",
  "handed": "export function rothVsTraditional(marginalNow: number, marginalRetire: number): { lean: 'roth' | 'traditional' | 'either'; why: string }"
 }
]
```

## Formulas these cards lean on

15 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-CF-F-023",
  "name": "requiredPayment",
  "what_it_is_for": "The payment reserved/required each month for a debt (planned payment, else the minimum).",
  "formula_in_words": "0 for a debt due in full. Otherwise the larger of the minimum monthly payment and the payment the person says they make."
 },
 {
  "id": "MK-CF-F-024",
  "name": "totalDebtMonthly",
  "what_it_is_for": "Total monthly debt obligation across all debts (override-aware).",
  "formula_in_words": "requiredPayment added over the debts."
 },
 {
  "id": "MK-CF-F-025",
  "name": "minimumDebtService",
  "what_it_is_for": "The minimum payments every debt requires in a month, added up, leaving out any debt due in one lump on a date.",
  "formula_in_words": "Each debt's minimum monthly payment added; a debt due in full counts 0."
 },
 {
  "id": "MK-CF-F-026",
  "name": "actualDebtPayment",
  "what_it_is_for": "Σ ACTUAL payments (override ≥ minimum) — what actually leaves your account.",
  "formula_in_words": "The same as totalDebtMonthly: requiredPayment added over the debts."
 },
 {
  "id": "MK-CF-F-044",
  "name": "annualNet",
  "what_it_is_for": "Annual NET contribution of a source: jobs use gross; rentals net out operating expenses.",
  "formula_in_words": "The amount each period — for rent, rent less running costs each period — × the periods in a year: weekly 52, every two weeks 26, monthly 12, quarterly 4, yearly 1, one-off 1."
 },
 {
  "id": "MK-CF-F-045",
  "name": "grossAnnualBaseline",
  "what_it_is_for": "Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized.",
  "formula_in_words": "annualNet added over every source."
 },
 {
  "id": "MK-CF-F-046",
  "name": "employerMatchAnnual",
  "what_it_is_for": "The employer's 401(k) match for a year, added up across every job.",
  "formula_in_words": "Each source's employer match each period × its periods in a year, added."
 },
 {
  "id": "MK-CF-F-048",
  "name": "effectiveTaxRate",
  "what_it_is_for": "The share of gross income that goes to tax: the person's own rate where they gave one, otherwise the calculated federal rate for the way they file.",
  "formula_in_words": "With the person's own rate switched on: that rate, held between 0 and 1. Otherwise federal income tax on the yearly gross ÷ the yearly gross, by filing status (single when none), with no state tax (effectiveRateOnGrossFor)."
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
  "id": "MK-CF-F-102",
  "name": "effectiveRateOnGrossFor",
  "what_it_is_for": "What share of my income actually goes in tax?",
  "formula_in_words": "taxOwedFor ÷ gross; 0 when the gross is zero or less."
 },
 {
  "id": "MK-CF-F-126",
  "name": "futureValue",
  "what_it_is_for": "Future value of a monthly contribution earning `rate`, contributed at the end of each month.",
  "formula_in_words": "0 when the months or the monthly amount are zero or less. Otherwise monthly amount × ((1 + yearly rate ÷ 12) to the power months − 1) ÷ (yearly rate ÷ 12)."
 },
 {
  "id": "MK-CF-F-161",
  "name": "monthlyGrossOfSource",
  "what_it_is_for": "The gross amount one income source brings in each of the twelve months, with rent taken after its running costs and lump payments placed in the months they arrive.",
  "formula_in_words": "Twelve calendar months; rent is taken after running costs. Monthly: the amount every month. Weekly: amount × 52 ÷ 12 every month. Every two weeks: amount × 26 ÷ 12 every month. Quarterly: the amount in March, June, September and December. Yearly: the amount in its month (December when none) — or split across its months by their shares. One-off: the amount in its month (January when none)."
 },
 {
  "id": "MK-CF-F-187",
  "name": "seniorDeductionFor",
  "what_it_is_for": "How much of the $6,000-per-person senior deduction does this return get?",
  "formula_in_words": "0 outside tax years 2025 to 2028; when filing separately; when nobody is 65 or over; or when the income is not known. Otherwise $6,000 × the people 65 or over (2 at most), less 6% of the income above $75,000 (single, head of household) or $150,000 (married); never below 0."
 }
]
```
