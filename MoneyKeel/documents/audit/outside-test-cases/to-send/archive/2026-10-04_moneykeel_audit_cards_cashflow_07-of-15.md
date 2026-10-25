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

# The cards — batch "cashflow 07"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "cashflow 07"` in your reply.

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
export interface AccountIncome {
  annual: number;
  lines: AccountIncomeLine[];
  covers: string;       // what is in the figure, in words
  missing: string | null;   // what we know we cannot see
}

export interface BasePayEntry {
  freq: keyof typeof PAY_PERIODS | string;
  varies: boolean;
  grossTypical: any;                          // per period, as typed
  grossByMonth?: Record<string, any>;         // 'YYYY-MM' → amount, when pay varies
  monthly401k: any;                           // their own contribution, per month
  landsTypical?: any;                         // per period, as typed — OPTIONAL
  landsByMonth?: Record<string, any>;
  hoursPerWeek?: any;
  /** THE BAND IS NOT BASE PAY'S TO WORK OUT. A tax band is set by everything the household is taxed
   *  on together — both wages, the rent kept, the bonus, the dividends — so it is produced ONCE, by
   *  MK-CF-F-084 taxable annual feeding MK-CF-F-090 effective rate, and handed in here. Base pay
   *  reads it. Absent means single, which is what the whole app assumed before the filing-status
   *  question existed, so leaving it out changes no number. Founder ruling 2026-08-27. */
  filingStatus?: FilingStatus;
  over65?: number;
  /** The HOUSEHOLD rate to estimate with, 0–1 of gross — injected by the orchestrator from the one
   *  rate in force. Build 54 let each estimated earner run the federal schedule alone, so each was
   *  granted the FULL joint deduction and the card's own rows disagreed: gross − tax − 401(k)s did
   *  not equal the lands it printed. One rate, applied per earner, makes the identity exact. */
  estRate?: number;
}

export interface BudgetDoc {
  user_id: UserId;
  monthly_spending: number;        // total planned monthly spend
  fixed: number;                   // optional flex buckets
  non_monthly: number;
  flexible: number;
  last_updated?: any;
}

export interface BudgetState {
  user_id: UserId;
  monthly_spending: number;
  net_monthly_income: number;
  projected_to_save: number;       // income − expenses (the monthly surplus)
}

export interface CashflowYear {
  months: MonthFlow[];
  shortMonths: string[];      // months where the running balance dips below 0
  lowestBalance: number;
  totalIn: number;
  totalOut: number;
  beyondWindow: number;       // dated items (scholarships/loans) that fall outside the next 12 months
}

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

export interface ShockResult {
  shock: number;
  cashAfter: number;          // cash left right after the hit
  monthlyEssentials: number;  // what you must keep paying each month
  runwayAfter: number;        // months your remaining cash covers essentials after the hit
  jobLossRunway: number;      // months your cash lasts with NO income (no shock)
  coversIt: boolean;          // cash absorbs the shock without going negative
  recommendedFund: number;    // low end of a 3–6 month emergency fund (3× essentials)
  gapToFund: number;          // how far your cash is from that
}

