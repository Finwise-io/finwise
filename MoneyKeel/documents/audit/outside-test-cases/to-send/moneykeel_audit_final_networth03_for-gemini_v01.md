Written for: gemini, as the outside judge of batch "networth 03 final". You have not seen any earlier review of these functions and none is given here: judge them as if for the first time.

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

# The cards — batch "networth 03 final"

17 cards, so 17 formula checks and 85 cases. Put `"batch": "networth 03 final"` in your reply.

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

export interface AssetsState {
  user_id: UserId;
  total_asset_value: number;
  average_target_return: number | null;   // null when nothing is held
  accounts: (AssetAccount & { portfolio_percentage: number })[];
}

export interface BondInfo { face: number; couponRate: number; maturity: string; value: number; accruedInterest?: number | null; }

export interface HistoryCoverage {
  kind: 'none' | 'partial';
  from: string | null;            // where the shared history actually begins
  monthsCovered: number | null;   // how much of the claimed window is really covered
  sentence: string;               // the one plain sentence a screen shows
}

export interface ItemHolding {
  cls: ItemClass;
  label: string;
  value: number;
  ticker?: string;                 // stocks_etf (optional — surfaced in the label)
  couponRate?: number;             // bonds (decimal)
  maturityDate?: string;           // bonds ('YYYY-MM-DD')
  kind?: string;                   // alternatives sub-kind (crypto/options/…); defaults per class
  faceValue?: number;              // bonds — what it pays back at maturity, when the person knows it; never invented
}

