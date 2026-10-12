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
import subprocess as _sp
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'MoneyKeel', 'documents', 'audit', 'outside-test-cases')
BRIEF = os.path.join(OUT, 'moneykeel_audit_brief_outside-test-cases_v04.md')
CODE_ROOTS = ['src', 'MoneyKeel/functions', 'Calculation Module code/engines']
FAMILIES = ('NW', 'PF', 'CF')                      # the three modules of this build (his scope, 2026-10-03)
# Engine functions outside those families that an outside judge must still see, each named — never a
# whole prefix. The time-weighted-return engine computes every Performance return (DEC-1669), so its
# three functions get cards (2026-10-10) and travel with the Performance module.
ALSO_CARDED = {'MK-ST-F-080': 'performance', 'MK-ST-F-081': 'performance', 'MK-ST-F-082': 'performance'}
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
                    if not m or (m.group(2) not in FAMILIES and m.group(1) not in ALSO_CARDED):
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


# ── THE CLAUDE CODE EDITION OF A MODULE'S BRIEFS, REBUILT FROM TODAY'S CODE ─────────────────────────
# (2026-10-10) The four Performance briefs he runs in Claude Code were cut from the pack sent at 62d47df.
# Since then the return became time-weighted (DEC-1669) and six functions left the code. This writes the
# four again: the instructions of each old brief word for word (only the date in its header moves), and
# everything after "# The cards" from the cards as they are today. The batch grouping and the notes are
# typed here, so every id they name is checked against today's cards before anything is written.

CC_REMOVED = {'MK-NW-F-102': 'rateWhereItRefuses', 'MK-PF-F-024': 'userFlows', 'MK-PF-F-025': 'historyIsComplete',
              'MK-PF-F-026': 'moneyWeightedReturn', 'MK-PF-F-027': 'isMoneyWeighted', 'MK-PF-F-030': 'npv',
              # removed 2026-10-12 by his approval DEC-4642 ("3,4, 8-approved"): no screen called them
              'MK-PF-F-003': 'avgCost', 'MK-PF-F-016': 'attribution', 'MK-PF-F-017': 'allocation',
              'MK-PF-F-018': 'portfolioTrend', 'MK-PF-F-019': 'portfolioPeriodReturn', 'MK-PF-F-021': 'periodDollarDelta'}

CC_BATCHES = {
    'PF': [
        # 01 — the return and its walk: the orchestrator, the time-weighted-return engine, and the helpers it calls
        ['MK-NW-O-008', 'MK-ST-F-081', 'MK-ST-F-082', 'MK-ST-F-080', 'MK-NW-F-090', 'MK-NW-F-092', 'MK-NW-F-103',
         'MK-NW-F-104', 'MK-NW-F-105', 'MK-NW-F-091', 'MK-NW-F-127', 'MK-NW-F-128', 'MK-NW-F-129', 'MK-NW-F-130'],
        # 02 — one holding: shares, cost, value, gain, and the unit beside its quantity
        ['MK-PF-F-001', 'MK-PF-F-031', 'MK-PF-F-002', 'MK-PF-F-004', 'MK-PF-F-005', 'MK-PF-F-006',
         'MK-PF-F-007', 'MK-PF-F-012', 'MK-PF-F-028', 'MK-PF-F-046', 'MK-PF-F-032', 'MK-PF-F-033'],
        # 03 — the portfolio page: each holding against its yardstick, and the portfolio built from them
        ['MK-PF-F-014', 'MK-PF-F-013', 'MK-PF-F-015', 'MK-PF-F-020', 'MK-NW-F-084'],
        # 04 — prices and period returns, and the look-back that is built on them
        ['MK-NW-O-007', 'MK-PF-F-023', 'MK-PF-F-022', 'MK-PF-F-008', 'MK-PF-F-009', 'MK-PF-F-010', 'MK-PF-F-011',
         'MK-PF-F-029', 'MK-PF-F-034', 'MK-PF-F-045'],
    ],
}

