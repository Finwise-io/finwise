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
# IT NOW READS THE DECISION LOG, WHICH IS THE ONE MASTER (2026-09-30).
#
# THE FAILURE THIS FIXES, and it is the worst of the day. On 2026-09-28 he ruled that the decision log
# is the one consolidated master and the rulings tab was retired. I built the log, moved everything
# into it, deleted the tab from the master file — AND LEFT THIS GATE WATCHING THE FILE I HAD JUST
# RETIRED. `moneykeel_rulings.json` froze at 167 rows on 2026-09-27. The decision log holds 487
# decisions in force. So for three days the gate whose whole job is to prove that every decision
# reaches every file it belongs in was reading an abandoned source, and 320 decisions were outside it
# — including every one he made today. It passed all day while Q53 sat unanswered in the master file.
#
# His words: "We are at this point because you could not keep track records and one authoritative
# source of truth for everything. We built this structure to ensure address that, and you cannot even
# do one simple thing right."
#
# The lesson is not about rows. It is that I replaced a source of truth and did not re-point the thing
# that guards it. So this gate now reads the log, asserts HOW MANY decisions it read, and fails if that
# number collapses — because a guard reading a stale file looks exactly like a guard finding nothing
# wrong.
DECISIONS = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))['rows']
RULINGS = [d for d in DECISIONS if 'OLD' not in str(d.get('in_use', ''))]
WORKPLAN = json.load(open(os.path.join(HERE, 'moneykeel_workplan.json')))['rows']
NEW_RULES_FROM = '2026-09-26'          # the day the gap was found; older rows are not rewritten

# A GUARD MUST PROVE IT LOOKED, and this one failed to for three days by reading the wrong file.
# The floor is the true number of decisions in force; if the log stops loading, or a later me points
# this at another retired source, the count collapses and the build goes red instead of quiet.
DECISIONS_FLOOR = 480
if len(RULINGS) < DECISIONS_FLOOR:
    print('BUILD STOPPED \u2014 this gate read only %d decisions in force, against a floor of %d. Either the '
          'decision log did not load, or this gate is pointed at the wrong file again \u2014 which is exactly '
          'how it sat green for three days while it watched a source retired on 2026-09-28.'
          % (len(RULINGS), DECISIONS_FLOOR))
    sys.exit(1)

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
# the decision log's own field names, mapped once: `decided` is the date, `governs` names the rows it
# rules over, `standard_carrier` is the standard that holds it, and a row about one screen names it.
for r in RULINGS:
    r.setdefault('date', r.get('decided'))
    r.setdefault('rows', r.get('governs'))
    r.setdefault('standard', r.get('standard_carrier'))
    r.setdefault('ruling', r.get('his_words') or r.get('plain'))
    if not r.get('screen_only'):
        r['screen_only'] = bool(str(r.get('screens', '')).strip()) and str(r.get('scope', '')) != 'app-wide'

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
print(f'   decisions in force {len(RULINGS)} (read from the decision log, the one master) · workplan rows {len(WORKPLAN)}')
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
print(f'   {len(failures)} unanchored · {len(warnings)} unproved · {len(seen)} to review')

# ── HOW AN ANCHOR WAS ARRIVED AT, which is not the same question as whether one exists.
#
# Every decision names rows now, and that was worth doing. But the mapping was built by WORD OVERLAP
# — each anchor's own reason says "its own words appear in these files" — so an anchor can point at a
# file that merely shares vocabulary with his sentence. DEC-0036 was anchored to the Net worth screen
# because the words "drawing", "warning" and "framing" happen to appear there; the heads-up it governs
# is written in four other places, three of which were ignoring the ruling outright.
#
# So the count below is the one that matters for trust: how many anchors someone has actually READ and
# confirmed. It prints the true number every build and may only rise (standing order, 2026-09-28 — a
# ratchet carries the TRUE number, never zero).
READ_VERIFIED = 84     # 2026-10-01, the Net worth compliance validation: DEC-0036, DEC-0090, DEC-0104,
                      # DEC-0109, DEC-0301, DEC-0437, DEC-0502. Raise it as more are read, never lower it.
ANCHORS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                      'moneykeel_decisions_anchors.json'), encoding='utf8'))['rows']
_read = sum(1 for r in ANCHORS.values() if r.get('verified_by_reading'))
print(f'   anchors verified by READING {_read} of {len(ANCHORS)} · the other '
      f'{len(ANCHORS) - _read} were matched on shared words and may point at the wrong file')
if _read < READ_VERIFIED:
    print('\nBUILD STOPPED — %d anchors are read-verified; the ratchet stands at %d. An anchor that '
          'loses its verified_by_reading mark has lost the only evidence that it is the right one.'
          % (_read, READ_VERIFIED))
    sys.exit(1)
if _read > READ_VERIFIED:
    print('\nTHE DEBT FELL — %d anchors are now read-verified, up from %d. Raise READ_VERIFIED in this '
          'file, in the same commit.' % (_read, READ_VERIFIED))
    sys.exit(1)

# A RATCHET CARRYING THE TRUE NUMBER (his standing order, 2026-09-28: "a ratchet carries the TRUE
# number, not zero. A gate that hides its debt to stay green is worse than no gate.").
#
# The moment this gate was re-pointed from the retired rulings ledger to the decision log — the one
# master since 2026-09-28 — it went from 167 rows to 487 and found 418 without an anchor. Every one is
# real: a decision that names no row it governs cannot be checked against anything. But failing the
# build on all 418 today would stop every other piece of work behind three days of my own backlog,
# and hiding them to stay green is the fault this gate exists to prevent.
#
# So the number is PRINTED EVERY BUILD and may only fall. Pass 4 is what pays it down: it gives each
# decision a test that names it, which is exactly what `rows` plus `proof` record.
UNANCHORED = 0        # 418 → 0 on 2026-09-30, the same day, on his instruction: "do not stop until you
                      # search every code, every file to map them accurately." 370 were found by searching the
                      # figure register and 205 calculation files; 43 by hand; the last 17 by reading each one.
                      # It is zero now and may never rise: a new decision names the rows it governs, or the
                      # build stops. Two of them came back UNBUILT rather than unguarded — DEC-0313 (liquidity
                      # tiers) and DEC-0515 (choosing the bottom-bar modules) — and say so on their own rows.
if len(failures) > UNANCHORED:
    print('\nBUILD STOPPED \u2014 %d decisions are unanchored; the ratchet stands at %d. A new decision must '
          'name the rows it governs and carry a test or a file check.' % (len(failures), UNANCHORED))
    sys.exit(1)
if len(failures) < UNANCHORED:
    print('\nTHE DEBT FELL to %d from %d \u2014 lower UNANCHORED in this file, in the same commit.' % (len(failures), UNANCHORED))
    sys.exit(1)
sys.exit(0)
