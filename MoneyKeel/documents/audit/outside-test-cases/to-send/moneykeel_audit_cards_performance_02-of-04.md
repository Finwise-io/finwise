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

# The cards — batch "performance 02"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "performance 02"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface CategoryEarned {
  key: string;
  label: string;
  /** Dividends and interest actually RECEIVED in the window, from the records only. */
  earned: number;
  /** That class’s return over the window, value-weighted — null where it cannot be calculated. */
  ret: number | null;
  /** True where `ret` is a STATED yearly rate (a bond or CD's own coupon), printed with "/year" —
   *  Performance v17: "a /year figure is that category's yearly pace". */
  yearly: boolean;
}

export interface PerformanceRow {
  position: Position;
  price: number | null;
  marketValue: number;
  costBasis: number;
  gain: number;
  totalROI: number | null;        // since purchase
  periodReturn: number | null;    // YOUR return over the window (capped at purchase — see cappedSince)
  benchTicker: string;
  benchReturn: number | null;     // benchmark over the SAME dates — honest comparison
  beatBy: number | null;          // periodReturn − benchReturn
  cappedSince: string | null;     // 'YYYY-MM-DD' when the window starts at YOUR purchase, else null
}

export type Period = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '2Y';

export interface Position {
  position_id: EntityId;
  ticker: string;               // e.g. 'AAPL', 'SPY', 'VTI'
  label?: string;               // display name, e.g. 'Apple Inc.'
  kind?: string;                // ASSET_KINDS id, for benchmark mapping
  asset_class?: 'stock_etf' | 'bond' | 'other' | 'cash';   // explicit class (import/sync sets it; wins over kind); 'cash' = money-market funds a broker didn't flag (live-verified 2026-07-19)
  class_source?: 'user';        // B7: the person set the class themselves — it survives every sync
  class_flag?: { was: string; evidenceSays: string };   // B7: a sync wanted to move the class; kept + flagged instead
  last_price?: number;          // broker's daily mark (connected accounts — no live feed needed)
  multiplier?: number;          // Q06 (founder, 2026-08-26): an option contract is 100 shares unless the broker or the person states otherwise
  unit?: QuantityUnit;          // Q09 (founder, 2026-08-26): a quantity is never shown without its unit
  lots: Lot[];
}

