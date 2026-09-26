#!/usr/bin/env python3
"""What has he already decided about X?

WHY THIS EXISTS (2026-09-26). The founder asked "how did you miss my earlier rulings" — G6 and G7,
which settle how tax is treated, were on the master's rulings tab the whole time. They were in no
standard, on no screen row, and the workplan carried a row of mine saying the opposite. So the two
places a screen task actually reads at step 0 said nothing, or said the wrong thing.

One command, before writing any copy or any mock that touches a ruled subject:

    python3 "Calculation Module code/scripts/rulings-for.py" tax
    python3 "Calculation Module code/scripts/rulings-for.py" odds rounding

It prints every ruling whose id, words, code or notes mention the topic — his words first.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LEDGER = os.path.join(HERE, 'moneykeel_rulings.json')

def main(topics):
    if not topics:
        print(__doc__); return 1
    rows = json.load(open(LEDGER))
    pats = [re.compile(re.escape(t), re.I) for t in topics]
    hits = [r for r in rows if any(p.search(' '.join(str(r.get(k, '')) for k in ('id', 'ruling', 'code', 'rows', 'notes'))) for p in pats)]
    if not hits:
        print(f'No ruling mentions {" or ".join(topics)}. That is not proof there is none — try a plainer word.')
        return 0
    print(f'{len(hits)} ruling(s) mention {" or ".join(topics)}:\n')
    for r in sorted(hits, key=lambda x: str(x.get('date', ''))):
        print(f"── {r.get('date')} · {r.get('id')}  [{r.get('status')}]")
        print(f"   HIS WORDS: {str(r.get('ruling', '')).strip()[:300]}")
        if r.get('code'): print(f"   IN THE CODE: {str(r['code']).strip()[:220]}")
        if r.get('rows'): print(f"   ROWS: {str(r['rows']).strip()[:160]}")
        print()
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
