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

# The cards — batch "cashflow 01"

6 cards, so 6 formula checks and 30 cases. Put `"batch": "cashflow 01"` in your reply.

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
export interface BasePay {
  earners: { name: string; pay: EarnerPay }[];
  grossAnnual: number;            // every wage, added
  landsInBank: number;            // every wage's take-home, added, per month
  bandOnOneWage: number;          // the first earner's wage alone
  bandOnEveryWage: number;        // all of them together — what actually applies
  bandNote: string | null;        // what the difference is worth, in words, or null when there is none
  everyFigureAgrees: boolean;     // no earner's three figures contradict each other
  tax: TaxOnPay;                  // the bracket, the tax in money, and whose rate produced it
  landsEstimated: boolean;        // any earner's take-home is calculated → the total wears ≈
  landsNote: string | null;       // whose figure is entered and whose is calculated, with the dollars
  monthly401k: number;            // every earner's own contribution, added — the card's 401(k)s row
  otherTakenMonthly: number | null;  // MK-CF-M-036 at the household — the SUM of the earners' own
                                  // everythingElseMonthly, never a second subtraction, so the household
                                  // figure and its parts cannot disagree (rule 2). Null when any earner's
                                  // is unknown: it refuses rather than understating. The base-pay card
                                  // used to subtract this on the screen (rule 5).
}

export interface ContributionRoom {
  year: number;
  /** The age the IRS tests — attained in the year, not today's (his ruling G1). */
  age: number | null;
  k401: Room;
  ira: Room;
  hsa: Room;
  /** Months left including this one (his ruling G36), and what filling the 401(k) would cost a month. */
  monthsLeft: number;
  perMonthToFill401k: number;
  /** True when Medicare bars an HSA contribution entirely (his ruling G10). */
  hsaBarredByMedicare: boolean;
}

export interface CreditLine {
  balance: number;
  limit: number;
  /** The share of the line in use, 0…1 — null when no limit is known. */
  used: number | null;
  /** 'good' under 30%, 'caution' to 50%, 'high' above. Null when there is no ratio. */
  status: 'good' | 'caution' | 'high' | null;
}

export interface Expenses {
  recurringDebt: { label: string; monthly: number }[];
  recurringDebtTotal: number;
  planned: { label: string; monthly: number }[];
  plannedTotal: number;
  actual: SpentList;
  /** The same expenses, apart: what was entered by hand, and what a card or a file brought. */
  byHand: SpentList;
  imported: SpentList;
  debtCountedAsExpense: { label: string; amount: number }[];
  actualTotal: number;
  radar: RadarItem[];
}

export interface ExpensesInput {
  ym: string;
  debts: Debt[];
  plannedByCategory: { label: string; monthly: number }[];
  expenses: LoggedExpense[];
  bigBills?: { label: string; amount: number; dueLabel: string }[];   // dated non-debt bills
}

export interface HouseholdPayInput {
  /** One entry per person who earns a wage, in the order the screen shows them. */
  earners: { name: string; entry: BasePayEntry }[];
  filingStatus?: FilingStatus;
  over65?: number;
  /** The stored answers, so the tax row can read the rate in force rather than re-deciding it. */
  profile?: Record<string, any> | null;
}

export interface IncomeSummary {
  /** What reaches the bank, per month — the money that can be spent. */
  lands: { lines: Line[]; usualMonth: number;
    /** The Rent row's own amount — 0 with no rental. Named so another function can ask for the rent
     *  that arrives without finding a row by its label (the emergency fund counts it, 2026-10-04). */
    rentMonthly: number;
    /** The words on the total — his one wording for money arriving: "Inflow (income (take-home) + rent)". */
    totalLabel: string;
    /** The month that stands apart, named in full, with why: "December · with the bonus". */
    standoutMonth: { label: string; note: string; amount: number } | null };
  /** What the year is taxed on — a different number, and said to be one. */
  taxed: {
    lines: Line[];
    grossAnnual: number;
    bracket: number;          // the FEDERAL TAX BRACKET, named
    tax: number;              // the year's tax, at whichever rate is in force
    whose: string;            // 'your rate, 24%' · 'calculated, 9%'
    estimated: boolean;
    /** How the household files, in the words the filing question uses — "Married filing jointly". */
    filing: string;
    /** The sentence under the tax line when the rate is the person's own (income-end-to-end_v07, frame 16). */
    closing: string;
  };
  /** Money that is taxed but never lands — said on the screen so the gap is never a mystery. */
  taxedNotLanded: number;
  /** How many earners have a wage entered — so a screen can say whose income a figure rests on. */
  wages: number;
  ready: boolean;             // false on a fresh account: the screen keeps its shape and shows no $0
}

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

