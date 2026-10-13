"""The formula every function actually computes, read out of the code itself.

Two columns come out of here: the arithmetic, and the same rule in plain English.

The rule this file obeys, after the 2026-08-25 audit: RENDER, NEVER GUESS. Every line below is a
faithful translation of an expression that is really in the code — a reduce becomes a sum, a
ternary becomes a condition, a rounding becomes a rounding to the number of places it really uses.
Where a body cannot be rendered faithfully the answer says so and names what the function does
structurally, which is still true. Nothing here is inferred from a function's NAME.
"""
import re

# ── tidy an identifier into words a person reads ───────────────────────────────────────────────
_KEEP = {'uid','id','ids','apr','ytm','rmd','ss','pv','fv','npv','irr','dti','cd','usd','y','n','t','r','i','m','b','a','d','p','s','g','v','c'}
def words(name):
    n = re.sub(r'^(_+)', '', str(name))
    n = re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', n)
    n = n.replace('_', ' ').strip().lower()
    return n or name

# ── expression → arithmetic ────────────────────────────────────────────────────────────────────
def _split_top(s, sep=','):
    """Split on `sep` only at bracket depth zero."""
    out, cur, d, q = [], '', 0, None
    for ch in s:
        if q:
            cur += ch
            if ch == q: q = None
            continue
        if ch in '\'"`': q = ch; cur += ch; continue
        if ch in '([{': d += 1
        if ch in ')]}': d -= 1
        if ch == sep and d == 0: out.append(cur); cur = ''
        else: cur += ch
    if cur.strip(): out.append(cur)
    return [x.strip() for x in out]

def _args_of(s, i):
    """The text inside the bracket that opens at index i, and the index just past its close."""
    d, j, q = 0, i, None
    while j < len(s):
        ch = s[j]
        if q:
            if ch == q: q = None
        elif ch in '\'"`': q = ch
        elif ch in '([{': d += 1
        elif ch in ')]}':
            d -= 1
            if d == 0: return s[i+1:j], j+1
        j += 1
    return s[i+1:], len(s)

def _balanced(s):
    d = 0
    for ch in s:
        if ch in '([{': d += 1
        if ch in ')]}': d -= 1
        if d < 0: return False
    return d == 0

def _split2(s, op):
    """Split once on `op` at bracket depth zero, left of any other top-level operator."""
    d, q, i = 0, None, 0
    while i < len(s):
        ch = s[i]
        if q:
            if ch == q: q = None
        elif ch in '\'"`': q = ch
        elif ch in '([{': d += 1
        elif ch in ')]}': d -= 1
        elif d == 0 and s.startswith(op, i):
            if op == '?' and (s.startswith('??', i) or s[i-1:i] == '?'): i += 1; continue
            if op == '||' and s.startswith('|||', i): i += 1; continue
            left, right = s[:i], s[i+len(op):]
            if left.strip() and right.strip(): return [left.strip(), right.strip()]
        i += 1
    return None

# helpers the code uses everywhere; left as a bare name they say nothing
HELPERS = {
  'round2':  'round({0}, 2 dp)',
  'toNum':   '{0} read as a number (0 when it is not one)',
  'clamp':   'hold {0} between {1} and {2}',
  'pct':     '{0} as a percentage',
}

_ARROW = re.compile(r'^\(?\s*([A-Za-z0-9_,\s{}:]*?)\s*\)?\s*=>\s*(.*)$', re.S)

def _body_of_lambda(txt):
    """(params, body) of an arrow function, or (None, txt)."""
    m = _ARROW.match(txt.strip())
    if not m: return None, txt
    ps = [p.strip() for p in m.group(1).split(',') if p.strip()]
    return ps, m.group(2).strip()

_MATHW = {'round':'round','floor':'round down','ceil':'round up','abs':'size of','sqrt':'√',
          'max':'max','min':'min','sign':'sign of'}

def _inner(e, depth):
    """Render Math.* and the small constructors wherever they appear, innermost first."""
    for _ in range(6):
        m = None
        for mm in re.finditer(r'\bMath\.(round|floor|ceil|abs|sqrt|max|min|sign|pow)\(', e):
            if _balanced(e[:mm.start()]): m = mm; break
        if m:
            inside, j = _args_of(e, m.end() - 1)
            fn = m.group(1)
            args = [math(a, depth + 1) for a in _split_top(inside)]
            if fn == 'pow' and len(args) == 2: rep = f'({args[0]})^({args[1]})'
            elif fn == 'sqrt': rep = f'√({args[0]})'
            elif fn in ('max', 'min'): rep = f'{fn}({", ".join(args)})'
            else: rep = f'{_MATHW[fn]}({", ".join(args)})'
            e = e[:m.start()] + rep + e[j:]; continue
        m = re.search(r'\bnew Array\((\d+)\)\.fill\(([^)]*)\)', e)
        if m:
            e = e[:m.start()] + f'{m.group(1)} slots, each {m.group(2) or "empty"}' + e[m.end():]; continue
        m = None
        for mm in re.finditer(r'\bnew (Set|Map)\(', e):
            if _balanced(e[:mm.start()]): m = mm; break
        if m:
            inside, j = _args_of(e, m.end() - 1)
            word = 'a list with no repeats' if m.group(1) == 'Set' else 'a lookup'
            e = e[:m.start()] + (f'{word} of {math(inside, depth+1)}' if inside.strip() else word) + e[j:]
            continue
        break
    return e

