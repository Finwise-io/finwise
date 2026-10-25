#!/usr/bin/env python3
"""THE CASH FLOW OUTSIDE-AUDIT PACKAGE, CHECKED FROM THE DISK BEFORE IT GOES OUT — and zipped only if it passes.

Written 2026-10-23 beside moneykeel_audit_package.py, which builds the package. This does not trust the builder:
it counts the module again from the code and the records, reads the package files as the outside model will read
them, and stops on any of these:

  A. COVERAGE, N of N — every MK-CF-F function and MK-CF-O orchestrator with a code record is either on exactly
     one card or listed with its reason; every MK-CF-M figure in the register is in exactly one screen part; every
     screen those figures print on is in the brief; every decision in force that governs Cash flow (counted here
     by its own reading of the decision log) is printed in at least one part, with his words exactly.
  B. EACH CARD AS IT STANDS — its formula in words is the rules file's, word for word, and the rules file's
     fingerprint is the fingerprint of the function in the code today.
  C. NOTHING OF THE CODE OR THE TESTS — no line from inside any function, no line of test code, no test file
     name; signatures and type shapes only, which the general brief (v04) says the cards carry.
  D. EVERY NUMBER TRACED — each number in the package is put in one class with its proof: a formula's figure
     (traced to the code again here), a published amount or a worked answer or a writer example (re-run by
     src/__tests__/cf_audit_package_figures.test.ts, which this runs), the owner's (a decision, a ruling, an
     approved drawing), a count the contents file states and this check re-counts, an identifier or a date.
     Anything else fails.

    python3 "Calculation Module code/scripts/check-outside-audit-package.py"            # check, write the validation file, zip
    python3 "Calculation Module code/scripts/check-outside-audit-package.py" --no-jest  # skip the jest run (never for sending)
    python3 "Calculation Module code/scripts/check-outside-audit-package.py" --self-test  # each check must fail on a planted fault

A guard must prove it looked: every count it prints is the number of records it actually examined.
"""
import collections
import glob
import importlib.util
import json
import os
import re
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SEND = os.path.join(ROOT, 'MoneyKeel', 'documents', 'audit', 'outside-test-cases', 'to-send')
PKG = os.environ.get('CF_PACKAGE_DIR') or os.path.join(SEND, 'MoneyKeel_CashFlow_Audit_Package')
FAIL = []


def fail(msg):
    FAIL.append(msg)
    print('   FAIL ' + msg)


def load_gen():
    spec = importlib.util.spec_from_file_location('gen', os.path.join(HERE, 'build-outside-test-cards.py'))
    gen = importlib.util.module_from_spec(spec)
    sys.path.insert(0, HERE)
    spec.loader.exec_module(gen)
    return gen


def blocks(text, heading):
    """The ```json block under a heading, parsed; None when the heading is not there."""
    m = re.search(re.escape(heading) + r'[^\n]*\n(?:(?!```)[\s\S])*?```json\n([\s\S]*?)\n```', text)
    return json.loads(m.group(1)) if m else None


