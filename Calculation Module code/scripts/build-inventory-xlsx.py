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
# The founder can attach an Excel comment to ANY cell on ANY tab. A regeneration builds a fresh
# workbook, so without this those comments would be silently destroyed - the worst possible failure
# for a review channel, because he would not know it happened. Captured by (tab, function-name,
# column header) so a comment follows its row even when the code moves and the row number changes.
notes = {}
MINE = "Calculation module"      # the column-header help text this script writes; not his
if os.path.exists(OUT):
    wbp = openpyxl.load_workbook(OUT)
    for _tab in wbp.sheetnames:
        _ws = wbp[_tab]
        _hdr = {c: _ws.cell(2, c).value for c in range(1, _ws.max_column + 1)}
        for _row in _ws.iter_rows():
            for _cell in _row:
                if _cell.comment and _cell.comment.author != MINE:
                    _key = _ws.cell(_cell.row, 2).value if _cell.row > 2 else "__header__"
                    notes[(_tab, str(_key), _hdr.get(_cell.column))] = (_cell.comment.text, _cell.comment.author)
    for tab in ("Calculations", "Formatting helpers"):
        if tab in wbp.sheetnames:
            ws = wbp[tab]
            hdrs = {c: ws.cell(2, c).value for c in range(1, ws.max_column + 1)}   # keyed by NAME, never by number
            for r in range(3, ws.max_row + 1):
                key = ws.cell(r, 2).value          # column B = Function (the stable key)
                if key:
                    prior[key] = {hdrs.get(c): ws.cell(r, c).value for c in range(1, ws.max_column + 1)}

# Rows on the free-text tabs, captured BEFORE the rebuild so they are not silently wiped.
freeform = {}
if os.path.exists(OUT):
    for _tab in ("Open questions", "Field dictionary"):
        if _tab in wbp.sheetnames:
            _ws = wbp[_tab]
            freeform[_tab] = [[_ws.cell(_r, _c).value for _c in range(1, _ws.max_column + 1)]
                              for _r in range(3, _ws.max_row + 1)
                              if any(_ws.cell(_r, _c).value for _c in range(1, _ws.max_column + 1))]

wb = openpyxl.Workbook()
HDR   = PatternFill("solid", fgColor="085041")
GEN   = PatternFill("solid", fgColor="EEEEE9")     # generated — do not edit
HAND  = PatternFill("solid", fgColor="FFF6E5")     # I fill these
YOURS = PatternFill("solid", fgColor="E8F0FB")     # the founder fills these - never overwritten
WHITE = Font(color="FFFFFF", bold=True, size=10)
BOLD  = Font(bold=True, size=10)
WRAP  = Alignment(wrap_text=True, vertical="top")
THIN  = Border(*[Side(style="thin", color="DDDDDD")] * 4)