def math(expr, depth=0):
    """Render one expression as arithmetic. Faithful or nothing."""
    e = ' '.join(str(expr).split())
    if depth > 7 or not e: return e
    while e.startswith('(') and e.endswith(')') and _balanced(e[1:-1]):
        e = e[1:-1].strip()

    # rounding idioms, most specific first — these are the ones the audit found mis-stated
    for scale, places in (('1e6', 6), ('1e4', 4), ('1000', 3), ('100', 2), ('10', 1)):
        m = re.match(rf'^Math\.round\(\s*(.*?)\s*\*\s*{re.escape(scale)}\s*\)\s*/\s*{re.escape(scale)}$', e)
        if m: return f'round({math(m.group(1), depth+1)}, {places} dp)'
    m = re.match(r'^Math\.round\((.*)\)\s*/\s*(\d+)$', e)
    if m: return f'round({math(m.group(1), depth+1)}) ÷ {m.group(2)}'
    m = re.match(r'^Math\.(round|floor|ceil|abs|sign|sqrt)\((.*)\)$', e)
    if m:
        w = {'round':'round','floor':'round down','ceil':'round up','abs':'size of','sign':'sign of','sqrt':'√'}[m.group(1)]
        inner = math(m.group(2), depth+1)
        return f'√({inner})' if m.group(1)=='sqrt' else f'{w}({inner})'
    m = re.match(r'^Math\.(max|min)\((.*)\)$', e)
    if m:
        parts = [math(p, depth+1) for p in _split_top(m.group(2))]
        return f'{m.group(1)}({", ".join(parts)})'
    m = re.match(r'^Math\.pow\((.*)\)$', e)
    if m:
        p = _split_top(m.group(1))
        if len(p) == 2: return f'({math(p[0],depth+1)})^({math(p[1],depth+1)})'

    # Σ — a reduce that adds
    i = -1
    for _k in [mm.start() for mm in re.finditer(r'\.reduce\(', e)]:
        if _balanced(e[:_k]): i = _k; break
    if i > -1:
        subject = e[:i]
        inside, _j = _args_of(e, i + len('.reduce')); rest = e[_j:]
        parts = _split_top(inside)
        ps, lam = _body_of_lambda(parts[0]) if parts else (None, '')
        seed = parts[1].strip() if len(parts) > 1 else ''
        if ps and len(ps) >= 2:
            acc, item = ps[0], ps[1]
            mm = re.match(rf'^{re.escape(acc)}\s*\+\s*(.*)$', lam.strip())
            if mm:
                term = math(mm.group(1).strip(), depth+1)
                term = re.sub(rf'\b{re.escape(item)}\.', '', term)
                term = re.sub(rf'\b{re.escape(item)}\b', 'each', term)
                base = math(subject, depth+1)
                out = f'Σ over {base} of ({term})' if base else f'Σ({term})'
                if seed and seed not in ('0',): out += f'  starting from {math(seed, depth+1)}'
                return out + math(rest, depth+1) if rest.strip() else out
            if re.search(r'\?\s*' + re.escape(item) + r'\s*:\s*' + re.escape(acc), lam):
                cmp_ = _split2(lam, '?')
                if cmp_: return f'the one in {math(subject, depth+1)} where {math(cmp_[0], depth+1)} — a pick, not a sum'

    # collection verbs
    _fi = next((mm.start() for mm in re.finditer(r'\.filter\(', e) if _balanced(e[:mm.start()])), -1)
    if _fi > -1 and '.reduce(' not in e:
        m = re.match(r'^(.*)$', e[:_fi])
        inside, _j = _args_of(e, _fi + len('.filter')); rest = e[_j:]
        ps, lam = _body_of_lambda(inside)
        cond = math(lam, depth+1)
        if ps: cond = re.sub(rf'\b{re.escape(ps[0])}\.', '', cond); cond = re.sub(rf'\b{re.escape(ps[0])}\b','each',cond)
        return f'{math(m.group(1), depth+1)} where {cond}{math(rest, depth+1)}'
    m = re.match(r'^(.*)\.length$', e)
    if m: return f'count of {math(m.group(1), depth+1)}'
    # for each …
    _mi = next((mm.start() for mm in re.finditer(r'\.map\(', e) if _balanced(e[:mm.start()])), -1)
    if _mi > -1:
        inside, _j = _args_of(e, _mi + len('.map')); rest = e[_j:]
        ps, lam = _body_of_lambda(inside)
        lam = lam.strip()
        if lam.startswith('(') and lam.endswith(')'): lam = lam[1:-1].strip()
        term = math(lam, depth+1)
        if ps: term = re.sub(rf'\b{re.escape(ps[0])}\.', '', term); term = re.sub(rf'\b{re.escape(ps[0])}\b','each',term)
        return f'for each of {math(e[:_mi], depth+1)}: {term}{math(rest, depth+1) if rest.strip() else ""}'
    m = re.match(r'^(.*?)\.slice\(\s*0\s*,\s*(.+?)\s*\)$', e)
    if m: return f'the first {math(m.group(2), depth+1)} of {math(m.group(1), depth+1)}'
    m = re.match(r'^(.*?)\.sort\(\)$', e)
    if m: return f'{math(m.group(1), depth+1)}, in order'
    m = re.match(r'^Object\.keys\((.*)\)$', e)
    if m: return f'the names in {math(m.group(1), depth+1)}'
    m = re.match(r'^(.*?)\[0\]$', e)
    if m: return f'the first of {math(m.group(1), depth+1)}'
    m = re.match(r'^Number\((.*)\)$', e)
    if m: return f'{math(m.group(1), depth+1)} read as a number'
    m = re.match(r'^typeof\s+(\S+)\s*[!=]==?\s*[\'"](\w+)[\'"]$', e)
    if m: return f'{math(m.group(1), depth+1)} is {"not " if "!" in e else ""}a {m.group(2)}'
    m = re.match(r'^!\s*([A-Za-z_][A-Za-z0-9_.\[\]]*)$', e)
    if m: return f'{math(m.group(1), depth+1)} is missing'
    m = re.match(r'^!\s*\((.*)\)$', e)
    if m: return f'not ({math(m.group(1), depth+1)})'
    m = re.match(r'^(.*?)\s*\?\.\s*(.+)$', e)
    if m: return math(m.group(1) + '.' + m.group(2), depth+1)
    m = re.match(r'^new Date\(\s*\)\.getTime\(\)$|^Date\.now\(\)$', e)
    if m: return 'now'
    m = re.match(r'^new Date\((.+?)\)(?:\.getTime\(\))?$', e)
    if m: return f'the date {math(m.group(1), depth+1)}'

    # a condition — split before the missing-value idioms, and only at bracket depth zero
    parts = _split2(e, '?')
    if parts:
        alt = _split2(parts[1], ':')
        if alt:
            return (f'{math(alt[0], depth+1)}   if {math(parts[0], depth+1)}\n'
                    f'{math(alt[1], depth+1)}   otherwise')

    # a value used when something is missing
    parts = _split2(e, '??')
    if parts:
        fb = parts[1].strip()
        fb = 'none' if fb in ('[]','{}') else math(fb, depth+1)
        return f'{math(parts[0], depth+1)} (or {fb} when missing)'
    parts = _split2(e, '||')
    if parts:
        return f'{math(parts[0], depth+1)} (or {math(parts[1], depth+1)} when missing or zero)'

    # a known helper, expanded rather than left as a name only the code knows
    for fn, tmpl in HELPERS.items():
        m = re.match(rf'^{fn}\((.*)\)$', e)
        if m and _balanced(m.group(1)):
            return tmpl.format(*[math(a, depth+1) for a in _split_top(m.group(1))])

    # an object literal — every field is its own rule, so give each one its own line
    if e.startswith('{') and e.endswith('}') and _balanced(e[1:-1]) and ':' in e:
        fields = []
        for f in _split_top(e[1:-1]):
            kv = _split2(f, ':')
            if kv and re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', kv[0].strip()):
                fields.append(f'{words(kv[0])} = {math(kv[1], depth+1)}')
            elif f.strip():
                fields.append(f'{words(f)} = {words(f)}')
        if fields: return '\n'.join(fields)

    # Math.* and the small constructors, wherever they sit inside a bigger expression
    e = _inner(e, depth)

    # plain arithmetic and comparison — tidy the operators, keep the structure
    e = re.sub(r'\bnull\b', 'nothing', e)
    e = re.sub(r'(?<=[\w)\]])\s*-\s*(?=[\w(\[])', ' − ', e)
    e = re.sub(r'\b([a-z])\.([A-Za-z_])', r'\2', e)
    e = re.sub(r'\s*\*\s*', ' × ', e)
    e = re.sub(r'\s*/\s*', ' ÷ ', e)
    e = re.sub(r'\s*>=\s*', ' ≥ ', e)
    e = re.sub(r'\s*<=\s*', ' ≤ ', e)
    e = re.sub(r'\s*===?\s*', ' = ', e)
    e = re.sub(r'\s*!==?\s*', ' ≠ ', e)
    e = re.sub(r'\s*&&\s*', ' and ', e)
    e = re.sub(r'\s*\|\|\s*', ' or ', e)
    e = re.sub(r'(\d)_(\d)', r'\1\2', e)
    # identifiers → words, but never inside a quoted string
    def _id(mo):
        t = mo.group(0)
        return t if t in _KEEP or t.isupper() else words(t)
    parts, out, q = [], '', None
    for ch in e:
        if q:
            out += ch
            if ch == q: q = None
        elif ch in '\'"`': q = ch; out += ch
        else: out += ch
    e = re.sub(r'\b[A-Za-z_][A-Za-z0-9_]*\b(?![\'"])', _id, out)
    return e.strip()


# ── the same rule, said in English ─────────────────────────────────────────────────────────────
def prose(m):
    """Turn rendered arithmetic into a sentence. Same source, so the two columns cannot drift."""
    return '; '.join(_prose_line(l) for l in str(m).split('\n') if l.strip())

def _prose_line(t):
    t = t.strip()
    t = re.sub(r'^(.*?) = Σ over (.+?) of \((.*)\)$', r'\1 = the \3 added up across \2', t)
    t = re.sub(r'^Σ over (.+?) of \((.*)\)$', r'the \2 added up across \1', t)
    t = re.sub(r'Σ over (.+?) of \((.+?)\)', r'the \2 added up across \1', t)
    t = re.sub(r'Σ\((.+?)\)', r'\1 added up', t)
    t = re.sub(r'round\((.+?), (\d) dp\)', lambda x: x.group(1) + (', to the cent'
               if x.group(2) == '2' else f', to {x.group(2)} decimal places'), t)
    t = re.sub(r'round down\((.+?)\)', r'\1, rounded down', t)
    t = re.sub(r'round up\((.+?)\)', r'\1, rounded up', t)
    t = re.sub(r'round\((.+?)\)', r'\1, to a whole number', t)
    t = re.sub(r'max\(0, (.+?)\)', r'\1, never below zero', t)
    t = re.sub(r'min\((.+?), (.+?)\)', r'the smaller of \1 and \2', t)
    t = re.sub(r'max\((.+?), (.+?)\)', r'the larger of \1 and \2', t)
    t = re.sub(r'count of (.+)', r'how many \1 there are', t)
    t = re.sub(r'\bnot ([a-z][\w ]*?)\b', r'\1 is missing', t)
    t = t.replace(' × ', ' times ').replace(' ÷ ', ' divided by ')
    t = t.replace(' − ', ' minus ').replace(' + ', ' plus ')
    t = t.replace(' ≥ ', ' is at least ').replace(' ≤ ', ' is at most ')
    t = t.replace(' ≠ ', ' is not ').replace(' = nothing', ' is missing')
    t = re.sub(r'\bnothing\b', 'no answer', t)
    t = re.sub(r'\s+if\s+', ' — when ', t)
    t = re.sub(r'\s+when\s+', ' — when ', t) if ' — when ' not in t else t
    t = t.replace('   otherwise', ' — otherwise')
    return re.sub(r'\s{2,}', ' ', t).strip()

