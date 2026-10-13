"""Every function in the calculation code, sorted into the four categories.

Read from the code itself. The sorting is done by what the code actually does — what a function
returns, whether it reaches outside for data, and who calls it — not by its name.
"""
import os, re, importlib.util as _ilu
_spec = _ilu.spec_from_file_location('mkcf', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'moneykeel_code_formula.py'))
_cf = _ilu.module_from_spec(_spec); _spec.loader.exec_module(_cf)
# What still counts as code showing through. A cell that trips any of these is PARTLY READ, never
# clean — the tier must never flatter itself, which is the whole point of the column.
_CODEY = re.compile(r'=>|\?\?|\bMath\.|\bnew \w|=== |\bundefined\b|\btypeof\b'
                    r'|\.\w[\w ]*\(|\)\.\w|\.\w+\b(?<!\bdp)\s*\(|\[\s*\d'
                    r'|\b(get time|get full year|get month|locale compare|to fixed|pad start|is array'
                    r'|push|slice|splice|join|match|replace|trim|to upper case|to lower case'
                    r'|starts with|ends with|includes|index of|keys|values|entries|from entries)\b'
                    r'|\$\{|`')

CALC_ROOTS = ['src/domain', 'MoneyKeel/functions', 'Calculation Module code/engines', 'src/services', 'src/store']   # src/store added 2026-09-12 (B3 / A09): recomputeBalances builds the balance net worth is made of
SCREEN_ROOTS = ['src/screens', 'src/components', 'app', 'src/onboarding']

OUTSIDE = re.compile(r'\b(fetch|getDoc|getDocs|onSnapshot|readAsStringAsync|getItem|axios)\s*\(')
WRITES  = re.compile(r'\b(setDoc|updateDoc|deleteDoc|setItem|removeItem|writeAsStringAsync|emit)\s*\(')
ARITH   = re.compile(r'[+\-*/]\s*[A-Za-z0-9_.()]|Math\.|reduce\(|\.toFixed\(')

def _without_headers(lines):
    """Blank out every generated header, keeping the line numbering intact.

    A header is a PRINTED VIEW of the file and the code. If the parser can see one, its contents
    come back round as the author's own note — which is exactly what happened on 2026-08-26, twice:
    "Answers ..... unwrapActivities Answers .....". Removing them before anything is parsed closes
    the loop at the root instead of teaching each reader to skip them.
    """
    out, inside = [], False
    for ln in lines:
        if ln.startswith('/* ─ MK-') and re.match(r'^/\* ─ MK-[A-Z]{2}-[FO]-\d{3} ─', ln):
            inside = True
        if inside:
            out.append('')
            if ln.strip().endswith('*/'):
                inside = False
            continue
        out.append(ln)
    return out


def bodies(path):
    """(name, line, body) for every exported function in a file."""
    text = _without_headers(open(path).read().split('\n'))
    marks = []
    for i, line in enumerate(text):
        # Every function declared at the top level of the file, exported or not. Until 2026-08-26
        # only exported ones were read, so 88 module-private helpers had no identifier and no row —
        # rung 1 was being checked against two-thirds of the code. They are also where a function's
        # body used to run on into: a body ended at the next EXPORTED function, so a private helper
        # below was swallowed and its assumptions attributed upwards (finding A19). Reading them
        # fixes both at once.
        m = (re.match(r'export (?:async )?function ([A-Za-z0-9_]+)', line) or
             re.match(r'export const ([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(', line) or
             re.match(r'export default (?:async )?function ([A-Za-z0-9_]+)', line) or
             re.match(r'(?:async )?function ([A-Za-z0-9_]+)', line) or
             re.match(r'const ([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+?)?=>', line))
        if m:
            marks.append((m.group(1), i, line))
    out = []
    for k, (name, i, sig) in enumerate(marks):
        end = marks[k+1][1] if k+1 < len(marks) else len(text)
        # the note written above the function — its purpose, in the author's own words
        note = []
        j = i - 1
        while j >= 0 and (text[j].strip().startswith(('*', '/**', '*/', '//')) or text[j].strip() == ''):
            if text[j].lstrip().startswith('/* ─ MK-'):
                # A generated header is not the author speaking. Everything gathered so far
                # came from INSIDE that header, so throw it away rather than read our own
                # printed view back in as if it were a note someone wrote.
                note = []
                break
            if text[j].strip() == '' and note: break
            if text[j].strip() not in ('*/', '/**', '*', ''):
                _n = re.sub(r'^\s*(/\*\*|\*/|\*|//)\s?', '', text[j])
                note.append(re.sub(r'\s*\*/\s*$', '', _n).strip())   # a one-line /** … */ keeps no terminator
            j -= 1
        out.append((name, i+1, sig, '\n'.join(text[i:end]), ' '.join(reversed(note)).strip()))
    return out


