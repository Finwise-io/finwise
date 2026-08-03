# How the official specifications say institution data should arrive — SnapTrade, Plaid, TurboTax, and the OFX standard

**Research report v2 (official documentation round) · 2026-08-04 · for MoneyKeel (FCC 55–70)**

Round 1 (v1, same folder) recorded what real connections *actually* delivered. This round reads the
**official rulebooks**: SnapTrade's published API reference, Plaid's published schemas, TurboTax's
institution-import program, and the underlying Open Financial Exchange standard. The founder's
framing drives it: *"institutions and TurboTax provide details on how they transfer data; TurboTax
is the best example of reading data from different institutions correctly."*

Plain-language terms used throughout:

- **API** — the machine-to-machine doorway a service publishes so software can request data.
- **Fixed value list** — a published, closed list of allowed values for a field (programmers call
  this an *enum*). "This field is always one of: buy, sell, dividend…" A field *without* such a
  list is free text: whatever the institution typed.
- **CUSIP** — the 9-character identification number Wall Street uses for bonds and CDs instead of
  a ticker (defined in v1).
- **FIGI** — Financial Instrument Global Identifier, a 12-character open-standard security ID.
- **OFX** — Open Financial Exchange, the 1997 file/wire standard behind Quicken and TurboTax
  downloads. **FDX** — Financial Data Exchange, the industry body that now maintains OFX.

---

## Summary table — what each source officially documents

| Source | What it is | What is documented as a fixed value list | What stays free text / undocumented |
|---|---|---|---|
| **SnapTrade API reference** (docs.snaptrade.com) | Our live brokerage connection today | Activity types (19 values), security type codes (14 values), account category (3 values: INVESTMENT / DEPOSIT / LOC), account status (open / closed / archived) | **Account type (`raw_type`) is explicitly "as provided by the brokerage" — no list.** The `meta` object is officially deprecated and documented as having "no standard format". No CUSIP anywhere; no IRA-vs-taxable wrapper field at all. |
| **Plaid** (plaid.com/docs + published machine-readable spec) | Our beta connection (pivot decided 2026-08-02) | Account types (5) and subtypes (~80, incl. every retirement wrapper: ira, roth, 401k, sep ira…), security types (9), security subtypes (33), investment transaction types (6) + subtypes (50), credit-card interest-rate types (4) | Security `name` and transaction `name` are institution text; `type` can be null "when institutional data is insufficient"; CUSIP/ISIN fields exist but are licence-gated (null for us) |
| **TurboTax import program** (Intuit help center + the OFX Tax Extension spec it rides on) | The founder's "best example" — tax forms imported from institutions without re-typing | Every 1099 box is a named field in a versioned spec (TAX1099B_V100, TAX1099DIV_V100…), incl. per-sale detail records with acquisition date, sale date, cost basis, wash-sale flags | Nothing important — that is the whole point. The *sender* (institution) must conform; the reader never parses prose. |
| **OFX standard itself** (v2.3, maintained by FDX) | The 1997-vintage standard brokerages already implement for Quicken downloads | Position records per asset class, a security master list keyed by CUSIP, income types (dividend / interest / capital gains), and a bond record **with a real maturity-date field, `DTMAT`** | Free-form `MEMO` fields only |

**The one-sentence takeaway:** the industry already solved most of our normalization problems *on
paper* — Plaid publishes the account-wrapper vocabulary, OFX has carried bond maturity as a real
field since 1997, and TurboTax proves conformance-to-a-spec is what makes imports accurate — but
our live evidence (v1) shows production data still deviates from the paper, so the rules below read
the documented fields **first** and verify against reality **always**.

---

## 1 · SnapTrade — what their official reference actually promises

### 1.1 The account object: three normalized fields, the rest is the brokerage talking

SnapTrade's "Get account detail" reference documents these fields (descriptions quoted from the
reference):

| Field | Documented meaning |
|---|---|
| `id` | SnapTrade's own identifier for the account |
| `name` | Display name "assigned by user or brokerage" — i.e., text, not a category |
| `number` | "The account number assigned by the brokerage. For some brokerages, this field **may be masked** for security reasons." |
| `institution_name` | "The name of the brokerage that holds the account." |
| `institution_account_id` | A **stable identifier from the institution** that "helps detect the same account across multiple connections" |
| `status` | One of **open / closed / archived**, "or null if the status is unknown" |
| `raw_type` | **"The account type as provided by the brokerage."** No value list is published — it is pass-through text. |
| `account_category` | The only normalized typing: **INVESTMENT, DEPOSIT, or LOC** (line of credit) |
| `meta` | "Additional information about the account, such as account type, status, etc. **This information is specific to the brokerage and there's no standard format for this data.**" — and the field is officially **deprecated** |
| `is_paper` | Whether it is a simulated trading account |
| `sync_status`, `balance`, dates | Sync bookkeeping, total value, created/funded/opening dates |

What this tells us, in plain English:

