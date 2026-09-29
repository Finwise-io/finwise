"""EVERY QUESTION ABOUT A SCREEN CITES THE APPROVED DESIGN IT WAS READ FROM.

The founder, 2026-09-28: *"go an check the rule which requires you to work off latest approved design
and files - as you said last two times in two days that it is fixed and will not happen again and it
happened again."*

WHY IT HAPPENED AGAIN, and it is not "I forgot":

1. THE RULE WAS SCOPED TO SCREENS AND MOCKS. The screen standard opens "every rule a new or changed
   SCREEN must meet... the checklist walked before any MOCK OR SCREEN reaches the founder", and step 0
   says "for every SCREEN the task touches". Writing down WHAT A SCREEN ANSWERS — the orchestrator
   map's questions — draws no mock and changes no screen, so the rule never fired. Both misses came
   out of that gap: Q-CF-1 (base pay vs income summary) and Q-CF-2 (This month vs Expenses) were
   written from the CODE, and both times the answer was already in a design he had approved.

2. NOTHING ENFORCED IT. Every rule in this repository that holds is held by a test that fails the
   build. Step 0 was held by my memory. That is precisely what failed, twice in two days, and a third
   promise would have been worth what the first two were.

So the rule is widened and gated: a question about a screen that HAS an approved design must record
which design it was read from, and when. The build fails otherwise. `read_from` is not decoration —
it is the claim that the design was opened, and it names the file so he can check the claim.

Run: python3 "Calculation Module code/scripts/check-read-from-approved.py"   (build-all runs it at B5)
"""
import json, os, re, sys

SC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SC, '..', '..'))
Q = json.load(open(os.path.join(SC, 'moneykeel_orchestrator_questions.json')))

# The approved design for each screen — the same list the map prints and the design record carries.
DESIGNED = {
    '/analytics': 'net-worth-quiet-instrument_v08',
    '/invest': 'performance_v14',
    '/account-detail': 'performance_v14',
    '/cashflow': 'cash-flow_v01',
    '/expense': 'cash-flow_v01',
    '/month-detail': 'cash-flow_v01',
    '/base-pay': 'income-end-to-end_v07',
    '/income-manager': 'income-end-to-end_v07',
    '/income-summary': 'income-end-to-end_v07',
    '/income-detail': 'income-end-to-end_v07',
    '/income': 'income-end-to-end_v07',
    '/filing-status': 'filing-status-question_v03',
    '/what-if': 'look-ahead_v04',
    '/plan': 'plan_v06',
    '/add-account': 'ways-to-add-an-account_v10',
}

# THE RATCHET. Eleven questions were written from the code before this gate existed; nine were read
# and cited the day it was built, and these two have NOT been — the Plan design (plan_v06) has not
# been opened for this purpose, and claiming otherwise would be the very thing the gate is for. They
# may only ever leave this list, never be added to.
OWED = {
    'Q-PL-1': 'plan_v06 has not been read for this question — the Plan tab work waits on its doors anyway',
    'Q-PL-2': 'plan_v06 has not been read for this question',
}

# ── SCREENS WITH NO APPROVED DESIGN — NAMED, NEVER ASSUMED (2026-09-28) ─────────────────────────
# This gate was built on 2026-09-27 to stop the approved-design rule failing a fourth time, and it
# had the same fault as the rule it guards: a question whose screens were not in DESIGNED fell into
# `exempt` in SILENCE. DESIGNED lists 15 routes; the questions name 38. So 23 screens were exempted
# by my not having typed them, which is indistinguishable from their having no design — and the gate
# printed itself clean either way.
#
# Founder, 2026-09-28: "How can you break your own rule? Isn't that the whole purpose of a rule?"
# The answer is that a rule holds only where something executes it, and a filter that drops what it
# does not recognise executes nothing. So every screen a question names must appear HERE or in
# DESIGNED. A new screen fails the build until someone says which it is. Silence is no longer an
# answer the gate accepts.
NO_APPROVED_DESIGN = {
    '/big-costs', '/bill-calendar', '/bonds', '/contribution-room', '/credit', '/education',
    '/goals', '/holding-detail', '/home', '/insights', '/insurance', '/itemize', '/jobsafety',
    '/paycheck-months', '/rewards', '/savings', '/settings', '/stress-test', '/tips',
    '/transactions', '/will-it-last', '/worth-a-look', '/cashflow-year',
    # the nine the coverage assertion found the moment it was written — each checked against
    # MoneyKeel/documents/ for a mock of its own on 2026-09-28; none has one. The Plan-family screens
    # (/retirement, /roth, /ss-timing, /required-withdrawals, /multi-goal, /monthly-income) are drawn
    # inside plan_v06 as sections rather than as screens with their own approved file, so they are
    # named here and the Plan doors carry plan_v06 through /plan.
    '/look-back', '/monthly-income', '/multi-goal', '/other-investments', '/required-withdrawals',
    '/retirement', '/roth', '/ss-timing', '/tax-organizer',
}

bad, ok, exempt, owed = [], 0, 0, []
# THE COVERAGE ASSERTION — no screen is exempted by my silence
unclassified = sorted({x for q in Q['questions'] for x in q.get('screens', [])
                       if x not in DESIGNED and x not in NO_APPROVED_DESIGN})
if unclassified:
    print('   %d screen(s) are in neither DESIGNED nor NO_APPROVED_DESIGN, so this gate would have'
          % len(unclassified))
    print('   exempted them without anyone deciding:')
    for x in unclassified:
        print('     ' + x)
    print('\n   BUILD STOPPED. Put each one in DESIGNED with its approved design, or in')
    print('   NO_APPROVED_DESIGN. A screen this gate does not classify is a screen it lets through.')
    sys.exit(1)
for q in Q['questions']:
    designed = sorted({DESIGNED[s] for s in q.get('screens', []) if s in DESIGNED})
    if not designed:
        exempt += 1               # no approved design exists for any of its screens — nothing to read
        continue
    cite = str(q.get('read_from') or '')
    if not cite and q['id'] in OWED:
        owed.append(f"{q['id']}: {OWED[q['id']]}")
        continue
    if not cite:
        bad.append(f"{q['id']}: its screens have an approved design ({' · '.join(designed)}) and the "
                   f"question does not say it was read. Open it, then record read_from.")
        continue
    missing = [d for d in designed if d.split('_v')[0] not in cite]
    if missing:
        bad.append(f"{q['id']}: read_from does not name {' · '.join(missing)} — the design its screens were approved from.")
    elif not re.search(r'20\d\d-\d\d-\d\d', cite):
        bad.append(f"{q['id']}: read_from names the design but not the date it was read.")
    else:
        ok += 1

print(f'questions read from the approved design — {ok} cite it · {exempt} have no approved design to read · '
      f'{len(owed)} still owed · {len(bad)} broke the rule')
print(f'   coverage: {len(DESIGNED)} routes have an approved design · {len(NO_APPROVED_DESIGN)} are named as having none · 0 unclassified')
for o in owed:
    print('   ·', o)
# a question that has been read leaves OWED; nothing may join it
strays = [i for i in OWED if next((q for q in Q['questions'] if q['id'] == i), {}).get('read_from')]
if strays:
    print(f"\n   {' · '.join(strays)} now cite their design — strike them from OWED so the count only falls.")
    sys.exit(1)
for b in bad:
    print('   ✗', b)
if bad:
    print('\n   The rule (screen standard, step 0, widened 2026-09-28): a question about what a screen')
    print('   ANSWERS is written from the approved design, never from the code. Open it and cite it.')
    sys.exit(1)
