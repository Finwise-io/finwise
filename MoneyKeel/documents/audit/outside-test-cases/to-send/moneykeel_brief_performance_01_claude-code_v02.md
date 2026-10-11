# Brief — check the formula, then write the test cases, from outside

MoneyKeel · calculation audit · v04 · 2026-10-10 · Claude Code edition, 2026-10-09 · batch performance 01

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

## Running this in Claude Code — read before anything else

You are running with a shell and file tools. That makes the one rule above easier to break by
accident, so it is spelled out here.

**Stay outside the app.**

- Work in a new, empty folder (for example `~/mk-audit/performance_01/`). Put this brief there and
  nothing else.
- Do not open, list, search, `grep`, `git log` or run anything in the MoneyKeel repository, or any
  other project on this machine — not to "check a name", not to "confirm a type". If you find you
  are inside a repository, stop and move to the empty folder.
- Do not read another batch's reply, an earlier reply to this batch, or the other model's reply.
- Do not change the cards. If a card looks wrong, that is a finding: say so in `formula_checks`.

**What you may use.**

- Python or `bc` as a calculator, to check arithmetic you have already written out by hand. The
  `working` lines are still written for a person to follow; the script only confirms them.
- Every return in this module is a time-weighted return (owner decision Q16; DEC-1669), never a
  money-weighted one. Where a case needs a rate, work it by hand from the dated values: split the
  period at each movement of money, divide each piece's closing value by its opening value, multiply
  the pieces and take 1 off. You may write your own calculator for that chain-linking, from scratch;
  never import or copy anything from the app. Give the rate to at least four decimal places.
  (Corrected 2026-10-10.)
- Web search, only for published rules (for example the IRS holding period for long-term gains).
  Name the source and the year in `rests_on`.

**Where the answer goes.**

- Write the reply to `performance_01.claude.json` in that folder — the JSON object only, nothing
  around it. (`N` is this batch's number.)
- Build it card by card: finish one card's formula check and its five cases, add them to the file,
  then move on. Do not hold 75 cases in your head and write them at the end.
- When every card is done, run the checker at the end of this brief and fix anything it reports.
- Your last message: the file's path and one line of counts (cards, checks, cases, could-not-test,
  and how many `WRONG` / `INCOMPLETE`). No summary of findings — the owner reads the file.

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

- `"said_by": "owner"` — the owner's decision, in the owner's own words, with its number and date. **Settled.**
  A formula that goes against an owner rule is wrong.
- `"said_by": "author"` — the in-house author's record. **A claim, not a fact.**

`formula_in_words`, the comments inside `handed`, and the comments inside the types are all the
author's. Treat every one as a claim to be checked.

- Some owner rules on a card are cut off mid-sentence, or are about another screen. Use only what
  the words actually say. Do not reconstruct the missing part, and do not apply a rule about one
  screen to a card it does not speak to.
