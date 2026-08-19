# Builds the "Institution matrix" tab — every raw input we need, against what each institution
# actually calls it. Founder order 2026-08-17: "so going forward we can build solid code and no
# more guess work."
#
# THE RULE OF THIS TAB: every cell carries its evidence level, and an unknown says UNKNOWN.
#   ✓ seen on THIS MACHINE — the founder's own file or a live payload
#   ○ their published documentation (research pass of 2026-08-04)
#   — documented as absent
#   ? never seen. A cell with ? is a file worth downloading, not a thing to guess.
import os, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

OUT = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module/calculation-inventory-v1.xlsx"
HDR = PatternFill("solid", fgColor="085041"); WHITE = Font(color="FFFFFF", bold=True, size=10)
WRAP = Alignment(wrap_text=True, vertical="top"); THIN = Border(*[Side(style="thin", color="DDDDDD")] * 4)
SEEN = PatternFill("solid", fgColor="EAF3EC")      # ✓ evidence on this machine
DOCS = PatternFill("solid", fgColor="FFFDF0")      # ○ published docs
GAP  = PatternFill("solid", fgColor="FBE3E3")      # ? unknown — get a file
SECT = PatternFill("solid", fgColor="D9E2EC")
YOURS= PatternFill("solid", fgColor="E8F0FB")

COLS = [("What we need", 30), ("OUR name", 22),
        ("Vanguard — file", 34), ("Fidelity — file", 34), ("Schwab — file", 30),
        ("E*TRADE — connected", 32), ("Chase — file", 24),
        ("SnapTrade — connection", 34), ("Plaid — connection (beta plan)", 34),
        ("YOUR COMMENT", 30)]

# Each cell: (text, evidence) where evidence is one of 'seen'|'docs'|'gap'
S, D, G = 'seen', 'docs', 'gap'
def c(text, ev): return (text, ev)

