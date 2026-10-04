# Brief — write the test cases, from outside

MoneyKeel · calculation audit · v02 · 2026-10-04

## What this is

MoneyKeel is a personal-finance app. Every number it shows comes from a small function, and groups of
functions are run by an **orchestrator** — the one function a screen asks for a whole answer (for
example, "how are my investments doing").

Those functions already have tests, and the tests pass. Five of the functions were still wrong. The
reason: the person who wrote each function also wrote its test, from the same understanding. A wrong
rule produced a wrong example that agreed with it.

**Your job is to write test cases that do not share that understanding.** You are the outside judge.

## The one rule that matters

**You are not shown the code inside any function, the existing tests, or any answer the app gives. Do
not ask for them.**

If you saw them you would start to agree with them. Work only from what a function is *for*, the
owner's written decisions, and ordinary arithmetic and finance.

You are also working alone. Another model is doing the same job separately. Do not try to guess what
it will write. Where your answer, its answer and the app's answer differ, the owner sees all three.

## What you are given

Below this brief is a batch of **cards**, one for each function or orchestrator. A card holds:

| Field | What it is |
|---|---|
| `id`, `name` | Its identifier and name. Quote the `id` exactly in every case you write. |
| `kind` | `orchestrator` or `function`. |
| `what_it_is_for` | The question it answers, in one sentence. |
| `handed` | What it is given, as the code names it. Type names are the app's own; they are spelled out once, above the cards. |
| `gives_back` | What it returns. |
| `inputs_it_reads` | The registered inputs behind it, each with a plain name. |
| `figures_it_feeds` | The numbers on screen it produces: the words beside each, its unit, what it answers, and when it must refuse to give a number. |
| `rules` | The rules it must follow, each marked with **who said it**. |
| `approved_drawing` | On a few orchestrators: a worked household the owner approved, with numbers that add up. |

### Who said a rule — read this before you use one

- `"said_by": "owner"` — the owner's decision, in his own words, with its number and date. **Settled.**
- `"said_by": "author"` — the in-house author's record of how the function behaves. **A claim, not a
  fact.** Use it to understand what is intended. If it looks wrong, or contradicts an owner rule, an
  approved drawing or ordinary arithmetic, do not follow it — write the case the way you believe is
  right and say so in `notes`.

Comments inside `handed`, and inside the types above the cards, are the author's too — the same
caution applies.

A card has no formula on it and no worked answer from the app. That is deliberate.

## What to write

**Five cases for every card: two easy, two complex, one edge.**

| Kind | What it is |
|---|---|
| **Easy** (2) | One thing happening. Round numbers. A person can check the answer in their head in under a minute. The two must test different things, not the same thing with different numbers. |
| **Complex** (2) | At least three inputs that all change the answer, with unround, lifelike amounts and dates. Things interacting the way they do in a real household: two earners and rent and a bonus; money added halfway through a period; one account linked and one entered by hand. |
| **Edge** (1) | The place where a rule changes, or where something is missing. Zero. Nothing entered. A negative. A date exactly on a boundary. An amount exactly at a threshold. A record that starts after the period asked about. |

A small function still gets five. For one that only answers yes or no, or tidies a word, "complex"
means the awkward inputs: mixed capitals, stray spaces, a value on each side of the line.

### Go where the mistakes were

Each of the five errors sat in a case nobody had tried. Across your cases for a batch, make sure these
shapes appear wherever a card's inputs allow them:

1. Rent, or interest and dividends, **together with** a wage whose take-home the person typed in.
2. A holding described the way a broker link describes it, not the way a person types it.
3. An account holding **cash as well as** investments.
4. A period that reaches back **further than the record does**.
5. A period of **exactly** one year, and exactly two years, to the day.
6. Money added or taken out **inside** the period, large against what was already there.
7. Two people in the household, earning differently.
8. A debt paid this month, a debt not yet paid, and a debt with no payment required.
9. Nothing entered at all.

## How to work out the expected answer

1. **By hand, from the rule, showing every step.** A reader must be able to follow your arithmetic
   line by line without trusting you.
2. **Keep full precision until the end.** Then give two values: the exact one (at least four decimal
   places) and the one a person would see — whole dollars for totals and balances, two decimals for
   prices, expenses and percentages.
3. **"No answer" is a valid answer.** Where an input is missing or a rule cannot honestly produce a
   number, the right result is a refusal — the app shows a dash and says why. Write
   `"expected": "REFUSES"` and the reason. Never invent a default number.
4. **If the card does not settle the answer, do not guess.** Mark the case `RULE UNCLEAR`, write
   each reading you can see, and give the answer under each. An unclear rule is a finding, and one of
   the most useful things you can send back.
