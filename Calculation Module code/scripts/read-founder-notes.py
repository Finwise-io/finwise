# Reads everything the founder wrote in the inventory: the two blue columns and any Excel comment
# he attached to any cell on any tab. Run it at the start of a session — it is the review inbox.
#
#   python3 "Calculation Module code/scripts/read-founder-notes.py"
import os, openpyxl

ROOT = "/Users/palakjain/Vibe_Coding/finwise"
OUT  = os.path.join(ROOT, "Calculation Module/calculation-inventory-v1.xlsx")
MINE = "Calculation module"          # the column help text the builder writes; not his

wb = openpyxl.load_workbook(OUT)
found = 0

for tab in wb.sheetnames:
    ws = wb[tab]
    hdr = {c: ws.cell(2, c).value for c in range(1, ws.max_column + 1)}
    lines = []

    # the two columns that are his
    cCom = next((c for c, h in hdr.items() if h == "YOUR COMMENT / QUESTION"), None)
    cVer = next((c for c, h in hdr.items() if h == "YOUR VERDICT"), None)
    for r in range(3, ws.max_row + 1):
        who = ws.cell(r, 1).value or ws.cell(r, 2).value or f"row {r}"
        com = ws.cell(r, cCom).value if cCom else None
        ver = ws.cell(r, cVer).value if cVer else None
        if com or ver:
            lines.append(f"  row {r:>4}  {str(who)[:34]:<34} "
                         f"{'[' + str(ver) + '] ' if ver else ''}{com or ''}")

    # and any comment he attached to any cell
    for row in ws.iter_rows():
        for cell in row:
            if cell.comment and cell.comment.author != MINE:
                who = ws.cell(cell.row, 1).value or ws.cell(cell.row, 2).value or f"row {cell.row}"
                lines.append(f"  row {cell.row:>4}  {str(who)[:34]:<34} "
                             f"NOTE on '{hdr.get(cell.column, '?')}': {cell.comment.text}")

    if lines:
        print(f"\n═══ {tab} ({len(lines)}) " + "═" * max(0, 60 - len(tab)))
        for l in lines: print(l)
        found += len(lines)

print(f"\n{found} note{'' if found == 1 else 's'} from the founder." if found
      else "\nNothing from the founder yet — the blue columns are empty and no cells carry comments.")
