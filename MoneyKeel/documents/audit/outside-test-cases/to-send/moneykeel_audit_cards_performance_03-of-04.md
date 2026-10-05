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

# The cards — batch "performance 03"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "performance 03"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface AllocSlice { key: string; value: number; pct: number; }

export interface CapGains { longGain: number; shortGain: number; totalGain: number; }

export interface LookBackResult {
  stayed: LookBackLeg;      // left where it was
  moved: LookBackLeg;       // moved to the other holding
  difference: number;       // moved.endValue − stayed.endValue (signed: negative = the move would have LOST)
  months: number;
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

export interface TrendPoint { date: string; value: number; bench: number; }
```

## The cards

```json
[
 {
  "id": "MK-PF-F-033",
  "name": "quantityWithUnit",
  "kind": "function",
  "what_it_is_for": "\"3 shares\", \"1 coin\", \"2 contracts\" — the quantity printed with its unit, singular when it is one.",
  "formula_in_words": "The quantity followed by its unit (quantityUnit); the unit loses its final s when the quantity is exactly 1.",
  "handed": "export function quantityWithUnit(p: Pick<Position, 'kind' | 'unit'>, qty: number, format: (n: number) => string = String): string",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-NW-F-102",
  "name": "rateWhereItRefuses",
  "kind": "function",
  "what_it_is_for": "THE EXACT RATE PER YEAR, FOR ONE WINDOW — what stands in where the window return refuses.",
  "formula_in_words": "Nothing when the beginning value is zero or less. Treats the beginning value as money put in on the day it is read for, adds each deposit and withdrawal of the period on its own date, and solves for the yearly rate at which those grow into the ending value (moneyWeightedReturn). Nothing when no rate can be found or the span is under 30 days.",
  "handed": "export function rateWhereItRefuses(input: {\n  beginning: number;\n  /** The window's own records, already filtered to it. */\n  windowLedger: any[];\n  ending: number;\n  /** The day the beginning is read at — the day before the window opens. */\n  beginningAsOf: string;\n  today: string;\n}): number | null",
  "inputs_it_reads": [
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-PF-F-004",
  "name": "marketValue",
  "kind": "function",
  "what_it_is_for": "What is this holding worth right now?",
  "formula_in_words": "Shares × price × the contract multiplier; 0 when there is no price.",
  "handed": "export function marketValue(p: Position, price: number | null | undefined): number",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-PF-F-005",
  "name": "unrealizedGain",
  "kind": "function",
  "what_it_is_for": "Unrealized gain = market value − cost basis (null price → 0).",
  "formula_in_words": "Market value − cost; 0 when there is no price.",
  "handed": "export function unrealizedGain(p: Position, price: number | null | undefined): number",
  "inputs_it_reads": [
   "MK-XS-I-007 purchase price and date (per lot)"
  ]
 },
 {
  "id": "MK-PF-F-006",
  "name": "capGains",
  "kind": "function",
  "what_it_is_for": "If I sold this today, how much of the gain is long-term and how much short-term?",
  "formula_in_words": "With no price: all zero. For each purchase with shares and a cost per share above zero: gain = shares × (price − cost per share). It is long-term when today is after the first anniversary of the purchase date — held MORE than one year — and short-term otherwise; a purchase with no valid date counts as short-term. Returns the long-term total, the short-term total and their sum. The contract multiplier is not applied here.",
  "handed": "export function capGains(p: Position, price: number | null | undefined, now: Date = new Date()): CapGains",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)"
  ]
 },
 {
  "id": "MK-PF-F-007",
  "name": "totalROI",
  "kind": "function",
  "what_it_is_for": "Total return since purchase = gain / cost basis (decimal).",
  "formula_in_words": "Unrealised gain ÷ cost. Nothing when there is no price or the cost is zero or less.",
  "handed": "export function totalROI(p: Position, price: number | null | undefined): number | null",
  "inputs_it_reads": [
   "MK-XS-I-007 purchase price and date (per lot)"
  ]
 },
 {
  "id": "MK-PF-F-010",
  "name": "periodReturn",
  "kind": "function",
  "what_it_is_for": "Price return of a ticker over a period (decimal).",
  "formula_in_words": "End = the latest close. Start = the last close on or before the period's start date — or, when every price on record is later than that date, the FIRST close on record. Return = end ÷ start − 1. For 2Y it is given as a yearly rate: (end ÷ start) to the power one half, − 1. Nothing when there are no prices or the start close is zero or less.",
  "handed": "export function periodReturn(series: PriceSeries | null | undefined, period: Period, now = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-012",
  "name": "earliestPurchaseDate",
  "kind": "function",
  "what_it_is_for": "Earliest dated lot — the day this holding became YOUR money.",
  "formula_in_words": "The earliest purchase date among the holding's purchases that carry a valid date; nothing when none does.",
  "handed": "export function earliestPurchaseDate(p: Position): string | null",
  "inputs_it_reads": [
   "MK-XS-I-007 purchase price and date (per lot)"
  ]
 },
 {
  "id": "MK-PF-F-016",
  "name": "attribution",
  "kind": "function",
  "what_it_is_for": "Per-holding contribution to the portfolio's period return = weight × the holding's return (pts).",
  "formula_in_words": "For each holding with a period return and a value above zero: weight = its value ÷ the total value of all holdings; contribution = weight × its period return. Sorted, largest contribution first. Empty when the total is zero or less.",
  "handed": "export function attribution(rows: PerformanceRow[]): { position: Position; contribution: number; weight: number }[]"
 },
 {
  "id": "MK-PF-F-017",
  "name": "allocation",
  "kind": "function",
  "what_it_is_for": "How is my invested money spread?",
  "formula_in_words": "Value by kind of holding (a holding with no kind counts as other), plus cash when above zero. Share = value ÷ total, as a percent rounded to one decimal. Sorted, largest first. Empty when the total is zero or less.",
  "handed": "export function allocation(rows: PerformanceRow[], cash = 0): AllocSlice[]",
  "inputs_it_reads": [
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-PF-F-018",
  "name": "portfolioTrend",
  "kind": "function",
  "what_it_is_for": "How has my portfolio moved over the period, against its benchmark?",
  "formula_in_words": "Thirteen evenly spaced dates from the period's start to today. Value at each date = TODAY'S share count × the close on or before that date, added over the holdings (a holding with no price counts as zero). Yardstick line = the starting value × (yardstick close ÷ its close at the start); it equals the value line where the yardstick has no price. Empty with no holdings.",
  "handed": "export function portfolioTrend(\n  positions: Position[],\n  priceOf: (t: string) => PriceSeries | null | undefined,\n  period: Period,\n  benchTickerSym = 'SPY',\n  now = new Date(),\n): TrendPoint[]",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-019",
  "name": "portfolioPeriodReturn",
  "kind": "function",
  "what_it_is_for": "Value-weighted portfolio period return across holdings that have one (decimal), or null.",
  "formula_in_words": "Over the holdings that have a period return and a value above zero: their returns averaged, weighted by market value. Nothing when there are none.",
  "handed": "export function portfolioPeriodReturn(rows: PerformanceRow[]): number | null"
 },
 {
  "id": "MK-PF-F-021",
  "name": "periodDollarDelta",
  "kind": "function",
  "what_it_is_for": "The DOLLAR change implied by a period return on today's total — the approved Home hero shows \"up $11,200 (1.4%) this month\": dollars AND percent from the SAME measured return, so the two figures can never disagree (one concept, one source).",
  "formula_in_words": "The dollars a return stands for: today's total × return ÷ (1 + return), rounded to whole dollars. 0 when either input is not a number or the return is −100% or worse.",
  "handed": "export function periodDollarDelta(currentTotal: number, periodReturn: number): number"
 },
 {
  "id": "MK-PF-F-022",
  "name": "factorOverMonths",
  "kind": "function",
  "what_it_is_for": "Price factor over the trailing window: last close ÷ the close at (now − months).",
  "formula_in_words": "Nothing with fewer than two prices. Cut-off = today moved back the given number of months. Nothing when the first price on record is later than the cut-off — the record does not reach back that far. Start = the last price on or before the cut-off. Factor = latest close ÷ start close; nothing when the start close is zero or less.",
  "handed": "export function factorOverMonths(series: PriceSeries | null | undefined, months: number, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-023",
  "name": "lookBack",
  "kind": "function",
  "what_it_is_for": "What if I had moved this money?",
  "formula_in_words": "Nothing unless the amount is above zero and both funds have a factor (factorOverMonths). Stayed: end value = amount × the factor of the fund it was in; change = end value − amount; percent = (factor − 1), as a percent to one decimal. Moved: the same with the other fund's factor. Difference = moved end value − stayed end value.",
  "handed": "export function lookBack(amount: number, fromSeries: PriceSeries | null | undefined, toSeries: PriceSeries | null | undefined, months: number, now: Date = new Date()): LookBackResult | null"
 }
]
```

## Formulas these cards lean on

4 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-PF-F-025",
  "name": "historyIsComplete",
  "what_it_is_for": "True iff every measured account's story begins IN the ledger (openable honestly).",
  "formula_in_words": "True only when every named account has at least one record and its earliest record is opening cash, an opening position or a deposit."
 },
 {
  "id": "MK-PF-F-026",
  "name": "moneyWeightedReturn",
  "what_it_is_for": "XIRR via bisection — deterministic, no derivative games.",
  "formula_in_words": "No answer, reason no history, unless the history is complete (historyIsComplete) and there is at least one amount of money put in. Reason too short when fewer than 30 days have passed since the first movement. Otherwise it solves, by halving the range between −95% and +1,000% a year up to 100 times, for the yearly rate at which the dated movements and the current value net to zero (npv). Reason no solution when no rate in that range does."
 },
 {
  "id": "MK-PF-F-030",
  "name": "npv",
  "what_it_is_for": "The value today of a set of dated money movements plus an ending value, at a given yearly rate; the money-weighted return is the rate that makes this come to zero.",
  "formula_in_words": "Each money movement ÷ (1 + rate) to the power of (days since the first movement ÷ 365), added up, plus the ending value divided the same way for the end date."
 },
 {
  "id": "MK-PF-F-032",
  "name": "quantityUnit",
  "what_it_is_for": "The unit written beside a quantity: the person's own where they entered one, otherwise coins for crypto, contracts for options, ounces for commodities and shares for everything else.",
  "formula_in_words": "The person's own unit where they entered one; otherwise coins for crypto, contracts for options, ounces for commodities, and shares for everything else."
 }
]
```
