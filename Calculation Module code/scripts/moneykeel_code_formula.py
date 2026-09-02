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
   'cost basis(holding) = round(Σ over every lot of (shares × cost per share), 2 dp)',
   'What was paid, added across the lots. A lot with no cost per share contributes nothing, so a '
   'holding with neither a price nor a cost lands at $0 and quietly leaves net worth.'),
 'annualCoupon': ('annual coupon = round(face value × coupon rate, 2 dp)',
   'What the bond pays in interest over a year: its face value times its stated rate. Paid '
   'semi-annually in practice; this figure is the yearly total.'),
 'currentYield': ('current yield = round(annual coupon ÷ current value, 4 dp)',
   'The interest a year as a share of what the bond is worth now. If the recorded value is a dirty '
   'price it carries accrued interest, and the yield reads low — the file does not say which it is.'),
 'approxYTM': (
   'yield to maturity ≈ round( (annual coupon + (face − value) ÷ years left)\n'
   '                           ÷ ((face + value) ÷ 2), 4 dp )',
   'The STRAIGHT-LINE APPROXIMATION, not the real yield. The gain or loss to maturity is spread '
   'evenly over the years left and taken against the average of face and price. The true yield is '
   'the rate that discounts every coupon and the face value back to the price — 4 to 27 basis '
   'points away from this, widening with the discount and the maturity. Finding A30.'),
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
 'ssBenefitAt': ('monthly benefit = round(statement amount at full retirement age × factor(claim age))',
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
