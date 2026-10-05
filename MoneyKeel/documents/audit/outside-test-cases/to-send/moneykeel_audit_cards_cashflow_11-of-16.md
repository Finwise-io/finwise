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

# The cards — batch "cashflow 11"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "cashflow 11"` in your reply.

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
export interface GuaranteedRow { source: string; amount: number; month: number; year: number; day?: number }

export interface PaycheckOptions {
  accounts?: AssetAccount[];         // nest egg = the retirement-earmarked share (live balances)
  nestEgg?: number;                  // explicit override (projection mode)
  liabilities?: Debt[];              // deferred debts surface via the grid
  sim: PaycheckSimInputs;            // ADOPTED from Plan's shared assumptions
  now?: Date;
  chanceFloor?: number;              // default 80 — the 'Likely' threshold
}

export interface PaycheckSimInputs {
  current_age: number;
  horizon_age: number;
  mean_return: number;               // decimal
  vol_return: number;                // decimal
  inflation: number;                 // decimal
  seed?: number;
  paths?: number;
}

export interface PaycheckYear {
  months: PaycheckMonth[];
  thisMonth: PaycheckMonth;
  thisYear: number;                  // EXACT sum of the 12 months — never monthly × 12
  safeDrawMonthly: number;
  drawRateFlag: 'ok' | 'high' | null;   // 'high' = above the classic 4%/year guideline (inform, never advise)
  guaranteedMissing: boolean;        // no guaranteed income entered → the UI prompts, never fakes $0
  nestEgg: number;
}

export interface ReviewContext {
  /** the account's earlier transactions (any window; the function applies the 90-day cut itself) */
  history: Transaction[];
  /** payees already confirmed as known, per account (the only learning in v1) */
  knownPayees?: Record<string, string[]>;
  /** id generator (injectable for determinism in tests) */
  makeId?: () => string;
  now?: Date;
}

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
  direction?: 'IN' | 'OUT';  // TRANSFER_IN_KIND from a broker: which way the shares went. The type
                             // alone does not say, and without it a return cannot be measured
                             // across the day (stored since 2026-10-04; older rows carry none).
  note?: string;
  source?: 'manual' | 'connected';  // F10: only connected-account rows are ever reviewed for a
                                    // "worth a look" flag — hand-typed entries are NEVER questioned.
                                    // Absent = manual (every row recorded before F1 sync exists).
  created_at: string;        // ISO — when it was entered (audit)
  undo_prev?: AssetAccount[]; // pre-apply copies of the touched accounts — lets a delete reverse
                              // this row's balance effect exactly (P0: ledger and balances must
                              // never drift; rows recorded before this field use inverseOf()).
}

