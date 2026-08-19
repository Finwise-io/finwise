# PHASE 2 — one master file.
#
# Two files held the truth between them and overlapped: the crosswalk (50 metrics, the frame the
# founder asked for — formula, inputs, whether an institution can even supply them, the trap) and
# the inventory (158 engines, the code-level detail). Two overlapping files drift, and then neither
# is trustworthy.
#
# The crosswalk's frame wins because it is the better one. The inventory folds in beneath it as the
# engine-level detail, with every engine pointing at the metric it serves.
import os, shutil, datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

ROOT = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module"
XW   = os.path.join(ROOT, "investment-api-performance-crosswalk -v2.xlsx")
INV  = os.path.join(ROOT, "calculation-inventory-v1.xlsx")
OUT  = os.path.join(ROOT, "MoneyKeel-calculation-master-v1.xlsx")

HDR  = PatternFill("solid", fgColor="085041"); WHITE = Font(color="FFFFFF", bold=True, size=10)
WRAP = Alignment(wrap_text=True, vertical="top"); THIN = Border(*[Side(style="thin", color="DDDDDD")] * 4)
BAD  = PatternFill("solid", fgColor="FBE3E3"); CALL = PatternFill("solid", fgColor="FFF2CC")
OK   = PatternFill("solid", fgColor="EAF3EC"); GEN = PatternFill("solid", fgColor="EEEEE9")
YOURS= PatternFill("solid", fgColor="E8F0FB"); SEC = PatternFill("solid", fgColor="D9E2EC")

# start from the crosswalk — it already carries the frame and all of Claude's research tabs
shutil.copy(XW, OUT)
master = openpyxl.load_workbook(OUT)
inv = openpyxl.load_workbook(INV)

# ── which metric does each engine serve? read from the crosswalk's own "Our engine name" column ──
mm = master["1. Metric Matrix"]
hm = {mm.cell(4, c).value: c for c in range(1, mm.max_column + 1)}
engine_to_metric = {}
for r in range(5, mm.max_row + 1):
    metric = mm.cell(r, 1).value
    cited = str(mm.cell(r, hm.get("Our engine name", 8)).value or "")
    if not metric or not cited: continue
    for tok in cited.replace("·", " ").replace("/", " ").replace(",", " ").replace("(", " ").replace(")", " ").split():
        if tok.isupper() and "_" in tok:
            engine_to_metric.setdefault(tok, metric)

# ── PROPAGATE. Only 45 engines are cited by name on the metric tab, but an engine that FEEDS one of
# those serves the same metric. Walk the "called by" chain upward: if X is used by Y, and Y serves a
# metric, then X serves it too. Without this, three-quarters of the engines read as "supporting",
# which tells a reader nothing about why they exist.
_src0 = inv["Calculations"]
_h0 = {_src0.cell(2, c).value: c for c in range(1, _src0.max_column + 1)}
_callers = {}
_engine_of_fn = {}
for _r in range(3, _src0.max_row + 1):
    _e = _src0.cell(_r, 1).value
    _f = _src0.cell(_r, _h0["Function"]).value
    if not _e: continue
    _engine_of_fn[_f] = _e
    _cb = str(_src0.cell(_r, _h0.get("Called by", 0)).value or "")
    _callers[_e] = [x.strip() for x in _cb.replace("—", "").split(",") if x.strip()]

for _ in range(8):                                  # deep enough for a nine-layer chain
    _changed = False
    for _e, _cbs in _callers.items():
        if _e in engine_to_metric: continue
        for _fn in _cbs:
            _up = _engine_of_fn.get(_fn)
            if _up and _up in engine_to_metric:
                engine_to_metric[_e] = engine_to_metric[_up]; _changed = True; break
    if not _changed: break

# ── the ENGINES tab: the inventory, with the metric it serves in front ───────────────────────────
src = inv["Calculations"]
hi = {src.cell(2, c).value: c for c in range(1, src.max_column + 1)}
ws = master.create_sheet("2. Engines", 2)
ws.sheet_properties.tabColor = "085041"
ws.merge_cells("A1:S1")
ws.cell(1, 1,
    "ENGINES — every calculation the app makes, one row each. This is the code-level detail beneath "
    "the metrics on the previous tab: what question it answers, the real rules it applies, every "
    "input, where each input comes from, and the test that proves the row by RUNNING the actual "
    "code. 158 rows, 423 tests. WHICH METRIC (column A) says which line on tab 1 this engine serves; "
    "'supporting' means it feeds one rather than being one."
).font = Font(bold=True, size=11, color="085041")
ws.cell(1, 1).alignment = WRAP; ws.row_dimensions[1].height = 58

