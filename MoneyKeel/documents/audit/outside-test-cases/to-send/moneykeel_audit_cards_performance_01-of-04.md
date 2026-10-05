# Brief — check the formula, then write the test cases, from outside

MoneyKeel · calculation audit · v03 · 2026-10-04

## What this is

MoneyKeel is a personal-finance app. Every number it shows comes from a small function, and groups of
functions are run by an **orchestrator** — the one function a screen asks for a whole answer (for
example, "how are my investments doing").

Those functions already have tests, and the tests pass. Five of the functions were still wrong. The
reason: the person who wrote each function also wrote its test, from the same understanding. A wrong
rule produced a wrong example that agreed with it.

**You are the outside judge. You have two jobs for every function:**

1. **Check the formula.** Each function comes with its formula written out in words. Decide whether
   that is the right way to get the answer the function is for.
2. **Write five test cases**, with the answer worked out by hand.

Afterwards a script runs every one of your cases against the app. The owner is then shown, side by
side: your answer, the answer of a second model working separately, and the app's answer.

## The one rule that matters

**You are not shown the code inside any function, the existing tests, or any answer the app gives. Do
not ask for them.**

If you saw them you would start to agree with them. Work from what a function is *for*, its formula
in words, the owner's written decisions, published sources, and ordinary arithmetic and finance.

You are also working alone. Do not try to guess what the other model will write.

## What you are given

Below this brief is a batch of **cards**, one for each function or orchestrator. A card holds:

| Field | What it is |
|---|---|
| `id`, `name` | Its identifier and name. Quote the `id` exactly in everything you write. |
| `kind` | `orchestrator` or `function`. |
| `what_it_is_for` | The question it answers, in one sentence. |
| `formula_in_words` | **How it gets its answer — every step and every number.** Written by the in-house author from the function as it stands today. This is the thing you are judging. |
| `handed` | What it is given, as the code names it. Type names are the app's own; they are spelled out once, above the cards. |
| `inputs_it_reads` | The registered inputs behind it, each with a plain name. |
| `figures_it_feeds` | The numbers on screen it produces: the words beside each, its unit, what it answers, and when it must refuse to give a number. |
| `rules` | Rules it must follow, each marked with **who said it**. |
| `approved_drawing` | On a few orchestrators: a worked household the owner approved, with numbers that add up. |

A formula often names another function in brackets, for example `(perMonth)`. When that function's
card is not in your batch, its formula is printed under **Formulas these cards lean on**, after the
cards. Use it to work your answers. You are not asked to judge or test those.

Batches for Cash flow also carry **the published amounts the app uses** — tax bands, deductions,
contribution limits. Check them against their published source.

### Who said a rule — read this before you use one

- `"said_by": "owner"` — the owner's decision, in his own words, with its number and date. **Settled.**
  A formula that goes against an owner rule is wrong.
- `"said_by": "author"` — the in-house author's record. **A claim, not a fact.**

`formula_in_words`, the comments inside `handed`, and the comments inside the types are all the
author's. Treat every one as a claim to be checked.

## Job 1 — check the formula

For every card, read `what_it_is_for`, then `formula_in_words`, and give one verdict:

| Verdict | When |
|---|---|
| `RIGHT` | The formula is a correct way to get what the function is for, and it covers the cases it needs to. |
| `WRONG` | The formula gives a wrong answer for some input a real household could have. Say which input, and what the answer should be. |
| `INCOMPLETE` | The formula is right as far as it goes but is silent, or vague, on a case that changes the answer. Say which case. |
| `CANNOT TELL` | The card does not say enough about what the function is for to judge. Say what is missing. |

Judge it against, in this order:

1. **The owner's rules** on the card, and the **approved drawing** where there is one.
2. **Published sources** — for tax bands, deductions, contribution limits and thresholds. Name the
   source and the year. A wrong amount is a `WRONG` formula.
3. **Standard finance practice** — for returns, loan payments, payoff orders, yearly rates. Name the
   method (for example, the Modified Dietz method; the standard loan-payment formula).
4. **Ordinary arithmetic, and whether it agrees with itself.**

Look hard for these, because they are the shapes the five known errors took:

- A rule applied to money it should not touch — for example a payslip rate applied to rent.
- Two formulas that describe the same thing differently — for example one function counting an hourly
  worker's year one way and another counting it a different way. Name both cards.
