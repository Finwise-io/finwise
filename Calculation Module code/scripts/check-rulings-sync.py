#!/usr/bin/env python3
"""THE FILES MUST AGREE WITH EACH OTHER — the gate behind Post Feedback Sync.

FOUNDER, 2026-09-26: "something is broken — the whole purpose of executing PFS after every change or
decision is to ensure all files are in sync and not out of sync, and this is how we wasted 6 hours,
and months."

He is right, and the proof is the same day: his rulings G6 and G7 settled how tax is treated, sat on
the master's rulings tab, and appeared in NO standard and on NO screen row — while the workplan
carried a row of MINE recommending the opposite, marked "waiting on you". Nothing anywhere noticed
that two files disagreed, so the question was asked again and the wrong words reached a mock.

PFS folded his feedback files into their originals. It never checked that a DECISION reached every
file that has to carry it. This does, and it runs in build-all:

  1. A RULING MUST BE ANCHORED. Every ruling names the rows it governs, and carries either a test
     (`proof`) or a file check (`expect`) — a claim with neither is not a ruling, it is a note.
  2. A RULE MUST BE IN A STANDARD. From 2026-09-26, every new ruling says which standard carries it
     (`standard`) or marks itself as belonging to one screen (`screen_only`). Older rows are left
     as they are — the ratchet is that new ones cannot repeat the gap.
  3. THE TRACKER MAY NOT CONTRADICT THE LEDGER. Any workplan row still open whose subject collides
     with a settled ruling is printed for review, loudly. That is exactly the shape of today's miss.
"""
import json, os, re, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
RULINGS = json.load(open(os.path.join(HERE, 'moneykeel_rulings.json')))
WORKPLAN = json.load(open(os.path.join(HERE, 'moneykeel_workplan.json')))['rows']
NEW_RULES_FROM = '2026-09-26'          # the day the gap was found; older rows are not rewritten

# the subjects a decision can be about — plain words, the way he says them
SUBJECTS = {
    'tax': ['tax', 'taxed', 'after tax', 'pre-tax'],
    'odds': ['odds', 'simulated futures', 'monte carlo', 'paths'],
    'rounding': ['decimal', 'rounding', 'precision', 'two decimals'],
    'wording': ['canon', 'retired word', 'one term', 'synonym'],
    'money shown': ["today's money", 'future dollars', 'present value', 'nominal'],
    'empty state': ['empty state', 'nothing entered', 'day one'],
    'linking': ['linked', 'link again', 'connected'],
}

def words(*fields):
    return ' '.join(str(f or '') for f in fields).lower()

def subjects_of(text):
    # whole words only — "taxonomy-v1.0.7" is a branch name, not a decision about tax
    return {s for s, keys in SUBJECTS.items()
            if any(re.search(r'(?<![a-z])' + re.escape(k) + r'(?![a-z])', text) for k in keys)}

failures, warnings, notes = [], [], []

# 1 · anchored
for r in RULINGS:
    who = f"{r.get('date')} {r.get('id')}"
    if not str(r.get('rows', '')).strip():
        failures.append(f'{who}: names no rows — a ruling that governs nothing cannot be checked')
    proof = str(r.get('proof', '')).strip().rstrip('·, ')
    has_expect = bool(r.get('expect'))
    if not proof and not has_expect:
        warnings.append(f'{who}: no test and no file check — it is a note until one exists')
    elif proof and proof.startswith('src/') and '.test.' in proof:
        first = re.split(r'[ ·,]', proof)[0]
        if not os.path.exists(os.path.join(ROOT, first)):
            failures.append(f'{who}: its proof does not exist on disk — {first}')

# 2 · a rule lives in a standard (new rows only)
for r in RULINGS:
    if str(r.get('date', '')) >= NEW_RULES_FROM:
        if not str(r.get('standard', '')).strip() and not r.get('screen_only'):
            failures.append(f"{r.get('date')} {r.get('id')}: says no standard carries it, and is not marked screen_only "
                            f"(add \"standard\": \"<file> § <section>\" or \"screen_only\": true)")

# 3 · the tracker may not contradict the ledger
settled = [r for r in RULINGS if str(r.get('status', '')).startswith(('TESTED', 'CODED', 'RULED'))]
by_subject = defaultdict(list)
for r in settled:
    for s in subjects_of(words(r.get('id'), r.get('ruling'), r.get('code'), r.get('notes'))):
        by_subject[s].append(r)
ASKING = ('founder:', 'say whether', 'his call', 'decide', 'approve')
CITES = re.compile(r'\b(G\d{1,2}|Q\d{2}|Brief [A-Z]\d?|cluster #\d+)\b')
for row in WORKPLAN:
    if row.get('status') == 'DONE':
        continue
    text = words(row.get('task'), row.get('todo'))
    # a row that ASKS him something, on a subject already settled, and does not already cite a
    # ruling — citing one means the decision was read and this is a new question, not a repeat
    if not any(a in text for a in ASKING) or CITES.search(str(row.get('task', '')) + str(row.get('todo', ''))):
        continue
    for s in sorted(subjects_of(text)):
        rs = sorted(by_subject.get(s, []), key=lambda r: str(r.get('date', '')))
        if not rs:
            continue
        latest = rs[-1]
        notes.append(f"a row still asks about {s.upper()}, citing no ruling —\n"
                     f"      row     : \"{str(row['task'])[:88]}…\"\n"
                     f"      ruled   : {latest.get('date')} {latest.get('id')} — \"{str(latest.get('ruling'))[:88]}…\"\n"
                     f"      do      : answer from the ruling, or cite it and say what is NEW about this one")

print('── the files must agree with each other (PFS gate)')
print(f'   rulings {len(RULINGS)} · workplan rows {len(WORKPLAN)}')
for w in warnings[:6]:
    print(f'   note: {w}')
if len(warnings) > 6:
    print(f'   …and {len(warnings) - 6} more without a test or file check')
seen = set()
for n in notes:
    if n in seen: continue
    seen.add(n)
    print(f'   REVIEW: {n}')
if not notes:
    print('   no open row asks about anything already ruled.')
for f in failures:
    print(f'   BROKEN: {f}')
print(f'   {len(failures)} broken · {len(warnings)} unproved · {len(seen)} to review')
sys.exit(1 if failures else 0)
