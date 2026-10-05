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

# The cards — batch "changed since sent 05"

3 cards, so 3 formula checks and 15 cases. Put `"batch": "changed since sent 05"` in your reply.

These functions were corrected after their cards first went out. The formula below is the one in the app now; judge and test it as you would any other.

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
export interface BudgetCounted {
  /** The profile to hand to every planned-expenses figure: the person's own, with the Rent /
   *  Mortgage line at nothing when the home's mortgage is counted from Debts. */
  profile: any;
  /** Set when that line is not counted: what was budgeted on it, and the mortgage that stands for it. */
  rentLineInDebts: { budgeted: number; mortgage: string } | null;
  /** The sentence a screen shows when the line is not counted. Empty when it is. */
  sentence: string;
  /** The name of the mortgage on the home lived in, when Debts holds one. Null for a renter, and for
   *  a home with no mortgage. */
  homeMortgage: string | null;
}

export interface EmergencyFund {
  /** The money that could actually be spent this month. */
  cash: number;
  /** What you must keep paying on your debts each month — the minimums. You cannot stop paying a car
   *  loan or a card because your income stopped, so this belongs in BOTH figures below. */
  debtMinimums: number;
  /** The whole month, at the life you plan to live: everything you budget, plus the debt minimums. */
  plannedSpendMonthly: number;
  /** The same, cut back to what you could not stop: essentials plus the debt minimums. */
  monthsCoveredAtPlannedSpend: number | null;
  /** What a month of essentials costs — ONE figure, on all three screens. */
  essentialsMonthly: number;
  /** Where that figure came from, in the words the screen shows ("4 month average"). */
  essentialsBasis: string;
  /** RENT FROM A PROPERTY, a month — the Income summary's own Rent row, so the two screens can never
   *  show two figures for it. It keeps arriving when pay stops (founder, 2026-10-04), so each month
   *  it is added to the cash before the month is paid for. 0 with no rental. */
  rentalIncomeMonthly: number;
  /** What the cash itself must find each month: essentials less that rent, never below zero. */
  fromCashMonthly: number;
  /** True when the rent alone pays for the month, so the cash is not drawn on and no count of
   *  months exists to state. */
  rentCoversEssentials: boolean;
  /** How many months the cash covers. Null when there is no essentials figure to divide by, and
   *  null when the rent covers the month by itself. */
  monthsCovered: number | null;
  /** What a target of N months costs, and how far off it is. */
  targetFor: (months: number) => { target: number; gap: number } | null;
  /** A sudden hit: what is left, and how long that would then last. */
  afterAShock: (shock: number) => { cashAfter: number; monthsAfter: number | null; coversIt: boolean };
  /** Set when the Rent / Mortgage budget line is NOT counted, because the home's mortgage is in Debts
   *  and is counted from there (his rule, 2026-10-04, DEC-1923). It replaces the old comparison of the
   *  budget line with the mortgage (DEC-0441, "use the budget"): Debts wins now, so there is nothing to
   *  reconcile — only something to say. Null for a renter and for a home with no mortgage. */
  rentLineInDebts: { budgeted: number; mortgage: string } | null;
  /** The sentence the screen shows when that line is not counted. Empty when it is. */
  budgetSentence: string;
}