# ── the whole function ─────────────────────────────────────────────────────────────────────────
_CONST = re.compile(r'^\s{2,6}(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=]+?)?=\s*(.+?);\s*$')
_RET   = re.compile(r'^\s*return\s+(.+?);\s*$')
_GUARD = re.compile(r'^\s*if\s*\((.+?)\)\s*return\s+(.+?);\s*$')
_OUTSIDE = re.compile(r'\b(fetch|axios|getDoc|setDoc|updateDoc|addDoc|deleteDoc|onSnapshot|AsyncStorage|SecureStore|getUserDoc|saveUserDoc)\b')
_EMIT    = re.compile(r'\b(emit|dispatch|set[A-Z]|console\.)')

def formula(name, sig, body, category=''):
    """(arithmetic, the same rule in words) for one function, read from its own body.

    Steps are kept in the order the code runs them, so a guard that refuses is read before the
    working it guards.
    """
    code = _strip(body)
    lines = code.split('\n')

    # a one-expression arrow function: `export const f = (n) => <expression>;`
    head = lines[0]
    if '=>' in head and '{' not in head.split('=>', 1)[1]:
        tail = head.split('=>', 1)[1].strip().rstrip(';').strip()
        if tail:
            r = math(tail)
            return r, prose(r)

    ordered = []
    for ln in lines[1:]:
        if len(ordered) >= 11: break
        g = _GUARD.match(ln)
        if g: ordered.append(('guard', g.group(1).strip(), g.group(2).strip())); continue
        c = _CONST.match(ln)
        if c: ordered.append(('step', c.group(1), c.group(2).strip())); continue
        r = _RET.match(ln)
        if r and not any(o[0] == 'ret' for o in ordered):
            ordered.append(('ret', '', r.group(1).strip()))

    out, say = [], []
    has_step = any(o[0] == 'step' for o in ordered)
    for kind, a, b in ordered:
        if kind == 'guard':
            out.append(f'{math(b)}   when {math(a)}')
            say.append(f'When {prose(math(a))}, it answers {prose(math(b))}.')
        elif kind == 'step':
            out.append(f'{words(a)} = {math(b)}')
            _pr = prose(math(b))
            _join = ': ' if re.match(r'^(the |how many |adds )', _pr) else ' is '
            say.append(f'{words(a).capitalize()}{_join}{_pr}.')
        else:
            r = math(b)
            out.append(('the answer:\n' if has_step and '\n' in r else
                        'the answer = ' if has_step else '') + r)
            _pr = prose(r)
            say.append((('The answer: ' if re.match(r'^(the |how many )', _pr) else 'The answer is ')
                        if has_step else '') + _pr + '.')

    if not out:
        why = ('It reaches outside the app for data and hands back what came back — no arithmetic of its own.'
               if _OUTSIDE.search(code) else
               'It records or announces something and returns no figure — no arithmetic of its own.'
               if _EMIT.search(code) else
               'NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed '
               'rather than something being guessed. It needs reading by hand.')
        return why, why

    txt = '\n'.join(out)
    sen = ' '.join(x for x in say if x.strip(' .'))
    # G23 (2026-09-08): a loop with a return inside it used to render as its LAST return only — the
    # bracket function read "the answer = 0.37". Say so instead of printing a false answer.
    if re.search(r'\b(for|while)\s*\(', code) and re.search(r'\b(for|while)\s*\([^\n]*\)\s*\{?[^}]*\breturn\b', code, re.S):
        out = [o for o in out if not o.startswith('the answer =')]
        txt = '\n'.join(out) + ('\n' if out else '') + '[LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]'
        sen += ' The answer is found inside a loop that cannot be rendered here; read the code by hand.'
    if len(ordered) >= 11 or len(txt) > 1100:
        txt += '\n… the first steps only — the rest of the body needs reading by hand.'
        sen += ' Only the first steps are shown; the rest of the body needs reading by hand.'
    return txt, sen

def _strip(body):
    body = re.sub(r'/\*.*?\*/', ' ', str(body), flags=re.S)
    return '\n'.join(re.sub(r'//.*$', '', l) for l in body.split('\n'))