COLS = [
    ("Engine name",        24, "hand", "The name we will call it by. One concept, one name — and the name must match the "
                                        "concept, not the file it happens to live in. Where the same question is answered in "
                                        "more than one place, each gets a name saying WHICH DOOR it serves "
                                        "(…_FROM_FILE, …_FROM_BROKER), because that is how you find the one that is wrong."),
    ("Function",           26, "gen",  "The exported function in the code today."),
    ("What it answers",    44, "hand", "In plain English — the question AND the list of possible answers. "
                                        "'Which asset class is this?' is not enough: the row must name the classes. "
                                        "If a reader cannot tell from this cell what the answer could be, the cell is wrong."),
    ("Formula — the actual rules",  64, "hand",
                                       "The rules as they are applied to REAL data, in order, written so you could follow them "
                                        "by hand against a downloaded file. Literal words, tickers and patterns — not an "
                                        "abstract chain of internal field names. 'label rule → maturity → kind' says nothing; "
                                        "'name contains CD, CERTIFICATE OF DEPOSIT, T-BILL or TREASURY BILL → Bonds & CDs' is a rule."),
    ("Input variables (raw → ours)", 40, "hand",
                                       "Every variable that goes in, written as THE INSTITUTION'S FIELD → what we call it. "
                                        "The left side is what a person would see in their own download; the right side is "
                                        "our name for it."),
    ("Where each comes from — file, feed, field", 56, "hand",
                                       "The actual origin: WHICH file or feed, WHICH field in it, and HOW that field is "
                                        "identified when institutions name it differently. 'The account record' is not a "
                                        "source — the account record is where it ended up. Name the download column, the "
                                        "payload path, or the screen and box it was typed into."),
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
    ("YOUR COMMENT / QUESTION", 46, "you",
                                       "YOURS. Write anything here - a question, a disagreement, "
                                        "'this is not what I meant', 'where does this number show up'. "
                                        "Nothing I run ever writes to this column or clears it; it survives every "
                                        "regeneration. You can also attach an Excel comment to ANY cell on any tab "
                                        "and I will read it - comments are preserved too."),
    ("YOUR VERDICT",       16, "you",  "YOURS. For rows where Fix needed? is Y: FIX / LEAVE / LATER, or your own word. "
                                        "This is the column I work from - it is your answer to my recommendation, and "
                                        "I will not start a fix that does not have one."),
    ("Build order",        22, "gen",  "Which layer this sits in. Layer 1 reads raw data and computes from that alone; "
                                        "each layer above is built from the one below. The sheet is SORTED by this, so "
                                        "nothing appears before the things it is built from — read it top to bottom and "
                                        "every ingredient has already been explained by the time you reach the total."),
    ("Built from",         34, "gen",  "The calculations directly beneath this one. Empty means it reads raw data only."),
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
        keep = prior.get(r["name"], {})
        def kept(header):
            """Whatever was in that NAMED column last time — empty if the column did not exist."""
            return keep.get(header) or ""
        vals = [
            kept("Engine name"),
            r["name"],                                              # generated
            kept("What it answers"),
            kept("Formula — the actual rules") or kept("Formula"),  # the column was renamed; carry both
            kept("Input variables (raw → ours)") or kept("Input variables"),
            kept("Where each comes from — file, feed, field") or kept("Source of each"),
            kept("DERIVATION RULE"),
            kept("Probe"),
            kept("Status"),
            kept("WHAT IT SHOULD BE"),
            kept("Fix needed?"),
            kept("RECOMMENDED FIX"),
            kept("YOUR COMMENT / QUESTION"),                        # never written by me
            kept("YOUR VERDICT"),                                   # never written by me
            r.get("layer", ""),
            r.get("builtFrom", "—"),
            r["screens"] or "—",
            r["calledBy"] or "—",
            r["returns"],
            f'{r["file"]}:{r["line"]}',
        ]
        for c, v in enumerate(vals, start=1):
            cell = ws.cell(i, c, v)
            cell.alignment, cell.border = WRAP, THIN
            cell.fill = {"hand": HAND, "you": YOURS}.get(COLS[c - 1][2], GEN)
            if c == 2:
                cell.font = BOLD
    return ws

# ── BUILD ORDER — nothing appears before the things it is built from ───────────────────────────
# Founder, 2026-08-17: "if you have a formula calculating total NW, prior to that list all the
# formula which help you get all the numbers you need to calculate NW."
#
# The scanner records who CALLS each function. Inverting that gives what each function DEPENDS ON,
# and the depth of that dependency chain is the layer. Layer 1 reads raw data and computes from it
# alone; layer 2 is built from layer 1; a grand total sits at the top with everything beneath it
# already explained. Read the sheet top to bottom and no number arrives before its ingredients.
def build_layers(rs):
    names = {r["name"] for r in rs}
    deps = {n: set() for n in names}                       # what each one is built FROM
    for r in rs:
        for caller in [c.strip() for c in (r["calledBy"] or "").split(",") if c.strip()]:
            if caller in names:
                deps[caller].add(r["name"])                # the caller is built from this one
    layer, settled = {}, False
    for n in names: layer[n] = 0
    for _ in range(60):                                     # enough passes for any real depth
        settled = True
        for n in names:
            want = max((layer[d] + 1 for d in deps[n]), default=0)
            if want != layer[n] and want < 60:              # the cap also breaks any accidental cycle
                layer[n], settled = want, False
        if settled: break
    return layer, deps

LAYERS, DEPS = build_layers([r for r in rows if r["tab"] == "calculations"])
LAYER_NOTE = {
    0: "1 · reads raw data",
    1: "2 · built from layer 1",
    2: "3 · built from layer 2",
    3: "4 · built from layer 3",
    4: "5 · built from layer 4",
}
for r in rows:
    lv = LAYERS.get(r["name"], 0)
    r["layer"] = LAYER_NOTE.get(lv, f"{lv + 1} · built from layer {lv}")
    r["builtFrom"] = ", ".join(sorted(DEPS.get(r["name"], set()))) or "—"

calcs = sorted([r for r in rows if r["tab"] == "calculations"],
               key=lambda r: (LAYERS.get(r["name"], 0), r["module"], r["name"]))
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
      "CREAM columns are written by hand and preserved. THE TWO BLUE COLUMNS ARE YOURS - write your questions and your verdict there, and nothing I run will ever touch them. You can also attach an Excel comment to ANY cell on any tab; comments survive regeneration and I read them. A row is not documented until its probe passes.")