- A line on the wrong side — "above 60%" where "60% or more" is meant; "after one year" where "one
  year or more" is meant.
- A yearly rate made from a period of a year or less, or a period total shown for a longer one.
- A percent given when the starting value was never really known.
- Something missing counted as zero, or a default number invented where the honest answer is "no
  answer".
- Parts that do not add up to the whole they are shown beside.
- A number rounded before the end.

For `WRONG` and `INCOMPLETE`, write **what the formula should be**, in words, and what you rest that
on. Give a `severity`: `high` when a household would see a wrong number, `medium` when it happens only
in an unusual case, `low` when it changes no number a person sees.

Many cards are small — they tidy a word, pick a label, copy a record. Judge those too; one line is
enough.

## Job 2 — write five test cases

**Five cases for every card: two easy, two complex, one edge.**

| Kind | What it is |
|---|---|
| **Easy** (2) | One thing happening. Round numbers. A person can check the answer in their head in under a minute. The two must test different things, not the same thing with different numbers. |
| **Complex** (2) | At least three inputs that all change the answer, with unround, lifelike amounts and dates. Things interacting the way they do in a real household: two earners and rent and a bonus; money added halfway through a period; one account linked and one entered by hand. |
| **Edge** (1) | The place where the formula changes, or where something is missing. Zero. Nothing entered. A negative. A date exactly on a boundary. An amount exactly at a threshold. A record that starts after the period asked about. |

A small function still gets five. For one that only answers yes or no, or tidies a word, "complex"
means the awkward inputs: mixed capitals, stray spaces, a value on each side of the line.

### Go where the mistakes were

Across your cases for a batch, make sure these shapes appear wherever a card's inputs allow them:

1. Rent, or interest and dividends, **together with** a wage whose take-home the person typed in.
2. A holding described the way a broker link describes it, not the way a person types it.
3. An account holding **cash as well as** investments.
4. A period that reaches back **further than the record does**.
5. A period of **exactly** one year, and exactly two years, to the day.
6. Money added or taken out **inside** the period, large against what was already there.
7. Two people in the household, earning differently.
8. A debt paid this month, a debt not yet paid, and a debt with no payment required.
9. Nothing entered at all.

### How to work out the expected answer

1. **By hand, showing every step.** A reader must be able to follow your arithmetic line by line
   without trusting you.
2. **`expected` is the answer you believe is RIGHT.** Where you judged the formula `RIGHT`, that is
   the formula's answer. Where you judged it `WRONG` or `INCOMPLETE`, at least one of your five cases
   must be one where the two differ — and that case carries both: `expected` (the right answer) and
   `formula_gives` (what the formula as written produces). Leave `formula_gives` out when the two are
   the same.
3. **Keep full precision until the end.** Then give two values: the exact one (at least four decimal
   places) and the one a person would see — whole dollars for totals and balances, two decimals for
   prices, expenses and percentages.
4. **"No answer" is a valid answer.** Where an input is missing or the formula cannot honestly produce
   a number, the right result is a refusal — the app shows a dash and says why. Write
   `"expected": "REFUSES"` and the reason. Never invent a default number.
5. **Some functions cannot be worked by hand** — a simulation of a thousand futures, a search for a
   rate. Test what can be: when it must refuse, what it gives at zero, which of two inputs must give
   the larger answer. Say so in `notes`.
6. **If the card does not settle the answer, do not guess.** Mark the case `RULE UNCLEAR`, write each
   reading you can see, and give the answer under each.
7. **If you cannot tell what a function is for, do not write cases for it.** List it under
   `could_not_test` with what is missing from the card.
8. **Say what the answer rests on**: the formula in words, an owner decision number, the approved
   drawing, or the published table and its year.

### Orchestrators — two more things to check

An orchestrator's answer has parts. For each orchestrator, at least one complex case must state, as
separate expected values:

- **The parts add up to the whole.** If the answer is a list of rows and a total, give each row and
  the total, and show that they sum.
- **The same input gives the same number everywhere it is used.** Where `figures_it_feeds` shows a
  figure on more than one screen, say so in the case, so the two can be compared.

Where a card carries an `approved_drawing`, one of your cases must be that household exactly as
drawn. Your other four must be your own.

## What to send back

