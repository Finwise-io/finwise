#!/usr/bin/env python3
"""DOES THE APP ACTUALLY OBEY HIS DECISIONS? — module by module, against the real artefacts.

Founder, 2026-10-01:
    *"First go and validate does existing screen mock ups, metrics, functions, code - comply with
    these decision or not. Go module by module - first run the validation test for NW module (all
    screens, all metrics, all functions, every line of code)."*

Mapping a decision to where it applies says WHERE to look. This looks. For every decision touching a
module it opens the figures, the doors, the screens and the mocks it governs and asks whether they
obey it — not whether a test exists, which is a different question.

FOUR CHECKS, and each says which one it ran, so a verdict can be re-read:

  EXISTS      every artefact the decision names is really there. A decision governing a figure that
              was renamed, or a file that was deleted, is a broken record — and that is how a ruling
              quietly stops applying to anything.
  FORBIDS     where the decision says a thing is REMOVED, RETIRED, NEVER or REPLACED, the forbidden
              words are searched for in the artefacts it governs. His "no more donut on NW" is this
              shape, and so is every empty-state rule that bans an invented $0.
  REQUIRES    where the decision QUOTES exact copy, that copy must appear in something a person reads.
  TRACE       everything else, and most decisions are here. His requirement's own distinctive words
              are looked for in the artefact that implements it — the figure's declaration, the door's
              arithmetic, the screen's copy, the mock's face. A decision about ordering by liquidity
              leaves the word liquidity somewhere, or it was never applied. This is TRIAGE, not proof:
              LEAVES A TRACE means read it to confirm, NO TRACE means read it first, and neither is
              reported as compliant. A validator that calls its own blind spots passing is worse
              than none.
  CITED       and, since the headers now carry the back-link, whether the code implementing the
              figure names the decision it answers to.

    python3 "Calculation Module code/scripts/validate-module-complies.py" networth
"""
import json, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)

MODULE = (sys.argv[1] if len(sys.argv) > 1 else 'networth').lower()
FAMILY = {'networth': 'NW', 'cashflow': 'CF', 'performance': 'PF', 'plan': 'PL',
          'home': 'HM', 'menu': 'MN'}[MODULE]
# WHICH SCREENS THIS MODULE REACHES — READ, never remembered.
#
# The first run of this used a list of ten screen names I typed from memory, and it was short by two:
# Home and Insights both print Net worth figures and neither was in it. That is the exact failure the
# standing order of 2026-09-28 is about — a filter written from my memory of the data, reporting clean
# while looking at a fraction — and it nearly hid the breach this validation actually found, which was
# only caught by searching the whole of src by hand.
#
# So the list comes from the figures themselves: every figure of this family declares the routes it
# appears on, and each route file in app/ names the screen component it renders. Nothing is typed.
ROUTE_TO_SCREEN = {}
for _dp, _dn, _fn in os.walk('app'):
    for _f in _fn:
        if not _f.endswith('.tsx') or _f.startswith('_'):
            continue
        _path = os.path.join(_dp, _f)
        try:
            _src = open(_path, encoding='utf8', errors='ignore').read()
        except OSError:
            continue
        _m = re.search(r"screens/([A-Za-z]+)", _src)
        if _m:
            ROUTE_TO_SCREEN['/' + os.path.splitext(_f)[0]] = _m.group(1)
ROUTE_TO_SCREEN['/analytics'] = ROUTE_TO_SCREEN.get('/analytics', 'NetWorthScreen')
ROUTE_TO_SCREEN.setdefault('/networth', 'NetWorthScreen')

_routes, _unmapped = set(), set()
for _i, _f in json.load(open(os.path.join(HERE, 'moneykeel_figures.json'),
                             encoding='utf8'))['figures'].items():
    if _i.startswith('MK-' + FAMILY + '-') and isinstance(_f, dict):
        for _r in (_f.get('screens') or []):
            (_routes if _r in ROUTE_TO_SCREEN else _unmapped).add(_r)
