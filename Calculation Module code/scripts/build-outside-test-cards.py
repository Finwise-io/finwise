#!/usr/bin/env python3
"""THE PACK AN OUTSIDE MODEL IS GIVEN TO WRITE TEST CASES FROM — one card per function.

Why this exists (founder, 2026-10-04): the functions passed every test I wrote and five were still
wrong, because the tests came from the same understanding as the code. The cases have to come from
outside. This prints what an outside model needs to write them — what each function is FOR, what it
is handed, the figures it feeds, the rules it must follow, and THE FORMULA IN WORDS: how the function
gets its answer, every number included, so the outside model can judge whether that is the right way
and work its expected answers by hand. Never the code itself, and never an answer the app gives.

The formula in words (founder, 2026-10-04: "How outside AI will even test it if you do not give them
the rule?") lives in moneykeel_function_rules.json, one entry a function, written by reading the
function. Each entry carries a fingerprint of the function it was read from; when the function
changes the fingerprint no longer matches and this build STOPS until the rule is read again:

    python3 "Calculation Module code/scripts/build-outside-test-cards.py" --reread MK-CF-F-146

THE PACK AS SENT IS NOT REWRITTEN IN PASSING. He feeds the files to the outside models by hand, so a
file that changed under him would be answered against a formula he never sent. The build gate runs
this with --check (every validation, nothing written). Each rule keeps `sent_as`, the fingerprint of
its function when its card went out; a function that has moved since is listed on every run, and
--supplement writes those cards, and only those, to a file of their own to send after the rest.

    python3 "Calculation Module code/scripts/build-outside-test-cards.py" --check
    python3 "Calculation Module code/scripts/build-outside-test-cards.py" --supplement

Read from the code and the records on every run; nothing here is typed from memory except the
approved-drawing households, whose sums are re-checked below, and the rules, whose numbers are traced
back to the code below.

    python3 "Calculation Module code/scripts/build-outside-test-cards.py"
"""
import collections
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'MoneyKeel', 'documents', 'audit', 'outside-test-cases')
BRIEF = os.path.join(OUT, 'moneykeel_audit_brief_outside-test-cases_v03.md')
CODE_ROOTS = ['src', 'MoneyKeel/functions', 'Calculation Module code/engines']
FAMILIES = ('NW', 'PF', 'CF')                      # the three modules of this build (his scope, 2026-10-03)
PER_BATCH = {'orchestrator': 6, 'function': 15}    # a reply is five cases a card; these keep it inside one answer

RULES = os.path.join(HERE, 'moneykeel_function_rules.json')

J = lambda name: json.load(open(os.path.join(HERE, name), encoding='utf8'))

# ── the approved-drawing households: owner-approved numbers that add up on the page ─────────────
# Typed from the drawings; every sum is re-checked here, so a slip stops the build (briefs are code).
DRAWINGS = {
    'MK-NW-O-003': {
        'drawing': 'Net worth, Quiet Instrument v08, state A (approved 2026-09-14)',
        'household': 'Chase Checking $8,000 (a bank account). Vanguard Brokerage $349,333, of which $838 is uninvested cash and '
                     '$348,495 is stocks and funds. E*TRADE bonds and CDs $5,819. Home $450,000. '
                     'Debts: home mortgage $412,000, Chase Visa $6,000.',
        'drawn': {'Cash': 8838, 'Investments': 354314, 'Personal property': 450000, 'What you own': 813152,
                  'Debts': 418000, 'Net worth': 395152},
        'checks': [(8000 + 838, 8838), (348495 + 5819, 354314), (8838 + 354314 + 450000, 813152),
                   (412000 + 6000, 418000), (813152 - 418000, 395152)],
    },
    'MK-NW-O-008': {
        'drawing': 'Performance v17, phone 1 (approved 2026-10-01)',
        'household': 'Two linked accounts, record beginning Oct 1, 2025, read on Sep 30, 2026. All accounts: beginning market value '
                     '$100,000; contributions $15,000; withdrawals $0; dividends $1,800; interest $400; change in investment value '
                     '$5,800. Vanguard alone: beginning $80,000, contributions $15,000, wealth generated $6,000, ending $101,000. '
                     'E*TRADE alone: beginning $20,000, nothing added or taken out, wealth generated $2,000, ending $22,000.',
        'drawn': {'Wealth generated, all accounts': 8000, 'Ending market value, all accounts': 123000,
                  'E*TRADE return': '+10.00%',
                  'note': 'The drawing shows a yearly rate of 7.46% for all accounts and 6.88% for Vanguard, but does not give the '
                          'dates the $15,000 went in, so those two rates cannot be used as expected values.'},
        'checks': [(1800 + 400 + 5800, 8000), (100000 + 15000 - 0 + 8000, 123000), (80000 + 15000 + 6000, 101000),
                   (20000 + 2000, 22000), (101000 + 22000, 123000), (round(2000 / 20000 * 100, 2), 10.00)],
    },
    'MK-CF-O-001': {
        'drawing': 'Income end to end v07, frame 3 (approved 2026-09-02)',
        'household': 'Two wages, $138,000 a year together, so $11,500 gross in a month. Calculated federal tax $1,058 in the month. '
                     '401(k) contributions $1,200 in the month. No take-home entered by either earner.',
        'drawn': {'Take-home, household': 9242},
        'checks': [(138000 / 12, 11500), (11500 - 1058 - 1200, 9242)],
    },
    'MK-CF-O-002': {
        'drawing': 'Cash flow v01, frame C (approved 2026-09-28)',
        'household': 'Mortgage $2,000 and car loan $250, the same every month. Planned expenses: Gas $200, Grocery $900, '
                     'Utilities $200, Other $700. Spent so far: $500 entered by hand over 9 items, $1,200 imported from a card over '
                     '23 purchases. Paid this month and entered on the Debts tab: HELOC $200, credit card $200.',
        'drawn': {'Monthly recurring expenses': 2250, 'Planned expenses': 2000, 'Actual expenses, all sources': 2100},
        'checks': [(2000 + 250, 2250), (200 + 900 + 200 + 700, 2000), (500 + 1200 + 200 + 200, 2100)],
    },
    'MK-CF-O-004': {
        'drawing': 'Income end to end v07, frame 16 (approved 2026-09-02)',
        'household': 'Earner 1 entered a take-home of $5,000 in a month; gross $84,000 a year. Earner 2 entered $3,300; gross '
                     '$54,000 a year. Rent $1,800 a month with $600 of running costs. Interest and dividends $3,000 a year, left '
                     'where they are earned. Bonus $12,000, paid in December.',
        'drawn': {'Take-home in a usual month': 9500, 'What the year is taxed on': 167400},
        'checks': [(1800 - 600, 1200), (5000 + 3300 + 1200, 9500), (84000 + 54000 + 14400 + 3000 + 12000, 167400)],
    },
    'MK-CF-O-010': {
        'drawing': 'Cash flow v01, frame A (approved 2026-09-28)',
        'household': 'Take-home $5,000. Mortgage $2,000 and car loan $250 (the same every month). Budget for expenses $2,000. '
                     'HELOC payment $200 and credit card payment $200. So far this month: the mortgage is paid, the car loan is '
                     'not (due the 28th), $500 of expenses entered by hand, $1,200 imported from a card, and the HELOC and card '
                     'payments are made.',
        'drawn': {'Planned surplus': 350, 'Actual surplus so far': 900},
        'checks': [(5000 - 2000 - 250 - 2000 - 200 - 200, 350), (5000 - 2000 - 0 - 500 - 1200 - 200 - 200, 900)],
    },
    'MK-CF-O-018': {
        'drawing': 'Cash flow v01, frame for the Debts tab (approved 2026-09-28)',
        'household': 'Visa card $3,200 owed at 22.90%. Car loan $9,800 owed at 6.40%. Together they stood at $17,100 at the '
                     'first month-end recorded this year.',
        'drawn': {'Your debt': 13000, 'Paid down since January': 4100, 'Share of where you started': '24%'},
        'checks': [(3200 + 9800, 13000), (17100 - 13000, 4100), (round(4100 / 17100 * 100), 24)],
    },
}
DRAWINGS['MK-CF-O-003'] = DRAWINGS['MK-CF-O-010']   # the same month, asked of the function underneath


