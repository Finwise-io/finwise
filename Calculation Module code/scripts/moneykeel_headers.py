"""The identifier inside the code — S21.

Every function in the calculation code carries a header naming its identifier, what it answers,
its formula, what reads it, what it reaches, and when it last changed. Agreed with the founder
2026-08-26.

THE RULE THAT MAKES THIS SAFE. A header is a PRINTED VIEW, never a source. Every line in it comes
from the code or from the master file; nothing is authored here. So when the master file changes,
the answer to "do we edit 455 headers by hand?" is no — the build rewrites them all. A guard fails
the build if a header is not exactly what this would write, which catches a hand-edit before the
next build silently wipes it.

WHAT IT WILL NEVER TOUCH. Only the comment block between its own markers. The code beneath is not
read, moved or reformatted, and a comment the author wrote by hand is left where it is, below.
"""
import json, os, re, subprocess
import importlib.util as _il
_cfspec = _il.spec_from_file_location('mkcf_canon_h', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'moneykeel_code_formula.py'))
_cfmod = _il.module_from_spec(_cfspec); _cfspec.loader.exec_module(_cfmod)
_canon = _cfmod.canon

MARK_OPEN  = '/* ─ '
MARK_ID    = re.compile(r'^/\* ─ (MK-[A-Z]{2}-[FO]-\d{3}) ─{2,}.*$')
CACHE      = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.header-dates.json')
WIDTH      = 96


def _rule(label, ident=''):
    head = f'{MARK_OPEN}{ident} ' if ident else '/* '
    return head + '─' * max(4, WIDTH - len(head) - len(label) - 1) + ' ' + label


def changed(path, name, cache):
    """When this function last changed, from git.

    Keyed to the function NAME and looked up in the COMMITTED file, never in the working tree.
    Inserting a header moves every line below it, so a line-number lookup gives a different answer
    on the second run than on the first — which it did on 2026-08-26, and made this generator
    non-idempotent. The committed file does not move.
    """
    key = f'{path}::{name}'
    if key in cache:
        return cache[key]
    val = 'not in git yet|—'
    try:
        src = subprocess.run(['git', 'show', f'HEAD:{path}'], capture_output=True, text=True,
                             timeout=25).stdout
        line = 0
        pat = re.compile(r'^export (?:async )?function ' + re.escape(name) + r'\b'
                         r'|^export const ' + re.escape(name) + r'\s*=')
        for i, ln in enumerate(src.split('\n'), 1):
            if pat.match(ln):
                line = i; break
        if line:
            out = subprocess.run(['git', 'log', '-1', '--format=%ad|%h', '--date=short',
                                  '-L', f'{line},{line + 10}:{path}'],
                                 capture_output=True, text=True, timeout=25).stdout
            first = out.strip().split('\n')[0] if out.strip() else ''
            if '|' in first:
                val = first
    except Exception:
        pass
    cache[key] = val
    return val


def _wrap(items, indent, per_line=2):
    """A list of `MK-.. name` laid out so a person can scan it."""
    out, row = [], []
    for it in items:
        row.append(it)
        if len(row) == per_line:
            out.append(' · '.join(row)); row = []
    if row:
        out.append(' · '.join(row))
    return ('\n' + indent).join(out)


def rulings_index():
    """WHICH OF HIS DECISIONS GOVERN THIS FUNCTION — the master key, read the other way.

    Every declaration carries a `decisions` list, and every line of it is prose I wrote. So a wrong
    number on a screen traces to its door, its formula and its inputs, and then stops: nothing in the
    code names the ruling of HIS that the formula obeys. The anchors file knows — it maps each
    decision to the figures it governs — but only in that direction, and nobody debugging a number
    starts from a decision id.

    This turns it around once, at build time, so the header above the arithmetic names the decisions
    the arithmetic answers to, and the link cannot drift from the decision log because it is printed
    from it. Objective 4: screen metric → engine/code → formula → inputs → DECISIONS.
    """
    import collections
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'moneykeel_decisions_anchors.json')
    try:
        rows = json.load(open(path, encoding='utf8'))['rows']
    except (OSError, KeyError, ValueError):
        return {}
    idx = collections.defaultdict(set)
    for did, row in rows.items():
        for ident in re.findall(r'MK-[A-Z]{2}-[MFOI]-\d{3}', str(row.get('governs', ''))):
            idx[ident].add(did)
    return {k: sorted(v) for k, v in idx.items()}