5. **If you cannot tell what a function is for, do not write cases for it.** List it under
   `could_not_test` with what is missing from the card.
6. **Cite the rule.** Every case names what its answer rests on: an owner decision number, the
   approved drawing, or — for tax and contribution limits — the published table and its year.

## Orchestrators — two more things to check

An orchestrator's answer has parts. For each orchestrator, at least one complex case must state, as
separate expected values:

- **The parts add up to the whole.** Every row shown is a row in the total. If the answer is a list
  of rows and a total, give each row and the total, and show that they sum.
- **The same input gives the same number everywhere it is used.** Where `figures_it_feeds` shows a
  figure on more than one screen, say so in the case, so the two can be compared.

Where a card carries an `approved_drawing`, one of your cases must be that household exactly as
drawn. Your other four must be your own.

## What to send back

One JSON reply for the batch, exactly in this shape and nothing outside it. Use your own plain names
for inputs; do not invent code names. They will be mapped onto the app afterwards, and **your numbers
will not be changed in the mapping** — a case that cannot be mapped goes back to the owner, not into
a drawer.

```json
{
  "batch": "cashflow 01",
  "written_by": "claude | gemini",
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
      "rule": "Approved drawing income-end-to-end v07, frame 16; its rule 5: the take-home someone enters IS the take-home",
      "confidence": "high",
      "notes": ""
    }
  ],
  "could_not_test": [
    { "id": "MK-XX-F-000", "missing": "What is missing from the card." }
  ]
}
```

`kind` is one of `easy`, `complex`, `edge`. `confidence` is `high`, `medium` or `low`; anything
below `high` needs a sentence in `notes` saying why.

## Before you send

- Five cases for every card you could test — two easy, two complex, one edge — and every other card
  listed under `could_not_test`.
- Every case quotes its card's `id` exactly.
- Every case shows its working, and the working reaches the expected value.
- Every list of rows sums to its total.
- No two cases for one card are the same case with different numbers.
- No answer was taken from, or adjusted towards, anything the app produces.

---

# The cards — batch "networth 03"

15 cards, so 75 cases. Put `"batch": "networth 03"` in your reply.

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
  average_target_return: number;
  accounts: (AssetAccount & { portfolio_percentage: number })[];
}

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
}

export type UberGroup = 'cash' | 'investments' | 'property';
```

## The cards

```json
[
 {
  "id": "MK-NW-F-029",
  "name": "assetAllocation",
  "kind": "function",
  "what_it_is_for": "How much money sits in each of the seven classes?",
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
  "handed": "export function retirementEarmarkedValue(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-034",
  "name": "benchmarkReturn",
  "kind": "function",
  "what_it_is_for": "Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default.",
  "handed": "export function benchmarkReturn(kind: string | undefined, overrides?: Record<string, number>): number",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-036",
  "name": "benchmarkInfo",
  "kind": "function",
  "what_it_is_for": "Benchmark return + its source/period for an asset kind.",
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
  "handed": "export function blendedReturn(accounts: AssetAccount[], overrides?: Record<string, number>): number",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-039",
  "name": "buildAssetsState",
  "kind": "function",
  "what_it_is_for": "How much of everything sits in each account, and what return do they blend to?",
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
  "handed": "export function monthlyContributionsFromOnboarding(op: Record<string, any> | null): number",
  "inputs_it_reads": [
   "MK-XS-I-043 their own retirement contribution"
  ]
 },
 {
  "id": "MK-NW-F-045",
  "name": "sourceWording",
  "kind": "function",
  "what_it_is_for": "The words saying where an account's numbers come from, which are Linked, Imported or By hand, with a date added only when the numbers are stale.",
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
  "handed": "export function uberGroupRows(\n  classRows: { key: AssetClass; label: string; color: string; total: number }[],\n): { group: UberGroup; label: string; icon: string; total: number; classes: typeof classRows }[]"
 },
 {
  "id": "MK-NW-F-051",
  "name": "itemizedResultTotal",
  "kind": "function",
  "what_it_is_for": "The account total AFTER itemizing.",
  "handed": "export const itemizedResultTotal = (\n  lump: Pick<AssetAccount, 'balance'>, items: ItemHolding[], keepRemainderAsCash = true,\n): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-052",
  "name": "buildItemizedAccounts",
  "kind": "function",
  "what_it_is_for": "Build the new accounts to CREATE when committing an itemization.",
  "handed": "export function buildItemizedAccounts(\n  lump: AssetAccount, items: ItemHolding[], keepRemainderAsCash = true,\n): Omit<AssetAccount, 'asset_id'>[]",
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
