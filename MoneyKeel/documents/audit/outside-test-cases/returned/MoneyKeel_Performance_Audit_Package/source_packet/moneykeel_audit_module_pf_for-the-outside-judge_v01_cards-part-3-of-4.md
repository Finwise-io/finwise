# The cards — "pf module final — part 3 of 4"

13 cards, so 13 formula checks and 65 cases. Read the brief file moneykeel_audit_module_pf_for-the-outside-judge_v01.md first. Put `"batch": "pf module final — part 3"` in your reply.

```json
[
 {
  "id": "MK-PF-F-015",
  "name": "topHoldingConcentration",
  "kind": "function",
  "what_it_is_for": "The holding-concentration FACT (Invest main + the insights function share this one rule): the largest single holding as a % of invested money, reported only at 25%+ with 2+ holdings — below that it isn't a fact worth a card.",
  "formula_in_words": "Nothing when any holding's value is unknown, when total value is zero or less, or when there are fewer than two holdings. Otherwise the holding with the largest value, its value (unrounded), and its share of the total — reported only when the UNROUNDED share is 25% or more; the share is returned as a whole percent, the figure as shown.",
  "handed": "export function topHoldingConcentration(rows: PerformanceRow[]): { ticker: string; pct: number; value: number } | null"
 },
 {
  "id": "MK-PF-F-020",
  "name": "portfolioBenchReturn",
  "kind": "function",
  "what_it_is_for": "Value-weighted benchmark (\"the market, matched to your mix\") return across holdings that have one (decimal), or null.",
  "formula_in_words": "Over the holdings that have their own return over the period above −100%, a value above zero, and a yardstick return: each one's value at the start = its value now ÷ (1 + its own return over the whole period); the yardstick returns (over the whole period, never a yearly rate) averaged, weighted by those start values. A holding with no return of its own is left out. Nothing when there are none.",
  "handed": "export function portfolioBenchReturn(rows: PerformanceRow[]): number | null"
 },
 {
  "id": "MK-PF-F-022",
  "name": "factorOverMonths",
  "kind": "function",
  "what_it_is_for": "Price factor over the trailing window: last close ÷ the close at (now − months).",
  "formula_in_words": "Nothing with fewer than two prices. Cut-off = today moved back the given number of months — the same day of that month, or its last day when that month is shorter. Nothing when the first price on record is later than the cut-off — the record does not reach back that far. Start = the last price on or before the cut-off. Factor = latest close ÷ start close; nothing when the start close is zero or less.",
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
  "formula_in_words": "Nothing unless the amount is above zero and both funds have a factor (factorOverMonths). Stayed: end value = amount × the factor of the fund it was in; change = end value − amount; percent = (factor − 1) × 100, at full precision. Moved: the same with the other fund's factor. Difference = moved end value − stayed end value.",
  "handed": "export function lookBack(amount: number, fromSeries: PriceSeries | null | undefined, toSeries: PriceSeries | null | undefined, months: number, now: Date = new Date()): LookBackResult | null"
 },
 {
  "id": "MK-PF-F-028",
  "name": "realizedFromLedger",
  "kind": "function",
  "what_it_is_for": "How much profit have I actually taken?",
  "formula_in_words": "Uses buy, opening-position and sale records that name a ticker, with shares above zero and a price, for the ticker and account asked for, in date order. A sale is matched to the earliest purchases first, within one account and one ticker. Gain on a sale = (matched shares × sale price − what those shares cost) × the contract multiplier of the holding asked about (100 for an option unless it states its own; 1 when no holding is named). All-time = every sale; this year = sales dated in today's calendar year. Each sale is counted once: sales counted = sales with at least one matched share; sales without a purchase = sales with none matched. Every sale with shares no purchase covers is listed with its date, the shares sold, the shares matched and the gain on the matched part (nothing when none matched). Example: bought 10 at $50, sold 15 at $70 → gain 10 × ($70 − $50) = $200; sales counted 1, sales without a purchase 0; listed: sold 15, matched 10, gain $200.",
  "handed": "export function realizedFromLedger(\n  txns: Transaction[],\n  opts: { ticker?: string; accountId?: string; now?: Date; holding?: Pick<Position, 'kind' | 'multiplier'> } = {},\n): RealizedResult",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-PF-F-029",
  "name": "closeAsOf",
  "kind": "function",
  "what_it_is_for": "Close on/just-before a target date (series oldest→newest).",
  "formula_in_words": "The close of the last price dated on or before the target date. When every price on record is later than the target, the FIRST close on record. Nothing with no prices.",
  "handed": "function closeAsOf(series: PriceSeries | null | undefined, target: Date): number | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-031",
  "name": "contractMultiplier",
  "kind": "function",
  "what_it_is_for": "How many units one contract stands for: 100 for an option unless the holding states its own figure, and 1 for everything else.",
  "formula_in_words": "The holding's own multiplier when it states one above zero; otherwise 100 for an option and 1 for everything else.",
  "handed": "export function contractMultiplier(p: Pick<Position, 'kind' | 'multiplier'>): number",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-PF-F-032",
  "name": "quantityUnit",
  "kind": "function",
  "what_it_is_for": "The unit written beside a quantity: the person's own where they entered one, otherwise coins for crypto, contracts for options, ounces for commodities and shares for everything else.",
  "formula_in_words": "The person's own unit where they entered one; otherwise coins for crypto, contracts for options, ounces for commodities, and shares for everything else.",
  "handed": "export function quantityUnit(p: Pick<Position, 'kind' | 'unit'>): QuantityUnit",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-034 option positions — contracts, strike, expiry, put or call",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-PF-F-033",
  "name": "quantityWithUnit",
  "kind": "function",
  "what_it_is_for": "\"3 shares\", \"1 coin\", \"2 contracts\" — the quantity printed with its unit, singular when it is one.",
  "formula_in_words": "The quantity followed by its unit (quantityUnit); the unit loses its final s when the quantity is 1 or minus 1. A quantity below zero is a written (short) position and keeps its minus sign (\"-1 contract\"). Nothing (refused) when the quantity is not on record or not a number.",
  "handed": "export function quantityWithUnit(p: Pick<Position, 'kind' | 'unit'>, qty: number | null, format: (n: number) => string = String): string | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-PF-F-034",
  "name": "closeOnOrBefore",
  "kind": "function",
  "what_it_is_for": "The close ON OR BEFORE a day, with NO fallback.",
  "formula_in_words": "The close of the latest price dated on or before the given day, in whatever order the prices are listed. Nothing when there is none, when there are no prices, or when the day is not written as year-month-day.",
  "handed": "export function closeOnOrBefore(series: PriceSeries | null | undefined, isoDate: string): number | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-035",
  "name": "unknownFigure",
  "kind": "function",
  "what_it_is_for": "Whether a purchase's figure was never entered — missing or not a number.",
  "formula_in_words": "A purchase's figure (its shares or its cost per share) counts as never entered when it is missing, or is not a number, or is not a finite number (for example infinity). Then the answer is yes. A real figure, zero included, gives no.",
  "handed": "const unknownFigure = (v: unknown): boolean"
 },
 {
  "id": "MK-PF-F-036",
  "name": "monthsBefore",
  "kind": "function",
  "what_it_is_for": "THE ONE RULE FOR \"N MONTHS BACK\" (his approval, 2026-10-10, DEC-3768b): the same day of the earlier month, or that month's last day when the day does not exist there — Mar 31 less one month is Feb 28, and Feb 29 less a year is Feb 28, never rolled into the next month.",
  "formula_in_words": "Go back the given number of months from today's date, crossing into earlier years when needed, and keep the same day of the month and the same time of day. When that day does not exist in the earlier month (the 31st in a month of 30 days, or the 29th of February in a year without one), use that month's last day instead — never roll over into the next month.",
  "handed": "export function monthsBefore(now: Date, months: number): Date"
 },
 {
  "id": "MK-PF-F-037",
  "name": "dayBefore",
  "kind": "function",
  "what_it_is_for": "The calendar day before a day, at the same time of day.",
  "formula_in_words": "The calendar day before the given day, at the same time of day. The first of a month gives the last day of the month before; the first of January gives the last day of December of the year before.",
  "handed": "function dayBefore(d: Date): Date"
 }
]
```