SCREENS = sorted({ROUTE_TO_SCREEN[r] for r in _routes})
# plus the screens the module owns outright, which a figure may not have reached yet
SCREENS = sorted(set(SCREENS) | {
 # the SEVEN the module owns (his scope, 2026-10-01, DEC-0649). Compliance also reads the screens
 # owned elsewhere that print one of its figures — Home, Insights and Job safety — because they are
 # still bound by its decisions; they come in through the register below, not through this list.
 # Import holdings and Stress test print no Net worth figure at all and so drop out of both.
 'networth': {'NetWorthScreen', 'AccountPortfolioScreen', 'ItemizeScreen', 'HoldingDetailScreen',
              'BondsScreen', 'OtherInvestmentsScreen', 'AddAccountScreen'},
 'cashflow': {'CashFlowScreen', 'BudgetScreen', 'MonthDetailScreen', 'IncomeManagerScreen',
              'IncomeDetailScreen', 'IncomeScreen', 'MonthlyIncomeScreen', 'PaycheckMonthsScreen',
              'BillCalendarScreen', 'WorthALookScreen', 'ContributionRoomScreen', 'TaxOrganizerScreen'},
 'performance': {'PerformanceScreen', 'AccountPortfolioScreen', 'HoldingDetailScreen', 'LookBackScreen'},
}.get(MODULE, set()))
DOORS = 'MoneyKeel/functions/networth-and-performance' if MODULE in ('networth', 'performance') \
        else 'MoneyKeel/functions/' + MODULE
MOCKS = {'networth': 'MoneyKeel/documents/networth-and-performance',
         'performance': 'MoneyKeel/documents/networth-and-performance',
         'cashflow': 'MoneyKeel/documents/cashflow'}.get(MODULE)

DEC = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))['rows']
FIGS = json.load(open(os.path.join(HERE, 'moneykeel_figures.json')))['figures']
ISSUED = set(FIGS)
for _src, _key in (('moneykeel_metric_register.json', 'issued'),
                   ('moneykeel_function_register.json', None)):
    try:
        _d = json.load(open(os.path.join(HERE, _src), encoding='utf8'))
        ISSUED |= set(re.findall(r'MK-[A-Z]{2}-[MFOI]-\d{3}', json.dumps(_d)))
    except (OSError, ValueError):
        pass
try:
    ISSUED |= set(re.findall(r'MK-[A-Z]{2}-[MFOI]-\d{3}',
                             open(os.path.join(HERE, 'moneykeel_inputs.py'), encoding='utf8').read()))
except OSError:
    pass

for _i, _f in FIGS.items():
    if isinstance(_f, dict):
        _f['_text'] = ' '.join(str(v) for k, v in _f.items()
                               if k in ('label', 'answers', 'formula', 'refusal', 'note', 'grain')
                               or k == 'decisions').lower()
IDENT = re.compile(r'MK-[A-Z]{2}-[MFOI]-\d{3}')
STOP = set('''about above after again against already also always another answer answers anything
 because been before being below better between both called cannot change changed changes could
 decision decisions different does doing done during each either enough every everything except
 figure figures first from gets give given gives going have having here himself house instead into
 itself just know later less like line lines little long look looks made make makes many means
 might more most much must name named names need needs never nothing number numbers often once
 only other others ought over owns part people person place places plain point points quite
 rather read really right rows said same says screen screens seen separate shall should show
 shows since some something sort still such take takes than that their them then there these
 they thing things think this those three through time times today total totals under until
 upon used uses using very want wants were what when where which while will with within without
 word words work works would your yours thats were also however exactly simply already therefore
 whether anyone someone everyone across along around behind beyond during except inside outside
 toward unless whereas wherever whenever'''.split())
FILEREF = re.compile(r'[\w./\-]+\.(?:tsx|ts|md|html)\b')   # tsx BEFORE ts, or every .tsx reads as a missing .ts

STRIP = re.compile(r'(?s)/\*.*?\*/|^\s*//.*?$|(?<![:\w])//[^\n\u201c\u201d"]*$', re.M)
LITERAL = re.compile(r"""\'((?:[^\'\\\n]|\\.)*)\'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`""", re.S)