export type PropertyUse = 'home' | 'rental' | 'second';
```

## The cards

```json
[
 {
  "id": "MK-NW-O-004",
  "name": "theEmergencyFund",
  "kind": "orchestrator",
  "what_it_is_for": "How many months of essential expenses would my cash cover?",
  "formula_in_words": "Cash = all cash (cashTotal), or the amount handed in when one is given. Owner rule, 2026-10-04: \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" Debt minimums = the MINIMUM monthly payment of every debt added up — the home's mortgage included; a balance due in one lump has none. A payment a person chooses to make above the minimum is not counted: it can be stopped. The budget is read as it is counted (theBudgetCounted): where the home's mortgage is in Debts, the Rent / Mortgage budget line is counted as nothing, and the screen is given a sentence saying so. Essentials for a month = essential expenses + debt minimums. Essential expenses = the average of what was logged, over the calendar months of the last twelve that have a logged entry (this month alone when only it has one); the typed plan only when nothing is logged. Left out of that average, so nothing is counted twice: a payment logged against a debt that is entered (an expense in the category Debt payment, named for that debt), and, where the home's mortgage is in Debts, anything logged under Rent / Mortgage. Rent that keeps arriving = the Rent row of the Income summary (rent from a property less what it costs to run, less calculated tax when the tax rate is calculated), never below zero; owner, 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\" It arrives every month, so it is added to the cash every month. From cash each month = essentials − that rent, never below zero. Months covered = cash ÷ from cash each month; no figure when essentials are zero, and no figure when the rent pays for the whole month (the cash is then not drawn on, and it says so). Planned = planned monthly expenses + debt minimums; months covered at the planned level = cash ÷ (planned − that rent); no figure when that is zero or less. Target for N months = from cash each month × N; gap = target − cash, never below zero. Months left after a shock = (cash − the shock, never below zero) ÷ from cash each month. When a typed month of essentials is handed in, it stands in for essentials + debt minimums. A target, and the months left after a shock, are given only when there is an essentials figure.",
  "handed": "export function theEmergencyFund(input: {\n  accounts: AssetAccount[];\n  expenses: any[];\n  profile: any;\n  /** The debts, so their minimums are counted. Missing means none entered, not none owed. */\n  debts?: Debt[];\n  /** Stress test lets a person TRY a cash figure of their own. It is seeded from their real cash and\n   *  editable, so the door takes what they typed and answers about that — the arithmetic is the same\n   *  question, asked of a number they chose. Absent, the answer is about the cash they actually have. */\n  cashOverride?: number;\n  /** Job safety lets a person TYPE what a typical month of essentials comes to. Given, it stands in\n   *  for the whole month — exactly as it did when that screen multiplied it out for itself. */\n  essentialsOverride?: number;\n}): EmergencyFund",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-025 typical monthly essentials",
   "MK-XS-I-028 assumed return"
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
   },
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
   },
   {
    "id": "MK-NW-M-046",
    "words_on_screen": "at your planned spend",
    "unit": "months",
    "what_it_answers": "How many months your cash would cover if you carried on living exactly as you plan to.",
    "when_it_refuses": "No expense figure yet — it shows nothing rather than dividing by nothing.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-047",
    "words_on_screen": "Both include $X/month of debt payments you cannot stop",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What your debts require of you each month, which neither runway can leave out.",
    "when_it_refuses": "No debts entered — the line does not appear at all.",
    "shown_on": [
     "/analytics",
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-048",
    "words_on_screen": "cash ÷ planned spend",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What a month costs at the life you plan to live, including what your debts require.",
    "when_it_refuses": "No expense figure yet.",
    "shown_on": [
     "/analytics",
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-064",
    "words_on_screen": "rent from your property, which keeps arriving",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The rent that would still arrive each month if your pay stopped.",
    "when_it_refuses": "No rental entered — the line does not appear at all.",
    "shown_on": [
     "/analytics",
     "/insights",
     "/stress-test",
     "/jobsafety"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0103",
    "date": "2026-08-11",
    "words": "Uncertain — retire at 65 with ~$1,607,000, lasting past 90 with ~$2,402,000 to spare — what does uncertain mean?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0158",
    "date": "2026-08-14",
    "words": "It is too harsh."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0260",
    "date": "2026-09-09",
    "words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen"
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-021",
    "words": "The label names the basis so nobody has to guess whether it is one month or a year (his ruling G21)."
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
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-046",
    "words": "FOUNDER 2026-09-28: \"give both numbers.\" The figure above it is what you could not stop paying; this one is the life you plan to live. Neither is the whole truth alone, so the screen shows both."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-047",
    "words": "FOUNDER 2026-09-28: \"What about credit card debt, HELOC, car loan?\" They were in NEITHER figure. You can skip dinner out; you cannot skip a car payment."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-047",
    "words": "FOUNDER 2026-10-04 (DEC-1923): \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" So the home’s mortgage is counted here from Debts, and the Rent / Mortgage budget line stands down — the home is in the figure once."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-047",
    "words": "IT IS THE MINIMUM: a payment a person chooses to make above it can be stopped."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-064",
    "words": "FOUNDER 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\""
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-064",
    "words": "It is the same figure as the Income summary's Rent row, read from that function, so the two screens cannot show two rents."
   }
  ]
 },
 {
  "id": "MK-NW-F-107",
  "name": "propertyUses",
  "kind": "function",
  "what_it_is_for": "What each property is used for: the home lived in, a rental, or a second or vacation home.",
  "formula_in_words": "For each property (an account whose class is real estate): what it is used for. Owner rule, 2026-10-04: \"unless rental income is added on the income screen, assume property is second or vacation home.\" RENTAL = a rent entry on the Income screen (one with rent or running costs typed) names this property. HOME = the one property the person marked as the home they live in, when it is not a rental. SECOND = every other property: a second or vacation home. Two things stored before the rule are read only where there is one answer: with no property marked as the home (and none marked as anything else), the property entered first is the home; and a rent entry that names no property makes the one property that is not the home a rental, when there is exactly one such property.",
  "handed": "export function propertyUses(accounts: AssetAccount[], rentals: { income?: any; expenses?: any; property_id?: any }[] | null | undefined): Map<string, PropertyUse>",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-CF-O-020",
  "name": "theBudgetCounted",
  "kind": "orchestrator",
  "what_it_is_for": "Which of my planned expenses are counted, now that my debts are taken from Debts?",
  "formula_in_words": "Owner rule, 2026-10-04: \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" The home = the property read as HOME (propertyUses). Its mortgage = the mortgage matched to that property (mortgagesByProperty). When the home has a mortgage in Debts AND the budget's Rent / Mortgage line holds an amount: that line is counted as nothing, the one typed monthly total (when there is one) is lowered by the same amount, never below zero, and the sentence says the line is not counted and names the mortgage. Otherwise — a renter, a home with no mortgage, a mortgage on another property, or no amount on the line — the budget is counted exactly as typed. It also names the home's mortgage when there is one. What the person typed is never changed; this is the budget as it is counted.",
  "handed": "export function theBudgetCounted(input: { profile: any; accounts: AssetAccount[]; debts: Debt[] }): BudgetCounted",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up"
  ]
 }
]
```

## Formulas these cards lean on

3 functions named by the formulas above. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-NW-F-016",
  "name": "cashTotal",
  "what_it_is_for": "All the cash a person has: every bank account, plus the uninvested cash sitting inside investment accounts.",
  "formula_in_words": "For a linked account: the cash part of its class breakdown (accountClassBreakdown). For any other account: its whole balance when its class is cash, otherwise nothing. Added up over every account."
 },
 {
  "id": "MK-NW-F-027",
  "name": "accountClassBreakdown",
  "what_it_is_for": "APPROVED v6 (2026-07-19): a CONNECTED account splits across the asset classes it actually holds — CDs under bonds, money market + sleeve under cash, options under alternatives, stocks under stocks — with the slices summing EXACTLY to the broker's authoritative balance.",
  "formula_in_words": "Only for a linked account; any other gets no answer. Cash = its cash balance. Each holding's value = shares × last price (0 with no price), filed under the class its name is evidence for unless that is cash, otherwise under its own class: bond → Bonds & CDs, other → Alternatives, cash → cash, anything else → Stocks / Funds. Options go to Alternatives. If the parts do not add up to the balance: a gap no bigger than the larger of $1 or 1% of the balance is added to cash when positive, or taken off the largest class when negative; a bigger gap is put under the account's own class."
 },
 {
  "id": "MK-NW-F-106",
  "name": "mortgagesByProperty",
  "what_it_is_for": "Which mortgage is on which property, and which mortgages are on none.",
  "formula_in_words": "Properties = the accounts whose class is real estate. Mortgages = the debts whose type is mortgage. Owner rule, 2026-10-04: \"It is feasible to have property without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less mortgage.\" A mortgage is on the property it names, when that property exists and has no mortgage placed on it yet. A mortgage that names no property is placed only where there is one answer: first, on the one property without a mortgage whose name its own name begins with; then, when exactly one property is still without a mortgage and exactly one mortgage is still without a property, on that property. Every other mortgage is listed as on no property — including a second mortgage that names a property already taken. It gives: the count of properties and of mortgages; for each property its mortgage (or none) and that mortgage's required monthly payment; the mortgages on no property; whether there are none of those; and the sentence to show when there are."
 }
]
```