- **The account-number masking we hit live ("…9Cmw") is documented behavior**, not a glitch. The
  docs say the number may be masked — so our rule "only show a mask when the tail is real digits"
  is the right permanent posture.
- **There is no wrapper vocabulary at all.** Nothing in SnapTrade's schema can tell us
  Roth-vs-Traditional-vs-taxable as a documented value — `raw_type` is whatever E*TRADE or
  Vanguard typed. Their own FAQ confirms: "we support all kinds of accounts and **it is brokerage
  dependent**… if the brokerage returns it to us, we will return it over the API." This is the
  official confirmation that our **Held-in confirmation** (ask the user which tax wrapper) is not
  a workaround — it is the only correct design on this road. It also explains the founder's
  "savings" mislabel (v1 correction): a brokerage-dependent text field, faithfully passed through.
- **`institution_account_id` is a documented dedupe key** we should use for the absorb-the-twin
  rule (same real account arriving via two roads or two connections).

### 1.2 Cash and buying power: the double-count is in the manual

The balance reference says, verbatim:

> "The amount of available cash in the account… **Money market funds will be included in this
> field, and also returned in positions endpoints with `cash_equivalent` = true**"

So the money-market double-count we discovered live at E*TRADE (v1, Part A point 5) is not a bug we
stumbled on — **it is the documented shape of the data**. The same fund is *supposed* to appear in
both the cash balance and the positions list. Our subtract-once rule is therefore permanent,
docs-backed behavior, not a per-broker patch.

Also documented: `buying_power` "only applies to margin accounts… **not always available for all
brokerages**", both cash and buying power are nullable, cash can be negative on margin, and one
account can hold several currencies (each as its own balance row). Practical reading for MoneyKeel:
buying power is a trading concept we can ignore; **cash minus money-market holdings** is the number
that means "uninvested cash".

### 1.3 Securities: a universal symbol keyed by ticker + FIGI — CUSIP does not exist here

Every position carries a **UniversalSymbol**: SnapTrade's own ID, the ticker (`symbol`), the raw
brokerage ticker (`raw_symbol`), a human-readable `description`, currency, exchange, a security
type, and FIGI codes "when available". The symbology guide adds: symbols follow Yahoo-style
exchange suffixes ("AAPL", "VAB.TO"), **"a symbol is not guaranteed to be stable"**, options use
the Options Clearing Corporation symbol format ("SPY 220819P00200000"), and crypto tickers are
deliberately **not** normalized (Kraken may say "XBT" where others say "BTC"). Their advice for
matching against outside systems: "**Prefer FIGI**."

**CUSIP and ISIN are not mentioned anywhere in SnapTrade's symbology documentation.** There is no
CUSIP field in the schema. So when the founder's CDs arrived with a CUSIP *in the ticker field*
(v1, live), that was a brokerage stuffing an identifier into a slot never designed for it — the
official model has no home for fixed-income identity. This is worth saying plainly: **on the
SnapTrade road, bonds and CDs are outside the documented symbol model**, and our
description-text classifier is load-bearing, not a nicety.

The security **type codes** SnapTrade does enumerate (14): `ad` ADR, `bnd` Bond, `cs` Common
Stock, `cef` Closed End Fund, `crypto` Cryptocurrency, `et` ETF, `oef` Open Ended Fund, `pm`
Precious Metals, `ps` Preferred Stock, `rt` Right, `struct` Structured Product, `ut` Unit, `wi`
When Issued, `wt` Warrant. Note what is **missing**: no "money market" type, no "CD" type, no
"cash" type. A money-market fund can only ever arrive as an open-ended fund plus (at best) a
`cash_equivalent` flag — which matches the live evidence that VMFXX arrived with no cash signal
at all.

### 1.4 Activities: 19 documented types, best-effort, with documented sign conventions

The activities reference enumerates exactly these type values: **BUY, SELL, DIVIDEND,
SUBSTITUTE_DIVIDEND, CONTRIBUTION, WITHDRAWAL, REI (dividend reinvestment), STOCK_DIVIDEND,
INTEREST, FEE, TAX, OPTIONEXPIRATION, OPTIONASSIGNMENT, OPTIONEXERCISE, TRANSFER,
EXTERNAL_ASSET_TRANSFER_IN, EXTERNAL_ASSET_TRANSFER_OUT, SPLIT, ADJUSTMENT** — with the honest
caveat that SnapTrade does "**a best effort** to categorize brokerage transaction types into a
common set of values," and (per the Account Data guide) returns **brokerage-specific types** when
a transaction doesn't fit the standard set. Sign conventions are documented: positive amounts
increase the account's cash (sells, deposits, dividends), negative amounts decrease it (buys,
withdrawals, fees). `description` is "usually the brokerage's description". Option trades carry
`option_type` (BUY_TO_OPEN / BUY_TO_CLOSE / SELL_TO_OPEN / SELL_TO_CLOSE).

