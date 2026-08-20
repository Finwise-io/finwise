# E6 (founder brief 2026-08-20) — reference tabs by NAME, never by number.
#
# Every cross-reference in the master pointed at the wrong tab after a renumbering: "tab 2" meant
# the Field Crosswalk when it was written and means the Engines tab today. A number is an address
# that moves; a name is an address that doesn't. This sweeps the two SOURCE workbooks the master is
# generated from, rewriting "master tab N" / "master N R…" style references to the tab's NAME under
# the master's numbering (the numbering the texts were written against). Founder-owned columns
# (headers starting YOUR) are never touched. rebuild-master.sh runs this before the merge, so a
# regenerated master can never carry a numeric tab reference again.
import re, openpyxl

ROOT = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module"
FILES = [
    f"{ROOT}/investment-api-performance-crosswalk -v2.xlsx",
    f"{ROOT}/calculation-inventory-v1.xlsx",
]
TAB_NAME = {
    "0": "Read Me", "1": "Metrics", "2": "Engines", "3": "Work list", "4": "Architecture",
    "5": "Transaction taxonomy", "6": "Field crosswalk", "7": "By asset class",
    # tabs 8–9 never existed in the master — writers meant the SPINE workbook (crosswalk-Aug19)
    "8": "Snapshot & Honesty tab of the spine (crosswalk-Aug19)",
    "9": "Comprehensive Metrics tab of the spine (crosswalk-Aug19)",
}

def rewrite(text: str) -> str:
    # "master tab 2 row 74" → "the Engines tab row 74" · "(master 5 R31–R33)" → "(Transaction taxonomy R31–R33)"
    text = re.sub(r"master tab (\d)", lambda m: f"the {TAB_NAME.get(m.group(1), m.group(0))} tab", text)
    text = re.sub(r"master (\d)\b", lambda m: f"the master's {TAB_NAME.get(m.group(1), m.group(0))} tab", text)
    text = re.sub(r"\btab (\d) (row|R)", lambda m: f"the {TAB_NAME.get(m.group(1), m.group(0))} tab {m.group(2)}", text)
    return text

# the decomposition grids carry most of the numeric references — swept as plain text
import glob
GRIDS = glob.glob(f"{ROOT}/decomposition/section-*.md") + [f"{ROOT}/decomposition/INDEX.md"]

total = 0
for g in GRIDS:
    t = open(g, encoding="utf-8").read()
    nt = rewrite(t)
    if nt != t:
        open(g, "w", encoding="utf-8").write(nt)
        n = sum(1 for a, b in zip(t.split("\n"), nt.split("\n")) if a != b)
        print(f"{g.split('/')[-1]}: {n} line(s) rewritten to names")
        total += n

for f in FILES:
    wb = openpyxl.load_workbook(f)
    changed = 0
    for sh in wb.worksheets:
        # find founder-owned columns on this sheet (headers in rows 1-4 starting YOUR)
        yours = set()
        for hr in range(1, 5):
            for c in range(1, sh.max_column + 1):
                v = sh.cell(hr, c).value
                if isinstance(v, str) and v.strip().upper().startswith("YOUR"):
                    yours.add(c)
        for row in sh.iter_rows():
            for cell in row:
                if cell.column in yours: continue
                v = cell.value
                if isinstance(v, str) and re.search(r"master tab \d|master \d\b|\btab \d (row|R)", v):
                    nv = rewrite(v)
                    if nv != v:
                        cell.value = nv
                        changed += 1
    if changed:
        wb.save(f)
    print(f"{f.split('/')[-1]}: {changed} reference(s) rewritten to names")
    total += changed
print(f"E6 sweep complete — {total} numeric tab references replaced by names")
