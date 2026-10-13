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

The add-account form offers a CD and a money-market fund with Investments, not Cash, so the kind
list and the class agree (2026-10-08; one CD had sat under Cash on one total and Investments on another).

The sweep that corrects classes the app guessed (MK-NW-F-053 correctClassOf, MK-NW-F-054
reclassifyAccounts) never touches an account the person confirmed: what they said stands. It reads the
same order as the steps above, through the one function MK-NW-F-120 classEvidenceOf — a maturity date
before the name, and never a property's name — and a class the person picked in the editor is
recorded as theirs and kept (OpenAI's final audit, 2026-10-09, DEC-2748h, DEC-2484i, DEC-3035o: the
sweep had kept its own older copy of these rules, so "Ally Money Market CD" maturing 2027-06-30 was
re-filed as a fund and a home named "Silver Creek land" as an alternative). Inside an account, a
holding the person classed, or one waiting on their answer, is never re-filed; name evidence is
stored under its real class — Gold is Alternatives, never Stocks / Funds (DEC-2484r, DEC-3035f).

A property's name is a place, not evidence (second-round review, 2026-10-07): for a home, real
estate, a vehicle or anything in the property bucket, step 3 is skipped — 'Silver Lake house' is real
estate, not an alternative. A fund that writes options ('… COVERED CALL ETF') is a fund; put or call
means an option only with an option's shape (an expiry date or a strike).

## 2. What a holding inside an account is

One test, used wherever a holding's class matters — the split, the words under an account, the
account's own page (MK-NW-F-109 holdingClassOf):

1. The person's own answer, always. It outranks everything and survives every sync.
2. A holding nothing could class, that the person has not answered about, is **Unclassified** — the
   owner's ruling of 2026-09-30, "Refuse the line and ask" (DEC-2160). Net worth asks.
3. What its ticker and name are evidence for, unless that is cash (rule 3 above).
4. Otherwise the class stored when it arrived.

A holding with nothing stored — no broker tag, no kind picked, nothing in its name — is Unclassified
and asked about (DEC-2160, 'Refuse the line and ask'); it is never filed as Stocks / Funds by default.
Treasury wording from brokers ('TREAS', 'UST', 'T-bill', 'T-note', 'T-bond') counts as a Treasury in
the words under an account; 'government' does not — an agency bond is a bond (DEC-3035g, 2026-10-09).

## 3. How an account's money is split across the classes

MK-NW-F-027 accountClassBreakdown. The parts always add up to the account's balance.

- **A linked account.** Its uninvested cash is cash. Each priced holding is shares × price under its
  class. Each option is its value as synced — contracts × price per share × 100 (owner, Q06,
  2026-08-26) — under Alternatives. **Shares per contract (DEC-4646, 2026-10-12: "3,4, 8-approved"):** 10 when the
  broker (SnapTrade) marks it a mini option, else 100, stored with the option; an option typed by hand has a "Shares per
  contract" box, 100 unless changed, saved with the holding (MK-XS-I-063, read by MK-PF-F-031 contractMultiplier). If the parts fall short of the balance and a holding has **no
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

A hand-built account whose balance is built from its holdings is split holding by holding: each is
weighed at today's value (the price its balance was built from; what was paid only when there is none), and the invested part is shared out by
those weights — so a T-bill in a hand-built brokerage is Bonds & CDs (DEC-0051), not Stocks / Funds.

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

The Other investments summary (MK-NW-F-002) reads the same split: its total is the Alternatives line's
dollars, including a bitcoin fund or options inside a brokerage, and excluding an alternatives
account's own uninvested cash. Each part is rated by what it is, the person's own rate first.

Performance and a window the record cannot reach (second-round review, 2026-10-07; Performance v17):
where a daily record exists but begins after the window opens, there is no walk and no wealth
generated — a sentence names the record's first day. The ending stands on its own. With no record at
all, the account page's approved 'read back from your activity records' state stands, worked back from
today (his decision DEC-3656, 2026-10-10): a CD with a stated rate gains by its rate — $10,500 at 5% for a
year began at $10,000; a holding with no price history and no rate (a bond typed by hand) leaves that
account with no beginning and no wealth generated, and the screen says "The beginning can't be worked
back: Fidelity Brokerage has no price history." Day one opens every window today.

