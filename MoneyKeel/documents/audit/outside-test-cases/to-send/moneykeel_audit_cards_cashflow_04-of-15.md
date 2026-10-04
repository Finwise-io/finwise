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

# The cards — batch "cashflow 04"

15 cards, so 75 cases. Put `"batch": "cashflow 04"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface DTI { ratio: number; monthlyDebt: number; grossMonthly: number; guideline: number; status: 'good' | 'caution' | 'high'; }

export interface Debt {
  debt_id: EntityId;
  label: string;                   // account name, e.g. "Chase Sapphire"
  institution?: string;
  debt_type: DebtType;
  remaining_balance: number;
  interest_rate_apr: number;       // decimal
  minimum_monthly_payment: number;
  monthly_payment?: number;        // what you actually pay each month (≥ minimum); defaults to minimum
  due_day?: number;                // day of month the payment is due (1–31)
  first_payment_date?: string;     // 'YYYY-MM-DD' — payments START here (deferred/future-start loans);
                                   // absent = already paying. Interest accrues from now either way (F2).
  // #17 / Term #9 / B47 finding 11 — payment shape (drives DTI bucket + how cash flow shows it):
  payoff_date?: string;            // 'YYYY-MM-DD' final payoff / loan maturity (term loans);
                                   // for due_in_full this IS the due date of the lump sum
  payment_frequency?: 'monthly' | 'annual';     // default monthly
  payment_type?: 'installment' | 'revolving' | 'due_in_full';   // fixed loan payment vs revolving
                                   // minimum (cards) vs one lump sum on a date; defaults by debt_type
  origin?: 'onboarding';           // seeded from onboarding answers; re-seeding replaces ONLY these
                                   // rows (absent = user-created, never touched by seeding/restart)
}

export interface DebtState {
  user_id: UserId;
  total_debt_balance: number;
  total_monthly_debt_service: number;   // Σ MINIMUM payments — the obligation (use for DTI)
  total_actual_payment: number;         // Σ ACTUAL payments (override-aware) — use for cash flow
  debts: Debt[];
  highest_rate_debt: Debt | null;   // the "pay this first" (avalanche) target
  toxic_debt_balance: number;       // balances above ~7% APR
}

export interface Headroom { limit: number; used: number; remaining: number; catchUp: boolean; }

export interface LoanPlan { monthly: number; totalInterest: number; totalPaid: number; }

export interface MortgageComparison {
  /** the loan's own rate, as a percentage for display */
  mortgagePct: number;
  /** today's ten-year Treasury yield, as a percentage for display */
  treasuryPct: number;
  /** mortgage rate minus the yield, in percentage points; positive = paying down wins */
  gapPoints: number;
  /** what that gap is worth in a year at today's balance — the number a person can feel */
  annualDifference: number;
  /** over the life of the loan, how much better (positive) or worse (negative) off paying the
   *  extra leaves them versus putting the same money into Treasuries */
  lifetimeDifference: number;
  /** true when the two rates are close enough that neither choice is clearly better */
  tooCloseToCall: boolean;
  /** which way it points — the copy branches on this, never on the sign of a number */
  direction: 'paying-down-wins' | 'treasuries-win' | 'too-close';
}

export interface MortgageOddsEffect {
  /** the plan exactly as it stands today */
  before: number;
  /** the same plan with the extra payment genuinely modelled */
  after: number;
  /** the calendar year the loan clears without the extra payment */
  payoffYear: number;
  /** …and with it */
  fasterPayoffYear: number;
}

export type PayoffMethod = 'avalanche' | 'snowball';

export interface PayoffResult {
  months: number;                 // months to debt-free (0 = already free)
  totalInterest: number;          // interest paid over the plan
  neverPaysOff: boolean;          // payments can't cover interest
  order: { debt_id: EntityId; label: string; payoffMonth: number; interestPaid: number }[];
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-028",
  "name": "loanPayment",
  "kind": "function",
  "what_it_is_for": "UNIT LANDMINE (P0): `aprPct` is a PERCENT (7 = 7%), unlike Debt.interest_rate_apr which is a DECIMAL (0.07).",
  "handed": "export function loanPayment(principal: number, aprPct: number, termYears: number): LoanPlan"
 },
 {
  "id": "MK-CF-F-029",
  "name": "monthsToClear",
  "kind": "function",
  "what_it_is_for": "How many months it takes to clear a balance at a given yearly rate and monthly payment, or never when the payment does not cover the interest.",
  "handed": "export function monthsToClear(principal: number, aprDecimal: number, payment: number): number | null"
 },
 {
  "id": "MK-CF-F-030",
  "name": "paymentToClearBy",
  "kind": "function",
  "what_it_is_for": "Monthly payment that clears `principal` in `months` at decimal APR (amortization).",
  "handed": "export function paymentToClearBy(principal: number, aprDecimal: number, months: number): number"
 },
 {
  "id": "MK-CF-F-032",
  "name": "creditScoreBand",
  "kind": "function",
  "what_it_is_for": "The word for a credit score: Excellent from 800, Very good from 740, Good from 670, Fair from 580 and Poor below that.",
  "handed": "export function creditScoreBand(score: number): { label: string; good: boolean }"
 },
 {
  "id": "MK-CF-F-033",
  "name": "debtToIncome",
  "kind": "function",
  "what_it_is_for": "Monthly debt payments as a share of gross monthly income, judged against a guideline of 36% for a homeowner and 20% for anyone else.",
  "handed": "export function debtToIncome(monthlyDebt: number, grossMonthly: number, homeowner = false): DTI"
 },
 {
  "id": "MK-CF-F-034",
  "name": "payoffPlan",
  "kind": "function",
  "what_it_is_for": "Simulate paying off debts with a constant monthly budget (sum of minimums + extra), rolling each cleared debt's freed-up payment into the next per the chosen method.",
  "handed": "export function payoffPlan(debts: Debt[], extraMonthly: number, method: PayoffMethod = 'avalanche', now: Date = new Date()): PayoffResult",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump",
   "MK-XS-I-053 the month a debt is first paid",
   "MK-XS-I-054 the date a debt is due to be paid off in full"
  ]
 },
 {
  "id": "MK-CF-F-035",
  "name": "debtKind",
  "kind": "function",
  "what_it_is_for": "What do we know about this kind of debt?",
  "handed": "export function debtKind(id?: string)"
 },
 {
  "id": "MK-CF-F-036",
  "name": "buildDebtState",
  "kind": "function",
  "what_it_is_for": "What is the whole debt picture?",
  "handed": "export function buildDebtState(uid: UserId, debts: Debt[]): DebtState",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate"
  ]
 },
 {
  "id": "MK-CF-F-042",
  "name": "mortgageOddsEffect",
  "kind": "function",
  "what_it_is_for": "Run the plan twice and report both results.",
  "handed": "export function mortgageOddsEffect(args: {\n  base: RetirementInputs;\n  balance: number;\n  annualRate: number;\n  monthlyPayment: number;\n  extraMonthly: number;\n  nowYear: number;\n}): MortgageOddsEffect | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-CF-F-043",
  "name": "compareMortgageToTreasury",
  "kind": "function",
  "what_it_is_for": "Compare paying `extraMonthly` into the mortgage against putting the same money into Treasuries.",
  "handed": "export function compareMortgageToTreasury(args: {\n  balance: number;\n  annualRate: number;          // decimal, e.g. 0.055\n  monthlyPayment: number;\n  extraMonthly: number;\n  treasuryYield: number;       // decimal, e.g. 0.0463\n}): MortgageComparison | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-CF-F-049",
  "name": "buildIncomeState",
  "kind": "function",
  "what_it_is_for": "The income picture for a year: gross, tax rate and take-home, and the gross, tax and take-home of each of the twelve months.",
  "handed": "export function buildIncomeState(userId: string, sources: IncomeSource[], tax: TaxProfile): IncomeState"
 },
 {
  "id": "MK-CF-F-053",
  "name": "annual401kLimit",
  "kind": "function",
  "what_it_is_for": "Annual employee 401(k) limit for the user's age (adds the 50+ catch-up).",
  "handed": "export function annual401kLimit(age: number | null): number"
 },
 {
  "id": "MK-CF-F-054",
  "name": "annualIraLimit",
  "kind": "function",
  "what_it_is_for": "How much a person may put into an IRA this year: the standard limit, plus the catch-up amount from age 50.",
  "handed": "export function annualIraLimit(age: number | null): number",
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   }
  ]
 },
 {
  "id": "MK-CF-F-056",
  "name": "k401Headroom",
  "kind": "function",
  "what_it_is_for": "How much more you can still put into your 401(k) this year (incl.",
  "handed": "export function k401Headroom(age: number | null, annual401kContribution: number): Headroom",
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   }
  ]
 },
 {
  "id": "MK-CF-F-057",
  "name": "rothVsTraditional",
  "kind": "function",
  "what_it_is_for": "Roth vs Traditional lean from current vs expected-retirement marginal rate (decimals).",
  "handed": "export function rothVsTraditional(marginalNow: number, marginalRetire: number): { lean: 'roth' | 'traditional' | 'either'; why: string }"
 }
]
```