export type UberGroup = 'cash' | 'investments' | 'property';
```

## The cards

```json
[
 {
  "id": "MK-NW-F-060",
  "name": "approxYTM",
  "kind": "function",
  "what_it_is_for": "Approximate yield to maturity (standard approximation), decimal.",
  "formula_in_words": "(Yearly interest + (face − value) ÷ years left) ÷ ((face + value) ÷ 2). Nothing when there is no maturity date, the bond has matured, its value is zero or less, or no face value is on record.",
  "handed": "export function approxYTM(b: BondInfo, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-029",
  "name": "assetAllocation",
  "kind": "function",
  "what_it_is_for": "How much money sits in each of the seven classes?",
  "formula_in_words": "The value in each asset class across every account. An account with a class split (accountClassBreakdown) — a linked account, or an account built by hand that records its own uninvested cash — is split by it; any other account counts whole under its one class (assetClassOf). The seven classes add to everything owned, and the Cash class is cashTotal.",
  "handed": "export function assetAllocation(accounts: AssetAccount[]): Record<AssetClass, number>",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-030",
  "name": "earmarkDefault",
  "kind": "function",
  "what_it_is_for": "Default % of an account that's earmarked for retirement (rest funds other goals).",
  "formula_in_words": "The share of an account counted towards retirement by default: 0% for a 529, for a primary home and for the primary car; 100% for everything else.",
  "handed": "export function earmarkDefault(a: AssetAccount, primaryCarId?: string): number",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-031",
  "name": "primaryCarIdOf",
  "kind": "function",
  "what_it_is_for": "The vehicle treated as \"the car you drive\" — the most valuable one, so a second car stays a real asset.",
  "formula_in_words": "Among the accounts whose kind is vehicle, and no other: the one with the largest balance; a tie goes to the lower id read as text (the one made first). Nothing when there is no vehicle. Valuables and other personal property are never the car.",
  "handed": "export function primaryCarIdOf(accounts: AssetAccount[]): string | undefined",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-032",
  "name": "earmarkedAmount",
  "kind": "function",
  "what_it_is_for": "The retirement-earmarked $ for one account (uses the saved % or the smart default).",
  "formula_in_words": "Balance × the share earmarked for retirement. The share is the one stated on the account, held between 0% and 100%, or the default (earmarkDefault) when none is stated.",
  "handed": "export function earmarkedAmount(a: AssetAccount, primaryCarId?: string): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-050 the share of an account earmarked for retirement"
  ]
 },
 {
  "id": "MK-NW-F-033",
  "name": "retirementEarmarkedValue",
  "kind": "function",
  "what_it_is_for": "Total nest egg = sum of each account's retirement-earmarked portion.",
  "formula_in_words": "Every account's earmarked amount (earmarkedAmount) added up, with the primary car found by primaryCarIdOf.",
  "handed": "export function retirementEarmarkedValue(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-034",
  "name": "benchmarkReturn",
  "kind": "function",
  "what_it_is_for": "Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default.",
  "formula_in_words": "The person's own yearly rate for that kind where they set one — a rate of exactly 0 counts as set. Otherwise the app's typical yearly return for the kind: checking 0.5%, savings 2.4%, high-yield savings 4.2%, money market 4.5%, CD 4.2%, cash management 3.5%, foreign currency 0%, brokerage 8%, stocks and funds 10.4%, fixed income 4.2%, crypto 8%, private equity 13%, hedge funds 6%, gold and commodities 8.2%, options 5%, annuities 4.5%, 529 7%, other 5%, 401(k), IRA, Roth IRA and HSA 7.9%, home 4.5%, vehicle −5%. 6% for a kind that is unknown or missing. A kind is matched exactly as the app writes it; capitals count.",
  "handed": "export function benchmarkReturn(kind: string | undefined, overrides?: Record<string, number>): number",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-035",
  "name": "blendedVolatility",
  "kind": "function",
  "what_it_is_for": "The volatility of THIS portfolio — each account's own class volatility, weighted the way the money actually is (the same weighting `blendedReturn` uses, so the pair always describes one portfolio).",
  "formula_in_words": "Over exactly the accounts the nest egg counts: each account's volatility — the person's own figure for its kind, else the app's figure for the kind, else 12% — averaged, weighted by its earmarked amount. 12% when nothing is earmarked.",
  "handed": "export function blendedVolatility(accounts: AssetAccount[], overrides?: Record<string, number>): number",
  "inputs_it_reads": [
   "MK-XS-I-035 annuity income",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-036",
  "name": "benchmarkInfo",
  "kind": "function",
  "what_it_is_for": "Benchmark return + its source/period for an asset kind.",
  "formula_in_words": "The rate from benchmarkReturn, with where it came from. Edited = the person set a rate for that kind (0 included): then the source reads Your custom estimate and the period is blank. Otherwise the source and period on record for that kind, and estimate = whether that record is marked an assumption rather than a measured index; a kind with no record reads Generic blended estimate, period blank, estimate true.",
  "handed": "export function benchmarkInfo(kind: string | undefined, overrides?: Record<string, number>): { ret: number; source: string; period: string; edited: boolean; estimate: boolean }",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-037",
  "name": "blendedReturn",
  "kind": "function",
  "what_it_is_for": "Blended expected return across the EARMARKED nest egg, weighted by each holding's share.",
  "formula_in_words": "Over exactly the accounts the nest egg counts (every account, each weighted by its earmarked amount — the home lived in, the car driven and a 529 weigh nothing by default, a rental weighs its full value): the benchmark yearly rate of each account's kind (benchmarkReturn), averaged, weighted by its earmarked amount. No answer when the earmarked total is zero — the Plan then chooses its own 6% at its call site, and says so there.",
  "handed": "export function blendedReturn(accounts: AssetAccount[], overrides?: Record<string, number>): number | null",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-039",
  "name": "buildAssetsState",
  "kind": "function",
  "what_it_is_for": "How much of everything sits in each account, and what return do they blend to?",
  "formula_in_words": "Total = balances added up. Each account's share = its balance ÷ total × 100, or 0 when the total is 0 (an overdrawn account has a negative share; the shares still add to 100). Average target return = each account's target return weighted by its balance; no answer when the total is 0.",
  "handed": "export function buildAssetsState(uid: UserId, accounts: AssetAccount[]): AssetsState",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-028 assumed return"
  ]
 },
 {
  "id": "MK-NW-F-041",
  "name": "monthlyContributionsFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Total monthly contributions across types + employer match (feeds the retirement projection).",
  "formula_in_words": "No answer when none of the contribution questions was answered (401(k), Roth, investing, employer match). Otherwise, a month's retirement contributions = the 401(k) amount, held at the year's elective limit for the person's age ÷ 12 (2026: $24,500 under 50, $32,500 at 50 to 59 and 64 and over, $35,750 at 60 to 63), + the Roth amount as entered (the question does not say Roth IRA or Roth 401(k), whose limits differ, so it is not held at either), + the investing amount, + the employer's match for a month (the stated share of the 401(k) amount, or the stated dollars). Money saved toward a property (an older setup question) is not a retirement contribution and is left out. The age is the one attained this year, from the birth year.",
  "handed": "export function monthlyContributionsFromOnboarding(op: Record<string, any> | null): number | null",
  "inputs_it_reads": [
   "MK-XS-I-017 birth year",
   "MK-XS-I-043 their own retirement contribution",
   "MK-XS-I-046 how the employer match is expressed — percent or dollars"
  ]
 },
 {
  "id": "MK-NW-F-045",
  "name": "sourceWording",
  "kind": "function",
  "what_it_is_for": "The words saying where an account's numbers come from, which are Linked, Imported or By hand, with a date added only when the numbers are stale.",
  "formula_in_words": "Linked account: Linked — or Linked · N days old when its last successful update is 4 or more days old, and Linked · not updated yet when no update is on record (no age is invented). Imported account: Imported, by the same test. Anything else: By hand · you update it. The timestamp read is the account's last successful sync.",
  "handed": "export function sourceWording(a: AssetAccount, now: number = Date.now()): string",
  "inputs_it_reads": [
   "MK-XS-I-006 price fetched at",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-046",
  "name": "historyCoverage",
  "kind": "function",
  "what_it_is_for": "Says how far back one account's activity records reach, set against the period being asked about, in a sentence a person can read.",
  "formula_in_words": "Entered by hand: a sentence saying it has no activity records. Linked with no history start on record: a sentence saying none has been shared yet. History starting on or before the period's first day: nothing to say. Otherwise: months covered = the whole months from the history start to today plus the part month (days ÷ the days in that month), to one decimal; the sentence names the start date and says N years only when the months are an exact multiple of twelve, N years M months when twelve or more, N months when one or more, otherwise a few days. It never rounds up to a year.",
  "handed": "export function historyCoverage(\n  a: AssetAccount,\n  windowStart: string,\n  now: Date = new Date(),\n): HistoryCoverage | null",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-057 the date an account history begins"
  ]
 },
 {
  "id": "MK-NW-F-048",
  "name": "uberGroupRows",
  "kind": "function",
  "what_it_is_for": "Group per-class totals into the three uber-groups, keeping class order inside each.",
  "formula_in_words": "Sorts the class rows into the three groups, in the order Cash, Investments, Personal property: Cash ← cash; Investments ← Stocks / Funds, Bonds & CDs, Alternatives, Unclassified; Personal property (the third group, which the screen labels so) ← Real estate, Personal property. A group's total = its classes' totals added up, in the order the rows came; the groups add to What you own. A group with no classes is left out.",
  "handed": "export function uberGroupRows(\n  classRows: { key: AssetClass; label: string; color: string; total: number }[],\n): { group: UberGroup; label: string; icon: string; total: number; classes: typeof classRows }[]"
 },
 {
  "id": "MK-NW-F-051",
  "name": "itemizedResultTotal",
  "kind": "function",
  "what_it_is_for": "The account total AFTER itemizing.",
  "formula_in_words": "The account's total after itemising: the holdings added up, plus what is still unallocated when that is above zero (it stays as cash) — so it is the entered total until the holdings listed come to more than the entered total, when it is their sum. The screen shows the new total before the person taps Done.",
  "handed": "export const itemizedResultTotal = (lump: Pick<AssetAccount, 'balance'>, items: ItemHolding[]): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-052",
  "name": "buildItemizedAccounts",
  "kind": "function",
  "what_it_is_for": "Build the new accounts to CREATE when committing an itemization.",
  "formula_in_words": "One account for each listed holding: named by its label, else its ticker, else Holding; with the original's institution and tax bucket, and what the original carried — its retirement share, its source, and its wrapper kind when the original is a 401(k), IRA, Roth IRA, HSA or 529 (otherwise the kind for the class); balance = its value; class as given. A bond also carries its rate and maturity date, and its face value only when the person entered one — never today's value in its place. What is still unallocated, when above zero, becomes one more account named institution + cash, with the same share, source and wrapper.",
  "handed": "export function buildItemizedAccounts(lump: AssetAccount, items: ItemHolding[]): Omit<AssetAccount, 'asset_id'>[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-048 the person’s own asset-class answer"
  ]
 }
]
```

## Formulas these cards lean on

4 functions named by the formulas above. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-NW-F-011",
  "name": "assetClassOf",
  "what_it_is_for": "What an account is: cash, bonds and CDs, stocks and funds, an alternative, real estate, personal property, or not yet known.",
  "formula_in_words": "The first of these that applies. (1) The class stated on the account. (2) Bonds & CDs if it has a maturity date (owner rule, 2026-08-04: any maturity-dated instrument is a bond) — whatever its name says. (3) The class its name is evidence for. (4) The class of its kind: checking, savings, high-yield savings, cash management and foreign currency are cash; money market and stocks are Stocks / Funds; CD and fixed income are Bonds & CDs; private equity, hedge funds, commodities, crypto, annuities, options and other are Alternatives; home and real estate are Real estate; vehicle is Personal property. (5) Stocks / Funds if it lists holdings. (6) Cash if it is a cash account. (7) If it is property: Real estate when no kind is recorded or its use (lived in, rented, second home, land) is recorded; Personal property for any other kind. (8) Otherwise Unclassified."
 },
 {
  "id": "MK-NW-F-016",
  "name": "cashTotal",
  "what_it_is_for": "All the cash a person has: every bank account, plus the uninvested cash sitting inside investment accounts.",
  "formula_in_words": "For an account that has a class split (accountClassBreakdown): the cash part of it — a linked account's uninvested cash, or the uninvested cash an account built by hand records for itself. For any other account: its whole balance when its class is cash, otherwise nothing. Added up over every account."
 },
 {
  "id": "MK-NW-F-027",
  "name": "accountClassBreakdown",
  "what_it_is_for": "How much of one account sits in each class, with the parts adding up exactly to the account's balance.",
  "formula_in_words": "LINKED ACCOUNT. Cash = its cash balance. Each holding with a price = shares × last price, filed under its class (holdingClassOf). Each option = its value as synced, under Alternatives (an option is valued when it is synced, at contracts × price per share × 100 — owner, 2026-08-26). If the parts come to less than the balance and one or more holdings have NO price: the whole difference is filed under the unpriced holdings' class when they share one, and under Unclassified when they span classes — never under cash. Otherwise, if the parts do not add up to the balance: a difference no bigger than the larger of $1 or 1% of the balance is added to cash when positive (owner rule, 2026-08-11), or taken off the largest class when negative; a bigger one is put under the account's own class (assetClassOf). ACCOUNT BUILT BY HAND (its balance is built from its own records, it is not a cash or property account, and it records uninvested cash above zero): cash = that uninvested cash, never more than the balance; the rest of the balance stays whole under the account's own class. ANY OTHER ACCOUNT — a typed balance, a bank account, a recorded cash figure of zero or below — gets no answer. The parts always add up to the balance."
 },
 {
  "id": "MK-NW-F-109",
  "name": "holdingClassOf",
  "what_it_is_for": "What one holding inside an account is, by the one rule the split, the words under it and the account's page all use.",
  "formula_in_words": "The class of one holding inside an account. (1) If the person said what it is, their answer. (2) If it is marked as asked — nothing could class it and the person has not answered — Unclassified (owner rule, 2026-09-30: \"Refuse the line and ask\"). (3) The class its ticker and name are evidence for, unless that is cash: a money-market fund is Stocks / Funds, a CD or a T-bill is Bonds & CDs, whatever tag the broker sent (owner rule, 2026-08-04: cash means cash only). (4) Otherwise the class stored when it arrived: bond → Bonds & CDs, other → Alternatives, cash → cash, anything else → Stocks / Funds."
 }
]
```
