#!/usr/bin/env python3
"""THE CASH FLOW EVIDENCE PACKAGE — the 94 screen checks an outside reviewer could not settle, with what it lacked (2026-10-31, BRIEF-94).

OpenAI audited the Cash flow module on 2026-10-25. In its screen checks (parts 18 and 19) it gave 197 FAILs; our measurer
(src/screens/__tests__/outside_cashflow_openai_screens.test.tsx) classed 94 of them EVIDENCE GAP — the reviewer saw only the
figures' written records, so it could not tell right from wrong. Workplan row #362: the next package carries what it could not
see — the renders, the store before and after, each drawing and its match test, and the simulation contract.

This one script builds the whole package, from the code as it stands, and checks it before zipping:

  1. THE CASES — read from the measurer's results file; the count is printed, and it must be 94 or the reason is printed.
  2. THE EVIDENCE — Calculation Module code/scripts/cf-evidence/cf-evidence-94.gen.tsx renders each case's screen in the
     measurer's own household on the measurer's own day (its harness is cut from its source, never retyped), with every stored
     value before and after, the same household arriving by a cloud sync, each drawing's phones, every test block that reads a
     drawing, and the future paycheck's simulation watched as it runs. Then the measurer and every match test are run, and each
     test's result is read back.
  3. THE BRIEF — for a fresh Claude with no access to the code: what MoneyKeel is, his tenets and the rulings the cases need
     (quoted from the decision log), how to judge, and the answer format. Every number in it is registered with its source here,
     and the self-check fails on any number that is not.
  4. THE SELF-CHECK — every case has its evidence (a coverage line, N of N), every number in the brief is traced, every case
     is in exactly one part; then the zip. --self-test plants a fault for each check and fails unless each one fires.

    python3 "Calculation Module code/scripts/build-cf-evidence-package.py"                 # build, check, zip
    python3 "Calculation Module code/scripts/build-cf-evidence-package.py" --self-test     # each check must fire on a planted fault
    python3 "Calculation Module code/scripts/build-cf-evidence-package.py" --at HEAD               # build from a clean worktree of a commit
    python3 "Calculation Module code/scripts/build-cf-evidence-package.py" --read-answers ANSWERS.jsonl [--out FILE.json]

--at COMMIT builds from a temporary git worktree of that commit (node_modules linked in, the generator copied in, removed after),
so other agents' edits in the working tree cannot reach it. Without --at it builds from the working tree and the brief says how many
files there were not yet committed. For the package that goes out, build --at the commit the fixes landed in.

Nothing in the app, its records or its drawings is changed. It writes only the package folder, its zip, and a scratch folder.
"""
import argparse
import collections
import datetime
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
HOME = ROOT            # the working tree: where the package is written, whatever tree it is built from
AUDIT = os.path.join(ROOT, 'MoneyKeel', 'documents', 'audit', 'outside-test-cases')
RESULTS = os.path.join(AUDIT, 'returned', 'results', 'cashflow_openai_screens_results.json')
PACKAGE_NAME = 'MoneyKeel_CashFlow_Evidence_Package_v01'
OUT = os.environ.get('CF94_PACKAGE_DIR') or os.path.join(AUDIT, 'to-send', PACKAGE_NAME)
GEN_CONFIG = os.path.join(HERE, 'cf-evidence', 'jest.cf-evidence.config.cjs')
DECISIONS = os.path.join(HERE, 'moneykeel_decisions.json')
DESIGN_RECORD = 'MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md'
TENETS = 'MoneyKeel/documents/standards/moneykeel_spec_tenets_v01.md'
STEM = 'moneykeel_audit_cf-evidence'
EXPECTED = 94          # the founder's count (his brief of 2026-10-31); the build prints the true count beside it
ENTERED_N = 7          # the measurer's entered keys; checked against its own list below

FRAME_OF = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6}
# Which rows of the design record describe each screen. Typed here, so each must be found exactly once or the build stops.
DESIGN_ROWS = {
    ('CashFlowScreen', None): ['Cash flow'], ('CashFlowScreen', 'Income'): ['Cash flow'],
    ('CashFlowScreen', 'Expenses'): ['Cash flow', 'Budget (Expenses · Debts)'], ('CashFlowScreen', 'Debts'): ['Cash flow', 'Budget (Expenses · Debts)'],
    ('HomeScreen', None): [], ('BasePayScreen', None): ['Base pay'], ('IncomeSummaryScreen', None): ['Income summary'],
    ('IncomeManagerScreen', None): ['Income manager'], ('BillCalendarScreen', None): ['Bill calendar'], ('MonthlyIncomeScreen', None): ['Monthly income'],
}
# The parts: one session each, grouped by the screen the reviewer looks at. A case whose screen is not here stops the build.
PARTS = [
    ('cf-month', 'The Cash flow tab: This month, and Home\'s box for this month'),
    ('cf-expenses', 'The Cash flow tab: Expenses'),
    ('cf-income', 'The Cash flow tab: Income'),
    ('cf-debts', 'The Cash flow tab: Debts'),
    ('paycheck', 'Your future paycheck and the retired month — the cards no drawing draws, and the simulation'),
    ('basepay', 'Your base pay'),
    ('income', 'Your income, all of it — and the income manager'),
    ('bills', 'The bill calendar'),
]
PART_OF = {('CashFlowScreen', None): 'cf-month', ('HomeScreen', None): 'cf-month', ('CashFlowScreen', 'Expenses'): 'cf-expenses',
           ('CashFlowScreen', 'Income'): 'cf-income', ('CashFlowScreen', 'Debts'): 'cf-debts', ('BasePayScreen', None): 'basepay',
           ('IncomeSummaryScreen', None): 'income', ('IncomeManagerScreen', None): 'income', ('BillCalendarScreen', None): 'bills'}
# a test holds a screen to a drawn phone only when it compares the two streams — a test that merely names a phone does not
COMPARES = re.compile(r'firstDifference|firstBreakInside|missingInOrder|\bcheck\(H\.AS_BUILT')
# The rulings every case needs, whatever its figure: printed in the brief, quoted from the decision log.
CROSS_RULINGS = ['DEC-3523', 'DEC-0808', 'DEC-4529', 'DEC-1560', 'DEC-0440', 'DEC-0177']
SIM_RULINGS = ['DEC-0247', 'DEC-2164', 'DEC-0244', 'DEC-0088']
# A sync that converts a take-home typed the old way (salaryMode 'takehome' → the typed amount kept as landsTypical, the gross worked
# back): his DEC-0200 ("converted ONCE on the way in and stored") and the lead's DEC-8387 (the conversion runs as the profile comes
# in). Quoted under every case whose sync rewrote one of these fields.
SYNC_FIELDS = {'salaryMode', 'landsTypical', 'grossWorkedBack'}
SYNC_RULINGS = ['DEC-0200', 'DEC-8387']

DEC_RE = re.compile(r'DEC-\d{4,}')
PUA = re.compile(r'[-]')


def set_root(root):
    """Point every read at a tree: the working tree, or a clean worktree of a commit (--at). The package is always written into the
    working tree's to-send folder."""
    global ROOT, AUDIT, RESULTS, GEN_CONFIG, DECISIONS
    ROOT = root
    AUDIT = os.path.join(ROOT, 'MoneyKeel', 'documents', 'audit', 'outside-test-cases')
    RESULTS = os.path.join(AUDIT, 'returned', 'results', 'cashflow_openai_screens_results.json')
    GEN_CONFIG = os.path.join(ROOT, 'Calculation Module code', 'scripts', 'cf-evidence', 'jest.cf-evidence.config.cjs')
    DECISIONS = os.path.join(ROOT, 'Calculation Module code', 'scripts', 'moneykeel_decisions.json')


def worktree_at(commit):
    """A clean tree of the commit: git worktree, node_modules linked from the working tree, the generator copied in."""
    home = os.path.abspath(os.path.join(HERE, '..', '..'))
    sha = subprocess.run(['git', 'rev-parse', '--short', commit], cwd=home, capture_output=True, text=True).stdout.strip()
    if not sha:
        sys.exit(f'STOP — {commit} is not a commit of this repository')
    wt = tempfile.mkdtemp(prefix=f'cf94-at-{sha}-')
    os.rmdir(wt)
    p = subprocess.run(['git', 'worktree', 'add', '--detach', wt, sha], cwd=home, capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f'STOP — git worktree add failed: {p.stderr.strip()}')
    os.symlink(os.path.join(home, 'node_modules'), os.path.join(wt, 'node_modules'))
    dst = os.path.join(wt, 'Calculation Module code', 'scripts', 'cf-evidence')
    if not os.path.exists(dst):
        shutil.copytree(os.path.join(HERE, 'cf-evidence'), dst)
    print(f'   building from a clean worktree of {sha}: {wt}')
    return wt, sha, home