export interface UpcomingBill {
  id: string;
  label: string;
  amount: number;
  dueDate: string;          // ISO — when the bill is due
  needByDate: string;       // dueDate − buffer (money must be in the account)
  askByDate: string;        // needByDate − lead (when to request the shortfall)
  availableByNeed: number;  // projected cash on the need-by date (after earlier commitments)
  shortfall: number;        // how much more you need for this bill
  coverSource: string;      // who/what covers the gap
  daysAway: number;         // days from now until due
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-173",
  "name": "earnerWages",
  "kind": "function",
  "what_it_is_for": "The wages this household actually has, in the order the screen shows them.",
  "formula_in_words": "Who earns = both: the person's own wage record, plus the spouse's when it has a wage. Who earns = the spouse, and the spouse's record has a wage: the spouse's only. Otherwise the person's own only.",
  "handed": "export function earnerWages(op: OnboardingProfile | null): EarnerWage[]"
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
  "id": "MK-CF-F-179",
  "name": "entryFromWage",
  "kind": "function",
  "what_it_is_for": "Turns a wage as the profile stores it into the form the pay calculations read: how often it is paid, whether it varies, the gross, the 401(k) and the take-home entered.",
  "formula_in_words": "Turns a stored wage record into the pay entry: frequency (monthly when none); varies = the record says month-by-month, or its month table holds any row; typical gross = the base salary; the month table, only when it varies; the monthly 401(k); the typed take-home; hours a week.",
  "handed": "export function entryFromWage(w: Record<string, any> | null | undefined): BasePayEntry",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-043 their own retirement contribution"
  ]
 },
 {
  "id": "MK-CF-F-184",
  "name": "incomeFromAccounts",
  "kind": "function",
  "what_it_is_for": "One line per account that pays something, and the total.",
  "formula_in_words": "For each account, the first that applies. (1) It paid out more than zero over the last year (paidOutByAccount): that amount. (2) A bond: coupon rate × face value when both are above zero; else rate × balance when a rate is entered; else $0, marked as assumed. (3) Cash with a rate above zero: rate × balance. (4) Any other account with a balance above zero is named as not counted; foreign currency is skipped. Yearly income = the rows added.",
  "handed": "export function incomeFromAccounts(\n  accounts: AssetAccount[] | null | undefined,\n  transactions?: any[] | null,\n  now: Date = new Date(),\n): AccountIncome",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-003 institution name",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-CF-F-194",
  "name": "monthOutflow",
  "kind": "function",
  "what_it_is_for": "THE MONTH'S OUTFLOW — expenses plus the debt actually paid — from one place.",
  "formula_in_words": "With a stored record for the month: its expenses + its debt paid. With none: what has been logged so far.",
  "handed": "export function monthOutflow(snap: { spending?: number | null; debt_paid?: number | null } | null | undefined, loggedSoFar: number): number",
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-004",
    "words_on_screen": "each row of the month — what it is and what it costs",
    "unit": "money",
    "what_it_answers": "One line per thing in or out this month, so the surplus can be checked by reading down the column.",
    "when_it_refuses": "A section with nothing in it keeps its heading and says so.",
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
    "about": "MK-CF-M-004",
    "words": "Drawn from the approved design (cash-flow_v01): the flow is SPELLED OUT, not summarised into three numbers."
   }
  ]
 },
 {
  "id": "MK-CF-F-197",
  "name": "ageAttainedInYear",
  "kind": "function",
  "what_it_is_for": "THE AGE THE LIMITS USE — the age a person attains at any time in the calendar year, which is this year minus the birth year.",
  "formula_in_words": "This calendar year − the birth year. Nothing when the birth year is missing or before 1900.",
  "handed": "export function ageAttainedInYear(birthYear: number | null | undefined, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-017 birth year"
  ]
 },
 {
  "id": "MK-CF-F-212",
  "name": "receivedInMonth",
  "kind": "function",
  "what_it_is_for": "RECEIVED THIS MONTH (MK-CF-M-012) — the income records dated inside the month, newest first.",
  "formula_in_words": "The income records whose date begins with the year-month asked for, newest first.",
  "handed": "export function receivedInMonth(incomes: { date?: string; amount?: any }[] | null | undefined, ym: string)",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-001",
  "name": "buildBudgetState",
  "kind": "function",
  "what_it_is_for": "projected_to_save = net monthly income − monthly expenses.",
  "formula_in_words": "Projected to save = monthly take-home − monthly planned expenses (0 when none is stored).",
  "handed": "export function buildBudgetState(uid: UserId, netMonthlyIncome: number, doc: BudgetDoc): BudgetState"
 },
 {
  "id": "MK-CF-F-008",
  "name": "spendByMonth",
  "kind": "function",
  "what_it_is_for": "Expenses placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.",
  "formula_in_words": "Twelve calendar months. Each monthly category adds its monthly amount to every month (a percent category = that percent of the average monthly take-home). Each non-monthly category adds its yearly amount spread evenly over the months it names — over all twelve when it names none (a percent one = percent × average monthly take-home × 12). With no categories: the three typed buckets' total, every month. Then, when the single typed monthly figure is larger than the categories' monthly total, the difference is added to every month.",
  "handed": "export function spendByMonth(op: OnboardingProfile | null): number[]",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-009",
  "name": "monthlyEssentials",
  "kind": "function",
  "what_it_is_for": "Monthly money you MUST keep paying — the recurring (non-monthly excluded) Critical + Important bills.",
  "formula_in_words": "With no categories: the planned monthly expenses (plannedMonthlySpend). With categories: the monthly categories marked as needs — every one except those marked flexible, a category with no mark counting as flexible, and non-monthly ones left out — added up (a percent one = percent of the average monthly take-home), plus the amount by which the typed monthly figure exceeds the categories' total.",
  "handed": "export function monthlyEssentials(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-025 typical monthly essentials",
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-010",
  "name": "emergencyTest",
  "kind": "function",
  "what_it_is_for": "\"What if a $X emergency hit right now?\" — can your cash absorb it, and how long would you last.",
  "formula_in_words": "Essentials = the figure handed in when above zero, otherwise monthlyEssentials. Cash after = cash − the shock. Months of cover after the shock = cash after (never below 0) ÷ essentials. Months of cover with no shock = cash ÷ essentials. Both are 0 when essentials are 0. Covers it when cash after is zero or more. Recommended fund = essentials × 3. Gap = recommended fund − cash, never below 0.",
  "handed": "export function emergencyTest(op: OnboardingProfile | null, cash: number, shock: number, essentialsOverride?: number): ShockResult",
  "inputs_it_reads": [
   "MK-XS-I-025 typical monthly essentials"
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
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0260",
    "date": "2026-09-09",
    "words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen"
   }
  ]
 },
 {
  "id": "MK-CF-F-013",
  "name": "budgetFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Turns the answers about expenses given during setup into the stored budget: the monthly total and its three parts, which are fixed bills, once-in-a-while costs and everyday expenses.",
  "formula_in_words": "The stored budget: monthly expenses = plannedMonthlySpend; fixed, non-monthly and flexible from spendBuckets.",
  "handed": "export function budgetFromOnboarding(uid: UserId, op: OnboardingProfile | null): BudgetDoc"
 },
 {
  "id": "MK-CF-F-018",
  "name": "equityByMonth",
  "kind": "function",
  "what_it_is_for": "Level annual equity spread across the months it vests (0 for most students).",
  "formula_in_words": "Each vesting row's value (equityRowValue) goes to the month in its date — December when it has no date. The year's vesting (rsuAnnual) is then split across the twelve months in proportion to those values. All zero when no row has a value.",
  "handed": "export function equityByMonth(op: Record<string, any>): number[]"
 },
 {
  "id": "MK-CF-F-019",
  "name": "upcomingBills",
  "kind": "function",
  "what_it_is_for": "The dated bills coming due over the next year, each with the day the money must be there, the cash expected by that day and how much short it would be.",
  "formula_in_words": "Bills = each non-monthly budget category, once for every month it names (January when it names none): amount = its yearly amount ÷ the number of months named (a percent one = percent × monthly income after tax × 12), on its due day (the 1st when none), at its next date on or after today. Only bills due from today to the horizon (365 days when none is given) are returned, soonest first. Need-by date = due date − 2 days; ask-by date = need-by − 10 days. Money available by the need-by date = starting balance + steady daily net × the days from today + one-off inflows (yearly scholarships, loans) dated on or before it − other bills dated on or before it. Steady daily net = (steady monthly in − steady monthly out) × 12 ÷ 365. Steady in = the LARGEST month of gross salary, tips, retirement income and net rent ÷ 12, each × (1 − the rate in force), plus support, benefits for the year ÷ 12 and monthly scholarships untaxed. Steady out = fixed + flexible budget + the part of the typed monthly figure above the categories. Shortfall = bill − available, never below 0.",
  "handed": "export function upcomingBills(\n  op: OnboardingProfile | null,\n  startBalance = 0,\n  now: Date = new Date(),\n  opts: { bufferDays?: number; askLeadDays?: number; horizonDays?: number } = {},\n): UpcomingBill[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-040 whether a stream is already being received",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-020",
  "name": "cashflowYear",
  "kind": "function",
  "what_it_is_for": "Build the 12-month cash-flow picture.",
  "formula_in_words": "Twelve months starting with the current one. Taxed income each month = that calendar month's gross salary + tips (only in months with salary) + self-employment + net rent ÷ 12 + interest and dividends ÷ 12 + other income when taxable + that month's stock vesting + retirement income; plus the bonus in its month (December when none is set); a signing bonus in the first month; one-off other income in its month. Untaxed = benefits in their months + support + untaxed other income + scholarships (monthly, or in their months, or ÷ 12 when they name none) + loans in their months (the first month when they name none). Inflow = taxed × (1 − the rate in force) + untaxed. Outflow = the planned expenses for that calendar month (spendByMonth). The balance starts at the starting balance and each month adds inflow − outflow. Short months = those ending below zero. Lowest balance = the smallest month-end. Dated items that fall outside the twelve months are counted, not included.",
  "handed": "export function cashflowYear(op: OnboardingProfile | null, startBalance = 0, now: Date = new Date()): CashflowYear",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-059 the month a bonus lands"
  ]
 }
]
```

## Formulas these cards lean on

11 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-CF-F-002",
  "name": "plannedMonthlySpend",
  "what_it_is_for": "The single canonical \"planned monthly spend\": the itemized buckets OR the stated total, whichever is larger (the stated total can include an uncategorized remainder the buckets don't capture).",
  "formula_in_words": "The larger of two figures: the budget categories added up (spendBuckets), and the single monthly figure the person typed."
 },
 {
  "id": "MK-CF-F-003",
  "name": "categoryMonthly",
  "what_it_is_for": "Canonical per-category planned $/month — the ONE conversion the buckets AND the Budget screen share, so a category's on-screen line item ALWAYS reconciles with its bucket total (build-34 #3).",
  "formula_in_words": "0 when the amount is zero or less. A dollar category: the amount, per month — a once-a-year (non-monthly) category is the yearly amount ÷ 12. A percent category: that percent of the average monthly take-home (pctBaseMonthly) — for a non-monthly one the same, worked as a yearly amount and ÷ 12."
 },
 {
  "id": "MK-CF-F-004",
  "name": "spendBuckets",
  "what_it_is_for": "Roll the per-category expenses up into the three monthly-normalized buckets.",
  "formula_in_words": "With categories: each category's monthly amount (categoryMonthly) is added into fixed, non-monthly or flexible — any other bucket counts as flexible; rows of zero are skipped. With no categories: the three typed bucket totals. Monthly total = the three added."
 },
 {
  "id": "MK-CF-F-062",
  "name": "equityRowValue",
  "what_it_is_for": "Value of one vesting-schedule row.",
  "formula_in_words": "An option: shares × (market price − strike price), never below 0. Any other grant: shares × price."
 },
 {
  "id": "MK-CF-F-066",
  "name": "rsuAnnual",
  "what_it_is_for": "Annual equity-comp run-rate: total scheduled value spread over the years it vests across (a level annual figure for the income estimate).",
  "formula_in_words": "With vesting rows: their total value ÷ the number of different years in which rows with a value vest (at least 1). With none: shares × price, as typed."
 },
 {
  "id": "MK-CF-F-087",
  "name": "monthlyTaxRates",
  "what_it_is_for": "The tax rate for each of the twelve months, as a share: the person's own rate in every month where they gave one, otherwise a calculated rate that is higher in a month with a bonus.",
  "formula_in_words": "Twelve rates. When the rate in force is the person's own (typed, or implied by a typed take-home): that one rate, every month. Otherwise, for each month with taxed income: (the federal tax on the year's running total up to that month − the tax up to the month before, plus state tax on the same slice) ÷ that month's taxed income, held between 0 and 60%. A month with no taxed income gets the flat rate in force."
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
  "formula_in_words": "For each calendar month. Earned before 401(k) = that month's taxed income (taxableByCalendarMonth) + that month's 401(k). Untaxed = support + that month's scholarships + benefits in their months + one-off untaxed income in its month. Gross = earned before 401(k) + untaxed − reinvested interest and dividends. Tax: when the rate is the person's own, (earned before 401(k) − the month's rent and interest and dividends, which are not on a payslip) × the rate; when the app calculates it, that month's taxed income × that month's rate (monthlyTaxRates). After-tax = gross − tax. Take-home = gross − tax − 401(k)."
 },
 {
  "id": "MK-CF-F-120",
  "name": "pctBaseMonthly",
  "what_it_is_for": "A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the expenses-plan screen uses (modules.tsx SpendingEditor → takeHomeMonthly).",
  "formula_in_words": "The twelve months of take-home (incomeMonthlyGrid, take-home) added ÷ 12."
 },
 {
  "id": "MK-CF-F-130",
  "name": "enteredMonthlyRaw",
  "what_it_is_for": "A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly).",
  "formula_in_words": "Hourly: base pay × hours a week (40 when none) × 52 ÷ 12. Otherwise base pay × the periods in a year ÷ 12 (weekly 52, every two weeks 26, monthly 12, yearly 1)."
 },
 {
  "id": "MK-CF-F-183",
  "name": "paidOutByAccount",
  "what_it_is_for": "What each account actually PAID OUT in the last year, by account.",
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date last year), not reinvested, added by account."
 }
]
```