export interface ThisMonth { planned: MonthBlock; actual: MonthBlock; }
```

## The cards

```json
[
 {
  "id": "MK-CF-O-001",
  "name": "basePay",
  "kind": "orchestrator",
  "what_it_is_for": "What does this household's base pay come to: each earner's pay, and the household's gross, tax bracket, tax, 401(k)s and take-home for a month?",
  "formula_in_words": "Runs earnerPay for each earner with the household's filing status (single when none), the number of people 65 or over, and the household's rate in force (rateInForce). Yearly gross = the earners' yearly gross added up. Take-home = their monthly take-homes added up. Tax band = the federal band on ALL the earners' wages together, by filing status; the band on the first earner's wage alone is also worked out, and when there are two or more earners, the two bands differ, and every earner typed a take-home, a note says so. When nobody typed a take-home the card states its own sum in words: gross in a month − tax − 401(k)s = take-home. Tax in a month = yearly gross × the rate in force ÷ 12. Mode: entered when every earner typed a take-home; calculated when none did; mixed otherwise. When the rate in force is the calculated one, short-by = Social Security and Medicare on each earner's yearly gross (payrollTaxWithheld), added up, ÷ 12; nothing otherwise. Every figure agrees only when every earner's check passes (payFiguresAgree). Monthly 401(k) = added up over the earners. Other taken in a month = each earner's everything-else added up; nothing when any earner's take-home is calculated.",
  "handed": "export function basePay(h: HouseholdPayInput): BasePay",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-030",
    "words_on_screen": "Each person’s pay",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What everyone in the household earns before anything is taken out.",
    "when_it_refuses": "Shows $0 until a wage is entered; the screen offers the door to enter one.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-031",
    "words_on_screen": "Take-home",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What actually reaches the bank each month, after federal tax and 401(k) — for one earner, and for the household.",
    "when_it_refuses": "Shows $0 until a wage is entered.",
    "shown_on": [
     "/base-pay",
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-032",
    "words_on_screen": "Federal tax bracket",
    "unit": "percent",
    "what_it_answers": "What the next dollar earned costs in federal income tax.",
    "when_it_refuses": "The row is not shown until a wage is entered.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-033",
    "words_on_screen": "Calculated federal tax",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The federal income tax we calculate on the household’s wages, when nobody has entered their own figure.",
    "when_it_refuses": "The row appears only when the figure is ours; an entered take-home already has tax inside it.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-034",
    "words_on_screen": "Your 401(k)s",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What everyone in the household puts into their own 401(k) each month.",
    "when_it_refuses": "The row is hidden when nobody contributes.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-035",
    "words_on_screen": "The take-home above is higher than it will really be",
    "unit": "money",
    "per": "month",
    "what_it_answers": "By roughly how much the calculated take-home overstates what will reach the bank, because only federal income tax is taken out of it.",
    "when_it_refuses": "The warning appears only when the take-home is ours and estimated.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-036",
    "words_on_screen": "Everything else taken out",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What a payslip takes out beyond the 401(k) — tax, medical cover and anything else bought through work — read back from the figures the person entered.",
    "when_it_refuses": "The row is hidden for anyone whose take-home was calculated rather than entered; the household row is hidden unless every earner entered one.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-045",
    "words_on_screen": "Social Security takes 6.2% of a wage up to",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The wage ceiling above which no more Social Security tax is taken, named in the warning so the 6.2% can be checked.",
    "when_it_refuses": "Never absent — it is a published figure, not a calculation.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-046",
    "words_on_screen": "Medicare 1.45% of everything, 0.9% more above",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The wage above which the extra Medicare tax starts, named in the warning so the 0.9% can be checked.",
    "when_it_refuses": "Never absent — it is a published figure, not a calculation.",
    "shown_on": [
     "/base-pay"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0178",
    "date": "2026-08-27",
    "words": "\"yes\" — DEC-0178, confirmed as written: The tax band is produced ONCE, at total income (MK-CF-F-084 taxable annual → MK-CF-F-090 effective rate). The base-pay s"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0188",
    "date": "2026-08-27",
    "words": "Who earns this income? You / Partner / Both"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0192",
    "date": "2026-08-28",
    "words": "s number was its POSITION in a list — nid() counted up as it walked them — so inserting a row silently renumbered every metric after it in that family. 93 audit findings are keyed to those numbers, as are the founder"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0205",
    "date": "2026-09-01",
    "words": "\"yes\" — DEC-0205, confirmed as written: New src/__tests__/statutory_constants.test.ts: the 2026 bracket tables and deductions, the complete IRS Uniform Lifetime"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0208",
    "date": "2026-09-02",
    "words": "worked out"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0326",
    "date": "2026-08-20",
    "words": "married bands are not double the single ones at the top"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0389",
    "date": "",
    "words": "calculated (your standing order, 2026-09-02)"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0503",
    "date": "2026-06-30",
    "words": "How is income + spending captured, at what frequency, and what about cash / unconnected cards?"
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-030",
    "words": "A wage entered for a rhythm is annualised by that rhythm, never by a flat twelve."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-031",
    "words": "Federal income tax only when it is calculated — no Social Security, Medicare or state tax (MK-CF-D-001)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-032",
    "words": "Filing status is assumed to be jointly when two people earn and nobody has said (MK-CF-D-004)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-033",
    "words": "Assumes the standard deduction, never itemised (MK-CF-D-002)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-034",
    "words": "The employer’s match is not counted here — it is not taken out of take-home (MK-CF-D-003)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-035",
    "words": "State tax is not in this figure, because we do not know their state (MK-CF-D-005)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-036",
    "words": "Shown only when the person entered their own take-home, so the difference is theirs and not ours."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-036",
    "words": "The household figure is the sum of the earners’, so a total and its parts cannot disagree (rule 2)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-045",
    "words": "Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-046",
    "words": "Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4)."
   }
  ],
  "approved_drawing": {
   "drawing": "Income end to end v07, frame 3 (approved 2026-09-02)",
   "household": "Two wages, $138,000 a year together, so $11,500 gross in a month. Calculated federal tax $1,058 in the month. 401(k) contributions $1,200 in the month. No take-home entered by either earner.",
   "drawn": {
    "Take-home, household": 9242
   }
  }
 },
 {
  "id": "MK-CF-O-002",
  "name": "expenses",
  "kind": "orchestrator",
  "what_it_is_for": "What is being spent this month: the debts that repeat every month, the planned expenses by category, what was actually spent by where it came from, and the big-ticket radar?",
  "formula_in_words": "Recurring debt rows (recurringDebtPayments) and their total. Planned rows by category, as handed in, and their total. Actual expenses for the month — all, entered by hand, and imported (actualSpending). The debt payments that count as expenses (debtPaymentsCountedAsExpenses). Actual total = the actual expenses total + those debt payments. And the radar (radar).",
  "handed": "export function expenses(s: ExpensesInput, purchasesCaptured: Set<string> = new Set()): Expenses",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "approved_drawing": {
   "drawing": "Cash flow v01, frame C (approved 2026-09-28)",
   "household": "Mortgage $2,000 and car loan $250, the same every month. Planned expenses: Gas $200, Grocery $900, Utilities $200, Other $700. Spent so far: $500 entered by hand over 9 items, $1,200 imported from a card over 23 purchases. Paid this month and entered on the Debts tab: HELOC $200, credit card $200.",
   "drawn": {
    "Monthly recurring expenses": 2250,
    "Planned expenses": 2000,
    "Actual expenses, all sources": 2100
   }
  }
 },
 {
  "id": "MK-CF-O-003",
  "name": "thisMonth",
  "kind": "orchestrator",
  "what_it_is_for": "How is the month going: what the plan says it holds and what has actually happened so far, each row by row and each ending in its surplus?",
  "formula_in_words": "The planned block (plannedMonthFlow) and the actual block (actualMonthFlow), side by side.",
  "handed": "export function thisMonth(m: MonthInput): ThisMonth",
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-047",
    "words_on_screen": "Expected inflow",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the plan says comes in this month — take-home, and anything else that lands in this particular month.",
    "when_it_refuses": "Shows $0 until income is entered, with the door to enter it.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-048",
    "words_on_screen": "Planned outflow (expenses + debt)",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the plan says goes out this month — the budget, plus the debt payments due, plus any big bill that falls in this month.",
    "when_it_refuses": "Shows $0 until expenses or debts are entered.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-049",
    "words_on_screen": "= Planned surplus",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the plan leaves over this month, before anything has actually happened.",
    "when_it_refuses": "Shows $0 until both sides are entered.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-050",
    "words_on_screen": "each planned line",
    "unit": "money",
    "per": "month",
    "what_it_answers": "Each thing the plan says comes in or goes out this month, named, so the two totals can be checked by hand.",
    "when_it_refuses": "The list is replaced by the door to enter income or expenses when nothing is entered.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-051",
    "words_on_screen": "Inflow",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What has actually come in so far this month, as opposed to what the plan expected.",
    "when_it_refuses": "Shows $0 until something is recorded as received.",
    "shown_on": [
     "/cashflow",
     "/home"
    ]
   },
   {
    "id": "MK-CF-M-052",
    "words_on_screen": "Outflow (expenses + debt)",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What has actually gone out so far this month: the expenses logged, plus the debt payments due in the month.",
    "when_it_refuses": "Shows $0 until an expense is logged or a debt is entered.",
    "shown_on": [
     "/cashflow",
     "/home"
    ]
   },
   {
    "id": "MK-CF-M-053",
    "words_on_screen": "= Surplus",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What is actually left this month so far — not what the plan said, what has happened.",
    "when_it_refuses": "Shows $0 until something is recorded.",
    "shown_on": [
     "/cashflow",
     "/home"
    ]
   },
   {
    "id": "MK-CF-M-054",
    "words_on_screen": "each received line",
    "unit": "money",
    "per": "month",
    "what_it_answers": "Each payment recorded as received this month, named, so the inflow total can be checked by hand.",
    "when_it_refuses": "The list is replaced by the door to record income when nothing is recorded.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0512",
    "date": "2026-06-30",
    "words": "Are the month bars cash flows -- inflow / outflow?"
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-047",
    "words": "A month is a real calendar month, never a twelfth of a year (founder, 2026-08-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-048",
    "words": "A debt payment is counted as an outflow, not as saving (founder, 2026-06-21)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-048",
    "words": "A bill that falls once a year is shown in its own month, never spread."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-051",
    "words": "Nothing is assumed to have arrived; a source counts only once it is recorded (founder, 2026-08-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-052",
    "words": "Debt payments are counted in full for the month, logged or not, because they are committed."
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
  "id": "MK-CF-O-004",
  "name": "incomeSummary",
  "kind": "orchestrator",
  "what_it_is_for": "What is this household's income: what reaches the bank each month, and what the year is taxed on?",
  "formula_in_words": "TAKE-HOME rows — everything that arrives in a usual month; after tax means × (1 − the rate in force, rateInForce): each earner's take-home above zero (from basePay); tips after tax, only when every month has pay; self-employment after tax; rent after running costs — whole when the rate is the person's own, after tax when the app calculates it; interest and dividends paid to the bank, the same way — and when they are reinvested and the rate is calculated, a row of MINUS the tax on them; Social Security and pension after tax; other monthly income after tax, or whole when marked not taxable; benefits paid in all twelve months, support and monthly scholarships, whole. Usual month = the rows added up. Rent arriving in a month = the rent row's own amount, zero with no rental or a rental that loses money; it is handed out by name because the emergency fund counts it. Standout month = the largest of the twelve monthly take-home figures (incomeMonthlyGrid, take-home), shown only when it is more than $1 above the usual month; its note reads with the bonus when a bonus is entered and that is the bonus month (December when no month is set). TAXED rows, each only when above zero: each earner's yearly gross; rent, net, for the year; interest and dividends for the year; the bonus. Yearly taxed total = taxableAnnual. Band = the federal band on that total, by filing status. Tax = that total × the rate in force (rateInForce). Taxed but not received = interest and dividends in a month, unless they are paid to the bank. Ready when there is any salary or any taxed income. It also says how many earners have a wage entered, and marks each pay row as calculated or entered.",
  "handed": "export function incomeSummary(op: Record<string, any> | null): IncomeSummary",
  "inputs_it_reads": [
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-030 tax filing status and age",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-006",
    "words_on_screen": "YOUR SOURCES — Base salary",
    "unit": "money",
    "what_it_answers": "Each earner’s base pay, as it was entered, with whether it was entered before tax or as take-home.",
    "when_it_refuses": "No salary entered — the row does not appear; the door to enter it does.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-007",
    "words_on_screen": "YOUR SOURCES — Self-employment",
    "unit": "money",
    "what_it_answers": "Self-employment income, net, in the period it was entered.",
    "when_it_refuses": "None entered — the row does not appear.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-008",
    "words_on_screen": "YOUR SOURCES — Bonus",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The bonus for the year and the month it lands.",
    "when_it_refuses": "None entered — the row does not appear.",
    "shown_on": [
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-009",
    "words_on_screen": "YOUR SOURCES — Stock vesting (equity)",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What vests in a year, valued at the price entered.",
    "when_it_refuses": "No equity entered — the row does not appear.",
    "shown_on": [
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-010",
    "words_on_screen": "YOUR SOURCES — Rental property",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the rental brings in each month after its running costs.",
    "when_it_refuses": "No rental entered — the row does not appear.",
    "shown_on": [
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-011",
    "words_on_screen": "YOUR SOURCES — Social Security · pension",
    "unit": "money",
    "per": "month",
    "what_it_answers": "Guaranteed income being received now — Social Security, pension, annuity and other — in a month.",
    "when_it_refuses": "None being received — the row does not appear.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-024",
    "words_on_screen": "each source of guaranteed income",
    "unit": "money",
    "per": "month",
    "what_it_answers": "One line per guaranteed source — Social Security, a pension, an annuity, other — and what it pays a month.",
    "when_it_refuses": "Nothing entered — the list is replaced by the door to enter it.",
    "shown_on": [
     "/monthly-income"
    ]
   },
   {
    "id": "MK-CF-M-027",
    "words_on_screen": "each income source and its amount",
    "unit": "money",
    "what_it_answers": "Every source of income that has been entered, one line each, in the period it is counted in — a month or a year, said beside it.",
    "when_it_refuses": "Nothing entered — the list is replaced by the door to enter income.",
    "shown_on": [
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-037",
    "words_on_screen": "Take-home each month",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What reaches the bank in a usual month, from every source of income added together.",
    "when_it_refuses": "Shows $0 on a fresh account, with the door to enter income — never a dash.",
    "shown_on": [
     "/income-summary",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-038",
    "words_on_screen": "each source of take-home",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What each source of income puts into the bank in a usual month, named and listed.",
    "when_it_refuses": "The list is replaced by the door to enter income when nothing is entered.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-039",
    "words_on_screen": "its own month, never spread",
    "unit": "money",
    "what_it_answers": "A source that arrives in one month of the year, shown in that month rather than divided by twelve.",
    "when_it_refuses": "The line is hidden when no source behaves this way.",
    "shown_on": [
     "/income-summary",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-040",
    "words_on_screen": "is not here — it is reinvested where it is earned",
    "unit": "money",
    "per": "month",
    "what_it_answers": "Income that is taxed but never reaches the bank, so the two totals on this screen can be told apart.",
    "when_it_refuses": "The sentence is hidden when there is none.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-041",
    "words_on_screen": "What it is taxed on",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The whole year of income the tax is calculated on — a different number from the take-home, and said to be one.",
    "when_it_refuses": "Shows $0 on a fresh account, with the door to enter income.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-042",
    "words_on_screen": "each taxed source",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What each source contributes to the year the tax is calculated on.",
    "when_it_refuses": "The list is replaced by the door to enter income when nothing is entered.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-043",
    "words_on_screen": "Federal tax bracket",
    "unit": "percent",
    "what_it_answers": "What the next dollar costs in federal income tax, with every source counted, not wages alone.",
    "when_it_refuses": "The row is not shown until income is entered.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-044",
    "words_on_screen": "Calculated federal tax",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The federal income tax for the year, at whichever rate is in force — theirs if they entered one, ours if not.",
    "when_it_refuses": "The row is not shown until income is entered.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-066",
    "words_on_screen": "Dividends, interest & coupons",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What your holdings and bonds paid out over the last twelve months, from the records.",
    "when_it_refuses": "No record of any — $0, never an estimate.",
    "shown_on": [
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-069",
    "words_on_screen": "Your guaranteed income",
    "unit": "money",
    "per": "month",
    "what_it_answers": "All the guaranteed income being received now, added up for a month.",
    "when_it_refuses": "Nothing entered — $0, with the door to enter it.",
    "shown_on": [
     "/monthly-income"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0108",
    "date": "2026-08-11",
    "words": "Update master PRD document. Go to master list of what"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0165",
    "date": "2026-08-14",
    "words": "how to avoid this in the next brief?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0166",
    "date": "2026-08-14",
    "words": "not sure what you want me to check here."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0178",
    "date": "2026-08-27",
    "words": "\"yes\" — DEC-0178, confirmed as written: The tax band is produced ONCE, at total income (MK-CF-F-084 taxable annual → MK-CF-F-090 effective rate). The base-pay s"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0181",
    "date": "2026-08-27",
    "words": "fix it completely. No two functions doing same thing."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0182",
    "date": "2026-08-27",
    "words": "for orchestrator use O instead of F to make it easy to identify."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0188",
    "date": "2026-08-27",
    "words": "Who earns this income? You / Partner / Both"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0191",
    "date": "2026-08-28",
    "words": "your tax band, on everything you are taxed on"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0208",
    "date": "2026-09-02",
    "words": "worked out"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0347",
    "date": "2026-09-13",
    "words": "shared dependent functions are allowed and are recorded on every orchestrator row whose closure holds them; the closure is generated from the code, never typed"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0389",
    "date": "",
    "words": "calculated (your standing order, 2026-09-02)"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0431",
    "date": "",
    "words": "Nothing entered yet."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-006",
    "words": "NEVER CONVERTED SILENTLY: the amount is shown in the period it was entered, and the period is said beside it."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-008",
    "words": "A LUMP THAT LANDS ONCE IS NEVER AVERAGED across the year (founder, 2026-08-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-037",
    "words": "A once-a-year source keeps its own month and is shown separately, never averaged in."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-039",
    "words": "A lump that lands once is never averaged across the year (founder, 2026-08-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-044",
    "words": "When it is ours it assumes the standard deduction and is federal only (MK-CF-D-002)."
   }
  ],
  "approved_drawing": {
   "drawing": "Income end to end v07, frame 16 (approved 2026-09-02)",
   "household": "Earner 1 entered a take-home of $5,000 in a month; gross $84,000 a year. Earner 2 entered $3,300; gross $54,000 a year. Rent $1,800 a month with $600 of running costs. Interest and dividends $3,000 a year, left where they are earned. Bonus $12,000, paid in December.",
   "drawn": {
    "Take-home in a usual month": 9500,
    "What the year is taxed on": 167400
   }
  }
 },
 {
  "id": "MK-CF-O-005",
  "name": "theContributionRoom",
  "kind": "orchestrator",
  "what_it_is_for": "How much room is left in my 401(k), IRA and HSA this year, and what would fill it?",
  "formula_in_words": "Age = this calendar year − birth year; nothing with no birth year. 401(k): limit by age (annual401kLimit); used = monthly 401(k) × 12, never more than the limit; room = limit − used, never below 0. IRA: limit by age (annualIraLimit); used = monthly Roth IRA × 12, never more than the limit; room = limit − used. HSA: the self-only limit by age (annualHsaLimit), 0 when enrolled in Medicare; used = monthly HSA × 12, never more than the limit; room = limit − used. Catch-up flags: 401(k) and IRA at 50 or over; HSA at 55 or over. Months left = 12 − the months already finished this year (January 12, December 1). Per month to fill the 401(k) = room ÷ months left, to the nearest $100.",
  "handed": "export function theContributionRoom(input: {\n  profile: any;\n  /** THE DAY IT IS READ ON. Absent means today, which is what the app passes. A worked example passes\n   *  a fixed day, because \"how much is left to put in this year\" depends on the month — and an example\n   *  whose answer changes when the calendar turns is an example that cannot be checked. This one broke\n   *  on 2026-10-01 for exactly that reason: it said $5,300/month in September and $7,100 in October. */\n  today?: Date;\n}): ContributionRoom",
  "inputs_it_reads": [
   "MK-XS-I-017 birth year",
   "MK-XS-I-043 their own retirement contribution"
  ],
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
 },
 {
  "id": "MK-CF-O-006",
  "name": "theCreditLine",
  "kind": "orchestrator",
  "what_it_is_for": "How much of my credit limit am I using?",
  "formula_in_words": "With no limit, or a limit of zero or less: no share used and no status. Otherwise share used = balance ÷ limit, rounded to three decimals; status good at 30% or under, caution above 30% up to 50%, high above 50%.",
  "handed": "export function theCreditLine(input: { balance: number; limit: number }): CreditLine",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-006",
    "words_on_screen": "$X of $Y used — the line marks 30%",
    "unit": "money",
    "what_it_answers": "How much of your available credit you are using.",
    "when_it_refuses": "No limit entered — there is no ratio, and a 0% would read as \"you have used none of it\".",
    "shown_on": [
     "/credit"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-006",
    "words": "Under 30% is the mark the line shows, because that is the level credit scoring treats as unstretched."
   }
  ]
 }
]
```

## Formulas these cards lean on

24 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-CF-F-005",
  "name": "actualMonthFlow",
  "what_it_is_for": "WHAT HAS ACTUALLY HAPPENED: what landed, less only the debts confirmed paid, less what was really spent.",
  "formula_in_words": "Rows, in this order. Actual inflow = the monthly take-home handed in. One row for each debt with a required payment above zero: minus what was logged as paid against it this month (0 when nothing was), marked paid or not. Other debt payments = debt payments logged this month that match no debt on record, when above zero. Expenses entered by hand = minus the month's logged expenses that were not imported, debt payments left out. Expenses imported from your card = minus the imported ones, shown only when there are any. Debts on the big-ticket radar (cards, lines of credit, debts due in full) are moved to the end. Surplus = every row added up."
 },
 {
  "id": "MK-CF-F-023",
  "name": "requiredPayment",
  "what_it_is_for": "The payment reserved/required each month for a debt (planned payment, else the minimum).",
  "formula_in_words": "0 for a debt due in full. Otherwise the larger of the minimum monthly payment and the payment the person says they make."
 },
 {
  "id": "MK-CF-F-053",
  "name": "annual401kLimit",
  "what_it_is_for": "Annual employee 401(k) limit for the user's age (adds the 50+ catch-up).",
  "formula_in_words": "2026: $24,500. At age 50 or over, + $8,000. Ages 60 to 63 get + $11,250 INSTEAD of the $8,000. So $32,500 at ages 50 to 59 and from 64 on, and $35,750 at 60 to 63. With no age: $24,500."
 },
 {
  "id": "MK-CF-F-054",
  "name": "annualIraLimit",
  "what_it_is_for": "How much a person may put into an IRA this year: the standard limit, plus the catch-up amount from age 50.",
  "formula_in_words": "2026: $7,500; + $1,100 at age 50 or over. With no age: $7,500."
 },
 {
  "id": "MK-CF-F-055",
  "name": "annualHsaLimit",
  "what_it_is_for": "How much can this person put into a health savings account this year?",
  "formula_in_words": "0 when enrolled in Medicare. Otherwise, 2026: $4,400 for self-only cover or $8,750 for family cover; + $1,000 at age 55 or over."
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
  "id": "MK-CF-F-128",
  "name": "grossByMonth",
  "what_it_is_for": "GROSS pay for each month the table covers, or twelve identical months when pay is steady.",
  "formula_in_words": "When the pay varies and a month-by-month table has been filled: the table, one row a month, in month order. Otherwise one row, called typical = the typical gross pay turned into a month (perMonth)."
 },
 {
  "id": "MK-CF-F-141",
  "name": "perMonth",
  "what_it_is_for": "One period of pay expressed as a month.",
  "formula_in_words": "Hourly: amount × hours a week (40 when none is entered) × 52 ÷ 12. Any other frequency: amount × pay periods in a year ÷ 12."
 },
 {
  "id": "MK-CF-F-143",
  "name": "annualisedGross",
  "what_it_is_for": "GROSS PAY ANNUALISED — the figure a tax bracket is read from.",
  "formula_in_words": "The average of the monthly gross rows (grossByMonth) × 12. 0 when there are no rows."
 },
 {
  "id": "MK-CF-F-144",
  "name": "takeHomeAsEntered",
  "what_it_is_for": "A person's monthly take-home exactly as they entered it, averaged over their month-by-month table when their pay varies, or a calculated figure marked as calculated when they entered none.",
  "formula_in_words": "In this order. (1) The pay varies and a month-by-month take-home table is filled: the average of its months; not calculated. (2) A take-home above zero was typed: that amount exactly as typed — it is asked for as a MONTH, whatever the pay frequency; not calculated. (3) Otherwise it is calculated, and marked so. With a household rate supplied: (yearly gross × (1 − rate) − monthly 401(k) × 12) ÷ 12. With none: (yearly gross − 401(k) for the year − federal income tax on the yearly gross less the 401(k), by the filing status given — single when none) ÷ 12. That federal tax has no state tax in it."
 },
 {
  "id": "MK-CF-F-146",
  "name": "payFiguresAgree",
  "what_it_is_for": "Checks month by month that gross pay, less the 401(k), is enough to leave the take-home the person entered, and says in words when it is not or when an unusually large share goes elsewhere.",
  "formula_in_words": "It passes with no check when the take-home is calculated. Otherwise, for each month of gross pay in order: left = gross − monthly 401(k) − the take-home for that month (the month's own figure when a take-home table is filled, otherwise the typed take-home, which is a monthly figure at every pay frequency). When left is below −$5: it FAILS, with a sentence naming the month and how much more the take-home is than there is. Otherwise, when gross is above zero and left ÷ gross is above 60%: it passes WITH A WARNING that gives that share as a whole percent. The first month to fail or warn decides. Exactly $5 short still passes; exactly 60% does not warn."
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
  "id": "MK-CF-F-171",
  "name": "earnerPay",
  "what_it_is_for": "One earner's pay: gross for a month and for a year, their 401(k), their take-home and whether it was entered or calculated, and everything else taken out.",
  "formula_in_words": "One earner's pay figures together: gross in a month = yearly gross ÷ 12; yearly gross (annualisedGross); the monthly 401(k); the take-home, whether it is calculated and why (takeHomeAsEntered); everything else taken out, for the year and ÷ 12 for the month — nothing when the take-home is calculated; the verdict (payFiguresAgree); and the monthly gross rows."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income."
 },
 {
  "id": "MK-CF-F-198",
  "name": "payrollTaxWithheld",
  "what_it_is_for": "Social Security and Medicare tax on a year's wages: 6.2% up to the wage cap, 1.45% of all of it, and 0.9% more above the higher-earner threshold.",
  "formula_in_words": "On a year's wages (below zero counts as 0): 6.2% of the wages up to $184,500, plus 1.45% of all the wages, plus 0.9% of the wages above $200,000."
 }
]
```