def live_headers():
    """Every function record in the three modules, read from the code: the record sits directly above
    its function, so the declaration that follows it is the function it describes."""
    out = []
    files = 0
    for root in CODE_ROOTS:
        for dp, _dn, fn in os.walk(os.path.join(ROOT, root)):
            if 'node_modules' in dp:
                continue
            for f in sorted(fn):
                if not f.endswith(('.ts', '.tsx')) or '.test.' in f:
                    continue
                files += 1
                path = os.path.join(dp, f)
                lines = open(path, encoding='utf8').read().split('\n')
                i = 0
                while i < len(lines):
                    m = re.match(r'^/\* ─ (MK-([A-Z]{2})-([FO])-\d{3}) ─.*?([123] · [A-Z]+)', lines[i])
                    if not m or m.group(2) not in FAMILIES:
                        i += 1
                        continue
                    j = i
                    while not lines[j].strip().endswith('*/'):
                        j += 1
                    k = j + 1
                    while k < len(lines) and lines[k].strip() == '':
                        k += 1
                    out.append({'id': m.group(1), 'family': m.group(2), 'category': m.group(4),
                                'name': lines[i + 1].lstrip(' *').strip(), 'path': os.path.relpath(path, ROOT),
                                'header': lines[i:j + 1], 'decl_at': k, 'lines': lines})
                    i = j + 1
    return out, files


def field(header, name):
    """One field of a record, with its continuation lines, as one string."""
    text, on = [], False
    for ln in header:
        m = re.match(r'^ \* ([A-Z][A-Za-z ]+?) \.{3,} ?(.*)$', ln)
        if m:
            on = m.group(1).strip() == name
            if on:
                text.append(m.group(2))
        elif on:
            if ln.strip() in ('*', '*/'):
                on = False
            else:
                text.append(ln.lstrip(' *').strip())
    return ' '.join(t for t in text if t).strip()


def _close(text, i, open_ch, close_ch):
    """Index of the bracket that closes the one at i."""
    depth = 0
    for k in range(i, len(text)):
        if text[k] == open_ch:
            depth += 1
        elif text[k] == close_ch:
            depth -= 1
            if depth == 0:
                return k
    return len(text) - 1


