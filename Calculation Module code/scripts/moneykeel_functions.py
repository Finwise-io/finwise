"""Every function in the calculation code, sorted into the four categories.

Read from the code itself. The sorting is done by what the code actually does — what a function
returns, whether it reaches outside for data, and who calls it — not by its name.
"""
import os, re

CALC_ROOTS = ['src/domain', 'Calculation Module code/engines', 'src/services']
SCREEN_ROOTS = ['src/screens', 'src/components', 'app', 'src/onboarding']

OUTSIDE = re.compile(r'\b(fetch|getDoc|getDocs|onSnapshot|readAsStringAsync|getItem|axios)\s*\(')
WRITES  = re.compile(r'\b(setDoc|updateDoc|deleteDoc|setItem|removeItem|writeAsStringAsync|emit)\s*\(')
ARITH   = re.compile(r'[+\-*/]\s*[A-Za-z0-9_.()]|Math\.|reduce\(|\.toFixed\(')

def bodies(path):
    """(name, line, body) for every exported function in a file."""
    text = open(path).read().split('\n')
    marks = []
    for i, line in enumerate(text):
        m = (re.match(r'export (?:async )?function ([A-Za-z0-9_]+)', line) or
             re.match(r'export const ([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(', line))
        if m:
            marks.append((m.group(1), i, line))
    out = []
    for k, (name, i, sig) in enumerate(marks):
        end = marks[k+1][1] if k+1 < len(marks) else len(text)
        out.append((name, i+1, sig, '\n'.join(text[i:end])))
    return out


LABEL_TXT = re.compile(r'>\s*([A-Z][A-Za-z0-9 ,\'’%$/&\-\.]{2,44})\s*<')
LABEL_PROP = re.compile(r'(?:label|title)\s*=\s*[{"\']\s*[\'"]?([A-Z][A-Za-z0-9 ,\'’%$/&\-\.]{2,44})')

def signature_parts(sig, body):
    """What a function is handed, and what it gives back — read from its own signature."""
    inside = ''
    depth = 0
    for i, ch in enumerate(sig):
        if ch == '(':
            depth += 1
            if depth == 1:
                start = i + 1
                continue
        elif ch == ')':
            depth -= 1
            if depth == 0:
                inside = sig[start:i]; rest = sig[i+1:]
                break
    else:
        rest = ''
    params = []
    d = 0; cur = ''
    for ch in inside:
        if ch in '<([{': d += 1
        if ch in '>)]}': d -= 1
        if ch == ',' and d == 0:
            params.append(cur.strip()); cur = ''
        else:
            cur += ch
    if cur.strip(): params.append(cur.strip())
    params = [p for p in params if p]
    ret = ''
    m = re.search(r':\s*([^={]+?)\s*(?:=>|\{|$)', rest)
    if m: ret = m.group(1).strip()
    reads_store = 'reads the app\'s stored data' if 'useStore' in body or 'getState()' in body else ''
    ins = ' · '.join(params) if params else 'Nothing is handed to it'
    if reads_store: ins += ' · ' + reads_store
    return ins, (ret or 'NOT DECLARED — the code does not say what it gives back')