# ── written by hand, for the functions a wrong number would be chased through ──────────────────
# These override the machine rendering. Each was read line by line against the code on 2026-08-26.
OVERRIDES = {
 # ── 2026-09-12: the 49 bodies the extractor could not render, read by hand (workplan row) ──
 'txnLabel': ('the answer = TYPE_LABEL[t], or t itself when the type has no label',
   'The plain-English label for a transaction type, or the raw type when none is on record. No arithmetic.'),
 'cashEffect': ('DEPOSIT → +amount\nSELL → +shares × price, or +amount when no shares\nDIVIDEND / INTEREST / COUPON → 0 when reinvested, else +amount\nWITHDRAWAL / FEE / TRANSFER → −amount\nBUY → −(shares × price)\nanything else → 0',
   'The signed cash effect of one transaction on its account, for display: money arriving is positive (a deposit, a sale, a payout that was not reinvested), money leaving is negative (a withdrawal, a fee, a transfer out, a purchase). A reinvested payout moves no cash.'),
 'zero12': ('the answer = twelve zeros, one per month',
   'Twelve zeros, one per calendar month — the empty grid a month-by-month figure is built on. No arithmetic.'),
 'addDays': ('the answer = d + n × 86,400,000 milliseconds',
   'The date n days after d — adding whole days in milliseconds.'),
 'findPos': ('the answer = the first holding in the account whose position id matches, or whose ticker matches (case-insensitive)',
   'Finds the holding a transaction refers to — by position identifier first, then by ticker. No arithmetic.'),
 'inMonth': ("the answer = true when the expense date starts with the month text 'YYYY-MM'",
   'Whether a logged expense falls in the given month: its date begins with that year and month. No arithmetic.'),
 'recurringDebtPayments': ("for each debt whose payment shape is 'installment' and whose required payment > 0: { label, monthly = required payment(debt) }",
   'The instalment debts — mortgage, car, loans — each with its required monthly payment (MK-CF-F-023). A debt due in full is not an instalment and is left out; so is one with no payment.'),
 'daysBetweenDates': ('the answer = round((b − a) in milliseconds ÷ 86,400,000)',
   'Whole days between two dates, rounded to the nearest day.'),
 'hasWage': ('the answer = w exists and (base salary > 0 or the salary-by-month table has entries)',
   'Whether an earner record carries a wage at all — a base salary above zero, or a month-by-month salary table with at least one entry. No arithmetic.'),
 'asPercent': ("the answer = (r × 100) followed by '%'",
   'A rate written the way a person says it: 0.038 becomes 3.8%. The hundred is the percent scale, not an option contract.'),
 'ym': ("the answer = 'YYYY-MM' from the date's year and month",
   "The month text 'YYYY-MM' for a date. No arithmetic."),
 'pctTxt': ("the answer = round(d × 100) followed by '%'",
   'A share written as a whole percent — 0.234 becomes 23%. Display only.'),
 'money0': ("the answer = '$' + round(n) with thousands separators",
   'A dollar amount to the whole dollar with thousands separators, for the insight sentences. Display only.'),
 'wrapperAccount': ("401k → kind '401k', bucket PRE_TAX\ntrad_ira → 'trad_ira', PRE_TAX\nroth → 'roth_ira', ROTH\nroth_401k → '401k', ROTH\nhsa → 'hsa', PRE_TAX\nanything else → 'brokerage', TAXABLE",
   'The account kind and tax bucket for the wrapper a person picked when adding an account — a 401(k), traditional IRA and HSA are pre-tax, a Roth IRA and a Roth 401(k) are tax-free, anything else (or nothing) is a taxable brokerage. No arithmetic.'),
 'itemizedTotal': ('the answer = Σ over items of (value, or 0 when missing)',
   'Adds up the value of every holding entered while itemising an account.'),
 'itemizeRemainder': ('the answer = (lump balance, or 0) − itemized total(items)',
   'The lump balance less the holdings entered so far: positive means money still unallocated, negative means the holdings exceed the entered total.'),
 'bondInfo': ("face = face value   when it is above 0;   nothing otherwise\ncoupon rate = coupon rate as entered (a typed 0 kept);   nothing when not entered\nmaturity = maturity date or ''\nvalue = balance or 0\naccrued interest = the entered figure, or nothing when not entered\nis a CD = kind is 'cd', or the name or institution says CD or certificate of deposit\nwhere a CD was bought = 'broker'   when the person said so;   'bank' otherwise (DEC-3837, 2026-10-10)",
   "Reads the bond's facts off the account record — face value, coupon rate, maturity date, the value as entered, the accrued interest when the person entered it (MK-XS-I-065), whether it is a CD, and where a CD was bought (a CD not answered is read as bought from the bank, DEC-3837). No arithmetic."),
 'plural': ("the answer = n + ' ' + (one   when n = 1;   many   otherwise)",
   "'1 account' or '3 accounts' — the word made plural when the count is not one. Display only."),
 'oddsAt': ('the answer = simulate({ …base, retire monthly spend today: monthly spend }).chance of success',
   'The odds the money lasts when the monthly expenses in retirement are set to a given figure — one full run of the simulation (MK-PL-F-050) with that one input changed.'),
 'numOrZero': ('n = the number in the text after every character but digits and the decimal point is removed\nthe answer = 0 when that is not a number, else n',
   'Reads a typed amount as a number — strips dollar signs, commas and spaces — and gives 0 when nothing numeric is left.'),
 'importKey': ("the answer = account | date | WORD | amount | units | security | ref | description, joined with '|' (missing parts empty)",
   "The stable identity of an imported row: the account, the date, the institution's word in capitals, the amount, the units, the security, the reference and the description, joined with vertical bars. Re-importing the same row builds the same key, so it is never doubled."),
 'holdingId': ('the answer = date | account id | security key',
   'The identity of one holding snapshot: its date, account and security, joined with vertical bars. No arithmetic.'),
 'accountId': ('the answer = date | account id',
   'The identity of one account snapshot: its date and account, joined with a vertical bar. No arithmetic.'),
 'windowBounds': ('beginning as of = the day before the start\ndays = round((end − start) in days) + 1',
   "The bounds of a return window: the beginning value is read on the day BEFORE the start, and the window's length counts both boundary days (brief D3, 2026-08-20)."),
 'balancesHidden': ('the answer = the hide-balances switch',
   'Whether the person has hidden balances on screen. No arithmetic.'),
 'toUtc': ('the answer = the milliseconds since 1970 of the date at midnight UTC',
   "A 'YYYY-MM-DD' text as a moment in time at midnight UTC, so day arithmetic is unaffected by the device's timezone."),
 'makeMonthlySnapshot': ('net worth = gross assets − gross debt\nv = the snapshot version',
   'Builds a month-end snapshot: net worth is assets minus debts, computed here and never stored as a third figure that could disagree with its own halves.'),
 'readHistory': ('for each stored month: normalize snapshot(month, value); drop the unreadable ones; sort by month, oldest first',
   'Reads the stored monthly snapshots, drops any that cannot be read, and sorts them oldest first. No arithmetic beyond the ordering.'),
 'tabOrder': ('retired → home, cashflow, analytics, plan, invest\notherwise → home, analytics, invest, cashflow, plan',
   "The order of the tabs for the person's lens — cash flow comes second for someone retired. No arithmetic."),
 'cacheDataKey': ("keeps the data-encryption key in memory and in the device's secure store",
   'Stores the data-encryption key in memory and in the secure keychain. Not a calculation.'),
 'clearDataKey': ('forgets the data-encryption key in memory and in the secure store',
   'Removes the data-encryption key from memory and the secure keychain — done at sign-out. Not a calculation.'),
 'fetchEconomicData': ('inflation rate = the fetched figure, or the fallback when the fetch failed\ntreasury yield = the fetched figure, or the fallback when the fetch failed\nfetched at = now; each fallback flagged',
   'Fetches the inflation rate and the ten-year Treasury yield; when either fetch fails its fallback is used and FLAGGED as a fallback, never passed off as live.'),
 'resendVerification': ('sends the verification e-mail again to the signed-in person',
   'Resends the e-mail-verification message. Not a calculation.'),
 'currentIdToken': ("the answer = the signed-in person's identity token, or nothing",
   "The signed-in person's identity token for the relay, or nothing when nobody is signed in. Not a calculation."),
 'logoutUser': ('clears the data key, then signs out',
   'Forgets the decryption key and signs the person out. Not a calculation.'),
 'resetPassword': ('sends a password-reset e-mail to the address',
   'Sends the password-reset e-mail. Not a calculation.'),
 'scheduleStreakReminder': ('cancels the existing reminder, then schedules a daily one at 20:00',
   'Schedules the daily 8 pm streak reminder, replacing any existing one. Not a calculation.'),
 'cancelStreakReminder': ('cancels the daily reminder',
   'Cancels the daily streak reminder. Not a calculation.'),
 'sendBudgetAlert': ("sends one alert now: '<category> budget at <round(pct)>%'",
   'Sends an immediate alert naming the category and how much of its budget is used, to the whole percent. Display only.'),
 'scheduleWeeklySummary': ('cancels the existing summary, then schedules a weekly one on Monday at 09:00',
   'Schedules the Monday 9 am weekly summary, replacing any existing one. Not a calculation.'),
 'stripNonMoney': ('the answer = the line with dates (30.04.24, 04/30/24, 2024-04-30) and times (08:30, 7:54:10) blanked out',
   'Blanks the dates and times on a receipt line so only the money figures remain for reading. No arithmetic.'),
 'ocrAvailable': ('the answer = true when the text-recognition module is present and usable',
   'Whether receipt scanning is available on this device. Not a calculation.'),
 'stAssetId': ("the answer = 'st-' + the SnapTrade account identifier",
   "The app's identifier for a connected account: the institution's identifier with an 'st-' prefix. No arithmetic."),
 'activityKey': ('the answer = import key(account, trade date or settlement date, type, amount, units, security, reference, description)',
   'The stable identity of one imported activity row, built by MK-ST-F-014 importKey from the account, the date, the type, the amount, the units, the security, the reference and the description.'),
 'relayUrl': ('the answer = the relay address from the app config, else from the environment, else nothing',
   'Where the connection relay lives, read from the app configuration. Not a calculation.'),
 'usdCash': ('the answer = Σ over balances in USD (or with no currency) of (cash, or 0)',
   'Adds up the cash balances a connected account reports in US dollars (a balance with no currency code counts as dollars). Other currencies are left out.'),
 'nameOf': ("the answer = the person's name for the account, else the institution, else the label, else 'this account'",
   "What to call an account in a sentence — the person's own name for it, then the institution, then the label. No arithmetic."),
 'isYm': ("the answer = true when the text is exactly 'YYYY-MM'",
   "Whether a text is a month key of the form 'YYYY-MM'. No arithmetic."),
 'loadSentry': ('the answer = the crash-reporting module, or nothing when it is absent',
   'Loads the crash reporter if it is installed. Not a calculation.'),
 'inflationRateInForce': ("entered = the person's own rate from the cockpit, when set\nthe answer = { rate: entered, basis 'entered', label 'you entered' }   when entered exists\n             { rate: 2.5%, basis 'default', label '2.5% — the 30-year average of consumer prices (Bureau of Labor Statistics, 1996–2025)' }   otherwise",
   "The person's own inflation rate when they set one on the cockpit; otherwise the dated default — 2.5% a year, the 30-year average of consumer prices — with its source, so the screen can say where the figure came from."),
 'seniorDeductionFor': ('0   when the tax year is outside 2025–2028, or filing separately, or nobody on the return is 65+, or the income is not known\npeople = min(2, over65)\nfull = people × $6,000\nthe answer = max(0, full − 6% × max(0, magi − start))   start = $75,000 single / head of household · $150,000 married',
   'Nothing when the year is outside 2025 to 2028, when the person files separately, when nobody on the return is 65 or older, or when the income is not known. Otherwise $6,000 for each person 65 or older (at most two), reduced by six cents for every dollar of income above $75,000 ($150,000 on a joint return), and never below zero.'),
 'deductionFor': ('t = TAX_TABLES[status]\nthe answer = deduction + min(2, max(0, over65)) × over65 add + senior deduction for(status, over65, magi)',
   'The standard deduction for the filing status, plus the 65-and-over add-on for each person 65+ (at most two), plus the senior deduction calculated by MK-CF-F-187 from the filing status, the number of people 65+ and the income.'),
 'taxableIncomeFor': ('max(0, gross − deduction for(status, over65, gross))   — gross is handed on as the income the senior deduction phases out against',
   'Gross minus the deduction for that filing status, age count and income, never below zero. The same gross figure is handed to the deduction as the income the senior deduction phases out against.'),
 'taxOwedFor': ("ti = taxable income for(gross, status, over65)\nfederal = Σ over the bands of the filing status, lowest first, while ti is above the band's floor: (min(ti, top of band) − top of the band below) × rate of band\nthe answer = federal + ti × min(15%, max(0, state rate))",
   "Taxable income is calculated first. Federal tax fills the bands in order: each band taxes the slice of income between the top of the band below and the smaller of the band's top and the income, at the band's rate. The person's flat state rate, capped at 15%, is then applied to the same taxable income."),
 'marginalBracketFor': ('ti = taxable income for(gross, status, over65)\nthe answer = the rate of the FIRST band whose top is ≥ ti, read in order from the table for the filing status (10% · 12% · 22% · 24% · 32% · 35% · 37%)',
   "Taxable income is calculated first; the answer is the rate of the first band whose top is at or above it, reading the filing status's table from the lowest band up."),
 'drawOrderOutcome': ("gross-up per bucket: cash 0 · Roth 0 · pre-tax = the person's ordinary rate · taxable = the person's capital-gains rate × the gain share of their taxable holdings\nUNKNOWN (no answer, with the reason) when the gain share is not known and there is a taxable balance to draw\nneed each year = max(0, spending − guaranteed income)\nfor each age from today to the horizon:\n    at the required-withdrawal age: take the required amount from pre-tax first, tax it at the ordinary rate, use the net towards the need, reinvest any excess in taxable\n    then walk the buckets in the given order: gross needed = need ÷ (1 − rate); take = min(balance, gross needed); tax = take × rate; need −= take − tax\n    need still > 0 → the money ran out this year: lasts to age = this age\n    every bucket grows at the real return (never below −5%)\ntotal taxes = Σ tax, to the cent; lasts to age = nothing when it survives the whole horizon",
   "Each year the gap between spending and guaranteed income is drawn from the accounts in the given order. Pre-tax draws are grossed up by the person's own marginal rate, taxable draws by their own capital-gains rate on the gain share of their holdings; cash and Roth draw tax-free. The required withdrawal is taken first from the year it applies. The year the gap cannot be met is the age the money lasts to. If the gain share is not known and there is a taxable balance, there is no answer — the reason is returned instead."),
 'taxableGainShare': ("over every holding in a TAXABLE account that has a price (the broker's mark, else the price feed): value += market value(holding, price) · basis += cost basis(holding)\nnothing   when value ≤ 0 (no priced taxable holding)\nthe answer = min(1, max(0, (value − basis) ÷ value))",
   "Add up what the taxable holdings are worth today and what was paid for them; the gain share is the difference as a fraction of today's value, never below zero and never above one. With no priced taxable holding there is no answer."),
 'rmdRequiredThisYear': ("balance used = the pre-tax balance on 31 December last year, when the person entered one (> 0); otherwise today's pre-tax balance\namount = rmd at age(balance used, age)\nbasis = 'prior_year_end' or 'today' — so the screen can say which",
   "If the person has entered last 31 December's pre-tax balance, the required amount is that balance divided by the life-expectancy factor for their age. If not, today's balance is used instead, and the answer carries a flag saying so, which the screen prints."),
 'annualHsaLimit': ('0   when enrolled in Medicare (no contribution is allowed)\n(family ? family limit : self-only limit) + (age ≥ 55 ? the 55+ catch-up : 0)   otherwise',
   'Nothing while enrolled in Medicare. Otherwise the self-only limit (or the family limit when told so), plus the 55-and-over catch-up.'),
 'taxableIncomeSteps': ("gross income = Σ of the organizer's income lines of a taxable type\n401(k) contribution = household pre-tax contributions annual(op)\nstandard deduction = deduction for(filing status, people 65+, gross − 401(k))   — base figure + 65+ add-on + senior deduction\ntaxable income = max(0, gross income − 401(k) contribution − standard deduction)",
   "Add up every income line of a taxable type; take off the household's pre-tax 401(k) contributions; take off the standard deduction for the filing status, the number of people 65 or older and the income; what is left is taxable income, never below zero. The deduction line says when it includes the 65+ add-on and the senior deduction."),
 'householdPreTaxContributionsAnnual': ('Σ over every earner of (monthly 401(k) contribution) × 12',
   "Every earner's monthly 401(k) contribution, added up and taken as running all twelve months."),
 'essentialsFromLoggedSpending': ('window = the 12 complete calendar months before the current month\ncounted = the months in that window with at least one logged entry (every category — debt payments and big items included)\nmonthly = Σ amounts in the counted months ÷ number of counted months\nif no complete month has an entry but the current month does: monthly = the current month\'s total, counted = 1\nnothing when no month has an entry\nlabel = "<counted> month average"',
   "Look at the twelve finished months before this one. Add up everything logged in the months that have anything logged — mortgage, debt payments and big one-offs included — and divide by how many of those months there are. Say how many: '7 month average'. If only the current month has entries, use it alone and say so. With nothing logged there is no answer."),
 'essentialsMonthly': ("logged = essentials from logged spending(expenses, now)\nlogged exists → monthly = logged.monthly, basis 'logged', label = logged.label\notherwise, typed > 0 → monthly = typed, basis 'entered', label 'you entered'\notherwise nothing — the screen shows its door, never a made-up number",
   "The logged average when any month is logged; otherwise the figure the person typed, labelled 'you entered'; otherwise nothing."),
 'realizedFromLedger': ("rows = the ledger's BUY, Opening holding and SELL rows with a ticker, shares and a price (filtered to the ticker / account asked for), oldest first\nfor each row: a buy is queued per account and ticker; a sale takes from the oldest queued buys: take = min(lot shares, shares still to sell); basis += take × lot price; lot shares −= take; still to sell −= take; the lot is dropped when empty\ngain = covered shares × sale price − basis, to the cent; added to the all-time total, and to this year's when the sale date is in this year\na sale with shares still uncovered is counted as a sale without basis — reported, never guessed\nthe answer = { realized all time, realized this year, sells counted, sells without basis }",
   'Every buy is queued, oldest first, per account and ticker. Each sale takes shares from the oldest queued buys; the cost of those shares is the basis; the gain is what the covered shares sold for less that basis, to the cent, with a separate total for sales this year. A sale that cannot be fully matched to recorded buys is counted separately and named on screen, never priced from a guess.'),
 'rothVsTraditional': ('lean = \'roth\'            when marginal now ≤ 12%     why = "You\'re in a low bracket now — pay the tax now (Roth) and withdraw tax-free later."\nlean = \'traditional\'     when marginal now ≥ 24% and marginal retire < marginal now     why = "High bracket now, likely lower in retirement — deduct now (Traditional), pay tax later."\nlean = \'either\'          otherwise     why = "Your brackets are similar — splitting Roth and Traditional hedges your future tax rate."',
   'A marginal rate of 12% or less today leans Roth (pay the tax now, withdraw tax-free later). A rate of 24% or more today that is expected to be lower in retirement leans Traditional (deduct now, pay later). Anything else: either — split the two.'),
 'grossFromNet': ('0   when net ≤ 0\nlo = net, hi = net × 3\nrepeat 50 times: mid = (lo + hi) ÷ 2; if mid − tax owed for(mid, status, 0, over65) < net then lo = mid else hi = mid\nthe answer = (lo + hi) ÷ 2   — the gross whose take-home equals net, found by halving the interval',
   'Searches for the gross pay whose take-home after federal tax equals the net entered: start with the interval from the net to three times the net, and halve it fifty times, keeping the half that brackets the answer. The result is that gross.'),
 'monthlyTaxRates': ("flat = effective rate(op)\n12 slots, each flat   when the person's own rate is in force\ntaxable = taxable by calendar month(op, now)\n12 slots, each flat   when Σ taxable ≤ 0\ntax = progressive monthly tax(taxable, filing status, state rate, people 65+)\nthe answer: for each month, min(60%, max(0, tax ÷ taxable))   if taxable > 0, else flat",
   "One withholding rate per calendar month. If the person set their own rate it is used for every month. Otherwise the year's taxable income is laid out by month, the progressive tax on the running total gives each month's tax, and the month's rate is that tax over that month's taxable income, capped at 60%; a month with no taxable income takes the flat rate."),
 'factorOverMonths': ('pts = series.points\nnothing   when fewer than 2 points\ncutoff = the local calendar date `months` before today (year, month − months, day) — built from local date parts, never via UTC\nnothing   when the series starts after the cutoff\nstart = the last point on or before the cutoff; end = the last point\nnothing   when start.close is missing or ≤ 0\nthe answer = end.close ÷ start.close',
   "The price factor over the trailing window: the latest close divided by the close on or just before the day the window opened. The window opens on the person's own calendar day that many months ago. A series that does not reach back that far gives no answer — no price is invented."),

 'round2': ('round2(n) = round(n × 100) ÷ 100',
   'Rounds to two decimal places — the cent. The hundred is the rounding scale, nothing to do with '
   'percentages or with an option contract being a hundred shares.'),
 'buildNetWorth': (
   'gross assets = round(assets total, 2 dp)\ngross debt   = round(debt total, 2 dp)\n'
   'net worth    = round(assets total − debt total, 2 dp)',
   'Everything owned, less everything owed. Each half is rounded to the cent, and the answer is '
   'rounded again — three roundings. It is worked out fresh every time and never stored, so it can '
   'never disagree with its own two halves. A genuine negative is shown, never floored at zero.'),
 'buildAssetsState': (
   'total asset value      = round(Σ over every account of (balance), 2 dp)\n'
   'share of portfolio (a) = round(balance of a ÷ total × 100, 2 dp)\n'
   'average target return  = round(Σ(target return × balance) ÷ total, 4 dp)',
   'Adds up the balance of every account at face value — the house, the car, the cash and the '
   '401(k) all counted the same way, with no class and no tax treatment applied. Then gives each '
   'account its share of the whole, and blends the target returns weighted by size. With nothing '
   'held at all, the blended return falls back to the built-in default.'),
 'buildDebtState': (
   'total debt balance = round(Σ over every debt of (remaining balance), 2 dp)\n'
   'toxic debt         = round(Σ over debts where rate > 10% of (remaining balance), 2 dp)\n'
   'highest rate debt  = the debt with the largest rate',
   'Adds up what is still owed on every debt, in full and as of today — no interest accrued since '
   'the balance was set, no maturity, no distinction between a mortgage and a card. Separately '
   'totals the debts above the toxic rate, and names the single most expensive one.'),
 'marketValue': (
   'market value(holding) = round(total shares × price, 2 dp)\n'
   '                      = 0   when no price came back',
   "Shares times the latest close. A missing price gives ZERO, not a refusal — the caller has to "
   "notice and substitute something, and only the account step does. Nothing here multiplies an "
   "option contract by a hundred, so an option is valued as if one contract were one share."),
 'totalShares': ('total shares(holding) = Σ over every lot of (shares, or 0 when missing)',
   'Adds the share count of every lot. A lot with no share count counts as zero, so "nothing '
   'recorded" and "a real zero" give the same answer.'),
 'costBasis': (
   'cost basis(holding) = Σ over every lot of (shares × cost per share)',
   'What was paid, added across the lots. A lot with no cost per share contributes nothing, so a '
   'holding with neither a price nor a cost lands at $0 and quietly leaves net worth.'),
 'annualCoupon': ('annual coupon = face value × coupon rate',
   'What the bond pays in interest over a year: its face value times its stated rate. Paid '
   'semi-annually in practice; this figure is the yearly total.'),
 'currentYield': ('current yield = annual coupon ÷ current value',
   'The interest a year as a share of what the bond is worth now. If the recorded value is a dirty '
   'price it carries accrued interest, and the yield reads low — the file does not say which it is.'),
 'approxYTM': (
   'nothing   when there is no maturity date or it has passed\n'
   'a CD bought from the bank (not priced like a bond): the answer = its interest rate (DEC-3837, 2026-10-10)\n'
   'nothing   when no face value or no rate was entered, or the value is 0 or less\n'
   'full price = value + accrued interest (as entered, else estimated accrued)\n'
   'the answer = the yield y at which price at yield(y) = full price, found by halving the interval',
   'The real yield, solved: the rate that discounts every remaining coupon and the face value back to '
   'the full price. A CD bought from the bank yields its stated rate, with or without a face value; a '
   'CD bought through a broker is priced like a bond (DEC-3837, 2026-10-10).'),
 'yearsToMaturity': ('years to maturity = max(0, (maturity date − today) ÷ 365.25 days)',
   'How long until the bond repays, as a fraction of a year, never negative. Uses 365.25 days — '
   'the master file says 365, which is finding A31.'),
 'rmdStartAge': ('start age = 75   when born 1960 or later\n            73   otherwise',
   'The age required withdrawals begin. Born 1960 or later, 75; everyone else, 73 — including '
   'birth years before 1951, whose real start age was 72 or 70 and a half. An unknown birth year '
   'silently answers 73 rather than refusing. Finding A36.'),
 'rmdDivisor': (
   'divisor(age) = 0                        when age is below the start age\n'
   '               the table value at age   when the table lists that age\n'
   '               straight-line between the two nearest listed ages   otherwise',
   'The number the pre-tax balance is divided by. The IRS Uniform Lifetime table is held for ages '
   '73 to 90, then 92, 95 and 100 only; every other age is interpolated. Ages 93, 94, 97, 98 and '
   '99 do not match the published divisors, and the required amount comes out SHORT — which is the '
   'direction the IRS penalises. Finding A35.'),
 'rmdAtAge': ('required withdrawal = round(pre-tax balance ÷ divisor(age), 2 dp)\n'
   '                    = 0   when the divisor is 0',
   'Last 31 December\'s pre-tax balance divided by the life-expectancy divisor for this age. Zero '
   'before the start age. Uses the Uniform Lifetime table for everyone — the Joint Life table, '
   'which applies when the sole beneficiary is a spouse more than ten years younger, is nowhere.'),
 'fullRetirementAge': (
   'full retirement age = 67                          when born 1960 or later\n'
   '                      66 + (birth year − 1954) × 2 months   when born 1955-1959\n'
   '                      66                          when born 1954 or earlier',
   'The age Social Security pays the full amount, in years and fractions of a year. Anyone born '
   '1954 or earlier answers 66 — the published ages are 65 for 1937 and earlier and 65 plus two to '
   'ten months for 1938-1942. A missing birth year answers 67. Finding A39.'),
 'ssClaimFactorFor': (
   'months = round(claim age) × 12 − full retirement age × 12\n'
   'factor = 1                                                   when months = 0\n'
   '         1 − (first 36 early months × 5/9 of 1%)\n'
   '           − (each further early month × 5/12 of 1%)          when claiming early\n'
   '         1 + (each month claimed late × 2/3 of 1%)            when claiming late',
   'How much of the full-retirement amount is paid at the age chosen, held between 62 and 70. The '
   'SSA rates are right. But the claim age is ROUNDED TO A WHOLE YEAR before the months are '
   'counted, so claiming at 62 and six months is priced as 63 — about 3.3% of the benefit, roughly '
   '$83 a month for life on a $2,500 benefit. Finding A38.'),
 'ssBenefitAt': ('monthly benefit = statement amount at full retirement age × factor(claim age)',
   'The amount on the Social Security statement, scaled by the claim-age factor and rounded to '
   'whole dollars. In today\'s money — no inflation is applied here.'),
 'taxableIncome': ('taxable income = max(0, gross − standard deduction)',
   'Gross income less the standard deduction, never below zero. The 2026 single-filer deduction is '
   '$16,100 (IRS Rev. Proc. 2025-32) — named in the code, and named nowhere in the master file.'),
 'taxOwed': (
   'tax owed = Σ over each band of ( the part of taxable income inside that band × its rate )',
   'Walks the federal bands from the bottom, taxing only the slice of income that falls inside '
   'each one. Progressive, not a flat rate on the whole amount. 2026 single-filer bands.'),
 'payoffPlan': (
   'each month:  balance ← balance + balance × rate ÷ 12\n'
   '             pay each debt its minimum, once its first payment month has arrived\n'
   '             pay everything left over to ONE debt — highest rate (avalanche)\n'
   '                                              or smallest balance (snowball)\n'
   '             a debt clears when its balance falls to a cent or less, and its payment\n'
   '                 rolls into the budget for the next one\n'
   'stops at 600 months and reports "never pays off"',
   'Rolls every debt forward a month at a time on one constant budget. Interest is charged before '
   'anything is paid. Debts due in full as a lump are taken out of this and settled in their own '
   'month. A loan whose first payment has not arrived still accrues interest but is not paid. The '
   'roll-over of a cleared debt\'s payment into the next is what makes the answer right, and none '
   'of this is in the master file — finding A43.'),
 'projectNestEgg': (
   'years to retire  n = max(0, retire age − age today)\n'
   'pot = start balance × (1 + r)^n\n'
   '    + Σ for year y = 0 … n−1 of ( contribution × (1 + g)^y × (1 + r)^(n − y − 1) )\n'
   'where r = the assumed return and g = the rate contributions grow',
   'Compounds what is held today forward to the retirement age, then adds each year\'s '
   'contribution compounded for the years it still has to grow. The code settles two things the '
   'master file leaves open: a contribution is treated as arriving at the END of its year (the '
   'first one compounds for n−1 years, the last for none), and contributions grow at their own '
   'rate, which DEFAULTS TO ZERO when nobody sets it. The return r is a nominal rate; inflation is '
   'applied to the spending side, not here. Finding A44 — the file states none of this.'),
 'latestClose': ('latest close = the last point in the price series\n'
   '             = nothing   when the series is empty',
   'The most recent closing price held for a ticker. It carries no date with it, so nothing '
   'downstream can tell a price from this morning from one three weeks old.'),
 'priceFreshness': (
   'age   = now − the moment prices were last fetched\n'
   'stale = age ≥ 4 days,  or nothing was ever fetched,  or the moment cannot be read',
   'How long since prices last came back, said in days or hours. Four days, because a long weekend '
   'or a holiday can put three days between two perfectly normal updates and a false alarm teaches '
   'people to ignore the real one. Never fetched, unreadable, or dated in the future all read '
   'STALE — silence is not good news.'),
 'capGains': (
   'per lot:  gain = shares × (price − cost per share)\n'
   'long-term when today is LATER than the first anniversary of the purchase\n'
   'short-term otherwise, and a lot with no cost recorded is skipped entirely',
   'Splits the unrealised gain into long and short term, lot by lot, comparing calendar days so a '
   'timezone cannot move the line. Exactly one year is still SHORT term — long term begins the day '
   'after the anniversary, which is the IRS rule. An unreadable purchase date stays short term, '
   'the cautious side, because understating a tax bill is the worse mistake.'),
}


