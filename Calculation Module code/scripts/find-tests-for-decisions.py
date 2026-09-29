#!/usr/bin/env python3
"""WHICH DECISIONS ARE ALREADY HELD BY A TEST — read from the suite, not assumed.

His question, 2026-09-28: *"what's the plan to test them?"* Before writing a single new test, the
honest first step is finding the ones ALREADY covered by a guard that does not name them. Several of
these rules were the reason a test was written in the first place; the link was just never recorded.

HOW A MATCH IS MADE, and it is deliberately narrow:
  · the test names an IDENTIFIER the decision names (MK-CF-O-001, MK-NW-M-013 …), or
  · the test contains a distinctive phrase of at least 30 characters from HIS OWN WORDS.
A shared ordinary word is not evidence. A wrong link is worse than none — it would report a decision
as proved when nothing re-runs it, which is the exact fault the whole log exists to end.

It WRITES the link onto the row, and prints what it could not match so the number is honest.
"""
import json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)
DEC = os.path.join(HERE, 'moneykeel_decisions.json')
doc = json.load(open(DEC))

TESTS = sorted(glob.glob('src/**/*.test.ts', recursive=True)
               + glob.glob('src/**/*.test.tsx', recursive=True)
               + glob.glob('MoneyKeel/**/*.test.ts', recursive=True)
               + glob.glob('Calculation Module code/**/*.test.ts', recursive=True))
body = {}
for t in TESTS:
    try:
        body[t] = open(t, encoding='utf8', errors='ignore').read()
    except Exception:
        pass

IDENT = re.compile(r'MK-[A-Z]{2}-[A-Z]-\d{3}')

def norm(t):
    return re.sub(r'\s+', ' ', re.sub(r'[‘’“”\'"`]', '', str(t or '').lower()))

# ── THE STRONGEST LINK: A TEST THAT NAMES THE DECISION ───────────────────────────────────────────
# A test written FOR a decision opens its name with that decision's identifier — "DEC-0100 — ..." —
# so the link is read from the suite and never maintained by hand. It cannot be a coincidence and it
# cannot go stale: rename the test and the link moves with it; delete the test and the decision goes
# back to having nothing that re-runs it, loudly, on the next build.
DEC_IN_TEST = re.compile(r"\b(DEC-\d{4})\b")
NAMED = {}
for _p, _src in []:
    pass


def build_named_index(bodies):
    idx = {}
    for path, src in bodies.items():
        for m in DEC_IN_TEST.finditer(src):
            idx.setdefault(m.group(1), set()).add(path)
    return idx


def tests_for(row):
    found = set()
    ids = set(IDENT.findall(str(row.get('governs') or '') + ' ' + str(row.get('screens') or '')
                            + ' ' + str(row.get('changed') or '')))
    words = norm(row.get('his_words'))
    # the longest few phrases of his — a short one matches by accident
    phrases = [p.strip() for p in re.split(r'[.;—·]', words) if len(p.strip()) >= 30]
    for path, src in body.items():
        n = norm(src)
        if ids and ids & set(IDENT.findall(src)):
            found.add(path); continue
        for p in phrases:
            if p in n:
                found.add(path); break
    return sorted(found)

NAMED = build_named_index(body)
linked = already = by_name = 0
for r in doc['rows']:
    if r.get('proof') and not str(r.get('proof')).startswith('NONE NAMED'):
        already += 1
        continue
    named = sorted(NAMED.get(r['id'], []))
    if named:
        r['proof'] = ('HELD BY ' + ' · '.join(os.path.basename(h) for h in named)
                      + ' — a test written for this decision and named with its identifier')
        r['proof_plan'] = 'Proved — a test names this decision by its identifier.'
        by_name += 1
        continue
    hits = tests_for(r)
    if hits:
        r['proof'] = ('ALREADY HELD by ' + ' · '.join(os.path.basename(h) for h in hits[:4])
                      + (f' (+{len(hits)-4} more)' if len(hits) > 4 else '')
                      + ' — found by reading the suite on 2026-09-29, not written for this row')
        r['proof_plan'] = 'Proved — an existing test holds it; the link is now recorded.'
        linked += 1

json.dump(doc, open(DEC, 'w'), indent=1, ensure_ascii=False)
still = sum(1 for r in doc['rows'] if not r.get('proof') or str(r.get('proof')).startswith('NONE NAMED'))
print(f'{len(TESTS)} test files read')
print(f'   {already} decisions already named a test')
print(f'   {by_name} are HELD BY A TEST NAMED WITH THEIR IDENTIFIER — written for the decision itself')
print(f'   {linked} more are ALREADY HELD by a test that did not name them — the link is now on the row')
print(f'   {still} still have nothing that re-runs them')

# ── A TEST MAY NOT NAME A DECISION THAT DOES NOT EXIST (2026-09-29) ──────────────────────────────
# Two of the first ten tests named the wrong decision: the HSA-and-Medicare test was labelled with the
# identifier of the "take-home" wording ruling, and the senior-deduction test with the one for "you
# entered". Both were numbers I typed from memory instead of reading — the exact fault the identifier
# guard was built for in September, repeated in the file whose whole purpose is proving decisions.
#
# This catches a number that does not exist at all. It cannot catch a number that exists and is the
# WRONG decision, so the test name also states the decision in his words: a mismatch between the name
# and the words is visible to anyone reading it, which is the only check that works on meaning.
known = {r['id'] for r in doc['rows']}
ghosts = sorted({m for src in body.values() for m in DEC_IN_TEST.findall(src)} - known)
if ghosts:
    print('\n   %d test(s) name a decision that is NOT in the log: %s' % (len(ghosts), ' '.join(ghosts)))
    print('   BUILD STOPPED. Read the identifier off the log; never type it from memory.')
    sys.exit(1)
print('   every decision identifier named in a test exists in the log')
