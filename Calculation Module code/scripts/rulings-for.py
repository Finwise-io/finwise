#!/usr/bin/env python3
"""What has he already decided about X?

WHY THIS EXISTS (2026-09-26). The founder asked "how did you miss my earlier rulings" — G6 and G7,
which settle how tax is treated, were on the master's rulings tab the whole time. They were in no
standard, on no screen row, and the workplan carried a row of mine saying the opposite. So the two
places a screen task actually reads at step 0 said nothing, or said the wrong thing.

IT READS THE DECISION LOG (2026-10-07). It used to read only the old rulings ledger, which the decision
log replaced on 2026-09-28 as the one master (DEC-0011). So a rule he approved after that — every rule
of the outside review of Net worth — could not be found by the one command meant to find it. His
question that day: "if you read these decisions 2 weeks from now - will you be able to tell me what was
the actual decision, what was the rule?" The answer was no, for two reasons: this read the wrong file,
and a whole batch of rules sat in one row under his one-line approval. Each rule is now its own row
(the batch row split in moneykeel_decisions_splits.json), and this reads them.

One command, before writing any copy or any mock that touches a ruled subject:

    python3 "Calculation Module code/scripts/rulings-for.py" tax
    python3 "Calculation Module code/scripts/rulings-for.py" matured bond

Every word given must appear in the decision (its rule, his words, what it governs). It prints the
rule first, then his words, then what it governs — decisions in force only, unless --all.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, 'moneykeel_decisions.json')
FIELDS = ('id', 'plain', 'his_words', 'means', 'governs', 'raw')


def main(args):
    show_all = '--all' in args
    topics = [a for a in args if a != '--all']
    if not topics:
        print(__doc__); return 1
    rows = json.load(open(LOG))['rows']
    if not show_all:
        rows = [r for r in rows if str(r.get('in_use') or 'IN USE').startswith('IN USE')]
    pats = [re.compile(re.escape(t), re.I) for t in topics]
    hits = [r for r in rows if all(p.search(' '.join(str(r.get(k, '')) for k in FIELDS)) for p in pats)]
    if not hits:
        print(f'No decision in force mentions {" and ".join(topics)}. That is not proof there is none — '
              f'try fewer or plainer words, or --all for decisions no longer in force.')
        return 0
    print(f'{len(hits)} decision(s) mention {" and ".join(topics)}:\n')
    for r in sorted(hits, key=lambda x: str(x.get('decided', ''))):
        print(f"── {r.get('decided')} · {r.get('id')}  [{r.get('status')}] {'' if str(r.get('in_use','')).startswith('IN USE') else '· ' + str(r.get('in_use'))}")
        print(f"   THE RULE : {str(r.get('plain', '')).strip()[:400]}")
        print(f"   HIS WORDS: {str(r.get('his_words', '')).strip()[:200]}")
        if r.get('governs'):
            print(f"   GOVERNS  : {str(r['governs']).strip()[:200]}")
        print()
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
