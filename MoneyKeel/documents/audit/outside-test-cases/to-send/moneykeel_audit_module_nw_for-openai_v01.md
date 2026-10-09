Written for: OpenAI, as the outside judge of the whole Net worth module, once, at the end. You have not seen any earlier review of it and none is given here: judge it as if for the first time.

# What this is

The last independent test of the Net worth module before the owner builds it. 101 functions, every one as it is in the app today; the rules the owner has decided for them; every figure its screens print; and the tenets every figure must meet. Six earlier batches were each judged by an outside model and corrected. This check is to find what is still wrong, still unsaid, or still not true to the tenets — anywhere in the module.

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
  "batch": "nw module final — part N",
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

# The rules decided in the outside reviews — 67, each in force

From the owner's decision log. Job 3 checks each one.

- **DEC-1558** (2026-10-04) — On the Bonds screen a person’s bonds are listed soonest-maturing first.  
  Governs: MoneyKeel/functions/networth-and-performance/bonds.ts (MK-NW-O-001 theBonds) · src/screens/BondsScreen.tsx · src/screens/__tests__/kept_editors_match.test.tsx
- **DEC-1559** (2026-10-04) — On a holding’s page, when nothing has been sold, the Realized from sales row reads "$0 — nothing sold".  
  Governs: src/screens/HoldingDetailScreen.tsx · MK-NW-M-035 · src/screens/__tests__/holding_detail_fcc.test.tsx · src/screens/__tests__/kept_editors_match.test.tsx
- **DEC-1668** (2026-10-04) — The emergency fund counts rent from a property. Rent keeps arriving when pay stops, so each month it is added to the cash: months = cash ÷ (a month of essentials − the rent).  
  Governs: MK-NW-M-013 EMERGENCY FUND — X.X months · MK-NW-M-046 at your planned spend · MK-NW-M-064 rent from your property, which keeps arriving · MK-MN-M-020 · MK-MN-M-025 · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-O-004 theEmergencyFund) · MoneyKeel/functions/cashflow/income-summary.ts (MK-CF-O-004 incomeSummary, lands.rentMonthly) · src/screens/NetWorthScreen.tsx · src/screens/StressTestScreen.tsx · src/screens/JobSafetyScreen.tsx · src/screens/InsightsScreen.tsx
- **DEC-1925** (2026-10-04) — Every property, mortgage and debt has a name the person gives it. Each mortgage is matched to a property in Net worth. A property can have no mortgage; a mortgage cannot be without a property. So there are never more mortgages than properties: three properties, three mortgages or fewer.  
  Governs: src/screens/AddAccountScreen.tsx · src/components/DebtEditorSheet.tsx · src/screens/NetWorthScreen.tsx · src/domain/debt/index.ts · src/domain/assets/index.ts · MK-NW-M-010 · MK-NW-M-047 debt payments you cannot stop
- **DEC-1926** (2026-10-04) — A property is a second or vacation home unless rental income is entered for it on the Income screen. With rental income entered, it is a rental.  
  Governs: src/domain/assets/index.ts (realEstateUseOf) · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-O-004 theEmergencyFund) · src/screens/IncomeManagerScreen.tsx (Rent from a property) · MK-NW-M-064 rent from your property, which keeps arriving
- **DEC-2334** (2026-10-06) — Private equity and hedge funds are not offered anywhere in this phase. The kinds offered are crypto, gold and commodities, annuities and other. A row saved with one of the two kinds earlier is kept as it is.  
  Governs: src/screens/AddAccountScreen.tsx (the Alternatives kinds) · src/screens/OtherInvestmentsScreen.tsx (the first-day sentence) · src/domain/alternatives/index.ts (ALT_KINDS_CAPTURE) · MK-NW-M-049 · the drawings add-account-by-hand_v02 (phone 3) and alternatives_v02 (phone 2)
- **DEC-2440** (2026-10-07) — The first batch of the outside review of Net worth is closed. Everything corrected in it stands: every return time-weighted, rent counted in the emergency fund, every debt counted from Debts, a mortgage on a named property, and the smaller fixes to bonds, holdings and the account page.  
  Governs: MK-NW-O-001 · MK-NW-O-002 · MK-NW-O-003 · MK-NW-O-004 · MK-NW-O-005 · MK-NW-O-006 · MK-NW-F-106 · MK-NW-F-107 · MK-CF-O-020 · MK-NW-M-002 · MK-NW-M-013 · MK-NW-M-036 · MK-NW-M-044 · MK-NW-M-064 · MK-PF-M-016
- **DEC-2441** (2026-10-06) — He read three lists for the second batch — eleven errors fixed, six places where the app was kept against the reviewer, four agreed points not yet built — and approved them all, with one change made alongside: private equity and hedge funds are not offered in this phase (DEC-2334).  
  Governs: MK-NW-F-003 valueFreshness · MK-NW-F-005 accountAllowsTicker · MK-NW-F-010 wrapperAccount · MK-NW-F-011 assetClassOf · MK-NW-F-012 taxTreatmentOf · MK-NW-F-016 cashTotal · MK-NW-F-017 equitiesTotal · MK-NW-F-018 fixedIncomeTotal · MK-NW-F-019 alternativesTotal · MK-NW-F-020 realEstateTotal · MK-NW-F-021 investmentsTotal · MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames · MK-NW-F-027 accountClassBreakdown · MK-NW-F-028 classPortionLabel · MK-NW-F-108 taxWordsOf · MK-NW-F-109 holdingClassOf · MK-NW-O-008 thePerformance · MK-NW-O-003 theNetWorth · MK-NW-M-005 · MK-NW-M-007 · MK-NW-M-008 · MK-NW-M-014 · MK-PF-M-001
- **DEC-2484b** (2026-10-07) — The average yield of the bonds counts only bonds that have a value today, on that value as entered (refined 2026-10-09 by DEC-3390: it was the value less accrued interest). Before: an unpriced bond added its interest to the top and nothing to the bottom — three bonds read 6.09% where 4.22% is right.  
  Governs: MK-NW-F-061 bondSummary
- **DEC-2484c** (2026-10-07) — The if-rates-move estimate on a bond is rounded in proportion to the bond’s size, not always to the nearest $1,000. Before: a $10,000 bond read $10,000 to $10,000 whichever way rates moved.  
  Governs: MK-NW-F-064 bondRateSensitivity
- **DEC-2484d** (2026-10-07) — A sale of shares takes the oldest purchase first. Before: the gain on a sale was worked from an average cost.  
  Governs: MK-PF-F-006 capGains
- **DEC-2484e** (2026-10-07) — A hand-built investment account shows its own uninvested cash inside it. Before: the cash it recorded was missing from the account’s own breakdown.  
  Governs: MK-NW-O-002 theAccount
- **DEC-2484f** (2026-10-07) — A typed value is called old after six whole months have passed, counted to the day. Before: it counted month names crossed, so 30 April read six months old on 1 October.  
  Governs: MK-NW-F-003 valueFreshness
- **DEC-2484g** (2026-10-07) — Any account that already lists holdings can take a recorded buy or sale. Before: a fixed-income brokerage holding bond funds could not be chosen.  
  Governs: MK-NW-F-005 accountAllowsTicker
- **DEC-2484h** (2026-10-07) — A Roth 401(k) is its own choice when adding an account: a 401(k) in the Roth tax bucket. Before: the form had no Roth 401(k).  
  Governs: MK-NW-F-010 wrapperAccount
- **DEC-2484i** (2026-10-07) — A maturity date makes an account Bonds & CDs before its name is read; property that is not a house is personal property. Before: a CD named ‘savings’ read as cash, and a ring could be filed as real estate.  
  Governs: MK-NW-F-011 assetClassOf
- **DEC-2484j** (2026-10-07) — A 529 is tax-free for education and an HSA is pre-tax but tax-free for medical costs, and their pages say so. Before: a 529 read ‘taxable’ and an HSA read ‘taxed when it comes out’.  
  Governs: MK-NW-F-012 taxTreatmentOf · MK-NW-F-108 taxWordsOf
- **DEC-2484k** (2026-10-07) — Cash a hand-built account records for itself is on the Cash line; a holding with no price is never counted as cash. Before: that cash was in no Cash line, and an unpriced holding’s value could fall into cash.  
  Governs: MK-NW-F-016 cashTotal · MK-NW-F-027 accountClassBreakdown