def check(PKG, run_jest=True, gen=None):
    """Every check, on the package in PKG. Returns the validation record; the failures are in FAIL."""
    del FAIL[:]
    gen = gen or load_gen()
    print(f'package: {os.path.relpath(PKG, ROOT)}')
    files = sorted(os.listdir(PKG))
    brief_name = next(f for f in files if re.match(r'moneykeel_audit_module_cf_for-openai_v\d\d\.md$', f))
    brief = open(os.path.join(PKG, brief_name), encoding='utf8').read()
    contents = json.load(open(os.path.join(PKG, next(f for f in files if f.endswith('_contents_v01.json'))), encoding='utf8'))
    taxfile = next(f for f in files if f.endswith('_tax-sources-and-acceptance_v01.json'))
    tax_text = open(os.path.join(PKG, taxfile), encoding='utf8').read()
    parts = sorted(f for f in files if re.search(r'_part-\d\d-of-\d\d\.md$', f))
    texts = {f: open(os.path.join(PKG, f), encoding='utf8').read() for f in parts}
    expected_files = {brief_name, taxfile, os.path.basename(next(f for f in files if f.endswith('_contents_v01.json')))} | set(parts)
    stray = sorted(set(files) - expected_files - {'moneykeel_audit_module_cf_validation_v01.json'})
    if stray:
        fail(f'files in the package that no part of it names: {stray}')
    if len(parts) != len(contents['parts']):
        fail(f'{len(parts)} part files on disk, the contents name {len(contents["parts"])}')

    # ── A · coverage, counted from the code ─────────────────────────────────────────────────────────
    print('A · coverage')
    in_code = collections.Counter()
    for root in gen.CODE_ROOTS:
        for dp, _dn, fn in os.walk(os.path.join(ROOT, root)):
            if 'node_modules' in dp:
                continue
            for f in fn:
                if f.endswith(('.ts', '.tsx')) and '.test.' not in f:
                    for m in re.finditer(r'^/\* ─ (MK-CF-[FO]-\d{3}) ─', open(os.path.join(dp, f), encoding='utf8').read(), re.M):
                        in_code[m.group(1)] += 1
    twice = [i for i, n in in_code.items() if n > 1]
    if twice:
        fail(f'records written twice in the code: {twice}')
    fns = sorted(i for i in in_code if '-F-' in i)
    orchs = sorted(i for i in in_code if '-O-' in i)
    carded = collections.Counter()
    cards = {}
    for f, t in texts.items():
        for c in blocks(t, '## The cards') or []:
            carded[c['id']] += 1
            cards[c['id']] = c
    listed = {x['id'] for x in contents['not_carded']}
    for x in contents['not_carded']:
        if f"| {x['id']} {x['name']} |" not in brief:
            fail(f'{x["id"]} is listed without a card in the contents but not in the brief')
    for i in fns + orchs:
        n = carded[i] + (i in listed)
        if n != 1:
            fail(f'{i} is on {carded[i]} card(s) and listed {int(i in listed)} time(s) — must be exactly once')
    extra = sorted((set(carded) | listed) - set(in_code))
    if extra:
        fail(f'cards for functions the code no longer has: {extra}')
    # A FUNCTION IN A CASH FLOW FILE WITH NO CODE RECORD has no identifier, so no card can carry it and the counts above
    # cannot see it (2026-10-23: eight appeared during the day's fixes). Read: every file that holds a Cash flow record, and
    # every file holding no record of any module that one of those files or one of the module's screens imports (a new
    # helper file — src/hooks/useCashflowModel.ts was one). Each function found fails the check: it needs its record and its
    # formula in words before the package is whole. Screen components (capitalised) are layout, not arithmetic, and are not read.
    owned = ['CashFlowScreen', 'BudgetScreen', 'IncomeManagerScreen', 'MonthlyIncomeScreen', 'BillCalendarScreen',
             'BasePayScreen', 'IncomeSummaryScreen']
    headers0, _ = gen.live_headers()
    decl = {(h['path'], h['decl_at']) for h in headers0}
    any_record = re.compile(r'^/\* ─ MK-[A-Z]{2}-[FO]-\d{3} ─', re.M)
    cf_files = sorted({h['path'] for h in headers0 if h['family'] == 'CF'})

    def imports_of(rel):
        out = []
        src = open(os.path.join(ROOT, rel), encoding='utf8').read()
        for spec in re.findall(r"from\s+'(\.{1,2}/[^']+)'", src):
            base = os.path.normpath(os.path.join(os.path.dirname(rel), spec))
            for cand in (base + '.ts', base + '.tsx', os.path.join(base, 'index.ts')):
                if os.path.exists(os.path.join(ROOT, cand)):
                    out.append(cand)
                    break
        return out
    owned_screen_files = [f'src/screens/{s}.tsx' for s in owned] + ['src/screens/HomeScreen.tsx']
    unowned = set()
    for rel in cf_files + owned_screen_files:
        for dep in imports_of(rel):
            if (dep.startswith(('src/screens/', 'src/components/')) or '.test.' in dep or dep in cf_files
                    or any_record.search(open(os.path.join(ROOT, dep), encoding='utf8').read())):
                continue
            unowned.add(dep)
    # Two kinds are kept apart. Any recordless function in a file holding Cash flow records, and one that does arithmetic in
    # a recordless file under src/hooks, src/domain, MoneyKeel/functions or the engines, FAILS the check: it is Cash flow's and the package cannot carry it. A recordless function anywhere else that a
    # Cash flow file or screen imports (sign-up, constants, utilities) is LISTED for the lead, not failed: it is arithmetic
    # outside the calculation module, which is a finding of its own (one concept, one function), not a card this package lacks.
    homes = ('src/hooks/', 'src/domain/', 'MoneyKeel/functions/', 'Calculation Module code/engines/')
    arith = re.compile(r'Math\.|[\w)\]]\s*[*/]\s*[\w(]|\breduce\(|[\w)\]]\s*[+-]\s*[\w(]')
    unrecorded, elsewhere, read_files = [], [], cf_files + sorted(unowned)
    for p in read_files:
        lines_ = open(os.path.join(ROOT, p), encoding='utf8').read().split('\n')
        for k, ln in enumerate(lines_):
            m = (re.match(r'(?:export )?(?:default )?(?:async )?function\s+([a-z][A-Za-z0-9_]*)', ln)
                 or re.match(r'(?:export )?const\s+([a-z][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:<[^>(]*>)?\s*\(', ln))
            if not m or (p, k) in decl:
                continue
            body = gen.body_of(lines_, k, strict=False)
            does_sums = bool(arith.search('\n'.join(body.split('\n')[1:]) or body))
            where_ = f'{m.group(1)} ({p}:{k + 1})'
            if p in cf_files or (p.startswith(homes) and does_sums):     # in a Cash flow file, any function at all
                unrecorded.append(where_)
            else:
                elsewhere.append(where_ + ('' if does_sums else ' — no arithmetic'))
    if unrecorded:
        fail(f'{len(unrecorded)} functions in Cash flow files have no code record, so no card carries them: {unrecorded}')
    print(f'   functions in Cash flow files without a code record: {len(unrecorded)} — read {len(cf_files)} files holding Cash flow records '
          f'and {len(unowned)} recordless files they or the screens import' + (f': {", ".join(unrecorded)}' if unrecorded else ''))
    print(f'   listed for the lead, not failed — recordless functions outside the calculation homes, or with no arithmetic: {len(elsewhere)}')
    f_carried = sum(1 for i in fns if carded[i] + (i in listed) == 1)
    o_carried = sum(1 for i in orchs if carded[i] + (i in listed) == 1)
    print(f'   functions: {f_carried} of {len(fns)} carried ({sum(1 for i in fns if carded[i])} on a card, {sum(1 for i in fns if i in listed)} listed with the reason)')
    print(f'   orchestrators: {o_carried} of {len(orchs)} carried ({sum(1 for i in orchs if carded[i])} on a card, {sum(1 for i in orchs if i in listed)} listed with the reason)')
    # floors on what the reader found (2026-10-24: five worked-example helpers moved from orchestrator numbers to
    # function numbers, MK-CF-F-238 to 242, so 19 orchestrators became 14 — a renumbering, not a blind reader)
    if len(fns) + len(orchs) < 230 or len(orchs) < 10:
        fail(f'only {len(fns)} functions and {len(orchs)} orchestrators found in the code — the reader has gone blind')

    register = json.load(open(os.path.join(HERE, 'moneykeel_figures.json'), encoding='utf8'))['figures']
    figs = sorted(k for k in register if k.startswith('MK-CF-M-'))
    in_pkg = collections.Counter()
    for f, t in texts.items():
        for x in blocks(t, '## The figures — as the screen register holds them') or []:
            in_pkg[x['id']] += 1
    for k in figs:
        if in_pkg[k] != 1:
            fail(f'{k} is in {in_pkg[k]} screen part(s) — must be exactly one')
    print(f'   figures: {sum(1 for k in figs if in_pkg[k] == 1)} of {len(figs)} in exactly one screen part')
    if len(figs) < 60:
        fail(f'only {len(figs)} Cash flow figures in the register')

    routes = sorted({r for k in figs for r in register[k].get('screens', [])})
    for r in routes:
        if f'| `{r}` |' not in brief:
            fail(f'the screen {r} prints Cash flow figures and is not in the brief\'s screen table')
    # the parts of each screen a figure is written in, read again from the screen files
    where = collections.defaultdict(set)
    for scr in {s['screen'] for s in contents['screens']}:
        p = os.path.join(ROOT, 'src', 'screens', scr + '.tsx')
        if os.path.exists(p):
            for line in open(p, encoding='utf8').read().split('\n'):
                if not line.strip().startswith(('//', '*', '/*')):
                    for fid in re.findall(r'MK-CF-M-\d{3}', line):
                        where[fid].add(scr)
    pkg_where = {}
    for f, t in texts.items():
        for x in blocks(t, '## The figures — as the screen register holds them') or []:
            pkg_where[x['id']] = {w.split(' › ')[0] for w in x.get('printed_in', [])}
    missing_where = [k for k in where if not where[k] <= pkg_where.get(k, set())]
    if missing_where:
        fail(f'figures printed in a screen file the package does not name: {missing_where}')
    print(f'   screens: {len(routes)} of {len(routes)} in the brief; printed-in places for {len(where)} figures written in '
          f'{len({s for v in where.values() for s in v})} screen files, all named')

    # the decisions, read again here from the log by this check's own reading of the rule
    rows = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json'), encoding='utf8'))['rows']
    owned = ['CashFlowScreen', 'BudgetScreen', 'IncomeManagerScreen', 'MonthlyIncomeScreen', 'BillCalendarScreen',
             'BasePayScreen', 'IncomeSummaryScreen']
    owned_routes = [r for r in routes if r != '/home']
    headers, _files = gen.live_headers()
    cf_paths = {h['path'] for h in headers if h['family'] == 'CF'}
    ruled_on_cards = set()
    for h in headers:
        if h['family'] == 'CF':
            ruled_on_cards |= set(re.findall(r'DEC-\d{4}[a-z]?', gen.field(h['header'], 'Ruled by')))
    want = set()
    for r in rows:
        if 'OLD' in str(r.get('in_use', '')):
            continue
        t = str(r.get('governs') or '') + ' ' + str(r.get('screens') or '')
        if (r.get('tab') == 'cashflow' or re.search(r'MK-CF-[MFOI]-\d{3}', t) or any(s in t for s in owned)
                or any(re.search(re.escape(x) + r'(?![\w-])', t) for x in owned_routes) or any(p in t for p in cf_paths)
                or r['id'] in ruled_on_cards):
            want.add(r['id'])
    by_id = {r['id']: r for r in rows}
    printed = collections.defaultdict(list)
    for f, t in texts.items():
        for d in blocks(t, '## The decisions that govern this part') or []:
            printed[d['id']].append(f)
            r = by_id.get(d['id'])
            if not r:
                fail(f'{d["id"]} printed in {f} is not in the decision log')
            elif 'OLD' in str(r.get('in_use', '')):
                fail(f'{d["id"]} printed in {f} is no longer in force')
            elif d['his_words'] != str(r.get('his_words') or '').strip():
                fail(f'{d["id"]}: his words in {f} are not the log\'s, word for word')
    absent = sorted(want - set(printed))
    extra_d = sorted(set(printed) - want)
    if absent:
        fail(f'{len(absent)} decisions govern Cash flow and are printed in no part: {absent[:10]}')
    if extra_d:
        fail(f'{len(extra_d)} decisions are printed that this check does not count as governing Cash flow: {extra_d[:10]}')
    if len(want) < 100:
        fail(f'only {len(want)} decisions found governing Cash flow — the reading has gone blind')
    print(f'   decisions: {len(want & set(printed))} of {len(want)} governing Cash flow printed in at least one part, '
          f'his words exact; {sum(len(v) for v in printed.values())} printings across {len(parts)} parts')

    # the index of what to send names this package, and no Cash flow batch file that is not on disk
    idx_path = os.path.join(SEND, '..', 'moneykeel_audit_cards_index_v01.md')
    if os.path.exists(idx_path) and PKG.startswith(SEND):
        idx = open(idx_path, encoding='utf8').read()
        named = re.findall(r'`(moneykeel_audit_cards_cashflow_\d\d-of-\d\d\.md)`', idx)
        absent_files = [f for f in named if not os.path.exists(os.path.join(SEND, f))]
        if absent_files:
            fail(f'the index names {len(absent_files)} Cash flow batch files that are not in to-send/: {absent_files[:3]}')
        if f'{contents["counts"]["cards"]} on cards' not in idx or os.path.basename(PKG) not in idx:
            fail('the index does not name this package with its counts — rebuild it with --audit-package CF')
        else:
            print(f'   index: names this package with its counts; {len(absent_files)} Cash flow batch files named that are not on disk')

    # ── B · each card as it stands ──────────────────────────────────────────────────────────────────
    print('B · each card as it stands')
    rules = json.load(open(gen.RULES, encoding='utf8'))['rules']
    live = {h['id']: h for h in headers}
    stale, mism = [], []
    for cid, c in cards.items():
        r = rules.get(cid)
        if not r or r.get('rule') != c.get('formula_in_words') or r.get('name') != c.get('name'):
            mism.append(cid)
            continue
        h = live[cid]
        if gen.fingerprint(gen.body_of(h['lines'], h['decl_at'])) != r.get('read_from'):
            stale.append(cid)
    if mism:
        fail(f'{len(mism)} cards whose formula in words is not the rules file\'s: {mism[:10]}')
    if stale:
        fail(f'{len(stale)} cards whose function has changed since its formula was read: {stale[:10]}')
    print(f'   {len(cards) - len(mism) - len(stale)} of {len(cards)} cards carry the rules file\'s formula, read from the function as it stands')

    # ── C · nothing of the code or the tests ────────────────────────────────────────────────────────
    print('C · nothing of the code or the tests')
    contents_text = open(os.path.join(PKG, next(f for f in files if f.endswith('_contents_v01.json'))), encoding='utf8').read()
    everything = brief + tax_text + contents_text + ''.join(texts.values())
    bodies, body_lines = 0, set()
    for h in headers:
        try:
            body = gen.body_of(h['lines'], h['decl_at'])
        except SystemExit:
            continue
        bodies += 1
        sig = gen.signature(h['lines'], h['decl_at'])     # the declaration, which the card's `handed` carries by design
        for ln in body.split('\n'):
            ln = ln.strip()
            if len(ln) >= 30 and re.search(r'[;{}()=]', ln) and ln not in sig and ln.rstrip(' {') not in sig:
                body_lines.add(ln)
    leaked = sorted(ln for ln in body_lines if ln in everything)
    if leaked:
        fail(f'{len(leaked)} lines from inside functions appear in the package: {leaked[:3]}')
    test_lines, tests = set(), 0
    for d in ('src', 'MoneyKeel', 'Calculation Module code'):
        for dp, _dn, fn in os.walk(os.path.join(ROOT, d)):
            if 'node_modules' in dp:
                continue
            for f in fn:
                if '.test.' in f and f.endswith(('.ts', '.tsx')):
                    tests += 1
                    for ln in open(os.path.join(dp, f), encoding='utf8', errors='ignore').read().split('\n'):
                        ln = ln.strip()
                        if len(ln) >= 30 and re.search(r'\bexpect\(|\btest\(|\bit\(|\bdescribe\(|=>|\bconst \w+ =|;\s*$', ln):
                            test_lines.add(ln)
    tleak = sorted(ln for ln in test_lines if ln in everything)
    if tleak:
        fail(f'{len(tleak)} lines of test code appear in the package: {tleak[:3]}')
    his = [d['his_words'] for t in texts.values() for d in (blocks(t, '## The decisions that govern this part') or [])]
    without_his = everything
    for w in sorted({w for w in his if len(w) >= 8}, key=len, reverse=True):   # an empty one would split every character apart
        without_his = without_his.replace(json.dumps(w, ensure_ascii=False)[1:-1], ' ')
    in_his = len(re.findall(r'[\w./-]+\.test\.tsx?\b', everything)) - len(re.findall(r'[\w./-]+\.test\.tsx?\b', without_his))
    tnames = re.findall(r'[\w./-]+\.test\.tsx?\b', without_his)       # his own words are quoted exactly, file names and all
    if tnames:
        fail(f'test file names in the package: {sorted(set(tnames))[:5]}')
    stmt = re.compile(r'^\s*(return\b|if \(|for \(|while \(|const \w+ =|let \w+ =)', re.M)
    outside_code_blocks = re.sub(r'```ts\n[\s\S]*?```', '', everything)
    for c in cards.values():                       # `handed` is a declaration: no body, no statement, no arrow
        if re.search(r'\{\s*$|\breturn\b', c['handed']):
            fail(f'{c["id"]}: its `handed` line carries more than the declaration')
    if stmt.search(re.sub(r'"handed": "[^"]*"', '', outside_code_blocks)):
        fail('a statement of code appears in the package text')
    print(f'   {bodies} function bodies read ({len(body_lines)} code lines), {tests} test files read ({len(test_lines)} lines of test code): '
          f'{len(leaked)} code lines and {len(tleak)} test lines in the package; {len(tnames)} test file names '
          f'outside his own words ({in_his} inside them, quoted exactly)')

    # ── D · every number traced ─────────────────────────────────────────────────────────────────────
    print('D · every number traced')
    traced = collections.Counter()
    NUM = re.compile(r'(?<![\w.\-])[−-]?\$?\d[\d,]*(?:\.\d+)?%?')
    IDS = re.compile(r'MK-[A-Z]{2}-[A-Z]-\d{3}|DEC-\d{4}[a-z]?|\b\d{4}-\d{2}-\d{2}\b|\bv\d\d\b|part-\d\d-of-\d\d|\b[0-9a-f]{7,10}\b|\b401\(k\)|\b529\b|cf module — part \d+|[A-Z]\d{1,2}\b')
    # 1. the formulas: traced to the code again here (the card builder's own test, re-run)
    untraced = []
    for cid, c in cards.items():
        h = live[cid]
        body = gen.body_of(h['lines'], h['decl_at'])
        code = body + '\n' + gen.constants_named(body, '\n'.join(h['lines']))
        for n in gen.numbers_not_in_code(c['formula_in_words'], code):
            if n not in (rules[cid].get('figures_checked_by_hand') or {}):
                untraced.append(f'{cid}: {n}')
        traced['in a formula, traced to its function'] += len(NUM.findall(gen.NOT_FIGURES.sub(' ', IDS.sub(' ', c['formula_in_words']))))
    if untraced:
        fail(f'{len(untraced)} figures in formulas not traced to the code: {untraced[:5]}')
    # 2. the prose the builder wrote: every number is a count the contents state, a part or tenet number, or the
    #    writer examples; the general brief (approved, v04), the tenets and his rulings are quoted, not written here
    counts = contents['counts']
    allowed = {str(v) for v in counts.values()} | {str(len(p['cards'])) for p in contents['parts']} \
        | {str(len(p['cards']) * 5) for p in contents['parts']} | {str(len(p['decisions'])) for p in contents['parts']} \
        | {str(len(p['figures'])) for p in contents['parts']} | {str(i) for i in range(0, 21)} \
        | {str(len(json.loads(tax_text)['cross_card_acceptance_cases']))} | {str(len(p['leaned_on'])) for p in contents['parts']}
    for x in contents['writer_examples']:
        allowed |= {x['written'], format(abs(x['value']), ',.4f').rstrip('0').rstrip('.'), '−' + format(abs(x['value']), ',.4f').rstrip('0').rstrip('.')}
        allowed |= {n.group(0) for n in NUM.finditer(x['written'])}
    allowed |= {n.lstrip('$') for n in NUM.findall(IDS.sub(' ', contents['commit']))}   # how many files on disk differ from the last commit
    _tx = json.loads(tax_text)
    allowed.add(str(_tx['tax_year']))          # the tax year the app's tables are for (TAX_YEAR)
    _sd = next(c['the_app_uses'] for c in _tx['source_checks'] if 'first_tax_year' in c['the_app_uses'])
    allowed |= {str(_sd['first_tax_year']), str(_sd['last_tax_year'])}   # the senior deduction's years (SENIOR_DEDUCTION), jest-checked
    allowed |= {str(int(c['the_app_uses']['year'])) for c in _tx['source_checks'] if 'year' in c['the_app_uses']}   # IRS_LIMITS.year
    general = open(gen.BRIEF, encoding='utf8').read().rstrip()
    tenets = open(os.path.join(ROOT, 'MoneyKeel', 'documents', 'standards', 'moneykeel_spec_tenets_v01.md'), encoding='utf8').read().split('\n', 4)[-1].strip()
    prose = brief
    for quoted, label in ((general, 'the general brief v04, approved'), (tenets, 'the tenets, approved (DEC-3523)')):
        if quoted not in prose:
            fail(f'{label} is not quoted whole in the brief')
        traced[f'in {label}'] += len(NUM.findall(IDS.sub(' ', quoted)))
        prose = prose.replace(quoted, ' ')
    sec = lambda t, a, b: t[t.index(a):t.index(b)] if a in t and b in t else ''
    for a, b, label in (('# What the owner has ruled', '# The decisions that govern Cash flow', 'in his rulings, his words'),
                        ('## The published ', '# Not on a card', 'a published amount, checked against the app by the jest test'),
                        ('# Not on a card', '# Before you send each reply', 'in a code record\'s own description')):
        chunk = sec(prose, a, b)
        if not chunk:
            fail(f'the brief has no section "{a}"')
        traced[label] += len(NUM.findall(IDS.sub(' ', chunk)))
        prose = prose.replace(chunk, ' ')
    for t in texts.values():
        prose += '\n' + re.sub(r'```(?:json|ts)\n[\s\S]*?```', ' ', t)
    unknown = []
    clean = IDS.sub(' ', re.sub(r'```(?:json|ts)\n[\s\S]*?```', ' ', prose))
    for m in NUM.finditer(clean):
        v = m.group(0).rstrip(',.')
        if v.strip('−-$%').replace(',', '') in allowed or v in allowed or v.lstrip('$') in allowed:
            traced['in the prose written for this package: a count, a part or tenet number, or a writer example'] += 1
        else:
            unknown.append(v)
            if len(unknown) <= 12:
                print(f'      no source: {v!r} — …{clean[max(0, m.start() - 70):m.end() + 30]!r}…')
    if unknown:
        fail(f'{len(unknown)} numbers in the package\'s own prose have no recorded source: {sorted(set(unknown))[:12]}')
    # 3. the json blocks: each has one source
    for t in texts.values():
        for heading, label in (('## The decisions that govern this part', 'in a decision, his or his log\'s'),
                               ('## The figures — as the screen register holds them', 'in the screen register: worked answers re-run by the jest test'),
                               ('## The figures these cards feed', 'in the screen register: worked answers re-run by the jest test'),
                               ('## The cross-card checks for this part', 'in a cross-card check: identifiers and tenet numbers')):
            b = blocks(t, heading)
            if b is not None:
                traced[label] += len(NUM.findall(IDS.sub(' ', json.dumps(b, ensure_ascii=False))))
        for c in blocks(t, '## The cards') or []:
            rest = {k: v for k, v in c.items() if k not in ('formula_in_words', 'approved_drawing', 'rules', 'figures_it_feeds')}
            traced['on a card: its code record, its signature, its inputs and its period'] += len(NUM.findall(IDS.sub(' ', json.dumps(rest, ensure_ascii=False))))
            if c.get('approved_drawing'):
                traced['in an approved drawing, the owner\'s — sums re-checked by the card builder'] += len(NUM.findall(IDS.sub(' ', json.dumps(c['approved_drawing'], ensure_ascii=False))))
            traced['in a card\'s rules: the owner\'s words or the register\'s author notes'] += len(NUM.findall(IDS.sub(' ', json.dumps(c.get('rules', []), ensure_ascii=False))))
            traced['in a card\'s figures: the register'] += len(NUM.findall(IDS.sub(' ', json.dumps(c.get('figures_it_feeds', []), ensure_ascii=False))))
        for heading in ('## Formulas these cards lean on', '## The same idea, computed elsewhere'):
            for m in re.finditer(re.escape(heading) + r'[\s\S]*?(?=\n## |\Z)', t):
                for b in re.findall(r'```json\n([\s\S]*?)\n```', m.group(0)):
                    traced['in a leaned-on formula, traced to its own function by the card builder'] += len(NUM.findall(IDS.sub(' ', b)))
        for b in re.findall(r'```ts\n([\s\S]*?)```', t):
            traced['in a type the cards name, the app\'s own'] += len(NUM.findall(IDS.sub(' ', b)))
    tx = json.loads(tax_text)
    traced['in the tax file: an amount the app uses, checked against the app by the jest test'] += len(NUM.findall(json.dumps([c['the_app_uses'] for c in tx['source_checks']])))
    traced['in the tax file: the app\'s own record of the publications it cites'] += len(NUM.findall(IDS.sub(' ', json.dumps([c['cites'] for c in tx['source_checks']], ensure_ascii=False))))
    traced['in the contents file: counts and identifiers, re-counted in A'] += len(NUM.findall(IDS.sub(' ', contents_text)))
    for k, v in sorted(traced.items(), key=lambda x: -x[1]):
        print(f'   {v:6d} {k}')
    print(f'   {sum(traced.values())} numbers traced, {len(unknown)} without a source, {len(untraced)} formula figures not in the code')

    # ── the jest test that re-runs the published amounts, the worked answers and the writer examples ─
    jest = None
    if run_jest:
        env = dict(os.environ, CF_PACKAGE_DIR=PKG, CF_PACKAGE_CHECKING='1')
        run = subprocess.run(['npx', 'jest', '--maxWorkers=1', '--no-watchman', 'src/__tests__/cf_audit_package_figures.test.ts'],
                             cwd=ROOT, capture_output=True, text=True, env=env)
        jest = re.search(r'Tests:\s+(.*)', run.stderr + run.stdout)
        jest = jest.group(1).strip() if jest else 'did not run'
        if run.returncode != 0:
            fail(f'src/__tests__/cf_audit_package_figures.test.ts: {jest}')
        print(f'   jest · src/__tests__/cf_audit_package_figures.test.ts: {jest}')

    result = {
        'what_this_is': 'The check of this package before it went out: check-outside-audit-package.py, read from the disk and the code.',
        'commit': contents['commit'], 'built_on': contents['built_on'],
        'functions': f'{f_carried} of {len(fns)} carried', 'orchestrators': f'{o_carried} of {len(orchs)} carried',
        'functions_in_cash_flow_files_without_a_record': unrecorded,
        'recordless_functions_listed_for_the_lead': elsewhere,
        'cards': len(cards), 'listed_without_a_card': len(listed), 'figures': f'{sum(1 for k in figs if in_pkg[k] == 1)} of {len(figs)}',
        'screens': f'{len(routes)} of {len(routes)}', 'decisions_governing_cash_flow': f'{len(want & set(printed))} of {len(want)}',
        'cases_asked': len(cards) * 5, 'parts': len(parts),
        'formulas_read_from_the_function_as_it_stands': f'{len(cards) - len(mism) - len(stale)} of {len(cards)}',
        'code_lines_in_the_package': len(leaked), 'test_lines_in_the_package': len(tleak), 'test_file_names_in_the_package': len(tnames),
        'numbers_traced': dict(traced), 'numbers_without_a_source': len(unknown),
        'jest_figures_test': jest, 'passed': not FAIL, 'failures': list(FAIL),
    }
    return result