def visible(src):
    """What a PERSON can read, and nothing else.

    A door and a screen both carry my comments, and those comments quote his decisions word for word
    — so searching the raw file for his wording finds my own notes and calls it shipped copy. Only
    string literals reach a person's eyes, so only they are searched."""
    body = STRIP.sub(' ', src)
    return ' \u00b7 '.join(m.group(1) or m.group(2) or m.group(3) or '' for m in LITERAL.finditer(body))


def read(p):
    try:
        return open(p, encoding='utf8', errors='ignore').read()
    except OSError:
        return None

# ── everything a person could meet, for this module ─────────────────────────────────────────────
ART = {}
for s in SCREENS:
    t = read(f'src/screens/{s}.tsx')
    if t is not None:
        ART[f'src/screens/{s}.tsx'] = t
if os.path.isdir(DOORS):
    for f in sorted(os.listdir(DOORS)):
        if f.endswith('.ts') and '.test.' not in f:
            ART[os.path.join(DOORS, f)] = read(os.path.join(DOORS, f)) or ''
VIS = {p: visible(t) for p, t in ART.items()}
TESTS = {}
for _d in ('src/__tests__', 'MoneyKeel/functions', 'Calculation Module code'):
    for _dp, _dn, _fn in os.walk(_d):
        if 'node_modules' in _dp:
            continue
        for _f in _fn:
            if '.test.' in _f and _f.endswith(('.ts', '.tsx')):
                TESTS[os.path.join(_dp, _f)] = read(os.path.join(_dp, _f)) or ''
MOCK_TEXT = {}
if MOCKS and os.path.isdir(MOCKS):
    for f in sorted(os.listdir(MOCKS)):
        if f.endswith('.html'):
            raw = read(os.path.join(MOCKS, f)) or ''
            MOCK_TEXT[os.path.join(MOCKS, f)] = re.sub(r'<[^>]+>', ' ', re.sub(r'(?s)<(script|style).*?</\1>', '', raw))

ON_DISK = set()
for _dp, _dn, _fn in os.walk('.'):
    if any(b in _dp for b in ('/node_modules', '/.git', '/ios/Pods', '/archive')):
        continue
    _dn[:] = [d for d in _dn if d not in ('node_modules', '.git', 'Pods')]
    for _f in _fn:
        ON_DISK.add(os.path.join(_dp, _f).lstrip('./'))
        ON_DISK.add(_f)


ALL_VIS = {}
for _dp, _dn, _fn in os.walk('src'):
    _dn[:] = [d for d in _dn if d not in ('node_modules', '__tests__', '__snapshots__')]
    for _f in _fn:
        if _f.endswith(('.ts', '.tsx')) and '.test.' not in _f:
            ALL_VIS[os.path.join(_dp, _f)] = visible(read(os.path.join(_dp, _f)) or '')


# THE SCREENS THIS MODULE OWNS, as against the ones it merely reads. One list, used by both the scope
# test and the line that prints the split, so they cannot disagree.
OWNED = {
 'networth': {'NetWorthScreen', 'AccountPortfolioScreen', 'ItemizeScreen', 'HoldingDetailScreen',
              'BondsScreen', 'OtherInvestmentsScreen', 'AddAccountScreen'},
 'performance': {'PerformanceScreen', 'AccountPortfolioScreen', 'HoldingDetailScreen', 'LookBackScreen'},
}.get(MODULE, set())


def touches(x):
    """Does this decision GOVERN this module, or merely share a word with it?

    The first version counted any decision whose tab is this module's, which pulled in 35 decisions
    that govern nothing here — DEC-0005 governs the Plan hub and Home and touches no Net worth figure
    at all. Counting those made the module fail on other modules' work: of 118 unconfirmed decisions,
    only 23 came from this module's own tab.

    So the test is what it GOVERNS: a figure, function or orchestrator of this family, or one of the
    module's own screens, or one of its doors. A decision filed on this tab that governs nothing here
    is not this module's to answer for.
    """
    g = str(x.get('governs', ''))
    if re.search(r'MK-' + FAMILY + r'-[MFOI]-', g):
        return True
    # ONLY THE SCREENS THIS MODULE OWNS. SCREENS also holds the screens owned elsewhere that print
    # one of its figures — Home, Insights, Job safety — because their FIGURES must agree. But a
    # decision about one of those screens in general is that module's, not this one's. Matching on
    # the whole list pulled in DEC-0267, which governs the vocabulary standard and the Home screen and
    # nothing here at all, and sent me editing onboarding and cash-flow copy while he had scoped me
    # to Net worth. His words: *"There is no place surplus is displayed in NW module."*
    if any(s in g for s in OWNED):
        return True
    door = DOORS.split('/')[-1]
    return bool(door) and door in g