def _safe(t):
    """No value may close the comment it is written into. This is the general guard: one author's
    single-line /** … */ ended up inside a header on 2026-08-26 and broke the file it was in."""
    return str(t).replace('*/', '* /')


def block(f, data):
    data = {k: (_safe(v) if isinstance(v, str) else
                [_safe(x) for x in v] if isinstance(v, list) else v)
            for k, v in data.items()}
    f = {k: _safe(v) for k, v in f.items()}
    """The header for one function. Pure: same inputs, same text, every time."""
    ind = ' * '
    L = [_rule(f['category'], f['id']),
         f' * {f["name"]}',
         ' *']
    L.append(' * Answers ..... ' + (data.get('answers') or
             'NOT DETERMINED — the code carries no note saying what this is for, and it has no row '
             'in the old inventory. Needs reading.'))
    if data.get('formula'):
        L.append(' *')
        L.append(' * Formula .....')
        for ln in data['formula'].split('\n'):
            L.append(f' *     {ln}'.rstrip())
    L.append(' *')
    L.append(f' * Called by ... {_wrap(data["callers"], ind + " " * 14) if data["callers"] else "nothing — it is an entry point, or nothing reaches it"}')
    if data['reach']:
        L.append(' *')
        L.append(f' * Reaches ..... {len(data["reach"])} function{"s" if len(data["reach"]) != 1 else ""}. Change the arithmetic above and these change with it:')
        L.append(f' *               {_wrap(data["reach"][:18], ind + " " * 14)}')
        if len(data['reach']) > 18:
            L.append(f' *               … and {len(data["reach"]) - 18} more — the full list is on functions_from_code')
    L.append(' *')
    L.append(f' * Serves ...... {_wrap(data["metrics"], ind + " " * 14, 4) if data["metrics"] else "NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody."}')
    if data['inputs']:
        L.append(f' * Reads ....... {_wrap(data["inputs"], ind + " " * 14, 1)}')
    if data.get('rulings'):
        L.append(f' * Ruled by .... {_wrap(data["rulings"], ind + " " * 14, 6)}')
        L.append(' *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.')
        L.append(' *               Change the arithmetic and one of those stops being obeyed — read them first.')
    if data.get('decides'):
        L.append(' *')
        L.append(' * Decides .....')
        for ln in data['decides'].split('\n'):
            L.append(f' *     {ln}'.rstrip())
    if data.get('sites'):
        L.append(' *')
        L.append(f' * CAREFUL ..... the name "{f["name"]}" is declared at {len(data["sites"])} places in the code,')
        L.append(' *               and they all answer to this ONE identifier. They are not one')
        L.append(' *               function. Until they are either merged or given identifiers of')
        L.append(' *               their own, everything above describes whichever the sweep read')
        L.append(' *               first. Build-spec guard B4.')
        for st in data['sites'][:6]:
            L.append(f' *               {st}')
    L.append(' *')
    L.append(f' * Formula also on the master file · functions_from_code · {f["id"]}')
    L.append(f' * Changed ..... {data["changed"]}')
    L.append(' */')
    # a header is a printed view: the one canon (moneykeel_code_formula.CANON) applies to every line
    return _canon('\n'.join(L))