SELF_TESTS = [
    # (what is done to a copy of the package, the failure that must follow)
    ('a card is taken out of its part', 'card(s) and listed'),
    ('a line from inside a function is pasted into a part', 'lines from inside functions appear in the package'),
    ('a number with no source is written into a part\'s prose', 'numbers in the package\'s own prose have no recorded source'),
    ('his words on a decision are changed', 'are not the log\'s, word for word'),
    ('a test file is named in a part', 'test file names in the package'),
    ('a figure is taken out of its screen part', 'screen part(s) — must be exactly one'),
]


def self_test():
    """THE GATE PROVES IT STILL FIRES (the decision gate's rule, 2026-10-01): each check is fed a copy of the package
    with one deliberate fault, and must fail on that fault. A check that passes a broken package is broken itself."""
    import shutil
    import tempfile
    gen = load_gen()
    ok = 0
    for what, expect in SELF_TESTS:
        tmp = tempfile.mkdtemp(prefix='cf-package-selftest-')
        dst = os.path.join(tmp, os.path.basename(PKG))
        shutil.copytree(PKG, dst)
        parts = sorted(f for f in os.listdir(dst) if re.search(r'_part-\d\d-of-\d\d\.md$', f))
        first = os.path.join(dst, parts[0])
        t = open(first, encoding='utf8').read()
        if what.startswith('a card is taken out'):
            t = re.sub(r'(## The cards\n\n```json\n\[\n) \{[\s\S]*?\n \},\n', r'\1', t, count=1)
        elif what.startswith('a line from inside'):
            h = next(h for h in gen.live_headers()[0] if h['id'] == 'MK-CF-F-148')
            body = gen.body_of(h['lines'], h['decl_at']).split('\n')
            line = next(ln.strip() for ln in body[1:] if len(ln.strip()) >= 30) if len(body) > 1 else body[0].strip()
            t = t.replace('## The cards', line + '\n\n## The cards', 1)
        elif what.startswith('a number with no source'):
            t = t.replace('## The cards', 'Remember the 7,777 rule.\n\n## The cards', 1)
        elif what.startswith('his words'):
            t = re.sub(r'("his_words": ")', r'\1CHANGED ', t, count=1)
        elif what.startswith('a test file'):
            t = t.replace('## The cards', 'See src/__tests__/made_up_guard.test.ts.\n\n## The cards', 1)
        elif what.startswith('a figure is taken out'):
            last = os.path.join(dst, parts[-1])
            u = open(last, encoding='utf8').read()
            u = re.sub(r'(## The figures — as the screen register holds them[\s\S]*?```json\n\[\n) \{[\s\S]*?\n \},\n', r'\1', u, count=1)
            open(last, 'w', encoding='utf8').write(u)
        open(first, 'w', encoding='utf8').write(t)
        print(f'\n── self-test: {what}')
        check(dst, run_jest=False, gen=gen)
        fired = any(expect in f for f in FAIL)
        print(f'   {"FIRED" if fired else "DID NOT FIRE"} — expected a failure containing "{expect}"')
        ok += fired
        shutil.rmtree(tmp, ignore_errors=True)
    print(f'\nself-test: {ok} of {len(SELF_TESTS)} deliberate faults caught')
    return ok == len(SELF_TESTS)


def main():
    if '--self-test' in sys.argv:
        sys.exit(0 if self_test() else 'STOPPED: a check did not fire on its deliberate fault')
    result = check(PKG, run_jest='--no-jest' not in sys.argv)
    json.dump(result, open(os.path.join(PKG, 'moneykeel_audit_module_cf_validation_v01.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    if FAIL:
        z = PKG.rstrip('/') + '.zip'
        if os.path.exists(z):           # a zip of an earlier pass must not sit beside a package that now fails
            os.remove(z)
        sys.exit(f'STOPPED: {len(FAIL)} check(s) failed — the package is not zipped (any earlier zip removed)')
    z = PKG.rstrip('/') + '.zip'
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as out:
        for f in sorted(os.listdir(PKG)):
            out.write(os.path.join(PKG, f), os.path.join(os.path.basename(PKG), f))
    print(f'passed — validation written, package zipped: {os.path.relpath(z, ROOT)}')


if __name__ == '__main__':
    main()
