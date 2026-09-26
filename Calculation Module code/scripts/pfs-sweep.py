#!/usr/bin/env python3
"""PFS SWEEP — read every kind of document, and say where the questions and answers are.

FOUNDER, 2026-09-26: "We have five types of documents … You have been randomly adding questions in
audit documents, standards documents, screen mock ups, planning documents, and master calculation
file … PFS should be anything we change — it should read all documents, and update."

So this reads all five and prints ONE list:

  1 master calculation file   — questions coloured for him on its tabs (counted by the master build)
  2 standards (rules+rulings) — a line that asks him something
  3 audit documents           — his answer columns
  4 planning documents        — the working plan, which is the tracker
  5 screen mock-ups           — an open mark or a "waiting on you" block

THE RULE IT ENFORCES: a question may be RAISED anywhere, but it is not a question until it is a row
in the working plan. Anything asked in a document with no row is printed as UNTRACKED — that is how
a question gets asked twice, and how an answer gets lost between two files.
"""
import json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WORKPLAN = json.load(open(os.path.join(HERE, 'moneykeel_workplan.json')))['rows']
OPEN_ROWS = [r for r in WORKPLAN if r.get('status') != 'DONE']
# A LINE IS A QUESTION when it is marked as waiting on him, or when it asks him something and ends
# in a question mark. Prose that merely mentions the founder — "report every difference to the
# founder" — is a rule about how we work, not an open question, and must not fill this list up.
WAITING = re.compile(r'(waiting on you|waiting for approval|for your approval|awaiting (his|your) (mark|approval)|questions waiting on you)', re.I)
ASKING  = re.compile(r'(founder:|his call|to the founder for)', re.I)
STOP = set('the a an of to and or for in on with is are it this that his her their what which whether say says '
           'claude founder you your we our not no yes be by at from as if then than so'.split())

def keywords(text, n=6):
    ws = [w for w in re.findall(r"[a-z][a-z'\-]{3,}", text.lower()) if w not in STOP]
    seen, out = set(), []
    for w in ws:
        if w not in seen:
            seen.add(w); out.append(w)
        if len(out) >= n: break
    return out

def tracked(text):
    """Is something like this already a row in the working plan?"""
    ks = set(keywords(text, 8))
    if not ks: return None
    best, score = None, 0
    for r in OPEN_ROWS:
        rk = set(keywords(str(r.get('task', '')) + ' ' + str(r.get('todo', '')), 40))
        hit = len(ks & rk)
        if hit > score: best, score = r, hit
    return best if score >= 3 else None

found, untracked = [], []

def look(kind, path, line_no, text):
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) < 25: return
    row = tracked(text)
    rec = (kind, os.path.relpath(path, ROOT), line_no, text[:130], row)
    if any(r[1] == rec[1] and r[2] == rec[2] for r in found): return       # one entry per place
    found.append(rec)
    if row is None: untracked.append(rec)

# 2 · standards · 4 · planning documents (markdown)
for pat in ('MoneyKeel/documents/standards/*.md', 'MoneyKeel/documents/*/*.md', 'docs/FCC-core-55-70/*.md'):
    for f in glob.glob(os.path.join(ROOT, pat)):
        if '/archive/' in f or 'JJ-feedback' in f: continue
        kind = 'standard' if '/standards/' in f else 'planning'
        for i, line in enumerate(open(f, errors='ignore'), 1):
            if WAITING.search(line) or (ASKING.search(line) and '?' in line):
                look(kind, f, i, line)

# 5 · screen mock-ups
for f in glob.glob(os.path.join(ROOT, 'MoneyKeel/documents/*/*.html')):
    if '/archive/' in f or 'JJ-feedback' in f: continue
    s = open(f, errors='ignore').read()
    for m in re.finditer(r'(?i)(questions waiting on you|what is still open)', s):
        look('mock-up', f, s[:m.start()].count('\n') + 1, s[m.start():m.start() + 400])
        break            # one per file: the block, not every mark inside it

# A LIVE MOCK MUST NAME ITS OWN VERSION, AND SAY WHAT CHANGED (founder, 2026-09-26: "how do I know
# what changed between V06 and V07?"). income v07 called itself v6 inside and had no changelog row,
# so the only way to know was to diff two files by hand.
mock_faults = []
for f in glob.glob(os.path.join(ROOT, 'MoneyKeel/documents/*/*.html')):
    if '/archive/' in f or 'JJ-feedback' in f: continue
    base = os.path.basename(f)
    m = re.search(r'_v(\d{2})\.html$', base)
    if not m: continue
    ver = int(m.group(1))
    if ver < 2:
        continue                      # a first version supersedes nothing, so it explains nothing
    head = open(f, errors='ignore').read()[:20000]
    if not re.search(r'\bv0?' + str(ver) + r'\b', head):
        mock_faults.append(f'{os.path.relpath(f, ROOT)} — the file is v{ver:02d}, but its own heading does not say so')
    elif not re.search(r'(?i)what changed', head):
        mock_faults.append(f'{os.path.relpath(f, ROOT)} — no "what changed from v{ver - 1:02d}" block: the only way to know is to diff two files by hand')

print('── PFS sweep · where the questions are')
by_kind = {}
for k, *_ in found: by_kind[k] = by_kind.get(k, 0) + 1
print('   raised in:', ', '.join(f'{k} {n}' for k, n in sorted(by_kind.items())) or 'nowhere')
print(f'   open rows in the working plan: {len(OPEN_ROWS)}')
print(f'   the master carries its own coloured questions for him — the master build prints that count')
if untracked:
    print(f'\n   UNTRACKED — asked in a document, no row in the working plan ({len(untracked)}):')
    for kind, path, line, text, _ in untracked[:20]:
        print(f'   · [{kind}] {path}:{line}\n       "{text}"')
    if len(untracked) > 20: print(f'   …and {len(untracked) - 20} more')
else:
    print('\n   every question raised in a document has a row in the working plan.')
if mock_faults:
    print(f'\n   VERSIONS THAT CANNOT SAY WHAT THEY ARE ({len(mock_faults)}):')
    for x in mock_faults: print(f'   · {x}')
print(f'\n   {len(found)} raised · {len(found) - len(untracked)} tracked · {len(untracked)} untracked · {len(mock_faults)} version(s) unexplained')
sys.exit(0)