export interface PriceSeries { ticker: string; points: { date: string; close: number }[]; }
```

## The cards

```json
[
 {
  "id": "MK-NW-F-084",
  "name": "categoryEarnings",
  "kind": "function",
  "what_it_is_for": "What each category of investment paid in dividends and interest over the period, and that category's return.",
  "formula_in_words": "Uses the dividend and interest records dated on or after the period's first day, amounts taken as positive. A record that names a ticker goes to that holding's category: bond → Bonds & CDs; cash → Cash in this account; anything else → Stocks / Funds; a ticker with no holding on record → Stocks / Funds for a dividend, Bonds & CDs for interest. A record that names NO ticker → Stocks / Funds for a dividend, Cash in this account for interest. A category's return = its holdings' period returns averaged, weighted by market value, counting only holdings with a return and a value above zero; nothing when there are none. Bonds & CDs shows a stated YEARLY rate instead — each bond account's rate weighted by its balance — when every bond account with a balance states a rate and no bond is held as a holding. On day one all three categories are returned with no return; any other day only the categories that earned more than zero.",
  "handed": "export function categoryEarnings(input: {\n  /** every record, unfiltered — this takes the window’s own */\n  transactions: any[];\n  /** the window’s first day, or null for \"since the record began\" */\n  windowStart: string | null;\n  /** each holding with its class and its own return, as buildPerformance produces them */\n  rows: { position?: { ticker?: string; kind?: string; asset_class?: string }; periodReturn?: number | null; marketValue?: number }[];\n  /** Every bond or CD held as its own account: what it is worth and the yearly rate it states. */\n  bonds?: { balance?: number; coupon_rate?: number }[];\n  /** DAY ONE: every category is shown at $0 — \"every line fills in as days pass, the structure never\n   *  changes\" (Performance v17, phones 4 and 5). Any other day, a category that received nothing is\n   *  left out. */\n  dayOne?: boolean;\n}): CategoryEarned[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-090",
  "name": "windowStartKey",
  "kind": "function",
  "what_it_is_for": "The first day of a period: the day after the record's first day for Since, 1 January for This year, and the same day one month, one year or two years back for the others.",
  "formula_in_words": "Since: the day after the earliest recorded day, but never later than today; today when nothing is recorded. This year: 1 January of today's year. 1M, 3M, 6M, 1Y and 2Y: today moved back 1, 3, 6, 12 or 24 months. Any other label: 12 months back.",
  "handed": "export function windowStartKey(period: string, recordDates: string[], today: string): string"
 },
 {
  "id": "MK-NW-F-091",
  "name": "pricedGainOf",
  "kind": "function",
  "what_it_is_for": "What the priced holdings gained over the period in dollars: the true gain for a holding bought inside the period, and the price move's share of today's value for any other.",
  "formula_in_words": "For a holding bought inside the period: its whole gain (value − cost). For any other holding with a period return and a value above zero: value × (1 − 1 ÷ (1 + return)), which is today's value less its value when the period opened. Nothing for the rest. Added up.",
  "handed": "export function pricedGainOf(\n  rows: { cappedSince?: string | null; gain?: number; periodReturn?: number | null; marketValue?: number }[],\n): number"
 },
 {
  "id": "MK-NW-F-092",
  "name": "investmentAccountIdsOf",
  "kind": "function",
  "what_it_is_for": "Which accounts count as investments: those holding stocks and funds, bonds and CDs, alternatives or a mix, and never cash or property.",
  "formula_in_words": "The ids of the accounts whose class is Stocks / Funds, Bonds & CDs, Alternatives or Unclassified. Cash and property accounts are left out.",
  "handed": "export function investmentAccountIdsOf(\n  accounts: { asset_id?: string | number }[],\n  classOf: (a: any) => string,\n): Set<string>"
 },
 {
  "id": "MK-NW-F-103",
  "name": "investmentRecordDates",
  "kind": "function",
  "what_it_is_for": "THE DAYS THE RECORD HOLDS AN INVESTMENT VALUE FOR, oldest first.",
  "formula_in_words": "The dates of the recorded days that hold a value for at least one of the named accounts, oldest first. Empty when no accounts are named.",
  "handed": "export function investmentRecordDates(snapshotDays: any[], investmentAccountIds: Set<string>): string[]"
 },
 {
  "id": "MK-PF-F-001",
  "name": "totalShares",
  "kind": "function",
  "what_it_is_for": "How many shares of a holding are held, added up across every purchase.",
  "formula_in_words": "The shares of every purchase added up; a missing figure counts as zero.",
  "handed": "export function totalShares(p: Position): number",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)"
  ]
 },
 {
  "id": "MK-PF-F-002",
  "name": "costBasis",
  "kind": "function",
  "what_it_is_for": "What did I pay for this in total?",
  "formula_in_words": "Shares × cost per share, added up over every purchase, × the contract multiplier (100 for an option unless the holding states its own, otherwise 1).",
  "handed": "export function costBasis(p: Position): number",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-PF-F-003",
  "name": "avgCost",
  "kind": "function",
  "what_it_is_for": "The average price paid per share of a holding: its total cost divided by the shares held, or zero when no shares are held.",
  "formula_in_words": "Cost (costBasis) ÷ shares held; 0 when no shares are held. For an option the cost already includes the contract multiplier.",
  "handed": "export function avgCost(p: Position): number",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-032",
    "words_on_screen": "Price paid (average)",
    "unit": "money-cents",
    "what_it_answers": "What you paid per share, on average, for what you still hold.",
    "when_it_refuses": "No purchase price recorded.",
    "shown_on": [
     "/holding-detail"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0264",
    "date": "2026-09-09",
    "words": "full precision for calculation; display two decimals unless stated (whole dollars for totals, balances, projections; eight for coin quantities); fix the code in one pass"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0310",
    "date": "2026-08-20",
    "words": "decimal arithmetic — full precision, round once"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-032",
    "words": "Kept unrounded inside, rounded once at display (Q49) — rounding it early moved the total it multiplies back into."
   }
  ]
 },
 {
  "id": "MK-PF-F-008",
  "name": "startDateFor",
  "kind": "function",
  "what_it_is_for": "The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years.",
  "formula_in_words": "1M, 3M and 6M: today moved back that many months. 1Y and 2Y: today moved back that many years. This year: 1 January of today's year.",
  "handed": "export function startDateFor(period: Period, now: Date): Date"
 },
 {
  "id": "MK-PF-F-009",
  "name": "latestClose",
  "kind": "function",
  "what_it_is_for": "What is the most recent price we hold for this?",
  "formula_in_words": "The close of the last price on record; nothing when there are no prices.",
  "handed": "export function latestClose(series: PriceSeries | null | undefined): number | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-011",
  "name": "periodReturnSince",
  "kind": "function",
  "what_it_is_for": "Price return from an explicit start DATE to now (for purchase-capped windows).",
  "formula_in_words": "The same as periodReturn but measured from a given date: latest close ÷ the last close on or before that date (or the first close on record when all are later), − 1. Never turned into a yearly rate.",
  "handed": "export function periodReturnSince(series: PriceSeries | null | undefined, sinceISO: string, now = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-013",
  "name": "benchmarkTicker",
  "kind": "function",
  "what_it_is_for": "What should this holding be compared against?",
  "formula_in_words": "The market yardstick for a kind of holding: stocks and funds → SPY; fixed income and annuities → AGG; private equity → PSP; hedge funds → QAI; commodities → GLD; crypto → BTC; 529 → AOR; anything else or none → SPY.",
  "handed": "export function benchmarkTicker(kind?: string): string",
  "inputs_it_reads": [
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-PF-F-014",
  "name": "buildPerformance",
  "kind": "function",
  "what_it_is_for": "Build the per-holding rows for a period from positions + a price-series lookup.",
  "formula_in_words": "For each holding: price = latest close; market value, cost, unrealised gain and return on cost from the functions above. Bought = its earliest purchase date, or the date supplied when it has none. If it was bought AFTER the period's start it is capped: its period return is its return on cost, and the yardstick is measured since the purchase date. Otherwise its period return is the price return over the period, and the yardstick is measured over the same period. Beat-by = the holding's return − the yardstick's; nothing when either is missing.",
  "handed": "export function buildPerformance(\n  positions: Position[],\n  priceOf: (ticker: string) => PriceSeries | null | undefined,\n  period: Period,\n  now = new Date(),\n  purchaseDateOf?: (p: Position) => string | null,\n): PerformanceRow[]",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-PF-F-015",
  "name": "topHoldingConcentration",
  "kind": "function",
  "what_it_is_for": "The holding-concentration FACT (Invest main + the insights function share this one rule): the largest single holding as a % of invested money, reported only at 25%+ with 2+ holdings — below that it isn't a fact worth a card.",
  "formula_in_words": "Nothing when total value is zero or less or there are fewer than two holdings. Otherwise the holding with the largest value and its share of the total, rounded to a whole percent — reported only when that share is 25% or more.",
  "handed": "export function topHoldingConcentration(rows: PerformanceRow[]): { ticker: string; pct: number; value: number } | null"
 },
 {
  "id": "MK-PF-F-020",
  "name": "portfolioBenchReturn",
  "kind": "function",
  "what_it_is_for": "Value-weighted benchmark (\"the market, matched to your mix\") return across holdings that have one (decimal), or null.",
  "formula_in_words": "Over the holdings that have a yardstick return and a value above zero: the yardstick returns averaged, weighted by market value. Nothing when there are none.",
  "handed": "export function portfolioBenchReturn(rows: PerformanceRow[]): number | null"
 }
]
```

## Formulas these cards lean on

1 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-PF-F-010",
  "name": "periodReturn",
  "what_it_is_for": "Price return of a ticker over a period (decimal).",
  "formula_in_words": "End = the latest close. Start = the last close on or before the period's start date — or, when every price on record is later than that date, the FIRST close on record. Return = end ÷ start − 1. For 2Y it is given as a yearly rate: (end ÷ start) to the power one half, − 1. Nothing when there are no prices or the start close is zero or less."
 }
]
```