def signature(lines, at):
    """What the function is handed and gives back — its declaration, and NOT ONE CHARACTER of its body.

    The first version of this cut at the first line ending in "{" and so printed the bodies of every
    one-line function and of every function whose return type is written as { … } — 25 cards carried
    the code the outside model must never see. It is parsed properly now: the parameters by matching
    brackets, then the return type, where a "{" that follows a finished type is the body and one that
    starts a type is part of it.
    """
    text = '\n'.join(lines[at:at + 70])
    m = (re.match(r'(?:export )?(?:default )?(?:async )?function\s+[A-Za-z0-9_]+\s*(?:<[^>(]*>)?\s*\(', text)
         or re.match(r'(?:export )?const\s+[A-Za-z0-9_]+\s*(?::[^=]+)?=\s*(?:async\s*)?(?:<[^>(]*>)?\s*\(', text))
    if not m:
        return text.split('\n')[0].split('=')[0].strip()
    arrow = ' function' not in ' ' + text[:m.end()]
    close = _close(text, m.end() - 1, '(', ')')
    head, rest = text[:close + 1], text[close + 1:]
    k = 0
    while k < len(rest) and rest[k] in ' \t\n':
        k += 1
    out = ''
    if k < len(rest) and rest[k] == ':':
        last, j = ':', k + 1
        while j < len(rest):
            ch = rest[j]
            if arrow and rest[j:j + 2] == '=>':
                break
            if ch == '{':
                if last in ':|&,<([':            # a "{" that STARTS a type: an object type — take it whole
                    e = _close(rest, j, '{', '}')
                    j, last = e + 1, '}'
                    continue
                break                             # a "{" after a finished type: the body
            if ch in '(<[':
                closer = {'(': ')', '<': '>', '[': ']'}[ch]
                e = _close(rest, j, ch, closer)
                j, last = e + 1, closer
                continue
            if ch == ';' or (arrow and ch == '=' and rest[j:j + 2] != '=>'):
                break
            if not ch.isspace():
                last = ch
            j += 1
        out = rest[k:j].rstrip()
    return (head + out).strip()


BUILTIN = {'Date', 'Set', 'Map', 'Record', 'Promise', 'Array', 'Pick', 'Omit', 'Partial', 'String', 'Number', 'Boolean',
           'ReturnType', 'Readonly', 'Required', 'Math', 'Object', 'Dec'}


def types_named(sig, lines):
    """The app's own types a declaration names, spelled out where this file defines them — the type
    and nothing after it (the first version ran on into the function that followed)."""
    out = {}
    text = '\n'.join(lines)
    for t in sorted(set(re.findall(r'\b([A-Z][A-Za-z0-9]{2,})\b', sig)) - BUILTIN):
        m = re.search(r'^(?:export )?interface ' + t + r'\b[^{]*\{', text, re.M)
        if m:
            body = text[m.start():_close(text, m.end() - 1, '{', '}') + 1]
        else:
            m = re.search(r'^(?:export )?type ' + t + r'\s*=', text, re.M)
            if not m:
                continue
            j, depth = m.end(), 0
            while j < len(text) and not (text[j] == ';' and depth == 0):
                depth += text[j] in '{(<['
                depth -= text[j] in '})>]'
                j += 1
            body = text[m.start():j + 1]
        body = re.sub(r'/\* ─ MK-[\s\S]*?\*/\n?', '', body)
        out[t] = '\n'.join(body.split('\n')[:45])
    return out


def body_of(lines, at):
    """The whole of one function, comments removed — used ONLY for its fingerprint and to trace the
    numbers in its rule. It never goes on a card (the leak check below would stop the build).

    Read character by character, because a function ends where its brackets close and an apostrophe
    in a comment or a "}" in a string must not be mistaken for code."""
    text = '\n'.join(lines[at:at + 400])
    out, depth, i, seen = [], 0, 0, False
    stack = []                       # where we are: a quote character, or the bracket depth a ${ opened at
    while i < len(text):
        ch, two = text[i], text[i:i + 2]
        mode = stack[-1] if stack and isinstance(stack[-1], str) else ''
        if mode in ('"', "'"):
            if ch == '\\':
                out.append(two); i += 2; continue
            if ch == mode or ch == '\n':
                stack.pop()
        elif mode == '`':
            if ch == '\\':
                out.append(two); i += 2; continue
            if ch == '`':
                stack.pop()
            elif two == '${':
                stack.append(depth)
                out.append(two); i += 2; continue
        else:
            if two == '/*':
                e = text.find('*/', i + 2)
                i = len(text) if e == -1 else e + 2
                continue
            if two == '//':
                e = text.find('\n', i)
                i = len(text) if e == -1 else e
                continue
            if ch in '\'"`':
                stack.append(ch)
            elif ch in '({[':
                depth += 1
                seen = True
            elif ch in ')}]':
                if ch == '}' and stack and stack[-1] == depth:      # the } that closes a ${ in a template
                    stack.pop()
                    out.append(ch); i += 1; continue
                depth -= 1
                if depth == 0 and ch == '}':
                    rest = text[i + 1:].lstrip()
                    if rest[:1] not in ('{', '>', '|', '&', '[', ',', ')') and not rest.startswith('=>'):
                        out.append(ch)
                        break
            elif ch == ';' and depth == 0 and seen:
                out.append(ch)
                break
        out.append(ch)
        i += 1
    return '\n'.join(l.rstrip() for l in ''.join(out).split('\n') if l.strip())


def fingerprint(body):
    return hashlib.sha1(body.encode('utf8')).hexdigest()[:10]


_CONST = {}
_FUNC = {}