def drop_worktree(wt, home):
    subprocess.run(['git', 'worktree', 'remove', '--force', wt], cwd=home, capture_output=True, text=True)
    shutil.rmtree(wt, ignore_errors=True)


def rel(p):
    return os.path.relpath(p, ROOT)


def git(*args):
    try:
        return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    except Exception:
        return ''


def text_of(fragment):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', fragment))).strip()


def shown(line):
    """A rendered line as a person sees it: an icon-font glyph (a private-use character) is written [icon]."""
    return PUA.sub('[icon]', line)


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# 1. THE CASES
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def load_cases():
    res = json.load(open(RESULTS, encoding='utf8'))
    rows = res['screen_checks']
    classes = collections.Counter(r.get('classification') for r in rows)
    fails = [r for r in rows if r.get('reviewer_verdict') == 'FAIL']
    gaps = [r for r in rows if r.get('classification') == 'EVIDENCE GAP']
    # the guard looked: it read every row, and every FAIL has a class it knows
    assert len(rows) >= 500, f'only {len(rows)} screen checks in {rel(RESULTS)} — the reader is blind'
    unknown = sorted({r.get('classification') for r in fails} - {'APP WRONG', 'REVIEWER WRONG', 'NEEDS A RULING', 'EVIDENCE GAP'})
    assert not unknown, f'FAILs with a class this build does not know: {unknown}'
    m = re.search(r'(\d+) evidence gaps', res.get('coverage', {}).get('fails', ''))
    stated = int(m.group(1)) if m else None
    keys = [f"{r['figure']}#{r['tenet']}" for r in gaps]
    assert len(set(keys)) == len(keys), 'two evidence gaps share a figure and a tenet'
    count = {'rows': len(rows), 'fails': len(fails), 'gaps': len(gaps), 'stated_in_file': stated, 'classes': dict(classes),
             'by_tenet': dict(collections.Counter(r['tenet'] for r in gaps)), 'by_part': dict(collections.Counter(r['part'] for r in gaps)),
             'by_kind': dict(collections.Counter(r['reviewer_kind'] for r in gaps))}
    if len(gaps) == EXPECTED:
        count['why'] = f'{len(gaps)} of {len(fails)} FAILs are classed EVIDENCE GAP, as the file\'s own coverage line states ({stated}).'
    else:
        count['why'] = (f'the results file holds {len(gaps)} EVIDENCE GAP entries, not {EXPECTED}; its own coverage line states {stated}. '
                        f'The classes, counted from the entries: {dict(classes)}. A fixer re-classed entries since the founder\'s count.')
    return res, gaps, count


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# 2. THE EVIDENCE — the generator, then the tests
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def run_generator(gaps, measurer, tmp):
    cj = os.path.join(tmp, 'cases.json')
    json.dump([{'figure': r['figure'], 'tenet': r['tenet']} for r in gaps], open(cj, 'w'))
    out = os.path.join(tmp, 'evidence.json')
    env = dict(os.environ, CF94_CASES=cj, CF94_OUT=out, CF94_MEASURER=measurer)
    print('   rendering the cases\' screens (the generator, its own jest config) …')
    p = subprocess.run(['npx', 'jest', '--config', GEN_CONFIG, '--runInBand', '--silent', '--no-watchman'], cwd=ROOT, env=env, capture_output=True, text=True)
    if p.returncode != 0 or not os.path.exists(out):
        print((p.stdout + p.stderr)[-6000:])
        sys.exit('STOP — the evidence generator failed; nothing was written.')
    return json.load(open(out, encoding='utf8'))


def run_tests(files, tmp):
    out = os.path.join(tmp, 'tests.json')
    print(f'   running {len(files)} test files for their results (the measurer and every test that reads these drawings) …')
    subprocess.run(['npx', 'jest', '--runTestsByPath', *files, '--json', f'--outputFile={out}', '--silent', '--no-watchman'], cwd=ROOT, capture_output=True, text=True)
    if not os.path.exists(out):
        sys.exit('STOP — the tests wrote no results file.')
    j = json.load(open(out, encoding='utf8'))
    status, per_file = {}, {}
    for tr in j['testResults']:
        f = os.path.relpath(os.path.realpath(tr['name']), os.path.realpath(ROOT))   # jest reports the real path (/private/var, not /var)
        c = collections.Counter(a['status'] for a in tr['assertionResults'])
        per_file[f] = {'suite': tr['status'], 'tests': sum(c.values()), **dict(c)}
        for a in tr['assertionResults']:
            status[(f, tuple(a['ancestorTitles']), a['title'])] = a['status']
    missing = [f for f in files if f not in per_file]
    return status, per_file, missing


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# 3. THE RECORDS — the decision log, the design record, the drawings' dated rows, the tenets
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def load_decisions():
    d = json.load(open(DECISIONS, encoding='utf8'))
    rows = d['rows']
    assert len(rows) >= 1000, f'only {len(rows)} decisions in the log — the reader is blind'
    return {r['id']: r for r in rows}


def decision_quote(r):
    plain = str(r.get('plain') or '').strip()
    whose = 'the lead\'s decision under his rulings, recorded in his log — not his own' if plain.startswith('NOT A DECISION OF HIS') else 'his'
    return {'id': r['id'], 'decided': str(r.get('decided') or '') or 'not dated in the log', 'in_use': r.get('in_use'), 'whose': whose,
            'his_words': str(r.get('his_words') or '').strip(), 'the_log_records': plain}


def design_rows():
    lines = open(os.path.join(ROOT, DESIGN_RECORD), encoding='utf8').read().split('\n')
    head = [i for i, l in enumerate(lines) if l.startswith('| Screen | Current approved design')]
    assert len(head) == 1, 'the design record\'s table of current approved designs was not found once'
    out = {}
    for l in lines[head[0] + 2:]:
        if not l.startswith('| '):
            break
        cells = [c.strip() for c in l.strip().strip('|').split(' | ')]
        out.setdefault(cells[0].strip('*'), []).append(' | '.join(cells[1:]))
    assert len(out) >= 30, f'only {len(out)} rows in the design record\'s table — the reader is blind'
    return out


def dated_rows(path):
    s = open(os.path.join(ROOT, path), encoding='utf8').read()
    at = s.find('READ THIS FIRST')
    assert at > 0, f'{path} has no READ THIS FIRST box'
    start = s.rfind('<div', 0, at)
    depth, end = 0, None
    for m in re.finditer(r'<div\b|</div>', s[start:]):
        depth += 1 if m.group().startswith('<div') else -1
        if depth == 0:
            end = start + m.end()
            break
    box = s[start:end]
    title = text_of(re.search(r'<b>(.*?)</b>', box, re.S).group(1))
    rows = []
    if '<tr' in box:
        trs = re.findall(r'<tr>(.*?)</tr>', box, re.S)
        heads = [text_of(h) for h in re.findall(r'<th[^>]*>(.*?)</th>', trs[0], re.S)]
        for tr in trs[1:]:
            cells = [text_of(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)]
            row = dict(zip(heads, cells)) if heads else {'text': ' · '.join(cells)}
            rows.append(row)
        intro = text_of(re.split(r'<table', box, maxsplit=1)[0].split('</b>', 1)[1])
    else:
        body = box.split('</b>', 1)[1]
        chunks = [text_of(c) for c in re.split(r'<br>\s*<br>', body)]
        intro = ''
        for c in chunks:
            if re.match(r'\d{4}-\d{2}-\d{2}', c):
                rows.append({'text': c})
            elif c and not rows:
                intro = c
            elif c:
                rows[-1]['text'] += ' ' + c
    for r in rows:
        t = ' '.join(r.values())
        r['_ruled'] = (re.search(r'\d{4}-\d{2}-\d{2}', t) or [None])[0] if re.search(r'\d{4}-\d{2}-\d{2}', t) else None
        r['_records'] = sorted(set(DEC_RE.findall(t)))
    assert rows, f'{path}: the READ THIS FIRST box was found but no dated row was read from it'
    return {'title': title, 'intro': intro, 'rows': rows}