sheet("Formatting helpers", helps,
      f"FORMATTING HELPERS · {len(helps)} · they shape numbers rather than compute them, "
      "but they are listed because a rounding or masking rule can change what a person reads.")

# ── the two supporting tabs ─────────────────────────────────────────────────────────────────────
# ── the worked-example tab: how a real line in a real download becomes a class ──────────────────
ws = wb.create_sheet("How a line becomes a class")
ws.sheet_properties.tabColor = "1B4D8F"
ws.merge_cells("A1:G1")
ws.cell(1, 1, "HOW A LINE BECOMES A CLASS — every row below is a real holding as an institution actually "
              "sends it, run through the live code. The last two columns are what the app decides, and they do "
              "not always agree: a holding you UPLOAD and the same holding from a CONNECTED broker go through "
              "two different classifiers. Where they differ, the row is a defect and it is named as one. "
              "Proved by probes/classification-crosspath.probe.test.ts.").font = Font(bold=True, size=11, color="1B4D8F")
ws.cell(1, 1).alignment = WRAP; ws.row_dimensions[1].height = 60
CLS_COLS = [("What you hold", 30), ("Ticker as sent", 16), ("Name / description as sent", 44),
            ("Which rule fires", 46), ("Class from a FILE you upload", 22),
            ("Class from a CONNECTED broker", 22), ("Agree?", 26)]
for c, (t, w) in enumerate(CLS_COLS, start=1):
    ws.column_dimensions[openpyxl.utils.get_column_letter(c)].width = w
    cell = ws.cell(2, c, t); cell.fill, cell.font, cell.alignment, cell.border = HDR, WHITE, WRAP, THIN