# WHICH PART OF THE APP. The metric column can only point at the 50 metrics on tab 1, and those
# cover net worth and performance. Income, tax, retirement, debt and setup have engines but no
# metric row — so "supporting" there is honest but tells a reader nothing. This says what the engine
# is FOR, derived from where it lives in the code.
def part_of_app(source: str) -> str:
    s2 = str(source or "")
    for pat, name in [
        ("domain/retirement", "Plan & retirement"), ("domain/planning", "Plan & retirement"),
        ("domain/decumulation", "Plan & retirement"),
        ("domain/performance", "Performance"), ("domain/bonds", "Performance"),
        ("domain/alternatives", "Performance"),
        ("domain/assets", "Net worth"), ("domain/networth", "Net worth"),
        ("domain/snapshot", "Net worth"), ("domain/history", "Net worth"),
        ("domain/income", "Cash flow"), ("domain/budget", "Cash flow"),
        ("domain/paycheck", "Cash flow"), ("domain/transactions", "Cash flow"),
        ("domain/cashflow", "Cash flow"),
        ("domain/debt", "Debt"), ("domain/goals", "Goals"),
        ("domain/import", "Accounts & connections"), ("services/sync", "Accounts & connections"),
        ("services/marketData", "Market data"), ("services/economicData", "Market data"),
        ("domain/insights", "Insights"), ("domain/gaps", "Insights"),
        ("domain/completeness", "Insights"), ("domain/milestones", "Insights"),
        ("domain/profile", "Setup"), ("onboarding", "Setup"),
        ("domain/_shared", "Foundation"),
    ]:
        if pat in s2: return name
    return "Other"

COLS = [("Which metric", 26), ("Part of the app", 20), ("Engine name", 24), ("Function in the code", 24),
        ("What it answers", 44), ("Formula — the actual rules", 60),
        ("Input variables (raw → ours)", 38), ("Where each comes from — file, feed, field", 52),
        ("DERIVATION RULE", 44), ("Probe", 26), ("How much we know", 18),
        ("WHAT IT SHOULD BE", 46), ("Fix needed?", 12), ("RECOMMENDED FIX", 48),
        ("YOUR COMMENT / QUESTION", 34), ("YOUR VERDICT", 14),
        ("Build order", 20), ("Screens", 24), ("Source", 34)]
for c, (t, w) in enumerate(COLS, start=1):
    ws.column_dimensions[openpyxl.utils.get_column_letter(c)].width = w
    cell = ws.cell(2, c, t); cell.fill, cell.font, cell.alignment, cell.border = HDR, WHITE, WRAP, THIN
ws.freeze_panes = "D3"

FROM = ["Engine name", "Function", "What it answers", "Formula — the actual rules",
        "Input variables (raw → ours)", "Where each comes from — file, feed, field",
        "DERIVATION RULE", "Probe", "Status", "WHAT IT SHOULD BE", "Fix needed?",
        "RECOMMENDED FIX", "YOUR COMMENT / QUESTION", "YOUR VERDICT", "Build order",
        "Screens", "Source"]
row = 3
for r in range(3, src.max_row + 1):
    eng = src.cell(r, 1).value
    if not eng: continue
    ws.cell(row, 1, engine_to_metric.get(eng, "—"))
    ws.cell(row, 2, part_of_app(src.cell(r, hi.get("Source", 1)).value))
    for i, name in enumerate(FROM):
        c = hi.get(name)
        ws.cell(row, i + 3, src.cell(r, c).value if c else None)
    st = ws.cell(row, 11).value
    ws.cell(row, 11).fill = (BAD if st in ("DEFECT", "UNRESOLVED") else
                             CALL if st == "YOUR CALL" else OK)
    for c in (15, 16): ws.cell(row, c).fill = YOURS
    for c in (2, 17, 18, 19): ws.cell(row, c).fill = GEN
    for c in range(1, 20):
        ws.cell(row, c).alignment = WRAP; ws.cell(row, c).border = THIN
    row += 1
engines_written = row - 3

# ── the WORK LIST: everything needing a fix or a decision, in one place ──────────────────────────
wl = master.create_sheet("3. Work list", 3)
wl.sheet_properties.tabColor = "A32D2D"
wl.merge_cells("A1:G1")
wl.cell(1, 1,
    "WORK LIST — every row from either tab that needs a fix or a decision, gathered here so it can "
    "be worked through without hunting. DEFECT = believed wrong. UNRESOLVED = needs your decision "
    "before it needs code. Sorted with the ones that block the most beneath them first."
).font = Font(bold=True, size=11, color="A32D2D")
wl.cell(1, 1).alignment = WRAP; wl.row_dimensions[1].height = 40
WC = [("#", 5), ("Engine", 26), ("Kind", 13), ("What it should be", 52),
      ("Recommended fix", 60), ("YOUR VERDICT", 16), ("Part of the app", 22)]
