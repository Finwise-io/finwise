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

# The cards — batch "changed since sent 06"

2 cards, so 2 formula checks and 10 cases. Put `"batch": "changed since sent 06"` in your reply.

These functions were corrected after their cards first went out. The formula below is the one in the app now; judge and test it as you would any other.

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
```

## The cards

```json
[
 {
  "id": "MK-NW-F-027",
  "name": "accountClassBreakdown",
  "kind": "function",
  "what_it_is_for": "APPROVED v6 (2026-07-19): a CONNECTED account splits across the asset classes it actually holds — CDs under bonds, money market + sleeve under cash, options under alternatives, stocks under stocks — with the slices summing EXACTLY to the broker's authoritative balance.",
  "formula_in_words": "Only for a linked account; any other gets no answer. Cash = its cash balance. Each holding's value = shares × last price (0 with no price). Owner rule, 2026-09-30: when nothing says what a holding is, \"Refuse the line and ask\" — so a holding marked as asked, and not yet answered by the person, is filed under Unclassified and under no other class. Every other holding is filed under the class its name is evidence for unless that is cash, otherwise under its own class: bond → Bonds & CDs, other → Alternatives, cash → cash, anything else → Stocks / Funds. Options go to Alternatives. If the parts do not add up to the balance: a gap no bigger than the larger of $1 or 1% of the balance is added to cash when positive, or taken off the largest class when negative; a bigger gap is put under the account's own class.",
  "handed": "export function accountClassBreakdown(a: AssetAccount): Record<AssetClass, number> | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-010 transaction words (the institution's own wording)",
   "MK-XS-I-034 option positions — contracts, strike, expiry, put or call",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-056 how a holding was classified, and by whom"
  ]
 },
 {
  "id": "MK-NW-O-003",
  "name": "theNetWorth",
  "kind": "orchestrator",
  "what_it_is_for": "What am I worth: everything I own, less everything I owe, and how each breaks down?",
  "formula_in_words": "Assets = every account's balance added up. Debts = every debt's remaining balance added up. Net worth = assets − debts. Cash = cashTotal. Investments = the investment classes of the class split added up (Stocks / Funds, Bonds & CDs, Alternatives, Unclassified, from assetAllocation) — so a linked account's uninvested cash is in Cash only, and Cash + Investments + property comes to everything owned. Investable = investableAssets. By class = assetAllocation. Each debt is listed with its balance and its required monthly payment (the larger of its minimum and the payment the person says they make); monthly debt payments = those added up; monthly debt minimum = the minimums alone added up. Return on cash + investments = a TIME-WEIGHTED return (owner decision, 2026-10-04: \"All return should be True Weighted Return and not Dietz return.\") over every account that is not property: the period from the day compared from to today is split at every day money moved in or out; each piece = the value just before the next movement ÷ the value just after the last one; the pieces are multiplied and 1 is taken off; returned as a share. A month given without a day is read as its first day. Cash earns only interest: any other change in a cash account's balance is money moving, counted on the day the record first shows it. For the other accounts, money moving = deposits, withdrawals and cash transferred between accounts. Today's value is read from the accounts as they stand. No figure when no day is given, when no recorded day on or before the day compared from holds the accounts, when money moved on a day with no recorded value, or when shares were moved in or out. It also hands out the match of mortgages to properties (mortgagesByProperty). It also names the holdings nothing could class and the person has not yet answered about (account, holding), and the sentence that asks.",
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
 }
]
```

## Formulas these cards lean on

6 functions named by the formulas above. They are here so you can work your answers. Do not judge or test them in this batch.

```json
[
 {
  "id": "MK-NW-F-011",
  "name": "assetClassOf",
  "what_it_is_for": "WHAT the account is (asset class).",
  "formula_in_words": "The first of these that applies. (1) The class stated on the account. (2) The class its name is evidence for. (3) Bonds & CDs if it has a maturity date. (4) The class of its kind: checking, savings, high-yield savings, cash management and foreign currency are cash; money market and stocks are Stocks / Funds; CD and fixed income are Bonds & CDs; private equity, hedge funds, commodities, crypto, annuities, options and other are Alternatives; home is Real estate; vehicle is Personal property. (5) Stocks / Funds if it lists holdings. (6) Cash if it is a cash account. (7) Real estate if it is property. (8) Otherwise Unclassified."
 },
 {
  "id": "MK-NW-F-014",
  "name": "isRealAsset",
  "what_it_is_for": "Whether an account is a physical asset, meaning real estate or personal property.",
  "formula_in_words": "True when the account's class (assetClassOf) is Real estate or Personal property."
 },
 {
  "id": "MK-NW-F-016",
  "name": "cashTotal",
  "what_it_is_for": "All the cash a person has: every bank account, plus the uninvested cash sitting inside investment accounts.",
  "formula_in_words": "For a linked account: the cash part of its class breakdown (accountClassBreakdown). For any other account: its whole balance when its class is cash, otherwise nothing. Added up over every account."
 },
 {
  "id": "MK-NW-F-022",
  "name": "investableAssets",
  "what_it_is_for": "Everything owned except real estate and personal property: cash, investments and retirement balances.",
  "formula_in_words": "The balances of every account that is not a real asset (isRealAsset), added up."
 },
 {
  "id": "MK-NW-F-029",
  "name": "assetAllocation",
  "what_it_is_for": "How much money sits in each of the seven classes?",
  "formula_in_words": "The value in each asset class across every account. A linked account is split by its class breakdown (accountClassBreakdown); any other account counts whole under its one class (assetClassOf)."
 },
 {
  "id": "MK-NW-F-106",
  "name": "mortgagesByProperty",
  "what_it_is_for": "Which mortgage is on which property, and which mortgages are on none.",
  "formula_in_words": "Properties = the accounts whose class is real estate. Mortgages = the debts whose type is mortgage. Owner rule, 2026-10-04: \"It is feasible to have property without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less mortgage.\" A mortgage is on the property it names, when that property exists and has no mortgage placed on it yet. A mortgage that names no property is placed only where there is one answer: first, on the one property without a mortgage whose name its own name begins with; then, when exactly one property is still without a mortgage and exactly one mortgage is still without a property, on that property. Every other mortgage is listed as on no property — including a second mortgage that names a property already taken. It gives: the count of properties and of mortgages; for each property its mortgage (or none) and that mortgage's required monthly payment; the mortgages on no property; whether there are none of those; and the sentence to show when there are."
 }
]
```
