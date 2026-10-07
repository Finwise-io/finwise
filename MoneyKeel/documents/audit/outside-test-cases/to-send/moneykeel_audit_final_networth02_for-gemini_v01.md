Written for: gemini, as the outside judge of batch "networth 02 final". You have not seen any earlier review of these functions and none is given here: judge them as if for the first time.

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

# The cards — batch "networth 02 final"

24 cards, so 24 formula checks and 120 cases. Put `"batch": "networth 02 final"` in your reply.

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
export type AddWrapper = 'taxable' | '401k' | 'trad_ira' | 'roth' | 'roth_401k' | 'hsa';

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

export type TaxBucket = 'CASH' | 'PRE_TAX' | 'ROTH' | 'TAXABLE' | 'PROPERTY';

export type TaxTreatment = 'taxable' | 'tax_deferred' | 'tax_free';

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
  "id": "MK-NW-F-001",
  "name": "isAlternative",
  "kind": "function",
  "what_it_is_for": "Is this account an \"other investment\" — an alternative held at a manual value (not a bond, not cash/property)?",
  "formula_in_words": "True when the account's class (assetClassOf) is Alternatives.",
  "handed": "export function isAlternative(a: AssetAccount): boolean"
 },
 {
  "id": "MK-NW-F-003",
  "name": "valueFreshness",
  "kind": "function",
  "what_it_is_for": "How many whole months old is a value typed by hand, and is that old enough to ask about it?",
  "formula_in_words": "No answer for an account whose balance is built from its holdings, or one with no value date. Otherwise months old = the whole months that have fully passed since the value date: (years apart × 12 + calendar months apart), less 1 when today's day of the month is before the day the value was set — unless today is the last day of its month, which completes the month for a value set on a day that month does not have (a value set on the last day of January is one month old on the last day of February). A value dated by its month alone counts from the 1st. Never below zero. Stale when 6 or more.",
  "handed": "export function valueFreshness(a: AssetAccount, now: Date = new Date()): { asOf: string; monthsOld: number; stale: boolean } | null",
  "inputs_it_reads": [
   "MK-XS-I-033 the date a hand-typed value was set"
  ]
 },
 {
  "id": "MK-NW-F-004",
  "name": "portfolioActualReturn",
  "kind": "function",
  "what_it_is_for": "What the money set aside for retirement returned over the last twelve months, from the returns the person reported.",
  "formula_in_words": "What the money set aside for retirement returned over the last twelve months — not the return of everything invested. Over accounts that are not property, that have a return for the last twelve months reported by the person (a reported 0 counts; one not reported is left out, never read as 0), and that have some amount set aside for retirement: those returns averaged, each weighted by the amount set aside for retirement (balance × the share set aside). An account with nothing set aside for retirement is not in it. No answer when that total is zero. It is weighted the same way as the plan's benchmark (blendedReturn), because the two are compared.",
  "handed": "export function portfolioActualReturn(accounts: AssetAccount[]): number | null",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-051 what an account actually returned over the last twelve months"
  ]
 },
 {
  "id": "MK-NW-F-005",
  "name": "accountAllowsTicker",
  "kind": "function",
  "what_it_is_for": "Can a share or fund bought by its ticker be recorded in this account?",
  "formula_in_words": "False for property, for cash accounts, for a 529, and for checking and savings. Otherwise true when the account already lists holdings. Otherwise false for an account classed as Bonds & CDs or Alternatives (it is itself one bond, CD or alternative holding typed by hand), and true for everything else.",
  "handed": "export function accountAllowsTicker(a: AssetAccount): boolean",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-007",
  "name": "assetKind",
  "kind": "function",
  "what_it_is_for": "What do we know about this kind of account?",
  "formula_in_words": "Looks a kind up by its id in the app's list of account kinds and returns its entry (name, section, tax bucket, typical yearly return), or nothing when the id is not in the list. The id is matched exactly — capitals and spaces count — because only the app writes these ids; no id, or one typed another way, finds nothing.",
  "handed": "export function assetKind(id?: string)"
 },
 {
  "id": "MK-NW-F-009",
  "name": "maturityClass",
  "kind": "function",
  "what_it_is_for": "FOUNDER RULE 2026-08-04 (supersedes build-34 #8's 12-month split): ANY maturity-dated instrument is a BOND — it pays interest, so it must sit in the measured bucket regardless of how soon it matures.",
  "formula_in_words": "Bonds & CDs when a maturity date is given; cash when none is. An empty or blank date counts as none. It does not look at whether the date has passed.",
  "handed": "export function maturityClass(maturityDate?: string | null): 'cash' | 'bonds'"
 },
 {
  "id": "MK-NW-F-010",
  "name": "wrapperAccount",
  "kind": "function",
  "what_it_is_for": "The person picked how this account is taxed — what does that make it?",
  "formula_in_words": "401(k) → kind 401(k), pre-tax. Traditional IRA → kind Traditional IRA, pre-tax. Roth IRA → kind Roth IRA, Roth. Roth 401(k) → kind 401(k), Roth. HSA → kind HSA, pre-tax. Anything else, or nothing chosen → kind brokerage, taxable.",
  "handed": "export function wrapperAccount(w?: AddWrapper | null): { kind: string; tax_bucket: TaxBucket }",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-011",
  "name": "assetClassOf",
  "kind": "function",
  "what_it_is_for": "What an account is: cash, bonds and CDs, stocks and funds, an alternative, real estate, personal property, or not yet known.",
  "formula_in_words": "The first of these that applies. (1) The class stated on the account. (2) Bonds & CDs if it has a maturity date (owner rule, 2026-08-04: any maturity-dated instrument is a bond) — whatever its name says. (3) The class its name is evidence for. (4) The class of its kind: checking, savings, high-yield savings, cash management and foreign currency are cash; money market and stocks are Stocks / Funds; CD and fixed income are Bonds & CDs; private equity, hedge funds, commodities, crypto, annuities, options and other are Alternatives; home and real estate are Real estate; vehicle is Personal property. (5) Stocks / Funds if it lists holdings. (6) Cash if it is a cash account. (7) If it is property: Real estate when no kind is recorded or its use (lived in, rented, second home, land) is recorded; Personal property for any other kind. (8) Otherwise Unclassified.",
  "handed": "export function assetClassOf(a: AssetAccount): AssetClass",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-012",
  "name": "taxTreatmentOf",
  "kind": "function",
  "what_it_is_for": "How an account's money is taxed: as it is earned, when it comes out, or not at all.",
  "formula_in_words": "The tax treatment stated on the account. Otherwise tax-free for a 529 (what it earns comes out untaxed when used for education). Otherwise tax-deferred for a pre-tax account — an HSA included: it goes in untaxed, and how it comes out depends on its use, which taxWordsOf says in words — tax-free for a Roth account, and taxable for anything else.",
  "handed": "export function taxTreatmentOf(a: AssetAccount): TaxTreatment",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-108",
  "name": "taxWordsOf",
  "kind": "function",
  "what_it_is_for": "How an account is taxed, in the words a person reads on the account's page.",
  "formula_in_words": "The words for how an account is taxed, shown on its page. Where no treatment is stated on the account: a 529 reads tax-free for education; an HSA reads pre-tax — tax-free for medical costs. Otherwise by its treatment (taxTreatmentOf): tax-deferred reads pre-tax — taxed when it comes out; tax-free reads tax-free (Roth); taxable reads taxable.",
  "handed": "export function taxWordsOf(a: AssetAccount): string",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-016",
  "name": "cashTotal",
  "kind": "function",
  "what_it_is_for": "All the cash a person has: every bank account, plus the uninvested cash sitting inside investment accounts.",
  "formula_in_words": "For an account that has a class split (accountClassBreakdown): the cash part of it — a linked account's uninvested cash, or the uninvested cash an account built by hand records for itself. For any other account: its whole balance when its class is cash, otherwise nothing. Added up over every account.",
  "handed": "export function cashTotal(accounts: AssetAccount[]): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-014",
    "words_on_screen": "of essentials covered by your cash — $X cash ÷ $Y/month essentials",
    "unit": "words",
    "what_it_answers": "The sum written out, so the months figure can be checked by eye.",
    "when_it_refuses": "Nothing logged and no plan set.",
    "shown_on": [
     "/analytics"
    ]
   }
  ]
 },
 {
  "id": "MK-NW-F-017",
  "name": "equitiesTotal",
  "kind": "function",
  "what_it_is_for": "Everything classed as Stocks / Funds, wherever it sits — an account that holds several classes gives only its Stocks / Funds part (MK-NW-F-029 assetAllocation).",
  "formula_in_words": "The Stocks / Funds line of the class split (assetAllocation): everything classed as Stocks / Funds, wherever it sits. An account holding several classes gives only its Stocks / Funds part.",
  "handed": "export function equitiesTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-018",
  "name": "fixedIncomeTotal",
  "kind": "function",
  "what_it_is_for": "Everything classed as Bonds & CDs, wherever it sits — an account that holds several classes gives only its Bonds & CDs part (MK-NW-F-029 assetAllocation).",
  "formula_in_words": "The Bonds & CDs line of the class split (assetAllocation): everything classed as Bonds & CDs, wherever it sits. An account holding several classes gives only its Bonds & CDs part.",
  "handed": "export function fixedIncomeTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-019",
  "name": "alternativesTotal",
  "kind": "function",
  "what_it_is_for": "Everything classed as Alternatives, wherever it sits — an account that holds several classes gives only its Alternatives part (MK-NW-F-029 assetAllocation).",
  "formula_in_words": "The Alternatives line of the class split (assetAllocation): everything classed as Alternatives, wherever it sits. An account holding several classes gives only its Alternatives part.",
  "handed": "export function alternativesTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-020",
  "name": "realEstateTotal",
  "kind": "function",
  "what_it_is_for": "Everything classed as Real estate, wherever it sits — an account that holds several classes gives only its Real estate part (MK-NW-F-029 assetAllocation).",
  "formula_in_words": "The Real estate line of the class split (assetAllocation): everything classed as Real estate.",
  "handed": "export function realEstateTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-021",
  "name": "investmentsTotal",
  "kind": "function",
  "what_it_is_for": "The total value of everything invested: stocks and funds, bonds and CDs, alternatives and what is not yet classed, in whatever kind of account they sit, with cash and property left out.",
  "formula_in_words": "The Investments line on Net worth: the Stocks / Funds, Bonds & CDs, Alternatives and Unclassified lines of the class split (assetAllocation), added up. Cash sitting uninvested inside an investment account is on the Cash line (cashTotal), not here; a CD inside a cash account is here. Always: cashTotal + investmentsTotal = investableAssets.",
  "handed": "export function investmentsTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-022",
  "name": "investableAssets",
  "kind": "function",
  "what_it_is_for": "Everything owned except real estate and personal property: cash, investments and retirement balances.",
  "formula_in_words": "The balances of every account that is not a real asset (isRealAsset), added up.",
  "handed": "export function investableAssets(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-025",
  "name": "accountDisplayName",
  "kind": "function",
  "what_it_is_for": "The one name an account is shown by, built from its institution, the kind of account and its last four digits where they are known.",
  "formula_in_words": "The kind word is the account kind's own word (401(k), Traditional IRA, Roth IRA, HSA, 529, Brokerage, Checking and so on); for a tax-advantaged account whose kind says only Brokerage, it is Roth when the account is tax-free and 401(k) / IRA when it is tax-deferred — a tax-advantaged account always shows what it is. With an institution: a tax-advantaged account that has a kind word reads Institution + kind word + -last four (without the digits when unknown); otherwise with digits it reads Institution -last four; otherwise Institution + kind word. With none of those: the account's own name (an account named Imported holding with exactly one holding takes that holding's ticker or name), with the institution in front only if the name does not already contain it, and the mask at the end only if it is not already there.",
  "handed": "export function accountDisplayName(a: Pick<AssetAccount, 'label' | 'institution' | 'mask'> & { positions?: unknown[]; kind?: string; tax_bucket?: TaxBucket; tax_treatment?: TaxTreatment }): string",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-026",
  "name": "accountDisplayNames",
  "kind": "function",
  "what_it_is_for": "The name each account in a list is shown by, with no two alike.",
  "formula_in_words": "Each account gets its display name (accountDisplayName). Where two or more accounts end up with the same name, each gets · 1, · 2 and so on added, in the order of their account ids read as text (an id is made by the app from the moment the account was created, so that is the order they were made). A numbered name that is already another account's name is skipped, so no two accounts are ever shown by the same name.",
  "handed": "export function accountDisplayNames(accounts: (Pick<AssetAccount, 'asset_id' | 'label' | 'institution' | 'mask'> & { positions?: unknown[] })[]): Map<string, string>",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name"
  ]
 },
 {
  "id": "MK-NW-F-109",
  "name": "holdingClassOf",
  "kind": "function",
  "what_it_is_for": "What one holding inside an account is, by the one rule the split, the words under it and the account's page all use.",
  "formula_in_words": "The class of one holding inside an account. (1) If the person said what it is, their answer. (2) If it is marked as asked — nothing could class it and the person has not answered — Unclassified (owner rule, 2026-09-30: \"Refuse the line and ask\"). (3) The class its ticker and name are evidence for, unless that is cash: a money-market fund is Stocks / Funds, a CD or a T-bill is Bonds & CDs, whatever tag the broker sent (owner rule, 2026-08-04: cash means cash only). (4) Otherwise the class stored when it arrived: bond → Bonds & CDs, other → Alternatives, cash → cash, anything else → Stocks / Funds.",
  "handed": "export function holdingClassOf(p: any): AssetClass",
  "inputs_it_reads": [
   "MK-XS-I-010 transaction words (the institution's own wording)",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-056 how a holding was classified, and by whom"
  ]
 },
 {
  "id": "MK-NW-F-027",
  "name": "accountClassBreakdown",
  "kind": "function",
  "what_it_is_for": "How much of one account sits in each class, with the parts adding up exactly to the account's balance.",
  "formula_in_words": "LINKED ACCOUNT. Cash = its cash balance. Each holding with a price = shares × last price, filed under its class (holdingClassOf). Each option = its value as synced, under Alternatives (an option is valued when it is synced, at contracts × price per share × 100 — owner, 2026-08-26). If the parts come to less than the balance and one or more holdings have NO price: the whole difference is filed under the unpriced holdings' class when they share one, and under Unclassified when they span classes — never under cash. Otherwise, if the parts do not add up to the balance: a difference no bigger than the larger of $1 or 1% of the balance is added to cash when positive (owner rule, 2026-08-11), or taken off the largest class when negative; a bigger one is put under the account's own class (assetClassOf). ACCOUNT BUILT BY HAND (its balance is built from its own records, it is not a cash or property account, and it records uninvested cash above zero): cash = that uninvested cash, never more than the balance; the rest of the balance stays whole under the account's own class. ANY OTHER ACCOUNT — a typed balance, a bank account, a recorded cash figure of zero or below — gets no answer. The parts always add up to the balance.",
  "handed": "export function accountClassBreakdown(a: AssetAccount): Record<AssetClass, number> | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-034 option positions — contracts, strike, expiry, put or call"
  ]
 },
 {
  "id": "MK-NW-F-028",
  "name": "classPortionLabel",
  "kind": "function",
  "what_it_is_for": "The words under an account's name saying what it holds of one class — \"3 CDs & 1 Treasury in this account\".",
  "formula_in_words": "The words for one class inside one account, counting the holdings of that class (holdingClassOf — the same test the dollars beside the words were split by). Cash: cash in this account. Bonds: counts the holdings whose name has the whole word CD (or certificate of deposit), those whose name has the whole word Treasury (or T-bill, T-note, government), capitals ignored, and the rest as bonds; a count of one is singular, a count of zero is left out, two parts are joined with &, three as A, B & C — for example 3 CDs & 1 Treasury in this account, or 1 CD, 1 Treasury & 2 bonds in this account — or bonds & CDs in this account when none are listed. Stocks: N holdings in this account (1 holding), or stocks & funds in this account when none are listed. Alternatives: N options & N holdings in this account, each part left out when its count is zero (an option is one option position, however many contracts), or alternatives in this account. Any other class: unpriced portion of this account.",
  "handed": "export function classPortionLabel(a: AssetAccount, cls: AssetClass): string",
  "inputs_it_reads": [
   "MK-XS-I-034 option positions — contracts, strike, expiry, put or call"
  ]
 },
 {
  "id": "MK-NW-O-003",
  "name": "theNetWorth",
  "kind": "orchestrator",
  "what_it_is_for": "What am I worth: everything I own, less everything I owe, and how each breaks down?",
  "formula_in_words": "Assets = every account's balance added up. Debts = every debt's remaining balance added up. Net worth = assets − debts. Cash = cashTotal. Investments = investmentsTotal: the investment classes of the class split added up (Stocks / Funds, Bonds & CDs, Alternatives, Unclassified, from assetAllocation) — so a linked account's uninvested cash is in Cash only, and Cash + Investments + property comes to everything owned. Investable = investableAssets. By class = assetAllocation. Each debt is listed with its balance and its required monthly payment (the larger of its minimum and the payment the person says they make); monthly debt payments = those added up; monthly debt minimum = the minimums alone added up. Return on cash + investments = a TIME-WEIGHTED return (owner decision, 2026-10-04: \"All return should be True Weighted Return and not Dietz return.\") over every account that is not property: the period from the day compared from to today is split at every day money moved in or out; each piece = the value just before the next movement ÷ the value just after the last one; the pieces are multiplied and 1 is taken off; returned as a share. A month given without a day is read as its first day. Cash earns only interest: any other change in a cash account's balance is money moving, counted on the day the record first shows it. For the other accounts, money moving = deposits, withdrawals and cash transferred between accounts. Today's value is read from the accounts as they stand. No figure when no day is given, when no recorded day on or before the day compared from holds the accounts, when money moved on a day with no recorded value, or when shares were moved in or out. It also hands out the match of mortgages to properties (mortgagesByProperty). It also names the holdings nothing could class and the person has not yet answered about (account, holding), and the sentence that asks.",
  "handed": "export function theNetWorth(input: {\n  uid: string;\n  accounts: AssetAccount[];\n  debts: Debt[];\n  /** The recorded history, for the line and the return. */\n  monthlyHistory?: Record<string, unknown> | null;\n  dailyNetWorth?: Record<string, unknown> | null;\n  /** The daily record of what each account was worth, and every record of money moving — what the\n   *  return on cash + investments is measured from. */\n  snapshotDays?: any[] | null;\n  transactions?: any[] | null;\n  /** The day a change is measured FROM. With none, the change figures refuse. */\n  since?: string | null;\n  /** Today, as a day. The screen's own day when it gives one. */\n  today?: string;\n}): TheNetWorth",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-014 debt balance",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-056 how a holding was classified, and by whom"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-016",
    "words_on_screen": "Total invested · Cash total · Investable total",
    "unit": "money",
    "what_it_answers": "The three totals Insights reasons about — and they are the SAME three the Net worth tab shows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-001",
    "words_on_screen": "Change in net worth +$X",
    "unit": "money",
    "what_it_answers": "How much your net worth has moved since the day the line starts.",
    "when_it_refuses": "A line needs at least two points; with one, the point is shown and no change is stated.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-002",
    "words_on_screen": "Return on cash + investments",
    "unit": "percent-2dp",
    "what_it_answers": "How much your cash and investments have grown since the day you are comparing against, with money you added or took out left out.",
    "when_it_refuses": "No figure: the record does not reach back to the day compared from, or money moved on a day with no recorded value.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-003",
    "words_on_screen": "the trend line",
    "unit": "count",
    "what_it_answers": "How many points the line is drawn from — the months on record plus the days after them.",
    "when_it_refuses": "With one point the point is shown and the line is not drawn.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-004",
    "words_on_screen": "WHAT YOU OWN",
    "unit": "money",
    "what_it_answers": "Everything you own, added up.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-005",
    "words_on_screen": "CASH",
    "unit": "money",
    "what_it_answers": "The money you could spend today.",
    "when_it_refuses": "No cash account entered.",
    "shown_on": [
     "/analytics",
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-006",
    "words_on_screen": "🏠 PERSONAL PROPERTY",
    "unit": "money",
    "what_it_answers": "What one band under WHAT YOU OWN holds — here the vehicles and valuables.",
    "when_it_refuses": "The band shows $0 and, on a fresh account, the one line \"Nothing entered yet. Add your accounts ›\".",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-007",
    "words_on_screen": "class rows — by class, institution or type",
    "unit": "money",
    "what_it_answers": "What each kind of thing you own is worth.",
    "when_it_refuses": "A class with nothing in it keeps its heading and says so.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-008",
    "words_on_screen": "each account and its balance",
    "unit": "money",
    "what_it_answers": "One line per account inside a band, with what that account holds.",
    "when_it_refuses": "$0, and on a fresh account the one line \"Nothing entered yet. Add your accounts ›\". A real entered zero shows a plain $0 with no line.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-009",
    "words_on_screen": "DEBTS",
    "unit": "money",
    "what_it_answers": "Everything you owe.",
    "when_it_refuses": "No debts entered.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-010",
    "words_on_screen": "each debt and what is left on it",
    "unit": "money",
    "what_it_answers": "One line per debt, and what is still owed on it.",
    "when_it_refuses": "None entered.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-011",
    "words_on_screen": "minimum monthly payment on a debt",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What this debt requires of you each month.",
    "when_it_refuses": "No minimum entered.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-012",
    "words_on_screen": "Monthly debt payments",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What all your debts require of you in a month, together.",
    "when_it_refuses": "No debts entered.",
    "shown_on": [
     "/analytics",
     "/home"
    ]
   },
   {
    "id": "MK-NW-M-015",
    "words_on_screen": "YOUR RETIREMENT PLAN — on track for $X by age Y",
    "unit": "money",
    "what_it_answers": "What your pot is on course to be worth at the age you said you would retire.",
    "when_it_refuses": "No figure when there is nothing to grow, or when retirement is not ahead of the person.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-016",
    "words_on_screen": "Net worth so far (setup)",
    "unit": "money",
    "what_it_answers": "What you are worth as the setup answers stand, before anything else is entered.",
    "when_it_refuses": "Adds to $0 when there is nothing to add. Zero and \"nothing recorded yet\" read alike on screen — worth a decision.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-017",
    "words_on_screen": "Assets $X − Debts $Y = Net worth $Z",
    "unit": "words",
    "what_it_answers": "The whole sum in one line, so it can be checked by eye.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-049",
    "words_on_screen": "Total value",
    "unit": "money",
    "what_it_answers": "What your alternatives are worth — crypto, private equity, commodities and the rest.",
    "when_it_refuses": "None entered yet.",
    "shown_on": [
     "/other-investments"
    ]
   },
   {
    "id": "MK-NW-M-063",
    "words_on_screen": "what is inside this institution",
    "unit": "money-compact",
    "what_it_answers": "What this one institution holds, broken down by kind, so a roll-up can be read rather than taken on trust.",
    "when_it_refuses": "One kind only — the line is left out, because a roll-up of one thing is just the thing.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-XS-M-001",
    "words_on_screen": "Net worth",
    "unit": "money",
    "what_it_answers": "Everything you own, less everything you owe.",
    "when_it_refuses": "Nothing entered yet — it says so and offers the door, rather than showing $0 as a fact.",
    "shown_on": [
     "/home",
     "/analytics"
    ]
   },
   {
    "id": "MK-XS-M-003",
    "words_on_screen": "YOUR INVESTMENTS",
    "unit": "money",
    "what_it_answers": "What your invested money is worth — stocks, funds, bonds and alternatives.",
    "when_it_refuses": "Nothing invested yet.",
    "shown_on": [
     "/home",
     "/analytics"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0010",
    "date": "2026-07-28",
    "words": "\"yes\" — DEC-0010, confirmed as written: Chart colors: the UX doc’s validated colorblind-safe palettes WILL BE ADOPTED app-wide (one consistent set; e.g. Cash ge"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0023",
    "date": "2026-08-01",
    "words": "Cash and cash equivalents"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0047",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0047, confirmed as written: BY TYPE view REMOVED (founder — resolves the open By-type question); WHAT YOU OWN restructures to the three uber-categor"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0048",
    "date": "2026-08-04",
    "words": "Your path ahead (from your Plan)"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0051",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0051, confirmed as written: CLASSIFICATION RULE: cash = cash only. Money-market funds → Stocks/ETFs; CDs/T-bills → Bonds & CDs (any maturity). Super"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0054",
    "date": "2026-08-04",
    "words": "calculating NW % on total is not meaningful — property increments are hand-captured."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0060",
    "date": "2026-08-04",
    "words": "build all the approved NW"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0061",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0061, confirmed as written: MISSING-DATA BANNER + FIX-IT SHEET BUILT: new dataGaps engine (5 checks — unpriced holding · stale connection · no divid"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0066",
    "date": "2026-08-10",
    "words": "NW Main Screen"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0069",
    "date": "2026-08-10",
    "words": "\"yes\" — DEC-0069, confirmed as written: BY INSTITUTION REBUILT to match By category: institution groups now collapse and expand, keep their own open/closed memo"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0070",
    "date": "2026-08-10",
    "words": "Connect a brokerage"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0072",
    "date": "2026-08-11",
    "words": "order classes by LIQUIDITY, cash first"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0074",
    "date": "2026-08-11",
    "words": "it will give user view of what they can do in the app"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0089",
    "date": "2026-08-11",
    "words": "What you own bar - does not change to institution when I toggle to institution from category."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0090",
    "date": "2026-08-11",
    "words": "seems repetitive as it is already listed under CDs and Bonds asset class... can we add the number and say 3 CD & 1 treasury bond in this account?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0091",
    "date": "2026-08-11",
    "words": "the colors for different types of debt not friendly for color blind people."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0092",
    "date": "2026-08-11",
    "words": "we decided to move money markets and T-bills to stock/etf and bond & CD respectively."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0095",
    "date": "2026-08-11",
    "words": "why is cash added to CD and not cash?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0096",
    "date": "2026-08-11",
    "words": "$500 is what I added manually as a deposit to the Vanguard account. It never asked me if it was in cash or something else?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0158",
    "date": "2026-08-14",
    "words": "It is too harsh."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0165",
    "date": "2026-08-14",
    "words": "how to avoid this in the next brief?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0166",
    "date": "2026-08-14",
    "words": "not sure what you want me to check here."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0192",
    "date": "2026-08-28",
    "words": "s number was its POSITION in a list — nid() counted up as it walked them — so inserting a row silently renumbered every metric after it in that family. 93 audit findings are keyed to those numbers, as are the founder"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0264",
    "date": "2026-09-09",
    "words": "full precision for calculation; display two decimals unless stated (whole dollars for totals, balances, projections; eight for coin quantities); fix the code in one pass"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0301",
    "date": "2026-08-20",
    "words": "source always, date only when stale"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0309",
    "date": "2026-08-20",
    "words": "money-market: name-first classification on every road, broker tag as fallback; a class change between syncs is kept and flagged"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0311",
    "date": "2026-08-20",
    "words": "14 metrics cut: tax-loss harvesting, cash drag, age of money, savings rate, safe to spend, personal inflation, sequence buffer, drift, funded ratio, risk measures, look-through, fund fees, embedded tax, employer-stock flag"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0322",
    "date": "2026-08-20",
    "words": "status disagreements, work-list generation, engine counts, tab references, the PINNED word — all in the old metrics deliverable"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0343",
    "date": "2026-09-13",
    "words": "one concept, one function — a concept is computed by exactly one dependent function, called over whatever set it is asked about (total assets over all accounts, and over one institution's accounts, is the same function); a total and the sum of its parts are pinned by an invariant test, never assumed"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0345",
    "date": "2026-09-13",
    "words": "inputs assembled once per family — one function builds the person's state for a family and every orchestrator in that family reads it; no orchestrator and no screen assembles its own"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0347",
    "date": "2026-09-13",
    "words": "shared dependent functions are allowed and are recorded on every orchestrator row whose closure holds them; the closure is generated from the code, never typed"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0397",
    "date": "2026-08-26",
    "words": "enforce with GATES not intentions."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0403",
    "date": "2026-09-09",
    "words": "held as a float, decimals shown only for prices…"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0442",
    "date": "2026-06-30",
    "words": "The networth module missed an ability to edit bonds, cash and alternatives, also manually add transactions. Ability to add transactions was only available for stocks/etfs. The import feature does it work for alternatives such as options, crypto, currency, commodities? Does the ability to read different file formats from different insitutions via plaid api?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0446",
    "date": "2026-06-30",
    "words": "ensure to import institution name as well."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0449",
    "date": "2026-06-30",
    "words": "Which kind T-bills will be? And what is HYSA?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0451",
    "date": "2026-06-30",
    "words": "cash means cash+ cashequivalents?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0452",
    "date": "2026-06-30",
    "words": "why is value any versus float?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0455",
    "date": "2026-06-30",
    "words": "What's the cost differential?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0501",
    "date": "2026-06-30",
    "words": "Also talk about surfacing the right things at the right time ('what needs you')."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0509",
    "date": "2026-06-30",
    "words": "Home: how do you capture the information?"
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-016",
    "words": "Insights took these its own way before 2026-09-27; his ruling on Q-NW-1 made all three screens read one answer."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-001",
    "words": "IT IS READ FROM THE RECORD, never back-solved: the months we actually saved and the daily points after them."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-001",
    "words": "A month and its own days live in one series, sorted by their date text — \"2026-04\" sorts before \"2026-04-30\", which is what makes plain text sorting safe."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-002",
    "words": "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\" It was a change in balance, so money paid in read as money earned."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-002",
    "words": "THE DAY COMPARED FROM MUST BE ON RECORD. A comparison from before the record begins gives no figure — never one quietly measured from a later day."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-002",
    "words": "CASH EARNS ONLY INTEREST. A paycheck arriving or a bill being paid is money moving, counted on the day the record first shows it."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-003",
    "words": "A DAY THAT IS NOT A REAL DATE IS DROPPED, and a month whose figures do not add up is dropped — never drawn as a guess."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-003",
    "words": "The line is drawn only from days we hold a record for; today’s balances are never priced at past dates."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-005",
    "words": "A CD and a money-market fund are NOT cash: they are bonds and funds, because they pay interest and dividends that must be measured (founder, 2026-08-04)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "REAL ESTATE IS ITS OWN BAND: a house is not a vehicle, and mixing them hides both."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "THE SAME ACCOUNTS GROUP TWO WAYS — by class and by institution — and both ways add to the same total, so switching the view can never change what you own."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "An account with no institution recorded groups under \"No institution set\" rather than being dropped."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-008",
    "words": "UNDER AN INSTITUTION’S NAME, the class mix inside it is named too — a Fidelity holding a fund and a Treasury reads as a roll-up, not a flat lump."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-008",
    "words": "The mix is ordered biggest first, so the largest thing inside an institution is the first thing read."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-011",
    "words": "FOUNDER RULING G19 (2026-09-08): one payment rule, the larger of the stated minimum and the payment set — the same words in both formula columns."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "NO RANDOM RUNS ANYWHERE IN THIS ONE — it is the straight-line check that sits beside the 1,000-run odds, and the two answer different questions."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "The recommended pot is 25× the yearly expenses NOT covered by guaranteed income, counted from the start of the retirement year — which is why it differs from an outside calculator (his ruling)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "Guaranteed income starts at the age it was said to start, not at the retirement age."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-016",
    "words": "IT IS COMPUTED EACH TIME AND NEVER STORED as a third number that could disagree with its own two halves (his ruling)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-016",
    "words": "A GENUINE NEGATIVE IS SHOWN, never floored at zero — someone early in a mortgage really does owe more than they own."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-049",
    "words": "It is the Alternatives SLICE of net worth and must equal what the Net worth tab shows for that class — which is why it sits behind this door (founder, 2026-09-27: \"ok\")."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "BIGGEST FIRST, so the largest thing inside an institution is the first thing read."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "SHORTENED, because several of these share one line. It is the only place the app shortens a figure, and it is shortened only to fit — never to round a figure a person is checking."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "THE PARTS ADD TO THE INSTITUTION’S OWN TOTAL above them, which is the point of showing them."
   }
  ],
  "approved_drawing": {
   "drawing": "Net worth, Quiet Instrument v08, state A (approved 2026-09-14)",
   "household": "Chase Checking $8,000 (a bank account). Vanguard Brokerage $349,333, of which $838 is uninvested cash and $348,495 is stocks and funds. E*TRADE bonds and CDs $5,819. Home $450,000. Debts: home mortgage $412,000, Chase Visa $6,000.",
   "drawn": {
    "Cash": 8838,
    "Investments": 354314,
    "Personal property": 450000,
    "What you own": 813152,
    "Debts": 418000,
    "Net worth": 395152
   }
  }
 },
 {
  "id": "MK-NW-O-008",
  "name": "thePerformance",
  "kind": "orchestrator",
  "what_it_is_for": "How are my investments doing over a period: where they started, what I put in and took out, what they made, where they ended, and the return?",
  "formula_in_words": "Records of the period = those dated on or after its first day; contributions, withdrawals, dividends and interest are their totals. Contributions also count cash or shares transferred in from an account that is not one of those measured, and the first recorded value of an account that joined the record inside the period (its own records up to that day are then not counted again); withdrawals also count cash or shares transferred out. A transfer between two measured accounts is neither. THE BEGINNING IS READ from the daily record at the day BEFORE the period opens, and only when investment accounts are named and the record's first day is on or before that day; the value read is the last recorded day on or before it. If it cannot be read: beginning = ending − priced gain − contributions + withdrawals (priced gain counts as 0 when the period opens today), and NO percent of any kind is given. Walk: wealth generated = ending − beginning − contributions + withdrawals; change in investment value = wealth generated − dividends − interest. Records counted are those of the investment accounts named (a record on any other account is not money put into these investments). Return = a TIME-WEIGHTED return (owner decision, 2026-10-04: \"All return should be True Weighted Return and not Dietz return.\"): the period, starting at the last recorded day on or before the day before it opens, is split at every day money moved in or out of those accounts; each piece = the value just before the next movement ÷ the value just after the last one; the pieces are multiplied and 1 is taken off. The record holds one value a day, taken after that day's money moved, so the value just before a movement = that day's value − the movement. Money moving = deposits (in), withdrawals (out), cash transferred between accounts (out of the first, into the second), and shares moved in or out at what they were worth (the amount, or shares × price) when the record says which way they went. Ending = what the measured accounts are worth today, each counted whole (its balance, uninvested cash inside it included), read from the accounts handed in — a figure handed in beside them is not used, so no two screens can give two endings; with no accounts handed in, the ending handed in is used and closes the record. Today's value for the return is read from the same accounts. An account that first appears in the record inside the period counts as money in, at its first recorded value. A recorded day that is missing an account with holdings is not used; a typed balance stands until it is next recorded. It REFUSES — no percent, a sentence saying why, never another method — when: the beginning cannot be read; money moved on a day with no recorded value; a movement has no date; shares were moved in or out and the record does not say which way or what they were worth; the value on a day is less than the money added that day; or nothing was invested. For a period longer than one year (days ÷ 365 above 1), unless it is the whole-record Since period, the figure shown is the yearly rate (1 + return) to the power 1 ÷ years, − 1.",
  "handed": "export function thePerformance(input: {\n  /** The window's first day, or null for \"since the record began\". */\n  windowStart: string | null;\n  /** The words for that window, as the screen says them (\"since Jul 19\"). */\n  windowLabel: string;\n  today: string;\n  /** What the measured accounts are worth now — used ONLY when no accounts are handed over. With\n   *  accounts, the function reads it from them, so no two screens can hand it two different figures. */\n  ending?: number;\n  /** Every record, unfiltered — the door takes the window's own. */\n  transactions: any[];\n  /** The daily record, and which accounts count as investments. */\n  snapshotDays: any[];\n  investmentAccountIds: Set<string>;\n  /** What the priced holdings gained over the window — used ONLY to derive a beginning the record\n   *  cannot reach. It never becomes the return. */\n  pricedGain: number;\n  /** True for \"Since\" — the whole record. Its return is the window's OWN total and is never turned\n   *  into a yearly rate (Performance v17, phone 3: \"Since Jun 3, 2024 +16.24% … not a yearly rate\").\n   *  A fixed window longer than a year (2Y) still shows the yearly rate. */\n  wholeRecord?: boolean;\n  /** The accounts as they stand now. Today's values are read from them, so the last day of the\n   *  return is measured the same way every recorded day was — and an account added today is seen\n   *  as arriving today, not as a gain. */\n  accounts?: any[];\n}): WindowFigures",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
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
 }
]
```

## Formulas these cards lean on

5 functions named by the formulas above. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-NW-F-014",
  "name": "isRealAsset",
  "what_it_is_for": "Whether an account is a physical asset, meaning real estate or personal property.",
  "formula_in_words": "True when the account's class (assetClassOf) is Real estate or Personal property."
 },
 {
  "id": "MK-NW-F-029",
  "name": "assetAllocation",
  "what_it_is_for": "How much money sits in each of the seven classes?",
  "formula_in_words": "The value in each asset class across every account. A linked account is split by its class breakdown (accountClassBreakdown); any other account counts whole under its one class (assetClassOf)."
 },
 {
  "id": "MK-NW-F-034",
  "name": "benchmarkReturn",
  "what_it_is_for": "Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default.",
  "formula_in_words": "The person's own yearly rate for that kind where they set one. Otherwise the app's typical yearly return for the kind: checking 0.5%, savings 2.4%, high-yield savings 4.2%, money market 4.5%, CD 4.2%, cash management 3.5%, foreign currency 0%, brokerage 8%, stocks and funds 10.4%, fixed income 4.2%, crypto 8%, private equity 13%, hedge funds 6%, gold and commodities 8.2%, options 5%, annuities 4.5%, 529 7%, other 5%, 401(k), IRA, Roth IRA and HSA 7.9%, home 4.5%, vehicle −5%. 6% for a kind that is unknown or missing."
 },
 {
  "id": "MK-NW-F-037",
  "name": "blendedReturn",
  "what_it_is_for": "Blended expected return across the EARMARKED nest egg, weighted by each holding's share.",
  "formula_in_words": "Over accounts that are not property: the benchmark yearly rate of each account's kind (benchmarkReturn), averaged, weighted by its earmarked amount. 6% when nothing is earmarked."
 },
 {
  "id": "MK-NW-F-106",
  "name": "mortgagesByProperty",
  "what_it_is_for": "Which mortgage is on which property, and which mortgages are on none.",
  "formula_in_words": "Properties = the accounts whose class is real estate. Mortgages = the debts whose type is mortgage. Owner rule, 2026-10-04: \"It is feasible to have property without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less mortgage.\" A mortgage is on the property it names, when that property exists and has no mortgage placed on it yet. A mortgage that names no property is placed only where there is one answer: first, on the one property without a mortgage whose name its own name begins with; then, when exactly one property is still without a mortgage and exactly one mortgage is still without a property, on that property. Every other mortgage is listed as on no property — including a second mortgage that names a property already taken. It gives: the count of properties and of mortgages; for each property its mortgage (or none) and that mortgage's required monthly payment; the mortgages on no property; whether there are none of those; and the sentence to show when there are."
 }
]
```