# A label is taken WHOLE — brackets, colons and slashes included. Cutting at the first bracket
# turned "In (received)" into "In", a label that appears on no screen.
LABEL_TXT = re.compile(r'>\s*([A-Z][^<>{}\n]{2,58}?)\s*<')
LABEL_PROP = re.compile(r'(?:label|title)\s*=\s*(?:\{\s*)?[\'"]([A-Z][^\'"\n]{2,58})[\'"]')

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
    # every call site in one pattern; membership is then a set lookup rather than a regex per name
    NAME_RE = re.compile(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\(') if names else None
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
                # ONE compiled alternation, not one regex per name per line. This used to compile
                # and run a fresh pattern for every function name on every line of every screen
                # file — 533 names across ~40,000 lines — and it is what made the build hang once
                # the sweep was widened on 2026-08-26.
                held_re = (re.compile(r'[{(,\s](' + '|'.join(re.escape(h) for h in held) + r')\b')
                           if held else None)
                for i, line in enumerate(lines):
                    printed = set(held_re.findall(line)) if held_re else set()
                    direct = {n for n in set(NAME_RE.findall(line)) if n in names} if NAME_RE else set()
                    if not printed and not direct: continue
                    if not re.search(r'money|maskedMoney|pct|<Text|value=|toFixed', line): continue
                    lab = ''
                    for k in range(i, max(-1, i-8), -1):
                        mm = LABEL_TXT.findall(lines[k]) or LABEL_PROP.findall(lines[k])
                        if mm: lab = mm[-1].strip(); break
                    if not lab: continue
                    where = section_above(lines, i)
                    said = ('"' + lab + '" — on ' + screen_of(short) +
                            (', under "' + where + '"' if where else ''))
                    for h in printed:
                        for fn in held[h]:
                            out.setdefault(fn, set()).add(said)
                    for fn in direct:
                        out.setdefault(fn, set()).add(said)
    return out


# file name in the code -> the screen a person would name
SCREEN_NAMES = {
 'HomeScreen':'Home','NetWorthScreen':'Net worth','PerformanceScreen':'Performance',
 'CashFlowScreen':'Cash flow','PlanHubScreen':'Plan','AccountDetailScreen':'Account detail',
 'HoldingDetailScreen':'Holding detail','WillItLastScreen':'Will my money last',
 'WhatIfScreen':'What if','SsTimingScreen':'Social Security timing','RothScreen':'Roth move',
 'RequiredWithdrawalsScreen':'Required withdrawals','MultiGoalScreen':'Goals together',
 'RetirementCockpit':'Retirement cockpit','BondsScreen':'Bonds','ItemizeScreen':'Itemise an account',
 'OtherInvestmentsScreen':'Other investments','LookBackScreen':'Look back','GoalsScreen':'Goals',
 'InsuranceScreen':'Insurance','JobSafetyScreen':'Job safety','StressTestScreen':'Stress test',
 'TaxOrganizerScreen':'Tax organiser','EducationScreen':'College costs','CreditScreen':'Credit',
 'BigCostsScreen':'Big costs','ContributionRoomScreen':'Contribution room','ExpenseScreen':'Add an expense',
 'IncomeDetailScreen':'Income detail','IncomeManagerScreen':'Income manager','MonthlyIncomeScreen':'Monthly income',
 'MonthDetailScreen':'Month detail','BillCalendarScreen':'Bill calendar','PaycheckMonthsScreen':'Paycheck months',
 'InsightsScreen':'Insights','WorthALookScreen':'Worth a look','EstateScreen':'Estate','SettingsScreen':'Settings',
 'ImportHoldingsScreen':'Import holdings','AddAccountScreen':'Add an account','ConnectFlowScreen':'Connect an account',
 'OnboardingScreen':'Setup','FirstRunScreen':'First run','modules':'the setup questions, which appear on more than one screen',
}
def screen_of(filename):
    base = filename.replace('.tsx','').replace('.ts','')
    if base in SCREEN_NAMES:
        nm = SCREEN_NAMES[base]
        return nm if nm.startswith('the ') else 'the ' + nm + ' screen'
    if base.endswith('Screen'): return 'the ' + re.sub(r'(?<!^)(?=[A-Z])',' ',base[:-6]).lower() + ' screen'
    return 'a card used on more than one screen (' + base + ')'

SECTION = re.compile(r'(?:SectionBand[^>]*?title=\s*[{`\'"]+\s*([^`\'"<>{}\n]{3,54}))')
def section_above(lines, i):
    for k in range(i, max(-1, i-60), -1):
        m = SECTION.search(lines[k])
        if m:
            t = m.group(1).strip().rstrip('`').strip()
            t = re.sub(r'\$\{[^}]*\}', '…', t)
            if t: return t
    return ''

def _words(name):
    """turn a code name into words a person would say"""
    n = re.sub(r'(?<!^)(?=[A-Z])', ' ', str(name)).replace('_', ' ').lower().strip()
    swap = {'nw':'net worth','ret':'return','pct':'percent','amt':'amount','bal':'balance',
            'inp':'the inputs','op':'the setup answers','ss':'social security','rmd':'required withdrawal',
            'egg':'nest egg','col':'cost of living','txn':'transaction','acct':'account','mo':'a month',
            'yr':'a year','est':'estimated','vol':'how much it swings','inf':'inflation'}
    return ' '.join(swap.get(w, w) for w in n.split())

def _num(v):
    """a number said the way a person would say it"""
    f = float(v)
    if 0 < f < 1:
        pct = f * 100
        return ('%g%%' % round(pct, 4))
    if f == int(f): return '%d' % int(f)
    return '%g' % f

def assumptions_in(body):
    """What a function takes for granted, named with its real value.

    Read from the code with comments stripped, so it reports what runs.
    """
    code = strip_comments(body)
    found = []
    def add(sentence):
        if sentence not in found: found.append(sentence)

    # a value used when something is missing
    for m in re.finditer(r'([A-Za-z_][A-Za-z0-9_.\[\]]*)\s*\?\?\s*(-?\d+(?:\.\d+)?)', code):
        add('If %s is missing it uses %s.' % (_words(m.group(1).split('.')[-1]), _num(m.group(2))))
    for m in re.finditer(r'([A-Za-z_][A-Za-z0-9_.\[\]]*)\s*\|\|\s*0\b', code):
        add('If %s is missing it counts as zero, so nothing recorded and a real zero look the same.'
            % _words(m.group(1).split('.')[-1]))

    # a rate or share written into the code
    for m in re.finditer(r'(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(0\.\d+|\d+(?:\.\d+)?)\s*[;\n]', code):
        if len(m.group(1)) == 1 and m.group(2) in ('0', '1'): continue   # a loop counter (A17), not an assumption
        add('Uses a built-in %s of %s.' % (_words(m.group(1)), _num(m.group(2))))
    for m in re.finditer(r'([A-Za-z_][A-Za-z0-9_.]*)\s*\*\s*(0\.\d+)', code):
        add('Applies a built-in rate of %s to %s.' % (_num(m.group(2)), _words(m.group(1).split('.')[-1])))

    # time
    # A18 (2026-09-12): only an ANNUAL amount divided by twelve is the twelve-equal-months assumption;
    # a bare /12 is as often a month index. The 30-day, ×100 and .filter phrases were notes to myself
    # (A16) and are gone — a real assumption of that kind is declared by hand in ASSUMPTIONS_EXTRA.
    if re.search(r'[Aa]nnual\w*\s*/\s*12\b|[Yy]ear\w*\s*/\s*12\b|Yr\s*/\s*12\b', code):  add('Treats a year as twelve equal months.')
    if re.search(r'\*\s*12\b', code): add('Turns a monthly figure into a year by multiplying by twelve.')
    if re.search(r'/\s*365(\.25)?\b', code): add('Treats a year as 365 days.')
    if re.search(r'new Date\(\)|Date\.now\(\)', code): add("Uses today's date from the device clock, so the answer changes by itself overnight.")

    # rounding idioms FIRST (C4 / A15, 2026-09-08): Math.round(n × 100) ÷ 100 is two decimals, not
    # "a whole number" and not "a percentage" — the hundred is the rounding scale.
    scaled = re.findall(r'Math\.round\([^;]*?\*\s*(1e\d|\d+)\s*\)\s*/\s*(1e\d|\d+)', code)
    places_seen = set()
    for a, b in scaled:
        if a == b:
            n = int(float(a)); places = len(str(n)) - 1
            places_seen.add(places)
            add({1: 'Rounds the answer to 1 decimal place.', 2: 'Rounds the answer to two decimals (cents).',
                 3: 'Rounds the answer to 3 decimal places.', 4: 'Rounds the answer to 4 decimal places.'}.get(places, 'Rounds the answer to %d decimal places.' % places))
    code_no_round = re.sub(r'Math\.round\([^;]*?\*\s*(1e\d|\d+)\s*\)\s*/\s*(1e\d|\d+)', ' ', code)
    code_no_round = re.sub(r'\*\s*100\)\s*\.toFixed', ' ', code_no_round)
    # options and percentages — only a ×100 that is NOT part of a rounding or a percent display

    # caps and floors
    for m in re.finditer(r'clamp\(\s*[^,]+,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)', code):
        add('Never lets the answer fall below %s or rise above %s.' % (_num(m.group(1)), _num(m.group(2))))
    for m in re.finditer(r'Math\.(min|max)\(\s*([A-Za-z_][A-Za-z0-9_.]*)\s*,\s*(-?[\d.]+)\s*\)', code):
        add(('Caps %s at %s.' if m.group(1) == 'min' else 'Never lets %s fall below %s.')
            % (_words(m.group(2).split('.')[-1]), _num(m.group(3))))
    # the same caps written number-first: Math.min(0.15, rate) — the undeclared caps of G35
    for m in re.finditer(r'Math\.(min|max)\(\s*(-?[\d.]+)\s*,\s*([A-Za-z_][A-Za-z0-9_.\[\]]*)\s*\)', code):
        if m.group(3).startswith('Math'): continue
        add(('Caps %s at %s.' if m.group(1) == 'min' else 'Never lets %s fall below %s.')
            % (_words(m.group(3).split('.')[-1]), _num(m.group(2))))

    # rounding and what is left out — a bare Math.round with no scale is a whole number
    if re.search(r'Math\.round', code_no_round) and not places_seen: add('Rounds the answer to a whole number.')
    for m in re.finditer(r'toFixed\((\d)\)', code):
        add('Shows %s decimal place%s.' % (m.group(1), '' if m.group(1) == '1' else 's'))
    return found

def strip_comments(body):
    """Assumptions must be read from the code, not from what someone wrote about it."""
    body = re.sub(r'/\*.*?\*/', ' ', body, flags=re.S)
    return '\n'.join(re.sub(r'//.*$', '', l) for l in body.split('\n'))

def collect():
    funcs = {}
    for root in CALC_ROOTS:
        for dirpath, _, files in os.walk(root):
            if '__tests__' in dirpath: continue
            for f in files:
                if not f.endswith('.ts') or f.endswith('.test.ts') or f.endswith('.d.ts'): continue
                fp = os.path.join(dirpath, f)
                for name, line, sig, body, note in bodies(fp):
                    funcs.setdefault(name, {'file': fp, 'line': line, 'sig': sig, 'body': body, 'note': note})
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
    # MoneyKeel/functions/<domain> — new code lives here, and the folder IS the family. Added
    # 2026-08-27: without these the first twenty functions written there all fell to the XS
    # default, which says "shown on more than one parent screen" and was true of none of them.
    ('MoneyKeel/functions/cashflow','CF'),
    ('MoneyKeel/functions/networth-and-performance','NW'),
    ('MoneyKeel/functions/retirement','PL'),
    ('MoneyKeel/functions/home-screen','HM'),
    ('MoneyKeel/functions/standards','ST'),
    ('MoneyKeel/functions/other','XS'),
]

def family_of(path):
    for prefix, fam in FAMILY_BY_PATH:
        if path.startswith(prefix): return fam
    return 'XS'

REGISTER = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        'moneykeel_function_register.json')