- **DEC-2484l** (2026-10-07) — Investments is one function, and Cash + Investments always equals Cash and investments together. Before: the Investments line was added up in more than one place.  
  Governs: MK-NW-F-021 investmentsTotal
- **DEC-2484m** (2026-10-07) — No two accounts show the same name: alike names are numbered · 1, · 2 in the order the accounts were made. Before: two accounts could read the same.  
  Governs: MK-NW-F-026 accountDisplayNames
- **DEC-2484n** (2026-10-07) — A holding nobody has classed is Unclassified everywhere, and the words under an account count holdings by that same test. Before: Net worth said Unclassified and the account page said Stocks / Funds.  
  Governs: MK-NW-F-109 holdingClassOf · MK-NW-F-028 classPortionLabel
- **DEC-2484o** (2026-10-07) — The return on the retirement money weighs each account by the money set aside for retirement. Kept as built; the reviewer wanted a different weighting (held).  
  Governs: MK-NW-F-004 portfolioActualReturn
- **DEC-2484q** (2026-10-07) — A money-market fund a broker flags is kept as a holding, not dropped. Before: such funds vanished at sync.  
  Governs: MK-XS-F-102 ingestSync
- **DEC-2484r** (2026-10-07) — The person’s own answer about a holding’s class outranks what its name suggests. Before: the name won.  
  Governs: MK-NW-F-109 holdingClassOf
- **DEC-2746b** (2026-10-07) — Only a vehicle can be the car you drive. Before: a jewellery collection worth more than the car was taken as the car.  
  Governs: MK-NW-F-031 primaryCarIdOf
- **DEC-2746c** (2026-10-07) — The rate the retirement money grows at, and its spread, are blended over exactly the money set aside, with no figure when nothing is set aside. Before: an invented 6% and 12% stood in.  
  Governs: MK-NW-F-037 blendedReturn · MK-NW-F-035 blendedVolatility
- **DEC-2746d** (2026-10-07) — With nothing owned there is no average return. Before: it said 7%.  
  Governs: MK-NW-F-039 buildAssetsState
- **DEC-2746e** (2026-10-07) — Monthly contributions: the 401(k) answer is held at the yearly legal limit for the age reached this year; property savings do not count; nothing answered gives no figure. Before: no limit, property savings counted, and $0 for nothing answered.  
  Governs: MK-NW-F-041 monthlyContributionsFromOnboarding
- **DEC-2746f** (2026-10-07) — History shared is counted in months and never rounded up to a year. Before: eighteen months read ‘2 years’.  
  Governs: MK-NW-F-046 historyCoverage
- **DEC-2746g** (2026-10-07) — Itemising never lowers an account’s total; whatever is not itemised stays as cash. Before: a part-itemised $186,442 could fall to $148,001.  
  Governs: MK-NW-F-051 itemizedResultTotal
- **DEC-2746h** (2026-10-07) — Accounts made by itemising carry the original’s retirement share, source and wrapper; a bond’s face value is entered or left blank. Before: itemising moved money out of the nest egg and gave bonds an invented face value.  
  Governs: MK-NW-F-052 buildItemizedAccounts
- **DEC-2747c** (2026-10-07) — With nothing held there is no growth figure for alternatives. Before: it showed $0 growth.  
  Governs: MK-NW-F-002 alternativesSummary
- **DEC-2747d** (2026-10-07) — A money-market settlement fund is a fund, and a bond word inside a company name is not a bond. Before: a settlement fund read as cash; Treasury Wine Estates read as a bond.  
  Governs: MK-NW-F-008 incomeBearingClassOf
- **DEC-2747e** (2026-10-07) — With two or more properties and no use stated, the one entered first is the home; the others count toward retirement. Before: every such property was the home, so a second property fell out of the retirement money.  
  Governs: MK-NW-F-110 primaryHomeIdOf · MK-NW-F-013 realEstateUseOf · MK-NW-F-030 earmarkDefault
- **DEC-2747f** (2026-10-07) — The asset total does not get a count of accounts with no value (his answer: no). Not built.  
  Governs: MK-NW-F-015 totalAssets
- **DEC-2748b** (2026-10-07) — A bond’s face value or rate that was never entered stays blank — never $0 — and the screens say ‘not entered’. Before: a CD typed by its balance showed a yield to maturity of −274%.  
  Governs: MK-NW-F-056 bondInfo · MK-NW-M-055
- **DEC-2748c** (2026-10-07) — A year’s interest from a bond or CD has one rule everywhere: face × rate; with no face, value × rate; with no rate, $0 and said so. Before: the Bonds screen counted a CD at $0 while the income figure counted balance × rate.  
  Governs: MK-NW-F-112 yearlyInterest · MK-NW-F-062 couponIncomeAnnual · MK-NW-F-063 interestIncomeAnnual
- **DEC-2748d** (2026-10-07) — A bond or CD past its maturity date pays no more interest. Before: it kept counting a year’s coupon.  
  Governs: MK-NW-F-063 interestIncomeAnnual
- **DEC-2748f** (2026-10-07) — The if-rates-move estimate measures the change between two prices worked the same way, and a CD gets no estimate. Before: a 4.4-year Treasury read down about $1,000 where about $1,700 is right; only the screen hid a CD’s figure.  
  Governs: MK-NW-F-064 bondRateSensitivity
- **DEC-2748g** (2026-10-07) — Years to maturity count calendar days, not the time of day. Before: the hour shaved part of a day off (one example moved from 5.66% to 5.65%).  
  Governs: MK-NW-F-058 yearsToMaturity
- **DEC-2748h** (2026-10-07) — The sweep that corrects classes never changes an account the person confirmed. Before: it could overwrite a confirmed class.  
  Governs: MK-NW-F-054 reclassifyAccounts
- **DEC-2748i** (2026-10-07) — A saved record whose accounts were all deleted shows the first-day screen, not $0 owned. Before: it showed $0 with a 7% average return.  
  Governs: MK-NW-F-111 assetsStateFrom · MK-NW-F-044 getAssetsState
- **DEC-3035b** (2026-10-07) — The retirement money’s twelve-month return weighs each account by what was set aside when the year began: Σ now ÷ Σ start − 1. Before: weighed by today’s amounts, 13.72% where 12.98% is right.  
  Governs: MK-NW-F-004 portfolioActualReturn
- **DEC-3035c** (2026-10-07) — A 529’s and an HSA’s tax words are fixed by what they are; ‘(Roth)’ appears only for an account in the Roth bucket. Before: a 529 stated tax-free read ‘tax-free (Roth)’.  
  Governs: MK-NW-F-108 taxWordsOf
- **DEC-3035d** (2026-10-07) — A hand-built account is split holding by holding, so a T-bill inside it is Bonds & CDs. Before: everything but its cash was filed under the account’s own class.  
  Governs: MK-NW-F-027 accountClassBreakdown
- **DEC-3035e** (2026-10-07) — A Roth 401(k) reads Roth 401(k), and a tax-advantaged account with no kind and known digits shows its tax word. Before: ‘Fidelity 401(k)’ for both a Roth and a pre-tax 401(k); ‘Vanguard -1234’ for a Roth.  
  Governs: MK-NW-F-025 accountDisplayName
- **DEC-3035f** (2026-10-07) — A holding with nothing stored — no tag, no kind, nothing in its name — is Unclassified, never Stocks / Funds by default. Before: it was filed as Stocks / Funds (against DEC-2160).  
  Governs: MK-NW-F-109 holdingClassOf
- **DEC-3035g** (2026-10-07) — Broker Treasury wording (TREAS, UST, T-bond) counts as a Treasury in the words under an account, and more than one reads Treasuries. Before: a broker’s T-bill read ‘1 bond’.  
  Governs: MK-NW-F-028 classPortionLabel
- **DEC-3035h** (2026-10-07) — A value dated by its month alone is shown as the 1st of that month. Before: the stored text was handed back unchanged.  
  Governs: MK-NW-F-003 valueFreshness
- **DEC-3035i** (2026-10-07) — Performance draws no walk for a window its record exists but cannot reach; a sentence names the record’s first day. Before: the beginning was worked back from today and wealth generated shown as if measured.  
  Governs: MK-NW-O-008 thePerformance
- **DEC-3035j** (2026-10-07) — A rate the person set themselves is labelled an estimate. Before: it took the record’s flag.  
  Governs: MK-NW-F-036 benchmarkInfo
- **DEC-3035k** (2026-10-07) — An employer’s percent match is taken on the 401(k) figure after the yearly limit. Before: on the figure as typed — $1,600 where $1,490 is right.  
  Governs: MK-NW-F-041 monthlyContributionsFromOnboarding
