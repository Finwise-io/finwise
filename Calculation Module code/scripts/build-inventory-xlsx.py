# Builds "Calculation Module/calculation-inventory-v1.xlsx" from the SCANNED skeleton.
#
# The generated columns (name, module, file, line, signature, callers, screens) come straight from
# scan-calculations.mjs and must never be hand-edited — regenerating overwrites them, which is the
# point. The hand-written columns (Plain English · Formula · Variables · Source of each · DERIVATION
# RULE) are preserved across regenerations by matching on the engine name, so annotation work is
# never lost when the code moves.
#
# Usage:  node "Calculation Module code/scripts/scan-calculations.mjs" && python3 "Calculation Module code/scripts/build-inventory-xlsx.py"
import json, os, subprocess, datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

ROOT = "/Users/palakjain/Vibe_Coding/finwise"
INV  = os.path.join(ROOT, "Calculation Module code/scripts/inventory.json")
OUT  = os.path.join(ROOT, "Calculation Module/calculation-inventory-v1.xlsx")

data = json.load(open(INV))
rows = data["rows"]
sha  = data["generatedFrom"]
dirty = data["treeDirty"]
today = datetime.date.today().isoformat()

# ── preserve anything already annotated, keyed by engine name ───────────────────────────────────
prior = {}
if os.path.exists(OUT):
    wbp = openpyxl.load_workbook(OUT)
    for tab in ("Calculations", "Formatting helpers"):
        if tab in wbp.sheetnames:
            ws = wbp[tab]
            for r in range(3, ws.max_row + 1):
                key = ws.cell(r, 2).value          # column B = Function (the stable key)
                if key:
                    prior[key] = [ws.cell(r, c).value for c in (1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)]

wb = openpyxl.Workbook()
HDR   = PatternFill("solid", fgColor="085041")
GEN   = PatternFill("solid", fgColor="EEEEE9")     # generated — do not edit
HAND  = PatternFill("solid", fgColor="FFF6E5")     # you fill these
WHITE = Font(color="FFFFFF", bold=True, size=10)
BOLD  = Font(bold=True, size=10)
WRAP  = Alignment(wrap_text=True, vertical="top")
THIN  = Border(*[Side(style="thin", color="DDDDDD")] * 4)

COLS = [
    ("Engine name",        22, "hand", "The name we will call it by. One concept, one name."),
    ("Function",           26, "gen",  "The exported function in the code today."),
    ("What it answers",    40, "hand", "In plain English. What question does this number answer?"),
    ("Formula",            46, "hand", "The arithmetic, written out."),
    ("Input variables",    36, "hand", "Every variable that goes in."),
    ("Source of each",     36, "hand", "Where each variable comes from."),
    ("DERIVATION RULE",    52, "hand", "The rule applied to RAW data to produce each variable. "
                                        "This is the column that would have caught the Vanguard failure: "
                                        "'contributions come from the ledger' is a source; "
                                        "'a CONTRIBUTION activity is external money in, a BUY is not' is a rule."),
    ("Probe",              26, "hand", "The test that proves this row by executing the real function."),
    ("Status",             14, "hand", "CORRECT · DEFECT · UNRESOLVED. What the code does today, judged against what it "
                                        "should do. Everything left of this column describes the code AS IT IS — including "
                                        "its bugs — because a probe can only execute what exists."),
    ("WHAT IT SHOULD BE",  52, "hand", "The correct BEHAVIOUR — the spec. What the number ought to be, stated so it could "
                                        "be handed to anyone. Only filled where the current behaviour is wrong."),
    ("Fix needed?",        12, "hand", "Y or N. The filterable flag — sort on this to get the work list in one move. "
                                        "UNRESOLVED rows are Y: they need a decision before they need code."),
    ("RECOMMENDED FIX",    52, "hand", "HOW to get there — the action, not the spec. 'What it should be' says the money "
                                        "must appear in exactly one place; this says which of the two code paths to delete. "
                                        "Where a founder decision is needed first, this names the decision instead of a change."),
    ("Screens",            28, "gen",  "Screens in scope that import it directly."),
    ("Called by",          34, "gen",  "Other calculations that use it."),
    ("Returns",            26, "gen",  "Declared return type."),
    ("Source",             40, "gen",  "file:line at the stamped commit."),
]

