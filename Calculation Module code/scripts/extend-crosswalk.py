# Extends investment-api-performance-crosswalk.xlsx — Claude's research file — into the MASTER
# metric sheet for MoneyKeel. Founder order 2026-08-18: "use this file as a master, and add all
# metrics we need for Performance, NW, Account_detail, Holding_detail, ROI, etc. Add a column
# which says what you need."
#
# It KEEPS the original author's structure and voice: Metric | Level | Formula | Inputs required |
# Obtainable from consumer API? | Notes/trap. Four columns are appended, not inserted, so nothing
# in the original shifts:
#   G  Screen(s)           where it appears in our app
#   H  Our engine name     the name in calculation-inventory-v1.xlsx (blank = NOT BUILT)
#   I  Status in our app   BUILT · BUILT-DEFECT · NOT BUILT
#   J  WHAT WE NEED        the founder's column: what is missing to make this metric trustworthy
import openpyxl, os
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

P = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module/investment-api-performance-crosswalk.xlsx"
wb = openpyxl.load_workbook(P)
ws = wb["1. Metric Matrix"]

HDR_FILL = PatternFill("solid", fgColor="1F3864")
NEW_FILL = PatternFill("solid", fgColor="FFF6E5")     # rows we added
DEF_FILL = PatternFill("solid", fgColor="FBE3E3")     # a defect
OK_FILL  = PatternFill("solid", fgColor="EAF3EC")
SEC_FILL = PatternFill("solid", fgColor="D9E2EC")
WRAP = Alignment(wrap_text=True, vertical="top")
THIN = Border(*[Side(style="thin", color="DDDDDD")] * 4)

# ── the four new columns ────────────────────────────────────────────────────────────────────────
NEW = [("Screen(s) in MoneyKeel", 26), ("Our engine name", 26),
       ("Status in our app", 16), ("WHAT WE NEED to trust this number", 62)]
start = 7
for i, (title, w) in enumerate(NEW):
    col = start + i
    ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = w
    cell = ws.cell(4, col, title)
    cell.fill, cell.font, cell.alignment, cell.border = HDR_FILL, Font(color="FFFFFF", bold=True, size=10), WRAP, THIN

