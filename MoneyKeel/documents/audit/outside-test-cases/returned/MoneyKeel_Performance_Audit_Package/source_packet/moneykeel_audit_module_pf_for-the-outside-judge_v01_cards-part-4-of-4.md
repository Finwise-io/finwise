# The cards — "pf module final — part 4 of 4"

12 cards, so 12 formula checks and 60 cases. Read the brief file moneykeel_audit_module_pf_for-the-outside-judge_v01.md first. Put `"batch": "pf module final — part 4"` in your reply.

```json
[
 {
  "id": "MK-PF-F-038",
  "name": "periodTotalReturn",
  "kind": "function",
  "what_it_is_for": "THE WINDOW'S OWN TOTAL — the same price move as periodReturn, never turned into a yearly rate.",
  "formula_in_words": "The price move over the period as the period's own total, never turned into a yearly rate: the same total that periodReturn starts from (latest close ÷ the close at the beginning − 1, read by periodReturnParts). Nothing when there are no prices, no latest close, no close at the beginning, or that close is zero or less.",
  "handed": "export function periodTotalReturn(series: PriceSeries | null | undefined, period: Period, now = new Date()): number | null"
 },
 {
  "id": "MK-PF-F-039",
  "name": "periodReturnParts",
  "kind": "function",
  "what_it_is_for": "One price move over a period: its total, and the years a yearly rate of it is taken over (1 = never yearly).",
  "formula_in_words": "Nothing when there are no prices, or the period's name is not one the app has. End = the latest close. The beginning day = the day BEFORE the period's start date (both boundary days are inside the period). Start = the last close on or before the beginning day. Nothing when end or start is missing, or start is zero or less. Total = end ÷ start − 1. Years: 1 for every period except 2Y (1 means it is never turned into a yearly rate). For 2Y: when the first price on record is on or before the beginning day, years = 2; when it is later, years = the time from the first price to the last price, in days ÷ 365.25. The answer is the total and the years.",
  "handed": "function periodReturnParts(series: PriceSeries | null | undefined, period: Period, now: Date): { total: number; years: number } | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-PF-F-040",
  "name": "returnSincePurchases",
  "kind": "function",
  "what_it_is_for": "A holding bought inside the window: its time-weighted return from the first purchase to today (DEC-1669).",
  "formula_in_words": "A holding bought inside the period, time-weighted from its purchases. Nothing when there is no price today. Every purchase must have a share count and a cost per share that are real numbers, or the answer is nothing. Purchases of zero or fewer shares are skipped. Each purchase is placed on its own date (the date's year-month-day part), or on the period's first purchase day handed in when its date is missing or unreadable; purchases on the same day are added together: shares added, and paid = shares × cost per share added. Nothing when no purchase is left. Walk the days from earliest to latest, starting with shares held 0, money in the piece 0, growth 1. On the first day: money in the piece = what was paid that day. On each later day: take the last close on or before that day (nothing if there is none, or if the money in the piece is zero or less); growth = growth × (shares held × that close) ÷ money in the piece; then money in the piece = shares held × that close + what was paid that day. After each day, shares held grows by that day's shares. At the end: nothing when the money in the piece is zero or less; otherwise the return = growth × (shares held × today's price) ÷ money in the piece − 1. With a single purchase day this is today's value ÷ what was paid − 1.",
  "handed": "function returnSincePurchases(p: Position, series: PriceSeries | null | undefined, price: number | null, firstDay: string): number | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-007 purchase price and date (per lot)"
  ]
 },
 {
  "id": "MK-PF-F-041",
  "name": "isoDay",
  "kind": "function",
  "what_it_is_for": "A Date as its local calendar day, YYYY-MM-DD.",
  "formula_in_words": "A date written as the person's own local calendar day: the year, a dash, the month number (January is 1) written with two digits, a dash, the day of the month written with two digits — a single digit gets a 0 in front.",
  "handed": "function isoDay(d: Date): string"
 },
 {
  "id": "MK-PF-F-042",
  "name": "windowTotal",
  "kind": "function",
  "what_it_is_for": "A ROW'S WINDOW TOTAL — the one rule for reading a holding's return as the window's own total, never a yearly rate.",
  "formula_in_words": "A holding's return over the whole window, never a yearly rate. When the row carries its window total (even an empty one), that total is the answer as written. Otherwise: nothing when there is no return. When the window is longer than one year (years above 1): (1 + the yearly rate) to the power years, − 1. Otherwise the return itself. Years not handed in counts as 0, so the return is used as it stands.",
  "handed": "export function windowTotal(rate: number | null | undefined, total: number | null | undefined, years = 0): number | null"
 },
 {
  "id": "MK-PF-F-043",
  "name": "windowTotalOfRow",
  "kind": "function",
  "what_it_is_for": "One holding's return over the whole window — its total, never a yearly rate (a 2Y yearly rate is turned back into the two-year total).",
  "formula_in_words": "One holding's return over the whole window: windowTotal read with the row's period return and the row's period total, and no years. So the row's period total when it carries one (even an empty one); otherwise its period return as it stands; nothing when it has neither.",
  "handed": "const windowTotalOfRow = (r: PerformanceRow): number | null"
 },
 {
  "id": "MK-PF-F-044",
  "name": "startValues",
  "kind": "function",
  "what_it_is_for": "Each holding that has a window total above −100% and a value today, with its value when the window began.",
  "formula_in_words": "For each holding row, read its return over the window. Keep the row only when that return is known, is above −1 (a loss of less than everything), and the holding's value today is above zero; every other row is left out. For each row kept: its value when the window began = today's value ÷ (1 + the return). The answer is the list of rows kept, each with its return and that starting value. No rows gives an empty list.",
  "handed": "function startValues(rows: PerformanceRow[], retOf: (r: PerformanceRow) => number | null): { row: PerformanceRow; ret: number; start: number }[]"
 },
 {
  "id": "MK-PF-F-045",
  "name": "priceHistoryShortSentence",
  "kind": "function",
  "what_it_is_for": "The sentence written wherever a holding's window figure is shown and its prices begin after the window opens: how many months the prices reach, against the window the chip names.",
  "formula_in_words": "Nothing (an empty line) for a window name the app does not have, no window start, no prices, or a first price dated on or before the window's first day (the coverage engine reads the price dates). Otherwise months = whole months from the first price date to today (the same day of the month counts the month; never below 0), and the line reads: \"Prices for this holding go back {months} month(s), so the {label} figure covers {months} month(s) — not {words}.\" Labels and words: 1M 1-month / a month; 3M 3-month / three months; 6M 6-month / six months; YTD year-so-far / the whole year so far; 1Y 1-year / a year; 2Y 2-year / two years; Since: Since / since the day before the window opens. Example: first price 4 May 2026, 1Y window opening 10 Oct 2025, today 10 Oct 2026 → 5 months: \"Prices for this holding go back 5 months, so the 1-year figure covers 5 months — not a year.\"",
  "handed": "export function priceHistoryShortSentence(\n  points: { date: string }[] | null | undefined, windowStart: string | null, period: string, today: string,\n): string"
 },
 {
  "id": "MK-PF-F-046",
  "name": "saleShortOfPurchasesSentence",
  "kind": "function",
  "what_it_is_for": "The line for a sale whose shares are not all covered by a recorded purchase: the gain on the part that is, and how many shares have no price paid on record.",
  "formula_in_words": "For one sale whose shares are not all covered by a recorded purchase. The sold quantity is written with the holding's unit (quantityWithUnit). When some shares were matched: \"{gain} gain on {matched} of {sold with unit} sold; what you paid for the other {sold − matched} is not on record.\" — \"loss\" in place of \"gain\" when the gain is below zero, the amount shown without its sign. When none was matched: \"{sold with unit} sold; what you paid for them is not on record, so no gain is counted.\" Example: 10 of 15 shares matched, gain $200 → \"$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record.\"",
  "handed": "export function saleShortOfPurchasesSentence(\n  sale: SaleShortOfPurchases, holding: Pick<Position, 'kind' | 'unit'>, money: (n: number) => string,\n  count: (n: number) => string = String,\n): string",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-ST-F-080",
  "name": "isDay",
  "kind": "function",
  "what_it_is_for": "Whether a value is a calendar day written as year-month-day.",
  "formula_in_words": "True only when the value is text written exactly as four digits, a dash, two digits, a dash and two digits (year-month-day) AND that day exists in the calendar (2026-02-29 and 2026-02-31 are false; 2024-02-29 is true). Anything else is false: a number, nothing at all, or a date with a time written after it.",
  "handed": "const isDay = (d: unknown): d is string"
 },
 {
  "id": "MK-ST-F-081",
  "name": "timeWeightedReturn",
  "kind": "function",
  "what_it_is_for": "The time-weighted return of a set of accounts between two days, or the reason it cannot be measured.",
  "formula_in_words": "Works from the daily record, which holds one value per account per day, taken after that day's money moved; the previous usable day stands for the evening before. Days after the last day asked for, and days not written as year-month-day (isDay), are ignored. Each measured account has its own line of values, from its first recorded day to its last. The total on a day = the values that day of the measured accounts whose line covers that day. An account that has ever held a priced security must have a value on that very day, or the day is not used at all; any other account (a typed or cash balance) keeps its last earlier value until its next one. THE BEGINNING = the latest recorded day on or before the start day whose total can be formed with at least one account in it; with none it refuses (the start is not recorded). The last day asked for must be in the record and its total formed, or it refuses (the end is not recorded). It refuses when a deposit or withdrawal on a measured account that is not cash has no year-month-day date, when shares were moved on any day after the beginning up to the last day (naming the first such day), and when a deposit, withdrawal or transfer with no amount on record is dated after the beginning up to the last day (naming the first such day). THE PIECES: from the beginning, take each later usable day in order. Money in on that day, account by account: an account there now but not on the previous usable day joined the record: it brings in the money added to it that day when there is any (it was worth nothing the evening before, so that money is its base — DEC-4439), otherwise its whole value; one there before but not now takes out its last value (it left); a cash account brings in its change in value less the interest credited to it after the previous usable day up to this day (cash earns only interest); any other account brings in its deposits (plus) and withdrawals (minus) dated after the previous usable day up to this day, and if one of those is dated before this day it refuses, naming that day (money moved on a day with no recorded value). THE DAY'S LINK (owner decision DEC-4439, 2026-10-11: money that moves on a day counts for that whole day): the base = the previous usable day's total + money in. When the base is more than half a cent, the growth so far is multiplied by this day's total (never below zero) ÷ the base, and the measured period starts at the previous day if it has not started yet — or at this day when the previous total was half a cent or less (the first money's day). When the base is half a cent or less: if it is below minus half a cent, or this day's total is more than half a cent either way, it refuses, naming the day (nothing to grow from), and says when more was taken out than the previous total plus the money added; otherwise nothing is measured for that piece. When no piece was measured it refuses (nothing invested). THE RETURN = the pieces multiplied together − 1, as a share at full precision (not a percent, and never turned into a yearly rate here), with the day the measured period started. It never falls back to another method.",
  "handed": "export function timeWeightedReturn(a: TimeWeightedInput): TimeWeightedVerdict"
 },
 {
  "id": "MK-ST-F-082",
  "name": "movementsOf",
  "kind": "function",
  "what_it_is_for": "Which of a household's records are money moving in or out of the measured accounts, which are interest, and on which days shares were moved.",
  "formula_in_words": "Sorts a household's records, for the accounts being measured, into money moving in or out, interest, and days shares were moved. Each record's date is its first ten characters. A deposit or withdrawal on a measured account with NO amount (missing or not a number) is not money in or out at all: its day goes on the list of days with an amount missing, and the return refuses there; the same for a transfer with no amount that crosses the edge of the measured accounts (one side measured, the other not). That list is handed back only when it has a day on it. Any other missing or unreadable amount counts as zero. A deposit on a measured account is money in (plus its amount); a withdrawal on one is money out (minus its amount) — the sign comes from the kind of record, so a withdrawal written as a negative amount becomes money in. A transfer is money out of its first account when that account is measured, and money into its second account when that one is measured, so a transfer between two measured accounts appears as both. Shares moved (a transfer in kind): nothing when both accounts named are measured, or neither is, or when only one account is named and it is not measured. Otherwise it is money into or out of the measured account at what the shares were worth — the record's amount when above zero, else shares × price: in when they arrive in the measured account (or, with one account named, when the record says in), out when they leave (or the record says out). When the direction is neither in nor out, or the worth is not above zero, the day goes on the list of days shares were moved instead. Interest on a measured account that was not reinvested is interest (plus its amount). Every other kind of record is ignored. Each movement keeps its own day; the time-weighted return counts it for that whole day (DEC-4439, 2026-10-11).",
  "handed": "export function movementsOf(transactions: any[], ids: Set<string>): { flows: DatedAmount[]; interest: DatedAmount[]; sharesMoved: string[]; amountMissing?: string[] }",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-024 logged expenses"
  ]
 }
]
```