A balance that was never entered stays in view and reads "Value not entered" (his wording, DEC-3657):
an account row, a bank, a class whose only account has none, a group and a debt row — never $0, −$0
or dropped. The amber box names it; the bar and the percents count only what is known (DEC-3279e).
A debt with no balance is named in the amber box too.

The emergency fund, wherever its months show (Net worth, Job safety, Stress test, Insights, Home):
when a property's rent entry has no amount it can read, the months are counted without that rent and
the line reads "5.0 months, rent not included. Enter rent to include." (DEC-3769, DEC-3836, 2026-10-10).
A property with no rent entry at all is a second home (DEC-1926) and gets no line. A rent figure is a
number: one with words in it ("about 2k") is not read — never $2 — and the Income screen refuses a
change that carries a letter (DEC-3768c).

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

- A Roth 401(k) reads Roth 401(k); a tax-advantaged account with no kind and known digits takes its tax
  word (Roth, or 401(k) / IRA). A 529's and an HSA's words are fixed by what they are, whatever
  treatment is stated; '(Roth)' appears only for an account in the Roth bucket.

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
  **A use stated on ANY property stops that fallback** (owner, 2026-10-13, DEC-4913, *"approved."*): B
  marked the home with a rent entry naming B is a rental (DEC-3035p), and its home mark is still a stated
  use, so A with nothing stated is a second home, not promoted. Both count toward retirement: A $400,000
  + B $300,000 = $700,000 (before: $300,000). A stored 'rental' word alone does not stop the fallback.
  A property's use is stated, or read this way; a car has no use (MK-NW-F-013 realEstateUseOf).
- **The rate that money grows at** (MK-NW-F-037 blendedReturn) is each account's benchmark weighted by
  what it has set aside — over exactly the money counted above, property included. No figure when
  nothing is set aside; the Plan chooses its own 6% at its call site and says so there. The same for the
  portfolio's volatility (MK-NW-F-035; still a weighted average — a table of how classes move together
  is for the Plan build).
- **A month's contributions** (MK-NW-F-041): the 401(k) answer held at the year's elective limit for
  the person's age, the Roth answer as given, the investing answer, and the employer's match. Money
  saved toward a property is not a retirement contribution. Nothing answered is no figure, not $0.

- **The retirement money's twelve-month return** (MK-NW-F-004) weighs each account by what was set
  aside when the twelve months began — today's amount ÷ (1 + its return) — and is Σ now ÷ Σ start − 1.
  Weighing by today's amounts counted the account that grew most twice (13.72% where 12.98% is right).
- **An employer's percent match** is on the 401(k) figure after the yearly limit.
- **What a property is for** has one reading (MK-NW-F-117 propertyUseMap), used by the home, the use of
  one property, the cash-flow budget and the retirement share alike. Handed the Income screen's rent
  entries, a property is a rental only when an entry names it (DEC-1926) — a house marked as the home
  but rented out is a rental. A household with no home is told so (null), so an unstated property
  beside a stated second home is a second home, counted toward retirement. NOT YET WIRED: the Plan's
  callers do not hand in the rent entries, so there the stored use still decides (Plan build).

## 9. Itemising a lump into holdings

MK-NW-F-073 itemising, MK-NW-F-051 itemizedResultTotal, MK-NW-F-052 buildItemizedAccounts.

- The total never falls below the entered total: what is not itemised stays as cash. It rises only when
  the holdings listed come to more, and the screen shows the new total before Done.
- Each new account carries what the lump carried — its retirement share, its source, and its wrapper
  (401(k), IRA, Roth IRA, HSA, 529).
- A bond's face value is entered or nothing; never today's value in its place. Without one, the
  account's page reads "not entered" and shows no yield to maturity.

- Accounts made by itemising carry the typical yearly rate for their class, never 0%; a rate not
  entered on an itemised bond stays blank.
- A listed holding with no value is refused: nothing is built and the lump stays as it was — never a $0
  holding beside a remainder built as if final (DEC-3279f, 2026-10-09).

## 10. The list under the class rows — by class, by institution