def strip_existing(lines, i):
    """Remove EVERY header this generator wrote above line i. Anything else stays.

    It used to remove one, and only when the generated header sat directly above the function. If the
    author had written a note of their own in between — a plain /** ... */ — the walk met that first,
    gave up, and left the old generated header where it was. A new one was then inserted below it, so
    every well-commented function grew one more header on every run: 367 of them across 80 files by
    2026-09-01, nine stacked above basePay alone. The founder found it by asking why three numbered
    entries in a report were the same function.

    So: keep walking past the author's own comments, and remove every generated block found, not the
    first one.
    """
    removed = 0
    while True:
        j = i - 1
        # skip blank lines and any comment block the AUTHOR wrote, looking for one of ours
        while j >= 0:
            if lines[j].strip() == '':
                j -= 1
                continue
            if lines[j].strip().startswith('*/'):
                k = j
                while k >= 0 and not lines[k].lstrip().startswith('/*'):
                    k -= 1
                if k < 0:
                    return i
                if MARK_ID.match(lines[k]):          # one of ours — take it out
                    del lines[k:j + 1]
                    i -= (j + 1 - k)
                    removed += 1
                    break                            # and look again: there may be another above
                j = k - 1                            # the author's own note — step over it and keep looking
                continue
            if lines[j].lstrip().startswith('//'):
                j -= 1
                continue
            return i                                 # real code — nothing more of ours above
        else:
            return i


def gather(fn_rows, wb, readers, fid_of, old_words=None, sites=None):
    old_words = old_words or {}
    sites = sites or {}
    """Everything each header needs, from the code and from the master file. Nothing invented."""
    import collections
    by_name = {r['name']: r for r in fn_rows}
    callers = collections.defaultdict(set)
    for r in fn_rows:
        for tok in str(r.get('depends_on', '')).split(' · '):
            p = tok.strip().split(' ')
            if len(p) == 2 and p[1] in by_name:
                callers[p[1]].add(r['name'])

    def reach(n):
        seen, stack = set(), [n]
        while stack:
            for c in callers.get(stack.pop(), ()):
                if c not in seen:
                    seen.add(c); stack.append(c)
        return sorted(seen)

    met_by_fn = collections.defaultdict(set)
    for t in ('multiple_screens', 'home', 'networth', 'performance', 'plan', 'cashflow', 'menu'):
        head = [c.value for c in wb[t][1]]; fi = head.index('Function ID')
        for row in wb[t].iter_rows(min_row=2, values_only=True):
            if not row[0]:
                continue
            for f in re.findall(r'MK-[A-Z]{2}-[FO]-\d{3}', str(row[fi] or '')):
                met_by_fn[f].add(row[0])

    inputs_of = collections.defaultdict(list)
    ihead = [c.value for c in wb['inputs'][1]]
    iname = {str(r[0]): str(r[1]) for r in wb['inputs'].iter_rows(min_row=2, values_only=True) if r[0]}
    for iid, names in readers.items():
        for n in names:
            if iid in iname:
                inputs_of[n].append(f'{iid} {iname[iid]}')

    lbl = lambda n: f'{by_name[n]["id"]} {n}'
    RULED_BY = rulings_index()
    out = {}
    for r in fn_rows:
        n = r['name']
        assum = str(r.get('assumptions', ''))
        out[n] = {
            'answers': (r.get('purpose') or old_words.get(n) or '').strip(),
            'formula': str(r.get('formula_math', '')).strip(),
            'callers': sorted(lbl(c) for c in callers.get(n, ())),
            'reach':   [lbl(c) for c in reach(n)],
            'metrics': sorted(met_by_fn.get(r['id'], ())),
            'inputs':  sorted(inputs_of.get(n, []))[:8],
            'decides': '' if assum.startswith('None found') else assum,
            'sites': sites.get(n, []),
            'rulings': sorted({d for key in [r['id']] + sorted(met_by_fn.get(r['id'], ()))
                               for ident in re.findall(r'MK-[A-Z]{2}-[MFOI]-\d{3}', key)
                               for d in RULED_BY.get(ident, ())}),
        }
    return out


def apply_to_file(path, funcs, data, cache, dry=False):
    """Put every header in one file. Returns how many were written."""
    text = open(path).read()
    lines = text.split('\n')
    # bottom-up, so a line number above is never disturbed by an insert below
    for name, line in sorted(funcs, key=lambda x: -x[1]):
        f = data.get(name)
        if not f:
            continue
        i = line - 1
        i = strip_existing(lines, i)
        d = dict(f['data'])
        d['changed'] = changed(path, name, cache).replace('|', ' (') + ')'
        lines[i:i] = block(f['meta'], d).split('\n')
    new = '\n'.join(lines)
    if not dry and new != text:
        open(path, 'w').write(new)
    return new != text
