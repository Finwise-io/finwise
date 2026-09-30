#!/usr/bin/env python3
"""WHAT HE MUST ANSWER FOR NET WORTH, CASH FLOW AND PERFORMANCE TO BE LAUNCH-READY.

Founder, 2026-09-29: *"Give me a list of files, tabs, and rows I need to answer for NW, CF,
Performance sections of the app to be complete. By complete I mean - ready for launch."*

EVERY ROW NAMES ITS FILE, ITS TAB AND ITS ROW, because that is what he asked for and because a list
that says "answer the open questions" is not a list. Nothing here is a summary: each line is one
thing to answer, where to answer it, and what it blocks.

IT IS READ FROM THE LIVE FILES, never from a memory of them — the master file on disk, the decision
log, and the working plan. A stale checklist once sent him on a wild-goose chase; this one is rebuilt
every time it runs.
"""
import json, os, sys, datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)
sys.path.insert(0, HERE)
from xlsx_readable import readable

MASTER = 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-master_v01.xlsx'
OUT = 'MoneyKeel/documents/other/moneykeel_calc_plan_launch-answer-list_v01.xlsx'
MODULES = {'networth': 'Net worth', 'performance': 'Performance', 'cashflow': 'Cash flow'}

dec = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))['rows']
plan = json.load(open(os.path.join(HERE, 'moneykeel_workplan.json')))['rows']
wb_m = openpyxl.load_workbook(MASTER, read_only=True)

COLS = ['#', 'Module', 'WHAT TO ANSWER', 'WHERE — file', 'WHERE — tab', 'WHERE — row',
        'Which column to type in', 'What it blocks if you do not', 'YOUR ANSWER']
items = []

def add(module, what, f, tab, row, col, blocks):
    items.append([len(items) + 1, module, what, f, tab, row, col, blocks, ''])

# ── 1 · the master file's unanswered questions, one row each ────────────────────────────────────
for tab, name in MODULES.items():
    ws = wb_m[tab]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(c) for c in rows[0]]
    iq = hdr.index('Questions for you (numbered)')
    ia = hdr.index('YOUR ANSWER — use the same number')
    im = hdr.index('Metric ID')
    ins = hdr.index('Name on Screen')
    for r in rows[1:]:
        if not r or not r[im]:
            continue
        q = str(r[iq] or '').strip()
        a = str(r[ia] or '').strip() if ia < len(r) else ''
        if q and not a:
            add(name, q[:600], os.path.basename(MASTER), tab,
                f'{r[im]} — {str(r[ins] or "")[:60]}',
                'YOUR ANSWER — use the same number',
                'The figure stays DRAFT: it is declared and printed, and nothing moves behind its door until you rule.')

# ── 2 · every row of these modules still needs his VERIFIED mark ────────────────────────────────
for tab, name in MODULES.items():
    ws = wb_m[tab]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(c) for c in rows[0]]
    iv = hdr.index('ROW VERIFIED — founder, date and how')
    im = hdr.index('Metric ID')
    n = sum(1 for r in rows[1:] if r and r[im] and not str(r[iv] if iv < len(r) else '' or '').startswith('VERIFIED'))
    if n:
        add(name, f'VERIFY {n} rows — read each row and mark it VERIFIED, or say what is wrong. '
                  'Only your mark makes a row VERIFIED; my tests can say a figure is what the code gives, '
                  'never that it is the figure you wanted.',
            os.path.basename(MASTER), tab, f'all {n} unverified rows on this tab',
            'ROW VERIFIED — founder, date and how',
            'The module cannot be called launch-ready: a TESTED row is proved to match the code, not proved to be right.')

# ── 3 · the decisions whose wording is mine, per module ─────────────────────────────────────────
for tab, name in MODULES.items():
    low = [r for r in dec if r.get('tab') == tab and str(r.get('confidence', '')).startswith('LOW')]
    if low:
        add(name, f'{len(low)} decisions on this module are recorded in MY words, not yours — confirm or correct: '
                  + ', '.join(r['id'] for r in low),
            'moneykeel_log_wording-asks_v01.xlsx', 'Wording asks',
            ', '.join(r['id'] for r in low),
            'YOUR WORDING / YES · NO · CHANGE',
            'The decision stays marked as my reconstruction, so anything built on it rests on my reading of what you meant.')

