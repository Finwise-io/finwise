# How the big institutions hand over investment-account data — and the rules that keep it consistent

**Research report v1 · 2026-08-04 · for MoneyKeel (FCC 55–70)**

---

## Why this report exists

Money reaches the app by two roads: a **live connection** (a link service — SnapTrade today, Plaid
for beta — signs into the brokerage and relays the data) or a **file import** (the user downloads a
spreadsheet file, called a CSV, from their brokerage website and uploads it). Every institution
speaks its own dialect on both roads. If we don't translate them into one language, the same
dollar looks different depending on how it arrived — and a wrong-looking number costs trust we
never get back.

This report has three parts:

- **Part A** — what E*TRADE and Vanguard *actually* sent us over real, live connections (verified
  against the founder's own accounts, July–August 2026).
- **Part B** — what public documentation and user reports say about Vanguard, E*TRADE (now Morgan
  Stanley), Fidelity, Schwab, and Chase / J.P. Morgan, on both roads.
- **Part C** — the plain-English rules we propose adopting so the same money always looks the same.

One term used throughout: a **CUSIP** is a 9-character identification number (letters and digits,
like `49306SX43`) that Wall Street uses for bonds and CDs instead of a ticker. It means nothing to
a person — it must always be translated to the security's name on screen.

---

## Part A — What real connections actually delivered (live-verified in our own sync code)

We connected the founder's real E*TRADE and Vanguard accounts through SnapTrade in July 2026 and
wrote down every surprise as a dated note next to the code that handles it. This is the ground
truth the web research in Part B is checked against.

### E*TRADE (verified 2026-07-19 against a real account)

1. **One login arrived as more than one account.** A single E*TRADE sign-in delivered two separate
   account entries. On our Net worth screen they now roll up under one "E*TRADE" group so the
   household sees one institution, not scattered rows.
2. **The account name already contains the institution.** E*TRADE names its own accounts things
   like "E*Trade Individual Brokerage." Blindly prefixing the institution again produced
   "E-Trade E*Trade Individual…" — naming has to check for that.
3. **The real account number is withheld.** E*TRADE would not share it; the connection relays a
   scrambled stand-in ending in gibberish like "…9Cmw". Its last four characters are *not* the
   user's digits — showing them as a mask ("••9Cmw") would be a small lie. We only show a mask
   when the tail is actually four digits; otherwise identical twins get a quiet "· 1 / · 2".
4. **Money-market funds arrive dressed as ordinary funds.** VMFXX (Vanguard's money-market fund,
   held inside the E*TRADE account) came through as a plain mutual fund with *no* cash flag —
   about $50,000 of cash-like money displayed under Stocks until we added a curated list of the
   big money-market tickers (VMFXX, SPAXX, SWVXX, and friends) that are always treated as cash.
5. **Money-market money is counted twice by the source.** The broker's "cash balance" figure
   *includes* the money-market fund that also appears as a holding. We subtract one from the
   other so the cash sleeve never double-counts.
6. **CDs and bonds carry a CUSIP, not a ticker.** The founder's CDs arrived with the 9-character
   number as their "symbol" and a description like "KEYBANK NA 4.00% CD 08/24/26". The maturity
   date lives *only inside that description text* — there is no maturity field.
7. **Bond math has traps.** Bonds are priced per $100 of face value (taking the price at face
   value would overstate them 100-fold), and a maturing CD or Treasury bill pays out as a
   transaction type called REDEMPTION that no documentation listed — the live account had six
   figures of these. Booked wrongly (as a deposit), they would corrupt the personal-return number.
8. **Options come in their own list with inconsistent units.** The option's current price is
   per share (multiply by 100 for a contract) but its purchase cost is already whole-contract
   dollars — it matched the actual buy-order cash to the cent. Same row, two different units.
9. **Sales arrive with negative share counts** (−100 shares), and undocumented activity types
   showed up: wires in/out, securities exchanged in corporate reorganizations, margin interest
   billed as "MISC", and fee *refunds* as positive "SERVICE FEE" rows. One brokerage can use
   hundreds of raw activity labels.
10. **The published support matrix understates reality.** SnapTrade's own coverage table says
    E*TRADE shares no fixed income — yet the live account's CDs did arrive (as CUSIP positions).
    Coverage tables are a floor, not the truth; the parser must handle more than they promise.

### Vanguard (verified 2026-07-29 – 2026-08-01, Build-47 device walk)

1. **The account total can be missing.** Vanguard reported *no usable account total* while the
   individual holdings carried the real value — a $132,000 account read $0 until we learned to
   add up the holdings (plus options and the cash sleeve) whenever the reported total is missing
   or zero. Rule of thumb: trust the broker's total when it exists; rebuild it honestly when it
   doesn't.
2. **Brokered CDs arrive with no bond label at all.** Vanguard's CDs came with no security-type
   code — they fell through to "stocks" until we started reading the *description text*: anything
   that says CD / certificate of deposit / Treasury / T-bill, or shows a coupon percentage with a
   maturity year, files under Bonds & CDs.
3. **The connection itself is fragile.** Vanguard links with a password rather than a durable
   token, so the link drops and needs re-linking every few days. We say so, honestly, on the
   connect screen.
4. **The settlement fund is a fund.** Vanguard parks account cash in VMFXX (its money-market
   settlement fund) — so "cash at Vanguard" arrives as a *fund holding*, subject to the same
   money-market translation as E*TRADE's (point 4 above).

**The one sentence that summarizes Part A:** brokers disagree about everything — how many
accounts one login is, whether cash is a fund, whether a CD is a bond, whether an account even
has a total — and the only stable identifiers are the security's description text and the
broker's own dollar amounts.

---

## Part B — Institution by institution (web research + our live evidence)

### Vanguard

| Question | What arrives |
|---|---|
| Connected: accounts per login | Historically fragmented: on Vanguard's legacy mutual-fund platform **each fund was its own account** (10 funds = 10 accounts, 10 tax forms). That platform is being retired (clients force-moved to a single brokerage account by end of 2025), so newer connections deliver one brokerage account per registration — but older links may still show the per-fund split. |
| Connected: cash / sweep | Settlement cash lives in the VMFXX money-market fund — arrives as a fund holding, not as "cash" (live-verified; no cash flag). Account *total* can be missing entirely (live-verified). |
| Connected: CDs | Arrive as CUSIP positions with **no security-type code**; recognizable only from description text (live-verified). Options don't come through at all. |
| File export: shape | **One combined file** (`ofxdownload.csv`) holding *both* a holdings section and a transactions section, with all accounts in the same file grouped by account number — mutual funds first, then the brokerage side. |
| File export: holdings columns | `Account Number, Investment Name, Symbol, Shares, Share Price, Total Value`. |
| File export: transactions columns | `Trade Date, Settlement Date, Transaction Type, Transaction Description, Investment Name, Symbol, Shares, Share Price, Principal Amount, Commission, Fees, Net Amount, Accrued Interest, Account Type`. |
| CD/bond maturity | **No maturity column** anywhere — it exists only inside `Investment Name` / description text. |

### E*TRADE (Morgan Stanley)

| Question | What arrives |
|---|---|
| Connected: accounts per login | One login delivered **two account entries** (live-verified). Broker-assigned names already contain "E*Trade …". Real account numbers withheld — a scrambled identifier arrives instead (live-verified). |
| Connected: cash / sweep | Money-market funds arrive as plain mutual funds with no cash flag, *and* their value is double-counted inside the reported cash balance (live-verified). |
| Connected: CDs / bonds | Arrive as CUSIP positions; maturity only in description text ("KEYBANK NA 4.00% CD 08/24/26"); maturities pay out as an undocumented REDEMPTION activity; bonds priced per $100 of face (all live-verified). Options come in a separate list with mixed per-share / per-contract units (live-verified). |
| File export: shape | Positions export is **one account at a time** from the Portfolios page. Important: E*TRADE's and Morgan Stanley's systems merged on **February 9, 2026** — transaction downloads switched to a new format (CSV or Excel), and pre-merger history may need to be pulled separately from the legacy side. |
| File export: key columns | Positions: `Symbol`, `Qty #`, `Price Paid $` (plus optional extras the user can add). |
| CD/bond maturity | Only inside the description text — same "NAME %  CD MM/DD/YY" pattern as the connection. |

### Fidelity

| Question | What arrives |
|---|---|
| Connected: accounts per login | One login covers all of a customer's accounts (individual, Roth IRA, rollover, 401(k), cash management) — each arrives as its **own account** in the connection service's account list. |
| Connected: cash / sweep | Fidelity holds account cash in a "core position" — a money-market fund such as SPAXX or FDRXX. Through Plaid, cash-like rows carry a type of "cash" and a true/false "is cash equivalent" flag — but our live lesson says never rely on such flags alone; keep the ticker list. |
| Connected: CDs / bonds | Fidelity's fixed-income pages track CDs and bonds by CUSIP and sort them by maturity date; through Plaid they arrive typed "fixed income" (subtype "bond"), and the ticker field **can be empty** — the CUSIP and description carry the identity. |
| File export: shape | **One combined file across all accounts** ("Portfolio_Positions" download): every row carries `Account Number` and `Account Name`, so an Individual, a Roth IRA and a 401(k) all sit in the same file. The file ends with several disclaimer paragraphs and a "Date downloaded" line that a parser must skip (verified against a real export shared publicly). |
| File export: columns | `Account Number, Account Name, Symbol, Description, Quantity, Last Price, Last Price Change, Current Value, Today's Gain/Loss Dollar, Today's Gain/Loss Percent, Total Gain/Loss Dollar, Total Gain/Loss Percent, Percent Of Account, Cost Basis, Cost Basis Per Share, Type`. |
| Quirks | The core cash row appears as the money-market ticker with trailing asterisks (e.g. "SPAXX**" — the asterisks are a footnote marker, not part of the ticker), and a "Pending Activity" row with no real symbol can appear; both need graceful handling. CD/bond rows: CUSIP in `Symbol`, maturity **only inside `Description`**. |

### Charles Schwab

| Question | What arrives |
|---|---|
| Connected: accounts per login | One login covers all Schwab accounts; each account arrives separately. Connection is token-based (stable, unlike Vanguard's password link). Per SnapTrade's coverage matrix: balances, stocks/ETFs/mutual funds, options, ~2 years of activity — **no bonds/fixed income promised** (remember the Part A lesson: matrices understate; be ready for CUSIP rows anyway). |
| Connected: cash / sweep | Schwab money-market funds (SWVXX, SNVXX, SNSXX…) are ordinary fund holdings — on our curated cash list already. |
| File export: shape | Positions page → Export, choosing the account from a dropdown (per-account files; an all-accounts export adds per-account header rows that a parser must treat as section breaks, not holdings). |
| File export: columns | Position rows carry symbol, security name/description, quantity, price, cost basis, market value, gain/loss. A special **"Cash & Cash Investments"** row represents the sweep cash. Transactions export: `Date, Action, Symbol, Description, Quantity, Price, Fees, Amount`. |
| CD/bond maturity | Statements and exports show bonds/CDs by **CUSIP with the coupon and maturity in the description text** ("… 4.00% due 08/24/2026" style) — no dedicated maturity column in the standard positions export. |

### Chase / J.P. Morgan (Self-Directed Investing)

| Question | What arrives |
|---|---|
| Connected: accounts per login | One Chase login can hold taxable brokerage, Traditional and Roth IRAs, trust, custodial and SEP accounts **plus the bank side** (checking/cards) — a connection returns them all as separate accounts under one institution. Chase routes all third-party access through its own secure interface (it signed a direct data agreement with Plaid), so connections are token-based and stable. |
| Connected: cash / sweep | Investment cash sits in a J.P. Morgan sweep; through link services it generally arrives as a cash/money-market line on the investment account. |
| File export: shape | **Weakest exporter of the five.** Investment *transactions* can be downloaded as CSV (Investments → Transactions → "Things you can do" → CSV) but each download is capped at about one year. Bank activity CSV is capped around 24 months / ~1,000 rows per file. There is **no widely documented holdings/positions file export** — users copy portfolio numbers by hand or rely on a connection. |
| CD/bond maturity | No documented positions file to carry one; anything fixed-income effectively arrives only via the connection path. |

### What the five have in common (this is the punchline)

1. **Cash is a fund almost everywhere.** Vanguard (VMFXX), Fidelity (SPAXX/FDRXX), Schwab
   (SWVXX family), E*TRADE (swept money-market) — the "cash" in a brokerage account usually
   arrives as a money-market *holding*, frequently with no cash flag.
2. **CDs and bonds are CUSIP-plus-description, everywhere.** Not one of the five puts a CD's
   maturity date in its own column in a standard positions export or connection payload. The
   date lives inside free text: "KEYBANK NA 4.00% CD 08/24/26", "… 4.35% due 05/28/2027".
3. **One login ≠ one account.** Every institution can deliver several accounts (different tax
   treatments!) from a single sign-in; Vanguard's legacy platform even delivered one per fund.
4. **File exports disagree on shape.** Fidelity: one combined multi-account file. Vanguard: one
   combined file but with holdings *and* transactions stacked in sections. E*TRADE and Schwab:
   per-account files. Chase: transactions only. Header names differ everywhere ("Quantity" /
   "Qty #" / "Shares"), which is why our importer already matches headers by meaning, not by
   exact name.

---

## Part C — Proposed normalization rules (the same money looks the same, whatever road it took)

### Rule 1 — Account names: institution + account type, never a ticker

An account's display name is **"Institution + what kind of account it is"**, with the real
last-four digits when the broker shares them: "E*TRADE Individual Brokerage ••4821",
"Fidelity Roth IRA ••2210".

- Never repeat the institution when the broker's own name already contains it (no
  "E-Trade E*Trade Individual…").
- Never show a scrambled identifier as if it were the account number; when there are no real
  digits, identical twins get "· 1 / · 2".
- **Never name an account after a ticker or fund.** "VMFXX" is a holding *inside* an account,
  not an account. (One narrow exception stays: a single-security *import* the user made of one
  holding may wear that holding's name, because the holding is genuinely all it is.)
- Imports adopt the same pattern: ask which institution the file came from and name the account
  "Fidelity Roth IRA (imported)" — never "portfolio_positions_aug.csv".

*Status: largely built (one shared naming helper); the ticker-never-names-a-connected-account
line and the import naming prompt are the additions to adopt.*

### Rule 2 — CDs and bonds: read the maturity out of the description text

Since no institution provides a maturity column, extract it from the description with tolerant
patterns, and show it in plain words ("KeyBank CD 4.00% — matures Aug 24, 2026"):

- Date shapes to recognize: `08/24/26`, `08/24/2026`, `8-24-26`, `08-24-2026`, "due 05/28/27",
  "due 2027", "matures 08/2026", and month-name forms ("Aug 24 26"). Two-digit years read as
  2000-something.
- If several dates appear in one description, the **latest future date is the maturity** (an
  issue date or dated coupon reference is always earlier).
- Classification is description-first: anything saying CD / certificate of deposit / Treasury /
  T-bill / note, or showing a coupon percentage together with a year, files under **Bonds & CDs
  regardless of what type code (if any) came with it** — live-verified necessity, since Vanguard
  sends no code at all and E*TRADE sends a bare CUSIP.
- On screen the CUSIP never leads; the readable name does.

*Status: the classification half is built and pinned by tests; the maturity-date extraction and
"matures …" display line are new.*

### Rule 3 — Sub-accounts: keep them separate underneath, group them by institution on top

When one login delivers several accounts:

- **Keep each account as its own row internally** — they carry different tax treatments (a Roth
  IRA and a taxable brokerage must never merge), and every balance stays reconcilable against
  the broker.
- **Present them under one institution group** at the household level: the Net worth screen shows
  one "E*TRADE" header with its accounts inside (already the approved Build-47 walk behavior).
  The institution is the mental unit people use; the sub-account is the tax unit the math uses.
- When the same real account arrives twice by different roads (imported earlier, connected
  later), **absorb the twin instead of creating a sibling** — one account, whichever road
  refreshed it last. (Built: the merge-not-duplicate rule.)
- Vanguard's legacy per-fund fragmentation is the stress test: ten "accounts" that are really
  one registration still present as one Vanguard group.

### Rule 4 — Sweep and settlement money is cash, once

- Any money-market fund (curated ticker list + "money market" wording + any cash flag the source
  does send) counts as **cash**, never as stocks — no matter which road it arrived by. The
  importer and the connection use the same list.
- When the broker also counts that fund inside its reported cash balance, subtract so it is
  **counted exactly once** (built for connections).
- Brokered CDs are **not** cash — they are Bonds & CDs (they have a maturity and a price); only
  true money-market/sweep balances are cash. This matches the founder-approved taxonomy.

### Rule 5 — One freshness sentence, same shape on every road

Every account shows one line, same grammar, only the tail differing:

- Connected: **"As of Aug 3 — updated automatically from E*TRADE."**
- Imported: **"As of Jun 30 — from the file you added on Jul 2."** (two dates matter: the file's
  own as-of date when it has one, and when it was brought in)
- Manual: **"As of Jul 15 — you entered this."**

Never "synced", "stale", or a raw timestamp. When a connection breaks (Vanguard's password links
drop every few days), the same line carries the age honestly — "As of Jul 28 — connection needs
re-linking" — rather than hiding it.

### Rule 6 (cross-cutting) — Trust dollars and descriptions, not flags and codes

The meta-rule the live evidence keeps teaching: type codes, cash flags, coverage matrices and
even account totals are unreliable; the broker's **dollar amounts** and **description text** are
what's actually true. Whenever a code and the money disagree, follow the money — and when a
guess touches tax math (which wrapper an account is), ask the user rather than guess silently
(built: the Held-in confirmation).

---

## Sources

**Live evidence (this repository, dated notes in the sync code and screens):**
`src/services/sync/snaptrade.ts`, `src/services/sync/ingest.ts`,
`src/services/sync/snaptradeSync.ts`, `src/constants/brokerCoverage.ts` (curated 2026-07-18 from
SnapTrade's published support matrix), `src/domain/assets/index.ts` (naming),
`src/domain/import/holdingsImport.ts` (importer), `src/screens/NetWorthScreen.tsx` (institution
grouping), `src/screens/AccountDetailScreen.tsx` (CUSIP display) — live-verified notes dated
2026-07-19 (E*TRADE) and Build-47 findings 3 & 5 (Vanguard).

**Web sources:**

- SnapTrade — account & holdings model (a connection can hold multiple accounts; balances vs positions): [docs.snaptrade.com/docs/account-data](https://docs.snaptrade.com/docs/account-data), [List account holdings](https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserHoldings)
- Plaid — Investments product (holdings, securities, type "cash", "is cash equivalent" flag, fixed-income subtypes, ticker can be null): [plaid.com/docs/api/products/investments](https://plaid.com/docs/api/products/investments/), [plaid.com/docs/investments](https://plaid.com/docs/investments/)
- Fidelity combined multi-account positions export with exact columns (real export, anonymized): [github.com/gerardrbentley/fidelity-account-overview](https://github.com/gerardrbentley/fidelity-account-overview) (example.csv)
- Fidelity core position (cash held in SPAXX-type money-market funds): [fidelity.com — What is a core position (PDF)](https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/mutual-funds/what-is-a-core-position.pdf); fixed-income positions tracked by CUSIP and maturity: [Fidelity Fixed Income Analysis Tool FAQs](https://www.fidelity.com/fixed-income-bonds/fixed-income-tools-services/fixed-income-analysis-tool-FAQs)
- Vanguard `ofxdownload.csv` structure (one file, holdings + transactions sections, all accounts; column lists): [Bogleheads — Vanguard CSV files for account transactions](https://www.bogleheads.org/forum/viewtopic.php?t=295051), [Bogleheads — vanguard .csv file](https://www.bogleheads.org/forum/viewtopic.php?t=104680), [iTradeMax — Download data from Vanguard](http://www.itrademax.com/ipress/detailed-instructions/import-trade-history/vanguard-data-download.htm)
- Vanguard legacy platform = one account per fund, retired end-2025: [InvestmentNews](https://www.investmentnews.com/mutual-funds/vanguard-culling-its-legacy-mutual-fund-account-system-by-end-of-2025/257899), [The WealthAdvisor](https://www.thewealthadvisor.com/article/vanguard-making-its-mutual-fund-brokerage-platform-mandatory)
- E*TRADE positions export (per-account; Symbol / Qty # / Price Paid $): [Wingman — E*TRADE Positions CSV instructions](https://docs.wingmantracker.com/getting-started/adding-an-account/e-trade-positions-csv-instructions)
- E*TRADE ↔ Morgan Stanley systems merged 2026-02-09; new download format (CSV/XLSX), legacy files imported separately: [TradeLog — Importing from CSV or XLSX, E*Trade / Morgan Stanley (2026)](https://support.tradelogsoftware.com/hc/en-us/articles/38363821235863-Importing-from-CSV-or-XLSX-E-Trade-Morgan-Stanley-2026), [TradeLog — My ETrade account merged with Morgan Stanley](https://support.tradelogsoftware.com/hc/en-us/articles/18022517927831-My-ETrade-account-merged-with-Morgan-Stanley)
- Schwab positions/transactions export shape; bonds & CDs shown as CUSIP + coupon + maturity in text: [Wingman — Schwab positions CSV instructions](https://help.wingmantracker.com/article/3178-charles-schwab-positions-csv-instructions), [DocuClipper — Convert Schwab brokerage statement](https://www.docuclipper.com/blog/convert-schwab-statement-to-excel/), [Bogleheads — Buying CDs at Schwab](https://www.bogleheads.org/forum/viewtopic.php?t=369346)
- Chase / J.P. Morgan — account types under one login: [Chase — Self-Directed Investing features](https://www.chase.com/personal/investments/online-investing/self-directed/investing-features); direct data agreement with Plaid (secure interface): [Chase newsroom](https://media.chase.com/news/plaid-signs-data-agreement-with-jpmc); investment transactions CSV capped ~1 year: [TradeLog — Importing from a CSV File, JP Morgan Chase](https://support.tradelogsoftware.com/hc/en-us/articles/360017777254-Importing-from-a-CSV-File-JP-Morgan-Chase); bank activity export caps: [bankxlsx — Export Chase transactions](https://bankxlsx.com/blog/can-i-export-chase-transactions-to-csv-or-excel)

**Confidence notes (honesty line):** the Fidelity column list comes from a real export published
publicly and is high-confidence; the "SPAXX**" trailing-asterisk and "Pending Activity" row are
widely reported by users but we have not yet held a founder-generated Fidelity file in hand — the
importer should be exercised against a real export before we claim Fidelity import "done". Schwab's
"Cash & Cash Investments" row and all-accounts header rows likewise deserve a real-file check.
Everything marked live-verified was checked against the founder's actual E*TRADE and Vanguard data.


---

## Founder correction (2026-08-04) — the E*TRADE "savings" account never existed

The founder's E*TRADE login holds **two separate brokerage accounts** — no savings account. The
"savings" typing came from the connection's account-type text, which the app trusted. SnapTrade is
brokerage-only (it cannot connect bank checking/savings), so any "savings"-typed account arriving
through it is a brokerage account wearing the wrong label.

**Consequences (to fix in the findings 5–9 batch):**
1. Rule 3's example changes: the sub-account reality at E*TRADE is *multiple brokerage accounts
   under one login* — not bank-vs-brokerage splits.
2. Rule 6 gains a concrete case: an account-type string of "savings" from a brokerage-only
   connection must be treated as **brokerage**, not savings — labels lose to reality.
3. The founder's mistyped account should re-type to brokerage on the next sync, which also fixes
   its wrong "Cash and cash equivalents" grouping under By-type.