def _register():
    """The identifiers already given out. Read, never recomputed."""
    import json
    if not os.path.exists(REGISTER):
        return {}, {}
    d = json.load(open(REGISTER))
    return dict(d.get('issued', {})), dict(d.get('highest', {}))



def _is_orchestrator(path, line):
    """True when the author's own note above this function calls it an ORCHESTRATOR.

    The marker is written by hand in a /** */ block, not by the header generator, so it survives
    _without_headers() and cannot be a printed header read back as an author's note. A fixed line
    window would be wrong two ways — the generated header sitting between the marker and the
    function pushes them 20 lines apart, and a wide window would hand the previous function's
    marker to this one. So: find the nearest ORCHESTRATOR line above, and only believe it if no
    other function is declared between it and this one.
    """
    try:
        text = open(path).read().split('\n')
    except OSError:
        return False
    mark = None
    for i in range(line - 2, -1, -1):
        if 'ORCHESTRATOR' in text[i]:
            mark = i
            break
        if re.match(r'(?:export )?(?:async )?function [A-Za-z0-9_]+', text[i]):
            return False
    return mark is not None


def _record_rename(was, now):
    """The register remembers that a name was renamed, so the next save does not resurrect it."""
    import json
    old = json.load(open(REGISTER)) if os.path.exists(REGISTER) else {}
    r = dict(old.get('renamed', {}))
    r.setdefault(was, now)
    old['renamed'] = r
    json.dump(old, open(REGISTER, 'w'), indent=1, sort_keys=True)