- **DEC-3035l** (2026-10-07) — History shared is rounded down and its sentence built from whole months only. Before: one day short of a year read ‘1 year’.  
  Governs: MK-NW-F-046 historyCoverage
- **DEC-3035m** (2026-10-07) — Accounts made by itemising carry the typical rate for their class, never 0%, and a bond rate not entered stays blank. Before: every itemised account had a 0% rate.  
  Governs: MK-NW-F-052 buildItemizedAccounts
- **DEC-3035n** (2026-10-07) — The Other investments summary reads the class split, so its total is the Alternatives line’s dollars and each part is rated by what it is. Before: whole accounts only — $18,641 where the Alternatives line read $23,031.  
  Governs: MK-NW-F-002 alternativesSummary
- **DEC-3035o** (2026-10-07) — A property’s name is not read as evidence of its class; a fund that writes options is a fund. Before: ‘Silver Lake house’ read as an alternative and a covered-call ETF as options.  
  Governs: MK-NW-F-011 assetClassOf · MK-ST-F-010 nameEvidence
- **DEC-3035p** (2026-10-07) — What a property is for has one reading for every function; handed the rent entries, a property is a rental only when an entry names it, and a household with no home is told so. Before: three functions read it three ways; a rented-out house marked home counted as the home.  
  Governs: MK-NW-F-117 propertyUseMap · MK-NW-F-107 propertyUses · MK-NW-F-110 primaryHomeIdOf · MK-NW-F-013 realEstateUseOf · MK-NW-F-030 earmarkDefault
- **DEC-3146** (2026-10-07) — Under each class heading, every account that holds money in that class is listed by its name with only its part in that class (for example Vanguard -0008 $45,000, Chase -0333 $34,000), so the rows under a heading add up to the heading. It replaces the batch 4 rule that listed a split account once, under its largest class, at its whole balance.  
  Governs: MK-NW-F-094 ledgerGroups · MK-NW-M-007 · MK-NW-M-008 · src/screens/NetWorthScreen.tsx
- **DEC-3279b** (2026-10-08) — Years to maturity are exact, by anniversaries: one year to the day is exactly 1. Before: days ÷ 365.25 (0.9993 for one year).  
  Governs: MK-NW-F-058 yearsToMaturity
- **DEC-3279c** (2026-10-08) — A bond is priced at exact times, its yearly coupon on each maturity anniversary; a matured bond or one with no date has no price. Before: years rounded to a whole number, at least 1, so a matured bond still paid.  
  Governs: MK-NW-F-069 priceAtYield
- **DEC-3279e** (2026-10-08) — A missing balance is never $0: it is left out of the total and the amber box names the account. Before: a linked account that failed to sync added 0 and the total looked complete.  
  Governs: MK-NW-F-066 sumWhere · MK-NW-F-022 investableAssets · MK-XS-F-002 dataGaps
- **DEC-3279f** (2026-10-08) — Itemised sums are exact decimals, a holding with no value is left out, and the remainder is then not final. Before: a missing value was 0 and the remainder looked complete; sums could leave a fraction of a cent.  
  Governs: MK-NW-F-049 itemizedTotal · MK-NW-F-050 itemizeRemainder · MK-NW-F-073 itemising · MK-NW-F-118 itemizeMissingCount
- **DEC-3279g** (2026-10-08) — A kind that names contents — crypto, private equity, hedge funds, other — claims no Brokerage wrapper unless the person confirmed one. Before: ‘Coinbase Brokerage’ for a crypto wallet.  
  Governs: MK-NW-F-023 wrapperWord · MK-NW-F-025 accountDisplayName
- **DEC-3279h** (2026-10-08) — CDs, certificates of deposit and share certificates are recognised as CDs; ABCD Growth Fund is not. Before: ‘No-Penalty CDs’ was not a CD.  
  Governs: MK-NW-F-071 isCertificateOfDeposit
- **DEC-3279i** (2026-10-08) — The accrued-interest note shows only for a bond that pays interest and has no accrued figure entered. Before: a zero-coupon bond got the note.  
  Governs: MK-NW-F-070 accruedInterestCaveat
- **DEC-3279j** (2026-10-08) — Dates are read as calendar dates, never shifted by a time zone; an empty date shows nothing. Before: a midnight-UTC date could show the day before in Pacific time.  
  Governs: MK-NW-F-068 prettyDay
- **DEC-3390** (2026-10-09) — The value typed for a bond is what the statement shows, which leaves out the interest earned since the last coupon. For the yield to maturity, that interest is added: the figure entered, or an estimate from the coupon schedule, and then the screen reads: "Added estimated $1,119 in accrued interest to bond value at 4.5% coupon for 363 days to calculate YTM. If this is not accurate, enter actual accrued interest". The yield on today's value is on the value as entered. A $25,000 4.5% Treasury worth $24,200 two days before its coupon now reads 5.69%, not 7.44%.  
  Governs: MK-NW-F-059 currentYield · MK-NW-F-060 approxYTM · MK-NW-F-061 bondSummary · MK-NW-F-064 bondRateSensitivity · MK-NW-F-070 accruedInterestCaveat · estimatedAccrued · MK-NW-O-001 theBonds · MK-NW-M-057 · MK-NW-M-058 · MK-NW-M-027

# The screen register — 71 figures on /analytics, /networth, /account-detail, /bonds, /other-investments, /itemize, /holding-detail, /add-account

What each figure on the Net worth screens is, how it is worked, and what it says when it cannot be. Job 4 checks each.

