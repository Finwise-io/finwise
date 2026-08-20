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

# ── E12 (founder brief 2026-08-20): PINNED certified documentation, not correctness — and it was
# 73% of the file, so the word carried false comfort. Renamed DOCUMENTED on both tabs. ──────────
def _honest(v):
    return "DOCUMENTED" if str(v or "").strip() == "PINNED" else v
for _r in range(3, ws.max_row + 1):
    ws.cell(_r, 11, _honest(ws.cell(_r, 11).value))
for _r in range(5, mm.max_row + 1):
    mm.cell(_r, 9, _honest(mm.cell(_r, 9).value))

# ── E2: ONE status per calculation. Ten rows carried opposite statuses on the two tabs — several
# DOCUMENTED-with-no-fix on the Engines tab while the Metrics tab called them DEFECT. A reader
# could not tell which tab to believe. Rule: where a metric cites exactly ONE engine, the SEVERER
# claim wins on both tabs — an engine can be documented-as-described AND wrong — and the engine's
# "Fix needed?" flag follows. A guard then FAILS the build if any disagreement survives. ─────────
_SEV = {"DEFECT": 6, "UNRESOLVED": 5, "NOT BUILT": 4, "YOUR CALL": 3, "DOCUMENTED": 2, "CHECKED vs REAL DATA": 1}
_eng_row = {}
for _r in range(3, ws.max_row + 1):
    if ws.cell(_r, 3).value: _eng_row[str(ws.cell(_r, 3).value).strip()] = _r
def _cited(text):
    toks = str(text or "").replace("·", " ").replace("/", " ").replace(",", " ").replace("(", " ").replace(")", " ").split()
    return [t for t in toks if t.isupper() and "_" in t and t in _eng_row]
_reconciled = 0
# to a FIXED POINT: three metrics can share one engine, so a defect learned from the second row
# must flow back to the first — one pass is order-dependent, repeated passes are not
for _pass in range(5):
    _changed = 0
    for _r in range(5, mm.max_row + 1):
        _engines = _cited(mm.cell(_r, 8).value)
        _mstat = str(mm.cell(_r, 9).value or "").strip()
        if len(_engines) != 1 or _mstat not in _SEV: continue
        _er = _eng_row[_engines[0]]
        _estat = str(ws.cell(_er, 11).value or "").strip()
        if _estat not in _SEV or _estat == _mstat: continue
        _win = _mstat if _SEV[_mstat] >= _SEV[_estat] else _estat
        mm.cell(_r, 9, _win); ws.cell(_er, 11, _win)
        if _win in ("DEFECT", "UNRESOLVED"): ws.cell(_er, 13, "Y")
        ws.cell(_er, 11).fill = (BAD if _win in ("DEFECT", "UNRESOLVED") else CALL if _win == "YOUR CALL" else OK)
        _changed += 1
    _reconciled += _changed
    if not _changed: break
# the guard: no single-engine disagreement may survive to the written file
for _r in range(5, mm.max_row + 1):
    _engines = _cited(mm.cell(_r, 8).value)
    _mstat = str(mm.cell(_r, 9).value or "").strip()
    if len(_engines) != 1 or _mstat not in _SEV: continue
    _estat = str(ws.cell(_eng_row[_engines[0]], 11).value or "").strip()
    if _estat in _SEV and _estat != _mstat:
        raise SystemExit(f"⛔ STATUS DISAGREEMENT survived reconciliation: {mm.cell(_r,1).value} says {_mstat}, engine {_engines[0]} says {_estat}")
print(f"   E2: {_reconciled} status disagreement(s) reconciled — severer claim won; guard passed")

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
# E4 (founder brief 2026-08-20): the list used to be generated from ENGINE rows only, which hid
# 19 metric-level defects — including the doubled interest. The Metrics tab is swept too: a row
# whose status says DEFECT / UNRESOLVED / NOT BUILT is work, whether or not any engine row agrees.
_engine_items = {str(i[0]).strip() for i in items if i[0]}
for r in range(5, mm.max_row + 1):
    _st = str(mm.cell(r, 9).value or "").strip()
    if _st not in ("DEFECT", "UNRESOLVED", "NOT BUILT"): continue
    _engines = _cited(mm.cell(r, 8).value)
    if len(_engines) == 1 and _engines[0] in _engine_items: continue     # already listed via its engine
    items.append((mm.cell(r, 1).value, f"{_st} (metric)",
                  mm.cell(r, 10).value, mm.cell(r, 11).value, None, mm.cell(r, 1).value))
