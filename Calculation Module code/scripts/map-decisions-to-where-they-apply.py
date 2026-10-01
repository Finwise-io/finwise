#!/usr/bin/env python3
"""WHERE EACH DECISION APPLIES — searched out of the code and the register, never guessed.

Founder, 2026-09-30:
    *"do not stop until you search every code, every file to map them accurately."*
    *"you have been [asking] me million questions wasting my time and energy without knowing what to
    do with it."*

He was right, measured: of the 33 decisions he sat and answered, ONE named the figures it governs. A
decision that names nothing cannot be checked against anything, so his time bought a record and not a
guard. This finds where each one applies by SEARCHING — the figure register, every door, every screen —
and reports the evidence for each match so a person can check it rather than trust it.

HOW IT MATCHES, and why it is conservative: a decision's distinctive words are the ones that are rare
across the whole log — "donut", "HELOC", "biweekly" — not "the", "screen", "figure". A figure is
proposed only when a rare word of the decision appears in that figure's own label, formula, answer or
recorded decisions, or when the decision names an identifier outright. Everything weaker is printed as
NEEDS READING rather than written, because a wrong mapping is worse than none: it makes a decision look
guarded when nothing guards it.

    python3 "Calculation Module code/scripts/map-decisions-to-where-they-apply.py"          # report
    python3 "Calculation Module code/scripts/map-decisions-to-where-they-apply.py" --write  # record

Writing appends to moneykeel_decisions_anchors.json, which extract-decisions.py applies. Anything
already anchored by hand is left exactly as it is.
"""
import json, os, re, sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
os.chdir(ROOT)

DEC = json.load(open(os.path.join(HERE, 'moneykeel_decisions.json')))['rows']
FIGS = json.load(open(os.path.join(HERE, 'moneykeel_figures.json')))['figures']
ANCHORS_PATH = os.path.join(HERE, 'moneykeel_decisions_anchors.json')
ANCHORS = json.load(open(ANCHORS_PATH))

STOP = set('''the a an and or of to in on for with is are was were be been it its this that these those
from by as at into out up down over under not no any all each every some one two three what which who
when where how why if then than so but also more most less least same other another new old first last
his her their your you we our i me my he she they them us it's dont don't cannot can could would should
will shall may might must do does did done have has had having screen screens figure figures number
numbers row rows line lines value values app page pages says said say show shows shown showing said
because since while after before both either neither about above below only just still yet even ever
never always now today day days month months year years time times thing things way ways make makes
made made made person people someone anyone user users founder decision decisions rule rules'''.split())

def rare_words(text):
    ws = re.findall(r"[a-z][a-z''\-]{3,}", str(text).lower())
    return [w for w in ws if w not in STOP]

# how common is each word across the whole log? a word in half the rows tells us nothing
freq = Counter()
for d in DEC:
    freq.update(set(rare_words(str(d.get('his_words') or '') + ' ' + str(d.get('plain') or ''))))