# ── 4 · the questions HE asked that were never answered ─────────────────────────────────────────
for tab, name in MODULES.items():
    qs = [r for r in dec if r.get('tab') == tab and str(r.get('plain', '')).startswith(('HIS QUESTION', 'A QUESTION'))]
    for r in qs:
        add(name, 'A QUESTION YOU ASKED AND NOBODY ANSWERED: ' + str(r.get('his_words') or '')[:400],
            'moneykeel_log_decisions_v01.xlsx', tab, r['id'],
            'Open question on this decision — for him',
            'It is not a decision until it is answered, so nothing can be built or tested against it.')

# ── 5 · the working plan's rows already waiting on him, for these modules ───────────────────────
for r in plan:
    if not str(r.get('status', '')).startswith('WAITING'):
        continue
    t = (str(r.get('task')) + ' ' + str(r.get('ref') or '')).lower()
    for key, name in [('net worth', 'Net worth'), ('networth', 'Net worth'),
                      ('performance', 'Performance'), ('cash flow', 'Cash flow'), ('cashflow', 'Cash flow')]:
        if key in t:
            add(name, str(r.get('task'))[:400], 'moneykeel_calc_plan_workplan_v01.xlsx', 'Workplan',
                str(r.get('task'))[:70], 'Status / Comments',
                str(r.get('todo'))[:300])
            break

wb = openpyxl.Workbook(); wb.remove(wb.active)
ws = wb.create_sheet('Read me')
for a, b in [
 ('WHAT THIS IS',
  'Everything you have to answer for Net worth, Cash flow and Performance to be launch-ready — by file, '
  'tab and row, which is what you asked for. Every line is ONE thing to answer and says what it blocks.'),
 ('WHAT "LAUNCH-READY" MEANS HERE, and it is your definition not mine',
  'A figure is not finished because it is coded and tested. Your ladder is RULED → CODED → TESTED → '
  'VERIFIED, and only your mark makes a row VERIFIED. A test can prove a figure is what the code gives; '
  'it can never prove it is the figure you wanted. So every row of these three modules needs reading.'),
 ('THE ORDER I WOULD TAKE IT IN',
  '1. The unanswered questions — they block figures from moving behind their doors. '
  '2. The questions you asked that nobody answered — they are not decisions yet. '
  '3. The decisions recorded in my words — quickest to clear, "as written" is a complete answer. '
  '4. The VERIFIED marks — the longest, and the one nobody can do for you.'),
 ('WHAT IS NOT ON THIS LIST',
  'Anything I can do myself. I have not put "write the remaining tests" or "fix the classifier" here — '
  'those are mine. This is only what needs you.'),
 ('IT IS REBUILT, NEVER EDITED',
  'Generated by build-launch-answer-list.py from the master file, the decision log and the working plan '
  'as they are on disk. Re-run it and it is current; a stale checklist once sent you on a wild-goose chase.'),
]:
    ws.append([a, b])
ws.column_dimensions['A'].width = 40; ws.column_dimensions['B'].width = 118
for r in range(1, ws.max_row + 1):
    ws.cell(r, 1).font = Font(bold=True)
    ws.cell(r, 2).alignment = Alignment(wrap_text=True, vertical='top')

for module in ['ALL', 'Net worth', 'Cash flow', 'Performance']:
    rows = items if module == 'ALL' else [i for i in items if i[1] == module]
    w = wb.create_sheet(module if module != 'ALL' else 'EVERYTHING')
    w.append([f'{len(rows)} things to answer' + ('' if module == 'ALL' else f' for {module}')])
    w.append([])
    w.append(COLS)
    for c in range(1, len(COLS) + 1):
        w.cell(3, c).font = Font(bold=True, color='FFFFFF')
        w.cell(3, c).fill = PatternFill('solid', fgColor='14532D')
        w.cell(3, c).alignment = Alignment(wrap_text=True, vertical='top')
    for i in rows:
        w.append(i)
    w.freeze_panes = 'C4'
    readable(w, widths={'C': 62, 'I': 40}, freeze='C4', filt=True)
readable(ws, widths={'A': 40, 'B': 118}, freeze='A1', filt=False, max_lines=10)

wb.save(OUT)
print('wrote', OUT)
from collections import Counter
c = Counter(i[1] for i in items)
print(f'   {len(items)} things need you · ' + ' · '.join(f'{v} {k}' for k, v in c.most_common()))
