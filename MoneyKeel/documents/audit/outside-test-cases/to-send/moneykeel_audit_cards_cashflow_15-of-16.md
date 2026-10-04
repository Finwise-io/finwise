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

# The cards — batch "cashflow 15"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "cashflow 15"` in your reply.

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
export interface BasePayEntry {
  freq: keyof typeof PAY_PERIODS | string;
  varies: boolean;
  grossTypical: any;                          // per period, as typed
  grossByMonth?: Record<string, any>;         // 'YYYY-MM' → amount, when pay varies
  monthly401k: any;                           // their own contribution, per month
  landsTypical?: any;                         // EACH MONTH, whatever the pay frequency — the screen asks "take-home each month" (approved drawing v07, frames 2b and 2c) — OPTIONAL
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

export interface IncomeSource {
  /** The words the screen prints, exactly. */
  label: string;
  /** The quieter second line — what makes this source what it is. */
  note: string;
  /** The amount, and the period it is stated in. Never converted silently. */
  amount: number;
  per: 'month' | 'year' | 'as entered';
  /** Which kind it is, for the row that opens its editor. */
  kind: 'salary' | 'self-employment' | 'bonus' | 'equity' | 'rental' | 'guaranteed';
}

export interface LoggedExpense { amount: any; category: string; store?: string; date: string;
                                 /** absent = the person typed it; 'imported' = it came from a card
                                  *  or a file. The approved mock draws the two apart. */
                                 origin?: 'imported'; }

export interface Transaction {
  id: EntityId;
  date: string;              // 'YYYY-MM-DD' — when it happened (user-set)
  type: TxnType;
  account_id: EntityId;
  counter_account_id?: EntityId;  // for TRANSFER / TRANSFER_IN_KIND
  ticker?: string;
  position_id?: EntityId;
  assetClass?: 'stock_etf' | 'bond' | 'other';
  kind?: string;             // instrument kind (benchmark mapping) for new positions
  shares?: number;
  price?: number;            // per share
  amount?: number;           // cash amount (deposit/withdraw/transfer/dividend-as-cash/fee)
  reinvested?: boolean;      // dividend/interest reinvested into the position vs taken as cash
  note?: string;
  source?: 'manual' | 'connected';  // F10: only connected-account rows are ever reviewed for a
                                    // "worth a look" flag — hand-typed entries are NEVER questioned.
                                    // Absent = manual (every row recorded before F1 sync exists).
  created_at: string;        // ISO — when it was entered (audit)
  undo_prev?: AssetAccount[]; // pre-apply copies of the touched accounts — lets a delete reverse
                              // this row's balance effect exactly (P0: ledger and balances must
                              // never drift; rows recorded before this field use inverseOf()).
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-196",
  "name": "perMonthToFill",
  "kind": "function",
  "what_it_is_for": "What to put in each remaining month to use the room left this year, rounded to $100 for display.",
  "formula_in_words": "Room left ÷ the months left in the year (monthsLeftInYear), rounded to the nearest $100.",
  "handed": "export function perMonthToFill(roomLeft: number, now: Date = new Date()): number",
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
  "id": "MK-CF-F-198",
  "name": "payrollTaxWithheld",
  "kind": "function",
  "what_it_is_for": "Social Security and Medicare tax on a year's wages: 6.2% up to the wage cap, 1.45% of all of it, and 0.9% more above the higher-earner threshold.",
  "formula_in_words": "On a year's wages (below zero counts as 0): 6.2% of the wages up to $184,500, plus 1.45% of all the wages, plus 0.9% of the wages above $200,000.",
  "handed": "export function payrollTaxWithheld(wageAnnual: number): number"
 },
 {
  "id": "MK-CF-F-206",
  "name": "householdK401ByMonth",
  "kind": "function",
  "what_it_is_for": "THE HOUSEHOLD'S 401(k) CONTRIBUTIONS, MONTH BY MONTH — every earner's, in the months that earner is actually paid.",
  "formula_in_words": "For each earner: their monthly 401(k) in every month they have gross pay, and 0 in months they do not. Added over the earners, month by month.",
  "handed": "export function householdK401ByMonth(op: OnboardingProfile | null): number[]",
  "inputs_it_reads": [
   "MK-XS-I-043 their own retirement contribution"
  ]
 },
 {
  "id": "MK-CF-F-210",
  "name": "annualOfSource",
  "kind": "function",
  "what_it_is_for": "A source's yearly amount: a monthly one × 12, a yearly one as it is, a salary from its pay period.",
  "formula_in_words": "A source stated per month: amount × 12. Per year: as it is. A salary row (stated as entered): the household's yearly salary (salaryAnnual), or the row's own amount when that is zero.",
  "handed": "export function annualOfSource(x: IncomeSource, op?: Record<string, any> | null): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-017",
  "name": "publishSurplus",
  "kind": "function",
  "what_it_is_for": "Publish the authoritative surplus for Goals/Retirement to consume.",
  "formula_in_words": "Announces the projected-to-save figure to the rest of the app, unchanged.",
  "handed": "export function publishSurplus(uid: UserId, projectedToSave: number)"
 },
 {
  "id": "MK-CF-F-127",
  "name": "isRental",
  "kind": "function",
  "what_it_is_for": "Whether an income source is rent from a property, long-term or short-term.",
  "formula_in_words": "True for a long-term rental or a short-term rental.",
  "handed": "const isRental = (t: string)"
 },
 {
  "id": "MK-CF-F-129",
  "name": "round4",
  "kind": "function",
  "what_it_is_for": "Returns a number unchanged, because rounding is done once, where a figure is shown.",
  "formula_in_words": "The number unchanged.",
  "handed": "const round4 = (n: number)"
 },
 {
  "id": "MK-CF-F-131",
  "name": "normPayee",
  "kind": "function",
  "what_it_is_for": "Tidies a payee's name so two can be compared: trims the spaces and puts it in lower case.",
  "formula_in_words": "The payee note trimmed and lower-cased; empty when there is none.",
  "handed": "const normPayee = (note?: string | null)"
 },
 {
  "id": "MK-CF-F-132",
  "name": "map",
  "kind": "function",
  "what_it_is_for": "Applies one change to the one account named and leaves every other account as it was.",
  "formula_in_words": "The list of accounts with one change applied to the account named, and the rest untouched.",
  "handed": "const map = (accs: AssetAccount[], id: EntityId, fn: (a: AssetAccount) => AssetAccount)"
 },
 {
  "id": "MK-CF-F-133",
  "name": "cashOf",
  "kind": "function",
  "what_it_is_for": "The uninvested cash held inside an account, or zero when none is recorded.",
  "formula_in_words": "The account's cash; 0 when none is recorded.",
  "handed": "const cashOf = (a: AssetAccount)",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-CF-F-134",
  "name": "usesSleeve",
  "kind": "function",
  "what_it_is_for": "Where an account's spendable cash lives: investment accounts use the cash_balance SLEEVE; cash accounts (checking/savings) and property hold their money in `balance`.",
  "formula_in_words": "True for an investment account (not a cash or property account) whose balance is worked out from its holdings, or that records a cash figure of its own.",
  "handed": "const usesSleeve = (a: AssetAccount)",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)"
  ]
 },
 {
  "id": "MK-CF-F-135",
  "name": "availableCash",
  "kind": "function",
  "what_it_is_for": "The cash an account can spend right now: the uninvested cash inside an investment account, or the whole balance of a bank account.",
  "formula_in_words": "For such an account (usesSleeve): its cash. For any other: its balance.",
  "handed": "const availableCash = (a: AssetAccount)",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-CF-F-137",
  "name": "findPos",
  "kind": "function",
  "what_it_is_for": "Finds the holding a transaction refers to, by the holding's own identifier or by its ticker.",
  "formula_in_words": "The holding in the account with the record's holding id, or else with the record's ticker (the record's ticker read in capitals).",
  "handed": "const findPos = (a: AssetAccount, t: Transaction)"
 },
 {
  "id": "MK-CF-F-140",
  "name": "periodsAYear",
  "kind": "function",
  "what_it_is_for": "How many pay periods a year a pay frequency has, taken as 12 when it is monthly or not stated.",
  "formula_in_words": "Pay periods in a year: hourly 2,080, weekly 52, every two weeks 26, monthly 12, yearly 1. Any other frequency: 12.",
  "handed": "const periodsAYear = (e: BasePayEntry): number"
 },
 {
  "id": "MK-CF-F-148",
  "name": "inMonth",
  "kind": "function",
  "what_it_is_for": "Does this logged expense fall in the month `ym` (\"2026-08\")?",
  "formula_in_words": "True when the expense's date begins with the year-month asked for.",
  "handed": "export const inMonth = (e: LoggedExpense, ym: string): boolean"
 }
]
```

## Formulas these cards lean on

5 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-CF-F-060",
  "name": "salaryGrossByMonth",
  "what_it_is_for": "Per-month GROSS base salary, Jan→Dec.",
  "formula_in_words": "Each earner's twelve months of gross pay (wageGrossByMonth), added month by month."
 },
 {
  "id": "MK-CF-F-082",
  "name": "salaryAnnual",
  "what_it_is_for": "Salary income for the year = sum of the per-month gross salary.",
  "formula_in_words": "The twelve months of gross salary (salaryGrossByMonth) added."
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
  "id": "MK-CF-F-195",
  "name": "monthsLeftInYear",
  "what_it_is_for": "Months left in the year INCLUDING the current one — December counts as 1, never 0.",
  "formula_in_words": "12 − the number of months already finished this year: 12 in January, 1 in December. The current month counts as left."
 }
]
```
