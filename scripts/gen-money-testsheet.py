# Generates docs/finwise-device-test-money-2026-06-28.xlsx — a fillable device-test sheet for the
# MODULE 1 (Money) verification on the local iPhone build (HEAD of taxonomy-v1.0.7).
# Same shape as the build-34 sheet: fill the yellow "Result (Pass/Fail)" + "Notes" columns; Claude reads it back.
# Usage:  .venv/bin/python scripts/gen-money-testsheet.py
import xlsxwriter

OUT = "/Users/palakjain/Vibe_Coding/finwise/docs/finwise-device-test-money-2026-06-28.xlsx"
wb = xlsxwriter.Workbook(OUT, {"in_memory": True})
ws = wb.add_worksheet("Money test")
ws.set_tab_color("#1F4E5F")

TITLE = wb.add_format({"bold": True, "font_size": 13, "font_color": "#1F4E5F"})
HDR = wb.add_format({"bold": True, "font_color": "white", "bg_color": "#1F4E5F", "border": 1,
                     "border_color": "#CCCCCC", "valign": "vcenter", "text_wrap": True, "font_size": 11})
def cell(bg=None):
    d = {"border": 1, "border_color": "#DDDDDD", "valign": "top", "text_wrap": True, "font_size": 10}
    if bg: d["bg_color"] = bg
    return wb.add_format(d)
BASE = cell(); FILL = cell("#FFF2CC")   # yellow = you fill these

ws.merge_range(0, 0, 0, 5, "FinWise — Device Test · MODULE 1 (Money) · local build 2026-06-28 "
               "(HEAD taxonomy-v1.0.7 — newer than build #34)", TITLE)
ws.write(1, 0, "Fill the yellow Result + Notes. Pass / Fail / Partial. Each row says exactly what to tap and what to expect.", cell())
ws.merge_range(1, 0, 1, 5, "Fill the yellow Result + Notes. Pass / Fail / Partial. Each row says exactly what to tap and what to expect.", cell())

HROW = 3
heads = ["#", "Area", "What to do", "Expected result", "Result (Pass/Fail)", "Notes"]
widths = [4, 20, 52, 52, 15, 50]
for c, (h, w) in enumerate(zip(heads, widths)):
    ws.set_column(c, c, w); ws.write(HROW, c, h, HDR)
ws.set_row(HROW, 28); ws.freeze_panes(HROW + 1, 0)

rows = [
 ["1", "Goals — free cash (B-93, your #1)",
  "Open the Plan tab. Read the “typical free cash to save $X/mo” card (and any goal's “you free up ~$X/mo” line).",
  "The amount is income − spending − DEBT (lower than before if you pay debt). It matches the Surplus shown on Home / Cash-flow."],
 ["2", "Budget — buckets add up (B-94, your #3)",
  "Budget tab → “Expenses by bucket” → open a bucket (e.g. Fixed). Add up the line-item budget amounts shown.",
  "The bucket header total EQUALS the sum of its line items (e.g. Fixed header = rent + utilities + phone). No unexplained total."],
 ["3", "Goals — set a monthly amount (B-95, your #1b)",
  "Plan → tap a goal → in the editor find “Save $___/month toward this”. Try the “Use ~$X” shortcut, then Save.",
  "The field saves the monthly amount. (It's what you commit to THIS goal — not your spare cash.)"],
 ["4", "Goals — status logic (B-95, your #1b)",
  "For one goal, try three things: (a) set the monthly ≥ the required amount, (b) set it BELOW required, (c) clear it (blank).",
  "(a) shows 🟢 On track · (b) shows 🟡 Behind · (c) shows ⚪ No plan — NOT green just because you have spare cash."],
 ["5", "Hide balances on Money screens (B-90)",
  "Turn ON Hide balances (eye icon top-right, or Settings). Then visit Income, Budget/Expenses, and Goals.",
  "EVERY dollar shows ••••: income entries, recurring amounts, expense rows, budget figures, goal amounts. Nothing leaks."],
 ["6", "Cash-flow detail — no loop (T22 / B-89)",
  "Home → tap “Cash-flow detail →”.",
  "The Cash-flow screen opens AND STAYS (does NOT bounce back to Home)."],
 ["7", "Income — take-home & sources",
  "Home → take-home sheet → “See & edit all your income sources”. Add or edit a source; check the take-home figure.",
  "Income flows through; take-home = after tax AND 401(k). The number agrees with Budget/Plan."],
 ["8", "Anything else (Money)",
  "Free-roam the Money tabs (Activity, Budget, Debts, Plan). Note anything confusing, wrong, or ugly.",
  "(Open row for any other Money feedback.)"],
]
for r, row in enumerate(rows, HROW + 1):
    ws.write(r, 0, row[0], BASE)
    ws.write(r, 1, row[1], BASE)
    ws.write(r, 2, row[2], BASE)
    ws.write(r, 3, row[3], BASE)
    ws.write(r, 4, "", FILL)   # Result — you fill
    ws.write(r, 5, "", FILL)   # Notes — you fill
    ws.set_row(r, 46)
ws.autofilter(HROW, 0, HROW + len(rows), 5)
wb.close()
print("wrote", OUT, "|", len(rows), "test rows")