One JSON reply for the batch, exactly in this shape and nothing outside it. Use your own plain names
for inputs; do not invent code names. They will be mapped onto the app afterwards, and **your numbers
will not be changed in the mapping** — a case that cannot be mapped goes back to the owner, not into
a drawer.

The first formula check below is an invented example of the shape, not a real card.

```json
{
  "batch": "cashflow 01",
  "written_by": "claude | gemini",
  "formula_checks": [
    {
      "id": "MK-XX-F-000",
      "name": "exampleOnly",
      "verdict": "WRONG",
      "why": "For pay every two weeks the formula divides the yearly amount by 52. There are 26 such pay days in a year, so each one comes out at half its real size.",
      "should_be": "Pay every two weeks = the yearly amount ÷ 26.",
      "rests_on": "Ordinary arithmetic: 52 weeks ÷ 2.",
      "severity": "high"
    },
    {
      "id": "MK-CF-O-004",
      "name": "incomeSummary",
      "verdict": "RIGHT",
      "why": "The rows shown are the rows added, and a typed take-home is used as typed.",
      "should_be": "",
      "rests_on": "Approved drawing income-end-to-end v07, frame 16.",
      "severity": ""
    }
  ],
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
      "rests_on": "Approved drawing income-end-to-end v07, frame 16; its rule 5: the take-home someone enters IS the take-home",
      "confidence": "high",
      "notes": ""
    }
  ],
  "could_not_test": [
    { "id": "MK-XX-F-000", "missing": "What is missing from the card." }
  ]
}
```

`verdict` is one of `RIGHT`, `WRONG`, `INCOMPLETE`, `CANNOT TELL`. `kind` is one of `easy`,
`complex`, `edge`. `confidence` is `high`, `medium` or `low`; anything below `high` needs a sentence
in `notes` saying why.

## Before you send

- One formula check for every card in the batch.
- Five cases for every card you could test — two easy, two complex, one edge — and every other card
  listed under `could_not_test`.
- Every card judged `WRONG` or `INCOMPLETE` has a case that shows the difference, with `formula_gives`.
- Everything quotes its card's `id` exactly.
- Every case shows its working, and the working reaches the expected value.
- Every list of rows sums to its total.
- No two cases for one card are the same case with different numbers.
- No answer was taken from, or adjusted towards, anything the app produces.

---

# The cards — batch "performance 01"

2 cards, so 2 formula checks and 10 cases. Put `"batch": "performance 01"` in your reply.

## The published 2026 amounts the app uses

Read from the app. **Check each against its published source and say so in `formula_checks` when one is wrong.**

**Federal income tax, 2026 — each slice of taxable income at its own rate.** Taxable income = income − the deduction.

| Filing status | Standard deduction | Added for each person 65 or over | Bands: up to … at … |
|---|---|---|---|
| Single | $16,100 | $2,050 | $12,400 at 10% · $50,400 at 12% · $105,700 at 22% · $201,775 at 24% · $256,225 at 32% · $640,600 at 35% · above that at 37% |
| Married filing jointly | $32,200 | $1,650 | $24,800 at 10% · $100,800 at 12% · $211,400 at 22% · $403,550 at 24% · $512,450 at 32% · $768,700 at 35% · above that at 37% |
| Married filing separately | $16,100 | $1,650 | $12,400 at 10% · $50,400 at 12% · $105,700 at 22% · $201,775 at 24% · $256,225 at 32% · $384,350 at 35% · above that at 37% |
| Head of household | $24,150 | $2,050 | $17,700 at 10% · $67,450 at 12% · $105,700 at 22% · $201,775 at 24% · $256,225 at 32% · $640,600 at 35% · above that at 37% |

**Senior deduction, tax years 2025 to 2028:** $6,000 for each person 65 or over, less 6% of income above $75,000 (single, head of household) or $150,000 (married filing jointly). Not given when married filing separately.

**Long-term capital gains, 2026** — 0% up to the first amount of taxable income, 15% up to the second, 20% above: Single $49,450 and $545,500 · Married filing jointly $98,900 and $613,700 · Married filing separately $49,450 and $306,850 · Head of household $66,200 and $579,600.

**Contribution limits, 2026:** 401(k) $24,500, plus $8,000 at 50 or over, or plus $11,250 instead at ages 60 to 63. IRA $7,500, plus $1,100 at 50 or over. HSA $4,400 self-only or $8,750 family, plus $1,000 at 55 or over.

