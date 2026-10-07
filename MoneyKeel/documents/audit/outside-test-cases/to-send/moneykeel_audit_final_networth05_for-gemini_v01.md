Written for: gemini, as the outside judge of batch "networth 05 final". You have not seen any earlier review of these functions and none is given here: judge them as if for the first time.

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

# The cards — batch "networth 05 final"

21 cards, so 21 formula checks and 105 cases. Put `"batch": "networth 05 final"` in your reply.

## Why this batch is in front of you

These functions were corrected after their cards were first written. The formula on each card below is the one in the app now. Before the next batch is opened, the owner wants one more independent check that nothing in this batch is still wrong or left unsaid.

## What the owner has ruled since — settled, in his words

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
11. 2026-08-26 — "subtract accrued interest when known; say so when not" Every yield of a bond is worked on its value less accrued interest when that is known (A47).
12. 2026-09-27 — "Is there a similar question for CDs as CD rates don't move and one can do nothing if CD rates move." A CD is not traded, so no figure is given for what a move in interest rates would do to its value.
13. 2026-08-04 — "CLASSIFICATION RULE: cash = cash only. Money-market funds → Stocks/ETFs; CDs/T-bills → Bonds & CDs (any maturity)." A money-market account or fund is Stocks / Funds; a CD is Bonds & CDs (DEC-0051).

## A third job, for this batch only — say whether it can be closed

Do Job 1 and Job 2 for every card, exactly as the brief above describes. Then add two fields at the top level of your reply:

- `"ready_to_close"`: `true` when you judged every card `RIGHT`, otherwise `false`.
- `"still_open"`: one line for each card you judged `WRONG`, `INCOMPLETE` or `CANNOT TELL`, naming the card and what must change. An empty list when there is none.

Where to look hardest, in any batch about what a household owns and owes:

1. Every total against the sum of its own parts.
2. Anything that could be counted twice, or not at all — rent, a mortgage, a debt payment that was also logged as an expense.
3. What is shown when an input is missing: a refusal with its reason, never a zero.
4. A date that falls exactly on a boundary — matures today, held exactly one year.
5. Money added or taken out in the middle of a period, when the figure is a return.

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

export interface NetWorthState {
  user_id: UserId;
  net_worth: number;
  gross_assets: number;
  gross_debt: number;
}