FIELDS = [
 ("Account identifier", "asset_id / mask",
  c("✓ 'Account Number', masked (xxxx6537) — founder's file", S),
  c("○ 'Account Number' + 'Account Name' on every row", D),
  c("○ per-account files; all-accounts export inserts section headers", D),
  c("✓ scrambled id, never the real number (live)", S),
  c("— no holdings export exists at all", D),
  c("✓ accounts[].id + number", S),
  c("○ account_id + mask", D)),
 ("Ticker", "ticker",
  c("✓ 'Symbol' — CUSIP for bonds/CDs, blank allowed (VMFXX row had one)", S),
  c("○ 'Symbol' — core cash arrives as 'SPAXX**', trailing asterisks are a footnote mark", D),
  c("○ 'Symbol'", D),
  c("✓ symbol.raw_symbol via connection; CUSIP for CDs", S),
  c("—", D),
  c("✓ positions[].symbol.raw_symbol", S),
  c("○ ticker_symbol — CAN BE NULL, especially fixed income", D)),
 ("Holding name / description — THE field that identifies a CD", "label / name",
  c("✓ 'Investment Name' — 'U S TREASURY BILL 0 11/10/26 07/14/26'", S),
  c("○ 'Description'", D),
  c("○ security name / description", D),
  c("✓ symbol.description — 'KEYBANK NA 4.00% CD 08/24/26' (live)", S),
  c("—", D),
  c("✓ positions[].symbol.description", S),
  c("○ security.name — institution text, not normalised", D)),
 ("Shares held", "shares",
  c("✓ 'Shares'", S), c("○ 'Quantity'", D), c("○ quantity", D),
  c("○ 'Qty #' in the positions file", D), c("—", D),
  c("✓ positions[].units (sells arrive NEGATIVE, live)", S), c("○ quantity", D)),
 ("Price per share", "last_price",
  c("✓ 'Share Price'", S), c("○ 'Last Price'", D), c("○ price", D),
  c("✓ via connection; bonds priced PER $100 OF FACE (live)", S), c("—", D),
  c("✓ positions[].price — only as fresh as the sync", S), c("○ institution_price", D)),
 ("What it is worth", "value / balance",
  c("✓ 'Total Value'", S), c("○ 'Current Value'", D), c("○ market value", D),
  c("✓ account total CAN BE MISSING entirely (live)", S), c("—", D),
  c("✓ balance.total.amount — can arrive null", S), c("○ institution_value", D)),
 ("What was paid", "cost_per_share",
  c("✓ ABSENT from the holdings section — the file simply does not carry cost", S),
  c("○ 'Cost Basis' + 'Cost Basis Per Share'", D),
  c("○ cost basis column", D),
  c("○ 'Price Paid $' — sounds like a price, IS the cost", D),
  c("—", D),
  c("✓ average_purchase_price", S), c("○ cost_basis", D)),
 ("Purchase history (lots)", "lots[]",
  c("✓ none in the file", S), c("? not in the positions file — unverified beyond that", G),
  c("? unknown", G), c("? unknown", G), c("—", D),
  c("✓ tax_lots[] exists in the spec and arrived EMPTY on both live brokers", S),
  c("— not offered; reconstruct from 24 months of transactions", D)),
 ("Maturity date of a CD / bond", "maturity_date",
  c("✓ NO COLUMN — only inside 'Investment Name' text: '… 11/10/26 07/14/26'", S),
  c("○ NO COLUMN — inside 'Description'", D),
  c("○ NO COLUMN — '… 4.00% due 08/24/2026' in description", D),
  c("✓ NO FIELD — description text only (live)", S),
  c("—", D),
  c("✓ NO FIELD — description text only", S),
  c("○ fixed-income record exists in spec (maturity, coupon) — UNVERIFIED against a real account", D)),
 ("Coupon rate", "coupon_rate",
  c("✓ in the name text only ('CPN 1.62500')", S), c("○ description text", D), c("○ description text", D),
  c("✓ description text (live)", S), c("—", D), c("✓ description text", S),
  c("○ in the spec's fixed-income record — unverified", D)),
 ("Uninvested cash / sweep", "cash_balance",
  c("✓ a VMFXX HOLDING row — no cash flag anywhere", S),
  c("○ core position: SPAXX/FDRXX fund row", D),
  c("○ a special row: 'Cash & Cash Investments'", D),
  c("✓ money-market fund ALSO counted inside the cash balance — double (live)", S),
  c("—", D),
  c("✓ balances.cash — includes the money-market funds (dedupe required)", S),
  c("○ is_cash_equivalent flag — never trust it alone (live lesson)", D)),
 ("How the account is taxed", "tax_bucket",
  c("✓ 'Account Type' column says only CASH/MARGIN — not the tax type", S),
  c("? not in the positions file", G), c("? unknown", G),
  c("✓ raw broker string; 'savings' arrived meaning a BROKERAGE (live)", S),
  c("—", D),
  c("✓ account type string, unnormalised — we translate + ask when unsure", S),
  c("○ documented subtypes: ira, roth, 401k, sep ira… (the best of all sources)", D)),
 ("Transaction date", "date",
  c("✓ 'Trade Date' AND 'Settlement Date' — we use trade date", S),
  c("? need a transactions file", G), c("○ 'Date'", D),
  c("✓ trade_date / settlement_date (live)", S), c("○ CSV capped ~1 year per download", D),
  c("✓ trade_date ?? settlement_date", S), c("○ date", D)),
 ("The transaction WORD — what kind of event this is", "type",
  c("✓ 'Transaction Type' + 'Transaction Description' (both matter)", S),
  c("? need a transactions file", G),
  c("○ 'Action' column — exact vocabulary UNKNOWN, need a file", G),
  c("✓ type — 19 documented + undocumented arrivals (REDEMPTION, MISC…, live)", S),
  c("? need a file", G),
  c("✓ activities[].type — 'best effort', their own words", S),
  c("○ type (6) + subtype (50), fully documented — the strongest vocabulary", D)),
 ("Amount of money moved", "amount",
  c("✓ 'Net Amount' (also 'Principal Amount'); SIGNED — reinvestments negative", S),
  c("? need a file", G), c("○ 'Amount'", D),
  c("✓ amount, SIGNED: a buy is NEGATIVE (live)", S), c("? need a file", G),
  c("✓ amount signed, buy negative", S),
  c("○ amount signed THE OTHER WAY: a buy is POSITIVE (debit) — per-road translation, with tests", D)),
 ("Fees on a transaction", "fee",
  c("✓ 'Commissions and Fees'", S), c("? need a file", G), c("○ 'Fees'", D),
  c("✓ fee field + FEE-typed rows (live)", S), c("? need a file", G),
  c("✓ fee", S), c("○ fees", D)),
 ("Accrued interest on a bond trade", "(not yet captured)",
  c("✓ 'Accrued Interest' — a real column, $1,289.40 on the founder's T-note buy", S),
  c("? unknown", G), c("? unknown", G), c("? unknown", G), c("—", D),
  c("? not in the documented payload", G), c("? not documented", G)),
]

