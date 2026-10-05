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

# The cards — batch "networth 04"

15 cards, so 15 formula checks and 75 cases. Put `"batch": "networth 04"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface AltSummary { count: number; totalValue: number; blendedReturn: number; estAnnualGrowth: number; }

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

export interface Itemising {
  /** The lump being itemised — its total never moves while its inside is filled in. */
  keepTotalAt: number;
  itemised: number;
  remainder: number;
}

export interface LedgerGroup {
  /** The heading exactly as the screen prints it — a class label, or the institution's own name. */
  label: string;
  /** What this group holds. */
  total: number;
  /** The accounts inside it, in the order they were given. */
  accountIds: string[];
  /** Under an institution's name, the class mix inside it, biggest first. Empty when grouped by class. */
  mix: { key: string; total: number }[];
}

export type RealEstateUse = 'primary' | 'rental' | 'secondary' | 'land';

export type TaxBucket = 'CASH' | 'PRE_TAX' | 'ROTH' | 'TAXABLE' | 'PROPERTY';

export type TaxTreatment = 'taxable' | 'tax_deferred' | 'tax_free';
```

## The cards

```json
[
 {
  "id": "MK-NW-F-055",
  "name": "isBond",
  "kind": "function",
  "what_it_is_for": "An AssetAccount is a bond if its ASSET CLASS is bonds (spec §2: \"detected by assetClass, NOT maturity date\").",
  "formula_in_words": "True when the account's class (assetClassOf) is Bonds & CDs.",
  "handed": "export function isBond(a: AssetAccount): boolean"
 },
 {
  "id": "MK-NW-F-073",
  "name": "itemising",
  "kind": "function",
  "what_it_is_for": "When an account entered as one total is broken into holdings: the total to keep, the value of the holdings listed so far, and the amount still not explained by them.",
  "formula_in_words": "Returns three figures. Keep-total-at = the balance the account was entered at. Itemised = the values of the listed holdings added up. Remainder = the entered balance less that sum.",
  "handed": "export function itemising(lumpBalance: number, items: ItemHolding[]): Itemising",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-094",
  "name": "ledgerGroups",
  "kind": "function",
  "what_it_is_for": "Groups the accounts for the Net worth list, by asset class or by institution, and gives each group its total.",
  "formula_in_words": "Groups the accounts by asset-class label, or by institution (an account with no institution goes under No institution set). A group's total = its accounts' balances added up. When grouped by institution, each group also lists the classes inside it with their totals, largest first.",
  "handed": "export function ledgerGroups(\n  accounts: AssetAccount[],\n  by: 'class' | 'institution',\n  classLabelOf: (a: AssetAccount) => string,\n  classKeyOf: (a: AssetAccount) => string,\n): LedgerGroup[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-048 the person’s own asset-class answer"
  ]
 },
 {
  "id": "MK-NW-F-002",
  "name": "alternativesSummary",
  "kind": "function",
  "what_it_is_for": "Adds up the alternative investments: how many there are, what they are worth together, their blended yearly growth rate and the growth in dollars that rate gives over a year.",
  "formula_in_words": "Over the accounts that pass isAlternative: count; total = balances added up; blended rate = each balance × the benchmark yearly rate for its kind, added up, ÷ total (0 when the total is 0); growth in a year = total × blended rate.",
  "handed": "export function alternativesSummary(accounts: AssetAccount[]): AltSummary",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-008",
  "name": "incomeBearingClassOf",
  "kind": "function",
  "what_it_is_for": "FOUNDER RULE 2026-08-04 (supersedes the money-market=cash rule and the 12-month CD split): CASH means cash only — a sweep/settlement balance.",
  "formula_in_words": "From the account's name, capitals ignored, first match wins. The words sweep or settlement → cash. Money market (also mmkt, mmf, or the ticker of a money-market fund) → Stocks / Funds. The ticker of a Treasury-bill fund → Bonds & CDs. An option — an option code, a dated option, or the words put or call → Alternatives. Crypto — a coin's ticker, or the words bitcoin, ethereum or crypto → Alternatives. A commodity fund's ticker, or the words gold, silver, platinum, palladium or commodity unless the name is a company's → Alternatives. The words currency or forex, or the tickers FXE or FXY → Alternatives. The words CD, certificate of deposit, T-bill, Treasury bill, bond, note, treasury, muni, debenture or coupon — or a percent followed by the word due or a year → Bonds & CDs. Otherwise nothing: the name gives no evidence.",
  "handed": "export function incomeBearingClassOf(label?: string): AssetClass | null"
 },
 {
  "id": "MK-NW-F-013",
  "name": "realEstateUseOf",
  "kind": "function",
  "what_it_is_for": "Real-estate use (primary/rental/secondary/land); only meaningful when assetClassOf === 'real_estate'.",
  "formula_in_words": "The use stated for a property; primary home when none is stated.",
  "handed": "export function realEstateUseOf(a: AssetAccount): RealEstateUse"
 },
 {
  "id": "MK-NW-F-014",
  "name": "isRealAsset",
  "kind": "function",
  "what_it_is_for": "Whether an account is a physical asset, meaning real estate or personal property.",
  "formula_in_words": "True when the account's class (assetClassOf) is Real estate or Personal property.",
  "handed": "export function isRealAsset(a: AssetAccount): boolean"
 },
 {
  "id": "MK-NW-F-015",
  "name": "totalAssets",
  "kind": "function",
  "what_it_is_for": "Everything owned, added up: the balance of every account.",
  "formula_in_words": "Every account's balance added up; a missing balance counts as zero.",
  "handed": "export function totalAssets(accounts: AssetAccount[]): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-017",
  "name": "equitiesTotal",
  "kind": "function",
  "what_it_is_for": "The total value of every account classed as Stocks / Funds.",
  "formula_in_words": "The balances of the accounts whose class (assetClassOf) is Stocks / Funds, added up. An account counts whole, under its one class.",
  "handed": "export function equitiesTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-018",
  "name": "fixedIncomeTotal",
  "kind": "function",
  "what_it_is_for": "The total value of every account classed as Bonds & CDs.",
  "formula_in_words": "The balances of the accounts whose class (assetClassOf) is Bonds & CDs, added up.",
  "handed": "export function fixedIncomeTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-019",
  "name": "alternativesTotal",
  "kind": "function",
  "what_it_is_for": "The total value of every account classed as Alternatives.",
  "formula_in_words": "The balances of the accounts whose class (assetClassOf) is Alternatives, added up.",
  "handed": "export function alternativesTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-020",
  "name": "realEstateTotal",
  "kind": "function",
  "what_it_is_for": "The total value of every account classed as Real estate.",
  "formula_in_words": "The balances of the accounts whose class (assetClassOf) is Real estate, added up.",
  "handed": "export function realEstateTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-024",
  "name": "accountLastFour",
  "kind": "function",
  "what_it_is_for": "The last four digits of an account, or null when we genuinely don't have them.",
  "formula_in_words": "From the account's mask, or failing that its account number: drop everything but digits; if four or more digits remain, the last four; otherwise nothing.",
  "handed": "export function accountLastFour(a: { mask?: string; account_number?: string }): string | null"
 },
 {
  "id": "MK-NW-F-025",
  "name": "accountDisplayName",
  "kind": "function",
  "what_it_is_for": "The one name an account is shown by, built from its institution, the kind of account and its last four digits where they are known.",
  "formula_in_words": "With an institution: a tax-advantaged account that has a kind word reads Institution + kind word + -last four (without the digits when unknown); otherwise with digits it reads Institution -last four; otherwise Institution + kind word. With none of those: the account's own name (an account named Imported holding with exactly one holding takes that holding's ticker or name), with the institution in front only if the name does not already contain it, and the mask at the end only if it is not already there.",
  "handed": "export function accountDisplayName(a: Pick<AssetAccount, 'label' | 'institution' | 'mask'> & { positions?: unknown[]; kind?: string; tax_bucket?: TaxBucket; tax_treatment?: TaxTreatment }): string",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-035",
  "name": "blendedVolatility",
  "kind": "function",
  "what_it_is_for": "The volatility of THIS portfolio — each account's own class volatility, weighted the way the money actually is (the same weighting `blendedReturn` uses, so the pair always describes one portfolio).",
  "formula_in_words": "Over accounts that are not property: each account's volatility — the person's own figure for its kind, else the app's figure for the kind, else 12% — averaged, weighted by its earmarked amount. 12% when nothing is earmarked.",
  "handed": "export function blendedVolatility(accounts: AssetAccount[], overrides?: Record<string, number>): number",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 }
]
```

## Formulas these cards lean on

2 functions named by the formulas above whose own cards are in another batch. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-NW-F-001",
  "name": "isAlternative",
  "what_it_is_for": "Is this account an \"other investment\" — an alternative held at a manual value (not a bond, not cash/property)?",
  "formula_in_words": "True when the account's kind is crypto, private equity, hedge funds, commodities, annuities, options or other; AND it has no maturity date; AND it is not property."
 },
 {
  "id": "MK-NW-F-011",
  "name": "assetClassOf",
  "what_it_is_for": "WHAT the account is (asset class).",
  "formula_in_words": "The first of these that applies. (1) The class stated on the account. (2) The class its name is evidence for. (3) Bonds & CDs if it has a maturity date. (4) The class of its kind: checking, savings, high-yield savings, cash management and foreign currency are cash; money market and stocks are Stocks / Funds; CD and fixed income are Bonds & CDs; private equity, hedge funds, commodities, crypto, annuities, options and other are Alternatives; home is Real estate; vehicle is Personal property. (5) Stocks / Funds if it lists holdings. (6) Cash if it is a cash account. (7) Real estate if it is property. (8) Otherwise Unclassified."
 }
]
```