def tenet_words():
    """His eight tenets as the approved standard writes them, read from the file: number → (headline, sentence)."""
    t = open(os.path.join(ROOT, TENETS), encoding='utf8').read()
    out = {}
    for m in re.finditer(r'^(\d)\. \*\*(.+?)\*\*\s*(.*?)(?=^\d\. \*\*|\Z)', t, re.M | re.S):
        out[int(m.group(1))] = (m.group(2).strip(), re.sub(r'\s+', ' ', m.group(3)).strip())
    assert sorted(out) == list(range(1, 9)), f'the tenets standard does not read as eight tenets: {sorted(out)}'
    return out


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# 4. EACH CASE'S EVIDENCE
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def top_args(call):
    """The arguments of shoot(…) as written, split at the commas that are not inside brackets or quotes."""
    inner = call[call.index('(') + 1: call.rindex(')')]
    out, depth, cur, q = [], 0, '', None
    for ch in inner:
        if q:
            cur += ch
            if ch == q:
                q = None
            continue
        if ch in '\'"`':
            q = ch
        elif ch in '([{':
            depth += 1
        elif ch in ')]}':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip())
            cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def taps_of(act, helpers):
    """The taps a render makes, in words, read from the measurer's own call and its helpers' source."""
    if not act or act == 'undefined':
        return None, 'none — the screen as it opens'
    m = re.fullmatch(r"tab\('(\w+)'\)", act)
    if m:
        return m.group(1), f'pressed the "{m.group(1)} tab" button'
    m = re.fullmatch(r'(next|prev)\((\d+)\)', act)
    if m:
        word = 'Next month' if m.group(1) == 'next' else 'Previous month'
        return None, f'pressed "{word}" {m.group(2)} time{"s" if m.group(2) != "1" else ""}'
    src = helpers.get(act, act)
    t = re.search(r"getByLabelText\('(\w+) tab'\)", src)
    said = f'ran the measurer\'s step `{act}`: {src}' if act in helpers else f'ran: {act}'
    return (t.group(1) if t else None), said


def block_phones(b):
    name = b['name']
    out = {int(x) for x in re.findall(r'\b(?:phone|frame) (\d+)\b', name, re.I)}
    m = re.match(r'^([A-F]) · ', name)
    if m:
        out.add(FRAME_OF[m.group(1)])
    return sorted(out)   # by the test's own name only: a guard's self-test that reads a phone to plant a fault holds nothing


MON = r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'