EVENTS = [
 ("Money you put in", "DEPOSIT",
  c("? NOT PRESENT in the founder's file — their word for a real deposit is still UNSEEN. Do not guess it.", G),
  c("? need a transactions file", G), c("? need a file", G),
  c("✓ CONTRIBUTION · WIRE IN (live)", S), c("? need a file", G),
  c("✓ CONTRIBUTION", S), c("○ subtypes: contribution · deposit", D)),
 ("Money you took out", "WITHDRAWAL",
  c("? not present in the file — unseen", G), c("? unseen", G), c("? unseen", G),
  c("✓ WITHDRAWAL · WIRE OUT (live)", S), c("? unseen", G),
  c("✓ WITHDRAWAL", S), c("○ withdrawal", D)),
 ("Dividend received", "DIVIDEND",
  c("✓ 'Dividend' / 'Dividend Received'", S), c("? unseen", G), c("? unseen", G),
  c("✓ DIVIDEND (live)", S), c("? unseen", G), c("✓ DIVIDEND", S),
  c("○ dividend · qualified dividend · non-qualified dividend", D)),
 ("Dividend REINVESTED — the pair that made your $2,387", "DIVIDEND, reinvested + internal buy",
  c("✓ 'Reinvestment' / 'Dividend Reinvestment', amount NEGATIVE — the buying leg", S),
  c("? unseen", G), c("? unseen", G),
  c("○ REI in SnapTrade's documented list", D), c("? unseen", G),
  c("✓ REI → dividend, flagged reinvested", S),
  c("○ dividend reinvestment · interest reinvestment · LT/ST capital gain reinvestment", D)),
 ("Interest received", "INTEREST",
  c("✓ 'Interest' / 'Interest Received'", S), c("? unseen", G), c("? unseen", G),
  c("✓ INTEREST · margin interest arrives as MISC with negative amount (live)", S), c("? unseen", G),
  c("✓ INTEREST", S), c("○ interest · interest receivable", D)),
 ("Sweep between settlement fund and cash", "internal — NO flow",
  c("✓ 'Sweep out' / 'Sweep in' — the words behind $645,130 of the fake contributions", S),
  c("? unseen", G), c("? unseen", G), c("? not observed live", G), c("? unseen", G),
  c("? no documented word — arrives as whatever the broker says", G),
  c("○ no dedicated subtype — type 'cash' + context", D)),
 ("A bond or CD maturing and paying out", "SELL (your own money back)",
  c("✓ 'Corp Action (Redemption)' — NOT the string 'REDEMPTION', which is why the guard missed", S),
  c("? unseen", G), c("? unseen", G),
  c("✓ REDEMPTION — undocumented, live-verified, six figures of it", S), c("? unseen", G),
  c("✓ passes through as the broker's word", S),
  c("○ return of principal", D)),
 ("Buying / selling a security", "BUY / SELL",
  c("✓ 'Buy'", S), c("? unseen", G), c("○ 'Buy' / 'Sell' under 'Action'", D),
  c("✓ BUY / SELL (live)", S), c("? unseen", G), c("✓ BUY / SELL", S), c("○ buy · sell (+ subtypes)", D)),
 ("A fee or tax", "FEE",
  c("✓ 'Fee' / 'ADR Custody Fee'", S), c("? unseen", G), c("? unseen", G),
  c("✓ FEE · SERVICE FEE (positive = reversal) · TAX (live)", S), c("? unseen", G),
  c("✓ FEE · TAX", S), c("○ account fee · management fee · misc fee · tax · tax withheld…", D)),
 ("Option expiring / exercised — founder challenge: \"could expire in the money\"",
  "SKIP only when NO cash rides the row; internal proceeds when it does",
  c("? unseen — options do not come through Vanguard's connection (live)", G),
  c("? unseen", G), c("? unseen", G),
  c("✓ OPTIONEXPIRATION · OPTIONEXERCISE · OPTIONASSIGNMENT (live). Share-settled: cash arrives on a "
    "PAIRED BUY/SELL row we keep. DEFECT: a CASH-SETTLED exercise (SPX family) or CASH-IN-LIEU on a "
    "split carries its money ON the skipped row — dropped today", S),
  c("? unseen", G),
  c("✓ the same words pass through", S),
  c("○ exercise · expire · assignment subtypes", D)),
 ("Securities moved in kind (no cash)", "position note — NO flow",
  c("? unseen", G), c("? unseen", G), c("? unseen", G),
  c("✓ EXCHANGE RECEIVED IN / DELIVERED OUT · EXTERNAL_ASSET_TRANSFER_IN/OUT (live)", S),
  c("? unseen", G), c("✓ same words", S), c("○ transfer · merger · spin off", D)),
]