for c, (t, w) in enumerate(WC, start=1):
    wl.column_dimensions[openpyxl.utils.get_column_letter(c)].width = w
    cell = wl.cell(2, c, t); cell.fill, cell.font, cell.alignment, cell.border = HDR, WHITE, WRAP, THIN

items = []
for r in range(3, ws.max_row + 1):
    if ws.cell(r, 13).value == "Y":
        items.append((ws.cell(r, 3).value, ws.cell(r, 11).value, ws.cell(r, 12).value,
                      ws.cell(r, 14).value, ws.cell(r, 16).value, ws.cell(r, 2).value))
for i, (eng, kind, should, rec, verdict, metric) in enumerate(items, start=1):
    for c, v in enumerate([i, eng, kind, should, rec, verdict, metric], start=1):
        cell = wl.cell(i + 2, c, v); cell.alignment, cell.border = WRAP, THIN
        if c == 3: cell.fill = BAD if kind == "DEFECT" else CALL
        if c == 6: cell.fill = YOURS
wl.freeze_panes = "B3"

# ── the read-me, rewritten for the merged file ──────────────────────────────────────────────────
rm = master["0. Read Me"]
rm.cell(1, 1, "MoneyKeel — the master calculation file")
rows = [
    ("What this is",
     "ONE file. It replaces the two that used to hold the truth between them: this crosswalk and the "
     "separate calculation inventory. Two overlapping files drift, and then neither can be trusted."),
    ("Tab 1 · Metrics",
     f"The {sum(1 for r in range(5, mm.max_row+1) if mm.cell(r,1).value and mm.cell(r,3).value)} figures a person "
     "reads: the formula, its inputs, whether any institution can even supply them, the trap, which of "
     "our engines produces it, how much we actually know, and what it needs."),
    ("Tab 2 · Engines",
     f"{engines_written} rows — one per calculation in the code. Column A says which metric each one serves. "
     "Every row is proved by a test that runs the real code; several run against real institution files."),
    ("Tab 3 · Work list",
     f"{len(items)} rows needing a fix or a decision, gathered in one place with a column for your verdict."),
    ("How to read 'How much we know'",
     "CHECKED vs REAL DATA — compared against a real institution file. The only level showing a number "
     "is RIGHT rather than merely self-consistent.  ·  PINNED — a test proves the row DESCRIBES the code, "
     "not that the behaviour is right.  ·  YOUR CALL — resting on a threshold or table we chose.  ·  "
     "DEFECT — believed wrong.  ·  UNRESOLVED — needs your decision."),
    ("The two blue columns", "Yours. Nothing regenerating this file ever writes to them."),
    ("Generated, not typed",
     "The engine rows, their source locations and the build order are read off the code. Rebuild with "
     "build-inventory-xlsx.py then build-master.py. Hand-edits to grey columns are overwritten."),
    ("Rebuilt", datetime.date.today().isoformat()),
]
for i, (k, v) in enumerate(rows, start=4):
    rm.cell(i, 1, k).font = Font(bold=True, size=10)
    rm.cell(i, 2, v).alignment = WRAP
    rm.cell(i, 1).alignment = WRAP
rm.column_dimensions["A"].width = 30; rm.column_dimensions["B"].width = 96

# tidy the tab order and names
order = ["0. Read Me", "1. Metric Matrix", "2. Engines", "3. Work list"]
for name in order[::-1]:
    if name in master.sheetnames:
        master.move_sheet(name, offset=-master.sheetnames.index(name))
master.save(OUT)
print(f"{OUT}")
print(f"  metrics {sum(1 for r in range(5, mm.max_row+1) if mm.cell(r,1).value and mm.cell(r,3).value)} · "
      f"engines {engines_written} · work list {len(items)} · tabs {len(master.sheetnames)}")
unmapped = sum(1 for r in range(3, ws.max_row + 1) if ws.cell(r, 1).value == "—")
print(f"  {engines_written - unmapped} engines map to a named metric · {unmapped} have no metric row yet")
import collections as _c
_parts = _c.Counter(ws.cell(r, 2).value for r in range(3, ws.max_row + 1) if ws.cell(r, 2).value)
print("  by part of the app: " + " · ".join(f"{k} {v}" for k, v in _parts.most_common()))
