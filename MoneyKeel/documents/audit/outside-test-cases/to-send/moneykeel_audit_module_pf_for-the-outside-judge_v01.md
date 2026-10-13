**THIS IS A RE-RUN.** This module was judged once before, in batches, by an outside model. The app has been corrected since, against those findings and the owner's new decisions. Judge every card from scratch. These 40 cards changed since that review — look hardest at them: MK-NW-F-084, MK-NW-F-090, MK-NW-F-105, MK-NW-F-127, MK-NW-F-128, MK-NW-F-129, MK-NW-F-130, MK-NW-O-008, MK-PF-F-001, MK-PF-F-002, MK-PF-F-004, MK-PF-F-005, MK-PF-F-006, MK-PF-F-007, MK-PF-F-008, MK-PF-F-009, MK-PF-F-010, MK-PF-F-013, MK-PF-F-014, MK-PF-F-015, MK-PF-F-020, MK-PF-F-022, MK-PF-F-028, MK-PF-F-033, MK-PF-F-034, MK-PF-F-035, MK-PF-F-036, MK-PF-F-037, MK-PF-F-038, MK-PF-F-039, MK-PF-F-040, MK-PF-F-041, MK-PF-F-042, MK-PF-F-043, MK-PF-F-044, MK-PF-F-045, MK-PF-F-046, MK-ST-F-080, MK-ST-F-081, MK-ST-F-082.

Written for: the outside judge, judging the whole Performance module, once, at the end. You have not seen any earlier review of it and none is given here: judge it as if for the first time.

# What this is

The last independent test of the Performance module before the owner builds it. 51 functions, every one as it is in the app today; the rules the owner has decided for them; every figure its screens print; and the tenets every figure must meet. Earlier batches were each judged by an outside model and corrected. This check is to find what is still wrong, still unsaid, or still not true to the tenets — anywhere in the module.

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

# Your four jobs

