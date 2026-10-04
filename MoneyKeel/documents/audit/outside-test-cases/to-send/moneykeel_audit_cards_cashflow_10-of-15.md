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

# The cards — batch "cashflow 10"

15 cards, so 75 cases. Put `"batch": "cashflow 10"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export type FilingStatus = 'single' | 'married' | 'mfs' | 'hoh';

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
  "id": "MK-CF-F-100",
  "name": "taxableIncomeFor",
  "kind": "function",
  "what_it_is_for": "What income is taxed, given how this person files?",
  "handed": "export function taxableIncomeFor(gross: number, status: FilingStatus = 'single', over65 = 0): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 },
 {
  "id": "MK-CF-F-105",
  "name": "guaranteedRows",
  "kind": "function",
  "what_it_is_for": "The dated guaranteed-income rows for the next 12 months (the F2 grid seam).",
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
  "handed": "export function isMoneyOut(t: Transaction): boolean"
 },
 {
  "id": "MK-CF-F-109",
  "name": "reviewTransactions",
  "kind": "function",
  "what_it_is_for": "Review new transactions against an account's history.",
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
  "handed": "export function makeTransaction(p: Omit<Transaction, 'id' | 'created_at'>): Transaction"
 },
 {
  "id": "MK-CF-F-113",
  "name": "affectedAccountIds",
  "kind": "function",
  "what_it_is_for": "The account ids a transaction can touch.",
  "handed": "export function affectedAccountIds(t: Transaction): EntityId[]"
 },
 {
  "id": "MK-CF-F-114",
  "name": "undoSnapshot",
  "kind": "function",
  "what_it_is_for": "Deep copies of the affected accounts, taken BEFORE applyTransaction.",
  "handed": "export function undoSnapshot(accounts: AssetAccount[], t: Transaction): AssetAccount[]"
 },
 {
  "id": "MK-CF-F-115",
  "name": "restoreUndo",
  "kind": "function",
  "what_it_is_for": "Restore the affected accounts to the transaction's pre-apply copies (pure).",
  "handed": "export function restoreUndo(accounts: AssetAccount[], t: Transaction): AssetAccount[]"
 },
 {
  "id": "MK-CF-F-116",
  "name": "inverseOf",
  "kind": "function",
  "what_it_is_for": "Legacy fallback for rows recorded before undo_prev: a synthetic opposite transaction.",
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
  "handed": "function pctBaseMonthly(op: OnboardingProfile | null): number"
 }
]
```