MK-NW-F-094 ledgerGroups. The same split as §3. By class, every account that holds money in a class is
listed under it by its name with only its part in that class — Vanguard -0008 $45,000, Chase -0333
$34,000 — so the rows under a heading add up to the heading (his ruling, 2026-10-07, DEC-3146: "You are
showing class total which user cannot even see how you got to it"; it replaced the batch 4 rule of one
row under the largest class). By institution, an account is one row at its balance, its parts the mix
line under the institution's name. Group totals by class equal the class rows; both views add to
What you own. Institution names are matched trimmed, capitals ignored.

## 11. How much history a linked account shared

MK-NW-F-046 historyCoverage. Months shared = whole months passed plus the part month by its days, to
one decimal; the sentence says years only when the months are an exact multiple of twelve ("1 year 6
months", never "2 years" for eighteen).

- The sentence is built from whole months only, and months shown are rounded down: one day short of a
  year reads 11 months, never '1 year'.

## 12. A bond's or a CD's figures

MK-NW-F-056 bondInfo to MK-NW-F-064 bondRateSensitivity, MK-NW-F-112 yearlyInterest, MK-NW-O-001 theBonds.

- **A figure never entered is not entered — never $0.** A face value or a rate that was not typed
  stays blank; a typed 0 rate is a zero-coupon bond. The Bonds screen and the account's page say
  'face value not entered' or 'coupon rate not entered', and the totals name the bonds they leave out.
- **A year's interest, one rule everywhere** (yearlyInterest): face × rate; with no face, today's
  value × rate (a CD typed by its balance); with no rate, nothing (owner A46, 2026-08-26). The Bonds
  screen's total and the interest-income figure use it, so the two cannot disagree.
- **A matured bond pays nothing more — on every figure** (DEC-2748d, DEC-2748c, 2026-10-09): its own
  row, COUPON /year, the average yield and the income figure all count it at $0, through one function
  (MK-NW-F-126 yearlyInterestNow). $600 + $400 + $810 a year with the $600 one matured last month:
  COUPON /year $1,210. A maturity date that does not exist (30 February) is no date, never 'matured'.
- **Years left are exact, by anniversaries** (batch 06): whole years counted back from the maturity
  date, plus the days to the first anniversary ÷ the days in that year — one year to the day is 1.0.
- **A bond is priced at exact times**: the yearly coupon falls on each maturity anniversary; a matured
  bond, or one with no date, has no price. **Yield to maturity is solved exactly** on the full price —
  the value plus accrued interest. The approximation it replaced read −0.69% for a short 4% note where 5.73% is right.
  A bond with no face value, or a yield at or below −100%, has no price.
- **A CD: bought from the bank, or through a broker** (his decision DEC-3837, 2026-10-10). Adding a CD asks
  it once (Add an account and the Bonds screen's form). A bank CD yields its interest rate ($10,000 at 4.2%
  → 4.20%; with no face entered, still its rate). A broker CD is priced like a bond from its face value,
  interest rate, statement value and maturity date ($10,000 face, 4.2%, worth $9,850, 2 years left → about
  5.01%), with the accrued-interest estimate and note. A CD never answered reads as a bank CD.
- **A missing balance or holding value is never $0**: it is left out of the total, the amber box names
  the account, and an itemised remainder with a missing value is not final. Sums of money are exact
  decimals. A kind that names contents (crypto, private equity, hedge funds, other) claims no
  'Brokerage' wrapper unless the person confirmed one. 'CDs', 'certificates of deposit' and 'share
  certificates' are CDs. The accrued-interest note shows only for a bond that pays interest. Dates are
  read as calendar dates, never shifted by a time zone.
- **A bond's value is its statement market value, without accrued interest** (his ruling, 2026-10-09,
  DEC-3390, replacing A47). The yield on today's value is on that value. For the yield to maturity the
  accrued interest is ADDED — as entered, or estimated from the coupon schedule, and then the screen says:
  'Added estimated $1,119 in accrued interest to bond value at 4.5% coupon for 363 days to calculate YTM.
  If this is not accurate, enter actual accrued interest'. His Treasury worth $24,200 reads 5.69%.
