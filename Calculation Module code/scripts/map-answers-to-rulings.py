"""HIS ANSWERS ON THE MAP BECOME RULINGS — so the gates carry them to every other file.

The founder, 2026-09-27: *"since these are recorded in standards - how will PFS ensure that it flows
through all files?"*

He was right that nothing did. His answers to the orchestrator map lived in one column of one
spreadsheet. The B4 gate reads `moneykeel_rulings.json`, not a spreadsheet column, so a decision made
on the Map reached nothing else: not the master, not the working plan, not a test. The same shape as
the "sweep cash" miss — a decision recorded where no gate looks.

This script reads the Map's YOUR ANSWER column and writes one ruling per answered question. After it,
B4 governs those answers like every other ruling: it fails if one governs nothing, if its proof does
not exist, or if an open working-plan row still asks about a subject he has already settled.

Run: python3 "Calculation Module code/scripts/map-answers-to-rulings.py"   (build-all runs it at A2)
"""
import json, os, sys
import openpyxl

SC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SC, '..', '..'))
MAP = os.path.join(ROOT, 'MoneyKeel/documents/standards/moneykeel_calc_spec_orchestrator-map_v01.xlsx')
RUL = os.path.join(SC, 'moneykeel_rulings.json')
STD = 'MoneyKeel/documents/standards/moneykeel_calc_spec_one-door-per-question_v01.md'

if not os.path.exists(MAP):
    print('orchestrator map not built yet — nothing to read'); sys.exit(0)

ws = openpyxl.load_workbook(MAP, read_only=True, data_only=True)['Map']
head = {ws.cell(1, c).value: c for c in range(1, ws.max_column + 1)}
rulings = json.load(open(RUL))
by_id = {r['id']: r for r in rulings}

written = 0
for r in range(2, ws.max_row + 1):
    qid = ws.cell(r, head['Question ID']).value
    ans = str(ws.cell(r, head['YOUR ANSWER']).value or '').strip()
    if not qid or not ans:
        continue
    rid = f'{qid} — one question, one function'
    row = by_id.get(rid, {})
    # his words are never rewritten; everything else is printed from the map
    row.update({
        'id': rid,
        'date': '2026-09-27',
        'source': f'orchestrator map, Map tab, {qid}, column YOUR ANSWER',
        'ruling': ans,
        'rows': str(ws.cell(r, head['Figures it hands out (rows on the master)']).value or '').replace('\n', ' · '),
        'status': row.get('status') or 'RULED',
        'code': row.get('code', ''),
        # the proof is the orchestrator's own test, once it is built; until then the ruling is RULED,
        # never TESTED, and B4 says so
        'proof': row.get('proof', ''),
        'coded': row.get('coded', ''),
        'verified': row.get('verified', ''),
        'notes': f"The question he answered: {ws.cell(r, head['The question (one orchestrator)']).value}",
        'standard': STD,
    })
    if rid not in by_id:
        rulings.append(row)
    written += 1

json.dump(rulings, open(RUL, 'w'), indent=1, ensure_ascii=False)
print(f'map answers → rulings: {written} answered question(s) now carried by the rulings ledger')
