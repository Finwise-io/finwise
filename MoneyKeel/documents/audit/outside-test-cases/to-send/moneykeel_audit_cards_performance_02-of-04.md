# Brief — write the test cases, from outside

MoneyKeel · calculation audit · v02 · 2026-10-04

## What this is

MoneyKeel is a personal-finance app. Every number it shows comes from a small function, and groups of
functions are run by an **orchestrator** — the one function a screen asks for a whole answer (for
example, "how are my investments doing").

Those functions already have tests, and the tests pass. Five of the functions were still wrong. The
reason: the person who wrote each function also wrote its test, from the same understanding. A wrong
rule produced a wrong example that agreed with it.

**Your job is to write test cases that do not share that understanding.** You are the outside judge.

## The one rule that matters

**You are not shown the code inside any function, the existing tests, or any answer the app gives. Do
not ask for them.**

If you saw them you would start to agree with them. Work only from what a function is *for*, the
owner's written decisions, and ordinary arithmetic and finance.

You are also working alone. Another model is doing the same job separately. Do not try to guess what
it will write. Where your answer, its answer and the app's answer differ, the owner sees all three.

## What you are given

Below this brief is a batch of **cards**, one for each function or orchestrator. A card holds:

| Field | What it is |
|---|---|
| `id`, `name` | Its identifier and name. Quote the `id` exactly in every case you write. |
| `kind` | `orchestrator` or `function`. |
| `what_it_is_for` | The question it answers, in one sentence. |
| `handed` | What it is given, as the code names it. Type names are the app's own; they are spelled out once, above the cards. |
| `gives_back` | What it returns. |
| `inputs_it_reads` | The registered inputs behind it, each with a plain name. |
| `figures_it_feeds` | The numbers on screen it produces: the words beside each, its unit, what it answers, and when it must refuse to give a number. |
| `rules` | The rules it must follow, each marked with **who said it**. |
| `approved_drawing` | On a few orchestrators: a worked household the owner approved, with numbers that add up. |

### Who said a rule — read this before you use one

- `"said_by": "owner"` — the owner's decision, in his own words, with its number and date. **Settled.**
- `"said_by": "author"` — the in-house author's record of how the function behaves. **A claim, not a
  fact.** Use it to understand what is intended. If it looks wrong, or contradicts an owner rule, an
  approved drawing or ordinary arithmetic, do not follow it — write the case the way you believe is
  right and say so in `notes`.

Comments inside `handed`, and inside the types above the cards, are the author's too — the same
caution applies.

A card has no formula on it and no worked answer from the app. That is deliberate.

## What to write

**Five cases for every card: two easy, two complex, one edge.**

| Kind | What it is |
|---|---|
| **Easy** (2) | One thing happening. Round numbers. A person can check the answer in their head in under a minute. The two must test different things, not the same thing with different numbers. |
| **Complex** (2) | At least three inputs that all change the answer, with unround, lifelike amounts and dates. Things interacting the way they do in a real household: two earners and rent and a bonus; money added halfway through a period; one account linked and one entered by hand. |
| **Edge** (1) | The place where a rule changes, or where something is missing. Zero. Nothing entered. A negative. A date exactly on a boundary. An amount exactly at a threshold. A record that starts after the period asked about. |

A small function still gets five. For one that only answers yes or no, or tidies a word, "complex"
means the awkward inputs: mixed capitals, stray spaces, a value on each side of the line.

### Go where the mistakes were

Each of the five errors sat in a case nobody had tried. Across your cases for a batch, make sure these
shapes appear wherever a card's inputs allow them:

1. Rent, or interest and dividends, **together with** a wage whose take-home the person typed in.
2. A holding described the way a broker link describes it, not the way a person types it.
3. An account holding **cash as well as** investments.
4. A period that reaches back **further than the record does**.
5. A period of **exactly** one year, and exactly two years, to the day.
6. Money added or taken out **inside** the period, large against what was already there.
7. Two people in the household, earning differently.
8. A debt paid this month, a debt not yet paid, and a debt with no payment required.
9. Nothing entered at all.

## How to work out the expected answer

1. **By hand, from the rule, showing every step.** A reader must be able to follow your arithmetic
   line by line without trusting you.
2. **Keep full precision until the end.** Then give two values: the exact one (at least four decimal
   places) and the one a person would see — whole dollars for totals and balances, two decimals for
   prices, expenses and percentages.
3. **"No answer" is a valid answer.** Where an input is missing or a rule cannot honestly produce a
   number, the right result is a refusal — the app shows a dash and says why. Write
   `"expected": "REFUSES"` and the reason. Never invent a default number.