1. **Formula check, every card.** Is the formula right for what it says it is for? Verdict RIGHT, WRONG, INCOMPLETE or CANNOT TELL, with why, what it should be, and what it rests on (a published source, the owner's rule below, or ordinary arithmetic). Severity for anything not RIGHT: high (a wrong number a person would act on), medium, low.
2. **Five cases per card** — two easy, two complex (real-world inputs: unround figures, several accounts, broker wording), one edge — each worked by hand, with the expected answer at full precision and as shown. Where the honest answer is no number, say REFUSES and why. Where the owner's rule is needed and missing, say RULE UNCLEAR and give each reading's answer.
3. **The decided rules are in.** For each rule in the list below, find the card or cards that carry it and say HELD (the formula does what the rule says), NOT HELD (with the case that shows it), or CANNOT TELL.
4. **The screens meet the tenets.** For each figure in the screen register below, check it against the tenets: its words are plain and say what the number means; a figure with no input refuses with a reason, never $0 or a default; a total and the rows shown under it add up; one concept has one name and the same figure ID wherever it is shown; an estimate says it is one. Give PASS or FAIL with the tenet number and why.

# Reply

One JSON object per part you are given, with:

```json
{
  "batch": "pf module final — part N",
  "written_by": "<you>",
  "ready_to_close": true,
  "still_open": ["<card or figure id>: what must change"],
  "formula_checks": [{"id": "", "name": "", "verdict": "", "why": "", "should_be": "", "rests_on": "", "severity": ""}],
  "cases": [{"id": "", "name": "", "kind": "easy|complex|edge", "title": "", "given": "", "inputs": {}, "expected": {}, "working": [], "rests_on": "", "confidence": "high|medium|low", "notes": ""}],
  "rules_held": [{"rule": "", "cards": [], "verdict": "HELD|NOT HELD|CANNOT TELL", "why": ""}],
  "screen_checks": [{"figure": "", "tenet": 0, "verdict": "PASS|FAIL", "why": ""}],
  "could_not_test": []
}
```

Jobs 3 and 4 go in the reply to part 1 only. Never change an expected answer to agree with the code. Where you think the owner's rule is wrong, say so in `notes` with your reasoning; do not apply your own rule.

# The general brief — how a card is read and how a case is worked

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

# The rules decided in the outside reviews — 33, each in force

From the owner's decision log. Job 3 checks each one.

- **DEC-1624** (2026-10-04) — Look back offers what you hold, the stock market (SPY), and four more yardsticks: bonds (AGG), gold (GLD), bitcoin (BTC) and a balanced fund (AOR).  
  Governs: src/screens/LookBackScreen.tsx · src/screens/__tests__/kept_editors_match.test.tsx
- **DEC-3656** (2026-10-09) — When the daily record does not reach back to the window's first day, the beginning is worked back from today: today's value less what each holding gained, less the money moved. (1) A CD with a stated rate gains by its rate: value now × (1 − 1 ÷ (1 + rate) to the power of the years in the window) — $10,500 at 5% for a year gained $500. (2) A holding with no price history and no stated rate — a bond typed by hand — has a gain that cannot be known, so that account shows no beginning and no wealth generated, and a sentence names it: "The beginning can't be worked back: Treasury 2031 has no price history." Before: its gain counted $0, so the beginning read about $500 too high.  
  Governs: MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance · MK-PF-M-013 · MK-PF-M-014
- **DEC-3657** (2026-10-09) — Where an account, a bank, a class or a debt on Net worth has no balance entered, the figure reads "Value not entered" — so the line says what is missing. By institution: "Ally · Value not entered". Before: "Ally · not entered", which did not say what was not entered.  
  Governs: MK-NW-M-007 · MK-NW-M-008 · MK-NW-M-010
- **DEC-3768b** (2026-10-10) — A window that reaches back whole months (1M, 3M, 6M, 1Y, 2Y) starts on the same day of the earlier month, or on that month's last day when the day does not exist there. Mar 31 less one month is Feb 28; Feb 29 less a year is Feb 28. Before: the missing day rolled into the next month, so 1M from Mar 31 started Mar 3 — a 28-day window.  
  Governs: MK-NW-F-090 windowStartKey · MK-PF-F-008 startDateFor
- **DEC-3768c** (2026-10-10) — A rent or running-cost figure is a number. One with words in it — "about 2k" — is not read: it counts as not entered, and the rent field on the Income screen takes digits only. Before: "about 2k" was read as $2, and the property counted as a rental.  
  Governs: MK-NW-F-114 rentAmount · MK-CF-F-067 rentalList · MK-NW-F-115 liveRent
- **DEC-3769** (2026-10-10) — When a property's rent is not known — its rent entry is blank or unreadable, or the rent entries could not be read — the emergency fund still gives its months, counted without rent, and says so: "5 months, rent not included. Enter rent to include." Cash $10,000, essentials $2,000 a month: 5 months. Before (my recommendation, not built): no months figure at all.  
  Governs: MK-NW-O-004 theEmergencyFund · MK-NW-M-064
- **DEC-3836** (2026-10-10) — Wherever the emergency fund's months are shown — Net worth, Job safety and Stress test — the same line sits with them when a property's rent is not known: "5.0 months, rent not included. Enter rent to include." Before: only Net worth carried it.  
  Governs: MK-NW-O-004 theEmergencyFund · MK-NW-M-013 · the Job safety and Stress test months figures
- **DEC-3837** (2026-10-10) — Adding a CD asks once: "Bought from the bank, or through a broker?" A bank CD's yield to maturity is its interest rate ($10,000 at 4.2% → 4.20%), and it has no if-rates-move estimate. A broker CD's yield to maturity is worked out like a bond's, from its face value, interest rate, statement value and maturity date ($10,000 face, 4.2%, worth $9,850, 2 years left → about 5.0%), and it gets the if-rates-move estimate like a bond. Before: every CD showed its interest rate as its yield to maturity — my rule of 2026-10-08, which assumed every CD was bought from a bank at face value.  
  Governs: MK-NW-F-060 approxYTM · MK-NW-F-064 bondRateSensitivity · MK-NW-F-056 bondInfo · MK-NW-F-070 accruedInterestCaveat · MK-NW-F-119 estimatedAccrued · MK-NW-O-001 theBonds · the add-account CD form
- **DEC-4036b** (2026-10-10) — A bond or CD with no maturity date entered keeps counting its interest (DEC-0332: unknown, not matured); its row reads "maturity date not entered". Treasury $10,000 at 4%, no date: $400 a year counted.  
  Governs: MK-NW-F-062 couponIncomeAnnual · MK-NW-F-063 interestIncomeAnnual · MK-NW-F-072 rowOf
- **DEC-4036c** (2026-10-10) — "CD" is read only from an account's own name or type, never from its institution's name. A brokerage account at "CD Capital" is not a CD.  
  Governs: MK-NW-F-071 isCertificateOfDeposit · MK-NW-F-056 bondInfo
- **DEC-4036d** (2026-10-10) — A 529 is always tax-free for education, whatever tax setting is stored; its type decides (DEC-3035c). Before: a 529 stored "taxable" was counted as taxable while its page said tax-free.  
  Governs: MK-NW-F-012 taxTreatmentOf · MK-NW-F-108 taxWordsOf
- **DEC-4036e** (2026-10-10) — An HSA is always pre-tax going in and tax-free for medical costs, whatever bucket it is filed in. Before: an HSA filed under Roth was counted as tax-free going in.  
  Governs: MK-NW-F-012 taxTreatmentOf · MK-NW-F-108 taxWordsOf
- **DEC-4036f** (2026-10-10) — An account with no account type chosen is never assumed taxable: its tax reads "tax type not stated" with a tap to choose. Before: counted and shown as a taxable brokerage.  
  Governs: MK-NW-F-010 wrapperAccount · MK-NW-F-012 taxTreatmentOf · MK-NW-F-108 taxWordsOf
- **DEC-4036g** (2026-10-10) — The old sign-up answer "savings or portfolio" is filed Unclassified and asked about: "Is this cash savings or investments?" (DEC-2160). Before: always Stocks / Funds at 7%.  
  Governs: MK-NW-F-040 assetsFromOnboarding
- **DEC-4036h** (2026-10-10) — Money left in an alternatives part that no priced holding explains is shown as "$1,500 asset type not classified" — never labelled Other or given a growth rate. Before: "Other" at 5%.  
  Governs: MK-NW-F-113 altPartsOf · MK-NW-O-005 theAlternativesOutlook
- **DEC-4036i** (2026-10-10) — An overdrawn hand-built account is negative cash: balance −$100 with a cash field of $50 is Cash −$100. Before: Cash $0 and Unclassified −$100.  
  Governs: MK-NW-F-027 accountClassBreakdown
- **DEC-4036j** (2026-10-10) — Where a vehicle's value is not entered, the car you drive is still picked among the vehicles with a value, and a line says: "Car A's value not entered — it may be the car you drive."  
  Governs: MK-NW-F-031 primaryCarIdOf · MK-NW-F-030 earmarkDefault
- **DEC-4036k** (2026-10-10) — The retirement money on the Plan screens names an account it leaves out: "leaves out Linked 401(k) — Value not entered" (DEC-3657 wording). Before: $10,000 with no note.  
  Governs: MK-NW-F-033 retirementEarmarkedValue
- **DEC-4059b** (2026-10-10) — Every date a person enters for a bond or CD is picked from a date picker, never typed — the Net worth account editor too (it had a typed "Matures YYYY-MM" box). The app is not launched, so no typed date exists to carry over.  
  Governs: MK-NW-F-009 maturityClass · the Net worth account editor
- **DEC-4059c** (2026-10-10) — When a linked account's history start date cannot be read (a date in the future, or not a date), the history line says "History start date cannot be read. Edit date", and a tap lets the person enter or correct the date with a date picker; the sentence then uses their date. Before: "a few days of history (from )".  
  Governs: MK-NW-F-046 historyCoverage · the account page · the Income screen
- **DEC-4059d** (2026-10-10) — A rent entry cannot be saved until the property it is for is picked. With no property in Net worth, the entry says "Add the property in Net worth first" and links there; an older entry with no property shows the question in amber until answered.  
  Governs: MK-NW-F-107 propertyUses · MK-NW-F-116 rentedIdsOf · the Income screen
- **DEC-4082** (2026-10-10) — (15) A count written in words ("2 holdings", "3 CDs", "2 Treasuries", "1 year 6 months") takes its plural from ONE list of every word the app counts and its plural — holding/holdings, CD/CDs, Treasury/Treasuries, bond/bonds, option/options, year/years, month/months, property/properties and the rest in use. A word not on the list is refused by a test, so "2 propertys" can never ship. (6) The risk swing used by the Will my money last odds (a weighted average of each account's swing, MK-NW-F-035) is parked until the Plan module, where the table of how investment types move together is decided.  
  Governs: MK-NW-F-067 plural · MK-NW-F-035 blendedVolatility (parked)
- **DEC-4327** (2026-10-11) — When sign-up's rent step comes after a property was entered, it asks "Which property is it?" right there, so rent entered at sign-up counts at once. With no property entered yet it keeps its line: "The rent is counted once you pick its property on the Income screen." Before: sign-up never asked, so its rent was not counted until the property was picked on the Income screen (DEC-4059d).  
  Governs: the onboarding rent step · MK-NW-F-116 rentedIdsOf
- **DEC-4350** (2026-10-11) — Sign-up asks for rent before any property can exist, so its rent step carries a door: "Add the property first ›". It opens Add an account set to Real estate; saving brings the person back to the rent step, which asks "Which property is it?"; once picked, the rent counts at once. About 3 taps plus typing, without leaving sign-up. Before: the rent was kept but counted nowhere until the person added the property in Net worth and picked it on the Income screen, about 7 taps after sign-up.  
  Governs: the onboarding rent step · Add an account · MK-NW-F-116 rentedIdsOf
- **DEC-4439** (2026-10-11) — The time-weighted return counts money that arrives on a day as there for that whole day, and money taken out as gone for that whole day: that day's growth is the evening value ÷ (the previous evening's value + money added − money taken out) − 1. A new account opened with $10,000 and worth $10,050 that evening returned +0.50% that day (+$50); worth $9,800, −2.00% (−$200). Vanguard worth $50,000, $10,000 added in the morning, $60,300 that evening: +0.50% (the $300 was earned on $60,000). Before: the money counted as arriving at the end of the day — the first deposit into a new account could not be measured at all, a value below the money just added was refused as a broken record, and the Vanguard day read +0.60%.  
  Governs: MK-ST-F-081 timeWeightedReturn · MK-ST-F-082 movementsOf · MK-NW-F-105 whyNoReturn · MK-NW-O-008 thePerformance
- **DEC-4528** (2026-10-11) — With no debt entered, the Debts section's door reads "Add your debts ›" — the wording of the approved empty-state drawing. Before: Net worth v08 state C drew "Add a mortgage, card, or loan ›" while the empty-state drawing drew "Add your debts ›".  
  Governs: MK-NW-M-009 · the Net worth Debts section
- **DEC-4529** (2026-10-11) — Where an approved drawing shows a figure that is wrong and the app is right, the drawing is left as drawn and its READ THIS FIRST box gets a line naming the figure, what the drawing shows, what is right, and why, with the arithmetic — Net worth v08 B −0.40% → −0.41%; E (Aug 4) → (Aug 11); F 7 days → 14 days; Bonds v02 years left 2y/4y/1y → 1y/3y/0y; Other investments v02 "Annuity" → "Annuities"; Holding detail v02 gain $7,400.00 + $1,957.60 → $7,384 + $1,974 in whole dollars. And the edit sheet of a home (any property) no longer asks "What's it invested in?".  
  Governs: Net worth v08 · Bonds v02 · Other investments v02 · Holding detail v02 · the Net worth account editor sheet
- **DEC-4640** (2026-10-12) — If the app is ever handed a window name it does not have (for example "5Y"; the screens offer Since, 1M, This year, 1Y and 2Y), it shows no figure for that window. Before: one function read "5Y" as twelve months back and another as today — two guesses for one question. Now both ask one table of window names and refuse a name that is not on it.  
  Governs: MK-NW-F-090 windowStartKey · MK-PF-F-008 startDateFor · MK-PF-F-010 periodReturn · MK-PF-F-039 periodReturnParts · MK-PF-F-014 buildPerformance · MK-NW-O-008 thePerformance · the Holding page and the Account page window start
- **DEC-4641** (2026-10-12) — A holding whose price history starts after the window opens is still measured from its first price. Wherever that holding's window figure is shown, the line the Holding page already used sits with it: "Prices for this holding go back 5 months, so the 1-year figure covers 5 months — not a year." The sentence now comes from one function; the Account page's holding rows print it too (before, only the Holding page did).  
  Governs: MK-PF-F-045 priceHistoryShortSentence · MK-PF-F-010 periodReturn · MK-PF-F-011 periodReturnSince · MK-PF-F-029 closeAsOf · MK-ST-F-004 coverageFor · the Holding page window line · the Account page holding rows
- **DEC-4643** (2026-10-12) — A linked broker sends about two years of activity, so a sale can reach past the oldest purchase it sent. Example: bought 10 at $50 on record, sold 15 at $70. The sale is counted once; its gain is on the 10 matched shares; the page reads "$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record." Before, it counted one sale with a gain AND one sale without a purchase, which read as two sales. A sale typed by hand is still blocked from selling more than you own.  
  Governs: MK-PF-F-028 realizedFromLedger · MK-PF-F-046 saleShortOfPurchasesSentence · MK-PF-F-033 quantityWithUnit · MK-NW-M-035 · MK-NW-O-006 theHolding · the Holding page DIVIDENDS & REALIZED card
- **DEC-4644** (2026-10-12) — This applies his existing rule; it is not a new ruling. The price feed gives dividend-adjusted closes, so a holding's return already includes its dividends. Where there is no daily record and the beginning is worked back from each holding's return, the dividends are NOT taken off again. Example: 1,000 shares $100 → $105 paying $1,200, adjusted return 6.28%: beginning $100,000 (right); taking the dividend off again would read $98,800. The walk adds up: dividends + change in investment value = wealth generated.  
  Governs: MK-NW-O-008 thePerformance · MK-NW-F-091 pricedGainOf · MK-NW-F-127 gainOfRow · MK-PF-F-010 periodReturn · the change walk (Dividends · Change in investment value · Wealth generated)
- **DEC-4645** (2026-10-12) — The market figure (MK-PF-M-008) uses SPY and AGG through the same dividend-adjusted closes as every holding, so it includes their dividends and interest. On 2026-09-30 I told him it was price only (DEC-0595, DEC-0640); that was wrong. His approved Home line stays word for word: "you +3.69% (including dividends and interest) · market +2.83% · ahead by 0.85%". Every false "price only" statement now carries a dated correction; the Holding page note that said "price changes only — dividends not included" reads "both include dividends and interest".  
  Governs: MK-PF-M-008 market +X% · MK-PF-F-020 portfolioBenchReturn · MK-PF-F-013 benchmarkTicker · MK-PF-M-010 · the Holding page VS THE STOCK MARKET note · the Performance gap line for a broker with no dividend records · DEC-0595 · DEC-0640
- **DEC-4646** (2026-10-12) — A linked broker's option is 10 shares a contract when SnapTrade marks it a mini option, else 100, and that figure is stored with the option. An option typed by hand has a "Shares per contract" box, 100 unless changed, saved with the holding. Before, every option was 100, so a mini option read ten times its value.  
  Governs: MK-XS-I-063 option contract multiplier · MK-XS-F-106 mapOptionHolding · MK-XS-F-102 ingestSync · MK-PF-F-031 contractMultiplier · the Add / Edit holding form

# The screen register — 53 figures on /invest, /account-detail, /look-back, /home, /holding-detail

What each figure on the Performance screens is, how it is worked, and what it says when it cannot be. Job 4 checks each.

```json
{
 "MK-CF-M-002": {
  "label": "= Planned surplus",
  "screens": [
   "/cashflow",
   "/home"
  ],
  "answers": "The surplus in the month if everything goes to plan.",
  "formula": "the inflow, less every debt payment due, less the budget, less each big-ticket item",
  "inputs": [
   "MK-XS-I-023 salary and other income",
   "MK-NW-I-002 your debts",
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": [
   "EVERY ROW SHOWN IS A ROW DEDUCTED (his rule under the approved design): nothing appears on This month without being in the sum."
  ],
  "refusal": "No budget set — there is no planned surplus, and the screen says so rather than guessing one.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$1,150/month"
  }
 },
 "MK-CF-M-051": {
  "label": "Inflow",
  "screens": [
   "/cashflow",
   "/home"
  ],
  "answers": "What has actually come in so far this month, as opposed to what the plan expected.",
  "formula": "inflow so far = Σ of the income recorded as received in this month up to today",
  "inputs": [
   "MK-CF-I-015 income recorded as received"
  ],
  "decisions": [
   "Nothing is assumed to have arrived; a source counts only once it is recorded (founder, 2026-08-28)."
  ],
  "refusal": "Shows $0 until something is recorded as received.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.",
   "answer": "$7,200/month"
  }
 },
 "MK-CF-M-052": {
  "label": "Outflow (expenses + debt)",
  "screens": [
   "/cashflow",
   "/home"
  ],
  "answers": "What has actually gone out so far this month: the expenses logged, plus the debt payments due in the month.",
  "formula": "outflow so far = expenses logged so far this month + Σ of the debt payments due this month",
  "inputs": [
   "MK-CF-I-016 logged expense",
   "MK-CF-I-013 debt payment"
  ],
  "decisions": [
   "Debt payments are counted in full for the month, logged or not, because they are committed."
  ],
  "refusal": "Shows $0 until an expense is logged or a debt is entered.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.",
   "answer": "−$3,248/month"
  }
 },
 "MK-CF-M-053": {
  "label": "= Surplus",
  "screens": [
   "/cashflow",
   "/home"
  ],
  "answers": "What is actually left this month so far — not what the plan said, what has happened.",
  "formula": "surplus so far = inflow so far − outflow so far",
  "inputs": [
   "MK-CF-M-051 inflow so far",
   "MK-CF-M-052 outflow so far"
  ],
  "decisions": null,
  "refusal": "Shows $0 until something is recorded.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.",
   "answer": "$3,952/month"
  }
 },
 "MK-MN-M-003": {
  "label": "$X left / up to $Y",
  "screens": [
   "/contribution-room",
   "/home"
  ],
  "answers": "How much more you can still put into this account this year.",
  "formula": "the IRS limit for your age this year, less what has gone in already",
  "inputs": [
   "MK-XS-I-030 tax filing status and age",
   "MK-XS-I-023 salary and other income"
  ],
  "decisions": [
   "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
  ],
  "refusal": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
  "worked": {
   "given": "Born 1965 — so 61 during 2026. Paying in $1,200/month to a 401(k), $300 to a Roth IRA and $150 to an HSA; not on Medicare. Read on 29 September 2026, so four months of the year are left.",
   "answer": "$21,350"
  }
 },
 "MK-NW-M-012": {
  "label": "Monthly debt payments",
  "screens": [
   "/analytics",
   "/home"
  ],
  "answers": "What all your debts require of you in a month, together.",
  "formula": "the sum of each debt’s required payment",
  "inputs": [
   "MK-NW-I-002 your debts"
  ],
  "decisions": null,
  "refusal": "No debts entered.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$2,650/month"
  }
 },
 "MK-NW-M-013": {
  "label": "EMERGENCY FUND — X.X months",
  "screens": [
   "/analytics",
   "/jobsafety",
   "/stress-test",
   "/insights",
   "/home"
  ],
  "answers": "How many months your cash would cover, if your income stopped tomorrow.",
  "formula": "your cash ÷ (what a month of essentials costs − the rent from a property that keeps arriving each month)",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": [
   "ONE essentials figure across all three screens (his ruling G21, 2026-09-08): the average of what has been logged, over the months logged.",
   "FOUNDER 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\" Rent arrives every month, so it is added to the cash every month — which is the cash ÷ (the month − the rent)."
  ],
  "refusal": "No essentials figure yet — it says so rather than dividing by nothing. And no count of months where the rent pays for the whole month: the cash is then not drawn on.",
  "worked": {
   "given": "$18,000 in checking, and a home. A $2,400/month mortgage on it, entered both as the Rent / Mortgage budget line and as a Mortgage debt — the same $2,400. It is counted once, from Debts; the budget line stands down. Plus $700 groceries (an essential) and $400 eating out (not). Also a car loan at $250/month and a Visa at $120/month. Nothing logged yet.",
   "answer": "5.2 months"
  }
 },
 "MK-NW-M-018": {
  "label": "Market value",
  "screens": [
   "/account-detail",
   "/invest"
  ],
  "answers": "What this account is worth today.",
  "formula": "the account’s balance — for a linked account the broker’s own figure, for one entered by hand the value entered",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "An account with no value shows nothing rather than $0.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "$46,600"
  }
 },
 "MK-NW-M-019": {
  "label": "Income",
  "screens": [
   "/account-detail"
  ],
  "answers": "The dividends and interest this account has actually received.",
  "formula": "the sum of the dividend and interest rows the ledger holds for this account",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "Never estimated. A broker that shares no income records leaves this blank rather than showing a made-up $0."
  ],
  "refusal": "No records — it says so instead of showing zero.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "$825"
  }
 },
 "MK-NW-M-020": {
  "label": "each asset class inside the account",
  "screens": [
   "/account-detail"
  ],
  "answers": "What each kind of thing inside this account is worth — cash, bonds, stocks, alternatives.",
  "formula": "the cash sleeve, plus each holding’s shares × its last price, added up by class",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "Only a LINKED account has an inside to read. A hand-entered lump has none until someone itemises it."
  ],
  "refusal": "Not linked — the screen shows the itemise door instead of inventing a breakdown.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "$40,600"
  }
 },
 "MK-NW-M-021": {
  "label": "Income: <amount> on a holding row",
  "screens": [
   "/account-detail"
  ],
  "answers": "What this one holding has paid you, from the records that name it.",
  "formula": "the dividend and interest rows whose ticker IS this holding’s ticker; nothing when the record names no holding",
  "inputs": [
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "FOUNDER FINDING 2026-08-11: a record with no ticker names no holding. It used to match every non-stock holding, so a CD showed dividends it cannot pay and two CDs showed one figure twice. Untickered income is counted at the ACCOUNT level instead, where it belongs."
  ],
  "refusal": "No record naming this holding — the line does not appear at all.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "825 dividends"
  }
 },
 "MK-NW-M-022": {
  "label": "ACTIVITY — n records",
  "screens": [
   "/account-detail"
  ],
  "answers": "How many records this account has: what has happened in it.",
  "formula": "the count of ledger rows for this account",
  "inputs": [
   "MK-NW-I-004 the activity records"
  ],
  "decisions": null,
  "refusal": "None yet — the section keeps its heading and says so.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "4"
  }
 },
 "MK-NW-M-023": {
  "label": "Face value",
  "screens": [
   "/account-detail"
  ],
  "answers": "What this bond pays back on the day it matures.",
  "formula": "the face value you entered",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "Not entered, so nothing is shown.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$25,000"
  }
 },
 "MK-NW-M-024": {
  "label": "Interest payments",
  "screens": [
   "/account-detail"
  ],
  "answers": "The rate it pays, and what that comes to in a year.",
  "formula": "coupon rate, and face value × coupon rate",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "No coupon rate entered.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$1,125/year — 4.50% of $25,000 face"
  }
 },
 "MK-NW-M-025": {
  "label": "Matures",
  "screens": [
   "/account-detail"
  ],
  "answers": "The day it pays back, and how long that is away.",
  "formula": "the maturity date, and the years between today and it",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "No maturity date entered — the yields refuse rather than guess one.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "2029-09-30 — 3.0 years away"
  }
 },
 "MK-NW-M-026": {
  "label": "Yield if held to maturity",
  "screens": [
   "/account-detail"
  ],
  "answers": "What it earns a year if you hold it to the end, counting the gap between its price and its face value.",
  "formula": "(coupon + (face − value) ÷ years left) ÷ ((face + value) ÷ 2) — the standard approximation",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "An approximation, and labelled an estimate on screen."
  ],
  "refusal": "Matured, or no maturity date — it refuses rather than divide by nothing.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "5.69%"
  }
 },
 "MK-NW-M-027": {
  "label": "Yield on today's value",
  "screens": [
   "/account-detail"
  ],
  "answers": "What the interest comes to against what the bond is worth today.",
  "formula": "coupon ÷ today’s value",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "No value today.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "4.65%"
  }
 },
 "MK-NW-M-028": {
  "label": "Rates rise 1% → value roughly $X–$Y",
  "screens": [
   "/account-detail"
  ],
  "answers": "Roughly what this bond would be worth if interest rates moved one percent either way.",
  "formula": "price it again at (yield to maturity ± 1%), and show a band of ±1% around that",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "An estimate, and it wears the estimate label.",
   "FOUNDER 2026-09-27: a CD bought from the bank gets no estimate. It is not traded, so its value does not move with rates; the screen says that instead.",
   "DEC-3837, 2026-10-10: a CD bought through a broker trades, so it gets the estimate like a bond. A CD whose answer was never given is read as bought from the bank."
  ],
  "refusal": "Refused for a CD bought from the bank, for a matured bond, and for anything with no coupon or no maturity — and for a bank CD it says plainly why nothing happens.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$23,300–$23,800"
  }
 },
 "MK-NW-M-029": {
  "label": "CURRENT PRICE · LIVE",
  "screens": [
   "/holding-detail"
  ],
  "answers": "What one share is worth right now, and how fresh that price is.",
  "formula": "the last close the price feed holds for this ticker",
  "inputs": [
   "MK-NW-I-005 the price feed"
  ],
  "decisions": [
   "A price that has gone stale says its age rather than passing as today’s."
  ],
  "refusal": "No price — the screen shows what you paid instead, and says so.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$290.00"
  }
 },
 "MK-NW-M-030": {
  "label": "Current value",
  "screens": [
   "/holding-detail"
  ],
  "answers": "What this holding is worth today.",
  "formula": "shares × today’s price",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-005 the price feed"
  ],
  "decisions": [
   "r30: with NO price it shows what you paid, never a zero — a holding priced at zero would quietly shrink your whole portfolio."
  ],
  "refusal": "No price — it shows what you paid, labelled as that. Not stated where a purchase has no share count or price paid on record.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$40,600"
  }
 },
 "MK-NW-M-031": {
  "label": "Quantity — n shares",
  "screens": [
   "/holding-detail"
  ],
  "answers": "How many shares you still hold.",
  "formula": "the shares of every lot still held, added up",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "All sold — the screen says the holding is liquidated rather than showing 0 shares. Not stated where a purchase has no share count on record.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "140"
  }
 },
 "MK-NW-M-032": {
  "label": "Price paid (average)",
  "screens": [
   "/holding-detail"
  ],
  "answers": "What you paid per share, on average, for what you still hold.",
  "formula": "what you paid in total ÷ the shares you still hold",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "Kept unrounded inside, rounded once at display (Q49) — rounding it early moved the total it multiplies back into."
  ],
  "refusal": "No purchase price recorded.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$225.71"
  }
 },
 "MK-NW-M-033": {
  "label": "Total paid",
  "screens": [
   "/holding-detail",
   "/invest"
  ],
  "answers": "What you paid for the shares you still hold.",
  "formula": "the cost of every lot still held, added up",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "No purchase price recorded.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$31,600"
  }
 },
 "MK-NW-M-034": {
  "label": "Dividends received (12 mo)",
  "screens": [
   "/holding-detail"
  ],
  "answers": "What this holding has paid you over the last twelve months.",
  "formula": "the DIVIDEND records naming this ticker, dated within the last year",
  "inputs": [
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "A record that names no ticker belongs to no holding — the same rule the account page carries."
  ],
  "refusal": "No records naming this holding — the line does not appear.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$825"
  }
 },
 "MK-NW-M-035": {
  "label": "Realized gain from your buys and sells",
  "screens": [
   "/holding-detail"
  ],
  "answers": "What your earlier sales of this holding actually made.",
  "formula": "for each sale: what it sold for, less what those shares cost",
  "inputs": [
   "MK-NW-I-004 the activity records"
  ],
  "decisions": null,
  "refusal": "Nothing sold yet.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$1,700"
  }
 },
 "MK-NW-M-036": {
  "label": "Gain — long-term (held over 1 yr)",
  "screens": [
   "/holding-detail"
  ],
  "answers": "The gain on shares you have held more than a year — the part taxed at the lower rate.",
  "formula": "for each lot bought over a year ago: shares × (today’s price − what you paid)",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-005 the price feed"
  ],
  "decisions": null,
  "refusal": "No price today — no gain is stated at all. Not stated where a purchase in this part has no price paid or share count on record.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$8,000"
  }
 },
 "MK-NW-M-037": {
  "label": "Gain — short-term (held 1 yr or less)",
  "screens": [
   "/holding-detail"
  ],
  "answers": "The gain on shares held under a year — the part taxed as ordinary income.",
  "formula": "for each lot bought within the year: shares × (today’s price − what you paid)",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-005 the price feed"
  ],
  "decisions": null,
  "refusal": "No price today — no gain is stated at all. Not stated where a purchase in this part has no price paid or share count on record.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$1,000"
  }
 },
 "MK-NW-M-059": {
  "label": "Change since purchase",
  "screens": [
   "/holding-detail"
  ],
  "answers": "What this holding has gained or lost against what was paid for it.",
  "formula": "what it is worth today − what was paid for it",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": [
   "IT IS AGAINST WHAT WAS PAID, not against any starting price: the figure answers \"am I ahead on this holding\", which only the cost basis can answer.",
   "WITHOUT A PRICE THERE IS NO FIGURE at all, rather than a zero — a gain of zero reads as break-even when the truth is that nothing is known."
  ],
  "refusal": "No price — the row is left out, and the screen says what was paid instead.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$9,000"
  }
 },
 "MK-NW-M-060": {
  "label": "up",
  "screens": [
   "/holding-detail"
  ],
  "answers": "How much ONE SHARE of this holding moved since the previous close, in money — it sits under the price of one share.",
  "formula": "the last close − the close before it",
  "inputs": [
   "MK-XS-I-006 price fetched at"
  ],
  "decisions": [
   "TWO CLOSES ARE NEEDED. One price is a price, not a change, so with a single point there is no figure rather than a change of zero.",
   "IT CAME OFF THE SCREEN (2026-10-01). It was calculated inside HoldingDetailScreen from the price series — a money figure derived inline on a screen, which is what one door exists to prevent. The door computes it now and the screen prints what the door says."
  ],
  "refusal": "Fewer than two closes known, or a previous close of zero — the line is not drawn.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$2.31"
  }
 },
 "MK-NW-M-061": {
  "label": "sh @",
  "screens": [
   "/holding-detail",
   "/invest"
  ],
  "answers": "What one purchase cost per share, on the day it was bought.",
  "formula": "the cost per share as recorded on that purchase",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": [
   "EACH PURCHASE KEEPS ITS OWN PRICE. They are what the average above them is made of, so a person can check the average rather than having to trust it."
  ],
  "refusal": "No purchases recorded — the section is not drawn.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$210.00"
  }
 },
 "MK-NW-M-062": {
  "label": "what one record moved",
  "screens": [
   "/account-detail",
   "/invest"
  ],
  "answers": "What this one record added to the account or took out of it.",
  "formula": "the amount on the record, positive where it came in and negative where it went out",
  "inputs": [
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "THE SIGN IS SHOWN AS A WORD OR A MARK, never by colour alone — a plus or a minus in front of the figure, so it reads the same to someone who cannot tell the two colours apart.",
   "A RECORD YOU TYPED AND ONE THE BROKER SENT BOTH APPEAR, each saying which it is (DEC-0107). A $500 deposit mistyped as $5,000 is only findable if the row says where it came from."
  ],
  "refusal": "No records yet — the section keeps its heading and says so.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "$420"
  }
 },
 "MK-PF-M-001": {
  "label": "Ending value",
  "screens": [
   "/invest"
  ],
  "answers": "What your investments are worth at the end of the window you picked.",
  "formula": "the sum of every investment account’s value today",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-005 the price feed"
  ],
  "decisions": null,
  "refusal": "Nothing invested yet.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.",
   "answer": "$46,600"
  }
 },
 "MK-PF-M-002": {
  "label": "Wealth generated",
  "screens": [
   "/invest"
  ],
  "answers": "What the money itself made in the window — not what you added to it.",
  "formula": "ending − beginning − what you put in + what you took out",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-004 the activity records",
   "MK-NW-I-003 the recorded history"
  ],
  "decisions": [
   "ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are part of this, so the return beside it counts them too."
  ],
  "refusal": "The record cannot reach the start of this window, so there is nothing honest to subtract from.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.",
   "answer": "$10,600"
  }
 },
 "MK-PF-M-003": {
  "label": "HOW $X BECAME $Y · ALL ACCOUNTS",
  "screens": [
   "/invest"
  ],
  "answers": "Every line that took the beginning to the ending, so it can be checked by eye.",
  "formula": "beginning + contributions − withdrawals + wealth generated = ending, by construction",
  "inputs": [
   "MK-NW-I-003 the recorded history",
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "Whatever the records cannot explain lands in the change-in-value line rather than being silently dropped."
  ],
  "refusal": "No beginning to walk from.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.",
   "answer": "HOW $30,000 BECAME $46,600 · ALL ACCOUNTS"
  }
 },
 "MK-PF-M-004": {
  "label": "Ending market value (per account)",
  "screens": [
   "/invest",
   "/account-detail"
  ],
  "answers": "What one account is worth at the end of the window.",
  "formula": "the sum of that account’s holdings, at today’s prices, plus its cash",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-005 the price feed"
  ],
  "decisions": null,
  "refusal": "Nothing in it.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received. Asked of that one account.",
   "answer": "$46,600"
  }
 },
 "MK-PF-M-005": {
  "label": "each account and its ending value",
  "screens": [
   "/invest"
  ],
  "answers": "One line per account, and what it is worth — the parts that sum to the whole above.",
  "formula": "each investment account’s value, named by the account",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "Named by ACCOUNT, not by institution — two accounts at one broker must be tellable apart (founder screenshot, 2026-08-17)."
  ],
  "refusal": "One account only — the whole walk above already says it.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received. Each account is asked separately, from the same door as the total.",
   "answer": "$46,600"
  }
 },
 "MK-PF-M-006": {
  "label": "WHAT EACH CATEGORY EARNED — RETURN",
  "screens": [
   "/invest"
  ],
  "answers": "What each kind of holding returned over the window you picked.",
  "formula": "each class's own growth over the window: what its holdings are worth now ÷ what they were worth when the window began (each now ÷ (1 + its own return over the whole window, never a yearly rate)), less 1",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-006 the price fetched at"
  ],
  "decisions": [
   "A class with no holding we can price shows an em-dash, never a 0% — a zero reads as \"it returned nothing\", which is a different claim.",
   "MOVED OFF THE SCREEN 2026-09-30: this was calculated inside PerformanceScreen, so it had no row, no example and nothing able to check it (his rule: a screen computes nothing)."
  ],
  "refusal": "An em-dash — no holding in that class can be priced over this window.",
  "worked": {
   "given": "Since 1 Jan 2026: dividends of $420 and $405 on VTI, $505 of interest on an Ally CD, and one dividend of $40 with no ticker on it. A $900 dividend from Nov 2025 is outside the window. Holdings: $40,600 of VTI up 12%, $10,000 of CD up 5%.",
   "answer": "+12.00%"
  }
 },
 "MK-PF-M-007": {
  "label": "All categories",
  "screens": [
   "/invest"
  ],
  "answers": "What you actually received, in dividends and interest, over the window — by kind.",
  "formula": "every dividend and interest record inside the window, added up by the class of the holding that paid it",
  "inputs": [
   "MK-XS-I-020 the records of money movements"
  ],
  "decisions": [
   "LEDGER ONLY: what was actually RECEIVED, never a rate applied to a balance.",
   "A record with no ticker is classed by what it IS — a dividend comes from a fund, interest from a bond.",
   "A class that received nothing is not shown at all; where nothing was received the table does not appear."
  ],
  "refusal": "The table does not appear — nothing was received in this window.",
  "worked": {
   "given": "Since 1 Jan 2026: dividends of $420 and $405 on VTI, $505 of interest on an Ally CD, and one dividend of $40 with no ticker on it. A $900 dividend from Nov 2025 is outside the window. Holdings: $40,600 of VTI up 12%, $10,000 of CD up 5%.",
   "answer": "$865"
  }
 },
 "MK-PF-M-008": {
  "label": "market +X%",
  "screens": [
   "/home"
  ],
  "answers": "What the market did over the SAME days, matched to what you actually hold.",
  "formula": "each holding's own benchmark return over the same dates, weighted by what that holding was worth when the window began (its value now ÷ (1 + its own return)); a holding with no return of its own is left out of the blend",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-006 the price fetched at"
  ],
  "decisions": [
   "The benchmark runs over the SAME DATES as your return — including where your window is cut short at your own purchase date. Comparing your three months against the market's twelve is not a comparison.",
   "Weighted by what each holding was worth when the window began, so the blend answers \"the market, matched to my mix\" rather than a plain average of indices — and a holding that grew does not grow its yardstick's weight (outside review Claude Performance, 2026-10-11, DEC-1669, DEC-3035b).",
   "THE MARKET INCLUDES ITS DIVIDENDS AND INTEREST (DEC-4645, 2026-10-12): SPY and AGG are read through the same dividend-adjusted closes as every holding (src/services/marketData.ts, adjclose)."
  ],
  "refusal": "No benchmark can be priced over this window, so none is shown.",
  "worked": {
   "given": "$40,000 of shares against a benchmark up 10% over the window, and $10,000 of bonds against one up 4% over the same days; neither holding moved, so each was worth then what it is worth now.",
   "answer": "8.80%"
  }
 },
 "MK-PF-M-010": {
  "label": "Left in <fund> it became $X (up/down $Y, Z%)",
  "screens": [
   "/look-back"
  ],
  "answers": "What your money actually did, where it actually was.",
  "formula": "the amount × (the fund’s price today ÷ its price at the start of the window)",
  "inputs": [
   "MK-NW-I-005 the price feed"
  ],
  "decisions": [
   "Dividends and distributions are in it: the closes it reads are adjusted for them (corrected 2026-10-12; it said price changes only)."
  ],
  "refusal": "No price history over the whole window — the screen shows nothing rather than a shortened one.",
  "worked": {
   "given": "$10,000 left in BND for 12 months, against moving it to VTI. BND closed $72.00 a year ago and $73.80 now; VTI closed $250.00 and $290.00.",
   "answer": "$10,250"
  }
 },
 "MK-PF-M-011": {
  "label": "Moved to <fund> it would be $X",
  "screens": [
   "/look-back"
  ],
  "answers": "What the same money would have become in the other fund.",
  "formula": "the amount × (the other fund’s price today ÷ its price at the start of the window)",
  "inputs": [
   "MK-NW-I-005 the price feed"
  ],
  "decisions": [
   "A road not taken, priced from real history — never a projection forward."
  ],
  "refusal": "No price history for the other fund over the whole window.",
  "worked": {
   "given": "$10,000 left in BND for 12 months, against moving it to VTI. BND closed $72.00 a year ago and $73.80 now; VTI closed $250.00 and $290.00.",
   "answer": "$11,600"
  }
 },
 "MK-PF-M-012": {
  "label": "Difference: $X more/less if you had moved",
  "screens": [
   "/look-back"
  ],
  "answers": "What the move would have been worth, in money.",
  "formula": "what it would have become, less what it did become",
  "inputs": [
   "MK-NW-I-005 the price feed"
  ],
  "decisions": null,
  "refusal": "Either fund missing its history means no difference is stated.",
  "worked": {
   "given": "$10,000 left in BND for 12 months, against moving it to VTI. BND closed $72.00 a year ago and $73.80 now; VTI closed $250.00 and $290.00.",
   "answer": "$1,350"
  }
 },
 "MK-PF-M-013": {
  "label": "Beginning market value",
  "screens": [
   "/account-detail",
   "/invest"
  ],
  "answers": "What this one account was worth on the day the window opens, READ from the record — never back-solved from today.",
  "formula": "the account’s value on the day before the window opens, as recorded",
  "inputs": [
   "MK-NW-I-003 the recorded history"
  ],
  "decisions": [
   "IT IS READ, NOT BACK-SOLVED. Working it out from today’s value less the flows would make the walk add up by construction and prove nothing (his ruling behind MK-NW-F-090).",
   "THE DAY BEFORE THE WINDOW OPENS, not the day it opens — B-115, found 2026-09-30."
  ],
  "refusal": "The record does not reach back that far, so the walk is not drawn at all rather than started from a guess.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.",
   "answer": "$30,000"
  }
 },
 "MK-PF-M-014": {
  "label": "Wealth generated",
  "screens": [
   "/account-detail"
  ],
  "answers": "What this one account earned over the window — what is left after the money you put in and took out is accounted for.",
  "formula": "ending − beginning − contributions + withdrawals",
  "inputs": [
   "MK-NW-I-003 the recorded history",
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "MONEY YOU ADDED IS NOT WEALTH YOU GENERATED. That is the whole distinction this figure exists to draw, and it is why a balance going up is not the same as having earned anything.",
   "A DIVIDEND IS INSIDE IT, because it was earned by the holding rather than added by you."
  ],
  "refusal": "No beginning to measure from — the line shows nothing rather than a change.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.",
   "answer": "$10,600"
  }
 },
 "MK-PF-M-015": {
  "label": "one line of the walk",
  "screens": [
   "/account-detail",
   "/invest"
  ],
  "answers": "One step that took this account from its beginning to its ending — money in, money out, or the change in what the holdings are worth.",
  "formula": "each recorded flow over the window, and the remainder as the change in value",
  "inputs": [
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "THE LINES ALWAYS SUM TO THE ENDING, by construction. Whatever the records cannot explain lands in the change-in-value line rather than being silently dropped — a walk that does not add up is worse than no walk."
  ],
  "refusal": "No flows recorded — the line is not drawn.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.",
   "answer": "$6,000"
  }
 },
 "MK-PF-M-016": {
  "label": "Return",
  "screens": [
   "/account-detail",
   "/invest"
  ],
  "answers": "How much this one account grew over the window you picked, with money you added or took out left out. Shown per year when the window is longer than a year.",
  "formula": "split the window at every day money moved in or out; each day’s link = that evening’s value ÷ (the previous evening’s value + money added that day − money taken out that day) — money that moves on a day counts for that whole day (DEC-4439); multiply the pieces and take 1 off — a time-weighted return; a window longer than a year is turned into a yearly rate: (1 + the return)^(365 ÷ days) − 1",
  "inputs": [
   "MK-NW-I-003 the recorded history",
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "TWO DECIMALS AND ITS SIGN, always (Q49): +6.67%, −0.57% — never +6.7%, never a bare 6.67%.",
   "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\"",
   "WHERE IT CANNOT BE MEASURED IT SHOWS NO PERCENT, and never another method in its place.",
   "ONE METHOD WITH THE PORTFOLIO: the same door the Performance tab calls, asked for this one account."
  ],
  "refusal": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or there was nothing to grow from that day (the previous evening plus the money moved is zero or less while the day holds a value). It never shows another kind of figure in its place.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash) and $32,000 on 28 Sep 2026, with nothing paid in or taken out and $825 of it arriving as dividends.",
   "answer": "+6.67%"
  }
 },
 "MK-PF-M-017": {
  "label": "Return",
  "screens": [
   "/invest"
  ],
  "answers": "How much all your investments grew over the window you picked, with money you added or took out left out. Per year when the window is longer than a year.",
  "formula": "over every investment account together: split the window at every day money moved in or out; each day’s link = that evening’s value ÷ (the previous evening’s value + money added that day − money taken out that day) — money that moves on a day counts for that whole day (DEC-4439); multiply the pieces and take 1 off — a time-weighted return; a window longer than a year is turned into a yearly rate: (1 + the return)^(365 ÷ days) − 1",
  "inputs": [
   "MK-NW-I-003 the recorded history",
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "TWO DECIMALS AND ITS SIGN, always (Q49).",
   "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669). Where it cannot be measured it shows no percent, and never another method in its place.",
   "AN ACCOUNT THAT JOINS THE RECORD inside the window counts as money in, at its first recorded value — nothing it was already worth is earned; when money was added to it that day, that money is what arrived and it was worth $0 the evening before (DEC-4439).",
   "THE SAME DOOR AS ONE ACCOUNT’S RETURN (MK-PF-M-016), asked for every account at once — one method, never two."
  ],
  "refusal": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or there was nothing to grow from that day (the previous evening plus the money moved is zero or less while the day holds a value). It never shows another kind of figure in its place.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash) and $32,000 on 28 Sep 2026, with nothing paid in or taken out and $825 of it arriving as dividends.",
   "answer": "+6.67%"
  }
 },
 "MK-PF-M-018": {
  "label": "Beginning market value",
  "screens": [
   "/invest"
  ],
  "answers": "What all your investments were worth on the day the window opens, READ from the daily record.",
  "formula": "the recorded value of every investment account at the close of the day before the window opens",
  "inputs": [
   "MK-NW-I-003 the recorded history"
  ],
  "decisions": [
   "READ, NEVER BACK-SOLVED: with no recorded value the walk says so instead of inventing a start."
  ],
  "refusal": "No recorded value that far back — the walk starts the day the record does, and says so.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.",
   "answer": "$30,000"
  }
 },
 "MK-PF-M-019": {
  "label": "one line of the walk",
  "screens": [
   "/invest"
  ],
  "answers": "One line of how the beginning became the ending, over every account: contributions, withdrawals, dividends, interest, or the change in investment value.",
  "formula": "contributions and withdrawals from the records inside the window; dividends and interest received; change in value = ending − beginning − contributions + withdrawals − dividends − interest",
  "inputs": [
   "MK-NW-I-003 the recorded history",
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "THE LINES ALWAYS ADD UP TO THE ENDING — the change in investment value is what is left, so nothing is lost between the lines."
  ],
  "refusal": "A real $0 — a line with nothing in it still prints, so the structure never changes.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash), $38,400 at the close of 1 Apr — the day $6,000 was paid in — and $46,600 on 28 Sep 2026, with $825 of dividends received.",
   "answer": "$6,000"
  }
 },
 "MK-PF-M-020": {
  "label": "Available cash",
  "screens": [
   "/invest"
  ],
  "answers": "The cash in this account that a buy, a withdrawal or a transfer can use right now.",
  "formula": "the cash sleeve of a brokerage account; the whole balance of a cash account",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "A BUY OR WITHDRAWAL BIGGER THAN THIS IS REFUSED on the sheet, with the words to deposit or transfer cash in first."
  ],
  "refusal": "No account picked — the line is not shown.",
  "worked": {
   "given": "A savings account holding $5,000 and nothing else.",
   "answer": "$5,000"
  }
 },
 "MK-XS-M-001": {
  "label": "Net worth",
  "screens": [
   "/home",
   "/analytics"
  ],
  "answers": "Everything you own, less everything you owe.",
  "formula": "the sum of every account’s value, minus the sum of every debt’s balance",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-002 your debts"
  ],
  "decisions": null,
  "refusal": "Nothing entered yet — it says so and offers the door, rather than showing $0 as a fact.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$261,200"
  }
 },
 "MK-XS-M-003": {
  "label": "YOUR INVESTMENTS",
  "screens": [
   "/home",
   "/analytics"
  ],
  "answers": "What your invested money is worth — stocks, funds, bonds and alternatives.",
  "formula": "the sum of every account whose class is stocks, bonds or alternatives",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "Nothing invested yet.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$175,200"
  }
 },
 "MK-XS-M-004": {
  "label": "▲ up/▼ down $X (Y%) this month · Return · YOUR RETURN",
  "screens": [
   "/invest",
   "/home"
  ],
  "answers": "What your investments earned over the window you picked — dividends and interest included.",
  "formula": "the time-weighted return of every investment account together: the window split at every day money moved in or out, each piece = the value just before the next movement ÷ the value just after the last one, the pieces multiplied, less 1; over a window longer than a year it is shown as a yearly rate",
  "inputs": [
   "MK-XS-I-020 the records of money movements",
   "MK-NW-I-001 your accounts",
   "MK-XS-I-006 the price fetched at"
  ],
  "decisions": [
   "ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are in it, because \"Wealth generated\" beside it counts them.",
   "A RATE NEEDS SOMETHING TO STAND ON: with no beginning read from the record and no movement to point at, it shows nothing rather than a confident +0.00%.",
   "IT IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\" Where a piece cannot be measured it shows nothing, and never another method.",
   "OVER A YEAR IT IS A YEARLY RATE and the screen says so (his ruling, 2026-08-18, restated 2026-09-25)."
  ],
  "refusal": "Nothing is shown, and the walk beneath says in words why — either the record cannot reach the beginning, or money moved on a day with no recorded value.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash) and $32,000 on 28 Sep 2026, with nothing paid in or taken out and $825 of it arriving as dividends.",
   "answer": "6.67%"
  }
 }
}
```

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

## The app's own types the cards name

```ts
export interface CapGains { longGain: number | null; shortGain: number | null; totalGain: number | null; }

export interface CategoryEarned {
  key: string;
  label: string;
  /** Dividends and interest actually RECEIVED in the window, from the records only. */
  earned: number;
  /** That class’s return over the window, each holding weighed by what it was worth when the window began — null where it cannot be calculated. */
  ret: number | null;
  /** True where `ret` is a STATED yearly rate (a bond or CD's own coupon), printed with "/year" —
   *  Performance v17: "a /year figure is that category's yearly pace". */
  yearly: boolean;
}

export interface DatedAmount { date: string; accountId: string; amount: number }

export type GainRow = {
  name?: string;
  cappedSince?: string | null;
  gain?: number;
  periodReturn?: number | null;
  marketValue?: number;
  couponRate?: number | null;
  position?: { ticker?: string; label?: string; name?: string; kind?: string; multiplier?: number; last_price?: number; value_now?: number; lots?: { shares?: number }[] };
  /** The window's own total, never a yearly rate — buildPerformance writes it beside periodReturn. Where it is
   *  absent and the window is longer than a year, periodReturn is read as a yearly rate (outside review Claude
   *  Performance, 2026-10-11, MK-NW-F-091). */
  periodTotal?: number | null;
};

export interface LookBackResult {
  stayed: LookBackLeg;      // left where it was
  moved: LookBackLeg;       // moved to the other holding
  difference: number;       // moved.endValue − stayed.endValue (signed: negative = the move would have LOST)
  months: number;
}

export interface PerformanceRow {
  position: Position;
  price: number | null;
  marketValue: number | null;     // null: worth something unknown — shares with no price (tenet 3)
  costBasis: number | null;       // null: a share count or a cost not entered
  gain: number | null;
  totalROI: number | null;        // since purchase
  periodReturn: number | null;    // YOUR return over the window (capped at purchase — see cappedSince); a yearly rate over 2Y
  /** The window's OWN total — never a yearly rate. Equal to periodReturn except over 2Y. Read this to add
   *  holdings up or to work a dollar gain (outside review Claude Performance, 2026-10-11). */
  periodTotal?: number | null;
  benchTicker: string | null;     // null: nothing says what the holding is, so no yardstick (DEC-2160)
  benchReturn: number | null;     // benchmark over the SAME dates — honest comparison
  /** The yardstick's own total over the window, never a yearly rate. */
  benchTotal?: number | null;
  beatBy: number | null;          // periodReturn − benchReturn
  cappedSince: string | null;     // 'YYYY-MM-DD' when the window starts at YOUR purchase, else null
}

export type Period = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '2Y';

export interface Position {
  position_id: EntityId;
  ticker: string;               // e.g. 'AAPL', 'SPY', 'VTI'
  label?: string;               // display name, e.g. 'Apple Inc.'
  kind?: string;                // ASSET_KINDS id, for benchmark mapping
  asset_class?: 'stock_etf' | 'bond' | 'other' | 'cash';   // explicit class (import/sync sets it; wins over kind); 'cash' = money-market funds a broker didn't flag (live-verified 2026-07-19)
  class_source?: 'user';        // B7: the person set the class themselves — it survives every sync
  // HIS RULING, 2026-09-30 (master Q12): "user entry stays even if it is not in the import file. If user
  // modify cost or quantity post import/linked from institution, cost basis should not be overwritten in
  // future sync as quantity, price and market value can change with time but not cost."
  cost_source?: 'user';         // the person set this holding's cost: a sync keeps their cost per share
  added_by?: 'user';            // the person added this holding to a linked account: a sync keeps it
  // HIS RULING, 2026-09-30 (master Q11): when nothing says what a holding is — "Refuse the line and ask".
  class_asked?: true;           // nothing said what this is: it is in no class until the person says
  class_flag?: { was: string; evidenceSays: string };   // B7: a sync wanted to move the class; kept + flagged instead
  last_price?: number;          // broker's daily mark (connected accounts — no live feed needed)
  value_now?: number;           // a hand-built holding's value at the price its account balance was last built from (2026-10-07)
  multiplier?: number;          // Q06 (founder, 2026-08-26): an option contract is 100 shares unless the broker or the person states otherwise
  unit?: QuantityUnit;          // Q09 (founder, 2026-08-26): a quantity is never shown without its unit
  lots: Lot[];
}

export interface PriceSeries { ticker: string; points: { date: string; close: number }[]; }

export type QuantityUnit = 'shares' | 'coins' | 'contracts' | 'ounces' | 'units';

export interface RealizedResult {
  realizedAllTime: number;      // Σ (proceeds − basis) over the shares WITH a recorded purchase
  realizedThisYear: number;     // same, sale-dated in the current calendar year
  sellsCounted: number;         // sales with a gain counted — wholly or partly matched to recorded purchases
  sellsWithoutBasis: number;    // sales with NO recorded purchase behind any of their shares
  /** Every sale with shares that have no recorded purchase, partly or wholly — each counted once (DEC-4643). */
  shortOfPurchases: SaleShortOfPurchases[];
}

export interface SaleShortOfPurchases {
  date: string;
  sold: number;                 // shares (or contracts, coins…) the sale took
  matched: number;              // of those, how many a recorded purchase covers
  gain: number | null;          // the gain on the matched part; null when nothing was matched
}

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
  /** Days on which a deposit, withdrawal or transfer on a measured account has no amount on record — the
   *  money moved, how much is unknown, so the return refuses there (outside review Claude Performance,
   *  2026-10-11, DEC-3523 tenet 3: unknown is not zero). */
  amountMissing?: string[];
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
  /** NOTHING_TO_GROW_FROM only: true where more money was taken out that day than the previous evening's
   *  value plus the money added; absent where a value appeared with nothing there and no money added —
   *  so the sentence can say which (outside review Claude Performance, 2026-10-11; DEC-4439). */
  moreTakenOutThanThere?: boolean;
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