def constants_named(body, file_text):
    """The value of every NAMED_CONSTANT a function uses, so a number in its rule can be traced to it."""
    if not _CONST:
        for root in CODE_ROOTS:
            for dp, _dn, fn in os.walk(os.path.join(ROOT, root)):
                if 'node_modules' in dp or '__tests__' in dp:
                    continue
                for f in fn:
                    if f.endswith(('.ts', '.tsx')) and '.test.' not in f:
                        t = open(os.path.join(dp, f), encoding='utf8').read()
                        for m in re.finditer(r'^(?:export )?const ([A-Z][A-Za-z0-9_]{2,})\b[^=\n]*=', t, re.M):
                            j, depth = m.end(), 0
                            while j < len(t) and not (t[j] == ';' and depth == 0) and j - m.end() < 4000:
                                depth += t[j] in '{(['
                                depth -= t[j] in '})]'
                                j += 1
                            _CONST.setdefault(m.group(1), []).append(t[m.end():j])
                        # every function the code declares, so a figure held by a function this one calls is found too
                        lines = t.split('\n')
                        for k, ln in enumerate(lines):
                            m = (re.match(r'(?:export )?(?:default )?(?:async )?function\s+([A-Za-z0-9_]+)', ln)
                                 or re.match(r'(?:export )?const\s+([a-z][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:<[^>(]*>)?\s*\(', ln))
                            if m:
                                _FUNC.setdefault(m.group(1), []).append(body_of(lines, k))
    # only what the function really reaches: a function it CALLS (name followed by a bracket) and a
    # constant it names (a capital first letter) — following every word would find any number anywhere
    words = lambda t: set(re.findall(r'\b([A-Za-z_][A-Za-z0-9_]{2,})\s*\(', t)) | set(re.findall(r'\b[A-Z][A-Za-z0-9_]{2,}\b', t))
    out, todo, done = [], words(body), set()
    while todo:
        n = todo.pop()
        if n in done:
            continue
        done.add(n)
        for v in _CONST.get(n, []) + _FUNC.get(n, []):
            out.append(v)
            todo |= words(v)
    return '\n'.join(out)


FIGURE = re.compile(r'(?<![\w.])\$?(\d[\d,]*(?:\.\d+)?)(%?)')
NOT_FIGURES = re.compile(r'\(\d\)|401\(k\)|\b529\b|\b\d{4}-\d{2}(?:-\d{2})?\b')   # (1) (2) are list marks; 401(k), 529 and a sample date are names


def numbers_not_in_code(rule, code):
    """Every figure a rule states — $184,500, 6.2%, 60%, 2,080 — must be a figure the code holds.
    A percent may sit in the code as a share (60% as 0.6). Returns the ones that could not be found."""
    held = set()
    for n in re.findall(r'\d[\d_]*\.?\d*(?:e-?\d+)?', code):
        n = n.replace('_', '').rstrip('.')
        try:
            held.add(round(float(n), 9))
        except ValueError:
            pass
    missing = []
    for m in re.finditer(FIGURE, NOT_FIGURES.sub(' ', rule)):
        v = float(m.group(1).replace(',', '').rstrip('.'))
        ok = round(v, 9) in held or (m.group(2) and (round(v / 100, 9) in held or round(1 - v / 100, 9) in held))
        if not ok:
            missing.append(m.group(0).rstrip(','))
    return missing