export interface RateSensitivity { ratesUp: RateMove; ratesDown: RateMove }
```

## The cards

```json
[
 {
  "id": "MK-NW-F-056",
  "name": "bondInfo",
  "kind": "function",
  "what_it_is_for": "What are this holding's bond facts?",
  "formula_in_words": "Reads a bond's facts off its account: face value (not entered when missing or zero or less), yearly rate (not entered when missing; a typed zero is kept), maturity date, value (the balance), accrued interest (not entered when missing), and whether it is a CD — its kind is a CD, or its name or institution says CD or certificate of deposit.",
  "handed": "export function bondInfo(a: AssetAccount): BondInfo",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-F-057",
  "name": "annualCoupon",
  "kind": "function",
  "what_it_is_for": "Annual coupon income = face value × coupon rate (paid as cash).",
  "formula_in_words": "Face value × yearly interest rate. Nothing when either was not entered.",
  "handed": "export function annualCoupon(b: BondInfo): number | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-112",
  "name": "yearlyInterest",
  "kind": "function",
  "what_it_is_for": "A year's interest from one bond or CD, by the one rule both income figures use: face × rate; with no face entered, today's value × rate (a CD typed by its balance); with no rate, nothing (owner A46: counted as $0, said so).",
  "formula_in_words": "A year's interest from one bond or CD. Nothing when no rate was entered. Face value × rate when a face value was entered; otherwise today's value × rate.",
  "handed": "export function yearlyInterest(b: BondInfo): number | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-058",
  "name": "yearsToMaturity",
  "kind": "function",
  "what_it_is_for": "How long until this bond pays back?",
  "formula_in_words": "Whole calendar days from today's date to the maturity date, ÷ 365.25, never below zero. The time of day does not count. Nothing when there is no valid date.",
  "handed": "export function yearsToMaturity(maturity: string, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-013 bond maturity date"
  ]
 },
 {
  "id": "MK-NW-F-059",
  "name": "currentYield",
  "kind": "function",
  "what_it_is_for": "Current yield = annual coupon ÷ current price/value.",
  "formula_in_words": "yearlyInterest ÷ (value − accrued interest, where entered). Nothing when no rate was entered, or when that divisor is zero or less.",
  "handed": "export function currentYield(b: BondInfo): number | null",
  "inputs_it_reads": [
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-F-060",
  "name": "approxYTM",
  "kind": "function",
  "what_it_is_for": "Approximate yield to maturity (standard approximation), decimal.",
  "formula_in_words": "With the clean price = value − accrued interest, where entered: (face × rate + (face − clean price) ÷ years left) ÷ ((face + clean price) ÷ 2). Nothing when there is no maturity date, the bond has matured, no face value or no rate was entered, or the clean price is zero or less.",
  "handed": "export function approxYTM(b: BondInfo, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-F-061",
  "name": "bondSummary",
  "kind": "function",
  "what_it_is_for": "Adds up every bond and CD held: how many there are, what they are worth, their face value, the interest they pay in a year, their average yield and the next one to mature.",
  "formula_in_words": "Count = how many bonds. Total value = each value added up. Total face value = each face value added up, a face not entered counting as zero. Interest in a year = yearlyInterest of each, added up, a bond with no rate counting as zero. Average yield is over the bonds that have a value today AND a rate: their yearlyInterest ÷ their value today less accrued interest where that is known; nothing when no bond qualifies. Next maturity = the earliest maturity date AFTER today, by the calendar — a bond maturing today has matured and is not next.",
  "handed": "export function bondSummary(bonds: BondInfo[], now: Date = new Date()): BondSummary",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-F-062",
  "name": "couponIncomeAnnual",
  "kind": "function",
  "what_it_is_for": "Total annual coupon income across the user's INDIVIDUAL bonds (kept for the Bonds screen summary).",
  "formula_in_words": "Over the accounts that are bonds or CDs: yearlyInterest of each, added up, one with no rate counting as zero.",
  "handed": "export function couponIncomeAnnual(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-063",
  "name": "interestIncomeAnnual",
  "kind": "function",
  "what_it_is_for": "The interest every bond, CD and rate-paying cash account pays in a year, added up, counting nothing for a holding that states no rate.",
  "formula_in_words": "For a bond or CD: nothing when its maturity date is before today; otherwise yearlyInterest (face × rate; with no face, balance × rate; with no rate, nothing). For a cash account that states a rate: balance × rate. Nothing for anything else. Added up over every account.",
  "handed": "export function interestIncomeAnnual(accounts: AssetAccount[], now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date"
  ]
 },
 {
  "id": "MK-NW-F-069",
  "name": "priceAtYield",
  "kind": "function",
  "what_it_is_for": "Price the bond's future cash flows at a given annual yield (yearly approximation).",
  "formula_in_words": "Years = years to maturity rounded to a whole number, at least 1. Price = each year's interest (face × rate; zero when either was not entered) ÷ (1 + yield) to the power of that year, added up, plus face (zero when not entered) ÷ (1 + yield) to the power of years. With no maturity date: the current value.",
  "handed": "function priceAtYield(b: BondInfo, y: number, now: Date): number",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-064",
  "name": "bondRateSensitivity",
  "kind": "function",
  "what_it_is_for": "What happens to this bond if interest rates move?",
  "formula_in_words": "Nothing for a CD, when the yield to maturity is unknown, or when the face value or rate was not entered or is zero or less. For rates one percentage point UP and one DOWN: the change = priceAtYield at the yield to maturity plus or minus one point (never below 0.01%) less priceAtYield at the yield to maturity itself. The new price = today's value + that change. It gives a range from 1% under to 1% over the new price, and the change, each rounded in proportion to the bond: to the nearest $1,000 for a bond worth $100,000 or more, the nearest $100 from $10,000, the nearest $10 from $1,000, and so on down.",
  "handed": "export function bondRateSensitivity(b: BondInfo, now: Date = new Date()): RateSensitivity | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-028",
    "words_on_screen": "Rates rise 1% → value roughly $X–$Y",
    "unit": "words",
    "what_it_answers": "Roughly what this bond would be worth if interest rates moved one percent either way.",
    "when_it_refuses": "Refused for a CD, for a matured bond, and for anything with no coupon or no maturity — and for a CD it says plainly why nothing happens.",
    "shown_on": [
     "/account-detail"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0071",
    "date": "2026-08-11",
    "words": "put % and labels on donut"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "An estimate, and it wears the estimate label."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "FOUNDER 2026-09-27: a CD gets no estimate. It is not traded, so its value does not move with rates; the screen says that instead. KEEP — the app does not ask whether a CD is a bank one or a brokered one."
   }
  ]
 },
 {
  "id": "MK-NW-F-065",
  "name": "buildNetWorth",
  "kind": "function",
  "what_it_is_for": "Net worth from two totals: everything owned less everything owed.",
  "formula_in_words": "Net worth = total assets − total debt, returned with both totals.",
  "handed": "export function buildNetWorth(uid: UserId, grossAssets: number, grossDebt: number): NetWorthState"
 },
 {
  "id": "MK-NW-F-038",
  "name": "earmarkedKinds",
  "kind": "function",
  "what_it_is_for": "Distinct investment kinds present in the earmarked nest egg (for the benchmark editor).",
  "formula_in_words": "The distinct kinds among accounts that are not property and have an earmarked amount above zero. An account with no kind counts as other.",
  "handed": "export function earmarkedKinds(accounts: AssetAccount[]): string[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-040",
  "name": "assetsFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Build asset accounts from onboarding answers (accumulation: retirement savings + holdings).",
  "formula_in_words": "Makes up to four accounts from the setup answers, skipping an answer left blank or below zero (a typed 0 is kept): traditional retirement savings → a pre-tax 401(k); Roth retirement savings → a Roth IRA; investment holdings → taxable stocks and funds; savings or portfolio → taxable stocks and funds. Each gets a target return of 7%.",
  "handed": "export function assetsFromOnboarding(uid: UserId, op: Record<string, any> | null): AssetsDoc",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-044",
  "name": "getAssetsState",
  "kind": "function",
  "what_it_is_for": "Reads a person's saved accounts and returns their totals, or nothing when none are saved.",
  "formula_in_words": "Reads the saved accounts and returns assetsStateFrom of them: nothing when none are saved or the saved list is empty.",
  "handed": "export async function getAssetsState(uid: UserId)"
 },
 {
  "id": "MK-NW-F-111",
  "name": "assetsStateFrom",
  "kind": "function",
  "what_it_is_for": "The saved accounts as a state to show — or nothing, when nothing is saved OR every saved account was deleted (outside review, 2026-10-07: an empty list is not a $0 total with a blended return).",
  "formula_in_words": "buildAssetsState of the saved accounts. Nothing when there is no saved record, or the saved record holds no accounts.",
  "handed": "export function assetsStateFrom(uid: UserId, d: AssetsDoc | null | undefined): AssetsState | null"
 },
 {
  "id": "MK-NW-F-053",
  "name": "correctClassOf",
  "kind": "function",
  "what_it_is_for": "The class an account SHOULD carry under the current rule.",
  "formula_in_words": "The class an account SHOULD have, or nothing when there is no correction to make: the class its name is evidence for; else Bonds & CDs if it has a maturity date; else Stocks / Funds for a money market account; else Bonds & CDs for a CD.",
  "handed": "export function correctClassOf(a: AssetAccount): AssetClass | null",
  "inputs_it_reads": [
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-054",
  "name": "reclassifyAccounts",
  "kind": "function",
  "what_it_is_for": "Corrects the asset class of any account or holding filed under the wrong one, and counts how many it changed.",
  "formula_in_words": "For each account the person has NOT confirmed (an account they confirmed is left exactly as it is): if correctClassOf gives a class different from the one it carries, it takes that class (a cash tax bucket becomes taxable unless the new class is cash). For each holding inside it: if its name is evidence for bonds it becomes a bond; if for any other class except cash, a stock or fund. Returns the accounts and how many changes were made.",
  "handed": "export function reclassifyAccounts(accounts: AssetAccount[]): { accounts: AssetAccount[]; changed: number }",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-010 transaction words (the institution's own wording)",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-071",
  "name": "isCertificateOfDeposit",
  "kind": "function",
  "what_it_is_for": "Whether an account is a certificate of deposit, judged from its name.",
  "formula_in_words": "True when bondInfo says the account is a CD: its kind is a CD, or its name or its institution contains the whole word CD, or the words certificate of deposit, in any capitals.",
  "handed": "export function isCertificateOfDeposit(a: Pick<AssetAccount, 'label'> & { institution?: string; kind?: string }): boolean",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-072",
  "name": "rowOf",
  "kind": "function",
  "what_it_is_for": "One bond's row for the Bonds screen: its face value, yearly interest rate, interest paid in a year, maturity date and years left.",
  "formula_in_words": "One row for one bond: face value and yearly interest rate (each not entered when it was not), interest paid in a year (yearlyInterest: face × rate; with no face, value × rate; with no rate, not entered), maturity date, years left, current yield, approximate yield to maturity, value, whether it is a CD, and the accrued-interest note. The institution shown is the account's institution, or the account's name when none is set.",
  "handed": "const rowOf = (a: AssetAccount, now: Date): BondRow",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-O-001",
  "name": "theBonds",
  "kind": "orchestrator",
  "what_it_is_for": "What bonds and CDs do I hold, what do they pay, and when do they mature?",
  "formula_in_words": "Takes every account that is a bond or CD. Rows are sorted by maturity date, soonest first, with any that has no date last. Count, total value, total face value, interest in a year, average yield and next maturity come from bondSummary. When one bond is opened it also gives: matured = its maturity date is today or earlier, by the calendar (a bond with no date has not matured — it is unknown); a matured bond gives no yield to maturity and no rate-move figure; and what a move in interest rates would do to its value (bondRateSensitivity) — except for a CD, where no figure is given and a sentence says a CD is not traded and is worth its balance until it matures. It also names the bonds the average yield leaves out — those with no value today after accrued interest, and, apart, those with a value but no rate entered — and the bonds with no face value entered, so a screen can say which.",
  "handed": "export function theBonds(input: BondsInput): Bonds",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-023",
    "words_on_screen": "Face value",
    "unit": "money",
    "what_it_answers": "What this bond pays back on the day it matures.",
    "when_it_refuses": "Not entered, so nothing is shown.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-024",
    "words_on_screen": "Interest payments",
    "unit": "words",
    "what_it_answers": "The rate it pays, and what that comes to in a year.",
    "when_it_refuses": "No coupon rate entered.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-025",
    "words_on_screen": "Matures",
    "unit": "words",
    "what_it_answers": "The day it pays back, and how long that is away.",
    "when_it_refuses": "No maturity date entered — the yields refuse rather than guess one.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-026",
    "words_on_screen": "Yield if held to maturity",
    "unit": "percent-2dp",
    "what_it_answers": "What it earns a year if you hold it to the end, counting the gap between its price and its face value.",
    "when_it_refuses": "Matured, or no maturity date — it refuses rather than divide by nothing.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-027",
    "words_on_screen": "Yield on today's value",
    "unit": "percent-2dp",
    "what_it_answers": "What the interest comes to against what the bond is worth today.",
    "when_it_refuses": "No value today.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-028",
    "words_on_screen": "Rates rise 1% → value roughly $X–$Y",
    "unit": "words",
    "what_it_answers": "Roughly what this bond would be worth if interest rates moved one percent either way.",
    "when_it_refuses": "Refused for a CD, for a matured bond, and for anything with no coupon or no maturity — and for a CD it says plainly why nothing happens.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-041",
    "words_on_screen": "total value of your bonds",
    "unit": "money",
    "what_it_answers": "What every bond and CD you hold is worth today, added up.",
    "when_it_refuses": "No bonds entered yet, so it says so rather than showing $0.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-042",
    "words_on_screen": "n bonds · face $X",
    "unit": "words",
    "what_it_answers": "How many you hold, and what they pay back at maturity in total.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-043",
    "words_on_screen": "COUPON",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The interest all your bonds pay in a year, in money.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-044",
    "words_on_screen": "AVG YIELD",
    "unit": "percent-2dp",
    "what_it_answers": "What your bonds yield on what they are worth today, weighted by value.",
    "when_it_refuses": "A bond with no price today is left out rather than counted at zero.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-045",
    "words_on_screen": "each bond — face, coupon, yield",
    "unit": "words",
    "what_it_answers": "One line per bond: what it pays back, what it pays you, and what that is worth today.",
    "when_it_refuses": "A bond fund has no face value or maturity, so it shows none.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-053",
    "words_on_screen": "face",
    "unit": "money",
    "what_it_answers": "The face value of every bond and CD added up — what they pay back at maturity, which is not what they are worth today.",
    "when_it_refuses": "No bonds entered yet, so no face total either.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-054",
    "words_on_screen": "one bond’s value",
    "unit": "money",
    "what_it_answers": "What this one bond or CD is worth today.",
    "when_it_refuses": "— the row is not drawn at all when there is no bond.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-055",
    "words_on_screen": "one bond’s face",
    "unit": "money",
    "what_it_answers": "What this one bond pays back at maturity.",
    "when_it_refuses": "Falls back to the value entered, and the row says face with that figure.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-056",
    "words_on_screen": "coupon",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What this one bond pays in a year, in cash.",
    "when_it_refuses": "No coupon rate entered — the figure is left out rather than shown as $0.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-057",
    "words_on_screen": "yield",
    "unit": "percent-2dp",
    "what_it_answers": "What this bond pays in a year as a share of what it is worth today.",
    "when_it_refuses": "— when there is no coupon rate or no value to divide by.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-058",
    "words_on_screen": "Yield to maturity",
    "unit": "percent-2dp",
    "what_it_answers": "What this bond would earn a year if held to maturity, counting the gain or loss between what it is worth now and what it pays back.",
    "when_it_refuses": "— with no maturity date there are no years to spread the difference over.",
    "shown_on": [
     "/bonds"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0108",
    "date": "2026-08-11",
    "words": "Update master PRD document. Go to master list of what"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0280",
    "date": "2026-08-26",
    "words": "subtract accrued interest when known; say so when not"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-026",
    "words": "An approximation, and labelled an estimate on screen."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "An estimate, and it wears the estimate label."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "FOUNDER 2026-09-27: a CD gets no estimate. It is not traded, so its value does not move with rates; the screen says that instead. KEEP — the app does not ask whether a CD is a bank one or a brokered one."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-053",
    "words": "FACE AND VALUE ARE SHOWN SIDE BY SIDE because they differ, and the difference is the whole point: a bond bought below face pays back more than it is worth today."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-056",
    "words": "IT IS PAID ON FACE, NOT ON VALUE. A $25,000 bond worth $24,200 still pays 4.5% of $25,000 — computing it on the market value understates the income."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-057",
    "words": "WHERE ACCRUED INTEREST WAS NOT ENTERED the row says so beneath the figures rather than quietly leaving it in the price (his ruling, DEC-0280)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-058",
    "words": "AN ESTIMATE, and the foot of the screen says so in those words."
   }
  ]
 }
]
```

## Formulas these cards lean on

1 functions named by the formulas above. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-NW-F-039",
  "name": "buildAssetsState",
  "what_it_is_for": "How much of everything sits in each account, and what return do they blend to?",
  "formula_in_words": "Total = balances added up. Each account's share = its balance ÷ total × 100, or 0 when the total is 0 (an overdrawn account has a negative share; the shares still add to 100). Average target return = each account's target return weighted by its balance; no answer when the total is 0."
 }
]
```