# ── C · what the ACCOUNT DETAIL page needs — enumerated from AccountDetailScreen.tsx, not memory ──
ACCOUNT_PAGE = [
 ("Account name + institution + mask ('••4821')", "label · institution · mask",
  c("✓ file: 'Account Number' masked; name is the fund/brokerage grouping", S),
  c("○ 'Account Number' + 'Account Name' per row", D), c("○ per-account file naming", D),
  c("✓ broker-assigned name already contains 'E*Trade …'; number scrambled (live)", S),
  c("—", D), c("✓ accounts[].name · institution_name · number", S), c("○ official_name · mask", D)),
 ("Where the value came from + when — 'connected · updated 2h ago' / 'you typed this in May'", "source · last_synced · value_as_of",
  c("— a file is an IMPORT: our stamp, not theirs", D), c("— same", D), c("— same", D),
  c("✓ sync timestamp is OURS at ingest (live)", S), c("—", D),
  c("✓ we stamp last_synced on every successful sync", S), c("○ same pattern", D)),
 ("The uninvested-cash line", "cash_balance",
  c("✓ the VMFXX row IS the sweep (no cash flag)", S), c("○ SPAXX/FDRXX core row", D),
  c("○ 'Cash & Cash Investments' row", D), c("✓ balances.cash DOUBLE-COUNTS the money-market fund (live)", S),
  c("—", D), c("✓ balances.cash minus money-market holdings (our dedupe)", S), c("○ is_cash_equivalent flag", D)),
 ("How it is taxed ('tax-deferred — tax due when you take it out')", "tax_bucket / tax_treatment",
  c("✓ file's 'Account Type' says CASH/MARGIN — NOT the tax type", S), c("? not in positions file", G),
  c("? unknown", G), c("✓ raw string, mistranslated 'savings' live — we ask when unsure", S), c("—", D),
  c("✓ raw account type string + our Held-in question", S), c("○ documented subtypes incl. every retirement type — best source", D)),
 ("The activity list (every dated row on the page)", "transactions[]",
  c("✓ full transactions section in the same file", S), c("? need a transactions file", G),
  c("○ separate transactions export", D), c("✓ activities[] (live)", S), c("○ CSV capped ~1yr", D),
  c("✓ activities[] — the words are section B", S), c("○ investment transactions, 24 months", D)),
 ("How far back the history goes ('activity since Mar 2025')", "history_from",
  c("✓ the file's own earliest row — visible", S), c("? unknown", G), c("? unknown", G),
  c("✓ brokers back-fill DIFFERENT depths (live: 1yr vs 90d)", S), c("? unknown", G),
  c("✓ we track earliest-ever-seen per account", S), c("○ 'up to 24 months' stated", D)),
 ("The per-class split of one account (its own mini-allocation)", "accountClassBreakdown",
  c("✓ derivable: names + values are in the file", S), c("○ derivable from columns", D), c("○ derivable", D),
  c("✓ derived from positions + names (live rules)", S), c("—", D),
  c("✓ derived — see ACCOUNT_SPLIT row on Calculations tab", S), c("○ derived; security types help", D)),
]

