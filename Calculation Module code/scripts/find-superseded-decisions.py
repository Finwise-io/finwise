#!/usr/bin/env python3
"""WHICH DECISION REPLACED WHICH — found by pairing decisions on the same subject.

He caught DEC-0004 on the answer list: it describes a "Spending tab" with a month header and a
categories-vs-plan card, and his approved mock has no Spending tab at all. It was marked IN USE.

TWO THINGS I TRIED FIRST AND THREW AWAY, both recorded because both were wrong in an instructive way:

  1. A HAND-TYPED MAP of eleven superseded pairs. It covered what I happened to notice, which is the
     same fault as every hand-typed list in this repo.

  2. VOCABULARY OVERLAP against the approved mocks — how much of a decision's own wording still
     appears in the screen he approved. It produced nonsense in both directions. DEC-0071 ("add both.
     Bar replaces donut") scored 27% BECAUSE it removed the donut: doing what it says makes its own
     words disappear from the screen. And DEC-0570 scored low because it is about Home while being
     filed under performance. A low score meant "I compared it to the wrong screen" or "this was
     implemented", almost never "this is dead".

WHAT ACTUALLY FINDS IT: two decisions about the SAME SUBJECT, where the later one changes what the
earlier one said. Donut → bar. Spending tab → Expenses tab. 62-to-70 → 60-to-70. The subject is the
link; the date decides which one stands.

It PAIRS and prints. It does not mark: a pair can be two decisions that stand together — one refining
the other rather than replacing it — and only reading tells you which. Marking by a rule is the
overreach that put the hide-balances answer on a row about creating a folder.
"""
import json, os, re, sys
from itertools import combinations

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)

STOP = set('''the a an and or of to in on at for with from by is are was were be been it its this that these those
one two three four five six seven eight nine ten his her their your you we our us they them he she i
not no never always all any each every both either neither more most less least than then so such as
if when where which who whom whose what why how but also only just even still yet already about
decision decisions rule ruling approved approval says said say name named wording words word
app screen screens page pages figure figures number numbers thing things place places same
per into out off over under above below before after during while until since again
has have had do does did can could will would should may might must made make makes
plain english his founder person people user users something anything nothing
built build building change changed changes now new old first second third
instruction finding question answer answered'''.split())

SUBJECT = re.compile(r"[A-Za-z][A-Za-z'/-]{4,}")


def subject_of(row):
    """the distinctive nouns a decision is ABOUT — from his own words first, then the plain sentence"""
    t = str(row.get('his_words') or '') + ' ' + str(row.get('plain') or '')[:260]
    return {w for w in (x.lower() for x in SUBJECT.findall(t)) if w not in STOP}


doc = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))
rows = [r for r in doc['rows'] if r.get('decided') and not str(r.get('in_use', '')).startswith('OLD')]
subj = {r['id']: subject_of(r) for r in rows}

pairs = []
for a, b in combinations(rows, 2):
    if a.get('tab') != b.get('tab'):
        continue
    sa, sb = subj[a['id']], subj[b['id']]
    if len(sa) < 4 or len(sb) < 4:
        continue
    shared = sa & sb
    # the overlap has to be a real subject, not two rows that both mention "account"
    j = len(shared) / len(sa | sb)
    if j < 0.30 or len(shared) < 4:
        continue
    older, newer = (a, b) if str(a['decided']) <= str(b['decided']) else (b, a)
    if str(older['decided']) == str(newer['decided']):
        continue                       # same day is a pair of rulings, not a replacement
    pairs.append({
        'older': older['id'], 'older_date': str(older['decided']),
        'newer': newer['id'], 'newer_date': str(newer['decided']),
        'tab': a.get('tab'), 'overlap': round(j, 2), 'shared': sorted(shared)[:10],
        'older_plain': str(older.get('plain') or '')[:190],
        'newer_plain': str(newer.get('plain') or '')[:190],
    })

pairs.sort(key=lambda p: -p['overlap'])
print('%d pairs of decisions share a subject and were made on different days.\n' % len(pairs))
print('STRONGEST SUBJECT MATCH FIRST. Each needs READING: a later decision on the same subject may')
print('REPLACE the earlier one, or may refine it and leave it standing. Only reading tells you which.\n')
for p in pairs[:24]:
    print('  %.0f%%  [%s]  %s (%s)  ->  %s (%s)' % (p['overlap'] * 100, p['tab'], p['older'], p['older_date'], p['newer'], p['newer_date']))
    print('        shared: ' + ', '.join(p['shared'][:8]))
    print('        OLDER: ' + p['older_plain'][:150].replace('\n', ' '))
    print('        NEWER: ' + p['newer_plain'][:150].replace('\n', ' '))
    print()
json.dump(pairs, open(os.path.join(HERE, 'moneykeel_superseded_pairs.json'), 'w'), indent=1, ensure_ascii=False)
print('wrote all %d pairs to moneykeel_superseded_pairs.json' % len(pairs))