BAD = PatternFill("solid", fgColor="FBE3E3")
OK  = PatternFill("solid", fgColor="EAF3EC")
CLS_ROWS = [
 ("A share in a company", "AAPL", "APPLE INC", "nothing else matches → the default is Stocks / ETFs",
  "Stocks / ETFs", "Stocks / ETFs", "yes"),
 ("A stock-market ETF", "VTI", "VANGUARD TOTAL STOCK MARKET ETF", "nothing else matches → the default is Stocks / ETFs",
  "Stocks / ETFs", "Stocks / ETFs", "yes"),
 ("A money-market fund", "VMFXX", "VANGUARD FEDERAL MONEY MARKET FUND",
  "the ticker is on the money-market list, AND the name contains MONEY MARKET → Stocks / ETFs "
  "(founder rule 2026-08-04: it pays dividends, so it must be measured)", "Stocks / ETFs", "Stocks / ETFs", "yes"),
 ("Uninvested cash at the broker", "—", "SETTLEMENT FUND / SWEEP",
  "the name contains SWEEP or SETTLEMENT → Cash. This is the only thing that counts as cash.",
  "Cash", "Cash", "yes"),
 ("A brokered CD", "06418AAA1", "KEYBANK NA 4.00% CD 08/24/26",
  "the description contains CD → Bonds & CDs. Note it arrives with an equity type code and a CUSIP, "
  "not a ticker — the words in the description are the only thing that identifies it.",
  "Bonds & CDs", "Bonds & CDs", "yes"),
 ("A Treasury bill", "912797TZ8", "US TREASURY BILL 02/12/27",
  "the description contains TREASURY or T-BILL → Bonds & CDs", "Bonds & CDs", "Bonds & CDs", "yes"),
 ("A short-Treasury ETF", "SGOV", "ISHARES 0-3 MONTH TREASURY BOND ETF",
  "the ticker is on the T-bill ETF list (SGOV, BIL) → Bonds & CDs", "Bonds & CDs", "Bonds & CDs", "yes"),
 ("A corporate bond", "—", "APPLE INC 3.85% DUE 2043",
  "a percentage followed by DUE or a year → Bonds & CDs. This pattern is what catches a bond whose "
  "description never uses the word 'bond'.", "Bonds & CDs", "Bonds & CDs", "yes"),
 ("Bitcoin held at the broker", "BTC", "BITCOIN",
  "the broker's own type code says crypto → Alternatives", "Alternatives", "Alternatives", "yes"),
 ("A gold fund", "GLD", "SPDR GOLD SHARES",
  "FILE: the ticker is on the commodity list → Alternatives. BROKER: no commodity rule exists, so it "
  "falls through to the equity default.", "Alternatives", "Stocks / ETFs", "NO — defect"),
 ("A spot-bitcoin ETF", "IBIT", "ISHARES BITCOIN TRUST",
  "FILE: the ticker is on the crypto list → Alternatives. BROKER: it arrives with the ordinary equity "
  "type code, and only the type code is checked.", "Alternatives", "Stocks / ETFs", "NO — defect"),
 ("An option contract", "AAPL250117C00220000", "AAPL JAN 17 25 CALL 220",
  "FILE: the symbol matches the standard option shape (root + date + C/P + strike) → Alternatives. "
  "BROKER: options normally arrive on a separate feed and are handled correctly there; one written into "
  "the ordinary positions list is read as a share.", "Alternatives", "Stocks / ETFs", "NO — defect"),
 ("A currency fund", "FXE", "INVESCO CURRENCYSHARES EURO TRUST",
  "NEITHER path catches it. The only currency rule looks for the word CURRENCY standing alone, and "
  "brokers shorten the name to CURRENCYSHARES — one word. There is no currency ticker list, unlike "
  "crypto and commodities.", "Stocks / ETFs", "Stocks / ETFs", "NO — both wrong"),
 ("A gold mining company", "GOLD", "BARRICK GOLD CORP",
  "the name contains GOLD, but also CORP — a company word, so the commodity rule is deliberately "
  "skipped and it stays a share. This one is RIGHT and worth keeping.", "Stocks / ETFs", "Stocks / ETFs", "yes"),
 ("A whole account with nothing itemised", "—", "e.g. a 401(k) with no holdings listed",
  "no positions, no explicit class → Unclassified. It is NOT assumed to be stocks — the honest answer "
  "is that we do not know what is inside it.", "Unclassified", "Unclassified", "yes"),
]
for i, row in enumerate(CLS_ROWS, start=3):
    for c, v in enumerate(row, start=1):
        cell = ws.cell(i, c, v)
        cell.alignment, cell.border = WRAP, THIN
        cell.fill = BAD if row[6].startswith("NO") else OK
ws.freeze_panes = "A3"

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

# ── put the free-text tabs back ────────────────────────────────────────────────────────────────
for _tab, _rows in freeform.items():
    _ws = wb[_tab]
    for _i, _vals in enumerate(_rows, start=3):
        for _c, _v in enumerate(_vals, start=1):
            _cell = _ws.cell(_i, _c, _v)
            _cell.alignment = WRAP
if freeform:
    print(f"  carried {sum(len(v) for v in freeform.values())} rows across the free-text tabs")

# ── restore the founder's comments onto the rebuilt sheets ─────────────────────────────────────
_restored = 0
for _tab in wb.sheetnames:
    _ws = wb[_tab]
    _hdr = {c: _ws.cell(2, c).value for c in range(1, _ws.max_column + 1)}
    _rowOf = {str(_ws.cell(r, 2).value): r for r in range(3, _ws.max_row + 1)}
    for (_t, _key, _col), (_text, _author) in notes.items():
        if _t != _tab: continue
        _c = next((c for c, h in _hdr.items() if h == _col), None)
        _r = _rowOf.get(_key)
        if _c and _r:
            _ws.cell(_r, _c).comment = openpyxl.comments.Comment(_text, _author or "Founder")
            _restored += 1