# ── D · what the HOLDING DETAIL page needs, BY ASSET CLASS — from HoldingDetailScreen.tsx ─────────
HOLDING_PAGE = [
 ("EVERY CLASS · live price + how fresh it is", "last_price · priceFreshness",
  c("✓ file 'Share Price' = that day only", S), c("○ 'Last Price'", D), c("○ price column", D),
  c("✓ positions[].price — as fresh as the sync (live)", S), c("—", D),
  c("✓ price per sync; our market feed (Tiingo/Yahoo) refreshes tickers it can", S),
  c("○ institution_price + as-of date", D)),
 ("EVERY CLASS · the price GRAPH + period chips (1M…3Y)", "price series → periodReturn",
  c("— no institution sends a price HISTORY; the graph is our market feed, by ticker", D),
  c("— same", D), c("— same", D), c("— same (live: broker sends one price, not a series)", S),
  c("—", D), c("— not in the payload", D),
  c("— not offered; our feed. A CD/CUSIP has NO series — the graph must honestly not draw", D)),
 ("EVERY CLASS · what you paid, per lot ('bought Mar 2021 at $102')", "lots[] · avgCost · costBasis",
  c("✓ ABSENT from Vanguard's file — cost simply is not there", S),
  c("○ 'Cost Basis' + per-share", D), c("○ cost basis", D),
  c("✓ average only; tax_lots EMPTY on both live brokers → ONE synthetic lot", S), c("—", D),
  c("✓ average_purchase_price", S), c("○ cost_basis; lots reconstructable from 24mo of buys", D)),
 ("EVERY CLASS · gain since purchase · %-return · long/short-term tax split", "unrealizedGain · totalROI · capGains",
  c("— derived from shares × price − cost; the tax split needs LOT DATES, which only "
    "synthetic-lot accuracy allows (one date, not per-lot truth)", D),
  c("○ derivable — Fidelity even ships Total Gain/Loss columns to check AGAINST", D),
  c("○ gain/loss column shipped too", D), c("✓ derived; dates missing live → 'unknown = short-term, the cautious side'", S),
  c("—", D), c("✓ derived from their average cost", S), c("○ derived", D)),
 ("EVERY CLASS · dividends this holding paid you", "ledger DIVIDEND rows by ticker",
  c("✓ 'Dividend Received' rows carry the fund name + symbol", S), c("? need a transactions file", G),
  c("? unknown words", G), c("✓ DIVIDEND rows with symbol (live)", S), c("? unknown", G),
  c("✓ activities filtered by symbol", S), c("○ dividend subtypes, security_id attached", D)),
 ("STOCKS / FUNDS · 'you beat the market by…' benchmark line", "benchmarkTicker · benchReturn",
  c("— OUR choice of benchmark + OUR feed; no institution participates", D), c("— same", D), c("— same", D),
  c("— same", D), c("—", D), c("— same", D), c("— same", D)),
 ("BONDS & CDs · face value · coupon · maturity · yield-to-maturity", "face_value · coupon_rate · maturity_date",
  c("✓ ALL inside 'Investment Name' text: 'U S TREASURY NOTE CPN 1.62500 MTD 2026-02-15' — parsed or typed, never a column", S),
  c("○ inside 'Description'", D), c("○ '… 4.00% due 08/24/2026' text", D),
  c("✓ description text only (live: 'KEYBANK NA 4.00% CD 08/24/26')", S), c("—", D),
  c("✓ description text only", S), c("○ spec has real maturity/coupon fields — UNVERIFIED on a live account; would be the first road with columns", D)),
 ("BONDS & CDs · accrued interest paid on purchase", "(not yet captured anywhere)",
  c("✓ a REAL COLUMN in the file — $1,289.40 on the T-note buy. We capture it NOWHERE; it silently "
    "inflates the buy's cost today", S),
  c("? unknown", G), c("? unknown", G), c("? unknown", G), c("—", D),
  c("? not in the documented payload", G), c("? not documented", G)),
 ("OPTIONS · underlying · strike · call/put · expiry · contracts", "option_holdings[]",
  c("? options do not arrive via Vanguard connection (live) and none in the file", G),
  c("? unknown", G), c("? unknown", G),
  c("✓ separate options list; price PER SHARE (×100) but cost already PER CONTRACT — mixed units, live-verified to the cent", S),
  c("—", D), c("✓ option_symbol: underlying, strike, type, expiration", S),
  c("○ security type derivative + fields", D)),
 ("CRYPTO · fractional quantity + a price our feed can find", "shares (fractional) · price mapping",
  c("? unseen at Vanguard", G), c("? unknown", G), c("? unknown", G), c("? not held live", G), c("—", D),
  c("✓ type code 'crypto' when the broker says so; ticker mapped to our feed (BTC → btcusd)", S),
  c("○ security type cryptocurrency", D)),
 ("CASH · balance + rate it earns", "balance · benchmarkReturn('savings'…)",
  c("✓ balance visible; the RATE is OUR assumption table — no institution sends their APY on any road we have", S),
  c("○ same", D), c("○ same", D), c("✓ same (live)", S), c("—", D), c("✓ same", S),
  c("○ Plaid liabilities carry card APRs — but deposit APY still absent", D)),
]