- `inputs_it_reads` are registry tags and are sometimes loose (a ledger function tagged "logged
  expenses", a label function tagged "holding price"). Judge what a function is given from
  `handed` and its formula, not from these tags. A tag that plainly does not fit is worth one line
  in `why`, at `low` severity, if it changes nothing a person sees.

### Owner decisions that bind every card but are not printed on them

These are the owner's own answers from the open-question log. They are **settled**, exactly like an
owner rule on a card, and they come before anything the author wrote.

- **Q1 (2026-08-20) — when money moves inside a period.** Keep the 1% threshold only as a fallback for
  money that moved with no date. Compute the rate with the movements at the start of the period and
  again at the end; refuse the rate when the two differ by more than about 20% of the figure or about
  1 percentage point, whichever is tighter, and show the dollar walk instead.
- **Q2 (2026-08-20) — money-market funds.** A holding is a fund only when the evidence says so (the
  broker's cash-equivalent flag, a ticker list, its name, or the person's own answer). A balance with
  no label is cash. The name is read first on every road; a position clearly named money market is
  never counted as cash.
- **Q3 (2026-08-20) — the edges of a period.** Both edge days are inside the period: 1–31 July means
  1 July and 31 July are both in. App-wide.
- **Q16 (updated 2026-10-04) — which return.** Every return in the app is a **time-weighted return**,
  not Modified Dietz and not money-weighted.
- **Q56 (2026-08-20) — arithmetic.** Full-precision decimal arithmetic end to end; round once, at
  display. No tolerance is accepted in place of a fix.

Where one of these and a card disagree, the card is what you are judging: say which decision it goes
against.

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
   method (for example, the time-weighted return; the standard loan-payment formula).
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

In a Performance batch, shapes 1, 7 and 8 (wages and rent, two earners, debts) rarely fit a card's
inputs. Use them only where a card's inputs genuinely allow; do not bend a case to include them.
Shapes 2–6 and 9 fit most of these cards — use them.

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
9. **Every case names its dates.** Give today's date (YYYY-MM-DD) in both `given` and `inputs`, and,
   where it matters, the period label and the period's first day. A case that leans on "today"
   without saying which day cannot be run.
10. **Rates.** Where a function returns a rate as a decimal, `exact` is that decimal (`0.1000` for
    ten percent) and `shown` is what the screen prints (`+10.00%`). Where a card says the function
    itself returns a percent, follow the card and say so in `notes`.
11. **Shapes of the special answers**, so the script can read them:
    - A refusal: `"expected": "REFUSES"`, and `notes` begins with `REFUSES because …`.
    - `formula_gives` sits beside `expected` at the top level of the case, in the same shape.
    - A rule that is unclear: `"expected": "RULE UNCLEAR"`, plus
      `"readings": [ { "reading": "…", "expected": … }, … ]` with each reading's own answer.

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

One JSON object for the batch, written to `performance_01.claude.json`, exactly in this shape and nothing outside it. Use your own plain names
for inputs; do not invent code names. They will be mapped onto the app afterwards, and **your numbers
will not be changed in the mapping** — a case that cannot be mapped goes back to the owner, not into
a drawer.

The first formula check below is an invented example of the shape, not a real card.

```json
{
  "batch": "cashflow 01",
  "written_by": "claude",
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

14 cards, so 14 formula checks and 70 cases. Put `"batch": "performance 01"` in your reply.

## Notes for this batch

- **The return on MK-NW-O-008 is time-weighted** (owner decision Q16, above, and DEC-1669). Q1's comparison of the
  rate with the money moved at the start and at the end was written for the earlier method; the card no
  longer makes that comparison. It refuses instead, in the cases its formula lists, and MK-NW-F-105 writes
  the sentence. If you think Q1 should still apply, say so in `why` — do not apply it yourself.
- **Corrected on 2026-10-10:** the line in *Running this in Claude Code* about working out a rate used to tell
  you to write a money-weighted solver. That was wrong for this module: every return here is time-weighted
  (owner decision Q16, DEC-1669). The line, and the example method named in Job 1, now say so.
- **The time-weighted-return engine is in this batch** (MK-ST-F-081, with MK-ST-F-082 sorting the records into
  money moved and MK-ST-F-080 checking dates). MK-NW-O-008 calls it for every return. Its return is a share
  over the whole period; MK-NW-O-008 turns it into a yearly rate, (1 + return) to the power 1 ÷ years, − 1,
  for a period longer than a year.
- **MK-NW-O-008 lists figures that other functions produce.** Money received by kind and each category's
  return come from MK-NW-F-084 (batch 3); the market comparison (MK-PF-M-008) and available cash
  (MK-PF-M-020) come from functions in other batches. Judge the formula on what it describes; where the
  gap matters to a verdict, say so in `why`.
- **The worked-back beginning** (owner decision DEC-3656, 2026-10-09) is on the MK-NW-O-008 card: a
  certificate of deposit with a stated rate gains by that rate, and a holding with no price history and no
  rate stops the walk with a sentence naming it. MK-NW-F-091 and MK-NW-F-127 to MK-NW-F-130 are the parts.
- **The approved drawing does not name its period or today's date.** It gives the record's first day
  (1 Oct 2025) and the day it was read (30 Sep 2026), but not which period chip is selected. Your
  drawing case must use the household exactly as drawn; where the answer depends on the period,
  mark it `RULE UNCLEAR` and give each reading — do not pick one.
- **The drawing's yearly rates (7.46% for all accounts, 6.88% for Vanguard) cannot be used** as expected
  values, because the dates of the $15,000 are not given. A time-weighted return depends on those dates.
  The drawing has no per-account split of dividends and interest either. Do not invent either; test only
  what the drawing fixes.
- **Owner rules on MK-NW-O-008.** Most are about other screens or about process. Some are cut off
  mid-sentence: DEC-0046, DEC-0112, DEC-0126, DEC-0135, DEC-0143, DEC-0192, DEC-0229, DEC-0230. Use only what the words actually say.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface DatedAmount { date: string; accountId: string; amount: number }

export type GainRow = {
  name?: string;
  cappedSince?: string | null;
  gain?: number;
  periodReturn?: number | null;
  marketValue?: number;
  couponRate?: number | null;
  position?: { ticker?: string; label?: string; name?: string; last_price?: number; value_now?: number; lots?: { shares?: number }[] };
};

export interface TimeWeightedInput {
  /** The daily record, with today's day in it. */
  days: SnapshotDay[];
  /** The accounts being measured. */
  accountIds: Set<string>;
  /** Those of them that are cash accounts (rule 3). */
  cashIds?: Set<string>;
  /** Deposits (+) and withdrawals (−) on the measured accounts that are not cash. */
  flows: DatedAmount[];
  /** Interest credited to a cash account — the one change in cash that is earned. */
  interest?: DatedAmount[];
  /** Days on which shares were moved in or out of a measured account. */
  sharesMoved?: string[];
  /** The day whose close is the beginning, and the last day. */
  start: string;
  end: string;
}

export interface TimeWeightedVerdict {
  /** The return as a share (0.1097 = 10.97%), at full precision — or null when it is refused. */
  rate: number | null;
  refused?: TimeWeightedRefusal;
  /** The day a refusal is about, where it is about one. */
  day?: string;
  /** The day the measured period really starts: the recorded day at or before the start, or the
   *  first day there was money when it started with none. Null when refused. */
  measuredFrom: string | null;
}

export interface WindowFigures {
  /** The first day of the window, or null for "since the record began". */
  windowStart: string | null;
  /** The records inside the window. */
  ledger: any[];
  /** How the beginning became the ending, line by line — the rows always sum to the ending. Null when
   *  the record cannot reach the window's beginning: the walk is not drawn rather than started from a
   *  beginning worked back from today (outside review, 2026-10-07; Performance v17). */
  walk: ChangeWalk | null;
  /** What the measured accounts are worth today — known whether or not the walk can be drawn. */
  ending: number;
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
  /** Set only where the beginning would be worked back from today and a holding's gain cannot be known:
   *  "The beginning can't be worked back: … has no price history." Empty otherwise. (DEC-3656, 2026-10-09) */
  cannotWorkBack: string;
}
```

## The cards

```json
[
 {
  "id": "MK-NW-O-008",
  "name": "thePerformance",
  "kind": "orchestrator",
  "what_it_is_for": "How are my investments doing over a period: where they started, what I put in and took out, what they made, where they ended, and the return?",
  "formula_in_words": "Records of the period = those dated on or after its first day; contributions, withdrawals, dividends and interest are their totals. Contributions also count cash or shares transferred in from an account that is not one of those measured, and the first recorded value of an account that joined the record inside the period (its own records up to that day are then not counted again); withdrawals also count cash or shares transferred out. A transfer between two measured accounts is neither. THE BEGINNING IS READ from the daily record at the day BEFORE the period opens, and only when investment accounts are named and the record's first day is on or before that day; the value read is the last recorded day on or before it. If it cannot be read and the record holds days for these accounts that begin after the period opens: NO walk (no beginning, no wealth generated), and a sentence: The record begins <its first day>, so it cannot say what this account was / these accounts were worth on <the day before the period>. If it cannot be read and there is no record of these accounts at all: beginning = ending − priced gain − contributions + withdrawals (priced gain counts as 0 when the period opens today). The priced gain is each holding's gain over the period by the one rule for it (pricedGainOf), years = the period's days ÷ 365; a measured account with no holdings counts as its own holding, worth its balance — a certificate of deposit stating its rate gains by that rate, any other has no price history. With no period at all (day one) no rate is applied and a holding with no price history adds nothing. Owner decision DEC-3656, 2026-10-09: where a period is given that does not open today and any holding's gain cannot be known (it holds something, has no price history and no stated rate): NO walk (no beginning, no wealth generated), and the sentence: The beginning can't be worked back: <name> has no price history. Several names are joined with commas and \"and\" before the last, and say \"have no price history\". A holding is named by its ticker (the security's name where the ticker is a 9-character identifier); an account by its display name; a dollar gain handed in as unknown is named \"a holding\". Either way NO percent of any kind is given. The ending is given on its own as well, whether or not there is a walk. Walk: wealth generated = ending − beginning − contributions + withdrawals; change in investment value = wealth generated − dividends − interest. Records counted are those of the investment accounts named (a record on any other account is not money put into these investments). Return = a TIME-WEIGHTED return (owner decision, 2026-10-04: \"All return should be True Weighted Return and not Dietz return.\"): the period, starting at the last recorded day on or before the day before it opens, is split at every day money moved in or out of those accounts; each piece = the value just before the next movement ÷ the value just after the last one; the pieces are multiplied and 1 is taken off. The record holds one value a day, taken after that day's money moved, so the value just before a movement = that day's value − the movement. Money moving = deposits (in), withdrawals (out), cash transferred between accounts (out of the first, into the second), and shares moved in or out at what they were worth (the amount, or shares × price) when the record says which way they went. Ending = what the measured accounts are worth today, each counted whole (its balance, uninvested cash inside it included), read from the accounts handed in — a figure handed in beside them is not used, so no two screens can give two endings; with no accounts handed in, the ending handed in is used and closes the record. Today's value for the return is read from the same accounts. An account that first appears in the record inside the period counts as money in, at its first recorded value. A recorded day that is missing an account with holdings is not used; a typed balance stands until it is next recorded. It REFUSES — no percent, a sentence saying why, never another method — when: the beginning cannot be read; money moved on a day with no recorded value; a movement has no date; shares were moved in or out and the record does not say which way or what they were worth; the value on a day is less than the money added that day; or nothing was invested. For a period longer than one year (days ÷ 365 above 1), unless it is the whole-record Since period, the figure shown is the yearly rate (1 + return) to the power 1 ÷ years, − 1.",
  "handed": "export function thePerformance(input: {\n  /** The window's first day, or null for \"since the record began\". */\n  windowStart: string | null;\n  /** The words for that window, as the screen says them (\"since Jul 19\"). */\n  windowLabel: string;\n  today: string;\n  /** What the measured accounts are worth now — used ONLY when no accounts are handed over. With\n   *  accounts, the function reads it from them, so no two screens can hand it two different figures. */\n  ending?: number;\n  /** Every record, unfiltered — the door takes the window's own. */\n  transactions: any[];\n  /** The daily record, and which accounts count as investments. */\n  snapshotDays: any[];\n  investmentAccountIds: Set<string>;\n  /** What the priced holdings gained over the window — used ONLY to derive a beginning the record\n   *  cannot reach. It never becomes the return. Null = a holding's gain cannot be known (DEC-3656).\n   *  A caller that hands over `holdings` instead lets the door calculate it with the window's own years. */\n  pricedGain?: number | null;\n  /** The holdings themselves (rows of buildPerformance, or GainRows) — preferred to `pricedGain`, so the\n   *  ONE rule (pricedGainOf) decides each holding's gain over THIS window, and the refusal can name the\n   *  ones it cannot know. (DEC-3656, 2026-10-09) */\n  holdings?: GainRow[];\n  /** True for \"Since\" — the whole record. Its return is the window's OWN total and is never turned\n   *  into a yearly rate (Performance v17, phone 3: \"Since Jun 3, 2024 +16.24% … not a yearly rate\").\n   *  A fixed window longer than a year (2Y) still shows the yearly rate. */\n  wholeRecord?: boolean;\n  /** The accounts as they stand now. Today's values are read from them, so the last day of the\n   *  return is measured the same way every recorded day was — and an account added today is seen\n   *  as arriving today, not as a gain. */\n  accounts?: any[];\n}): WindowFigures",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-012 bond coupon rate",
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
    "what_it_answers": "How much this one account grew over the window you picked, with money you added or took out left out. Shown per year when the window is longer than a year.",
    "when_it_refuses": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or the value that day is less than the money added. It never shows another kind of figure in its place.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-017",
    "words_on_screen": "Return",
    "unit": "percent-signed",
    "what_it_answers": "How much all your investments grew over the window you picked, with money you added or took out left out. Per year when the window is longer than a year.",
    "when_it_refuses": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or the value that day is less than the money added. It never shows another kind of figure in its place.",
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
    "when_it_refuses": "Nothing is shown, and the walk beneath says in words why — either the record cannot reach the beginning, or money moved on a day with no recorded value.",
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
    "words": "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\""
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-016",
    "words": "WHERE IT CANNOT BE MEASURED IT SHOWS NO PERCENT, and never another method in its place."
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
    "words": "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669). Where it cannot be measured it shows no percent, and never another method in its place."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-017",
    "words": "AN ACCOUNT THAT JOINS THE RECORD inside the window counts as money in, at its first recorded value — nothing it was already worth is earned."
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
    "words": "IT IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\" Where a piece cannot be measured it shows nothing, and never another method."
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
 },
 {
  "id": "MK-ST-F-081",
  "name": "timeWeightedReturn",
  "kind": "function",
  "what_it_is_for": "The time-weighted return of a set of accounts between two days, or the reason it cannot be measured.",
  "formula_in_words": "Works from the daily record, which holds one value per account per day, taken after that day's money moved. Days after the last day asked for, and days not written as year-month-day (isDay), are ignored. Each measured account has its own line of values, from its first recorded day to its last. The total on a day = the values that day of the measured accounts whose line covers that day. An account that has ever held a priced security must have a value on that very day, or the day is not used at all; any other account (a typed or cash balance) keeps its last earlier value until its next one. THE BEGINNING = the latest recorded day on or before the start day whose total can be formed with at least one account in it; with none it refuses (the start is not recorded). The last day asked for must be in the record and its total formed, or it refuses (the end is not recorded). It refuses when a deposit or withdrawal on a measured account that is not cash has no year-month-day date, and when shares were moved on any day after the beginning up to the last day (naming the first such day). THE PIECES: from the beginning, take each later usable day in order. Money in on that day, account by account: an account there now but not on the previous usable day brings in its whole value (it joined the record); one there before but not now takes out its last value (it left); a cash account brings in its change in value less the interest credited to it after the previous usable day up to this day (cash earns only interest); any other account brings in its deposits (plus) and withdrawals (minus) dated after the previous usable day up to this day, and if one of those is dated before this day it refuses, naming that day (money moved on a day with no recorded value). The value just before the money moved = this day's total − money in. When the previous total is more than half a cent: it refuses, naming the day, if that value is below minus half a cent (the value is less than the money added); otherwise the growth so far is multiplied by that value (never below zero) ÷ the previous total, and the measured period starts at the previous day if it has not started yet. When the previous total is half a cent or less, nothing is measured for that piece, and a value just before of more than half a cent either way refuses (value with nothing behind it). When no piece was measured it refuses (nothing invested). THE RETURN = the pieces multiplied together − 1, as a share at full precision (not a percent, and never turned into a yearly rate here), with the day the measured period started. It never falls back to another method.",
  "handed": "export function timeWeightedReturn(a: TimeWeightedInput): TimeWeightedVerdict"
 },
 {
  "id": "MK-ST-F-082",
  "name": "movementsOf",
  "kind": "function",
  "what_it_is_for": "Which of a household's records are money moving in or out of the measured accounts, which are interest, and on which days shares were moved.",
  "formula_in_words": "Sorts a household's records, for the accounts being measured, into money moving in or out, interest, and days shares were moved. Each record's date is its first ten characters; a missing or unreadable amount counts as zero. A deposit on a measured account is money in (plus its amount); a withdrawal on one is money out (minus its amount) — the sign comes from the kind of record, so a withdrawal written as a negative amount becomes money in. A transfer is money out of its first account when that account is measured, and money into its second account when that one is measured, so a transfer between two measured accounts appears as both. Shares moved (a transfer in kind): nothing when both accounts named are measured, or neither is, or when only one account is named and it is not measured. Otherwise it is money into or out of the measured account at what the shares were worth — the record's amount when above zero, else shares × price: in when they arrive in the measured account (or, with one account named, when the record says in), out when they leave (or the record says out). When the direction is neither in nor out, or the worth is not above zero, the day goes on the list of days shares were moved instead. Interest on a measured account that was not reinvested is interest (plus its amount). Every other kind of record is ignored.",
  "handed": "export function movementsOf(transactions: any[], ids: Set<string>): { flows: DatedAmount[]; interest: DatedAmount[]; sharesMoved: string[] }",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-ST-F-080",
  "name": "isDay",
  "kind": "function",
  "what_it_is_for": "Whether a value is a calendar day written as year-month-day.",
  "formula_in_words": "True only when the value is text written exactly as four digits, a dash, two digits, a dash and two digits (year-month-day). It does not check that the month or the day exists, so 2026-02-31 passes. Anything else is false: a number, nothing at all, or a date with a time written after it.",
  "handed": "const isDay = (d: unknown): d is string"
 },
 {
  "id": "MK-NW-F-090",
  "name": "windowStartKey",
  "kind": "function",
  "what_it_is_for": "The first day of a period: the day after the record's first day for Since, 1 January for This year, and the same day one month, one year or two years back for the others.",
  "formula_in_words": "Since: the day after the earliest recorded day, but never later than today; today when nothing is recorded. This year: 1 January of today's year. 1M, 3M, 6M, 1Y and 2Y: today moved back 1, 3, 6, 12 or 24 months — the same day of that month, or its last day when that month is shorter (one month before 31 March is 28 February). Any other label: 12 months back, the same way.",
  "handed": "export function windowStartKey(period: string, recordDates: string[], today: string): string"
 },
 {
  "id": "MK-NW-F-092",
  "name": "investmentAccountIdsOf",
  "kind": "function",
  "what_it_is_for": "Which accounts count as investments: those holding stocks and funds, bonds and CDs, alternatives or a mix, and never cash or property.",
  "formula_in_words": "The ids of the accounts whose class is Stocks / Funds, Bonds & CDs, Alternatives or Unclassified. Cash and property accounts are left out.",
  "handed": "export function investmentAccountIdsOf(\n  accounts: { asset_id?: string | number }[],\n  classOf: (a: any) => string,\n): Set<string>"
 },
 {
  "id": "MK-NW-F-103",
  "name": "investmentRecordDates",
  "kind": "function",
  "what_it_is_for": "THE DAYS THE RECORD HOLDS AN INVESTMENT VALUE FOR, oldest first.",
  "formula_in_words": "The dates of the recorded days that hold a value for at least one of the named accounts, oldest first. Empty when no accounts are named.",
  "handed": "export function investmentRecordDates(snapshotDays: any[], investmentAccountIds: Set<string>): string[]"
 },
 {
  "id": "MK-NW-F-104",
  "name": "closedWith",
  "kind": "function",
  "what_it_is_for": "The daily record with today added to it, worth what the caller says the measured accounts are worth now.",
  "formula_in_words": "The daily record with today added: one row per account that the latest earlier recorded day holds (of the accounts named), carrying between them the ending value handed in. The record is returned unchanged when there is no earlier day or it holds none of those accounts. It adds no arithmetic: it lets a return be measured to today when the caller gave an ending value and no accounts.",
  "handed": "function closedWith(days: any[], ids: Set<string>, today: string, ending: number): any[]"
 },
 {
  "id": "MK-NW-F-105",
  "name": "whyNoReturn",
  "kind": "function",
  "what_it_is_for": "WHY A RETURN CANNOT BE MEASURED, in words a person reads.",
  "formula_in_words": "The sentence shown where a time-weighted return cannot be measured; empty when it was measured. Money moved on a day with no recorded value: names the day and says a return cannot be measured across it. A movement with no date: says so. Shares moved in or out: names the day and says the records do not say what they were worth. The value recorded on a day is less than the money added that day: names the day. Nothing invested over the period: says there is no return to state. Today's value not on record: says so. A beginning that cannot be read has no sentence here — the period is shown as not covered instead.",
  "handed": "export function whyNoReturn(v: TimeWeightedVerdict | null): string"
 },
 {
  "id": "MK-NW-F-091",
  "name": "pricedGainOf",
  "kind": "function",
  "what_it_is_for": "What the holdings gained over the period in dollars: the true gain for a holding bought inside the period, the price move's share of today's value for one with a price history, the stated rate's share for a CD — and nothing (unknown) when any holding has neither.",
  "formula_in_words": "Each holding's gain over the period, added up. For a holding bought inside the period: its whole gain (value − cost). For any other holding with a period return: value × (1 − 1 ÷ (1 + return)) when its value is above zero, which is today's value less its value when the period opened; nothing when it holds nothing. For a holding with no period return that states a yearly rate (only a certificate of deposit is given one): value × (1 − 1 ÷ (1 + rate) to the power years), years handed in (none handed in counts as 0, so it gains nothing). Any other holding that holds something (its value, or the broker's last price × its shares, or the value it was entered at, above zero) has a gain that cannot be known: the answer is then NOTHING — not zero — for the whole total. A holding that holds nothing gains nothing. (Owner decision DEC-3656, 2026-10-09.)",
  "handed": "export function pricedGainOf(rows: GainRow[], years = 0): number | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-012 bond coupon rate"
  ]
 },
 {
  "id": "MK-NW-F-127",
  "name": "gainOfRow",
  "kind": "function",
  "what_it_is_for": "THE ONE RULE FOR WHAT A HOLDING GAINED OVER THE WINDOW (DEC-3656, 2026-10-09), or null when it cannot be known.",
  "formula_in_words": "What one holding gained over the window, or nothing when that cannot be known. Bought inside the window: its own gain (value less cost). With a return for the period: value now × (1 − 1 ÷ (1 + the return)), and $0 when it holds nothing. A CD with a stated rate above zero: value now × (1 − 1 ÷ (1 + the rate) to the power of the window's years), and $0 when it holds nothing. Otherwise: $0 when it holds nothing, and nothing (unknown) when it holds something — a holding with no price history and no rate.",
  "handed": "function gainOfRow(r: GainRow, years: number): number | null",
  "inputs_it_reads": [
   "MK-XS-I-012 bond coupon rate"
  ]
 },
 {
  "id": "MK-NW-F-128",
  "name": "heldValueOf",
  "kind": "function",
  "what_it_is_for": "What a holding is worth when no price series prices it: the broker's last mark × shares, or the value it was built at by hand.",
  "formula_in_words": "What a holding is worth when no price history prices it: its market value when that is above zero; else its shares added up × the broker's last price when there is one; else the value it was last built at; else $0.",
  "handed": "function heldValueOf(r: GainRow): number",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price"
  ]
 },
 {
  "id": "MK-NW-F-129",
  "name": "gainRowName",
  "kind": "function",
  "what_it_is_for": "What the refusal sentence calls a holding: its own name, else its ticker — a CUSIP-shaped ticker gives way to the security's name.",
  "formula_in_words": "What the sentence calls a holding: the name it was given; else its ticker — unless the ticker is a security code (nine capital letters and digits, with a digit in it) and the holding has a name, when the name is used; else its name; else \"a holding\".",
  "handed": "function gainRowName(r: GainRow): string"
 },
 {
  "id": "MK-NW-F-130",
  "name": "cannotWorkBackSentence",
  "kind": "function",
  "what_it_is_for": "THE SENTENCE where the beginning cannot be worked back (DEC-3656, 2026-10-09, his wording).",
  "formula_in_words": "The sentence when the beginning cannot be worked back: \"The beginning can't be worked back: <names> has no price history.\" With several names, they are joined by commas with \"and\" before the last, and the verb is \"have\". With no name, \"a holding\".",
  "handed": "function cannotWorkBackSentence(names: string[]): string"
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some of this batch's cards compute something another function also computes, in a batch you are not judging. Their formulas are printed here so you can check the two agree, as the hunt for "two formulas that describe the same thing differently" asks. Do not judge or test these; where one disagrees with a card in this batch, the finding goes on this batch's card and names both ids.

**The first day of a period** — in this batch: MK-NW-F-090

```json
[
 {
  "id": "MK-PF-F-008",
  "name": "startDateFor",
  "what_it_is_for": "The date a period starts from, counted back from today: one, three or six months, the start of this year, one year or two years.",
  "formula_in_words": "1M, 3M and 6M: today moved back that many months; 1Y and 2Y: back 12 or 24 months — the same day of that month, or its last day when that month is shorter (one month before 31 March is 28 February; a year before 29 February is 28 February). This year: 1 January of today's year. Any other label: today."
 },
 {
  "id": "MK-PF-F-022",
  "name": "factorOverMonths",
  "what_it_is_for": "Price factor over the trailing window: last close ÷ the close at (now − months).",
  "formula_in_words": "Nothing with fewer than two prices. Cut-off = today moved back the given number of months. Nothing when the first price on record is later than the cut-off — the record does not reach back that far. Start = the last price on or before the cut-off. Factor = latest close ÷ start close; nothing when the start close is zero or less."
 }
]
```

**A period total versus a yearly rate** — in this batch: MK-NW-O-008

```json
[
 {
  "id": "MK-PF-F-010",
  "name": "periodReturn",
  "what_it_is_for": "Price return of a ticker over a period (decimal).",
  "formula_in_words": "End = the latest close. Start = the last close on or before the period's start date — or, when every price on record is later than that date, the FIRST close on record. Return = end ÷ start − 1. For 2Y it is given as a yearly rate. When the prices reach back two years: (end ÷ start) to the power one half, − 1. When they do not: the yearly rate over the span the prices do cover — (end ÷ start) to the power 1 ÷ years, − 1, where years = the days from the first price to the last ÷ 365.25 — and only when that span is more than one year; a span of a year or less keeps its own total. Nothing when there are no prices or the start close is zero or less."
 },
 {
  "id": "MK-PF-F-011",
  "name": "periodReturnSince",
  "what_it_is_for": "Price return from an explicit start DATE to now (for purchase-capped windows).",
  "formula_in_words": "The same as periodReturn but measured from a given date: latest close ÷ the last close on or before that date (or the first close on record when all are later), − 1. Never turned into a yearly rate."
 }
]
```

**What a holding gained over a period, in dollars** — in this batch: MK-NW-F-091, MK-NW-F-127

```json
[
 {
  "id": "MK-PF-F-005",
  "name": "unrealizedGain",
  "what_it_is_for": "Unrealized gain = market value − cost basis (null price → 0).",
  "formula_in_words": "Market value − cost; 0 when there is no price."
 },
 {
  "id": "MK-PF-F-021",
  "name": "periodDollarDelta",
  "what_it_is_for": "The DOLLAR change implied by a period return on today's total — the approved Home hero shows \"up $11,200 (1.4%) this month\": dollars AND percent from the SAME measured return, so the two figures can never disagree (one concept, one source).",
  "formula_in_words": "The dollars a return stands for: today's total × return ÷ (1 + return), rounded to whole dollars. 0 when either input is not a number or the return is −100% or worse."
 }
]
```

---

## The checker — run it before you finish

Save as `check.py` beside your reply and run `python3 check.py performance_01.claude.json`.
It checks the shape only; it cannot tell whether an answer is right.

```python
import json, sys
from collections import Counter
r = json.load(open(sys.argv[1]))
CARDS = ["MK-NW-O-008", "MK-ST-F-081", "MK-ST-F-082", "MK-ST-F-080", "MK-NW-F-090", "MK-NW-F-092", "MK-NW-F-103", "MK-NW-F-104", "MK-NW-F-105", "MK-NW-F-091", "MK-NW-F-127", "MK-NW-F-128", "MK-NW-F-129", "MK-NW-F-130"]
BATCH = "performance 01"
bad = []
if r.get("batch") != BATCH: bad.append(f"batch should be {BATCH!r}")
if r.get("written_by") != "claude": bad.append("written_by should be 'claude'")
checks = {c["id"]: c for c in r.get("formula_checks", [])}
skipped = {c["id"] for c in r.get("could_not_test", [])}
for cid in CARDS:
    if cid not in checks: bad.append(f"{cid}: no formula check")
for cid in checks:
    if cid not in CARDS: bad.append(f"{cid}: not a card in this batch")
cases = r.get("cases", [])
by = {}
for c in cases: by.setdefault(c.get("id"), []).append(c)
for cid in CARDS:
    if cid in skipped: continue
    k = Counter(c.get("kind") for c in by.get(cid, []))
    if k != Counter(easy=2, complex=2, edge=1): bad.append(f"{cid}: cases {dict(k)}, want 2 easy, 2 complex, 1 edge")
    v = checks.get(cid, {}).get("verdict")
    if v not in ("RIGHT", "WRONG", "INCOMPLETE", "CANNOT TELL"): bad.append(f"{cid}: verdict {v!r}")
    if v in ("WRONG", "INCOMPLETE") and not any("formula_gives" in c for c in by.get(cid, [])):
        bad.append(f"{cid}: judged {v} but no case carries formula_gives")
for c in cases:
    tag = f"{c.get('id')} / {c.get('title', '?')}"
    if c.get("id") not in CARDS: bad.append(f"{tag}: id not in batch")
    if not c.get("working"): bad.append(f"{tag}: no working")
    if c.get("confidence") not in ("high", "medium", "low"): bad.append(f"{tag}: confidence")
    if c.get("confidence") in ("medium", "low") and not c.get("notes"): bad.append(f"{tag}: needs notes")
    if c.get("expected") == "REFUSES" and not str(c.get("notes", "")).startswith("REFUSES because"):
        bad.append(f"{tag}: refusal reason missing from notes")
    if c.get("expected") == "RULE UNCLEAR" and len(c.get("readings", [])) < 2:
        bad.append(f"{tag}: RULE UNCLEAR needs at least two readings")
    e = c.get("expected")
    if isinstance(e, dict) and isinstance(e.get("rows"), list):
        tot = [v for k, v in e.items() if k != "rows" and isinstance(v, dict) and "exact" in v]
        s = sum(x.get("exact", 0) for x in e["rows"])
        if tot and all(abs(s - t["exact"]) > 1e-4 for t in tot): bad.append(f"{tag}: rows sum to {s}, no total matches")
print("\n".join(bad) if bad else f"OK — {len(checks)} checks, {len(cases)} cases, {len(skipped)} could not test")
```