wb.save(OUT)

# ── COVERAGE LINE — printed every regeneration, so "is it done?" never needs a hand count ───────
# The founder asked "have you fixed all rows, or just one?" after a standard changed. A standard
# that is not machine-checked gets applied to the row someone happened to open. This checks EVERY
# documented row against the four rules that standard is made of.
import re as _re
_ws = openpyxl.load_workbook(OUT)["Calculations"]
_VAGUE = _re.compile(r"^(accounts?|derived|the account record|debt records?|lots)\.?$", _re.I)
# Internal terms that exist because of how the CODE is organised, not because of anything a person
# would recognise about their own money. The founder read "wrapper" and asked what it meant; he was
# right, and by then it was in 22 cells. A word list is how that stops happening again.
_JARGON = ["wrapper", "payload", "earmark", "residual", "dedupe", "sleeve", "idempot", "arity"]
_GENCOLS = {"Function", "Build order", "Built from", "Screens", "Called by", "Returns", "Source"}
_done, _blank, _fail = 0, 0, []
for _r in range(3, _ws.max_row + 1):
    _fn = _ws.cell(_r, 2).value
    _a, _c, _d, _e, _f = (str(_ws.cell(_r, _col).value or "") for _col in (1, 3, 4, 5, 6))
    if not any((_a, _c, _d, _e, _f)):
        _blank += 1
        continue
    _done += 1
    _why = []
    if not _a or " " in _a or "?" in _a:                      _why.append("engine name is not a name")
    if "·" not in _c and ":" not in _c and "Answer" not in _c: _why.append("possible answers not listed")
    if _VAGUE.match(_f.strip()) or len(_f) < 40:               _why.append("source does not name file/feed/field")
    if len(_d) < 60:                                           _why.append("formula not written as real rules")
    if "→" not in _e:                                          _why.append("variables not written raw → ours")

    # A hand column that merely REPEATS a generated one is not documentation. 332 cells were polluted
    # this way when two columns were inserted and the preserve logic shifted everything by position;
    # four rows counted as "documented" on that junk alone, inflating the coverage line I reported.
    _gen = {str(_ws.cell(_r, _c).value) for _c in range(1, _ws.max_column + 1)
            if _ws.cell(_r, 2).value and _ws.cell(2, _c).value in _GENCOLS}
    for _col in range(1, 13):
        if _ws.cell(2, _col).value in _GENCOLS: continue      # column 2 IS Function — skip generated
        _v = _ws.cell(_r, _col).value
        if isinstance(_v, str) and _v and _v in _gen:
            _why.append(f"column '{_ws.cell(2, _col).value}' just repeats a generated column")
            break

    # and no internal jargon in anything WE wrote
    for _col in range(1, 15):
        if _ws.cell(2, _col).value in _GENCOLS: continue
        _v = str(_ws.cell(_r, _col).value or "").lower()
        _hit = next((_j for _j in _JARGON if _j in _v), None)
        if _hit:
            _why.append(f"internal jargon: '{_hit}'")
            break

    if _why: _fail.append((_r, _fn, _why))

print(f"{OUT}")
print(f"  COVERAGE: {_done} of {_done + _blank} rows documented · {_blank} not yet written")
if _fail:
    print(f"  ⚠ {len(_fail)} DOCUMENTED ROWS FAIL THE STANDARD:")
    for _r, _fn, _why in _fail:
        print(f"      row {_r:>4}  {_fn:<26}  {'; '.join(_why)}")
else:
    print(f"  every documented row meets the standard (answers listed · real rules · real source · raw → ours)")
print(f"  {len(calcs)} calculations · {len(helps)} helpers · commit {sha}{'  (DIRTY TREE)' if dirty else ''}")
print(f"  restored {_restored} of {len(notes)} of your cell comments")
# the Raw inputs tab is built by its own script, which must run AFTER this one saves
import subprocess
subprocess.run(["python3", os.path.join(ROOT, "Calculation Module code/scripts/raw-inputs-tab.py")], check=True)

print(f"  preserved annotations for {len([k for k in prior if any(prior[k])])} rows")