N = max(1, len(DEC))
DISTINCTIVE = {w for w, n in freq.items() if n <= max(3, N // 60)}

# what each figure says about itself
FIG_TEXT = {k: (' '.join([v.get('label', ''), v.get('formula', ''), v.get('answers', ''),
                          ' '.join(v.get('decisions') or []), v.get('note', '') or '',
                          ' '.join(v.get('screens') or [])])).lower()
            for k, v in FIGS.items()}

# and every file the calculation lives in, so a decision about a FILE can name one
CODE_ROOTS = ['MoneyKeel/functions', 'src/domain', 'src/screens', 'src/components',
              'Calculation Module code/engines', 'MoneyKeel/documents/standards']
FILES = {}
for root in CODE_ROOTS:
    for dp, _, fs in os.walk(root):
        if any(x in dp for x in ('__tests__', 'archive', 'node_modules')):
            continue
        for f in fs:
            if f.endswith(('.ts', '.tsx', '.md')) and '.test.' not in f:
                p = os.path.join(dp, f)
                try:
                    FILES[p] = open(p, encoding='utf8', errors='ignore').read().lower()
                except OSError:
                    pass

IDENT = re.compile(r'\bMK-[A-Z]{2}-[MFOI]-\d{3}\b')
strong, weak = {}, []

for d in DEC:
    if 'OLD' in str(d.get('in_use', '')) or str(d.get('governs', '')).strip():
        continue
    text = str(d.get('his_words') or '') + ' ' + str(d.get('plain') or '') + ' ' + str(d.get('means') or '')
    # 1 · the decision names identifiers outright — the strongest evidence there is
    named = sorted(set(IDENT.findall(text)) & set(FIGS))
    if named:
        strong[d['id']] = dict(governs=' · '.join(named),
                               why_it_governs_those='the decision names these rows itself',
                               evidence='named in the decision text')
        continue
    # 2 · its distinctive words appear in a figure's own description
    mine = [w for w in set(rare_words(text)) if w in DISTINCTIVE]
    if not mine:
        weak.append((d['id'], d.get('tab'), 'no distinctive word to search on', text[:90]))
        continue
    hits = defaultdict(list)
    for k, t in FIG_TEXT.items():
        if d.get('tab') and not k.startswith('MK-' + {'networth': 'NW', 'cashflow': 'CF', 'performance': 'PF',
                                                      'plan': 'PL', 'home': 'HM', 'menu': 'MN',
                                                      'multiple_screens': 'XS'}.get(d['tab'], 'ZZ')):
            if d.get('tab') != 'process-and-standards':
                continue
        for w in mine:
            if re.search(r'(?<![a-z])' + re.escape(w) + r'(?![a-z])', t):
                hits[k].append(w)
    best = sorted(hits.items(), key=lambda x: -len(x[1]))[:4]
    if best and len(best[0][1]) >= 2:
        strong[d['id']] = dict(governs=' · '.join(k for k, _ in best if len(_) >= 2),
                               why_it_governs_those='its own words appear in these figures: '
                                                    + '; '.join(f'{k} ({", ".join(ws)})' for k, ws in best if len(ws) >= 2),
                               evidence='searched the figure register')
    else:
        # 3 · a decision about a FILE — the standards, a screen, a door
        fhits = {p: [w for w in mine if re.search(r'(?<![a-z])' + re.escape(w) + r'(?![a-z])', t)]
                 for p, t in FILES.items()}
        fbest = sorted(((p, ws) for p, ws in fhits.items() if len(ws) >= 3), key=lambda x: -len(x[1]))[:2]
        if fbest:
            strong[d['id']] = dict(governs=' · '.join(p for p, _ in fbest),
                                   why_it_governs_those='its own words appear in these files: '
                                                        + '; '.join(f'{p} ({", ".join(ws)})' for p, ws in fbest),
                                   evidence='searched every calculation file')
        else:
            weak.append((d['id'], d.get('tab'), 'searched and found nothing strong enough',
                         ' '.join(sorted(mine)[:8])))

print('── where each decision applies, searched')
print(f'   figures read {len(FIGS)} · calculation files read {len(FILES)} · distinctive words {len(DISTINCTIVE)}')
print(f'   MAPPED by search : {len(strong)}')
print(f'   NEEDS READING    : {len(weak)}')
for i, (a, b, c, e) in enumerate(weak[:12]):
    print(f'      {a} [{b}] {c} — {e}')
if len(weak) > 12:
    print(f'      …and {len(weak) - 12} more')

if '--write' in sys.argv:
    # NEVER OVERWRITE A MAPPING MADE WHILE THIS WAS THINKING (2026-09-30). This ran in the background
    # while I wrote twelve mappings by hand; it had loaded the file before those writes and its save
    # clobbered all twelve. Re-reading here means a hand mapping made during the search always survives.
    ANCHORS = json.load(open(ANCHORS_PATH))
    added = 0
    for k, v in strong.items():
        if k in ANCHORS['rows'] and ANCHORS['rows'][k].get('governs'):
            continue                      # a mapping made by hand always wins
        ANCHORS['rows'].setdefault(k, {}).update(v)
        added += 1
    json.dump(ANCHORS, open(ANCHORS_PATH, 'w'), indent=1, ensure_ascii=False)
    print(f'\n   wrote {added} mapping(s) into {os.path.basename(ANCHORS_PATH)} — hand-made ones untouched')
