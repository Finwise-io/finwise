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

wb.save(OUT)
print(f"{OUT}")
print(f"  {len(calcs)} calculations · {len(helps)} helpers · commit {sha}{'  (DIRTY TREE)' if dirty else ''}")
print(f"  preserved annotations for {len([k for k in prior if any(prior[k])])} rows")