TODO = [x for x in DEC if 'OLD' not in str(x.get('in_use', '')) and touches(x)]

# words that mark a decision as FORBIDDING something
FORBID = re.compile(r'\b(removed?|retired?|never|no more|replaced by|comes off|is gone|rejected|'
                    r'not shown|must not|cannot|forbid)', re.I)
QUOTED = re.compile(r'[“"]([^”"]{6,80})[”"]')
# WHAT IS NOT COPY, and so can never be required to appear on a screen:
#   an instruction to me          — "add both…", "approve all 25"
#   a worked illustration         — "$16,907 dividends", "78% odds of lasting to age 90",
#                                   "3 CDs and 1 Treasury in this account": the template is the copy,
#                                   the numbers are one person's data
#   him describing a person       — "it will give user view of what they can do in the app"
# Each of these produced a miss the app could never clear, which is a false finding, and a validator
# that cries wolf 31 times is one he stops reading.
NOT_COPY = re.compile(r'^(add|build|approve|remove|use|keep|make|show me|drop|rename|move|order|'
                      r'merge|split|fix|check|confirm|answer|apply|pick|put|give)\b', re.I)
ILLUSTRATION = re.compile(r'[\$\u2212+]?\d[\d,]*(\.\d+)?\s*%?')
HIS_PROSE = re.compile(r'\b(user|users|the app|we |i |my |his |he )', re.I)
COPYISH = re.compile(r'\b(says?|said|reads?|label(?:led|s)?|titled?|the words?|copy|wording|'
                     r'shows?|shown|displays?|header|heading|button|caption|line reads|on screen|'
                     r'screen says|print(?:s|ed)?|text|sub(?:head|title|line)|empty state|refus\w+)\b', re.I)

verdicts = []
checked_artefacts = set()