```json
{
 "MK-NW-M-001": {
  "label": "Change in net worth +$X",
  "screens": [
   "/networth"
  ],
  "answers": "How much your net worth has moved since the day the line starts.",
  "formula": "the last point on the trend line less its first point",
  "inputs": [
   "MK-XS-I-031 the recorded history"
  ],
  "decisions": [
   "IT IS READ FROM THE RECORD, never back-solved: the months we actually saved and the daily points after them.",
   "A month and its own days live in one series, sorted by their date text — \"2026-04\" sorts before \"2026-04-30\", which is what makes plain text sorting safe."
  ],
  "refusal": "A line needs at least two points; with one, the point is shown and no change is stated.",
  "worked": {
   "given": "Net worth recorded at the end of each month — $240,000 in January, $246,000 in February, $252,000 in March, $258,000 in April — and one daily point of $261,200 on 30 April.",
   "answer": "$21,200"
  }
 },
 "MK-NW-M-002": {
  "label": "Return on cash + investments",
  "screens": [
   "/analytics"
  ],
  "answers": "How much your cash and investments have grown since the day you are comparing against, with money you added or took out left out.",
  "formula": "a time-weighted return over your cash and investment accounts: split the period at every day money moved in or out; each piece = the value just before the next movement ÷ the value just after the last one; multiply the pieces and take 1 off. Cash earns only interest, so any other change in a cash balance is money moving, not a gain",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-003 the recorded history",
   "MK-NW-I-004 the activity records"
  ],
  "decisions": [
   "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\" It was a change in balance, so money paid in read as money earned.",
   "THE DAY COMPARED FROM MUST BE ON RECORD. A comparison from before the record begins gives no figure — never one quietly measured from a later day.",
   "CASH EARNS ONLY INTEREST. A paycheck arriving or a bill being paid is money moving, counted on the day the record first shows it."
  ],
  "refusal": "No figure: the record does not reach back to the day compared from, or money moved on a day with no recorded value.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "7.33%"
  }
 },
 "MK-NW-M-003": {
  "label": "the trend line",
  "screens": [
   "/networth"
  ],
  "answers": "How many points the line is drawn from — the months on record plus the days after them.",
  "formula": "every recorded month, plus every daily point, merged and sorted by date text",
  "inputs": [
   "MK-XS-I-031 the recorded history"
  ],
  "decisions": [
   "A DAY THAT IS NOT A REAL DATE IS DROPPED, and a month whose figures do not add up is dropped — never drawn as a guess.",
   "The line is drawn only from days we hold a record for; today’s balances are never priced at past dates."
  ],
  "refusal": "With one point the point is shown and the line is not drawn.",
  "worked": {
   "given": "Net worth recorded at the end of each month — $240,000 in January, $246,000 in February, $252,000 in March, $258,000 in April — and one daily point of $261,200 on 30 April.",
   "answer": "5"
  }
 },
 "MK-NW-M-004": {
  "label": "WHAT YOU OWN",
  "screens": [
   "/analytics"
  ],
  "answers": "Everything you own, added up.",
  "formula": "the sum of every account’s value",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "Nothing entered yet.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$503,200"
  }
 },
 "MK-NW-M-005": {
  "label": "CASH",
  "screens": [
   "/analytics",
   "/insights"
  ],
  "answers": "The money you could spend today.",
  "formula": "the sum of every account whose class is cash",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "A CD and a money-market fund are NOT cash: they are bonds and funds, because they pay interest and dividends that must be measured (founder, 2026-08-04)."
  ],
  "refusal": "No cash account entered.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$18,000"
  }
 },
 "MK-NW-M-006": {
  "label": "🏠 PERSONAL PROPERTY",
  "screens": [
   "/networth"
  ],
  "answers": "What one band under WHAT YOU OWN holds — here the vehicles and valuables.",
  "formula": "the balances of every account in that band, added up — for this band, every account whose class is personal property: vehicles and valuables. Real estate is its own band.",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "REAL ESTATE IS ITS OWN BAND: a house is not a vehicle, and mixing them hides both.",
   "THE SAME ACCOUNTS GROUP TWO WAYS — by class and by institution — and both ways add to the same total, so switching the view can never change what you own.",
   "An account with no institution recorded groups under \"No institution set\" rather than being dropped."
  ],
  "refusal": "The band shows $0 and, on a fresh account, the one line \"Nothing entered yet. Add your accounts ›\".",
  "worked": {
   "given": "The five accounts above plus a $21,000 car: $18,000 checking, $142,000 brokerage, a $24,200 Treasury at Fidelity, a $310,000 rental with no institution recorded, $9,000 of gold in a vault and the car.",
   "answer": "$21,000"
  }
 },
 "MK-NW-M-007": {
  "label": "class rows — by class, institution or type",
  "screens": [
   "/analytics"
  ],
  "answers": "What each kind of thing you own is worth.",
  "formula": "each account’s value booked to its class, added up by class",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "A class with nothing in it keeps its heading and says so.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$142,000"
  }
 },
 "MK-NW-M-008": {
  "label": "each account and its balance",
  "screens": [
   "/networth"
  ],
  "answers": "One line per account inside a band, with what that account holds.",
  "formula": "the account’s own balance, listed under the band it belongs to",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-003 institution name"
  ],
  "decisions": [
   "UNDER AN INSTITUTION’S NAME, the class mix inside it is named too — a Fidelity holding a fund and a Treasury reads as a roll-up, not a flat lump.",
   "The mix is ordered biggest first, so the largest thing inside an institution is the first thing read."
  ],
  "refusal": "$0, and on a fresh account the one line \"Nothing entered yet. Add your accounts ›\". A real entered zero shows a plain $0 with no line.",
  "worked": {
   "given": "The five accounts above plus a $21,000 car: $18,000 checking, $142,000 brokerage, a $24,200 Treasury at Fidelity, a $310,000 rental with no institution recorded, $9,000 of gold in a vault and the car.",
   "answer": "$166,200"
  }
 },
 "MK-NW-M-009": {
  "label": "DEBTS",
  "screens": [
   "/analytics"
  ],
  "answers": "Everything you owe.",
  "formula": "the sum of every debt’s remaining balance",
  "inputs": [
   "MK-NW-I-002 your debts"
  ],
  "decisions": null,
  "refusal": "No debts entered.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$242,000"
  }
 },
 "MK-NW-M-010": {
  "label": "each debt and what is left on it",
  "screens": [
   "/analytics"
  ],
  "answers": "One line per debt, and what is still owed on it.",
  "formula": "the remaining balance you entered, lowered by each payment logged",
  "inputs": [
   "MK-NW-I-002 your debts"
  ],
  "decisions": null,
  "refusal": "None entered.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$228,000"
  }
 },
 "MK-NW-M-011": {
  "label": "minimum monthly payment on a debt",
  "screens": [
   "/analytics"
  ],
  "answers": "What this debt requires of you each month.",
  "formula": "the LARGER of the minimum you entered and any monthly payment you set — a debt due in full has no monthly payment at all",
  "inputs": [
   "MK-NW-I-002 your debts"
  ],
  "decisions": [
   "FOUNDER RULING G19 (2026-09-08): one payment rule, the larger of the stated minimum and the payment set — the same words in both formula columns."
  ],
  "refusal": "No minimum entered.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$2,400/month"
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
   "/jobsafety"
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
 "MK-NW-M-014": {
  "label": "of essentials covered by your cash — $X cash ÷ $Y/month essentials",
  "screens": [
   "/analytics"
  ],
  "answers": "The sum written out, so the months figure can be checked by eye.",
  "formula": "your cash, and what a month of essentials costs",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": null,
  "refusal": "Nothing logged and no plan set.",
  "worked": {
   "given": "$18,000 in checking, and a home. A $2,400/month mortgage on it, entered both as the Rent / Mortgage budget line and as a Mortgage debt — the same $2,400. It is counted once, from Debts; the budget line stands down. Plus $700 groceries (an essential) and $400 eating out (not). Also a car loan at $250/month and a Visa at $120/month. Nothing logged yet.",
   "answer": "$18,000 cash ÷ $3,470/month essentials"
  }
 },
 "MK-NW-M-015": {
  "label": "YOUR RETIREMENT PLAN — on track for $X by age Y",
  "screens": [
   "/networth"
  ],
  "answers": "What your pot is on course to be worth at the age you said you would retire.",
  "formula": "today’s cash and investments grown at your expected return for the years until you retire, plus each year’s saving grown for the years it has left",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-PL-I-001 your plan answers"
  ],
  "decisions": [
   "NO RANDOM RUNS ANYWHERE IN THIS ONE — it is the straight-line check that sits beside the 1,000-run odds, and the two answer different questions.",
   "The recommended pot is 25× the yearly expenses NOT covered by guaranteed income, counted from the start of the retirement year — which is why it differs from an outside calculator (his ruling).",
   "Guaranteed income starts at the age it was said to start, not at the retirement age."
  ],
  "refusal": "No figure when there is nothing to grow, or when retirement is not ahead of the person.",
  "worked": {
   "given": "A 50-year-old with $184,200 of cash and investments, saving $24,000/year, retiring at 65 and planning to 92, expecting 6% a year with 2.5% inflation, with expenses of $5,500/month in retirement and $2,400/month of guaranteed income from 67.",
   "answer": "$1,000,069"
  }
 },
 "MK-NW-M-016": {
  "label": "Net worth so far (setup)",
  "screens": [
   "/networth"
  ],
  "answers": "What you are worth as the setup answers stand, before anything else is entered.",
  "formula": "everything owned less everything owed",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-014 what you owe"
  ],
  "decisions": [
   "IT IS COMPUTED EACH TIME AND NEVER STORED as a third number that could disagree with its own two halves (his ruling).",
   "A GENUINE NEGATIVE IS SHOWN, never floored at zero — someone early in a mortgage really does owe more than they own."
  ],
  "refusal": "Adds to $0 when there is nothing to add. Zero and \"nothing recorded yet\" read alike on screen — worth a decision.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$261,200"
  }
 },
 "MK-NW-M-017": {
  "label": "Assets $X − Debts $Y = Net worth $Z",
  "screens": [
   "/analytics"
  ],
  "answers": "The whole sum in one line, so it can be checked by eye.",
  "formula": "assets, debts, and assets minus debts",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-002 your debts"
  ],
  "decisions": null,
  "refusal": "Nothing entered yet.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "Assets $503,200 − Debts $242,000 = Net worth $261,200"
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
   "FOUNDER 2026-09-27: a CD gets no estimate. It is not traded, so its value does not move with rates; the screen says that instead. KEEP — the app does not ask whether a CD is a bank one or a brokered one."
  ],
  "refusal": "Refused for a CD, for a matured bond, and for anything with no coupon or no maturity — and for a CD it says plainly why nothing happens.",
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
  "refusal": "No price — it shows what you paid, labelled as that.",
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
  "refusal": "All sold — the screen says the holding is liquidated rather than showing 0 shares.",
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
  "refusal": "No price today — no gain is stated at all.",
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
  "refusal": "No price today — no gain is stated at all.",
  "worked": {
   "given": "140 shares of VTI on 28 Sep 2026, priced at $290: 100 bought at $210 in Mar 2023 and 40 at $265 in Jun 2026. Dividends of $420 and $405 this year; 20 shares bought at $200 were sold at $285.",
   "answer": "$1,000"
  }
 },
 "MK-NW-M-038": {
  "label": "We keep the total at $X",
  "screens": [
   "/itemize"
  ],
  "answers": "The figure the account must still add up to while you say what is inside it.",
  "formula": "the lump account’s balance, unchanged by itemising",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "Itemising describes what is inside an account; it never changes what the account is worth."
  ],
  "refusal": "Nothing to itemise.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "$46,600"
  }
 },
 "MK-NW-M-039": {
  "label": "$X of $Y itemized · remainder",
  "screens": [
   "/itemize"
  ],
  "answers": "How much of the account you have placed, and how much is still unplaced.",
  "formula": "the sum of the items entered; the remainder is the balance minus that sum",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "Nothing entered yet — it reads $0 of the balance.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "$40,600"
  }
 },
 "MK-NW-M-040": {
  "label": "each holding and its value",
  "screens": [
   "/itemize"
  ],
  "answers": "One line per thing you have said is inside this account, and what it is worth.",
  "formula": "the value of each thing inside the account, listed under the class it belongs to",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price"
  ],
  "decisions": [
   "A CLASS HOLDING NOTHING IS NOT LISTED — a $0 line reads as \"we checked and it is empty\", which is a different claim from \"there is none\".",
   "Uninvested money in the account is one of the lines, under the words he ruled on 2026-08-11: cash in this account."
  ],
  "refusal": "Nothing entered yet.",
  "worked": {
   "given": "A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 ($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.",
   "answer": "$40,600"
  }
 },
 "MK-NW-M-041": {
  "label": "total value of your bonds",
  "screens": [
   "/bonds"
  ],
  "answers": "What every bond and CD you hold is worth today, added up.",
  "formula": "the sum of each bond account’s balance",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "No bonds entered yet, so it says so rather than showing $0.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$34,200"
  }
 },
 "MK-NW-M-042": {
  "label": "n bonds · face $X",
  "screens": [
   "/bonds"
  ],
  "answers": "How many you hold, and what they pay back at maturity in total.",
  "formula": "count of bond accounts, and the sum of their face values",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "Nothing entered yet.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "2 bonds · face $35,000"
  }
 },
 "MK-NW-M-043": {
  "label": "COUPON",
  "screens": [
   "/bonds"
  ],
  "answers": "The interest all your bonds pay in a year, in money.",
  "formula": "for each bond: face value × coupon rate; then added up",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "Nothing entered yet.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$1,630/year"
  }
 },
 "MK-NW-M-044": {
  "label": "AVG YIELD",
  "screens": [
   "/bonds"
  ],
  "answers": "What your bonds yield on what they are worth today, weighted by value.",
  "formula": "the coupon each pays ÷ what each is worth today, weighted by value",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "A bond with no price today is left out rather than counted at zero.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "4.77%"
  }
 },
 "MK-NW-M-045": {
  "label": "each bond — face, coupon, yield",
  "screens": [
   "/bonds"
  ],
  "answers": "One line per bond: what it pays back, what it pays you, and what that is worth today.",
  "formula": "face value · coupon rate · coupon ÷ today’s value",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": null,
  "refusal": "A bond fund has no face value or maturity, so it shows none.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "Ally 12-month CD — face $10,000, $505/year, 5.05%"
  }
 },
 "MK-NW-M-046": {
  "label": "at your planned spend",
  "screens": [
   "/analytics"
  ],
  "answers": "How many months your cash would cover if you carried on living exactly as you plan to.",
  "formula": "your cash ÷ (everything you budget for a month + the debt payments you cannot stop − the rent from a property that keeps arriving)",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-NW-I-002 your debts",
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": [
   "FOUNDER 2026-09-28: \"give both numbers.\" The figure above it is what you could not stop paying; this one is the life you plan to live. Neither is the whole truth alone, so the screen shows both."
  ],
  "refusal": "No expense figure yet — it shows nothing rather than dividing by nothing.",
  "worked": {
   "given": "$18,000 in checking, and a home. A $2,400/month mortgage on it, entered both as the Rent / Mortgage budget line and as a Mortgage debt — the same $2,400. It is counted once, from Debts; the budget line stands down. Plus $700 groceries (an essential) and $400 eating out (not). Also a car loan at $250/month and a Visa at $120/month. Nothing logged yet.",
   "answer": "4.7 months"
  }
 },
 "MK-NW-M-047": {
  "label": "Both include $X/month of debt payments you cannot stop",
  "screens": [
   "/analytics",
   "/insights"
  ],
  "answers": "What your debts require of you each month, which neither runway can leave out.",
  "formula": "the minimum monthly payment of every debt, the home’s mortgage included; a balance due in one lump has none",
  "inputs": [
   "MK-NW-I-002 your debts"
  ],
  "decisions": [
   "FOUNDER 2026-09-28: \"What about credit card debt, HELOC, car loan?\" They were in NEITHER figure. You can skip dinner out; you cannot skip a car payment.",
   "FOUNDER 2026-10-04 (DEC-1923): \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" So the home’s mortgage is counted here from Debts, and the Rent / Mortgage budget line stands down — the home is in the figure once.",
   "IT IS THE MINIMUM: a payment a person chooses to make above it can be stopped."
  ],
  "refusal": "No debts entered — the line does not appear at all.",
  "worked": {
   "given": "$18,000 in checking, and a home. A $2,400/month mortgage on it, entered both as the Rent / Mortgage budget line and as a Mortgage debt — the same $2,400. It is counted once, from Debts; the budget line stands down. Plus $700 groceries (an essential) and $400 eating out (not). Also a car loan at $250/month and a Visa at $120/month. Nothing logged yet.",
   "answer": "$2,770/month"
  }
 },
 "MK-NW-M-048": {
  "label": "cash ÷ planned spend",
  "screens": [
   "/analytics",
   "/insights"
  ],
  "answers": "What a month costs at the life you plan to live, including what your debts require.",
  "formula": "everything you budget for a month + the debt payments you cannot stop",
  "inputs": [
   "MK-NW-I-002 your debts",
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": null,
  "refusal": "No expense figure yet.",
  "worked": {
   "given": "$18,000 in checking, and a home. A $2,400/month mortgage on it, entered both as the Rent / Mortgage budget line and as a Mortgage debt — the same $2,400. It is counted once, from Debts; the budget line stands down. Plus $700 groceries (an essential) and $400 eating out (not). Also a car loan at $250/month and a Visa at $120/month. Nothing logged yet.",
   "answer": "$3,870/month"
  }
 },
 "MK-NW-M-049": {
  "label": "Total value",
  "screens": [
   "/other-investments"
  ],
  "answers": "What your alternatives are worth — crypto, private equity, commodities and the rest.",
  "formula": "the sum of every account whose class is alternatives",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "It is the Alternatives SLICE of net worth and must equal what the Net worth tab shows for that class — which is why it sits behind this door (founder, 2026-09-27: \"ok\")."
  ],
  "refusal": "None entered yet.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$9,000"
  }
 },
 "MK-NW-M-050": {
  "label": "EST. GROWTH /year",
  "screens": [
   "/other-investments"
  ],
  "answers": "What your alternatives might earn in a year, at the rates these kinds of things have historically paid.",
  "formula": "each holding’s value × the historical benchmark for its kind, added up",
  "inputs": [
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "An ESTIMATE, and it wears the estimate label: a historical benchmark for the KIND of thing held, never a promise about this holding.",
   "FOUNDER 2026-09-27 (\"ok\"): split out of \"what am I worth\". The Alternatives TOTAL belongs there because it must equal what the Net worth tab shows for that class; a projection does not."
  ],
  "refusal": "Nothing held — no figure at all, because a $0 forecast reads as a forecast.",
  "worked": {
   "given": "$9,000 of gold and $6,000 of bitcoin — $15,000 of other investments, at their kinds' own benchmark rates.",
   "answer": "$1,218/year"
  }
 },
 "MK-NW-M-051": {
  "label": "EXP. RETURN",
  "screens": [
   "/other-investments"
  ],
  "answers": "The one yearly rate your alternatives are expected to earn, taking each holding's own benchmark and weighting it by what that holding is worth.",
  "formula": "each holding's value × the benchmark for its kind, added up, ÷ the total value",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": [
   "IT IS WEIGHTED BY VALUE, not an average of the rates: $28,000 of crypto and $500 of gold is almost entirely a crypto outlook, and averaging the two rates would say otherwise.",
   "TWO DECIMALS, because it is a rate (the precision standard, Q49) — it read to one until 2026-09."
  ],
  "refusal": "Nothing held — no figure at all, because a 0.00% expected return reads as a forecast of nothing rather than an absence of holdings.",
  "worked": {
   "given": "$9,000 of gold and $6,000 of bitcoin — $15,000 of other investments, at their kinds' own benchmark rates.",
   "answer": "8.12%"
  }
 },
 "MK-NW-M-052": {
  "label": "each alternative and what it is worth",
  "screens": [
   "/other-investments"
  ],
  "answers": "Every alternative you hold, with its value, where it is held and the benchmark for its kind — so the total above can be read line by line.",
  "formula": "one row per account whose class is alternatives, its own balance beside it",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": [
   "THE ROWS MUST ADD TO THE TOTAL ABOVE THEM. That is the whole reason the rows exist: a total nobody can take apart is a number you have to trust rather than check."
  ],
  "refusal": "No rows, and the screen shows the sentence that says what belongs here instead.",
  "worked": {
   "given": "$9,000 of gold and $6,000 of bitcoin — $15,000 of other investments, at their kinds' own benchmark rates.",
   "answer": "$9,000"
  }
 },
 "MK-NW-M-053": {
  "label": "face",
  "screens": [
   "/bonds"
  ],
  "answers": "The face value of every bond and CD added up — what they pay back at maturity, which is not what they are worth today.",
  "formula": "the sum of each bond’s face value",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": [
   "FACE AND VALUE ARE SHOWN SIDE BY SIDE because they differ, and the difference is the whole point: a bond bought below face pays back more than it is worth today."
  ],
  "refusal": "No bonds entered yet, so no face total either.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$35,000"
  }
 },
 "MK-NW-M-054": {
  "label": "one bond’s value",
  "screens": [
   "/bonds"
  ],
  "answers": "What this one bond or CD is worth today.",
  "formula": "the bond account’s own balance",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": null,
  "refusal": "— the row is not drawn at all when there is no bond.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$10,000"
  }
 },
 "MK-NW-M-055": {
  "label": "one bond’s face",
  "screens": [
   "/bonds"
  ],
  "answers": "What this one bond pays back at maturity.",
  "formula": "the face value as entered, or the balance when no face was given",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": null,
  "refusal": "Falls back to the value entered, and the row says face with that figure.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$10,000"
  }
 },
 "MK-NW-M-056": {
  "label": "coupon",
  "screens": [
   "/bonds"
  ],
  "answers": "What this one bond pays in a year, in cash.",
  "formula": "its face value × its coupon rate",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": [
   "IT IS PAID ON FACE, NOT ON VALUE. A $25,000 bond worth $24,200 still pays 4.5% of $25,000 — computing it on the market value understates the income."
  ],
  "refusal": "No coupon rate entered — the figure is left out rather than shown as $0.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "$505/year"
  }
 },
 "MK-NW-M-057": {
  "label": "yield",
  "screens": [
   "/bonds"
  ],
  "answers": "What this bond pays in a year as a share of what it is worth today.",
  "formula": "its coupon a year ÷ its value today, less accrued interest where that was entered",
  "inputs": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-065 accrued interest"
  ],
  "decisions": [
   "WHERE ACCRUED INTEREST WAS NOT ENTERED the row says so beneath the figures rather than quietly leaving it in the price (his ruling, DEC-0280)."
  ],
  "refusal": "— when there is no coupon rate or no value to divide by.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "5.05%"
  }
 },
 "MK-NW-M-058": {
  "label": "Yield to maturity",
  "screens": [
   "/bonds"
  ],
  "answers": "What this bond would earn a year if held to maturity, counting the gain or loss between what it is worth now and what it pays back.",
  "formula": "the coupon a year plus (face − value) spread over the years left, ÷ the value today",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": [
   "AN ESTIMATE, and the foot of the screen says so in those words."
  ],
  "refusal": "— with no maturity date there are no years to spread the difference over.",
  "worked": {
   "given": "Two bonds on 28 Sep 2026: a $25,000-face Treasury paying 4.5%, maturing 30 Sep 2029, worth $24,200 today; and a $10,000 Ally CD paying 5.05%, maturing 15 Mar 2027, worth its $10,000.",
   "answer": "5.05%"
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
 "MK-NW-M-063": {
  "label": "what is inside this institution",
  "screens": [
   "/analytics"
  ],
  "answers": "What this one institution holds, broken down by kind, so a roll-up can be read rather than taken on trust.",
  "formula": "the accounts at this institution, added up within each kind",
  "inputs": [
   "MK-XS-I-001 account balance"
  ],
  "decisions": [
   "BIGGEST FIRST, so the largest thing inside an institution is the first thing read.",
   "SHORTENED, because several of these share one line. It is the only place the app shortens a figure, and it is shortened only to fit — never to round a figure a person is checking.",
   "THE PARTS ADD TO THE INSTITUTION’S OWN TOTAL above them, which is the point of showing them."
  ],
  "refusal": "One kind only — the line is left out, because a roll-up of one thing is just the thing.",
  "worked": {
   "given": "$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), and no money has been added or taken out since.",
   "answer": "$18K"
  }
 },
 "MK-NW-M-064": {
  "label": "rent from your property, which keeps arriving",
  "screens": [
   "/analytics",
   "/insights",
   "/stress-test",
   "/jobsafety"
  ],
  "answers": "The rent that would still arrive each month if your pay stopped.",
  "formula": "the Rent row of your Income summary: rent less what the property costs to run, less the calculated tax when the tax rate is calculated",
  "inputs": [
   "MK-CF-I-007 rental income"
  ],
  "decisions": [
   "FOUNDER 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\"",
   "It is the same figure as the Income summary's Rent row, read from that function, so the two screens cannot show two rents."
  ],
  "refusal": "No rental entered — the line does not appear at all.",
  "worked": {
   "given": "$18,000 in checking, and a home. A $2,400/month mortgage on it, entered both as the Rent / Mortgage budget line and as a Mortgage debt — the same $2,400. It is counted once, from Debts; the budget line stands down. Plus $700 groceries (an essential) and $400 eating out (not). Also a car loan at $250/month and a Visa at $120/month. Nothing logged yet. And a rental house: $2,000/month of rent, $500/month to run, less $190/year of calculated tax on it, which is $15.83/month.",
   "answer": "$1,484/month"
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
  "formula": "split the window at every day money moved in or out; each piece = the value just before the next movement ÷ the value just after the last one (the record holds one value a day, taken after that day’s money moved, so just before = that day’s value − the movement); multiply the pieces and take 1 off — a time-weighted return; a window longer than a year is turned into a yearly rate: (1 + the return)^(365 ÷ days) − 1",
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
  "refusal": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or the value that day is less than the money added. It never shows another kind of figure in its place.",
  "worked": {
   "given": "An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash) and $32,000 on 28 Sep 2026, with nothing paid in or taken out and $825 of it arriving as dividends.",
   "answer": "+6.67%"
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
export type AddWrapper = 'taxable' | '401k' | 'trad_ira' | 'roth' | 'roth_401k' | 'hsa';

export interface AltSummary { count: number; totalValue: number;
  /** Null when nothing is held: 0% would read as a forecast. */
  blendedReturn: number | null;
  /** The rate in money over a year; null when nothing is held — $0 would read as a forecast too (outside review, 2026-10-07). */
  estAnnualGrowth: number | null; }

export interface AlternativesOutlook {
  /** How many alternatives are held. */
  count: number;
  /** The blended yearly rate — each holding's benchmark, weighted by what it is worth. */
  expectedReturn: number | null;   // null = nothing held, so no figure (MK-NW-M-051)
  /** That rate in money, over a year. Null when nothing is held: zero would read as a forecast. */
  estimatedGrowthPerYear: number | null;
  /** The TOTAL the rows add to — the figure above them on the screen. */
  totalValue: number;
  /** ONE ROW PER ALTERNATIVE, from the door rather than built on the screen (2026-10-01).
   *  The screen filtered and summed the accounts itself while asking this door for the rate, which is
   *  how one surface comes to hold two answers. The rows add to `totalValue` by construction. */
  rows: AlternativeRow[];
}

export interface AssetAccount {
  asset_id: EntityId;
  label: string;                  // account name, e.g. "Chase Checking"
  institution?: string;           // e.g. "Chase", "Fidelity"
  kind?: string;                  // ASSET_KINDS id, e.g. 'checking','brokerage','401k','home'
  tax_bucket: TaxBucket;
  balance: number;
  target_return: number;          // annual, decimal (e.g. 0.07)
  change_amount?: number;         // net change this month (from savings allocations)
  change_month?: string;          // 'YYYY-MM' the change applies to
  retirement_pct?: number | null; // 0–100 earmark; null/absent = use earmarkDefault (the auto share)
                                  // (rest is for other goals); defaults per kind via earmarkDefault()
  actual_ttm?: number;            // user-reported ACTUAL trailing-12-month return (decimal), for
                                  // performance-vs-benchmark; null/undefined = not reported
  positions?: import('../performance').Position[];  // ticker holdings (lots) tracked for performance.
                                  // For a manual-balance account these are a SUBSET tracked for
                                  // performance only — they do NOT change `balance`. The account's
                                  // value is derived from positions ONLY when derive_balance is true.
  derive_balance?: boolean;       // true → balance = cash_balance + Σ(position market value), refreshed
                                  // from live prices (a fully position-tracked brokerage built from its
                                  // holdings). Absent/false → `balance` is the user-entered total and
                                  // positions are partial performance trackers (never overwrite balance).
  cash_balance?: number;          // uninvested cash sleeve in an investment account (a brokerage isn't 100%
                                  // invested). Account value = cash_balance + Σ(position market value).
  // Individual bond fields (Phase B) — present → this account is a bond; balance = current value.
  face_value?: number;            // par/face value (total)
  coupon_rate?: number;           // annual coupon, decimal (e.g. 0.045)
  maturity_date?: string;         // 'YYYY-MM-DD'
  accrued_interest?: number;      // A47 (founder, 2026-08-26): interest earned since the last coupon, when the person knows it — subtracted before the yield
  origin?: 'onboarding';          // seeded from onboarding answers; re-seeding replaces ONLY these
                                  // rows (absent = user-created, never touched by seeding/restart)
  // Two-axis classification (taxonomy spec). Optional + EXPLICIT — when absent, derived from
  // kind/tax_bucket via assetClassOf()/taxTreatmentOf(). The CSV importer + editor set these directly.
  asset_class?: AssetClass;
  tax_treatment?: TaxTreatment;
  re_use?: RealEstateUse;         // real_estate only: primary | rental | secondary | land
  // FCC F1 provenance + manual-value freshness (detailed design v1.1, Net worth sheet):
  source?: 'connected' | 'imported' | 'manual';  // absent = manual (every pre-FCC row)
  connection_id?: string;         // F1: which Connection feeds this account (connected only)
  last_synced?: string;           // ISO — last successful update from its source
  mask?: string;                  // '••4821' — how banks disambiguate accounts
  status?: 'open' | 'closed' | 'archived' | 'unavailable';   // broker-reported; closed is SHOWN, never dropped
  wrapper_confirmed?: boolean;    // the USER confirmed kind/tax_bucket — syncs never override it
  snaptrade_account_id?: string;  // stable SnapTrade account id — how syncs find an absorbed manual row
  option_holdings?: {             // SnapTrade v2 (G2): itemized option positions on a connected

export type AssetClass = 'cash' | 'bonds' | 'stocks_etf' | 'alternatives' | 'real_estate' | 'personal_property' | 'mixed';

export interface AssetsDoc { user_id: UserId; accounts: AssetAccount[]; last_updated?: any; }

export interface AssetsState {
  user_id: UserId;
  total_asset_value: number;
  average_target_return: number | null;   // null when nothing is held
  accounts: (AssetAccount & { portfolio_percentage: number })[];
}

export interface BondInfo {
  /** What it pays back at maturity — as entered, or null when never entered (outside review, 2026-10-07: a face read as $0 made a −274% yield). */
  face: number | null;
  /** The yearly rate — as entered, or null when never entered; a typed 0 is a zero-coupon bond. */
  couponRate: number | null;
  maturity: string;
  value: number;
  accruedInterest?: number | null;
  /** A certificate of deposit: not traded, so its value does not move with rates (owner, 2026-09-27). */
  isCd?: boolean;
}

export interface BondRow {
  accountId: string;
  label: string;
  /** What the person calls the place it is held — the row's heading on the Bonds screen. */
  institution: string;
  face: number | null;
  couponRate: number | null;
  couponPerYear: number | null;
  maturity: string;
  yearsLeft: number | null;
  currentYield: number | null;
  yieldToMaturity: number | null;
  value: number;
  isCD: boolean;
  /** The note about accrued interest, when the figures need one. Null when they do not. */
  accruedCaveat: string | null;
}

export interface BondSummary { count: number; totalValue: number; totalFace: number; annualCoupon: number; avgYield: number | null; nextMaturity: string | null; }

export interface Bonds {
  count: number;
  totalValue: number;
  totalFace: number;
  couponPerYear: number;   // the total of what is known
  avgYield: number | null;
  /** The bonds the average yield leaves out, by name: the ones with no value today. A screen that
   *  shows the average names them, so nobody reads it as an average of every bond listed. */
  leftOutOfAverage: string[];
  /** The bonds the average yield and the year's interest leave out because no rate was entered — named
   *  the same way (outside review, 2026-10-07: they had counted as paying 0%). */
  leftOutNoRate: string[];
  /** The bonds the total face value leaves out because none was entered — named, never counted as $0. */
  faceNotEntered: string[];
  /** The soonest maturity date among them, so the screen need not sort for itself. */
  nextMaturity: string | null;
  rows: BondRow[];
  /** Present only when an account was named. */
  one: OneBond | null;
}

export interface BondsInput {
  accounts: AssetAccount[];
  /** The account whose own page is open, when one is. */
  accountId?: string;
  today?: Date;
}

export interface CategoryEarned {
  key: string;
  label: string;
  /** Dividends and interest actually RECEIVED in the window, from the records only. */
  earned: number;
  /** That class’s return over the window, value-weighted — null where it cannot be calculated. */
  ret: number | null;
  /** True where `ret` is a STATED yearly rate (a bond or CD's own coupon), printed with "/year" —
   *  Performance v17: "a /year figure is that category's yearly pace". */
  yearly: boolean;
}

export interface EmergencyFund {
  /** The money that could actually be spent this month. */
  cash: number;
  /** What you must keep paying on your debts each month — the minimums. You cannot stop paying a car
   *  loan or a card because your income stopped, so this belongs in BOTH figures below. */
  debtMinimums: number;
  /** The whole month, at the life you plan to live: everything you budget, plus the debt minimums. */
  plannedSpendMonthly: number;
  /** The same, cut back to what you could not stop: essentials plus the debt minimums. */
  monthsCoveredAtPlannedSpend: number | null;
  /** What a month of essentials costs — ONE figure, on all three screens. */
  essentialsMonthly: number;
  /** Where that figure came from, in the words the screen shows ("4 month average"). */
  essentialsBasis: string;
  /** RENT FROM A PROPERTY, a month — the Income summary's own Rent row, so the two screens can never
   *  show two figures for it. It keeps arriving when pay stops (founder, 2026-10-04), so each month
   *  it is added to the cash before the month is paid for. 0 with no rental. */
  rentalIncomeMonthly: number;
  /** What the cash itself must find each month: essentials less that rent, never below zero. */
  fromCashMonthly: number;
  /** True when the rent alone pays for the month, so the cash is not drawn on and no count of
   *  months exists to state. */
  rentCoversEssentials: boolean;
  /** How many months the cash covers. Null when there is no essentials figure to divide by, and
   *  null when the rent covers the month by itself. */
  monthsCovered: number | null;
  /** What a target of N months costs, and how far off it is. */
  targetFor: (months: number) => { target: number; gap: number } | null;
  /** A sudden hit: what is left, and how long that would then last. */
  afterAShock: (shock: number) => { cashAfter: number; monthsAfter: number | null; coversIt: boolean };
  /** Set when the Rent / Mortgage budget line is NOT counted, because the home's mortgage is in Debts
   *  and is counted from there (his rule, 2026-10-04, DEC-1923). It replaces the old comparison of the
   *  budget line with the mortgage (DEC-0441, "use the budget"): Debts wins now, so there is nothing to
   *  reconcile — only something to say. Null for a renter and for a home with no mortgage. */
  rentLineInDebts: { budgeted: number; mortgage: string } | null;
  /** The sentence the screen shows when that line is not counted. Empty when it is. */
  budgetSentence: string;
}

export interface HistoryCoverage {
  kind: 'none' | 'partial';
  from: string | null;            // where the shared history actually begins
  monthsCovered: number | null;   // how much of the claimed window is really covered
  sentence: string;               // the one plain sentence a screen shows
}

export interface HoldingAnswer {
  ticker: string;
  name: string;
  shares: number;
  /** True once every share is sold — the screen says "Holding liquidated", never a $0 position. */
  closed: boolean;
  /** What was paid for what is still held. */
  totalPaid: number;
  /** Per share, unrounded — rounding happens at display (Q49), not here. */
  avgPaidPerShare: number;
  /** Today's price, or null when none is held. */
  price: number | null;
  /** What it is worth. With no price this is WHAT YOU PAID, and `priced` says so. */
  value: number;
  priced: boolean;
  /** Only when priced: what it has gained, and the return on what was paid. */
  gain: number | null;
  /** WHAT IT MOVED SINCE THE PREVIOUS CLOSE, in money and as a share of that close.
   *  Null when fewer than two closes are known: one price is a price, not a change.
   *  It was calculated on HoldingDetailScreen from the price series — a money figure derived inline on
   *  a screen, which is the one thing the one-door rule forbids (2026-10-01). */
  dayChange: { amount: number; share: number } | null;
  returnOnCost: number | null;
  /** EACH PURCHASE, oldest first — what the average cost is made of, so it can be checked rather
   *  than trusted. The screen read `position.lots` directly, which is the position's own shape
   *  leaking onto a screen; the door names the three things a person reads and nothing else. */
  purchases: { lotId: string; date: string; shares: number; costPerShare: number }[];
  /** Only when priced: the gain split by how long it has been held. */
  capitalGains: CapGains | null;
  /** Dividends whose record NAMES this ticker. */
  dividends: { trailing12: number; allTime: number };
  /** What earlier sales of this holding actually made — and how many sales could NOT be priced
   *  honestly, because no purchase was ever recorded for them. A figure that leaves those out
   *  silently is the one that gets trusted and is wrong. */
  realised: RealizedResult;
}

export interface ItemHolding {
  cls: ItemClass;
  label: string;
  value: number | null;   // a holding listed with no value yet is null, never 0 (batch 06)
  ticker?: string;                 // stocks_etf (optional — surfaced in the label)
  couponRate?: number;             // bonds (decimal)
  maturityDate?: string;           // bonds ('YYYY-MM-DD')
  kind?: string;                   // alternatives sub-kind (crypto/options/…); defaults per class
  faceValue?: number;              // bonds — what it pays back at maturity, when the person knows it; never invented
}

export interface Itemising {
  /** The lump being itemised — its total never moves while its inside is filled in. */
  keepTotalAt: number;
  itemised: number;
  remainder: number;
  /** False when a listed holding has no value: the remainder is not final, not 'unexplained'. */
  remainderFinal: boolean;
}

export interface LedgerGroup {
  /** The heading exactly as the screen prints it — a class label, or the institution's own name. */
  label: string;
  /** What this group holds. */
  total: number;
  /** The accounts inside it, in the order they were given. */
  accountIds: string[];
  /** Each account's amount in THIS group — by class, only its part in that class; by institution, its
   *  balance. The rows always add up to the group's total, so the heading can be checked by eye. */
  rows: { accountId: string; amount: number }[];
  /** Under an institution's name, the class mix inside it, biggest first. Empty when grouped by class. */
  mix: { key: string; total: number }[];
}

export interface MortgageCheck {
  /** How many properties Net worth holds, and how many mortgages Debts holds. */
  properties: number;
  mortgages: number;
  /** One row for each property: the mortgage on it, or none. */
  byProperty: { propertyId: string; property: string; mortgageId: string | null; mortgage: string | null; payment: number }[];
  /** Mortgages that are on no property. Each one is the person's to fix. */
  unmatched: { id: string; label: string }[];
  /** True when every mortgage is on a property of its own. */
  ok: boolean;
  /** What the screen says when it is not. Empty when it is. */
  sentence: string;
}

export interface NetWorthState {
  user_id: UserId;
  net_worth: number;
  gross_assets: number;
  gross_debt: number;
}

export type PropertyUse = 'home' | 'rental' | 'second';

export interface RateSensitivity { ratesUp: RateMove; ratesDown: RateMove }

export type RealEstateUse = 'primary' | 'rental' | 'secondary' | 'land';

export type RentEntry = { income?: any; expenses?: any; property_id?: any };

export type TaxBucket = 'CASH' | 'PRE_TAX' | 'ROTH' | 'TAXABLE' | 'PROPERTY';

export type TaxTreatment = 'taxable' | 'tax_deferred' | 'tax_free';

export interface TheAccount {
  accountId: string;
  label: string;
  /** What the account is worth today — the ONE figure the band, the trio and the Total row all print. */
  marketValue: number;
  /** Dividends and interest this account has actually received. Never estimated, never back-filled. */
  income: number | null;   // null = no records yet, so no figure (MK-NW-M-019)
  /** What is inside it, by class. Null for an account that is not linked: there is nothing to read. */
  inside: ClassSlice[] | null;
  /** How many records the ledger holds for it. */
  activityCount: number;
  /** EACH RECORD, and what it moved. The screen worked the amount out itself from the ledger — a
   *  transfer coming IN counts as its own amount, anything else as its cash effect — which is a money
   *  figure calculated on a screen. The door answers it now (2026-10-01). */
  activity: { recordId: string; date: string; type: string; ticker: string | null;
              amount: number; mine: boolean }[];
  /** The income of one holding, by ticker — blank when the record does not say which holding paid. */
  incomeOfHolding: (ticker: string | null | undefined) => HoldingIncome;
}

export interface TheNetWorth {
  /** Assets − debts. The ONE net-worth figure, on every screen that shows one. */
  netWorth: number;
  assets: number;
  debts: number;
  /** The three totals every screen splits by. */
  cash: number;
  investments: number;
  investable: number;
  /** What is owned, by class — the rows under WHAT YOU OWN. */
  byClass: Record<AssetClass, number>;
  /** Alternatives, named on its own because its own screen shows this total and it must agree. */
  alternatives: number;
  /** Each debt, and what it costs a month. */
  debtLines: DebtLine[];
  /** Σ the MINIMUM each debt obliges — the obligation. This is what the Net worth screen prints today. */
  monthlyDebtMinimum: number;
  /** Σ what ACTUALLY leaves the account, counting a payment set above the minimum. */
  monthlyDebtPayments: number;
  /** How it moved: the line, and the return on cash + investments. Null when the record cannot say.
   *  A RATE, held as 0…1 — the form every other percent in the register uses, so one display rule
   *  rounds them all (Q49). The function underneath returns it already multiplied by 100; the door
   *  converts once, here, rather than leaving four screens to remember which form they were handed. */
  trend: TrendPoint[];
  investableChangePct: number | null;
  /** Which mortgage is on which property, and which are on none (his rule, 2026-10-04, DEC-1925). */
  mortgageCheck: MortgageCheck;
  /** Holdings nothing could class, which the person is asked about (his ruling, 2026-09-30, master
   *  Q11: "Refuse the line and ask") — and the sentence that asks. Empty when there are none. */
  unclassed: { accountId: string; account: string; positionId: string; holding: string }[];
  unclassedSentence: string;
}

export type UberGroup = 'cash' | 'investments' | 'property';

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
}
```

## Formulas the cards lean on

3 functions outside the module named by the formulas. Use them to work answers; do not judge them.

```json
[
 {
  "id": "MK-CF-O-020",
  "name": "theBudgetCounted",
  "what_it_is_for": "Which of my planned expenses are counted, now that my debts are taken from Debts?",
  "formula_in_words": "Owner rule, 2026-10-04: \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" The home = the property read as HOME (propertyUses, handed the profile's rent entries — none recorded is read as none, not as unknown). Its mortgage = the mortgage matched to that property (mortgagesByProperty). When the home has a mortgage in Debts AND the budget's Rent / Mortgage line holds an amount: that line is counted as nothing, the one typed monthly total (when there is one) is lowered by the same amount, never below zero, and the sentence says the line is not counted and names the mortgage. Otherwise — a renter, a home with no mortgage, a mortgage on another property, or no amount on the line — the budget is counted exactly as typed. It also names the home's mortgage when there is one. What the person typed is never changed; this is the budget as it is counted."
 },
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
