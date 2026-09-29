#!/usr/bin/env python3
"""PRINT THE DECISION LOG — one file, every decision he has made, wherever he made it.

Founder, 2026-09-28: *"one file in decision log folder as master source for all decisions"* and
*"have similar tabs <one for each parent screen + multi-screen> as master calculation file in decision
file to make it easy to read, and track."*

ALL DECISIONS is the authoritative list. The per-screen tabs are VIEWS of the same rows, printed in the
same pass, so they cannot drift from it — the failure this whole file exists to stop is one decision
recorded in two places that disagree. Nothing is edited in the workbook: it is printed from
moneykeel_decisions.json, the same rule as the calculation master and the working plan.
"""
import json, os, sys, datetime, importlib.util as _u
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)
OUT = 'MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx'
TODAY = datetime.date.today().isoformat()

def _load(n):
    s = _u.spec_from_file_location(n, os.path.join(HERE, n + '.py'))
    m = _u.module_from_spec(s); s.loader.exec_module(m); return m
S = _load('moneykeel_decision_schema')
sys.path.insert(0, HERE)
from xlsx_readable import readable

doc = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))
rows = doc['rows']

H = Font(bold=True, color='FFFFFF')
HFILL = PatternFill('solid', fgColor='14532D')       # the dark green, edge to edge

wb = openpyxl.Workbook(); wb.remove(wb.active)

# ── Read me ──────────────────────────────────────────────────────────────────────────────────────
ws = wb.create_sheet('Read me')
ws.append(['What this file is', 'Read this first'])
about = [
 ('THE ONE PLACE EVERY DECISION IS RECORDED',
  'Founder, 2026-09-28: "Rulings in master file needs to be one place to record all decisions, no matter '
  'where they are made. All the decisions sitting in change log, standards, requirements, Audit, and mockup '
  'files - record in separate file called decisions... After mistakes over and over, I no longer trust you." '
  'This is that file. The rulings tab was removed from the calculation master the same day, so there is one '
  'record and not two.'),
 ('WHY IT EXISTS — three misses, each one earned a column',
  '(1) His 2026-09-12 correction of income-end-to-end v07 lived in the design Changelog and the mock, in no '
  'ledger and no test — so the same defect was still live one screen over sixteen days later. (2) The design '
  'Changelog itself lost ten rows between its 2026-08-12 and 2026-08-14 versions, three of them his '
  'decisions, silently. (3) The rulings ledger this replaces began in August 2026 and held 43 of the 238 '
  'decisions his own Changelog records — so "check the rulings ledger" was advice that could not be relied on.'),
 ('HOW TO READ IT',
  'ALL DECISIONS is every row. The per-screen tabs are views of those same rows — one tab per parent screen, '
  'plus multiple_screens for a decision governing more than one, the same way the calculation master files a '
  'figure shown on three screens. process-and-standards holds decisions about how we work and about the '
  'standards themselves, which govern no single screen.'),
 ('NOTHING IS EDITED HERE',
  'This workbook is PRINTED from Calculation Module code/scripts/moneykeel_decisions.json by '
  'build-decision-log.py. A hand edit dies on the next build — the same rule as the calculation master and '
  'the working plan. To change a decision, change the source and rebuild.'),
 ('THE CONFIDENCE COLUMN — read it',
  'HIGH means his own words are on the row, quoted from the source. LOW means the source recorded what I '
  'BUILT and not what he SAID, so the row is my reconstruction and needs his wording or his confirmation. '
  'Across hundreds of rows some are inferred, and he must be able to see WHICH rather than trusting them all '
  'equally. Sort ALL DECISIONS by that column to find every row still owed.'),
 ('A ROW IS NEVER DELETED',
  'A decision that is reversed or replaced is SUPERSEDED and says by what. Deleting it would lose the fact '
  'that it was once true, which is what makes an old build readable.'),
 ('', ''),
 ('THE COLUMNS, and the failure each one answers', ''),
]
for a, b in about:
    ws.append([a, b])
for key, head, why in S.COLUMNS:
    ws.append([head, why])
ws.column_dimensions['A'].width = 46
ws.column_dimensions['B'].width = 118
for r in range(2, ws.max_row + 1):
    ws.cell(r, 1).font = Font(bold=True)
    ws.cell(r, 2).alignment = Alignment(wrap_text=True, vertical='top')

def order(r):
    return (str(r.get('decided') or '9999'), str(r.get('id')))

def sheet(name, these, note=''):
    w = wb.create_sheet(name)
    if note:
        w.append([note]); w.append([])
    w.append(S.HEADINGS)
    hrow = w.max_row
    for c in range(1, len(S.HEADINGS) + 1):
        w.cell(hrow, c).font = H; w.cell(hrow, c).fill = HFILL
        w.cell(hrow, c).alignment = Alignment(wrap_text=True, vertical='top')
    for r in sorted(these, key=order):
        w.append([str(r.get(k) or '') for k in S.KEYS])
    w.freeze_panes = w.cell(hrow + 1, 2).coordinate
    return w

sheet('ALL DECISIONS', rows,
      'EVERY decision, oldest first. This is the authoritative list; the per-screen tabs below are views of these same rows.')
for tab in S.PARENT_TABS + ['process-and-standards']:
    these = [r for r in rows if r.get('tab') == tab]
    sheet(tab, these, S.TAB_ABOUT.get(tab, '') + f'   ·   {len(these)} decision(s)')

# every tab through the one formatter — measured widths, real row heights, frozen header, a filter
for w in wb.worksheets:
    if w.title == 'Read me':
        readable(w, widths={'A': 46, 'B': 118}, freeze='A2', filt=False, max_lines=14)
    else:
        readable(w, freeze=w.freeze_panes, filt=True)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print('wrote', OUT)
print(f'   {len(rows)} decisions · {len(wb.worksheets)} tabs')
for tab in S.PARENT_TABS + ['process-and-standards']:
    print(f'   {tab:24s} {len([r for r in rows if r.get("tab") == tab]):4d}')
low = [r for r in rows if str(r.get('confidence', '')).startswith('LOW')]
print(f'   rows needing his wording or confirmation (confidence LOW): {len(low)}')
