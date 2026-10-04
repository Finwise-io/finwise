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

# The cards — batch "performance 01"

2 cards, so 10 cases. Put `"batch": "performance 01"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface WindowFigures {
  /** The first day of the window, or null for "since the record began". */
  windowStart: string | null;
  /** The records inside the window. */
  ledger: any[];
  /** How the beginning became the ending, line by line — the rows always sum to the ending. */
  walk: ChangeWalk;
  /** The beginning as READ from the daily record, or null when the record cannot reach back. */
  measured: number | null;
  /** Whether the record reaches back to the window's first day. False → every percent here is null. */
  covered: boolean;
  /** The day the beginning value is read for — the record's first day for "since". Null on day one. */
  beginningAsOf: string | null;
  /** What the window shows: the yearly rate over a year, otherwise the total. Null when it refuses. */
  ret: number | null;
  /** The total over the window, and the yearly rate — both, always, so the screen can label them. */
  cumulative: number | null;
  perYear: number | null;
  years: number;
  /** Why a refusal, in words. Empty when nothing is refused. */
  sentence: string;
  /** THE EXACT RATE PER YEAR, and ONLY where the window return refused (his ruling on Q52, 2026-09-30:
   *  "use option B"). It is the rate that makes this window's own beginning and its own dated flows
   *  grow into the ending — the window's rate, never the whole record's, because the label above it
   *  names the window. Null where the window return answered (one return is visible at a time), and
   *  null where even this refuses: under 30 days there is not enough window to state a yearly rate. */
  refusedRate: number | null;
}
```

## The cards