**The live-vs-docs gap, stated precisely:** the founder's E*TRADE account delivered six figures of
maturing-CD payouts under a type called **REDEMPTION — which is not one of the 19 documented
values**. That is the documented "brokerage-specific passthrough" escape hatch firing in
production. Lesson: the enumerated list is the *start* of the parser, never its boundary — every
unrecognized type must land in a reviewed bucket, not be dropped.

Also documented and useful: **orders vs activities** are different feeds (orders update intraday
with short history; activities update **once per day** — their FAQ: "guaranteed once per day" but
"not consistent at the same time every day" — with deep history). Our "As of…" freshness sentence
should assume daily, variable-hour arrival, which is exactly what Rule 5 already says.

### 1.5 One more production-vs-docs deviation we hold receipts for: the envelope bug

SnapTrade's documentation examples show the activities endpoint returning a **bare list** of
transactions. Production returns a **pagination envelope** — a wrapper object
`{data: […], pagination: {total}}` — live-verified 2026-07-19 against the founder's real E*TRADE
connection (the dated note sits in `src/services/sync/snaptradeSync.ts`, lines 20–22). Build 43
trusted the documented shape, read the envelope as if it were the list, ingested **zero** activity
rows, and still advanced its bookmark — the self-heal and both-shapes parser now pinned by
`snaptradeSync.orch.test.ts` are the scar tissue. This is the single clearest proof that
**documentation tells you where to look, and only reality tells you what you'll find** — which is
why every rule in Part 5 keeps a verify-against-reality step.

---

## 2 · Plaid — the normalization gold standard we're adopting for beta

Plaid (our post-Build-48 beta provider, pivot decided 2026-08-02) publishes what SnapTrade does
not: **closed vocabularies for almost everything**, in human docs *and* in a machine-readable
schema file (their published OpenAPI specification — we verified the lists below against the
schema file itself, not just the web pages).

### 2.1 Account taxonomy: five types, and a real wrapper vocabulary

Every Plaid account has a `type` — one of **depository, credit, loan, investment, other** — and a
`subtype` from a documented list per type:

- **depository**: cash management, **cd**, checking, ebt, hsa, limited purpose checking,
  **money market**, paypal, prepaid, savings
- **credit**: credit card, paypal
- **loan**: auto, business, commercial, construction, consumer, home equity, line of credit,
  loan, mortgage, overdraft, student
- **investment** (the list that matters most to us): *401a, 401k, 403B, 457b, 529, brokerage,
  cash isa, crypto exchange, education savings account, fhsa, fixed annuity, gic, health
  reimbursement arrangement, ira, isa, keogh, lif, life insurance, lira, lrif, lrsp, mutual fund,
  non-custodial wallet, non-taxable brokerage account, pension, prif, profit sharing plan, qshr,
  rdsp, resp, retirement, rlif, **roth, roth 401k**, roth 403B, roth 457b, roth pension, roth
  profit sharing plan, roth thrift savings plan, rrif, rrsp, sarsep, **sep ira, simple ira**,
  sipp, stock plan, tfsa, thrift savings plan, trust, ugma, utma, variable annuity*
  (many are UK/Canada wrappers — the US set we care about is bolded-adjacent: 401k, 403B, 457b,
  529, brokerage, ira, roth, roth 401k, sep ira, simple ira, stock plan, ugma/utma, trust)
- **other**: other

Two details worth calling out:

1. **The machine-readable spec keeps ONE flat subtype list shared across all types** (verified in
   the schema file), and the docs page maps each subtype to its type(s). `hsa` sits with the
   depository subtypes (a cash-only health savings account); an HSA that holds investments
   surfaces as an investment-type account. Bank **CDs are a depository subtype (`cd`)** — so on
   the Plaid road, a bank CD is an *account*, while a brokered CD inside a brokerage account is a
   *security* (see 2.2). Two different objects for the same word — our taxonomy already splits
   them the same way (bank CD = cash-side account; brokered CD = Bonds & CDs holding).
2. **This is the vocabulary our Held-in question can pre-fill.** Where SnapTrade gives us free
   text, Plaid gives us `ira` / `roth` / `401k` as documented values — the confirmation step
   changes from "guess then ask" to "propose the documented subtype, ask only to confirm".

Balances are documented as `available`, `current`, `limit`, currency codes, and
`last_updated_datetime`.

### 2.2 The security object: nine types, thirty-three subtypes, and a real fixed-income record

Quoting Plaid's schema for `security.type` — "In rare instances, a null value is returned when
institutional data is insufficient to determine the security type. Valid security types are:"

- `cash` — "Cash, currency, and **money market funds**"
- `cryptocurrency` — "Digital or virtual currencies"
- `derivative` — "Options, warrants, and other derivative instruments"
- `equity` — "Domestic and foreign equities"
- `etf` — "Multi-asset exchange-traded investment funds"
- **`fixed income` — "Bonds and certificates of deposit (CDs)"**
- `loan` — "Loans and loan receivables"
- `mutual fund` — "Open- and closed-end vehicles pooling funds of multiple investors"
- `other` — "Unknown or other investment types"