def screen_labels(names):
    """The words printed beside a function's answer.

    Two hops, because a screen almost never renders a call directly: it stores the answer in a
    name at the top of the file and prints that name lower down. So we follow the name.
    """
    out = {}
    for root in SCREEN_ROOTS:
        for dirpath, _, files in os.walk(root):
            if '__tests__' in dirpath: continue
            for f in files:
                if not f.endswith(('.ts','.tsx')) or '.test.' in f: continue
                fp = os.path.join(dirpath, f); short = os.path.basename(fp)
                lines = open(fp).read().split('\n')
                text = '\n'.join(lines)
                # hop 1 — which name holds which function's answer
                held = {}
                for m in re.finditer(r'const\s+(?:\{([^}]{1,140})\}|([A-Za-z0-9_]+))\s*=\s*([^;\n]{0,300})', text):
                    rhs = m.group(3) or ''
                    fns = {x for x in re.findall(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\(', rhs) if x in names}
                    if not fns: continue
                    holders = [x.strip().split(':')[0].strip() for x in (m.group(1) or '').split(',') if x.strip()] or [m.group(2)]
                    for h in holders:
                        if h: held.setdefault(h, set()).update(fns)
                # hop 2 — where those names are printed, and the words nearest them
                for i, line in enumerate(lines):
                    printed = {h for h in held if re.search(r'[{(,\s]' + re.escape(h) + r'\b', line)}
                    direct = {n for n in names if re.search(r'\b' + re.escape(n) + r'\s*\(', line)}
                    if not printed and not direct: continue
                    if not re.search(r'money|maskedMoney|pct|<Text|value=|toFixed', line): continue
                    lab = ''
                    for k in range(i, max(-1, i-8), -1):
                        mm = LABEL_TXT.findall(lines[k]) or LABEL_PROP.findall(lines[k])
                        if mm: lab = mm[-1].strip(); break
                    if not lab: continue
                    for h in printed:
                        for fn in held[h]:
                            out.setdefault(fn, set()).add(lab + '   (' + short + ')')
                    for fn in direct:
                        out.setdefault(fn, set()).add(lab + '   (' + short + ')')
    return out

def collect():
    funcs = {}
    for root in CALC_ROOTS:
        for dirpath, _, files in os.walk(root):
            if '__tests__' in dirpath: continue
            for f in files:
                if not f.endswith('.ts') or f.endswith('.test.ts') or f.endswith('.d.ts'): continue
                fp = os.path.join(dirpath, f)
                for name, line, sig, body in bodies(fp):
                    funcs.setdefault(name, {'file': fp, 'line': line, 'sig': sig, 'body': body})
    return funcs

def usage(names):
    """Which functions are named inside screen files, and which inside other calculation files."""
    by_screen, by_calc = set(), {}
    for roots, bucket in ((SCREEN_ROOTS, 'screen'), (CALC_ROOTS, 'calc')):
        for root in roots:
            for dirpath, _, files in os.walk(root):
                if '__tests__' in dirpath: continue
                for f in files:
                    if not f.endswith(('.ts', '.tsx')) or '.test.' in f: continue
                    fp = os.path.join(dirpath, f)
                    text = open(fp).read()
                    for n in names:
                        if re.search(r'\b' + re.escape(n) + r'\s*\(', text):
                            if bucket == 'screen': by_screen.add(n)
                            else: by_calc.setdefault(n, set()).add(fp)
    return by_screen, by_calc

def categorise():
    funcs = collect()
    by_screen, by_calc = usage(set(funcs))
    # a function reaches a screen if a screen names it, or a function that reaches a screen names it
    reaches = set(by_screen)
    changed = True
    while changed:
        changed = False
        for n, info in funcs.items():
            if n in reaches: continue
            for other in reaches:
                o = funcs.get(other)
                if o and re.search(r'\b' + re.escape(n) + r'\s*\(', o['body']):
                    reaches.add(n); changed = True; break
    out = []
    for n, info in sorted(funcs.items()):
        body, sig = info['body'], info['sig']
        returns_nothing = (': void' in sig or ': Promise<void>' in sig or
                           not re.search(r'\breturn\s+\S', body))
        fetches = bool(OUTSIDE.search(body))
        writes = bool(WRITES.search(body))
        presents = (not ARITH.search(body)) and ('string' in sig.split(')')[-1] or 'label' in n.lower()
                                                 or 'name' in n.lower() or 'text' in n.lower())
        if fetches:
            cat = '4 · BRINGS DATA IN'
            why = 'Reaches outside the app for its answer — a feed, a file or a stored record.'
        elif returns_nothing or (writes and n not in by_screen):
            cat = '1 · ACTION'
            why = 'Produces nothing that is displayed — it does something: saves, syncs or records.'
        elif n in by_screen:
            cat = '2 · DISPLAYED'
            why = 'A screen calls it directly, so its answer is on a screen.'
            if presents:
                cat = '2 · DISPLAYED (presentation only)'
                why = 'A screen calls it, but it only changes how a value LOOKS — it does no arithmetic.'
        elif n in reaches:
            cat = '3 · DEPENDENT'
            why = 'Its answer feeds another function, and that chain ends at a screen.'
        elif n in by_calc:
            cat = '3 · DEPENDENT (feeds an action only)'
            why = 'Its answer feeds another function, but no chain from it reaches a screen.'
        else:
            cat = 'USED NOWHERE FOUND'
            why = 'Nothing in the app calls it. Either it is dead, or it is reached in a way this sweep cannot see.'
        out.append({'name': n, 'file': info['file'], 'line': info['line'],
                    'category': cat, 'why': why,
                    'can_reach_a_screen': 'Yes' if (n in by_screen or n in reaches) else 'No'})
    return out

FAMILY_BY_PATH = [
    ('src/domain/networth','NW'), ('src/domain/assets','NW'), ('src/domain/bonds','NW'),
    ('src/domain/alternatives','NW'), ('src/domain/performance','PF'),
    ('src/domain/cashflow','CF'), ('src/domain/budget','CF'), ('src/domain/income','CF'),
    ('src/domain/debt','CF'), ('src/domain/transactions','CF'), ('src/domain/paycheck','CF'),
    ('src/domain/retirement','PL'), ('src/domain/planning','PL'), ('src/domain/decumulation','PL'),
    ('src/domain/goals','PL'), ('src/domain/scenarios','PL'),
    ('src/domain/insights','HM'), ('src/domain/milestones','HM'),
    ('src/domain/_shared','ST'), ('Calculation Module code/engines','ST'),
    ('src/services','XS'),
]

def family_of(path):
    for prefix, fam in FAMILY_BY_PATH:
        if path.startswith(prefix): return fam
    return 'XS'

def with_ids_and_chains(rows=None, funcs=None):
    """Give every function an identifier, then write the chain of what it depends on."""
    rows = rows or categorise()
    funcs = funcs or collect()
    counters = {}
    ident = {}
    for r in sorted(rows, key=lambda x: (family_of(x['file']), x['file'], x['line'])):
        fam = family_of(r['file'])
        counters[fam] = counters.get(fam, 0) + 1
        ident[r['name']] = 'MK-%s-F-%03d' % (fam, counters[fam])
    names = set(funcs)
    def calls(n):
        body = funcs[n]['body'] if n in funcs else ''
        return [m for m in sorted({x for x in re.findall(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\(', body)
                                   if x in names and x != n})]
    def chains(n, seen=(), depth=0):
        kids = calls(n)
        if not kids or depth >= 5:
            return [[n]] if depth else [[n]]
        out = []
        for k in kids:
            if k in seen:
                out.append([n, k + ' (already above — a loop)'])
                continue
            for tail in chains(k, seen + (n,), depth + 1):
                out.append([n] + tail)
        return out or [[n]]
    def dependent_functions(n):
        """Every DEPENDENT FUNCTION behind n — one whose output reaches n, however many steps away."""
        out, stack, seen = [], list(calls(n)), {n}
        while stack:
            k = stack.pop(0)
            if k in seen: continue
            seen.add(k); out.append(k)
            stack.extend(calls(k))
        return out
    labels = screen_labels(set(funcs))
    for r in rows:
        r['id'] = ident[r['name']]
        r['inputs'], r['output'] = signature_parts(funcs[r['name']]['sig'], funcs[r['name']]['body'])
        r['screen_labels'] = (' · '.join(sorted(labels.get(r['name'], []))[:6])
                              if r['name'] in labels else
                              ('NOT FOUND — a screen calls it but no label was found near the call'
                               if r['category'].startswith('2') else '—'))
        paths = chains(r['name'])
        lines = []
        for path in paths[:8]:
            if len(path) < 2: continue
            # the function that shows the answer sits at the END; what feeds it comes first
            lines.append(' → '.join((ident.get(x, '') + ' ' + x).strip() for x in reversed(path)))
        r['chain'] = '\n'.join(lines) if lines else 'No dependent function — it reads its inputs and answers'
        if len(paths) > 8:
            r['chain'] += '\n… and %d more paths' % (len(paths) - 8)
        r['depends_on'] = ' · '.join(ident.get(k,'?') + ' ' + k for k in calls(r['name'])) or '—'
        deps = dependent_functions(r['name'])
        r['fed_by'] = (' · '.join(ident.get(k,'?') + ' ' + k for k in deps)
                       if deps else 'None — no dependent function stands behind it')
        r['feeder_count'] = len(deps)
    return rows

if __name__ == '__main__':
    import collections
    rows = with_ids_and_chains()
    c = collections.Counter(r['category'] for r in rows)
    print('functions:', len(rows))
    for k, v in c.most_common(): print(f'  {v:4}  {k}')