# ── fill the four columns for the rows the original author already wrote ────────────────────────
EXISTING = {
 "Beginning market value (BMV)": ("Net worth · Performance", "(inside NW_CHANGE_WALK)", "BUILT-DEFECT",
  "A STORED DAILY PER-ACCOUNT SNAPSHOT. We keep only one number a day for total net worth, so a "
  "beginning value per account cannot be read and is back-solved instead — which is how the founder's "
  "Vanguard beginning value came out NEGATIVE (−$448,028 against a statement's $378,022). This one "
  "gap blocks BMV, contribution-to-return, and any statement reconciliation."),
 "Ending market value (EMV)": ("Net worth · Performance · Account detail", "TOTAL_INVESTABLE / ACCOUNT_SPLIT", "BUILT",
  "Nothing — this is the one figure that already reconciles to the statement to the cent. Keep the "
  "as-of timestamp visible so a stale price cannot masquerade as a move."),
 "Contributions (gross in)": ("Net worth (change walk)", "PERSONAL_FLOWS / INGEST_ACTIVITY_TYPE", "BUILT-DEFECT",
  "A CLOSED TRANSACTION TAXONOMY. Any broker word we do not recognise is currently guessed from the "
  "sign of the amount. On the founder's real file that produced $1,064,493 of contributions on an "
  "account where nothing came in — sweeps and matured bills counted as new money."),
 "Withdrawals (gross out)": ("Net worth (change walk)", "PERSONAL_FLOWS", "BUILT-DEFECT",
  "The same taxonomy, plus the decision this row's trap names: are fees, tax withheld and margin "
  "interest withdrawals? We have not decided once and enforced it. Today reinvestment lines (negative) "
  "book as withdrawals — $424,818 of them on the founder's file."),
 "Net cash flow (NCF)": ("Net worth (change walk)", "(inside NW_CHANGE_WALK)", "BUILT-DEFECT",
  "The household netting rule this row warns about. We do net internal transfers when BOTH accounts "
  "are in the measured set, but that set is per-screen and not household-wide."),
 "Wealth generated (net gain/loss)": ("Net worth (change walk)", "NW_CHANGE_WALK", "BUILT-DEFECT",
  "Everything above it. It is EMV − BMV − NCF, so a wrong BMV and wrong flows land here — and it is "
  "shown to the person LABELLED as market movement, which it never measured."),
 "Realized gain/loss": ("Holding detail", "REALISED_GAIN", "BUILT",
  "Nothing structural. FIFO from the ledger, sales with no recorded buy counted separately and "
  "reported rather than priced. Depends on the ledger being right."),
 "Unrealized gain/loss": ("Performance · Holding detail", "HOLDING_UNREALISED_GAIN", "BUILT",
  "THE COST-BASIS PROVENANCE TAG this file's Gaps tab recommends. Both live brokers sent empty tax "
  "lots, so we build ONE synthetic lot from the average price — a different number from a "
  "fee-inclusive lot basis, and we do not currently say which we hold."),
 "Simple return": ("Net worth", "NW_CHANGE_PCT", "BUILT-DEFECT",
  "This row's own trap, which we are living: it is only valid when net flow is zero, and our version "
  "measures from whatever day the app was first opened rather than a date the person chose."),
 "Simple Dietz": ("—", "", "NOT BUILT",
  "Not built and probably should not be — Modified Dietz below is strictly better and needs only the "
  "flow dates we already store."),
 "Modified Dietz (money-weighted)": ("—", "", "NOT BUILT",
  "BUILD THIS. It is the honest short-window number, needs only BMV plus dated flows, and both are "
  "within reach once the snapshot store exists. Today the app shows a simple return instead, which "
  "this file correctly calls wrong whenever money moved."),
 "Daily TWR (chain-linked)": ("—", "", "NOT BUILT",
  "The daily valuation series. Same blocker as BMV: no daily per-account store. Worth naming as the "
  "eventual target, not the next step."),
 "IRR / money-weighted return (XIRR)": ("Performance", "PERSONAL_RETURN", "BUILT",
  "Nothing to build — it solves by bisection, is deterministic, and refuses in four separate ways "
  "rather than guessing. It needs the LEDGER to be right: phantom deposits do not make it refuse, "
  "they make it answer confidently and wrongly."),
 "Cumulative return since inception": ("Holding detail", "HOLDING_TOTAL_ROI", "BUILT",
  "It excludes distributions received — so it is gain-over-cost, not true cumulative return. Add "
  "dividends per holding, which we already have in the ledger, and label the lookback limit."),
 "Annualized / CAGR": ("Performance", "(inside PERIOD_RETURN, 3Y only)", "BUILT",
  "Nothing. We annualise only the 3-year figure, which matches this row's guidance."),
 "Interest income (period)": ("Account detail · Net worth", "(ledger sum)", "BUILT-DEFECT",
  "SIGN PRESERVATION. We store every amount as an absolute value at import, so a credit and its "
  "offsetting debit both add. That is the founder's $2,387 of interest against $1,193 actually paid."),
 "Dividend income (period)": ("Account detail · Holding detail", "(ledger sum)", "BUILT-DEFECT",
  "The reinvestment split this row's trap names, and the same sign fix. A reinvested dividend is "
  "income AND a purchase; we must count the income once and the purchase as internal."),
 "Accrued interest / accrued income": ("—", "", "NOT BUILT",
  "A FIELD TO PUT IT IN. Vanguard's file HAS an 'Accrued Interest' column — $1,289.40 on the founder's "
  "T-note purchase — and we capture it nowhere, so it silently inflates that buy's cost."),
 "Current yield (bond)": ("Account detail", "BOND_CURRENT_YIELD", "BUILT",
  "The coupon, which this row says no standard supplies. We parse it out of the description text. "
  "That is correct and should be documented as permanent, not temporary."),
 "Yield to maturity": ("Account detail", "BOND_YIELD_TO_MATURITY", "BUILT",
  "The price convention this row names — clean vs dirty — recorded alongside the number. We do not "
  "state which we assume."),
 "Position weight": ("Performance", "(inside WHAT_DROVE_THE_RETURN)", "BUILT",
  "Nothing. Cash classification decides the denominator and our cash-means-cash rule settles it."),
 "Contribution to return": ("Performance", "WHAT_DROVE_THE_RETURN", "BUILT-DEFECT",
  "The T-minus-N snapshot again. We weight by CURRENT value, not beginning value, so a holding bought "
  "mid-period gets a full-period weight."),
 "Allocation and drift": ("Net worth", "ALLOCATION_BY_CLASS", "BUILT",
  "The TARGET half. We show actual allocation with no target to drift from, so 'drift' cannot be "
  "computed at all. A product decision before an engineering one."),
 "Benchmark-relative return": ("Performance", "BENCHMARK_RETURN_BLENDED", "BUILT",
  "Nothing — market data is ours, as this row says it must be. The benchmark CHOICE per account type "
  "is our judgement and should be stated on screen."),
 "Fees drag": ("—", "", "NOT BUILT",
  "A FEES LINE AT ALL. The change walk has no fees row, so the $460 of ADR custody fees on the "
  "founder's file land inside 'change in investment value' with nowhere else to go."),
}
for r in range(5, ws.max_row + 1):
    m = ws.cell(r, 1).value
    if m in EXISTING:
        scr, eng, st, need = EXISTING[m]
        for i, v in enumerate((scr, eng, st, need)):
            cell = ws.cell(r, start + i, v)
            cell.alignment, cell.border = WRAP, THIN
            if i == 2:
                cell.fill = DEF_FILL if "DEFECT" in st else (OK_FILL if st == "BUILT" else NEW_FILL)

