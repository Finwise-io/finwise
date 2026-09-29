#!/usr/bin/env python3
"""build-orchestrator-map.py — phase 1 of the orchestrator plan (spec moneykeel_calc_spec_one-door-per-question_v01.md § The plan).

Builds MoneyKeel/documents/standards/moneykeel_calc_spec_orchestrator-map_v01.xlsx from:
  · the built master (figure rows, functions, their closures)
  · moneykeel_figure_census.json — every string every routed screen renders, three data states (written by src/__tests__/figure_census.test.tsx)
  · moneykeel_function_categories.json — name → identifier and category (written by the master build)
  · the screens' own imports, read from src/screens, src/components and app
  · moneykeel_orchestrator_questions.json — the hand-kept half: the proposed questions, one orchestrator each
The founder's columns (YOUR ANSWER, ROW VERIFIED) are kept across rebuilds, keyed by the row's identifier. Everything else is regenerated — hand edits die.
Tabs: Map (one row per proposed orchestrator) · Census (the three completeness proofs, one finding per row) · Conflicts (one grouping conflict per row, with a recommendation).
"""
import json, re, os, glob, sys
import openpyxl
import sys, os as _os
sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from xlsx_readable import readable   # one way to format a workbook (founder, 2026-09-27)
from openpyxl.styles import Font, Alignment, PatternFill
from collections import defaultdict, Counter
sys.path.insert(0, os.path.dirname(__file__))
from moneykeel_code_formula import canon

SC = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(SC, '..', '..'))
MASTER = sorted(glob.glob(os.path.join(ROOT, 'MoneyKeel/documents/other/moneykeel_calc_master_calculation-*.xlsx')))[-1]
OUT = os.path.join(ROOT, 'MoneyKeel/documents/standards/moneykeel_calc_spec_orchestrator-map_v01.xlsx')
Q = json.load(open(os.path.join(SC, 'moneykeel_orchestrator_questions.json')))
CENSUS = json.load(open(os.path.join(SC, 'moneykeel_figure_census.json')))
CATS = json.load(open(os.path.join(SC, 'moneykeel_function_categories.json')))
ID_OF = {k: v['id'] for k, v in CATS.items() if v.get('id')}; CAT_OF = {v['id']: v['category'] for k, v in CATS.items() if v.get('id')}; NAME_OF = {v: k for k, v in ID_OF.items()}
MKID = re.compile(r'MK-[A-Z]{2}-[A-Z]-\d{3}')
TABS = ['home', 'multiple_screens', 'networth', 'performance', 'plan', 'cashflow', 'menu']
ROUTE_FILE = {r: v['file'] for r, v in CENSUS['screens'].items()}

# ---------- the master
wb = openpyxl.load_workbook(MASTER, read_only=True)
ROWS = {}
for t in TABS:
    ws = wb[t]; h = [c for c in next(ws.iter_rows(values_only=True))]; ix = {k: h.index(k) for k in h if k}
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r[0] or not str(r[0]).startswith('MK-'): continue
        g = lambda k: str(r[ix[k]] or '') if k in ix else ''
        ROWS[r[0]] = {'tab': t, 'parent': g('Parent Screen Name'), 'secondary': g('Secondary Screen Name'), 'label': g('Name on Screen'), 'metric': g('Name of Underlying Metric'),
                      'fn_ids': MKID.findall(g('Function ID')), 'fn_names': g('Function that produces it'), 'inputs': g('Inputs the code reads (from the chain, this build)'),
                      'decisions': g('Decisions made'), 'assumptions': g('Assumptions made anywhere in that chain'), 'active': g('Active or decommissioned'), 'status': g('STATUS — this row')}
ws = wb['functions_from_code']; h = [c for c in next(ws.iter_rows(values_only=True))]; ix = {k: h.index(k) for k in h if k}
FN = {}
for r in ws.iter_rows(min_row=2, values_only=True):
    if not r[0] or not str(r[0]).startswith('MK-'): continue
    g = lambda k: str(r[ix[k]] or '')
    FN[r[0]] = {'name': g('Function'), 'file': g('File'), 'cat': g('Category'), 'closure': MKID.findall(g('Dependent functions — all of them')), 'reach': g('Can its answer reach a screen?'),
                'figures': MKID.findall(g('Figures that name it')), 'active': g('Active or decommissioned'), 'inputs': g('What it is handed (its inputs)'), 'assumptions': g('Assumptions it makes')}

# ---------- routes for a row
def routes_of(row):
    sec = row['secondary'].strip()
    if sec and sec != 'NA': return [sec]
    out = []
    for p in [x.strip() for x in row['parent'].split('·')]: out += Q['mains'].get(p, [])
    return out

# ---------- the screens' imports (the code's own statement of who calls what)
CALC = re.compile(r'(src/domain|MoneyKeel/functions|Calculation Module code/engines|src/services|src/store)')
def imports_of(file):
    p = os.path.join(ROOT, file)
    if not os.path.exists(p): return set()
    t = open(p).read(); out = set()
    for m in re.finditer(r"import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'([^']*)'", t):
        target = os.path.normpath(os.path.join(os.path.dirname(file), m.group(2)))
        if not CALC.search(target): continue
        for x in m.group(1).split(','):
            n = x.strip().split(' as ')[0].strip()
            if n in ID_OF: out.add(ID_OF[n])
    return out
SCREEN_IMPORTS = {r: imports_of(f) for r, f in ROUTE_FILE.items()}
# components a screen renders carry their own imports — a screen's reach is its own plus its components'
COMP = {}; COMP_USES = {}
for f in glob.glob(os.path.join(ROOT, 'src/components/*.tsx')) + glob.glob(os.path.join(ROOT, 'src/components/*.ts')):
    n = os.path.splitext(os.path.basename(f))[0]; COMP[n] = imports_of(os.path.relpath(f, ROOT))
    COMP_USES[n] = set(re.findall(r"from\s*'\./([A-Za-z0-9_]+)'", open(f).read()))