def sheet(name, subset, note):
    ws = wb.create_sheet(name)
    ws.sheet_properties.tabColor = "085041"
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(COLS))
    ws.cell(1, 1, note).font = Font(bold=True, size=11, color="085041")
    ws.cell(1, 1).alignment = WRAP
    ws.row_dimensions[1].height = 46
    for c, (title, w, kind, help_) in enumerate(COLS, start=1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(c)].width = w
        cell = ws.cell(2, c, title)
        cell.fill, cell.font, cell.alignment, cell.border = HDR, WHITE, WRAP, THIN
        cell.comment = openpyxl.comments.Comment(help_, "Calculation module")
    ws.freeze_panes = "C3"
    for i, r in enumerate(subset, start=3):
        keep = prior.get(r["name"], [None] * 11)
        vals = [
            keep[0] or "",                    # engine name (hand)
            r["name"],                        # function (gen)
            keep[1] or "",                    # what it answers (hand)
            keep[2] or "",                    # formula — AS IT IS TODAY (hand)
            keep[3] or "",                    # variables (hand)
            keep[4] or "",                    # source of each (hand)
            keep[5] or "",                    # derivation rule (hand)
            keep[6] or "",                    # probe (hand)
            keep[7] or "",                    # status (hand)
            keep[8] or "",                    # what it SHOULD be — the spec (hand)
            keep[9] or "",                    # fix needed? Y/N (hand)
            keep[10] or "",                   # recommended fix — the action (hand)
            r["screens"] or "—",
            r["calledBy"] or "—",
            r["returns"],
            f'{r["file"]}:{r["line"]}',
        ]
        for c, v in enumerate(vals, start=1):
            cell = ws.cell(i, c, v)
            cell.alignment, cell.border = WRAP, THIN
            cell.fill = HAND if COLS[c - 1][2] == "hand" else GEN
            if c == 2:
                cell.font = BOLD
    return ws

calcs = [r for r in rows if r["tab"] == "calculations"]
helps = [r for r in rows if r["tab"] == "helpers"]
wb.remove(wb.active)

sheet("Calculations", calcs,
      f"CALCULATION INVENTORY · Phase 1 — Net worth, Performance and the 8 screens they open · "
      f"{len(calcs)} calculations · generated from commit {sha} on {today}"
      f"{'  ⚠ TREE WAS DIRTY' if dirty else ''}. "
      "EVERY FORMULA HERE DESCRIBES THE CODE AS IT IS TODAY, BUGS INCLUDED — you cannot fix what you have not "
      "described, and a probe can only execute what exists. Where the current behaviour is wrong, Status says DEFECT "
      "and the corrected version sits in WHAT IT SHOULD BE; the difference between those two columns is the work list. "
      "GREY columns are generated from the code and overwritten on every regeneration — never edit them. "
      "CREAM columns are written by hand and preserved. A row is not documented until its probe passes.")

sheet("Formatting helpers", helps,
      f"FORMATTING HELPERS · {len(helps)} · they shape numbers rather than compute them, "
      "but they are listed because a rounding or masking rule can change what a person reads.")

# ── the two supporting tabs ─────────────────────────────────────────────────────────────────────
ws = wb.create_sheet("Field dictionary")
ws.sheet_properties.tabColor = "854F0B"
ws.merge_cells("A1:E1")
ws.cell(1, 1, "FIELD DICTIONARY — one canonical name per concept, used identically on every screen. "
              "Filled during Phase 3, for founder approval BEFORE any renaming happens.").font = Font(bold=True, size=11, color="854F0B")
ws.cell(1, 1).alignment = WRAP; ws.row_dimensions[1].height = 32
for c, (t, w) in enumerate([("Canonical name", 26), ("What it means, plainly", 46),
                            ("Names it replaces", 40), ("Where it is shown", 34), ("Decided", 14)], start=1):
    ws.column_dimensions[openpyxl.utils.get_column_letter(c)].width = w
    cell = ws.cell(2, c, t); cell.fill, cell.font, cell.border = HDR, WHITE, THIN

ws = wb.create_sheet("Open questions")
ws.sheet_properties.tabColor = "A32D2D"
ws.merge_cells("A1:D1")
ws.cell(1, 1, "OPEN QUESTIONS — anything I could not settle from the code alone. "
              "A question here is better than a guess in the inventory.").font = Font(bold=True, size=11, color="A32D2D")
ws.cell(1, 1).alignment = WRAP; ws.row_dimensions[1].height = 32
for c, (t, w) in enumerate([("#", 6), ("Question", 60), ("Why it matters", 50), ("Answer", 40)], start=1):
    ws.column_dimensions[openpyxl.utils.get_column_letter(c)].width = w
    cell = ws.cell(2, c, t); cell.fill, cell.font, cell.border = HDR, WHITE, THIN

wb.save(OUT)
print(f"{OUT}")
print(f"  {len(calcs)} calculations · {len(helps)} helpers · commit {sha}{'  (DIRTY TREE)' if dirty else ''}")
print(f"  preserved annotations for {len([k for k in prior if any(prior[k])])} rows")