export interface TxnFlag {
  flag_id: string;
  transaction_ids: string[];      // one id, or several for a combined odd-pattern card
  account_id: string;
  reason: FlagReason;
  /** The comparison figure the rule used, stored AT FLAG TIME so the explanation never drifts:
   *  unusually_large → the typical (median) money-out; odd_pattern → the day's combined total;
   *  first_time_payee → null (the fact is the comparison). */
  comparison: number | null;
  amount: number;                 // the flagged amount (combined total for odd_pattern)
  payee: string | null;           // note text of the flagged row of activity (normalized for matching)
  date: string;                   // the transaction's date
  status: FlagStatus;
  created_at: string;
  resolved_at?: string;
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-105",
  "name": "guaranteedRows",
  "kind": "function",
  "what_it_is_for": "The dated guaranteed-income rows for the next 12 months (the F2 grid seam).",
  "formula_in_words": "Nothing when the person's chosen income sources are listed without retirement income. Otherwise, over the twelve months starting with the current one, for Social Security, pension, annuity and other retirement income with an amount above zero: monthly → the amount in every month; quarterly → the amount in four months, three apart, starting at its named month (the current month when none); yearly → the amount once, in its named month (the current month when none). The amount is the amount of EACH PAYMENT.",
  "handed": "export function guaranteedRows(op: OnboardingProfile | null, now: Date = new Date()): GuaranteedRow[]",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-040 whether a stream is already being received"
  ]
 },
 {
  "id": "MK-CF-F-106",
  "name": "solveSafeDraw",
  "kind": "function",
  "what_it_is_for": "Largest level monthly draw that keeps chance-of-success ≥ the floor.",
  "formula_in_words": "0 when the savings are zero or less. Otherwise the largest monthly draw from the savings, on top of the guaranteed income, at which the retirement simulation (1,000 futures, fixed seed 42) still lasts to the horizon in at least 80 of 100. It is tried first at twice (savings ÷ years ÷ 12), $100 at least; then narrowed by halving 12 times; then rounded DOWN to the nearest $5.",
  "handed": "export function solveSafeDraw(nestEgg: number, guaranteedMonthlyAvg: number, sim: PaycheckSimInputs, chanceFloor = 80): number",
  "inputs_it_reads": [
   "MK-XS-I-018 retirement age",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-029 inflation rate",
   "MK-XS-I-043 their own retirement contribution"
  ]
 },
 {
  "id": "MK-CF-F-107",
  "name": "buildPaycheckYear",
  "kind": "function",
  "what_it_is_for": "Build the month-by-month paycheck.",
  "formula_in_words": "Guaranteed rows from guaranteedRows; savings = the figure given, otherwise the accounts set aside for retirement. Safe draw = solveSafeDraw, with average guaranteed income in a month = the rows' total ÷ 12. Draw flag: high when safe draw × 12 ÷ savings is above 4.5%; ok otherwise; none with no savings or no draw. For each of twelve months from the current one: guaranteed total = that month's rows; bills = that month's big bills, everyday expenses left out; safe to spend = guaranteed total + safe draw − bills. This year = the twelve added.",
  "handed": "export function buildPaycheckYear(op: OnboardingProfile | null, opts: PaycheckOptions): PaycheckYear",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
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
  "id": "MK-CF-F-108",
  "name": "isMoneyOut",
  "kind": "function",
  "what_it_is_for": "Money leaves the account: withdrawals, fees, and transfers with no recognized counter-account.",
  "formula_in_words": "True for a withdrawal, a fee, or a transfer with no receiving account on record.",
  "handed": "export function isMoneyOut(t: Transaction): boolean"
 },
 {
  "id": "MK-CF-F-109",
  "name": "reviewTransactions",
  "kind": "function",
  "what_it_is_for": "Review new transactions against an account's history.",
  "formula_in_words": "Flags, in this order; a record is flagged once. (1) Possible duplicate — any new money-out above zero that has an earlier one on the same account with the same amount (within half a cent) and the same payee, 2 days apart or less. (2) For money-out from a LINKED account only — unusually large: with 5 or more money-outs on that account within 90 days of it, at least 3 × their middle value AND at least $500; with fewer than 5, at least $1,000. (3) Otherwise first-time payee — a payee not seen on that account in those 90 days and not on the known list, for $250 or more. (4) Odd pattern — 3 or more money-outs from one account on one day (the new unflagged ones plus earlier ones that day) adding to $1,000 or more.",
  "handed": "export function reviewTransactions(newOnes: Transaction[], ctx: ReviewContext): TxnFlag[]",
  "inputs_it_reads": [
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-010 transaction words (the institution's own wording)",
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-CF-F-110",
  "name": "flagComparisonText",
  "kind": "function",
  "what_it_is_for": "The plain-English comparison sentence for the detail view — fixed, human-reviewed templates.",
  "formula_in_words": "The sentence for a flag. Unusually large, with a typical figure: it names the typical amount in whole dollars and how many times larger this one is, rounded to a whole number; with none: it says anything over $1,000 is looked at twice. First-time payee and possible duplicate each have a fixed sentence. Several in one day: it names how many and their total in whole dollars.",
  "handed": "export function flagComparisonText(f: TxnFlag): string",
  "inputs_it_reads": [
   "MK-XS-I-010 transaction words (the institution's own wording)"
  ]
 },
 {
  "id": "MK-CF-F-111",
  "name": "applyTransaction",
  "kind": "function",
  "what_it_is_for": "Apply one transaction to the accounts (pure).",
  "formula_in_words": "What one record does to the accounts. Adjustment: nothing. Opening position: adds the shares at their price as a purchase. Opening cash: sets the account's cash to the amount. Deposit: cash up by the amount. Withdrawal or fee: cash down by the amount. Buy: cash down by shares × price, and the shares added as a purchase. Sale with shares: sells at most the shares held — cash up by the shares sold × price, earliest purchases reduced first; a sale with no shares but an amount lowers the balance by the amount, never below 0. Transfer: cash down on the sending account, and up on the receiving one when there is one. Transfer of a holding: the whole holding moves to the other account. Dividend, interest or coupon: when reinvested with shares and a price, a purchase is added to a holding already there; otherwise cash up by the amount.",
  "handed": "export function applyTransaction(accounts: AssetAccount[], t: Transaction): AssetAccount[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-008 transaction amount"
  ]
 },
 {
  "id": "MK-CF-F-112",
  "name": "makeTransaction",
  "kind": "function",
  "what_it_is_for": "Build a full transaction (id + created_at) from a partial.",
  "formula_in_words": "The record as given, with its ticker in capitals, a new id and the time it was made.",
  "handed": "export function makeTransaction(p: Omit<Transaction, 'id' | 'created_at'>): Transaction"
 },
 {
  "id": "MK-CF-F-113",
  "name": "affectedAccountIds",
  "kind": "function",
  "what_it_is_for": "The account ids a transaction can touch.",
  "formula_in_words": "The record's account, and the receiving account when there is one.",
  "handed": "export function affectedAccountIds(t: Transaction): EntityId[]"
 },
 {
  "id": "MK-CF-F-114",
  "name": "undoSnapshot",
  "kind": "function",
  "what_it_is_for": "Deep copies of the affected accounts, taken BEFORE applyTransaction.",
  "formula_in_words": "A full copy of each account the record touches, as it stands before the record is applied.",
  "handed": "export function undoSnapshot(accounts: AssetAccount[], t: Transaction): AssetAccount[]"
 },
 {
  "id": "MK-CF-F-115",
  "name": "restoreUndo",
  "kind": "function",
  "what_it_is_for": "Restore the affected accounts to the transaction's pre-apply copies (pure).",
  "formula_in_words": "Each account the record touched is put back to the copy saved with it; the other accounts are unchanged.",
  "handed": "export function restoreUndo(accounts: AssetAccount[], t: Transaction): AssetAccount[]"
 },
 {
  "id": "MK-CF-F-116",
  "name": "inverseOf",
  "kind": "function",
  "what_it_is_for": "Legacy fallback for rows recorded before undo_prev: a synthetic opposite transaction.",
  "formula_in_words": "The record that undoes one. A deposit → a withdrawal; a withdrawal or a fee → a deposit; a transfer between two accounts → the same transfer the other way; a transfer out with no receiving account → a deposit; a dividend, interest or coupon paid in cash → a withdrawal; an adjustment → itself. Nothing for a buy, a sale, an opening record, a transfer of a holding or a reinvested payment.",
  "handed": "export function inverseOf(t: Transaction): Transaction | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)"
  ]
 },
 {
  "id": "MK-CF-F-119",
  "name": "investmentIncomeAnnual",
  "kind": "function",
  "what_it_is_for": "Investment income (cash dividends/interest/coupons, not reinvested) over the trailing window — feeds the Income module.",
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date a year ago), not reinvested, added.",
  "handed": "export function investmentIncomeAnnual(txns: Transaction[], now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-CF-F-120",
  "name": "pctBaseMonthly",
  "kind": "function",
  "what_it_is_for": "A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the expenses-plan screen uses (modules.tsx SpendingEditor → takeHomeMonthly).",
  "formula_in_words": "The twelve months of take-home (incomeMonthlyGrid, take-home) added ÷ 12.",
  "handed": "function pctBaseMonthly(op: OnboardingProfile | null): number"
 },
 {
  "id": "MK-CF-F-121",
  "name": "zero12",
  "kind": "function",
  "what_it_is_for": "Twelve zeros: an empty year, one slot for each month.",
  "formula_in_words": "Twelve zeros.",
  "handed": "function zero12(): number[]"
 }
]
```

## Formulas these cards lean on

6 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

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
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income."
 }
]
```
