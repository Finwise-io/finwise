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

# The cards — batch "cashflow 07"

15 cards, so 75 cases. Put `"batch": "cashflow 07"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface AccountIncome {
  annual: number;
  lines: AccountIncomeLine[];
  covers: string;       // what is in the figure, in words
  missing: string | null;   // what we know we cannot see
}

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

export interface BudgetDoc {
  user_id: UserId;
  monthly_spending: number;        // total planned monthly spend
  fixed: number;                   // optional flex buckets
  non_monthly: number;
  flexible: number;
  last_updated?: any;
}

export interface BudgetState {
  user_id: UserId;
  monthly_spending: number;
  net_monthly_income: number;
  projected_to_save: number;       // income − expenses (the monthly surplus)
}

export interface CashflowYear {
  months: MonthFlow[];
  shortMonths: string[];      // months where the running balance dips below 0
  lowestBalance: number;
  totalIn: number;
  totalOut: number;
  beyondWindow: number;       // dated items (scholarships/loans) that fall outside the next 12 months
}

export interface EarnerWage {
  baseSalary?: Money;
  salaryFreq?: 'hourly' | 'weekly' | 'biweekly' | 'monthly';
  salaryMode?: 'gross' | 'takehome';
  hoursPerWeek?: Money;
  salaryByMonth?: Record<string, Money> | Money[];
  salaryMonthMode?: 'same' | 'months';
  c_401k?: Money;
  employerMatchValue?: Money;
  employerMatchMode?: 'pct' | 'dollar';
  /** The take-home they enter, per period. Used as typed — never grossed up. */
  landsTypical?: Money;
}

export interface ShockResult {
  shock: number;
  cashAfter: number;          // cash left right after the hit
  monthlyEssentials: number;  // what you must keep paying each month
  runwayAfter: number;        // months your remaining cash covers essentials after the hit
  jobLossRunway: number;      // months your cash lasts with NO income (no shock)
  coversIt: boolean;          // cash absorbs the shock without going negative
  recommendedFund: number;    // low end of a 3–6 month emergency fund (3× essentials)
  gapToFund: number;          // how far your cash is from that
}

export interface UpcomingBill {
  id: string;
  label: string;
  amount: number;
  dueDate: string;          // ISO — when the bill is due
  needByDate: string;       // dueDate − buffer (money must be in the account)
  askByDate: string;        // needByDate − lead (when to request the shortfall)
  availableByNeed: number;  // projected cash on the need-by date (after earlier commitments)
  shortfall: number;        // how much more you need for this bill
  coverSource: string;      // who/what covers the gap
  daysAway: number;         // days from now until due
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-173",
  "name": "earnerWages",
  "kind": "function",
  "what_it_is_for": "The wages this household actually has, in the order the screen shows them.",
  "handed": "export function earnerWages(op: OnboardingProfile | null): EarnerWage[]"
 },
 {
  "id": "MK-CF-F-177",
  "name": "wageGrossByMonth",
  "kind": "function",
  "what_it_is_for": "ONE person's wage, month by month, January first.",
  "handed": "export function wageGrossByMonth(w: Record<string, any> | null): number[]"
 },
 {
  "id": "MK-CF-F-179",
  "name": "entryFromWage",
  "kind": "function",
  "what_it_is_for": "Turns a wage as the profile stores it into the form the pay calculations read: how often it is paid, whether it varies, the gross, the 401(k) and the take-home entered.",
  "handed": "export function entryFromWage(w: Record<string, any> | null | undefined): BasePayEntry",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-043 their own retirement contribution"
  ]
 },
 {
  "id": "MK-CF-F-184",
  "name": "incomeFromAccounts",
  "kind": "function",
  "what_it_is_for": "One line per account that pays something, and the total.",
  "handed": "export function incomeFromAccounts(\n  accounts: AssetAccount[] | null | undefined,\n  transactions?: any[] | null,\n  now: Date = new Date(),\n): AccountIncome",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-003 institution name",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-CF-F-194",
  "name": "monthOutflow",
  "kind": "function",
  "what_it_is_for": "THE MONTH'S OUTFLOW — expenses plus the debt actually paid — from one place.",
  "handed": "export function monthOutflow(snap: { spending?: number | null; debt_paid?: number | null } | null | undefined, loggedSoFar: number): number",
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-004",
    "words_on_screen": "each row of the month — what it is and what it costs",
    "unit": "money",
    "what_it_answers": "One line per thing in or out this month, so the surplus can be checked by reading down the column.",
    "when_it_refuses": "A section with nothing in it keeps its heading and says so.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0260",
    "date": "2026-09-09",
    "words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen"
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-004",
    "words": "Drawn from the approved design (cash-flow_v01): the flow is SPELLED OUT, not summarised into three numbers."
   }
  ]
 },
 {
  "id": "MK-CF-F-197",
  "name": "ageAttainedInYear",
  "kind": "function",
  "what_it_is_for": "THE AGE THE LIMITS USE — the age a person attains at any time in the calendar year, which is this year minus the birth year.",
  "handed": "export function ageAttainedInYear(birthYear: number | null | undefined, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-017 birth year"
  ]
 },
 {
  "id": "MK-CF-F-212",
  "name": "receivedInMonth",
  "kind": "function",
  "what_it_is_for": "RECEIVED THIS MONTH (MK-CF-M-012) — the income records dated inside the month, newest first.",
  "handed": "export function receivedInMonth(incomes: { date?: string; amount?: any }[] | null | undefined, ym: string)",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-001",
  "name": "buildBudgetState",
  "kind": "function",
  "what_it_is_for": "projected_to_save = net monthly income − monthly expenses.",
  "handed": "export function buildBudgetState(uid: UserId, netMonthlyIncome: number, doc: BudgetDoc): BudgetState"
 },
 {
  "id": "MK-CF-F-008",
  "name": "spendByMonth",
  "kind": "function",
  "what_it_is_for": "Expenses placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.",
  "handed": "export function spendByMonth(op: OnboardingProfile | null): number[]",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-009",
  "name": "monthlyEssentials",
  "kind": "function",
  "what_it_is_for": "Monthly money you MUST keep paying — the recurring (non-monthly excluded) Critical + Important bills.",
  "handed": "export function monthlyEssentials(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-025 typical monthly essentials",
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-010",
  "name": "emergencyTest",
  "kind": "function",
  "what_it_is_for": "\"What if a $X emergency hit right now?\" — can your cash absorb it, and how long would you last.",
  "handed": "export function emergencyTest(op: OnboardingProfile | null, cash: number, shock: number, essentialsOverride?: number): ShockResult",
  "inputs_it_reads": [
   "MK-XS-I-025 typical monthly essentials"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-024",
    "words_on_screen": "You could cover a $X hit",
    "unit": "money",
    "what_it_answers": "Whether your cash would absorb a sudden cost.",
    "when_it_refuses": "No cash entered.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-MN-M-025",
    "words_on_screen": "You'd have $X left — about N months of essentials",
    "unit": "words",
    "what_it_answers": "What would be left after the hit, and how long that would last.",
    "when_it_refuses": "No essentials figure — the months are not stated rather than guessed.",
    "shown_on": [
     "/stress-test"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0260",
    "date": "2026-09-09",
    "words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen"
   }
  ]
 },
 {
  "id": "MK-CF-F-013",
  "name": "budgetFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Turns the answers about expenses given during setup into the stored budget: the monthly total and its three parts, which are fixed bills, once-in-a-while costs and everyday expenses.",
  "handed": "export function budgetFromOnboarding(uid: UserId, op: OnboardingProfile | null): BudgetDoc"
 },
 {
  "id": "MK-CF-F-018",
  "name": "equityByMonth",
  "kind": "function",
  "what_it_is_for": "Level annual equity spread across the months it vests (0 for most students).",
  "handed": "export function equityByMonth(op: Record<string, any>): number[]"
 },
 {
  "id": "MK-CF-F-019",
  "name": "upcomingBills",
  "kind": "function",
  "what_it_is_for": "The dated bills coming due over the next year, each with the day the money must be there, the cash expected by that day and how much short it would be.",
  "handed": "export function upcomingBills(\n  op: OnboardingProfile | null,\n  startBalance = 0,\n  now: Date = new Date(),\n  opts: { bufferDays?: number; askLeadDays?: number; horizonDays?: number } = {},\n): UpcomingBill[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-040 whether a stream is already being received",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ]
 },
 {
  "id": "MK-CF-F-020",
  "name": "cashflowYear",
  "kind": "function",
  "what_it_is_for": "Build the 12-month cash-flow picture.",
  "handed": "export function cashflowYear(op: OnboardingProfile | null, startBalance = 0, now: Date = new Date()): CashflowYear",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-059 the month a bonus lands"
  ]
 }
]
```
