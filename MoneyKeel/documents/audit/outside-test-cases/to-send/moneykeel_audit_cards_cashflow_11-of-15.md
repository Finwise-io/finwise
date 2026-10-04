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

# The cards — batch "cashflow 11"

15 cards, so 75 cases. Put `"batch": "cashflow 11"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
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

export interface PayVerdict { ok: boolean; warn: boolean; say: string; }

export interface TakeHome { monthly: number; estimated: boolean; why: string; }

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
  "id": "MK-CF-F-121",
  "name": "zero12",
  "kind": "function",
  "what_it_is_for": "Twelve zeros: an empty year, one slot for each month.",
  "handed": "function zero12(): number[]"
 },
 {
  "id": "MK-CF-F-124",
  "name": "nextOccurrence",
  "kind": "function",
  "what_it_is_for": "The next time (month, day) occurs on/after `now`, unless an explicit year is given.",
  "handed": "function nextOccurrence(month1to12: number, day: number, now: Date, year?: number): Date"
 },
 {
  "id": "MK-CF-F-125",
  "name": "amortise",
  "kind": "function",
  "what_it_is_for": "Months to clear a balance at a given payment, and the total interest paid getting there.",
  "handed": "function amortise(balance: number, annualRate: number, payment: number): { months: number; interest: number }",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-CF-F-126",
  "name": "futureValue",
  "kind": "function",
  "what_it_is_for": "Future value of a monthly contribution earning `rate`, contributed at the end of each month.",
  "handed": "function futureValue(monthly: number, rate: number, months: number): number"
 },
 {
  "id": "MK-CF-F-128",
  "name": "grossByMonth",
  "kind": "function",
  "what_it_is_for": "GROSS pay for each month the table covers, or twelve identical months when pay is steady.",
  "handed": "export function grossByMonth(e: BasePayEntry): [string, number][]"
 },
 {
  "id": "MK-CF-F-130",
  "name": "enteredMonthlyRaw",
  "kind": "function",
  "what_it_is_for": "A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly).",
  "handed": "function enteredMonthlyRaw(a: Record<string, any>): number",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ]
 },
 {
  "id": "MK-CF-F-136",
  "name": "bumpCash",
  "kind": "function",
  "what_it_is_for": "Adds cash to an account, or takes it out, in the right place: the uninvested cash of an investment account, or the balance of a bank account.",
  "handed": "function bumpCash(a: AssetAccount, delta: number): AssetAccount",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)"
  ]
 },
 {
  "id": "MK-CF-F-138",
  "name": "addLot",
  "kind": "function",
  "what_it_is_for": "Add shares to a position (creating it if needed) at a cost basis — used by BUY and reinvested dividends.",
  "handed": "function addLot(a: AssetAccount, t: Transaction, shares: number, costPerShare: number): AssetAccount",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-CF-F-139",
  "name": "removeShares",
  "kind": "function",
  "what_it_is_for": "Remove `shares` from a position FIFO (oldest lots first); returns updated account.",
  "handed": "function removeShares(a: AssetAccount, t: Transaction, shares: number): AssetAccount",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)"
  ]
 },
 {
  "id": "MK-CF-F-141",
  "name": "perMonth",
  "kind": "function",
  "what_it_is_for": "One period of pay expressed as a month.",
  "handed": "function perMonth(amount: any, e: BasePayEntry): number"
 },
 {
  "id": "MK-CF-F-142",
  "name": "monthsOf",
  "kind": "function",
  "what_it_is_for": "The months the person filled in, in order.",
  "handed": "function monthsOf(table: Record<string, any> | undefined): [string, number][]"
 },
 {
  "id": "MK-CF-F-143",
  "name": "annualisedGross",
  "kind": "function",
  "what_it_is_for": "GROSS PAY ANNUALISED — the figure a tax bracket is read from.",
  "handed": "export function annualisedGross(e: BasePayEntry): number"
 },
 {
  "id": "MK-CF-F-144",
  "name": "takeHomeAsEntered",
  "kind": "function",
  "what_it_is_for": "A person's monthly take-home exactly as they entered it, averaged over their month-by-month table when their pay varies, or a calculated figure marked as calculated when they entered none.",
  "handed": "export function takeHomeAsEntered(e: BasePayEntry): TakeHome",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 },
 {
  "id": "MK-CF-F-145",
  "name": "deductionsFromPay",
  "kind": "function",
  "what_it_is_for": "EVERYTHING ELSE TAKEN OUT — gross, less the 401(k), less the take-home.",
  "handed": "export function deductionsFromPay(e: BasePayEntry): number | null"
 },
 {
  "id": "MK-CF-F-146",
  "name": "payFiguresAgree",
  "kind": "function",
  "what_it_is_for": "Checks month by month that gross pay, less the 401(k), is enough to leave the take-home the person entered, and says in words when it is not or when an unusually large share goes elsewhere.",
  "handed": "export function payFiguresAgree(e: BasePayEntry): PayVerdict"
 }
]
```
