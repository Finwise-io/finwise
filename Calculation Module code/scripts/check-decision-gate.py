#!/usr/bin/env python3
"""HIS TWO CONTROLS ON THE DECISION LOG — the gate, and the debt they inherited.

    python3 "Calculation Module code/scripts/check-decision-gate.py"

Control 1 · a new decision must answer three questions before it may be recorded: what is impacted,
             what changes, and the steps to apply it.
Control 2 · a new decision that repeats one he already made stops, and names the pair with both dates.

Both refuse the WRITE inside build-decision-log.py — his words were *"guard should return failed
process"*, not "warn". This script reports the same two controls on their own, carries the debt the
log already held when they came in, and — most of the work here — PROVES THE CONTROLS STILL FIRE.

WHY THE SELF-TEST IS THE POINT. Both controls pass today for the same reason: there are no new rows
yet. A gate whose subject is empty is indistinguishable from a gate that has stopped working, and
three of mine have failed exactly that way — B5, B6 and the orphan-route guard all reported clean
while looking at a fraction. So this feeds the detectors deliberate failures and fails the build if
they come back clean. Silence here has to mean "nothing wrong", never "nothing looked at".
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import moneykeel_decision_gate as GATE

ROWS = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json'), encoding='utf8'))['rows']
LIVE = [r for r in ROWS if 'OLD' not in str(r.get('in_use', ''))]
bad = []

print('── the two controls on what may enter the decision log (his, 2026-10-01)')
print(f'   decisions in force {len(LIVE)} · recorded before the controls, so carried as debt: '
      f'everything up to {GATE.BASELINE_ID}')

# ── 1 · do NEW decisions carry a path? ───────────────────────────────────────────────────────────
new = [r for r in LIVE if GATE.is_new(r)]
held = [(r, GATE.three_questions(r)) for r in new]
held = [(r, m) for r, m in held if m]
print(f'\n   NEW decisions since the controls: {len(new)}')
if held:
    print(f'   PROCESS FAILED — {GATE.REFUSAL}')
    for r, m in held:
        print(f'      {r["id"]}: ' + ' · '.join(m))
    bad.append(f'{len(held)} new decision(s) with no path to apply them')
else:
    print('   all of them answer what is impacted, what changes, and the steps to apply it.')

# ── 2 · does a NEW decision repeat an older one? ─────────────────────────────────────────────────
pairs = [(n, p, w, rr) for n, p, w, rr in GATE.prior_decisions(ROWS) if GATE.is_new(n)]
pairs = [(n, p, w, rr) for n, p, w, rr in pairs
         if p['id'] not in str(n.get('supersedes') or '')
         and n['id'] not in str(p.get('supersedes') or '')]
if pairs:
    print(f'\n   PROCESS FAILED — a new decision repeats one already recorded.')
    for n, p, w, rr in pairs:
        print('      ' + GATE.supersede_question(n, p))
    bad.append(f'{len(pairs)} new decision(s) repeating an earlier one, unresolved')
else:
    print('   none of them repeats a decision already on record.')

# ── THE DEBT, true numbers, printed every build ──────────────────────────────────────────────────
no_path = [r for r in LIVE if GATE.three_questions(r)]
all_pairs = [(n, p) for n, p, _, _ in GATE.prior_decisions(ROWS)
             if p['id'] not in str(n.get('supersedes') or '')]
print(f'\n   DEBT · no path to apply      {len(no_path)} of {len(LIVE)} '
      f'(the ratchet stands at {GATE.NO_PATH})')
print(f'   DEBT · looks like a repeat   {len(all_pairs)} pair(s) '
      f'(the ratchet stands at {GATE.DUPLICATE_PAIRS})')
for n, cur, name in ((GATE.NO_PATH, len(no_path), 'decisions with no path'),
                     (GATE.DUPLICATE_PAIRS, len(all_pairs), 'apparent repeat pairs')):
    if cur > n:
        bad.append(f'{name} rose to {cur} from {n} — a decision lost its path or a repeat was added')
    elif cur < n:
        bad.append(f'{name} FELL to {cur} from {n} — lower the ratchet in '
                   f'moneykeel_decision_gate.py, in this same commit')

# ── THE SELF-TEST · the detectors must still detect ──────────────────────────────────────────────
print('\n   PROVING THE CONTROLS STILL FIRE (both pass above only because nothing new is pending):')
checks = 0

pathless = {'id': 'DEC-9998', 'recorded': '2099-01-01', 'his_words': 'make the hero bigger.',
            'in_use': 'IN USE'}
checks += 1
if len(GATE.three_questions(pathless)) != 3:
    bad.append('control 1 no longer refuses a decision with nothing answered')
else:
    print('      ✓ a decision answering none of the three questions is refused, all three named')

for col, label in (('governs', 'what is impacted'), ('means', 'what changes'),
                   ('apply_steps', 'the steps to apply it')):
    one_short = dict(pathless, governs='MK-NW-M-001', means='the hero grows',
                     apply_steps='1. change the size. 2. pin it.')
    one_short[col] = ''
    if col == 'governs':
        one_short['screens'] = ''
    if col == 'apply_steps':
        one_short['changed'] = one_short['carriers'] = ''
    checks += 1
    if len(GATE.three_questions(one_short)) != 1:
        bad.append(f'control 1 no longer notices a missing answer for {label}')
    else:
        print(f'      ✓ a decision missing only "{label}" is refused for exactly that')

complete = dict(pathless, governs='MK-NW-M-001', screens='NetWorthScreen',
                means='the hero grows', apply_steps='1. change the size. 2. pin it.')
checks += 1
if GATE.three_questions(complete):
    bad.append('control 1 now refuses a decision that DOES answer all three — it would block real work')
else:
    print('      ✓ a decision that answers all three is let through')

checks += 1
if not GATE.is_new({'id': 'DEC-9999', 'recorded': '2026-09-01'}):
    bad.append('control 1 no longer treats an id above the baseline as new')
else:
    print('      ✓ an id above ' + GATE.BASELINE_ID + ' counts as new whatever its date says')
checks += 1
if GATE.is_new({'id': 'DEC-0001', 'recorded': '2026-08-01'}):
    bad.append('control 1 now treats an old decision as new — it would fail on the whole log')
else:
    print('      ✓ a decision from before the controls is not treated as new')

# CONTROL 2 MUST STILL FIND A REPEAT — tested on a copy of the real one, never on the log itself.
#
# This check first read the live log for DEC-0109/DEC-0104. Then that pair was resolved, as it should
# be, and the check went red — the detector was fine and its own test had broken. A self-test that
# depends on the data it is checking fails for the one reason that means nothing. So the pair lives
# here, in his actual words from 2026-08-11, and resolving anything in the log cannot touch it.
restated = [
    {'id': 'DEC-9980', 'decided': '2026-08-11', 'in_use': 'IN USE',
     'governs': 'src/domain/planning/hub.ts · src/screens/NetWorthScreen.tsx',
     'his_words': 'make sure when we are using same language everywhere to convey same message. We '
                  'should have the same language on home, NW and Plan for retirement — xx% odds of '
                  'lasting to age abc.'},
    {'id': 'DEC-9981', 'decided': '2026-08-11', 'in_use': 'IN USE',
     'governs': 'src/domain/planning/hub.ts · src/screens/NetWorthScreen.tsx',
     'his_words': 'lets make sure we are using same language everywhere to convey same message — '
                  'xx% odds of lasting to age abc'},
]
checks += 1
if ('DEC-9981', 'DEC-9980') not in {(n['id'], q['id']) for n, q, _, _ in GATE.prior_decisions(restated)}:
    bad.append('control 2 no longer finds one decision restated — tested on his own words of '
               '2026-08-11, the pair that let the odds wording split for seven weeks')
else:
    print('      ✓ still finds one decision restated, on his own words from 2026-08-11')

# …and a pair already linked must NOT be raised again, or a resolution never clears the list
checks += 1
linked = [dict(restated[0]), dict(restated[1], supersedes='Replaces DEC-9980')]
if [1 for n, q, _, _ in GATE.prior_decisions(linked)
        if q['id'] not in str(n.get('supersedes') or '')]:
    bad.append('control 2 raises a pair that has already been linked — a resolution would never clear')
else:
    print('      ✓ a pair already linked is not raised again')
# …and must not pair two decisions with nothing in common
apart = [{'id': 'DEC-9990', 'decided': '2026-01-01', 'in_use': 'IN USE', 'governs': 'MK-NW-M-001',
          'his_words': 'colour the mortgage band amber when the balance climbs above the valuation'},
         {'id': 'DEC-9991', 'decided': '2026-02-01', 'in_use': 'IN USE', 'governs': 'MK-CF-M-044',
          'his_words': 'spell the paycheck month in words beside the figure, never a numeral'}]
checks += 1
if GATE.prior_decisions(apart):
    bad.append('control 2 now pairs two unrelated decisions — it would cry wolf and be switched off')
else:
    print('      ✓ two unrelated decisions are not paired')

print(f'\n   {checks} self-checks run on the controls themselves.')
if bad:
    print('\nBUILD STOPPED:')
    for b in bad:
        print('   • ' + b)
    sys.exit(1)
print('\n   both controls are armed, and proven to still fire.')
