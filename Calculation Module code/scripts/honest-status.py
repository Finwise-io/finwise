# Replaces "BUILT" with a vocabulary that says HOW MUCH WE ACTUALLY KNOW.
#
# Founder, 2026-08-18: "Status in the App 'Built' means built and correct? If not how to read which
# formula you believe is inaccurate?"
#
# No — and the word was doing damage. "BUILT" said the code exists and I found nothing wrong, but it
# READ as "this number is right". Those are different claims and the difference is the whole point
# of this exercise. Four honest levels, strongest evidence first:
#
#   CHECKED vs REAL DATA — compared against an institution's own file or statement. The only level
#                          that proves the number is RIGHT rather than merely consistent.
#   DOCUMENTED               — a test runs the real code and confirms it does what the row says. This
#                          proves the DESCRIPTION is true. It does NOT prove the behaviour is right.
#   YOUR CALL            — pinned, but resting on a number or rule WE chose, which a reasonable
#                          person could choose differently. Not a defect; a decision you should see.
#   DEFECT               — I believe it is wrong. The row says why and what it should be.
#   NOT BUILT            — does not exist.
import openpyxl

XW = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module/investment-api-performance-crosswalk.xlsx"

# Rows whose numbers have been compared against the founder's real Vanguard file / statement.
CHECKED = {
 "Ending market value (EMV)", "Contributions (gross in)", "Withdrawals (gross out)",
 "Wealth generated (net gain/loss)", "Interest income (period)", "Dividend income (period)",
 "Beginning market value (BMV)", "Net cash flow (NCF)",
}
# Rows resting on a choice we made — a threshold, a table, a cautious-side default.
YOUR_CALL = {
 "Unrealized gain/loss":       "we use the weakest of the three ways of working out what you paid, because the brokers send nothing better",
 "Realized gain/loss":         "oldest-shares-sold-first, and a sale with no recorded purchase is reported rather than priced",
 "Capital gains split (long vs short)": "an unreadable purchase date is treated as SHORT term — the cautious side, because understating a tax bill is the worse mistake",
 "Tax on those gains":         "a stated default tax rate where you have not given your own",
 "Current yield (bond)":       "the coupon is read out of the description text, because no standard supplies it",
 "Concentration":              "reported only at 25% or more, and only with two or more holdings — thresholds we picked",
 "Benchmark-relative return":  "WE choose which fund each account type is compared against; that choice decides what 'beat the market' means",
 "Position weight":            "what counts as cash decides what we divide by",
 "Annualized / CAGR":          "we annualise the 3-year figure only",
 "Account value + freshness":  "six months is the line for a typed value going stale — our number",
 "How this account is taxed":  "a bare 'IRA' is read as Traditional, which is the commoner case but IS a guess",
 "Retirement pot (nest egg)":  "everything counts except your home and main car — your rule, applied as the default",
 "Total cash":                 "cash means cash only, so a money-market fund is measured with the investments",
 "Investable assets":          "the home and main car are excluded because selling them is not a plan",
 "Price history graph":        "market data is ours; the benchmark and the price source are our choices",
}
STATUS = {
 "CHECKED vs REAL DATA": "compared against the founder's own Vanguard file or statement — the only level that proves the number is RIGHT",
 "DOCUMENTED":               "a test runs the real code and confirms it does what this row says. Proves the DESCRIPTION, not that the behaviour is right",
 "YOUR CALL":            "pinned, but resting on a number or rule WE chose. Not a defect — a decision worth your eye. Column J says which",
 "DEFECT":               "I believe this is wrong. Column J says what it needs",
 "NOT BUILT":            "does not exist in the app",
}

wb = openpyxl.load_workbook(XW); ws = wb["1. Metric Matrix"]
from openpyxl.styles import PatternFill, Font, Alignment
FILL = {"CHECKED vs REAL DATA": PatternFill("solid", fgColor="D6EAD9"),
        "DOCUMENTED":               PatternFill("solid", fgColor="EAF3EC"),
        "YOUR CALL":            PatternFill("solid", fgColor="FFF2CC"),
        "DEFECT":               PatternFill("solid", fgColor="FBE3E3"),
        "NOT BUILT":            PatternFill("solid", fgColor="EEEEE9")}
WRAP = Alignment(wrap_text=True, vertical="top")

changed = 0
for r in range(5, ws.max_row + 1):
    m = ws.cell(r, 1).value
    cur = ws.cell(r, 9).value
    if not cur: continue
    if "DEFECT" in str(cur):        new = "DEFECT"
    elif str(cur).strip() == "NOT BUILT": new = "NOT BUILT"
    elif m in CHECKED:              new = "CHECKED vs REAL DATA"
    elif m in YOUR_CALL:            new = "YOUR CALL"
    else:                           new = "DOCUMENTED"
    ws.cell(r, 9, new); ws.cell(r, 9).fill = FILL[new]; ws.cell(r, 9).alignment = WRAP
    # append the specific judgement to column J so "which call?" is answerable in place
    if new == "YOUR CALL":
        j = ws.cell(r, 10).value or ""
        note = f"THE CALL WE MADE: {YOUR_CALL[m]}. Change it and this number changes."
        if "THE CALL WE MADE" not in j:
            ws.cell(r, 10, (j + ("\n\n" if j else "") + note)); ws.cell(r, 10).alignment = WRAP
    changed += 1

# a legend, directly under the header so it cannot be missed
ws.cell(3, 9, "HOW TO READ THIS COLUMN:  " + "  ·  ".join(f"{k} = {v}" for k, v in STATUS.items()))
ws.cell(3, 9).alignment = WRAP
ws.cell(3, 9).font = Font(bold=True, size=9, color="1F3864")
ws.row_dimensions[3].height = 74
wb.save(XW)

import collections
c = collections.Counter(ws.cell(r, 9).value for r in range(5, ws.max_row + 1) if ws.cell(r, 9).value)
print(f"{changed} rows restated:")
for k, v in c.most_common(): print(f"  {k:<22} {v}")
