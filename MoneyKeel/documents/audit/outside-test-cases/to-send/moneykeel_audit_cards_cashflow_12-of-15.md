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

# The cards — batch "cashflow 12"

15 cards, so 75 cases. Put `"batch": "cashflow 12"` in your reply.

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

export interface EarnerPay {
  grossMonthly: number;
  grossAnnualised: number;
  monthly401k: number;
  landsInBank: number;
  landsIsEstimated: boolean;
  landsWhy: string;
  everythingElse: number | null;          // a year — the laws pin it to the cent
  everythingElseMonthly: number | null;   // the same figure ÷ 12, HERE — a screen never divides
  verdict: PayVerdict;
  months: [string, number][];
}

export interface ExpensesInput {
  ym: string;
  debts: Debt[];
  plannedByCategory: { label: string; monthly: number }[];
  expenses: LoggedExpense[];
  bigBills?: { label: string; amount: number; dueLabel: string }[];   // dated non-debt bills
}

export interface MonthBlock { lines: Line[]; surplus: number;
  /** False on the PLANNED side when no budget is set: there is no planned surplus, and the screen
   *  prints an em-dash rather than a figure built on a guess. Always true on the actual side. */
  planSet: boolean; }

export interface MonthInput {
  ym: string;                    // 'YYYY-MM' — the month being shown
  takeHomeMonthly: number;       // from basePay — the take-home
  inflowSources?: string[];      // the sources inside takeHomeMonthly, by name — the inflow line prints them (cluster #5 ruling, 2026-09-10)
  debts: Debt[];
  plannedExpenses: number;       // from plannedMonthlySpend — the ONE canonical planned figure; 0 = no budget set
  expenses: LoggedExpense[];     // everything logged, debt payments included
  /** WHAT THE PLAN HAS ALREADY PROMISED to goals, per month. The hero figure on This month is the
   *  surplus LESS these, because money already committed to a goal is not free (F11). */
  commitments?: { label: string; monthlyAmount: number }[];
}

export interface RadarItem { label: string; amount: number; reason: RadarReason;
                             countedAsExpense: boolean; note: string; }

export type RadarReason = 'revolving-debt' | 'lump-debt' | 'big-bill';

export interface SpentList { items: LoggedExpense[]; shown: LoggedExpense[]; hidden: number;
                             hiddenTotal: number; total: number; }
```

## The cards

```json
[
 {
  "id": "MK-CF-F-149",
  "name": "recurringDebtPayments",
  "kind": "function",
  "what_it_is_for": "RECURRING DEBT PAYMENTS — the installment debts, one row each.",
  "handed": "export function recurringDebtPayments(s: ExpensesInput): { label: string; monthly: number }[]",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ]
 },
 {
  "id": "MK-CF-F-150",
  "name": "debtPaymentsCountedAsExpenses",
  "kind": "function",
  "what_it_is_for": "DEBT PAYMENTS THAT ARE COUNTED AS EXPENSES — revolving and due-in-full.",
  "handed": "export function debtPaymentsCountedAsExpenses(\n  s: ExpensesInput, purchasesCaptured: Set<string> = new Set(),\n): { label: string; amount: number }[]",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ]
 },
 {
  "id": "MK-CF-F-151",
  "name": "actualSpending",
  "kind": "function",
  "what_it_is_for": "What was actually spent in a month, debt payments left out: every expense newest first, the five shown, how many more there are and the totals, for all of them or only those entered by hand or only those imported.",
  "handed": "export function actualSpending(s: ExpensesInput, origin?: 'by-hand' | 'imported'): SpentList",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-CF-F-152",
  "name": "isRadarItem",
  "kind": "function",
  "what_it_is_for": "Whether a debt belongs on the big-ticket radar: yes for a card or a credit line and for a debt due in one lump, no for a loan paid the same every month.",
  "handed": "export function isRadarItem(d: Debt): RadarReason | null",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ]
 },
 {
  "id": "MK-CF-F-153",
  "name": "radar",
  "kind": "function",
  "what_it_is_for": "The big-ticket radar for a month: each card, credit-line or lump-sum debt payment and each large dated bill, with its amount and whether it is already counted as an expense.",
  "handed": "export function radar(s: ExpensesInput, purchasesCaptured: Set<string> = new Set()): RadarItem[]",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-CF-F-156",
  "name": "plannedMonthFlow",
  "kind": "function",
  "what_it_is_for": "THE PLAN for this month: the take-home, less each debt, less planned expenses.",
  "handed": "export function plannedMonthFlow(m: MonthInput): MonthBlock",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-CF-F-157",
  "name": "debtPaymentsByDebt",
  "kind": "function",
  "what_it_is_for": "WHICH DEBTS HAVE ACTUALLY BEEN PAID this month, and how much each.",
  "handed": "export function debtPaymentsByDebt(m: MonthInput): Map<string, number>",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ]
 },
 {
  "id": "MK-CF-F-160",
  "name": "daysBetweenDates",
  "kind": "function",
  "what_it_is_for": "The number of whole days from one date to another.",
  "handed": "function daysBetweenDates(a: Date, b: Date): number"
 },
 {
  "id": "MK-CF-F-161",
  "name": "monthlyGrossOfSource",
  "kind": "function",
  "what_it_is_for": "The gross amount one income source brings in each of the twelve months, with rent taken after its running costs and lump payments placed in the months they arrive.",
  "handed": "function monthlyGrossOfSource(s: IncomeSource): number[]",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives"
  ]
 },
 {
  "id": "MK-CF-F-167",
  "name": "salaryCalendarYear",
  "kind": "function",
  "what_it_is_for": "One calendar year as twelve numbers, January first — the shape every existing caller expects.",
  "handed": "export function salaryCalendarYear(\n  op: OnboardingProfile | null, year: number, fallback = 0, now: Date = new Date(),\n): number[]"
 },
 {
  "id": "MK-CF-F-168",
  "name": "salaryWindow",
  "kind": "function",
  "what_it_is_for": "The table as the base-pay screen shows it: [month key, amount] for a window of months.",
  "handed": "export function salaryWindow(\n  op: OnboardingProfile | null, keys: string[], fallback = 0, now: Date = new Date(),\n): [string, number][]"
 },
 {
  "id": "MK-CF-F-169",
  "name": "withSalaryMonth",
  "kind": "function",
  "what_it_is_for": "Write one month without disturbing the others.",
  "handed": "export function withSalaryMonth(\n  op: OnboardingProfile | null, key: string, amount: any, now: Date = new Date(),\n): Record<string, number>"
 },
 {
  "id": "MK-CF-F-170",
  "name": "salaryYearFromCells",
  "kind": "function",
  "what_it_is_for": "A whole calendar year written at once — what today's twelve-cell grids save.",
  "handed": "export function salaryYearFromCells(cells: any[], year: number): Record<string, number>"
 },
 {
  "id": "MK-CF-F-171",
  "name": "earnerPay",
  "kind": "function",
  "what_it_is_for": "One earner's pay: gross for a month and for a year, their 401(k), their take-home and whether it was entered or calculated, and everything else taken out.",
  "handed": "export function earnerPay(e: BasePayEntry): EarnerPay",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ]
 },
 {
  "id": "MK-CF-F-174",
  "name": "hasTwoEarners",
  "kind": "function",
  "what_it_is_for": "Does this household have a second wage on record?",
  "handed": "export function hasTwoEarners(op: OnboardingProfile | null): boolean"
 }
]
```