wb = openpyxl.load_workbook(OUT)
# preserve the founder's comment column by row label
keep = {}
if "Institution matrix" in wb.sheetnames:
    old = wb["Institution matrix"]
    for r in range(3, old.max_row + 1):
        if old.cell(r, 1).value and old.cell(r, 10).value:
            keep[old.cell(r, 1).value] = old.cell(r, 10).value
    del wb["Institution matrix"]
ws = wb.create_sheet("Institution matrix", 3)
ws.sheet_properties.tabColor = "6B2D8F"
ws.merge_cells("A1:J1")
ws.cell(1, 1, "INSTITUTION MATRIX — every raw input we need, against what each institution actually calls it. "
              "EVERY CELL SAYS HOW WE KNOW: ✓ seen on this machine · ○ their published documentation · "
              "— documented as absent · ? NEVER SEEN, and a red cell is a file worth getting rather than a "
              "thing to guess.  ⚠ A FILE AND A CONNECTION ARE DIFFERENT ROADS. The sample files show how an "
              "institution WORDS things; they are NOT what its API returns, and a ✓ in a file column says "
              "nothing about the connection column beside it. Read each column on its own.").font = Font(bold=True, size=11, color="6B2D8F")
ws.cell(1, 1).alignment = WRAP; ws.row_dimensions[1].height = 58
for i, (t, w) in enumerate(COLS, start=1):
    ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w
    cell = ws.cell(2, i, t); cell.fill, cell.font, cell.alignment, cell.border = HDR, WHITE, WRAP, THIN

FILL = {S: SEEN, D: DOCS, G: GAP}
r = 3
def section(title):
    global r
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=10)
    cell = ws.cell(r, 1, title)
    cell.fill, cell.font, cell.alignment, cell.border = SECT, Font(bold=True, size=10, color="1B3A5C"), WRAP, THIN
    r += 1

def rows(data):
    global r
    for row in data:
        label, ours, *cells = row
        a = ws.cell(r, 1, label); a.font = Font(bold=True, size=9); a.alignment, a.border = WRAP, THIN
        b = ws.cell(r, 2, ours); b.alignment, b.border = WRAP, THIN
        for i, (text, ev) in enumerate(cells, start=3):
            cell = ws.cell(r, i, text)
            cell.alignment, cell.border, cell.fill = WRAP, THIN, FILL[ev]
        yc = ws.cell(r, 10, keep.get(label, "")); yc.fill, yc.alignment, yc.border = YOURS, WRAP, THIN
        r += 1

section("A · THE FIELDS — where each number lives, per institution")
rows(FIELDS)
section("B · THE TRANSACTION WORDS — what each institution calls each kind of event. "
        "This is the table the $1.4m and the $2,387 both came from.")
rows(EVENTS)
section("C · THE ACCOUNT DETAIL PAGE — every input that page shows, and which road supplies it. "
        "Enumerated from the shipping screen, not from memory.")
rows(ACCOUNT_PAGE)
section("D · THE HOLDING DETAIL PAGE, BY ASSET CLASS — shares and funds, bonds and CDs, options, "
        "crypto, cash. A dash means NO institution supplies it on any road — it is our feed or our "
        "assumption, and it belongs here precisely because it looks like institution data.")
rows(HOLDING_PAGE)
ws.freeze_panes = "C3"
wb.save(OUT)

gaps = sum(1 for row in FIELDS + EVENTS + ACCOUNT_PAGE + HOLDING_PAGE for cell in row[2:] if cell[1] == G)
seen = sum(1 for row in FIELDS + EVENTS + ACCOUNT_PAGE + HOLDING_PAGE for cell in row[2:] if cell[1] == S)
print(f"Institution matrix: {len(FIELDS)} fields + {len(EVENTS)} events + {len(ACCOUNT_PAGE)} account-page + {len(HOLDING_PAGE)} holding-page rows × 7 sources")
print(f"  {seen} cells verified on this machine · {gaps} cells UNKNOWN — the download shopping list")