# ── the metrics OUR screens have that this file does not yet cover ───────────────────────────────
# (Metric, Level, Formula, Inputs, Obtainable?, Trap, Screen, Engine, Status, What we need)
ADD = [
 ("NET WORTH SCREEN — metrics the research file does not cover", None, None, None, None, None, None, None, None, None),
 ("Net worth", "Household", "Total assets − total debts", "Every account balance; every debt balance", "DERIVED",
  "The identity must hold structurally, never be stored as a third number that can disagree with its halves.",
  "Net worth", "(SNAPSHOT_WRITE)", "BUILT",
  "Nothing. Computed, never stored independently."),
 ("Total cash", "Household", "Σ balances of accounts classed Cash", "Account balances + classification", "DERIVED",
  "'Cash' is the most contested class. A money-market fund pays dividends; calling it cash makes that income vanish from every return.",
  "Net worth", "TOTAL_CASH", "BUILT",
  "The contradiction closed: the class rule says a money-market fund is measured, while the on-screen grouping table still marks it Cash. Founder finding F6, still open."),
 ("Total investments", "Household", "Σ balances classed Stocks/Funds, Bonds & CDs, Alternatives, Unclassified", "As above", "DERIVED",
  "Excludes the home and car by CLASS, not by account type.", "Net worth", "TOTAL_INVESTMENTS", "BUILT", "Nothing."),
 ("Investable assets", "Household", "Cash + investments; excludes home and primary car", "As above", "DERIVED",
  "The denominator for every 'can I afford it' question. Physical assets excluded because selling the roof is not a plan.",
  "Net worth", "TOTAL_INVESTABLE", "BUILT", "Nothing."),
 ("Asset allocation by class", "Household", "Σ value per class ÷ total assets", "Balances + classification + per-account split", "DERIVED",
  "Must sum to total assets or the donut leaks. A connected account splits across the classes it really holds.",
  "Net worth", "ALLOCATION_BY_CLASS / ACCOUNT_SPLIT", "BUILT-DEFECT",
  "One classifier instead of three. A gold fund, a spot-bitcoin ETF and an option class differently depending on whether the holding arrived by file or by connection."),
 ("Retirement pot (nest egg)", "Household", "Σ (balance × the share earmarked for retirement)", "Balances + per-account share", "DERIVED",
  "NOT net worth. The home and primary car sit at 0% by default; the person can override any account.",
  "Net worth · Plan", "NEST_EGG", "BUILT", "Nothing."),
 ("Net worth trend series", "Household", "Dated points from stored snapshots", "Daily + monthly snapshots", "NO — we store it ourselves",
  "No institution sends history. Ours starts the day the app was installed and holds ONE number per day.",
  "Net worth", "TREND_SERIES", "BUILT-DEFECT",
  "Per-account daily values, and a stated retention. Today it is one total per day, pruned at 400 days, so 'since I started' and '5 years' are permanently unanswerable and nothing on screen says so."),
 ("ACCOUNT DETAIL SCREEN", None, None, None, None, None, None, None, None, None),
 ("Account value + freshness", "Account", "Broker total, or the hand-entered value with its age", "balance; last_synced or value_as_of", "YES",
  "A stale value is not a wrong value, but showing it without saying so IS wrong.",
  "Account detail", "HAND_VALUE_AGE", "BUILT", "Nothing. Six months is the staleness line for a typed value; a live-priced account is exempt."),
 ("Uninvested cash in an account", "Account", "Broker cash − money-market funds held as positions", "balances.cash; positions", "PARTIAL",
  "Brokers count a money-market fund in BOTH places. Subtracting it AND dropping it from holdings makes the money disappear entirely.",
  "Account detail", "UNINVESTED_CASH", "BUILT-DEFECT",
  "A founder decision: show the money-market fund as a holding (recommended) or keep it inside cash. Today it is subtracted from cash AND filtered out of holdings, so it is in neither place."),
 ("One account split across classes", "Account", "Place each holding by name, then the leftover by rule", "Holdings + broker total", "DERIVED",
  "Slices must sum EXACTLY to the broker's stated total — that total is what the person can check.",
  "Account detail · Net worth", "ACCOUNT_SPLIT", "BUILT",
  "The WORDS under each slice use a different rule from the amounts, so a slice's value and its description can disagree."),
 ("How this account is taxed", "Account", "Explicit choice, else the wrapper it was opened under", "tax_bucket / tax_treatment", "PARTIAL",
  "FDX enumerates 43 account types; SnapTrade sends a raw broker string. Wrong tax type = wrong tax maths everywhere.",
  "Account detail", "TAX_TREATMENT / ACCOUNT_TAX_TYPE_GUESS", "BUILT",
  "Nothing on SnapTrade — an unrecognised type comes back NOT confident and the app asks. On Plaid, use its documented subtypes and stop asking."),
 ("Account activity list", "Account", "Every dated ledger row for this account", "Transactions", "YES",
  "The lookback differs per broker — one sends a year, the next 90 days.",
  "Account detail", "HISTORY_DEPTH", "BUILT", "Nothing. Depth is tracked per account and only ever grows."),
 ("HOLDING DETAIL SCREEN", None, None, None, None, None, None, None, None, None),
 ("Shares held", "Position", "Σ shares across lots", "Lots", "YES",
  "A position is the sum of its lots, never one stored figure.", "Holding detail", "HOLDING_SHARES", "BUILT", "Nothing."),
 ("Cost basis", "Position", "Σ (shares × cost per share) across lots", "Lots", "PARTIAL",
  "Three incompatible definitions across providers — see this file's Gaps tab.",
  "Holding detail", "HOLDING_COST_BASIS", "BUILT",
  "The provenance tag: which of the three definitions this number is. We hold derived-price×units and do not say so."),
 ("Market value", "Position", "Shares × latest price", "Lots + price", "YES",
  "No price must mean ZERO, never a fallback to cost — that would report a gain of exactly zero and look deliberate.",
  "Holding detail · Performance", "HOLDING_MARKET_VALUE", "BUILT", "Nothing."),
 ("Capital gains split (long vs short)", "Position", "Per LOT: held ≥12 whole months → long, else short", "Lot dates + price", "PARTIAL",
  "Judged per lot on its own purchase date, never per position. A lot with no cost is skipped, not treated as free shares.",
  "Holding detail", "HOLDING_CAP_GAINS", "BUILT",
  "Real lot dates. Both live brokers sent none, so one synthetic lot carries one date — an unreadable date is treated as SHORT term, the cautious side."),
 ("Tax on those gains", "Position", "long × long rate + short × short rate", "Gains + the person's rates", "DERIVED",
  "Losses must never produce a positive bill.", "Holding detail", "CAP_GAINS_TAX / CAP_GAINS_RATES", "BUILT", "Nothing."),
 ("Price history graph", "Position", "Our market-data series for the ticker", "Price series", "NO — market data, always ours",
  "A CD or bond identified by CUSIP has NO series. The graph must honestly not draw rather than draw a flat line.",
  "Holding detail", "(price series)", "BUILT", "Confirmation that the graph is suppressed — not flat-lined — for anything without a tradeable ticker."),
 ("Bond facts: face, coupon, maturity, yields", "Position", "Face × coupon; yields from price and years remaining", "faceValue; coupon; maturity", "NO",
  "No standard carries coupon or maturity on a holding — verified in FDX 6.3 and 6.4. They live in the description text, everywhere.",
  "Account detail · Holding detail", "BOND_FACTS · BOND_COUPON · BOND_YEARS_LEFT", "BUILT",
  "Nothing new — but document the text parser as PERMANENT infrastructure, not a stopgap. It is the same approach the standard itself implies."),
 ("Option position detail", "Position", "Contracts × price × multiplier", "Option feed", "PARTIAL",
  "Mixed units: price is per SHARE (×100), while average cost is already per CONTRACT. Multiplying both overstates basis 100-fold.",
  "Account detail", "(option_holdings)", "BUILT",
  "Cash-settled exercises. An in-the-money cash settlement carries its money on the row we skip, so real proceeds are dropped."),
 ("PERFORMANCE SCREEN", None, None, None, None, None, None, None, None, None),
 ("Portfolio period return", "Account", "Σ(holding return × value) ÷ Σ(value)", "Per-holding returns + values", "DERIVED",
  "Money-weighted across holdings, not an equal average. A holding with no return is dropped from BOTH the numerator and the weights.",
  "Performance", "PORTFOLIO_RETURN", "BUILT",
  "An arbitrary date range. It answers six named periods only, so it can never sit beside a statement window — though the engine that takes any two dates already exists, exported and unused."),
 ("Winners and detractors", "Position", "Weight × the holding's own return", "Values + returns", "DERIVED",
  "Contributions should sum to roughly the portfolio return.", "Performance", "WHAT_DROVE_THE_RETURN", "BUILT",
  "Beginning-of-period weights, per this file's own row above."),
 ("Concentration", "Account", "Largest holding ÷ total invested", "Values", "DERIVED",
  "A fact, never advice. Reported only at 25%+ and only with 2+ holdings.", "Performance", "CONCENTRATION", "BUILT", "Nothing."),
 ("Portfolio vs benchmark trend", "Account", "Value at 13 points; benchmark rebased to the same start", "Prices + shares", "NO",
  "Rebasing is what makes the two shapes comparable rather than two lines at different heights.",
  "Performance", "PORTFOLIO_TREND_LINE", "BUILT-DEFECT",
  "Share counts AS AT each past date. Every past point uses TODAY'S share count, so a holding bought last week is drawn as held all year. Lot purchase dates are already on the record — a cheap fix."),
 ("Look back — what if I had moved this money", "Position", "Amount × each holding's real price factor over the window", "Two price series", "NO",
  "Backward-looking fact, never a recommendation. Returns nothing when either history is too short — no price is ever extrapolated.",
  "Look back", "LOOK_BACK", "BUILT", "Nothing."),
]
r = ws.max_row + 2
for row in ADD:
    if row[1] is None:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=10)
        cell = ws.cell(r, 1, row[0])
        cell.fill, cell.font, cell.alignment, cell.border = SEC_FILL, Font(bold=True, size=10, color="1F3864"), WRAP, THIN
    else:
        for i, v in enumerate(row):
            cell = ws.cell(r, i + 1, v)
            cell.alignment, cell.border = WRAP, THIN
            if i < 6: cell.fill = NEW_FILL
            if i == 8: cell.fill = DEF_FILL if "DEFECT" in str(v) else (OK_FILL if v == "BUILT" else NEW_FILL)
    r += 1

# note at the top so the provenance of the additions is unambiguous
ws.cell(2, 1, str(ws.cell(2, 1).value or "") +
        "  ||  EXTENDED 2026-08-18: columns G–J and every CREAM row were added by Claude Code, mapping this "
        "research onto MoneyKeel's actual screens. Column J is the work list. Original research rows and their "
        "wording are unchanged.")
ws.cell(2, 1).alignment = WRAP
wb.save(P)

built = sum(1 for row in ADD if row[8] == "BUILT")
defect = sum(1 for row in ADD if row[8] and "DEFECT" in str(row[8]))
print(f"Metric Matrix now {ws.max_row} rows")
print(f"  mapped {len(EXISTING)} original research rows onto our engines")
print(f"  added {len([x for x in ADD if x[1]])} MoneyKeel metrics ({built} built clean, {defect} with defects)")
