# MoneyKeel — the Cash flow module, judged from outside

Written for: OpenAI, the outside judge of every Cash flow calculation. Package v01, built 2026-10-24 from the app as it stands on disk (last commit d7c79519, plus 148 changed files not yet committed). You have not seen any review of this module and none is given here: judge it as if for the first time.

# What this is

MoneyKeel is a personal-finance app for readers of 55 to 70. The Cash flow module answers: what comes in, what goes out, what is left this month, what the tax and the take-home are, what bills are ahead, and what is owed. This package holds every one of its functions that does arithmetic — 219 cards, 14 of them orchestrators — with its formula in words as it is in the app today; every figure its screens print (67); every decision of the owner's that governs it (175); the published amounts it uses; and the tenets every figure must meet. 22 more functions store or demonstrate and do no arithmetic of their own; they are listed at the end with the reason, and no cases are asked for them.

Afterwards a script runs every case you write against the app. Your answer, the app's answer and any difference go to the owner side by side. Nothing you write is changed to agree with the app.

# Read in this order

| File | What it is | One session? |
|---|---|---|
| `moneykeel_audit_module_cf_for-openai_v01.md` | This brief: the jobs, how to reply, how the app counts, the tenets, the general brief, the owner's rulings, the index of decisions, the screens, the published amounts | Read at the start of every session |
| `moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json` | The published amounts with the source the app cites and what makes each pass, and 7 checks that span several cards | With parts 13, 15, 16, 17 (the published amounts); its cross-card checks are copied into the screen parts |
| `moneykeel_audit_module_cf_contents_v01.json` | What is in each part, by identifier — so you can confirm you were given everything | Reference |
| `moneykeel_audit_module_cf_for-openai_v01_part-01-of-19.md` | Part 1 of 19 — Wages — what is paid, in which months, and the year it makes: 15 cards, 75 cases, 17 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-02-of-19.md` | Part 2 of 19 — Earners, and a salary that varies month to month: 14 cards, 70 cases, 1 decision to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-03-of-19.md` | Part 3 of 19 — Stock that vests, and rent from a property: 11 cards, 55 cases, 18 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-04-of-19.md` | Part 4 of 19 — Benefits, retirement income and other income: 10 cards, 50 cases, 20 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-05-of-19.md` | Part 5 of 19 — The income summary, the income manager, and income paid by accounts: 15 cards, 75 cases, 41 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-06-of-19.md` | Part 6 of 19 — The budget, and the Expenses tab: 14 cards, 70 cases, 7 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-07-of-19.md` | Part 7 of 19 — Essentials, savings by month, and the budget against what was spent: 12 cards, 60 cases, 6 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-08-of-19.md` | Part 8 of 19 — Bills ahead, what is coming, and the credit line: 11 cards, 55 cases, 9 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-09-of-19.md` | Part 9 of 19 — Debts — payments, balances and paying them off: 15 cards, 75 cases, 14 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-10-of-19.md` | Part 10 of 19 — Debts — credit, kinds of debt, and a mortgage against a Treasury: 13 cards, 65 cases, 8 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-11-of-19.md` | Part 11 of 19 — Recording a transaction — cash, holdings and undo: 14 cards, 70 cases, 9 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-12-of-19.md` | Part 12 of 19 — Transactions — undo, labels, cash effect, income from holdings, and review flags: 11 cards, 55 cases, 9 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-13-of-19.md` | Part 13 of 19 — Contribution limits, room left this year, and the future paycheck: 14 cards, 70 cases, 11 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-14-of-19.md` | Part 14 of 19 — This month — the plan and what has happened: 15 cards, 75 cases, 24 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-15-of-19.md` | Part 15 of 19 — Base pay — gross, take-home, and the rate of tax in force: 14 cards, 70 cases, 36 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-16-of-19.md` | Part 16 of 19 — Federal tax — the 2026 tables, the deductions and the bands: 11 cards, 55 cases, 7 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-17-of-19.md` | Part 17 of 19 — Tax on the household — what is taxed, the filing status, the rates, and the tax organizer: 10 cards, 50 cases, 19 decisions to check | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-18-of-19.md` | Part 18 of 19 — The screens — the Cash flow tab, its four tabs, and Home's box for this month: 41 figures to check against the tenets, 99 decisions | Yes |
| `moneykeel_audit_module_cf_for-openai_v01_part-19-of-19.md` | Part 19 of 19 — The screens — Base pay, Income summary, the income manager, the bill calendar and guaranteed income: 26 figures to check against the tenets, 65 decisions | Yes |

Give each part to the model in its own session, with this brief and, for the parts that check published amounts, the tax file. Parts may be done in any order. Each reply is one JSON object; save each reply unchanged.

# Your jobs

1. **Formula check, every card.** Is the formula right for what the card says it is for? Verdict `RIGHT`, `WRONG`, `INCOMPLETE` or `CANNOT TELL`, with why, what it should be, and what it rests on — the owner's decision, a published source, standard finance practice, or ordinary arithmetic. Severity for anything not RIGHT: high (a wrong number a person would act on), medium, low.
2. **Five cases per card** — two easy, two complex (real-world inputs: unround figures, two earners, several debts, dated records), one edge — each worked by hand, with the expected answer at full precision and as it would be shown. Where the honest answer is no number, `REFUSES` and why. Where the owner's rule is needed and missing, `RULE UNCLEAR` with each reading's answer.
3. **The decided rules are in.** Each card part ends with the decisions that govern its cards. For each one, say `HELD` (the formulas in this part do what it says), `NOT HELD` (with the case that shows it) or `CANNOT TELL` (what you would need).
4. **The screens meet the tenets** — in the two screen parts only (18, 19). For each figure, check it against each tenet that applies: its words are plain and say what the number means; with no input it refuses with a reason, never $0 dressed as an answer; a total and the rows under it add up; one concept has one name and the same figure wherever it is shown; an estimate says it is one. `PASS` or `FAIL` with the tenet number and why. Then the cross-card checks in the tax file.
5. **The published amounts** — in parts 13, 15, 16, 17. Check every amount the app uses against its published source, and fill `source_checks` for the topics the part names.

# How to reply

One JSON object per part, in this shape and nothing outside it. Leave out the keys a part does not ask for.

```json
{
  "batch": "cf module — part N",
  "written_by": "<you>",
  "ready_to_close": false,
  "still_open": ["<card or figure id>: what must change"],
  "formula_checks": [{"id": "", "name": "", "verdict": "RIGHT|WRONG|INCOMPLETE|CANNOT TELL", "why": "", "should_be": "", "rests_on": "", "severity": "high|medium|low|"}],
  "cases": [{"id": "", "name": "", "kind": "easy|complex|edge", "title": "", "as_of": "YYYY-MM-DD", "given": "", "inputs": {}, "expected": {}, "formula_gives": {}, "working": [], "rests_on": "", "confidence": "high|medium|low", "outside_domain": false, "notes": ""}],
  "rules_held": [{"rule": "DEC-…", "cards": [], "verdict": "HELD|NOT HELD|CANNOT TELL", "why": ""}],
  "could_not_test": [{"id": "", "missing": ""}],
  "screen_checks": [{"figure": "MK-CF-M-…", "tenet": 0, "verdict": "PASS|FAIL", "why": ""}],
  "cross_card_checks": [{"id": "X…", "verdict": "HOLDS|DOES NOT HOLD|CANNOT TELL", "case": {}, "why": ""}],
  "source_checks": [{"topic": "", "verdict": "", "why": "", "source": {"source": "", "url": "", "section": ""}, "witnesses": []}]
}
```

`ready_to_close` is true only when every card in the part is RIGHT and every rule HELD. `formula_gives` is what the formula as written produces; leave it out when it is the same as `expected`. Never change an expected answer to agree with anything the app produces. Where you think the owner's rule is wrong, say so in `notes` with your reasoning; do not apply your own rule.

## How the app counts — read before you work a case

Each line below names where it is held. They are here because the last outside review lost verdicts for want of them. Where a card says something different, the card is what you judge — and the difference is a finding.

1. **Every case states the day it is asked.** Put `"as_of": "YYYY-MM-DD"` on every case, and give the date of every dated record in `inputs`: a payment received, an expense logged, a debt payment, a pay day, a bill's due date, a birth year. A case about "this month" or "so far" without its day cannot be run.
2. **A month is a calendar month.** "This month" is the calendar month that holds the `as_of` day, written as a year and a month (MK-CF-F-191, MK-CF-F-163). A record counts in a month when its date falls in that month (MK-CF-F-148, MK-CF-F-212). A figure whose `per` is month is for one calendar month; one whose `per` is year is for a year.
3. **Planned and actual are two separate blocks.** Planned is what the plan says the month holds (MK-CF-F-156). Actual is what has happened (MK-CF-F-005). They never share a row, and each ends in its own surplus. The approved drawing on MK-CF-O-010 shows both for one month.
4. **A debt is counted from the list of debts, not from the budget** (the owner, 2026-10-04 — ruling 3 below). A debt payment that is also logged as an expense must be counted once. Which block counts it, and how, is on MK-CF-F-005, MK-CF-F-150 and MK-CF-F-157.
5. **Full precision, rounded once** (the owner, DEC-0264: "full precision for calculation; display two decimals unless stated (whole dollars for totals, balances, projections…)"). Nothing rounds inside a calculation. An amount or a percent in an owner ruling or an approved drawing is written as the screen writes it — already rounded once. Work at full precision, round at the end, then compare.
6. **How a figure is written depends on its `unit`** in the screen register. `money`: whole dollars, a negative written with "−". `money-cents`: dollars and cents. `percent`: a whole percent. `percent-2dp`: two decimals. `months`: one decimal and the word month or months. A figure with a `per` of month or year has "/month" or "/year" after it. Examples, written by the app's own writer: a `money` figure per month of −3,248.4 is written "−$3,248/month"; a `money-cents` figure of 186 is written "$186.00"; a `percent` figure of 0.2178 is written "22%".
7. **Unknown is not zero** (tenet 3). Where a card says "nothing" or "no answer", the expected answer is `REFUSES` with the reason — never 0. Where a card says a missing input "counts as 0", that is the card's claim: judge it against tenet 3.
8. **What can reach a function.** Its `handed` line and the types printed in its part say what it is given. An edge case whose input those types cannot hold — words where a number is typed, a date that is not a date — is welcome, but put `"outside_domain": true` on it and say why in `notes`. Such a case alone never makes a formula `WRONG`; where the card does not say what happens, the verdict is `INCOMPLETE`, severity low.
9. **The owner's decisions are settled; the author's words are claims.** A card's rules marked `"said_by": "owner"`, the decisions printed in each part, the owner's rulings below and the approved drawings are his. Everything else — formulas in words, `what_it_is_for`, the screen register's words and its worked examples — is the in-house author's, to be checked. A screen-register row with a `ruled` date was ruled by the owner on that date; a row without one is a draft.
10. **A screen-register row's worked example ran through the app's own door** and gave the answer printed beside it. It is not your expected answer: it is the app's, shown so you can see what a figure is. Where the words of a row and its own worked answer disagree, that is a finding (tenet 2).

# The tenets — every function and every figure must meet them

When two good things pull against each other, the higher tenet wins.

1. **A wrong number ends trust.** Being right comes before being fast, being complete or looking good.
   A late, correct figure beats an on-time, wrong one.

2. **Every number shows how it was made.** A person can trace any figure to its parts on the screen:
   the rows under a total add up to it, and a figure that is an estimate says so.

3. **Unknown is not zero.** Something never entered shows as "not entered" and the reason, never as
   $0 or a default that looks like an answer.

4. **One thing, one number, one word.** A concept is worked out in one place and called by one name.
   The same figure on two screens is the same figure.

5. **The person's word outranks the app's guess.** What they confirmed, typed or chose is never
   overwritten by a rule, a sync or a sweep.

6. **His decision is the design.** The last approved drawing and the decision log say what the app
   does. A change of mine never stands against them. Every decision is recorded in his words and
   applied in every place it reaches.

7. **Honest like a fiduciary.** Advice serves the person's own money and goals, and tax, risk and
   cost are stated plainly. Nothing is made to look better than it is.

8. **Plain words for a reader of 55 to 70.** No jargon. A sentence a ten-year-old could repeat. The
   screen says what a number means, not only what it is.

# The general brief — how a card is read and how a case is worked

This is the brief every outside batch has been given since 2026-10-04. Where it and the sections above differ, the sections above are the newer instruction for this package (the reply shape, `as_of`, `outside_domain`).

# Brief — check the formula, then write the test cases, from outside

MoneyKeel · calculation audit · v04 · 2026-10-04

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
   Every return is a time-weighted return (owner, 2026-10-04). A return made any other way is `WRONG`.
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

# What the owner has ruled — settled, in his words

His rulings carried to every outside review. Most were made about Net worth or Performance; read each for what it says. The decisions that govern Cash flow are printed in full in the part that checks each.

1. 2026-10-04 — "All return should be True Weighted Return and not Dietz return." Every return in the app is a time-weighted return.
2. 2026-10-04 — "add it to the cash as losing job does not mean loosing rental income too." The emergency fund counts rent from a property the person owns; it keeps arriving each month.
3. 2026-10-04 — "Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses." A debt is counted from the list of debts, not from the budget.
4. 2026-10-04 — "It is feasible to have property without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less mortgage." Every mortgage is matched to a property.
5. 2026-10-04 — "unless rental income is added on the income screen, assume property is second or vacation home." How a rental is told from a second home.
6. 2026-10-04 — "#1 - sort by soonest maturing first" The order bonds are listed in.
7. 2026-09-30 — "Refuse the line and ask" What happens to a holding when nothing says what kind of asset it is.
8. 2026-10-06 — "this phase of app no longer has options for Private Equity and Hedge fund." Private equity and hedge funds cannot be added anywhere in this phase; a row saved earlier with either kind is kept.
9. 2026-08-04 — "Private equity + Hedge funds OUT of phase 1 (founder: keep it simple)" The same rule, first made on 2026-08-04 (DEC-0045).
10. 2026-08-26 — "if the coupon rate is not available use 0" A bond or CD with no rate entered counts $0 of interest a year, and the app says so (A46). Its yields are not given: a yield of 0% would be invented.
11. 2026-10-09 — "I like your recommendation to add accrued interest. Say "Added estimated $1,119 in accrued interest to bond value at 4.5% coupon for 363 days to calculate YTM. If this is not accurate, enter actual accrued interest"" A bond's value is its statement market value, without accrued interest. For the yield to maturity the accrued interest is added — as entered, or estimated from the coupon schedule and said so. The yield on today's value is on the value as entered. (Replaces A47, 2026-08-26: "subtract accrued interest when known".)
12. 2026-09-27 — "Is there a similar question for CDs as CD rates don't move and one can do nothing if CD rates move." A CD is not traded, so no figure is given for what a move in interest rates would do to its value.
13. 2026-08-04 — "CLASSIFICATION RULE: cash = cash only. Money-market funds → Stocks/ETFs; CDs/T-bills → Bonds & CDs (any maturity)." A money-market account or fund is Stocks / Funds; a CD is Bonds & CDs (DEC-0051).
14. 2026-10-07 — "build it per mockup 07 where under each class you list each account Vanguard-0008 $45000, Chase - 0333 $34000." Under each class heading, every account that holds money in that class is listed with only its part in that class, so the rows add up to the heading.
15. 2026-07-01 — "Investment = stock + etfs + bonds + alternatives? It does not include cash or cash equivalents - Right?" Investments do not include cash; Home and Net worth show one Investments figure.

# The decisions that govern Cash flow — 175, and the part that checks each

From the owner's decision log, every decision in force that governs this module. Each is printed in full — his words, the log's record of it, and what it governs — in the part that checks it. A decision that governs cards in more than one part is checked in each.

| Decision | Decided | Kind | Checked in part |
|---|---|---|---|
| DEC-0002 | 2026-07-19 | DESIGN | 8, 14, 18 |
| DEC-0003 | 2026-07-19 | DESIGN | 1, 3, 4, 17, 18 |
| DEC-0007 | 2026-07-28 | DESIGN | 7 |
| DEC-0018 | 2026-07-31 | RULE | 18, 19 |
| DEC-0036 | 2026-08-02 | RULE | 18 |
| DEC-0039 | 2026-08-02 | RULE | 18 |
| DEC-0078 | 2026-08-11 | DESIGN | 5, 8, 19 |
| DEC-0108 | 2026-08-11 | RULE | 5, 19 |
| DEC-0109 | 2026-08-11 | RULE | 18 |
| DEC-0149 | 2026-08-14 | DESIGN | 5, 19 |
| DEC-0151 | 2026-08-14 | DESIGN | 1, 3, 4, 17 |
| DEC-0152 | 2026-08-14 | DESIGN | 5, 19 |
| DEC-0159 | 2026-08-14 | RULE | 10 |
| DEC-0161 | 2026-08-14 | RULE | 10 |
| DEC-0165 | 2026-08-14 | RULE | 5, 19 |
| DEC-0166 | 2026-08-14 | RULE | 5, 19 |
| DEC-0176 | 2026-08-27 | RULE | 1, 3, 4, 15, 17, 18, 19 |
| DEC-0177 | 2026-08-27 | DESIGN | 18 |
| DEC-0178 | 2026-08-27 | RULE | 5, 15, 19 |
| DEC-0179 | 2026-08-27 | RULE | 5, 19 |
| DEC-0180 | 2026-08-27 | DESIGN | 18 |
| DEC-0181 | 2026-08-27 | RULE | 5, 19 |
| DEC-0182 | 2026-08-27 | RULE | 5, 19 |
| DEC-0184 | 2026-08-27 | BUILD RECORD | 5, 15, 16, 19 |
| DEC-0187 | 2026-08-27 | BUILD RECORD | 5, 8, 18, 19 |
| DEC-0188 | 2026-08-27 | RULE | 5, 15, 18, 19 |
| DEC-0189 | 2026-08-27 | BUILD RECORD | 5, 19 |
| DEC-0190 | 2026-08-28 | RULE | 18, 19 |
| DEC-0191 | 2026-08-28 | RULE | 5, 19 |
| DEC-0194 | 2026-08-28 | DESIGN | 5, 15, 18, 19 |
| DEC-0195 | 2026-08-28 | DESIGN | 5, 15, 19 |
| DEC-0196 | 2026-08-28 | DESIGN | 5, 15, 19 |
| DEC-0197 | 2026-08-28 | DESIGN | 5, 15, 19 |
| DEC-0198 | 2026-08-28 | RULE | 1, 3, 4, 5, 17, 18, 19 |
| DEC-0199 | 2026-08-28 | DESIGN | 14, 18 |
| DEC-0200 | 2026-08-28 | RULE | 1, 3, 4, 16, 17 |
| DEC-0201 | 2026-08-28 | DESIGN | 18 |
| DEC-0202 | 2026-08-28 | RULE | 18, 19 |
| DEC-0203 | 2026-09-01 | RULE | 15 |
| DEC-0205 | 2026-09-01 | RULE | 15, 19 |
| DEC-0207 | 2026-09-02 | DESIGN | 5, 15, 19 |
| DEC-0208 | 2026-09-02 | RULE | 5, 15, 18, 19 |
| DEC-0209 | 2026-09-02 | DESIGN | 5, 15, 18, 19 |
| DEC-0213 | 2026-09-14 | RULE | 18 |
| DEC-0240 | 2026-09-08 | RULE | 16 |
| DEC-0243 | 2026-09-08 | RULE | 13 |
| DEC-0244 | 2026-09-08 | RULE | 4, 13, 18 |
| DEC-0245 | 2026-09-08 | RULE | 4, 13, 18 |
| DEC-0247 | 2026-09-08 | RULE | 4, 13, 18 |
| DEC-0251 | 2026-09-08 | RULE | 7 |
| DEC-0252 | 2026-09-08 | RULE | 2 |
| DEC-0253 | 2026-09-08 | RULE | 16 |
| DEC-0260 | 2026-09-09 | RULE | 7, 14, 18 |
| DEC-0263 | 2026-09-08 | RULE | 13, 16, 17 |
| DEC-0269 | 2026-09-03 | RULE | 18 |
| DEC-0270 | 2026-09-03 | RULE | 15, 17, 18, 19 |
| DEC-0271 | 2026-09-03 | RULE | 14 |
| DEC-0273 | 2026-09-03 | RULE | 18 |
| DEC-0279 | 2026-08-26 | RULE | 5 |
| DEC-0283 | 2026-09-10 | RULE | 15, 18, 19 |
| DEC-0287 | 2026-09-10 | RULE | 18 |
| DEC-0288 | 2026-09-10 | RULE | 18 |
| DEC-0291 | 2026-08-27 | RULE | 1, 3, 4, 15, 17, 18, 19 |
| DEC-0292 | 2026-08-27 | RULE | 6, 14, 18 |
| DEC-0295 | 2026-08-20 | RULE | 18 |
| DEC-0296 | 2026-08-20 | RULE | 1, 3, 4, 17 |
| DEC-0302 | 2026-08-20 | RULE | 18 |
| DEC-0303 | 2026-08-20 | RULE | 1, 3, 4, 17 |
| DEC-0307 | 2026-08-20 | RULE | 1, 3, 4, 17 |
| DEC-0312 | 2026-08-20 | RULE | 18 |
| DEC-0317 | 2026-08-20 | RULE | 12 |
| DEC-0318 | 2026-08-20 | RULE | 18 |
| DEC-0320 | 2026-08-20 | RULE | 18 |
| DEC-0325 | 2026-08-20 | RULE | 16 |
| DEC-0326 | 2026-08-20 | RULE | 15, 19 |
| DEC-0327 | 2026-08-20 | RULE | 1, 3, 4, 15, 17, 18, 19 |
| DEC-0333 | 2026-09-12 | RULE | 14, 18 |
| DEC-0336 | 2026-09-12 | RULE | 13 |
| DEC-0339 | 2026-09-12 | RULE | 13 |
| DEC-0340 | 2026-09-12 | RULE | 15 |
| DEC-0345 | 2026-09-13 | RULE | 18, 19 |
| DEC-0352 | 2026-09-14 | RULE | 15, 19 |
| DEC-0364 | 2026-09-26 | RULE | 1, 3, 4, 10, 17 |
| DEC-0365 | 2026-09-26 | RULE | 18 |
| DEC-0375 | 2026-09-27 | RULE | 5, 15, 18, 19 |
| DEC-0376 | 2026-09-12 | RULE | 1, 5, 15, 19 |
| DEC-0378 | 2026-09-01 | RULE | 13 |
| DEC-0380 | 2026-09-02 | RULE | 15, 18, 19 |
| DEC-0381 | 2026-09-02 | RULE | 15 |
| DEC-0384 | 2026-08-28 | RULE | 15, 19 |
| DEC-0387 | 2026-08-28 | RULE | 5, 19 |
| DEC-0389 | not dated | RULE | 5, 15, 18, 19 |
| DEC-0392 | not dated | RULE | 18, 19 |
| DEC-0393 | not dated | RULE | 9, 14, 18 |
| DEC-0396 | not dated | RULE | 15, 18, 19 |
| DEC-0420 | 2026-09-27 | RULE | 18 |
| DEC-0431 | not dated | RULE | 5, 19 |
| DEC-0434 | 2026-09-28 | RULE | 18 |
| DEC-0440 | 2026-09-28 | DESIGN | 18 |
| DEC-0443 | 2026-06-30 | RULE | 8, 18 |
| DEC-0447 | 2026-06-30 | RULE | 1, 3, 4, 8, 17, 18 |
| DEC-0454 | 2026-06-30 | RULE | 18 |
| DEC-0461 | 2026-07-01 | RULE | 12 |
| DEC-0477 | 2026-07-01 | RULE | 18 |
| DEC-0484 | 2026-07-01 | RULE | 11, 12 |
| DEC-0485 | 2026-07-01 | RULE | 18 |
| DEC-0487 | 2026-07-01 | RULE | 1, 3, 4, 17 |
| DEC-0491 | 2026-06-30 | RULE | 1, 3, 4, 17 |
| DEC-0493 | 2026-06-30 | RULE | 6, 7 |
| DEC-0495 | 2026-06-30 | RULE | 13 |
| DEC-0496 | 2026-06-30 | RULE | 9, 10 |
| DEC-0499 | 2026-06-30 | RULE | 18 |
| DEC-0503 | 2026-06-30 | RULE | 15, 18 |
| DEC-0505 | 2026-06-30 | RULE | 18 |
| DEC-0506 | 2026-06-30 | RULE | 18 |
| DEC-0512 | 2026-06-30 | RULE | 14, 18 |
| DEC-0641 | 2026-09-30 | RULE | 9 |
| DEC-1112 | 2026-10-02 | DESIGN | 18, 19 |
| DEC-1134 | 2026-10-02 | DESIGN | 18, 19 |
| DEC-1560 | 2026-10-04 | DESIGN | 18, 19 |
| DEC-1625 | 2026-10-04 | DESIGN | 15, 18, 19 |
| DEC-1668 | 2026-10-04 | RULE | 5, 18, 19 |
| DEC-1859 | 2026-10-04 | DESIGN | 5, 18, 19 |
| DEC-1923 | 2026-10-04 | RULE | 9, 14, 18 |
| DEC-1924 | 2026-10-04 | DESIGN | 5, 9, 10, 18, 19 |
| DEC-1925 | 2026-10-04 | RULE | 9, 10 |
| DEC-1926 | 2026-10-04 | RULE | 18, 19 |
| DEC-2164 | 2026-09-28 | RULE | 13, 18 |
| DEC-2440 | 2026-10-07 | RULE | 6, 18 |
| DEC-2484 | 2026-10-07 | PROCESS | 6, 11, 18, 19 |
| DEC-3768 | 2026-10-10 | PROCESS | 3 |
| DEC-3768c | 2026-10-10 | CALCULATION | 3 |
| DEC-6796 | 2026-10-21 | RULE | 5, 11, 12 |
| DEC-6993 | 2026-10-21 | RULE | 12 |
| DEC-7171 | 2026-10-21 | RULE | 5, 18, 19 |
| DEC-7398 | 2026-10-22 | RULE | 11 |
| DEC-7595 | 2026-10-23 | RULE | 11, 12 |
| DEC-7596 | 2026-10-23 | RULE | 11, 12 |
| DEC-7601 | 2026-10-23 | RULE | 11, 12 |
| DEC-7602 | 2026-10-23 | RULE | 11, 12 |
| DEC-7605 | 2026-10-23 | RULE | 11 |
| DEC-7606 | 2026-10-23 | RULE | 14, 18 |
| DEC-7607 | 2026-10-23 | RULE | 9, 14, 18 |
| DEC-7608 | 2026-10-23 | RULE | 15, 18 |
| DEC-7609 | 2026-10-23 | RULE | 9, 14, 18 |
| DEC-7610 | 2026-10-23 | RULE | 18 |
| DEC-7611 | 2026-10-23 | RULE | 6, 7, 14, 18 |
| DEC-7682 | 2026-10-23 | RULE | 9, 14, 18 |
| DEC-7795 | 2026-10-24 | RULE | 5, 9, 10, 15 |
| DEC-7796 | 2026-10-24 | RULE | 5, 19 |
| DEC-7797 | 2026-10-24 | RULE | 5, 15, 17, 19 |
| DEC-7798 | 2026-10-24 | RULE | 5, 15, 18, 19 |
| DEC-7887 | 2026-10-24 | RULE | 5, 18, 19 |
| DEC-7933 | 2026-10-24 | RULE | 5, 19 |
| DEC-7935 | 2026-10-24 | RULE | 1, 3, 4, 17 |
| DEC-7936 | 2026-10-24 | RULE | 8, 18, 19 |
| DEC-7937 | 2026-10-24 | RULE | 14, 18, 19 |
| DEC-7938 | 2026-10-24 | RULE | 1, 3, 4, 14, 17, 18 |
| DEC-7939 | 2026-10-24 | RULE | 14, 18 |
| DEC-7940 | 2026-10-24 | RULE | 4, 5, 8, 14, 18, 19 |
| DEC-7941 | 2026-10-24 | RULE | 8, 18, 19 |
| DEC-7942 | 2026-10-24 | RULE | 15, 16, 18, 19 |
| DEC-7943 | 2026-10-24 | RULE | 18 |
| DEC-7944 | 2026-10-24 | RULE | 15 |
| DEC-7945 | 2026-10-24 | RULE | 15 |
| DEC-7946 | 2026-10-24 | RULE | 14, 18 |
| DEC-7947 | 2026-10-24 | RULE | 18, 19 |
| DEC-7948 | 2026-10-24 | RULE | 18 |
| DEC-7949 | 2026-10-24 | RULE | 9, 14, 18 |
| DEC-7950 | 2026-10-24 | RULE | 18 |
| DEC-7951 | 2026-10-24 | RULE | 6, 7 |
| DEC-8084 | 2026-10-24 | RULE | 14, 18 |
| DEC-8085 | 2026-10-24 | RULE | 9, 14, 18 |
| DEC-8152 | 2026-09-14 | RULE | 9, 14, 18 |
| DEC-8153 | 2026-10-24 | RULE | 6, 8, 9, 10, 13, 14, 18 |

# The screens the figures print on

Read from the app: each figure declares the screens it is printed on, and each screen's own file names the part of the screen it is printed in — a tab, a card, a sheet. The Cash flow tab holds four tabs (This month, Income, Expenses, Debts); the panels the app's own names call BudgetScreen are drawn inside it.

| Screen | The app's screen | Where on it the figures are printed | Figures | Checked in part |
|---|---|---|---|---|
| `/base-pay` | BasePayScreen | BasePayScreen; BasePayScreen › EarnerSection | 9 | 18, 19 |
| `/bill-calendar` | BillCalendarScreen | BillCalendarScreen | 7 | 18, 19 |
| `/cashflow` | CashFlowScreen | BudgetScreen; CashFlowScreen › DrawOrderWhy; CashFlowScreen › ExpensesTab; CashFlowScreen › IncomeTab; CashFlowScreen › MonthBars; CashFlowScreen › MonthRow; CashFlowScreen › OtherMonthCard; CashFlowScreen › RetiredMain; CashFlowScreen › WorkingMain | 41 | 18 |
| `/home` | HomeScreen | HomeScreen | 4 | 18 |
| `/income-manager` | IncomeManagerScreen | IncomeManagerScreen; IncomeManagerScreen › AskedBefore; IncomeManagerScreen › BonusAndStock; IncomeManagerScreen › InterestAndDividends; IncomeManagerScreen › Rent | 9 | 18, 19 |
| `/income-summary` | IncomeSummaryScreen | IncomeSummaryScreen | 10 | 19 |
| `/monthly-income` | MonthlyIncomeScreen | MonthlyIncomeScreen | 2 | 19 |

## The published 2026 amounts the app uses

Read from the app. **Check each against its published source and say so in `formula_checks` when one is wrong.**

**Federal income tax, 2026 — each slice of taxable income at its own rate.** Taxable income = income − the deduction.

| Filing status | Standard deduction | Added for each person 65 or over | Bands: up to … at … |
|---|---|---|---|
| Single | $16,100 | $2,050 | $12,400 at 10% · $50,400 at 12% · $105,700 at 22% · $201,775 at 24% · $256,225 at 32% · $640,600 at 35% · above that at 37% |
| Married filing jointly | $32,200 | $1,650 | $24,800 at 10% · $100,800 at 12% · $211,400 at 22% · $403,550 at 24% · $512,450 at 32% · $768,700 at 35% · above that at 37% |
| Married filing separately | $16,100 | $1,650 | $12,400 at 10% · $50,400 at 12% · $105,700 at 22% · $201,775 at 24% · $256,225 at 32% · $384,350 at 35% · above that at 37% |
| Head of household | $24,150 | $2,050 | $17,700 at 10% · $67,450 at 12% · $105,700 at 22% · $201,750 at 24% · $256,200 at 32% · $640,600 at 35% · above that at 37% |

**Senior deduction, tax years 2025 to 2028:** $6,000 for each person 65 or over, each person's $6,000 less 6% of income above $75,000 (single, head of household) or $150,000 (married filing jointly), never below $0. Not given when married filing separately.

**Long-term capital gains, 2026** — 0% up to the first amount of taxable income, 15% up to the second, 20% above: Single $49,450 and $545,500 · Married filing jointly $98,900 and $613,700 · Married filing separately $49,450 and $306,850 · Head of household $66,200 and $579,600.

**Contribution limits, 2026:** 401(k) $24,500, plus $8,000 at 50 or over, or plus $11,250 instead at ages 60 to 63. IRA $7,500, plus $1,100 at 50 or over. HSA $4,400 self-only or $8,750 family, plus $1,000 at 55 or over.

**Social Security and Medicare, 2026:** 6.2% of wages up to $184,500; 1.45% of all wages; 0.9% more on wages above $200,000.

# Not on a card — what each is, and why no cases are asked

| Function | Why |
|---|---|
| MK-CF-F-015 loadBudget | storage only — it reads or saves and does no arithmetic. Reads a person's saved budget from storage and calculates nothing. |
| MK-CF-F-016 saveBudget | storage only — it reads or saves and does no arithmetic. Saves a person's budget to storage and calculates nothing. |
| MK-CF-F-039 loadDebt | storage only — it reads or saves and does no arithmetic. Reads a person's saved debts from storage and calculates nothing. |
| MK-CF-F-040 saveDebt | storage only — it reads or saves and does no arithmetic. Saves a person's debts to storage, tells the rest of the app it changed, and calculates nothing. |
| MK-CF-F-050 loadIncome | storage only — it reads or saves and does no arithmetic. Reads a person's saved income from storage and calculates nothing. |
| MK-CF-F-051 saveIncome | storage only — it reads or saves and does no arithmetic. Saves a person's income to storage, tells the rest of the app it changed, and calculates nothing. |
| MK-CF-F-199 ROOM | an example helper — it runs another function on a worked example. Example only: runs theContributionRoom on the worked example and calculates nothing of its own. |
| MK-CF-F-200 LINE | an example helper — it runs another function on a worked example. Example only: runs theCreditLine on the worked example and calculates nothing of its own. |
| MK-CF-F-201 INCOME | an example helper — it runs another function on a worked example. Example only: runs incomeSummary on the worked example and calculates nothing of its own. |
| MK-CF-F-202 TAX | an example helper — it runs another function on a worked example. Example only: runs theTaxOrganizer on the worked example and calculates nothing of its own. |
| MK-CF-F-203 MONTH | an example helper — it runs another function on a worked example. Example only: runs theMonth on the worked example and calculates nothing of its own. |
| MK-CF-F-204 line | an example helper — it runs another function on a worked example. Example only: reads one row's amount from the worked example of the month. |
| MK-CF-F-205 COMING | an example helper — it runs another function on a worked example. Example only: runs whatsComing on the worked example and calculates nothing of its own. |
| MK-CF-F-207 SOURCE | an example helper — it runs another function on a worked example. Example only: picks one kind of income source out of the worked example household. |
| MK-CF-F-211 DEBTS | an example helper — it runs another function on a worked example. Example only: runs theDebts on the worked example and calculates nothing of its own. |
| MK-CF-F-228 useThisMonthInputs | storage only — it reads or saves and does no arithmetic. Home's way to this month: it reads the store and hands it, built the way the Cash flow tab builds it, to thisMonthInputs — it calculates nothing of its own. |
| MK-CF-F-237 LATER | an example helper — it runs another function on a worked example. Example only: builds the later-month card's dated grid for the worked example, and calculates nothing of its own. |
| MK-CF-F-238 PAY | an example helper — it runs another function on a worked example. Example only: runs basePay on the worked example household with a tax rate of their own. |
| MK-CF-F-239 PAY_ESTIMATED | an example helper — it runs another function on a worked example. Example only: runs basePay on the worked example household with the tax rate calculated. |
| MK-CF-F-240 PAY_LANDS_TYPED | an example helper — it runs another function on a worked example. Example only: runs basePay on the worked example household with the take-home entered. |
| MK-CF-F-241 M | an example helper — it runs another function on a worked example. Example only: runs thisMonth on the worked example and calculates nothing of its own. |
| MK-CF-F-242 workedLineAmount | an example helper — it runs another function on a worked example. Example only: reads one row's amount from the worked example of the month. |

# Before you send each reply

- One formula check for every card in the part; five cases for every card you could test, the rest under `could_not_test`.
- Every case has `as_of`, and every dated record in it has its date.
- Every card judged `WRONG` or `INCOMPLETE` has a case that shows the difference, with `formula_gives`.
- Every list of rows sums to its total, and every orchestrator case gives the rows and the total separately.
- One `rules_held` line for every decision the part lists.
- Everything quotes its identifier exactly.
