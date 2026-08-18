# The FDX standard — what institutions have agreed to share, and what they call it

**Version 1 · 2026-08-18.** Every claim carries its source. Where something could not be confirmed
it says so, because a mapping table built on a guess is worse than no mapping table.

---

## Why this document exists

Until now every rule we have written for reading institution data was derived from **one file or one
live connection at a time**: E*TRADE said `REDEMPTION`, so we handled `REDEMPTION`; Vanguard said
`Corp Action (Redemption)`, and the rule missed. That is how you build a translator that works for
one broker.

FDX — the **Financial Data Exchange** — is the industry body that publishes the standard vocabulary
US institutions are converging on. Mapping to *it* instead of to each broker's dialect is the
difference between a rule per institution and a rule per concept.

---

## 1 · What FDX is, and its status

| | |
|---|---|
| Current version | **FDX API 6.4** (Spring 2025 release; the 6.x line ran 6.0–6.5) |
| Scope | ~600 data elements across banking, investments, tax and insurance |
| Governance | Financial Data Exchange, a non-profit industry body |
| Regulatory link | Its **Consensus Standard Data Format (CSDF) v1** is explicitly built for "demonstrating indicia of compliance with data formatting requirements in the CFPB's Personal Financial Data Rights Rulemaking" — i.e. **Section 1033 open banking** |
| Access | The full developer portal is **members-only**; an "observer" tier exists to obtain the spec. |

**Why this matters commercially, not just technically:** 1033 pushes US institutions toward
standardised sharing. Institutions that comply will emit FDX-shaped data. Building our translator
around FDX now means the direction of travel works *for* us rather than against us.

---

## 2 · The route to the real field names, without a membership

**Plaid Core Exchange** is Plaid's *free, FDX-aligned* API specification, and its reference is
public. Everything in §3 below is quoted from **Core Exchange v6.3**, which is the closest thing to
the FDX data model we can read without joining.

Source: <https://plaid.com/core-exchange/docs/reference/6.3/>

**Caveat, stated plainly:** Core Exchange is *scoped to the data models that power Plaid's
downstream products*. It is a subset. Where it lacks a field, full FDX may still have one — see §6.

---

## 3 · The data model, verbatim

### Account

`accountCategory` · `accountId` · `accountNumberDisplay` · `productName` · `nickname` · `status` ·
`currency` (`currencyCode`) · `accountType`

**Investment accounts additionally:** `availableCashBalance` · `balanceAsOf` · `currentValue` ·
`holdings[]`

### Account types — the enumerated vocabulary

**Deposit:** `CHECKING` · `SAVINGS` · **`CD`** · `ESCROW` · **`MONEYMARKET`** ·
`HIGHINTERESTSAVINGSACCOUNT` · `FIRSTHOMESAVINGSACCOUNT` · `OTHERDEPOSIT`

**Investment (43 values)** including: `401A` · `401K` · `403B` · `529` · `BROKERAGEPRODUCT` ·
`COVERDELL` · **`DIGITALASSET`** · `ESOP` · `IRA` · `KEOGH` · `ROLLOVER` · **`ROTH`** · `SARSEP` ·
**`TAXABLE`** · `TDA` · `TRUST` · `UGMA` · `UTMA` · `VARIABLEANNUITY` · `OTHERINVESTMENT`

**Loans:** `AUTOLOAN` · `HOMEEQUITYLOAN` · `INSTALLMENT` · `MORTGAGE` · `PERSONALLOAN` ·
`STUDENTLOAN` · `MILITARYLOAN` · `SMBLOAN` · `LOAN`

**Lines of credit:** `LINEOFCREDIT` · `CHARGE` · `CREDITCARD` · `HOMELINEOFCREDIT`

> **This settles our "what tax rules does this account live under" problem.** Today we read a
> broker's free-text label and *ask the person* when we cannot recognise it. FDX enumerates every
> retirement type. On an FDX road, the question disappears.

### Holding

`securityIds[]` · `holdingName` · `holdingType` · `holdingSubType` · `symbol` · `purchasedPrice` ·
`currentUnitPrice` · `currentUnitPriceDate` · `units` · `marketValue` · **`faceValue`** ·
`cashAccount` · `currency` · `fiAttributes[]` · **`taxLots[]`**

**`holdingType`:** `ANNUITY` · **`BOND`** · **`CD`** · `DIGITALASSET` · `MUTUALFUND` · `OPTION` ·
`OTHER` · `STOCK`

**`holdingSubType`:** `CASH` · **`MONEYMARKET`**

> **Two of our hardest problems are first-class fields here.** A CD arrives as `holdingType: CD`
> instead of being recognised from the words in its description. A money-market fund arrives as
> `holdingSubType: MONEYMARKET` instead of being matched against our list of 17 tickers.

### How a security is identified

```
"securityIds": [{ "id": "912797VW4", "idType": "CUSIP" }]
```

`idType` values: **`CUSIP`** · `ISIN` · `SEDOL` (Plaid consumes only these three) · plus `CINS`,
`CMC`, `CME`, `ITSA`, `NASDAQ`, `SICC`, `VALOR`, `WKN`.

> A CUSIP is a **proper identifier**, not a ticker-shaped string we must defend against sending to a
> price feed.

### Tax lots (inside a Holding)

Acquired date · quantity · original purchase price · total acquisition cost **including fees and
commissions** · lot market value · position type (`LONG` / `SHORT`).

> Both live brokers we have connected sent **empty** lot arrays, forcing one synthetic lot. FDX
> defines the real thing, including the fee-inclusive cost basis.

### Transaction

