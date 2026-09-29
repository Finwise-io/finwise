#!/usr/bin/env python3
"""build-workplan.py — THE WORKING PLAN, generated.

The founder's standing order of 2026-09-12 makes moneykeel_calc_plan_workplan_v01.xlsx the tracker:
one tab, five columns, one row per task, by the date it was added, and a row is never deleted.

On 2026-09-14 eighteen rows vanished from it. The file carried a Microsoft Excel quarantine stamp, so
it had been opened in Excel and saved from a copy made before those rows were added, and it is not in
git. A hand-maintained workbook two people write to loses whichever write lands second.

So the rows live in moneykeel_workplan.json and the workbook is PRINTED from it — the same rule the
master file follows. The founder's own columns are his: before writing, this reads Status and Comments
back out of the existing workbook by row key and carries them forward, so editing them in Excel still
works. Claude adds rows in the source file, never in Excel.
"""
import json, os, re, hashlib, sys
import openpyxl
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsx_readable import readable   # one way to format a workbook (founder, 2026-09-27)
from openpyxl.styles import Font, Alignment, PatternFill

SC = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(SC, '..', '..'))
SRC = os.path.join(SC, 'moneykeel_workplan.json')
OUT = os.path.join(ROOT, 'MoneyKeel/documents/other/moneykeel_calc_plan_workplan_v01.xlsx')
d = json.load(open(SRC))
COLS = d['columns']
rowkey = lambda t: hashlib.sha1(re.sub(r'\W+', '', str(t).lower())[:70].encode()).hexdigest()[:10]

# his columns win — read them back before writing
his = {}
if os.path.exists(OUT):
    ws = openpyxl.load_workbook(OUT, read_only=True)['Workplan']
    head = [c.value for c in next(ws.iter_rows(max_row=1))]
    iS = head.index('Status') if 'Status' in head else 2
    iC = head.index('Comments') if 'Comments' in head else 5
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r and r[0]: his[rowkey(r[0])] = (r[iS], r[iC] if len(r) > iC else None)
# His edit is a value in the workbook that differs from what this builder last WROTE there. Comparing
# with the source instead would let a stale workbook undo every status Claude changes (found by the Post
# Feedback Sync of 2026-09-14: a row closed in the source kept reading TO DO from the Excel copy).
kept = 0
for x in d['rows']:
    k = x.get('key') or rowkey(x['task'])
    w = x.get('_written') or {'status': x['status'], 'comments': x.get('comments', '')}
    if k in his:
        s, c = his[k]
        if s and str(s).strip() != str(w.get('status') or '').strip(): x['status'] = s; kept += 1
        if c and str(c).strip() != str(w.get('comments') or '').strip(): x['comments'] = c; kept += 1

wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Workplan'
ws.append(COLS)
HEAD = Font(bold=True, color='FFFFFF'); FILL = PatternFill('solid', fgColor='1F4E78'); WRAP = Alignment(wrap_text=True, vertical='top')
for c in ws[1]: c.font = HEAD; c.fill = FILL; c.alignment = WRAP
COLOUR = {'DONE': 'E2EFDA', 'WAITING ON YOU': 'FFF2CC', 'TO DO': 'FCE4D6'}
for x in sorted(d['rows'], key=lambda y: y['date']):
    ws.append([x['task'], x['todo'], x['status'], x['ref'], x['date'], x.get('comments', '')])
    r = ws.max_row
    for c in range(1, len(COLS) + 1): ws.cell(r, c).alignment = WRAP
    fill = COLOUR.get(str(x['status']).strip())
    if fill: ws.cell(r, 3).fill = PatternFill('solid', fgColor=fill)
# READABLE (founder, 2026-09-27). The task and what-to-do columns were 70 characters each — 140
# before the status, so the one column that says who a row waits on was off the side of the screen.
# Widths are measured now; STATUS and DATE are pinned because a narrow column of one word reads best
# when it is exactly as wide as its longest word.
readable(ws, widths={'A': 46, 'B': 52, 'C': 22, 'D': 40, 'E': 12, 'F': 40})
wb.save(OUT)
for x in d['rows']: x['_written'] = {'status': x['status'], 'comments': x.get('comments', '')}
json.dump(d, open(SRC, 'w'), ensure_ascii=False, indent=1)
n = len(d['rows'])
print(f'workplan: {n} rows written ({sum(1 for x in d["rows"] if x["status"] == "WAITING ON YOU")} waiting on the founder, '
      f'{sum(1 for x in d["rows"] if x["status"] == "TO DO")} to do, {sum(1 for x in d["rows"] if x["status"] == "DONE")} done) '
      f'· {kept} founder edit(s) carried forward → {os.path.relpath(OUT, ROOT)}')