# The notes for each batch, written against today's cards. Every id they name is checked below.
CC_NOTES = {
    'PF': [
        ['- **The return on MK-NW-O-008 is time-weighted** (owner decision Q16, above, and DEC-1669). Q1\'s comparison of the\n'
         '  rate with the money moved at the start and at the end was written for the earlier method; the card no\n'
         '  longer makes that comparison. It refuses instead, in the cases its formula lists, and MK-NW-F-105 writes\n'
         '  the sentence. If you think Q1 should still apply, say so in `why` — do not apply it yourself.',
         '- **Corrected on 2026-10-10:** the line in *Running this in Claude Code* about working out a rate used to tell\n'
         '  you to write a money-weighted solver. That was wrong for this module: every return here is time-weighted\n'
         '  (owner decision Q16, DEC-1669). The line, and the example method named in Job 1, now say so.',
         '- **The time-weighted-return engine is in this batch** (MK-ST-F-081, with MK-ST-F-082 sorting the records into\n'
         '  money moved and MK-ST-F-080 checking dates). MK-NW-O-008 calls it for every return. Its return is a share\n'
         '  over the whole period; MK-NW-O-008 turns it into a yearly rate, (1 + return) to the power 1 ÷ years, − 1,\n'
         '  for a period longer than a year.',
         '- **MK-NW-O-008 lists figures that other functions produce.** Money received by kind and each category\'s\n'
         '  return come from MK-NW-F-084 (batch 3); the market comparison (MK-PF-M-008) and available cash\n'
         '  (MK-PF-M-020) come from functions in other batches. Judge the formula on what it describes; where the\n'
         '  gap matters to a verdict, say so in `why`.',
         '- **The worked-back beginning** (owner decision DEC-3656, 2026-10-09) is on the MK-NW-O-008 card: a\n'
         '  certificate of deposit with a stated rate gains by that rate, and a holding with no price history and no\n'
         '  rate stops the walk with a sentence naming it. MK-NW-F-091 and MK-NW-F-127 to MK-NW-F-130 are the parts.',
         '- **The approved drawing does not name its period or today\'s date.** It gives the record\'s first day\n'
         '  (1 Oct 2025) and the day it was read (30 Sep 2026), but not which period chip is selected. Your\n'
         '  drawing case must use the household exactly as drawn; where the answer depends on the period,\n'
         '  mark it `RULE UNCLEAR` and give each reading — do not pick one.',
         '- **The drawing\'s yearly rates (7.46% for all accounts, 6.88% for Vanguard) cannot be used** as expected\n'
         '  values, because the dates of the $15,000 are not given. A time-weighted return depends on those dates.\n'
         '  The drawing has no per-account split of dividends and interest either. Do not invent either; test only\n'
         '  what the drawing fixes.',
         '- **Owner rules on MK-NW-O-008.** Most are about other screens or about process. Some are cut off\n'
         '  mid-sentence: {cut}. Use only what the words actually say.'],
        ['- **Corrected on 2026-10-10:** the line in *Running this in Claude Code* about working out a rate used to tell\n'
         '  you to write a money-weighted solver. That was wrong for this module: every return here is time-weighted\n'
         '  (owner decision Q16, DEC-1669). The line, and the example method named in Job 1, now say so.',
         '- **This batch is one holding.** costBasis, avgCost, marketValue and capGains all use the contract\n'
         '  multiplier from MK-PF-F-031, which is in this batch. Keep the multiplier consistent across your cases.',
         '- **realizedFromLedger (MK-PF-F-028)** works from buy, opening-position and sale records. Give each record\'s\n'
         '  date, shares and price in `given`.'],
        ['- **Corrected on 2026-10-10:** the line in *Running this in Claude Code* about working out a rate used to tell\n'
         '  you to write a money-weighted solver. That was wrong for this module: every return here is time-weighted\n'
         '  (owner decision Q16, DEC-1669). The line, and the example method named in Job 1, now say so.',
         '- **buildPerformance (MK-PF-F-014) says "from the functions above"** — market value, cost, unrealised gain,\n'
         '  return on cost and earliest purchase date. Those cards are in batch 2; their formulas are printed under\n'
         '  *Formulas these cards lean on*, along with the contract multiplier that costBasis uses.',
         '- **The yardstick in buildPerformance** is measured with periodReturn or periodReturnSince on the\n'
         '  yardstick\'s own price history. Both formulas are printed in this brief.',
         '- **Two ways of averaging holdings\' returns are in this batch:** MK-PF-F-019 and MK-PF-F-020 weight by value\n'
         '  today; MK-NW-F-084 (each category\'s return on the Performance tab) weights by value at the start. Where you\n'
         '  think they should agree, say so in `why` on the card you think is wrong, naming both ids.'],
        ['- **Corrected on 2026-10-10:** the line in *Running this in Claude Code* about working out a rate used to tell\n'
         '  you to write a money-weighted solver. That was wrong for this module: every return here is time-weighted\n'
         '  (owner decision Q16, DEC-1669). The line, and the example method named in Job 1, now say so.',
         '- **MK-PF-F-008 and the period start of MK-NW-F-090 now stop at the month\'s last day** when the month they\n'
         '  land in is shorter (owner decision DEC-3768b): one month before 31 March is 28 February. Use such a date\n'
         '  in at least one case.',
         '- **lookBack (MK-PF-F-023) returns its percent as a percent** — (factor − 1) × 100, at full precision — not\n'
         '  as a decimal. Follow the card and say so in `notes`.',
         '- **The owner rule on MK-NW-O-007 (DEC-0233)** is about layout only.'],
    ],
}

# A formula that leans on other functions without naming them ("from the functions above") cannot be
# followed by appendix(); the ones it means are named here, and travel with the batch the same way.
CC_LEAN_EXTRA = {
    'PF': {3: ['MK-PF-F-002', 'MK-PF-F-004', 'MK-PF-F-005', 'MK-PF-F-007', 'MK-PF-F-009', 'MK-PF-F-010', 'MK-PF-F-011',
               'MK-PF-F-012', 'MK-PF-F-031']},
}