for x in TODO:
    g = str(x.get('governs', ''))
    text = ' '.join(str(x.get(k) or '') for k in ('his_words', 'plain', 'means'))
    idents = sorted(set(IDENT.findall(g)))
    files = sorted(set(FILEREF.findall(g)))
    notes, verdict, check = [], None, None

    # 1 · EXISTS
    missing = [i for i in idents if i not in ISSUED]
    gone = [f for f in files
            if not os.path.exists(f) and '§' not in f and not ON_DISK & {f, os.path.basename(f)}
            and not any(q.endswith('/' + f) for q in ON_DISK)]
    if 'NOT BUILT' in g:
        verdict, check = 'NOT BUILT', 'EXISTS'
        notes.append('the decision itself records that nothing implements it')
    elif missing or gone:
        verdict, check = 'BROKEN RECORD', 'EXISTS'
        notes.append('names what is not there: ' + ' '.join(missing + gone))

    # the artefacts this decision's compliance would be read in
    mine = {p: t for p, t in VIS.items() if any(f in p for f in files)} or dict(VIS)
    for i in idents:
        if i in FIGS:
            checked_artefacts.add(i)
    checked_artefacts.update(mine)

    # 2 and 3 · a quoted phrase is FORBIDDEN or REQUIRED by the words standing next to it
    #
    # One regex cannot tell "we say ‘cash in this account’" from "‘cash’ is never shown" — both
    # carry a quote and the second carries a ban. So each quote is judged by its own neighbourhood:
    # the clause it sits in, 80 characters back and 50 forward. REPLACED BY splits a sentence in two,
    # and the side it falls on decides it.
    if verdict is None:
        where = {p: t for p, t in list(mine.items()) + list(MOCK_TEXT.items())}
        banned, want = [], []
        for m in QUOTED.finditer(text):
            q = m.group(1)
            if not (3 < len(q) < 60 and re.search(r'[a-z]', q)):
                continue
            window = text[max(0, m.start() - 80):m.end() + 50]
            clause = re.split(r'[.;]\s', window)
            near = next((c for c in clause if q in c), window)
            # A QUOTE IS ONLY COPY IF THE SENTENCE SAYS IT IS ON A SCREEN.
            # Most of what he types in quotation marks is an instruction to me — "build all 16",
            # "Approve all 25" — and demanding those words appear in the app produced 79 false
            # misses on the first run. So a quote counts as copy only where he is describing what a
            # person reads; everything else goes to the trace check, which does not pretend to settle it.
            if not COPYISH.search(near):
                continue
            # A BAN MUST SIT NEXT TO THE QUOTE IT BANS.
            # "renamed 'A' 'B'" and "'B' … so it is never labelled linked" each carry a ban and a
            # required phrase in one sentence; a ban anywhere in the clause marked the REQUIRED one
            # as breached, and both false breaches were on copy the app is meant to show. So only
            # the 30 characters before the quote can ban it, and a supersede marker in front of a
            # quote makes it the NEW wording, never the retired one.
            # An INSTRUCTION in quotation marks is not copy. "add both. Bar replaces donut." and
            # "+0.5% on cash + investments" are him telling me what to build, and requiring those
            # words on a screen is a miss the app can never clear.
            if (NOT_COPY.match(q.strip()) or re.search(r'[.!?]\s+\S', q)
                    or ILLUSTRATION.search(q) or HIS_PROSE.search(q)):
                continue
            at = near.find(q)
            before, after = near[max(0, at - 30):at], near[at + len(q):at + len(q) + 22]
            # in `renamed "A" "B"`, A is the RETIRED name and B the new one — the quote standing in
            # front of the marker is the one that must be gone.
            if re.search(r'^[”")]?\s*(renamed|replaced by|becomes|now reads)\b', after, re.I):
                banned.append(q)
            elif re.search(r'\b(renamed|replaced by|becomes|now reads)\s*[“"(]?\s*$', before, re.I):
                want.append(q)
            elif FORBID.search(before):
                banned.append(q)
            else:
                want.append(q)
        want = [q for q in want if q not in banned]
        found = [f'"{q}" still readable in {os.path.basename(p)}'
                 for q in banned for p, t in where.items() if re.search(re.escape(q), t, re.I)]
        # A PLACEHOLDER IS A HOLE, NOT CHARACTERS. He writes the copy as a template —
        # "See all activity (N) ›", "<word> — xx% odds of lasting to age abc" — and the app fills
        # it in. Searching for the literal "(N)" can only ever miss, so each hole becomes a wildcard
        # and the fixed words around it are what must really be there.
        def pat(q):
            holes = re.compile(r'<[a-z ]+>|\[[a-z ]+\]|\((?:N|n|\d+)\)|\bxx\b|\babc\b|\bnn\b|\$X\b|\bY\b')
            return '.{0,24}'.join(re.escape(b) for b in holes.split(q) if b.strip()) or None

        hay = dict(where, **{k: v for k, v in ALL_VIS.items()})
        absent = []
        for q in want:
            rx = pat(q)
            if rx and not any(re.search(rx, t, re.I | re.S) for t in hay.values()):
                absent.append(q)
        if banned and found:
            verdict, check = 'BREACHED', 'FORBIDS'
            notes += found[:3]
        elif want and absent:
            verdict, check = 'NOT FOUND', 'REQUIRES'
            notes.append('quoted copy nowhere a person reads: ' + '; '.join(f'"{q}"' for q in absent[:3]))
        elif banned or want:
            verdict, check = 'COMPLIES', ('FORBIDS' if banned else 'REQUIRES')
            notes.append((f'{len(banned)} forbidden phrase(s) absent; ' if banned else '')
                         + (f'{len(want)} quoted phrase(s) present' if want else ''))

    # 4 · TRACE — did his requirement leave any mark on the thing that implements it?
    if verdict is None:
        want = {w for w in re.findall(r"[a-z][a-z\-']{4,}", text.lower()) if w not in STOP}
        if not want:
            verdict, check = 'NO WORDS', 'TRACE'
            notes.append('the decision carries no distinctive word to look for')
        else:
            hay = ' '.join(list(mine.values()) + [FIGS[i].get('_text', '') for i in idents if i in FIGS])
            hay = hay.lower()
            hit = {w for w in want if w in hay}
            share = len(hit) / len(want)
            if share >= 0.5:
                verdict, check = 'LEAVES A TRACE', 'TRACE'
                notes.append(f'{len(hit)} of {len(want)} of his words appear in what implements it: '
                             + ' '.join(sorted(hit)[:6]))
            elif hit:
                verdict, check = 'FAINT TRACE', 'TRACE'
                notes.append(f'only {len(hit)} of {len(want)} appear — present: {" ".join(sorted(hit)[:5])}'
                             f' · absent: {" ".join(sorted(want - hit)[:5])}')
            else:
                verdict, check = 'NO TRACE', 'TRACE'
                notes.append(f'none of {len(want)} of his words appear anywhere that implements it: '
                             + ' '.join(sorted(want)[:7]))

    # CITATION BEATS WORD OVERLAP. A decision whose identifier appears in the code that implements
    # its figures, or in a test, is confirmed by that citation — the arithmetic says out loud which
    # ruling it answers to. Word overlap was only ever a way of guessing at that, and it guessed
    # "faint" for 99 decisions whose wording simply differs from mine.
    cited = [os.path.basename(pp) for pp, t in ART.items() if x['id'] in t]
    in_test = [os.path.basename(pp) for pp, t in TESTS.items() if x['id'] in t]
    if cited or in_test:
        where = (cited + in_test)[0]
        if verdict in ('FAINT TRACE', 'NO TRACE', 'LEAVES A TRACE'):
            verdict, check = 'CONFIRMED BY CITATION', 'CITED'
        notes.append(f'cited by identifier in {where}')

    verdicts.append((x['id'], verdict, check, g[:54], '; '.join(notes)[:150]))

