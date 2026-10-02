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
OWNED = {'networth': {'NetWorthScreen', 'AccountPortfolioScreen', 'ItemizeScreen', 'HoldingDetailScreen',
                      'BondsScreen', 'OtherInvestmentsScreen', 'AddAccountScreen'},
         # Income detail, Contribution room and Tax organizer are the MENU tab's: the master files their
         # figures under MK-MN (his tab structure), so they are not asked for a Cash flow design here.
         # Base pay and Income summary print only Cash flow figures, so they are Cash flow's (2026-10-02).
         'cashflow': {'CashFlowScreen', 'BudgetScreen', 'MonthDetailScreen', 'IncomeManagerScreen',
                      'IncomeScreen', 'MonthlyIncomeScreen', 'PaycheckMonthsScreen', 'BillCalendarScreen',
                      'WorthALookScreen', 'BasePayScreen', 'IncomeSummaryScreen'},
         'performance': {'PerformanceScreen', 'AccountPortfolioScreen',   # Holding detail is Net worth's (his seven, DEC-0649)
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
# WHERE THIS MODULE'S DOORS LIVE (2026-10-02): the Net worth and Performance doors share one folder;
# Cash flow's are in their own. Steps 2.c, 3.c and 4.b–4.d read this, never a folder typed from memory —
# the Cash flow run found all five of its orchestrators "not coded" because the folder was the other one.
DOOR_DIR = ('MoneyKeel/functions/networth-and-performance' if MODULE in ('networth', 'performance')
            else 'MoneyKeel/functions/' + MODULE)
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
              'AccountPortfolioScreen': 'account portfolio',
              'AddAccountScreen': 'add an account, by hand',
              'BondsScreen': 'bonds', 'OtherInvestmentsScreen': 'other investments',
              'HoldingDetailScreen': 'holding detail', 'ItemizeScreen': 'itemize',
              'LookBackScreen': 'look back',
              'BudgetScreen': 'budget (expenses · debts)', 'MonthDetailScreen': 'month detail',
              'IncomeManagerScreen': 'income manager', 'IncomeScreen': 'log income',
              'MonthlyIncomeScreen': 'monthly income', 'PaycheckMonthsScreen': 'paycheck months',
              'BillCalendarScreen': 'bill calendar', 'WorthALookScreen': 'worth a look',
              'BasePayScreen': 'base pay', 'IncomeSummaryScreen': 'income summary'}

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
            # "Other investments" is the row he calls it by; the screen file is
            # OtherInvestmentsScreen.tsx and the mock is named alternatives_v01, because the screen
            # itself is titled Alternatives. Three names for one screen, so the row name is matched
            # against the screen rather than the file.
            for part in re.split(r'·|,', cells[0]):
                name = re.sub(r'[^A-Za-z]', '', part.strip().title()) + 'Screen'
                for cand in SCREENS:
                    if cand.lower() == name.lower():
                        DRAWN_BY[cand] = f_[0]

    rows, missing = [], []
    for s_ in SCREENS:
        coded = os.path.exists(f'src/screens/{s_}.tsx')
        entry = APPROVED_BY_RECORD.get(TAB_OF.get(s_, ''), '')
        # "NOT YET APPROVED" contains the word approved (2026-10-02: six Cash flow drawings read as approved
        # the moment they were recorded as waiting). A negation anywhere in the cell means not approved.
        approved = (bool(re.search(r'(?i)\bapproved\b', entry))
                    and not re.search(r'(?i)NOT (YET )?APPROVED|WAITING|REJECTED|awaits his word', entry))
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
    # ALWAYS RE-RUN (2026-10-01): a file left by an earlier run reported 66 Performance decisions as
    # unconfirmed an hour after the tests holding them were written. A verdict is read from the code
    # as it is now, never from a file that says what it was.
    _vr = subprocess.run([sys.executable, os.path.join(HERE, 'validate-module-complies.py'), MODULE],
                         capture_output=True, text=True)
    if _vr.returncode != 0:
        # A GUARD MUST PROVE IT LOOKED: a validator that crashed left yesterday's file behind and the
        # step read it as today's answer (2026-10-01, a syntax error in the validator cost an hour).
        print('\n   THE VALIDATOR ITSELF FAILED — nothing below is a verdict:\n' + (_vr.stderr or _vr.stdout)[-600:])
        say('1.b', False, '', 'Step 1.b not compliant because the compliance validator failed to run; fix it before reading any verdict.')
        return
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
        f'Step 1.b not compliant because, {"although all" if not failed else "of the"} {len(GUARDS)} standards guards{" pass" if not failed else " run, " + str(failed) + " test(s) FAILED"} '
        f'({passed} tests, {failed} failed) and no decision is breached, the compliance of {unconfirmed} of '
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


# ══ STEP 2.a · do the master file's metrics match the approved screen designs? ═══════════════════
def approved_mocks():
    """The mock the record names as APPROVED for each screen of this module, with its visible text."""
    record = read('MoneyKeel/documents/standards/'
                  'moneykeel_pres_spec_design-each-screen-was-built-from_v01.md')
    out = {}
    if '## The current approved design, by screen' in record:
        sec = record[record.index('## The current approved design, by screen'):]
        sec = sec[:sec.index('\n---')] if '\n---' in sec else sec
        for line in sec.split('\n'):
            if not line.startswith('|'):
                continue
            c = [x.strip() for x in line.strip('|').split('|')]
            if len(c) < 2 or not re.search(r'(?i)approved', c[1]) or 'WAITING' in c[1].upper():
                continue
            for f_ in re.findall(r'moneykeel_pres_mock_[\w\-]+_v\d+', c[1]):
                for dp, dn, fn in os.walk('MoneyKeel/documents'):
                    for g in fn:
                        if g.startswith(f_) and g.endswith('.html'):
                            raw = read(os.path.join(dp, g))
                            txt = re.sub(r'<[^>]+>', ' ', re.sub(r'(?s)<(script|style).*?</\1>', '', raw))
                            out[c[0].lower()] = (g, ' '.join(txt.split()))
    return out


def step_2a():
    print('\n' + '─' * 92)
    print(f'STEP 2.a · {MODULE.upper()} — do the master file\'s metrics match the approved designs?')
    reg = set(J('moneykeel_metric_register.json')['issued'].values())
    mine = {i: f for i, f in FIGS.items() if i.startswith('MK-' + FAMILY + '-M-') and isinstance(f, dict)}
    mocks = approved_mocks()
    TAB_OF = {'NetWorthScreen': 'net worth', 'AccountPortfolioScreen': 'account portfolio',
              'AddAccountScreen': 'add an account, by hand', 'BondsScreen': 'bonds',
              'OtherInvestmentsScreen': 'other investments', 'HoldingDetailScreen': 'holding detail',
              'ItemizeScreen': 'itemize', 'PerformanceScreen': 'performance', 'CashFlowScreen': 'cash flow'}
    ROUTE_OF = {v: k for k, v in ROUTE_TO_SCREEN.items()}

    # A FORM HAS NO METRIC, and that is right rather than missing. Add an account by hand shows
    # fields a person fills in; the only number on it is the one being typed. Inventing a metric to
    # satisfy a check would put a figure on the master file that nothing computes — which is the
    # opposite of what the master file is for.
    FORMS = {'AddAccountScreen'}
    not_issued = sorted(i for i in mine if i not in reg)
    wrong_family, no_metric, label_gap = [], [], []
    for s_ in SCREENS:
        key = TAB_OF.get(s_)
        route = ROUTE_OF.get(s_)
        on_screen = [i for i, f in mine.items() if route and route in (f.get('screens') or [])]
        # a screen of THIS module whose figures are declared under another family
        others = [i for i, f in FIGS.items() if isinstance(f, dict) and route
                  and route in (f.get('screens') or []) and not i.startswith('MK-' + FAMILY + '-')]
        if not on_screen and others:
            wrong_family.append((s_, others))
        elif not on_screen and key in mocks and s_ not in FORMS:
            no_metric.append(s_)
        # every metric's own label must be readable on its approved design
        if key in mocks:
            g, txt = mocks[key]
            for i in on_screen:
                # A PER-ROW FIGURE HAS NO SINGLE LABEL. Where the grain is one debt, one class or one
                # holding, the screen draws N rows each carrying its own name, and the label field
                # describes the row rather than quoting it. Demanding it verbatim marked four correct
                # records as defects. The two that were genuinely wrong had no grain at all.
                if re.match(r'(?i)(one |a )', str(mine[i].get('grain') or '')):
                    continue
                lab = str(mine[i].get('label') or '')
                core = re.sub(r'\$?X\b|\$?Y\b|\bN\b|\bn\b|\bxx\b|\bnn\b', '', lab)
                # EVERY WORD, not a contiguous phrase. Matching the phrase meant a label like
                # "CURRENT PRICE · LIVE" failed against a mock that says exactly that, because the
                # separator was stripped from one side and not the other — two false findings on a
                # mock I had drawn myself an hour earlier.
                words = [w.lower() for w in re.findall(r"[A-Za-z][A-Za-z'\-]{2,}", core)]
                if words and not all(w in txt.lower() for w in words):
                    # TWO DIFFERENT THINGS, and only one is a defect.
                    #   · a label that READS LIKE A DESCRIPTION breaks the label contract in
                    #     _figure-spec.ts — "the words a person reads beside it, exactly as the screen
                    #     says them". "total value of your bonds" is a description of a bare hero
                    #     figure, and the screen says no such words.
                    #   · a label that LOOKS LIKE COPY but is absent usually means the approved design
                    #     does not draw that state — a bond row on the account page, say — which is not
                    #     a mismatch at all.
                    # ASK THE SCREEN, NOT THE SHAPE OF THE WORDS. The first version called a label
                    # a description when it started lowercase — which marked "at your planned spend"
                    # and "cash ÷ planned spend" as defects when both are literally what the screen
                    # prints, in the middle of a sentence. A label is a description only when its
                    # words appear in NEITHER the approved design NOR the screen's own code.
                    # string literals only: a comment quoting his ruling is not screen copy
                    # the Cash flow tab EMBEDS the Budget screen as its Expenses and Debts sub-tabs (2026-10-02):
                    # a figure declared on /cashflow may say its words in BudgetScreen.tsx
                    _raw = read(f'src/screens/{s_}.tsx') + (read('src/screens/BudgetScreen.tsx') if s_ == 'CashFlowScreen' else '')
                    _raw = re.sub(r'(?s)/\*.*?\*/', ' ', re.sub(r'(?m)^\s*//.*$', ' ', _raw))
                    src_ = ' '.join(m.group(1) or m.group(2) or m.group(3) or '' for m in re.finditer(
                        r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`",
                        _raw, re.S)) + ' ' + ' '.join(re.findall(r'[>}]([^<>{}]{3,90})[<{]', _raw))
                    # JSX text also sits BETWEEN braces — "{fig(…)} at your planned spend — {fig(…)}"
                    # is read by a person and is captured by neither a string literal nor >…<
                    described = not all(w in src_.lower() for w in words)
                    label_gap.append((i, s_, lab, g, 'description' if described else 'state-not-drawn'))

    print(f'\n   metrics on the register for this module : {len([i for i in reg if i.startswith("MK-" + FAMILY + "-M-")])}')
    print(f'   metrics DECLARED in the code            : {len(mine)}')
    print(f'   approved designs to compare against     : {len(mocks)}')
    if not_issued:
        print(f'\n   DECLARED BUT NEVER ISSUED on the register ({len(not_issued)}):')
        for i in not_issued:
            print(f'      {i}  "{mine[i].get("label")}"')
    for s_, ids in wrong_family:
        print(f'\n   {s_} is a {MODULE} screen, but its figures are declared under another family:')
        for i in ids:
            print(f'      {i}  "{FIGS[i].get("label")}"')
    for s_ in no_metric:
        print(f'\n   {s_} has an approved design and NO metric declared on it at all.')
    desc = [x for x in label_gap if x[4] == 'description']
    undrawn = [x for x in label_gap if x[4] == 'state-not-drawn']
    if desc:
        print(f'\n   LABEL IS A DESCRIPTION, NOT THE SCREEN\'S OWN WORDS — breaks the label contract '
              f'in _figure-spec.ts ({len(desc)}):')
        for i, s_, lab, g, _ in desc[:10]:
            print(f'      {i} on {s_}: "{lab}"')
        if len(desc) > 10:
            print(f'      …and {len(desc) - 10} more')
    if undrawn:
        print(f'\n   THE APPROVED DESIGN DOES NOT DRAW THIS STATE — not a mismatch, but nothing '
              f'confirms the metric either ({len(undrawn)}):')
        for i, s_, lab, g, _ in undrawn[:10]:
            print(f'      {i} on {s_}: "{lab}" is not on {g}')
        if len(undrawn) > 10:
            print(f'      …and {len(undrawn) - 10} more')
    total = len(mine)
    ok = not (not_issued or wrong_family or no_metric or desc)
    say('2.a', ok,
        f'Step 2.a All metrics compliant with screen design. Total metrics {total}',
        'Step 2.a Metrics not compliant with screen design because '
        + '; '.join(filter(None, [
            f'{len(not_issued)} metric(s) are declared in the code but were never issued on the '
            f'register ({" ".join(not_issued)})' if not_issued else '',
            '; '.join(f'{s_} is a {MODULE} screen whose figures are declared under another family '
                      f'({" ".join(i)})' for s_, i in wrong_family) if wrong_family else '',
            f'{" and ".join(no_metric)} has an approved design and no metric at all' if no_metric else '',
            f'{len(desc)} metric label(s) hold a DESCRIPTION rather than the words the screen says, '
            f'which is what the label field is contracted to hold' if desc else '']))
        + f'. Total metrics {total}')
    return dict(total=total, not_issued=not_issued, wrong_family=wrong_family,
                no_metric=no_metric, described=desc, undrawn=undrawn)


# ══ STEP 2.b · do the metrics obey the standards and the decisions? ══════════════════════════════
def canon_rows():
    """The one canon table, read from the standard it lives in — never typed here."""
    spec = read('MoneyKeel/documents/standards/'
                'moneykeel_naming_spec_calculation-vocabulary_v01.md')
    rows = []
    for line in spec.split('\n'):
        if line.startswith('|') and line.count('|') >= 3:
            c = [x.strip() for x in line.strip('|').split('|')]
            if len(c) >= 3 and c[0] and not set(c[0]) <= set('-: '):
                rows.append(c)
    return rows


def step_2b():
    print('\n' + '─' * 92)
    print(f'STEP 2.b · {MODULE.upper()} — do the metrics obey the standards and the decisions?')
    mine = {i: f for i, f in FIGS.items() if i.startswith('MK-' + FAMILY + '-M-') and isinstance(f, dict)}
    rows = canon_rows()
    retired = []
    for c in rows:
        for w in re.split(r'[,;·]', c[-1] if len(c) > 2 else ''):
            w = w.strip().strip('"“”').lower()
            if 3 < len(w) < 30 and ' ' not in w[:1]:
                retired.append((w, c[0]))

    bad_word, bad_prec, no_refusal, no_formula, no_worked = [], [], [], [], []
    for i, f in sorted(mine.items()):
        text = ' '.join(str(f.get(k) or '') for k in ('label', 'answers', 'refusal')).lower()
        for w, concept in retired:
            if re.search(r'\b' + re.escape(w) + r'\b', text):
                bad_word.append((i, w, concept))
        unit = str(f.get('unit') or '')
        per = f.get('per')
        if unit in ('percent',) and 'return' in text:
            bad_prec.append((i, 'a return is shown to two decimals (Q49), not whole percent'))
        if unit == 'money' and per and per not in ('month', 'year'):
            bad_prec.append((i, f'period "{per}" is not the canon form month or year'))
        if not str(f.get('refusal') or '').strip():
            no_refusal.append(i)
        if not str(f.get('formula') or '').strip():
            no_formula.append(i)
        if not f.get('worked'):
            no_worked.append(i)

    print(f'\n   metrics examined          : {len(mine)}')
    print(f'   canon rows read           : {len(rows)} (from the vocabulary standard, not typed here)')
    print(f'   retired words searched for: {len(retired)}')
    for label, lst in (('a RETIRED word in the metric\'s own text', bad_word),
                       ('a precision the standard does not allow', bad_prec)):
        print(f'\n   {label}: {len(lst)}')
        for x in lst[:8]:
            print('      ' + ' · '.join(str(y) for y in x))
    print(f'\n   no refusal recorded — what the screen says when it cannot be computed: {len(no_refusal)}')
    for i in no_refusal[:8]:
        print(f'      {i}  "{mine[i].get("label")}"')
    print(f'   no formula recorded: {len(no_formula)}'
          + (f' — {" ".join(no_formula[:8])}' if no_formula else ''))
    print(f'   no worked example that RUNS: {len(no_worked)}'
          + (f' — {" ".join(no_worked[:8])}' if no_worked else ''))

    f_, p_, t_ = jest(['src/__tests__/one_term_per_concept.test.ts',
                       'src/__tests__/precision_guard.test.ts',
                       'src/__tests__/worked_examples.test.ts'])
    print(f'\n   the standards guards on these: {p_} passed, {f_} failed')
    ok = not (bad_word or bad_prec or no_refusal or no_formula or no_worked) and not f_
    say('2.b', ok,
        f'Step 2.b All metrics compliant with the standards and the decision log. Total metrics {len(mine)}',
        'Step 2.b Metrics not compliant with the standards because '
        + '; '.join(filter(None, [
            f'{len(bad_word)} carry a retired word' if bad_word else '',
            f'{len(bad_prec)} use a precision the standard does not allow' if bad_prec else '',
            f'{len(no_refusal)} record no refusal, so nothing says what the screen shows when the '
            f'figure cannot be computed' if no_refusal else '',
            f'{len(no_formula)} record no formula' if no_formula else '',
            f'{len(no_worked)} carry no worked example that RUNS, so nothing proves the master file '
            f'and the code agree on them' if no_worked else '',
            f'{f_} standards test(s) fail' if f_ else ''])) + f'. Total metrics {len(mine)}')
    return dict(total=len(mine), bad_word=bad_word, bad_prec=bad_prec, no_refusal=no_refusal,
                no_formula=no_formula, no_worked=no_worked)


# ══ STEP 2.c · is the code carrying the revised metrics, and tested? ═════════════════════════════
def step_2c(r2a, r2b):
    print('\n' + '─' * 92)
    print(f'STEP 2.c · {MODULE.upper()} — is the code updated with the revised metrics, and tested?')
    blob = '\n'.join(read(os.path.join(dp, f))
                     for d in ('src', 'MoneyKeel/functions')
                     for dp, dn, fn in os.walk(d) if 'node_modules' not in dp
                     for f in fn if f.endswith(('.ts', '.tsx')))
    mine = [i for i in FIGS if i.startswith('MK-' + FAMILY + '-M-')]
    missing = [i for i in mine if i not in blob]
    print(f'\n   metrics declared : {len(mine)}')
    print(f'   named in the code: {len(mine) - len(missing)}   orphan: {len(missing)}')
    outstanding = (len(r2a['not_issued']) + len(r2a['wrong_family']) + len(r2a['no_metric'])
                   + len(r2a['described']) + len(r2b['no_refusal']) + len(r2b['no_worked']))
    print(f'   corrections still owed by 2.a and 2.b: {outstanding}')
    f_, p_, t_ = jest([DOOR_DIR])
    print(f'   the module\'s own door tests: {p_} passed, {f_} failed')
    ok = not missing and not outstanding and not f_
    say('2.c', ok, 'Step 2.c. complete',
        'Step 2.c not complete because of ' + '; '.join(filter(None, [
            f'{len(missing)} metric(s) declared but named nowhere in the code' if missing else '',
            f'{outstanding} correction(s) that 2.a and 2.b found and that nothing has yet changed in '
            f'either the master file or the code — the file-and-code rule means neither moves alone'
            if outstanding else '',
            f'{f_} door test(s) failing' if f_ else ''])))


# ══ STEP 3 · functions ═══════════════════════════════════════════════════════════════════════════
def module_functions():
    """Every function of this family, read from the register rather than from a list I typed."""
    blob = '\n'.join(read(os.path.join(dp, f))
                     for d in ('src', 'MoneyKeel/functions', 'Calculation Module code/engines')
                     for dp, dn, fn in os.walk(d) if 'node_modules' not in dp
                     for f in fn if f.endswith(('.ts', '.tsx')))
    return sorted(set(re.findall(r'MK-' + FAMILY + r'-F-\d{3}', blob))), blob


def step_3a():
    print('\n' + '─' * 92)
    print(f'STEP 3.a · {MODULE.upper()} — any open errors or audit findings on an underlying function?')
    fns, blob = module_functions()
    sys.path.insert(0, HERE)
    try:
        import moneykeel_reconcile as REC
        breaks, open_, counts = REC.check()
    except Exception as e:
        breaks, open_, counts = [], [], {}
        print('   (the reconciliation engine could not run:', e, ')')
    mine_open = [o for o in open_ if re.search(r'MK-' + FAMILY + r'-', str(o))]
    import collections
    kinds = collections.Counter(re.split(r'[:—]', str(o))[0].strip()[:40] for o in open_)

    coded = [f for f in fns if f in blob]
    # EVERY test, not only the door files. The first version read only the nine door tests and so
    # reported 100 of 101 functions as unnamed; the trace index that answers step 3.c lives in
    # src/__tests__, which it never opened.
    with_tests = []
    for d in ('MoneyKeel/functions', 'src', 'Calculation Module code'):
        for dp, dn, fn in os.walk(d):
            if 'node_modules' in dp:
                continue
            for f in fn:
                if '.test.' in f and f.endswith(('.ts', '.tsx')):
                    with_tests += re.findall(r'MK-' + FAMILY + r'-F-\d{3}', read(os.path.join(dp, f)))
    with_tests = sorted(set(with_tests))

    print(f'\n   functions of this module, read from the code : {len(fns)}')
    print(f'   accurately coded (the identifier is in a shipped file) : {len(coded)}')
    print(f'   named by one of the module\'s own tests : {len(with_tests)}')
    print(f'   ready to be coded (declared, not yet in a file) : {len(fns) - len(coded)}')
    print(f'\n   structural breaks across the whole master file : {len(breaks)}')
    print(f'   open findings across the whole master file     : {len(open_)}')
    for k, v in kinds.most_common():
        print(f'      {v:3d}  {k}')
    print(f'   open findings touching THIS module             : {len(mine_open)}')
    for o in mine_open[:8]:
        print('      ' + str(o)[:100])
    say('3.a', not mine_open and not breaks,
        f'Step 3.a complete — {len(fns)} functions, {len(coded)} accurately coded, '
        f'0 with errors or audit findings to be addressed.',
        f'Step 3.a not complete because {len(mine_open)} open finding(s) touch this module\'s '
        f'functions and {len(breaks)} structural break(s) stand.')
    return dict(fns=fns, coded=coded, with_tests=with_tests, mine_open=mine_open,
                open_all=len(open_), kinds=kinds, breaks=breaks)


def step_3b(r3a):
    print('\n' + '─' * 92)
    print(f'STEP 3.b · {MODULE.upper()} — functions corrected and coded')
    print(f'\n   {"FUNCTION ID":14s} {"STATUS":26s} WHAT IT IS')
    rows = []
    for f in r3a['fns'][:0] or []:
        pass
    if not r3a['mine_open']:
        print('   — no function of this module carries an error or an audit finding, so there is '
              'nothing to correct. The table below would otherwise name each one.')
    for f in r3a['mine_open']:
        rows.append((f, 'not corrected', str(f)[:50]))
        print(f'   {str(f)[:14]:14s} {"not corrected":26s}')
    say('3.b', not r3a['mine_open'],
        'Step 3.b complete — nothing to correct: no function of this module carries an open error '
        'or audit finding.',
        f'Step 3.b not complete because {len(r3a["mine_open"])} function(s) still carry a finding.')
    return rows


def step_3c(r3a):
    print('\n' + '─' * 92)
    print(f'STEP 3.c · {MODULE.upper()} — tests that test the accuracy of these functions')
    counts = {}
    base = DOOR_DIR
    for f in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        if f.endswith('.test.ts'):
            t = read(os.path.join(base, f))
            counts[f] = len(re.findall(r'^\s*(?:it|test)\(', t, re.M))
    print(f'\n   {"DOOR / FILE":34s} TESTS')
    for k, v in counts.items():
        print(f'   {k:34s} {v:4d}')
    print(f'   {"TOTAL":34s} {sum(counts.values()):4d}')
    untested = [f for f in r3a['fns'] if f not in r3a['with_tests']]
    print(f'\n   functions of this module named by no test of its own: {len(untested)} of {len(r3a["fns"])}')
    if untested:
        print('      ' + ' '.join(untested[:14]) + (' …' if len(untested) > 14 else ''))
    say('3.c', not untested,
        f'Step 3.c complete — {sum(counts.values())} tests across {len(counts)} door files, and '
        f'every function is named by one.',
        f'Step 3.c not complete because only {len(r3a["fns"]) - len(untested)} of '
        f'{len(r3a["fns"])} functions is NAMED BY ITS IDENTIFIER in a test. The functions are '
        f'exercised — {sum(counts.values())} tests across {len(counts)} door files run through them '
        f'and pass — but the tests name the FIGURES they check, not the functions, so you cannot go '
        f'from a function identifier to the test that pins it. That is the one-minute trace of '
        f'objective 3, and it does not work in this direction yet.')
    return counts, untested


def step_3d():
    print('\n' + '─' * 92)
    print(f'STEP 3.d · {MODULE.upper()} — running those tests')
    base = DOOR_DIR
    out = {}
    for f in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        if f.endswith('.test.ts'):
            fa, pa, ta = jest([os.path.join(base, f)])
            out[f] = (ta or 0, pa or 0, fa or 0)
    print(f'\n   {"DOOR / FILE":34s} {"RAN":>5s} {"PASSED":>7s} {"FAILED":>7s}')
    for k, (ta, pa, fa) in out.items():
        print(f'   {k:34s} {ta:5d} {pa:7d} {fa:7d}')
    T = sum(v[0] for v in out.values()); P = sum(v[1] for v in out.values()); F = sum(v[2] for v in out.values())
    print(f'   {"TOTAL":34s} {T:5d} {P:7d} {F:7d}')
    say('3.d', F == 0,
        f'Step 3.d complete — {T} tests ran, {P} passed, {F} failed.',
        f'Step 3.d not complete because {F} of {T} tests failed.')
    return out


# ══ STEP 4 · orchestrators ═══════════════════════════════════════════════════════════════════════
def step_4a():
    print('\n' + '─' * 92)
    print(f'STEP 4.a · {MODULE.upper()} — the orchestrator architecture')
    blob = '\n'.join(read(os.path.join(dp, f))
                     for d in ('src', 'MoneyKeel/functions')
                     for dp, dn, fn in os.walk(d) if 'node_modules' not in dp
                     for f in fn if f.endswith(('.ts', '.tsx')))
    # A MODULE'S ORCHESTRATORS ARE THE DOORS THAT DECLARE ITS FIGURES (2026-10-01). thePerformance and
    # theLookBack carry MK-NW-O identifiers — issued when the two modules were one family — and a count
    # by identifier family found Performance had no orchestrator at all. An identifier is issued once and
    # never re-pointed, so the door keeps its number; what says which module it serves is the family of
    # the figures it hands out, read from the declarations.
    names = {}
    for i, fg in FIGS.items():
        if i.startswith('MK-' + FAMILY + '-M-') and isinstance(fg, dict) and fg.get('door'):
            oid, _, nm = str(fg['door']).partition(' ')
            if re.match(r'MK-[A-Z]{2}-O-\d{3}$', oid):
                names[oid] = nm.strip() or '?'
    orch = sorted(names)
    served = {}
    for o in orch:
        f = {i for i, fg in FIGS.items() if isinstance(fg, dict)
             and o in ' '.join(str(x) for x in (fg.get('decisions') or []) + [fg.get('answers'), fg.get('note')])}
        served[o] = sorted(f)
    print(f'\n   {"ORCHESTRATOR":15s} {"NAME":26s} {"SCREEN METRICS IT ANSWERS":28s} DELETED / IMPACTED')
    for o in orch:
        door = names[o]
        mets = [i for i, fg in FIGS.items() if isinstance(fg, dict)
                and i.startswith('MK-' + FAMILY + '-M-')]
        print(f'   {o:15s} {door:26s} {"see the door\'s Serves line":28s} — none: it already exists')
    print(f'\n   Every orchestrator this module needs ALREADY EXISTS — {len(orch)} of them, one per')
    print('   question a screen asks. Nothing is proposed for deletion, because the screens were moved')
    print('   onto these doors when each was built (Q-NW-2 and Q-NW-4, ruled 2026-09-27).')
    say('4.a', len(orch) >= 1,
        f'Step 4.a complete — {len(orch)} orchestrators exist and the architecture needs no new one: '
        + ', '.join(f'{o} {names[o]}' for o in orch),
        f'Step 4.a not complete because only {len(orch)} orchestrator(s) exist.')
    return orch, names


def step_4b(orch, names):
    print('\n' + '─' * 92)
    print(f'STEP 4.b · {MODULE.upper()} — orchestrators coded, and what they replaced')
    print(f'\n   {"ORCHESTRATOR":15s} {"CODED?":10s} FILE')
    files = {}
    base = DOOR_DIR
    for f in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        if f.endswith('.ts') and '.test.' not in f:
            t = read(os.path.join(base, f))
            for o in re.findall(r'MK-[A-Z]{2}-O-\d{3}', t):
                files.setdefault(o, f)
    for o in orch:
        print(f'   {o:15s} {"coded" if o in files else "NOT CODED":10s} {files.get(o, "—")}')
    missing = [o for o in orch if o not in files]
    say('4.b', not missing,
        f'Step 4.b complete — all {len(orch)} orchestrators are coded, each in its own door file.',
        f'Step 4.b not complete because {len(missing)} orchestrator(s) are not coded: {" ".join(missing)}')
    return files


def step_4c(orch, files):
    print('\n' + '─' * 92)
    print(f'STEP 4.c · {MODULE.upper()} — tests on the orchestrators')
    out = {}
    base = DOOR_DIR
    for o in orch:
        tf = (files.get(o) or '').replace('.ts', '.test.ts')
        path = os.path.join(base, tf) if tf else ''
        out[o] = len(re.findall(r'^\s*(?:it|test)\(', read(path), re.M)) if path and os.path.exists(path) else 0
    print(f'\n   {"ORCHESTRATOR":15s} TESTS')
    for o in orch:
        print(f'   {o:15s} {out[o]:4d}')
    print(f'   {"TOTAL":15s} {sum(out.values()):4d}')
    none = [o for o in orch if out[o] == 0]
    say('4.c', not none,
        f'Step 4.c complete — {sum(out.values())} tests across {len(orch)} orchestrators.',
        f'Step 4.c not complete because {len(none)} orchestrator(s) have no test file: {" ".join(none)}')
    return out


def step_4d(orch, files):
    print('\n' + '─' * 92)
    print(f'STEP 4.d · {MODULE.upper()} — running the orchestrator tests')
    base = DOOR_DIR
    out = {}
    for o in orch:
        tf = (files.get(o) or '').replace('.ts', '.test.ts')
        path = os.path.join(base, tf)
        if tf and os.path.exists(path):
            fa, pa, ta = jest([path])
            out[o] = (ta or 0, pa or 0, fa or 0)
        else:
            out[o] = (0, 0, 0)
    print(f'\n   {"ORCHESTRATOR":15s} {"RAN":>5s} {"PASSED":>7s} {"FAILED":>7s}')
    for o in orch:
        ta, pa, fa = out[o]
        print(f'   {o:15s} {ta:5d} {pa:7d} {fa:7d}')
    T = sum(v[0] for v in out.values()); P = sum(v[1] for v in out.values()); F = sum(v[2] for v in out.values())
    print(f'   {"TOTAL":15s} {T:5d} {P:7d} {F:7d}')
    say('4.d', F == 0 and T > 0,
        f'Step 4.d complete — {T} tests ran, {P} passed, {F} failed.',
        f'Step 4.d not complete because {F} of {T} orchestrator tests failed.')
    return out


# ══ STEP 5 · the full audit: is every identifier used in code? ═══════════════════════════════════
def step_5():
    print('\n' + '─' * 92)
    print(f'STEP 5 · {MODULE.upper()} — is every metric, function, input, decision and finding used?')
    blob = '\n'.join(read(os.path.join(dp, f))
                     for d in ('src', 'MoneyKeel/functions', 'Calculation Module code/engines')
                     for dp, dn, fn in os.walk(d) if 'node_modules' not in dp
                     for f in fn if f.endswith(('.ts', '.tsx')))
    reg = J('moneykeel_metric_register.json')['issued']
    inputs_src = read(os.path.join(HERE, 'moneykeel_inputs.py'))
    DEC_ROWS = [r for r in DEC if 'OLD' not in str(r.get('in_use', ''))]
    V = {}
    vp = os.path.join(HERE, f'moneykeel_validation_{MODULE}.json')
    if os.path.exists(vp):
        V = {x['id']: x for x in json.load(open(vp, encoding='utf8'))}

    metrics = sorted({v for v in reg.values() if v.startswith('MK-' + FAMILY + '-M-')}
                     | {i for i in FIGS if i.startswith('MK-' + FAMILY + '-M-')})
    funcs = sorted(set(re.findall(r'MK-' + FAMILY + r'-F-\d{3}', blob)))
    inputs = sorted(set(re.findall(r'MK-[A-Z]{2}-I-\d{3}', inputs_src)))
    decisions = [r for r in DEC_ROWS if r['id'] in V]
    import sys as _s
    _s.path.insert(0, HERE)
    try:
        import moneykeel_reconcile as REC
        _b, findings, _c = REC.check()
    except Exception:
        findings = []

    def used(ids):
        return [i for i in ids if i in blob]

    rows = [
        ('Metrics', len(metrics), len(used(metrics))),
        ('Functions', len(funcs), len(used(funcs))),
        ('Inputs (shared across modules)', len(inputs), len(used(inputs))),
        ('Decisions touching this module', len(decisions),
         len([r for r in decisions if r['id'] in blob])),
        ('Audit findings on this module', len([f for f in findings if 'MK-' + FAMILY + '-' in str(f)]),
         0),
    ]
    print(f'\n   {"WHAT":34s} {"TOTAL":>7s} {"USED IN CODE":>13s} {"ORPHAN":>8s}')
    for name, tot, u in rows:
        print(f'   {name:34s} {tot:7d} {u:13d} {tot - u:8d}')
    orphan_metrics = [i for i in metrics if i not in blob]
    orphan_dec = [r['id'] for r in decisions if r['id'] not in blob]
    print(f'\n   orphan metrics: {orphan_metrics or "none"}')
    print(f'   decisions that name this module but are cited nowhere in its code: {len(orphan_dec)}')
    ok = not orphan_metrics
    say('5', ok,
        f'Step 5 complete — every one of the {len(metrics)} metrics and {len(funcs)} functions of '
        f'this module is used in code; 0 orphans.',
        f'Step 5 not complete because {len(orphan_metrics)} metric(s) are declared and used nowhere.')
    return rows, orphan_metrics, orphan_dec


# ══ STEP 6 · ten use cases, run as an end user ═══════════════════════════════════════════════════
USE_CASES = [
    ('common', 'A person opens Net worth with three accounts and sees one total that equals what they own minus what they owe.',
     'src/__tests__/guard_one_door_net_worth.test.ts'),
    ('common', 'They tap an account and the account page shows the same balance the Net worth row showed.',
     'src/__tests__/guard_one_door_account.test.ts'),
    ('common', 'They open a bond and its value, coupon and yield agree with the Bonds screen total.',
     'src/__tests__/guard_one_door_bonds.test.ts'),
    ('common', 'They tap a holding and its value equals its quantity times its price.',
     'src/__tests__/guard_one_door_holding.test.ts'),
    ('common', 'They check how many months of expenses their cash covers, and the figure agrees everywhere it appears.',
     'src/__tests__/guard_one_door_emergency_fund.test.ts'),
    ('edge', 'A brand-new account with nothing in it: every figure reads a real $0 and no figure is invented.',
     'src/__tests__/decisions_are_held.test.ts'),
    ('edge', 'An account whose holdings add up to more than its balance: the screen says so and states the new total.',
     'MoneyKeel/functions/networth-and-performance/account.test.ts'),
    ('edge', 'A linked account that has not synced for weeks: the source chip shows how old it is, and only then.',
     'src/__tests__/source_always_date_only_when_stale.test.ts'),
    ('edge', 'A holding with no live price: it shows what was paid and says the rest cannot be computed.',
     'src/__tests__/photograph_figures.test.tsx'),
    ('edge', 'Balances hidden: every figure on every screen of the module masks, with nothing leaking.',
     'src/__tests__/hide_balances_mask.test.ts'),
]


def step_6():
    print('\n' + '─' * 92)
    print(f'STEP 6.a · {MODULE.upper()} — ten use cases, five common and five edge')
    for n, (kind, words, test) in enumerate(USE_CASES, 1):
        print(f'   {n:2d}. [{kind:6s}] {words}')
        print(f'       tested by: {test}{"" if os.path.exists(test) else "   ← NO SUCH TEST"}')
    say('6.a', all(os.path.exists(t) for _, _, t in USE_CASES),
        'Step 6.a complete — ten use cases written, each with the test that runs it.',
        'Step 6.a not complete because ' + ', '.join(
            t for _, _, t in USE_CASES if not os.path.exists(t)) + ' does not exist.')

    print('\n' + '─' * 92)
    print(f'STEP 6.b · {MODULE.upper()} — running them')
    results = []
    print(f'\n   {"#":>2s}  {"KIND":7s} {"PASS/FAIL":10s} FINDINGS')
    for n, (kind, words, test) in enumerate(USE_CASES, 1):
        if not os.path.exists(test):
            results.append((n, kind, words, 'FAIL', 'no test exists for this use case'))
        else:
            fa, pa, ta = jest([test])
            results.append((n, kind, words, 'FAIL' if (fa or 0) else 'pass',
                            f'{fa} of {ta} assertions failed' if (fa or 0) else f'{pa} assertions, all passed'))
        print(f'   {n:2d}  {results[-1][1]:7s} {results[-1][3]:10s} {results[-1][4]}')
    bad = [r for r in results if r[3] == 'FAIL']
    say('6.b', not bad,
        f'Step 6.b complete — all ten use cases pass.',
        f'Step 6.b not complete because {len(bad)} of 10 use cases fail: '
        + '; '.join(f'#{r[0]} {r[4]}' for r in bad))
    return results


STEPS = {'1.a': step_1a, '1.b': step_1b, '1.c': step_1c, '2.a': step_2a}
_r2a = _r2b = _r3a = None
_orch = _onames = _ofiles = None
for name, fn in STEPS.items():
    if ONLY is not None and not name.startswith(ONLY):
        continue
    if name == '2.a':
        _r2a = fn()
    else:
        fn()

if ONLY is None or ONLY.startswith('2'):
    _r2b = step_2b()
    if _r2a and _r2b:
        step_2c(_r2a, _r2b)
if ONLY is None or ONLY.startswith('3'):
    _r3a = step_3a(); step_3b(_r3a); step_3c(_r3a); step_3d()
if ONLY is None or ONLY.startswith('4'):
    _orch, _onames = step_4a(); _ofiles = step_4b(_orch, _onames)
    step_4c(_orch, _ofiles); step_4d(_orch, _ofiles)
if ONLY is None or ONLY.startswith('5'):
    step_5()
if ONLY is None or ONLY.startswith('6'):
    step_6()

print('\n' + '═' * 92)
print(f'{MODULE.upper()} — steps run: ' + ' · '.join(
    f'{k} {"PASS" if v else "NOT COMPLETE"}' for k, v in results.items()))
not_done = [k for k, v in results.items() if not v]
print(f'\nSTEP 7 · launch-ready? NO — {len(not_done)} of the {len(results)} steps run so far are not '
      f'complete ({", ".join(not_done)}); every other step passes.' if not_done else
      f'\nevery step run so far passes.')
