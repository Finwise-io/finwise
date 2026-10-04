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

# The cards — batch "networth 01"

6 cards, so 6 formula checks and 30 cases. Put `"batch": "networth 01"` in your reply.

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
export interface AlternativesOutlook {
  /** How many alternatives are held. */
  count: number;
  /** The blended yearly rate — each holding's benchmark, weighted by what it is worth. */
  expectedReturn: number | null;   // null = nothing held, so no figure (MK-NW-M-051)
  /** That rate in money, over a year. Null when nothing is held: zero would read as a forecast. */
  estimatedGrowthPerYear: number | null;
  /** The TOTAL the rows add to — the figure above them on the screen. */
  totalValue: number;
  /** ONE ROW PER ALTERNATIVE, from the door rather than built on the screen (2026-10-01).
   *  The screen filtered and summed the accounts itself while asking this door for the rate, which is
   *  how one surface comes to hold two answers. The rows add to `totalValue` by construction. */
  rows: AlternativeRow[];
}

export interface Bonds {
  count: number;
  totalValue: number;
  totalFace: number;
  couponPerYear: number;
  avgYield: number | null;
  /** The soonest maturity date among them, so the screen need not sort for itself. */
  nextMaturity: string | null;
  rows: BondRow[];
  /** Present only when an account was named. */
  one: OneBond | null;
}

export interface BondsInput {
  accounts: AssetAccount[];
  /** The account whose own page is open, when one is. */
  accountId?: string;
  today?: Date;
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
  /** WHEN THE TWO MORTGAGE FIGURES DISAGREE (founder, 2026-09-29: "Yes, ask User to correct, if not
   *  input from user, use the budget."). A mortgage can be entered twice — as the Rent / Mortgage
   *  budget line and as a Mortgage debt — and the door uses the BUDGET figure so the home is not
   *  counted twice. Where the two differ, that choice quietly costs the person the difference: he
   *  budgets $2,300 for a mortgage that takes $2,400 and both runways read $100/month light.
   *
   *  His ruling is that the app SAYS SO and asks them to correct it, and until they answer the budget
   *  figure stands. So nothing in the arithmetic moves; what changes is that the screen can now tell
   *  them. Null when there is no disagreement to report. */
  housingDisagreement: { budgeted: number; owed: number; difference: number } | null;
}

export interface HoldingAnswer {
  ticker: string;
  name: string;
  shares: number;
  /** True once every share is sold — the screen says "Holding liquidated", never a $0 position. */
  closed: boolean;
  /** What was paid for what is still held. */
  totalPaid: number;
  /** Per share, unrounded — rounding happens at display (Q49), not here. */
  avgPaidPerShare: number;
  /** Today's price, or null when none is held. */
  price: number | null;
  /** What it is worth. With no price this is WHAT YOU PAID, and `priced` says so. */
  value: number;
  priced: boolean;
  /** Only when priced: what it has gained, and the return on what was paid. */
  gain: number | null;
  /** WHAT IT MOVED SINCE THE PREVIOUS CLOSE, in money and as a share of that close.
   *  Null when fewer than two closes are known: one price is a price, not a change.
   *  It was calculated on HoldingDetailScreen from the price series — a money figure derived inline on
   *  a screen, which is the one thing the one-door rule forbids (2026-10-01). */
  dayChange: { amount: number; share: number } | null;
  returnOnCost: number | null;
  /** EACH PURCHASE, oldest first — what the average cost is made of, so it can be checked rather
   *  than trusted. The screen read `position.lots` directly, which is the position's own shape
   *  leaking onto a screen; the door names the three things a person reads and nothing else. */
  purchases: { lotId: string; date: string; shares: number; costPerShare: number }[];
  /** Only when priced: the gain split by how long it has been held. */
  capitalGains: CapGains | null;
  /** Dividends whose record NAMES this ticker. */
  dividends: { trailing12: number; allTime: number };
  /** What earlier sales of this holding actually made — and how many sales could NOT be priced
   *  honestly, because no purchase was ever recorded for them. A figure that leaves those out
   *  silently is the one that gets trusted and is wrong. */
  realised: RealizedResult;
}

export interface TheAccount {
  accountId: string;
  label: string;
  /** What the account is worth today — the ONE figure the band, the trio and the Total row all print. */
  marketValue: number;
  /** Dividends and interest this account has actually received. Never estimated, never back-filled. */
  income: number | null;   // null = no records yet, so no figure (MK-NW-M-019)
  /** What is inside it, by class. Null for an account that is not linked: there is nothing to read. */
  inside: ClassSlice[] | null;
  /** How many records the ledger holds for it. */
  activityCount: number;
  /** EACH RECORD, and what it moved. The screen worked the amount out itself from the ledger — a
   *  transfer coming IN counts as its own amount, anything else as its cash effect — which is a money
   *  figure calculated on a screen. The door answers it now (2026-10-01). */
  activity: { recordId: string; date: string; type: string; ticker: string | null;
              amount: number; mine: boolean }[];
  /** The income of one holding, by ticker — blank when the record does not say which holding paid. */
  incomeOfHolding: (ticker: string | null | undefined) => HoldingIncome;
}