def level(x):
    """A line with case, the kind of quote mark and spacing levelled — the match tests' normExact."""
    return re.sub(r'\s+', ' ', x.lower().replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')).strip()


def shape(x):
    """The same line with every figure and date as a placeholder — the match tests' norm(): the rendered household is not the
    drawing's household, so its own amounts and months differ while its words do not."""
    t = level(x)
    t = re.sub(rf"\b{MON} \d{{1,2}}(, \d{{4}})?\b", '<date>', t)
    t = re.sub(rf"\b\d{{1,2}} {MON}\b", '<date>', t)
    t = re.sub(rf"\b{MON}\b( [’']?\d\d(\d\d)?)?", '<month>', t)
    t = re.sub(r'[~≈]?[+−-]?\$[\d,]+(\.\d+)?', '$#', t)
    t = re.sub(r'[+−-]?\d+(\.\d+)?%', '#%', t)
    return re.sub(r'\d+(\.\d+)?', '#', t)


def find_on(phones, probe, pat=None):
    """Where a rendered line is drawn, in three steps, each named: the whole rendered line word for word; else the measurer's own
    line beside the figure (its words, or its pattern — the start of a sentence); else the same words with the drawing's own figures
    and dates (the rendered household is not the drawing's)."""
    hit = lambda ok: [(n, i + 1, l) for n, p in phones.items() for i, l in enumerate(p) if ok(l)]
    exact = hit(lambda l: level(l) == level(probe))
    if exact:
        return exact, 'the whole rendered line, word for word'
    if pat:
        if pat.get('s') is not None:
            pm = hit(lambda l: level(l) == level(pat['s']))
        else:
            pm = hit(lambda l: bool(re.search(pat['re'], l, re.I) or re.search(pat['re'], level(l), re.I)))
        if pm:
            return pm, 'the measurer\'s line beside the figure, as it reads it'
    same = hit(lambda l: shape(l) == shape(probe))
    return same, ('the same words, with the drawing\'s own figures and dates' if same else None)


def block_screen(b, tf):
    named = set(re.findall(r'\b(\w+Screen)\b', b['text'])) & set(tf['imports_screens'])
    if named:
        return named
    return set(tf['imports_screens']) if len(tf['imports_screens']) == 1 else set()


def block_tab(b):
    m = re.search(r"\btab\('(\w+)'\)", b['text'])
    return m.group(1) if m else None


def slug(drawing):
    return os.path.basename(drawing).replace('moneykeel_pres_mock_', '').replace('.html', '').replace('-', ' ').replace('_', ' ').lower()


def belongs(b, tf, drawing):
    if tf['reads'] == [drawing]:
        return True
    s = slug(drawing)
    return any(s in a.lower() for a in b['ancestors']) or os.path.basename(drawing) in b['text']


def build_cases(gaps, ev, status, decisions, design, rows_of, tenets):
    measurer = ev['measurer']['file']
    screens = ev['measurer']['screens']
    blocks = ev['blocks']
    renders = ev['renders']
    cases = []
    for r in gaps:
        fid, tn = r['figure'], r['tenet']
        key = f'{fid}#{tn}'
        f = ev['figs'][fid]
        sh = renders[f['main']]
        args = top_args(sh['source'])
        act = args[4] if len(args) > 4 else None
        tab, taps = taps_of(act, ev['measurer']['helpers'])
        component = screens[sh['screen']]
        line_pat = f['line']
        printed_id = (f['nowAs'] or {}).get('id') or ('MK-CF-M-004' if f['viaRows'] else fid)

        def line_hit(lines):
            for i, l in enumerate(lines):
                if (line_pat.get('s') is not None and l == line_pat['s']) or (line_pat.get('re') is not None and re.search(js_re(line_pat['re']), l)):
                    return i + 1
            return None
        at = line_hit(sh['lines'])
        prints = [p['text'] for p in sh['printed'] if p['id'] == printed_id]
        ev_case = {
            'render': f['main'],
            'line_beside_the_figure': {'as_the_measurer_reads_it': line_pat.get('s') if line_pat.get('s') is not None else f'/{line_pat["re"]}/',
                                       'found_at_render_line': at},
            'printed_under': printed_id, 'printed_texts': prints,
        }
        if f['nowAs']:
            ev_case['moved'] = f'The line now prints under {f["nowAs"]["id"]}, not {fid}: {f["nowAs"]["seen"]}'
        entered = sh['entered_keys']
        same = {k: ('same' if json.dumps(sh['before'].get(k), sort_keys=True) == json.dumps(sh['after'].get(k), sort_keys=True) else 'changed') for k in entered}
        ev_case['store'] = {'entered_keys_compared': len(entered), 'entered': same, 'opening_changed_nothing_entered': not sh['entered_changed'],
                            'any_stored_value_changed': sh['any_stored_key_changed']}
        cl = ev['cloud'].get(f['main'])
        if cl:
            diffs = {}
            for k in entered:
                if not cl['entered_equal'][k]:
                    a, b2 = sh['before'].get(k), cl['entered_after_sync'].get(k)
                    if isinstance(a, dict) and isinstance(b2, dict):
                        diffs[k] = {x: {'as_entered': a.get(x), 'after_the_sync': b2.get(x)} for x in sorted(set(a) | set(b2)) if a.get(x) != b2.get(x)}
                    else:
                        diffs[k] = {'as_entered': a, 'after_the_sync': b2}
            sync_prints = [p['text'] for p in cl['printed'] if p['id'] == printed_id]
            ev_case['sync'] = {'how': cl['how'], 'entered_keys_unchanged': sum(cl['entered_equal'].values()), 'of': len(entered),
                               'what_the_sync_rewrote': diffs, 'figure_printed_after_the_sync': sync_prints,
                               'figure_same_after_the_sync': sync_prints == prints, 'whole_screen_same_after_the_sync': cl['lines_equal']}
        else:
            ev_case['sync'] = {'not_run': 'this render sets its household through its own step before opening, so a second arrival is not the same household'}

        decs = sorted({d for d in decisions if fid in (str(decisions[d].get('governs') or '') + ' ' + str(decisions[d].get('screens') or '')) and 'OLD' not in str(decisions[d].get('in_use'))}
                      | set(DEC_RE.findall(json.dumps(ev['register'].get(fid, {}), ensure_ascii=False)))
                      | set(DEC_RE.findall(f.get('drawingNote') or '')))
        rewrote = ev_case['sync'].get('what_the_sync_rewrote', {}).get('onboardingProfile', {})
        if isinstance(rewrote, dict) and SYNC_FIELDS & set(rewrote):
            decs = sorted(set(decs) | set(SYNC_RULINGS))
        tests_ours = []
        for (tf, anc, title), st in status.items():
            if tf == measurer and anc and anc[0].startswith(fid + ' ') and title.startswith(f'T{tn} · '):
                tests_ours.append({'file': tf, 'test': ' › '.join(list(anc) + [title]), 'result': st,
                                   'what_it_checks': ('opening the screen changes nothing entered, and the figure prints under its identifier' if tn == 5
                                                      else 'the line beside the figure is on the rendered screen, and its drawing and match test exist' if tn == 6
                                                      else 'the simulated figure is the same on every run, and the draw search is the one the contract states')})
        case = {'case': key, 'figure': fid, 'figure_label': ev['register'].get(fid, {}).get('label'), 'tenet': tn,
                'tenet_words': f'{tenets[tn][0]} {tenets[tn][1]}',
                'first_review': {'date': '2026-10-25', 'reviewer': 'OpenAI', 'audit_part': r['part'], 'verdict': r['reviewer_verdict'], 'kind': r['reviewer_kind'],
                                 'what_it_said_it_lacked': r['reviewer_why']},
                'figure_record': ev['register'].get(fid), 'evidence': ev_case, 'decisions': decs, 'our_tests': tests_ours,
                '_component': component, '_tab': tab, '_taps': taps, '_drawing': f['mock']}
        status_word, why = 'FOR YOU TO SETTLE', None
        if tn == 6:
            d = f['mock']
            if not d:
                ev_case['drawing'] = {'none': f'No approved drawing draws this figure: {f["drawingNote"]}.'}
                why = 'no approved drawing draws it, so tenet 6 rests on the decisions quoted'
            else:
                holders = []
                for b in blocks:
                    tf = ev['test_files'].get(b['file'])
                    if not tf or d not in tf['reads'] or b['dynamic'] or not belongs(b, tf, d) or not COMPARES.search(b['text']):
                        continue
                    if component not in block_screen(b, tf):
                        continue
                    if component == 'CashFlowScreen' and block_tab(b) != tab:
                        continue
                    ph = block_phones(b)
                    if ph:
                        holders.append((b, ph))
                cand = sorted({p for _b, ph in holders for p in ph})
                dd = ev['drawings'][d]
                search = {FRAME_OF[k]: v for k, v in dd['as_built'].items()} if dd.get('as_built') else {i + 1: p for i, p in enumerate(dd['phones'])}
                probe = sh['lines'][at - 1] if at else None
                hits, how = find_on({n: search[n] for n in cand if n in search}, probe, line_pat) if probe else ([], None)
                anywhere, how_any = find_on(search, probe, line_pat) if probe else ([], None)
                with_line = sorted({n for n, _i, _l in hits})
                held = []
                for b, ph in holders:
                    st = status.get((b['file'], tuple(b['ancestors']), b['name']), 'not run')
                    held.append({'file': b['file'], 'test': ' › '.join(b['ancestors'] + [b['name']]), 'kind': b['kind'], 'phones': ph, 'result': st,
                                 'lines': f'{b["from"]}–{b["to"]}', 'holds_the_phone_with_the_line': bool(set(ph) & set(with_line))})
                label = line_pat.get('s') or probe or ''
                carried = [] if with_line or not probe else [ln.strip() for b, _ph in holders for ln in b['text'].split('\n') if level(label) in level(ln)][:4]
                which = 'as the match test holds it (the drawn phone with each dated row and kept item applied by name)' if dd.get('as_built') else 'as drawn'
                ev_case['drawing'] = {'file': d, 'phones_read': which, 'phones_that_hold_this_screen': cand,
                                      'the_rendered_line': probe, 'drawn_on_those_phones': [{'phone': n, 'line': i, 'text': l} for n, i, l in hits], 'matched': how,
                                      'drawn_elsewhere_on_the_drawing': [{'phone': n, 'line': i, 'text': l} for n, i, l in anywhere if n not in cand],
                                      'design_record_rows': DESIGN_ROWS.get((component, tab if component == 'CashFlowScreen' else None), [])}
                if carried:
                    ev_case['drawing']['the_test_writes_this_line_itself'] = carried
                ev_case['match_tests'] = held
                key_blocks = [h for h in held if h['holds_the_phone_with_the_line']]
                if not holders:
                    why = 'no test holds this screen to a phone of the drawing'
                elif not with_line:
                    why = (f'the line is not on the phone{"s" if len(cand) > 1 else ""} that hold this screen ({", ".join(map(str, cand))})'
                           + (' — the test that holds the screen writes it in by a named change (quoted under the case); check the dated row or decision it names' if carried
                              else ' — judge whether a dated row or a decision (DEC-1560 keeps twelve named items) allows it'))
                elif any(h['result'] != 'passed' or h['kind'] != 'test' for h in key_blocks):
                    why = 'a test that holds the phone does not pass: ' + '; '.join(f'{h["test"]} — {h["result"]}' for h in key_blocks if h['result'] != 'passed')
                else:
                    status_word = 'SETTLED BY OUR TESTS — WORDS AND FIGURES'
                    why = (f'the line is drawn on phone {", ".join(map(str, with_line))} ({how}), and every test that holds that phone word for word and '
                           f'figure for figure, in the drawing\'s own household, passes at this build: ' + '; '.join(h['test'] for h in key_blocks)
                           + '. Appearance (colour, size, spacing) is not tested here.')
        elif tn == 5:
            st = ev_case['store']
            facts = [('opening the screen changed nothing entered' if st['opening_changed_nothing_entered'] else 'opening the screen CHANGED something entered'),
                     (f'the figure prints under {printed_id}' if prints else f'the figure does NOT print under {printed_id}')]
            if 'entered_keys_unchanged' in ev_case['sync']:
                s2 = ev_case['sync']
                rewrote = '; '.join(f'{k}: ' + (', '.join(v) if 'as_entered' not in v else 'the whole value') for k, v in s2['what_the_sync_rewrote'].items())
                facts.append(f'a sync of the same household left {s2["entered_keys_unchanged"]} of {s2["of"]} entered values exactly as typed'
                             + (f' and rewrote {rewrote}' if rewrote else '')
                             + ('; the figure prints the same after it' if s2['figure_same_after_the_sync'] else '; the figure prints DIFFERENTLY after it'))
            why = 'tenet 5 asks whether a rule replaced what the person entered — a judgement on the figure, not on the store alone. Our facts: ' + '; '.join(facts) + '. Edits on another screen are not shown.'
        else:
            why = 'the simulation contract is in this part; judge whether it is complete and whether the figure follows from it'
        # A FIGURE RETIRED SINCE THE REVIEW: the register (read at this build) no longer declares it, and the measurer's pinned test
        # shows its old trace no longer holds — the case asks about a figure the app no longer has
        if 'not_in_register' in (ev['register'].get(fid) or {}) and f['nowAs']:
            pinned = [(' › '.join(list(anc) + [title]), st) for (tf, anc, title), st in status.items()
                      if tf == measurer and anc and anc[0].startswith(fid + ' ') and title.startswith(f'its screen prints it under {fid}')]
            if pinned and all(st == 'passed' for _t, st in pinned):
                status_word = 'SETTLED — THE FIGURE IS RETIRED'
                why = (f'the register no longer declares {fid} ("{ev["register"][fid]["not_in_register"]}"), and its line prints under {f["nowAs"]["id"]}: '
                       f'{f["nowAs"]["seen"]}. Our test, pinned: ' + '; '.join(f'{t} — {st} (a pinned test that passes is an old answer that no longer holds)' for t, st in pinned))
                tests_ours += [{'file': measurer, 'test': t, 'result': st, 'what_it_checks': f'the screen no longer prints {fid} (the old trace, pinned as test.failing)'} for t, st in pinned]
        case['status'] = status_word
        case['status_reason'] = why
        cases.append(case)
    return cases


def js_re(src):
    """A JavaScript pattern the measurer wrote, read by Python's re (the two agree on every pattern used here)."""
    return src


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# 5. THE BRIEF — every number registered with its source
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
class Traced:
    def __init__(self):
        self.reg = []          # (text, source)
        self.quotes = []       # verbatim quotes, each checked against its source

    def n(self, value, source, fmt='{:,}'):
        t = fmt.format(value) if not isinstance(value, str) else value
        self.reg.append((t, source))
        return t

    def quote(self, text, source_text, source):
        assert re.sub(r'\s+', ' ', text).strip() in re.sub(r'\s+', ' ', source_text), f'a quote is not word for word in {source}: {text[:80]}'
        self.quotes.append((text, source))
        return text


def brief(tr, count, cases, parts, files, decisions, tenets, commit, built_on, settled, sim, dirty, reviewed_on):
    n = tr.n
    retired = sum(1 for c in cases if c['status'] == 'SETTLED — THE FIGURE IS RETIRED')
    by_t = collections.Counter(c['tenet'] for c in cases)
    dq = {k: decision_quote(decisions[k]) for k in CROSS_RULINGS + SIM_RULINGS}
    tenet_src = open(os.path.join(ROOT, TENETS), encoding='utf8').read()
    L = []
    L += [f'# MoneyKeel Cash flow — {n(len(cases), "the cases counted from the results file")} screen checks to settle', '',
          f'Evidence package v01 · built {built_on} from the code at `{commit}`'
          + (f', with {n(len(dirty), "files changed and not yet committed when the package was built, counted by git")} files changed and not yet committed' if dirty else '')
          + ' · for a reviewer with no access to the code.', '',
          '## What you are asked to do', '',
          f'On {reviewed_on} an outside reviewer checked every figure on MoneyKeel\'s Cash flow screens against eight rules. '
          f'In {n(len(cases), "the cases counted from the results file")} checks it said FAIL because it could not see the screens, the drawings or the '
          'simulation — each case quotes its own words. '
          'This package carries what it could not see. For each check, answer RIGHT, WRONG or CANNOT TELL, give the reason in a sentence or two, '
          'and show the sum you worked by hand.', '',
          '## MoneyKeel, in two lines', '',
          'MoneyKeel is a personal finance app on the phone. Its Cash flow screens show a household what comes in each month, what goes out, '
          'its debts, the bills ahead, and what its savings could pay in retirement.', '',
          '## His eight rules — the tenets', '',
          f'The founder approved these on {dq["DEC-3523"]["decided"]} (DEC-3523). The decision log records them as:', '',
          '> ' + tr.quote(dq['DEC-3523']['the_log_records'], decisions['DEC-3523']['plain'], 'DEC-3523'), '',
          f'The approved standard (`{TENETS}`) says what each one means:', '']
    for k in range(1, 9):
        h, s = tenets[k]
        L.append(f'> **{k}. {tr.quote(h, tenet_src, TENETS)}** {tr.quote(s, tenet_src, TENETS)}')
        L.append('>')
    L += ['', 'Higher means earlier in the list: tenet 1 is the highest, so when two pull against each other the lower number wins.', '',
          '## The rulings every case may need', '',
          'Quoted from the decision log. `his_words` are his; `the_log_records` is the log\'s record of what he decided. A row marked '
          '"the lead\'s decision" was made under his rulings, not by him.', '',
          '```json', json.dumps([dq[k] for k in CROSS_RULINGS], indent=1, ensure_ascii=False), '```', '',
          'Each part also quotes, under every case, the decisions that name that figure.', '',
          '## What each case carries', '',
          f'- **The case**: the figure\'s identifier and the tenet ({n(by_t.get(5, 0), "cases on tenet 5, counted")} on tenet 5, '
          f'{n(by_t.get(6, 0), "cases on tenet 6, counted")} on tenet 6, {n(by_t.get(1, 0), "cases on tenet 1, counted")} on tenet 1), what the first reviewer said, '
          'and the figure\'s own record: its words, how it is worked, and what it says when it cannot be worked.',
          '- **The render**: every line the screen shows, in order, in the case\'s own household on the case\'s own day, after the taps named. '
          'A line `[icon]` is an icon. Beside it, every figure the screen printed under its identifier.',
          '- **The store before and after**: every value the person entered, before the screen opened and after; and the same household '
          'arriving by a sync from the cloud, with anything the sync rewrote.',
          '- **For tenet 6**: the drawing\'s phones that hold this screen, the phone the figure\'s line is drawn on, the drawing\'s dated '
          '"READ THIS FIRST" rows (where a row and a phone disagree, the row is the design), the design record\'s row for the screen, '
          'and every test that holds the screen to a phone, with its code and its result at this build.',
          '- **For the simulation (tenet 1)**: what the card was handed, every run of the simulation it made, the draw search step by step, '
          'what it handed back, and the method\'s own code.',
          '- **Our tests**: our measuring test\'s check for the case, and its result.', '',
          '## How to judge a case', '',
          '- **RIGHT** — the evidence shows the screen keeps the tenet. Say which lines show it.',
          '- **WRONG** — the evidence shows the screen breaks the tenet. Say what it should show instead, and why.',
          '- **CANNOT TELL** — the evidence still does not settle it. Name exactly what would.', '',
          '**Tenet 5** — did a rule, a sync or a sweep replace what the person entered? Read the stored values, then the screen. Work the '
          'figure from what was entered. If the screen uses something else, find the decision that says so; a figure built from a rule the '
          'person did not choose and no decision allows is WRONG.', '',
          '**Tenet 6** — does the screen match his latest approved drawing for this figure: its words, their order, and its figures? The '
          'rendered household is not the drawing\'s household, so compare words and order with the drawing, and work the values by hand '
          'from the stored values. A line the drawing does not draw is RIGHT only where a dated row or a decision keeps it '
          '(DEC-1560: "Rest - keep it."). A drawing that is wrong where the app is right is corrected by a dated row (DEC-4529), never by '
          'the app. A design he approved after the build is the design (DEC-0808).', '',
          '**Tenet 1, the simulation** — is the figure what the stated method gives, and does the contract say enough for someone else to '
          'reproduce it? Check the runs against his rulings quoted in that part.', '',
          'Work every money figure you judge by hand, and write the sum. Never take our status as the answer.', '',
          '## What our own tests already show', '',
          f'{n(settled, "cases whose status reads SETTLED BY OUR TESTS, counted")} of {n(len(cases), "the cases counted from the results file")} '
          'cases are marked **SETTLED BY OUR TESTS — WORDS AND FIGURES**: the figure\'s line is drawn on the phone that holds its screen, and '
          'every test holding that phone word for word and figure for figure passes at this build. Appearance is not tested.'
          + (f' {n(retired, "cases whose status reads SETTLED — THE FIGURE IS RETIRED, counted")} more '
             f'{"is" if retired == 1 else "are"} marked **SETTLED — THE FIGURE IS RETIRED**: the app no longer has that figure, and its line prints under another.' if retired else '')
          + ' Give your own verdict on these too; tell us if you disagree.', '',
          '## The answer format — one JSON line per case', '',
          'Put one line per case in a file named `answers.jsonl`, in any order, every case once:', '',
          '```json',
          '{"case": "<figure identifier>#<tenet>", "verdict": "RIGHT | WRONG | CANNOT TELL", "reason": "<one or two plain sentences>", '
          '"hand_worked": "<the sum you worked, with its numbers>", "evidence_used": ["<render key and line>", "<drawing phone and line>", "<decision>"], '
          '"missing": "<CANNOT TELL only: what would settle it>", "fix": "<WRONG only: what the screen or its record should say>"}',
          '```', '',
          f'`{STEM}_answer-template_v01.jsonl` holds one such line for every case, with the case filled in. Our measurer reads the file back '
          'and refuses a line whose case is unknown, a case answered twice, a verdict outside the three, or a RIGHT or WRONG with no reason.', '',
          '## What is in this package', '']
    for p in parts:
        L.append(f'- `{p["file"]}` — {p["title"]}: {n(len(p["cases"]), "cases in this part, counted")} cases.')
    L += [f'- `{STEM}_index_v01.md` — the cases in one table: each by its identifier, its part, what the first reviewer said it lacked, and our status.',
          f'- `{STEM}_answer-template_v01.jsonl` — the answer lines to fill in.',
          f'- `{STEM}_contents_v01.json` — what was built, from which commit, and the self-check\'s result.', '',
          '## What this package does not show', '',
          '- **Appearance**: colours, type sizes and spacing. No test here compares them.',
          '- **Edits**: changing an entered value on its own editor screen. Opening the screen and a sync of the same record are shown.',
          '- **The code**, except the simulation\'s method, which is its contract.', '']
    return '\n'.join(L)


def number_check(text, tr):
    """Every number in the brief is an identifier, a date, a file name, the commit, a quote checked word for word, or registered with
    its source. Anything else is a number with no provenance, and fails."""
    t = text
    for q, _src in tr.quotes:
        t = t.replace(q, ' ')
    t = re.sub(r'```json[\s\S]*?```', ' ', t)                         # the decision log's rows, printed as data from the log
    t = re.sub(r'`[^`]*`', ' ', t)                                     # file names, the commit
    t = re.sub(r'\b(?:DEC-\d{4,}|MK-[A-Z]{2}-[A-Z]-\d{3})\b', ' ', t)
    t = re.sub(r'\b\d{4}-\d{2}-\d{2}\b', ' ', t)
    t = re.sub(r'\bv\d\d\b', ' ', t)
    t = re.sub(r'\*\*\d\. ', ' ', t)                                    # the tenets' own numbering, quoted
    t = re.sub(r'\b[Tt]enets? \d\b', ' ', t)
    t = re.sub(r'\bpart \d\d\b', ' ', t)
    found = re.findall(r'\d[\d,]*(?:\.\d+)?', t)
    reg = collections.Counter(x for x, _ in tr.reg)
    bad = [x for x in found if x not in reg]
    return found, bad


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# 6. THE PARTS
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def part_of(c):
    if c['figure'] in PAYCHECK_FIGS:
        return 'paycheck'
    return PART_OF.get((c['_component'], c['_tab'] if c['_component'] == 'CashFlowScreen' else None))


PAYCHECK_FIGS = set()   # filled from the evidence: the figures whose render is the paycheck card's or the retired month's


def render_for_reader(key, sh, cl, helpers, screens):
    args = top_args(sh['source'])
    act = args[4] if len(args) > 4 else None
    _tab, taps = taps_of(act, helpers)
    entered = sh['entered_keys']
    others = {k: sh['before'][k] for k in sh['household_keys'] if k not in entered and k in sh['before']}
    return {
        'screen': screens[sh['screen']], 'day': sh['day'], 'taps': taps, 'screen_parameters': sh['params'] or {},
        'how_the_measurer_rendered_it': sh['source'],
        'stored_before_opening': {k: sh['before'].get(k) for k in entered}, 'other_stored_values_the_household_sets': others,
        'stored_after': {k: ('the same as before' if json.dumps(sh['before'].get(k), sort_keys=True) == json.dumps(sh['after'].get(k), sort_keys=True) else sh['after'].get(k)) for k in entered},
        'any_stored_value_changed_by_opening': sh['any_stored_key_changed'],
        'lines': [f'{i + 1:03d}  {shown(l)}' for i, l in enumerate(sh['lines'])],
        'figures_printed_by_identifier': [f'{p["id"]}  {p["text"]}' for p in sh['printed']],
        'after_a_cloud_sync': (None if not cl else {
            'how': cl['how'], 'entered_unchanged': {k: v for k, v in cl['entered_equal'].items()},
            'figures_printed_by_identifier': [f'{p["id"]}  {p["text"]}' for p in cl['printed']],
            'whole_screen_the_same': cl['lines_equal']}),
    }


def write_parts(cases, ev, decisions, rows_of, status, out_dir, design):
    groups = collections.OrderedDict((pid, []) for pid, _t in PARTS)
    stray = []
    for c in cases:
        pid = part_of(c)
        (groups[pid] if pid else stray).append(c)
    assert not stray, f'cases no part takes: {[c["case"] for c in stray]}'
    parts = []
    live = [(pid, cs) for pid, cs in groups.items() if cs]
    for n, (pid, cs) in enumerate(live, 1):
        title = next(t for p, t in PARTS if p == pid)
        fname = f'{STEM}_part-{n:02d}-of-{len(live):02d}.md'
        keys = sorted({c['evidence']['render'] for c in cs})
        drawings = sorted({c['_drawing'] for c in cs if c['_drawing'] and c['tenet'] == 6})
        decs = sorted({d for c in cs for d in c['decisions']} | (set(SIM_RULINGS) if any(c['tenet'] == 1 for c in cs) else set()))
        blocks_used = {}
        for c in cs:
            for h in c['evidence'].get('match_tests', []):
                blocks_used[(h['file'], h['test'])] = h
        L = [f'# Cash flow evidence — part {n:02d} of {len(live):02d}: {title}', '',
             f'{len(cs)} cases. Read `{STEM}_brief_v01.md` first. Answer each case with one JSON line, in the format the brief gives.', '',
             '## The cases', '',
             'Each case: the figure and the tenet, what the first reviewer said it lacked, the figure\'s own record, the evidence (by the '
             'render\'s key in the next section), the decisions that name the figure (quoted at the end), our own tests and their results, '
             'and our status. Our status is not the answer.', '',
             '```json', json.dumps([{k: v for k, v in c.items() if not k.startswith('_')} for c in cs], indent=1, ensure_ascii=False), '```', '',
             '## The renders — each screen as it rendered, with the store before and after', '',
             'Every line in order (`[icon]` is an icon); every figure printed under its identifier; every value the person entered, before '
             'the screen opened and after; and the same household arriving by a cloud sync.', '',
             '```json', json.dumps({k: render_for_reader(k, ev['renders'][k], ev['cloud'].get(k), ev['measurer']['helpers'], ev['measurer']['screens']) for k in keys},
                                   indent=1, ensure_ascii=False), '```', '']
        titles = sorted({t for c in cs for t in c['evidence'].get('drawing', {}).get('design_record_rows', [])})
        if titles:
            L += ['## The design record — which approved design each screen here is built from', '',
                  f'Rows of `{DESIGN_RECORD}`, the one record of which design each screen was built from, as written today.', '',
                  '```json', json.dumps({t: design[t] for t in titles}, indent=1, ensure_ascii=False), '```', '']
        for d in drawings:
            dd = ev['drawings'][d]
            rws = rows_of[d]
            need = sorted({n for c in cs if c['_drawing'] == d and c['tenet'] == 6
                           for n in c['evidence']['drawing'].get('phones_that_hold_this_screen', []) + [x['phone'] for x in c['evidence']['drawing'].get('drawn_elsewhere_on_the_drawing', [])]})
            if not need:
                need = list(range(1, len(dd['phones']) + 1))
            left = [n for n in range(1, len(dd['phones']) + 1) if n not in need]
            L += [f'## The drawing — `{d}`', '',
                  f'**{rws["title"]}** {rws["intro"]}', '',
                  f'Its dated rows, every one, as written on the drawing ({len(rws["rows"])}):', '',
                  '```json', json.dumps([{k: v for k, v in r.items() if not k.startswith('_')} for r in rws['rows']], indent=1, ensure_ascii=False), '```', '',
                  f'Its phones that hold the screens in this part ({", ".join(map(str, need))}), every line in order, as the match tests read them'
                  + (f'. Phones {", ".join(map(str, left))} draw other screens and are left out.' if left else '.'), '',
                  '```json', json.dumps({f'phone {n}': dd['phones'][n - 1] for n in need}, indent=1, ensure_ascii=False), '```', '']
            if dd.get('as_built'):
                inv = {v: k for k, v in FRAME_OF.items()}
                L += ['The same phones as the match test holds the screen to them: the drawn phone with each dated row and kept item applied by '
                      'name — the test\'s own expected lines:', '',
                      '```json', json.dumps({f'phone {n} (frame {inv[n]})': dd['as_built'][inv[n]] for n in need if inv.get(n) in dd['as_built']}, indent=1, ensure_ascii=False), '```', '',
                      'And the screen rendered in the drawing\'s own household on the drawing\'s own day, as that test renders it:', '',
                      '```json', json.dumps({f'phone {v["phone"]} (frame {k})': {**v, 'lines': [shown(x) for x in v['lines']]} for k, v in ev['drawing_frames_rendered'].items() if v['phone'] in need},
                                            indent=1, ensure_ascii=False), '```', '']
        if blocks_used:
            L += ['## The match tests — each test that holds one of these screens to a drawing phone, its code and its result at this build', '']
            for (f, t), h in sorted(blocks_used.items()):
                b = next(b for b in ev['blocks'] if b['file'] == f and ' › '.join(b['ancestors'] + [b['name']]) == t)
                L += [f'**{t}** — `{f}`, lines {h["lines"]}, phones {", ".join(map(str, h["phones"]))}: **{h["result"]}**', '', '```ts', b['text'], '```', '']
        if any(c['tenet'] == 1 for c in cs) and ev['sim']:
            s = ev['sim']
            L += ['## The simulation contract — the future paycheck, as it ran in the case\'s household', '',
                  f'Rendered `{s["render"]}` on {s["day"]}. The card asked the future paycheck once per render ({s["runs_seen"]} run seen). '
                  'What it was handed, what it handed back, and every run of the simulation inside it:', '',
                  '```json', json.dumps({k: s[k] for k in ['handed', 'returned', 'futures', 'projection', 'other_runs_before_the_projection', 'draw_search', 'deterministic', 'printed_on_screen']},
                                        indent=1, ensure_ascii=False), '```', '',
                  'The method, as its code is written (the simulation\'s random numbers, the draw search, and the card\'s own function):', '']
            for k, v in s['method_source'].items():
                L += [f'**{k}**', '', '```ts', v, '```', '']
        L += ['## The decisions these cases name — quoted from the decision log', '',
              '```json', json.dumps([decision_quote(decisions[d]) for d in decs if d in decisions], indent=1, ensure_ascii=False), '```', '']
        missing = [d for d in decs if d not in decisions]
        if missing:
            L += [f'Named but not in the log: {", ".join(missing)}.', '']
        body = '\n'.join(L)
        open(os.path.join(out_dir, fname), 'w', encoding='utf8').write(body)
        parts.append({'file': fname, 'id': pid, 'title': title, 'cases': [c['case'] for c in cs], 'renders': keys, 'drawings': drawings, 'decisions': decs,
                      'bytes': len(body.encode('utf8'))})
    return parts


def write_index(cases, parts, count, out_dir, commit, built_on, reviewed_on):
    """THE CASES IN ONE TABLE — each by its identifier, with the first reviewer's verdict and, word for word, what it said it
    lacked; the part that carries it; and our status. Counted from the results file, never typed."""
    part_of_case = {k: p['file'] for p in parts for k in p['cases']}
    settled = sum(1 for c in cases if c['status'].startswith('SETTLED BY OUR TESTS'))
    retired = sum(1 for c in cases if c['status'] == 'SETTLED — THE FIGURE IS RETIRED')
    cell = lambda t: str(t).replace('|', '/').replace('\n', ' ')
    L = [f'# The {len(cases)} cases — an index', '',
         f'{count["why"]} Read from the results of the {reviewed_on} review; built {built_on} from `{commit}`.', '',
         f'{settled} of {len(cases)} are settled by our own tests for words and figures, and {retired} because the figure is retired; the other '
         f'{len(cases) - settled - retired} are for the reviewer to settle. Our status is not the answer.', '',
         '| Case | Part | Tenet | First verdict | What the first reviewer said it lacked | Our status |', '|---|---|---|---|---|---|']
    for c in cases:
        r = c['first_review']
        L.append(f'| {c["case"]} | {part_of_case[c["case"]].split("_part-")[1][:2]} | {c["tenet"]} | {r["verdict"]} ({r["kind"]}), audit part {r["audit_part"]} | '
                 f'{cell(r["what_it_said_it_lacked"])} | {cell(c["status"])} |')
    open(os.path.join(out_dir, f'{STEM}_index_v01.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# 7. THE SELF-CHECK
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def check(cases, parts, ev, brief_text, tr, out_dir, count):
    fails = []
    fail = fails.append
    keys = [c['case'] for c in cases]
    # A. every case has its evidence
    have = collections.Counter()
    for c in cases:
        e = c['evidence']
        sh = ev['renders'].get(e['render'])
        if not sh or len(sh['lines']) < 4:
            fail(f'{c["case"]}: no render'); continue
        have['render'] += 1
        if e['line_beside_the_figure']['found_at_render_line'] is None:
            fail(f'{c["case"]}: the line beside the figure is not on the render')
        else:
            have['line'] += 1
        if e['printed_texts']:
            have['printed'] += 1
        else:
            fail(f'{c["case"]}: the figure is not printed under {e["printed_under"]}')
        if e['store']['entered_keys_compared'] == ENTERED_N and set(sh['before']) >= set(sh['entered_keys']):
            have['store'] += 1
        else:
            fail(f'{c["case"]}: the store was not compared on all {ENTERED_N} entered keys')
        if 'entered_keys_unchanged' in e['sync'] or 'not_run' in e['sync']:
            have['sync'] += 1
        if c['tenet'] == 6:
            d = e.get('drawing', {})
            if 'none' in d:
                have['drawing'] += 1
            elif d.get('file') and (d.get('phones_that_hold_this_screen') or c['status_reason']):
                have['drawing'] += 1
                if c['status'].startswith('SETTLED BY OUR TESTS') and not e.get('match_tests'):
                    fail(f'{c["case"]}: settled with no match test')
            else:
                fail(f'{c["case"]}: tenet 6 with no drawing evidence')
        if c['tenet'] == 1:
            s = ev.get('sim') or {}
            if s.get('futures', {}).get('paths_passed_by_futurePaycheck') and s.get('draw_search', {}).get('probes') and s.get('printed_on_screen') and s.get('method_source'):
                have['contract'] += 1
            else:
                fail(f'{c["case"]}: no simulation contract')
        if c['status'] == 'SETTLED — THE FIGURE IS RETIRED' and not any('no longer prints' in t['what_it_checks'] for t in c['our_tests']):
            fail(f'{c["case"]}: settled as retired with no pinned test')
        if not c['our_tests']:
            fail(f'{c["case"]}: our measuring test\'s check for the case was not found in its results')
    # B. every case is in exactly one part, and each part carries the renders its cases name
    placed = collections.Counter(k for p in parts for k in p['cases'])
    for k in keys:
        if placed[k] != 1:
            fail(f'{k}: in {placed[k]} parts')
    for p in parts:
        body = open(os.path.join(out_dir, p['file']), encoding='utf8').read()
        for blk in re.findall(r'```json\n([\s\S]*?)\n```', body):
            try:
                json.loads(blk)
            except Exception as x:
                fail(f'{p["file"]}: a JSON block does not parse ({x})')
        for k in p['renders']:
            if f'"{k}": {{' not in body:
                fail(f'{p["file"]}: render {k} named but not printed')
    # C. every number in the brief is traced
    found, bad = number_check(brief_text, tr)
    if bad:
        fail(f'numbers in the brief with no recorded source: {sorted(set(bad))}')
    # D. the answer template: every case once
    tpl = [json.loads(l) for l in open(os.path.join(out_dir, f'{STEM}_answer-template_v01.jsonl'), encoding='utf8') if l.strip()]
    if sorted(t['case'] for t in tpl) != sorted(keys):
        fail('the answer template does not hold every case exactly once')
    idx = [l for l in open(os.path.join(out_dir, f'{STEM}_index_v01.md'), encoding='utf8') if l.startswith('| MK-')]
    if sorted(l.split(' | ')[0][2:] for l in idx) != sorted(keys):
        fail('the index does not list every case exactly once')
    n6 = sum(1 for c in cases if c['tenet'] == 6)
    n1 = sum(1 for c in cases if c['tenet'] == 1)
    cover = {
        'cases': f'{len(cases)} of {count["gaps"]} evidence gaps in the results file ({EXPECTED} expected)',
        'render': f'{have["render"]} of {len(cases)} with the screen rendered in the case\'s household on its day',
        'line': f'{have["line"]} of {len(cases)} with the line beside the figure found on the render',
        'printed': f'{have["printed"]} of {len(cases)} with the figure printed under its identifier',
        'store': f'{have["store"]} of {len(cases)} with every entered value compared before and after ({ENTERED_N} keys each)',
        'sync': f'{have["sync"]} of {len(cases)} with the cloud-sync arrival compared, or the reason it is not',
        'drawing': f'{have["drawing"]} of {n6} tenet-6 cases with the drawing, its phones, dated rows and match tests, or the note that there is none',
        'contract': f'{have["contract"]} of {n1} simulation cases with the contract',
        'parts': f'{sum(1 for k in keys if placed[k] == 1)} of {len(keys)} cases in exactly one part',
        'index': f'{len(idx)} of {len(keys)} cases listed in the index, by identifier, with what the first reviewer said it lacked',
        'brief_numbers': f'{len(found) - len(bad)} of {len(found)} numbers in the brief traced to a source',
    }
    return fails, cover


def self_test(cases, parts, ev, brief_text, tr, out_dir, count):
    """Each check must fire on a planted fault — a guard must prove it still looks."""
    import copy
    results = []
    c2 = copy.deepcopy(cases); ev2 = copy.deepcopy(ev)
    ev2['renders'][c2[0]['evidence']['render']]['lines'] = []
    f, _ = check(c2, parts, ev2, brief_text, tr, out_dir, count)
    results.append(('a case with its render removed', any('no render' in x for x in f)))
    f, _ = check(cases, parts, ev, brief_text + '\nThe planted figure is 4,321.\n', tr, out_dir, count)
    results.append(('an untraced number in the brief', any('no recorded source' in x for x in f)))
    p2 = copy.deepcopy(parts); p2[-1]['cases'].append(cases[0]['case'])
    f, _ = check(cases, p2, ev, brief_text, tr, out_dir, count)
    results.append(('a case in two parts', any('in 2 parts' in x for x in f)))
    c3 = copy.deepcopy(cases)
    t6 = next(c for c in c3 if c['tenet'] == 6 and c['status'].startswith('SETTLED BY OUR TESTS'))
    t6['evidence']['match_tests'] = []
    f, _ = check(c3, parts, ev, brief_text, tr, out_dir, count)
    results.append(('a settled case with its match test removed', any('settled with no match test' in x for x in f)))
    c4 = copy.deepcopy(cases); c4[0]['our_tests'] = []
    f, _ = check(c4, parts, ev, brief_text, tr, out_dir, count)
    results.append(('a case whose measurer check is missing', any('measuring test' in x for x in f)))
    return results


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# 8. READING THE ANSWERS BACK
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def read_answers(path, out):
    contents = json.load(open(os.path.join(OUT, f'{STEM}_contents_v01.json'), encoding='utf8'))
    known = {c['case']: c for c in contents['cases']}
    seen, ok, refused = collections.Counter(), {}, []
    for i, line in enumerate(open(path, encoding='utf8'), 1):
        if not line.strip():
            continue
        try:
            a = json.loads(line)
        except Exception as x:
            refused.append({'line': i, 'why': f'not JSON ({x})'}); continue
        k = a.get('case')
        v = str(a.get('verdict') or '').upper().strip()
        if k not in known:
            refused.append({'line': i, 'case': k, 'why': 'not one of the cases'}); continue
        seen[k] += 1
        if seen[k] > 1:
            refused.append({'line': i, 'case': k, 'why': 'answered twice'}); continue
        if v not in ('RIGHT', 'WRONG', 'CANNOT TELL'):
            refused.append({'line': i, 'case': k, 'why': f'verdict "{a.get("verdict")}" is not RIGHT, WRONG or CANNOT TELL'}); continue
        if v in ('RIGHT', 'WRONG') and not str(a.get('reason') or '').strip():
            refused.append({'line': i, 'case': k, 'why': 'a RIGHT or WRONG with no reason'}); continue
        if v == 'CANNOT TELL' and not str(a.get('missing') or a.get('reason') or '').strip():
            refused.append({'line': i, 'case': k, 'why': 'a CANNOT TELL that does not say what is missing'}); continue
        ok[k] = {**a, 'verdict': v, 'our_status_at_build': known[k]['status']}
    unanswered = sorted(set(known) - set(ok))
    v = collections.Counter(x['verdict'] for x in ok.values())
    disagree = sorted(k for k, x in ok.items() if known[k]['status'].startswith('SETTLED') and x['verdict'] != 'RIGHT')
    result = {'read_on': datetime.date.today().isoformat(), 'answers_file': os.path.abspath(path), 'package_built_from': contents['commit'],
              'coverage': f'{len(ok)} of {len(known)} cases answered: {v["RIGHT"]} right, {v["WRONG"]} wrong, {v["CANNOT TELL"]} cannot tell; '
                          f'{len(refused)} lines refused; {len(unanswered)} cases unanswered',
              'settled_by_us_but_not_right': disagree, 'answers': ok, 'refused': refused, 'unanswered': unanswered}
    out = out or re.sub(r'\.jsonl?$', '', path) + '_read.json'
    json.dump(result, open(out, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    print(result['coverage'])
    if disagree:
        print(f'   the reviewer does not call RIGHT {len(disagree)} case(s) our tests settle: {", ".join(disagree)}')
    print(f'   written: {out}')
    return 0 if not refused else 1


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--read-answers')
    ap.add_argument('--out')
    ap.add_argument('--at', help='build from a clean worktree of this commit')
    a = ap.parse_args()
    if a.read_answers:
        return read_answers(a.read_answers, a.out)
    if a.at:
        wt, _sha, home = worktree_at(a.at)
        set_root(wt)
        try:
            return build(a)
        finally:
            drop_worktree(wt, home)
            print('   the worktree is removed')
    return build(a)


def build(a):
    print('CF EVIDENCE PACKAGE — the cases the outside reviewer could not settle')
    res, gaps, count = load_cases()
    print(f'   cases: {count["gaps"]} EVIDENCE GAP entries of {count["fails"]} FAILs ({count["rows"]} screen checks read) — {count["why"]}')
    measurer = res['test_file']
    commit = git('rev-parse', '--short', 'HEAD') or 'not recorded'
    # what the build read that the commit does not hold: code, tests, records and drawings changed and not committed (this package
    # and its builder are left out — they are what is being built)
    dirty = [l for l in git('status', '--porcelain', '--', 'src', 'MoneyKeel', 'Calculation Module code', 'app', 'docs').split('\n')
             if l.strip() and PACKAGE_NAME not in l and 'cf-evidence' not in l and 'build-cf-evidence-package.py' not in l]
    built_on = datetime.date.today().isoformat()
    tmp = tempfile.mkdtemp(prefix='cf94-')
    ev = run_generator(gaps, measurer, tmp)
    assert len(ev['renders']) >= 10, 'too few renders came back'
    for k in ev['renders'].values():
        assert len(k['entered_keys']) == ENTERED_N, f'the measurer now compares {len(k["entered_keys"])} entered keys, not {ENTERED_N}'
    files = sorted(set(ev['test_files']))
    status, per_file, missing = run_tests(files, tmp)
    if missing:
        sys.exit(f'STOP — these test files gave no results: {missing}')
    decisions = load_decisions()
    for d in CROSS_RULINGS + SIM_RULINGS + SYNC_RULINGS:
        assert d in decisions and 'OLD' not in str(decisions[d].get('in_use')), f'{d} is named by this build but is not in force in the decision log'
    design = design_rows()
    for (comp, tab), titles in DESIGN_ROWS.items():
        for t in titles:
            assert len(design.get(t, [])) == 1, f'the design record has {len(design.get(t, []))} rows titled "{t}", not one'
    design = {k: v[0] for k, v in design.items()}
    drawings = sorted({f['mock'] for f in ev['figs'].values() if f['mock']})
    rows_of = {d: dated_rows(d) for d in drawings}
    tenets = tenet_words()
    for fid, f in ev['figs'].items():
        if not f['mock']:
            PAYCHECK_FIGS.add(fid)
    cases = build_cases(gaps, ev, status, decisions, design, rows_of, tenets)

    # ── write
    if os.path.exists(OUT):
        stray = [f for f in os.listdir(OUT) if not f.startswith(STEM) and f != '.DS_Store']
        if stray:
            sys.exit(f'STOP — {os.path.relpath(OUT, HOME)} holds files this script did not write: {stray}')
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    parts = write_parts(cases, ev, decisions, rows_of, status, OUT, design)
    settled = sum(1 for c in cases if c['status'].startswith('SETTLED BY OUR TESTS'))
    retired = sum(1 for c in cases if c['status'] == 'SETTLED — THE FIGURE IS RETIRED')
    tr = Traced()
    btext = brief(tr, count, cases, parts, files, decisions, tenets, commit, built_on, settled, ev['sim'], dirty, res.get('run_on'))
    write_index(cases, parts, count, OUT, commit, built_on, res.get('run_on'))
    open(os.path.join(OUT, f'{STEM}_brief_v01.md'), 'w', encoding='utf8').write(btext)
    with open(os.path.join(OUT, f'{STEM}_answer-template_v01.jsonl'), 'w', encoding='utf8') as fh:
        for c in cases:
            fh.write(json.dumps({'case': c['case'], 'verdict': '', 'reason': '', 'hand_worked': '', 'evidence_used': [], 'missing': '', 'fix': ''}, ensure_ascii=False) + '\n')
    fails, cover = check(cases, parts, ev, btext, tr, OUT, count)
    st = self_test(cases, parts, ev, btext, tr, OUT, count) if a.self_test else None
    contents = {
        'package': PACKAGE_NAME, 'built_on': built_on, 'commit': commit, 'uncommitted_files_at_build': dirty,
        'built_by': 'Calculation Module code/scripts/build-cf-evidence-package.py', 'generator': 'Calculation Module code/scripts/cf-evidence/cf-evidence-94.gen.tsx',
        'built_from_tree': 'the working tree' if ROOT == HOME else f'a clean worktree of {commit} (--at)',
        'cases_from': rel(RESULTS), 'measurer': measurer, 'measurer_regions_cut': ev['measurer']['regions'],
        'count': count, 'coverage': cover, 'self_check_failures': fails,
        'self_test': st and [{'planted': p, 'caught': ok} for p, ok in st],
        'settled_by_our_tests': settled, 'settled_figure_retired': retired,
        'tests_run': per_file,
        'parts': parts,
        'brief_numbers': [{'text': t, 'source': s} for t, s in tr.reg],
        'cases': [{'case': c['case'], 'figure': c['figure'], 'tenet': c['tenet'], 'audit_part': c['first_review']['audit_part'],
                   'original_verdict': c['first_review']['verdict'], 'original_kind': c['first_review']['kind'],
                   'what_it_said_it_lacked': c['first_review']['what_it_said_it_lacked'], 'render': c['evidence']['render'],
                   'screen': c['_component'], 'tab': c['_tab'], 'drawing': c['_drawing'], 'status': c['status'], 'status_reason': c['status_reason'],
                   'part': next(p['file'] for p in parts if c['case'] in p['cases'])} for c in cases],
    }
    files_written = sorted(os.listdir(OUT))
    contents['files'] = {f: hashlib.sha256(open(os.path.join(OUT, f), 'rb').read()).hexdigest()[:16] for f in files_written}
    json.dump(contents, open(os.path.join(OUT, f'{STEM}_contents_v01.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)

    print('   coverage:')
    for k, v in cover.items():
        print(f'     {k:14s} {v}')
    print(f'   settled by our tests (words and figures): {settled} of {len(cases)}; settled because the figure is retired: {retired}')
    for p in parts:
        print(f'   {p["file"]}: {len(p["cases"])} cases, {p["bytes"]:,} bytes')
    if st:
        for p, ok in st:
            print(f'   self-test — {p}: {"caught" if ok else "NOT CAUGHT"}')
    if fails:
        print(f'   SELF-CHECK FAILED — {len(fails)}:')
        for x in fails[:40]:
            print('     ' + x)
        print('   not zipped.')
        return 1
    if st and not all(ok for _p, ok in st):
        print('   SELF-TEST FAILED — a check did not fire on its planted fault; not zipped.')
        return 1
    z = OUT + '.zip'
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(os.listdir(OUT)):
            zf.write(os.path.join(OUT, f), os.path.join(PACKAGE_NAME, f))
    print(f'   package: {os.path.relpath(OUT, HOME)}/  ({len(files_written) + 1} files)')
    print(f'   zip:     {os.path.relpath(z, HOME)}')
    shutil.rmtree(tmp, ignore_errors=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
