#!/usr/bin/env python3
"""EVERY ANSWER OF HIS REACHES THE FILE, AND NO ANSWERED QUESTION IS ASKED AGAIN.

Founder, 2026-09-30:
    *"why is Q53 still unanswered in file - what ever guard you have created million time is still
    not working."*

He was right, and it was worse than a guard failing. There was NO HOME for an answered numbered
question: the questions column existed and nothing ever wrote the answers column. So Q51, Q52 and
Q53 were ruled by him, built, tested — and still printed as OPEN on his own launch answer list,
which asked him the same thing again.

This is the gate that would have caught it. Two things, both counted:

  1. Every answer recorded in moneykeel_question_answers.json REACHES the master file, on every row
     that carries its question.
  2. No question with an answer on record is still listed as open on his launch answer list.

It states how many questions and rows it read, so it cannot pass by looking at nothing.

    python3 "Calculation Module code/scripts/check-questions-answered.py"
"""
import json, os, re, sys
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)

MASTER  = 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-master_v01.xlsx'
ANSWERS = 'MoneyKeel/documents/other/moneykeel_calc_plan_launch-answer-list_v01.xlsx'
TABS = ['multiple_screens', 'home', 'networth', 'performance', 'plan', 'cashflow', 'menu']

recorded = json.load(open(os.path.join(HERE, 'moneykeel_question_answers.json')))['rows']
if not recorded:
    print('no answers on record yet — nothing to check.')
    sys.exit(0)

wb = openpyxl.load_workbook(MASTER, read_only=True, data_only=True)
missing, rows_read, carried = [], 0, {q: 0 for q in recorded}

for tab in TABS:
    ws = wb[tab]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(c) for c in rows[0]]
    iq, ia, im = (hdr.index('Questions for you (numbered)'),
                  hdr.index('YOUR ANSWER — use the same number'), hdr.index('Metric ID'))
    for r in rows[1:]:
        if not r or not r[im]:
            continue
        rows_read += 1
        q = str(r[iq] or '')
        a = str((r[ia] if ia < len(r) else '') or '')
        for qn in recorded:
            if re.search(r'\b' + qn + r'\b', q):
                carried[qn] += 1
                if qn not in a:
                    missing.append(f'{tab} · {r[im]} · {qn} is on the row and HIS ANSWER IS NOT')

# and nothing he has answered may still be listed as something he must answer
still_asked = []
if os.path.exists(ANSWERS):
    wa = openpyxl.load_workbook(ANSWERS, read_only=True, data_only=True)
    for sh in wa.sheetnames:
        for row in wa[sh].iter_rows(values_only=True):
            text = ' '.join(str(c) for c in (row or ()) if c)
            for qn in recorded:
                if re.search(r'\b' + qn + r'\b', text) and 'ANSWERED' not in text:
                    still_asked.append(f'{sh}: {qn} is still on his list to answer — "{text[:90]}"')

print('questions answered and on record : %d (%s)' % (len(recorded), ' '.join(sorted(recorded))))
print('rows read on the master          : %d across %d tabs' % (rows_read, len(TABS)))
print('rows carrying each question      : ' + ' '.join(f'{q}×{n}' for q, n in sorted(carried.items())))

# A GUARD MUST PROVE IT LOOKED: without these it passes on an empty workbook.
if rows_read < 150:
    print('\nBUILD STOPPED — only %d rows read. The master did not open properly; this guard proves nothing.' % rows_read)
    sys.exit(1)
for q, n in carried.items():
    if n == 0:
        print('\nBUILD STOPPED — %s has an answer on record but appears on NO row of the master. '
              'Either the question was renumbered or the answer names a question that does not exist.' % q)
        sys.exit(1)

if not missing and not still_asked:
    print('\nevery answer of his reaches the file, and none is still being asked.')
    sys.exit(0)

print('\nBUILD STOPPED — %d answer(s) never reached the file, %d still being asked.\n'
      % (len(missing), len(still_asked)))
for m in missing + still_asked:
    print('   ' + m)
print('\nRun build-moneykeel-master.py and build-launch-answer-list.py, in that order.')
sys.exit(1)