def comp_closure(n, seen=None):
    seen = seen if seen is not None else set()
    if n in seen or n not in COMP: return set()
    seen.add(n); out = set(COMP[n])
    for m in COMP_USES.get(n, ()): out |= comp_closure(m, seen)
    return out
HOOK = {os.path.splitext(os.path.basename(f))[0]: imports_of(os.path.relpath(f, ROOT)) for f in glob.glob(os.path.join(ROOT, 'src/hooks/*.ts'))}
def comp_reach(file):
    """what a screen reaches through the components and hooks it renders or calls"""
    p = os.path.join(ROOT, file); out = set()
    if not os.path.exists(p): return out
    t = open(p).read()
    for m in re.finditer(r"from\s*'\.\./components/([A-Za-z0-9_]+)'", t): out |= comp_closure(m.group(1))
    for m in re.finditer(r"from\s*'\.\./hooks/([A-Za-z0-9_]+)'", t): out |= HOOK.get(m.group(1), set())
    return out
SCREEN_REACH = {r: SCREEN_IMPORTS.get(r, set()) | comp_reach(f) for r, f in ROUTE_FILE.items()}

# ---------- census matching: a row's label → the words a person would see
PLACEHOLDER = re.compile(r'<[^>]*>|[$±▲▼📈💵🏠💳✓=+·/()]|\b[XYZNnm]\b|\d[\d,.]*%?|%|\bmo\b|\byr\b|\bof\b|\bthe\b|\band\b|\ba\b|\ban\b|\byour\b|\bon\b|\bin\b|\bthis\b|\bat\b|\bto\b|\bby\b|\bfrom\b|\beach\b|\bits\b|\bwith\b|\bfor\b|\bit\b|\bis\b|\bare\b|\bwhat\b|\bthat\b|\byou\b|\bwe\b|\bany\b|\bas\b|\bmy\b|\bso\b|\bfar\b')
def alternatives(label):
    out = []
    for part in re.split(r'\s·\s|\s/\s|—', canon(label)):
        words = [w for w in re.sub(r'[^a-z0-9 ]', ' ', PLACEHOLDER.sub(' ', part.lower())).split() if len(w) >= 3]
        if words: out.append(words)
    return out