`accountCategory` · `transactionId` · `referenceTransactionId` · `postedTimestamp` ·
`transactionTimestamp` · `description` · **`debitCreditMemo`** · `transactionCategory` ·
`transactionCategoryDetail` · `status` · `amount` · `foreignAmount` · `foreignCurrency`

**Investment transactions additionally:** `transactionType` · `securityId` · `securityIdType` ·
`securityType` · `symbol` · `commission` · `fees` · `unitPrice` · `units` · `unitType`

### THE SIGN CONVENTION — stated, not inferred

> "Because the transaction `amount` is an absolute value, this parameter is required to indicate the
> transaction direction and sign (+/-): **`DEBIT`**: Money is leaving the account… **`CREDIT`**:
> Money is entering the account… **`MEMO`**: The transaction is pending."

> **This is the direct answer to a defect we found this week.** Our import stores `Math.abs(amount)`
> — the minus sign is destroyed on arrival — and the screen sums absolutes again, which doubled a
> reinvestment pair into $2,387 of interest. FDX solves it by carrying direction in **its own
> field**, so direction survives regardless of how a provider signs the number. Note also that
> `DEBIT` is *positive* here while SnapTrade signs a buy *negative* — a per-road translation, with
> tests, exactly as already flagged on the Institution matrix.

### Investment transaction types — the full enumeration

`ADJUSTMENT` · `ATM` · `CASH` · `CHECK` · `CLOSURE` · `CLOSUREOPT` · **`CONTRIBUTION`** · `DEP` ·
`DEPOSIT` · `DIRECTDEBIT` · `DIRECTDEP` · `DIV` · **`DIVIDEND`** · **`DIVIDENDREINVEST`** ·
`EXPENSE` · `FEE` · `INCOME` · **`INTEREST`** · `INVEXPENSE` · `JRNLFUND` · `JRNLSEC` ·
`MARGININTEREST` · **`OPTIONEXERCISE`** · **`OPTIONEXPIRATION`** · `OTHER` · `PAYMENT` · `POS` ·
`PURCHASED` · `PURCHASEDTOCOVER` · `PURCHASETOCLOSE` · `PURCHASETOOPEN` · **`REINVESTOFINCOME`** ·
`REPEATPMT` · **`RETURNOFCAPITAL`** · `SOLD` · `SOLDTOCLOSE` · `SOLDTOOPEN` · `SPLIT` · `SRVCHG` ·
`TRANSFER` · `XFER`

---

## 4 · What this fixes for us, item by item

| Our defect | What FDX gives us |
|---|---|
| Unknown word → guessed from the sign → **$1m of fake contributions** | A closed enumeration. `JRNLFUND` and `JRNLSEC` are the *journal* entries a sweep produces — named, not guessed |
| Reinvestment pair counted twice → **$2,387** | **`DIVIDENDREINVEST`** and `REINVESTOFINCOME` as first-class types |
| Matured bond booked as a deposit | **`RETURNOFCAPITAL`** — the maturity payout, named |
| Sign destroyed at import | **`debitCreditMemo`** — direction in its own field |
| CD identified by parsing its description | **`holdingType: CD`** + **`securityIds[].idType: CUSIP`** |
| Money-market fund matched against 17 tickers | **`holdingSubType: MONEYMARKET`** |
| "What tax type is this account?" asked of the user | 43 enumerated account types |
| No purchase history → one synthetic lot | **`taxLots[]`** with fee-inclusive cost |
| Option expiry/exercise cash dropped | `OPTIONEXERCISE` · `OPTIONEXPIRATION` carry `amount` + `debitCreditMemo` |

---

## 5 · The finding that surprised me

**Even here, a bond's maturity date and coupon rate are not fields.**

Core Exchange v6.3 defines `faceValue` on a Holding and `holdingType: BOND` / `CD` — but **no
`maturityDate` and no `couponRate` on a holding or a security.** `maturityDate` exists only on the
**Loan** entity (a loan's own payoff date), and `interestRate` likewise.

So our rule — *read the maturity out of the description text* — is not a workaround for weak
providers. **It is the state of the industry standard**, at least in the publicly readable subset.
That is worth knowing before anyone proposes to "just use the maturity field" on a future road.

**Unconfirmed and worth confirming:** whether *full* FDX 6.4 (members-only) carries fixed-income
detail that Plaid's scoped subset omits. FDX's own 6.4 announcement makes no mention of
investment or fixed-income additions.

---

## 6 · What we should do

1. **Make FDX the internal vocabulary.** One canonical set of event names; every road (SnapTrade,
   Plaid, each CSV) becomes a *mapping into it* rather than its own set of rules. This is the
   Calculation Module's "one concept, one name" principle applied to inbound data.
2. **Carry direction in its own field**, as `debitCreditMemo` does — stop relying on the sign, and
   stop destroying it at import.
3. **Never guess.** An unmapped word becomes `OTHER` and is excluded from every total, shown to the
   person. That single rule would have prevented the $1.4m.
4. **Keep the text parsers anyway** — for maturity and coupon, which no standard supplies.
5. **Consider an FDX observer membership** to read the full spec, if fixed-income detail turns out
   to exist there.

---

## Sources

- FDX API 6.4 release announcement — <https://financialdataexchange.org/fdx-feed/fdx-announces-spring-2025-api-release-fdx-api-version-6-4/>
- Plaid Core Exchange (free, FDX-aligned) v6.3 reference — <https://plaid.com/core-exchange/docs/reference/6.3/>
- Plaid Core Exchange overview — <https://plaid.com/core-exchange/docs/>
- What is FDX (Stripe) — <https://stripe.com/resources/more/what-is-the-financial-data-exchange-fdx-here-is-what-you-should-know>
- FDX standard tracker — <https://www.openbankingtracker.com/standards/fdx>
