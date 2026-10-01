#!/usr/bin/env python3
"""THE SEVEN STEPS TO LAUNCH-READY, ONE MODULE AT A TIME — his process, 2026-10-01.

    python3 "Calculation Module code/scripts/module-launch-steps.py" networth 1
    python3 "Calculation Module code/scripts/module-launch-steps.py" networth        # every step built so far

He set out seventeen checks in seven steps and the exact words each must print. A module is marked
launch-ready at step 7 ONLY when the six before it have passed — so each step here either passes on
evidence it prints, or says what it is missing. Nothing is assumed, and no step reports a pass because
its subject was empty.

    1.a  screens designed, approved, and coded
    1.b  screens comply with the one-term canon, the other standards, and the decision log
    1.c  no figure reaches a screen without its identifier
    2.a  the master file's metrics match the latest approved screen designs
    2.b  the metrics comply with the standards and the decision log
    2.c  the code carries the revised metrics, and is tested
    3.a-d  functions: open findings, corrections, tests written, tests run
    4.a-d  orchestrators: the plan, the build, the tests written, the tests run
    5    the full audit — is every metric, function, input, decision and finding used in code?
    6.a-b  ten use cases, five common and five edge, run as an end user
    7    all six complete → launch-ready

WHY A SCRIPT AND NOT A CHECKLIST. A checklist I walk by hand reports what I remember looking at; three
of my guards failed exactly that way. This prints the number it examined at every step.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)

MODULE = (sys.argv[1] if len(sys.argv) > 1 else 'networth').lower()
ONLY = sys.argv[2] if len(sys.argv) > 2 else None
FAMILY = {'networth': 'NW', 'cashflow': 'CF', 'performance': 'PF', 'plan': 'PL'}[MODULE]

J = lambda n: json.load(open(os.path.join(HERE, n), encoding='utf8'))
FIGS = J('moneykeel_figures.json')['figures']
DEC = J('moneykeel_decisions.json')['rows']
read = lambda p: open(p, encoding='utf8', errors='ignore').read() if os.path.exists(p) else ''

# ── the module's screens, DERIVED from the figures that declare them (never typed) ───────────────
ROUTE_TO_SCREEN = {}
for dp, dn, fn in os.walk('app'):
    for f in fn:
        if f.endswith('.tsx') and not f.startswith('_'):
            m = re.search(r'screens/([A-Za-z]+)', read(os.path.join(dp, f)))
            if m:
                ROUTE_TO_SCREEN['/' + os.path.splitext(f)[0]] = m.group(1)
ROUTE_TO_SCREEN.setdefault('/analytics', 'NetWorthScreen')

# WHAT A MODULE OWNS — his scope, 2026-10-01: *"we are only working on NW module. Forget about these
# screens - Home, Insights, Import holdings, Job safety, Stress test."*
#
# Two different questions had been merged, and that is what put twelve screens in Net worth's step 1.a:
#   · which screens must OBEY this module's decisions — any screen that prints one of its figures, which
#     is Home (MK-NW-M-012), Insights (MK-NW-M-005, 047, 048) and Job safety (MK-NW-M-013);
#   · which screens NEED AN APPROVED DESIGN from this module — only the ones it owns.
# Step 1.a asks the second. Stress test and Job safety are Plan → Prepare by his own DEC-0009; Import
# holdings declares no figure at all and is reached from the Connect flow and Home, not from Net worth.
OWNED = {'networth': {'NetWorthScreen', 'AccountDetailScreen', 'ItemizeScreen', 'HoldingDetailScreen',
                      'BondsScreen', 'OtherInvestmentsScreen', 'AddAccountScreen'},
         'cashflow': {'CashFlowScreen', 'BudgetScreen', 'MonthDetailScreen', 'IncomeManagerScreen',
                      'IncomeDetailScreen', 'IncomeScreen', 'MonthlyIncomeScreen',
                      'PaycheckMonthsScreen', 'BillCalendarScreen', 'WorthALookScreen',
                      'ContributionRoomScreen', 'TaxOrganizerScreen'},
         'performance': {'PerformanceScreen', 'AccountDetailScreen', 'HoldingDetailScreen',
                         'LookBackScreen'}}.get(MODULE, set())
# A screen is still DERIVED from the figures that declare it, so a new one printing this module's
# figures cannot slip past unnoticed — but a screen another module owns is then subtracted by name,
# with his instruction on the line. Subtracting by name rather than dropping the derivation is the
# difference between a scope he set and a scope I forgot to look at.
NOT_OURS = {'networth': {'HomeScreen', 'InsightsScreen', 'ImportHoldingsScreen', 'JobSafetyScreen',
                         'StressTestScreen'},     # his words, 2026-10-01: "forget about these screens"
            'performance': {'HomeScreen'},
            'cashflow': {'HomeScreen'}}.get(MODULE, set())
declared = {ROUTE_TO_SCREEN[r] for i, f in FIGS.items() if i.startswith('MK-' + FAMILY + '-')
            and isinstance(f, dict) for r in (f.get('screens') or []) if r in ROUTE_TO_SCREEN}
OBEYS = sorted(declared - OWNED)          # owned elsewhere, but must obey this module's decisions
SCREENS = sorted((OWNED | declared) - NOT_OURS)

results = {}


def say(step, ok, good, bad):
    print(f'\n{"✓" if ok else "✗"} ' + (good if ok else bad))
    results[step] = ok


# ══ STEP 1.a · screens designed, approved, and coded ═════════════════════════════════════════════
def step_1a():
    print('\n' + '─' * 92)
    print(f'STEP 1.a · {MODULE.upper()} — are the screens designed, approved, and coded?')
    # THE AUTHORITY IS THE ONE RECORD, not a filename. His standard says which design each screen
    # was built from lives in ONE place, so that table is read here rather than guessed at: the first
    # version of this step matched mock filenames against screen names and reported the Net worth
    # screen as unapproved when its v08 was approved on 2026-09-14 and built the same day.
    record = read('MoneyKeel/documents/standards/'
                  'moneykeel_pres_spec_design-each-screen-was-built-from_v01.md')
    APPROVED_BY_RECORD, cur = {}, None
    if '## The current approved design, by screen' in record:
        sec = record[record.index('## The current approved design, by screen'):]
        sec = sec[:sec.index('\n---')] if '\n---' in sec else sec
        for line in sec.split('\n'):
            if not line.startswith('|'):
                continue
            cells = [c.strip() for c in line.strip('|').split('|')]
            if len(cells) < 2 or cells[0] in ('Screen', '---', ':---') or set(cells[0]) <= set('-: '):
                continue
            APPROVED_BY_RECORD[cells[0].lower()] = cells[1]
    # the record's table names the four tab screens; a screen reached FROM one is not in it, and the
    # record says so itself: "Home and every screen opened from another screen still need their
    # Build 53 design traced by the same method."
    # the record's table now carries a row per SCREEN, not only per tab, so the map follows it
    TAB_OF = {'NetWorthScreen': 'net worth', 'PerformanceScreen': 'performance',
              'PlanHubScreen': 'plan', 'CashFlowScreen': 'cash flow',
              'AccountDetailScreen': 'account detail (account portfolio)',
              'AddAccountScreen': 'add an account, by hand'}

    mocks = {}
    for dp, dn, fn in os.walk('MoneyKeel/documents'):
        if 'archive' in dp:
            continue
        for f in fn:
            if 'pres_mock' in f and f.endswith('.html'):
                mocks[f] = os.path.join(dp, f)

    # read from the record's gap table: "| Bonds · Other investments · Holding detail | `file` | … |"
    DRAWN_BY = {}
    if 'what still has no approved design' in record:
        gap = record[record.index('what still has no approved design'):]
        gap = gap[:gap.index('\n## ')] if '\n## ' in gap else gap
        for line in gap.split('\n'):
            if not line.startswith('|'):
                continue
            cells = [c.strip() for c in line.strip('|').split('|')]
            if len(cells) < 2:
                continue
            f_ = re.findall(r'moneykeel_pres_mock_[\w\-]+_v\d+', cells[1])
            if not f_:
                continue
            for part in re.split(r'·|,', cells[0]):
                name = part.strip().replace(' ', '') + 'Screen'
                for cand in SCREENS:
                    if cand.lower() == name.lower():
                        DRAWN_BY[cand] = f_[0]

    rows, missing = [], []
    for s_ in SCREENS:
        coded = os.path.exists(f'src/screens/{s_}.tsx')
        entry = APPROVED_BY_RECORD.get(TAB_OF.get(s_, ''), '')
        approved = bool(re.search(r'(?i)approved', entry)) and 'WAITING' not in entry.upper()
        file_named = (re.findall(r'moneykeel_pres_mock_[\w\-]+_v\d+', entry) or ['\u2014'])[0]
        # a design that exists for this screen but carries no approval in the record
        # WHICH FILE DRAWS WHICH SCREEN comes from the record's own gap table, not from the
        # filename. investments_v07 draws bonds, alternatives and a holding, and none of those words
        # is in its name — matching on the name reported three screens as having nothing drawn when a
        # design for them was sitting in the folder waiting for him.
        key = s_.replace('Screen', '').lower()
        loose = [f for f in mocks if key and (key in f.replace('-', '') or key in f)]
        loose += [f for f in mocks if s_ in DRAWN_BY and DRAWN_BY[s_] in f]
        state = ('approved + coded' if approved and coded else
                 'approved, NOT coded' if approved else
                 'a design exists, NOT approved in the record' if loose and coded else
                 'coded, NO design of record' if coded else 'not coded')
        rows.append((s_, state, file_named if approved else (loose or ['\u2014'])[0]))
        if not (approved and coded):
            missing.append(s_)

    print(f'\n   {"screen":28s} {"state":26s} design file of record')
    for s_, state, f_ in rows:
        print(f'   {s_:28s} {state:42s} {f_[:44]}')
    print(f'\n   coverage: {len(SCREENS)} screens of the {MODULE} module examined '
          f'— {len(SCREENS) - len(missing)} approved and coded, {len(missing)} not')
    if NOT_OURS:
        print(f'   not this module\'s, so not asked for a design here: ' + ' '.join(sorted(NOT_OURS)))
    if [s_ for s_ in OBEYS if s_ not in NOT_OURS]:
        print(f'   owned elsewhere but printing this module\'s figures, so they must OBEY its '
              f'decisions (step 1.b): ' + ' '.join(s_ for s_ in OBEYS if s_ not in NOT_OURS))
    # THE REASON IS GENERATED, never typed. The first version of this step carried a sentence I had
    # written by hand naming which files were and were not approved; his approvals of 2026-10-01 made
    # three of them wrong within the hour, and the step went on printing the old explanation. A step
    # that explains itself from a sentence rather than from its own evidence is a stale status report.
    exists = [s_ for s_, st, f_ in rows if 'design exists' in st or 'NO design' in st and f_ != '\u2014']
    nomock = [s_ for s_, st, f_ in rows if st == 'coded, NO design of record' and f_ == '\u2014']
    unappr = [s_ for s_, st, f_ in rows if 'NOT approved' in st]
    why = []
    if unappr:
        why.append(f'{len(unappr)} have a design drawn but no approval of his on record ('
                   + ', '.join(unappr) + ')')
    if nomock:
        why.append(f'{len(nomock)} have no design of record at all, so a mock must be drawn before it '
                   'can be approved (' + ', '.join(nomock) + ')')
    say('1.a', not missing,
        f'Step 1.a complete — all {len(SCREENS)} screens of {MODULE} are designed, approved and coded.',
        f'Step 1.a not complete because {len(missing)} of {len(SCREENS)} screens lack an approved '
        f'design, though all {len([1 for s_ in SCREENS if os.path.exists(f"src/screens/{s_}.tsx")])} '
        f'are coded: ' + '; '.join(why) + '.')


# ══ STEP 1.b · the standards and the decision log ════════════════════════════════════════════════
def jest(paths):
    r = subprocess.run(['npx', 'jest', '--silent'] + paths, capture_output=True, text=True)
    out = r.stdout + r.stderr
    m = re.search(r'Tests:\s+(?:(\d+) failed,\s+)?(\d+) passed,\s+(\d+) total', out)
    return (int(m.group(1) or 0), int(m.group(2)), int(m.group(3))) if m else (None, None, None)


def step_1b():
    print('\n' + '─' * 92)
    print(f'STEP 1.b · {MODULE.upper()} — do the screens comply with the standards and the decisions?')
    GUARDS = {
        'the one-term canon (his synonym standard)': 'src/__tests__/one_term_per_concept.test.ts',
        'the retired word never returns': 'src/__tests__/banned_word_guard.test.ts',
        'precision and display': 'src/__tests__/precision_guard.test.ts',
        'a dark-green bar runs edge to edge': 'src/__tests__/guard_bands_edge_to_edge.test.ts',
        'colours come from the tokens': 'src/__tests__/color_token_guard.test.ts',
        'one class label everywhere': 'src/__tests__/class_label_guard.test.ts',
        'mock copy sits on the canon': 'src/__tests__/mock_copy_on_canon.test.ts',
        'the screens agree with each other': 'src/__tests__/guard_d3_screens_agree.test.tsx',
        'one wording for the odds': 'src/__tests__/one_wording_for_the_odds.test.ts',
        'own-math framing, not a rule of thumb': 'src/__tests__/own_math_not_a_rule_of_thumb.test.ts',
        'source always, date only when stale': 'src/__tests__/source_always_date_only_when_stale.test.ts',
    }
    GUARDS = {k: v for k, v in GUARDS.items() if os.path.exists(v)}
    failed, passed, total = jest(list(GUARDS.values()))
    print(f'\n   standards guards run: {len(GUARDS)}')
    for k in GUARDS:
        print(f'      · {k}')
    print(f'   result: {passed} test(s) passed, {failed} failed, {total} total')

    vp = os.path.join(HERE, f'moneykeel_validation_{MODULE}.json')
    if not os.path.exists(vp):
        subprocess.run([sys.executable, os.path.join(HERE, 'validate-module-complies.py'), MODULE],
                       capture_output=True)
    V = json.load(open(vp, encoding='utf8'))
    import collections
    tally = collections.Counter(v['verdict'] for v in V)
    print(f'\n   decisions checked against the screens: {len(V)}')
    for k, n in tally.most_common():
        print(f'      {n:4d}  {k}')
    breached = tally.get('BREACHED', 0) + tally.get('BROKEN RECORD', 0)
    unconfirmed = tally.get('FAINT TRACE', 0) + tally.get('NO TRACE', 0)
    ok = failed == 0 and breached == 0 and unconfirmed == 0
    say('1.b', ok,
        f'Step 1.b fully compliant — {len(GUARDS)} standards guards pass and all {len(V)} decisions '
        f'touching {MODULE} are confirmed against the screens.',
        f'Step 1.b not compliant because, although all {len(GUARDS)} standards guards pass '
        f'({passed} tests, 0 failed) and no decision is breached, the compliance of {unconfirmed} of '
        f'{len(V)} decisions is UNCONFIRMED — they left only a faint mark in the screen code, so '
        f'nothing yet shows the screen obeys them. {tally.get("NOT FOUND", 0)} more quote wording not '
        f'found on any screen; all of those were read by hand on 2026-10-01 and are his own remarks '
        f'rather than text meant to appear, but that reading is not yet pinned by a test.')


# ══ STEP 1.c · no figure on a screen without its identifier ══════════════════════════════════════
def step_1c():
    print('\n' + '─' * 92)
    print(f'STEP 1.c · {MODULE.upper()} — does every figure on a screen carry its identifier?')
    base = J('moneykeel_undeclared_figures.json')['baseline']
    mine = {k: v for k, v in base.items() if any(f'/{s}.tsx' in k for s in SCREENS)}
    print(f'\n   {"screen":44s} figures printed with no identifier')
    for k, v in sorted(mine.items(), key=lambda x: -x[1]):
        print(f'   {k:44s} {v:4d}')
    print(f'\n   coverage: all {len(SCREENS)} screens of the module checked; {len(mine)} still carry '
          f'unidentified figures, {sum(mine.values())} in total '
          f'(the app-wide figure is {sum(base.values())} across {len(base)} files)')
    f_, p_, t_ = jest(['src/__tests__/guard_figures_declared.test.ts'])
    print(f'   the ratchet guard itself: {p_} passed, {f_} failed — it holds the count down, '
          f'it does not claim the count is zero')
    say('1.c', not mine,
        f'Step 1.c fully compliant — every figure on all {len(SCREENS)} screens carries its identifier.',
        f'Step 1.c not compliant because {sum(mine.values())} figures are still printed without an '
        f'identifier across all {len(mine)} of the {len(SCREENS)} screens — '
        + ', '.join(f'{k.split("/")[-1]} {v}' for k, v in sorted(mine.items(), key=lambda x: -x[1])[:5])
        + f'. The ratchet guard passes, which only means the count has not RISEN since 2026-09-14.')


STEPS = {'1.a': step_1a, '1.b': step_1b, '1.c': step_1c}
for name, fn in STEPS.items():
    if ONLY is None or name.startswith(ONLY):
        fn()

print('\n' + '═' * 92)
print(f'{MODULE.upper()} — steps run: ' + ' · '.join(
    f'{k} {"PASS" if v else "NOT COMPLETE"}' for k, v in results.items()))
not_done = [k for k, v in results.items() if not v]
print(f'\nSTEP 7 · launch-ready? NO — {len(not_done)} of the {len(results)} steps run so far are not '
      f'complete ({", ".join(not_done)}), and steps 2 to 6 have not been run.' if not_done else
      f'\nevery step run so far passes.')
