# The cards — "pf module final — part 2 of 4"

13 cards, so 13 formula checks and 65 cases. Read the brief file moneykeel_audit_module_pf_for-the-outside-judge_v01.md first. Put `"batch": "pf module final — part 2"` in your reply.

```json
[
 {
  "id": "MK-PF-F-001",
  "name": "totalShares",
  "kind": "function",
  "what_it_is_for": "How many shares of a holding are held, added up across every purchase.",
  "formula_in_words": "The shares of every purchase added up. Nothing (unknown) when any purchase has no share count — a missing figure is never counted as zero; a share count of 0 is a count.",
  "handed": "export function totalShares(p: Position): number | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)"
  ]
 },
 {
  "id": "MK-PF-F-002",
  "name": "costBasis",
  "kind": "function",
  "what_it_is_for": "What did I pay for this in total?",
  "formula_in_words": "Shares × cost per share, added up over every purchase, × the contract multiplier (100 for an option unless the holding states its own, otherwise 1). A purchase with no shares adds nothing. Nothing (unknown) when a purchase has no share count, or has shares and no cost per share on record; a cost per share of 0 is a figure.",
  "handed": "export function costBasis(p: Position): number | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-PF-F-004",
  "name": "marketValue",
  "kind": "function",
  "what_it_is_for": "What is this holding worth right now?",
  "formula_in_words": "Shares × price × the contract multiplier, unrounded. 0 when no shares are held. Nothing (unknown) when there is no price, or the share count is unknown — shares with no price are worth something unknown, not 0.",
  "handed": "export function marketValue(p: Position, price: number | null | undefined): number | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-PF-F-005",
  "name": "unrealizedGain",
  "kind": "function",
  "what_it_is_for": "Unrealized gain = market value − cost basis (unknown when either is unknown — no price is no gain to state).",
  "formula_in_words": "Market value − cost. Nothing (unknown) when there is no price, or the market value or the cost is unknown.",
  "handed": "export function unrealizedGain(p: Position, price: number | null | undefined): number | null",
  "inputs_it_reads": [
   "MK-XS-I-007 purchase price and date (per lot)"
  ]
 },
 {
  "id": "MK-PF-F-006",
  "name": "capGains",
  "kind": "function",
  "what_it_is_for": "If I sold this today, how much of the gain is long-term and how much short-term?",
  "formula_in_words": "With no price: all three are nothing (unknown). Purchases with no shares held are passed over. For each other purchase: gain = shares × (price − cost per share) × the contract multiplier (100 for an option unless the holding states its own, otherwise 1). It is long-term when today is after the first anniversary of the purchase date — held MORE than one year — and short-term otherwise (a purchase on the leap day has its anniversary on the last day of February the next year, so a sale on the first of March is long-term); a purchase with no valid date counts as short-term. A purchase with no cost on record (none, or a cost per share of 0 or less) or no share count makes ITS part (long-term or short-term, by its date) nothing (unknown), and the total with it. Returns the long-term total, the short-term total and their sum.",
  "handed": "export function capGains(p: Position, price: number | null | undefined, now: Date = new Date()): CapGains",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-PF-F-007",
  "name": "totalROI",
  "kind": "function",
  "what_it_is_for": "Total return since purchase = gain / cost basis (decimal).",
  "formula_in_words": "Unrealised gain ÷ cost. Nothing when there is no price, the cost is unknown or zero or less, or the gain is unknown.",
  "handed": "export function totalROI(p: Position, price: number | null | undefined): number | null",
  "inputs_it_reads": [
   "MK-XS-I-007 purchase price and date (per lot)"
  ]
 },
 {
  "id": "MK-PF-F-008",
  "name": "startDateFor",
  "kind": "function",
  "what_it_is_for": "The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years.",
  "formula_in_words": "1M, 3M and 6M: today moved back that many months; 1Y and 2Y: back 12 or 24 months — the same day of that month, or its last day when that month is shorter (one month before 31 March is 28 February; a year before 29 February is 28 February). This year: 1 January of today's year. Any other label: nothing — a window name the app does not have gives no start.",
  "handed": "export function startDateFor(period: Period, now: Date): Date | null"
 },
 {
  "id": "MK-PF-F-009",
  "name": "latestClose",
  "kind": "function",
  "what_it_is_for": "What is the most recent price we hold for this?",
  "formula_in_words": "The close on the latest date on record, in whatever order the prices are listed; nothing when there are no prices.",
  "handed": "export function latestClose(series: PriceSeries | null | undefined): number | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-010",
  "name": "periodReturn",
  "kind": "function",
  "what_it_is_for": "Price return of a ticker over a period (decimal).",
  "formula_in_words": "End = the latest close. The beginning day = the day BEFORE the period's start date (both boundary days are inside the period). Start = the last close on or before the beginning day — or, when every price on record is later than that day, the FIRST close on record. Return = end ÷ start − 1. For 2Y it is given as a yearly rate. When the prices reach back to the beginning day: (end ÷ start) to the power one half, − 1. When they do not: the yearly rate over the span the prices do cover — (end ÷ start) to the power 1 ÷ years, − 1, where years = the days from the first price to the last ÷ 365.25 — and only when that span is more than one year; a span of a year or less keeps its own total. Nothing when there are no prices or the start close is zero or less. The same move is also given as the period's own total, never a yearly rate, for anything that adds holdings up. Nothing for a window name the app does not have.",
  "handed": "export function periodReturn(series: PriceSeries | null | undefined, period: Period, now = new Date()): number | null"
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
  "id": "MK-PF-F-013",
  "name": "benchmarkTicker",
  "kind": "function",
  "what_it_is_for": "What should this holding be compared against?",
  "formula_in_words": "The market yardstick for a holding, handed its kind (or the holding itself). The class decides first where the person set it, or where no kind names a yardstick: a bond → AGG; stocks and funds → SPY. Otherwise by kind: stocks and funds → SPY; fixed income and annuities → AGG; private equity → PSP; hedge funds → QAI; commodities → GLD; crypto → BTC; 529, 401(k), traditional and Roth IRA and HSA → AOR; other → SPY. A kind or class that names no yardstick → SPY. NOTHING when nothing says what the holding is (no kind, no class) — no yardstick, and its comparison refuses.",
  "handed": "export function benchmarkTicker(of?: string | Pick<Position, 'kind' | 'asset_class' | 'class_source'>): string | null",
  "inputs_it_reads": [
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-056 how a holding was classified, and by whom"
  ]
 },
 {
  "id": "MK-PF-F-014",
  "name": "buildPerformance",
  "kind": "function",
  "what_it_is_for": "Build the per-holding rows for a period from positions + a price-series lookup.",
  "formula_in_words": "For each holding: price = latest close; market value, cost, unrealised gain and return on cost from the functions above (each nothing where unknown). Bought = its earliest purchase date, or the date supplied when it has none. If it was bought ON OR AFTER the period's start day it is capped: its period return is time-weighted from its purchases — the purchases grouped by day (an undated one on the first day); the first piece starts at what was paid; at each later purchase day the piece ends at the shares then held × the close on or before that day, and the next starts there plus what that purchase paid; the last ends at shares held × today's price; the pieces multiplied, − 1 (one purchase day gives the return on cost; nothing when a share count or cost is missing or a purchase day has no close) — and the yardstick is measured since the first purchase date. Otherwise its period return is the price return over the period (periodReturn, a yearly rate over 2Y), and the yardstick is measured over the same period. Each row also carries the period's own total for the holding and for the yardstick (never a yearly rate). No yardstick (nothing says what the holding is): no yardstick return. Beat-by = the holding's return − the yardstick's; nothing when either is missing. When a holding's prices begin after the period's start (and it was not bought inside the period), the yardstick is measured from the holding's first price on record over the same days, and over 2Y made a yearly rate over that same span. For a window name the app does not have there is no start: every row's period return, totals and yardstick return are nothing, and no row is capped. When the caller hands over the window's first day (the Since window, whose first day is the record's), that day is the period's start: each figure is the move from the close on or before the day before it to the latest close, never a yearly rate, and a holding with no dated purchase whose stand-in date is that first day is not capped (it is part of the beginning value).",
  "handed": "export function buildPerformance(\n  positions: Position[],\n  priceOf: (ticker: string) => PriceSeries | null | undefined,\n  period: Period,\n  now = new Date(),\n  purchaseDateOf?: (p: Position) => string | null,\n  windowStart?: string | null,\n): PerformanceRow[]",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price",
   "MK-XS-I-007 purchase price and date (per lot)"
  ]
 }
]
```