# ── assumptions read by hand — rulings, sources and conventions the sweep cannot see (2026-09-08) ──
ASSUMPTIONS_EXTRA = {
 'ageToday': ['G9 (founder, 2026-09-12): birthday-aware when the birth month is known (the onboarding asks for it), the year-attained age when only the year is known, nothing when the birth year is unknown — never a stand-in month or age. Limits use the year-attained age instead (G1).'],
 'payrollTaxWithheld': ['G4 (founder agreed 2026-09-12): per earner, 6.2% of the wage up to the Social Security wage base ($184,500 in 2026), 1.45% of the whole wage, and 0.9% more above $200,000 — what a paycheck withholds. It is NEVER deducted from the take-home estimate; it sizes the sentence "the take-home above is higher than it will really be, by roughly $X a month".'],
 # G1 (founder agreed 2026-09-12): the age every contribution limit uses
 'annual401kLimit': ['Age = the age attained at any time in the calendar year (this year − birth year), the IRS test for the 50+ catch-up and the 60–63 super catch-up (IRC §414(v)) — never the birthday-aware age (G1). No age → the base limit, no catch-up.'],
 'annualIraLimit': ['Age = the age attained at any time in the calendar year (this year − birth year), the IRS test for the 50+ catch-up (IRC §219(b)(5)(B)) — never the birthday-aware age (G1).'],
 'annualHsaLimit': ['Age = the age attained at any time in the calendar year (this year − birth year), the IRS test for the 55+ catch-up (IRC §223(b)(3)) — never the birthday-aware age (G1). Enrolled in Medicare → nothing (G10).'],
 'ageAttainedInYear': ['The IRS convention for limits: a person attains an age at any point in the calendar year, so this year − birth year — not the birthday-aware age used for display (G1 / G9).'],
 # 2026-09-12 — second-verification rulings G5, G7, G11, G36 (his -jj comments)
 'willItLastInputs': ['The current age is birthday-aware when the birth month is known, else the year-attained age (G9, 2026-09-12).', 'Inflation: the percent figure entered (2.5) is divided by 100 before use — 0.025 a year (G5). The effective tax rate on pre-tax withdrawals is the person\'s own, from filing status and income (income floored at $30,000), clamped between 10% and 60% (G7 / G35).'],
 'yearsToMaturity': ['No maturity date, or an unreadable one, gives NO answer — not zero and not "due now" (G11, founder 2026-09-12); the yield to maturity and the rate sensitivity then refuse too.'],
 'monthsLeftInYear': ['The current month counts as remaining, so December divides by 1 (G36, founder 2026-09-12).'],
 # 2026-09-12 — the August findings re-verified; what the code settles is now SAID on the row
 'rmdAtAge': ['Uses the IRS Uniform Lifetime table for everyone (A37). A person whose sole beneficiary is a spouse more than ten years younger may use the Joint Life and Last Survivor table, which gives a SMALLER required amount — not modelled, and not said on the screen yet.'],
 'rmdStartAge': ['When the birth year is missing the start age is taken as 73 — the rule for those born 1951–1959, the middle of the 55–70 audience (A36). The whole schedule is coded: 70½ before 1949, 72 for 1949–1950, 73 for 1951–1959, 75 from 1960.'],
 'ssLifetimeTotal': ["Monthly benefit × the months from the claim age to the life expectancy, in today's dollars — no cost-of-living rise and no discounting (A40). The retirement paycheck on another screen grows Social Security with inflation; this figure is the real-terms total, and the screen does not yet say so."],
 'rothConversionCost': ['The conversion is stacked on top of the year\'s other ordinary income and taxed through the brackets from there (A42). Not modelled: the Medicare income-related premium surcharge (IRMAA) two years later and the net-investment-income tax — both can change whether a conversion is worth doing at 55–70.'],
 'projectNestEgg': ['A contribution is treated as arriving at the END of its year, so it compounds for one year fewer than a start-of-year contribution would — the answer differs by a factor of (1 + r) between the two readings (A44 / B11). Contributions grow at their own rate, which is ZERO when nobody sets one. r is a nominal return; inflation is applied elsewhere.'],
 'inflationRateInForce': ['Founder ruling brief Q-50 (2026-08-20), executed 2026-09-08 (G30): the default is the dated 30-year average — 2.5% a year, Bureau of Labor Statistics CPI-U 1996–2025, checked 2026-09-08 — never a live feed; the person\'s own rate outranks it.'],
 'deductionFor': ['2026 standard deduction $16,100 single · $32,200 married · $16,100 filing separately · $24,150 head of household; 65+ add-on $2,050 single / head of household · $1,650 per person married (IRS Rev. Proc. 2025-32 §3.18).',
                  'Plus the senior deduction of MK-CF-F-187 — $6,000 per person 65+, phased out 6% above $75,000 / $150,000, tax years 2025–2028 (P.L. 119-21 §70103).'],
 'seniorDeductionFor': ['Uses the published figures: $6,000 per person 65+, phased out at 6% above $75,000 ($150,000 joint), 2025–2028 (P.L. 119-21 §70103; checked 2026-09-08; lapses after 2028 — the statutory test fails when the tax year rolls past it).',
                        'Takes the income handed to it as modified adjusted gross income — the untaxed part of Social Security and other adjustments are not modelled.',
                        'Income not known → 0, never a guessed deduction.'],
 'taxOwedFor': ['The 2026 bands per filing status are the Reference tab\'s statutory table (IRS Rev. Proc. 2025-32 §4.01), checked by statutory_constants.test.ts.'],
 'drawOrderOutcome': ['NO built-in tax rates (founder ruling 2026-09-08, second verification G6; rule R2/brief Q-43 (2026-08-20)): the caller hands in the person\'s own marginal ordinary rate (MK-CF-F-103) and long-term gains rate (MK-CF-F-104), and the gain share of their taxable holdings (MK-PL-F-081); unknown gain share with a taxable balance → no answer, with the reason.',
                      'Balances grow at the real return, floored at −5% a year.',
                      'The required withdrawal is taken first from the year it applies (MK-PL-F-007).'],
 'taxableGainShare': ['A holding with no price is left out; no priced taxable holding at all → nothing, never a guessed 50% (founder ruling 2026-09-08, G6).',
                      'A loss overall counts as a 0% gain share (no tax on drawing at a loss), never negative.'],
 'rmdRequiredThisYear': ['The law bases the year\'s required withdrawal on the prior 31 December balance (Treas. Reg. §1.401(a)(9)-5); when that balance is not entered, today\'s balance stands in and the screen says so — founder ruling 2026-09-08 (second verification G8).'],
 'annualHsaLimit': ['Enrolled in Medicare → 0 (IRS Publication 969: no HSA contribution while enrolled). Not enrolled, or not answered → the limit, and at 65+ the screen says "if you are not enrolled in Medicare" and asks — founder ruling 2026-09-08 (second verification G10).',
                    'Self-only limit unless told it is a family plan.'],
 'taxableIncomeSteps': ['Founder ruling brief Q-46 (2026-08-20) (2026-09-08): the organizer shows gross income, the 401(k) contribution, the standard deduction and taxable income — not one unexplained total.',
                        'The senior deduction phases out on gross income less the 401(k) contribution (the nearest figure the app holds to modified adjusted gross income).',
                        'Only pre-tax 401(k) contributions come off; a Roth contribution does not reduce taxable income.'],
 'householdPreTaxContributionsAnnual': ['Twelve equal months — a contribution entered monthly is taken as running all year.'],
 'essentialsFromLoggedSpending': ['Founder ruling brief Q-21 (2026-08-20): the average of ACTUAL logged spending, mortgage and big items included — never the typed plan when logs exist.',
                                  'Founder ruling Q47 (2026-09-08): fewer than 12 months logged → the average over the months logged, and the label says how many.',
                                  'ASSUMPTION (mine, 2026-09-08, stated for the founder\'s ruling): the current, unfinished month is left out — a month three days old would drag the average down — unless it is the only month with entries.'],
 'essentialsMonthly': ['Logged spending outranks the typed figure whenever a month is logged (brief Q-21 (2026-08-20)); the typed figure is used only when nothing is logged, and it is labelled \'you entered\'.'],
 'emergencyTest': ['G21 (2026-09-08): essentials a month = the figure handed in by the screen (MK-CF-F-190: logged average, else typed), falling back to the typed categories only when nothing is handed in.'],
 'factorOverMonths': ['The window boundary is a LOCAL calendar date (the person\'s own day), so the answer is the same in every timezone (TZ-1, 2026-09-08).'],
 'approxYTM': ['\'value\' is the bond\'s current value as entered (the balance) — the SAME total basis as face, not a price per $100 (founder question G20, 2026-09-08).'],
 'portfolioPeriodReturn': ['Second verification G18, 2026-09-08: this is the value-weighted average of holding returns, not a Dietz return.'],
 'simulate': ['The tax on pre-tax withdrawals is the rate the caller passes, capped at 60%; when no rate is passed NO tax is applied and the result says so — never a built-in 22% (G7, founder 2026-09-12).', 'Founder ruling 2026-09-08 (G17): one count, 1,000 futures, on every surface; the guard test simulation_paths.test.ts fails on any other number.'],
 'realizedFromLedger': ['Sales dated in the current calendar year make the this-year total; the device clock decides which year that is.'],
 # DEC-3279e (2026-10-08): the sweep reads `balance || 0` as "counts as zero"; a missing balance adds nothing and is
 # named in the amber box (dataGaps, src/domain/gaps) — it is never a $0 value (outside re-run, 2026-10-13)
 'totalAssets': ['A missing balance is left out (adds nothing); the amber box names the account (DEC-3279e). A typed $0 is a value and is added.'],
}
# sweep lines that are false for a function and must not print
ASSUMPTIONS_DROP = {
 'grossFromNet': ['Uses a built-in i'],
 'realizedFromLedger': ['Multiplies by 100'],
 'totalAssets': ['If balance is missing it counts as zero'],
}