MONTH = re.compile(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b\.?( ’?\d\d)?", re.I)
def norm(s):
    if ENT_RE: s = ENT_RE.sub('<name>', s)
    return MONTH.sub('<month>', re.sub(r'\d[\d,.]*', '#', s.lower()))
FIG = re.compile(r'\$\d|\d%|\d+ percent|out of 100|\bage \d|\d+ months?\b|\d+ years?\b|\d+ days?\b|\bday \d')
def census_strings(route):
    rec = CENSUS['screens'].get(route, {}); out = []
    for st in rec:
        if st == 'file': continue
        for i, x in enumerate(rec[st]): out.append((st, i, x['k'], x['s']))
    return out
ENTITY = sorted({e for v in CENSUS.get('entities', {}).values() for e in v}, key=len, reverse=True)
ENT_RE = re.compile('|'.join(re.escape(e) for e in ENTITY), re.I) if ENTITY else None
def windows(route):
    """each string joined with the three before it, so a label split across lines still matches"""
    byst = defaultdict(list)
    for st, i, k, s in census_strings(route): byst[st].append((i, s))
    for st, lst in byst.items():
        for j, (i, s) in enumerate(lst):
            yield st, i, ' '.join(x[1] for x in lst[max(0, j - 3):j + 1]).lower()
def row_seen(row):
    alts = alternatives(row['label']) or alternatives(row['metric']); seen = set()
    for route in routes_of(row):
        for st, i, low in windows(route):
            if any(all(w in low for w in a) for a in alts): seen.add((route, st))
    return seen, alts
ROW_SEEN = {mid: row_seen(r) for mid, r in ROWS.items()}
# which census strings does SOME row claim, per route
CLAIMED = defaultdict(set)
for mid, r in ROWS.items():
    alts = ROW_SEEN[mid][1]
    for route in routes_of(r):
        for st, i, low in windows(route):
            if any(all(w in low for w in a) for a in alts): CLAIMED[route].add((st, i))
BARE = re.compile(r'[$\d,.%+\-–— ]+(/(month|year))?')
def unclaimed_figures():
    """unclaimed figure strings, with the unclaimed lines around them, as one block per place on the screen"""
    out = defaultdict(lambda: {'states': set(), 'kinds': set(), 'context': ''})
    for route in CENSUS['screens']:
        byst = defaultdict(list)
        for st, i, k, s in census_strings(route): byst[st].append((i, k, s))
        for st, lst in byst.items():
            j = 0
            while j < len(lst):
                i, k, s = lst[j]
                if not FIG.search(s) or (st, i) in CLAIMED[route]: j += 1; continue
                # a bare figure right after a claimed line belongs to that line
                if BARE.fullmatch(s) and any((st, lst[j - d][0]) in CLAIMED[route] for d in (1, 2) if j - d >= 0): j += 1; continue
                # gather the unclaimed run around it: the words before it (up to 2 lines) and the figures after it
                start = j
                while start > 0 and (st, lst[start - 1][0]) not in CLAIMED[route] and j - start < 2 and not FIG.search(lst[start - 1][2]): start -= 1
                end = j + 1
                while end < len(lst) and (st, lst[end][0]) not in CLAIMED[route] and (BARE.fullmatch(lst[end][2]) or FIG.search(lst[end][2])) and end - j < 6: end += 1
                block = ' | '.join(x[2] for x in lst[start:end]); kinds = {'spoken' if x[1] == 'a' else 'visible' for x in lst[start:end]}
                key = (route, norm(block)[:140]); e = out[key]; e['states'].add(st); e['kinds'] |= kinds
                if not e['context']: e['context'] = ' | '.join(x[2] for x in lst[max(0, start - 2):start])[:160]
                j = end
    return out

# ---------- the questions
QROWS = {r: q['id'] for q in Q['questions'] for r in q['rows']}
def is_calc(cat): return (cat.startswith('2') or cat.startswith('3')) and 'action only' not in cat and 'presentation only' not in cat
def closure_of(fids):
    out = set(); stack = list(fids)
    while stack:
        f = stack.pop()
        if f in out or f not in FN: continue
        out.add(f); stack += FN[f]['closure']
    return out
MAP = []
for q in Q['questions']:
    rows = [r for r in q['rows'] if r in ROWS]
    producers = sorted({f for r in rows for f in ROWS[r]['fn_ids']})
    reach = set()
    for route in q['screens']: reach |= SCREEN_REACH.get(route, set())
    reach = {f for f in reach if f in FN and is_calc(FN[f]['cat'])}
    closure = closure_of(set(producers))                       # attributable: what its own figures' functions call
    extra = sorted(f for f in closure_of(reach) if f not in closure)   # its screens import these, but no row of this question names them
    doors = sorted(f for f in closure | set(extra) if f.split('-')[2] == 'O')
    # THE DOORS THIS QUESTION OWNS, as against the doors its screens merely import (2026-09-27). A
    # shared screen — Cash flow carries three — put another question's door into this one's list, and
    # the question then told him "3 functions answer THIS", which was not true. Only a door inside this
    # question's own closure is answering this question.
    own_doors = sorted(f for f in closure if f.split('-')[2] == 'O')
    q['_rows'] = rows; q['_producers'] = producers; q['_reach'] = sorted(reach); q['_closure'] = sorted(closure); q['_extra'] = extra; q['_doors'] = doors; q['_own_doors'] = own_doors
    MAP.append(q)
FN_IN_Q = defaultdict(set)
for q in MAP:
    for f in q['_closure'] + q['_extra']: FN_IN_Q[f].add(q['id'])

# ---------- the call-site record: the exact money-figure inventory
#  A place in the code that prints a dollar figure is ONE figure, however many times it renders. The
#  census wrapped the three formatting functions every dollar figure passes through and recorded the
#  file and line that printed each one, so this half of the census is READ FROM THE CODE. A visible
#  figure and the spoken label beside it are the same figure: sites in one component with the same
#  values, within fifteen lines, are merged.
SITES = [x for x in CENSUS.get('callsites', []) if x['site'] != 'unknown']
def merge_sites(sites):
    out = []
    for x in sorted(sites, key=lambda y: (y['site'].rsplit(':', 1)[0], int(y['site'].rsplit(':', 1)[1]))):
        f, n = x['site'].rsplit(':', 1)
        for o in out:
            of, on = o['site'].rsplit(':', 1)
            if of == f and o['inside'] == x['inside'] and set(o['values']) == set(x['values']) and abs(int(on) - int(n)) <= 15:
                o['also'] = o.get('also', []) + [x['site']]; o['renders'] += x['renders']
                o['routes'] = sorted(set(o['routes']) | set(x['routes'])); break
        else:
            out.append(dict(x))
    return out
SITES = merge_sites(SITES)
# which row's claimed words carried each printed value
def claimed_by(route):
    """(state, index) → the rows whose words claim that string"""
    out = defaultdict(set)
    for mid, r in ROWS.items():
        if route not in routes_of(r): continue
        alts = ROW_SEEN[mid][1]
        for st, i, low in windows(route):
            if any(all(w in low for w in a) for a in alts): out[(st, i)].add(mid)
    return out
CLAIMED_BY = {rt: claimed_by(rt) for rt in CENSUS['screens']}
def rows_for_site(x):
    """the rows whose claimed words carried this call site's values, on the screens it printed on"""
    hits = Counter(); seen_any = False
    for route in x['routes']:
        cb = CLAIMED_BY.get(route, {})
        for st, i, k, sstr in census_strings(route):
            if not any(v in sstr for v in x['values']): continue
            seen_any = True
            for mid in cb.get((st, i), ()): hits[mid] += 1
    return hits, seen_any

# ---------- census findings
CENSUS_ROWS = []
SITE_ROWS = []
for x in SITES:
    hits, seen = rows_for_site(x)
    where = ' · '.join(x['routes'])
    if hits:
        best = ', '.join(f'{m} {ROWS[m]["label"][:40]}' for m, _ in hits.most_common(3))
        kind = 'money figure — a row describes it' if len(hits) == 1 else 'money figure — more than one row could be it'
        act = 'Nothing to do.' if len(hits) == 1 else 'Claude reads the screen and says which row owns it; only a genuine second figure comes to you.'
    else:
        best = '—'; kind = 'money figure with NO row'
        act = 'This place in the code prints a dollar figure that no row on the master file describes. Claude reads the code line and proposes a row, with the figure, the screen and the section named; you confirm or correct the proposal.'
    SITE_ROWS.append([kind, where, x['site'] + (' (+' + str(len(x.get('also', []))) + ' spoken/visible twin)' if x.get('also') else ''), x['line'], ', '.join(x['values'][:4]) + (f" … ({x['renders']} renders)" if x['renders'] > len(x['values']) else ''), 'inside ' + (x['inside'] or '(top level)'), best, act])
for e, v in sorted(unclaimed_figures().items()):
    CENSUS_ROWS.append(['figure no row claims', e[0], ROUTE_FILE[e[0]], e[1], ', '.join(sorted(v['states'])), ', '.join(sorted(v['kinds'])), v['context'], 'The screen shows this number, but no row on the master file describes it. A number with no row has no formula, no inputs and no test, so nobody can check it. Say whether it gets its own row, or belongs to a row that already exists.'])
for mid, r in ROWS.items():
    if r['active'].startswith('DECOMM') or r['active'].startswith('SUPERS'): continue
    seen, alts = ROW_SEEN[mid]
    if r['label'].lower().startswith(('each ', 'class rows', 'the trend line', 'the months')): continue   # a list row describes a list; words cannot see it
    if not seen: CENSUS_ROWS.append(['row not seen on its screen', ' · '.join(routes_of(r)), '', f"{mid} — {r['label']}", '', '', 'words looked for: ' + ' / '.join(' '.join(a) for a in alts), 'The master file has a row for this figure, but the words on the row were not found on the screen. Either the words on the row are out of date, or the figure only appears after a tap the census cannot make. Claude reads each one and fixes the row or the census; nothing for you to decide yet.'])
PLUMBING = re.compile(r'src/services|domain/import|src/store|appLock|crashReporter|receipt|firebase|profile/lens|_shared/money')
plumb = []
for f, x in sorted(FN.items()):
    if x['active'].startswith('DECOMM') or not is_calc(x['cat']): continue
    if f in FN_IN_Q: continue
    if PLUMBING.search(x['file']): plumb.append(f"{f} {x['name']} ({x['file'].split('/')[-1]})"); continue
    CENSUS_ROWS.append(['function inside no question', x['file'], '', f"{f} {x['name']}", x['cat'], '', 'reaches a screen: ' + x['reach'], 'This calculation exists in the code, but none of the 22 questions leads to it. Either it prints a figure that has no row, or the map is missing a question, or the code is dead. Claude reads each one and says which; you rule on any that need a new question.'])
if plumb: CENSUS_ROWS.append(['plumbing categorised as calculation (rule 8)', 'services · import parsing · store hooks · sign-in', '', '\n'.join(plumb), f'{len(plumb)} functions', '', '', 'rule 8: an action or bring-data-in function is listed as such; the build categorised these as DISPLAYED or DEPENDENT because their return reaches a screen (a lock state, a sync status, a parsed file). Recommend: re-categorise in the build, one rule for the lot — your ruling'])
for f in sorted(x for x in FN if x.split('-')[2] == 'O'):
    named = [m for m, r in ROWS.items() if f in r['fn_ids']]; imported = [rt for rt, s in SCREEN_REACH.items() if f in s]
    if not named or not imported: CENSUS_ROWS.append(['orchestrator orphan', ' · '.join(imported) or 'no screen imports it', FN[f]['file'], f"{f} {FN[f]['name']}", f"named by {len(named)} row(s)", f"imported by {len(imported)} screen(s)", '', 'This door exists in the code, but either no row on the master file names it, or no screen walks through it — the screen reaches the parts behind the door instead. The rows and the screen must both point at the door.'])

CENSUS_ROWS += SITE_ROWS
# one summary row per screen, first, so the shape is visible before the detail
SUMMARY = []
for route in sorted(CENSUS['screens']):
    on_master = [m for m, r in ROWS.items() if route in routes_of(r) and not r['active'].startswith(('DECOMM', 'SUPERS'))]
    uncl = sum(1 for r in CENSUS_ROWS if r[0] == 'money figure with NO row' and route in str(r[1]))
    unseen = sum(1 for r in CENSUS_ROWS if r[0] == 'row not seen on its screen' and route in str(r[1]))
    qs = sorted({q['id'] for q in MAP if route in q['screens']})
    sites = sum(1 for r in SITE_ROWS if route in str(r[1]))
    SUMMARY.append(['screen summary', route, ROUTE_FILE[route], f'{len(on_master)} rows on the master · {sites} places in the code print a dollar figure · {uncl} of them have no row · {unseen} rows not found on screen', ' · '.join(qs) or 'no question asks on this screen', '', '', 'One line per screen: how many rows the master file has for it, how many numbers on it no row describes, and how many rows could not be found on it.'])
CENSUS_ROWS = SUMMARY + CENSUS_ROWS

# ---------- conflicts
CONF = []
n = 0
def conf(kind, ids, where, what, rec):
    global n; n += 1; CONF.append([f'C-{n}', kind, ids, where, what, rec])
# NOT A CONFLICT, and it never was (founder, 2026-09-27: "base pay is one component of income summary
# and function should have reflected that"). incomeSummary CALLS basePay on its first line — the code
# already has the shape the recommendation was about to propose. It was raised because two orchestrator
# identifiers appeared under one question and nobody read what they do. A conflict is now raised only
# where neither function reaches the other; this pair, and any like it, are printed as settled.
if 'MK-CF-O-001' not in closure_of({'MK-CF-O-004'}):
    conf('two doors, one question?', 'MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary', 'Q-CF-1', 'basePay answers each earner\'s pay and tax band; incomeSummary answers every source over the year. Both are asked from the Cash flow tab and the income screens.', 'Recommend ONE orchestrator, MK-CF-O-004 incomeSummary, with basePay as a dependent function inside it — a person asks "what do I earn and take home", not two questions. Your ruling.')
else:
    conf('read, and settled — no conflict', 'MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary', 'Q-CF-1',
         'incomeSummary calls basePay on its first line: each earner\'s pay and tax band is a PART of "every source over the year", and the code already builds it that way.',
         'Nothing to decide. Raised on 2026-09-26 by counting identifiers rather than reading the functions; withdrawn 2026-09-27 on the founder\'s challenge.')
conf('read, and settled — no conflict', 'MK-CF-O-002 spending · MK-CF-O-003 thisMonth', 'Q-CF-2',
     'THE APPROVED DESIGN (this-month-and-expenses v07, 2026-09-26) answers it: This month spells out every row of the flow twice, planned and actual, ending in the surplus. Expenses is the DETAIL BEHIND ONE ROW of that flow — recurring, planned by category, actual by source, and the radar. Part and whole, not two rival answers.',
     'Nothing to decide. Raised on 2026-09-26 by reading the CODE instead of his approved screens; withdrawn 2026-09-28 on his challenge: "are you working of latest approved screens or older one?" The function named `spending` also still carries a retired word — renaming it is a workplan row.')
conf('a question about the answers', 'Q-HM-1 insights', '/home · /insights', 'Insights need net worth, the odds, the cushion and the room left — figures other questions own. Rule 3 says an orchestrator may not call another orchestrator.', 'Recommend: insights read the shared dependent functions (rule 2 makes them the same numbers), never a door; the insight orchestrator lists every dependent it reads. Alternative: a stated exception for read-only composition. Your ruling.')
# same label, different producer (two functions for one concept)
bylabel = defaultdict(list)
for mid, r in ROWS.items():
    if r['active'].startswith(('DECOMM', 'SUPERS')) or not r['fn_ids']: continue
    key = ' / '.join(' '.join(a) for a in alternatives(r['label']))
    if key: bylabel[key].append((mid, tuple(sorted(r['fn_ids']))))
for key, lst in bylabel.items():
    prods = {p for _, p in lst}
    if len(prods) > 1 and not any(set(a) & set(b) for a in prods for b in prods if a != b):
        conf('one label, two producers', ' · '.join(f"{m} → {' + '.join(p)}" for m, p in lst), ' · '.join(sorted({ROWS[m]['tab'] for m, _ in lst})), f'rows that say "{key}" name different functions', 'rule 2: one concept, one function — pick the one, retire the other, or show they are different concepts and rename one')
# a displayed function that two questions' rows name
byfn = defaultdict(set)
for mid, r in ROWS.items():
    for f in r['fn_ids']: byfn[f].add(QROWS.get(mid, '?'))
for f, qs in sorted(byfn.items()):
    if len(qs) > 1: conf('one function, rows in two questions', f"{f} {FN.get(f, {}).get('name', '')}", ' · '.join(sorted(qs)), 'rows under different questions name this function as their producer', 'rule 6 allows a shared dependent; but a DISPLAYED producer under two questions needs an owner — recommend the question whose door will hand the figure out, the other question reads the dependent below it')
for c in Q.get('conflicts_by_hand', []): conf(c['kind'], c['ids'], c['where'], c['what'], c['rec'])
# same-concept names across files (name stems)
stem = defaultdict(set)
for f, x in FN.items():
    if x['active'].startswith('DECOMM'): continue
    s = re.sub(r'^(build|compute|calc|get|select|derive|make|resolve|total|sum)', '', x['name']); s = re.sub(r'(Total|Monthly|Annual|ByMonth|For|Of|From|State|Info|Now)$', '', s).lower()
    if len(s) >= 5: stem[s].add(f)
for s, fs in sorted(stem.items()):
    files = {FN[f]['file'] for f in fs}
    if len(fs) > 1 and len(files) > 1: conf('same name stem, different files — same concept?', ' · '.join(f"{f} {FN[f]['name']}" for f in sorted(fs)), ' · '.join(sorted(files)), f'stem "{s}"', 'rule 2 check: if these are one concept, one survives; if not, say what differs on both rows')
# screen-computed figures (rule 5)
for mid, r in ROWS.items():
    if r['fn_names'].startswith('Worked out on the screen'): conf('a figure the screen computes (rule 5)', mid, ' · '.join(routes_of(r)), r['label'], 'a function with a row — becomes a dependent of its question\'s orchestrator')

# ---------- keep the founder's columns from the previous map
KEEP = {}
if os.path.exists(OUT):
    old = openpyxl.load_workbook(OUT, read_only=True)
    for t in ('Map', 'Census', 'Conflicts'):
        if t not in old.sheetnames: continue
        ws = old[t]; h = [c for c in next(ws.iter_rows(values_only=True))]
        for r in ws.iter_rows(min_row=2, values_only=True):
            if not r[0]: continue
            KEEP[(t, str(r[0]))] = {k: r[i] for i, k in enumerate(h) if k and (k.startswith('YOUR') or k.startswith('ROW VERIFIED'))}

# ---------- write
wb = openpyxl.Workbook(); wb.remove(wb.active)
HEAD = Font(bold=True, color='FFFFFF'); FILL = PatternFill('solid', fgColor='1F4E78'); WRAP = Alignment(wrap_text=True, vertical='top')
def sheet(name, cols, rows, widths, mine=None, pin=None, max_lines=4):
    """One sheet, formatted the one way (founder, 2026-09-27). `mine` names the columns that hold
    generated inventory — they are folded away, so the sheet opens on the columns he reads and
    answers, and the + above the column letters opens mine when he wants them."""
    ws = wb.create_sheet(name); ws.append(cols)
    for r in rows: ws.append([canon(x) if isinstance(x, str) else x for x in r])
    readable(ws, widths=pin or {}, mine=mine, freeze='B2', max_lines=max_lines)
    return ws
def fig(mid): r = ROWS[mid]; return f"{mid} {r['label']}"
def fn(f): return f"{f} {FN[f]['name']}" if f in FN else f

# ── WHAT TO ASK HIM, AND WHEN TO ASK NOTHING ──────────────────────────────────────────────────────
# The founder, 2026-09-27: *"I don't even understand these yes questions... How you want me to validate
# figures, screens? Do you expect me to take inventory of everything?"* He was right. Every row used to
# carry the SAME sentence — "Is this one question, with these figures and these screens?" — which cannot
# be answered without reading 189 figure rows and 46 screens. Taking that inventory is my job; it is
# already in columns E to N and I check it with the gates.
#
# What is actually HIS is one judgement, and only some rows carry one:
#   · one screen, one door   → nothing to decide. The row says so and waits for nobody.
#   · several screens        → "should these screens be answered by ONE function?" — named in plain
#                              words, with what goes wrong if they are not.
#   · several doors today    → "there are N functions doing this now. One, or N?"
# Each question names the screens the way a person would say them, never a route or a file.
SCREEN_WORDS = {
    '/home': 'Home', '/analytics': 'the Net worth tab', '/invest': 'the Performance tab',
    '/cashflow': 'the Cash flow tab', '/plan': 'the Plan tab', '/insights': 'Insights',
    '/account-detail': "an account's own page", '/itemize': 'Itemise an account',
    '/holding-detail': 'one holding', '/bonds': 'Bonds & CDs', '/other-investments': 'Alternatives',
    '/jobsafety': 'Job safety', '/stress-test': 'Stress test', '/look-back': 'Look back',
    '/expense': 'My expenses', '/month-detail': 'Month detail', '/bill-calendar': 'Bill calendar',
    '/paycheck-months': 'Your paycheck, month by month', '/worth-a-look': 'Worth a look',
    '/contribution-room': 'Contribution room', '/tax-organizer': 'Tax organizer', '/credit': 'Build credit',
    '/base-pay': 'Your base pay', '/income-detail': 'Income detail', '/income-manager': 'Your income',
    '/income-summary': 'Your income, all of it', '/monthly-income': 'Your monthly income',
    '/ss-timing': 'When to claim Social Security', '/required-withdrawals': 'Required withdrawals',
    '/roth': 'Roth conversion', '/goals': 'Goals', '/multi-goal': 'Several goals together',
    '/education': 'College planner', '/insurance': 'Life insurance check', '/will-it-last': 'Will my money last',
    '/what-if': 'What if I save more?', '/retirement': 'the Retirement cockpit', '/sharpen': 'Sharpen your plan',
    '/first-run': 'the first run', '/big-costs': 'Big one-time costs', '/estate': 'Estate & legacy',
}
def words(route): return SCREEN_WORDS.get(route, route)
def and_list(xs):
    xs = list(xs)
    return xs[0] if len(xs) == 1 else ' and '.join([', '.join(xs[:-1]), xs[-1]])


# ── WHICH SCREENS HAVE AN APPROVED DESIGN, AND WHICH DO NOT ───────────────────────────────────────
# The founder, 2026-09-27: *"are these questions generated from the latest finalized mockups as many
# questions felt irrelevant?"* They are not, and the map never said so. The question text and the
# screen list in moneykeel_orchestrator_questions.json are written from the CODE and the master —
# which is why a question can name a screen he has never seen a design for. This column says, per row,
# which of its screens have no approved mock, so he can tell a question about settled ground from a
# question about ground that is not settled yet.
# THE APPROVED DESIGN FOR EACH SCREEN — hand-kept, and the same list the design record carries
# (moneykeel_pres_spec_design-each-screen-was-built-from_v01.md). A screen missing from this table has
# no approved mock: the question about it rests on code alone, and he should know that before he rules.
DESIGNED = {
    '/analytics': 'net-worth-quiet-instrument_v08',
    '/invest': 'performance_v14',
    '/account-detail': 'performance_v14 (2nd phone) · account-detail_v01',
    '/cashflow': 'cash-flow_v01 · cash-flow_v01',
    '/base-pay': 'income-end-to-end_v07',
    '/income-manager': 'income-end-to-end_v07',
    '/income-summary': 'income-end-to-end_v07',
    '/income-detail': 'income-end-to-end_v07',
    '/income': 'income-end-to-end_v07',
    '/filing-status': 'filing-status-question_v03',
    '/what-if': 'look-ahead_v04',
    '/plan': 'plan_v06 (waiting for your approval)',
    '/add-account': 'ways-to-add-an-account_v10 (waiting for your approval)',
}
def undesigned(q):
    """The screens of this question with NO approved mock, named the way he says them."""
    return [SCREEN_WORDS.get(r, r) for r in q['screens'] if r not in DESIGNED]
def designed(q):
    """The approved design each of its screens was drawn from, where one exists."""
    return [f"{SCREEN_WORDS.get(r, r)} → {DESIGNED[r]}" for r in q['screens'] if r in DESIGNED]


def answered(pair, ans):
    """A row he has answered is RULED, and stops asking (2026-09-27 — he answered all 13 and the file
    still said PROPOSED beside every one of them). His words stay in YOUR ANSWER; the status says so."""
    status, question = pair
    a = str(ans or '').strip()
    if not a:
        return status, question
    verdict = 'RULED' if a.lower().startswith(('yes', 'one', 'two')) else 'RULED — and he said no'
    return f'{verdict} — {a[:60]}' if len(a) > 60 else f'{verdict} — {a}', question

def ask(q):
    """(STATUS, QUESTION FOR YOU) for one row — shaped by what the row actually asks of him."""
    screens = [words(s) for s in q['screens']]
    doors = q.get('_own_doors') or []
    if len(doors) > 1:
        # A DOOR INSIDE ANOTHER DOOR IS A COMPONENT, NOT A CONFLICT (founder, 2026-09-27:
        # "base pay is one component of income summary and function should have reflected that").
        # The first version of this question counted orchestrators and asked "one, or two?" — which is
        # the wrong question when one of them CALLS the other, as incomeSummary calls basePay. That is
        # already the right shape. Only SIBLINGS — two doors where neither reaches the other — are two
        # answers to one question, and only they are worth his time.
        nests = [(a, b) for a in doors for b in doors if a != b and a in closure_of({b})]
        sib = [d for d in doors if not any(d == a for a, _ in nests)]
        if len(sib) < 2:
            pairs = and_list([f"{FN[a]['name'] if a in FN else a} inside {FN[b]['name'] if b in FN else b}" for a, b in nests])
            return ('MINE TO BUILD — nothing to decide',
                    f"Nothing for you. {len(doors)} functions, and they nest: {pairs}. A function that is a part of "
                    f"a bigger one is the right shape, not a disagreement — I read the code to be sure.")
        names = and_list([f"{d} {FN[d]['name']}" if d in FN else d for d in sib])
        return ('WAITING ON YOU — one question, or several?',
                f"{len(sib)} functions answer this and NEITHER is inside the other: {names}. Two separate answers to "
                f"one question is how two screens come to show two numbers for one thing. Should they become ONE, "
                f"or stay {len(sib)}?  Write ONE or {len(sib)}.")
    if len(screens) > 1:
        return ('WAITING ON YOU — do these screens agree?',
                f"{and_list(screens)} {'both' if len(screens) == 2 else 'all'} answer this same question: "
                f"“{q['question']}”. I want ONE function to produce every figure on {'both' if len(screens) == 2 else f'all {len(screens)}'}, "
                f"so they can never disagree with each other. Write YES — or name the screen that does not belong here, and why.")
    return ('MINE TO BUILD — nothing to decide',
            f"Nothing for you. One screen ({screens[0]}), one function, {q['_nfigs']} figure{'' if q['_nfigs'] == 1 else 's'}. "
            f"You see it when it is built.")

MAPCOLS = ['Question ID', 'The question (one orchestrator)', 'Family', 'Screens that ask it (route → file)', 'Figures it hands out (rows on the master)', 'How many figures', 'Producer functions the rows name today', 'Functions in its closure — everything its figures\' functions call (generated from the code)', 'How many in the closure', 'Reached by its screens but named by no row of this question (imports, incl. components and hooks) — figures without rows, or another question\'s work', 'Doors that exist today inside it', 'Inputs it must assemble (union of what the rows\' chains read)', 'Decisions it applies (union of the rows\' decisions and assumptions)', 'Rows not seen on their screen in the census', 'Note / recommendation', 'The approved design each screen was drawn from', 'Screens here with NO approved design', 'STATUS', 'QUESTION FOR YOU', 'YOUR ANSWER', 'ROW VERIFIED — founder, date and how']
rows = []
for q in MAP:
    strip = lambda ln: re.sub(r'^\d+\.\s*', '', ln.strip())
    inputs = sorted({strip(ln) for r in q['_rows'] for ln in ROWS[r]['inputs'].split('\n') if ln.strip() and not ln.startswith('NOT')})
    decs = sorted({strip(ln) for r in q['_rows'] for ln in (ROWS[r]['decisions'] + '\n' + ROWS[r]['assumptions']).split('\n') if ln.strip() and not ln.startswith('NOT')})
    unseen = [r for r in q['_rows'] if not ROW_SEEN[r][0] and not ROWS[r]['active'].startswith(('DECOMM', 'SUPERS'))]
    q['_nfigs'] = len(q['_rows'])
    k = KEEP.get(('Map', q['id']), {})
    rows.append([q['id'], q['question'], q['family'], '\n'.join(f"{s} → {ROUTE_FILE.get(s, '(no census — not a routed screen)')}" for s in q['screens']), '\n'.join(fig(r) for r in q['_rows']), len(q['_rows']),
                 '\n'.join(fn(f) for f in q['_producers']), '\n'.join(fn(f) for f in q['_closure']), len(q['_closure']), '\n'.join(fn(f) for f in q['_extra']) or '—', '\n'.join(fn(f) for f in q['_doors']) or 'none — every figure reached through inner parts',
                 '\n'.join(inputs)[:6000], '\n'.join(decs)[:6000], '\n'.join(fig(r) for r in unseen) or '—', q.get('note', ''), '\n'.join(designed(q)) or 'none of them', '\n'.join(undesigned(q)) or 'none — every screen has one',
                 *answered(ask(q), k.get('YOUR ANSWER', '')), k.get('YOUR ANSWER', ''), k.get('ROW VERIFIED — founder, date and how', '')])
sheet('Map', MAPCOLS, rows, None,
      mine=['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],   # the inventory — mine to check, not his to read
      pin={'A': 11, 'B': 46, 'C': 8, 'D': 34, 'O': 40, 'P': 34, 'Q': 26, 'R': 26, 'S': 62, 'T': 30, 'U': 26},
      max_lines=9)   # the question in column Q is read in place, so its row is as tall as it needs
CENCOLS = ['Kind', 'Screen / route', 'File', 'What (text with digits as #, or the identifier)', 'Data states seen in / category', 'Visible or spoken / detail', 'Context (the lines before it) / words looked for', 'What it means', 'YOUR ANSWER']
sheet('Census', CENCOLS, [r + [KEEP.get(('Census', r[0]), {}).get('YOUR ANSWER', '')] for r in CENSUS_ROWS], None,
      pin={'A': 22, 'B': 20, 'C': 30, 'D': 46, 'E': 18, 'F': 16, 'G': 44, 'H': 44, 'I': 30})
CONCOLS = ['Conflict ID', 'Kind', 'Identifiers', 'Where', 'What', 'Recommendation', 'YOUR ANSWER']
sheet('Conflicts', CONCOLS, [r + [KEEP.get(('Conflicts', r[0]), {}).get('YOUR ANSWER', '')] for r in CONF], None, pin={'F': 56, 'G': 30})
# a front sheet: the counts
front = wb.create_sheet('Read me', 0)
unassigned = [m for m in ROWS if m not in QROWS]
cc = Counter(r[0] for r in CENSUS_ROWS)
asked = [q for q in MAP if ask(q)[0].startswith('WAITING')]
mine = [q for q in MAP if not ask(q)[0].startswith('WAITING')]
for line in [['The orchestrator map — phase 1 of the orchestrator plan (spec § The plan). Built by build-orchestrator-map.py from the master, the figure census and the code; hand edits die. Your columns (YOUR ANSWER, ROW VERIFIED) survive rebuilds.'],
             ['HOW TO USE THIS FILE', 'Go to the Map tab. Read column Q. Answer in column R. That is the whole job.'],
             ['What is NOT yours', 'Checking the figures and the screens. That inventory is columns E to N, it is mine, and the gates check it — you were asked to validate it once and you were right to refuse (2026-09-27).'],
             ['WHERE THESE QUESTIONS COME FROM', 'The CODE and the master file, not your approved mockups. The question text and the screen list are hand-kept by me in moneykeel_orchestrator_questions.json; the figures, functions and screens are generated from what the app actually does today. That is why a question can name a screen you have never seen a design for — the Map tab now says which, per row, in "Screens here with NO approved design".'],
             ['DOES ANY OF THIS WORDING REACH A USER?', 'No. Column B is an internal name for one orchestrator — checked against every string in src/ on 2026-09-27, and not one of the 22 appears in the app. Screen copy comes from the approved mockups and the one-term canon, never from here.'],
             ['What IS yours', 'One judgement per row, and only on the rows that carry one: should these screens be answered by ONE function, so they can never disagree? Every row that carries no judgement says MINE TO BUILD and waits for nobody.'],
             ['Rows that need you', len(asked), ' · '.join(q['id'] for q in asked)],
             ['Rows that do not', len(mine), ' · '.join(q['id'] for q in mine)],
             ['Built from', os.path.basename(MASTER) + ' · census ' + CENSUS['generated']],
             ['Questions proposed', len(MAP)], ['Figure rows on the master', len(ROWS)], ['Rows assigned to a question', len(QROWS)], ['Rows assigned to no question', len(unassigned), ' · '.join(unassigned)],
             ['Screens in the census', len(CENSUS['screens'])], ['Renders in the census (screen × state × section)', sum(1 for v in CENSUS['screens'].values() for k in v if k != 'file')], ['Strings in the census', sum(len(v[k]) for v in CENSUS['screens'].values() for k in v if k != 'file')],
             ['Places in the code that print a dollar figure', len(SITES)],
             ['… of those, a row describes it', cc['money figure — a row describes it']],
             ['… of those, more than one row could be it (Claude reads)', cc['money figure — more than one row could be it']],
             ['… of those, NO row describes it (Claude proposes a row, you confirm)', cc['money figure with NO row']],
             ['Census — text blocks with a figure that no row claims (percents, ages, counts and money together)', cc['figure no row claims']], ['Census — rows not seen on their screen', cc['row not seen on its screen']], ['Census — functions inside no question', cc['function inside no question']], ['Census — orchestrator orphans', cc['orchestrator orphan']],
             ['Conflicts for your ruling', len(CONF)],
             ['Proposed pilot', 'Q-PL-3 — when should I claim Social Security: 4 callers, 8 functions, statutory figures registered. Named on the Map row; decided with your mark.'],
             ['What the census cannot see', 'Onboarding (a flow of steps), sign-in, connection and the add-account form are not rendered. In-screen sections are opened by pressing every button whose spoken label ends in "tab" and the grouping chips (By institution, By account, Chart, Table…); a section opened by any other tap is not seen. A row the census does not see may sit behind such a tap — say so in YOUR ANSWER and it is added to the press list.'],
             ['How to read the Map', 'One row per proposed orchestrator. Mark YES in YOUR ANSWER, or say which figure, screen or function moves to another question. Nothing is built before the row carries your mark (Orchestrator rule 10).'],
             ['How to read the Census', 'A finding is one gap between what the screens show and what the master file knows. The census rendered every screen and compared it with the file, both ways. "Figure no row claims" means the screen shows a number the file does not describe. "Row not seen on its screen" means the file describes a figure the census could not find on the screen. "Function inside no question" means a calculation exists that none of the 22 questions uses. "Plumbing categorised as calculation" means saving, syncing and sign-in code was labelled as if it produced figures. "Orchestrator orphan" means a door exists that no row names or no screen uses. The last column says in plain words what each one means and who acts on it.'],
             ['How to read Conflicts', 'A conflict is a place where the code does not yet follow one of the ten rules, and a decision is needed before the door is built. "Two doors, one question?" means two orchestrators exist for what may be one question (rule 1). "A question about the answers" means insights need figures other questions own, and a door may not call a door (rule 3). "One function, rows in two questions" means the same function prints figures under two questions, and one of them must own it (rule 6). "Two functions for one concept" means the same idea is computed in two or three places, so two screens can show two numbers (rule 2). "Same name stem, different files" means two functions may be the same concept under two names (rule 2). "A figure the screen computes" means the screen does arithmetic itself instead of asking a function (rule 5). Each row carries a recommendation; your answer goes in the last column.']]:
    front.append(line)
readable(front, widths={'A': 30, 'B': 74, 'C': 44}, freeze='A1', filt=False, max_lines=6)
for row in front.iter_rows():
    for c in row: c.alignment = WRAP
wb.save(OUT)
print(f'map: {len(MAP)} questions · rows assigned {len(QROWS)} of {len(ROWS)} (unassigned: {unassigned}) · census findings {dict(cc)} · conflicts {len(CONF)} → {os.path.relpath(OUT, ROOT)}')
