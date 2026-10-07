Written for: gemini, as the outside judge of batch "networth 04 final". You have not seen any earlier review of these functions and none is given here: judge them as if for the first time.

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

# The cards — batch "networth 04 final"

18 cards, so 18 formula checks and 90 cases. Put `"batch": "networth 04 final"` in your reply.

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
export interface AltSummary { count: number; totalValue: number;
  /** Null when nothing is held: 0% would read as a forecast. */
  blendedReturn: number | null;
  /** The rate in money over a year; null when nothing is held — $0 would read as a forecast too (outside review, 2026-10-07). */
  estAnnualGrowth: number | null; }

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
  "id": "MK-NW-F-002",
  "name": "alternativesSummary",
  "kind": "function",
  "what_it_is_for": "Adds up the alternative investments: how many there are, what they are worth together, their blended yearly growth rate and the growth in dollars that rate gives over a year.",
  "formula_in_words": "Over the accounts that pass isAlternative: count; total = balances added up; blended rate = each balance × the benchmark yearly rate for its kind, added up, ÷ total — no figure when the total is 0; growth in a year = total × blended rate, and no figure when nothing is held or the total is 0 ($0 would read as a forecast).",
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
  "formula_in_words": "From the account's name, capitals ignored, whole words only (put is not Putnam; cd is not ABCD), first match wins. Money market (also mmkt, mmf, or the ticker of a money-market fund) → Stocks / Funds — read before the sweep words, so a money-market settlement fund is the fund (the owner's rule of 2026-08-04). Then the words sweep or settlement → cash. The ticker of a Treasury-bill fund → Bonds & CDs. An option — an option code, a dated option, or the words put or call → Alternatives. Crypto — a coin's ticker, or the words bitcoin, ethereum or crypto → Alternatives. A commodity fund's ticker, or the words gold, silver, platinum, palladium or commodity unless the name is a company's → Alternatives. The words currency or forex, or the tickers FXE or FXY → Alternatives. The words CD, certificate of deposit, T-bill, Treasury bill, bond, note, treasury, muni, debenture or coupon — or a percent followed by the word due or a year → Bonds & CDs. Otherwise nothing: the name gives no evidence.",
  "handed": "export function incomeBearingClassOf(label?: string): AssetClass | null"
 },
 {
  "id": "MK-NW-F-013",
  "name": "realEstateUseOf",
  "kind": "function",
  "what_it_is_for": "Real-estate use (primary/rental/secondary/land); only meaningful when assetClassOf === 'real_estate'.",
  "formula_in_words": "The use stated for a property. With none stated: the home lived in when the property is the one the household's rule names (primaryHomeIdOf — the one marked, or with none marked and no use stated on any, the one entered first), otherwise a second home; asked about one account alone, with no household to compare against, it is the home. An account that is not real estate has no use (no answer).",
  "handed": "export function realEstateUseOf(a: AssetAccount, accounts?: AssetAccount[]): RealEstateUse | null"
 },
 {
  "id": "MK-NW-F-110",
  "name": "primaryHomeIdOf",
  "kind": "function",
  "what_it_is_for": "Which property is the home lived in: the one marked so; with none marked and no use stated on any, the one entered first; otherwise none.",
  "formula_in_words": "Which property is the home lived in, by the household's rule (the owner's rule of 2026-10-04, as propertyUses reads it): among the real-estate accounts that are not rentals, the one whose use is stated as the home lived in; with none marked, none when any of them has a use stated, otherwise the one entered first (the app keeps the newest first, so the last in the list). Nothing when there is no property.",
  "handed": "export function primaryHomeIdOf(accounts: AssetAccount[]): string | undefined"
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
  "formula_in_words": "The kind word is the account kind's own word (401(k), Traditional IRA, Roth IRA, HSA, 529, Brokerage, Checking and so on); for a tax-advantaged account whose kind says only Brokerage, it is Roth when the account is tax-free and 401(k) / IRA when it is tax-deferred — a tax-advantaged account always shows what it is. With an institution: a tax-advantaged account that has a kind word reads Institution + kind word + -last four (without the digits when unknown); otherwise with digits it reads Institution -last four; otherwise Institution + kind word. With none of those: the account's own name (an account named Imported holding with exactly one holding takes that holding's ticker or name), with the institution in front only if the name does not already contain it, and the mask at the end only if it is not already there.",
  "handed": "export function accountDisplayName(a: Pick<AssetAccount, 'label' | 'institution' | 'mask'> & { positions?: unknown[]; kind?: string; tax_bucket?: TaxBucket; tax_treatment?: TaxTreatment }): string",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-030",
  "name": "earmarkDefault",
  "kind": "function",
  "what_it_is_for": "Default % of an account that's earmarked for retirement (rest funds other goals).",
  "formula_in_words": "The share of an account counted towards retirement by default (owner, 2026-08-11, DEC-0100: all assets minus the home lived in and the car driven): 0% for a 529, for the home lived in (the property whose use is stated as such; with none stated, the one the household's rule names, or any unstated property when no household is handed in) and for the car driven (primaryCarIdOf); 100% for everything else — a rental, a second home, a second car, valuables included.",
  "handed": "export function earmarkDefault(a: AssetAccount, primaryCarId?: string, primaryHomeId?: string): number",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-035",
  "name": "blendedVolatility",
  "kind": "function",
  "what_it_is_for": "The volatility of THIS portfolio — each account's own class volatility, weighted the way the money actually is (the same weighting `blendedReturn` uses, so the pair always describes one portfolio).",
  "formula_in_words": "Over exactly the accounts the nest egg counts: each account's volatility — the person's own figure for its kind, else the app's figure for the kind, else 12% — averaged, weighted by its earmarked amount. No answer when nothing is earmarked (the Plan then uses the band its growth rate implies, chosen at its call site). It is a weighted average of the parts, which is the portfolio's own volatility only when the parts move together; a table of how the classes move together is not yet built.",
  "handed": "export function blendedVolatility(accounts: AssetAccount[], overrides?: Record<string, number>): number | null",
  "inputs_it_reads": [
   "MK-XS-I-035 annuity income",
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
  "formula_in_words": "Groups the accounts for the Net worth list, by asset-class label or by institution. An account with a class split (accountClassBreakdown — a linked account, or one built by hand that records its own uninvested cash) gives each class group its part and sits, as a row, under the class most of it is in; any other account counts whole under its one class. By institution (an account with no institution goes under No institution set; names are matched trimmed, capitals ignored, and the group shows the first spelling seen): a group's total = its accounts' balances added up, and the group lists the classes inside it with their totals, from the same split, largest first. Group totals by class equal the class rows; both views add to everything owned.",
  "handed": "export function ledgerGroups(\n  accounts: AssetAccount[],\n  by: 'class' | 'institution',\n  classLabelOf: (a: AssetAccount) => string,\n  classKeyOf: (a: AssetAccount) => string,\n): LedgerGroup[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-028 assumed return"
  ]
 }
]
```

## Formulas these cards lean on

9 functions named by the formulas above. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-NW-F-001",
  "name": "isAlternative",
  "what_it_is_for": "Is this account an \"other investment\" — an alternative held at a manual value (not a bond, not cash/property)?",
  "formula_in_words": "True when the account's class (assetClassOf) is Alternatives."
 },
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
  "id": "MK-NW-F-029",
  "name": "assetAllocation",
  "what_it_is_for": "How much money sits in each of the seven classes?",
  "formula_in_words": "The value in each asset class across every account. An account with a class split (accountClassBreakdown) — a linked account, or an account built by hand that records its own uninvested cash — is split by it; any other account counts whole under its one class (assetClassOf). The seven classes add to everything owned, and the Cash class is cashTotal."
 },
 {
  "id": "MK-NW-F-031",
  "name": "primaryCarIdOf",
  "what_it_is_for": "The vehicle treated as \"the car you drive\" — the most valuable one, so a second car stays a real asset.",
  "formula_in_words": "Among the accounts whose kind is vehicle, and no other: the one with the largest balance; a tie goes to the lower id read as text (the one made first). Nothing when there is no vehicle. Valuables and other personal property are never the car."
 },
 {
  "id": "MK-NW-F-034",
  "name": "benchmarkReturn",
  "what_it_is_for": "Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default.",
  "formula_in_words": "The person's own yearly rate for that kind where they set one — a rate of exactly 0 counts as set. Otherwise the app's typical yearly return for the kind: checking 0.5%, savings 2.4%, high-yield savings 4.2%, money market 4.5%, CD 4.2%, cash management 3.5%, foreign currency 0%, brokerage 8%, stocks and funds 10.4%, fixed income 4.2%, crypto 8%, private equity 13%, hedge funds 6%, gold and commodities 8.2%, options 5%, annuities 4.5%, 529 7%, other 5%, 401(k), IRA, Roth IRA and HSA 7.9%, home 4.5%, vehicle −5%. 6% for a kind that is unknown or missing. A kind is matched exactly as the app writes it; capitals count."
 },
 {
  "id": "MK-NW-F-107",
  "name": "propertyUses",
  "what_it_is_for": "What each property is used for: the home lived in, a rental, or a second or vacation home.",
  "formula_in_words": "For each property (an account whose class is real estate): what it is used for. Owner rule, 2026-10-04: \"unless rental income is added on the income screen, assume property is second or vacation home.\" RENTAL = a rent entry on the Income screen (one with rent or running costs typed) names this property. HOME = the one property the person marked as the home they live in, when it is not a rental. SECOND = every other property: a second or vacation home. Two things stored before the rule are read only where there is one answer: with no property marked as the home (and none marked as anything else), the property entered first is the home; and a rent entry that names no property makes the one property that is not the home a rental, when there is exactly one such property."
 },
 {
  "id": "MK-NW-F-109",
  "name": "holdingClassOf",
  "what_it_is_for": "What one holding inside an account is, by the one rule the split, the words under it and the account's page all use.",
  "formula_in_words": "The class of one holding inside an account. (1) If the person said what it is, their answer. (2) If it is marked as asked — nothing could class it and the person has not answered — Unclassified (owner rule, 2026-09-30: \"Refuse the line and ask\"). (3) The class its ticker and name are evidence for, unless that is cash: a money-market fund is Stocks / Funds, a CD or a T-bill is Bonds & CDs, whatever tag the broker sent (owner rule, 2026-08-04: cash means cash only). (4) Otherwise the class stored when it arrived: bond → Bonds & CDs, other → Alternatives, cash → cash, anything else → Stocks / Funds."
 }
]
```