def published_tables():
    """The published 2026 amounts the Cash flow functions use, READ FROM THE CODE so the pack and the
    app cannot say different things — and so the outside model can check them against the source."""
    tax = open(os.path.join(ROOT, 'src/domain/income/tax.ts'), encoding='utf8').read()
    lim = open(os.path.join(ROOT, 'src/domain/income/limits.ts'), encoding='utf8').read()
    pay = open(os.path.join(ROOT, 'MoneyKeel/functions/cashflow/base-pay.ts'), encoding='utf8').read()
    num = lambda x: float('inf') if x == 'Infinity' else float(x.replace('_', ''))
    money = lambda v: f'${v:,.0f}'
    pairs = lambda t: [(num(a), float(b)) for a, b in re.findall(r'\[\s*([\d_]+|Infinity)\s*,\s*([\d.]+)\s*\]', t)]
    year = int(re.search(r'export const TAX_YEAR = (\d+)', tax).group(1))
    single_ded = num(re.search(r'export const STANDARD_DEDUCTION = ([\d_]+)', tax).group(1))
    single = pairs(re.search(r'export const TAX_BRACKETS[^=]*=\s*\[([\s\S]*?)\];', tax).group(1))
    table = re.search(r'export const TAX_TABLES[^=]*=\s*\{([\s\S]*?)\n\};', tax).group(1)
    names = {'single': 'Single', 'married': 'Married filing jointly', 'mfs': 'Married filing separately', 'hoh': 'Head of household'}
    rows = {}
    for key in names:
        m = re.search(key + r':\s*\{([\s\S]*?)\n?\s*\},', table)
        blk = m.group(1)
        br = single if 'TAX_BRACKETS' in blk else pairs(blk)
        ded = single_ded if 'STANDARD_DEDUCTION' in blk else num(re.search(r'deduction:\s*([\d_]+)', blk).group(1))
        add = num(re.search(r'over65Add:\s*([\d_]+)', blk).group(1))
        rows[key] = (br, ded, add)
    assert all(len(r[0]) == 7 for r in rows.values()), 'a tax table did not read as seven bands'
    ltcg = dict((k, (num(a), num(b))) for k, a, b in re.findall(r'(\w+):\s*\[([\d_]+),\s*([\d_]+)\]', re.search(r'const LTCG[^=]*=\s*\{([\s\S]*?)\};', tax).group(1)))
    sd = re.search(r'export const SENIOR_DEDUCTION = \{([\s\S]*?)\} as const', tax).group(1)
    L = dict((k, num(v)) for k, v in re.findall(r'(\w+):\s*([\d_]+)', re.search(r'export const IRS_LIMITS = \{([\s\S]*?)\} as const', lim).group(1)))
    assert len(ltcg) == 4 and len(L) >= 9, 'the gains thresholds or the contribution limits did not read whole'
    wage_base = num(re.search(r'export const SS_WAGE_BASE = ([\d_]+)', pay).group(1))
    medicare = num(re.search(r'export const MEDICARE_ADDITIONAL_THRESHOLD = ([\d_]+)', pay).group(1))
    out = [f'## The published {year} amounts the app uses', '',
           'Read from the app. **Check each against its published source and say so in `formula_checks` when one is wrong.**', '',
           f'**Federal income tax, {year} — each slice of taxable income at its own rate.** Taxable income = income − the deduction.', '',
           '| Filing status | Standard deduction | Added for each person 65 or over | Bands: up to … at … |', '|---|---|---|---|']
    for key, label in names.items():
        br, ded, add = rows[key]
        bands = ' · '.join((f'{money(top)} at {rate * 100:g}%' if top != float('inf') else f'above that at {rate * 100:g}%') for top, rate in br)
        out.append(f'| {label} | {money(ded)} | {money(add)} | {bands} |')
    g = lambda k: num(re.search(k + r':\s*([\d_.]+)', sd).group(1))
    starts = dict((k, num(v)) for k, v in re.findall(r'(\w+):\s*([\d_]+)', re.search(r'phaseOutStart:\s*\{([^}]*)\}', sd).group(1)))
    out += ['',
            f"**Senior deduction, tax years {g('firstYear'):.0f} to {g('lastYear'):.0f}:** {money(g('amount'))} for each person 65 or over, less "
            f"{g('phaseOutRate') * 100:g}% of income above {money(starts['single'])} (single, head of household) or {money(starts['married'])} "
            '(married filing jointly). Not given when married filing separately.', '',
            f'**Long-term capital gains, {year}** — 0% up to the first amount of taxable income, 15% up to the second, 20% above: '
            + ' · '.join(f'{names[k]} {money(ltcg[k][0])} and {money(ltcg[k][1])}' for k in names) + '.', '',
            f"**Contribution limits, {L['year']:.0f}:** 401(k) {money(L['elective_deferral_401k'])}, plus {money(L['catch_up_50'])} at 50 or over, "
            f"or plus {money(L['super_catch_up_60_63'])} instead at ages 60 to 63. IRA {money(L['ira'])}, plus {money(L['ira_catch_up_50'])} at 50 or over. "
            f"HSA {money(L['hsa_self'])} self-only or {money(L['hsa_family'])} family, plus {money(L['hsa_catch_up_55'])} at 55 or over.", '',
            f'**Social Security and Medicare, {year}:** 6.2% of wages up to {money(wage_base)}; 1.45% of all wages; 0.9% more on wages above {money(medicare)}.', '']
    return out