# ── one word for one concept, applied to every rendered formula (founder standing order 2026-09-02;
# second verification G34). Lives here so the master file, the code headers and the agreement check
# all see the same text.
import re as _re
CANON = [(r'\bnet a month\b','take-home /month'), (r'\bnet a year\b','take-home /year'), (r'\bNet / month\b','Take-home / month'),
         (r'\btake-home a month\b','take-home /month'), (r'\btake-home a year\b','take-home /year'),
         # cluster #16 (2026-09-10): spouse — the quoted code value 'partner' (a track id) stays as the code has it
         (r"(?<!')\bpartner\b(?!')",'spouse'), (r"(?<!')\bPartner\b(?!')",'Spouse'), (r"(?<!')\bpartners\b(?!')",'spouses'),
         (r"\byou set it\b",'you entered'),
         # cluster #3, his answer 2026-09-12: 'spending' → 'expenses' in prose too — identifiers such as
         # monthlySpending render as words, so the rendered words follow the canon; code values in quotes stay
         (r"(?<!')\bspending\b(?!')",'expenses'), (r"(?<!')\bSpending\b(?!')",'Expenses'), (r"(?<!')\bSPENDING\b(?!')",'EXPENSES'),
         (r'\bsafe draw\b','draw from savings'), (r'\bsafely drawn\b','drawn from savings'),
         # cluster 0c (2026-09-13): 'engine' is retired (identifier standard) — the folder path code/engines and the old tab are spared
         (r'(?<!code/)\bengines\b(?!-old-tab)','functions'), (r'(?<!code/)\bengine\b','function'), (r'(?<!code/)\bEngines\b','Functions'), (r'(?<!code/)\bEngine\b','Function'), (r'(?<!code/)\bENGINES\b','FUNCTIONS'), (r'(?<!code/)\bENGINE\b','FUNCTION'),
         (r'\bCHEQUE\b','CHECK'), (r'\bcheque\b','check'), (r'\bAn estimate, and labelled as one\b','Calculated, and labelled as one')]
_PATH = _re.compile(r'MK-[A-Z]{2}-[A-Z]-\d{3} [A-Za-z_][A-Za-z0-9_]*|\S*\.tsx?\b|\S*/\S+')   # an identifier's name after its MK-ID is code, as the guard reads it
def canon(text):
    """the one canon, applied to COPY only: a single token with no space is a code value (an identifier, a key)
    and a path is a path — both pass through untouched, the same rule the one-term guard applies (2026-09-13)."""
    if not isinstance(text, str): return text
    if not _re.search(r'\s', text.strip()) and not _re.match(r'^[A-Z][a-z]', text.strip()): return text
    keep = []
    def hold(m): keep.append(m.group(0)); return '\x00%d\x00' % (len(keep) - 1)
    text = _PATH.sub(hold, text)
    for pat, rep in CANON: text = _re.sub(pat, rep, text)
    return _re.sub(r'\x00(\d+)\x00', lambda m: keep[int(m.group(1))], text)

# categories read by hand (C4, 2026-09-08): round2 rounds displayed money — it is a dependent function, not an action
CATEGORY_OVERRIDES = {'round2': '3 · DEPENDENT'}