def _retire(number, why):
    """A number issued by mistake is RETIRED, never reused — the register's own note says so, and the
    reason is kept with it so the history reads."""
    import json
    old = json.load(open(REGISTER)) if os.path.exists(REGISTER) else {}
    ret = dict(old.get('retired', {}))
    ret.setdefault(number, why)
    old['retired'] = ret
    json.dump(old, open(REGISTER, 'w'), indent=1, sort_keys=True)


def _save_register(ident, hi):
    """A number is never reused, so the highest ever issued is kept even if a function is deleted."""
    import json
    old = json.load(open(REGISTER)) if os.path.exists(REGISTER) else {}
    merged_hi = dict(old.get('highest', {}))
    for f, n in hi.items():
        merged_hi[f] = max(merged_hi.get(f, 0), n)
    # Carry EVERYTHING the register already held. Listing the keys to keep meant a key nobody
    # listed was silently dropped — which is what happened to the `retired` record on 2026-08-27,
    # minutes after it was written. A save that quietly loses what it did not expect is the same
    # failure as a build that quietly loses an answer.
    out = dict(old)
    merged = {**old.get('issued', {}), **ident}
    # A RENAMED NAME IS GONE (2026-09-28). The merge above carries everything the register held, which
    # is right for a deletion — a number is never reused — but wrong for a rename: it brought the old
    # name back, so `spending` and `expenses` both held MK-CF-O-002 and two names claimed one number.
    # A name the caller has dropped ON PURPOSE, because it was renamed, is dropped here too; the
    # number is not freed, it simply moved with its function.
    for gone in (old.get('renamed', {}) or {}):
        merged.pop(gone, None)
    out['issued'] = dict(sorted(merged.items()))
    out['highest'] = merged_hi
    json.dump(out, open(REGISTER, 'w'), indent=1, sort_keys=True)


