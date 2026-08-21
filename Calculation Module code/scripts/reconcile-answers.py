# YOUR DECISIONS, RECONCILED INTO THE MASTER — the answer to "how do I know the master carries
# what I decided?" (founder, 2026-08-21).
#
# THE GAP THIS CLOSES. The founder answered 678 grid cells and 56 questions in
# METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx. That file was read by a HUMAN (me), turned into a
# brief, and the brief drove code. Nothing mechanical ever connected his file to the master — and
# the two do not even share a vocabulary: his 72-metric spine and the master's research frame have
# ZERO metric names in common, so a reader cannot look up his own verdict in the deliverable.
#
# This script rebuilds that link from the files themselves, every time the master is built:
#   · every metric he graded, in HIS order, with HIS verdict and HIS new formula (column K)
#   · the engines that serve each metric — read from the decomposition grids, which are keyed to
#     his spine and cite engine names in their text, then CHECKED to exist on the Engines tab
#   · what became of each cut metric, from the cut ledger
#   · an honest NOT YET MAPPED list — the gap is shown, never hidden
import os, re, collections
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

ROOT = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module"
# A grid may legitimately name things that are not engines — the canonical event vocabulary, a
# constant, a broker's activity type. So "stale" is not "not an engine": it is NOT AN ENGINE AND
# NOWHERE IN THE CODE. That rule found exactly two dead names on 2026-08-21 (PORTFOLIO_RETURN,
# renamed by E3; RMD_START_AGE_SIM, deleted by B4) among ten candidates — the other eight were real
# constants, and calling them stale would have been a false alarm.
CODE_DIRS = ["/Users/palakjain/Vibe_Coding/finwise/src",
             "/Users/palakjain/Vibe_Coding/finwise/Calculation Module code/engines"]
_code_blob = []
for d in CODE_DIRS:
    for dp, _, fns in os.walk(d):
        for fn in fns:
            if fn.endswith((".ts", ".tsx")):
                try: _code_blob.append(open(os.path.join(dp, fn), encoding="utf-8").read())
                except Exception: pass
CODE = "\n".join(_code_blob)
def exists_in_code(tok): return tok in CODE
ANS  = os.path.join(ROOT, "decomposition/METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx")
MAST = os.path.join(ROOT, "MoneyKeel-calculation-master-v1.xlsx")
CUTS = os.path.join(ROOT, "decomposition/CUT-METRICS-2026-08-20.md")
SECT = [os.path.join(ROOT, "decomposition", f"section-{s}.md") for s in "ABCDE"]

HDR = PatternFill("solid", fgColor="085041"); WHITE = Font(color="FFFFFF", bold=True, size=10)
WRAP = Alignment(wrap_text=True, vertical="top"); THIN = Border(*[Side(style="thin", color="DDDDDD")] * 4)
BAD = PatternFill("solid", fgColor="FBE3E3"); OK = PatternFill("solid", fgColor="EAF3EC")
CALL = PatternFill("solid", fgColor="FFF2CC"); SEC = PatternFill("solid", fgColor="D9E2EC")

# ── 1 · his grid: metric → section, use cases, verdicts, the new formula ────────────────────────
ws = openpyxl.load_workbook(ANS, read_only=True)["1. Metrics grid"]
metrics = collections.OrderedDict()
for r in range(5, ws.max_row + 1):
    sec, m, uc, k, v = (str(ws.cell(r, c).value or "").strip() for c in (1, 2, 3, 11, 12))
    if not (m and uc):
        continue
    d = metrics.setdefault(m, {"sec": sec, "cases": 0, "verdicts": collections.Counter(), "k": ""})
    d["cases"] += 1
    if v: d["verdicts"][v] += 1
    if k and not d["k"]: d["k"] = k

# ── 2 · his answered questions, for the count on the read-me line ───────────────────────────────
q = openpyxl.load_workbook(ANS, read_only=True)["3. Open questions"]
answered = sum(1 for r in range(3, q.max_row + 1) if str(q.cell(r, 3).value or "").strip())

# ── 3 · the decomposition grids are keyed to HIS metric names and cite engines in their text ────
# Three ways a grid cell points at code, all of them used: the ENGINE_NAME, the function name,
# and the source line (src/domain/x.ts:64). Matching on only the first mapped 11 of 72 and would
# have reported a gap that was really a weakness in this script.
raw_tokens = collections.defaultdict(set)
raw_sources = collections.defaultdict(set)
for f in SECT:
    if not os.path.exists(f): continue
    cur = None
    for line in open(f, encoding="utf-8"):
        h = re.match(r"^### (.+?)\s*$", line)
        if h: cur = h.group(1).strip(); continue
        if not cur: continue
        # NOTE: no nested quantifier here — the first attempt backtracked catastrophically
        for tok in re.findall(r"[A-Za-z][A-Za-z0-9_]{3,}", line):
            raw_tokens[cur].add(tok)
        for srcref in re.findall(r"src/[A-Za-z0-9_/\.]+\.ts", line):
            raw_sources[cur].add(srcref)

# ── 4 · which of those engine names actually exist on the Engines tab ───────────────────────────
master = openpyxl.load_workbook(MAST)
eng = master["2. Engines"]
by_engine, by_function, by_source = {}, {}, collections.defaultdict(set)
for r in range(3, eng.max_row + 1):
    e = str(eng.cell(r, 3).value or "").strip()
    fn = str(eng.cell(r, 4).value or "").strip()
    srcline = str(eng.cell(r, 19).value or "").strip()
    if not e: continue
    by_engine[e] = e
    if fn: by_function[fn] = e
    if srcline: by_source[srcline.split(":")[0]].add(e)