for i, (eng, kind, should, rec, verdict, metric) in enumerate(items, start=1):
    for c, v in enumerate([i, eng, kind, should, rec, verdict, metric], start=1):
        cell = wl.cell(i + 2, c, v); cell.alignment, cell.border = WRAP, THIN
        if c == 3: cell.fill = BAD if str(kind).startswith("DEFECT") else CALL
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
     "is RIGHT rather than merely self-consistent.  ·  DOCUMENTED — a test proves the row DESCRIBES the code, "
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

# ── the ARCHITECTURE tab, from the generated map ────────────────────────────────────────────────
# Regenerated here so it can never drift from the code. Run architecture-map.mjs first.
import json
MAP = "/Users/palakjain/Vibe_Coding/finwise/docs/architecture/module-map.json"
if os.path.exists(MAP):
    amap = json.load(open(MAP))
    if "4. Architecture" in master.sheetnames: del master["4. Architecture"]
    aw = master.create_sheet("4. Architecture", 4)
    aw.sheet_properties.tabColor = "1B4D8F"
    aw.merge_cells("A1:I1")
    aw.cell(1, 1,
        "ARCHITECTURE — the whole app as modules and layers, GENERATED from the code and from tab 2 of "
        "this file. Read the layers bottom to top: nothing arrives before the thing it is built from. "
        "Every count is read off disk, never typed, so this tab cannot quietly disagree with what ships. "
        'Rebuild: node "Calculation Module code/scripts/architecture-map.mjs" then this script.'
    ).font = Font(bold=True, size=11, color="1B4D8F")
    aw.cell(1, 1).alignment = WRAP; aw.row_dimensions[1].height = 52
    ACOLS = [("Layer", 22), ("Module", 24), ("What it owns", 46), ("Source files", 12), ("Tests", 10),
             ("Engines documented", 16), ("Needs a fix", 12), ("Your call", 11), ("Depends on", 34)]
    for c, (t, w) in enumerate(ACOLS, start=1):
        aw.column_dimensions[openpyxl.utils.get_column_letter(c)].width = w
        cell = aw.cell(2, c, t); cell.fill, cell.font, cell.alignment, cell.border = HDR, WHITE, WRAP, THIN
    OWNS = {
        "net-worth": "What you own and owe, how it is classified, and the record of what it was worth.",
        "performance": "Returns, gains, bonds and yields, the look-back.",
        "plan": "The retirement simulation, Social Security timing, the odds and the sentences about them.",
        "cash-flow": "Income, tax, spending, the ledger.",
        "accounts": "Connecting a broker, importing a file, and one account's own page.",
        "debt": "What is owed, what it costs, and how long until it clears.",
        "goals": "What someone is saving toward, and whether they are on track.",
        "insights": "What is worth telling someone, and what is missing from their picture.",
        "setup": "The questions asked at the start, and which ones each person needs.",
        "calculation-module": "The engines. Pure — no screens, no store — which is why the module runs outside the app.",
        "foundation": "Money formatting, ids, the store, the theme, Firebase, and the market and economic feeds.",
        "shared-ui": "Components used by more than one module — the gauge, the hero amount, sheets, the keyboard wrapper.",
    }
    FEAT = ("net-worth", "performance", "plan", "cash-flow", "accounts", "debt", "goals", "insights", "setup")
    LAYER = {"shared-ui": "4 · Screens & shared UI", "calculation-module": "2 · Calculation Module",
             "foundation": "1 · Foundation", **{m: "3 · Features" for m in FEAT}}
    NOTE = {"1 · Foundation": "Depends on nothing above it.",
            "2 · Calculation Module": "Pure. Depends on NOTHING — the property that lets it run outside the app.",
            "3 · Features": "Each owns its own maths, and may use the foundation.",
            "4 · Screens & shared UI": "May use any module below. Never calculates."}
    by = {m["module"]: m for m in amap["modules"]}
    ar = 3
    for layer in ["1 · Foundation", "2 · Calculation Module", "3 · Features", "4 · Screens & shared UI"]:
        aw.merge_cells(start_row=ar, start_column=1, end_row=ar, end_column=9)
        cell = aw.cell(ar, 1, f"{layer}  —  {NOTE[layer]}")
        cell.fill, cell.font, cell.alignment, cell.border = SEC, Font(bold=True, size=10, color="1B3A5C"), WRAP, THIN
        ar += 1
        for mod in sorted([k for k, v in LAYER.items() if v == layer],
                          key=lambda k: -(by.get(k, {}).get("source", 0) + by.get(k, {}).get("tests", 0))):
            v = by.get(mod, {})
            vals = [layer, mod, OWNS.get(mod, ""), v.get("source", 0), v.get("tests", 0),
                    v.get("documented", 0) or "—", v.get("needsFix", 0) or "—", v.get("yourCall", 0) or "—",
                    " ".join(v.get("dependsOn", [])) or "— nothing"]
            for c, val in enumerate(vals, start=1):
                cell = aw.cell(ar, c, val); cell.alignment, cell.border = WRAP, THIN
                if c in (4, 5, 9): cell.fill = GEN
                if c == 6 and isinstance(val, int) and val: cell.fill = OK
                if c == 7 and isinstance(val, int) and val: cell.fill = BAD
                if c == 8 and isinstance(val, int) and val: cell.fill = CALL
            ar += 1
    aw.freeze_panes = "C3"
    ar += 1
    aw.merge_cells(start_row=ar, start_column=1, end_row=ar, end_column=9)
    cell = aw.cell(ar, 1, "THE FOLDER MOVE — agreed 2026-08-18, not yet started")
    cell.fill, cell.font, cell.alignment, cell.border = SEC, Font(bold=True, size=10, color="1B3A5C"), WRAP, THIN
    ar += 1
    for k, v in [
        ("Master folder", "MoneyKeel-Latest-version/ — one folder per module, holding its maths, screens, components and tests together."),
        ("Import paths", "@net-worth/… rather than a trail of ../../, so a file can move within its module without touching anything else."),
        ("Routes stay put", "The files in app/ are one-line re-exports and routing is decided by their path, so they do not move."),
        ("Archive", "older-code-<date>/ per RELEASE, matching the build number. Two kept; a third is deleted."),
        ("Fenced THREE ways", "Out of the typechecker, out of the test runner and bundler, and a guard test that fails the build if any live file imports from an older-code folder. Without all three, archived code inside the source tree gets compiled, tested, and can be IMPORTED — the stale-code problem arriving through the back door."),
        ("Move order", "One module at a time behind a green suite: debt first (4 source, 4 tests, few dependents), then the small self-contained ones, then net worth, cash flow and plan, then setup, shared UI and foundation last."),
        ("src/ disappears", "When the last module leaves. Two places to look is the problem being solved."),
        ("Worth knowing", "git already keeps every version forever. The archive folders earn their place by being VISIBLE without a command, but they sit on top of the real history rather than being it — which is why keeping two is safe."),
    ]:
        aw.cell(ar, 1, k).font = Font(bold=True, size=10)
        aw.cell(ar, 1).alignment = WRAP; aw.cell(ar, 1).border = THIN
        aw.merge_cells(start_row=ar, start_column=2, end_row=ar, end_column=9)
        aw.cell(ar, 2, v).alignment = WRAP; aw.cell(ar, 2).border = THIN
        ar += 1