print(f'── does the {MODULE.upper()} module obey his decisions?')
print(f'   decisions touching it : {len(TODO)}')
print(f'   screens read          : {len([p for p in ART if "/screens/" in p])} '
      f'— {len([s_ for s_ in SCREENS if s_ in (OWNED or set(SCREENS))])} the module owns, '
      f'{len([s_ for s_ in SCREENS if s_ not in (OWNED or set(SCREENS))])} owned elsewhere that print its figures '
      f'and so must obey its decisions')
print(f'   doors read            : {len([p for p in ART if "/functions/" in p])}')
print(f'   mocks read            : {len(MOCK_TEXT)}')
print(f'   screens from the register: {len(_routes)} route(s) → ' + ' '.join(sorted(ROUTE_TO_SCREEN[r] for r in _routes)))
if _unmapped:
    print('   STOP — these routes resolve to no screen file, so figures on them went unread: '
          + ' '.join(sorted(_unmapped)))
    sys.exit(1)
if len([p for p in ART if '/screens/' in p]) < len(SCREENS):
    print('   STOP — %d of %d screens could not be opened.' % (len([p for p in ART if '/screens/' in p]), len(SCREENS)))
    sys.exit(1)
print(f'   metrics named by them : {len([a for a in checked_artefacts if isinstance(a, str) and a.startswith("MK-")])}')
print()
for k, v in Counter(v for _, v, _, _, _ in verdicts).most_common():
    print(f'   {v:>4}  {k}')
print()
for want in ('BREACHED', 'BROKEN RECORD', 'NO TRACE', 'NOT FOUND', 'NOT BUILT'):
    rows = [r for r in verdicts if r[1] == want]
    if not rows:
        continue
    print(f'{want} — {len(rows)}:')
    for i, vd, ck, g, n in rows[:14]:
        print(f'   {i} [{ck}] {n}')
        print(f'        governs: {g}')
    if len(rows) > 14:
        print(f'   …and {len(rows) - 14} more')
    print()
json.dump([{'id': i, 'verdict': v, 'check': c, 'governs': g, 'notes': n} for i, v, c, g, n in verdicts],
          open(os.path.join(HERE, f'moneykeel_validation_{MODULE}.json'), 'w'), indent=1, ensure_ascii=False)
print(f'wrote moneykeel_validation_{MODULE}.json')