# The owner rules on MK-NW-O-008 whose words stop mid-sentence, read off the card by eye on 2026-10-10.
CC_CUT_OFF = ['DEC-0046', 'DEC-0112', 'DEC-0126', 'DEC-0135', 'DEC-0143', 'DEC-0192', 'DEC-0229', 'DEC-0230']

CC_COMPARE_INTRO = ("Some of this batch's cards compute something another function also computes, in a batch you are not judging. "
                    "Their formulas are printed here so you can check the two agree, as the hunt for \"two formulas that describe the "
                    "same thing differently\" asks. Do not judge or test these; where one disagrees with a card in this batch, the "
                    "finding goes on this batch's card and names both ids.")

CC_COMPARE = {
    'PF': [
        ('The first day of a period', ['MK-NW-F-090', 'MK-PF-F-008', 'MK-PF-F-022']),
        ('The close on or before a date', ['MK-PF-F-010', 'MK-PF-F-011', 'MK-PF-F-022', 'MK-PF-F-029', 'MK-PF-F-034']),
        ('A period total versus a yearly rate', ['MK-NW-O-008', 'MK-PF-F-010', 'MK-PF-F-011']),
        ('The option contract multiplier', ['MK-PF-F-002', 'MK-PF-F-003', 'MK-PF-F-004', 'MK-PF-F-006', 'MK-PF-F-031']),
        ('A return made from the holdings\' own returns', ['MK-NW-F-084', 'MK-PF-F-016', 'MK-PF-F-019', 'MK-PF-F-020']),
        ('What a holding gained over a period, in dollars', ['MK-NW-F-091', 'MK-NW-F-127', 'MK-PF-F-005', 'MK-PF-F-021']),
        ('The unit beside a quantity', ['MK-PF-F-032', 'MK-PF-F-033']),
    ],
}

CC_DATE = ('v03 · 2026-10-04', 'v04 · 2026-10-10')

# Two places in the kept instructions that were false for this module (2026-10-10): they told the judge
# to solve for a money-weighted rate and named Modified Dietz as an example method. Every return here is
# time-weighted (Q16, DEC-1669). Each is replaced exactly once; anything else in the kept text is untouched.
CC_KEPT_FIXES = [
    ('- For a yearly money-weighted rate, write your own solver from scratch (bisection or Newton, 365-day\n'
     '  year unless the card says otherwise). Never import or copy anything from the app. Say in `notes`\n'
     '  that the rate came from your own solver, and give it to at least four decimal places.',
     '- Every return in this module is a time-weighted return (owner decision Q16; DEC-1669), never a\n'
     '  money-weighted one. Where a case needs a rate, work it by hand from the dated values: split the\n'
     '  period at each movement of money, divide each piece\'s closing value by its opening value, multiply\n'
     '  the pieces and take 1 off. You may write your own calculator for that chain-linking, from scratch;\n'
     '  never import or copy anything from the app. Give the rate to at least four decimal places.\n'
     '  (Corrected 2026-10-10.)'),
    ('method (for example, the Modified Dietz method; the standard loan-payment formula).',
     'method (for example, the time-weighted return; the standard loan-payment formula).'),
]


