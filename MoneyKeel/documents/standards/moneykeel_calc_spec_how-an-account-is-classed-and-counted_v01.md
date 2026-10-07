# How an account is classed, split, counted and named

MoneyKeel · calculation standard · v01 · 2026-10-07

This is the one place the rules for WHAT an account is, HOW its money is split across the classes, HOW
the totals are built from that split, WHAT can be added, and WHAT an account is called live. Every rule
names the owner's decision behind it. The code that applies each rule is named at the end, with the
test that holds it.

## The rule, in one sentence

Every dollar a person owns sits in exactly one class, counted once, under a name no other account has.

## 1. What an account is — its class

The classes are Cash · Bonds & CDs · Stocks / Funds · Alternatives · Real estate · Personal property ·
Unclassified. The first of these that applies decides (MK-NW-F-011 assetClassOf):

1. The class the person stated on the account.
2. **A maturity date makes it Bonds & CDs**, whatever its name says — the owner's rule of 2026-08-04
   (DEC-0051): a CD or a T-bill pays interest and is measured, however soon it matures.
3. What its name is evidence for — **cash means cash only** (DEC-0051, DEC-0309): a money-market fund
   is Stocks / Funds (it pays dividends), a CD or a T-bill is Bonds & CDs, a sweep or settlement
   balance is cash. The name decides before any tag the institution sent.
4. Its kind: checking, savings, high-yield savings, cash management and foreign currency are cash;
   money market and stocks are Stocks / Funds; CD and fixed income are Bonds & CDs; crypto,
   commodities, annuities, options, other, private equity and hedge funds are Alternatives; a home or
   real estate is Real estate; a vehicle is Personal property.
5. Stocks / Funds if it lists holdings.
6. Cash if it is a cash account.
7. Property: Real estate when its use is recorded (lived in, rented, second home, land) or no kind is
   recorded; Personal property for any other kind — a ring is not a house.
8. Otherwise Unclassified: a wrapper whose contents nobody has said (a bare 401(k) or brokerage).

## 2. What a holding inside an account is

One test, used wherever a holding's class matters — the split, the words under an account, the
account's own page (MK-NW-F-109 holdingClassOf):

1. The person's own answer, always. It outranks everything and survives every sync.
2. A holding nothing could class, that the person has not answered about, is **Unclassified** — the
   owner's ruling of 2026-09-30, "Refuse the line and ask" (DEC-2160). Net worth asks.
3. What its ticker and name are evidence for, unless that is cash (rule 3 above).
4. Otherwise the class stored when it arrived.

## 3. How an account's money is split across the classes

MK-NW-F-027 accountClassBreakdown. The parts always add up to the account's balance.