# WILL_IT_LAST and willItLast are the same thing written two ways — match on a normalised key
norm_key = lambda t: re.sub(r"[^a-z0-9]", "", str(t).lower())
by_norm = {}
for e in by_engine: by_norm.setdefault(norm_key(e), e)
for fn, e in by_function.items(): by_norm.setdefault(norm_key(fn), e)

cited = {}
stale = collections.defaultdict(set)
for m in set(list(raw_tokens) + list(raw_sources)):
    hits = set()
    for tok in raw_tokens.get(m, ()):                     # ENGINE_NAME, functionName, either spelling
        k = norm_key(tok)
        if k in by_norm: hits.add(by_norm[k])
        elif re.fullmatch(r"[A-Z][A-Z0-9]*(_[A-Z0-9]+)+", tok) and not exists_in_code(tok):
            stale[m].add(tok)                             # looks like an engine, is not one any more
    for sref in raw_sources.get(m, ()):                   # src/domain/x.ts → the engines living there
        hits |= by_source.get(sref, set())
    cited[m] = hits

# ── 5 · the cut ledger: what became of each cut metric ──────────────────────────────────────────
cut_note = {}
if os.path.exists(CUTS):
    for line in open(CUTS, encoding="utf-8"):
        if line.startswith("| ") and line.count("|") >= 5:
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) >= 4 and cells[0] not in ("Metric", "---"):
                cut_note[cells[0].lower()] = f"grid: {cells[2]} · code: {cells[3]}"

# ── 6 · write the tab, in HIS order ─────────────────────────────────────────────────────────────
TAB = "1. Your decisions"
if TAB in master.sheetnames: del master[TAB]
out = master.create_sheet(TAB, 1)
out.sheet_properties.tabColor = "085041"
out.merge_cells("A1:G1")
out.cell(1, 1,
  f"YOUR DECISIONS — every metric you graded in METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx, in YOUR order, "
  f"with YOUR verdict and YOUR new formula, and what now serves it in the code. {len(metrics)} metrics · "
  f"{answered} questions answered. GENERATED from your own file on every build, so this tab cannot drift from "
  f"what you decided. 'NOT YET MAPPED' means the decomposition grid for that metric cites no engine name, no function and no source file that exists on the Engines tab — the gap is shown, never hidden."
).font = Font(bold=True, size=11, color="085041")
out.cell(1, 1).alignment = WRAP; out.row_dimensions[1].height = 56

COLS = [("Section", 10), ("Metric — your name for it", 30), ("Use cases you graded", 12),
        ("YOUR VERDICT", 14), ("YOUR NEW FORMULA (column K, first use case)", 66),
        ("What serves it in the code now", 34), ("Status", 20)]
for c, (t, w) in enumerate(COLS, start=1):
    out.column_dimensions[openpyxl.utils.get_column_letter(c)].width = w
    cell = out.cell(2, c, t); cell.fill, cell.font, cell.alignment, cell.border = HDR, WHITE, WRAP, THIN

row = 3
stats = collections.Counter()
gaps = []
cur_sec = None
for m, d in metrics.items():
    if d["sec"] != cur_sec:
        cur_sec = d["sec"]
        out.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
        c = out.cell(row, 1, f"SECTION {cur_sec}")
        c.fill, c.font, c.border = SEC, Font(bold=True, size=10), THIN
        row += 1
    v = d["verdicts"]
    verdict = "CUT" if set(v) == {"CUT"} else ("DEFER" if "DEFER" in v else ("CHANGED" if v else "—"))
    engines = sorted(cited.get(m, set()))
    if verdict == "CUT":
        serves = cut_note.get(m.lower(), "removed 2026-08-20")
        status = "CUT — removed"; stats["cut"] += 1
    elif engines:
        serves = " · ".join(engines[:6]) + (f" (+{len(engines)-6} more)" if len(engines) > 6 else "")
        status = f"KEPT — {len(engines)} engine(s)"; stats["mapped"] += 1
    else:
        serves = "—"
        status = "NOT YET MAPPED"; stats["unmapped"] += 1; gaps.append(m)
    for c, val in enumerate([d["sec"], m, d["cases"], verdict, d["k"], serves, status], start=1):
        cell = out.cell(row, c, val); cell.alignment, cell.border = WRAP, THIN
        if c == 4: cell.fill = BAD if verdict == "CUT" else (CALL if verdict == "DEFER" else OK)
        if c == 7: cell.fill = BAD if status == "NOT YET MAPPED" else OK
    row += 1
out.freeze_panes = "C3"
master.save(MAST)

print(f"   YOUR DECISIONS tab: {len(metrics)} metrics · {stats['cut']} cut · {stats['mapped']} mapped to engines · {stats['unmapped']} NOT YET MAPPED")
if gaps:
    print("   not yet mapped: " + ", ".join(gaps))
staleflat = sorted({(m, t) for m, ts in stale.items() for t in ts if m in metrics})
if staleflat:
    print(f"   STALE CITATION(S) — the grid names something that is not an engine any more: {len(staleflat)}")
    for m, t in staleflat: print(f"      {m}: {t}")