def claude_code_batches(prefix, template_dir, cards, testable, appendix, send_dir, listing_only=False):
    """Four briefs for one module, Claude Code edition, from today's cards."""
    module = {'PF': 'performance'}[prefix]
    belongs = lambda c: c['card']['id'].startswith(f'MK-{prefix}-') or c['module'] == module
    chosen = sorted((c for c in testable if belongs(c)), key=lambda c: c['card']['id'])
    left = sorted((c for c in cards if c['skip'] and belongs(c)), key=lambda c: c['card']['id'])
    print(f'{module}: {len(chosen)} cards to test, {len(left)} left out')
    for c in chosen:
        why = ('its id is MK-' + prefix if c['card']['id'].startswith(f'MK-{prefix}-')
               else f"the time-weighted-return engine, allow-listed" if c['card']['id'] in ALSO_CARDED
               else f"a {module} function in {os.path.basename(c['path'])}, testable")
        print(f"   IN   {c['card']['id']} {c['card']['name']} — {why}")
    for c in left:
        print(f"   OUT  {c['card']['id']} {c['card']['name']} — {c['skip']}")
    twr = open(os.path.join(ROOT, 'Calculation Module code/engines/time-weighted-return.ts'), encoding='utf8').read()
    engine = re.findall(r'^/\* ─ (MK-[A-Z]{2}-[FO]-\d{3}) ─', twr, re.M)
    assert len(engine) >= 3 and all(i in ALSO_CARDED for i in engine), f'an engine function has no card: {engine}'
    ids =[c['card']['id'] for c in chosen]
    by_id = {c['card']['id']: c for c in testable}
    gone = [i for i in CC_REMOVED if i in by_id]
    assert not gone, f'{gone} are listed as removed but still have cards'
    # the guard proves it looked: the old briefs held 42 cards; six left the code
    template = sorted(f for f in os.listdir(template_dir) if re.match(rf'moneykeel_brief_{module}_0\d_claude-code\.md$', f))
    assert len(template) == 4, f'{len(template)} old briefs found in {template_dir}, want 4'
    old_ids = []
    for f in template:
        t = open(os.path.join(template_dir, f), encoding='utf8').read()
        old_ids += json.loads(re.search(r'^CARDS = (\[.*\])$', t, re.M).group(1))
    assert len(ids) >= len(old_ids) - len(CC_REMOVED), f'{len(ids)} cards today, fewer than {len(old_ids)} − {len(CC_REMOVED)}'
    print(f'   the old briefs held {len(old_ids)}; less the {len(CC_REMOVED)} removed = {len(old_ids) - len(CC_REMOVED)}; today {len(ids)}')
    print(f'   gone since the old briefs: {sorted(set(old_ids) - set(ids))}')
    print(f'   new since the old briefs: {sorted(set(ids) - set(old_ids))}')
    groups = CC_BATCHES[prefix]
    flat = [i for g in groups for i in g]
    assert len(flat) == len(set(flat)), 'a card is in two batches'
    assert sorted(flat) == sorted(ids), (f'the batches do not hold exactly today\'s cards: missing {sorted(set(ids) - set(flat))}, '
                                         f'not a card {sorted(set(flat) - set(ids))}')
    assert all(len(g) <= 15 for g in groups) and len(groups) == len(template) == 4
    if listing_only:
        return
    for n, (group, notes, tfile) in enumerate(zip(groups, CC_NOTES[prefix], template), 1):
        batch = [by_id[i] for i in group]
        label = f'{module} {n:02d}'
        old = open(os.path.join(template_dir, tfile), encoding='utf8').read()
        head, _ = old.split('\n# The cards', 1)
        assert head.count(CC_DATE[0]) == 1, f'{tfile}: the header date {CC_DATE[0]} is not there once'
        head = head.replace(CC_DATE[0], CC_DATE[1])
        for was, now in CC_KEPT_FIXES:
            assert head.count(was) == 1, f'{tfile}: the kept line to correct is not there once: {was[:50]}'
            head = head.replace(was, now)
        checker = old[old.index('## The checker — run it before you finish'):]
        assert checker.count('\nCARDS = ') == 1 and checker.count('\nBATCH = ') == 1
        checker = re.sub(r'^CARDS = .*$', 'CARDS = ' + json.dumps(group), checker, flags=re.M)
        checker = re.sub(r'^BATCH = .*$', 'BATCH = ' + json.dumps(label), checker, flags=re.M)
        # the notes name only today's cards and figures, and never a removed function
        if any('{cut}' in x for x in notes):
            o8 = by_id['MK-NW-O-008']['card']
            owner = {r['decision'] for r in o8.get('rules', []) if r['said_by'] == 'owner'}
            assert set(CC_CUT_OFF) <= owner, f'{sorted(set(CC_CUT_OFF) - owner)} are no longer owner rules on MK-NW-O-008'
            cut = CC_CUT_OFF
            notes = [x.replace('{cut}', ', '.join(cut)) for x in notes]
        text = '\n'.join(notes)
        for i in re.findall(r'MK-[A-Z]{2}-[FO]-\d{3}', text):
            assert i in by_id, f'batch {n} note names {i}, which has no card today'
        types = {}
        for c in batch:
            types.update(c['types'])
        lean = {x['id']: x for x in appendix(batch)}
        for i in CC_LEAN_EXTRA.get(prefix, {}).get(n, []):
            assert i in by_id and i not in group, f'{i} cannot lean into batch {n}'
            lean.setdefault(i, {k: by_id[i]['card'][k] for k in ('id', 'name', 'what_it_is_for', 'formula_in_words')})
        lean = [lean[k] for k in sorted(lean)]
        body = [head.rstrip('\n'), '', f'# The cards — batch "{label}"', '',
                f'{len(batch)} cards, so {len(batch)} formula checks and {len(batch) * 5} cases. Put `"batch": "{label}"` in your reply.', '',
                '## Notes for this batch', '', text, '']
        if types:
            body += ['## The app\'s own types these cards name', '', 'What each is made of. The comments inside are the in-house author\'s.', '',
                     '```ts', '\n\n'.join(types[t] for t in sorted(types)), '```', '']
        body += ['## The cards', '', '```json', json.dumps([c['card'] for c in batch], indent=1, ensure_ascii=False), '```', '']
        if lean:
            body += ['## Formulas these cards lean on', '',
                     f'{len(lean)} functions named by the formulas above whose own cards are in another batch. '
                     'They are here so you can work your answers. Do not judge or test them in this batch.', '',
                     '```json', json.dumps(lean, indent=1, ensure_ascii=False), '```', '']
        compare, topics = [], 0
        for title, members in CC_COMPARE[prefix]:
            for i in members:
                assert i in by_id, f'comparison "{title}" names {i}, which has no card today'
            here = [i for i in members if i in group]
            elsewhere = [i for i in members if i not in group]
            if here and elsewhere:
                topics += 1
                compare += [f'**{title}** — in this batch: {", ".join(here)}', '', '```json',
                            json.dumps([{k: by_id[i]['card'][k] for k in ('id', 'name', 'what_it_is_for', 'formula_in_words')}
                                        for i in elsewhere], indent=1, ensure_ascii=False), '```', '']
        if compare:
            body += ['## The same idea, computed elsewhere — for comparison only', '', CC_COMPARE_INTRO, ''] + compare
        body += ['---', '', checker.rstrip('\n'), '']
        out = '\n'.join(body)
        assert not re.search(r'money-weighted rate, write|write your own solver|from your own solver|XIRR', out), f'batch {n} still tells the judge to solve a money-weighted rate'
        for i, name in CC_REMOVED.items():
            assert i not in out and not re.search(rf'\b{name}\b', out), f'batch {n} still names the removed {i} {name}'
        name = f'moneykeel_brief_{module}_{n:02d}_claude-code_v02.md'
        open(os.path.join(send_dir, name), 'w', encoding='utf8').write(out)
        print(f'written: to-send/{name} — {len(batch)} cards, {len(lean)} leaned on, {topics} comparisons')


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
        module = (ALSO_CARDED[h['id']] if h['id'] in ALSO_CARDED else 'performance' if h['family'] == 'PF' or os.path.basename(h['path']) in ('performance.ts', 'look-back.ts')
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
    if '--module-audit' in sys.argv:
        # THE LAST LOOK AT A WHOLE MODULE (founder, 2026-10-09: "write one last brief for Open AI to run one
        # last set of test across entire NW module to ensure all fixes are in, and all screens, and
        # functions meet tenants"). Every function of the module as it stands today, every rule decided in
        # its outside reviews (from the decision log, in force), every figure its screens print (from the
        # figure register), and the tenets. Nothing of any earlier review is quoted: the judge works alone.
        prefix = sys.argv[sys.argv.index('--module-audit') + 1]                    # e.g. NW
        who = sys.argv[sys.argv.index('--for') + 1] if '--for' in sys.argv else 'the outside judge'
        also = sys.argv[sys.argv.index('--also') + 1].split(',') if '--also' in sys.argv else []
        screens = sys.argv[sys.argv.index('--screens') + 1].split(',') if '--screens' in sys.argv else []
        chosen = [c for c in testable if c['card']['id'].startswith(f'MK-{prefix}-') or c['card']['id'] in also]
        chosen.sort(key=lambda c: c['card']['id'])
        assert len(chosen) >= 90, f'only {len(chosen)} cards for {prefix} — the reader has gone blind'
        here = os.path.dirname(os.path.abspath(__file__))
        dec = json.load(open(os.path.join(here, 'moneykeel_decisions.json')))['rows']
        reviews = [r for r in dec if str(r.get('decided', '')) >= '2026-10-04' and str(r.get('in_use') or 'IN USE').startswith('IN USE')
                   and r.get('type') in ('RULE', 'DESIGN', 'CALCULATION', 'COPY') and r.get('tab') in ('networth', 'networth-and-performance')]
        # A RE-RUN names what changed since the judge last saw the module (founder, 2026-10-11: "files ready to feed to
        # OpenAI for re-run"): every card whose formula was re-read after the commit the last brief went out at.
        since = sys.argv[sys.argv.index('--rerun-since') + 1] if '--rerun-since' in sys.argv else None
        changed_ids = []
        if since:
            old_rules = json.loads(_sp.run(['git', 'show', f'{since}:Calculation Module code/scripts/moneykeel_function_rules.json'],
                                                  capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(here))).stdout)['rules']
            changed_ids = [c['card']['id'] for c in chosen if (old_rules.get(c['card']['id']) or {}).get('rule') != written.get(c['card']['id'], {}).get('rule')]
            assert changed_ids, 'a re-run that finds nothing changed has not looked'
        figs = json.load(open(os.path.join(here, 'moneykeel_figures.json')))['figures']
        shown = {k: v for k, v in figs.items() if any(sc in screens for sc in v.get('screens', []))}
        tenets = open(os.path.join(OUT, '..', '..', 'standards', 'moneykeel_spec_tenets_v01.md'), encoding='utf8').read().split('\n', 4)[-1].strip()
        rulings = [r for r in (rules_file.get('final_audit_rulings') or [])]
        lean = appendix(chosen)
        label = f'{prefix.lower()} module final'
        parts = 4
        per = -(-len(chosen) // parts)
        head = [f'Written for: {who}, as the outside judge of the whole Net worth module, once, at the end. You have not seen any '
                'earlier review of it and none is given here: judge it as if for the first time.', '',
                '# What this is', '',
                f'The last independent test of the Net worth module before the owner builds it. {len(chosen)} functions, every one '
                'as it is in the app today; the rules the owner has decided for them; every figure its screens print; and the '
                'tenets every figure must meet. Six earlier batches were each judged by an outside model and corrected. This '
                'check is to find what is still wrong, still unsaid, or still not true to the tenets — anywhere in the module.', '',
                '# The tenets — every function and every figure must meet them', '', tenets, '',
                '# Your four jobs', '',
                '1. **Formula check, every card.** Is the formula right for what it says it is for? Verdict RIGHT, WRONG, INCOMPLETE '
                'or CANNOT TELL, with why, what it should be, and what it rests on (a published source, the owner\'s rule below, or '
                'ordinary arithmetic). Severity for anything not RIGHT: high (a wrong number a person would act on), medium, low.',
                '2. **Five cases per card** — two easy, two complex (real-world inputs: unround figures, several accounts, broker '
                'wording), one edge — each worked by hand, with the expected answer at full precision and as shown. Where the '
                'honest answer is no number, say REFUSES and why. Where the owner\'s rule is needed and missing, say RULE UNCLEAR '
                'and give each reading\'s answer.',
                '3. **The decided rules are in.** For each rule in the list below, find the card or cards that carry it and say '
                'HELD (the formula does what the rule says), NOT HELD (with the case that shows it), or CANNOT TELL.',
                '4. **The screens meet the tenets.** For each figure in the screen register below, check it against the tenets: '
                'its words are plain and say what the number means; a figure with no input refuses with a reason, never $0 or a '
                'default; a total and the rows shown under it add up; one concept has one name and the same figure ID wherever '
                'it is shown; an estimate says it is one. Give PASS or FAIL with the tenet number and why.', '',
                '# Reply', '',
                'One JSON object per part you are given, with:', '',
                '```json', '{', f'  "batch": "{label} — part N",', '  "written_by": "<you>",',
                '  "ready_to_close": true,', '  "still_open": ["<card or figure id>: what must change"],',
                '  "formula_checks": [{"id": "", "name": "", "verdict": "", "why": "", "should_be": "", "rests_on": "", "severity": ""}],',
                '  "cases": [{"id": "", "name": "", "kind": "easy|complex|edge", "title": "", "given": "", "inputs": {}, "expected": {}, "working": [], "rests_on": "", "confidence": "high|medium|low", "notes": ""}],',
                '  "rules_held": [{"rule": "", "cards": [], "verdict": "HELD|NOT HELD|CANNOT TELL", "why": ""}],',
                '  "screen_checks": [{"figure": "", "tenet": 0, "verdict": "PASS|FAIL", "why": ""}],',
                '  "could_not_test": []', '}', '```', '',
                'Jobs 3 and 4 go in the reply to part 1 only. Never change an expected answer to agree with the code. Where you '
                'think the owner\'s rule is wrong, say so in `notes` with your reasoning; do not apply your own rule.', '',
                '# The general brief — how a card is read and how a case is worked', '', brief, '', '---', '',
                '# What the owner has ruled — settled, in his words', '']
        if since:
            head = [f'**THIS IS A RE-RUN.** You judged this module once (brief v01). The app has been corrected since, against your findings and the owner\'s new decisions. Judge every card again from scratch. These {len(changed_ids)} cards changed since you last saw them — look hardest at them: ' + ', '.join(changed_ids) + '.', ''] + head
        head += [f'{i}. {r["date"]} — "{r["words"]}" {r["about"]}' for i, r in enumerate(rulings, 1)]
        head += ['', f'# The rules decided in the outside reviews — {len(reviews)}, each in force', '',
                 'From the owner\'s decision log. Job 3 checks each one.', '']
        head += [f'- **{r["id"]}** ({r.get("decided")}) — {str(r.get("plain", "")).strip()}  \n  Governs: {r.get("governs", "")}' for r in reviews]
        head += ['', f'# The screen register — {len(shown)} figures on {", ".join(screens)}', '',
                 'What each figure on the Net worth screens is, how it is worked, and what it says when it cannot be. Job 4 checks each.', '',
                 '```json', json.dumps({k: {f: v.get(f) for f in ('label', 'screens', 'answers', 'formula', 'inputs', 'decisions', 'refusal', 'worked')} for k, v in sorted(shown.items())}, indent=1, ensure_ascii=False, default=str), '```', ''] + tables
        types = {}
        for c in chosen:
            types.update(c['types'])
        if types:
            head += ['## The app\'s own types the cards name', '', '```ts', '\n\n'.join(types[t] for t in sorted(types)), '```', '']
        if lean:
            head += ['## Formulas the cards lean on', '', f'{len(lean)} functions outside the module named by the formulas. Use them to work answers; do not judge them.', '',
                     '```json', json.dumps(lean, indent=1, ensure_ascii=False), '```', '']
        stem = f'moneykeel_audit_module_{prefix.lower()}_for-{who.lower().replace(" ", "-")}_v01'
        open(os.path.join(send_dir, stem + '.md'), 'w', encoding='utf8').write('\n'.join(head))
        for i in range(parts):
            group = chosen[i * per:(i + 1) * per]
            if not group:
                continue
            body = [f'# The cards — "{label} — part {i + 1} of {parts}"', '',
                    f'{len(group)} cards, so {len(group)} formula checks and {len(group) * 5} cases. Read the brief file '
                    f'{stem}.md first. Put `"batch": "{label} — part {i + 1}"` in your reply.', '',
                    '```json', json.dumps([c['card'] for c in group], indent=1, ensure_ascii=False), '```', '']
            open(os.path.join(send_dir, f'{stem}_cards-part-{i + 1}-of-{parts}.md'), 'w', encoding='utf8').write('\n'.join(body))
        print(f'module audit written: to-send/{stem}.md + {parts} card parts — {len(chosen)} cards, {len(reviews)} decided rules, {len(shown)} screen figures, {len(lean)} leaned on')
        return
    if '--claude-code-batches' in sys.argv:
        claude_code_batches(sys.argv[sys.argv.index('--claude-code-batches') + 1],
                            sys.argv[sys.argv.index('--template') + 1], cards, testable, appendix, send_dir,
                            listing_only='--list' in sys.argv)
        return
    if '--final-audit' in sys.argv:
        # ONE LAST LOOK AT A BATCH, AS IT STANDS NOW (founder, 2026-10-05: "write another brief for Gemini
        # for NW-01 to conduct one final audit before we move to NW-02"). The cards of that batch as they
        # first went out are read for their identifiers only; what is written is each of those functions
        # AS IT IS IN THE APP TODAY, plus any named with --also (functions added while correcting the
        # batch, which no outside judge has seen). Nothing of an earlier review goes in: the judge works
        # separately, and would start to agree with it. The pack as sent is not touched.
        batch = sys.argv[sys.argv.index('--final-audit') + 1]                       # e.g. networth_01
        who = sys.argv[sys.argv.index('--for') + 1] if '--for' in sys.argv else 'the outside judge'
        also = sys.argv[sys.argv.index('--also') + 1].split(',') if '--also' in sys.argv else []
        went_out = [f for f in os.listdir(send_dir) if f.startswith(f'moneykeel_audit_cards_{batch}-of-')]
        assert len(went_out) == 1, f'{len(went_out)} files match batch {batch} — name one batch'
        judged_then = open(os.path.join(send_dir, went_out[0]), encoding='utf8').read().split('## Formulas these cards lean on')[0]
        wanted = list(dict.fromkeys(re.findall(r'^  "id": "(MK-[A-Z]{2}-[OF]-\d+)"', judged_then, re.M) + also))
        chosen = [c for c in testable if c['card']['id'] in wanted]
        missing_cards = [i for i in wanted if i not in {c['card']['id'] for c in chosen}]
        assert not missing_cards, f'no card today for {missing_cards} — a function of this batch was removed or is not tested'
        label = batch.replace('_', ' ') + ' final'
        lean = appendix(chosen)
        rulings = [r for r in (rules_file.get('final_audit_rulings') or [])]
        body = [f'Written for: {who}, as the outside judge of batch "{label}". You have not seen any earlier review of these '
                'functions and none is given here: judge them as if for the first time.', '',
                brief, '', '---', '',
                f'# The cards — batch "{label}"', '',
                f'{len(chosen)} cards, so {len(chosen)} formula checks and {len(chosen) * 5} cases. Put `"batch": "{label}"` in your reply.', '',
                '## Why this batch is in front of you', '',
                'These functions were corrected after their cards were first written. The formula on each card below is the one in '
                'the app now. Before the next batch is opened, the owner wants one more independent check that nothing in this '
                'batch is still wrong or left unsaid.', '',
                '## What the owner has ruled since — settled, in his words', '']
        body += [f'{i}. {r["date"]} — "{r["words"]}" {r["about"]}' for i, r in enumerate(rulings, 1)]
        body += ['', '## A third job, for this batch only — say whether it can be closed', '',
                 'Do Job 1 and Job 2 for every card, exactly as the brief above describes. Then add two fields at the top level of your reply:', '',
                 '- `"ready_to_close"`: `true` when you judged every card `RIGHT`, otherwise `false`.',
                 '- `"still_open"`: one line for each card you judged `WRONG`, `INCOMPLETE` or `CANNOT TELL`, naming the card and what must change. An empty list when there is none.', '',
                 'Where to look hardest, in any batch about what a household owns and owes:', '',
                 '1. Every total against the sum of its own parts.',
                 '2. Anything that could be counted twice, or not at all — rent, a mortgage, a debt payment that was also logged as an expense.',
                 '3. What is shown when an input is missing: a refusal with its reason, never a zero.',
                 '4. A date that falls exactly on a boundary — matures today, held exactly one year.',
                 '5. Money added or taken out in the middle of a period, when the figure is a return.', ''] + tables
        types = {}
        for c in chosen:
            types.update(c['types'])
        if types:
            body += ['## The app\'s own types these cards name', '', 'What each is made of. The comments inside are the in-house author\'s.', '',
                     '```ts', '\n\n'.join(types[t] for t in sorted(types)), '```', '']
        body += ['## The cards', '', '```json', json.dumps([c['card'] for c in chosen], indent=1, ensure_ascii=False), '```', '']
        if lean:
            body += ['## Formulas these cards lean on', '',
                     f'{len(lean)} functions named by the formulas above. They are here so you can work your answers. Do not judge or test them in this batch.', '',
                     '```json', json.dumps(lean, indent=1, ensure_ascii=False), '```', '']
        name = f'moneykeel_audit_final_{batch.replace("_", "")}_for-{who.lower().replace(" ", "-")}_v01.md'
        open(os.path.join(send_dir, name), 'w', encoding='utf8').write('\n'.join(body))
        print(f'final audit written: to-send/{name} — {len(chosen)} cards ({len(wanted) - len(also)} of the batch as it went out, {len(also)} added since), {len(lean)} leaned on')
        return
    if '--supplement' in sys.argv:
        # a supplement, once written, is also something he may have sent: the next one holds only what
        # has moved since the LAST file each card went out in
        last_out = {cid: v.get('sent_as') for cid, v in written.items()}
        for sup in rules_file.get('supplements', []):
            last_out.update(sup['cards'])
        moved = [c for c in testable if last_out.get(c['card']['id']) != written[c['card']['id']]['read_from']]
        number = len(rules_file.get('supplements', [])) + 1
        if not moved:
            sys.exit('nothing has changed since the last file each card went out in — no supplement to write')
        lean = appendix(moved)
        body = [brief, '', '---', '', f'# The cards — batch "changed since sent {number:02d}"', '',
                f'{len(moved)} cards, so {len(moved)} formula checks and {len(moved) * 5} cases. Put `"batch": "changed since sent {number:02d}"` in your reply.', '',
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
        name = f'moneykeel_audit_cards_changed-since-sent_{number:02d}.md'
        open(os.path.join(send_dir, name), 'w', encoding='utf8').write('\n'.join(body))
        rules_file.setdefault('supplements', []).append({'file': name, 'cards': {c['card']['id']: written[c['card']['id']]['read_from'] for c in moved}})
        json.dump(rules_file, open(RULES, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
        print(f'supplement written: to-send/{name} — {len(moved)} cards')
        return
    # THE PACK AS SENT IS NEVER REWRITTEN IN PASSING — and until 2026-10-04 `--reread` did exactly that:
    # it re-stamped the functions it was given and then fell through to the full write below, which
    # empties to-send/ and prints the whole pack again. Three runs that day replaced all 26 files he
    # had been sending from and deleted two supplements. `--reread` now stops here, like `--check`.
    # And every run compares the pack on disk with the pack as it went out, and stops if they differ.
    sent_commit = rules_file.get('pack_sent', {}).get('commit')
    if sent_commit and '--rewrite-the-pack' not in sys.argv:
        import subprocess
        root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        listed = subprocess.run(['git', '-C', root, 'ls-tree', '-r', '--name-only', sent_commit, '--', os.path.relpath(send_dir, root)],
                                capture_output=True, text=True).stdout.split('\n')
        pack = [f for f in listed if f.strip()]
        assert len(pack) >= 25, f'only {len(pack)} pack files found at {sent_commit} — the check has gone blind'
        changed = []
        for rel in pack:
            was = subprocess.run(['git', '-C', root, 'show', f'{sent_commit}:{rel}'], capture_output=True).stdout
            now_path = os.path.join(root, rel)
            if not os.path.exists(now_path) or open(now_path, 'rb').read() != was:
                changed.append(os.path.basename(rel))
        if changed:
            sys.exit(f'STOPPED: {len(changed)} of the {len(pack)} files of the pack as sent ({sent_commit}) have been rewritten or removed: '
                     f'{changed[:6]}. Restore them with: git checkout {sent_commit} -- "{os.path.relpath(send_dir, root)}"')
        print(f'the pack as sent ({sent_commit}): all {len(pack)} files are as they went out')
    if '--check' in sys.argv or '--reread' in sys.argv:
        print(f'checked, the pack not written: {len(testable)} of {len(testable)} cards carry a formula read from the function as it stands · '
              f'{figures_stated} figures stated, each traced to the code or worked by hand')
        return
    if '--rewrite-the-pack' not in sys.argv:
        sys.exit('STOPPED: writing the whole pack again replaces every file in to-send/. Say so on purpose with --rewrite-the-pack.')
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
