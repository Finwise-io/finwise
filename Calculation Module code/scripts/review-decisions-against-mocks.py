#!/usr/bin/env python3
"""IS THIS DECISION STILL TRUE OF THE SCREEN HE APPROVED? — the review he asked for, 2026-09-29.

He read DEC-0004 on the answer list and caught it: it describes a "Spending tab" with a month header
and a categories-vs-plan card. His approved cash-flow mock has NO Spending tab — it is Expenses, with
three sections (recurring, planned, actual). The decision was marked IN USE and is dead.

My superseded map held ELEVEN pairs, each one I happened to notice. That is the same fault as every
hand-typed list. This looks at every decision that PREDATES the design now in force and describes
screen content — 76 across the three modules — and gathers the evidence for each: which of the words
it uses still appear in the approved mock, and which do not.

IT DOES NOT DECIDE. A decision can be perfectly alive and share no vocabulary with a redrawn screen,
and a dead one can share plenty. So it SCORES and prints, and I read the weak ones myself. Marking 76
rows by a keyword rule would be the same overreach that put the hide-balances answer on a row about
creating a folder.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)

# EVERY LIVE APPROVED MOCK FOR THE MODULE, not one of them (corrected 2026-09-30).
#
# The first run compared each module against a SINGLE mock and produced nonsense: the activity-list
# decision scored 8% against the Net worth mock because the activity list is on the ACCOUNT PAGE,
# which is a different approved file; the base-pay card scored 25% against cash-flow_v01 because it
# lives in income-end-to-end_v07. Low overlap meant "I compared it to the wrong screen", not "it is
# dead" — a net too narrow, which is the fault CLAUDE.md warns about, in the tool built to find
# exactly that fault in the decisions.
#
# So a module is the UNION of every live mock that belongs to it, and the date in force is the
# NEWEST of their approvals. `archive/` is excluded: a dated file there is superseded by definition.
NW = 'MoneyKeel/documents/networth-and-performance/'
CF = 'MoneyKeel/documents/cashflow/'
HS = 'MoneyKeel/documents/home-screen/'
IN_FORCE = {
    'cashflow': ([CF + 'moneykeel_pres_mock_cash-flow_v01.html',
                  CF + 'moneykeel_pres_mock_income-end-to-end_v07.html',
                  CF + 'moneykeel_pres_mock_filing-status-question_v03.html'], '2026-09-28'),
    'networth': ([NW + 'moneykeel_pres_mock_net-worth-quiet-instrument_v08.html',
                  NW + 'moneykeel_pres_mock_account-detail_v01.html',
                  NW + 'moneykeel_pres_mock_add-account-as-built_v01.html',
                  NW + 'moneykeel_pres_mock_empty-state-pattern_v01.html',
                  NW + 'moneykeel_pres_mock_investments_v07.html',
                  HS + 'moneykeel_pres_mock_ways-to-add-an-account_v10.html'], '2026-09-14'),
    # v14 was archived with its date on 2026-09-30 when v15 went to him; the review reads the
    # CURRENT design document, which is v15 until he rules on it.
    'performance': ([NW + 'moneykeel_pres_mock_performance_v17.html',
                     NW + 'moneykeel_pres_mock_account-detail_v01.html',
                     NW + 'moneykeel_pres_mock_look-ahead_v04.html',
                     NW + 'moneykeel_pres_mock_investments_v07.html'], '2026-09-25'),
}
SCREENY = re.compile(r'tab|screen|row|card|section|shows|header|label|band|chip|list|button|heading|column', re.I)
STOP = set('''the a an and or of to in on at for with from by is are was were be been it its this that these those
one two three four five six seven eight nine ten his her their your you we our us they them he she i
not no never always all any each every both either neither more most less least than then so such as
if when where which who whom whose what why how but also only just even still yet already
decision decisions rule ruling approved approval says said say name named wording words word
app screen screens page pages figure figures number numbers thing things place places
per into out off over under above below before after during while until since
has have had do does did can could will would should may might must
plain english his founder'''.split())


def strip_tags(t):
    t = re.sub(r'<(script|style).*?</\1>', ' ', t, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t))


def words_of(t):
    return {w for w in re.findall(r"[A-Za-z][A-Za-z'/-]{3,}", str(t or '').lower()) if w not in STOP}


doc = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))
rows = doc['rows']
report = []
for tab, (mocks, when) in IN_FORCE.items():
    missing = [m for m in mocks if not os.path.exists(m)]
    if missing:
        print('   MOCK MISSING: ' + ' '.join(missing))
        sys.exit(1)
    mock_words = set()
    for m in mocks:
        mock_words |= words_of(strip_tags(open(m, encoding='utf8', errors='ignore').read()))
    for r in rows:
        if r.get('tab') != tab:
            continue
        if str(r.get('decided') or '') >= when:
            continue
        if str(r.get('in_use', '')).startswith('OLD'):
            continue
        plain = str(r.get('plain') or '')
        if not SCREENY.search(plain):
            continue
        if plain.startswith(('HIS QUESTION', 'A QUESTION')):
            continue
        w = words_of(plain)
        if not w:
            continue
        hit = w & mock_words
        report.append({
            'id': r['id'], 'tab': tab, 'decided': str(r.get('decided')), 'mock': ' \u00b7 '.join(os.path.basename(m) for m in mocks),
            'share': len(hit) / len(w), 'missing': sorted(w - mock_words)[:14], 'plain': plain[:220],
        })

report.sort(key=lambda x: x['share'])
print('%d decisions predate the design in force and describe screen content.\n' % len(report))
print('WEAKEST EVIDENCE FIRST — the share of their own vocabulary still present in the approved mock.')
print('A LOW share means the screen it describes may no longer exist; it is not proof, it is where to look.\n')
for x in report[:30]:
    print('  %4.0f%%  %s [%-11s %s]  %s' % (x['share'] * 100, x['id'], x['tab'], x['decided'], x['plain'][:84]))
    print('        not in the mock: ' + ', '.join(x['missing'][:9]))
json.dump(report, open(os.path.join(HERE, 'moneykeel_mock_review.json'), 'w'), indent=1, ensure_ascii=False)
print('\nwrote the evidence for all %d to moneykeel_mock_review.json' % len(report))