**Social Security and Medicare, 2026:** 6.2% of wages up to $184,500; 1.45% of all wages; 0.9% more on wages above $200,000.

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
  "formula_in_words": "Passes the amount, the two price histories, the number of months and today to lookBack and returns its answer unchanged.",
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
  "what_it_is_for": "── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.",
  "formula_in_words": "Records of the period = those dated on or after its first day; contributions, withdrawals, dividends and interest are their totals. THE BEGINNING IS READ from the daily record at the day BEFORE the period opens, and only when investment accounts are named and the record's first day is on or before that day; the value read is the last recorded day on or before it. If it cannot be read: beginning = ending − priced gain − contributions + withdrawals (priced gain counts as 0 when the period opens today), and NO percent of any kind is given. Walk: wealth generated = ending − beginning − contributions + withdrawals; change in investment value = wealth generated − dividends − interest. Records counted are those of the investment accounts named (a record on any other account is not money put into these investments). Return = a TIME-WEIGHTED return (owner decision, 2026-10-04: \"All return should be True Weighted Return and not Dietz return.\"): the period, starting at the last recorded day on or before the day before it opens, is split at every day money moved in or out of those accounts; each piece = the value just before the next movement ÷ the value just after the last one; the pieces are multiplied and 1 is taken off. The record holds one value a day, taken after that day's money moved, so the value just before a movement = that day's value − the movement. Money moving = deposits (in), withdrawals (out), and cash transferred between accounts (out of the first, into the second). Today's value is read from the accounts as they stand; with no accounts handed in, the ending handed in closes the record. An account that first appears in the record inside the period counts as money in, at its first recorded value. A recorded day that is missing an account with holdings is not used; a typed balance stands until it is next recorded. It REFUSES — no percent, a sentence saying why, never another method — when: the beginning cannot be read; money moved on a day with no recorded value; a movement has no date; shares were moved in or out of the accounts; the value on a day is less than the money added that day; or nothing was invested. For a period longer than one year (days ÷ 365 above 1), unless it is the whole-record Since period, the figure shown is the yearly rate (1 + return) to the power 1 ÷ years, − 1.",
  "handed": "export function thePerformance(input: {\n  /** The window's first day, or null for \"since the record began\". */\n  windowStart: string | null;\n  /** The words for that window, as the screen says them (\"since Jul 19\"). */\n  windowLabel: string;\n  today: string;\n  /** What the investments are worth now. */\n  ending: number;\n  /** Every record, unfiltered — the door takes the window's own. */\n  transactions: any[];\n  /** The daily record, and which accounts count as investments. */\n  snapshotDays: any[];\n  investmentAccountIds: Set<string>;\n  /** What the priced holdings gained over the window — used ONLY to derive a beginning the record\n   *  cannot reach. It never becomes the return. */\n  pricedGain: number;\n  /** True for \"Since\" — the whole record. Its return is the window's OWN total and is never turned\n   *  into a yearly rate (Performance v17, phone 3: \"Since Jun 3, 2024 +16.24% … not a yearly rate\").\n   *  A fixed window longer than a year (2Y) still shows the yearly rate. */\n  wholeRecord?: boolean;\n  /** The accounts as they stand now. Today's values are read from them, so the last day of the\n   *  return is measured the same way every recorded day was — and an account added today is seen\n   *  as arriving today, not as a gain. */\n  accounts?: any[];\n}): WindowFigures",
  "inputs_it_reads": [
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

## Formulas these cards lean on

2 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-PF-F-022",
  "name": "factorOverMonths",
  "what_it_is_for": "Price factor over the trailing window: last close ÷ the close at (now − months).",
  "formula_in_words": "Nothing with fewer than two prices. Cut-off = today moved back the given number of months. Nothing when the first price on record is later than the cut-off — the record does not reach back that far. Start = the last price on or before the cut-off. Factor = latest close ÷ start close; nothing when the start close is zero or less."
 },
 {
  "id": "MK-PF-F-023",
  "name": "lookBack",
  "what_it_is_for": "What if I had moved this money?",
  "formula_in_words": "Nothing unless the amount is above zero and both funds have a factor (factorOverMonths). Stayed: end value = amount × the factor of the fund it was in; change = end value − amount; percent = (factor − 1) × 100, at full precision. Moved: the same with the other fund's factor. Difference = moved end value − stayed end value."
 }
]
```