- **A linked account.** Its uninvested cash is cash. Each priced holding is shares × price under its
  class. Each option is its value as synced — contracts × price per share × 100 (owner, Q06,
  2026-08-26) — under Alternatives. If the parts fall short of the balance and a holding has **no
  price**, the difference is that holding's and goes under its class (Unclassified when unpriced
  holdings span classes) — never cash. With every holding priced, a difference no bigger than the
  larger of $1 or 1% of the balance is cash when positive (owner, 2026-08-11, DEC-0095: "why is cash
  added to CD and not cash?") and comes off the largest class when negative; a bigger one goes under
  the account's own class.
- **An account built by hand** that records its own uninvested cash (its balance is built from its
  records): that cash is cash, never more than the balance; the rest stays whole under the account's
  class. A recorded cash figure of zero or below is a purchase recorded without its deposit — not
  cash, not a loan — and the account stays whole.
- **An account with only a typed balance** is not split. Nothing is known about what is inside it.
- **A money-market fund the institution flags as "cash equivalent" is a holding** under Stocks /
  Funds; the cash beside it is net of it, so it is counted once.

## 4. How the totals are built

Every total on Net worth is read from the split above, so a dollar is in one line (owner, DEC-0343:
one concept, one function; a total and the sum of its parts pinned by a test).

| Line | What it is | Function |
|---|---|---|
| Cash | the cash parts of every account's split, plus every whole account whose class is cash | MK-NW-F-016 cashTotal |
| Investments | the Stocks / Funds, Bonds & CDs, Alternatives and Unclassified parts | MK-NW-F-021 investmentsTotal |
| Cash and investments together | every account that is not real estate or personal property, whole | MK-NW-F-022 investableAssets |
| Each class | its line of the split | MK-NW-F-017 to F-020 |

Always: **Cash + Investments = Cash and investments together.** The approved Net worth drawing (v08,
state A) draws it: Vanguard $349,333 of which $838 uninvested → Investments $354,314 with E*TRADE's
$5,819, Cash $8,838 with Chase's $8,000.

Performance measures the investment ACCOUNTS, each whole — the cash inside them included, because
that is what their daily record holds and what money paid in first becomes. That figure is read by
MK-NW-O-008 thePerformance from the accounts handed to it, and Home prints the same one. It differs
from Net worth's Investments line by exactly the uninvested cash inside linked accounts, and that is
not a disagreement: the two lines answer two questions.

## 5. What can be added, in this phase

- Alternatives offered: Crypto · Gold / commodities · Annuity · Other. **Private equity and hedge
  funds are not offered** (owner, 2026-08-04, DEC-0045; restated 2026-10-06, DEC-2334: "this phase of
  app no longer has options for Private Equity and Hedge fund"). A row saved earlier with either kind
  is kept as it is.
- Retirement wrappers offered: 401(k) · Traditional IRA · Roth IRA · Roth 401(k) · HSA. A Roth 401(k)
  is a 401(k) by its kind and Roth by its tax, as a linked one is stored (MK-NW-F-010 wrapperAccount).
- A 529 is tax-free (what it earns comes out untaxed for education); an HSA goes in before tax and is
  tax-free for medical costs. The account's page says so in those words (MK-NW-F-108 taxWordsOf).

## 6. What an account is called

The owner's rule of 2026-08-11 — "Institution + Brokerage/checking/savings/…" and "Institution +
401k/RothIRA/HSA/…" — and of 2026-09-30, "Call an account by it's name" (DEC-2163). MK-NW-F-025
accountDisplayName, MK-NW-F-026 accountDisplayNames:

- With an institution: a taxable account reads Institution + last four digits (Institution + kind word
  when no digits are known); **a tax-advantaged account always shows what it is** — Institution + kind
  word + last four. A 529 reads "Vanguard 529 -1234". Where the kind says only Brokerage, the tax
  answer is the word: "Vanguard Roth", "Fidelity 401(k) / IRA" — the by-hand form's own words.
- With no institution: the account's own name.
- Two accounts that end up with the same name are numbered · 1, · 2 … in the order of their ids read
  as text (the order they were made, on every device). A number already in use as a name is skipped:
  **no two accounts are ever shown by the same name.** No class word is printed under an account.

## 7. How long a typed value is trusted

A value typed by hand is "N months old" by the months that have fully passed — a month has passed
when the same day of the month comes round, or the month ends first. At six, the account's page asks
"still right?" (MK-NW-F-003 valueFreshness).

## 8. What counts toward retirement, and the rate it grows at

The owner's rule of 2026-08-11 (DEC-0100): *"for calculating assets to count towards retirement - it
should be all assets minus primary home and primary car. If they want they can change which asset
should not count."*

- **Counted by default:** every account at 100% — cash, a rental, a second car, valuables included —
  except the home lived in, the car driven, and a 529 (legally someone else's). The person can set any
  account's share (MK-NW-F-030 earmarkDefault, MK-NW-F-032 earmarkedAmount, MK-NW-F-033
  retirementEarmarkedValue).
- **The car driven** is the most valuable VEHICLE; nothing else can be it (MK-NW-F-031).
- **The home lived in** is the property marked so; with none marked and no use stated on any, the
  property entered first (MK-NW-F-110 primaryHomeIdOf — the same reading MK-NW-F-107 propertyUses makes
  under DEC-1926). Two properties with no use stated are one home and one second home, never two homes.
  A property's use is stated, or read this way; a car has no use (MK-NW-F-013 realEstateUseOf).
- **The rate that money grows at** (MK-NW-F-037 blendedReturn) is each account's benchmark weighted by
  what it has set aside — over exactly the money counted above, property included. No figure when
  nothing is set aside; the Plan chooses its own 6% at its call site and says so there. The same for the
  portfolio's volatility (MK-NW-F-035; still a weighted average — a table of how classes move together
  is for the Plan build).
- **A month's contributions** (MK-NW-F-041): the 401(k) answer held at the year's elective limit for
  the person's age, the Roth answer as given, the investing answer, and the employer's match. Money
  saved toward a property is not a retirement contribution. Nothing answered is no figure, not $0.

## 9. Itemising a lump into holdings

MK-NW-F-073 itemising, MK-NW-F-051 itemizedResultTotal, MK-NW-F-052 buildItemizedAccounts.

- The total never falls below the entered total: what is not itemised stays as cash. It rises only when
  the holdings listed come to more, and the screen shows the new total before Done.
- Each new account carries what the lump carried — its retirement share, its source, and its wrapper
  (401(k), IRA, Roth IRA, HSA, 529).
- A bond's face value is entered or nothing; never today's value in its place. Without one, the
  account's page reads "not entered" and shows no yield to maturity.

## 10. The list under the class rows — by class, by institution

MK-NW-F-094 ledgerGroups. The same split as §3: an account holding several classes gives each class
group its part and sits, as a row, under the class most of it is in; by institution, its parts are the
mix line under the institution's name. Group totals by class equal the class rows; both views add to
What you own. Institution names are matched trimmed, capitals ignored.

## 11. How much history a linked account shared

MK-NW-F-046 historyCoverage. Months shared = whole months passed plus the part month by its days, to
one decimal; the sentence says years only when the months are an exact multiple of twelve ("1 year 6
months", never "2 years" for eighteen).

## Status and enforcement

Built and tested 2026-10-05 to 2026-10-07 (the outside review of Net worth batches 2, 3 and 4, and the
defects found while fixing them). Tests: `MoneyKeel/functions/networth-and-performance/outside_networth_02.test.ts`, `outside_networth_03.test.ts`, `outside_networth_04.test.ts`,
`outside_networth_02_found.test.ts`, `src/screens/__tests__/outside_networth_02.test.tsx`,
`src/domain/assets/classification.test.ts`, `src/domain/assets/selectors.test.ts`,
`src/services/sync/f6_money_market.test.ts`, `src/__tests__/founder_2026_08_11.test.tsx`.
Drawings: Net worth v08 and Performance v17 carry these changes at their top.