```json
[
 {
  "id": "MK-NW-O-007",
  "name": "theLookBack",
  "kind": "orchestrator",
  "what_it_is_for": "What would this holding be worth today had I put the same money into something else on the same days?",
  "handed": "export function theLookBack(input: {\n  amount: number;\n  /** The price history of the fund it is in, and of the one it might have moved to. */\n  fromSeries: any;\n  toSeries: any;\n  months: number;\n  now?: Date;\n}): LookBackResult | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-PF-M-010",
    "words_on_screen": "Left in <fund> it became $X (up/down $Y, Z%)",
    "unit": "money",
    "what_it_answers": "What your money actually did, where it actually was.",
    "when_it_refuses": "No price history over the whole window — the screen shows nothing rather than a shortened one.",
    "shown_on": [
     "/look-back"
    ]
   },
   {
    "id": "MK-PF-M-011",
    "words_on_screen": "Moved to <fund> it would be $X",
    "unit": "money",
    "what_it_answers": "What the same money would have become in the other fund.",
    "when_it_refuses": "No price history for the other fund over the whole window.",
    "shown_on": [
     "/look-back"
    ]
   },
   {
    "id": "MK-PF-M-012",
    "words_on_screen": "Difference: $X more/less if you had moved",
    "unit": "money",
    "what_it_answers": "What the move would have been worth, in money.",
    "when_it_refuses": "Either fund missing its history means no difference is stated.",
    "shown_on": [
     "/look-back"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0233",
    "date": "2026-09-25",
    "words": "button still looks not asthetically good. Can it be done like one row with dividers for different periods?"
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-010",
    "words": "Price changes only — dividends are not in it, and the screen says so."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-011",
    "words": "A road not taken, priced from real history — never a projection forward."
   }
  ]
 },
 {
  "id": "MK-NW-O-008",
  "name": "thePerformance",
  "kind": "orchestrator",
  "what_it_is_for": "How are my investments doing over a period: where they started, what I put in and took out, what they made, where they ended, and the return?",
  "handed": "export function thePerformance(input: {\n  /** The window's first day, or null for \"since the record began\". */\n  windowStart: string | null;\n  /** The words for that window, as the screen says them (\"since Jul 19\"). */\n  windowLabel: string;\n  today: string;\n  /** What the investments are worth now. */\n  ending: number;\n  /** Every record, unfiltered — the door takes the window's own. */\n  transactions: any[];\n  /** The daily record, and which accounts count as investments. */\n  snapshotDays: any[];\n  investmentAccountIds: Set<string>;\n  /** What the priced holdings gained over the window — used ONLY to derive a beginning the record\n   *  cannot reach. It never becomes the return. */\n  pricedGain: number;\n  /** True for \"Since\" — the whole record. Its return is the window's OWN total and is never turned\n   *  into a yearly rate (Performance v17, phone 3: \"Since Jun 3, 2024 +16.24% … not a yearly rate\").\n   *  A fixed window longer than a year (2Y) still shows the yearly rate. */\n  wholeRecord?: boolean;\n}): WindowFigures",
  "inputs_it_reads": [
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-PF-M-001",
    "words_on_screen": "Ending value",
    "unit": "money",
    "what_it_answers": "What your investments are worth at the end of the window you picked.",
    "when_it_refuses": "Nothing invested yet.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-002",
    "words_on_screen": "Wealth generated",
    "unit": "money",
    "what_it_answers": "What the money itself made in the window — not what you added to it.",
    "when_it_refuses": "The record cannot reach the start of this window, so there is nothing honest to subtract from.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-003",
    "words_on_screen": "HOW $X BECAME $Y · ALL ACCOUNTS",
    "unit": "words",
    "what_it_answers": "Every line that took the beginning to the ending, so it can be checked by eye.",
    "when_it_refuses": "No beginning to walk from.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-004",
    "words_on_screen": "Ending market value (per account)",
    "unit": "money",
    "what_it_answers": "What one account is worth at the end of the window.",
    "when_it_refuses": "Nothing in it.",
    "shown_on": [
     "/invest",
     "/account-detail"
    ]
   },
   {
    "id": "MK-PF-M-005",
    "words_on_screen": "each account and its ending value",
    "unit": "money",
    "what_it_answers": "One line per account, and what it is worth — the parts that sum to the whole above.",
    "when_it_refuses": "One account only — the whole walk above already says it.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-006",
    "words_on_screen": "WHAT EACH CATEGORY EARNED — RETURN",
    "unit": "percent-signed",
    "what_it_answers": "What each kind of holding returned over the window you picked.",
    "when_it_refuses": "An em-dash — no holding in that class can be priced over this window.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-007",
    "words_on_screen": "All categories",
    "unit": "money",
    "what_it_answers": "What you actually received, in dividends and interest, over the window — by kind.",
    "when_it_refuses": "The table does not appear — nothing was received in this window.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-008",
    "words_on_screen": "market +X%",
    "unit": "percent-2dp",
    "what_it_answers": "What the market did over the SAME days, matched to what you actually hold.",
    "when_it_refuses": "No benchmark can be priced over this window, so none is shown.",
    "shown_on": [
     "/home"
    ]
   },
   {
    "id": "MK-PF-M-013",
    "words_on_screen": "Beginning market value",
    "unit": "money",
    "what_it_answers": "What this one account was worth on the day the window opens, READ from the record — never back-solved from today.",
    "when_it_refuses": "The record does not reach back that far, so the walk is not drawn at all rather than started from a guess.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-014",
    "words_on_screen": "Wealth generated",
    "unit": "money",
    "what_it_answers": "What this one account earned over the window — what is left after the money you put in and took out is accounted for.",
    "when_it_refuses": "No beginning to measure from — the line shows nothing rather than a change.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-PF-M-015",
    "words_on_screen": "one line of the walk",
    "unit": "money",
    "what_it_answers": "One step that took this account from its beginning to its ending — money in, money out, or the change in what the holdings are worth.",
    "when_it_refuses": "No flows recorded — the line is not drawn.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-016",
    "words_on_screen": "Return",
    "unit": "percent-signed",
    "what_it_answers": "What this one account returned over the window you picked — wealth generated ÷ the money that was working in it, counting when money moved in or out. Shown per year when the window is longer than a year.",
    "when_it_refuses": "Money moved in and out in amounts where WHEN it moved would decide a window return, so none is shown; the rate per year stands in its place.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-017",
    "words_on_screen": "Return",
    "unit": "percent-signed",
    "what_it_answers": "What all your investments returned over the window you picked — wealth generated ÷ the money that was working, counting when money moved in or out. Per year when the window is longer than a year.",
    "when_it_refuses": "Money moved in and out in amounts where WHEN it moved would decide a window return, so none is shown; the rate per year stands in its place.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-018",
    "words_on_screen": "Beginning market value",
    "unit": "money",
    "what_it_answers": "What all your investments were worth on the day the window opens, READ from the daily record.",
    "when_it_refuses": "No recorded value that far back — the walk starts the day the record does, and says so.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-019",
    "words_on_screen": "one line of the walk",
    "unit": "money",
    "what_it_answers": "One line of how the beginning became the ending, over every account: contributions, withdrawals, dividends, interest, or the change in investment value.",
    "when_it_refuses": "A real $0 — a line with nothing in it still prints, so the structure never changes.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-020",
    "words_on_screen": "Available cash",
    "unit": "money",
    "what_it_answers": "The cash in this account that a buy, a withdrawal or a transfer can use right now.",
    "when_it_refuses": "No account picked — the line is not shown.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-XS-M-004",
    "words_on_screen": "▲ up/▼ down $X (Y%) this month · Return · YOUR RETURN",
    "unit": "percent-2dp",
    "what_it_answers": "What your investments earned over the window you picked — dividends and interest included.",
    "when_it_refuses": "Nothing is shown, and the walk beneath says in words why — either the record cannot reach the beginning, or money moved in amounts that would decide the percentage.",
    "shown_on": [
     "/invest",
     "/home"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0046",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0046, confirmed as written: The Invest tab is renamed PERFORMANCE (founder pick: Net worth · Performance) — one TAB_META change sweeps the bottom ba"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0065",
    "date": "2026-08-10",
    "words": "complete fully building NW and perf section"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0084",
    "date": "2026-08-11",
    "words": "Your retirement plan - it says See your plan. That is not what I approved. Is it stale code?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0093",
    "date": "2026-08-11",
    "words": "make all $$ same size and make totals bold. different size for dollar amount makes number not right aligned... are these tables or how are you ensuring they are right aligned?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0112",
    "date": "2026-08-12",
    "words": "s not say Uncertain — 60% odds of lasting to age 90. uncertain and giving it 60% probability does not make sense. it should be either or. Let"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0126",
    "date": "2026-08-13",
    "words": "s paycheck on the Plan tab rendered two bare amounts with NO NAMES beside them — a bill with the line items blanked out — directly above a note reading"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0135",
    "date": "2026-08-13",
    "words": "under cashflow I don"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0142",
    "date": "2026-08-13",
    "words": "info dot should be the same size as text. Can we do that?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0143",
    "date": "2026-08-14",
    "words": "s constraint, stated plainly:"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0160",
    "date": "2026-08-14",
    "words": "one critical factor is whether the current mortgage rate is higher or lower than the return on investment or the 10-year yield — if a person pays off the mortgage versus keeping money in a 10-year Treasury, what would be the net saving or cost?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0165",
    "date": "2026-08-14",
    "words": "how to avoid this in the next brief?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0173",
    "date": "2026-08-14",
    "words": "Not counting loan or mortgage payments — we add those ourselves, from your loans, for as long as they run."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0182",
    "date": "2026-08-27",
    "words": "for orchestrator use O instead of F to make it easy to identify."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0192",
    "date": "2026-08-28",
    "words": "s number was its POSITION in a list — nid() counted up as it walked them — so inserting a row silently renumbered every metric after it in that family. 93 audit findings are keyed to those numbers, as are the founder"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0229",
    "date": "2026-09-25",
    "words": "\"Yes\" — DEC-0229, confirmed as written: Mock v11 drawn from v10 with the founder’s four changes: (10) the window chips sit on ONE row in 10.5-point type with th"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0230",
    "date": "2026-09-25",
    "words": "We never back-fill a year we didn"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0255",
    "date": "2026-09-08",
    "words": "ok — the dependency column from the live function registry; a check that no row cites a retired identifier"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0257",
    "date": "2026-09-08",
    "words": "ok — inputs' reach and the reconciliation by identifier, all inputs; then: the code's record beside each row's claim, he approves rows in batches, the gate compares approved against the code"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0322",
    "date": "2026-08-20",
    "words": "status disagreements, work-list generation, engine counts, tab references, the PINNED word — all in the old metrics deliverable"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0323",
    "date": "2026-08-20",
    "words": "\"money-weighted\" names two things — rename PORTFOLIO_RETURN to value-weighted; reserve money-weighted for the IRR"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0357",
    "date": "2026-09-25",
    "words": "why income when % is calculated using wealth generated?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0368",
    "date": "2026-09-26",
    "words": "go with (a) the sentence becomes “+7.30%/year” — canon-literal"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0382",
    "date": "2026-09-02",
    "words": "“Always use same words to describe same thing in the app. There is no score for creative writing use different terms to describe same thing.” Made an app-wide standing order the same day."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0402",
    "date": "2026-09-14",
    "words": "go ahead and execute on step 1, 2, 3"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0445",
    "date": "2026-06-30",
    "words": "If user is in plan section and plan something such SS starting age, or RMDs or other scenarios, can they select Use this once satisfied and would that feed inputs to NW, invest, and cashflow modules?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0479",
    "date": "2026-07-01",
    "words": "Total return captures both realized and unrealized gains? Is there any place we display realized P/L, unrealized P/L, total dividend, and total interest separately?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0482",
    "date": "2026-07-01",
    "words": "How do we evaluate if something is saved towards retirement or some other goals? In other words is NW = Retire or Retire = Assets - Primary home - primary car?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0490",
    "date": "2026-06-30",
    "words": "Is it one time pull, daily, or initiated by user? What if user is hesitant to connects account in the beginning?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0498",
    "date": "2026-06-30",
    "words": "How about a scenario do I have enough to support my parents with $2500 per month, and still save for kids college, pay mortgage, and save for retirement? How will it impact by retirement paycheck or date?"
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-002",
    "words": "ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are part of this, so the return beside it counts them too."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-003",
    "words": "Whatever the records cannot explain lands in the change-in-value line rather than being silently dropped."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-005",
    "words": "Named by ACCOUNT, not by institution — two accounts at one broker must be tellable apart (founder screenshot, 2026-08-17)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-006",
    "words": "A class with no holding we can price shows an em-dash, never a 0% — a zero reads as \"it returned nothing\", which is a different claim."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-006",
    "words": "MOVED OFF THE SCREEN 2026-09-30: this was calculated inside PerformanceScreen, so it had no row, no example and nothing able to check it (his rule: a screen computes nothing)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-007",
    "words": "LEDGER ONLY: what was actually RECEIVED, never a rate applied to a balance."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-007",
    "words": "A record with no ticker is classed by what it IS — a dividend comes from a fund, interest from a bond."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-007",
    "words": "A class that received nothing is not shown at all; where nothing was received the table does not appear."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-008",
    "words": "The benchmark runs over the SAME DATES as your return — including where your window is cut short at your own purchase date. Comparing your three months against the market's twelve is not a comparison."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-008",
    "words": "Weighted by what each holding is worth, so the blend answers \"the market, matched to my mix\" rather than a plain average of indices."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-013",
    "words": "IT IS READ, NOT BACK-SOLVED. Working it out from today’s value less the flows would make the walk add up by construction and prove nothing (his ruling behind MK-NW-F-090)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-013",
    "words": "THE DAY BEFORE THE WINDOW OPENS, not the day it opens — B-115, found 2026-09-30."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-014",
    "words": "MONEY YOU ADDED IS NOT WEALTH YOU GENERATED. That is the whole distinction this figure exists to draw, and it is why a balance going up is not the same as having earned anything."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-014",
    "words": "A DIVIDEND IS INSIDE IT, because it was earned by the holding rather than added by you."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-015",
    "words": "THE LINES ALWAYS SUM TO THE ENDING, by construction. Whatever the records cannot explain lands in the change-in-value line rather than being silently dropped — a walk that does not add up is worse than no walk."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-016",
    "words": "TWO DECIMALS AND ITS SIGN, always (Q49): +6.67%, −0.57% — never +6.7%, never a bare 6.67%."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-016",
    "words": "WHEN MONEY MOVED WOULD DECIDE THE FIGURE, IT REFUSES (Q52): the screen shows — and the exact rate per year stands in its place, with a sentence saying why."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-016",
    "words": "ONE METHOD WITH THE PORTFOLIO: the same door the Performance tab calls, asked for this one account."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-017",
    "words": "TWO DECIMALS AND ITS SIGN, always (Q49)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-017",
    "words": "WHEN MONEY MOVED WOULD DECIDE THE FIGURE, IT REFUSES (Q52) and the exact rate per year stands in its place (mark 16, v17)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-017",
    "words": "THE SAME DOOR AS ONE ACCOUNT’S RETURN (MK-PF-M-016), asked for every account at once — one method, never two."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-018",
    "words": "READ, NEVER BACK-SOLVED: with no recorded value the walk says so instead of inventing a start."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-019",
    "words": "THE LINES ALWAYS ADD UP TO THE ENDING — the change in investment value is what is left, so nothing is lost between the lines."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-020",
    "words": "A BUY OR WITHDRAWAL BIGGER THAN THIS IS REFUSED on the sheet, with the words to deposit or transfer cash in first."
   },
   {
    "said_by": "author",
    "about": "MK-XS-M-004",
    "words": "ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are in it, because \"Wealth generated\" beside it counts them."
   },
   {
    "said_by": "author",
    "about": "MK-XS-M-004",
    "words": "A RATE NEEDS SOMETHING TO STAND ON: with no beginning read from the record and no movement to point at, it shows nothing rather than a confident +0.00%."
   },
   {
    "said_by": "author",
    "about": "MK-XS-M-004",
    "words": "IT REFUSES WHEN TIMING WOULD DRIVE IT: where money moved in or out in amounts large enough that WHEN it moved decides the percentage, the screen shows the dollar walk instead."
   },
   {
    "said_by": "author",
    "about": "MK-XS-M-004",
    "words": "OVER A YEAR IT IS A YEARLY RATE and the screen says so (his ruling, 2026-08-18, restated 2026-09-25)."
   }
  ],
  "approved_drawing": {
   "drawing": "Performance v17, phone 1 (approved 2026-10-01)",
   "household": "Two linked accounts, record beginning Oct 1, 2025, read on Sep 30, 2026. All accounts: beginning market value $100,000; contributions $15,000; withdrawals $0; dividends $1,800; interest $400; change in investment value $5,800. Vanguard alone: beginning $80,000, contributions $15,000, wealth generated $6,000, ending $101,000. E*TRADE alone: beginning $20,000, nothing added or taken out, wealth generated $2,000, ending $22,000.",
   "drawn": {
    "Wealth generated, all accounts": 8000,
    "Ending market value, all accounts": 123000,
    "E*TRADE return": "+10.00%",
    "note": "The drawing shows a yearly rate of 7.46% for all accounts and 6.88% for Vanguard, but does not give the dates the $15,000 went in, so those two rates cannot be used as expected values."
   }
  }
 }
]
```