And a **subtype** list (33 values) that gets as specific as: asset backed security, bill, bond,
bond with warrants, cash, cash management bill, common stock, convertible bond, convertible
equity, cryptocurrency, depositary receipt, depositary receipt on debt, etf, float rating note,
fund of funds, hedge fund, limited partnership unit, medium term note, **money market debt**,
mortgage backed security, **municipal bond**, mutual fund, note, option, other, preferred
convertible, preferred equity, private equity fund, real estate investment trust, structured
equity product, treasury inflation protected securities, unit, warrant.

On cash and sweeps: securities carry **`is_cash_equivalent`** — "Indicates that a security is a
highly liquid asset and can be treated like cash" — so a money-market sweep arrives as `type:
cash` (money market funds are *named* in the cash type's definition) and/or flagged
`is_cash_equivalent: true`. Plaid even runs this flag upstream: **Core Exchange**, "Plaid's free,
fully FDX-compliant API specification" that institutions implement so Plaid can read their data,
lets the institution declare `isCashEquivalent` itself (and falls back to whether the account is a
cash account when the institution doesn't say — per the Core Exchange v5.1 reference). In other
words, Plaid solves the "is this cash?" question the TurboTax way: **make the institution declare
it against a spec**, don't make the reader guess.

**The headline for our CD problem — Plaid documents a real maturity field.** Each fixed-income
security can carry a `fixed_income` record (verified verbatim in the schema file):

- **`maturity_date`** — "The maturity date for this fixed income security" (a real date field)
- `issue_date` — the issue date
- `face_value` — "The face value that is paid upon maturity… **per unit of security**"
- `yield_rate` — a percentage plus a documented type: `coupon`, `coupon_equivalent`, `discount`,
  or `yield` (each defined — e.g. coupon-equivalent is for Treasury bills sold at a discount)

So on the Plaid road, a brokered CD *can* arrive as `fixed income` / `bond` with an actual
maturity date and face value — the schema-first answer v1's description-parsing rule was standing
in for. (Whether a given institution *fills* it is a conformance question — see Rule 6.)

Other documented security fields: `ticker_symbol` ("otherwise a short identifier if available" —
i.e., can be absent for bonds), `name`, `institution_security_id` (the institution's own ID),
`figi`, market identifier code, sector/industry, options detail (`option_contract` with put/call,
expiration date, strike), and — important licensing reality — **`cusip` and `isin` fields exist
but are "null by default for new customers" (and for existing customers since March 12, 2024)
unless you hold a verified CUSIP Global Services license.** Practical consequence for MoneyKeel:
even on Plaid, **we should not plan on receiving CUSIPs**; FIGI and the institution's own ID are
the identifiers we'll actually hold.

### 2.3 Investment transactions: six types, fifty subtypes, documented signs

Types (verbatim): `buy`, `sell`, `cancel` ("A cancellation of a pending transaction"), `cash`
("Activity that modifies a cash position"), `fee`, `transfer` ("Activity which modifies a
position, but not through buy/sell activity e.g. options exercise, portfolio transfer").

Subtypes — the complete 50-value list from the machine-readable spec: account fee, adjustment,
assignment, buy, buy to cover, contribution, deposit, distribution, dividend, dividend
reinvestment, exercise, expire, fund fee, interest, interest receivable, interest reinvestment,
legal fee, loan payment, long-term capital gain, long-term capital gain reinvestment, management
fee, margin expense, merger, miscellaneous fee, non-qualified dividend, non-resident tax, pending
credit, pending debit, qualified dividend, rebalance, **return of principal**, request, sell, sell
short, send, short-term capital gain, short-term capital gain reinvestment, spin off, split, stock
distribution, tax, tax withheld, trade, transfer, transfer fee, trust fee, unqualified gain,
withdrawal.

Note **"return of principal"** — the closest documented cousin of the REDEMPTION rows E*TRADE
sent us for maturing CDs. Plaid at least has a word for it; our booking rules should map both to
the same "maturity payout, not a deposit" treatment (the personal-return-corrupting trap from v1).

Sign conventions are documented and *opposite in feel* to SnapTrade's: quantity is "positive for
buy… negative for sell"; **amount is "positive values when cash is debited, e.g. purchases of
stock; negative values when cash is credited, e.g. sales of stock."** (SnapTrade: a buy is a
*negative* amount. Same economics, flipped signs — a translation-layer detail our ingest must own
per road, with tests.) History depth: "Up to 24 months of investment transactions data"; updates
are checked "overnight, after market hours".

### 2.4 Liabilities: the documented card/mortgage/student-loan record (for the post-beta card work)

Plaid's Liabilities product covers exactly: credit accounts with subtype **credit card / paypal**,
and loan accounts with subtype **student / mortgage**. Credit cards carry an `aprs` array — each
entry an `apr_percentage` plus a documented `apr_type`: **balance_transfer_apr, cash_apr,
purchase_apr, special** — plus `last_payment_amount`, `last_statement_issue_date`,
`last_statement_balance`, `minimum_payment_amount`, `next_payment_due_date`, `is_overdue`.
Mortgages carry an interest rate typed **fixed or variable**, `origination_date`, and — again a
real date field — **`maturity_date`**. Student loans carry rate, origination date, expected payoff
date, repayment-plan and loan-status records. When the card-transactions feature (new,
design-first, post-48) reaches build, this is its documented data floor.

---

## 3 · TurboTax — why "the best example" is the best example

### 3.1 How the import actually works

TurboTax's own help center describes the model: "**If your broker or financial institution is a
TurboTax import partner, you can import the following forms into TurboTax: 1099-B, 1099-DIV,
1099-INT, 1099-OID, 1099-R**" (plus 1099-NEC and most 1099-MISC), with published availability
dates each season (Jan 31 / Feb 15 for the current one), and the fallback: "If your financial
institution isn't a partner, you can upload the forms from your computer or type it in yourself."
The user picks their institution inside TurboTax, signs in with the institution's credentials, and
the forms flow in. TurboTax Online documents a cap of roughly 1,500 imported transactions per
institution.

The wire underneath is the **OFX Tax Extension Specification** — a tax add-on to OFX 2.3, now
hosted and maintained by the Financial Data Exchange. Intuit co-created OFX (see Part 4), and the
"import partner" program is, in essence: *implement this spec, get listed in our institution
directory, get certified.*

### 3.2 What the spec actually defines (read from the spec itself, version 2020.0)

The spec defines one versioned record per tax form: **TAX1099B_V100, TAX1099DIV_V100,
TAX1099INT_V100, TAX1099MISC_V100, TAX1099OID_V100, TAX1099R_V100, TAX1099NEC_V100** (2020
onward), **TAXW2_V200 / TAXW2C_V200**, the 1098 mortgage/education family, and even TAXPDF_V100
(a defined way to attach the PDF). Versions map to tax years because "IRS Tax forms can change
year to year… Tax OFX messages closely mimic tax form information."

The governing sentence — the whole philosophy in one line, quoted from the 1099-B section:

> "**Data sent in the TAX1099B_V100 aggregate must exactly match the tax data reported on the
> form 1099-B received by the account holder.**"

The 1099-B record carries named fields for date of sale (**DTSALE**), the security's CUSIP
(**CUSIPNUM**), stock/bond gross proceeds, federal tax withheld, description, and an extension
(**EXTDBINFO_V100**) holding **per-sale detail records (PROCDET_V100)** — the Schedule-D detail
TurboTax fills line by line: Form 8949 checkbox code, **DTAQD** (date acquired) *or* **DTVAR**
("the security was acquired over a period of time"), DTSALE, security name, **NUMSHRS** (share
count), **COSTBASIS**, **SALESPR** (total sale price, "not the price per share"), accrued market
discount, **LONGSHORT** (holding period), **WASHSALE** plus **WASHSALELOSSDISALLOWED** ("required
if WASHSALE is Y"), **NONCOVEREDSECURITY**, **BASISNOTSHOWN**, and a family of adjustment fields
(CORRECTEDCOSTBASIS, TOTALADJ, ADJCODES — added for tax year 2020). The 1099-DIV record names
every box: **ORDDIV** (ordinary dividends), **QUALIFIEDDIV**, **TOTCAPGAIN**, collectibles gain,
un-recaptured Section 1250 gain, Section 1202 gain, nontaxable distributions, federal tax
withheld, Section 199A dividends, foreign tax paid, and so on.

### 3.3 Why this yields accuracy — four design choices, each transferable

1. **The burden is on the sender, not the reader.** The institution must produce named fields that
   "exactly match" the paper form. TurboTax never parses a description string to find a cost
   basis. *(Transfer: on connected roads we are the reader — so we push toward the roads where
   senders conform (Plaid's documented fields, Core Exchange upstream); on the CSV road, our
   written extraction rules ARE the spec, and they must be versioned and tested like one.)*
2. **Every field has one defined meaning, tied to a real-world anchor** (an IRS box). No field
   does double duty. *(Transfer: one concept → one field → one number — already our accuracy P0;
   the anchor for us is the broker's own dollar totals.)*
3. **The spec can say "I don't know" — honesty is in the schema.** COSTBASIS "may not always be
   known by an FI if the security was transferred from another FI"; NONCOVEREDSECURITY and
   BASISNOTSHOWN are explicit flags; DTVAR exists precisely for "acquired over time". Unknowns are
   *declared*, never silently guessed. Servers even signal capabilities up front (an EXTD1099B
   flag announces "I provide per-sale detail"). *(Transfer: when maturity or wrapper or cost basis
   is unknown, our data model should store "unknown" and the screen should say so — never a
   silent guess. The Held-in confirmation and the "estimate" labeling already follow this;
   maturity handling should too.)*
4. **Versioned per year + per-institution certification.** Forms change, so records are versioned;
   institutions join a partner list and are effectively re-certified every season (the published
   per-form availability dates are the visible edge of that process). *(Transfer: per-institution
   conformance fixtures — a frozen real E*TRADE payload, a frozen Vanguard payload — re-run on
   every sync-code change, plus a dated re-verify when a brokerage migrates platforms, as
   E*TRADE/Morgan Stanley just did.)*

---

## 4 · The OFX standard — the 1997 answer to our 2026 CD problem

**What OFX is:** Microsoft, Intuit and CheckFree announced Open Financial Exchange on January 16,
1997 (version 1.0 shipped that February); it is the standard behind bank/brokerage downloads into
Quicken and similar software. Current version is 2.3. QFX is Intuit's variant of the same thing —
the ".qfx file" a user downloads from a brokerage website ("Web Connect") versus the direct
server-to-server form ("Direct Connect"). In 2019 the OFX consortium joined the **Financial Data
Exchange**, which now maintains the specification.

**What OFX defines for investment accounts** (from the OFX 2.1.1/2.3 investment schema):

- **Positions, typed per asset class**: POSSTOCK (stocks), **POSDEBT (bonds/CDs)**, POSMF (mutual
  funds), POSOPT (options), POSOTHER — all sharing common fields: held-in account, position type,
  **UNITS, UNITPRICE, MKTVAL** (market value), price-as-of date, memo.
- **A security master list (SECLIST)** separate from positions: every security gets a SECINFO with
  a **SECID (UNIQUEID + UNIQUEIDTYPE — CUSIP is the standard identifier; non-US institutions
  without CUSIP access must supply their own unique ID)**, a security name, and a ticker. Position
  rows point at the master list — precisely the "CUSIP never leads on screen; the name does"
  separation our Rule 2 asks for.
- **A real bond record — DEBTINFO** — with these fields: par value, debt type (coupon vs
  zero-coupon), debt class (treasury/municipal/corporate/other), coupon rate, next coupon date,
  coupon frequency, call price, yield to call, call date, call type, yield to maturity, **DTMAT —
  the maturity date, as a real date field** — and asset class.
- **Typed income transactions**: an INCOME record with an INCOMETYPE value list — **CGLONG
  (long-term capital gain), CGSHORT, DIV, INTEREST, MISC** — plus REINVEST, and dedicated
  BUYDEBT/SELLDEBT records for bond trades.

**The answer to the CD question is therefore: YES.** The standard the brokerages have implemented
for Quicken since the late 1990s carries a CD's maturity date as a first-class field (`DTMAT` in
DEBTINFO), sitting right next to the CUSIP, coupon rate, and par value. Plaid's
`fixed_income.maturity_date` (Part 2.2) is the modern re-statement of the same field. Our v1
finding stands — *the CSV exports and the SnapTrade road dropped this field* — but the industry
answer exists, which reframes Rule 2:

- Maturity-from-description parsing is the **fallback for roads that lost the field**, not the
  primary design.
- **Product option worth a founder decision:** accept **QFX/OFX file import** alongside CSV.
  Vanguard's own combined export is even named `ofxdownload.csv` (v1) — the brokerages' "download
  for Quicken" buttons emit files where positions are typed, securities carry CUSIP + name, and
  bonds carry DTMAT/coupon/par value as data. One standard parser could cover every brokerage that
  offers Quicken downloads, with *no* per-institution column guessing. (Not scoped; flagged as an
  option surfaced by this research.)

---

## 5 · Synthesis — the six rules, rewritten schema-first (v2)

**The new ordering that governs all six:** ① read the **documented fields and value lists** first
(Plaid types/subtypes, SnapTrade's enumerated codes, OFX fields) → ② fall back to **description
text extraction** where the road lost the field → ③ use the **broker's dollar amounts as the
tiebreak and the audit** — and at every step, ④ **verify against reality**, because production
deviates from its own manual (the envelope bug: docs showed a bare list, production sent a
pagination wrapper and Build 43 ingested zero rows; REDEMPTION arriving outside the documented
19 activity types; "savings" as a `raw_type` from a brokerage-only source; SnapTrade's own support
matrix promising no E*TRADE fixed income while the live account delivered CDs).

**Rule 1 v2 — Account names: institution + documented wrapper word, never a ticker.**
Unchanged core (v1), now grounded: on the Plaid road the type word comes from the **documented
subtype** (`roth` → "Roth IRA", `401k` → "401(k)", `brokerage` → "Individual Brokerage"); on the
SnapTrade road `raw_type` is documented free text, so we map the strings we've verified and route
everything else through the Held-in confirmation. The docs also confirm numbers may be masked —
the "only mask real digits" line stays permanent.

**Rule 2 v2 — Maturity: field first, text second, honest-unknown third.**
① Read the documented field when the road has one: Plaid `fixed_income.maturity_date` (+
`face_value`, `yield_rate`), OFX `DTMAT` if we ever ingest QFX files, Plaid mortgage
`maturity_date` on the debt side. ② Where the road lost it (SnapTrade, CSV), extract from the
description with v1's tolerant patterns (latest future date wins). ③ Where neither works, store
and show "maturity unknown" — the TurboTax lesson that unknowns are declared, never guessed.
Classification stays description-first on SnapTrade (their security-type list has no CD concept at
all — documented), but on Plaid the documented `fixed income` type/subtypes lead. Bond prices per
$100 of face: Plaid's `face_value` is "per unit", so the same 100× trap exists — pin with a test.

**Rule 3 v2 — Sub-accounts: separate underneath (documented tax units), grouped on top.**
Unchanged presentation (one institution group). New, docs-backed mechanics: use SnapTrade's
`institution_account_id` — documented as the stable institution-side ID "across multiple
connections" — as the absorb-the-twin dedupe key; on Plaid, each account's documented
type/subtype is the tax unit that must never merge (a `roth` and a `brokerage` under one login
stay separate rows). The founder correction stands: a brokerage-only connection can never yield a
bank account, whatever `raw_type` says.

**Rule 4 v2 — Sweep money is cash, once — and the double-count is now documented, not inferred.**
SnapTrade's balance reference states money-market funds appear in **both** the cash balance and
the positions list — subtract-once is permanent, all-brokerage behavior. Detection is layered:
documented flags first (Plaid `security.type = cash` and `is_cash_equivalent`; SnapTrade position
`cash_equivalent`), curated money-market ticker list second (live evidence: VMFXX arrived with no
flag), wording third. Bank CDs on Plaid arrive as **accounts** (depository subtype `cd`) — cash
side of the taxonomy; brokered CDs arrive as **securities** (`fixed income`) — Bonds & CDs. Same
word, two documented objects, two homes.

**Rule 5 v2 — One freshness sentence, cadence now docs-backed.**
Unchanged grammar ("As of Aug 3 — updated automatically from E*TRADE."). The expectations behind
it are now cited, not vibes: SnapTrade syncs once daily at no fixed hour (their FAQ, verbatim
"guaranteed once per day"); Plaid checks "overnight, after market hours"; orders-vs-activities
freshness differs by feed. The connection-broken variant stays honest per v1.

**Rule 6 v2 — Schema-first, reality-checked (replaces "trust dollars, not flags").**
v1 said flags lie, follow the money. The official docs refine that into a working order:
documented value lists are *real and usable* — Plaid's wrapper subtypes, its 50 transaction
subtypes, SnapTrade's 19 activity types — and we should consume them as the primary read instead
of re-deriving from text. But every list has a documented escape hatch ("best effort",
brokerage-specific passthrough, nullable type "when institutional data is insufficient") and a
proven production gap (envelope bug; REDEMPTION; the support-matrix floor). So: **(a)** parse
enums first; **(b)** treat every value outside the documented list as a first-class event — log
it, quarantine it into a reviewed bucket, never drop it silently; **(c)** reconcile the parsed
result against the broker's dollar totals (positions + cash vs reported total — the Vanguard
missing-total lesson); **(d)** keep per-institution golden fixtures (frozen real payloads) as
conformance tests re-run on every sync change — our version of TurboTax's annual partner
certification; **(e)** when a guess would touch tax math, ask the user (Held-in confirmation) —
because on the SnapTrade road the wrapper is *documented to be undocumented*.

---

## Sources

**SnapTrade official documentation** (all read 2026-08-03/04):
- Account object fields, `raw_type` ("The account type as provided by the brokerage"), deprecated
  `meta` ("no standard format"), `account_category`, masked `number`, `institution_account_id`:
  [Get account detail](https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserAccountDetails)
- Balance model — cash includes money-market funds *and* they appear as positions with
  `cash_equivalent = true`; buying power margin-only and not always available:
  [Get account balance](https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserAccountBalance)
- Position + UniversalSymbol + SecurityType codes (ad/bnd/cs/cef/crypto/et/oef/pm/ps/rt/struct/ut/wi/wt):
  [List account positions](https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserAccountPositions)
- Activity types (the 19 values, quoted definitions, sign conventions, option_type):
  [List account activities](https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getAccountActivities)
- Orders vs activities, daily activity updates, brokerage-specific type passthrough:
  [Account Data guide](https://docs.snaptrade.com/docs/account-data)
- Symbol instability, Yahoo-style suffixes, "Prefer FIGI", OCC option symbols, unnormalized
  crypto; no CUSIP/ISIN in the model: [Symbology](https://docs.snaptrade.com/docs/symbology)
- "Brokerage dependent" account types, once-daily sync at no fixed time:
  [FAQ](https://docs.snaptrade.com/docs/faq)

**Plaid official documentation** (docs pages + the published machine-readable OpenAPI schema,
which we downloaded and read directly — enum lists above are verbatim from the schema file):
- Account types & subtypes, balances: [Accounts API](https://plaid.com/docs/api/accounts/)
- Security type/subtype enums, `is_cash_equivalent`, licence-gated `cusip`/`isin`,
  `fixed_income.maturity_date` / `face_value` / `yield_rate`, `option_contract`, investment
  transaction types/subtypes and sign conventions:
  [Investments API](https://plaid.com/docs/api/products/investments/) and the
  [Plaid OpenAPI specification](https://github.com/plaid/plaid-openapi) (file `2020-09-14.yml`:
  `Security`, `FixedIncome`, `YieldRateType`, `InvestmentTransactionType`,
  `InvestmentTransactionSubtype`, `AccountSubtype` schemas)
- 24-month transaction history, overnight refresh: [Investments overview](https://plaid.com/docs/investments/)
- Liabilities coverage (credit card/paypal, student/mortgage), `apr_type` values, mortgage
  `maturity_date`: [Liabilities API](https://plaid.com/docs/api/products/liabilities/)
- Core Exchange = "Plaid's free, fully FDX-compliant API specification" institutions implement:
  [Core Exchange docs](https://plaid.com/core-exchange/docs/); institution-side `isCashEquivalent`
  hint with cash-account fallback: Core Exchange API reference v5.1 (retrieved via search snippet;
  the 5.1 reference page has since moved).

**TurboTax / Intuit:**
- Import partner model, importable forms, seasonal dates, non-partner fallback:
  [How do I import my 1099s? (TurboTax help)](https://ttlc.intuit.com/turbotax-support/en-us/help-article/import-export-data-files/import-1099s/L2hPcduMb_US_en_US);
  ~1,500-transaction Online cap: TurboTax help center
  ([When will I be able to import my 1099?](https://ttlc.intuit.com/turbotax-support/en-us/help-article/import-export-data-files/able-import-1099/L8SGHd22j_US_en_US))
- The wire format: [OFX Tax Extension Specification 2020.0 (PDF, hosted by the Financial Data
  Exchange)](https://financialdataexchange.org/wp-content/uploads/2025/12/OFXTax.2020.0.pdf) —
  form list with tax-year mapping (TAX1099B_V100 … TAXW2C_V200), the "must exactly match the tax
  data reported on the form" requirement, TAX1099B_V100 / EXTDBINFO_V100 / PROCDET_V100 field
  lists (DTAQD, DTVAR, DTSALE, NUMSHRS, COSTBASIS, SALESPR, LONGSHORT, WASHSALE,
  WASHSALELOSSDISALLOWED, NONCOVEREDSECURITY, BASISNOTSHOWN, CORRECTEDCOSTBASIS…),
  TAX1099DIV_V100 fields (ORDDIV, QUALIFIEDDIV, TOTCAPGAIN…). Read directly from the PDF text.

**OFX standard:**
- Investment schema — position types, INVPOS fields, SECLIST/SECINFO (SECID with
  UNIQUEID/UNIQUEIDTYPE), full DEBTINFO field list including **DTMAT**, INCOME/INCOMETYPE
  (CGLONG/CGSHORT/DIV/INTEREST/MISC), BUYDEBT/SELLDEBT, REINVEST:
  [OFX 2.1.1 investment schema documentation](https://schemas.liquid-technologies.com/ofx/2.1.1/ofx_investment_xsd.html)
- History (Microsoft/Intuit/CheckFree, announced 1997-01-16), version 2.3, QFX = Intuit variant
  (Direct Connect vs Web Connect), 2019 move of OFX under the Financial Data Exchange:
  [Open Financial Exchange (Wikipedia)](https://en.wikipedia.org/wiki/Open_Financial_Exchange)

**Live evidence cited for the deviations (this repository):**
- Envelope bug + self-heal: `src/services/sync/snaptradeSync.ts` lines 20–28 and 69–76 (dated
  live-verify note 2026-07-19); pinned by `src/services/sync/snaptradeSync.orch.test.ts`
  ("the real pagination envelope {data, pagination} still lands history").
- REDEMPTION activity type, VMFXX-with-no-flag, CUSIP-in-symbol, support-matrix understatement:
  v1 report Part A (`docs/FCC-core-55-70/institution-data-research-v1-2026-08-04.md`), dated
  live-verified notes 2026-07-19 (E*TRADE) and Build-47 findings (Vanguard).

**Confidence notes (honesty line):** every enum list in Parts 1–2 was either fetched from the
provider's own reference page or read verbatim out of Plaid's machine-readable schema file; the
OFX Tax field lists were extracted directly from the FDX-hosted specification PDF. Two softer
citations are flagged inline: the Core Exchange `isCashEquivalent` fallback (search snippet of a
moved page) and the TurboTax ~1,500-transaction cap (help-center summary). Whether a given
institution actually **fills** Plaid's `fixed_income.maturity_date` for brokered CDs is a
conformance question no document answers — it goes on the beta verification list, to be checked
against the founder's real accounts the same way we live-verified SnapTrade.
