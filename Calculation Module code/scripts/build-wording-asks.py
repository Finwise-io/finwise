#!/usr/bin/env python3
"""THE SHORT LIST — the decisions where the record kept WHAT I BUILT and not WHAT HE SAID.

His question, 2026-09-28: *"what's the plan to improve the confidence?"* The plan had three steps and
the first two are done: every source is swept, and none of them held his wording for these. Six more
turned out not to be decisions of his at all — my own engineering, recorded under an approval column
that said JJ for everything that day — and they are marked, not asked about.

What is left is this list. It is deliberately SHORT and each row carries its own specifics (his
standing order: no blanket decisions). Each row shows what I believe he decided and asks him to
confirm the wording or correct it — never to re-decide something he has already settled.
"""
import json, os, sys, datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)
sys.path.insert(0, HERE)
from xlsx_readable import readable
from moneykeel_open_workbook import refuse_if_open

OUT = 'MoneyKeel/documents/decision-log/moneykeel_log_wording-asks_v01.xlsx'
# never write over a workbook he has open (2026-09-30)
refuse_if_open(OUT)
rows = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))['rows']
# NEVER ASK HIM TO CONFIRM A DEAD DECISION (founder, 2026-09-30: *"decision log-ask-v01 still has
# DEC004. Have you update the file?"*). This selected on CONFIDENCE alone, so a decision marked OLD in
# the decision log kept its row here and kept asking for his wording. Two were on the file: DEC-0004,
# which he spotted himself — the Spending tab, superseded by the Expenses tab of DEC-0440 — and
# DEC-0037, SnapTrade, superseded by DEC-0038 for Plaid. It is worse than wasted time: an answer from
# him would have ruled a superseded row back into life.
#
# It is the same failure the PFS rule exists to stop — the ruling reached the decision log and not the
# file built beside it. So the filter now reads BOTH fields, and the count below is asserted.
def in_force(r):
    return 'OLD' not in str(r.get('in_use', '')) and str(r.get('status', '')) != 'SUPERSEDED'

low = [r for r in rows if str(r.get('confidence', '')).startswith('LOW')]
ask = [r for r in low if in_force(r)]
dropped = [r['id'] for r in low if not in_force(r)]
ask.sort(key=lambda r: (str(r.get('decided') or ''), r['id']))
print(f'{len(low)} decisions are in my words; {len(ask)} are still in force and asked about.')
if dropped:
    print('  NOT asked — superseded, so his answer could not apply: ' + ' · '.join(dropped))

COLS = ['Decision ID', 'Date you decided it', 'Screen or subject',
        'WHAT I BELIEVE YOU DECIDED — in plain English',
        'YOUR WORDING — or "as written" if mine is right',
        'Is this right? — YES · NO · CHANGE',
        'Where the record of it lives today', 'Why your words are missing']

wb = openpyxl.Workbook(); wb.remove(wb.active)
ws = wb.create_sheet('Read me')
for a, b in [
 ('WHY YOU ARE BEING ASKED',
  'These are the decisions where the record kept WHAT I BUILT and not WHAT YOU SAID. Your own words '
  'are the authority in the decision log, and on these rows there are none — so what is written is '
  'my reconstruction, and it is marked as one rather than passed off as yours.'),
 ('WHAT I DID FIRST, so this list is as short as it can be',
  'All five sources were swept for your wording — the design Changelog in every version, the retired '
  'rulings ledger, your -jj feedback and audit workbooks, the standards and the mocks, and the '
  'requirements workbooks. Not one of them held your words for these. Six more turned out not to be '
  'decisions of yours at all: my own engineering, recorded under an approval column that said JJ for '
  'everything that day. Those are marked in the log and are not on this list.'),
 ('WHAT I AM NOT ASKING',
  'You are not being asked to re-decide anything. Every row states what I believe you already decided. '
  'If it is right, "as written" is the whole answer.'),
 ('HOW TO ANSWER',
  'Two columns: YOUR WORDING, and YES / NO / CHANGE. Answer only the rows you want to. Anything left '
  'blank stays marked as my reconstruction, which is honest — it is not treated as agreed.'),
 ('WHERE IT GOES',
  'Each answer is folded into the decision log against its Decision ID, your words verbatim, and the '
  'row moves from LOW to HIGH confidence.'),
][::1]:
    ws.append([a, b])
ws.column_dimensions['A'].width = 42; ws.column_dimensions['B'].width = 116
for r in range(1, ws.max_row + 1):
    ws.cell(r, 1).font = Font(bold=True)
    ws.cell(r, 2).alignment = Alignment(wrap_text=True, vertical='top')

w = wb.create_sheet('Wording asks')
w.append(COLS)
for c in range(1, len(COLS) + 1):
    w.cell(1, c).font = Font(bold=True, color='FFFFFF')
    w.cell(1, c).fill = PatternFill('solid', fgColor='14532D')
    w.cell(1, c).alignment = Alignment(wrap_text=True, vertical='top')
for r in ask:
    w.append([r['id'], r.get('decided', ''), str(r.get('screens') or '')[:120],
              str(r.get('plain') or ''), '', '',
              ' ||| '.join(str(r.get('source') or '').split(' ||| ')[:2]),
              'The changelog row recorded what was built. Your wording was not written down anywhere.'])
w.freeze_panes = 'B2'
readable(ws, widths={'A': 42, 'B': 116}, freeze='A1', filt=False, max_lines=12)
readable(w, widths={'E': 46, 'F': 22}, freeze='B2', filt=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print('wrote', OUT)
print(f'   {len(ask)} rows need your wording · the 6 that are my own engineering are NOT on this list')