- **If rates move one point**: the change is measured between two prices worked the same way — at
  the moved yield and at today's — then added to today's value. A bank CD is refused by the function
  itself, not only by the screen: it is not traded, so its value does not move with rates. A broker CD
  trades, and gets the estimate like a bond (DEC-3837 narrows DEC-2748f).

## 13. A saved record with no accounts

MK-NW-F-044 getAssetsState, MK-NW-F-111 assetsStateFrom. A saved record whose accounts were all
deleted is shown as nothing saved — the first-day screen — never as $0 owned with an average return.

## 14. His answers on OpenAI's open points, and what followed (2026-10-10 / 11)

- **A bond or CD with no maturity date** keeps counting its interest — no date means unknown, not matured (DEC-0332); its row reads "maturity date not entered" (DEC-4036b). Treasury $10,000 at 4%, no date: $400 a year.
- **"CD" is read only from an account's own name or type**, never its institution's name — a brokerage account at "CD Capital" is not a CD (DEC-4036c).
- **Tax by what the account is:** a 529 is always tax-free for education and an HSA always pre-tax going in, whatever setting or bucket is stored (DEC-4036d, DEC-4036e). An account with no tax type chosen is never assumed taxable: its page reads "tax type not stated — choose ›", and no form preselects Taxable (DEC-4036f). Withdrawal planning, which needs a bucket, counts it taxable and names it: "Brokerage — tax type not stated; counted as taxable until you choose." It reads tax the way the account page does, so a 401(k) with no stored type is pre-tax there (DEC-4105).
- **The old sign-up answer "savings or portfolio"** is Unclassified and asked: "Is this cash savings or investments?" (DEC-4036g).
- **Money in an alternatives part no priced holding explains** reads "$1,500 asset type not classified" — no growth rate; the rate and growth cover the classified part and say so (DEC-4036h).
- **An overdrawn hand-built account is negative cash:** balance −$100 with a cash field of $50 is Cash −$100 (DEC-4036i).
- **A vehicle with no value** is never picked as the car you drive while another has one, and the screen says: "Car A's value not entered — it may be the car you drive." (DEC-4036j). **The retirement money names what it leaves out:** "leaves out Linked 401(k) — Value not entered" (DEC-4036k).
- **Every bond or CD date comes from a date picker** (DEC-4059b). **A history start date that cannot be read** says "History start date cannot be read. Edit date", and the person's date is kept through every sync (DEC-4059c).
- **Rent needs its property:** a rent entry is not counted until its property is picked (DEC-4059d). Sign-up asks "Which property is it?" when a property exists (DEC-4327), and otherwise offers "Add the property first ›", which returns to the rent step — about 4 taps, without leaving sign-up (DEC-4350).
- **A count written in words** takes its plural from one list of every counted word and its plural — "2 Treasuries", "0 properties" — and a test refuses a word not on it (DEC-4082). The risk swing of Will my money last is parked until the Plan module (DEC-4082, tracker).
- **The empty Debts door reads "Add your debts ›"** everywhere (DEC-4528).
- **A property's edit sheet never asks "What's it invested in?"** (DEC-4529).
- **An option's shares per contract** come from the broker (10 for a mini option, else 100) or from the person ("Shares per contract", default 100) — never a guessed 100 (DEC-4646, 2026-10-12).

## Status and enforcement

Built and tested 2026-10-05 to 2026-10-07 (the outside review of Net worth batches 2, 3, 4 and 5, the second-round
reviews of batches 2, 3 and 4, and the defects found while fixing them). Tests: `MoneyKeel/functions/networth-and-performance/outside_networth_02.test.ts`, `outside_networth_03.test.ts`, `outside_networth_04.test.ts`, `outside_networth_05.test.ts`, `src/screens/__tests__/outside_networth_05.test.tsx`, `outside_networth_02_final.test.ts`, `outside_networth_03_final.test.ts`, `outside_networth_04_final.test.ts`,
`outside_networth_02_found.test.ts`, `src/screens/__tests__/outside_networth_02.test.tsx`,
`src/domain/assets/classification.test.ts`, `src/domain/assets/selectors.test.ts`,
`src/services/sync/f6_money_market.test.ts`, `src/__tests__/founder_2026_08_11.test.tsx`.
Drawings: Net worth v08, Performance v17 and Bonds v02 carry these changes at their top.