4. **If the card does not settle the answer, do not guess.** Mark the case `RULE UNCLEAR`, write
   each reading you can see, and give the answer under each. An unclear rule is a finding, and one of
   the most useful things you can send back.
5. **If you cannot tell what a function is for, do not write cases for it.** List it under
   `could_not_test` with what is missing from the card.
6. **Cite the rule.** Every case names what its answer rests on: an owner decision number, the
   approved drawing, or — for tax and contribution limits — the published table and its year.

## Orchestrators — two more things to check

An orchestrator's answer has parts. For each orchestrator, at least one complex case must state, as
separate expected values:

- **The parts add up to the whole.** Every row shown is a row in the total. If the answer is a list
  of rows and a total, give each row and the total, and show that they sum.
- **The same input gives the same number everywhere it is used.** Where `figures_it_feeds` shows a
  figure on more than one screen, say so in the case, so the two can be compared.

Where a card carries an `approved_drawing`, one of your cases must be that household exactly as
drawn. Your other four must be your own.

## What to send back

One JSON reply for the batch, exactly in this shape and nothing outside it. Use your own plain names
for inputs; do not invent code names. They will be mapped onto the app afterwards, and **your numbers
will not be changed in the mapping** — a case that cannot be mapped goes back to the owner, not into
a drawer.

```json
{
  "batch": "cashflow 01",
  "written_by": "claude | gemini",
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
      "rule": "Approved drawing income-end-to-end v07, frame 16; its rule 5: the take-home someone enters IS the take-home",
      "confidence": "high",
      "notes": ""
    }
  ],
  "could_not_test": [
    { "id": "MK-XX-F-000", "missing": "What is missing from the card." }
  ]
}
```

`kind` is one of `easy`, `complex`, `edge`. `confidence` is `high`, `medium` or `low`; anything
below `high` needs a sentence in `notes` saying why.

## Before you send

- Five cases for every card you could test — two easy, two complex, one edge — and every other card
  listed under `could_not_test`.
- Every case quotes its card's `id` exactly.
- Every case shows its working, and the working reaches the expected value.
- Every list of rows sums to its total.
- No two cases for one card are the same case with different numbers.
- No answer was taken from, or adjusted towards, anything the app produces.

---

# The cards — batch "performance 02"

15 cards, so 75 cases. Put `"batch": "performance 02"` in your reply.

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
  "handed": "export function windowStartKey(period: string, recordDates: string[], today: string): string"
 },
 {
  "id": "MK-NW-F-091",
  "name": "pricedGainOf",
  "kind": "function",
  "what_it_is_for": "What the priced holdings gained over the period in dollars: the true gain for a holding bought inside the period, and the price move's share of today's value for any other.",
  "handed": "export function pricedGainOf(\n  rows: { cappedSince?: string | null; gain?: number; periodReturn?: number | null; marketValue?: number }[],\n): number"
 },
 {
  "id": "MK-NW-F-092",
  "name": "investmentAccountIdsOf",
  "kind": "function",
  "what_it_is_for": "Which accounts count as investments: those holding stocks and funds, bonds and CDs, alternatives or a mix, and never cash or property.",
  "handed": "export function investmentAccountIdsOf(\n  accounts: { asset_id?: string | number }[],\n  classOf: (a: any) => string,\n): Set<string>"
 },
 {
  "id": "MK-NW-F-103",
  "name": "investmentRecordDates",
  "kind": "function",
  "what_it_is_for": "THE DAYS THE RECORD HOLDS AN INVESTMENT VALUE FOR, oldest first.",
  "handed": "export function investmentRecordDates(snapshotDays: any[], investmentAccountIds: Set<string>): string[]"
 },
 {
  "id": "MK-PF-F-001",
  "name": "totalShares",
  "kind": "function",
  "what_it_is_for": "How many shares of a holding are held, added up across every purchase.",
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
  "handed": "export function startDateFor(period: Period, now: Date): Date"
 },
 {
  "id": "MK-PF-F-009",
  "name": "latestClose",
  "kind": "function",
  "what_it_is_for": "What is the most recent price we hold for this?",
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
  "handed": "export function topHoldingConcentration(rows: PerformanceRow[]): { ticker: string; pct: number; value: number } | null"
 },
 {
  "id": "MK-PF-F-020",
  "name": "portfolioBenchReturn",
  "kind": "function",
  "what_it_is_for": "Value-weighted benchmark (\"the market, matched to your mix\") return across holdings that have one (decimal), or null.",
  "handed": "export function portfolioBenchReturn(rows: PerformanceRow[]): number | null"
 }
]
```