def with_ids_and_chains(rows=None, funcs=None):
    """Give every function an identifier, then write the chain of what it depends on."""
    rows = rows or categorise()
    funcs = funcs or collect()
    counters = {}
    # AN IDENTIFIER IS GIVEN ONCE AND NEVER CHANGES (identifier standard, rule 1).
    # Until 2026-08-26 these were assigned by POSITION in a sorted list, so adding one function
    # renumbered every function after it — the identifiers were never identifiers at all. They are
    # now read from a register on disk. A name already in it keeps its number wherever it moves;
    # only a genuinely new name is issued the next free number in its family.
    ident, hi = _register()
    # A RENAME IS THE SAME FUNCTION (2026-09-28). The register is keyed by NAME, so renaming a
    # function looked like a brand-new one: `spending` → `expenses` kept MK-CF-O-002 on the dead name
    # and issued MK-CF-O-009 to the live one, and `theCushion` → `theEmergencyFund` did the same. That
    # breaks rule 1 in the direction that matters — the identifier is supposed to follow the FUNCTION,
    # not the string. A rename is recorded here, once, and the number follows it; the old name is
    # struck from `issued` so nothing carries two.
    RENAMED = {
        'spending': 'expenses',            # canon row 3: "spending" is retired everywhere (2026-09-12)
        'theCushion': 'theEmergencyFund',  # same canon: the concept is the Emergency fund
        # DEC-5068 (2026-10-13): the sentence no longer refuses the beginning; it says which holding is left out
        'cannotWorkBackSentence': 'notIncludedSentence',
    }
    renamed_any = False
    for was, now in RENAMED.items():
        if was in ident and now not in ident:
            ident[now] = ident.pop(was); _record_rename(was, now); renamed_any = True
        elif was in ident and now in ident:
            # both exist: the new name was issued its own number before the rename was recorded.
            # The OLD number wins (it is the one every document already cites) and the number the
            # rename accidentally minted is retired, never reused.
            stray = ident.pop(now)
            ident[now] = ident.pop(was)
            _retire(stray, f'issued to {now} before the rename from {was} was recorded; {was} already held {ident[now]}')
            _record_rename(was, now)
            renamed_any = True
    issued = renamed_any
    for r in sorted(rows, key=lambda x: (family_of(x['file']), x['file'], x['line'])):
        if r['name'] in ident:
            continue
        fam = family_of(r['file'])
        # An ORCHESTRATOR is type O, not F (founder ruling, 2026-08-27): the one function a screen
        # calls, so it should be identifiable as one at a glance without opening the file. O runs on
        # its own counter per family, so MK-CF-O-001 and MK-CF-F-001 are two different functions and
        # neither number is ever silently reused as the other.
        typ = 'O' if _is_orchestrator(r['file'], r['line']) else 'F'
        key = fam if typ == 'F' else fam + '-O'
        hi[key] = hi.get(key, 0) + 1
        ident[r['name']] = 'MK-%s-%s-%03d' % (fam, typ, hi[key])
        issued = True
    if issued:
        _save_register(ident, hi)
    names = set(funcs)
    _calls_cache = {}

    def calls(n):
        """Who this function calls. Memoised: it is asked the same question thousands of times
        while the chains are built, and a fresh regex sweep each time is what made the widened
        build hang."""
        if n in _calls_cache:
            return _calls_cache[n]
        body = funcs[n]['body'] if n in funcs else ''
        called = {x for x in re.findall(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\(', body)}
        # a function handed to another as a callback — sumOverEarners(op, wageMatchMonthly) — is a
        # call too; the old regex saw only `name(` and lost every such link (2026-09-09, G28)
        passed = {x for x in re.findall(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*(?=[,)])', body)}
        out = [m for m in sorted({x for x in (called | passed) if x in names and x != n})]
        _calls_cache[n] = out
        return out
    # Only the first handful of paths is ever printed, so stop once there are enough. Without the
    # cap this is exponential in the fan-out, and widening the sweep to module-private helpers on
    # 2026-08-26 raised that fan-out enough to hang the build.
    CAP = 12

    def chains(n, seen=(), depth=0):
        kids = calls(n)
        if not kids or depth >= 5:
            return [[n]]
        out = []
        for k in kids:
            if len(out) >= CAP:
                out.append([n, '… more paths below this one, not printed'])
                break
            if k in seen:
                out.append([n, k + ' (already above — a loop)'])
                continue
            for tail in chains(k, seen + (n,), depth + 1):
                out.append([n] + tail)
                if len(out) >= CAP:
                    break
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
        if r['name'] in getattr(_cf, 'CATEGORY_OVERRIDES', {}):   # C4: a category read by hand outranks the sweep
            r['category'] = _cf.CATEGORY_OVERRIDES[r['name']]
        r['inputs'], r['output'] = signature_parts(funcs[r['name']]['sig'], funcs[r['name']]['body'])
        note = (funcs[r['name']].get('note') or '').strip()
        if note:
            first = re.split(r'(?<=[.?!])\s', note)[0].strip()
            r['purpose'] = first if len(first) > 12 else note[:220]
        else:
            r['purpose'] = ''
        _fm, _fw = _cf.formula(r['name'], funcs[r['name']]['sig'], funcs[r['name']]['body'], r['category'])
        if r['name'] in _cf.OVERRIDES:
            _fm, _fw = _cf.OVERRIDES[r['name']]
            r['read_as'] = 'READ BY HAND 2026-08-26 — checked line by line against the code'
        elif _fm.startswith('NOT READ YET'):
            r['read_as'] = 'NOT READ — nothing is claimed rather than something guessed'
        elif _fm.startswith(('It reaches outside', 'It records')):
            r['read_as'] = 'NO ARITHMETIC — there is no formula to state'
        elif '[LOOP' in _fm:
            r['read_as'] = 'PARTLY READ — the body has a loop the extractor cannot render; the steps shown are the ones before it. Needs a hand pass (G23).'
        elif _CODEY.search(_fm):
            r['read_as'] = 'PARTLY READ — some of the code is still showing through; needs a hand pass'
        else:
            r['read_as'] = 'READ FROM THE CODE — rendered from the expressions the function runs'
        r['formula_math'], r['formula_words'] = _cf.canon(_fm), _cf.canon(_fw)   # G34: the same words in the file and in the header
        found = assumptions_in(funcs[r['name']]['body'])
        # lines read by hand for this function — rulings, sources, conventions the sweep cannot see
        for extra in getattr(_cf, 'ASSUMPTIONS_EXTRA', {}).get(r['name'], []):
            if extra not in found: found.append(extra)
        for drop in getattr(_cf, 'ASSUMPTIONS_DROP', {}).get(r['name'], []):
            found = [x for x in found if not x.startswith(drop)]
        r['assumptions'] = ('\n'.join('· ' + f for f in found) if found else
                            'None found in this function — anything it assumes comes from the functions it depends on.')
        r['screen_labels'] = (' · '.join(sorted(labels.get(r['name'], []))[:6])
                              if r['name'] in labels else
                              ('NOT FOUND — a screen calls it, but the words printed beside its answer could not be traced automatically. Needs reading.'
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