export interface TheNetWorth {
  /** Assets − debts. The ONE net-worth figure, on every screen that shows one. */
  netWorth: number;
  assets: number;
  debts: number;
  /** The three totals every screen splits by. */
  cash: number;
  investments: number;
  investable: number;
  /** What is owned, by class — the rows under WHAT YOU OWN. */
  byClass: Record<AssetClass, number>;
  /** Alternatives, named on its own because its own screen shows this total and it must agree. */
  alternatives: number;
  /** Each debt, and what it costs a month. */
  debtLines: DebtLine[];
  /** Σ the MINIMUM each debt obliges — the obligation. This is what the Net worth screen prints today. */
  monthlyDebtMinimum: number;
  /** Σ what ACTUALLY leaves the account, counting a payment set above the minimum. */
  monthlyDebtPayments: number;
  /** How it moved: the line, and the return on cash + investments. Null when the record cannot say.
   *  A RATE, held as 0…1 — the form every other percent in the register uses, so one display rule
   *  rounds them all (Q49). The function underneath returns it already multiplied by 100; the door
   *  converts once, here, rather than leaving four screens to remember which form they were handed. */
  trend: TrendPoint[];
  investableChangePct: number | null;
}
```

## The cards

```json
[
 {
  "id": "MK-NW-O-001",
  "name": "theBonds",
  "kind": "orchestrator",
  "what_it_is_for": "What bonds and CDs do I hold, what do they pay, and when do they mature?",
  "formula_in_words": "Takes every account that is a bond or CD. Rows are sorted by maturity date, soonest first, with any that has no date last. Count, total value, total face value, interest in a year, average yield and next maturity come from bondSummary. When one bond is opened it also gives: matured = its maturity date is today or earlier, by the calendar (a bond with no date has not matured — it is unknown); a matured bond gives no yield to maturity and no rate-move figure; and what a move in interest rates would do to its value (bondRateSensitivity) — except for a CD, where no figure is given and a sentence says a CD is not traded and is worth its balance until it matures.",
  "handed": "export function theBonds(input: BondsInput): Bonds",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-023",
    "words_on_screen": "Face value",
    "unit": "money",
    "what_it_answers": "What this bond pays back on the day it matures.",
    "when_it_refuses": "Not entered, so nothing is shown.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-024",
    "words_on_screen": "Interest payments",
    "unit": "words",
    "what_it_answers": "The rate it pays, and what that comes to in a year.",
    "when_it_refuses": "No coupon rate entered.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-025",
    "words_on_screen": "Matures",
    "unit": "words",
    "what_it_answers": "The day it pays back, and how long that is away.",
    "when_it_refuses": "No maturity date entered — the yields refuse rather than guess one.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-026",
    "words_on_screen": "Yield if held to maturity",
    "unit": "percent-2dp",
    "what_it_answers": "What it earns a year if you hold it to the end, counting the gap between its price and its face value.",
    "when_it_refuses": "Matured, or no maturity date — it refuses rather than divide by nothing.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-027",
    "words_on_screen": "Yield on today's value",
    "unit": "percent-2dp",
    "what_it_answers": "What the interest comes to against what the bond is worth today.",
    "when_it_refuses": "No value today.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-028",
    "words_on_screen": "Rates rise 1% → value roughly $X–$Y",
    "unit": "words",
    "what_it_answers": "Roughly what this bond would be worth if interest rates moved one percent either way.",
    "when_it_refuses": "Refused for a CD, for a matured bond, and for anything with no coupon or no maturity — and for a CD it says plainly why nothing happens.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-041",
    "words_on_screen": "total value of your bonds",
    "unit": "money",
    "what_it_answers": "What every bond and CD you hold is worth today, added up.",
    "when_it_refuses": "No bonds entered yet, so it says so rather than showing $0.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-042",
    "words_on_screen": "n bonds · face $X",
    "unit": "words",
    "what_it_answers": "How many you hold, and what they pay back at maturity in total.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-043",
    "words_on_screen": "COUPON",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The interest all your bonds pay in a year, in money.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-044",
    "words_on_screen": "AVG YIELD",
    "unit": "percent-2dp",
    "what_it_answers": "What your bonds yield on what they are worth today, weighted by value.",
    "when_it_refuses": "A bond with no price today is left out rather than counted at zero.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-045",
    "words_on_screen": "each bond — face, coupon, yield",
    "unit": "words",
    "what_it_answers": "One line per bond: what it pays back, what it pays you, and what that is worth today.",
    "when_it_refuses": "A bond fund has no face value or maturity, so it shows none.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-053",
    "words_on_screen": "face",
    "unit": "money",
    "what_it_answers": "The face value of every bond and CD added up — what they pay back at maturity, which is not what they are worth today.",
    "when_it_refuses": "No bonds entered yet, so no face total either.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-054",
    "words_on_screen": "one bond’s value",
    "unit": "money",
    "what_it_answers": "What this one bond or CD is worth today.",
    "when_it_refuses": "— the row is not drawn at all when there is no bond.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-055",
    "words_on_screen": "one bond’s face",
    "unit": "money",
    "what_it_answers": "What this one bond pays back at maturity.",
    "when_it_refuses": "Falls back to the value entered, and the row says face with that figure.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-056",
    "words_on_screen": "coupon",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What this one bond pays in a year, in cash.",
    "when_it_refuses": "No coupon rate entered — the figure is left out rather than shown as $0.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-057",
    "words_on_screen": "yield",
    "unit": "percent-2dp",
    "what_it_answers": "What this bond pays in a year as a share of what it is worth today.",
    "when_it_refuses": "— when there is no coupon rate or no value to divide by.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-058",
    "words_on_screen": "Yield to maturity",
    "unit": "percent-2dp",
    "what_it_answers": "What this bond would earn a year if held to maturity, counting the gain or loss between what it is worth now and what it pays back.",
    "when_it_refuses": "— with no maturity date there are no years to spread the difference over.",
    "shown_on": [
     "/bonds"
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
    "decision": "DEC-0280",
    "date": "2026-08-26",
    "words": "subtract accrued interest when known; say so when not"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-026",
    "words": "An approximation, and labelled an estimate on screen."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "An estimate, and it wears the estimate label."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "FOUNDER 2026-09-27: a CD gets no estimate. It is not traded, so its value does not move with rates; the screen says that instead. KEEP — the app does not ask whether a CD is a bank one or a brokered one."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-053",
    "words": "FACE AND VALUE ARE SHOWN SIDE BY SIDE because they differ, and the difference is the whole point: a bond bought below face pays back more than it is worth today."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-056",
    "words": "IT IS PAID ON FACE, NOT ON VALUE. A $25,000 bond worth $24,200 still pays 4.5% of $25,000 — computing it on the market value understates the income."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-057",
    "words": "WHERE ACCRUED INTEREST WAS NOT ENTERED the row says so beneath the figures rather than quietly leaving it in the price (his ruling, DEC-0280)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-058",
    "words": "AN ESTIMATE, and the foot of the screen says so in those words."
   }
  ]
 },
 {
  "id": "MK-NW-O-002",
  "name": "theAccount",
  "kind": "orchestrator",
  "what_it_is_for": "What is in this one account: what it is worth, what it holds, what each holding has paid, and its activity?",
  "formula_in_words": "Uses the records whose account is this account, and any transfer that arrives in it from another account. Market value = the account's balance. Income = dividends + interest in those records, to the cent — and NO FIGURE when the account has no records at all. Inside = for a linked account, the value in each asset class that is not zero (accountClassBreakdown); for any other account, nothing. Activity = every record with its date, type, ticker and amount: the amount is the record's effect on cash, except a transfer INTO this account, which shows the amount moved; a record counts as the person's own unless it came through the link. Income of one holding = dividends and interest whose record names that holding's ticker, capitals ignored; a record naming no ticker belongs to no holding.",
  "handed": "export function theAccount(input: {\n  account: AssetAccount;\n  transactions: any[];\n}): TheAccount",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-018",
    "words_on_screen": "Market value",
    "unit": "money",
    "what_it_answers": "What this account is worth today.",
    "when_it_refuses": "An account with no value shows nothing rather than $0.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-NW-M-019",
    "words_on_screen": "Income",
    "unit": "money",
    "what_it_answers": "The dividends and interest this account has actually received.",
    "when_it_refuses": "No records — it says so instead of showing zero.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-020",
    "words_on_screen": "each asset class inside the account",
    "unit": "money",
    "what_it_answers": "What each kind of thing inside this account is worth — cash, bonds, stocks, alternatives.",
    "when_it_refuses": "Not linked — the screen shows the itemise door instead of inventing a breakdown.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-021",
    "words_on_screen": "Income: <amount> on a holding row",
    "unit": "words",
    "what_it_answers": "What this one holding has paid you, from the records that name it.",
    "when_it_refuses": "No record naming this holding — the line does not appear at all.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-022",
    "words_on_screen": "ACTIVITY — n records",
    "unit": "count",
    "what_it_answers": "How many records this account has: what has happened in it.",
    "when_it_refuses": "None yet — the section keeps its heading and says so.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-038",
    "words_on_screen": "We keep the total at $X",
    "unit": "money",
    "what_it_answers": "The figure the account must still add up to while you say what is inside it.",
    "when_it_refuses": "Nothing to itemise.",
    "shown_on": [
     "/itemize"
    ]
   },
   {
    "id": "MK-NW-M-039",
    "words_on_screen": "$X of $Y itemized · remainder",
    "unit": "money",
    "what_it_answers": "How much of the account you have placed, and how much is still unplaced.",
    "when_it_refuses": "Nothing entered yet — it reads $0 of the balance.",
    "shown_on": [
     "/itemize"
    ]
   },
   {
    "id": "MK-NW-M-040",
    "words_on_screen": "each holding and its value",
    "unit": "money",
    "what_it_answers": "One line per thing you have said is inside this account, and what it is worth.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/itemize"
    ]
   },
   {
    "id": "MK-NW-M-062",
    "words_on_screen": "what one record moved",
    "unit": "money",
    "what_it_answers": "What this one record added to the account or took out of it.",
    "when_it_refuses": "No records yet — the section keeps its heading and says so.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0010",
    "date": "2026-07-28",
    "words": "\"yes\" — DEC-0010, confirmed as written: Chart colors: the UX doc’s validated colorblind-safe palettes WILL BE ADOPTED app-wide (one consistent set; e.g. Cash ge"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0019",
    "date": "2026-07-31",
    "words": "\"yes\" — DEC-0019, confirmed as written: B47 FINDING 3 FIXED (Vanguard): balance authority rule gains the derive-from-holdings fallback when the broker reports n"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0045",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0045, confirmed as written: Private equity + Hedge funds OUT of phase 1 (founder: keep it simple) — capture chips trimmed on both editors; data mode"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0051",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0051, confirmed as written: CLASSIFICATION RULE: cash = cash only. Money-market funds → Stocks/ETFs; CDs/T-bills → Bonds & CDs (any maturity). Super"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0070",
    "date": "2026-08-10",
    "words": "Connect a brokerage"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0090",
    "date": "2026-08-11",
    "words": "seems repetitive as it is already listed under CDs and Bonds asset class... can we add the number and say 3 CD & 1 treasury bond in this account?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0092",
    "date": "2026-08-11",
    "words": "we decided to move money markets and T-bills to stock/etf and bond & CD respectively."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0095",
    "date": "2026-08-11",
    "words": "why is cash added to CD and not cash?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0096",
    "date": "2026-08-11",
    "words": "$500 is what I added manually as a deposit to the Vanguard account. It never asked me if it was in cash or something else?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0108",
    "date": "2026-08-11",
    "words": "Update master PRD document. Go to master list of what"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0166",
    "date": "2026-08-14",
    "words": "not sure what you want me to check here."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0192",
    "date": "2026-08-28",
    "words": "s number was its POSITION in a list — nid() counted up as it walked them — so inserting a row silently renumbered every metric after it in that family. 93 audit findings are keyed to those numbers, as are the founder"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0406",
    "date": "2026-09-12",
    "words": "Let's not assume that the reader knows what the statement is referring to. Always be explicit."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0451",
    "date": "2026-06-30",
    "words": "cash means cash+ cashequivalents?"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-019",
    "words": "Never estimated. A broker that shares no income records leaves this blank rather than showing a made-up $0."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-020",
    "words": "Only a LINKED account has an inside to read. A hand-entered lump has none until someone itemises it."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-021",
    "words": "FOUNDER FINDING 2026-08-11: a record with no ticker names no holding. It used to match every non-stock holding, so a CD showed dividends it cannot pay and two CDs showed one figure twice. Untickered income is counted at the ACCOUNT level instead, where it belongs."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-038",
    "words": "Itemising describes what is inside an account; it never changes what the account is worth."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-040",
    "words": "A CLASS HOLDING NOTHING IS NOT LISTED — a $0 line reads as \"we checked and it is empty\", which is a different claim from \"there is none\"."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-040",
    "words": "Uninvested money in the account is one of the lines, under the words he ruled on 2026-08-11: cash in this account."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-062",
    "words": "THE SIGN IS SHOWN AS A WORD OR A MARK, never by colour alone — a plus or a minus in front of the figure, so it reads the same to someone who cannot tell the two colours apart."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-062",
    "words": "A RECORD YOU TYPED AND ONE THE BROKER SENT BOTH APPEAR, each saying which it is (DEC-0107). A $500 deposit mistyped as $5,000 is only findable if the row says where it came from."
   }
  ]
 },
 {
  "id": "MK-NW-O-003",
  "name": "theNetWorth",
  "kind": "orchestrator",
  "what_it_is_for": "What am I worth: everything I own, less everything I owe, and how each breaks down?",
  "formula_in_words": "Assets = every account's balance added up. Debts = every debt's remaining balance added up. Net worth = assets − debts. Cash = cashTotal. Investments = the investment classes of the class split added up (Stocks / Funds, Bonds & CDs, Alternatives, Unclassified, from assetAllocation) — so a linked account's uninvested cash is in Cash only, and Cash + Investments + property comes to everything owned. Investable = investableAssets. By class = assetAllocation. Each debt is listed with its balance and its required monthly payment (the larger of its minimum and the payment the person says they make); monthly debt payments = those added up; monthly debt minimum = the minimums alone added up. The percent change on cash + investments is measured from the daily record since the given start day and returned as a share; no figure when there is no record.",
  "handed": "export function theNetWorth(input: {\n  uid: string;\n  accounts: AssetAccount[];\n  debts: Debt[];\n  /** The recorded history, for the line and the return. */\n  monthlyHistory?: Record<string, unknown> | null;\n  dailyNetWorth?: Record<string, unknown> | null;\n  investableDaily?: Record<string, unknown> | null;\n  /** The day a change is measured FROM. With none, the change figures refuse. */\n  since?: string | null;\n}): TheNetWorth",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-014 debt balance"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-016",
    "words_on_screen": "Total invested · Cash total · Investable total",
    "unit": "money",
    "what_it_answers": "The three totals Insights reasons about — and they are the SAME three the Net worth tab shows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-001",
    "words_on_screen": "Change in net worth +$X",
    "unit": "money",
    "what_it_answers": "How much your net worth has moved since the day the line starts.",
    "when_it_refuses": "A line needs at least two points; with one, the point is shown and no change is stated.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-002",
    "words_on_screen": "Return on cash + investments",
    "unit": "percent-2dp",
    "what_it_answers": "How much your money that is not a house or a car has moved, since the day you are comparing against.",
    "when_it_refuses": "The record does not reach back that far, so it shows nothing rather than a made-up change.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-003",
    "words_on_screen": "the trend line",
    "unit": "count",
    "what_it_answers": "How many points the line is drawn from — the months on record plus the days after them.",
    "when_it_refuses": "With one point the point is shown and the line is not drawn.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-004",
    "words_on_screen": "WHAT YOU OWN",
    "unit": "money",
    "what_it_answers": "Everything you own, added up.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-005",
    "words_on_screen": "CASH",
    "unit": "money",
    "what_it_answers": "The money you could spend today.",
    "when_it_refuses": "No cash account entered.",
    "shown_on": [
     "/analytics",
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-006",
    "words_on_screen": "🏠 PERSONAL PROPERTY",
    "unit": "money",
    "what_it_answers": "What one band under WHAT YOU OWN holds — here the vehicles and valuables.",
    "when_it_refuses": "The band shows $0 and, on a fresh account, the one line \"Nothing entered yet. Add your accounts ›\".",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-007",
    "words_on_screen": "class rows — by class, institution or type",
    "unit": "money",
    "what_it_answers": "What each kind of thing you own is worth.",
    "when_it_refuses": "A class with nothing in it keeps its heading and says so.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-008",
    "words_on_screen": "each account and its balance",
    "unit": "money",
    "what_it_answers": "One line per account inside a band, with what that account holds.",
    "when_it_refuses": "$0, and on a fresh account the one line \"Nothing entered yet. Add your accounts ›\". A real entered zero shows a plain $0 with no line.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-009",
    "words_on_screen": "DEBTS",
    "unit": "money",
    "what_it_answers": "Everything you owe.",
    "when_it_refuses": "No debts entered.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-010",
    "words_on_screen": "each debt and what is left on it",
    "unit": "money",
    "what_it_answers": "One line per debt, and what is still owed on it.",
    "when_it_refuses": "None entered.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-011",
    "words_on_screen": "minimum monthly payment on a debt",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What this debt requires of you each month.",
    "when_it_refuses": "No minimum entered.",
    "shown_on": [
     "/analytics"
    ]
   },
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
   },
   {
    "id": "MK-NW-M-015",
    "words_on_screen": "YOUR RETIREMENT PLAN — on track for $X by age Y",
    "unit": "money",
    "what_it_answers": "What your pot is on course to be worth at the age you said you would retire.",
    "when_it_refuses": "No figure when there is nothing to grow, or when retirement is not ahead of the person.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-016",
    "words_on_screen": "Net worth so far (setup)",
    "unit": "money",
    "what_it_answers": "What you are worth as the setup answers stand, before anything else is entered.",
    "when_it_refuses": "Adds to $0 when there is nothing to add. Zero and \"nothing recorded yet\" read alike on screen — worth a decision.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-017",
    "words_on_screen": "Assets $X − Debts $Y = Net worth $Z",
    "unit": "words",
    "what_it_answers": "The whole sum in one line, so it can be checked by eye.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-049",
    "words_on_screen": "Total value",
    "unit": "money",
    "what_it_answers": "What your alternatives are worth — crypto, private equity, commodities and the rest.",
    "when_it_refuses": "None entered yet.",
    "shown_on": [
     "/other-investments"
    ]
   },
   {
    "id": "MK-NW-M-063",
    "words_on_screen": "what is inside this institution",
    "unit": "money-compact",
    "what_it_answers": "What this one institution holds, broken down by kind, so a roll-up can be read rather than taken on trust.",
    "when_it_refuses": "One kind only — the line is left out, because a roll-up of one thing is just the thing.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-XS-M-001",
    "words_on_screen": "Net worth",
    "unit": "money",
    "what_it_answers": "Everything you own, less everything you owe.",
    "when_it_refuses": "Nothing entered yet — it says so and offers the door, rather than showing $0 as a fact.",
    "shown_on": [
     "/home",
     "/analytics"
    ]
   },
   {
    "id": "MK-XS-M-003",
    "words_on_screen": "YOUR INVESTMENTS",
    "unit": "money",
    "what_it_answers": "What your invested money is worth — stocks, funds, bonds and alternatives.",
    "when_it_refuses": "Nothing invested yet.",
    "shown_on": [
     "/home",
     "/analytics"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0010",
    "date": "2026-07-28",
    "words": "\"yes\" — DEC-0010, confirmed as written: Chart colors: the UX doc’s validated colorblind-safe palettes WILL BE ADOPTED app-wide (one consistent set; e.g. Cash ge"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0023",
    "date": "2026-08-01",
    "words": "Cash and cash equivalents"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0047",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0047, confirmed as written: BY TYPE view REMOVED (founder — resolves the open By-type question); WHAT YOU OWN restructures to the three uber-categor"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0048",
    "date": "2026-08-04",
    "words": "Your path ahead (from your Plan)"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0051",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0051, confirmed as written: CLASSIFICATION RULE: cash = cash only. Money-market funds → Stocks/ETFs; CDs/T-bills → Bonds & CDs (any maturity). Super"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0054",
    "date": "2026-08-04",
    "words": "calculating NW % on total is not meaningful — property increments are hand-captured."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0060",
    "date": "2026-08-04",
    "words": "build all the approved NW"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0061",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0061, confirmed as written: MISSING-DATA BANNER + FIX-IT SHEET BUILT: new dataGaps engine (5 checks — unpriced holding · stale connection · no divid"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0066",
    "date": "2026-08-10",
    "words": "NW Main Screen"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0069",
    "date": "2026-08-10",
    "words": "\"yes\" — DEC-0069, confirmed as written: BY INSTITUTION REBUILT to match By category: institution groups now collapse and expand, keep their own open/closed memo"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0070",
    "date": "2026-08-10",
    "words": "Connect a brokerage"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0072",
    "date": "2026-08-11",
    "words": "order classes by LIQUIDITY, cash first"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0074",
    "date": "2026-08-11",
    "words": "it will give user view of what they can do in the app"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0089",
    "date": "2026-08-11",
    "words": "What you own bar - does not change to institution when I toggle to institution from category."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0090",
    "date": "2026-08-11",
    "words": "seems repetitive as it is already listed under CDs and Bonds asset class... can we add the number and say 3 CD & 1 treasury bond in this account?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0091",
    "date": "2026-08-11",
    "words": "the colors for different types of debt not friendly for color blind people."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0092",
    "date": "2026-08-11",
    "words": "we decided to move money markets and T-bills to stock/etf and bond & CD respectively."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0095",
    "date": "2026-08-11",
    "words": "why is cash added to CD and not cash?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0096",
    "date": "2026-08-11",
    "words": "$500 is what I added manually as a deposit to the Vanguard account. It never asked me if it was in cash or something else?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0158",
    "date": "2026-08-14",
    "words": "It is too harsh."
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
    "decision": "DEC-0192",
    "date": "2026-08-28",
    "words": "s number was its POSITION in a list — nid() counted up as it walked them — so inserting a row silently renumbered every metric after it in that family. 93 audit findings are keyed to those numbers, as are the founder"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0264",
    "date": "2026-09-09",
    "words": "full precision for calculation; display two decimals unless stated (whole dollars for totals, balances, projections; eight for coin quantities); fix the code in one pass"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0301",
    "date": "2026-08-20",
    "words": "source always, date only when stale"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0309",
    "date": "2026-08-20",
    "words": "money-market: name-first classification on every road, broker tag as fallback; a class change between syncs is kept and flagged"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0311",
    "date": "2026-08-20",
    "words": "14 metrics cut: tax-loss harvesting, cash drag, age of money, savings rate, safe to spend, personal inflation, sequence buffer, drift, funded ratio, risk measures, look-through, fund fees, embedded tax, employer-stock flag"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0322",
    "date": "2026-08-20",
    "words": "status disagreements, work-list generation, engine counts, tab references, the PINNED word — all in the old metrics deliverable"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0343",
    "date": "2026-09-13",
    "words": "one concept, one function — a concept is computed by exactly one dependent function, called over whatever set it is asked about (total assets over all accounts, and over one institution's accounts, is the same function); a total and the sum of its parts are pinned by an invariant test, never assumed"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0345",
    "date": "2026-09-13",
    "words": "inputs assembled once per family — one function builds the person's state for a family and every orchestrator in that family reads it; no orchestrator and no screen assembles its own"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0347",
    "date": "2026-09-13",
    "words": "shared dependent functions are allowed and are recorded on every orchestrator row whose closure holds them; the closure is generated from the code, never typed"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0397",
    "date": "2026-08-26",
    "words": "enforce with GATES not intentions."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0403",
    "date": "2026-09-09",
    "words": "held as a float, decimals shown only for prices…"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0442",
    "date": "2026-06-30",
    "words": "The networth module missed an ability to edit bonds, cash and alternatives, also manually add transactions. Ability to add transactions was only available for stocks/etfs. The import feature does it work for alternatives such as options, crypto, currency, commodities? Does the ability to read different file formats from different insitutions via plaid api?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0446",
    "date": "2026-06-30",
    "words": "ensure to import institution name as well."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0449",
    "date": "2026-06-30",
    "words": "Which kind T-bills will be? And what is HYSA?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0451",
    "date": "2026-06-30",
    "words": "cash means cash+ cashequivalents?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0452",
    "date": "2026-06-30",
    "words": "why is value any versus float?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0455",
    "date": "2026-06-30",
    "words": "What's the cost differential?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0501",
    "date": "2026-06-30",
    "words": "Also talk about surfacing the right things at the right time ('what needs you')."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0509",
    "date": "2026-06-30",
    "words": "Home: how do you capture the information?"
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-016",
    "words": "Insights took these its own way before 2026-09-27; his ruling on Q-NW-1 made all three screens read one answer."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-001",
    "words": "IT IS READ FROM THE RECORD, never back-solved: the months we actually saved and the daily points after them."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-001",
    "words": "A month and its own days live in one series, sorted by their date text — \"2026-04\" sorts before \"2026-04-30\", which is what makes plain text sorting safe."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-002",
    "words": "No recorded day on or after the baseline → no figure. A movement from a day nobody recorded is not a movement."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-003",
    "words": "A DAY THAT IS NOT A REAL DATE IS DROPPED, and a month whose figures do not add up is dropped — never drawn as a guess."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-003",
    "words": "The line is drawn only from days we hold a record for; today’s balances are never priced at past dates."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-005",
    "words": "A CD and a money-market fund are NOT cash: they are bonds and funds, because they pay interest and dividends that must be measured (founder, 2026-08-04)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "REAL ESTATE IS ITS OWN BAND: a house is not a vehicle, and mixing them hides both."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "THE SAME ACCOUNTS GROUP TWO WAYS — by class and by institution — and both ways add to the same total, so switching the view can never change what you own."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "An account with no institution recorded groups under \"No institution set\" rather than being dropped."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-008",
    "words": "UNDER AN INSTITUTION’S NAME, the class mix inside it is named too — a Fidelity holding a fund and a Treasury reads as a roll-up, not a flat lump."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-008",
    "words": "The mix is ordered biggest first, so the largest thing inside an institution is the first thing read."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-011",
    "words": "FOUNDER RULING G19 (2026-09-08): one payment rule, the larger of the stated minimum and the payment set — the same words in both formula columns."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "NO RANDOM RUNS ANYWHERE IN THIS ONE — it is the straight-line check that sits beside the 1,000-run odds, and the two answer different questions."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "The recommended pot is 25× the yearly expenses NOT covered by guaranteed income, counted from the start of the retirement year — which is why it differs from an outside calculator (his ruling)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "Guaranteed income starts at the age it was said to start, not at the retirement age."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-016",
    "words": "IT IS COMPUTED EACH TIME AND NEVER STORED as a third number that could disagree with its own two halves (his ruling)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-016",
    "words": "A GENUINE NEGATIVE IS SHOWN, never floored at zero — someone early in a mortgage really does owe more than they own."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-049",
    "words": "It is the Alternatives SLICE of net worth and must equal what the Net worth tab shows for that class — which is why it sits behind this door (founder, 2026-09-27: \"ok\")."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "BIGGEST FIRST, so the largest thing inside an institution is the first thing read."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "SHORTENED, because several of these share one line. It is the only place the app shortens a figure, and it is shortened only to fit — never to round a figure a person is checking."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "THE PARTS ADD TO THE INSTITUTION’S OWN TOTAL above them, which is the point of showing them."
   }
  ],
  "approved_drawing": {
   "drawing": "Net worth, Quiet Instrument v08, state A (approved 2026-09-14)",
   "household": "Chase Checking $8,000 (a bank account). Vanguard Brokerage $349,333, of which $838 is uninvested cash and $348,495 is stocks and funds. E*TRADE bonds and CDs $5,819. Home $450,000. Debts: home mortgage $412,000, Chase Visa $6,000.",
   "drawn": {
    "Cash": 8838,
    "Investments": 354314,
    "Personal property": 450000,
    "What you own": 813152,
    "Debts": 418000,
    "Net worth": 395152
   }
  }
 },
 {
  "id": "MK-NW-O-004",
  "name": "theEmergencyFund",
  "kind": "orchestrator",
  "what_it_is_for": "How many months of essential expenses would my cash cover?",
  "formula_in_words": "Cash = all cash (cashTotal), or the amount handed in when one is given. Debt minimums = the required monthly payment of every debt added up, leaving out ONE mortgage — the home's — when the budget already carries an amount for rent or housing: the mortgage whose payment is nearest that budgeted amount. No mortgage is left out when the only property on record is not lived in (a rental, a second home, land), because the housing line is then rent. Essentials for a month = essential expenses (from logged expenses where there are enough, otherwise from the profile) + debt minimums. Rent that keeps arriving = the Rent row of the Income summary (rent from a property less what it costs to run, less calculated tax when the tax rate is calculated), never below zero; owner, 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\" It arrives every month, so it is added to the cash every month. From cash each month = essentials − that rent, never below zero. Months covered = cash ÷ from cash each month; no figure when essentials are zero, and no figure when the rent pays for the whole month (the cash is then not drawn on, and it says so). Planned = planned monthly expenses + debt minimums; months covered at the planned level = cash ÷ (planned − that rent); no figure when that is zero or less. Housing disagreement: when housing is budgeted, a mortgage payment exists and the two amounts differ, it gives both and the difference. Target for N months = from cash each month × N; gap = target − cash, never below zero. Months left after a shock = (cash − the shock, never below zero) ÷ from cash each month. When a typed month of essentials is handed in, it stands in for essentials + debt minimums. A housing disagreement is reported only between the budget line and that one mortgage. A target, and the months left after a shock, are given only when there is an essentials figure.",
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
    "words": "A mortgage is never counted twice: where the Rent / Mortgage budget carries it, its minimum is left out."
   }
  ]
 },
 {
  "id": "MK-NW-O-005",
  "name": "theAlternativesOutlook",
  "kind": "orchestrator",
  "what_it_is_for": "What might my alternative investments earn in a year: the expected rate, and the money it comes to?",
  "formula_in_words": "Count, total value and blended rate are over the accounts whose class is Alternatives (isAlternative, alternativesSummary) — the same set the rows list and the Net worth tab's Alternatives slice counts, so the rows add up to the total. Blended rate: no figure when nothing is held. Growth in a year = total value × blended rate, given only when there is at least one such account and the total is above zero; otherwise no figure. Rows = each of those accounts with its value and the benchmark yearly rate for its kind.",
  "handed": "export function theAlternativesOutlook(input: { accounts: AssetAccount[] }): AlternativesOutlook",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-050",
    "words_on_screen": "EST. GROWTH /year",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What your alternatives might earn in a year, at the rates these kinds of things have historically paid.",
    "when_it_refuses": "Nothing held — no figure at all, because a $0 forecast reads as a forecast.",
    "shown_on": [
     "/other-investments"
    ]
   },
   {
    "id": "MK-NW-M-051",
    "words_on_screen": "EXP. RETURN",
    "unit": "percent-2dp",
    "what_it_answers": "The one yearly rate your alternatives are expected to earn, taking each holding's own benchmark and weighting it by what that holding is worth.",
    "when_it_refuses": "Nothing held — no figure at all, because a 0.00% expected return reads as a forecast of nothing rather than an absence of holdings.",
    "shown_on": [
     "/other-investments"
    ]
   },
   {
    "id": "MK-NW-M-052",
    "words_on_screen": "each alternative and what it is worth",
    "unit": "money",
    "what_it_answers": "Every alternative you hold, with its value, where it is held and the benchmark for its kind — so the total above can be read line by line.",
    "when_it_refuses": "No rows, and the screen shows the sentence that says what belongs here instead.",
    "shown_on": [
     "/other-investments"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-NW-M-050",
    "words": "An ESTIMATE, and it wears the estimate label: a historical benchmark for the KIND of thing held, never a promise about this holding."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-050",
    "words": "FOUNDER 2026-09-27 (\"ok\"): split out of \"what am I worth\". The Alternatives TOTAL belongs there because it must equal what the Net worth tab shows for that class; a projection does not."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-051",
    "words": "IT IS WEIGHTED BY VALUE, not an average of the rates: $28,000 of crypto and $500 of gold is almost entirely a crypto outlook, and averaging the two rates would say otherwise."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-051",
    "words": "TWO DECIMALS, because it is a rate (the precision standard, Q49) — it read to one until 2026-09."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-052",
    "words": "THE ROWS MUST ADD TO THE TOTAL ABOVE THEM. That is the whole reason the rows exist: a total nobody can take apart is a number you have to trust rather than check."
   }
  ]
 },
 {
  "id": "MK-NW-O-006",
  "name": "theHolding",
  "kind": "orchestrator",
  "what_it_is_for": "How is this one holding doing: its value, its cost, and its gains realised and not yet realised?",
  "formula_in_words": "Shares = shares of every purchase added up. Total paid = shares × cost per share over every purchase (× 100 for an option contract unless the holding states its own multiplier). With a price: value = shares × price (× 100 for an option contract unless the holding states its own multiplier); gain = value − total paid; return on cost = gain ÷ total paid (no figure when nothing was paid). With NO price: value shown = total paid, and gain, return and the tax estimate are not given. Average paid per share = total paid ÷ (shares × that multiplier), so it is in the unit the price is quoted in (0 with no shares). Closed = shares zero or less. Day change = last close − the close before, and that ÷ the close before; none with fewer than two closes. Dividends = dividend records that name this ticker: the last 365 days, and all time. Realised gain = from the sale records of this ticker in this account.",
  "handed": "export function theHolding(input: {\n  position: Position;\n  accountId: string;\n  price: number | null;\n  transactions: any[];\n  now?: Date;\n  /** The recent daily closes, oldest first. Two are enough for the day's change. */\n  recentCloses?: number[];\n}): HoldingAnswer",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-029",
    "words_on_screen": "CURRENT PRICE · LIVE",
    "unit": "money-cents",
    "what_it_answers": "What one share is worth right now, and how fresh that price is.",
    "when_it_refuses": "No price — the screen shows what you paid instead, and says so.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-030",
    "words_on_screen": "Current value",
    "unit": "money",
    "what_it_answers": "What this holding is worth today.",
    "when_it_refuses": "No price — it shows what you paid, labelled as that.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-031",
    "words_on_screen": "Quantity — n shares",
    "unit": "count",
    "what_it_answers": "How many shares you still hold.",
    "when_it_refuses": "All sold — the screen says the holding is liquidated rather than showing 0 shares.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-032",
    "words_on_screen": "Price paid (average)",
    "unit": "money-cents",
    "what_it_answers": "What you paid per share, on average, for what you still hold.",
    "when_it_refuses": "No purchase price recorded.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-033",
    "words_on_screen": "Total paid",
    "unit": "money",
    "what_it_answers": "What you paid for the shares you still hold.",
    "when_it_refuses": "No purchase price recorded.",
    "shown_on": [
     "/holding-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-NW-M-034",
    "words_on_screen": "Dividends received (12 mo)",
    "unit": "money",
    "what_it_answers": "What this holding has paid you over the last twelve months.",
    "when_it_refuses": "No records naming this holding — the line does not appear.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-035",
    "words_on_screen": "Realized gain from your buys and sells",
    "unit": "money",
    "what_it_answers": "What your earlier sales of this holding actually made.",
    "when_it_refuses": "Nothing sold yet.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-036",
    "words_on_screen": "Gain — long-term (held over 1 yr)",
    "unit": "money",
    "what_it_answers": "The gain on shares you have held more than a year — the part taxed at the lower rate.",
    "when_it_refuses": "No price today — no gain is stated at all.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-037",
    "words_on_screen": "Gain — short-term (under 1 yr)",
    "unit": "money",
    "what_it_answers": "The gain on shares held under a year — the part taxed as ordinary income.",
    "when_it_refuses": "No price today — no gain is stated at all.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-059",
    "words_on_screen": "Change since purchase",
    "unit": "money",
    "what_it_answers": "What this holding has gained or lost against what was paid for it.",
    "when_it_refuses": "No price — the row is left out, and the screen says what was paid instead.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-060",
    "words_on_screen": "up",
    "unit": "money-cents",
    "what_it_answers": "What this holding moved since the previous close, in money.",
    "when_it_refuses": "Fewer than two closes known, or a previous close of zero — the line is not drawn.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-061",
    "words_on_screen": "sh @",
    "unit": "money-cents",
    "what_it_answers": "What one purchase cost per share, on the day it was bought.",
    "when_it_refuses": "No purchases recorded — the section is not drawn.",
    "shown_on": [
     "/holding-detail",
     "/invest"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0092",
    "date": "2026-08-11",
    "words": "we decided to move money markets and T-bills to stock/etf and bond & CD respectively."
   },
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
    "decision": "DEC-0301",
    "date": "2026-08-20",
    "words": "source always, date only when stale"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0475",
    "date": "2026-07-01",
    "words": "do we capture only balance or all individual portfolio holding e.g. AMZN 100 stocks …."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0476",
    "date": "2026-07-01",
    "words": "When dividend is captured is it automatically added to income or cash? Similarly, is there a way captical gain is captured and displayed somewhere?"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-029",
    "words": "A price that has gone stale says its age rather than passing as today’s."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-030",
    "words": "r30: with NO price it shows what you paid, never a zero — a holding priced at zero would quietly shrink your whole portfolio."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-032",
    "words": "Kept unrounded inside, rounded once at display (Q49) — rounding it early moved the total it multiplies back into."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-034",
    "words": "A record that names no ticker belongs to no holding — the same rule the account page carries."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-059",
    "words": "IT IS AGAINST WHAT WAS PAID, not against any starting price: the figure answers \"am I ahead on this holding\", which only the cost basis can answer."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-059",
    "words": "WITHOUT A PRICE THERE IS NO FIGURE at all, rather than a zero — a gain of zero reads as break-even when the truth is that nothing is known."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-060",
    "words": "TWO CLOSES ARE NEEDED. One price is a price, not a change, so with a single point there is no figure rather than a change of zero."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-060",
    "words": "IT CAME OFF THE SCREEN (2026-10-01). It was calculated inside HoldingDetailScreen from the price series — a money figure derived inline on a screen, which is what one door exists to prevent. The door computes it now and the screen prints what the door says."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-061",
    "words": "EACH PURCHASE KEEPS ITS OWN PRICE. They are what the average above them is made of, so a person can check the average rather than having to trust it."
   }
  ]
 }
]
```

## Formulas these cards lean on

11 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-NW-F-001",
  "name": "isAlternative",
  "what_it_is_for": "Is this account an \"other investment\" — an alternative held at a manual value (not a bond, not cash/property)?",
  "formula_in_words": "True when the account's class (assetClassOf) is Alternatives."
 },
 {
  "id": "MK-NW-F-002",
  "name": "alternativesSummary",
  "what_it_is_for": "Adds up the alternative investments: how many there are, what they are worth together, their blended yearly growth rate and the growth in dollars that rate gives over a year.",
  "formula_in_words": "Over the accounts that pass isAlternative: count; total = balances added up; blended rate = each balance × the benchmark yearly rate for its kind, added up, ÷ total (no figure when the total is 0); growth in a year = total × blended rate (0 when there is no rate)."
 },
 {
  "id": "MK-NW-F-011",
  "name": "assetClassOf",
  "what_it_is_for": "WHAT the account is (asset class).",
  "formula_in_words": "The first of these that applies. (1) The class stated on the account. (2) The class its name is evidence for. (3) Bonds & CDs if it has a maturity date. (4) The class of its kind: checking, savings, high-yield savings, cash management and foreign currency are cash; money market and stocks are Stocks / Funds; CD and fixed income are Bonds & CDs; private equity, hedge funds, commodities, crypto, annuities, options and other are Alternatives; home is Real estate; vehicle is Personal property. (5) Stocks / Funds if it lists holdings. (6) Cash if it is a cash account. (7) Real estate if it is property. (8) Otherwise Unclassified."
 },
 {
  "id": "MK-NW-F-014",
  "name": "isRealAsset",
  "what_it_is_for": "Whether an account is a physical asset, meaning real estate or personal property.",
  "formula_in_words": "True when the account's class (assetClassOf) is Real estate or Personal property."
 },
 {
  "id": "MK-NW-F-016",
  "name": "cashTotal",
  "what_it_is_for": "All the cash a person has: every bank account, plus the uninvested cash sitting inside investment accounts.",
  "formula_in_words": "For a linked account: the cash part of its class breakdown (accountClassBreakdown). For any other account: its whole balance when its class is cash, otherwise nothing. Added up over every account."
 },
 {
  "id": "MK-NW-F-022",
  "name": "investableAssets",
  "what_it_is_for": "Everything owned except real estate and personal property: cash, investments and retirement balances.",
  "formula_in_words": "The balances of every account that is not a real asset (isRealAsset), added up."
 },
 {
  "id": "MK-NW-F-027",
  "name": "accountClassBreakdown",
  "what_it_is_for": "APPROVED v6 (2026-07-19): a CONNECTED account splits across the asset classes it actually holds — CDs under bonds, money market + sleeve under cash, options under alternatives, stocks under stocks — with the slices summing EXACTLY to the broker's authoritative balance.",
  "formula_in_words": "Only for a linked account; any other gets no answer. Cash = its cash balance. Each holding's value = shares × last price (0 with no price), filed under the class its name is evidence for unless that is cash, otherwise under its own class: bond → Bonds & CDs, other → Alternatives, cash → cash, anything else → Stocks / Funds. Options go to Alternatives. If the parts do not add up to the balance: a gap no bigger than the larger of $1 or 1% of the balance is added to cash when positive, or taken off the largest class when negative; a bigger gap is put under the account's own class."
 },
 {
  "id": "MK-NW-F-029",
  "name": "assetAllocation",
  "what_it_is_for": "How much money sits in each of the seven classes?",
  "formula_in_words": "The value in each asset class across every account. A linked account is split by its class breakdown (accountClassBreakdown); any other account counts whole under its one class (assetClassOf)."
 },
 {
  "id": "MK-NW-F-061",
  "name": "bondSummary",
  "what_it_is_for": "Adds up every bond and CD held: how many there are, what they are worth, their face value, the interest they pay in a year, their average yield and the next one to mature.",
  "formula_in_words": "Count = how many bonds. Total value and total face value = each added up. Interest in a year = face × rate, added up. Average yield is over the bonds that have a value today only: their interest in a year ÷ their value today less accrued interest where that is known; nothing when no bond has a value. A bond with no value today is left out of both. Next maturity = the earliest maturity date AFTER today, by the calendar — a bond maturing today has matured and is not next."
 },
 {
  "id": "MK-NW-F-064",
  "name": "bondRateSensitivity",
  "what_it_is_for": "What happens to this bond if interest rates move?",
  "formula_in_words": "Nothing when the yield to maturity is unknown, or the face value or rate is zero or less. For rates one percentage point UP and one DOWN: the new price is priceAtYield at the yield to maturity plus or minus one point (never below 0.01%). It gives a range from 1% under to 1% over that price, and the change against today's value, each rounded in proportion to the bond: to the nearest $1,000 for a bond worth $100,000 or more, the nearest $100 from $10,000, the nearest $10 from $1,000, and so on down."
 },
 {
  "id": "MK-NW-F-069",
  "name": "priceAtYield",
  "what_it_is_for": "Price the bond's future cash flows at a given annual yield (yearly approximation).",
  "formula_in_words": "Years = years to maturity rounded to a whole number, at least 1. Price = each year's interest ÷ (1 + yield) to the power of that year, added up, plus face ÷ (1 + yield) to the power of years. With no maturity date: the current value."
 }
]
```