# ── one clean numbering across BOTH files' tabs ─────────────────────────────────────────────────
# Merging two nine-tab workbooks left two tabs numbered 2, two numbered 3 and two numbered 4.
# The order below is the reading order: what a person reads, then the code behind it, then the work,
# then the structure, then the research the whole thing rests on.
FINAL = [
    ("0. Read Me",              "0. Read Me"),
    ("1. Metric Matrix",        "1. Metrics"),
    ("2. Engines",              "2. Engines"),
    ("3. Work list",            "3. Work list"),
    ("4. Architecture",         "4. Architecture"),
    ("6. Transaction Taxonomy", "5. Transaction taxonomy"),
    ("2. Field Crosswalk",      "6. Field crosswalk"),
    ("3. By Asset Class",       "7. By asset class"),
    ("7. Cost Basis",           "8. Cost basis"),
    ("8. Snapshot & Honesty",   "9. Snapshot & honesty"),
    ("4. Gaps & Decisions",     "10. Gaps & decisions"),
    ("5. SnapTrade",            "11. SnapTrade"),
]
for old_name, new_name in FINAL:
    if old_name in master.sheetnames and old_name != new_name:
        master[old_name].title = new_name
for i, (_, new_name) in enumerate(FINAL):
    if new_name in master.sheetnames:
        master.move_sheet(new_name, offset=i - master.sheetnames.index(new_name))
master.save(OUT)
print(f"{OUT}")
print(f"  metrics {sum(1 for r in range(5, mm.max_row+1) if mm.cell(r,1).value and mm.cell(r,3).value)} · "
      f"engines {engines_written} · work list {len(items)} · tabs {len(master.sheetnames)}")
unmapped = sum(1 for r in range(3, ws.max_row + 1) if ws.cell(r, 1).value == "—")
print(f"  {engines_written - unmapped} engines map to a named metric · {unmapped} have no metric row yet")
import collections as _c
_parts = _c.Counter(ws.cell(r, 2).value for r in range(3, ws.max_row + 1) if ws.cell(r, 2).value)
print("  by part of the app: " + " · ".join(f"{k} {v}" for k, v in _parts.most_common()))