def main():
    headers, files = live_headers()
    rules_file = json.load(open(RULES, encoding='utf8')) if os.path.exists(RULES) else {'rules': {}}
    written = rules_file['rules']
    reread = set(sys.argv[sys.argv.index('--reread') + 1:]) if '--reread' in sys.argv else set()
    figures = J('moneykeel_figures.json')['figures']
    decisions = {r['id']: r for r in J('moneykeel_decisions.json')['rows']}

    # the drawing sums are checked before anything is printed
    for fid, d in DRAWINGS.items():
        for got, want in d['checks']:
            if abs(got - want) > 1e-9:
                sys.exit(f'STOPPED: the approved-drawing household for {fid} does not add up: {got} is not {want}')

    by_door = collections.defaultdict(list)
    for mid, spec in figures.items():
        by_door[str(spec.get('door', '')).split(' ')[0]].append(mid)

    cards, seen = [], set()
    for h in headers:
        if h['id'] in seen:
            sys.exit(f"STOPPED: {h['id']} has two records in the code — remove the stale one first")
        seen.add(h['id'])
        purpose = field(h['header'], 'Answers')
        if not purpose or purpose.startswith('NOT DETERMINED'):
            sys.exit(f"STOPPED: {h['id']} {h['name']} has no written description — an outside model cannot test it")
        sig = signature(h['lines'], h['decl_at'])
        serves = sorted(set(re.findall(r'MK-[A-Z]{2}-M-\d{3}', field(h['header'], 'Serves'))) | set(by_door.get(h['id'], [])))
        ruled = sorted(set(re.findall(r'DEC-\d{4}', field(h['header'], 'Ruled by'))))
        reads = re.findall(r'(MK-[A-Z]{2}-I-\d{3}) ([^M]+?)(?= MK-[A-Z]{2}-I-|$)', field(h['header'], 'Reads'))

        rules = []
        for did in ruled:
            r = decisions.get(did)
            if not r or 'OLD' in str(r.get('in_use', '')) or str(r.get('type')) not in ('RULE', 'VALUE'):
                continue
            rules.append({'said_by': 'owner', 'decision': did, 'date': str(r.get('decided') or ''),
                          'words': str(r.get('his_words') or '').strip()})
        figs = []
        for mid in serves:
            spec = figures.get(mid)
            if not spec:
                continue
            figs.append({'id': mid, 'words_on_screen': spec.get('label'), 'unit': spec.get('unit'),
                         **({'per': spec['per']} if spec.get('per') else {}),
                         'what_it_answers': spec.get('answers'), 'when_it_refuses': spec.get('refusal'),
                         'shown_on': spec.get('screens')})
            for text in spec.get('decisions') or []:
                rules.append({'said_by': 'author', 'about': mid, 'words': text})

        example_only = purpose.startswith('Example only')
        storage_only = 'calculates nothing' in purpose and not example_only
        is_orch = '-O-' in h['id'] and not example_only
        module = ('performance' if h['family'] == 'PF' or os.path.basename(h['path']) in ('performance.ts', 'look-back.ts')
                  or '/performance/' in h['path'] else 'cashflow' if h['family'] == 'CF' else 'networth')
        card = {'id': h['id'], 'name': h['name'], 'kind': 'orchestrator' if is_orch else 'function',
                'what_it_is_for': purpose, 'formula_in_words': (written.get(h['id']) or {}).get('rule', ''), 'handed': sig}
        types = types_named(sig, h['lines'])
        if reads:
            card['inputs_it_reads'] = [f'{i} {n.strip()}' for i, n in reads]
        if figs:
            card['figures_it_feeds'] = figs
        if rules:
            card['rules'] = rules
        if h['id'] in DRAWINGS:
            d = DRAWINGS[h['id']]
            card['approved_drawing'] = {'drawing': d['drawing'], 'household': d['household'], 'drawn': d['drawn']}
        body = body_of(h['lines'], h['decl_at'])
        cards.append({'card': card, 'module': module, 'category': h['category'], 'types': types, 'path': h['path'],
                      'body': body, 'file_text': '\n'.join(h['lines']),
                      'skip': 'an example helper — it runs another function on a worked example' if example_only
                      else 'storage only — it reads or saves and does no arithmetic' if storage_only else ''})

    # ── EVERY CARD CARRIES ITS FORMULA IN WORDS, READ FROM THE FUNCTION AS IT STANDS TODAY ──────────
    testable = [c for c in cards if not c['skip']]
    for c in testable:
        if c['card']['id'] in reread and c['card']['id'] in written:
            written[c['card']['id']]['read_from'] = fingerprint(c['body'])
    if reread:
        json.dump(rules_file, open(RULES, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    no_rule = [c['card']['id'] for c in testable if not c['card']['formula_in_words'].strip()]
    if no_rule:
        sys.exit(f'STOPPED: {len(no_rule)} function(s) have no formula in words in moneykeel_function_rules.json — an outside '
                 f'model cannot judge or test them: {no_rule[:15]}')
    changed = [c['card']['id'] for c in testable if written[c['card']['id']].get('read_from') != fingerprint(c['body'])]
    if changed:
        sys.exit(f'STOPPED: {len(changed)} function(s) have changed since their formula in words was written. Read each one again, '
                 f'correct its entry in moneykeel_function_rules.json, then run with --reread <ids>: {changed[:15]}')
    stale = sorted(set(written) - {c['card']['id'] for c in testable})
    if stale:
        sys.exit(f'STOPPED: {len(stale)} rule(s) are written for a function that is no longer tested or no longer exists: {stale[:15]}')
    for c in testable:
        c['card']['name'] == written[c['card']['id']].get('name') or sys.exit(
            f"STOPPED: the rule for {c['card']['id']} was written for {written[c['card']['id']].get('name')}, and that id is now {c['card']['name']}")
    # every figure a rule states is a figure the code holds (briefs are code); the ones that cannot be
    # traced are listed, and their number may only fall
    figures_stated, untraced = 0, []
    for c in testable:
        rule = c['card']['formula_in_words']
        figures_stated += len(FIGURE.findall(NOT_FIGURES.sub(' ', rule)))
        code = c['body'] + '\n' + constants_named(c['body'], c['file_text'])
        for n in numbers_not_in_code(rule, code):
            if n not in (written[c['card']['id']].get('figures_checked_by_hand') or {}):
                untraced.append(f"{c['card']['id']} {c['card']['name']}: {n}")
    # a figure checked by hand that is a sum or a product says so — "24,500 + 8,000" — and is worked again here
    for c in testable:
        for fig, how in (written[c['card']['id']].get('figures_checked_by_hand') or {}).items():
            m = re.match(r'^\$?([\d,.]+)%? ([+×]) \$?([\d,.]+)%?$', how)
            if m:
                x, y = float(m.group(1).replace(',', '')), float(m.group(3).replace(',', ''))
                got = x + y if m.group(2) == '+' else x * y
                if abs(got - float(fig.strip('$%').replace(',', ''))) > 1e-9:
                    sys.exit(f"STOPPED: {c['card']['id']} states {fig}, checked by hand as {how} — and that comes to {got:g}")
    if untraced:
        sys.exit(f'STOPPED: {len(untraced)} figure(s) stated in a rule are not in the function they describe. Correct the rule, or '
                 'record where the figure comes from under "figures_checked_by_hand" on its entry:\n   ' + '\n   '.join(untraced))
    CODE_IN_WORDS = re.compile(r'=>|===|!==|&&|\|\||\?\.|\?\?|\b\w+\.\w+\(|\bconst \w+ =')
    coded = [c['card']['id'] for c in testable if CODE_IN_WORDS.search(c['card']['formula_in_words'])]
    if coded:
        sys.exit(f'STOPPED: {len(coded)} rule(s) are written in code, not in words: {coded[:15]}')
    for c in cards:
        if c['skip']:
            c['card'].pop('formula_in_words', None)

    # a formula names the functions it leans on; each name must be a real function, and its own formula
    # travels with the batch so no card depends on one the reader was not given
    by_name = collections.defaultdict(list)
    for c in testable:
        by_name[c['card']['name']].append(c)

    def leans_on(c):
        rule = c['card']['formula_in_words']
        named = set(re.findall(r'\b[a-z][a-z0-9]*[A-Z]\w*\b', rule))
        for inside in re.findall(r'\(([^()]*)\)', rule):
            named |= {w for w in re.findall(r'[A-Za-z_]\w*', inside) if w in by_name and w.islower() and inside.strip() == w}
        return named - {c['card']['name']}

    unknown = sorted({f"{c['card']['id']}: {n}" for c in testable for n in leans_on(c) if n not in by_name})
    if unknown:
        sys.exit(f'STOPPED: {len(unknown)} formula(s) name a function that is not among the tested ones:\n   ' + '\n   '.join(unknown))

    def nearest(name, c):
        same = [x for x in by_name[name] if x['path'] == c['path']] or [x for x in by_name[name] if x['module'] == c['module']]
        return (same or by_name[name])[0]

    def appendix(batch):
        mine, out, todo = {c['card']['id'] for c in batch}, {}, [(n, c) for c in batch for n in leans_on(c)]
        while todo:
            name, frm = todo.pop()
            x = nearest(name, frm)
            if x['card']['id'] in mine or x['card']['id'] in out:
                continue
            out[x['card']['id']] = {'id': x['card']['id'], 'name': name, 'what_it_is_for': x['card']['what_it_is_for'],
                                    'formula_in_words': x['card']['formula_in_words']}
            todo += [(n, x) for n in leans_on(x)]
        return [out[k] for k in sorted(out)]

    # NOTHING OF THE CODE ITSELF MAY LEAVE: a card that carries a statement of code stops the build
    # (a STATEMENT of code — "return" as a word is everywhere in a finance app's comments)
    STATEMENT = re.compile(r'^\s*(return\b|if \(|for \(|while \(|const \w+ =|let \w+ =)|\bfunction \w+\(.*\)\s*\{\s*\S', re.M)
    leaked = [c['card']['id'] for c in cards
              if STATEMENT.search('\n'.join(c['card']['handed'].split('\n')[1:]))
              or re.search(r'\{\s*return\b|=>\s*\S', c['card']['handed'].split('\n')[-1][-40:] if c['card']['handed'].endswith(';') else '')
              or any(STATEMENT.search(v) for v in c['types'].values())]
    if leaked:
        sys.exit(f'STOPPED: {len(leaked)} card(s) carry code from inside a function: {leaked[:12]}')

    # the guard proves it looked
    ids = collections.Counter(c['card']['id'][3:5] + '-' + c['card']['id'][6] for c in cards)
    assert len(cards) >= 350, f'only {len(cards)} records found in the three modules — the reader has gone blind'

    send_dir = os.path.join(OUT, 'to-send')
    brief = open(BRIEF, encoding='utf8').read().rstrip()
    tables = published_tables()

    # what has moved since the pack went out — printed on every run, sent again in a file of its own
    moved = [c for c in testable if written[c['card']['id']].get('sent_as') != written[c['card']['id']]['read_from']]
    if moved:
        print(f'changed since the pack was sent ({rules_file.get("pack_sent", {}).get("commit", "not recorded")}): {len(moved)} — '
              + ', '.join(f"{c['card']['id']} {c['card']['name']}" for c in moved))
    else:
        print('changed since the pack was sent: none')
    if '--supplement' in sys.argv:
        if not moved:
            sys.exit('nothing has changed since the pack was sent — no supplement to write')
        lean = appendix(moved)
        body = [brief, '', '---', '', '# The cards — batch "changed since sent 01"', '',
                f'{len(moved)} cards, so {len(moved)} formula checks and {len(moved) * 5} cases. Put `"batch": "changed since sent 01"` in your reply.', '',
                'These functions were corrected after their cards first went out. The formula below is the one in the app now; '
                'judge and test it as you would any other.', ''] + tables
        types = {}
        for c in moved:
            types.update(c['types'])
        if types:
            body += ['## The app\'s own types these cards name', '', 'What each is made of. The comments inside are the in-house author\'s.', '',
                     '```ts', '\n\n'.join(types[t] for t in sorted(types)), '```', '']
        body += ['## The cards', '', '```json', json.dumps([c['card'] for c in moved], indent=1, ensure_ascii=False), '```', '']
        if lean:
            body += ['## Formulas these cards lean on', '',
                     f'{len(lean)} functions named by the formulas above. They are here so you can work your answers. Do not judge or test them in this batch.', '',
                     '```json', json.dumps(lean, indent=1, ensure_ascii=False), '```', '']
        name = 'moneykeel_audit_cards_changed-since-sent_01.md'
        open(os.path.join(send_dir, name), 'w', encoding='utf8').write('\n'.join(body))
        print(f'supplement written: to-send/{name} — {len(moved)} cards')
        return
    if '--check' in sys.argv:
        print(f'checked, nothing written: {len(testable)} of {len(testable)} cards carry a formula read from the function as it stands · '
              f'{figures_stated} figures stated, each traced to the code or worked by hand')
        return
    os.makedirs(send_dir, exist_ok=True)
    os.makedirs(os.path.join(OUT, 'returned'), exist_ok=True)
    for f in os.listdir(send_dir):
        os.remove(os.path.join(send_dir, f))

    order = {'orchestrator': 0, '2 · DISPLAYED': 1, '3 · DEPENDENT': 2, '1 · ACTION': 3}
    index, total_cards = [], 0
    for module in ('networth', 'performance', 'cashflow'):
        mine = [c for c in cards if c['module'] == module and not c['skip']]
        orch = sorted((c for c in mine if c['card']['kind'] == 'orchestrator'), key=lambda c: c['card']['id'])
        fns = sorted((c for c in mine if c['card']['kind'] == 'function'),
                     key=lambda c: (order.get(c['category'], 9), c['card']['id']))
        batches = [orch[i:i + PER_BATCH['orchestrator']] for i in range(0, len(orch), PER_BATCH['orchestrator'])]
        batches += [fns[i:i + PER_BATCH['function']] for i in range(0, len(fns), PER_BATCH['function'])]
        for n, batch in enumerate(batches, 1):
            name = f'moneykeel_audit_cards_{module}_{n:02d}-of-{len(batches):02d}.md'
            label = f'{module} {n:02d}'
            # a type many cards name is spelled out ONCE for the batch, not on every card that names it
            types = {}
            for c in batch:
                types.update(c['types'])
            body = [brief, '', '---', '', f'# The cards — batch "{label}"', '',
                    f'{len(batch)} cards, so {len(batch)} formula checks and {len(batch) * 5} cases. Put `"batch": "{label}"` in your reply.', '']
            lean = appendix(batch)
            # the published amounts travel with every Cash flow batch, and with any other batch whose formulas use them
            if module == 'cashflow' or any('2026' in x['formula_in_words'] for x in lean + [c['card'] for c in batch]):
                body += tables
            if types:
                body += ['## The app\'s own types these cards name', '',
                         'What each is made of. The comments inside are the in-house author\'s.', '',
                         '```ts', '\n\n'.join(types[t] for t in sorted(types)), '```', '']
            body += ['## The cards', '', '```json', json.dumps([c['card'] for c in batch], indent=1, ensure_ascii=False), '```', '']
            if lean:
                body += ['## Formulas these cards lean on', '',
                         f'{len(lean)} functions named by the formulas above whose own cards are in another batch. '
                         'They are here so you can work your answers. Do not judge or test them in this batch.', '',
                         '```json', json.dumps(lean, indent=1, ensure_ascii=False), '```', '']
            open(os.path.join(send_dir, name), 'w', encoding='utf8').write('\n'.join(body))
            index.append((name, label, batch))
            total_cards += len(batch)

    skipped = [c for c in cards if c['skip']]
    L = ['# Outside test cases — what to send, and what comes back', '',
         'MoneyKeel · calculation audit · built by `Calculation Module code/scripts/build-outside-test-cards.py` — hand edits die', '',
         '## How to use this', '',
         '1. Open a new chat with the model. Paste the whole of one file from `to-send/`. Each file is the brief followed by its cards.',
         '2. Give the same file to the other model in its own new chat. Neither sees the other\'s reply.',
         '3. Save each reply, unchanged, in `returned/` as `<the batch file\'s name>_claude.json` or `…_gemini.json`.', '',
         f'## What is in the pack', '',
         f'- Read from the code: {files} files, {len(cards)} function and orchestrator records in Net worth, Performance and Cash flow.',
         f'- To be judged and tested: **{total_cards} cards in {len(index)} files — {total_cards} formula checks and {total_cards * 5:,} cases from each model.**',
         f'- Every card carries its formula in words: {total_cards} of {total_cards}. Figures stated in those formulas: {figures_stated}, each traced to the function it describes or checked by hand and recorded.',
         f'- Left out, each for a stated reason: {len(skipped)} (listed at the foot).', '',
         '| File | Batch | Cards | Cases | First and last card |', '|---|---|---|---|---|']
    for name, label, batch in index:
        L.append(f"| `{name}` | {label} | {len(batch)} | {len(batch) * 5} | {batch[0]['card']['id']} {batch[0]['card']['name']} … "
                 f"{batch[-1]['card']['id']} {batch[-1]['card']['name']} |")
    L += ['', '## Left out of the pack', '', '| Function | Why no cases are asked for |', '|---|---|']
    for c in sorted(skipped, key=lambda c: c['card']['id']):
        L.append(f"| {c['card']['id']} {c['card']['name']} | {c['skip']} |")
    open(os.path.join(OUT, 'moneykeel_audit_cards_index_v01.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')

    with_owner = sum(1 for c in cards if not c['skip'] and any(r['said_by'] == 'owner' for r in c['card'].get('rules', [])))
    with_any = sum(1 for c in cards if not c['skip'] and c['card'].get('rules'))
    print(f'read {files} files · {len(cards)} records · by family {dict(ids)}')
    print(f'to be tested: {total_cards} cards in {len(index)} files ({total_cards} formula checks and {total_cards * 5} cases from each model)')
    by_hand = sum(len(written[c['card']['id']].get('figures_checked_by_hand') or {}) for c in testable)
    print(f'formula in words: {len(testable)} of {len(testable)} cards · every one read from the function as it stands today · '
          f'{figures_stated} figures stated, {by_hand} of them checked by hand, the rest traced to the code')
    print(f'left out: {len(skipped)} — ' + ', '.join(f'{n} {k}' for k, n in collections.Counter(c["skip"].split(" — ")[0] for c in skipped).items()))
    print(f'cards carrying an owner decision: {with_owner} · carrying any rule: {with_any} · carrying an approved drawing: '
          f'{sum(1 for c in cards if c["card"].get("approved_drawing"))}')
    for module in ('networth', 'performance', 'cashflow'):
        n = sum(len(b) for _n, l, b in index if l.startswith(module))
        print(f'   {module:12s} {n:4d} cards · {sum(1 for _n, l, _b in index if l.startswith(module))} files')


if __name__ == '__main__':
    main()
